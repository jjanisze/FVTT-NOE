"""Split and normalize batch 41, then install PNGs and theme-aware SVG masks."""

import argparse
import shutil
from pathlib import Path

from PIL import Image, ImageDraw, ImageOps
from normalize_icons import normalize_icon
from process_grid_40 import save_svg_mask

HERE = Path(__file__).resolve().parent
SLOTS = (
    "detonator_radiowy", "kwas", "zapalnik_radiowy",
    "zapalnik_elektryczny", "schemat_notatka", "schemat_instrukcja",
    "schemat_dokumentacja", "robota_nakladka", "radio",
)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=HERE / "in" / "Batch_41.png")
    args = parser.parse_args()
    output = HERE / "out" / "batch_41"
    sources = output / "source"
    destination = HERE.parent.parent / "icons" / "items" / "loot"
    sources.mkdir(parents=True, exist_ok=True)
    destination.mkdir(parents=True, exist_ok=True)
    preview = Image.new("RGB", (768, 864), "#23271f")
    draw = ImageDraw.Draw(preview)
    with Image.open(args.input) as grid:
        width, height = grid.size
        if width != height:
            raise ValueError(f"Expected square atlas, got {grid.size}")
        for index, name in enumerate(SLOTS):
            row, col = divmod(index, 3)
            bounds = (round(col * width / 3), round(row * height / 3),
                      round((col + 1) * width / 3), round((row + 1) * height / 3))
            source = sources / f"{name}.png"
            grid.crop(bounds).save(source)
            png = output / f"{name}.png"
            normalize_icon(str(source), str(png))
            with Image.open(png) as icon:
                icon = icon.convert("RGBA")
                alpha = icon.getchannel("A")
                if not alpha.getbbox() or alpha.getextrema() != (0, 255):
                    raise ValueError(f"{name}: empty icon or missing transparency")
                # Generated cell padding varies. Fit the complete glyph into a
                # common safe area, preserving its aspect ratio and alpha.
                alpha = ImageOps.contain(alpha.crop(alpha.getbbox()), (216, 216),
                                         Image.Resampling.LANCZOS)
                padded = Image.new("L", (256, 256), 0)
                padded.paste(alpha, ((256 - alpha.width) // 2, (256 - alpha.height) // 2))
                alpha = padded
                # Lanczos can leave RGB fringes: keep pure white under every alpha.
                icon = Image.new("RGBA", icon.size, "white")
                icon.putalpha(alpha)
                icon.save(png, optimize=True)
                svg = output / f"{name}.svg"
                save_svg_mask(icon, str(svg), name)
                for asset in (png, svg):
                    shutil.copy2(asset, destination / asset.name)
                x, y = col * 256, row * 288
                preview.paste(icon, (x, y), icon)
                draw.text((x + 8, y + 251), name, fill="white")
                small = icon.resize((12 if name == "robota_nakladka" else 32,) * 2,
                                    Image.Resampling.LANCZOS)
                preview.paste(small, (x + 214, y + 250), small)
                print(f"Installed {name}.png + .svg")
    preview.save(output / "preview.png", optimize=True)
    print("Batch 41: 9 icons normalized and installed.")


if __name__ == "__main__":
    main()
