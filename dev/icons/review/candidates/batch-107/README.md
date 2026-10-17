# Batch 107 — 4 saved style revisions

Review outcome, 2026-10-17: three exact approved candidates installed.
Wierzę retains its current production art and moves to Batch 108 for the
saved correction: the key-offering hand must come toward the wishing
person from the right. Exact decisions and delivery hashes are in
`reviewed.json` and `reviewed-installed.json`. Preparation and publication
evidence below is historical.

| Cell | Subject | Requested visual correction |
|---|---|---|
| 1 | wierze | REPLACE cell 1's candle-and-hand idea. Show an ordinary useful object being IMAGINED INTO EXISTENCE: ONE plain generic adult HEAD in SIDE PROFILE at LEFT; ONE broad THOUGHT BUBBLE above-right containing ONE large simple KEY; and ONE complete open PALM below-right holding the SAME simple KEY now tangible. Two large round thought dots connect head and thought bubble. Both keys have one broad round bow, one short thick shaft and two broad teeth. Head is a smooth natural featureless profile with no portrait, beard or hair detail. Compact clear thought-to-real-object composition with broad black separation. No candle, prayer, religious symbol, glitter, tiny rays, magical runes, lettering, numbers or game token. |
| 2 | wielonozny | REVISION cell 2. Keep the broad industrial walker body LEVEL while its articulated legs GRACEFULLY FOLLOW ONE CONTINUOUS HILLY GROUND RIDGE at the bottom. The visible feet REST DIRECTLY ON THE TERRAIN at DIFFERENT HEIGHTS: front foot on a higher crest, middle foot in a lower valley, rear foot on a lower ledge. Each supporting foot's sole touches its own actual ground surface with NO BLACK AIR GAP underneath. One front leg can be lifted mid-step over the next crest; the other feet visibly support the machine. Broad coherent connected legs, simple large joints, complete feet. Terrain is one smooth angular hill ridge, not disconnected rocks below a hovering robot. No gun, fine rubble, bolts, smoke, writing or extra machine. |
| 3 | wrazliwosc-na-swiatlo | REVISION cell 3. Retain the natural rat recoiling from the flashlight at RIGHT, but REDRAW ITS WHOLE BODY IN ONE COHERENT SIDE VIEW FACING RIGHT. Head and shoulders at RIGHT, rump at LEFT, ONE tail curling out of the rump to the LEFT. BOTH HIND FEET under the rump point their TOES TO THE RIGHT in parallel; both knees bend coherently in the same side-view anatomy. Forepaws at the FRONT-RIGHT rise to shield the eye from the flashlight cone coming from RIGHT. Natural crouched rat, one large ear, smooth broad silhouette, no leg pointing backward, twisted hips, human expression, fur texture, extra limb, fine whiskers or lettering. |
| 4 | zawziety-sukinkot | REVISION cell 4. Preserve the exact generic adult rising from one knee: one planted boot, one knee on ground, one palm braced on ground and other hand on thigh. ADD ONE LARGE BOLD UPWARD ARROW behind and slightly LEFT of the upper back, rising vertically from shoulder height toward the top of the cell. The arrow has one broad straight shaft and one clear triangular arrowhead. Keep a broad black gap so it does not merge with the head or shoulder. Same natural complete anatomy and broad sparse clothing cuts. No beard, face detail, injury, gore, texture, tiny debris, second arrow or extra limb. |

OpenAI's built-in image tool generates `raw/batch-107-atlas-a.png`.
Reference 1 supplies the desired broad white glyph style; reference 2
contains the exact selected subjects to revise in row-major order.
Every exact generic prompt and reference role is archived in `prompts.json`.
`batch.json` and `revision-feedback-before.json` preserve the verbatim
saved correction and selected-source hash, including selected current art.
All native variants and hashes are captured in `incoming.json`.

```sh
python dev/icons/placeholder-pass/process.py --batch=107
python dev/icons/placeholder-pass/process.py --batch=107 --check
```

Normalization only splits, crops, resizes and converts the generated bitmap.
PNG, external lossless WEBP and SVG-embedded WEBP masks are 256×256 with
pure-white visible pixels, alpha and 20 px safe margins. PNGs stay dev-only.
Inspect `raw/preview.png` and `raw/inventory-preview.png` at 64/32/24/16 px.
Only cells 1–4 contain art; cells 5–9 stay empty black.
Older choices, current artwork and unrelated decisions remain unchanged.
Production still requires a fresh saved approval. No runtime wiring, pack
rebuild or world writes are part of this revision.

Validation: 4 exact masks pass with 20 px margins and matching
PNG/WEBP/embedded-WEBP pixels. Previews were inspected at 64/32/24/16 px.
All 841 candidate pairs validate. The gallery has 13 cards and 39 options,
no broken images or browser errors, and each new revision selected.
Original hashes, all older choices and unrelated decisions are preserved.
Evidence: `../batch-106/raw/review-preview.png` and
`../../../style-pass/progress-106-107.json`.
