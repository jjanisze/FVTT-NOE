# HANDOFF — M4 Pojazdy (part 1 done, 2026-10-19)

Delete this file when M4 part 2 starts from a fresh plan round or part 1 is vetoed and closed.

## State

- **Part 1 (E0–E8) implemented and committed on `master`** (`9e8006d` … latest; not pushed). Code in `scripts/pojazdy/`
  (file map in `index.mjs`), API `game.neuroshima.pojazdy`, pack `pojazdy`, migration `migration/migrate-pojazdy.mjs`.
- **Campaign:** the migration ran once (GMT400, Hammer Posterunku: chassis flag, keys id, footprint, Hammer placeholder
  art; Roll20 art kept in `flags.<mod>.pojazd.zetonPrzed`, restore with
  `game.modules.get("neuroshima-2026-overrides").api.migration.przywrocZetonyPojazdow()`).
- **Poligon:** packs rebuilt from the working tree; station **Garaż** seeded; server left running with the seat
  windows open (the `poligon:stop` guard counts seats as people — stop it yourself or with `--force` on your word).
- **Tests:** Quench 1229/1229; e2e `pojazd` green (logs/e2e/2026-10-19T00-54-24). `release:check` not run.

## For the GM

1. Veto list and known gaps: `PLAN_m4_pojazdy.md` §10. Everything there is judged at Garaż (26 probes).
2. Round 5 (2026-10-19) decided vehicles between scenes (D20–D23, part 1b: E9–E11, §4.14–§4.16) and the chase board
   rewrite (D24–D31, folded road, §6.2). Next step: **E9** — it also fixes the chase board that part 1 breaks.
3. Chase mechanics (manoeuvres, Test Pościgu, complications, a vehicle hit by a burst) — question round before P5
   (§6.2.5, §10).

## For the asset session

`dev/icons/MISSING.md` §P and `dev/art/m4/` (briefs, catalog, packer wrapper). A delivered token or wreck wins over the
placeholder at the next `npm run fvtt -- packs --only=pojazdy` (portraits too); wrecks are picked up at runtime. Sounds
play as soon as `sounds/pojazdy/<name>.ogg` exists. If the art moves an exhaust pipe, change the point in
`dev/art/m4/gen_catalog.py` **and** `rura` in `scripts/config/vehicles-data.mjs` (`KATALOG_POJAZDOW`).

## Traps found (also in memory)

- v14 freezes movement waypoints before `preMoveToken` → footprint swap and rider seats are written by the active GM
  after the animation (`zeton.mjs`, `zapiszPoRuchu`).
- `_del` / `INHERIT` and ownership on unlinked-token actors (`jadacy.mjs`, `poziomPrzywracany`).
- dnd5e 6: `movement.speeds.walk`; vehicle TT changes on `ac.flat`.
- `fvtt reload` may leave a tab on the old import graph after new modules appear — probe a new export.
