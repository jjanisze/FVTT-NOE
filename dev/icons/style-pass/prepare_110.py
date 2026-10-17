"""Freeze seven saved origin corrections and the GM-supplied insignia reference."""
import argparse
import sys
from pathlib import Path
from PIL import Image
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "placeholder-pass"))
from prepare_70_71 import ROOT, REVIEW, GENERAL, read, write, sha
from snapshot import bitmap, contact
from public_review import public_copy, feedback_hash

MOTIFS = {
    "czlowiek-pustyni": "Preserve the plain wrapped HEADSCARF and smooth featureless adult head in side profile at LEFT. REMOVE the WATER CANTEEN completely. Behind the head to the RIGHT show TWO broad clean SAND DUNE silhouettes and ONE small DEAD TREE with a thick bare trunk and exactly THREE stout leafless branches. Two broad cloth overlap cuts only. Complete coherent head, dunes and barren tree, strong black gaps; no beard, facial detail, extra bottle, tiny twigs, fine sand texture or rays.",
    "detroit": "Keep ONE broad CAR TIRE and ONE large ENGINE PISTON as the foreground motif, but make the CITY equally clear: behind them rises ONE compact INDUSTRIAL CITY SKYLINE of THREE broad factory blocks with a sawtooth roof and TWO stout chimneys. One piston groove and two broad tire-tread cuts only. City silhouette is at least as wide as the tire, clearly visible above it. No tiny windows, fumes, little gears, fine machine parts, writing, automobile logos or texture.",
    "appalachy": "Keep ONE complete sturdy MINING PICK diagonally across ONE angular MOUNTAIN PEAK. Add aristocratic ownership as ONE large plain THREE-POINT CROWN centered ABOVE the mountain, separated by a generous black gap. Broad crown band with ONE clean black cut only; the crown reads at thumbnail size and is at least half the mountain width. A sober aristocratic mining crest with three complete strong shapes, no tiny jewels, heraldic flourishes, writing, fine hatching, texture or fantasy ornaments.",
    "nowy-jork": "Completely REMOVE the BOOK and generic skyline. Show recognizable NEW YORK CITY iconography: ONE complete upright LIBERTY TORCH with a broad flame and simple stout handle at LEFT, next to ONE broad SEVEN-SPIKED LIBERTY CROWN at lower-RIGHT. Crown band has only THREE broad rectangular black openings; seven stout clean triangular rays are widely spaced. Clear black separation between torch and crown. No person, face, full statue, book, letters, tourism logo, tiny windows, shading, texture or intricate flame tongues.",
    "hegemonia": "NEW CONCEPT emphasizing brutal post-apocalyptic RAIDERS. ONE crude broad STEEL HELMET with THREE short stout spikes on its crown, paired with ONE heavy NOTCHED MACHETE angled upward behind it. Helmet has a broad dark face opening and two broad plate cuts only; blade has one broad notch, intact stout handle. Rough improvised raider equipment conveyed by silhouette, no little scratches or rivets. No face, gruff bearded survivor, skull, blood, gore, chain emblem, fine buckles, text, decorative rays or anime.",
    "posterunek": "Use Reference 3, the supplied POSTERUNEK INSIGNIA, instead of the shield-and-chip concept. Clean and reproduce that SAME geometric emblem faithfully. Its original BLACK shape becomes solid WHITE, and the original WHITE background and negative spaces become BLACK. Preserve the large CENTRAL FIVE-POINT STAR as a BLACK cutout in the white body, the broad segmented angular/octagonal enclosure, the top tab with a BLACK PLUS cutout and bottom tab with a BLACK MINUS cutout. Preserve all angular breaks and broad internal channels. Symmetric, crisp, bold, flat; no shield, microchip, lettering, added symbol, texture, bevel, glow or ornament. This requested supplied insignia is the only allowed logo.",
    "vegas": "Make the regional GAMBLING motif richer than cards alone: ONE squat upright CLASSIC SLOT MACHINE with ONE large dark window showing THREE broad blank white REEL DISCS, one thick PAYOUT SLOT near its base, and ONE complete SIDE LEVER with a large ROUND KNOB. TWO plain fanned PLAYING CARDS overlap its lower-left corner; front card bears ONE large BLACK SPADE cutout. Machine body and lever remain complete. No letters, digits, reel numerals, casino logos, little buttons, sparkle, neon glow, dither, tiny pips or face."
}


def main(logo):
    here = REVIEW / "candidates/batch-110"
    assert not here.exists(), "Batch already allocated"
    assert logo.is_file(), "Supplied reference not found"
    paths = [REVIEW / name for name in ("feedback.json", "style-feedback.json", "manifest.json")]
    before = {p: p.read_bytes() for p in paths}
    feedback = read(paths[0])["items"]
    subjects, files, private = [], [], {}
    for number in (108, 109):
        prior = REVIEW / f"candidates/batch-{number}"
        old = {s["itemId"]: s for s in read(prior / "batch.json")["subjects"]}
        for saved in read(prior / "reviewed.json")["active"]:
            if saved["decision"] not in ("revise", "reject"):
                continue
            original = feedback[saved["id"]]
            assert feedback_hash(original) == saved["feedbackSha256"]
            assert public_copy(original) == saved["feedback"]
            source = REVIEW / saved["selectedSource"]
            assert sha(source) == saved["sourceSha256"]
            subject = dict(old[saved["id"]])
            assert subject["kind"] == "origin" and subject["key"] in MOTIFS
            subject.update(revisionOf=saved, request=MOTIFS[subject["key"]], cell=len(subjects) + 1)
            subjects.append(subject)
            private[saved["id"]] = original
        for item in read(prior / "reviewed-installed.json")["installed"]:
            files.extend([{ "source": item["files"][0], "sha256": item["svgSha256"] },
                          { "source": item["files"][1], "sha256": item["webpSha256"] }])
    assert [s["key"] for s in subjects] == list(MOTIFS) and len(subjects) == 7
    absent = [str(Path(s["target"]).with_suffix(ext)).replace("\\", "/") for s in subjects for ext in (".svg", ".webp", ".png")]
    assert all(not (ROOT / relative).exists() for relative in absent)
    assert all(sha(ROOT / item["source"]) == item["sha256"] for item in files)
    styles = read(REVIEW / "candidates/batch-102/style-reference.json")["sources"]
    assert all(sha(ROOT / item["source"]) == item["sha256"] for item in styles)
    (here / "raw").mkdir(parents=True)
    canvas = Image.new("RGB", (768, 768), "black")
    selected = []
    for index, subject in enumerate(subjects):
        source = REVIEW / subject["revisionOf"]["selectedSource"]
        tile = bitmap(source)
        tile.thumbnail((256, 256), Image.Resampling.LANCZOS)
        canvas.paste(tile, ((index % 3) * 256 + (256 - tile.width) // 2,
                            (index // 3) * 256 + (256 - tile.height) // 2), tile)
        selected.append({"key": subject["key"], "source": source.relative_to(ROOT).as_posix(), "sha256": sha(source)})
    canvas.save(here / "raw/selected-reference.png")
    contact([s["source"] for s in styles], here / "raw/style-reference.png")
    reference = here / "raw/posterunek-reference.png"
    reference.write_bytes(logo.read_bytes())
    role = ("Reference 1 supplies the DESIRED broad white-glyph STYLE only. Reference 2 contains the EXACT SELECTED origin candidates in row-major order; "
            "apply the saved concept changes below rather than retaining rejected props. Reference 3 is the GM-supplied POSTERUNEK INSIGNIA for CELL 6 ONLY: "
            "faithfully clean and invert this exact geometry into a white glyph with black cutouts. No unrelated logo is allowed. ")
    general = GENERAL.replace("exactly NINE separate equal cells", "exactly SEVEN active glyphs in NINE equal cells").replace("numerals, logos, borders", "numerals, unrelated logos, borders")
    prompt = general + role + "\nROW-MAJOR CONTENTS:\n" + "\n".join(f"{s['cell']}. {s['name']}: {s['request']}" for s in subjects)
    prompt += "\nCELLS 8 AND 9 MUST REMAIN PURE BLACK AND COMPLETELY EMPTY. No glyph, line, label or decoration."
    batch = {"date": "2026-10-17", "batch": 110, "pass": "origin-revisions", "partialAtlas": True, "emptyCells": [8, 9], "subjects": subjects}
    write(here / "batch.json", batch)
    write(here / "prompts.json", {"date": batch["date"], "generator": "OpenAI built-in image generation",
        "reference": "raw/style-reference.png", "references": ["raw/style-reference.png", "raw/selected-reference.png", "raw/posterunek-reference.png"],
        "role": role, "atlas": prompt, "targetedCorrections": []})
    write(here / "incoming.json", {"productionFiles": files, "expectedAbsent": absent, "feedbackSha256": sha(paths[0]), "styleReviews": []})
    write(here / "references.json", {"files": files, "expectedAbsent": absent, "selectedSources": selected,
        "suppliedInsignia": {"source": "raw/posterunek-reference.png", "sha256": sha(reference), "provenance": "GM-supplied Posterunek emblem; original creator/source not specified"}})
    write(here / "style-reference.json", {"sources": styles, "selectedSources": selected})
    write(here / "revision-feedback-before.json", {s["itemId"]: s["revisionOf"]["feedback"] for s in subjects})
    write(here / "raw/revision-feedback-private.json", private)
    write(here / "style-feedback-before.json", {})
    for path, original in before.items():
        assert path.read_bytes() == original, "Review changed while preparing"
    print("Batch 110: seven exact saved origin corrections, eighteen delivered files preserved; supplied reference copied into dev-only raw.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--logo", type=Path, required=True)
    main(parser.parse_args().logo)
