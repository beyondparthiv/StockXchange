/**
 * Order application.
 *
 * One path for every order, human or bot. Bots go through this same function
 * rather than mutating state directly, so they are bound by the same
 * affordability and ownership rules a player is — a bot cannot spend money
 * it does not have or sell shares it never bought.
 *
 * This is NOT settlement. It moves cash and shares at the current price;
 * prices themselves are decided by the engine at round end.
 */

import {
  canTrade,
  maxAffordable,
  priceOf,
  sharesHeld,
  type Activity,
  type GameState,
  type TradeSide,
} from "@/lib/game/state";

export type OrderResult = {
  state: GameState;
  /** The activity row, or null when the order was rejected. */
  filled: Activity | null;
  rejected?: string;
};

export function applyOrder(
  state: GameState,
  playerId: string,
  side: TradeSide,
  ticker: string,
  qty: number,
): OrderResult {
  const player = state.players.find((p) => p.id === playerId);
  const quote = state.quotes.find((q) => q.ticker === ticker);

  if (!player || !quote) return { state, filled: null, rejected: "Unknown player or ticker" };
  if (qty < 1) return { state, filled: null, rejected: "Quantity must be at least 1" };
  if (quote.frozen) return { state, filled: null, rejected: `${ticker} is frozen` };
  if (!canTrade(state.phase)) {
    return { state, filled: null, rejected: "Trading is closed" };
  }
  // One action per round — an order or a pass. A round is meant to be a
  // decision, not a shopping trip, so the second order is refused rather
  // than silently queued.
  if (player.actedThisRound) {
    return { state, filled: null, rejected: "You have already acted this round" };
  }

  const price = priceOf(state, ticker);
  const cost = price * qty;

  if (side === "buy" && qty > maxAffordable(state, player, ticker)) {
    return { state, filled: null, rejected: "Not enough cash" };
  }
  if (side === "sell" && qty > sharesHeld(player, ticker)) {
    return { state, filled: null, rejected: "Not enough shares" };
  }

  const players = state.players.map((p) => {
    if (p.id !== playerId) return p;
    const existing = p.holdings.find((h) => h.ticker === ticker);

    if (side === "buy") {
      const shares = (existing?.shares ?? 0) + qty;
      // Weighted average so P&L reflects what was actually paid across fills.
      const avgCost = existing
        ? Math.round((existing.avgCost * existing.shares + cost) / shares)
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
      // Average cost is left alone on a sell: selling does not change what
      // the remaining shares cost you.
      holdings: p.holdings
        .map((h) => (h.ticker === ticker ? { ...h, shares } : h))
        .filter((h) => h.shares > 0),
    };
  });

  const filled: Activity = {
    id: `o-${state.day}-${state.round}-${playerId}-${Date.now()}`,
    playerId,
    playerName: player.displayName,
    side,
    ticker,
    shares: qty,
    price,
    day: state.day,
    round: state.round,
    at: new Date().toISOString(),
  };

  return {
    state: { ...state, players, activity: [filled, ...state.activity] },
    filled,
  };
}
