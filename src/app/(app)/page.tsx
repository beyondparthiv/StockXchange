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
      <div className="mb-10">
        <h1 className="text-3xl font-bold tracking-tight">Choose a mode</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Pick how you want to play, then configure your game.
        </p>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {GAME_MODES.map((mode) => {
          const meta = MODE_META[mode];
          return (
            <Link
              key={mode}
              href={`/play/${mode}`}
              className="group flex flex-col rounded-2xl border border-white/10 bg-white/[0.03] p-6 transition hover:border-emerald-400/40 hover:bg-white/[0.06]"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
                  <ModeIcon mode={mode} />
                </span>
                <span className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                  {meta.tagline}
                </span>
              </div>

              <h2 className="mt-4 text-lg font-semibold text-zinc-100">
                {meta.label}
              </h2>
              <p className="mt-1 flex-1 text-sm leading-relaxed text-zinc-400">
                {meta.description}
              </p>

              <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-emerald-400 group-hover:text-emerald-300">
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

      <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.02] p-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h3 className="text-base font-semibold text-zinc-100">
              New to StockXchange?
            </h3>
            <p className="mt-1 text-sm text-zinc-400">
              Learn the rules, order types, and both card systems.
            </p>
          </div>
          <Link
            href="/how-to-play"
            className="shrink-0 rounded-lg border border-white/15 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-white/5"
          >
            How to Play
          </Link>
        </div>
      </div>
    </main>
  );
}
