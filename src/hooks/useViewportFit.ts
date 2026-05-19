import { useEffect, useState } from "react";
import { isLandscapeViewport, isMobileViewport } from "@/utils/shell";

interface ViewportFitState {
  width: number;
  height: number;
  isMobile: boolean;
  isLandscape: boolean;
}

function measureViewport(): ViewportFitState {
  const width = window.innerWidth;
  const height = window.innerHeight;

  return {
    width,
    height,
    isMobile: isMobileViewport(width),
    isLandscape: isLandscapeViewport(width, height),
  };
}

export function useViewportFit() {
  const [state, setState] = useState<ViewportFitState>(() =>
    typeof window === "undefined"
      ? { width: 1280, height: 720, isMobile: false, isLandscape: true }
      : measureViewport(),
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const updateViewport = () => {
      const next = measureViewport();
      document.documentElement.style.setProperty("--shell-dvh", `${next.height}px`);
      setState(next);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    window.addEventListener("orientationchange", updateViewport);

    return () => {
      window.removeEventListener("resize", updateViewport);
      window.removeEventListener("orientationchange", updateViewport);
    };
  }, []);

  return state;
}
