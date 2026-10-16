"""Freeze the final Ganger spike correction and compose its generated bitmap."""
import argparse
import json
from PIL import Image
from prepare_70_71 import ROOT, REVIEW, read, write, sha
from prepare_96_97 import opaque

HERE = REVIEW / "candidates/batch-101"
DATE = "2026-10-16"
PROMPT = (
    "Use case: precise-object-edit. This image is the exact Ganger icon EDIT TARGET. "
    "Change ONLY the THREE blunt cylindrical STUDS projecting from the baseball bat "
    "into THREE sharp NAIL-LIKE METAL SPIKES. Each spike has a broad attached base, "
    "a short straight tapering triangular side profile and ONE unmistakably SHARP "
    "POINT at its outer end. Keep the same three attachment positions and outward "
    "directions, with enough projection for the pointed silhouette to read at "
    "16-32 pixels. No flat round ends, oval caps, hollow tubes, bolts, screw threads "
    "or disconnected fragments. The spikes belong to the bat and remain attached. "
    "PRESERVE EVERYTHING ELSE: the entire empty sleeveless biker vest, both lapels, "
    "armhole, front panels and open center gap; the bat's barrel, taper, grip and "
    "rounded end knob; both objects' positions, scale, angle, white silhouette "
    "weight, wide separating black gap and generous blank framing. Do not add "
    "a wheel, person, hand, extra object, extra spike, lettering, logo or border. "
    "Exactly the same two-object composition. Pure SOLID WHITE on perfectly "
    "clean SOLID BLACK. Broad sober flat glyph, sparse large negative spaces, "
    "no grey, shading, gradients, texture, dithering, fine detail, anime or gore. "
    "One square icon. This is only a spike-tip correction, not a redesign."
)


def prepare():
    assert not HERE.exists(), "Already allocated"
    feedback_file = REVIEW / "feedback.json"
    original = feedback_file.read_bytes()
    feedback = json.loads(original)["items"]
    saved, = read(REVIEW / "candidates/batch-100/reviewed.json")["active"]
    assert saved["id"] == "batch91-ganger" and saved["decision"] == "revise"
    assert feedback[saved["id"]] == saved["feedback"], "Newer GM feedback"
    assert sha(REVIEW / saved["selectedSource"]) == saved["sourceSha256"]
    subject, = read(REVIEW / "candidates/batch-100/batch.json")["subjects"]
    subject.update(cell=1, request=PROMPT, revisionOf=saved)
    for target in subject["deliveryTargets"]:
        assert sha(ROOT / target["source"]) == target["sourceSha256"]
    (HERE / "raw").mkdir(parents=True)
    opaque(REVIEW / saved["selectedSource"], HERE / "raw/reference-ganger.png")
    write(HERE / "batch.json", {"date": DATE, "batch": 101, "partialAtlas": True, "emptyCells": list(range(2, 10)), "subjects": [subject]})
    write(HERE / "prompts.json", {"generator": "OpenAI built-in image generation", "date": DATE,
          "reference": "raw/reference-ganger.png", "atlas": PROMPT,
          "layout": "One targeted standalone edit, pasted unchanged into cell 1 of a black 3x3 canvas for processor compatibility; eight empty cells.",
          "targetedCorrections": [{"key": "ganger", "reference": "raw/reference-ganger.png", "output": "raw/standalone-ganger.png", "prompt": PROMPT}]})
    write(HERE / "revision-feedback-before.json", {subject["itemId"]: saved["feedback"]})
    write(HERE / "references.json", {"files": [{"key": "ganger", **t} for t in subject["deliveryTargets"]]})
    source = "dev/icons/review/" + saved["selectedSource"]
    write(HERE / "style-reference.json", {"role": "Exact selected edit target; only stud tips change", "sources": [{"source": source, "sha256": sha(ROOT / source)}]})
    write(HERE / "incoming.json", {"date": DATE, "batch": 101, "feedbackSha256": sha(feedback_file), "revisionCount": 1, "freshCount": 0,
          "remainingPlaceholderSubjects": 1, "remainingPlaceholderFiles": 1})
    assert feedback_file.read_bytes() == original
    print("Batch 101: retain Ganger's vest and bat; replace three blunt studs with pointed spikes.")


def compose():
    with Image.open(HERE / "raw/standalone-ganger.png") as original:
        source = original.convert("RGB")
        width, height = source.size
        canvas = Image.new("RGB", (width * 3, height * 3), "black")
        canvas.paste(source, (0, 0))
        canvas.save(HERE / "raw/batch-101-atlas-a.png")
    write(HERE / "raw/composition.json", {"operation": "paste unchanged bitmap into cell 1", "source": "raw/standalone-ganger.png", "sourceSize": [width, height], "emptyCells": list(range(2, 10))})


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--compose", action="store_true")
    args = parser.parse_args()
    compose() if args.compose else prepare()
