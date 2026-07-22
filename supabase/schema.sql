-- StockXchange — Postgres schema
-- =====================================================================
-- Phase 0: schema STUB only. This file is the single source of truth for
-- the database. Each later phase appends its own tables here and re-runs
-- the relevant section in the Supabase SQL editor.
--
-- Run order: paste the whole file into Supabase Studio > SQL Editor, or use
-- the Supabase CLI (`supabase db reset`) once migrations are set up later.
-- =====================================================================

-- ---------------------------------------------------------------------
-- profiles
-- One row per authenticated user. Created on first login (Phase 1) via a
-- trigger on auth.users. For Phase 0 this is just the shape we intend to use.
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text,
  avatar_url   text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

comment on table public.profiles is 'Public-facing user profile, 1:1 with auth.users.';

-- Row Level Security: everyone can read profiles; a user may only modify
-- their own. (Policies are intentionally permissive-read for leaderboards.)
alter table public.profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
      and policyname = 'Profiles are viewable by everyone'
  ) then
    create policy "Profiles are viewable by everyone"
      on public.profiles for select using (true);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
      and policyname = 'Users can insert their own profile'
  ) then
    create policy "Users can insert their own profile"
      on public.profiles for insert with check (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'profiles'
      and policyname = 'Users can update their own profile'
  ) then
    create policy "Users can update their own profile"
      on public.profiles for update using (auth.uid() = id);
  end if;
end $$;

-- ---------------------------------------------------------------------
-- Auto-create a profile row on first login (Phase 1)
-- A trigger on auth.users guarantees every new user gets a public.profiles
-- row regardless of sign-up method (email, Google, phone). Runs as SECURITY
-- DEFINER so it can insert past RLS. display_name/avatar are pulled from the
-- auth metadata Supabase stores (Google fills full_name/avatar_url; email
-- signup passes display_name via options.data).
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(coalesce(new.email, ''), '@', 1),
      'Trader'
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep profiles.updated_at fresh on every update.
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- user_settings (Phase 3)
-- One row per user for preferences: sound, theme, and default room prefs.
-- Rows are created lazily (upserted) by the settings page rather than by a
-- trigger, so users who signed up before this table existed still work.
-- ---------------------------------------------------------------------
create table if not exists public.user_settings (
  user_id               uuid primary key references auth.users (id) on delete cascade,
  sound_enabled         boolean not null default true,
  theme                 text not null default 'light' check (theme in ('light', 'dark')),
  default_days          int not null default 10,
  default_starting_cash bigint not null default 15000000,
  default_companies     int not null default 6,
  default_round_timer   int not null default 90,
  updated_at            timestamptz not null default now()
);

comment on table public.user_settings is 'Per-user preferences (sound, theme, default room config).';

alter table public.user_settings enable row level security;

-- A user may only read/write their own settings row.
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_settings' and policyname='Users can view their own settings') then
    create policy "Users can view their own settings"
      on public.user_settings for select using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_settings' and policyname='Users can insert their own settings') then
    create policy "Users can insert their own settings"
      on public.user_settings for insert with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_settings' and policyname='Users can update their own settings') then
    create policy "Users can update their own settings"
      on public.user_settings for update using (auth.uid() = user_id);
  end if;
end $$;

drop trigger if exists user_settings_touch_updated_at on public.user_settings;
create trigger user_settings_touch_updated_at
  before update on public.user_settings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- Storage: avatars bucket (Phase 3)
-- Public bucket so avatar URLs render anywhere; writes are restricted to a
-- user's own folder (avatars/<uid>/...), enforced by policies on
-- storage.objects.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "Avatar images are publicly readable" on storage.objects;
create policy "Avatar images are publicly readable"
  on storage.objects for select
  using (bucket_id = 'avatars');

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can update their own avatar" on storage.objects;
create policy "Users can update their own avatar"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------------------------------------------------------------------
-- rooms + room_players (Phase 4)
-- A room is a multiplayer lobby identified by a short share code. Players
-- join, ready up, and the host starts the game. RLS keeps writes to your own
-- membership while allowing any authenticated user to read lobby state (so the
-- roster is visible to everyone in the room without recursive policies).
-- ---------------------------------------------------------------------
create table if not exists public.rooms (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  host_id    uuid not null references auth.users (id) on delete cascade,
  status     text not null default 'waiting' check (status in ('waiting', 'in_game', 'finished')),
  config     jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.rooms is 'Multiplayer lobby / game room keyed by a share code.';

create table if not exists public.room_players (
  room_id      uuid not null references public.rooms (id) on delete cascade,
  user_id      uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  is_host      boolean not null default false,
  is_ready     boolean not null default false,
  joined_at    timestamptz not null default now(),
  primary key (room_id, user_id)
);

comment on table public.room_players is 'Membership + ready-state for a room.';

alter table public.rooms enable row level security;
alter table public.room_players enable row level security;

-- rooms policies
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='rooms' and policyname='Authenticated users can read rooms') then
    create policy "Authenticated users can read rooms"
      on public.rooms for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='rooms' and policyname='Users can create rooms they host') then
    create policy "Users can create rooms they host"
      on public.rooms for insert to authenticated with check (auth.uid() = host_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='rooms' and policyname='Host can update their room') then
    create policy "Host can update their room"
      on public.rooms for update to authenticated using (auth.uid() = host_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='rooms' and policyname='Host can delete their room') then
    create policy "Host can delete their room"
      on public.rooms for delete to authenticated using (auth.uid() = host_id);
  end if;
end $$;

-- room_players policies
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='room_players' and policyname='Authenticated users can read room players') then
    create policy "Authenticated users can read room players"
      on public.room_players for select to authenticated using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='room_players' and policyname='Users can join as themselves') then
    create policy "Users can join as themselves"
      on public.room_players for insert to authenticated with check (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='room_players' and policyname='Users can update their own membership') then
    create policy "Users can update their own membership"
      on public.room_players for update to authenticated using (auth.uid() = user_id);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='room_players' and policyname='Users can leave rooms') then
    create policy "Users can leave rooms"
      on public.room_players for delete to authenticated using (auth.uid() = user_id);
  end if;
end $$;

-- Full row images so Realtime DELETE/UPDATE events carry filterable columns
-- (e.g. room_id) rather than just the primary key.
alter table public.rooms replica identity full;
alter table public.room_players replica identity full;

-- ---------------------------------------------------------------------
-- Realtime
-- Supabase Realtime broadcasts row changes over WebSocket channels to
-- subscribers (subject to RLS). Add lobby tables so clients see joins,
-- leaves, ready-state, and game start instantly. `add table` errors if the
-- table is already in the publication, so guard it.
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='rooms') then
    alter publication supabase_realtime add table public.rooms;
  end if;
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='room_players') then
    alter publication supabase_realtime add table public.room_players;
  end if;
end $$;

-- =====================================================================
-- End Phase 4 schema. Later phases append: games, game_players, orders,
-- price_history, news_batches, game_results.
-- =====================================================================
