"""Split an evenly spaced image atlas into row-major cells."""
import argparse
from pathlib import Path
from PIL import Image


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--output-dir", required=True, type=Path)
    parser.add_argument("--rows", required=True, type=int)
    parser.add_argument("--columns", required=True, type=int)
    parser.add_argument("--names", required=True, help="Comma-separated row-major filenames without extension")
    args = parser.parse_args()
    names = [name.strip() for name in args.names.split(",") if name.strip()]
    if len(names) != args.rows * args.columns:
        raise SystemExit(f"Expected {args.rows * args.columns} names, got {len(names)}")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    with Image.open(args.input) as source:
        source = source.convert("RGBA")
        x_edges = [round(i * source.width / args.columns) for i in range(args.columns + 1)]
        y_edges = [round(i * source.height / args.rows) for i in range(args.rows + 1)]
        for index, name in enumerate(names):
            row, column = divmod(index, args.columns)
            cell = source.crop((x_edges[column], y_edges[row], x_edges[column + 1], y_edges[row + 1]))
            target = args.output_dir / f"{name}.png"
            cell.save(target, "PNG", optimize=True)
            print(target)


if __name__ == "__main__":
    main()
