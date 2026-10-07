"""Normalize one generated white glyph for review without touching shipped assets."""
import argparse
import io
import base64
from pathlib import Path
from PIL import Image, ImageOps, ImageChops


def alpha_mask(image):
    rgba = image.convert("RGBA")
    luminance = ImageOps.grayscale(rgba.convert("RGB"))
    source_alpha = rgba.getchannel("A")
    mask = ImageChops.multiply(luminance, source_alpha)
    # Suppress faint generator noise while retaining antialiased edges.
    return mask.point(lambda p: 0 if p < 24 else min(255, round((p - 24) * 255 / 231)))


def save_svg(image, output):
    buffer = io.BytesIO()
    image.save(buffer, "PNG", optimize=True)
    encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
    mask_id = output.stem.replace("_", "-") + "-mask"
    output.write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256">\n'
        f'  <defs><mask id="{mask_id}"><image href="data:image/png;base64,{encoded}" '
        f'width="256" height="256" /></mask></defs>\n'
        f'  <rect width="256" height="256" fill="var(--icon-fill, #fff)" '
        f'mask="url(#{mask_id})" />\n</svg>\n', encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path, help="Destination PNG")
    parser.add_argument("--safe-area", type=int, default=216)
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(args.input) as source:
        mask = alpha_mask(source)
    box = mask.getbbox()
    if not box:
        raise SystemExit(f"No visible white glyph in {args.input}")
    fitted = ImageOps.contain(mask.crop(box), (args.safe_area, args.safe_area), Image.Resampling.LANCZOS)
    canvas = Image.new("L", (256, 256), 0)
    canvas.paste(fitted, ((256 - fitted.width) // 2, (256 - fitted.height) // 2))
    result = Image.new("RGBA", (256, 256), "white")
    result.putalpha(canvas)
    result.save(args.output, "PNG", optimize=True)
    save_svg(result, args.output.with_suffix(".svg"))
    print(f"Prepared {args.output} and {args.output.with_suffix('.svg')}")


if __name__ == "__main__":
    main()
