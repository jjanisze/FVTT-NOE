# PLAN — Poligon: a human testing ground for NOE and WKK

> Status: **DRAFT** (2026-10-10) — research only, no code yet; GM decisions pending (§10).
> Sibling of [PLAN_agentic_improvements.md](PLAN_agentic_improvements.md): layers 1–6 are the agents'
> tools, this is the human's. It reuses that plan's CLI (`fvtt`), sandbox data-path machinery,
> fixtures, guards and the closets' scene plumbing (`scripts/dev/test-scenes.mjs`).
> Scope: this repo (`dev/poligon/`, `dev/agent/`, `scripts/dev/test-scenes.mjs`, `TESTING.md`), the
> user profile (one more data path), the campaign world (cleanup only, §8, with GM approval).
> Size: **L**, in stages (§9). H1 alone replaces today's habit.

---

## 1. Why

### 1.1 Today

The GM tests by putting things on campaign actors from the start screen — **Zbrojownia** and
**Piekarz** (a former PC) — and by building calibration scenes inside the campaign. The campaign world
on 2026-10-10 (read-only snapshot):

| Kind | In the campaign world |
|---|---|
| Test / calibration scenes | `Pościg — test`, `ZZZ — Token Review`, `Szafa z potworami (kalibracja)`, `Szafa z postaciami (kalibracja)` |
| Test actors and folders | `TESTER - Ze sztuczkami`, `TESTCHAR`, `TEST-cichy-krok-race`, `Copy of Mobsprzęt Karabin`; folders `Testowe`, `Szafa z potworami — kopie jednorazowe` |
| Agent leftovers | world item `__neuro_probe__` |
| Real actors used as test benches | Zbrojownia, Piekarz |

### 1.2 What a test in the campaign world really touches

Not just the actor being fiddled with. Many mechanics write **world-global** state:

| Mechanic under test | What it writes beyond the actor |
|---|---|
| KO/DO, production hours, travel, 1k8 h stabilisation, pochodnia fuel | `game.time` — the campaign clock moves (a rest runs `game.time.advance`) |
| Comparing NOE and WKK | `kobaltEnabled` is world scope — flipping it flips the campaign |
| Zachód słońca, diseases, daily doses | `dayCounter` / `ostatniZachod`, day stamps on actors |
| Any roll, card, reaction | the chat log, i.e. real session history — and bulk-deleting messages is how history gets lost |
| Combat flows | combats, the tracker, initiative groups, on a real scene |
| Party features | the campaign party's membership, daily supply demand, loot lock |
| Drops, throws, charges | ground-item and placed-charge Tiles, Splatter blood on real maps |
| Companions, drones | links to a real owner, user ownership |
| Character creation | advancement leftovers — deleting a class does not reverse what it granted |
| Compendium drags | one new world actor per drop, no dedup |

Each row is a way for a test to leak into the campaign. Discipline does not scale; a separate world
does.

### 1.3 What agents cover — and what they structurally cannot

Layers 1–6 (`TESTING.md`) check **contracts**: Quench proves rules and data, e2e proves flows from GM
and player clients, with screenshots that an agent reviews. None of that can judge:

- **look** — VFX, light, shaders, icons, token art, layout, clipping, consistency between features;
- **feel** — sound mix and timing, animation pacing, how long a round takes, how many clicks a shot costs;
- **scale** — a 300-item inventory, 15 tokens and 10 light sources, the chat log after three rounds;
- **perspective** — what a player who did not write the feature understands from a card;
- **combinations** — a burning, dying PC at night under NVG; no suite composes features it was not written for;
- **fidelity** — does it play like Neuroshima, does `docs/` describe what the screen does.

Evidence: bugs that reached the GM, not the tests (PLAN_agentic §1: expand icon, flashlight cone, NVG
noise, thermals "fixed" but not). Human-only items still open: the monster closet's calibration pass
(PLAN_monster_closet §11), the manual GM pass of hazards (PLAN_m1_walka E7), production never played at
the table (IMPLEMENTATION matrix), companions and drones — new, with e2e suites, not yet played.

## 2. Goals and non-goals

**Goals**

1. **Zero test writes to the campaign world** — by construction, not by discipline.
2. **Ready in a minute, reset in seconds** — any station on screen from one click, reset per station,
   nothing to tidy afterwards.
3. **Coverage where a human adds value** — §4 priorities, not completeness.
4. **Both variants, both seats, one click away** — NOE / RAI / WKK switch; GM and player views side by side.
5. **Findings captured in the moment**, with context, reaching agents without retyping.
6. **It does not rot** — the Poligon is code; an e2e suite builds every station, so a broken station
   is the agents' red run, not the GM's lost evening.

**Non-goals** — replacing Quench or e2e; pixel diffs; automated UX scoring beyond simple counters
(§3.5); real-player playtest infrastructure (H-D7); campaign content in this public repo.

## 3. Design

```mermaid
flowchart LR
  WT[working tree] -- junction: live code --> P[(Poligon data path)]
  WT -- fvtt packs --profile=poligon --> P
  C[(campaign)] -. optional one-way clone .-> P
  P --> S[Stanowiska + Obsada + Magazyn]
  S --> GM((GM + player seats))
  GM -- Uwagi --> J[journal Poligon · Uwagi]
  J -- fvtt poligon:findings --> A[agents → PLAN / HANDOFF]
  A --> WT
  E[e2e suite poligon, sandbox] -. builds every station .-> WT
```

### 3.1 Where it runs — its own data path (H-D1)

| Option | Verdict |
|---|---|
| A — test scenes in the campaign world (today) | ✗ — §1.2 |
| B — a world on the agents' sandbox data path | ✗ — one server serves one world; `world:create`, `world:launch` and `e2e` shut down whatever runs there (`toSetupScreen` in `lib/worlds.mjs`), so an agent's e2e run kicks the GM out mid-test, and a guard against that would block agents whenever the GM plays |
| C — **own data path, profile `poligon`** | ✓ recommended — `%LOCALAPPDATA%\FoundryVTT-Poligon`, set up by the same `initSandbox` (module linked → live code from the working tree; its `packs/` built from the working tree; every package locked); own port; concurrent with the campaign and the sandbox (D1) |

Inside it:

- world **`poligon`** — persistent, the GM's. No `agent-` prefix, so `world:delete` cannot touch it by
  construction; also on the protected list;
- optionally the **campaign clone** (§3.6).

Modules: the campaign's active set (Sequencer, JB2A, Splatter, Dice So Nice, QuickScale, Quench …),
read from the campaign at `poligon:init`. VFX and sound judged without them are judged wrong.
Users: Gamemaster + `Gracz 1..5` (five = the table), no passwords — the Poligon is local.

### 3.2 Safety — enforced in code

| Risk | Guard |
|---|---|
| Poligon code (panel, rigged dice, builders) running in the campaign | served only from non-campaign data paths at `/agent-poligon/` (a junction to `dev/poligon/`, like `/agent-e2e/`); every entry point also refuses when `game.world.id` is protected |
| An agent stops the world while the GM is in it | `fvtt` lifecycle on `poligon` refuses while a client fvtt did not open is connected ("human present"), unless `--force`; agents reseed stations only on request (H-D9) |
| Agent tooling aimed at the Poligon | `world:*` and `e2e` stay sandbox-only and refuse `--profile=poligon` |
| Deleting the Poligon | not `agent-`, protected, no command does it |
| Campaign and Poligon tabs side by side in one Chrome | a banner on every Poligon page (hazard stripe, "POLIGON"), `[POLIGON]` title prefix, distinct background; the clone gets its own banner |
| Rigged dice forgotten | a badge while armed, consumed once, Poligon-only code |
| Stale packs judged as current | freshness line in the panel and in `doctor` (§3.5) |
| Campaign content reaching the public repo | roster and stations are generic NOE/WKK content; clone data and findings stay local (§3.6, §3.7) |
| Game night | as D9: agent lifecycle and testing on `poligon` refused in runtime mode (H-D5) |

### 3.3 Stanowiska (stations)

A station = one scene (or none) + its actors + its probe card, built by
`dev/poligon/stations/<id>.mjs` (default export `plan()`, the closets' shape) and served at
`/agent-poligon/`. The reset contract is `scripts/dev/test-scenes.mjs` as it stands: everything carries
`flags.<module>.testScene = { id: "poligon.<station>", … }`, a reset deletes exactly that and rebuilds,
actors die only with `disposable: true`. Additions needed there (small, still generic): walls, ambient
lights and sounds, regions, notes, token ownership per player, an optional combat, scene activation.
The monster closet becomes a station unchanged.

- Builders set state through the module's own funnels (`conditions.set`, umieranie, Zranienie,
  `lalka` placement, the magazine model) — never raw flag writes, so a station also exercises them.
- Reset is per station: the GM's half-finished Lazaret survives a Strzelnica reset.
- Builders take a target scene and offset, so they compose (Scenariusze, §5.6).

### 3.4 Obsada (personas), Magazyn, Drużyna Poligonu

**Obsada** — generic characters defined as data (`dev/poligon/roster.mjs`): class, profession, level,
Pochodzenie, Sztuczki, loadout preset, owning player. Built **once** through the real advancement path
(the `postac` suite's `emptyCharacter` / `dropOnSheet` / `advance`, factored into a shared helper) and
kept in a Poligon world compendium `Poligon · Obsada`. Stations import copies: a reset takes seconds and
the GM can wreck a persona freely. Rebuilt when class data changes (freshness).

- v1: one per class at level 1 (Brutal, Cwaniak, Spec, Twardziel, Złodziej, Zwiadowca) and one per
  class at mid level with a profession.
- Full: one per profession (18) at mid level, plus specials — **Goły** (nothing), **Chomik**
  (everything: Przeciążenie and Unieruchomienie, the scale case), **Weteran** (high level, multiclass),
  **Opiekun** (dog, drone, Prawa ręka), **Warsztat** (schematics, surowce).
- **Invariant**, checked by the `poligon` e2e suite against the ledgers
  (`game.neuroshima.{sztuczki,zdolnosci,pochodzenia}.report()`): every automated Sztuczka, class
  ability and Pochodzenie ability sits on at least one persona. Human coverage of automation then
  follows the ledgers without anyone maintaining a list.

**Magazyn** — NPC-type storage actors (the doll exempts NPCs, PLAN_paper_doll D10), one per compendium
family: broń palna; biała i miotana; pancerze; amunicja i magazynki; granaty i ładunki; chemia;
narzędzia; sprzęt i elektronika; surowce i prowiant; WKK — plus **Wszystko**. Refilled from the
compendia on reset. This is what Zbrojownia and Piekarz are used for today: drag anything onto anyone.

**Drużyna Poligonu** — a group actor and a vehicle for party features; never the campaign's party.

### 3.5 Panel

One frameless window (ApplicationV2), GM only, opened from a scene-controls button that exists only in
the Poligon.

| Section | Does |
|---|---|
| **Stanowiska** | station list with state (built / stale / never); [Idź] activates the scene and opens its key sheets; [Reset]; [Reset wszystko] |
| **Karta prób** | the active station's probes: what to judge, how, [NOE]/[RAI]/[WKK] marker, docs link; ✅ / ❌ / 💬 per probe, stored with the commit it was judged on |
| **Wariant** | `kobaltEnabled` and the WKK sub-settings (Darmowe upuszczanie, wytrzymałość pancerzy …) with presets NOE / NOE + RAI / WKK; client theme light/dark and font/interface scale |
| **Czas** | +1 runda, +10 min, +1 h, KO, DO, Zachód słońca — through `game.neuroshima.time` and the combat API |
| **Kości** | rig the next k20 (or kN) on **this** client — the `CONFIG.Dice.randomUniform` queue that `__e2e.forceD20` uses: pechowa jedynka, krytyk, a failed RO, without rolling forty times; badge while armed |
| **Widok gracza** | per `Gracz N`: whom they play, the join link for a second browser, or the `fvtt login --profile=poligon --user=… --context=…` line |
| **Liczniki** | since the last reset or [Zeruj]: chat messages, document writes (the e2e `--trace-writes` wrapper), frame time p95 (toggle). "This shot cost 4 cards and 11 writes" makes clutter and lag visible instead of felt |
| **Świeżość** | commit and dirty count of the code this page loaded; scripts changed since load (→ Ctrl+Shift+R); pack and Obsada build stamps vs their sources (→ `fvtt packs --profile=poligon`) |
| **Uwaga** | §3.7 |

Loading (H-D2): preferred — the Poligon world's own `esmodules` in `world.json` (the base package
schema has the field for every package type) pointing at `/agent-poligon/poligon.mjs`; nothing ships
in the module. Fallback — a few-line loader in the module gated on a hidden world setting only `fvtt`
sets. Spike H0 (2).

### 3.6 Klon kampanii (optional, H5)

For questions personas cannot answer: real legacy data (Roll20 imports, odd items, the kind of
activity-key mismatch once found on a damaged UMP), real inventories at their real size, "how does
Alan's sheet look with this", and rehearsing a migration before it touches the campaign (the path
M3 E5 took for Evie by hand).

- `fvtt poligon:clone` copies the campaign world's `data/` LevelDB (the foundry-mcp snapshot method:
  every file except `LOCK`) into the Poligon data path under the **same id** `output`, so every
  `worlds/output/…` asset path keeps resolving. Asset folders as junctions (read-mostly) or copies — H-D3.
- Marker `.poligon-clone.json`; a refresh replaces only a marked folder on a non-campaign data path
  (guard and tests in the style of `world:delete`). Banner "KLON — nie kampania". One-way: nothing
  flows back. Never in the repo.
- The same layout makes bestiary portraits resolve in the Poligon (they point into
  `worlds/output/characters/`, §11). Without a clone: a lone `worlds/output/characters` junction —
  spike H0 (3).

### 3.7 Uwagi (findings)

[Uwaga] in the panel (and a keybinding) opens a small form: severity (blokuje / błąd / brzydkie /
pomysł), text, optional screenshot. Context is attached automatically: station, probe, scene, selected
tokens, controlled actor, open windows, viewport and zoom, theme, Kobalt state, user and role, module
version, commit and dirty count, pack stamp.

- Stored as a page in the journal `Poligon · Uwagi` (structured context in flags): the GM can edit,
  link and reread them in Foundry.
- Screenshot: the canvas via `canvas.app.renderer.extract`; the whole tab (sheets, cards) via
  `getDisplayMedia` with the browser's consent prompt, one frame, uploaded to `worlds/poligon/uwagi/`.
  Spike H0 (5).
- Agents: `fvtt poligon:findings [--since] [--open] [--md]` → JSON, `--md` into `logs/poligon/`
  (git-ignored). Triage files each finding into the right PLAN / HANDOFF / TODO and stamps the page
  `status: "→ PLAN_x §y"`, which the panel shows. Precedent: the icon review queue
  (`dev/icons/review/`, decisions persisted in `feedback.json` and read by the next pass).

## 4. What to test — priorities

Per area, from the IMPLEMENTATION matrix: **H** what only a human can judge, **I** interaction surface
(UI, canvas, audio, several clients, time), **F** frequency at the table, **C** what automated tests
cover today.

| Area | H | I | F | C today | Priority → station |
|---|:-:|:-:|:-:|---|---|
| Attack flow: card, verdict, okoliczności badges, Reakcje celu, fire modes, magazines, jams, damage tray | ●●● | ●●● | ●●● | e2e, functional | **P1** Strzelnica |
| VFX and sound: tracers, muzzle flash, explosions, sound banks, Splatter, scrolling text | ●●● | ●● | ●●● | nothing can assert it | **P1** Strzelnica |
| Explosives on the map: area picker, throw, mines / C4 / IED, detonation, Mołotow, kolczatka | ●●● | ●●● | ●● | e2e grenade | **P1** Strzelnica |
| Sheet and inventory: shell, Stan, Zasoby, lalka, pas, sections, Udźwig bar, pips, ulepszenia, Fuksy, PD, hotbar | ●●● | ●●● | ●●● | Quench `lalka` | **P1** Garderoba |
| Vision and light: latarki, NVG / thermal, 220°, flary, pochodnia, darkness; drone video | ●●● | ●●● | ●● | none | **P1** Ciemnia |
| Health: Stan tracks, status icons and HUD, umieranie cards, DO window with Rekonwalescencja, kalendarzyk, choroby, Zagrożenia tool | ●● | ●●● | ●●● | Quench + e2e | **P1** Lazaret |
| Combat at table scale: tracker, groups, companions, NPC reactions, drops, ground items, chat volume, performance | ●●● | ●●● | ●●● | e2e, small | P2 Arena |
| Production and repair (never played at the table) | ●● | ●●● | ●● | Quench rules | P2 Kuźnia |
| Bestiary: token art and scale, statblocks, reactions, drops | ●●● | ● | ●● | Quench closure | P2 Bestiariusz |
| Creation, level-up, companion wizard | ●● | ●●● | ● | e2e `postac`, `towarzysz-tworzenie` | P2 Kreator |
| Party sheet, travel, supplies, rest activities, clock | ●● | ●● | ●● | Quench, partial | P2 Droga |
| Icons and art in context | ●●● | ● | ●●● | icon review (candidates only) | P3 Galeria |
| Chase board | ●●● | ●● | ● | e2e + performance harness | P3 Pościg |
| Maps `… (2026)`, props, difficult-terrain hints | ●●● | ●● | ●● | Maps pipeline | P3 Mapy |

**Deprioritised — no station of their own:** data tables and their closure; the rules engines (TT
computation, okoliczności engine, umieranie / rekonwalescencja / production rules, disease ladders);
coverage ledgers; pack building and contents; migrations and audits; the chase motion model. They are
deterministic, have no outside interaction and are covered by Quench layers 1–5. A human sees only
their **presentation**, inside the stations above (the TT tooltip in Garderoba, a production card in
Kuźnia).

## 5. Stations

Probes below are examples; the full card lives with each builder. Probe cards are in Polish in the
panel (H-D8).

### 5.1 Strzelnica (P1)

**Setup** — a long lane (≥ 120 m) with range markers at the weapon bands; a firing line of Obsada
covering P / KS / DS / MS / OZ, a shotgun, bow and crossbow, LAW / granatnik, miotacz ognia, plus a
melee corner. Targets: manekiny (high PW, no AI), an armoured target, targets behind ½ and ¾ cover, a
cluster of six for area weapons, a Bestiariusz target with reactions, a machine (Próg awarii), a large
creature. An explosives pit with walls (area picker against walls). Splatter on. The tracer panel
(`game.neuroshima.vfx.panel()`) and the sound panel (`game.neuroshima.sounds.panel()`) one click from
the card.

**Probes**
- Per caliber: tracer length, speed and colour, and the sound — do they match the gun; does a burst read as a burst?
- One shot = how many cards and clicks (Liczniki)? Is the verdict readable without opening anything?
- Okoliczności badges when shooting in melee, at long range, while running — do they explain the Utrudnienie?
- Reakcje celu from the player's seat: intrusive? can they find their button?
- Rigged 1: jam and melee degradation messages — understandable to a player?
- Grenade, mine, C4: area preview on dark and light floors; detonation timing; scorch and blood amount.

**NOE / WKK** — dumdum, rozrywająca, pojedynczy nabój, pistolet na race, the Mołotow's light.

### 5.2 Garderoba (P1)

**Setup** — a plain scene; Obsada at loadout extremes: Goły, typical per class, Chomik, full
oporządzenie (doll, full belt, magazines), power armour, an NPC with weapons (the 180 px sidebar),
Opiekun (companion bar).

**Probes**
- Doll panel docking at 1366×768, 1920×1080 and 2560×1440; two sheets open; small and large interface scale; light and dark theme.
- Dragging between pack, doll, belt and ground — does the displacement animation read as "this moved there"?
- Udźwig bar and legend on Chomik; section order and density at ~300 items; scroll stability while editing quantities.
- Pips, badges, tooltips (TT breakdown): overlap, truncation, contrast.
- Player's seat: what can the player drag, does the GM relay feel instant?

**NOE / WKK** — Kamizelka taktyczna (+1 slot), Darmowe upuszczanie, power-armour exclusions (D23).

### 5.3 Ciemnia (P1) — judged from a player's seat

**Setup** — a night ruin with walls, doors and windows, darkness 1.0, a few ambient lights; three
Obsada owned by Gracz 1–3 with latarka, noktowizor, termowizor; pochodnia, flary, pistolet na race,
Mołotow; hidden NPCs, warm (mutants) and cold (machines); a drone with remote view.

**Probes**
- Latarka's two cones follow a moving token, not one step behind.
- NVG grain and thermal palette: readable and not tiring, at two zoom levels; the 220° field of view.
- Flare arc and light; pochodnia flicker and fuel; Mołotow light.
- Drone: OSD readability, signal degradation with distance and walls, losing and regaining the picture, handover.
- Frame time with ten light sources (Liczniki).

**NOE / WKK** — latarka radii (`LIGHT_KOBALT`), Mołotow light, pochodnia, flara.

### 5.4 Lazaret (P1)

**Setup** — beds = Obsada copies preset through the module's funnels: umierający (0 PW, failures),
stabilny, Zranienie Lekki → Krytyczny, Wyczerpanie from several sources, choroby at different stages,
a phobia, Upojenie, Skażenie, Krwawienie, Podpalenie, an Uduszenie phase, Przemarznięcie; a Medyk with
a kit and Aspiryna i Miętusy; a Staza.

**Probes**
- Stan panel: can the GM read a patient's state in two seconds? Token status icons at 50 % and 100 % zoom; levelled HUD icons.
- Umieranie from the player's seat (death-save cards) and the GM's "Śmierć" confirmation.
- DO window with Rekonwalescencja — NOE, RAI and WKK side by side (Wyczerpanie from Krytyczny); the kalendarzyk forecast.
- **The outstanding E7 manual pass of the Zagrożenia tool (PLAN_m1_walka) — here, not in the campaign.**
- Time (Czas): DO, Zachód słońca, 1k8 h stabilisation — does the feedback say what happened?

### 5.5 Second wave (P2)

- **Arena** — a medium map with cover; Drużyna Poligonu (five, a dog, a drone, Prawa ręka) against
  8–12 from the Bestiariusz (armed humans with reactions, a machine, a swarm, something big). Judge:
  wall-clock time and clicks per round, the tracker with initiative groups, the chat after three rounds,
  NPC drops and ground items, BN pada, frame time.
- **Bestiariusz** — the monster closet moved here (the campaign scene goes, §8) plus a statblock walk:
  NPC sheet, reactions, `dropsAs`. Hosts PLAN_monster_closet §11 step 2 — harvest works the same, only
  the venue changes.
- **Kuźnia** — Spec personas with schematics and surowce; jammed, damaged and degraded weapons, damaged
  armour, a broken helmet [WKK Dziurawy hełm]. Judge: the Produkcja tab, a project over time (Czas),
  Szybka produkcja, repair paths, the oprawa sounds; drone production → rozłóż.
- **Kreator** — empty characters per player; level 1 → 3 (profession) → 5, multiclass, Sztuczka,
  Pochodzenie ability, the companion wizard; `docs/Pierwsze-kroki.md` open beside it; Kobalt-only
  options hidden with Kobalt off. The kind of hole M6 "Biegłości profesji" was gets seen here.
- **Droga** — Drużyna Poligonu and its vehicle; a day of travel through biomes, supplies, hunting, rest
  activities, Zachód słońca. Judge: the party sheet's density and clicks per travel day.

### 5.6 Third wave (P3)

- **Galeria** — generated journal pages: every shipped icon per pack at 64 / 32 / 16 px on light and
  dark; status icons at token size and two zooms; activity and class icons; placeholders highlighted
  against `dev/icons/MISSING.md`. Judges the shipped set's consistency in context — the icon review
  queue judges candidates one at a time.
- **Pościg** — the `poscig` fixture as a station; the campaign's `Pościg — test` goes (§8).
- **Mapy** — preview `… (2026)` scenes before they reach the campaign, with Obsada at scale: walls,
  lights, difficult-terrain hints, props, the "Mapa Schrödingera" check. Needs the Maps repo's
  `tools/push.py` to target profile `poligon`.
- **Plac** — an empty scene for free combination; reset wipes it. Cheap enough to ship in H1.
- **Scenariusze** — presets composed of builders: "Nocna zasadzka" = Ciemnia + Arena NPCs +
  explosives; "Ranny w drodze" = a Lazaret patient + Droga.

## 6. Tooling — `fvtt` additions

| Command | Does |
|---|---|
| `poligon:init` | data path (`initSandbox` with the campaign's module set), world `poligon`, users, `/agent-poligon/` junction, Poligon packs |
| `poligon:start` / `poligon:stop` | lifecycle with the "human present" guard |
| `poligon:reset <station>` / `--all` | runs a builder in a GM tab, like `world:seed` |
| `poligon:obsada [--rebuild]` | builds the persona compendium through advancement |
| `poligon:findings [--since] [--open] [--md]` | §3.7 |
| `poligon:clone [--refresh]` | §3.6 |
| `doctor` | adds: Poligon state, stale packs / Obsada, open findings, campaign hygiene (§8) |

`PROFILES` gains `poligon`. Existing commands take `--profile=poligon` where it makes sense (`packs`,
`login`, `eval`, `logs`, `reload`, `quench`); `world:*` and `e2e` refuse it. New commands are
classified in `guards.COMMAND_CLASS` with tested refusals (`dev/agent/README.md`, "Extending"). The
`/agent-poligon/` junction is created on every non-campaign data path (the sandbox's `poligon` e2e suite
imports the builders too). foundry-mcp: its `world` parameter learns the Poligon data path, so findings
are readable offline.

## 7. Workflow integration

- **`TESTING.md` — Warstwa 7, „człowiek na Poligonie”**: what humans judge (§1.3), where (stations),
  how findings flow (§3.7). Rule, beside the layer-6 rule: *a change touching UI, canvas, VFX, sound or
  a multi-step flow adds or updates its station's probes, and the hand-off names the station and the
  probes to look at.* The GM's verdict, not the agent's, closes them.
- **e2e suite `poligon`** (sandbox, agents): builds every station and the Obsada in a throwaway world —
  zero console errors, expected counts, the persona ↔ ledger invariant. Run with every `release:check`.
- **Stale verdicts** (H6): each probe lists the files it judges; the panel marks a ✅ whose files changed
  since the commit it was given on — "look again after these changes".
- **`AGENTS.md`**: one row for `fvtt poligon:*`, the rule above, and "never test in the campaign world".

## 8. Campaign cleanup and hygiene (last, GM approval)

1. Foundry backup of the campaign (`fvtt backup`).
2. A read-only dry-run list (`fvtt eval`): §1.1 plus anything flagged `testScene` / `fixture` /
   `poligon` or named like test data. The GM ticks what goes.
3. Delete. **Szafa z postaciami stays** — it calibrates real campaign actors, its output is their
   `prototypeToken`. Zbrojownia stays if it still hands out items (H-D4); testing on it stops either
   way. Piekarz goes back to being a character.
4. **Hygiene check** in `doctor`: test-looking documents in the campaign (names `TEST*`, `__*`,
   `[Quench]*`, the flags above, folder `Testowe`) are a *problem*, target 0 — agents' leftovers
   included.

Related, out of scope: Quench layers 1–5 run in the campaign world by default (TESTING §5), and
`e2e --quench` in the sandbox is already the reliable venue. Moving the default is a separate decision.

## 9. Stages

| Stage | Content | Size | Done when |
|---|---|:-:|---|
| **H0** Spikes | (1) `poligon` data path up beside campaign and sandbox; (2) world `esmodules` from `/agent-poligon/` loads in the Poligon and nothing reaches the campaign; (3) `worlds/output/characters/…` served in the Poligon; (4) a campaign LevelDB copied while the campaign runs opens cleanly as `output` on the Poligon server; (5) `getDisplayMedia` frame → upload; (6) one persona through advancement headless, and how long it takes | S | each spike's yes/no recorded in this file |
| **H1** Skeleton + first station | `poligon:init/start/stop/reset`, guards with tests; panel (Stanowiska, Świeżość, banner); Magazyn; Obsada v1; Plac; **Strzelnica** | M | the GM opens the Poligon with one command and resets Strzelnica three times with no leftovers; campaign document counts identical before and after |
| **H2** Core human stations | Garderoba, Ciemnia, Lazaret; panel Wariant, Czas, Kości, Widok gracza, Liczniki; full Obsada | M–L | the GM completes the E7 manual pass in Lazaret and one Ciemnia session from a player's seat — in the Poligon |
| **H3** Loop + rot guard | Uwagi, journal, `poligon:findings`; e2e `poligon`; TESTING.md Warstwa 7; AGENTS.md | S–M | a finding written in the Poligon reaches a plan without retyping; a broken builder turns `e2e --suites=poligon` red |
| **H4** Second wave | Arena, Bestiariusz (closet moved), Kuźnia, Kreator, Droga; Obsada ↔ ledger invariant | M–L | monster closet calibration pass done in the Poligon; production played end to end once |
| **H5** Klon kampanii | `poligon:clone`, its guards and tests, banner | M | a migration rehearsed on the clone; the campaign's documents unchanged |
| **H6** Third wave | Galeria, Pościg, Mapy, Scenariusze, stale verdicts | S each | per station: the GM's first session left at least one Uwaga or an explicit "nic" |
| **H7** Campaign cleanup | §8 | S | `doctor` hygiene at 0 through two weeks of development |

H1 first: from day one it is faster than the Zbrojownia/Piekarz habit. H2–H3 make it a loop.

## 10. Decisions for the GM

| # | Question | Recommendation |
|---|---|---|
| H-D1 | Own data path (C) or a world on the agents' sandbox (B)? | C |
| H-D2 | Poligon code via world `esmodules` (nothing shipped) or a gated loader in the module? | `esmodules`, if H0 (2) holds |
| H-D3 | Campaign clone: yes? Same id `output`? Asset folders junctioned (an upload in the clone would land in the campaign's folders) or copied? | yes; same id; junction the big read-mostly folders, copy the rest |
| H-D4 | After cleanup: Zbrojownia, Szafa z postaciami, Piekarz? | Zbrojownia only if it still hands out items; keep the Szafa; Piekarz back to normal |
| H-D5 | Runtime mode: Poligon frozen for agents like the sandbox (D9)? | yes for agents; the GM can still use a Poligon that is already running |
| H-D6 | Findings: journal as source, export to `logs/poligon/` (ignored) or to the vault? | journal + `logs/poligon/` |
| H-D7 | Playtest nights with real players in the Poligon (needs it reachable like the campaign)? | later, not before H4 |
| H-D8 | Probe cards in Polish? | yes |
| H-D9 | May agents reseed a station while the GM is connected (with a notification), or only when asked? | only when asked |
| H-D10 | Five player users or three? | five, the table's size |

## 11. Found while planning

- Bestiary portraits in the `bestiariusz` pack point at `worlds/output/characters/…`, a folder that
  exists only in this campaign's world. In the Poligon, the sandbox and any other install they will not
  load (H0 (3) confirms); the release gate does not look at portraits. A separate fix (ship the
  portraits, or a fallback), not this plan.
- `dev/packs/build-packs.mjs` hardcodes the campaign's absolute data path in two constants — a
  machine-specific path in a public repo (AGENTS.md rule). It should come from the local `fvtt` config.
- The campaign world carries test and agent leftovers (§1.1); the §8 hygiene check would flag them.
- Human-only items that should move into the Poligon instead of waiting for the campaign: the monster
  closet calibration (PLAN_monster_closet §11), the E7 manual pass (PLAN_m1_walka), the first play of
  production (PLAN_produkcja). M6's review of which proficiencies each PC picked is campaign work and
  stays there.
