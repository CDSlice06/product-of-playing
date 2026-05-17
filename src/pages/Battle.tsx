import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import BattleHud from "@/components/BattleHud";
import BattleSummary from "@/components/BattleSummary";
import DungeonBoard from "@/components/DungeonBoard";
import PlayerStatusBar from "@/components/PlayerStatusBar";
import SkillBar from "@/components/SkillBar";
import { ensureBattleSession, fetchBattleSession, saveBattleSessionState, subscribeBattleSession } from "@/lib/battleSession";
import { settleRankedMatch } from "@/lib/ranked";
import { useGameStore } from "@/store/gameStore";
import type { Position } from "@/types/game";
import { getGameStateSnapshot } from "@/store/gameStore";
import { useSessionStore } from "@/store/sessionStore";
import { ASSETS } from "@/constants/assets";
import { TURN_DURATION_MS, createBoardCells, isCellEmpty } from "@/utils/board";
import {
  getFoolObstacleTargets,
  getFoolSwordEightPlacements,
  getStormTargetCenters,
  getSwordEightSecondCells,
  getSwordEightStartCells,
} from "@/utils/cards";
import {
  chooseAiDiscardCard,
  chooseAiFateChoice,
  chooseAiMovePhaseAction,
  chooseAiSkillPlan,
  chooseSwordEightSecondCell,
} from "@/utils/ai";
import { getLegalMoves, getTowerMoves } from "@/utils/judge";
import type { GameState } from "@/types/game";
import type { BattleSessionRecord } from "@/types/platform";

function buildAiStateKey(state: GameState) {
  return [
    state.gameMode,
    state.aiDifficulty,
    state.currentPlayer,
    state.phase,
    state.selectedCard ?? "none",
    state.selectedCardAnchor ? `${state.selectedCardAnchor.x},${state.selectedCardAnchor.y}` : "none",
    state.repeatCard ?? "none",
    state.pendingDrawCard ?? "none",
    state.fateState?.pendingPlayer ?? "none",
    state.fateState?.revealedIndices.join(",") ?? "none",
    state.pendingFateTriggers.map((trigger) => `${trigger.caster}:${trigger.recipient}:${trigger.triggerAfterTurnOf}`).join("|"),
    state.winner ?? "none",
    state.players.player1.position.x,
    state.players.player1.position.y,
    state.players.player1.randomMovePending ? 1 : 0,
    state.players.player1.hand.join(","),
    state.players.player2.position.x,
    state.players.player2.position.y,
    state.players.player2.randomMovePending ? 1 : 0,
    state.players.player2.hand.join(","),
    state.obstacles.map((obstacle) => `${obstacle.x},${obstacle.y}`).join("|"),
  ].join("::");
}

function runAiTurn(snapshot = useGameStore.getState()) {
  if (snapshot.gameMode !== "pve" || snapshot.currentPlayer !== "player2" || snapshot.winner) {
    return;
  }

  if (snapshot.phase === "discard") {
    const discardCard = chooseAiDiscardCard(snapshot);
    if (discardCard) {
      useGameStore.getState().selectCard(discardCard);
    }
    return;
  }

  if (snapshot.phase === "fate") {
    const choiceIndex = chooseAiFateChoice(snapshot);
    if (choiceIndex !== null && choiceIndex >= 0) {
      useGameStore.getState().selectFateChoice(choiceIndex);
    }
    return;
  }

  if (snapshot.selectedCard === "swords8" && snapshot.selectedCardAnchor) {
    const second = chooseSwordEightSecondCell(
      snapshot,
      "player2",
      snapshot.aiDifficulty,
      snapshot.selectedCardAnchor,
    );
    if (second) {
      useGameStore.getState().clickCell(second);
      return;
    }

    useGameStore.getState().cancelSelectedCard();
    return;
  }

  if (snapshot.phase === "move") {
    const action = chooseAiMovePhaseAction(snapshot);

    if (action.type === "move") {
      useGameStore.getState().moveCurrentPlayer(action.target);
      return;
    }

    if (action.type === "direct-skill") {
      if (
        action.plan.card === "fool"
        || action.plan.card === "chalice"
        || action.plan.card === "temperance"
        || action.plan.card === "hangedman"
        || action.plan.card === "fate"
      ) {
        useGameStore.getState().selectCard(action.plan.card);
        return;
      }

      if (action.plan.card === "swords8") {
        useGameStore.getState().selectCard("swords8");
        useGameStore.getState().clickCell(action.plan.start);
        return;
      }

      if (action.plan.card === "obstacle" || action.plan.card === "storm" || action.plan.card === "tower") {
        useGameStore.getState().selectCard(action.plan.card);
        useGameStore.getState().clickCell(action.plan.target);
        return;
      }
    }

    if (action.type === "pass") {
      useGameStore.getState().endCurrentTurn();
    }
    return;
  }

  if (snapshot.phase === "skill") {
    const skillPlan = chooseAiSkillPlan(snapshot);

    if (!skillPlan) {
      useGameStore.getState().skipSkillPhase();
      return;
    }

    if (
      skillPlan.card === "fool"
      || skillPlan.card === "chalice"
      || skillPlan.card === "temperance"
      || skillPlan.card === "hangedman"
      || skillPlan.card === "fate"
    ) {
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
  const [searchParams] = useSearchParams();
  const authUserId = useSessionStore((state) => state.authUserId);
  const refreshProfile = useSessionStore((state) => state.refreshProfile);
  const state = useGameStore();
  const hydrateGameState = useGameStore((store) => store.hydrateGameState);
  const [clock, setClock] = useState(Date.now());
  const [onlineSession, setOnlineSession] = useState<BattleSessionRecord | null>(null);
  const [onlineLoading, setOnlineLoading] = useState(Boolean(searchParams.get("roomId")));
  const [onlineError, setOnlineError] = useState<string | null>(null);
  const [rankedSettlementMessage, setRankedSettlementMessage] = useState<string | null>(null);
  const aiRunTokenRef = useRef(0);
  const onlineSessionRef = useRef<BattleSessionRecord | null>(null);
  const applyingRemoteStateRef = useRef(false);
  const rankedSettlementRef = useRef<string | null>(null);
  const lastSyncedStateRef = useRef("");
  const roomId = searchParams.get("roomId");
  const isOnlineBattle = Boolean(roomId && authUserId);
  const localPlayerId = useMemo(() => {
    if (!onlineSession || !authUserId) {
      return null;
    }

    if (onlineSession.player1UserId === authUserId) {
      return "player1" as const;
    }

    if (onlineSession.player2UserId === authUserId) {
      return "player2" as const;
    }

    return null;
  }, [authUserId, onlineSession]);
  const currentPlayer = state.players[state.currentPlayer] ?? state.players.player1;
  const visibleHandOwner = isOnlineBattle && localPlayerId ? state.players[localPlayerId] : currentPlayer;
  const isAiTurn = !isOnlineBattle && state.gameMode === "pve" && state.currentPlayer === "player2" && !state.winner;
  const interactionLocked =
    isAiTurn
    || (isOnlineBattle && (!localPlayerId || state.currentPlayer !== localPlayerId || onlineLoading));
  const timeReference = state.endedAt ?? clock;
  const aiThinking = isAiTurn && state.phase !== "gameover";
  const aiStateKey = useMemo(() => buildAiStateKey(state), [state]);

  useEffect(() => {
    onlineSessionRef.current = onlineSession;
  }, [onlineSession]);

  useEffect(() => {
    if (!isOnlineBattle || !roomId) {
      setOnlineLoading(false);
      setOnlineError(null);
      return;
    }

    let active = true;
    setOnlineLoading(true);
    setOnlineError(null);

    ensureBattleSession(roomId)
      .then((record) => {
        if (!active) {
          return;
        }
        setOnlineSession(record.session);
        if (record.state) {
          applyingRemoteStateRef.current = true;
          hydrateGameState(record.state);
          lastSyncedStateRef.current = JSON.stringify(record.state);
          window.setTimeout(() => {
            applyingRemoteStateRef.current = false;
          }, 0);
        }
      })
      .catch((error) => {
        if (!active) {
          return;
        }
        setOnlineError(error instanceof Error ? error.message : "初始化联机战斗失败。");
      })
      .finally(() => {
        if (active) {
          setOnlineLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [hydrateGameState, isOnlineBattle, roomId]);

  useEffect(() => {
    if (!isOnlineBattle || !roomId) {
      return;
    }

    return subscribeBattleSession(roomId, async (record) => {
      const normalizedRecord = record.session.roomCode
        ? record
        : await fetchBattleSession(roomId);

      if (!normalizedRecord) {
        return;
      }

      setOnlineSession((previous) => ({
        ...(previous ?? normalizedRecord.session),
        ...normalizedRecord.session,
        roomCode: normalizedRecord.session.roomCode || previous?.roomCode || "",
      }));

      if (!normalizedRecord.state) {
        return;
      }

      const serialized = JSON.stringify(normalizedRecord.state);
      if (serialized === lastSyncedStateRef.current) {
        return;
      }

      applyingRemoteStateRef.current = true;
      hydrateGameState(normalizedRecord.state);
      lastSyncedStateRef.current = serialized;
      window.setTimeout(() => {
        applyingRemoteStateRef.current = false;
      }, 0);
    });
  }, [hydrateGameState, isOnlineBattle, roomId]);

  useEffect(() => {
    let timer: number | null = null;

    const tick = () => {
      const now = Date.now();
      setClock(now);
      const snapshot = useGameStore.getState();
      if (!isOnlineBattle || snapshot.currentPlayer === localPlayerId) {
        snapshot.expireTurn();
      }
      timer = window.setTimeout(tick, 250);
    };

    tick();

    return () => {
      if (timer !== null) {
        window.clearTimeout(timer);
      }
    };
  }, [isOnlineBattle, localPlayerId]);

  useEffect(() => {
    if (!isAiTurn) {
      aiRunTokenRef.current += 1;
      return;
    }

    const scheduledToken = aiRunTokenRef.current + 1;
    aiRunTokenRef.current = scheduledToken;
    const scheduledStateKey = aiStateKey;
    const timer = window.setTimeout(() => {
      if (aiRunTokenRef.current !== scheduledToken) {
        return;
      }

      const snapshot = useGameStore.getState();
      if (buildAiStateKey(snapshot) !== scheduledStateKey) {
        return;
      }

      runAiTurn(snapshot);
    }, 650);

    return () => {
      window.clearTimeout(timer);
      if (aiRunTokenRef.current === scheduledToken) {
        aiRunTokenRef.current += 1;
      }
    };
  }, [aiStateKey, isAiTurn]);

  useEffect(() => {
    if (!isOnlineBattle || !onlineSession || onlineLoading) {
      return;
    }

    const unsubscribe = useGameStore.subscribe((nextState) => {
      if (applyingRemoteStateRef.current) {
        return;
      }

      const serialized = JSON.stringify(getGameStateSnapshot(nextState));
      if (serialized === lastSyncedStateRef.current) {
        return;
      }

      const currentSession = onlineSessionRef.current;
      if (!currentSession) {
        return;
      }

      void saveBattleSessionState(currentSession, nextState)
        .then((saved) => {
          setOnlineSession((previous) => ({
            ...(previous ?? saved.session),
            ...saved.session,
            roomCode: saved.session.roomCode || previous?.roomCode || "",
          }));
          lastSyncedStateRef.current = JSON.stringify(saved.state ?? nextState);
        })
        .catch(async (error) => {
          const latest = roomId ? await fetchBattleSession(roomId) : null;
          if (latest?.state) {
            applyingRemoteStateRef.current = true;
            hydrateGameState(latest.state);
            lastSyncedStateRef.current = JSON.stringify(latest.state);
            setOnlineSession((previous) => ({
              ...(previous ?? latest.session),
              ...latest.session,
              roomCode: latest.session.roomCode || previous?.roomCode || "",
            }));
            window.setTimeout(() => {
              applyingRemoteStateRef.current = false;
            }, 0);
            return;
          }

          setOnlineError(error instanceof Error ? error.message : "联机对局同步失败。");
        });
    });

    return () => {
      unsubscribe();
    };
  }, [hydrateGameState, isOnlineBattle, onlineLoading, onlineSession, roomId]);

  useEffect(() => {
    if (
      !isOnlineBattle
      || !onlineSession
      || onlineSession.matchType !== "ranked"
      || !localPlayerId
      || !state.winner
    ) {
      return;
    }

    const settlementKey = `${onlineSession.roomId}:${state.winner}:${state.winReason ?? ""}`;
    if (rankedSettlementRef.current === settlementKey) {
      return;
    }
    rankedSettlementRef.current = settlementKey;

    const result = state.winner === localPlayerId ? "win" : "loss";
    setRankedSettlementMessage("正在自动结算本场天梯积分与段位...");

    void settleRankedMatch(onlineSession.roomId, result)
      .then(async () => {
        await refreshProfile();
        setRankedSettlementMessage(result === "win" ? "本场天梯已自动结算为胜利，积分和段位已更新。" : "本场天梯已自动结算为失利，积分和段位已更新。");
      })
      .catch(async (error) => {
        const message = error instanceof Error ? error.message : "自动结算天梯失败。";
        if (message.includes("已经结算过")) {
          await refreshProfile();
          setRankedSettlementMessage("本场天梯已完成结算，当前积分与段位已同步。");
          return;
        }
        setRankedSettlementMessage(message);
      });
  }, [isOnlineBattle, localPlayerId, onlineSession, refreshProfile, state.winReason, state.winner]);

  const elapsedSeconds = Math.max(0, Math.floor((timeReference - state.startedAt) / 1000));
  const remainingMs = state.phase === "gameover" ? 0 : Math.max(0, state.turnEndsAt - timeReference);
  const remainingSeconds = state.phase === "gameover"
    ? 0
    : Math.min(Math.ceil(TURN_DURATION_MS / 1000), Math.max(0, Math.ceil(remainingMs / 1000)));
  const remainingRatio = state.phase === "gameover" ? 0 : Math.max(0, Math.min(1, remainingMs / TURN_DURATION_MS));
  const allCells = useMemo(() => createBoardCells(state.boardSize).flat(), [state.boardSize]);
  const legalMoves = getLegalMoves(state, state.currentPlayer);

  const highlightedCells = (() => {
    if (state.phase === "discard" || state.phase === "fate") {
      return [];
    }

    if (state.selectedCard) {
      if (state.selectedCard === "obstacle") {
        if (state.players[state.currentPlayer].randomMovePending) {
          return getFoolObstacleTargets(state, state.currentPlayer);
        }
        return allCells.filter((cell) => isCellEmpty({ players: state.players, obstacles: state.obstacles }, cell));
      }

      if (state.selectedCard === "swords8") {
        if (state.players[state.currentPlayer].randomMovePending) {
          return getFoolSwordEightPlacements(state, state.currentPlayer).map((placement) => placement.start);
        }
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

  const remainingFateChoices = state.fateState?.choices.map((choice, index) => ({
    choice,
    index,
    revealed: state.fateState?.revealedIndices.includes(index) ?? false,
  })) ?? [];

  const handleReturnHome = () => {
    if (isOnlineBattle && onlineSession) {
      navigate(onlineSession.matchType === "ranked" ? "/ranked" : "/rooms");
      return;
    }

    state.resetGame();
    navigate("/");
  };

  const PHASE_LABELS: Record<string, string> = {
    move: "先移动一步，或直接打出一张塔罗技能",
    skill: "移动已完成，现在可以施放技能或结束回合",
    discard: "技能槽已满，请弃掉一张旧牌换入新牌",
    gameover: "战斗已结束，可以重开或返回大厅",
    fate: "抽取一张命运牌"
  };

  return (
    <main className="app-shell overflow-hidden text-slate-50 bg-black relative flex flex-col">
      <div className="absolute inset-0 z-0 opacity-40 pointer-events-none" style={{ backgroundImage: `url(${ASSETS.BATTLE_BG})`, backgroundSize: 'cover', backgroundPosition: 'center', filter: 'blur(2px)' }} />
      
      <header className="relative z-10 w-full flex-none px-4 py-2 flex items-center justify-between gap-4 bg-black/80 border-b-2 border-gray-800 shadow-md">
        <button
          type="button"
          onClick={handleReturnHome}
          className="flex items-center gap-2 py-2 px-4 bg-gray-800 hover:bg-gray-700 border-b-4 border-gray-900 active:border-b-0 active:translate-y-1 text-white font-bold transition-all text-shadow-pixel rounded shrink-0"
        >
          <ArrowLeft className="size-4" />
          <span className="hidden sm:inline">
            {isOnlineBattle ? (onlineSession?.matchType === "ranked" ? "放弃天梯" : "放弃房间") : "返回主菜单"}
          </span>
        </button>

        <div className="flex-1 max-w-2xl">
          <BattleHud
            mode={state.gameMode}
            currentPlayerName={currentPlayer.name}
            elapsedSeconds={elapsedSeconds}
            phaseText={PHASE_LABELS[state.phase] ?? "..."}
            message={state.message}
            isAiTurn={aiThinking}
          />
        </div>
      </header>

      {onlineError && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 rounded-[1.75rem] border border-rose-300/20 bg-rose-300/90 px-4 py-3 text-sm text-rose-50 shadow-lg">
          {onlineError}
        </div>
      )}

      {rankedSettlementMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 rounded-[1.75rem] border border-emerald-300/20 bg-emerald-300/90 px-4 py-3 text-sm text-emerald-50 shadow-lg">
          {rankedSettlementMessage}
        </div>
      )}

      {isOnlineBattle && onlineLoading && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-50 rounded-[1.75rem] border border-cyan-300/20 bg-cyan-300/90 px-4 py-3 text-sm text-cyan-50 shadow-lg">
          正在连接联机战斗会话并同步棋盘状态...
        </div>
      )}

      {state.phase === "fate" && state.fateState && (
        <div className="absolute top-24 left-1/2 -translate-x-1/2 z-40 rounded-[1.75rem] border border-amber-300/20 bg-amber-900/90 p-4 text-sm text-amber-50 shadow-2xl max-w-md w-full">
          <p className="text-xs uppercase tracking-[0.35em] text-amber-100/70">命运裁决</p>
          <h2 className="mt-2 font-display text-2xl">10号命运</h2>
          <p className="mt-2 text-amber-50/90">
            当前由{currentPlayer.name}抽取 1 张命运牌。三张牌分别对应“太阳 / 正位死神 / 女皇”，顺序已被随机打乱。
          </p>
          <div className="mt-4 grid gap-3 grid-cols-3">
            {remainingFateChoices.map(({ choice, index, revealed }) => (
              <button
                key={`fate-${index}`}
                type="button"
                disabled={revealed || interactionLocked}
                onClick={() => state.selectFateChoice(index)}
                className="rounded-[1.5rem] border border-white/10 bg-slate-950/50 p-2 text-center transition hover:border-amber-200/50 hover:bg-slate-950/70 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <p className="text-[10px] uppercase tracking-[0.1em] text-amber-100/70">牌 {index + 1}</p>
                <p className="mt-1 text-sm font-semibold text-slate-50">{revealed ? "已抽" : "背面"}</p>
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="battle-layout relative z-10">
        <div className="flex-1 min-w-0 h-full flex flex-col bg-black/40 pixel-panel p-2 sm:p-4 gap-2 sm:gap-4 overflow-hidden">
          <div className="flex-none w-full z-20">
            <PlayerStatusBar currentPlayer={state.currentPlayer} remainingSeconds={remainingSeconds} players={state.players} />
          </div>
          <div className="flex-1 flex min-h-0 overflow-auto pixel-scrollbar relative">
            <div className="m-auto w-full h-full min-h-[400px]">
              <DungeonBoard
                state={state}
                highlightedCells={highlightedCells}
                dangerCells={dangerCells}
                onCellClick={handleBoardClick}
              />
            </div>
          </div>
        </div>

        <aside className="battle-sidebar md:w-[280px] sm:w-[320px] lg:w-[380px] md:h-full shrink-0 flex flex-col bg-black/60 pixel-panel p-2 sm:p-4 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto pixel-scrollbar pr-1 sm:pr-2">
            <SkillBar
              hand={visibleHandOwner.hand}
              selectedCard={state.selectedCard}
              phase={state.phase === "fate" ? "move" : state.phase}
              pendingDrawCard={state.pendingDrawCard}
              onSelectCard={(card) => {
                if (!interactionLocked) state.selectCard(card);
              }}
              onCancelCard={() => {
                if (!interactionLocked) state.cancelSelectedCard();
              }}
              onSkipSkill={() => {
                if (!interactionLocked) state.skipSkillPhase();
              }}
            />

            <div className="mt-4 pt-4 border-t-2 border-gray-700">
              <h3 className="text-amber-400 font-bold mb-2 text-shadow-pixel text-sm">战斗日志</h3>
              <div className="max-h-[150px] overflow-y-auto pixel-scrollbar space-y-2 pr-1">
                {[...state.battleLog].reverse().map((entry) => (
                  <div key={entry.id} className="text-[10px] leading-tight text-gray-300 bg-black/40 p-1.5 border border-gray-800 rounded">
                    <span className="text-blue-300">[{entry.type}]</span> {entry.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {state.winner && state.winReason && (
        <BattleSummary
          winner={state.winner}
          winReason={state.winReason}
          elapsedSeconds={elapsedSeconds}
          players={state.players}
          onReplay={handleReturnHome}
          onBackHome={handleReturnHome}
          replayLabel={isOnlineBattle ? (onlineSession?.matchType === "ranked" ? "返回天梯" : "返回房间") : "再来一局"}
          backHomeLabel={isOnlineBattle ? "返回大厅" : "返回主菜单"}
        />
      )}
    </main>
  );
}
