"""Archive a batch's saved GM review and deliver only exact approved masks."""
import argparse
import base64
import hashlib
import io
import json
import subprocess
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from PIL import Image

sys.dont_write_bytecode = True
from process import ROOT, REVIEW, masks


def read(file):
    return json.loads(file.read_text(encoding="utf-8"))


def write(file, value):
    file.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def selected_source(subject, selected):
    source = (REVIEW / selected["src"]).resolve()
    assert source.is_relative_to(REVIEW / "candidates"), "Selected source escapes the candidate tree"
    provenance = read(source.parent / "validated.json")
    assert sha(source) == provenance["candidateHashes"][subject["key"]], "Selected candidate changed"
    return source


def check(here):
    report = read(here / "reviewed-installed.json")
    for item in report["installed"]:
        expected = Image.open(REVIEW / item["source"]).convert("RGBA")
        svg, bitmap = [ROOT / file for file in item["files"]]
        assert sha(REVIEW / item["source"]) == item["sourceSha256"]
        assert sha(svg) == item["svgSha256"] and sha(bitmap) == item["webpSha256"]
        with Image.open(bitmap) as delivered:
            assert delivered.format == "WEBP" and delivered.mode == "RGBA"
            assert delivered.size == (256, 256) and delivered.tobytes() == expected.tobytes()
        wrapper = ET.fromstring(svg.read_text(encoding="utf-8"))
        assert wrapper.find("{http://www.w3.org/2000/svg}rect").attrib["fill"] == "var(--icon-fill, #fff)"
        href = wrapper.find(".//{http://www.w3.org/2000/svg}image").attrib["href"]
        with Image.open(io.BytesIO(base64.b64decode(href.split(",", 1)[1]))) as embedded:
            assert embedded.format == "WEBP" and embedded.convert("RGBA").tobytes() == expected.tobytes()
    print(f"Verified {report['approvedSubjects']} approved subjects / {len(report['installed'])} exact SVG+WEBP targets")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--batch", type=int, required=True)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    here = REVIEW / "candidates" / f"batch-{args.batch}"
    if args.check or (here / "reviewed-installed.json").is_file():
        check(here)
        return
    batch = read(here / "batch.json")
    manifest_file, feedback_file = REVIEW / "manifest.json", REVIEW / "feedback.json"
    manifest = read(manifest_file)
    feedback_bytes = feedback_file.read_bytes()
    feedback = json.loads(feedback_bytes)["items"]
    cards = {item["id"]: item for item in manifest["items"]}
    snapshot, prepared, approved_ids = [], [], set()
    # Preflight all decisions, selected pixels and production hashes before writing.
    for subject in batch["subjects"]:
        card, saved = cards[subject["itemId"]], feedback[subject["itemId"]]
        selected = next(candidate for candidate in card["candidates"] if candidate["id"] == saved["candidateId"])
        source = selected_source(subject, selected)
        snapshot.append({"id": card["id"], "name": card["name"], "decision": saved["decision"],
                         "candidateId": selected["id"], "selectedSource": selected["src"],
                         "sourceSha256": sha(source), "deliveryTargets": subject["deliveryTargets"],
                         "notes": saved.get("notes", ""), "feedback": saved})
        assert saved["decision"] in ("approve", "revise", "reject"), "Review is incomplete"
        if saved["decision"] != "approve":
            continue
        icon = Image.open(source).convert("RGBA")
        assert icon.size == (256, 256)
        bounds = icon.getchannel("A").getbbox()
        assert bounds and min(bounds[0], bounds[1], 256 - bounds[2], 256 - bounds[3]) >= 20
        assert all(pixel[:3] == (255, 255, 255) for pixel in icon.getdata() if pixel[3])
        approved_ids.add(card["id"])
        for target in subject["deliveryTargets"]:
            destination = (ROOT / target["source"]).resolve()
            assert destination.is_relative_to(ROOT / "icons") and destination.suffix == ".svg"
            assert sha(destination) == target["sourceSha256"], f"Production target changed: {target['source']}"
            bitmap = destination.with_suffix(".webp")
            assert not bitmap.exists(), f"Existing sidecar requires inspection: {bitmap.name}"
            status = subprocess.run(["git", "status", "--porcelain", "--", target["source"],
                                     bitmap.relative_to(ROOT).as_posix()], cwd=ROOT, check=True,
                                    capture_output=True, text=True).stdout
            assert not status, f"Dirty production target: {target['source']}"
            prepared.append((card, selected, source, destination, bitmap, icon))
    assert feedback_file.read_bytes() == feedback_bytes, "GM feedback changed during preflight"
    write(here / "reviewed.json", {"date": batch["date"], "batch": args.batch,
          "feedbackBeforeSha256": hashlib.sha256(feedback_bytes).hexdigest(), "active": snapshot})
    installed = []
    for card, selected, source, destination, bitmap, icon in prepared:
        icon.save(bitmap, "WEBP", lossless=True, exact=True, method=6)
        destination.write_text(masks.svg_mask(destination.stem, icon), encoding="utf-8")
        installed.append({"itemId": card["id"], "candidateId": selected["id"], "source": selected["src"],
                          "sourceSha256": sha(source), "files": [destination.relative_to(ROOT).as_posix(), bitmap.relative_to(ROOT).as_posix()],
                          "svgSha256": sha(destination), "webpSha256": sha(bitmap)})
    for item_id in approved_ids:
        cards[item_id]["status"] = "resolved"
    remaining = [card for card in manifest["items"] if card.get("status") != "resolved"]
    manifest["title"] = f"Batch {args.batch} · {len(approved_ids)} approved subjects delivered; {len(remaining)} awaiting revision"
    manifest["updated"] = batch["date"]
    assert feedback_file.read_bytes() == feedback_bytes, "GM feedback changed during delivery"
    write(manifest_file, manifest)
    write(here / "reviewed-installed.json", {"date": batch["date"], "batch": args.batch,
          "approvedSubjects": len(approved_ids), "remainingSubjects": len(remaining), "installed": installed})
    check(here)


if __name__ == "__main__":
    main()
