# HANDOFF — M4 Pojazdy (2026-10-19)

Delete this file when M4 part 2 is finished (P5–P6) or vetoed and closed.

## State

- **Part 1 (E0–E8)** and **part 1b (E9–E11)** implemented and committed on `master` (not pushed). Code in
  `scripts/pojazdy/` (file map in `index.mjs`), API `game.neuroshima.pojazdy`, pack `pojazdy`, migration
  `migration/migrate-pojazdy.mjs`.
- **Part 2, P1–P4** implemented: the chase board rebuilt as a folded road (`scenes/poscig*.mjs`), the road metric
  (`scenes/droga.mjs`), aimed bursts and road-space areas (`scenes/poscig-serie.mjs`). API `game.neuroshima.poscig`
  (`.droga`, `.serie`).
- **P5 (chase mechanics)** — the GM answered all eleven questions on 2026-10-29 (`PLAN_m4_pojazdy.md` D34–D41,
  §6.2.5). **The final pass is planned in `PLAN_m4_pojazdy.md` §0.1** (S0–S1 creature/rider scale, K1–K3 driver
  palette and part-1 gaps, KT turn anchors, P5a–P5e, P6, W0–W5 mounts) — start there, not here.
- **Campaign:** the part-1 migration ran once (GMT400, Hammer Posterunku; Roll20 art in `flags.<mod>.pojazd.zetonPrzed`,
  restore with `game.modules.get("neuroshima-2026-overrides").api.migration.przywrocZetonyPojazdow()`). No chase board
  exists in the campaign, so the board geometry change needs no migration.
- **Poligon:** stations **Garaż** (part 1) and **Pościg** (rebuilt 2026-10-19 for the folded road, probes D21–D31).
- **Tests:** see `PLAN_m4_pojazdy.md` §11 (Quench, e2e `pojazd`, `poscig`, `poscig-jadacy`, `nevada-art`, `urban-art`,
  release gate).

## Individual wreck art for all 14 vehicles (2026-10-28)

The GM approved the original sedan wreck and replaced shared categories with one wreck per
vehicle. The accepted sedan WEBP is unchanged; thirteen new variants use their accepted base
tokens for identity/geometry and the sedan wreck for style only. All 53 catalog images are
delivered; seven vehicle sounds remain. Sources, complete built-in image-tool prompts,
frame measurements and before/after sheet: [wreck hand-off](dev/art/m4/wraki/README.md).
Thirteen new wrecks await GM review; no new wreck portraits were requested.

Runtime selects through `GRAFIKI_WRAKOW` by chassis ID. It preserves the texture transform,
backs up the complete original texture, and restores it on undo, including legacy backup
support. Missing art retains the darkened original fallback. Abrams keeps its width fit,
.5/.4 anchor and full gun overhang. Damaged turrets are baked into the wreck sprite, and
the separate healthy turret disappears. Hover cannot reveal/fade a wreck interior.

**Garaż → Karta prób → Grafika: Wraki — wszystkie pojazdy**, probe `grafika-wraki`:
one persistent 14-pair comparison (28 vehicles). The first wreck scene upgrades in place;
subsequent adoption preserves manual edits. Other vehicle preview scenes are retained.
Garage rebuild remains 16 scenes. Occupant sizes are deferred as requested by the GM.
Live Poligon upgrade preserved all six old comparison tokens/actors and the complete
documents of the other 15 scenes (200 tokens). Garage now has 16 scenes / 228 tokens.
Both GM and Gracz 1 are on the gallery, all 28 native textures loaded; separate healthy
turrets are present only on the two intact armored vehicles. No campaign documents changed.

Checks: `npm test`, Quench **42/42**, E2E **20/20**, **26 screenshots**, no console errors.
Report `logs/e2e/2026-10-28T01-55-11/report.json`: all fourteen zero-HP/restore paths,
complete texture transforms, armored turrets, GM hover, player visibility, navigation,
re-adoption/manual edits and a complete sandbox Garage reset. Screenshots 25–26 show
the wreck overview and Abrams close-up. Remaining older shared-category entries are history.

## Vehicle token undo (2026-10-22)

Fixed the independent seat/footprint undo entries in `zeton.mjs`. The active GM's post-animation
`moveTokens` now carries `neuroPojazdSync`; `historia.mjs` extends the configured token layer at setup
and omits only those derived updates from `storeHistory`. All other events delegate to the original
layer, preserving core's origin, dimensions, rotation and recorded-path undo options. This also stops
player movement from adding passenger-only undo entries to the GM's history. Undo restores the root
vehicle; the existing synchronization recomputes seats from its restored source, including when undo
interrupts a forward animation.

This is **token undo**, not a rollback of gameplay: chat cards, already-applied damage, actor-side turn
distance (`tura.droga`) and the moving-in-combat stamp are not rewound. Those require a separate
transaction policy for actor state and subsequent actions; do not describe this fix as a combat rewind.

Verification:

- Red before the fix: `pojazd-undo` created two entries for one move (expected history 9, got 10),
  `logs/e2e/2026-10-21T22-47-14/report.json`.
- Green: `npm test`; vehicle Quench **30/30**, including four new history contract tests; sandbox e2e
  **pojazd-undo**, **pojazd**, **poscig-jadacy**, no console errors. Actual Ctrl+Z, rotation, driver/observer
  agreement, successive undos, ordinary token undo, no replayed driving cards, undo during animation.
  Report: `logs/e2e/2026-10-21T22-50-27/report.json`.
- Screenshot: `logs/e2e/2026-10-21T22-50-27/pojazd-undo-01-gm-vehicle_restored_by_undo.jpg`.
- Related chase Quench **71/72**: the pre-existing uncommitted `zima` theme adds `snow`, while
  `poscig.test.mjs` expects the old exact key set. Independent of undo; scenery changes were preserved.

GM check: **Garaż → Cofanie ruchu** (`undo` probe). Reload the Poligon tab to load the new layer and
clear the old client-local undo stack; no station reset or compendium rebuild. The running Poligon was
inspected only, and its graphics work was preserved.

## Seat window follows selection (2026-10-22)

The GM boarding failure was stale UI state: `otworzMiejsca` resolved the rider only when opening
the window. Selecting a character afterward never changed `app.jadacy`. GM ownership and the
boarding relay already supported PCs and NPCs; targeting is a separate combat operation.

`okno-miejsc.mjs` now follows `controlToken`, updates the rider immediately and queues one redraw
after core finishes releasing/selecting tokens. Exactly one owned non-vehicle token is required;
without such selection, the existing unique assigned-character fallback remains. Multiple selected
characters no longer silently pick the first one. There is no additional character picker. The
window identifies the rider, explains selection versus targeting, clears deleted riders and closes
for a deleted vehicle or canvas teardown. Actions capture their rider while pending; rejected
boarding leaves the window open. Reopening awaits the previous close so its teardown cannot delete
the new instance from Foundry's application registry.

Verification:

- Red before the fix: `pojazd-miejsca` timed out waiting for the already-open window to follow
  selection; `logs/e2e/2026-10-22T14-22-17/report.json`.
- Green: `npm test`; sandbox e2e **pojazd-miejsca** and **pojazd**, no console errors, no module
  compatibility warnings. Report: `logs/e2e/2026-10-22T14-29-52/report.json`.
- Regression coverage: actual canvas click after opening, selected PC versus targeted NPC,
  vehicle HUD first, NPC boarding/seat change/exit, selection before opening, switching and clearing
  selection, multiple selection, targeting alone, player permissions/presence ownership, deletion.
- Screenshot: `logs/e2e/2026-10-22T14-29-52/pojazd-miejsca-01-gm-GM_character_selected_after_opening_seats.jpg`.

GM check: reload the Poligon tab, then **Garaż → Miejsca (D4)** (`okno` probe). Open the vehicle's
**Miejsca**, select one character token on the map, then click a free seat. The name in the window
should follow selection without reopening it. No station reset or compendium rebuild is needed.

## For the GM

### Skateboard, 120% adjustment and first wreck (2026-10-28)

All fourteen vehicle sets are delivered. Skateboard portrait and token: `dev/art/m4/deskorolka/`.
On the GM's request it is enlarged to 120%: 180×216, footprint 0.6×0.72 squares, visible
silhouette 0.36×1.03 m. Three live copies retain centres/rotations; rider size unchanged,
196 unrelated tokens preserved. Standing driver still counts as its one crew member; the
catalog test now excludes only the truck's additional cargo deck. The GM retained bicycle art
and deferred occupant-size tuning: car looks acceptable, bicycle rider looks too small.

First category wreck `tokens/wraki/pojazd-osobowy.webp`, 450×900 RGBA, shared by sedan,
Hammer and buggy. **Garaż → Karta prób → Grafika: Wrak auta osobowego**, `grafika-wrak-osobowy`:
three intact and three real wreck actors. Added without reset, preserving fifteen scenes and
200 tokens. Generator now makes sixteen scenes (Parking + fourteen vehicle previews + wrecks).
Native wreck art at zero HP and restoration use the existing runtime unchanged. Additional
E2E covers zero HP → native wreck → original token restored. Quench **42/42**, E2E **20/20**,
`npm test` green. Report `logs/e2e/2026-10-28T01-12-07/`, 25 screenshots, wrecks 25.
Six known core scrolling-text messages are allowed by the runner; no module errors.
[Wreck sources and prompts](dev/art/m4/wraki/README.md). Three wreck categories + seven sounds remain.

### Bicycle artwork (2026-10-28, retained; rider-size tuning deferred)

Thirteenth set: mustard steel commuter bicycle, silver fenders, one black saddle and rear wire
basket. Portrait 1024×1024, transparent token 180×450; footprint 0.6×1.5 squares, visible
silhouette 0.72×2.19 m. Saddle anchor 0.50/0.31, open/above presentation, no engine/exhaust.
**Garaż → Karta prób → Grafika: Rower**, probe `grafika-rower`: empty, occupied and original-scale
reference figure. Parking bicycle updated at its original centre. Thirteen existing scenes and
190 unrelated tokens preserved; generator now makes fourteen scenes including Parking.
Moped final set accepted by the GM after the 120% enlargement.

`npm test` green, Quench **42/42**, E2E Garage **18/18**, no module console errors.
Report `logs/e2e/2026-10-28T00-26-06/`, 23 screenshots, bicycle 12. Real panel navigation,
visible/targetable rider, movement/rotation, boarding/exit, preservation and reset covered.
[Files, prompts and measurements](dev/art/m4/rower/README.md). Queue: 6 images + 7 sounds.

### Moped artwork (approved 2026-10-28)

The twelfth set: faded turquoise step-through moped, ivory leg shield, one black saddle and
rust-red rear milk crate. The GM approved the final token and in-game fit after the original
preview was enlarged to **120%**, 2026-10-28:
portrait 1024×1024, token 180×468, footprint 0.6×1.56 squares (0.90×2.34 m), visible silhouette
0.86×2.25 m. Driver size and texture scale unchanged. Three live copies retain their centres
and rotations, including the manually turned 45° example; 187 other tokens preserved.
Other game statistics unchanged. Driver anchor 0.50/0.36, exhaust 0.25/0.18.
The seat uses D32 open/above presentation: always-visible full rider, targetable, no dot or
hover fading. Existing custom seat layouts are not migrated.

**Garaż → Karta prób → Grafika: Motorower**, probe `grafika-motorower`. Empty and crewed
vehicles, portrait, original-scale dnd5e reference figure. Single-seat previews use two vehicle
variants, avoiding duplicate occupied examples. Generator: Parking + twelve previews. Installed
without reset, preserving all twelve earlier scenes and 186 tokens; added a Parking moped.

`npm test` green, Quench **42/42**, sandbox Garage E2E **17/17**, no module console errors.
Report after 120% resize: `logs/e2e/2026-10-28T00-15-54/`, 22 screenshots, moped screenshot 11. Coverage: real
panel navigation for GM/player, visible/targetable rider, movement/rotation, boarding/exit,
original scales, preserved previews and regeneration. [Files, prompts and measurements](dev/art/m4/motorower/README.md).
Queue: 8 images + 7 sounds.

### M1A1 Abrams artwork and separate turret (approved 2026-10-27)

The eleventh vehicle set: portrait, closed/cutaway tokens, underlying hull and a separate turret.
Full art 780×2100, logical hull viewport 780×1680; footprint 2.6×5.6 squares, native texture
width fit / anchor 0.5,0.4. The long gun overhangs the footprint. Visible hull 3.65×7.93 m,
gun-forward length 9.83 m, based on primary M1A1 specifications. Four original-scale crew
positions: centred forward driver, commander behind gunner on vehicle-right, loader on left.
Source pivot 389,884; crop 70,458,638,1588; crop pivot 319,426. Exact lossless layer reassembly.
The existing Bradley renderer also drives this turret; no aiming or gunnery mechanics added.
Future independent turning must rotate all three turret crew anchors around the same pivot.

**Garaż → Karta prób → Grafika: M1A1 Abrams**, probe `grafika-czolg`. Empty/occupied vehicles,
portrait, empty interior and reference figures. Generator: Parking + eleven previews. Installed
without reset: all eleven old scenes and 175 unrelated tokens preserved; the old Parking tank
was upgraded at the same centre. Campaign untouched. Native Miejsca background clips the gun
overhang without compressing the interior, and buttons match the four painted cushions.

Validation: `npm test`, vehicle Quench **42/42**, sandbox `garaz-grafika` **16/16**, no module
console errors. Report `logs/e2e/2026-10-27T22-35-25/`, 21 screenshots, Abrams 15–17 and 20–21.
Actual animated turning, vibration, mirrored/unequal scales, visibility, redraw/delete, four
occupants, seat window, boarding/exit, preservation and fresh regeneration covered.
[Sources, full prompts, measurements and interactive pivot preview](dev/art/m4/czolg/README.md).
Queue: 10 images + 7 sounds. The existing game engine profile is unchanged; real M1A1 uses a turbine.

### Bradley separated turret artwork (2026-10-27)

The GM approved the Bradley body and 3+6 layout, then requested a separate rotating graphic
without implementing gunnery. Exact extracted turret: `tokens/pojazdy/wieze/bwp.webp`, 495×627;
underlying hull: `tokens/pojazdy/kadluby/bwp.webp`, 720×1350. Crop origin 81,586, bearing pivot
300,790 in the hull / 219,204 in the crop. Lossless reassembly matches the approved token exactly.

`pojazdy/wieza.mjs` adds one primary mesh per native layered vehicle; it follows the hull's
transform, visual state and engine shake, disappears in X-ray and for custom art/wrecks, and
is disposed on redraw/deletion. The full token texture remains the unloaded-layer fallback
and sheet image. No independent angle, targeting hook or gunnery rules; D33 stays post-beta.
Future aiming must also turn the two turret-seat anchors around the same bearing.

Probe **Garaż → Grafika: M2 Bradley**, `grafika-bwp`. Sources, metadata and an interactive
graphics-only pivot review: `dev/art/m4/bwp/README.md`, `layers-review.html`.
`npm test` green; isolated vehicle pack rebuild/validation; Quench **40/40**; sandbox Garage
E2E **14/14**, no module console errors. Report and 16 screenshots:
`logs/e2e/2026-10-27T21-20-59/`, turret screenshots 15–16. Tests include actual animated
turns, engine vibration, mirroring/scaling, tint/opacity/elevation, hidden state, custom texture,
redraw and deletion without orphan meshes. Previous 3+6 boarding/navigation/reset checks remain.

### M2A2 Bradley artwork (approved 2026-10-27)

The GM replaced the initial generic IFV concept with a specific M2 Bradley. Delivered portrait
and lossless roof/cutaway pair 720×1350: one hull driver, two turret crew, six rear dismounts.
The center three troop seats are removed; three seats per side face inward. Catalog capacity 9
is an explicit WKK choice for the M2A2, replacing generic NOE capacity 12. Frame 2.4×4.5 squares;
visible body 3.385×6.55 m. Whole upper turret registered over the existing basket; identical alpha
and exterior pixels outside the upper-assembly mask. Optional zone `obroty` initializes facing
on boarding/seat changes; existing individual rotation continues to work.

**Garaż → Karta prób → Grafika: M2 Bradley**, probe `grafika-bwp`, portrait/empty/occupied
versions and nine stock figure references. Parking plus ten previews are rebuildable. Installed
without reset, preserving all 10 old scenes and 155 old tokens. No campaign migration.

Checks: `npm test` green (the previous unrelated scan failure is now resolved in the shared tree),
vehicle Quench **38/38**, sandbox E2E **garaz-grafika 13/13**, no module console errors.
Report and 14 screenshots: `logs/e2e/2026-10-27T20-44-08/`, Bradley screenshots 13–14.
Coverage includes closed roof, all nine anchors/facings after rotation, opposite-bench and driver
seat changes through the real window, original size on exit, navigation/adoption/reset.
Sources, full prompts, primary references and measurements: `dev/art/m4/bwp/README.md`.
Queue: 12 images and 7 sounds. D33 gunnery remains post-beta.

### Bulldozer artwork (approved 2026-10-27)

The GM approved the portrait, token, proportions and both occupant anchors.

Ninth set: portrait 1024×1024 and open token 750×1200, worn yellow crawler with two steel
tracks, a broad front blade, compact single rear ripper and an open protective frame without
roof or glass. Main operator seat on image-left, smaller helper seat on image-right; both
`otwarta/nad`. Catalog frame 2.5×4 squares (3.75×6 m), visible bounds 3.55×5.78 m.
Source character texture scales retained; the existing seated footprint remains 0.5 square.
Seat anchors and exhaust measured from the framed art. No campaign actor migration.

**Garaż → Karta prób → Grafika: Buldożer**, scene **Garaż · Buldożer — gąsienice i obsada**.
Probe `grafika-buldozer`: portrait/token match, blade/tracks/ripper, two exposed figures,
targeting, rotation/movement and boarding/exiting the helper seat through the real window.
Generator creates Parking plus nine previews. Added to running Poligon without reset,
preserving all nine old scenes and 146 old tokens; a native bulldozer was added to Parking.

Checks: packer, alpha/size measurements, fresh in-memory template; sandbox E2E
**garaz-grafika 12/12**, no module console errors. Report and twelve screenshots:
`logs/e2e/2026-10-27T19-08-07/`, bulldozer screenshot 10. Coverage includes both exposed
riders, source scales, targeting, turned anchors, helper boarding/exit, ten panel buttons,
preserving manual edits and reset without duplicates. Full `npm test` still stops at the
known unrelated `message-flags` scan in `scripts/weapons/wlasciwosci.mjs:138`; other static
and scenery checks pass. Sources/full prompts: `dev/art/m4/buldozer/README.md`.
Queue: 14 images and 7 sounds.

### Fire-pumper artwork (approved 2026-10-27)

Eighth set: portrait 1024×1024 and matched lossless roof/cutaway 600×1650, red/cream cab-over
pumper with raked windshield, four tyres, tan hose bed and right-side ladder. Five cab seats
(3+2) concealed; the sixth operator stands behind the water monitor on the open platform,
`otwarta/nad`. Artwork/seat presentation only; no water-monitor or post-beta turret rule changes.
After the GM rejected the original elongated rectangular token, the portrait became the geometry
reference: cab/pump/rear about 40/15/45%, recessed pump waist, ladder confined to the rear body,
four tyres protruding by about 25–28 cm per side. Portrait unchanged. Frame 2×5.5 squares
(3×8.25 m), full visible bounds 2.90×7.70 m. Source figure texture scales retained.
Canonical cutaway plus registered cab roof and local front correction: 495,537 shared exterior samples, zero different
pixels, common alpha and exact shipped/compositor equality. Sources, full prompts and recipe:
`dev/art/m4/woz-strazacki/README.md`.

**Garaż → Karta prób → Grafika: Wóz strażacki**, scene **Garaż · Wóz strażacki — kabina i pomost**.
Probe `grafika-woz-strazacki`: appearance, 3+2 cab seats, exposed operator, targeting, motion,
rotation and the seat window. Generator creates Parking plus eight previews; slug aliases
support `wozStrazacki` → `woz-strazacki`. Added without reset: eight old scenes and all 131
other tokens unchanged; only the existing parked fire engine's art/seat metadata were updated,
preserving its position, dimensions, rotation and texture scale. No campaign actor migration.

Checks: packer, alpha/scale/pixel validation, fresh in-memory template; sandbox E2E
**garaz-grafika 11/11**, no module console errors. Current report `logs/e2e/2026-10-27T00-51-21/`,
screenshots 04 (cutaway) and 05 (observer, closed cab and exposed operator).
The full `npm test` is red on an unrelated `message-flags` scan in
`scripts/weapons/wlasciwosci.mjs:138` (`getFlag("dnd5e", "activity.uuid")`); other static/scenery
checks pass. That file was not changed. Queue: 16 images and 7 sounds.

The revision updates the same three existing fire engines, all six anchors and the static
interior tile, preserving vehicle centers, rider scales and 137 other tokens. No reset.

The GM approved silhouette and proportions, then identified misplaced roof beacons and a
box-like southern edge in the cutaway. `roof-off-front-v1.png` repairs only that edge through
`front-mask.png`: both roof beacons disappear, cream slab/tall inner rim becomes a low rounded
red cab sill. Closed token is unchanged pixel-for-pixel; cutaway outside the local front mask
also has zero changed pixels. No actor, anchor or size changes. The GM approved the corrected
front on 2026-10-27, completing approval of the portrait and matched token pair.

### Tractor artwork (approved 2026-10-27)

The GM approved the portrait, token, proportions and both occupant anchors.

Seventh set: chalky rust-red open farm tractor, portrait 1024×1024 and transparent token 450×750.
Exactly two axles and four tyres; large rear tyres at the top, small front tyres at the bottom.
Central driver's seat and a passenger cushion on the vehicle-left mudguard (image right).
Both seats use `otwarta/nad`; no roof variant. Measured visible bounds 2.08×3.27 m inside the
unchanged 1.5×2.5-square catalog frame. Texture scales stay original; seated-token dimensions
remain the existing 0.5 square. No new scale experiment.

**Garaż → Karta prób → Grafika: Traktor**, scene **Garaż · Traktor — siodło i błotnik**.
Portrait, empty vehicle, driver, full crew and two source-scale dnd5e reference figures.
Probe `grafika-traktor` covers appearance, the two anchors, targeting, rotation, movement and
boarding/exiting through the real seat window. Generator reset now builds Parking plus seven
previews. Added to the running Poligon without reset, preserving seven scenes and all 123 old
tokens. Main Parking gets the tractor too; older imported campaign actors are not migrated.

Checks: packer, measured alpha/bounds, fresh in-memory vehicle template, `npm test`; sandbox
E2E **garaz-grafika 10/10**, no module console errors. Report and nine screenshots:
`logs/e2e/2026-10-26T23-44-08/`, tractor screenshot 07. This run verifies both exposed riders
and their rotated anchors, fender boarding/exit, all eight navigation buttons, adoption and reset.
No live campaign compendium rebuild. Sources and full built-in-tool prompts:
`dev/art/m4/traktor/README.md`. Remaining queue: 18 images and 7 sounds.

### Bus artwork (completed 2026-10-27)

The sixth Garage art preview is **Grafika: Autobus**, scene **Garaż · Autobus — wnętrze i obsada**.
Portrait, roof and cutaway are delivered. The GM approved twenty passenger seats in five
rows, a separate driver and an empty rear utility floor. The canonical cutaway supplies the
whole exterior and alpha map; a deterministic composite adds the roof. Lossless WEBPs retain
zero different exterior pixels (434,896 samples after windshield revision), also verified in actual Poligon PIXI textures.
Measured body width 2.575 m; full visible bounds with mirrors 2.915×11.515 m, frame 3×12 m.

The preview contains empty roof/interior, all 21 occupants and 21 reference figures in four
rows on a 28×25 scene. The shared builder adapts scene height to vehicle length and crew count;
smaller previews retain their layout. Garage reset now recreates Parking plus six previews.
Installed without reset, preserving six existing scenes and all 78 existing tokens. The bus
was also added to Parking. Source character scales and seated dimensions remain unchanged.

Checks: WEBP/alpha/pixel validation, `npm test`, vehicle Quench **37/37**, Garage E2E **9/9**,
no module console errors. E2E report and eight screenshots: `logs/e2e/2026-10-26T21-13-27/`;
`garaz-grafika-08-gm-bus_exposed_interior_with_all_21_occupants.jpg`.
Tests include concealed/revealed crew, every anchor after movement and rotation, boarding
the last seat via the real window, exiting, reference layout and regeneration without leaks.
The maneuver uses free space; overlapping reference figures blocked some rider moves during
the initial test. Collision rules were not changed as part of this artwork delivery.

The sandbox's isolated vehicle pack was regenerated and validated to clear the stale Buggy
prototype comparison. Campaign and Poligon packs remain untouched while people are connected;
the Garage applies current art/layout over its older pack. Future pack builds include all assets.
Probe: **Grafika i obsada autobusu** (`grafika-autobus`). Full sources, prompts, framing and
compositing recipes: `dev/art/m4/autobus/README.md`. Queue: 20 images and seven sounds remain.
The GM approved the portrait and both tokens after the windshield revision on 2026-10-27.

Windshield revision (2026-10-27): the initial vertical-windshield front disappeared in a true
overhead view. Portrait and closed token now use a rounded, raked New Look/Fishbowl-inspired
front; the glass band and wipers remain clearly visible from overhead. Design research:
https://collections.trolleymuseum.org/items/343 (museum description; no museum image used).
Only the front patch is composited over the accepted closed token. Exact pixel checks confirm
the whole earlier interior and the remaining roof are unchanged. All anchors, dimensions and
character scales stay the same. Both Poligon clients were reloaded without resetting scenes.
`npm test` and repeated Garage E2E **9/9**, no module console errors:
`logs/e2e/2026-10-26T23-23-09/`. Current prompts include both revision calls and reference roles.

### Buggy artwork (2026-10-26)

The fifth Garage art preview is **Grafika: Buggy**, scene **Garaż · Buggy — otwarta rama i obsada**.
Faded yellow tubular frame, two black bucket seats, exposed rear engine and four off-road tyres.
Portrait and a single open-cockpit token are delivered; no roof/interior pair is needed.
Two full rider tokens stay exposed above the frame without hover, with 1/2 cover retained.
Art anchors match the seats, driver on image right. Catalog size 1.4×2.8, original stock dnd5e
figure scales, existing 0.5-square seated footprint. No global scale change or custom-layout migration.

Garage reset now recreates Parking plus five previews; Parking also gets Buggy. The running
Poligon gained only the new preview and parked buggy, preserving all five existing scenes and
their 69 tokens. Probe: **Grafika i obsada buggy** (`grafika-buggy`).

Validation: WEBP/alpha/frame measurements, `npm test`, vehicle Quench **37/37**, E2E
**garaz-grafika 8/8** without module console errors. Report: `logs/e2e/2026-10-26T20-03-21/`;
screenshot: `garaz-grafika-06-Gracz_2-buggy_two_exposed_riders_above_open_frame.jpg`.
Tests cover permanent exposure, ordinary rider targeting, movement/rotation on both anchors,
panel access, preserving existing manual edits and reset with source scales.
Source art, authored SVG, model, full prompts and measurements: `dev/art/m4/buggy/README.md`.
The remaining queue is 22 images and seven sounds. GM aesthetic review is open.

Size correction after GM review: the original 1×2 frame made the visible tyre width only 1.47 m.
The GM selected a wide desert frame/FAV reference of 2.03–2.13 m. Catalog dimensions are now
1.4×2.8 squares, with a 420×840 WEBP re-packed from the unchanged high-resolution source.
Visible bounds are 2.055×3.835 m (alpha >8), within a 2.10×4.20 m frame. Seat coordinates
remain normalized; the seats and exhaust scale with the vehicle, while rider dimensions and
texture scales stay unchanged. No client-only texture multiplier or global character scaling.
Revalidated `npm test` and **garaz-grafika 8/8**, no module console errors:
`logs/e2e/2026-10-26T20-24-31/`, screenshot
`garaz-grafika-06-Gracz_2-buggy_two_exposed_riders_above_open_frame.jpg`.
The rebuild check includes the calibrated dimensions on main Parking with the older running pack.
Four existing Garage buggy tokens were resized about their preserved centers, keeping the three
riders' texture scales and dimensions; 71 other tokens were preserved. Both Poligon clients reloaded.

### Cargo truck artwork (2026-10-26)

The fourth Garage art preview is **Grafika: Ciężarówka**, scene **Garaż · Ciężarówka — kabina i paka**.
Portrait and matched cab-roof/cutaway tokens are delivered; the wooden cargo bed stays open in both.
Three cabin figures remain concealed, eight cargo-bed figures stay exposed above the floor. Seat
anchors and exhaust match the art; custom actor layouts are not migrated. The Garage builder now
recreates five scenes including Parking, and reference figures wrap after six columns.

Validation: WEBP, `npm test`, vehicle Quench **37/37**, E2E **garaz-grafika 7/7**, no module console
errors. Truck-specific checks cover the closed cab, eight exposed figures, matched interior, all
eleven anchors after rotation, and regeneration with source scales. Report and five screenshots:
`logs/e2e/2026-10-26T19-19-25/`. Art details and prompts: `dev/art/m4/ciezarowka/README.md`.
Installed into the running Poligon via its API while preserving the three existing previews.

GM correction v2: cab contents moved down 26 native pixels (about 9 px at 1:3 preview).
Seats and wheel translate without resampling; only the rear floor and lower dashboard adapt
to the fixed cab outline. The closed token supplies the complete exterior outside the cab,
with a finite 6 px blend inside the cab boundary. Both tokens now use opt-in lossless WEBP.
`python dev/art/m4/ciezarowka/validate.py` verifies zero different decoded pixels in the entire
bed and shared exterior (921,100 pixels), unchanged accepted closed art, and exact preservation
of the translated seats/wheel. Cab anchors follow the same correction; cargo anchors stay fixed.
The compositor and v1/v2 sources are retained in the truck art directory.
Reran `npm test` and **garaz-grafika 7/7** after this correction, no module console errors:
`logs/e2e/2026-10-26T19-43-45/`, screenshot
`garaz-grafika-05-gm-truck_exposed_cab_and_occupied_open_bed.jpg`.
Reloaded both running Poligon clients and confirmed their actual PIXI textures also have
zero exterior differences. Updated only truck preview/Parking cab anchors and their three
riders, preserving vehicle positions, reference-token scales and all other previews.

### Rebuildable Garage art previews (2026-10-26)

**Ctrl+Shift+P → Garaż / Idź → Karta prób** now provides Parking and artwork buttons for the sedan,
Hammer and motorcycle. `dev/poligon/stations/garaz-grafika.mjs` builds these three scenes as part of
the Garage reset; the main parking vehicles also get the delivered art and matching seats even
with an older running compendium. Fresh previews use catalog dimensions and stock dnd5e figures
at source scales. Existing previews can be adopted without changing manual edits. No private
campaign data is needed. Human probe: `podglady-reset`.

Validation: `npm test`; sandbox E2E **garaz-grafika**, six steps across GM and players, no console
errors. Panel buttons, seat-window boarding/exit, rider rotation, matched Hammer interior/hatch,
adoption preserving edits, then reset restoring all four scenes without actor leaks.
Report: `logs/e2e/2026-10-26T18-52-05/report.json`.
Screenshot: `logs/e2e/2026-10-26T18-52-05/garaz-grafika-01-gm-garage_card_and_motorcycle_preview.jpg`.
Deployed into the running Poligon through its API, without resetting the station or rebuilding packs.

### Occupant scale diagnosis (2026-10-26)

Confirmed on all 14 chassis: boarding sets a 1-square figure to a 0.5-square footprint without
changing its texture scale, halving the rendered figure. The 85% art previews therefore produce
42.5% of the original unmounted image, or 50% of their already-reduced outside references.
The existing D2 behavior is responsible; the motorcycle artwork is approved. Runtime behavior
is unchanged in this investigation. [Measurements and correction scope](dev/audits/vehicle-occupant-scale-2026-10-26.md).

### Open hatch presentation (D32, 2026-10-25)

`prezentacja.mjs` supplies one seat presentation policy for the canvas, dots, seat window and crew list.
Zones can set `prezentacja: { widocznosc: "otwarta", warstwa: "nad" }`; the defaults are concealed
and above. Geometry carries this independently of cover and mounted-weapon status. The Hammer's hatch
uses it in both its generic and art-specific layouts. Its four cabin seats remain concealed.
An exposed figure respects core visibility and can be targeted normally without granting ownership,
cargo access or X-ray of the cabin. Display ordering is derived locally after core state refresh,
including when the carrier's sort changes; the rider's saved document order still restores on exit.
The complete vehicle artwork is unchanged. Separate roof layers and masks remain deferred.

Verification: `npm test`, vehicle Quench **35/35**, e2e **pojazd-prezentacja** (six steps, three clients)
and regression **pojazd** (nine steps), with no module console errors. Report and screenshots:
`logs/e2e/2026-10-25T20-33-50/`.

GM review: **Garaż · Hammer — grafika i wnętrze**, probe **Widoczny właz** (`wlaz-widoczny`).
The existing preview actors receive the hatch field directly; old custom zones are not globally migrated.
This is the presentation foundation for W1, not completion of the carrier/horse refactor. Bike, horse
and open-frame profiles remain in W1.

1. Veto list and known gaps: `PLAN_m4_pojazdy.md` §10 (Garaż and Pościg probes).
2. P5 questions are answered (D34–D41). Next: the final pass in `PLAN_m4_pojazdy.md` §0.1, then close M4.

## For the asset session

`dev/icons/MISSING.md` §P and `dev/art/m4/` (briefs, catalog, packer wrapper). A delivered token or wreck wins over the
placeholder at the next `npm run fvtt -- packs --only=pojazdy` (portraits too); wrecks are picked up at runtime. Sounds
play as soon as `sounds/pojazdy/<name>.ogg` exists. If the art moves an exhaust pipe, change the point in
`dev/art/m4/gen_catalog.py` **and** `rura` in `scripts/config/vehicles-data.mjs` (`KATALOG_POJAZDOW`).

## Traps found (also in memory and ARCHITECTURE §11)

- v14 freezes movement waypoints before `preMoveToken` → footprint swap and rider seats are written by the active GM
  after the animation (`zeton.mjs`, `zapiszPoRuchu`).
- `_del` / `INHERIT` and ownership on unlinked-token actors (`jadacy.mjs`, `poziomPrzywracany`).
- dnd5e 6: `movement.speeds.walk`; vehicle TT changes on `ac.flat`.
- `fvtt reload` may leave a tab on the old import graph after new modules appear — probe a new export, hard-reload via
  CDP (happened again on the Poligon GM page).
- `Scene#grid` is a new instance after every scene data reset — patch `SquareGrid.prototype`, not the instance.
- Cross-scene Ctrl+X/Ctrl+V keeps token ids (`keepId`) — riders stay linked to their car without remapping.
- A dotted `delta.flags…` path in `updateSource` on an empty delta fails validation and drops the whole token.
