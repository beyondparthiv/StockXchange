import Link from "next/link";
import type { InputHTMLAttributes, ReactNode } from "react";

/**
 * Presentational building blocks shared across the auth pages. Vintage
 * board-game theme: cream cards on parchment, gold hairlines, navy ink, and a
 * Fraunces serif for titles.
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
    <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="font-display text-3xl font-semibold tracking-tight text-ink"
          >
            Stock<span className="text-gold">Xchange</span>
          </Link>
          <h1 className="font-display mt-6 text-2xl font-semibold text-ink">
            {title}
          </h1>
          {subtitle && <p className="mt-1 text-sm text-ink-soft">{subtitle}</p>}
        </div>

        <div className="rounded-2xl border border-gold/40 bg-cream p-6 shadow-[0_16px_40px_-18px_rgba(120,90,30,0.45)]">
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
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-ink-soft">
        {label}
      </span>
      <input
        {...props}
        className="w-full rounded-lg border border-gold/30 bg-cream-soft px-3 py-2 text-sm text-ink placeholder-ink-soft/50 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/25 disabled:opacity-50"
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
      className="w-full rounded-lg border border-gold/60 bg-gold px-4 py-2.5 text-sm font-bold text-navy shadow-[0_2px_0_0_rgba(120,90,30,0.5)] transition hover:bg-gold-bright hover:shadow-[0_3px_0_0_rgba(120,90,30,0.5)] active:translate-y-px active:shadow-none disabled:cursor-not-allowed disabled:opacity-60"
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
      className="flex w-full items-center justify-center gap-2 rounded-lg border border-ink/15 bg-white px-4 py-2.5 text-sm font-semibold text-ink transition hover:bg-cream-soft disabled:cursor-not-allowed disabled:opacity-60"
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
    <div className="rule-ornament my-5">
      <span className="text-xs uppercase tracking-widest text-gold">
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
      ? "border-classic-red/40 bg-classic-red/10 text-classic-red"
      : "border-classic-green/40 bg-classic-green/10 text-classic-green";
  return (
    <div className={`rounded-lg border px-3 py-2 text-xs font-medium ${styles}`}>
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
      <code className="rounded bg-cream-soft px-1">.env.local</code> and restart
      the dev server. See the README for setup steps.
    </Alert>
  );
}
