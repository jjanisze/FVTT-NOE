# World and module item audit

Started 2026-10-03. This is the durable inventory for work that sits between
icon generation, compendium creation, live-world cleanup and mechanics.
`MISSING.md` remains the art batch queue.

## Reproducible live snapshot

With Foundry open in the Chrome debug session:

```powershell
node dev/icons/audit-live-items.mjs
```

The script reads Foundry documents through the browser API and writes
`review/audits/live-items.json`. It does not open live LevelDB files. The first
snapshot contained 2,204 Item documents: 274 world, 1,185 actor-owned and 745
module-compendium entries, using 673 distinct icon paths. After Batch 42
integration the snapshot contains 2,208 documents: 274 world, 1,185
actor-owned and 749 compendium entries, using 682 distinct icon paths.
After the 13 approved Batch 43–44 prototypes, it contains 2,221 documents:
274 world, 1,185 actor-owned and 762 compendium entries, using 695 distinct
icon paths.
After Batch 45 integration it contains 2,226 documents: 274 world, 1,185
actor-owned and 767 compendium entries, using 703 distinct icon paths.
After Batch 46 integration it contains 2,228 documents: 274 world, 1,185
actor-owned and 769 compendium entries, using 708 distinct icon paths. After
Batch 49 integration and the broader existing-asset cleanup it remains at 2,228
documents with zero recognized placeholders and 713 distinct icon paths.

Treat the report as evidence, not an automatic edit list. Actor portraits are
often wrong for physical items, but are expected on some creature attacks and
legacy NPC actions. `icons/svg/upgrade.svg` is primarily the separate feat and
Sztuczka art pass.

## Current work

- Batch 41: both blueprint corrections are approved and installed.
- Batch 42: all nine icons are approved and installed. The two borrowed weapon
  icons were replaced, and all four production outputs now have prototypes.
- Seventeen approved production outputs now have deterministic `sprzet`
  prototypes. Their `raw:` and `tabela:` references resolve to those compendium
  documents, with the shared builder as a fallback until packs are rebuilt.
- Batches 43–46: all approved icons are installed. Twenty-four production
  outputs have deterministic `sprzet` prototypes.
- Batches 47–48: approved icons are installed and live actor items were
  repointed through Foundry's document API. The cleanup also reused existing
  baseball-bat, canned-food, brass-knuckles, firing-mode and paralyzer assets.
- Batch 49: eight approved icons are installed and repointed through Foundry's
  document API. The tray attack remains a requested revision.
- Batch 50: six approved icons are installed. Ammunition components, Pogromca
  and the horse attack received revisions in batch 51.
- Batch 51: 27 candidates are ready for one GM review pass across three 3×3
  atlases. The horse variants deliberately share one generic hoof-attack icon.
  The initial textured pass was rejected and all 27 were regenerated as clean,
  low-detail silhouettes. FN Scar L was also repointed to the existing dedicated
  SCAR asset.
- Batch 51 review: 14 clean icons are installed and repointed live. Twelve
  targeted revisions remain, while Kusza pistoletowa / automatyczna is pending.
  Weapon and bestiary generator mappings preserve approved icons on future pack
  builds; the shared LevelDB packs were not rebuilt during concurrent work.
- Batch 52: 27 review cards are ready: twelve targeted revisions, the pending
  pistol crossbow, Staza, and thirteen additional live ability gaps. A generated
  Regeneracja candidate is held for Batch 53 to preserve the 27-card review size.

## Prototype and mechanics decisions exposed by batch 42

- **Agregat:** create a reusable loot/equipment prototype. The rulebook text also
  says a generator can extend drone operation for 0.5 l fuel per hour. Audit the
  drone implementation and add a mechanics TODO if that interaction is absent.
- **Akumulator:** create a reusable prototype. The rulebook specifies one hour
  for a medium drone and four hours for a small drone. Audit whether charge and
  consumption belong in the current drone system before adding automation.
- **Alternator:** create a reusable prototype. No standalone active mechanic was
  found in the current module sources; keep it ordinary equipment unless the
  rulebook supplies an interaction elsewhere.
- **Defibrylator:** create a reusable prototype. The current sources provide its
  catalog and production data but no use action. Re-read the surrounding
  rulebook entry before inventing healing, stabilization or charge mechanics.

## Immediate data-fix candidates from the first snapshot

These need verification against existing dedicated assets before they become art
tasks: actor-owned Bejzbol entries using portraits or `item-bag.svg`, Berdysz
using `item-bag.svg`, and several copies of `Bez Broni` using `item-bag.svg`.
When the correct asset already exists, repoint the document rather than queueing
new art.

The snapshot also exposes campaign-specific weapons using actor portraits, such
as Ruger LCP II, Skalpel, Walther PPK, Raca drogowa and Scyzoryk. Review their
source status before adding them: some may be intentional one-off items, aliases
of existing prototypes, or future WKK compendium entries.
