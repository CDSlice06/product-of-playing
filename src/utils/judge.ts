import type { CardType, GameState, PlayerId, Position, ResultState } from "@/types/game";
import { canUseCard, swapPlayers } from "@/utils/cards";
import {
  HEX_DIRECTION_COUNT,
  getHexDirectionStep,
  getNeighbors,
  getOccupantAt,
  getStormRing,
  isCellEmpty,
  isInsideBoard,
  isSamePosition,
  otherPlayer,
} from "@/utils/board";

export function getLegalMoves(state: GameState, playerId: PlayerId) {
  const player = state.players[playerId];

  if (player.lockedTurns > 0) {
    return [];
  }

  return getNeighbors(player.position, state.boardSize).filter((position) => isLegalMove(state, playerId, position));
}

export function isLegalMove(state: GameState, playerId: PlayerId, target: Position) {
  const player = state.players[playerId];

  if (player.lockedTurns > 0) {
    return false;
  }

  if (!isInsideBoard(target, state.boardSize)) {
    return false;
  }

  const isAdjacent = getNeighbors(player.position, state.boardSize).some((cell) => isSamePosition(cell, target));
  if (!isAdjacent) {
    return false;
  }

  return isCellEmpty(state, target);
}

export function canPlayerAct(state: GameState, playerId: PlayerId) {
  if (state.players[playerId].deathGraceActive) {
    return true;
  }

  const legalMoves = getLegalMoves(state, playerId);
  if (legalMoves.length > 0) {
    return true;
  }

  if (state.players[playerId].lockedTurns > 0) {
    return false;
  }

  return state.players[playerId].hand.some((card) => canCardRestoreMobility(state, playerId, card));
}

export function canCardRestoreMobility(state: GameState, playerId: PlayerId, card: CardType) {
  if (!canUseCard(state, playerId, card)) {
    return false;
  }

  switch (card) {
    case "chalice": {
      const swappedPlayers = swapPlayers(state);
      return getLegalMoves({ ...state, players: { ...state.players, ...swappedPlayers } }, playerId).length > 0;
    }
    case "storm":
      return getStormRing(state.players[playerId].position, state.boardSize).some(
        (position) => getOccupantAt(state, position) === "obstacle",
      );
    case "tower":
      return true;
    case "temperance":
    case "hangedman":
    case "fate":
    case "obstacle":
    case "fool":
    case "swords8":
    default:
      return false;
  }
}

function getTowerLandingForDirection(state: GameState, playerId: PlayerId, directionIndex: number) {
  const player = state.players[playerId];
  let distance = 1;
  let cursor = getHexDirectionStep(player.position, directionIndex, distance);

  while (cursor && isInsideBoard(cursor, state.boardSize)) {
    const occupant = getOccupantAt(state, cursor);

    if (occupant === "obstacle") {
      const landing = getHexDirectionStep(player.position, directionIndex, distance + 1);
      return landing && isInsideBoard(landing, state.boardSize) && isCellEmpty(state, landing) ? landing : null;
    }

    if (occupant === "player1" || occupant === "player2") {
      return null;
    }

    distance += 1;
    cursor = getHexDirectionStep(player.position, directionIndex, distance);
  }

  return null;
}

export function getTowerMoves(state: GameState, playerId: PlayerId) {
  const player = state.players[playerId];

  if (player.lockedTurns > 0) {
    return [];
  }

  return Array.from({ length: HEX_DIRECTION_COUNT }, (_, directionIndex) => {
    return getTowerLandingForDirection(state, playerId, directionIndex);
  }).filter((target): target is Position => target !== null);
}

export function getTowerMoveFromDirectionSelection(state: GameState, playerId: PlayerId, target: Position) {
  const player = state.players[playerId];

  for (let directionIndex = 0; directionIndex < HEX_DIRECTION_COUNT; directionIndex += 1) {
    for (let distance = 1; distance < state.boardSize; distance += 1) {
      const cursor = getHexDirectionStep(player.position, directionIndex, distance);
      if (!cursor || !isInsideBoard(cursor, state.boardSize)) {
        break;
      }

      if (!isSamePosition(cursor, target)) {
        continue;
      }

      return getTowerLandingForDirection(state, playerId, directionIndex);
    }
  }

  return null;
}

export function resolveWinner(state: GameState, actor: PlayerId): ResultState | null {
  const rival = otherPlayer(actor);
  const actorCanAct = canPlayerAct(state, actor);
  const rivalCanAct = canPlayerAct(state, rival);

  if (!actorCanAct && !rivalCanAct) {
    return {
      winner: actor,
      reason: "双方都已无法移动或打出可生效的塔罗牌，当前行动方获胜",
    };
  }

  if (!rivalCanAct) {
    return {
      winner: actor,
      reason: "对手已失去移动能力，且没有可用塔罗牌可以脱困",
    };
  }

  if (!actorCanAct) {
    return {
      winner: rival,
      reason: "当前玩家已失去移动能力，且没有可用塔罗牌可以脱困",
    };
  }

  return null;
}

export function getCardTargetMode(card: CardType) {
  if (card === "obstacle" || card === "storm" || card === "tower" || card === "swords8") {
    return "board";
  }

  return "instant";
}
