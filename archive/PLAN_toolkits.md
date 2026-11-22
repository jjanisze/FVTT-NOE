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

## Follow-up — native dnd5e UI parity (in progress, kowala = vertical slice)

The `dnd5e.preUseActivity`-cancelling flow above (still live for the other 21 kits)
was found to short-circuit dnd5e's stock "check" Activity UI entirely — no chevron
chat card, no roll dialog, no per-DC buttons — instead of just fixing WHO the check
rolls for. Root cause + fix:

- `CheckActivity.#rollCheck` (dnd5e core) resolves the roller via `getSceneTargets()`
  (canvas-controlled tokens, falling back to `game.user.character`) — right for a
  Check activity used as a generic "impose this on others" primitive, wrong for a
  personal tool kit. `getSceneTargets(actor)` already supports resolving to a given
  actor's own token; stock dnd5e just never passes `this.item.actor` into it.
- New `scripts/items/toolkit-check-activity.mjs` registers a `neuroToolCheck`
  Activity type — a `CheckActivity` subclass overriding ONLY the `rollCheck` chat-card
  action to seed `getSceneTargets(this.item.actor)`. Everything else (dialog, card,
  buttons, pills) is inherited unchanged — same subclass-a-base-Activity pattern as
  `scripts/weapons/fire-modes.mjs`.
- `TOOLKITS[].nativeCheck: true` (currently only `kowala`) switches that kit's
  generated activities to `neuroToolCheck` instead of `check` in `createToolkits()`.
  `toolkit-check.mjs`'s old hook only matches `type === "check"`, so a graduated kit
  is automatically skipped there — no explicit exclusion needed.
- Also added 5e-2024 "Craft:" parity: `TOOLKITS[].produkcjaEntries` (kowala only, so
  far) renders the Produkcja line as `@UUID[]{}` content-links (icon + click-through)
  instead of plain text, matching stock tools like Smith's Tools. Link targets:
  existing armor items (Hełm, Tarcza, the 4 zbroja śmieciowa tiers) via
  `createArmors()`, plus placeholder Items (`scripts/config/gear-data.mjs`,
  `createGearPlaceholders()`) for outputs with no real item yet — visibly TODO-flagged
  (hazard icon + banner text), not priced/balanced. "Broń biała" and "naczynia
  metalowe" are categories, not single items, and stay plain text on purpose.
  **Update (2026-09-06, batch 39/40 — see IMPLEMENTATION.md (12)/(14))**: 5 of the
  original 12 graduated out of this placeholder list into real, priced items — Sidła/
  Sprzęt do wspinaczki/Strzały/Wózek into `gear-data.mjs`'s own `REAL_GEAR` table
  (still `loot`, just priced now); Kolczatki further still, into its own file
  (`items/kolczatka.mjs`) since it needed a real deploy Activity, not just stats. The
  remaining 7 (bełty, igły, kłódka, łom, łopata, podkowy, płyty pancerne) are still
  genuinely TODO — a real crafting window is still what they're waiting on, see below.
- `syncToolkitToAllHolders(kitId)` (also on `game.neuroshima`) refreshes an already-
  distributed kit on every actor that holds a copy, not just the Zbrojownia master —
  needed because kits are handed out as independent item copies, not links.
- TODO: repeat `nativeCheck: true` + real produkcja items for the other 21 kits once
  kowala is verified live; retire `toolkit-check.mjs` when the last one graduates.
  A real crafting window (recipes, materials, time) that these placeholder items
  should eventually plug into is separately out of scope — see the TODO banner on
  each placeholder's own description.

### Two distinct dnd5e interactions — do not conflate them

Confirmed against dnd5e source (`base-actor-sheet.mjs`, `inventory.mjs`, `item.mjs`):
left-click and right-click on an inventory row are two SEPARATE, both-stock mechanisms,
not one feature with a bug in it.

- **Left-click the item name** → always `ctx.clickAction = "use"` (unconditional, no
  dnd5e code path ever sets it to anything else) → `Item5e#use()`. If the item has >1
  usable activity, dnd5e ALWAYS shows `ActivityChoiceDialog` first (unless Shift is
  held — the dialog's own footer says so). A single-activity item (Cobbler's Tools)
  skips straight to the chat card, which *feels* like "one click, instantly expanded"
  — that's not a different code path, it's the same path with nothing to choose
  between. Kowala genuinely has 4 actions, so the same click surfaces the chooser.
  This is not a Neuroshima bug and not fixable while keeping "click = use" semantics —
  it's inherent to having more than one real action on one item, same as it would be
  for any stock multi-activity item (verified: no override anywhere in this module's
  code changes that behavior).
- **Right-click the row → "Expand"** → toggles `item-description` open INLINE in the
  sheet — every activity listed as its own clickable line (`data-action="activity-use"`
  → calls `activity.use()` directly, no chooser, no ambiguity). Verified working for
  kowala by forcing `app.expandedSections` and re-rendering: all 4 named activities
  render correctly. Untouched by any of this session's changes.

Open question, not yet decided: should plain left-click on a multi-action kit roll the
generic "Test narzędzi" directly (no dialog), pushing the 3 named ST actions to
right-click→Expand only? That would be a deliberate departure from stock (stock always
dialogs on >1 activity, full stop) — worth a decision, not a default assumption.

### Chat-card body was repeating the full item description per click (fixed for kowala)

dnd5e's chat card body comes from `ItemDataModel#getCardData()`: `description.chat ||
description.value`, evaluated ONCE from the ITEM (not per-activity) regardless of which
activity fired — confirmed in `getCardData()` and `_usageChatContext()`, `activity` is
only used for roll data/labels, never for picking body text. Cobbler's Tools *looks*
action-specific only because it has one activity and a naturally short description;
with kowala's long reference description (Używanie list + Produkcja links + special
note) and 4 activities sharing it, every click showed the same big blob.

Fix (kowala, `nativeCheck` kits only): `system.description.chat` now holds a short
one-line blurb (just the Cecha line) instead of the full reference text — dnd5e prefers
`.chat` over `.value` for the card body, `.value` still shows in full on the item sheet.
Separately, each activity now sets `description.chatFlavor` (→ card SUBTITLE, per
`ActivityMixin#_usageChatContext`: `this.description.chatFlavor || data.subtitle`), so
the card visibly names which action fired (e.g. "Naostrzenie broni (ST 10)") instead of
the generic "Narzędzia" tool-type label. Both are native dnd5e fields, not custom UI.

### "Naostrzenie broni" / "Naprawa zdegradowanej broni białej" — real mechanics

Both actions act on a weapon from the smith's OWN inventory and needed: (a) picking
WHICH weapon, (b) blocking the roll early when nothing qualifies, (c) applying the
actual effect only on a successful check. Implemented as a generic extension point on
`NeuroToolCheckActivity` (`items/toolkit-check-activity.mjs`) rather than anything
kowala-specific, so a future kit's action can reuse the same machinery:

- **`registerCheckGate(key, { canUse, run })`** — an activity opts in via
  `flags.<module>.checkGate = "<key>"` (set from a `gate` key on its `ToolkitAction`
  entry in `toolkits-data.mjs`).
  - `gate.canUse(activity)` is wired into the activity's own `canUse` getter. Since
    `ActivityChoiceDialog` filters on `a.canUse` and stock `use()` checks it too before
    anything happens, an action with nothing eligible to act on simply **disappears
    from the item-choice list** (and blocks a bare single-activity item click) —
    before any chat card, before any roll. This is the "gate on the character sheet"
    the design asked for, and it came for free from overriding one getter.
  - `gate.run(activity)` runs inside an overridden `use()`, ahead of `super.use()`. It
    can await an async picker dialog, then return `false` (already warned; `use()`
    aborts — no card, no roll) or a partial `message` config to merge in.
- **`items/toolkit-kowal.mjs`** registers both gates:
  - eligibility: sharpenable = melee "biala", slashing or piercing base damage type
    (bludgeoning weapons can't be "sharpened" — narrower than the generic `naostrzenie`
    addon's own `isAddonCompatible`, which only demands `biala`), not currently
    degraded, and not already carrying the `naostrzenie` addon; repairable = melee
    "biala" currently degraded (`melee-degradation.mjs`'s own state).
  - exactly one candidate → auto-picked, no dialog; more than one → a `DialogV2.prompt`
    `<select>` picker, same shape as the "Wytrącenie" held-item picker in
    `combat/melee-maneuvers.mjs`; the chosen weapon's UUID is stashed as a flag on the
    usage chat card (`kowalaAction` / `kowalaWeapon`) — that card is the one document
    shared between `use()` (now) and the later roll-button click.
- **Outcome**: `NeuroToolCheckActivity.rollCheck` (already the owner-resolving
  override) now captures each roll and fires `neuroshima.toolCheckRolled` with the
  usage card, letting `toolkit-kowal.mjs` read its own flags back off it and decide:
  `roll.isSuccess` → sharpen (`installAddonById(weapon, "naostrzenie")`, a new
  `weapons/addons.mjs` export — same validation/rollback/chat/hook path as buying the
  upgrade via a loot item, just without one to consume) or repair
  (`repairWeapon(weapon, {chat:true})`, already existing); failure → a plain "Bez
  skutku" note naming the weapon, since the stock roll card never mentions it.
- Verified live end-to-end via Chrome CDP against the Zbrojownia master and real
  actors: degrade → `canUse` flips true → single-candidate auto-pick → success →
  denomination restored + chat card; multi-candidate picker (stubbed `DialogV2.prompt`,
  confirmed the offered `<option>` list) → naostrzenie installed with correct
  attack/damage bonus + chat card; zero-eligible → blocked with a warning and **no**
  chat message created at all; failed roll → no mutation, "Bez skutku" card. Full
  Quench suite (130/130) still green after.
