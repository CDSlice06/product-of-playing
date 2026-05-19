from __future__ import annotations

import io
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from PIL import Image, ImageOps


PUBLIC_URL = "https://product-of-playing.vercel.app/"


def fetch_qr_code(url: str, size: int) -> Image.Image:
    qr_url = (
        "https://api.qrserver.com/v1/create-qr-code/"
        f"?size={size}x{size}&data={urllib.parse.quote(url, safe='')}"
    )
    with urllib.request.urlopen(qr_url) as response:
        qr_bytes = response.read()
    return Image.open(io.BytesIO(qr_bytes)).convert("RGBA")


def main() -> int:
    if len(sys.argv) < 2:
        print("用法: python scripts/add_qr_to_poster.py <输入图片路径> [输出图片路径]")
        return 1

    input_path = Path(sys.argv[1]).expanduser().resolve()
    if not input_path.exists():
        print(f"未找到输入图片: {input_path}")
        return 1

    if len(sys.argv) >= 3:
        output_path = Path(sys.argv[2]).expanduser().resolve()
    else:
        output_path = input_path.with_name(f"{input_path.stem}-带二维码{input_path.suffix}")

    poster = Image.open(input_path).convert("RGBA")
    width, height = poster.size

    qr_size = max(140, int(min(width, height) * 0.18))
    margin = max(20, int(min(width, height) * 0.03))
    panel_padding = max(12, int(qr_size * 0.08))
    radius = max(16, int(qr_size * 0.12))

    qr = fetch_qr_code(PUBLIC_URL, qr_size)
    qr = ImageOps.contain(qr, (qr_size, qr_size))

    panel_size = (qr.width + panel_padding * 2, qr.height + panel_padding * 2)
    panel = Image.new("RGBA", panel_size, (255, 255, 255, 0))
    panel_bg = Image.new("RGBA", panel_size, (255, 255, 255, 230))
    panel_mask = Image.new("L", panel_size, 0)
    ImageDraw = __import__("PIL.ImageDraw", fromlist=["ImageDraw"]).ImageDraw
    draw = ImageDraw.Draw(panel_mask)
    draw.rounded_rectangle((0, 0, panel_size[0], panel_size[1]), radius=radius, fill=255)
    panel.alpha_composite(panel_bg)
    panel.putalpha(panel_mask)

    qr_x = panel_padding
    qr_y = panel_padding
    panel.alpha_composite(qr, (qr_x, qr_y))

    output = poster.copy()
    panel_x = width - panel.width - margin
    panel_y = height - panel.height - margin
    output.alpha_composite(panel, (panel_x, panel_y))

    output.save(output_path)
    print(f"已生成二维码海报: {output_path}")
    print(f"二维码指向: {PUBLIC_URL}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
