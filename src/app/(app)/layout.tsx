import Link from "next/link";
import { redirect } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { ThemeApply } from "@/components/theme-apply";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Theme } from "@/lib/theme";

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
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-md text-center">
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink">
            Stock<span className="text-teal">Xchange</span>
          </h1>
          <div className="mt-6 rounded-2xl border border-ink/5 bg-surface p-5 text-left text-sm text-ink shadow-[0_18px_40px_-20px_rgba(13,59,55,0.45)]">
            <p className="font-semibold text-sell">
              Supabase isn&apos;t configured yet.
            </p>
            <p className="mt-2 text-ink-soft">
              Add your project URL and anon key to{" "}
              <code className="rounded bg-surface-2 px-1">.env.local</code> and
              restart the dev server. See the README for setup.
            </p>
          </div>
          <p className="mt-6 text-sm">
            <Link
              href="/status"
              className="font-semibold text-teal hover:text-teal-deep"
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

  // Theme preference. If the user_settings table/row doesn't exist yet, this
  // returns null and we fall back to light — the app never breaks on it.
  const { data: settings } = await supabase
    .from("user_settings")
    .select("theme")
    .eq("user_id", user.id)
    .maybeSingle();
  const theme: Theme = settings?.theme === "dark" ? "dark" : "light";

  return (
    <div className="flex flex-1 flex-col">
      <ThemeApply theme={theme} />
      <AppHeader displayName={displayName} avatarUrl={profile?.avatar_url} />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
