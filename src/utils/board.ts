import type { GameMode, GameState, PlayerId, Position } from "@/types/game";

export const BOARD_SIZE = 10;
export const MAX_HAND_SIZE = 4;
export const TURN_DURATION_MS = 60_000;

interface CubePosition {
  x: number;
  y: number;
  z: number;
}

const HEX_CUBE_DIRECTIONS: CubePosition[] = [
  { x: 1, y: -1, z: 0 },
  { x: 1, y: 0, z: -1 },
  { x: 0, y: 1, z: -1 },
  { x: -1, y: 1, z: 0 },
  { x: -1, y: 0, z: 1 },
  { x: 0, y: -1, z: 1 },
];

export const PLAYER_LABELS: Record<PlayerId, string> = {
  player1: "占星师",
  player2: "秘术师",
};

export function getPlayerName(playerId: PlayerId, gameMode: GameMode) {
  if (playerId === "player2" && gameMode === "pve") {
    return "命运傀儡";
  }

  return PLAYER_LABELS[playerId];
}

export const CARD_LABELS = {
  obstacle: "18号月亮",
  chalice: "圣杯",
  storm: "15号恶魔",
  tower: "16号正位高塔",
  fool: "0号愚人",
  swords8: "宝剑八",
};

export const CARD_DESCRIPTIONS = {
  obstacle: "在任意空白格放置 1 个永久障碍物",
  chalice: "与敌方交换位置",
  storm: "打乱目标格周围 6 格内的障碍物位置，不会移动玩家",
  tower: "沿任意方向找到路径上的第一个障碍物，并落到其后方一格",
  fool: "令对方下一次移动失控，并随机朝某个合法方向移动",
  swords8: "选择一条连续直线的三个方格，一次性放置 3 个障碍物",
};

export const CARD_MEANINGS = {
  obstacle: "寓意：迷雾、隐患与未知压迫",
  chalice: "寓意：情感流动、关系互换与连接",
  storm: "寓意：欲望束缚、诱惑放大与局势扭曲",
  tower: "寓意：突变冲击、破局跃迁与旧秩序崩塌",
  fool: "寓意：无序启程、失控试探与命运偏转",
  swords8: "寓意：束缚成阵、压迫收紧与封锁成形",
};

export const SPAWN_POINTS: Record<PlayerId, Position> = {
  player1: { x: 1, y: 1 },
  player2: { x: 8, y: 8 },
};

export function createBoardCells(boardSize: number) {
  return Array.from({ length: boardSize }, (_, y) =>
    Array.from({ length: boardSize }, (_, x) => ({ x, y })),
  );
}

export function otherPlayer(playerId: PlayerId): PlayerId {
  return playerId === "player1" ? "player2" : "player1";
}

export function isInsideBoard(position: Position, boardSize = BOARD_SIZE) {
  return position.x >= 0 && position.x < boardSize && position.y >= 0 && position.y < boardSize;
}

export function isSamePosition(a: Position, b: Position) {
  return a.x === b.x && a.y === b.y;
}

export function toPositionKey(position: Position) {
  return `${position.x},${position.y}`;
}

function offsetToCube(position: Position): CubePosition {
  const x = position.x - ((position.y - (position.y & 1)) / 2);
  const z = position.y;
  const y = -x - z;
  return { x, y, z };
}

function cubeToOffset(cube: CubePosition): Position {
  return {
    x: cube.x + ((cube.z - (cube.z & 1)) / 2),
    y: cube.z,
  };
}

export function getHexDirectionStep(position: Position, directionIndex: number, distance = 1) {
  const direction = HEX_CUBE_DIRECTIONS[directionIndex];
  if (!direction) {
    return null;
  }

  const cube = offsetToCube(position);
  return cubeToOffset({
    x: cube.x + direction.x * distance,
    y: cube.y + direction.y * distance,
    z: cube.z + direction.z * distance,
  });
}

export const HEX_DIRECTION_COUNT = HEX_CUBE_DIRECTIONS.length;

export function getNeighbors(position: Position, boardSize = BOARD_SIZE) {
  return HEX_CUBE_DIRECTIONS.map((_, directionIndex) => getHexDirectionStep(position, directionIndex))
    .filter((next): next is Position => Boolean(next))
    .filter((next) => isInsideBoard(next, boardSize));
}

export function getStormRing(center: Position, boardSize = BOARD_SIZE) {
  return getNeighbors(center, boardSize);
}

export function getOccupantAt(state: Pick<GameState, "players" | "obstacles">, position: Position) {
  if (isSamePosition(state.players.player1.position, position)) {
    return "player1";
  }

  if (isSamePosition(state.players.player2.position, position)) {
    return "player2";
  }

  if (state.obstacles.some((obstacle) => isSamePosition(obstacle, position))) {
    return "obstacle";
  }

  return "empty";
}

export function isCellEmpty(state: Pick<GameState, "players" | "obstacles">, position: Position) {
  return getOccupantAt(state, position) === "empty";
}

export function isCardTargetableCell(state: Pick<GameState, "players" | "obstacles">, position: Position) {
  return isInsideBoard(position, BOARD_SIZE) && isCellEmpty(state, position);
}
