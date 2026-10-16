"""Normalize and validate a full or explicitly partial 3x3 placeholder atlas."""
import argparse
import base64
import hashlib
import importlib.util
import io
import json
import sys
import xml.etree.ElementTree as ET
from collections import deque
from pathlib import Path
from PIL import Image, ImageDraw

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[3]
REVIEW = ROOT / "dev/icons/review"
spec = importlib.util.spec_from_file_location("approved_masks", REVIEW / "candidates/batch-62/process_batch.py")
masks = importlib.util.module_from_spec(spec)
spec.loader.exec_module(masks)


def clean(icon):
    alpha = bytearray(icon.getchannel("A").tobytes())
    seen = bytearray(len(alpha))
    removed = 0
    for start, opacity in enumerate(alpha):
        if seen[start] or opacity < 64:
            continue
        pending, component = deque([start]), []
        seen[start] = 1
        while pending:
            point = pending.popleft()
            component.append(point)
            x, y = point % 256, point // 256
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < 256 and 0 <= ny < 256:
                    neighbour = ny * 256 + nx
                    if not seen[neighbour] and alpha[neighbour] >= 64:
                        seen[neighbour] = 1
                        pending.append(neighbour)
        if len(component) < 12:
            for point in component:
                alpha[point] = 0
            removed += len(component)
    icon.putalpha(Image.frombytes("L", icon.size, bytes(value if value >= 64 else 0 for value in alpha)))
    return icon, removed


def split_components(atlas, ownership_regions=(), expected_cells=9):
    """Recover small cell overhangs without clipping limbs or importing neighbours."""
    width, height = atlas.size
    gray = atlas.convert("L").tobytes()
    seen = bytearray(len(gray))
    groups = [bytearray(len(gray)) for _ in range(9)]
    overhangs = [0] * 9
    for start, value in enumerate(gray):
        if seen[start] or value < 64:
            continue
        pending, component, votes = deque([start]), [], [0] * 9
        seen[start] = 1
        while pending:
            point = pending.popleft()
            component.append(point)
            x, y = point % width, point // width
            votes[min(2, y * 3 // height) * 3 + min(2, x * 3 // width)] += 1
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < width and 0 <= ny < height:
                    neighbour = ny * width + nx
                    if not seen[neighbour] and gray[neighbour] >= 64:
                        seen[neighbour] = 1
                        pending.append(neighbour)
        owner = max(range(9), key=lambda index: votes[index])
        bounds = (min(point % width for point in component),
                  min(point // width for point in component),
                  max(point % width for point in component),
                  max(point // width for point in component))
        # Explicit source-space regions recover disconnected fingers as well
        # as hands. Only whole components contained by a reviewed box qualify.
        overrides = [region for region in ownership_regions
                     if region["box"][0] <= bounds[0] and region["box"][1] <= bounds[1]
                     and region["box"][2] > bounds[2] and region["box"][3] > bounds[3]]
        if len(overrides) > 1:
            raise ValueError("Overlapping component ownership regions")
        if overrides:
            owner = overrides[0]["cell"] - 1
            if not 0 <= owner < 9:
                raise ValueError("Invalid component owner")
        elif votes[owner] / len(component) < 0.7:
            raise ValueError(f"Fused/ambiguous cross-cell glyph: {len(component)} pixels, "
                             f"bounds {bounds}, cell votes {votes}; use a targeted generator correction")
        overhangs[owner] += len(component) - votes[owner]
        for point in component:
            groups[owner][point] = gray[point]
    result = []
    for index, group in enumerate(groups):
        image = Image.new("RGBA", atlas.size, "white")
        image.putalpha(Image.frombytes("L", atlas.size, bytes(group)))
        if index >= expected_cells:
            if image.getchannel("A").getbbox():
                raise ValueError("Unexpected foreground in unused atlas cell")
            continue
        if not image.getchannel("A").getbbox():
            raise ValueError("Empty atlas cell")
        result.append(image)
    return result, overhangs[:expected_cells]


def subject_count(batch):
    count = len(batch["subjects"])
    assert 1 <= count <= 9 and len({s["key"] for s in batch["subjects"]}) == count
    if count < 9:
        assert batch.get("partialAtlas") is True and batch.get("emptyCells") == list(range(count + 1, 10)), "Declare every unused final cell"
    return count


def process(here, batch):
    count = subject_count(batch)
    preview = Image.new("RGBA", (768, 768), (34, 34, 34, 255))
    inventory = Image.new("RGB", (650, 90 * count), (34, 34, 34))
    draw = ImageDraw.Draw(inventory)
    report = []
    with Image.open(here / f"raw/batch-{batch['batch']}-atlas-a.png") as atlas:
        cells, overhangs = split_components(atlas, batch.get("ownershipRegions", []), count)
        for index, subject in enumerate(batch["subjects"]):
            row, column = divmod(index, 3)
            cell = cells[index]
            source = f"raw/batch-{batch['batch']}-atlas-a.png, cell {index + 1}"
            replacement = here / f"raw/standalone-{subject['key']}.png"
            if replacement.is_file():
                with Image.open(replacement) as corrected:
                    cell = corrected.copy()
                source = f"raw/{replacement.name}"
            icon, removed = clean(masks.normalize(cell))
            key = subject["key"]
            icon.save(here / f"{key}.png", "PNG", optimize=True)
            icon.save(here / f"{key}.webp", "WEBP", lossless=True, exact=True, method=6)
            (here / f"{key}.svg").write_text(masks.svg_mask(key, icon), encoding="utf-8")
            preview.alpha_composite(icon, (column * 256, row * 256))
            draw.text((12, index * 90 + 32), key, fill="white")
            for size, offset in ((64, 310), (32, 405), (24, 475), (16, 540)):
                thumb = icon.resize((size, size), Image.Resampling.LANCZOS)
                inventory.paste(thumb, (offset, index * 90 + (90 - size) // 2), thumb)
            report.append({"key": key, "source": source, "removedTinyPixels": removed,
                           "recoveredOverhangPixels": overhangs[index],
                           "split": "whole components; majority cell or explicit source-space ownership region"})
    preview.convert("RGB").save(here / "raw/preview.png")
    inventory.save(here / "raw/inventory-preview.png")
    (here / "normalization.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")


def validate(here, batch):
    subjects = batch["subjects"]
    count = subject_count(batch)
    prompts = json.loads((here / "prompts.json").read_text(encoding="utf-8"))
    assert prompts["atlas"] and (here / prompts["reference"]).is_file()
    normal = json.loads((here / "normalization.json").read_text(encoding="utf-8"))
    assert {entry["key"] for entry in normal} == {subject["key"] for subject in subjects}
    for correction in prompts["targetedCorrections"]:
        assert correction["prompt"] and (here / correction["output"]).is_file()
        assert (here / correction["reference"]).is_file()
        assert next(entry["source"] for entry in normal if entry["key"] == correction["key"]) == correction["output"]
    for subject in subjects:
        key = subject["key"]
        with Image.open(here / f"{key}.png") as source:
            png = source.convert("RGBA")
        with Image.open(here / f"{key}.webp") as source:
            assert source.format == "WEBP" and source.mode == "RGBA", key
            webp = source.copy()
        assert png.size == webp.size == (256, 256) and png.tobytes() == webp.tobytes(), key
        bounds = png.getchannel("A").getbbox()
        assert bounds and min(bounds[0], bounds[1], 256 - bounds[2], 256 - bounds[3]) >= 20, key
        assert all(pixel[:3] == (255, 255, 255) for pixel in png.getdata() if pixel[3]), key
        svg = ET.fromstring((here / f"{key}.svg").read_text(encoding="utf-8"))
        href = svg.find(".//{http://www.w3.org/2000/svg}image").attrib["href"]
        assert href.startswith("data:image/webp;base64,"), key
        with Image.open(io.BytesIO(base64.b64decode(href.split(",", 1)[1]))) as embedded:
            assert embedded.format == "WEBP" and embedded.convert("RGBA").tobytes() == png.tobytes(), key
    report = {"batch": batch["batch"], "validatedMasks": count,
              "prospectiveDeliveryTargets": sum(len(subject["deliveryTargets"]) for subject in subjects),
              "candidateHashes": {subject["key"]: hashlib.sha256((here / f"{subject['key']}.png").read_bytes()).hexdigest() for subject in subjects}}
    (here / "validated.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
    print(f"Batch {batch['batch']} validated: {count} exact PNG/WEBP/embedded-WEBP SVG masks; production unchanged")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--batch", type=int, required=True)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    if args.batch < 69:
        parser.error("Use this helper only for the placeholder pass starting at Batch 69")
    here = REVIEW / "candidates" / f"batch-{args.batch}"
    batch = json.loads((here / "batch.json").read_text(encoding="utf-8"))
    assert batch["batch"] == args.batch
    if not args.check:
        process(here, batch)
    validate(here, batch)


if __name__ == "__main__":
    main()
