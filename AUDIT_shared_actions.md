# PC shared actions: sheet and native hotbar audit

Verified 2026-10-25 against **Foundry 14.369 / dnd5e 6.0.6 / NOE module 0.20.0**, using the current **NeuroshimaCharacterSheet** as a **PLAYER**, not just a GM or a source-code inspection.

## What the columns mean

- **Action** means the named NOE action/workflow, not merely a button that rolls one of its possible skills.
- **Sheet** means the character sheet unless explicitly marked **item sheet**. A canvas toolbar or chat button is a different entry point.
- **Hotbar** means a native drag creates a working shortcut, without writing a custom script. A sheet Favorite is not the native Foundry hotbar.
- **Partial** means a useful skill roll or status toggle exists, but does not perform the complete named action.
- A **No** does not mean a hand-written macro is impossible. The maneuver API, for example, can be called by a custom script.

The main table covers all twelve entries in **Tabela typowych akcji (NOE s. 21)**, plus Pochwycenie, Odepchnięcie, Wytrącenie and Wyzwalanie się from the common combat rules / turn summary (NOE s. 30, 37, 253–255). Subsequent tables account for movement, interactions, reactions and common conditional/equipment operations. Class/profession/Sztuczka-specific abilities are not innate shared actions. Arbitrary fictional actions and every individual equipment recipe are not a finite generic action catalogue.

## 1. Named shared actions

| NOE action | Triggerable from the character sheet? | Draggable to native hotbar? | Verified behavior / other access |
| --- | --- | --- | --- |
| **Atakowanie** | **Yes, through an owned weapon/activity.** There is no generic Atakowanie button. | **Yes, owned weapon or expanded attack activity.** | Whole weapon macros resolve the current actor's item. First use of an unprepared weapon equips/draws it and stops; use of a held weapon proceeds to attack/activity choice. An owned knife's sheet control opened the real attack-roll dialog. **A15–A17b, A18-2, A53.** |
| **Badanie** | **Partial: skill rolls.** Postać → Historia, Medycyna, Przyroda, Technika or Śledztwo, as appropriate. | **No native skill-to-hotbar drop.** | There is no Badanie workflow button. The relevant skills open real roll dialogs; the player/GM supplies the purpose and action declaration. **A08, A28, A41.** |
| **Bieganie** | **Yes: sidebar Stan → Bieganie, in a started combat containing this PC.** | **No direct action drag.** | Applies `bieganie`; button is not draggable. Starting it is disabled at Powalenie. It does not change Speed or grant an explicit movement budget. Also available as a token-HUD status. **A01, A06–A12, A36, A46.** |
| **Odstąpienie** | **No dedicated shared control.** | **No.** | No shared sheet action, native action Item/activity, or corresponding configured status was found. Declaration remains manual. A class ability is a separate case. **A12, A28 + source review.** |
| **Pomaganie** | **No general Help workflow.** | **No.** | No generic assistant/recipient/one-use benefit control. Choosing Ułatwienie on the ally's roll is a manual consequence, not an execution of Pomaganie. **Stabilizacja** has its own chat workflow below. **A28, A37–A38.** |
| **Przyspieszenie** | **No shared action control.** Speed display/configuration is not a Dash declaration. | **No.** | The ruler previews the distance bands; it does not record the action declaration. Native token movement-mode choices do not include Przyspieszenie. **A12, A28, A34c + ruler source.** |
| **Szukanie** | **Partial: skill rolls.** Postać → Intuicja, Percepcja, Pojazdy or Survival. | **No native skill-to-hotbar drop.** | No separate Search workflow or action declaration. All four actual skill controls were opened; Percepcja was rolled to chat. **A03, A05, A28, A41.** |
| **Unikanie** | **Yes: sidebar Stan → Unikanie, in a started combat containing this PC.** | **No direct action drag.** | Applies `dodging`; button is not draggable. Also a token-HUD status. This is not an entry in the native Effects → Stany list. **A07, A11–A12, A46.** |
| **Ukrywanie się** | **Partial: Postać → Skradanie się.** Effects → Niewidoczność is a separate manual condition toggle. | **No native skill/action drop.** | Tested Skradanie rolls produced skill messages without setting hiding/invisible. HUD **Ukrywanie się** sets the `hiding` marker without rolling or adding Niewidoczność. These are separate controls, not one complete Hide workflow. **A02, A08, A14, A28, A41.** |
| **Używanie** | **Yes for implemented owned items; no universal Use button.** | **Yes for usable item/activity rows.** | Verified Medpak under **Zasoby → Leki → Zażyj**, and its native item macro. Sheet use healed 8 PW and consumed one item; confirmed hotbar use healed another 7 and consumed the second. Do not infer that every equipment description has an implemented activity. **A22-6, A24–A26.** |
| **Wpływanie** | **Partial: skill rolls.** Postać → Perswazja, Oszustwo, Występy, Zastraszanie or Tresura. | **No native skill-to-hotbar drop.** | No shared influence/target/outcome workflow. All relevant skill dialogs were opened; Perswazja was rolled to chat. Specialized trading controls are not the generic combat action. **A03, A05, A28, A41.** |
| **Wyczekanie** | **No.** | **No.** | No shared trigger/declaration/expiry workflow or owned generic Ready activity. The later reaction must also be declared manually. **A28 + source review.** |
| **Pochwycenie** | **No shared sheet action.** The Effects-tab Pochwycenie toggle only applies the condition to that actor. | **No native shared-action drag.** | **Canvas Token Controls → Manewry**. Actual player click opened the maneuver chooser and posted the attempt against an unowned target, leaving resolution to the GM. **A26, A28.** |
| **Odepchnięcie** | **No shared sheet action.** | **No native shared-action drag.** | Same canvas maneuver chooser, with push/prone outcome choice. Triggered as a player; unowned-target resolution was referred to the GM. **A27-odepchniecie.** |
| **Wytrącenie** | **No shared sheet action.** | **No native shared-action drag.** | Same canvas chooser, with the two-handed-target option. Triggered as a player; unowned-target resolution was referred to the GM. **A27-wytracenie.** |
| **Wyzwalanie się** | **Partial: Atletyka / Akrobatyka roll; then manual condition/position changes.** | **No named action or native skill drop.** | No generic escape workflow combining the check, grapple removal and relocation. Both skill controls were actually rolled. Removing Pochwycenie in Effects is a manual condition operation. **A05, A08, A28, A41 + source review.** |

**Unarmed damage is a gap within Atakowanie:** the fresh generic PC had no automatically supplied unarmed/natural attack Item, and the inspected NOE weapon pack did not provide a default fist entry. The canvas maneuver chooser covers grapple/shove/disarm, not the damage option of Atak bez broni. An independently supplied unarmed Item can use native item/activity machinery, but that is not a built-in shared action on every current PC. **A28 + pack inspection.**

## 2. Movement, interactions and reactions

| Shared operation | Sheet access | Native hotbar drag | Accounting |
| --- | --- | --- | --- |
| Ordinary movement | **No move-execution button.** Speed is displayed/configured. | **No movement-action drag.** | Movement is on the canvas. The native token HUD has **Select Movement Action**. **A12, A28, A34c.** |
| Czołganie się | **No dedicated sheet movement operation.** | **No.** | HUD → **Crawl** actually changed the token's `movementAction` to `crawl`. **A34c.** |
| Wspinanie się | **Skill roll only** if a check is needed; no complete sheet climb operation. | **No native skill/movement drop.** | HUD → **Climb** changed the mode. Atletyka is independently available on the sheet. **A05, A34c, A41.** |
| Pływanie | **Skill roll only** if a check is needed; no complete sheet swim operation. | **No native skill/movement drop.** | HUD → **Swim** changed the mode. It is not an automatic NOE swimming-check workflow. **A34c, A41.** |
| Skok w dal / wzwyż | **No NOE jump workflow.** | **No.** | HUD → **Jump** exists and changed the mode. This does not demonstrate NOE run-up, standing/high/long jump or landing-check automation. Native stored jump speed was 7 m for Strength 14; NOE's running long-jump formula gives 4.2 m. Do not count that mode as verified NOE jump resolution. **A34c.** |
| Padnij / Powstań | **Partial: Effects → Stany → Powalenie toggle.** | **No action drag.** | Actually toggled prone off and on. This changed the status; it did not spend remaining movement / half Speed. HUD has the same condition. **A33b.** |
| Dobycie / schowanie broni | **Yes, through item-location / Oporządzenie controls.** | **Item shortcut can prepare the item; no separate universal stow-action drag.** | The native Obrzyn macro moved it from the pack to a hand and stopped. The exact stow/draw choices are governed by the paper doll; do not present weapon selection as an instantaneous free swap. **A16 + paper-doll source.** |
| Upuszczenie / podniesienie | Paper-doll and ground-item interfaces; **not a universal action on the main sheet.** | **No named action drag established.** | Source-reviewed in `doll.mjs` / `ground-items.mjs`; these particular physical gestures were **not exercised in this audit**. Do not promote this row to an end-to-end pass. |
| Interakcja z obiektem, e.g. doors | **No generic sheet interaction button.** | **No generic action drag.** | Fiction / appropriate map control. This audit did not test arbitrary door/map interactions. |
| Krótka komunikacja | **No dedicated action control.** | **No.** | Verbal/text communication, not an executable sheet action. |
| Atak okazyjny [R] | **Weapon attack workflow only.** | **Weapon/activity shortcut, not an OA-specific shortcut.** | No shared OA declaration/reaction tracker found. The attack is performed using the ordinary attack control and manually treated as the reaction. Native weapon/attack access was tested; opportunity detection was not claimed. |
| Wyczekana akcja [R] | **No ready-trigger workflow.** | **Only the eventual item/activity, if one exists.** | No native shared shortcut linking a declared trigger to a readied action. |
| Atak drugą ręką [B], two light weapons | **Yes, through the weapon's attack-roll configuration.** | **Weapon/activity shortcut; not a dedicated offhand preset.** | With Maczeta and Nóż taktyczny held, the real sheet roll dialog offered `offhand`, labelled **Ręka wolna** under **Tryb ataku**. Selected it, then cancelled the roll. It does not audit spending B. **A53.** |

## 3. Weapon handling and conditional shared controls

| Operation | Actual entry point | Native hotbar drag | Verification |
| --- | --- | --- | --- |
| Przeładowanie, manual weapon cycle | **Character sheet → expand the weapon → Przeładowanie**; also its item controls. | **Yes: drag the expanded activity row.** | Created a native Lewar M95 activity macro. Hotbar use cycled an already-loaded chamber, ejected one cartridge and changed 5/6 to 4/6; direct sheet use changed 4/6 to 3/6. **A21, A42, A45.** |
| Wymiana magazynka | **Expand the compatible weapon → Wymiana magazynka.** | **Yes: activity row.** | Created and invoked the Empepiątka shortcut. The minimal fixture had no spare magazine, and the actual handler reported that prerequisite. A completed physical swap was not tested here. **A22-4, A43.** |
| Doładuj 1 nabój | **Expand the compatible weapon → Doładuj 1 nabój.** | **Yes: activity row.** | Created the correct Lewar activity macro and invoked it. With no loose .30-06 ammunition, the handler reported that prerequisite. A completed round transfer was not tested here. **A23, A44.** |
| Odblokuj zacięcie [A] | **Firearm item sheet → Odblokuj zacięcie (Akcja)** when jammed. | **No direct action drag.** | Applied a jam as fixture setup, clicked the actual item-sheet control, rolled Zwinne dłonie ST 10, and verified the jam cleared. This is an **item sheet**, not the main actor-sheet status panel. **A31–A32.** |
| Ugaś się [A] | **Character sidebar Stan → Ugaś się**, while burning. | **No direct action drag.** | Actual button opened Akrobatyka, applied Powalenie, then the successful roll extinguished the flames. **A29–A32.** |
| Złap oddech | **Character sidebar Stan → Złap oddech**, with the breathing/suffocation state. | **No direct action drag.** | Actual click removed the suffocation state. This is a state-recovery control, not permission to breathe somewhere the fiction prevents it. **A35.** |
| Stabilizacja / Pomaganie + Medycyna | **Dying target's chat card → Stabilizuj — Medycyna ST 10.** Not a generic helper-sheet Help button. | **No direct action drag.** | A player clicked the target's actual chat card, opened the Medicine dialog and produced the stabilization roll. Automatic success/failure consequences were not the claim of this access audit. **A37–A38.** |
| Rzut Przeciw Śmierci | **Dying owned PC's sheet → death-save control**, also the dying chat card. | **No direct sheet-control drag.** | Actual sheet click rolled 8 and recorded the first failure. **A39–A40.** |
| Forsowanie, optional | **Skill-result chat card → Forsuj**, then its confirmation. | **No direct action-button drag.** | Confirmed the actual workflow: rolled with the ability score and increased Wyczerpanie from 0 to 1. The pre-confirmation snapshot was not completion. **A52.** |
| Inicjatywa | **Sheet portrait sidebar → Inicjatywa.** | **No direct control drag.** | Opened its real roll configuration and cancelled. **A49–A49b.** |
| Krótki / Długi odpoczynek | **Character header rest buttons.** | **No direct control drag.** | Both real rest dialogs opened, including the module's activities sections; cancelled without advancing time or completing rest. **A47–A48.** |

### Common armor actions: separate evidence grade

These are equipment-dependent shared options, not class abilities. The owned **Tarcza** and **Hełm** were imported from the installed NOE pack and inspected at runtime: both have **zero activities**. Consequently their descriptions are not draggable executable bash/cover/parry/protection activities. The reaction dispatch locations below are **source-confirmed; the reactions themselves were not clicked in this audit**. **A54.**

| Option, NOE s. 115 | Direct sheet / native action drag | Existing implementation |
| --- | --- | --- |
| **Cios tarczą [B]** | **No dedicated activity.** | `armor-data.mjs` explicitly marks the unarmed 1k4 / Odepchnięcie option as manual. The generic shove chooser exists separately. |
| **Osłona tarczą [R]** against an area attack | **No dedicated activity.** | `armor-data.mjs` explicitly marks it manual; use the appropriate saving-throw advantage after declaring the reaction. |
| **Parowanie tarczą [R]** | **No direct sheet activity.** | The attack chat's **Reakcje celu** handler supports it, with held shield, proficiency and Strength requirements. This is a reaction prompt, not a shield Item activity. |
| **Krytyczna ochrona hełmem [R]** | **No direct sheet activity.** | The attack-chat reaction handler supports the critical-hit downgrade / helmet destruction path. This audit did not execute it. |

Source: [armor-data.mjs](scripts/config/armor-data.mjs), [defense-rules.mjs](scripts/config/defense-rules.mjs), [obrona.mjs](scripts/combat/obrona.mjs). Specialist crafting, vehicle/chase controls, item-specific explosives and class features have their own interfaces and are not presented as generic innate actions by this report.

## 4. Findings that matter for the movement/hotbar plan

1. **A universal sheet action catalogue is missing.** Current support is split among owned items, skill rolls, two combat-only sidebar buttons, token statuses, the canvas maneuver tool and contextual chat controls.
2. **Skill draggability does not mean hotbar compatibility.** Skill drags emit a `dnd5e.action = "favorite"` payload. Actual drops of Skradanie się, Percepcja, Perswazja and Atletyka onto the native hotbar created no macros. The dnd5e hotbar hook accepts Item, Activity and ActiveEffect documents. All 18 skills were individually clicked and opened their appropriate roll dialogs. A positive physical drop into sheet Favorites was not established by this audit and is not needed to conclude that the tested native hotbar drops failed.
3. **Owned Item and Activity drags work.** Verified weapon, consumable, manual-cycle, magazine-swap and load-one macros. An activity's parent weapon must first be **expanded**: collapsed activity markup remains in the DOM/accessibility snapshot but is clipped by a zero-height wrapper. An initial drag from that clipped content was not evidence of a broken activity drag.
4. **Stan and Stany are different places.** The left sidebar Stan panel contains the combat-only Bieganie/Unikanie row. The main Effects → Stany list does not contain those action markers, even while they are active. The row disappeared when the audit combat was deleted. Native support for dragging ordinary ActiveEffect documents does not provide an alternative sheet drag here: dnd5e creates status effects as `type: "condition"` and excludes those from the ordinary effect rows (except Concentrating); these markers also have no entry in the condition-toggle list.
5. **Markers are not complete actions.** In particular, the hiding marker neither rolls Skradanie nor grants Niewidoczność, and Powalenie toggles do not implement NOE movement spending.
6. **The new registry must not depend on hotbar population.** It needs a permanent sheet entry point and native drag payloads of its own, or a deliberate document/activity representation. Reuse current item activity drags instead of rebuilding weapon use.

## 5. Evidence and reproduction

- [Runtime observations and excluded preliminary attempts](dev/audits/shared-actions-2026-10-25/results.json).
- [Combat sidebar and skill controls](dev/audits/shared-actions-2026-10-25/sheet-combat.webp).
- [Effects → Stany alongside the separate sidebar Stan controls](dev/audits/shared-actions-2026-10-25/sheet-effects.webp).

The audit used two disposable PCs, one disposable scene and a dedicated player account in an existing agent sandbox. The PC initially had no class features and an empty hotbar; ordinary weapons and a Medpak were imported from installed NOE compendia for the equipment tests. Contexts tested included no combat, an unstarted combat, a started combat containing the PC, Powalenie, burning, suffocation, a weapon jam and dying at 0 PW.

Checks used real sheet/HUD/canvas controls and native drag/drop handlers. Some controls were given temporary accessibility labels to target the correct existing DOM element; no action handlers were added. No production gameplay code or campaign documents were changed. Positive macro checks inspect the created command, not just a drag-success acknowledgement. Skill and state-action checks inspect dialogs, messages, document state and/or actual resource changes.

To reproduce the key checks:

1. Open an owned PC with no active combat. Inspect the sidebar Stan panel and the separate Effects tab. Start a sandbox combat with that PC and recheck the sidebar.
2. Click Bieganie and Unikanie; inspect their effects. Drag their buttons to an empty native slot. Repeat with a skill name from Postać; inspect whether a Macro document was actually created.
3. Drag an owned weapon row to a slot. Expand its description/activity area first, then drag a visible reload activity row to a different slot. Confirm the latter macro includes `activityName`.
4. Select the PC's token, target another token and use the canvas **Manewry** button. An unowned target produces the GM-resolution path, not automatic player writes to the target.
5. Use a known consumable from Zasoby → Leki and from its native macro; confirm any native usage dialog. Inspect the item quantity and resulting healing after the asynchronous workflow settles.

Implementation anchors:

- [Sheet sidebar actions](scripts/actors/sheet-shell.mjs): `AKCJE_STANU`, `_buildAkcjeRow()`, `_buildFireRow()`, `_injectCharacter()`.
- [Condition versus marker registration](scripts/config/conditions.mjs): `NEUROSHIMA_MARKERS`, `registerConditions()`.
- [Canvas maneuvers](scripts/combat/melee-maneuvers.mjs): `registerMeleeManeuvers()`, `openManeuverDialog()`.
- [Item use gate](scripts/config/validation.mjs), [paper doll](scripts/actors/doll.mjs), [grip/offhand choices](scripts/combat/grip.mjs).
- [Reload activities](scripts/weapons/magazine.mjs): `NeuroReloadActivity`, `NeuroLoadOneActivity`, magazine-swap activity registration.
- [Jam control](scripts/weapons/jams.mjs), [fire control](scripts/combat/podpalenie.mjs), [breathing control](scripts/actors/zagrozenia.mjs), [dying/stabilization](scripts/combat/umieranie.mjs).
- dnd5e checkout: `module/applications/actor/character-sheet.mjs::_onDragStart()` emits skill Favorite data; `dnd5e.mjs` registers the accepted `hotbarDrop` types; `module/documents/macro.mjs` builds Item/Activity commands; `module/applications/components/effects.mjs` handles condition toggles and excludes condition-type effects from ordinary effect rows; `module/documents/active-effect.mjs::_fromStatusEffect()` assigns that type.

The JSON keeps preliminary/invalid probes separate from verified observations. Those include attempts to drag collapsed activity content, an icon without a usable DOM drag target, a wrongly selected source row, and pre-confirmation/pre-settlement observations. They are not reported as product failures or completed actions. One generic resource 404 was present in the browser console; no action-flow exception was attributed to the application. This is an access/workflow audit, not a claim that every rule consequence, every third-party sheet or every class build was exhaustively tested.

## 6. Cleanup

Removed the two audit PCs, scene, player account, six generated macros and 28 audit messages. The audit combat was removed; no audit actors, scene or user remained. The existing GM's viewed scene was unchanged. The campaign was not used for tests.

Follow-up implementation: [HANDOFF_movement_hotbar.md](HANDOFF_movement_hotbar.md). This audit records current behavior; it does not implement the proposed action catalogue or movement budget.
