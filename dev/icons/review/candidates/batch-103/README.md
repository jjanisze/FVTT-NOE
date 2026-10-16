# Batch 103 — 9 browser style revisions

Review outcome: **5 approved replacements installed; 4 revisions remain**.
Exact saved decisions and delivered SVG/WEBP hashes are in `reviewed.json`
and `reviewed-installed.json`. Remaining notes continue in Batches 106–107.

| Cell | Subject | Replacement motif |
|---|---|---|
| 1 | Próg awarii | ONE squat industrial MOTOR HOUSING split by ONE broad zigzag BLACK CRACK, with ONE large loose bolt lying below. Thick simple casing, two broad cooling-slot cuts, no gauge, scale, numeral, little wires, smoke, debris cloud or fine damage texture. |
| 2 | Przyspieszenie | ONE streamlined broad-winged WASP-LIKE CREATURE in clear side profile flying diagonally upward, with TWO short broad speed strokes behind it. Simple oval abdomen, two broad wings, six short complete legs grouped below the body, two antennae. No tiny veins, hair, teeth, face expression or detailed armor. |
| 3 | Rozkaz Likwidacji | ONE complete adult HAND gives a clear forward POINTING gesture beside ONE complete compact RIFLE in side profile aimed in the same direction. Index extended, other fingers folded coherently with one visible thumb. Rifle has simple stock, receiver, complete grip and straight barrel. No people, victim, blood, speech bubble, writing or shooting rays. |
| 4 | Różnorodne ataki | A compact fan of FOUR complete simple tools: ONE broad HAMMER, ONE short KNIFE, ONE CIRCULAR SAW on a short handle, and ONE short CHAIN FLAIL with a plain solid ball. Distinct silhouettes with thick black gaps, no robot body, tracks, tiny chain links, bolts, dice, arrows or labels. |
| 5 | Siódme poty | ONE complete rugged GAS PEDAL being pressed by ONE sturdy complete BOOT, in simple side profile, with TWO broad short speed strokes behind the heel. Thick sole, simple pedal hinge and base, one broad tread cut only. No steering wheel, hands, sweat drops, fine laces, numeral or gauge. |
| 6 | Skakun | ONE SPIDER in a clear sideways LEAP over ONE low rock: ONE oval abdomen, one smaller connected cephalothorax, EIGHT thick complete bent legs and two short fangs. Four legs visible on each side, natural spider anatomy. One broad short launch streak behind it. No hair, tiny eyes, intricate joints or extra legs. |
| 7 | Szara Eminencja | THREE simple generic adult upper-body silhouettes standing close: TWO larger broad figures in FRONT, and ONE smaller full smooth head and narrow shoulders partially concealed BETWEEN and BEHIND them. Strong white masses separated by broad black gaps. The concealed person has no face; front heads in simple profile. No gruff portraits, beards, cloak texture, eyes, anime or text. |
| 8 | Szarpanie | ONE natural CANINE HEAD in side profile gripping ONE broad rolled piece of cloth between its jaws, with TWO broad short opposing pull strokes. Strong muzzle, triangular ear, one simple eye cut and two large teeth only. No whole victim, severed limb, blood, fur texture, extra jaws or fine teeth. |
| 9 | Tacą i w nogi | ONE complete generic adult in a compact running pose carries ONE broad SERVING TRAY raised upright at the leading hand like a shield. Natural complete arms and legs, smooth featureless head, plain shirt and trousers. TWO short broad speed strokes behind the back foot. No victim, face, beard, apron detail, crockery, text or gore. |

OpenAI's built-in image tool generates `raw/batch-103-atlas-a.png`.
Reference 1 (`raw/style-reference.png`) supplies desired broad white glyph
style. Reference 2 (`raw/current-reference.png`) supplies existing subjects
and composition to simplify, without copying their fine detail or texture.
Exact prompt and roles: `prompts.json`. Verbatim saved flags and all source
variant hashes: `style-feedback-before.json` and `incoming.json`.

The rifle connection and spider anatomy receive isolated replacements after
the atlas. The first focused drafts did not resolve those issues; they are
retained under `raw/failed-*-edit.png` and archived as `attempts` in the prompt
record. Only the final `raw/standalone-*.png` sources feed normalization for
those two subjects. Every exact prompt and reference role is retained.

```sh
python dev/icons/placeholder-pass/process.py --batch=103
python dev/icons/placeholder-pass/process.py --batch=103 --check
```

The processor crops, resizes and converts only; it draws no semantic content.
Inspect `raw/preview.png` and `raw/inventory-preview.png` at 64/32/24/16 px.
Final dev PNG/WEBP/SVG masks are 256×256 with alpha and 20 px safe margins;
external lossless WEBP and embedded WEBP match the pure-white PNG pixels.
Existing production files remain until fresh GM approval. Current style
flags, earlier review cards and saved decisions are retained. No code wiring,
pack rebuild or world writes are part of this replacement.

Validation: 9 exact white PNG/WEBP/embedded-WEBP masks pass with safe
margins and were inspected at 64/32/24/16 px. All 828 candidate pairs validate.
The full style gallery has 29 pending cards and 58 options with no broken
images or browser errors. Existing production hashes, saved style flags and
all earlier reviews are preserved. Evidence: `../batch-102/raw/review-preview.png`
and `../../../style-pass/progress-102-105.json`.
