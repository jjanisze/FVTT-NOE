"""Freeze Ganger's requested new concept; normalize through the existing pipeline."""
import argparse
import json
from PIL import Image
from prepare_70_71 import ROOT, REVIEW, read, write, sha

DATE = "2026-10-16"
HERE = REVIEW / "candidates/batch-100"
PROMPT = (
    "Use case: stylized-concept. Asset: Ganger profession icon for a post-apocalyptic "
    "tabletop interface, displayed at 16-64 pixels. Create ONE square image containing "
    "ONE compact emblem with exactly TWO complete objects: an EMPTY SLEEVELESS BIKER "
    "LEATHER VEST at LEFT, and ONE STUDDED BASEBALL BAT standing diagonally beside it "
    "at RIGHT. The reference is STYLE ONLY: match its sober broad white stencil "
    "weight and simplicity, never its subjects or nine-cell layout. "
    "Vest: simple slightly turned THREE-QUARTER FRONT VIEW, showing two broad white "
    "front panels, an open black center gap, two broad turned lapels and clearly open "
    "armholes. EMPTY garment, no body, head, arms, hanger or person inside it. Keep "
    "the garment silhouette coherent, with a simple hem and very few large black "
    "cuts; no pockets, buttons, zipper teeth, stitching, badge, lettering or logo. "
    "Bat: ONE recognizable complete smooth broad blunt barrel tapering into ONE "
    "short stout grip with ONE rounded end knob. Only THREE short broad studs "
    "project from the upper barrel, clearly part of that object; no tiny nails or "
    "holes. Angle the bat from LOWER-LEFT to UPPER-RIGHT on the vest's RIGHT, with "
    "a generous uninterrupted BLACK GAP separating the two objects. They do NOT "
    "cross or overlap. This conveys gang membership and blunt close combat. "
    "Pure SOLID WHITE #FFFFFF on perfectly clean SOLID BLACK #000000; no grey, "
    "shading, gradients, dithering, texture or speckling. Broad sober utilitarian "
    "silhouettes with sparse large negative spaces, readable at 16/24/32 pixels. "
    "Center both complete objects together in the middle 65 percent of the image "
    "with generous blank margins on all sides. No wheel, tire, spokes, circular "
    "frame, geometric alignment puzzle, motorcycle, skull, extra prop, gruff face, "
    "anime, cartoon anatomy, blood, gore, text, numbers, decorative border or grid."
)


def prepare():
    assert not HERE.exists(), "Batch already allocated; preserve saved review"
    feedback_file = REVIEW / "feedback.json"
    feedback_bytes = feedback_file.read_bytes()
    feedback = json.loads(feedback_bytes)["items"]
    saved, = read(REVIEW / "candidates/batch-99/reviewed.json")["active"]
    assert saved["id"] == "batch91-ganger" and saved["decision"] == "revise"
    assert feedback[saved["id"]] == saved["feedback"], "Newer GM feedback"
    assert sha(REVIEW / saved["selectedSource"]) == saved["sourceSha256"]
    subject, = read(REVIEW / "candidates/batch-99/batch.json")["subjects"]
    subject.update(cell=1, request=PROMPT, revisionOf=saved)
    for target in subject["deliveryTargets"]:
        assert sha(ROOT / target["source"]) == target["sourceSha256"]
    styles = read(REVIEW / "candidates/batch-96/style-reference.json")["sources"]
    (HERE / "raw").mkdir(parents=True)
    canvas = Image.new("RGB", (768, 768), "black")
    for index, item in enumerate(styles):
        assert sha(ROOT / item["source"]) == item["sha256"]
        with Image.open(ROOT / item["source"]) as original:
            rgba = original.convert("RGBA")
            rgba.thumbnail((256, 256), Image.Resampling.LANCZOS)
            canvas.paste(rgba, ((index % 3) * 256, (index // 3) * 256), rgba)
    canvas.save(HERE / "raw/style-reference.png")
    write(HERE / "batch.json", {"date": DATE, "batch": 100, "partialAtlas": True, "emptyCells": list(range(2, 10)), "subjects": [subject]})
    write(HERE / "prompts.json", {"generator": "OpenAI built-in image generation", "date": DATE,
          "reference": "raw/style-reference.png", "atlas": PROMPT,
          "layout": "One isolated replacement, composited unchanged into cell 1 of a black 3x3 canvas for existing processor compatibility; eight empty cells.",
          "canonicalRationale": {"source": "dev/classes/professions.json", "profession": "brutal.GANGER", "sha256": sha(ROOT / "dev/classes/professions.json"),
              "reason": "Jeden z nich establishes gang membership; Dwoch na jednego and Ja i moj gang establish gang melee. Empty biker clothing and a blunt weapon express those roles without a portrait or wheel."},
          "targetedCorrections": [{"key": "ganger", "reference": "raw/style-reference.png", "output": "raw/standalone-ganger.png", "prompt": PROMPT}]})
    write(HERE / "revision-feedback-before.json", {subject["itemId"]: saved["feedback"]})
    write(HERE / "references.json", {"files": [{"key": "ganger", **t} for t in subject["deliveryTargets"]]})
    write(HERE / "style-reference.json", {"role": "Style only; new composition replaces the wheel concept entirely", "sources": styles})
    write(HERE / "incoming.json", {"date": DATE, "batch": 100, "feedbackSha256": sha(feedback_file), "revisionCount": 1, "freshCount": 0,
          "remainingPlaceholderSubjects": 1, "remainingPlaceholderFiles": 1})
    assert feedback_file.read_bytes() == feedback_bytes
    print("Batch 100: Ganger, empty biker vest beside studded bat. One remaining subject, one new concept.")


def compose():
    with Image.open(HERE / "raw/standalone-ganger.png") as original:
        source = original.convert("RGB")
        width, height = source.size
        canvas = Image.new("RGB", (width * 3, height * 3), "black")
        canvas.paste(source, (0, 0))
        canvas.save(HERE / "raw/batch-100-atlas-a.png")
    write(HERE / "raw/composition.json", {"operation": "paste unchanged bitmap into cell 1", "source": "raw/standalone-ganger.png", "sourceSize": [width, height], "emptyCells": list(range(2, 10))})


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--compose", action="store_true")
    args = parser.parse_args()
    compose() if args.compose else prepare()
