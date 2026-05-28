import os
from PIL import Image

IN_PATH = os.path.join(os.path.dirname(__file__), "in", "Weapons_Resize_10.png")
OUT_DIR = os.path.join(os.path.dirname(__file__), "out")
TARGET_SIZE = (256, 256)

NAMES = [
    "hk_ump",
    "beretta_b92",
    "m642_revolver",
    "k_22_revolver",
    "ruger_mark_iv",
    "hk_mark_23",
    "colt_1911",
    "beretta_b93r",
    "peacemaker_revolver"
]

def make_transparent_and_normalize(img):
    img = img.convert("RGBA")
    data = img.getdata()
    new_data = []
    
    # Threshold for black (background) and white (icon)
    for item in data:
        # If pixel is dark, make it transparent
        if item[0] < 80 and item[1] < 80 and item[2] < 80:
            new_data.append((255, 255, 255, 0))
        else:
            # Alpha based on brightness for anti-aliasing edge smoothing
            # or just force white with original alpha if it's already white
            brightness = sum(item[:3]) / 3
            if brightness > 80:
                new_data.append((255, 255, 255, int(min(255, brightness * 1.5))))
            else:
                new_data.append((255, 255, 255, 0))
                
    img.putdata(new_data)
    
            # Resize
    img = img.resize(TARGET_SIZE, Image.Resampling.LANCZOS)
    return img

def save_as_svg_mask(img, out_path, base_name):
    import io
    import base64
    
    # Save image to bytes buffer as PNG
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
    
    # 3x3 grid
    tile_w = width // 3
    tile_h = height // 3
    
    index = 0
    for row in range(3):
        for col in range(3):
            if index >= len(NAMES):
                break
                
            left = col * tile_w
            top = row * tile_h
            right = left + tile_w
            bottom = top + tile_h
            
            tile = grid.crop((left, top, right, bottom))
            processed_tile = make_transparent_and_normalize(tile)
            
            # Save PNG
            out_filename_png = f"{NAMES[index]}.png"
            processed_tile.save(os.path.join(OUT_DIR, out_filename_png), "PNG", optimize=True)
            
            # Save SVG Wrapper
            out_filename_svg = f"{NAMES[index]}.svg"
            save_as_svg_mask(processed_tile, os.path.join(OUT_DIR, out_filename_svg), NAMES[index])
            
            print(f"Saved {out_filename_png} and {out_filename_svg}")
            
            index += 1
            
    print("Done!")

if __name__ == "__main__":
    main()
