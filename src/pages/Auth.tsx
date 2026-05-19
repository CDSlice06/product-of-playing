import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ensureProfile, signInWithUsername, signUpWithUsername } from "@/lib/account";
import { useSessionStore } from "@/store/sessionStore";
import type { AuthView } from "@/types/platform";
import { ASSETS } from "@/constants/assets";
import LobbyScene from "@/components/LobbyScene";

export default function Auth() {
  const navigate = useNavigate();
  const [view, setView] = useState<AuthView>("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const hydrateFromSupabase = useSessionStore((state) => state.hydrateFromSupabase);
  const startGuestMode = useSessionStore((state) => state.startGuestMode);
  const modeLabel = useMemo(() => (view === "login" ? "登录" : "注册"), [view]);

  useEffect(() => {
    document.title = "命运之战 | 登录";
  }, []);

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }
    const trimmedUsername = username.trim();
    if (!trimmedUsername || password.length < 6) {
      setMessage("用户名不能为空，密码至少需要 6 位。");
      return;
    }

    try {
      setSubmitting(true);
      setMessage(null);

      if (view === "register") {
        const data = await signUpWithUsername(trimmedUsername, password);       
        if (data.user) {
          await ensureProfile(data.user.id, trimmedUsername);
        }
      } else {
        await signInWithUsername(trimmedUsername, password);
      }

      await hydrateFromSupabase();
      navigate("/lobby");
    } catch (error: any) {
      let errorMsg = error?.message || `${modeLabel}失败，请稍后重试。`;
      if (errorMsg.includes("User already registered")) {
        errorMsg = "该用户名已被注册，请直接登录或更换用户名。";
      } else if (errorMsg.includes("Invalid login credentials")) {
        errorMsg = "用户名或密码错误。";
      }
      setMessage(errorMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuestStart = () => {
    startGuestMode();
    navigate("/lobby");
  };

  return (
    <main className="app-shell relative overflow-hidden bg-black flex flex-col items-center justify-center">
      {/* Global Background */}
      <div
        className="absolute inset-0 z-0 opacity-40 pointer-events-none"
        style={{ backgroundImage: `url(${ASSETS.LOBBY_BG})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(2px)' }}
      />

      <div className="app-page-layout relative z-10">
        {/* Left Side: Lobby Intro & Decor */}
        <div className="app-scene-panel flex-col items-center justify-center pixel-panel bg-black/40 p-4 relative">
          <LobbyScene />
        </div>

        {/* Right Side: Auth Panel */}
        <div className="app-side-panel lg:w-[450px] xl:w-[500px] flex flex-col gap-4 sm:gap-8 shrink-0 h-full justify-center overflow-y-auto pixel-scrollbar pb-4">
          <div className="pixel-panel relative overflow-visible p-6 bg-black/60 border-2 border-gray-700">
            <div className="absolute -top-4 left-6 bg-gray-800 border-2 border-gray-600 px-4 py-1 text-amber-400 text-sm font-bold z-10 shadow-md">
              进入星盘大厅
            </div>

            <div className="flex gap-2 mb-6 mt-4">
              <button
                type="button"
                onClick={() => setView("login")}
                className={`flex-1 p-2 border-2 transition-all font-bold text-center ${
                  view === "login"
                    ? "border-amber-400 bg-gray-800 text-amber-400 text-shadow-pixel scale-[1.02]"
                    : "border-gray-700 bg-black/50 text-gray-400 hover:border-gray-500 hover:scale-[1.01]"
                }`}
              >
                登录
              </button>
              <button
                type="button"
                onClick={() => setView("register")}
                className={`flex-1 p-2 border-2 transition-all font-bold text-center ${
                  view === "register"
                    ? "border-amber-400 bg-gray-800 text-amber-400 text-shadow-pixel scale-[1.02]"
                    : "border-gray-700 bg-black/50 text-gray-400 hover:border-gray-500 hover:scale-[1.01]"
                }`}
              >
                注册
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-bold text-gray-300 text-shadow-pixel">用户名</label>
                <input
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="输入你的对战昵称"
                  className="w-full bg-black/50 border-2 border-gray-600 px-3 py-2 text-white font-pixel outline-none focus:border-amber-400 transition-colors" 
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-bold text-gray-300 text-shadow-pixel">密码</label>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  placeholder="至少 6 位"
                  className="w-full bg-black/50 border-2 border-gray-600 px-3 py-2 text-white font-pixel outline-none focus:border-amber-400 transition-colors" 
                />
              </div>

              {message && (
                <div className="bg-red-900/50 border-2 border-red-500 p-2 text-red-200 text-sm font-bold animate-pulse">
                  {message}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-4 flex items-center justify-center py-3 bg-amber-700 hover:bg-amber-600 border-b-4 border-amber-900 active:border-b-0 active:translate-y-1 text-white text-lg font-bold transition-all text-shadow-pixel disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "提交中..." : modeLabel}
              </button>

              <div className="relative flex py-2 items-center">
                <div className="flex-grow border-t-2 border-gray-700"></div>    
                <span className="flex-shrink-0 mx-4 text-gray-500 text-xs font-bold">OR</span>
                <div className="flex-grow border-t-2 border-gray-700"></div>    
              </div>

              <button
                type="button"
                onClick={handleGuestStart}
                className="w-full flex items-center justify-center py-3 bg-gray-700 hover:bg-gray-600 border-b-4 border-gray-900 active:border-b-0 active:translate-y-1 text-white text-lg font-bold transition-all text-shadow-pixel"
              >
                游客试玩 (仅人机)
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
