"use client";

import { useState } from "react";
import { getCompany } from "@/lib/brand/companies";
import { CompanyLogo } from "@/components/brand/company-logo";
import {
  canTrade,
  directionClass,
  formatMoney,
  formatPercent,
  maxAffordable,
  maxShortable,
  me,
  sharesShorted,
  moveOf,
  priceOf,
  sharesHeld,
  type GameState,
  type TradeSide,
} from "@/lib/game/state";

/**
 * Order panel.
 *
 * The brief called out that the selected stock was previously ambiguous, so
 * the identity block is the first thing in the panel and is never empty: logo,
 * ticker, company name, live price and move. Changing the selection re-renders
 * the whole panel, and the quantity resets to 1 — carrying a quantity sized
 * for a $60 stock over to a $100 one is how you fat-finger an order.
 */
export function OrderPanel({
  state,
  ticker,
  onSubmit,
  onPass,
  doubleTrade = false,
}: {
  state: GameState;
  ticker: string;
  onSubmit: (side: TradeSide, ticker: string, qty: number) => void;
  onPass: () => void;
  /** Double Trade card armed: the affordable cap is doubled for one order. */
  doubleTrade?: boolean;
}) {
  // Quantity resets per instrument because the parent remounts this panel on
  // ticker change (key={ticker}). Carrying a size chosen for a $60 stock over
  // to a $100 one is how you fat-finger an order.
  const [qty, setQty] = useState(1);

  const player = me(state);
  const company = getCompany(ticker);
  const quote = state.quotes.find((q) => q.ticker === ticker);
  const price = priceOf(state, ticker);
  const move = quote ? moveOf(quote) : null;

  const baseMax = maxAffordable(state, player, ticker);
  const maxBuy = doubleTrade ? baseMax * 2 : baseMax;
  const held = sharesHeld(player, ticker);
  const shorted = sharesShorted(player, ticker);
  const maxShort = maxShortable(state, player, ticker);
  const frozen = quote?.frozen ?? false;
  const acted = player.actedThisRound;
  const tradingOpen = canTrade(state.phase) && !frozen && !acted;

  const total = qty * price;
  const canBuy = tradingOpen && qty > 0 && qty <= maxBuy;
  const canSell = tradingOpen && qty > 0 && qty <= Math.max(0, held);
  const canShort = tradingOpen && qty > 0 && qty <= maxShort;

  const step = (d: number) => setQty((q) => Math.max(1, q + d));

  return (
    <section className="shrink-0 rounded-lg border border-line bg-surface shadow-panel">
      {/* Identity — always present, always obvious. */}
      <div className="border-b border-line p-3">
        <div className="flex items-center gap-2.5">
          {company && <CompanyLogo company={company} size={24} />}
          <div className="min-w-0">
            <div className="t-ticker text-sm text-ink">{ticker}</div>
            <div className="truncate text-[0.6875rem] text-ink-faint">
              {company?.name ?? ticker}
            </div>
          </div>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="t-figure text-ink">{formatMoney(price)}</span>
          {move && (
            <span className={`t-value ${directionClass(move.direction)}`}>
              {formatPercent(move.percent)}
            </span>
          )}
          {/* Max and held ride the price line rather than taking their own
              row — the rail has a hard height budget on a 1366x768 screen. */}
          <span className="ml-auto text-right text-[0.625rem] leading-tight text-ink-faint">
            <span className="block">
              Max{" "}
              <span className={`font-mono ${doubleTrade ? "text-accent" : "text-ink-soft"}`}>
                {maxBuy}
              </span>
              {doubleTrade && <span className="ml-0.5 text-accent">2×</span>}
            </span>
            <span className="block">
              {shorted > 0 ? (
                <>
                  Short <span className="font-mono text-down">{shorted}</span>
                </>
              ) : (
                <>
                  Held <span className="font-mono text-ink-soft">{held}</span>
                </>
              )}
            </span>
          </span>
        </div>
      </div>

      <div className="p-3">
        <div className="flex items-center justify-between">
          <span className="t-label">Quantity</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => step(-1)}
              disabled={qty <= 1}
              aria-label="Decrease quantity"
              className="interactive h-7 w-7 rounded-md border border-line-strong text-ink-soft hover:text-ink disabled:opacity-35"
            >
              −
            </button>
            <span className="t-value w-12 text-center text-sm text-ink">
              {qty}
            </span>
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="Increase quantity"
              className="interactive h-7 w-7 rounded-md border border-line-strong text-ink-soft hover:text-ink"
            >
              +
            </button>
          </div>
        </div>

        <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2.5">
          <span className="t-label">Estimated total</span>
          <span className="t-value text-sm text-ink">{formatMoney(total)}</span>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={!canSell}
            onClick={() => onSubmit("sell", ticker, qty)}
            className="interactive rounded-md border border-down/40 py-2 text-sm font-semibold text-down hover:bg-down/10 disabled:cursor-not-allowed disabled:opacity-35"
          >
            {shorted > 0 ? "Sell" : "Sell"}
          </button>
          <button
            type="button"
            disabled={!canBuy}
            onClick={() => onSubmit("buy", ticker, qty)}
            className="cta rounded-md bg-up py-2 text-sm font-semibold text-white hover:bg-up-bright disabled:cursor-not-allowed disabled:opacity-35"
          >
            {/* Buying while short is covering, and saying so avoids the
                player thinking they are opening a long by mistake. */}
            {shorted > 0 ? "Cover" : "Buy"}
          </button>
        </div>

        <button
          type="button"
          disabled={!canShort}
          onClick={() => onSubmit("short", ticker, qty)}
          title={`Sell ${ticker} you do not own — you are paid now and owe the shares back. Profit if the price falls.`}
          className="interactive mt-2 w-full rounded-md border border-down/50 bg-down/8 py-2 text-sm font-semibold text-down hover:bg-down/15 disabled:cursor-not-allowed disabled:opacity-35"
        >
          Short sell
          <span className="ml-1.5 font-mono text-[0.625rem] font-normal opacity-70">
            max {maxShort}
          </span>
        </button>

        <button
          type="button"
          onClick={onPass}
          disabled={!canTrade(state.phase) || acted}
          className="interactive mt-1.5 w-full rounded-md border border-line-strong py-1.5 text-xs font-medium text-ink-soft hover:bg-surface-2 hover:text-ink disabled:opacity-35"
        >
          Pass this round
        </button>

        {/* Say why the buttons are off — a dead control with no reason is
            indistinguishable from a broken one. */}
        {(frozen || acted || !canTrade(state.phase)) && (
          <p className="mt-2 text-center text-[0.6875rem] text-ink-faint">
            {frozen
              ? `Trading is frozen on ${ticker} this round.`
              : acted
                ? "You have used your action this round."
                : state.phase === "pre-round"
                  ? "Cards window — trading opens shortly."
                  : state.phase === "special-round"
                    ? "Special round — cards only."
                    : "Trading is closed."}
          </p>
        )}
      </div>
    </section>
  );
}
