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
            className="text-sm text-white/75 transition hover:text-white"
          >
            How to Play
          </Link>

          <div className="flex items-center gap-2">
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
          </div>

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
