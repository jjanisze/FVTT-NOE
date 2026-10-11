"""Archive Batch 64 decisions, install exact approvals, and retain all saved feedback."""
import argparse
import base64
import hashlib
import io
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path

from PIL import Image

sys.dont_write_bytecode = True
from install_approved import main as install

HERE = Path(__file__).resolve().parent
REVIEW = HERE.parents[1]
ROOT = HERE.parents[4]


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def check(snapshot_name="reviewed.json", report_name="reviewed-installed.json"):
    snapshot = read(HERE / snapshot_name)
    installed = read(HERE / report_name)["installed"]
    approved = {item["id"]: item for item in snapshot["active"] if item["decision"] == "approve"}
    assert {item["itemId"] for item in installed} == set(approved), "Incomplete approved delivery"
    for item in installed:
        decision = approved[item["itemId"]]
        assert (item["candidateId"], item["source"]) == (decision["candidateId"], decision["selectedSource"])
        source = REVIEW / item["source"]
        bitmap = ROOT / item["files"][1]
        assert hashlib.sha256(source.read_bytes()).hexdigest() == item["sourceSha256"], item["itemId"]
        assert hashlib.sha256(bitmap.read_bytes()).hexdigest() == item["webpSha256"], item["itemId"]
        with Image.open(source) as original, Image.open(bitmap) as production:
            expected = original.convert("RGBA")
            assert production.format == "WEBP" and production.mode == "RGBA", item["itemId"]
            assert production.size == expected.size == (256, 256), item["itemId"]
            assert production.tobytes() == expected.tobytes(), item["itemId"]
            bounds = production.getchannel("A").getbbox()
            assert bounds and min(bounds[0], bounds[1], 256 - bounds[2], 256 - bounds[3]) >= 20, item["itemId"]
            assert all(pixel[:3] == (255, 255, 255) for pixel in production.getdata() if pixel[3]), item["itemId"]
            svg = ET.fromstring((ROOT / item["files"][0]).read_text(encoding="utf-8"))
            assert svg.find("{http://www.w3.org/2000/svg}rect").attrib["fill"] == "var(--icon-fill, #fff)"
            href = svg.find(".//{http://www.w3.org/2000/svg}image").attrib["href"]
            assert href.startswith("data:image/webp;base64,"), item["itemId"]
            with Image.open(io.BytesIO(base64.b64decode(href.split(",", 1)[1]))) as embedded:
                assert embedded.format == "WEBP" and embedded.convert("RGBA").tobytes() == expected.tobytes(), item["itemId"]
    print(f"Verified {len(installed)} exact-approved WEBP/SVG pairs, source hashes, white masks and margins")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true", help="Validate delivered files without changing the queue")
    parser.add_argument("--snapshot", default="reviewed.json", help="Separate immutable decision snapshot for a later review")
    parser.add_argument("--report", default="reviewed-installed.json", help="Separate installation report for that snapshot")
    args = parser.parse_args()
    for filename in (args.snapshot, args.report):
        if Path(filename).name != filename or not filename.endswith(".json"):
            parser.error("Snapshot and report must be JSON filenames in this batch directory")
    if args.check:
        check(args.snapshot, args.report)
        return
    manifest_path, feedback_path = REVIEW / "manifest.json", REVIEW / "feedback.json"
    manifest = read(manifest_path)
    feedback_bytes = feedback_path.read_bytes()
    feedback = json.loads(feedback_bytes)["items"]
    snapshot_path = HERE / args.snapshot
    if not snapshot_path.exists():
        active = []
        for item in manifest["items"]:
            if item.get("status") == "resolved":
                continue
            saved = feedback.get(item["id"], {})
            selected = next((candidate for candidate in item["candidates"]
                             if candidate["id"] == saved.get("candidateId")), None)
            active.append({"id": item["id"], "name": item["name"], "tier": item["tier"],
                           "decision": saved.get("decision"), "candidateId": saved.get("candidateId"),
                           "selectedSource": selected["src"] if selected else None,
                           "target": item.get("target"), "catalogKey": item.get("catalogKey"),
                           "notes": saved.get("notes", ""), "context": item["context"],
                           "request": item["request"], "feedback": saved})
        write(snapshot_path, {"date": "2026-10-12", "batch": 64, "title": manifest["title"],
                              "feedbackBeforeSha256": hashlib.sha256(feedback_bytes).hexdigest(), "active": active})
    delivered = install(args.snapshot, args.report)
    assert feedback_path.read_bytes() == feedback_bytes, "Saved GM feedback changed during installation"
    by_id = {item["id"]: item for item in manifest["items"]}
    for item in delivered:
        by_id[item["itemId"]]["status"] = "resolved"
        by_id[item["itemId"]]["target"] = item["files"][0]
    remaining = [item for item in manifest["items"] if item.get("status") != "resolved"]
    revisions = sum(feedback.get(item["id"], {}).get("decision") == "revise" for item in remaining)
    manifest["title"] = f"Batch 64 · {revisions} revisions, {len(remaining) - revisions} pending"
    manifest["updated"] = "2026-10-12"
    write(manifest_path, manifest)
    write(HERE / "remaining-items.json", {"title": manifest["title"], "updated": manifest["updated"], "items": remaining})
    assert feedback_path.read_bytes() == feedback_bytes, "Saved GM feedback changed"
    print(f"Retained {revisions} revision requests and {len(remaining) - revisions} pending cards; feedback bytes unchanged")
    check(args.snapshot, args.report)


if __name__ == "__main__":
    main()
