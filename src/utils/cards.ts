import type { CardType, FateOutcome, GameState, PlayerId, Position } from "@/types/game";
import {
  HEX_DIRECTION_COUNT,
  getHexDirectionStep,
  MAX_HAND_SIZE,
  getOccupantAt,
  getStormRing,
  isCardTargetableCell,
  isCellEmpty,
  isInsideBoard,
  isSamePosition,
  otherPlayer,
  toPositionKey,
} from "@/utils/board";

// 以 100 份权重配置抽牌概率，方便后续继续微调。
// 当前设计里 18号月亮 与 宝剑八明显偏高，同时保留新加入的三张牌。
const DRAW_TABLE: CardType[] = [
  ...Array.from({ length: 30 }, () => "obstacle" as const),
  ...Array.from({ length: 24 }, () => "swords8" as const),
  ...Array.from({ length: 9 }, () => "fool" as const),
  ...Array.from({ length: 8 }, () => "storm" as const),
  ...Array.from({ length: 6 }, () => "chalice" as const),
  ...Array.from({ length: 6 }, () => "tower" as const),
  ...Array.from({ length: 6 }, () => "temperance" as const),
  ...Array.from({ length: 6 }, () => "hangedman" as const),
  ...Array.from({ length: 5 }, () => "fate" as const),
];

interface StormEntity {
  kind: "obstacle";
  position: Position;
}

export function drawRandomCard(random = Math.random): CardType {
  const index = Math.floor(random() * DRAW_TABLE.length);
  return DRAW_TABLE[index] ?? "obstacle";
}

export function addCardToHand(hand: CardType[], card: CardType) {
  if (hand.length >= MAX_HAND_SIZE) {
    return { hand, accepted: false };
  }

  return { hand: [...hand, card], accepted: true };
}

export function replaceCardInHand(hand: CardType[], removedCard: CardType, addedCard: CardType) {
  const index = hand.indexOf(removedCard);

  if (index === -1) {
    return hand;
  }

  const nextHand = [...hand];
  nextHand.splice(index, 1, addedCard);
  return nextHand;
}

export function removeCardFromHand(hand: CardType[], card: CardType) {
  const index = hand.indexOf(card);

  if (index === -1) {
    return hand;
  }

  return hand.filter((_, handIndex) => handIndex !== index);
}

export function canUseObstacle(state: GameState) {
  for (let y = 0; y < state.boardSize; y += 1) {
    for (let x = 0; x < state.boardSize; x += 1) {
      if (isCardTargetableCell(state, { x, y })) {
        return true;
      }
    }
  }

  return false;
}

export function canUseStorm(state: GameState) {
  return getStormTargetCenters(state).length > 0;
}

export function getStormTargetCenters(state: GameState) {
  const targets: Position[] = [];

  for (let y = 0; y < state.boardSize; y += 1) {
    for (let x = 0; x < state.boardSize; x += 1) {
      const ring = getStormRing({ x, y }, state.boardSize);
      if (ring.some((position) => getOccupantAt(state, position) === "obstacle")) {
        targets.push({ x, y });
      }
    }
  }

  return targets;
}

export function canUseTower(state: GameState, playerId: PlayerId) {
  const player = state.players[playerId];

  return Array.from({ length: HEX_DIRECTION_COUNT }, (_, directionIndex) => directionIndex).some((directionIndex) => {
    let distance = 1;
    let cursor = getHexDirectionStep(player.position, directionIndex, distance);

    while (cursor && isInsideBoard(cursor, state.boardSize)) {
      const occupant = getOccupantAt(state, cursor);

      if (occupant === "obstacle") {
        const landing = getHexDirectionStep(player.position, directionIndex, distance + 1);

        return Boolean(landing && isInsideBoard(landing, state.boardSize) && isCellEmpty(state, landing));
      }

      if (occupant === "player1" || occupant === "player2") {
        return false;
      }

      distance += 1;
      cursor = getHexDirectionStep(player.position, directionIndex, distance);
    }

    return false;
  });
}

export function getFoolObstacleTargets(state: GameState, playerId: PlayerId) {
  const player = state.players[playerId];
  const targets: Position[] = [];

  for (let directionIndex = 0; directionIndex < HEX_DIRECTION_COUNT; directionIndex += 1) {
    for (let distance = 1; distance < state.boardSize; distance += 1) {
      const target = getHexDirectionStep(player.position, directionIndex, distance);
      if (!target || !isInsideBoard(target, state.boardSize)) {
        break;
      }

      if (isCardTargetableCell(state, target)) {
        targets.push(target);
        break;
      }
    }
  }

  return targets;
}

export function getFoolSwordEightPlacements(state: GameState, playerId: PlayerId) {
  const player = state.players[playerId];
  const placements: Array<{ start: Position; second: Position }> = [];

  for (let directionIndex = 0; directionIndex < HEX_DIRECTION_COUNT; directionIndex += 1) {
    for (let distance = 1; distance < state.boardSize; distance += 1) {
      const start = getHexDirectionStep(player.position, directionIndex, distance);
      const second = getHexDirectionStep(player.position, directionIndex, distance + 1);
      const third = getHexDirectionStep(player.position, directionIndex, distance + 2);

      if (!start || !second || !third) {
        break;
      }

      if (
        isInsideBoard(start, state.boardSize) &&
        isInsideBoard(second, state.boardSize) &&
        isInsideBoard(third, state.boardSize) &&
        isCardTargetableCell(state, start) &&
        isCardTargetableCell(state, second) &&
        isCardTargetableCell(state, third)
      ) {
        placements.push({ start, second });
        break;
      }
    }
  }

  return placements;
}

export function pickRandomFoolObstacleTarget(
  state: GameState,
  playerId: PlayerId,
  random = Math.random,
) {
  const targets = getFoolObstacleTargets(state, playerId);
  if (targets.length === 0) {
    return null;
  }

  const index = Math.floor(random() * targets.length);
  return targets[index] ?? null;
}

export function pickRandomFoolSwordEightPlacement(
  state: GameState,
  playerId: PlayerId,
  random = Math.random,
) {
  const placements = getFoolSwordEightPlacements(state, playerId);
  if (placements.length === 0) {
    return null;
  }

  const index = Math.floor(random() * placements.length);
  return placements[index] ?? null;
}

export function getSwordEightSecondCells(state: GameState, start: Position) {
  if (!isCardTargetableCell(state, start)) {
    return [];
  }

  return Array.from({ length: HEX_DIRECTION_COUNT }, (_, directionIndex) => ({
    second: getHexDirectionStep(start, directionIndex, 1),
    third: getHexDirectionStep(start, directionIndex, 2),
  })).filter(({ second, third }) => {
    if (!second || !third) {
      return false;
    }

    return (
      isInsideBoard(second, state.boardSize) &&
      isInsideBoard(third, state.boardSize) &&
      isCardTargetableCell(state, second) &&
      isCardTargetableCell(state, third)
    );
  }).map(({ second }) => second as Position);
}

export function getSwordEightStartCells(state: GameState) {
  const starts: Position[] = [];

  for (let y = 0; y < state.boardSize; y += 1) {
    for (let x = 0; x < state.boardSize; x += 1) {
      const start = { x, y };
      if (getSwordEightSecondCells(state, start).length > 0) {
        starts.push(start);
      }
    }
  }

  return starts;
}

export function canUseSwordEight(state: GameState) {
  return getSwordEightStartCells(state).length > 0;
}

export function canUseCard(state: GameState, playerId: PlayerId, card: CardType) {
  const hasRepeatPrivilege = state.currentPlayer === playerId && state.repeatCard === card;
  if (state.currentPlayer === playerId && state.repeatCard && state.repeatCard !== card) {
    return false;
  }

  if (!state.players[playerId].hand.includes(card) && !hasRepeatPrivilege) {
    return false;
  }

  switch (card) {
    case "obstacle":
      return state.players[playerId].randomMovePending
        ? getFoolObstacleTargets(state, playerId).length > 0
        : canUseObstacle(state);
    case "chalice":
      return true;
    case "storm":
      return canUseStorm(state);
    case "tower":
      return canUseTower(state, playerId);
    case "fool":
      return true;
    case "swords8":
      return state.players[playerId].randomMovePending
        ? getFoolSwordEightPlacements(state, playerId).length > 0
        : canUseSwordEight(state);
    case "temperance":
      return true;
    case "hangedman":
    case "fate":
      return true;
    default:
      return false;
  }
}

export function getRandomHandRemovals(hand: CardType[], count: number, random = Math.random) {
  const nextHand = [...hand];
  const removedCards: CardType[] = [];

  for (let index = 0; index < count && nextHand.length > 0; index += 1) {
    const randomIndex = Math.floor(random() * nextHand.length);
    const [removed] = nextHand.splice(randomIndex, 1);
    if (removed) {
      removedCards.push(removed);
    }
  }

  return { nextHand, removedCards };
}

export function getRandomFateChoices(random = Math.random): FateOutcome[] {
  return shuffleItems<FateOutcome>(["sun", "death", "empress"], random);
}

export function clearAdjacentObstacles(state: GameState, center: Position) {
  const ring = getStormRing(center, state.boardSize);
  return state.obstacles.filter((obstacle) => !ring.some((cell) => isSamePosition(cell, obstacle)));
}

export function surroundWithObstacles(state: GameState, center: Position) {
  const ring = getStormRing(center, state.boardSize);
  const nextObstacles = [...state.obstacles];
  const seen = new Set(nextObstacles.map(toPositionKey));

  ring.forEach((cell) => {
    if (!isCellEmpty(state, cell)) {
      return;
    }

    const key = toPositionKey(cell);
    if (!seen.has(key)) {
      seen.add(key);
      nextObstacles.push(cell);
    }
  });

  return nextObstacles;
}

export function placeObstacle(state: GameState, target: Position) {
  if (!isCardTargetableCell(state, target)) {
    return null;
  }

  return [...state.obstacles, target];
}

export function placeSwordEightObstacles(state: GameState, start: Position, second: Position) {
  const validSecondCells = getSwordEightSecondCells(state, start);
  const matches = validSecondCells.some((cell) => isSamePosition(cell, second));

  if (!matches) {
    return null;
  }

  const directionIndex = Array.from({ length: HEX_DIRECTION_COUNT }, (_, index) => index).find((index) => {
    const next = getHexDirectionStep(start, index, 1);
    return Boolean(next && isSamePosition(next, second));
  });

  if (directionIndex === undefined) {
    return null;
  }

  const third = getHexDirectionStep(start, directionIndex, 2);
  if (!third) {
    return null;
  }

  return [...state.obstacles, start, second, third];
}

export function swapPlayers(state: GameState) {
  const current = state.currentPlayer;
  const rival = otherPlayer(current);

  return {
    [current]: { ...state.players[current], position: state.players[rival].position },
    [rival]: { ...state.players[rival], position: state.players[current].position },
  };
}

function shuffleItems<T>(items: T[], random = Math.random) {
  const list = [...items];

  for (let index = list.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [list[index], list[swapIndex]] = [list[swapIndex], list[index]];
  }

  return list;
}

function collectStormEntities(state: GameState, center: Position) {
  const ring = getStormRing(center, state.boardSize);
  const entities: StormEntity[] = [];

  ring.forEach((position) => {
    const occupant = getOccupantAt(state, position);
    if (occupant === "obstacle") {
      entities.push({ kind: occupant, position });
    }
  });

  return { ring, entities };
}

export function applyStorm(
  state: GameState,
  center: Position,
  random = Math.random,
) {
  const { ring, entities } = collectStormEntities(state, center);

  if (entities.length === 0) {
    return null;
  }

  const candidateKeys = ring.map(toPositionKey);

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const shuffledCells = shuffleItems(candidateKeys, random).slice(0, entities.length);
    const nextObstacles: Position[] = state.obstacles.filter(
      (obstacle) => !ring.some((cell) => isSamePosition(cell, obstacle)),
    );
    const used = new Set<string>();
    let valid = true;

    entities.forEach((entity, index) => {
      const key = shuffledCells[index];
      if (!key || used.has(key)) {
        valid = false;
        return;
      }

      used.add(key);
      const [x, y] = key.split(",").map(Number);
      const nextPosition = { x, y };

      nextObstacles.push(nextPosition);
    });

    if (!valid) {
      continue;
    }

    const obstacleSet = new Set(nextObstacles.map(toPositionKey));
    if (
      obstacleSet.has(toPositionKey(state.players.player1.position)) ||
      obstacleSet.has(toPositionKey(state.players.player2.position))
    ) {
      continue;
    }

    return {
      players: {
        player1: { ...state.players.player1 },
        player2: { ...state.players.player2 },
      },
      obstacles: nextObstacles,
    };
  }

  return null;
}
