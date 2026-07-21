import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Sign out. POST-only so it can't be triggered by a stray link prefetch or an
 * <img> tag — signing out should be a deliberate action.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/login", request.url), {
    status: 303, // "See Other" — turns the POST into a GET on the redirect.
  });
}
