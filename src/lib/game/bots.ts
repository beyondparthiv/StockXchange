/**
 * Bot opponents.
 *
 * Bots play the game the way a player does: they read the signal cards, form
 * a view, and act on it. They do NOT see the true price move. That matters —
 * a bot with perfect information would be unbeatable and the signals would
 * stop being the shared language of the game.
 *
 * Strategy, deliberately simple and legible:
 *   1. Sum the round's signals per ticker to get a conviction score.
 *   2. Distort that score by the bot's `noise` — how badly it reads the
 *      table. A noisy bot sometimes buys the thing it should sell.
 *   3. Buy the best-scoring ticker it can afford, or sell a held ticker it
 *      now dislikes. Otherwise pass.
 *
 * Not a trading model and not trying to be. It exists so the leaderboard
 * moves and the activity feed has other people in it.
 */

import {
  maxAffordable,
  maxShortable,
  priceOf,
  sharesHeld,
  sharesShorted,
  type GameState,
  type Player,
  type TradeSide,
} from "@/lib/game/state";

export type BotOrder = {
  playerId: string;
  side: TradeSide;
  ticker: string;
  qty: number;
};

/** How much of its wallet a bot will commit to one order. */
const MAX_WALLET_FRACTION = 0.4;

/** Below this absolute conviction a bot sits the round out. */
const CONVICTION_FLOOR = 50; // 50 cents

/**
 * Per-bot personality, derived from its id so it is stable across rounds
 * without needing to be stored. `noise` is how much it misreads signals;
 * `appetite` scales position size.
 */
function personality(id: string) {
  // Two independent hashes. Deriving both traits from one value made every
  // bot land on similar numbers, and they all played the same move.
  const h1 = hash(`noise:${id}`);
  const h2 = hash(`appetite:${id}`);
  return {
    noise: 0.35 + ((h1 % 80) / 100), // 0.35 – 1.15
    appetite: 0.3 + ((h2 % 70) / 100), // 0.30 – 1.00
  };
}

function hash(seed: string): number {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Deterministic jitter in [-1, 1], varied per bot, round and ticker. */
function jitter(seed: string): number {
  return (hash(seed) % 2000) / 1000 - 1;
}

/**
 * One bot's move for this round, or null to pass.
 *
 * Returns an intent, not a mutation — the caller applies it through the same
 * order path a human uses, so bots cannot bypass affordability or ownership
 * checks.
 */
export function botOrder(state: GameState, bot: Player): BotOrder | null {
  const { noise, appetite } = personality(bot.id);

  // 1. Conviction per ticker from the signal cards, distorted by noise.
  const scores = new Map<string, number>();
  for (const s of state.signals) {
    const base = scores.get(s.ticker) ?? 0;
    const wobble =
      1 + noise * jitter(`${bot.id}|${state.day}|${state.round}|${s.id}`);
    scores.set(s.ticker, base + s.delta * wobble);
  }

  /*
   * Per-ticker bias on top of the per-signal wobble.
   *
   * Without this every bot computed nearly the same ranking and they all
   * played the identical move — three opponents buying 5 AMZN in a row reads
   * as one bot copy-pasted. The bias is scaled to the size of the biggest
   * conviction on the board, so it can actually flip a ranking rather than
   * nudging it, and it is seeded per bot/round/ticker so a bot's view is
   * stable within a round.
   */
  const magnitudes = [...scores.values()].map(Math.abs);
  const scale = magnitudes.length ? Math.max(...magnitudes) : 0;
  for (const [ticker, score] of scores) {
    const bias =
      noise * 0.7 * scale * jitter(`${bot.id}|bias|${state.day}|${state.round}|${ticker}`);
    scores.set(ticker, score + bias);
  }

  const tradable = state.quotes.filter((q) => !q.frozen);
  if (tradable.length === 0) return null;

  let best: { ticker: string; score: number } | null = null;
  let worst: { ticker: string; score: number } | null = null;
  for (const q of tradable) {
    const score = scores.get(q.ticker) ?? 0;
    if (!best || score > best.score) best = { ticker: q.ticker, score };
    if (!worst || score < worst.score) worst = { ticker: q.ticker, score };
  }
  if (!best || !worst) return null;

  // 2. Cover first. A bot sitting on a short of something it now likes
  //    should buy it back before doing anything else — leaving the short
  //    open while buying elsewhere is how a bot bleeds out.
  const shortOnBest = sharesShorted(bot, best.ticker);
  if (best.score > CONVICTION_FLOOR && shortOnBest > 0) {
    const qty = Math.min(
      shortOnBest,
      Math.max(1, maxAffordable(state, bot, best.ticker)),
    );
    if (qty >= 1) {
      return { playerId: bot.id, side: "buy", ticker: best.ticker, qty };
    }
  }

  // 3. Sell a long it has turned against.
  if (worst.score < -CONVICTION_FLOOR) {
    const held = sharesHeld(bot, worst.ticker);
    if (held > 0) {
      const qty = Math.max(1, Math.round(held * appetite));
      return { playerId: bot.id, side: "sell", ticker: worst.ticker, qty };
    }

    /*
     * 4. Short it if the conviction is strong enough.
     *
     * A higher bar than buying: a short's downside is unbounded, so a bot
     * that shorts on the same flimsy signal it would buy on will blow up.
     * Bolder bots (high appetite) reach for it sooner.
     */
    const shortBar = CONVICTION_FLOOR * (3 - appetite);
    if (held === 0 && worst.score < -shortBar) {
      const price = priceOf(state, worst.ticker);
      const room = maxShortable(state, bot, worst.ticker);
      if (price > 0 && room >= 1) {
        const budget = bot.cash * MAX_WALLET_FRACTION * appetite * 0.6;
        const qty = Math.min(room, Math.max(1, Math.floor(budget / price)));
        return { playerId: bot.id, side: "short", ticker: worst.ticker, qty };
      }
    }
  }

  // 5. Otherwise buy conviction, sized by wallet and appetite.
  if (best.score > CONVICTION_FLOOR) {
    const price = priceOf(state, best.ticker);
    if (price > 0) {
      // Size also wobbles per round, so a bot is not a fixed-lot machine.
      const sizing =
        appetite *
        (0.6 + 0.4 * (jitter(`${bot.id}|size|${state.day}|${state.round}`) + 1));
      const budget = bot.cash * MAX_WALLET_FRACTION * sizing;
      const affordable = maxAffordable(state, bot, best.ticker);
      const qty = Math.min(affordable, Math.max(1, Math.floor(budget / price)));
      if (qty >= 1) {
        return { playerId: bot.id, side: "buy", ticker: best.ticker, qty };
      }
    }
  }

  return null;
}

/** Every bot's move for this round, in seat order. */
export function botOrdersForRound(state: GameState): BotOrder[] {
  return state.players
    .filter((p) => p.isBot)
    .map((p) => botOrder(state, p))
    .filter((o): o is BotOrder => o !== null);
}
