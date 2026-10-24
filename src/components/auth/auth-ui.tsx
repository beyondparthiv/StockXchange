import Link from "next/link";
import type { InputHTMLAttributes, ReactNode } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { Wordmark } from "@/components/wordmark";

/**
 * Presentational building blocks shared across the auth pages. Follows the
 * terminal design system: neutral panels on a neutral canvas, a single blue
 * accent for the primary action, borders instead of shadows for structure.
 */

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex flex-1 items-center justify-center px-6 py-16">
      <div className="absolute right-6 top-6">
        <ThemeToggle className="border border-line text-ink-soft hover:bg-surface-2 hover:text-ink" />
      </div>

      <div className="stagger w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="interactive inline-block text-2xl"
          >
            <Wordmark />
          </Link>
          <h1 className="t-display mt-6 text-ink">{title}</h1>
          {subtitle && (
            <p className="mt-1.5 text-sm text-ink-soft">{subtitle}</p>
          )}
        </div>

        <div className="rounded-lg border border-line bg-surface p-6 shadow-panel">
          {children}
        </div>

        {footer && (
          <p className="mt-6 text-center text-sm text-ink-soft">{footer}</p>
        )}
      </div>
    </div>
  );
}

export function Field({
  label,
  ...props
}: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-ink-soft">
        {label}
      </span>
      <input
        {...props}
        className="interactive w-full rounded-md border border-line-strong bg-surface-2 px-3 py-2.5 text-sm text-ink placeholder-ink-faint outline-none focus:border-accent focus:bg-surface focus:shadow-[0_0_0_3px_var(--c-accent-ring)] disabled:opacity-50"
      />
    </label>
  );
}

export function SubmitButton({
  children,
  loading,
  ...props
}: { loading?: boolean } & InputHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      type="submit"
      disabled={loading || props.disabled}
      className="cta w-full rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-55"
    >
      {loading ? "Please wait…" : children}
    </button>
  );
}

export function GoogleButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="interactive flex w-full items-center justify-center gap-2 rounded-md border border-line-strong bg-surface px-4 py-2.5 text-sm font-medium text-ink hover:border-line-strong hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-55"
    >
      <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.66-2.26 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"
        />
        <path
          fill="#EA4335"
          d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.35 14.97.4 12 .4A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 6.68 9.14 4.75 12 4.75z"
        />
      </svg>
      Continue with Google
    </button>
  );
}

export function Divider({ label }: { label: string }) {
  return (
    <div className="rule my-5">
      <span className="t-section">
        {label}
      </span>
    </div>
  );
}

export function Alert({
  kind,
  children,
}: {
  kind: "error" | "success";
  children: ReactNode;
}) {
  const styles =
    kind === "error"
      ? "border-down/30 bg-down/8 text-down"
      : "border-up/30 bg-up/8 text-up";
  return (
    <div className={`animate-rise-in rounded-md border px-3 py-2 text-xs font-medium ${styles}`}>
      {children}
    </div>
  );
}

/**
 * Shown across auth pages when Supabase credentials aren't configured yet.
 */
export function ConfigNotice() {
  return (
    <Alert kind="error">
      Supabase isn&apos;t configured yet. Add your project URL and anon key to{" "}
      <code className="rounded-xs bg-surface-2 px-1 font-mono text-[0.6875rem]">.env.local</code> and restart
      the dev server. See the README for setup steps.
    </Alert>
  );
}
