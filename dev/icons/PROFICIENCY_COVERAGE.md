# Proficiency and advancement icon coverage — 2026-10-18

**Confirmed gap:** the item-art pass did not cover system-level proficiency UI.
Read-only inspection of the live dnd5e 6.0.6 sandbox called the real
`dnd5e.documents.Trait.keyIcon`, rather than inferring icons from item images.

| UI surface | Confirmed result | Existing-art route |
|---|---|---|
| Armor proficiency rows | 4 rows share the colored breastplate/helmet | Leather armor, tactical vest, composite armor and shield glyphs |
| Weapon proficiency rows | 7 groups share colored crossed swords | Existing per-type weapon fallback glyphs |
| Tool proficiency rows | All 22 share the colored smithing anvil | All 22 `icons/tools/<id>.svg` files exist |
| Skill rows | All 18 explicitly use colored stock artwork | Existing skill-related feat/item glyphs are reuse candidates |
| Category headers | Armor, weapons, tools, skills and saves use colored stock art | Five existing native glyph candidates |
| Mixed Trait advancement header | Colored parchment scroll | Existing training glyph candidate |
| Saving-throw rows | 6 existing monochrome ability SVGs | No colored-art replacement queued |

That is **51 colored proficiency/skill rows plus six header lookups**.
All 52 distinct proposed reuse files exist. Suggestions are recorded per key in
[proficiency-icons-2026-10-18.json](proficiency-icons-2026-10-18.json); skill and
header choices still need semantic/visual review before being treated as final.
No new image generation is established as necessary, so these are not added to
MISSING as absent files.

The code path explains why correct inventory icons did not fix this UI:

- [skills.mjs](../../scripts/config/skills.mjs) sets all 18 stock icons explicitly.
- [armor.mjs](../../scripts/config/armor.mjs) and
  [weapons.mjs](../../scripts/config/weapons.mjs) change proficiency labels and
  categories while leaving `CONFIG.DND5E.traits.*.icon` untouched.
- [tools.mjs](../../scripts/config/tools.mjs) supplies custom labels and empty
  base-item IDs, but the trait renderer falls back to the category anvil.
  Adding only `tools[key].icon` would not fix that renderer: its first lookup
  uses `toolProficiencies[key].icon`, where these entries are currently strings.
- `TraitFlow.#prepareTraitSlots` calls `Trait.keyIcon` for every selected row.
  `TraitAdvancement.prepareData` uses the category icon for a single trait type,
  or its metadata scroll for mixed types, unless an explicit image is supplied.

Keep existing proficiency keys and labels intact when wiring icons. The follow-up
needs to cover row lookups, category headers and the mixed advancement image;
changing only the inventory-item builders will miss them again.

The JSON also records other stock advancement metadata defaults as an adjacent
scope. Their presence does not establish that every advancement type is used.
Existing damage/condition immunity symbols are monochrome SVGs and are not
classified as colored-art gaps.

This audit changed no production configuration, packs or Foundry documents.
