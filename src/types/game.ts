export type PlayerId = "player1" | "player2";
export type GameMode = "pvp" | "pve";

export type CardType = "obstacle" | "chalice" | "storm" | "tower" | "fool" | "swords8";

export interface Position {
  x: number;
  y: number;
}

export interface PlayerState {
  id: PlayerId;
  name: string;
  position: Position;
  hand: CardType[];
  moveCount: number;
  usedCardCount: number;
  lockedTurns: number;
  randomMovePending: boolean;
}

export interface ResultState {
  winner: PlayerId;
  reason: string;
}

export interface GameState {
  boardSize: number;
  gameMode: GameMode;
  currentPlayer: PlayerId;
  phase: "move" | "skill" | "discard" | "gameover";
  players: Record<PlayerId, PlayerState>;
  obstacles: Position[];
  selectedCard: CardType | null;
  selectedCardAnchor: Position | null;
  pendingDrawCard: CardType | null;
  winner: PlayerId | null;
  winReason: string | null;
  startedAt: number;
  endedAt: number | null;
  turnEndsAt: number;
  message: string;
}
