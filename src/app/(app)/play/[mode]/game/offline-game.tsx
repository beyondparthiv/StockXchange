"use client";

import { useEffect, useState } from "react";
import { GameScreen } from "@/components/game/game-screen";
import { botSeats } from "@/lib/game/mock";
import { useGameConfigStore } from "@/lib/stores/game-config-store";
import type { GameMode } from "@/lib/game/config";

/**
 * Sets up an offline table and hands it to the board.
 *
 * "bots" fills the other seats with opponents that actually trade;
 * "solo" is the same market with nobody else at the table, for learning the
 * mechanics without the leaderboard pressure.
 *
 * The config comes from the store the config screen writes to, so the days,
 * starting cash and timer the player chose are the ones they get.
 */
export default function OfflineGame({ mode }: { mode: GameMode }) {
  const { config } = useGameConfigStore();

  /*
   * Wait for the persisted config before starting the game.
   *
   * The store rehydrates from localStorage after mount, and the board reads
   * its config once in a useState initialiser. Rendering immediately meant
   * a player who chose a 60-second timer silently got the 90-second
   * default — the settings screen appeared to do nothing.
   */
  const [hydrated, setHydrated] = useState(() =>
    useGameConfigStore.persist.hasHydrated(),
  );
  useEffect(() => {
    if (hydrated) return;
    return useGameConfigStore.persist.onFinishHydration(() =>
      setHydrated(true),
    );
  }, [hydrated]);

  if (!hydrated) {
    return (
      <main className="mx-auto w-full max-w-sm px-6 py-16">
        <div className="skeleton h-40 rounded-lg border border-line" />
      </main>
    );
  }

  const seats = [
    { id: "me", displayName: "You" },
    ...(mode === "bots" ? botSeats(3) : []),
  ];

  return <GameScreen seats={seats} meId="me" config={config} />;
}
