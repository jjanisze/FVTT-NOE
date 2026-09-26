"""
Class B assets (dev/icons/MISSING.md): full-colour, top-down in-world objects -> map Tile textures.

Unlike normalize_icons.py this does NOT whiten, does NOT square and does NOT write PNG:

  - splits a grid image (default 3x3 when 9 names are given) into cells,
  - keys out a flat background colour (--key, default 00ff00) with a soft edge and green despill,
    or keeps existing transparency when the image already has alpha (--key none),
  - trims every cell to its visible content, keeping the native aspect ratio,
  - resizes the long side to --size px (default 128) and saves WEBP with alpha.

Output file names are the item ids, so the module picks them up with no code change
(`vfx/<subtype>.webp`, see `_pendingTileTexture()` in actors/grenade-inventory.mjs).

    python normalize_world_assets.py in/grid.png --names grenade-molotov,grenade-dynamite,...
    python normalize_world_assets.py in/one.png --names grenade-molotov --key none
"""

import argparse
import os
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_OUT = os.path.normpath(os.path.join(HERE, "..", "..", "vfx"))


def key_out(img, key, tolerance, softness):
    """Flat background -> transparent. Soft edge over `softness` colour distance, green despill."""
    kr, kg, kb = key
    px = img.load()
    w, h = img.size
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            d = ((r - kr) ** 2 + (g - kg) ** 2 + (b - kb) ** 2) ** 0.5
            if d <= tolerance:
                px[x, y] = (0, 0, 0, 0)
                continue
            if d < tolerance + softness:
                a = int(a * (d - tolerance) / softness)
            # Despill: a key-coloured fringe on antialiased edges. Only for a green/blue-ish key.
            if kg > kr and kg > kb and g > max(r, b):
                g = max(r, b)
            px[x, y] = (r, g, b, a)
    return img


def trim(img, pad=2):
    bbox = img.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    if not bbox:
        return None
    l, t, r, b = bbox
    return img.crop((max(0, l - pad), max(0, t - pad), min(img.width, r + pad), min(img.height, b + pad)))


def fit_long_side(img, size):
    w, h = img.size
    scale = size / max(w, h)
    return img.resize((max(1, round(w * scale)), max(1, round(h * scale))), Image.Resampling.LANCZOS)


def cells(img, cols, rows):
    w, h = img.size
    for j in range(rows):
        for i in range(cols):
            yield img.crop((i * w // cols, j * h // rows, (i + 1) * w // cols, (j + 1) * h // rows))


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("image")
    ap.add_argument("--names", required=True, help="comma-separated output ids, row by row")
    ap.add_argument("--grid", default=None, help="COLSxROWS; default 3x3 for 9 names, 1x1 for one")
    ap.add_argument("--key", default="00ff00", help="background hex to key out, or 'none'")
    ap.add_argument("--tolerance", type=float, default=60)
    ap.add_argument("--softness", type=float, default=50)
    ap.add_argument("--size", type=int, default=128, help="long side in px")
    ap.add_argument("--out", default=DEFAULT_OUT)
    args = ap.parse_args()

    names = [n.strip() for n in args.names.split(",") if n.strip()]
    if args.grid:
        cols, rows = (int(v) for v in args.grid.lower().split("x"))
    elif len(names) == 1:
        cols, rows = 1, 1
    elif len(names) == 9:
        cols, rows = 3, 3
    else:
        sys.exit(f"{len(names)} names: pass --grid COLSxROWS")
    if cols * rows < len(names):
        sys.exit(f"grid {cols}x{rows} has fewer cells than {len(names)} names")

    key = None if args.key.lower() == "none" else tuple(int(args.key[i:i + 2], 16) for i in (0, 2, 4))
    os.makedirs(args.out, exist_ok=True)

    src = Image.open(args.image).convert("RGBA")
    for name, cell in zip(names, cells(src, cols, rows)):
        if key:
            cell = key_out(cell, key, args.tolerance, args.softness)
        cell = trim(cell)
        if cell is None:
            print(f"  {name}: cell is empty after keying — skipped")
            continue
        cell = fit_long_side(cell, args.size)
        path = os.path.join(args.out, f"{name}.webp")
        cell.save(path, "WEBP", quality=90, method=6)
        print(f"  {name}: {cell.width}x{cell.height} -> {os.path.relpath(path, HERE)}")


if __name__ == "__main__":
    main()
