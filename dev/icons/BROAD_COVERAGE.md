# Expanded icon coverage — 2026-10-17

The physical-item audit omitted companion-specific traits. The expanded
source audit found **five additional art subjects**, covering seven
companion feature entries: Kopacz, Ziemnowodny, Psi bohater, Modyfikacje
drona and Atak drona. Batch 111 includes those five plus the saved Nowy
Jork and Południowa Hegemonia revisions. None of these candidates is
installed before fresh approval.

| Source scope | Artwork available | Remaining artwork |
|---|---|---|
| Primary classes | 6/6 | None |
| Professions | 18/18 | None |
| Class-feature file variants | 135/135 | None |
| Main origins | 10/12 installed | Two revisions in Batch 111 |
| Origin abilities | 36/36 | None |
| Sztuczki | 53/53 have existing matching art | None |
| Weapons, including merged WKK definitions | 85/85 | None |
| Physical item catalog | All 333 have art available | None |
| Fant groups / table entries | 10/10 groups, covering 51 rows | None |
| Bestiary actions and traits | Existing art available for all 342 entries | None; semantic reuse mappings need GM review |
| Companion actions and traits | Existing or mapped art for 16/23 entries | Seven entries share the five new glyphs above |
| Canonical conditions, hazards and markers | 30 referenced images exist | None |

No generated initials badges remain anywhere in the SVG library. The
source scan found no missing literal icon references in production
scripts, including module-prefixed references. Existing stock condition,
skill and helper-class art is not automatically counted as missing art.
Painted scenery, portraits and tokens remain in the separate GM art queue.

## Wiring still needed

Artwork availability does not mean every source builder uses it:

- **53 Sztuczki** still get the core upgrade icon from `sztuczkaItemData`
  and its pack wrapper. Existing matched SVG paths are listed per entry
  in the report. Update the shared builder or pack icon selection, then
  rebuild through the GM/code agent.
- **80 bestiary entries** and **11 companion entries** still get the
  same core upgrade fallback from `buildBestiaryItem`. All 80 bestiary
  entries and four companion entries can reuse existing art. The other
  seven companion entries share the five new Batch 111 subjects.
- **Four physical items** retain their existing previously recorded
  wiring gaps: the three fuel grades and the medic toolkit refill.
- **Origin backgrounds** already use exact filename discovery; the GM
  rebuilds `pochodzenia` after delivery. Older world copies may still
  retain images from before these asset deliveries.

The report distinguishes configured images from proposed reuse paths.
Matching filenames and semantic aliases are suggestions for the GM/code
agent, not edits or newly granted image approvals. The asset agent changed
no runtime source, pack database or world document.

New companion mappings after approval:

| Companion entry | Target SVG (+ WEBP) |
|---|---|
| `zmutowany-owad.kopacz` | `icons/abilities/kopacz.svg` |
| `zmutowany-gad.ziemnowodny` | `icons/abilities/ziemnowodny.svg` |
| `psi-partner.psi-bohater` | `icons/abilities/psi-bohater.svg` |
| `dron-kroczacy.modyfikacje`, `dron-latajacy.modyfikacje` | `icons/abilities/modyfikacje-drona.svg` |
| `dron-kroczacy.atak`, `dron-latajacy.atak` | `icons/abilities/atak-drona.svg` |

This is a working-tree source/filesystem snapshot while code work is in
progress. Source hashes are recorded; it does not inspect built pack
contents or live campaign copies. No pack build or live repoint was run.

Reproduce the expanded audit: `node dev/icons/audit-module-coverage.mjs`.
Evidence: [module-coverage-2026-10-17.json](module-coverage-2026-10-17.json).
Fresh physical catalog audit:
`node dev/icons/audit-catalog-icons.mjs --date=2026-10-17 --output=catalog-icons-2026-10-17-final-audit.json`.
Evidence: [catalog-icons-2026-10-17-final-audit.json](catalog-icons-2026-10-17-final-audit.json).
