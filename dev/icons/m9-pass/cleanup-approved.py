"""Prepare the cleanup reference; apply the GM's explicitly authorized two-pixel fallback."""
import argparse
import base64
import hashlib
import io
import json
import shutil
import subprocess
import sys
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[3]
HERE = ROOT / "dev/icons/review/candidates/batch-127"
sys.path.insert(0, str(ROOT / "dev/finish"))
from raster import load_master, pixel_sha


def sha(file):
    return hashlib.sha256(file.read_bytes()).hexdigest()


def write(file, data):
    file.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--reference", action="store_true")
    parser.add_argument("--fallback", action="store_true")
    parser.add_argument("--model", action="store_true")
    parser.add_argument("--install", action="store_true")
    args = parser.parse_args()
    batch = json.loads((HERE / "batch.json").read_text(encoding="utf-8"))
    if args.model:
        assert not (HERE / "cleanup.json").exists(), "Cleanup already prepared"
        subprocess.run([sys.executable, str(ROOT / "dev/icons/placeholder-pass/process.py"), "--batch=127"], cwd=ROOT, check=True)
        validated = json.loads((HERE / "validated.json").read_text(encoding="utf-8"))
        assert validated["validatedMasks"] == len(batch["subjects"]) == 5
        records = []
        for subject in batch["subjects"]:
            key = subject["key"]
            assert sha(HERE / f"{key}.png") == validated["candidateHashes"][key]
            records.append({"key": key, "method": "OpenAI built-in targeted frame cleanup, existing pipeline normalization",
                "source": subject["master"], "sourceSha256": sha(ROOT / subject["master"]),
                "outputPixelSha256": pixel_sha(Image.open(HERE / f"{key}.webp").convert("RGBA")),
                "webpSha256": sha(HERE / f"{key}.webp"), "svgSha256": sha(HERE / f"{key}.svg")})
        write(HERE / "cleanup.json", {"batch": 127, "method": "GM-requested OpenAI image cleanup", "subjects": records})
    if args.reference:
        atlas = Image.new("RGB", (900, 900), "black")
        for i, subject in enumerate(batch["subjects"]):
            source = load_master(ROOT / subject["master"])
            assert source.size == (256, 256)
            atlas.paste(source, ((i % 3) * 300 + 22, (i // 3) * 300 + 22), source)
        atlas.save(HERE / "raw/cleanup-target.png")
        print("Prepared five existing masks in their original 256 px canvases.")
    if args.fallback:
        assert (HERE / "generation-status.json").is_file(), "Record the image-service result before using the conditional fallback"
        assert not (HERE / "cleanup.json").exists(), "Cleanup already prepared"
        receipt = []
        before_after = Image.new("RGBA", (650, len(batch["subjects"]) * 108), "#191e23")
        draw = ImageDraw.Draw(before_after)
        for i, subject in enumerate(batch["subjects"]):
            for file in subject["deliveryTargets"]:
                assert sha(ROOT / file["source"]) == file["sourceSha256"], "Source changed after the GM's approval"
            source = load_master(ROOT / subject["master"])
            assert source.size == (256, 256)
            cropped = source.crop((2, 2, 254, 254))
            resized = cropped.convert("RGBa").resize((256, 256), Image.Resampling.LANCZOS).convert("RGBA")
            result = Image.new("RGBA", (256, 256), "white")
            result.putalpha(resized.getchannel("A"))
            assert result.getchannel("A").getbbox(), "Cleanup produced an empty glyph"
            key = subject["key"]
            result.save(HERE / f"{key}.png", "PNG", optimize=True)
            result.save(HERE / f"{key}.webp", "WEBP", lossless=True, exact=True, method=6)
            encoded = base64.b64encode((HERE / f"{key}.webp").read_bytes()).decode("ascii")
            svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256"><defs><mask id="{key}-mask"><image width="256" height="256" href="data:image/webp;base64,{encoded}"/></mask></defs><rect width="256" height="256" fill="var(--icon-fill, #fff)" mask="url(#{key}-mask)"/></svg>\n'
            (HERE / f"{key}.svg").write_text(svg, encoding="utf-8")
            assert load_master(HERE / f"{key}.svg").tobytes() == result.tobytes()
            assert Image.open(HERE / f"{key}.webp").convert("RGBA").tobytes() == result.tobytes()
            draw.text((8, i * 108 + 5), key, fill="white")
            for j, image in enumerate((source, result)):
                for size, dx in [(64, 0), (44, 80), (32, 140), (16, 190)]:
                    thumb = image.convert("RGBa").resize((size, size), Image.Resampling.LANCZOS).convert("RGBA")
                    before_after.alpha_composite(thumb, (12 + j * 320 + dx, i * 108 + 26 + (64 - size) // 2))
            receipt.append({"key": key, "method": "crop (2,2,254,254), premultiplied-alpha Lanczos resize to 256x256, preserve white mask",
                "source": subject["master"], "sourceSha256": sha(ROOT / subject["master"]), "outputPixelSha256": pixel_sha(result),
                "webpSha256": sha(HERE / f"{key}.webp"), "svgSha256": sha(HERE / f"{key}.svg")})
        before_after.save(HERE / "raw/before-after.webp", "WEBP", lossless=True, exact=True, method=6)
        write(HERE / "cleanup.json", {"batch": 127, "method": "GM-authorized fallback after image-service rejection", "subjects": receipt})
        print("Prepared five exact two-pixel border trims; SVG and WEBP masks match.")
    if args.install:
        delivered = HERE / "installed.json"
        if delivered.exists():
            for record in json.loads(delivered.read_text(encoding="utf-8"))["subjects"]:
                for file in record["files"]:
                    assert sha(ROOT / file["path"]) == file["sha256"]
            print("Five cleanup deliveries verified.")
            return
        cleanup = json.loads((HERE / "cleanup.json").read_text(encoding="utf-8"))
        records = {record["key"]: record for record in cleanup["subjects"]}
        for subject in batch["subjects"]:
            for file in subject["deliveryTargets"]:
                assert sha(ROOT / file["source"]) == file["sourceSha256"], "Source changed before installation"
            record = records[subject["key"]]
            assert sha(HERE / f"{subject['key']}.webp") == record["webpSha256"]
            assert sha(HERE / f"{subject['key']}.svg") == record["svgSha256"]
            png = (ROOT / subject["target"]).with_suffix(".png")
            scan = subprocess.run(["rg", "-l", "-a", "--fixed-strings", "--glob=!LOCK", "--glob=!*.lock", png.relative_to(ROOT).as_posix(),
                "scripts", "templates", "styles", "lang", "packs", "module.json"], cwd=ROOT, capture_output=True, text=True)
            assert scan.returncode == 1, "Legacy PNG still has references, or the scan failed"
        archive_root = HERE / "raw/installed-before"
        assert not archive_root.exists(), "Inspect an incomplete earlier installation"
        archive_root.mkdir()
        installed = []
        for subject in batch["subjects"]:
            archives = []
            for file in subject["deliveryTargets"]:
                source = ROOT / file["source"]
                archive = archive_root / source.name
                shutil.copyfile(source, archive)
                archives.append({"path": archive.relative_to(ROOT).as_posix(), "sha256": sha(archive)})
            target = (ROOT / subject["target"]).resolve()
            assert target.is_relative_to((ROOT / "icons/items/drugs").resolve())
            files = []
            for extension in (".svg", ".webp"):
                destination = target.with_suffix(extension)
                shutil.copyfile(HERE / f"{subject['key']}{extension}", destination)
                files.append({"path": destination.relative_to(ROOT).as_posix(), "sha256": sha(destination)})
            if target.with_suffix(".png").exists():
                target.with_suffix(".png").unlink()
            installed.append({"key": subject["key"], "wrapper": subject["target"], "files": files, "archived": archives})
        write(delivered, {"date": "2026-11-17", "batch": 127, "authorization": batch["authorization"], "subjects": installed})
        print("Installed five authorized source cleanups and archived the originals.")


if __name__ == "__main__":
    main()
