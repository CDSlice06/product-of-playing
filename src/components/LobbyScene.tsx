import { MoonStar, Sparkles } from "lucide-react";
import { ASSETS } from "@/constants/assets";
import SpriteAnimator from "./SpriteAnimator";

export default function LobbyScene() {
  return (
    <section className="relative overflow-hidden flex flex-col items-center justify-center w-full h-full p-4 md:p-8">
      <div className="absolute inset-0 z-0 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none" />

      {/* Decorative characters */}
      <div className="absolute bottom-0 left-2 xl:left-8 w-32 h-32 xl:w-48 xl:h-48 z-30 pointer-events-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">
         <SpriteAnimator
              src={ASSETS.PLAYER_1_IDLE}
              animation="breathe"
              showShadow={false}
          />
      </div>
      <div className="absolute bottom-0 right-2 xl:right-8 w-32 h-32 xl:w-48 xl:h-48 z-30 pointer-events-none drop-shadow-[0_10px_20px_rgba(0,0,0,0.8)]">
         <SpriteAnimator
            src={ASSETS.PLAYER_2_IDLE}
            flipX
            animation="breathe"
            showShadow={false}
          />
      </div>

      <div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3 text-amber-200 drop-shadow-[0_0_10px_rgba(251,191,36,0.8)] z-10">
        <MoonStar className="size-6 animate-pulse" />
        <span className="font-pixel text-xs tracking-widest">WHEEL OF FATE</span>
        <Sparkles className="size-6 animate-pulse" />
      </div>

      <div className="relative z-20 flex flex-col items-center gap-6 w-full max-w-2xl text-center mx-auto mt-[-40px]">
        <h1 className="text-5xl md:text-7xl text-white font-black text-shadow-pixel mb-4 tracking-widest animate-float">
          命运之战
        </h1>
        <p className="text-lg md:text-xl text-cyan-200 text-shadow-pixel mb-6 tracking-wider">
          双人塔罗地牢策略对决
        </p>
        
        <div className="bg-black/70 p-6 rounded-xl border-2 border-gray-700 backdrop-blur-md text-left shadow-[0_0_30px_rgba(0,0,0,0.8)] relative w-full max-h-[40vh] overflow-y-auto pixel-scrollbar">
          <h2 className="text-amber-400 font-bold text-xl mb-4 border-b-2 border-gray-700 pb-2 flex items-center gap-2">
            <Sparkles className="size-5" /> 游戏玩法简介
          </h2>
          <div className="space-y-3 text-gray-300 text-sm md:text-base leading-relaxed">
            <p>
              <strong className="text-white">【回合博弈】</strong>每回合您拥有 <span className="text-amber-300">60秒</span> 决策时间。回合开始时，您必须先在六边形棋盘上向相邻的合法格子<span className="text-blue-300">移动一步</span>，或者直接打出一张塔罗牌。
            </p>
            <p>
              <strong className="text-white">【塔罗法术】</strong>移动完成后，您可以从最多 4 张手牌中打出一张<span className="text-purple-300">塔罗法术牌</span>（如：放置障碍物、与敌方互换位置、扰乱地形或让对方失控），也可以选择结束回合。
            </p>
            <p>
              <strong className="text-white">【手牌调度】</strong>每回合移动会为您抽取一张新牌。如果手牌已满（4张），您必须在回合末进行<span className="text-red-300">“弃一换一”</span>的调度抉择。
            </p>
            <p>
              <strong className="text-white">【胜利条件】</strong>巧妙利用地形障碍与法术卡牌步步紧逼，当对方<span className="text-green-400">无法进行任何合法移动</span>时，您即获得对局的胜利！
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
