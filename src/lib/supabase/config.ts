/**
 * Central place to read Supabase env vars and decide whether the project is
 * actually configured yet.
 *
 * Why this exists: before you paste real Supabase credentials into
 * `.env.local`, the URL is still the placeholder from `.env.example`. Without a
 * guard, every request in the proxy would try to reach a fake host and fail. So
 * the whole app checks `isSupabaseConfigured()` first and degrades gracefully to
 * a "set up Supabase" notice instead of crashing.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export function isSupabaseConfigured(): boolean {
  return (
    SUPABASE_URL.startsWith("https://") &&
    !SUPABASE_URL.includes("YOUR-PROJECT") &&
    SUPABASE_ANON_KEY.length > 20 &&
    !SUPABASE_ANON_KEY.startsWith("your-")
  );
}
