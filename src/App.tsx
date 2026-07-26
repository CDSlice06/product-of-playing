import { useEffect } from "react";
import { HashRouter as Router, Navigate, Route, Routes } from "react-router-dom";
import { getToken, clearToken } from "@/lib/api";
import Auth from "@/pages/Auth";
import Home from "@/pages/Home";
import Battle from "@/pages/Battle";
import Lobby from "@/pages/Lobby";
import TarotDivination from "@/pages/TarotDivinationCanvas";
import MobileOrientationGuard from "@/components/MobileOrientationGuard";
import SoundToggle from "@/components/SoundToggle";
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

    const handleStorage = (e: StorageEvent) => {
      if (e.key === "arcane-token" && !e.newValue) {
        clearSession();
      }
    };
    window.addEventListener("storage", handleStorage);

    return () => {
      window.removeEventListener("storage", handleStorage);
    };
  }, [clearSession, hydrateFromSupabase]);

  return (
    <Router>
      <MobileOrientationGuard />
      <SoundToggle />
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/auth" element={<Auth />} />
        <Route path="/lobby" element={<RequireSession><Lobby /></RequireSession>} />
        <Route path="/divination" element={<RequireSession><TarotDivination /></RequireSession>} />
        <Route path="/play-local" element={<RequireSession><Home /></RequireSession>} />
        <Route path="/battle" element={<Battle />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
