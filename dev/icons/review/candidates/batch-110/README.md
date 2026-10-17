# Batch 110 — seven saved origin revisions

| Cell | Pochodzenie | Requested change |
|---|---|---|
| 1 | Człowiek Pustyni | Replace canteen with dunes and a dead tree |
| 2 | Detroit | Add an industrial city skyline to the tire and piston |
| 3 | Federacja Appalachów | Add aristocratic flair with a broad crown |
| 4 | Nowy Jork | Replace book with Liberty torch and seven-spiked crown |
| 5 | Południowa Hegemonia | Raider helmet and heavy improvised machete |
| 6 | Posterunek | Clean the GM-supplied angular star insignia |
| 7 | Vegas | Slot machine and cards, rather than cards alone |
| 8–9 | Empty | No filler glyphs |

OpenAI's built-in image tool generated one partial 3×3 atlas. Reference 1
supplies the broad white-glyph style; reference 2 contains the exact
selected previous candidates; reference 3 supplies the Posterunek emblem
for cell 6 only. Its black geometry becomes white, with the central star,
plus/minus and internal channels retained as black cutouts. The original
emblem's creator/source was not specified; the supplied reference stays
dev-only and is identified by hash.

Exact generic prompt and reference roles: [prompts.json](prompts.json).
`batch.json` and `revision-feedback-before.json` archive the saved notes;
only the local reference location is redacted from public metadata. Full
original feedback remains in ignored `raw/revision-feedback-private.json`
with a matching hash recorded for each decision.

```sh
python dev/icons/placeholder-pass/process.py --batch=110 --check
```

The processor only splits, crops, resizes and converts. All seven 256×256
pure-white alpha masks have 20 px margins and exact PNG/external lossless
WEBP/SVG-embedded WEBP pixels. Inventory previews were inspected at
64/32/24/16 px. All 864 candidate pairs validate.

The refreshed review page has seven cards and 21 current/old/new choices,
with every new revision selected, zero broken images and zero browser
errors. Local screenshot and browser checks are under `raw/`.
Evidence: `../../../style-pass/progress-110.json`.

All 532 unrelated cards and decisions remain unchanged. Nine previously
approved icon pairs still match their exact hashes; two retired PNG
siblings remain archived. Seven origin target sets are still absent in
production and require fresh saved approval before delivery. Existing
pack code already supports the exact origin filenames; the GM rebuilds
`pochodzenia` and handles old world backgrounds separately.
