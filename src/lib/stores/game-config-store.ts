import { create } from "zustand";
import { persist } from "zustand/middleware";
import { DEFAULT_CONFIG, type GameConfig } from "@/lib/game/config";

/**
 * Client-side store for the game configuration the player is setting up.
 *
 * Persisted to localStorage so a chosen setup survives navigation and reloads
 * — it doubles as the "default room preferences" until Phase 3 stores those in
 * Supabase. Zustand is the app's chosen state manager; this is its first use.
 */
type GameConfigStore = {
  config: GameConfig;
  setConfig: (patch: Partial<GameConfig>) => void;
  reset: () => void;
};

export const useGameConfigStore = create<GameConfigStore>()(
  persist(
    (set) => ({
      config: DEFAULT_CONFIG,
      setConfig: (patch) =>
        set((state) => ({ config: { ...state.config, ...patch } })),
      reset: () => set({ config: DEFAULT_CONFIG }),
    }),
    { name: "stockxchange-game-config" },
  ),
);
