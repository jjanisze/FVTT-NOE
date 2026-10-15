"""Recompose a batch's recorded references, fitting mixed source sizes into cells."""
import argparse
import hashlib
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--batch", type=int, required=True)
args = parser.parse_args()
here = ROOT / "dev/icons/review/candidates" / f"batch-{args.batch}"
references = json.loads((here / "style-reference.json").read_text(encoding="utf-8"))
assert len(references["sources"]) == 9
canvas = Image.new("RGB", (768, 768), "black")
for index, entry in enumerate(references["sources"]):
    source = ROOT / entry["source"]
    assert hashlib.sha256(source.read_bytes()).hexdigest() == entry["sha256"]
    with Image.open(source) as original:
        rgba = original.convert("RGBA")
        rgba.thumbnail((256, 256), Image.Resampling.LANCZOS)
        assert rgba.getchannel("A").getbbox()
        canvas.paste(rgba, ((index % 3) * 256 + (256 - rgba.width) // 2,
                            (index // 3) * 256 + (256 - rgba.height) // 2), rgba)
canvas.save(here / "raw/style-reference.png")
counts = [sum(value > 32 for value in canvas.crop(((index % 3) * 256,
          (index // 3) * 256, (index % 3 + 1) * 256, (index // 3 + 1) * 256)).convert("L").getdata()) for index in range(9)]
assert all(counts), "Empty style-reference cell"
print(f"Recomposed Batch {args.batch} reference only; incoming decisions and prompts retained")
