"""Freeze nine reworks (including one rejected concept) and nine fresh subjects."""
import hashlib
import json
from PIL import Image
from prepare_70_71 import GENERAL, ROOT, REVIEW, read, write, sha

DATE = "2026-10-15"
MOTIFS = {
    "jak-dbasz-tak-masz": "REVISION of reference cell 1. Preserve handgun, two hands, wiping cloth and oil can. Fix the HOLDING HAND'S INDEX FINGER emphatically: ONE long STRAIGHT index finger lies ON THE OUTSIDE TOP EDGE OF THE TRIGGER GUARD and extends FORWARD OVER AND BEYOND THE FRONT OF THAT GUARD toward the muzzle by a full fingertip length. Show the finger as a clear horizontal white bar immediately above the guard, with its entire tip visibly PAST the guard's front curve. The trigger guard's enclosed opening remains an EMPTY BLACK OVAL below that straight finger, with NO fingertip curled into the hole and no contact with the trigger. Remaining fingers wrap the grip naturally. Keep the wiping hand above the slide; no new hand, finger or weapon.",
    "jezdziec": "REVISION of reference cell 2. Redraw the rider as a generic adult COWBOY SHOWMAN on the same complete realistic horse. The rider sits naturally and proudly balanced in the saddle, raises ONE plain broad-brimmed cowboy HAT above the head in a showman salute, and extends the other arm loosely outward in a confident flourish. Head remains small and featureless, ordinary adult torso, coherent shoulders/elbows, hips seated, natural bent knee and boot in the stirrup. No hands holding reins. Horse in a poised side-view stance with one foreleg slightly lifted, four complete natural legs and one tail. Generic western showmanship, no recognizable actor or character, beard portrait, anime, toy proportions or tiny tack.",
    "klusownik": "REVISION of reference cell 3. Completely simplify the trap to TWO PARTS in clean TOP-DOWN view: one CONTINUOUS SEMICIRCULAR STEEL JAW on the LEFT and one CONTINUOUS SEMICIRCULAR JAW on the RIGHT. Each jaw has THREE broad teeth attached directly to that SAME uninterrupted curved steel arc. No split tooth clusters or four quarter-jaws. Both jaw ends attach to TWO clear round hinge pivots on a CENTRAL VERTICAL AXIS at the TOP and BOTTOM of the oval. A single round PRESSURE PLATE sits in the exact MIDDLE between left and right jaws, connected to the central base by one short trigger lever. Common hinge mechanism and complete base; simple symmetric functional two-jaw trap. Remove chain and unnecessary springs to keep the mechanism clear. No animal, injury, gore, floating teeth or text.",
    "kondycha": "REVISION of reference cell 4. Replace the relieved breathing pose with a determined generic adult who has JUST STOOD BACK UP TO CONTINUE FIGHTING. Three-quarter/full-body view: feet planted apart, one knee still slightly bent from rising, one complete hand pushes off the thigh and the other hangs clenched at the side. Torso leans a little forward; HEAD LOWERED with the eyes looking resolutely upward from beneath one broad SOLID BLACK BROW SHADOW and two narrow white eye cuts. The attitude is defiant 'this is not over', never relieved or sighing. Plain practical shirt and trousers, ordinary rugged ANDROGYNOUS adult proportions, minimal face detail. Remove breath arcs and hand-on-heart gesture. No anime eyes, exaggerated jaw, readable words, grey shading, extra limbs or gruff portrait close-up.",
    "lapiduch": "REVISION of reference cell 5. Keep CPR chest compressions, but ADD a complete plain adult PATIENT HEAD naturally joined to the neck and shoulders, with TWO simple BLACK X-SHAPED EYES as explicitly requested. The patient lies on their back, viewed from above, head at the TOP. ROTATE the correctly STACKED COMPRESSING HANDS 90 degrees: both rescuer forearms now enter HORIZONTALLY FROM THE RIGHT, fingers pointing LEFT, with the lower palm heel centered on the sternum and the other hand stacked on it. Head stays clearly above the hands. Coherent fingers, wrists, neck and shoulders; exactly one patient and two rescuer hands, no extra limbs. Sober broad white stencil, no anime face, wound, blood, gore or written labels; X eyes are facial marks only.",
    "laska-boza": "REVISION of reference cell 6. Use ONE SINGLE LARGE GODLY HAND emerging downward from ONE simple broad CLOUD at the top, palm open in blessing. Remove the second old blessing hand. Add MANNA FALLING FROM HEAVEN: THREE distinct small bread pieces/loaves descend from the divine hand toward THREE tiny plain allied head-and-shoulder silhouettes below. Each bread piece is a broad oval with one single large bread-score cut, not a dot, spark or stone. Keep the hierarchy clear: cloud and one hand above, three manna pieces in the middle, three generic allies below. Broad black gaps, no realistic deity face, named religious figure, extra hand, tiny speckled shower, readable text or anime.",
    "leb-jak-sklep": "REJECTED CONCEPT in reference cell 7: create a COMPLETELY DIFFERENT SINGLE-OBJECT design. ONE sturdy old INDUSTRIAL INCANDESCENT LIGHT BULB symbolizing a flash of genius. A large clear bulb outline contains ONE simple brain-shaped FILAMENT with only three broad lobe cuts; a thick screw base has just two broad black bands. Three short broad restrained light rays outside the bulb. No separate brain floating above, no wrench, die, pyramid, human head, giant cog, tiny filament wires, lettering, numerals or cartoon expression. Serious practical workshop object, coherent clean broad white stencil, generous black negative space and tiny-icon readability.",
    "maszyna-do-zabijania": "DIFFERENT CONCEPT requested for reference cell 8. THIS ONE OUTER ATLAS CELL contains a miniature KILL TALLY laid out in THREE ROWS and THREE COLUMNS. Exactly SEVEN SIMPLE SKULLS total: top row has THREE, middle row has THREE, bottom row has ONLY ONE at the LEFT; bottom-middle and bottom-right stay EMPTY BLACK. Every skull is one simple white oval cranium with two big black eye holes and a block jaw, no fine teeth or gore. The SIX skulls in the first two rows are EACH STRUCK THROUGH by ONE broad diagonal BLACK slash cutting the white skull from upper-left to lower-right. The seventh skull at bottom-left is NOT struck through. Equal skull sizes, aligned rows/columns, broad black spacing. No fist, chain, extra skull, numerals, writing, decorative border or inner grid lines. Outer atlas still contains nine different subjects: this seven-skull tally stays wholly inside cell 8.",
    "mechanika": "REVISION of reference cell 9. Redraw as ONE immediately recognizable CAR ENGINE SIDE-PROFILE silhouette, using the familiar sober engine shape from vehicle instrument panels: a broad horizontal engine block, one small OIL-FILL CAP on top, a stepped gearbox protrusion at the LEFT, a large round FAN/PULLEY housing at the RIGHT and a low oil pan beneath. One clear thick wrench rests diagonally across the lower front. Few broad black structural cuts only. It must read as a motor engine at 16 pixels, not a Lego block, three open cups/chimneys, holes in a box or a generic giant cog. Complete coherent engine and tool, no detailed exposed pistons, wiring, labels, numbers, logo or person.",
    "motywacja": "ONE practical handheld MEGAPHONE angled right, emitting TWO broad sound arcs toward ONE simple coherent CUBE DIE below-right. The die has three visible planes with straight shared edges and three large pips on the front, no digits. Encouragement granting an ally an extra roll. Solid megaphone cone, complete handle and broad black gaps. No person, face, gruff speaker portrait, lettering, music notes, star, tiny grille or extra dice.",
    "moj-biom": "ONE unfolded practical MAP with two broad panels: a large simple FIR TREE silhouette on one panel and one bold MOUNTAIN PEAK on the other, with a single thick path cut along the fold. A compact terrain-knowledge emblem. Complete paper edges, broad black gaps and just a few functional folds. No map labels, coordinates, tiny contour lines, compass lettering, human face, decorative arrows or landscape shading.",
    "moj-bog-kule-nosi": "ONE complete upright rifle CARTRIDGE cupped in ONE open adult PALM, with THREE short broad divine light rays above the bullet tip. A single broad arch behind the cartridge frames this guided shot, kept distinct from the supporting hand. Coherent plain bare fingers and thumb, complete bullet/casing/base rim. No deity portrait, face, denomination symbol, real logo, letters, numerals, extra cartridge or fine engraving.",
    "moj-wrog": "General enemy-tracking emblem: ONE large clear BOOT PRINT centered inside ONE thick circular TARGET RETICLE with four short cardinal ticks. Two broad tread cuts only. Clear black gap between the print and reticle, no second footprint, head, skull, words, numerals, eye, extra rings or delicate tracking marks.",
    "moj-wrog-ludzie": "Human enemy category: ONE smooth generic ADULT HUMAN HEAD AND SHORT NECK in right-facing profile centered inside ONE thick circular TARGET RETICLE with four short cardinal ticks. Plain natural adult nose and jaw, one broad ear cut, no hair texture, beard, stern brow or detailed expression. This is a neutral category silhouette, not a gruff survivor portrait. Broad black gap between head and circle. No tiny face details, text or extra head.",
    "moj-wrog-maszyny": "Machine enemy category: ONE angular INDUSTRIAL ROBOT SENSOR HEAD centered inside ONE thick circular TARGET RETICLE with four short cardinal ticks. A boxy casing, one large circular camera aperture and two broad rectangular ventilation cuts, a short mechanical neck. Sober machine design, not a human face or cartoon robot expression. Clear black gap around the head; no tiny circuitry, giant cog, anime, text or extra antennae.",
    "moj-wrog-mutanty": "Mutant enemy category: ONE clearly NONHUMAN MUTANT HEAD in right-facing profile centered inside ONE thick circular TARGET RETICLE with four short cardinal ticks. Lumpy overgrown cranium, ONE blunt horn, misshapen swept ear, heavy brow, broad projecting muzzle and ONE short lower tusk, matching the sober approved mutant language. Head and short natural neck only, no shoulders or magnifying-glass handle. No ordinary human-with-a-horn face, gore, tiny stippling, anime, text or extra head.",
    "moj-wrog-potwory": "Monster enemy category: ONE BESTIAL NONHUMANOID PREDATOR HEAD in side profile centered inside ONE thick circular TARGET RETICLE with four short cardinal ticks. Low long heavy skull, TWO short swept-back horns, a broad open jaw with only three large blunt teeth and one small eye cut. Distinct from the humanoid one-horn mutant: a feral creature head, no human ear or chin. Clear black gap around it, no gore, tiny teeth, anime face, text or extra head.",
    "moj-wrog-zwierzeta": "Animal enemy category: ONE realistic WOLF HEAD AND SHORT NECK in right-facing profile centered inside ONE thick circular TARGET RETICLE with four short cardinal ticks. Natural pointed ears, long canine muzzle, one simple eye cut and three broad fur tufts at most. A normal adult animal, no horns or mutations, no cartoon mascot/anime eyes or human expression. Clear black gap around the head; no fine fur, gore, text or extra head."
}


def main():
    roadmap = read(ROOT / "dev/icons/placeholder-pass/roadmap.json")
    feedback_file = REVIEW / "feedback.json"
    feedback_bytes = feedback_file.read_bytes()
    feedback = json.loads(feedback_bytes)["items"]
    manifest = read(REVIEW / "manifest.json")
    reworks = []
    for prior in (74, 75):
        old = {subject["itemId"]: subject for subject in read(REVIEW / f"candidates/batch-{prior}/batch.json")["subjects"]}
        for entry in read(REVIEW / f"candidates/batch-{prior}/reviewed.json")["active"]:
            if entry["decision"] not in ("revise", "reject"):
                continue
            assert feedback[entry["id"]] == entry["feedback"], "Newer GM feedback"
            subject = dict(old[entry["id"]])
            subject["revisionOf"] = entry
            reworks.append(subject)
    assert len(reworks) == 9
    fresh = [subject for group in roadmap["batches"] for subject in group["subjects"]][48:57]
    assert len(fresh) == 9
    already = {item.get("placeholderKey") for item in manifest["items"]}
    assert all(f"{subject['kind']}:{subject['key']}" not in already for subject in fresh)
    groups = {76: reworks, 77: fresh}
    styles = ["icons/abilities/amen.webp", "icons/abilities/hakerstwo.webp", "icons/abilities/krwawy-aniol.webp",
              "icons/abilities/jeden-strzal.webp", "icons/abilities/dobra-rada.webp", "icons/abilities/emiter-emp.webp",
              "icons/abilities/bez-tajemnic.webp", "icons/abilities/kocie-kosci.webp", "icons/abilities/dziewiec-zyc.webp"]
    for number, subjects in groups.items():
        here = REVIEW / "candidates" / f"batch-{number}"
        assert not here.exists(), "Batch already allocated"
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
              "generalFeedback": "Follow specific saved reworks exactly. Sober broad white glyphs, generic adults, no repeated gruff male portraits or anime.", "subjects": entries})
        references = (["dev/icons/review/" + subject["revisionOf"]["selectedSource"] for subject in reworks]
                      if number == 76 else list(styles))
        canvas = Image.new("RGB", (768, 768), "black")
        for index, source in enumerate(references):
            with Image.open(ROOT / source) as original:
                rgba = original.convert("RGBA")
                rgba.thumbnail((256, 256), Image.Resampling.LANCZOS)
                canvas.paste(rgba, ((index % 3) * 256, (index // 3) * 256), rgba)
        canvas.save(here / "raw/style-reference.png")
        role = ("ALL nine reference cells are the EXACT selected subjects for output cells 1-9. Apply the specific correction or complete new concept requested for each. Cell 7 is a rejected concept and MUST be replaced entirely; cell 8 has a new seven-skull tally concept. Keep every output inside its own outer grid cell."
                if number == 76 else "ALL nine reference cells are STYLE ONLY; replace every subject with the NEW contents below. Output cells 4-9 form ONE coherent icon FAMILY: use the SAME thick circular target reticle, four cardinal ticks, scale and right-facing orientation, changing only the central footprint/head category. No magnifying-glass handles. Keep each family icon inside its own outer cell.")
        prompt = GENERAL + role + "\nROW-MAJOR CONTENTS:\n" + "\n".join(f"{subject['cell']}. {subject['key']}: {subject['request']}" for subject in entries)
        write(here / "prompts.json", {"generator": "OpenAI built-in image generation", "date": DATE,
              "reference": "raw/style-reference.png", "role": role, "atlas": prompt, "targetedCorrections": []})
        write(here / "style-reference.json", {"role": role, "sources": [{"source": source, "sha256": sha(ROOT / source)} for source in references]})
        write(here / "references.json", {"role": "Exact native targets, not style inputs", "files": targets})
        write(here / "incoming.json", {"date": DATE, "batch": number,
              "feedbackSha256": hashlib.sha256(feedback_bytes).hexdigest(), "priorReviewItems": len(manifest["items"]),
              "priorResolvedItems": sum(item.get("status") == "resolved" for item in manifest["items"]),
              "revisionCount": sum("revisionOf" in subject for subject in entries), "freshCount": sum("revisionOf" not in subject for subject in entries),
              "rejectedConcepts": sum(subject.get("revisionOf", {}).get("decision") == "reject" for subject in entries),
              "remainingPlaceholderFiles": 115, "remainingPlaceholderSubjects": 114})
        print(f"Batch {number}: " + ", ".join(subject["key"] for subject in entries))
    assert feedback_file.read_bytes() == feedback_bytes


if __name__ == "__main__":
    main()
