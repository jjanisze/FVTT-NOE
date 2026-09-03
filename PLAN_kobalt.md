# PLAN — Kolor Kobaltu (world-level toggle)

Status: **IMPLEMENTED**. Player/GM-facing rule catalog lives in [`docs/Kobalt.md`](docs/Kobalt.md)
(Polish, canonical list of what Kobalt changes) — this file is the dev-side "how it's wired"
companion, same split as every other `PLAN_*.md` vs. `docs/*.md` pair in this repo.

- ✅ `scripts/config/settings.mjs` — `kobaltEnabled` world setting (default `true`) +
  `isKobaltEnabled()` helper.
- ✅ `scripts/items/latarka.mjs` — rule 6: `_light()` forks `LIGHT_RAW`/`LIGHT_KOBALT` (1/3
  range, angles unchanged); `_descriptionTail()` keeps flavor text in sync; `updateSetting` hook
  re-syncs every actor's light on toggle flip.
- ✅ `scripts/weapons/pochodnia.mjs` — rule 3: `refuelTorch` + `REFUEL_ID` utility Activity
  ("Dolej paliwo (1 kg CH)"), backed by `_consumeKgOfSurowiec` (weight-based CH consumption,
  spans multiple stacks if needed). Ships unconditionally per decision 1.
- ✅ Rules 1, 2, 4, 5 confirmed unconditional/already-shipped, no code changes needed.
- ⏭ Not done: rule 1's "produkcja bez wymagań z CH+MK" crafting action (still manual —
  `docs/Kobalt.md` marks it 🚧). Out of scope for this pass; the general crafting system it would
  anticipate doesn't exist yet either (see `docs/Zmiany-wzgledem-dnd5e.md`'s "czego świadomie nie
  ma" list).

## Goal

Give the GM a single world setting, **on by default**, that turns a family of home-rule
divergences from RAW on/off together. Unlike the book's own Kolory (Rdza/Stal/Rtęć/Chrom — see
`neuroshima_5e_modifications.md` §11), which are mutually exclusive campaign-start profiles,
Kobalt is explicitly **stackable with any of them** — it patches specific mechanics that are
either untested or don't hold up on a VTT, not a whole-campaign tone dial. Assumption from the
GM: 80%+ of tables will play with it on, so the *build effort*, not just the default value,
should favor the Kobalt path over the RAW fallback.

## Decisions (LOCKED — from GM)

1. **Pochodnia ships unconditionally**, regardless of the `kobaltEnabled` toggle — no separate
   simplified RAW torch gets built. There is no meaningful non-Kobalt fallback to build toward. ✓
2. **Refuel (rule 3) is a full refill to 100%** per 1 kg CH — no partial/variant-scaled amount. ✓
3. **Ignition cost (rule 4, 10% fuel) stays unconditional**, applying even in a hypothetical RAW
   mode — treat it as baseline torch behavior, not something to gate behind the toggle. ✓
4. **Latarka cone angles (45°/90°) stay fixed** — Kobalt only shrinks `bright`/`dim` distance to
   1/3, never `angle`/`narrowAngle`. ✓

## Core decision: one boolean, not a color-profile system

Reuse the exact shape `forsowanieEnabled` already established in `combat/rerolls.mjs`:

```js
game.settings.register(MODULE_ID, "kobaltEnabled", {
  name: "Kolor Kobaltu",
  hint: "Włącza zestaw domowych poprawek zasad — zob. docs/Kobalt.md. Można łączyć z dowolnym innym Kolorem.",
  scope: "world",
  config: true,
  type: Boolean,
  default: true,
});
```

Register it in `scripts/config/settings.mjs` (already the one settings module) next to
`weaponSoundVolume`. `scope: "world"` (not `client`) because it changes shared mechanics — light
radius, item stats — the same table has to agree on, exactly like `forsowanieEnabled`'s own
choice.

**Deliberately not building** a generic "selected Kolor" enum/rules-engine that Kobalt would be
one entry in. Two reasons, not just "not needed yet":

1. The other four Kolory are undeveloped by design (§11 of `neuroshima_5e_modifications.md`
   explicitly defers them to prose, not code) — there's no second concrete case to generalize
   from, so any abstraction now is a guess. If/when one of them gets real code, extract the
   shared shape from two real examples then, in its own `PLAN_kolory.md`.
2. Kobalt is explicitly *not* exclusive with the others — modeling it as a member of a
   single-select Kolor enum would be actively wrong, not just premature, since the whole point is
   that it stacks.

Expose a thin `isKobaltEnabled()` helper from `scripts/config/settings.mjs` (wraps
`game.settings.get`) for other files to import — worth centralizing here specifically because,
unlike `forsowanieEnabled` (one call site in `rerolls.mjs`), Kobalt will be checked from at least
`weapons/pochodnia.mjs` and `items/latarka.mjs`, likely more later.

## Where it forks: inline at point of use, not parallel systems

Per rule, branch with `isKobaltEnabled() ? kobaltValue : rawValue` right where the value is
consumed — no forked files, no strategy pattern. The RAW branch is allowed to be materially
simpler than the Kobalt branch (e.g., no fuel-percentage tracking at all) — that asymmetry is the
80/20 effort split the GM asked for, not a shortcut to fix later.

## Per-rule status and plan

### 1–2. Pochodnia improwizowana / smołowa — mostly already built, pre-dates the name "Kobalt"

`scripts/weapons/pochodnia.mjs`'s `POCHODNIA_VARIANTS` already matches the described stats
exactly (improwizowana: 0 gp, heavier, dimmer, 30 min burn; smołowa: 8 gp purchase-only, lighter,
brighter, 90 min burn; both 1k4 obuchowe + 1 ogień when lit, 360° light). This is the Kobalt
ruleset for these two items, built before the concept had a name — no code change needed for the
stats themselves.

Per decision 1 (locked above): Pochodnia ships unconditionally regardless of the Kobalt toggle —
the file's own doc comment already explains why (stock SRD Torch is broken: bogus 40 ft
attack-template AOE). Nothing to build here beyond documenting this in `docs/Kobalt.md`.

### 3. Refuel via 1 kg CH — ✅ built

New "Dolej paliwo (1 kg CH)" utility Activity (`REFUEL_ID`), same activity-provisioning shape as
`latarka.mjs`'s `insertBattery`/`INSERT_ID`. Differs from that precedent in one way, deliberately:
surowce stacks aren't guaranteed to be exactly 1 kg/unit (no catalog/build-script defines them —
they're GM-created loot items), so instead of decrementing one whole unit like `insertBattery`
does for Baterie, `_consumeKgOfSurowiec(actor, "CH", REFUEL_CH_KG)` computes real kilograms via
the same per-unit-weight × quantity math `actors/surowce-inventory.mjs` uses for its panel
totals, and can spend a fractional slice of a stack (or span several stacks) to reach exactly
1 kg. Per decision 2 (locked above): always a full refill to 100%, no partial-amount branching.
Blocked on a Wypalona Pochodnia (`isBurnt`) and when already at 100% (checked both in
`onPreUseActivity`, matching the Zapal/Zgaś gating style, and again inside `refuelTorch` itself).
Works while lit — re-banks the burn-out schedule against a full tank, same math `igniteTorch`
already uses.

### 4. Ignition costs 10% fuel — already built, currently unconditional

`IGNITE_COST_PCT = 10` in `pochodnia.mjs` already matches this exactly. Per decision 3 (locked
above): leave it exactly as-is, unconditional — no toggle-gating to add here.

### 5. Starting-inventory headlamps → Latarka/Pochodnia — already done

`latarka.mjs`'s doc comment confirms this migration already ran live (eight PC headlamps +
Evie's "Latarka taktyczna"). Going forward this is a Zbrojownia/character-creation starting-gear
concern, not a runtime rule with an in-fiction mechanical effect — no code currently branches on
it, and it plausibly doesn't need to. Flag for the GM: does the Zbrojownia's starter-kit template
still reference the old headlamp placeholder anywhere and need a follow-up pass?

### 6. Latarka range cut to 1/3 — ✅ built

`LIGHT_RAW`/`LIGHT_KOBALT` replace the old flat `LIGHT` constant; `_light()` picks between them
via `isKobaltEnabled()`. Kobalt → `{ bright: 15, dim: 60, angle: 90, narrowAngle: 45 }` (1/3 of
45/180, distance only); RAW → unchanged `{ bright: 45, dim: 180, angle: 90, narrowAngle: 45 }`.
Cone angles never change, per decision 4. Single consuming call site (`_latarkaLightProvider`).

`COMMON_DESCRIPTION_TAIL` became `_descriptionTail()`, reading the same `_light()` so the item's
flavor text always states the range that's actually active — computed fresh at item creation/
initialization time, same as the rest of the catalog data (not live-reactive after that point;
see its own doc comment for why that asymmetry is acceptable — cosmetic drift only).

Mid-campaign toggle flips: `registerLatarka()` now has an `updateSetting` hook keyed on
`${MODULE_ID}.kobaltEnabled` that re-syncs every actor's light the moment the GM flips the
setting, on every client — no prior precedent existed in this module for a "re-apply to
everything on setting change" sweep, so this is the first of its kind here, built directly off
`Setting`'s document-update hook rather than a bespoke pattern.

## Catalog-drift check (project has been burned by this before) — confirmed clean

Rules 3 and 6 both touch data that's baked into a *catalog* shape
(`POCHODNIA_VARIANTS`, `LIGHT`) — this project has hit the "editing catalog data doesn't reach
already-issued copies" trap before (audited/repaired via `game.neuroshima.auditWeapons()` /
`repairWeapons()`). Confirmed, not assumed, both are clean:

- Latarka's light values are read live via `_light()` every time `_latarkaLightProvider` runs —
  never copied onto the item at creation — so rule 6 is copy-drift-immune by construction. The
  `updateSetting` hook exists purely to *push* that already-correct live value onto tokens the
  moment the toggle flips; the light-value logic itself needed no migration.
- Pochodnia's refuel amount (rule 3) is a formula (`REFUEL_CH_KG` → full refill) applied at
  use-time inside `refuelTorch`, not a per-item baked value — every existing Pochodnia in the
  field gets the new Activity via the same `createItem`/backfill sweep (`ensurePochodniaActivities`)
  that already handles Zapal/Zgaś, no separate migration pass required.

## Remaining open item

Rule 1's "wyprodukuj bez wymagań z CH+MK" crafting action is still manual (mark the item flags by
hand) — deliberately out of scope for this pass. It anticipates a general crafting system
(schematy/produkcja/szabrowanie) this module doesn't have yet at all (see
`docs/Zmiany-wzgledem-dnd5e.md`'s "czego świadomie nie ma" list) — worth building as part of that
system, whenever it happens, rather than as a one-off special case here.
