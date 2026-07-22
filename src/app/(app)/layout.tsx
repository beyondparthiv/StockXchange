import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";

// Every authenticated page depends on per-request auth state.
export const dynamic = "force-dynamic";

/**
 * Layout for all signed-in screens (home, config, how-to-play). Does the auth
 * check once and renders the shared header, so individual pages don't repeat
 * it. The proxy also guards these routes; this is the defense-in-depth layer
 * that additionally supplies the user's profile to the header.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!isSupabaseConfigured()) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-950 px-6 py-16 text-zinc-100">
        <div className="w-full max-w-md text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Stock<span className="text-emerald-400">Xchange</span>
          </h1>
          <div className="mt-6 rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 text-left text-sm text-amber-200">
            <p className="font-semibold">Supabase isn&apos;t configured yet.</p>
            <p className="mt-2 text-amber-200/80">
              Add your project URL and anon key to{" "}
              <code className="rounded bg-black/40 px-1">.env.local</code> and
              restart the dev server. See the README for setup.
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
        </div>
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, avatar_url")
    .eq("id", user.id)
    .single();

  const displayName =
    profile?.display_name ??
    (user.user_metadata?.display_name as string | undefined) ??
    (user.user_metadata?.full_name as string | undefined) ??
    user.email ??
    "Trader";

  return (
    <div className="flex flex-1 flex-col bg-zinc-950 text-zinc-100">
      <AppHeader displayName={displayName} avatarUrl={profile?.avatar_url} />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
