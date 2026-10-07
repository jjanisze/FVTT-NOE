"""Compose transparent icon files into an evenly spaced black reference atlas."""
import argparse
import math
from pathlib import Path

from PIL import Image, ImageOps


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--columns", type=int, default=3)
    parser.add_argument("--rows", type=int)
    parser.add_argument("--cell-size", type=int, default=256)
    parser.add_argument("inputs", nargs="+")
    args = parser.parse_args()
    if args.columns < 1 or args.cell_size < 1:
        raise SystemExit("columns and cell-size must be positive")

    rows = args.rows or math.ceil(len(args.inputs) / args.columns)
    if rows * args.columns < len(args.inputs):
        raise SystemExit("rows times columns must fit every input")
    atlas = Image.new("RGB", (args.columns * args.cell_size, rows * args.cell_size), "black")
    safe = round(args.cell_size * 0.84)
    for index, source_path in enumerate(map(Path, args.inputs)):
        with Image.open(source_path) as source:
            source = source.convert("RGBA")
            alpha = source.getchannel("A")
            box = alpha.getbbox()
            if not box:
                raise SystemExit(f"Empty reference icon: {source_path}")
            alpha = ImageOps.contain(alpha.crop(box), (safe, safe), Image.Resampling.LANCZOS)
        white = Image.new("RGBA", alpha.size, "white")
        white.putalpha(alpha)
        row, column = divmod(index, args.columns)
        x = column * args.cell_size + (args.cell_size - white.width) // 2
        y = row * args.cell_size + (args.cell_size - white.height) // 2
        atlas.paste(white, (x, y), white)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(args.output, "PNG", optimize=True)
    print(f"Composed {len(args.inputs)} references into {args.output}")


if __name__ == "__main__":
    main()
