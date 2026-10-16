"""Verify every original placeholder target against its saved approved pixels."""
import base64
import io
import xml.etree.ElementTree as ET
from PIL import Image
from prepare_70_71 import ROOT, REVIEW, read, write, sha

roadmap = read(ROOT / "dev/icons/placeholder-pass/roadmap.json")
subjects = [s for batch in roadmap["batches"] for s in batch["subjects"]]
targets = {t["source"] for s in subjects for t in s["deliveryTargets"]}
installed, reports = {}, []
for number in range(69, 102):
    file = REVIEW / f"candidates/batch-{number}/reviewed-installed.json"
    if not file.exists():
        continue
    report = read(file)
    reports.append(file.relative_to(ROOT).as_posix())
    for item in report["installed"]:
        assert item["files"][0] not in installed, "Duplicate delivery"
        installed[item["files"][0]] = item
assert len(subjects) == 153 and len(targets) == 155 and set(installed) == targets
for target, item in installed.items():
    svg, bitmap = (ROOT / name for name in item["files"])
    assert sha(svg) == item["svgSha256"] and sha(bitmap) == item["webpSha256"]
    source = REVIEW / item["source"]
    assert sha(source) == item["sourceSha256"]
    with Image.open(source) as image:
        expected = image.convert("RGBA").tobytes()
    with Image.open(bitmap) as image:
        assert image.format == "WEBP" and image.size == (256, 256) and image.convert("RGBA").tobytes() == expected
    tree = ET.fromstring(svg.read_text(encoding="utf-8"))
    href = tree.find(".//{http://www.w3.org/2000/svg}image").attrib["href"]
    assert href.startswith("data:image/webp;base64,")
    with Image.open(io.BytesIO(base64.b64decode(href.split(",", 1)[1]))) as image:
        assert image.convert("RGBA").tobytes() == expected
assert read(ROOT / "dev/icons/class-placeholder-audit.json")["stats"]["confirmedPlaceholderFiles"] == 0
assert all(c.get("status") == "resolved" for c in read(REVIEW / "manifest.json")["items"])
write(ROOT / "dev/icons/placeholder-pass/completed-2026-10-17.json", {
    "date": "2026-10-17", "subjectsDelivered": 153, "nativeSvgTargetsDelivered": 155,
    "remainingGeneratedPlaceholders": 0, "exactApprovedMasksVerified": 155,
    "svgAndWebpMatchApprovedPixels": True, "roadmapSha256": sha(ROOT / "dev/icons/placeholder-pass/roadmap.json"),
    "reviewReports": reports})
print("Complete: 153/153 subjects, 155/155 exact approved SVG+WEBP masks; zero generated placeholders.")
