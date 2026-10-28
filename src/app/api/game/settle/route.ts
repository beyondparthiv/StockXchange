import { NextResponse } from "next/server";
import { dealGame, insight, settle } from "@/lib/engine";

/**
 * Game engine endpoint.
 *
 * The engine runs in-process rather than as a separate Python service.
 * That service still exists under price-engine/ as the reference
 * implementation with its own tests, but it cannot be reached from a
 * Vercel deployment without hosting it somewhere, and when it is
 * unreachable the game degrades in a way that is easy to miss: prices
 * still move on the fallback path, but signals and news never refresh, so
 * every day deals the same cards. Running it here removes that failure
 * mode along with the cold starts and the CORS.
 *
 * POST /api/game/settle
 *   { action: "deal",    gameId }
 *   { action: "settle",  gameId, day, round, roundsPerDay, quotes }
 *   { action: "insight", gameId, day, round, ticker, quotes }
 *
 * Responses keep the snake_case field names the client already maps, so
 * this is a drop-in replacement for the Python service.
 */

type WireQuote = {
  ticker: string;
  initial: number;
  last_round: number;
  current: number;
  frozen: boolean;
};

const toEngine = (q: WireQuote) => ({
  ticker: q.ticker,
  initial: q.initial,
  lastRound: q.last_round,
  current: q.current,
  frozen: q.frozen,
});

const toWire = (q: ReturnType<typeof toEngine>): WireQuote => ({
  ticker: q.ticker,
  initial: q.initial,
  last_round: q.lastRound,
  current: q.current,
  frozen: q.frozen,
});

export async function POST(request: Request) {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const { action, gameId } = payload as { action?: string; gameId?: string };
  if (!gameId) {
    return NextResponse.json({ ok: false, error: "gameId is required" }, { status: 400 });
  }

  try {
    if (action === "deal") {
      const { quotes, signals, news } = dealGame(gameId);
      return NextResponse.json({
        ok: true,
        quotes: quotes.map(toWire),
        signals,
        news,
      });
    }

    if (action === "settle") {
      const quotes = ((payload.quotes as WireQuote[]) ?? []).map(toEngine);
      const result = settle(
        gameId,
        Number(payload.day ?? 1),
        Number(payload.round ?? 1),
        Number(payload.roundsPerDay ?? 2),
        quotes,
      );
      return NextResponse.json({
        ok: true,
        quotes: result.quotes.map(toWire),
        next_signals: result.nextSignals,
        news: result.news,
      });
    }

    if (action === "insight") {
      const quotes = ((payload.quotes as WireQuote[]) ?? []).map(toEngine);
      return NextResponse.json({
        ok: true,
        ticker: payload.ticker,
        direction: insight(
          gameId,
          Number(payload.day ?? 1),
          Number(payload.round ?? 1),
          String(payload.ticker ?? ""),
          quotes,
        ),
      });
    }

    return NextResponse.json(
      { ok: false, error: `Unknown action: ${action}` },
      { status: 400 },
    );
  } catch (err) {
    const error = err instanceof Error ? err.message : "Engine failure";
    // 200 on purpose: the client branches on `ok` and falls back rather
    // than treating this as a crash.
    return NextResponse.json({ ok: false, error }, { status: 200 });
  }
}
