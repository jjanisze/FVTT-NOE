import os, io, base64
from PIL import Image

BASE = os.path.join(os.path.dirname(__file__), "..", "..")
OUT_DIR = os.path.join(os.path.dirname(__file__), "out")
ICONS_DIR = os.path.join(BASE, "icons", "weapons")

JOBS = [
    ("in/Weapons_Resize_3.png", 8, "brass_knuckles"),
    ("in/Weapons_Resize_4.png", 8, "thumper_grenade_launcher"),
    ("in/Weapons_Resize.png", 2, "uzi"),  # slot [2] = UZI submachinegun
]


def process_tile(img, slot):
    w, h = img.size
    tw, th = w // 3, h // 3
    r, c = divmod(slot, 3)
    tile = img.crop((c * tw, r * th, (c + 1) * tw, (r + 1) * th)).convert("RGBA")
    new_data = []
    for item in tile.getdata():
        if item[0] < 80 and item[1] < 80 and item[2] < 80:
            new_data.append((255, 255, 255, 0))
        else:
            b = sum(item[:3]) / 3
            if b > 80:
                new_data.append((255, 255, 255, int(min(255, b * 1.5))))
            else:
                new_data.append((255, 255, 255, 0))
    tile.putdata(new_data)
    return tile.resize((256, 256), Image.Resampling.LANCZOS)


def save_svg(img, name):
    buf = io.BytesIO()
    img.save(buf, format="PNG", optimize=True)
    b64 = base64.b64encode(buf.getvalue()).decode()
    mask_id = name.replace("_", "-") + "-mask"
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <defs>
    <mask id="{mask_id}">
      <image href="data:image/png;base64,{b64}" width="256" height="256" />
    </mask>
  </defs>
  <rect width="256" height="256" fill="var(--icon-fill, #fff)" mask="url(#{mask_id})" />
</svg>"""
    for d in [OUT_DIR, ICONS_DIR]:
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, f"{name}.svg"), "w", encoding="utf-8") as f:
            f.write(svg)
    print(f"  [OK] {name}.svg")


def main():
    script_dir = os.path.dirname(__file__)
    for rel, slot, name in JOBS:
        in_path = os.path.join(script_dir, rel)
        img = Image.open(in_path)
        w, h = img.size
        print(f"Processing {name} from {rel} slot={slot} (grid {w}x{h})")
        tile = process_tile(img, slot)
        save_svg(tile, name)
    print("Done.")


if __name__ == "__main__":
    main()
