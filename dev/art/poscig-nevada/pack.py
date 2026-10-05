"""Package image-model artwork; only WEBP conversion and alpha sprite bounds, no drawn art."""
import argparse
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
DEST = ROOT / "ui" / "poscig" / "themes" / "pustynia"
NAMES = {
    "plants": ["joshua", "dead-tree", "cholla", "sagebrush"],
    "structures": ["sign", "pole", "roof", "frame"],
    "dust": ["dust-1", "dust-2", "dust-3", "dust-4"],
}

parser = argparse.ArgumentParser(description=__doc__)
for key in ["ground", "hills", *NAMES]:
    parser.add_argument(f"--{key}", type=Path, required=True)
args = parser.parse_args()
DEST.mkdir(parents=True, exist_ok=True)
manifest = {"cameraDegrees": 45, "generator": "OpenAI built-in image generation", "images": {}}
for key, source in vars(args).items():
    im = Image.open(source)
    if key in NAMES:
        assert im.mode == "RGBA" and im.getchannel("A").getextrema()[0] == 0, "Real alpha required"
    im.save(DEST / f"{key}.webp", "WEBP", quality=96, method=6, exact=True)
    entry = {"file": f"{key}.webp", "width": im.width, "height": im.height}
    if key in NAMES:
        frames = {}
        for i, name in enumerate(NAMES[key]):
            x, y = (i % 2) * (im.width // 2), (i // 2) * (im.height // 2)
            w, h = im.width // 2, im.height // 2
            # Ignore nearly invisible alpha when locating bounds; preserve original alpha pixels.
            alpha = im.crop((x, y, x + w, y + h)).getchannel("A")
            bounds = alpha.point(lambda a: 255 if a > 8 else 0).getbbox()
            assert bounds, name
            left, top, right, bottom = bounds
            left, top = max(0, left - 3), max(0, top - 3)
            right, bottom = min(w, right + 3), min(h, bottom + 3)
            frames[name] = [x + left, y + top, right - left, bottom - top]
        entry["frames"] = frames
    manifest["images"][key] = entry
(DEST / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf8")
print(json.dumps({"assets": manifest, "bytes": sum(p.stat().st_size for p in DEST.glob("*.webp"))}, indent=2))
