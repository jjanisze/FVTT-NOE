"""Prepare a stronger nonhuman face correction for the saved mutant revision."""
import json
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
reference = "raw/correction-bez-tajemnic-reference.png"
with Image.open(HERE / "bez-tajemnic.png") as source:
    opaque = Image.new("RGBA", source.size, "black")
    opaque.alpha_composite(source.convert("RGBA"))
    opaque.convert("RGB").save(HERE / reference)
prompt = (
    "Use case: precise-object-edit / style-transfer. This image is the EDIT TARGET, a white inventory glyph on black. "
    "Keep the single magnifying glass, its handle angle and large crosshair. REPLACE THE ENTIRE FACE AND HEAD with an unmistakably NONHUMAN wasteland mutant. "
    "The current image still looks like an ordinary human face with a horn and tooth, which is the problem to fix. "
    "Make a hulking feral humanoid mutant with a greatly overgrown sloping lumpy cranium, one short blunt horn, a heavy bony overhanging brow, "
    "a very small sunken eye, a broad FLATTENED BESTIAL MUZZLE instead of a human nose/lips, a massive projecting lower jaw with ONE short blunt tusk, "
    "and a large misshapen ear swept back. Obvious mutated anatomy, no ordinary human forehead, dainty nose, smooth human lips or pointed human chin. "
    "Do not use an ape, pig, dinosaur, named character or anime monster; it is a generic deformed post-apocalyptic humanoid. "
    "Correct the neck and shoulders as a coherent SIDE-PROFILE BUST STANDING AND FACING RIGHT, matching the right-facing head. "
    "The nape and back contour are on the LEFT. The thick natural neck descends into one rounded near shoulder directly below it; "
    "one simple upper-arm contour descends from that shoulder, and the chest/front contour projects to the RIGHT. "
    "No backwards chest, twisted neck, displaced shoulder, detached torso or front-facing symmetric mannequin bust. "
    "The lens examines the head; keep head, horn and tusk clearly visible. Serious broad white stencil shapes and a few large black cuts only. "
    "One complete compact glyph, generous empty margins, pure WHITE #FFFFFF on clean pure BLACK #000000. "
    "No shading, grey, hatching, fine stippling, dithering, hair, tiny teeth, texture, gore, wounds, text, labels, logos or watermark. "
    "This must remain legible at 16 pixels: do not add detail to exploit the larger canvas."
)
file = HERE / "prompts.json"
prompts = json.loads(file.read_text(encoding="utf-8"))
assert not prompts["targetedCorrections"], "Historical correction already prepared"
prompts["targetedCorrections"] = [{"key": "bez-tajemnic", "prompt": prompt, "reference": reference,
    "output": "raw/standalone-bez-tajemnic.png"}]
file.write_text(json.dumps(prompts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
