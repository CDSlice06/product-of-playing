import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Compass, Stars } from "lucide-react";
import { useNavigate } from "react-router-dom";
import Board from "@/components/Board";
import HandPanel from "@/components/HandPanel";
import PlayerPanel from "@/components/PlayerPanel";
import ResultModal from "@/components/ResultModal";
import { useGameStore } from "@/store/gameStore";
import type { GameState, PlayerId, Position } from "@/types/game";
import { createBoardCells, getNeighbors, getOccupantAt, isCellEmpty, otherPlayer } from "@/utils/board";
import {
  applyStorm,
  canUseCard,
  getStormTargetCenters,
  getSwordEightSecondCells,
  getSwordEightStartCells,
  placeObstacle,
  placeSwordEightObstacles,
  swapPlayers,
} from "@/utils/cards";
import { getLegalMoves, getTowerMoves, resolveWinner } from "@/utils/judge";

type AiSkillPlan =
  | { card: "fool" | "chalice" }
  | { card: "obstacle" | "storm" | "tower"; target: Position }
  | { card: "swords8"; start: Position; second: Position };

function countAdjacentObstacles(state: GameState, playerId: PlayerId) {
  return getNeighbors(state.players[playerId].position, state.boardSize).filter(
    (position) => getOccupantAt(state, position) === "obstacle",
  ).length;
}

function evaluateStateForAi(state: GameState, playerId: PlayerId) {
  const rival = otherPlayer(playerId);
  const result = resolveWinner(state, playerId);

  if (result) {
    return result.winner === playerId ? 100_000 : -100_000;
  }

  const ownMoves = getLegalMoves(state, playerId).length;
  const rivalMoves = getLegalMoves(state, rival).length;
  const ownPressure = countAdjacentObstacles(state, playerId);
  const rivalPressure = countAdjacentObstacles(state, rival);

  return (
    ownMoves * 14
    - rivalMoves * 18
    - ownPressure * 10
    + rivalPressure * 14
    + (state.players[rival].randomMovePending ? 8 : 0)
    + state.players[playerId].hand.length
  );
}

function createLoopingRandom(values: number[]) {
  let index = 0;

  return () => {
    const value = values[index % values.length] ?? 0.5;
    index += 1;
    return value;
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
      },
    },
  };
}

function simulateObstacle(state: GameState, target: Position) {
  const nextObstacles = placeObstacle(state, target);
  if (!nextObstacles) {
    return null;
  }

  return {
    ...state,
    obstacles: nextObstacles,
  };
}

function simulateSwordEight(state: GameState, start: Position, second: Position) {
  const nextObstacles = placeSwordEightObstacles(state, start, second);
  if (!nextObstacles) {
    return null;
  }

  return {
    ...state,
    obstacles: nextObstacles,
  };
}

function simulateTower(state: GameState, playerId: PlayerId, target: Position) {
  return {
    ...state,
    players: {
      ...state.players,
      [playerId]: {
        ...state.players[playerId],
        position: target,
      },
    },
  };
}

function simulateChalice(state: GameState) {
  return {
    ...state,
    players: {
      ...state.players,
      ...swapPlayers(state),
    },
  };
}

function simulateFool(state: GameState, playerId: PlayerId) {
  const rival = otherPlayer(playerId);

  return {
    ...state,
    players: {
      ...state.players,
      [rival]: {
        ...state.players[rival],
        randomMovePending: true,
      },
    },
  };
}

function scoreMove(state: GameState, playerId: PlayerId, target: Position) {
  return evaluateStateForAi(simulateMove(state, playerId, target), playerId);
}

function chooseBestMove(state: GameState, playerId: PlayerId) {
  const legalMoves = getLegalMoves(state, playerId);
  if (legalMoves.length === 0) {
    return null;
  }

  return [...legalMoves].sort((left, right) => scoreMove(state, playerId, right) - scoreMove(state, playerId, left))[0] ?? null;
}

function chooseTowerTarget(state: GameState, playerId: PlayerId) {
  const targets = getTowerMoves(state, playerId);
  if (targets.length === 0) {
    return null;
  }

  return [...targets].sort((left, right) =>
    evaluateStateForAi(simulateTower(state, playerId, right), playerId)
    - evaluateStateForAi(simulateTower(state, playerId, left), playerId))[0] ?? null;
}

function chooseObstacleTarget(state: GameState, playerId: PlayerId) {
  const candidates = createBoardCells(state.boardSize)
    .flat()
    .filter((cell) => isCellEmpty({ players: state.players, obstacles: state.obstacles }, cell));

  return [...candidates].sort((left, right) => {
    const rightState = simulateObstacle(state, right);
    const leftState = simulateObstacle(state, left);
    const rightScore = rightState ? evaluateStateForAi(rightState, playerId) : -Infinity;
    const leftScore = leftState ? evaluateStateForAi(leftState, playerId) : -Infinity;
    return rightScore - leftScore;
  })[0] ?? null;
}

function chooseSwordEightPlacement(state: GameState, playerId: PlayerId) {
  const starts = getSwordEightStartCells(state);
  if (starts.length === 0) {
    return null;
  }

  let bestPlacement: { start: Position; second: Position } | null = null;
  let bestScore = -Infinity;

  starts.forEach((start) => {
    getSwordEightSecondCells(state, start).forEach((second) => {
      const simulatedState = simulateSwordEight(state, start, second);
      if (!simulatedState) {
        return;
      }

      const score = evaluateStateForAi(simulatedState, playerId);
      if (score > bestScore) {
        bestScore = score;
        bestPlacement = { start, second };
      }
    });
  });

  return bestPlacement;
}

function chooseSwordEightSecondCell(state: GameState, playerId: PlayerId, start: Position) {
  const secondCells = getSwordEightSecondCells(state, start);
  if (secondCells.length === 0) {
    return null;
  }

  return [...secondCells].sort((left, right) => {
    const rightState = simulateSwordEight(state, start, right);
    const leftState = simulateSwordEight(state, start, left);
    const rightScore = rightState ? evaluateStateForAi(rightState, playerId) : -Infinity;
    const leftScore = leftState ? evaluateStateForAi(leftState, playerId) : -Infinity;
    return rightScore - leftScore;
  })[0] ?? null;
}

function chooseStormTarget(state: GameState, playerId: PlayerId) {
  const targets = getStormTargetCenters(state);
  if (targets.length === 0) {
    return null;
  }

  return [...targets].sort((left, right) => {
    const leftScores = [
      applyStorm(state, left, createLoopingRandom([0.11, 0.37, 0.73])),
      applyStorm(state, left, createLoopingRandom([0.19, 0.43, 0.91])),
      applyStorm(state, left, createLoopingRandom([0.07, 0.29, 0.61])),
    ]
      .filter((result): result is NonNullable<ReturnType<typeof applyStorm>> => Boolean(result))
      .map((result) => evaluateStateForAi({ ...state, players: result.players, obstacles: result.obstacles }, playerId));

    const rightScores = [
      applyStorm(state, right, createLoopingRandom([0.11, 0.37, 0.73])),
      applyStorm(state, right, createLoopingRandom([0.19, 0.43, 0.91])),
      applyStorm(state, right, createLoopingRandom([0.07, 0.29, 0.61])),
    ]
      .filter((result): result is NonNullable<ReturnType<typeof applyStorm>> => Boolean(result))
      .map((result) => evaluateStateForAi({ ...state, players: result.players, obstacles: result.obstacles }, playerId));

    const leftScore = leftScores.reduce((sum, score) => sum + score, 0) / Math.max(leftScores.length, 1);
    const rightScore = rightScores.reduce((sum, score) => sum + score, 0) / Math.max(rightScores.length, 1);
    return rightScore - leftScore;
  })[0] ?? null;
}

function chooseAiSkillPlan(state: GameState): AiSkillPlan | null {
  const playerId = state.currentPlayer;
  const baselineScore = evaluateStateForAi(state, playerId);
  const plans: Array<{ plan: AiSkillPlan; score: number }> = [];

  if (canUseCard(state, playerId, "obstacle")) {
    const target = chooseObstacleTarget(state, playerId);
    const simulatedState = target ? simulateObstacle(state, target) : null;
    if (target && simulatedState) {
      plans.push({ plan: { card: "obstacle", target }, score: evaluateStateForAi(simulatedState, playerId) });
    }
  }

  if (canUseCard(state, playerId, "swords8")) {
    const placement = chooseSwordEightPlacement(state, playerId);
    const simulatedState = placement ? simulateSwordEight(state, placement.start, placement.second) : null;
    if (placement && simulatedState) {
      plans.push({ plan: { card: "swords8", ...placement }, score: evaluateStateForAi(simulatedState, playerId) });
    }
  }

  if (canUseCard(state, playerId, "fool")) {
    plans.push({
      plan: { card: "fool" },
      score: evaluateStateForAi(simulateFool(state, playerId), playerId),
    });
  }

  if (canUseCard(state, playerId, "storm")) {
    const target = chooseStormTarget(state, playerId);
    if (target) {
      const stormResult = applyStorm(state, target, createLoopingRandom([0.17, 0.41, 0.83]));
      if (stormResult) {
        plans.push({
          plan: { card: "storm", target },
          score: evaluateStateForAi({ ...state, players: stormResult.players, obstacles: stormResult.obstacles }, playerId),
        });
      }
    }
  }

  if (canUseCard(state, playerId, "chalice")) {
    plans.push({
      plan: { card: "chalice" },
      score: evaluateStateForAi(simulateChalice(state), playerId),
    });
  }

  if (canUseCard(state, playerId, "tower")) {
    const target = chooseTowerTarget(state, playerId);
    if (target) {
      plans.push({
        plan: { card: "tower", target },
        score: evaluateStateForAi(simulateTower(state, playerId, target), playerId),
      });
    }
  }

  const bestPlan = [...plans].sort((left, right) => right.score - left.score)[0];
  if (!bestPlan || bestPlan.score <= baselineScore + 1) {
    return null;
  }

  return bestPlan.plan;
}

function runAiTurn() {
  const snapshot = useGameStore.getState();
  if (snapshot.gameMode !== "pve" || snapshot.currentPlayer !== "player2" || snapshot.winner) {
    return;
  }

  if (snapshot.phase === "discard") {
    const firstCard = snapshot.players.player2.hand[0];
    if (firstCard) {
      useGameStore.getState().selectCard(firstCard);
    }
    return;
  }

  if (snapshot.phase === "move") {
    const legalMoves = getLegalMoves(snapshot, "player2");

    if (legalMoves.length === 0) {
      if (canUseCard(snapshot, "player2", "chalice")) {
        useGameStore.getState().selectCard("chalice");
        return;
      }

      if (canUseCard(snapshot, "player2", "tower")) {
        const towerTarget = chooseTowerTarget(snapshot, "player2");
        if (towerTarget) {
          useGameStore.getState().selectCard("tower");
          useGameStore.getState().clickCell(towerTarget);
          return;
        }
      }

      if (canUseCard(snapshot, "player2", "storm")) {
        const target = chooseStormTarget(snapshot, "player2");
        if (target) {
          useGameStore.getState().selectCard("storm");
          useGameStore.getState().clickCell(target);
        }
      }
      return;
    }

    const moveTarget = chooseBestMove(snapshot, "player2");
    if (moveTarget) {
      useGameStore.getState().moveCurrentPlayer(moveTarget);
    }
    return;
  }

  if (snapshot.phase === "skill") {
    if (snapshot.selectedCard === "swords8") {
      if (snapshot.selectedCardAnchor) {
        const second = chooseSwordEightSecondCell(snapshot, "player2", snapshot.selectedCardAnchor);
        if (second) {
          useGameStore.getState().clickCell(second);
          return;
        }

        useGameStore.getState().cancelSelectedCard();
        return;
      }

      const placement = chooseSwordEightPlacement(snapshot, "player2");
      if (placement) {
        useGameStore.getState().clickCell(placement.start);
        return;
      }
    }

    const skillPlan = chooseAiSkillPlan(snapshot);

    if (!skillPlan) {
      useGameStore.getState().skipSkillPhase();
      return;
    }

    if (skillPlan.card === "fool" || skillPlan.card === "chalice") {
      useGameStore.getState().selectCard(skillPlan.card);
      return;
    }

    if (skillPlan.card === "obstacle") {
      useGameStore.getState().selectCard("obstacle");
      useGameStore.getState().clickCell(skillPlan.target);
      return;
    }

    if (skillPlan.card === "storm") {
      useGameStore.getState().selectCard("storm");
      useGameStore.getState().clickCell(skillPlan.target);
      return;
    }

    if (skillPlan.card === "tower") {
      useGameStore.getState().selectCard("tower");
      useGameStore.getState().clickCell(skillPlan.target);
      return;
    }

    if (skillPlan.card === "swords8") {
      useGameStore.getState().selectCard("swords8");
      useGameStore.getState().clickCell(skillPlan.start);
      return;
    }

    useGameStore.getState().skipSkillPhase();
  }
}

export default function Battle() {
  const navigate = useNavigate();
  const state = useGameStore();
  const [clock, setClock] = useState(Date.now());
  const currentPlayer = state.players[state.currentPlayer];
  const isAiTurn = state.gameMode === "pve" && state.currentPlayer === "player2" && !state.winner;
  const interactionLocked = isAiTurn;
  const timeReference = state.endedAt ?? clock;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setClock(Date.now());
      useGameStore.getState().expireTurn();
    }, 250);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!isAiTurn) {
      return;
    }

    const timer = window.setTimeout(() => {
      runAiTurn();
    }, 650);

    return () => window.clearTimeout(timer);
  }, [isAiTurn, state.phase, state.pendingDrawCard, state.selectedCard, state.selectedCardAnchor, state.players, state.obstacles]);

  const elapsedSeconds = Math.max(0, Math.floor((timeReference - state.startedAt) / 1000));
  const remainingSeconds = state.phase === "gameover" ? 0 : Math.max(0, Math.ceil((state.turnEndsAt - timeReference) / 1000));
  const allCells = useMemo(() => createBoardCells(state.boardSize).flat(), [state.boardSize]);
  const legalMoves = getLegalMoves(state, state.currentPlayer);

  const highlightedCells = (() => {
    if (state.phase === "discard") {
      return [];
    }

    if (state.selectedCard) {
      if (state.selectedCard === "obstacle") {
        return allCells.filter((cell) => isCellEmpty({ players: state.players, obstacles: state.obstacles }, cell));
      }

      if (state.selectedCard === "swords8") {
        return state.selectedCardAnchor
          ? getSwordEightSecondCells(state, state.selectedCardAnchor)
          : getSwordEightStartCells(state);
      }

      if (state.selectedCard === "tower") {
        return getTowerMoves(state, state.currentPlayer);
      }

      if (state.selectedCard === "storm") {
        return getStormTargetCenters(state);
      }

      return allCells;
    }

    if (state.phase === "move") {
      return legalMoves;
    }

    return [];
  })();

  const dangerCells = state.selectedCard === "swords8" && state.selectedCardAnchor ? [state.selectedCardAnchor] : [];

  const handleBoardClick = (position: Position) => {
    if (interactionLocked) {
      return;
    }
    state.clickCell(position);
  };

  const handleReturnHome = () => {
    state.resetGame();
    navigate("/");
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.14),_transparent_28%),radial-gradient(circle_at_bottom,_rgba(245,158,11,0.18),_transparent_34%),linear-gradient(180deg,_#020617_0%,_#0f172a_100%)] px-4 py-6 text-slate-50">
      <div className="mx-auto flex max-w-6xl flex-col gap-5">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={handleReturnHome}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-100 transition hover:bg-white/10"
          >
            <ArrowLeft className="size-4" />
            返回主菜单
          </button>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300">
            <Compass className="size-4" />
            本局时长 {elapsedSeconds}s
          </div>
        </div>

        <section className="rounded-[2rem] border border-white/10 bg-slate-950/60 p-5 shadow-[0_30px_80px_rgba(15,23,42,0.35)] backdrop-blur-xl">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.38em] text-slate-500">Arcane Duel Prototype</p>
              <h1 className="mt-2 font-display text-4xl text-slate-50">双人塔罗策略对战</h1>
              <p className="mt-3 max-w-2xl text-sm text-slate-300">
                当前规则为 10x10 六边形棋盘，移动严格按相邻 6 格判定。整局不限时，每回合限时 60 秒，支持双人对战与人机对战。
              </p>
            </div>
            <div className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm text-cyan-50">
              {state.gameMode === "pve" ? "人机对战" : "双人对战"} | 当前行动者：{currentPlayer.name}
            </div>
          </div>
        </section>

        <PlayerPanel
          currentPlayer={state.currentPlayer}
          remainingSeconds={remainingSeconds}
          players={state.players}
        />

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="space-y-4">
            <div className="rounded-[1.75rem] border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
              <div className="flex items-center gap-2 text-amber-100">
                <Stars className="size-4" />
                行动提示
              </div>
              <p className="mt-2 text-slate-300">{state.message}</p>
              {isAiTurn && <p className="mt-2 text-xs text-cyan-200/80">AI 正在思考，请稍候...</p>}
            </div>

            <Board
              state={state}
              highlightedCells={highlightedCells}
              dangerCells={dangerCells}
              onCellClick={handleBoardClick}
            />
          </div>

          <HandPanel
            hand={currentPlayer.hand}
            selectedCard={state.selectedCard}
            phase={state.phase}
            pendingDrawCard={state.pendingDrawCard}
            onSelectCard={(card) => {
              if (!interactionLocked) {
                state.selectCard(card);
              }
            }}
            onCancelCard={() => {
              if (!interactionLocked) {
                state.cancelSelectedCard();
              }
            }}
            onSkipSkill={() => {
              if (!interactionLocked) {
                state.skipSkillPhase();
              }
            }}
          />
        </div>
      </div>

      {state.winner && state.winReason && (
        <ResultModal
          winner={state.winner}
          winReason={state.winReason}
          elapsedSeconds={elapsedSeconds}
          players={state.players}
          onReplay={state.resetGame}
          onBackHome={handleReturnHome}
        />
      )}
    </main>
  );
}
