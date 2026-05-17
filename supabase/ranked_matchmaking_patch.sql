create or replace function public.get_rank_tier_name(p_points integer)
returns text
language plpgsql
immutable
as $$
declare
  safe_points integer := greatest(coalesce(p_points, 0), 0);
begin
  if safe_points >= 1200 then
    return '元卜';
  elsif safe_points >= 920 then
    return '星衡';
  elsif safe_points >= 700 then
    return '冥枢';
  elsif safe_points >= 530 then
    return '御卜';
  elsif safe_points >= 390 then
    return '渡尘';
  elsif safe_points >= 280 then
    return '溯缘';
  elsif safe_points >= 190 then
    return '窥命';
  elsif safe_points >= 120 then
    return '观爻';
  elsif safe_points >= 70 then
    return '通绪';
  elsif safe_points >= 30 then
    return '知影';
  end if;

  return '知灵';
end;
$$;

create or replace function public.generate_ranked_room_code()
returns text
language plpgsql
as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  candidate text;
  index_value integer;
begin
  loop
    candidate := '';
    for index_value in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::integer, 1);
    end loop;

    exit when not exists (
      select 1
      from public.custom_rooms
      where room_code = candidate
    );
  end loop;

  return candidate;
end;
$$;

drop function if exists public.join_rank_queue();
create or replace function public.join_rank_queue()
returns table (
  matched boolean,
  room_id uuid,
  room_code text,
  opponent_id uuid,
  opponent_name text,
  queue_size integer
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  current_rating integer := 0;
  opponent_record record;
  current_room_record record;
begin
  if current_user_id is null then
    raise exception '当前未登录，无法进入匹配。';
  end if;

  select rating_points
  into current_rating
  from public.profiles
  where id = current_user_id;

  current_rating := coalesce(current_rating, 0);

  select
    cr.id,
    cr.room_code,
    cr.owner_id,
    cr.invited_user_id,
    opponent.display_name as opponent_name
  into current_room_record
  from public.custom_rooms cr
  left join public.profiles opponent
    on opponent.id = case when cr.owner_id = current_user_id then cr.invited_user_id else cr.owner_id end
  where cr.ranked_enabled = true
    and cr.status <> 'closed'
    and (cr.owner_id = current_user_id or cr.invited_user_id = current_user_id)
  order by cr.created_at desc
  limit 1;

  if found then
    matched := current_room_record.invited_user_id is not null;
    room_id := current_room_record.id;
    room_code := current_room_record.room_code;
    opponent_id := case
      when current_room_record.owner_id = current_user_id then current_room_record.invited_user_id
      else current_room_record.owner_id
    end;
    opponent_name := current_room_record.opponent_name;

    select count(*) into queue_size from public.rank_queue;
    return next;
    return;
  end if;

  insert into public.rank_queue (user_id, rating_snapshot, created_at)
  values (current_user_id, current_rating, now())
  on conflict (user_id)
  do update set rating_snapshot = excluded.rating_snapshot;

  select
    q.user_id,
    p.display_name
  into opponent_record
  from public.rank_queue q
  join public.profiles p on p.id = q.user_id
  where q.user_id <> current_user_id
  order by abs(q.rating_snapshot - current_rating), q.created_at asc
  limit 1
  for update of q skip locked;

  if found then
    insert into public.custom_rooms (room_code, owner_id, invited_user_id, status, ranked_enabled)
    values (public.generate_ranked_room_code(), opponent_record.user_id, current_user_id, 'ready', true)
    returning id, room_code into room_id, room_code;

    delete from public.rank_queue
    where user_id in (current_user_id, opponent_record.user_id);

    update public.profiles
    set status = 'in_match',
        updated_at = now()
    where id in (current_user_id, opponent_record.user_id);

    matched := true;
    opponent_id := opponent_record.user_id;
    opponent_name := opponent_record.display_name;
  else
    matched := false;
    room_id := null;
    room_code := null;
    opponent_id := null;
    opponent_name := null;
  end if;

  select count(*) into queue_size from public.rank_queue;
  return next;
end;
$$;

drop function if exists public.leave_rank_queue();
create or replace function public.leave_rank_queue()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception '当前未登录，无法退出匹配。';
  end if;

  delete from public.rank_queue
  where user_id = current_user_id;

  update public.profiles
  set status = 'online',
      updated_at = now()
  where id = current_user_id;
end;
$$;

drop function if exists public.finish_ranked_match(uuid, text);
create or replace function public.finish_ranked_match(p_room_id uuid, p_result text)
returns table (
  winner_id uuid,
  loser_id uuid,
  winner_points integer,
  loser_points integer,
  winner_rank text,
  loser_rank text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  room_record public.custom_rooms%rowtype;
  opponent_user_id uuid;
begin
  if current_user_id is null then
    raise exception '当前未登录，无法结算天梯对局。';
  end if;

  if p_result not in ('win', 'loss') then
    raise exception '结算结果仅支持 win 或 loss。';
  end if;

  select *
  into room_record
  from public.custom_rooms
  where id = p_room_id
    and ranked_enabled = true
  limit 1;

  if not found then
    raise exception '未找到可结算的天梯对局。';
  end if;

  if room_record.status = 'closed' or exists (
    select 1
    from public.match_history
    where room_id = p_room_id
      and match_type = 'ranked'
  ) then
    raise exception '该天梯对局已经结算过了。';
  end if;

  if current_user_id <> room_record.owner_id and current_user_id <> room_record.invited_user_id then
    raise exception '你不是这场天梯对局的参与者。';
  end if;

  opponent_user_id := case
    when room_record.owner_id = current_user_id then room_record.invited_user_id
    else room_record.owner_id
  end;

  if opponent_user_id is null then
    raise exception '当前对局尚未匹配到完整的双方玩家。';
  end if;

  if p_result = 'win' then
    winner_id := current_user_id;
    loser_id := opponent_user_id;
  else
    winner_id := opponent_user_id;
    loser_id := current_user_id;
  end if;

  update public.profiles
  set rating_points = rating_points + 3,
      wins = wins + 1,
      rank_tier = public.get_rank_tier_name(rating_points + 3),
      status = 'online',
      updated_at = now()
  where id = winner_id
  returning rating_points, rank_tier into winner_points, winner_rank;

  update public.profiles
  set rating_points = greatest(0, rating_points - 1),
      losses = losses + 1,
      rank_tier = public.get_rank_tier_name(greatest(0, rating_points - 1)),
      status = 'online',
      updated_at = now()
  where id = loser_id
  returning rating_points, rank_tier into loser_points, loser_rank;

  insert into public.match_history (
    winner_id,
    loser_id,
    room_id,
    match_type,
    winner_points_delta,
    loser_points_delta
  )
  values (
    winner_id,
    loser_id,
    p_room_id,
    'ranked',
    3,
    -1
  );

  update public.custom_rooms
  set status = 'closed'
  where id = p_room_id;

  delete from public.rank_queue
  where user_id in (winner_id, loser_id);

  return next;
end;
$$;
