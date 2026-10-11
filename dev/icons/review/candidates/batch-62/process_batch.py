"""Split Batch 62 atlases into review glyphs; never install production assets."""
from __future__ import annotations

import base64
import io
import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parents[1]))
from prepare_candidate import alpha_mask

SIZE = 256
SAFE = 216


def normalize(source: Image.Image) -> Image.Image:
    mask = alpha_mask(source)
    bounds = mask.getbbox()
    if not bounds:
        raise ValueError("empty atlas cell")
    fitted = ImageOps.contain(mask.crop(bounds), (SAFE, SAFE), Image.Resampling.LANCZOS)
    canvas = Image.new("L", (SIZE, SIZE), 0)
    canvas.paste(fitted, ((SIZE - fitted.width) // 2, (SIZE - fitted.height) // 2))
    icon = Image.new("RGBA", (SIZE, SIZE), (255, 255, 255, 0))
    icon.putalpha(canvas)
    return icon


def svg_mask(key: str, icon: Image.Image) -> str:
    buffer = io.BytesIO()
    icon.save(buffer, "WEBP", lossless=True, exact=True, method=6)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">'
            f'<defs><mask id="{key}-mask"><image width="256" height="256" '
            f'href="data:image/webp;base64,{encoded}"/></mask></defs>'
            f'<rect width="256" height="256" fill="var(--icon-fill, #fff)" '
            f'mask="url(#{key}-mask)"/></svg>\n')


def main() -> None:
    glyphs = json.loads((HERE / "glyphs.json").read_text(encoding="utf-8"))["glyphs"]
    small = Image.new("RGB", (600, len(glyphs) * 90), (34, 34, 34))
    draw = ImageDraw.Draw(small)
    row = 0
    for atlas in ("a", "b"):
        with Image.open(HERE / "raw" / f"batch-62-atlas-{atlas}.png") as source:
            preview = Image.new("RGBA", (768, 768), (34, 34, 34, 255))
            for index, glyph in enumerate(g for g in glyphs if g["atlas"] == atlas):
                grid_row, column = divmod(index, 3)
                x0, x1 = round(column * source.width / 3), round((column + 1) * source.width / 3)
                y0, y1 = round(grid_row * source.height / 3), round((grid_row + 1) * source.height / 3)
                cell = source.crop((x0 + 8, y0 + 8, x1 - 8, y1 - 8))
                icon = normalize(cell)
                key = glyph["key"]
                icon.save(HERE / f"{key}.png", "PNG", optimize=True)
                icon.save(HERE / f"{key}.webp", "WEBP", lossless=True, exact=True, method=6)
                (HERE / f"{key}.svg").write_text(svg_mask(key, icon), encoding="utf-8")
                preview.alpha_composite(icon, (column * SIZE, grid_row * SIZE))
                draw.text((12, row * 90 + 32), key, fill="white")
                for display, offset in ((64, 240), (32, 345), (24, 420), (16, 480)):
                    thumb = icon.resize((display, display), Image.Resampling.LANCZOS)
                    small.paste(thumb, (offset, row * 90 + (90 - display) // 2), thumb)
                row += 1
            preview.convert("RGB").save(HERE / "raw" / f"preview-{atlas}.png")
    small.save(HERE / "raw" / "inventory-preview.png")
    print(f"Prepared {len(glyphs)} PNG/WEBP/SVG candidates; no assets installed")


if __name__ == "__main__":
    main()
