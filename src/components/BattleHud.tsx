import { Sword } from "lucide-react";

interface BattleHudProps {
  mode: "pvp" | "pve";
  currentPlayerName: string;
  elapsedSeconds: number;
  phaseText: string;
  message: string;
  isAiTurn: boolean;
}

export default function BattleHud({
  mode,
  currentPlayerName,
  elapsedSeconds,
  phaseText,
  message,
  isAiTurn,
}: BattleHudProps) {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 w-full">
      <div className="flex items-center gap-2 shrink-0">
        <div className="bg-red-900 border-2 border-red-700 p-1 sm:p-1.5 hidden sm:block">
          <Sword className="size-4 text-red-300" />
        </div>
        <div>
          <h2 className="text-sm sm:text-base font-bold text-white text-shadow-pixel">
            {mode === "pve" ? "傀儡试炼" : "双人对决"}
          </h2>
          <p className="font-pixel text-[8px] text-gray-400 mt-0.5">
            {formatTime(elapsedSeconds)}
          </p>
        </div>
      </div>

      <div className="flex-1 w-full text-center sm:text-left">
        <div className="bg-black/50 border-2 border-gray-700 px-3 py-1.5 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
          <p className="text-amber-400 text-xs font-bold animate-pulse shrink-0">
            {isAiTurn ? "傀儡思考中" : `${currentPlayerName}回合`}
          </p>
          <p className="text-gray-300 text-[10px] sm:text-xs truncate border-t sm:border-t-0 sm:border-l border-gray-700 pt-1 sm:pt-0 sm:pl-3">
            {message || phaseText}
          </p>
        </div>
      </div>
    </div>
  );
}
