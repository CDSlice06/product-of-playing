import { Hourglass, MoonStar, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlayerId, PlayerState } from "@/types/game";
import { ASSETS } from "@/constants/assets";
import SpriteAnimator from './SpriteAnimator';

interface PlayerStatusBarProps {
  currentPlayer: PlayerId;
  remainingSeconds: number;
  players: Record<PlayerId, PlayerState>;
}

export default function PlayerStatusBar({
  currentPlayer,
  remainingSeconds,
  players,
}: PlayerStatusBarProps) {
  return (
    <section className="flex w-full justify-between items-center gap-4 bg-black/60 p-2 md:p-4 rounded-lg border-2 border-gray-800 shadow-lg">
      
      {/* Player 1 Panel */}
      <div className={cn(
        "flex flex-1 items-center gap-3 transition-all duration-300 max-w-[280px]",
        currentPlayer === "player1" ? "opacity-100 scale-100" : "opacity-60 scale-95"
      )}>
        <div className={cn(
          "h-14 w-14 sm:h-16 sm:w-16 border-2 shrink-0 flex items-center justify-center overflow-hidden bg-gray-900 rounded",
          "border-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.3)]"
        )}>
          <div className="w-full h-full relative pb-2">
             <SpriteAnimator
               src={ASSETS.PLAYER_1_IDLE}
               animation="breathe"
               showShadow={false}
             />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h2 className="font-bold text-sm sm:text-base text-blue-400 text-shadow-pixel truncate">{players.player1.name}</h2>
            {currentPlayer === "player1" && (
              <span className="px-1.5 py-0.5 bg-amber-500/20 border border-amber-500 text-amber-300 text-[10px] font-bold rounded">
                当前回合
              </span>
            )}
          </div>
          <div className="grid grid-cols-3 gap-1">
            <div className="bg-black border border-gray-700 rounded p-1 text-center">
              <div className="text-emerald-400 text-[10px]">手牌</div>
              <div className="text-xs font-bold text-white">{players.player1.hand.length}/4</div>
            </div>
            <div className="bg-black border border-gray-700 rounded p-1 text-center">
              <div className="text-blue-400 text-[10px]">位移</div>
              <div className="text-xs font-bold text-white">{players.player1.moveCount}</div>
            </div>
            <div className="bg-black border border-gray-700 rounded p-1 text-center">
              <div className="text-purple-400 text-[10px]">用牌</div>
              <div className="text-xs font-bold text-white">{players.player1.usedCardCount}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Center Timer Panel */}
      <div className="flex flex-col items-center justify-center shrink-0 w-[100px] h-[80px] bg-gray-950 border-2 border-gray-800 rounded-lg shadow-inner">
        <p className="font-pixel text-[10px] text-gray-400 mb-1">倒计时</p>
        <p className={cn(
          "text-3xl font-black text-shadow-pixel", 
          remainingSeconds <= 10 ? "text-red-500 animate-pulse" : "text-white"
        )}>
          {remainingSeconds}
        </p>
      </div>

      {/* Player 2 Panel */}
      <div className={cn(
        "flex flex-1 items-center justify-end gap-3 flex-row-reverse transition-all duration-300 max-w-[280px] text-right",
        currentPlayer === "player2" ? "opacity-100 scale-100" : "opacity-60 scale-95"
      )}>
        <div className={cn(
          "h-14 w-14 sm:h-16 sm:w-16 border-2 shrink-0 flex items-center justify-center overflow-hidden bg-gray-900 rounded",
          "border-red-500 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
        )}>
          <div className="w-full h-full relative pb-2">
             <SpriteAnimator
               src={ASSETS.PLAYER_2_IDLE}
               flipX={true}
               animation="breathe"
               showShadow={false}
             />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-end gap-2 mb-1">
            {currentPlayer === "player2" && (
              <span className="px-1.5 py-0.5 bg-amber-500/20 border border-amber-500 text-amber-300 text-[10px] font-bold rounded">
                当前回合
              </span>
            )}
            <h2 className="font-bold text-sm sm:text-base text-red-400 text-shadow-pixel truncate">{players.player2.name}</h2>
          </div>
          <div className="grid grid-cols-3 gap-1">
            <div className="bg-black border border-gray-700 rounded p-1 text-center">
              <div className="text-emerald-400 text-[10px]">手牌</div>
              <div className="text-xs font-bold text-white">{players.player2.hand.length}/4</div>
            </div>
            <div className="bg-black border border-gray-700 rounded p-1 text-center">
              <div className="text-blue-400 text-[10px]">位移</div>
              <div className="text-xs font-bold text-white">{players.player2.moveCount}</div>
            </div>
            <div className="bg-black border border-gray-700 rounded p-1 text-center">
              <div className="text-purple-400 text-[10px]">用牌</div>
              <div className="text-xs font-bold text-white">{players.player2.usedCardCount}</div>
            </div>
          </div>
        </div>
      </div>

    </section>
  );
}
