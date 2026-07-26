import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSessionStore } from "@/store/sessionStore";
import { ASSETS } from "@/constants/assets";
import LobbyCharacter from "@/components/LobbyCharacter";
import LobbyEffects from "@/components/LobbyEffects";


export default function Auth() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hovered, setHovered] = useState(false);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const scaleRef = useRef(1);

  useEffect(() => {
    document.title = "命运之战 | 像素大厅";
  }, []);

  // Load image once
  useEffect(() => {
    const img = new Image();
    img.onload = () => { imgRef.current = img; draw(); };
    img.src = ASSETS.START_BUTTON;
  }, []);

  // Redraw on hover change
  useEffect(() => {
    scaleRef.current = hovered ? 1.1 : 1;
    draw();
  }, [hovered]);

  function draw() {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    const dpr = window.devicePixelRatio || 1;
    const scale = scaleRef.current;
    const bw = window.innerWidth * 0.25;
    const bh = bw * (img.height / img.width);
    const cw = bw * scale;
    const ch = bh * scale;

    canvas.width = cw * dpr;
    canvas.height = ch * dpr;
    canvas.style.width = cw + 'px';
    canvas.style.height = ch + 'px';

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.drawImage(img, 0, 0, cw, ch);
  }

  // Redraw on resize
  useEffect(() => {
    const onResize = () => draw();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleStart = () => {
    useSessionStore.setState({
      ready: true,
      mode: "authenticated",
      profile: {
        id: "local-1",
        username: "astrologer",
        displayName: "占星师",
        ratingPoints: 0,
        rankTier: "知灵",
        wins: 0,
        losses: 0,
        isGuest: false,
      },
      authUserId: "local-1",
    });
    navigate('/lobby');
  };

  return (
    <main className="app-shell relative overflow-hidden bg-black">
      <div
        className="absolute inset-0 z-0 pointer-events-none"
        style={{ backgroundImage: `url(${ASSETS.LOBBY_BG})`, backgroundSize: '100%', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }}
      />

      <LobbyCharacter />

      <LobbyEffects />

      <img
        src={ASSETS.LOBBY_TITLE}
        alt="星轨塔罗棋"
        className="absolute z-20 pointer-events-none"
        style={{ top: '-7vh', left: '49.8%', transform: 'translateX(-50%)', width: '70vw', height: 'auto' }}
      />

      <img
        src={ASSETS.ASTROLOGER_BANNER}
        alt="紫衣占星师"
        className="absolute z-20 pointer-events-none"
        style={{ top: '24vh', left: '5vw', width: '4.5vw', height: 'auto' }}
      />

      <img
        src={ASSETS.OCCULTIST_BANNER}
        alt="暗黑秘术师"
        className="absolute z-20 pointer-events-none"
        style={{ top: '24vh', right: '5vw', width: '4.5vw', height: 'auto' }}
      />

      <canvas
        ref={canvasRef}
        onClick={handleStart}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="absolute z-30"
        style={{
          top: '70vh',
          left: '49.8%',
          transform: 'translate(-50%, -50%)',
          cursor: 'pointer',
        }}
      />
    </main>
  );
}
