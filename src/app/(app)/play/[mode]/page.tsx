import { notFound } from "next/navigation";
import { isGameMode } from "@/lib/game/config";
import ConfigScreen from "./config-screen";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;
  return { title: `Configure ${mode} · StockXchange` };
}

/**
 * Server wrapper: in Next 16 `params` is a Promise, so we await it, validate the
 * mode segment, and hand a typed mode to the interactive client screen.
 */
export default async function PlayConfigPage({
  params,
}: {
  params: Promise<{ mode: string }>;
}) {
  const { mode } = await params;
  if (!isGameMode(mode)) notFound();

  return <ConfigScreen mode={mode} />;
}
