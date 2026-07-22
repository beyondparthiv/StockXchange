import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Permanently delete the current user's account.
 *
 * A user can't delete themselves from auth.users with the anon key, so this
 * runs server-side with the service role. We first confirm who is logged in
 * (from their session cookie), then admin-delete that exact user. The
 * `on delete cascade` on profiles/user_settings removes their rows too.
 * POST-only so it can't be triggered by a link or prefetch.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url), {
      status: 303,
    });
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Clear the now-orphaned session cookies and send them to login.
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), { status: 303 });
}
