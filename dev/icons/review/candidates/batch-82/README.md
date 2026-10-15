# Batch 82 — eight revisions and one fresh subject

Ten selections from the Batch 80–81 review are delivered, including the older
Podstępny atak selection. Eight saved revisions take priority. All eighteen
new candidates across Batches 82–83 require GM review before delivery.

| Cell | Subject | Motif / saved correction |
|---|---|---|
| 1 | Nie do zdarcia | Hammer shatters against an uninjured adult's forehead |
| 2 | Reputacja | Completed-service dog tag and coins; no handshake |
| 3 | Rutyna | Unfazed soldier crawls beneath barbed wire and gunfire |
| 4 | Rzeźnik | One hand lifts target's arm; other fist prepares underarm strike |
| 5 | Rzuć broń i gleba! | Held gun replaces stop palm; prone person and dropped gun retained |
| 6 | Samouk | Generic head profile with wrench-shaped knowledge symbol; no book |
| 7 | Saper | Two hands thread a needle |
| 8 | Serwisowanie | Service opening on the radio's underside |
| 9 | Skuteczny cios | Fist disarms a knife-holding hand |

`batch.json` preserves canonical mechanics, exact native filenames/hashes and
all eight verbatim saved decisions under `revisionOf`. Reference cells 1–8
are those selected sources; cell 9 is style-only. Source hashes are in
`style-reference.json`. Earlier concepts and candidates remain available.

The new resilience concept uses an intact, uninjured person and a breaking
hammer. Rzeźnik shows a poised fist before contact, with no wound or gore.
Reputacja and Samouk explicitly replace the repeated handshake and book
motifs. Adults stay generic, with sparse natural facial detail and no anime.

OpenAI's built-in image tool generates one atlas saved as
`raw/batch-82-atlas-a.png`; exact prompts and any targeted corrections are in
`prompts.json`. PNG sources, previews and review candidates stay dev-only.

Final `<key>.png`, `.webp`, `.svg` masks are 256×256 pure white with 20 px
margins. Lossless WEBP and the SVG's embedded WEBP match PNG pixels exactly.
After approval, native SVG names receive selected pixels and WEBP sidecars.
All nine production targets remain unchanged during review.

```sh
python dev/icons/placeholder-pass/process.py --batch=82 --check
node dev/icons/placeholder-pass/register.mjs --batch=82
npm run validate:icon-candidates
```

Inspect `raw/preview.png` and `raw/inventory-preview.png` at 64/32/24/16 px.
Registration archives the eight previous decisions and retains older
candidates; only those eight cards reset to pending with the new candidate
selected. Skuteczny cios gets a new card. No code, packs or world state
changes. Do not rerun the historical preparation script.

Validation: nine exact masks pass. The radio's disconnected antenna tip
straddles its source row boundary; a tight `ownershipRegions` box retains
that entire 263-pixel component with the radio (191 pixels lie outside its
nominal cell). No drawing or clipping is involved, and the neighboring
surrender icon has no stray tip. No targeted generation correction was needed.
Contact sheets were inspected at 64/32/24/16 px. All 674 candidate pairs pass;
the gallery has 18 pending cards, 45 options, all new candidates selected and
no broken images. Evidence: `raw/review-preview.png` and
`../../../placeholder-pass/progress-82-83.json`.

Saved GM review: seven approvals installed. Rzeźnik and Serwisowanie carry
their exact saved notes into Batch 84. `reviewed.json` preserves every decision;
`reviewed-installed.json` records selected sources and delivered hashes.
