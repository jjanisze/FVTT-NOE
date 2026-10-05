"""Pack approved bitmap files and rebuild the streamed scenery manifest from catalog.json."""
import argparse
import json
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
DEST = ROOT / "ui/poscig/themes/pustynia"
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--catalog", type=Path, default=Path(__file__).with_name("catalog.json"))
parser.add_argument("--source-dir", type=Path, help="Optional folder of approved <asset-id>.png/.webp files")
parser.add_argument("--dest", type=Path, default=DEST, help="Destination theme folder")
preliminary, _ = parser.parse_known_args()
catalog = json.loads(preliminary.catalog.read_text(encoding="utf8"))
for key in catalog["assets"]:
    parser.add_argument(f"--{key}", type=Path, help="Optional original generated output to convert")
args = parser.parse_args()
DEST = args.dest
DEST.mkdir(parents=True, exist_ok=True)
manifest = {"version":3, "cameraDegrees":catalog["cameraDegrees"], "generator":catalog["generator"],
            "regions":catalog.get("regions", ["open", "foothills", "mesas", "broken"]),
            "images":{}, "groups":catalog["groups"], "props":{}}
for key, asset in catalog["assets"].items():
    target = DEST / asset["file"]
    source = getattr(args, key.replace("-", "_"))
    if source is None and args.source_dir:
        source = next((args.source_dir / f"{key}{ext}" for ext in [".png", ".webp"]
                       if (args.source_dir / f"{key}{ext}").exists()), None)
    source = source or target
    with Image.open(source) as im:
        sprites = asset.get("sprites", [])
        if sprites:
            assert im.mode == "RGBA" and im.getchannel("A").getextrema()[0] == 0, f"Real alpha required: {key}"
        # Canonical WEBPs are inspected without another lossy encoding pass.
        if source.resolve() != target.resolve():
            im.save(target, "WEBP", quality=96, method=6, exact=True)
        entry = {"file":asset["file"], "width":im.width, "height":im.height, "role":asset["role"]}
        if sprites:
            entry["frames"] = {}
            for sprite in sprites:
                name = sprite["name"]
                u, v, right, bottom = sprite["region"]
                x, y, r, b = round(u*im.width), round(v*im.height), round(right*im.width), round(bottom*im.height)
                alpha = im.crop((x, y, r, b)).getchannel("A")
                bounds = alpha.point(lambda a: 255 if a > 8 else 0).getbbox()
                assert bounds, f"Empty sprite: {name}"
                l, t, rr, bb = bounds
                l, t, rr, bb = max(0,l-3), max(0,t-3), min(r-x,rr+3), min(b-y,bb+3)
                entry["frames"][name] = [x+l,y+t,rr-l,bb-t]
                manifest["props"][name] = {"atlas":key, "frame":name, "height":sprite["height"],
                                           "crop":sprite["crop"], "alpha":sprite["alpha"]}
        manifest["images"][key] = entry
# Broken catalog references fail during packing, before any player downloads artwork.
for key in manifest["groups"]["roads"]:
    assert manifest["images"][key]["role"] == "road", key
for names in manifest["groups"]["landscapes"].values():
    for key in names:
        assert manifest["images"][key]["role"] == "hill", key
for group in ["plants", "structures", "decals", "dust"]:
    for key in manifest["groups"][group]:
        assert key in manifest["props"], key
(DEST / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf8")
print(json.dumps({"assets":len(manifest["images"]),
                  "foreground":len(manifest["groups"]["plants"])+len(manifest["groups"]["structures"]),
                  "bytes":sum(p.stat().st_size for p in DEST.glob("*.webp"))}))
