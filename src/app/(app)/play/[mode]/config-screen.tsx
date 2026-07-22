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

function Stepper({
  value,
  min,
  max,
  onChange,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={value <= min}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-lg text-zinc-200 transition hover:bg-white/5 disabled:opacity-40"
        aria-label="Decrease"
      >
        −
      </button>
      <span className="w-10 text-center text-lg font-semibold tabular-nums">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/15 text-lg text-zinc-200 transition hover:bg-white/5 disabled:opacity-40"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}

function Row({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-white/5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-sm font-medium text-zinc-200">{label}</div>
        {hint && <div className="text-xs text-zinc-500">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

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
        <div className="h-64 animate-pulse rounded-2xl border border-white/10 bg-white/[0.03]" />
      </main>
    );
  }

  const rounds = config.days * 2;

  if (ready) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-12">
        <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/[0.06] p-6 text-center">
          <h1 className="text-xl font-semibold">Game configured</h1>
          <p className="mt-1 text-sm text-zinc-400">
            {meta.label} · {config.days} Days · {rounds} Rounds
          </p>

          <dl className="mx-auto mt-6 grid max-w-sm grid-cols-2 gap-3 text-left text-sm">
            <dt className="text-zinc-500">Starting cash</dt>
            <dd className="text-right text-zinc-200">
              {formatINR(config.startingCash)}
            </dd>
            <dt className="text-zinc-500">Companies</dt>
            <dd className="text-right text-zinc-200">{config.companies}</dd>
            <dt className="text-zinc-500">Round timer</dt>
            <dd className="text-right text-zinc-200">
              {config.roundTimerSec}s
            </dd>
          </dl>

          <div className="mt-6 rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-zinc-400">
            {meta.nextStep}
          </div>

          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setReady(false)}
              className="rounded-lg border border-white/15 px-4 py-2 text-sm font-medium text-zinc-200 transition hover:bg-white/5"
            >
              Change settings
            </button>
            <Link
              href="/"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
            >
              Back to modes
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
          className="text-sm text-zinc-400 transition hover:text-zinc-100"
        >
          ← Modes
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">{meta.label}</h1>
        <p className="mt-1 text-sm text-zinc-400">{meta.description}</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-6 py-2">
        <Row label="Days" hint={`${rounds} rounds total (2 per day)`}>
          <Stepper
            value={config.days}
            min={LIMITS.days.min}
            max={LIMITS.days.max}
            onChange={(v) => setConfig({ days: v })}
          />
        </Row>

        <Row label="Starting cash" hint="Per player">
          <div className="flex flex-wrap gap-2">
            {CASH_PRESETS.map((amount) => {
              const active = config.startingCash === amount;
              return (
                <button
                  key={amount}
                  type="button"
                  onClick={() => setConfig({ startingCash: amount })}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200"
                      : "border-white/15 text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  {shortINR(amount)}
                </button>
              );
            })}
          </div>
        </Row>

        <Row label="Companies" hint="Tickers in the market">
          <Stepper
            value={config.companies}
            min={LIMITS.companies.min}
            max={LIMITS.companies.max}
            onChange={(v) => setConfig({ companies: v })}
          />
        </Row>

        <Row label="Round timer" hint="Seconds to place orders each round">
          <div className="flex flex-wrap gap-2">
            {TIMER_OPTIONS.map((sec) => {
              const active = config.roundTimerSec === sec;
              return (
                <button
                  key={sec}
                  type="button"
                  onClick={() => setConfig({ roundTimerSec: sec })}
                  className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                    active
                      ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-200"
                      : "border-white/15 text-zinc-300 hover:bg-white/5"
                  }`}
                >
                  {sec}s
                </button>
              );
            })}
          </div>
        </Row>
      </div>

      <button
        type="button"
        onClick={() => setReady(true)}
        className="mt-6 w-full rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 transition hover:bg-emerald-400"
      >
        {mode === "online" ? "Create room" : "Start game"}
      </button>
      <p className="mt-2 text-center text-xs text-zinc-500">{meta.nextStep}</p>
    </main>
  );
}
