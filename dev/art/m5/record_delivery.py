"""Record supplied GM sources and validate packaged art; no painting or retouching."""
import hashlib
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageOps

sys.dont_write_bytecode = True
from pack import specs, validate

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
delivered = []
available = []
for spec in specs():
    source = HERE / "in" / spec["set"] / f"{spec['key']}.png"
    output = ROOT / spec["output"]
    if not source.is_file() or not output.is_file():
        continue
    details = validate(output, spec)
    with Image.open(source) as image:
        source_size = list(image.size)
    delivered.append({"id": spec["id"], "source": str(source.relative_to(ROOT)).replace("\\", "/"),
                      "output": spec["output"], "sourceSize": source_size,
                      "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
                      "outputSha256": hashlib.sha256(output.read_bytes()).hexdigest(), "validation": details})
    available.append(spec)
report = {"date": "2026-10-12", "provenance": "AI-generated with OpenAI DALL-E, hand-edited by the GM",
          "processing": "Existing pack.py: centered crop, resize, WEBP conversion only", "delivered": delivered}
(HERE / "delivered-2026-10-12.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
# Development contact sheet uses only packaged pixels, scaled for visual inspection.
portraits = [spec for spec in available if spec["kind"] == "portrait"]
banners = [spec for spec in available if spec["kind"] == "banner"]
portrait_rows = (len(portraits) + 6) // 7
banner_rows = (len(banners) + 2) // 3
banner_offset = portrait_rows * 225 + 20
preview = Image.new("RGB", (1050, max(1, banner_offset + banner_rows * 145 + 20)), (28, 28, 28))
draw = ImageDraw.Draw(preview)
for index, spec in enumerate(portraits):
    row, column = divmod(index, 7)
    with Image.open(ROOT / spec["output"]) as image:
        thumbnail = ImageOps.contain(image.convert("RGB"), (140, 187), Image.Resampling.LANCZOS)
    preview.paste(thumbnail, (column * 150 + 5, row * 225 + 8))
    draw.text((column * 150 + 5, row * 225 + 203), spec["key"], fill="white")
for index, spec in enumerate(banners):
    row, column = divmod(index, 3)
    with Image.open(ROOT / spec["output"]) as image:
        thumbnail = ImageOps.contain(image.convert("RGB"), (330, 110), Image.Resampling.LANCZOS)
    preview.paste(thumbnail, (column * 350 + 10, banner_offset + row * 145))
    draw.text((column * 350 + 10, banner_offset + row * 145 + 120), spec["key"], fill="white")
(HERE / "out").mkdir(exist_ok=True)
preview.save(HERE / "out" / "delivery-preview.png")
print(f"Recorded {len(delivered)} verified edited-source WEBP deliveries")
