"""Create a black-backed atlas of approved art solely as a style reference."""
import json
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
paths = ["icons/abilities/pierwotny-instynkt.webp", "icons/abilities/szybki-bill.webp",
         "icons/abilities/ucz-sie-ucz.webp", "icons/actions/bebeszenie.webp",
         "icons/abilities/ukryty-cel.webp", "icons/abilities/pan-plaster.webp",
         "icons/items/loot/paliwo_dobre.webp", "icons/statuses/wylaczony.webp",
         "icons/abilities/siekierezada.webp"]
canvas = Image.new("RGB", (768, 768), "black")
for index, source in enumerate(paths):
    with Image.open(ROOT / source) as image:
        rgba = image.convert("RGBA")
        canvas.paste(rgba, ((index % 3) * 256, (index // 3) * 256), rgba)
canvas.save(HERE / "raw/style-reference.png")
(HERE / "style-reference.json").write_text(json.dumps({"role": "style only; replace all subjects", "sources": paths}, indent=2) + "\n", encoding="utf-8")
print("Composed nine approved examples; no placeholders or initials supplied to the generator")
