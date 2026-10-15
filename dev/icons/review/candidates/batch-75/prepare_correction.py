"""Prepare removal of one unintended floating wedge from the insight glyph."""
import json
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
reference = "raw/correction-leb-jak-sklep-reference.png"
with Image.open(HERE / "leb-jak-sklep.png") as source:
    opaque = Image.new("RGBA", source.size, "black")
    opaque.alpha_composite(source.convert("RGBA"))
    opaque.convert("RGB").save(HERE / reference)
prompt = (
    "Use case: precise-object-edit. This image is the EDIT TARGET: one white inventory glyph on black. "
    "Remove ONLY the small detached WHITE WEDGE floating just below the brain's LOWER-RIGHT EDGE and just ABOVE-LEFT of the triangular die. "
    "That wedge is an unwanted fourth object; replace its entire area with clean BLACK. "
    "Preserve the THREE intended objects exactly: the intact brain above, the diagonal open-ended wrench below, and the coherent tetrahedral die at lower-right. "
    "Keep their proportions, positions, silhouettes, broad internal black cuts and overall composition. "
    "Do not cut off the brain's main stem, remove the die, add a new symbol, redraw the tools or fill the gap with another fragment. "
    "One complete compact glyph with generous empty margins. Pure WHITE #FFFFFF shapes on pure BLACK #000000, "
    "no grey, shading, dithering, hatching, texture, new details, letters, numerals, logos, watermark or tiny decoration. "
    "Tiny 16-pixel readability is essential; use the same restrained broad stencil language."
)
file = HERE / "prompts.json"
prompts = json.loads(file.read_text(encoding="utf-8"))
assert not prompts["targetedCorrections"], "Historical correction already prepared"
prompts["targetedCorrections"] = [{"key": "leb-jak-sklep", "prompt": prompt, "reference": reference,
    "output": "raw/standalone-leb-jak-sklep.png"}]
file.write_text(json.dumps(prompts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
