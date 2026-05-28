import os
from PIL import Image

IN_PATH = os.path.join(os.path.dirname(__file__), "in", "Weapons_Resize_12.png")
OUT_DIR = os.path.join(os.path.dirname(__file__), "out")
TARGET_SIZE = (256, 256)

# 3x3 grid, row-major order:
# [0] Revolver speedloader
# [1] Tourniquet
# [2] Wax Candle
# [3] Tube of Super Glue
# [4] One Liter Disinfectant Spray Bottle
# [5] Magnifying Glass
# [6] One Liter Detergents
# [7] 50 meters of duct tape
# [8] Lighter
NAMES = [
    "speedloader",
    "tourniquet",
    "wax_candle",
    "super_glue",
    "disinfectant_spray",
    "magnifying_glass",
    "detergent",
    "duct_tape",
    "lighter",
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

def main():
    os.makedirs(OUT_DIR, exist_ok=True)

    if not os.path.exists(IN_PATH):
        print(f"File not found: {IN_PATH}")
        return

    print("Opening grid image...")
    grid = Image.open(IN_PATH)
    width, height = grid.size
    print(f"Grid size: {width}x{height}")

    cols = 3
    rows = 3
    tile_w = width // cols
    tile_h = height // rows
    print(f"Tile size: {tile_w}x{tile_h}")

    for idx, name in enumerate(NAMES):
        col = idx % cols
        row = idx // cols
        left   = col * tile_w
        upper  = row * tile_h
        right  = left + tile_w
        lower  = upper + tile_h

        tile = grid.crop((left, upper, right, lower))
        processed = make_transparent_and_normalize(tile)

        png_out = os.path.join(OUT_DIR, f"{name}.png")
        processed.save(png_out, format="PNG", optimize=True)

        svg_out = os.path.join(OUT_DIR, f"{name}.svg")
        save_as_svg_mask(processed, svg_out, name)

        print(f"  [{idx}] {name} → {png_out}")

    print("\nDone.")

if __name__ == "__main__":
    main()
