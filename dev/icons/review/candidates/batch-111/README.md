# Batch 111 — two origin revisions and five companion gaps

Final outcome, 2026-10-17: **all seven selections approved and installed**.
Nowy Jork uses the explicitly selected earlier `batch110-revision`; the
other six use `batch111-revision`. Exact saved choices and delivered hashes
are in `reviewed.json` and `reviewed-installed.json`. The complete gallery
has 544 resolved cards and no pending reviews. Source icon wiring is also
complete; only GM pack rebuilds and older world repoints remain.
Preparation/publication evidence below is historical.

| Cell | Subject | Motif |
|---|---|---|
| 1 | Nowy Jork | Suspension bridge and stepped Manhattan skyscraper |
| 2 | Południowa Hegemonia | Keep the good spiked helmet; replace blade with a kukri |
| 3 | Kopacz | Insect digging into a burrow |
| 4 | Ziemnowodny | Crocodile head, waterline and breathing bubbles |
| 5 | Psi bohater | Dog head and medical shield |
| 6 | Modyfikacje drona | Drone body, camera module and wrench |
| 7 | Atak drona | Unmanned gun turret and aim reticle |
| 8–9 | Empty | No filler glyphs |

OpenAI's built-in image tool generated one partial 3×3 atlas. Reference 1
supplies the broad white-glyph style. Reference 2 contains the exact two
selected origin candidates in cells 1–2; the other cells are new subjects.
Nowy Jork was marked revise without a further note, so its new concept
uses a bridge and skyline. Hegemonia follows the saved kukri suggestion
while retaining the helmet. Exact prompts: [prompts.json](prompts.json).
Saved decisions and selected-source hashes are in `batch.json` and
`revision-feedback-before.json`.

The expanded canonical audit identified five companion subjects outside
the earlier physical-item and class audits. Their exact post-approval
builder mappings are in `batch.json` and `../../../BROAD_COVERAGE.md`.
All seven target SVG/WEBP/PNG sets remain absent in production until
fresh approval. Existing core comparison art stays in ignored dev-only raw.

```sh
python dev/icons/placeholder-pass/process.py --batch=111 --check
```

Processing only splits, crops, resizes and converts. All seven 256×256
pure-white alpha masks have 20 px margins, matching lossless WEBP files
and SVG-embedded WEBP pixels. Previews were inspected at 64/32/24/16 px.
All 871 candidate pairs validate. The original 153-subject placeholder
pass still has all 155 exact native deliveries and zero initials badges.

The review page has seven cards and 18 current/old/new options, all seven
new candidates selected, no broken images and no browser errors. The five
latest approved origin pairs retain their exact hashes. All 537 unrelated
cards and decisions remain unchanged. Screenshot and browser evidence:
`raw/review-preview.png`, `raw/browser-check.json`. Shared progress:
`../../../style-pass/progress-111.json`.

Source-only audits and proposed reuse mappings do not edit code, rebuild
packs or repoint live documents. Origin paths are already supported by
the builder; the five new companion glyphs need the listed GM/code wiring
after approval. Shipped rasters are WEBP; PNGs stay under dev.
