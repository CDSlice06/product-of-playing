import { Clock3, RotateCcw, Trophy, Undo2 } from "lucide-react";
import type { PlayerId, PlayerState } from "@/types/game";

interface ResultModalProps {
  winner: PlayerId;
  winReason: string;
  elapsedSeconds: number;
  players: Record<PlayerId, PlayerState>;
  onReplay: () => void;
  onBackHome: () => void;
  replayLabel?: string;
  backHomeLabel?: string;
}

export default function ResultModal({
  winner,
  winReason,
  elapsedSeconds,
  players,
  onReplay,
  onBackHome,
  replayLabel = "再来一局",
  backHomeLabel = "返回主菜单",
}: ResultModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-md">
      <div className="w-full max-w-lg rounded-[2rem] border border-white/10 bg-slate-950/90 p-6 shadow-[0_40px_120px_rgba(15,23,42,0.6)]">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-amber-300/15 p-3 text-amber-100">
            <Trophy className="size-6" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Duel Result</p>
            <h2 className="font-display text-3xl text-slate-50">
              {players[winner].name} 获胜
            </h2>
          </div>
        </div>

        <div className="mt-5 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm text-slate-300">
          <p>{winReason}</p>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-[1.5rem] bg-slate-900/80 p-4">
            <div className="flex items-center gap-2 text-slate-400">
              <Clock3 className="size-4" />
              时长
            </div>
            <p className="mt-3 text-2xl font-semibold text-slate-50">{elapsedSeconds}s</p>
          </div>
          {(["player1", "player2"] as PlayerId[]).map((playerId) => (
            <div key={playerId} className="rounded-[1.5rem] bg-slate-900/80 p-4">
              <p className="text-sm text-slate-400">{players[playerId].name}</p>
              <p className="mt-3 text-slate-100">移动 {players[playerId].moveCount}</p>
              <p className="text-slate-100">用牌 {players[playerId].usedCardCount}</p>
              <p className="text-slate-100">剩余 {players[playerId].hand.length}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={onReplay}
            className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/10 px-5 py-3 text-sm text-amber-50 transition hover:bg-amber-300/15"
          >
            <RotateCcw className="size-4" />
            {replayLabel}
          </button>
          <button
            type="button"
            onClick={onBackHome}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm text-slate-100 transition hover:bg-white/10"
          >
            <Undo2 className="size-4" />
            {backHomeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
