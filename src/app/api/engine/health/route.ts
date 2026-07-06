import { NextResponse } from "next/server";

/**
 * Server-side proxy to the Python price engine's /health endpoint.
 *
 * Why proxy instead of calling the engine directly from the browser:
 *  - keeps the engine URL server-only (can differ per environment),
 *  - avoids CORS entirely for the app's own calls,
 *  - gives one place to add auth/retries later.
 *
 * Returns 200 with `{ reachable: true, engine: {...} }` when the engine
 * responds, or 200 with `{ reachable: false, error }` when it is down — the UI
 * decides how to render either case, so a dead engine is not itself a 500.
 */
export async function GET() {
  const engineUrl = process.env.PRICE_ENGINE_URL ?? "http://localhost:8000";

  try {
    const res = await fetch(`${engineUrl}/health`, {
      // Never cache a liveness check.
      cache: "no-store",
      // Fail fast if the engine is not running.
      signal: AbortSignal.timeout(4000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { reachable: false, error: `Engine returned HTTP ${res.status}` },
        { status: 200 },
      );
    }

    const engine = await res.json();
    return NextResponse.json({ reachable: true, engine }, { status: 200 });
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Unknown error contacting engine";
    return NextResponse.json(
      { reachable: false, error: message },
      { status: 200 },
    );
  }
}
