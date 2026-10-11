"""Make opaque style references from the exact selected glyphs for targeted corrections."""
import json
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
REVIEW = HERE.parents[1]
incoming = {item["id"]: item for item in json.loads((HERE / "decisions.json").read_text(encoding="utf-8"))["active"]}
for key, item_id in (("wychuchana", "batch60-wychuchana-spluwa"), ("hi-tech", "batch63-hi-tech")):
    with Image.open(REVIEW / incoming[item_id]["selectedSource"]) as source:
        reference = Image.new("RGBA", source.size, (0, 0, 0, 255))
        reference.alpha_composite(source.convert("RGBA"))
    reference.convert("RGB").save(HERE / "raw" / f"{key}-reference.png")
print("Prepared two exact-selected targeted references")
