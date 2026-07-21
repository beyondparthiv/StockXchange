import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * OAuth / PKCE callback.
 *
 * Google sign-in and the password-recovery email both redirect the browser
 * here with a `?code=`. We exchange that code for a session (which sets the
 * auth cookies via the server client), then forward the user to `next`.
 *
 * `next` lets callers control the landing page — e.g. password recovery sends
 * `next=/reset-password` so the user lands on the "set a new password" form.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`,
    );
  }

  // No code present — bounce to login with a generic message.
  return NextResponse.redirect(
    `${origin}/login?error=${encodeURIComponent("Could not sign in. Please try again.")}`,
  );
}
