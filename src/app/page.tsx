import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// Auth state is per-request, so never prerender this page statically.
export const dynamic = "force-dynamic";

export default async function Home() {
  // Before Supabase is configured, show setup guidance instead of redirecting.
  if (!isSupabaseConfigured()) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-950 px-6 py-16 text-zinc-100">
        <main className="w-full max-w-md text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Stock<span className="text-emerald-400">Xchange</span>
          </h1>
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-left text-sm text-amber-200">
            <p className="font-semibold">Supabase isn&apos;t configured yet.</p>
            <p className="mt-2 text-amber-200/80">
              Add your project URL and anon key to{" "}
              <code className="rounded bg-black/40 px-1">.env.local</code> and
              restart <code className="rounded bg-black/40 px-1">npm run dev</code>
              . See the README for the full setup steps.
            </p>
          </div>
          <p className="mt-6 text-sm">
            <Link
              href="/status"
              className="text-emerald-400 hover:text-emerald-300"
            >
              View service status →
            </Link>
          </p>
        </main>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // The proxy normally handles this, but guard here too.
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url, created_at")
    .eq("id", user.id)
    .single();

  const displayName =
    profile?.display_name ??
    (user.user_metadata?.display_name as string | undefined) ??
    (user.user_metadata?.full_name as string | undefined) ??
    user.email ??
    "Trader";
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-950 px-6 py-16 text-zinc-100">
      <main className="w-full max-w-md">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-emerald-500/20 text-2xl font-bold text-emerald-300">
            {profile?.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={profile.avatar_url}
                alt={displayName}
                className="h-full w-full object-cover"
              />
            ) : (
              initial
            )}
          </div>

          <h1 className="mt-4 text-xl font-semibold">
            Welcome, {displayName}
          </h1>
          <p className="mt-1 text-sm text-zinc-400">{user.email}</p>
          {profile?.created_at && (
            <p className="mt-1 text-xs text-zinc-500">
              Member since{" "}
              {new Date(profile.created_at).toLocaleDateString()}
            </p>
          )}

          <div className="mt-6 rounded-lg border border-white/10 bg-black/20 p-3 text-xs text-zinc-400">
            You&apos;re logged in. Game modes and lobbies arrive in the next
            phases.
          </div>

          <form action="/auth/signout" method="post" className="mt-6">
            <button
              type="submit"
              className="w-full rounded-lg border border-white/15 px-4 py-2.5 text-sm font-semibold text-zinc-200 transition hover:bg-white/5"
            >
              Log out
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-sm">
          <Link
            href="/status"
            className="text-zinc-400 hover:text-zinc-200"
          >
            Service status →
          </Link>
        </p>
      </main>
    </div>
  );
}
