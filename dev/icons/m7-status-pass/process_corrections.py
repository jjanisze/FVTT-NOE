"""Prepare two targeted generated replacements, retaining the first pass."""
import hashlib
import importlib.util
import json
import shutil
import sys
from pathlib import Path
from PIL import Image

sys.dont_write_bytecode = True
ROOT = Path(__file__).resolve().parents[3]
FOLDER = ROOT / "dev/icons/review/candidates/batch-121"
spec = importlib.util.spec_from_file_location("m7_atlas", ROOT/"dev/icons/placeholder-pass/process.py")
process = importlib.util.module_from_spec(spec)
spec.loader.exec_module(process)

def main():
    correction = json.loads((FOLDER/"correction-prompt.json").read_text(encoding="utf-8"))
    raw = FOLDER/"raw/correction-atlas-a.png"
    archive = FOLDER/"raw/first-pass"
    archive.mkdir(exist_ok=True)
    for subject in correction["subjects"]:
        for ext in (".png", ".webp", ".svg"):
            source = FOLDER/(subject["key"]+ext)
            target = archive/source.name
            if not target.exists():
                shutil.copyfile(source, target)
    with Image.open(raw) as atlas:
        cells, _ = process.split_components(atlas, expected_cells=2)
        records = []
        for subject, image in zip(correction["subjects"], cells):
            output = f"raw/standalone-{subject['key']}.png"
            image.crop(image.getchannel("A").getbbox()).save(FOLDER/output)
            records.append(dict(key=subject["key"], reference=correction["reference"],
                prompt=correction["prompt"], output=output, sourceAtlas="raw/correction-atlas-a.png",
                cell=subject["cell"], reason=subject["reason"]))
    prompt_file = FOLDER/"prompts.json"
    prompts = json.loads(prompt_file.read_text(encoding="utf-8"))
    prompts["targetedCorrections"] = records
    prompt_file.write_text(json.dumps(prompts, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
    print("Prepared two generated corrections; first-pass glyphs retained.")

if __name__ == "__main__":
    main()
