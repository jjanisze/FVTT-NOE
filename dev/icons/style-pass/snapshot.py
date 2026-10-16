"""Freeze browser style flags and exact current art without changing decisions."""
import base64
import io
import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from PIL import Image

sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "placeholder-pass"))
from prepare_70_71 import ROOT, REVIEW, read, write, sha

HERE = ROOT / "dev/icons/style-pass"
NUMBERS = (102, 103, 104, 105)


def bitmap(source):
    if source.suffix == ".svg":
        tree = ET.fromstring(source.read_text(encoding="utf-8"))
        element = tree.find(".//{http://www.w3.org/2000/svg}image")
        href = element.get("href") or element.get("{http://www.w3.org/1999/xlink}href")
        assert href.startswith("data:image/")
        return Image.open(io.BytesIO(base64.b64decode(href.split(",", 1)[1]))).convert("RGBA")
    return Image.open(source).convert("RGBA")


def contact(sources, target):
    canvas = Image.new("RGB", (768, 768), "black")
    for index, source in enumerate(sources):
        image = bitmap(ROOT / source)
        image.thumbnail((256, 256), Image.Resampling.LANCZOS)
        canvas.paste(image, ((index % 3) * 256 + (256 - image.width) // 2,
                            (index // 3) * 256 + (256 - image.height) // 2), image)
    canvas.save(target)


def main():
    style_file = REVIEW / "style-feedback.json"
    before = style_file.read_bytes()
    flags = sorted((v for v in json.loads(before)["items"].values() if v["status"] == "redo"), key=lambda v: v["updatedAt"])
    assert len(flags) == 29 and len({v["source"] for v in flags}) == 29
    assert not (HERE / "incoming-style-feedback.json").exists(), "Snapshot already frozen"
    styles = read(REVIEW / "candidates/batch-96/style-reference.json")["sources"]
    for source in styles:
        assert sha(ROOT / source["source"]) == source["sha256"]
    write(HERE / "incoming-style-feedback.json", {"date": "2026-10-17", "batches": list(NUMBERS), "sourceFileSha256": sha(style_file), "items": flags})
    for index, number in enumerate(NUMBERS):
        here = REVIEW / f"candidates/batch-{number}"
        assert not here.exists(), "Batch already allocated"
        (here / "raw").mkdir(parents=True)
        entries = flags[index * 9:(index + 1) * 9]
        for entry in entries:
            assert sha(ROOT / entry["source"]) == entry["sourceSha256"], "Style source changed"
        contact([entry["source"] for entry in entries], here / "raw/current-reference.png")
        contact([entry["source"] for entry in styles], here / "raw/style-reference.png")
        write(here / "incoming.json", {"date": "2026-10-17", "batch": number, "styleReviews": entries,
              "productionFiles": [{"source": str(file.relative_to(ROOT).as_posix()), "sha256": sha(file)}
                  for entry in entries for extension in (".svg", ".webp", ".png")
                  if (file := (ROOT / entry["source"]).with_suffix(extension)).is_file()]})
        write(here / "style-reference.json", {"role": "Desired broad glyph style only; current-reference supplies exact subjects, not detail level", "sources": styles})
        print(f"Batch {number}: " + ", ".join(Path(entry["source"]).stem for entry in entries))
    assert style_file.read_bytes() == before


if __name__ == "__main__":
    main()
