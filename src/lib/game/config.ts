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
  /** Starting cash per player, in rupees. */
  startingCash: number;
  /** Number of companies in the market. */
  companies: number;
  /** Seconds each round's order window stays open before auto-lock. */
  roundTimerSec: number;
};

export const DEFAULT_CONFIG: GameConfig = {
  days: 10,
  startingCash: 15_000_000, // ₹1,50,00,000
  companies: 6,
  roundTimerSec: 90,
};

export const LIMITS = {
  days: { min: 4, max: 20, step: 1 },
  companies: { min: 4, max: 8, step: 1 },
} as const;

/** Selectable starting-cash amounts (rupees). */
export const CASH_PRESETS = [5_000_000, 10_000_000, 15_000_000, 50_000_000];

/** Selectable round-timer lengths (seconds). */
export const TIMER_OPTIONS = [60, 90, 120, 180];

/** Format rupees using Indian digit grouping, e.g. ₹1,50,00,000. */
export function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
}

/** Short label for large amounts, e.g. "₹1.5 Cr", "₹50 L". */
export function shortINR(amount: number): string {
  if (amount >= 10_000_000) {
    const cr = amount / 10_000_000;
    return `₹${Number.isInteger(cr) ? cr : cr.toFixed(1)} Cr`;
  }
  if (amount >= 100_000) {
    const l = amount / 100_000;
    return `₹${Number.isInteger(l) ? l : l.toFixed(1)} L`;
  }
  return formatINR(amount);
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
    nextStep: "Bot opponents arrive in Phase 8; the game screen in Phase 5.",
    available: false,
  },
  solo: {
    label: "Practice Solo",
    tagline: "Offline · No opponents",
    description:
      "Learn the mechanics at your own pace with the market but no rivals.",
    nextStep: "The playable game screen arrives in Phase 5.",
    available: false,
  },
};
