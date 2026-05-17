import { supabase } from "@/lib/supabase";
import type {
  RankedJoinResult,
  RankedMatchRecord,
  RankedQueueEntry,
  RankedRoomRecord,
} from "@/types/platform";

function normalizeSingleRelation<T>(value: T[] | T | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function mapRankedRoom(row: {
  id: string;
  room_code: string;
  owner_id: string;
  invited_user_id: string | null;
  status: "waiting" | "ready" | "playing" | "closed";
  ranked_enabled: boolean;
  created_at: string;
  owner?: { display_name?: string }[] | { display_name?: string } | null;
  invited?: { display_name?: string }[] | { display_name?: string } | null;
}): RankedRoomRecord {
  const owner = normalizeSingleRelation(row.owner);
  const invited = normalizeSingleRelation(row.invited);
  return {
    id: row.id,
    roomCode: row.room_code,
    ownerId: row.owner_id,
    ownerName: owner?.display_name ?? "未知玩家",
    invitedUserId: row.invited_user_id,
    invitedUserName: invited?.display_name ?? null,
    status: row.status,
    rankedEnabled: row.ranked_enabled,
    createdAt: row.created_at,
  };
}

export async function fetchCurrentQueueEntry(userId: string): Promise<RankedQueueEntry | null> {
  const { data, error } = await supabase
    .from("rank_queue")
    .select("id, user_id, rating_snapshot, created_at")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    userId: data.user_id,
    ratingSnapshot: data.rating_snapshot ?? 0,
    createdAt: data.created_at,
  };
}

export async function fetchActiveRankedRoom(userId: string): Promise<RankedRoomRecord | null> {
  const { data, error } = await supabase
    .from("custom_rooms")
    .select(`
      id,
      room_code,
      owner_id,
      invited_user_id,
      status,
      ranked_enabled,
      created_at,
      owner:owner_id (display_name),
      invited:invited_user_id (display_name)
    `)
    .eq("ranked_enabled", true)
    .neq("status", "closed")
    .or(`owner_id.eq.${userId},invited_user_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapRankedRoom(data);
}

export async function fetchRecentRankedMatches(userId: string): Promise<RankedMatchRecord[]> {
  const { data, error } = await supabase
    .from("match_history")
    .select(`
      id,
      created_at,
      winner_id,
      loser_id,
      winner_points_delta,
      loser_points_delta,
      match_type,
      winner:winner_id (display_name),
      loser:loser_id (display_name)
    `)
    .eq("match_type", "ranked")
    .or(`winner_id.eq.${userId},loser_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(8);

  if (error || !data) {
    return [];
  }

  return data.map((row) => {
    const winner = normalizeSingleRelation(row.winner);
    const loser = normalizeSingleRelation(row.loser);
    return {
      id: row.id,
      createdAt: row.created_at,
      winnerId: row.winner_id,
      winnerName: winner?.display_name ?? "未知胜者",
      loserId: row.loser_id,
      loserName: loser?.display_name ?? "未知败者",
      winnerPointsDelta: row.winner_points_delta ?? 0,
      loserPointsDelta: row.loser_points_delta ?? 0,
      matchType: row.match_type,
    };
  });
}

export async function joinRankedQueue(): Promise<RankedJoinResult> {
  const { data, error } = await supabase.rpc("join_rank_queue");
  if (error || !data) {
    throw error ?? new Error("进入匹配队列失败。");
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    matched: Boolean(row?.matched),
    roomId: row?.room_id ?? null,
    roomCode: row?.room_code ?? null,
    opponentId: row?.opponent_id ?? null,
    opponentName: row?.opponent_name ?? null,
    queueSize: Number(row?.queue_size ?? 0),
  };
}

export async function leaveRankedQueue() {
  const { error } = await supabase.rpc("leave_rank_queue");
  if (error) {
    throw error;
  }
}

export async function settleRankedMatch(roomId: string, result: "win" | "loss") {
  const { data, error } = await supabase.rpc("finish_ranked_match", {
    p_room_id: roomId,
    p_result: result,
  });

  if (error || !data) {
    throw error ?? new Error("结算天梯对局失败。");
  }

  return Array.isArray(data) ? data[0] : data;
}
