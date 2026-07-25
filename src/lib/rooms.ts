import { request, WS_BASE } from "@/lib/api";
import { ensureOnlineAuthUser, normalizeSupabaseError } from "@/lib/onlineAuth";
import type { CustomRoomRecord } from "@/types/platform";

function mapRoom(row: any): CustomRoomRecord {
  return {
    id: row.id,
    roomCode: row.roomCode ?? row.room_code,
    ownerId: row.ownerId ?? row.owner_id,
    ownerName: row.ownerName ?? row.owner_name ?? "未知房主",
    ownerJoined: row.ownerJoined ?? row.owner_joined ?? false,
    invitedUserId: row.invitedUserId ?? row.invited_user_id ?? null,
    invitedUserName: row.invitedUserName ?? row.invited_name ?? null,
    invitedJoined: row.invitedJoined ?? row.invited_joined ?? false,
    status: row.status,
    rankedEnabled: row.rankedEnabled ?? row.ranked_enabled ?? false,
    createdAt: row.createdAt ?? row.created_at,
  };
}

export async function fetchRelevantRooms(userId: string) {
  try {
    const result = await request<{ rooms: any[] }>("/rooms");
    return result.rooms.map(mapRoom);
  } catch {
    return [];
  }
}

export async function fetchCustomRoom(roomId: string) {
  try {
    const result = await request<{ room: any }>(`/rooms/${roomId}`);
    return mapRoom(result.room);
  } catch {
    return null;
  }
}

async function closeCustomRoomsForUser(userId: string, excludeRoomId?: string) {
  const rooms = await fetchRelevantRooms(userId);
  const targetRooms = rooms.filter(
    (room) => !room.rankedEnabled && room.status !== "closed" && room.id !== excludeRoomId,
  );
  await Promise.all(
    targetRooms.map((room) => leaveCustomRoom(room.id, userId).catch(() => null)),
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
  const result = await request<{ room: any }>("/rooms", { method: "POST" });
  return mapRoom(result.room);
}

export async function joinRoomByCode(roomCode: string, userId: string) {
  await ensureOnlineAuthUser();
  const result = await request<{ room: any }>("/rooms/join-by-code", {
    method: "POST",
    body: JSON.stringify({ roomCode }),
  });
  const joinedRoom = mapRoom(result.room);
  await cleanupStaleCustomRooms(userId, joinedRoom.id);
  return (await fetchCustomRoom(joinedRoom.id)) ?? joinedRoom;
}

export async function inviteFriendToRoom(roomId: string, friendId: string) {
  await ensureOnlineAuthUser();
  const currentRoom = await fetchCustomRoom(roomId);
  if (!currentRoom) throw new Error("找不到这个房间。");
  if (currentRoom.status === "closed") throw new Error("这个房间已经关闭，请重新创建。");
  if (currentRoom.status === "playing") throw new Error("这个房间已经在对局中，不能再邀请新玩家。");
  if (currentRoom.invitedUserId && currentRoom.invitedUserId !== friendId && currentRoom.invitedJoined) {
    throw new Error("这个房间已经有其他玩家加入，请重新建房后再邀请。");
  }

  const result = await request<{ room: any }>(`/rooms/${roomId}/invite`, {
    method: "POST",
    body: JSON.stringify({ friendId }),
  });
  return mapRoom(result.room);
}

export async function markCustomRoomReady(roomId: string, userId: string) {
  await ensureOnlineAuthUser();
  const room = await fetchCustomRoom(roomId);
  if (!room) throw new Error("找不到这个房间。");
  if (room.invitedUserId !== userId) return room;
  if (room.status === "closed" || room.status === "playing" || room.status === "ready") return room;

  const result = await request<{ room: any }>(`/rooms/${roomId}/ready`, {
    method: "POST",
  }).catch(() => null);

  return result ? mapRoom(result.room) : (await fetchCustomRoom(roomId))!;
}

export async function startCustomRoomBattle(roomId: string, userId: string) {
  await ensureOnlineAuthUser();
  const room = await fetchCustomRoom(roomId);
  if (!room) throw new Error("找不到这个房间。");
  if (room.ownerId !== userId) throw new Error("只有房主可以开始对局。");
  if (room.status === "closed") throw new Error("这个房间已经关闭，请重新创建。");
  if (room.status === "playing") return room;
  if (!room.invitedUserId || !room.invitedJoined || !room.ownerJoined || room.status !== "ready") {
    throw new Error("双方都进入等待房间后，房主才能开始游戏。");
  }

  await request(`/rooms/${roomId}/start`, { method: "POST" });
  return (await fetchCustomRoom(roomId))!;
}

export async function enterCustomRoomWaiting(roomId: string) {
  await ensureOnlineAuthUser();
  const result = await request<{ room: any }>(`/rooms/${roomId}/enter-waiting`, {
    method: "POST",
  });
  return mapRoom(result.room);
}

export async function leaveCustomRoom(roomId: string, userId: string) {
  await ensureOnlineAuthUser();
  const room = await fetchCustomRoom(roomId);
  if (!room) return null;
  if (room.ownerId !== userId && room.invitedUserId !== userId) {
    throw new Error("你不是这个房间的成员，无法离开。");
  }

  await request(`/rooms/${roomId}/close`, { method: "POST" }).catch(() => {});
  return null;
}

export async function leaveRelevantCustomRooms(userId: string) {
  const rooms = await fetchRelevantRooms(userId);
  const targetRooms = rooms.filter((room) => !room.rankedEnabled && room.status !== "closed");
  await Promise.all(
    targetRooms.map((room) => leaveCustomRoom(room.id, userId).catch(() => null)),
  );
}

export function subscribeCustomRoom(roomId: string, onChange: (room: CustomRoomRecord | null) => void) {
  let active = true;
  let socket: any = null;

  import("socket.io-client").then(({ io }) => {
    const token = localStorage.getItem("arcane-token");
    socket = io(WS_BASE, { auth: { token } });
    socket.emit("subscribe:room", roomId);
    socket.on("room:updated", (data: any) => {
      if (active) onChange(mapRoom(data));
    });
  });

  return () => {
    active = false;
    if (socket) {
      socket.emit("unsubscribe:room", roomId);
      socket.disconnect();
    }
  };
}
