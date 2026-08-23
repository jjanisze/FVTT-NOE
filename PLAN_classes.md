# PLAN — Klasy, Profesje i Zdolności Klasowe

Status: **in progress** (started 2026-07-30)
Replaces stock dnd5e class layer entirely. Phase 3 of `IMPLEMENTATION.md` ("Progression Layer").

Scope agreed with GM:

| In scope | Out of scope (this pass) |
|---|---|
| 6 klas × 12 poziomów | 12 Pochodzeń (origins) |
| 18 profesji (subklasy) | Sztuczki — content only; **structure is wired** |
| Panel PD / XP | Drony (Spec/Monter) |
| Migracja 22 istniejących postaci | Wieloklasowość UI (rules enforced, no wizard) |
| Usunięcie pozostałości SRD | |

---

## 0. Why not the existing `abilities.mjs` prototype

`scripts/actors/abilities.mjs` was a flag-based resolver for 7 weapon-adjacent abilities
(`Jak Dbasz Tak Masz`, `Wychuchana spluwa`, `Grad ołowiu`, `Ruchome gniazdo CKM`, `Szturmowiec`, …).
It is consumed by `fire-modes.mjs`, `jams.mjs` and `magazine.mjs` via `hasAbility(actor, KEY)`.

It stays — but demoted to a **compatibility shim**. See §8. Nothing that already calls
`hasAbility()` needs to change; the resolver's source of truth becomes a real item on the actor.

Rationale for going native instead of extending the prototype: the prototype cannot express
level scaling, uses/recovery, advancement choices, compendium reuse, NPC reuse, or the
level-up dialog. All of those are required here and all are free with native documents.

> **Done (v0.12.0)**: the flag layer and its actor-sheet panel are gone. All 7 keys resolve
> from items; see §8.

---

## 1. Document model

| Neuroshima concept | FVTT/dnd5e document | Notes |
|---|---|---|
| Klasa (Brutal…) | `Item` type `class` | `system.identifier` = `brutal`, `cwaniak`, `spec`, `twardziel`, `zlodziej`, `zwiadowca` |
| Profesja (Ganger…) | `Item` type `subclass` | `system.classIdentifier` points at parent class |
| Zdolność klasowa | `Item` type `feat` | `system.type.value = "class"`, `subtype` = class identifier |
| Zdolność z profesji | `Item` type `feat` | `system.type.value = "class"`, `subtype` = profession identifier |
| Sztuczka | `Item` type `feat` | `system.type.value = "feat"` — **pack created empty**, filled later |
| Kość Wytrzymałości (KW) | `system.hd.denomination` | k8 (Brutal/Twardziel/Zwiadowca) / k6 (Cwaniak/Spec/Złodziej) |
| Skalujące kolumny tabel | `ScaleValue` advancement | `@scale.<classId>.<valueId>` in formulas |

### 1.1 Compendium packs (new, in `module.json`)

```
neuroshima.klasy               Item   6      klasy
neuroshima.profesje            Item   18     subklasy
neuroshima.zdolnosci-klasowe   Item   137    76 klasowych + 61 z profesji
neuroshima.sztuczki            Item   0      EMPTY — wired into ItemChoice, filled later
```

Packs are built by `dev/packs/build-packs.mjs` from the two data modules (§2), written
via `foundry.utils.ClassicLevel` pack compilation. Source-of-truth is the `.mjs` data
files in `scripts/config/`, **not** the LevelDB — packs are a build artifact and are
regenerated, never hand-edited.

---

## 2. Data modules

### `scripts/config/classes-data.mjs`
Per class: identifier, label, HD, PW formula, save proficiencies, skill choices (n of list),
weapon/armor/tool proficiencies, starting equipment, scale values, and a per-level grant table.

### `scripts/config/class-features-data.mjs`
All 137 abilities, extracted verbatim from the rulebook (`Podrecznik/source.txt`) — full
Polish text, action tag, and the automation metadata the engine needs:

```js
{
  id: "berserk",
  klasa: "brutal",
  level: 1,
  label: "Berserk",
  action: "B",                      // A | B | R | null(passive)
  text: "W Akcji Bonusowej możesz wpaść w Berserk. …",
  uses: { max: "@scale.brutal.berserki", period: "lr" },
  toggle: {                         // §6 — stateful abilities only
    effect: "neuro-berserk",
    duration: { rounds: 10 },
    breaksOn: ["unconscious", "incapacitated", "charmed"]
  },
  hotbar: true                      // §5 — gets a macro
}
```

Extraction provenance: `POZIOM <n>: <NAZWA> [<A|B|R>]` headings out of the PDF text dump.
The `Tabele/Klasy.md` summary had `(?)`/`—` gaps at Brutal 3/5/7/9/11 and Zwiadowca 7/11;
the rulebook text has them (`Szósty zmysł`, `Brutalny cios`, `Szaleńcza szarża`, `Solówa`,
`Paranoja`, `Zabójczy cios`, `Sportowiec`, `Wyczulone zmysły`, `Pogoń`). **`Klasy.md` is not
authoritative for ability lists — `source.txt` is.**

---

## 3. Advancement mapping

Per class item, per level:

| Neuroshima table column | Advancement |
|---|---|
| Zdolności klasowe (fixed) | `ItemGrant` → `neuroshima.zdolnosci-klasowe` |
| "Zdolność z profesji" (poz. 3) | `Subclass` (poz. 3) + `ItemChoice` on the **subclass** |
| "Zdolność z profesji / Sztuczka" | one `ItemChoice` on the **subclass** — see §3.4 |
| "Sztuczka" | `ItemChoice` → `neuroshima.sztuczki` (empty for now; dialog shows no options, does not throw) |
| "Wyjadacz (wybierz jedno)" | `ItemChoice`, `choices: {1: {count: 1}}`, pool = the 4 Wyjadacz variants |
| Berserki / Szczęście / Ulubiona broń / Mój biom | `ScaleValue` type `number` |
| Obrażenia Berserkera / Twardość / Bolesny atak / Kolejka / Łeb jak sklep / Kocie kości | `ScaleValue` type `dice` |
| Mój wróg (`+1/+1k6`) | `ScaleValue` type `string` |
| Biegłości startowe | `Trait` (poz. 1) |
| PB | **none** — derived, see §4.2 |

### 3.1 Profession level exception
Twardziel takes profession abilities at **3 / 7 / 11**; every other class at **3 / 6 / 10**.
Encoded per-class in `classes-data.mjs`, not assumed.

### 3.2 Scale value tables

Taken from the progression tables embedded in the PDF text dump, **not** from
`Tabele/Klasy.md` — see §3.3.

```
brutal.berserki          2 2 2 3 3 3 4 4 4 5 5 5
brutal.obrazeniaBers.    1k6×3 1k8×3 1k10×3 1k12×3
cwaniak.szczescie        1 1 1 2 2 2 3 3 3 4 4 4
cwaniak.motywacja        1k6×4 1k8×4 1k10×4
cwaniak.kolejka          — 1k4×3 1k6×4 1k8×4
spec.lebJakSklep         — 1k4×2 1k6×2 1k8×2 1k10×2 1k12×3
twardziel.twardosc       — — 1k4×3 1k6×3 1k8×3 1k10
twardziel.ulubionaBron   1 1 1 2 2 2 3 3 3 4 4 4
zlodziej.bolesnyAtak     1k6 1k6 2k6 2k6 3k6 3k6 4k6 4k6 5k6 5k6 6k6 6k6
zlodziej.kocieKosci      — 1k4×3 1k6×3 1k8×3 1k10×2
zwiadowca.mojWrog        +1/1k6 ×4, +2/2k6 ×4, +3/3k6 ×4
zwiadowca.mojBiom        2 2 2 3 3 3 4 4 4 5 5 5
```

### 3.3 ⚠ `Tabele/Klasy.md` is not authoritative

The GM's summary table diverges from the rulebook in ways that would ship as wrong
mechanics. Resolved in favour of the PDF progression tables:

| Item | `Klasy.md` | Rulebook table | Impact |
|---|---|---|---|
| Brutal `Berserki` | 1 1 2 2 2 2 3 3 3 4 4 4 | **2 2 2 3 3 3 4 4 4 5 5 5** | Brutal had 1 Berserk at L1 instead of 2 |
| Zwiadowca `Mój wróg` | +1/+1k6 … +4/+1k12 | **+1/1k6, +2/2k6, +3/3k6** | wrong bonus *and* wrong die count |
| Zwiadowca `Mój biom` | 2 2 3 3 4 4 5 5 6 6 7 7 | **2 2 2 3 3 3 4 4 4 5 5 5** | biomes gained at wrong levels |
| Twardziel profession levels | 3 / 6 / 11 | **3 / 7 / 11** | ability offered a level early |
| Cwaniak `Samouk` | poz. 9 | **poz. 9** (table) vs poz. 7 (prose heading) | table wins; prose heading is a PDF typo |
| Cwaniak skill pool | "4 z 12" | **4 z 8** | list only has 8 entries |
| Brutal poz. 3/5/7/9/11 | `(?)` / `—` | Szósty zmysł, Brutalny cios, Szaleńcza szarża + Solówa, Paranoja, Zabójczy cios | 6 abilities were missing entirely |
| Zwiadowca poz. 7/11 | `—` | Sportowiec + Wyczulone zmysły, Pogoń | 3 abilities were missing |

`Klasy.md` was corrected in place on 2026-07-31 and carries a provenance note pointing
back at `classes-data.mjs`.

### 3.4 "Zdolność z profesji / Sztuczka" is ONE pick, not two

At poz. 6 and 10 (poz. 3/7/11 for Twardziel) the table offers a profession ability
**or** a Sztuczka — a single either/or choice. The naive encoding gives the player two
grants: one `ItemChoice` from the class (the Sztuczka) and another from the subclass
(the profession ability).

Resolution: the **subclass owns the choice** at those levels, and `buildClass` emits
nothing for `PROFESJA_LUB_SZTUCZKA`. That subclass `ItemChoice` sets `allowDrops: true`
so a Sztuczka can be dropped in; once `neuroshima.sztuczki` is populated its entries
join the same pool and the either/or becomes a single native dialog.

Levels that grant a profession ability **and** something else use a comma in the
rulebook, not a slash — Twardziel poz. 7 ("Zdolność z profesji, Wyjadacz (2)") really
is two choices, and is encoded as such.

Verified after the fix: every class/level pair offers exactly one choice, except
Twardziel poz. 7, which correctly offers two.

---

## 4. Things dnd5e cannot express natively

### 4.1 PW (hit points) — **needs a module override**
Neuroshima PW is flat per level, not die-average:

| Klasa | poz. 1 | kolejne |
|---|---|---|
| Brutal / Twardziel / Zwiadowca | 16 + mod KON | 4 + mod KON |
| Cwaniak / Spec / Złodziej | 12 + mod KON | 3 + mod KON |

dnd5e's `HitPoints` advancement is hard-wired to hit-die average/roll (d8 → 5), so it
**cannot** produce 16 at level 1. Plan: keep `hd.denomination` for the KW pool (spending
dice on Krótki odpoczynek stays native), but compute `system.attributes.hp.max` in
`scripts/actors/pw.mjs` off the class-level table.

Multiclass rule: the character's **first** level uses that class's L1 value; every other
level uses its own class's per-level value. Formula:
`PW = base(firstClass) + Σ perLevel(class_i) × (levels_i − [i is first]) + totalLevel × modKON`

### 4.2 Premia Biegłości
Neuroshima PB (+2/+2/+2/+2/+3/+3/+3/+3/+4/+4/+4/+4) over 12 levels **matches** dnd5e's
`Math.floor((level+7)/4)` for levels 1–12. No override needed — verified against §19.3
of the rules doc.

### 4.3 Non-stacking multiclass bonuses
Rules: TT bonuses from different classes do not stack (take highest); `Drugi atak` does not
stack. Enforced in `scripts/actors/class-rules.mjs` — a `prepareDerivedData` pass that
de-duplicates the "goła klata"-family TT overrides (`Goła Klata`, `Tarcza wiary`,
`Obłęd Berserkera`) and collapses duplicate `Drugi atak` grants.

---

## 5. Hotbar layer — `scripts/actors/ability-hotbar.mjs`

GM chose the **native FVTT hotbar** over a custom docked bar.

- On `dnd5e.advancementManagerComplete` / `updateItem` (class level change), diff the actor's
  hotbar-eligible abilities (`hotbar: true`) against existing macros and create/remove
  `Macro` documents in the user's hotbar. Idempotent; never clobbers a user-placed macro
  (module writes `flags.neuroshima.abilityId` and only manages its own).
- **Charge badge**: `renderHotbar` hook overlays `●●○` (or `n/max`) on slots whose macro
  carries `flags.neuroshima.abilityId`, read live from the backing item's `system.uses`.
  Greyed at 0.
- **Active-state art**: togglable abilities (§6) swap `macro.img` between
  `icons/abilities/<id>.svg` and `<id>_active.svg` when the state effect goes on/off,
  plus a CSS pulse class on the slot.

This is what makes "rage button showing rages left, with rage/non-rage graphic" work on the
native bar — a plain macro slot renders only a static image, so the badge and art swap are
module-drawn on top.

---

## 6. Stateful abilities — `scripts/actors/class-state.mjs`

Abilities that turn *on* and persist (not one-shot rolls):

| Ability | Class | Duration | Effect |
|---|---|---|---|
| Berserk | Brutal | 10 rund | Ułatwienie SIŁ testy/RO, +TT (mod SIŁ, no armor), extra damage die |
| Kondycha | Twardziel | do końca walki | per rulebook |
| Wychuchana spluwa | (Pochodzenie: Appalachy) | poza walką | pack `zdolnosci-pochodzenia`; toggle per broń w `jams.mjs` |
| Przycelowanie | Twardziel | 1 tura | |

Implementation: a `neuroshima-<id>` ActiveEffect on the actor, with `duration.rounds`, plus
a `combatTurnChange`/`updateCombat` watcher for the "Berserk ends → no action next turn"
tail. Interrupt conditions (`Nieprzytomność`, `Obezwładnienie`, `Zauroczenie`) are watched
via `applyActiveEffect`/status-change hooks.

Ties into existing systems: `zranienie.mjs` (Berserk + 0 PW interaction), Sequencer
(`seqScrollText("BERSERK!")`), and — per the GM's ask — leaves a documented hook point so
per-shot VFX/audio can later fire off an ability being active.

---

## 7. Rest recovery

**No custom code expected.** `config/rest.mjs` already redefines the *durations* of
`restTypes.short` (4h) / `long` (24h) without changing their identity, so native
`uses.recovery[{ period: "sr" | "lr" }]` fires on the Neuroshima rests as-is.

To verify live (§11): Berserki, Szczęście, Kocie kości, Twardość, Motywacja, Łeb jak sklep,
Wściekły cios all restore on Długi odpoczynek; `Kolejka` triggers *during* Krótki odpoczynek.

---

## 8. Legacy `abilities.mjs` bridge

**Done (v0.12.0).** `getResolvedAbility()` reads items only — the flag layer and the actor-sheet
panel that fed it are deleted:

```
class/profession feat  (flags.<mod>.abilityId)
  → Sztuczka           (flags.<mod>.sztuczka)
  → origin ability     (flags.<mod>.originAbilityId)
  → name match on any item   ← last resort, for hand-made feats on migrated PCs
  → none
```

The mapping is declared by the data modules, not by the resolver:

| Prototype key | Real source | Declared in |
|---|---|---|
| `jakDbaszTakMasz` | Twardziel / Żołnierz — `Jak dbasz, tak masz` | `class-features-data.mjs` (`legacyAbilityKey`) |
| `gradOlowiu`, `szturmowiec`, `ruchomeGniazdoCkm` | Sztuczka of the same name | `sztuczki-data.mjs` (`legacyAbilityKeys`) |
| `szybkaWymiana`, `szybkiePrzeladowanie` | Sztuczka `Szybkie palce` — grants both | `sztuczki-data.mjs` (`legacyAbilityKeys`) |
| `wychuchanaSpluwa` | Pochodzenie: Federacja Appalachów (k6 3–4) | `pochodzenia-data.mjs` (`legacyAbilityKey`) |

Existing callers (`fire-modes.mjs`, `jams.mjs`, `magazine.mjs`) kept their `hasAbility()` calls;
only the now-meaningless `{ tokenDocument }` argument was dropped.

The last row is why pack `zdolnosci-pochodzenia` exists ahead of the Pochodzenia pass: one entry,
same entry shape as a Sztuczka, so finishing the other 35 is filling a table.

**Done (v0.13.0).** All 36 are in, and the Pochodzenia themselves ship as 12 `background` items
in pack `pochodzenia` — `AbilityScoreImprovement` (`fixed`, `points: 0`) for the +1/+1, `ItemChoice`
for the ability. Spec poz. 5 finally emits its own `ItemChoice` too; its pool is all 36, because
an advancement cannot narrow a pool down to the background the character happens to be wearing.

---

## 9. Removing non-Neuroshima remnants

- Hide SRD packs from compendium browser + `fromUuid` suggestions:
  `dnd5e.classes`, `classes24`, `subclasses`, `classfeatures`, `spells`, `spells24`,
  `races`, `backgrounds`, `origins24`, `feats24`, `heroes`.
  Implementation: `pack.configure({ locked: true })` + a CSS/`renderCompendiumDirectory`
  filter, behind a world setting so the GM can re-expose them for reference.
- Purge the broken placeholder class items on actors during migration (§10).
- `CONFIG.DND5E.classIdentifier`-adjacent lists cleared alongside the existing
  `spellcasting.mjs` teardown.

**Monsters keep working.** NPCs use `feat` items (241 in world, e.g. `Atak wielokrotny
(Cyngiel)`), which are unaffected — and can now *reference* the real class abilities from
`neuroshima.zdolnosci-klasowe` instead of being hand-retyped.

---

## 10. Migration — `scripts/migration/migrate-classes.mjs`

Current world state: 22 `character` actors, all with a broken class item
(`identifier: "lessunknown-classgreater"`, `hd: d6`, `rules: 2014`) or one literally named
`Wybierz`; abilities present as name-only stub feats with `uses.max:1 / spent:1`, no
activities, no recovery. Ad-hoc counters squat in `system.resources`.

Best-effort auto-migration:
1. Infer class from the actor's stub feat names (e.g. `Berserk` + `Goła Klata` → Brutal;
   `Kolejka` + `Motywacja` → Cwaniak). Confidence-scored; ties reported, not guessed.
2. Replace the broken class item with the real one at the same `system.levels`.
3. Replay advancement to that level, matching existing stub feats to real ones by
   normalized name so player choices are preserved where recoverable.
4. Delete leftover stubs; leave `system.resources` alone (GM data).
5. Write a report to chat + console: per-actor class inferred, features matched,
   features that need a manual choice, anything unmatched.

Dry-run mode first (`{ commit: false }`), and a full `foundry_backup_collection` of `actors`
before the committing run.

---

## 11. Verification checklist (live, FVTT 14.364 / dnd5e 5.3.0)

- [x] PW correct at levels 1/3/5/7/10/12 → 18/30/42/54/72/84 (Brutal, KON 14); PB 2/2/3/3/4/4
- [x] `@scale.brutal.berserki` → 2/2/3/4/5/5 and `obrazeniaBerserkera` → 1d6…1d12 resolve in roll data
- [x] `@classes.brutal.levels` valid (confirmed in `creature.mjs#getRollData`)
- [x] All 11 advancement UUIDs on the Brutal class resolve via `fromUuid`
- [x] Berserk toggles: spends a use, applies AE `{value:10, units:"rounds"}`, +4 TT at STR 18 unarmoured
- [x] Berserki restore on Długi odpoczynek, **not** Krótki — native `uses.recovery`, no custom code
- [x] Hotbar: macros auto-created, badge `●●○○` → `○○○○` + greyed at 0, art swaps in Berserk,
      macro removed when the ability is removed
- [x] Duplicate-macro race fixed — 4 abilities granted in one call, 4 concurrent syncs → 1 macro each
- [x] Exactly one choice per class/level (Twardziel poz. 7 correctly two) — see §3.4
- [x] Migration: dry run then commit; 11/22 migrated, homebrew preserved, Piekarz keeps Brutal + Gladiator
- [x] SRD packs locked/hidden, native XP bar and "Add Species" slot hidden
- [x] No console errors on world load
- [x] Native `AdvancementManager` builds the right steps for Brutal at every level 1→12:
      L1 HitPoints+Trait+ItemGrant+2×ScaleValue · L3 +Subclass · L4/7/10 ScaleValue bumps ·
      L5/9/11 ItemGrant · L4/8/12 Sztuczka · **L6/L10 nothing from the class** (§3.4)
- [x] With a profession attached, L6/L10 yield exactly one `subclass/ItemChoice`
      "Zdolność z profesji / Sztuczka" — either/or confirmed end-to-end
- [x] Multiclass Brutal 3 / Twardziel 2 (KON 14) → PW **42** = 24 + 8 + 5×2, exact
- [x] `extraAttack`: Trzeci atak wins, both Drugi atak copies suppressed
- [x] `unarmoredAc`: Goła klata (10+DEX+KON=13) beats Tarcza wiary (10+CHA=11)
- [ ] NPC (Cyngiel) still rolls `Atak wielokrotny` — expected fine (NPC feats untouched), not re-tested

**Gotcha for future testing:** `AdvancementManager.forLevelChange(actor, classId, delta)` takes the
class item's **id string**, not the item. Passing the item yields a manager with zero steps and no
error, which reads exactly like a broken advancement structure.

---

## 12. Assets

Placeholder-first (GM to replace by filename, no code change):

```
icons/klasy/<identifier>.svg              6    class portraits/badges
icons/profesje/<identifier>.svg          18    profession badges
icons/abilities/<id>.svg                137    per-ability
icons/abilities/<id>_active.svg           ~4   togglable only (Berserk, Kondycha, …)
```

Generated via the existing `dev/icons/` pipeline (`process_grid_*.py` / `process_single.py`),
consistent with `icons/activities/` and `icons/magazines/`. Colour-keyed per class so the
hotbar reads at a glance even before real art lands.
