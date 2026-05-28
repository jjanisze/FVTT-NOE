import os
from PIL import Image

IN_PATH = os.path.join(os.path.dirname(__file__), "in", "Weapons_Resize_13.png")
OUT_DIR = os.path.join(os.path.dirname(__file__), "out")
TARGET_SIZE = (256, 256)

# 3x3 grid, row-major order:
# [0] activity_single_fire    - Ogień pojedynczy (single shot / gun attack)
# [1] activity_short_burst    - Krótka seria (KS, 3 rounds)
# [2] activity_long_burst     - Długa seria (DS, automatic burst)
# [3] activity_crushing_burst - Miażdżąca seria (MS, belt-fed heavy fire)
# [4] activity_suppressive_fire - Ogień zaporowy (OZ, wide area fire cone)
# [5] activity_reload         - Przeładowanie (magazine reload)
# [6] activity_load_one       - Doładuj 1 nabój (single round load)
# [7] activity_melee          - Atak wręcz (melee strike)
# [8] activity_throw          - Rzut (throwing, grenade)
NAMES = [
    "activity_single_fire",
    "activity_short_burst",
    "activity_long_burst",
    "activity_crushing_burst",
    "activity_suppressive_fire",
    "activity_reload",
    "activity_load_one",
    "activity_melee",
    "activity_throw",
]


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


def save_as_svg_mask(img, out_path, base_name):
    import io
    import base64

    png_buffer = io.BytesIO()
    img.save(png_buffer, format="PNG", optimize=True)
    png_b64 = base64.b64encode(png_buffer.getvalue()).decode()

    w, h = img.size
    mask_id = base_name.replace(".", "-") + "-mask"
    svg_content = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}">
  <defs>
    <mask id="{mask_id}">
      <image href="data:image/png;base64,{png_b64}" width="{w}" height="{h}" />
    </mask>
  </defs>
  <rect width="{w}" height="{h}" fill="var(--icon-fill, #fff)" mask="url(#{mask_id})" />
</svg>"""
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(svg_content)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    img = Image.open(IN_PATH)
    width, height = img.size
    cols, rows = 3, 3
    cell_w = width // cols
    cell_h = height // rows

    for idx, name in enumerate(NAMES):
        row = idx // cols
        col = idx % cols
        left = col * cell_w
        upper = row * cell_h
        right = left + cell_w
        lower = upper + cell_h

        cell = img.crop((left, upper, right, lower))
        cell = make_transparent_and_normalize(cell)

        png_path = os.path.join(OUT_DIR, f"{name}.png")
        cell.save(png_path, "PNG", optimize=True)

        svg_path = os.path.join(OUT_DIR, f"{name}.svg")
        save_as_svg_mask(cell, svg_path, name)

        print(f"[{idx+1}/9] {name} → {svg_path}")

    print(f"\nDone. Copy SVGs to: modules/neuroshima-2026-overrides/icons/activities/")


if __name__ == "__main__":
    main()
