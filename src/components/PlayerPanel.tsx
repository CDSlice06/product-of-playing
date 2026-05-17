import { Hourglass, MoonStar, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlayerId, PlayerState } from "@/types/game";

interface PlayerPanelProps {
  currentPlayer: PlayerId;
  currentPlayerName: string;
  isAiTurn: boolean;
  remainingSeconds: number;
  remainingRatio: number;
  players: Record<PlayerId, PlayerState>;
}

export default function PlayerPanel({
  currentPlayer,
  currentPlayerName,
  isAiTurn,
  remainingSeconds,
  remainingRatio,
  players,
}: PlayerPanelProps) {
  return (
    <div className="player-panel-shell grid gap-3 rounded-[2rem] border border-white/10 bg-slate-950/75 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.38)] backdrop-blur xl:grid-cols-[1fr_auto_1fr]">
      {(["player1", "player2"] as PlayerId[]).map((playerId) => {
        const player = players[playerId];
        const active = currentPlayer === playerId;

        return (
          <div
            key={playerId}
            className={cn(
              "player-panel-card rounded-[1.5rem] border p-4 transition",
              active
                ? "border-amber-300/40 bg-amber-300/10 shadow-[0_0_30px_rgba(245,158,11,0.16)]"
                : "border-white/10 bg-white/5",
            )}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.35em] text-slate-400">
                  {playerId === "player1" ? "Player 1" : "Player 2"}
                </p>
                <h2 className="app-section-title mt-1 font-display text-xl text-slate-50">{player.name}</h2>
              </div>
              <div
                className={cn(
                  "rounded-full px-3 py-1 text-xs tracking-[0.25em]",
                  active ? "bg-amber-200/15 text-amber-100" : "bg-slate-800/80 text-slate-300",
                )}
              >
                {active ? "当前回合" : "等待中"}
              </div>
            </div>
            <div className="player-panel-stats mt-4 grid grid-cols-3 gap-2 text-sm text-slate-200">
              <div className="rounded-2xl bg-slate-900/70 p-3">
                <div className="flex items-center gap-2 text-slate-400">
                  <MoonStar className="size-4" />
                  手牌
                </div>
                <p className="mt-2 text-lg font-semibold">{player.hand.length}/4</p>
              </div>
              <div className="rounded-2xl bg-slate-900/70 p-3">
                <div className="flex items-center gap-2 text-slate-400">
                  <Swords className="size-4" />
                  位移
                </div>
                <p className="mt-2 text-lg font-semibold">{player.moveCount}</p>
              </div>
              <div className="rounded-2xl bg-slate-900/70 p-3">
                <div className="flex items-center gap-2 text-slate-400">
                  <MoonStar className="size-4" />
                  用牌
                </div>
                <p className="mt-2 text-lg font-semibold">{player.usedCardCount}</p>
              </div>
            </div>
            {player.randomMovePending && (
              <div className="mt-3 rounded-2xl border border-rose-300/20 bg-rose-300/10 px-3 py-2 text-xs text-rose-100">
                愚人效果生效中：你接下来 {player.randomMovePendingTurns} 次移动，或使用18号月亮/宝剑八时，都会随机失控。
              </div>
            )}
            {player.deathGraceActive && (
              <div className="mt-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-xs text-amber-50">
                正位死神已生效：你本回合即使被围住，也不会被立即判负。
              </div>
            )}
          </div>
        );
      })}

      <div className="flex min-w-32 items-center justify-center">
        <div className="player-panel-timer w-full rounded-[1.75rem] border border-cyan-300/20 bg-cyan-300/10 px-4 py-5 text-cyan-50 shadow-[0_0_40px_rgba(34,211,238,0.12)]">
          <div className="flex items-center justify-center gap-3">
            <Hourglass className="size-5" />
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-cyan-100/70">回合倒计时</p>
              <p className="text-2xl font-semibold">{remainingSeconds}s</p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-900/60">
            <div
              className={cn(
                "h-full rounded-full transition-[width] duration-200",
                remainingSeconds <= 10 ? "bg-rose-300" : "bg-cyan-300",
              )}
              style={{ width: `${Math.max(0, remainingRatio) * 100}%` }}
            />
          </div>
          <p className="mt-3 text-center text-xs text-cyan-100/80">
            {isAiTurn ? `${currentPlayerName}思考中，倒计时仍在继续。` : `${currentPlayerName}正在行动。`}
          </p>
          {remainingSeconds <= 10 && (
            <p className="mt-1 text-center text-xs text-rose-100/90">剩余时间不多了，请尽快完成本回合操作。</p>
          )}
        </div>
      </div>
    </div>
  );
}
