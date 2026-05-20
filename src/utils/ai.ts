import type { AiDifficulty, CardType, FateOutcome, GameState, PlayerId, Position } from "@/types/game";
import { createBoardCells, getNeighbors, getOccupantAt, getStormRing, isCellEmpty, otherPlayer } from "@/utils/board";
import {
  applyStorm,
  canUseCard,
  clearAdjacentObstacles,
  getFoolObstacleTargets,
  getFoolSwordEightPlacements,
  getStormTargetCenters,
  getSwordEightSecondCells,
  getSwordEightStartCells,
  placeObstacle,
  placeSwordEightObstacles,
  removeCardFromHand,
  surroundWithObstacles,
  swapPlayers,
} from "@/utils/cards";
import { getLegalMoves, getTowerMoves, resolveWinner } from "@/utils/judge";

export type AiSkillPlan =
  | { card: "fool" | "chalice" | "temperance" | "hangedman" | "fate" }
  | { card: "obstacle" | "storm" | "tower"; target: Position }
  | { card: "swords8"; start: Position; second: Position };

export type AiMovePhaseAction =
  | { type: "move"; target: Position }
  | { type: "direct-skill"; plan: AiSkillPlan }
  | { type: "pass" };

interface AiProfile {
  weights: {
    ownMoves: number;
    rivalMoves: number;
    ownPressure: number;
    rivalPressure: number;
    handValue: number;
    centerControl: number;
    randomThreat: number;
    trapEdge: number;
  };
  skillDeltaThreshold: number;
  directSkillMargin: number;
  tacticalReductionThreshold: number;
  panicMoveThreshold: number;
  considerPostMoveSkill: boolean;
  postMoveSkillWeight: number;
  replyWeight: number;
  anticipateCounter: boolean;
  obstacleCandidateLimit: number;
  swordsCandidateLimit: number;
  stormRandomSets: number[][];
  handPressureSkillThreshold: number;
  handPressureSkillTolerance: number;
  opportunisticSkillTolerance: number;
  directSkillCloseMargin: number;
  moveEvaluationLimit: number;
  obstacleEvaluationLimit: number;
  swordsEvaluationLimit: number;
  stormEvaluationLimit: number;
}

interface AiSkillCandidate {
  plan: AiSkillPlan;
  nextState: GameState;
  score: number;
  delta: number;
  ownMovesBefore: number;
  ownMovesAfter: number;
  rivalMovesBefore: number;
  rivalMovesAfter: number;
  createsWin: boolean;
}

interface AiMoveCandidate {
  target: Position;
  baseScore: number;
  projectedScore: number;
  nextState: GameState;
  projectedState: GameState;
}

type StateScorer = (state: GameState, playerId: PlayerId, difficulty: AiDifficulty) => number;
const AGGRESSIVE_SKILL_CARDS = new Set<CardType>(["obstacle", "storm", "tower", "swords8", "temperance", "fool"]);

const CARD_BASE_VALUES: Record<CardType, number> = {
  obstacle: 5,
  chalice: 7,
  storm: 4,
  tower: 8,
  fool: 5,
  swords8: 10,
  temperance: 6,
  hangedman: 2,
  fate: 6,
};

const FATE_OUTCOMES: FateOutcome[] = ["sun", "death", "empress"];

const AI_PROFILES: Record<AiDifficulty, AiProfile> = {
  easy: {
    weights: {
      ownMoves: 15,
      rivalMoves: 19,
      ownPressure: 10,
      rivalPressure: 14,
      handValue: 2,
      centerControl: 1.5,
      randomThreat: 10,
      trapEdge: 10,
    },
    skillDeltaThreshold: 11,
    directSkillMargin: 4,
    tacticalReductionThreshold: 2,
    panicMoveThreshold: 2,
    considerPostMoveSkill: true,
    postMoveSkillWeight: 0.55,
    replyWeight: 0.2,
    anticipateCounter: true,
    obstacleCandidateLimit: 14,
    swordsCandidateLimit: 10,
    stormRandomSets: [
      [0.17, 0.41, 0.83],
      [0.11, 0.37, 0.73],
    ],
    handPressureSkillThreshold: 4,
    handPressureSkillTolerance: -2,
    opportunisticSkillTolerance: 0,
    directSkillCloseMargin: 1,
    moveEvaluationLimit: 4,
    obstacleEvaluationLimit: 5,
    swordsEvaluationLimit: 5,
    stormEvaluationLimit: 3,
  },
  medium: {
    weights: {
      ownMoves: 18,
      rivalMoves: 24,
      ownPressure: 11,
      rivalPressure: 18,
      handValue: 3,
      centerControl: 2,
      randomThreat: 12,
      trapEdge: 16,
    },
    skillDeltaThreshold: 7,
    directSkillMargin: 2,
    tacticalReductionThreshold: 1,
    panicMoveThreshold: 2,
    considerPostMoveSkill: true,
    postMoveSkillWeight: 0.8,
    replyWeight: 0.5,
    anticipateCounter: true,
    obstacleCandidateLimit: 20,
    swordsCandidateLimit: 16,
    stormRandomSets: [
      [0.11, 0.37, 0.73],
      [0.19, 0.43, 0.91],
      [0.07, 0.29, 0.61],
      [0.13, 0.31, 0.79],
    ],
    handPressureSkillThreshold: 3,
    handPressureSkillTolerance: -3,
    opportunisticSkillTolerance: -1,
    directSkillCloseMargin: 2.5,
    moveEvaluationLimit: 5,
    obstacleEvaluationLimit: 6,
    swordsEvaluationLimit: 6,
    stormEvaluationLimit: 4,
  },
  hard: {
    weights: {
      ownMoves: 24,
      rivalMoves: 34,
      ownPressure: 14,
      rivalPressure: 25,
      handValue: 4,
      centerControl: 3,
      randomThreat: 18,
      trapEdge: 26,
    },
    skillDeltaThreshold: 2,
    directSkillMargin: 0,
    tacticalReductionThreshold: 1,
    panicMoveThreshold: 2,
    considerPostMoveSkill: true,
    postMoveSkillWeight: 1.15,
    replyWeight: 0.9,
    anticipateCounter: true,
    obstacleCandidateLimit: 30,
    swordsCandidateLimit: 22,
    stormRandomSets: [
      [0.11, 0.37, 0.73],
      [0.19, 0.43, 0.91],
      [0.07, 0.29, 0.61],
      [0.13, 0.31, 0.79],
      [0.23, 0.47, 0.67],
      [0.05, 0.41, 0.89],
      [0.17, 0.53, 0.77],
      [0.09, 0.27, 0.95],
    ],
    handPressureSkillThreshold: 2,
    handPressureSkillTolerance: -4,
    opportunisticSkillTolerance: -2,
    directSkillCloseMargin: 4,
    moveEvaluationLimit: 6,
    obstacleEvaluationLimit: 7,
    swordsEvaluationLimit: 7,
    stormEvaluationLimit: 5,
  },
};

function countAdjacentObstacles(state: GameState, playerId: PlayerId) {
  return getNeighbors(state.players[playerId].position, state.boardSize).filter(
    (position) => getOccupantAt(state, position) === "obstacle",
  ).length;
}

function createLoopingRandom(values: number[]) {
  let index = 0;

  return () => {
    const value = values[index % values.length] ?? 0.5;
    index += 1;
    return value;
  };
}

function getCenterDistance(state: GameState, position: Position) {
  const center = (state.boardSize - 1) / 2;
  return Math.abs(position.x - center) + Math.abs(position.y - center);
}

function getHandValue(state: GameState, playerId: PlayerId) {
  const hand = state.players[playerId].hand;
  const hasPassive = hand.includes("hangedman") && hand.length > 3;
  return hand.reduce((sum, card) => {
    let value = CARD_BASE_VALUES[card];
    if (hasPassive && card !== "hangedman" && card !== "fate") {
      value += Math.max(2, Math.round(CARD_BASE_VALUES[card] * 0.6));
    }
    return sum + value;
  }, 0);
}

function getHangedmanLiabilityScore(state: GameState, playerId: PlayerId) {
  const hand = state.players[playerId].hand;
  const hangedmanOnline = hand.includes("hangedman") && hand.length > 3;
  if (!hangedmanOnline) {
    return 0;
  }

  const ownMoves = getLegalMoves(state, playerId).length;
  const adjacentObstacles = countAdjacentObstacles(state, playerId);
  const hasChalice = hand.includes("chalice");
  const hasTower = hand.includes("tower");
  const heavyPressure = ownMoves <= 1 || adjacentObstacles >= 4;
  const mediumPressure = ownMoves <= 2 || adjacentObstacles >= 3;

  let liability = 0;
  if (hasChalice) {
    liability += heavyPressure ? 28 : mediumPressure ? 16 : 5;
  }

  if (hasTower) {
    liability += heavyPressure ? 24 : mediumPressure ? 12 : 4;
  }

  if ((hasChalice || hasTower) && hand.length === 4) {
    liability += 6;
  }

  return liability;
}

function shouldConsiderDroppingHangedman(state: GameState, playerId: PlayerId) {
  const liability = getHangedmanLiabilityScore(state, playerId);
  if (liability <= 0) {
    return false;
  }

  const ownMoves = getLegalMoves(state, playerId).length;
  const hand = state.players[playerId].hand;
  return liability >= 18 || ownMoves <= 1 || hand.length >= 4;
}

function shouldForceHangedmanRelease(state: GameState, playerId: PlayerId) {
  const hand = state.players[playerId].hand;
  const hasEscapeCard = hand.includes("chalice") || hand.includes("tower");
  if (!hasEscapeCard || !shouldConsiderDroppingHangedman(state, playerId)) {
    return false;
  }

  const ownMoves = getLegalMoves(state, playerId).length;
  const adjacentObstacles = countAdjacentObstacles(state, playerId);
  return ownMoves <= 1 || adjacentObstacles >= 4;
}

function getPositionDistance(left: Position, right: Position) {
  return Math.abs(left.x - right.x) + Math.abs(left.y - right.y);
}

function getRelevantObstacleCandidates(state: GameState, playerId: PlayerId, limit: number) {
  const rival = otherPlayer(playerId);
  const rivalPosition = state.players[rival].position;
  const ownPosition = state.players[playerId].position;
  const rivalMoves = getLegalMoves(state, rival);

  return createBoardCells(state.boardSize)
    .flat()
    .filter((cell) => isCellEmpty({ players: state.players, obstacles: state.obstacles }, cell))
    .map((cell) => {
      const distanceToRival = getPositionDistance(cell, rivalPosition);
      const distanceToOwn = getPositionDistance(cell, ownPosition);
      const blocksRivalMove = rivalMoves.some((move) => move.x === cell.x && move.y === cell.y);
      const adjacentToRival = getNeighbors(rivalPosition, state.boardSize).some((move) => move.x === cell.x && move.y === cell.y);

      const priority =
        (blocksRivalMove ? 60 : 0)
        + (adjacentToRival ? 30 : 0)
        - distanceToRival * 4
        - distanceToOwn;

      return { cell, priority };
    })
    .sort((left, right) => right.priority - left.priority)
    .slice(0, limit)
    .map((item) => item.cell);
}

function getRelevantSwordEightPlacements(state: GameState, playerId: PlayerId, limit: number) {
  const rival = otherPlayer(playerId);
  const rivalPosition = state.players[rival].position;
  const rivalMoves = getLegalMoves(state, rival);
  const seen = new Set<string>();
  const placements: Array<{ start: Position; second: Position; priority: number }> = [];

  getSwordEightStartCells(state).forEach((start) => {
    getSwordEightSecondCells(state, start).forEach((second) => {
      const placementKey = `${start.x},${start.y}|${second.x},${second.y}`;
      if (seen.has(placementKey)) {
        return;
      }
      seen.add(placementKey);

      const obstacles = placeSwordEightObstacles(state, start, second) ?? [];
      const newObstacles = obstacles.slice(state.obstacles.length);
      const minDistanceToRival = Math.min(...newObstacles.map((cell) => getPositionDistance(cell, rivalPosition)));
      const blockedMoves = rivalMoves.filter((move) =>
        newObstacles.some((cell) => cell.x === move.x && cell.y === move.y)).length;
      const adjacentHits = newObstacles.filter((cell) =>
        getNeighbors(rivalPosition, state.boardSize).some((neighbor) => neighbor.x === cell.x && neighbor.y === cell.y)).length;

      const priority = blockedMoves * 70 + adjacentHits * 25 - minDistanceToRival * 5;
      placements.push({ start, second, priority });
    });
  });

  return placements
    .sort((left, right) => right.priority - left.priority)
    .slice(0, limit)
    .map(({ start, second }) => ({ start, second }));
}

function consumeCard(state: GameState, playerId: PlayerId, card: CardType) {
  return {
    ...state.players[playerId],
    hand: removeCardFromHand(state.players[playerId].hand, card),
  };
}

function hasHangedmanPassive(state: GameState, playerId: PlayerId, card: CardType) {
  return card !== "hangedman"
    && card !== "fate"
    && state.players[playerId].hand.includes("hangedman")
    && state.players[playerId].hand.length > 3;
}

function applyFateOutcomeForAi(state: GameState, playerId: PlayerId, outcome: FateOutcome) {
  if (outcome === "sun") {
    return {
      ...state,
      obstacles: clearAdjacentObstacles(state, state.players[playerId].position),
    };
  }

  if (outcome === "death") {
    return {
      ...state,
      obstacles: surroundWithObstacles(state, state.players[playerId].position),
      players: {
        ...state.players,
        [playerId]: {
          ...state.players[playerId],
          deathGraceActive: true,
        },
      },
    };
  }

  return state;
}

function createNextTurnState(state: GameState, nextPlayer: PlayerId) {
  return {
    ...state,
    currentPlayer: nextPlayer,
    phase: "move" as const,
    selectedCard: null,
    selectedCardAnchor: null,
    pendingDrawCard: null,
  };
}

function simulateMove(state: GameState, playerId: PlayerId, target: Position) {
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...state.players[playerId],
        position: target,
        randomMovePending: false,
        randomMovePendingTurns: 0,
      },
    },
  };
}

function simulateObstacle(state: GameState, playerId: PlayerId, target: Position, difficulty = state.aiDifficulty) {
  const hangedmanTriggered = hasHangedmanPassive(state, playerId, "obstacle");
  const actualTarget = state.players[playerId].randomMovePending
    ? getFoolObstacleTargets(state, playerId)[0] ?? null
    : target;
  const nextObstacles = actualTarget ? placeObstacle(state, actualTarget) : null;
  if (!nextObstacles) {
    return null;
  }

  let nextState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...consumeCard(state, playerId, "obstacle"),
        randomMovePending: false,
        randomMovePendingTurns: 0,
      },
    },
    obstacles: nextObstacles,
  };

  if (hangedmanTriggered) {
    const secondTarget = chooseObstacleTarget(nextState, playerId, difficulty, evaluateStateForAi);
    const doubledObstacles = secondTarget ? placeObstacle(nextState, secondTarget) : null;
    if (doubledObstacles) {
      nextState = {
        ...nextState,
        obstacles: doubledObstacles,
      };
    }
  }

  return nextState;
}

function simulateSwordEight(
  state: GameState,
  playerId: PlayerId,
  start: Position,
  second: Position,
  difficulty = state.aiDifficulty,
) {
  const hangedmanTriggered = hasHangedmanPassive(state, playerId, "swords8");
  const actualPlacement = state.players[playerId].randomMovePending
    ? getFoolSwordEightPlacements(state, playerId)[0] ?? null
    : { start, second };
  const nextObstacles = actualPlacement
    ? placeSwordEightObstacles(state, actualPlacement.start, actualPlacement.second)
    : null;
  if (!nextObstacles) {
    return null;
  }

  let nextState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...consumeCard(state, playerId, "swords8"),
        randomMovePending: false,
        randomMovePendingTurns: 0,
      },
    },
    obstacles: nextObstacles,
  };

  if (hangedmanTriggered) {
    const secondPlacement = chooseSwordEightPlacement(nextState, playerId, difficulty, evaluateStateForAi);
    const doubledObstacles = secondPlacement
      ? placeSwordEightObstacles(nextState, secondPlacement.start, secondPlacement.second)
      : null;
    if (doubledObstacles) {
      nextState = {
        ...nextState,
        obstacles: doubledObstacles,
      };
    }
  }

  return nextState;
}

function simulateTower(state: GameState, playerId: PlayerId, target: Position, difficulty = state.aiDifficulty) {
  const hangedmanTriggered = hasHangedmanPassive(state, playerId, "tower");
  let nextState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...consumeCard(state, playerId, "tower"),
        position: target,
        randomMovePending: false,
        randomMovePendingTurns: 0,
      },
    },
  };

  if (hangedmanTriggered) {
    const secondTarget = chooseTowerTarget(nextState, playerId, difficulty, evaluateStateForAi);
    if (secondTarget) {
      nextState = {
        ...nextState,
        players: {
          ...nextState.players,
          [playerId]: {
            ...nextState.players[playerId],
            position: secondTarget,
          },
        },
      };
    }
  }

  return nextState;
}

function simulateChalice(state: GameState, playerId: PlayerId) {
  if (hasHangedmanPassive(state, playerId, "chalice")) {
    return {
      ...state,
      players: {
        ...state.players,
        [playerId]: consumeCard(state, playerId, "chalice"),
      },
    };
  }

  const swappedPlayers = {
    ...state.players,
    ...swapPlayers(state),
  };

  return {
    ...state,
    players: {
      ...swappedPlayers,
      [playerId]: {
        ...swappedPlayers[playerId],
        hand: removeCardFromHand(swappedPlayers[playerId].hand, "chalice"),
      },
    },
  };
}

function simulateFool(state: GameState, playerId: PlayerId) {
  const rival = otherPlayer(playerId);
  const hangedmanTriggered = hasHangedmanPassive(state, playerId, "fool");

  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: consumeCard(state, playerId, "fool"),
      [rival]: {
        ...state.players[rival],
        randomMovePending: true,
        randomMovePendingTurns: state.players[rival].randomMovePendingTurns + (hangedmanTriggered ? 2 : 1),
      },
    },
  };
}

function simulateTemperance(state: GameState, playerId: PlayerId) {
  const hangedmanTriggered = hasHangedmanPassive(state, playerId, "temperance");
  const rival = otherPlayer(playerId);
  const rivalHand = [...state.players[rival].hand];
  if (rivalHand.length === 0) {
    return {
      ...state,
      players: {
        ...state.players,
        [playerId]: consumeCard(state, playerId, "temperance"),
      },
    };
  }

  const sortedRivalHand = [...rivalHand].sort((left, right) => CARD_BASE_VALUES[right] - CARD_BASE_VALUES[left]);
  const removedCards = sortedRivalHand.slice(0, hangedmanTriggered ? 2 : 1);
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: consumeCard(state, playerId, "temperance"),
      [rival]: {
        ...state.players[rival],
        hand: removedCards.reduce((hand, card) => removeCardFromHand(hand, card), state.players[rival].hand),
      },
    },
  };
}

function simulateFate(state: GameState, playerId: PlayerId) {
  const fateBaseState = {
    ...state,
    players: {
      ...state.players,
      [playerId]: consumeCard(state, playerId, "fate"),
    },
  };

  return [...FATE_OUTCOMES]
    .map((outcome) => applyFateOutcomeForAi(fateBaseState, playerId, outcome))
    .sort((left, right) =>
      evaluateStateForAi(right, playerId, state.aiDifficulty) - evaluateStateForAi(left, playerId, state.aiDifficulty))[0]
    ?? fateBaseState;
}

function simulateHangedMan(state: GameState, playerId: PlayerId) {
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: consumeCard(state, playerId, "hangedman"),
    },
  };
}

function simulateStorm(
  state: GameState,
  playerId: PlayerId,
  target: Position,
  difficulty = state.aiDifficulty,
  randomValues = AI_PROFILES[difficulty].stormRandomSets[0] ?? [0.17, 0.41, 0.83],
) {
  const hangedmanTriggered = hasHangedmanPassive(state, playerId, "storm");
  const stormResult = applyStorm(state, target, createLoopingRandom(randomValues));
  if (!stormResult) {
    return null;
  }

  let nextState: GameState = {
    ...state,
    players: {
      ...stormResult.players,
      [playerId]: consumeCard({ ...state, players: stormResult.players }, playerId, "storm"),
    },
    obstacles: stormResult.obstacles,
  };

  if (hangedmanTriggered) {
    const secondTarget = chooseStormTarget(nextState, playerId, difficulty, evaluateStateForAi);
    const secondStorm = secondTarget
      ? applyStorm(nextState, secondTarget, createLoopingRandom(randomValues))
      : null;
    if (secondStorm) {
      nextState = {
        ...nextState,
        players: {
          ...secondStorm.players,
          [playerId]: {
            ...secondStorm.players[playerId],
          },
        },
        obstacles: secondStorm.obstacles,
      };
    }
  }

  return nextState;
}

export function evaluateStateForAi(state: GameState, playerId: PlayerId, difficulty: AiDifficulty) {
  const profile = AI_PROFILES[difficulty];
  const rival = otherPlayer(playerId);
  const result = resolveWinner(state, playerId);

  if (result) {
    return result.winner === playerId ? 100_000 : -100_000;
  }

  const ownMoves = getLegalMoves(state, playerId).length;
  const rivalMoves = getLegalMoves(state, rival).length;
  const ownPressure = countAdjacentObstacles(state, playerId);
  const rivalPressure = countAdjacentObstacles(state, rival);
  const ownCenterDistance = getCenterDistance(state, state.players[playerId].position);
  const rivalCenterDistance = getCenterDistance(state, state.players[rival].position);
  const moveEdge = ownMoves - rivalMoves;

  return (
    ownMoves * profile.weights.ownMoves
    - rivalMoves * profile.weights.rivalMoves
    - ownPressure * profile.weights.ownPressure
    + rivalPressure * profile.weights.rivalPressure
    + getHandValue(state, playerId) * profile.weights.handValue
    - ownCenterDistance * profile.weights.centerControl
    + rivalCenterDistance * profile.weights.centerControl
    + moveEdge * profile.weights.trapEdge
    + (state.players[rival].randomMovePending ? profile.weights.randomThreat : 0)
    - (state.players[playerId].randomMovePending ? profile.weights.randomThreat : 0)
    + (state.players[playerId].deathGraceActive ? 18 : 0)
    - (state.players[rival].deathGraceActive ? 18 : 0)
    - getHangedmanLiabilityScore(state, playerId)
    + getHangedmanLiabilityScore(state, rival) * 0.45
  );
}

function scoreStateWithReply(state: GameState, playerId: PlayerId, difficulty: AiDifficulty) {
  const profile = AI_PROFILES[difficulty];
  const immediateScore = evaluateStateForAi(state, playerId, difficulty);

  if (!profile.anticipateCounter || Math.abs(immediateScore) >= 100_000) {
    return immediateScore;
  }

  const replyState = estimateOpponentBestReplyState(state, playerId, difficulty);
  if (!replyState) {
    return immediateScore;
  }

  const replyScore = evaluateStateForAi(replyState, playerId, difficulty);
  return immediateScore * (1 - profile.replyWeight) + replyScore * profile.replyWeight;
}

function buildSkillCandidate(
  state: GameState,
  playerId: PlayerId,
  difficulty: AiDifficulty,
  plan: AiSkillPlan,
  simulatedState: GameState,
  scorer: StateScorer,
): AiSkillCandidate {
  const rival = otherPlayer(playerId);
  const candidateScore = scorer(simulatedState, playerId, difficulty);

  return {
    plan,
    nextState: simulatedState,
    score: candidateScore,
    delta: candidateScore - evaluateStateForAi(state, playerId, difficulty),
    ownMovesBefore: getLegalMoves(state, playerId).length,
    ownMovesAfter: getLegalMoves(simulatedState, playerId).length,
    rivalMovesBefore: getLegalMoves(state, rival).length,
    rivalMovesAfter: getLegalMoves(simulatedState, rival).length,
    createsWin: resolveWinner(simulatedState, playerId)?.winner === playerId,
  };
}

function chooseTowerTarget(
  state: GameState,
  playerId: PlayerId,
  difficulty: AiDifficulty,
  scorer: StateScorer = scoreStateWithReply,
) {
  const targets = getTowerMoves(state, playerId);
  if (targets.length === 0) {
    return null;
  }

  return [...targets].sort((left, right) =>
    scorer(simulateTower(state, playerId, right), playerId, difficulty)
    - scorer(simulateTower(state, playerId, left), playerId, difficulty))[0] ?? null;
}

function chooseObstacleTarget(
  state: GameState,
  playerId: PlayerId,
  difficulty: AiDifficulty,
  scorer: StateScorer = scoreStateWithReply,
) {
  const candidates = getRelevantObstacleCandidates(
    state,
    playerId,
    AI_PROFILES[difficulty].obstacleCandidateLimit,
  );
  const profile = AI_PROFILES[difficulty];
  const shortlisted = candidates
    .map((cell) => {
      const simulatedState = simulateObstacle(state, playerId, cell);
      return simulatedState
        ? {
            cell,
            simulatedState,
            immediateScore: evaluateStateForAi(simulatedState, playerId, difficulty),
          }
        : null;
    })
    .filter((item): item is { cell: Position; simulatedState: GameState; immediateScore: number } => Boolean(item))
    .sort((left, right) => right.immediateScore - left.immediateScore)
    .slice(0, profile.obstacleEvaluationLimit);

  return shortlisted
    .sort((left, right) => scorer(right.simulatedState, playerId, difficulty) - scorer(left.simulatedState, playerId, difficulty))[0]?.cell ?? null;
}

function chooseSwordEightPlacement(
  state: GameState,
  playerId: PlayerId,
  difficulty: AiDifficulty,
  scorer: StateScorer = scoreStateWithReply,
) {
  const placements = getRelevantSwordEightPlacements(
    state,
    playerId,
    AI_PROFILES[difficulty].swordsCandidateLimit,
  );
  if (placements.length === 0) {
    return null;
  }

  const profile = AI_PROFILES[difficulty];
  const shortlisted = placements
    .map(({ start, second }) => {
      const simulatedState = simulateSwordEight(state, playerId, start, second);
      return simulatedState
        ? {
            start,
            second,
            simulatedState,
            immediateScore: evaluateStateForAi(simulatedState, playerId, difficulty),
          }
        : null;
    })
    .filter((item): item is {
      start: Position;
      second: Position;
      simulatedState: GameState;
      immediateScore: number;
    } => Boolean(item))
    .sort((left, right) => right.immediateScore - left.immediateScore)
    .slice(0, profile.swordsEvaluationLimit);
  const bestPlacement = shortlisted
    .sort((left, right) => scorer(right.simulatedState, playerId, difficulty) - scorer(left.simulatedState, playerId, difficulty))[0];

  return bestPlacement ? { start: bestPlacement.start, second: bestPlacement.second } : null;
}

function chooseSwordEightSecondCellByScorer(
  state: GameState,
  playerId: PlayerId,
  difficulty: AiDifficulty,
  start: Position,
  scorer: StateScorer,
) {
  const secondCells = getSwordEightSecondCells(state, start);
  if (secondCells.length === 0) {
    return null;
  }

  return [...secondCells].sort((left, right) => {
    const rightState = simulateSwordEight(state, playerId, start, right);
    const leftState = simulateSwordEight(state, playerId, start, left);
    const rightScore = rightState ? scorer(rightState, playerId, difficulty) : -Infinity;
    const leftScore = leftState ? scorer(leftState, playerId, difficulty) : -Infinity;
    return rightScore - leftScore;
  })[0] ?? null;
}

export function chooseSwordEightSecondCell(
  state: GameState,
  playerId: PlayerId,
  difficulty: AiDifficulty,
  start: Position,
) {
  return chooseSwordEightSecondCellByScorer(state, playerId, difficulty, start, scoreStateWithReply);
}

function chooseStormTarget(
  state: GameState,
  playerId: PlayerId,
  difficulty: AiDifficulty,
  scorer: StateScorer = scoreStateWithReply,
) {
  const targets = getStormTargetCenters(state);
  if (targets.length === 0) {
    return null;
  }

  const profile = AI_PROFILES[difficulty];
  const rival = otherPlayer(playerId);
  const rivalPosition = state.players[rival].position;
  const ownPosition = state.players[playerId].position;
  const rivalNeighbors = getNeighbors(rivalPosition, state.boardSize);
  const shortlistedTargets = [...targets]
    .map((target) => {
      const ring = getStormRing(target, state.boardSize);
      const obstacleCount = ring.filter((position) => getOccupantAt(state, position) === "obstacle").length;
      const adjacentToRival = ring.filter((position) =>
        rivalNeighbors.some((neighbor) => neighbor.x === position.x && neighbor.y === position.y)).length;
      const priority =
        obstacleCount * 30
        + adjacentToRival * 16
        - getPositionDistance(target, rivalPosition) * 4
        - getPositionDistance(target, ownPosition) * 2;

      return { target, priority };
    })
    .sort((left, right) => right.priority - left.priority)
    .slice(0, profile.stormEvaluationLimit)
    .map((item) => item.target);

  return shortlistedTargets.sort((left, right) => {
    const leftScores = profile.stormRandomSets
      .map((randomSet) => simulateStorm(state, playerId, left, difficulty, randomSet))
      .filter((result): result is GameState => Boolean(result))
      .map((result) => scorer(result, playerId, difficulty));

    const rightScores = profile.stormRandomSets
      .map((randomSet) => simulateStorm(state, playerId, right, difficulty, randomSet))
      .filter((result): result is GameState => Boolean(result))
      .map((result) => scorer(result, playerId, difficulty));

    const leftScore = leftScores.reduce((sum, score) => sum + score, 0) / Math.max(leftScores.length, 1);
    const rightScore = rightScores.reduce((sum, score) => sum + score, 0) / Math.max(rightScores.length, 1);
    return rightScore - leftScore;
  })[0] ?? null;
}

function getBestSkillCandidate(state: GameState, difficulty: AiDifficulty, useLookahead = true) {
  const playerId = state.currentPlayer;
  const plans: AiSkillCandidate[] = [];
  const scorer = useLookahead ? scoreStateWithReply : evaluateStateForAi;

  if (canUseCard(state, playerId, "obstacle")) {
    const target = chooseObstacleTarget(state, playerId, difficulty, scorer);
    const simulatedState = target ? simulateObstacle(state, playerId, target) : null;
    if (target && simulatedState) {
      plans.push(buildSkillCandidate(state, playerId, difficulty, { card: "obstacle", target }, simulatedState, scorer));
    }
  }

  if (canUseCard(state, playerId, "swords8")) {
    const placement = chooseSwordEightPlacement(state, playerId, difficulty, scorer);
    const simulatedState = placement ? simulateSwordEight(state, playerId, placement.start, placement.second) : null;
    if (placement && simulatedState) {
      plans.push(buildSkillCandidate(state, playerId, difficulty, { card: "swords8", ...placement }, simulatedState, scorer));
    }
  }

  if (canUseCard(state, playerId, "fool")) {
    plans.push(buildSkillCandidate(state, playerId, difficulty, { card: "fool" }, simulateFool(state, playerId), scorer));
  }

  if (canUseCard(state, playerId, "temperance")) {
    plans.push(buildSkillCandidate(state, playerId, difficulty, { card: "temperance" }, simulateTemperance(state, playerId), scorer));
  }

  if (canUseCard(state, playerId, "storm")) {
    const target = chooseStormTarget(state, playerId, difficulty, scorer);
    const simulatedStormState = target ? simulateStorm(state, playerId, target, difficulty) : null;
    if (target && simulatedStormState) {
      plans.push(
        buildSkillCandidate(
          state,
          playerId,
          difficulty,
          { card: "storm", target },
          simulatedStormState,
          scorer,
        ),
      );
    }
  }

  if (canUseCard(state, playerId, "chalice")) {
    plans.push(buildSkillCandidate(state, playerId, difficulty, { card: "chalice" }, simulateChalice(state, playerId), scorer));
  }

  if (canUseCard(state, playerId, "fate")) {
    plans.push(buildSkillCandidate(state, playerId, difficulty, { card: "fate" }, simulateFate(state, playerId), scorer));
  }

  if (canUseCard(state, playerId, "hangedman") && shouldConsiderDroppingHangedman(state, playerId)) {
    plans.push(buildSkillCandidate(state, playerId, difficulty, { card: "hangedman" }, simulateHangedMan(state, playerId), scorer));
  }

  if (canUseCard(state, playerId, "tower")) {
    const target = chooseTowerTarget(state, playerId, difficulty, scorer);
    if (target) {
      plans.push(buildSkillCandidate(state, playerId, difficulty, { card: "tower", target }, simulateTower(state, playerId, target), scorer));
    }
  }

  return [...plans].sort((left, right) => right.score - left.score)[0] ?? null;
}

function isSkillWorthUsing(
  candidate: AiSkillCandidate | null,
  difficulty: AiDifficulty,
  fallbackScore: number,
) {
  if (!candidate) {
    return false;
  }

  const profile = AI_PROFILES[difficulty];
  const ownMoveGain = candidate.ownMovesAfter - candidate.ownMovesBefore;
  const rivalMoveReduction = candidate.rivalMovesBefore - candidate.rivalMovesAfter;

  if (candidate.createsWin) {
    return true;
  }

  if (candidate.ownMovesBefore <= profile.panicMoveThreshold && ownMoveGain > 0) {
    return true;
  }

  if (rivalMoveReduction >= profile.tacticalReductionThreshold && candidate.delta >= profile.skillDeltaThreshold / 2) {
    return true;
  }

  return candidate.delta >= profile.skillDeltaThreshold && candidate.score >= fallbackScore - profile.directSkillMargin;
}

function shouldSpendSkillCandidate(
  state: GameState,
  candidate: AiSkillCandidate | null,
  difficulty: AiDifficulty,
  handPressure: number,
  fallbackScore: number,
) {
  if (!candidate) {
    return false;
  }

  if (isSkillWorthUsing(candidate, difficulty, fallbackScore)) {
    return true;
  }

  const profile = AI_PROFILES[difficulty];
  const ownMoveGain = candidate.ownMovesAfter - candidate.ownMovesBefore;
  const rivalMoveReduction = candidate.rivalMovesBefore - candidate.rivalMovesAfter;
  const hasTacticalSwing = rivalMoveReduction > 0 || ownMoveGain > 0;

  if (handPressure >= profile.handPressureSkillThreshold && candidate.delta >= profile.handPressureSkillTolerance) {
    return true;
  }

  if (
    hasTacticalSwing
    && handPressure >= Math.max(2, profile.handPressureSkillThreshold - 1)
    && candidate.delta >= profile.opportunisticSkillTolerance
    && candidate.score >= fallbackScore - profile.directSkillCloseMargin
  ) {
    return true;
  }

  if (
    candidate.plan.card === "temperance"
    && hasHangedmanPassive(state, state.currentPlayer, "temperance")
    && state.players[otherPlayer(state.currentPlayer)].hand.length >= 2
  ) {
    return true;
  }

  if (candidate.plan.card === "hangedman" && shouldConsiderDroppingHangedman(state, state.currentPlayer)) {
    return candidate.delta >= -10 || handPressure >= profile.handPressureSkillThreshold;
  }

  if (difficulty === "hard" && handPressure >= 3 && hasTacticalSwing && candidate.delta >= -4) {
    return true;
  }

  if (difficulty === "hard" && handPressure >= 3 && candidate.delta >= -8) {
    return true;
  }

  return difficulty === "hard"
    && rivalMoveReduction >= profile.tacticalReductionThreshold
    && candidate.score >= fallbackScore - profile.directSkillCloseMargin;
}

function shouldUseSkillForTempo(
  candidate: AiSkillCandidate | null,
  difficulty: AiDifficulty,
  handPressure: number,
  fallbackScore: number,
) {
  if (!candidate) {
    return false;
  }

  if (difficulty === "easy") {
    return false;
  }

  const ownMoveGain = candidate.ownMovesAfter - candidate.ownMovesBefore;
  const rivalMoveReduction = candidate.rivalMovesBefore - candidate.rivalMovesAfter;
  const hasTacticalSwing = rivalMoveReduction > 0 || ownMoveGain > 0;
  const scoreSlack = difficulty === "hard" ? 9 : 6;
  const deltaSlack = difficulty === "hard" ? -6 : -3;

  if (candidate.createsWin) {
    return true;
  }

  if (
    handPressure >= 1
    && AGGRESSIVE_SKILL_CARDS.has(candidate.plan.card)
    && rivalMoveReduction > 0
    && candidate.delta >= (difficulty === "hard" ? -22 : -16)
  ) {
    return true;
  }

  if (handPressure >= 3 && candidate.score >= fallbackScore - scoreSlack && candidate.delta >= deltaSlack) {
    return true;
  }

  if (hasTacticalSwing && handPressure >= 1 && candidate.score >= fallbackScore - (scoreSlack + 1) && candidate.delta >= deltaSlack - 2) {
    return true;
  }

  if (hasTacticalSwing && handPressure >= 2 && candidate.score >= fallbackScore - scoreSlack) {
    return true;
  }

  return rivalMoveReduction >= 2 && candidate.score >= fallbackScore - (scoreSlack + 2);
}

function shouldUseSkillAggressively(
  candidate: AiSkillCandidate | null,
  difficulty: AiDifficulty,
  handPressure: number,
) {
  if (!candidate || difficulty === "easy") {
    return false;
  }

  if (handPressure < 1) {
    return false;
  }

  const ownMoveGain = candidate.ownMovesAfter - candidate.ownMovesBefore;
  const rivalMoveReduction = candidate.rivalMovesBefore - candidate.rivalMovesAfter;
  const isAggressiveCard = AGGRESSIVE_SKILL_CARDS.has(candidate.plan.card);

  if (!isAggressiveCard) {
    return false;
  }

  if (candidate.createsWin) {
    return true;
  }

  if (rivalMoveReduction > 0) {
    return true;
  }

  if (ownMoveGain > 0) {
    return candidate.delta >= (difficulty === "hard" ? -10 : -6);
  }

  return handPressure >= 3 && candidate.delta >= (difficulty === "hard" ? -12 : -6);
}

function getBestMoveCandidate(state: GameState, difficulty: AiDifficulty, useLookahead = true): AiMoveCandidate | null {
  const playerId = state.currentPlayer;
  const legalMoves = getLegalMoves(state, playerId);
  if (legalMoves.length === 0) {
    return null;
  }

  const profile = AI_PROFILES[difficulty];
  const scorer = useLookahead ? scoreStateWithReply : evaluateStateForAi;
  const shortlistedMoves = [...legalMoves]
    .map((target) => {
      const movedState = simulateMove(state, playerId, target);
      return {
        target,
        movedState,
        immediateScore: evaluateStateForAi(movedState, playerId, difficulty),
      };
    })
    .sort((left, right) => right.immediateScore - left.immediateScore)
    .slice(0, profile.moveEvaluationLimit);

  return shortlistedMoves
    .map(({ target, movedState }) => {
      const baseScore = scorer(movedState, playerId, difficulty);
      let projectedScore = baseScore;
      let projectedState = movedState;

      if (profile.considerPostMoveSkill) {
        const postMoveSkill = getBestSkillCandidate(movedState, difficulty, useLookahead);
        if (postMoveSkill && isSkillWorthUsing(postMoveSkill, difficulty, baseScore)) {
          const weightedScore = baseScore + (postMoveSkill.score - baseScore) * profile.postMoveSkillWeight;
          if (weightedScore > projectedScore) {
            projectedScore = weightedScore;
            projectedState = postMoveSkill.nextState;
          }
        }
      }

      return { target, baseScore, projectedScore, nextState: movedState, projectedState };
    })
    .sort((left, right) => right.projectedScore - left.projectedScore || right.baseScore - left.baseScore)[0] ?? null;
}

function getBestImmediateTurnCandidate(state: GameState, playerId: PlayerId, difficulty: AiDifficulty) {
  const replyState = createNextTurnState(state, playerId);
  const bestMove = getBestMoveCandidate(replyState, difficulty, false);
  const bestSkill = getBestSkillCandidate(replyState, difficulty, false);
  const handPressure = replyState.players[playerId].hand.length;

  const moveOption = bestMove
    ? {
        score: bestMove.projectedScore,
        nextState: bestMove.projectedState,
      }
    : null;

  const skillOption = bestSkill && shouldSpendSkillCandidate(replyState, bestSkill, difficulty, handPressure, moveOption?.score ?? -Infinity)
    ? {
        score: bestSkill.score,
        nextState: bestSkill.nextState,
      }
    : null;

  if (!moveOption) {
    return skillOption;
  }

  if (!skillOption) {
    return moveOption;
  }

  return skillOption.score > moveOption.score ? skillOption : moveOption;
}

function estimateOpponentBestReplyState(state: GameState, playerId: PlayerId, difficulty: AiDifficulty) {
  const rival = otherPlayer(playerId);
  const result = resolveWinner(state, playerId);

  if (result || state.winner) {
    return null;
  }

  return getBestImmediateTurnCandidate(state, rival, difficulty)?.nextState ?? null;
}

export function chooseAiMovePhaseAction(state: GameState): AiMovePhaseAction {
  const difficulty = state.aiDifficulty;
  const bestMove = getBestMoveCandidate(state, difficulty);
  const directSkill = getBestSkillCandidate(state, difficulty);
  const fallbackScore = bestMove?.projectedScore ?? -Infinity;
  const handPressure = state.players[state.currentPlayer].hand.length;

  if (
    canUseCard(state, state.currentPlayer, "hangedman")
    && shouldForceHangedmanRelease(state, state.currentPlayer)
    && !directSkill?.createsWin
  ) {
    return { type: "direct-skill", plan: { card: "hangedman" } };
  }

  if (directSkill?.createsWin) {
    return { type: "direct-skill", plan: directSkill.plan };
  }

  if (
    directSkill
    && shouldSpendSkillCandidate(state, directSkill, difficulty, handPressure, fallbackScore)
    && directSkill.score >= fallbackScore - AI_PROFILES[difficulty].directSkillCloseMargin
  ) {
    return { type: "direct-skill", plan: directSkill.plan };
  }

  if (directSkill && shouldUseSkillForTempo(directSkill, difficulty, handPressure, fallbackScore)) {
    return { type: "direct-skill", plan: directSkill.plan };
  }

  if (bestMove) {
    return { type: "move", target: bestMove.target };
  }

  if (directSkill) {
    return { type: "direct-skill", plan: directSkill.plan };
  }

  return { type: "pass" };
}

export function chooseAiSkillPlan(state: GameState) {
  if (
    canUseCard(state, state.currentPlayer, "hangedman")
    && shouldForceHangedmanRelease(state, state.currentPlayer)
  ) {
    return { card: "hangedman" } as const;
  }

  const baselineScore = evaluateStateForAi(state, state.currentPlayer, state.aiDifficulty);
  const candidate = getBestSkillCandidate(state, state.aiDifficulty);
  const handPressure = state.players[state.currentPlayer].hand.length;

  if (!candidate) {
    return null;
  }

  if (state.repeatCard) {
    return candidate.plan;
  }

  if (shouldSpendSkillCandidate(state, candidate, state.aiDifficulty, handPressure, baselineScore)) {
    return candidate.plan;
  }

  if (shouldUseSkillForTempo(candidate, state.aiDifficulty, handPressure, baselineScore)) {
    return candidate.plan;
  }

  if (shouldUseSkillAggressively(candidate, state.aiDifficulty, handPressure)) {
    return candidate.plan;
  }

  return null;
}

export function chooseBestMove(state: GameState, playerId: PlayerId, difficulty: AiDifficulty) {
  const legalMoves = getLegalMoves(state, playerId);
  if (legalMoves.length === 0) {
    return null;
  }

  return [...legalMoves].sort((left, right) => {
    const rightState = simulateMove(state, playerId, right);
    const leftState = simulateMove(state, playerId, left);
    return scoreStateWithReply(rightState, playerId, difficulty) - scoreStateWithReply(leftState, playerId, difficulty);
  })[0] ?? null;
}

export function chooseAiDiscardCard(state: GameState) {
  const playerId = state.currentPlayer;
  const hand = state.players[playerId].hand;

  if (hand.length === 0) {
    return null;
  }

  const scoredHand = hand.map((card, index) => {
    let utility = CARD_BASE_VALUES[card];
    const hasHangedman = hand.includes("hangedman");
    const hangedmanOnline = hasHangedman && hand.length > 3;

    if (!canUseCard(state, playerId, card)) {
      utility -= 6;
    }

    const ownMoves = getLegalMoves(state, playerId).length;
    if (ownMoves <= AI_PROFILES[state.aiDifficulty].panicMoveThreshold && (card === "tower" || card === "chalice")) {
      utility += 12;
    }

    if (card === "hangedman") {
      utility += hangedmanOnline ? 12 : -4;
      utility -= getHangedmanLiabilityScore(state, playerId);
    }

    if (hangedmanOnline && card !== "hangedman" && card !== "fate") {
      utility += 4;
    }

    if (card === "fate") {
      const nearbyObstacles = getStormRing(state.players[playerId].position, state.boardSize)
        .filter((position) => getOccupantAt(state, position) === "obstacle").length;
      utility += nearbyObstacles >= 2 ? 4 : 0;
    }

    return { card, index, utility };
  });

  return [...scoredHand].sort((left, right) => left.utility - right.utility || left.index - right.index)[0]?.card ?? null;
}

export function chooseAiFateChoice(state: GameState) {
  if (state.phase !== "fate" || !state.fateState) {
    return null;
  }

  const playerId = state.currentPlayer;
  const availableChoices = state.fateState.choices
    .map((choice, index) => ({ choice, index }))
    .filter(({ index }) => !state.fateState?.revealedIndices.includes(index));

  if (availableChoices.length === 0) {
    return null;
  }

  return availableChoices
    .sort((left, right) => {
      const rightState = applyFateOutcomeForAi(state, playerId, right.choice);
      const leftState = applyFateOutcomeForAi(state, playerId, left.choice);
      return evaluateStateForAi(rightState, playerId, state.aiDifficulty)
        - evaluateStateForAi(leftState, playerId, state.aiDifficulty);
    })[0]?.index ?? null;
}
