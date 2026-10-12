"""Inspect existing catalog medicine/fuel glyphs as a local contact sheet; no asset edits."""
import base64
import io
import json
from pathlib import Path
import xml.etree.ElementTree as ET
from PIL import Image, ImageDraw, ImageOps

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
report = json.loads((HERE / "catalog-icons-2026-10-12.json").read_text(encoding="utf-8"))
items = [item for item in report["items"] if item["ref"].startswith("chemia:") and item["category"] == "leki"]
items += [{"label": "Existing generic fuel", "relative": "icons/items/loot/paliwo.svg"},
          {"label": "Existing medic refill", "relative": "icons/items/loot/uzupelnienie_medyka.svg"}]
preview = Image.new("RGB", (900, ((len(items) + 5) // 6) * 140), (28, 28, 28))
draw = ImageDraw.Draw(preview)
for index, item in enumerate(items):
    path = ROOT / item["relative"]
    tree = ET.fromstring(path.read_text(encoding="utf-8"))
    embedded = tree.find(".//{http://www.w3.org/2000/svg}image")
    href = embedded.attrib.get("href") or embedded.attrib.get("{http://www.w3.org/1999/xlink}href")
    with Image.open(io.BytesIO(base64.b64decode(href.split(",", 1)[1]))) as image:
        icon = ImageOps.contain(image.convert("RGBA"), (96, 96), Image.Resampling.LANCZOS)
    row, column = divmod(index, 6)
    preview.paste(icon, (column * 150 + (150 - icon.width) // 2, row * 140 + 5), icon)
    draw.text((column * 150 + 6, row * 140 + 109), item["label"][:23], fill="white")
destination = HERE / "review" / "candidates" / "batch-67" / "raw" / "catalog-preview.png"
preview.save(destination)
print(f"Inspected {len(items)} existing embedded masks; source images unchanged")
