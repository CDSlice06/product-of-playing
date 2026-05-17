import { useEffect, useState } from "react";
import { ArrowLeft, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchLeaderboard } from "@/lib/leaderboard";
import type { LeaderboardEntry } from "@/types/platform";
import { ASSETS } from "@/constants/assets";
import LobbyScene from "@/components/LobbyScene";

export default function Leaderboard() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchLeaderboard().then((data) => {
      if (!cancelled) {
        setEntries(data);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="app-shell relative overflow-hidden bg-black flex flex-col items-center justify-center">
      <div
        className="absolute inset-0 z-0 opacity-40 pointer-events-none"
        style={{ backgroundImage: `url(${ASSETS.LOBBY_BG})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(2px)' }}
      />

      <div className="app-page-layout relative z-10">
        <div className="app-scene-panel flex-col items-center justify-center pixel-panel bg-black/40 p-4 relative">
          <LobbyScene />
        </div>

        <div className="app-side-panel lg:w-[450px] xl:w-[500px] flex flex-col gap-4 sm:gap-6 shrink-0 h-full justify-center overflow-y-auto pixel-scrollbar pb-4">
          
          <div className="pixel-panel relative p-4 sm:p-6 bg-black/60 border-2 border-gray-700 flex flex-col gap-4 mt-2">
            <div className="absolute -top-4 left-6 bg-gray-800 border-2 border-gray-600 px-4 py-1 text-amber-400 text-sm font-bold z-10 shadow-md">
              天梯榜
            </div>
            
            <button
              type="button"
              onClick={() => navigate("/lobby")}
              className="inline-flex w-fit items-center gap-2 border-2 border-gray-700 bg-black/50 px-4 py-2 text-sm text-slate-100 transition hover:bg-gray-800"
            >
              <ArrowLeft className="size-4" />
              返回大厅
            </button>

            <div className="flex flex-col gap-2 mt-2">
              <div className="flex items-center gap-2">
                <Crown className="size-6 text-amber-400" />
                <h1 className="text-xl font-bold text-white text-shadow-pixel">天梯榜单</h1>
              </div>
              <p className="text-xs leading-5 text-gray-400 mt-2">
                按总积分排名，积分相同则优先胜场更多的玩家。
              </p>

              <div className="mt-4 border-2 border-gray-700 bg-black/50">
                <div className="grid grid-cols-[40px_1fr_60px_50px] gap-2 border-b-2 border-gray-700 bg-gray-800 px-2 py-2 text-[10px] text-amber-400 font-bold">
                  <span>排名</span>
                  <span>玩家</span>
                  <span>段位</span>
                  <span className="text-right">积分</span>
                </div>

                <div className="max-h-[300px] overflow-y-auto pixel-scrollbar">
                  {loading && (
                    <div className="px-3 py-4 text-xs text-gray-400">读取中...</div>
                  )}

                  {!loading && entries.length === 0 && (
                    <div className="px-3 py-4 text-xs text-gray-400">
                      暂无数据。
                    </div>
                  )}

                  {!loading && entries.map((entry, index) => (
                    <div
                      key={entry.userId}
                      className="grid grid-cols-[40px_1fr_60px_50px] gap-2 border-b border-gray-800 px-2 py-3 text-xs text-slate-200 hover:bg-gray-900/50 transition-colors"
                    >
                      <span className="font-bold text-amber-400">#{index + 1}</span>
                      <div className="truncate">
                        <p className="font-bold text-slate-50 truncate">{entry.displayName}</p>
                        <p className="text-[10px] text-gray-500 truncate">@{entry.username}</p>   
                      </div>
                      <span className="flex items-center text-[10px]">{entry.rankTier}</span>
                      <span className="flex items-center justify-end font-bold text-cyan-400">{entry.ratingPoints}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
