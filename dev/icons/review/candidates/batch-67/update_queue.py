"""Record Batch 67 and the expanded catalog audit in the owned asset queue."""
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
queue_path = ROOT / "dev" / "icons" / "MISSING.md"
text = queue_path.read_text(encoding="utf-8")
batch = json.loads((HERE / "batch.json").read_text(encoding="utf-8"))
saved = {item["id"]: item for item in json.loads((HERE / "decisions.json").read_text(encoding="utf-8"))["active"]}

text = re.sub(r"\*\*Next batch number: (?:67|68)\*\*.*?\n\n",
              "**Next batch number: 68** (Batch 67: six saved revisions plus three fuel-grade\ncandidates in one 3×3 atlas; awaiting GM review).\n\n", text, count=1, flags=re.S)
text = re.sub(r"\*\*Approximate icon progress, 2026-10-12:\*\*.*?\n\n",
              "**Icon coverage, 2026-10-12:** origins 36/36 and Sztuczki 48/53 delivered.\nThe earlier 98% estimate covered the known review queue; the broader catalog\naudit adds three fuel-grade art gaps. All 23 medicines (including Reminex) have\ndistinct configured icons; all 35 chemistry entries have custom art. Of 333\ncanonical physical item results, 329 currently point to existing module icons;\nthree fuel grades use item-bag, and the medic refill needs an existing-icon repoint.\nSee `CATALOG_COVERAGE.md` and `catalog-icons-2026-10-12.json`. Batch 67 covers the\nsix remaining action/feat revisions plus all three newly identified fuel gaps.\n\n", text, count=1, flags=re.S)
text = text.replace("## Batch 66 — 10 approved and installed, 6 revisions queued", "## Batch 66 — 10 approved and installed, 6 revisions in Batch 67")
text = text.replace("use their saved Batch 66 selections. Six revisions remain open with notes intact.",
                    "use their saved Batch 66 selections. Six revisions continue in Batch 67;\ntheir exact prior selections and notes are archived before replacement.")
text = text.replace("canonical icon gaps remain; Batch 67 will address only these saved revisions.",
                    "origin/Sztuczka icon gaps remain. The broader physical-item audit also adds\nthree missing fuel-grade icons to Batch 67.")
text = text.replace("### Remaining revisions for Batch 67", "### Revisions carried into Batch 67")
text = text.replace("`reviewed-remaining-items.json` archives the six open cards. No new candidates\nhave been generated, and existing selections/notes remain unchanged.",
                    "`reviewed-remaining-items.json` archives the six cards before their replacement.\nBatch 67 supplies new pending candidates, retaining these old sources and notes.")

section = ["## Queue (A) — Batch 67 — 9 awaiting GM review", "",
           "Six exact-selected revisions and three new, distinct canonical fuel-grade icons.",
           "Reminex and the other medicines already have configured dedicated art and do",
           "not need regeneration. The old Bebeszenie composition is archived but omitted",
           "from the generation reference to avoid preserving its crossed-tool layout.",
           "Generic prompts, saved selections and processors: `review/candidates/batch-67/`.",
           "No Batch 67 candidate is installed before fresh GM approval.", "",
           "| Cell | Item | Required change / subject |", "|---|---|---|"]
entries = [*batch["revisions"], *batch["fresh"]]
for index, entry in enumerate(entries, 1):
    name = entry.get("name") or saved[entry["itemId"]]["name"]
    target = entry.get("target") or saved[entry["itemId"]]["target"]
    request = entry["request"].replace("|", "\\|").replace("\n", " ")
    section.append(f"| {index} | {name} → `{target}` | {request} |")
section += ["", "The three fuel entries are existing quality grades: good, average and adulterated",
            "fuel in five-litre units, rather than separate gasoline/diesel item definitions.",
            "After approval they need the explicit GM mappings listed under \"Do podpięcia\".",
            "The medic refill already has `icons/items/loot/uzupelnienie_medyka.svg`; it is a",
            "wiring task and is not a new-art request.", ""]
new_section = "\n".join(section) + "\n"
if "## Queue (A) — Batch 67" in text:
    start = text.index("## Queue (A) — Batch 67")
    end = text.index("## How an item gets added here", start)
    text = text[:start] + new_section + text[end:]
else:
    text = text.replace("## How an item gets added here", new_section + "## How an item gets added here", 1)

wiring = ("- **Audyt katalogu 2026-10-12 — paliwo (Batch 67, po zatwierdzeniu):** dodać do\n"
          "  `RAW_IKONY` w `scripts/production/wynik.mjs` mapy `paliwo-dobre` →\n"
          "  `paliwo_dobre.svg`, `paliwo-przecietne` → `paliwo_przecietne.svg`,\n"
          "  `paliwo-chrzczone` → `paliwo_chrzczone.svg` (wszystkie w `icons/items/loot/`).\n"
          "  Zachować istniejące refy `raw:paliwo-*`; następnie przepointować starsze\n"
          "  przedmioty przez MG. Agent assetowy nie edytuje tego resolvera ani świata.\n"
          "- **Audyt katalogu 2026-10-12 — uzupełnienie medyka (gotowa grafika):** zmienić\n"
          "  `REFILL_IMG` w `scripts/items/toolkit-medyk.mjs` z `icons/svg/heal.svg` na\n"
          "  `modules/neuroshima-2026-overrides/icons/items/loot/uzupelnienie_medyka.svg`.\n"
          "  Aktualizację istniejących przedmiotów wykonuje MG. Nowa generacja zbędna.\n")
if "Audyt katalogu 2026-10-12 — paliwo" not in text:
    text = text.replace("- **Malowane obrazy (§B/§E/§G/§H):**", wiring + "- **Malowane obrazy (§B/§E/§G/§H):**", 1)
queue_path.write_text(text, encoding="utf-8")
print("Recorded nine Batch 67 requests, medicine coverage and the two GM wiring tasks")
