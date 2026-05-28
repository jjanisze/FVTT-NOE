"""
process_single.py — konwertuj pojedynczy obraz tile do SVG mask-trick.

Użycie:
    python process_single.py <input_image> <output_name>

Przykład:
    python process_single.py in/speedloader_tile.png speedloader
    → out/speedloader.png + out/speedloader.svg

Czarne piksele (R,G,B < 80) → transparentne.
Jasne piksele → białe z alpha proporcjonalnym do jasności.
Output SVG używa var(--icon-fill, #fff) żeby kolor można było kontrolować przez CSS.
"""

import os
import sys
from PIL import Image


TARGET_SIZE = (256, 256)
OUT_DIR = os.path.join(os.path.dirname(__file__), "out")


def make_transparent_and_normalize(img: Image.Image) -> Image.Image:
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


def save_as_svg_mask(img: Image.Image, out_path: str, base_name: str) -> None:
    import io, base64

    buffered = io.BytesIO()
    img.save(buffered, format="PNG", optimize=True)
    img_str = base64.b64encode(buffered.getvalue()).decode("utf-8")

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">
  <defs>
    <mask id="{base_name}-mask">
      <image href="data:image/png;base64,{img_str}" width="256" height="256" />
    </mask>
  </defs>
  <rect width="256" height="256" fill="var(--icon-fill, #fff)" mask="url(#{base_name}-mask)" />
</svg>"""

    with open(out_path, "w", encoding="utf-8") as f:
        f.write(svg)
    print(f"  SVG → {out_path}")


def main():
    if len(sys.argv) < 3:
        print("Użycie: python process_single.py <input_image> <output_name>")
        print("Przykład: python process_single.py in/speedloader_tile.png speedloader")
        sys.exit(1)

    in_path = sys.argv[1]
    out_name = sys.argv[2]

    if not os.path.isabs(in_path):
        in_path = os.path.join(os.path.dirname(__file__), in_path)

    if not os.path.exists(in_path):
        print(f"Plik nie istnieje: {in_path}")
        sys.exit(1)

    os.makedirs(OUT_DIR, exist_ok=True)

    print(f"Wczytuję: {in_path}")
    img = Image.open(in_path)
    print(f"  Rozmiar: {img.size[0]}x{img.size[1]}")

    processed = make_transparent_and_normalize(img)

    png_out = os.path.join(OUT_DIR, f"{out_name}.png")
    processed.save(png_out, format="PNG", optimize=True)
    print(f"  PNG → {png_out}")

    svg_out = os.path.join(OUT_DIR, f"{out_name}.svg")
    save_as_svg_mask(processed, svg_out, out_name)

    print(f"\nGotowe. Skopiuj {out_name}.svg do icons/magazines/")


if __name__ == "__main__":
    main()
