"""Freeze seven saved revisions and eleven fresh subjects; never rerun."""
import hashlib
import json
from PIL import Image
from prepare_70_71 import GENERAL, ROOT, REVIEW, read, write, sha

DATE = "2026-10-16"
MOTIFS = {
    "rzeznik": "REVISION of reference cell 1. Preserve the target torso and raised arm, and the upper attacker's hand holding that wrist. ADD ONE complete practical KNIFE held by the LOWER FREE HAND, blade pointing toward the exposed underarm but NOT TOUCHING the target. Correct natural fingers/thumb around the knife grip, full short blade and guard. Change the target's expression from calm to visibly THREATENED AND ANGRY: one broad lowered brow, narrow natural eye cut and tense open mouth. Same pose and framing, all limbs coherent. Before-contact fictional threat only: no stab, impact, blood, wound, exposed tissue or gore. No extra hand, weapon or anime face.",
    "serwisowanie": "REDRAW the good existing concept in reference cell 2 more coherently. ONE compact handheld RADIO in three-quarter view, one CONTINUOUS SOLID ANTENNA joined to the top, one large tuning knob and two broad speaker slots. The UNDERSIDE faces partly toward the viewer. ONE rectangular SERVICE HATCH on that BOTTOM PLANE opens downward on ONE clear hinge; a complete soldering iron from lower-right meets the bottom service opening. Vertical side panels stay CLOSED. Broad clean device planes, simple solid handle and soldering tip, no disconnected antenna fragments, floating panels, tiny circuitry, labels, numbers or person.",
    "slang": "REVISION of reference cell 3. Keep BOTH generic adult heads, cigarette and small hand. REMOVE THE TWO TRIANGULAR SPEECH STROKES. Replace them with ONE large SHARED SPEECH BUBBLE ABOVE BOTH HEADS, with TWO broad short tails, one toward each mouth. Inside the bubble place exactly TWO simple fictional STREET/PRISON-TATTOO MOTIFS: ONE plain SKULL and ONE BROKEN CHAIN LINK. Broad stencil symbols only, no gore or thin tiny detail. The bubble is shared, not two separate bubbles. No letters, numerals, real gang insignia, logos, anime, beard or extra head.",
    "sokole-oko": "REVISION of reference cell 4. Preserve the existing falcon-eye shape, feather-edge silhouette, broad crosshair, upper beak and overall scale. ADD THE MISSING LOWER BEAK: one short broad lower MANDIBLE naturally attached below the hooked upper bill, separated by ONE clear BLACK MOUTH GAP. Lower bill points forward-right and meets below the upper hooked tip; both upper and lower beak bases join the bird's face coherently. Do not leave a floating white triangle or replace the whole eye concept. No tiny feather texture, extra eye, anime lashes, text or portrait.",
    "solowa": "REVISION of reference cell 5. Keep both complete adult figures, their positions and the right opponent's guard. Change ONLY the LEFT figure's raised beckoning hand into an unmistakable POINTING HAND: arm extends toward the RIGHT opponent, ONE long straight INDEX FINGER points directly AT THAT OPPONENT; thumb and remaining three fingers fold naturally into the palm. No open beckoning palm or curled pointing finger. Generic smooth heads and ordinary adult anatomy, complete limbs, broad black gap, no weapon, injury, anime or extra person.",
    "specjalizacja-spec": "REVISION of reference cell 6. Keep the crossed CALIPER AND SCREWDRIVER concept, but redraw the caliper with perfectly STRAIGHT mechanical geometry. One straight broad rectangular MAIN BEAM. ONE fixed measuring jaw at the left end and ONE sliding jaw near the middle descend PERPENDICULAR to the beam; the two long measuring-jaw faces are PARALLEL and face each other across one broad open black gap. Slider is ONE plain rectangular block wrapped around the straight beam. Omit small inner jaws, depth rod and scale markings. Both jaws, beam and slider are rigid, square and unbent. Complete simple screwdriver crosses behind with a black overlap cut. No curved caliper beam, wrench head, extra jaws, fine ticks, text, hands or cog.",
    "spieprzysz-to": "ENTIRELY NEW CONCEPT: vicious MOCKERY, with NO DICE. ONE ordinary generic ADULT HEAD AND SHORT SHOULDERS in three-quarter view facing RIGHT, sneering scornfully: one raised broad eyebrow, one narrowed natural eye and an OPEN MOUTH with one corner curled upward. ONE complete bare hand beside the face POINTS DERISIVELY right, while TWO short broad angular speech strokes emerge from the mouth. Sober human adult expression, minimal broad facial cuts, short neutral hair, no beard portrait, anime, oversized eyes, clown face, lettering, speech-bubble text, book or extra person.",
    "strzelec": "ONE complete practical SCOPED RIFLE resting on ONE broad SANDBAG with a deployed TWO-LEG BIPOD below the front barrel. Clear shoulder stock, long straight barrel, simple scope tube above the receiver and empty trigger guard. A prepared stable sniper position, no person. Broad white structural shapes, sparse black cuts, no fine screws, logos, labels, numerals, muzzle flash, tiny scope reticle or background landscape.",
    "stylowa": "ONE complete pair of practical AVIATOR SUNGLASSES above ONE heavy CURB-CHAIN NECKLACE arranged in a compact loop. Broad lens frames and bridge, large clean black lens openings, necklace made of only SIX broad joined links. Expensive wearable style in a rough wasteland, sober practical objects. No head, face, suit jacket, text, logo, currency sign, tiny jewelry engraving, sparkle or ornate pendant.",
    "szalencza-szarza": "ONE generic ADULT CHARGING FORWARD low and fast to the RIGHT, shoulder leading, full natural body, one leg drives behind and the other steps forward. TWO broad BULLET STREAKS narrowly miss BEHIND the back, separate from the intact body. Plain practical clothes, smooth featureless head and complete limbs, clear broad black gaps. Reckless speed makes the person hard to hit. No gun in hands, portrait, beard, anime, injury, blood, extra limbs or decorative arrow.",
    "szary": "ONE plain generic adult SCAVENGER in a loose coat stoops to pick up ONE short SCRAP PIPE. Full natural body, smooth small featureless head, ordinary practical clothes and boots. ONE large simple CROSSED-OUT EYE SYMBOL behind the shoulders shows being overlooked while scavenging openly. Broad eye outline and one thick diagonal slash, clear black gap from the figure. No beard portrait, hooded assassin face, fine rubbish pile, dithering, grey shading, text or extra person.",
    "szczescie": "ONE sturdy upright HORSESHOE with exactly FOUR broad nail holes, surrounding ONE natural FOUR-LEAF CLOVER with a short complete stem. Broad real object silhouettes and generous black gaps; restrained practical good-luck charm. No die, numerals, words, sparkling stars, cartoon face, thin leaf veins, fine metal texture or extra clover.",
    "szybka-gadka": "ONE broad EMPTY SPEECH BUBBLE shaped as a horizontal rounded rectangle with ONE clear short tail at lower-right. THREE short thick parallel MOTION STROKES behind the LEFT edge express fast speech. Single compact sober white glyph, large black interior and thick continuous border. No person, face, letters, words, symbols inside, second bubble, book, handshake or playful arrows.",
    "szybka-produkcja": "ONE complete stout OPEN-ENDED WRENCH crosses diagonally over ONE simple STOPWATCH. Watch has a clear broad circular rim, ONE large top button and TWO broad hands on its blank face; wrench has one intact open jaw and round handle end. Rapid workshop production shown through tool and time. Strong black cut separates overlap, no numerals, ticks, writing, cog, person, extra tool or tiny clock detail.",
    "szybkie-badanie": "ONE large practical MAGNIFYING GLASS inspects ONE boxy ROBOT SENSOR HEAD with a single large round CAMERA LENS and two broad ventilation cuts. Complete short mechanical neck, coherent magnifier rim/handle, broad black gaps. TWO short broad motion strokes behind the magnifier indicate quick examination. Sober salvaged machine, no human face, book, tiny circuitry, numbers, lettering, extra lenses or cartoon robot expression.",
    "szybkie-nogi": "TWO complete rugged BOOTS AND SHORT LOWER TROUSER LEGS in a fast evasive STEP: the leading boot points right and lands toe-first, while the rear boot lifts with heel high. Upper calf hems end cleanly inside the cell; no cropped border. TWO short broad horizontal motion strokes trail left. Natural foot/ankle proportions, broad sparse sole cuts and clear black gap. No full person, face, tiny laces, extra feet, text or arrow.",
    "szybkie-rece": "TWO complete BARE ADULT HANDS simultaneously operate TWO large TOGGLE SWITCHES on ONE compact rectangular CONTROL BOX. Left hand enters from LEFT and flips the left switch upward; right hand enters from RIGHT and flips the right switch downward. Each hand has one coherent thumb, fingers and short wrist, broad black separation. Only two simple toggles and one box, spare functional shapes. No face, text, labels, extra hands, tiny circuitry, fine fingernails or elaborate control panel.",
    "szybkosc-kota": "ONE realistic adult CAT facing LEFT in a LOW EVASIVE CROUCH, forepaws braced, one hindleg ready to spring and one long tail curved high behind. ONE broad BULLET STREAK passes safely ABOVE its back, with a clear black gap. Natural cat proportions, four complete legs and one small eye cut; compact grounded pose rather than the earlier airborne leap. Sober agility emblem, no cute mascot, anime eyes, face portrait, injury, fine fur, extra tail, numerals or decorative arrows."
}


def main():
    feedback_file = REVIEW / "feedback.json"
    feedback_bytes = feedback_file.read_bytes()
    feedback = json.loads(feedback_bytes)["items"]
    manifest = read(REVIEW / "manifest.json")
    reworks = []
    for prior in (82, 83):
        old = {s["itemId"]: s for s in read(REVIEW / f"candidates/batch-{prior}/batch.json")["subjects"]}
        for entry in read(REVIEW / f"candidates/batch-{prior}/reviewed.json")["active"]:
            if entry["decision"] not in ("revise", "reject"):
                continue
            assert feedback[entry["id"]] == entry["feedback"], "Newer GM feedback"
            subject = dict(old[entry["id"]])
            subject["revisionOf"] = entry
            reworks.append(subject)
    assert [s["key"] for s in reworks] == ["rzeznik", "serwisowanie", "slang", "sokole-oko", "solowa", "specjalizacja-spec", "spieprzysz-to"]
    roadmap = read(ROOT / "dev/icons/placeholder-pass/roadmap.json")
    fresh = [s for group in roadmap["batches"] for s in group["subjects"]][93:104]
    assert len(fresh) == 11
    already = {item.get("placeholderKey") for item in manifest["items"]}
    assert all(f"{s['kind']}:{s['key']}" not in already for s in fresh)
    groups = {84: reworks + fresh[:2], 85: fresh[2:]}
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
              "generalFeedback": "Apply exact saved revisions. Broad white glyphs, varied practical objects and generic adults; avoid gruff survivor defaults, anime, dithering and repeated dice.", "subjects": entries})
        references = (["dev/icons/review/" + s["revisionOf"]["selectedSource"] for s in reworks] + styles[7:]
                      if number == 84 else list(styles))
        canvas = Image.new("RGB", (768, 768), "black")
        for index, source in enumerate(references):
            with Image.open(ROOT / source) as original:
                rgba = original.convert("RGBA")
                rgba.thumbnail((256, 256), Image.Resampling.LANCZOS)
                canvas.paste(rgba, ((index % 3) * 256, (index // 3) * 256), rgba)
        canvas.save(here / "raw/style-reference.png")
        role = ("Reference cells 1-7 are the EXACT selected revision sources. Apply each saved correction: knife and threatened expression; coherent underside radio hatch; shared symbolic speech bubble; missing lower beak; pointing hand; straight simplified caliper. Cell 7 replaces the die concept ENTIRELY with sneering mockery. Reference cells 8-9 are STYLE ONLY for the two new subjects. Keep every complete glyph within its own cell."
                if number == 84 else "ALL nine reference cells are STYLE ONLY. Create the entirely NEW subjects below. Keep generic adult and animal anatomy natural, objects coherent and details broad for tiny inventory icons. No dice, repeated gruff portraits or anime.")
        prompt = GENERAL + role + "\nROW-MAJOR CONTENTS:\n" + "\n".join(f"{s['cell']}. {s['key']}: {s['request']}" for s in entries)
        write(here / "prompts.json", {"generator": "OpenAI built-in image generation", "date": DATE,
              "reference": "raw/style-reference.png", "role": role, "atlas": prompt, "targetedCorrections": []})
        write(here / "style-reference.json", {"role": role, "sources": [{"source": source, "sha256": sha(ROOT / source)} for source in references]})
        write(here / "references.json", {"role": "Exact native targets, not style inputs", "files": targets})
        write(here / "incoming.json", {"date": DATE, "batch": number,
              "feedbackSha256": hashlib.sha256(feedback_bytes).hexdigest(), "priorReviewItems": len(manifest["items"]),
              "priorResolvedItems": sum(item.get("status") == "resolved" for item in manifest["items"]),
              "revisionCount": sum("revisionOf" in s for s in entries), "freshCount": sum("revisionOf" not in s for s in entries),
              "rejectedConcepts": 0, "remainingPlaceholderFiles": 67, "remainingPlaceholderSubjects": 67})
        print(f"Batch {number}: " + ", ".join(s["key"] for s in entries))
    assert feedback_file.read_bytes() == feedback_bytes


if __name__ == "__main__":
    main()
