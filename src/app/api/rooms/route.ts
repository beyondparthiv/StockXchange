import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { DEFAULT_CONFIG, type GameConfig } from "@/lib/game/config";
import { generateRoomCode } from "@/lib/game/rooms";

const UNIQUE_VIOLATION = "23505";

/**
 * Create a room. The caller becomes the host and first player.
 *
 * Runs server-side so it can use the session to set host_id and retry on the
 * (rare) event of a room-code collision — the unique constraint on rooms.code
 * is the source of truth, and we just regenerate and retry a few times.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as Partial<GameConfig>;
  const config: GameConfig = {
    days: body.days ?? DEFAULT_CONFIG.days,
    startingCash: body.startingCash ?? DEFAULT_CONFIG.startingCash,
    companies: body.companies ?? DEFAULT_CONFIG.companies,
    roundTimerSec: body.roundTimerSec ?? DEFAULT_CONFIG.roundTimerSec,
  };

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .single();
  const displayName = profile?.display_name ?? user.email ?? "Host";

  // Insert the room, retrying on code collisions.
  let room: { id: string; code: string } | null = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateRoomCode();
    const { data, error } = await supabase
      .from("rooms")
      .insert({ code, host_id: user.id, status: "waiting", config })
      .select("id, code")
      .single();

    if (!error) {
      room = data;
      break;
    }
    if (error.code !== UNIQUE_VIOLATION) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  if (!room) {
    return NextResponse.json(
      { error: "Could not generate a unique room code. Try again." },
      { status: 500 },
    );
  }

  const { error: joinError } = await supabase.from("room_players").insert({
    room_id: room.id,
    user_id: user.id,
    display_name: displayName,
    is_host: true,
    is_ready: false,
  });
  if (joinError) {
    return NextResponse.json({ error: joinError.message }, { status: 500 });
  }

  return NextResponse.json({ code: room.code });
}
