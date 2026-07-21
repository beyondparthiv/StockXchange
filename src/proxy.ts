import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

/**
 * Next 16 Proxy (formerly Middleware). Runs before matched requests to keep the
 * Supabase session fresh and gate protected routes. See
 * `src/lib/supabase/proxy.ts` for the logic.
 */
export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match everything except:
     *  - Next internals (_next/static, _next/image)
     *  - the favicon and common image assets
     * Auth cookies still need refreshing on API routes, so those are included.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
