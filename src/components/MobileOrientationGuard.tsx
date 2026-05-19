import { Smartphone } from "lucide-react";
import { useLocation } from "react-router-dom";

export default function MobileOrientationGuard() {
  const { pathname } = useLocation();

  if (pathname !== "/battle") {
    return null;
  }

  return (
    <div className="mobile-orientation-guard">
      <div className="mobile-orientation-card pixel-panel">
        <div className="mobile-orientation-icon">
          <Smartphone className="size-10 text-amber-400" />
        </div>
        <h2 className="text-lg font-bold text-amber-400 text-shadow-pixel">战斗建议横屏</h2>
        <p className="mt-3 text-xs leading-6 text-gray-200">
          登录和大厅已支持竖屏操作，进入对局后横屏体验更稳定，棋盘与技能栏会完整显示。
        </p>
      </div>
    </div>
  );
}
