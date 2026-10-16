"""Prepare, normalize and register two generated options for each primary class."""
import argparse
import base64
import hashlib
import io
import json
import re
import sys
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from PIL import Image, ImageDraw

sys.dont_write_bytecode = True
from process import ROOT, REVIEW, clean, masks

NUMBER = 92
DATE = "2026-10-16"
HERE = REVIEW / f"candidates/batch-{NUMBER}"
KEYS = ("brutal", "cwaniak", "spec", "twardziel", "zlodziej", "zwiadowca")
GENERAL = (
    "Use case: stylized-concept. Asset: pivotal primary-class icons for a post-apocalyptic tabletop interface. "
    "Create ONE LANDSCAPE image containing exactly TWO independent glyphs, LEFT option A and RIGHT option B, "
    "in two equal side-by-side cells. No visible grid, captions, labels, letters, numbers, logos or border. "
    "Both options must use PURE SOLID WHITE #FFFFFF on perfectly clean PURE BLACK #000000. "
    "Match the reference's sober broad stencil weight, with large black negative-space cuts. "
    "Each complete glyph occupies the middle 60 percent of its own cell, with generous blank space on ALL sides "
    "and a wide empty black gutter between the two options. No part crosses the middle division. "
    "Each option contains exactly TWO distinct main elements, covering different sides of the class. "
    "They are two alternative emblems for the SAME class, not two halves of one combined emblem. "
    "Readability at 16/24/32 pixels matters: broad silhouettes, very few internal cuts, complete coherent objects. "
    "No shading, grey, gradients, hatching, dithering, texture, distressing, hair strands, tiny fittings or thin detail. "
    "No anime, cartoon anatomy, gruff survivor busts, giant generic cogs, decorative frames or gore. "
    "The first reference is STYLE ONLY; do not copy its subject or nine-cell layout.\n"
)
CONCEPTS = {
    "brutal": {
        "rationale": "Berserk and Strength-based melee define the class; Bare Chest rewards fighting without armor. Starting equipment includes a heavy hammer and tactical knife. Represent physical force and melee equipment rather than unrelated freedom symbolism.",
        "a": "ONE powerful complete BARE CLENCHED FIST beside ONE heavy industrial SLEDGEHAMMER angled upward-right behind it. Coherent thumb and four folded fingers, short bare wrist; hammer has one broad rectangular steel head and one stout complete handle. Clear broad black separation keeps fist and hammer separately readable. Unarmed force plus heavy melee; no chain, armor, face, tiny knuckles or debris.",
        "b": "ONE plain HEADLESS BARE ADULT UPPER TORSO beside ONE complete practical TACTICAL KNIFE pointing upward. Torso ends at base of neck and above waist; ordinary strong adult proportions, shoulders and chest as one broad modest solid mass with only TWO large anatomical cuts. Knife has one broad blade, short guard and stout handle; black separation from torso. Unarmored toughness plus melee precision. No nipples, bodybuilder detail, person portrait, extra limbs, fine serrations, injuries or gore."
    },
    "cwaniak": {
        "rationale": "The class's central pairing is Charisma-based influence and extraordinary luck. Motivation and Quick Talk affect people; Luck changes rolls. Two playing cards express only the luck side.",
        "a": "ONE coherent isometric SIX-SIDED DIE paired with ONE complete handheld MICROPHONE leaning diagonally beside it. Die has three broad planar faces meeting at consistent shared vertices, just one, two and three large round black pips on its faces. Microphone has a stout handle and rounded grille with only TWO broad grille cuts. Clear black gap between objects. Luck plus persuasive speech or motivation, no star, cables, text or fine mesh.",
        "b": "ONE complete PLAYING CARD with ONE large black SPADES pip paired with ONE sturdy handheld MEGAPHONE angled upward-right. Card is a thick white rectangular mass with no corner indices. Megaphone has a broad flared cone, short complete grip and ONE large black mouth opening. Separate the two objects with broad black space or one clean overlap cut. Luck plus leadership and rapid persuasion, no face, dice, sound-ray clutter, letters, numbers or tiny switches."
    },
    "spec": {
        "rationale": "The class description explicitly spans a hospital, distillery and professional workshop. The GM asks for engineering plus medicine, suggesting wrench and syringe; two technical props underrepresent the class.",
        "a": "ONE complete OPEN-END WRENCH and ONE complete MEDICAL SYRINGE cross as a compact balanced X. Wrench open jaw at upper-left and broad handle at lower-right; syringe plunger at upper-right and short intact needle at lower-left. Syringe has a thick barrel, clear finger flange and complete plunger. ONE broad black cut separates the crossing. Exactly two complete tools, engineering plus medicine; no microchip, cog, labels, measurement ticks, droplets or hair-thin needle.",
        "b": "ONE complete OPEN-END WRENCH stands slightly tilted on the LEFT; ONE complete MEDICAL SYRINGE stands slightly tilted on the RIGHT, angled gently apart at the top. Wrench jaw and syringe plunger remain complete and clearly distinct. Broad syringe barrel, finger flange, stout plunger and short needle; wrench has an open jaw and one large handle hole. Stagger heights slightly for a compact emblem, broad black gap between tools. Engineering plus medicine, no crossing, chip, extra tool, labels, tiny graduations or fine detail."
    },
    "twardziel": {
        "rationale": "The class specializes in all weapons and armor, maximizing firepower and defense. The GM approves the vest-and-gun concept and requires the upper and lower armor pieces to align. Starting equipment includes a plate carrier and submachine gun.",
        "a": "ONE complete BODY-ARMOR VEST behind ONE practical PUMP SHOTGUN angled upward-right. Keep the earlier vest-and-shotgun concept, but FIX THE VEST GEOMETRY: shoulder straps, neck opening, upper chest plate, lower plate and hem all share ONE VERTICAL CENTERLINE. The concealed left and right side contours continue smoothly behind the shotgun, with no sideways step or offset. Exactly TWO broad plate cuts. Shotgun has complete stock, barrel, pump grip and empty trigger guard, no tiny fittings. One broad black overlap cut; firepower plus defense.",
        "b": "ONE complete symmetrical PLATE CARRIER behind ONE complete practical COMPACT SUBMACHINE GUN held HORIZONTALLY across its lower chest, muzzle RIGHT. Armor shoulder straps, neck opening, chest plates and hem share ONE VERTICAL CENTERLINE and continuous aligned side contours; TWO broad horizontal plate cuts only. Gun has one short straight barrel, simple receiver, complete shoulder stock, one grip, one thick short magazine and empty trigger guard. Clear broad black overlap cut. Exactly vest and gun, firepower plus defense, no floating armor piece, offset panels or fine mechanical detail."
    },
    "zlodziej": {
        "rationale": "The class combines infiltration and bypassing security with precise, sudden attacks. Its description covers opening locks and finding weaknesses; starting equipment includes a crowbar, tactical knife and throwing knives. Show two roles rather than two parts of one lock operation.",
        "a": "ONE sturdy OPEN PADLOCK paired with ONE complete practical TACTICAL DAGGER angled upward-right beside it. Lock shackle is clearly lifted free at one side, broad body with one large black keyhole. Dagger has a complete broad straight blade, short guard and stout handle. Broad black separation, exactly two objects. Security bypass plus precise close combat. No inserted lockpick, hooded portrait, fine key teeth, serrations, text, numerals, injury or gore.",
        "b": "ONE complete practical CROWBAR and ONE complete THROWING KNIFE cross in a compact X. Crowbar has a thick curved hooked claw at upper-left, broad straight shaft and short flattened lower end. Throwing knife has a broad pointed blade, simple balanced one-piece handle and ONE broad round handle hole, tip upper-right. One large black cut separates the crossing. Exactly two full objects, infiltration tool plus precise stealth attack; no padlock, face, hood, delicate fittings, labels, blood or gore."
    },
    "zwiadowca": {
        "rationale": "The class is a wilderness traveler, hunter and guide. My Biome and My Enemy combine environmental knowledge with hunting. Compass plus rifle or observation plus survival knife spans those roles better than a generic footprint.",
        "a": "ONE stout round COMPASS paired with ONE complete practical SCOPED HUNTING RIFLE angled upward-right. Compass has a thick open circular rim and ONE bold two-ended compass needle with one long north point and a shorter south point, NO letters or ticks. Rifle has a complete shoulder stock, straight barrel, simple scope and empty trigger guard, no fine fittings. Broad black overlap separation; exactly navigation instrument and rifle. Wilderness navigation plus hunting, no favorite star badge, person, text or numerals.",
        "b": "ONE complete practical pair of BINOCULARS paired with ONE complete stout SURVIVAL KNIFE angled upward-right beside it. Binoculars have two thick barrels, two large round lens openings and one broad central hinge. Knife has a complete broad blade, small guard and stout handle with TWO broad grip cuts. Clear broad black separation. Exactly two objects, careful observation plus wilderness survival; no footprint, map, face, thin straps, fine serrations, labels or extra gear."
    }
}


def read(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def variant_dir(option):
    return REVIEW / f"candidates/batch-{NUMBER}-{option}"


def prepare():
    assert not HERE.exists() and all(not variant_dir(v).exists() for v in ("a", "b")), "Already allocated"
    missing = (ROOT / "dev/icons/MISSING.md").read_text(encoding="utf-8")
    assert int(re.search(r"\*\*Next batch number: (\d+)\*\*", missing)[1]) == NUMBER
    manifest = read(REVIEW / "manifest.json")
    feedback_bytes = (REVIEW / "feedback.json").read_bytes()
    feedback = json.loads(feedback_bytes)["items"]
    cards = {item["placeholderKey"].split(":", 1)[1]: item for item in manifest["items"]
             if item.get("placeholderKey", "").startswith("class:")}
    assert set(cards) == set(KEYS)
    classes = read(ROOT / "dev/classes/classes.json")
    subjects = []
    for index, key in enumerate(KEYS):
        card = cards[key]
        assert card.get("status") != "resolved"
        saved = feedback[card["id"]]
        selected = next(c for c in card["candidates"] if c["id"] == saved["candidateId"])
        prior = read(REVIEW / f"candidates/batch-{card['batch']}/batch.json")
        subject = dict(next(s for s in prior["subjects"] if s["itemId"] == card["id"]))
        for target in subject["deliveryTargets"]:
            assert sha(ROOT / target["source"]) == target["sourceSha256"]
        assert sha(REVIEW / selected["src"]) == read((REVIEW / selected["src"]).parent / "validated.json")["candidateHashes"][key]
        subject.update(cell=index + 1, request="Choose one of two complete class emblems, each with two distinct elements.",
                       rationale=CONCEPTS[key]["rationale"], options={v: CONCEPTS[key][v] for v in ("a", "b")},
                       canonicalAbilities=[a["name"] for a in classes[key]["abilities"]],
                       revisionOf={"id": card["id"], "feedback": saved, "candidateId": selected["id"],
                                   "selectedSource": selected["src"], "sourceSha256": sha(REVIEW / selected["src"]),
                                   "notes": saved.get("notes", "")})
        subjects.append(subject)
    (HERE / "raw").mkdir(parents=True)
    for v in ("a", "b"):
        variant_dir(v).mkdir()
    (HERE / "raw/incoming-manifest.json").write_bytes((REVIEW / "manifest.json").read_bytes())
    (HERE / "raw/incoming-feedback.json").write_bytes(feedback_bytes)
    write(HERE / "batch.json", {"date": DATE, "batch": NUMBER, "mode": "two-options-per-primary-class", "subjects": subjects})
    write(HERE / "revision-feedback-before.json", {s["itemId"]: s["revisionOf"]["feedback"] for s in subjects})
    styles = read(REVIEW / "candidates/batch-91/style-reference.json")["sources"]
    canvas = Image.new("RGB", (768, 768), "black")
    for index, source in enumerate(styles):
        assert sha(ROOT / source["source"]) == source["sha256"]
        with Image.open(ROOT / source["source"]) as original:
            rgba = original.convert("RGBA")
            rgba.thumbnail((256, 256), Image.Resampling.LANCZOS)
            canvas.paste(rgba, ((index % 3) * 256, (index // 3) * 256), rgba)
    canvas.save(HERE / "raw/style-reference.png")
    armor = cards["twardziel"]["candidates"][0]["src"]
    with Image.open(REVIEW / armor) as original:
        rgba = original.convert("RGBA")
        reference = Image.new("RGB", rgba.size, "black")
        reference.paste(rgba, (0, 0), rgba)
        reference.save(HERE / "raw/reference-twardziel.png")
    pairs = []
    for subject in subjects:
        key = subject["key"]
        prompt = GENERAL
        references = ["raw/style-reference.png"]
        if key == "twardziel":
            prompt += "The SECOND reference supplies the approved vest-and-shotgun CONCEPT for option A only. Correct its shifted armor panels; do not copy the offset. Option B uses the alternative firearm and layout below.\n"
            references.append("raw/reference-twardziel.png")
        prompt += f"CLASS: {subject['name']}. Role: {subject['rationale']}\nLEFT OPTION A: {subject['options']['a']}\nRIGHT OPTION B: {subject['options']['b']}"
        pairs.append({"key": key, "reference": references, "output": f"raw/{key}-pair.png", "prompt": prompt})
    write(HERE / "prompts.json", {"generator": "OpenAI built-in image generation", "date": DATE, "pairs": pairs})
    write(HERE / "style-reference.json", {"role": "Style only; armor reference supplies the approved concept with geometry to correct", "sources": styles,
                                          "armorSource": {"source": "dev/icons/review/" + armor, "sha256": sha(REVIEW / armor)}})
    write(HERE / "references.json", {"canonicalSource": "dev/classes/classes.json", "canonicalSha256": sha(ROOT / "dev/classes/classes.json"),
                                     "files": [{"key": s["key"], **t} for s in subjects for t in s["deliveryTargets"]]})
    write(HERE / "incoming.json", {"date": DATE, "batch": NUMBER, "feedbackSha256": hashlib.sha256(feedback_bytes).hexdigest(),
                                   "priorReviewItems": len(manifest["items"]), "classSubjects": 6, "optionsPerSubject": 2,
                                   "approvedWithRevisionNote": [s["itemId"] for s in subjects if s["revisionOf"]["feedback"]["decision"] == "approve"]})
    assert (REVIEW / "feedback.json").read_bytes() == feedback_bytes
    print("Prepared six class pairs: exactly two elements per emblem and two options per class.")


def validate_mask(directory, key):
    with Image.open(directory / f"{key}.png") as source:
        png = source.convert("RGBA")
    with Image.open(directory / f"{key}.webp") as source:
        assert source.format == "WEBP" and source.mode == "RGBA"
        assert source.size == png.size == (256, 256) and source.tobytes() == png.tobytes()
    bounds = png.getchannel("A").getbbox()
    assert bounds and min(bounds[0], bounds[1], 256 - bounds[2], 256 - bounds[3]) >= 20
    assert all(pixel[:3] == (255, 255, 255) for pixel in png.getdata() if pixel[3])
    svg = ET.fromstring((directory / f"{key}.svg").read_text(encoding="utf-8"))
    href = svg.find(".//{http://www.w3.org/2000/svg}image").attrib["href"]
    assert href.startswith("data:image/webp;base64,")
    with Image.open(io.BytesIO(base64.b64decode(href.split(",", 1)[1]))) as embedded:
        assert embedded.format == "WEBP" and embedded.convert("RGBA").tobytes() == png.tobytes()


def validate():
    subjects = read(HERE / "batch.json")["subjects"]
    assert len(subjects) == 6 and {s["key"] for s in subjects} == set(KEYS)
    for subject in subjects:
        for target in subject["deliveryTargets"]:
            assert sha(ROOT / target["source"]) == target["sourceSha256"], "Production target changed"
    for v in ("a", "b"):
        directory = variant_dir(v)
        report = read(directory / "validated.json")
        assert report["validatedMasks"] == 6 and report["variant"] == v
        for subject in subjects:
            key = subject["key"]
            validate_mask(directory, key)
            assert sha(directory / f"{key}.png") == report["candidateHashes"][key]
    print("Validated twelve exact PNG/WEBP/embedded-WEBP SVG masks; all six production targets unchanged.")


def process():
    subjects = read(HERE / "batch.json")["subjects"]
    pairs = {p["key"]: p for p in read(HERE / "prompts.json")["pairs"]}
    preview = Image.new("RGB", (650, 1536), (34, 34, 34))
    inventory = Image.new("RGB", (720, 1080), (34, 34, 34))
    draw, inventory_draw = ImageDraw.Draw(preview), ImageDraw.Draw(inventory)
    records = []
    for index, subject in enumerate(subjects):
        key = subject["key"]
        with Image.open(HERE / pairs[key]["output"]) as source:
            width, height = source.size
            middle = width // 2
            assert source.convert("L").crop((middle - 6, 0, middle + 6, height)).getextrema()[1] < 64, "Glyph crosses center gutter; generate a correction"
            for option_index, v in enumerate(("a", "b")):
                box = (0, 0, middle, height) if v == "a" else (middle, 0, width, height)
                icon, removed = clean(masks.normalize(source.crop(box)))
                directory = variant_dir(v)
                icon.save(directory / f"{key}.png", "PNG", optimize=True)
                icon.save(directory / f"{key}.webp", "WEBP", lossless=True, exact=True, method=6)
                (directory / f"{key}.svg").write_text(masks.svg_mask(key, icon), encoding="utf-8")
                preview.paste(icon, (120 + option_index * 260, index * 256), icon)
                draw.text((8, index * 256 + 8), key + " A / B", fill="white")
                inventory_draw.text((8, index * 180 + option_index * 90 + 30), key + " " + v.upper(), fill="white")
                for size, offset in ((64, 260), (32, 390), (24, 500), (16, 600)):
                    thumb = icon.resize((size, size), Image.Resampling.LANCZOS)
                    inventory.paste(thumb, (offset, index * 180 + option_index * 90 + (90 - size) // 2), thumb)
                records.append({"key": key, "variant": v, "source": pairs[key]["output"], "sourceSize": [width, height],
                                "crop": list(box), "removedTinyPixels": removed})
    for v in ("a", "b"):
        directory = variant_dir(v)
        write(directory / "validated.json", {"batch": NUMBER, "variant": v, "validatedMasks": 6,
              "prospectiveDeliveryTargets": 6, "candidateHashes": {s["key"]: sha(directory / f"{s['key']}.png") for s in subjects}})
    write(HERE / "normalization.json", records)
    write(HERE / "validated.json", {"batch": NUMBER, "validatedMasks": 12, "classSubjects": 6, "prospectiveDeliveryTargets": 6,
                                   "candidateHashes": {f"{v}:{s['key']}": sha(variant_dir(v) / f"{s['key']}.png") for s in subjects for v in ("a", "b")}})
    preview.save(HERE / "raw/preview.png")
    inventory.save(HERE / "raw/inventory-preview.png")
    validate()


def register():
    validate()
    assert not (HERE / "registration.json").exists(), "Already registered; preserve newer GM feedback"
    subjects = read(HERE / "batch.json")["subjects"]
    manifest_file, feedback_file = REVIEW / "manifest.json", REVIEW / "feedback.json"
    manifest_bytes, feedback_bytes = manifest_file.read_bytes(), feedback_file.read_bytes()
    manifest, feedback = json.loads(manifest_bytes), json.loads(feedback_bytes)
    cards = {c["id"]: c for c in manifest["items"]}
    for subject in subjects:
        card = cards[subject["itemId"]]
        assert card.get("status") != "resolved"
        assert feedback["items"][subject["itemId"]] == subject["revisionOf"]["feedback"], "Newer class feedback; retain it"
        assert not any(c["id"].startswith("batch92-") for c in card["candidates"])
    (HERE / "raw/registration-before-manifest.json").write_bytes(manifest_bytes)
    (HERE / "raw/registration-before-feedback.json").write_bytes(feedback_bytes)
    for subject in subjects:
        card = cards[subject["itemId"]]
        options = [{"id": f"batch92-{v}", "label": f"Batch 92 · {subject['name']} · {v.upper()}",
                    "src": f"candidates/batch-92-{v}/{subject['key']}.png", "note": subject["options"][v]} for v in ("a", "b")]
        card["candidates"] = options + card["candidates"]
        card.update(batch=NUMBER, tier=f"Batch 92 · {subject['ownerLabel']}", request=subject["request"] + " " + subject["rationale"])
        feedback["items"][subject["itemId"]] = {"itemId": subject["itemId"], "decision": "pending", "candidateId": "batch92-a",
                                                "notes": "", "updatedAt": datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")}
    class_ids = {s["itemId"] for s in subjects}
    manifest["items"] = [cards[s["itemId"]] for s in subjects] + [c for c in manifest["items"] if c["id"] not in class_ids]
    active = [c for c in manifest["items"] if c.get("status") != "resolved"]
    numbers = sorted({c["batch"] for c in active})
    manifest.update(title=f"Batches {' + '.join(map(str, numbers))} · {len(active)} awaiting GM review", updated=DATE)
    missing_file = ROOT / "dev/icons/MISSING.md"
    missing_before = missing_file.read_text(encoding="utf-8")
    start = missing_before.index("**Next batch number:")
    finish = missing_before.index("\n\n", start)
    next_number = int(re.search(r"\*\*Next batch number: (\d+)\*\*", missing_before)[1])
    missing = missing_before[:start] + f"**Next batch number: {max(next_number, 93)}** ({len(active)} subjects await GM review;\nBatch 92 adds two options for each of the six primary classes)." + missing_before[finish:]
    begin, end = "<!-- placeholder-batch-92:start -->", "<!-- placeholder-batch-92:end -->"
    assert begin not in missing and end not in missing
    lines = [begin, "## Queue (A) — Batch 92 — six primary classes, two options each", "",
             "Each emblem contains two distinct elements. Six generated comparison images",
             "supply twelve candidates. Both new options and every older candidate remain",
             "available in the existing six cards. Exact prompts, canonical rationale and",
             "verbatim saved feedback: `review/candidates/batch-92/`.", "",
             "| Class | Option A / option B | Exact SVG target (+ WEBP) |", "|---|---|---|"]
    for subject in subjects:
        lines.append(f"| {subject['name']} | `batch-92-a/{subject['key']}.png` / `batch-92-b/{subject['key']}.png` | `{subject['target']}` |")
    lines += ["", "The earlier Cwaniak approval also requested a new concept. That exact saved",
              "decision is archived; the explicit request for two new choices reopens its",
              "review alongside the other five classes. Unrelated decisions and all native",
              "production files remain unchanged. No class candidate is installed yet.", "", end, ""]
    anchor = missing.index("<!-- class-placeholder-audit:start -->")
    missing = missing[:anchor] + "\n".join(lines) + "\n" + missing[anchor:]
    assert manifest_file.read_bytes() == manifest_bytes and feedback_file.read_bytes() == feedback_bytes, "Review changed during preflight"
    assert missing_file.read_text(encoding="utf-8") == missing_before, "Queue changed during preflight"
    write(manifest_file, manifest)
    write(feedback_file, feedback)
    missing_file.write_text(missing, encoding="utf-8")
    write(HERE / "manifest-items.json", {"title": manifest["title"], "updated": DATE, "items": [cards[s["itemId"]] for s in subjects]})
    write(HERE / "registration.json", {"date": DATE, "batch": NUMBER, "classSubjects": 6, "newOptions": 12,
                                       "priorManifestSha256": hashlib.sha256(manifest_bytes).hexdigest(),
                                       "priorFeedbackSha256": hashlib.sha256(feedback_bytes).hexdigest()})
    check()


def check():
    validate()
    before = read(HERE / "raw/registration-before-manifest.json")
    old_feedback = read(HERE / "raw/registration-before-feedback.json")
    current, feedback = read(REVIEW / "manifest.json"), read(REVIEW / "feedback.json")
    subjects = read(HERE / "batch.json")["subjects"]
    ids = {s["itemId"] for s in subjects}
    old_cards, cards = ({c["id"]: c for c in m["items"]} for m in (before, current))
    assert set(old_cards) == set(cards) and len(cards) == 481
    assert set(old_feedback["items"]) == set(feedback["items"])
    for key, value in old_cards.items():
        if key not in ids:
            assert cards[key] == value, "Unrelated card changed"
    for key, value in old_feedback["items"].items():
        if key not in ids:
            assert feedback["items"][key] == value, "Unrelated decision changed"
    archived = read(HERE / "revision-feedback-before.json")
    for subject in subjects:
        key = subject["itemId"]
        assert archived[key] == old_feedback["items"][key] == subject["revisionOf"]["feedback"]
        assert cards[key]["candidates"][2:] == old_cards[key]["candidates"]
        assert cards[key]["current"] == old_cards[key]["current"]
        assert cards[key]["deliveryTargets"] == old_cards[key]["deliveryTargets"]
        assert [c["id"] for c in cards[key]["candidates"][:2]] == ["batch92-a", "batch92-b"]
        assert feedback["items"][key]["decision"] == "pending"
    audit = read(ROOT / "dev/icons/class-placeholder-audit.json")
    assert len(audit["placeholders"]) == 32
    assert all(sha(ROOT / item["source"]) == item["sourceSha256"] for item in audit["placeholders"])
    assert len(list((REVIEW / "candidates").glob("batch-*/*.png"))) == 758
    assert sum(c.get("status") == "resolved" for c in current["items"]) == 463
    assert [c["id"] for c in current["items"][:6]] == [s["itemId"] for s in subjects]
    print("Verified both options for all six classes, verbatim notes, all older candidates, unrelated reviews and 32 unchanged native placeholders.")
    if (HERE / "raw/browser-selections.json").is_file():
        browser = json.loads((HERE / "raw/browser-check.json").read_text(encoding="utf-8-sig"))
        selection = read(HERE / "raw/browser-selections.json")
        compatibility = read(HERE / "delivery-compatibility.json")
        assert (browser["cards"], browser["options"], browser["broken"], browser["errors"]) == (18, 57, 0, 0)
        assert selection["classCards"] == selection["selectedNewOptions"] == selection["pendingClassDecisions"] == 6
        assert selection["classCardsFirst"] and selection["newOptions"] == 12
        assert compatibility["verifiedOptions"] == 12 and compatibility["productionWrites"] == 0
        assert sorted(selection["otherDecisions"]) == ["approve"] * 8 + ["revise"] * 4
        write(ROOT / "dev/icons/placeholder-pass/progress-92.json", {
            "date": DATE, "preparedBatch": NUMBER, "nextFreeBatch": 93,
            "primaryClassSubjects": 6, "newOptions": 12, "optionsPerClass": 2,
            "distinctElementsPerEmblem": 2, "newRoadmapSubjects": 0,
            "approvedSubjectsDelivered": 121, "remainingPlaceholderSubjects": 32,
            "nativeSvgTargetsReplaced": 123, "remainingNativeHashesUnchanged": 32,
            "reviewCardsTotal": 481, "reviewCardsResolved": 463, "activeReviewCards": 18,
            "classCardsPending": 6, "unrelatedApprovedDecisionsRetained": 8,
            "unrelatedRevisionDecisionsRetained": 4, "exactClassDecisionsArchived": 6,
            "unrelatedCardsPreserved": True, "unrelatedDecisionsPreserved": True,
            "allOlderCandidatesPreserved": True, "candidateCollectionValidatedPairs": 758,
            "approvalProvenanceOptionsVerified": 12, "newCandidatesInstalledBeforeApproval": 0,
            "browser": {"cards": 18, "options": 57, "brokenImages": 0, "errors": 0,
                        "classCardsFirst": True, "newClassOptions": 12,
                        "screenshot": "../review/candidates/batch-92/raw/review-preview.png"}
        })
        print("Verified gallery and approval compatibility; Batch 92 progress report written.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("mode", choices=("prepare", "process", "register", "check"))
    args = parser.parse_args()
    {"prepare": prepare, "process": process, "register": register, "check": check}[args.mode]()
