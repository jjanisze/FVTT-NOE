# PLAN — Narzędzia ("Małego X" toolkits)

Status: **DONE — all 22 kits live on Zbrojownia; medyk heal implemented & verified**

## Goal
Replace the plain `loot` "Mały X" items (currently on GMT400 etc.) with properly
integrated **dnd5e `tool` items** that:
1. Expose a **generic use action** = native Test Cechy z narzędziem (tool check, no DC).
2. Expose the per-toolkit **"Używanie" actions as Check activities** with the ST (DC)
   taken from [Tabele/Narzedzia.md](../../../../../Git/Neuroshima/neuro5e/Neuro%205e/Tabele/Narzedzia.md).
3. Special-case **Mały medyk** = tiered healing (table) + 5-use resource + refill.

Single source of truth for stats/ST/abilities: **`Tabele/Narzedzia.md`**.

## Current state (live world, verified via CDP)
- `CONFIG.DND5E.tools` already defines 22 keys (`aptekarza`…`tatuazysty`) with a
  default ability — see [scripts/config/tools.mjs](scripts/config/tools.mjs).
- GMT400 (`Wke8ursIGVbKLMUF`, vehicle) carries toolkits as **`loot`** items with no
  mechanics: "Mały Rzeźnik", "Mały Stolarz", "Mały Rusznikarz", "Mały Kłusownik".
- No `tool`-type items exist in the world yet.
- dnd5e SRD packs (`dnd5e.items`) contain matching "5ec cards" for most kits
  (Smith's/Jeweler's/Cartographer's/Forgery/Disguise/Brewer's/Glassblower's/
  Thieves'/Cook's/Carpenter's/Alchemist's/Herbalism…). No SRD equivalent for
  **haker, kłusownik, rusznikarz, rzeźnik** → fully custom.

## dnd5e `tool` data model (release-5.3.0)
- `system.ability` (single string) — default ability for the check.
- `system.type.value` — tool key (maps to `CONFIG.DND5E.tools`) → drives proficiency.
- `system.bonus`, `system.proficient`, `system.properties`.
- Supports **activities** (`ActivitiesTemplate`) → we attach Check activities for ST actions.
- Native "use" rolls a tool check (the generic action).

## Toolkit → ability + 5ec base mapping
| Kit | NS ability (primary/alt) | 5ec base card |
|---|---|---|
| aptekarza | INT | Herbalism Kit |
| charakteryzatora | DEX | Disguise Kit |
| chemika | INT | Alchemist's Supplies |
| elektronika | DEX / INT | Tinker's Tools |
| falszerza | DEX | Forgery Kit |
| gorzelnika | WIS / INT | Brewer's Supplies |
| hakera | INT | — (custom) |
| jubilera | INT / WIS | Jeweler's Tools |
| kartografa | INT / DEX | Cartographer's Tools |
| klusownika | DEX / WIS | — (custom) |
| kowala | STR / WIS | Smith's Tools |
| krawca | DEX | Weaver's / Leatherworker's |
| kucharza | WIS | Cook's Utensils |
| mechanika | DEX / INT | Tinker's Tools |
| medyka | INT | Herbalism Kit (healing) |
| rusznikarza | DEX / INT | — (custom) |
| rzeznika | WIS / STR | — (custom) |
| stolarza | DEX / STR | Carpenter's / Woodcarver's |
| szulera | WIS / CHA | Playing Cards / Dice Set |
| szklarza | INT / DEX | Glassblower's Tools |
| slusarza | DEX | Thieves' Tools |
| tatuazysty | DEX | Painter's Supplies |

## Proposed architecture
- `scripts/config/toolkits-data.mjs` — `TOOLKITS` table: `{ id, label, ability, altAbility,
  weight, price, avail, baseItem, icon, actions:[{name, dc, ability?}], special? }`.
  Parsed/derived from `Tabele/Narzedzia.md`.
- Generator: `game.neuroshima.createToolkits()` (ready-hook export, mirrors the ammo
  bulk-create pattern in fvtt-dev-context memory) → creates 22 `tool` world Items in a
  **"Narzędzia"** Item folder; each with native ability + Check activities per action.
- `scripts/items/toolkit-medyk.mjs` — custom medyk heal flow (tiered table + 5-charge
  resource + refill ST), modeled on `weapons/dozownik.mjs`.
- Icons: `dev/icons/process_grid_26.py` (3×3) from `dev/icons/in/Weapons_Resize_26.png`
  → `icons/tools/` (`aptekarza.png/.svg`, …). First sheet = the 9 kits the GM provided
  (aptekarz, charakteryzator, chemik, elektronik, fałszerz, gorzelnik, haker, jubiler,
  kartograf), in that grid order.

## Decisions (LOCKED)
1. **Item type**: `loot` → `tool`. ✓
2. **Dual-ability kits**: store FIRST-listed as `system.ability`; player re-picks in roll dialog. ✓
3. **Generic action**: native tool-check-on-use (no DC), no extra activity. ✓
4. **ST actions**: each "Używanie" bullet → its own native **Check activity** vs that ST.
   Button name carries the ST (e.g. "Otwarcie zamka mechanicznego (ST 15)"). No custom
   dialog — native multi-activity is clearest and zero custom UI. ✓
5. **Medyk**: DEFERRED to a later batch (tiered heal + 5-charge resource + refill). ✓
6. **Scope**: all 22 kits now (data-driven); icons batched, 9 first. ✓
7. **Master = Zbrojownia actor**. Generator creates the 22 `tool` items ON the Zbrojownia
   actor. Extend `zbrojownia-sync.mjs` to also push `tool` items → world Items folder
   "Narzędzia". GMT400 et al. are downstream — NOT touched directly. ✓
8. **Crafting/Produkcja + ammo elaboration**: description-only this pass. ✓
9. **No proficiency**: allow roll without PB, never hard-block. ✓

## Verified mechanics (dnd5e 5.3, from source + live world)
- Zbrojownia actor = `4IYaZ7YQ1uy90FOz` (character, flag `isZbrojownia`).
- `tool` item: `system.type.value="tool"`, `system.type.baseItem="<toolKey>"`
  (key in `CONFIG.DND5E.tools`), `system.ability="<primary>"`.
- **Check activity** rolls a TOOL check when `check.associated=[toolKey]` (or, for a tool
  item, when associated is empty it auto-uses `system.type.baseItem`). `#rollCheck` calls
  `actor.rollToolCheck({tool, target:DC, ability, bonus, prof, item})` → adds PB if proficient.
- Flat ST: `check.dc = { calculation:"", formula:"15" }`. `getAbility` returns
  `check.ability` if set (our primary) → re-pickable in dialog.
- Per fvtt-dev memory: do NOT inline `activities` with hardcoded `_id` on create →
  create the item bare, then `item.createActivity("check", {...}, {renderSheet:false})`.

## Build steps
1. `scripts/config/toolkits-data.mjs` — TOOLKITS table + `buildToolkitItemData()` +
   `createToolkits(actor)` generator (upsert by `baseItem`; rebuild activities each run).
2. `main.mjs` — import; expose `game.neuroshima.createToolkits` in ready hook.
3. `scripts/actors/zbrojownia-sync.mjs` — route `tool` items to a "Narzędzia" folder.
4. `dev/icons/process_grid_26.py` — 3×3 sheet → `icons/tools/` for the first 9 kits.
5. Reload world via CDP → `game.neuroshima.createToolkits()` to populate Zbrojownia.

## Out of scope (this pass)
- Crafting/production system, ammo elaboration mechanics, vehicle repair, bebeszenie, medyk.

## Status / follow-ups
- ✅ 22 `tool` items created on Zbrojownia (`createToolkits()`), each with "Test narzędzi"
  + ST-action Check activities; verified tool-check roll + DC + Polish labels in chat.
- ✅ Icons: ALL 22 dedicated (`icons/tools/`, batches 26/27/28). Batch 28 also added 5 spare
  loot icons (`icons/items/loot/`: notatka, pudelko, szkatulka, dvd, plytka).
- ✅ `tools.mjs`: `id:""` + label mirror into `toolProficiencies` (fixes keyLabel crash).
- ✅ **Mały medyk — Przywracanie PW** (`scripts/items/toolkit-medyk.mjs`): token-target →
  proficiency gate → Int(medyka) check → tiered heal (5/10/15/20/25+) → applyDamage(healing)
  → 5-charge supply + refill (−5 gb) → Sequencer green VFX + "+X" text + sound. Non-prof =
  auto-stabilise. Verified live (heal +11, charges 5→4; stabilise path OK).
- ✅ Sound: `sounds/misc/medyk_heal.ogg` (Freesound CC0 #483608).
- ⏭ GM action: click **"Synchronizuj zbrojownię"** to push the 22 tool items into world Items.
- ⏭ Optional: install JB2A for a richer healing VFX (currently green-tint fallback).
