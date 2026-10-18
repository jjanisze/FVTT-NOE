# Proficiency and advancement icon coverage — 2026-10-18

**Wiring complete:** all 51 proficiency/skill rows and six header lookups now
resolve to existing approved module glyphs. Eight dedicated designs are in
Batch 112 for GM review; those slots currently use approved-art substitutes.

| UI surface | Installed wiring | Dedicated artwork still awaiting review |
|---|---|---|
| Armor proficiency rows | 4 distinct armor/shield glyphs | None |
| Weapon proficiency rows | 7 matching weapon-type glyphs | None |
| Tool proficiency rows | All 22 matching toolkit glyphs | None |
| Skill rows | All 18 use native glyphs | Acrobatics, history, intuition, vehicles, intimidation, sleight of hand |
| Category headers | Armor, weapons, tools, skills and saves use native glyphs | Skills and saves |
| Mixed Trait advancement header | Shares the native skills header | Shares the new skills design |
| Saving-throw rows | 6 existing monochrome ability SVGs retained | None |

The original item-art pass did not cover this system UI. Historical evidence:
[proficiency-icons-2026-10-18.json](proficiency-icons-2026-10-18.json).
Initial reuse suggestions were checked visually: a leaping rat, pistol hand,
repair scene and monster face were unsuitable for the corresponding skills.
The final mapping uses more suitable substitutes while dedicated designs await approval.

The native renderer reads `CONFIG.DND5E.traits[type].configKey`. The new
[registration](../../scripts/config/proficiency-icons.mjs) supplies separate
`{label, icon}` display maps for armor, weapons and tools. Original proficiency
maps remain string-valued with the same keys and labels. No resolver patch or
proficiency-data migration is needed. [skills.mjs](../../scripts/config/skills.mjs)
uses the [shared glyph mapping](../../scripts/config/proficiency-icons-data.mjs).

Category images cover single-type Trait advancements. Mixed Trait advancements
read a fresh static metadata object, so a guarded metadata getter wrapper changes
only its default image, preserving the native title, applications and other metadata.
Explicit advancement images remain authoritative. Packs need no rebuild for these
runtime defaults; stored custom images are outside this change.

Verification on dnd5e 6.0.6:

- `npm test` passes, as do syntax and whitespace checks.
- Native `Trait.keyIcon` resolves all 57 rows to SVGs; every asset fetch succeeds.
- Native armor/weapon/tool choice lists are identical before and after using the
  rich display maps, including wildcard choices and the legacy tool category.
- Original label maps survive repeated registration unchanged.
- A transient Actor/Class with real Trait advancements renders all 57 native
  TraitFlow slots with matching labels and images; single and mixed headers resolve.
- Dark and light UI checks confirm theme-aware glyph contrast. No stored Foundry
  documents were created or changed.

Reproducible browser check: `proficiency-pass/check-sandbox.mjs` (evaluate its
function in an agent sandbox). Machine evidence:
[proficiency-icons-2026-10-18-integrated.json](proficiency-icons-2026-10-18-integrated.json).
Local screenshots: `review/audits/native-proficiencies.png`,
`review/audits/native-skills.png`, `review/audits/native-skills-light.png`.
Poligon follow-up: **Kreator → ikony-bieglosci**; the station was not reseeded.

Batch 112 prompts, targets, normalization and hashes are under
`review/candidates/batch-112/`. Its eight cards are open in the review browser.
Only saved GM approvals authorize installation of those new designs.

Other advancement types' metadata defaults are recorded in the historical JSON
as an adjacent scope; this change covers Trait proficiencies and skills.
