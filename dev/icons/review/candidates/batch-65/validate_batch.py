"""Check Batch 65's selected references, prompt archive and all review masks."""
import base64
import io
import json
from pathlib import Path
import xml.etree.ElementTree as ET
from PIL import Image

HERE = Path(__file__).resolve().parent
batch = json.loads((HERE / "batch.json").read_text(encoding="utf-8"))
entries = [*batch["revisions"], *batch["fresh"]]
assert len(entries) == 27 and len({entry["key"] for entry in entries}) == 27
prompts = json.loads((HERE / "prompts.json").read_text(encoding="utf-8"))
assert set(prompts["atlases"]) == {"a", "b", "c"}, "Incomplete atlas prompt archive"
assert all(prompts["atlases"].values()), "Empty atlas prompt"
references = json.loads((HERE / "references.json").read_text(encoding="utf-8"))
assert len(references) == 11, "Missing exact-selected references"
decisions = {item["id"]: item for item in json.loads((HERE / "decisions.json").read_text(encoding="utf-8"))["active"]}
for reference in references:
    saved = decisions[reference["itemId"]]
    assert (reference["candidateId"], reference["source"], reference["feedback"]) == (saved["candidateId"], saved["selectedSource"], saved["notes"])
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
normalization = json.loads((HERE / "normalization.json").read_text(encoding="utf-8"))
assert len(normalization) == 27 and {item["key"] for item in normalization} == {item["key"] for item in entries}
chosen_sources = {item["key"]: item["source"] for item in normalization}
assert len(prompts["targetedCorrections"]) == 3, "Incomplete isolated correction archive"
for correction in prompts["targetedCorrections"]:
    assert (HERE / correction["reference"]).is_file(), correction["key"]
    assert (HERE / correction["output"]).is_file(), correction["key"]
    assert correction["prompt"], correction["key"]
    assert chosen_sources[correction["key"]] == correction["output"], correction["key"]
print("Batch 65 OK: 27 PNG/WEBP/SVG masks, 11 exact-selected references and complete prompts")
