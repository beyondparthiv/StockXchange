"use client";

import { useEffect, useRef, useState } from "react";
import { getCompany } from "@/lib/brand/companies";
import { CompanyLogo, CompanyWatermark } from "@/components/brand/company-logo";
import {
  directionClass,
  formatMoney,
  formatPercent,
  moveOf,
  type Quote,
} from "@/lib/game/state";

/**
 * Market instrument tile. Reads as an exchange row, not a game card: logo,
 * ticker and name on top, the live price as the visual focus, and the
 * INIT / LAST / NOW history underneath.
 *
 * The company accent appears only as a hairline on the selected tile and as
 * the watermark — never as the fill, because green and red have to keep
 * meaning "up" and "down" here.
 */
export function StockTile({
  quote,
  selected,
  onSelect,
  tip,
}: {
  quote: Quote;
  selected: boolean;
  onSelect: (ticker: string) => void;
  /** Insider Tip's revealed direction for this ticker, if played on it. */
  tip?: "up" | "down" | "flat" | null;
}) {
  const company = getCompany(quote.ticker);
  const move = moveOf(quote);
  const tone = directionClass(move.direction);

  // Flash the tile in the direction a settled price moved. The previous value
  // is kept in a ref rather than state so comparing it cannot itself trigger a
  // render loop; the flash class is cleared on a timer.
  const price = quote.current;
  const prev = useRef(price);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    if (price === prev.current) return;
    const dir = price > prev.current ? "up" : "down";
    prev.current = price;
    setFlash(dir);
    const t = setTimeout(() => setFlash(null), 900);
    return () => clearTimeout(t);
  }, [price]);

  return (
    <button
      type="button"
      onClick={() => onSelect(quote.ticker)}
      aria-pressed={selected}
      className={`card-hover relative overflow-hidden rounded-lg border bg-surface p-4 text-left shadow-panel ${
        selected ? "border-accent" : "border-line"
      } ${flash === "up" ? "tile-flash-up" : flash === "down" ? "tile-flash-down" : ""}`}
      style={
        selected && company
          ? { boxShadow: `inset 0 0 0 1px ${company.accent}55` }
          : undefined
      }
    >
      {company && <CompanyWatermark company={company} />}

      <div className="relative flex items-center gap-2.5">
        {company && <CompanyLogo company={company} size={26} />}
        <div className="min-w-0">
          <div className="t-ticker text-ink">{quote.ticker}</div>
          <div className="truncate text-[0.6875rem] text-ink-faint">
            {company?.name ?? quote.ticker}
          </div>
        </div>
        {tip && (
          <span
            title="Insider Tip: true direction of the next move"
            className={`ml-auto rounded-sm px-1.5 py-0.5 text-[0.625rem] font-semibold ${
              tip === "up"
                ? "bg-up/15 text-up"
                : tip === "down"
                  ? "bg-down/15 text-down"
                  : "bg-ink/10 text-ink-faint"
            }`}
          >
            {tip === "up" ? "▲ TIP" : tip === "down" ? "▼ TIP" : "— TIP"}
          </span>
        )}
        {quote.frozen && (
          <span className="ml-auto rounded-sm bg-ink/10 px-1.5 py-0.5 text-[0.625rem] font-medium uppercase tracking-wider text-ink-faint">
            Frozen
          </span>
        )}
      </div>

      <div className="relative mt-3 flex items-baseline gap-2">
        <span
          key={quote.current}
          className={`t-figure text-ink ${
            flash === "up" ? "figure-up" : flash === "down" ? "figure-down" : ""
          }`}
        >
          {formatMoney(quote.current)}
        </span>
        <span className={`t-value ${tone}`}>{formatPercent(move.percent)}</span>
      </div>

      <dl className="relative mt-3 grid grid-cols-3 gap-1 border-t border-line pt-2.5">
        {(
          [
            ["Init", quote.initial],
            ["Last", quote.lastRound],
            ["Now", quote.current],
          ] as const
        ).map(([label, value], i) => (
          <div key={label}>
            <dt className="text-[0.5625rem] font-semibold uppercase tracking-wider text-ink-faint">
              {label}
            </dt>
            <dd
              className={`font-mono text-[0.6875rem] tabular-nums ${
                i === 2 ? "text-ink" : "text-ink-soft"
              }`}
            >
              {formatMoney(value)}
            </dd>
          </div>
        ))}
      </dl>
    </button>
  );
}

export function MarketGrid({
  quotes,
  selected,
  onSelect,
  tip,
}: {
  quotes: Quote[];
  selected: string;
  onSelect: (ticker: string) => void;
  tip?: { ticker: string; direction: string } | null;
}) {
  return (
    <section>
      <h2 className="t-section mb-2.5">Market</h2>
      <div className="stagger grid grid-cols-2 gap-3 lg:grid-cols-3">
        {quotes.map((q) => (
          <StockTile
            key={q.ticker}
            quote={q}
            selected={q.ticker === selected}
            onSelect={onSelect}
            tip={
              tip && tip.ticker === q.ticker
                ? (tip.direction as "up" | "down" | "flat")
                : null
            }
          />
        ))}
      </div>
    </section>
  );
}
