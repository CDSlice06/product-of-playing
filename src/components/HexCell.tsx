import { Ban, Landmark, Sparkles, Swords, UserRound, Waves } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Position } from "@/types/game";

type HighlightKind = "move" | "obstacle" | "storm" | "tower" | "swords8" | "danger" | null;
type OccupantKind = "empty" | "player1" | "player2" | "obstacle";

interface HexCellProps {
  position: Position;
  occupant: OccupantKind;
  highlight: HighlightKind;
  clickable: boolean;
  onClick: (position: Position) => void;
}

export default function HexCell({
  position,
  occupant,
  highlight,
  clickable,
  onClick,
}: HexCellProps) {
  const occupantNode =
    occupant === "player1" ? (
      <div className="flex size-9 items-center justify-center rounded-full border border-amber-200/60 bg-amber-300/20 text-amber-100 shadow-[0_0_24px_rgba(245,158,11,0.35)]">
        <UserRound className="size-4" />
      </div>
    ) : occupant === "player2" ? (
      <div className="flex size-9 items-center justify-center rounded-full border border-cyan-200/60 bg-cyan-300/20 text-cyan-100 shadow-[0_0_24px_rgba(34,211,238,0.3)]">
        <Sparkles className="size-4" />
      </div>
    ) : occupant === "obstacle" ? (
      <div className="flex size-8 items-center justify-center rounded-full border border-rose-200/40 bg-rose-950/70 text-rose-200">
        <Ban className="size-4" />
      </div>
    ) : null;

  return (
    <button
      type="button"
      aria-label={`格子 ${position.x + 1},${position.y + 1}`}
      onClick={() => onClick(position)}
      className={cn(
        "hex-cell group relative flex h-16 w-14 items-center justify-center border border-white/10 bg-slate-900/80 text-slate-100 transition duration-200",
        clickable && "cursor-pointer hover:-translate-y-0.5 hover:border-amber-200/40 hover:bg-slate-800/95",
        highlight === "move" && "ring-2 ring-emerald-300/80 shadow-[0_0_24px_rgba(52,211,153,0.25)]",
        highlight === "obstacle" && "ring-2 ring-amber-300/80 shadow-[0_0_24px_rgba(245,158,11,0.25)]",
        highlight === "storm" && "ring-2 ring-cyan-300/80 shadow-[0_0_26px_rgba(34,211,238,0.25)]",
        highlight === "tower" && "ring-2 ring-violet-300/80 shadow-[0_0_26px_rgba(196,181,253,0.25)]",
        highlight === "swords8" && "ring-2 ring-rose-300/80 shadow-[0_0_26px_rgba(251,113,133,0.25)]",
        highlight === "danger" && "ring-2 ring-rose-400/80",
      )}
    >
      <span className="absolute left-1 top-1 text-[10px] text-slate-400">
        {position.x + 1}.{position.y + 1}
      </span>
      {highlight === "storm" && (
        <Waves className="pointer-events-none absolute bottom-1 right-1 size-3 text-cyan-300/80" />
      )}
      {highlight === "tower" && (
        <Landmark className="pointer-events-none absolute bottom-1 right-1 size-3 text-violet-300/80" />
      )}
      {highlight === "swords8" && (
        <Swords className="pointer-events-none absolute bottom-1 right-1 size-3 text-rose-300/80" />
      )}
      {occupantNode}
    </button>
  );
}
