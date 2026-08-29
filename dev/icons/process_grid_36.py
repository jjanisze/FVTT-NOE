import os
import io
import base64
from PIL import Image

IN_PATH = os.path.join(os.path.dirname(__file__), "in", "Weapons_Resize_36.jpg")
ICONS_BASE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "icons")
TARGET_SIZE = (256, 256)

# Batch 36 — the 7 Chemia catalog entries that shipped on TODO_ICON (no custom
# art existed at all, unlike the rest of the catalog fixed in v0.14.17) plus
# two of Alan's loose loot items that also had no matching icon on disk.
# chemia-data.mjs and gear-data.mjs get their `img`/icon fields pointed at
# these as a follow-up code edit once the files land.
SLOTS = [
    ("desmopresyna",  "items/drugs"),  # 1: Desmopresyna — clotting syringe+vial
    ("aspiryna_k",    "items/drugs"),  # 2: Aspiryna K — blister pack
    ("dracophen",     "items/drugs"),  # 3: Dracophen — eye-drop bottle
    ("reminex",       "items/drugs"),  # 4: Reminex — capsule bottle
    ("psychotropy",   "items/drugs"),  # 5: Psychotropy — round-pill bottle
    ("actinix",       "items/drugs"),  # 6: Actinix — tablet cluster
    ("nitrogliceryna","items/loot"),   # 7: Nitrogliceryna — hazard vial (siblings proch_czarny/proch_strzelniczy live here too)
    None,                              # 8: kolimator — turned out UNNECESSARY. Real art already
                                        #    existed at icons/addons/kolimator.svg (the weapon-addon
                                        #    catalog, ADDON_DEFS.kolimator) — missed on first pass.
                                        #    The generated items/loot/kolimator.{png,svg} were deleted
                                        #    and Alan's item repointed to the addon icon + wired as a
                                        #    real installable addon (flags.ulepszenie). Don't regenerate.
    ("pendrive",      "items/loot"),   # 9: Pendrive Rodzinny (Alan)
]

COLS = 3
ROWS = 3


def make_transparent_and_normalize(img):
    img = img.convert("RGBA")
    data = img.getdata()
    new_data = []
    for item in data:
        if item[0] < 80 and item[1] < 80 and item[2] < 80:
            new_data.append((255, 255, 255, 0))
        else:
            brightness = sum(item[:3]) / 3
            if brightness > 80:
                new_data.append((255, 255, 255, int(min(255, brightness * 1.5))))
            else:
                new_data.append((255, 255, 255, 0))
    img.putdata(new_data)
    img = img.resize(TARGET_SIZE, Image.Resampling.LANCZOS)
    return img


def save_svg_mask(img, out_path, base_name):
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode()
    w, h = img.size
    mask_id = base_name.replace(".", "-") + "-mask"
    svg = (
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}">\n'
        f'  <defs>\n'
        f'    <mask id="{mask_id}">\n'
        f'      <image href="data:image/png;base64,{b64}" width="{w}" height="{h}" />\n'
        f'    </mask>\n'
        f'  </defs>\n'
        f'  <rect width="{w}" height="{h}" fill="var(--icon-fill, #fff)" mask="url(#{mask_id})" />\n'
        f'</svg>'
    )
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(svg)


def main():
    if not os.path.exists(IN_PATH):
        print(f"ERROR: Input not found: {IN_PATH}")
        return

    grid = Image.open(IN_PATH)
    W, H = grid.size
    print(f"Grid size: {W}x{H}")
    cw, ch = W // COLS, H // ROWS

    processed = 0
    for idx, slot in enumerate(SLOTS):
        row, col = idx // COLS, idx % COLS
        label = f"[{idx+1}/9] ({row},{col})"
        if slot is None:
            print(f"  {label} SKIPPED")
            continue

        name, subdir = slot
        out_dir = os.path.join(ICONS_BASE, subdir)
        os.makedirs(out_dir, exist_ok=True)

        cell = grid.crop((col * cw, row * ch, col * cw + cw, row * ch + ch))
        cell = make_transparent_and_normalize(cell)

        png_path = os.path.join(out_dir, f"{name}.png")
        cell.save(png_path, "PNG", optimize=True)

        svg_path = os.path.join(out_dir, f"{name}.svg")
        save_svg_mask(cell, svg_path, name)

        print(f"  {label} -> {subdir}/{name}.png + .svg")
        processed += 1

    print(f"\nDone. {processed} icons written.")


if __name__ == "__main__":
    main()
