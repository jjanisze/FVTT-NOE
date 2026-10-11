"""Normalize Batch 63 atlas cells into review PNGs and lossless WEBP/SVG masks."""
import importlib.util
import json
import sys
from pathlib import Path
from PIL import Image, ImageDraw

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
helper = importlib.util.spec_from_file_location("batch62_masks", HERE.parent / "batch-62" / "process_batch.py")
module = importlib.util.module_from_spec(helper)
helper.loader.exec_module(module)

batch = json.loads((HERE / "batch.json").read_text(encoding="utf-8"))
entries = [*batch["revisions"], *batch["fresh"]]
small = Image.new("RGB", (650, len(entries) * 90), (34, 34, 34))
draw = ImageDraw.Draw(small)
row = 0
for atlas in ("a", "b", "c"):
    with Image.open(HERE / "raw" / f"batch-63-atlas-{atlas}.png") as source:
        preview = Image.new("RGBA", (768, 768), (34, 34, 34, 255))
        for index, entry in enumerate(e for e in entries if e["atlas"] == atlas):
            grid_row, column = divmod(index, 3)
            x0, x1 = round(column * source.width / 3), round((column + 1) * source.width / 3)
            y0, y1 = round(grid_row * source.height / 3), round((grid_row + 1) * source.height / 3)
            key = entry["key"]
            cell = source.crop((x0 + 8, y0 + 8, x1 - 8, y1 - 8))
            if key == "samuraj_revision_b":
                cell.save(HERE / "raw" / "samuraj-reference.png")
                correction = HERE / "raw" / "standalone-samuraj.png"
                if correction.is_file():
                    with Image.open(correction) as replacement:
                        cell = replacement.copy()
            icon = module.normalize(cell)
            icon.save(HERE / f"{key}.png", "PNG", optimize=True)
            icon.save(HERE / f"{key}.webp", "WEBP", lossless=True, exact=True, method=6)
            (HERE / f"{key}.svg").write_text(module.svg_mask(key, icon), encoding="utf-8")
            preview.alpha_composite(icon, (column * 256, grid_row * 256))
            draw.text((12, row * 90 + 32), key, fill="white")
            for display, offset in ((64, 310), (32, 405), (24, 475), (16, 540)):
                thumb = icon.resize((display, display), Image.Resampling.LANCZOS)
                small.paste(thumb, (offset, row * 90 + (90 - display) // 2), thumb)
            row += 1
        preview.convert("RGB").save(HERE / "raw" / f"preview-{atlas}.png")
small.save(HERE / "raw" / "inventory-preview.png")
print(f"Prepared {row} review candidates; no Batch 63 assets installed")
