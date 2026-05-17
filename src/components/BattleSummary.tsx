import { Trophy, Home, RotateCcw } from "lucide-react";
import type { PlayerId, PlayerState } from "@/types/game";
import { ASSETS } from "@/constants/assets";

interface BattleSummaryProps {
  winner: PlayerId | "draw";
  winReason: string;
  elapsedSeconds: number;
  players: Record<PlayerId, PlayerState>;
  onReplay: () => void;
  onBackHome: () => void;
  replayLabel?: string;
  backHomeLabel?: string;
}

export default function BattleSummary({
  winner,
  winReason,
  elapsedSeconds,
  players,
  onReplay,
  onBackHome,
  replayLabel = "再来一局",
  backHomeLabel = "返回大厅"
}: BattleSummaryProps) {
  const winnerName = winner === "draw" ? "平局" : players[winner].name;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-500">
      <div className="pixel-panel relative max-w-lg w-full overflow-hidden">
        {/* Background Texture */}
        <div className="absolute inset-0 opacity-20" style={{ backgroundImage: `url(${ASSETS.UI_PANEL})`, backgroundSize: 'cover' }} />
        
        <div className="relative z-10 p-8 text-center">
          <Trophy className="size-16 mx-auto text-amber-400 mb-4 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)] animate-bounce" />
          
          <h2 className="text-4xl font-black text-amber-400 text-shadow-pixel mb-2">战斗结束</h2>
          <p className="text-2xl text-white font-bold mb-6 text-shadow-pixel">{winnerName} 获胜！</p>
          
          <div className="bg-black/60 border-2 border-gray-700 p-4 mb-8 text-left space-y-2 text-sm text-gray-300">
            <p><span className="text-gray-500">获胜原因：</span> {winReason}</p>
            <p><span className="text-gray-500">战斗时长：</span> {Math.floor(elapsedSeconds / 60)}分 {elapsedSeconds % 60}秒</p>
            <p><span className="text-gray-500">位移对比：</span> {players.player1.moveCount} : {players.player2.moveCount}</p>
            <p><span className="text-gray-500">用牌对比：</span> {players.player1.usedCardCount} : {players.player2.usedCardCount}</p>
          </div>

          <div className="flex gap-4">
            <button
              onClick={onReplay}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-amber-600 hover:bg-amber-500 border-b-4 border-amber-800 active:border-b-0 active:translate-y-1 text-white font-bold transition-all text-shadow-pixel"
            >
              <RotateCcw className="size-5" /> {replayLabel}
            </button>
            <button
              onClick={onBackHome}
              className="flex-1 flex items-center justify-center gap-2 py-3 bg-gray-700 hover:bg-gray-600 border-b-4 border-gray-900 active:border-b-0 active:translate-y-1 text-white font-bold transition-all text-shadow-pixel"
            >
              <Home className="size-5" /> {backHomeLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
