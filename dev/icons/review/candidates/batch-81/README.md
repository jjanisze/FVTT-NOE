# Batch 81 — nine fresh subjects

Second of the two nine-cell atlases. All nine candidates require GM review;
native placeholders remain until a selected candidate is approved.

| Cell | Subject | Motif |
|---|---|---|
| 1 | Rewolwerowiec | Revolver and speedloader |
| 2 | Rusznikarstwo | Rifle clamped in a bench vise, screwdriver |
| 3 | Rutyna | Calm adult soldier walks through battle |
| 4 | Rzeźnik | Hand holds a cleaver |
| 5 | Rzuć broń i gleba! | Stop palm, prone surrendering adult and dropped pistol |
| 6 | Samouk | Open book with tool and light-bulb symbols |
| 7 | Saper | Precise lock-and-key task with die |
| 8 | Serwisowanie | Radio and soldering iron |
| 9 | Skrytka | Knife concealed in a hollow boot heel |

`batch.json` records canonical mechanics, generic motifs and exact native
delivery targets/hashes. Reference cells are all style-only; original hashes
are in `style-reference.json`. Saper represents reliable expertise as defined
by its rules, without treating its name as a bomb-disposal instruction.
Practical objects and generic adults avoid repeated gruff survivor portraits,
anime, fine texture and dithering.

OpenAI's built-in image tool generates one atlas saved as
`raw/batch-81-atlas-a.png`. `prompts.json` contains the exact prompt and any
targeted corrections. PNG sources, contact sheets and candidates stay dev-only.

Final `<key>.png`, `.webp`, `.svg` masks are 256×256 pure white with 20 px
margins. Lossless WEBP and the SVG's embedded WEBP match PNG pixels exactly.
After approval, delivery retains native SVG names and adds WEBP sidecars,
without runtime wiring. All nine production targets stay unchanged in review.

```sh
python dev/icons/placeholder-pass/process.py --batch=81 --check
node dev/icons/placeholder-pass/register.mjs --batch=81
npm run validate:icon-candidates
```

Inspect `raw/preview.png` and `raw/inventory-preview.png` at 64/32/24/16 px.
No code, compendia or campaign-world documents change. Do not rerun the
historical preparation script.

Validation: nine exact masks pass. Whole-component assignment preserves the
lock shackle's 197 overhanging source pixels and the radio antenna's 425 pixels
without clipping or drawing; no ownership override or targeted correction was
needed. Contact sheets were inspected at 64/32/24/16 px. All 656 candidate pairs
validate; the combined gallery has 18 pending cards, 43 options and no broken
images. Evidence: `../batch-80/raw/review-preview.png` and
`../../../placeholder-pass/progress-80-81.json`.
