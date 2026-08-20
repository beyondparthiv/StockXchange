import Link from "next/link";
import { MARKET_EVENT_CARDS, PLAYER_SPECIAL_CARDS } from "@/lib/game/cards";

export const metadata = { title: "How to Play · StockXchange" };

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mt-10">
      <h2 className="t-title text-ink">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-ink-soft">
        {children}
      </div>
    </section>
  );
}

function CardTable({
  cards,
  accent,
}: {
  cards: { key: string; name: string; effect: string }[];
  accent: string;
}) {
  return (
    <div className="mt-3 overflow-hidden rounded-md border border-line bg-surface">
      {cards.map((card, i) => (
        <div
          key={card.key}
          className={`grid grid-cols-1 gap-1 px-4 py-3 sm:grid-cols-[180px_1fr] sm:gap-4 ${
            i % 2 ? "bg-surface-2" : ""
          }`}
        >
          <div className={`text-[0.8125rem] font-semibold ${accent}`}>
            {card.name}
          </div>
          <div className="text-sm leading-relaxed text-ink-soft">
            {card.effect}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function HowToPlayPage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12">
      <div className="mb-2">
        <Link
          href="/"
          className="text-sm text-ink-soft transition hover:text-ink"
        >
          ← Tables
        </Link>
      </div>
      <h1 className="t-display text-ink">
        How to Play
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        Buy low, sell high, read the news, and finish with the most money.
      </p>

      <Section title="Objective">
        <p>
          Everyone starts with the same cash. Trade companies across the game to
          grow your <strong className="text-ink">net worth</strong> (cash + the
          value of what you hold). The player with the highest net worth after
          the final round wins.
        </p>
      </Section>

      <Section title="How a game flows">
        <p>
          A game runs over a set number of{" "}
          <strong className="text-ink">Days</strong> (10 by default). Each Day
          has <strong className="text-ink">2 Rounds</strong> of trading.
        </p>
        <ul className="list-disc space-y-1 pl-5 marker:text-accent">
          <li>
            <strong className="text-ink">Start of Day</strong>:{" "}
            a fresh batch of news appears, hinting at price moves. Some hints are
            true, some are decoys — you won&apos;t be told which.
          </li>
          <li>
            <strong className="text-ink">Round 1</strong>:{" "}
            place your orders. About half of the day&apos;s price movement
            settles at round end.
          </li>
          <li>
            <strong className="text-ink">Round 2</strong>:{" "}
            trade again with updated prices. The rest of the movement resolves —
            now it&apos;s clear which news was real.
          </li>
          <li>
            A <strong className="text-ink">round timer</strong> counts down each
            round; orders auto-lock when it hits zero.
          </li>
        </ul>
      </Section>

      <Section title="Order types">
        <ul className="space-y-2">
          <li>
            <span className="font-bold text-up">Buy</span> — spend
            cash to add shares to your holdings.
          </li>
          <li>
            <span className="font-bold text-down">Sell</span> — sell
            shares you own back for cash.
          </li>
          <li>
            <span className="font-bold text-down">Short Sell</span> —
            borrow and sell shares you don&apos;t own, betting the price falls.
            Profit if it drops before you cover; you must cover before the game
            ends.
          </li>
          <li>
            <span className="font-bold text-ink">Pass</span> — do nothing this
            round.
          </li>
        </ul>
        <p className="text-xs text-ink-soft">
          Color means the same thing everywhere: green is buying, red is
          selling/shorting, dark is passing.
        </p>
      </Section>

      <Section title="Two kinds of cards">
        <p>
          The game has two separate card systems. Keep them straight — one hits
          everyone, the other is yours alone.
        </p>
      </Section>

      <div className="mt-6">
        <h3 className="t-title text-accent">
          Market Event Cards
        </h3>
        <p className="mt-1 text-sm text-ink-soft">
          Shared events triggered by the market that affect the whole table.
          Shown alongside the daily news.
        </p>
        <CardTable cards={MARKET_EVENT_CARDS} accent="text-accent" />
      </div>

      <div className="mt-8">
        <h3 className="t-title text-ink">
          Player Special Cards
        </h3>
        <p className="mt-1 text-sm text-ink-soft">
          Private cards only you can see and play. You hold{" "}
          <strong className="text-ink">one at a time</strong>; if unused, it
          expires and refreshes every 2 Days (every 4 rounds), so everyone
          refreshes on the same schedule.
        </p>
        <CardTable cards={PLAYER_SPECIAL_CARDS} accent="text-ink" />
      </div>

      <Section title="Winning">
        <p>
          After the final round, any open short positions are auto-settled at the
          final prices, then net worth is totaled. Highest net worth wins. Time
          your buys, sells, and cards well — and don&apos;t trust every headline.
        </p>
      </Section>

      <div className="mt-12 flex justify-center">
        <Link
          href="/"
          className="rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-accent-hover"
        >
          Back to tables
        </Link>
      </div>
    </main>
  );
}
