import { create } from "zustand";
import type { CardType, GameMode, GameState, PlayerId, Position } from "@/types/game";
import {
  applyStorm,
  canUseCard,
  drawRandomCard,
  getSwordEightSecondCells,
  placeObstacle,
  placeSwordEightObstacles,
  removeCardFromHand,
  replaceCardInHand,
  swapPlayers,
} from "@/utils/cards";
import {
  BOARD_SIZE,
  CARD_LABELS,
  MAX_HAND_SIZE,
  SPAWN_POINTS,
  TURN_DURATION_MS,
  getPlayerName,
  otherPlayer,
} from "@/utils/board";
import { getCardTargetMode, getLegalMoves, isLegalMove, resolveWinner } from "@/utils/judge";
import { getTowerMoves } from "@/utils/judge";

interface GameActions {
  setGameMode: (mode: GameMode) => void;
  resetGame: () => void;
  moveCurrentPlayer: (target: Position) => void;
  selectCard: (card: CardType) => void;
  cancelSelectedCard: () => void;
  skipSkillPhase: () => void;
  clickCell: (target: Position) => void;
  expireTurn: () => void;
}

type GameStore = GameState & GameActions;

function createInitialState(gameMode: GameMode = "pvp"): GameState {
  const now = Date.now();

  return {
    boardSize: BOARD_SIZE,
    gameMode,
    currentPlayer: "player1",
    phase: "move",
    players: {
      player1: {
        id: "player1",
        name: getPlayerName("player1", gameMode),
        position: SPAWN_POINTS.player1,
        hand: [],
        moveCount: 0,
        usedCardCount: 0,
        lockedTurns: 0,
        randomMovePending: false,
      },
      player2: {
        id: "player2",
        name: getPlayerName("player2", gameMode),
        position: SPAWN_POINTS.player2,
        hand: [],
        moveCount: 0,
        usedCardCount: 0,
        lockedTurns: 0,
        randomMovePending: false,
      },
    },
    obstacles: [],
    selectedCard: null,
    selectedCardAnchor: null,
    pendingDrawCard: null,
    winner: null,
    winReason: null,
    startedAt: now,
    endedAt: null,
    turnEndsAt: now + TURN_DURATION_MS,
    message: "占星师先手。本回合可选择走一步后出牌、走一步不出牌，或直接打出一张塔罗牌。",
  };
}

function advanceToNextTurn(state: GameState) {
  const nextPlayer = otherPlayer(state.currentPlayer);
  const nextState: GameState = {
    ...state,
    currentPlayer: nextPlayer,
    phase: "move",
    selectedCard: null,
    selectedCardAnchor: null,
    pendingDrawCard: null,
    turnEndsAt: Date.now() + TURN_DURATION_MS,
    message: `${state.players[nextPlayer].name}的回合开始。你可以直接打出 1 张塔罗牌，或先移动 1 步再决定是否出牌。`,
  };

  const result = resolveWinner(nextState, state.currentPlayer);
  if (result) {
    return {
      ...nextState,
      phase: "gameover" as const,
      winner: result.winner,
      winReason: result.reason,
      endedAt: Date.now(),
      message: `${nextState.players[result.winner].name}获胜：${result.reason}`,
    };
  }

  return nextState;
}

function removeCardAndCountUse(state: GameState, playerId: PlayerId, card: CardType) {
  return {
    ...state.players[playerId],
    hand: removeCardFromHand(state.players[playerId].hand, card),
    usedCardCount: state.players[playerId].usedCardCount + 1,
  };
}

function finalizeAfterCardUse(state: GameState, playerId: PlayerId) {
  const result = resolveWinner(state, playerId);

  if (result) {
    return {
      ...state,
      phase: "gameover" as const,
      winner: result.winner,
      winReason: result.reason,
      endedAt: Date.now(),
      message: `${state.players[result.winner].name}获胜：${result.reason}`,
    };
  }

  return advanceToNextTurn(state);
}

function pickRandomLegalMove(state: GameState, playerId: PlayerId) {
  const legalMoves = getLegalMoves(state, playerId);
  if (legalMoves.length === 0) {
    return null;
  }

  const index = Math.floor(Math.random() * legalMoves.length);
  return legalMoves[index] ?? null;
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...createInitialState(),

  setGameMode: (mode) => {
    set(createInitialState(mode));
  },

  resetGame: () => {
    set(createInitialState(get().gameMode));
  },

  moveCurrentPlayer: (target) => {
    const state = get();
    const playerId = state.currentPlayer;

    if (state.phase !== "move" || state.winner) {
      return;
    }

    if (!isLegalMove(state, playerId, target)) {
      set({ message: "目标格不可进入，请选择当前紧邻的 6 个六边形空白格之一。" });
      return;
    }

    const actualTarget =
      state.players[playerId].randomMovePending
        ? pickRandomLegalMove(state, playerId)
        : target;

    if (!actualTarget) {
      set({ message: "愚人效果触发，但当前没有任何合法移动方向。" });
      return;
    }

    const card = drawRandomCard();
    const currentPlayer = state.players[playerId];
    const nextPlayers = {
      ...state.players,
      [playerId]: {
        ...currentPlayer,
        position: actualTarget,
        moveCount: currentPlayer.moveCount + 1,
        hand: currentPlayer.hand.length >= MAX_HAND_SIZE ? currentPlayer.hand : [...currentPlayer.hand, card],
        randomMovePending: false,
      },
    };
    const nextState: GameState = {
      ...state,
      players: nextPlayers,
      phase: currentPlayer.hand.length >= MAX_HAND_SIZE ? "discard" : "skill",
      selectedCard: null,
      selectedCardAnchor: null,
      pendingDrawCard: currentPlayer.hand.length >= MAX_HAND_SIZE ? card : null,
      message:
        currentPlayer.hand.length >= MAX_HAND_SIZE
          ? `${state.players[playerId].name}${currentPlayer.randomMovePending ? "在愚人效果下被随机移动，并" : ""}抽到${CARD_LABELS[card]}牌。手牌已满，请弃掉 1 张当前手牌与新牌交换。`
          : `${state.players[playerId].name}${currentPlayer.randomMovePending ? "在愚人效果下被随机移动，并" : "完成移动并"}抽到${CARD_LABELS[card]}牌。你可以继续出牌，也可以直接结束回合。`,
    };
    const result = resolveWinner(nextState, playerId);

    if (result) {
      set({
        ...nextState,
        phase: "gameover",
        winner: result.winner,
        winReason: result.reason,
        endedAt: Date.now(),
        message: `${nextState.players[result.winner].name}获胜：${result.reason}`,
      });
      return;
    }

    set(nextState);
  },

  selectCard: (card) => {
    const state = get();
    const playerId = state.currentPlayer;

    if (state.winner) {
      return;
    }

    if (state.phase === "discard") {
      const pendingCard = state.pendingDrawCard;
      if (!pendingCard || !state.players[playerId].hand.includes(card)) {
        return;
      }

      set({
        players: {
          ...state.players,
          [playerId]: {
            ...state.players[playerId],
            hand: replaceCardInHand(state.players[playerId].hand, card, pendingCard),
          },
        },
        phase: "skill",
        pendingDrawCard: null,
        selectedCard: null,
        selectedCardAnchor: null,
        message: `已弃掉${CARD_LABELS[card]}牌，换入${CARD_LABELS[pendingCard]}牌。你现在可以选择出牌或结束回合。`,
      });
      return;
    }

    if (state.phase !== "move" && state.phase !== "skill") {
      return;
    }

    if (!canUseCard(state, playerId, card)) {
      set({ message: `${CARD_LABELS[card]}牌当前没有合法目标。` });
      return;
    }

    if (getCardTargetMode(card) === "instant") {
      if (card === "fool") {
        const rival = otherPlayer(playerId);
        const nextState: GameState = {
          ...state,
          players: {
            ...state.players,
            [playerId]: removeCardAndCountUse(state, playerId, card),
            [rival]: {
              ...state.players[rival],
              randomMovePending: true,
            },
          },
          selectedCard: null,
          selectedCardAnchor: null,
          pendingDrawCard: null,
          message: `${state.players[playerId].name}使用了${CARD_LABELS.fool}牌，${state.players[rival].name}的下一次移动将随机失控。`,
        };
        set(finalizeAfterCardUse(nextState, playerId));
        return;
      }

      const swappedPlayers = swapPlayers(state);
      const nextState: GameState = {
        ...state,
        players: {
          ...state.players,
          ...swappedPlayers,
          [playerId]: removeCardAndCountUse({ ...state, players: { ...state.players, ...swappedPlayers } }, playerId, card),
        },
        selectedCard: null,
        selectedCardAnchor: null,
        pendingDrawCard: null,
        message: `${state.players[playerId].name}使用了${CARD_LABELS.chalice}牌，双方位置已交换。`,
      };
      set(finalizeAfterCardUse(nextState, playerId));
      return;
    }

    set({
      selectedCard: state.selectedCard === card ? null : card,
      selectedCardAnchor: null,
      message:
        card === "obstacle"
          ? `请选择一个空白格，打出${CARD_LABELS.obstacle}牌并放置永久障碍物。`
          : card === "tower"
            ? `请选择${CARD_LABELS.tower}牌的落点。系统会沿该方向找到路径上的第一个障碍物，并落到它后方的一格。`
            : card === "swords8"
              ? `请选择${CARD_LABELS.swords8}的第 1 个方格，再选与其同线相邻的第 2 个方格，系统会自动补齐第 3 个障碍。`
            : `请选择一个目标格，系统将通过${CARD_LABELS.storm}牌打乱其周围 6 格内的障碍物。`,
    });
  },

  cancelSelectedCard: () => {
    const state = get();
    if (state.phase !== "move" && state.phase !== "skill") {
      return;
    }

    set({ selectedCard: null, selectedCardAnchor: null, message: "已取消当前卡牌选择。" });
  },

  skipSkillPhase: () => {
    const state = get();
    if (state.phase !== "skill" || state.winner) {
      return;
    }

    set(advanceToNextTurn({ ...state, message: "你选择不出牌，回合已结束。" }));
  },

  clickCell: (target) => {
    const state = get();
    if (state.winner) {
      return;
    }

    if (state.selectedCard && (state.phase === "move" || state.phase === "skill")) {
      const playerId = state.currentPlayer;
      if (state.selectedCard === "obstacle") {
        const nextObstacles = placeObstacle(state, target);
        if (!nextObstacles) {
          set({ message: "障碍物只能放在地图内的空白格。" });
          return;
        }

        const nextState: GameState = {
          ...state,
          obstacles: nextObstacles,
          selectedCard: null,
          selectedCardAnchor: null,
          pendingDrawCard: null,
          players: {
            ...state.players,
            [playerId]: removeCardAndCountUse(state, playerId, "obstacle"),
          },
          message: `${state.players[playerId].name}打出了${CARD_LABELS.obstacle}牌，放置了一个永久障碍物。`,
        };
        set(finalizeAfterCardUse(nextState, playerId));
        return;
      }

      if (state.selectedCard === "storm") {
        const stormResult = applyStorm(state, target);
        if (!stormResult) {
          set({ message: `该目标周围没有可打乱的障碍物，或本次${CARD_LABELS.storm}牌重排失败。` });
          return;
        }

        const nextState: GameState = {
          ...state,
          selectedCard: null,
          selectedCardAnchor: null,
          pendingDrawCard: null,
          players: {
            ...stormResult.players,
            [playerId]: removeCardAndCountUse({ ...state, players: stormResult.players }, playerId, "storm"),
          },
          obstacles: stormResult.obstacles,
          message: `${state.players[playerId].name}打出了${CARD_LABELS.storm}牌，周围 6 格内的障碍物已被重新洗牌。`,
        };
        set(finalizeAfterCardUse(nextState, playerId));
        return;
      }
      if (state.selectedCard === "tower") {
        const legalTowerMoves = getTowerMoves(state, playerId);
        const isAllowed = legalTowerMoves.some((move) => move.x === target.x && move.y === target.y);

        if (!isAllowed) {
          set({ message: `${CARD_LABELS.tower}牌只能跳到某个方向上第一个障碍物后方的空白格。` });
          return;
        }

        const nextState: GameState = {
          ...state,
          selectedCard: null,
          selectedCardAnchor: null,
          pendingDrawCard: null,
          players: {
            ...state.players,
            [playerId]: {
              ...removeCardAndCountUse(state, playerId, "tower"),
              position: target,
            },
          },
          message: `${state.players[playerId].name}使用了${CARD_LABELS.tower}牌，跨越路径上的障碍并完成跳跃。`,
        };
        set(finalizeAfterCardUse(nextState, playerId));
        return;
      }
      if (state.selectedCard === "swords8") {
        if (!state.selectedCardAnchor) {
          const secondCells = getSwordEightSecondCells(state, target);

          if (secondCells.length === 0) {
            set({ message: `该格不能作为${CARD_LABELS.swords8}的起点，请选择能形成连续直线三格的空白格。` });
            return;
          }

          set({
            selectedCardAnchor: target,
            message: `已选中${CARD_LABELS.swords8}的第 1 个方格。请选择与其同线相邻的第 2 个方格，系统将自动补齐第 3 个障碍。`,
          });
          return;
        }

        const nextObstacles = placeSwordEightObstacles(state, state.selectedCardAnchor, target);
        if (!nextObstacles) {
          set({ message: `${CARD_LABELS.swords8}的第 2 个方格必须与起点相邻且同线，同时第 3 格也必须为空白。` });
          return;
        }

        const nextState: GameState = {
          ...state,
          obstacles: nextObstacles,
          selectedCard: null,
          selectedCardAnchor: null,
          pendingDrawCard: null,
          players: {
            ...state.players,
            [playerId]: removeCardAndCountUse(state, playerId, "swords8"),
          },
          message: `${state.players[playerId].name}使用了${CARD_LABELS.swords8}，一次性放置了 3 个连续障碍物。`,
        };
        set(finalizeAfterCardUse(nextState, playerId));
      }
      return;
    }

    if (state.phase === "move") {
      get().moveCurrentPlayer(target);
    }
  },

  expireTurn: () => {
    const state = get();
    if (state.winner || Date.now() < state.turnEndsAt) {
      return;
    }

    if (state.phase === "move") {
      set(advanceToNextTurn({ ...state, message: "移动超时，本回合自动结束。" }));
      return;
    }

    if (state.phase === "skill") {
      set(advanceToNextTurn({ ...state, message: "出牌超时，本回合自动结束。" }));
      return;
    }

    if (state.phase === "discard") {
      const playerId = state.currentPlayer;
      const pendingCard = state.pendingDrawCard;
      const firstCard = state.players[playerId].hand[0];

      if (!pendingCard || !firstCard) {
        set(advanceToNextTurn({ ...state, message: "换牌超时，本回合自动结束。" }));
        return;
      }

      const nextState: GameState = {
        ...state,
        phase: "skill",
        pendingDrawCard: null,
        players: {
          ...state.players,
          [playerId]: {
            ...state.players[playerId],
            hand: replaceCardInHand(state.players[playerId].hand, firstCard, pendingCard),
          },
        },
        message: `换牌超时，系统已自动弃掉第一张手牌并换入${CARD_LABELS[pendingCard]}牌。`,
      };
      set(advanceToNextTurn(nextState));
    }
  },
}));
