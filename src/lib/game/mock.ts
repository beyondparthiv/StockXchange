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

import { DEFAULT_CONFIG } from "@/lib/game/config";
import { PLAYER_SPECIAL_CARDS } from "@/lib/game/cards";
import type { GameState } from "@/lib/game/state";

const r = (rupees: number) => Math.round(rupees * 100);

export const MOCK_ME = "p1";

export function mockGameState(): GameState {
  return {
    config: { ...DEFAULT_CONFIG, companies: 6 },
    day: 3,
    round: 1,
    roundsPerDay: 2,
    phase: "trading",
    secondsLeft: 64,

    // Spread of directions so colour coding is visible at a glance, plus one
    // frozen ticker to exercise the locked state.
    quotes: [
      { ticker: "TSLA", initial: r(2400), lastRound: r(2310), current: r(2468), frozen: false },
      { ticker: "AAPL", initial: r(1800), lastRound: r(1845), current: r(1792), frozen: false },
      { ticker: "AMZN", initial: r(1650), lastRound: r(1610), current: r(1783), frozen: false },
      { ticker: "JPM",  initial: r(2000), lastRound: r(2018), current: r(2018), frozen: false },
      { ticker: "NFLX", initial: r(5800), lastRound: r(6240), current: r(6124), frozen: false },
      { ticker: "CVS",  initial: r(560),  lastRound: r(571),  current: r(589),  frozen: true  },
    ],

    // Ten signals: 2 rows x 5 columns in the grid.
    signals: [
      { id: "s1",  ticker: "AAPL", delta: r(10) },
      { id: "s2",  ticker: "TSLA", delta: r(-8) },
      { id: "s3",  ticker: "AMZN", delta: r(14) },
      { id: "s4",  ticker: "NFLX", delta: r(-22) },
      { id: "s5",  ticker: "JPM",  delta: r(6) },
      { id: "s6",  ticker: "CVS",  delta: r(-4) },
      { id: "s7",  ticker: "AAPL", delta: r(-12) },
      { id: "s8",  ticker: "AMZN", delta: r(9) },
      { id: "s9",  ticker: "TSLA", delta: r(18) },
      { id: "s10", ticker: "NFLX", delta: r(-7) },
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
      { id: "n1", day: 3, ticker: "TSLA", headline: "Tesla lifts delivery guidance for the quarter", body: "Management points to stronger demand in two key markets." },
      { id: "n2", day: 3, ticker: "NFLX", headline: "Netflix subscriber growth slows in mature markets" },
      { id: "n3", day: 2, ticker: null,   headline: "Central bank holds rates steady", body: "Policymakers signal no change before the next review." },
      { id: "n4", day: 2, ticker: "AMZN", headline: "Amazon expands same-day logistics network" },
      { id: "n5", day: 2, ticker: "CVS",  headline: "CVS trading halted pending an announcement" },
      { id: "n6", day: 1, ticker: "JPM",  headline: "JPMorgan beats on net interest income" },
    ],

    players: [
      {
        id: "p1",
        displayName: "You",
        cash: r(412_000),
        actedThisRound: false,
        holdings: [
          { ticker: "AAPL", shares: 240, avgCost: r(1750) },
          { ticker: "AMZN", shares: 120, avgCost: r(1820) }, // underwater
          { ticker: "NFLX", shares: 35,  avgCost: r(5600) },
        ],
      },
      {
        id: "p2",
        displayName: "Ravi",
        cash: r(260_000),
        actedThisRound: true,
        holdings: [{ ticker: "TSLA", shares: 400, avgCost: r(2280) }],
      },
      {
        id: "p3",
        displayName: "Meera",
        cash: r(880_000),
        actedThisRound: true,
        holdings: [{ ticker: "JPM", shares: 150, avgCost: r(1990) }],
      },
      {
        id: "p4",
        displayName: "Arjun",
        cash: r(95_000),
        actedThisRound: false,
        holdings: [
          { ticker: "NFLX", shares: 90, avgCost: r(5900) },
          { ticker: "CVS",  shares: 500, avgCost: r(545) },
        ],
      },
    ],
    meId: MOCK_ME,

    activity: [
      { id: "a1", playerId: "p2", playerName: "Ravi",  side: "buy",  ticker: "TSLA", shares: 120, price: r(2310), day: 3, round: 1, at: "" },
      { id: "a2", playerId: "p3", playerName: "Meera", side: "sell", ticker: "NFLX", shares: 20,  price: r(6240), day: 3, round: 1, at: "" },
      { id: "a3", playerId: "p1", playerName: "You",   side: "buy",  ticker: "AAPL", shares: 60,  price: r(1845), day: 2, round: 2, at: "" },
      { id: "a4", playerId: "p4", playerName: "Arjun", side: "buy",  ticker: "CVS",  shares: 200, price: r(571),  day: 2, round: 2, at: "" },
      { id: "a5", playerId: "p1", playerName: "You",   side: "sell", ticker: "AMZN", shares: 40,  price: r(1610), day: 2, round: 1, at: "" },
    ],

    publicActivity: true,
  };
}
