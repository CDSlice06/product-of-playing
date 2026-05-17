create table if not exists public.battle_sessions (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null unique references public.custom_rooms (id) on delete cascade,
  match_type text not null check (match_type in ('ranked', 'custom')),
  status text not null default 'playing' check (status in ('waiting', 'playing', 'finished')),
  player1_user_id uuid not null references public.profiles (id) on delete cascade,
  player1_name text not null,
  player2_user_id uuid not null references public.profiles (id) on delete cascade,
  player2_name text not null,
  state jsonb not null,
  version integer not null default 1,
  winner_user_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (player1_user_id <> player2_user_id)
);

alter table public.battle_sessions enable row level security;

drop policy if exists "battle participants can read sessions" on public.battle_sessions;
create policy "battle participants can read sessions"
on public.battle_sessions for select
to authenticated
using (auth.uid() = player1_user_id or auth.uid() = player2_user_id);

drop policy if exists "battle participants can create sessions" on public.battle_sessions;
create policy "battle participants can create sessions"
on public.battle_sessions for insert
to authenticated
with check (
  (auth.uid() = player1_user_id or auth.uid() = player2_user_id)
  and exists (
    select 1
    from public.custom_rooms
    where id = room_id
      and (
        auth.uid() = owner_id
        or auth.uid() = invited_user_id
      )
  )
);

drop policy if exists "battle participants can update sessions" on public.battle_sessions;
create policy "battle participants can update sessions"
on public.battle_sessions for update
to authenticated
using (auth.uid() = player1_user_id or auth.uid() = player2_user_id)
with check (auth.uid() = player1_user_id or auth.uid() = player2_user_id);

do $$
begin
  if not exists (
    select 1
    from pg_publication_rel rel
    join pg_class cls on cls.oid = rel.prrelid
    join pg_namespace nsp on nsp.oid = cls.relnamespace
    join pg_publication pub on pub.oid = rel.prpubid
    where pub.pubname = 'supabase_realtime'
      and nsp.nspname = 'public'
      and cls.relname = 'battle_sessions'
  ) then
    alter publication supabase_realtime add table public.battle_sessions;
  end if;
end
$$;
