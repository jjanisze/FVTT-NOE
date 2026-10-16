"""Prepare all frozen style corrections using the existing 3x3 mask processor."""
import sys
from pathlib import Path
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "placeholder-pass"))
from prepare_70_71 import GENERAL, ROOT, REVIEW, read, write, sha
from snapshot import HERE, NUMBERS

motifs = read(HERE / "motifs-102-105.json")
flags = read(HERE / "incoming-style-feedback.json")["items"]
assert set(motifs) == {Path(f["source"]).stem for f in flags}
for index, number in enumerate(NUMBERS):
    here = REVIEW / f"candidates/batch-{number}"
    assert not (here / "batch.json").exists(), "Already prepared"
    entries = flags[index * 9:(index + 1) * 9]
    subjects = []
    for cell, flag in enumerate(entries, 1):
        assert sha(ROOT / flag["source"]) == flag["sourceSha256"]
        key = Path(flag["source"]).stem
        name, rules, request = motifs[key]
        subjects.append({"kind": "feature", "key": key, "name": name, "owner": "style-review", "ownerLabel": "Style review",
            "cell": cell, "target": flag["source"], "deliveryTargets": [{"source": flag["source"], "variant": "default", "sourceSha256": flag["sourceSha256"]}],
            "itemId": f"style{number}-{key}", "ruleContext": rules,
            "context": f"Ability: {name}. {rules} Inventory, item sheet, hotbar and chat icon, typically 16-64 px.",
            "note": "Style replacement at the exact existing filename; fresh GM approval required. No wiring or world writes.",
            "styleFeedback": flag, "request": request})
    batch = {"date": "2026-10-17", "batch": number, "pass": "browser-style-revisions", "subjects": subjects}
    if len(subjects) < 9:
        batch.update(partialAtlas=True, emptyCells=list(range(len(subjects) + 1, 10)))
    general = GENERAL
    if len(subjects) < 9:
        general = general.replace("exactly NINE separate equal cells", f"exactly {len(subjects)} active glyphs in NINE equal cells")
    role = ("Reference 1 is the DESIRED STYLE only. Reference 2 contains the CURRENT ART in the same row-major order: preserve the requested subject and intent, "
            "but DISCARD its fine detail, portrait rendering, shading and texture. Follow each simplified motif below. No recognizable person or character. "
            "The Fart luck icon must have NO DICE or other game mechanics symbols. ")
    prompt = general + role + "\nROW-MAJOR CONTENTS:\n" + "\n".join(f"{s['cell']}. {s['name']}: {s['request']}" for s in subjects)
    if len(subjects) < 9:
        prompt += "\nCELLS " + ", ".join(map(str, batch["emptyCells"])) + " MUST STAY COMPLETELY EMPTY PURE BLACK. No glyphs, labels or decoration in any unused cell."
    write(here / "batch.json", batch)
    write(here / "prompts.json", {"generator": "OpenAI built-in image generation", "date": batch["date"], "reference": "raw/style-reference.png",
        "references": ["raw/style-reference.png", "raw/current-reference.png"], "role": role, "atlas": prompt, "targetedCorrections": []})
    write(here / "references.json", {"files": read(here / "incoming.json")["productionFiles"]})
    write(here / "style-feedback-before.json", {f["iconId"]: f for f in entries})
    print(f"Batch {number}: {len(subjects)} requested style replacements, frozen exact source hashes.")
