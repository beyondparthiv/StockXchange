-- =====================================================================
-- Live multiplayer game state (Phase 5)
--
-- One row per room holding the whole game as JSONB, plus an order inbox.
--
-- Why one JSONB blob rather than normalised tables for quotes, holdings
-- and signals: the entire state changes together at each settlement and is
-- always read as a whole, so a single row is one realtime event instead of
-- a dozen, and clients can never render a half-applied round. It is also
-- the shape `src/lib/game/state.ts` already uses, so there is no mapping
-- layer to keep in sync.
--
-- The HOST's client is the authority: it owns the clock, applies the
-- round's orders, calls the price engine and writes the result. Everyone
-- else subscribes and renders. That is the honest trade for a game played
-- by friends in one sitting — simple and robust while the host is present,
-- and it stops if the host leaves. A server-driven clock would survive
-- that but needs scheduled functions.
-- ---------------------------------------------------------------------
create table if not exists public.games (
  room_id    uuid primary key references public.rooms (id) on delete cascade,
  host_id    uuid not null references auth.users (id) on delete cascade,
  state      jsonb not null,
  updated_at timestamptz not null default now()
);

comment on table public.games is 'Authoritative game state per room, written by the host client.';

alter table public.games enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='games' and policyname='Players in the room can read the game') then
    create policy "Players in the room can read the game"
      on public.games for select to authenticated
      using (
        exists (
          select 1 from public.room_players rp
          where rp.room_id = games.room_id and rp.user_id = auth.uid()
        )
      );
  end if;

  -- Only the host writes state. Without this any player could rewrite the
  -- market, which in a competitive game is the whole ballgame.
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='games' and policyname='Host can create the game') then
    create policy "Host can create the game"
      on public.games for insert to authenticated
      with check (auth.uid() = host_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='games' and policyname='Host can update the game') then
    create policy "Host can update the game"
      on public.games for update to authenticated
      using (auth.uid() = host_id);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- game_orders — the order inbox
--
-- Players never mutate game state. They post an intent here; the host
-- applies it at settlement through the same applyOrder path bots use, so
-- affordability, ownership and the one-action-per-round rule are enforced
-- in one place rather than trusted to each client.
-- ---------------------------------------------------------------------
create table if not exists public.game_orders (
  id         uuid primary key default gen_random_uuid(),
  room_id    uuid not null references public.rooms (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  day        int  not null,
  round      int  not null,
  side       text not null check (side in ('buy', 'sell', 'short', 'pass')),
  ticker     text,
  qty        int  not null default 0 check (qty >= 0),
  created_at timestamptz not null default now(),
  -- One action per round, enforced by the database rather than by hoping
  -- every client behaves.
  unique (room_id, user_id, day, round)
);

comment on table public.game_orders is 'Per-player order intents, applied by the host at settlement.';

alter table public.game_orders enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='game_orders' and policyname='Players in the room can read orders') then
    create policy "Players in the room can read orders"
      on public.game_orders for select to authenticated
      using (
        exists (
          select 1 from public.room_players rp
          where rp.room_id = game_orders.room_id and rp.user_id = auth.uid()
        )
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='game_orders' and policyname='Players can post their own orders') then
    create policy "Players can post their own orders"
      on public.game_orders for insert to authenticated
      with check (auth.uid() = user_id);
  end if;
end $$;

alter table public.games replica identity full;
alter table public.game_orders replica identity full;

do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='games') then
    alter publication supabase_realtime add table public.games;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='game_orders') then
    alter publication supabase_realtime add table public.game_orders;
  end if;
end $$;
