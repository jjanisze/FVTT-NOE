"""Freeze three saved revisions and fifteen fresh subjects; never rerun."""
import hashlib
import json
from PIL import Image
from prepare_70_71 import GENERAL, ROOT, REVIEW, read, write, sha

DATE = "2026-10-15"
MOTIFS = {
    "kondycha": "REVISION of reference cell 1: KEEP THE EXACT EXISTING FIGURE AND POSE: determined adult rising, lowered head, planted feet, one hand on thigh and other fist down. Change ONLY by adding ONE broad UPWARD ARROW BEHIND the character to show getting up. The arrow rises beside and behind the left shoulder, with a thick stem and one simple triangular head; clear black separation keeps the existing body readable. Preserve clothing, anatomy, proportions, expression and pose. This specifically requested sober arrow overrides the general no-decorative-arrows rule. No new person or anime.",
    "maszyna-do-zabijania": "REVISION of reference cell 2. Keep exactly SEVEN SIMPLE SKULLS in a miniature THREE-ROW THREE-COLUMN tally: top row THREE, middle row THREE, bottom row ONLY ONE AT LEFT; bottom-middle and bottom-right EMPTY BLACK. REMOVE ALL individual diagonal slashes. Instead draw EXACTLY TWO CONTINUOUS STRAIGHT HORIZONTAL STRIKE-THROUGH LINES: one crosses the ENTIRE TOP ROW from left of first skull through all three skulls and the black gaps to right of third skull; one crosses the ENTIRE MIDDLE ROW in the same way. Long broad WHITE bars, with a thin black separation edge where crossing white skulls so each bar reads as ONE UNBROKEN LINE. Bottom-left skull is unstruck. No separate per-skull strikes, diagonal marks, extra skulls or inner grid. All of this stays inside ONE outer atlas cell.",
    "motywacja": "COMPLETELY NEW CONCEPT replacing the megaphone and die in reference cell 3. A cheerful ordinary adult COACH on the LEFT gives ONE clear THUMBS-UP toward a barely conscious exhausted adult BOXER seated slumped on a plain corner stool on the RIGHT. Coach leans encouragingly toward boxer, with one broad simple smile; boxer has drooping head and two large boxing gloves resting limply on thighs. Two coherent natural adult bodies, plain practical sports clothes, short neutral hair, no beard portrait, no exaggerated expression, no anime, no ring ropes, blood or injury. Simplify into broad white silhouettes and large black gaps, not detailed illustration. Keep the full compact encouraging gesture readable at tiny size.",
    "mutant-na-sniadanie": "ONE complete bare adult hand holding a practical hunting KNIFE diagonally upward, guarding against ONE large curved NONHUMAN CLAW entering from the opposite side. The hand has coherent thumb, fingers and short wrist; knife complete blade, guard and grip. Strong black gap separates blade and claw; hunter prepared against mutants. No human portrait, severed limb, blood, gore, tiny scratches or decorative rays.",
    "nie-do-zdarcia": "ONE sturdy BARE ADULT FOREARM held upright defensively, with ONE visibly FLATTENED BULLET glancing away beside it and TWO short broad impact strokes. Complete clenched fist and wrist, strong uninjured human arm, broad contours and sparse black anatomical cuts. The arm's extraordinary toughness is the motif. No armor, wound, gore, bodybuilder portrait, extra hands or fine stippling.",
    "nie-klekam": "ONE generic ADULT standing absolutely UPRIGHT, feet planted apart, shoulders level and hands calmly clenched at sides, resisting hardship. One simple broad protective arch curves behind the shoulders. Smooth featureless head, ordinary adult proportions and plain practical shirt/trousers. Full coherent body with broad black gaps between arms and torso, both legs visible. No beard, gruff portrait, kneeling, cape, superhero costume, anime or intricate shield.",
    "obelga": "ONE complete BARE ADULT HAND making an unmistakable insulting MIDDLE-FINGER gesture: middle finger fully extended upright, other three fingers folded into palm, thumb across their front. Natural coherent hand anatomy, short wrist, broad white silhouette and just two black folded-knuckle cuts. No face, words, lettering, speech bubble, glove, extra fingers or fine fingernails.",
    "obsluga-pancerza": "ONE complete practical BODY-ARMOR VEST, with ONE bare adult hand pulling its broad SIDE STRAP through a large simple BUCKLE to fit it securely. Clear shoulder straps, neck opening and two large front armor plates only. Intact hand/wrist, coherent single strap and buckle. Broad black separations, no person or head, tiny stitching, labels, camouflage, tactical microdetail or giant cog.",
    "odwazny-czy-glupi": "ONE plain generic ADULT, full body, HANDS ON HIPS and CHIN RAISED, calmly confronting ONE LARGE BESTIAL CLAW looming at the side. Confident oblivious stance, smooth featureless head, ordinary adult build, practical plain clothes and two complete planted legs. Clear black gap separates human and nonhuman threat. One person only, no beard portrait, anime, detailed monster face, gore or decorative question mark.",
    "oswajanie-zwierzat": "ONE complete BARE ADULT HAND gently PETTING THE HEAD of ONE seated realistic MUTATED DOG in side view. The dog has exactly ONE short blunt HORN on its forehead, natural canine muzzle, folded hindlegs and one long tail; otherwise sober animal anatomy. Hand joins a short forearm and rests naturally between ear and horn. Broad simple white masses, large black gaps, no full person, cute mascot, anime eyes, collar lettering or injury.",
    "pancerna-fura": "ONE compact rugged ARMORED SUV in clear three-quarter front view. Broad bolted armor plates, two large black windshield panes, two chunky visible tires and one simple heavy front bumper. Complete recognizable vehicle with a compact cabin and covered rear, solid practical proportions. Use only a few broad structural cuts. No turret, driver, tiny bolts, texture, logos, letters or numerals.",
    "paranoja": "THREE plain NATURAL HUMAN EYE SYMBOLS arranged in a compact vigilant fan: one large horizontal eye in the center, one smaller eye above-left and one above-right angled slightly outward. Each eye is an almond silhouette with one broad black pupil, no eyelashes or shading. Three eyes watching every direction, clear broad black gaps. No anime eyes, face, portrait, rays, occult triangle or tiny detail.",
    "partner": "ONE loyal NORMAL DOG seated attentively beside ONE plain ADULT BOOT AND LOWER TROUSER LEG. Natural adult canine profile, upright ears, complete forelegs, folded hindquarters and one tail curled on the ground. The leg stands beside the dog, clear black gap, no full human portrait or hand. No horn, mutation, petting gesture, anime mascot, fine fur or collar text. Distinct from the mutated-dog taming icon.",
    "pirotechnika": "ONE compact bundle of THREE plain cylindrical EXPLOSIVE STICKS bound by TWO broad bands, with ONE short thick fuse curving upward from the top and ONE simple diagonal wrench beside the bundle. A generic fictional explosives-crafting inventory symbol, no functional internals. Broad black gaps and simple intact shapes. No diagrams, instructions, measurements, labels, digits, fine wiring, flame, person or giant cog.",
    "pistolero": "TWO complete SEMIAUTOMATIC PISTOLS crossed symmetrically, barrels pointing upper-left and upper-right, grips down. Recognizable broad slides, complete grips and clearly empty trigger guards; one plain black cut along each slide. Equal gun size, coherent crossing with black separation. No hands, revolver cylinders, text, engraving, tiny controls, ammunition cloud or human portrait.",
    "podstepny-atak": "ONE complete BARE ADULT HAND secretly holding ONE short DAGGER behind ONE broad hanging CLOAK FOLD. The hand and dagger peek out to the right of the fabric, blade angled downward; coherent grip, thumb, short wrist and full blade. One broad black fabric fold only. Sober concealed dirty attack motif, no whole person, hooded face, victim, wound, blood, fine fabric texture or extra weapon.",
    "pogon": "ONE plain generic ADULT RUNNING in a determined long stride, full natural body in side profile, opposite arm and leg forward. TWO broad short motion strokes behind the back express sustained pursuit. Smooth featureless head, ordinary adult proportions and plain practical clothes, coherent two arms and two legs. No gruff portrait, backpack clutter, anime, exaggerated muscles, decorative arrow or tiny dust marks.",
    "pogromca": "ONE rugged SINGLE-SHOT SHOTGUN in complete side profile, angled gently upward to the right, with one thick barrel, simple break-action receiver, practical shoulder stock and clear empty trigger guard. Below it ONE large SYRINGE-LIKE CHEMICAL SHOTGUN SHELL: stout short cartridge body, one broad plunger end and short pointed tip. Broad black separation makes gun and special shell distinct. A mutant-hunting weapon glyph, no person, wound, gore, labels, tiny mechanism, engraving or extra shell."
}


def main():
    feedback_file = REVIEW / "feedback.json"
    feedback_bytes = feedback_file.read_bytes()
    feedback = json.loads(feedback_bytes)["items"]
    manifest = read(REVIEW / "manifest.json")
    reworks = []
    for prior in (76, 77):
        old = {subject["itemId"]: subject for subject in read(REVIEW / f"candidates/batch-{prior}/batch.json")["subjects"]}
        for entry in read(REVIEW / f"candidates/batch-{prior}/reviewed.json")["active"]:
            if entry["decision"] not in ("revise", "reject"):
                continue
            assert feedback[entry["id"]] == entry["feedback"], "Newer GM feedback"
            subject = dict(old[entry["id"]])
            subject["revisionOf"] = entry
            reworks.append(subject)
    assert [s["key"] for s in reworks] == ["kondycha", "maszyna-do-zabijania", "motywacja"]
    roadmap = read(ROOT / "dev/icons/placeholder-pass/roadmap.json")
    fresh = [subject for group in roadmap["batches"] for subject in group["subjects"]][57:72]
    assert len(fresh) == 15
    already = {item.get("placeholderKey") for item in manifest["items"]}
    assert all(f"{s['kind']}:{s['key']}" not in already for s in fresh)
    groups = {78: reworks + fresh[:6], 79: fresh[6:]}
    styles = ["icons/abilities/amen.webp", "icons/abilities/hakerstwo.webp", "icons/abilities/krwawy-aniol.webp",
              "icons/abilities/jeden-strzal.webp", "icons/abilities/dobra-rada.webp", "icons/abilities/emiter-emp.webp",
              "icons/abilities/bez-tajemnic.webp", "icons/abilities/kocie-kosci.webp", "icons/abilities/dziewiec-zyc.webp"]
    for number, subjects in groups.items():
        here = REVIEW / "candidates" / f"batch-{number}"
        assert not here.exists(), "Batch already allocated"
        assert len(subjects) == 9
        (here / "raw").mkdir(parents=True)
        entries, targets = [], []
        for index, original in enumerate(subjects):
            subject = dict(original)
            subject.update(cell=index + 1, request=MOTIFS[subject["key"]])
            subject.setdefault("itemId", f"batch{number}-{subject['key']}")
            for target in subject["deliveryTargets"]:
                assert sha(ROOT / target["source"]) == target["sourceSha256"]
                targets.append({"key": subject["key"], **target})
            entries.append(subject)
        write(here / "batch.json", {"date": DATE, "batch": number,
              "generalFeedback": "Follow exact saved revisions. Broad white glyphs; varied objects, hands and ordinary adults; no repeated gruff male portraits, anime or dithering.", "subjects": entries})
        references = (["dev/icons/review/" + s["revisionOf"]["selectedSource"] for s in reworks] + styles[3:]
                      if number == 78 else list(styles))
        canvas = Image.new("RGB", (768, 768), "black")
        for index, source in enumerate(references):
            with Image.open(ROOT / source) as original:
                rgba = original.convert("RGBA")
                rgba.thumbnail((256, 256), Image.Resampling.LANCZOS)
                canvas.paste(rgba, ((index % 3) * 256, (index // 3) * 256), rgba)
        canvas.save(here / "raw/style-reference.png")
        role = ("Reference cells 1-3 are EXACT selected revision subjects. Cell 1: preserve the figure and add only the requested upward arrow. Cell 2: preserve seven-skull tally but replace individual diagonal strikes with two continuous HORIZONTAL row strikes. Cell 3: entirely replace megaphone/die with the requested coach and exhausted boxer. Reference cells 4-9 are STYLE ONLY: create the new subjects below. Specific requested arrow and strike lines override general decorative-mark avoidance."
                if number == 78 else "ALL nine reference cells are STYLE ONLY. Create nine entirely NEW contents as listed below. Keep object contours broad, anatomical proportions natural and detail sparse for 16-pixel icons.")
        prompt = GENERAL + role + "\nROW-MAJOR CONTENTS:\n" + "\n".join(f"{s['cell']}. {s['key']}: {s['request']}" for s in entries)
        write(here / "prompts.json", {"generator": "OpenAI built-in image generation", "date": DATE,
              "reference": "raw/style-reference.png", "role": role, "atlas": prompt, "targetedCorrections": []})
        write(here / "style-reference.json", {"role": role, "sources": [{"source": source, "sha256": sha(ROOT / source)} for source in references]})
        write(here / "references.json", {"role": "Exact native targets, not style inputs", "files": targets})
        write(here / "incoming.json", {"date": DATE, "batch": number,
              "feedbackSha256": hashlib.sha256(feedback_bytes).hexdigest(), "priorReviewItems": len(manifest["items"]),
              "priorResolvedItems": sum(item.get("status") == "resolved" for item in manifest["items"]),
              "revisionCount": sum("revisionOf" in s for s in entries), "freshCount": sum("revisionOf" not in s for s in entries),
              "rejectedConcepts": 0, "remainingPlaceholderFiles": 100, "remainingPlaceholderSubjects": 99})
        print(f"Batch {number}: " + ", ".join(s["key"] for s in entries))
    assert feedback_file.read_bytes() == feedback_bytes


if __name__ == "__main__":
    main()
