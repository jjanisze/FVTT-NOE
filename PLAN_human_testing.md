# PLAN — Poligon: a human testing ground for NOE and WKK

> Status: **code in place for H0–H5, H7 and most of H6 (2026-10-12, §12)**. The
> stages' "done when" items that are GM sessions — §5.0's veto verdicts and Scenariusz zero, the E7 pass in
> Lazaret, a Ciemnia session, the closet calibration, production played once — are the GM's next step.
> **Veto (2026-10-17):** the GM walked M3 and M5 slice by slice as they were deployed; there will be no formal pass
> over the probes (Hangar ~45, M5's U1–U58) before the Foundry 14.369 / dnd5e 6.0 migration — "it has to do".
> Recommended answers to §10 adopted provisionally, GM may veto. Benchmark: **M3 (companions and drones) is the first
> station** (§5.0). Campaign cleanup done 2026-10-11 (§8).
> Code: `dev/poligon/` (README there), `fvtt poligon:*` (`dev/agent/lib/poligon.mjs`), e2e suite `poligon`.
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

**Removed 2026-10-11** with the GM's approval: every row above except the two test benches, plus the four
stub actors in `Testowe`. What cannot be regenerated was exported first to the world's `neuro-backups/`.

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
- Bestiary portraits are no longer a reason for the clone: they leave the pack (§11) and reach the GM's
  worlds through a private art module, which the Poligon links like any other module.
- **First clone made by hand 2026-10-11** for the trailer recording, on the agents' sandbox data path:
  campaign stopped for the copy (about a minute), world folder copied without LevelDB `LOCK` files, the
  two Data-root `assets/` images copied, `[KLON]` title prefix and the marker written by Node (no BOM),
  `sandbox:init`, launch. Every campaign asset resolved, server log clean. Lessons for `poligon:clone`:
  the clone shares `localhost` cookies with the campaign tab (log in through an isolated context or
  another browser); while it runs on the sandbox server, any agent `e2e` / `world:*` would shut it down —
  runtime mode, or the Poligon's own data path.

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
| Companions and drones (M3, closed 2026-10-10, never played): owner bar, Komenda, initiative groups, creation wizard, drone build → deploy → controller → remote mode, analog camera and OSD, signal, power, failures, repairs, EMP; ~45 implementation calls awaiting the GM's veto | ●●● | ●●● | ●● | e2e `towarzysz`, `towarzysz-tworzenie`, `dron`; Quench | **P0** Hangar (benchmark) |
| Attack flow: card, verdict, okoliczności badges, Reakcje celu, fire modes, magazines, jams, damage tray | ●●● | ●●● | ●●● | e2e, functional | **P1** Strzelnica |
| VFX and sound: tracers, muzzle flash, explosions, sound banks, Splatter, scrolling text | ●●● | ●● | ●●● | nothing can assert it | **P1** Strzelnica |
| Explosives on the map: area picker, throw, mines / C4 / IED, detonation, Mołotow, kolczatka | ●●● | ●●● | ●● | e2e grenade | **P1** Strzelnica |
| Sheet and inventory: shell, Stan, Zasoby, lalka, pas, sections, Udźwig bar, pips, ulepszenia, Fuksy, PD, hotbar | ●●● | ●●● | ●●● | Quench `lalka` | **P1** Garderoba |
| Vision and light: latarki, NVG / thermal, 220°, flary, pochodnia, darkness (the drone camera: Hangar) | ●●● | ●●● | ●● | none | **P1** Ciemnia |
| Health: Stan tracks, status icons and HUD, umieranie cards, DO window with Rekonwalescencja, kalendarzyk, choroby, Zagrożenia tool | ●● | ●●● | ●●● | Quench + e2e | **P1** Lazaret |
| Combat at table scale: tracker, groups, companions, NPC reactions, drops, ground items, chat volume, performance | ●●● | ●●● | ●●● | e2e, small | P2 Arena |
| Production and repair (never played at the table) | ●● | ●●● | ●● | Quench rules | P2 Kuźnia |
| Bestiary: token art and scale, statblocks, reactions, drops | ●●● | ● | ●● | Quench closure | P2 Bestiariusz |
| Creation, level-up, companion wizard | ●● | ●●● | ● | e2e `postac`, `towarzysz-tworzenie` | P2 Kreator |
| Party sheet, travel, supplies, rest activities, clock | ●● | ●● | ●● | Quench, partial | P2 Droga |
| Icons and art in context | ●●● | ● | ●●● | icon review (candidates only) | P3 Galeria |
| Chase board | ●●● | ●● | ● | e2e + performance harness | P3 Pościg |
| Maps `… (2026)`, props, difficult-terrain hints | ●●● | ●● | ●● | Maps pipeline | P3 Mapy |
| Trade, postój, scavenging, gutting, autodestruction (M5, planned — `PLAN_m5_postoj.md`): GM price list, trade table with GM-only numbers, merchants, the day ledger (players propose, GM commits), Fuksy v2 and Fanty, wrecks | ●●● | ●●● | ●● | e2e `handel`, `postoj`, `szabrowanie`, `bebeszenie` (planned) | **P1** Bazar, Złomowisko (when M5 lands) |

**Deprioritised — no station of their own:** data tables and their closure; the rules engines (TT
computation, okoliczności engine, umieranie / rekonwalescencja / production rules, disease ladders);
coverage ledgers; pack building and contents; migrations and audits; the chase motion model. They are
deterministic, have no outside interaction and are covered by Quench layers 1–5. A human sees only
their **presentation**, inside the stations above (the TT tooltip in Garderoba, a production card in
Kuźnia).

## 5. Stations

Probes below are examples; the full card lives with each builder. Probe cards are in Polish in the
panel (H-D8).

### 5.0 Hangar — the M3 benchmark (P0)

**Why first.** M3 is the largest feature with nothing in the campaign to try it on: no drones, one
migrated companion (Evie), and the controller, remote mode, camera and OSD exist only in e2e runs.
It touches every human blind spot at once — look (analog camera, OSD), feel (activation flow, Esc,
WASD), several seats (operator handover, a player's death-save cards), scale (two companions and a
drone on one sheet), time (battery on the clock) and NOE/WKK (repairs). And `PLAN_m3_towarzysze.md`
§11 ends every stage with *rozstrzygnięcia do weta MG* — about 45 calls nobody has judged yet. The
station's first job is to put each of them in front of the GM.

**Coverage before this revision:** one bullet in Ciemnia (OSD, signal, handover), one phrase each in
Kuźnia (production → deploy), Kreator (companion wizard) and Arena (a dog and a drone in the party),
and Opiekun on Garderoba's roster. No station owned M3, and none of the veto list was referenced.

**Setup** (three player seats — operator handover and death saves need them):
- **Yard** — an outdoor scene ≥ 150 m long with markers at 20 / 50 / 100 m from the operator's spot and a
  walled building; **Basement** — a second scene with the „Pod ziemią” scene setting.
- Obsada: a Haker (Spec/Monter, INT +3 — the creator) with a finished walking drone carrying a weapon
  and magazine, a flying drone, and one Robota near completion; Gracz 1 with the factory controller,
  Gracz 2 with the homemade one; Sędzia with a Ludzki partner (Gracz 3), Łowca Mutantów with a tamed
  mammal, Mafiozo with a Prawa ręka, Zabójca Maszyn with an Emiter EMP; Magazyn with surowce and spare
  batteries.
- Targets: Obrońca (armour note — EMP), Spawacz (Próg awarii), Gangus Kapo (has Stopień — dies like a
  PC now), Cywil (no Stopień), a living creature for EMP.

**Probes**
- *Companions:* the owner's bar at 212 px with two companions and a drone; the badge tooltip; the
  initiative group in the tracker; Komenda → turn; no Komenda → the „bez komendy” card from a player's
  seat, [Cofnij]; a companion's death-save cards; the party sheet; the DO medic pool; dirty water.
- *Creation:* GM tool → the player's wizard (Cechy → Pochodzenie → klasa) in their own seat; k6 animal;
  [Odłącz]; the warning when „Towarzysz” is dropped on a PC.
- *Drone, hands and items:* Robota → handle with „System ruszył …”; handle weight on the Udźwig bar;
  the refused clone; Rozłóż preview and click; Złóż warning; [Weź do ręki] and the doll moving things
  out of the hand; badges „atak wymaga Steruj [A]” and „druga aktywacja”; [R].
- *Remote mode:* Esc (windows first), WASD vs arrows, camera follow, end of the operator's turn; the
  analog picture at 20 / 50 / 100 m, through a wall and in the Basement; FAILSAFE timing; the OSD at
  1366×768, 1920×1080 and 2560×1440, next to chat and sidebar — action list, ARMED and ammo, BAT LOW;
  handover to Gracz 2; frame time with the filter on.
- *Failures, repairs, power:* the [Zastosuj] card (GM sees, player does not); skipped entries; the
  borrowed „Wyłączony” icon; the flying drone's „Spada” card; battery on the handle and the OSD across a
  clock jump; Włóż akumulator; Napraw PW (1 h); the same failure repaired under NOE (GM card) and under
  WKK (Robota with parts); the wreck.
- *EMP:* hit against Obrońca at TT 10 — is the reason visible; the ×0 tray against a living target;
  Porażenie on machines only; the 230 V card.
- *Bestiary, RAW s. 205:* Gangus Kapo at 0 PW enters dying instead of „BN pada” — does that slow a
  fight with five such enemies too much; a crit on Cywil gives no Stopień.

**Veto walk** — every *rozstrzygnięcie do weta MG* in `PLAN_m3_towarzysze.md` §11 becomes a probe on the
card, grouped by stage, with ✅ keep / ❌ change (→ an Uwaga). Highlights: the signal curve („at 0,5 the
OSD is barely readable — snow too strong”, E0); picture colour — colour in light, black and white in the
dark and on weak signal (D38); no motion toggle for tearing and rolling (E8b); OSD in the free canvas
area, 24 rows (E8c); the end of the operator's turn ends remote mode (E8a); a new drone with a full
battery (E7c); one repair Robota per drone (E9); EMP 8 kg / 200 gb and the GM charging card (E10).

**Scenariusz zero** — one scripted session through the whole thing: the Robota finishes → Gracz 1
scouts the Basement until FAILSAFE → Gracz 2 takes over from the yard → a fight in the yard (partners
with and without Komenda, a drone attack in [A], [R], a crit → failure, the flying drone switched off in
the air, EMP on Obrońca, Gangus Kapo dying) → afterwards: Napraw PW, the failure under NOE, then Kobalt on
and the Robota, a clock jump and a battery swap, a Long rest with the medic pool, the day's supplies.

**Done when:** every veto probe has a verdict; Scenariusz zero ran once with three seats; findings are
triaged into `PLAN_m3_towarzysze.md` §11 or a follow-up plan. It is also the Poligon's own acceptance test
(H1).

**Veto, 2026-10-17:** the GM walked M3 slice by slice as it was deployed; the formal verdict pass over these
probes is not happening before the Foundry 14.369 / dnd5e 6.0 migration — "it has to do". The two findings the
Hangar did file (2026-10-12: Cichy krok written from a player client, power sync on a deleted drone) are fixed in
v0.19.0 (`1d4cf2e`) and closed in "Poligon · Uwagi".

**Before the Poligon exists:** write the builder first, as a sandbox fixture (`fvtt world:create hangar
--fixture=hangar`). When the Poligon exists, the same builder becomes the station. Until then no agent runs
`e2e` or `world:*` on the sandbox while the GM is in it — that is H-D1's whole argument.

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
  NPC drops and ground items, BN pada, frame time. M3 here only at table scale — its own probes are in
  the Hangar.
- **Bestiariusz** — the package closet (Szafa z potworami) plus a statblock walk: NPC sheet, reactions,
  `dropsAs`. Hosts PLAN_monster_closet §11 step 2. Since 2026-10-11 the closet reads only the compendium
  and the dnd5e references (the „Drużyna” band of campaign PCs is gone), so it runs here unchanged; the
  campaign closet (Szafa z postaciami) stays a campaign tool, built only for a calibration session.
- **Kuźnia** — Spec personas with schematics and surowce; jammed, damaged and degraded weapons, damaged
  armour, a broken helmet [WKK Dziurawy hełm]. Judge: the Produkcja tab, a project over time (Czas),
  Szybka produkcja, repair paths, the oprawa sounds; drone production → rozłóż.
- **Kreator** — empty characters per player; level 1 → 3 (profession) → 5, multiclass, Sztuczka,
  Pochodzenie ability, the companion wizard; `docs/Pierwsze-kroki.md` open beside it; Kobalt-only
  options hidden with Kobalt off. The kind of hole M6 "Biegłości profesji" was gets seen here.
- **Droga** — Drużyna Poligonu and its vehicle; a day of travel through biomes, supplies, hunting, rest
  activities, Zachód słońca. Judge: the party sheet's density and clicks per travel day.
- **Bazar** and **Złomowisko** (M5, P1 once M5 lands) — specified in `PLAN_m5_postoj.md` §8 (layer 7):
  a town with merchants, the trade table and a postój day for five; ruins, corpses and a machine at 1 PW for
  scavenging, gutting and autodestruction. Built first as sandbox fixtures, like the Hangar.

### 5.6 Third wave (P3)

- **Galeria** — generated journal pages: every shipped icon per pack at 64 / 32 / 16 px on light and
  dark; status icons at token size and two zooms; activity and class icons; placeholders highlighted
  against `dev/icons/MISSING.md`. Judges the shipped set's consistency in context — the icon review
  queue judges candidates one at a time.
- **Pościg** — the `poscig` fixture as a station (the campaign's `Pościg — test` is gone, §8).
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

## 8. Campaign cleanup and hygiene

**Done 2026-10-11** (GM approval): the §1.1 leftovers, both calibration scenes and the 51 disposable
closet copies, plus the four stub actors in `Testowe`. Nothing unharvested in either closet (checked
before). What cannot be regenerated — the two test scenes, eight actors, the folder, the item and two
tokens on `Start` — was exported to `worlds/<world>/neuro-backups/` and verified before the delete.
Zbrojownia and Piekarz stay; testing on them stops.

Found on the way: an upload from the agent's `fvtt login` tab is refused („User [] does not have
permission to upload files” — the HTTP upload route does not see that session), so backups are written by
redirecting `fvtt eval` output to the file. Worth a `fvtt backup` command.

What remains:
1. **The campaign closet is built on demand** — `characterCloset.regenerate()` for a calibration session,
   `apply()`, then `remove()`. No standing calibration scene in the campaign.
2. **Hygiene check** in `doctor`: test-looking documents in the campaign (names `TEST*`, `__*`,
   `[Quench]*`, flags `testScene` / `fixture` / `poligon`, folder `Testowe`) are a *problem*, target 0 —
   agents' leftovers included.

Related, out of scope: Quench layers 1–5 run in the campaign world by default (TESTING §5), and
`e2e --quench` in the sandbox is already the reliable venue. Moving the default is a separate decision.

## 9. Stages

| Stage | Content | Size | Done when |
|---|---|:-:|---|
| **H0** Spikes | (1) `poligon` data path up beside campaign and sandbox; (2) world `esmodules` from `/agent-poligon/` loads in the Poligon and nothing reaches the campaign; (3) a private art module's `compendiumArtMappings` applies in the Poligon (§11); (4) a campaign LevelDB copied while the campaign runs opens cleanly as `output` on the Poligon server; (5) `getDisplayMedia` frame → upload; (6) one persona through advancement headless, and how long it takes | S | each spike's yes/no recorded in this file |
| **H1** Skeleton + benchmark | `poligon:init/start/stop/reset`, guards with tests; panel (Stanowiska, Świeżość, banner, Karta prób, Widok gracza); Magazyn; Obsada v1 with the M3 personas; Plac; **Hangar** (§5.0) | M | the GM opens the Poligon with one command, resets Hangar three times with no leftovers, and §5.0's done-when holds; campaign document counts identical before and after |
| **H2** Core human stations | Strzelnica, Garderoba, Ciemnia, Lazaret; panel Wariant, Czas, Kości, Liczniki; full Obsada | M–L | the GM completes the E7 manual pass in Lazaret and one Ciemnia session from a player's seat — in the Poligon |
| **H3** Loop + rot guard | Uwagi, journal, `poligon:findings`; e2e `poligon`; TESTING.md Warstwa 7; AGENTS.md | S–M | a finding written in the Poligon reaches a plan without retyping; a broken builder turns `e2e --suites=poligon` red |
| **H4** Second wave | Arena, Bestiariusz (closet moved), Kuźnia, Kreator, Droga; Obsada ↔ ledger invariant | M–L | monster closet calibration pass done in the Poligon; production played end to end once |
| **H5** Klon kampanii | `poligon:clone`, its guards and tests, banner | M | a migration rehearsed on the clone; the campaign's documents unchanged |
| **H6** Third wave | Galeria, Pościg, Mapy, Scenariusze, stale verdicts | S each | per station: the GM's first session left at least one Uwaga or an explicit "nic" |
| **H7** Campaign hygiene | §8 (cleanup done 2026-10-11); `doctor` check | S | `doctor` hygiene at 0 through two weeks of development |

H1 first: from day one it is faster than the Zbrojownia/Piekarz habit, and it starts on the feature with
the most unjudged calls. H2–H3 make it a loop.

## 10. Decisions for the GM

| # | Question | Recommendation |
|---|---|---|
| H-D1 | Own data path (C) or a world on the agents' sandbox (B)? | C |
| H-D2 | Poligon code via world `esmodules` (nothing shipped) or a gated loader in the module? | `esmodules`, if H0 (2) holds |
| H-D3 | Campaign clone: yes? Same id `output`? Asset folders junctioned (an upload in the clone would land in the campaign's folders) or copied? | yes; same id; junction the big read-mostly folders, copy the rest |
| H-D4 | After cleanup: Zbrojownia, Szafa z postaciami, Piekarz? | **Decided 2026-10-11:** Zbrojownia and Piekarz stay; Szafa z postaciami on demand only (§8); the package closet loses its campaign band and moves to the Poligon |
| H-D5 | Runtime mode: Poligon frozen for agents like the sandbox (D9)? | yes for agents; the GM can still use a Poligon that is already running |
| H-D6 | Findings: journal as source, export to `logs/poligon/` (ignored) or to the vault? | journal + `logs/poligon/` |
| H-D7 | Playtest nights with real players in the Poligon (needs it reachable like the campaign)? | later, not before H4 |
| H-D8 | Probe cards in Polish? | yes |
| H-D9 | May agents reseed a station while the GM is connected (with a notification), or only when asked? | only when asked |
| H-D10 | Five player users or three? | five, the table's size |

## 11. Found while planning

- **Bestiary portraits** (checked 2026-10-11): 37 of 51 actors in `bestiariusz` have `img` in
  `worlds/output/characters/…` — the book's own illustrations, ripped from the PDF (Biodroid carries the
  artist's signature); the other 14 have `mystery-man`. Broken in every other world, and not
  publishable anyway (`CREDITS.md`: no book pages are redistributed; Portal Games has no fan-content
  policy we could find). What other systems do: the free system ships **no** creature art (pf2e's default
  NPC icon, dnd5e's SRD source with `img: null`, WFRP4e, Free League, CoC7), and art arrives through a
  **separate module mapped onto the compendium** — since v14 a core feature: `CompendiumArt`,
  `flags.compendiumArtMappings.<system>` in the art module's `module.json`, a mapping file keyed by pack
  and actor id, a per-package toggle in core settings (dnd5e's own Forgotten Adventures art and Paizo's
  paid token packs both work this way). Proposal, awaiting the GM: the public pack's portrait = our own
  token art (or the placeholder); the book illustrations go into a **private, never-published art
  module** that maps them onto the pack's stable actor ids — the GM's worlds, campaign and Poligon keep
  them. `build-packs.mjs` then drops the world path and the hardcoded data path (below). Original
  portraits for public users can come later; the module is not on the official listing, so the Foundry
  AI policy does not constrain that.
  **2026-10-17 (pre-migration hand-off, Z3):** the public half is done — every portrait is `tokens/portraits/<id>.webp`
  or the token art, the world path is gone from the builder. The private art module still awaits the GM; until
  then the campaign keeps the book art on actors already imported, new imports get the token art.
- **Detection:** a `validate-packs` rule — every image path in every pack must sit in `modules/<id>/`,
  `systems/dnd5e/` or core `icons/`, and a module path must exist on disk. It would have caught all 37,
  plus any icon pointing at a missing file, at the release gate. **Done 2026-10-17** (core and dnd5e files
  are checked too where installed, i.e. locally, not on the CI runner).
- `dev/packs/build-packs.mjs` hardcodes the campaign's absolute data path in two constants — a
  machine-specific path in a public repo (AGENTS.md rule). It should come from the local `fvtt` config.
  **Done 2026-10-17:** the world constant is gone; the data root is derived from the module's own folder.
- The campaign world carried test and agent leftovers (§1.1) — removed 2026-10-11 (§8).
- Human-only items that should move into the Poligon instead of waiting for the campaign: the monster
  closet calibration (PLAN_monster_closet §11), the E7 manual pass (PLAN_m1_walka), the first play of
  production (PLAN_produkcja). M6's review of which proficiencies each PC picked is campaign work and
  stays there.

## 12. Implementation (2026-10-12)

**H0 spikes** — (1) ✅ the `poligon` data path runs beside campaign and sandbox: `poligon:init` built it in 76 s
(own port, the campaign's seven active modules asked from a ready campaign page, packs from the working tree).
(2) ✅ world `esmodules` work: core loads a world's own esmodules last (`dist/server/views/view.mjs`), resolved
inside the world folder and required to exist — so the world carries a small real loader file that stamps the page
(`globalThis.__poligon`) and imports `/agent-poligon/poligon.mjs`; `world.json` keeps the entry across Foundry's own
rewrites. `World.launch` uses the cached manifest, so init edits `world.json` with the server stopped. The campaign has
neither junction nor loader. (3) not needed in H1 — portraits wait for the art module (§11).
(4) ✅ `poligon:clone` copied the running campaign's world (715 MB, LevelDB without `LOCK`, 1.5 s) and the clone
opened on the Poligon server with the campaign's exact document counts and all 179 world-path assets resolving.
(5) ✅ canvas half: a GM seat uploads into `worlds/poligon/uwagi/` (the §8 refusal was the campaign's fvtt tab); the
whole-tab path (`getDisplayMedia`) needs the browser's consent click — a human's, untested by agents; an upload a
seat may not make falls back to an inline image. (6) ✅ a persona through dnd5e's real AdvancementManager headless:
7 s at level 3, ~10 s at 5, 22 s at 12 (multiclass).

**Decisions taken as recommended (GM veto open):** H-D1 C · H-D2 world `esmodules` · H-D3 yes, same id, but
**copied, not junctioned** (0.7 GB copies in seconds; no upload can reach the campaign) · H-D5 yes · H-D6 journal +
`logs/poligon/` · H-D8 Polish · H-D9 only when asked · H-D10 five players. H-D7 later.

**Built** (see `dev/poligon/README.md`):
- `fvtt`: profile `poligon`; `poligon:init/start/stop/reset/obsada/findings`; `doctor` shows the Poligon and the
  campaign hygiene count (§8 — 0 on 2026-10-12); guards with tests: `world:*`/`e2e` refuse the profile, lifecycle
  refuses while a person is connected (`--force` on the GM's word), the world is protected, runtime mode freezes it.
- **Seats are isolated browser contexts, always.** Found on the way: Foundry's `session` cookie is per host, not per
  port, so a Poligon login in Chrome's default context would replace the campaign tab's session (same for the
  sandbox's default-context logins). `fvtt login --profile=poligon` therefore always opens a `seat-<user>` context.
- Panel with all §3.5 sections; Kości rigs per die size (`DiceTerm#randomFace`), not one `randomUniform` queue — a d6
  rolled first no longer eats the d20's face. Uwagi with context and screenshots (players' seats too).
- **16 stations** — Hangar (the whole veto walk of `PLAN_m3_towarzysze.md` §11, ~45 VETO probes), Magazyn, Plac,
  Strzelnica, Garderoba, Ciemnia, Lazaret, Bazar and Złomowisko (M5 landed), Arena, Bestiariusz, Kuźnia, Kreator,
  Droga, Pościg, Galeria. All build with no missing pick; a reset of one station touches nothing else.
- **Obsada: 42 personas**; the §3.4 invariant holds — all 18 automated Sztuczki, 34 automated class/profession
  abilities and 4 Pochodzenie abilities sit on a persona (`game.poligon.obsada.coverage()`).
- e2e suite `poligon` (sandbox): the Obsada, the invariant, every station, a no-leftover reset check.
- H5: `poligon:clone [--refresh]` (guards tested: only `worlds/<id>` on the Poligon path, never under the
  campaign's, replaces only its own marked clone, never while running or held) and `poligon:start --klon`
  (a restart into the clone — the server only finds new worlds at startup; `poligon:start` switches back). The clone
  carries the loader with `kind: "klon"`: red frame, "KLON — NIE KAMPANIA", `[KLON]` title.
- TESTING.md Warstwa 7; module and vault `AGENTS.md` ("never test in the campaign world").

**Deviations from the text above:**
- A station owns its scenes **whole** (§3.3 said "deletes exactly that"): a reset deletes the scenes with whatever
  was played onto them — ground items, placed charges, blood, templates — so nothing needs tidying. Actors still die
  only with `disposable: true`; actors made by module funnels (drones, companions, merchants, a workshop Miejsce) are
  adopted into the station's flags. The ability hotbar's per-actor macros go with their actor.
- `scripts/dev/test-scenes.mjs` is reused for its flags; station scenes are built by `lib/kit.mjs` (darkness,
  vision, walls, lights, metric grid). The Bestiariusz station keeps the closet's own regenerate/remove contract.
- Builder lessons: loadouts can immobilise (two 20 kg accumulators on the STR 8 Haker) — a reset now reports any
  overloaded non-Chomik persona as a build problem; bulk materials live in a production Miejsce, not on smiths.

**Found by the Poligon on its first day** (filed as Uwagi in the Poligon journal for triage):
- *Cichy krok* (`actors/cichy-krok.mjs` `_syncCichyKrokTerrain`) runs on every client that sees a level-up's
  `createItem`; a player's client tries to create the GM-only effect → "lacks permission to create ActiveEffect"
  server errors whenever the GM levels a Zwiadowca to 3 with a player connected. **Fixed for v0.19.0:** only the
  active GM synchronizes the effect; `postac` e2e covers owned and unowned characters with players connected.
- Drone power sync (`actors/drony-stan.mjs` `_synchronizuj`) has no `isDocumentLive` check, unlike its neighbours:
  deleting a scene with a deployed drone and then the drone's holder makes it write to a deleted actor (server
  error). **Fixed for v0.19.0:** drone handle/power sync and remote release use `isDocumentLive`, including
  checks between writes; Quench covers a stale drone and `dron` e2e deletes the active drone and operator together.
- The GM's ability hotbar (`actors/ability-hotbar.mjs`) synced per actor while every sync writes the one hotbar,
  and a GM syncs every character it edits: building characters in a row deleted the same macro twice ("Macro …
  does not exist!" server errors). **Fixed:** one sync chain per client. Open for the GM: should the GM's hotbar
  follow other people's characters at all?
  **Release gate follow-up:** macros are now scoped to their user's author/ownership; a player's sync never
  deletes the GM's macros, and GM cleanup never deletes the player's. The `postac` e2e suite covers both clients
  and replacement of a legacy shared macro. Public `hotbar.sync` also goes through the client queue.
- `fvtt eval` printed page origins (host and port) in page-exception text — stripped in `lib/cdp.mjs`.

**Open:** stale verdicts per
file (H6: verdicts remember their commit and the panel flags a ✅ from another commit, not per-file changes);
Mapy (needs `tools/push.py` to target the profile); Scenariusze (composition of builders); foundry-mcp reading the
Poligon path offline. The release gate already discovers `poligon` among all e2e suites (about 10 min per world).
