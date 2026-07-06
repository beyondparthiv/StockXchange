import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser-side Supabase client.
 *
 * Use this inside Client Components ("use client"). It reads the public env
 * vars that are safe to expose to the browser. The anon key is intentionally
 * public — row level security (added in later phases) is what protects data.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}
