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

drop function if exists public.ensure_battle_session(uuid, jsonb);
create or replace function public.ensure_battle_session(p_room_id uuid, p_initial_state jsonb)
returns table (
  id uuid,
  room_id uuid,
  match_type text,
  status text,
  player1_user_id uuid,
  player1_name text,
  player2_user_id uuid,
  player2_name text,
  version integer,
  winner_user_id uuid,
  created_at timestamptz,
  updated_at timestamptz,
  room jsonb,
  state jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  room_record record;
  session_record public.battle_sessions%rowtype;
  session_state jsonb := coalesce(p_initial_state, '{}'::jsonb);
begin
  if current_user_id is null then
    raise exception '当前未登录，无法初始化联机战斗。';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_room_id::text, 0));

  select
    cr.id,
    cr.room_code,
    cr.owner_id,
    cr.owner_joined,
    cr.invited_user_id,
    cr.invited_joined,
    cr.ranked_enabled,
    cr.status,
    owner_profile.display_name as owner_name,
    invited_profile.display_name as invited_name
  into room_record
  from public.custom_rooms cr
  join public.profiles owner_profile on owner_profile.id = cr.owner_id
  left join public.profiles invited_profile on invited_profile.id = cr.invited_user_id
  where cr.id = p_room_id
  limit 1
  for update of cr;

  if not found then
    raise exception '找不到这个联机房间。';
  end if;

  if current_user_id <> room_record.owner_id and current_user_id <> room_record.invited_user_id then
    raise exception '你不是这个房间的参与者。';
  end if;

  if room_record.invited_user_id is null then
    raise exception '房间还没有第二位玩家，暂时不能进入联机对局。';
  end if;

  if not room_record.owner_joined or not room_record.invited_joined then
    raise exception '双方尚未同时进入等待房间，暂时不能进入联机对局。';
  end if;

  if room_record.status <> 'playing' then
    raise exception '房主尚未开始对局。';
  end if;

  select *
  into session_record
  from public.battle_sessions
  where public.battle_sessions.room_id = p_room_id
  limit 1
  for update;

  if found then
    return query
    select
      bs.id,
      bs.room_id,
      bs.match_type,
      bs.status,
      bs.player1_user_id,
      bs.player1_name,
      bs.player2_user_id,
      bs.player2_name,
      bs.version,
      bs.winner_user_id,
      bs.created_at,
      bs.updated_at,
      jsonb_build_object('room_code', room_record.room_code) as room,
      bs.state
    from public.battle_sessions bs
    where bs.id = session_record.id;
    return;
  end if;

  session_state := jsonb_set(session_state, '{gameMode}', to_jsonb('pvp'::text), true);
  session_state := jsonb_set(session_state, '{aiDifficulty}', to_jsonb('medium'::text), true);
  session_state := jsonb_set(session_state, '{players,player1,name}', to_jsonb(room_record.owner_name), true);
  session_state := jsonb_set(session_state, '{players,player2,name}', to_jsonb(coalesce(room_record.invited_name, '玩家2')), true);

  insert into public.battle_sessions (
    room_id,
    match_type,
    status,
    player1_user_id,
    player1_name,
    player2_user_id,
    player2_name,
    state,
    version,
    winner_user_id
  )
  values (
    room_record.id,
    case when room_record.ranked_enabled then 'ranked' else 'custom' end,
    'playing',
    room_record.owner_id,
    room_record.owner_name,
    room_record.invited_user_id,
    coalesce(room_record.invited_name, '玩家2'),
    session_state,
    1,
    null
  )
  returning * into session_record;

  return query
  select
    bs.id,
    bs.room_id,
    bs.match_type,
    bs.status,
    bs.player1_user_id,
    bs.player1_name,
    bs.player2_user_id,
    bs.player2_name,
    bs.version,
    bs.winner_user_id,
    bs.created_at,
    bs.updated_at,
    jsonb_build_object('room_code', room_record.room_code) as room,
    bs.state
  from public.battle_sessions bs
  where bs.id = session_record.id;
end;
$$;

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
