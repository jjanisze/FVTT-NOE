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

## For the GM

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
