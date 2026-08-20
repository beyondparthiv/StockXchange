import Link from "next/link";

/**
 * Top navigation for authenticated pages — the terminal chrome bar. Stays dark
 * in both themes so the app reads as a trading application at a glance.
 * Rendered by the (app) layout.
 *
 * Plain component (no client hooks): logout is a native form POST to the
 * signout route handler, so it works without JavaScript.
 */
export function AppHeader({
  displayName,
  avatarUrl,
}: {
  displayName: string;
  avatarUrl?: string | null;
}) {
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <header className="sticky top-0 z-20 border-b border-white/8 bg-chrome text-white">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-6 px-6">
        <Link
          href="/"
          className="text-[0.9375rem] font-semibold tracking-tight text-white"
        >
          Stock<span className="text-white/55">Xchange</span>
        </Link>

        <div className="flex items-center gap-5">
          <Link
            href="/how-to-play"
            className="hidden text-[0.8125rem] font-medium text-white/60 transition hover:text-white sm:inline"
          >
            How to Play
          </Link>

          <Link
            href="/settings"
            aria-label="Settings"
            className="text-white/55 transition hover:text-white"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M12 15a3 3 0 100-6 3 3 0 000 6z"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path
                d="M19.4 13a1.7 1.7 0 00.3 1.9l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.9-.3 1.7 1.7 0 00-1 1.5V19a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.9.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.9 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.9l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.9.3H11a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.9-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.9V11a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z"
                stroke="currentColor"
                strokeWidth="1.4"
              />
            </svg>
          </Link>

          <Link
            href="/profile"
            className="flex items-center gap-2 transition hover:opacity-80"
          >
            <span className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-md bg-white/12 text-xs font-semibold text-white">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={avatarUrl}
                  alt={displayName}
                  className="h-full w-full object-cover"
                />
              ) : (
                initial
              )}
            </span>
            <span className="hidden text-[0.8125rem] font-medium text-white/85 sm:inline">
              {displayName}
            </span>
          </Link>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-md border border-white/18 px-3 py-1.5 text-xs font-medium text-white/75 transition hover:border-white/30 hover:text-white"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
