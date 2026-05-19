import { BookOpen, LogOut, Shield, Smartphone, Swords, Trophy, UserPlus, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { signOutAccount } from "@/lib/account";
import { useGameStore } from "@/store/gameStore";
import { useSessionStore } from "@/store/sessionStore";
import { ASSETS } from "@/constants/assets";
import LobbyScene from "@/components/LobbyScene";
import TarotGallery from "@/components/TarotGallery";

export default function Lobby() {
  const navigate = useNavigate();
  const profile = useSessionStore((state) => state.profile);
  const mode = useSessionStore((state) => state.mode);
  const clearSession = useSessionStore((state) => state.clearSession);
  const setGameMode = useGameStore((state) => state.setGameMode);
  const [showGallery, setShowGallery] = useState(false);

  const isGuest = mode === "guest" || profile?.isGuest;

  useEffect(() => {
    document.title = "命运之战 | 游戏大厅";
  }, []);

  const handleGuestPve = () => {
    setGameMode("pve");
    navigate("/battle");
  };

  const handleLocalPvp = () => {
    setGameMode("pvp");
    navigate("/battle");
  };

  const handleSignOut = async () => {
    if (!isGuest) {
      await signOutAccount();
    }
    clearSession();
    navigate("/auth");
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

        {/* Right Side: Pixel Menu */}
        <div className="app-side-panel lg:w-[450px] xl:w-[500px] flex flex-col gap-4 sm:gap-6 shrink-0 h-full justify-center overflow-y-auto pixel-scrollbar pb-4">
          
          {/* Profile Header */}
          <div className="pixel-panel relative p-4 bg-black/60 border-2 border-gray-700 flex justify-between items-center">
            <div>
              <div className="text-amber-400 font-bold text-lg text-shadow-pixel">{profile?.displayName ?? "占星师"}</div>
              <div className="text-gray-400 text-xs mt-1 font-pixel">
                {isGuest ? "游客模式" : "正式账号"} | {profile?.rankTier ?? "知灵"} | {profile?.ratingPoints ?? 0} 分
              </div>
            </div>
            <button onClick={handleSignOut} className="p-2 bg-red-900/50 hover:bg-red-800/80 border-2 border-red-900 text-red-200 transition-colors">
              <LogOut className="size-5" />
            </button>
          </div>

          {/* Mode Select */}
          <div className="pixel-panel relative p-4 sm:p-6 bg-black/60 border-2 border-gray-700 flex flex-col gap-4 mt-2">
             <div className="absolute -top-4 left-6 bg-gray-800 border-2 border-gray-600 px-4 py-1 text-amber-400 text-sm font-bold z-10 shadow-md">
               游戏大厅
             </div>
             
             {/* Online Modes */}
             <div className="grid grid-cols-2 gap-3 mt-4">
                <button
                  disabled={isGuest}
                  onClick={() => navigate("/ranked")}
                  className="flex flex-col items-center justify-center p-3 border-2 border-gray-700 bg-black/50 hover:border-amber-400 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed group transition-all"
                >
                  <Trophy className="size-8 text-amber-400 mb-2 group-hover:animate-pulse drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                  <span className="text-white font-bold text-shadow-pixel">随机匹配</span>
                </button>
                <button
                  disabled={isGuest}
                  onClick={() => navigate("/rooms")}
                  className="flex flex-col items-center justify-center p-3 border-2 border-gray-700 bg-black/50 hover:border-cyan-400 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed group transition-all"
                >
                  <Users className="size-8 text-cyan-400 mb-2 group-hover:animate-pulse drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
                  <span className="text-white font-bold text-shadow-pixel">自定义房间</span>
                </button>
             </div>

             <div className="grid grid-cols-2 gap-3">
                <button
                  disabled={isGuest}
                  onClick={() => navigate("/friends")}
                  className="flex flex-col items-center justify-center p-3 border-2 border-gray-700 bg-black/50 hover:border-emerald-400 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed group transition-all"
                >
                  <UserPlus className="size-8 text-emerald-400 mb-2 group-hover:animate-pulse drop-shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                  <span className="text-white font-bold text-shadow-pixel">好友系统</span>
                </button>
                <button
                  disabled={isGuest}
                  onClick={() => navigate("/leaderboard")}
                  className="flex flex-col items-center justify-center p-3 border-2 border-gray-700 bg-black/50 hover:border-violet-400 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed group transition-all"
                >
                  <Shield className="size-8 text-violet-400 mb-2 group-hover:animate-pulse drop-shadow-[0_0_8px_rgba(167,139,250,0.6)]" />
                  <span className="text-white font-bold text-shadow-pixel">天梯榜</span>
                </button>
             </div>

             <div className="border-t-2 border-gray-700 my-2" />

             {/* Local / PVE Modes */}
             <div className="flex flex-col gap-3">
                <button
                  onClick={handleGuestPve}
                  className="flex items-center gap-3 p-3 border-2 border-gray-700 bg-black/50 hover:border-cyan-400 hover:bg-gray-800 transition-all"
                >
                  <Swords className="size-6 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]" />
                  <div className="text-left">
                    <div className="text-white font-bold text-shadow-pixel">人机练习</div>
                    <div className="text-gray-400 text-xs mt-1">单人挑战命运傀儡</div>
                  </div>
                </button>
                <button
                  disabled={isGuest}
                  onClick={handleLocalPvp}
                  className="flex items-center gap-3 p-3 border-2 border-gray-700 bg-black/50 hover:border-gray-400 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  <Smartphone className="size-6 text-gray-400" />
                  <div className="text-left">
                    <div className="text-white font-bold text-shadow-pixel">本地双人</div>
                    <div className="text-gray-400 text-xs mt-1">线下同屏对战</div>
                  </div>
                </button>
                <button
                  onClick={() => setShowGallery(true)}
                  className="flex items-center gap-3 p-3 border-2 border-gray-700 bg-black/50 hover:border-amber-400 hover:bg-gray-800 transition-all"
                >
                  <BookOpen className="size-6 text-amber-400 drop-shadow-[0_0_5px_rgba(251,191,36,0.8)]" />
                  <div className="text-left">
                    <div className="text-white font-bold text-shadow-pixel">命运塔罗图鉴</div>
                    <div className="text-gray-400 text-xs mt-1">查看所有卡牌效果与寓意</div>
                  </div>
                </button>
             </div>
             
             {isGuest && (
               <div className="mt-2 text-xs text-amber-500 text-center bg-amber-900/20 p-2 border border-amber-900 font-bold">
                 当前为游客模式，仅开放人机练习。
               </div>
             )}
          </div>
        </div>
      </div>

      {showGallery && <TarotGallery onClose={() => setShowGallery(false)} />}
    </main>
  );
}
