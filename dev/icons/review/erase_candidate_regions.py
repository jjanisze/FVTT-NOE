"""Erase rectangular regions from an RGBA candidate mask."""
import argparse
from pathlib import Path

from PIL import Image


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument(
        "--region",
        required=True,
        action="append",
        help="Rectangle as x1,y1,x2,y2; repeat for multiple regions",
    )
    args = parser.parse_args()
    image = Image.open(args.input).convert("RGBA")
    alpha = image.getchannel("A")
    for encoded in args.region:
        region = tuple(map(int, encoded.split(",")))
        if len(region) != 4:
            raise SystemExit(f"Invalid region: {encoded}")
        alpha.paste(0, region)
    image.putalpha(alpha)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    image.save(args.output, "PNG", optimize=True)


if __name__ == "__main__":
    main()
