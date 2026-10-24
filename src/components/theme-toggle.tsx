"use client";

import { useSyncExternalStore } from "react";
import { applyTheme, type Theme } from "@/lib/theme";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";

/**
 * Sun/moon switch for the current theme.
 *
 * The theme system itself already exists (`lib/theme.ts` + the no-flash script
 * in the root layout + the Light/Dark control in Settings). This is purely a
 * second, always-reachable entry point to it — Settings sits behind auth, so
 * without this there is no way to switch from the login or signup screens.
 *
 * Which icon shows is decided by CSS off `[data-theme]`, not by React state.
 * The inline head script sets that attribute before first paint, so the right
 * icon is correct in the very first frame — a state-driven version would paint
 * the wrong one and then correct itself. React is only involved in reporting
 * the state to assistive tech, which `useSyncExternalStore` does without the
 * setState-inside-an-effect pattern.
 *
 * `persist` controls whether the choice is written to `user_settings` as well
 * as localStorage. It must be true anywhere `ThemeApply` runs: that component
 * re-applies the server's saved value on mount, so a local-only toggle would
 * be silently reverted on the next navigation. Public pages pass false — there
 * is no user row to write to, and the localStorage cache is enough.
 */

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme"],
  });
  return () => observer.disconnect();
}

function getSnapshot(): Theme {
  return document.documentElement.getAttribute("data-theme") === "dark"
    ? "dark"
    : "light";
}

// The server can't know the cached preference. CSS fixes the visuals before
// paint regardless; this only seeds the pre-hydration aria state.
function getServerSnapshot(): Theme {
  return "light";
}

export function ThemeToggle({
  persist = false,
  className = "",
}: {
  persist?: boolean;
  className?: string;
}) {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const isDark = theme === "dark";

  async function toggle() {
    const next: Theme = getSnapshot() === "dark" ? "light" : "dark";
    applyTheme(next); // paints immediately and caches to localStorage

    if (!persist || !isSupabaseConfigured()) return;
    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      await supabase
        .from("user_settings")
        .upsert({ user_id: user.id, theme: next }, { onConflict: "user_id" });
    } catch {
      // Best-effort: the switch already happened locally, and the localStorage
      // cache carries it across reloads even if the write failed.
    }
  }

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={isDark}
      aria-label={`Switch to ${isDark ? "light" : "dark"} theme`}
      title={`Switch to ${isDark ? "light" : "dark"} theme`}
      className={`theme-toggle interactive relative grid h-7 w-7 place-items-center rounded-md ${className}`}
    >
      {/* Both icons stay mounted and cross-fade, so the swap is a transition
          rather than a pop. Visibility is CSS-driven — see globals.css. */}
      <SunIcon className="theme-icon theme-icon-sun" />
      <MoonIcon className="theme-icon theme-icon-moon" />
    </button>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M20 14.5A8.5 8.5 0 019.5 4a8.5 8.5 0 1010.5 10.5z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}
