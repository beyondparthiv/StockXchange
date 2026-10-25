"use client";

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

  const seats = [
    { id: "me", displayName: "You" },
    ...(mode === "bots" ? botSeats(3) : []),
  ];

  return <GameScreen seats={seats} meId="me" config={config} />;
}
