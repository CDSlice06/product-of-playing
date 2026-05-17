import { supabase } from "@/lib/supabase";
import type { CustomRoomRecord } from "@/types/platform";

function generateRoomCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
}

function mapRoom(row: {
  id: string;
  room_code: string;
  owner_id: string;
  invited_user_id: string | null;
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
    invitedUserId: row.invited_user_id,
    invitedUserName: invited?.display_name ?? null,
    status: row.status,
    rankedEnabled: row.ranked_enabled,
    createdAt: row.created_at,
  };
}

export async function fetchRelevantRooms(userId: string) {
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
    .or(`owner_id.eq.${userId},invited_user_id.eq.${userId}`)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map(mapRoom);
}

export async function createCustomRoom(ownerId: string) {
  const roomCode = generateRoomCode();
  const { data, error } = await supabase
    .from("custom_rooms")
    .insert({
      room_code: roomCode,
      owner_id: ownerId,
      ranked_enabled: false,
      status: "waiting",
    })
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
    .single();

  if (error || !data) {
    throw error ?? new Error("创建房间失败。");
  }

  return mapRoom(data);
}

export async function joinRoomByCode(roomCode: string, userId: string) {
  const normalizedCode = roomCode.trim().toUpperCase();
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
    .eq("room_code", normalizedCode)
    .single();

  if (error || !data) {
    throw error ?? new Error("找不到这个房间码。");
  }

  if (data.owner_id === userId) {
    return mapRoom(data);
  }

  const { data: updated, error: updateError } = await supabase
    .from("custom_rooms")
    .update({
      invited_user_id: userId,
      status: "ready",
    })
    .eq("id", data.id)
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
    .single();

  if (updateError || !updated) {
    throw updateError ?? new Error("加入房间失败。");
  }

  return mapRoom(updated);
}

export async function inviteFriendToRoom(roomId: string, friendId: string) {
  const { data, error } = await supabase
    .from("custom_rooms")
    .update({
      invited_user_id: friendId,
      status: "ready",
    })
    .eq("id", roomId)
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
    .single();

  if (error || !data) {
    throw error ?? new Error("邀请好友失败。");
  }

  return mapRoom(data);
}
