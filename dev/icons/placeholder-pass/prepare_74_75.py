"""Freeze six saved revisions and twelve fresh subjects in two nine-cell atlases."""
import hashlib
import json
from PIL import Image
from prepare_70_71 import GENERAL, ROOT, REVIEW, read, write, sha

DATE = "2026-10-15"
MOTIFS = {
    "bez-tajemnic": "REVISION of reference cell 1. Preserve the current unmistakably NONHUMAN mutant face, horn, heavy brow, blunt tusk, irregular ear, magnifying glass and crosshair. Fix the neck/shoulder connection INSIDE THE LENS. Make the lens contain ONE COMPLETE ANATOMICALLY COHERENT HEAD-AND-SHOULDERS BUST, all facing RIGHT. Slightly reduce/raise the complete bust so the full neck, sloping trapezius and one rounded near shoulder are visible together WITHIN the circular lens. The neck grows continuously out of the shoulder girdle, directly beneath and behind the jaw; no dangling neck stump. The chest/front contour points RIGHT and the back contour lies LEFT. REMOVE the separate enlarged bust floating BELOW the lens: it caused two incompatible body scales. Outside the lens there is only its handle, not a second body. One continuous natural mutant bust inside one lens, broad black anatomical cuts, no extra head, human face, gore or hatching.",
    "elektronik": "REVISION of reference cell 2. Keep the upright electronic padlock body, chip/circuit emblem and screwdriver to the right. Rotate the SHACKLE a full 90 degrees COUNTERCLOCKWISE OUTWARD TO THE LEFT, not another slight tilt. The U now lies HORIZONTALLY, like a thick C-SHAPE projecting LEFT of the lock: curved arch at far LEFT, two short straight parallel prongs pointing RIGHT. The lower prong remains engaged in a clear small hinge at the TOP-LEFT corner of the lock body; the upper prong is FREE in empty space ABOVE-LEFT of the body, leaving an obvious open gap. The arch is outside the body footprint on the left. Do NOT leave an upright upside-down-U arch over the body or a free-floating shackle. Body remains vertical and screwdriver remains on the right. Broad white structural shapes, no text or fine circuitry.",
    "inteligentna-obrona": "REVISION of reference cell 3. Keep a generic adult using one open palm to guide an incoming fist aside, but make the torso UPRIGHT and composed, without an agile lean or movement swoosh. Add a LARGE simple schematic BRAIN above/behind the defender's smooth head, with just three broad black fold cuts. Connect this brain to a clear THREE-NODE PREDICTION SEQUENCE above the incoming fist: three large solid round nodes joined by two thick straight angled segments, forecasting where the fist will go and ending safely outside the shoulder. This is a sober tactical calculation diagram showing anticipation and outthinking, not speed or acrobatics. Complete natural hands/wrists, clear black gaps. No fine formulas, tiny lettering, face portrait, lightbulb, giant cog, anime expression or extra arms.",
    "jak-dbasz-tak-masz": "REVISION of reference cell 4. Preserve the complete handgun, supporting bare hand, other hand wiping with a cloth, and small oil can. Correct ONLY the holding hand's INDEX FINGER: straighten it along the OUTSIDE UPPER EDGE OF THE TRIGGER GUARD, clearly resting on the outer guard/frame. It must stay ENTIRELY OUTSIDE the black trigger-guard opening, with an obvious uninterrupted black gap INSIDE the guard around the untouched trigger. No fingertip curls onto or touches the trigger. The remaining fingers wrap naturally around the grip and the thumb stays coherent. Keep the wiping hand and rag above the slide. No extra finger, hand, weapon or text.",
    "jezdziec": "REVISION of reference cell 5. Keep the realistic horse in complete side view, but REDRAW THE RIDER with natural seated adult anatomy. Hips sit securely in the saddle, pelvis under the chest, upright torso with a slight natural forward balance, ordinary neck and small featureless head. The visible near thigh slopes DOWN-FORWARD from the hip; a real knee bend leads to the lower leg descending DOWN-BACK, with a complete foot near the stirrup below the saddle. The far leg is mostly hidden behind the horse. Forearms rest naturally forward on the thighs/saddle front; both hands are relaxed and DO NOT hold reins. No stiff arms-akimbo pose, elongated torso, tiny dangling mannequin legs or angular puppet silhouette. Preserve the complete four-legged horse, tail and saddle. Broad natural silhouette, no face portrait, anime or tiny tack.",
    "klusownik": "REVISION of reference cell 6. REDRAW the open steel leg-hold trap as a coherent functional device in three-quarter top view. TWO opposing semicircular jaw halves attach symmetrically to ONE straight CENTRAL CROSSBAR/AXLE. Show LARGE ROUND PIVOT HINGES at its two ends, aligned on the SAME axis through the middle of the trap, visibly joining both jaws to the base. A single round pressure pan sits just ABOVE the centre of this axle, with its short trigger lever visibly connected to a broad leaf-spring base beneath. The jaws form a symmetrical open oval around that central mechanism, with only three broad teeth per half. Add a short two-link chain attached to the solid base. Clear common hinge mechanism, no floating crown jaws, impossible disconnected jaw halves, scattered parts or fine springs. No animal, injury, gore or text.",
    "kolejka": "One complete plain bottle of homemade spirits between TWO sturdy tin drinking mugs, grouped as a shared round of drinks during a rest. One mug is held by a complete bare adult hand entering from the left; the other mug rests beside the bottle. Broad practical silhouettes, clear handles and bottle neck, no labels, liquid shading, bubbles, fancy glassware, face portrait, extra bottle or tiny details.",
    "kondycha": "One generic adult upper body in a plain loose shirt, taking a restorative DEEP BREATH. One complete hand rests flat over the sternum; TWO broad expanding curved breath arcs flank the upper chest. Smooth featureless head slightly raised, natural ordinary build and coherent neck/shoulders. Calm recovery of stamina, not a roaring bodybuilder or gruff portrait. No medical cross, heart emblem, numbers, plus sign, swoosh, anime expression or fine ribs.",
    "krwawy-aniol": "ONE robust complete medical SYRINGE upright at centre, framed by TWO broad simplified ANGEL WINGS that spread outward symmetrically from its barrel. Each wing has only three large feather blocks, no fine feather texture. A sober lifesaving medic emblem, not a character or fantasy painting. Clear plunger, syringe barrel and short intact needle; broad black gaps. No person, face, blood, gore, halo, text, logos or tiny measurement ticks.",
    "lets-rock": "One rugged practical ELECTRIC GUITAR angled upward-right, complete body, neck and headstock, with TWO broad outward sound arcs. A single large pickup cut and three thick string marks at most; no tiny frets. Music rallying allies for battle. No performer, face portrait, skull decoration, lettering, brand logo, music notes, flames, star or fine engraving.",
    "lapiduch": "Two complete adult hands STACKED CORRECTLY for CPR, with one palm heel pressing at the centre of ONE plain adult chest seen from above. The upper hand covers the lower hand naturally; two short broad downward compression marks show pressure on the sternum. Only shoulders and upper chest of the patient, no patient's head or face, no extra hands or fingers. Coherent sober resuscitation diagram, broad black gaps and natural hand anatomy, no injuries, blood, gore, text or tiny anatomy.",
    "laska-boza": "Two complete open adult hands reaching outward in a calm BLESSING gesture over THREE small plain human head-and-shoulder silhouettes grouped below. Three short broad downward rays connect the hands' gesture to the allies. Generic adult heads without facial features or hair detail; one compact benevolent group support emblem. No named religious figure, denomination symbol, halo, cartoon star, lettering, numbers, extra hands or fine rays.",
    "leb-jak-sklep": "ONE simple schematic BRAIN with just three large lobe cuts above ONE sturdy open-ended WRENCH and ONE small geometrically coherent TETRAHEDRAL DIE. The four-sided die is a clear triangular pyramid with two visible triangular white planes separated by one broad black edge, no numbers or pips. Insight improving clever tool work, compact clear arrangement with black gaps. No human face, lightbulb, giant cog, fine brain folds, letters or tiny ruler markings.",
    "lyzeczka": "ONE complete bare adult fist firmly gripping the handle of a large plain old TEASPOON, raised diagonally like an improvised melee weapon. The oval spoon bowl is clearly visible and the long handle joins the fist coherently; one broad restrained striking trail behind the spoon. Actual simple object used as a weapon, serious practical silhouette. No person, face, food, bowl, decorative stars, serrations, engraving, extra spoon or extra hand.",
    "maszyna-do-zabijania": "ONE powerful bare clenched fist drives through ONE thick steel CHAIN LINK, breaking that link into two broad separated halves while TWO intact links trail behind. Two short broad impact wedges convey relentless melee strength. Coherent fist with complete short wrist, heavy practical chain and clear black gaps. No literal robot, person portrait, huge gear, extra fist, fine fragments, gore, blood, text or anime anatomy.",
    "matrix": "ONE generic adult full-body silhouette in plain fitted practical clothes bends backward in a controlled evasive motion as THREE broad parallel projectiles pass safely ABOVE the torso. Natural continuous spine, balanced bent knees, complete arms and feet, smooth featureless head. Clear black gaps between body and projectiles. No recognizable actor or character, sunglasses, trench coat, long coat, film costume, anime face, extra limbs, tiny bullets, text or symbols.",
    "mechanika": "ONE compact practical ENGINE BLOCK in three-quarter side view with three broad cylinder-head forms and a complete thick OPEN-ENDED WRENCH fitted onto one large bolt at the front. A coherent vehicle mechanic's repair motif; just a few large black structural cuts. No huge generic cog, loose toy parts, person, face, intricate wires, oily texture, tiny bolts, logo, lettering or numbers.",
    "moja-prawa-reka": "TWO plain generic adults stand side by side: a slightly taller leader rests ONE complete hand naturally on the shoulder of a trusted companion who carries a compact BACKPACK. Both figures have ordinary adult proportions, practical simple clothes and smooth featureless heads. Clear gap between bodies and coherent shoulder/hand contact. Loyal recruited partner, not a literal isolated right hand. No gruff portrait, extra person, gun, uniform insignia, writing, anime or tiny backpack straps."
}


def main():
    roadmap = read(ROOT / "dev/icons/placeholder-pass/roadmap.json")
    feedback_file = REVIEW / "feedback.json"
    feedback_bytes = feedback_file.read_bytes()
    feedback = json.loads(feedback_bytes)["items"]
    manifest = read(REVIEW / "manifest.json")
    revisions = []
    for prior in (72, 73):
        old = {subject["itemId"]: subject for subject in read(REVIEW / f"candidates/batch-{prior}/batch.json")["subjects"]}
        for entry in read(REVIEW / f"candidates/batch-{prior}/reviewed.json")["active"]:
            if entry["decision"] != "revise":
                continue
            assert feedback[entry["id"]] == entry["feedback"], "Newer GM feedback"
            subject = dict(old[entry["id"]])
            subject["revisionOf"] = entry
            revisions.append(subject)
    assert len(revisions) == 6
    fresh = [subject for group in roadmap["batches"] for subject in group["subjects"]][36:48]
    assert len(fresh) == 12
    already = {item.get("placeholderKey") for item in manifest["items"]}
    assert all(f"{subject['kind']}:{subject['key']}" not in already for subject in fresh)
    groups = {74: revisions + fresh[:3], 75: fresh[3:]}
    styles = ["icons/abilities/ekspert.webp", "icons/abilities/hakerstwo.webp", "icons/abilities/gola-klata.webp",
              "icons/abilities/ja-i-moj-gang.webp", "icons/abilities/kocie-kosci.webp", "icons/abilities/kaskader.webp",
              "icons/abilities/jeden-strzal.webp", "icons/abilities/pan-plaster.webp", "icons/abilities/clint.webp"]
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
              "generalFeedback": "Objects, gestures and generic adults; no repeated gruff portraits or anime. Prioritize exact anatomy, mechanisms and saved revisions.", "subjects": entries})
        references = list(styles)
        if number == 74:
            references[:6] = ["dev/icons/review/" + subject["revisionOf"]["selectedSource"] for subject in revisions]
        canvas = Image.new("RGB", (768, 768), "black")
        for index, source in enumerate(references):
            with Image.open(ROOT / source) as original:
                rgba = original.convert("RGBA")
                rgba.thumbnail((256, 256), Image.Resampling.LANCZOS)
                canvas.paste(rgba, ((index % 3) * 256, (index // 3) * 256), rgba)
        canvas.save(here / "raw/style-reference.png")
        role = ("Reference cells 1-6 are the EXACT subjects to revise in output cells 1-6; preserve each subject except its stated correction. Reference cells 7-9 are STYLE ONLY and must be replaced by the NEW subjects listed below."
                if number == 74 else "ALL nine reference cells are STYLE ONLY. Replace every subject with the NEW contents below; do not copy the old objects or compositions.")
        prompt = GENERAL + role + "\nROW-MAJOR CONTENTS:\n" + "\n".join(f"{subject['cell']}. {subject['key']}: {subject['request']}" for subject in entries)
        write(here / "prompts.json", {"generator": "OpenAI built-in image generation", "date": DATE,
              "reference": "raw/style-reference.png", "role": role, "atlas": prompt, "targetedCorrections": []})
        write(here / "style-reference.json", {"role": role, "sources": [{"source": source, "sha256": sha(ROOT / source)} for source in references]})
        write(here / "references.json", {"role": "Exact native targets, not style inputs", "files": targets})
        write(here / "incoming.json", {"date": DATE, "batch": number,
              "feedbackSha256": hashlib.sha256(feedback_bytes).hexdigest(), "priorReviewItems": len(manifest["items"]),
              "priorResolvedItems": sum(item.get("status") == "resolved" for item in manifest["items"]),
              "revisionCount": sum("revisionOf" in subject for subject in entries), "freshCount": sum("revisionOf" not in subject for subject in entries),
              "remainingPlaceholderFiles": 124, "remainingPlaceholderSubjects": 123})
        print(f"Batch {number}: " + ", ".join(subject["key"] for subject in entries))
    assert feedback_file.read_bytes() == feedback_bytes


if __name__ == "__main__":
    main()
