import { Play, Swords, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ModeSelectPanelProps {
  selectedMode: "pvp" | "pve";
  onSelectMode: (mode: "pvp" | "pve") => void;
  onStart: () => void;
}

export default function ModeSelectPanel({
  selectedMode,
  onSelectMode,
  onStart,
}: ModeSelectPanelProps) {
  return (
    <section className="flex flex-col gap-4 sm:gap-6 pt-4">
      <div className="pixel-panel relative overflow-visible p-4 sm:p-6 bg-black/60 border-2 border-gray-700">
        <div className="absolute -top-4 left-4 sm:left-6 bg-gray-800 border-2 border-gray-600 px-3 py-1 sm:px-4 sm:py-1 text-amber-400 text-xs sm:text-sm font-bold z-10 shadow-md">
          模式选择
        </div>

        <div className="mt-2 sm:mt-4 flex flex-row gap-2 sm:gap-4">
          <button
            onClick={() => onSelectMode("pvp")}
            className={cn(
              "flex-1 p-2 sm:p-4 border-2 sm:border-4 transition-all flex flex-col items-center justify-center text-center group relative overflow-hidden",
              selectedMode === "pvp" 
                ? "border-amber-400 bg-gray-800 scale-[1.02]" 
                : "border-gray-700 bg-black/50 hover:border-gray-500 hover:scale-[1.01]"
            )}
          >
            <Swords className={cn("w-10 h-10 mb-2 transition-colors", selectedMode === "pvp" ? "text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" : "text-gray-500")} />
            <div className={cn("text-xl font-bold mb-1", selectedMode === "pvp" ? "text-amber-400 text-shadow-pixel" : "text-gray-400")}>联机对战</div>
            <div className="text-[10px] text-gray-400">实时网络对战</div>
            {selectedMode === "pvp" && <div className="absolute top-2 right-2 w-3 h-3 bg-amber-400 animate-pulse" />}
          </button>

          <button
            onClick={() => onSelectMode("pve")}
            className={cn(
              "flex-1 p-2 sm:p-4 border-2 sm:border-4 transition-all flex flex-col items-center justify-center text-center group relative overflow-hidden",
              selectedMode === "pve" 
                ? "border-amber-400 bg-gray-800 scale-[1.02]" 
                : "border-gray-700 bg-black/50 hover:border-gray-500 hover:scale-[1.01]"
            )}
          >
            <Play className={cn("w-10 h-10 mb-2 transition-colors", selectedMode === "pve" ? "text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)]" : "text-gray-500")} />
            <div className={cn("text-xl font-bold mb-1", selectedMode === "pve" ? "text-amber-400 text-shadow-pixel" : "text-gray-400")}>傀儡试炼</div>
            <div className="text-[10px] text-gray-400">挑战 AI 对手</div>
            {selectedMode === "pve" && <div className="absolute top-2 right-2 w-3 h-3 bg-amber-400 animate-pulse" />}
          </button>
        </div>
      </div>

      <div className="pixel-panel relative overflow-visible p-4 sm:p-6 flex flex-col justify-center bg-black/60 border-2 border-gray-700">
        <h2 className="text-xl sm:text-3xl font-black text-white text-shadow-pixel mb-2 sm:mb-4">准备就绪</h2>
        <p className="text-gray-300 text-xs sm:text-lg mb-4 sm:mb-8">
          确认模式后，点击下方按钮开启地牢之门。战斗将采用 6 边形棋盘与塔罗牌技能系统。
        </p>
        <button
          onClick={onStart}
          className="w-full flex items-center justify-center gap-2 py-3 sm:py-4 bg-red-800 hover:bg-red-700 border-b-4 border-red-950 active:border-b-0 active:translate-y-1 text-white text-lg sm:text-2xl font-bold transition-all text-shadow-pixel"
        >
          进入地牢 <ChevronRight className="size-5 sm:size-6" />
        </button>
      </div>
    </section>
  );
}