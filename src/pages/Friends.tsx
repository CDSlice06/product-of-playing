import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Check, MailPlus, Search, UserRoundPlus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  acceptFriendRequest,
  fetchFriendRequests,
  fetchFriends,
  rejectFriendRequest,
  searchPlayersByUsername,
  sendFriendRequest,
} from "@/lib/friends";
import { useSessionStore } from "@/store/sessionStore";
import type { FriendProfile, FriendRequestRecord } from "@/types/platform";
import { ASSETS } from "@/constants/assets";
import LobbyScene from "@/components/LobbyScene";

export default function Friends() {
  const navigate = useNavigate();
  const authUserId = useSessionStore((state) => state.authUserId);
  const [keyword, setKeyword] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<FriendProfile[]>([]);      
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [requests, setRequests] = useState<FriendRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  const incomingRequests = useMemo(
    () => requests.filter((request) => request.receiverId === authUserId && request.status === "pending"),
    [authUserId, requests],
  );

  const reloadAll = useCallback(async () => {
    if (!authUserId) {
      return;
    }

    setLoading(true);
    const [friendRows, requestRows] = await Promise.all([
      fetchFriends(authUserId),
      fetchFriendRequests(authUserId),
    ]);
    setFriends(friendRows);
    setRequests(requestRows);
    setLoading(false);
  }, [authUserId]);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  const handleSearch = async () => {
    if (!authUserId) {
      return;
    }

    setSearching(true);
    setMessage(null);
    const results = await searchPlayersByUsername(keyword, authUserId);
    setSearchResults(results);
    setSearching(false);
  };

  const handleSendRequest = async (receiverId: string) => {
    try {
      await sendFriendRequest(receiverId);
      setMessage("好友申请已发送。");
      await reloadAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "好友申请发送失败。");
    }
  };

  const handleAccept = async (requestId: string) => {
    try {
      await acceptFriendRequest(requestId);
      setMessage("已接受好友申请。");
      await reloadAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "接受好友申请失败。");
    }
  };

  const handleReject = async (requestId: string) => {
    try {
      await rejectFriendRequest(requestId);
      setMessage("已拒绝好友申请。");
      await reloadAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "拒绝好友申请失败。");
    }
  };

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
              好友系统
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
                <Search className="size-6 text-amber-400" />
                <h2 className="text-xl font-bold text-white text-shadow-pixel">搜索玩家</h2>
              </div>
              <div className="mt-2 flex flex-col gap-3 md:flex-row">
                <input
                  value={keyword}
                  onChange={(event) => setKeyword(event.target.value)}
                  placeholder="输入用户名搜索"
                  className="w-full min-w-0 flex-1 bg-black/50 border-2 border-gray-600 px-3 py-2 text-white font-pixel outline-none focus:border-amber-400"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  className="flex-shrink-0 border-2 border-amber-600 bg-amber-900/50 px-4 py-2 text-sm text-amber-400 font-bold transition hover:bg-amber-900"
                >
                  {searching ? "搜索中..." : "搜索"}
                </button>
              </div>

              {message && (
                <div className="mt-2 border-2 border-amber-600 bg-amber-900/50 px-3 py-2 text-xs text-amber-200">
                  {message}
                </div>
              )}

              <div className="mt-2 max-h-[120px] overflow-y-auto pixel-scrollbar space-y-2 pr-2">
                {searchResults.map((player) => (
                  <div key={player.id} className="flex items-center justify-between border-2 border-gray-700 bg-black/40 px-3 py-2">
                    <div>
                      <p className="font-bold text-sm text-slate-50">{player.displayName}</p>
                      <p className="text-[10px] text-gray-500">
                        @{player.username} | {player.rankTier} | {player.ratingPoints} 分
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSendRequest(player.id)}
                      className="border-2 border-cyan-600 bg-cyan-900/50 px-3 py-1 text-xs text-cyan-400 font-bold transition hover:bg-cyan-900"
                    >
                      加好友
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t-2 border-gray-700 my-2" />

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <MailPlus className="size-5 text-amber-400" />
                <h2 className="text-lg font-bold text-white text-shadow-pixel">收到的申请</h2>
              </div>
              <div className="mt-2 max-h-[150px] overflow-y-auto pixel-scrollbar space-y-2 pr-2">
                {incomingRequests.length === 0 && (
                  <div className="border-2 border-gray-700 bg-gray-800/30 px-3 py-3 text-xs text-gray-400">
                    暂时还没有新的好友申请。
                  </div>
                )}
                {incomingRequests.map((request) => (
                  <div key={request.id} className="border-2 border-gray-600 bg-gray-800/40 px-3 py-3">
                    <p className="font-bold text-sm text-slate-50">{request.senderName}</p>
                    <p className="mt-1 text-[10px] text-gray-400">发来了一条好友申请</p>
                    <div className="mt-3 flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleAccept(request.id)}
                        className="flex-1 flex items-center justify-center gap-1 border-2 border-emerald-600 bg-emerald-900/50 px-2 py-1 text-xs text-emerald-400 font-bold transition hover:bg-emerald-900"
                      >
                        <Check className="size-3" /> 接受
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(request.id)}
                        className="flex-1 flex items-center justify-center gap-1 border-2 border-rose-600 bg-rose-900/50 px-2 py-1 text-xs text-rose-400 font-bold transition hover:bg-rose-900"
                      >
                        <X className="size-3" /> 拒绝
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t-2 border-gray-700 my-2" />

            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-bold text-white text-shadow-pixel">好友列表</h2>
              <div className="mt-2 space-y-2 max-h-[200px] overflow-y-auto pixel-scrollbar pr-2">
                {!loading && friends.length === 0 && (
                  <div className="border-2 border-gray-700 bg-gray-800/30 px-3 py-3 text-xs text-gray-400">
                    你还没有好友。可以先在上方搜索用户名添加。
                  </div>
                )}
                {friends.map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between border-2 border-gray-600 bg-gray-800/40 px-3 py-2">
                    <div>
                      <p className="font-bold text-sm text-slate-50">{friend.displayName}</p>
                      <p className="mt-1 text-[10px] text-gray-400">
                        @{friend.username} | {friend.rankTier} | {friend.ratingPoints} 分
                      </p>
                    </div>
                    <span className="border-2 border-gray-700 bg-black/50 px-2 py-1 text-[10px] text-gray-300">
                      {friend.status === "online" ? "在线" : friend.status === "in_match" ? "对局中" : "离线"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </main>
  );
}
