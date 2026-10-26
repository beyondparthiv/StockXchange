/**
 * Game state model — the contract between the UI and the price engine.
 *
 * This file deliberately contains NO game rules. There is no price settlement
 * maths, no signal generation, no news algorithm, no scoring. Those belong to
 * the engine (price-engine/) and are not invented here. What this defines is
 * the *shape* the engine must produce, so the screen can be built, reviewed,
 * and styled before the rules exist — and so filling in the engine later needs
 * no component changes.
 *
 * Money is held in integer cents. Floats accumulate error once you start
 * multiplying share counts by prices and summing P&L, and a drifting net
 * worth in a competitive game is a bug players will notice. Format at the
 * edges with `formatMoney`.
 */

import type { GameConfig } from "@/lib/game/config";

/** Integer cents. 100 cents = $1. */
export type Cents = number;

/* -------------------------------------------------------------------------
   Market
   ---------------------------------------------------------------------- */

export type Quote = {
  ticker: string;
  /** Price at game start — the INIT column on a tile. */
  initial: Cents;
  /** Price at the end of the previous round — the LAST column. */
  lastRound: Cents;
  /** Live price — the NOW column, and the tile's visual focus. */
  current: Cents;
  /** True when a card (Share Suspended, Circuit Breaker) has locked trading. */
  frozen: boolean;
};

/** Signed change vs the previous round, and the direction for colouring. */
export type Move = {
  absolute: Cents;
  /** Percent, already computed by the engine so the UI never does game maths. */
  percent: number;
  direction: "up" | "down" | "flat";
};

export function moveOf(q: Quote): Move {
  const absolute = q.current - q.lastRound;
  const percent = q.lastRound === 0 ? 0 : (absolute / q.lastRound) * 100;
  return {
    absolute,
    percent,
    direction: absolute > 0 ? "up" : absolute < 0 ? "down" : "flat",
  };
}

/* -------------------------------------------------------------------------
   Cards
   ---------------------------------------------------------------------- */

/**
 * A market signal is INFORMATION, not an action. It hints at what a company
 * may do. Players read it and decide whether to buy, sell, or pass — there is
 * deliberately no "use" affordance, and the UI must never render one.
 */
export type MarketSignal = {
  id: string;
  ticker: string;
  /** Hinted move. Sign carries the direction. */
  delta: Cents;
};

/** A special card IS playable by its owner — the opposite of a signal. */
export type SpecialCard = {
  id: string;
  /** Matches a `key` in PLAYER_SPECIAL_CARDS (lib/game/cards.ts). */
  key: string;
  name: string;
  effect: string;
  used: boolean;
};

/* -------------------------------------------------------------------------
   Player
   ---------------------------------------------------------------------- */

export type Holding = {
  ticker: string;
  /**
   * Positive for a long position, NEGATIVE for a short.
   *
   * One signed number rather than two lists. Every derived figure then
   * works for both sides without a special case: holdings value goes
   * negative, and P&L of `shares * (price - avgCost)` flips sign exactly
   * as a short's profit should — you make money when the price falls.
   */
  shares: number;
  /** Average price paid (long) or shorted at (short). */
  avgCost: Cents;
};

export type Player = {
  id: string;
  displayName: string;
  /** Driven by the local bot engine rather than a human. */
  isBot?: boolean;
  cash: Cents;
  /**
   * Borrowed cash, repaid out of net worth at the end.
   *
   * Held separately from `cash` so the wallet can show what is yours and
   * what is owed. A loan that silently inflated the cash line would make
   * the leaderboard lie.
   */
  debt?: Cents;
  holdings: Holding[];
  /** Set once the player has acted this round; drives the leaderboard ticks. */
  actedThisRound: boolean;
};

/* -------------------------------------------------------------------------
   Activity
   ---------------------------------------------------------------------- */

/**
 * `short` sells stock you do not own: it credits the proceeds now and
 * leaves you owing the shares. `buy` covers an open short before it starts
 * building a long position.
 */
export type TradeSide = "buy" | "sell" | "short";

export type Activity = {
  id: string;
  playerId: string;
  playerName: string;
  side: TradeSide;
  ticker: string;
  shares: number;
  price: Cents;
  day: number;
  round: number;
  at: string;
};

export type NewsItem = {
  id: string;
  day: number;
  /** Null for market-wide news with no single subject. */
  ticker: string | null;
  headline: string;
  body?: string;
};

/* -------------------------------------------------------------------------
   Phases
   ---------------------------------------------------------------------- */

/**
 * The day cycle.
 *
 *   pre-round      15s to play cards that inform the round ahead (Insider
 *                  Tip, Double Trade). No trading.
 *   trading        the order window. ONE action per round — an order or a
 *                  pass — so a round is a decision, not a shopping trip.
 *   settling       the engine is closing the round.
 *   round-complete transition between the day's two rounds.
 *   day-prices     the day's closing prices, held on screen to be read.
 *   special-round  30s for cards that act after prices are known.
 *   day-complete   transition into the next day.
 *
 * Only `trading` accepts orders; only `pre-round` and `special-round` accept
 * special cards. Keeping those windows separate is what stops a round
 * collapsing into "do everything at once".
 */
export type Phase =
  | "dealing"
  | "pre-round"
  | "trading"
  | "settling"
  | "round-complete"
  | "day-prices"
  | "special-round"
  | "day-complete"
  | "finished";

/** Phases that accept a buy/sell order. */
export function canTrade(phase: Phase): boolean {
  return phase === "trading";
}

/** Phases that accept a special card. */
export function canPlaySpecials(phase: Phase): boolean {
  return phase === "pre-round" || phase === "special-round";
}

export type GameState = {
  config: GameConfig;
  day: number;
  round: number;
  /** Rounds per day — rounds total is days * roundsPerDay. */
  roundsPerDay: number;
  phase: Phase;
  /** Seconds left in the order window; null outside `trading`. */
  secondsLeft: number | null;
  quotes: Quote[];
  signals: MarketSignal[];
  specials: SpecialCard[];
  news: NewsItem[];
  players: Player[];
  /** The viewing player's id — whose wallet and portfolio are shown. */
  meId: string;
  activity: Activity[];
  /** Host setting. When false, Overall History is unavailable (not empty). */
  publicActivity: boolean;
};

/* -------------------------------------------------------------------------
   Derived values
   These are presentation arithmetic, not game rules: summing what the engine
   already decided. Keeping them here stops six components re-deriving them.
   ---------------------------------------------------------------------- */

export function priceOf(state: GameState, ticker: string): Cents {
  return state.quotes.find((q) => q.ticker === ticker)?.current ?? 0;
}

export function holdingsValue(state: GameState, p: Player): Cents {
  return p.holdings.reduce(
    (sum, h) => sum + h.shares * priceOf(state, h.ticker),
    0,
  );
}

export function netWorth(state: GameState, p: Player): Cents {
  return p.cash + holdingsValue(state, p) - (p.debt ?? 0);
}

/** Unrealised P&L on one holding at the current price. */
export function holdingPnl(state: GameState, h: Holding): Cents {
  return h.shares * (priceOf(state, h.ticker) - h.avgCost);
}

/** Most shares of `ticker` the player can afford right now. */
export function maxAffordable(state: GameState, p: Player, ticker: string) {
  const price = priceOf(state, ticker);
  return price <= 0 ? 0 : Math.floor(p.cash / price);
}

/**
 * Most shares the player may short.
 *
 * Capped by cash as collateral even though shorting pays out rather than
 * costs. A short's downside is unbounded — the price can keep rising — so
 * an uncapped one can take a player below zero with no way back, which
 * stops being a game.
 */
export function maxShortable(state: GameState, p: Player, ticker: string) {
  const price = priceOf(state, ticker);
  if (price <= 0) return 0;
  const openShort = Math.max(0, -sharesHeld(p, ticker));
  return Math.max(0, Math.floor(p.cash / price) - openShort);
}

/** Shares owed on an open short, as a positive number. 0 when flat/long. */
export function sharesShorted(p: Player, ticker: string): number {
  return Math.max(0, -sharesHeld(p, ticker));
}

export function sharesHeld(p: Player, ticker: string): number {
  return p.holdings.find((h) => h.ticker === ticker)?.shares ?? 0;
}

export function me(state: GameState): Player {
  return state.players.find((p) => p.id === state.meId) ?? state.players[0];
}

/** Players ranked by net worth, highest first. */
export function leaderboard(state: GameState): Player[] {
  return [...state.players].sort((a, b) => netWorth(state, b) - netWorth(state, a));
}

/* -------------------------------------------------------------------------
   Formatting
   ---------------------------------------------------------------------- */

const USD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

export function formatMoney(cents: Cents): string {
  return USD.format(Math.round(cents / 100));
}

/** Signed, for P&L and deltas — the sign is the point. */
export function formatSigned(cents: Cents): string {
  const s = formatMoney(Math.abs(cents));
  return cents > 0 ? `+${s}` : cents < 0 ? `−${s}` : s;
}

export function formatPercent(pct: number): string {
  const s = `${Math.abs(pct).toFixed(2)}%`;
  return pct > 0 ? `+${s}` : pct < 0 ? `−${s}` : s;
}

/** Tailwind text colour for a direction. Green/red mean movement only. */
export function directionClass(d: Move["direction"]): string {
  return d === "up" ? "text-up" : d === "down" ? "text-down" : "text-ink-faint";
}
