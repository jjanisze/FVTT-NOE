import os
import io
import base64
from PIL import Image

IN_PATH = os.path.join(os.path.dirname(__file__), "in", "Weapons_Resize_21.png")
OUT_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "icons", "addons")
TARGET_SIZE = (256, 256)

NAMES = [
    "uchwyt-bagnetu",
    "zestaw-sprezyn",
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
    os.makedirs(OUT_DIR, exist_ok=True)
    grid = Image.open(IN_PATH)
    W, H = grid.size
    print(f"Grid size: {W}x{H}")
    cw, ch = W // 3, H // 3

    for idx, name in enumerate(NAMES):
        row, col = idx // 3, idx % 3
        cell = grid.crop((col * cw, row * ch, col * cw + cw, row * ch + ch))
        cell = make_transparent_and_normalize(cell)

        png_path = os.path.join(OUT_DIR, f"{name}.png")
        cell.save(png_path, "PNG", optimize=True)

        svg_path = os.path.join(OUT_DIR, f"{name}.svg")
        save_svg_mask(cell, svg_path, name)

        print(f"  [{idx+1}/{len(NAMES)}] {name}.png + .svg")

    print("Done.")


if __name__ == "__main__":
    main()
