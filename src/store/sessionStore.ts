import { create } from "zustand";
import { persist } from "zustand/middleware";
import { fetchCurrentUser } from "@/lib/account";
import { getRankByPoints } from "@/lib/ranks";
import { getToken } from "@/lib/api";
import type { PlayerAccessMode, UserProfile } from "@/types/platform";

interface SessionStore {
  ready: boolean;
  mode: PlayerAccessMode | null;
  profile: UserProfile | null;
  authUserId: string | null;
  errorMessage: string | null;
  setReady: (ready: boolean) => void;
  setErrorMessage: (message: string | null) => void;
  startGuestMode: () => void;
  hydrateFromSupabase: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  clearSession: () => void;
}

function createGuestProfile(): UserProfile {
  return {
    id: "guest",
    username: "guest",
    displayName: "游客占星师",
    ratingPoints: 0,
    rankTier: getRankByPoints(0).name,
    wins: 0,
    losses: 0,
    isGuest: true,
  };
}

const SESSION_BOOTSTRAP_TIMEOUT_MS = 5000;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number, fallbackFactory: () => T): Promise<T> {
  return new Promise((resolve) => {
    const timer = window.setTimeout(() => {
      resolve(fallbackFactory());
    }, timeoutMs);

    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch(() => {
        window.clearTimeout(timer);
        resolve(fallbackFactory());
      });
  });
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      ready: false,
      mode: null,
      profile: null,
      authUserId: null,
      errorMessage: null,
      setReady: (ready) => set({ ready }),
      setErrorMessage: (message) => set({ errorMessage: message }),
      startGuestMode: () =>
        set({
          ready: true,
          mode: "guest",
          profile: createGuestProfile(),
          authUserId: null,
          errorMessage: null,
        }),
      hydrateFromSupabase: async () => {
        const previousMode = get().mode;
        const previousProfile = get().profile;
        const isGuestSession = previousMode === "guest" && previousProfile?.isGuest;

        const token = getToken();
        if (!token) {
          set({
            ready: true,
            mode: isGuestSession ? "guest" : null,
            profile: isGuestSession ? previousProfile : null,
            authUserId: null,
            errorMessage: null,
          });
          return;
        }

        let sessionBootstrapTimedOut = false;
        const profile = await withTimeout(
          fetchCurrentUser(),
          SESSION_BOOTSTRAP_TIMEOUT_MS,
          () => {
            sessionBootstrapTimedOut = true;
            return null;
          },
        );

        if (!profile) {
          set({
            ready: true,
            mode: isGuestSession ? "guest" : null,
            profile: isGuestSession ? previousProfile : null,
            authUserId: null,
            errorMessage: sessionBootstrapTimedOut ? "连接账号服务超时，已跳过自动登录。" : null,
          });
          return;
        }

        set({
          ready: true,
          mode: "authenticated",
          authUserId: profile.id,
          profile,
          errorMessage: null,
        });
      },
      refreshProfile: async () => {
        const authUserId = get().authUserId;
        if (!authUserId) return;
        const { fetchProfile } = await import("@/lib/account");
        const profile = await fetchProfile(authUserId);
        set({ profile });
      },
      clearSession: () =>
        set({
          ready: true,
          mode: null,
          profile: null,
          authUserId: null,
          errorMessage: null,
        }),
    }),
    {
      name: "arcane-session-store",
      partialize: (state) => ({
        mode: state.mode,
        profile: state.profile,
        authUserId: state.authUserId,
      }),
    },
  ),
);
