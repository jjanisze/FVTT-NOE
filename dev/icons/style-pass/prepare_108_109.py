"""Freeze four cleanup requests and twelve previously uncovered origin emblems."""
import json
import sys
from pathlib import Path
from PIL import Image
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "placeholder-pass"))
from prepare_70_71 import ROOT, REVIEW, GENERAL, read, write, sha
from snapshot import bitmap, contact

MOTIFS = {
    "bolesny-atak": ("Bolesny atak", "An opportunistic precise weapon strike exploits a vulnerable enemy.",
        "ONE complete plain COMBAT KNIFE held by ONE bare adult HAND, blade angled upward-right toward ONE broad TARGET RING with a single central black gap. Two short broad contact strokes show the precise strike. Only two broad finger separations. No full person, face, scars, texture, thin crosshairs, writing, blood or gore."),
    "czas-patriotow": ("Czas patriotów", "Patriotic resolve improves one crucial effort.",
        "ONE complete bare clenched FIST raised in front of ONE broad plain WIND-BLOWN FLAG on a short stout pole. Flag has three broad alternating black and white horizontal bands, no stars or emblems. Complete natural fist and wrist, two broad knuckle cuts only. Sober resolve, no portrait, hair, fabric texture, stitching, lettering, numerals or fine rays."),
    "pajecza-wspinaczka": ("Pajęcza wspinaczka", "A spider-like machine can climb rough surfaces and ceilings.",
        "TARGETED CLEANUP of reference cell 3. Preserve the existing central spider-climbing-the-wall glyph and its broad silhouette. REMOVE the stray fragment at the far LEFT of that cell completely. Keep just ONE intact spider-like climber against ONE vertical wall and short ceiling corner. Eight complete legs, four per side; no unrelated shapes, texture, fine wires or extra legs."),
    "wierze": ("Wierzę", "A small useful object unexpectedly becomes available.",
        "TARGETED EDIT of reference cell 4. Preserve the smooth featureless HEAD at LEFT facing RIGHT, and the THOUGHT BUBBLE with its KEY above-right. Change ONLY the real key's OFFERING HAND below-right: the FOREARM must ENTER FROM THE RIGHT EDGE of the composition, its WRIST on the RIGHT and FINGERTIPS pointing LEFT toward the wishing person. The hand comes FROM SOMEONE ELSE on the right, offering the tangible key TO the head on the left. One natural open palm faces upward, key rests above its fingers. Do not flip the head, thought bubble or entire image. No wrist entering from the left, extra hand, texture, portrait or tiny marks."),
    "asgard": "ONE heavy ROUND BUNKER VAULT DOOR in a thick simple rectangular frame, with ONE broad three-spoke locking wheel. Two large hinge blocks, solid uninterrupted steel silhouette, no numbers, runes, fine rivets, tiny circuitry, texture or lettering. Technological underground refuge, not a fantasy castle.",
    "czlowiek-pustyni": "ONE plain wrapped DESERT HEADSCARF around a smooth featureless adult head in side profile, paired with ONE squat CLOSED WATER CANTEEN. Broad cloth overlap cuts only, no beard, expressive face, eyes, hair strands, dither, dunes, stars or fine seams. Practical desert survival emblem.",
    "detroit": "ONE upright thick AUTOMOBILE TIRE behind ONE large complete ENGINE PISTON with its stout connecting rod angled across the lower half. Two broad tire-tread cuts and one piston groove only. Clear car-mechanic identity; no gear wheel, little bolts, spokes, lettering, racing logos or texture.",
    "appalachy": "ONE complete sturdy MINING PICK crossed diagonally in front of ONE broad angular MOUNTAIN PEAK. Clearly separate broad white head and intact handle, one wide black mountain ridge cut. A sober miners' emblem, no little rocks, dust, rays, tiny hatching, writing or fantasy ornament.",
    "miami": "ONE small SHALLOW-DRAFT SKIFF in clean side profile, bow pointing RIGHT, with ONE broad PALMETTO FROND curving above its stern. Three wide waterline cuts beneath the hull. Swamp-pirate and marsh identity; no people, skull flag, intricate rigging, many thin leaves, tropical holiday decoration, text or logos.",
    "missisipi": "ONE plain utilitarian GAS MASK in front view, paired with TWO thick MARSH REEDS at one side. Two broad black eye lenses, one large round front filter with two broad cuts; three blunt reed leaves only. Grim contaminated-swamp hunter emblem, no face inside, hoses, fine filter mesh, radiation lettering, skulls, blood or texture.",
    "nowy-jork": "ONE large OPEN BOOK with only TWO wide black page-fold cuts, above ONE simple THREE-TOWER CITY SKYLINE. Broad solid city blocks without tiny windows, clean black gap between book and skyline. Education, civilization and trade; no torch statue, letters, dollar sign, logos, rays or fine architectural detail.",
    "hegemonia": "ONE natural bare CLENCHED FIST raised above ONE short BROKEN HEAVY CHAIN with exactly TWO broad oval links separated at center. Two wide finger cuts, one complete wrist. Harsh strength and loyalty born from prison ancestry, no face, portrait, gang initials, tattoo, weapon, gore, fine texture or tiny chain links.",
    "posterunek": "ONE large solid SHIELD containing ONE simple square MICROCHIP with three broad pins on each side and one black central square. Disciplined high-technology defense against machines. No helmet, person, little circuit traces, writing, crosshair, stars, electrical sparks or decorative cogs.",
    "salt-lake-city": "ONE thick OPEN BOOK with ONE large clean upright CROSS rising from its center fold. Two broad black page separations only. Sober religious faith and old-world history, no person, fine page lines, lettering, decorative rays, cathedral, ornament or texture.",
    "teksas": "ONE complete broad-brimmed COWBOY HAT above ONE large HORSESHOE with its opening upward. One broad hatband cut and two large horseshoe nail holes only. Plain ranching and horse-country identity, no skull, gun, face, beard, star badge, letters, ornamental tooling or texture.",
    "vegas": "THREE complete PLAYING CARDS fanned compactly, each a thick rounded rectangle with a wide black separation. The front card contains ONE large BLACK SPADE shape, other cards remain blank. Plain physical gambling cards as regional identity, no dice, numerals, letters, suit corner labels, tiny pips, casino logo, sparkle or texture."
}


def main():
    feedback_file, style_file = REVIEW / "feedback.json", REVIEW / "style-feedback.json"
    before = {p: p.read_bytes() for p in (feedback_file, style_file)}
    feedback, style = (json.loads(before[p])["items"] for p in (feedback_file, style_file))
    old_batch = read(REVIEW / "candidates/batch-107/batch.json")
    revised = next(s for s in read(REVIEW / "candidates/batch-107/reviewed.json")["active"] if s["decision"] == "revise")
    assert revised["id"] == "style104-wierze" and feedback[revised["id"]] == revised["feedback"]
    old_subject = next(s for s in old_batch["subjects"] if s["itemId"] == revised["id"])
    assert sha(REVIEW / revised["selectedSource"]) == revised["sourceSha256"]
    origins = read(ROOT / "dev/icons/origin-icons-2026-10-17.json")["origins"]
    assert len(origins) == 12 and all(not o["exists"] for o in origins)
    subjects = []
    for key in ("bolesny-atak", "czas-patriotow", "pajecza-wspinaczka", "wierze"):
        name, rules, request = MOTIFS[key]
        flag = style[f"abilities/{key}"]
        assert flag["status"] == "redo" and sha(ROOT / flag["source"]) == flag["sourceSha256"]
        subject = {"kind": "feature", "key": key, "name": name, "target": flag["source"],
            "itemId": f"style108-{key}", "ruleContext": rules,
            "context": f"Ability: {name}. {rules} Inventory, sheet, hotbar and chat; 16–64 px.",
            "deliveryTargets": [{"source": flag["source"], "variant": "default", "sourceSha256": flag["sourceSha256"]}],
            "styleFeedback": flag, "request": request}
        if key == "wierze":
            subject.update(itemId=old_subject["itemId"], revisionOf=revised)
        subjects.append(subject)
    for origin in origins:
        target = origin["source"]
        assert not any((ROOT / target).with_suffix(ext).exists() for ext in (".svg", ".webp", ".png"))
        subjects.append({"kind": "origin", "key": origin["id"], "name": origin["label"], "target": target,
            "itemId": f"origin-{origin['id']}", "ruleContext": origin["flavour"],
            "context": f"Pochodzenie background: {origin['label']}. {origin['flavour']} Character origin, background sheet and compendium; 16–64 px.",
            "deliveryTargets": [{"source": target, "variant": "default", "sourceSha256": None}],
            "fallback": origin["fallback"], "request": MOTIFS[origin["id"]]})
    styles = read(REVIEW / "candidates/batch-102/style-reference.json")["sources"]
    for item in styles:
        assert sha(ROOT / item["source"]) == item["sha256"]
    for index, number in enumerate((108, 109)):
        here = REVIEW / f"candidates/batch-{number}"
        assert not here.exists(), "Batch already allocated"
        (here / "raw").mkdir(parents=True)
        active = subjects[index * 9:(index + 1) * 9]
        files, selected_sources, missing = [], [], []
        canvas = Image.new("RGB", (768, 768), "black")
        for cell, subject in enumerate(active, 1):
            subject["cell"] = cell
            if subject["kind"] == "origin":
                missing += [str(Path(subject["target"]).with_suffix(ext)).replace("\\", "/") for ext in (".svg", ".webp", ".png")]
                continue
            source = REVIEW / revised["selectedSource"] if subject.get("revisionOf") else ROOT / subject["target"]
            image = bitmap(source)
            image.thumbnail((256, 256), Image.Resampling.LANCZOS)
            canvas.paste(image, (((cell - 1) % 3) * 256 + (256 - image.width) // 2,
                                ((cell - 1) // 3) * 256 + (256 - image.height) // 2), image)
            selected_sources.append({"key": subject["key"], "source": source.relative_to(ROOT).as_posix(), "sha256": sha(source)})
            files += [{"source": file.relative_to(ROOT).as_posix(), "sha256": sha(file)} for ext in (".svg", ".webp", ".png")
                      if (file := (ROOT / subject["target"]).with_suffix(ext)).is_file()]
        canvas.save(here / "raw/current-reference.png")
        contact([s["source"] for s in styles], here / "raw/style-reference.png")
        general = GENERAL.replace("exactly NINE separate equal cells", f"exactly {len(active)} active glyphs in NINE equal cells")
        role = ("Reference 1 supplies DESIRED BROAD WHITE GLYPH STYLE only. Reference 2 shows current edit targets in cells 1–4 only; "
                "cells 1 and 2 need broad simplification, cell 3 needs only removal of the stray fragment at its far left, "
                "cell 4 needs only the offering hand reversed as described. Blank reference cells are NEW origin emblems, described below. "
                if number == 108 else "Reference 1 supplies DESIRED BROAD WHITE GLYPH STYLE only. All seven subjects are NEW origin-region emblems. ")
        prompt = general + role + "\nROW-MAJOR CONTENTS:\n" + "\n".join(f"{s['cell']}. {s['name']}: {s['request']}" for s in active)
        batch = {"date": "2026-10-17", "batch": number, "pass": "origin-coverage-and-style", "subjects": active}
        if len(active) < 9:
            batch.update(partialAtlas=True, emptyCells=list(range(len(active) + 1, 10)))
            prompt += "\nCELLS 8 AND 9 MUST STAY COMPLETELY EMPTY PURE BLACK. No glyph, label, line or decoration."
        references = ["raw/style-reference.png"] + (["raw/current-reference.png"] if number == 108 else [])
        write(here / "batch.json", batch)
        write(here / "prompts.json", {"date": batch["date"], "generator": "OpenAI built-in image generation", "reference": references[0],
            "references": references, "role": role, "atlas": prompt, "targetedCorrections": []})
        write(here / "incoming.json", {"productionFiles": files, "expectedAbsent": missing, "feedbackSha256": sha(feedback_file),
            "styleReviews": [s["styleFeedback"] for s in active if "styleFeedback" in s]})
        write(here / "style-reference.json", {"sources": styles, "selectedSources": selected_sources})
        write(here / "references.json", {"files": files, "expectedAbsent": missing, "selectedSources": selected_sources})
        write(here / "revision-feedback-before.json", {s["itemId"]: s["revisionOf"]["feedback"] for s in active if "revisionOf" in s})
        write(here / "style-feedback-before.json", {s["styleFeedback"]["iconId"]: s["styleFeedback"] for s in active if "styleFeedback" in s})
        print(f"Batch {number}: {len(active)} subjects; " + ", ".join(s["key"] for s in active))
    for file, original in before.items():
        assert file.read_bytes() == original


if __name__ == "__main__":
    main()
