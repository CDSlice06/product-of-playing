import { ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils";
import type { GameState, Position } from "@/types/game";
import { createBoardCells, getOccupantAt, toPositionKey, isInsideBoard } from "@/utils/board";
import { ASSETS } from '../constants/assets';
import SpriteAnimator from './SpriteAnimator';

interface DungeonBoardProps {
  state: GameState;
  highlightedCells: Position[];
  dangerCells?: Position[];
  onCellClick: (position: Position) => void;
}

type HighlightKind = "move" | "obstacle" | "storm" | "tower" | "swords8" | "danger" | null;

function DungeonCell({
  position,
  occupant,
  highlight,
  clickable,
  onClick,
  boardSize,
  isCurrentPlayer,
}: {
  position: Position;
  occupant: "empty" | "player1" | "player2" | "obstacle";
  highlight: HighlightKind;
  clickable: boolean;
  onClick: (position: Position) => void;
  boardSize: number;
  isCurrentPlayer: boolean;
}) {
  if (!isInsideBoard(position, boardSize)) {
    return <div className="hex-cell" />;
  }

  const isPlayer1 = occupant === "player1";
  const isPlayer2 = occupant === "player2";

  return (
    <div className="relative flex hex-cell items-center justify-center group">
      {/* Hexagon Background Layer (Clipped) */}
      <button
        onClick={() => clickable && onClick(position)}
        disabled={!clickable}
        className={cn(
          "absolute inset-0 w-full h-full transition-all duration-300",
          clickable ? "cursor-pointer hover:-translate-y-2 z-20" : "cursor-default"
        )}
        style={{
          clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)',
          backgroundImage: `url(${ASSETS.FLOOR_TILE})`,
          backgroundSize: '150%',
          backgroundPosition: 'center'
        }}
      >
        {/* Highlight Overlay */}
        <div className={cn(
          "absolute inset-0 transition-colors z-10",
          highlight === "move" && "bg-green-500/40 mix-blend-screen animate-pulse",
          highlight === "obstacle" && "bg-amber-500/40 mix-blend-screen",
          highlight === "storm" && "bg-blue-500/40 mix-blend-screen",
          highlight === "tower" && "bg-purple-500/40 mix-blend-screen",
          highlight === "swords8" && "bg-red-500/40 mix-blend-screen",
          highlight === "danger" && "bg-red-700/60"
        )} />
      </button>

      {/* Markers */}
      {clickable && <span className="absolute right-2 top-4 size-2 rounded-full bg-yellow-200 shadow-[0_0_8px_rgba(253,224,71,0.8)] z-20 animate-ping pointer-events-none" />}
      {highlight === "danger" && <ShieldAlert className="absolute right-2 top-4 size-4 text-red-400 z-20 animate-bounce pointer-events-none" />}

      {/* Occupant Render (Unclipped) */}
      {occupant === "obstacle" && (
        <div className="absolute bottom-1 left-1/2 -translate-x-1/2 z-30 pointer-events-none hex-obs">
          <SpriteAnimator
            src={ASSETS.OBSTACLE_TILE}
            animation="vine-writhing"
            showShadow={false}
          />
        </div>
      )}

      {/* Player Sprite Animation */}
      {(isPlayer1 || isPlayer2) && (
        <div className={cn(
          "absolute z-40 pointer-events-none hex-player left-1/2 -translate-x-1/2",
          isCurrentPlayer && "z-50"
        )}>
          <SpriteAnimator
            src={isPlayer1 ? ASSETS.PLAYER_1_IDLE : ASSETS.PLAYER_2_IDLE}
            flipX={!isPlayer1}
            animation={isCurrentPlayer ? "breathe" : "idle"}
          />
        </div>
      )}
    </div>
  );
}

export default function DungeonBoard({
  state,
  highlightedCells,
  dangerCells = [],
  onCellClick,
}: DungeonBoardProps) {
  const cells = createBoardCells(state.boardSize);
  const highlightSet = new Set(highlightedCells.map(toPositionKey));
  const dangerSet = new Set(dangerCells.map(toPositionKey));

  const highlightType = state.phase === "move"
    ? "move"
    : state.selectedCard === "obstacle"
      ? "obstacle"
      : state.selectedCard === "swords8"
        ? "swords8"
        : state.selectedCard === "tower"
          ? "tower"
          : state.selectedCard === "storm"
            ? "storm"
            : null;

  return (
    <section className="relative w-full h-full flex flex-col items-center justify-center hex-board-container">
      <div className="overflow-auto pixel-scrollbar p-2 sm:p-4 flex w-full h-full min-h-[300px]">
        <div className="relative w-max drop-shadow-[0_0_40px_rgba(0,0,0,0.9)] m-auto pt-8 pb-4">
          {cells.map((row, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              className={cn("flex hex-row", rowIndex > 0 && "hex-mt")}
              style={{ marginLeft: rowIndex % 2 === 0 ? 0 : 'var(--hex-ml)' }}
            >
              {row.map((position) => {
                const occupant = getOccupantAt(state, position);
                const isCurrentPlayer = occupant === state.currentPlayer;
                return (
                  <DungeonCell
                    key={toPositionKey(position)}
                    position={position}
                    occupant={occupant}
                    highlight={highlightSet.has(toPositionKey(position)) ? highlightType : dangerSet.has(toPositionKey(position)) ? "danger" : null}
                    clickable={highlightSet.has(toPositionKey(position))}
                    onClick={onCellClick}
                    boardSize={state.boardSize}
                    isCurrentPlayer={isCurrentPlayer}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
