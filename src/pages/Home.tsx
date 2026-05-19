import { useEffect } from "react";
import { ChevronRight, MoonStar, Sparkles, TimerReset } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "@/store/gameStore";
import type { AiDifficulty } from "@/types/game";
import { AI_DIFFICULTY_DESCRIPTIONS, AI_DIFFICULTY_LABELS } from "@/utils/board";

export default function Home() {
  const navigate = useNavigate();
  const setGameMode = useGameStore((state) => state.setGameMode);
  const aiDifficulty = useGameStore((state) => state.aiDifficulty);
  const setAiDifficulty = useGameStore((state) => state.setAiDifficulty);

  useEffect(() => {
    document.title = "命运之战 | 本地对战";
  }, []);

  const handleStartBattle = (mode: "pvp" | "pve") => {
    setGameMode(mode);
    navigate("/battle");
  };

  const handleDifficultyChange = (difficulty: AiDifficulty) => {
    setAiDifficulty(difficulty);
  };

  return (
    <main className="min-h-dvh overflow-hidden bg-[radial-gradient(circle_at_top,_rgba(245,158,11,0.2),_transparent_28%),radial-gradient(circle_at_80%_20%,_rgba(34,211,238,0.14),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#0f172a_56%,_#111827_100%)] px-4 py-6 text-slate-50 sm:py-8">
      <div className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-6xl flex-col justify-between gap-6 sm:min-h-[calc(100dvh-4rem)] sm:gap-8">
        <section className="relative overflow-hidden rounded-[2.5rem] border border-white/10 bg-slate-950/60 p-6 shadow-[0_40px_120px_rgba(15,23,42,0.45)] backdrop-blur-xl md:p-10">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(251,191,36,0.14),_transparent_20%),radial-gradient(circle_at_left,_rgba(34,211,238,0.12),_transparent_25%)]" />
          <div className="relative z-10 grid gap-8 lg:grid-cols-[minmax(0,1.1fr)_420px] lg:items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.45em] text-amber-100/70">Arcane Tactics Prototype</p>
              <h1 className="mt-4 max-w-3xl font-display text-5xl leading-none text-slate-50 md:text-7xl">
                双人塔罗
                <span className="block text-amber-200">策略对战</span>
              </h1>
              <p className="mt-6 max-w-2xl text-base leading-7 text-slate-300">
                六边形外观棋盘采用真正的六邻接移动逻辑，整局对战不限时，但每个回合只有 60 秒可供决策。每次移动都会引来新的塔罗牌，而每一张牌都可能改写局势。
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleStartBattle("pvp")}
                  className="inline-flex items-center gap-2 rounded-full border border-amber-300/30 bg-amber-300/15 px-6 py-3 text-sm tracking-[0.18em] text-amber-50 transition hover:-translate-y-0.5 hover:bg-amber-300/20"
                >
                  双人对战
                  <ChevronRight className="size-4" />
                </button>
                <button
                  type="button"
                  onClick={() => handleStartBattle("pve")}
                  className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-6 py-3 text-sm tracking-[0.18em] text-cyan-50 transition hover:-translate-y-0.5 hover:bg-cyan-300/15"
                >
                  人机对战 · {AI_DIFFICULTY_LABELS[aiDifficulty]}
                  <ChevronRight className="size-4" />
                </button>
                <a
                  href="#rules"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm tracking-[0.18em] text-slate-100 transition hover:bg-white/10"
                >
                  查看规则说明
                </a>
              </div>
            </div>

            <div className="grid gap-4">
              <div className="rounded-[2rem] border border-cyan-300/15 bg-cyan-300/5 p-5">
                <div className="flex items-center gap-3 text-cyan-100">
                  <Sparkles className="size-5" />
                  <span className="text-sm uppercase tracking-[0.25em]">AI难度</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  {(["easy", "medium", "hard"] as AiDifficulty[]).map((difficulty) => (
                    <button
                      key={difficulty}
                      type="button"
                      onClick={() => handleDifficultyChange(difficulty)}
                      className={`rounded-full border px-4 py-2 text-sm transition ${
                        aiDifficulty === difficulty
                          ? "border-cyan-300/60 bg-cyan-300/20 text-cyan-50"
                          : "border-white/10 bg-white/5 text-slate-200 hover:bg-white/10"
                      }`}
                    >
                      {AI_DIFFICULTY_LABELS[difficulty]}
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-sm text-slate-300">{AI_DIFFICULTY_DESCRIPTIONS[aiDifficulty]}</p>
              </div>
              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-3 text-amber-100">
                  <MoonStar className="size-5" />
                  <span className="text-sm uppercase tracking-[0.25em]">核心循环</span>
                </div>
                <p className="mt-3 text-slate-300">你可以直接打出 1 张牌，或移动 1 格后抽 1 张牌，再决定是否继续出牌。</p>
              </div>
              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-3 text-cyan-100">
                  <TimerReset className="size-5" />
                  <span className="text-sm uppercase tracking-[0.25em]">时间压力</span>
                </div>
                <p className="mt-3 text-slate-300">整局游戏时长无限制，但每回合有 60 秒思考时间，超时就会直接让出主动权。</p>
              </div>
              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-3 text-emerald-100">
                  <MoonStar className="size-5" />
                  <span className="text-sm uppercase tracking-[0.25em]">对战模式</span>
                </div>
                <p className="mt-3 text-slate-300">支持本地双人轮流对战，也支持与 AI 对手“命运傀儡”进行单人博弈，并可切换简单、中等、困难三档难度。</p>
              </div>
              <div className="rounded-[2rem] border border-white/10 bg-white/5 p-5">
                <div className="flex items-center gap-3 text-rose-100">
                  <Sparkles className="size-5" />
                  <span className="text-sm uppercase tracking-[0.25em]">初版卡组</span>
                </div>
                <p className="mt-3 text-slate-300">18号月亮、圣杯、15号恶魔、16号正位高塔、0号愚人、宝剑八六张基础塔罗牌，覆盖封锁、换位、扰乱、跳跃、失控与三连封路六种关键战术。</p>
              </div>
            </div>
          </div>
        </section>

        <section id="rules" className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/55 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">地图</p>
            <h2 className="mt-3 font-display text-2xl text-slate-50">10x10 棋盘</h2>
            <p className="mt-3 text-sm text-slate-300">视觉与逻辑统一为六边形六邻接，玩家每次只能移动到当前紧挨着的 6 个格子里。</p>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/55 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">胜负</p>
            <h2 className="mt-3 font-display text-2xl text-slate-50">封路致胜</h2>
            <p className="mt-3 text-sm text-slate-300">当某位玩家相邻的 6 个格子全部不可进入，且没有可脱困塔罗牌时，系统立即判定对局结束。</p>
          </div>
          <div className="rounded-[2rem] border border-white/10 bg-slate-950/55 p-5">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-500">节奏</p>
            <h2 className="mt-3 font-display text-2xl text-slate-50">整局不限时</h2>
            <p className="mt-3 text-sm text-slate-300">整局对战没有总时长上限，但每回合固定 60 秒，既保留策略深度，也保持轮转节奏。</p>
          </div>
        </section>
      </div>
    </main>
  );
}
