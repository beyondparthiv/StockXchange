import Link from "next/link";

/**
 * Top navigation for authenticated pages — a deep-navy "game-box banner" with
 * gold accents that sits above the parchment page. Rendered by the (app) layout.
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
    <header className="sticky top-0 z-20 border-b-2 border-gold/50 bg-navy text-cream shadow-[0_4px_20px_-8px_rgba(0,0,0,0.5)]">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-tight text-cream"
        >
          Stock<span className="text-gold-bright">Xchange</span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/how-to-play"
            className="text-sm text-cream/75 transition hover:text-cream"
          >
            How to Play
          </Link>

          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-gold/50 bg-cream/10 text-sm font-bold text-gold-bright">
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
            <span className="hidden text-sm text-cream/90 sm:inline">
              {displayName}
            </span>
          </div>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-cream/25 px-3 py-1.5 text-xs font-semibold text-cream transition hover:bg-cream/10"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
