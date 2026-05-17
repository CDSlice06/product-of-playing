import { getRankByPoints } from "@/lib/ranks";
import { supabase } from "@/lib/supabase";
import type { FriendProfile, FriendRequestRecord } from "@/types/platform";

function toFriendProfile(row: {
  id: string;
  username: string;
  display_name: string;
  rating_points: number | null;
  rank_tier: string | null;
  status: "online" | "offline" | "in_match" | null;
}): FriendProfile {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    ratingPoints: row.rating_points ?? 0,
    rankTier: row.rank_tier ?? getRankByPoints(row.rating_points ?? 0).name,
    status: row.status ?? "offline",
  };
}

export async function searchPlayersByUsername(keyword: string, currentUserId: string) {
  const trimmed = keyword.trim();
  if (!trimmed) {
    return [];
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, rating_points, rank_tier, status")
    .ilike("username", `%${trimmed}%`)
    .neq("id", currentUserId)
    .limit(12);

  if (error || !data) {
    return [];
  }

  return data.map(toFriendProfile);
}

export async function fetchFriends(currentUserId: string) {
  const { data, error } = await supabase
    .from("friends")
    .select(`
      id,
      user_id,
      friend_id,
      profiles_user:user_id (id, username, display_name, rating_points, rank_tier, status),
      profiles_friend:friend_id (id, username, display_name, rating_points, rank_tier, status)
    `)
    .or(`user_id.eq.${currentUserId},friend_id.eq.${currentUserId}`)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data
    .map((row) => {
      const relationUser = Array.isArray(row.profiles_user) ? row.profiles_user[0] : row.profiles_user;
      const relationFriend = Array.isArray(row.profiles_friend) ? row.profiles_friend[0] : row.profiles_friend;
      const target = row.user_id === currentUserId ? relationFriend : relationUser;
      return target ? toFriendProfile(target) : null;
    })
    .filter((item): item is FriendProfile => Boolean(item));
}

export async function fetchFriendRequests(currentUserId: string) {
  const { data, error } = await supabase
    .from("friend_requests")
    .select(`
      id,
      sender_id,
      receiver_id,
      status,
      created_at,
      sender:sender_id (id, display_name),
      receiver:receiver_id (id, display_name)
    `)
    .or(`sender_id.eq.${currentUserId},receiver_id.eq.${currentUserId}`)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return data.map((row) => {
    const sender = Array.isArray(row.sender) ? row.sender[0] : row.sender;
    const receiver = Array.isArray(row.receiver) ? row.receiver[0] : row.receiver;

    return {
      id: row.id,
      senderId: row.sender_id,
      senderName: sender?.display_name ?? "未知玩家",
      receiverId: row.receiver_id,
      receiverName: receiver?.display_name ?? "未知玩家",
      status: row.status,
      createdAt: row.created_at,
    } satisfies FriendRequestRecord;
  });
}

export async function sendFriendRequest(receiverId: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    throw new Error("当前未登录，无法发送好友申请。");
  }

  const { error } = await supabase.from("friend_requests").upsert(
    {
      sender_id: auth.user.id,
      receiver_id: receiverId,
      status: "pending",
    },
    { onConflict: "sender_id,receiver_id" },
  );

  if (error) {
    throw error;
  }
}

export async function acceptFriendRequest(requestId: string) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    throw new Error("当前未登录，无法处理好友申请。");
  }

  const { data: request, error: requestError } = await supabase
    .from("friend_requests")
    .select("id, sender_id, receiver_id, status")
    .eq("id", requestId)
    .single();

  if (requestError || !request) {
    throw requestError ?? new Error("找不到该好友申请。");
  }

  const { error: updateError } = await supabase
    .from("friend_requests")
    .update({ status: "accepted" })
    .eq("id", requestId);

  if (updateError) {
    throw updateError;
  }

  const { error: friendError } = await supabase.from("friends").insert({
    user_id: request.sender_id,
    friend_id: request.receiver_id,
  });

  if (friendError && !friendError.message.includes("duplicate")) {
    throw friendError;
  }
}

export async function rejectFriendRequest(requestId: string) {
  const { error } = await supabase
    .from("friend_requests")
    .update({ status: "rejected" })
    .eq("id", requestId);

  if (error) {
    throw error;
  }
}
