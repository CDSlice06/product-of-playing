import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Clock3, Shield, Swords, Trophy } from "lucide-react";       
import { useNavigate } from "react-router-dom";
import {
  fetchActiveRankedRoom,
  fetchCurrentQueueEntry,
  fetchRecentRankedMatches,
  joinRankedQueue,
  leaveRankedQueue,
  settleRankedMatch,
} from "@/lib/ranked";
import { RANKED_RESULT_POINTS, RANK_THRESHOLDS } from "@/lib/ranks";
import { useSessionStore } from "@/store/sessionStore";
import type { RankedMatchRecord, RankedQueueEntry, RankedRoomRecord } from "@/types/platform";
import { ASSETS } from "@/constants/assets";
import LobbyScene from "@/components/LobbyScene";

export default function Ranked() {
  const navigate = useNavigate();
  const authUserId = useSessionStore((state) => state.authUserId);
  const profile = useSessionStore((state) => state.profile);
  const refreshProfile = useSessionStore((state) => state.refreshProfile);      
  const [queueEntry, setQueueEntry] = useState<RankedQueueEntry | null>(null);  
  const [activeRoom, setActiveRoom] = useState<RankedRoomRecord | null>(null);  
  const [recentMatches, setRecentMatches] = useState<RankedMatchRecord[]>([]);  
  const [queueSize, setQueueSize] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const reloadAll = useCallback(async () => {
    if (!authUserId) {
      return;
    }

    const [nextQueue, nextRoom, nextHistory] = await Promise.all([
      fetchCurrentQueueEntry(authUserId),
      fetchActiveRankedRoom(authUserId),
      fetchRecentRankedMatches(authUserId),
    ]);

    setQueueEntry(nextQueue);
    setActiveRoom(nextRoom);
    setRecentMatches(nextHistory);
    setLoading(false);
  }, [authUserId]);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  useEffect(() => {
    if (!queueEntry && !activeRoom) {
      return;
    }

    const timer = window.setInterval(() => {
      void reloadAll();
    }, queueEntry && !activeRoom ? 1500 : 2000);

    return () => {
      window.clearInterval(timer);
    };
  }, [activeRoom, queueEntry, reloadAll]);

  const queueElapsed = useMemo(() => {
    if (!queueEntry) {
      return null;
    }

    const elapsedSeconds = Math.max(0, Math.floor((Date.now() - new Date(queueEntry.createdAt).getTime()) / 1000));
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    return `${minutes} 分 ${seconds.toString().padStart(2, "0")} 秒`;
  }, [queueEntry]);

  const handleJoinQueue = async () => {
    if (!authUserId) {
      return;
    }

    try {
      setBusy(true);
      const result = await joinRankedQueue();
      setQueueSize(result.queueSize);
      setMessage(
        result.matched
          ? `匹配成功，当前对手：${result.opponentName ?? "未知占星师"}，房间码 ${result.roomCode ?? "--"}。`
          : `已进入匹配队列，当前队列人数 ${result.queueSize}。`,
      );
      await reloadAll();
    } catch (error) {
      const [nextQueue, nextRoom] = await Promise.all([
        fetchCurrentQueueEntry(authUserId),
        fetchActiveRankedRoom(authUserId),
      ]);

      setQueueEntry(nextQueue);
      setActiveRoom(nextRoom);

      if (nextRoom) {
        setMessage(`匹配已完成，当前对手：${nextRoom.ownerId === authUserId ? nextRoom.invitedUserName ?? "未知占星师" : nextRoom.ownerName}，房间码 ${nextRoom.roomCode}。`);
      } else if (nextQueue) {
        setMessage("已进入匹配队列，正在等待另一位玩家。");
      } else {
        setMessage(error instanceof Error ? error.message : "进入匹配队列失败。");
      }
    } finally {
      setBusy(false);
    }
  };

  const handleLeaveQueue = async () => {
    try {
      setBusy(true);
      await leaveRankedQueue();
      setMessage("已退出匹配队列。");
      await reloadAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "退出匹配队列失败。");
    } finally {
      setBusy(false);
    }
  };

  const handleSettleResult = async (result: "win" | "loss") => {
    if (!activeRoom) {
      return;
    }

    try {
      setBusy(true);
      await settleRankedMatch(activeRoom.id, result);
      await Promise.all([refreshProfile(), reloadAll()]);
      setMessage(result === "win" ? "本场天梯已结算为胜利，积分和段位已更新。" : "本场天梯已结算为失利，积分和段位已更新。");    
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "结算天梯结果失败。");
    } finally {
      setBusy(false);
    }
  };

  const handleEnterOnlineBattle = (roomId: string) => {
    navigate(`/battle?roomId=${roomId}`);
  };

  const rankedDisabled = true;

  return (
    <main className="app-shell relative overflow-hidden bg-black flex flex-col items-center justify-center">
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
          
          <div className="pixel-panel relative p-4 sm:p-6 bg-black/60 border-2 border-gray-700 flex flex-col gap-4 mt-2">
             <div className="absolute -top-4 left-6 bg-gray-800 border-2 border-gray-600 px-4 py-1 text-amber-400 text-sm font-bold z-10 shadow-md">
               天梯匹配
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
                <Trophy className="size-6 text-amber-400" />
                <h1 className="text-xl font-bold text-white text-shadow-pixel">随机匹配与天梯</h1>
              </div>
              <p className="text-xs leading-5 text-gray-400">    
                正式对局胜利 +{RANKED_RESULT_POINTS.win} 分，失败 {RANKED_RESULT_POINTS.loss} 分。自定义房间不计分、不计段位。
              </p>
              <div className="mt-2 border-2 border-gray-700 bg-gray-800/50 px-3 py-2 text-xs text-cyan-400 font-bold">
                当前账号：{profile?.displayName ?? "占星师"} | 段位：{profile?.rankTier ?? "知灵"} | 积分：{profile?.ratingPoints ?? 0} | 战绩：{profile?.wins ?? 0} 胜 / {profile?.losses ?? 0} 负
              </div>
              
              <div className="mt-4 flex flex-col gap-3">
                {rankedDisabled && (
                  <div className="border-2 border-amber-600 bg-amber-900/30 px-3 py-2 text-sm font-bold text-amber-300 text-center">
                    待开放
                  </div>
                )}
                <button
                  type="button"
                  disabled={rankedDisabled || busy || Boolean(queueEntry) || Boolean(activeRoom)}
                  onClick={handleJoinQueue}
                  className="w-full border-2 border-amber-500 bg-amber-900/50 px-4 py-3 text-sm text-amber-400 font-bold transition hover:bg-amber-900 disabled:cursor-not-allowed disabled:opacity-50 text-shadow-pixel"
                >
                  开始匹配
                </button>
                <div className="flex gap-3">
                  <button
                    type="button"
                    disabled={rankedDisabled || busy || !queueEntry}
                    onClick={handleLeaveQueue}
                    className="flex-1 border-2 border-gray-600 bg-gray-800/50 px-4 py-2 text-sm text-slate-100 transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    退出匹配
                  </button>
                  <button
                    type="button"
                    disabled={rankedDisabled || busy || !activeRoom}
                    onClick={() => activeRoom && handleEnterOnlineBattle(activeRoom.id)}
                    className="flex-1 border-2 border-cyan-500 bg-cyan-900/50 px-4 py-2 text-sm text-cyan-400 font-bold transition hover:bg-cyan-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    进入对局
                  </button>
                </div>
              </div>
              
              {message && (
                <div className="mt-2 border-2 border-amber-600 bg-amber-900/50 px-3 py-2 text-xs text-amber-200">
                  {message}
                </div>
              )}
            </div>

            <div className="border-t-2 border-gray-700 my-2" />

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Clock3 className="size-5 text-cyan-400" />
                <h2 className="text-lg font-bold text-white text-shadow-pixel">当前匹配状态</h2>
              </div>

              {!loading && !queueEntry && !activeRoom && (
                <div className="border-2 border-gray-700 bg-gray-800/30 px-3 py-3 text-xs text-gray-400">
                  你当前未在匹配，也没有待结算的天梯对局。
                </div>
              )}

              {queueEntry && !activeRoom && (
                <div className="border-2 border-amber-500 bg-amber-900/30 px-3 py-3">
                  <p className="text-sm font-bold text-amber-400">正在搜索对手</p>
                  <div className="mt-2 space-y-1 text-xs text-gray-300">
                    <p>入队积分快照：{queueEntry.ratingSnapshot}</p>
                    <p>已等待：{queueElapsed ?? "刚刚开始"}</p>
                    <p>当前排队人数：{queueSize || 1}</p>
                  </div>
                </div>
              )}

              {activeRoom && (
                <div className="border-2 border-cyan-500 bg-cyan-900/30 px-3 py-3">
                  <div className="flex items-center gap-2">
                    <Swords className="size-4 text-cyan-400" />
                    <p className="text-sm font-bold text-cyan-400">已匹配到对手</p>
                  </div>
                  <div className="mt-2 space-y-1 text-xs text-gray-300">
                    <p>房间码：<span className="font-bold text-amber-400">{activeRoom.roomCode}</span></p>
                    <p>对手：{activeRoom.ownerId === authUserId ? activeRoom.invitedUserName ?? "等待同步" : activeRoom.ownerName}</p>
                    <p>当前状态：{activeRoom.status === "ready" ? "已就绪" : activeRoom.status === "playing" ? "对局中" : "等待中"}</p>
                  </div>
                  <div className="mt-3 border border-gray-600 bg-black/40 px-3 py-2 text-xs text-gray-400">
                    对局结束后，你仍可以在这里完成天梯胜负结算与积分写回。
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleSettleResult("win")}
                      className="flex-1 border-2 border-emerald-600 bg-emerald-900/50 px-3 py-2 text-xs text-emerald-400 font-bold transition hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      我赢了
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => handleSettleResult("loss")}
                      className="flex-1 border-2 border-rose-600 bg-rose-900/50 px-3 py-2 text-xs text-rose-400 font-bold transition hover:bg-rose-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      我输了
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
