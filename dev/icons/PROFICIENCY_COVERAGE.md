# Proficiency and advancement icon coverage — 2026-10-18

**Wiring complete:** all 51 proficiency/skill rows and six header lookups now
resolve to approved module glyphs. Four dedicated Batch 112 designs are now
installed, and the GM chose to retain the current Acrobatics glyph. Three
skill subjects remain in revision; those slots use approved-art substitutes.

| UI surface | Installed wiring | Dedicated artwork still awaiting review |
|---|---|---|
| Armor proficiency rows | 4 distinct armor/shield glyphs | None |
| Weapon proficiency rows | 7 matching weapon-type glyphs | None |
| Tool proficiency rows | All 22 matching toolkit glyphs | None |
| Skill rows | All 18 use native glyphs; new History and Vehicles delivered; current Acrobatics retained | Intuition, intimidation, sleight of hand |
| Category headers | Armor, weapons, tools, skills and saves use native glyphs; new skills/saves headers delivered | None |
| Mixed Trait advancement header | Shares the approved new skills header | None |
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
[proficiency-icons-2026-10-18-approved.json](proficiency-icons-2026-10-18-approved.json).
Local screenshots: `review/audits/native-proficiencies.png`,
`review/audits/native-skills.png`, `review/audits/native-skills-light.png`.
The installed Batch 112 designs passed the same native check after reload;
new screenshot: `review/audits/native-batch-112-approved.png`.
Poligon follow-up: **Kreator → ikony-bieglosci**; the station was not reseeded.

Batch 112 exact decisions and delivered hashes are under
`review/candidates/batch-112/reviewed-installed.json`. Batch 113 has four revision
candidates for the remaining three cards: a new Intuition concept, two requested
Intimidation alternatives, and corrected Sleight of Hand anatomy. Earlier
choices remain selectable; saved notes and selected-source hashes are retained.
Only saved GM approvals authorize installation of those revisions.

Other advancement types' metadata defaults are recorded in the historical JSON
as an adjacent scope; this change covers Trait proficiencies and skills.
