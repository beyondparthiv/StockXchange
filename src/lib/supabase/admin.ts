import { createClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. SERVER-ONLY — it bypasses Row Level Security,
 * so it must never be imported into client code or exposed to the browser.
 *
 * Used for privileged operations the user can't do themselves, e.g. deleting
 * their own auth account (Phase 3) and, later, writing game results (Phase 9).
 */
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}
