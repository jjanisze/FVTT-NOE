# Batch 104 — 9 browser style revisions

| Cell | Subject | Replacement motif |
|---|---|---|
| 1 | Tańczące piły | TWO complete CIRCULAR SAW BLADES on TWO short stout articulated TOOL ARMS, sweeping opposite sides of ONE small central mechanical mounting block. Each blade is a plain disk with EIGHT large teeth and ONE large central hole. ONE broad curved sweep behind each blade. No entire robot, tracks, fine teeth, tiny bolts, blood or extra blade. |
| 2 | Tryb Turbo | ONE compact SIX-LEGGED INDUSTRIAL WALKER in three-quarter side view, moving forward with TWO broad speed strokes behind it. One plain rectangular body, SIX stout legs each with ONE simple elbow and ONE complete broad foot, three legs on each side. One broad side panel cut. No gun, smoke plume, microdetail, cables, people or text. |
| 3 | Twierdzenie Kąta Prostego | ONE plain generic adult GUARD at LEFT braces and thrusts ONE short broad BATON horizontally toward the upper torso of ONE approaching generic adult at RIGHT. The approaching figure visibly STOPS, leaning back with one foot firmly planted and palms raised. Exactly two complete natural adult silhouettes, featureless heads and broad black separation. Clear melee interception; no geometric wall, right-angle symbol, diagram, arrow, blood or tiny details. |
| 4 | Tylko zwarcie | TWO broad complete grasping HUMAN HANDS reaching forward, palms slightly downward, with short plain ragged sleeve ends. Complete thumbs and grouped natural fingers, ONE large black gap between hands. No gun, crossed-out symbol, face, head, bone, gore, fingernail detail or tiny rags. |
| 5 | Wierzę | ONE complete open adult PALM holds ONE small sturdy plain KEY and ONE short lit CANDLE stands beside the wrist. Key has a broad rounded bow, short shaft and TWO broad teeth. Candle has one simple steady flame. Quiet hopeful discovery, not magic. No person, face, thought bubble, rays, particles, game token, text or fine wick. |
| 6 | Wielonożny | ONE simple rectangular INDUSTRIAL WALKER BODY on SIX broad articulated LEGS steps over TWO low jagged ROCKS. Three legs on each side, each with one thick elbow and a complete broad foot, all feet visible and clear of rocks. One broad side panel cut. No guns, smoke, bolts, cables, rubble pile, thin joints or extra legs. |
| 7 | Wirujące kiścienie | TWO complete CHAIN FLAILS sweeping outward in opposing arcs from ONE small central plain mechanical MOUNT. Each flail has one short stout arm, a chain represented by THREE large connected simple oval links and ONE broad ball with FOUR short blunt spikes. ONE broad sweep per flail, no whole robot, tracks, fine link mesh, blood or extra balls. |
| 8 | Wrażliwość na światło | ONE natural RAT in simple side profile recoils from ONE plain FLASHLIGHT at RIGHT. The rat crouches low, one forepaw covering its eye, ears folded back; complete body and ONE long curved tail. The light is ONE broad clean cone separated from the rat. No facial expression, fur texture, teeth, tiny whiskers or cartoon anatomy. |
| 9 | Wymagania | ONE plain feed SACK with a broad open top beside ONE complete WATER BUCKET, with TWO large simple grain ears rising from the sack. One broad black fold cut in the sack and one thick bucket handle only. A sober animal-care supply symbol. No animals, faces, pile of props, crossed-out symbol, letters, tiny grain dots or logos. |

OpenAI's built-in image tool generates `raw/batch-104-atlas-a.png`.
Reference 1 (`raw/style-reference.png`) supplies desired broad white glyph
style. Reference 2 (`raw/current-reference.png`) supplies existing subjects
and composition to simplify, without copying their fine detail or texture.
Exact prompt and roles: `prompts.json`. Verbatim saved flags and all source
variant hashes: `style-feedback-before.json` and `incoming.json`.

```sh
python dev/icons/placeholder-pass/process.py --batch=104
python dev/icons/placeholder-pass/process.py --batch=104 --check
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
