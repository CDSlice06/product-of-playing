import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGameStore } from "@/store/gameStore";
import type { GameState } from "@/types/game";
import { applyStorm, getSwordEightSecondCells, getSwordEightStartCells, placeObstacle, placeSwordEightObstacles } from "@/utils/cards";
import { BOARD_SIZE, MAX_HAND_SIZE, TURN_DURATION_MS, getNeighbors, toPositionKey } from "@/utils/board";
import { getLegalMoves, getTowerMoves, isLegalMove, resolveWinner } from "@/utils/judge";

function createState(overrides?: Partial<GameState>): GameState {
  return {
    boardSize: BOARD_SIZE,
    gameMode: "pvp",
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
    obstacles: [],
    selectedCard: null,
    selectedCardAnchor: null,
    pendingDrawCard: null,
    winner: null,
    winReason: null,
    startedAt: 0,
    endedAt: null,
    turnEndsAt: TURN_DURATION_MS,
    message: "",
    ...overrides,
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
