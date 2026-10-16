"""Freeze four class pairs and the final eighteen ordinary placeholder candidates."""
import base64
import io
import json
import xml.etree.ElementTree as ET
from PIL import Image
from prepare_70_71 import GENERAL, ROOT, REVIEW, read, write, sha
from class_options_92 import GENERAL as PAIR_GENERAL

DATE = "2026-10-16"
CLASS_KEYS = ("brutal", "cwaniak", "twardziel", "zwiadowca")
MOTIFS = {
    "zawolajcie-kolegow": "REVISION of reference cell 1. Keep the TWO small opposing fists above and the large foreground hand with its PALM FACING VIEWER and thumb at viewer RIGHT. Restore a single clear COME-HERE / FOLLOW-ME INDEX-FINGER BECKON: unfold ONLY the INDEX finger upward above the other knuckles, then curl its tip inward toward the viewer as a natural hook. The middle, ring and little fingers remain folded into the palm. One thumb, four fingers total, natural coherent adult anatomy. Keep palm crease and both upper fists unchanged. Exactly three hands, no extra finger, fingernails on palm, upside-down hand, face or text.",
    "zryw": "NEW CONCEPT for extra-action ACTION SURGE, replacing the old stopwatch entirely: ONE powerful complete BARE CLENCHED FIST thrusts upward in front of ONE bold LIGHTNING BOLT, with TWO short thick horizontal AFTERIMAGE STROKES trailing the wrist to the left. Physical burst of renewed effort grants another action. Broad coherent fingers and thumb, short complete wrist, clear black separation from the bolt. Compact sober white glyph, no clock, stopwatch, dial, running person, gruff portrait, words, numerals, extra hands or tiny sparks.",
    "chemik": "REVISION of reference cell 3. Keep the laboratory flask, its bubbles and the diagonal dropper in the same composition. FIX ONLY THE MELTED PIPETTE TIP: the narrow glass tube has two smooth straight sides tapering into ONE clean SHARP POINT. Remove the rounded white blob/drop attached to the old tip. The pipette remains complete from rubber bulb to sharp glass tip, separated clearly from the flask and liquid by broad black cuts. No detached droplet, text, labels, formula, measurements or tiny details.",
    "ganger": "REVISION of reference cell 4. Preserve the studded baseball bat and complete tire. REDRAW THE WHEEL AS A COHERENT WHEEL: ONE round central HUB on the exact tire center, with exactly THREE equally spaced thick STRAIGHT SPOKES radiating from that SAME hub to the inner rim, at 120-degree intervals. Their hidden portions align continuously behind the bat, not at different offsets. Three large black wedge-shaped openings, intact concentric circular rim and tire, broad black separation from the bat. No floating or shifted spoke, extra hub, fine tread, text or extra prop.",
    "kaznodzieja": "ONE sturdy closed PRAYER BOOK with ONE large plain CROSS cut in black on its white cover, paired with ONE complete simple LEVER-ACTION RIFLE angled beside it. Broad book spine and complete rifle stock, barrel and empty trigger guard, very few internal cuts. Faith and armed preaching in a sober wasteland emblem. No writing, scripture, letters, numerals, ornate religious art, real insignia, person or fine engraving.",
    "kowboj": "ONE broad-brimmed WESTERN HAT above ONE complete practical REVOLVER angled upward-right, with broad cylinder, complete barrel, grip and empty trigger guard. Two simple large black hat-crease cuts. Strong compact sober white silhouette, no rider or face, portrait likeness, star badge, labels, numerals, fine leather tooling or engraving.",
    "kurier": "ONE complete rugged MOTORCYCLE in clear side profile with TWO intact round wheels, short saddle and simple handlebars. ONE stout SEALED PARCEL is strapped on the rear rack with ONE broad plain band. Courier transport and hidden cargo, broad compact white glyph with large black gaps. No rider, face, writing, labels, logo, fine spokes, chain texture, extra wheels or tiny cargo.",
    "lowca-mutantow": "ONE simple living MUTANT ANIMAL HEAD in profile with ONE blunt forehead horn, one eye cut and a coherent short neck, paired with ONE complete broad SYRINGE DART angled beside it. The dart has a stout barrel, simple tail cap and one short intact pointed tip. Mutant knowledge plus specialized chemical ammunition, broad compact white glyph. No human portrait, severed tissue, wound, blood, gore, fine scales, formula, labels or extra horns.",
    "mafiozo": "ONE plain formal SUIT LAPEL AND NECKTIE emblem, cropped without any head, behind ONE complete compact PISTOL angled upward-right. Broad jacket lapels and large tie knot; pistol has a complete short barrel, slide, grip and empty trigger guard. Criminal leadership and armed authority, sober compact white masses. No person, face, real gang mark, hat, lettering, numerals, fine suit fabric or engraving.",
    "medyk": "ONE sturdy MEDICAL BAG with a complete handle, one broad black PLUS mark on its white front and TWO simple lid cuts, paired with ONE complete STETHOSCOPE with a thick U-shaped tube and one large round chest piece. Clear broad black gap, practical field medicine, compact white silhouettes. No person, face, lettering, labels, tiny clasps, fine tubing, extra drugs or gore.",
    "monter": "ONE complete practical OPEN-END WRENCH crosses ONE stout ENGINE PISTON with a broad cylindrical crown, TWO large piston-ring cuts and one complete connecting rod with large round end. Broad black separation at crossing. Repair and mechanical construction, sober compact white equipment emblem. No person, face, giant cog, fine wiring, tiny parts, text, numerals or logo.",
    "najemnik": "TWO broad blank MILITARY DOG TAGS hang together from ONE short thick loop, behind ONE complete practical COMBAT KNIFE angled upward-right. Complete blade, simple guard and stout handle with TWO broad grip cuts, large black separation. Professional hired fighter, equipment and service. No names, numbers, readable tags, real insignia, fine chain, face, camouflage texture or gore.",
    "sedzia": "ONE plain sturdy SHIELD-SHAPED LAW BADGE with ONE bold FIVE-POINT STAR cut in black, paired with ONE complete pair of HANDCUFFS consisting of TWO broad open rings joined by ONE thick short connector. Field law enforcer, not a courtroom judge. Broad compact white masses and black gaps, no gavel, scale, text, numerals, real police logo, tiny chain or person.",
    "szczur": "ONE realistically proportioned adult RAT crouches low beside ONE squat STOPPERED CHEMICAL VIAL bearing ONE large black DROP-shaped mark. Rat has one long tail, rounded ears, pointed muzzle, one eye and natural paws, very sparse anatomy. Unnoticed scavenger and poison resistance/craft, broad compact white glyph. No cute mascot, anime, fine fur, formula, labels, skull clutter, extra limbs or gore.",
    "wojownik-autostrady": "ONE complete stout STEERING WHEEL with THREE broad spokes around one center hub, paired with ONE complete SAWED-OFF DOUBLE-BARREL SHOTGUN angled upward-right. Two thick parallel short barrels, complete grip, simple receiver and empty trigger guard. Vehicle combat, sober compact white silhouette with broad black separation. No driver, face, cars, numerals, letters, fine wheel stitching or gun engraving.",
    "zabojca": "ONE complete practical SCOPED RIFLE fitted with ONE stout cylindrical SUPPRESSOR at the muzzle, paired with ONE broad simple TARGET CROSSHAIR beside the stock. Rifle stock, straight barrel, scope and empty trigger guard remain complete. Four thick reticle ticks and one central dot, precise concealed ranged attack. No person, hooded portrait, text, labels, measurements, fine fittings, blood or gore.",
    "zabojca-maszyn": "ONE plain industrial ROBOT HEAD with a squared casing, TWO large dark rectangular eye openings and ONE broad jaw slot, crossed by ONE bold LIGHTNING BOLT with broad black separation. Electromagnetic attack against machines, sober compact white stencil. No human face, gruff portrait, cartoon expression, generic cog, fine circuits, tiny cables, readable text or logo.",
    "zolnierz": "ONE complete practical FIELD COMBAT HELMET above ONE complete ASSAULT RIFLE angled upward-right, with broad stock, straight barrel, short thick magazine, one grip and empty trigger guard. Helmet has one broad rim and TWO large panel cuts only, no face or head. Military discipline and weapon proficiency, sober compact white glyph. No real military insignia, star badge, text, numerals, fine straps, tiny fittings or camouflage texture."
}
CLASS_CHANGES = {
    "brutal": "Preserve the selected headless bare torso. Add ONE broad short diagonal HEALED SCAR CUT on the upper chest, a closed old scar only, no wound, blood, tissue or gore. REPLACE THE KNIFE entirely with ONE complete HAND-HELD RAIL PILEDRIVER / HEAVY KAFAR following the supporting weapon reference: a massive blunt industrial rail-section striking tool, thick complete body and practical grip, NOT a rifle, railgun, knife or long thin spear. Exactly torso and piledriver as the two main elements. Keep natural adult proportions and sparse large anatomical cuts.",
    "cwaniak": "Keep the same complete tilted playing card with one large SPADES pip. Replace ONLY the megaphone with ONE complete handheld MICROPHONE: rounded grille with TWO broad grille cuts and one stout complete handle. Exactly card and microphone, no die, megaphone cone, star, cable, labels, numbers or fine mesh.",
    "twardziel": "Keep the complete aligned plate carrier with its single vertical centerline and continuous matching side contours. Replace ONLY the SMG with ONE complete LIGHT MACHINE GUN: a clearly longer STRAIGHT BARREL, broad receiver, complete shoulder stock, grip, empty trigger guard, ONE box ammunition container below the receiver and one broad FOLDED BIPOD under the forward barrel. Sober compact broad silhouette, no intricate belt links, tiny fittings, lettering or shifted armor panels. Exactly armor and LMG.",
    "zwiadowca": "Keep the compass and rifle composition. FIX THE CROOKED RIFLE BARREL: receiver bore, whole barrel and muzzle all lie on ONE perfectly STRAIGHT axis angled upward-right. The barrel has parallel straight edges with NO kink or bend at the front sight, scope or muzzle. The scope remains straight and PARALLEL above the barrel, and the complete shoulder stock and trigger guard remain intact. Keep compass circle and bold needle, no letters, additional gear or tiny fittings. Exactly compass and hunting rifle."
}


def opaque(source, destination):
    with Image.open(source) as original:
        rgba = original.convert("RGBA")
        canvas = Image.new("RGB", rgba.size, "black")
        canvas.paste(rgba, (0, 0), rgba)
        canvas.save(destination)


def main():
    feedback_file = REVIEW / "feedback.json"
    feedback_bytes = feedback_file.read_bytes()
    feedback = json.loads(feedback_bytes)["items"]
    manifest = read(REVIEW / "manifest.json")
    entries = []
    for prior in (90, 91):
        old = {s["itemId"]: s for s in read(REVIEW / f"candidates/batch-{prior}/batch.json")["subjects"]}
        for saved in read(REVIEW / f"candidates/batch-{prior}/reviewed.json")["active"]:
            if saved["decision"] not in ("revise", "reject"):
                continue
            assert feedback[saved["id"]] == saved["feedback"], "Newer GM feedback"
            subject = dict(old[saved["id"]])
            subject["revisionOf"] = saved
            entries.append(subject)
    assert len(entries) == 8
    class_subjects = [next(s for s in entries if s["key"] == key) for key in CLASS_KEYS]
    reworks = [s for s in entries if s["kind"] != "class"]
    assert [s["key"] for s in reworks] == ["zawolajcie-kolegow", "zryw", "chemik", "ganger"]
    fresh = [s for group in read(ROOT / "dev/icons/placeholder-pass/roadmap.json")["batches"] for s in group["subjects"]][139:]
    assert len(fresh) == 14
    allocated = {c.get("placeholderKey") for c in manifest["items"]}
    assert all(f"{s['kind']}:{s['key']}" not in allocated for s in fresh)
    for number in (93, 94, 95):
        assert not (REVIEW / f"candidates/batch-{number}").exists(), "Already allocated"
    styles = read(REVIEW / "candidates/batch-92/style-reference.json")["sources"]
    def collage(sources, path):
        canvas = Image.new("RGB", (768, 768), "black")
        for index, source in enumerate(sources):
            with Image.open(ROOT / source) as original:
                rgba = original.convert("RGBA")
                rgba.thumbnail((256, 256), Image.Resampling.LANCZOS)
                canvas.paste(rgba, ((index % 3) * 256, (index // 3) * 256), rgba)
        canvas.save(path)
    here = REVIEW / "candidates/batch-93"
    (here / "raw").mkdir(parents=True)
    for v in ("a", "b"):
        (REVIEW / f"candidates/batch-93-{v}").mkdir()
    collage([s["source"] for s in styles], here / "raw/style-reference.png")
    svg = ET.fromstring((ROOT / "icons/weapons/kafar_piledriver.svg").read_text(encoding="utf-8"))
    data = svg.find(".//{http://www.w3.org/2000/svg}image").attrib["href"].split(",", 1)[1]
    with Image.open(io.BytesIO(base64.b64decode(data))) as original:
        rgba = original.convert("RGBA")
        canvas = Image.new("RGB", rgba.size, "black")
        canvas.paste(rgba, (0, 0), rgba)
        canvas.save(here / "raw/reference-kafar.png")
    pairs = []
    for index, subject in enumerate(class_subjects):
        key = subject["key"]
        opaque(REVIEW / subject["revisionOf"]["selectedSource"], here / f"raw/reference-{key}.png")
        base = CLASS_CHANGES[key]
        options = {"a": "Apply this exact correction while preserving the reference composition: " + base,
                   "b": "A second clean version of the SAME corrected two-element emblem. Keep both objects and their general positions; adjust their spacing and tilt slightly for a more compact balanced composition. " + base}
        subject.update(cell=index + 1, request=base, options=options)
        references = [f"raw/reference-{key}.png", "raw/style-reference.png"]
        if key == "brutal":
            references.append("raw/reference-kafar.png")
        role = "First reference is the EXACT SELECTED EDIT TARGET; second reference is STYLE ONLY. "
        if key == "brutal":
            role += "Third reference gives the actual heavy KAFAR weapon shape; simplify it to the broad glyph style. "
        prompt = PAIR_GENERAL.replace("The first reference is STYLE ONLY; do not copy its subject or nine-cell layout.", role)
        prompt += f"\nCLASS: {subject['name']}. LEFT OPTION A: {options['a']}\nRIGHT OPTION B: {options['b']}"
        pairs.append({"key": key, "reference": references, "output": f"raw/{key}-pair.png", "prompt": prompt})
    write(here / "batch.json", {"date": DATE, "batch": 93, "mode": "two-options-per-primary-class", "subjects": class_subjects})
    write(here / "prompts.json", {"generator": "OpenAI built-in image generation", "date": DATE, "pairs": pairs})
    write(here / "style-reference.json", {"sources": styles, "kafarSource": "icons/weapons/kafar_piledriver.svg", "kafarSha256": sha(ROOT / "icons/weapons/kafar_piledriver.svg")})
    write(here / "revision-feedback-before.json", {s["itemId"]: s["revisionOf"]["feedback"] for s in class_subjects})
    write(here / "references.json", {"files": [{"key": s["key"], **t} for s in class_subjects for t in s["deliveryTargets"]]})
    write(here / "incoming.json", {"date": DATE, "batch": 93, "feedbackSha256": sha(feedback_file), "classSubjects": 4, "optionsPerSubject": 2})
    (here / "raw/incoming-manifest.json").write_bytes((REVIEW / "manifest.json").read_bytes())
    groups = {94: reworks + fresh[:5], 95: fresh[5:]}
    professions = read(ROOT / "dev/classes/professions.json")
    for number, subjects in groups.items():
        here = REVIEW / f"candidates/batch-{number}"
        (here / "raw").mkdir(parents=True)
        assert len(subjects) == 9
        frozen, targets = [], []
        for index, original in enumerate(subjects):
            subject = dict(original)
            subject.update(cell=index + 1, request=MOTIFS[subject["key"]])
            subject.setdefault("itemId", f"batch{number}-{subject['key']}")
            if subject["kind"] == "profession":
                canonical = next(v for k, v in professions[subject["owner"]].items() if k.casefold() == subject["name"].casefold())
                subject["canonicalAbilities"] = [a["name"] for a in canonical["abilities"]]
                subject["ruleContext"] = canonical["proficiencies"] + " " + "; ".join(subject["canonicalAbilities"])
            for target in subject["deliveryTargets"]:
                assert sha(ROOT / target["source"]) == target["sourceSha256"]
                targets.append({"key": subject["key"], **target})
            frozen.append(subject)
        sources = (["dev/icons/review/" + s["revisionOf"]["selectedSource"] for s in reworks] + [s["source"] for s in styles[4:]]
                   if number == 94 else [s["source"] for s in styles])
        collage(sources, here / "raw/style-reference.png")
        role = ("Reference cells 1-4 are exact revision sources: restore hooked beckoning index while keeping palm forward; replace stopwatch with action-surge effort emblem; sharpen pipette tip and remove melted blob; rebuild three wheel spokes at one center. Cells 5-9 are STYLE ONLY for five new professions. "
                if number == 94 else "ALL nine reference cells are STYLE ONLY. Create the last nine fresh professions below, with broad practical equipment and sparse symbols. ")
        prompt = GENERAL + role + "\nROW-MAJOR CONTENTS:\n" + "\n".join(f"{s['cell']}. {s['key']}: {s['request']}" for s in frozen)
        write(here / "batch.json", {"date": DATE, "batch": number, "generalFeedback": "Broad sober white glyphs, no anime, no repeated gruff portraits; apply exact saved revisions.", "subjects": frozen})
        write(here / "prompts.json", {"generator": "OpenAI built-in image generation", "date": DATE, "reference": "raw/style-reference.png", "role": role, "atlas": prompt, "targetedCorrections": []})
        write(here / "style-reference.json", {"role": role, "sources": [{"source": s, "sha256": sha(ROOT / s)} for s in sources]})
        write(here / "references.json", {"files": targets, "canonicalProfessionSource": "dev/classes/professions.json", "canonicalSha256": sha(ROOT / "dev/classes/professions.json")})
        write(here / "incoming.json", {"date": DATE, "batch": number, "feedbackSha256": sha(feedback_file), "priorReviewItems": len(manifest["items"]),
              "priorResolvedItems": sum(c.get("status") == "resolved" for c in manifest["items"]), "revisionCount": sum("revisionOf" in s for s in frozen),
              "freshCount": sum("revisionOf" not in s for s in frozen), "rejectedConcepts": 0, "remainingPlaceholderFiles": 22, "remainingPlaceholderSubjects": 22})
        print(f"Batch {number}: " + ", ".join(s["key"] for s in frozen))
    for subject in class_subjects:
        for target in subject["deliveryTargets"]:
            assert sha(ROOT / target["source"]) == target["sourceSha256"]
    assert feedback_file.read_bytes() == feedback_bytes
    print("Batch 93: four class pairs. All 153 roadmap subjects now allocated; zero await first generation.")


if __name__ == "__main__":
    main()
