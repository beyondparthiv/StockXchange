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
 * Money is held in paise (1/100 of a rupee) as integers. Floats accumulate
 * error once you start multiplying share counts by prices and summing P&L, and
 * a drifting net worth in a competitive game is a bug players will notice.
 * Format at the edges with `formatMoney`.
 */

import type { GameConfig } from "@/lib/game/config";

/** Integer paise. 100 paise = ₹1. */
export type Paise = number;

/* -------------------------------------------------------------------------
   Market
   ---------------------------------------------------------------------- */

export type Quote = {
  ticker: string;
  /** Price at game start — the INIT column on a tile. */
  initial: Paise;
  /** Price at the end of the previous round — the LAST column. */
  lastRound: Paise;
  /** Live price — the NOW column, and the tile's visual focus. */
  current: Paise;
  /** True when a card (Share Suspended, Circuit Breaker) has locked trading. */
  frozen: boolean;
};

/** Signed change vs the previous round, and the direction for colouring. */
export type Move = {
  absolute: Paise;
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
  delta: Paise;
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
  shares: number;
  /** Average price paid, for the P&L column. */
  avgCost: Paise;
};

export type Player = {
  id: string;
  displayName: string;
  cash: Paise;
  holdings: Holding[];
  /** Set once the player has acted this round; drives the leaderboard ticks. */
  actedThisRound: boolean;
};

/* -------------------------------------------------------------------------
   Activity
   ---------------------------------------------------------------------- */

export type TradeSide = "buy" | "sell";

export type Activity = {
  id: string;
  playerId: string;
  playerName: string;
  side: TradeSide;
  ticker: string;
  shares: number;
  price: Paise;
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
 * `trading` is the only phase that accepts orders. The transition phases exist
 * so the UI can run its round/day animations without racing the engine.
 */
export type Phase =
  | "dealing"
  | "trading"
  | "settling"
  | "round-complete"
  | "day-complete"
  | "finished";

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

export function priceOf(state: GameState, ticker: string): Paise {
  return state.quotes.find((q) => q.ticker === ticker)?.current ?? 0;
}

export function holdingsValue(state: GameState, p: Player): Paise {
  return p.holdings.reduce(
    (sum, h) => sum + h.shares * priceOf(state, h.ticker),
    0,
  );
}

export function netWorth(state: GameState, p: Player): Paise {
  return p.cash + holdingsValue(state, p);
}

/** Unrealised P&L on one holding at the current price. */
export function holdingPnl(state: GameState, h: Holding): Paise {
  return h.shares * (priceOf(state, h.ticker) - h.avgCost);
}

/** Most shares of `ticker` the player can afford right now. */
export function maxAffordable(state: GameState, p: Player, ticker: string) {
  const price = priceOf(state, ticker);
  return price <= 0 ? 0 : Math.floor(p.cash / price);
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

const INR = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

export function formatMoney(paise: Paise): string {
  return INR.format(Math.round(paise / 100));
}

/** Signed, for P&L and deltas — the sign is the point. */
export function formatSigned(paise: Paise): string {
  const s = formatMoney(Math.abs(paise));
  return paise > 0 ? `+${s}` : paise < 0 ? `−${s}` : s;
}

export function formatPercent(pct: number): string {
  const s = `${Math.abs(pct).toFixed(2)}%`;
  return pct > 0 ? `+${s}` : pct < 0 ? `−${s}` : s;
}

/** Tailwind text colour for a direction. Green/red mean movement only. */
export function directionClass(d: Move["direction"]): string {
  return d === "up" ? "text-up" : d === "down" ? "text-down" : "text-ink-faint";
}
