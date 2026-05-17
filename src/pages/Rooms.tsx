import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Copy, Hash, Swords, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { fetchFriends } from "@/lib/friends";
import { createCustomRoom, fetchRelevantRooms, inviteFriendToRoom, joinRoomByCode } from "@/lib/rooms";
import { useSessionStore } from "@/store/sessionStore";
import type { CustomRoomRecord, FriendProfile } from "@/types/platform";
import { ASSETS } from "@/constants/assets";
import LobbyScene from "@/components/LobbyScene";

export default function Rooms() {
  const navigate = useNavigate();
  const authUserId = useSessionStore((state) => state.authUserId);
  const [rooms, setRooms] = useState<CustomRoomRecord[]>([]);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [roomCode, setRoomCode] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reloadAll = useCallback(async () => {
    if (!authUserId) {
      return;
    }

    setLoading(true);
    const [roomRows, friendRows] = await Promise.all([
      fetchRelevantRooms(authUserId),
      fetchFriends(authUserId),
    ]);
    setRooms(roomRows);
    setFriends(friendRows);
    setLoading(false);
  }, [authUserId]);

  useEffect(() => {
    reloadAll();
  }, [reloadAll]);

  const handleCreateRoom = async () => {
    if (!authUserId) {
      return;
    }

    try {
      const room = await createCustomRoom(authUserId);
      setMessage(`房间创建成功，房间码：${room.roomCode}`);
      await reloadAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "创建房间失败。");
    }
  };

  const handleJoinByCode = async () => {
    if (!authUserId || !roomCode.trim()) {
      return;
    }

    try {
      const joined = await joinRoomByCode(roomCode, authUserId);
      setMessage(`已加入房间 ${joined.roomCode}`);
      setRoomCode("");
      await reloadAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "加入房间失败。");
    }
  };

  const handleInviteFriend = async (roomId: string, friendId: string) => {      
    try {
      const updated = await inviteFriendToRoom(roomId, friendId);
      setMessage(`已向好友发出邀请，房间码：${updated.roomCode}`); 
      await reloadAll();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "邀请好友失败。");
    }
  };

  const handleEnterOnlineBattle = (roomId: string) => {
    navigate(`/battle?roomId=${roomId}`);
  };

  const latestOwnedRoom = rooms.find((room) => room.ownerId === authUserId && room.status !== "closed");

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
              自定义房间
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
                <Hash className="size-6 text-cyan-400" />
                <h2 className="text-xl font-bold text-white text-shadow-pixel">房间码邀请</h2>
              </div>
              <div className="mt-2 flex flex-col gap-3 md:flex-row">
                <button
                  type="button"
                  onClick={handleCreateRoom}
                  className="flex-shrink-0 border-2 border-cyan-600 bg-cyan-900/50 px-4 py-2 text-sm text-cyan-400 font-bold transition hover:bg-cyan-900"
                >
                  创建房间
                </button>
                <div className="flex flex-1 gap-2">
                  <input
                    value={roomCode}
                    onChange={(event) => setRoomCode(event.target.value.toUpperCase())}
                    placeholder="6 位房间码"
                    className="w-full min-w-0 bg-black/50 border-2 border-gray-600 px-3 py-2 text-white font-pixel outline-none focus:border-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleJoinByCode}
                    className="flex-shrink-0 border-2 border-amber-600 bg-amber-900/50 px-4 py-2 text-sm text-amber-400 font-bold transition hover:bg-amber-900"
                  >
                    加入
                  </button>
                </div>
              </div>

              {message && (
                <div className="mt-2 border-2 border-amber-600 bg-amber-900/50 px-3 py-2 text-xs text-amber-200">
                  {message}
                </div>
              )}

              {latestOwnedRoom && (
                <div className="mt-2 border-2 border-cyan-700 bg-cyan-900/30 px-4 py-3">
                  <p className="font-bold text-cyan-400 text-sm">当前可邀请房间</p>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-gray-300">
                      房间码：<span className="font-bold text-amber-400 text-sm tracking-[0.25em]">{latestOwnedRoom.roomCode}</span>
                    </p>
                    <button
                      type="button"
                      onClick={() => navigator.clipboard.writeText(latestOwnedRoom.roomCode)}
                      className="inline-flex items-center gap-2 border-2 border-gray-600 bg-gray-800/50 px-3 py-1 text-xs text-slate-100 transition hover:bg-gray-700"
                    >
                      <Copy className="size-3" />
                      复制
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t-2 border-gray-700 my-2" />

            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Swords className="size-5 text-violet-400" />
                <h2 className="text-lg font-bold text-white text-shadow-pixel">好友直邀</h2>
              </div>
              <div className="mt-2 max-h-[150px] overflow-y-auto pixel-scrollbar space-y-2 pr-2">
                {friends.length === 0 && (
                  <div className="border-2 border-gray-700 bg-gray-800/30 px-3 py-3 text-xs text-gray-400">
                    你还没有好友，先去好友页添加后再来直邀。
                  </div>
                )}
                {friends.map((friend) => (
                  <div key={friend.id} className="flex items-center justify-between border-2 border-gray-700 bg-black/40 px-3 py-2">
                    <div>
                      <p className="font-bold text-sm text-slate-50">{friend.displayName}</p>
                      <p className="text-[10px] text-gray-500">@{friend.username}</p>
                    </div>
                    <button
                      type="button"
                      disabled={!latestOwnedRoom}
                      onClick={() => latestOwnedRoom && handleInviteFriend(latestOwnedRoom.id, friend.id)}
                      className="border-2 border-violet-600 bg-violet-900/50 px-3 py-1 text-xs text-violet-400 font-bold transition hover:bg-violet-900 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      邀请进房
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t-2 border-gray-700 my-2" />

            <div className="flex flex-col gap-2">
              <h2 className="text-lg font-bold text-white text-shadow-pixel">我的房间列表</h2>
              <div className="mt-2 space-y-3 max-h-[200px] overflow-y-auto pixel-scrollbar pr-2">
                {!loading && rooms.length === 0 && (
                  <div className="border-2 border-gray-700 bg-gray-800/30 px-3 py-3 text-xs text-gray-400">
                    还没有房间记录。
                  </div>
                )}
                {rooms.map((room) => (
                  <div key={room.id} className="border-2 border-gray-600 bg-gray-800/40 px-3 py-3">
                    <div className="flex items-start justify-between gap-3">   
                      <div>
                        <p className="font-bold text-sm text-amber-400">房间码 {room.roomCode}</p>
                        <p className="mt-1 text-[10px] text-gray-400">
                          房主：{room.ownerName}
                        </p>
                        <p className="text-[10px] text-gray-400">
                          受邀：{room.invitedUserName || "暂无"}
                        </p>
                      </div>
                      <span className="border-2 border-gray-700 bg-black/50 px-2 py-1 text-[10px] text-gray-300">
                        {room.status === "waiting" ? "等待中" : room.status === "ready" ? "已就绪" : room.status === "playing" ? "对局中" : "已关闭"}   
                      </span>
                    </div>
                    {room.invitedUserId && room.status !== "closed" && (        
                      <button
                        type="button"
                        onClick={() => handleEnterOnlineBattle(room.id)}        
                        className="mt-3 w-full border-2 border-cyan-600 bg-cyan-900/50 px-3 py-2 text-xs text-cyan-400 font-bold transition hover:bg-cyan-900"   
                      >
                        进入联机对局
                      </button>
                    )}
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
