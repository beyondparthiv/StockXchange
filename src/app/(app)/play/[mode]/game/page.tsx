import { notFound } from "next/navigation";
import { isGameMode } from "@/lib/game/config";
import OfflineGame from "./offline-game";

export const metadata = { title: "Trading floor · StockXchange" };

/**
 * Offline game board: Play vs Bots and Practice Solo.
 *
 * Deliberately separate from `/room/[code]`, which is the multiplayer path.
 * An offline game needs no room, no roster sync and no realtime — it runs
 * entirely in the browser against the price engine, which is what makes it
 * the fastest way to play a full game end to end.
 */
export default async function OfflineGamePage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;
  if (!isGameMode(mode) || mode === "online") notFound();

  return <OfflineGame mode={mode} />;
}
