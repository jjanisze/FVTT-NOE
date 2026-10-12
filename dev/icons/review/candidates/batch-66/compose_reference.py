"""Compose references from the GM's exact saved candidate selections, preserving blank new slots."""
import json
from pathlib import Path
from PIL import Image, ImageOps

HERE = Path(__file__).resolve().parent
REVIEW = HERE.parents[1]
batch = json.loads((HERE / "batch.json").read_text(encoding="utf-8"))
saved = {item["id"]: item for item in json.loads((HERE / "decisions.json").read_text(encoding="utf-8"))["active"]}
entries = [*batch["revisions"], *batch["fresh"]]
(HERE / "raw").mkdir(exist_ok=True)
references = []
for atlas in ("a",):
    canvas = Image.new("RGB", (1536, 1536), "black")
    selected = [entry for entry in entries if entry["atlas"] == atlas]
    for index, entry in enumerate(selected):
        if entry not in batch["revisions"]:
            continue
        source = saved[entry["itemId"]]
        path = REVIEW / source["selectedSource"]
        if entry.get("isolated"):
            references.append({"itemId": entry["itemId"], "atlas": atlas, "cell": index + 1,
                               "candidateId": source["candidateId"], "source": source["selectedSource"],
                               "feedback": source["notes"], "suppliedToGenerator": False})
            continue
        with Image.open(path) as image:
            alpha = image.convert("RGBA").getchannel("A")
            alpha = ImageOps.contain(alpha.crop(alpha.getbbox()), (410, 410), Image.Resampling.LANCZOS)
        glyph = Image.new("RGBA", alpha.size, "white")
        glyph.putalpha(alpha)
        row, column = divmod(index, 3)
        canvas.paste(glyph, (column * 512 + (512 - glyph.width) // 2,
                             row * 512 + (512 - glyph.height) // 2), glyph)
        references.append({"itemId": entry["itemId"], "atlas": atlas, "cell": index + 1,
                           "candidateId": source["candidateId"], "source": source["selectedSource"],
                           "feedback": source["notes"], "suppliedToGenerator": True})
    canvas.save(HERE / "raw" / f"reference-{atlas}.png", optimize=True)
(HERE / "references.json").write_text(json.dumps(references, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")
print(f"Composed {len(references)} exact-selected references")
