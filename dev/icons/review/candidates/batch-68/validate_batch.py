"""Validate two archived selections, prompt provenance and lossless review masks."""
import base64
import hashlib
import io
import json
from pathlib import Path
import xml.etree.ElementTree as ET
from PIL import Image

HERE = Path(__file__).resolve().parent
REVIEW = HERE.parents[1]
batch = json.loads((HERE / "batch.json").read_text(encoding="utf-8"))
saved = {entry["id"]: entry for entry in json.loads((HERE / "decisions.json").read_text(encoding="utf-8"))["active"]}
references = json.loads((HERE / "references.json").read_text(encoding="utf-8"))
prompts = json.loads((HERE / "prompts.json").read_text(encoding="utf-8"))
normalization = json.loads((HERE / "normalization.json").read_text(encoding="utf-8"))
entries = batch["revisions"]
assert len(entries) == len(saved) == len(references) == len(prompts["revisions"]) == len(normalization) == 2
assert {entry["key"] for entry in entries} == {entry["key"] for entry in prompts["revisions"]}
for reference in references:
    decision = saved[reference["itemId"]]
    assert (reference["candidateId"], reference["source"], reference["feedback"]) == (decision["candidateId"], decision["selectedSource"], decision["notes"])
    source = REVIEW / reference["source"]
    assert hashlib.sha256(source.read_bytes()).hexdigest() == reference["sourceSha256"]
    assert (HERE / reference["reference"]).is_file()
for prompt in [*prompts["revisions"], *prompts["targetedCorrections"]]:
    assert prompt["prompt"] and (HERE / prompt["reference"]).is_file() and (HERE / prompt["output"]).is_file()
for entry in entries:
    key = entry["key"]
    with Image.open(HERE / f"{key}.png") as source:
        png = source.convert("RGBA")
    with Image.open(HERE / f"{key}.webp") as source:
        assert source.format == "WEBP" and source.mode == "RGBA"
        webp = source.copy()
    assert png.size == webp.size == (256, 256) and png.tobytes() == webp.tobytes(), key
    bounds = png.getchannel("A").getbbox()
    assert bounds and min(bounds[0], bounds[1], 256 - bounds[2], 256 - bounds[3]) >= 20, key
    assert all(pixel[:3] == (255, 255, 255) for pixel in png.getdata() if pixel[3]), key
    svg = ET.fromstring((HERE / f"{key}.svg").read_text(encoding="utf-8"))
    href = svg.find(".//{http://www.w3.org/2000/svg}image").attrib["href"]
    assert href.startswith("data:image/webp;base64,"), key
    with Image.open(io.BytesIO(base64.b64decode(href.split(",", 1)[1]))) as embedded:
        assert embedded.format == "WEBP" and embedded.convert("RGBA").tobytes() == png.tobytes(), key
chosen = {entry["key"]: entry["source"] for entry in normalization}
expected = {entry["key"]: entry["output"] for entry in prompts["revisions"]}
expected.update({entry["key"]: entry["output"] for entry in prompts["targetedCorrections"]})
assert chosen == expected
print("Batch 68 OK: two exact-selected references, complete prompts and two PNG/WEBP/embedded-WEBP SVG masks")
