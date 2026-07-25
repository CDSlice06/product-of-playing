import { request, WS_BASE } from "@/lib/api";
import { createGameState, getGameStateSnapshot } from "@/store/gameStore";
import { ensureOnlineAuthUser, normalizeSupabaseError } from "@/lib/onlineAuth";
import type { GameState } from "@/types/game";
import type { BattleSessionRecord, OnlineBattleRoomInfo } from "@/types/platform";

function mapRoom(row: any): OnlineBattleRoomInfo {
  return {
    roomId: row.id ?? row.roomId,
    roomCode: row.roomCode ?? row.room_code ?? "",
    ownerId: row.ownerId ?? row.owner_id,
    ownerName: row.ownerName ?? row.owner_name ?? "玩家1",
    invitedUserId: row.invitedUserId ?? row.invited_user_id ?? "",
    invitedUserName: row.invitedUserName ?? row.invited_name ?? "玩家2",
    rankedEnabled: row.rankedEnabled ?? row.ranked_enabled ?? false,
    status: row.status,
  };
}

function mapBattleSession(row: any) {
  return {
    session: {
      id: row.id,
      roomId: row.roomId ?? row.room_id,
      roomCode: row.roomCode ?? row.room_code ?? "",
      matchType: row.matchType ?? row.match_type,
      status: row.status,
      player1UserId: row.player1UserId ?? row.player1_user_id,
      player1Name: row.player1Name ?? row.player1_name,
      player2UserId: row.player2UserId ?? row.player2_user_id,
      player2Name: row.player2Name ?? row.player2_name,
      version: row.version,
      winnerUserId: row.winnerUserId ?? row.winner_user_id ?? null,
      createdAt: row.createdAt ?? row.created_at,
      updatedAt: row.updatedAt ?? row.updated_at,
    } satisfies BattleSessionRecord,
    state: row.state ? getGameStateSnapshot(row.state as GameState) : null,
  };
}

export async function fetchOnlineBattleRoom(roomId: string): Promise<OnlineBattleRoomInfo | null> {
  try {
    const result = await request<{ room: any }>(`/rooms/${roomId}`);
    return mapRoom(result.room);
  } catch {
    return null;
  }
}

export async function fetchBattleSession(roomId: string) {
  try {
    const result = await request<{ session: any }>(`/battle/${roomId}`);
    return mapBattleSession(result.session);
  } catch {
    return null;
  }
}

export async function ensureBattleSession(roomId: string) {
  await ensureOnlineAuthUser();
  const initialState = createGameState("pvp", "medium");

  try {
    const result = await request<{ session: any }>("/battle/ensure", {
      method: "POST",
      body: JSON.stringify({ roomId, initialState: getGameStateSnapshot(initialState) }),
    });
    return mapBattleSession(result.session);
  } catch (err) {
    const latest = await fetchBattleSession(roomId);
    if (latest) return latest;
    throw normalizeSupabaseError(err, "创建联机战斗会话失败。");
  }
}

export async function saveBattleSessionState(session: BattleSessionRecord, state: GameState) {
  await ensureOnlineAuthUser();
  const winnerUserId =
    state.winner === "player1"
      ? session.player1UserId
      : state.winner === "player2"
        ? session.player2UserId
        : null;

  try {
    const result = await request<{ session: any }>(`/battle/${session.id}/state`, {
      method: "PATCH",
      body: JSON.stringify({
        state: getGameStateSnapshot(state),
        status: state.winner ? "finished" : "playing",
        winnerUserId,
      }),
    });
    return mapBattleSession(result.session);
  } catch (err) {
    throw normalizeSupabaseError(err, "同步联机战斗状态失败。");
  }
}

export function subscribeBattleSession(roomId: string, onChange: (record: ReturnType<typeof mapBattleSession>) => void) {
  let active = true;
  let socket: any = null;

  import("socket.io-client").then(({ io }) => {
    const token = localStorage.getItem("arcane-token");
    socket = io(WS_BASE, { auth: { token } });
    socket.emit("subscribe:battle", roomId);
    socket.on("battle:updated", (data: any) => {
      if (active) onChange(mapBattleSession(data));
    });
  });

  return () => {
    active = false;
    if (socket) {
      socket.emit("unsubscribe:battle", roomId);
      socket.disconnect();
    }
  };
}
