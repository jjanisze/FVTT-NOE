"""Freeze the remaining Halligan class pair and eight exact saved revisions."""
import json
from PIL import Image
from prepare_70_71 import GENERAL, ROOT, REVIEW, read, write, sha
from class_options_92 import GENERAL as PAIR_GENERAL

DATE = "2026-10-16"
MOTIFS = {
    "zawolajcie-kolegow": "REVISION of reference cell 1. Keep both small upper fists unchanged and keep the foreground PALM FACING VIEWER with THUMB at viewer RIGHT. The current raised finger on the LEFT of the hand is the WRONG finger. Fold that LEFTMOST LITTLE FINGER down. Raise ONLY the INDEX FINGER immediately NEXT TO THE THUMB, on the RIGHT SIDE of the four fingers. The three other fingers form THREE folded knuckles across the LEFT half of the palm. The raised INDEX grows from the knuckle beside the thumb on the RIGHT, rises above the three folded fingers, and bends its fingertip inward as a COME-HERE beckon. Thumb stays separate on the far RIGHT. Exactly ONE thumb and FOUR fingers; no finger arising from the left edge, extra knuckle or extra digit. Natural adult hand anatomy, broad sparse palm crease, exactly three complete hands total.",
    "chemik": "REVISION of reference cell 2. Preserve the flask, liquid and two bubbles. REDRAW THE DROPPER as a much simpler STRAIGHT PIPETTE: ONE oval rubber bulb centered on ONE long slim straight glass tube. Bulb center, tube and pointed tip lie on ONE continuous diagonal axis from upper-RIGHT to lower-LEFT. The tube has PARALLEL STRAIGHT sides and CONSTANT width along almost its whole length, with only a SHORT tapered sharp tip. No offset neck, stepped shoulder, bulge, bend, blade shape, connecting flange, detached drop or round melted endpoint. Broad black space separates the pipette from flask and liquid. Exactly flask and simple straight dropper, no formula, measurements, writing or fine detail.",
    "ganger": "REVISION of reference cell 3. Keep the studded baseball bat and complete circular motorcycle tire. Replace the three spokes with EXACTLY SIX broad STRAIGHT SPOKES, evenly spaced around ONE centered circular HUB. Six spokes point toward the positions of twelve, two, four, six, eight and ten o'clock. Six spokes make SIX large black wedge openings; no numbers are drawn. Keep all six spokes visible: move the diagonal bat just to the RIGHT of the wheel so it may overlap the OUTER RIGHT RIM but does NOT cover the hub or inner spokes. Both objects stay compact and complete. Natural coherent concentric wheel geometry, thick sober white cuts, no seventh spoke, tiny hub bolts, extra wheel, text or fine tread.",
    "medyk": "REVISION of reference cell 4. Keep the medical bag and complete stethoscope. Give the MEDKIT REAL BOX DEPTH in a simple THREE-QUARTER VIEW: one broad FRONT plane bearing the large black plus mark, one narrower RIGHT SIDE plane and one visible TOP plane, all meeting at coherent shared corners. Use broad BLACK SEAM CUTS between the white planes, NOT grey shading. The handle sits correctly on the top plane, corners and lid follow the same perspective. A solid box-shaped field medkit, not a flat briefcase drawing. Stethoscope remains complete and separate, no tiny clasps, text or texture.",
    "najemnik": "REVISION of reference cell 5. Preserve TWO blank dog tags on ONE short thick loop and ONE complete combat knife. CLEAN UP ALL CONTOURS: dog tags are smooth complete rounded rectangles with uninterrupted outside edges and ONE clear round suspension hole each. Knife has a clean broad blade, simple straight guard and coherent complete handle; smooth straight/curved blade edges meet at ONE crisp tip, without bites, melted lumps, dangling fragments or jagged artifacts. A broad black gap separates knife and tags. Keep the same overall equipment composition, no writing, numbers, chain microdetail, scratches, tiny teeth or gore.",
    "szczur": "REPLACE reference cell 6's LITERAL RAT AND VIAL ENTIRELY. This is a HUMAN INFILTRATOR using an unnoticed HOMELESS/Beggar DISGUISE. Show ONE ordinary generic ADULT huddled in a worn HOODED OVERCOAT, seated in a compact natural crouch with knees bent, holding ONE plain TIN BEGGING CUP in a complete hand extended slightly forward. Hood frames a small smooth featureless natural adult head; other hand stays tucked under the coat. Two broad irregular hem cuts suggest worn clothing, no fine rags. Quiet unobtrusive disguise, natural ordinary proportions, restrained dignified depiction, broad white masses and large black gaps. No animal, rat tail, ears, chemical vial, gruff beard portrait, anime, huge eyes, logos, writing, gore or caricature. The canonical Szary ability concerns blending into society as an ignored beggar.",
    "wojownik-autostrady": "REVISION of reference cell 7. Keep the steering wheel and the same general sawed-off shotgun composition. REDRAW THE SHOTGUN COHERENTLY in simple SIDE PROFILE: TWO short straight PARALLEL BARRELS both join ONE solid shared BREECH and both end at the SAME straight perpendicular muzzle line. No floating oval rings at the muzzle. One broad wooden FORE-END lies beneath the barrels; ONE continuous short bird's-head grip curves from the breech; ONE complete empty trigger guard sits below the receiver, with a single small trigger inside. All gun parts align naturally on the same axis. Broad black separation from the wheel, no crooked barrels, melted receiver, extra grip, disconnected trigger, tiny screws, text or logo.",
    "zabojca-maszyn": "REVISION of reference cell 8. Correct the ROBOT HEAD into a coherent SYMMETRICAL FRONT VIEW: ONE intact squared casing, TWO equally sized rectangular eye openings on the SAME horizontal line, TWO identical side ear modules at the SAME height, ONE centered lower jaw with ONE broad straight horizontal mouth slot, and ONE centered short neck block. All facial components share one vertical centerline and fit inside the casing. Place the retained LIGHTNING BOLT beside the head on its RIGHT, separated by a broad black gap, so it no longer hides or distorts either eye or the right contour. Exactly robot head and bolt, broad sober industrial shapes, no human face, cartoon expression, tiny wires, text, gore or extra fragments."
}
HALLIGAN = (
    "Keep the same headless bare torso with its single healed diagonal chest scar. Replace the ENTIRE HAMMER with ONE proper HALLIGAN FORCIBLE-ENTRY BAR. "
    "The Halligan has ONE long stout straight steel shaft, a TWO-PRONGED FORK with a deep U-shaped gap at ONE end, and a compact ADZE-AND-PIKE HEAD at the OTHER end: "
    "one short broad flat adze blade projecting to one side and one short pointed spike projecting to the opposite side at the SAME junction. "
    "Complete unmistakable fork, shaft, adze and pike, broad simplified white silhouette. No hammer block, sledge head, axe blade, knife, gun, labels or fine machining. "
    "Exactly torso and Halligan bar, no extra prop, wound, blood, gore or detailed muscles."
)


def opaque(source, target):
    with Image.open(source) as original:
        rgba = original.convert("RGBA")
        canvas = Image.new("RGB", rgba.size, "black")
        canvas.paste(rgba, (0, 0), rgba)
        canvas.save(target)


def main():
    feedback_file = REVIEW / "feedback.json"
    feedback_bytes = feedback_file.read_bytes()
    feedback = json.loads(feedback_bytes)["items"]
    manifest = read(REVIEW / "manifest.json")
    reworks = []
    for prior in (93, 94, 95):
        old = {s["itemId"]: s for s in read(REVIEW / f"candidates/batch-{prior}/batch.json")["subjects"]}
        for saved in read(REVIEW / f"candidates/batch-{prior}/reviewed.json")["active"]:
            if saved["decision"] not in ("revise", "reject"):
                continue
            assert feedback[saved["id"]] == saved["feedback"], "Newer GM feedback"
            subject = dict(old[saved["id"]])
            subject["revisionOf"] = saved
            for target in subject["deliveryTargets"]:
                assert sha(ROOT / target["source"]) == target["sourceSha256"]
            reworks.append(subject)
    assert len(reworks) == 9
    classes = [s for s in reworks if s["kind"] == "class"]
    other = [s for s in reworks if s["kind"] != "class"]
    assert [s["key"] for s in classes] == ["brutal"]
    assert [s["key"] for s in other] == list(MOTIFS)
    for n in (96, 97):
        assert not (REVIEW / f"candidates/batch-{n}").exists(), "Already allocated"
    here = REVIEW / "candidates/batch-96"
    (here / "raw").mkdir(parents=True)
    for variant in ("a", "b"):
        (REVIEW / f"candidates/batch-96-{variant}").mkdir()
    styles = read(REVIEW / "candidates/batch-93/style-reference.json")["sources"]
    canvas = Image.new("RGB", (768, 768), "black")
    for index, item in enumerate(styles):
        assert sha(ROOT / item["source"]) == item["sha256"]
        with Image.open(ROOT / item["source"]) as original:
            rgba = original.convert("RGBA")
            rgba.thumbnail((256, 256), Image.Resampling.LANCZOS)
            canvas.paste(rgba, ((index % 3) * 256, (index // 3) * 256), rgba)
    canvas.save(here / "raw/style-reference.png")
    subject = classes[0]
    opaque(REVIEW / subject["revisionOf"]["selectedSource"], here / "raw/reference-brutal.png")
    options = {"a": "Preserve torso LEFT and place the complete Halligan diagonally at RIGHT, adze-and-pike head at UPPER-RIGHT and fork at LOWER-RIGHT. " + HALLIGAN,
               "b": "Preserve torso LEFT and place the complete Halligan at RIGHT with its FORK at the TOP and adze-and-pike head at the BOTTOM, a compact alternative layout. " + HALLIGAN}
    subject.update(cell=1, request=HALLIGAN, options=options)
    prompt = PAIR_GENERAL.replace("The first reference is STYLE ONLY; do not copy its subject or nine-cell layout.",
                                "The FIRST reference is the exact torso EDIT TARGET; retain its torso and scar, replacing only its hammer. The SECOND reference is STYLE ONLY.")
    prompt += f"\nCLASS: Brutal. LEFT OPTION A: {options['a']}\nRIGHT OPTION B: {options['b']}"
    write(here / "batch.json", {"date": DATE, "batch": 96, "mode": "two-options-per-primary-class", "subjects": classes})
    write(here / "prompts.json", {"generator": "OpenAI built-in image generation", "date": DATE,
          "research": [{"title": "Fire Hooks Unlimited Pro-Bar", "url": "https://www.firehooksunlimited.net/probars.html", "purpose": "Halligan fork, adze and pike form; text-only geometry reference, no product photography copied"}],
          "pairs": [{"key": "brutal", "reference": ["raw/reference-brutal.png", "raw/style-reference.png"], "output": "raw/brutal-pair.png", "prompt": prompt}]})
    write(here / "style-reference.json", {"sources": styles})
    write(here / "revision-feedback-before.json", {s["itemId"]: s["revisionOf"]["feedback"] for s in classes})
    write(here / "references.json", {"files": [{"key": s["key"], **t} for s in classes for t in s["deliveryTargets"]]})
    write(here / "incoming.json", {"date": DATE, "batch": 96, "feedbackSha256": sha(feedback_file), "classSubjects": 1, "optionsPerSubject": 2})
    here = REVIEW / "candidates/batch-97"
    (here / "raw").mkdir(parents=True)
    canvas = Image.new("RGB", (768, 768), "black")
    sources, targets = [], []
    for index, subject in enumerate(other):
        subject.update(cell=index + 1, request=MOTIFS[subject["key"]])
        source = "dev/icons/review/" + subject["revisionOf"]["selectedSource"]
        sources.append({"source": source, "sha256": sha(ROOT / source)})
        with Image.open(ROOT / source) as original:
            rgba = original.convert("RGBA")
            rgba.thumbnail((256, 256), Image.Resampling.LANCZOS)
            canvas.paste(rgba, ((index % 3) * 256, (index // 3) * 256), rgba)
        targets.extend({"key": subject["key"], **t} for t in subject["deliveryTargets"])
    canvas.save(here / "raw/style-reference.png")
    role = "Reference cells 1-8 are EXACT SELECTED revision targets. Cell 6 is a failed literal-animal concept and must be REPLACED by the human beggar disguise described below. Output cell 9, BOTTOM-RIGHT, stays completely PURE BLACK and EMPTY, with no glyph, mark, label or decorative content. All eight corrections must stay inside their own cells. "
    general = GENERAL.replace("Create ONE square atlas with exactly NINE separate equal cells, a 3x3 grid in strict ROW-MAJOR order.",
                              "Create ONE square atlas with EIGHT separate glyphs in a 3x3 equal-cell grid in strict ROW-MAJOR order, occupying cells 1-8; the ninth cell is empty black.")
    prompt = general + role + "\nROW-MAJOR CONTENTS:\n" + "\n".join(f"{s['cell']}. {s['key']}: {s['request']}" for s in other) + "\n9. EMPTY PURE BLACK. Draw nothing in bottom-right cell."
    write(here / "batch.json", {"date": DATE, "batch": 97, "partialAtlas": True, "emptyCells": [9], "generalFeedback": "Eight exact saved revisions; spare final cell stays empty. No literal rat for the Szczur profession.", "subjects": other})
    write(here / "prompts.json", {"generator": "OpenAI built-in image generation", "date": DATE, "reference": "raw/style-reference.png", "role": role, "atlas": prompt, "targetedCorrections": []})
    write(here / "style-reference.json", {"role": role, "sources": sources})
    write(here / "references.json", {"files": targets, "szczurCanonicalSource": "dev/classes/professions.json", "canonicalSha256": sha(ROOT / "dev/classes/professions.json")})
    write(here / "incoming.json", {"date": DATE, "batch": 97, "feedbackSha256": sha(feedback_file), "priorReviewItems": len(manifest["items"]),
          "priorResolvedItems": sum(c.get("status") == "resolved" for c in manifest["items"]), "revisionCount": 8, "freshCount": 0,
          "rejectedConcepts": 0, "remainingPlaceholderFiles": 9, "remainingPlaceholderSubjects": 9})
    assert feedback_file.read_bytes() == feedback_bytes
    print("Batch 96: two Halligan class choices. Batch 97: eight saved revisions, final cell empty. No new subjects.")


if __name__ == "__main__":
    main()
