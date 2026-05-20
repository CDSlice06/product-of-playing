import { useEffect } from "react";
import { HashRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import Auth from "@/pages/Auth";
import Home from "@/pages/Home";
import Battle from "@/pages/Battle";
import Friends from "@/pages/Friends";
import Leaderboard from "@/pages/Leaderboard";
import Lobby from "@/pages/Lobby";
import Ranked from "@/pages/Ranked";
import RoomWait from "@/pages/RoomWait";
import Rooms from "@/pages/Rooms";
import TarotDivination from "@/pages/TarotDivination";
import MobileOrientationGuard from "@/components/MobileOrientationGuard";
import { useSessionStore } from "@/store/sessionStore";

function RootRedirect() {
  const ready = useSessionStore((state) => state.ready);
  const mode = useSessionStore((state) => state.mode);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        正在连接星盘大厅...
      </main>
    );
  }

  return <Navigate to={mode ? "/lobby" : "/auth"} replace />;
}

function RequireSession({ children }: { children: JSX.Element }) {
  const ready = useSessionStore((state) => state.ready);
  const mode = useSessionStore((state) => state.mode);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        正在连接星盘大厅...
      </main>
    );
  }

  if (!mode) {
    return <Navigate to="/auth" replace />;
  }

  return children;
}

function RequireAuthenticated({ children }: { children: JSX.Element }) {
  const ready = useSessionStore((state) => state.ready);
  const mode = useSessionStore((state) => state.mode);

  if (!ready) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        正在连接星盘大厅...
      </main>
    );
  }

  if (mode !== "authenticated") {
    return <Navigate to="/lobby" replace />;
  }

  return children;
}

export default function App() {
  const hydrateFromSupabase = useSessionStore((state) => state.hydrateFromSupabase);
  const clearSession = useSessionStore((state) => state.clearSession);

  useEffect(() => {
    hydrateFromSupabase();
    const { data } = supabase.auth.onAuthStateChange(async (event) => {
      if (event === "SIGNED_OUT") {
        clearSession();
        return;
      }

      await hydrateFromSupabase();
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }, [clearSession, hydrateFromSupabase]);

  return (
    <Router>
      <MobileOrientationGuard />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/lobby" element={<RequireSession><Lobby /></RequireSession>} />
        <Route path="/friends" element={<RequireAuthenticated><Friends /></RequireAuthenticated>} />
        <Route path="/leaderboard" element={<RequireAuthenticated><Leaderboard /></RequireAuthenticated>} />
        <Route path="/rooms" element={<RequireAuthenticated><Rooms /></RequireAuthenticated>} />
        <Route path="/room-wait" element={<RequireAuthenticated><RoomWait /></RequireAuthenticated>} />
        <Route path="/ranked" element={<RequireAuthenticated><Ranked /></RequireAuthenticated>} />
        <Route path="/divination" element={<RequireSession><TarotDivination /></RequireSession>} />
        <Route path="/play-local" element={<RequireSession><Home /></RequireSession>} />
        <Route path="/battle" element={<Battle />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
