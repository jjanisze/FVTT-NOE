"""Freeze four saved revisions and fourteen fresh subjects; never rerun."""
import hashlib
import json
from PIL import Image
from prepare_70_71 import GENERAL, ROOT, REVIEW, read, write, sha

DATE = "2026-10-16"
MOTIFS = {
    "rzeznik": "REVISION of reference cell 1. Keep the raised arm, upper holding hand and target torso. Move the LOWER KNIFE HAND MUCH LOWER AGAIN, to LOWER CHEST/RIB HEIGHT. Its knife points almost HORIZONTALLY RIGHT, only slightly upward, with the tip aiming at the SIDE OF THE RIBS WELL BELOW THE ARMPIT. NOT at the raised upper arm or the armpit itself. Tip stops short of the shirt with a black gap. Lower the hand and blade together by another full fist height; make this change clearly visible. Change the face to AFRAID: raised inner brow, one widened natural eye and small rounded open mouth, no angry scowl or grin. Same coherent adult, exactly two attacker hands. Fictional threat before contact only: no stabbing, wound, blood, exposed tissue or gore; no anime exaggeration.",
    "szybkie-nogi": "REVISION of reference cell 2. Preserve the same two rugged boots, trouser cuffs and common ground line. SWAP THE FEET: the RIGHT boot is now FLAT on the ground, the LEFT boot is now balanced on its TOE with heel raised HIGH. Both toes still point RIGHT. CROSS THE TWO LOWER LEGS into a clear natural X ABOVE THE ANKLES: the calf entering from upper-LEFT continues diagonally DOWN-RIGHT into the flat right boot, and the calf entering from upper-RIGHT continues diagonally DOWN-LEFT into the toe-balanced left boot. One broad black separation at the crossing identifies which leg is in front. Natural moonwalk stance, exactly two complete boots, no extra leg, airborne step, full person, text or recognizable performer.",
    "szybkosc-kota": "REVISION of reference cell 3. KEEP THE CAT, crouched body, four paws, tail, left-facing head and bullet unchanged. REMOVE EVERY MOTION ARC from the HINDQUARTERS AND TAIL. Show DUCKING OF THE HEAD instead: place TWO short broad DOWNWARD-CURVING MOTION STROKES directly ABOVE and slightly IN FRONT OF THE HEAD AND FRONT SHOULDERS, descending toward the lowered forehead. A third short vertical stroke may sit above the neck. Clear black gaps separate strokes from ears and bullet. No marks behind the rear half of the cat, no vibrating-butt effect, extra tails, arrows, anime, fine fur or injury.",
    "trajektoria": "REVISION of reference cell 4. Retain the existing lower-RIGHT BULLSEYE with its broad ring, four ticks and central dot. Put ONE complete BULLET exactly at the TOP/APEX, the HIGHEST MIDDLE POINT of ONE ballistic arc, pointing HORIZONTALLY RIGHT along the tangent. BEFORE the bullet on the LEFT: ONE continuous thick SOLID curved line rises from lower-left to the bullet's flat base. AFTER the bullet on the RIGHT: exactly THREE broad SEPARATE DASH SEGMENTS descend along the curve toward the retained lower-right bullseye. Solid before, dashed after. Nothing in the arc sits above the apex bullet. Broad stencil diagram, no second bullet, cartridge casing, actual measurements, numbers, labels or extra rings.",
    "ulubiona-bron-zwiadowca": "Complete the favorite-weapon FAMILY: ONE practical complete SCOPED RIFLE angled upward-right, clear shoulder stock, straight barrel, scope and empty trigger guard. ONE thick CIRCULAR FAVORITE BADGE beside the stock contains ONE bold FIVE-POINT STAR cut in black, matching the approved revolver's badge in reference cell 5. Same simple badge scale and white stencil weight, changing only the weapon. No hand, person, engraving, text, numerals, tiny scope fittings or logo.",
    "w-czuly-punkt": "ONE plain headless TRAINING MANNEQUIN TORSO, with shoulder stubs and broad intact chest. ONE thick circular TARGET CROSSHAIR marks its CENTER; ONE short blunt POINTER meets the reticle from lower-right. A schematic precise-strike emblem, no real anatomical labels or injury. Broad simple white shapes with black separation, no face, limbs, organs, wound, gore, lettering, numerals, tiny muscles or extra targets.",
    "wsciekly-cios": "ONE complete powerful BARE CLENCHED FIST smashes ONE stout rectangular STONE BLOCK into exactly TWO large separated chunks. Complete short wrist and coherent thumb/folded fingers, one broad angular impact wedge between fist and block. Forceful furious strike, sober functional silhouette with large black gaps. No person, portrait, extra hand, tiny debris, texture, blood, wound, gore or written marks.",
    "wyczulone-zmysly": "ONE large natural HUMAN EAR beside ONE plain natural HUMAN EYE, staggered diagonally with TWO broad sound-wave arcs between them. External sensory symbols only: ear has two large inner folds, eye one almond contour and round black pupil. Clear strong white masses, generous black space and natural proportions. No whole face, beard portrait, anime lashes, giant stylized eye, gore, tiny wrinkles, text or extra organs.",
    "wyjadacz-zwiadowca": "Veteran-expertise badge FAMILY: ONE sturdy rounded-rectangle SHOULDER PATCH with a thick white border. Its UPPER HALF contains ONE simple FOUR-POINT COMPASS NEEDLE emblem with no letters. Its LOWER HALF contains exactly THREE broad stacked CHEVRONS pointing upward. Broad black gaps separate emblem, chevrons and rim. A fictional scout-veteran patch, same construction as the armored-veteran counterpart. No person, face, numbers, writing, real unit insignia, tiny stitching or decorative laurel.",
    "wyjadacz": "Veteran-expertise badge FAMILY: ONE sturdy rounded-rectangle SHOULDER PATCH with a thick white border. Its UPPER HALF contains ONE simple BODY-ARMOR VEST emblem with two broad plate cuts. Its LOWER HALF contains exactly THREE broad stacked CHEVRONS pointing upward. Broad black gaps separate emblem, chevrons and rim. Same patch proportions, rim and chevron scale as the scout-veteran counterpart; change only the upper emblem. No person, face, letters, numbers, real unit insignia, tiny stitching or laurel.",
    "wyksztalciuch": "ONE plain GRADUATION MORTARBOARD above ONE sturdy SMALL TOOLBOX, with one short broad tassel, a complete carrying handle and two simple lid cuts. A large wrench head and screwdriver handle peek from the open box, broad functional silhouettes only. Learning adds practical skills, not a book motif. No person, face, lettering, numerals, tiny tools, academic logo, fine stitching or giant cog.",
    "z-bara": "TWO generic ADULT UPPER TORSOS in side view. LEFT adult leans their SHOULDER into the RIGHT adult's chest in a powerful SHOULDER SHOVE; the right figure tilts backward off balance with one arm out. Short coherent necks, smooth featureless heads and complete visible arms, plain clothes. One broad contact wedge at the shoulder, large black gaps. Torso-level compact composition, no running legs, gruff portraits, anime, weapon, injury, blood or extra limbs.",
    "za-garsc-gambli": "ONE complete practical SAXOPHONE with a broad flared bell and curved neck above ONE open BUSKER'S HAT containing TWO thick blank COINS. Saxophone has only THREE broad key cuts, sturdy coherent tube and complete mouthpiece. A street performance earns tips, sober compact object emblem. Clear black gaps, no player, face, musical-note lettering, logo, numerals, tiny keys, fine engraving or extra instruments.",
    "zabojczy-cios": "ONE complete BARE CLENCHED FIST strikes ONE simple symbolic SKULL, splitting the skull emblem into TWO broad pieces with a single large crack. Skull has two big eye holes and block jaw, no fine teeth. Complete wrist, coherent thumb/folded fingers, one broad impact wedge. Flat non-graphic deadly-strike symbol, no human body, wound, blood, realistic head injury, gore, tiny fragments or text.",
    "zawolajcie-kolegow": "ONE large complete BARE HAND BECKONS confidently upward, fingers curling inward once, with TWO smaller opposing CLENCHED FISTS above-left and above-right. Exactly three hands with coherent thumbs/fingers and short complete wrists, clear broad black gaps. A fighter challenges multiple opponents to come closer. No whole person, portrait, extra hands, text, numbers, weapons, wounds, gore or decorative arrows.",
    "zawsze-w-siodle": "ONE complete sturdy WESTERN RIDING SADDLE in clear side profile, broad seat, simple pommel and cantle, ONE large hanging STIRRUP and ONE rolled blanket secured behind. Practical adult horse tack, coherent straps simplified into two broad bands. Strong compact silhouette, generous negative space, no rider, horse, portrait, fine leather tooling, tiny stitching, logos or text.",
    "zew-areny": "ONE sturdy hanging ARENA BELL with a large visible clapper and ONE simple broad mounting bracket, flanked by TWO complete raised BARE CLENCHED FISTS. Intact short wrists and natural fingers, thick iron bell rim with one broad black cut. The ring calls combat and crowd energy, sober salvaged equipment. Clear black gaps, no audience faces, gruff fighter portrait, ornate architecture, text, numerals, tiny fittings or gore.",
    "znajomosci": "Exactly THREE plain generic ADULT HEAD-AND-SHOULDER SILHOUETTES form ONE clear SOCIAL NETWORK: one larger silhouette at TOP CENTER, two smaller at lower-left and lower-right. TWO broad straight connector strokes link the top silhouette to the lower pair, with clear black spacing from their heads. Smooth featureless natural adult heads, sober diagram-like icon. No handshake, face detail, beard, anime, labels, numbers, arrows or extra people."
}


def main():
    feedback_file = REVIEW / "feedback.json"
    feedback_bytes = feedback_file.read_bytes()
    feedback = json.loads(feedback_bytes)["items"]
    manifest = read(REVIEW / "manifest.json")
    reworks = []
    for prior in (86, 87):
        old = {s["itemId"]: s for s in read(REVIEW / f"candidates/batch-{prior}/batch.json")["subjects"]}
        for entry in read(REVIEW / f"candidates/batch-{prior}/reviewed.json")["active"]:
            if entry["decision"] not in ("revise", "reject"):
                continue
            assert feedback[entry["id"]] == entry["feedback"], "Newer GM feedback"
            subject = dict(old[entry["id"]])
            subject["revisionOf"] = entry
            reworks.append(subject)
    assert [s["key"] for s in reworks] == ["rzeznik", "szybkie-nogi", "szybkosc-kota", "trajektoria"]
    roadmap = read(ROOT / "dev/icons/placeholder-pass/roadmap.json")
    fresh = [s for group in roadmap["batches"] for s in group["subjects"]][113:127]
    assert len(fresh) == 14
    already = {item.get("placeholderKey") for item in manifest["items"]}
    assert all(f"{s['kind']}:{s['key']}" not in already for s in fresh)
    groups = {88: reworks + fresh[:5], 89: fresh[5:]}
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
        references = (["dev/icons/review/" + s["revisionOf"]["selectedSource"] for s in reworks] + styles[4:]
                      if number == 88 else list(styles))
        canvas = Image.new("RGB", (768, 768), "black")
        for index, source in enumerate(references):
            with Image.open(ROOT / source) as original:
                rgba = original.convert("RGBA")
                rgba.thumbnail((256, 256), Image.Resampling.LANCZOS)
                canvas.paste(rgba, ((index % 3) * 256, (index // 3) * 256), rgba)
        canvas.save(here / "raw/style-reference.png")
        role = ("Reference cells 1-4 are EXACT selected revision sources. Cell 1 needs the knife MUCH LOWER, below the armpit at lower ribs, and an AFRAID expression. Cell 2 swaps boots and crosses lower legs. Cell 3 moves evasion marks from rear to HEAD. Cell 4 places bullet at apex, solid approach and dashed descent. Cells 5-9 are STYLE ONLY; reference cell 5 specifically establishes the approved favorite-weapon badge. Output cell 9 begins a veteran-patch family: same thick rounded rectangle, upper emblem and three lower chevrons as its counterpart."
                if number == 88 else "ALL nine reference cells are STYLE ONLY. Create the new subjects below. Output cell 1 is the armored counterpart of the veteran-patch family: thick rounded rectangle, upper emblem and three lower chevrons. Avoid repeated handshakes, books, gruff portraits, anime and fine detail.")
        prompt = GENERAL + role + "\nROW-MAJOR CONTENTS:\n" + "\n".join(f"{s['cell']}. {s['key']}: {s['request']}" for s in entries)
        write(here / "prompts.json", {"generator": "OpenAI built-in image generation", "date": DATE,
              "reference": "raw/style-reference.png", "role": role, "atlas": prompt, "targetedCorrections": []})
        write(here / "style-reference.json", {"role": role, "sources": [{"source": source, "sha256": sha(ROOT / source)} for source in references]})
        write(here / "references.json", {"role": "Exact native targets, not style inputs", "files": targets})
        write(here / "incoming.json", {"date": DATE, "batch": number,
              "feedbackSha256": hashlib.sha256(feedback_bytes).hexdigest(), "priorReviewItems": len(manifest["items"]),
              "priorResolvedItems": sum(item.get("status") == "resolved" for item in manifest["items"]),
              "revisionCount": sum("revisionOf" in s for s in entries), "freshCount": sum("revisionOf" not in s for s in entries),
              "rejectedConcepts": 0, "remainingPlaceholderFiles": 44, "remainingPlaceholderSubjects": 44})
        print(f"Batch {number}: " + ", ".join(s["key"] for s in entries))
    assert feedback_file.read_bytes() == feedback_bytes


if __name__ == "__main__":
    main()
