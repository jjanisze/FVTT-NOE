import os
from PIL import Image

IN_PATH = os.path.join(os.path.dirname(__file__), "in", "Weapons_Resize_11.png")
OUT_DIR = os.path.join(os.path.dirname(__file__), "out")
TARGET_SIZE = (256, 256)

# 3x3 grid, row-major order:
# [0] handgun magazine
# [1] machine pistol magazine
# [2] assault rifle magazine
# [3] machine gun ammo box / belt
# [4] quiver (arrows/bolts)
# [5] first aid station
# [6] big bottle
# [7] canned food
# [8] biohazard logo
NAMES = [
    "mag_handgun",
    "mag_machine_pistol",
    "mag_assault_rifle",
    "mag_machine_gun_belt",
    "quiver",
    "first_aid_station",
    "big_bottle",
    "canned_food",
    "biohazard",
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
    rows = (len(NAMES) + cols - 1) // cols
    tile_w = width // cols
    tile_h = height // rows
    print(f"Tiles: {cols}x{rows}, each {tile_w}x{tile_h}px")

    index = 0
    for row in range(rows):
        for col in range(cols):
            if index >= len(NAMES):
                break

            left = col * tile_w
            top = row * tile_h
            right = left + tile_w
            bottom = top + tile_h

            tile = grid.crop((left, top, right, bottom))
            processed = make_transparent_and_normalize(tile)

            out_png = os.path.join(OUT_DIR, f"{NAMES[index]}.png")
            out_svg = os.path.join(OUT_DIR, f"{NAMES[index]}.svg")

            processed.save(out_png, "PNG", optimize=True)
            save_as_svg_mask(processed, out_svg, NAMES[index])
            print(f"  [{index}] {NAMES[index]} → {NAMES[index]}.png + .svg")

            index += 1

    print("Done!")

if __name__ == "__main__":
    main()
