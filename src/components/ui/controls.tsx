"use client";

import type { ReactNode } from "react";

/**
 * Small form controls shared by the config and settings screens, so both use
 * the same steppers, chips, toggles, and setting rows.
 */

export function SettingRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2 border-b border-ink/10 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-sm font-semibold text-ink">{label}</div>
        {hint && <div className="text-xs text-ink-soft">{hint}</div>}
      </div>
      <div>{children}</div>
    </div>
  );
}

export function Stepper({
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
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink/15 text-lg text-ink transition hover:bg-surface-2 disabled:opacity-40"
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
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink/15 text-lg text-ink transition hover:bg-surface-2 disabled:opacity-40"
        aria-label="Increase"
      >
        +
      </button>
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg border px-3 py-1.5 text-sm font-semibold transition ${
        active
          ? "border-teal bg-teal text-white"
          : "border-ink/15 text-ink hover:bg-surface-2"
      }`}
    >
      {children}
    </button>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition ${
        checked ? "bg-teal" : "bg-ink/20"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

/** Two-state segmented control (used for Light / Dark). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-ink/10 bg-surface-2 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition ${
            value === opt.value
              ? "bg-teal text-white"
              : "text-ink-soft hover:text-ink"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
