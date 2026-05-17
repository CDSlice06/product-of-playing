import { WandSparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CardType } from "@/types/game";
import { CARD_DESCRIPTIONS, CARD_LABELS, CARD_MEANINGS } from "@/utils/board";
import { getCardImage } from "@/constants/assets";

interface SkillBarProps {
  hand: CardType[];
  selectedCard: CardType | null;
  phase: "move" | "skill" | "discard" | "gameover";
  pendingDrawCard: CardType | null;
  onSelectCard: (card: CardType) => void;
  onCancelCard: () => void;
  onSkipSkill: () => void;
}

export default function SkillBar({
  hand,
  selectedCard,
  phase,
  pendingDrawCard,
  onSelectCard,
  onCancelCard,
  onSkipSkill,
}: SkillBarProps) {
  const canSelectCard = phase === "move" || phase === "skill" || phase === "discard";
  const canEndTurn = phase === "skill";
  const isDiscarding = phase === "discard" && Boolean(pendingDrawCard);
  
  const phaseLabel = phase === "move"
    ? "移动后可继续施法"
    : phase === "skill"
      ? "请选择技能或结束回合"
      : phase === "discard"
        ? "弃一换一"
        : "结算中";

  return (
    <section className="pixel-panel relative overflow-hidden p-5">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-bold text-2xl text-white text-shadow-pixel">命运技能槽</h3>
        </div>
        <div className="bg-gray-800 border-2 border-gray-600 px-3 py-1 text-sm text-amber-300">
          {phaseLabel}
        </div>
      </div>

      {isDiscarding && pendingDrawCard && (
        <div className="mb-4 border-2 border-amber-500 bg-amber-950/80 p-3 text-sm text-amber-200 animate-pulse text-center">
          抽到 <strong>{CARD_LABELS[pendingDrawCard]}</strong>，技能满载！请弃置一张。
        </div>
      )}

      <div className="space-y-3">
        {hand.length === 0 && (
          <div className="border-2 border-gray-800 bg-black/50 p-6 text-center text-gray-500 text-sm">
            暂无手牌。移动一步即可抽牌。
          </div>
        )}

        {hand.map((card, index) => {
          const isSelected = selectedCard === card;
          return (
            <button
              key={`${card}-${index}`}
              type="button"
              onClick={() => onSelectCard(card)}
              disabled={!canSelectCard}
              className={cn(
                "w-full relative overflow-hidden flex items-start gap-4 p-2 sm:p-3 border-4 transition-all duration-200 text-left group",
                !canSelectCard && "cursor-not-allowed opacity-50 grayscale",
                isSelected 
                  ? "border-amber-400 bg-gray-800 shadow-[0_0_10px_rgba(251,191,36,0.4)] translate-x-2" 
                  : "border-gray-700 bg-gray-900 hover:border-gray-500 hover:translate-x-1"
              )}
            >
              {/* Card Background Overlay */}
              <div className="absolute inset-0 opacity-20 pointer-events-none bg-gradient-to-br from-purple-900/50 to-blue-900/50" />
              <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: `url(${getCardImage(card)})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(4px)' }} />
              
              {/* Pixel Card Thumbnail */}
              <div className={cn("relative z-10 w-14 h-20 sm:w-16 sm:h-24 shrink-0 border-2 overflow-hidden bg-gray-800 flex items-center justify-center", isSelected ? "border-amber-400" : "border-gray-700")}>
                <img 
                  src={getCardImage(card)} 
                  alt={CARD_LABELS[card]} 
                  className="w-full h-full object-cover transition-opacity duration-500"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                    (e.target as HTMLImageElement).parentElement!.classList.add('bg-gradient-to-br', 'from-purple-800', 'to-indigo-900');
                  }}
                  onLoad={(e) => {
                    (e.target as HTMLImageElement).style.opacity = '1';
                  }}
                  style={{ opacity: 0 }}
                />
                {/* Fallback Icon if image fails/loads */}
                <div className="absolute inset-0 flex items-center justify-center -z-10">
                  <WandSparkles className="size-5 sm:size-6 text-gray-500 opacity-50" />
                </div>
              </div>
              
              <div className="min-w-0 flex-1 relative z-10 py-0 sm:py-1">
                <div className="flex items-center justify-between">
                  <p className={cn("font-bold text-base sm:text-lg text-shadow-pixel", isSelected ? "text-amber-400" : "text-white")}>{CARD_LABELS[card]}</p>
                  {isSelected && <WandSparkles className="size-4 text-amber-400 animate-spin" />}
                </div>
                <p className="font-pixel text-[8px] sm:text-[9px] text-gray-400 mt-1 mb-1 sm:mb-2">{CARD_MEANINGS[card]}</p>
                <p className="text-[10px] sm:text-xs text-gray-300 leading-tight line-clamp-2">{CARD_DESCRIPTIONS[card]}</p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <button
          type="button"
          onClick={onSkipSkill}
          disabled={!canEndTurn}
          className="w-full py-3 bg-blue-800 hover:bg-blue-700 border-b-4 border-blue-950 active:border-b-0 active:translate-y-1 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-shadow-pixel"
        >
          结束回合
        </button>
        <button
          type="button"
          onClick={onCancelCard}
          disabled={!selectedCard || phase === "discard" || phase === "gameover"}
          className="w-full py-2 bg-gray-800 hover:bg-gray-700 border-b-4 border-gray-900 active:border-b-0 active:translate-y-1 text-gray-300 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm"
        >
          取消选牌
        </button>
      </div>
    </section>
  );
}
