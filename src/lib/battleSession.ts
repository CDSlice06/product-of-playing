import type { RealtimeChannel } from "@supabase/supabase-js";
import { createGameState, getGameStateSnapshot } from "@/store/gameStore";
import { ensureOnlineAuthUser, normalizeSupabaseError } from "@/lib/onlineAuth";
import { supabase } from "@/lib/supabase";
import type { GameState } from "@/types/game";
import type { BattleSessionRecord, OnlineBattleRoomInfo } from "@/types/platform";

function normalizeRelation<T>(value: T[] | T | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }
  return value ?? null;
}

function mapRoom(row: {
  id: string;
  room_code: string;
  owner_id: string;
  invited_user_id: string | null;
  ranked_enabled: boolean;
  status: "waiting" | "ready" | "playing" | "closed";
  owner?: { display_name?: string }[] | { display_name?: string } | null;
  invited?: { display_name?: string }[] | { display_name?: string } | null;
}): OnlineBattleRoomInfo {
  const owner = normalizeRelation(row.owner);
  const invited = normalizeRelation(row.invited);
  return {
    roomId: row.id,
    roomCode: row.room_code,
    ownerId: row.owner_id,
    ownerName: owner?.display_name ?? "玩家1",
    invitedUserId: row.invited_user_id ?? "",
    invitedUserName: invited?.display_name ?? "玩家2",
    rankedEnabled: row.ranked_enabled,
    status: row.status,
  };
}

function mapBattleSession(
  row: {
    id: string;
    room_id: string;
    match_type: "ranked" | "custom";
    status: "waiting" | "playing" | "finished";
    player1_user_id: string;
    player1_name: string;
    player2_user_id: string;
    player2_name: string;
    version: number;
    winner_user_id: string | null;
    created_at: string;
    updated_at: string;
    room?: { room_code?: string }[] | { room_code?: string } | null;
    state?: GameState;
  },
) {
  const room = normalizeRelation(row.room);
  return {
    session: {
      id: row.id,
      roomId: row.room_id,
      roomCode: room?.room_code ?? "",
      matchType: row.match_type,
      status: row.status,
      player1UserId: row.player1_user_id,
      player1Name: row.player1_name,
      player2UserId: row.player2_user_id,
      player2Name: row.player2_name,
      version: row.version,
      winnerUserId: row.winner_user_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    } satisfies BattleSessionRecord,
    state: row.state ? getGameStateSnapshot(row.state) : null,
  };
}

export async function fetchOnlineBattleRoom(roomId: string): Promise<OnlineBattleRoomInfo | null> {
  const { data, error } = await supabase
    .from("custom_rooms")
    .select(`
      id,
      room_code,
      owner_id,
      invited_user_id,
      ranked_enabled,
      status,
      owner:owner_id (display_name),
      invited:invited_user_id (display_name)
    `)
    .eq("id", roomId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapRoom(data);
}

export async function fetchBattleSession(roomId: string) {
  const { data, error } = await supabase
    .from("battle_sessions")
    .select(`
      id,
      room_id,
      match_type,
      status,
      player1_user_id,
      player1_name,
      player2_user_id,
      player2_name,
      version,
      winner_user_id,
      created_at,
      updated_at,
      room:room_id (room_code),
      state
    `)
    .eq("room_id", roomId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapBattleSession(data);
}

async function markRoomPlaying(roomId: string) {
  const { error } = await supabase
    .from("custom_rooms")
    .update({ status: "playing" })
    .eq("id", roomId)
    .neq("status", "closed");

  if (error) {
    throw error;
  }
}

export async function ensureBattleSession(roomId: string) {
  await ensureOnlineAuthUser();

  const initialState = createGameState("pvp", "medium");
  const { data, error } = await supabase.rpc("ensure_battle_session", {
    p_room_id: roomId,
    p_initial_state: getGameStateSnapshot(initialState),
  });

  if (error || !data) {
    const latest = await fetchBattleSession(roomId);
    if (latest) {
      return latest;
    }
    throw normalizeSupabaseError(error, "创建联机战斗会话失败。");
  }

  const row = Array.isArray(data) ? data[0] : data;
  return mapBattleSession(row);
}

export async function saveBattleSessionState(session: BattleSessionRecord, state: GameState) {
  await ensureOnlineAuthUser();
  const winnerUserId =
    state.winner === "player1"
      ? session.player1UserId
      : state.winner === "player2"
        ? session.player2UserId
        : null;

  const { data, error } = await supabase
    .from("battle_sessions")
    .update({
      state: getGameStateSnapshot(state),
      status: state.winner ? "finished" : "playing",
      winner_user_id: winnerUserId,
      version: session.version + 1,
      updated_at: new Date().toISOString(),
    })
    .eq("id", session.id)
    .eq("version", session.version)
    .select(`
      id,
      room_id,
      match_type,
      status,
      player1_user_id,
      player1_name,
      player2_user_id,
      player2_name,
      version,
      winner_user_id,
      created_at,
      updated_at,
      room:room_id (room_code),
      state
    `)
    .maybeSingle();

  if (error || !data) {
    throw normalizeSupabaseError(error, "同步联机战斗状态失败。");
  }

  return mapBattleSession(data);
}

export function subscribeBattleSession(roomId: string, onChange: (record: ReturnType<typeof mapBattleSession>) => void) {
  const channel: RealtimeChannel = supabase
    .channel(`battle-session-${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "battle_sessions",
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => {
        if (!payload.new) {
          return;
        }
        onChange(mapBattleSession(payload.new as never));
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
