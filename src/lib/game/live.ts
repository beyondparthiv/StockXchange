"use client";

import { createClient } from "@/lib/supabase/client";
import { applyOrder } from "@/lib/game/orders";
import type { GameState, TradeSide } from "@/lib/game/state";

/**
 * Live multiplayer sync.
 *
 * The host's client is the authority. It owns the clock, applies each
 * round's orders, calls the price engine and writes the result to
 * `games.state`. Every other client subscribes to that row and renders it.
 *
 * Players never mutate shared state. They post an intent to `game_orders`
 * and the host applies it through the same `applyOrder` path bots use, so
 * affordability, ownership and one-action-per-round are enforced once
 * rather than trusted to each browser. A player editing their own client
 * can therefore cheat themselves and nobody else.
 *
 * The trade: if the host closes their laptop the game stops. For friends
 * playing in one sitting that is the right simplicity; surviving a host
 * leaving needs a server-side clock.
 */

export type PendingOrder = {
  user_id: string;
  side: TradeSide | "pass";
  ticker: string | null;
  qty: number;
};

/** Create the room's game row. Host only — RLS enforces it. */
export async function createLiveGame(
  roomId: string,
  hostId: string,
  state: GameState,
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("games")
    .upsert(
      { room_id: roomId, host_id: hostId, state },
      { onConflict: "room_id" },
    );
  return error?.message ?? null;
}

/** Publish the authoritative state. Host only. */
export async function pushLiveState(roomId: string, state: GameState) {
  const supabase = createClient();
  const { error } = await supabase
    .from("games")
    .update({ state, updated_at: new Date().toISOString() })
    .eq("room_id", roomId);
  return error?.message ?? null;
}

/** Read the current state, for a client joining mid-game. */
export async function fetchLiveState(roomId: string): Promise<GameState | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("games")
    .select("state")
    .eq("room_id", roomId)
    .maybeSingle();
  return (data?.state as GameState) ?? null;
}

/**
 * Subscribe to state pushes.
 *
 * Returns an unsubscribe function. Realtime delivers the whole row, so a
 * client can never see a half-applied round — which is the main reason the
 * state is one JSONB blob rather than a dozen normalised tables.
 */
export function subscribeLiveState(
  roomId: string,
  onState: (state: GameState) => void,
) {
  const supabase = createClient();
  const channel = supabase
    .channel(`game:${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "games",
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        const row = payload.new as { state?: GameState } | null;
        if (row?.state) onState(row.state);
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/**
 * Post this player's action for the round.
 *
 * The unique constraint on (room, user, day, round) means a second
 * submission is rejected by the database rather than by hoping the client
 * behaves — one action per round holds even against a tampered client.
 */
export async function submitLiveOrder(
  roomId: string,
  userId: string,
  day: number,
  round: number,
  side: TradeSide | "pass",
  ticker: string | null,
  qty: number,
) {
  const supabase = createClient();
  const { error } = await supabase.from("game_orders").insert({
    room_id: roomId,
    user_id: userId,
    day,
    round,
    side,
    ticker,
    qty,
  });
  // 23505 is unique_violation: the player already acted this round. That is
  // the rule working, not a failure worth surfacing as an error.
  if (error && !error.message.includes("duplicate")) return error.message;
  return null;
}

/** Every order posted for a given round. Host only, at settlement. */
export async function fetchRoundOrders(
  roomId: string,
  day: number,
  round: number,
): Promise<PendingOrder[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("game_orders")
    .select("user_id, side, ticker, qty")
    .eq("room_id", roomId)
    .eq("day", day)
    .eq("round", round);
  return (data as PendingOrder[]) ?? [];
}

/**
 * Apply a round's posted orders to the state, in submission order.
 *
 * Runs through `applyOrder`, so an order that was affordable when posted
 * but is not when applied is simply rejected — the same rule a local order
 * meets. Rejections are silent by design: the player already saw their
 * intent accepted, and the round result will show it did not fill.
 */
export function applyPendingOrders(
  state: GameState,
  orders: PendingOrder[],
): GameState {
  let next = state;
  for (const o of orders) {
    if (o.side === "pass" || !o.ticker || o.qty < 1) {
      next = {
        ...next,
        players: next.players.map((p) =>
          p.id === o.user_id ? { ...p, actedThisRound: true } : p,
        ),
      };
      continue;
    }
    const res = applyOrder(next, o.user_id, o.side, o.ticker, o.qty);
    next = res.filled
      ? res.state
      : {
          ...next,
          players: next.players.map((p) =>
            p.id === o.user_id ? { ...p, actedThisRound: true } : p,
          ),
        };
  }
  return next;
}
