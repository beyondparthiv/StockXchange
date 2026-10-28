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

/*
 * Which sign-in methods to offer.
 *
 * Google and phone are disabled by default because enabling them is not a
 * code change — Google needs OAuth credentials in Google Cloud plus the
 * provider switched on in Supabase, and phone needs a paid SMS provider
 * (Twilio and friends). Showing a button that can only ever return
 * "provider is not enabled" is worse than not showing it: the user assumes
 * the app is broken rather than the option being unavailable.
 *
 * Turn either on by setting the flag to "true" in the environment once the
 * provider is actually configured. The code behind both already works.
 */
export const GOOGLE_AUTH_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_GOOGLE_AUTH === "true";

export const PHONE_AUTH_ENABLED =
  process.env.NEXT_PUBLIC_ENABLE_PHONE_AUTH === "true";
