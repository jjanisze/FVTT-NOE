# Poligon — the GM's testing ground

End-to-end human testing of everything the module does, **without touching the campaign world**.
Design and decisions: [`PLAN_human_testing.md`](../../PLAN_human_testing.md). Nothing in this folder
ships in `module.zip`; it reaches the browser only on the Poligon's own data path.

## Start

```sh
npm run fvtt -- poligon:init            # once (and after adding modules): data path, world, users, packs
npm run fvtt -- poligon:start --seats=3 # the GM's window + Gracz 1–3, each its own browser window
```

In the GM's window: the flask button in the token controls (or **Ctrl+Shift+P**) opens the panel.
**Stanowiska → Idź** puts a station on screen for everyone; **Reset** rebuilds just that station.
**Ctrl+Shift+U** (or the flag button) files a finding — from any seat, players' included.

| Where | What |
|---|---|
| Data path | `%LOCALAPPDATA%\FoundryVTT-Poligon` — own server and port, runs beside the campaign and the agents' sandbox |
| World | `poligon` — Gamemaster + Gracz 1–5, no passwords; never deleted by any `fvtt` command |
| Modules | the campaign's active set (read from the campaign at init), this module linked to the working tree |
| Packs | built from the working tree into the Poligon's own copy (`fvtt packs --profile=poligon`) |
| Rules | dnd5e metric units, calendar, rules version and the module's world switches copied from the campaign at init; after that the **Wariant** tab owns them |

## Stations

| Station | | What it puts on the table |
|---|---|---|
| Hangar | P0 | M3: drones (walking deployed with a gun, flying folded, a drone Robota under way), factory and homemade controllers, a human partner, a tamed mammal, a Prawa ręka, an EMP emitter; 150 m yard with 20/50/100 m lines and a shed; a Basement „pod ziemią”; Obrońca, Spawacz, Gangus Kapo, Cywil, Pies mutek. Probes include the whole veto walk of `PLAN_m3_towarzysze.md` §11 |
| Magazyn | P1 | storage NPCs per compendium family + WKK stock + **Wszystko** (~570 items) — drag anything onto anyone |
| Plac | P1 | an empty scene; personas via Obsada → Weź |
| Strzelnica | P1 | 150 m lane, five shooters with every fire mode, explosives, launchers, flamethrower, melee corner; dummies at range, behind ½ and ¾ cover, a cluster of six, an armoured target, a machine, a large creature, an explosives pit |
| Garderoba | P1 | Goły, a typical character per class, Chomik (~330 items), full oporządzenie, power armour, an armed NPC, Opiekun with three companions |
| Ciemnia | P1 | night ruin at darkness 1.0; torch-light, NVG, thermal, torch, flares, signal pistol, Mołotow; hidden warm and cold creatures |
| Lazaret | P1 | beds preset through the module's funnels: dying, stable, Zranienie 1–4, exhaustion from several sources, diseases, a phobia, Upojenie, Skażenie, bleeding, burning, held breath, Przemarznięcie; a Medyk and Aspiryna i Miętusy |
| Bazar | P1 | M5: a town, two merchants from the module's merchant funnel, a party with money and goods, a Fant, a chronic disease |
| Złomowisko | P1 | M5: corpses to butcher, a Gladiator with self-destruct, the party at a scavenging place, a jammed Bat to dismantle |
| Arena | P2 | five plus a dog, a drone and a Prawa ręka against ten from the Bestiariusz; combat prepared |
| Bestiariusz | P2 | the monster closet (`monsterCloset.regenerate()`), calibration pass and statblock walk |
| Kuźnia | P2 | production and repair: a workshop Miejsce, schematics, jammed / damaged / blunted weapons, a Robota |
| Kreator | P2 | empty characters per player, the companion wizard |
| Droga | P2 | the party sheet, a vehicle, food and water of every quality |
| Pościg | P3 | the chase board (the `poscig` e2e fixture) |
| Galeria | P3 | every shipped icon per pack at 64/32/16 px on dark and light, placeholders framed red, status icons |

Each station's **Karta prób** lists what to judge and how, marked NOE / RAI / WKK / VETO; ✅ keeps, ❌
and 💬 open an Uwaga with the probe attached. A verdict remembers the commit it was given on.

## Panel tabs

**Stanowiska** (state, Idź, Reset) · **Karta prób** · **Obsada** (personas: build, coverage, Weź) ·
**Wariant** (NOE / WKK presets, every world switch of the module, this client's theme and scale) ·
**Czas** (turn, round, +10 min … +1 day, KO, DO, Zachód słońca — through the module's clock) ·
**Kości** (the next die of a size lands on a chosen face, on this client; a banner badge while armed) ·
**Widok gracza** (who plays what, assign the selected token, seat commands) · **Liczniki** (chat
messages, document writes, frame time p50/p95 since Zeruj) · **Świeżość** (commit, dirty files, scripts
changed since the page loaded, stale packs or personas) · **Uwagi**.

## Klon kampanii

For what personas cannot answer — real legacy data, real inventories, a migration rehearsed before it touches the
campaign:

```sh
npm run fvtt -- poligon:clone             # copy the campaign world (same id) onto the Poligon path; --refresh replaces it
npm run fvtt -- poligon:start --klon      # the Poligon server restarts into the clone; the GM seat opens
npm run fvtt -- poligon:start             # back to the Poligon world
```

A full copy (no junctions, so nothing written in the clone can reach the campaign), taken while the campaign
runs; one way only. Every clone tab has a red frame, "KLON — NIE KAMPANIA" and a `[KLON]` title. fvtt replaces
only a clone it made (marker file), never while it runs.

## Findings → agents

Uwagi are pages of the journal **Poligon · Uwagi** with their context (station, probe, scene,
selection, open windows, viewport, zoom, theme, Kobalt, user, commit …) and an optional screenshot
(canvas, or the whole tab with the browser's consent), uploaded to `worlds/poligon/uwagi/`.

```sh
npm run fvtt -- poligon:findings --open --md     # JSON + logs/poligon/uwagi-<date>.md (git-ignored)
npm run fvtt -- eval --profile=poligon --expr="game.poligon.uwagi.oznacz('<id>', '→ PLAN_x §y')"
```

## Obsada

`roster.mjs` defines 42 generic personas: one per class at level 1, one per profession at level 5,
the Hangar's five, specials (Goły, Chomik, Weteran, Warsztat, Stary wyga) and coverage personas. Each
is built **once** through dnd5e's real AdvancementManager (`lib/advancement.mjs`, ~7–20 s) into the
world compendium **Poligon · Obsada**; stations import copies and give the roster loadout through
the module's funnels. Invariant (checked by `game.poligon.obsada.coverage()` and the e2e suite):
every automated Sztuczka, class/profession ability and Pochodzenie ability sits on a persona.
After class data changes: Świeżość says so → Obsada → Przebuduj (or `fvtt poligon:obsada --rebuild`).

## Safety

- The campaign never runs this code: there is no `/agent-poligon/` junction on its data path and no
  loader in its world; `lib/guard.mjs` refuses any world the loader did not stamp (agent sandbox
  worlds excepted, for the e2e suite).
- Poligon seats are isolated browser contexts: Foundry's session cookie is per host, not per port, so a
  Poligon login in Chrome's default context would log the campaign tab out.
- `fvtt` lifecycle on the Poligon (`poligon:stop`, `stop/restart/kill/packs --profile=poligon`) refuses
  while someone it did not log in is connected (`--force` only on the GM's word); `world:*` and `e2e`
  never run there; runtime mode freezes agent commands here too (H-D5).
- `fvtt doctor` checks campaign hygiene: test-looking documents in the campaign are a problem, target 0.

## Agents

Reseed a station **only when the GM asks** (H-D9): `npm run fvtt -- poligon:reset hangar` (`--all`,
`--list`). A change touching UI, canvas, VFX, sound or a multi-step flow adds or updates its station's
probes (TESTING.md, Warstwa 7) and the hand-off names the station and probes to look at.

**A new station:** `stations/<id>.mjs` exporting `{ id, name, prio, icon, opis, gracze, build(kit),
proby, narzedzia?, klucz?, clear? }`, listed in `stations/index.mjs`. Build only through the kit
(`lib/kit.mjs`: `scene`, `walls`/`room`, `labels`, `stripes`, `lights`, `persona`, `fromPack`,
`actor`, `adopt`, `give`, `place`, `load`, `surowce`, `tokens`, `party`, `combat`, `seat`) and the
module's own APIs — never raw flag writes; everything gets the station's flags, so Reset removes it.
Missing compendium picks are logged, not thrown; the `poligon` e2e suite turns any of them red.
