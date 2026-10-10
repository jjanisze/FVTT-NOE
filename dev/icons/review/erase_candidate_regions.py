"""Erase rectangular regions from an RGBA candidate mask."""
import argparse
from collections import deque
from pathlib import Path

from PIL import Image


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument(
        "--region",
        action="append",
        help="Rectangle as x1,y1,x2,y2; repeat for multiple regions",
    )
    parser.add_argument("--min-component-area", type=int, default=0)
    args = parser.parse_args()
    image = Image.open(args.input).convert("RGBA")
    alpha = image.getchannel("A")
    for encoded in args.region or []:
        region = tuple(map(int, encoded.split(",")))
        if len(region) != 4:
            raise SystemExit(f"Invalid region: {encoded}")
        alpha.paste(0, region)
    if args.min_component_area:
        pixels = alpha.load()
        visited = set()
        for y in range(alpha.height):
            for x in range(alpha.width):
                if (x, y) in visited or pixels[x, y] < 24:
                    continue
                queue = deque([(x, y)])
                visited.add((x, y))
                component = []
                while queue:
                    point = queue.popleft()
                    component.append(point)
                    px, py = point
                    for neighbor in ((px - 1, py), (px + 1, py), (px, py - 1), (px, py + 1)):
                        nx, ny = neighbor
                        if 0 <= nx < alpha.width and 0 <= ny < alpha.height and neighbor not in visited and pixels[nx, ny] >= 24:
                            visited.add(neighbor)
                            queue.append(neighbor)
                if len(component) < args.min_component_area:
                    for px, py in component:
                        pixels[px, py] = 0
    image.putalpha(alpha)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    image.save(args.output, "PNG", optimize=True)


if __name__ == "__main__":
    main()
