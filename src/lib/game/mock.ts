/**
 * MOCK GAME STATE — PRESENTATION ONLY.
 *
 * Fixed sample data so the game screen can be built and reviewed before the
 * price engine exists. Nothing here is a game rule: no prices are computed, no
 * signals generated, no news written by algorithm, no scores derived. Every
 * value is a hand-picked literal chosen to exercise a UI state — gains and
 * losses, a frozen ticker, a used special card, a player in the lead.
 *
 * Replace this with the engine's payload. If it starts growing logic, that
 * logic is in the wrong file.
 */

import { DEFAULT_CONFIG, type GameConfig } from "@/lib/game/config";
import { PLAYER_SPECIAL_CARDS } from "@/lib/game/cards";
import type { GameState } from "@/lib/game/state";

const d = (dollars: number) => Math.round(dollars * 100);

export const MOCK_ME = "p1";

/** A seat at the table, as the lobby knows it. */
export type Seat = { id: string; displayName: string };

/**
 * Build the opening state for a real room.
 *
 * `seats` and `config` come from the lobby, so the board shows the people who
 * actually joined and the settings the host chose — rather than four
 * hardcoded strangers. Everything else is still mock until the engine is
 * wired in.
 */
export function mockGameState(
  seats?: Seat[],
  meId?: string,
  config?: GameConfig,
): GameState {
  const cfg = { ...DEFAULT_CONFIG, ...(config ?? {}) };
  const roster: Seat[] =
    seats && seats.length > 0
      ? seats
      : [
          { id: "p1", displayName: "You" },
          { id: "p2", displayName: "Ravi" },
          { id: "p3", displayName: "Meera" },
          { id: "p4", displayName: "Arjun" },
        ];

  return {
    config: cfg,
    // A new game opens on Day 1, Round 1 with every price at its initial
    // value, so the first round genuinely shows no movement. (This used to
    // open on Day 3 with prices already moved, purely so the panels looked
    // populated during review — which made it look like the game started
    // mid-way.)
    day: 1,
    round: 1,
    roundsPerDay: 2,
    phase: "trading",
    secondsLeft: cfg.roundTimerSec,

    quotes: [
      { ticker: "TSLA", initial: d(95),  lastRound: d(95),  current: d(95),  frozen: false },
      { ticker: "AAPL", initial: d(80),  lastRound: d(80),  current: d(80),  frozen: false },
      { ticker: "AMZN", initial: d(72),  lastRound: d(72),  current: d(72),  frozen: false },
      { ticker: "JPM",  initial: d(88),  lastRound: d(88),  current: d(88),  frozen: false },
      { ticker: "NFLX", initial: d(100), lastRound: d(100), current: d(100), frozen: false },
      { ticker: "CVS",  initial: d(60),  lastRound: d(60),  current: d(60),  frozen: false },
    ],

    // Ten signals: 2 rows x 5 columns in the grid.
    signals: [
      { id: "s1",  ticker: "AAPL", delta: d(4) },
      { id: "s2",  ticker: "TSLA", delta: d(-3) },
      { id: "s3",  ticker: "AMZN", delta: d(5) },
      { id: "s4",  ticker: "NFLX", delta: d(-7) },
      { id: "s5",  ticker: "JPM",  delta: d(2) },
      { id: "s6",  ticker: "CVS",  delta: d(-2) },
      { id: "s7",  ticker: "AAPL", delta: d(-5) },
      { id: "s8",  ticker: "AMZN", delta: d(3) },
      { id: "s9",  ticker: "TSLA", delta: d(6) },
      { id: "s10", ticker: "NFLX", delta: d(-4) },
    ],

    // Two specials in column six — one spent, one available.
    specials: [
      {
        id: "sp1",
        key: "insider_tip",
        name: PLAYER_SPECIAL_CARDS[0].name,
        effect: PLAYER_SPECIAL_CARDS[0].effect,
        used: false,
      },
      {
        id: "sp2",
        key: "price_shield",
        name: PLAYER_SPECIAL_CARDS[1].name,
        effect: PLAYER_SPECIAL_CARDS[1].effect,
        used: true,
      },
    ],

    news: [
      { id: "n1", day: 1, ticker: "TSLA", headline: "Tesla lifts delivery guidance for the quarter", body: "Management points to stronger demand in two key markets." },
      { id: "n2", day: 1, ticker: "NFLX", headline: "Netflix subscriber growth slows in mature markets" },
      { id: "n3", day: 1, ticker: null,   headline: "Central bank holds rates steady", body: "Policymakers signal no change before the next review." },
    ],

    // Everyone opens flat: full cash, no positions, nothing traded yet. The
    // portfolio and history panels fill in as you trade.
    players: roster.map((seat) => ({
      id: seat.id,
      displayName: seat.displayName,
      cash: cfg.startingCash,
      actedThisRound: false,
      holdings: [],
    })),
    meId: meId ?? roster[0].id,

    activity: [],

    publicActivity: true,
  };
}
