# Batch 109 — 7 main origin emblems

Review outcome, 2026-10-17: Missisipi, Salt Lake City and Teksas are
approved and installed. Nowy Jork, Południowa Hegemonia, Posterunek and
Vegas continue in Batch 110. Local reference locations are removed from
public metadata; exact original feedback is archived under ignored raw,
with hashes retained in `reviewed.json`. Delivery hashes are in
`reviewed-installed.json`. Preparation evidence below is historical.

| Cell | Pochodzenie | Motif |
|---|---|---|
| 1 | Missisipi | Gas mask and marsh reeds |
| 2 | Nowy Jork | Open book and city skyline |
| 3 | Południowa Hegemonia | Fist and broken chain |
| 4 | Posterunek | Shield and microchip |
| 5 | Salt Lake City | Open book and cross |
| 6 | Teksas | Cowboy hat and horseshoe |
| 7 | Vegas | Three playing cards with one large spade |
| 8–9 | Empty | Black cells, no filler icons |

OpenAI's built-in image tool generated one partial 3×3 atlas using the
desired broad white-glyph reference. All seven subjects are new artwork
for origin background items, distinct from their 36 existing ability
icons. Canonical descriptions and generic prompts are in `batch.json`
and `prompts.json`. `incoming.json` records explicitly absent target
SVG/WEBP/PNG paths; fresh approval is required before creating assets.

```sh
python dev/icons/placeholder-pass/process.py --batch=109 --check
```

Processing only splits, crops, resizes and converts. Seven 256×256 masks
pass pure-white alpha, 20 px margins and exact PNG/WEBP/embedded-WEBP
equality. Unused cells are empty. Inventory previews were inspected at
64/32/24/16 px. All 857 candidate pairs validate. Shared browser evidence
and screenshot are under `../batch-108/raw/`; progress:
`../../../style-pass/progress-108-109.json`.

The main review has 16 cards and 34 choices, zero broken images or errors,
with all new candidates selected at publication. No production asset,
runtime code, pack database or world document was changed during
preparation. The existing pack builder selects exact origin filenames
after approval and delivery; the GM performs its rebuild.

The core village comparison is local, dev-only and ignored by Git.
