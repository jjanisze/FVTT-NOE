"""Inspect actual rendered preview pixels at inventory sizes; never alter source or shipped art."""
import base64
import io
from html.parser import HTMLParser
from pathlib import Path
from PIL import Image, ImageDraw

HERE = Path(__file__).resolve().parent


class Samples(HTMLParser):
    def __init__(self):
        super().__init__()
        self.family = None
        self.images = {}

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "article":
            self.family = attrs.get("data-family")
        if tag == "img" and self.family and self.family not in self.images:
            source = attrs.get("src", "")
            if source.startswith("data:image/png;base64,"):
                self.images[self.family] = Image.open(io.BytesIO(base64.b64decode(source.split(",", 1)[1]))).convert("RGBA")

    def handle_endtag(self, tag):
        if tag == "article":
            self.family = None


parser = Samples()
parser.feed((HERE / "preview/index.html").read_text(encoding="utf-8"))
sheet = Image.new("RGBA", (720, ((len(parser.images) + 1) // 2) * 116), "#191e23")
draw = ImageDraw.Draw(sheet)
for i, (family, source) in enumerate(parser.images.items()):
    x, y = i % 2 * 360 + 12, i // 2 * 116
    draw.text((x, y + 6), family, fill="#edf0f2")
    for dx, size in [(0, 64), (84, 44), (148, 32), (200, 16)]:
        thumb = source.convert("RGBa").resize((size, size), Image.Resampling.LANCZOS).convert("RGBA")
        sheet.alpha_composite(thumb, (x + dx, y + 24 + (64 - size) // 2))
        draw.text((x + dx, y + 94), str(size), fill="#b2bdc6")
destination = HERE / "preview/family-samples.webp"
sheet.save(destination, "WEBP", lossless=True, exact=True, method=6)
print(f"Actual rendered family samples: {len(parser.images)} families, 64/44/32/16 px.")
