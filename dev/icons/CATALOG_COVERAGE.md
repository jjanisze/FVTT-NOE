# Canonical item icon coverage — 2026-10-12

Audit source: the module's `KATALOG` item-result entries and the image fields/rules
used by its data builders. The audit reads source definitions and local files;
it does not build packs or read/write campaign documents.

| Scope | Result |
|---|---|
| Canonical physical item results | 333 inspected |
| Entries pointing to existing custom module art | 329 |
| Missing referenced module files | 0 |
| Chemistry catalog | All 35 entries have existing configured custom art |
| Medicines/stimulants in the medicine category | All 23 have distinct icon paths and distinct file hashes |
| Reminex | Configured `icons/items/drugs/reminex.svg` exists; dedicated capsule-bottle glyph from Batch 36 |
| Fuel grades | Three art gaps: good, average and adulterated five-litre fuel |
| Medic toolkit refill | Dedicated `icons/items/loot/uzupelnienie_medyka.svg` exists, but the builder still uses `icons/svg/heal.svg` |

The three canonical fuel entries currently fall back to `icons/svg/item-bag.svg`.
They are quality grades, not separate gasoline/diesel item definitions. The existing
common fuel art (`icons/items/loot/paliwo.svg`) is one generic can, not three grade
variants. Batch 67 adds three distinct fuel silhouettes alongside the six open
feature/action revisions. Candidate production paths are:

- `icons/items/loot/paliwo_dobre.svg` + `.webp`
- `icons/items/loot/paliwo_przecietne.svg` + `.webp`
- `icons/items/loot/paliwo_chrzczone.svg` + `.webp`

Fresh candidates require GM review before installation. After approval the GM
must add these three entries to `RAW_IKONY` in `scripts/production/wynik.mjs`,
preserving the canonical `raw:paliwo-*` references. The asset agent does not edit
that code. The medic refill requires only an image repoint of `REFILL_IMG` in
`scripts/items/toolkit-medyk.mjs`; new art is unnecessary. These wiring tasks are
recorded in MISSING's "Do podpięcia".

Delivery update, 2026-10-13: the good and average fuel candidates are approved
and installed as the WEBP/SVG pairs above. Adulterated fuel needs a revision
to a cheap plastic juice jug without an inspection window (Batch 68). The
original catalog wiring count stays at 329/333 until the GM updates its resolver;
installing art alone does not change item definitions. Exact delivery evidence:
`review/candidates/batch-67/reviewed-installed.json`.

The earlier 98% progress estimate described the known review queue, origins and
Sztuczki, not an exhaustive item audit. This source audit expands the backlog with
the three fuel variants. Shared images across magazine families or different
package quantities are not automatically art gaps; medicine entries have distinct
icons. Existing campaign copies and already-built packs can retain old images
until their separate GM repoints/rebuilds.

Reproduce the audit:

```sh
node dev/icons/audit-catalog-icons.mjs
python dev/icons/preview-catalog-audit.py
```

Full generic per-item evidence is in [catalog-icons-2026-10-12.json](catalog-icons-2026-10-12.json).
The local contact sheet is `review/candidates/batch-67/raw/catalog-preview.png`.
No campaign names or private data are written to this report.
