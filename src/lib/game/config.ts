/**
 * Game configuration model shared by the mode-selection and config screens
 * (Phase 2) and, later, by room creation and the engine (Phase 4+).
 *
 * Keeping the defaults, limits, and presets in one place means the UI, the
 * store, and eventually the server all agree on what a valid game looks like.
 */

export const GAME_MODES = ["online", "bots", "solo"] as const;
export type GameMode = (typeof GAME_MODES)[number];

export function isGameMode(value: string): value is GameMode {
  return (GAME_MODES as readonly string[]).includes(value);
}

export type GameConfig = {
  /** Number of Days; each Day has 2 Rounds, so rounds = days * 2. */
  days: number;
  /** Starting cash per player, in cents. */
  startingCash: number;
  /** Number of companies in the market. */
  companies: number;
  /** Seconds each round's order window stays open before auto-lock. */
  roundTimerSec: number;
};

export const DEFAULT_CONFIG: GameConfig = {
  days: 10,
  startingCash: 100_000, // $1,000
  companies: 6,
  roundTimerSec: 90,
};

export const LIMITS = {
  days: { min: 4, max: 20, step: 1 },
  companies: { min: 4, max: 8, step: 1 },
} as const;

/**
 * Selectable starting-cash amounts, in cents.
 *
 * With shares at $60–$100, $1,000 buys roughly 10–16 shares. That is
 * deliberately tight: every order costs a real fraction of the wallet, so
 * choosing between instruments actually matters. A larger float lets you buy
 * everything and removes the decision.
 */
export const CASH_PRESETS = [50_000, 100_000, 250_000, 500_000];

/** Selectable round-timer lengths (seconds). */
export const TIMER_OPTIONS = [60, 90, 120, 180];

/**
 * Format cents as US dollars, e.g. 1_000_000 -> "$10,000".
 *
 * Money is held as integer cents everywhere, so every formatter divides by
 * 100 at the edge. Keeping the division here rather than at call sites is
 * what stops half the app passing dollars by mistake.
 */
export function formatUSD(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Math.round(cents / 100));
}

/** Compact label for large amounts, e.g. "$25K", "$1.5M". */
export function shortUSD(cents: number): string {
  const dollars = cents / 100;
  if (dollars >= 1_000_000) {
    const m = dollars / 1_000_000;
    return `$${Number.isInteger(m) ? m : m.toFixed(1)}M`;
  }
  if (dollars >= 1_000) {
    const k = dollars / 1_000;
    return `$${Number.isInteger(k) ? k : k.toFixed(1)}K`;
  }
  return formatUSD(cents);
}

type ModeMeta = {
  label: string;
  tagline: string;
  description: string;
  /** What actually happens after configuring — set honestly per current phase. */
  nextStep: string;
  /** Whether this mode's config CTA can proceed today. */
  available: boolean;
};

export const MODE_META: Record<GameMode, ModeMeta> = {
  online: {
    label: "Play Online",
    tagline: "Multiplayer",
    description:
      "Create or join a room with a share code and trade against friends in real time.",
    nextStep: "Room ready — the live game screen arrives in Phase 5.",
    available: true,
  },
  bots: {
    label: "Play vs Bots",
    tagline: "Offline · AI opponents",
    description:
      "Trade against AI opponents of varying difficulty — no other players needed.",
    nextStep: "Starts immediately — no room, no waiting.",
    available: true,
  },
  solo: {
    label: "Practice Solo",
    tagline: "Offline · No opponents",
    description:
      "Learn the mechanics at your own pace with the market but no rivals.",
    nextStep: "Starts immediately — the market, with nobody to beat.",
    available: true,
  },
};
