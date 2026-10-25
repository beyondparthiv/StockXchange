"use client";

import { useSyncExternalStore } from "react";
import { useGameConfigStore } from "@/lib/stores/game-config-store";

/**
 * Whether the persisted game config has been read back from localStorage.
 *
 * Anything that reads the config once — the board captures it in a useState
 * initialiser — must wait for this, or a player who chose a 60-second timer
 * silently gets the 90-second default.
 *
 * useSyncExternalStore rather than an effect + setState: hydration is
 * external state, the server snapshot is simply "false", and this avoids
 * both the SSR crash (`.persist` does not exist while rendering on the
 * server) and the cascading render that calling setState in an effect
 * would cause.
 */
export function useConfigHydrated(): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const persist = useGameConfigStore.persist;
      if (!persist) return () => {};
      return persist.onFinishHydration(onChange);
    },
    () => useGameConfigStore.persist?.hasHydrated() ?? true,
    () => false,
  );
}
