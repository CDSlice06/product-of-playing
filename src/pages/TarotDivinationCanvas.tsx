import { useEffect, useRef, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FULL_TAROT_DECK, TAROT_SPREADS, type TarotCardDefinition, type TarotSpreadDefinition, type TarotSpreadPosition } from "@/data/tarotDeck";
import { getTarotCardImage } from "@/constants/assets";
import DIALOG_BG from "@/assets/divination-dialog-bg-transparent.png";
import FORTUNE_TELLER from "@/assets/fortune-teller-transparent.png";
import DIVINATION_VIDEO from "@/assets/divination-bg-video.mp4";

// ─── Dialog script ───
type DialogEntry = { speaker: string; text: string; waitForAction?: string };
const DIALOG: DialogEntry[] = [
  // Welcome
  { speaker: "星谕", text: "欢迎来到塔罗占卜。" },
  { speaker: "星谕", text: "请试着放下心中纷乱的思绪，静下心来吧。" },
  { speaker: "星谕", text: "整个占卜分为四个步骤：洗牌、切牌、抽牌、解读。顺着节奏，聆听属于你的讯息。" },
  { speaker: "星谕", text: "准备好了吗？我们先从第一步——洗牌开始。" },
  // Shuffle
  { speaker: "星谕", text: "占卜之前，最重要的是安顿自己。" },
  { speaker: "星谕", text: "先寻一处安静不受打扰的地方，调整呼吸，将注意力收回内心。" },
  { speaker: "星谕", text: "在心里默默念出你想要询问的问题。问题越是具体，指引便越是清晰。" },
  { speaker: "星谕", text: "洗牌没有规定的次数，不必刻意计数。" },
  { speaker: "星谕", text: "持续打乱牌组，直到你的心底生出一种「差不多可以了」的直觉，就足够。" },
  { speaker: "星谕", text: "这里准备了三种洗牌方式，你可以挑选习惯的一种。等你感觉就绪，便可确认，前往下一步切牌。", waitForAction: "shuffle" },
  // After shuffle → cut
  { speaker: "星谕", text: "很好，既然你已经感知到时机成熟，我们进入切牌环节。" },
  { speaker: "星谕", text: "完成洗牌之后，便是切牌。" },
  { speaker: "星谕", text: "将洗匀的整叠牌平稳放在桌面上，用一只手分出一部分牌，将牌组分为两叠。" },
  { speaker: "星谕", text: "切牌，是划分思绪、区分现实与潜在想法的仪式。" },
  { speaker: "星谕", text: "确认切牌完成，接下来，就到抽牌时刻。", waitForAction: "cut" },
  // After cut → draw
  { speaker: "星谕", text: "完成切牌之后，我们就可以正式抽取代表你的命运牌。" },
  { speaker: "星谕", text: "现在，请专注心中的疑问。" },
  { speaker: "星谕", text: "凭着第一直觉，从牌堆之中选出一张卡牌。" },
  { speaker: "星谕", text: "不要反复犹豫，最先吸引你目光的那一张，便是命运想要交付你的讯息。" },
  { speaker: "星谕", text: "选好之后，请确认，我们一同翻开这张塔罗牌。", waitForAction: "draw" },
  // After draw → reveal
  { speaker: "星谕", text: "接下来，揭晓属于你的指引。" },
  { speaker: "星谕", text: "卡牌已经出现，我们一起来读懂它藏着的讯息。" },
  { speaker: "星谕", text: "每一张塔罗，映照的并非注定不变的结局，而是当下你的状态、潜藏的机遇与需要留意的方向。" },
  { speaker: "星谕", text: "命运留有选择的余地，牌面只是提醒，最终如何前行，决定权依旧在你手中。" },
  { speaker: "星谕", text: "本次占卜到这里就结束啦。若之后心中还有困惑，随时可以再次前来，聆听星轨与塔罗的指引。", waitForAction: "done" },
];

// ─── Types ───
type Phase = "dialog" | "shuffle" | "cut" | "draw" | "result" | "end";

interface DrawnTarotCard {
  card: TarotCardDefinition;
  reversed: boolean;
  position: TarotSpreadPosition;
}

// ─── Helpers ───
function shuffleDeck(src: TarotCardDefinition[]) {
  const deck = [...src];
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function buildReadingText(cards: DrawnTarotCard[]) {
  if (cards.length === 0) return "尚未抽牌。";
  const parts = cards.map((c, i) =>
    `${c.position.label}：${c.card.name}（${c.reversed ? "逆位" : "正位"}）\n${c.reversed ? c.card.reversed : c.card.upright}`
  );
  return parts.join("\n\n");
}

// ─── Component ───
export default function TarotDivinationCanvas() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef({ phase: "dialog" as Phase, dialogIdx: 0, charIdx: 0 });

  // Game state
  const stateRef = useRef({
    deck: shuffleDeck(FULL_TAROT_DECK),
    shuffleCount: 0,
    shuffleMethod: "mahjong" as "mahjong" | "drawer" | "riffle",
    shuffleAnim: null as { kind: string; until: number } | null,
    didCut: false,
    selectedSpread: TAROT_SPREADS[1]!,
    drawnCards: [] as DrawnTarotCard[],
  });

  const spreadChoices = useRef([
    { id: "single" as const, label: "单张指引", desc: "快速获取此刻最重要的一条提醒", count: 1 },
    { id: "three-card" as const, label: "三张时间流", desc: "过去、现在、未来", count: 3 },
    { id: "five-card" as const, label: "五张局势牌阵", desc: "全面了解现状、阻碍、建议与结果", count: 5 },
  ]);

  const spreadIdxRef = useRef(1);
  const readingText = useRef("");

  // Force re-render
  const drawRef = useRef<() => void>(() => {});
  const animRef = useRef(0);
  const tick = useCallback(() => drawRef.current(), []);

  useEffect(() => {
    document.title = "命运之战 | 塔罗占卜";
  }, []);

  // ─── Drawing setup (runs once) ───
  useEffect(() => {
    const dlgImg = new Image();
    dlgImg.src = DIALOG_BG;
    const heroImg = new Image();
    heroImg.src = FORTUNE_TELLER;

    const init = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      function drawOnce() {
        const stg = stageRef.current;
        const state = stateRef.current;

        const dpr = window.devicePixelRatio || 1;
        const W = window.innerWidth;
        const H = window.innerHeight;
        canvas!.width = W * dpr;
        canvas!.height = H * dpr;
        canvas!.style.width = W + "px";
        canvas!.style.height = H + "px";
        ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

        newTargets = [];

        // ── Dark overlay over background video ──
        ctx!.fillStyle = "rgba(5,3,15,0.45)";
        ctx!.fillRect(0, 0, W, H);

        // ── Back arrow (top-left) ──
        const backX = W * 0.02;
        const backY = H * 0.02;
        const backW = W * 0.04;
        const backH = W * 0.04;
        ctx!.fillStyle = "rgba(0,0,0,0.5)";
        roundRect(ctx!, backX, backY, backW, backH, backH * 0.3);
        ctx!.strokeStyle = "rgba(180,140,80,0.5)";
        ctx!.lineWidth = 1.5;
        roundRectStroke(ctx!, backX, backY, backW, backH, backH * 0.3);
        ctx!.strokeStyle = "#ccaa77";
        ctx!.lineWidth = 2;
        ctx!.beginPath();
        const ax = backX + backW * 0.6;
        const ay = backY + backH * 0.25;
        ctx!.moveTo(ax, ay);
        ctx!.lineTo(backX + backW * 0.3, backY + backH * 0.5);
        ctx!.lineTo(ax, backY + backH * 0.75);
        ctx!.stroke();
        newTargets.push({ x: backX, y: backY, w: backW, h: backH, action: "backToLobby" });

        // ── Character portrait area ──
        const portraitW = W * 0.25;
        const portraitH = H * 0.55;
        const portraitX = (W - portraitW) / 2;
        const portraitY = H * 0.08;

        const px = portraitX + portraitW / 2;
        const py = portraitY + portraitH;
        const phi = Date.now() * 0.001;

        // Spotlight behind character (radial gradient)
        const spotlightR = portraitH * 0.65;
        const spotCx = px;
        const spotCy = portraitY + portraitH * 0.45;
        const pulse = 0.5 + 0.5 * Math.sin(phi * 0.5);
        const spotLight = ctx!.createRadialGradient(spotCx, spotCy, 0, spotCx, spotCy, spotlightR);
        spotLight.addColorStop(0, `rgba(220,180,255,${0.35 + pulse * 0.15})`);
        spotLight.addColorStop(0.3, `rgba(160,100,220,${0.18 + pulse * 0.08})`);
        spotLight.addColorStop(0.7, `rgba(80,40,120,${0.08})`);
        spotLight.addColorStop(1, "rgba(0,0,0,0)");
        ctx!.fillStyle = spotLight;
        ctx!.fillRect(spotCx - spotlightR, spotCy - spotlightR, spotlightR * 2, spotlightR * 2);

        // Character image (preserve 3:4 aspect, fit to portrait box)
        if (heroImg.complete && heroImg.naturalWidth > 0) {
          const imgAspect = heroImg.naturalHeight / heroImg.naturalWidth;
          let charW = portraitW;
          let charH = charW * imgAspect;
          if (charH > portraitH * 1.1) {
            charH = portraitH * 1.1;
            charW = charH / imgAspect;
          }
          const charX = px - charW / 2;
          const charY = portraitY - portraitH * 0.02;
          ctx!.drawImage(heroImg, charX, charY, charW, charH);
        }

        // Name label
        ctx!.fillStyle = "rgba(0,0,0,0.6)";
        roundRect(ctx!, px - portraitW * 0.18, portraitY + portraitH * 0.02, portraitW * 0.36, H * 0.03, 8);
        ctx!.fillStyle = "#eed8a0";
        ctx!.font = `600 ${W * 0.008}px "Microsoft YaHei"`;
        ctx!.textAlign = "center";
        ctx!.fillText("星谕 · 占卜师", px, portraitY + portraitH * 0.04);

        // ── Dialog box (custom image) ──
        const dlgW = W * 0.82;
        const dlgH = dlgW * 0.13; // flattened to fit bottom area, image stretches slightly
        const dlgX = (W - dlgW) / 2;
        const dlgY = H * 0.78;

        if (dlgImg.complete && dlgImg.naturalWidth > 0) {
          ctx!.drawImage(dlgImg, dlgX, dlgY, dlgW, dlgH);
        }

        // Speaker badge
        const badgeW = W * 0.08;
        const badgeH = H * 0.03;
        const badgeX = dlgX + W * 0.02;
        const badgeY = dlgY - badgeH * 0.5;
        ctx!.fillStyle = "rgba(40,25,60,0.9)";
        roundRect(ctx!, badgeX, badgeY, badgeW, badgeH, 6);
        ctx!.strokeStyle = "rgba(200,160,60,0.6)";
        ctx!.lineWidth = 1;
        roundRectStroke(ctx!, badgeX, badgeY, badgeW, badgeH, 6);
        ctx!.fillStyle = "#e8c870";
        ctx!.font = `600 ${W * 0.007}px "Microsoft YaHei"`;
        ctx!.textAlign = "center";
        ctx!.fillText("星谕", badgeX + badgeW / 2, badgeY + badgeH * 0.68);

        // ── Dialog text ──
        const entry = DIALOG[stg.dialogIdx];
        if (entry) {
          const visible = entry.text.slice(0, stg.charIdx);
          const lines = wrapText(ctx!, visible, dlgW - W * 0.06);
          ctx!.fillStyle = "#f0e6d0";
          ctx!.font = `${W * 0.009}px "Microsoft YaHei"`;
          ctx!.textAlign = "left";
          const lineH = W * 0.014;
          const tx = dlgX + W * 0.03;
          const ty = dlgY + dlgH * 0.3;
          for (let i = 0; i < Math.min(lines.length, 4); i++) {
            ctx!.fillText(lines[i], tx, ty + i * lineH);
          }
        }

        // Cursor blink
        if (stg.charIdx > 0 && stg.charIdx < (entry?.text.length ?? 0)) {
          const blinker = Date.now() % 600 < 300;
          if (blinker) {
            const lastLine = wrapText(ctx!, entry.text.slice(0, stg.charIdx), dlgW - W * 0.06);
            const lx = (dlgX + W * 0.03) + ctx!.measureText(lastLine[lastLine.length - 1] || "").width;
            const ly = (dlgY + dlgH * 0.3) + (lastLine.length - 1) * (W * 0.014);
            ctx!.fillStyle = "#fff";
            ctx!.fillRect(lx + 3, ly - W * 0.01, 2, W * 0.014);
          }
        }

        // ── Action buttons ──
        if (stg.phase === "shuffle") {
          // Three shuffle method buttons (row above dialog, but below the count row)
          const methodBtns = [
            { id: "mahjong", name: "麻将式", color: "#4a3060", border: "#aa88cc" },
            { id: "drawer", name: "抽屉式", color: "#4a3060", border: "#aa88cc" },
            { id: "riffle", name: "扑克式", color: "#4a3060", border: "#aa88cc" },
          ];
          const mbw = W * 0.16, mbh = H * 0.04;
          const mby = dlgY - H * 0.14;
          methodBtns.forEach((mb, i) => {
            const mbx = W * 0.05 + i * (mbw + W * 0.015);
            const active = state.shuffleMethod === mb.id;
            ctx!.fillStyle = active ? "rgba(80,50,120,0.85)" : "rgba(20,15,30,0.7)";
            roundRect(ctx!, mbx, mby, mbw, mbh, 6);
            ctx!.strokeStyle = active ? "rgba(220,180,255,0.8)" : "rgba(120,90,140,0.4)";
            ctx!.lineWidth = 1.5;
            roundRectStroke(ctx!, mbx, mby, mbw, mbh, 6);
            ctx!.fillStyle = active ? "#e8d0ff" : "#c0a888";
            ctx!.font = `${W * 0.008}px "Microsoft YaHei"`;
            ctx!.textAlign = "center";
            ctx!.fillText(mb.name, mbx + mbw / 2, mby + mbh * 0.65);
            newTargets.push({ x: mbx, y: mby, w: mbw, h: mbh, action: `method_${mb.id}` });
          });

          // Shuffle animation region (above the methods, below portrait)
          const animY = portraitY + portraitH + H * 0.015;
          const animH = mby - animY - H * 0.01;
          const animCx = W / 2;

          if (state.shuffleAnim) {
            const animTime = (state.shuffleAnim.until - Date.now()) / 1000;
            if (animTime > 0) {
              drawShuffleAnim(ctx!, state.shuffleAnim.kind, animCx, animY + animH / 2, W * 0.45, animH, animTime);
            } else {
              state.shuffleAnim = null;
            }
          } else {
            // Static deck preview
            drawDeckStack(ctx!, animCx, animY + animH / 2, W * 0.12, animH * 0.7, "rgba(140,80,200,0.4)");
          }

          drawButton(ctx!, "再洗一次", W * 0.45, dlgY - H * 0.045, W * 0.12, H * 0.035, "#4a3060", "#aa88cc", "shuffleAgain");
          drawButton(ctx!, "进入切牌", W * 0.6, dlgY - H * 0.045, W * 0.12, H * 0.035, "#3a2060", "#cc88ff", "gotoCut");
          drawButton(ctx!, "返回大厅", W * 0.75, dlgY - H * 0.045, W * 0.12, H * 0.035, "#333", "#aaa", "backToLobby");
          ctx!.fillStyle = "#cda870";
          ctx!.font = `${W * 0.007}px "Microsoft YaHei"`;
          ctx!.textAlign = "center";
          ctx!.fillText(`已洗牌 ${state.shuffleCount} 次 · 当前：${methodBtns.find(m => m.id === state.shuffleMethod)?.name || "麻将式"}`, W / 2, dlgY - H * 0.08);
        }

        if (stg.phase === "cut") {
          drawButton(ctx!, "切成两叠", W * 0.15, dlgY - H * 0.045, W * 0.12, H * 0.035, "#4a3060", "#aa88cc", "cutDeck");
          drawButton(ctx!, "进入抽牌", W * 0.5 - W * 0.06, dlgY - H * 0.045, W * 0.12, H * 0.035, "#3a2060", "#cc88ff", "gotoDraw");
          ctx!.fillStyle = state.didCut ? "#8e8" : "#888";
          ctx!.font = `${W * 0.007}px "Microsoft YaHei"`;
          ctx!.textAlign = "center";
          ctx!.fillText(state.didCut ? "已完成切牌" : "尚未切牌", W / 2, dlgY - H * 0.08);
        }

        if (stg.phase === "draw") {
          const scw = W * 0.17;
          const sch = H * 0.07;
          spreadChoices.current.forEach((sc, i) => {
            const scx = W * 0.05 + i * (scw + W * 0.02);
            const scy = dlgY - H * 0.115;
            const active = spreadIdxRef.current === i;
            ctx!.fillStyle = active ? "rgba(60,30,80,0.9)" : "rgba(20,15,35,0.8)";
            roundRect(ctx!, scx, scy, scw, sch, 8);
            ctx!.strokeStyle = active ? "rgba(200,150,255,0.6)" : "rgba(100,80,130,0.4)";
            ctx!.lineWidth = 1;
            roundRectStroke(ctx!, scx, scy, scw, sch, 8);
            ctx!.fillStyle = active ? "#e8d0ff" : "#aaa";
            ctx!.font = `${W * 0.008}px "Microsoft YaHei"`;
            ctx!.textAlign = "center";
            ctx!.fillText(sc.label, scx + scw / 2, scy + sch * 0.35);
            ctx!.font = `${W * 0.006}px "Microsoft YaHei"`;
            ctx!.fillStyle = "#999";
            ctx!.fillText(`${sc.count}张牌`, scx + scw / 2, scy + sch * 0.7);
            clickTargets.push({ x: scx, y: scy, w: scw, h: sch, action: `chooseSpread_${i}` });
          });
          drawButton(ctx!, "抽一张牌", W * 0.6, dlgY - H * 0.045, W * 0.12, H * 0.035, "#3a2060", "#cc88ff", "drawCard");
          drawButton(ctx!, "统一翻牌", W * 0.6, dlgY - H * 0.09, W * 0.12, H * 0.035, "#4a1560", "#dd77ff", "gotoResult");
          ctx!.fillStyle = "#cda870";
          ctx!.font = `${W * 0.007}px "Microsoft YaHei"`;
          ctx!.textAlign = "left";
          ctx!.fillText(`已抽 ${state.drawnCards.length} / ${state.selectedSpread.positions.length} 张`, W * 0.05, dlgY - H * 0.13);
        }

        if (stg.phase === "result") {
          drawButton(ctx!, "重新占卜", W * 0.15, dlgY - H * 0.045, W * 0.12, H * 0.035, "#333", "#aaa", "reset");
          drawButton(ctx!, "返回大厅", W * 0.5 - W * 0.06, dlgY - H * 0.045, W * 0.12, H * 0.035, "#333", "#aaa", "backToLobby");
          if (readingText.current) {
            const rtx = W * 0.1;
            const rty = portraitY + portraitH + H * 0.02;
            ctx!.fillStyle = "rgba(0,0,0,0.6)";
            roundRect(ctx!, rtx - 10, rty - 10, W * 0.8, H * 0.25, 10);
            const rlines = readingText.current.split("\n");
            ctx!.fillStyle = "#e8d0c0";
            ctx!.font = `${W * 0.007}px "Microsoft YaHei"`;
            ctx!.textAlign = "left";
            for (let i = 0; i < Math.min(rlines.length, 10); i++) {
              ctx!.fillText(rlines[i], rtx, rty + i * W * 0.013);
            }
          }
        }

        if (stg.phase === "end") {
          drawButton(ctx!, "重新占卜", W * 0.35 - W * 0.06, dlgY - H * 0.045, W * 0.12, H * 0.035, "#4a3060", "#aa88cc", "reset");
          drawButton(ctx!, "返回大厅", W * 0.55 - W * 0.06, dlgY - H * 0.045, W * 0.12, H * 0.035, "#333", "#aaa", "backToLobby");
        }

        // Click indicator arrow
        if (stg.phase === "dialog") {
          const entry2 = DIALOG[stg.dialogIdx];
          const done = stg.charIdx >= (entry2?.text.length ?? 0);
          if (done && Date.now() % 1200 < 700) {
            ctx!.fillStyle = "#aa8866";
            const ax = dlgX + dlgW - W * 0.03;
            const ay = dlgY + dlgH - H * 0.015;
            ctx!.beginPath();
            ctx!.moveTo(ax - W * 0.01, ay - W * 0.008);
            ctx!.lineTo(ax + W * 0.01, ay);
            ctx!.lineTo(ax - W * 0.01, ay + W * 0.008);
            ctx!.fill();
          }
        }

        clickTargets = newTargets;
      }

      drawRef.current = drawOnce;
      drawOnce(); // initial draw

      // Typing animation loop
      function animateTyping() {
        const stg = stageRef.current;
        const entry = DIALOG[stg.dialogIdx];
        if (entry && stg.charIdx < entry.text.length && stg.phase === "dialog") {
          stg.charIdx++;
        }
        drawOnce();
        animRef.current = requestAnimationFrame(animateTyping);
      }
      animateTyping();

      const onResize = () => drawOnce();
      window.addEventListener("resize", onResize);
      return () => {
        try { cancelAnimationFrame(animRef.current); } catch {}
        window.removeEventListener("resize", onResize);
      };
    };

    function ready() { return dlgImg.complete && dlgImg.naturalWidth > 0 && heroImg.complete && heroImg.naturalWidth > 0; }
    dlgImg.onload = () => { if (ready()) init(); };
    heroImg.onload = () => { if (ready()) init(); };
    if (ready()) init();
  }, []);

  // ─── Click handler ───
  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const stg = stageRef.current;
    const state = stateRef.current;
    const redraw = () => drawRef.current();

    // Check click targets first
    for (const t of newTargets) {
      if (mx >= t.x && mx <= t.x + t.w && my >= t.y && my <= t.y + t.h) {
        if (t.action === "shuffleAgain") {
          state.deck = shuffleDeck(state.deck);
          state.shuffleCount++;
          state.shuffleAnim = { kind: state.shuffleMethod, until: Date.now() + 1500 };
          redraw();
          return;
        }
        if (t.action.startsWith("method_")) {
          state.shuffleMethod = t.action.replace("method_", "") as "mahjong" | "drawer" | "riffle";
          state.shuffleAnim = { kind: state.shuffleMethod, until: Date.now() + 1500 };
          state.deck = shuffleDeck(state.deck);
          state.shuffleCount++;
          redraw();
          return;
        }
        if (t.action === "gotoCut") {
          if (state.shuffleCount === 0) return;
          stg.phase = "cut";
          stg.dialogIdx = 11; // jump to cut dialog
          stg.charIdx = 0;
          redraw();
          return;
        }
        if (t.action === "cutDeck") {
          state.deck = shuffleDeck(state.deck);
          state.didCut = true;
          redraw();
          return;
        }
        if (t.action === "gotoDraw") {
          stg.phase = "draw";
          stg.dialogIdx = 16; // jump to draw dialog
          stg.charIdx = 0;
          redraw();
          return;
        }
        if (t.action.startsWith("chooseSpread_")) {
          const idx = parseInt(t.action.split("_")[1]!);
          spreadIdxRef.current = idx;
          const sc = spreadChoices.current[idx]!;
          const spread = TAROT_SPREADS.find(s => s.id === sc.id) ?? TAROT_SPREADS[1]!;
          state.selectedSpread = spread;
          redraw();
          return;
        }
        if (t.action === "drawCard") {
          if (state.drawnCards.length >= state.selectedSpread.positions.length || state.deck.length === 0) return;
          const [nextCard, ...rest] = state.deck;
          if (!nextCard) return;
          state.drawnCards.push({
            card: nextCard,
            reversed: Math.random() < 0.35,
            position: state.selectedSpread.positions[state.drawnCards.length]!,
          });
          state.deck = rest;
          redraw();
          return;
        }
        if (t.action === "gotoResult") {
          if (state.drawnCards.length !== state.selectedSpread.positions.length) return;
          readingText.current = buildReadingText(state.drawnCards);
          stg.phase = "result";
          stg.dialogIdx = 21; // jump to reveal dialog
          stg.charIdx = 0;
          redraw();
          return;
        }
        if (t.action === "reset") {
          state.deck = shuffleDeck(FULL_TAROT_DECK);
          state.shuffleCount = 0;
          state.didCut = false;
          state.drawnCards = [];
          readingText.current = "";
          stg.phase = "dialog";
          stg.dialogIdx = 0;
          stg.charIdx = 0;
          redraw();
          return;
        }
        if (t.action === "backToLobby") {
          navigate("/lobby");
          return;
        }
      }
    }

    // No button hit → only advance dialog during "dialog" phase, and only if clicked inside dialog box
    if (stg.phase !== "dialog") return;

    // Check if click is inside dialog box
    const dlgW = window.innerWidth * 0.82;
    const dlgH = window.innerHeight * 0.16;
    const dlgX = (window.innerWidth - dlgW) / 2;
    const dlgY = window.innerHeight * 0.78;
    if (mx < dlgX || mx > dlgX + dlgW || my < dlgY || my > dlgY + dlgH) return;

    const entry = DIALOG[stg.dialogIdx];
    if (!entry) return;

    if (stg.charIdx < entry.text.length) {
      // Complete typing immediately
      stg.charIdx = entry.text.length;
      redraw();
      return;
    }

    // Got to next line
    if (stg.dialogIdx < DIALOG.length - 1) {
      stg.dialogIdx++;
      stg.charIdx = 0;

      if (entry.waitForAction) {
        const action = entry.waitForAction;
        if (action === "shuffle") stg.phase = "shuffle";
        else if (action === "cut") stg.phase = "cut";
        else if (action === "draw") stg.phase = "draw";
        else if (action === "done") stg.phase = "end";
      }

      redraw();
    }
  }, [navigate]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const stg = stageRef.current;
    const W = window.innerWidth;
    const H = window.innerHeight;

    // Check if over dialog box
    const dlgW = W * 0.82;
    const dlgH = H * 0.16;
    const dlgX = (W - dlgW) / 2;
    const dlgY = H * 0.78;
    const overDialog = mx >= dlgX && mx <= dlgX + dlgW && my >= dlgY && my <= dlgY + dlgH;

    // Check if over any button
    let overButton = false;
    for (const t of clickTargets) {
      if (mx >= t.x && mx <= t.x + t.w && my >= t.y && my <= t.y + t.h) {
        overButton = true;
        break;
      }
    }

    if (stg.phase === "dialog" && overDialog) {
      e.currentTarget.style.cursor = "pointer";
    } else if (overButton) {
      e.currentTarget.style.cursor = "pointer";
    } else {
      e.currentTarget.style.cursor = "default";
    }
  }, []);

  return (
    <main className="relative w-full h-full bg-black">
      <video
        autoPlay
        muted
        loop
        playsInline
        className="absolute inset-0 z-0 w-full h-full object-cover"
        src={DIVINATION_VIDEO}
        onCanPlay={(e) => { e.currentTarget.play().catch(() => {}); }}
      />
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        className="absolute inset-0 z-10"
      />
    </main>
  );
}

// ─── Canvas helpers ───
let clickTargets: { x: number; y: number; w: number; h: number; action: string }[] = [];
let newTargets: typeof clickTargets = [];

function drawButton(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, w: number, h: number, bg: string, border: string, action: string) {
  ctx.fillStyle = bg;
  roundRect(ctx, x, y, w, h, 6);
  ctx.strokeStyle = border;
  ctx.lineWidth = 1.5;
  roundRectStroke(ctx, x, y, w, h, 6);
  ctx.fillStyle = "#e8d0c0";
  ctx.font = `${h * 0.4}px "Microsoft YaHei"`;
  ctx.textAlign = "center";
  ctx.fillText(text, x + w / 2, y + h * 0.65);
  newTargets.push({ x, y, w, h, action });
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.fill();
}

function roundRectStroke(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  ctx.stroke();
}

function drawDeckStack(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number, color: string) {
  const layers = 7;
  const off = h * 0.012;
  for (let i = layers - 1; i >= 0; i--) {
    ctx.fillStyle = `rgba(${i % 2 === 0 ? 70 : 40},${30 + i * 4},${80 + i * 8},${0.9 - i * 0.05})`;
    ctx.fillRect(cx - w / 2 + i * off, cy - h / 2 + i * off, w - i * off * 2, h - i * off * 2);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.strokeRect(cx - w / 2 + i * off, cy - h / 2 + i * off, w - i * off * 2, h - i * off * 2);
  }
}

function drawShuffleAnim(ctx: CanvasRenderingContext2D, kind: string, cx: number, cy: number, w: number, h: number, _t: number) {
  const phi = Date.now() * 0.005;

  if (kind === "mahjong") {
    const layers = 8;
    for (let i = 0; i < layers; i++) {
      const ang = phi + (i / layers) * Math.PI * 2;
      const orbit = h * 0.18 * (0.8 + 0.4 * Math.sin(phi * 0.5));
      const cardW = w * 0.14;
      const cardH = h * 0.32;
      const x = cx + Math.cos(ang) * orbit - cardW / 2;
      const y = cy + Math.sin(ang) * orbit - cardH / 2;
      ctx.fillStyle = `rgba(140,80,200,${0.7 - i * 0.06})`;
      ctx.fillRect(x, y, cardW, cardH);
      ctx.strokeStyle = "rgba(220,180,255,0.6)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, cardW, cardH);
    }
    for (let i = 0; i < 14; i++) {
      const ang = phi * 2 + i;
      const r = h * 0.06 + Math.abs(Math.sin(ang)) * h * 0.04;
      const a = 0.5 + 0.5 * Math.sin(ang * 2);
      ctx.fillStyle = `rgba(255,240,180,${a})`;
      ctx.beginPath();
      ctx.arc(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (kind === "drawer") {
    const cardW = w * 0.12;
    const cardH = h * 0.5;
    const splitY = cy;
    const slide = w * 0.18 * Math.sin(phi * 0.8);
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = `rgba(120,70,180,${0.8 - i * 0.1})`;
      ctx.fillRect(cx - cardW * 0.5, splitY - cardH - i * 5, cardW, cardH);
      ctx.strokeStyle = "rgba(220,180,255,0.5)";
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - cardW * 0.5, splitY - cardH - i * 5, cardW, cardH);
    }
    for (let i = 0; i < 5; i++) {
      ctx.fillStyle = `rgba(80,40,140,${0.8 - i * 0.1})`;
      ctx.fillRect(cx - cardW * 0.5 + slide, splitY + i * 5, cardW, cardH);
      ctx.strokeStyle = "rgba(220,180,255,0.5)";
      ctx.lineWidth = 1;
      ctx.strokeRect(cx - cardW * 0.5 + slide, splitY + i * 5, cardW, cardH);
    }
  } else {
    const cardW = w * 0.08;
    const cardH = h * 0.3;
    for (let i = 0; i < 12; i++) {
      const ang = i * (Math.PI / 6) + phi * 0.5;
      const fallPhase = Math.abs(Math.sin(ang + phi * 2));
      const yOff = -fallPhase * h * 0.4;
      const xOff = Math.sin(ang) * w * 0.25;
      const rot = ang + Math.sin(phi) * 0.3;
      ctx.save();
      ctx.translate(cx + xOff, cy + yOff);
      ctx.rotate(rot);
      ctx.fillStyle = `rgba(${100 + i * 10},${60 + i * 8},${180 - i * 5},0.75)`;
      ctx.fillRect(-cardW / 2, -cardH / 2, cardW, cardH);
      ctx.strokeStyle = "rgba(220,200,255,0.5)";
      ctx.lineWidth = 1;
      ctx.strokeRect(-cardW / 2, -cardH / 2, cardW, cardH);
      ctx.restore();
    }
  }
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  let current = "";
  for (const ch of text) {
    if (ctx.measureText(current + ch).width > maxWidth) {
      lines.push(current);
      current = ch;
    } else {
      current += ch;
    }
  }
  if (current) lines.push(current);
  return lines;
}
