import type { AiDifficulty, FateOutcome, GameMode, GameState, PlayerId, Position } from "@/types/game";

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

export const AI_DIFFICULTY_LABELS: Record<AiDifficulty, string> = {
  easy: "简单",
  medium: "中等",
  hard: "困难",
};

export const AI_DIFFICULTY_DESCRIPTIONS: Record<AiDifficulty, string> = {
  easy: "优先基础移动与明显收益，偶尔错过更深层机会。",
  medium: "会权衡封路、保命、出牌时机，并开始预判对手下一回合反击。",
  hard: "会主动预判你的反制路线，优先寻找压制、脱困、连招与直接将死窗口。",
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
  temperance: "14号节制",
  hangedman: "12号倒吊人",
  fate: "10号命运",
};

export const CARD_DESCRIPTIONS = {
  obstacle: "在任意空白格放置 1 个永久障碍物",
  chalice: "与敌方交换位置",
  storm: "打乱目标格周围 6 格内的障碍物位置，不会移动玩家",
  tower: "沿任意方向找到路径上的第一个障碍物，并落到其后方一格",
  fool: "令对方下一次移动失控；若使用18号月亮或宝剑八，也会朝随机方向释放",
  swords8: "选择一条连续直线的三个方格，一次性放置 3 个障碍物",
  temperance: "随机清除对方 1 张手牌；若触发倒吊人，会连续清除 2 张",
  hangedman: "打出时没有直接效果；持有且手牌大于 3 张时，会让多数塔罗牌触发双倍效果",
  fate: "出现太阳、正位死神、女皇三张命运牌，双方各抽 1 次，使用者先抽",
};

export const CARD_MEANINGS = {
  obstacle: "寓意：迷雾、隐患与未知压迫",
  chalice: "寓意：情感流动、关系互换与连接",
  storm: "寓意：欲望束缚、诱惑放大与局势扭曲",
  tower: "寓意：突变冲击、破局跃迁与旧秩序崩塌",
  fool: "寓意：无序启程、失控试探与命运偏转",
  swords8: "寓意：束缚成阵、压迫收紧与封锁成形",
  temperance: "寓意：平衡打破、收束裁剪与资源净化",
  hangedman: "寓意：停滞倒悬、代价翻倍与命运反转",
  fate: "寓意：轮盘转动、吉凶同席与未知裁决",
};

export const FATE_OUTCOME_LABELS: Record<FateOutcome, string> = {
  sun: "太阳",
  death: "正位死神",
  empress: "女皇",
};

export const FATE_OUTCOME_DESCRIPTIONS: Record<FateOutcome, string> = {
  sun: "清空自身周围 6 格上的障碍物；若周围没有障碍物，则不会生效。",
  death: "自身周围会生成一圈障碍物，但仍可继续完成当前回合，避免被立即判负。",
  empress: "什么也不会发生。",
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
