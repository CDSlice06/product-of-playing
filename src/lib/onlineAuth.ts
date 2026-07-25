import { request, getToken } from "@/lib/api";

export async function ensureOnlineAuthUser() {
  const token = getToken();
  if (!token) {
    throw new Error("登录状态已失效，请重新登录后再试。");
  }
  const result = await request<{ user: { id: string } }>("/auth/me");
  return result.user;
}

export function normalizeSupabaseError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return new Error(error.message);
  }
  return new Error(fallback);
}
