"""Deliver approved M7 art and prepare/register the first GM-directed revision."""
import argparse
import copy
import hashlib
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
HERE = Path(__file__).resolve().parent
REVIEW = ROOT/"dev/icons/review"
FOLDER = REVIEW/"candidates/batch-123"
DATE = "2026-11-01"
REVISION_KEYS = ["akcja-bonusowa", "krwawienie-podstepny", "krwawienie-tetnica", "krwawienie-kolory", "wyciek"]

def read(p):
    return json.loads(p.read_text(encoding="utf-8"))

def write(p, value):
    p.write_text(json.dumps(value, ensure_ascii=False, indent=2)+"\n", encoding="utf-8")

def sha(p):
    return hashlib.sha256(p.read_bytes()).hexdigest()

def card_sha(c):
    return hashlib.sha256(json.dumps(c, ensure_ascii=False, sort_keys=True).encode()).hexdigest()

def source_for(card, saved):
    selected = next(c for c in card["candidates"] if c["id"] == saved["candidateId"])
    source = REVIEW/selected["src"]
    valid = read(source.parent/"validated.json")
    assert sha(source) == valid["candidateHashes"][source.stem], "Selected source differs from validated mask"
    return selected, source

def install():
    receipt_file = HERE/"reviewed-installed.json"
    if receipt_file.exists():
        receipt = read(receipt_file)
        for item in receipt["installed"]:
            for file in item["files"]:
                assert sha(ROOT/file["path"]) == file["sha256"]
        print("Verified six previously delivered M7 pairs.")
        return
    manifest_file, feedback_file = REVIEW/"manifest.json", REVIEW/"feedback.json"
    before = {p:p.read_bytes() for p in (manifest_file, feedback_file)}
    manifest, feedback = read(manifest_file), read(feedback_file)
    cards = [c for c in manifest["items"] if c["id"].startswith("m7-status-")]
    assert len(cards) == 10
    approvals = [c for c in cards if feedback["items"].get(c["id"], {}).get("decision") == "approve"]
    assert len(approvals) == 5
    bonus = next(c for c in cards if c["id"] == "m7-status-akcja-bonusowa")
    bonus_saved = feedback["items"][bonus["id"]]
    assert bonus_saved["decision"] == "revise"
    assert "Use this as the action icon" in bonus_saved["notes"]
    reused = copy.deepcopy(bonus)
    reused.update(id="m7-status-akcja", name="Akcja zużyta", target="icons/statuses/akcja.svg",
        tier="Batch 121 · M7 · reuse approved explicitly in GM notes", status="resolved",
        sourceReviewItemId=bonus["id"],
        context="Glif zwykłej akcji, zachowany na przyszłość na wyraźne polecenie MG. Bez dodawania mechaniki.",
        request=bonus_saved["notes"],
        resolutionNote="Explicit GM instruction in the bonus-action revision notes; no synthetic approval was added.")
    reused["deliveryTargets"] = [dict(source=reused["target"], sourceSha256=None, variant="default")]
    work = [(c, feedback["items"][c["id"]], "approve") for c in approvals]
    work.append((reused, bonus_saved, "explicit-gm-reuse-note"))
    planned = []
    for card, saved, basis in work:
        source_card = bonus if basis == "explicit-gm-reuse-note" else card
        selected, source = source_for(source_card, saved)
        target = ROOT/card["target"]
        assert target.resolve().is_relative_to((ROOT/"icons/statuses").resolve())
        assert not target.exists() and not target.with_suffix(".webp").exists(), "Unexpected existing target"
        assert source.with_suffix(".svg").exists() and source.with_suffix(".webp").exists()
        planned.append((card, saved, basis, selected, source, target))
    assert all(p.read_bytes() == data for p, data in before.items())
    installed = []
    for card, saved, basis, selected, source, target in planned:
        files = []
        for ext in (".svg", ".webp"):
            destination = target.with_suffix(ext)
            shutil.copyfile(source.with_suffix(ext), destination)
            assert sha(destination) == sha(source.with_suffix(ext))
            files.append(dict(path=destination.relative_to(ROOT).as_posix(), sha256=sha(destination)))
        installed.append(dict(itemId=card["id"], candidateId=selected["id"], source=selected["src"],
            sourceSha256=sha(source), installedOn=DATE, approvalBasis=basis, feedback=copy.deepcopy(saved), files=files))
        card["status"] = "resolved"
    manifest["items"].append(reused)
    manifest.update(title="M7 · 5 icons need revision; 5 approved and primary-action reuse delivered", updated=DATE)
    assert feedback_file.read_bytes() == before[feedback_file]
    write(receipt_file, dict(date=DATE, approvedGlyphs=5, explicitlyRequestedReuse=1, installed=installed))
    write(manifest_file, manifest)
    print("Delivered five approved SVG/WEBP pairs and the explicitly requested primary-action reuse. Feedback and runtime code unchanged.")

def prepare():
    assert not FOLDER.exists(), "Batch 123 already exists; preserve it"
    manifest, feedback = read(REVIEW/"manifest.json"), read(REVIEW/"feedback.json")
    originals = {k: next(c for c in manifest["items"] if c["id"] == f"m7-status-{k}") for k in REVISION_KEYS}
    references = {}
    for key, card in originals.items():
        saved = feedback["items"][card["id"]]
        assert saved["decision"] == "revise"
        selected, source = source_for(card, saved)
        references[key] = dict(feedback=copy.deepcopy(saved), selectedSource=selected["src"], sourceSha256=sha(source))
    (FOLDER/"raw").mkdir(parents=True)
    shutil.copyfile(REVIEW/"candidates/batch-121/raw/style-reference.png", FOLDER/"raw/style-reference.png")
    shutil.copyfile(REVIEW/"candidates/batch-121/raw/batch-121-atlas-a.png", FOLDER/"raw/design-reference.png")
    specs = [
        ("akcja-bonusowa-a", "akcja-bonusowa", "A · mniejsza czteroramienna gwiazda",
         "BONUS ACTION, OPTION A: ONE modest FOUR-POINT STAR at upper left, with ONE separate large CHECK MARK at lower right. The four-point star is noticeably SMALLER and less commanding than the broad primary five-point star in reference image 2 cell 2. Four SHORT points and a broad center, not a needle-thin sparkle. Keep a generous black gap before the check. No five-point primary star, extra stars, plus sign, medical cross, letters or surrounding frame."),
        ("akcja-bonusowa-b", "akcja-bonusowa", "B · pół gwiazdy",
         "BONUS ACTION, OPTION B: ONE RIGHT-HAND HALF of a broad FIVE-POINT STAR, sliced cleanly down its vertical center, with ONE separate large CHECK MARK at lower right. A clear straight vertical cut edge at left; retain the top point, right upper point and right lower point of the primary star. Half the main action symbol indicates a lesser secondary action. No outline or ghost half, full star, extra stars, arrow, frame, letters or tiny marks."),
        ("krwawienie-podstepny", "krwawienie-podstepny", "Kropla z cięciem",
         "CUT-WOUND BLEED: ONE broad smooth upright WHITE BLOOD DROP with ONE WIDE DIAGONAL BLACK SLASH cut INSIDE it, bottom left to upper right. The slash is thick and tapered like a simple incision. It remains wholly INSIDE the drop, leaving a thick continuous white rim on every side. Match the approved drop silhouette in reference image 2 cell 4. No external wound lips, hanging drops, round holes, weapons, realistic flesh or fine scratches."),
        ("krwawienie-tetnica", "krwawienie-tetnica", "Kropla z tętnicą",
         "ARTERIAL BLEED: ONE broad smooth upright WHITE BLOOD DROP with ONE LARGE BLACK BRANCHING BLOOD-VESSEL DIAGRAM INSIDE: a thick central stem rises from the lower center and splits into two broad curved branches toward upper left and upper right. Include ONE short white interruption across one black branch to suggest a rupture. Keep a continuous thick white rim around the entire diagram. Match the approved drop in reference image 2 cell 4. Black channels are WIDE and simple, no tiny branches, external fountain, pipe, spray, flower, lettering or extra drops."),
        ("krwawienie-kolory", "krwawienie-kolory", "Kropla z utratą PW",
         "LIGHT BLEED / HIT-POINT LOSS: ONE broad smooth upright WHITE BLOOD DROP containing exactly ONE LARGE SHORT HORIZONTAL BLACK MINUS BAR across its center. Thick broad rounded bar fully INSIDE the drop, surrounded by generous white space; it indicates a small loss. Match the approved drop silhouette in reference image 2 cell 4. No other holes, spots, numerals, cross, plus, heart, slash, external drops or decorative marks."),
        ("wyciek", "wyciek", "Pęknięty elastyczny przewód hydrauliczny",
         "HYDRAULIC LEAK: ONE thick FLEXIBLE REINFORCED HOSE curving loosely diagonally from upper left to lower right, BROKEN HALF-WAY ALONG ITS LENGTH. The two frayed torn ends face one another across a clear wide black gap near the center; three SHORT THICK reinforcement strands jut from the torn ends. ONE LARGE OIL DROP falls below the break. One stout crimped sleeve remains at the distant intact upper-left end. Show a supple curved hose with no rigid right-angle elbow. Broad solid silhouettes, at most two large black sleeve cuts. NO faucet, tap, valve handle, water spout, plumbing pipe, oil can, gear, fine braid texture, tiny wires, lettering or extra drops.")
    ]
    subjects = []
    for key, original, label, request in specs:
        s = copy.deepcopy(originals[original])
        subjects.append(dict(key=key, itemId=s["id"], name=s["name"]+" — "+label, label=label,
            target=s["target"], deliveryTargets=s["deliveryTargets"], context=s["context"], request=request,
            revisionOf=references[original], cell=len(subjects)+1))
    prompt = """Use case: logo-brand. Create ONE square 3-by-3 ATLAS of monochrome tabletop STATUS GLYPHS. Image 1 is STYLE AND FORMAT reference only. Image 2 supplies two approved design anchors ONLY: primary five-point-star action mark in its cell 2, and blood-drop outer silhouette in its cell 4. Do not copy other old glyphs. Exactly nine equal square cells, strict row-major order; no drawn grid or labels. PURE SOLID WHITE silhouettes on perfectly clean PURE BLACK. No grey, colors, gradients, shading, texture, speckles, distressed edges, outlines, letters, numerals, frames or watermark. Broad sober heavy stencil shapes, very wide functional negative-space cuts, legible at 16-24 px. Each complete glyph centered in its own cell, at most 65 percent of the cell width or height, with generous black separation and no part crossing a cell edge. Abstract video-game symbols only; no realistic injuries.
EXACT ROW-MAJOR CONTENTS:
""" + "\n".join(f"CELL {s['cell']}: {s['request']}" for s in subjects)
    prompt += "\nCELLS 7, 8 AND 9: COMPLETELY EMPTY PURE BLACK. No glyphs, marks, duplicates or filler. Preserve this exact layout."
    write(FOLDER/"batch.json", dict(date=DATE, batch=123, passName="m7-status-gm-revisions",
        subjects=subjects, partialAtlas=True, emptyCells=[7,8,9]))
    write(FOLDER/"prompts.json", dict(tool="OpenAI built-in image_gen", model=None,
        reference="raw/style-reference.png", additionalReferences=[dict(path="raw/design-reference.png",
        role="Approved primary-action star and blood-drop outer shape only")], atlas=prompt, targetedCorrections=[]))
    write(FOLDER/"incoming.json", dict(date=DATE, revisions=references,
        previousCardHashes={c["id"]:card_sha(c) for c in manifest["items"]},
        sourceCode={p:sha(ROOT/p) for p in ("scripts/config/conditions.mjs", "scripts/config/krwawienia-data.mjs", "scripts/wkk/combat/bleeding.mjs")},
        references={p:sha(FOLDER/p) for p in ("raw/style-reference.png", "raw/design-reference.png")}))
    print("Frozen Batch 123: six candidates for five revision cards, original GM feedback preserved.")

def register():
    manifest_file, feedback_file = REVIEW/"manifest.json", REVIEW/"feedback.json"
    manifest, feedback = read(manifest_file), read(feedback_file)
    before = {p:p.read_bytes() for p in (manifest_file, feedback_file)}
    batch, incoming, valid = read(FOLDER/"batch.json"), read(FOLDER/"incoming.json"), read(FOLDER/"validated.json")
    assert valid["batch"] == 123 and valid["validatedMasks"] == 6
    assert all(sha(ROOT/p) == digest for p, digest in incoming["sourceCode"].items()), "Runtime source changed during asset pass"
    assert all(sha(FOLDER/p) == digest for p, digest in incoming["references"].items())
    for key, ref in incoming["revisions"].items():
        assert feedback["items"][f"m7-status-{key}"] == ref["feedback"], "Newer GM feedback; reconcile before registration"
        assert sha(REVIEW/ref["selectedSource"]) == ref["sourceSha256"]
    for s in batch["subjects"]:
        assert sha(FOLDER/(s["key"]+".png")) == valid["candidateHashes"][s["key"]]
    for c in manifest["items"]:
        assert card_sha(c) == incoming["previousCardHashes"][c["id"]], "Review card changed"
    affected = []
    for key in REVISION_KEYS:
        card = next(c for c in manifest["items"] if c["id"] == f"m7-status-{key}")
        subjects = [s for s in batch["subjects"] if s["itemId"] == card["id"]]
        fresh = [dict(id=f"batch123-{s['key']}", label="Nowe · "+s["label"],
            src=f"candidates/batch-123/{s['key']}.png", note=s["request"]) for s in subjects]
        assert not any(c["id"].startswith("batch123-") for c in card["candidates"])
        card["candidates"] = fresh + card["candidates"]
        card.update(batch=123, tier="Batch 123 · M7 · poprawka po ocenie MG",
            request="Uwagi MG: "+incoming["revisions"][key]["feedback"]["notes"])
        if key == "akcja-bonusowa":
            card["current"] = dict(src="/icons/statuses/akcja.svg",
                note="Zaakceptowana gwiazda zwykłej akcji — punkt odniesienia. Wybierz słabszy wizualnie wariant bonusowej.")
        affected.append(card["id"])
    assert all(p.read_bytes() == data for p, data in before.items())
    manifest.update(title="M7 · 5 poprawek do oceny · bonusowa A/B, krwawienia i hydraulika", updated=DATE)
    write(manifest_file, manifest)
    assert feedback_file.read_bytes() == before[feedback_file]
    write(FOLDER/"registration.json", dict(date=DATE, newCandidates=6, affectedCards=affected,
        previousCandidatesPreserved=True, gmFeedbackUnchanged=True, runtimeSourcesUnchanged=incoming["sourceCode"]))
    print("Registered six new candidates on five existing cards; all original candidates and GM decisions preserved.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("command", choices=["install", "prepare", "register"])
    args = parser.parse_args()
    {"install":install, "prepare":prepare, "register":register}[args.command]()
