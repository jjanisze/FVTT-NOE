# Batch 91 — nine fresh class and profession emblems

Nine new equipment and symbol motifs continue the remaining placeholder
queue. Class and profession icons use the same broad white glyph weight as
abilities, with no repeated survivor portraits. All require GM review.

| Cell | Subject | Motif |
|---|---|---|
| 1 | Cwaniak — class | Clubs and spades playing cards |
| 2 | Spec — class | Practical wrench crossing a circuit chip |
| 3 | Twardziel — class | Body-armor vest and shotgun |
| 4 | Złodziej — class | Open padlock and inserted lockpick |
| 5 | Zwiadowca — class | Binoculars and broad bootprint |
| 6 | Chemik — profession | Laboratory flask and dropper |
| 7 | Ganger — profession | Studded bat and motorcycle wheel |
| 8 | Gladiator — profession | Salvaged arena faceguard and fist |
| 9 | Gwiazda — profession | Microphone over a five-point star |

`batch.json` preserves canonical mechanics and exact native target hashes.
All nine reference cells are style-only; their source hashes are recorded in
`style-reference.json`. The roadmap's class/profession filenames are retained
exactly, without runtime wiring or pack changes.

OpenAI's built-in image tool generates one atlas saved as
`raw/batch-91-atlas-a.png`. The complete exact prompt and any targeted
corrections are in `prompts.json`. PNG sources and previews stay dev-only.

Final `<key>.png`, `.webp`, `.svg` masks are 256×256 pure white with 20 px
margins. The lossless WEBP and the SVG's embedded WEBP match PNG pixels exactly.
All nine production targets remain unchanged during review. Inspect the
contact sheets at 64/32/24/16 px before registering the candidates.

```sh
python dev/icons/placeholder-pass/process.py --batch=91 --check
node dev/icons/placeholder-pass/register.mjs --batch=91
npm run validate:icon-candidates
```

Nine fresh cards preserve all unrelated feedback and previous review history.
Do not rerun historical preparation.

Validation: all nine exact masks pass. Every candidate uses the generated
atlas pixels; no targeted correction or source ownership override was needed.
Inventory contact sheets were inspected at 64/32/24/16 px.

All 746 candidate pairs validate. Batches 90–91 show eighteen pending cards
and 45 options, all new candidates selected and no broken images or browser
errors. Evidence: `../batch-90/raw/review-preview.png` and
`../../../placeholder-pass/progress-90-91.json`. Production hashes and all
unrelated decisions remain unchanged.

Saved GM review after the class comparison: four approvals installed,
including Spec option A and Złodziej option B from Batch 92. Cwaniak,
Twardziel and Zwiadowca carry exact requests into Batch 93; Chemik and
Ganger carry into Batch 94. `reviewed.json` and `reviewed-installed.json`
preserve every decision, selected source and delivered hash.
