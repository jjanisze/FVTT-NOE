from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parent
PREVIOUS = ROOT.parent / "batch-58"
SOURCES = [
    "zamarcie_revision_d.png",
    "palcozerca_revision_b.png",
    "odstapienie.png",
    "skakun.png",
    "skok.png",
    "wycofanie_sie.png",
    "zmysly.png",
]
CELL = 512
SAFE = 410


atlas = Image.new("RGB", (CELL * 3, CELL * 3), "black")
for index, filename in enumerate(SOURCES):
    with Image.open(PREVIOUS / filename) as source:
        alpha = source.convert("RGBA").getchannel("A")
        alpha = ImageOps.contain(alpha.crop(alpha.getbbox()), (SAFE, SAFE), Image.Resampling.LANCZOS)
    glyph = Image.new("RGBA", alpha.size, "white")
    glyph.putalpha(alpha)
    row, column = divmod(index, 3)
    x = column * CELL + (CELL - glyph.width) // 2
    y = row * CELL + (CELL - glyph.height) // 2
    atlas.paste(glyph, (x, y), glyph)

target = ROOT / "raw" / "batch-59-reference-atlas-a.png"
atlas.save(target, "PNG", optimize=True)
print(target)
