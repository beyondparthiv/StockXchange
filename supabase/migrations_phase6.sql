-- =====================================================================
-- Many orders per round (Phase 6)
--
-- A round used to allow each player one order, enforced here by a unique
-- constraint on (room_id, user_id, day, round). A round is now an open
-- trading window: you trade as often as cash, holdings and the clock
-- allow, so that constraint has to go or every order after a player's
-- first is rejected by the database.
--
-- What still protects the game is unchanged and lives in applyOrder,
-- which the host runs over these rows at settlement: affordability,
-- ownership and collateral are checked on every order. Dropping this
-- constraint lets a player post many intents; it does not let them post
-- an intent that fills without the cash for it.
--
-- created_at already exists and is what the host now sorts by, so orders
-- apply in the sequence they were placed. Without an explicit order a
-- buy could be applied before the sell that funded it and be refused for
-- no reason the player could see.
-- ---------------------------------------------------------------------
alter table public.game_orders
  drop constraint if exists game_orders_room_id_user_id_day_round_key;

-- The host reads a round's orders by room/day/round and replays them in
-- submission order; this index covers exactly that read.
create index if not exists game_orders_round_idx
  on public.game_orders (room_id, day, round, created_at);

comment on table public.game_orders is
  'Per-player order intents, applied by the host in submission order at settlement. Many rows per player per round.';
