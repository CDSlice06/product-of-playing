import { request } from "@/lib/api";
import { ensureOnlineAuthUser, normalizeSupabaseError } from "@/lib/onlineAuth";
import type {
  RankedJoinResult,
  RankedMatchRecord,
  RankedQueueEntry,
  RankedRoomRecord,
} from "@/types/platform";

export async function fetchCurrentQueueEntry(userId: string): Promise<RankedQueueEntry | null> {
  try {
    const result = await request<{ entry: RankedQueueEntry }>("/ranked/queue-status");
    return result.entry;
  } catch {
    return null;
  }
}

export async function fetchActiveRankedRoom(userId: string): Promise<RankedRoomRecord | null> {
  try {
    const rooms = await request<{ rooms: RankedRoomRecord[] }>("/rooms");
    const ranked = rooms.rooms.filter(
      (r: any) => r.rankedEnabled && r.status !== "closed" && (r.ownerId === userId || r.invitedUserId === userId),
    );
    return ranked[0] ?? null;
  } catch {
    return null;
  }
}

export async function fetchRecentRankedMatches(userId: string): Promise<RankedMatchRecord[]> {
  try {
    const result = await request<{ matches: RankedMatchRecord[] }>("/ranked/history");
    return result.matches;
  } catch {
    return [];
  }
}

export async function joinRankedQueue(): Promise<RankedJoinResult> {
  await ensureOnlineAuthUser();
  const result = await request<RankedJoinResult>("/ranked/join", { method: "POST" });
  return result;
}

export async function leaveRankedQueue() {
  await ensureOnlineAuthUser();
  await request("/ranked/leave", { method: "POST" });
}

export async function settleRankedMatch(roomId: string, result: "win" | "loss") {
  await ensureOnlineAuthUser();
  return await request("/ranked/finish", {
    method: "POST",
    body: JSON.stringify({ roomId, result }),
  });
}
