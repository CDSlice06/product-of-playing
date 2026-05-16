import { Hourglass, MoonStar, Swords } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PlayerId, PlayerState } from "@/types/game";

interface PlayerPanelProps {
  currentPlayer: PlayerId;
  remainingSeconds: number;
  players: Record<PlayerId, PlayerState>;
}

export default function PlayerPanel({
  currentPlayer,
  remainingSeconds,
  players,
}: PlayerPanelProps) {
  return (
    <div className="grid gap-3 rounded-[2rem] border border-white/10 bg-slate-950/75 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.38)] backdrop-blur xl:grid-cols-[1fr_auto_1fr]">
      {(["player1", "player2"] as PlayerId[]).map((playerId) => {
        const player = players[playerId];
        const active = currentPlayer === playerId;

        return (
          <div
            key={playerId}
            className={cn(
              "rounded-[1.5rem] border p-4 transition",
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
                <h2 className="mt-1 font-display text-xl text-slate-50">{player.name}</h2>
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
            <div className="mt-4 grid grid-cols-3 gap-2 text-sm text-slate-200">
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
                愚人效果生效中：你的下一次移动将随机失控。
              </div>
            )}
          </div>
        );
      })}

      <div className="flex min-w-32 items-center justify-center">
        <div className="flex w-full items-center justify-center gap-3 rounded-[1.75rem] border border-cyan-300/20 bg-cyan-300/10 px-4 py-5 text-cyan-50 shadow-[0_0_40px_rgba(34,211,238,0.12)]">
          <Hourglass className="size-5" />
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-100/70">回合倒计时</p>
            <p className="text-2xl font-semibold">{remainingSeconds}s</p>
          </div>
        </div>
      </div>
    </div>
  );
}
