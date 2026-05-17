import { BookOpen, X } from "lucide-react";
import { CARD_LABELS, CARD_DESCRIPTIONS, CARD_MEANINGS } from "@/utils/board";
import { getCardImage } from "@/constants/assets";
import type { CardType } from "@/types/game";

interface TarotGalleryProps {
  onClose: () => void;
}

export default function TarotGallery({ onClose }: TarotGalleryProps) {
  const cards = Object.keys(CARD_LABELS) as CardType[];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="pixel-panel relative w-full max-w-5xl max-h-full flex flex-col bg-gray-900 border-2 border-gray-600">
        <div className="flex items-center justify-between p-4 border-b-2 border-gray-700 bg-black/50">
          <div className="flex items-center gap-2">
            <BookOpen className="size-6 text-amber-400" />
            <h2 className="text-xl font-bold text-white text-shadow-pixel">命运塔罗图鉴</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 border-2 border-gray-600 hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto pixel-scrollbar p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {cards.map((cardKey) => (
            <div key={cardKey} className="border-2 border-gray-700 bg-black/40 p-3 flex gap-3 hover:border-amber-400 transition-colors group">
              <div className="w-16 h-24 shrink-0 border-2 border-gray-800 overflow-hidden bg-black flex items-center justify-center">
                <div 
                  className="w-full h-full bg-cover bg-center bg-no-repeat group-hover:scale-110 transition-transform duration-300"
                  style={{ backgroundImage: `url(${getCardImage(cardKey)})`, imageRendering: "pixelated" }} 
                />
              </div>
              <div className="flex-1 flex flex-col justify-center min-w-0">
                <h3 className="text-amber-400 font-bold text-sm text-shadow-pixel mb-1 truncate">{CARD_LABELS[cardKey]}</h3>
                <p className="text-[10px] text-cyan-200 mb-2 truncate">{CARD_MEANINGS[cardKey]}</p>
                <p className="text-xs text-gray-300 leading-snug line-clamp-3">{CARD_DESCRIPTIONS[cardKey]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
