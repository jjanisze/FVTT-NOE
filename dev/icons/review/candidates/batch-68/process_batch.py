"""Normalize two targeted revisions into review masks without installing assets."""
import importlib.util
import json
import sys
from collections import deque
from pathlib import Path
from PIL import Image, ImageDraw

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("batch62_masks", HERE.parent / "batch-62" / "process_batch.py")
masks = importlib.util.module_from_spec(spec)
spec.loader.exec_module(masks)


def remove_tiny_marks(icon):
    """Use the previous batch's speck threshold after alpha normalization."""
    size = icon.width
    alpha = bytearray(icon.getchannel("A").tobytes())
    seen = bytearray(len(alpha))
    removed = 0
    for start in range(len(alpha)):
        if seen[start] or alpha[start] < 64:
            continue
        queue, component = deque([start]), []
        seen[start] = 1
        while queue:
            point = queue.popleft()
            component.append(point)
            x, y = point % size, point // size
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < size and 0 <= ny < size:
                    neighbour = ny * size + nx
                    if not seen[neighbour] and alpha[neighbour] >= 64:
                        seen[neighbour] = 1
                        queue.append(neighbour)
        if len(component) < 12:
            for point in component:
                alpha[point] = 0
            removed += len(component)
    icon.putalpha(Image.frombytes("L", icon.size, bytes(value if value >= 64 else 0 for value in alpha)))
    return icon, removed


batch = json.loads((HERE / "batch.json").read_text(encoding="utf-8"))
prompts = json.loads((HERE / "prompts.json").read_text(encoding="utf-8"))
overrides = {entry["key"]: entry["output"] for entry in prompts["targetedCorrections"]}
preview = Image.new("RGBA", (512, 256), (34, 34, 34, 255))
inventory = Image.new("RGB", (650, 180), (34, 34, 34))
draw = ImageDraw.Draw(inventory)
report = []
for row, entry in enumerate(batch["revisions"]):
    key = entry["key"]
    chosen = overrides.get(key, entry["output"])
    with Image.open(HERE / chosen) as source:
        icon, removed = remove_tiny_marks(masks.normalize(source))
    icon.save(HERE / f"{key}.png", "PNG", optimize=True)
    icon.save(HERE / f"{key}.webp", "WEBP", lossless=True, exact=True, method=6)
    (HERE / f"{key}.svg").write_text(masks.svg_mask(key, icon), encoding="utf-8")
    preview.alpha_composite(icon, (row * 256, 0))
    draw.text((12, row * 90 + 32), key, fill="white")
    for size, offset in ((64, 310), (32, 405), (24, 475), (16, 540)):
        thumb = icon.resize((size, size), Image.Resampling.LANCZOS)
        inventory.paste(thumb, (offset, row * 90 + (90 - size) // 2), thumb)
    report.append({"key": key, "source": chosen, "removedTinyPixels": removed})
preview.convert("RGB").save(HERE / "raw" / "preview.png")
inventory.save(HERE / "raw" / "inventory-preview.png")
(HERE / "normalization.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
print("Prepared two PNG/WEBP/SVG review candidates; no production assets installed")
