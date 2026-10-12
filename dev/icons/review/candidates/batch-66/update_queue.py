"""Update only asset queue sections using installed reports and the current batch catalog."""
import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[4]
queue_path = ROOT / "dev" / "icons" / "MISSING.md"
text = queue_path.read_text(encoding="utf-8")
batch = json.loads((HERE / "batch.json").read_text(encoding="utf-8"))
saved = {item["id"]: item for item in json.loads((HERE / "decisions.json").read_text(encoding="utf-8"))["active"]}
installed = json.loads((HERE / "installed.json").read_text(encoding="utf-8"))["installed"]


def cell(value):
    return value.replace("|", "\\|").replace("\n", " ").strip()


history = ["## Batch 65 — 18 approved and installed, 9 returned items in Batch 66", "",
           "Eighteen exact-selected glyphs are installed as lossless WEBP and theme-aware SVG",
           "masks. `review/candidates/batch-66/installed.json` records their paths, source",
           "selections and hashes; `decisions.json` preserves all 27 incoming decisions.",
           "Eight items requested revisions; Bebeszenie was rejected for repeated bent-handle",
           "anatomy and receives a fresh isolated redraw. No Batch 65 decision is pending.", "",
           "| Delivered file | Item / status |", "|---|---|"]
for item in installed:
    history.append(f"| `{item['files'][0]}` + `.webp` | {cell(item['name'])} — **done** |")
history += ["", "| Returned item | Saved GM request |", "|---|---|"]
for entry in batch["revisions"]:
    old = saved[entry["itemId"]]
    history.append(f"| {cell(old['name'])} ({old['decision']}) | {cell(old['notes'])} |")

active = ["", "## Queue (A) — Batch 66 — 16 awaiting GM review", "",
          "Eight exact-reference edits, one completely fresh isolated Bebeszenie redraw,",
          "and the last seven untouched canonical Sztuczki. The rejected pliers glyph is",
          "archived for diagnosis and is excluded from generation inputs. Generic prompts,",
          "exact selections, processors and the registered cards are in",
          "`review/candidates/batch-66/`. New candidates require fresh approval.", "",
          "| Source | Candidates |", "|---|---|",
          "| Atlas A, cells 1–8 | Barbarka revision C; Mistrz walki wręcz revision C; Padnij/Powstań revision B; Pancerny revision B; Pan Plaster revision B; Pierwotny instynkt revision B; Siekierezada revision B; Szkolenie w broni revision B |",
          "| Isolated redraw, replacing A9 | Bebeszenie revision E — two straight symmetric pliers handles, one pivot, one separate knife and a simple rib outline |",
          "| Atlas B, cells 1–7 | Szkolenie w średnim pancerzu; Szturmowiec; Szybki Bill; Ucz się, ucz; Ukryty cel; Wrestler; Złomiarz |", "",
          "| Final SVG (paired with WEBP after approval) | Item | Required change / subject |", "|---|---|---|"]
for entry in batch["revisions"]:
    old = saved[entry["itemId"]]
    target = old["target"] or f"icons/abilities/{old['id'].split('-', 1)[1]}.svg"
    active.append(f"| `{target}` | {cell(old['name'])} | {cell(entry['request'])} |")
for entry in batch["fresh"]:
    subject = entry["request"].split(". ", 1)[0] + "."
    active.append(f"| `{entry['target']}` | {cell(entry['name'])} (`{entry['catalogKey']}`) | {cell(subject)} |")
active += ["", "All 36 canonical origin abilities now have dedicated glyph files. All 53",
           "canonical Sztuczki have either delivered glyphs (38) or current review candidates",
           "(15). Bebeszenie is the remaining M5 action glyph in review. There are no",
           "untouched canonical icon gaps; the next batch will depend on GM review requests.", ""]
replacement = "\n".join(history + active) + "\n"
start = re.search(r"^## (?:Queue \(A\) — Batch 65 — 27 awaiting GM review|Batch 65 — 18 approved and installed, 9 returned items in Batch 66)\n", text, re.M)
assert start, "Expected Batch 65 queue section is missing"
end = text.index("## How an item gets added here", start.start())
text = text[:start.start()] + replacement + text[end:]
text = re.sub(r"\*\*Next batch number: (?:66|67)\*\*.*?\n\n", "**Next batch number: 67** (Batch 66: 16 candidates in two atlases plus an\nisolated Bebeszenie redraw; awaiting GM review).\n\n", text, count=1, flags=re.S)
text = re.sub(r"\*\*Approximate icon progress, 2026-10-12:\*\*.*?\n\n",
              "**Approximate icon progress, 2026-10-12:** 323 resolved review items and 16\nremaining known gaps/returns, roughly 95% of the known icon backlog. Canonical\norigin abilities: 36/36 delivered; Sztuczki: 38/53 delivered. Batch 66 supplies\ncandidates for every remaining canonical gap. Older pack/live repoints remain\nfor the GM; painted artwork is counted separately. Census:\n`review/candidates/batch-66/progress-after-install.json`.\n\n", text, count=1, flags=re.S)
repoint = ("- **Dodatkowe 18 glifów zatwierdzonych 2026-10-12 (Batch 65):** ścieżki w\n"
           "  `review/candidates/batch-66/installed.json`. Szabrowanie używa dokładnej nazwy M5,\n"
           "  bez dodatkowego okablowania. Wszystkie zdolności pochodzenia mają teraz pliki;\n"
           "  ich rebuild oraz repoint `img` / rebuild starszych Sztuczek i migracje istniejących\n"
           "  przedmiotów pozostają dla MG. Agent assetowy nie wykonuje tych operacji.\n")
if "Dodatkowe 18 glifów zatwierdzonych" not in text:
    text = text.replace("- **Malowane obrazy (§B/§E/§G/§H):**", repoint + "- **Malowane obrazy (§B/§E/§G/§H):**", 1)

art_report = ROOT / "dev" / "art" / "m5" / "delivered-2026-10-12.json"
if art_report.is_file():
    art = json.loads(art_report.read_text(encoding="utf-8"))["delivered"]
    outputs = {item["output"] for item in art}
    lines = text.splitlines()
    for index, line in enumerate(lines):
        if line.startswith("|") and any(f"`{output}`" in line for output in outputs):
            columns = line.split("|")
            if "**done**" not in columns[3]:
                columns[3] = " **done** — " + columns[3].strip() + " "
                lines[index] = "|".join(columns)
    text = "\n".join(lines) + "\n"
    text = text.replace("Bez dostarczonych źródeł wszystkie wiersze poniżej pozostają otwarte; nie ma jeszcze\nnowych ilustracji ani kredytów za niedostarczone obrazy. Nazwy docelowe nie zmieniają się.",
                        "Dostarczone 2026-10-12: siedem portretów handlarzy (600×800 RGB WEBP) i trzy\nbannery utrzymania (1200×400 RGB WEBP). Źródła MG przetworzono wyłącznie przez\ncrop/resize/konwersję; raport i hashe: `dev/art/m5/delivered-2026-10-12.json`.\nObozy i ruiny pozostają otwarte. Nazwy docelowe nie zmieniają się.")
    text = text.replace("- **Malowane obrazy (§B/§E/§G/§H):** oczekują na źródła MG w",
                        "- **Malowane obrazy (§B/§E/§G/§H):** handlarze i utrzymanie są dostarczone;\n  pozostałe obrazy oczekują na źródła MG w")
queue_path.write_text(text, encoding="utf-8")
print("Updated Batch 65 deliveries, Batch 66 review queue, progress and supplied painted-art rows")
