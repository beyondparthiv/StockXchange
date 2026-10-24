/**
 * Network-failure handling for Supabase calls.
 *
 * Supabase reports *API* errors by resolving with `{ error }` — a wrong
 * password, an expired token, an RLS denial. But a *transport* failure never
 * reaches the API: `fetch` rejects, so the promise rejects too. Call sites
 * that only destructure `{ error }` have no catch, so the rejection escapes as
 * an unhandled "TypeError: Failed to fetch" and the user gets a crash overlay
 * instead of the form's own error message.
 *
 * That is exactly what happens when the project URL is wrong, the project has
 * been deleted or paused, the user is offline, or a proxy blocks the host.
 * `attempt()` collapses the transport failure into the same `{ error }` shape
 * the SDK already uses, so one code path handles both.
 */

export const UNREACHABLE_MESSAGE =
  "Can't reach the server. Check your connection and try again.";

/**
 * A rejected `fetch` surfaces as a TypeError whose message varies by browser
 * ("Failed to fetch", "NetworkError when attempting to fetch resource",
 * "Load failed"). None of those mean anything to a player, so they all map to
 * one sentence. Anything else is a real error and keeps its own message.
 */
export function isTransportMessage(message: string): boolean {
  return /failed to fetch|networkerror|network error|load failed|err_name_not_resolved|fetch failed/i.test(
    message,
  );
}

export function toMessage(e: unknown): string {
  if (e instanceof TypeError) return UNREACHABLE_MESSAGE;
  if (e instanceof Error) {
    if (isTransportMessage(e.message)) return UNREACHABLE_MESSAGE;
    return e.message;
  }
  return "Something went wrong. Please try again.";
}

/**
 * Run a Supabase call so that a transport failure resolves as `{ error }`
 * rather than rejecting.
 *
 *   const { error } = await attempt(() =>
 *     supabase.auth.signInWithPassword({ email, password }),
 *   );
 *   if (error) return setError(error.message);
 */
export async function attempt<T extends { error: { message: string } | null }>(
  run: () => PromiseLike<T>,
): Promise<T | { data: null; error: { message: string } }> {
  try {
    const res = await run();
    // supabase-js usually catches the fetch rejection itself and hands back
    // `{ error: AuthRetryableFetchError }` whose message is the raw browser
    // string. That never reaches the catch below, so normalise it here too —
    // otherwise the user reads "Failed to fetch", which means nothing to them.
    if (res.error && isTransportMessage(res.error.message)) {
      return { data: null, error: { message: UNREACHABLE_MESSAGE } };
    }
    return res;
  } catch (e) {
    return { data: null, error: { message: toMessage(e) } };
  }
}
