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
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gold/40 text-lg text-ink transition hover:bg-cream-soft disabled:opacity-40"
        aria-label="Decrease"
      >
        −
      </button>
      <span className="w-10 text-center text-lg font-bold tabular-nums text-ink">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-gold/40 text-lg text-ink transition hover:bg-cream-soft disabled:opacity-40"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
        active
          ? "border-gold bg-gold text-navy"
          : "border-gold/30 text-ink hover:bg-cream-soft"
      }`}
    >
      {children}
    </button>
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
    <div className="flex flex-col gap-2 border-b border-gold/15 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-sm font-semibold text-ink">{label}</div>
        {hint && <div className="text-xs text-ink-soft">{hint}</div>}
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
        <div className="h-64 animate-pulse rounded-2xl border border-gold/30 bg-cream" />
      </main>
    );
  }

  const rounds = config.days * 2;

  if (ready) {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-12">
        <div className="rounded-2xl border border-gold/50 bg-cream p-6 text-center shadow-[0_16px_40px_-18px_rgba(120,90,30,0.45)]">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">
            Ready to play
          </p>
          <h1 className="font-display mt-2 text-2xl font-semibold text-ink">
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

          <div className="rule-ornament mx-auto mt-6 max-w-xs">
            <span className="text-gold">◆</span>
          </div>

          <div className="mt-4 rounded-lg border border-gold/30 bg-cream-soft p-3 text-xs text-ink-soft">
            {meta.nextStep}
          </div>

          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setReady(false)}
              className="rounded-lg border border-ink/20 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-cream-soft"
            >
              Change settings
            </button>
            <Link
              href="/"
              className="rounded-lg border border-gold/60 bg-gold px-4 py-2 text-sm font-bold text-navy shadow-[0_2px_0_0_rgba(120,90,30,0.5)] transition hover:bg-gold-bright"
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
        <h1 className="font-display mt-3 text-3xl font-semibold tracking-tight text-ink">
          {meta.label}
        </h1>
        <p className="mt-1 text-sm text-ink-soft">{meta.description}</p>
      </div>

      <div className="rounded-2xl border border-gold/40 bg-cream px-6 py-2 shadow-[0_12px_30px_-18px_rgba(120,90,30,0.5)]">
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
        </Row>
      </div>

      <button
        type="button"
        onClick={() => setReady(true)}
        className="mt-6 w-full rounded-lg border border-gold/60 bg-gold px-4 py-3 text-sm font-bold text-navy shadow-[0_2px_0_0_rgba(120,90,30,0.5)] transition hover:bg-gold-bright active:translate-y-px active:shadow-none"
      >
        {mode === "online" ? "Create room" : "Start game"}
      </button>
      <p className="mt-2 text-center text-xs text-ink-soft">{meta.nextStep}</p>
    </main>
  );
}
