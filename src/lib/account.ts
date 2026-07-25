import { request, setToken, clearToken, getToken } from "@/lib/api";
import { getRankByPoints } from "@/lib/ranks";
import type { UserProfile } from "@/types/platform";

export async function signUpWithUsername(username: string, password: string) {
  const result = await request<{ user: UserProfile; token: string }>("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(result.token);
  return result;
}

export async function signInWithUsername(username: string, password: string) {
  const result = await request<{ user: UserProfile; token: string }>("/auth/signin", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
  setToken(result.token);
  return result;
}

export async function fetchProfile(userId: string): Promise<UserProfile | null> {
  try {
    const result = await request<{ user: UserProfile }>(`/auth/profile/${userId}`);
    return result.user;
  } catch {
    return null;
  }
}

export async function fetchCurrentUser(): Promise<UserProfile | null> {
  if (!getToken()) return null;
  try {
    const result = await request<{ user: UserProfile }>("/auth/me");
    return result.user;
  } catch {
    return null;
  }
}

export async function signOutAccount() {
  clearToken();
}

export { getToken, setToken, clearToken };
