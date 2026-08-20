import Link from "next/link";
import { GAME_MODES, MODE_META, type GameMode } from "@/lib/game/config";
import { JoinRoom } from "@/components/join-room";

export const metadata = { title: "Play · StockXchange" };

/** Small inline icons per mode — keeps the cards visual without an icon lib. */
function ModeIcon({ mode }: { mode: GameMode }) {
  const common = "h-5 w-5";
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
    <main className="mx-auto w-full max-w-6xl px-6 py-12">
      <div className="mb-8">
        <p className="t-section">New game</p>
        <h1 className="t-display mt-2 text-ink">Select a mode</h1>
        <p className="mt-1.5 text-sm text-ink-soft">
          Pick how you want to play, then configure the market.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {GAME_MODES.map((mode) => {
          const meta = MODE_META[mode];
          return (
            <Link
              key={mode}
              href={`/play/${mode}`}
              className="group flex flex-col rounded-lg border border-line bg-surface p-5 shadow-panel transition hover:border-line-strong"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-md bg-surface-2 text-ink-soft transition group-hover:text-accent">
                  <ModeIcon mode={mode} />
                </span>
                <span className="t-section">{meta.tagline}</span>
              </div>

              <h2 className="t-title mt-4 text-ink">{meta.label}</h2>
              <p className="mt-1.5 flex-1 text-sm leading-relaxed text-ink-soft">
                {meta.description}
              </p>

              <span className="mt-5 inline-flex items-center gap-1.5 text-[0.8125rem] font-medium text-accent">
                Configure
                <svg
                  className="h-4 w-4 transition"
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

      <div className="mt-4 divide-y divide-line rounded-lg border border-line bg-surface shadow-panel">
        <div className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-semibold text-ink">Have a room code?</h3>
            <p className="mt-1 text-[0.8125rem] text-ink-soft">
              Join a friend&apos;s game — no need to host.
            </p>
          </div>
          <JoinRoom />
        </div>

        <div className="flex flex-col items-start justify-between gap-4 p-5 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-sm font-semibold text-ink">
              New to StockXchange?
            </h3>
            <p className="mt-1 text-[0.8125rem] text-ink-soft">
              Learn the rules, order types, and both card systems.
            </p>
          </div>
          <Link
            href="/how-to-play"
            className="shrink-0 rounded-md border border-line-strong px-4 py-2 text-[0.8125rem] font-medium text-ink transition hover:bg-surface-2"
          >
            How to Play
          </Link>
        </div>
      </div>
    </main>
  );
}
