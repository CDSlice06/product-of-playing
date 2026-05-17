import HexCell from "@/components/HexCell";
import { createBoardCells, getOccupantAt, toPositionKey } from "@/utils/board";
import type { GameState, Position } from "@/types/game";

interface BoardProps {
  state: GameState;
  highlightedCells: Position[];
  dangerCells?: Position[];
  onCellClick: (position: Position) => void;
}

export default function Board({
  state,
  highlightedCells,
  dangerCells = [],
  onCellClick,
}: BoardProps) {
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
    <div className="app-surface overflow-x-auto rounded-[2rem] border border-white/10 bg-slate-950/70 p-4 shadow-[0_30px_80px_rgba(15,23,42,0.45)] backdrop-blur-xl">
      <div className="mx-auto w-max">
        {cells.map((row, rowIndex) => (
          <div
            key={`row-${rowIndex}`}
            className={rowIndex % 2 === 0 ? "flex gap-1.5" : "board-row-offset flex gap-1.5"}
            style={{ marginLeft: rowIndex % 2 === 0 ? 0 : 30 }}
          >
            {row.map((position) => {
              const positionKey = toPositionKey(position);
              return (
                <HexCell
                  key={positionKey}
                  position={position}
                  occupant={getOccupantAt(state, position)}
                  highlight={highlightSet.has(positionKey) ? highlightType : dangerSet.has(positionKey) ? "danger" : null}
                  clickable={highlightSet.has(positionKey)}
                  onClick={onCellClick}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
