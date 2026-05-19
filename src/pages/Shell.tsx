import { useEffect, useMemo, useState } from "react";
import ShellFrame from "@/components/shell/ShellFrame";
import ShellLoading from "@/components/shell/ShellLoading";
import { useViewportFit } from "@/hooks/useViewportFit";
import { buildGameFrameUrl, getRequestedGameRoute, type ShellStatus } from "@/utils/shell";

const FRAME_TIMEOUT_MS = 12000;

export default function Shell() {
  const { isMobile, isLandscape } = useViewportFit();
  const [reloadSeed, setReloadSeed] = useState(0);
  const [status, setStatus] = useState<ShellStatus>("booting");

  const requestedRoute = useMemo(
    () => (typeof window === "undefined" ? null : getRequestedGameRoute(window.location.search)),
    [],
  );

  const frameUrl = useMemo(() => buildGameFrameUrl(requestedRoute, reloadSeed), [reloadSeed, requestedRoute]);

  useEffect(() => {
    setStatus("loading-frame");
    const timer = window.setTimeout(() => {
      setStatus((current) => (current === "ready" ? current : "timeout"));
    }, FRAME_TIMEOUT_MS);

    return () => {
      window.clearTimeout(timer);
    };
  }, [frameUrl]);

  const handleRetry = () => {
    setStatus("loading-frame");
    setReloadSeed((current) => current + 1);
  };

  const handleFrameLoad = () => {
    setStatus("ready");
  };

  return (
    <main className="shell-root">
      <div className="shell-backdrop" />
      <section className="shell-stage">
        <header className="shell-header">
          <div>
            <p className="shell-label">公网兼容壳层</p>
            <h1 className="shell-heading">命运之战</h1>
          </div>
          <div className="shell-header-meta">
            <span>标准相对路径</span>
            <span>移动端安全区适配</span>
            <span>Vercel 直传部署</span>
          </div>
        </header>

        <div className="shell-frame-wrap">
          <ShellFrame src={frameUrl} title="命运之战游戏框架" onLoad={handleFrameLoad} />
          {status !== "ready" && (
            <ShellLoading
              status={status}
              isMobile={isMobile}
              isLandscape={isLandscape}
              onRetry={handleRetry}
              directHref={frameUrl}
            />
          )}
        </div>
      </section>
    </main>
  );
}
