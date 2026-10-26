"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toMessage } from "@/lib/supabase/errors";
import { GameScreen } from "@/components/game/game-screen";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { shortUSD } from "@/lib/game/config";
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
  // Set when a Supabase call fails at the transport level (project unreachable,
  // offline). Shown as a banner rather than thrown, so the lobby stays usable
  // with whatever roster it already has.
  const [connError, setConnError] = useState<string | null>(null);
  const isHost = userId === room.host_id;
  const me = players.find((p) => p.user_id === userId);

  // Refetch the full roster + room status. Called on mount and on any realtime
  // event — simpler and race-free for small lobbies than patching in place.
  const refresh = useCallback(async () => {
    try {
      const [{ data: pl }, { data: r }] = await Promise.all([
      supabase
        .from("room_players")
        .select("room_id, user_id, display_name, is_host, is_ready, joined_at")
        .eq("room_id", room.id)
        .order("joined_at", { ascending: true }),
        supabase.from("rooms").select("status").eq("id", room.id).maybeSingle(),
      ]);
      setConnError(null);
      if (pl) setPlayers(pl as RoomPlayer[]);
      if (r) setStatus(r.status as RoomStatus);
      else setClosed(true); // room row gone → host closed it
    } catch (e) {
      // Don't flip to "closed" here: an unreachable server is not the same as
      // a deleted room, and treating it as one would eject everyone on a blip.
      setConnError(toMessage(e));
    }
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

    setup().catch((e) => setConnError(toMessage(e)));
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
    try {
      await supabase
        .from("room_players")
        .update({ is_ready: next })
        .eq("room_id", room.id)
        .eq("user_id", userId);
    } catch (e) {
      // Roll the optimistic update back — the server never saw it.
      setPlayers((prev) =>
        prev.map((p) => (p.user_id === userId ? { ...p, is_ready: !next } : p)),
      );
      setConnError(toMessage(e));
    }
  }

  async function leave() {
    try {
      if (isHost) {
        await supabase.from("rooms").delete().eq("id", room.id);
      } else {
        await supabase
          .from("room_players")
          .delete()
          .eq("room_id", room.id)
          .eq("user_id", userId);
      }
    } catch {
      // Leaving is best-effort: if the server is unreachable the row will be
      // cleaned up server-side, and trapping the player here helps nobody.
    }
    router.push("/");
  }

  async function startGame() {
    try {
      await supabase
        .from("rooms")
        .update({ status: "in_game" })
        .eq("id", room.id);
    } catch (e) {
      setConnError(toMessage(e));
    }
  }

  function copyCode() {
    // Clipboard access is denied outside a secure context and in some
    // embedded browsers; a rejection here must not surface as a crash.
    navigator.clipboard
      ?.writeText(room.code)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
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
          className="cta mt-6 rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-hover"
        >
          Back to modes
        </button>
      </main>
    );
  }

  if (status === "in_game") {
    // Live: the host's client runs the game and publishes state; everyone
    // else renders what arrives and posts orders to the inbox.
    return (
      <GameScreen
        seats={players.map((p) => ({
          id: p.user_id,
          displayName: p.display_name,
        }))}
        meId={userId}
        config={room.config}
        live={{ roomId: room.id, isHost }}
      />
    );
  }

  const readyCount = players.filter((p) => p.is_ready).length;
  const canStart = players.length >= MIN_PLAYERS && readyCount === players.length;

  return (
    <main className="stagger mx-auto w-full max-w-2xl px-6 py-12">
      <h1 className="t-display text-ink">Lobby</h1>
      <p className="mt-1 text-sm text-ink-soft">
        Share the code so friends can join. The game starts when everyone&apos;s
        ready.
      </p>

      {connError && (
        <div className="animate-rise-in mt-4 rounded-md border border-down/35 bg-down/8 px-3 py-2 text-xs font-medium text-down">
          {connError}
        </div>
      )}

      {/* Room code */}
      <div className="mt-6 flex flex-col items-center gap-2 rounded-lg border border-line bg-surface p-6 shadow-panel">
        <span className="t-section">Room code</span>
        <div className="t-display font-mono tracking-[0.3em] text-accent">
          {room.code}
        </div>
        <button
          onClick={copyCode}
          className={`interactive mt-1 rounded-md border px-3 py-1.5 text-xs font-medium ${
            copied
              ? "border-up/40 bg-up/10 text-up"
              : "border-line-strong text-ink hover:bg-surface-2"
          }`}
        >
          {copied ? "Copied" : "Copy code"}
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

        <div className="stagger mt-3 space-y-2">
          {players.map((p) => (
            <div
              key={p.user_id}
              className="interactive flex items-center justify-between rounded-md border border-line bg-surface px-4 py-3 hover:border-line-strong"
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
                <span className="animate-fade-in rounded-md bg-up/12 px-2.5 py-1 text-xs font-medium text-up">
                  Ready
                </span>
              ) : (
                <span className="rounded-md bg-ink/8 px-2.5 py-1 text-xs font-medium text-ink-faint">
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
          <div className="t-section">Days</div>
          <div className="t-value mt-0.5 text-ink">{room.config.days}</div>
        </div>
        <div>
          <div className="t-section">Cash</div>
          <div className="t-value mt-0.5 text-ink">
            {shortUSD(room.config.startingCash)}
          </div>
        </div>
        <div>
          <div className="t-section">Companies</div>
          <div className="t-value mt-0.5 text-ink">{room.config.companies}</div>
        </div>
        <div>
          <div className="t-section">Timer</div>
          <div className="t-value mt-0.5 text-ink">
            {room.config.roundTimerSec}s
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <button
          onClick={toggleReady}
          className={`interactive flex-1 rounded-md px-4 py-2.5 text-sm font-medium ${
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
            className="cta flex-1 rounded-md bg-accent px-4 py-2.5 text-sm font-medium text-white hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
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
          className="interactive rounded-md border border-down/35 px-4 py-2.5 text-sm font-medium text-down hover:border-down/60 hover:bg-down/8"
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
