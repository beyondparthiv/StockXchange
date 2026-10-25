"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getCompany } from "@/lib/brand/companies";
import { CompanyLogo } from "@/components/brand/company-logo";
import { GameHeader, PhaseTransition } from "@/components/game/game-header";
import { MarketGrid } from "@/components/game/market";
import { CardGrid } from "@/components/game/cards";
import { OrderPanel } from "@/components/game/order-panel";
import {
  HistoryDrawer,
  Leaderboard,
  NewsFeed,
  Portfolio,
  Wallet,
} from "@/components/game/panels";
import { mockGameState, type Seat } from "@/lib/game/mock";
import { applyOrder } from "@/lib/game/orders";
import { dealSpecials, playableNow, specialInfo } from "@/lib/game/specials";
import { botOrder } from "@/lib/game/bots";
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

/** Cards window before each round opens. */
const PRE_ROUND_SECONDS = 15;
/** Cards window after the day's closing prices. */
const SPECIAL_ROUND_SECONDS = 30;

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
  /*
   * The game's id, in a ref rather than state.
   *
   * It must not be generated during render: built with Date.now()/
   * Math.random() there, the server and client disagreed about the opening
   * specials (which are seeded from it) and React discarded the tree. It
   * also must not be set via setState in an effect, which just trades a
   * hydration bug for a cascading render.
   *
   * A ref created lazily on first use from inside an effect satisfies both:
   * nothing random happens while rendering, and nothing re-renders to
   * publish it.
   */
  /*
   * Which bots have already acted, keyed "day-round-botId".
   *
   * The timers alone were not enough: a bot's trade was occasionally
   * applied and announced twice (two identical toasts on screen at once).
   * Rather than keep guessing at which re-entry caused it — a StrictMode
   * double-invoke, a re-render racing a pending write — this makes a second
   * execution impossible by construction. A ref, not state, because it must
   * be consulted and updated synchronously inside the state updater.
   */
  const botActedRef = useRef<Set<string>>(new Set());

  const gameIdRef = useRef<string | null>(null);
  const ensureGameId = useCallback(() => {
    gameIdRef.current ??= `g-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    return gameIdRef.current;
  }, []);

  // The roster and config are real; prices and cards come from the engine.
  const [state, setState] = useState<GameState>(() =>
    mockGameState(seats, meId, config),
  );
  const [selected, setSelected] = useState(state.quotes[0]?.ticker ?? "");
  const [historyTab, setHistoryTab] = useState<"mine" | "all">("mine");
  const [historyOpen, setHistoryOpen] = useState(false);
  // Insider Tip's revealed direction, cleared when the round turns over.
  const [tip, setTip] = useState<{ ticker: string; direction: string } | null>(
    null,
  );
  // Double Trade: lets the next order exceed the affordable maximum.
  const [doubleTrade, setDoubleTrade] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [banner, setBanner] = useState<{ title: string; sub: string } | null>(
    null,
  );
  const [engineDown, setEngineDown] = useState<string | null>(null);

  // Settlement needs the CURRENT quotes, but the round effect is keyed on
  // day+round and must not re-run when a price changes. A ref gives it live
  // data without widening the dependencies.
  //
  // Written in an effect, not during render: mutating a ref while rendering
  // is unsafe under concurrent rendering, where a render can be thrown away.
  const stateRef = useRef(state);
  useEffect(() => {
    stateRef.current = state;
  });

  // The board owns the viewport. Locking body scroll stops a stray pixel of
  // overflow (or a browser's scroll-anchoring) from introducing a scrollbar
  // that shifts the whole table sideways mid-round.

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  /**
   * Close a round through the engine and open the next one's cards.
   *
   * Falls back to moving prices by the signal they advertised when the
   * engine is unreachable: a stopped engine should degrade the game rather
   * than freeze it mid-session.
   */
  const settleRound = useCallback(
    async (gameId: string, day: number, round: number, roundsPerDay: number) => {
      setState((prev) => ({ ...prev, phase: "settling", secondsLeft: null }));

      type EngineQuote = {
        ticker: string;
        initial: number;
        last_round: number;
        current: number;
        frozen: boolean;
      };
      let settled: {
        quotes?: EngineQuote[];
        next_signals?: { id: string; ticker: string; delta: number }[];
        news?: {
          id: string;
          day: number;
          ticker: string | null;
          headline: string;
          body?: string;
        }[];
      } | null = null;

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
        if (data.ok) settled = data;
        else setEngineDown(data.error ?? "Price engine unavailable");
      } catch (e) {
        setEngineDown(
          e instanceof Error ? e.message : "Price engine unavailable",
        );
      }

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
            signals:
              fresh.length > 0
                ? fresh.map((sg) => ({
                    id: sg.id,
                    ticker: sg.ticker,
                    delta: sg.delta,
                  }))
                : prev.signals,
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
    },
    [],
  );

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

    /*
     * One timer per bot, each handling THAT bot and no other.
     *
     * The first version re-derived a list of pending orders inside every
     * timer and took the first one. Two timers firing before the first
     * state write committed both picked the same bot, so the same trade was
     * applied and announced twice. Binding the bot to its own timer makes
     * that impossible.
     */
    const timers = bots.map((bot, i) =>
      setTimeout(
        () => {
          setState((prev) => {
            if (prev.phase !== "trading") return prev;
            const once = `${prev.day}-${prev.round}-${bot.id}`;
            if (botActedRef.current.has(once)) return prev;
            const live = prev.players.find((p) => p.id === bot.id);
            if (!live || live.actedThisRound) return prev;
            botActedRef.current.add(once);

            const order = botOrder(prev, live);
            if (!order) {
              // No conviction — record a pass so the leaderboard tick is
              // honest rather than leaving the bot looking undecided.
              return {
                ...prev,
                players: prev.players.map((p) =>
                  p.id === bot.id ? { ...p, actedThisRound: true } : p,
                ),
              };
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
                p.id === bot.id ? { ...p, actedThisRound: true } : p,
              ),
            };
          });
        },
        1500 + i * 2200,
      ),
    );

    return () => timers.forEach(clearTimeout);
    // Re-runs when a new round opens; bots act once per round.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.day, state.round, state.phase]);

  /*
   * Special cards, with effects that actually happen.
   *
   * Previously this only greyed the card out — the player spent their one
   * use on nothing and had no way to tell. Each card now either does its
   * thing or refuses and says why, and cards whose mechanic does not exist
   * yet are never dealt (see lib/game/specials.ts).
   */
  const playSpecial = useCallback(
    async (id: string) => {
      const card = stateRef.current.specials.find((c) => c.id === id);
      if (!card || card.used) return;
      const info = specialInfo(card.key);

      if (!info.implemented) {
        pushToast(`${info.name} is not available yet`, "sell");
        return;
      }
      if (!playableNow(card.key, stateRef.current.phase)) {
        pushToast(
          info.window === "pre"
            ? `${info.name} is a pre-round card`
            : `${info.name} is a special-round card`,
          "sell",
        );
        return;
      }

      if (card.key === "insider_tip") {
        // Ask the engine for the true DIRECTION of the selected company's
        // next move. Direction only: knowing the size would remove the
        // decision rather than inform it.
        const cur = stateRef.current;
        try {
          const res = await fetch("/api/game/settle", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "insight",
              gameId: ensureGameId(),
              day: cur.day,
              round: cur.round,
              ticker: selected,
              quotes: cur.quotes.map((q) => ({
                ticker: q.ticker,
                initial: q.initial,
                last_round: q.lastRound,
                current: q.current,
                frozen: q.frozen,
              })),
            }),
          });
          const data = await res.json();
          if (!data.ok) {
            pushToast("Insider Tip failed — engine unavailable", "sell");
            return;
          }
          setTip({ ticker: selected, direction: data.direction });
          pushToast(
            `Insider Tip: ${selected} will move ${data.direction.toUpperCase()}`,
            data.direction === "down" ? "sell" : "buy",
          );
        } catch {
          pushToast("Insider Tip failed — engine unavailable", "sell");
          return;
        }
      }

      if (card.key === "double_trade") {
        setDoubleTrade(true);
        pushToast("Double Trade armed — your next order can go 2× over", "buy");
      }

      if (card.key === "rewind_trade") {
        const cur = stateRef.current;
        const mine = cur.activity.find(
          (a) =>
            a.playerId === cur.meId &&
            a.day === cur.day &&
            a.round === cur.round,
        );
        if (!mine) {
          pushToast("Nothing to rewind this round", "sell");
          return; // don't burn the card on a no-op
        }
        // Reverse the fill: undo the cash and share movement, drop the row.
        setState((prev) => {
          const players = prev.players.map((p) => {
            if (p.id !== prev.meId) return p;
            const cost = mine.price * mine.shares;
            const existing = p.holdings.find((h) => h.ticker === mine.ticker);
            if (mine.side === "buy") {
              const shares = (existing?.shares ?? 0) - mine.shares;
              return {
                ...p,
                cash: p.cash + cost,
                holdings: p.holdings
                  .map((h) =>
                    h.ticker === mine.ticker ? { ...h, shares } : h,
                  )
                  .filter((h) => h.shares > 0),
              };
            }
            const shares = (existing?.shares ?? 0) + mine.shares;
            return {
              ...p,
              cash: p.cash - cost,
              holdings: existing
                ? p.holdings.map((h) =>
                    h.ticker === mine.ticker ? { ...h, shares } : h,
                  )
                : [
                    ...p.holdings,
                    {
                      ticker: mine.ticker,
                      shares: mine.shares,
                      avgCost: mine.price,
                    },
                  ],
            };
          });
          return {
            ...prev,
            players,
            activity: prev.activity.filter((a) => a.id !== mine.id),
          };
        });
        pushToast(
          `Rewound: ${mine.side} ${mine.shares} ${mine.ticker}`,
          "buy",
        );
      }

      setState((prev) => ({
        ...prev,
        specials: prev.specials.map((c) =>
          c.id === id ? { ...c, used: true } : c,
        ),
      }));
    },
    [ensureGameId, selected, pushToast],
  );

  const pass = useCallback(() => {
    setState((prev) => ({
      ...prev,
      players: prev.players.map((p) =>
        p.id === prev.meId ? { ...p, actedThisRound: true } : p,
      ),
    }));
  }, []);


  /*
   * Opening deal.
   *
   * Without this the first round of every game was identical: the board
   * started from the hardcoded mock and only reached the engine at the first
   * settle, so day 1 always showed the same prices, the same ten cards and
   * the same three headlines no matter how many times you played.
   *
   * Asking the engine to deal on mount fixes that. `gameId` is random per
   * game and the engine seeds its RNG on it, so every game gets its own
   * market from the first card onwards.
   */
  useEffect(() => {
    let cancelled = false;
    const id = ensureGameId();

    (async () => {
      try {
        const res = await fetch("/api/game/settle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "deal",
            gameId: id,
            days: stateRef.current.config.days,
            roundsPerDay: stateRef.current.roundsPerDay,
          }),
        });
        const data = await res.json();
        if (cancelled) return;
        if (!data.ok) {
          setEngineDown(data.error ?? "Price engine unavailable");
          return;
        }
        setEngineDown(null);
        setState((prev) => ({
          ...prev,
          // Specials are dealt here too, from the real game id, so each game
          // gets its own pair rather than a fixed opening hand.
          specials: dealSpecials(id, 2),
          quotes: data.quotes.map(
            (q: {
              ticker: string;
              initial: number;
              last_round: number;
              current: number;
              frozen: boolean;
            }) => ({
              ticker: q.ticker,
              initial: q.initial,
              lastRound: q.last_round,
              current: q.current,
              frozen: q.frozen,
            }),
          ),
          signals: data.signals.map(
            (sg: { id: string; ticker: string; delta: number }) => ({
              id: sg.id,
              ticker: sg.ticker,
              delta: sg.delta,
            }),
          ),
          news: data.news.map(
            (n: {
              id: string;
              day: number;
              ticker: string | null;
              headline: string;
              body?: string;
            }) => ({
              id: n.id,
              day: n.day,
              ticker: n.ticker,
              headline: n.headline,
              body: n.body,
            }),
          ),
        }));
      } catch (e) {
        if (!cancelled) {
          setEngineDown(
            e instanceof Error ? e.message : "Price engine unavailable",
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
    // Once per game.
  }, [ensureGameId]);

  /*
   * The day cycle.
   *
   *   pre-round (15s)  cards that inform the round ahead
   *   trading          the order window, one action
   *   settle           engine closes the round
   *   round 2          same again
   *   day-prices       the day's closing prices, held to be read
   *   special-round    30s for cards that act on known prices
   *   next day
   *
   * Driven by one effect keyed on day+round. The sequence writes state as it
   * runs, and if those writes changed the dependencies React would tear the
   * effect down mid-flight and cancel the pending steps — which is exactly
   * what stopped the round transition firing in an earlier version. Day and
   * round hold still until the final step.
   */
  useEffect(() => {
    if (state.phase === "finished") return;
    const gameId = ensureGameId();

    let cancelled = false;
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => {
      timers.push(setTimeout(() => !cancelled && fn(), ms));
    };

    const day = state.day;
    const round = state.round;
    const roundsPerDay = state.roundsPerDay;
    const lastRoundOfDay = round >= roundsPerDay;
    const lastDay = day >= state.config.days;
    const tradeMs = state.config.roundTimerSec * 1000;

    // One ticking clock for whichever window is open.
    const tick = setInterval(() => {
      setState((prev) => {
        if (prev.secondsLeft === null) return prev;
        if (!["pre-round", "trading", "special-round"].includes(prev.phase)) {
          return prev;
        }
        return { ...prev, secondsLeft: Math.max(0, prev.secondsLeft - 1) };
      });
    }, 1000);

    // ---- 1. Cards window -------------------------------------------------
    setState((prev) => ({
      ...prev,
      phase: "pre-round",
      secondsLeft: PRE_ROUND_SECONDS,
    }));
    setBanner({
      title: `Day ${day} · Round ${round}`,
      sub: "Cards open — play anything that informs this round",
    });
    at(2000, () => setBanner(null));

    // ---- 2. Trading ------------------------------------------------------
    at(PRE_ROUND_SECONDS * 1000, () => {
      setState((prev) => ({
        ...prev,
        phase: "trading",
        secondsLeft: prev.config.roundTimerSec,
      }));
      setBanner({ title: "Trading open", sub: "One action this round" });
      at(1600, () => setBanner(null));
    });

    const tradeEnds = PRE_ROUND_SECONDS * 1000 + tradeMs;

    // ---- 3. Settle -------------------------------------------------------
    at(tradeEnds, () => {
      clearInterval(tick);
      void settleRound(gameId, day, round, roundsPerDay);
    });

    // ---- 4. Round boundary, or the day's close ---------------------------
    if (!lastRoundOfDay) {
      at(tradeEnds + 1400, () => {
        setState((prev) => ({ ...prev, phase: "round-complete" }));
        setBanner({
          title: `Round ${round} complete`,
          sub: `Round ${round + 1} starting`,
        });
      });
      at(tradeEnds + 3600, () => {
        setBanner(null);
        setState((prev) => ({
          ...prev,
          round: prev.round + 1,
          players: prev.players.map((pl) => ({ ...pl, actedThisRound: false })),
        }));
      });
    } else {
      // Closing prices, held on screen long enough to actually read.
      at(tradeEnds + 1400, () => {
        setState((prev) => ({ ...prev, phase: "day-prices", secondsLeft: null }));
        setBanner({
          title: `Day ${day} closed`,
          sub: "Closing prices",
        });
      });
      at(tradeEnds + 4600, () => {
        setBanner(null);
        setState((prev) => ({
          ...prev,
          phase: "special-round",
          secondsLeft: SPECIAL_ROUND_SECONDS,
        }));
        setBanner({
          title: "Special round",
          sub: "Play cards that act on the closing prices",
        });
        at(2000, () => setBanner(null));
      });

      const specialEnds = tradeEnds + 4600 + SPECIAL_ROUND_SECONDS * 1000;

      at(specialEnds, () => {
        if (lastDay) {
          setBanner({ title: "Game over", sub: "Final standings" });
          setState((prev) => ({
            ...prev,
            phase: "finished",
            secondsLeft: null,
          }));
          return;
        }
        setState((prev) => ({ ...prev, phase: "day-complete" }));
        setBanner({ title: `Day ${day} complete`, sub: `Day ${day + 1} starting` });
      });

      if (!lastDay) {
        at(specialEnds + 2400, () => {
          setBanner(null);
          setState((prev) => ({
            ...prev,
            day: prev.day + 1,
            round: 1,
            players: prev.players.map((pl) => ({
              ...pl,
              actedThisRound: false,
            })),
          }));
        });
      }
    }

    return () => {
      cancelled = true;
      clearInterval(tick);
      timers.forEach(clearTimeout);
    };
    // Intentionally keyed on the round only — see the note above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.day, state.round]);

  return (
    <>
      <GameHeader
        state={state}
        onOpenHistory={() => setHistoryOpen(true)}
        activityCount={state.activity.length}
      />
      <PhaseTransition transition={banner} />

      {engineDown && (
        <div className="animate-fade-in border-b border-warn/30 bg-warn/10 px-6 py-1 text-center text-[0.6875rem] font-medium text-warn">
          Price engine unavailable — prices are moving on a local fallback.{" "}
          <span className="text-ink-faint">({engineDown})</span>
        </div>
      )}

      {/*
        The board is a fixed-height viewport, not a document. A trading table
        you have to scroll is a table where the thing you needed was off
        screen when the timer ran out, so the whole game fits one screen and
        only the genuinely unbounded lists (news, holdings, standings) scroll
        inside their own panel.

        Sized by flex-1 against the layout's column, not a calc() against the
        header heights. The first attempt subtracted a hardcoded 6.5rem and
        the real headers came to 111px, so the page overflowed by 7px and
        grew a scrollbar anyway. Flex cannot be off by a rounding error.
      */}
      <main className="mx-auto w-full min-h-0 max-w-[1800px] flex-1 overflow-hidden px-5 py-3">
        <div className="grid h-full min-h-0 gap-3 xl:grid-cols-[250px_minmax(0,1fr)_290px]">
          {/*
            LEFT — supporting information.

            The leaderboard lives here rather than in the right rail. That
            rail has a hard height budget (order panel, wallet, portfolio)
            and on a 1366x768 screen the standings were falling off the
            bottom of it. News and standings are both reference material, so
            pairing them here fixes the overflow structurally instead of by
            shaving pixels off everything else.
          */}
          <aside className="order-2 flex min-h-0 flex-col gap-3 xl:order-1">
            <NewsFeed news={state.news} className="min-h-0 flex-1" />
            <Leaderboard state={state} className="min-h-[96px] shrink-0" />
          </aside>

          {/* CENTRE — the primary focus */}
          <div className="order-1 flex min-h-0 flex-col gap-3 xl:order-2">
            <MarketGrid
              quotes={state.quotes}
              selected={selected}
              onSelect={setSelected}
              tip={tip}
            />
            <CardGrid
              signals={state.signals}
              specials={state.specials}
              onPlaySpecial={playSpecial}
              phase={state.phase}
            />
          </div>

          {/* RIGHT — the player's own position */}
          <aside className="order-3 flex min-h-0 flex-col gap-3">
            <OrderPanel
              key={selected}
              state={state}
              ticker={selected}
              onSubmit={submitOrder}
              onPass={pass}
              doubleTrade={doubleTrade}
            />
            <Wallet state={state} />
            <Portfolio state={state} className="min-h-[96px] flex-1" />
          </aside>
        </div>
      </main>

      {/*
        Trade notifications drop in from behind the control bar rather than
        rising from the bottom. The action they report happens at the top of
        the screen, and the bottom edge is where the news crawl already lives.
      */}
      <div className="pointer-events-none fixed inset-x-0 top-[7.25rem] z-40 flex flex-col items-center gap-1.5">
        {toasts.map((t) => {
          const company = getCompany(t.text.split(" ").pop() ?? "");
          return (
            <div
              key={t.id}
              className="toast-drop flex items-center gap-2 rounded-md border border-line bg-surface/95 px-3 py-1.5 text-xs font-medium text-ink shadow-lift backdrop-blur-sm"
            >
              {company && <CompanyLogo company={company} size={15} />}
              <span className={t.side === "buy" ? "text-up" : "text-down"}>
                ●
              </span>
              {t.text}
            </div>
          );
        })}
      </div>

      <HistoryDrawer
        state={state}
        open={historyOpen}
        tab={historyTab}
        onTab={setHistoryTab}
        onClose={() => setHistoryOpen(false)}
      />
    </>
  );
}
