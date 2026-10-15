"""Freeze six saved revisions and twelve fresh subjects; never rerun."""
import hashlib
import json
from PIL import Image
from prepare_70_71 import GENERAL, ROOT, REVIEW, read, write, sha

DATE = "2026-10-16"
MOTIFS = {
    "szybkie-nogi": "REVISION of reference cell 1. PRESERVE EXACTLY the crossed lower legs and two right-facing rugged boots: FLAT boot at RIGHT, TOE-BALANCED boot at LEFT with heel raised. Add TWO unmistakable short broad directional MOTION ARROWS beside the boots, specifically requested as functional motion notation: beside the front flat RIGHT boot, an arrow points LEFT, showing that foot sliding BACKWARD; beside the rear toe-balanced LEFT boot, a separate arrow points RIGHT, showing that foot sliding FORWARD. Keep these two arrows visibly separated at different heights so they cannot merge or suggest both feet going the same way. Arrows are simple sober diagram strokes, no decorative or playful treatment. Do not change the boot pose, crossing, anatomy or ground line; exactly two complete boots, no full person, text or recognizable performer.",
    "trajektoria": "REVISION of reference cell 2. Keep the entire composition: single right-facing bullet at the top apex, solid rising approach on LEFT, THREE thick separated dashed descending segments on RIGHT, and bullseye at lower-RIGHT. The ONLY change: extend the LAST descending dash THROUGH the upper target rim and all the way to the EXACT CENTRAL DOT of the bullseye. Path endpoint and central dot MUST TOUCH AND COINCIDE. Do not stop at an outer ring, tick or black gap; do not overshoot beyond center. Keep the existing target, ticks, bullet and curve positions. Broad unlabelled stencil diagram, no measurements, numbers, labels, extra rings or second bullet.",
    "za-garsc-gambli": "REVISION of reference cell 3. Preserve the saxophone, hat and composition. Replace BOTH COINS inside the busker's hat with TWO COMPLETE RIFLE CARTRIDGES standing at slight opposite angles, each with a broad pointed bullet tip, long straight casing and thick flat base. Their tips project clearly above the hat opening. Remove every coin circle. Exactly two cartridges and one saxophone and one hat. Keep all shapes broad and readable, no player, face, tiny markings, engraving, text, logos or extra instruments.",
    "zawolajcie-kolegow": "REVISION of reference cell 4. Preserve both small opposing fists above and the foreground beckoning gesture. Rotate ONLY the LARGE FOREGROUND HAND around its VERTICAL AXIS so its PALM FACES THE VIEWER. Do NOT turn the hand upside down. Wrist remains below, fingertips curl inward at the top in the same beckoning gesture, but show the broad PALM and one palm crease, NOT the backs of fingers or fingernails. Thumb is on the viewer's RIGHT after the rotation. Exactly one coherent thumb and four coherent fingers, some fingers may overlap naturally. Two upper fists stay unchanged. Large black gaps and natural adult anatomy, no extra hands, whole person, face, lettering or gore.",
    "zawsze-w-siodle": "RECONCEPTUALIZE reference cell 5 entirely. ONE ordinary adult COWBOY peacefully ASLEEP while still sitting securely in a saddle on ONE calm standing HORSE in side profile. Cowboy slumps naturally forward, forearms resting on the horse's neck and broad hat shading the lowered face; both legs hang naturally at the horse's sides, with ONE visible broad boot in a stirrup. The calm horse has a complete body, simple head, four coherent legs and one tail. Broad compact white glyph, very sparse tack, clear black separations between rider, saddle and horse. Unusual but grounded asleep-in-the-saddle situation, no beard portrait, anime, comedy exaggeration, floating limbs, fine hair, detailed scenery, text or logos.",
    "zew-areny": "REVISION of reference cell 6: COMPLETELY REPLACE THE BELL AND BRACKET with a ROARING AUDIENCE of exactly THREE ordinary ADULT HEAD-AND-SHOULDER FIGURES behind ONE low broad arena rail. Center spectator raises BOTH FISTS, outer spectators each raise ONE arm in cheering. Exactly four raised arms total, each clearly attached to its own torso; no floating hands or extra fingers. Three natural adult heads, two tiny broad open-mouth cuts convey cheering, no detailed faces. Broad compact crowd silhouette with clear black gaps and simple plain clothing. No bell, bracket, gruff bearded portraits, anime, tiny crowd texture, text, logos or gore.",
    "zryw": "ONE stout complete STOPWATCH with ONE thick LIGHTNING BOLT cut in black inside its broad white circular face. One broad top button and two short shoulder buttons; no hands or other face markings. Action burst and extra effort as a compact sober object emblem. Large simple shapes and clear negative space, no person, running legs, arrows, dice, numerals, letters, thin chain or detailed clockwork.",
    "zwinnosc-szczura": "ONE realistically proportioned adult RAT climbing ONE thick vertical ROPE, body viewed from the side, head upward, exactly four natural small paws gripping the rope. One rounded ear, one small eye, pointed muzzle and one long curved tail complete its silhouette. Broad simple masses, two large rope cuts at most, generous black gaps. Agile climbing animal, no cute mascot, anime face, fine fur, whisker texture, extra limbs, decorative frame, writing or numbers.",
    "brutal": "CLASS EMBLEM: ONE powerful complete BARE CLENCHED FIST wrapped in THREE broad BROKEN CHAIN LINKS, with TWO clearly snapped chain ends beside the short wrist. Strong natural hand anatomy, coherent thumb and folded fingers, solid masses and broad black separations. Brute strength and berserk freedom, sober compact glyph. No person, head, beard portrait, armor, fine chain, text, real insignia, blood or gore.",
    "cwaniak": "CLASS EMBLEM: TWO overlapping complete PLAYING CARDS angled slightly apart. The FRONT card carries ONE large black CLUBS pip; the rear card shows ONE large black SPADES pip in its exposed portion. Thick white card masses with broad black separation at overlap. Cunning and luck in a sober compact practical emblem. No letters, numbers, joker face, person, dice, tiny corner indices, textures or decorative frame.",
    "spec": "CLASS EMBLEM: ONE complete practical OPEN-END WRENCH lies diagonally across ONE square CIRCUIT CHIP with exactly TWO thick short connector pins on each of its four sides. Wrench has a broad open jaw and complete handle; broad black cut separates the overlapping objects. Technical expertise, simple sturdy white masses. No fine circuitry, giant cog, person, face, lettering, numbers, labels or extra tools.",
    "twardziel": "CLASS EMBLEM: ONE sturdy BODY-ARMOR VEST with TWO broad horizontal plate cuts, behind ONE complete practical SHOTGUN lying diagonally across it. Shotgun has a clear shoulder stock, one straight barrel, thick pump grip and empty trigger guard, simplified into broad masses. Durable martial survivor represented by equipment, compact white glyph. No person, face, helmet, lettering, numbers, engraved parts, tiny fittings, blood or injury.",
    "zlodziej": "CLASS EMBLEM: ONE sturdy OPEN PADLOCK with its thick shackle visibly lifted free at one side. ONE broad simple LOCKPICK is inserted into the large keyhole from lower-right. Complete coherent lock and pick, generous black separation and thick white masses. Sober thief's tools emblem, no hooded portrait, hand, person, fine key teeth, actual lock instructions, letters, numerals or extra props.",
    "zwiadowca": "CLASS EMBLEM: ONE complete practical pair of BINOCULARS above ONE broad BOOTPRINT. Binoculars have two thick barrels, two round objective lenses and one central hinge. Bootprint has a large heel, broad sole and only TWO black tread cuts. Scouting and tracking, sturdy compact white glyph with clear black separation between objects. No person, face, dangling thin straps, tiny fittings, letters, numbers or map labels.",
    "chemik": "PROFESSION EMBLEM: ONE stout ROUND-BOTTOM LAB FLASK with a short neck, thick rim and TWO large bubble holes in its broad liquid mass. ONE complete DROPPER PIPETTE with a broad rubber bulb lies diagonally across the flask, separated by a broad black cut. Practical chemistry, sparse compact white object glyph. No formulas, recipes, labels, measurements, person, face, skull, tiny bubbles, extra glassware or lettering.",
    "ganger": "PROFESSION EMBLEM: ONE complete improvised BASEBALL BAT bearing THREE broad blunt STUDS crosses ONE MOTORCYCLE WHEEL with THREE thick spokes. Bat has a complete broad grip and knob; wheel is a sturdy tire ring with clear open gaps. Road gang equipment, sober compact white silhouette with strong black separation. No person, face, real gang insignia, swastika, text, logos, fine tire tread, tiny nails, thin chains or gore.",
    "gladiator": "PROFESSION EMBLEM: ONE salvaged ARENA HELMET with a practical CAGE FACEGUARD made of THREE broad vertical bars and one thick brow, beside ONE complete BARE CLENCHED FIST with short wrist. Helmet contains no visible face. Strong compact white masses, natural coherent fist, broad black gaps. Improvised arena fighter equipment, no fantasy ornament, feather, horns, gruff portrait, fine mesh, tiny rivets, lettering, blood or gore.",
    "gwiazda": "PROFESSION EMBLEM: ONE complete handheld MICROPHONE lies diagonally across ONE bold FIVE-POINT STAR. Microphone has a broad rounded grille with only TWO thick black grille cuts, a complete stout handle and one short broad cable curve. Stage performance and fame, compact sober white object silhouette with broad black separation. No person, face, fine grille mesh, lettering, musical notes, logo, numbers, sparkle clutter or decorative frame."
}


def main():
    feedback_file = REVIEW / "feedback.json"
    feedback_bytes = feedback_file.read_bytes()
    feedback = json.loads(feedback_bytes)["items"]
    manifest = read(REVIEW / "manifest.json")
    reworks = []
    for prior in (88, 89):
        old = {s["itemId"]: s for s in read(REVIEW / f"candidates/batch-{prior}/batch.json")["subjects"]}
        for entry in read(REVIEW / f"candidates/batch-{prior}/reviewed.json")["active"]:
            if entry["decision"] not in ("revise", "reject"):
                continue
            assert feedback[entry["id"]] == entry["feedback"], "Newer GM feedback"
            subject = dict(old[entry["id"]])
            subject["revisionOf"] = entry
            reworks.append(subject)
    assert [s["key"] for s in reworks] == ["szybkie-nogi", "trajektoria", "za-garsc-gambli", "zawolajcie-kolegow", "zawsze-w-siodle", "zew-areny"]
    roadmap = read(ROOT / "dev/icons/placeholder-pass/roadmap.json")
    fresh = [s for group in roadmap["batches"] for s in group["subjects"]][127:139]
    assert len(fresh) == 12
    already = {item.get("placeholderKey") for item in manifest["items"]}
    assert all(f"{s['kind']}:{s['key']}" not in already for s in fresh)
    groups = {90: reworks + fresh[:3], 91: fresh[3:]}
    styles = ["icons/abilities/amen.webp", "icons/abilities/hakerstwo.webp", "icons/abilities/krwawy-aniol.webp",
              "icons/abilities/jeden-strzal.webp", "icons/abilities/ulubiona-bron-twardziel.webp", "icons/abilities/emiter-emp.webp",
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
              "generalFeedback": "Apply exact saved revisions. Broad sober white glyphs, natural adult anatomy, no anime or gruff portrait default; varied practical objects and symbols.", "subjects": entries})
        references = (["dev/icons/review/" + s["revisionOf"]["selectedSource"] for s in reworks] + styles[6:]
                      if number == 90 else list(styles))
        canvas = Image.new("RGB", (768, 768), "black")
        for index, source in enumerate(references):
            with Image.open(ROOT / source) as original:
                rgba = original.convert("RGBA")
                rgba.thumbnail((256, 256), Image.Resampling.LANCZOS)
                canvas.paste(rgba, ((index % 3) * 256, (index // 3) * 256), rgba)
        canvas.save(here / "raw/style-reference.png")
        role = ("Reference cells 1-6 are EXACT selected revision sources: 1 preserve boots but add opposite moonwalk motion; 2 extend arc endpoint to EXACT bullseye center; 3 replace coins with cartridges; 4 turn only foreground hand to palm-facing; 5 replace saddle with sleeping mounted cowboy; 6 replace bell with roaring audience. Reference cells 7-9 are STYLE ONLY for the new bottom-row subjects. Functional motion arrows in cell 1 are specifically requested and override the general restriction on decorative arrows."
                if number == 90 else "ALL nine reference cells are STYLE ONLY. Create the nine NEW class and profession emblems below. Keep their white glyph weight consistent; use practical objects with large black gaps, no repeated gruff portraits, anime or fine detail.")
        prompt = GENERAL + role + "\nROW-MAJOR CONTENTS:\n" + "\n".join(f"{s['cell']}. {s['key']}: {s['request']}" for s in entries)
        write(here / "prompts.json", {"generator": "OpenAI built-in image generation", "date": DATE,
              "reference": "raw/style-reference.png", "role": role, "atlas": prompt, "targetedCorrections": []})
        write(here / "style-reference.json", {"role": role, "sources": [{"source": source, "sha256": sha(ROOT / source)} for source in references]})
        write(here / "references.json", {"role": "Exact native targets, not style inputs", "files": targets})
        write(here / "incoming.json", {"date": DATE, "batch": number,
              "feedbackSha256": hashlib.sha256(feedback_bytes).hexdigest(), "priorReviewItems": len(manifest["items"]),
              "priorResolvedItems": sum(item.get("status") == "resolved" for item in manifest["items"]),
              "revisionCount": sum("revisionOf" in s for s in entries), "freshCount": sum("revisionOf" not in s for s in entries),
              "rejectedConcepts": 0, "remainingPlaceholderFiles": 32, "remainingPlaceholderSubjects": 32})
        print(f"Batch {number}: " + ", ".join(s["key"] for s in entries))
    assert feedback_file.read_bytes() == feedback_bytes


if __name__ == "__main__":
    main()
