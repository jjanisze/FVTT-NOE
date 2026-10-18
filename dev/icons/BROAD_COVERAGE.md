# Expanded icon coverage — 2026-10-17

**UI scope correction, 2026-10-18:** the completed item-art audit below did
not include proficiency/skill UI or advancement header defaults. A live
dnd5e 6.0.6 check confirms 51 colored stock proficiency/skill rows, five
category headers and the mixed Trait advancement header. Existing native
glyphs are now wired for every audited row and header. Four approved Batch 112
designs plus the two selected Batch 113 designs are delivered; current Acrobatics
is retained. Only Sleight of Hand awaits revision review in Batch 114. See
[PROFICIENCY_COVERAGE.md](PROFICIENCY_COVERAGE.md) and its per-key JSON.

For the item-art scopes below, **reviewed glyph delivery and source wiring
are complete**. The five companion subjects and both remaining origin
selections are installed. All 544 review cards are resolved; no generated
initials, missing artwork or audited source wiring gaps remain.
Completion evidence: [completed-2026-10-17.json](completed-2026-10-17.json).

| Source scope | Artwork available | Remaining artwork |
|---|---|---|
| Primary classes | 6/6 | None |
| Professions | 18/18 | None |
| Class-feature file variants | 135/135 | None |
| Main origins | 12/12 installed | None |
| Origin abilities | 36/36 | None |
| Sztuczki | 53/53 have existing matching art | None |
| Weapons, including merged WKK definitions | 85/85 | None |
| Physical item catalog | All 333 have art available | None |
| Fant groups / table entries | 10/10 groups, covering 51 rows | None |
| Bestiary actions and traits | 342/342 configured to native art | None |
| Companion actions and traits | 23/23 configured to native art | None |
| Canonical conditions, hazards and markers | 30 referenced images exist | None |

No generated initials badges remain anywhere in the SVG library. The
source scan found no missing literal icon references in production
scripts, including module-prefixed references. Existing stock condition,
skill and helper-class art is not automatically counted as missing art.
Painted scenery, portraits and tokens remain in the separate GM art queue.

## Completed source wiring

The GM explicitly expanded the asset scope to apply these icon mappings:

- **53 Sztuczki** now use explicit approved filename mappings, preserving
  original rule IDs including camelCase keys.
- **80 bestiary entries** and **11 companion entries** now use native
  art through 89 distinct exact keys. Two duplicate canonical action IDs
  intentionally share an icon. Companion mappings use the real
  `towarzysz-<id>` builder prefix, verified through the companion factory.
- **Three fuel grades and the medic toolkit refill** now use approved
  dedicated icons. All 333 physical catalog entries resolve to module art.
- **Wyłączony** now uses its native status glyph.
- **Origin backgrounds** already discover exact filenames; all twelve
  emblems are included in the rebuilt `pochodzenia` pack.

The source audit now records actual configured images. Integration source
hashes and selected mappings are in `integration-2026-10-17.json`.
`node dev/icons/verify_final_integration.mjs` checks canonical builders,
all resolved reviews and preservation of 537 unrelated decisions.

Installed companion mappings:

| Companion entry | Target SVG (+ WEBP) |
|---|---|
| `zmutowany-owad.kopacz` | `icons/abilities/kopacz.svg` |
| `zmutowany-gad.ziemnowodny` | `icons/abilities/ziemnowodny.svg` |
| `psi-partner.psi-bohater` | `icons/abilities/psi-bohater.svg` |
| `dron-kroczacy.modyfikacje`, `dron-latajacy.modyfikacje` | `icons/abilities/modyfikacje-drona.svg` |
| `dron-kroczacy.atak`, `dron-latajacy.atak` | `icons/abilities/atak-drona.svg` |

With Foundry closed and the GM's explicit authorization, all 18 packs
were rebuilt and passed validation. The recovery-snapshot comparison
preserves all 907 documents and every record ID; only 151 `img` fields
changed. Evidence: `pack-rebuild-2026-10-17.json`. Foundry remains closed.
Older world copies and painted art remain separate GM tasks.

Reproduce the expanded audit: `node dev/icons/audit-module-coverage.mjs`.
Evidence: [module-coverage-2026-10-17.json](module-coverage-2026-10-17.json).
Fresh physical catalog audit:
`node dev/icons/audit-catalog-icons.mjs --date=2026-10-17 --output=catalog-icons-2026-10-17-integrated.json`.
Evidence: [catalog-icons-2026-10-17-integrated.json](catalog-icons-2026-10-17-integrated.json).
