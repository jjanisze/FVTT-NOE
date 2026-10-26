"""Crop, resize and convert the GM's edited PNG sources; never generate artwork."""
from __future__ import annotations

import argparse
import json
from pathlib import Path

from PIL import Image, ImageOps

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]


def specs() -> list[dict]:
    return json.loads((HERE / "catalog.json").read_text(encoding="utf-8"))["assets"]


def prepare(source: Image.Image, spec: dict) -> Image.Image:
    """Preserve authored pixels and alpha; only framing and scale may change."""
    image = ImageOps.exif_transpose(source).convert("RGBA")
    alpha = image.getchannel("A")
    low, high = alpha.getextrema()
    if spec["kind"] in ("banner", "portrait"):
        if low != 255:
            raise ValueError("UI artwork must be opaque; flatten the edited source first")
        return ImageOps.fit(image.convert("RGB"), tuple(spec["size"]), Image.Resampling.LANCZOS)
    if low != 0 or high == 0:
        raise ValueError("token/object source needs real transparency and visible content")
    bounds = alpha.getbbox()
    if spec["kind"] == "object":
        image = image.crop(bounds)
        long_side = spec["size"][0]
        ratio = long_side / max(image.size)
        size = tuple(max(1, round(edge * ratio)) for edge in image.size)
        return image.resize(size, Image.Resampling.LANCZOS)
    # Tokens retain authored frame fill; trimming would make a Small wreck look Medium.
    cropped = ImageOps.fit(image, tuple(spec["size"]), Image.Resampling.LANCZOS)
    border = [cropped.crop(box).getchannel("A").getextrema()[1] for box in (
        (0, 0, cropped.width, 1), (0, cropped.height - 1, cropped.width, cropped.height),
        (0, 0, 1, cropped.height), (cropped.width - 1, 0, cropped.width, cropped.height),
    )]
    # Use the same visible-alpha threshold as validate(); generated cutouts can carry 1/255 noise.
    if any(value > 8 for value in border):
        raise ValueError("token crop touches the frame; hand-edit clear transparent margins")
    if not cropped.getchannel("A").getbbox():
        raise ValueError("the centered crop contains no token; move the subject before packaging")
    return cropped


def validate(path: Path, spec: dict) -> dict:
    with Image.open(path) as image:
        if image.format != "WEBP":
            raise ValueError(f"{path}: expected WEBP")
        if spec["kind"] == "object":
            if max(image.size) != spec["size"][0]:
                raise ValueError(f"{path}: incorrect object long side")
        elif image.size != tuple(spec["size"]):
            raise ValueError(f"{path}: expected {spec['size']}, got {image.size}")
        if spec["kind"] in ("banner", "portrait"):
            if "A" in image.getbands():
                raise ValueError(f"{path}: UI artwork must have no alpha channel")
        elif "A" not in image.getbands() or image.getchannel("A").getextrema()[0] != 0:
            raise ValueError(f"{path}: missing genuine alpha")
        else:
            alpha = image.getchannel("A")
            bounds = alpha.point(lambda value: 255 if value > 8 else 0).getbbox()
            if not bounds:
                raise ValueError(f"{path}: empty alpha")
            if spec["kind"] == "token":
                if min(bounds[0], bounds[1], image.width - bounds[2], image.height - bounds[3]) < 1:
                    raise ValueError(f"{path}: token touches the frame")
                fill = max(bounds[2] - bounds[0], bounds[3] - bounds[1]) / max(image.size) * 100
                if abs(fill - spec["fill"]) > 8:
                    print(f"Review frame fill for {spec['id']}: {fill:.1f}% (brief: {spec['fill']}%)")
        return {"asset": spec["id"], "file": spec["output"], "width": image.width,
                "height": image.height, "mode": image.mode, "bytes": path.stat().st_size}


def convert(source: Path, destination: Path, spec: dict) -> dict:
    with Image.open(source) as image:
        if image.format != "PNG":
            raise ValueError("source drop must be a PNG")
        result = prepare(image, spec)
        if spec["kind"] != "object" and max(spec["size"]) > max(image.size):
            print(f"Upscaling {spec['id']}; resizing cannot add detail")
    destination.parent.mkdir(parents=True, exist_ok=True)
    quality = 85 if spec["kind"] in ("banner", "portrait") else 92
    result.save(destination, "WEBP", quality=quality, method=6, exact=True)
    report = validate(destination, spec)
    if spec["kind"] in ("banner", "portrait") and report["bytes"] > 150 * 1024:
        print(f"Review image budget for {spec['id']}: {report['bytes']} bytes (target 100–150 KB)")
    return report


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--asset", action="append", help="Exact set/key; repeat to select several")
    parser.add_argument("--list", action="store_true", help="Show source and final paths")
    parser.add_argument("--check", action="store_true", help="Validate existing outputs without writing")
    args = parser.parse_args()
    assets = specs()
    if args.asset:
        unknown = set(args.asset) - {entry["id"] for entry in assets}
        if unknown:
            parser.error(f"unknown asset: {', '.join(sorted(unknown))}")
        assets = [entry for entry in assets if entry["id"] in args.asset]
    processed = []
    absent = []
    for spec in assets:
        source = HERE / "in" / spec["set"] / f"{spec['key']}.png"
        destination = ROOT / spec["output"]
        if args.list:
            print(f"{spec['id']}: {source.relative_to(ROOT).as_posix()} -> {spec['output']}")
            continue
        path = destination if args.check else source
        if not path.is_file():
            if args.asset:
                parser.error(f"missing {'output' if args.check else 'edited source'}: {spec['id']}")
            absent.append(spec["id"])
            continue
        try:
            report = validate(destination, spec) if args.check else convert(source, destination, spec)
        except ValueError as error:
            parser.exit(1, f"{spec['id']}: {error}\n")
        processed.append(report)
    if not args.list:
        print(json.dumps({"checked" if args.check else "packaged": processed,
                          "awaiting_output" if args.check else "awaiting_source": absent}, indent=2))


if __name__ == "__main__":
    main()
