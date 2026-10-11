"""Verify the review PNG and the future shipped WEBP/SVG masks agree exactly."""
import base64
import io
import json
from pathlib import Path
import xml.etree.ElementTree as ET

from PIL import Image

HERE = Path(__file__).resolve().parent
glyphs = json.loads((HERE / "glyphs.json").read_text(encoding="utf-8"))["glyphs"]
for glyph in glyphs:
    key = glyph["key"]
    with Image.open(HERE / f"{key}.png") as source:
        png = source.convert("RGBA")
    with Image.open(HERE / f"{key}.webp") as source:
        assert source.format == "WEBP" and source.mode == "RGBA", key
        webp = source.copy()
    assert png.size == webp.size == (256, 256), key
    assert png.tobytes() == webp.tobytes(), key
    alpha = webp.getchannel("A")
    bounds = alpha.getbbox()
    assert bounds and min(bounds[0], bounds[1], 256 - bounds[2], 256 - bounds[3]) >= 20, key
    assert all(pixel[:3] == (255, 255, 255) for pixel in webp.getdata() if pixel[3]), key
    svg = ET.fromstring((HERE / f"{key}.svg").read_text(encoding="utf-8"))
    data = svg.find(".//{http://www.w3.org/2000/svg}image").attrib["href"]
    assert data.startswith("data:image/webp;base64,"), key
    with Image.open(io.BytesIO(base64.b64decode(data.split(",", 1)[1]))) as embedded:
        assert embedded.convert("RGBA").tobytes() == png.tobytes(), key
print(f"Batch 62 OK: {len(glyphs)} matching PNG/WEBP/SVG masks; no production files touched")
