import { create } from "zustand";
import type { AiDifficulty, BattleLogEntry, CardType, FateOutcome, GameMode, GameState, PlayerId, Position } from "@/types/game";
import {
  applyStorm,
  canUseCard,
  clearAdjacentObstacles,
  drawRandomCard,
  getRandomFateChoices,
  getRandomHandRemovals,
  getSwordEightSecondCells,
  pickRandomFoolObstacleTarget,
  pickRandomFoolSwordEightPlacement,
  placeObstacle,
  placeSwordEightObstacles,
  removeCardFromHand,
  replaceCardInHand,
  swapPlayers,
  surroundWithObstacles,
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
import { getCardTargetMode, getLegalMoves, getTowerMoveFromDirectionSelection, isLegalMove, resolveWinner } from "@/utils/judge";

interface GameActions {
  setGameMode: (mode: GameMode) => void;
  setAiDifficulty: (difficulty: AiDifficulty) => void;
  resetGame: () => void;
  hydrateGameState: (state: GameState) => void;
  endCurrentTurn: () => void;
  moveCurrentPlayer: (target: Position) => void;
  selectCard: (card: CardType) => void;
  cancelSelectedCard: () => void;
  skipSkillPhase: () => void;
  clickCell: (target: Position) => void;
  selectFateChoice: (index: number) => void;
  expireTurn: () => void;
}

type GameStore = GameState & GameActions;
const MAX_BATTLE_LOGS = 18;
let battleLogSequence = 0;

export function createGameState(
  gameMode: GameMode = "pvp",
  aiDifficulty: AiDifficulty = "medium",
  playerNames?: Partial<Record<PlayerId, string>>,
): GameState {
  const now = Date.now();

  return {
    boardSize: BOARD_SIZE,
    gameMode,
    aiDifficulty,
    currentPlayer: "player1",
    phase: "move",
    players: {
      player1: {
        id: "player1",
        name: playerNames?.player1 ?? getPlayerName("player1", gameMode),
        position: SPAWN_POINTS.player1,
        hand: [],
        moveCount: 0,
        usedCardCount: 0,
        lockedTurns: 0,
        randomMovePending: false,
        randomMovePendingTurns: 0,
        deathGraceActive: false,
      },
      player2: {
        id: "player2",
        name: playerNames?.player2 ?? getPlayerName("player2", gameMode),
        position: SPAWN_POINTS.player2,
        hand: [],
        moveCount: 0,
        usedCardCount: 0,
        lockedTurns: 0,
        randomMovePending: false,
        randomMovePendingTurns: 0,
        deathGraceActive: false,
      },
    },
    obstacles: [],
    selectedCard: null,
    selectedCardAnchor: null,
    repeatCard: null,
    pendingDrawCard: null,
    fateState: null,
    pendingFateTriggers: [],
    battleLog: [],
    winner: null,
    winReason: null,
    startedAt: now,
    endedAt: null,
    turnEndsAt: now + TURN_DURATION_MS,
    message: "占星师先手。本回合可选择走一步后出牌、走一步不出牌，或直接打出一张塔罗牌。",
  };
}

export function getGameStateSnapshot(state: GameState): GameState {
  return JSON.parse(JSON.stringify(state)) as GameState;
}

function advanceToNextPlayerTurn(state: GameState) {
  const clearedCurrentPlayer = {
    ...state.players[state.currentPlayer],
    deathGraceActive: false,
  };
  const nextPlayer = otherPlayer(state.currentPlayer);
  const nextState: GameState = {
    ...state,
    currentPlayer: nextPlayer,
    phase: "move",
    selectedCard: null,
    selectedCardAnchor: null,
    repeatCard: null,
    pendingDrawCard: null,
    fateState: null,
    players: {
      ...state.players,
      [state.currentPlayer]: clearedCurrentPlayer,
    },
    turnEndsAt: Date.now() + TURN_DURATION_MS,
    message: `${state.players[nextPlayer].name}的回合开始。你可以直接打出 1 张塔罗牌，或先移动 1 步再决定是否出牌。`,
  };

  return nextState;
}

function createBattleLogEntry(playerId: PlayerId, text: string, type: BattleLogEntry["type"]): BattleLogEntry {
  battleLogSequence += 1;
  return {
    id: `battle-log-${battleLogSequence}`,
    playerId,
    text,
    type,
  };
}

function syncBattleLogSequence(state: GameState) {
  const maxSequence = state.battleLog.reduce((currentMax, entry) => {
    const parsed = Number(entry.id.replace("battle-log-", ""));
    return Number.isFinite(parsed) ? Math.max(currentMax, parsed) : currentMax;
  }, 0);
  battleLogSequence = Math.max(battleLogSequence, maxSequence);
}

function withBattleLog(state: GameState, ...entries: BattleLogEntry[]) {
  if (entries.length === 0) {
    return state;
  }

  return {
    ...state,
    battleLog: [...state.battleLog, ...entries].slice(-MAX_BATTLE_LOGS),
  };
}

function withCardPlayLog(state: GameState, playerId: PlayerId, card: CardType, detail?: string) {
  const label = `${state.players[playerId].name}打出了${CARD_LABELS[card]}牌`;
  return withBattleLog(
    state,
    createBattleLogEntry(playerId, detail ? `${label}，${detail}` : `${label}。`, "play"),
  );
}

function prepareManualRepeat(state: GameState, playerId: PlayerId, card: CardType, message: string) {
  return {
    ...state,
    phase: "skill" as const,
    selectedCard: card,
    selectedCardAnchor: null,
    pendingDrawCard: null,
    repeatCard: card,
    message,
  };
}

function clearRepeatState(state: GameState) {
  return {
    ...state,
    repeatCard: null,
    selectedCard: null,
    selectedCardAnchor: null,
  };
}

function consumeSkillUse(state: GameState, playerId: PlayerId, card: CardType) {
  if (state.repeatCard === card) {
    return state.players[playerId];
  }

  return removeCardAndCountUse(state, playerId, card);
}

function loseForUnresolvedRepeat(state: GameState, reason: string) {
  const loser = state.currentPlayer;
  const winner = otherPlayer(loser);
  const repeatLabel = state.repeatCard ? CARD_LABELS[state.repeatCard] : "追加释放";
  const nextState = withBattleLog(
    {
      ...state,
      phase: "gameover" as const,
      winner,
      winReason: reason,
      endedAt: Date.now(),
      selectedCard: null,
      selectedCardAnchor: null,
      repeatCard: null,
      pendingDrawCard: null,
      message: `${state.players[winner].name}获胜：${reason}`,
    },
    createBattleLogEntry(
      loser,
      `${state.players[loser].name}未完成倒吊人触发的${repeatLabel}第二次释放，直接判负。`,
      "system",
    ),
  );

  return nextState;
}

function finishCurrentTurn(state: GameState) {
  const pendingTrigger = state.pendingFateTriggers.find(
    (trigger) => trigger.recipient === state.currentPlayer && trigger.triggerAfterTurnOf === state.currentPlayer,
  );

  if (pendingTrigger) {
    return withBattleLog({
      ...state,
      phase: "fate" as const,
      selectedCard: null,
      selectedCardAnchor: null,
      repeatCard: null,
      pendingDrawCard: null,
      fateState: {
        caster: pendingTrigger.caster,
        choices: getRandomFateChoices(),
        revealedIndices: [],
        pendingPlayer: pendingTrigger.recipient,
        revealedBy: {},
      },
      pendingFateTriggers: state.pendingFateTriggers.filter((trigger) => trigger !== pendingTrigger),
      turnEndsAt: Date.now() + TURN_DURATION_MS,
      message: `${state.players[state.currentPlayer].name}的回合已结束，现在触发一次全新的${CARD_LABELS.fate}抽牌。`,
    }, createBattleLogEntry(
      pendingTrigger.recipient,
      `${state.players[pendingTrigger.recipient].name}在回合结束后触发了1次全新的${CARD_LABELS.fate}抽牌。`,
      "system",
    ));
  }

  return advanceToNextPlayerTurn(state);
}

function removeCardAndCountUse(state: GameState, playerId: PlayerId, card: CardType) {
  return {
    ...state.players[playerId],
    hand: removeCardFromHand(state.players[playerId].hand, card),
    usedCardCount: state.players[playerId].usedCardCount + 1,
  };
}

function consumeRandomMovePending(player: GameState["players"][PlayerId]) {
  const turns = Math.max(0, player.randomMovePendingTurns - 1);
  return {
    ...player,
    randomMovePendingTurns: turns,
    randomMovePending: turns > 0,
  };
}

function hasHangedmanPassive(state: GameState, playerId: PlayerId, card: CardType) {
  return card !== "hangedman"
    && card !== "fate"
    && state.players[playerId].hand.includes("hangedman")
    && state.players[playerId].hand.length > 3;
}


function applyFateOutcome(state: GameState, playerId: PlayerId, outcome: FateOutcome) {
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

  return finishCurrentTurn(state);
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
  ...createGameState(),

  setGameMode: (mode) => {
    set(createGameState(mode, get().aiDifficulty));
  },

  setAiDifficulty: (difficulty) => {
    set(createGameState(get().gameMode, difficulty));
  },

  resetGame: () => {
    const state = get();
    set(createGameState(state.gameMode, state.aiDifficulty));
  },

  hydrateGameState: (state) => {
    syncBattleLogSequence(state);
    set(getGameStateSnapshot(state));
  },

  endCurrentTurn: () => {
    const state = get();
    if ((state.phase !== "move" && state.phase !== "skill") || state.winner) {
      return;
    }

    if (state.repeatCard) {
      set(loseForUnresolvedRepeat(
        state,
        `未完成倒吊人触发的${CARD_LABELS[state.repeatCard]}第二次释放`,
      ));
      return;
    }

    set(finishCurrentTurn({ ...state, message: `${state.players[state.currentPlayer].name}选择结束回合。` }));
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
        ...(currentPlayer.randomMovePending ? consumeRandomMovePending(currentPlayer) : currentPlayer),
        position: actualTarget,
        moveCount: currentPlayer.moveCount + 1,
        hand: currentPlayer.hand.length >= MAX_HAND_SIZE ? currentPlayer.hand : [...currentPlayer.hand, card],
      },
    };
    const nextState: GameState = {
      ...state,
      players: nextPlayers,
      phase: currentPlayer.hand.length >= MAX_HAND_SIZE ? "discard" : "skill",
      selectedCard: null,
      selectedCardAnchor: null,
      repeatCard: null,
      pendingDrawCard: currentPlayer.hand.length >= MAX_HAND_SIZE ? card : null,
      message:
        currentPlayer.hand.length >= MAX_HAND_SIZE
          ? `${state.players[playerId].name}${currentPlayer.randomMovePending ? "在愚人效果下被随机移动，并" : ""}抽到${CARD_LABELS[card]}牌。手牌已满，请弃掉 1 张当前手牌与新牌交换。`
          : `${state.players[playerId].name}${currentPlayer.randomMovePending ? "在愚人效果下被随机移动，并" : "完成移动并"}抽到${CARD_LABELS[card]}牌。你可以继续出牌，也可以直接结束回合。`,
    };
    const loggedState = withBattleLog(
      nextState,
      createBattleLogEntry(playerId, `${state.players[playerId].name}抽到了${CARD_LABELS[card]}牌。`, "draw"),
    );
    const result = resolveWinner(loggedState, playerId);

    if (result) {
      set({
        ...loggedState,
        phase: "gameover",
        winner: result.winner,
        winReason: result.reason,
        endedAt: Date.now(),
        message: `${loggedState.players[result.winner].name}获胜：${result.reason}`,
      });
      return;
    }

    set(loggedState);
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
        repeatCard: null,
        battleLog: [
          ...state.battleLog,
          createBattleLogEntry(playerId, `${state.players[playerId].name}弃掉了${CARD_LABELS[card]}牌，换入${CARD_LABELS[pendingCard]}牌。`, "system"),
        ].slice(-MAX_BATTLE_LOGS),
        message: `已弃掉${CARD_LABELS[card]}牌，换入${CARD_LABELS[pendingCard]}牌。你现在可以选择出牌或结束回合。`,
      });
      return;
    }

    if (state.phase !== "move" && state.phase !== "skill") {
      return;
    }

    if (state.repeatCard) {
      set({ message: `倒吊人触发中：你正在追加释放${CARD_LABELS[state.repeatCard]}，请直接在棋盘上选择目标。` });
      return;
    }

    if (!canUseCard(state, playerId, card)) {
      set({ message: `${CARD_LABELS[card]}牌当前没有合法目标。` });
      return;
    }

    if (getCardTargetMode(card) === "instant") {
      const hangedmanTriggered = hasHangedmanPassive(state, playerId, card);
      if (card === "fool") {
        const rival = otherPlayer(playerId);
        const nextState = withCardPlayLog({
          ...state,
          players: {
            ...state.players,
            [playerId]: removeCardAndCountUse(state, playerId, card),
            [rival]: {
              ...state.players[rival],
              randomMovePending: true,
              randomMovePendingTurns: state.players[rival].randomMovePendingTurns + (hangedmanTriggered ? 2 : 1),
            },
          },
          selectedCard: null,
          selectedCardAnchor: null,
          repeatCard: null,
          pendingDrawCard: null,
          message: `${state.players[playerId].name}使用了${CARD_LABELS.fool}牌，${state.players[rival].name}接下来${hangedmanTriggered ? "两次" : "一次"}移动，或使用${CARD_LABELS.obstacle}/${CARD_LABELS.swords8}时都将随机失控。`,
        }, playerId, "fool");
        set(finalizeAfterCardUse(nextState, playerId));
        return;
      }

      if (card === "temperance") {
        const rival = otherPlayer(playerId);
        const { nextHand, removedCards } = getRandomHandRemovals(
          state.players[rival].hand,
          hangedmanTriggered ? 2 : 1,
        );
        const nextState = withCardPlayLog({
          ...state,
          players: {
            ...state.players,
            [playerId]: removeCardAndCountUse(state, playerId, "temperance"),
            [rival]: {
              ...state.players[rival],
              hand: nextHand,
            },
          },
          selectedCard: null,
          selectedCardAnchor: null,
          repeatCard: null,
          pendingDrawCard: null,
          message: removedCards.length > 0
            ? `${state.players[playerId].name}使用了${CARD_LABELS.temperance}牌，随机清除了${state.players[rival].name}的${removedCards.map((removed) => CARD_LABELS[removed]).join("、")}。`
            : `${state.players[playerId].name}使用了${CARD_LABELS.temperance}牌，但对方已没有可清除的手牌。`,
        }, playerId, "temperance", removedCards.length > 0
          ? `随机清除了${state.players[rival].name}的${removedCards.map((removed) => CARD_LABELS[removed]).join("、")}。`
          : `但对方已没有可清除的手牌。`);
        set(finalizeAfterCardUse(nextState, playerId));
        return;
      }

      if (card === "hangedman") {
        const nextState = withCardPlayLog({
          ...state,
          players: {
            ...state.players,
            [playerId]: removeCardAndCountUse(state, playerId, "hangedman"),
          },
          selectedCard: null,
          selectedCardAnchor: null,
          repeatCard: null,
          pendingDrawCard: null,
          message: `${state.players[playerId].name}打出了${CARD_LABELS.hangedman}牌，但它本身不会直接生效。`,
        }, playerId, "hangedman", "它本身不会直接生效。");
        set(finalizeAfterCardUse(nextState, playerId));
        return;
      }

      if (card === "fate") {
        const nextState = withCardPlayLog({
          ...state,
          phase: "fate",
          fateState: {
            caster: playerId,
            choices: getRandomFateChoices(),
            revealedIndices: [],
            pendingPlayer: playerId,
            revealedBy: {},
          },
          players: {
            ...state.players,
            [playerId]: removeCardAndCountUse(state, playerId, "fate"),
          },
          selectedCard: null,
          selectedCardAnchor: null,
          repeatCard: null,
          pendingDrawCard: null,
          message: `${state.players[playerId].name}使用了${CARD_LABELS.fate}牌。三张命运牌已翻到桌面上，请由使用者先抽取 1 张。`,
        }, playerId, "fate", "开始本次全新的命运抽牌。");
        set(nextState);
        return;
      }

      if (card === "chalice" && hangedmanTriggered) {
        const nextState = withCardPlayLog({
          ...state,
          players: {
            ...state.players,
            [playerId]: removeCardAndCountUse(state, playerId, card),
          },
          selectedCard: null,
          selectedCardAnchor: null,
          repeatCard: null,
          pendingDrawCard: null,
          message: `${CARD_LABELS.hangedman}触发：${CARD_LABELS.chalice}必须连续交换两次，最终双方位置保持不变。`,
        }, playerId, "chalice", "倒吊人触发后最终位置保持不变。");
        set(finalizeAfterCardUse(nextState, playerId));
        return;
      }

      const swappedPlayers = swapPlayers(state);
      const nextState = withCardPlayLog({
        ...state,
        players: {
          ...state.players,
          ...swappedPlayers,
          [playerId]: removeCardAndCountUse({ ...state, players: { ...state.players, ...swappedPlayers } }, playerId, card),
        },
        selectedCard: null,
        selectedCardAnchor: null,
        repeatCard: null,
        pendingDrawCard: null,
        message: `${state.players[playerId].name}使用了${CARD_LABELS.chalice}牌，双方位置已交换。`,
      }, playerId, "chalice");
      set(finalizeAfterCardUse(nextState, playerId));
      return;
    }

    set({
      selectedCard: state.selectedCard === card ? null : card,
      selectedCardAnchor: null,
      message:
        card === "obstacle"
          ? state.players[playerId].randomMovePending
            ? `愚人效果生效中：本次${CARD_LABELS.obstacle}将朝随机方向释放。点击任意棋盘位置确认。`
            : `请选择一个空白格，打出${CARD_LABELS.obstacle}牌并放置永久障碍物。`
          : card === "tower"
            ? `请选择${CARD_LABELS.tower}牌的方向。系统会沿该方向找到路径上的第一个障碍物，并落到它后方的一格。`
            : card === "swords8"
              ? state.players[playerId].randomMovePending
                ? `愚人效果生效中：本次${CARD_LABELS.swords8}将朝随机方向释放。点击任意棋盘位置确认。`
                : `请选择${CARD_LABELS.swords8}的第 1 个方格，再选与其同线相邻的第 2 个方格，系统会自动补齐第 3 个障碍。`
              : `请选择一个目标格，系统将通过${CARD_LABELS.storm}牌打乱其周围 6 格内的障碍物。`,
    });
  },

  cancelSelectedCard: () => {
    const state = get();
    if (state.phase !== "move" && state.phase !== "skill") {
      return;
    }

    set({
      selectedCard: null,
      selectedCardAnchor: null,
      message: state.repeatCard
        ? `已取消当前选牌。你仍可手动再次释放 1 次${CARD_LABELS[state.repeatCard]}牌，或直接结束回合。`
        : "已取消当前卡牌选择。",
    });
  },

  skipSkillPhase: () => {
    const state = get();
    if (state.phase !== "skill" || state.winner) {
      return;
    }

    if (state.repeatCard) {
      set(loseForUnresolvedRepeat(
        state,
        `未完成倒吊人触发的${CARD_LABELS[state.repeatCard]}第二次释放`,
      ));
      return;
    }

    const result = resolveWinner(state, state.currentPlayer);
    if (result) {
      set({
        ...state,
        phase: "gameover",
        winner: result.winner,
        winReason: result.reason,
        endedAt: Date.now(),
        message: `${state.players[result.winner].name}获胜：${result.reason}`,
      });
      return;
    }

    set(finishCurrentTurn({ ...state, message: "你选择不出牌，回合已结束。" }));
  },

  clickCell: (target) => {
    const state = get();
    if (state.winner) {
      return;
    }

    if (state.selectedCard && (state.phase === "move" || state.phase === "skill")) {
      const playerId = state.currentPlayer;
      if (state.selectedCard === "obstacle") {
        const hangedmanTriggered = hasHangedmanPassive(state, playerId, "obstacle");
        const isRepeatCast = state.repeatCard === "obstacle";
        if (state.players[playerId].randomMovePending) {
          const randomTarget = pickRandomFoolObstacleTarget(state, playerId);
          if (!randomTarget) {
            set({ message: `愚人效果触发，但当前没有可供${CARD_LABELS.obstacle}随机释放的方向。` });
            return;
          }

          const nextObstacles = placeObstacle(state, randomTarget);
          if (!nextObstacles) {
            set({ message: `愚人效果触发，但本次${CARD_LABELS.obstacle}随机释放失败。` });
            return;
          }

          const nextState = withCardPlayLog({
            ...state,
            obstacles: nextObstacles,
            selectedCard: null,
            selectedCardAnchor: null,
            repeatCard: null,
            pendingDrawCard: null,
            players: {
              ...state.players,
              [playerId]: consumeRandomMovePending(consumeSkillUse(state, playerId, "obstacle")),
            },
            message: `${state.players[playerId].name}在愚人效果下使${CARD_LABELS.obstacle}朝随机方向释放。`,
          }, playerId, "obstacle");
          if (hangedmanTriggered && !isRepeatCast) {
            set(prepareManualRepeat(
              nextState,
              playerId,
              "obstacle",
              `${CARD_LABELS.hangedman}触发：由于愚人效果，请点击任意位置进行第二次随机释放。`,
            ));
            return;
          }
          set(finalizeAfterCardUse(clearRepeatState(nextState), playerId));
          return;
        }

        const nextObstacles = placeObstacle(state, target);
        if (!nextObstacles) {
          set({ message: "障碍物只能放在地图内的空白格。" });
          return;
        }

        const nextState = withCardPlayLog({
          ...state,
          obstacles: nextObstacles,
          selectedCard: null,
          selectedCardAnchor: null,
          repeatCard: null,
          pendingDrawCard: null,
          players: {
            ...state.players,
            [playerId]: consumeSkillUse(state, playerId, "obstacle"),
          },
          message: `${state.players[playerId].name}打出了${CARD_LABELS.obstacle}牌，放置了一个永久障碍物。`,
        }, playerId, "obstacle");
        if (hangedmanTriggered && !isRepeatCast) {
          set(prepareManualRepeat(
            nextState,
            playerId,
            "obstacle",
            `${CARD_LABELS.hangedman}触发：请直接在棋盘上再次选择目标，追加释放 1 次${CARD_LABELS.obstacle}牌。`,
          ));
          return;
        }
        set(finalizeAfterCardUse(clearRepeatState(nextState), playerId));
        return;
      }

      if (state.selectedCard === "storm") {
        const hangedmanTriggered = hasHangedmanPassive(state, playerId, "storm");
        const isRepeatCast = state.repeatCard === "storm";
        const stormResult = applyStorm(state, target);
        if (!stormResult) {
          set({ message: `该目标周围没有可打乱的障碍物，或本次${CARD_LABELS.storm}牌重排失败。` });
          return;
        }

        const nextState = withCardPlayLog({
          ...state,
          selectedCard: null,
          selectedCardAnchor: null,
          repeatCard: null,
          pendingDrawCard: null,
          players: {
            ...stormResult.players,
            [playerId]: consumeSkillUse({ ...state, players: stormResult.players }, playerId, "storm"),
          },
          obstacles: stormResult.obstacles,
          message: `${state.players[playerId].name}打出了${CARD_LABELS.storm}牌，周围 6 格内的障碍物已被重新洗牌。`,
        }, playerId, "storm");
        if (hangedmanTriggered && !isRepeatCast) {
          set(prepareManualRepeat(
            nextState,
            playerId,
            "storm",
            `${CARD_LABELS.hangedman}触发：请直接在棋盘上再次选择目标，追加释放 1 次${CARD_LABELS.storm}牌。`,
          ));
          return;
        }
        set(finalizeAfterCardUse(clearRepeatState(nextState), playerId));
        return;
      }
      if (state.selectedCard === "tower") {
        const hangedmanTriggered = hasHangedmanPassive(state, playerId, "tower");
        const isRepeatCast = state.repeatCard === "tower";
        const towerTarget = getTowerMoveFromDirectionSelection(state, playerId, target);

        if (!towerTarget) {
          set({ message: `${CARD_LABELS.tower}牌必须沿你点击的同一方向，跳到该方向上第一个障碍物后方的空白格。` });
          return;
        }

        const nextState = withCardPlayLog({
          ...state,
          selectedCard: null,
          selectedCardAnchor: null,
          repeatCard: null,
          pendingDrawCard: null,
          players: {
            ...state.players,
            [playerId]: {
              ...consumeSkillUse(state, playerId, "tower"),
              position: towerTarget,
            },
          },
          message: `${state.players[playerId].name}使用了${CARD_LABELS.tower}牌，跨越路径上的障碍并完成跳跃。`,
        }, playerId, "tower");
        if (hangedmanTriggered && !isRepeatCast) {
          set(prepareManualRepeat(
            nextState,
            playerId,
            "tower",
            `${CARD_LABELS.hangedman}触发：请直接在棋盘上再次选择目标，追加释放 1 次${CARD_LABELS.tower}牌。`,
          ));
          return;
        }
        set(finalizeAfterCardUse(clearRepeatState(nextState), playerId));
        return;
      }
      if (state.selectedCard === "swords8") {
        const hangedmanTriggered = hasHangedmanPassive(state, playerId, "swords8");
        const isRepeatCast = state.repeatCard === "swords8";
        if (state.players[playerId].randomMovePending) {
          const randomPlacement = pickRandomFoolSwordEightPlacement(state, playerId);
          if (!randomPlacement) {
            set({ message: `愚人效果触发，但当前没有可供${CARD_LABELS.swords8}随机释放的方向。` });
            return;
          }

          const nextObstacles = placeSwordEightObstacles(state, randomPlacement.start, randomPlacement.second);
          if (!nextObstacles) {
            set({ message: `愚人效果触发，但本次${CARD_LABELS.swords8}随机释放失败。` });
            return;
          }

          const nextState = withCardPlayLog({
            ...state,
            obstacles: nextObstacles,
            selectedCard: null,
            selectedCardAnchor: null,
            repeatCard: null,
            pendingDrawCard: null,
            players: {
              ...state.players,
              [playerId]: consumeRandomMovePending(consumeSkillUse(state, playerId, "swords8")),
            },
            message: `${state.players[playerId].name}在愚人效果下使${CARD_LABELS.swords8}朝随机方向释放。`,
          }, playerId, "swords8");
          if (hangedmanTriggered && !isRepeatCast) {
            set(prepareManualRepeat(
              nextState,
              playerId,
              "swords8",
              `${CARD_LABELS.hangedman}触发：由于愚人效果，请点击任意位置进行第二次随机释放。`,
            ));
            return;
          }
          set(finalizeAfterCardUse(clearRepeatState(nextState), playerId));
          return;
        }

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

        const nextState = withCardPlayLog({
          ...state,
          obstacles: nextObstacles,
          selectedCard: null,
          selectedCardAnchor: null,
          repeatCard: null,
          pendingDrawCard: null,
          players: {
            ...state.players,
            [playerId]: consumeSkillUse(state, playerId, "swords8"),
          },
          message: `${state.players[playerId].name}使用了${CARD_LABELS.swords8}，一次性放置了 3 个连续障碍物。`,
        }, playerId, "swords8");
        if (hangedmanTriggered && !isRepeatCast) {
          set(prepareManualRepeat(
            nextState,
            playerId,
            "swords8",
            `${CARD_LABELS.hangedman}触发：请直接在棋盘上再次选择目标，追加释放 1 次${CARD_LABELS.swords8}。`,
          ));
          return;
        }
        set(finalizeAfterCardUse(clearRepeatState(nextState), playerId));
      }
      return;
    }

    if (state.phase === "move") {
      get().moveCurrentPlayer(target);
    }
  },

  selectFateChoice: (index) => {
    const state = get();
    const playerId = state.currentPlayer;
    const fateState = state.fateState;

    if (state.phase !== "fate" || !fateState || fateState.pendingPlayer !== playerId) {
      return;
    }

    if (fateState.revealedIndices.includes(index)) {
      return;
    }

    const outcome = fateState.choices[index];
    if (!outcome) {
      return;
    }

    const resolvedState = applyFateOutcome(
      {
        ...state,
        fateState: {
          ...fateState,
          revealedIndices: [...fateState.revealedIndices, index],
          revealedBy: {
            ...fateState.revealedBy,
            [playerId]: outcome,
          },
          pendingPlayer: null,
        },
        selectedCard: null,
        selectedCardAnchor: null,
        repeatCard: null,
        pendingDrawCard: null,
      },
      playerId,
      outcome,
    );

    const fateLabel = outcome === "sun" ? "太阳" : outcome === "death" ? "正位死神" : "女皇";
    const isCasterImmediateReveal = playerId === fateState.caster;
    const settledState = withBattleLog({
      ...resolvedState,
      fateState: null,
      pendingFateTriggers: isCasterImmediateReveal
        ? [
          ...resolvedState.pendingFateTriggers,
          {
            caster: fateState.caster,
            recipient: otherPlayer(playerId),
            triggerAfterTurnOf: otherPlayer(playerId),
          },
        ]
        : resolvedState.pendingFateTriggers,
    }, createBattleLogEntry(playerId, `${state.players[playerId].name}在${CARD_LABELS.fate}中抽中了${fateLabel}。`, "fate"));

    if (outcome === "death") {
      set({
        ...settledState,
        phase: "skill",
        message: isCasterImmediateReveal
          ? `${state.players[playerId].name}在${CARD_LABELS.fate}中抽中了${fateLabel}。自身周围已被障碍围起，但你仍可额外使用 1 次出牌机会；对手会在自己回合结束后触发一次全新的命运抽牌。`
          : `${state.players[playerId].name}在${CARD_LABELS.fate}中抽中了${fateLabel}。自身周围已被障碍围起，但你仍可额外使用 1 次出牌机会后再交回回合。`,
      });
      return;
    }

    set(finalizeAfterCardUse({
      ...settledState,
      message: isCasterImmediateReveal
        ? `${state.players[playerId].name}在${CARD_LABELS.fate}中抽中了${fateLabel}。本次命运结算已完成；对手会在自己回合结束后触发一次全新的命运抽牌。`
        : `${state.players[playerId].name}在${CARD_LABELS.fate}中抽中了${fateLabel}。本次命运结算已完成。`,
    }, playerId));
  },

  expireTurn: () => {
    const state = get();
    if (state.winner || Date.now() < state.turnEndsAt) {
      return;
    }

    const timeoutResult = resolveWinner(state, state.currentPlayer);
    if (timeoutResult) {
      set({
        ...state,
        phase: "gameover",
        winner: timeoutResult.winner,
        winReason: timeoutResult.reason,
        endedAt: Date.now(),
        message: `${state.players[timeoutResult.winner].name}获胜：${timeoutResult.reason}`,
      });
      return;
    }

    if (state.phase === "move") {
      set(finishCurrentTurn({ ...state, message: "移动超时，本回合自动结束。" }));
      return;
    }

    if (state.phase === "skill") {
      if (state.repeatCard) {
        set(loseForUnresolvedRepeat(
          state,
          `未完成倒吊人触发的${CARD_LABELS[state.repeatCard]}第二次释放`,
        ));
        return;
      }

      set(finishCurrentTurn({ ...state, message: "出牌超时，本回合自动结束。" }));
      return;
    }

    if (state.phase === "discard") {
      const playerId = state.currentPlayer;
      const pendingCard = state.pendingDrawCard;
      const firstCard = state.players[playerId].hand[0];

      if (!pendingCard || !firstCard) {
        set(finishCurrentTurn({ ...state, message: "换牌超时，本回合自动结束。" }));
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
      set(finishCurrentTurn(nextState));
      return;
    }

    if (state.phase === "fate") {
      const fateState = state.fateState;
      if (!fateState?.pendingPlayer) {
        set(advanceToNextPlayerTurn({ ...state, phase: "move", fateState: null, message: "命运牌结算超时，本回合自动结束。" }));
        return;
      }

      const firstAvailableIndex = fateState.choices.findIndex((_, choiceIndex) => !fateState.revealedIndices.includes(choiceIndex));
      if (firstAvailableIndex >= 0) {
        get().selectFateChoice(firstAvailableIndex);
      } else {
        set(advanceToNextPlayerTurn({ ...state, phase: "move", fateState: null, message: "命运牌结算超时，本回合自动结束。" }));
      }
    }
  },
}));
