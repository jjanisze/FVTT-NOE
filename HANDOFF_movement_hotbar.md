# Movement, innate actions and the combat hotbar

Date: 2026-10-25. Status: implementation handoff / design draft. **No movement implementation has been delivered by this handoff.** Baseline inspected: Foundry 14.369, dnd5e 6.0.6.

The subsequent [verified shared-action audit](AUDIT_shared_actions.md) is the current evidence for sheet/hotbar access. In particular, skill drags are **not native hotbar macros**, Bieganie/Unikanie live in a combat-only sidebar row, and weapon activities require an expanded row before dragging. Use that audit and its runtime observations rather than assuming every visible or draggable element is an executable action shortcut.

## 1. Objective and agreed direction

Speed up combat by showing how much movement the character has left and making movement declarations do useful work. A player must be able to use innate actions with an entirely empty hotbar.

Requested behavior:

- Track movement remaining in the turn, including movement split across several drags and actions.
- Use **green for movement within the currently granted allowance, red beyond it**. Remove the standing yellow preview of an undeclared Przyspieszenie from this NOE combat view.
- Explicit Przyspieszenie and Bieganie declarations grant movement and apply their relevant effects. Opening their menu grants nothing.
- Provide a **Ruch** hotbar entry containing Przyspieszenie, Bieganie and applicable class variants; include Skok as a movement operation.
- Keep a dependable sheet entry point for all these operations. The hotbar is a player-owned shortcut surface.
- Provide a starting combat hotbar template for each of the six classes, building on the level-1 icon/hotbar discussion study described in [PLAN_icon_design.md](PLAN_icon_design.md). Respect later player edits.

The requested strictness is established for **range colouring and explicit movement grants**. Physical prevention of red movement is a separate policy: the recommended first version allows measuring red routes and offers the relevant movement choices before committing an over-budget voluntary move. Do not silently take an action, truncate a route, or infer Bieganie merely from distance. If endpoint blocking is enabled, keep an explicit GM correction path and exempt movement that does not spend this budget.

This work brings movement accounting into scope after it was deliberately deferred in [PLAN_m1_walka.md](PLAN_m1_walka.md) §9. It does not introduce a general A/B/R/I spending auditor. Existing equipment costs remain visible and player-accounted, as in [PLAN_paper_doll.md](PLAN_paper_doll.md) D7. Do not alter weapon-click semantics as a side effect.

## 2. What exists now

### Core already records movement

Do not start from the premise that Foundry has no movement history. In a started combat, a combatant token records its movement. The ruler consumes that history alongside a planned route. What is missing here is an explicit NOE allowance/declaration model and a clear remaining-movement readout.

The inspected dnd5e ruler colours cumulative measured cost by the selected movement speed: normal through 1×, double through 2×, triple beyond 2×. The configured colours are green, yellow and red. It does not check whether Przyspieszenie has been declared or an action spent.

Critical v14 detail: **core clears the histories of ALL combatants whenever a new combat turn starts**, not only the actor whose turn starts. Do not mistake a history-clear event for a grant/reset of every actor's NOE allowance. Reuse the core lifecycle, with separate semantics for the active turn and exceptional off-turn movement.

Source anchors in the installed core source tree:

- `client/documents/token.mjs`: `movementHistory`, `_shouldRecordMovementHistory()`, `measureMovementPath()`, `move()`, `clearMovementHistory()`, `revertRecordedMovement()`; movement operation data distinguishes history, passed and pending sections.
- `client/documents/combat.mjs`: `_clearMovementHistoryOnStartTurn()`, `clearMovementHistories()`.
- `client/canvas/placeables/tokens/ruler.mjs`: `refresh()` includes planned movement history.
- `client/canvas/placeables/token.mjs`: path measurement, movement constraints and drag planning.
- `client/hooks.mjs`: `preMoveToken`, `moveToken`, `recordToken`; inspect their exact v14 signatures before use.

Source anchors in the dnd5e reference checkout:

- `module/canvas/ruler.mjs`: `TokenRuler5e`, private `#getSpeedBasedStyle()`; reads `waypoint.measurement.cost` and selected movement speed.
- `module/config.mjs`: `tokenRulerColors`, `movementTypes`.
- `module/documents/token.mjs`: movement-action cost functions, crawl/jump/fall configuration.
- `module/canvas/token.mjs`: difficult terrain and movement automation integration.
- `module/data/actor/templates/attributes.mjs`: derived movement speeds, including native jump derivation.

Official references: [TokenDocument movement API](https://foundryvtt.com/api/v14/classes/foundry.documents.TokenDocument.html), [v14 history-clear change](https://github.com/foundryvtt/foundryvtt/issues/13686), [dnd5e ruler introduction](https://github.com/foundryvtt/dnd5e/releases/tag/release-5.1.0#movement-automation).

### Existing NOE action entry points

**Today, with no hotbar macros:** open the character sheet's **Stan → Bieganie**, while the character participates in a started combat. **Unikanie** is beside it. The corresponding statuses are also available through the token HUD's status menu.

Location clarification, verified against the open sheet on 2026-10-25: **Stan is the NOE panel in the sheet's sidebar, not the native Effects → Stany tab.** The inspected session had no active combat, and the Bieganie/Unikanie row was absent. It therefore cannot be located in the provided Effects-tab screenshot. Do not describe this conditional row as a permanent generic-action entry point. Bieganie is registered as an action/status marker, separately from the condition list rendered in that Effects tab; the new permanent Ruch/Czynności access below addresses this discoverability gap.

There is no equivalent complete, executable innate-action catalogue on the current NOE sheet. Generic actions are not all automatically installed as owned ability Items. A native token movement mode such as Walk or Jump is also not a declaration of Przyspieszenie or Bieganie.

- [sheet-shell.mjs](scripts/actors/sheet-shell.mjs): `AKCJE_STANU`, `_buildAkcjeRow()`, `_buildStanPanel()`. Current Bieganie click calls `actor.toggleStatusEffect("bieganie")`; row is conditional on combat participation, and Bieganie is disabled at Powalenie.
- [conditions.mjs](scripts/config/conditions.mjs): `bieganie` and `dodging` status definitions and durations. The Bieganie description promises extra movement, but the status currently has no movement-budget connection.
- [okolicznosci-ataku.mjs](scripts/config/okolicznosci-ataku.mjs): Bieganie attack consequences; incoming ranged penalty is conditional on the runner's current turn.
- [tt.mjs](scripts/actors/tt.mjs): owner-turn expiry of Bieganie/Unikanie.
- [class-state.mjs](scripts/actors/class-state.mjs): Berserk state and existing class reminders.
- [ability-hotbar.mjs](scripts/actors/ability-hotbar.mjs): existing class-feature macros, per-user ownership, serialised sync, live badges and active visuals.
- [difficult-terrain-hint.mjs](scripts/scenes/difficult-terrain-hint.mjs): already extends the configured ruler class. Compose with it rather than replacing it.

## 3. NOE rules the implementation must preserve

Use the current NOE Markdown rulebook as RAW; cite the printed pages. Do not import D&D rules merely because the host system supplies a similarly named control.

| Operation / interaction | Required behavior | NOE |
| --- | --- | --- |
| Ordinary movement | Uses current applicable Speed; can be split before, between and after actions. Difficult terrain consumes movement cost, not just geometric distance. | s. 25–27 |
| Przyspieszenie [A] | Adds movement equal to applicable Speed after modifiers; unavailable at Powalenie; supports appropriate special movement speeds. It does not multiply the actor's Speed statistic. | s. 29–30 |
| Bieganie [A] | Adds 2× Speed; unavailable at Powalenie or to creatures not moving on legs. | s. 30 |
| Bieganie: own attacks | Utrudnienie until the START of the runner's next turn. | s. 30 |
| Bieganie: incoming ranged attacks | Utrudnienie only until the END of the runner's CURRENT turn. Do not give this protection throughout the round. | s. 30 |
| Szybkie nogi, Złodziej 1 | Allows Przyspieszenie, Odstąpienie or Ukrywanie się in B. Ordinary A options are still distinct choices. | s. 91 |
| Szarża Berserkera | During Berserk, after spending the entire Speed approaching a visible/audible enemy, permits Przyspieszenie in B toward that enemy. Merely having Berserk active does not satisfy every condition. | s. 67 |
| Szaleńcza szarża, Brutal 7 | +3 m Speed; taking Przyspieszenie gives incoming ranged attacks Utrudnienie until the START of the Brutal's next turn. This duration differs from Bieganie protection. | s. 68 |
| Długie susy | Bieganie in B when the character actually has this Sztuczka. | s. 107 |
| Skok | Part of movement, charged 1:1. Long jump with 3 m run-up: Strength score × 0.30 m; high jump with run-up: (2 + Strength modifier) × 0.30 m. Standing variants halve the maximum. Landing in difficult terrain requires Akrobatyka ST 10 or Powalenie. | s. 256 |
| Skok Gladiatora | During the appropriate Berserk/profession feature: doubles jump maxima and can cause a landing attack effect. Check the owned feature and its full conditions. | s. 70 |
| Padnięcie | Voluntarily going prone consumes the REST of movement; not available at Speed 0. Do not use the D&D free-drop assumption. | s. 25 |
| Powstanie | Costs half Speed, not half of whatever movement remains. Crawling uses the appropriate movement cost. | s. 36 |

Vehicle movement has related Przyspieszenie and Twardziel profession interactions, but [PLAN_m4_pojazdy.md](PLAN_m4_pojazdy.md) and the vehicle/driver services own those workflows. Do not change vehicle or chase movement by globally changing every token's ruler or actor Speed. Either explicitly adapt the vehicle service later or leave that path on its existing behavior.

## 4. Shared action service and access with an empty hotbar

Add one NOE action definition/dispatch layer. Suggested locations (new files, names provisional):

- `scripts/config/actions-data.mjs`: stable IDs, Polish labels, icons, grouping, timing/cost labels and availability metadata.
- `scripts/actors/actions.mjs`: actor/token resolution, availability, dispatch, declaration/undo and presentation state.
- `scripts/actors/movement.mjs` plus a pure rules helper: allowance calculation and core movement adapter.
- `scripts/actors/actions-menu.mjs`: sheet and hotbar movement palette.

Suggested public surface: `game.neuroshima.actions.list(context)`, `.use(id, context)`, `.open(group, context)`. Match the module's established public API registration conventions; these names are a proposal, not a claim that they exist today.

Access requirements:

1. A permanent **Ruch** control by the sheet's Speed/readout opens the movement choices. It remains discoverable with an empty hotbar. Outside combat it provides movement modes/rules/calculations with an explicit exploration state, rather than inventing a turn budget.
2. A discoverable **Czynności** sheet entry exposes the relevant innate actions, with grouping and text. Unsupported automation may offer a rule explanation/manual declaration; do not disguise it as an implemented effect.
3. **Ruch** on the hotbar calls the same palette. Individual entries can also be dragged to the hotbar as direct shortcuts.
4. Existing **Stan → Bieganie**, the token status control and any direct macro must enter the SAME transition. Otherwise sheet/HUD use will apply the attack status but fail to grant movement, or hotbar use will grant movement without the status.
5. Programmatic status changes, expiry and GM corrections must reconcile the same state without a status hook recursively declaring a second action. Separate an action declaration from removal/expiry of its consequences.

The menu should include Przyspieszenie [A], applicable [B] variants, Bieganie with applicable timing, conditional Szarża Berserkera, and Skok [ruch]. Padnij/Powstań fit here too, with their actual NOE movement costs. Do not charge A for Skok or allow it to increase maximum jump range just because extra movement was granted.

Show names, costs and short consequences. Explain unavailable conditional choices, especially Berserker direction/run-up requirements. Where perception or fiction cannot be determined reliably, keep the condition explicit and allow the GM/player to resolve it; do not invent an automated test of hearing.

## 5. Allowance, movement cost and lifecycle

For the first ordinary walking case:

```text
allowance = applicable Speed + movement granted by declared actions
remaining = max(0, allowance - movement already spent - non-path movement costs)
green endpoint = proposed cumulative cost fits the currently granted allowance
red endpoint = proposed cumulative cost exceeds it
```

Keep any overrun available diagnostically; clamping the displayed remaining value must not erase it. Never subtract history twice when the ruler already gives cumulative cost.

- Read committed movement cost from the core movement operation/history. Audit which fields are segment costs versus cumulative costs, their validity after reload, and when pending movement becomes committed before choosing the adapter.
- Reuse core pathfinding, diagonals, terrain and movement costs. Do not total pixel displacement or build a second ruler calculator.
- Movement grants and non-path spends need a small serialised, persisted record scoped to the appropriate combat, token/combatant and turn context. The actor's base Speed is not a place to store a temporary allowance.
- Record the source and A/B declaration separately. Account for valid combinations of grants; Przyspieszenie and Bieganie are not three exclusive stance multipliers. Prevent accidental duplicate dispatch while retaining intentional separate A/B declarations.
- Initially calculate the walking case explicitly. Mixed walking/flying/swimming speeds need a rules-aware budget: changing the selected mode must not refund distance already moved or apply the new mode's Speed to all history indiscriminately.
- A change of Speed/condition mid-turn must have a defined tested recalculation policy based on RAW. Do not keep a doubled green range when immobilised, or change past costs simply because terrain later changes.
- Do not spend ordinary movement for forced displacement, teleportation, falling or a GM correction. Reuse the core operation's movement metadata rather than guessing from an x/y update. Audit module-owned scripted movement and the vehicle/chase paths.
- Pending animation/path previews must not prematurely spend movement. Interrupted movement spends only the completed part.
- Reload/reconnect, owner + GM viewing the same token, and two simultaneous clicks must not duplicate grants or lose spent movement.
- Undoing an actual movement uses core's recorded-movement reversal where applicable. Undoing a declaration is a different operation: it must not silently clear history or remove an allowance already used. Offer an explicit correction when necessary.
- Define combat start/end, own-turn start, all-token core history clear, combatant deletion, turn reorder/backward navigation and multiple combats. Do not refresh every actor's movement merely because core cleared all histories.
- Off-turn special movement needs an explicit context/allowance. Do not give every token a fresh ordinary movement allowance on every combatant's turn. Keep unsupported special cases visible/manual until implemented.

Display an actual remaining readout, e.g. **Ruch: 3 / 9 m**, with the granted total changing after a declaration. An over-budget preview should include a textual reason; green/red alone is insufficient for understanding or colour accessibility.

## 6. Ruler integration

Use a NOE ruler extension/adaptor that calls through to the existing configured class. dnd5e's speed-colour helper is private, so calling it with a fake Speed or recolouring `tokenRulerColors.double` cannot implement the allowance model.

All relevant surfaces must agree: segment colours, waypoints, grid highlights, path preview labels and remaining readout. **No yellow range** in the NOE combat-budget view. Green means within the **current granted allowance after prior spends**, not always within the unmodified base Speed.

Keep distance and cost distinct in tooltips. Preserve difficult-terrain highlighting from `difficult-terrain-hint.mjs`. Keep ordinary measurement from empty space and other users' route visibility understandable; do not expose a private actor's details to an observer.

## 7. Hotbar templates and ownership

Retain the study's default 10-slot combat pattern: primary/backup weapon, weapon handling, class decisions, useful equipment, Unikanie, Odstąpienie, **Ruch**, Więcej. The six class templates derive their real features and equipment from the actor; they do not grant imaginary items. Use the already approved dedicated human action artwork.

| Class | Movement choices especially relevant to its level-1 template |
| --- | --- |
| Brutal | Ordinary Przyspieszenie/Bieganie; conditional Szarża Berserkera during Berserk. |
| Cwaniak | Ordinary movement choices; retain its separate class decisions. |
| Spec | Ordinary movement choices; retain its separate class decisions. |
| Twardziel | Ordinary movement choices; do not assume a vehicle profession at level 1. |
| Złodziej | A/B Przyspieszenie, existing B Odstąpienie and Ukrywanie się. Bieganie is not automatically B from Szybkie nogi. |
| Zwiadowca | Ordinary movement choices; do not assign conditional later-level movement features early. |

A starting Sztuczka can add options such as Długie susy for ANY relevant actor; inspect owned features rather than class name alone. Later features, including Brutal 7, extend the palette without replacing the player's preferred layout.

Seed the template once for the relevant player/character, then respect moves, deletions and an intentionally empty hotbar. Offer an explicit restore/add-template operation. Logging in, gaining a level or deleting the last macro must not silently reconstruct the template. Never overwrite occupied player slots.

Coordinate with `ability-hotbar.mjs`: its current automatic class-feature reconciliation can re-add missing managed abilities. Template placement needs its own explicit persistence/ownership policy and must not race that sync. Preserve live uses/active indicators, per-user macro ownership and current-character/token resolution. An unassigned user or ambiguous multi-token selection must not accidentally act for another character.

Weapon slots continue through the existing item-use gate: stowed weapon → draw/equip and stop; held weapon → use. This handoff does not introduce a free Kafar/Obrzyn swap. See [PLAN_paper_doll.md](PLAN_paper_doll.md) D2/D7/D8 and [validation.mjs](scripts/config/validation.mjs).

## 8. Delivery sequence

1. **Baseline spike in a sandbox.** Confirm split-drag history, cumulative costs, combat reset timing, interrupted movement, undo and reload in the installed versions. Capture the current Bieganie sheet/HUD paths. Resolve exact integration hooks before adding state.
2. **Pure allowance rules and core adapter.** Implement walking, explicit grants and remaining readout. Include non-path costs and status/Speed changes; reserve unsupported contexts explicitly.
3. **Canonical movement actions.** Route palette, Stan button, HUD and direct macros through one transition. Connect Bieganie effects, class timing and Szaleńcza szarża; add jump calculation/mode support with NOE formulas.
4. **Green/red ruler.** Integrate all ruler surfaces and confirm movement history is counted once. Establish the endpoint-enforcement setting/policy without silently changing ordinary measuring or GM corrections.
5. **Innate-action access and six hotbar templates.** Ship the sheet entry point with the hotbar work. Finish seed-once and deletion persistence before enabling automatic templates.
6. **Validation and documentation.** Update the implementation status, relevant older plan references and API/user documentation only when delivered. Add a movement/action Poligon station and Polish probes; do not reseed the GM's Poligon without their request.

## 9. Acceptance scenarios

| Scenario | Expected result |
| --- | --- |
| Speed 9 m, move 3 m, then 3 m in separate drags | 3 m left; only that remaining cost is green. |
| After those 6 m, declare Przyspieszenie | 12 m left out of 18 m granted; no base Speed mutation. |
| After those 6 m, declare Bieganie | 21 m left out of 27 m granted; both attack consequences applied with different expiry boundaries. |
| Move 3 m through ordinary terrain and 3 m through double-cost terrain | Cost 9 m; zero ordinary movement remains. |
| Declare Bieganie from sheet, HUD or a direct macro | Same grant, status, feedback and remaining range; no hotbar requirement. |
| Empty the hotbar, reconnect and use Ruch from the sheet | Empty stays empty; movement remains fully accessible. |
| Złodziej uses permitted A and B movement declarations | Separate legitimate grants; no accidental duplicate from one click. |
| Brutal has Berserk but has not fulfilled approach/direction conditions | The special B option explains its conditions; no automatic unconditional grant. |
| Brutal 7 takes Przyspieszenie | Ranged defensive effect lasts to their next turn start; it is not given Bieganie's shorter expiry. |
| Standing/running long/high jump | Correct NOE maxima; jump spends movement and run-up also spends movement. Extra allowance alone does not enlarge the maximum jump. |
| Padnij / Powstań | Padnij consumes the rest; Powstań charges half Speed. Status changes and budget stay in sync. |
| Drag preview, cancellation, interruption and undo | Preview/cancel spends nothing; interruption charges completed cost; undo reconciles actual history. |
| Force-move, teleport, GM correction, vehicle/chase move | No accidental ordinary-budget charge or global ruler takeover. |
| Core clears all histories on the next combatant's turn | No duplicated grants, refreshed off-turn ordinary budgets or loss of still-active combat effects. |
| Player moves/deletes a seeded shortcut or owns another macro in that slot | No overwrite or resurrection; GM sync does not edit the player's unrelated macros. |

Use meaningful pure-rule tests plus sandbox UI/e2e checks with GM and player permissions. Test at least walking, terrain, one class B variant, Bieganie expiry, empty-hotbar access, undo/reload and template ownership. Inspect desktop/narrow layouts, keyboard menu access and readable labels at actual hotbar size. Follow [TESTING.md](TESTING.md) and [PLAN_human_testing.md](PLAN_human_testing.md); this document-only handoff itself does not require a live game test run.

## 10. Deliberate limits / questions for implementation

- Physical endpoint blocking is not implied merely by changing the colours; settle and document that behavior explicitly.
- Reconcile class conditions requiring fiction/perception with player/GM declaration; do not present an unreliable automatic check as RAW enforcement.
- Use the full owned-feature rules for Długie susy, Skok Gladiatora and the vehicle exceptions rather than implementing only the abbreviated table entries above.
- Decide the dynamic-Speed grant policy and unsupported off-turn/mixed-mode contexts before claiming complete movement automation.
- Do not expand this work into general action policing, a weapon-swap redesign, map/terrain authoring or a new icon generation pass.
