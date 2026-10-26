"""Freeze three controlled-disengage variations from the GM-selected concept."""
import hashlib
import json
import shutil
import sys
from pathlib import Path
from PIL import Image

sys.dont_write_bytecode = True
from prepare import COMMON, ROOT, REVIEW, write

NUMBER = 117

VARIANTS = [
    ("a", "Odwrót za gardą", "Retreating person steps backward with both arms protecting head and torso; the opponent cannot reach past the guard.",
     "TWO ordinary adult humans in a CONTROLLED MELEE DISENGAGE, full-body side view. LEFT person FACES RIGHT at their opponent and takes a short balanced BACKWARD STEP LEFT. Their front forearm stays upright between their face and the opponent, the other hand protects the ribs. RIGHT opponent extends one bent arm toward them, but its hand stops SHORT OF THE GUARD with a clear black gap. Both people remain calm and balanced. Retreating person's face NEVER turns away; no running posture. The maintained guard closes the opening for a free strike. No successful hit, no weapon, shield or extra symbol. Preserve the selected reference's two-person concept with a more clearly backward-stepping and guarded defender."),
    ("b", "Kontrola ręki i krok wstecz", "One person keeps the opponent's reaching wrist aside while taking a guarded backward step.",
     "TWO ordinary adult humans in CLOSE MELEE, a CONTROLLED DISENGAGE. LEFT person FACES RIGHT while stepping BACK LEFT. Their lead OPEN PALM gently CHECKS the opponent's reaching WRIST, guiding that arm to the OUTSIDE and AWAY from their torso; their other hand remains raised in guard. The RIGHT opponent faces LEFT, arm extended but not striking the retreating person's body. One clear hand-to-wrist contact only; keep both arms anatomically distinct using a wide black notch at the contact. Head and torso of the withdrawing person stay behind their own guard. No grabbing contest, throw, punch, running away, fleeing turned back, successful hit, weapon or shield. Show safe withdrawal through maintained defensive control, not an attack by the retreating person."),
    ("c", "Odwrót bez wolnego ciosu", "Guarded withdrawal by two people, with a small barred-strike sign to test a direct no-free-attack cue.",
     "TWO ordinary adult humans in CLOSE MELEE, LEFT person FACING RIGHT at the opponent while taking a measured BACKWARD STEP LEFT, both hands in protective guard. RIGHT opponent FACES LEFT with one arm ready, no blow landing. Both are standing with natural short steps, never running or turning their back. ABOVE THE BLACK GAP BETWEEN THE TWO FIGURES place ONE SMALL SIMPLE PROHIBITED-STRIKE pictogram: a plain white circular ring containing one short attack stroke, crossed by ONE stout diagonal bar. This is a sober functional no-free-strike notation, not a physical shield, magic barrier or third character. Keep the symbol smaller than the two heads together but bold enough to read. The two human figures and their controlled retreat remain the main subject. No letters, numbers, arrows, fists floating separately, weapons, impact star or successful hit.")
]


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def main():
    here = REVIEW / f"candidates/batch-{NUMBER}"
    assert not here.exists(), "Revision already prepared; retain it"
    manifest = json.loads((REVIEW / "manifest.json").read_text(encoding="utf-8"))
    feedback = json.loads((REVIEW / "feedback.json").read_text(encoding="utf-8"))
    card = next(c for c in manifest["items"] if c["id"] == "hotbar-2026-odstapienie")
    saved = feedback["items"][card["id"]]
    assert saved["decision"] == "revise" and saved["candidateId"] == "batch115-odstapienie-b"
    selected = next(c for c in card["candidates"] if c["id"] == saved["candidateId"])
    source = REVIEW / selected["src"]
    (here / "raw").mkdir(parents=True)
    shutil.copyfile(REVIEW / "candidates/batch-115/raw/style-reference.png", here / "raw/style-reference.png")
    # Display-only compositing: preserve the exact selected pixels on black.
    with Image.open(source).convert("RGBA") as image:
        background = Image.new("RGBA", image.size, (0, 0, 0, 255))
        background.alpha_composite(image)
        background.convert("RGB").save(here / "raw/selected-concept.png")
    incoming = {"date": "2026-10-24", "card": card, "feedback": saved,
        "selectedSource": selected["src"], "selectedSha256": sha(source),
        "productionFiles": [{"source": "icons/abilities/odstapienie.svg", "sha256": sha(ROOT / "icons/abilities/odstapienie.svg")}],
        "expectedAbsent": ["icons/actions/odstapienie.svg", "icons/actions/odstapienie.webp"]}
    write(here / "incoming.json", incoming)
    subjects = [{"cell": i + 1, "key": f"odstapienie-{variant}", "variant": variant,
        "name": f"Odstąpienie — {label}", "itemId": card["id"], "target": card["target"],
        "request": prompt, "caption": caption, "context": card["context"],
        "deliveryTargets": card["deliveryTargets"]} for i, (variant, label, caption, prompt) in enumerate(VARIANTS)]
    write(here / "batch.json", {"date": "2026-10-24", "batch": NUMBER,
        "pass": "guarded-disengage-variations", "partialAtlas": True, "emptyCells": [4, 5, 6, 7, 8, 9], "subjects": subjects})
    prompt = COMMON.replace("The three variants of a subject", "The three variations of the selected two-person concept")
    prompt += "\nReference 1 is WHITE-GLYPH STYLE ONLY. Reference 2 is the GM-SELECTED TWO-PERSON CONCEPT to develop, not a request to repeat it unchanged. Keep its two people and the withdrawing person's awareness of the opponent. The core distinction is CONTROLLED DISENGAGE WITHOUT AN OPENING FOR A FREE STRIKE, rather than turning away and fleeing. No successful strike is shown.\nGM feedback, verbatim: " + saved["notes"]
    prompt += "\nROW-MAJOR CONTENTS:\n" + "\n".join(f"{s['cell']}. {s['request']}" for s in subjects)
    prompt += "\nCELLS 4, 5, 6, 7, 8 AND 9 MUST REMAIN PURE BLACK AND COMPLETELY EMPTY. Only the TOP ROW contains the THREE variations. No filler."
    write(here / "prompts.json", {"reference": "raw/style-reference.png", "conceptReference": "raw/selected-concept.png", "atlas": prompt, "targetedCorrections": []})
    print(json.dumps({"batch": NUMBER, "prompt": prompt, "references": [str(here / "raw/style-reference.png"), str(here / "raw/selected-concept.png")]}, ensure_ascii=False))


if __name__ == "__main__":
    main()
