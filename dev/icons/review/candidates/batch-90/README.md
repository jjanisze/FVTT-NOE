# Batch 90 — six revisions and three fresh subjects

Twelve selections from Batch 88–89 are delivered. Six saved revisions take
priority. All eighteen candidates across Batches 90–91 require GM review
before delivery.

| Cell | Subject | Saved correction / motif |
|---|---|---|
| 1 | Szybkie nogi | Keep crossed boots; opposite moonwalk motion lines |
| 2 | Trajektoria | Keep composition; arc ends exactly at bullseye center |
| 3 | Za garść gambli | Replace coins in busker's hat with cartridges |
| 4 | Zawołajcie kolegów | Turn only foreground beckoning hand palm-forward |
| 5 | Zawsze w siodle | Cowboy asleep while still mounted on a calm horse |
| 6 | Zew areny | Replace bell with a roaring audience |
| 7 | Zryw | Stopwatch with a bold lightning cut |
| 8 | Zwinność szczura | Rat climbing a thick rope |
| 9 | Brutal — class | Powerful fist breaking a broad chain |

`batch.json` preserves canonical mechanics, exact native filenames/hashes and
the six verbatim saved decisions under `revisionOf`. Reference cells 1–6
are the selected sources; cells 7–9 are style-only. Source hashes are in
`style-reference.json`. All older candidates remain available.

Only the motion notation changes on the crossed boots; functional arrows
are explicitly requested here. The trajectory is an unlabelled symbolic
diagram. Cowboy and cheering spectators use natural adult proportions with
sparse faces. The class emblem uses equipment and a gesture, without a bust.

OpenAI's built-in image tool generates one atlas saved as
`raw/batch-90-atlas-a.png`; exact prompts and any targeted corrections are in
`prompts.json`. PNG sources, contact sheets and candidates stay dev-only.

Final `<key>.png`, `.webp`, `.svg` masks are 256×256 pure white with 20 px
margins. Lossless WEBP and the SVG's embedded WEBP match PNG pixels exactly.
After approval, native SVG names receive the selected pixels and WEBP sidecars.
All nine production targets remain unchanged during review.

```sh
python dev/icons/placeholder-pass/process.py --batch=90 --check
node dev/icons/placeholder-pass/register.mjs --batch=90
npm run validate:icon-candidates
```

Inspect `raw/preview.png` and `raw/inventory-preview.png` at 64/32/24/16 px.
Registration archives six old decisions and retains earlier candidates;
only these six cards reset to pending with the new candidate selected.
Three fresh subjects get new cards. No code, packs or world state changes.
Do not rerun historical preparation.

Validation: all nine exact masks pass. One focused generated edit joins the
last trajectory segment to the central bullseye disc; its full prompt,
opaque reference and `raw/standalone-trajektoria.png` output are archived in
`prompts.json`. The other eight subjects retain atlas pixels. A tightly
bounded source ownership region assigns a disconnected 47-pixel rope tip to
the rat, preserving the whole component and removing it from the cowboy's
cell without drawing. The rat recovers 209 source pixels across the cell
boundary. Inventory contact sheets were inspected at 64/32/24/16 px.

All 746 candidate pairs validate. The review gallery has eighteen pending
cards, 45 options, every new candidate selected, no broken images and no
browser errors. Evidence: `raw/review-preview.png` and
`../../../placeholder-pass/progress-90-91.json`. All 32 remaining native
placeholder hashes and unrelated review cards/decisions are preserved.
