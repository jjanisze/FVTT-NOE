# Batch 77 — nine fresh subjects

Second of the next two nine-cell atlases. All nine are pending GM review;
native placeholders remain until a selected candidate is approved.

| Cell | Subject | Motif |
|---|---|---|
| 1 | Motywacja | Megaphone and a die |
| 2 | Mój biom | Map, tree and mountain |
| 3 | Mój bóg kule nosi | Cartridge supported by a blessing hand |
| 4 | Mój wróg | Footprint inside a target reticle |
| 5 | Mój wróg: Ludzie | Generic adult head inside the same reticle |
| 6 | Mój wróg: Maszyny | Robot sensor head inside the same reticle |
| 7 | Mój wróg: Mutanty | Nonhuman mutant head inside the same reticle |
| 8 | Mój wróg: Potwory | Bestial predator head inside the same reticle |
| 9 | Mój wróg: Zwierzęta | Natural wolf head inside the same reticle |

The six enemy icons form a consistent family: equal circular target reticles,
four cardinal ticks and category-specific centre silhouettes. Plain humans
remain generic adults; the mutant and monster silhouettes are deliberately
distinct. No repeated gruff human portrait, anime face or recognizable character.

`batch.json` records canonical rules, generic motifs and exact native delivery
targets/hashes. OpenAI's built-in image tool generates one atlas saved as
`raw/batch-77-atlas-a.png`. Exact prompts are in `prompts.json`; every reference
cell is style-only, with original hashes in `style-reference.json`.

The three bottom-row reticles have top ticks crossing the nominal atlas row
boundary. `batch.json` records tight source-space ownership boxes that keep
each whole tick with its correct circle. This only assigns existing components;
it does not redraw or repair generated pixels. Previews contain no ticks left
over from neighbouring cells.

Final `<key>.png`, `.webp`, `.svg` files are 256×256 pure white masks with 20 px
margins. Lossless WEBP and the SVG's embedded WEBP match PNG pixels exactly.
PNG sources and opaque previews remain dev-only. Delivery after approval uses
the same native SVG filenames and WEBP sidecars, without runtime wiring.

```sh
python dev/icons/placeholder-pass/process.py --batch=77 --check
node dev/icons/placeholder-pass/register.mjs --batch=77
npm run validate:icon-candidates
```

Inspect `raw/preview.png` and `raw/inventory-preview.png` at 64/32/24/16 px.
No code, compendia or campaign-world documents change in this batch.

Final validation: all nine exact masks pass; the complete candidate collection
has 620 valid PNG/SVG pairs. Contact sheets were inspected at 64/32/24/16 px,
including the intact reticle ticks and the distinct enemy-category silhouettes.
All eighteen new combined-review candidates are selected with pending decisions
and no broken images. Evidence: `../../../placeholder-pass/progress-76-77.json`
and `../batch-76/raw/review-preview.png`.

Saved GM review: eight approvals installed. Motywacja carries the requested new
coach-and-boxer concept into Batch 78. `reviewed.json` preserves all decisions;
`reviewed-installed.json` records the selected sources and exact delivered
SVG/WEBP hashes.
