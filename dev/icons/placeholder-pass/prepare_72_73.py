"""Freeze five saved revisions and thirteen fresh subjects in two nine-cell atlases."""
import hashlib
import json
from PIL import Image
from prepare_70_71 import GENERAL, ROOT, REVIEW, read, write, sha

DATE = "2026-10-15"
MOTIFS = {
    "bez-tajemnic": "REVISION of reference cell 1. Keep the single large magnifying glass and broad crosshair examining a mutant head. The head must be CLEARLY NONHUMAN: a bulging sloped cranium, one blunt horn, a thick irregular ear, a short broad projecting muzzle and ONE blunt lower tusk. Use broad readable shapes, no fine teeth, stippling or gore. Correct the shoulder anatomy: head, natural neck and bust ALL face RIGHT; the near shoulder sits directly below the neck, the back/shoulder bulk extends LEFT behind it, while the chest/front contour faces RIGHT. One coherent shoulder girdle, no twisted neck, detached shoulder or reversed chest. Do not turn the mutant into a clean human with a horn. Keep the magnifier complete.",
    "dwoch-na-jednego": "REVISION of reference cell 2. Keep the exact concept and pose: one plain full-body adult silhouette defending between two large fists entering from left and right. REMOVE ONLY the isolated small white TRIANGLE below the LEFT incoming fist. Leave that area clean black. Keep all fists, fingers, wrists, central limbs and their relative positions complete. Do not add any replacement motion mark, triangle, debris, portrait or extra limb. Natural adult proportions, no anime.",
    "ekspert": "REVISION of reference cell 3. Keep one bare adult hand holding mechanical vernier CALIPERS with their jaws on the LEFT, measuring the hexagonal hardware. Correct the caliper beam: the same rigid straight horizontal rail must continue THROUGH the sliding jaw and visibly project to the RIGHT BEYOND THE ENTIRE HAND by a clear substantial length. Show an uninterrupted exposed rail tail to the right of the hand, not a rail ending at the thumb or disappearing into the fist. Complete jaws and coherent five-finger grip. No ruler ticks, digits, tiny engraving or extra tool.",
    "elektronik": "REVISION of reference cell 4. Keep the upright electronic padlock body, large chip, two broad circuit traces and screwdriver. Rotate/swing the U-shaped metal SHACKLE toward the LEFT around its engaged hinge: the arch leans about 45 degrees counterclockwise and projects to the LEFT of the body, the free tip is clearly swung away to the left with an open gap. One end remains naturally hinged in the top of the lock. Do not rotate the whole lock or leave the shackle upright opening right. Keep the body, chip and screwdriver orientation unchanged. No tiny circuitry or text.",
    "gola-klata": "REVISION of reference cell 5. Keep the headless bare adult upper torso and two near-miss strokes. Make the chest and shoulders distinctly MORE MUSCULAR: broad developed pectorals, rounded deltoids and a thick upper chest, with restrained natural adult anatomy. Add ONE clearly HEALED BATTLE SCAR diagonally across the upper chest, represented by a broad short black groove with two short cross-notches. Closed old scar only, no open wound, blood, stitches, gore, nipples or body hair. No head or face, no armour, shield, erotic detail or anime anatomy. Strong broad stencil cuts, not fine muscle hatching.",
    "hakerstwo": "One rugged OPEN LAPTOP, three-quarter front view, with ONE large square processor symbol on its screen and two broad right-angle circuit tracks. A single compact plug/cable enters the laptop's side. Thick practical casing, complete screen hinge and simplified keyboard indicated by two broad rows only. Computer expertise and programming, no person, hooded hacker portrait, text, letters, digits, code lines, logos or tiny keyboard keys.",
    "inteligentna-obrona": "One plain gender-neutral adult upper-body silhouette calmly turning a raised open palm to guide ONE incoming punch past the shoulder. The defender leans slightly aside and the attack passes through a clear black gap, with ONE broad curved deflection stroke. Natural anatomy, complete palm, fist and wrists, smooth featureless head. Clever anticipation and defence, no armour, physical shield, beard, portrait, brain symbol, giant cog, extra arms or anime expression.",
    "ja-i-moj-gang": "THREE generic adult full-body silhouettes in a tight triangular fighting formation: one broad central figure a little ahead, two smaller allies behind on either side, all holding clenched fists ready at chest height. Clear black gaps between the three complete bodies and their arms. Strong group solidarity, plain practical clothes and smooth featureless heads, no gruff face portrait, pointing hand, extra people, banner, emblem, tiny details or gore.",
    "jak-dbasz-tak-masz": "One robust handgun held horizontally while ONE complete bare hand uses a folded cleaning cloth to wipe the slide/barrel. A small plain spouted oil can sits just below, with ONE broad drop beside the spout. A coherent practical firearm maintenance scene. Complete gun muzzle, grip, hand and cloth, broad black gaps. No loose gun parts, text, logos, tiny screws, face, cigarette, decoration or extra hands.",
    "jeden-strzal": "ONE complete upright rifle cartridge centered inside ONE bold circular scope reticle. The cartridge has a clear pointed bullet, straight casing and broad base rim; the reticle uses four short thick inward crosshair bars, leaving clear black gaps around the cartridge. A single prepared precise shot. No second bullet, numerals, writing, gun, eye, face, target rings, fine engraving or decorative stars.",
    "jeden-z-nas": "ONE complete adult handshake beneath ONE plain shield-shaped law-enforcement badge with a single broad five-point star cut in its centre. Both bare hands have coherent thumbs, fingers and short wrists. The badge is generic, unbranded and unlettered; no real agency insignia. Compact recognition and professional solidarity motif, no human faces, extra hands, names, numerals, ornate wreath or tiny detail.",
    "jeden-z-nich": "One bare adult upper arm and forearm with a clenched fist, showing ONE bold simple SKULL TATTOO as a black negative-space emblem on the upper arm. The tattoo has two large eye holes and one solid block jaw, no fine teeth or ornament. A tough generic gang affiliation motif, not a recognizable gang logo. Complete arm silhouette, broad black cuts, no person portrait, other tattoo, lettering, symbols, injury, blood or gore.",
    "jezdziec": "Full side view of ONE realistic adult HORSE with ONE generic adult rider seated confidently in the saddle. The rider's hands rest at their hips, clearly not holding reins; the horse moves in a composed walking stride with four complete legs and one tail. Broad simplified natural animal and human anatomy, smooth featureless rider head. No pony/cartoon proportions, ornate tack, weapon, face portrait, extra rider or tiny reins.",
    "kakofonia": "One plain generic adult head and small shoulders with TWO complete hands pressed over the ears. THREE short broad irregular angular sound wedges approach the head from the sides, conveying harsh discordant noise. Smooth simple head, no detailed facial expression, no beard or portrait; coherent fingers, wrists and ear placement. No music notes, text, exclamation marks, anime face, tiny jagged noise texture or extra hands.",
    "kamuflaz": "One generic adult sniper head and shoulders concealed in a simple practical GHILLIE HOOD behind THREE broad rough-edged leaves. A single plain rifle barrel projects to the right through the foliage. The hood and leaves merge into one compact camouflage silhouette with large black gaps, no face details or eyes. Clear complete barrel, simple natural plant shapes, no dense grass texture, micro-fringe, anime, portrait, logos or text.",
    "kaskader": "ONE complete rugged compact CAR in side profile, nose slightly raised, airborne as it jumps a narrow gap between TWO low ledge edges. One broad motion sweep behind the car conveys momentum. Two large visible wheels, thick body and just two broad window cuts; no driver or fine machinery. Keep the whole car and both ledge ends inside the cell. No second car, digits, logos, flames, explosion or playful arrows.",
    "klusownik": "ONE open practical steel LEG-HOLD TRAP seen slightly from above: two broad curved jaws with just THREE large blunt teeth each, a large central pressure plate and a short sturdy chain of THREE links. Coherent hinged functional device with generous black gaps and complete jaws. No caught animal, human, injury, blood, gore, labels, fine springs or scattered parts.",
    "kocie-kosci": "ONE geometrically coherent ISOMETRIC CUBE die with a large simple CAT-PAW PRINT cut into the front white face: one broad pad and four large toe dots. The visible flat top face has one pip and the right side has two pips. Straight edges meet at consistent shared vertices; broad black seams separate the three white planes. Compact feline luck/resource motif. No whole cat, other die, bone, numeral, lettering, cylinder, rounded tub, extra face or fine dots."
}


def main():
    roadmap = read(ROOT / "dev/icons/placeholder-pass/roadmap.json")
    feedback_file = REVIEW / "feedback.json"
    feedback_bytes = feedback_file.read_bytes()
    feedback = json.loads(feedback_bytes)["items"]
    manifest = read(REVIEW / "manifest.json")
    revisions = []
    for prior in (70, 71):
        old = {subject["itemId"]: subject for subject in read(REVIEW / f"candidates/batch-{prior}/batch.json")["subjects"]}
        for entry in read(REVIEW / f"candidates/batch-{prior}/reviewed.json")["active"]:
            if entry["decision"] != "revise":
                continue
            assert feedback[entry["id"]] == entry["feedback"], "Newer GM feedback"
            subject = dict(old[entry["id"]])
            subject["revisionOf"] = entry
            revisions.append(subject)
    assert len(revisions) == 5
    fresh = [subject for group in roadmap["batches"] for subject in group["subjects"]][23:36]
    assert len(fresh) == 13
    already = {item.get("placeholderKey") for item in manifest["items"]}
    assert all(f"{subject['kind']}:{subject['key']}" not in already for subject in fresh)
    groups = {72: revisions + fresh[:4], 73: fresh[4:]}
    styles = ["icons/abilities/cwaniacki-zwod.webp", "icons/abilities/amen.webp", "icons/abilities/farmacja.webp",
              "icons/abilities/emiter-emp.webp", "icons/abilities/dziewiec-zyc.webp", "icons/abilities/pan-plaster.webp",
              "icons/abilities/drzwi-w-drzwi.webp", "icons/abilities/bystrzacha.webp", "icons/abilities/clint.webp"]
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
              "generalFeedback": "Objects, gestures and generic adults; avoid repeated gruff male portraits and anime. Follow specific saved revisions precisely.", "subjects": entries})
        references = list(styles)
        if number == 72:
            references[:5] = ["dev/icons/review/" + subject["revisionOf"]["selectedSource"] for subject in revisions]
        canvas = Image.new("RGB", (768, 768), "black")
        for index, source in enumerate(references):
            with Image.open(ROOT / source) as original:
                rgba = original.convert("RGBA")
                rgba.thumbnail((256, 256), Image.Resampling.LANCZOS)
                canvas.paste(rgba, ((index % 3) * 256, (index // 3) * 256), rgba)
        canvas.save(here / "raw/style-reference.png")
        role = ("Reference cells 1-5 are the EXACT subjects to revise in output cells 1-5; preserve each subject except its stated correction. Reference cells 6-9 are STYLE ONLY and must be replaced by the NEW subjects listed below."
                if number == 72 else "ALL nine reference cells are STYLE ONLY. Replace every subject with the NEW contents listed below; do not copy the old objects or compositions.")
        prompt = GENERAL + role + "\nROW-MAJOR CONTENTS:\n" + "\n".join(f"{subject['cell']}. {subject['key']}: {subject['request']}" for subject in entries)
        write(here / "prompts.json", {"generator": "OpenAI built-in image generation", "date": DATE,
              "reference": "raw/style-reference.png", "role": role, "atlas": prompt, "targetedCorrections": []})
        write(here / "style-reference.json", {"role": role, "sources": [{"source": source, "sha256": sha(ROOT / source)} for source in references]})
        write(here / "references.json", {"role": "Exact native targets, not style inputs", "files": targets})
        write(here / "incoming.json", {"date": DATE, "batch": number,
              "feedbackSha256": hashlib.sha256(feedback_bytes).hexdigest(), "priorReviewItems": len(manifest["items"]),
              "priorResolvedItems": sum(item.get("status") == "resolved" for item in manifest["items"]),
              "revisionCount": sum("revisionOf" in subject for subject in entries), "freshCount": sum("revisionOf" not in subject for subject in entries),
              "remainingPlaceholderFiles": 136, "remainingPlaceholderSubjects": 135})
        print(f"Batch {number}: " + ", ".join(subject["key"] for subject in entries))
    assert feedback_file.read_bytes() == feedback_bytes


if __name__ == "__main__":
    main()
