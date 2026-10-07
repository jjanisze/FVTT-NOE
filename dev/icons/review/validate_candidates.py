"""Validate normalized review candidates without inspecting raw generator files."""
from pathlib import Path
from PIL import Image


ROOT = Path(__file__).parent / "candidates"
failures = []
checked = 0

for png in sorted(ROOT.glob("batch-*/*.png")):
    checked += 1
    with Image.open(png) as source:
        image = source.convert("RGBA")
    if image.size != (256, 256):
        failures.append(f"{png}: expected 256x256, got {image.size}")
        continue
    alpha = image.getchannel("A")
    box = alpha.getbbox()
    if not box:
        failures.append(f"{png}: empty alpha mask")
        continue
    margins = (box[0], box[1], 256 - box[2], 256 - box[3])
    if min(margins) < 20:
        failures.append(f"{png}: safe margin below 20 px: {margins}")
    colors = image.convert("RGB").getdata()
    if any(color != (255, 255, 255) for color, opacity in zip(colors, alpha.getdata()) if opacity):
        failures.append(f"{png}: visible pixels are not pure white")
    if not png.with_suffix(".svg").is_file():
        failures.append(f"{png}: missing matching SVG")

if failures:
    raise SystemExit("\n".join(failures))
print(f"Review candidates OK — {checked} PNG/SVG pairs")
