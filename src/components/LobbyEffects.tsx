import { useEffect, useRef } from "react";

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  size: number; alpha: number;
  speed: number;
}

interface ShootingStar {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  length: number;
}

export default function LobbyEffects() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId = 0;
    let t = 0;
    let particles: Particle[] = [];
    let shootingStars: ShootingStar[] = [];

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      canvas!.width = window.innerWidth * dpr;
      canvas!.height = window.innerHeight * dpr;
      canvas!.style.width = window.innerWidth + "px";
      canvas!.style.height = window.innerHeight + "px";
    }
    resize();
    window.addEventListener("resize", resize);

    // Init star particles
    for (let i = 0; i < 120; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        vx: (Math.random() - 0.5) * 0.2,
        vy: -(Math.random() * 0.3 + 0.1),
        size: Math.random() * 1.8 + 0.3,
        alpha: Math.random() * 0.7 + 0.3,
        speed: Math.random() * 0.012 + 0.003,
      });
    }

    function spawnShootingStar() {
      const fromTop = Math.random() < 0.6;
      shootingStars.push({
        x: Math.random() * window.innerWidth,
        y: fromTop ? Math.random() * window.innerHeight * 0.3 : Math.random() * window.innerHeight * 0.5 + window.innerHeight * 0.3,
        vx: (Math.random() - 0.5) * 8 + 2,
        vy: Math.random() * 4 + 2,
        life: 0,
        maxLife: 60 + Math.random() * 40,
        length: 40 + Math.random() * 80,
      });
    }

    function loop() {
      const W = window.innerWidth;
      const H = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.clearRect(0, 0, W, H);
      t++;

      // ---- 1. Star particles floating up ----
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.x += p.vx + Math.sin(t * 0.01 + i) * 0.15;
        p.y += p.vy * 0.5;
        p.alpha = 0.3 + Math.sin(t * p.speed + i) * 0.4;

        // Reset when off screen
        if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
        if (p.x < -10) p.x = W + 10;
        if (p.x > W + 10) p.x = -10;

        const a = Math.abs(p.alpha);
        ctx!.fillStyle = `rgba(255,220,180,${a})`;
        ctx!.beginPath();
        ctx!.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx!.fill();

        // Larger glow on bigger particles
        if (p.size > 1.2 && a > 0.5) {
          ctx!.fillStyle = `rgba(180,160,255,${a * 0.25})`;
          ctx!.beginPath();
          ctx!.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      // ---- 2. Shooting stars ----
      // Occasional spawn
      if (Math.random() < 0.015) {
        spawnShootingStar();
      }

      for (let i = shootingStars.length - 1; i >= 0; i--) {
        const s = shootingStars[i];
        s.life++;
        if (s.life > s.maxLife) { shootingStars.splice(i, 1); continue; }
        const progress = s.life / s.maxLife;
        const alpha = progress < 0.2 ? progress / 0.2 : 1 - (progress - 0.2) / 0.8;

        const x2 = s.x + s.vx * s.maxLife * progress;
        const y2 = s.y + s.vy * s.maxLife * progress;

        // Gradient streak
        const grad = ctx!.createLinearGradient(s.x, s.y, x2, y2);
        grad.addColorStop(0, `rgba(255,255,255,${alpha})`);
        grad.addColorStop(0.3, `rgba(255,240,200,${alpha * 0.6})`);
        grad.addColorStop(1, `rgba(255,255,255,0)`);
        ctx!.strokeStyle = grad;
        ctx!.lineWidth = 1.5;
        ctx!.beginPath();
        ctx!.moveTo(s.x, s.y);
        ctx!.lineTo(x2, y2);
        ctx!.stroke();
      }

      // ---- 3. Purple orb glow around characters ----
      // Left crystal ball area
      const leftCX = W * 0.17, leftCY = H * 0.55;
      const rightCX = W * 0.83, rightCY = H * 0.55;

      for (const [cx, cy] of [[leftCX, leftCY], [rightCX, rightCY]]) {
        const breath = 0.5 + 0.5 * Math.sin(t * 0.03) * 0.2 + 0.3;
        const glow1 = ctx!.createRadialGradient(cx, cy, 30, cx, cy, 200);
        glow1.addColorStop(0, `rgba(160,100,255,${breath * 0.12})`);
        glow1.addColorStop(0.5, `rgba(100,60,200,${breath * 0.05})`);
        glow1.addColorStop(1, "rgba(0,0,0,0)");
        ctx!.fillStyle = glow1;
        ctx!.fillRect(cx - 200, cy - 200, 400, 400);

        // Small sparkle particles near orbs
        if (Math.random() < 0.4) {
          const sx = cx + (Math.random() - 0.5) * 150;
          const sy = cy + (Math.random() - 0.5) * 150;
          ctx!.fillStyle = `rgba(220,180,255,${0.3 + Math.random() * 0.4})`;
          ctx!.beginPath();
          ctx!.arc(sx, sy, 1 + Math.random() * 2, 0, Math.PI * 2);
          ctx!.fill();
        }
      }

      animId = requestAnimationFrame(loop);
    }

    loop();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-[2] pointer-events-none"
    />
  );
}
