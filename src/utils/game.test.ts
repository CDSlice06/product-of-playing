import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGameStore } from "@/store/gameStore";
import type { GameState } from "@/types/game";
import { chooseAiDiscardCard, chooseAiFateChoice, chooseAiMovePhaseAction, chooseAiSkillPlan } from "@/utils/ai";
import {
  applyStorm,
  getFoolObstacleTargets,
  getFoolSwordEightPlacements,
  getSwordEightSecondCells,
  getSwordEightStartCells,
  placeObstacle,
  placeSwordEightObstacles,
} from "@/utils/cards";
import { BOARD_SIZE, MAX_HAND_SIZE, TURN_DURATION_MS, getNeighbors, toPositionKey } from "@/utils/board";
import { getLegalMoves, getTowerMoves, isLegalMove, resolveWinner } from "@/utils/judge";

function createState(
  overrides?: Omit<Partial<GameState>, "players"> & {
    players?: Partial<Record<"player1" | "player2", Record<string, unknown>>>;
  },
): GameState {
  const baseState: GameState = {
    boardSize: BOARD_SIZE,
    gameMode: "pvp",
    aiDifficulty: "medium",
    currentPlayer: "player1",
    phase: "move",
    players: {
      player1: {
        id: "player1",
        name: "占星师",
        position: { x: 1, y: 1 },
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
        name: "秘术师",
        position: { x: 8, y: 8 },
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
    startedAt: 0,
    endedAt: null,
    turnEndsAt: TURN_DURATION_MS,
    message: "",
  };

  return {
    ...baseState,
    ...overrides,
    players: {
      player1: {
        ...baseState.players.player1,
        ...overrides?.players?.player1,
      },
      player2: {
        ...baseState.players.player2,
        ...overrides?.players?.player2,
      },
    },
  };
}

beforeEach(() => {
  useGameStore.getState().resetGame();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("棋盘规则", () => {
  it("能正确返回中心格的六方向邻居", () => {
    const neighbors = getNeighbors({ x: 4, y: 4 });
    expect(neighbors).toHaveLength(6);
  });

  it("能正确过滤边界格的越界方向", () => {
    const neighbors = getNeighbors({ x: 0, y: 0 });
    expect(neighbors).toHaveLength(2);
  });

  it("仅允许移动到相邻6格中的空白格", () => {
    const state = createState({
      obstacles: [{ x: 2, y: 1 }],
    });

    expect(isLegalMove(state, "player1", { x: 2, y: 2 })).toBe(true);
    expect(isLegalMove(state, "player1", { x: 2, y: 1 })).toBe(false);
    expect(isLegalMove(state, "player1", { x: 4, y: 4 })).toBe(false);
  });

  it("当玩家相邻6格全部被占用时判定失败", () => {
    const state = createState({
      players: {
        player1: {
          id: "player1",
          name: "占星师",
          position: { x: 1, y: 1 },
          hand: [],
          moveCount: 0,
          usedCardCount: 0,
          lockedTurns: 0,
          randomMovePending: false,
        },
        player2: {
          id: "player2",
          name: "秘术师",
          position: { x: 8, y: 8 },
          hand: [],
          moveCount: 0,
          usedCardCount: 0,
          lockedTurns: 0,
          randomMovePending: false,
        },
      },
      obstacles: [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: 2 },
        { x: 1, y: 0 },
        { x: 1, y: 2 },
        { x: 2, y: 0 },
        { x: 2, y: 1 },
        { x: 2, y: 2 },
      ],
    });

    const result = resolveWinner(state, "player2");
    expect(getLegalMoves(state, "player1")).toHaveLength(0);
    expect(result?.winner).toBe("player2");
  });

  it("被围住但仍有可用高塔牌时不会立即失败", () => {
    const state = createState({
      players: {
        player1: {
          id: "player1",
          name: "占星师",
          position: { x: 1, y: 1 },
          hand: ["tower"],
          moveCount: 0,
          usedCardCount: 0,
          lockedTurns: 0,
          randomMovePending: false,
        },
        player2: {
          id: "player2",
          name: "秘术师",
          position: { x: 8, y: 8 },
          hand: [],
          moveCount: 0,
          usedCardCount: 0,
          lockedTurns: 0,
          randomMovePending: false,
        },
      },
      obstacles: [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: 2 },
        { x: 1, y: 0 },
        { x: 1, y: 2 },
        { x: 2, y: 0 },
        { x: 2, y: 1 },
        { x: 2, y: 2 },
      ],
    });

    expect(getLegalMoves(state, "player1")).toHaveLength(0);
    expect(getTowerMoves(state, "player1")).toEqual([{ x: 3, y: 1 }, { x: 0, y: 3 }, { x: 2, y: 3 }]);
    expect(resolveWinner(state, "player2")).toBeNull();
  });

  it("被围住但圣杯换位后可脱困时不会立即失败", () => {
    const state = createState({
      players: {
        player1: {
          id: "player1",
          name: "占星师",
          position: { x: 1, y: 1 },
          hand: ["chalice"],
          moveCount: 0,
          usedCardCount: 0,
          lockedTurns: 0,
          randomMovePending: false,
        },
        player2: {
          id: "player2",
          name: "秘术师",
          position: { x: 8, y: 8 },
          hand: [],
          moveCount: 0,
          usedCardCount: 0,
          lockedTurns: 0,
          randomMovePending: false,
        },
      },
      obstacles: [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: 2 },
        { x: 1, y: 0 },
        { x: 1, y: 2 },
        { x: 2, y: 0 },
        { x: 2, y: 1 },
        { x: 2, y: 2 },
      ],
    });

    expect(getLegalMoves(state, "player1")).toHaveLength(0);
    expect(resolveWinner(state, "player2")).toBeNull();
  });

  it("被围住但只有愚人牌时仍会失败", () => {
    const state = createState({
      players: {
        player1: {
          id: "player1",
          name: "占星师",
          position: { x: 1, y: 1 },
          hand: ["fool"],
          moveCount: 0,
          usedCardCount: 0,
          lockedTurns: 0,
          randomMovePending: false,
        },
        player2: {
          id: "player2",
          name: "秘术师",
          position: { x: 8, y: 8 },
          hand: [],
          moveCount: 0,
          usedCardCount: 0,
          lockedTurns: 0,
          randomMovePending: false,
        },
      },
      obstacles: [
        { x: 0, y: 0 },
        { x: 0, y: 1 },
        { x: 0, y: 2 },
        { x: 1, y: 0 },
        { x: 1, y: 2 },
        { x: 2, y: 0 },
        { x: 2, y: 1 },
        { x: 2, y: 2 },
      ],
    });

    const result = resolveWinner(state, "player2");
    expect(result?.winner).toBe("player2");
  });
});

describe("塔罗牌规则", () => {
  it("障碍牌只能放在空白格", () => {
    const state = createState();
    expect(placeObstacle(state, { x: 5, y: 5 })).toHaveLength(1);
    expect(placeObstacle(state, { x: 1, y: 1 })).toBeNull();
  });

  it("18号月亮连续放置时不会让已有障碍物消失", () => {
    const state = createState({
      obstacles: [{ x: 2, y: 2 }],
    });

    expect(placeObstacle(state, { x: 5, y: 5 })).toEqual([{ x: 2, y: 2 }, { x: 5, y: 5 }]);
  });

  it("15号恶魔牌只会打乱周围6格内的障碍物，且不会移动玩家", () => {
    const state = createState({
      players: {
        player1: {
          id: "player1",
          name: "占星师",
          position: { x: 4, y: 3 },
          hand: [],
          moveCount: 0,
          usedCardCount: 0,
          lockedTurns: 0,
          randomMovePending: false,
        },
        player2: {
          id: "player2",
          name: "秘术师",
          position: { x: 5, y: 5 },
          hand: [],
          moveCount: 0,
          usedCardCount: 0,
          lockedTurns: 0,
          randomMovePending: false,
        },
      },
      obstacles: [{ x: 4, y: 5 }, { x: 5, y: 3 }],
    });

    const result = applyStorm(state, { x: 4, y: 4 }, () => 0.37);
    expect(result).not.toBeNull();
    expect(result!.players.player1.position).toEqual({ x: 4, y: 3 });
    expect(result!.players.player2.position).toEqual({ x: 5, y: 5 });

    const occupied = [
      toPositionKey(result!.players.player1.position),
      toPositionKey(result!.players.player2.position),
      ...result!.obstacles.map(toPositionKey),
    ];

    expect(new Set(occupied).size).toBe(occupied.length);
    expect(result!.obstacles).toHaveLength(state.obstacles.length);
  });

  it("15号恶魔牌在周围没有障碍物时不能使用", () => {
    const state = createState({
      players: {
        player1: {
          id: "player1",
          name: "占星师",
          position: { x: 4, y: 4 },
          hand: ["storm"],
          moveCount: 0,
          usedCardCount: 0,
          lockedTurns: 0,
          randomMovePending: false,
        },
        player2: {
          id: "player2",
          name: "秘术师",
          position: { x: 8, y: 8 },
          hand: [],
          moveCount: 0,
          usedCardCount: 0,
          lockedTurns: 0,
          randomMovePending: false,
        },
      },
    });

    expect(applyStorm(state, { x: 4, y: 4 })).toBeNull();
  });

  it("手牌上限按4张计算", () => {
    expect(MAX_HAND_SIZE).toBe(4);
  });

  it("高塔牌会跳到目标方向上第一个障碍物的后一格", () => {
    const state = createState({
      players: {
        player1: {
          id: "player1",
          name: "占星师",
          position: { x: 4, y: 4 },
          hand: ["tower"],
          moveCount: 0,
          usedCardCount: 0,
          lockedTurns: 0,
          randomMovePending: false,
        },
        player2: {
          id: "player2",
          name: "秘术师",
          position: { x: 8, y: 8 },
          hand: [],
          moveCount: 0,
          usedCardCount: 0,
          lockedTurns: 0,
          randomMovePending: false,
        },
      },
      obstacles: [{ x: 5, y: 4 }],
    });

    expect(getTowerMoves(state, "player1")).toContainEqual({ x: 6, y: 4 });
    expect(getTowerMoves(state, "player1")).not.toContainEqual({ x: 4, y: 2 });
  });

  it("高塔牌允许先经过空格，再跳过路径上的障碍物", () => {
    const state = createState({
      players: {
        player1: {
          id: "player1",
          name: "占星师",
          position: { x: 2, y: 2 },
          hand: ["tower"],
          moveCount: 0,
          usedCardCount: 0,
          lockedTurns: 0,
          randomMovePending: false,
        },
        player2: {
          id: "player2",
          name: "秘术师",
          position: { x: 8, y: 8 },
          hand: [],
          moveCount: 0,
          usedCardCount: 0,
          lockedTurns: 0,
          randomMovePending: false,
        },
      },
      obstacles: [{ x: 5, y: 2 }],
    });

    expect(getTowerMoves(state, "player1")).toContainEqual({ x: 6, y: 2 });
  });

  it("宝剑八能找到连续直线三格的起点与第二格", () => {
    const state = createState({
      players: {
        player1: {
          id: "player1",
          name: "占星师",
          position: { x: 8, y: 8 },
          hand: ["swords8"],
          moveCount: 0,
          usedCardCount: 0,
          lockedTurns: 0,
          randomMovePending: false,
        },
        player2: {
          id: "player2",
          name: "秘术师",
          position: { x: 9, y: 9 },
          hand: [],
          moveCount: 0,
          usedCardCount: 0,
          lockedTurns: 0,
          randomMovePending: false,
        },
      },
      obstacles: [{ x: 5, y: 5 }],
    });

    expect(getSwordEightStartCells(state)).toContainEqual({ x: 0, y: 0 });
    expect(getSwordEightSecondCells(state, { x: 0, y: 0 })).toContainEqual({ x: 1, y: 0 });
  });

  it("宝剑八会一次性放置连续直线的3个障碍物", () => {
    const state = createState();
    const nextObstacles = placeSwordEightObstacles(state, { x: 3, y: 3 }, { x: 4, y: 3 });

    expect(nextObstacles).toEqual([{ x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 }]);
  });

  it("宝剑八放置时会保留棋盘上已有的障碍物", () => {
    const state = createState({
      obstacles: [{ x: 1, y: 6 }],
    });
    const nextObstacles = placeSwordEightObstacles(state, { x: 3, y: 3 }, { x: 4, y: 3 });

    expect(nextObstacles).toEqual([{ x: 1, y: 6 }, { x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 }]);
  });

  it("14号节制会随机删除对方一张手牌", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    useGameStore.setState((state) => ({
      ...state,
      players: {
        ...state.players,
        player1: {
          ...state.players.player1,
          hand: ["temperance"],
        },
        player2: {
          ...state.players.player2,
          hand: ["obstacle", "storm"],
        },
      },
    }));

    useGameStore.getState().selectCard("temperance");
    const state = useGameStore.getState();

    expect(state.currentPlayer).toBe("player2");
    expect(state.players.player2.hand).toEqual(["storm"]);
  });

  it("12号倒吊人持有时会让14号节制触发双倍删除", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    useGameStore.setState((state) => ({
      ...state,
      players: {
        ...state.players,
        player1: {
          ...state.players.player1,
          hand: ["temperance", "hangedman", "obstacle", "storm"],
        },
        player2: {
          ...state.players.player2,
          hand: ["obstacle", "storm", "tower"],
        },
      },
    }));

    useGameStore.getState().selectCard("temperance");
    const state = useGameStore.getState();

    expect(state.players.player2.hand).toEqual(["tower"]);
  });

  it("10号命运会在使用者先抽后，为对方登记回合结束后触发的全新命运抽牌", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    useGameStore.setState((state) => ({
      ...state,
      players: {
        ...state.players,
        player1: {
          ...state.players.player1,
          hand: ["fate"],
        },
      },
    }));

    useGameStore.getState().selectCard("fate");
    let state = useGameStore.getState();

    expect(state.phase).toBe("fate");
    expect(state.fateState?.pendingPlayer).toBe("player1");
    const firstChoices = [...(state.fateState?.choices ?? [])];
    const firstRevealIndex = firstChoices.findIndex((choice) => choice !== "death");

    useGameStore.getState().selectFateChoice(firstRevealIndex >= 0 ? firstRevealIndex : 0);
    state = useGameStore.getState();

    expect(state.phase).toBe("move");
    expect(state.currentPlayer).toBe("player2");
    expect(state.fateState).toBeNull();
    expect(state.pendingFateTriggers).toHaveLength(1);
    expect(state.pendingFateTriggers[0]).toMatchObject({
      caster: "player1",
      recipient: "player2",
      triggerAfterTurnOf: "player2",
    });
    expect(state.battleLog.at(-1)?.text).toContain("抽中了");
    expect(state.battleLog.some((entry) => entry.text.includes("开始本次全新的命运抽牌"))).toBe(true);
    expect(firstChoices).toEqual(expect.arrayContaining(["sun", "death", "empress"]));

    useGameStore.getState().endCurrentTurn();
    state = useGameStore.getState();

    expect(state.phase).toBe("fate");
    expect(state.currentPlayer).toBe("player2");
    expect(state.pendingFateTriggers).toHaveLength(0);
    expect(state.fateState?.pendingPlayer).toBe("player2");
    expect(state.fateState?.revealedIndices).toEqual([]);
    expect(state.battleLog.at(-1)?.text).toContain("回合结束后触发了1次全新的10号命运抽牌");
  });

  it("人机模式下 AI 打出命运后，玩家也会在自己回合结束后触发全新的命运抽牌", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    useGameStore.setState((state) => ({
      ...state,
      gameMode: "pve",
      currentPlayer: "player2",
      phase: "move",
      players: {
        ...state.players,
        player2: {
          ...state.players.player2,
          hand: ["fate"],
        },
      },
    }));

    useGameStore.getState().selectCard("fate");
    const aiDeck = [...(useGameStore.getState().fateState?.choices ?? [])];
    const aiRevealIndex = aiDeck.findIndex((choice) => choice !== "death");
    useGameStore.getState().selectFateChoice(aiRevealIndex >= 0 ? aiRevealIndex : 0);

    let state = useGameStore.getState();
    expect(state.currentPlayer).toBe("player1");
    expect(state.pendingFateTriggers).toHaveLength(1);
    expect(state.pendingFateTriggers[0]).toMatchObject({
      caster: "player2",
      recipient: "player1",
      triggerAfterTurnOf: "player1",
    });

    useGameStore.getState().endCurrentTurn();
    state = useGameStore.getState();

    expect(state.phase).toBe("fate");
    expect(state.currentPlayer).toBe("player1");
    expect(state.fateState?.pendingPlayer).toBe("player1");
    expect(state.fateState?.revealedIndices).toEqual([]);
  });

  it("倒吊人触发后，18号月亮会保留一次手动再次释放的机会", () => {
    useGameStore.setState((state) => ({
      ...state,
      phase: "skill",
      players: {
        ...state.players,
        player1: {
          ...state.players.player1,
          hand: ["hangedman", "obstacle", "storm", "tower"],
        },
      },
    }));

    useGameStore.getState().selectCard("obstacle");
    useGameStore.getState().clickCell({ x: 4, y: 4 });
    const state = useGameStore.getState();

    expect(state.repeatCard).toBe("obstacle");
    expect(state.phase).toBe("skill");
    expect(state.players.player1.hand).toEqual(["hangedman", "storm", "tower"]);
    expect(state.obstacles).toContainEqual({ x: 4, y: 4 });
  });

  it("倒吊人第二次释放未完成时，主动结束回合会直接判负", () => {
    useGameStore.setState((state) => ({
      ...state,
      currentPlayer: "player1",
      phase: "skill",
      repeatCard: "obstacle",
    }));

    useGameStore.getState().endCurrentTurn();
    const state = useGameStore.getState();

    expect(state.phase).toBe("gameover");
    expect(state.winner).toBe("player2");
    expect(state.winReason).toContain("第二次释放");
  });

  it("倒吊人第二次释放未完成时，选择不出牌会直接判负", () => {
    useGameStore.setState((state) => ({
      ...state,
      currentPlayer: "player1",
      phase: "skill",
      repeatCard: "tower",
    }));

    useGameStore.getState().skipSkillPhase();
    const state = useGameStore.getState();

    expect(state.phase).toBe("gameover");
    expect(state.winner).toBe("player2");
    expect(state.winReason).toContain("第二次释放");
  });

  it("倒吊人第二次释放未完成时，技能超时会直接判负", () => {
    vi.spyOn(Date, "now").mockReturnValue(TURN_DURATION_MS + 1);

    useGameStore.setState((state) => ({
      ...state,
      currentPlayer: "player1",
      phase: "skill",
      repeatCard: "swords8",
      turnEndsAt: TURN_DURATION_MS,
    }));

    useGameStore.getState().expireTurn();
    const state = useGameStore.getState();

    expect(state.phase).toBe("gameover");
    expect(state.winner).toBe("player2");
    expect(state.winReason).toContain("第二次释放");
  });

  it("对局日志会记录出牌与抽牌结果", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    useGameStore.setState((state) => ({
      ...state,
      players: {
        ...state.players,
        player1: {
          ...state.players.player1,
          hand: ["chalice"],
        },
      },
    }));

    useGameStore.getState().selectCard("chalice");
    useGameStore.setState((state) => ({
      ...state,
      currentPlayer: "player1",
      phase: "move",
      players: {
        ...state.players,
        player1: {
          ...state.players.player1,
          position: { x: 1, y: 1 },
        },
      },
    }));
    useGameStore.getState().moveCurrentPlayer({ x: 2, y: 2 });
    const state = useGameStore.getState();

    expect(state.battleLog.some((entry) => entry.text.includes("打出了圣杯牌"))).toBe(true);
    expect(state.battleLog.some((entry) => entry.text.includes("抽到了18号月亮牌"))).toBe(true);
  });

  it("节制的对局日志会显示被清除的具体卡牌", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    useGameStore.setState((state) => ({
      ...state,
      currentPlayer: "player1",
      phase: "move",
      players: {
        ...state.players,
        player1: {
          ...state.players.player1,
          hand: ["temperance"],
        },
        player2: {
          ...state.players.player2,
          hand: ["tower", "storm"],
        },
      },
    }));

    useGameStore.getState().selectCard("temperance");
    const state = useGameStore.getState();

    expect(
      state.battleLog.some(
        (entry) => entry.text.includes("随机清除了") && entry.text.includes("16号正位高塔"),
      ),
    ).toBe(true);
  });

  it("正位高塔会按玩家点击的同一方向路径，落到该方向第一个障碍物后方", () => {
    useGameStore.setState((state) => ({
      ...state,
      phase: "skill",
      obstacles: [{ x: 2, y: 1 }],
      players: {
        ...state.players,
        player1: {
          ...state.players.player1,
          hand: ["tower"],
          position: { x: 1, y: 1 },
        },
      },
    }));

    useGameStore.getState().selectCard("tower");
    useGameStore.getState().clickCell({ x: 2, y: 1 });
    const state = useGameStore.getState();

    expect(state.players.player1.position).toEqual({ x: 3, y: 1 });
  });
});

describe("回合流程规则", () => {
  it("可以切换到人机对战并保留该模式重新开局", () => {
    useGameStore.getState().setGameMode("pve");
    let state = useGameStore.getState();

    expect(state.gameMode).toBe("pve");
    expect(state.players.player2.name).toBe("命运傀儡");

    useGameStore.getState().resetGame();
    state = useGameStore.getState();

    expect(state.gameMode).toBe("pve");
    expect(state.players.player2.name).toBe("命运傀儡");
  });

  it("可以切换 AI 难度并在重新开局后保留", () => {
    useGameStore.getState().setAiDifficulty("hard");
    let state = useGameStore.getState();

    expect(state.aiDifficulty).toBe("hard");

    useGameStore.getState().resetGame();
    state = useGameStore.getState();

    expect(state.aiDifficulty).toBe("hard");
  });

  it("支持在未移动时直接打出一张塔罗牌", () => {
    useGameStore.setState((state) => ({
      ...state,
      players: {
        ...state.players,
        player1: {
          ...state.players.player1,
          hand: ["chalice"],
        },
      },
    }));

    useGameStore.getState().selectCard("chalice");
    const state = useGameStore.getState();

    expect(state.currentPlayer).toBe("player2");
    expect(state.players.player1.position).toEqual({ x: 8, y: 8 });
    expect(state.players.player2.position).toEqual({ x: 1, y: 1 });
    expect(state.players.player1.usedCardCount).toBe(1);
  });

  it("移动后抽牌超上限时进入弃一换一阶段", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    useGameStore.setState((state) => ({
      ...state,
      players: {
        ...state.players,
        player1: {
          ...state.players.player1,
          hand: ["chalice", "storm", "obstacle", "storm"],
        },
      },
    }));

    useGameStore.getState().moveCurrentPlayer({ x: 2, y: 2 });
    let state = useGameStore.getState();

    expect(state.phase).toBe("discard");
    expect(state.pendingDrawCard).toBe("obstacle");
    expect(state.players.player1.hand).toEqual(["chalice", "storm", "obstacle", "storm"]);

    useGameStore.getState().selectCard("chalice");
    state = useGameStore.getState();

    expect(state.phase).toBe("skill");
    expect(state.pendingDrawCard).toBeNull();
    expect(state.players.player1.hand).toEqual(["obstacle", "storm", "obstacle", "storm"]);
  });

  it("愚人牌会让对方下一次移动随机失控", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    useGameStore.setState((state) => ({
      ...state,
      players: {
        ...state.players,
        player1: {
          ...state.players.player1,
          hand: ["fool"],
        },
      },
    }));

    useGameStore.getState().selectCard("fool");
    let state = useGameStore.getState();

    expect(state.currentPlayer).toBe("player2");
    expect(state.players.player2.randomMovePending).toBe(true);

    useGameStore.getState().moveCurrentPlayer({ x: 7, y: 7 });
    state = useGameStore.getState();

    expect(state.players.player2.position).toEqual({ x: 9, y: 8 });
    expect(state.players.player2.randomMovePending).toBe(false);
  });

  it("愚人效果下使用18号月亮会朝随机方向释放", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    useGameStore.setState((state) => ({
      ...state,
      phase: "skill",
      currentPlayer: "player1",
      players: {
        ...state.players,
        player1: {
          ...state.players.player1,
          hand: ["obstacle"],
          randomMovePending: true,
        },
      },
    }));

    const before = useGameStore.getState();
    const expectedTarget = getFoolObstacleTargets(before, "player1")[0];

    expect(expectedTarget).toBeDefined();

    useGameStore.getState().selectCard("obstacle");
    useGameStore.getState().clickCell({ x: 9, y: 9 });
    const state = useGameStore.getState();

    expect(state.currentPlayer).toBe("player2");
    expect(state.obstacles).toEqual([expectedTarget!]);
    expect(state.players.player1.randomMovePending).toBe(false);
  });

  it("愚人效果下使用宝剑八会朝随机方向释放", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);

    useGameStore.setState((state) => ({
      ...state,
      phase: "skill",
      currentPlayer: "player1",
      players: {
        ...state.players,
        player1: {
          ...state.players.player1,
          hand: ["swords8"],
          randomMovePending: true,
        },
      },
    }));

    const before = useGameStore.getState();
    const expectedPlacement = getFoolSwordEightPlacements(before, "player1")[0];
    const expectedObstacles = expectedPlacement
      ? placeSwordEightObstacles(before, expectedPlacement.start, expectedPlacement.second)
      : null;

    expect(expectedPlacement).toBeDefined();
    expect(expectedObstacles).not.toBeNull();

    useGameStore.getState().selectCard("swords8");
    useGameStore.getState().clickCell({ x: 0, y: 0 });
    const state = useGameStore.getState();

    expect(state.currentPlayer).toBe("player2");
    expect(state.obstacles).toEqual(expectedObstacles!);
    expect(state.players.player1.randomMovePending).toBe(false);
  });

  it("宝剑八在两次选点后会放置3个障碍并结束回合", () => {
    useGameStore.setState((state) => ({
      ...state,
      players: {
        ...state.players,
        player1: {
          ...state.players.player1,
          hand: ["swords8"],
        },
      },
    }));

    useGameStore.getState().selectCard("swords8");
    useGameStore.getState().clickCell({ x: 3, y: 3 });
    let state = useGameStore.getState();

    expect(state.selectedCardAnchor).toEqual({ x: 3, y: 3 });

    useGameStore.getState().clickCell({ x: 4, y: 3 });
    state = useGameStore.getState();

    expect(state.currentPlayer).toBe("player2");
    expect(state.obstacles).toEqual([{ x: 3, y: 3 }, { x: 4, y: 3 }, { x: 5, y: 3 }]);
    expect(state.players.player1.usedCardCount).toBe(1);
  });
});

describe("AI策略", () => {
  it("AI 不会把12号倒吊人当作普通即时牌主动打出", () => {
    const state = createState({
      gameMode: "pve",
      aiDifficulty: "hard",
      currentPlayer: "player2",
      phase: "skill",
      players: {
        player2: {
          hand: ["hangedman"],
        },
      },
    });

    expect(chooseAiSkillPlan(state)).toBeNull();
  });

  it("AI 会利用倒吊人被动优先使用双倍14号节制", () => {
    const state = createState({
      gameMode: "pve",
      aiDifficulty: "hard",
      currentPlayer: "player2",
      phase: "skill",
      players: {
        player1: {
          hand: ["tower", "swords8", "obstacle"],
        },
        player2: {
          hand: ["temperance", "hangedman", "fate", "chalice"],
        },
      },
    });

    expect(chooseAiSkillPlan(state)).toEqual({ card: "temperance" });
  });

  it("AI 会在倒吊人妨碍圣杯与高塔脱困时主动舍弃倒吊人", () => {
    const state = createState({
      gameMode: "pve",
      aiDifficulty: "hard",
      currentPlayer: "player2",
      phase: "skill",
      players: {
        player1: {
          hand: [],
        },
        player2: {
          position: { x: 8, y: 8 },
          hand: ["hangedman", "chalice", "tower", "fate"],
        },
      },
      obstacles: getNeighbors({ x: 8, y: 8 }).filter((cell) => cell.x !== 7 || cell.y !== 8),
    });

    expect(chooseAiSkillPlan(state)).toEqual({ card: "hangedman" });
  });

  it("AI 在高压弃牌时会优先丢弃妨碍脱困的倒吊人", () => {
    const state = createState({
      gameMode: "pve",
      aiDifficulty: "hard",
      currentPlayer: "player2",
      players: {
        player2: {
          position: { x: 8, y: 8 },
          hand: ["hangedman", "chalice", "tower", "obstacle"],
        },
      },
      obstacles: getNeighbors({ x: 8, y: 8 }).filter((cell) => cell.x !== 7 || cell.y !== 8),
    });

    expect(chooseAiDiscardCard(state)).toBe("hangedman");
  });

  it("AI 在命运阶段会选择对当前局面更有利的结果", () => {
    const state = createState({
      gameMode: "pve",
      aiDifficulty: "hard",
      currentPlayer: "player2",
      phase: "fate",
      players: {
        player2: {
          position: { x: 4, y: 4 },
        },
      },
      obstacles: [
        { x: 5, y: 4 },
        { x: 5, y: 5 },
        { x: 4, y: 5 },
      ],
      fateState: {
        caster: "player2",
        choices: ["empress", "sun", "death"],
        revealedIndices: [],
        pendingPlayer: "player2",
        revealedBy: {},
      },
    });

    expect(chooseAiFateChoice(state)).toBe(1);
  });

  it("困难 AI 会优先直接打出 18号月亮 封死对手最后的出口", () => {
    const rivalPosition = { x: 1, y: 1 };
    const allNeighborCells = getNeighbors(rivalPosition);
    const escapeCell = allNeighborCells[0]!;
    const blockedCells = allNeighborCells.filter((cell) => cell.x !== escapeCell.x || cell.y !== escapeCell.y);

    const state = createState({
      gameMode: "pve",
      aiDifficulty: "hard",
      currentPlayer: "player2",
      players: {
        player1: {
          id: "player1",
          name: "占星师",
          position: rivalPosition,
          hand: [],
          moveCount: 0,
          usedCardCount: 0,
          lockedTurns: 0,
          randomMovePending: false,
        },
        player2: {
          id: "player2",
          name: "命运傀儡",
          position: { x: 8, y: 8 },
          hand: ["obstacle"],
          moveCount: 0,
          usedCardCount: 0,
          lockedTurns: 0,
          randomMovePending: false,
        },
      },
      obstacles: blockedCells,
    });

    const action = chooseAiMovePhaseAction(state);

    expect(action).toEqual({
      type: "direct-skill",
      plan: { card: "obstacle", target: escapeCell },
    });
  });

  it("AI 在弃牌阶段会优先丢弃当前无法使用的牌", () => {
    const state = createState({
      gameMode: "pve",
      aiDifficulty: "hard",
      currentPlayer: "player2",
      players: {
        player1: {
          id: "player1",
          name: "占星师",
          position: { x: 1, y: 1 },
          hand: [],
          moveCount: 0,
          usedCardCount: 0,
          lockedTurns: 0,
          randomMovePending: false,
        },
        player2: {
          id: "player2",
          name: "命运傀儡",
          position: { x: 8, y: 8 },
          hand: ["storm", "tower", "obstacle", "swords8"],
          moveCount: 0,
          usedCardCount: 0,
          lockedTurns: 0,
          randomMovePending: false,
        },
      },
      obstacles: [],
    });

    expect(chooseAiDiscardCard(state)).toBe("storm");
  });

  it("AI 无法移动时会改为直接使用可用卡牌，而不是持续空转", () => {
    const aiPosition = { x: 8, y: 8 };
    const blockedCells = getNeighbors(aiPosition);
    const state = createState({
      gameMode: "pve",
      aiDifficulty: "hard",
      currentPlayer: "player2",
      players: {
        player1: {
          id: "player1",
          name: "占星师",
          position: { x: 1, y: 1 },
          hand: [],
          moveCount: 0,
          usedCardCount: 0,
          lockedTurns: 0,
          randomMovePending: false,
        },
        player2: {
          id: "player2",
          name: "命运傀儡",
          position: aiPosition,
          hand: ["obstacle"],
          moveCount: 0,
          usedCardCount: 0,
          lockedTurns: 0,
          randomMovePending: false,
        },
      },
      obstacles: blockedCells,
    });

    expect(chooseAiMovePhaseAction(state)).toMatchObject({
      type: "direct-skill",
      plan: { card: "obstacle" },
    });
  });

  it("AI 手牌接近上限时会更积极选择合适的技能，而不是一直囤牌", () => {
    const rivalPosition = { x: 1, y: 1 };
    const state = createState({
      gameMode: "pve",
      aiDifficulty: "hard",
      currentPlayer: "player2",
      phase: "skill",
      players: {
        player1: {
          id: "player1",
          name: "占星师",
          position: rivalPosition,
          hand: [],
          moveCount: 0,
          usedCardCount: 0,
          lockedTurns: 0,
          randomMovePending: false,
        },
        player2: {
          id: "player2",
          name: "命运傀儡",
          position: { x: 8, y: 8 },
          hand: ["obstacle", "fool", "tower", "swords8"],
          moveCount: 0,
          usedCardCount: 0,
          lockedTurns: 0,
          randomMovePending: false,
        },
      },
      obstacles: [getNeighbors(rivalPosition)[1]!],
    });

    expect(chooseAiSkillPlan(state)).not.toBeNull();
  });

  it("困难 AI 在移动阶段会主动直出压制牌，而不是优先随便走一步", () => {
    const rivalPosition = { x: 4, y: 4 };
    const rivalNeighbors = getNeighbors(rivalPosition);
    const escapeCells = rivalNeighbors.slice(0, 2);
    const blockedCells = rivalNeighbors.slice(2);

    expect(escapeCells).toHaveLength(2);

    const state = createState({
      gameMode: "pve",
      aiDifficulty: "hard",
      currentPlayer: "player2",
      players: {
        player1: {
          id: "player1",
          name: "占星师",
          position: rivalPosition,
          hand: [],
          moveCount: 0,
          usedCardCount: 0,
          lockedTurns: 0,
          randomMovePending: false,
        },
        player2: {
          id: "player2",
          name: "命运傀儡",
          position: { x: 8, y: 8 },
          hand: ["obstacle", "obstacle", "obstacle"],
          moveCount: 0,
          usedCardCount: 0,
          lockedTurns: 0,
          randomMovePending: false,
        },
      },
      obstacles: blockedCells,
    });

    const action = chooseAiMovePhaseAction(state);

    expect(action).toMatchObject({
      type: "direct-skill",
      plan: { card: "obstacle" },
    });
    if (action.type === "direct-skill" && action.plan.card === "obstacle") {
      expect(escapeCells).toContainEqual(action.plan.target);
    }
  });

  it("困难 AI 会避免走入可被对手下一手月亮封死的陷阱格", () => {
    const origin = { x: 5, y: 4 };
    const originNeighbors = getNeighbors(origin);
    const trapCell = originNeighbors[0];
    const safeCell = originNeighbors[3];

    expect(trapCell).toBeDefined();
    expect(safeCell).toBeDefined();

    const trapNeighbors = getNeighbors(trapCell!);
    const trapBlockedCells = trapNeighbors.filter(
      (cell) => cell.x !== origin.x || cell.y !== origin.y,
    );
    const originBlockedCells = originNeighbors.filter(
      (cell) =>
        (cell.x !== trapCell!.x || cell.y !== trapCell!.y) &&
        (cell.x !== safeCell!.x || cell.y !== safeCell!.y),
    );

    const state = createState({
      gameMode: "pve",
      aiDifficulty: "hard",
      currentPlayer: "player2",
      players: {
        player1: {
          id: "player1",
          name: "占星师",
          position: { x: 1, y: 1 },
          hand: ["obstacle"],
          moveCount: 0,
          usedCardCount: 0,
          lockedTurns: 0,
          randomMovePending: false,
        },
        player2: {
          id: "player2",
          name: "命运傀儡",
          position: origin,
          hand: [],
          moveCount: 0,
          usedCardCount: 0,
          lockedTurns: 0,
          randomMovePending: false,
        },
      },
      obstacles: [...trapBlockedCells, ...originBlockedCells],
    });

    const action = chooseAiMovePhaseAction(state);

    expect(action.type).toBe("move");
    if (action.type === "move") {
      expect(action.target).not.toEqual(trapCell);
      expect(action.target).toEqual(safeCell);
    }
  });
});
