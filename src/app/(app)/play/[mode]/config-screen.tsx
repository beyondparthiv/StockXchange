"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  CASH_PRESETS,
  LIMITS,
  MODE_META,
  TIMER_OPTIONS,
  formatUSD,
  shortUSD,
  type GameMode,
} from "@/lib/game/config";
import { ROOM_CODE_LENGTH } from "@/lib/game/rooms";
import { useGameConfigStore } from "@/lib/stores/game-config-store";
import { Chip, SettingRow, Stepper } from "@/components/ui/controls";
import { Alert } from "@/components/auth/auth-ui";

export default function ConfigScreen({ mode }: { mode: GameMode }) {
  const router = useRouter();
  const meta = MODE_META[mode];
  const { config, setConfig } = useGameConfigStore();

  // Guard against hydration mismatch: the persisted store isn't known until the
  // client mounts, so render a placeholder for the first paint.
  const [mounted, setMounted] = useState(false);
  const [ready, setReady] = useState(false);
  useEffect(() => setMounted(true), []);

  // Online-mode room actions.
  const [creating, setCreating] = useState(false);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState("");

  async function handleCreateRoom() {
    setRoomError(null);
    setCreating(true);
    try {
      const res = await fetch("/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create room");
      router.push(`/room/${data.code}`);
    } catch (err) {
      setCreating(false);
      setRoomError(err instanceof Error ? err.message : "Could not create room");
    }
  }

  function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (code.length === ROOM_CODE_LENGTH) router.push(`/room/${code}`);
  }

  if (!mounted) {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-12">
        <div className="skeleton h-64 rounded-lg border border-line" />
      </main>
    );
  }

  const rounds = config.days * 2;

  // Ready summary (bots / solo only).
  if (ready && mode !== "online") {
    return (
      <main className="mx-auto w-full max-w-2xl px-6 py-12">
        <div className="animate-rise-in rounded-lg border border-line bg-surface p-6 text-center shadow-panel">
          <p className="t-section">Ready to play</p>
          <h1 className="t-title mt-2 text-ink">Game configured</h1>
          <p className="mt-1.5 text-sm text-ink-soft">
            {meta.label} · {config.days} Days · {rounds} Rounds
          </p>

          <dl className="mx-auto mt-6 grid max-w-sm grid-cols-2 gap-y-2.5 text-left text-[0.8125rem]">
            <dt className="text-ink-soft">Starting cash</dt>
            <dd className="t-value text-right text-ink">
              {formatUSD(config.startingCash)}
            </dd>
            <dt className="text-ink-soft">Companies</dt>
            <dd className="t-value text-right text-ink">{config.companies}</dd>
            <dt className="text-ink-soft">Round timer</dt>
            <dd className="t-value text-right text-ink">{config.roundTimerSec}s</dd>
          </dl>

          <div className="mt-6 rounded-md border border-line bg-surface-2 px-3 py-2.5 text-xs text-ink-soft">
            {meta.nextStep}
          </div>

          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() => setReady(false)}
              className="interactive rounded-md border border-line-strong px-4 py-2 text-[0.8125rem] font-medium text-ink hover:bg-surface-2"
            >
              Change settings
            </button>
            <Link
              href={`/play/${mode}/game`}
              className="cta rounded-md bg-accent px-4 py-2 text-[0.8125rem] font-medium text-white hover:bg-accent-hover"
            >
              Enter the market
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-6 py-12">
      <div className="animate-rise-in mb-6">
        <Link
          href="/"
          className="text-[0.8125rem] text-ink-soft transition hover:text-ink"
        >
          ← Modes
        </Link>
        <h1 className="t-display mt-3 text-ink">{meta.label}</h1>
        <p className="mt-1.5 text-sm text-ink-soft">{meta.description}</p>
      </div>

      <div className="animate-rise-in rounded-lg border border-line bg-surface px-5 py-1 shadow-panel">
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
                {shortUSD(amount)}
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

      {mode === "online" ? (
        <div className="mt-6">
          {roomError && (
            <div className="mb-4">
              <Alert kind="error">{roomError}</Alert>
            </div>
          )}
          <button
            type="button"
            onClick={handleCreateRoom}
            disabled={creating}
            className="cta w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:opacity-55"
          >
            {creating ? "Creating room…" : "Create room"}
          </button>

          <div className="rule my-5">
            <span className="t-section">or join</span>
          </div>

          <form onSubmit={handleJoin} className="flex gap-2">
            <input
              value={joinCode}
              onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
              placeholder="Enter room code"
              maxLength={ROOM_CODE_LENGTH}
              className="interactive flex-1 rounded-md border border-line-strong bg-surface-2 px-3 py-2.5 font-mono text-sm uppercase tracking-[0.2em] text-ink placeholder-ink-faint outline-none focus:border-accent focus:bg-surface focus:shadow-[0_0_0_3px_var(--c-accent-ring)]"
            />
            <button
              type="submit"
              disabled={joinCode.trim().length !== ROOM_CODE_LENGTH}
              className="interactive rounded-md border border-line-strong px-5 py-2.5 text-[0.8125rem] font-medium text-ink hover:bg-surface-2 disabled:opacity-40"
            >
              Join
            </button>
          </form>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => setReady(true)}
            className="cta mt-6 w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
          >
            Start game
          </button>
          <p className="mt-2.5 text-center text-xs text-ink-faint">
            {meta.nextStep}
          </p>
        </>
      )}
    </main>
  );
}
