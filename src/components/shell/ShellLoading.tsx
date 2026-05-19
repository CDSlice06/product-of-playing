import { LoaderCircle, RefreshCcw, Smartphone, TabletSmartphone } from "lucide-react";
import type { ShellStatus } from "@/utils/shell";

interface ShellLoadingProps {
  status: ShellStatus;
  isMobile: boolean;
  isLandscape: boolean;
  onRetry: () => void;
  directHref: string;
}

function getStatusCopy(status: ShellStatus) {
  switch (status) {
    case "ready":
      return {
        title: "加载完成",
        description: "游戏已连接成功，正在进入对局。",
      };
    case "timeout":
      return {
        title: "加载稍慢",
        description: "当前网络环境下游戏初始化超时，可重试或直接打开内层游戏入口。",
      };
    case "error":
      return {
        title: "连接异常",
        description: "外层壳页未能成功连接内层游戏，请重试。",
      };
    default:
      return {
        title: "正在连接命运之战",
        description: "外层框架已启动，正在以兼容手机与公网的方式载入游戏本体。",
      };
  }
}

export default function ShellLoading({
  status,
  isMobile,
  isLandscape,
  onRetry,
  directHref,
}: ShellLoadingProps) {
  const copy = getStatusCopy(status);
  const showActions = status === "timeout" || status === "error";

  return (
    <div className="shell-loading">
      <div className="shell-loading-card">
        <div className="shell-loading-icon">
          {isMobile ? <Smartphone className="h-6 w-6" /> : <TabletSmartphone className="h-6 w-6" />}
        </div>
        <p className="shell-loading-eyebrow">命运之战</p>
        <h1 className="shell-loading-title">{copy.title}</h1>
        <p className="shell-loading-copy">{copy.description}</p>
        <div className="shell-loading-chips">
          <span className="shell-chip">{isMobile ? "手机适配中" : "桌面模式"}</span>
          <span className="shell-chip">{isLandscape ? "横向视图" : "纵向视图"}</span>
          <span className="shell-chip">iframe 稳定加载</span>
        </div>
        {!showActions && (
          <div className="shell-spinner-row">
            <LoaderCircle className="h-5 w-5 animate-spin" />
            <span>正在准备游戏资源...</span>
          </div>
        )}
        {showActions && (
          <div className="shell-loading-actions">
            <button type="button" className="shell-primary-button" onClick={onRetry}>
              <RefreshCcw className="h-4 w-4" />
              重新加载
            </button>
            <a className="shell-secondary-button" href={directHref}>
              直接进入游戏
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
