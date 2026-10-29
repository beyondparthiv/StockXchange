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
  maxShortable,
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
  /**
   * Double Trade: this one order may go up to 2× the affordable size, with
   * the shortfall borrowed.
   *
   * The multiplier has to reach this far because the cap and the fill are
   * decided here. The order panel was doubling its own displayed cap while
   * this function kept the ordinary one, so the card enabled a Buy button
   * on an order that was then rejected — and the card never did anything.
   */
  opts: { buyMultiplier?: number } = {},
): OrderResult {
  const buyMultiplier = Math.max(1, opts.buyMultiplier ?? 1);
  const player = state.players.find((p) => p.id === playerId);
  const quote = state.quotes.find((q) => q.ticker === ticker);

  if (!player || !quote) return { state, filled: null, rejected: "Unknown player or ticker" };
  if (qty < 1) return { state, filled: null, rejected: "Quantity must be at least 1" };
  if (quote.frozen) return { state, filled: null, rejected: `${ticker} is frozen` };
  if (!canTrade(state.phase)) {
    return { state, filled: null, rejected: "Trading is closed" };
  }
  /*
   * A round is a trading window, not a single action.
   *
   * It used to allow one order per player per round, which made the round
   * timer pointless: you spent the action in the first second and then
   * watched a dead panel until the clock ran out. Trade as often as you
   * like while the window is open — cash, holdings and collateral are the
   * real limits, and they are checked on every order below.
   */

  const price = priceOf(state, ticker);
  const cost = price * qty;

  const held = sharesHeld(player, ticker);

  if (side === "buy" && qty > maxAffordable(state, player, ticker) * buyMultiplier) {
    return { state, filled: null, rejected: "Not enough cash" };
  }
  // Sell closes a long only. Going past zero is a short, which is a
  // different decision with a different risk, so it needs the Short button.
  if (side === "sell" && qty > Math.max(0, held)) {
    return { state, filled: null, rejected: "Not enough shares" };
  }
  if (side === "short" && qty > maxShortable(state, player, ticker)) {
    return { state, filled: null, rejected: "Not enough collateral" };
  }

  /*
   * One signed share count covers long and short.
   *
   *   buy    +qty, cash out. Covers an open short first, then goes long.
   *   sell   -qty, cash in. Only down to flat (guarded above).
   *   short  -qty, cash IN — you are paid now for stock you will owe.
   *
   * Average cost is only recomputed when a position is being opened or
   * added to. Closing part of a position does not change what the rest of
   * it cost you, and recomputing there is the classic way to end up with a
   * P&L that drifts.
   */
  const players = state.players.map((p) => {
    if (p.id !== playerId) return p;
    const existing = p.holdings.find((h) => h.ticker === ticker);
    const before = existing?.shares ?? 0;
    const delta = side === "buy" ? qty : -qty;
    const after = before + delta;

    // Cash moves opposite to the share count in every case: buying costs,
    // selling and shorting both pay.
    const cashDelta = side === "buy" ? -cost : cost;

    // Growing a position (in whichever direction) re-averages; shrinking or
    // flipping does not.
    const growing = before === 0 || Math.sign(after) === Math.sign(before)
      ? Math.abs(after) > Math.abs(before)
      : false;

    let avgCost = existing?.avgCost ?? price;
    if (before === 0 || Math.sign(after) !== Math.sign(before)) {
      // Opened fresh, or flipped through zero: the new position starts here.
      avgCost = price;
    } else if (growing) {
      avgCost = Math.round(
        (Math.abs(before) * (existing?.avgCost ?? price) + qty * price) /
          Math.abs(after),
      );
    }

    const holdings = existing
      ? p.holdings
          .map((h) => (h.ticker === ticker ? { ...h, shares: after, avgCost } : h))
          .filter((h) => h.shares !== 0)
      : [...p.holdings, { ticker, shares: after, avgCost }];

    /*
     * Cash never goes negative. A Double Trade that spends past the balance
     * borrows the shortfall, the same debt the Quick Loan card creates, so
     * net worth (cash + holdings − debt) still tells the truth and the
     * wallet does not display a negative balance.
     */
    const cashAfter = p.cash + cashDelta;
    const shortfall = cashAfter < 0 ? -cashAfter : 0;

    return {
      ...p,
      cash: cashAfter + shortfall,
      debt: (p.debt ?? 0) + shortfall,
      actedThisRound: true,
      holdings,
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
