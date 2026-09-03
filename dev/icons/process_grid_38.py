import os
import io
import base64
from PIL import Image

IN_PATH = os.path.join(os.path.dirname(__file__), "in", "Weapons_Resize_38.jpg")
ICONS_BASE = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "icons")
TARGET_SIZE = (256, 256)

# Batch 38 — flashlight family (czołówka/regular/dynamo) plus the "conventional light" and
# "battery gadget" prerequisites RAW's own Baterie entry names (radio family, geiger counter),
# and the standalone NVG/thermal goggles for the next phase. "regular" flashlight replaces the
# existing generic items/loot/latarka.svg placeholder outright (same filename) so reczna/
# naramienna pick up the new art with no code change; everything else is a new file.
#
# Slot 8 was requested without first checking for prior art — icons/items/loot/krotkofalowka.svg
# already existed and was already in use (Evie/Lorentz/Victor's radio items), so this batch's
# walkie-talkie is written to `krotkofalowka_alt` instead of clobbering it. Nobody references
# `_alt` yet; it's a spare until someone decides whether it should replace the original.
SLOTS = [
    ("latarka_czolowa",        "items/loot"),  # 1: headlamp
    ("latarka",                "items/loot"),  # 2: regular flashlight — replaces the old placeholder
    ("latarka_dynamo",         "items/loot"),  # 3: crank/dynamo flashlight
    ("lampa_naftowa",          "items/loot"),  # 4: kerosene hurricane lantern
    ("swieczka",               "items/loot"),  # 5: candle
    ("noktowizor_gogle",       "items/loot"),  # 6: standalone NVG goggles/headset
    ("termowizor_gogle",       "items/loot"),  # 7: standalone thermal goggles/headset
    ("krotkofalowka_alt",      "items/loot"),  # 8: handheld walkie-talkie (see note above)
    ("miernik_promieniowania", "items/loot"),  # 9: Geiger counter
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
