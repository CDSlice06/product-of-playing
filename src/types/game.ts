export type PlayerId = "player1" | "player2";
export type GameMode = "pvp" | "pve";
export type AiDifficulty = "easy" | "medium" | "hard";

export type CardType =
  | "obstacle"
  | "chalice"
  | "storm"
  | "tower"
  | "fool"
  | "swords8"
  | "temperance"
  | "hangedman"
  | "fate";

export type FateOutcome = "sun" | "death" | "empress";

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
  randomMovePendingTurns: number;
  deathGraceActive: boolean;
}

export interface FateState {
  caster: PlayerId;
  choices: FateOutcome[];
  revealedIndices: number[];
  pendingPlayer: PlayerId | null;
  revealedBy: Partial<Record<PlayerId, FateOutcome>>;
}

export interface PendingFateTrigger {
  caster: PlayerId;
  recipient: PlayerId;
  triggerAfterTurnOf: PlayerId;
}

export interface BattleLogEntry {
  id: string;
  playerId: PlayerId;
  text: string;
  type: "draw" | "play" | "fate" | "system";
}

export interface ResultState {
  winner: PlayerId;
  reason: string;
}

export interface GameState {
  boardSize: number;
  gameMode: GameMode;
  aiDifficulty: AiDifficulty;
  currentPlayer: PlayerId;
  phase: "move" | "skill" | "discard" | "fate" | "gameover";
  players: Record<PlayerId, PlayerState>;
  obstacles: Position[];
  selectedCard: CardType | null;
  selectedCardAnchor: Position | null;
  repeatCard: CardType | null;
  pendingDrawCard: CardType | null;
  fateState: FateState | null;
  pendingFateTriggers: PendingFateTrigger[];
  battleLog: BattleLogEntry[];
  winner: PlayerId | null;
  winReason: string | null;
  startedAt: number;
  endedAt: number | null;
  turnEndsAt: number;
  message: string;
}
