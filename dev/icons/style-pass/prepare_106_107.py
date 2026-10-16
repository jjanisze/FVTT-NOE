"""Freeze all thirteen saved style revisions, including a selected current icon."""
import json
import sys
from pathlib import Path
from PIL import Image
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "placeholder-pass"))
from prepare_70_71 import GENERAL, ROOT, REVIEW, read, write, sha
from snapshot import bitmap, contact

NUMBERS = (106, 107)


def selected_path(saved):
    return ROOT / saved["selectedSource"].lstrip("/") if saved["sourceKind"] == "production" else REVIEW / saved["selectedSource"]


def main():
    motifs = read(ROOT / "dev/icons/style-pass/motifs-106-107.json")
    feedback_file, style_file = REVIEW / "feedback.json", REVIEW / "style-feedback.json"
    originals = {f: f.read_bytes() for f in (feedback_file, style_file)}
    feedback, style = (json.loads(originals[f])["items"] for f in (feedback_file, style_file))
    reworks = []
    for prior in (102, 103, 104, 105):
        old = {s["itemId"]: s for s in read(REVIEW / f"candidates/batch-{prior}/batch.json")["subjects"]}
        for saved in read(REVIEW / f"candidates/batch-{prior}/reviewed.json")["active"]:
            if saved["decision"] not in ("revise", "reject"):
                continue
            assert feedback[saved["id"]] == saved["feedback"], "Newer GM correction"
            assert sha(selected_path(saved)) == saved["sourceSha256"]
            subject = dict(old[saved["id"]])
            assert style[subject["styleFeedback"]["iconId"]] == subject["styleFeedback"]
            assert sha(ROOT / subject["target"]) == subject["deliveryTargets"][0]["sourceSha256"]
            subject.update(revisionOf=saved, request=motifs[subject["key"]])
            reworks.append(subject)
    assert len(reworks) == 13 and [s["key"] for s in reworks] == list(motifs)
    assert all(not (REVIEW / f"candidates/batch-{n}").exists() for n in NUMBERS)
    styles = read(REVIEW / "candidates/batch-102/style-reference.json")["sources"]
    for source in styles:
        assert sha(ROOT / source["source"]) == source["sha256"]
    for index, number in enumerate(NUMBERS):
        here = REVIEW / f"candidates/batch-{number}"
        (here / "raw").mkdir(parents=True)
        subjects = reworks[index * 9:(index + 1) * 9]
        canvas = Image.new("RGB", (768, 768), "black")
        files, selected_sources = [], []
        for cell, subject in enumerate(subjects, 1):
            subject["cell"] = cell
            source = selected_path(subject["revisionOf"])
            image = bitmap(source)
            image.thumbnail((256, 256), Image.Resampling.LANCZOS)
            canvas.paste(image, (((cell - 1) % 3) * 256 + (256 - image.width) // 2,
                                ((cell - 1) // 3) * 256 + (256 - image.height) // 2), image)
            selected_sources.append({"key": subject["key"], "source": source.relative_to(ROOT).as_posix(), "sha256": sha(source), "kind": subject["revisionOf"]["sourceKind"]})
            files += [{"source": str(file.relative_to(ROOT).as_posix()), "sha256": sha(file)} for ext in (".svg", ".webp", ".png")
                      if (file := (ROOT / subject["target"]).with_suffix(ext)).is_file()]
        canvas.save(here / "raw/selected-reference.png")
        contact([s["source"] for s in styles], here / "raw/style-reference.png")
        references = ["raw/style-reference.png", "raw/selected-reference.png"]
        role = "Reference 1 supplies DESIRED BROAD WHITE GLYPH STYLE only. Reference 2 contains the EXACT SELECTED edit targets in row-major order; apply each saved correction below. "
        if number == 106:
            subject = next(s for s in subjects if s["key"] == "taca-i-w-nogi")
            contact([subject["target"], "dev/icons/review/candidates/batch-103/taca-i-w-nogi.png"], here / "raw/taca-comparison.png")
            references.append("raw/taca-comparison.png")
            role += "Reference 3 is ONLY for cell 7, the waiter: its first cell is the selected detailed original and second cell is the rejected oversimplified candidate. Produce the requested middle ground. "
        general = GENERAL
        batch = {"date": "2026-10-17", "batch": number, "pass": "browser-style-revisions", "subjects": subjects}
        if len(subjects) < 9:
            batch.update(partialAtlas=True, emptyCells=list(range(len(subjects) + 1, 10)))
            general = general.replace("exactly NINE separate equal cells", f"exactly {len(subjects)} active glyphs in NINE equal cells")
        prompt = general + role + "\nROW-MAJOR CONTENTS:\n" + "\n".join(f"{s['cell']}. {s['name']}: {s['request']}" for s in subjects)
        if len(subjects) < 9:
            prompt += "\nCELLS " + ", ".join(map(str, batch["emptyCells"])) + " MUST REMAIN PURE BLACK AND EMPTY. No glyphs, labels or decoration."
        write(here / "batch.json", batch)
        write(here / "prompts.json", {"generator": "OpenAI built-in image generation", "date": batch["date"], "reference": references[0], "references": references,
            "role": role, "atlas": prompt, "targetedCorrections": []})
        write(here / "incoming.json", {"date": batch["date"], "batch": number, "productionFiles": files,
            "styleReviews": [s["styleFeedback"] for s in subjects], "feedbackSha256": sha(feedback_file)})
        write(here / "references.json", {"files": files, "selectedSources": selected_sources})
        write(here / "style-reference.json", {"sources": styles, "selectedSources": selected_sources})
        write(here / "revision-feedback-before.json", {s["itemId"]: s["revisionOf"]["feedback"] for s in subjects})
        write(here / "style-feedback-before.json", {s["styleFeedback"]["iconId"]: s["styleFeedback"] for s in subjects})
        print(f"Batch {number}: {len(subjects)} exact saved corrections, selected current artwork supported.")
    for file, original in originals.items():
        assert file.read_bytes() == original


if __name__ == "__main__":
    main()
