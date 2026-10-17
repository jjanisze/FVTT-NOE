"""Freeze two origin corrections and five newly audited companion glyphs."""
import sys
from pathlib import Path
from PIL import Image
sys.dont_write_bytecode = True
sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "placeholder-pass"))
from prepare_70_71 import ROOT, REVIEW, GENERAL, read, write, sha
from snapshot import bitmap, contact
from public_review import public_copy, feedback_hash

REQUESTS = {
    "nowy-jork": "NEW NEW YORK CITY concept instead of the rejected separate torch and crown. ONE compact BROOKLYN-BRIDGE-LIKE SUSPENSION BRIDGE in front view: TWO broad stone towers, each with ONE large pointed Gothic arch opening, joined by ONE thick shallow curved suspension cable and ONE continuous broad roadway. Behind the roadway, ONE simple STEPPED SKYSCRAPER with a stout centered SPIRE rises between the towers, recalling Manhattan. Only TWO broad diagonal suspension struts on each side, no thin cable mesh, tiny windows, book, torch, crown, lettering, logos, skyline clutter or texture. A sober compact city-and-bridge silhouette that reads at 16 px.",
    "hegemonia": "TARGETED EDIT of reference cell 2. KEEP the SAME good broad SPIKED RAIDER HELMET, its T-shaped dark face opening, three short spikes and all broad contours. REPLACE ONLY the bad spatula-shaped weapon behind it with ONE complete recognizable KUKRI KNIFE angled upward-right. The kukri has a LONG forward-CURVING BLADE with an asymmetric heavy convex belly and a tapered pointed tip; the blade is at least THREE TIMES as long as its widest part. One thick curved cutting edge, a narrow intact neck and one stout short grip. No rectangular cleaver head, spatula shape, paddle, blade hole, extra knife, serrations, chain, blood, tiny scratches or fine grip texture.",
    "kopacz": "ONE stout natural BEETLE-LIKE INSECT digging diagonally DOWN into ONE broad EARTH MOUND with a large dark semicircular BURROW OPENING. One oval body, one smaller connected head, three pairs of thick complete legs; the FRONT pair are broad SHOVEL-LIKE CLAWS entering the mound. Just two broad soil contour cuts, no scattered soil specks, tiny hairs, veins, extra legs, lettering or humanoid face. Clear burrowing-insect action rather than a mining tool.",
    "ziemnowodny": "ONE natural CROCODILE HEAD in clean side profile facing RIGHT, partly submerged across ONE broad horizontal WATER WAVE. One smooth closed jaw, one small broad eye cut and two LARGE round AIR BUBBLES below the wave beside the snout. Head and neck remain one coherent complete silhouette, no whole body needed. Breathing both above and below water; no scuba gear, person, angry expression, jagged teeth, scales, fine bubbles, thin ripples, cartoon face or texture.",
    "psi-bohater": "ONE ordinary natural DOG HEAD and short neck in calm SIDE PROFILE facing RIGHT, paired with ONE stout small SHIELD bearing a large BLACK MEDICAL PLUS cutout. Dog has one upright ear and one slightly folded ear, one broad eye cut only, smooth coat and complete muzzle. A loyal dog surviving injury like its human allies. No cape, medal, superhero costume, human face, wolf snarl, teeth, fur strands, anime eyes, heart rays, lettering or texture.",
    "modyfikacje-drona": "ONE simple compact DRONE CHASSIS: a broad rectangular body on TWO stout articulated support legs, with ONE large detachable rectangular CAMERA MODULE raised just above its open TOP MOUNT. ONE complete broad OPEN-END WRENCH lies diagonally beside the mount. Module has one large black circular lens opening and one broad plug tab, no tiny connector pins. A coherent physical equipment-installation icon with generous black gaps. No giant cog, scattered components, fine wires, panel screws, numbers, arrows, lettering or texture.",
    "atak-drona": "ONE compact unmanned GUN TURRET in SIDE PROFILE aimed RIGHT: a broad squat body with ONE large square OPTICAL LENS cutout, ONE complete short stout gun barrel, and ONE small broad mounting pedestal. Ahead of the muzzle sits ONE large simple AIM RETICLE made from an open ring and four broad ticks, clearly separated from the barrel. Generic mounted-weapon attack shared by flying and walking drones; no vehicle wheels, legs, propellers, human operator, tiny bullets, muzzle-fire spray, panel texture, text or logo."
}
NEW = [
    ("kopacz", "Kopacz", "Burrowing prevents opportunity attacks.", ["zmutowany-owad.kopacz"]),
    ("ziemnowodny", "Ziemnowodny", "A reptilian companion breathes both on land and underwater.", ["zmutowany-gad.ziemnowodny"]),
    ("psi-bohater", "Psi bohater", "A dog uses injury levels and death saves like a player character.", ["psi-partner.psi-bohater"]),
    ("modyfikacje-drona", "Modyfikacje drona", "A drone can mount weapons, cameras, lighting and other equipment.", ["dron-kroczacy.modyfikacje", "dron-latajacy.modyfikacje"]),
    ("atak-drona", "Atak drona", "A drone attacks with its installed weapon.", ["dron-kroczacy.atak", "dron-latajacy.atak"])
]


def main():
    here = REVIEW / "candidates/batch-111"
    assert not here.exists(), "Batch already allocated"
    paths = [REVIEW / name for name in ("manifest.json", "feedback.json", "style-feedback.json")]
    before = {p: p.read_bytes() for p in paths}
    feedback = read(paths[1])["items"]
    old = {s["itemId"]: s for s in read(REVIEW / "candidates/batch-110/batch.json")["subjects"]}
    subjects = []
    for saved in read(REVIEW / "candidates/batch-110/reviewed.json")["active"]:
        if saved["decision"] not in ("revise", "reject"):
            continue
        assert feedback_hash(feedback[saved["id"]]) == saved["feedbackSha256"]
        assert public_copy(feedback[saved["id"]]) == saved["feedback"]
        assert sha(REVIEW / saved["selectedSource"]) == saved["sourceSha256"]
        subject = dict(old[saved["id"]])
        subject.update(revisionOf=saved, request=REQUESTS[subject["key"]], cell=len(subjects) + 1)
        subjects.append(subject)
    assert [s["key"] for s in subjects] == ["nowy-jork", "hegemonia"]
    for key, name, rule, mappings in NEW:
        target = f"icons/abilities/{key}.svg"
        subjects.append({"kind": "companion", "key": key, "name": name, "itemId": f"coverage111-{key}",
            "target": target, "cell": len(subjects) + 1, "ruleContext": rule, "companionMappings": mappings,
            "context": f"Companion feature: {name}. {rule} Companion sheet, action card and hotbar; typically 16–64 px.",
            "deliveryTargets": [{"source": target, "variant": "default", "sourceSha256": None}], "request": REQUESTS[key]})
    absent = [str(Path(s["target"]).with_suffix(ext)).replace("\\", "/") for s in subjects for ext in (".svg", ".webp", ".png")]
    assert all(not (ROOT / file).exists() for file in absent)
    approved = read(REVIEW / "candidates/batch-110/reviewed-installed.json")["installed"]
    files = [file for item in approved for file in ({"source": item["files"][0], "sha256": item["svgSha256"]},
                                                  {"source": item["files"][1], "sha256": item["webpSha256"]})]
    assert len(files) == 10 and all(sha(ROOT / f["source"]) == f["sha256"] for f in files)
    styles = read(REVIEW / "candidates/batch-102/style-reference.json")["sources"]
    assert all(sha(ROOT / f["source"]) == f["sha256"] for f in styles)
    (here / "raw").mkdir(parents=True)
    canvas = Image.new("RGB", (768, 768), "black")
    selected = []
    for index, subject in enumerate(subjects[:2]):
        source = REVIEW / subject["revisionOf"]["selectedSource"]
        tile = bitmap(source)
        tile.thumbnail((256, 256), Image.Resampling.LANCZOS)
        canvas.paste(tile, (index * 256 + (256 - tile.width) // 2, (256 - tile.height) // 2), tile)
        selected.append({"key": subject["key"], "source": source.relative_to(ROOT).as_posix(), "sha256": sha(source)})
    canvas.save(here / "raw/selected-reference.png")
    contact([f["source"] for f in styles], here / "raw/style-reference.png")
    role = ("Reference 1 supplies DESIRED broad white-glyph STYLE only. Reference 2 contains the EXACT SELECTED edit targets in CELLS 1 AND 2 ONLY. "
            "Cell 1 needs a new New York concept because the previous one was marked revise without additional notes. Cell 2 must preserve the approved helmet shape "
            "and replace only its spatula-like machete with a long curved kukri. Cells 3–7 are NEW companion glyphs described below. ")
    prompt = GENERAL.replace("exactly NINE separate equal cells", "exactly SEVEN active glyphs in NINE equal cells") + role
    prompt += "\nROW-MAJOR CONTENTS:\n" + "\n".join(f"{s['cell']}. {s['name']}: {s['request']}" for s in subjects)
    prompt += "\nCELLS 8 AND 9 MUST REMAIN COMPLETELY EMPTY PURE BLACK. No glyph, line, label or decoration."
    batch = {"date": "2026-10-17", "batch": 111, "pass": "final-coverage-and-origin-revisions", "partialAtlas": True, "emptyCells": [8, 9], "subjects": subjects}
    write(here / "batch.json", batch)
    write(here / "prompts.json", {"date": batch["date"], "generator": "OpenAI built-in image generation", "reference": "raw/style-reference.png",
        "references": ["raw/style-reference.png", "raw/selected-reference.png"], "role": role, "atlas": prompt, "targetedCorrections": []})
    write(here / "incoming.json", {"productionFiles": files, "expectedAbsent": absent, "feedbackSha256": sha(paths[1]), "styleReviews": []})
    write(here / "references.json", {"files": files, "expectedAbsent": absent, "selectedSources": selected})
    write(here / "style-reference.json", {"sources": styles, "selectedSources": selected})
    write(here / "revision-feedback-before.json", {s["itemId"]: s["revisionOf"]["feedback"] for s in subjects if "revisionOf" in s})
    write(here / "style-feedback-before.json", {})
    for p, original in before.items():
        assert p.read_bytes() == original, "Review changed during preparation"
    print("Batch 111: two saved origin revisions and five new companion subjects; ten approved origin variants unchanged.")


if __name__ == "__main__":
    main()
