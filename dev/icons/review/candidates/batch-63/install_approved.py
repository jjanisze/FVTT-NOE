"""Install only exact saved GM approvals as WEBP/SVG; no code, pack or world changes."""
import hashlib
import importlib.util
import json
import subprocess
import sys
from pathlib import Path
from PIL import Image

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
REVIEW = HERE.parents[1]
ROOT = HERE.parents[4]
helper = importlib.util.spec_from_file_location("batch62_masks", HERE.parent / "batch-62" / "process_batch.py")
module = importlib.util.module_from_spec(helper)
helper.loader.exec_module(module)


def target_for(item):
    if item.get("target"):
        return item["target"]
    if item["id"] == "batch59-karabin-laserowy":
        return "icons/weapons/karabin_laserowy.svg"
    return "icons/abilities/" + item["id"].split("-", 1)[1] + ".svg"


def main():
    decisions = json.loads((HERE / "decisions.json").read_text(encoding="utf-8"))["active"]
    current = json.loads((REVIEW / "feedback.json").read_text(encoding="utf-8"))["items"]
    approved = [item for item in decisions if item["decision"] == "approve"]
    prepared = []
    # Validate the entire set before changing any production file.
    for item in approved:
        saved = current.get(item["id"], {})
        if saved.get("decision") != "approve" or saved.get("candidateId") != item["candidateId"]:
            raise ValueError(f"GM decision changed: {item['id']}; take a fresh snapshot")
        destination = ROOT / target_for(item)
        if not destination.is_relative_to(ROOT / "icons"):
            raise ValueError("destination escapes the icon tree")
        with Image.open(REVIEW / item["selectedSource"]) as image:
            icon = image.convert("RGBA")
        if icon.size != (256, 256) or not icon.getchannel("A").getbbox():
            raise ValueError(f"invalid review image: {item['id']}")
        if any(pixel[:3] != (255, 255, 255) for pixel in icon.getdata() if pixel[3]):
            raise ValueError(f"review glyph is not pure white: {item['id']}")
        svg = module.svg_mask(destination.stem, icon)
        status = subprocess.run(["git", "status", "--porcelain", "--", str(destination.relative_to(ROOT)),
                                 str(destination.with_suffix(".webp").relative_to(ROOT))],
                                cwd=ROOT, check=True, capture_output=True, text=True).stdout
        if status and not (destination.is_file() and destination.read_text(encoding="utf-8") == svg):
            raise ValueError(f"production target has other working changes: {item['id']}")
        prepared.append((item, destination, icon, svg))
    report = []
    for item, destination, icon, svg in prepared:
        destination.parent.mkdir(parents=True, exist_ok=True)
        bitmap = destination.with_suffix(".webp")
        icon.save(bitmap, "WEBP", lossless=True, exact=True, method=6)
        destination.write_text(svg, encoding="utf-8")
        with Image.open(bitmap) as encoded:
            if encoded.convert("RGBA").tobytes() != icon.tobytes():
                raise ValueError(f"WEBP conversion changed pixels: {item['id']}")
        report.append({"itemId": item["id"], "name": item["name"], "candidateId": item["candidateId"],
                       "source": item["selectedSource"], "files": [str(destination.relative_to(ROOT)).replace("\\", "/"),
                       str(bitmap.relative_to(ROOT)).replace("\\", "/")],
                       "sourceSha256": hashlib.sha256((REVIEW / item["selectedSource"]).read_bytes()).hexdigest(),
                       "webpSha256": hashlib.sha256(bitmap.read_bytes()).hexdigest()})
    (HERE / "installed.json").write_text(json.dumps({"date": "2026-10-12", "installed": report},
                                                  ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print(f"Installed {len(report)} exact-approved WEBP/SVG pairs; packs and world untouched")


if __name__ == "__main__":
    main()
