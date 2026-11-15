# M8 action economy — evidence audit

Date: 2026-11-02; supplied rules discussion reviewed 2026-11-15. Foundry 14.369 / dnd5e 6.0.6 / NOE 0.21.0.
Scope: evidence for [PLAN_m8_ruch_i_ekonomia_akcji.md](PLAN_m8_ruch_i_ekonomia_akcji.md), not delivery of its tracker.
RAW is the October NOE Markdown in the campaign vault; page numbers below are printed pages.
Current decisions/delivery scope are in the renamed handoff and §12 below. Earlier open lists and retired examples
in this audit describe their dated review, not unresolved choices or permission to override the current contract.

## 1. Conclusions supported by the current implementation

| Question | Finding | Evidence |
| --- | --- | --- |
| Can ordinary A be tracked? | There is an action activation/usage lifecycle to adapt, but current module accounting only recognizes B/R. Do not equate every activity or roll with a new A. | `actors/actions.mjs`, `config/actions-data.mjs`; dnd5e `module/documents/activity/mixin.mjs::use`. |
| Can I be tracked? | The paper doll already computes structured `interaction`, `action`, `free`, `none` costs. Commit those transaction results, including existing exceptions. | `actors/doll-model.mjs::moveCost`, `actors/doll.mjs::costContext`, `_moveLines`, `_postLines`. |
| Does drawing a holstered weapon require inventing a cost? | No: ordinary draw/stow/pickup is I; an additional interaction uses Używanie [A]. Equipped-location exceptions already exist. Retrieval from a backpack is a separate existing rule/path, not a reason to classify normal drawing as Attack. | NOE s. 25, 29, 31, 37; `config/validation.mjs::registerValidation`, `actors/doll-model.mjs`. |
| Is Zryw supported? | Partly. Native compiled activity is `special`, consumes one short-rest use and opens an A/B choice. B raises the existing marker's limit; A only announces its effect. | NOE s. 87; `config/class-features-data.mjs["zryw"]`, `combat/zdolnosci-karty.mjs::_zryw`, `actors/actions.mjs::dodatkowa`. |
| Is Zryw's current cancellation safe? | Closing its choice currently becomes A (`?? "A"`). The choice is opened from `postUseActivity`, after native item-use consumption. It must be moved before commit or given an explicit complete rollback when integrated. | Same sources plus sandbox probe below. |
| Does a generic automatic Pomaganie already exist? | No. Special stabilization/bleeding workflows are not the generic skill/tool or attack-assistance service. | `AUDIT_shared_actions.md`; current `combat/umieranie.mjs`, `combat/bleeding.mjs`; no generic action handler in `actors/actions.mjs`. |
| Does generic Wyczekanie already exist? | No. Drone menus mention it and there is reaction support, but no general trigger/payload/declaration service. | `AUDIT_shared_actions.md`; `actors/drony-sterowanie.mjs`, `config/towarzysze-rules.mjs`. |
| Does Ctrl+Z undo movement and its cost history? | Yes. Token-layer Undo restores the original position and recorded movement history. A tracker can reconcile that history. | Core `client/helpers/interaction/client-keybindings.mjs::#onUndo`, `client/canvas/layers/tokens.mjs::storeHistory`, `TokenDocument.revertRecordedMovement`; sandbox probe. |
| Does Ctrl+Z undo an attack and all consequences? | No general mechanism established. The key targets the active canvas layer; token history expressly excludes actorData/delta changes. Native activity refund only addresses recorded consumption deltas. | Same core sources; dnd5e `ActivityMixin.refund`; module `canvas-history.mjs`. |
| Can Fuks retain the original action identity without a second spend? | Yes. Post-roll messages already carry root/previous message IDs and reroll provenance. They create a new result, not a fresh activity use. | `combat/po-rzucie.mjs::uzyjZrodla`, `combat/rerolls.mjs::FUKS`; sandbox probe. |
| Does an unrecorded spoken action have to be backfilled at turn end? | No. There is no current A/I tracker or general RAW benefit conditioned on a leftover A count. Ordinary unused resources can expire without a completion check. | Source search of current action-marker consumers and RAW action/class/Sztuczki text; see limits below. |
| Can the timer and alerts stay local? | Yes. Combat/pause hooks supply transitions; the browser can keep timing/notification state without document writes. No new timer component exists yet. | Core `combatTurnChange`, `updateCombat`, `pauseGame`; native tracker filters `combatant.visible`. |

## 2. Isolated runtime probes

Created via `fvtt world:create m8-accounting --fixture=skirmish`; world `agent-m8-accounting-20261102`.
GM-owned test PCs only. Campaign and Poligon were not modified. No production source was changed.
The disposable world was removed afterwards with the guarded `fvtt world:delete ... --stop` command.
The actual canvas Undo handler (`canvas.tokens.undoHistory`) was exercised through the API; this is not a claim
that keyboard focus and every player-permission case have passed a new layer-6 suite.

### Movement and independent B

Scene configured to 1.5 m squares. PC started at x=400; two separate 100 px walking moves:

| Step | x | Recorded segment costs | Independent B marker |
| --- | --- | --- | --- |
| Start | 400 | none | 1 use, limit 1 |
| Move 1 | 500 | 0, 1.5 | unchanged |
| Move 2 | 600 | 0, 1.5, 1.5 | unchanged |
| Native Undo once | 500 | 0, 1.5 | unchanged |
| Native Undo twice | 400 | none | unchanged |
| Existing extra-B service | 400 | none | still 1 use, limit now 2 |

Each movement/Undo emitted `recordToken`. The current public action-kind registry contained only R and B;
requesting extra A did not create an A record. B persisted into another actor's turn and was removed at the next
owner-turn start. Removal completes asynchronously: a probe immediately after the combat update still saw the
marker; a subsequent settled read found it gone. Future counter rendering must not depend on a render racing
those independent effect-deletion hooks.

### Actual compiled Zryw activity

Imported the compiled Zryw feature into the test PC. Used its native utility activity with the choice response
controlled in the sandbox; this checked activation/consumption/handler wiring, not usability of the dialog.

| Choice | Activity activation | Item use spent | B state | Canvas Undo entry |
| --- | --- | --- | --- | --- |
| A | special | 0 → 1 | no B grant | none |
| B | special | 0 → 1 | empty B record with limit 2 | none |
| Close/cancel (`null`) | special | 0 → 1 | no B grant; source defaults to A | none |

The tracker extension can support both branches. It must not mistake Zryw itself for spending A/B or use the
absence of a canvas Undo entry as a successful cancellation. Its short-rest use is a different resource.

### Actual Fuks chain

Made an Atletyka test with an unreachable test DC to ensure eligibility, then invoked the existing Fuks service.
Confirmation was accepted by the sandbox probe. Result:

- New chat message with `fuks: true` and `poRzucie.rootId`, `poprzednieId`, `przerzut: true`, `zrodlo: "fuks"`.
- Original message marked superseded; the root/previous IDs matched the original roll.
- Fuks inventory 1 → 0; independently recorded B unchanged at one use/limit one.
- No canvas Undo entry. An action-cost badge should belong to the original committed action; the result revision
  may link to it but must not render a new A/B/R/I spend.

## 3. RAW cases the design must actually model

| Case | RAW conclusion | Consequence |
| --- | --- | --- |
| Zryw | One extra A **or** B, in own turn, one use per short/long rest (s. 87). | Source-tagged grant; no reset, extra I/R/movement or automatic bypass of injury restrictions. |
| Szybkie ręce, Spec 4 | Extra action only for Używanie, uses per short rest based on DEX modifier (s. 79). | Restricted action grant. A scalar A total cannot be the entire authorization model. |
| Multiclassing | Acquired class features apply; duplicate Drugi Atak does not stack (s. 59). | Zryw + Szybkie ręce is a RAW combination. Three total A can include only two unrestricted A; the restricted third cannot hide an Attack overrun. |
| Nożownik | Prior own-turn knife hit permits B knife attack against that enemy; a hit deals critical damage (s. 105). | Feature/source and attempt-level critical damage are separate from evidence of a target/hit. No printed requirement to reuse the identical knife item. |
| Pomaganie: skill/tool | Helper's A; helper succeeds at DC 10 in chosen skill/tool; ally's next matching check gains advantage until helper's next turn start. GM determines feasibility (s. 30). | Grant tied to helper, ally and skill/tool; no automatic advantage on unrelated checks or saves. |
| Pomaganie: attack | Helper distracts enemy within 1.5 m; chosen ally gets advantage on next attack against that enemy. No helper test specified (s. 30). | Measure helper-to-enemy, not helper-to-ally. Printed paragraph gives no explicit expiry; no imported D&D expiry without WKK decision. |
| Wyczekanie | Spend A to declare trigger plus planned action; can perform that action using R after trigger resolution, before own next turn (s. 30). | Initial A and later R are separate, linked commits. Do not charge another A for the payload or R just for preparing it. |
| Readied Attack | Drugi/Trzeci atak specify own-turn Attack action (s. 68, 87). | Off-turn prepared attack does not automatically gain own-turn multiattack. Evaluate actual timing; don't universally define every reaction as one attack irrespective of feature text. |
| Second item interaction | Requires Używanie [A] after the free interaction has been used (s. 25, 31). | Resolve I-versus-A using current record; never debit both for the same physical interaction. |
| Wounds | Significant wound prevents performing R; serious prevents performing B (s. 32). | A capability prohibition, not deletion of grants or a retrospective extra spend. |
| Ordinary turn resources | A/B/I and ordinary Attack capacity belong to own turn; R recovers next own-turn start (s. 22–23, 25, 37). | Leftover A is harmless. R must remain accessible off-turn. No automatic End Turn on reaching zero. |

## 4. Boundaries established by the investigation

The absence of a recorded action is not evidence that no action happened. Features requiring no prior movement or
attack (e.g. Pewny strzał, NOE s. 105) must use actual relevant records plus normal player/GM adjudication when
those records are missing. Do not award effects because a decorative A counter happens to remain at one.

No general RAW rule was found rewarding leftover A/B/I or converting them into automatic Unikanie, a prepared
reaction, extra movement or next-turn credit. Named longer-lived effects and R are tracked separately. A narrated
action with no corresponding input remains manually resolved, and leaving its counter untouched does not invalidate
the turn or require a warning. Mixing manual and automatic resolution still needs an optional “already resolved /
record only” path to avoid duplicating effects, ammunition, healing or costs when the user later records it.

An attack roll, a whole Attack action and a revised result are three distinct units. A generic `postUseActivity`
listener cannot distinguish every Attack continuation, action replacement, ready payload or custom B attack. Use
existing structured activation/cost results and add explicit context adapters; do not parse chat labels as state.

Follow-up source check for the GM's permissive grouping proposal: `combat/zdolnosci-akcje.mjs::dodatkowyAtak` passes
`flags.<module>.dodatkowyAtak` into the usage message while reusing the ordinary weapon activity. `_jestDodatkowy`
already follows the associated origin message. Therefore a stored `activation.type === "action"` is not sufficient
proof that this particular execution spent A. `weapons/fire-modes.mjs` also supplies explicit `fireMode` flags;
`combat/po-rzucie.mjs` supplies revision ancestry. These are practical trusted exclusions for §8.6.1's fallback.
The numerical traces there are model walkthroughs, not runtime tests of an implemented M8 classifier.

Follow-up for the proposed in-window payment selector (§8.6.2):

- `combat/cover.mjs::_patchAttackConfigDialog` and `combat/przycelowanie.mjs::_patchOknaAtaku` already extend the
  native configuration fields and `_buildConfig`; the latter stores a chosen target part on roll options and charges
  its B in the later roll hook. The UI extension mechanism exists; this is source evidence, not a tested new selector.
- dnd5e `RollConfigurationDialog` also exposes `dnd5e.buildAttackRollConfig` with app/form data; the final
  `postAttackRollConfiguration` lifecycle is shared by configured and `configure:false` paths. Defaults must live
  outside rendering, and changing/rendering a selection must not spend resources.
- `combat/zdolnosci-akcje.mjs::dodatkowyAtak` currently charges B **before** the ordinary weapon use/dialog.
  `actors/actions.mjs` also charges native B activities at `postUseActivity`, which the host can fire before a later
  attack configuration. Final A/B override and cancellation require reconciling those early spends, not adding a
  competing final cost. Current Promocja activity validation also blocks before the dialog outside Berserk.
- `combat/grip.mjs` supplies native offhand modes only with two qualifying light weapons. Offhand damage mode is
  not interchangeable with every B route. Przycelowanie in the same roll can have an additional B cost; a Promocja
  plus Przycelowanie combination needs the combined budget, not two independent “one B available” checks.
- `combat/melee-maneuvers.mjs::_resolveTarget` calls the **target's** `rollSavingThrow`, not the attacker's attack
  roll. NOE s. 252 expressly permits Wytrącenie as an attack replacement. Disarm followed by an axe attack with
  Drugi atak uses two slots of one A, although the attacker has only one attack-roll configuration. The existing
  maneuver chooser is the appropriate place for an optional source/cost choice; no extra selection popup is needed.

Timer/notification behaviour is UI instrumentation. The GM confirmed: count all unpaused own-turn time, including
GM rulings and reaction resolution; pause only with Foundry pause; no penalty. Next/start sounds are local and
one-shot. This neither adds a WKK combat time limit nor changes the six-second fictional round.

Follow-up for the accepted Attack Option direction and manual Nożownik fallback:

- GM accepted bounded grouping with an override in the existing roll window; fast rolls intentionally use the
  same defaults. No new selector or headless cost classifier has been implemented by this audit.
- GM confirmed positively verified Nożownik takes preference over Promocja when the generic default reaches B:
  same B cost, critical damage on hit. Missing evidence is insufficient for automatic preference; explicit source
  intent and the higher-priority ordinary A paths remain preserved. This is default policy, not a new RAW benefit.
- `combat/zdolnosci-akcje.mjs::_celNozownika` reads a single targeted successful knife result; `atakNozownika`
  targets that victim and creates a target-specific critical intent. `config/sztuczki-ataki.mjs::zapowiedzPasuje`
  rejects a missing/mismatched target UUID. Targetless explicit Nożownik therefore needs new per-attempt effect
  provenance; simply calling the existing target-bound helper cannot satisfy the agreed fallback.
- Core `client/helpers/interaction/client-keybindings.mjs` registers `core.target`, default `KeyT`, and exposes
  `game.keybindings.get(namespace, action)`. `client/applications/sidebar/apps/controls-config.mjs` supplies public
  `ControlsConfig.humanizeBinding(binding)` and uses it for configured shortcuts. The proposed hint can respect
  remapping; unbound controls need targeting-tool guidance. This is source inspection, not a tested new hint.
- Przycelowanie's source-independent B and a primary B attack are two cost components. A prior paid aiming intent
  must link to its original transaction instead of being charged again. A source change should remove that source's
  provisional effects while retaining independent selections. The current early B writers require migration and
  cancellation handling; a dropdown alone is insufficient. Plan §8.6.3 records that implementation gate.

## 5. Operation adapter inventory

The tracker needs semantic commit points. This is a worklist derived from the current sources, not a claim that
these new adapters exist. Generic action labels alone are not enough to identify the cost of an unrelated skill roll.

| Operation family | Current entry / integration source | Accounting contract |
| --- | --- | --- |
| Attack | Native weapon/activity; custom firing modes; maneuver and M7 bonus-attack handlers | One A per Attack action; own attack-slot records; explicit B/R overrides; post-roll revisions cost no action. |
| Przyspieszenie/Bieganie | Bieganie sheet/HUD status; M7 class/sztuczka variants; new canonical movement service | One selected A/B declaration plus one grant, with status consequences as projections. |
| Unikanie | Sheet/HUD status and class/vehicle variants | Selected A/B or carrier cost; a status correction is not another action. |
| Odstąpienie | M7 class/manoeuvre variants; no complete generic shared entry in the access audit | Generic A plus actual permitted B variants; one disengage effect with source-specific expiry. |
| Badanie/Szukanie/Wpływanie | Ordinary sheet skill rolls; M7 named B handlers for appropriate features | Named action commits A/B once and launches its test. A plain skill roll without named context stays uncounted. |
| Ukrywanie się | Separate skill/status controls; M7 Szybkie nogi skill handler | Named A/B operation and actual hide outcome; no new action charge for its result revisions. |
| Używanie | Item/activity-specific services, medication, grenades, magazine operations, improvised manual use | Actual declared activation/printed exception; do not charge both wrapper and item handler. |
| Pomaganie | New generic service; retain separate stabilization/bleeding paths | A at the attempt; RAW skill/tool or attack benefit; narrative aid can remain wholly manual. |
| Wyczekanie | New generic preparation record; existing reaction-capable payloads | A on preparation; player-operated payload in R; no extra ordinary A from its native activity label. |
| I / additional interaction | Paper-doll transaction and ordinary map/object controls | I first, Używanie A for another; respect free/double operations. A raw object update is not necessarily player interaction. |
| Zryw / Szybkie ręce | Compiled special utility activities with limited uses | Ability-use resource plus unrestricted chosen A/B or restricted Używanie grant; no A merely for activating the grant. |
| Spoken/manual resolution | No input required; optional source-labelled entry/correction | No forced backfill or automatic side effects. Later named automation can explicitly attach to an existing recorded declaration. |

Costs authored under existing RAI/WKK equipment conventions retain that provenance; counting them is not evidence
that the underlying rule was printed RAW. Read-only counters must not change those costs in order to make totals tidy.

## 6. Remaining proof work before implementation acceptance

- Ordinary player permissions and concurrent-client exactly-once commits; keyboard focus for actual Ctrl+Z.
- Attack instance prototype: split movement, Drugi/Trzeci atak, Zryw and restricted grants, replacements and firing modes;
  awaited commitment, cancelled final configuration, lost acknowledgement and pending/manual accounting fallback.
- Implemented Help/Ready flows, one-use grants, expiry, Fuks outcome changes and declaration-only/manual paths.
- Timer pause/reload/hidden-tab maths, privacy-safe initiative counts, automatic skips, first connection and native/M8
  sound deduplication. Source inspection of native audio isn't a tested M8 notification component.

These are implementation gates in the M8 plan. The successful probes above do not mark these future components complete.

## 7. Final-review evidence, 2026-11-02

Source revision `3ec33f0`, Foundry 14.369 / dnd5e 6.0.6. A second disposable world was created through
`fvtt world:create m8-review --fixture=skirmish`: `agent-m8-review-20261102`. Only sandbox documents/settings were
changed. The world and its GM context were removed with guarded `fvtt world:delete ... --stop` after the probes.
Campaign and Poligon weren't modified. No production module source was changed.

### Native terrain measurement

Actual Region documents and an actual fixture PC token; scene grid set to 1.5 m. Measurements used
`Token.createTerrainMovementPath` followed by `Token.measureMovementPath` for a single square of walking.
This was a native API probe, not a test of a new M8 preset, a hand-drawing interaction or player permissions.

| Configuration | Physical distance | Native cost |
| --- | --- | --- |
| No terrain | 1.5 m | 1.5 m |
| Overlapping `dnd5e.difficultTerrain`, types `slope` and `rocks` | 1.5 m | 3 m |
| Actor ignores `slope`, rubble remains | 1.5 m | 3 m |
| Actor ignores both `slope` and `rocks` | 1.5 m | 1.5 m |
| Two overlapping generic `modifyMovementCost` behaviours, walk ×2 each | 1.5 m | 6 m |
| One native difficult Region, host automation `full` | 1.5 m | 3 m |
| Same Region, `noBlocking` | 1.5 m | 3 m |
| Same Region, `none` | 1.5 m | 1.5 m |

The original automation setting and ignored types were restored; temporary Regions were removed. These results
support the handoff's specific native preset and manual-mode contract. Generic multipliers must not be substituted
for normal difficult terrain. Missing NOE cause keys and feature-to-immunity mapping remain implementation work.

The actual targeting binding was also read through `game.keybindings.get("core", "target")` and formatted using
`foundry.applications.sidebar.apps.ControlsConfig.humanizeBinding`; this returned `T` for the default `KeyT`.
No binding was changed. A remapped/unbound M8 hint remains an implementation acceptance case.

### Existing action tests

`fvtt quench --profile=sandbox --filter=akcje`: **12 total, 12 passed, 0 failed**, one existing action batch.
This covers current B/R warning arithmetic, wound/incapacitation restrictions, extra B, turn/round gates, marker
creation/owner expiry anchor and same-client serialization. It does not establish cross-client serialization or
test a proposed A/I/Attack ledger. The runner reported 15 compatibility messages attributed to `other` and zero
attributed to the module; this isn't a claim of a warning-free whole-system run.

### Additional source findings and design resolutions

- dnd5e `module/dice/basic-roll.mjs::buildConfigure` calls synchronous hooks. Configured and fast rolls share final
  configuration, but an async hook isn't awaited. `module/documents/activity/attack.mjs::rollAttack` explicitly
  awaits configuration before evaluation, providing a candidate seam for a managed awaited adapter. This adapter,
  its bounded failure path and authority election have not been implemented or tested by these probes.
- `weapons/fire-modes.mjs::_canUseBurstMode` reads item-scoped `lastBurstUse`; changing weapons can escape that
  local history. RAW limits on s. 119–120 must be accounted across the actor/round; Grad ołowiu (s. 103) supplies the
  repeated-KS exception. GM confirmed D15: timing/count/mode violations become advisory, retaining existing
  jam/damage/ammunition handling. This is a planned integration correction, not a delivered fix.
- Core `client/documents/combat.mjs::_onUpdate/_playCombatSound` already handles `nextUp`/`yourTurn` using
  `CONFIG.Combat.sounds` and interface audio. `client/game.mjs` registers `core.combatTheme` as a client setting.
  Native `nextCombatant` skips defeated entries as configured but doesn't filter visible order; native sound
  playback has no pause guard. M8 must coordinate these existing sounds, not add an independent duplicate emitter.
- Full RAW search added movement consumers: Brutalny cios's -6 m until next own-turn start; Podstępny atak's rolled
  reduction until next own-turn end; Kocie kości fall/test paths; Celowanie's no-movement context; Missisipi's swim
  advantage. NOE s. 25 surprise/pre-combat exceptions also constrain initial resource handling.
- GM confirmed D14: movement grants stay numerical at declaration; later effective-Speed changes adjust the base
  allowance once. Move 3 from 9, Przyspieszenie +9, wound -4.5 yields 10.5 remaining of 13.5; reverse declaration
  order yields 6 of 9. These are specified model vectors, not runtime tests of an implemented movement ledger.
- Padnij spends the remainder at that moment (s. 26); no added rest-of-turn prohibition on later printed grants.
  Przyspieszenie/Bieganie still require no prone condition. The explicit two-size grapple-drag exception (s. 35)
  remains; don't charge both the equivalent half-Speed summary and an extra cost for the same penalty.

The handoff's §13 is the concise reviewer entry point. Open mechanical combinations retain manual resolution;
the final review doesn't certify the unimplemented tracker, source selector, Help/Ready or timer as runtime-ready.

## 8. Follow-up decisions and reference check, 2026-11-03

These are source checks and specified model examples, not additional runtime tests. The sandbox used above remains
deleted. No production implementation was changed for these decisions.

- NOE's credits identify SRD 5.2.1; its introduction describes substantial changes to the source game. The checked
  [official SRD](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf), p. 188, contains the
  special-Speed subtraction rule supplied by the GM: changing mode subtracts movement already used from the new
  Speed. This resolves the basic 9-walk/18-swim example under selected reference policy D17. Fixed-grant eligibility
  across modes and other cost combinations remain separately identified; no wholesale 2014/2024 rule import.
- NOE s. 87 restricts Zryw to own turn; the GM acknowledged retaining this restriction. Ordinary off-turn Ready
  doesn't permit Zryw or combine an Attack and grenade into a two-action R. A balance rationale for the restriction
  is an inference, not a cited author explanation. Separate prepared responses share the actual R budget.
- NOE s. 22 contains the one-action-at-a-time wording, also found on SRD p. 10. The GM selected permissive
  suspension/resumption of unfinished Attack actions. Keep that table interpretation's provenance; the source
  doesn't explicitly supply the whole Attack → Help → resume Attack sequence.
- The earlier D18 proposal retained ordinary unused movement and produced a 22.5 m reaction example. **Withdrawn
  after the subsequent RAW rereading in §9 below.** This isn't the current movement contract. Core history clears
  still require archival/context handling, but don't establish movement carryover.
- W14's proposed ordinary/Przyspieszenie allocation vote depended on that withdrawn carryover policy. It is now
  withdrawn for that example. This review used the s. 29 Przyspieszenie duration; §11 subsequently identifies its
  conflict with s. 21. Ordinary movement still isn't banked, but grant duration/eligibility can't be settled from
  this historical vote. Bieganie's different printed duration must be preserved and examined separately.
- D19 resolves Berserk approach by paid cost and human route-purpose confirmation: 4.5 physical metres of difficult
  approach can spend Speed 9; necessary detours are valid. A separate A Przyspieszenie grant doesn't increase the
  approach threshold to total movement capacity. D20 retains ordinary occupied-space consequences after Gladiator
  landing rather than granting free displacement.
- D21 keeps Ready lightweight: fictional trigger/action are declared at the table, with optional structured notes
  and a generic/preferred Reaguj path. Passing an opportunity doesn't consume R or the preparation. The application
  doesn't parse triggers or require a GM approval click. Arming an automated R context isn't itself a spend.
- Grid/height consistency is confirmed; the proposed default remains 1.5 m diagonal steps plus NOE's larger-axis
  height shortcut. New-map axis-aligned, 1.5 m jump gaps are a proposed authoring convention. Snapping token
  positions doesn't require rounding the RAW maximum: 4.2 m mustn't become permission to clear a 4.5 m gap
  without an explicitly adopted WKK extension.

## 9. RAW-first carryover correction, 2026-11-03

Historical correction based on the detailed s. 29 Przyspieszenie text. Its conflict with s. 21 was identified in
the supplied November discussion (§11). D26 now explicitly selects s. 21 as RAI/WKK; the following s. 29 profile
is preserved as historical reasoning, not the active duration contract.

Read the complete adjacent clauses in NOE `Walka`, rather than inferring duration from a tracker reset:

| Source | What the printed wording establishes | Handoff correction |
| --- | --- | --- |
| NOE s. 26, Ruch i pozycja / Dzielenie ruchu | Ordinary movement and splitting it around actions/reactions are scoped to own turn/the same turn. | No bank of unused ordinary movement for a later turn's reaction. Withdraw earlier D18 retention. |
| NOE s. 29, Przyspieszenie | Additional movement for the current turn. | An own-turn declaration doesn't bank unused movement for a later reaction. |
| NOE s. 30, Bieganie | Extra movement of 2× Speed and own attack disadvantage have an explicit next-own-turn-start boundary; ranged defence has own-current-turn-end wording. | Don't silently shorten the movement grant's duration to match Przyspieszenie. Duration alone doesn't authorize off-turn movement or settle reuse/stacking with another reaction. |
| NOE s. 30, Wyczekanie | Planned action may execute in R before next own turn; the printed escape example specifically names Bieganie. | A fresh readied Bieganie supplies 18 at Speed 9. No old ordinary 4.5, new base 9 or prior-turn movement debit is added to that grant. |

Corrected example: move 4.5 of Speed 9, prepare, end own turn. Later execute the declared Bieganie in R: **18 m**
of new movement, before terrain/other actual costs. The previous 22.5 m example lacked a RAW ordinary-carryover
basis. Under the s. 29 duration profile, base 9 + Przyspieszenie 9 followed by 12 m movement leaves no banked
remainder after turn end. That expiry profile is superseded by D26/W16's selected s. 21 duration; ordinary base
movement carryover remains rejected. Attribution/reuse of older grants is partial W06, not automatically resolved
by selecting their later expiry.

The claim that *every* movement grant expires at own-turn end would also be too broad: Bieganie expressly states
a later boundary. The remaining W06 issue is whether/how an older unspent Bieganie grant can fund or augment a
separately permitted reaction, and its off-turn ranged-defence expiry. Neither automatic reuse nor premature
deletion is established by these passages. Keep the combination manual/unverified pending support or an explicitly
classified table decision. This correction changes the plan, not production code or the earlier runtime evidence.

## 10. Remaining-open and omission check, 2026-11-03

Source review only; no new runtime test or production-code change.

- **Post-Berserk fatigue was missing from the handoff's permission inventory.** NOE s. 67 restricts actions until
  the end of the actor's next turn. NOE s. 21 lists A/B/I/R as action types; the fatigue clause doesn't enumerate
  them. The GM subsequently confirmed all A/B/I/R (D24; W15 resolved). The printed restriction doesn't set Speed
  to zero or impose the other
  effects of Obezwładnienie. Its owner-turn-end expiry must survive the next turn's fresh resource grants.
- `config/class-features-data.mjs` has `afterEnd: "noActionNextTurn"`; `actors/class-state.mjs` emits a fatigue
  card on duration expiry. Its generic `_announceEnd` only posts the state-end announcement; condition interruptions
  call that generic path. No timed fatigue-permission record is created here, and `config/actions-data.mjs` checks
  wound/incapacitation and B/R budget reasons, not this aftermath. M7 already lists it as deferred to M8. The plan
  now makes that integration explicit instead of assuming the card is the restriction implementation.
- Test the exact Berserk last-turn-end and aftermath next-own-turn-end boundaries during implementation; native
  duration.remaining alone isn't proof of those boundaries. Separate true mechanical endings from corrections and
  late rest cleanup, without applying a fresh penalty for an ending that happened in the past.
- Skok Gladiatora (NOE s. 70) prints movement/landing consequences without an A/B/R charge for the jump itself.
  A target save or damage result must not become an ordinary Attack action/slot merely because it is offensive.
  Deduplicate a jump transaction without inventing a once-per-turn cap. Fractional damage bands remain W08.
- The long-jump difficult-landing test is printed under Skok w dal (s. 256); Szczur's substitution refers to maximum
  distance (s. 94), while Gladiator explicitly names height and distance (s. 70). Proposed literal defaults remain
  long-jump-only substitution/test and completed 3 m damage bands; broader interpretation hasn't been adopted.
- Current wound code `combat/zranienie.mjs` applies its fixed Speed penalty to walk/fly/swim/climb/burrow, not only
  walk. No missing all-mode wound deduction was found in that source check. Current Szybkie ręce metadata uses the
  printed DEX modifier directly and carries the Używanie restriction in its rule text; no invented minimum-one use
  was found there. This doesn't establish a working restricted-action ledger; runtime/migration proof remains separate.
- A readied Bieganie grant is created at execution: a wound changing Speed from 9 to 4.5 before R yields a new
  grant of 9, not a cached 18 from declaration. This follows the existing preparation-versus-performance contract;
  it isn't another carryover policy.

Remaining questions at this review are W01 and partial W03/W06/W08; W15 was subsequently resolved by D24.
D14/W02 and D22/W13 are already selected temporal/
interleaving interpretations with explicit provenance; they aren't promoted to unqualified printed RAW.

## 11. Supplied November discussion and source check, 2026-11-15

The GM supplied a discussion containing dated messages from 2026-11-05–13 and an undated closing preference
for page 21 over page 29. Screenshots/reply targets aren't included. Incorporate the relevant conclusions in
[M8 rules](PLAN_m8_ruch_i_ekonomia_akcji.md#rules), without treating the conversation as a
formal erratum or reproducing unrelated private discussion. Source rechecked at module revision `3ec33f0`;
this is documentation/source inspection only, not a fresh runtime probe or implementation.
The GM subsequently confirmed the final comment concerns Przyspieszenie and chose s. 21 as explicit RAI/WKK
(D26). The GM also clarified that the armour answer concerns no-armour benefits, not Berserk activation (D27).

| Topic | Printed/source check | Result for the handoff |
| --- | --- | --- |
| Ordinary movement after own turn | NOE s. 26 scopes the ordinary allowance to own turn. | D18 reaffirmed: no unused ordinary remainder and no fresh base movement from Ready. |
| Readied Bieganie | NOE s. 30 explicitly gives this response in its Ready example; running adds 2× effective Speed. | Fresh grant at execution, paid by one R rather than another A. Speed 9 gives 18, not 22.5 or 27. Prior-grant overlap and off-turn ranged-defence deadline remain W06. |
| B-only actions | NOE s. 23 gives B its own permission/own-turn rules; s. 30 describes readying an action. | D25: no general off-turn B grant, no imported D&D option to Ready ordinary movement. An ordinary A version can be prepared even when a feature also offers a B version. |
| Przyspieszenie contradiction | The s. 21 table says “do początku twojej następnej tury”; the detailed s. 29 text says “w obecnej turze”. | D26 resolves W16: use s. 21, explicitly RAI/WKK. Fresh readied execution uses R and grants effective Speed at execution until next own-turn start. Speed 9 gives 9, without ordinary movement/base or a second A. Older-grant attribution/reuse remains W06; no general off-turn movement permission is created. |
| Arm/leg guards and Berserk | NOE s. 67 places no-armour conditions in Goła klata/Obłęd Berserkera's TT benefits. The accessory table is s. 113–114. `config/tt-rules.mjs` records the author's 2026-10-03 classification of guards as armour; `actors/tt.mjs` supplies that fact. | D27 resolves W17: guards disable no-armour benefits, not Berserk itself. The GM clarified the supplied answer's intended scope; don't attribute a broader activation prohibition to the author. |
| Current Berserk activation | `actors/class-state.mjs::toggleClassState` checks backing feature/remaining uses and creates the state, without an armour prerequisite. | This agrees with D27. Add no armour-based activation restriction, automatic Berserk ending or fatigue from equipping guards. Its other features retain their actual conditions; TT benefits update dynamically. |
| Rzeźnik and firearms | NOE s. 86, 98 say any weapon, provided the other hand doesn't hold a different weapon. `config/zdolnosci-walka.mjs::rzeznikDziala` tests other held weapon IDs; `combat/zdolnosci-walka.mjs` adds +3 without a melee-only filter. | The clarification agrees with the inspected code. A two-handed firearm isn't two different weapons. Preserve the modifier during attack-source refactoring; this has no new A/B/R/I cost. Runtime coverage wasn't rerun. |

Other subjects in the supplied conversation (application hosting/assets, butchering yields, point-buy and PW/KW
on level-up) don't change M8. They aren't added as new movement or action-economy implementation scope.

The GM's earlier fatigue answer is recorded as D24: all A/B/I/R prohibited through next own-turn end, without
removing movement or spending four resources. W15–W17 are resolved by D24/D26/D27. Remaining mechanical opens
at that review were W01 and partial W03/W06/W08; all were subsequently resolved or given an explicit manual
boundary in §12. Added acceptance cases cover
fresh 9 m/4.5 m reaction grants, old-grant expiry before new own-turn projection, and Berserk remaining usable in
guards while no-armour TT benefits are absent. These are requirements, not claims that the M8 service was tested.

## 12. Implementation handoff refactor and final decisions, 2026-11-15

Canonical handoff: [PLAN_m8_ruch_i_ekonomia_akcji.md](PLAN_m8_ruch_i_ekonomia_akcji.md). The old filename is a
redirect. The main plan was rewritten around current contracts, integration ownership, delivery order and
acceptance cases, rather than retaining repeated open/closed discussion. Source remains `3ec33f0`; no production
source or campaign data changed, and no new runtime probe is claimed in this refactor.

### Final answers

| ID | Confirmed outcome | Effect on older open lists |
| --- | --- | --- |
| D28 | Full movement and A/B/R/I/Attack/Help/Ready/readiness scope, delivered incrementally. | C1/C2 are no longer conditional scope proposals; technical validation still applies. |
| D29 | 1.5 m equal-cost diagonals; larger horizontal/vertical component; same convention for range, without terrain surcharge in range. | W01 resolved. Do not confuse Chebyshev with Manhattan or native EXACT with arbitrary Euclidean distance. |
| D30 | A readied movement action uses only its fresh grant. | W06/W14 old-grant allocation/reuse is closed for this workflow: Run 18, not 24 with an old 6. Ordinary carryover remains rejected. WKK provenance. |
| D31 | Grant bound to the selected Speed: walk 9, swim 18, walk-Dash +9 then walk 6 leaves swim 12. | W03 grant eligibility resolved by the explicit numeric answer, with WKK provenance. |
| D32 | Run's ranged defence ends at the end of own current turn, or at the **end of the reaction** performing it. | W06 defensive timing resolved. The GM rejected an implicit extension until the end of the other actor's turn. WKK for R. |
| D33 | Gladiator dice = completed 3 m bands of the larger length/height component, without adding them. | W08 arithmetic resolved; 4.5 m length + 3 m height means 1d6. WKK provenance. Complex trajectory permission remains normal manual adjudication. |
| D34 | Independent movement surcharges add; ordinary difficult terrain applies once. | W03 combined costs resolved: 1.5 m crawl + DT costs 4.5; with a separate grapple-drag surcharge 6. WKK for the combination. |

The remaining Skoczek height/landing questions have explicit conservative boundaries in the handoff: no automatic
DEX high-jump extension or universal landing test. These are specified manual/printed paths, not another
unresolved gameplay vote. No mechanical answer is required from the GM to start the next implementation stage.

### Additional source findings

| Source | Verified observation | Required implementation consequence |
| --- | --- | --- |
| Core `common/grid/square.mjs::_measurePath` | EQUIDISTANT takes the largest component. EXACT weights diagonal steps; `segment.euclidean` separately uses `Math.hypot`. | Test numeric paths; reuse native measuring and units rather than equating the label EXACT with all Euclidean measurements. |
| dnd5e `module/documents/token.mjs` | Crawl and walk-fallback swim/climb add the segment distance to cost. Jump derives terrain difficulty 1; fall has cost 0. | Native additive pieces can be reused, but type/cause mapping, D34 deduplication and NOE jump maxima still need adapters. |
| dnd5e `module/config.mjs::activityActivationTypes` | Ordinary action/bonus/reaction entries have no generic consumed pool; legendary/mythic have explicit resource consumption. | There is no ordinary native A/B/R pool to silently reuse or debit alongside M8. Preserve unrelated creature resources. |
| `config/okolicznosci-ataku.mjs` | Own running attack disadvantage reads `bieganie`; ranged defence additionally requires `turaCelu`. | Split the defensive permission/source from the long-lived own penalty. Add active reaction-execution evidence and its end; do not fake all of `turaCelu = true`, which would affect other conditions. |
| `config/conditions.mjs`, `actors/tt.mjs` | Running currently has a next-own-start status lifecycle. | Ending reaction defence must not prematurely remove its own-attack penalty or unrelated class protection. A repaired legacy status isn't a new movement grant. |
| `postoj/przekaznik.mjs::doMG` | The current non-GM relay queues a request and returns null, not a correlated authoritative result. | If reused, add/validate stable operation IDs, sender authorization and bounded acknowledgement; a returned request isn't proof of a committed spend. |
| `postoj/przekaznik.mjs::_onUpdateActor` | Its cleanup references `_del`; no declaration/import was found in that module. This is a source finding, not a reproduced runtime failure. | E0 must exercise request cleanup if that transport is reused and repair/prove the path. Do not assume the existing relay supplies a complete transaction layer or expand unrelated M5 work unnecessarily. |

For the “like 5e” answer, checked the official
[SRD 5.2.1](https://media.dndbeyond.com/compendium-images/srd/5.2/SRD_CC_v5.2.1.pdf), Dash p. 180 and Speed
p. 188, alongside NOE s. 29–30. It specifies choosing a Speed for Dash and subtracting prior movement on a mode
switch, but contains no numeric mixed-grant example settling the supplied vector. Therefore D31 is attributed
to the GM's explicit 12 m answer, not an invented unequivocal 5e ruling. No forum answer is used as rules authority.
The older live-grant clause from 2014 does not replace the already-selected D14 fixed-value policy.

### Source map for the implementer

| Integration | Current entry points |
| --- | --- |
| Shared actions | `actors/actions.mjs`, `config/actions-data.mjs`, `combat/sygnal-naruszenia.mjs`, `combat/czas-efektu.mjs`. |
| Native movement | Core `client/documents/token.mjs`, `client/documents/combat.mjs`, `client/canvas/layers/tokens.mjs`; dnd5e `module/documents/token.mjs`, `module/canvas/ruler.mjs`, `module/data/terrain-data.mjs`. |
| Native attempts | dnd5e `module/documents/activity/mixin.mjs`, `module/documents/activity/attack.mjs`, `module/dice/basic-roll.mjs`; synchronous hooks aren't awaited commits. |
| Early writers and results | `combat/zdolnosci-akcje.mjs`, `combat/przycelowanie.mjs`, `combat/cover.mjs`, `combat/melee-maneuvers.mjs`, `weapons/fire-modes.mjs`, `combat/po-rzucie.mjs`, `combat/sztuczki-ataki.mjs`. |
| Inventory interactions | `actors/doll-model.mjs::moveCost`, `actors/doll.mjs::costContext/_moveLines/_postLines`, `config/validation.mjs`. |
| Terrain and M6 | `scenes/difficult-terrain-hint.mjs`, `scenes/transitions.mjs`, `scenes/woda.mjs`, `scenes/wspinaczka.mjs`, `docs/Ruch-i-teren.md`. |
| M4 movement owner | `pojazdy/jazda.mjs::budzetJazdy`, `pojazdy/paleta.mjs`, `pojazdy/jadacy.mjs`, `pojazdy/jezdziec.mjs`, `combat/kotwica-tury.mjs`; replace an old ordinary-mount debit/reset atomically when enabling the new one. |
| Lifecycle/UI | `actors/class-state.mjs`, `actors/tt.mjs`, `actors/sheet-shell.mjs`, `actors/ability-hotbar.mjs`; core `client/documents/combat.mjs` owns native turn sounds. |

Final verification for this refactor is documentation integrity and source inspection. New T01–T46 are acceptance
requirements for future work, not tests claimed to have passed. Existing runtime evidence stays in §2/§7.
Documentation validation passed for new/modified content across ten files, explicit canonical anchors, T01–T46
and E0–E9. Four unchanged historical link/whitespace findings were confirmed against HEAD, outside this refactor's
modified content. The instruction path checker reported 21 files / 1816 references / zero dead references.
