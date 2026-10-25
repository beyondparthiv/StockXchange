"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getCompany } from "@/lib/brand/companies";
import { CompanyLogo } from "@/components/brand/company-logo";
import { GameHeader, PhaseTransition } from "@/components/game/game-header";
import { MarketGrid } from "@/components/game/market";
import { CardGrid } from "@/components/game/cards";
import { OrderPanel } from "@/components/game/order-panel";
import {
  History,
  Leaderboard,
  NewsFeed,
  Portfolio,
  Wallet,
} from "@/components/game/panels";
import { mockGameState, type Seat } from "@/lib/game/mock";
import { applyOrder } from "@/lib/game/orders";
import { botOrdersForRound } from "@/lib/game/bots";
import type { GameConfig } from "@/lib/game/config";
import type { GameState, TradeSide } from "@/lib/game/state";

/**
 * The trading floor.
 *
 * Layout per the brief: news on the left, market + intelligence in the centre
 * (the primary focus), player panels on the right. The side rails are
 * supporting information and are narrower and quieter than the centre.
 *
 * State is mock for now (see lib/game/mock.ts). Every interaction below is
 * wired to a local handler with the same signature the engine will need, so
 * swapping in real state is a change of data source, not of components.
 */

type Toast = { id: number; text: string; side: TradeSide };

export function GameScreen({
  seats,
  meId,
  config,
}: {
  /** The people who actually joined the room, from the lobby. */
  seats?: Seat[];
  meId?: string;
  config?: GameConfig;
} = {}) {
  // Prices, signals and news are still mock; the roster and config are real.
  const [state, setState] = useState<GameState>(() =>
    mockGameState(seats, meId, config),
  );
  const [selected, setSelected] = useState(state.quotes[0]?.ticker ?? "");
  const [historyTab, setHistoryTab] = useState<"mine" | "all">("mine");
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [transition, setTransition] = useState<{
    title: string;
    sub: string;
  } | null>(null);
  const [engineDown, setEngineDown] = useState<string | null>(null);

  // Stable id so the engine's seeded RNG gives this game its own market.
  const [gameId] = useState(
    () => `g-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
  );

  // Settlement needs the CURRENT quotes, but the round effect is keyed on
  // day+round and must not re-run when a price changes. A ref gives it live
  // data without widening the dependencies.
  const stateRef = useRef(state);
  stateRef.current = state;

  const pushToast = useCallback((text: string, side: TradeSide) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, side }]);
    // 2.5s matches the brief: long enough to read, short enough to ignore.
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2500);
  }, []);

  /**
   * Submit an order for the viewing player.
   *
   * Goes through `applyOrder`, the same path bots use, so the rules are
   * enforced in one place. This is not settlement — prices are decided by
   * the engine at round end.
   */
  const submitOrder = useCallback(
    (side: TradeSide, ticker: string, qty: number) => {
      setState((prev) => {
        const res = applyOrder(prev, prev.meId, side, ticker, qty);
        if (!res.filled) return prev;
        return res.state;
      });
      pushToast(
        `You ${side === "buy" ? "bought" : "sold"} ${qty} ${ticker}`,
        side,
      );
    },
    [pushToast],
  );

  /**
   * Bots trade during the order window, staggered rather than all at once —
   * four simultaneous toasts read as a glitch, four arriving over a few
   * seconds read as opponents thinking.
   *
   * They act through `applyOrder` too, so a bot cannot overspend or sell
   * shares it does not hold.
   */
  useEffect(() => {
    if (state.phase !== "trading") return;
    const bots = state.players.filter((p) => p.isBot && !p.actedThisRound);
    if (bots.length === 0) return;

    const timers = bots.map((_, i) =>
      setTimeout(
        () => {
          setState((prev) => {
            if (prev.phase !== "trading") return prev;
            const pending = botOrdersForRound(prev).filter(
              (o) => !prev.players.find((p) => p.id === o.playerId)?.actedThisRound,
            );
            const order = pending[0];
            if (!order) {
              // No conviction this round — mark it as a pass so the round can
              // still close and the leaderboard tick is honest.
              const next = bots[i];
              return next
                ? {
                    ...prev,
                    players: prev.players.map((p) =>
                      p.id === next.id ? { ...p, actedThisRound: true } : p,
                    ),
                  }
                : prev;
            }
            const res = applyOrder(
              prev,
              order.playerId,
              order.side,
              order.ticker,
              order.qty,
            );
            if (res.filled) {
              pushToast(
                `${res.filled.playerName} ${order.side === "buy" ? "bought" : "sold"} ${order.qty} ${order.ticker}`,
                order.side,
              );
              return res.state;
            }
            return {
              ...prev,
              players: prev.players.map((p) =>
                p.id === order.playerId ? { ...p, actedThisRound: true } : p,
              ),
            };
          });
        },
        1500 + i * 2200 + Math.random() * 900,
      ),
    );

    return () => timers.forEach(clearTimeout);
    // Re-runs when a new round opens; bots act once per round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.day, state.round, state.phase]);

  const playSpecial = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      specials: prev.specials.map((c) =>
        c.id === id ? { ...c, used: true } : c,
      ),
    }));
  }, []);

  const pass = useCallback(() => {
    setState((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.id === prev.meId ? { ...p, actedThisRound: true } : p,
      ),
    }));
  }, []);


  /*
   * Round loop.
   *
   * The clock runs here; settlement comes from the price engine via
   * /api/game/settle. The engine decides the new prices, deals the signal
   * cards for the round about to open, and generates news on day boundaries
   * -- so each round brings fresh intelligence and each new day brings fresh
   * headlines, and the cards genuinely predict the move because the engine
   * derives them from the same draw it settles with.
   *
   * If the engine is unreachable the round still advances on a local
   * fallback, because a stopped engine should degrade the game rather than
   * freeze it mid-session.
   *
   * Keyed on day+round, NOT on secondsLeft or phase. The sequence writes
   * state as it runs; if those writes changed this effect's dependencies
   * React would tear it down mid-flight and cancel the pending timeouts --
   * which is exactly what stopped the transition from ever appearing. Day
   * and round hold still until the final step, and changing them there is
   * what starts the next round.
   */
  useEffect(() => {
    if (state.phase === "finished") return;

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const day = state.day;
    const round = state.round;
    const roundsPerDay = state.roundsPerDay;
    const lastRoundOfDay = round >= roundsPerDay;
    const lastDay = day >= state.config.days;

    const tick = setInterval(() => {
      setState((prev) => {
        if (prev.phase !== "trading" || prev.secondsLeft === null) return prev;
        return { ...prev, secondsLeft: Math.max(0, prev.secondsLeft - 1) };
      });
    }, 1000);

    const windowMs = (state.secondsLeft ?? state.config.roundTimerSec) * 1000;

    async function settleRound() {
      clearInterval(tick);
      if (cancelled) return;

      setState((prev) => ({ ...prev, phase: "settling", secondsLeft: null }));

      type EngineQuote = {
        ticker: string;
        initial: number;
        last_round: number;
        current: number;
        frozen: boolean;
      };
      type EngineReply = {
        quotes?: EngineQuote[];
        next_signals?: { id: string; ticker: string; delta: number }[];
        news?: {
          id: string;
          day: number;
          ticker: string | null;
          headline: string;
          body?: string;
        }[];
      };

      let settled: EngineReply | null = null;

      try {
        const res = await fetch("/api/game/settle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "settle",
            gameId,
            day,
            round,
            roundsPerDay,
            quotes: stateRef.current.quotes.map((q) => ({
              ticker: q.ticker,
              initial: q.initial,
              last_round: q.lastRound,
              current: q.current,
              frozen: q.frozen,
            })),
          }),
        });
        const data = await res.json();
        if (data.ok) settled = data as EngineReply;
        else setEngineDown(data.error ?? "Price engine unavailable");
      } catch (e) {
        setEngineDown(
          e instanceof Error ? e.message : "Price engine unavailable",
        );
      }

      if (cancelled) return;

      setState((prev) => {
        if (settled?.quotes) {
          setEngineDown(null);
          const fresh = settled.next_signals ?? [];
          const incoming = settled.news ?? [];
          return {
            ...prev,
            quotes: settled.quotes.map((q) => ({
              ticker: q.ticker,
              initial: q.initial,
              lastRound: q.last_round,
              current: q.current,
              frozen: q.frozen,
            })),
            // Fresh intelligence for the round about to open.
            signals:
              fresh.length > 0
                ? fresh.map((sg) => ({
                    id: sg.id,
                    ticker: sg.ticker,
                    delta: sg.delta,
                  }))
                : prev.signals,
            // News only arrives on a day boundary; keep the feed otherwise.
            news:
              incoming.length > 0
                ? [
                    ...incoming.map((n) => ({
                      id: n.id,
                      day: n.day,
                      ticker: n.ticker,
                      headline: n.headline,
                      body: n.body,
                    })),
                    ...prev.news,
                  ].slice(0, 12)
                : prev.news,
          };
        }

        // Fallback: move prices by the signal they advertised, so the board
        // keeps running even with the engine down.
        return {
          ...prev,
          quotes: prev.quotes.map((q) => {
            if (q.frozen) return { ...q, lastRound: q.current };
            const sg = prev.signals.find((x) => x.ticker === q.ticker);
            return {
              ...q,
              lastRound: q.current,
              current: Math.max(100, q.current + (sg?.delta ?? 0)),
            };
          }),
        };
      });
    }

    timers.push(setTimeout(() => void settleRound(), windowMs));

    timers.push(
      setTimeout(() => {
        if (cancelled) return;
        setTransition(
          lastRoundOfDay
            ? {
                title: `Day ${day} complete`,
                sub: lastDay ? "Final results" : `Day ${day + 1} starting`,
              }
            : {
                title: `Round ${round} complete`,
                sub: `Round ${round + 1} starting`,
              },
        );
        setState((prev) => ({
          ...prev,
          phase: lastRoundOfDay ? "day-complete" : "round-complete",
        }));
      }, windowMs + 1400),
    );

    timers.push(
      setTimeout(() => {
        if (cancelled) return;
        setTransition(null);
        setState((prev) =>
          lastDay && lastRoundOfDay
            ? { ...prev, phase: "finished", secondsLeft: null }
            : {
                ...prev,
                phase: "trading",
                day: lastRoundOfDay ? prev.day + 1 : prev.day,
                round: lastRoundOfDay ? 1 : prev.round + 1,
                secondsLeft: prev.config.roundTimerSec,
                players: prev.players.map((pl) => ({
                  ...pl,
                  actedThisRound: false,
                })),
              },
        );
      }, windowMs + 3600),
    );

    return () => {
      cancelled = true;
      clearInterval(tick);
      timers.forEach(clearTimeout);
    };
    // Intentionally keyed on the round only -- see the note above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.day, state.round]);

  return (
    <>
      <GameHeader state={state} />
      <PhaseTransition transition={transition} />

      <main className="mx-auto w-full max-w-[1800px] px-6 py-5">
        <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)_300px]">
          {/* LEFT — supporting information */}
          <aside className="order-2 space-y-4 xl:order-1">
            <NewsFeed news={state.news} />
          </aside>

          {/* CENTRE — the primary focus */}
          <div className="order-1 space-y-5 xl:order-2">
            <MarketGrid
              quotes={state.quotes}
              selected={selected}
              onSelect={setSelected}
            />
            <CardGrid
              signals={state.signals}
              specials={state.specials}
              onPlaySpecial={playSpecial}
            />
          </div>

          {/* RIGHT — the player's own position */}
          <aside className="order-3 space-y-4">
            <OrderPanel
              key={selected}
              state={state}
              ticker={selected}
              onSubmit={submitOrder}
              onPass={pass}
            />
            <Wallet state={state} />
            <Portfolio state={state} />
            <Leaderboard state={state} />
            <History state={state} tab={historyTab} onTab={setHistoryTab} />
          </aside>
        </div>
      </main>

      {/* Trade notifications — never inside the signal cards. */}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-2">
        {toasts.map((t) => {
          const company = getCompany(t.text.split(" ").pop() ?? "");
          return (
            <div
              key={t.id}
              className="animate-rise-in flex items-center gap-2 rounded-md border border-line bg-surface px-3 py-2 text-xs font-medium text-ink shadow-lift"
            >
              {company && <CompanyLogo company={company} size={16} />}
              <span className={t.side === "buy" ? "text-up" : "text-down"}>
                ●
              </span>
              {t.text}
            </div>
          );
        })}
      </div>
    </>
  );
}
