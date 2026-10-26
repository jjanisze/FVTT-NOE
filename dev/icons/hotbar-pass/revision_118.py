"""Prepare/register two pivoting-disengage variations from exact saved feedback."""
import argparse
import hashlib
import json
import shutil
import sys
from pathlib import Path
from PIL import Image

sys.dont_write_bytecode = True
from prepare import COMMON, ROOT, REVIEW, write

HERE = REVIEW / "candidates/batch-118"
ITEM = "hotbar-2026-odstapienie"
VARIANTS = [
    ("a", "Obrót i otwarta dłoń z tyłu",
     "Półobrót przy odejściu, z prawą dłonią wyciągniętą za siebie w stronę napastnika. Krótka strzałka przy biodrach pokazuje obrót.",
     "Keep the reference's ordinary adult man as the LEFT figure, but zoom out enough to fit TWO COMPLETE adult figures within one icon. Add ONE assailant at the RIGHT, facing LEFT and reaching toward the withdrawing man. The LEFT man's torso turns to face LEFT, one foot stepping LEFT to withdraw, while his head turns BACK RIGHT to watch the assailant. His RIGHT ARM EXTENDS BEHIND HIM TO THE RIGHT, open palm outward toward the assailant, maintaining a guarded separation; his left arm remains near the front of his body. The assailant's reaching hand stops short of that rearward palm, no blow lands. Show ONE stout short CURVED ROTATION ARROW beside the withdrawing man's hips, indicating his torso pivot to the left, not travel and not an arrow between people. Two naturally proportioned full bodies, sober unarmed controlled withdrawal, not a sprint or blind flight. Both right-hand fingers and palm are grouped as a simple anatomically coherent hand. No added weapon, prohibition circle, crossed-fist badge, impact star, wings or third person."),
    ("b", "Obrót z osłoną sięgającej ręki",
     "Ćwierćobrót i prawa ręka cofnięta za tułów, kontrolująca sięgającą rękę napastnika. Łuk nad barkiem podkreśla skręt.",
     "Develop the reference into TWO COMPLETE ordinary adult humans, retreating man at LEFT and assailant at RIGHT. In a front-three-quarter view the LEFT man makes a controlled QUARTER-TURN TOWARD LEFT, body already angled to step away LEFT, HEAD still LOOKING BACK RIGHT at the assailant. His RIGHT ARM is clearly EXTENDED BEHIND HIS TORSO toward the RIGHT, with its OPEN PALM checking the outside of the assailant's reaching left WRIST. His left hand stays in a compact protective position in front of his chest. The RIGHT assailant leans slightly LEFT with one arm reaching, but cannot strike the withdrawing man's body. Preserve a broad black gap between their torsos and one clean hand-to-wrist contact, never fused anatomy. Draw ONE simple bold CURVED ROTATION ARROW just above and beside the retreating man's shoulder to indicate the quarter-turn, with a single arrowhead. Deliberate short backward/sideways steps, no running stride, fleeing turned back, successful hit, weapon, extra detached hand, prohibition symbol, circle badge, third figure or fine clothing detail.")
]


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def prepare():
    assert not HERE.exists(), "Already prepared; preserve the existing revision"
    manifest, feedback = read(REVIEW / "manifest.json"), read(REVIEW / "feedback.json")
    card = next(c for c in manifest["items"] if c["id"] == ITEM)
    saved = feedback["items"][ITEM]
    assert saved["decision"] == "revise" and saved["candidateId"] == "batch115-odstapienie-c"
    selected = next(c for c in card["candidates"] if c["id"] == saved["candidateId"])
    source = REVIEW / selected["src"]
    (HERE / "raw").mkdir(parents=True)
    shutil.copyfile(REVIEW / "candidates/batch-117/raw/style-reference.png", HERE / "raw/style-reference.png")
    with Image.open(source).convert("RGBA") as image:
        black = Image.new("RGBA", image.size, (0, 0, 0, 255))
        black.alpha_composite(image)
        black.convert("RGB").save(HERE / "raw/selected-reference.png")
    write(HERE / "incoming.json", {"date": "2026-10-24", "card": card, "feedback": saved,
        "selectedSource": selected["src"], "selectedSha256": sha(source),
        "productionFiles": [{"source": "icons/abilities/odstapienie.svg", "sha256": sha(ROOT / "icons/abilities/odstapienie.svg")}],
        "expectedAbsent": ["icons/actions/odstapienie.svg", "icons/actions/odstapienie.webp"]})
    subjects = [{"cell": i + 1, "key": f"odstapienie-{variant}", "variant": variant,
        "itemId": ITEM, "name": f"Odstąpienie — {label}", "caption": caption,
        "target": card["target"], "deliveryTargets": card["deliveryTargets"], "context": card["context"],
        "request": prompt} for i, (variant, label, caption, prompt) in enumerate(VARIANTS)]
    write(HERE / "batch.json", {"date": "2026-10-24", "batch": 118, "pass": "pivoting-disengage-pair",
        "partialAtlas": True, "emptyCells": [3, 4, 5, 6, 7, 8, 9], "subjects": subjects})
    prompt = COMMON.replace("The three variants of a subject", "The TWO requested variations")
    prompt += "\nReference 1 supplies WHITE-GLYPH STYLE ONLY. Reference 2 is the SELECTED EXISTING FIGURE to develop. Keep its ordinary human design but zoom out, add an assailant at RIGHT, extend the retreating person's RIGHT HAND BEHIND, and show a torso-pivot ROTATION ARROW. The GM specifically requests this one functional arrow; it must be sober and minimal. Do not copy the older two-person barred-strike design.\nGM feedback, verbatim: " + saved["notes"]
    prompt += "\nROW-MAJOR CONTENTS:\n" + "\n".join(f"{s['cell']}. {s['request']}" for s in subjects)
    prompt += "\nOnly TOP LEFT and TOP MIDDLE cells contain the TWO variations. CELLS 3, 4, 5, 6, 7, 8 AND 9 MUST REMAIN COMPLETELY EMPTY PURE BLACK. No filler, labels or ornament."
    write(HERE / "prompts.json", {"reference": "raw/style-reference.png", "conceptReference": "raw/selected-reference.png", "atlas": prompt, "targetedCorrections": []})
    print(json.dumps({"batch": 118, "prompt": prompt, "references": [str(HERE / "raw/style-reference.png"), str(HERE / "raw/selected-reference.png")]}, ensure_ascii=False))


def register():
    assert not (HERE / "registration.json").exists(), "Already registered; preserve newer review"
    files = [REVIEW / "manifest.json", REVIEW / "feedback.json", ROOT / "dev/icons/MISSING.md"]
    before = {file: file.read_bytes() for file in files}
    manifest, feedback, incoming = read(files[0]), read(files[1]), read(HERE / "incoming.json")
    assert feedback["items"][ITEM] == incoming["feedback"], "Feedback changed; preserve it"
    validation, batch = read(HERE / "validated.json"), read(HERE / "batch.json")
    assert validation["validatedMasks"] == 2
    for subject in batch["subjects"]:
        assert sha(HERE / f"{subject['key']}.png") == validation["candidateHashes"][subject["key"]]
    assert sha(REVIEW / incoming["selectedSource"]) == incoming["selectedSha256"]
    assert all(sha(ROOT / item["source"]) == item["sha256"] for item in incoming["productionFiles"])
    assert all(not (ROOT / path).exists() for path in incoming["expectedAbsent"])
    card = next(c for c in manifest["items"] if c["id"] == ITEM)
    assert card == incoming["card"], "Card changed; preserve newer work"
    fresh = [{"id": f"batch118-{s['key']}", "label": f"118 {s['variant'].upper()} · {s['name'].split(' — ')[-1]}",
        "src": f"candidates/batch-118/{s['key']}.png", "note": s["caption"]} for s in batch["subjects"]]
    card["candidates"] = fresh + card["candidates"]
    card.update(batch=118, tier="Batch 118 · Dwa warianty obrotu · A / B",
        request="Dwa warianty wybranej sylwetki: napastnik dodany po prawej, prawa ręka odchodzącej osoby wyciągnięta do tyłu, jedna strzałka pokazująca obrót. Poprzednie opcje zostają do porównania.")
    manifest.update(title="Player hotbar · 4 approved icons delivered; 2 pivoting-disengage variations", updated="2026-10-24")
    missing = before[files[2]].decode("utf-8").replace("\r\n", "\n")
    assert "**Next batch number: 118**" in missing
    missing = missing.replace("**Next batch number: 118**", "**Next batch number: 119**", 1)
    start, end = "<!-- player-hotbar-revision:start -->", "<!-- player-hotbar-revision:end -->"
    first, last = missing.index(start), missing.index(end) + len(end)
    section = start + "\n## Player hotbar — Odstąpienie pivot revisions, Batch 118\n\nFour approved subjects are delivered. Two new variants follow the saved\nrequest for a right-side assailant, rearward right hand and rotation arrow.\nExact feedback and source: `review/candidates/batch-118/incoming.json`;\nexact generation prompt: `review/candidates/batch-118/prompts.json`.\n\n| Subject | Prospective target |\n|---|---|\n| Odstąpienie — człowiek | `icons/actions/odstapienie.svg` |\n\nComplete hotbar regeneration waits for the final selection.\n" + end
    missing = missing[:first] + section + missing[last:]
    for file, original in before.items():
        assert file.read_bytes() == original, "Shared files changed during registration"
    write(files[0], manifest)
    files[2].write_text(missing, encoding="utf-8", newline="\r\n" if b"\r\n" in before[files[2]] else "\n")
    assert files[1].read_bytes() == before[files[1]], "Feedback must remain unchanged"
    write(HERE / "registration.json", {"date": "2026-10-24", "itemId": ITEM,
        "newCandidates": 2, "earlierCandidatesPreserved": len(incoming["card"]["candidates"]), "feedbackUnchanged": True})
    print("Registered two pivoting-disengage variations; earlier options, saved selection and feedback preserved.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--register", action="store_true")
    args = parser.parse_args()
    register() if args.register else prepare()
