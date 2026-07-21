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
-- Realtime
-- Supabase Realtime broadcasts row changes over WebSocket channels. We add
-- tables to the `supabase_realtime` publication as we create them. Lobby and
-- game-state tables (Phase 4+) will be added here so clients get live sync.
-- ---------------------------------------------------------------------
-- Example (uncomment once the table exists):
-- alter publication supabase_realtime add table public.room_players;

-- =====================================================================
-- End Phase 0 schema. Later phases append: user_settings, rooms,
-- room_players, games, game_players, orders, price_history, news_batches,
-- game_results.
-- =====================================================================
