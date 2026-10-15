"""Prepare one targeted figure correction; never overwrite production art."""
import json
from pathlib import Path
from PIL import Image

HERE = Path(__file__).resolve().parent
reference = "raw/correction-a-co-mi-tam-reference.png"
with Image.open(HERE / "a-co-mi-tam.png") as source:
    opaque = Image.new("RGBA", source.size, "black")
    opaque.alpha_composite(source.convert("RGBA"))
    opaque.convert("RGB").save(HERE / reference)
prompt = (
    "Use case: precise-object-edit / style-transfer. This image is the EDIT TARGET: a tiny white post-apocalyptic inventory glyph on black. "
    "Keep the radiation trefoil, bottle, holding hand, pose and jacket composition. Change only the figure's head/neck and simplify its gender cues. "
    "The current square-jawed masculine survivor still reads too strongly as a man. Replace that head with a truly ANDROGYNOUS ordinary adult head: "
    "a plain loose practical hood framing a small smooth oval face, a modest small nose and a single calm mouth cut. "
    "No visible hair detail, beard, moustache, heavy eyebrow, square jaw, thick muscular neck, model-like pretty face or emphasized sex characteristics. "
    "The hood is loose practical fabric, NOT a mask; the face remains visible and untroubled by the hazardous drink. "
    "Use the same broad sober white stencil silhouette with very few large black cuts and natural adult proportions. "
    "The figure must be generic, not anime, manga, chibi, a child or a recognizable character. "
    "Exactly ONE complete glyph on pure BLACK #000000, pure WHITE #FFFFFF shapes only, centered with generous blank margin. "
    "NO grey, shading, hatching, gradients, dithering, textures, text, logos, symbols beyond the existing radiation trefoil, extra hands or extra bottles. "
    "Tiny 16-pixel readability is essential; do not add details to use up the larger canvas."
)
file = HERE / "prompts.json"
prompts = json.loads(file.read_text(encoding="utf-8"))
assert not prompts["targetedCorrections"], "Correction preparation is historical; do not rerun"
prompts["targetedCorrections"] = [{"key": "a-co-mi-tam", "prompt": prompt,
    "reference": reference, "output": "raw/standalone-a-co-mi-tam.png"}]
file.write_text(json.dumps(prompts, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
