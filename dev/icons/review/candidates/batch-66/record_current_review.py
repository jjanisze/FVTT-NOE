"""Record the post-review census and update owned queue sections without changing feedback."""
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


def normalize(value):
    return "".join(character for character in value.lower() if character.isalnum())


canonical = {}
for kind in ("origin", "feat"):
    items = [item for item in catalog if item["kind"] == kind]
    dedicated = 0
    for item in items:
        cards = [card for card in manifest["items"] if card.get("catalogKey") == item["key"]
                 or normalize(card["name"]) == normalize(item["label"])]
        targets = [item["proposed"], f"icons/abilities/{item['key']}.svg",
                   *[card["target"] for card in cards if card.get("target")]]
        dedicated += any((ROOT / target).is_file() for target in targets)
    canonical[kind] = {"total": len(items), "dedicatedFiles": dedicated}
resolved = sum(item.get("status") == "resolved" for item in manifest["items"])
report = {"date": "2026-10-12", "phase": "after Batch 66 review installation",
          "resolvedReviewItems": resolved, "activeReviewItems": len(manifest["items"]) - resolved,
          "knownIconBacklog": len(manifest["items"]),
          "approximateCompletedPercent": round(100 * resolved / len(manifest["items"])), "canonical": canonical}
(HERE / "progress-reviewed.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

queue_path = ROOT / "dev" / "icons" / "MISSING.md"
text = queue_path.read_text(encoding="utf-8")
text = re.sub(r"\*\*Next batch number: 67\*\*.*?\n\n",
              "**Next batch number: 67** (Batch 66: 10 approved and installed, six revisions\nqueued; no pending decisions. Batch 67 has not been generated).\n\n", text, count=1, flags=re.S)
text = re.sub(r"\*\*Approximate icon progress, 2026-10-12:\*\*.*?\n\n",
              f"**Approximate icon progress, 2026-10-12:** {resolved} resolved review items and\n{len(remaining)} remaining revisions, roughly {report['approximateCompletedPercent']}% of the known icon backlog. Canonical origin\nabilities: {canonical['origin']['dedicatedFiles']}/{canonical['origin']['total']} delivered; Sztuczki: {canonical['feat']['dedicatedFiles']}/{canonical['feat']['total']} delivered. No untouched canonical\nicon gaps remain. Older pack/live repoints remain for the GM; painted artwork is\ncounted separately. Census: `review/candidates/batch-66/progress-reviewed.json`.\n\n", text, count=1, flags=re.S)
start = text.index("## Queue (A) — Batch 66 — 16 awaiting GM review") if "## Queue (A) — Batch 66 — 16 awaiting GM review" in text else text.index("## Batch 66 — 10 approved and installed, 6 revisions queued")
end = text.index("## How an item gets added here", start)
old = text[start:end]
old = old.replace("## Queue (A) — Batch 66 — 16 awaiting GM review", "## Batch 66 — 10 approved and installed, 6 revisions queued")
old = old.replace("| Final SVG (paired with WEBP after approval) | Item | Required change / subject |",
                  "| Final SVG (WEBP paired after approval) | Item / delivery status | Original Batch 66 prompt |")
old = old.replace("exact selections, processors and the registered cards are in\n`review/candidates/batch-66/`. New candidates require fresh approval.",
                  "exact selections, processors and the registered cards are in\n`review/candidates/batch-66/`. Ten exact-approved WEBP/SVG pairs are now installed.\n`reviewed.json` archives all sixteen current decisions and selections;\n`reviewed-installed.json` records delivered paths and hashes. Barbarka deliberately\nuses the older `batch65-revision` candidate selected by the GM. All other deliveries\nuse their saved Batch 66 selections. Six revisions remain open with notes intact.")
targets = {item["files"][0] for item in installed}
lines = old.splitlines()
for index, line in enumerate(lines):
    if line.startswith("|") and any(f"`{target}`" in line for target in targets):
        columns = line.split("|")
        if "**done**" not in columns[2]:
            columns[2] = " " + columns[2].strip() + " — **done** "
            lines[index] = "|".join(columns)
old = "\n".join(lines) + "\n"
old = old.replace("All 36 canonical origin abilities now have dedicated glyph files. All 53\ncanonical Sztuczki have either delivered glyphs (38) or current review candidates\n(15). Bebeszenie is the remaining M5 action glyph in review. There are no\nuntouched canonical icon gaps; the next batch will depend on GM review requests.",
                  "All 36 canonical origin abilities have dedicated glyph files. All 53 canonical\nSztuczki have either delivered glyphs (48) or revision requests (5). Bebeszenie is\nthe sixth remaining revision and the last M5 action glyph in review. No untouched\ncanonical icon gaps remain; Batch 67 will address only these saved revisions.")
if "### Remaining revisions for Batch 67" in old:
    old = old[:old.index("### Remaining revisions for Batch 67")].rstrip() + "\n"
old += "\n### Remaining revisions for Batch 67\n\n"
old += "Exact selected sources and verbatim feedback are preserved in `reviewed.json`;\n`reviewed-remaining-items.json` archives the six open cards. No new candidates\nhave been generated, and existing selections/notes remain unchanged.\n\n"
old += "| File | Item | Required change from the saved GM review |\n|---|---|---|\n"
for item in remaining:
    note = item["notes"].replace("|", "\\|").replace("\n", " ").strip()
    old += f"| `{item['target']}` | {item['name']} | {note} |\n"
text = text[:start] + old + "\n" + text[end:]
repoint = ("- **Dodatkowe 10 glifów zatwierdzonych 2026-10-12 (Batch 66):** ścieżki i\n"
           "  wybrane źródła w `review/candidates/batch-66/reviewed-installed.json`.\n"
           "  Starsze Sztuczki wymagające repointu `img` / rebuildu i aktualizacji istniejących\n"
           "  przedmiotów w świecie pozostają dla MG. Agent assetowy nie wykonuje migracji.\n")
if "Dodatkowe 10 glifów zatwierdzonych" not in text:
    text = text.replace("- **Malowane obrazy (§B/§E/§G/§H):**", repoint + "- **Malowane obrazy (§B/§E/§G/§H):**", 1)
queue_path.write_text(text, encoding="utf-8")
print(json.dumps(report, ensure_ascii=False, indent=2))
print(f"Queue updated: {len(installed)} delivered, {len(remaining)} revisions retained")
