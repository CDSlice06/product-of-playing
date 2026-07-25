import { request } from "@/lib/api";
import { getRankByPoints } from "@/lib/ranks";
import type { FriendProfile, FriendRequestRecord } from "@/types/platform";

export async function searchPlayersByUsername(keyword: string, currentUserId: string) {
  const trimmed = keyword.trim();
  if (!trimmed) return [];

  try {
    const result = await request<{ users: FriendProfile[] }>("/friends/search", {
      method: "POST",
      body: JSON.stringify({ query: trimmed }),
    });
    return result.users;
  } catch {
    return [];
  }
}

export async function fetchFriends(currentUserId: string) {
  try {
    const result = await request<{ friends: FriendProfile[] }>("/friends");
    return result.friends;
  } catch {
    return [];
  }
}

export async function fetchFriendRequests(currentUserId: string) {
  try {
    const result = await request<{ requests: FriendRequestRecord[] }>("/friends/requests");
    return result.requests;
  } catch {
    return [];
  }
}

export async function sendFriendRequest(receiverId: string) {
  await request("/friends/request", {
    method: "POST",
    body: JSON.stringify({ receiverId }),
  });
}

export async function acceptFriendRequest(requestId: string) {
  await request(`/friends/request/${requestId}/accept`, { method: "POST" });
}

export async function rejectFriendRequest(requestId: string) {
  await request(`/friends/request/${requestId}/reject`, { method: "POST" });
}
