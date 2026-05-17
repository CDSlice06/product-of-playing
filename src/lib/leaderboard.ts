import { getRankByPoints } from "@/lib/ranks";
import { supabase } from "@/lib/supabase";
import type { LeaderboardEntry } from "@/types/platform";

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, rating_points, rank_tier, wins, losses")
    .order("rating_points", { ascending: false })
    .order("wins", { ascending: false })
    .limit(50);

  if (error || !data) {
    return [];
  }

  return data.map((entry) => ({
    userId: entry.id,
    username: entry.username,
    displayName: entry.display_name,
    ratingPoints: Math.max(0, entry.rating_points ?? 0),
    rankTier: entry.rank_tier ?? getRankByPoints(entry.rating_points ?? 0).name,
    wins: entry.wins ?? 0,
    losses: entry.losses ?? 0,
  }));
}
