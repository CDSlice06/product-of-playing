alter table public.custom_rooms add column if not exists owner_joined boolean not null default false;
alter table public.custom_rooms add column if not exists invited_joined boolean not null default false;

update public.custom_rooms
set owner_joined = true
where owner_joined = false
  and status <> 'closed';

update public.custom_rooms
set invited_joined = false
where status in ('waiting', 'ready');

drop policy if exists "owners manage rooms" on public.custom_rooms;
drop policy if exists "users can lookup joinable custom rooms" on public.custom_rooms;
drop policy if exists "users can create owned rooms" on public.custom_rooms;
drop policy if exists "owners or invited players update rooms" on public.custom_rooms;
drop policy if exists "owners can delete rooms" on public.custom_rooms;

create policy "users can create owned rooms"
on public.custom_rooms for insert
to authenticated
with check (auth.uid() = owner_id);

create policy "users can lookup joinable custom rooms"
on public.custom_rooms for select
to authenticated
using (status in ('waiting', 'ready'));

create policy "owners or invited players update rooms"
on public.custom_rooms for update
to authenticated
using (auth.uid() = owner_id or auth.uid() = invited_user_id or invited_user_id is null)
with check (auth.uid() = owner_id or auth.uid() = invited_user_id or auth.uid() = owner_id);

create policy "owners can delete rooms"
on public.custom_rooms for delete
to authenticated
using (auth.uid() = owner_id);

drop function if exists public.join_custom_room_by_code(text);
create or replace function public.join_custom_room_by_code(p_room_code text)
returns table (
  id uuid,
  room_code text,
  owner_id uuid,
  owner_joined boolean,
  invited_user_id uuid,
  invited_joined boolean,
  status text,
  ranked_enabled boolean,
  created_at timestamptz,
  owner jsonb,
  invited jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  normalized_code text := upper(trim(coalesce(p_room_code, '')));
  room_record public.custom_rooms%rowtype;
begin
  if current_user_id is null then
    raise exception '当前未登录，无法加入房间。';
  end if;

  if normalized_code = '' then
    raise exception '房间码不能为空。';
  end if;

  select *
  into room_record
  from public.custom_rooms
  where room_code = normalized_code
  limit 1
  for update;

  if not found then
    raise exception '找不到这个房间码。';
  end if;

  if room_record.status = 'closed' then
    raise exception '这个房间已经关闭，请让房主重新创建。';
  end if;

  if room_record.status = 'playing' and room_record.invited_user_id <> current_user_id and room_record.owner_id <> current_user_id then
    raise exception '这个房间已经在对局中，暂时不能再加入。';
  end if;

  if room_record.owner_id <> current_user_id
    and room_record.invited_user_id is not null
    and room_record.invited_user_id <> current_user_id then
    raise exception '这个房间已经有其他玩家加入，请让房主重新建房。';
  end if;

  if room_record.owner_id <> current_user_id then
    update public.custom_rooms
    set invited_user_id = current_user_id,
        invited_joined = false,
        status = 'waiting'
    where public.custom_rooms.id = room_record.id;
  else
    update public.custom_rooms
    set owner_joined = true
    where public.custom_rooms.id = room_record.id;
  end if;

  return query
  select
    cr.id,
    cr.room_code,
    cr.owner_id,
    cr.owner_joined,
    cr.invited_user_id,
    cr.invited_joined,
    cr.status,
    cr.ranked_enabled,
    cr.created_at,
    jsonb_build_object('display_name', owner_profile.display_name) as owner,
    case
      when invited_profile.id is null then null
      else jsonb_build_object('display_name', invited_profile.display_name)
    end as invited
  from public.custom_rooms cr
  join public.profiles owner_profile on owner_profile.id = cr.owner_id
  left join public.profiles invited_profile on invited_profile.id = cr.invited_user_id
  where cr.id = room_record.id;
end;
$$;

drop function if exists public.enter_custom_room_waiting(uuid);
create or replace function public.enter_custom_room_waiting(p_room_id uuid)
returns table (
  id uuid,
  room_code text,
  owner_id uuid,
  owner_joined boolean,
  invited_user_id uuid,
  invited_joined boolean,
  status text,
  ranked_enabled boolean,
  created_at timestamptz,
  owner jsonb,
  invited jsonb
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception '当前未登录，无法进入等待房间。';
  end if;

  update public.custom_rooms
  set
    owner_joined = case when owner_id = current_user_id then true else owner_joined end,
    invited_joined = case when invited_user_id = current_user_id then true else invited_joined end,
    status = case
      when status = 'closed' then status
      when invited_user_id is not null
        and (case when owner_id = current_user_id then true else owner_joined end)
        and (case when invited_user_id = current_user_id then true else invited_joined end)
      then 'ready'
      when status = 'playing' then status
      else 'waiting'
    end
  where public.custom_rooms.id = p_room_id
    and (owner_id = current_user_id or invited_user_id = current_user_id);

  if not found then
    raise exception '你不是这个房间的成员，无法进入等待房间。';
  end if;

  return query
  select
    cr.id,
    cr.room_code,
    cr.owner_id,
    cr.owner_joined,
    cr.invited_user_id,
    cr.invited_joined,
    cr.status,
    cr.ranked_enabled,
    cr.created_at,
    jsonb_build_object('display_name', owner_profile.display_name) as owner,
    case
      when invited_profile.id is null then null
      else jsonb_build_object('display_name', invited_profile.display_name)
    end as invited
  from public.custom_rooms cr
  join public.profiles owner_profile on owner_profile.id = cr.owner_id
  left join public.profiles invited_profile on invited_profile.id = cr.invited_user_id
  where cr.id = p_room_id;
end;
$$;
