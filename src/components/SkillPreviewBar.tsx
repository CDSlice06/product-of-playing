import { useState } from "react";
import { BookOpen, X, WandSparkles } from "lucide-react";
import { CARD_DESCRIPTIONS, CARD_LABELS, CARD_MEANINGS } from "@/utils/board";
import type { CardType } from "@/types/game";
import { getCardImage } from "@/constants/assets";

const ALL_CARDS: CardType[] = ["fool", "chalice", "tower", "obstacle", "swords8", "storm"];

export default function SkillPreviewBar() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full p-4 pixel-panel bg-black/60 hover:bg-black/80 border-gray-700 hover:border-amber-500 transition-all flex items-center justify-center gap-3 group"
      >
        <BookOpen className="size-6 text-amber-400 group-hover:animate-bounce" />
        <span className="text-xl font-bold text-white text-shadow-pixel">命运塔罗图鉴</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 sm:p-8 backdrop-blur-sm">
          <div className="pixel-panel relative w-full max-w-5xl h-full max-h-[80vh] flex flex-col bg-gray-900 border-amber-500">
            {/* Modal Header */}
            <div className="flex-none p-4 border-b-4 border-gray-800 flex items-center justify-between bg-black/50">
              <h2 className="text-2xl font-black text-amber-400 text-shadow-pixel flex items-center gap-2">
                <BookOpen className="size-6" />
                命运塔罗图鉴
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 bg-gray-800 hover:bg-red-900 text-white transition-colors border-2 border-gray-600"
              >
                <X className="size-6" />
              </button>
            </div>

            {/* Modal Content - Scrollable Grid */}
            <div className="flex-1 overflow-y-auto pixel-scrollbar p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {ALL_CARDS.map((card) => (
                  <div key={card} className="bg-black/50 border-2 border-gray-700 p-4 flex gap-4 hover:border-gray-500 transition-colors">
                    <div className="relative z-10 w-24 h-36 shrink-0 rounded border border-gray-700 overflow-hidden shadow-lg bg-gray-800 flex items-center justify-center">
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
                      <div className="absolute inset-0 flex items-center justify-center -z-10">
                        <WandSparkles className="size-6 text-gray-500 opacity-50" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center">
                      <h3 className="font-bold text-amber-400 text-sm mb-1">{CARD_LABELS[card]}</h3>
                      <p className="text-gray-400 text-[10px] mb-2 line-clamp-2">{CARD_MEANINGS[card]}</p>
                      <p className="text-white text-xs leading-relaxed">{CARD_DESCRIPTIONS[card]}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
