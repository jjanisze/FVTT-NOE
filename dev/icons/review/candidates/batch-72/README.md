# Batch 72 — five revisions and four fresh subjects

First of the next two nine-cell atlases. Thirteen Batch 70–71 approvals have
been installed. These candidates require fresh GM review before delivery.

| Cell | Subject | Work |
|---|---|---|
| 1 | Bez tajemnic | Nonhuman mutant face and corrected shoulder anatomy |
| 2 | Dwóch na jednego | Remove only the isolated triangle below the left fist |
| 3 | Ekspert | Caliper rail visibly extends past the whole hand |
| 4 | Elektronik | Shackle swings left; lock body stays upright |
| 5 | Goła klata | More muscular chest with one healed battle scar |
| 6 | Hakerstwo | Rugged laptop and processor symbol |
| 7 | Inteligentna obrona | Generic adult guides an incoming punch aside |
| 8 | Ja i mój gang! | Three generic allies in fighting formation |
| 9 | Jak dbasz, tak masz | Handgun, cleaning cloth and oil can |

`batch.json` preserves canonical mechanics, exact native target hashes and all
five selected sources with verbatim GM notes under `revisionOf`. The first
five reference cells are those exact selections; the last four are style-only
examples for new subjects. All requests are generic and public-repo safe.

OpenAI's built-in image tool generates one atlas saved as
`raw/batch-72-atlas-a.png`. The exact prompt set is in `prompts.json`; reference
source hashes are in `style-reference.json`. A targeted built-in edit replaces
Bez tajemnic's still-human head with an unmistakably nonhuman mutant and fixes
the side-profile neck/shoulder connection. Its exact prompt and edit reference
are archived in the same prompt set; the raw result is
`raw/standalone-bez-tajemnic.png`.

Final `<key>.png`, `.webp`, `.svg` files are 256×256 pure white masks with 20 px
margins. Lossless WEBP and the SVG's embedded WEBP match PNG pixels exactly.
PNGs and opaque previews stay dev-only. Production delivery after approval
uses the unchanged SVG filenames and WEBP sidecars, with no code wiring.

```sh
python dev/icons/placeholder-pass/process.py --batch=72 --check
node dev/icons/placeholder-pass/register.mjs --batch=72
npm run validate:icon-candidates
```

Registration keeps the existing five review card IDs and every old candidate,
archives saved decisions in `revision-feedback-before.json`, then selects the
new pending revisions. Unrelated GM decisions remain unchanged. Do not rerun
historical `prepare_72_73.py`. No code, packs or world state are modified.

Final validation: both nine-mask batches pass, and the full collection contains
584 valid PNG/SVG pairs. Previews were inspected at 64/32/24/16 px. The live
review gallery shows 18 pending cards, 42 options, all new candidates selected
and no failed images. Two isolated revision-registration tests pass. Evidence:
`raw/review-preview.png` and `../../../placeholder-pass/progress-72-73.json`.
