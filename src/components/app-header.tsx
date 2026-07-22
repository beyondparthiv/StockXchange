import Link from "next/link";

/**
 * Top navigation for authenticated pages. Rendered by the (app) layout, so it
 * appears on the home, config, and How-to-Play screens with the user's identity
 * and a logout control always in reach.
 *
 * Plain component (no client hooks): the logout is a native form POST to the
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
    <header className="sticky top-0 z-20 border-b border-white/10 bg-zinc-950/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="text-lg font-bold tracking-tight text-zinc-100">
          Stock<span className="text-emerald-400">Xchange</span>
        </Link>

        <div className="flex items-center gap-4">
          <Link
            href="/how-to-play"
            className="text-sm text-zinc-400 transition hover:text-zinc-100"
          >
            How to Play
          </Link>

          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-emerald-500/20 text-sm font-semibold text-emerald-300">
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
            <span className="hidden text-sm text-zinc-300 sm:inline">
              {displayName}
            </span>
          </div>

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:bg-white/5"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
