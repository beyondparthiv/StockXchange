/**
 * Canonical card reference for both card systems. Used by the How-to-Play
 * screen now and by the card engine/UI in Phase 7, so the rules text and the
 * implemented effects stay in sync from one source.
 *
 * Two deliberately distinct systems:
 *  - Market Event Cards: shared, affect the whole table, triggered by the engine.
 *  - Player Special Cards: private, one per player, played by the owner.
 */

export type CardInfo = {
  key: string;
  name: string;
  effect: string;
};

export const MARKET_EVENT_CARDS: CardInfo[] = [
  {
    key: "currency_devaluation",
    name: "Currency Devaluation",
    effect:
      "All share prices shift by a flat percentage (e.g. −10%) for the round — a market-wide macro shock.",
  },
  {
    key: "share_suspended",
    name: "Share Suspended",
    effect:
      "Trading is locked on one company for the round and its price is frozen — a trading halt.",
  },
  {
    key: "no_price_change",
    name: "No Price Change",
    effect:
      "Every company's price stays exactly the same this round — a quiet, breather round.",
  },
  {
    key: "circuit_breaker",
    name: "Circuit Breaker",
    effect:
      "If a company moves more than the threshold (e.g. 40%) in one round, trading on it auto-freezes next round.",
  },
  {
    key: "ipo",
    name: "IPO",
    effect:
      "A brand-new company joins the market mid-game at a fresh price — a late opportunity.",
  },
  {
    key: "loan_offer",
    name: "Loan Offer",
    effect:
      "Any player may borrow cash this round at a fixed interest rate, repaid with interest from final net worth.",
  },
  {
    key: "capital_gains_tax",
    name: "Capital Gains Tax",
    effect:
      "Around the halfway point, a flat percentage is deducted from each player's realized gains so far.",
  },
  {
    key: "dividend_payout",
    name: "Dividend Payout",
    effect:
      "Holders of a specified company receive a fixed cash amount per share, paid immediately.",
  },
  {
    key: "stock_split",
    name: "Stock Split",
    effect:
      "A company's shares double and price halves — net worth is unchanged, but the per-share entry price resets.",
  },
];

export const PLAYER_SPECIAL_CARDS: CardInfo[] = [
  {
    key: "insider_tip",
    name: "Insider Tip",
    effect:
      "Reveals the true direction (not magnitude) of one company's next move — to you only, before the round locks.",
  },
  {
    key: "price_shield",
    name: "Price Shield",
    effect:
      "Cancels the next Market Event Card's effect on your portfolio only — everyone else still takes the hit.",
  },
  {
    key: "double_trade",
    name: "Double Trade",
    effect: "Exceed the normal max order quantity by 2× for one order this round.",
  },
  {
    key: "margin_immunity",
    name: "Margin Immunity",
    effect: "Skip one Margin Call that would force-cover one of your short positions.",
  },
  {
    key: "quick_loan",
    name: "Quick Loan",
    effect:
      "Instantly borrow cash at a discounted rate, better than the standard Loan Offer card.",
  },
  {
    key: "tax_dodge",
    name: "Tax Dodge",
    effect: "Skip the next Capital Gains Tax deduction for you specifically.",
  },
  {
    key: "freeze_rival",
    name: "Freeze Rival",
    effect:
      "Freeze one chosen opponent's ability to trade next round (they can still Pass).",
  },
  {
    key: "rewind_trade",
    name: "Rewind Trade",
    effect: "Cancel your own last order this round before settlement — an undo for a misclick.",
  },
];
