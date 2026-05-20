import { ensureProfile } from "@/lib/account";
import { supabase } from "@/lib/supabase";

function deriveUsername(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> }) {
  const username =
    typeof user.user_metadata?.username === "string"
      ? user.user_metadata.username
      : typeof user.user_metadata?.display_name === "string"
        ? user.user_metadata.display_name
        : user.email?.split("@")[0]
          ? user.email.split("@")[0]
          : user.id.slice(0, 8);

  return username.trim() || user.id.slice(0, 8);
}

export async function ensureOnlineAuthUser() {
  const { data, error } = await supabase.auth.getUser();
  const user = data.user;

  if (error || !user) {
    throw new Error("登录状态已失效，请重新登录后再试。");
  }

  await ensureProfile(user.id, deriveUsername(user));
  return user;
}

export function normalizeSupabaseError(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return new Error(error.message);
  }

  if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    return new Error(error.message || fallback);
  }

  return new Error(fallback);
}
