"""去除 lobby-title.png 的白色背景，生成透明背景版本（激进去白版）。

策略：
1. flood-fill 从四角出发，把所有 min(r,g,b) >= threshold 的白色连通像素设为 alpha=0。
2. 对于已经 alpha=0 但 RGB 仍是白色的像素，不再做羽化（避免在图案周围留下白色雾）。
3. 真正贴近图案的像素（即：被 flood-fill 命中的 alpha=0 像素，但 RGB 含图案颜色），
   用其原始 RGB 替换为透明即可（保留一些原色值作为设计延伸）。

用法: python scripts/remove_white_bg.py
"""
from __future__ import annotations

from collections import deque
from pathlib import Path

from PIL import Image


def flood_fill_to_transparent(
    pixels,
    width: int,
    height: int,
    threshold: int = 240,
) -> None:
    """从四角出发 flood-fill，把与白色背景连通的像素标记为透明。

    threshold 越低，命中越多。设计区的金/紫色像素 min(r,g,b) 远小于阈值，
    不会被错误处理。
    """
    queue = deque()
    visited = set()
    for x in (0, width - 1):
        for y in (0, height - 1):
            queue.append((x, y))
            visited.add((x, y))

    while queue:
        x, y = queue.popleft()
        r, g, b = pixels[x, y][:3]
        if min(r, g, b) < threshold:
            continue

        # 标记为完全透明（保留 RGB 值不影响显示）
        pixels[x, y] = (r, g, b, 0)

        for nx, ny in ((x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)):
            if 0 <= nx < width and 0 <= ny < height and (nx, ny) not in visited:
                visited.add((nx, ny))
                queue.append((nx, ny))


def remove_white_background(
    src: Path, dst: Path, threshold: int = 240
) -> None:
    img = Image.open(src).convert("RGBA")
    pixels = img.load()
    width, height = img.size

    flood_fill_to_transparent(pixels, width, height, threshold)
    # 不做羽化：用户明确要求"连着图案的白色也要去干净"，
    # 任何保留白色 alpha 的像素都会在暗背景上露出白色雾。

    img.save(dst, "PNG", optimize=True)
    print(f"  透明化完成: {dst}")
    print(f"  阈值: min(r,g,b) >= {threshold} (去掉了所有连着背景的白色)")


def main() -> int:
    project_root = Path(__file__).resolve().parent.parent
    src = project_root / "src" / "assets" / "lobby-title.png"
    dst = project_root / "src" / "assets" / "lobby-title.png"

    if not src.exists():
        print(f"找不到源文件: {src}")
        return 1

    remove_white_background(src, dst)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())