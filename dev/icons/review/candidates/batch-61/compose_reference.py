from pathlib import Path

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parent
PREVIOUS = ROOT.parent / "batch-60"
CELL = 512
SAFE = 410
SHEETS = {
    "a": [
        "ruch_revision_b.png",
        "karabin_laserowy_revision_b.png",
        "cwiczenie_czyni_mistrza.png",
        "grad_olowiu.png",
        "ja_juz_swoje_odchorowalem.png",
        "jesli_ma_silnik_to_ruszy.png",
        "pakowanie.png",
        "paszcza.png",
        "patriota.png",
    ],
    "b": [
        "urodzony_morderca.png",
        "wychuchana_spluwa.png",
        "zawziety_sukinkot.png",
    ],
}


def compose(sheet_id: str, sources: list[str]) -> Path:
    atlas = Image.new("RGB", (CELL * 3, CELL * 3), "black")
    for index, filename in enumerate(sources):
        with Image.open(PREVIOUS / filename) as source:
            alpha = source.convert("RGBA").getchannel("A")
            alpha = ImageOps.contain(alpha.crop(alpha.getbbox()), (SAFE, SAFE), Image.Resampling.LANCZOS)
        glyph = Image.new("RGBA", alpha.size, "white")
        glyph.putalpha(alpha)
        row, column = divmod(index, 3)
        x = column * CELL + (CELL - glyph.width) // 2
        y = row * CELL + (CELL - glyph.height) // 2
        atlas.paste(glyph, (x, y), glyph)
    target = ROOT / "raw" / f"batch-61-reference-atlas-{sheet_id}.png"
    atlas.save(target, "PNG", optimize=True)
    return target


for key, filenames in SHEETS.items():
    print(compose(key, filenames))
