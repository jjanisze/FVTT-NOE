import os
import io
import base64
from PIL import Image

IN_PATH = os.path.join(os.path.dirname(__file__), "in", "Weapons_Resize_32.jpg")
ICONS_BASE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "icons")
TARGET_SIZE = (256, 256)

# Batch 32 — drobiazgi fabularne (Klucze, Kurtka ćwiekowana, Balaclava, Raca,
# trampek Adidas, krawat z dziurą, mydło, bateria, zapałki sztormowe).
# "kurtka_cwiekowana" is written twice: once as the character's loot-flavour
# item icon, once at icons/armor/kurtka-cwiekowana.svg — that's the real
# ARMOR_MAP id (armor-data.mjs), so this also plugs the armor-icon gap for
# free (icons/armor/ had zero files before this batch).
SLOTS = [
    ("klucze",              "items/loot"),  # 1: klucze (Victor)
    ("kurtka_cwiekowana",   "items/loot"),  # 2: Kurtka ćwiekowana (Victor, loot copy)
    ("balaclava",           "items/loot"),  # 3: Balclava (Raynald)
    ("raca_oswietleniowa",  "weapons"),     # 4: race oswietleniowe (Victor)
    ("trampek_adidas",      "items/loot"),  # 5: Lewy trampek Adidas (Lorentz)
    ("krawat_dziura",       "items/loot"),  # 6: Krawat z dziurą (Lorentz)
    ("mydlo",                "items/loot"), # 7: mydło (Lorentz)
    ("bateria",              "items/loot"), # 8: bateria (Lorentz)
    ("zapalki_sztormowe",    "items/loot"), # 9: Paczka szturmowych zapałek (Lorentz)
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

        # Also drop a copy at the real armor-catalog path for the studded jacket.
        if name == "kurtka_cwiekowana":
            armor_dir = os.path.join(ICONS_BASE, "armor")
            os.makedirs(armor_dir, exist_ok=True)
            cell.save(os.path.join(armor_dir, "kurtka-cwiekowana.png"), "PNG", optimize=True)
            save_svg_mask(cell, os.path.join(armor_dir, "kurtka-cwiekowana.svg"), "kurtka-cwiekowana")
            print("       also -> armor/kurtka-cwiekowana.png + .svg (ARMOR_MAP id)")

    print(f"\nDone. {processed} icons written.")


if __name__ == "__main__":
    main()
