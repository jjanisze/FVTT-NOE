"""Freeze, install and verify the three final GM-requested M9 artifact corrections."""
import argparse
import importlib.util
import hashlib
import json
import shutil
import sys
from collections import deque
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[3]
HERE = ROOT / "dev/icons/review/candidates/batch-128"
sys.path.insert(0, str(ROOT / "dev/finish"))
from raster import load_master, pixel_sha


def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def write(file, value):
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def components(image):
    alpha = image.getchannel("A")
    pixels = alpha.tobytes()
    width, height = image.size
    seen = set()
    groups = []
    for start, value in enumerate(pixels):
        if not value or start in seen:
            continue
        seen.add(start)
        pending, group = deque([start]), []
        while pending:
            point = pending.popleft()
            group.append(point)
            x, y = point % width, point // width
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    nx, ny = x + dx, y + dy
                    adjacent = ny * width + nx
                    if 0 <= nx < width and 0 <= ny < height and pixels[adjacent] and adjacent not in seen:
                        seen.add(adjacent)
                        pending.append(adjacent)
        box = (min(p % width for p in group), min(p // width for p in group), max(p % width for p in group) + 1, max(p // width for p in group) + 1)
        groups.append({"area": len(group), "box": box, "pixels": group})
    return sorted(groups, key=lambda g: -g["area"])


def inspect():
    batch = json.loads((HERE / "batch.json").read_text(encoding="utf-8"))
    for subject in batch["subjects"]:
        image = load_master(ROOT / subject["master"])
        print(json.dumps({"key": subject["key"], "components": [{"area": g["area"], "box": g["box"]} for g in components(image)]}))


def normalize():
    authorization = json.loads((HERE / "normalization-authorization.json").read_text(encoding="utf-8"))
    assert authorization["approved"] is True and authorization["method"] == "deterministic-speck-cleanup"
    assert not (HERE / "cleanup.json").exists(), "Cleanup candidates already frozen"
    spec = importlib.util.spec_from_file_location("approved_m9_masks", ROOT / "dev/icons/review/candidates/batch-62/process_batch.py")
    masks = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(masks)
    batch = json.loads((HERE / "batch.json").read_text(encoding="utf-8"))
    removals = {"trucizna": (194, 230, 203, 236), "beretta_b92": (0, 81, 10, 94)}
    expected_removed = {"trucizna": 25, "beretta_b92": 99, "k_22_revolver": 0}
    records, hashes = [], {}
    preview = Image.new("RGBA", (840, 3 * 120), "#191e23")
    draw = ImageDraw.Draw(preview)
    for i, subject in enumerate(batch["subjects"]):
        key = subject["key"]
        source = load_master(ROOT / subject["master"])
        cleaned = source.copy()
        alpha = bytearray(source.getchannel("A").tobytes())
        deleted = set()
        box = removals.get(key)
        for group in components(source):
            bounds = group["box"]
            if box and box[0] <= bounds[0] and box[1] <= bounds[1] and box[2] >= bounds[2] and box[3] >= bounds[3]:
                assert group["area"] < 100 and group["area"] < components(source)[0]["area"]
                deleted.update(group["pixels"])
        assert len(deleted) == expected_removed[key], key
        for point in deleted:
            alpha[point] = 0
        cleaned.putalpha(Image.frombytes("L", source.size, bytes(alpha)))
        original_alpha = source.getchannel("A").tobytes()
        assert all(a == b or n in deleted for n, (a, b) in enumerate(zip(original_alpha, alpha)))
        # Poison: preserve its exact existing object pixels and placement. Firearms: the
        # existing normalizer restores the standard 20 px safe margin without redrawing.
        result = cleaned if key == "trucizna" else masks.normalize(cleaned)
        result.save(HERE / f"{key}.png", "PNG", optimize=True)
        result.save(HERE / f"{key}.webp", "WEBP", lossless=True, exact=True, method=6)
        (HERE / f"{key}.svg").write_text(masks.svg_mask(key, result), encoding="utf-8")
        assert load_master(HERE / f"{key}.svg").tobytes() == result.tobytes()
        assert Image.open(HERE / f"{key}.webp").convert("RGBA").tobytes() == result.tobytes()
        bounds = result.getchannel("A").getbbox()
        assert min(bounds[0], bounds[1], 256 - bounds[2], 256 - bounds[3]) >= 20
        assert all(p[:3] == (255, 255, 255) for p in result.getdata() if p[3])
        hashes[key] = sha(HERE / f"{key}.png")
        records.append({"key": key, "source": subject["master"], "sourceSha256": sha(ROOT / subject["master"]),
            "removedAlphaPixels": len(deleted), "removalBox": box,
            "untouchedAlphaOutsideRemoval": True, "safeMarginNormalization": key != "trucizna",
            "outputPixelSha256": pixel_sha(result), "bounds": bounds})
        draw.text((8, i * 120 + 5), key + "  before / after", fill="white")
        for j, icon in enumerate((source, result)):
            for size, dx in ((64, 0), (44, 90), (32, 160), (16, 220)):
                thumb = icon.convert("RGBa").resize((size, size), Image.Resampling.LANCZOS).convert("RGBA")
                preview.alpha_composite(thumb, (15 + j * 410 + dx, i * 120 + 32))
    preview.convert("RGB").save(HERE / "raw/inventory-preview.webp", "WEBP", lossless=True)
    write(HERE / "cleanup.json", {"batch": 128, "method": "GM-approved deterministic cleanup after image-service rejection",
        "authorization": "normalization-authorization.json", "subjects": records})
    write(HERE / "validated.json", {"batch": 128, "validatedMasks": 3, "candidateHashes": hashes,
        "checks": ["Exact poison pixels preserved outside the 25-pixel detached speck", "Only the measured 99-pixel detached pistol artifact removed before normalization", "Firearm silhouette preserved through existing safe-margin normalization", "256 px white SVG/WEBP masks decode identically", "Minimum 20 px safe margin"]})
    print("Prepared three validated cleanup pairs; poison changed only at the detached 25-pixel speck.")


def prepare():
    assert not HERE.exists(), "Batch 128 is already frozen"
    manifest = json.loads((ROOT / "dev/finish/manifest.json").read_text(encoding="utf-8"))
    ids = ["chemicals/trucizna", "weapon/beretta_b92", "weapon/k_22_revolver"]
    selected = [next(e for e in manifest["entries"] if e["id"] == key) for key in ids]
    (HERE / "raw/before").mkdir(parents=True)
    atlas = Image.new("RGB", (900, 900), "black")
    subjects = []
    for i, entry in enumerate(selected):
        key = entry["id"].split("/")[-1]
        targets = []
        for ext in ("svg", "png", "webp"):
            file = ROOT / str(Path(entry["wrapper"]).with_suffix("." + ext))
            if not file.exists():
                continue
            targets.append({"source": file.relative_to(ROOT).as_posix(), "sourceSha256": sha(file)})
            shutil.copyfile(file, HERE / f"raw/before/{key}.{ext}")
        source = load_master(ROOT / entry["source"])
        assert source.size == (256, 256), source.size
        source.save(HERE / f"raw/{key}-before.png")
        atlas.paste(source, (i * 300 + 22, 22), source)
        subjects.append({"key": key, "name": key, "target": entry["wrapper"], "master": entry["source"], "cell": i + 1,
            "deliveryTargets": targets, "finishId": entry["id"]})
    atlas.save(HERE / "raw/cleanup-target.png")
    shutil.copyfile(ROOT / "dev/icons/m9-pass/finish-review.json", HERE / "raw/finish-review-before.json")
    write(HERE / "before-entries.json", selected)
    write(HERE / "batch.json", {"batch": 128, "date": "2026-11-18", "subjects": subjects,
        "partialAtlas": True, "emptyCells": [4, 5, 6, 7, 8, 9],
        "authorization": "GM reported the lower-right dot on chemicals/trucizna and requested closing remaining opens before an M9 coding handoff; this includes the two queued minor firearm artifacts."})
    prompt = """Use case: precise-object-edit. Asset: an existing three-icon mask atlas for a fictional tabletop-game inventory. The supplied 3 by 3 image is the EDIT TARGET. Change only isolated stray marks outside the existing objects; retain the same recognizable silhouettes, scale, arrangement and broad internal cutouts. Flat solid-white objects on solid black, no shading, texture, labels, border or visible grid.
Row-major order: cell 1 is the existing poison bottle with skull marking: remove the tiny isolated dot below and to the right of the bottle, keeping the bottle unchanged. Cell 2 is the existing side-view pistol inventory silhouette: remove tiny detached edge/border fragments and specks, preserving its pictured shape. Cell 3 is the existing side-view revolver inventory silhouette: remove tiny detached edge/border fragments and specks, preserving its pictured shape. No new objects, no scenes of use, no technical instructions. Cells 4 through 9 remain completely empty black. Return the same square 3 by 3 layout with clean black separation and no frame. These are cosmetic pixel-contamination corrections, not a request for new artwork."""
    write(HERE / "prompts.json", {"tool": "OpenAI built-in image edit", "model": None,
        "reference": "raw/cleanup-target.png", "atlas": prompt, "invariants": "Existing object identity and style; only detached artifact cleanup"})
    print("Frozen three cleanup targets and exact prompt for Batch 128.")


def install():
    batch = json.loads((HERE / "batch.json").read_text(encoding="utf-8"))
    receipt_file = HERE / "installed.json"
    if receipt_file.exists():
        receipt = json.loads(receipt_file.read_text(encoding="utf-8"))
        for item in receipt["subjects"]:
            for file in item["files"]:
                assert sha(ROOT / file["path"]) == file["sha256"], file["path"]
        print("Three final cleanup deliveries verified.")
        return
    validated = json.loads((HERE / "validated.json").read_text(encoding="utf-8"))
    assert validated["validatedMasks"] == 3
    for subject in batch["subjects"]:
        for file in subject["deliveryTargets"]:
            assert sha(ROOT / file["source"]) == file["sourceSha256"], file["source"]
        key = subject["key"]
        assert sha(HERE / f"{key}.png") == validated["candidateHashes"][key]
        a = load_master(HERE / f"{key}.svg")
        b = Image.open(HERE / f"{key}.webp").convert("RGBA")
        assert a.tobytes() == b.tobytes()
    # Legacy sidecars are retired only after checking all textual runtime and pack references.
    for subject in batch["subjects"]:
        for file in subject["deliveryTargets"]:
            if not file["source"].endswith(".png"):
                continue
            for folder in ("scripts", "templates", "styles", "lang"):
                for candidate in (ROOT / folder).rglob("*"):
                    if candidate.is_file() and candidate.suffix in (".mjs", ".json", ".hbs", ".css"):
                        assert file["source"] not in candidate.read_text(encoding="utf-8"), str(candidate)
            manifest = json.loads((ROOT / "dev/finish/manifest.json").read_text(encoding="utf-8"))
            assert all(file["source"] != e.get("wrapper") for e in manifest["entries"])
    records = []
    for subject in batch["subjects"]:
        key = subject["key"]
        target = ROOT / subject["target"]
        files = []
        for ext in ("svg", "webp"):
            final = target.with_suffix("." + ext)
            shutil.copyfile(HERE / f"{key}.{ext}", final)
            files.append({"path": final.relative_to(ROOT).as_posix(), "sha256": sha(final)})
        for file in subject["deliveryTargets"]:
            if file["source"].endswith(".png"):
                (ROOT / file["source"]).unlink()
        records.append({"key": key, "wrapper": subject["target"], "finishId": subject["finishId"],
            "files": files, "sourcePixelSha256": pixel_sha(Image.open(target.with_suffix(".webp")).convert("RGBA")),
            "archived": subject["deliveryTargets"]})
    method = json.loads((HERE / "cleanup.json").read_text(encoding="utf-8"))["method"]
    write(receipt_file, {"date": "2026-11-18", "batch": 128, "method": method,
        "authorization": batch["authorization"], "archive": "raw/before/", "subjects": records})
    print("Installed three corrected SVG/WEBP pairs; originals preserved.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--prepare", action="store_true")
    parser.add_argument("--install", action="store_true")
    parser.add_argument("--inspect", action="store_true")
    parser.add_argument("--normalize", action="store_true")
    args = parser.parse_args()
    if args.prepare:
        prepare()
    if args.install:
        install()
    if args.inspect:
        inspect()
    if args.normalize:
        normalize()
