"""Record seven approved deliveries and retain the two saved revision requests."""
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
manifest = json.loads((HERE.parents[1] / "manifest.json").read_text(encoding="utf-8"))
catalog = json.loads((HERE / "catalog.json").read_text(encoding="utf-8"))["catalog"]
snapshot = json.loads((HERE / "reviewed.json").read_text(encoding="utf-8"))
installed = json.loads((HERE / "reviewed-installed.json").read_text(encoding="utf-8"))["installed"]
remaining = [item for item in snapshot["active"] if item["decision"] != "approve"]
assert len(installed) == 7 and len(remaining) == 2


def normalize(value):
    return "".join(character for character in value.lower() if character.isalnum())


canonical = {}
for kind in ("origin", "feat"):
    items = [item for item in catalog if item["kind"] == kind]
    dedicated = 0
    for item in items:
        cards = [card for card in manifest["items"] if card.get("catalogKey") == item["key"]
                 or normalize(card["name"]) == normalize(item["label"])]
        paths = [item["proposed"], f"icons/abilities/{item['key']}.svg",
                 *[card["target"] for card in cards if card.get("target")]]
        dedicated += any((ROOT / path).is_file() for path in paths)
    canonical[kind] = {"total": len(items), "dedicatedFiles": dedicated}
resolved = sum(item.get("status") == "resolved" for item in manifest["items"])
report = {"date": "2026-10-13", "phase": "after Batch 67 review installation",
          "resolvedReviewItems": resolved, "activeReviewItems": len(manifest["items"]) - resolved,
          "knownIconBacklog": len(manifest["items"]),
          "approximateCompletedPercent": round(100 * resolved / len(manifest["items"]), 1),
          "canonical": canonical, "fuelGradeArtDelivered": 2,
          "fuelGradeArtRemaining": 1, "catalogWiringRemainsForGM": True}
(HERE / "progress-reviewed.json").write_text(json.dumps(report, indent=2) + "\n", encoding="utf-8")

queue_path = ROOT / "dev" / "icons" / "MISSING.md"
text = queue_path.read_text(encoding="utf-8")
text = re.sub(r"\*\*Next batch number: 68\*\*.*?\n\n",
              "**Next batch number: 68** (Batch 67: seven approved and installed; two\nsaved revisions remain for targeted edits).\n\n", text, count=1, flags=re.S)
text = re.sub(r"\*\*Icon coverage, 2026-10-12:\*\*.*?\n\n",
              "**Icon coverage, 2026-10-13:** origins 36/36 and Sztuczki 52/53 delivered.\n"
              "Bebeszenie completes the M5 action glyphs. The known icon review queue is\n"
              "340/342 resolved (99.4%); only Pan Plaster and adulterated fuel remain.\n"
              "All 23 medicines, including Reminex, have distinct configured icons; all\n"
              "35 chemistry entries have custom art. Good and average fuel art is installed;\n"
              "fuel mappings and the existing medic-refill icon repoint remain for the GM.\n"
              "Catalog evidence: `CATALOG_COVERAGE.md`; delivery census:\n"
              "`review/candidates/batch-67/progress-reviewed.json`. Painted art is separate.\n\n",
              text, count=1, flags=re.S)
start = text.index("## Queue (A) — Batch 67") if "## Queue (A) — Batch 67" in text else text.index("## Batch 67 —")
end = text.index("## How an item gets added here", start)
section = ["## Batch 67 — 7 approved and installed, 2 revisions", "",
           "Delivered 2026-10-13: exact saved selections as 256×256 white-alpha WEBP",
           "and theme-aware SVG wrappers embedding WEBP. Full decisions and hashes:",
           "`review/candidates/batch-67/reviewed.json` and `reviewed-installed.json`.",
           "Saved feedback is unchanged; approved cards are resolved.", "",
           "| Item | Final SVG (+ WEBP) | Delivery |", "|---|---|---|"]
delivered = {item["itemId"] for item in installed}
for item in snapshot["active"]:
    status = "**done**" if item["id"] in delivered else "Revision required"
    section.append(f"| {item['name']} | `{item['target']}` | {status} |")
section += ["", "### Saved requests for Batch 68", "",
            "| Item | Required change from the exact selected Batch 67 candidate |",
            "|---|---|"]
for item in remaining:
    notes = item["notes"].replace("|", "\\|").replace("\n", " ")
    section.append(f"| {item['name']} | {notes} |")
section += ["", "Good and average fuel art is ready for the GM mappings below. Adulterated",
            "fuel waits for fresh approval. Medicine art needs no regeneration. Bebeszenie",
            "uses the exact M5 filename and needs no wiring. No packs or world changes.", ""]
text = text[:start] + "\n".join(section) + "\n" + text[end:]
text = text.replace("— paliwo (Batch 67, po zatwierdzeniu):", "— paliwo (dobre i przeciętne gotowe, chrzczone w rewizji):")
repoint = ("- **Dodatkowe 7 glifów zatwierdzonych 2026-10-13 (Batch 67):** dokładne ścieżki\n"
           "  i źródła w `review/candidates/batch-67/reviewed-installed.json`. Bebeszenie\n"
           "  używa nazwy M5 i nie wymaga wiring. Cztery starsze Sztuczki pozostają do\n"
           "  repointu / rebuildu i aktualizacji przez MG; agent nie zmienia świata.\n")
if "Dodatkowe 7 glifów zatwierdzonych 2026-10-13" not in text:
    text = text.replace("- **Malowane obrazy (§B/§E/§G/§H):**", repoint + "- **Malowane obrazy (§B/§E/§G/§H):**", 1)
queue_path.write_text(text, encoding="utf-8")
print(json.dumps(report, indent=2))
print("Queue updated: seven deliveries and two verbatim saved revision requests")
