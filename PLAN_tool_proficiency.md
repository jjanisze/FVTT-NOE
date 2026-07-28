# PLAN — Biegłość / Specjalizacja narzędzi

Status: **IMPLEMENTED (minimal scope)** — cycle patch live in code; needs world reload to activate.
- ✅ `scripts/config/tool-proficiency.mjs` — `registerToolProficiency()` patches the tool
  `proficiency-cycle` to `[0, 1, 2]` (skills untouched); wired in `scripts/main.mjs` init.
- ✅ Zbrojownia (`4IYaZ7YQ1uy90FOz`): **Biegłość w Narzędziach Małego Medyka**
  (`system.tools.medyka = { value: 1, ability: "int" }`) — verified live (PB applies).
- ⏭ Reload the world so `registerToolProficiency()` loads (removes the 0.5 step in the panel).

## Goal
Wire the Neuroshima **Biegłość** / **Specjalizacja w narzędziach** rule
([Tabele/Narzedzia.md](../../../../../Git/Neuroshima/neuro5e/Neuro%205e/Tabele/Narzedzia.md))
onto the module's 22 `tool` items — by **reusing native dnd5e tool proficiency**, not
building anything custom. GM/players grant proficiency by hand via the native Tools panel;
rolls then add PB (Biegłość) or 2×PB (Specjalizacja) automatically.

Single source of truth for the rule: **`Tabele/Narzedzia.md`** ("Zasady używania narzędzi").

## Key finding — dnd5e already implements this 1:1
`actor.system.tools[<kit>].value` is a proficiency multiplier that maps exactly onto NS:

| NS rule | dnd5e `value` | Roll result |
|---|:---:|---|
| Brak biegłości | `0` (or key absent) | k20 + mod Cechy — **no PB** |
| **Biegłość** | `1` | k20 + mod + **PB** |
| **Specjalizacja** (podwaja PB) | `2` (Expertise) | k20 + mod + **2×PB** |

Already-verified native plumbing (dnd5e release-5.3.0):
- `prepareTools()` → `calculateToolProficiency(value, ability)` computes the term and
  **doubles PB at `value:2`** automatically —
  [creature.mjs](../../../../../Git/fvtt-dnd5e/module/data/actor/templates/creature.mjs#L289).
- The tool `tool.mjs` Check reads `actor.system.tools?.[this.type.baseItem]` →
  proficiency is keyed by the kit key; our tool items already have `baseItem = <kit>`,
  so `rollToolCheck` adds PB today — [tool.mjs](../../../../../Git/fvtt-dnd5e/module/data/item/tool.mjs#L157-L158).
- Native **Tools config panel** (`ToolsConfig` + `proficiency-cycle`) lists every
  `CONFIG.DND5E.tools` key; our [scripts/config/tools.mjs](scripts/config/tools.mjs)
  already registers all 22 kits → they appear automatically.
- `CONFIG.DND5E.proficiencyLevels` labels already localized in
  [lang/pl.json](lang/pl.json#L200-L205): `Proficient → "Biegłość"`, `Expertise → "Specjalizacja"`.

Net: ~80% is native. This plan only relabels the cycle to NS semantics, drops the unused
half-proficiency step, verifies the panel + rolls, and documents manual acquisition.

## Decisions (LOCKED — from GM)
1. **Scope = minimal**: reuse native mechanics; no granting API/macros, no advancement
   automation. GM/players toggle proficiency on the sheet. ✓
2. **Levels = 0 / 1 / 2 only**: remove native `0.5` (half-proficiency) from the tool cycle.
   NS has no half-proficiency for tools. ✓
3. **No enforcement / guards**: trust the GM about *where* Biegłość/Specjalizacja comes
   from (class, pochodzenie, Sztuczka, nauka w Długim postoju). ✓
4. **Supersedes** PLAN_toolkits.md decision #9 ("no proficiency"): non-proficient rolls
   still work (never hard-blocked) — proficiency simply adds PB when set. ✓

## Reality check — acquisition sources (all MANUAL for now)
The rule lists 4 ways to gain Biegłość (klasa/zdolność, pochodzenie, Sztuczka, nauka w
Długim postoju) and says Specjalizacja comes only from klasa/zdolność/Sztuczka. **None of
these exist as Foundry Items yet** — Sztuczki live only as rulebook/markdown
([Tabele/Sztuczki.md](../../../../../Git/Neuroshima/neuro5e/Neuro%205e/Tabele/Sztuczki.md#L28-L29):
Fachowiec = 2 zestawy, Fabrykator wymaga 3), and the world has no compendium packs.
→ For minimal scope, acquisition is a **GM hand-toggle** in the Tools panel. Automating
Sztuczki/class/background as dnd5e **Trait advancements** is a documented future follow-up
(out of scope here).

## The one code change — drop the 0.5 step for tools
`ProficiencyCycleElement.validValues` **hardcodes** tool values as `[0, 1, .5, 2]`
([proficiency-cycle.mjs](../../../../../Git/fvtt-dnd5e/module/applications/components/proficiency-cycle.mjs#L133));
relabeling `proficiencyLevels` alone will NOT remove the half-step from the click cycle.
Patch the getter so **only `type === "tool"`** cycles `0 → 1 → 2` (leave `skill` untouched —
skills may legitimately use 0.5 for Jack-of-all-Trades):

- New `scripts/config/tool-proficiency.mjs`:
  - `registerToolProficiency()` — run in the `setup`/`init` hook AFTER dnd5e defines the
    custom element (`customElements.get("proficiency-cycle")`).
  - Override the prototype getter so tools return `[0, 1, 2]`:
    ```js
    const Cls = foundry.applications?.elements
      ? customElements.get("proficiency-cycle")
      : dnd5e.applications.components.ProficiencyCycleElement;
    const orig = Object.getOwnPropertyDescriptor(Cls.prototype, "validValues").get;
    Object.defineProperty(Cls.prototype, "validValues", {
      get() { return this.type === "tool" ? [0, 1, 2] : orig.call(this); },
      configurable: true
    });
    ```
  - (Optional) confirm labels: `CONFIG.DND5E.proficiencyLevels[1]`/`[2]` already resolve to
    "Biegłość"/"Specjalizacja" via lang; no change needed. Do **not** delete the global
    `0.5` key from `proficiencyLevels` (shared with skills).
- `scripts/main.mjs` — import + call `registerToolProficiency()` alongside `registerTools()`.

## Build steps
1. `scripts/config/tool-proficiency.mjs` — `registerToolProficiency()` prototype patch (above).
2. `scripts/main.mjs` — import & invoke in the same hook that runs `registerTools()`.
3. Reload world via CDP; verify (below).
4. (Docs) add a short "Biegłość/Specjalizacja — jak nadać" note pointing GM to the Tools
   panel; cross-link from `Tabele/Narzedzia.md` if desired.

## Verify (CDP, live world)
- **Panel**: open a BG character sheet → Umiejętności/Narzędzia → tool config (gear) →
  all 22 kits listed; clicking a kit's cycle steps `0 → Biegłość → Specjalizacja → 0`
  (no half step); tooltip reads "Biegłość" / "Specjalizacja".
- **PB math** on a test actor:
  ```js
  const a = game.actors.get("<id>");
  await a.update({ "system.tools.slusarza": { value: 1, ability: "dex" } });
  // roll the Mały ślusarz tool → chat total includes +PB
  await a.update({ "system.tools.slusarza.value": 2 });
  // roll again → total includes +2×PB (Specjalizacja)
  ```
- **Dual-ability kits** (e.g. elektronika DEX/INT): confirm the roll dialog still lets the
  player re-pick the Cecha (native `getAbility` honours `system.tools[key].ability`).
- **No-proficiency**: a kit at `value:0` still rolls (k20 + mod, no PB) — never blocked.

## Out of scope (this pass)
- Granting API / GM macro (`setToolProficiency(...)`).
- Sztuczki / class / pochodzenie as feat Items with dnd5e **Trait advancements**
  (Fachowiec, Fabrykator, Samouk, …).
- Nauka narzędzi w Długim postoju (training macro / downtime).
- Any change to skill half-proficiency.

## Follow-ups (future)
- Author Sztuczki as feat Items with `trait` advancements granting `tool` proficiency
  (mode `default` = Biegłość; mode `expertise` = Specjalizacja) so acquisition auto-syncs
  to `system.tools`. See dnd5e Trait advancement (`actorKeyPath: "system.tools"`,
  `expertise: true`).
- Optional GM helper macro to bulk-set proficiency from a character's background sheet.
