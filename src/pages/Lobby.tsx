import { BookOpen, LogOut, Shield, Smartphone, Sparkles, Swords, Trophy, UserPlus, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { signOutAccount } from "@/lib/account";
import { leaveRelevantCustomRooms } from "@/lib/rooms";
import { useGameStore } from "@/store/gameStore";
import { useSessionStore } from "@/store/sessionStore";
import { ASSETS } from "@/constants/assets";
import type { AiDifficulty } from "@/types/game";
import { AI_DIFFICULTY_DESCRIPTIONS, AI_DIFFICULTY_LABELS } from "@/utils/board";
import LobbyScene from "@/components/LobbyScene";
import TarotGallery from "@/components/TarotGallery";

export default function Lobby() {
  const navigate = useNavigate();
  const profile = useSessionStore((state) => state.profile);
  const mode = useSessionStore((state) => state.mode);
  const authUserId = useSessionStore((state) => state.authUserId);
  const clearSession = useSessionStore((state) => state.clearSession);
  const aiDifficulty = useGameStore((state) => state.aiDifficulty);
  const setGameMode = useGameStore((state) => state.setGameMode);
  const setAiDifficulty = useGameStore((state) => state.setAiDifficulty);
  const [showGallery, setShowGallery] = useState(false);

  const isGuest = mode === "guest" || profile?.isGuest;

  useEffect(() => {
    document.title = "命运之战 | 像素大厅";
  }, []);

  const handleGuestPve = (difficulty: AiDifficulty) => {
    setAiDifficulty(difficulty);
    setGameMode("pve");
    navigate("/battle");
  };

  const handleLocalPvp = () => {
    setGameMode("pvp");
    navigate("/battle");
  };

  const handleSignOut = async () => {
    if (!isGuest) {
      if (authUserId) {
        await leaveRelevantCustomRooms(authUserId);
      }
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

          <button
            onClick={() => navigate("/divination")}
            className="pixel-panel relative overflow-hidden p-0 border-2 border-fuchsia-500/70 bg-black/70 text-left transition-all hover:border-fuchsia-300 hover:shadow-[0_0_24px_rgba(217,70,239,0.35)]"
          >
            <div
              className="absolute inset-0 opacity-45"
              style={{ backgroundImage: `url(${ASSETS.DIVINATION_HERO})`, backgroundSize: "cover", backgroundPosition: "center" }}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/70 to-fuchsia-950/60" />
            <div className="relative z-10 p-4 sm:p-5">
              <div className="inline-flex items-center gap-2 border border-fuchsia-400/60 bg-fuchsia-950/50 px-3 py-1 text-[10px] font-bold text-fuchsia-200">
                <Sparkles className="size-3.5" />
                神秘占卜
              </div>
              <div className="mt-3 text-white font-bold text-xl text-shadow-pixel">塔罗占卜</div>
              <div className="mt-2 max-w-md text-xs leading-6 text-fuchsia-100/90">
                完整 78 张塔罗牌，按洗牌、切牌、抽牌、解读流程进行占卜。
              </div>
              <div className="mt-4 flex flex-wrap gap-2 text-[10px]">
                <span className="border border-fuchsia-400/50 bg-fuchsia-950/45 px-2 py-1 text-fuchsia-100">78 张完整牌库</span>
                <span className="border border-amber-400/50 bg-amber-950/35 px-2 py-1 text-amber-100">仪式感流程</span>
                <span className="border border-cyan-400/50 bg-cyan-950/35 px-2 py-1 text-cyan-100">逐张翻牌</span>
              </div>
            </div>
          </button>

          {/* Mode Select */}
          <div className="pixel-panel relative p-4 sm:p-6 bg-black/60 border-2 border-gray-700 flex flex-col gap-4 mt-2">
             <div className="absolute -top-4 left-6 bg-gray-800 border-2 border-gray-600 px-4 py-1 text-amber-400 text-sm font-bold z-10 shadow-md">
               游戏大厅
             </div>
             
             {/* Online Modes */}
             <div className="grid grid-cols-2 gap-3 mt-4">
                <div
                  aria-disabled="true"
                  className="relative flex flex-col items-center justify-center p-3 border-2 border-gray-700 bg-black/50 opacity-70 cursor-not-allowed select-none"
                >
                  <div className="relative mb-2 pt-4">
                    <Trophy className="size-8 text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.6)]" />
                    <span className="absolute left-1/2 top-0 -translate-x-1/2 border border-amber-500 bg-amber-900/90 px-1.5 py-0.5 text-[9px] font-bold leading-none text-amber-200 whitespace-nowrap">
                      待开放
                    </span>
                  </div>
                  <span className="text-white font-bold text-shadow-pixel">随机匹配</span>
                  <span className="mt-1 text-[10px] text-amber-300">功能暂未开放</span>
                </div>
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
                <div className="p-3 border-2 border-gray-700 bg-black/50">
                  <div className="flex items-center gap-3">
                    <Swords className="size-6 text-cyan-400 drop-shadow-[0_0_5px_rgba(34,211,238,0.8)]" />
                    <div className="text-left">
                      <div className="text-white font-bold text-shadow-pixel">人机练习</div>
                      <div className="text-gray-400 text-xs mt-1">单人挑战命运傀儡，可自行选择简单 / 中等 / 困难</div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    {(["easy", "medium", "hard"] as AiDifficulty[]).map((difficulty) => (
                      <button
                        key={difficulty}
                        type="button"
                        onClick={() => handleGuestPve(difficulty)}
                        className={`border-2 px-2 py-2 text-xs font-bold transition-all ${
                          aiDifficulty === difficulty
                            ? "border-cyan-300 bg-cyan-900/50 text-cyan-100"
                            : "border-cyan-900/70 bg-cyan-950/40 text-cyan-300 hover:border-cyan-500 hover:bg-cyan-900/40"
                        }`}
                      >
                        {AI_DIFFICULTY_LABELS[difficulty]}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2 text-[11px] text-cyan-200">
                    当前默认：{AI_DIFFICULTY_LABELS[aiDifficulty]}。{AI_DIFFICULTY_DESCRIPTIONS[aiDifficulty]}
                  </div>
                </div>
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
