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
| Arena | P2 | five plus a dog, a drone and a Prawa ręka against ten from the Bestiariusz; combat prepared. M6: the room's door for „Ufizycznij”, a pond in a ford (`woda` Regions), a crowbar for improvised attacks |
| Bestiariusz | P2 | the monster closet (`monsterCloset.regenerate()`), calibration pass and statblock walk |
| Kuźnia | P2 | production and repair: a workshop Miejsce, schematics, jammed / damaged / blunted weapons, a Robota |
| Kreator | P2 | empty characters per player, the companion wizard |
| Droga | P2 | the party sheet, a vehicle, food and water of every quality |
| Garaż | P2 | M4 vehicles: a sedan with three riders (a Wojownik autostrady driving), motorcycle, bicycle, truck with a bed, fire engine, Hammer with a turret Browning, tank; dummies to run over, rubble (difficult terrain), a mechanic with tools. Probes for every decision D2–D18 of `PLAN_m4_pojazdy.md` and its own traits |
| Poziomy | P2 | v14 Levels and the module's transitions: a three-level bunker (Góra / Środek / Dół) with stairs, a broken flight (`trudnePrzejscie`, the player rolls; DC 12 down, 16 up), a weight-tier shaft (the GM decides), a crawl duct (speed choice), a hole in the floor (dnd5e falling, "Opuść bezpiecznie"), radioactive sludge with the jump dialog and a footbridge tool, a machine to **Detonuj** and an ambush to **Odsłoń** (FX markers). Three seats at STR 15 / 13 / 10 — the jump thresholds over 4.5 m |
| Pościg | P3 | the chase board from the `poscig` e2e fixture (art, sway, performance) and a folded-road board (`PLAN_m4_pojazdy.md` §6.2): catalog vehicles at true scale with crews — the players' sedan (driver, Minimi gunner with grenades), a raider Hammer and bus; a 1.5 m parking lot with a crewed buggy for Ctrl+X/Ctrl+V; a km region map. Probes for D21–D31 |
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

## Grafika pojazdów w Garażu

**Ctrl+Shift+P → Stanowiska → Garaż / Idź → Karta prób**. Przyciski **Parking** oraz
**Grafika: Osobówka / Hammer / Motocykl / Ciężarówka / Buggy / Autobus / Traktor / Wóz strażacki / Buldożer / M2 Bradley / M1A1 Abrams / Motorower / Rower / Deskorolka / Wraki — wszystkie pojazdy** otwierają sceny dla MG i graczy.
Parking używa dostarczonych grafik wszystkich czternastu pojazdów. Podglądy mają portret, pusty pojazd,
pełną obsadę i odpowiedniki postaci obok; pojazdy z dachem także pusty wzorzec wnętrza,
motocykl, buggy, traktor i buldożer osobno wariant z jednym kierowcą. To rzeczywiste pojazdy z oknem Miejsc, kluczykami i silnikiem.

`stations/garaz-grafika.mjs` tworzy podglądy jako część zwykłego generatora Garażu. **Reset Garażu
odtwarza Parking, czternaście podglądów pojazdów i porównanie wraków (16 scen)**. Nowe sceny używają rozmiarów katalogowych i
źródłowych skal Commoner/Guard/Bandit z dnd5e, bez kampanijnych danych ani eksperymentu 85%.
Pojazdy dostają bieżące pliki i kotwice także przy starszej paczce otwartego Poligonu.
Podpinanie już istniejących podglądów zachowuje ich pozycje, obsadę i skale; reset buduje je od nowa.

Sprawdzenie: `fvtt e2e --suites=garaz-grafika` — panel, widok gracza, Miejsca, ruch i obrót,
wnętrze i właz Hammera, zachowanie istniejących podglądów oraz ponowne odtworzenie bez duplikatów.
Ciężarówka ma trzy zakryte miejsca kabiny i osiem otwartych miejsc paki; osoby na pace pozostają
widoczne przy zamkniętej kabinie. Jedenaście grafik odniesienia mieści się w dwóch rzędach.
Buggy ma dwa sąsiednie otwarte fotele: pełne pionki nad ramą także bez najechania, bez osobnego
wariantu wnętrza. Próba `grafika-buggy` obejmuje grafikę, miejsca, celowanie oraz ruch i obrót.
Autobus ma kierowcę, 20 foteli pasażerów i wolny tył, zgodnie z wyborem MG. Dłuższy żeton
i cztery rzędy 21 grafik odniesienia mieszczą się na scenie 28×25. Wysokość podglądu zależy
od długości pojazdu i liczby miejsc; układ mniejszych podglądów pozostaje dotychczasowy.
Próba `grafika-autobus` obejmuje zgodność dachu/wnętrza, 21 kotwic, manewr na wolnym miejscu
oraz okno Miejsc.
Traktor ma centralne siodło kierowcy i poduszkę pasażera na bocznym błotniku; obaj stale nad
pojazdem. Próba `grafika-traktor`: cztery koła, dwa miejsca, celowanie, ruch, obrót i okno Miejsc.
Widoczna grafika ma 2,08×3,27 m przy ramce katalogowej 1,5×2,5 kratki.
Wóz strażacki ma pięć zakrytych miejsc kabiny (3+2) i jednego stale widocznego operatora
działka wodnego na pomoście. Para 600×1650 dzieli identyczne piksele poza maską dachu kabiny.
Po korekcie MG proporcje odpowiadają portretowi: krótszy obrys 2×5,5, węższy środek pompy,
drabina tylko na tylnej zabudowie i bardziej wysunięte opony. Widoczny obrys 2,90×7,70 m.
Próba `grafika-woz-strazacki` obejmuje oba widoki, sześć miejsc, celowanie oraz ruch i obrót.
Buldożer ma dwa otwarte siedzenia: operator po lewej obrazu i pomocnik po prawej, bez dachu.
Obaj stale widoczni nad ramą. Próba `grafika-buldozer`: gąsienice, lemiesz, zrywak, dwa miejsca,
celowanie, ruch, obrót oraz wsiadanie i wysiadanie pomocnika. Widoczny obrys 3,55×5,78 m,
ramka katalogowa 2,5×4 kratki. E2E `garaz-grafika` **12/12**, bez błędów konsoli modułu.

Bradley ma układ M2A2: kierowca, działonowy i dowódca w koszu wieży oraz sześciu żołnierzy
przy burtach. Dwie ławki po trzy miejsca są zwrócone do środka; `obroty` miejsc ustawia
kierunek przy wsiadaniu i przesiadce. Próba `grafika-bwp`: dziewięć zakrytych osób,
prześwietlenie, ruch i obrót, przesiadki między ławkami a kierowcą. Obrys 2,4×4,5 kratki;
widoczna bryła 3,385×6,55 m. Osobna grafika wieży ma oś w pierścieniu i dziedziczy obrót,
skalę oraz drgania kadłuba; znika przy prześwietleniu i ukryciu. Próba obejmuje również
odrysowanie i własny obraz pojazdu. Celowanie wieżą pozostaje po becie.
M1A1 Abrams ma cztery zakryte miejsca: kierowca w osi przodu, dowódca za działonowym po
prawej pojazdu, ładowniczy po lewej. Osobna wieża używa tego samego renderera i zachowania
prześwietlenia co Bradley. Obrys kadłuba 2,6×5,6 kratki (3,9×8,4 m), widoczny kadłub
3,65×7,93 m; pełna długość z lufą 9,83 m. Grafika 780×2100 jest dopasowana do szerokości
viewportu 780×1680 z kotwicą 50% / 40%; lufa wystaje poza pole. Tło okna Miejsc jest
przycinane do kadłuba, więc kotwice pozostają przy siedziskach. Próba `grafika-czolg`
obejmuje cztery miejsca, wsiadanie/wysiadanie, ruch, prześwietlenie i warstwy wieży.
Motorower ma jedno otwarte siodło przed czerwoną skrzynką. Pełny pionek kierowcy stale nad
grafiką, bez kropek i przygaszania; obrys 0,6×1,56 kratki (0,90×2,34 m), widoczna sylwetka
0,86×2,25 m po powiększeniu pojazdu do 120% na życzenie MG. Kierowca zachowuje rozmiar.
Podgląd jednomiejscowy pokazuje pusty i obsadzony pojazd, bez zdublowanej pełnej
obsady. Próba `grafika-motorower`: portret, proporcje, kotwica, celowanie, ruch z obrotem,
wsiadanie/wysiadanie przez Miejsca. Odpowiednik postaci obok ma źródłową skalę.
Rower ma musztardową stalową ramę i tylny druciany koszyk z prześwitami, jedno otwarte
siodło z kotwicą 50% / 31%. Obrys 0,6×1,5 kratki (0,90×2,25 m), widoczny 0,72×2,19 m,
dobrany względem zaakceptowanego motoroweru. Próba `grafika-rower`: portret, pusty i obsadzony
pojazd, zwykłe celowanie w rowerzystę, ruch, obrót i Miejsca. Bez silnika i wydechu.
Deskorolka ma cztery jasne kółka i łatkę wskazującą przód, jedno otwarte miejsce stojące.
Po korekcie MG obrys 0,6×0,72 kratki (120% pierwszego podglądu), źródłowa skala postaci.
Próba `grafika-deskorolka`: grafika, wejście/zejście, ruch, obrót i widoczność jadącego.
Regulacja wielkości postaci na jednośladach odłożona przez MG na później.

`stations/garaz-wraki.mjs` dodaje **Grafika: Wraki — wszystkie pojazdy**, próbę `grafika-wraki`.
Jedna scena `wraki-art-review-v1`: 14 par, sprawny po lewej i indywidualny wrak przy 0 PW
po prawej. Wszystkie grafiki mają natywne ramki i przezroczyste tło. Abrams zachowuje nawis
lufy; uszkodzone wieże są częścią wraku, bez nakładania sprawnej wieży. Najechanie nie
prześwietla wraku. Test obejmuje 0 PW i cofnięcie z odtworzeniem pełnej tekstury wszystkich
14 typów u MG i gracza. Stara scena trzech porównań jest aktualizowana w miejscu; pozostałe
podglądy nie są resetowane. Kolejne przyjęcie gotowej galerii zachowuje ręczne ustawienia.
Wyniki i aktualny raport: [wraki](../art/m4/wraki/README.md).

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
