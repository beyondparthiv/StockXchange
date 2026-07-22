import Link from "next/link";

/**
 * Top navigation for authenticated pages — a deep-teal bar that matches the
 * game's chrome, sitting above the mint canvas. Rendered by the (app) layout.
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
    <header className="sticky top-0 z-20 bg-teal-deep text-white shadow-[0_6px_20px_-10px_rgba(13,59,55,0.7)]">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          href="/"
          className="font-display text-xl font-extrabold tracking-tight text-white"
        >
          Stock<span className="text-buy-bright">Xchange</span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/how-to-play"
            className="hidden text-sm text-white/75 transition hover:text-white sm:inline"
          >
            How to Play
          </Link>

          <Link
            href="/settings"
            aria-label="Settings"
            className="text-white/75 transition hover:text-white"
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
            className="flex items-center gap-2 rounded-full transition hover:opacity-90"
          >
            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white/15 text-sm font-bold text-white">
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
            <span className="hidden text-sm text-white/90 sm:inline">
              {displayName}
            </span>
          </Link>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-white/25 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-white/10"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
