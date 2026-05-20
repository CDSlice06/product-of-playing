import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, BookOpen, Eye, RefreshCcw, Scissors, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  FULL_TAROT_DECK,
  TAROT_SHUFFLE_METHODS,
  TAROT_SPREADS,
  type TarotArcana,
  type TarotCardDefinition,
  type TarotSpreadDefinition,
  type TarotSpreadPosition,
} from "@/data/tarotDeck";
import { ASSETS, getTarotCardImage } from "@/constants/assets";

type DivinationStage = "shuffle" | "cut" | "draw" | "result";
type ArcanaFilter = "all" | TarotArcana;
type ShuffleMethodId = (typeof TAROT_SHUFFLE_METHODS)[number]["id"];

interface CutPreview {
  a: TarotCardDefinition[];
  b: TarotCardDefinition[];
  c: TarotCardDefinition[];
  recombined: TarotCardDefinition[];
}

interface DrawnTarotCard {
  card: TarotCardDefinition;
  reversed: boolean;
  position: TarotSpreadPosition;
}

interface ReadingSummary {
  opening: string;
  energy: string;
  lesson: string;
  action: string;
  closing: string;
}

const ARCANA_LABELS: Record<ArcanaFilter, string> = {
  all: "全部",
  major: "大阿尔卡那",
  wands: "权杖",
  cups: "圣杯",
  swords: "宝剑",
  pentacles: "星币",
};

const STEP_LABELS: Array<{ key: DivinationStage; label: string }> = [
  { key: "shuffle", label: "1. 洗牌" },
  { key: "cut", label: "2. 切牌" },
  { key: "draw", label: "3. 抽牌" },
  { key: "result", label: "4. 解读" },
];

const PREPARE_TIPS = [
  { title: "找一个安静的地方", detail: "先让自己和问题都慢下来，减少打扰，更容易接住直觉。" },
  { title: "洗手并深呼吸", detail: "先整理好自己的状态，让注意力从外界收回到内心。" },
  { title: "在心里默念问题", detail: "问题越具体，牌阵给出的指引就越清晰，不必追求完美句子。" },
];

const CUT_GUIDE_STEPS = [
  "将洗好的牌叠整齐，牌背朝上放在桌面。",
  "用直觉把牌堆切成 A / B / C 三叠。",
  "再按照 B-A-C 的顺序重新叠回去，完成切牌。",
];

const DRAW_GUIDE_STEPS = [
  "先决定这次使用的牌阵，再开始抽牌。",
  "抽牌时先不要翻开，全部抽齐后再统一揭示。",
  "如果你已经感到某个位置“就是它”，就顺着那个感觉抽，不要来回犹豫。",
];

const REVEAL_INTERVAL_MS = 650;

function createShuffledDeck(source = FULL_TAROT_DECK) {
  const next = [...source];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

function createCutPreview(deck: TarotCardDefinition[]): CutPreview {
  const firstCut = Math.max(12, Math.min(deck.length - 24, Math.floor(deck.length * (0.25 + Math.random() * 0.15))));
  const secondCut = Math.max(firstCut + 12, Math.min(deck.length - 12, Math.floor(deck.length * (0.58 + Math.random() * 0.12))));

  const a = deck.slice(0, firstCut);
  const b = deck.slice(firstCut, secondCut);
  const c = deck.slice(secondCut);

  return {
    a,
    b,
    c,
    recombined: [...b, ...a, ...c],
  };
}

function getOrientationLabel(reversed: boolean) {
  return reversed ? "逆位" : "正位";
}

function getOrientationMeaning(card: TarotCardDefinition, reversed: boolean) {
  return reversed ? card.reversed : card.upright;
}

function getDominantArcana(cards: DrawnTarotCard[]) {
  const scores = cards.reduce<Record<TarotArcana, number>>(
    (accumulator, item) => {
      accumulator[item.card.arcana] += 1;
      return accumulator;
    },
    {
      major: 0,
      wands: 0,
      cups: 0,
      swords: 0,
      pentacles: 0,
    },
  );

  return (Object.entries(scores).sort((left, right) => right[1] - left[1])[0]?.[0] ?? "major") as TarotArcana;
}

function getArcanaTheme(arcana: TarotArcana) {
  switch (arcana) {
    case "wands":
      return "行动力、热情与创造欲是这次牌阵最强的主线，适合把灵感真正推进为动作。";
    case "cups":
      return "情绪、关系与内心感受是这次占卜的重点，先照顾情绪，再处理决定。";
    case "swords":
      return "思维、判断与沟通议题被放大，越诚实面对事实，越容易找到突破口。";
    case "pentacles":
      return "现实条件、资源稳定与长期落地最重要，别忽略时间、金钱与身体状态。";
    default:
      return "这次牌阵带有明显的大阿尔卡那能量，说明眼前议题并非小波动，而是阶段性的人生课题。";
  }
}

function buildReadingSummary(question: string, cards: DrawnTarotCard[]): ReadingSummary {
  const reversedCount = cards.filter((item) => item.reversed).length;
  const majorCount = cards.filter((item) => item.card.arcana === "major").length;
  const dominantArcana = getDominantArcana(cards);
  const keywordText = Array.from(new Set(cards.flatMap((item) => item.card.keywords))).slice(0, 6).join(" / ");
  const headCard = cards[0];
  const tailCard = cards[cards.length - 1];

  const opening = question
    ? `围绕“${question.trim()}”这件事，牌面先告诉你的不是外界会不会立刻变化，而是你此刻真正需要看清的重心。整组牌把焦点落在 ${keywordText || "内在觉察与行动平衡"} 上，说明答案已经开始浮现，只是还需要你把注意力放回真正关键的位置。`
    : `这组牌更像是在回应你此刻最挂心、却还没有完全说出口的议题。核心能量落在 ${keywordText || "内在觉察与行动平衡"} 上，说明你已经走到一个需要认真聆听内心与现实同步信号的阶段。`;

  const energy =
    reversedCount >= Math.ceil(cards.length / 2)
      ? "逆位牌偏多，代表局势不是完全停住，而是你被旧情绪、惯性、拖延或顾虑压住了节奏。很多答案并非不存在，而是你还没有彻底允许自己去面对。"
      : "正位牌占优，说明事情本身仍有明显的推进空间。只要你愿意沿着真实感受和更稳定的行动继续走，结果通常不会差。";

  const lesson =
    majorCount >= Math.max(1, Math.floor(cards.length / 2))
      ? "大阿尔卡那比例较高，这说明它不是一个短暂波动，而是一段会影响你后续选择方式的人生课题。你需要的不只是解决眼前，而是更新自己面对这类问题的方式。"
      : "小阿尔卡那较多，说明问题更贴近现实层面。它并不神秘，真正决定结果的，是你接下来如何处理具体关系、时间安排、沟通方式和现实选择。";

  const action = headCard && tailCard
    ? `如果把这次牌阵当成一段提醒，开头的 ${headCard.card.name}${getOrientationLabel(headCard.reversed)} 在说“先认清起点”，结尾的 ${tailCard.card.name}${getOrientationLabel(tailCard.reversed)} 则在说“你最终会走向哪里”。所以最适合你的做法，不是一步冲到终点，而是先从最真实的那个卡点开始调整。`
    : "现在最适合你的，不是急着求一个绝对结果，而是先顺着最明显的提醒，做一个可落地的小调整。";

  const closing = `${getArcanaTheme(dominantArcana)} 你不需要在这一刻把所有答案都想明白，但你可以从今天开始，做一个比昨天更贴近内心的决定。`;

  return {
    opening,
    energy,
    lesson,
    action,
    closing,
  };
}

function FaceDownCard({ label }: { label: string }) {
  return (
    <div className="relative h-48 rounded-[1.75rem] border-2 border-[#9b7a5a] bg-[#8fb0d2] p-3 shadow-[0_12px_24px_rgba(75,55,39,0.18)]">
      <div className="absolute inset-3 rounded-[1.4rem] border-2 border-[#f6efe5]/80 bg-[#9dc0e4]" />
      <div className="absolute inset-5 rounded-[1.1rem] border border-dashed border-[#f6efe5]" />
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-[#f6efe5] bg-[#7d9cc4] text-3xl text-[#fff7eb]">
          ✦
        </div>
      </div>
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-[#9b7a5a] bg-[#fff7eb] px-3 py-1 text-[10px] text-[#7d5a46]">
        {label}
      </div>
    </div>
  );
}

function FaceUpCard({ item }: { item: DrawnTarotCard }) {
  return (
    <div className={`rounded-[1.75rem] border-2 p-4 shadow-[0_12px_24px_rgba(75,55,39,0.16)] ${item.reversed ? "border-[#cf9082] bg-[#fff1ee]" : "border-[#c3b282] bg-[#fff8ea]"}`}>
      <div className={`rounded-[1.35rem] border px-4 py-5 ${item.reversed ? "border-[#f1c3ba] bg-[#fff8f6]" : "border-[#ead8a8] bg-[#fffdf7]"}`}>
        <div className="mb-4 overflow-hidden rounded-[1.25rem] border-2 border-[#d5b89b] bg-[#f6efe5]">
          <img
            src={getTarotCardImage(item.card)}
            alt={item.card.name}
            className="h-56 w-full object-cover"
          />
        </div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-[#b78b55]">{item.position.label}</p>
            <h3 className="mt-2 text-lg font-bold text-[#8e5d37]">{item.card.name}</h3>
            <p className="mt-1 text-[11px] text-[#8b7b69]">{item.card.englishName}</p>
          </div>
          <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${item.reversed ? "border-[#cf9082] bg-[#ffe4df] text-[#aa5e56]" : "border-[#c3b282] bg-[#fff1c7] text-[#8d7448]"}`}>
            {getOrientationLabel(item.reversed)}
          </span>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {item.card.keywords.slice(0, 4).map((keyword) => (
            <span key={keyword} className="rounded-full border border-[#d8c5a2] bg-[#fff7e8] px-2 py-1 text-[10px] text-[#8f7258]">
              {keyword}
            </span>
          ))}
        </div>
        <p className="mt-4 text-xs leading-6 text-[#8f7258]">{item.position.prompt}</p>
        <p className="mt-3 text-sm leading-7 text-[#5a4638]">{getOrientationMeaning(item.card, item.reversed)}</p>
        <p className="mt-3 rounded-[1rem] border border-[#ead8a8] bg-[#fff9ef] px-3 py-3 text-xs leading-6 text-[#7a6552]">
          塔罗提示：这张牌在 <span className="font-bold text-[#8e5d37]">{item.position.label}</span> 位置出现，说明这个部分不是随机发生，而是在提醒你正视这一层面的真实状态。
        </p>
      </div>
    </div>
  );
}

function GuideSticky({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="rounded-[1.35rem] border-2 border-[#d5b89b] bg-[#fffaf1] p-4 shadow-[0_8px_18px_rgba(120,90,60,0.08)]">
      <div className="text-sm font-bold text-[#8e5d37]">{title}</div>
      <p className="mt-2 text-xs leading-6 text-[#735c4a]">{detail}</p>
    </div>
  );
}

function getSpreadPreviewGridClass(spreadId: string) {
  switch (spreadId) {
    case "single":
      return "mx-auto max-w-[220px] grid-cols-1";
    case "five-card":
      return "grid-cols-1 sm:grid-cols-2 md:grid-cols-6";
    default:
      return "grid-cols-1 md:grid-cols-3";
  }
}

function getSpreadPreviewSlotClass(spreadId: string, index: number) {
  if (spreadId === "five-card") {
    return [
      "md:col-start-2 md:col-span-2",
      "md:col-start-4 md:col-span-2",
      "md:col-start-1 md:col-span-2",
      "md:col-start-3 md:col-span-2",
      "md:col-start-5 md:col-span-2",
    ][index] ?? "";
  }

  return "";
}

function RitualRevealCard({ item, revealed }: { item: DrawnTarotCard; revealed: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`relative w-full max-w-[180px] transition-all duration-700 ${revealed ? "translate-y-0 scale-100 opacity-100" : "translate-y-4 scale-95 opacity-90"}`}
      >
        {revealed ? (
          <div className={`overflow-hidden rounded-[1.5rem] border-2 bg-[#fffdf7] p-2 shadow-[0_14px_30px_rgba(75,55,39,0.18)] ${item.reversed ? "border-[#cf9082]" : "border-[#d5b89b]"}`}>
            <div className="overflow-hidden rounded-[1.1rem] border border-[#ead8a8] bg-[#f6efe5]">
              <img
                src={getTarotCardImage(item.card)}
                alt={item.card.name}
                className={`h-60 w-full object-cover transition-transform duration-700 ${item.reversed ? "rotate-180" : ""}`}
              />
            </div>
          </div>
        ) : (
          <FaceDownCard label={item.position.label} />
        )}
        {revealed && (
          <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 rounded-full border border-[#d5b89b] bg-[#fff7eb] px-3 py-1 text-[10px] font-bold text-[#8e5d37] shadow-sm">
            {item.card.name} · {getOrientationLabel(item.reversed)}
          </div>
        )}
      </div>
      <div className="rounded-full border border-[#d5b89b] bg-[#fff7eb] px-3 py-1 text-[11px] text-[#7b5c45]">
        {item.position.label}
      </div>
    </div>
  );
}

export default function TarotDivination() {
  const navigate = useNavigate();
  const [stage, setStage] = useState<DivinationStage>("shuffle");
  const [question, setQuestion] = useState("");
  const [shuffleMethod, setShuffleMethod] = useState<ShuffleMethodId>("mahjong");
  const [shuffleCount, setShuffleCount] = useState(0);
  const [deck, setDeck] = useState<TarotCardDefinition[]>(() => createShuffledDeck());
  const [cutPreview, setCutPreview] = useState<CutPreview | null>(null);
  const [didCut, setDidCut] = useState(false);
  const [selectedSpreadId, setSelectedSpreadId] = useState<string>(TAROT_SPREADS[1]?.id ?? TAROT_SPREADS[0]!.id);
  const [drawnCards, setDrawnCards] = useState<DrawnTarotCard[]>([]);
  const [arcanaFilter, setArcanaFilter] = useState<ArcanaFilter>("all");
  const [revealCount, setRevealCount] = useState(0);

  useEffect(() => {
    document.title = "命运之战 | 塔罗占卜";
  }, []);

  useEffect(() => {
    if (stage !== "result" || revealCount >= drawnCards.length) {
      return;
    }

    const timer = window.setTimeout(() => {
      setRevealCount((current) => Math.min(current + 1, drawnCards.length));
    }, REVEAL_INTERVAL_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [drawnCards.length, revealCount, stage]);

  const selectedSpread = useMemo<TarotSpreadDefinition>(
    () => TAROT_SPREADS.find((spread) => spread.id === selectedSpreadId) ?? TAROT_SPREADS[0]!,
    [selectedSpreadId],
  );

  const filteredDeck = useMemo(
    () => (arcanaFilter === "all" ? FULL_TAROT_DECK : FULL_TAROT_DECK.filter((card) => card.arcana === arcanaFilter)),
    [arcanaFilter],
  );

  const summary = useMemo(() => buildReadingSummary(question, drawnCards), [drawnCards, question]);

  const handleShuffle = () => {
    setDeck((currentDeck) => createShuffledDeck(currentDeck));
    setShuffleCount((count) => count + 1);
  };

  const handleProceedToCut = () => {
    if (shuffleCount === 0) {
      return;
    }

    setCutPreview(null);
    setDidCut(false);
    setStage("cut");
  };

  const handleCutDeck = () => {
    const preview = createCutPreview(deck);
    setCutPreview(preview);
    setDeck(preview.recombined);
    setDidCut(true);
  };

  const handleSkipCut = () => {
    setCutPreview(null);
    setDidCut(false);
    setStage("draw");
  };

  const handleConfirmCut = () => {
    setStage("draw");
  };

  const handleDrawCard = () => {
    if (drawnCards.length >= selectedSpread.positions.length || deck.length === 0) {
      return;
    }

    const [nextCard, ...restDeck] = deck;
    if (!nextCard) {
      return;
    }

    const nextDrawnCard: DrawnTarotCard = {
      card: nextCard,
      reversed: Math.random() < 0.35,
      position: selectedSpread.positions[drawnCards.length]!,
    };

    setDeck(restDeck);
    setDrawnCards((currentCards) => [...currentCards, nextDrawnCard]);
  };

  const handleReveal = () => {
    if (drawnCards.length !== selectedSpread.positions.length) {
      return;
    }

    setRevealCount(0);
    setStage("result");
  };

  const handleReset = () => {
    setStage("shuffle");
    setQuestion("");
    setShuffleMethod("mahjong");
    setShuffleCount(0);
    setDeck(createShuffledDeck());
    setCutPreview(null);
    setDidCut(false);
    setSelectedSpreadId(TAROT_SPREADS[1]?.id ?? TAROT_SPREADS[0]!.id);
    setDrawnCards([]);
    setArcanaFilter("all");
    setRevealCount(0);
  };

  const currentStepIndex = STEP_LABELS.findIndex((step) => step.key === stage);
  const isRevealFinished = revealCount >= drawnCards.length;
  const revealedCards = drawnCards.slice(0, revealCount);

  return (
    <main className="app-shell relative overflow-hidden bg-[#f8eddc] font-sans text-[#5b4738]">
      <div
        className="absolute inset-0 z-0 opacity-15 pointer-events-none"
        style={{ backgroundImage: `url(${ASSETS.LOBBY_BG})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(4px)" }}
      />
      <div className="absolute left-5 top-5 z-0 h-16 w-28 -rotate-6 rounded-md bg-pink-200/50 pointer-events-none" />
      <div className="absolute right-5 top-8 z-0 h-16 w-24 rotate-6 rounded-md bg-teal-200/50 pointer-events-none" />
      <div className="absolute bottom-8 left-8 z-0 h-14 w-24 rotate-3 rounded-md bg-yellow-200/40 pointer-events-none" />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-4 px-3 py-4 md:px-4">
        <header className="rounded-[2rem] border-2 border-[#d5b89b] bg-[#fff9ef] p-4 shadow-[0_10px_24px_rgba(120,90,60,0.12)] md:flex md:items-center md:justify-between md:gap-4">
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => navigate("/lobby")}
              className="mt-1 flex h-11 w-11 items-center justify-center rounded-full border-2 border-[#d0b394] bg-[#fff1df] text-[#7b5c45] transition hover:border-[#b78b55] hover:bg-[#fff7eb]"
            >
              <ArrowLeft className="size-5" />
            </button>
            <div>
              <p className="text-[10px] uppercase tracking-[0.35em] text-[#b78b55]">Tarot Divination</p>
              <div className="mt-2 inline-flex rounded-full border border-[#d0b394] bg-[#fff1df] px-4 py-1 text-sm font-bold text-[#8e5d37]">
                神秘指引
              </div>
              <h1 className="mt-3 text-2xl font-bold text-[#8e5d37]">塔罗占卜</h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-[#735c4a]">
                让自己慢下来，顺着洗牌、切牌、抽牌与翻牌的节奏，聆听此刻最需要看见的讯息。
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            {STEP_LABELS.map((step, index) => {
              const isActive = index === currentStepIndex;
              const isDone = index < currentStepIndex;
              return (
                <div
                  key={step.key}
                  className={`rounded-full border px-3 py-2 text-[11px] ${isActive ? "border-[#b78b55] bg-[#fff1df] text-[#8e5d37]" : isDone ? "border-[#96b08e] bg-[#eef7ea] text-[#58704d]" : "border-[#dccab6] bg-[#f8efe2] text-[#8d7b68]"}`}
                >
                  {step.label}
                </div>
              );
            })}
          </div>
        </header>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
          <div className="rounded-[2rem] border-2 border-[#d5b89b] bg-[#fff9ef] p-4 shadow-[0_10px_24px_rgba(120,90,60,0.12)] md:p-6">
            {stage === "shuffle" && (
              <div className="space-y-6">
                <div className="rounded-[1.6rem] border-2 border-[#e0c6ad] bg-[#fffdf7] p-5">
                  <div className="flex items-center gap-2 text-[#8e5d37]">
                    <Sparkles className="size-5" />
                    <h2 className="text-lg font-bold">第一步：洗牌</h2>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[#735c4a]">
                    先让自己安静下来，默念问题。洗牌没有固定次数，直到你明确感觉“可以了”为止。重点是把杂念打散，让问题和直觉慢慢对齐。
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {PREPARE_TIPS.map((tip) => (
                      <GuideSticky key={tip.title} title={tip.title} detail={tip.detail} />
                    ))}
                  </div>
                </div>

                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#8e5d37]">想问的问题</span>
                  <textarea
                    value={question}
                    onChange={(event) => setQuestion(event.target.value)}
                    placeholder="例如：这段关系接下来会怎么发展？我现在的事业重点是什么？"
                    className="min-h-28 w-full rounded-[1.25rem] border-2 border-[#dccab6] bg-[#fffdf7] px-4 py-3 text-sm leading-7 text-[#5b4738] outline-none transition focus:border-[#b78b55]"
                  />
                </label>

                <div className="rounded-[1.6rem] border-2 border-[#e0c6ad] bg-[#fffdf7] p-5">
                  <div className="text-base font-bold text-[#8e5d37]">常用洗牌方式</div>
                  <p className="mt-2 text-xs leading-6 text-[#7a6656]">这里准备了三种常用洗牌方式，你可以按自己的习惯选择。</p>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  {TAROT_SHUFFLE_METHODS.map((method) => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setShuffleMethod(method.id)}
                      className={`rounded-[1.5rem] border-2 p-4 text-left transition ${shuffleMethod === method.id ? "border-[#b78b55] bg-[#fff1df]" : "border-[#dccab6] bg-[#fffdf7] hover:border-[#caa072]"}`}
                    >
                      <div className="text-sm font-bold text-[#8e5d37]">{method.name}</div>
                      <p className="mt-2 text-xs leading-6 text-[#735c4a]">{method.description}</p>
                    </button>
                  ))}
                </div>

                <div className="rounded-[1.75rem] border-2 border-[#e0c6ad] bg-[#fff7ea] p-4">
                  <div className="mx-auto flex w-full max-w-sm flex-col items-center gap-4">
                    <div className="relative h-44 w-32">
                      <div className="absolute left-4 top-4 h-full w-full rounded-[1.5rem] border-2 border-[#9b7a5a] bg-[#a3c4e6]" />
                      <div className="absolute left-2 top-2 h-full w-full rounded-[1.5rem] border-2 border-[#9b7a5a] bg-[#95b5d7]" />
                      <div className="absolute inset-0 rounded-[1.5rem] border-2 border-[#9b7a5a] bg-[#8fb0d2] p-3">
                        <div className="absolute inset-3 rounded-[1.2rem] border-2 border-[#f6efe5]" />
                        <div className="absolute inset-0 flex items-center justify-center text-4xl text-[#fff7eb]">✦</div>
                      </div>
                    </div>
                    <div className="text-center text-sm leading-7 text-[#735c4a]">
                      已洗牌 <span className="font-bold text-[#b26a5f]">{shuffleCount}</span> 次
                      <div className="mt-1 text-[12px] text-[#9a7c64]">没有固定次数，直到你觉得“可以了”为止。</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleShuffle}
                    className="rounded-full border-2 border-[#d0b394] bg-[#fff1df] px-5 py-3 text-sm font-bold text-[#8e5d37] transition hover:border-[#b78b55] hover:bg-[#ffead0]"
                  >
                    再洗一次
                  </button>
                  <button
                    type="button"
                    disabled={shuffleCount === 0}
                    onClick={handleProceedToCut}
                    className="rounded-full border-2 border-[#d7a48e] bg-[#ffe7df] px-5 py-3 text-sm font-bold text-[#9b5f53] transition hover:border-[#c57e72] hover:bg-[#ffd9cf] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    进入切牌
                  </button>
                </div>
              </div>
            )}

            {stage === "cut" && (
              <div className="space-y-6">
                <div className="rounded-[1.6rem] border-2 border-[#e0c6ad] bg-[#fffdf7] p-5">
                  <div className="flex items-center gap-2 text-[#8e5d37]">
                    <Scissors className="size-5" />
                    <h2 className="text-lg font-bold">第二步：切牌</h2>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[#735c4a]">
                    切牌不是必须步骤。如果你想完整走完这一轮仪式，就把牌堆分成三叠，再按照 B-A-C 叠回去；如果你更想直接抽牌，也可以跳过。
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {CUT_GUIDE_STEPS.map((step, index) => (
                      <GuideSticky key={step} title={`步骤 ${index + 1}`} detail={step} />
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                  {(cutPreview
                    ? [
                        { label: "A", count: cutPreview.a.length },
                        { label: "B", count: cutPreview.b.length },
                        { label: "C", count: cutPreview.c.length },
                      ]
                    : [
                        { label: "A", count: 0 },
                        { label: "B", count: 0 },
                        { label: "C", count: 0 },
                      ]).map((pile) => (
                    <div key={pile.label} className="rounded-[1.5rem] border-2 border-[#dccab6] bg-[#fffdf7] p-4 text-center">
                      <div className="mx-auto flex h-28 w-20 items-center justify-center rounded-[1.1rem] border-2 border-[#9b7a5a] bg-[#8fb0d2] text-2xl text-[#fff7eb]">
                        {pile.label}
                      </div>
                      <div className="mt-3 text-xs text-[#735c4a]">{pile.count > 0 ? `${pile.count} 张` : "待切牌"}</div>
                    </div>
                  ))}
                </div>

                {cutPreview && (
                  <div className="rounded-[1.5rem] border-2 border-[#b8d2b1] bg-[#f0f8ed] p-4 text-sm leading-7 text-[#58704d]">
                    已完成切牌：按 <span className="font-bold text-[#8e5d37]">B-A-C</span> 顺序重新合成牌堆。新的牌堆顺序已经生效，现在可以进入抽牌。
                  </div>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleCutDeck}
                    className="rounded-full border-2 border-[#d0b394] bg-[#fff1df] px-5 py-3 text-sm font-bold text-[#8e5d37] transition hover:border-[#b78b55] hover:bg-[#ffead0]"
                  >
                    切成三叠
                  </button>
                  <button
                    type="button"
                    onClick={handleSkipCut}
                    className="rounded-full border-2 border-[#dccab6] bg-[#fffdf7] px-5 py-3 text-sm font-bold text-[#735c4a] transition hover:border-[#caa072] hover:bg-[#fff6e8]"
                  >
                    跳过切牌
                  </button>
                  <button
                    type="button"
                    disabled={!cutPreview}
                    onClick={handleConfirmCut}
                    className="rounded-full border-2 border-[#d7a48e] bg-[#ffe7df] px-5 py-3 text-sm font-bold text-[#9b5f53] transition hover:border-[#c57e72] hover:bg-[#ffd9cf] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    进入抽牌
                  </button>
                </div>
              </div>
            )}

            {stage === "draw" && (
              <div className="space-y-6">
                <div className="rounded-[1.6rem] border-2 border-[#e0c6ad] bg-[#fffdf7] p-5">
                  <div className="flex items-center gap-2 text-[#8e5d37]">
                    <BookOpen className="size-5" />
                    <h2 className="text-lg font-bold">第三步：抽牌</h2>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[#735c4a]">
                    抽牌时先不要边抽边翻。先按照牌阵位置把牌放好，等全部抽齐后，再统一揭示，更容易看见完整的信息流。
                  </p>
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {DRAW_GUIDE_STEPS.map((step, index) => (
                      <GuideSticky key={step} title={`提示 ${index + 1}`} detail={step} />
                    ))}
                  </div>
                </div>

                <div className="grid gap-3 md:grid-cols-3">
                  {TAROT_SPREADS.map((spread) => (
                    <button
                      key={spread.id}
                      type="button"
                      disabled={drawnCards.length > 0 && spread.id !== selectedSpread.id}
                      onClick={() => setSelectedSpreadId(spread.id)}
                      className={`rounded-[1.5rem] border-2 p-4 text-left transition ${selectedSpread.id === spread.id ? "border-[#b78b55] bg-[#fff1df]" : "border-[#dccab6] bg-[#fffdf7] hover:border-[#caa072]"} disabled:cursor-not-allowed disabled:opacity-50`}
                    >
                      <div className="text-sm font-bold text-[#8e5d37]">{spread.name}</div>
                      <div className="mt-1 text-[11px] text-[#9a7c64]">{spread.positions.length} 张牌</div>
                      <p className="mt-2 text-xs leading-6 text-[#735c4a]">{spread.description}</p>
                    </button>
                  ))}
                </div>

                <div className="rounded-[1.5rem] border-2 border-[#e0c6ad] bg-[#fff7ea] p-4">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="text-sm leading-7 text-[#735c4a]">
                      当前牌阵：<span className="font-bold text-[#8e5d37]">{selectedSpread.name}</span>
                      <div>剩余牌数：{deck.length} 张</div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        disabled={drawnCards.length >= selectedSpread.positions.length}
                        onClick={handleDrawCard}
                        className="rounded-full border-2 border-[#d0b394] bg-[#fff1df] px-5 py-3 text-sm font-bold text-[#8e5d37] transition hover:border-[#b78b55] hover:bg-[#ffead0] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        抽第 {drawnCards.length + 1} 张
                      </button>
                      <button
                        type="button"
                        disabled={drawnCards.length !== selectedSpread.positions.length}
                        onClick={handleReveal}
                        className="rounded-full border-2 border-[#d7a48e] bg-[#ffe7df] px-5 py-3 text-sm font-bold text-[#9b5f53] transition hover:border-[#c57e72] hover:bg-[#ffd9cf] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        统一翻牌
                      </button>
                    </div>
                  </div>
                </div>

                <div className={`grid gap-4 ${selectedSpread.positions.length <= 3 ? "md:grid-cols-3" : "md:grid-cols-2 xl:grid-cols-5"}`}>
                  {selectedSpread.positions.map((position, index) => (
                    <div key={position.label} className="space-y-3">
                      <FaceDownCard label={position.label} />
                      <div className="rounded-[1.25rem] border-2 border-[#dccab6] bg-[#fffdf7] p-3">
                        <div className="text-xs font-bold text-[#8e5d37]">{position.label}</div>
                        <p className="mt-2 text-[11px] leading-6 text-[#735c4a]">
                          {drawnCards[index] ? "已抽取，等待统一翻牌。" : position.prompt}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {stage === "result" && (
              <div className="space-y-6">
                <div className="rounded-[1.6rem] border-2 border-[#e0c6ad] bg-[#fffdf7] p-5">
                  <div className="flex items-center gap-2 text-[#8e5d37]">
                    <Eye className="size-5" />
                    <h2 className="text-lg font-bold">第四步：解读</h2>
                  </div>
                  <p className="mt-3 text-sm leading-7 text-[#735c4a]">
                    现在可以翻开整组牌阵。真正的解读不是只看“好不好”，而是结合牌位、正逆位与整组牌的能量关系，读出它到底在提醒你什么。
                  </p>
                </div>

                <div className="rounded-[1.9rem] border-2 border-[#d7c29c] bg-[#fff4e4] p-5 shadow-[0_12px_24px_rgba(120,90,60,0.12)]">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-base font-bold text-[#8e5d37]">翻牌仪式台</div>
                      <p className="mt-2 text-sm leading-7 text-[#735c4a]">
                        牌会按照牌阵顺序逐张揭示。先看整体流动，再进入详细解读，会更接近真实占卜时“信息慢慢浮现”的感觉。
                      </p>
                    </div>
                    <div className="rounded-[1.25rem] border-2 border-[#e0c6ad] bg-[#fffdf7] px-4 py-3 text-sm text-[#7b5c45]">
                      {isRevealFinished
                        ? `已完成揭示，共 ${drawnCards.length} 张牌`
                        : `正在揭示第 ${Math.min(revealCount + 1, drawnCards.length)} 张，共 ${drawnCards.length} 张牌`}
                    </div>
                  </div>

                  <div className={`mt-6 grid gap-6 ${getSpreadPreviewGridClass(selectedSpread.id)}`}>
                    {drawnCards.map((item, index) => (
                      <div
                        key={`preview-${item.position.label}-${item.card.id}`}
                        className={getSpreadPreviewSlotClass(selectedSpread.id, index)}
                      >
                        <RitualRevealCard item={item} revealed={index < revealCount} />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <div className="rounded-[1.75rem] border-2 border-[#d7c29c] bg-[#fff6df] p-5">
                    <h3 className="text-base font-bold text-[#8e5d37]">本次牌阵总结</h3>
                    {isRevealFinished ? (
                      <div className="mt-4 space-y-3 text-sm leading-8 text-[#5a4638]">
                        <p>{summary.opening}</p>
                        <p>{summary.energy}</p>
                        <p>{summary.lesson}</p>
                        <p>{summary.action}</p>
                        <p>{summary.closing}</p>
                      </div>
                    ) : (
                      <div className="mt-4 rounded-[1.25rem] border-2 border-[#e0c6ad] bg-[#fffdf7] px-4 py-5 text-sm leading-7 text-[#735c4a]">
                        正在等待全部牌面揭示完成。塔罗阅读更适合先看完整牌阵，再综合位置与正逆位来判断，所以总结会在最后一张牌翻开后完整呈现。
                      </div>
                    )}
                    <div className="mt-5 rounded-[1.25rem] border-2 border-[#e0c6ad] bg-[#fffdf7] p-4 text-xs leading-6 text-[#735c4a]">
                      <div>洗牌方式：{TAROT_SHUFFLE_METHODS.find((method) => method.id === shuffleMethod)?.name}</div>
                      <div>洗牌次数：{shuffleCount} 次</div>
                      <div>切牌状态：{didCut ? "已完成 B-A-C 切牌" : "本次未切牌"}</div>
                      <div>牌阵类型：{selectedSpread.name}</div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handleReset}
                      className="rounded-full border-2 border-[#d0b394] bg-[#fff1df] px-5 py-3 text-sm font-bold text-[#8e5d37] transition hover:border-[#b78b55] hover:bg-[#ffead0]"
                    >
                      <RefreshCcw className="mr-2 inline size-4" />
                      重新占卜
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate("/lobby")}
                      className="rounded-full border-2 border-[#dccab6] bg-[#fffdf7] px-5 py-3 text-sm font-bold text-[#735c4a] transition hover:border-[#caa072] hover:bg-[#fff6e8]"
                    >
                      返回大厅
                    </button>
                  </div>
                </div>

                <div className={`grid gap-4 ${revealedCards.length <= 1 ? "xl:grid-cols-1" : revealedCards.length <= 3 ? "xl:grid-cols-3" : "xl:grid-cols-2"}`}>
                  {revealedCards.map((item) => (
                    <FaceUpCard key={`${item.position.label}-${item.card.id}`} item={item} />
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="rounded-[2rem] border-2 border-[#d5b89b] bg-[#fff9ef] p-4 shadow-[0_10px_24px_rgba(120,90,60,0.12)] md:p-6">
            <div className="flex items-center gap-2 text-[#8e5d37]">
              <BookOpen className="size-5" />
              <h2 className="text-lg font-bold">完整塔罗牌库</h2>
            </div>
            <p className="mt-3 text-sm leading-7 text-[#735c4a]">
              这里收录完整 78 张塔罗牌，抽牌使用的也是这整套牌库。你可以随时切换分类查看。
            </p>

            <div className="mt-4 flex flex-wrap gap-2">
              {(Object.keys(ARCANA_LABELS) as ArcanaFilter[]).map((filterKey) => (
                <button
                  key={filterKey}
                  type="button"
                  onClick={() => setArcanaFilter(filterKey)}
                  className={`rounded-full border-2 px-3 py-2 text-[11px] transition ${arcanaFilter === filterKey ? "border-[#b78b55] bg-[#fff1df] text-[#8e5d37]" : "border-[#dccab6] bg-[#fffdf7] text-[#735c4a] hover:border-[#caa072]"}`}
                >
                  {ARCANA_LABELS[filterKey]}
                </button>
              ))}
            </div>

            <div className="mt-4 max-h-[70vh] space-y-3 overflow-y-auto pr-1 pixel-scrollbar">
              {filteredDeck.map((card) => (
                <div key={card.id} className="rounded-[1.25rem] border-2 border-[#dccab6] bg-[#fffdf7] p-4">
                  <div className="flex items-start gap-4">
                    <div className="h-28 w-20 shrink-0 overflow-hidden rounded-[1rem] border-2 border-[#d5b89b] bg-[#f6efe5]">
                      <img
                        src={getTarotCardImage(card)}
                        alt={card.name}
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div>
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-bold text-[#8e5d37]">{card.name}</div>
                          <div className="mt-1 text-[11px] text-[#8b7b69]">{card.englishName}</div>
                        </div>
                        <span className="rounded-full border border-[#dccab6] bg-[#fff1df] px-2 py-1 text-[10px] text-[#8e5d37]">
                          {card.suitLabel}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {card.keywords.slice(0, 4).map((keyword) => (
                          <span key={keyword} className="rounded-full border border-[#ead8a8] bg-[#fff7e8] px-2 py-1 text-[10px] text-[#8f7258]">
                            {keyword}
                          </span>
                        ))}
                      </div>
                      <p className="mt-3 text-[11px] leading-6 text-[#6d5949]">正位：{card.upright}</p>
                      <p className="mt-2 text-[11px] leading-6 text-[#8a7563]">逆位：{card.reversed}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </section>
      </div>
    </main>
  );
}
