import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured } from "./config";

/**
 * Session refresh + coarse route protection, run from `proxy.ts` on every
 * matched request.
 *
 * In Next 16 what used to be "middleware" is called **Proxy**. The job here is
 * the standard Supabase SSR dance:
 *  1. Create a server client bound to THIS request's cookies.
 *  2. Call `getUser()` — this refreshes the auth token if it expired and, via
 *     the `setAll` callback, writes the refreshed cookies onto the response.
 *  3. Redirect unauthenticated users away from protected routes.
 *
 * `getUser()` (not `getSession()`) is used on purpose: it revalidates the token
 * with the Supabase Auth server, so it can't be spoofed by a forged cookie.
 */

// Routes reachable without being logged in.
const PUBLIC_PREFIXES = [
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/auth", // OAuth callback + signout
  "/status", // Phase 0 health dashboard
  "/api", // API routes handle their own auth
];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

export async function updateSession(request: NextRequest) {
  // If Supabase isn't set up yet, don't touch anything — let the app render its
  // "configure Supabase" notices instead of failing on a fake host.
  if (!isSupabaseConfigured()) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        // Write to the request (so downstream reads see fresh values)...
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        // ...and rebuild the response so those cookies are sent to the browser.
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Not logged in and trying to reach a protected page → send to /login.
  if (!user && !isPublicPath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return response;
}
