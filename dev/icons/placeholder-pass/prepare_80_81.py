"""Freeze seven saved revisions and eleven fresh subjects; never rerun."""
import hashlib
import json
from PIL import Image
from prepare_70_71 import GENERAL, ROOT, REVIEW, read, write, sha

DATE = "2026-10-16"
MOTIFS = {
    "mutant-na-sniadanie": "NEW CONCEPT for reference cell 1: a SINGLE DEAD NONHUMAN MUTANT HEAD as a flat symbolic trophy emblem, one blunt horn, misshapen heavy cranium, broad muzzle, one tusk and a large TONGUE hanging from the slack open mouth. ONE complete hunting KNIFE pins the head vertically from above, handle clearly visible at top. This is a NON-GRAPHIC WHITE STENCIL: clean flat lower silhouette, no neck tissue or cross-section, no blood, gore, realistic wounds or exposed flesh. No human head, body, hand, plaque, extra weapon or tiny teeth. The head and knife form one compact coherent emblem with broad negative space.",
    "nie-do-zdarcia": "NEW NON-GRAPHIC toughness concept replacing the bare forearm in reference cell 2. ONE BURLY generic ADULT from knees upward, determined lowered head and calm expression, casually TUCKING LOOSE ABDOMINAL BANDAGES back UNDER THE FRONT OF THEIR SHIRT with BOTH HANDS. Show exactly TWO broad looped CLOTH STRIPS across the waist and one flat bandage end, clearly fabric; the shirt behind them remains intact and covers the belly. Broad strong adult anatomy, plain practical clothes, no beard or anime. Preserve the idea of casually patching oneself up through a restrained bandage gesture. NO exposed internal organs, open wound, blood, gore, visible abdominal cavity or anatomical injury. Hands, wrists and elbows complete and coherent.",
    "oswajanie-zwierzat": "REVISION of reference cell 3. Preserve the same seated dog, petting hand, natural canine proportions and side view. REMOVE THE HORN COMPLETELY. Instead add THREE broad rounded MUTATION BULGES to the dog's forehead, shoulder and flank. Each is a smooth attached bump interrupting the outer contour, with one large simple black separation cut at most, not a horn, spike or texture. Gentle hand naturally rests on the head. No bleeding sores, wound detail, scattered stippling, cute anime mascot or extra limb.",
    "partner": "REVISION of reference cell 4. Preserve the same loyal seated NORMAL DOG and existing plain boot with trouser leg. ADD THE ADULT'S SECOND LOWER LEG AND BOOT beside the first, both feet fully visible and planted on the same ground line. Natural parallel stance, two separate trouser legs with broad black gap, dog looking up beside them. Exactly one dog and TWO complete boots/legs, no full person, hand, mutation, collar text or tiny fur.",
    "pirotechnika": "REVISION of reference cell 5. Preserve the bundle of THREE sticks, TWO broad binding bands and the single short curved fuse. REMOVE THE WRENCH. Replace it with ONE stout simple CHEMISTRY BEAKER beside the bundle and ONE complete DROPPER PIPETTE angled downward over the beaker's open rim. Pipette has a broad bulb, thick stem and short tip; beaker has clear rim, pouring lip and one broad liquid-level cut. Large black separation, no measurement ticks, numbers, labels, fine wires, chemical recipes, construction instructions or flames.",
    "pistolero": "REVISION of reference cell 6. Keep TWO CROSSED SEMIAUTOMATIC PISTOLS pointing upper-left and upper-right, but CORRECT BOTH GUN SHAPES into coherent plain classic service-pistol silhouettes. Each has ONE straight rectangular SLIDE along the top ending at the muzzle, a short rear overhang, a sturdy receiver below, ONE backward-sloping grip below the rear, and ONE rounded TRIGGER GUARD directly in FRONT of that grip with one simple trigger inside. NO bent slide, extra muzzle, reversed grip, protruding rail block or fused receiver. Guns overlap ONLY at the lower grips, with a broad BLACK SEPARATION CUT identifying each complete gun. Equal sizes, two complete barrels and two natural angled grips. No hands, revolver cylinder, tiny controls, text or engraving.",
    "podstepny-atak": "REVISION of reference cell 7. Preserve the cloak fold and ONE ATTACKING HAND gripping a complete downward-pointing dagger. ADD ONE OFF HAND above-left, visibly PINCHING THE CLOAK EDGE AND PULLING IT LEFTWARD to UNCOVER the knife hand on the right. The off hand moves the fabric away; it does NOT hold another weapon or grip the attacking wrist. Two coherent hands, short complete wrists, each with one natural thumb and folded fingers. One broad fabric fold, large black gaps, no face, full person, victim, wound, blood or tiny cloth texture.",
    "renoma": "ONE immaculate formal SUIT JACKET shown frontally from neck opening to waist, NO HEAD. Broad tailored lapels, ONE neat necktie, one large pocket square and two simple front buttons convey expensive presentation and social standing. Clear shoulder outline, sleeves shortened at waist level, sober practical adult garment. Broad white silhouette with black collar and lapel cuts. No portrait, logo, lettering, tiny stitching, luxury brand or ornate jewelry.",
    "reputacja": "TWO complete BARE ADULT HANDS in ONE firm trustworthy HANDSHAKE, centered above ONE large simple COIN with a broad blank center and thick rim. Complete short wrists, coherent overlapping fingers and thumbs, strong black separation around the clasp. A reliable contractor securing better pay. Compact utilitarian emblem, no face, written contract, currency sign, numerals, lettering, tiny fingernails or decorative rays.",
    "rewolwerowiec": "ONE complete classic practical REVOLVER angled upward-right beside ONE stout SIX-ROUND SPEEDLOADER below-left. Clear long straight barrel, round cylinder with two broad flute cuts, natural sloping grip and intact empty trigger guard. Speedloader is a compact round holder with six broad cartridge ends and ONE large central knob, no fine mechanism. Gunslinger quick draw and reload, no hand, face, recognizable movie character, logo, text or engraving.",
    "rusznikarstwo": "ONE complete plain RIFLE RECEIVER AND BARREL clamped securely in a sturdy BENCH VISE, with ONE broad-handled SCREWDRIVER meeting the receiver from above. The rifle points right, with complete shoulder stock on left and simple trigger guard below; vise grips the receiver from beneath. Broad coherent workshop silhouette, just a few large functional cuts. No hands, person, tiny parts, measurements, schematics, instructions, labels or giant cog.",
    "rutyna": "ONE plain generic ADULT SOLDIER WALKING CALMLY in side view, full natural body, practical simple helmet and plain clothes, holding one complete rifle pointed safely DOWN at the side. ONE restrained broad angular impact wedge behind the soldier conveys nearby battle while the figure stays composed. Smooth featureless face, no beard portrait, heroic pose, anime, tiny equipment clutter, ammunition spray, gore or extra limbs.",
    "rzeznik": "ONE complete BARE ADULT HAND gripping ONE large sturdy MEAT CLEAVER raised diagonally. Broad rectangular blade with a single clean cutting edge, short complete grip and coherent fingers/thumb/wrist. A powerful single-weapon melee strike, sober inventory object. No other weapon, victim, wound, blood, gore, face, blade engraving or tiny scratches.",
    "rzuc-bron-i-gleba": "ONE complete BARE ADULT HAND making a firm STOP gesture, PALM OUT with five coherent fingers. Beside it, ONE small plain generic ADULT lies face-down on the ground with hands beside head, and ONE complete dropped pistol lies separately just beyond reach. Compact surrender-to-command emblem. Full natural body, smooth featureless head, broad black gaps. No injury, blood, face portrait, words, speech bubble, lettering or extra person.",
    "samouk": "ONE OPEN PRACTICAL BOOK with TWO broad pages. One page contains ONE large WRENCH silhouette; the other contains ONE simple LIGHT BULB symbol with broad base and two short rays. Thick book spine, complete page edges and generous black cuts. Self-taught skills through study, no text, numerals, tiny page lines, human face, giant cog or decorative border.",
    "saper": "ONE complete BARE ADULT HAND carefully turns a LARGE PADLOCK KEY in ONE sturdy openable MECHANICAL PADLOCK; a small plain CUBE DIE beside it shows three broad pips on its front face. Expertise makes a difficult precise task reliable. Coherent key bow, stem, lock body and shackle; broad black gaps. Not an explosive-disposal diagram. No wires, instructions, labels, numerals, tiny teeth, face or giant cog.",
    "serwisowanie": "ONE sturdy HANDHELD RADIO shown frontally with ONE short broad ANTENNA, a large plain tuning knob and TWO broad speaker slots. A complete SOLDERING IRON with thick handle approaches one simple open SERVICE PANEL at the lower side. Clear coherent device and tool, sparse broad structural cuts only. No person, hand, tiny circuitry, schematic, instructions, markings, text, numerals or giant cog.",
    "skrytka": "ONE rugged BOOT in clear side view with its broad HOLLOW HEEL swung slightly OPEN to reveal ONE short concealed KNIFE lying horizontally in the compartment. One simple hinge and thick heel walls, recognizable intact boot upper and sole. Strong black gap shows hidden storage. No leg, full person, hand, injury, fine laces, labels, measurements or extra weapon."
}


def main():
    feedback_file = REVIEW / "feedback.json"
    feedback_bytes = feedback_file.read_bytes()
    feedback = json.loads(feedback_bytes)["items"]
    manifest = read(REVIEW / "manifest.json")
    reworks = []
    for prior in (78, 79):
        old = {s["itemId"]: s for s in read(REVIEW / f"candidates/batch-{prior}/batch.json")["subjects"]}
        for entry in read(REVIEW / f"candidates/batch-{prior}/reviewed.json")["active"]:
            if entry["decision"] not in ("revise", "reject"):
                continue
            assert feedback[entry["id"]] == entry["feedback"], "Newer GM feedback"
            subject = dict(old[entry["id"]])
            subject["revisionOf"] = entry
            reworks.append(subject)
    assert [s["key"] for s in reworks] == ["mutant-na-sniadanie", "nie-do-zdarcia", "oswajanie-zwierzat", "partner", "pirotechnika", "pistolero", "podstepny-atak"]
    roadmap = read(ROOT / "dev/icons/placeholder-pass/roadmap.json")
    fresh = [s for group in roadmap["batches"] for s in group["subjects"]][72:83]
    assert len(fresh) == 11
    already = {item.get("placeholderKey") for item in manifest["items"]}
    assert all(f"{s['kind']}:{s['key']}" not in already for s in fresh)
    groups = {80: reworks + fresh[:2], 81: fresh[2:]}
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
            if subject["key"] == "nie-do-zdarcia":
                subject["adaptation"] = "Non-graphic alternative: the saved exposed-organ injury request is represented by abdominal bandages tucked under an intact shirt."
            for target in subject["deliveryTargets"]:
                assert sha(ROOT / target["source"]) == target["sourceSha256"]
                targets.append({"key": subject["key"], **target})
            entries.append(subject)
        write(here / "batch.json", {"date": DATE, "batch": number,
              "generalFeedback": "Apply saved revisions, with injury imagery kept non-graphic. Broad white glyphs, varied objects and generic adults; no repeated gruff portraits, anime or dithering.", "subjects": entries})
        references = (["dev/icons/review/" + s["revisionOf"]["selectedSource"] for s in reworks] + styles[7:]
                      if number == 80 else list(styles))
        canvas = Image.new("RGB", (768, 768), "black")
        for index, source in enumerate(references):
            with Image.open(ROOT / source) as original:
                rgba = original.convert("RGBA")
                rgba.thumbnail((256, 256), Image.Resampling.LANCZOS)
                canvas.paste(rgba, ((index % 3) * 256, (index // 3) * 256), rgba)
        canvas.save(here / "raw/style-reference.png")
        role = ("Reference cells 1-7 are the EXACT selected revision sources. Cells 1-2 need entirely new non-graphic concepts; cells 3-7 need the specific object/anatomy corrections listed below. Reference cells 8-9 are STYLE ONLY for the two new subjects. Keep every complete glyph inside its own cell and all injury symbolism flat and non-graphic."
                if number == 80 else "ALL nine reference cells are STYLE ONLY. Create the nine entirely NEW subjects listed below, with broad contours, coherent objects and minimal natural adult faces. No realistic injury imagery.")
        prompt = GENERAL + role + "\nROW-MAJOR CONTENTS:\n" + "\n".join(f"{s['cell']}. {s['key']}: {s['request']}" for s in entries)
        write(here / "prompts.json", {"generator": "OpenAI built-in image generation", "date": DATE,
              "reference": "raw/style-reference.png", "role": role, "atlas": prompt, "targetedCorrections": []})
        write(here / "style-reference.json", {"role": role, "sources": [{"source": source, "sha256": sha(ROOT / source)} for source in references]})
        write(here / "references.json", {"role": "Exact native targets, not style inputs", "files": targets})
        write(here / "incoming.json", {"date": DATE, "batch": number,
              "feedbackSha256": hashlib.sha256(feedback_bytes).hexdigest(), "priorReviewItems": len(manifest["items"]),
              "priorResolvedItems": sum(item.get("status") == "resolved" for item in manifest["items"]),
              "revisionCount": sum("revisionOf" in s for s in entries), "freshCount": sum("revisionOf" not in s for s in entries),
              "rejectedConcepts": 0, "remainingPlaceholderFiles": 88, "remainingPlaceholderSubjects": 88})
        print(f"Batch {number}: " + ", ".join(s["key"] for s in entries))
    assert feedback_file.read_bytes() == feedback_bytes


if __name__ == "__main__":
    main()
