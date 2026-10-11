"""Check exact approved installs and every review PNG/WEBP/SVG mask."""
import base64
import hashlib
import io
import json
from pathlib import Path
import xml.etree.ElementTree as ET
from PIL import Image

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
REVIEW = HERE.parents[1]
batch = json.loads((HERE / "batch.json").read_text(encoding="utf-8"))
entries = [*batch["revisions"], *batch["fresh"]]
assert len(entries) == 27 and len({entry["key"] for entry in entries}) == 27
prompts = json.loads((HERE / "prompts.json").read_text(encoding="utf-8"))
assert set(prompts["atlases"]) == {"a", "b", "c"}, "Incomplete atlas prompt archive"
assert len(prompts["targetedCorrections"]) == 2, "Missing correction prompts"
assert all(prompts["atlases"].values()), "Empty atlas prompt"
references = json.loads((HERE / "references.json").read_text(encoding="utf-8"))
assert len(references) == 8, "Missing exact-selected references"
for entry in entries:
    key = entry["key"]
    with Image.open(HERE / f"{key}.png") as source:
        png = source.convert("RGBA")
    with Image.open(HERE / f"{key}.webp") as source:
        assert source.format == "WEBP" and source.mode == "RGBA", key
        webp = source.copy()
    assert png.size == webp.size == (256, 256), key
    assert png.tobytes() == webp.tobytes(), key
    bounds = webp.getchannel("A").getbbox()
    assert bounds and min(bounds[0], bounds[1], 256 - bounds[2], 256 - bounds[3]) >= 20, key
    assert all(pixel[:3] == (255, 255, 255) for pixel in webp.getdata() if pixel[3]), key
    svg = ET.fromstring((HERE / f"{key}.svg").read_text(encoding="utf-8"))
    data = svg.find(".//{http://www.w3.org/2000/svg}image").attrib["href"]
    assert data.startswith("data:image/webp;base64,"), key
    with Image.open(io.BytesIO(base64.b64decode(data.split(",", 1)[1]))) as embedded:
        assert embedded.convert("RGBA").tobytes() == png.tobytes(), key
installed = json.loads((HERE / "installed.json").read_text(encoding="utf-8"))["installed"]
for item in installed:
    original = REVIEW / item["source"]
    assert hashlib.sha256(original.read_bytes()).hexdigest() == item["sourceSha256"], item["itemId"]
    with Image.open(original) as source, Image.open(ROOT / item["files"][1]) as production:
        assert production.format == "WEBP"
        assert production.convert("RGBA").tobytes() == source.convert("RGBA").tobytes(), item["itemId"]
print(f"Batch 64 OK: 27 PNG/WEBP/SVG masks and {len(installed)} exact-approved production bitmaps")
