"""Freeze nine saved revisions and nine fresh subjects; never rerun."""
import hashlib
import json
from PIL import Image
from prepare_70_71 import GENERAL, ROOT, REVIEW, read, write, sha

DATE = "2026-10-16"
MOTIFS = {
    "rzeznik": "REVISION of reference cell 1. Preserve the raised arm, upper holding hand, target torso and angry threatened expression EXACTLY. Change ONLY the knife hand: LOWER that hand by roughly ONE FIST HEIGHT and angle its complete short knife UPWARD toward the ARMPIT where the raised arm joins the torso. The tip stops SHORT of the body with a clear black gap. It must aim BELOW the upper arm, not at the biceps. Same two attacker hands and one target, coherent fingers/grip, no extra limb. Fictional threat before contact only: no stabbing, wound, blood, gore or exposed tissue.",
    "serwisowanie": "ENTIRELY NEW SUBJECT replacing the radio in reference cell 2. ONE old practical CRT TELEVISION viewed from the REAR in simple three-quarter view, its BACK COVER REMOVED and propped beside it. Broad boxy cabinet on two short feet, TWO short rabbit-ear ANTENNA RODS above, one large rounded CRT tube housing visible inside and ONE simple rectangular circuit-board block below. Detached back cover has just TWO broad vent slots. ONE complete sturdy screwdriver rests beside the base. Sparse coherent solid shapes, no detailed wiring, circuit schematic, text, numbers, tiny components, radio, hands or face.",
    "spieprzysz-to": "REVISION of reference cell 3. Keep the head angle, pointing hand, speech strokes and sneering mockery concept, but REMOVE THE ANIME/CARTOON FACE. Redraw as an ordinary natural ADULT with rounded skull, plain SHORT CLOSE-CROPPED HAIR, normal small eye, modest nose and ordinary jaw. ONE broad raised eyebrow and ONE smaller natural open half-smile with a raised lip corner convey scorn. Remove swept/spiky fringe, exaggerated hooked brow, giant crescent grin, oversized tooth shape and stylized sharp cheek. No beard or gruff survivor portrait, idealized hero face, manga or tiny wrinkles. Broad sparse stencil cuts only; coherent hand stays unchanged. No dice.",
    "stylowa": "REVISION of reference cell 4. Keep the aviator sunglasses and heavy chain, but LOWER THE NECKLACE to where it hangs on an INVISIBLE WEARER'S NECK, well BELOW the glasses: leave a vertical black gap at least ONE FULL LENS HEIGHT between glasses and chain. Necklace must NOT attach to the glasses' temples. ADD ONE fancy practical BASEBALL CAP ABOVE THE SUNGLASSES, broad curved bill, six-panel crown simplified into two large cuts, ONE bold decorative stripe and NO logo. Three separate wearable items arranged as cap at top, glasses at eye level, necklace low at collar level. No human face, words, tiny seams, sparkle or extra jewelry.",
    "szalencza-szarza": "ENTIRELY NEW NONHUMAN CONCEPT: ONE realistic powerful BULL CHARGING to the RIGHT, head lowered with TWO broad forward horns, heavy shoulders, natural compact body and four complete bovine legs. ONE long tail sweeps behind, TWO short broad motion strokes convey the reckless surge. Natural animal anatomy and one small eye cut, sober strong white silhouette with sparse black cuts. NO RUNNING HUMAN, portrait, cartoon mascot, anime, gore, nose-ring, fine fur or decorative arrow.",
    "szybkie-badanie": "ENTIRELY NEW CONCEPT: ONE generic OLD-FASHIONED DETECTIVE in a plain DEERSTALKER CAP and short cape, SPRINTING while examining the GROUND through ONE large MAGNIFYING GLASS. Full natural adult body in side view facing RIGHT, torso leaning forward, one knee lifted and other leg driving behind. One complete hand holds the magnifier low just in FRONT of the leading foot; the small plain face looks DOWN through the lens. Other arm balances naturally behind. Two broad short motion strokes, no actor likeness, named character, detailed face, beard portrait, anime, book or extra limbs. Complete hat, lens and handle.",
    "szybkie-nogi": "REVISION of reference cell 7. Keep the SAME rugged boots and short trouser legs, but pose them in a classic MOONWALK SLIDE on ONE common ground line. BOTH toes point RIGHT. The LEFT/REAR BOOT stays completely FLAT and slides backward LEFT; the RIGHT/FRONT BOOT balances on its TOE with heel raised HIGH, sole sloping upward at a steep angle. Natural ankle bend and calf stance; neither boot is airborne. Two broad short motion strokes trail behind the sliding flat boot. Exactly two intact boots, same broad details, no full person, recognizable performer, text or extra feet.",
    "szybkie-rece": "REVISION of reference cell 8. Preserve the TWO real hands, their two toggles and one control box. Make the hands move VERY FAST using TWO broad parallel CURVED SPEED STROKES behind EACH wrist, plus ONE short OFFSET PARTIAL CONTOUR echo beside each hand. Real hands remain solid WHITE and anatomically coherent. Motion echoes are separated broad white arcs, NOT extra complete ghost hands or fingers. Keep both switches and box unchanged, clean broad black gaps. No grey photographic blur, gradient, dithering, thin streaks, extra arms, text or numbers.",
    "szybkosc-kota": "REVISION of reference cell 9. Keep the same realistic CAT CROUCH, four legs, long tail, left-facing orientation and bullet passing above. ADD THREE broad CURVED EVASION STROKES behind the cat's back and hindquarters, sweeping DOWNWARD around its body to show a quick dodge beneath the bullet. Strokes stay clearly separate from the complete cat, with no arrowheads or extra tails. Preserve natural animal proportions and one small eye cut. No anime mascot, fine fur, injury, gore, text or extra animal.",
    "smiertelna-obelga": "ONE complete BARE ADULT HAND making the same clear upright MIDDLE-FINGER INSULT gesture as the established insult-icon family. Above-right sits ONE small broad SPEECH BUBBLE containing ONE simple BLACK SKULL symbol, representing psychologically devastating words. Natural folded fingers and thumb, short complete wrist, strong black gap between hand and bubble. Skull has two large eye holes and block jaw, no fine teeth. No words, numerals, gore, severed parts, face, anime, extra fingers or tiny fingernails.",
    "tarcza-wiary": "TWO complete natural ADULT PRAYING HANDS joined palm-to-palm INSIDE ONE thick SHIELD OUTLINE. Short wrists, coherent fingers and thumbs, broad black gap separates hands from shield rim. A compact symbol of faith providing protection without worn armor. Sparse broad anatomical cuts, no deity portrait, specific religious emblem, person, plate armor, text, numerals, fine fingernails or decorative rays.",
    "trajektoria": "ONE complete pointed BULLET follows ONE broad curved BALLISTIC ARC that ends at ONE simple TARGET CROSSHAIR on the right. Bullet sits along the arc near its high middle section and points down-right along the curve; complete short projectile with flat base, no cartridge casing. Large black gaps and a single clear path. Sober generic aim-calculation emblem, no actual measurements, formula, numerals, coordinates, diagram labels, gun, face or decorative arrows.",
    "trening-w-zbroi": "ONE generic ADULT in a thick practical ARMOR VEST doing a PUSH-UP in side view, body straight, two complete hands braced on the ground and toes behind. ONE small plain ANVIL rests stably across the upper back as an exaggerated training load. Vest has just two broad plate cuts, anvil one stout base and one short horn. Natural adult anatomy, featureless head, broad black gaps. No gruff portrait, anime, fine armor texture, injury, blood, text or extra limbs.",
    "truciciel": "ONE stout plain POISON VIAL with a small BLACK SKULL emblem beside ONE complete practical DAGGER angled upward. ONE broad chemical DROPLET hangs near the blade tip without a victim. Clear stopper, intact blade, guard and grip; skull simplified to two eye holes and block jaw. Compact fictional poison-weapon inventory emblem, no chemical names, recipes, instructions, measurements, hands, face, blood, gore or tiny etching.",
    "trzeci-atak": "Exactly THREE complete BARE CLENCHED FISTS staggered diagonally as THREE successive punches. Each has one short complete wrist, coherent thumb over folded fingers and only two broad knuckle cuts. ONE short broad motion stroke behind each fist. Equal robust visual weight and clear black gaps, consistent with the existing two-punch icon family. No whole person, face, extra hands, gloves, numerals, text, injury or gore.",
    "twardosc": "ONE broad intact HUMAN HEART SYMBOL, simple familiar heart outline, centered inside ONE sturdy upright HORSESHOE with four large nail holes. Thick unbroken heart silhouette and clear black gap around it; luck and resilience against death. Sober compact charm consistent with the luck-icon family, no dice. No exposed anatomical organ, gore, face, lettering, numerals, tiny texture, sparkling stars or extra clover.",
    "ulubiona-bron-twardziel": "ONE complete sturdy SIX-SHOT REVOLVER angled upward-right, with a full straight barrel, clear cylinder, natural grip and empty trigger guard. ONE small thick CIRCULAR FAVORITE BADGE beside the grip contains ONE bold FIVE-POINT STAR cut into its face. Broad practical weapon silhouette, sparse functional black cuts and clear badge gap. Favorite-weapon family uses the same star badge across variants. No hand, portrait, engraving, tiny controls, text, logos or cartoon sparkle.",
    "ulubiona-bron-zlodziej": "ONE complete practical TACTICAL KNIFE angled upward-right, broad short blade, simple guard and intact wrapped grip with two large band cuts. ONE small thick CIRCULAR FAVORITE BADGE beside the grip contains ONE bold FIVE-POINT STAR cut into its face, matching the previous cell's badge shape and scale. Clear black gap, sober utilitarian favorite-weapon family. No hand, portrait, wound, blood, fine serrations, text, logos or cartoon sparkle."
}


def main():
    feedback_file = REVIEW / "feedback.json"
    feedback_bytes = feedback_file.read_bytes()
    feedback = json.loads(feedback_bytes)["items"]
    manifest = read(REVIEW / "manifest.json")
    reworks = []
    for prior in (84, 85):
        old = {s["itemId"]: s for s in read(REVIEW / f"candidates/batch-{prior}/batch.json")["subjects"]}
        for entry in read(REVIEW / f"candidates/batch-{prior}/reviewed.json")["active"]:
            if entry["decision"] not in ("revise", "reject"):
                continue
            assert feedback[entry["id"]] == entry["feedback"], "Newer GM feedback"
            subject = dict(old[entry["id"]])
            subject["revisionOf"] = entry
            reworks.append(subject)
    assert [s["key"] for s in reworks] == ["rzeznik", "serwisowanie", "spieprzysz-to", "stylowa", "szalencza-szarza", "szybkie-badanie", "szybkie-nogi", "szybkie-rece", "szybkosc-kota"]
    roadmap = read(ROOT / "dev/icons/placeholder-pass/roadmap.json")
    fresh = [s for group in roadmap["batches"] for s in group["subjects"]][104:113]
    assert len(fresh) == 9
    already = {item.get("placeholderKey") for item in manifest["items"]}
    assert all(f"{s['kind']}:{s['key']}" not in already for s in fresh)
    groups = {86: reworks, 87: fresh}
    styles = ["icons/abilities/obelga.webp", "icons/abilities/hakerstwo.webp", "icons/abilities/krwawy-aniol.webp",
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
              "generalFeedback": "Follow specific saved revisions. Broad white glyphs, no anime or repeated running humans; use requested moonwalk, detective and fast-motion poses with natural anatomy.", "subjects": entries})
        references = (["dev/icons/review/" + s["revisionOf"]["selectedSource"] for s in reworks]
                      if number == 86 else list(styles))
        canvas = Image.new("RGB", (768, 768), "black")
        for index, source in enumerate(references):
            with Image.open(ROOT / source) as original:
                rgba = original.convert("RGBA")
                rgba.thumbnail((256, 256), Image.Resampling.LANCZOS)
                canvas.paste(rgba, ((index % 3) * 256, (index // 3) * 256), rgba)
        canvas.save(here / "raw/style-reference.png")
        role = ("ALL nine reference cells are EXACT selected revision sources. Follow each requested correction. Cell 2 replaces the radio ENTIRELY with an open-backed CRT TV; cell 5 replaces the running human ENTIRELY with a charging bull; cell 6 replaces the robot with a generic detective sprinting while inspecting the ground. Specific requested moonwalk and motion strokes override general avoidance of decorative marks, but preserve pure white stencil style."
                if number == 86 else "ALL nine reference cells are STYLE ONLY. Create the entirely NEW subjects below. Reference cell 1 also establishes the existing insult-hand family gesture. Output cells 8-9 must share the same simple favorite-star badge, changing only the weapon. No dice, text, gore, gruff portrait default or anime.")
        prompt = GENERAL + role + "\nROW-MAJOR CONTENTS:\n" + "\n".join(f"{s['cell']}. {s['key']}: {s['request']}" for s in entries)
        write(here / "prompts.json", {"generator": "OpenAI built-in image generation", "date": DATE,
              "reference": "raw/style-reference.png", "role": role, "atlas": prompt, "targetedCorrections": []})
        write(here / "style-reference.json", {"role": role, "sources": [{"source": source, "sha256": sha(ROOT / source)} for source in references]})
        write(here / "references.json", {"role": "Exact native targets, not style inputs", "files": targets})
        write(here / "incoming.json", {"date": DATE, "batch": number,
              "feedbackSha256": hashlib.sha256(feedback_bytes).hexdigest(), "priorReviewItems": len(manifest["items"]),
              "priorResolvedItems": sum(item.get("status") == "resolved" for item in manifest["items"]),
              "revisionCount": sum("revisionOf" in s for s in entries), "freshCount": sum("revisionOf" not in s for s in entries),
              "rejectedConcepts": 0, "remainingPlaceholderFiles": 58, "remainingPlaceholderSubjects": 58})
        print(f"Batch {number}: " + ", ".join(s["key"] for s in entries))
    assert feedback_file.read_bytes() == feedback_bytes


if __name__ == "__main__":
    main()
