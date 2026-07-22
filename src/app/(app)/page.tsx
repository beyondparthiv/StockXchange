import Link from "next/link";
import { GAME_MODES, MODE_META, type GameMode } from "@/lib/game/config";

export const metadata = { title: "Play · StockXchange" };

/** Small inline icons per mode — keeps the cards visual without an icon lib. */
function ModeIcon({ mode }: { mode: GameMode }) {
  const common = "h-6 w-6";
  if (mode === "online") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.6" />
        <path
          d="M3 12h18M12 3c2.5 2.4 2.5 15.6 0 18M12 3c-2.5 2.4-2.5 15.6 0 18"
          stroke="currentColor"
          strokeWidth="1.6"
        />
      </svg>
    );
  }
  if (mode === "bots") {
    return (
      <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <rect
          x="4"
          y="7"
          width="16"
          height="12"
          rx="3"
          stroke="currentColor"
          strokeWidth="1.6"
        />
        <path d="M12 4v3" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="9" cy="13" r="1.4" fill="currentColor" />
        <circle cx="15" cy="13" r="1.4" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg className={common} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-12">
      <div className="mb-10 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-gold">
          The Trading Floor Awaits
        </p>
        <h1 className="font-display mt-2 text-4xl font-semibold tracking-tight text-ink">
          Choose your table
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          Pick how you want to play, then set up your game.
        </p>
        <div className="rule-ornament mx-auto mt-6 max-w-xs">
          <span className="text-gold">◆</span>
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {GAME_MODES.map((mode) => {
          const meta = MODE_META[mode];
          return (
            <Link
              key={mode}
              href={`/play/${mode}`}
              className="group flex flex-col rounded-2xl border border-gold/40 bg-cream p-6 shadow-[0_12px_30px_-18px_rgba(120,90,30,0.5)] transition hover:-translate-y-1 hover:border-gold hover:shadow-[0_18px_36px_-16px_rgba(120,90,30,0.55)]"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold/40 bg-gold/15 text-gold">
                  <ModeIcon mode={mode} />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-ink-soft">
                  {meta.tagline}
                </span>
              </div>

              <h2 className="font-display mt-4 text-xl font-semibold text-ink">
                {meta.label}
              </h2>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-ink-soft">
                {meta.description}
              </p>

              <span className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-gold group-hover:text-gold-bright">
                Configure
                <svg
                  className="h-4 w-4 transition group-hover:translate-x-0.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M5 12h14M13 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </Link>
          );
        })}
      </div>

      <div className="mt-10 rounded-2xl border border-gold/40 bg-cream-soft p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="font-display text-lg font-semibold text-ink">
              New to StockXchange?
            </h3>
            <p className="mt-1 text-sm text-ink-soft">
              Learn the rules, order types, and both card systems.
            </p>
          </div>
          <Link
            href="/how-to-play"
            className="shrink-0 rounded-lg border border-ink/20 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-cream"
          >
            How to Play
          </Link>
        </div>
      </div>
    </main>
  );
}
