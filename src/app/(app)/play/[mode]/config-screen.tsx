"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  CASH_PRESETS,
  LIMITS,
  MODE_META,
  TIMER_OPTIONS,
  formatINR,
  shortINR,
  type GameMode,
} from "@/lib/game/config";
import { useGameConfigStore } from "@/lib/stores/game-config-store";
import { Chip, SettingRow, Stepper } from "@/components/ui/controls";

export default function ConfigScreen({ mode }: { mode: GameMode }) {
  const meta = MODE_META[mode];
  const { config, setConfig } = useGameConfigStore();

  // Guard against hydration mismatch: the persisted store isn't known until the
  // client mounts, so render a placeholder for the first paint.
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-12">
        <div className="h-64 animate-pulse rounded-2xl border border-ink/5 bg-surface" />
      </main>
    );
  }

  const rounds = config.days * 2;

  if (ready) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-12">
        <div className="rounded-2xl border border-ink/5 bg-surface p-6 text-center shadow-[0_18px_40px_-20px_rgba(13,59,55,0.45)]">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal">
            Ready to play
          </p>
          <h1 className="font-display mt-2 text-2xl font-bold text-ink">
            Game configured
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {meta.label} · {config.days} Days · {rounds} Rounds
          </p>

          <dl className="mx-auto mt-6 grid max-w-sm grid-cols-2 gap-3 text-left text-sm">
            <dt className="text-ink-soft">Starting cash</dt>
            <dd className="text-right font-semibold text-ink">
              {formatINR(config.startingCash)}
            </dd>
            <dt className="text-ink-soft">Companies</dt>
            <dd className="text-right font-semibold text-ink">
              {config.companies}
            </dd>
            <dt className="text-ink-soft">Round timer</dt>
            <dd className="text-right font-semibold text-ink">
              {config.roundTimerSec}s
            </dd>
          </dl>

          <div className="mt-6 rounded-xl border border-ink/10 bg-surface-2 p-3 text-xs text-ink-soft">
            {meta.nextStep}
          </div>

          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setReady(false)}
              className="rounded-xl border border-ink/15 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-surface-2"
            >
              Change settings
            </button>
            <Link
              href="/"
              className="rounded-xl bg-teal px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-deep"
            >
              Back to tables
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <div className="mb-6">
        <Link
          href="/"
          className="text-sm text-ink-soft transition hover:text-ink"
        >
          ← Tables
        </Link>
        <h1 className="font-display mt-3 text-3xl font-extrabold tracking-tight text-ink">
          {meta.label}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">{meta.description}</p>
      </div>

      <div className="rounded-2xl border border-ink/5 bg-surface px-6 py-2 shadow-[0_14px_30px_-20px_rgba(13,59,55,0.4)]">
        <SettingRow label="Days" hint={`${rounds} rounds total (2 per day)`}>
          <Stepper
            value={config.days}
            min={LIMITS.days.min}
            max={LIMITS.days.max}
            onChange={(v) => setConfig({ days: v })}
          />
        </SettingRow>

        <SettingRow label="Starting cash" hint="Per player">
          <div className="flex flex-wrap gap-2">
            {CASH_PRESETS.map((amount) => (
              <Chip
                key={amount}
                active={config.startingCash === amount}
                onClick={() => setConfig({ startingCash: amount })}
              >
                {shortINR(amount)}
              </Chip>
            ))}
          </div>
        </SettingRow>

        <SettingRow label="Companies" hint="Tickers in the market">
          <Stepper
            value={config.companies}
            min={LIMITS.companies.min}
            max={LIMITS.companies.max}
            onChange={(v) => setConfig({ companies: v })}
          />
        </SettingRow>

        <SettingRow label="Round timer" hint="Seconds to place orders each round">
          <div className="flex flex-wrap gap-2">
            {TIMER_OPTIONS.map((sec) => (
              <Chip
                key={sec}
                active={config.roundTimerSec === sec}
                onClick={() => setConfig({ roundTimerSec: sec })}
              >
                {sec}s
              </Chip>
            ))}
          </div>
        </SettingRow>
      </div>

      <button
        type="button"
        onClick={() => setReady(true)}
        className="mt-6 w-full rounded-xl bg-teal px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-deep active:translate-y-px"
      >
        {mode === "online" ? "Create room" : "Start game"}
      </button>
      <p className="mt-2 text-center text-xs text-ink-soft">{meta.nextStep}</p>
    </main>
  );
}
