"use client";

import { getCompany } from "@/lib/brand/companies";
import { CompanyLogo } from "@/components/brand/company-logo";
import { formatSigned, type MarketSignal, type SpecialCard } from "@/lib/game/state";

/**
 * The card grid: six columns. Columns 1–5 hold ten market signals in two rows;
 * column 6 holds the two special cards.
 *
 * The distinction between the two is the whole point of this screen and the
 * easiest thing to get wrong:
 *
 *   MARKET SIGNAL — information. A hint about what a company may do. The
 *   player reads it and decides to buy, sell, or pass. It is NOT playable, so
 *   it is rendered as a static div with no button, no hover affordance, and no
 *   "use" control. Adding one would misrepresent the mechanic.
 *
 *   SPECIAL — an action the owner can take. A real button, visually distinct.
 *
 * Trade activity never appears here; it belongs in notifications and history.
 */

function SignalCard({ signal }: { signal: MarketSignal }) {
  const company = getCompany(signal.ticker);
  const up = signal.delta > 0;
  const tone = up
    ? "border-up/30 bg-up/[0.06]"
    : signal.delta < 0
      ? "border-down/30 bg-down/[0.06]"
      : "border-line bg-surface";

  return (
    <div
      className={`flex flex-col justify-between rounded-md border p-2.5 ${tone}`}
    >
      <div className="flex items-center gap-1.5">
        {company && <CompanyLogo company={company} size={16} />}
        <span className="t-ticker text-[0.6875rem] text-ink">
          {signal.ticker}
        </span>
      </div>

      <div
        className={`mt-2 font-mono text-base font-semibold tabular-nums ${
          up ? "text-up" : signal.delta < 0 ? "text-down" : "text-ink-faint"
        }`}
      >
        {formatSigned(signal.delta)}
      </div>

      <div className="mt-1.5 text-[0.5625rem] font-semibold uppercase tracking-wider text-ink-faint">
        Market signal
      </div>
    </div>
  );
}

function SpecialCardTile({
  card,
  onPlay,
}: {
  card: SpecialCard;
  onPlay: (id: string) => void;
}) {
  return (
    <button
      type="button"
      disabled={card.used}
      onClick={() => onPlay(card.id)}
      title={card.effect}
      className={`interactive flex w-full flex-1 flex-col justify-between rounded-md border border-dashed p-2.5 text-left ${
        card.used
          ? "border-line bg-surface-2 opacity-50"
          : "border-accent/50 bg-accent-soft hover:border-accent"
      }`}
    >
      <div className="text-[0.5625rem] font-semibold uppercase tracking-wider text-accent">
        Special
      </div>
      <div className="mt-1.5 text-[0.6875rem] font-semibold leading-tight text-ink">
        {card.name}
      </div>
      <div className="mt-1.5 text-[0.5625rem] font-medium uppercase tracking-wider text-ink-faint">
        {card.used ? "Used" : "Tap to play"}
      </div>
    </button>
  );
}

export function CardGrid({
  signals,
  specials,
  onPlaySpecial,
}: {
  signals: MarketSignal[];
  specials: SpecialCard[];
  onPlaySpecial: (id: string) => void;
}) {
  return (
    <section>
      <div className="mb-2.5 flex items-baseline justify-between">
        <h2 className="t-section">Intelligence</h2>
        <span className="text-[0.625rem] text-ink-faint">
          Signals are information — you decide what to do with them
        </span>
      </div>

      <div className="grid grid-cols-6 gap-2">
        {/* Columns 1–5: ten signals, two rows. */}
        <div className="col-span-5 grid grid-cols-5 grid-rows-2 gap-2">
          {signals.slice(0, 10).map((s) => (
            <SignalCard key={s.id} signal={s} />
          ))}
        </div>

        {/* Column 6: the two playable specials, same total height. */}
        <div className="col-span-1 flex flex-col gap-2">
          {specials.slice(0, 2).map((c) => (
            <SpecialCardTile key={c.id} card={c} onPlay={onPlaySpecial} />
          ))}
        </div>
      </div>
    </section>
  );
}
