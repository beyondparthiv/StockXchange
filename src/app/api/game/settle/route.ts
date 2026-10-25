import { NextResponse } from "next/server";

/**
 * Server-side proxy to the price engine's round endpoints.
 *
 * Why proxy rather than let the browser call the engine:
 *  - the engine URL stays server-only and can differ per environment,
 *  - no CORS to configure,
 *  - one place to add auth, retries and rate limiting later,
 *  - and critically, the engine is the authority on prices. Reaching it
 *    through our own server is the shape the real game needs, even while the
 *    caller is still a single browser.
 *
 * POST /api/game/settle
 *   { action: "deal",   gameId, days?, roundsPerDay? }
 *   { action: "settle", gameId, day, round, roundsPerDay, quotes }
 *
 * Returns `{ ok: false, error }` with HTTP 200 when the engine is
 * unreachable, so the board can fall back to local pacing instead of
 * crashing — a dead engine should degrade the game, not end it.
 */

const ENGINE = process.env.PRICE_ENGINE_URL ?? "http://localhost:8000";

async function engineFetch(path: string, body: unknown) {
  const res = await fetch(`${ENGINE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`Engine returned HTTP ${res.status}`);
  return res.json();
}

/** The engine owns the roster, so the board never has to agree with it. */
async function companies() {
  const res = await fetch(`${ENGINE}/companies`, {
    cache: "no-store",
    signal: AbortSignal.timeout(6000),
  });
  if (!res.ok) throw new Error(`Engine returned HTTP ${res.status}`);
  const data = await res.json();
  return data.companies;
}

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
    const roster = await companies();

    if (action === "deal") {
      const data = await engineFetch("/game/deal", {
        game_id: gameId,
        companies: roster,
        days: payload.days ?? 10,
        rounds_per_day: payload.roundsPerDay ?? 2,
      });
      return NextResponse.json({ ok: true, ...data });
    }

    if (action === "insight") {
      const data = await engineFetch("/insight", {
        game_id: gameId,
        day: payload.day,
        round: payload.round,
        ticker: payload.ticker,
        companies: roster,
        quotes: payload.quotes ?? [],
      });
      return NextResponse.json({ ok: true, ...data });
    }

    if (action === "settle") {
      const data = await engineFetch("/round/settle", {
        game_id: gameId,
        day: payload.day,
        round: payload.round,
        rounds_per_day: payload.roundsPerDay ?? 2,
        companies: roster,
        quotes: payload.quotes ?? [],
      });
      return NextResponse.json({ ok: true, ...data });
    }

    return NextResponse.json(
      { ok: false, error: `Unknown action: ${action}` },
      { status: 400 },
    );
  } catch (err) {
    const error =
      err instanceof Error ? err.message : "Could not reach the price engine";
    // 200 on purpose: the caller branches on `ok`, and a stopped engine is an
    // expected local-dev condition rather than a server fault.
    return NextResponse.json({ ok: false, error }, { status: 200 });
  }
}
