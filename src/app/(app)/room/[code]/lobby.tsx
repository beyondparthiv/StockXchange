"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { shortINR } from "@/lib/game/config";
import {
  MAX_PLAYERS,
  MIN_PLAYERS,
  type Room,
  type RoomPlayer,
  type RoomStatus,
} from "@/lib/game/rooms";

export default function Lobby({
  room,
  initialPlayers,
  userId,
  displayName,
}: {
  room: Room;
  initialPlayers: RoomPlayer[];
  userId: string;
  displayName: string;
}) {
  const router = useRouter();
  const supabase = createClient();

  const [players, setPlayers] = useState<RoomPlayer[]>(initialPlayers);
  const [status, setStatus] = useState<RoomStatus>(room.status);
  const [closed, setClosed] = useState(false);
  const [copied, setCopied] = useState(false);
  const isHost = userId === room.host_id;
  const me = players.find((p) => p.user_id === userId);

  // Refetch the full roster + room status. Called on mount and on any realtime
  // event — simpler and race-free for small lobbies than patching in place.
  const refresh = useCallback(async () => {
    const [{ data: pl }, { data: r }] = await Promise.all([
      supabase
        .from("room_players")
        .select("room_id, user_id, display_name, is_host, is_ready, joined_at")
        .eq("room_id", room.id)
        .order("joined_at", { ascending: true }),
      supabase.from("rooms").select("status").eq("id", room.id).maybeSingle(),
    ]);
    if (pl) setPlayers(pl as RoomPlayer[]);
    if (r) setStatus(r.status as RoomStatus);
    else setClosed(true); // room row gone → host closed it
  }, [room.id, supabase]);

  const joinedRef = useRef(false);
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function setup() {
      // Ensure realtime uses our auth token so RLS lets us receive changes.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) supabase.realtime.setAuth(session.access_token);

      // Join the room (idempotent) if it's still open.
      if (!joinedRef.current && room.status === "waiting") {
        joinedRef.current = true;
        await supabase.from("room_players").upsert(
          {
            room_id: room.id,
            user_id: userId,
            display_name: displayName,
            is_host: isHost,
            is_ready: false,
          },
          { onConflict: "room_id,user_id", ignoreDuplicates: true },
        );
      }

      await refresh();

      channel = supabase
        .channel(`room:${room.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "room_players",
            filter: `room_id=eq.${room.id}`,
          },
          () => refresh(),
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "rooms",
            filter: `id=eq.${room.id}`,
          },
          (payload) => {
            if (payload.eventType === "DELETE") setClosed(true);
            else if (payload.new && "status" in payload.new)
              setStatus((payload.new as { status: RoomStatus }).status);
          },
        )
        .subscribe();
    }

    setup();
    return () => {
      if (channel) supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function toggleReady() {
    if (!me) return;
    const next = !me.is_ready;
    // Optimistic update; realtime refresh will reconcile.
    setPlayers((prev) =>
      prev.map((p) => (p.user_id === userId ? { ...p, is_ready: next } : p)),
    );
    await supabase
      .from("room_players")
      .update({ is_ready: next })
      .eq("room_id", room.id)
      .eq("user_id", userId);
  }

  async function leave() {
    if (isHost) {
      await supabase.from("rooms").delete().eq("id", room.id);
    } else {
      await supabase
        .from("room_players")
        .delete()
        .eq("room_id", room.id)
        .eq("user_id", userId);
    }
    router.push("/");
  }

  async function startGame() {
    await supabase
      .from("rooms")
      .update({ status: "in_game" })
      .eq("id", room.id);
  }

  function copyCode() {
    navigator.clipboard?.writeText(room.code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  // --- Terminal states -----------------------------------------------------
  if (closed) {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-20 text-center">
        <h1 className="t-title text-ink">
          Room closed
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          The host ended this room.
        </p>
        <button
          onClick={() => router.push("/")}
          className="mt-6 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-accent-hover"
        >
          Back to tables
        </button>
      </main>
    );
  }

  if (status === "in_game") {
    return (
      <main className="mx-auto w-full max-w-md px-4 py-20 text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-spin rounded-full border-2 border-line-strong border-t-accent" />
        <h1 className="t-title text-ink">
          Game starting…
        </h1>
        <p className="mt-2 text-sm text-ink-soft">
          The live trading floor arrives in Phase 5. For now, the room has
          started.
        </p>
      </main>
    );
  }

  const readyCount = players.filter((p) => p.is_ready).length;
  const canStart = players.length >= MIN_PLAYERS && readyCount === players.length;

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-12">
      <h1 className="t-display text-ink">
        Lobby
      </h1>
      <p className="mt-1 text-sm text-ink-soft">
        Share the code so friends can join. The game starts when everyone&apos;s
        ready.
      </p>

      {/* Room code */}
      <div className="mt-6 flex flex-col items-center gap-2 rounded-lg border border-line bg-surface p-6 shadow-panel">
        <span className="text-xs font-semibold uppercase tracking-widest text-ink-soft">
          Room code
        </span>
        <div className="t-display tracking-[0.3em] text-accent">
          {room.code}
        </div>
        <button
          onClick={copyCode}
          className="mt-1 rounded-lg border border-line-strong px-3 py-1.5 text-xs font-semibold text-ink transition hover:bg-surface-2"
        >
          {copied ? "Copied!" : "Copy code"}
        </button>
      </div>

      {/* Players */}
      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-ink">
            Players
          </h2>
          <span className="text-sm text-ink-soft">
            {players.length}/{MAX_PLAYERS} · {readyCount} ready
          </span>
        </div>

        <div className="mt-3 space-y-2">
          {players.map((p) => (
            <div
              key={p.user_id}
              className="flex items-center justify-between rounded-md border border-line bg-surface px-4 py-3"
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-soft text-sm font-bold text-accent">
                  {p.display_name.charAt(0).toUpperCase()}
                </span>
                <div>
                  <div className="text-sm font-semibold text-ink">
                    {p.display_name}
                    {p.user_id === userId && (
                      <span className="text-ink-soft"> (you)</span>
                    )}
                  </div>
                  {p.is_host && (
                    <div className="text-xs font-semibold text-accent">Host</div>
                  )}
                </div>
              </div>
              {p.is_ready ? (
                <span className="rounded-full bg-up/15 px-3 py-1 text-xs font-semibold text-up">
                  Ready
                </span>
              ) : (
                <span className="rounded-full bg-ink/10 px-3 py-1 text-xs font-semibold text-ink-soft">
                  Not ready
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Config summary */}
      <div className="mt-6 grid grid-cols-2 gap-3 rounded-lg border border-line bg-surface-2 p-4 text-sm sm:grid-cols-4">
        <div>
          <div className="text-ink-soft">Days</div>
          <div className="font-semibold text-ink">{room.config.days}</div>
        </div>
        <div>
          <div className="text-ink-soft">Cash</div>
          <div className="font-semibold text-ink">
            {shortINR(room.config.startingCash)}
          </div>
        </div>
        <div>
          <div className="text-ink-soft">Companies</div>
          <div className="font-semibold text-ink">{room.config.companies}</div>
        </div>
        <div>
          <div className="text-ink-soft">Timer</div>
          <div className="font-semibold text-ink">
            {room.config.roundTimerSec}s
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={toggleReady}
          className={`flex-1 rounded-md px-4 py-3 text-sm font-semibold transition ${
            me?.is_ready
              ? "border border-line-strong text-ink hover:bg-surface-2"
              : "bg-up text-white hover:bg-up-bright"
          }`}
        >
          {me?.is_ready ? "Not ready" : "I'm ready"}
        </button>

        {isHost && (
          <button
            onClick={startGame}
            disabled={!canStart}
            className="flex-1 rounded-md bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
            title={
              !canStart
                ? `Need ${MIN_PLAYERS}+ players, all ready`
                : "Start the game"
            }
          >
            Start game
          </button>
        )}

        <button
          onClick={leave}
          className="rounded-md border border-down/40 px-4 py-3 text-sm font-semibold text-down transition hover:bg-down/10"
        >
          {isHost ? "Close room" : "Leave"}
        </button>
      </div>

      {isHost && !canStart && (
        <p className="mt-2 text-center text-xs text-ink-soft">
          Need at least {MIN_PLAYERS} players, all marked ready, to start.
        </p>
      )}
    </main>
  );
}
