"""Record the final two approvals and keep GM wiring separate from art delivery."""
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
manifest = json.loads((HERE.parents[1] / "manifest.json").read_text(encoding="utf-8"))
installed = json.loads((HERE / "reviewed-installed.json").read_text(encoding="utf-8"))["installed"]
assert len(installed) == 2
assert all(item.get("status") == "resolved" for item in manifest["items"])
assert (ROOT / "icons/abilities/pan-plaster.svg").is_file()
report = {"date": "2026-10-13", "resolvedReviewItems": len(manifest["items"]),
          "activeReviewItems": 0, "knownIconBacklog": len(manifest["items"]),
          "canonical": {"origin": {"total": 36, "dedicatedFiles": 36},
                        "feat": {"total": 53, "dedicatedFiles": 53}},
          "fuelGradeArtDelivered": 3, "catalogWiringRemainsForGM": True,
          "paintedArtCountedSeparately": True}
(HERE / "progress-reviewed.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")
queue_path = ROOT / "dev/icons/MISSING.md"
text = queue_path.read_text(encoding="utf-8")
text = re.sub(r"\*\*Next batch number: 69\*\*.*?\n\n",
              "**Next batch number: 69** (Batch 68: both approved and installed; the\nknown glyph queue is complete. Future style-review flags use the next batch).\n\n",
              text, count=1, flags=re.S)
text = re.sub(r"\*\*Icon coverage, 2026-10-13:\*\*.*?\n\n",
              "**Icon coverage, 2026-10-13:** origins 36/36, Sztuczki 53/53, all M5\naction glyphs and all three fuel-grade icons delivered. The known icon review\nqueue is 342/342 resolved, with no open decisions. All 23 medicines have\ndistinct configured icons. Fuel resolver mappings and the existing medic-refill\nicon repoint remain for the GM. Painted-art briefs/deliveries are separate.\nFinal census: `review/candidates/batch-68/progress-reviewed.json`.\n\n",
              text, count=1, flags=re.S)
start = text.index("## Queue (A) — Batch 68") if "## Queue (A) — Batch 68" in text else text.index("## Batch 68 —")
end = text.index("## How an item gets added here", start)
section = ["## Batch 68 — both approved and installed", "",
           "Delivered 2026-10-13: exact saved Pan Plaster and adulterated-fuel selections",
           "as lossless WEBP and theme-aware SVG wrappers. Decisions, source/output hashes",
           "and complete validation: `review/candidates/batch-68/reviewed.json`,",
           "`reviewed-installed.json`, `accept_current_review.py --check`.", "",
           "| Item | Final SVG (+ WEBP) | Delivery |", "|---|---|---|"]
for item in installed:
    section.append(f"| {item['name']} | `{item['files'][0]}` | **done** |")
section += ["", "All 342 existing review cards are resolved. The three fuel-grade icons are",
            "ready for GM resolver mappings; Pan Plaster remains an older Sztuczka",
            "repoint/rebuild task. No packs or world documents were changed.", ""]
text = text[:start] + "\n".join(section) + "\n" + text[end:]
text = text.replace("dobre i przeciętne gotowe, chrzczone w rewizji", "wszystkie trzy grafiki gotowe")
queue_path.write_text(text, encoding="utf-8")
print("Recorded 342/342 resolved review cards, 53/53 Sztuczki and three delivered fuel grades")
