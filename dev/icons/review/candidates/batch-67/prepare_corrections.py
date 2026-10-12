"""Prepare opaque reference previews for isolated image-generator corrections."""
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
references = {
    "pan-plaster-selected": HERE.parent / "batch-66" / "pan-plaster_revision_b.png",
    "pan-plaster-atlas": HERE / "pan-plaster_revision_c.png",
}
for name, source in references.items():
    with Image.open(source) as image:
        rgba = image.convert("RGBA")
        canvas = Image.new("RGBA", rgba.size, (0, 0, 0, 255))
        canvas.alpha_composite(rgba)
        canvas.convert("RGB").save(HERE / "raw" / f"{name}-reference.png")
print("Prepared two Pan Plaster reference previews; no glyph pixels edited")
