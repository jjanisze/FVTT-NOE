"""Freeze the last two saved revisions without allocating filler subjects."""
import base64
import argparse
import io
import json
import xml.etree.ElementTree as ET
from PIL import Image
from prepare_70_71 import ROOT, REVIEW, read, write, sha
from prepare_96_97 import opaque
from class_options_92 import GENERAL as PAIR_GENERAL

DATE = "2026-10-16"
TORSO = (
    "Preserve the exact selected headless bare adult torso on the LEFT, its shape, "
    "broad anatomical cuts and ONE healed diagonal chest scar. Replace ONLY the Halligan "
    "at RIGHT with the specified ordinary blunt weapon. Keep torso and weapon as TWO "
    "distinct main elements with a generous black separating gap. No head, hands, "
    "extra prop, fantasy hammer, axe, blade, gun, blood, wounds or fine muscle detail. "
)
OPTIONS = {
    "a": TORSO + "ONE plain heavy STEEL PIPE from the canonical Bejsbol/Rurka weapon entry. "
         "Straight stout cylindrical metal tube, blunt flat cut upper end with ONE broad "
         "black oval opening, lower end covered by ONE short plain grip wrap. Diagonal "
         "bottom-left to upper-right at the torso's RIGHT. No curved elbow, fork, adze, "
         "crossbar, spikes, studs, tool head, chained hardware or little wrap lines.",
    "b": TORSO + "ONE ordinary BASEBALL BAT, the other form of the same Bejsbol/Rurka "
         "catalog weapon. Broad smooth rounded blunt barrel tapering continuously to "
         "ONE narrow complete handle ending in ONE small rounded knob. Diagonal "
         "bottom-left to upper-right at the torso's RIGHT. Natural recognizable bat "
         "proportions. No nails, spikes, bands, branding, wood grain or texture."
}
GANGER = (
    "Use case: precise-object-edit. Edit the supplied Ganger glyph. Change ONLY the "
    "LOWER-RIGHT QUADRANT OF THE WHEEL, approximately the three-to-six o'clock arc "
    "and its four-o'clock spoke. Keep the entire upper half, left half, centered hub, "
    "other five spokes, tire tread, diagonal studded baseball bat, framing and "
    "relative scale unchanged. The current lower-right rim bulges and the four-o'clock "
    "spoke is broken. Repair the rim into a smooth concentric circular continuation "
    "of the UPPER-RIGHT arc: same center, radius and rim thickness. Restore ONE "
    "continuous broad straight radial spoke from hub toward four o'clock until it "
    "meets that inner rim. Keep exactly SIX spokes in total and six broad black wedge "
    "openings. Preserve the black separating cut where the bat lies in front of the "
    "outer rim. No seventh spoke, extra ring, bolt, lettering, grey, gradients, "
    "dithering, decoration or texture. Pure white sober flat glyph on pure black. "
    "This is a local geometric repair, not a redesign. One centered complete icon, "
    "generous blank margins, square output."
)


def weapon_reference(filename, target):
    tree = ET.fromstring((ROOT / "icons/weapons" / filename).read_text(encoding="utf-8"))
    href = tree.find(".//{http://www.w3.org/2000/svg}image").attrib["href"]
    with Image.open(io.BytesIO(base64.b64decode(href.split(",", 1)[1]))) as original:
        rgba = original.convert("RGBA")
        canvas = Image.new("RGB", rgba.size, "black")
        canvas.paste(rgba, (0, 0), rgba)
        canvas.save(target)


def main():
    feedback_file = REVIEW / "feedback.json"
    feedback_bytes = feedback_file.read_bytes()
    feedback = json.loads(feedback_bytes)["items"]
    subjects = []
    for prior in (96, 97):
        old = {s["itemId"]: s for s in read(REVIEW / f"candidates/batch-{prior}/batch.json")["subjects"]}
        for saved in read(REVIEW / f"candidates/batch-{prior}/reviewed.json")["active"]:
            if saved["decision"] not in ("revise", "reject"):
                continue
            assert feedback[saved["id"]] == saved["feedback"], "Newer GM feedback"
            assert sha(REVIEW / saved["selectedSource"]) == saved["sourceSha256"]
            subject = dict(old[saved["id"]])
            subject.update(cell=1, revisionOf=saved)
            for target in subject["deliveryTargets"]:
                assert sha(ROOT / target["source"]) == target["sourceSha256"]
            subjects.append(subject)
    assert [s["key"] for s in subjects] == ["brutal", "ganger"]
    for n in (98, 99):
        assert not (REVIEW / f"candidates/batch-{n}").exists(), "Already allocated"
        here = REVIEW / f"candidates/batch-{n}"
        (here / "raw").mkdir(parents=True)
        subject = subjects[n - 98]
        opaque(REVIEW / subject["revisionOf"]["selectedSource"], here / f"raw/reference-{subject['key']}.png")
        write(here / "revision-feedback-before.json", {subject["itemId"]: subject["revisionOf"]["feedback"]})
        write(here / "references.json", {"files": [{"key": subject["key"], **t} for t in subject["deliveryTargets"]]})
        source = "dev/icons/review/" + subject["revisionOf"]["selectedSource"]
        write(here / "style-reference.json", {"role": "Exact selected edit target", "sources": [{"source": source, "sha256": sha(ROOT / source)}]})
        write(here / "incoming.json", {"date": DATE, "batch": n, "feedbackSha256": sha(feedback_file), "revisionCount": 1, "freshCount": 0,
              "remainingPlaceholderSubjects": 2, "remainingPlaceholderFiles": 2})
    here = REVIEW / "candidates/batch-98"
    for variant in ("a", "b"):
        (REVIEW / f"candidates/batch-98-{variant}").mkdir()
    weapon_reference("iron_pipe_club.svg", here / "raw/catalog-pipe.png")
    weapon_reference("baseball_bat.svg", here / "raw/catalog-bat.png")
    subject = subjects[0]
    subject.update(request=TORSO, options=OPTIONS)
    prompt = PAIR_GENERAL.replace("The first reference is STYLE ONLY; do not copy its subject or nine-cell layout.",
        "Reference 1 is the exact selected TORSO EDIT TARGET; retain its torso and scar, replace only the Halligan. "
        "References 2 and 3 are existing catalog pipe and bat shapes, not additional props. Simplify their detail.")
    prompt += f"\nCLASS: Brutal. LEFT OPTION A: {OPTIONS['a']}\nRIGHT OPTION B: {OPTIONS['b']}"
    write(here / "batch.json", {"date": DATE, "batch": 98, "mode": "two-options-per-primary-class", "subjects": [subject]})
    write(here / "prompts.json", {"generator": "OpenAI built-in image generation", "date": DATE,
          "canonicalWeapon": {"source": "scripts/config/weapons-data.mjs", "id": "bejsbol-rurka", "name": "Bejsbol/Rurka", "forms": ["plain steel pipe", "ordinary baseball bat"]},
          "pairs": [{"key": "brutal", "reference": ["raw/reference-brutal.png", "raw/catalog-pipe.png", "raw/catalog-bat.png"], "output": "raw/brutal-pair.png", "prompt": prompt}]})
    here = REVIEW / "candidates/batch-99"
    subject = subjects[1]
    subject.update(request=GANGER)
    write(here / "batch.json", {"date": DATE, "batch": 99, "partialAtlas": True, "emptyCells": list(range(2, 10)), "subjects": [subject]})
    write(here / "prompts.json", {"generator": "OpenAI built-in image generation", "date": DATE, "reference": "raw/reference-ganger.png", "atlas": GANGER,
          "layout": "One targeted standalone edit, composited unchanged into cell 1 of a black 3x3 canvas only for existing processor compatibility; no extra generation or subjects.",
          "targetedCorrections": [{"key": "ganger", "reference": "raw/reference-ganger.png", "output": "raw/standalone-ganger.png", "prompt": GANGER}]})
    assert feedback_file.read_bytes() == feedback_bytes
    print("Batch 98: pipe/bat class choices. Batch 99: local lower-right wheel repair. Two subjects, three choices.")


def compose_ganger():
    """Put the generated bitmap unchanged in cell 1; all other cells are black."""
    here = REVIEW / "candidates/batch-99"
    with Image.open(here / "raw/standalone-ganger.png") as original:
        source = original.convert("RGB")
        width, height = source.size
        canvas = Image.new("RGB", (width * 3, height * 3), "black")
        canvas.paste(source, (0, 0))
        canvas.save(here / "raw/batch-99-atlas-a.png")
    write(here / "raw/composition.json", {"operation": "paste unchanged bitmap into cell 1", "source": "raw/standalone-ganger.png", "sourceSize": [width, height], "emptyCells": list(range(2, 10))})


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--compose-ganger", action="store_true")
    args = parser.parse_args()
    compose_ganger() if args.compose_ganger else main()
