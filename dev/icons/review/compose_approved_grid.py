"""Compose the most recently approved review selections into an unlabeled grid."""
import argparse
import json
from datetime import datetime
from pathlib import Path

from PIL import Image, ImageOps


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--answer-key", required=True, type=Path)
    parser.add_argument("--count", type=int, default=25)
    parser.add_argument("--columns", type=int, default=5)
    parser.add_argument("--cell-size", type=int, default=256)
    args = parser.parse_args()

    review_root = Path(__file__).resolve().parent
    manifest = json.loads((review_root / "manifest.json").read_text(encoding="utf-8"))
    feedback = json.loads((review_root / "feedback.json").read_text(encoding="utf-8"))
    by_id = {item["id"]: item for item in manifest["items"]}
    approved = sorted(
        (entry for entry in feedback["items"].values() if entry.get("decision") == "approve"),
        key=lambda entry: datetime.fromisoformat(entry["updatedAt"].replace("Z", "+00:00")),
        reverse=True,
    )[: args.count]
    if len(approved) != args.count:
        raise SystemExit(f"Expected {args.count} approvals, found {len(approved)}")

    rows = (args.count + args.columns - 1) // args.columns
    atlas = Image.new("RGB", (args.columns * args.cell_size, rows * args.cell_size), "black")
    safe = round(args.cell_size * 0.78)
    answer_key = []
    for index, entry in enumerate(approved):
        item = by_id[entry["itemId"]]
        candidate = next(c for c in item["candidates"] if c["id"] == entry["candidateId"])
        source_path = review_root / candidate["src"]
        with Image.open(source_path) as source:
            source = source.convert("RGBA")
            alpha = source.getchannel("A")
            box = alpha.getbbox()
            if not box:
                raise SystemExit(f"Empty approved icon: {source_path}")
            alpha = ImageOps.contain(alpha.crop(box), (safe, safe), Image.Resampling.LANCZOS)
        glyph = Image.new("RGBA", alpha.size, "white")
        glyph.putalpha(alpha)
        row, column = divmod(index, args.columns)
        x = column * args.cell_size + (args.cell_size - glyph.width) // 2
        y = row * args.cell_size + (args.cell_size - glyph.height) // 2
        atlas.paste(glyph, (x, y), glyph)
        answer_key.append({
            "position": index + 1,
            "row": row + 1,
            "column": column + 1,
            "itemId": entry["itemId"],
            "name": item["name"],
            "candidateId": entry["candidateId"],
            "approvedAt": entry["updatedAt"],
        })

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.answer_key.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(args.output, "PNG", optimize=True)
    args.answer_key.write_text(json.dumps(answer_key, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Composed {len(answer_key)} approvals into {args.output}")


if __name__ == "__main__":
    main()
