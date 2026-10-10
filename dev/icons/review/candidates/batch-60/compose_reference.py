from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parent
PREVIOUS = ROOT.parent / "batch-59"
SOURCES = [
    "aktywny_system_obrony.png",
    "ruch.png",
    "atak_mobsprzet.png",
    "wrazliwosc_na_swiatlo.png",
    "karabin_laserowy.png",
    "dmuchawka.png",
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

target = ROOT / "raw" / "batch-60-reference-atlas-a.png"
atlas.save(target, "PNG", optimize=True)
print(target)
