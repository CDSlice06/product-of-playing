import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Copy, Crown, Hash, Play, Swords, Users } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import LobbyScene from "@/components/LobbyScene";
import { ASSETS } from "@/constants/assets";
import { fetchFriends } from "@/lib/friends";
import { cleanupStaleCustomRooms, enterCustomRoomWaiting, fetchCustomRoom, inviteFriendToRoom, leaveCustomRoom, startCustomRoomBattle, subscribeCustomRoom } from "@/lib/rooms";
import { useSessionStore } from "@/store/sessionStore";
import type { CustomRoomRecord, FriendProfile } from "@/types/platform";

export default function RoomWait() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const authUserId = useSessionStore((state) => state.authUserId);
  const roomId = searchParams.get("roomId");
  const [room, setRoom] = useState<CustomRoomRecord | null>(null);
  const [friends, setFriends] = useState<FriendProfile[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const enteredBattleRef = useRef(false);
  const enteredWaitingRef = useRef<string | null>(null);

  const reloadRoom = useCallback(async () => {
    if (!roomId) {
      return;
    }

    const nextRoom = await fetchCustomRoom(roomId);
    setRoom(nextRoom);
    setLoading(false);
  }, [roomId]);

  useEffect(() => {
    if (!roomId) {
      navigate("/rooms", { replace: true });
      return;
    }

    if (authUserId) {
      void cleanupStaleCustomRooms(authUserId, roomId);
    }
    void reloadRoom();
  }, [authUserId, navigate, reloadRoom, roomId]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    return subscribeCustomRoom(roomId, (nextRoom) => {
      setRoom(nextRoom);
      setLoading(false);
    });
  }, [roomId]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    const timer = window.setInterval(() => {
      void reloadRoom();
    }, 1500);

    return () => {
      window.clearInterval(timer);
    };
  }, [reloadRoom, roomId]);

  useEffect(() => {
    if (!authUserId) {
      return;
    }

    void fetchFriends(authUserId).then(setFriends);
  }, [authUserId]);

  useEffect(() => {
    if (!roomId) {
      return;
    }

    const handleVisibleReload = () => {
      if (document.visibilityState === "visible") {
        void reloadRoom();
      }
    };

    const handleFocusReload = () => {
      void reloadRoom();
    };

    window.addEventListener("focus", handleFocusReload);
    document.addEventListener("visibilitychange", handleVisibleReload);

    return () => {
      window.removeEventListener("focus", handleFocusReload);
      document.removeEventListener("visibilitychange", handleVisibleReload);
    };
  }, [reloadRoom, roomId]);

  useEffect(() => {
    if (!room || !authUserId) {
      return;
    }

    const isParticipant = room.ownerId === authUserId || room.invitedUserId === authUserId;
    if (!isParticipant || room.status === "closed" || room.status === "playing") {
      if (enteredWaitingRef.current === room.id) {
        enteredWaitingRef.current = null;
      }
      return;
    }

    if (enteredWaitingRef.current === room.id) {
      return;
    }

    enteredWaitingRef.current = room.id;
    void enterCustomRoomWaiting(room.id)
      .then((nextRoom) => {
        if (nextRoom) {
          setRoom(nextRoom);
        }
      })
      .catch((error) => {
        setMessage(error instanceof Error ? error.message : "进入等待房间失败。");
        enteredWaitingRef.current = null;
      });
  }, [authUserId, room]);

  useEffect(() => {
    if (!room) {
      return;
    }

    if (room.status === "closed") {
      setMessage("这个房间已经关闭，请返回重新创建或加入。");
      enteredBattleRef.current = false;
      return;
    }

    if (room.status !== "playing") {
      enteredBattleRef.current = false;
      return;
    }

    if (enteredBattleRef.current) {
      return;
    }

    enteredBattleRef.current = true;
    navigate(`/battle?roomId=${room.id}`);
  }, [navigate, room]);

  const isOwner = room?.ownerId === authUserId;
  const hasGuestEntered = Boolean(room?.invitedUserId && room?.invitedJoined);
  const bothPlayersReady = Boolean(room?.ownerJoined && room?.invitedUserId && room?.invitedJoined);
  const canStart = Boolean(isOwner && bothPlayersReady && room?.status === "ready");
  const roomStatusText = useMemo(() => {
    if (!room) {
      return "正在同步房间";
    }

    if (room.status === "playing") {
      return "房主已开始对局，正在进入棋盘";
    }

    if (room.status === "closed") {
      return "房间已关闭";
    }

    if (bothPlayersReady) {
      return isOwner ? "双方已进入，等待房主开始对局" : "双方已进入，等待房主点击开始";
    }

    if (room.status === "waiting") {
      return room.invitedUserId ? "已发出邀请，等待受邀玩家真正进入等待房间" : "等待另一位玩家进入房间";
    }

    return room.invitedUserId ? "正在同步另一位玩家的进入状态" : "等待另一位玩家进入房间";
  }, [bothPlayersReady, isOwner, room]);

  const handleStartBattle = async () => {
    if (!room || !authUserId) {
      return;
    }

    try {
      setBusy(true);
      const updatedRoom = await startCustomRoomBattle(room.id, authUserId);
      setRoom(updatedRoom);
      setMessage("房主已点击开始，正在进入双人对局。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "开始对局失败。");
    } finally {
      setBusy(false);
    }
  };

  const handleLeaveRoom = async () => {
    if (!room || !authUserId) {
      navigate("/rooms");
      return;
    }

    try {
      setBusy(true);
      await leaveCustomRoom(room.id, authUserId);
      navigate("/rooms");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "离开房间失败。");
    } finally {
      setBusy(false);
    }
  };

  const handleInviteFriend = async (friendId: string) => {
    if (!room || !authUserId || room.ownerId !== authUserId) {
      return;
    }

    try {
      setBusy(true);
      const updatedRoom = await inviteFriendToRoom(room.id, friendId);
      setRoom(updatedRoom);
      setMessage(`已向 ${friends.find((friend) => friend.id === friendId)?.displayName ?? "好友"} 发出邀请。`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "邀请好友失败。");
    } finally {
      setBusy(false);
    }
  };

  const player2Label = room?.invitedUserName ?? (room?.status === "waiting" ? "等待加入中" : "等待同步中");
  const inviteCandidates = friends.filter((friend) => friend.id !== room?.ownerId);

  return (
    <main className="app-shell relative overflow-hidden bg-black flex flex-col items-center justify-center">
      <div
        className="absolute inset-0 z-0 opacity-40 pointer-events-none"
        style={{ backgroundImage: `url(${ASSETS.LOBBY_BG})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(2px)" }}
      />

      <div className="app-page-layout relative z-10">
        <div className="app-scene-panel flex-col items-center justify-center pixel-panel bg-black/40 p-4 relative">
          <LobbyScene />
        </div>

        <div className="app-side-panel lg:w-[450px] xl:w-[500px] flex flex-col gap-4 sm:gap-6 shrink-0 h-full justify-center overflow-y-auto pixel-scrollbar pb-4">
          <div className="pixel-panel relative p-4 sm:p-6 bg-black/60 border-2 border-gray-700 flex flex-col gap-4 mt-2">
            <div className="absolute -top-4 left-6 bg-gray-800 border-2 border-gray-600 px-4 py-1 text-amber-400 text-sm font-bold z-10 shadow-md">
              房间等待界面
            </div>

            <div className="flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => navigate("/rooms")}
                className="inline-flex w-fit items-center gap-2 border-2 border-gray-700 bg-black/50 px-4 py-2 text-sm text-slate-100 transition hover:bg-gray-800"
              >
                <ArrowLeft className="size-4" />
                返回房间列表
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={handleLeaveRoom}
                className="border-2 border-rose-700 bg-rose-900/40 px-4 py-2 text-xs font-bold text-rose-200 transition hover:bg-rose-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                离开房间
              </button>
            </div>

            <div className="border-2 border-cyan-700 bg-cyan-900/30 px-4 py-4">
              <div className="flex items-center gap-2">
                <Hash className="size-5 text-cyan-400" />
                <p className="text-sm font-bold text-cyan-400">当前房间码</p>
              </div>
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xl font-bold tracking-[0.35em] text-amber-400">
                  {room?.roomCode ?? "------"}
                </p>
                <button
                  type="button"
                  disabled={!room?.roomCode}
                  onClick={() => room?.roomCode && navigator.clipboard.writeText(room.roomCode)}
                  className="inline-flex items-center gap-2 border-2 border-gray-600 bg-gray-800/50 px-3 py-1 text-xs text-slate-100 transition hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Copy className="size-3" />
                  复制
                </button>
              </div>
            </div>

            <div className="border-2 border-gray-700 bg-black/40 px-4 py-3">
              <div className="flex items-center gap-2">
                <Users className="size-5 text-violet-400" />
                <p className="text-sm font-bold text-white text-shadow-pixel">房间状态</p>
              </div>
              <p className="mt-2 text-xs text-gray-300">
                {loading ? "正在读取房间状态..." : roomStatusText}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="border-2 border-gray-700 bg-black/40 px-4 py-4">
                <div className="flex items-center gap-2">
                  <Crown className="size-4 text-amber-400" />
                  <p className="text-xs font-bold text-amber-400">房主</p>
                </div>
                <p className="mt-2 text-sm font-bold text-white">{room?.ownerName ?? "读取中"}</p>
                <p className="mt-1 text-[11px] text-gray-400">
                  {room?.ownerId === authUserId ? "你是房主，可在双方真正到齐后点击开始。" : "等待房主开始对局。"}
                </p>
                <p className="mt-2 text-[11px] text-cyan-300">
                  {room?.ownerJoined ? "已进入等待房间" : "未进入等待房间"}
                </p>
              </div>

              <div className="border-2 border-gray-700 bg-black/40 px-4 py-4">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-cyan-400" />
                  <p className="text-xs font-bold text-cyan-400">对战玩家</p>
                </div>
                <p className="mt-2 text-sm font-bold text-white">{player2Label}</p>
                <p className="mt-1 text-[11px] text-gray-400">
                  {room?.invitedUserId ? "已锁定对战玩家，等待对方真正进入。" : "等待另一位玩家通过房间码进入。"}
                </p>
                <p className="mt-2 text-[11px] text-cyan-300">
                  {room?.invitedUserId ? (room.invitedJoined ? "已进入等待房间" : "尚未进入等待房间") : "尚未加入"}
                </p>
              </div>
            </div>

            {isOwner && room?.status !== "playing" && room?.status !== "closed" && (
              <div className="border-2 border-gray-700 bg-black/40 px-4 py-4">
                <div className="flex items-center gap-2">
                  <Swords className="size-4 text-violet-400" />
                  <p className="text-sm font-bold text-white text-shadow-pixel">等待界面邀请好友</p>
                </div>
                <p className="mt-2 text-[11px] text-gray-400">
                  房主可以在这里直接邀请好友进入当前等待房间。
                </p>
                <div className="mt-3 max-h-[180px] space-y-2 overflow-y-auto pixel-scrollbar pr-2">
                  {inviteCandidates.length === 0 && (
                    <div className="border-2 border-gray-700 bg-gray-800/30 px-3 py-3 text-xs text-gray-400">
                      你还没有好友，先去好友页添加后再来邀请。
                    </div>
                  )}
                  {inviteCandidates.map((friend) => {
                    const isCurrentInvited = room?.invitedUserId === friend.id;
                    const isJoinedGuest = isCurrentInvited && room.invitedJoined;
                    const disabled = busy || isJoinedGuest;

                    return (
                      <div key={friend.id} className="flex items-center justify-between border-2 border-gray-700 bg-black/40 px-3 py-2">
                        <div>
                          <p className="font-bold text-sm text-slate-50">{friend.displayName}</p>
                          <p className="text-[10px] text-gray-500">@{friend.username}</p>
                        </div>
                        <button
                          type="button"
                          disabled={disabled}
                          onClick={() => handleInviteFriend(friend.id)}
                          className="border-2 border-violet-600 bg-violet-900/50 px-3 py-1 text-xs text-violet-400 font-bold transition hover:bg-violet-900 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isJoinedGuest ? "已进入房间" : isCurrentInvited ? "重新邀请" : "邀请进房"}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {isOwner && room?.invitedUserId && !room.invitedJoined && (
              <div className="border-2 border-amber-600 bg-amber-900/30 px-3 py-2 text-xs text-amber-200">
                已邀请对方，但对方还没有真正进入等待房间，暂时不能开始游戏。
              </div>
            )}

            {message && (
              <div className="border-2 border-amber-600 bg-amber-900/50 px-3 py-2 text-xs text-amber-200">
                {message}
              </div>
            )}

            <button
              type="button"
              disabled={busy || !canStart}
              onClick={handleStartBattle}
              className="inline-flex w-full items-center justify-center gap-2 border-2 border-cyan-600 bg-cyan-900/50 px-4 py-3 text-sm font-bold text-cyan-400 transition hover:bg-cyan-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Play className="size-4" />
              {isOwner ? "房主开始双人对局" : "等待房主开始"}
            </button>

            <div className="border-2 border-gray-700 bg-black/30 px-3 py-3 text-xs leading-5 text-gray-400">
              说明：双方都先进入这个等待房间，确认另一位玩家已经到位后，再由房主点击开始，之后才会跳转到游戏棋盘界面。
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
