import { getRankByPoints } from "@/lib/ranks";
import { supabase } from "@/lib/supabase";
import type { UserProfile } from "@/types/platform";

const INTERNAL_EMAIL_DOMAIN = "players.arcane.local";

function toBase64Url(value: string) {
  const utf8 = new TextEncoder().encode(value);
  let binary = "";
  utf8.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function usernameToInternalEmail(username: string) {
  return `u-${toBase64Url(username.trim())}@${INTERNAL_EMAIL_DOMAIN}`;
}

export async function signUpWithUsername(username: string, password: string) {
  const trimmedUsername = username.trim();
  const email = usernameToInternalEmail(trimmedUsername);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: trimmedUsername,
        display_name: trimmedUsername,
      },
    },
  });

  if (error) {
    throw error;
  }

  if (data.user) {
    await ensureProfile(data.user.id, trimmedUsername);
  }

  return data;
}

export async function signInWithUsername(username: string, password: string) {
  const email = usernameToInternalEmail(username.trim());
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function ensureProfile(userId: string, username: string) {
  const initialRank = getRankByPoints(0);
  const payload = {
    id: userId,
    username: username.trim(),
    display_name: username.trim(),
    rating_points: 0,
    rank_tier: initialRank.name,
    wins: 0,
    losses: 0,
    status: "online",
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from("profiles").upsert(payload, {
    onConflict: "id",
  });

  if (error) {
    throw error;
  }
}

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, rating_points, rank_tier, wins, losses, created_at")
    .eq("id", userId)
    .single();

  if (error) {
    return null;
  }

  return {
    id: data.id,
    username: data.username,
    displayName: data.display_name,
    ratingPoints: data.rating_points ?? 0,
    rankTier: data.rank_tier ?? getRankByPoints(0).name,
    wins: data.wins ?? 0,
    losses: data.losses ?? 0,
    isGuest: false,
    createdAt: data.created_at,
  };
}

export async function signOutAccount() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}
