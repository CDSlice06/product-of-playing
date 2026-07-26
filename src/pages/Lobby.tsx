import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { signOutAccount } from "@/lib/account";
import { leaveRelevantCustomRooms } from "@/lib/rooms";
import { useGameStore } from "@/store/gameStore";
import { useSessionStore } from "@/store/sessionStore";
import { ASSETS } from "@/constants/assets";
import type { AiDifficulty } from "@/types/game";
import { AI_DIFFICULTY_DESCRIPTIONS, AI_DIFFICULTY_LABELS } from "@/utils/board";
import TarotGallery from "@/components/TarotGallery";
import LOBBY_VIDEO from "@/assets/lobby-bg-video-clean.mp4";
import TITLE_VIDEO from "@/assets/lobby-title-video.mp4";
import BTN_EASY from "@/assets/lobby-btn-easy.png";
import BTN_MEDIUM from "@/assets/lobby-btn-medium.png";
import BTN_HARD from "@/assets/lobby-btn-hard.png";
import BTN_PVP from "@/assets/lobby-btn-pvp.png";
import HEX_DIVINATION from "@/assets/lobby-hex-divination.png";
import HEX_GALLERY from "@/assets/lobby-hex-gallery.png";
import INTRO_FRAME from "@/assets/lobby-intro-frame.png";

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
    <main className="app-shell relative overflow-hidden bg-black flex flex-col">
      {/* Global Background */}
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 z-0 w-full h-full object-cover pointer-events-none"
        src={LOBBY_VIDEO}
        onCanPlay={(e) => { e.currentTarget.play().catch(() => {}); }}
      />

      <div className="relative z-10 w-full h-full">
        {/* Top: Title */}
        <video
          autoPlay muted loop playsInline
          className="absolute pointer-events-none"
          style={{ top: '1vh', left: '50%', transform: 'translateX(-50%)', width: '36vw', height: 'auto' }}
          src={TITLE_VIDEO}
          onCanPlay={(e) => { e.currentTarget.play().catch(() => {}); }}
        />

        {/* Left: Intro frame with text overlay */}
        <div className="absolute" style={{
          top: '14vh', left: '3vw',
          width: '22vw', height: '52vh',
        }}>
          <img
            src={INTRO_FRAME}
            alt="玩法介绍"
            className="absolute inset-0 w-full h-full"
            style={{ objectFit: 'fill' }}
            draggable={false}
          />
          <div className="absolute inset-0" style={{ top: '30%', bottom: '12%', left: '8%', right: '8%' }}>
            <div className="overflow-y-auto pr-2 space-y-2 text-purple-100 leading-6 font-pixel h-full"
              style={{
                fontSize: '0.85vw',
                scrollbarWidth: 'thin',
                scrollbarColor: 'rgba(160,120,220,0.4) transparent',
              }}>
              <p>选择练习龙对战模式，开启你的星轨塔罗棋对局。</p>
              <p>走完棋盘融合占星棋盘，通过跨罗棋开启大昌。</p>
              <p>选择练习以支付战胜棋式，开启你的星轨塔罗棋棋局。</p>
              <hr className="border-purple-700/60 my-2" />
              <p>
                <strong className="text-white">【回合博弈】</strong>每回合您拥有 <span className="text-amber-300">60秒</span> 决策时间。回合开始时，您必须先在六边形棋盘上向相邻的合法格子<span className="text-blue-300">移动一步</span>，或者直接打出一张塔罗牌。
              </p>
              <p>
                <strong className="text-white">【塔罗法术】</strong>移动完成后，您可以从最多 4 张手牌中打出一张<span className="text-purple-300">塔罗法术牌</span>（如：放置障碍物、与敌方互换位置、扰乱地形或让对方失控），也可以选择结束回合。
              </p>
              <p>
                <strong className="text-white">【手牌调度】</strong>每回合移动会为您抽取一张新牌。如果手牌已满（4张），您必须在回合末进行<span className="text-red-300">"弃一换一"</span>的调度抉择。
              </p>
              <p>
                <strong className="text-white">【胜利条件】</strong>巧妙利用地形障碍与法术卡牌步步紧逼，当对方<span className="text-green-400">无法进行任何合法移动</span>时，您即获得对局的胜利！
              </p>
            </div>
          </div>
        </div>

        {/* Right: Hexagon buttons (absolute, independent) */}
        <div className="absolute" style={{
          top: '26vh', right: '8vw',
          display: 'flex', flexDirection: 'column', gap: '-3vh',
        }}>
          <button
            onClick={() => navigate("/divination")}
            className="transition-transform hover:scale-105"
            style={{
              background: 'transparent', border: 'none', padding: 0, margin: 0,
              cursor: 'pointer', lineHeight: 0,
            }}
          >
            <img src={HEX_DIVINATION} alt="塔罗占卜" draggable={false} style={{ width: '13vw', height: 'auto', display: 'block' }} />
          </button>
          <button
            onClick={() => setShowGallery(true)}
            className="transition-transform hover:scale-105"
            style={{
              background: 'transparent', border: 'none', padding: 0, margin: 0, marginTop: '3vh',
              cursor: 'pointer', lineHeight: 0,
            }}
          >
            <img src={HEX_GALLERY} alt="塔罗图鉴" draggable={false} style={{ width: '13vw', height: 'auto', display: 'block' }} />
          </button>
        </div>

        {/* Bottom: Mode buttons (absolute, custom images) */}
        <div className="absolute" style={{
          top: '83vh', left: '4vw', right: '4vw',
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr',
          gridAutoRows: '12vh',
          gap: '1.5vw',
        }}>
          {([
            ["easy", BTN_EASY],
            ["medium", BTN_MEDIUM],
            ["hard", BTN_HARD],
          ] as [AiDifficulty, string][]).map(([difficulty, img]) => (
            <button
              key={difficulty}
              type="button"
              onClick={() => handleGuestPve(difficulty)}
              className="relative hover:scale-105 transition-transform"
              style={{
                background: `url(${img}) center / 100% 100% no-repeat`,
                backgroundColor: 'transparent',
                border: 'none',
                padding: '0',
                margin: '0',
                width: '100%',
                height: '100%',
                minHeight: 0,
                minWidth: 0,
                cursor: 'pointer',
              }}
            />
          ))}
          <button
            disabled={isGuest}
            onClick={handleLocalPvp}
            className="relative hover:scale-105 transition-transform disabled:cursor-not-allowed"
            style={{
              background: `url(${BTN_PVP}) center / 100% 100% no-repeat`,
              backgroundColor: 'transparent',
              border: 'none',
              padding: '0',
              margin: '0',
              width: '100%',
              height: '100%',
              minHeight: 0,
              minWidth: 0,
              cursor: isGuest ? 'not-allowed' : 'pointer',
            }}
          />
        </div>
      </div>

      {showGallery && <TarotGallery onClose={() => setShowGallery(false)} />}
    </main>
  );
}
