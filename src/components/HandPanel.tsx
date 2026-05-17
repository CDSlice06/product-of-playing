import { Ban, Landmark, Laugh, Orbit, Scale, Sparkles, Swords, WandSparkles, Waves } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CardType } from "@/types/game";
import { CARD_DESCRIPTIONS, CARD_LABELS, CARD_MEANINGS } from "@/utils/board";

interface HandPanelProps {
  hand: CardType[];
  selectedCard: CardType | null;
  repeatCard: CardType | null;
  phase: "move" | "skill" | "discard" | "fate" | "gameover";
  pendingDrawCard: CardType | null;
  onSelectCard: (card: CardType) => void;
  onCancelCard: () => void;
  onSkipSkill: () => void;
}

const CARD_ICON = {
  obstacle: Ban,
  chalice: Sparkles,
  storm: Waves,
  tower: Landmark,
  fool: Laugh,
  swords8: Swords,
  temperance: Scale,
  hangedman: Orbit,
  fate: Sparkles,
};

export default function HandPanel({
  hand,
  selectedCard,
  repeatCard,
  phase,
  pendingDrawCard,
  onSelectCard,
  onCancelCard,
  onSkipSkill,
}: HandPanelProps) {
  const canSelectCard = phase === "move" || phase === "skill" || phase === "discard";
  const canEndTurn = phase === "skill";
  const isDiscarding = phase === "discard" && Boolean(pendingDrawCard);

  return (
    <div className="hand-panel-shell space-y-4 rounded-[2rem] border border-white/10 bg-slate-950/75 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.4)] backdrop-blur-xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Tarot Hand</p>
          <h3 className="app-section-title mt-1 font-display text-2xl text-slate-50">塔罗牌库</h3>
        </div>
        <div className="app-chip rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
          最多持有 4 张，超出时弃一换一
        </div>
      </div>

      {isDiscarding && pendingDrawCard && (
        <div className="rounded-[1.5rem] border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-50">
          当前抽到 <span className="font-semibold">{CARD_LABELS[pendingDrawCard]}牌</span>，手牌已满。
          请选择下方一张现有手牌弃掉，并用它与新牌交换。
        </div>
      )}

      {repeatCard && phase === "skill" && (
        <div className="rounded-[1.5rem] border border-cyan-300/30 bg-cyan-300/10 p-4 text-sm text-cyan-50">
          <p className="font-medium">倒吊人追加释放</p>
          <p className="mt-1 text-cyan-100/80">
            本回合已触发倒吊人双重效果。你可以手动再次释放 1 次
            <span className="mx-1 font-semibold">{CARD_LABELS[repeatCard]}牌</span>
            ，且这次必须继续完成。若选择结束回合，或倒计时结束仍未完成第二次释放，将直接判负。
          </p>
          <button
            type="button"
            onClick={() => onSelectCard(repeatCard)}
            className={cn(
              "mt-3 rounded-full border px-4 py-2 text-sm transition",
              selectedCard === repeatCard
                ? "border-cyan-200/70 bg-cyan-200/10 text-cyan-50"
                : "border-cyan-300/40 bg-slate-950/40 text-cyan-50 hover:bg-cyan-300/10",
            )}
          >
            再次释放 {CARD_LABELS[repeatCard]}牌
          </button>
        </div>
      )}

      <div className="hand-grid grid gap-3 sm:grid-cols-2">
        {hand.length === 0 && (
          <div className="rounded-[1.5rem] border border-dashed border-white/10 bg-white/5 p-4 text-sm text-slate-400">
            当前没有手牌。你可以先移动抽牌；有手牌时，也可以在回合开始直接打出 1 张塔罗牌。
          </div>
        )}

        {hand.map((card, index) => {
          const Icon = CARD_ICON[card];

          return (
            <button
              key={`${card}-${index}`}
              type="button"
              onClick={() => onSelectCard(card)}
              disabled={!canSelectCard}
              className={cn(
                "list-card rounded-[1.5rem] border p-4 text-left transition",
                !canSelectCard && "cursor-not-allowed opacity-50",
                isDiscarding
                  ? "border-amber-300/30 bg-amber-300/5 hover:border-amber-300/60 hover:bg-amber-300/10"
                  : selectedCard === card
                  ? "border-amber-300/70 bg-amber-300/10 shadow-[0_0_30px_rgba(245,158,11,0.16)]"
                  : "border-white/10 bg-white/5 hover:border-cyan-300/30 hover:bg-white/10",
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-slate-900/80 p-3 text-amber-100">
                    <Icon className="size-5" />
                  </div>
                  <div>
                    <p className="font-medium text-slate-50">{CARD_LABELS[card]}牌</p>
                    <p className="text-xs text-amber-100/80">{CARD_MEANINGS[card]}</p>
                    <p className="mt-1 text-sm text-slate-400">{CARD_DESCRIPTIONS[card]}</p>
                  </div>
                </div>
                <WandSparkles className={cn("size-4 text-slate-500", isDiscarding && "text-amber-200")} />
              </div>
            </button>
          );
        })}
      </div>

      <div className="action-row flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onCancelCard}
          disabled={!selectedCard || phase === "discard" || phase === "gameover"}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-200 transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          取消选牌
        </button>
        <button
          type="button"
          onClick={onSkipSkill}
          disabled={!canEndTurn}
          className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-50 transition hover:bg-cyan-300/15 disabled:cursor-not-allowed disabled:opacity-40"
        >
          结束回合
        </button>
      </div>
    </div>
  );
}
