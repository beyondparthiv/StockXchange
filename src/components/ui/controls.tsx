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
    <div className="flex flex-col gap-2 border-b border-line py-3.5 last:border-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="text-[0.8125rem] font-medium text-ink">{label}</div>
        {hint && <div className="mt-0.5 text-xs text-ink-faint">{hint}</div>}
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
        className="flex interactive h-8 w-8 items-center justify-center rounded-md border border-line-strong text-base text-ink-soft hover:border-accent hover:bg-surface-2 hover:text-ink disabled:opacity-35"
        aria-label="Decrease"
      >
        −
      </button>
      <span className="t-value w-10 text-center text-base text-ink">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={value >= max}
        className="flex interactive h-8 w-8 items-center justify-center rounded-md border border-line-strong text-base text-ink-soft hover:border-accent hover:bg-surface-2 hover:text-ink disabled:opacity-35"
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
      className={`interactive rounded-md border px-3 py-1.5 text-[0.8125rem] font-medium ${
        active
          ? "border-accent bg-accent text-white"
          : "border-line-strong text-ink-soft hover:bg-surface-2 hover:text-ink"
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
      className={`interactive relative inline-flex h-6 w-11 shrink-0 items-center rounded-full ${
        checked ? "bg-accent" : "bg-ink/20"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ease-[cubic-bezier(.2,.7,.3,1)] ${
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
    <div className="inline-flex rounded-md border border-line bg-canvas-2 p-0.5">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`interactive rounded-[4px] px-3 py-1.5 text-[0.8125rem] font-medium ${
            value === opt.value
              ? "bg-surface text-ink shadow-panel"
              : "text-ink-soft hover:text-ink"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
