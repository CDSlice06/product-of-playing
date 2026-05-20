import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";
import { ensureOnlineAuthUser, normalizeSupabaseError } from "@/lib/onlineAuth";
import type { CustomRoomRecord } from "@/types/platform";

const ROOM_SELECT = `
  id,
  room_code,
  owner_id,
  owner_joined,
  invited_user_id,
  invited_joined,
  status,
  ranked_enabled,
  created_at,
  owner:owner_id (display_name),
  invited:invited_user_id (display_name)
`;

function generateRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function mapRoom(row: {
  id: string;
  room_code: string;
  owner_id: string;
  owner_joined: boolean;
  invited_user_id: string | null;
  invited_joined: boolean;
  status: "waiting" | "ready" | "playing" | "closed";
  ranked_enabled: boolean;
  created_at: string;
  owner?: { display_name?: string }[] | { display_name?: string } | null;
  invited?: { display_name?: string }[] | { display_name?: string } | null;
}): CustomRoomRecord {
  const owner = Array.isArray(row.owner) ? row.owner[0] : row.owner;
  const invited = Array.isArray(row.invited) ? row.invited[0] : row.invited;
  return {
    id: row.id,
    roomCode: row.room_code,
    ownerId: row.owner_id,
    ownerName: owner?.display_name ?? "未知房主",
    ownerJoined: row.owner_joined,
    invitedUserId: row.invited_user_id,
    invitedUserName: invited?.display_name ?? null,
    invitedJoined: row.invited_joined,
    status: row.status,
    rankedEnabled: row.ranked_enabled,
    createdAt: row.created_at,
  };
}

export async function fetchRelevantRooms(userId: string) {
  const { data, error } = await supabase
    .from("custom_rooms")
    .select(ROOM_SELECT)
    .or(`owner_id.eq.${userId},invited_user_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(mapRoom);
}

export async function fetchCustomRoom(roomId: string) {
  const { data, error } = await supabase
    .from("custom_rooms")
    .select(ROOM_SELECT)
    .eq("id", roomId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapRoom(data);
}

async function closeCustomRoomsForUser(userId: string, excludeRoomId?: string) {
  const rooms = await fetchRelevantRooms(userId);
  const targetRooms = rooms.filter(
    (room) =>
      !room.rankedEnabled
      && room.status !== "closed"
      && room.id !== excludeRoomId,
  );

  await Promise.all(
    targetRooms.map((room) =>
      leaveCustomRoom(room.id, userId).catch(() => null),
    ),
  );
}

export async function cleanupStaleCustomRooms(userId: string, keepRoomId?: string) {
  const rooms = await fetchRelevantRooms(userId);
  const activeRooms = rooms.filter((room) => !room.rankedEnabled && room.status !== "closed");
  const preservedRoomId = keepRoomId ?? activeRooms[0]?.id;

  await Promise.all(
    activeRooms
      .filter((room) => room.id !== preservedRoomId)
      .map((room) => leaveCustomRoom(room.id, userId).catch(() => null)),
  );
}

export async function createCustomRoom(ownerId: string) {
  await ensureOnlineAuthUser();
  await closeCustomRoomsForUser(ownerId);
  const roomCode = generateRoomCode();
  const { data, error } = await supabase
    .from("custom_rooms")
    .insert({
      room_code: roomCode,
      owner_id: ownerId,
      owner_joined: true,
      invited_joined: false,
      ranked_enabled: false,
      status: "waiting",
    })
    .select(ROOM_SELECT)
    .single();

  if (error || !data) {
    throw normalizeSupabaseError(error, "创建房间失败。");
  }

  return mapRoom(data);
}

export async function joinRoomByCode(roomCode: string, userId: string) {
  const normalizedCode = roomCode.trim().toUpperCase();
  await ensureOnlineAuthUser();

  const { data, error } = await supabase.rpc("join_custom_room_by_code", {
    p_room_code: normalizedCode,
  });

  if (error || !data) {
    throw normalizeSupabaseError(error, "加入房间失败。");
  }

  const row = Array.isArray(data) ? data[0] : data;
  const joinedRoom = mapRoom(row);
  await cleanupStaleCustomRooms(userId, joinedRoom.id);
  return (await fetchCustomRoom(joinedRoom.id)) ?? joinedRoom;
}

export async function inviteFriendToRoom(roomId: string, friendId: string) {
  await ensureOnlineAuthUser();
  const { data: currentRoom, error: roomError } = await supabase
    .from("custom_rooms")
    .select(ROOM_SELECT)
    .eq("id", roomId)
    .single();

  if (roomError || !currentRoom) {
    throw normalizeSupabaseError(roomError, "找不到这个房间。");
  }

  if (currentRoom.status === "closed") {
    throw new Error("这个房间已经关闭，请重新创建。");
  }

  if (currentRoom.status === "playing") {
    throw new Error("这个房间已经在对局中，不能再邀请新玩家。");
  }

  if (currentRoom.invited_user_id && currentRoom.invited_user_id !== friendId && currentRoom.invited_joined) {
    throw new Error("这个房间已经有其他玩家加入，请重新建房后再邀请。");
  }

  const { data, error } = await supabase
    .from("custom_rooms")
    .update({
      invited_user_id: friendId,
      invited_joined: false,
      status: "waiting",
    })
    .eq("id", roomId)
    .select(ROOM_SELECT)
    .single();

  if (error || !data) {
    throw normalizeSupabaseError(error, "邀请好友失败。");
  }

  return mapRoom(data);
}

export async function markCustomRoomReady(roomId: string, userId: string) {
  await ensureOnlineAuthUser();
  const room = await fetchCustomRoom(roomId);

  if (!room) {
    throw new Error("找不到这个房间。");
  }

  if (room.invitedUserId !== userId) {
    return room;
  }

  if (room.status === "closed" || room.status === "playing" || room.status === "ready") {
    return room;
  }

  const { data, error } = await supabase
    .from("custom_rooms")
    .update({ status: "ready" })
    .eq("id", roomId)
    .eq("invited_user_id", userId)
    .eq("status", "waiting")
    .select(ROOM_SELECT)
    .maybeSingle();

  if (error) {
    throw normalizeSupabaseError(error, "同步进入房间状态失败。");
  }

  return data ? mapRoom(data) : (await fetchCustomRoom(roomId));
}

export async function startCustomRoomBattle(roomId: string, userId: string) {
  await ensureOnlineAuthUser();
  const room = await fetchCustomRoom(roomId);

  if (!room) {
    throw new Error("找不到这个房间。");
  }

  if (room.ownerId !== userId) {
    throw new Error("只有房主可以开始对局。");
  }

  if (room.status === "closed") {
    throw new Error("这个房间已经关闭，请重新创建。");
  }

  if (room.status === "playing") {
    return room;
  }

  if (!room.invitedUserId || !room.invitedJoined || !room.ownerJoined || room.status !== "ready") {
    throw new Error("双方都进入等待房间后，房主才能开始游戏。");
  }

  const { data, error } = await supabase
    .from("custom_rooms")
    .update({ status: "playing" })
    .eq("id", roomId)
    .eq("owner_id", userId)
    .eq("status", "ready")
    .select(ROOM_SELECT)
    .maybeSingle();

  if (error) {
    throw normalizeSupabaseError(error, "开始对局失败。");
  }

  if (!data) {
    const latestRoom = await fetchCustomRoom(roomId);
    if (latestRoom?.status === "playing") {
      return latestRoom;
    }
    throw new Error("房间状态已变化，请稍后重试。");
  }

  return mapRoom(data);
}

export async function enterCustomRoomWaiting(roomId: string) {
  await ensureOnlineAuthUser();

  const { data, error } = await supabase.rpc("enter_custom_room_waiting", {
    p_room_id: roomId,
  });

  if (error || !data) {
    throw normalizeSupabaseError(error, "进入等待房间失败。");
  }

  const row = Array.isArray(data) ? data[0] : data;
  return mapRoom(row);
}

export async function leaveCustomRoom(roomId: string, userId: string) {
  await ensureOnlineAuthUser();
  const room = await fetchCustomRoom(roomId);

  if (!room) {
    return null;
  }

  if (room.ownerId !== userId && room.invitedUserId !== userId) {
    throw new Error("你不是这个房间的成员，无法离开。");
  }

  const isBattleInProgress = room.status === "playing";
  const updates =
    room.ownerId === userId || isBattleInProgress
      ? { status: "closed" as const }
      : {
          invited_user_id: null,
          status: "waiting" as const,
        };

  const { data, error } = await supabase
    .from("custom_rooms")
    .update(updates)
    .eq("id", roomId)
    .select(ROOM_SELECT)
    .maybeSingle();

  if (error) {
    throw normalizeSupabaseError(error, "离开房间失败。");
  }

  return data ? mapRoom(data) : null;
}

export async function leaveRelevantCustomRooms(userId: string) {
  const rooms = await fetchRelevantRooms(userId);
  const targetRooms = rooms.filter((room) => !room.rankedEnabled && room.status !== "closed");

  await Promise.all(
    targetRooms.map((room) =>
      leaveCustomRoom(room.id, userId).catch(() => null),
    ),
  );
}

export function subscribeCustomRoom(roomId: string, onChange: (room: CustomRoomRecord | null) => void) {
  const channel: RealtimeChannel = supabase
    .channel(`custom-room-${roomId}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "custom_rooms",
        filter: `id=eq.${roomId}`,
      },
      async () => {
        const room = await fetchCustomRoom(roomId);
        onChange(room);
      },
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}
