# HANDOFF — M4 Pojazdy (2026-10-19)

Delete this file when M4 part 2 is finished (P5–P6) or vetoed and closed.

## State

- **Part 1 (E0–E8)** and **part 1b (E9–E11)** implemented and committed on `master` (not pushed). Code in
  `scripts/pojazdy/` (file map in `index.mjs`), API `game.neuroshima.pojazdy`, pack `pojazdy`, migration
  `migration/migrate-pojazdy.mjs`.
- **Part 2, P1–P4** implemented: the chase board rebuilt as a folded road (`scenes/poscig*.mjs`), the road metric
  (`scenes/droga.mjs`), aimed bursts and road-space areas (`scenes/poscig-serie.mjs`). API `game.neuroshima.poscig`
  (`.droga`, `.serie`).
- **P5 (chase mechanics)** waits for the GM's question round: `PLAN_m4_pojazdy.md` §10, eleven questions with the
  agent's proposals.
- **Campaign:** the part-1 migration ran once (GMT400, Hammer Posterunku; Roll20 art in `flags.<mod>.pojazd.zetonPrzed`,
  restore with `game.modules.get("neuroshima-2026-overrides").api.migration.przywrocZetonyPojazdow()`). No chase board
  exists in the campaign, so the board geometry change needs no migration.
- **Poligon:** stations **Garaż** (part 1) and **Pościg** (rebuilt 2026-10-19 for the folded road, probes D21–D31).
- **Tests:** see `PLAN_m4_pojazdy.md` §11 (Quench, e2e `pojazd`, `poscig`, `poscig-jadacy`, `nevada-art`, `urban-art`,
  release gate).

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
2. Answer the P5 questions (§10) — then P5 (manoeuvres, Test Pościgu, complications, ending) and P6 close M4.

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
