"use client";

import type { GameState, Phase } from "@/lib/game/state";

const PHASE_LABEL: Record<Phase, string> = {
  dealing: "Dealing",
  "pre-round": "Cards open",
  trading: "Trading open",
  settling: "Settling",
  "round-complete": "Round complete",
  "day-prices": "Closing prices",
  "special-round": "Special round",
  "day-complete": "Day complete",
  finished: "Game over",
};

/** Phases where the clock is counting down something the player can act in. */
const LIVE_PHASES: Phase[] = ["pre-round", "trading", "special-round"];

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[0.5625rem] font-semibold uppercase tracking-wider text-white/40">
        {label}
      </span>
      <span className="font-mono text-[0.8125rem] tabular-nums text-white">
        {value}
      </span>
    </div>
  );
}

/**
 * Game control bar. Sits under the app header and carries the state a player
 * checks constantly: where they are in the game, how long is left, and what
 * the game is currently doing.
 */
export function GameHeader({
  state,
  onOpenHistory,
  activityCount = 0,
}: {
  state: GameState;
  onOpenHistory?: () => void;
  activityCount?: number;
}) {
  const totalRounds = state.config.days * state.roundsPerDay;
  const roundsDone = (state.day - 1) * state.roundsPerDay + state.round;
  const progress = Math.min(100, (roundsDone / totalRounds) * 100);

  const open = LIVE_PHASES.includes(state.phase);
  const secs = state.secondsLeft;
  const urgent = open && secs !== null && secs <= 15;

  return (
    <div className="sticky top-14 z-10 border-b border-white/8 bg-chrome">
      <div className="mx-auto flex max-w-[1800px] items-center gap-6 px-6 py-2.5">
        <Stat label="Day" value={`${state.day} / ${state.config.days}`} />
        <Stat label="Round" value={`${state.round} / ${state.roundsPerDay}`} />

        <div className="flex items-center gap-2">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              open ? "animate-pulse bg-up" : "bg-white/30"
            }`}
          />
          <span className="text-[0.8125rem] font-medium text-white/85">
            {PHASE_LABEL[state.phase]}
          </span>
        </div>

        {secs !== null && (
          <div
            className={`font-mono text-lg font-semibold tabular-nums ${
              urgent ? "text-down" : "text-white"
            }`}
          >
            {String(Math.floor(secs / 60)).padStart(2, "0")}:
            {String(secs % 60).padStart(2, "0")}
          </div>
        )}

        {onOpenHistory && (
          <button
            type="button"
            onClick={onOpenHistory}
            className="interactive ml-auto flex items-center gap-1.5 rounded-md border border-white/18 px-2.5 py-1 text-[0.6875rem] font-medium text-white/75 hover:border-white/30 hover:bg-white/5 hover:text-white"
          >
            History
            {activityCount > 0 && (
              <span className="rounded-[3px] bg-white/15 px-1 font-mono text-[0.5625rem] text-white">
                {activityCount}
              </span>
            )}
          </button>
        )}

        <div className="flex min-w-[150px] flex-col gap-1">
          <div className="flex justify-between text-[0.5625rem] uppercase tracking-wider text-white/40">
            <span>Progress</span>
            <span className="font-mono">
              {roundsDone} / {totalRounds}
            </span>
          </div>
          <div className="h-1 overflow-hidden rounded-full bg-white/12">
            <div
              className="h-full rounded-full bg-up transition-[width] duration-500 ease-[cubic-bezier(.2,.7,.3,1)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Full-width transition between rounds and days. It fades over the board
 * rather than replacing it, so you can still see the market behind — the
 * progression reads as the game moving on, not as a modal interrupting you.
 * Nothing to dismiss; it clears itself.
 */
export function PhaseTransition({
  transition,
}: {
  transition: { title: string; sub: string } | null;
}) {
  if (!transition) return null;
  return (
    <div className="animate-fade-in pointer-events-none fixed inset-0 z-30 grid place-items-center bg-canvas/45 backdrop-blur-[2px]">
      <div className="transition-card rounded-lg border border-line bg-surface px-10 py-7 text-center shadow-lift">
        <div className="t-display text-ink">{transition.title}</div>
        <div className="mt-1.5 flex items-center justify-center gap-2">
          <span className="h-1 w-1 animate-pulse rounded-full bg-up" />
          <span className="t-section">{transition.sub}</span>
        </div>
      </div>
    </div>
  );
}
