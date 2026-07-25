import { useEffect, useRef } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useSoundStore } from "@/store/soundStore";
import { getSoundEngine, type SoundScene } from "@/utils/soundEngine";

function routeToScene(pathname: string): SoundScene {
  if (pathname.startsWith("/battle")) {
    return "battle";
  }
  if (pathname.startsWith("/divination")) {
    return "divination";
  }
  if (pathname.startsWith("/result") || pathname.startsWith("/ranked")) {
    return "victory";
  }
  return "lobby";
}

export default function SoundToggle() {
  const enabled = useSoundStore((state) => state.enabled);
  const toggle = useSoundStore((state) => state.toggle);
  const location = useLocation();
  const mountedRef = useRef(false);
  const sceneRef = useRef<SoundScene>("lobby");

  useEffect(() => {
    const scene = routeToScene(location.pathname);

    if (!mountedRef.current) {
      mountedRef.current = true;
      sceneRef.current = scene;
      if (enabled) {
        const engine = getSoundEngine();
        engine.start(scene);
      }
      return;
    }

    if (scene !== sceneRef.current) {
      sceneRef.current = scene;
      if (enabled) {
        const engine = getSoundEngine();
        engine.switchScene(scene);
      }
    }
  }, [location.pathname, enabled]);

  useEffect(() => {
    const engine = getSoundEngine();
    engine.setEnabled(enabled);
  }, [enabled]);

  return (
    <button
      type="button"
      onClick={toggle}
      title={enabled ? "关闭背景音乐" : "开启背景音乐"}
      className="rounded-full border-2 border-[#d5b89b] bg-[#fff9ef] text-[#8e5d37] shadow-[0_4px_12px_rgba(75,55,39,0.15)] hover:border-[#b78b55] hover:bg-[#fff1df] flex items-center justify-center"
      style={{ position: 'fixed', right: '0.8vw', top: '0.8vw', zIndex: 9999, width: '2.2vw', height: '2.2vw' }}
    >
      {enabled ? <Volume2 style={{ width: '1.2vw', height: '1.2vw' }} /> : <VolumeX style={{ width: '1.2vw', height: '1.2vw' }} />}
    </button>
  );
}
