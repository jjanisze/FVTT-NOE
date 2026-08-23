# PLAN — Custom Character Sheet Shell (§1.15)

> Status: **not started.** This file is a pre-dig, not a design — it exists so whoever picks up
> §1.15 spends their first hour building instead of re-deriving the facts below. Everything here
> was verified live against the actual files on 2026-08-21 (dnd5e 5.3.0/5.3.2, FVTT 14.360).
> If you're reading this much later, spot-check the line numbers before trusting them — dnd5e
> updates will move things.

## 1. What §1.15 actually asks for

From `IMPLEMENTATION.md`, three unchecked bullets, verbatim:

```
### 1.15 Custom Character Sheet Shell
- [ ] Ukrycie/usunięcie elementów fantasy (spellbook, pact magic, etc.)
- [ ] Sekcja Zranienie + Wyczerpanie na głównej karcie
- [ ] Neuroshima-specific layout
```

Read literally these look small, but bullet 3 is the real scope question — see §4.

## 2. The decision this task hinges on

The module has never subclassed a dnd5e sheet. Everything so far (ammo/magazine/grenade/surowce
panels, health panel, PD panel, ability hotbar, Fuks pips, Zranienie pips, addons panel — 15
files, full list in §3) is **hook + DOM injection + CSS** into the *stock* `CharacterActorSheet`.
`DEV_GUIDE.md` §3.3 names three tiers of ambition — Lekkie (what exists today), Średnie (extend
`ActorSheet5e`-family with custom tabs), Ciężkie (own sheet class, own templates). §1.15 has sat
unchecked through every phase specifically because it's the first task that has to pick a tier
on purpose instead of bolting one more panel onto the pile.

**This is a real design decision, not something to inherit silently — make it explicitly, state
it in your PR/commit, and update this file's §2 with what you chose and why.** Two live options,
both technically sound given what's in §4:

- **(A) Keep injecting, more aggressively.** Continue the established pattern: hide more, inject
  more consolidated panels, reorder via CSS `order`/flex, leave `CharacterActorSheet` itself
  untouched. Lowest risk (nothing else in the module has ever needed to know sheet internals
  beyond selectors), consistent with 15 existing files, but caps out at what CSS reordering and
  DOM injection can express — you can't cheaply remove a native tab's *cost* (it still renders),
  only hide it.
- **(B) Subclass `CharacterActorSheet`/`NPCActorSheet`.** Register your own class via
  `DocumentSheetConfig.registerSheet` (see §4.2 for the exact call dnd5e itself uses), override
  `PARTS`/`TABS` to actually drop tabs (not just hide them) and splice in Neuroshima tabs/parts.
  More powerful, more maintenance surface, and every one of the 15 existing injection hooks
  (`renderCharacterActorSheet` etc.) still fires the same way against a subclass — they don't
  need to change, but *verify that live* before assuming it, don't take this file's word for it.

Whichever you pick, `ARCHITECTURE.md`'s core principle still applies: **mutate, don't replace.**
That doc's specific warning is about `CONFIG.DND5E` object identity, but the same failure mode
(stale references, dropped functionality) is exactly what's at stake if you register a
sheet class carelessly — the existing panels' selectors assume specific DOM structure exists.

### DECIDED (2026-08-22): (C) Hybrid — subclass owns the frame, injection owns the content

Neither (A) nor (B) as written. The subclass exists but is deliberately anaemic: it declares
`PARTS` and `TABS` and nothing else — no `_prepareContext`, no `_onRender`, no template of its
own beyond an empty `tab-zasoby.hbs` shell. Everything visible still arrives through
`renderCharacterActorSheet`/`renderNPCActorSheet`, same as the other 15 files.

Why: the three §1.15 bullets split cleanly along that line. *Dropping* the spells and bastion tabs
is the one thing (A) genuinely cannot do — hiding a tab still pays its render cost and still
leaves it reachable — and `PARTS`/`TABS` is a two-line override. But consolidating Zranienie +
Wyczerpanie is pure DOM work over data three other files already own, and moving the four resource
panels into a Zasoby tab is a `appendChild` loop. Doing those as sheet-class code would mean
`_prepareContext` re-deriving state that `levelled-conditions.mjs` already derives, and rewriting
four working injectors to render into a template instead. Injection costs nothing there.

What that buys: the maintenance surface (B) warns about stays at ~15 lines of subclass. dnd5e can
add, rename or restructure any part and we inherit it, because `PARTS` is copied key-by-key rather
than retyped (this already paid off — the real `CharacterActorSheet.PARTS` has a `warnings` part
that §4.2's map below doesn't mention). Verified live: all 15 injection hooks fire unchanged
against the subclass, and every remaining tab renders.

One thing §4.2 doesn't say and cost real time: **register in `ready`, not `init` or `setup`.**
`DocumentSheetConfig.registerSheet` queues anything registered before `game.ready` into a private
pending list and only flushes it into `CONFIG.Actor.sheetClasses` at ready. dnd5e registers its own
sheets in `init`, so at `setup` the registry is still empty — reading the base class out of it
returns `null` and the shell silently no-ops.

## 3. Every existing sheet-injection point — re-verify, don't trust this list

15 files hook `renderActorSheet`/`renderCharacterActorSheet`/`renderNPCActorSheet` today. This
list was current 2026-08-21; **re-run the grep below before you start** — this exact audit found
two files (`surowce-inventory.mjs`, `zbrojownia-sync.mjs`) that existed, were fully wired, and
had no line in `IMPLEMENTATION.md`'s file table until this pass. Trust the code, not any doc.

```bash
grep -rln "renderActorSheet\|renderCharacterActorSheet\|renderNPCActorSheet" scripts/
```

As of this writing:

| File | What it injects | DOM anchor it depends on |
|---|---|---|
| `combat/zranienie.mjs` | Zranienie pips on NPC sheet | `renderNPCActorSheet`, portrait column |
| `actors/fuks-pips.mjs` | 3 Fuks clovers replacing Inspiration star | `.sheet-header .right`, `.level-badge`, removes `button.inspiration` |
| `actors/health-panel.mjs` | Choroby/Fobie panel + sidebar status bar | Biography tab, sidebar |
| `actors/pd-panel.mjs` | PD/XP tracker | (check live — native XP bar is hidden per §4.1) |
| `actors/class-rules.mjs` | Multiclass exclusivity warnings | — |
| `actors/ammo-inventory.mjs`, `magazine-inventory.mjs`, `grenade-inventory.mjs`, `surowce-inventory.mjs` | Custom inventory sub-panels (ammo/magazines/grenades/raw materials), native rows hidden to avoid duplication | Inventory tab |
| `actors/addons-inventory.mjs` | Weapon-addon panel on weapon item sheets, context menu on loot | Item sheet, not actor sheet |
| `actors/zbrojownia-sync.mjs` | GM "sync armory" button | Sheet header |
| `actors/sheet-position-stability.mjs` | Snapshots/restores scroll position around the +/- clicks above | Whole sheet — **this one exists purely to patch a side effect of the injection approach**; if you move to a real sheet class (option B), check whether its problem still exists before porting it |
| `config/srd-cleanup.mjs` | Hides fantasy classes/spells/races from pickers | Sheet + compendium browser |

Ability hotbar (`actors/ability-hotbar.mjs`) also renders on-sheet UI (charge counters, active-state
art) but is driven off a different hook family — check it separately, it didn't match the grep above.

## 4. The actual dnd5e sheet, mapped

### 4.1 Classes, registration, files

- `CharacterActorSheet extends BaseActorSheet` — `dnd5e.mjs:57666` (compiled bundle,
  `C:\Users\archo\AppData\Local\FoundryVTT\Data\systems\dnd5e\dnd5e.mjs`; NPC equivalent is
  `NPCActorSheet`, same file, search `class NPCActorSheet`). Both are ApplicationV2 +
  `HandlebarsApplicationMixin` — no jQuery, no single monolithic `.hbs`, the sheet is assembled
  from named `PARTS`.
- Registration (also in `dnd5e.mjs`, search `DocumentSheetConfig.registerSheet`):
  ```js
  DocumentSheetConfig.unregisterSheet(Actor, "core", foundry.appv1.sheets.ActorSheet);
  DocumentSheetConfig.registerSheet(Actor, "dnd5e", CharacterActorSheet, { types: ["character"], makeDefault: true, ... });
  DocumentSheetConfig.registerSheet(Actor, "dnd5e", NPCActorSheet, { types: ["npc"], makeDefault: true, ... });
  ```
  A module-owned sheet would call the same API with `"neuroshima-2026-overrides"` as the scope
  id and `makeDefault: true`, ideally in `ready` (after dnd5e's own registration in `init`/`setup`)
  so it wins as the default without needing per-world manual sheet selection.

### 4.2 `CharacterActorSheet.PARTS` (the tab map)

```js
static PARTS = {
  header:   { template: "systems/dnd5e/templates/actors/character-header.hbs" },
  sidebar:  { template: "systems/dnd5e/templates/actors/character-sidebar.hbs" },
  details:  { template: "systems/dnd5e/templates/actors/tabs/character-details.hbs" },
  inventory:{ template: "systems/dnd5e/templates/actors/tabs/character-inventory.hbs" },
  features: { template: "systems/dnd5e/templates/actors/tabs/character-features.hbs" },
  spells:   { template: "systems/dnd5e/templates/actors/tabs/creature-spells.hbs" },
  effects:  { template: "systems/dnd5e/templates/actors/tabs/actor-effects.hbs" },
  biography:{ template: "systems/dnd5e/templates/actors/tabs/character-biography.hbs" },
  bastion:  { template: "systems/dnd5e/templates/actors/tabs/character-bastion.hbs" },
  specialTraits: { template: "systems/dnd5e/templates/actors/tabs/creature-special-traits.hbs" },
  abilityScores: { template: "systems/dnd5e/templates/actors/character-ability-scores.hbs" },
  tabs:     { template: "systems/dnd5e/templates/shared/sidebar-tabs.hbs" }
};

static TABS = [
  { tab: "details", label: "DND5E.Details", icon: "fas fa-cog" },
  { tab: "inventory", label: "DND5E.Inventory", svg: ".../backpack.svg" },
  { tab: "features", label: "DND5E.Features", icon: "fas fa-list" },
  { tab: "spells", label: "TYPES.Item.spellPl", icon: "fas fa-book" },
  { tab: "effects", label: "DND5E.Effects", icon: "fas fa-bolt" },
  { tab: "biography", label: "DND5E.Biography", icon: "fas fa-feather" },
  { tab: "bastion", label: "DND5E.Bastion.Label", icon: "fas fa-chess-rook", condition: this.hasBastion },
  { tab: "specialTraits", label: "DND5E.SpecialTraits", icon: "fas fa-star" }
];
```

`abilityScores` and the `tabs` nav strip are separate parts, not nested inside `details` — if you
reorder/rename tabs you touch `TABS`, if you change tab *content* you touch `PARTS[tabName].template`
(you can point it at your own `.hbs` under this module and keep everything else of the class).

### 4.3 The spells tab and the bastion tab are not equally dead weight

- **Spells tab**: already hidden via CSS (`.dnd5e2.character .tab[data-tab="spells"] { display:
  none !important }`, `neuroshima.css` line ~19) — the DOM still renders, just invisible. Fine
  for a CSS-only approach; if you go with option B (subclass), you can drop it from `TABS`/`PARTS`
  entirely and skip the wasted render.
- **Bastion tab**: `TABS` gates it behind `condition: this.hasBastion`, which is
  `game.settings.get("dnd5e", "bastionConfiguration")?.enabled && actor.level >= threshold`
  (`dnd5e.mjs:58992`). **Check that world setting live before writing any code for this** — if
  it's already off, bastion never renders and there's nothing to hide. Don't assume from the
  absence of a CSS rule that this is unhandled; it may already be a non-issue.

### 4.4 Root templates worth reading before you touch anything

All under `C:\Users\archo\AppData\Local\FoundryVTT\Data\systems\dnd5e\templates\actors\`:
`character-header.hbs` (portrait/name/HP/AC/inspiration strip — this is where Fuks pips and
Zranienie currently attach), `character-sidebar.hbs` (abilities/skills column),
`character-ability-scores.hbs`, and `tabs/*.hbs` per tab (`character-details.hbs`,
`character-inventory.hbs`, `character-features.hbs`, `character-biography.hbs`,
`character-bastion.hbs`, `actor-effects.hbs`, `creature-spells.hbs`,
`creature-special-traits.hbs`). NPC equivalents live alongside with `npc-*`/`creature-*` prefixes
— diff against these, don't assume parity.

## 5. CSS reality

`styles/neuroshima.css` is **1365 lines**, structured with `/* === Section === */` comment
headers — `grep -n "^/\* ===" styles/neuroshima.css` gives you the map in one shot, faster than
reading top to bottom. Confirmed already hidden: spellbook tab, spell-related create-item options,
pact magic/slots, concentration indicator (lines ~14-48). **Not yet touched**: bastion (see §4.3
— verify the setting before assuming it needs touching), rarity/mastery/magical-bonus fields on
non-weapon items (some already hidden for weapons specifically, check whether that needs
extending to armor once armor handling lands — Phase 2, not this task, but adjacent).

**Mandatory**: run `npm run validate:css` (= `node dev/validate-css.mjs`) after every manual edit
to this file. It catches a structural-corruption class of bug — orphaned declarations after a
misplaced brace — that produces **zero console errors** and just silently drops every rule after
the break point from `document.styleSheets`. This has bitten this module before; the check costs
one command.

## 6. Process notes inherited from the rest of the module

- **Hook timing**: `CONFIG.DND5E` mutations belong in `setup`/`i18nInit`, not `init` (language
  packs overwrite `init`-time changes) — `ARCHITECTURE.md` §1. Sheet *registration* is
  conventionally `init` in dnd5e itself, but this module's existing `Hooks.once("ready", …)` block
  in `main.mjs` is where `game.neuroshima.*` API surface gets assembled — follow that pattern if
  you add new API surface for the shell.
- **Mutate, don't replace** — same principle as `CONFIG.DND5E.weaponTypes`, applies to `PARTS`/
  `TABS` if you subclass: prefer `{ ...Base.PARTS, myTab: {...} }` over hand-retyping the whole
  object, so you don't silently drop a dnd5e part a future dnd5e update adds.
- **Live verification is how this module ships.** Every "live-verified" note in
  `IMPLEMENTATION.md` means someone actually opened the sheet via `chrome-devtools` MCP (attached
  to the user's real running Foundry, port 9222 — see this repo's `.mcp.json` and the top-level
  `CLAUDE.md` for the connection details and the "port not fixed, detect by title" rule) and
  checked the DOM/console, not just read the code. Do the same before calling this done — take
  screenshots of before/after for at least one character and one NPC sheet.
- **`Foundry musi być zamknięte`** only applies to compendium/pack builds (LevelDB single-writer).
  Sheet work is live-reloadable — edit, `F5` in the browser tab, done. Ask the user to refresh;
  you don't have a way to trigger it yourself.
- Two dead-code lessons from this same day's cleanup, worth internalizing: (1) `scripts/main.js`
  (a duplicate, unregistered entry point) sat next to the real `scripts/main.mjs` for who knows
  how long, silently not running. (2) `scripts/weapons/icons.js` was only ever imported by that
  dead file — deleted in v0.13.0, once it turned out its job was already done properly by
  `config/weapons.mjs` and `config/ammo-data.mjs`. **If you add a new file, confirm it's actually
  imported from `scripts/main.mjs` and actually registered in a hook — don't trust that a file
  existing means it runs.**

## 7. Suggested scope split (not a mandate — re-derive if the codebase has moved)

1. **Decide + declare** the tier (§2) before writing code.
2. Zranienie + Wyczerpanie section: today Zranienie lives as pips near the portrait
   (`zranienie.mjs`, NPC-only per the file table's note — verify character sheet coverage too,
   the file table only explicitly mentions `renderNPCActorSheet`) and Wyczerpanie is entirely
   native dnd5e pips with Neuroshima's flat -2/-1.5m math (`config/exhaustion.mjs`). "Sekcja" in
   the ask implies these two get a shared, visually unified home rather than living in two
   unrelated corners of the sheet — that's a real design call, not just CSS.
3. Fantasy removal: audit against a **live sheet**, not just this doc — grep CSS for what's hidden,
   then open both a character and an NPC sheet via `chrome-devtools` and look for anything that
   still reads as D&D (spell slots on NPC stat blocks render differently than PC spell tabs,
   worth checking separately).
4. Layout: this is where the tier decision (§2) actually pays off or costs you. Write down what
   "Neuroshima-specific layout" means concretely (tab order? renamed labels? consolidated
   inventory sub-panels into fewer tabs? something structurally different from stock dnd5e?)
   before touching code — IMPLEMENTATION.md's bullet is deliberately vague and shouldn't be
   treated as a spec.

Update `IMPLEMENTATION.md` §1.15 checkboxes and add a `## Changelog` entry (see existing entries
for the expected format/depth) when done — that's how every other feature in this module got
tracked, and it's what made this pre-dig possible in the first place.
