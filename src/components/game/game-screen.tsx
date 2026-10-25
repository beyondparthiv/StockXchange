"use client";

import { useCallback, useEffect, useState } from "react";
import { getCompany } from "@/lib/brand/companies";
import { CompanyLogo } from "@/components/brand/company-logo";
import { GameHeader, PhaseTransition } from "@/components/game/game-header";
import { BullBearBackdrop } from "@/components/game/bull-bear";
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

  const pushToast = useCallback((text: string, side: TradeSide) => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, text, side }]);
    // 2.5s matches the brief: long enough to read, short enough to ignore.
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 2500);
  }, []);

  /**
   * Placeholder order handling. It moves cash and shares so the panels update
   * and can be reviewed — it is NOT settlement. Real orders go to the engine,
   * which decides fills, applies card effects, and settles at round end.
   */
  const submitOrder = useCallback(
    (side: TradeSide, ticker: string, qty: number) => {
      setState((prev) => {
        const price =
          prev.quotes.find((q) => q.ticker === ticker)?.current ?? 0;
        const cost = price * qty;

        const players = prev.players.map((p) => {
          if (p.id !== prev.meId) return p;
          const existing = p.holdings.find((h) => h.ticker === ticker);

          if (side === "buy") {
            const shares = (existing?.shares ?? 0) + qty;
            const avgCost = existing
              ? Math.round(
                  (existing.avgCost * existing.shares + cost) / shares,
                )
              : price;
            return {
              ...p,
              cash: p.cash - cost,
              actedThisRound: true,
              holdings: existing
                ? p.holdings.map((h) =>
                    h.ticker === ticker ? { ...h, shares, avgCost } : h,
                  )
                : [...p.holdings, { ticker, shares: qty, avgCost: price }],
            };
          }

          const shares = (existing?.shares ?? 0) - qty;
          return {
            ...p,
            cash: p.cash + cost,
            actedThisRound: true,
            holdings: p.holdings
              .map((h) => (h.ticker === ticker ? { ...h, shares } : h))
              .filter((h) => h.shares > 0),
          };
        });

        const meName =
          prev.players.find((p) => p.id === prev.meId)?.displayName ?? "You";

        return {
          ...prev,
          players,
          activity: [
            {
              id: `local-${Date.now()}`,
              playerId: prev.meId,
              playerName: meName,
              side,
              ticker,
              shares: qty,
              price,
              day: prev.day,
              round: prev.round,
              at: new Date().toISOString(),
            },
            ...prev.activity,
          ],
        };
      });

      pushToast(
        `You ${side === "buy" ? "bought" : "sold"} ${qty} ${ticker}`,
        side,
      );
    },
    [pushToast],
  );

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
   * MOCK PACING — replace with the engine.
   *
   * The engine will own the clock, settlement, and progression. Until it
   * exists this drives the order window locally, so the round/day transitions
   * and price-flash animations can actually be seen and reviewed. The price
   * nudge below is a presentation placeholder, deliberately trivial and
   * clearly not a pricing model.
   *
   * Keyed on day+round, NOT on secondsLeft or phase. The sequence sets state
   * as it runs, and if those writes changed this effect's dependencies React
   * would tear it down mid-flight and cancel the pending timeouts — which is
   * exactly what stopped the transition from ever appearing. Day and round
   * stay put until the final step, so the whole sequence survives, and
   * changing them at the end is what starts the next round.
   */
  useEffect(() => {
    if (state.phase === "finished") return;

    const timers: ReturnType<typeof setTimeout>[] = [];
    const roundsPerDay = state.roundsPerDay;
    const day = state.day;
    const round = state.round;
    const lastRoundOfDay = round >= roundsPerDay;
    const lastDay = day >= state.config.days;

    const tick = setInterval(() => {
      setState((prev) => {
        if (prev.phase !== "trading" || prev.secondsLeft === null) return prev;
        return { ...prev, secondsLeft: Math.max(0, prev.secondsLeft - 1) };
      });
    }, 1000);

    const windowMs = (state.secondsLeft ?? state.config.roundTimerSec) * 1000;

    // 1. Settle: roll NOW into LAST and move prices, so the tiles flash.
    timers.push(
      setTimeout(() => {
        clearInterval(tick);
        setState((prev) => ({
          ...prev,
          phase: "settling",
          secondsLeft: null,
          quotes: prev.quotes.map((q) => {
            if (q.frozen) return { ...q, lastRound: q.current };
            const signal = prev.signals.find((sg) => sg.ticker === q.ticker);
            return {
              ...q,
              lastRound: q.current,
              current: Math.max(100, q.current + (signal?.delta ?? 0)),
            };
          }),
        }));
      }, windowMs),
    );

    // 2. Announce.
    timers.push(
      setTimeout(() => {
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
      }, windowMs + 1100),
    );

    // 3. Open the next round — this changes the deps and restarts the cycle.
    timers.push(
      setTimeout(() => {
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
      }, windowMs + 3400),
    );

    return () => {
      clearInterval(tick);
      timers.forEach(clearTimeout);
    };
    // Intentionally keyed on the round only — see the note above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.day, state.round]);

  return (
    <>
      <BullBearBackdrop />
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
