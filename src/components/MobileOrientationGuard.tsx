import { Smartphone } from "lucide-react";

export default function MobileOrientationGuard() {
  return (
    <div className="mobile-orientation-guard">
      <div className="mobile-orientation-card pixel-panel">
        <div className="mobile-orientation-icon">
          <Smartphone className="size-10 text-amber-400" />
        </div>
        <h2 className="text-lg font-bold text-amber-400 text-shadow-pixel">请横屏体验</h2>
        <p className="mt-3 text-xs leading-6 text-gray-200">
          为了保证棋盘、手牌和联机面板完整显示，请将手机旋转到横屏后继续游戏。
        </p>
      </div>
    </div>
  );
}
