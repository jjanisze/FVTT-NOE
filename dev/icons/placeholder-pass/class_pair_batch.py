"""Normalize or register a frozen batch of two-option primary class revisions."""
import argparse
import json
import re
from datetime import datetime, timezone
from PIL import Image, ImageDraw
from prepare_70_71 import ROOT, REVIEW, read, write, sha
from process import clean, masks
from class_options_92 import validate_mask


def option_dir(number, variant):
    return REVIEW / f"candidates/batch-{number}-{variant}"


def validate(number):
    here = REVIEW / f"candidates/batch-{number}"
    subjects = read(here / "batch.json")["subjects"]
    assert subjects and len({s["key"] for s in subjects}) == len(subjects)
    assert all(s["kind"] == "class" and set(s["options"]) == {"a", "b"} for s in subjects)
    pairs = {p["key"]: p for p in read(here / "prompts.json")["pairs"]}
    for subject in subjects:
        assert (here / pairs[subject["key"]]["output"]).is_file()
        for reference in pairs[subject["key"]]["reference"]:
            assert (here / reference).is_file()
        for target in subject["deliveryTargets"]:
            assert sha(ROOT / target["source"]) == target["sourceSha256"], "Production target changed"
    for variant in ("a", "b"):
        directory = option_dir(number, variant)
        report = read(directory / "validated.json")
        assert report["batch"] == number and report["variant"] == variant and report["validatedMasks"] == len(subjects)
        for subject in subjects:
            validate_mask(directory, subject["key"])
            assert sha(directory / f"{subject['key']}.png") == report["candidateHashes"][subject["key"]]
    print(f"Batch {number}: {len(subjects) * 2} exact class masks validated; native targets unchanged.")


def process(number):
    here = REVIEW / f"candidates/batch-{number}"
    subjects = read(here / "batch.json")["subjects"]
    pairs = {p["key"]: p for p in read(here / "prompts.json")["pairs"]}
    preview = Image.new("RGB", (650, 256 * len(subjects)), (34, 34, 34))
    inventory = Image.new("RGB", (720, 180 * len(subjects)), (34, 34, 34))
    draw, inventory_draw = ImageDraw.Draw(preview), ImageDraw.Draw(inventory)
    records = []
    for index, subject in enumerate(subjects):
        key = subject["key"]
        with Image.open(here / pairs[key]["output"]) as source:
            width, height = source.size
            middle = width // 2
            assert source.convert("L").crop((middle - 6, 0, middle + 6, height)).getextrema()[1] < 64, "Glyph crosses center gutter"
            for option_index, variant in enumerate(("a", "b")):
                box = (0, 0, middle, height) if variant == "a" else (middle, 0, width, height)
                icon, removed = clean(masks.normalize(source.crop(box)))
                directory = option_dir(number, variant)
                icon.save(directory / f"{key}.png", "PNG", optimize=True)
                icon.save(directory / f"{key}.webp", "WEBP", lossless=True, exact=True, method=6)
                (directory / f"{key}.svg").write_text(masks.svg_mask(key, icon), encoding="utf-8")
                preview.paste(icon, (120 + option_index * 260, index * 256), icon)
                draw.text((8, index * 256 + 8), key + " A / B", fill="white")
                inventory_draw.text((8, index * 180 + option_index * 90 + 30), key + " " + variant.upper(), fill="white")
                for size, offset in ((64, 260), (32, 390), (24, 500), (16, 600)):
                    thumb = icon.resize((size, size), Image.Resampling.LANCZOS)
                    inventory.paste(thumb, (offset, index * 180 + option_index * 90 + (90 - size) // 2), thumb)
                records.append({"key": key, "variant": variant, "source": pairs[key]["output"], "sourceSize": [width, height],
                                "crop": list(box), "removedTinyPixels": removed})
    for variant in ("a", "b"):
        directory = option_dir(number, variant)
        write(directory / "validated.json", {"batch": number, "variant": variant, "validatedMasks": len(subjects),
              "prospectiveDeliveryTargets": sum(len(s["deliveryTargets"]) for s in subjects),
              "candidateHashes": {s["key"]: sha(directory / f"{s['key']}.png") for s in subjects}})
    write(here / "normalization.json", records)
    write(here / "validated.json", {"batch": number, "validatedMasks": 2 * len(subjects), "classSubjects": len(subjects),
          "prospectiveDeliveryTargets": sum(len(s["deliveryTargets"]) for s in subjects),
          "candidateHashes": {f"{v}:{s['key']}": sha(option_dir(number, v) / f"{s['key']}.png") for s in subjects for v in ("a", "b")}})
    preview.save(here / "raw/preview.png")
    inventory.save(here / "raw/inventory-preview.png")
    validate(number)


def register(number):
    validate(number)
    here = REVIEW / f"candidates/batch-{number}"
    assert not (here / "registration.json").exists(), "Already registered; retain newer feedback"
    batch = read(here / "batch.json")
    subjects = batch["subjects"]
    manifest_file, feedback_file = REVIEW / "manifest.json", REVIEW / "feedback.json"
    manifest_bytes, feedback_bytes = manifest_file.read_bytes(), feedback_file.read_bytes()
    manifest, feedback = json.loads(manifest_bytes), json.loads(feedback_bytes)
    cards = {c["id"]: c for c in manifest["items"]}
    for subject in subjects:
        card = cards[subject["itemId"]]
        assert card.get("status") != "resolved"
        assert feedback["items"][subject["itemId"]] == subject["revisionOf"]["feedback"], "Newer class feedback"
        assert not any(c["id"].startswith(f"batch{number}-") for c in card["candidates"])
        selected = next(c for c in card["candidates"] if c["id"] == subject["revisionOf"]["candidateId"])
        assert selected["src"] == subject["revisionOf"]["selectedSource"]
        assert sha(REVIEW / selected["src"]) == subject["revisionOf"]["sourceSha256"]
    for subject in subjects:
        card = cards[subject["itemId"]]
        options = [{"id": f"batch{number}-{v}", "label": f"Batch {number} · {subject['name']} · {v.upper()}",
                    "src": f"candidates/batch-{number}-{v}/{subject['key']}.png", "note": subject["options"][v]} for v in ("a", "b")]
        card["candidates"] = options + card["candidates"]
        card.update(batch=number, tier=f"Batch {number} · {subject['ownerLabel']}", request=subject["request"])
        feedback["items"][subject["itemId"]] = {"itemId": subject["itemId"], "decision": "pending", "candidateId": f"batch{number}-a",
            "notes": "", "updatedAt": datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")}
    ids = {s["itemId"] for s in subjects}
    manifest["items"] = [cards[s["itemId"]] for s in subjects] + [c for c in manifest["items"] if c["id"] not in ids]
    active = [c for c in manifest["items"] if c.get("status") != "resolved"]
    numbers = sorted({c["batch"] for c in active})
    manifest.update(title=f"Batches {' + '.join(map(str, numbers))} · {len(active)} awaiting GM review", updated=batch["date"])
    missing_file = ROOT / "dev/icons/MISSING.md"
    missing_before = missing_file.read_text(encoding="utf-8")
    start = missing_before.index("**Next batch number:")
    finish = missing_before.index("\n\n", start)
    next_number = int(re.search(r"\*\*Next batch number: (\d+)\*\*", missing_before)[1])
    missing = missing_before[:start] + f"**Next batch number: {max(next_number, number + 1)}** ({len(active)} subjects await GM review;\nprimary class revisions retain two options each)." + missing_before[finish:]
    begin, end = f"<!-- placeholder-batch-{number}:start -->", f"<!-- placeholder-batch-{number}:end -->"
    assert begin not in missing and end not in missing
    class_label = "class" if len(subjects) == 1 else "classes"
    lines = [begin, f"## Queue (A) — Batch {number} — {len(subjects)} {class_label}, two revision options each", "",
             "Each class has two new choices with two main elements. All selected-source",
             "hashes and verbatim feedback are archived alongside exact generic prompts.",
             "Older candidates remain selectable; production files require saved approval.", "",
             "| Class | Requested correction | Native SVG (+ WEBP) |", "|---|---|---|"]
    for subject in subjects:
        lines.append(f"| {subject['name']} | {subject['revisionOf']['notes'].replace('|', '/')} | `{subject['target']}` |")
    lines += ["", f"Sources, prompts and review records: `review/candidates/batch-{number}/`.", "", end, ""]
    anchor = missing.find(f"<!-- placeholder-batch-{number + 1}:start -->")
    if anchor < 0:
        anchor = missing.index("<!-- class-placeholder-audit:start -->")
    missing = missing[:anchor] + "\n".join(lines) + "\n" + missing[anchor:]
    assert manifest_file.read_bytes() == manifest_bytes and feedback_file.read_bytes() == feedback_bytes, "Review changed during preflight"
    assert missing_file.read_text(encoding="utf-8") == missing_before, "Queue changed during preflight"
    write(manifest_file, manifest)
    write(feedback_file, feedback)
    missing_file.write_text(missing, encoding="utf-8")
    write(here / "manifest-items.json", {"title": manifest["title"], "updated": batch["date"], "items": [cards[s["itemId"]] for s in subjects]})
    write(here / "registration.json", {"date": batch["date"], "batch": number, "classSubjects": len(subjects), "newOptions": 2 * len(subjects)})
    print(f"Registered {2 * len(subjects)} options on {len(subjects)} existing class cards; older choices and unrelated decisions retained.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("process", "register", "check"))
    parser.add_argument("--batch", type=int, required=True)
    args = parser.parse_args()
    {"process": process, "register": register, "check": validate}[args.mode](args.batch)
