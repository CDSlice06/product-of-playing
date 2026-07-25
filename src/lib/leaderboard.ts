import { request } from "@/lib/api";
import type { LeaderboardEntry } from "@/types/platform";

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  try {
    const result = await request<{ leaderboard: LeaderboardEntry[] }>("/leaderboard");
    return result.leaderboard;
  } catch {
    return [];
  }
}
