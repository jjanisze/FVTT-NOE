"""Finish engine · raster stage (PLAN_m9_style.md §7.3).

Called by ``build-finish.mjs`` with a job file; prints one JSON document with a result per job.
Never run by hand and never touches sources: white masters and art masters are read-only.

Recipes
    icon / character   source-coloured ground with rounded corners + glyph in the source's glyph colour
    icon / equipment   glyph in the equipment family colour, transparent ground
    icon / operation   glyph in the theme foreground, transparent ground
    banner             crop → uniform scale → optional archival tone; lossy WEBP

Determinism: fixed export parameters; down-scaling is Lanczos on premultiplied alpha.
Results are compared by decoded pixels (sha256 of mode, size and raw bytes), never by file bytes.
"""
from __future__ import annotations

import base64
import hashlib
import io
import json
import re
import sys
from pathlib import Path

import PIL
from PIL import Image, ImageChops, ImageDraw, ImageOps, features

LANCZOS = Image.Resampling.LANCZOS
SUPERSAMPLE = 4
ALPHA_INK = 16  # alpha above this counts as drawn when measuring margins


def pixel_sha(image: Image.Image) -> str:
    digest = hashlib.sha256()
    digest.update(f"{image.mode}|{image.width}x{image.height}|".encode())
    digest.update(image.tobytes())
    return digest.hexdigest()


def file_sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rgb(value: str) -> tuple[int, int, int]:
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def luminance(color: tuple[int, int, int]) -> float:
    def channel(c: float) -> float:
        c /= 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = (channel(c) for c in color)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a: tuple[int, int, int], b: tuple[int, int, int]) -> float:
    hi, lo = sorted((luminance(a), luminance(b)), reverse=True)
    return (hi + 0.05) / (lo + 0.05)


def load_master(path: Path) -> Image.Image:
    """A white master: a raster file, or the raster a theme-aware SVG wrapper embeds as its mask."""
    if path.suffix.lower() == ".svg":
        match = re.search(r"data:image/\w+;base64,([A-Za-z0-9+/=]+)", path.read_text(encoding="utf-8", errors="ignore"))
        if not match:
            raise ValueError("SVG bez osadzonej maski rastrowej — brak białego mastera")
        return Image.open(io.BytesIO(base64.b64decode(match.group(1)))).convert("RGBA")
    return Image.open(path).convert("RGBA")


def rounded_mask(size: int, radius: float) -> Image.Image:
    big = size * SUPERSAMPLE
    mask = Image.new("L", (big, big), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, big - 1, big - 1), radius=radius * SUPERSAMPLE, fill=255)
    return mask.resize((size, size), LANCZOS)


def apply_optical(alpha: Image.Image, optical: dict | None) -> Image.Image:
    """An approved optical correction: uniform scale about the centre and a pixel offset."""
    if not optical:
        return alpha
    size = alpha.width
    scale = float(optical.get("scale", 1))
    dx, dy = float(optical.get("dx", 0)), float(optical.get("dy", 0))
    scaled = alpha.resize((round(size * scale), round(size * scale)), LANCZOS) if scale != 1 else alpha
    out = Image.new("L", (size, size), 0)
    out.paste(scaled, (round((size - scaled.width) / 2 + dx), round((size - scaled.height) / 2 + dy)))
    return out


def margins(alpha: Image.Image) -> dict:
    box = alpha.point(lambda v: 255 if v > ALPHA_INK else 0).getbbox()
    if not box:
        return {"empty": True}
    left, top, right, bottom = box
    return {"left": left, "top": top, "right": alpha.width - right, "bottom": alpha.height - bottom}


def render_icon(job: dict, root: Path) -> tuple[Image.Image, dict]:
    master = load_master(root / job["source"])
    recipe = job["recipe"]
    checks: dict = {"masterSize": list(master.size)}
    if master.width != master.height:
        raise ValueError(f"master nie jest kwadratem: {master.size}")
    red, green, blue, alpha = master.split()
    inked = alpha.point(lambda v: 255 if v > ALPHA_INK else 0)
    # A white master is white wherever it is drawn; anything else was never approved as a glyph.
    darkest = min(ImageChops.lighter(band, ImageOps.invert(inked)).getextrema()[0] for band in (red, green, blue))
    checks["masterWhite"] = darkest >= 250
    alpha = apply_optical(alpha, job.get("optical"))
    checks["margins"] = margins(alpha)
    checks["clipped"] = not checks["margins"].get("empty") and min(checks["margins"].values()) == 0
    checks["coverage"] = round(sum(alpha.getdata()) / (255 * alpha.width * alpha.height), 4)

    size = master.width
    glyph = rgb(recipe["glyph"])
    if recipe["role"] == "character":
        ground = rgb(recipe["ground"])
        checks["contrast"] = round(contrast(glyph, ground), 2)
        canvas = Image.new("RGB", (size, size), ground)
        canvas.paste(Image.new("RGB", (size, size), glyph), (0, 0), alpha)
        image = canvas.convert("RGBA")
        image.putalpha(rounded_mask(size, size * recipe["radiusRatio"]))
    else:
        image = Image.new("RGBA", (size, size), glyph + (0,))
        image.putalpha(alpha)

    target = int(job["size"])
    if target != size:
        image = image.convert("RGBa").resize((target, target), LANCZOS).convert("RGBA")
    # Fully transparent pixels carry no colour: normalise them so the pixel hash is stable.
    clear = image.getchannel("A").point(lambda v: 255 if v == 0 else 0)
    image.paste((0, 0, 0, 0), (0, 0), clear)
    checks["alphaRange"] = list(image.getchannel("A").getextrema())
    return image, checks


def ramp_mask(size: tuple[int, int], left: float, right: float, start: float, span: float) -> Image.Image:
    line = Image.new("L", (size[0], 1))
    line.putdata([round(255 * (left + (right - left) * max(0.0, min(1.0, (x / size[0] - start) / span)))) for x in range(size[0])])
    return line.resize(size)


def render_banner(job: dict, root: Path) -> tuple[Image.Image, dict]:
    recipe = job["recipe"]
    image = Image.open(root / job["source"]).convert("RGB")
    checks: dict = {"masterSize": list(image.size)}
    if recipe.get("crop"):
        image = image.crop(tuple(recipe["crop"]))
    tone = recipe.get("tone")
    if tone:
        # Archival sources: grayscale, optional inversion, graphite tint and a horizontal fade.
        # Geometry is untouched — crop and uniform scale only.
        frame = tuple(tone["frame"])
        gray = ImageOps.fit(ImageOps.grayscale(image), frame, method=LANCZOS)
        if tone.get("invert"):
            gray = ImageOps.invert(gray)
        base = rgb(tone["base"])
        tinted = ImageOps.colorize(gray, base, rgb(tone["color"]))
        image = Image.new("RGB", frame, base)
        image.paste(tinted, (0, 0), ramp_mask(frame, tone["strengthLeft"], tone["strengthRight"], tone.get("rampStart", 0.28), tone.get("rampSpan", 0.62)))
    width = int(recipe["width"])
    if width > image.width:
        raise ValueError(f"baner szerszy niż kadr mastera ({width} > {image.width}) — bez powiększania")
    if width != image.width:
        image = image.resize((width, round(image.height * width / image.width)), LANCZOS)
    checks["aspect"] = round(image.width / image.height, 4)
    checks["meanLuma"] = round(sum(ImageOps.grayscale(image).resize((64, 64)).getdata()) / 4096 / 255, 4)
    return image, checks


def save(image: Image.Image, job: dict, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if job["kind"] == "icon":
        image.save(path, "WEBP", lossless=True, quality=100, method=6, exact=True)
    else:
        image.save(path, "WEBP", quality=int(job["recipe"]["quality"]), method=6)


def run(job: dict, root: Path, mode: str) -> dict:
    out = root / job["output"]
    result: dict = {"id": job["id"], "kind": job["kind"], "output": job["output"]}
    try:
        result["sourceSha256"] = file_sha(root / job["source"])
        lossless = job["kind"] == "icon"
        existing = None
        if out.exists():
            with Image.open(out) as handle:
                existing = handle.convert("RGBA" if lossless else "RGB")
            result["filePixelSha256"] = pixel_sha(existing)
            result["bytes"] = out.stat().st_size
        # A lossy file is only re-encoded when asked to write: the encoder may differ between
        # libwebp builds, so "check" trusts the recorded hashes of source, recipe and pixels.
        # An up-to-date lossy output (same source, same recipe, same pixels as recorded) is left alone.
        fresh = not lossless and job.get("currentPixels") and job["currentPixels"] == result.get("filePixelSha256")
        if fresh:
            result["pixelSha256"] = result["filePixelSha256"]
            result["size"] = list(existing.size)
        elif lossless or mode == "write":
            image, checks = render_icon(job, root) if lossless else render_banner(job, root)
            result["checks"] = checks
            result["size"] = list(image.size)
            if lossless:
                result["pixelSha256"] = pixel_sha(image)
            if lossless and job.get("approvedPixels") and result["pixelSha256"] != job["approvedPixels"]:
                raise ValueError("rendered pixels differ from the approved finish")
            if mode == "write" and (not lossless or result.get("filePixelSha256") != result["pixelSha256"]):
                save(image, job, out)
                with Image.open(out) as handle:
                    written = handle.convert("RGBA" if lossless else "RGB")
                result["filePixelSha256"] = pixel_sha(written)
                result["bytes"] = out.stat().st_size
                result["written"] = True
                if lossless and result["filePixelSha256"] != result["pixelSha256"]:
                    raise ValueError("zapis bezstratny zmienił piksele")
            if not lossless:
                result["pixelSha256"] = result["filePixelSha256"]
            if mode == "preview":
                buffer = io.BytesIO()
                image.save(buffer, "PNG")
                result["png"] = base64.b64encode(buffer.getvalue()).decode()
        elif existing is not None:
            result["size"] = list(existing.size)
    except Exception as error:  # reported per job; the orchestrator decides the exit code
        result["error"] = f"{type(error).__name__}: {error}"
    return result


def main() -> int:
    spec = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))
    root = Path(spec["root"])
    results = [run(job, root, spec["mode"]) for job in spec["jobs"]]
    json.dump({"pillow": PIL.__version__, "libwebp": features.version("webp"), "results": results}, sys.stdout)
    return 0


if __name__ == "__main__":
    sys.exit(main())
