import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Room, RoomPlayer } from "@/lib/game/rooms";
import Lobby from "./lobby";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return { title: `Room ${code.toUpperCase()} · StockXchange` };
}

function RoomNotFound({ code }: { code: string }) {
  return (
    <main className="mx-auto w-full max-w-md px-4 py-20 text-center">
      <h1 className="t-title text-ink">
        Room not found
      </h1>
      <p className="mt-2 text-sm text-ink-soft">
        No room with code <span className="font-semibold text-ink">{code}</span>
        . It may have closed or the code is wrong.
      </p>
      <Link
        href="/play/online"
        className="mt-6 inline-block rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover"
      >
        Back to Play Online
      </Link>
    </main>
  );
}

export default async function RoomPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: raw } = await params;
  const code = raw.toUpperCase();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: room } = await supabase
    .from("rooms")
    .select("id, code, host_id, status, config")
    .eq("code", code)
    .maybeSingle();

  if (!room) return <RoomNotFound code={code} />;

  const [{ data: players }, { data: profile }] = await Promise.all([
    supabase
      .from("room_players")
      .select("room_id, user_id, display_name, is_host, is_ready, joined_at")
      .eq("room_id", room.id)
      .order("joined_at", { ascending: true }),
    supabase.from("profiles").select("display_name").eq("id", user.id).single(),
  ]);

  return (
    <Lobby
      room={room as Room}
      initialPlayers={(players ?? []) as RoomPlayer[]}
      userId={user.id}
      displayName={profile?.display_name ?? user.email ?? "Player"}
    />
  );
}
