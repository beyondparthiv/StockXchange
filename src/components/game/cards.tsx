"use client";

import { useState } from "react";
import { getCompany } from "@/lib/brand/companies";
import { CompanyLogo } from "@/components/brand/company-logo";
import { formatSigned, type MarketSignal, type SpecialCard } from "@/lib/game/state";
import { playableNow, specialInfo } from "@/lib/game/specials";

/**
 * The card grid: ten tiles, 5 columns x 2 rows, filling the centre column.
 *
 * Eight market signals occupy columns 1-4; the two special cards take
 * column 5. Ten larger tiles read better than twelve cramped ones, and the
 * grid stretches to use the height the market tiles leave behind.
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
      className={`flex min-h-0 flex-col justify-center gap-2 rounded-md border p-3 ${tone}`}
    >
      <div className="flex items-center gap-1.5">
        {company && <CompanyLogo company={company} size={18} />}
        <span className="t-ticker text-xs text-ink">{signal.ticker}</span>
      </div>

      <div
        className={`font-mono text-xl font-semibold tabular-nums ${
          up ? "text-up" : signal.delta < 0 ? "text-down" : "text-ink-faint"
        }`}
      >
        {formatSigned(signal.delta)}
      </div>

    </div>
  );
}

function SpecialCardTile({
  card,
  onPlay,
  phase,
}: {
  card: SpecialCard;
  onPlay: (id: string) => void;
  phase: string;
}) {
  const info = specialInfo(card.key);
  const open = playableNow(card.key, phase);
  const [showInfo, setShowInfo] = useState(false);

  const windowLabel =
    info.window === "pre"
      ? "Playable in the cards window before a round"
      : info.window === "post"
        ? "Playable in the special round, after closing prices"
        : "Playable in either card window";

  return (
    <div className="relative flex min-h-0 flex-1">
      <button
        type="button"
        disabled={card.used || !open}
        onClick={() => onPlay(card.id)}
        className={`interactive flex w-full flex-1 flex-col justify-between rounded-md border border-dashed p-3 text-left ${
          card.used
            ? "border-line bg-surface-2 opacity-50"
            : open
              ? "border-accent/50 bg-accent-soft hover:border-accent"
              : "border-line bg-surface-2 opacity-60"
        }`}
      >
        <div className="text-[0.5625rem] font-semibold uppercase tracking-wider text-accent">
          Special
        </div>
        <div className="mt-1.5 pr-5 text-xs font-semibold leading-tight text-ink">
          {card.name}
        </div>
        <div className="mt-1.5 text-[0.5625rem] font-medium uppercase tracking-wider text-ink-faint">
          {card.used
            ? "Used"
            : open
              ? "Tap to play"
              : info.window === "pre"
                ? "Pre-round"
                : "Special round"}
        </div>
      </button>

      {/*
        The explanation used to live only in a title attribute, which nobody
        discovers and which never appears on touch. A visible control is the
        difference between a card you understand and one you are guessing at.

        Deliberately a sibling of the play button, not a child: a button
        inside a button is invalid HTML, and clicking the info must never
        spend the card.
      */}
      <button
        type="button"
        aria-label={`What does ${card.name} do?`}
        aria-expanded={showInfo}
        onClick={(e) => {
          e.stopPropagation();
          setShowInfo((v) => !v);
        }}
        className="interactive absolute right-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full border border-ink-faint/40 text-[0.5625rem] font-bold text-ink-faint hover:border-accent hover:text-accent"
      >
        i
      </button>

      {showInfo && (
        <>
          {/* Click-away. Transparent, full-screen, below the popover. */}
          <button
            type="button"
            aria-label="Close"
            onClick={() => setShowInfo(false)}
            className="fixed inset-0 z-30 cursor-default"
          />
          <div
            role="tooltip"
            className="animate-rise-in absolute bottom-full right-0 z-40 mb-1.5 w-60 rounded-md border border-line bg-surface p-3 shadow-lift"
          >
            <div className="text-xs font-semibold text-ink">{card.name}</div>
            <p className="mt-1 text-[0.6875rem] leading-snug text-ink-soft">
              {card.effect}
            </p>
            <p className="mt-1.5 border-t border-line pt-1.5 text-[0.625rem] leading-snug text-ink-faint">
              {windowLabel}.
            </p>
            {!info.implemented && info.blockedBy && (
              <p className="mt-1 text-[0.625rem] text-warn">
                Unavailable: {info.blockedBy}.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export function CardGrid({
  signals,
  specials,
  onPlaySpecial,
  phase,
}: {
  signals: MarketSignal[];
  specials: SpecialCard[];
  onPlaySpecial: (id: string) => void;
  phase: string;
}) {
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      {/*
        The explainer that used to sit here permanently is now the section
        title's tooltip. It is read once and then it is clutter.
      */}
      <h2
        className="t-section mb-2"
        title="Signals are information, not actions — read them and decide whether to buy, sell or pass"
      >
        Intelligence
      </h2>

      <div className="grid min-h-0 flex-1 grid-cols-5 gap-2">
        {/* Columns 1-4: eight signals across two rows. */}
        <div className="col-span-4 grid min-h-0 grid-cols-4 grid-rows-2 gap-2">
          {signals.slice(0, 8).map((s) => (
            <SignalCard key={s.id} signal={s} />
          ))}
        </div>

        {/* Column 5: the two specials, matching the two signal rows. */}
        <div className="col-span-1 flex min-h-0 flex-col gap-2">
          {specials.slice(0, 2).map((c) => (
            <SpecialCardTile key={c.id} card={c} onPlay={onPlaySpecial} phase={phase} />
          ))}
        </div>
      </div>
    </section>
  );
}
