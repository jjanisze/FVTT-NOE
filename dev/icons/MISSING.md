# Missing-asset queue

Two classes of art, two queues — they cannot share a generation grid, because each grid is
generated against one style reference:

- **A. Sheet icons** — white flat glyphs on transparent, shown in inventory rows, chat cards,
  item sheets. Pipeline: `Pipeline.md` + `normalize_icons.py`. Section *A* below.
- **B. In-world objects** — full-colour pictures of the physical thing, seen from above, used as
  map Tile textures (a thrown grenade lying on the floor, a placed charge). Different style,
  format and processing. Section *B* below. (Added 2026-09-24.)

Rule for both, from the GM (2026-09-24): **every art request goes into this file** — not into
a hand-off, a plan or an agent's working memory. If a feature needs art, the row lands here in
the same session the need is found.

---

# A. Sheet icons (white glyphs)

Icons get generated in batches of 9 (one generated grid image = 9 tiles, see
`Pipeline.md`) via `process_grid_N.py`. Generating one icon at a time wastes a
whole grid image on 8 unused tiles; *not* tracking gaps between sessions is
the opposite failure ("this keeps happening" — flagged 2026-09-07). This file
is the fix: log every item found sitting on a wrong/borrowed icon here as
it's found, generate a batch once the queue hits 9, then clear it.

**Feat / Sztuczka icon pass:** deferred while the equipment and bestiary gaps
were larger; Batch 60 begins the dedicated pass (2026-10-10). It mixes only
the six carried bestiary revisions and three remaining creature/action gaps
with the first eighteen world/compendium feature icons.

Update, IMPLEMENTATION.md (21): three of the four feats named here originally
(Osełka/Dobycie/Zasłona) **no longer exist** — they turned out to be the three
clauses of the Sztuczka `Samuraj`, split up by the Roll20 import, and were
merged into one canonical item that already has a proper icon. What is left on
an actor-portrait icon across the whole party is just two homebrew feats:
Victor's `Siódme poty.` and Laffitte's `Mizoofobia`. `Siódme poty` enters the
Batch 60 review; `Mizoofobia` remains to be verified against the current world.

**Next batch number: 76** (the previous 342-card queue is resolved; the newly
audited class/profession placeholder backlog remains and is listed below).

**Icon coverage correction, 2026-10-15:** the previous 342 review cards are resolved,
but that queue omitted class/profession artwork. The source audit confirms
115 generated initials badges (114 canonically referenced art subjects).
Origins, Sztuczki, M5 actions and fuel-grade deliveries from the earlier pass
remain delivered; these counts do not cover all module icons. See the class
placeholder backlog and `class-placeholder-audit.json`. GM wiring and painted
art remain separate.

*Batch 40 (2026-09-25): Kamizelka taktyczna, .44 Mag dum-dum, Mięso suszone, Chleb, Owoce
i warzywa, MRE, Breneka, Zużyty LAW, Magazynek bębnowy — processed and wired; LAW and the drum
are stored for items that do not exist yet. IMPLEMENTATION.md, 2026-09-25.*

*Batch 41 (2026-10-03): all 9 queued sheet icons generated, normalized and wired. PNG + theme-aware SVG in `icons/items/loot/`; exact prompt in `batch_41_prompt.md`, pipeline `process_grid_41.py`, live updates and validation in IMPLEMENTATION.md. The active queue below is batch 42.*

*Batch 41 review correction (2026-10-03, approved and installed): the small
`schemat_notatka` now uses the single circuit note and medium
`schemat_instrukcja` uses the flat service manual. Both replace the rejected
oversized-cog designs at their existing PNG/SVG paths. Decisions remain in
`dev/icons/review/feedback.json`; candidates and prompts remain archived under
`dev/icons/review/candidates/batch-41/`.*

*All generated production targets through batch 46 are approved, installed and
represented by reusable `sprzet` prototypes.*

*(The conditional "IED radiowy" sheet icon is dropped: the GM chose "decide at placement"
(2026-09-25), so a radio IED only exists on the map — class B row 5 covers it.)*

## Completed (A) — batch 42 — approved and installed

All nine icons are installed. Agregat, Akumulator, Alternator and Defibrylator
also have reusable `sprzet` prototypes and no longer use the production
fallback. Maczuga and Kamienny nóż use the approved simplified atlas revisions.

| # | Item | Where | Current icon | Suggested prompt content |
|---|------|-------|---------------|---------------------------|
| 1 | Maczuga (WKK vendor trash, `wkk/config/weapons-data.mjs`, PLAN_paper_doll D36) → `icons/weapons/maczuga.svg` | dropped by Grubas, Kanibal at 0 PW (Kobalt on); pack `bron` | approved and installed | Crude wooden club, thick knotted head, a few nails driven through it. Must not look like the baseball bat or the pipe |
| 2 | Pałka policyjna (WKK, D36) → `icons/weapons/palka_policyjna.svg` | Konwojent | approved and installed | Police side-handle baton (tonfa-style short grip near one end). Must read as "police", not as a pipe |
| 3 | Kamienny nóż (WKK, D36) → `icons/weapons/kamienny_noz.svg` | Kanibal | approved and installed | Knapped flint blade lashed with cord to a short bone or wood handle — primitive, chipped edge |
| 4 | Sztylet (WKK, D36) → `icons/weapons/sztylet.svg` | Myślący szczur | approved and installed | Narrow double-edged homemade dagger, simple crossguard, rag-wrapped grip. Thinner than the combat knife |
| 5 | Młotek (WKK, D36) → `icons/weapons/mlotek.svg` | Żołnierz Posterunku | approved and installed | Ordinary claw hammer, wooden handle |
| 6 | Agregat → `icons/items/loot/agregat.svg` | Serwisowanie recipe; `sprzet` prototype | approved and installed | Rugged portable gasoline generator: engine, fuel tank and tubular carry frame; no lightning symbol |
| 7 | Akumulator → `icons/items/loot/akumulator.svg` | Serwisowanie recipe; drone power; `sprzet` prototype | approved and installed | Battered 24 V lead-acid vehicle battery with two terminals and carry handle |
| 8 | Alternator → `icons/items/loot/alternator.svg` | Serwisowanie recipe; `sprzet` prototype | approved and installed | Automotive alternator with grooved belt pulley and vented housing; no detached cog symbol |
| 9 | Defibrylator → `icons/items/loot/defibrylator.svg` | Serwisowanie recipe; `sprzet` prototype | approved and installed | Rugged portable defibrillator case with two clipped paddles and coiled leads; no cartoon heart/lightning shorthand |

## Batches 43–44 — 13 integrated, 4 revisions and 1 pending

Both batches were generated as one 3×3 atlas each, then split and normalized.
Thirteen approved icons and prototypes are installed. Laptop, Wytrychy
elektroniczne, Kompas and Trucizna received revision requests; Odtwarzacz CD has
no recorded decision and remains unchanged.

| Batch | Items |
|---|---|
| 43 | Detektor ruchu; Komputer osobisty; Komputer gamingowy; Laptop; Kontroler zdalnego sterowania; Miernik skażenia chemicznego; Odtwarzacz CD; Wykrywacz metalu; Wytrychy elektroniczne |
| 44 | Kompas; Palnik acetylenowo-tlenowy; Środek usypiający; Środki dezynfekujące; Trucizna; Paralotnia; Adapter wifi; Monitorek; Router |

## Batch 45 — 8 approved and installed, Laptop returned for revision

One 3×3 atlas contained four requested revisions, the final two known production
targets, and three verified live-world gaps. Eight approved results are
installed; Laptop received another revision request.

| # | Item | Source |
|---|---|---|
| 1 | Laptop revision | Batch 43 feedback: replace touchpad-like deck with a bold keyboard grid |
| 2 | Wytrychy elektroniczne revision | Batch 43 feedback: add clear screen, knob and controls |
| 3 | Kompas revision | Batch 44 feedback: use a real lensatic compass form |
| 4 | Trucizna revision | Batch 44 feedback: contemporary toxic-warning skull and crossbones |
| 5 | Turbina wiatrowa/wodna | Rulebook production output, missing art and prototype |
| 6 | Zegarek | Profession production output, missing art and prototype |
| 7 | Berdysz | Dante actor item uses `item-bag.svg`; no dedicated asset found |
| 8 | Scyzoryk | Motocyklista actor item uses its actor portrait; no dedicated asset found |
| 9 | Skalpel | Samantha Smith actor item uses her portrait; no dedicated asset found |

## Batch 46 — 6 approved and installed, 3 returned for revision

One 3×3 atlas contained the Laptop and CD-player revisions plus seven verified
world-item gaps. Laptop, CD player, Walther PPK, Ruger LCP II, hydraulic fist
and kitchen spatula are installed. Junk mace, broken bottle and wrench received
revision requests.

| # | Item | Source |
|---|---|---|
| 1 | Laptop revision C | Four staggered rows of dash-shaped keys; no grid or touchpad |
| 2 | Odtwarzacz CD revision | Open player with raised lid and visible disc |
| 3 | Buzdygan śmieciowy | Lily actor item uses her portrait |
| 4 | Walther PPK | Lily actor item uses her portrait |
| 5 | Ruger LCP II | Samantha Smith actor item uses her portrait; Ruger Mark IV is a different weapon |
| 6 | Tulipan | Motocyklista actor item uses his portrait |
| 7 | Pięść wspomagana hydraulicznie | Two Richard Craddock variants use their portrait |
| 8 | Klucz francuski | Pokrak actor item uses his portrait |
| 9 | Łopatka kuchenna | Kucharka Irena actor item uses her portrait |

## Batch 50 — 6 approved and installed, 3 revisions moved to batch 51

One complete 3×3 atlas contained the requested tray revision and eight verified
world/module item gaps. The tray, fang, fuel, medic refill, metal case and
heavy-rifle parts are approved and installed. Ammunition components, Pogromca
and the hoof attack received revisions in batch 51.

| # | Item | Source |
|---|---|---|
| 1 | Atak tacką revision B | Bowl, cup, liquid and food actively spill from the tray |
| 2 | Kieł jadowy | GMT400 item uses a colored potion vial |
| 3 | Paliwo | GMT400 fuel tank uses a colored potion flask |
| 4 | Uzupełnienie Narzędzi Małego Medyka | Physical refill uses the generic heal symbol |
| 5 | Metalowa walizka | Reinforced metal case uses a soft leather-bag icon |
| 6 | Komponenty Amunicji | Reloading parts use the generic chemistry icon |
| 7 | Części ciężkiego karabinu | Loose parts use the complete Browning M2 icon |
| 8 | Pogromca | Chemical-dart shotgun shares the ordinary pump-shotgun icon |
| 9 | Odnóże — KOŃ (SKAŻONY) | Synthetic horse attack needs actor-specific hoof art |

## Batch 51 — 14 approved and installed, 12 revisions, 1 pending

Three 3×3 atlases provide one 27-icon review pass: three batch-50 revisions,
six physical equipment/weapon gaps, and eighteen reusable creature or machine
ability icons. Sources, exact prompts and normalized candidates are under
`dev/icons/review/candidates/batch-51/`.

The complete first pass was rejected for unnecessary grunge and excessive
detail. All 27 icons now have clean replacements made from flat solid shapes,
with the `_clean` candidates selected by default in the review page.

The GM approved fourteen clean replacements. Pogromca, Kusza bloczkowa, Atak
ogonem, Atak psychiczny, Autodestrukcja, Kolec jadowy, Konar, Macki,
Ryjossawka, Splunięcie kwasem, Stalowe maczugi and Stalowe pięści require
targeted revisions. Kusza pistoletowa / automatyczna remains pending.

| Atlas | Items |
|---|---|
| A | Komponenty Amunicji revision B; Pogromca revision B; Atak kopytem; Butelka Coli Light; Nóż do rzucania; Łuk bloczkowy; Kusza pistoletowa; Kusza bloczkowa; Wyciszony Pistolet 10mm |
| B | Atak ogonem; Atak psychiczny; Autodestrukcja; Eksplodujące czyraki; Jadowite zęby; Kolec jadowy; Konar; Korzeń; Łapa Neoniedźwiedzia |
| C | Macki; Piły; Ryjossawka; Splunięcie kwasem; Stalowe maczugi; Stalowe pięści; Szczęki; Szczurze nóżki; Zionięcie radioaktywnym gazem |

## Batch 52 — 19 approved and installed, 8 revisions

The 27-card pass contained twelve targeted Batch 51 revisions, the pistol-crossbow
family, Staza, and thirteen verified live creature or machine abilities. Nineteen
icons were approved and installed. The eight requested changes continue in Batch 53.
Exact prompts and normalized candidates remain archived under
`dev/icons/review/candidates/batch-52/`.

| Atlas | Items |
|---|---|
| A | Pogromca revision C; Kusza bloczkowa revision B; Atak ogonem revision B; Atak psychiczny revision B; Autodestrukcja revision B; Kolec jadowy revision B; Konar revision B; Macki revision B; Ryjossawka revision B |
| B | Splunięcie kwasem revision B; Stalowe maczugi revision B; Stalowe pięści revision B; Staza; Miażdżenie; Połknięcie; Rozszarpanie; Taranowanie; Pochwycenie |
| C | Regeneracja (held for batch 53); Zakażenie; Poświata; Czuły węch; Wiele twarzy; Wspinaczka po metalu; Natarcie; Miotacz ognia; Miotacz strzałek |

## Batch 53 — 22 approved and installed, 4 revisions, 1 pending

The 27-card pass contains the eight selected-reference Batch 52 revisions,
Regeneracja, and eighteen newly verified live bestiary gaps. Twenty-two icons
were approved and installed. Kolec jadowy, Regeneracja, Nadludzki refleks and
Szarża continue as selected-reference revisions in Batch 54. Kamuflaż remains
pending. Atlas A was generated
from a 3×3 reference sheet composed from each card's saved `candidateId`; Atlases B
and C cover shared traits and creature-specific abilities. Exact prompts, reference
sheet, raw atlases and normalized candidates are under
`dev/icons/review/candidates/batch-53/`.

| Atlas | Items |
|---|---|
| A | Atak psychiczny revision C; Autodestrukcja revision C; Kolec jadowy revision C; Stalowe maczugi revision C; Miażdżenie revision B; Taranowanie revision B; Pochwycenie revision B; Czuły węch revision B; Regeneracja |
| B | Pierwsze spotkanie; Atak wielokrotny; Algorytm czuwania; Współpraca; Kamuflaż; Światłowstręt; Wstrzymanie oddechu; Nadludzki refleks; Szarża |
| C | Nie do zabicia; Brak głowy; Niewykrywalność; Telepatia; Neozmysły; Pajęcza wspinaczka; Tkacz sieci; Oplątanie; Groza |

## Batch 54 — 18 approved and installed, 10 revisions

The 28-card pass contained four selected-reference revisions, twenty-three canonical
bestiary gaps and the carried-over Kamuflaż candidate. Eighteen icons were approved,
installed and applied to 61 embedded items across 43 live actors. Ucieczka, Burzyciel,
Druga linia, Iluzoryczny cel, Kuloodporny, Najechanie, Niezniszczalność, Ofiara,
Przewidywanie and Psychiczny krzyk continue as selected-reference revisions in Batch 55.
Exact prompts, reference sheets, raw atlases and normalized candidates remain under
`dev/icons/review/candidates/batch-54/`.

| Atlas | Items |
|---|---|
| A | Kolec jadowy revision D; Regeneracja revision B; Nadludzki refleks revision B; Szarża revision B; Manewry; Ucieczka; Agresja; Burzyciel; Chwytak |
| B | Czaszkohełm; Druga linia; Iluzoryczna niewidzialność; Iluzoryczny cel; Kontakt Molocha; Kuloodporny; Legendarna odporność; Malutki; Mało zwrotny |
| C | Najechanie; Niezniszczalność; Obłażenie; Ofiara; Przejechanie; Przewidywanie; Psychiczny krzyk; Szum mentalny; Ściana żaru |

## Batch 55 — 17 approved and installed, 10 revisions

The 27-card pass contained ten selected-reference Batch 54 revisions and seventeen
new canonical bestiary abilities. Seventeen icons were approved, installed and applied
to 41 embedded items across 29 live actors. Ucieczka, Kuloodporny, Porywacz, Paraliż
umysłu, Tarcza umysłu, Stratowanie, Wszędołaz, Zadymienie, Zamarcie and Zamaszysty atak
continue as selected-reference revisions in Batch 56. Exact prompts, reference sheets,
raw atlases and normalized candidates remain under
`dev/icons/review/candidates/batch-55/`.

| Atlas | Items |
|---|---|
| A | Ucieczka revision B; Burzyciel revision B; Druga linia revision B; Iluzoryczny cel revision B; Kuloodporny revision B; Najechanie revision B; Niezniszczalność revision B; Ofiara revision B; Przewidywanie revision B |
| B | Psychiczny krzyk revision B; Porywacz; Zauroczenie; Paraliż umysłu; Tarcza umysłu; Sługa Molocha; Stój!; Strach przed ogniem; Stratowanie |
| C | Wszędołaz; Wytrwały; Zaciekłość; Zadymienie; Zamarcie; Zamaszysty atak; Zastępcy szeryfa; Upiorne wycie; Skóra gekona |

## Batch 56 — 16 approved and installed, 9 revisions, 2 pending

The 27-card pass contained ten selected-reference Batch 55 revisions and seventeen new
canonical bestiary ability gaps. Sixteen approved icons are installed and applied to 47
embedded items across 37 live actors. Nine requested revisions continue in Batch 57;
Pokrycie maskujące and Tylko draśnięcie remain pending. Exact prompts, reference sheets,
raw atlases and normalized PNG/SVG candidates remain under
`dev/icons/review/candidates/batch-56/`.

| Atlas | Items |
|---|---|
| A | Ucieczka revision C; Kuloodporny revision C; Porywacz revision B; Paraliż umysłu revision B; Tarcza umysłu revision B; Stratowanie revision B; Wszędołaz revision B; Zadymienie revision B; Zamarcie revision B |
| B | Zamaszysty atak revision B; Paraliżujący ból; Parowanie; Pikowanie; Poddaj się!; Pokłoń się!; Pokrycie maskujące; Posiłki; Potęga tłumu |
| C | Pulp Fiction; Rzut; Słaby punkt; Spawanie; Stabilizator; Szósty zmysł; Szybkie palce; Taktyka; Tylko draśnięcie |

## Batch 57 — 15 approved and installed, 12 revisions

The review pass contained nine selected-reference revisions, two unchanged pending cards
carried from Batch 56, and sixteen new canonical bestiary ability gaps. Fifteen approved
icons are installed and applied to 47 embedded items across 37 live actors. Twelve requested
revisions continue in Batch 58. Exact prompts, reference sheets, raw atlases and normalized
PNG/SVG candidates remain under `dev/icons/review/candidates/batch-57/`.

| Atlas | Items |
|---|---|
| A | Kuloodporny revision D; Tarcza umysłu revision C; Stratowanie revision C; Zamarcie revision C; Parowanie revision B; Pikowanie revision B; Pokłoń się! revision B; Stabilizator revision B; Szósty zmysł revision B |
| B | Celowanie; Doskonałe zmysły; Furia; Gunfight; Naprawianie; Owipozycja; Palcożerca; Pełna obrona; Różnorodne ataki |
| C | Skok łowcy; Tańczące piły; To moje miasto; Tropiciel; Trzeba dobić; Wataha; Wróg Molocha; blank; blank |

Unchanged pending cards in the same review pass: Pokrycie maskujące; Tylko draśnięcie.

## Batch 58 — 20 approved and installed, 7 revisions

The review pass contains twelve selected-reference Batch 57 revisions and fifteen newly
verified bestiary ability gaps. Twenty approved icons are installed and applied to 89
embedded items across 73 live actors. Seven requested redraws continue in Batch 59.
Exact prompts, reference sheets, raw atlases, the reproducible processor and normalized
PNG/SVG candidates remain under `dev/icons/review/candidates/batch-58/`.

| Atlas | Items |
|---|---|
| A | Tarcza umysłu revision D; Zamarcie revision D; Szósty zmysł revision C; Tylko draśnięcie revision B; Celowanie revision B; Naprawianie revision B; Palcożerca revision B; Różnorodne ataki revision B; Skok łowcy revision B |
| B | Tańczące piły revision B; Trzeba dobić revision B; Wróg Molocha revision B; Bolesny atak; Odporny; Odstąpienie; Przyspieszenie; Skakun (opcjonalnie); Skoczek |
| C | Skok; Szarpanie; Tchórzliwość; Udźwig; Unieruchomienie; Wirujące kiścienie; Wycofanie się; Zmysły; Zasadzka |

## Batch 59 — 21 approved and installed, 6 revisions

The review pass contains seven selected-reference Batch 58 redraws and twenty newly
verified bestiary ability and weapon gaps. Twenty-one approved icons are installed and
applied to 97 embedded items across 61 live actors. Six requested revisions continue in
Batch 60. Exact prompts, the seven-icon reference sheet, raw atlases, reproducible processor
and normalized PNG/SVG candidates remain under `dev/icons/review/candidates/batch-59/`.

| Atlas | Items |
|---|---|
| A | Zamarcie revision E; Palcożerca revision C; Odstąpienie revision B; Skakun revision B; Skok revision B; Wycofanie się revision B; Zmysły revision B; Aktywny system obrony; Aura pogardy |
| B | Mistrz taktyki; Zasłonięcie hełmu; Ruch; Atak (Mobsprzęt); Wrażliwość na światło; Próg awarii; Tryb Turbo; Wielonożny; Rozkaz Likwidacji |
| C | Szara Eminencja; Zimna Krew; Żywa Tarcza; Twierdzenie Kąta Prostego; Tacą i w nogi; Tylko jedno w głowie mam; Karabin laserowy; Dmuchawka; Działo ppanc |

## Batch 60 — 15 approved and installed, 12 revisions

Fifteen approved icons are installed in production paths and wired into generated
compendia or exact live-item mappings. The backup-first live migration updated 17
embedded items across 17 actor documents. A refreshed audit also found three naming
variants that could reuse approved art; that separate alias migration updated another
15 embedded items. Twelve requested revisions continue in Batch 61. Exact prompts,
reference sheet, raw atlases, reproducible processor and normalized PNG/SVG candidates
remain under `dev/icons/review/candidates/batch-60/`.

## Batch 61 — 18 approved and installed, 9 revisions in Batch 63

Installed 2026-10-12 from the GM's exact saved selections as WEBP/SVG pairs.
Ja już swoje odchorowałem deliberately uses its selected Batch 60 candidate.
Source filenames, approvals and hashes: `review/candidates/batch-63/installed.json`.
Ruch, Paszcza, Wychuchana spluwa, Samuraj, Nówka sztuka, Polegam tylko na sobie,
Szlachetne urodzenie, Człowiek-aligator and Włóczykij continue in Batch 63.
Compendium/live repoints remain under "Do podpięcia"; no pack or world writes.

The review pass contains twelve exact-selected-reference revisions and fifteen new
feature icons. Four new icons address current live actor placeholders first; eleven
continue the origin-feature compendium pass. The processor removes tiny isolated marks
and fills only tiny enclosed pinholes while preserving structural negative space. Exact
prompts, two exact-candidate reference sheets, raw atlases, reproducible processor and
normalized PNG/SVG candidates are under `dev/icons/review/candidates/batch-61/`.

| Atlas | Items |
|---|---|
| A | Ruch revision C; Karabin laserowy revision C; Ćwiczenie czyni mistrza revision B; Grad ołowiu revision B; Ja już swoje odchorowałem revision B; Jeśli ma silnik, to ruszy revision B; Pakowanie revision B; Paszcza revision B; Patriota revision B |
| B | Urodzony morderca revision B; Wychuchana spluwa revision B; Zawzięty sukinkot revision B; Na symulatorach to działało; Telepata; Przycelowanie; Samuraj; Nówka sztuka; Przedwojenna edukacja |
| C | Nano-Tech; Dieta cud; Duch pustyni; Polegam tylko na sobie; Ale jazda!; Górnik z dziada pradziada; Szlachetne urodzenie; Człowiek-aligator; Włóczykij |

## Batch 62 — 12 approved and installed (A), 4 revisions in Batch 63

Generated as two atlases together with the §F machine-off glyph (17 candidates total).
Exact prompts, source order and reproducible processors: `review/candidates/batch-62/`.
The GM approved 13 of the 17 candidates (12 in A and the §F machine-off glyph).
Installed 2026-10-12: Doba, Rozbiórka, Emiter EMP, Wyłączony and nine Fanty groups
(all except Zabawka). Handel, Bebeszenie, Szabrowanie and Zabawka continue in Batch 63.
Production rasters are WEBP, including the SVG's embedded mask. Exact approval
provenance: `review/candidates/batch-63/installed.json`.

Fanty stems: `slodycze`, `cygaro`, `prasa`, `gra`, `kaseta`, `plyta-cd`, `konsola`,
`alkohol`, `zabawka`, `papier-toaletowy`. M5 action paths remain exactly as listed below.

| # | File | Item / where it shows up | Suggested prompt content |
|---|------|--------------------------|---------------------------|
| 1 | `icons/weapons/emiter_emp.svg` | Emiter EMP (NOE s. 101, Zabójca Maszyn; PLAN_m3_towarzysze.md §7.12) — dziś pożycza `paralyzer.svg` Szokera | Heavy, bulky handheld EMP emitter: a stubby barrel ending in a dish or coil, a battery pack slung under it, cables, a crude grip — homemade, wasteland-built |
| 2 | `icons/actions/handel.svg` | Handel — przycisk w nagłówku karty (PLAN_m5_postoj.md §7.5) | Two hands exchanging a bundle over a crate — barter, no coins |
| 3 | `icons/actions/bebeszenie.svg` | Bebeszenie (§7.19) | Butcher's knife and a pair of pliers crossed over a carcass rib outline |
| 4 | `icons/actions/szabrowanie.svg` | Szabrowanie (§7.16) | Crowbar prying open a battered crate, a few scraps spilling out |
| 5 | `icons/actions/rozbiorka.svg` | Rozbiórka / recykling (§7.20) | Wrench and a few loose bolts and gears falling apart from a broken device |
| 6 | `icons/actions/doba.svg` | Doba postoju (§7.11) | Sun half-set over a campfire, a small clock dial in the sky |
| 7–16 | `icons/fanty/<rodzaj>.svg` | Fanty (NOE s. 132–133; §7.10) — jedna ikona na grupę: słodycze (batonik/chipsy/czekolada), cygaro, prasa (pisemko/komiks/książka), gra (karty/planszówka), kaseta/VHS, płyta CD, konsola/cartridge, alkohol, zabawka (maskotka/klocki/lalka/autko RC), papier toaletowy | One pre-war luxury object per glyph, recognisable at 24 px |

## Batch 63 — 19 approved and installed, 8 revisions in Batch 64

Thirteen exact-selected-reference revisions from Batches 61–62, twelve remaining
canonical origin features, and two Sztuczki. New gaps were checked against the
canonical catalog, existing icon paths and all review cards. Generic prompts,
reference selections and archived GM notes: `review/candidates/batch-63/`.
Nineteen exact-selected approvals were installed as WEBP/SVG pairs on 2026-10-12.
Approval provenance: `review/candidates/batch-64/installed.json`. Wychuchana spluwa,
Samuraj, Bebeszenie, Szabrowanie, Chodźmy, na pewno już utonął, Gambling we krwi,
Wiesz, zjadłem własnego psa and Hi-Tech continue in Batch 64. Old selections and
notes are preserved before the new candidates become pending.

| Atlas | Candidates |
|---|---|
| A | Handel revision B; Bebeszenie revision B; Szabrowanie revision B; Zabawka revision B; Szlachetne urodzenie revision B; Człowiek-aligator revision B; Włóczykij revision B; Polegam tylko na sobie revision B; Nówka sztuka revision B |
| B | Ruch revision D; Paszcza revision C; Wychuchana spluwa revision C; Samuraj revision B (targeted correction); Kwas w żyłach; Chodźmy, na pewno już utonął; Edukacja; Gambling we krwi; Wiesz, zjadłem własnego psa |
| C | Hi-Tech; Moloch? Coś słyszałem; Cholerny kaznodzieja; Przed wojną wszystko było lepiej; Człowiek zwany koniem; Zdrowa okolica; Hazardzista; Aramis; Aspiryna i Miętusy |

New output stems under `icons/abilities/`: `kwas-w-zylach`,
`chodzmy-na-pewno-juz-utonal`, `edukacja`, `gambling-we-krwi`,
`zjadlem-wlasnego-psa`, `hi-tech`, `moloch-cos-slyszalem`,
`cholerny-kaznodzieja`, `przed-wojna-wszystko-bylo-lepiej`,
`czlowiek-zwany-koniem`, `zdrowa-okolica`, `hazardzista`, `aramis`,
`aspiryna-i-mietusy`. WEBP/SVG pairs only after GM approval.

## Batch 64 — 16 approved and installed, 11 revisions in Batch 65

Eight exact-selected-reference revisions and nineteen new canonical Sztuczki.
Every new gap was checked against its canonical key, proposed slug and all existing
review cards. Source notes, selections, exact prompts and processors are archived in
`review/candidates/batch-64/`. The saved review approved fifteen glyphs, now installed
as exact-pixel WEBP/SVG pairs. `reviewed.json` preserves the initial 27 saved decisions;
`reviewed-installed.json` lists those fifteen deliveries and source/output hashes.
Kuloodporność was approved shortly afterwards and is also installed; its saved
decision and delivery are in `reviewed-addendum.json` and
`reviewed-addendum-installed.json`. Eleven revision requests continue in Batch 65;
their exact old selections and notes are archived before replacement.

Approved: Wychuchana spluwa, Gambling we krwi, Hi-Tech, Bez trzymanki, Ciszej niż cień,
Człowiek-pająk, Fabrykator, Grenadier, Immunitet, Karateka, Ławnik, Miotacz,
Mistrz broni białej, Neo, Nożownik and Kuloodporność. Code/pack/world repoints remain for the GM.

| Revision carried into Batch 65 | Required change from the saved GM review |
|---|---|
| Samuraj | Keep the katana hand; turn the empty off hand palm upward with slightly curled fingers, a "come here" gesture. |
| Bebeszenie | Regenerate completely: intact crossed pliers and a butcher's knife, with a rib outline above. Broad plausible pliers handles and jaws; no broken or fused tool. |
| Szabrowanie | Separate the complete crowbar silhouette from the crate silhouette; its tip must not merge into the crate. |
| Chodźmy, na pewno już utonął | Keep the improved legs; restore the missing hand with complete human anatomy. |
| Wiesz, zjadłem własnego psa | Correct the hatchet blade orientation, move closer to the face, make the head bald and retain the beard. |
| Barbarka | Asymmetric headbutt: one man delivers the blow, the other receives the nose impact; no gore. |
| Benzyna zamiast krwi | Remove the seatbelt and add a wild, menacing driver's grin; keep the figure generic. |
| Fachowiec | Show arms descending naturally from the shoulders; separate both hands clearly from the workbench. |
| Jest zajebiście | Make the raised hand a thumbs-up and give the speaker a relaxed smile. |
| Mistrz walki wręcz | Correct the wrist-grapple anatomy and remove the apparent extra pair of hands. |
| Muzyk | Replace the lower-left blob with a distinct audience-member silhouette. |

Exact selected references and verbatim review notes are in `reviewed.json`;
`remaining-items.json` preserves the eleven cards as they stood after installation.
Batch 65 selects their new replacements as pending, retaining these old candidates.

| Atlas | Candidates |
|---|---|
| A | Wychuchana spluwa revision D; Samuraj revision C; Bebeszenie revision C; Szabrowanie revision C; Chodźmy, na pewno już utonął revision B; Gambling we krwi revision B; Wiesz, zjadłem własnego psa revision B; Hi-Tech revision B; Barbarka |
| B | Bez trzymanki; Benzyna zamiast krwi; Ciszej niż cień; Człowiek-pająk; Fabrykator; Fachowiec; Grenadier; Immunitet; Jest zajebiście |
| C | Karateka; Kuloodporność; Ławnik; Miotacz; Mistrz broni białej; Mistrz walki wręcz; Muzyk; Neo; Nożownik |

| File | Item / delivery status | Original prompt content |
|---|---|---|
| `icons/abilities/barbarka.svg` | Barbarka — revision queued | One rugged fighter delivers a headbutt: two human head-and-shoulder profiles meet forehead to forehead with one broad impact burst between them. Two intact skulls, no gore or tiny detail. |
| `icons/abilities/bez-trzymanki.svg` | Bez trzymanki — **done** | One rider balances a practical motorcycle with BOTH hands clearly off its handlebars, arms held out in a controlled riding posture. One coherent bike, two wheels, broad simple frame; no stunt circus pose or tiny mechanics. |
| `icons/abilities/benzyna-zamiast-krwi.svg` | Benzyna zamiast krwi — revision queued | One alert driver grips a steering wheel and protects a compact car silhouette from a single incoming impact. The driver's broad shoulder blocks the impact near the car. Show vehicle protection through practical shapes, no heart, blood, logos or floating cog. |
| `icons/abilities/ciszej-niz-cien.svg` | Ciszej niż cień — **done** | One crouched survivor moves quietly close to a low broken wall, boot lifted lightly above the ground. Its broad shadow contour stays close behind. A spare stealth silhouette, no crossed-out alarm, speech bubble or tiny footprints. |
| `icons/abilities/czlowiek-pajak.svg` | Człowiek-pająk — **done** | One practical wasteland climber climbs a near-vertical wall using two hands and two boots, a plain rope hanging nearby. Clear bent limbs and one firm handhold. Ordinary gear, no superhero costume, spider emblem or recognizable fictional character. |
| `icons/abilities/fabrykator.svg` | Fabrykator — **done** | Two sturdy hands assemble a compact device clamped in a bench vise, one hand steadies the piece while the other tightens a large bolt with a wrench. Broad real workshop shapes, no generic giant cog or toy exploded stack. |
| `icons/abilities/fachowiec.svg` | Fachowiec — revision queued | Two capable hands hold two different real tools over a spare workbench: a wrench in one and pliers in the other. Balanced practical tool silhouettes with broad open space, no third tool or decorative badges. |
| `icons/abilities/grenadier.svg` | Grenadier — **done** | One athletic survivor immediately throws a retrieved grenade with an outstretched arm and one broad throw arc; one plain grenade at the end of the arc. Clear complete hand and grenade silhouette, no explosion or instructions. |
| `icons/abilities/immunitet.svg` | Immunitet — **done** | One large plain medical shield with a broad cross blocks three simple disease-particle blobs outside it. Crisp joined shield shape and restrained negative space, no tiny plus marks, letters or gore. |
| `icons/abilities/jest-zajebiscie.svg` | Jest zajebiście — revision queued | One confident charismatic survivor raises an open hand while addressing two attentive allies shown as small shoulder silhouettes. A clear encouraging speech posture, no text-filled speech bubble, medals or floating symbols. |
| `icons/abilities/karateka.svg` | Karateka — **done** | One unarmed fighter makes a strong forward kick while guarding with two hands. Exactly one human body, two arms, two legs and one clear extended foot. Practical fighting clothes, no superhero or mystical glow. |
| `icons/abilities/kuloodpornosc.svg` | Kuloodporność — **done** | One broad bare unarmoured torso leans away as a single bullet skims harmlessly along its side with one short curved streak. Strong shoulder and chest outline, no armour plates, shield, blood or superhero costume. |
| `icons/abilities/lawnik.svg` | Ławnik — **done** | One powerful fighter swings a heavy wooden bench as an improvised melee weapon, gripping the large top plank with both hands. A thick plank and two stout bench supports dominate; no courtroom objects, tiny debris or gore. |
| `icons/abilities/miotacz.svg` | Miotacz — **done** | One strong hand launches a single practical throwing knife through one broad ballistic arc. The knife's blade and handle are distinct, broad and readable. No extra knife, arrow, target label or tiny speed marks. |
| `icons/abilities/mistrz-broni-bialej.svg` | Mistrz broni białej — **done** | One firm hand drives a practical straight sword through a stout practice post, leaving one broad diagonal cut. The long blade, hand and split post read cleanly. No duel crowd, badge, wreath or famous character. |
| `icons/abilities/mistrz-walki-wrecz.svg` | Mistrz walki wręcz — revision queued | Two fighters' forearms meet in a close defensive maneuver: one hand redirects the other fighter's attacking wrist while the free forearm stays in guard. Broad complete hands and wrists with clear grip, no extra fingers or weapons. |
| `icons/abilities/muzyk.svg` | Muzyk — revision queued | One anonymous survivor plays an acoustic guitar, one hand on the neck and one strumming above the sound hole, beside two small allied head silhouettes. Plain instrument, two complete hands, no music notes, lettering or famous musician. |
| `icons/abilities/neo.svg` | Neo — **done** | One generic survivor leans sharply backwards to dodge a single bullet passing just in front of the chest, with one broad trajectory streak. Ordinary wasteland clothing, no sunglasses, famous film character, black trenchcoat or movie logo. |
| `icons/abilities/nozownik.svg` | Nożownik — **done** | Two practical combat knives in two strong hands: one knife thrusts forward and the other is held close in a reverse grip for a follow-up strike. Exactly two hands and two knives, spare clear negative space, no gore or extra blades. |

Production paths pair each approved `.svg` with a lossless `.webp`; SVG masks
embed WEBP. Canonical camelCase Sztuczka keys are recorded separately as `catalogKey`
in `batch.json`, so later GM repoints can map them to these exact file stems.

## Batch 65 — 18 approved and installed, 9 returned items in Batch 66

Eighteen exact-selected glyphs are installed as lossless WEBP and theme-aware SVG
masks. `review/candidates/batch-66/installed.json` records their paths, source
selections and hashes; `decisions.json` preserves all 27 incoming decisions.
Eight items requested revisions; Bebeszenie was rejected for repeated bent-handle
anatomy and receives a fresh isolated redraw. No Batch 65 decision is pending.

| Delivered file | Item / status |
|---|---|
| `icons/abilities/samuraj.svg` + `.webp` | Samuraj — **done** |
| `icons/actions/szabrowanie.svg` + `.webp` | Szabrowanie — **done** |
| `icons/abilities/chodzmy-na-pewno-juz-utonal.svg` + `.webp` | Chodźmy, na pewno już utonął — **done** |
| `icons/abilities/zjadlem-wlasnego-psa.svg` + `.webp` | Wiesz, zjadłem własnego psa — **done** |
| `icons/abilities/benzyna-zamiast-krwi.svg` + `.webp` | Benzyna zamiast krwi — **done** |
| `icons/abilities/fachowiec.svg` + `.webp` | Fachowiec — **done** |
| `icons/abilities/jest-zajebiscie.svg` + `.webp` | Jest zajebiście — **done** |
| `icons/abilities/muzyk.svg` + `.webp` | Muzyk — **done** |
| `icons/abilities/pewna-reka.svg` + `.webp` | Pewna ręka — **done** |
| `icons/abilities/plug-and-play.svg` + `.webp` | Plug & Play — **done** |
| `icons/abilities/przydasie.svg` + `.webp` | Przydasie — **done** |
| `icons/abilities/robin-hood.svg` + `.webp` | Robin Hood — **done** |
| `icons/abilities/rodeo.svg` + `.webp` | Rodeo — **done** |
| `icons/abilities/rozroba.svg` + `.webp` | Rozróba — **done** |
| `icons/abilities/ruchome-gniazdo-ckm.svg` + `.webp` | Ruchome gniazdo CKM — **done** |
| `icons/abilities/snajper.svg` + `.webp` | Snajper — **done** |
| `icons/abilities/szachista.svg` + `.webp` | Szachista — **done** |
| `icons/abilities/szkolenie-w-ciezkim-pancerzu.svg` + `.webp` | Szkolenie w ciężkim pancerzu — **done** |

| Returned item | Saved GM request |
|---|---|
| Barbarka (revise) | Close - now the man on the left is hitting the jaw. Adjust their relative heights so the contact is FOREHEAD ON NOSE (left on right) |
| Mistrz walki wręcz (revise) | There's an unnecesary line separating the wrist of the lower hand |
| Padnij/Powstań (revise) | Add arrows indicating that the character just went prone and is now standing up |
| Pancerny (revise) | The image should show the ball reflecting off the armor, in a V-like fashion, not an I-like way |
| Pan Plaster (revise) | The rest of the bandaged hand disappears. Redraw the image from a slightly different perspective. |
| Pierwotny instynkt (revise) | Slightly too anime-like |
| Siekierezada (revise) | It's the hands that should cross, not the axes. |
| Szkolenie w broni (revise) | Remove the lower hand |
| Bebeszenie (reject) | Same error - again - the pliers have one handle straight, the second at a 90 degree angle. |

## Batch 66 — 10 approved and installed, 6 revisions in Batch 67

Eight exact-reference edits, one completely fresh isolated Bebeszenie redraw,
and the last seven untouched canonical Sztuczki. The rejected pliers glyph is
archived for diagnosis and is excluded from generation inputs. Generic prompts,
exact selections, processors and the registered cards are in
`review/candidates/batch-66/`. Ten exact-approved WEBP/SVG pairs are now installed.
`reviewed.json` archives all sixteen current decisions and selections;
`reviewed-installed.json` records delivered paths and hashes. Barbarka deliberately
uses the older `batch65-revision` candidate selected by the GM. All other deliveries
use their saved Batch 66 selections. Six revisions continue in Batch 67;
their exact prior selections and notes are archived before replacement.

| Source | Candidates |
|---|---|
| Atlas A, cells 1–8 | Barbarka revision C; Mistrz walki wręcz revision C; Padnij/Powstań revision B; Pancerny revision B; Pan Plaster revision B; Pierwotny instynkt revision B; Siekierezada revision B; Szkolenie w broni revision B |
| Isolated redraw, replacing A9 | Bebeszenie revision E — two straight symmetric pliers handles, one pivot, one separate knife and a simple rib outline |
| Atlas B, cells 1–7 | Szkolenie w średnim pancerzu; Szturmowiec; Szybki Bill; Ucz się, ucz; Ukryty cel; Wrestler; Złomiarz |

| Final SVG (WEBP paired after approval) | Item / delivery status | Original Batch 66 prompt |
|---|---|---|
| `icons/abilities/barbarka.svg` | Barbarka — **done** | Raise the LEFT attacker's head relative to the right victim by about one-third of a head height, until the center of the attacker's FOREHEAD just above his eyebrows contacts the RIGHT victim's NOSE bridge/tip. Forehead-to-nose is the ONLY contact point, never jaw, chin or forehead-to-forehead. Keep the left attacker leaning forward, right victim recoiling, two asymmetric complete head profiles and one small impact mark at the victim's nose. No gore. |
| `icons/abilities/mistrz-walki-wrecz.svg` | Mistrz walki wręcz — **done** | Keep the exact two-forearm, two-hand wrist-grapple pose. Remove ONLY the unnecessary BLACK LINE across the lower gripping hand's wrist, so that hand joins its own forearm in ONE CONTINUOUS WHITE silhouette. Retain the useful separation of the opponent's wrist from the gripping fingers. No severed wrist, bracelet/seam at that wrist, extra hand or altered grip. |
| `icons/abilities/padnij-powstan.svg` | Padnij/Powstań — **done** | Keep the rising survivor's kneeling-to-standing pose and whole body. ADD two simple broad directional arrows: a DOWNWARD arrow beside the left shoulder toward the ground indicates dropping prone, and an UPWARD arrow beside the right shoulder indicates immediately getting up. Each arrow has one clear arrowhead and one short shaft, separated from the person. These arrows are explicitly requested; no duplicate ghost bodies, labels or decorative symbols. |
| `icons/abilities/pancerny.svg` | Pancerny — **done** | Keep the broad heavy armour breastplate and shoulder guards. Replace the straight impact marks with ONE round projectile ricocheting off the outer plate. Show an incoming diagonal path from upper-right toward the armour, then an outgoing path toward lower-right away from the SAME contact point: a clearly angled V/corner bounce, no straight I-shaped trajectory through the armour. Put the round ball on the outgoing path, one small contact burst on the plate, no penetration, shield, blood or text. |
| `icons/abilities/pan-plaster.svg` | Pan Plaster | Redraw from a slightly elevated three-quarter perspective so the PATIENT'S complete forearm, wrist and HAND remain visible. The forearm lies diagonally across the center; the patient's open hand with all five fingers is fully visible toward upper-right, naturally connected to the wrist. Two separate medic hands approach from lower-left and apply one broad dressing to the forearm. Keep a small open first-aid pouch below. Exactly three hands total, no amputated wrist, missing patient hand, merged glove, injury or blood. |
| `icons/abilities/pierwotny-instynkt.svg` | Pierwotny instynkt | Keep the alert head turn, ready forearm and broad disturbance arcs. Replace the anime-like young face and spiky hair with a rugged MIDDLE-AGED adult survivor in a sober western utilitarian stencil style: close-cropped hair, realistic small watchful eye, firm brow, square natural jaw and restrained stubble. No manga/anime eyes, glossy hair spikes, cute youthful face, supernatural halo or exaggerated cartoon features. |
| `icons/abilities/siekierezada.svg` | Siekierezada — **done** | Cross the TWO FOREARMS/WRISTS into an X at the lower center, while the TWO HATCHETS remain separate and UPRIGHT at upper-left and upper-right. The forearm from lower-left reaches the hand at upper-right; the forearm from lower-right reaches the hand at upper-left. Exactly two complete hands each grip one hatchet. Both straight axe handles stay nearly vertical, never crossing each other; blades face outward. Broad black overlap contour at the crossed arms, no extra limb, crossed axe heads or gore. |
| `icons/abilities/szkolenie-w-broni.svg` | Szkolenie w broni — **done** | Remove ONLY the LOWEST supporting hand and its forearm from the selected knife-training icon. Keep the upper learner hand that firmly grips the knife, the upper instructor hand pointing toward the training post, and the complete solid post. Exactly TWO hands remain: one grips the knife, one points. No lower supporting wrist/stump, additional blade or other change. |
| `icons/actions/bebeszenie.svg` | Bebeszenie | Completely regenerate as an ISOLATED glyph with no defective prior image supplied. One intact real pair of combination pliers crosses one butcher knife below a simple rib outline. Both pliers handles must be fully visible, straight, continuous and symmetric below the pivot, pointing down at a small angle; neither handle may bend 90 degrees or join the knife. Two coherent jaws above one pivot. No animal skull, additional tool, hand or gore. |
| `icons/abilities/szkolenie-w-srednim-pancerzu.svg` | Szkolenie w średnim pancerzu (`szkolenieWSrednimPancerzu`) — **done** | One ordinary trainee secures a broad strap on a practical medium armour vest, with one hand pulling the strap and the other steadying it. |
| `icons/abilities/szturmowiec.svg` | Szturmowiec (`szturmowiec`) — **done** | One practical adult rifleman fires a controlled short burst while advancing in a compact standing stance. |
| `icons/abilities/szybki-bill.svg` | Szybki Bill (`szybkiBill`) | One generic athletic wasteland survivor takes a long, fast running stride, one leg extended forward and the other trailing, arms pumping naturally. |
| `icons/abilities/ucz-sie-ucz.svg` | Ucz się, ucz (`uczSieUcz`) | Two adult hands study an open practical manual on a simple desk beside one plain training tool. |
| `icons/abilities/ukryty-cel.svg` | Ukryty cel (`ukrytyCel`) | One anonymous rifleman aims past the edge of a broad broken cover slab toward one partially exposed opposing head-and-shoulder silhouette. |
| `icons/abilities/wrestler.svg` | Wrestler (`wrestler`) — **done** | Two ordinary adult fighters in one anatomically coherent standing wrestling hold: one firmly controls the opponent's upper body from behind, two visible forearms wrap around the torso without covering the neck. |
| `icons/abilities/zlomiarz.svg` | Złomiarz (`zlomiarz`) — **done** | One practical salvager crouches beside a small tray of metal scrap and examines one useful alternator-like component with two hands. |

All 36 canonical origin abilities have dedicated glyph files. All 53 canonical
Sztuczki have either delivered glyphs (48) or revision requests (5). Bebeszenie is
the sixth remaining revision and the last M5 action glyph in review. No untouched
origin/Sztuczka icon gaps remain. The broader physical-item audit also adds
three missing fuel-grade icons to Batch 67.

### Revisions carried into Batch 67

Exact selected sources and verbatim feedback are preserved in `reviewed.json`;
`reviewed-remaining-items.json` archives the six cards before their replacement.
Batch 67 supplies new pending candidates, retaining these old sources and notes.

| File | Item | Required change from the saved GM review |
|---|---|---|
| `icons/actions/bebeszenie.svg` | Bebeszenie | Now the composition is awkward, with a tiny little ribcage above large pliers and a knife. My suggestion is to split all three elements - no more crossing. Butcher's knife, ribcage, small lightning splitting the image, stack of PCBs, pliers |
| `icons/abilities/pan-plaster.svg` | Pan Plaster | Rotate the hand being bandaged by 90 degrees left (so it is opposite diagonal). Do not modify the pair of hands performing the medical procedure. |
| `icons/abilities/pierwotny-instynkt.svg` | Pierwotny instynkt | Okay better, but now the lines of the face have too much detail. Keep the expression, simplify the lines. |
| `icons/abilities/szybki-bill.svg` | Szybki Bill | Add lines to the left of the character showing how fast he is |
| `icons/abilities/ucz-sie-ucz.svg` | Ucz się, ucz | Remove the wrench. Add abstract lines symbolizing text on the left page. No readable writing. |
| `icons/abilities/ukryty-cel.svg` | Ukryty cel | Put distance between the shooter and the target. Show the shot going through the cover and hitting the figure behind it. |

## Batch 67 — 7 approved and installed, 2 revisions

Delivered 2026-10-13: exact saved selections as 256×256 white-alpha WEBP
and theme-aware SVG wrappers embedding WEBP. Full decisions and hashes:
`review/candidates/batch-67/reviewed.json` and `reviewed-installed.json`.
Saved feedback is unchanged; approved cards are resolved.

| Item | Final SVG (+ WEBP) | Delivery |
|---|---|---|
| Bebeszenie | `icons/actions/bebeszenie.svg` | **done** |
| Pan Plaster | `icons/abilities/pan-plaster.svg` | Revision required |
| Pierwotny instynkt | `icons/abilities/pierwotny-instynkt.svg` | **done** |
| Szybki Bill | `icons/abilities/szybki-bill.svg` | **done** |
| Ucz się, ucz | `icons/abilities/ucz-sie-ucz.svg` | **done** |
| Ukryty cel | `icons/abilities/ukryty-cel.svg` | **done** |
| Paliwo dobre (5 l) | `icons/items/loot/paliwo_dobre.svg` | **done** |
| Paliwo przeciętne (5 l) | `icons/items/loot/paliwo_przecietne.svg` | **done** |
| Paliwo chrzczone (5 l) | `icons/items/loot/paliwo_chrzczone.svg` | Revision required |

### Saved requests for Batch 68

| Item | Required change from the exact selected Batch 67 candidate |
|---|---|
| Pan Plaster | Alright, another 180 degrees oughta do it. Now the hand looks like it's coming from the first aid box. |
| Paliwo chrzczone (5 l) | Get rid of the inspection window, and make it look like a cheap plastic orange juice jug |

Good and average fuel art is ready for the GM mappings below. Adulterated
fuel waits for fresh approval. Medicine art needs no regeneration. Bebeszenie
uses the exact M5 filename and needs no wiring. No packs or world changes.

## Batch 68 — both approved and installed

Delivered 2026-10-13: exact saved Pan Plaster and adulterated-fuel selections
as lossless WEBP and theme-aware SVG wrappers. Decisions, source/output hashes
and complete validation: `review/candidates/batch-68/reviewed.json`,
`reviewed-installed.json`, `accept_current_review.py --check`.

| Item | Final SVG (+ WEBP) | Delivery |
|---|---|---|
| Pan Plaster | `icons/abilities/pan-plaster.svg` | **done** |
| Paliwo chrzczone (5 l) | `icons/items/loot/paliwo_chrzczone.svg` | **done** |

All 342 existing review cards are resolved. The three fuel-grade icons are
ready for GM resolver mappings; Pan Plaster remains an older Sztuczka
repoint/rebuild task. No packs or world documents were changed.

<!-- placeholder-batch-69:start -->
## Reviewed (A) — Batch 69 — 5 approved subjects delivered, 4 revisions

GM review 2026-10-15: Berserk (base and active), Bezlitosny przywódca, Brutalny
cios, Bystrzacha and Cichy krok are installed as exact approved SVG/WEBP masks.
Six native placeholder files are replaced. A co mi tam!, Amen, Bez tajemnic
and Clint carry their saved revision notes into Batch 70. Exact decisions and
delivered hashes: `review/candidates/batch-69/reviewed*.json`.

| Cell | Item | Exact SVG delivery targets (+ WEBP) |
|---|---|---|
| 1 | A co mi tam! — revision in Batch 70 | `icons/abilities/a-co-mi-tam.svg` |
| 2 | Amen — revision in Batch 70 | `icons/abilities/amen.svg` |
| 3 | Berserk — **done** | `icons/abilities/berserk.svg`; `icons/abilities/berserk_active.svg` |
| 4 | Bez tajemnic — revision in Batch 70 | `icons/abilities/bez-tajemnic.svg` |
| 5 | Bezlitosny przywódca — **done** | `icons/abilities/bezlitosny-przywodca.svg` |
| 6 | Brutalny cios — **done** | `icons/abilities/brutalny-cios.svg` |
| 7 | Bystrzacha — **done** | `icons/abilities/bystrzacha.svg` |
| 8 | Cichy krok — **done** | `icons/abilities/cichy-krok.svg` |
| 9 | Clint — revision in Batch 70 | `icons/abilities/clint.svg` |

The roadmap covers all 155 native badge files in 153 subjects (17 fresh groups of
nine). Later batch numbers are provisional: saved revisions take priority and
may add batches. Base/active files share approved pixels; the existing active
hotbar pulse remains in the code. Old unused active filenames are compatibility
targets, without new mechanics or wiring. Code, packs and world state are untouched.

<!-- placeholder-batch-69:end -->

<!-- placeholder-batch-70:start -->
## Reviewed (A) — Batch 70 — 8 delivered, 1 revisions

Saved GM review: 8 subjects installed as exact approved SVG/WEBP pairs.
The 1 remaining requests carry their exact notes into Batch 72.
Evidence: `review/candidates/batch-70/reviewed.json` and `reviewed-installed.json`.

| Cell | Item | Exact SVG targets (+ WEBP) | Status |
|---|---|---|---|
| 1 | A co mi tam! | `icons/abilities/a-co-mi-tam.svg` | **done** |
| 2 | Amen | `icons/abilities/amen.svg` | **done** |
| 3 | Bez tajemnic | `icons/abilities/bez-tajemnic.svg` | Revision in Batch 72 |
| 4 | Clint | `icons/abilities/clint.svg` | **done** |
| 5 | Cwaniacki zwód | `icons/abilities/cwaniacki-zwod.svg` | **done** |
| 6 | Dobra rada | `icons/abilities/dobra-rada.svg` | **done** |
| 7 | Doktor Brain | `icons/abilities/doktor-brain.svg` | **done** |
| 8 | Drugi atak | `icons/abilities/drugi-atak.svg` | **done** |
| 9 | Drzwi w drzwi | `icons/abilities/drzwi-w-drzwi.svg` | **done** |

<!-- placeholder-batch-70:end -->

<!-- placeholder-batch-71:start -->
## Reviewed (A) — Batch 71 — 5 delivered, 4 revisions

Saved GM review: 5 subjects installed as exact approved SVG/WEBP pairs.
The 4 remaining requests carry their exact notes into Batch 72.
Evidence: `review/candidates/batch-71/reviewed.json` and `reviewed-installed.json`.

| Cell | Item | Exact SVG targets (+ WEBP) | Status |
|---|---|---|---|
| 1 | Dwóch na jednego | `icons/abilities/dwoch-na-jednego.svg` | Revision in Batch 72 |
| 2 | Dziewięć żyć | `icons/abilities/dziewiec-zyc.svg` | **done** |
| 3 | Ekspert | `icons/abilities/ekspert.svg` | Revision in Batch 72 |
| 4 | Elektronik | `icons/abilities/elektronik.svg` | Revision in Batch 72 |
| 5 | Emiter EMP | `icons/abilities/emiter-emp.svg` | **done** |
| 6 | Empiryk | `icons/abilities/empiryk.svg` | **done** |
| 7 | Farmacja | `icons/abilities/farmacja.svg` | **done** |
| 8 | Głowa do góry! | `icons/abilities/glowa-do-gory.svg` | **done** |
| 9 | Goła klata | `icons/abilities/gola-klata.svg` | Revision in Batch 72 |

<!-- placeholder-batch-71:end -->

<!-- placeholder-batch-72:start -->
## Reviewed (A) — Batch 72 — 5 delivered, 4 revisions

Saved GM review: 5 subjects installed as exact approved SVG/WEBP pairs.
The 4 remaining requests carry their exact notes into Batch 74.
Evidence: `review/candidates/batch-72/reviewed.json` and `reviewed-installed.json`.

| Cell | Item | Exact SVG targets (+ WEBP) | Status |
|---|---|---|---|
| 1 | Bez tajemnic | `icons/abilities/bez-tajemnic.svg` | Revision in Batch 74 |
| 2 | Dwóch na jednego | `icons/abilities/dwoch-na-jednego.svg` | **done** |
| 3 | Ekspert | `icons/abilities/ekspert.svg` | **done** |
| 4 | Elektronik | `icons/abilities/elektronik.svg` | Revision in Batch 74 |
| 5 | Goła klata | `icons/abilities/gola-klata.svg` | **done** |
| 6 | Hakerstwo | `icons/abilities/hakerstwo.svg` | **done** |
| 7 | Inteligentna obrona | `icons/abilities/inteligentna-obrona.svg` | Revision in Batch 74 |
| 8 | Ja i mój gang! | `icons/abilities/ja-i-moj-gang.svg` | **done** |
| 9 | Jak dbasz, tak masz | `icons/abilities/jak-dbasz-tak-masz.svg` | Revision in Batch 74 |

<!-- placeholder-batch-72:end -->

<!-- placeholder-batch-73:start -->
## Reviewed (A) — Batch 73 — 7 delivered, 2 revisions

Saved GM review: 7 subjects installed as exact approved SVG/WEBP pairs.
The 2 remaining requests carry their exact notes into Batch 74.
Evidence: `review/candidates/batch-73/reviewed.json` and `reviewed-installed.json`.

| Cell | Item | Exact SVG targets (+ WEBP) | Status |
|---|---|---|---|
| 1 | Jeden strzał | `icons/abilities/jeden-strzal.svg` | **done** |
| 2 | Jeden z nas | `icons/abilities/jeden-z-nas.svg` | **done** |
| 3 | Jeden z nich | `icons/abilities/jeden-z-nich.svg` | **done** |
| 4 | Jeździec | `icons/abilities/jezdziec.svg` | Revision in Batch 74 |
| 5 | Kakofonia | `icons/abilities/kakofonia.svg` | **done** |
| 6 | Kamuflaż | `icons/abilities/kamuflaz.svg` | **done** |
| 7 | Kaskader | `icons/abilities/kaskader.svg` | **done** |
| 8 | Kłusownik | `icons/abilities/klusownik.svg` | Revision in Batch 74 |
| 9 | Kocie kości | `icons/abilities/kocie-kosci.svg` | **done** |

<!-- placeholder-batch-73:end -->

<!-- placeholder-batch-74:start -->
## Reviewed (A) — Batch 74 — 5 delivered, 4 revisions

Saved GM review: 5 subjects installed as exact approved SVG/WEBP pairs.
The 4 remaining requests carry their exact notes into Batch 76.
Evidence: `review/candidates/batch-74/reviewed.json` and `reviewed-installed.json`.

| Cell | Item | Exact SVG targets (+ WEBP) | Status |
|---|---|---|---|
| 1 | Bez tajemnic | `icons/abilities/bez-tajemnic.svg` | **done** |
| 2 | Elektronik | `icons/abilities/elektronik.svg` | **done** |
| 3 | Inteligentna obrona | `icons/abilities/inteligentna-obrona.svg` | **done** |
| 4 | Jak dbasz, tak masz | `icons/abilities/jak-dbasz-tak-masz.svg` | Revision in Batch 76 |
| 5 | Jeździec | `icons/abilities/jezdziec.svg` | Revision in Batch 76 |
| 6 | Kłusownik | `icons/abilities/klusownik.svg` | Revision in Batch 76 |
| 7 | Kolejka | `icons/abilities/kolejka.svg` | **done** |
| 8 | Kondycha | `icons/abilities/kondycha.svg`; `icons/abilities/kondycha_active.svg` | Revision in Batch 76 |
| 9 | Krwawy anioł | `icons/abilities/krwawy-aniol.svg` | **done** |

<!-- placeholder-batch-74:end -->

<!-- placeholder-batch-75:start -->
## Reviewed (A) — Batch 75 — 4 delivered, 5 revisions

Saved GM review: 4 subjects installed as exact approved SVG/WEBP pairs.
The 5 remaining requests carry their exact notes into Batch 76.
Evidence: `review/candidates/batch-75/reviewed.json` and `reviewed-installed.json`.

| Cell | Item | Exact SVG targets (+ WEBP) | Status |
|---|---|---|---|
| 1 | Let’s rock! | `icons/abilities/lets-rock.svg` | **done** |
| 2 | Łapiduch | `icons/abilities/lapiduch.svg` | Revision in Batch 76 |
| 3 | Łaska boża | `icons/abilities/laska-boza.svg` | Revision in Batch 76 |
| 4 | Łeb jak sklep | `icons/abilities/leb-jak-sklep.svg` | Revision in Batch 76 |
| 5 | Łyżeczka | `icons/abilities/lyzeczka.svg` | **done** |
| 6 | Maszyna do zabijania | `icons/abilities/maszyna-do-zabijania.svg` | Revision in Batch 76 |
| 7 | Matrix | `icons/abilities/matrix.svg` | **done** |
| 8 | Mechanika | `icons/abilities/mechanika.svg` | Revision in Batch 76 |
| 9 | Moja prawa ręka | `icons/abilities/moja-prawa-reka.svg` | **done** |

<!-- placeholder-batch-75:end -->

<!-- class-placeholder-audit:start -->
## Class/profession placeholder backlog — confirmed from source

Audit 2026-10-15: **115 generated initials SVGs**, including 6 classes,
18 professions and 91 ability files. 1 ability files are active-state
variants. Canonically referenced art requests below represent **114 subjects**;
base/active variants share a subject and must keep their existing exact filenames.
These were outside the previous 342-card generation queue. File existence was not
evidence of finished artwork. Native badges were confirmed against the exact
`gen_class_placeholders.mjs` SVG signature, not inferred from arbitrary SVG text.

Evidence: `class-placeholder-audit.json`; reproduce with `node dev/icons/audit-class-placeholders.mjs`.
This is an art backlog, not a pack/world migration. Generic white-glyph prompts
must use the corresponding class/profession/feature definition. Use Pipeline.md
and the next free batch; fresh GM approval is required before replacement.

| Kind | Subject | Owner | Exact SVG targets (+ WEBP after approval) | Status |
|---|---|---|---|---|
| feature | Jak dbasz, tak masz | zolnierz | `icons/abilities/jak-dbasz-tak-masz.svg` | Needs art |
| feature | Jeździec | wyjadacz-option | `icons/abilities/jezdziec.svg` | Needs art |
| feature | Kłusownik | zwiadowca | `icons/abilities/klusownik.svg` | Needs art |
| feature | Kondycha | twardziel | `icons/abilities/kondycha.svg` | Needs art |
| feature | Łapiduch | medyk | `icons/abilities/lapiduch.svg` | Needs art |
| feature | Łaska boża | kaznodzieja-nowej-ery | `icons/abilities/laska-boza.svg` | Needs art |
| feature | Łeb jak sklep | spec | `icons/abilities/leb-jak-sklep.svg` | Needs art |
| feature | Maszyna do zabijania | najemnik | `icons/abilities/maszyna-do-zabijania.svg` | Needs art |
| feature | Mechanika | monter | `icons/abilities/mechanika.svg` | Needs art |
| feature | Motywacja | cwaniak | `icons/abilities/motywacja.svg` | Needs art |
| feature | Mój biom | zwiadowca | `icons/abilities/moj-biom.svg` | Needs art |
| feature | Mój bóg kule nosi | kaznodzieja-nowej-ery | `icons/abilities/moj-bog-kule-nosi.svg` | Needs art |
| feature | Mój wróg | zwiadowca | `icons/abilities/moj-wrog.svg` | Needs art |
| feature | Mój wróg: Ludzie | moj-wrog-option | `icons/abilities/moj-wrog-ludzie.svg` | Needs art |
| feature | Mój wróg: Maszyny | moj-wrog-option | `icons/abilities/moj-wrog-maszyny.svg` | Needs art |
| feature | Mój wróg: Mutanty | moj-wrog-option | `icons/abilities/moj-wrog-mutanty.svg` | Needs art |
| feature | Mój wróg: Potwory | moj-wrog-option | `icons/abilities/moj-wrog-potwory.svg` | Needs art |
| feature | Mój wróg: Zwierzęta | moj-wrog-option | `icons/abilities/moj-wrog-zwierzeta.svg` | Needs art |
| feature | Mutant na śniadanie | lowca-mutantow | `icons/abilities/mutant-na-sniadanie.svg` | Needs art |
| feature | Nie do zdarcia | gladiator | `icons/abilities/nie-do-zdarcia.svg` | Needs art |
| feature | Nie klękam | twardziel | `icons/abilities/nie-klekam.svg` | Needs art |
| feature | Obelga | cwaniak | `icons/abilities/obelga.svg` | Needs art |
| feature | Obsługa pancerza | wyjadacz-option | `icons/abilities/obsluga-pancerza.svg` | Needs art |
| feature | Odważny czy głupi | ganger | `icons/abilities/odwazny-czy-glupi.svg` | Needs art |
| feature | Oswajanie zwierząt | lowca-mutantow | `icons/abilities/oswajanie-zwierzat.svg` | Needs art |
| feature | Pancerna fura | wojownik-autostrady | `icons/abilities/pancerna-fura.svg` | Needs art |
| feature | Paranoja | brutal | `icons/abilities/paranoja.svg` | Needs art |
| feature | Partner | sedzia | `icons/abilities/partner.svg` | Needs art |
| feature | Pirotechnika | chemik | `icons/abilities/pirotechnika.svg` | Needs art |
| feature | Pistolero | kowboj | `icons/abilities/pistolero.svg` | Needs art |
| feature | Podstępny atak | zlodziej | `icons/abilities/podstepny-atak.svg` | Needs art |
| feature | Pogoń | zwiadowca | `icons/abilities/pogon.svg` | Needs art |
| feature | Pogromca | lowca-mutantow | `icons/abilities/pogromca.svg` | Needs art |
| feature | Renoma | mafiozo | `icons/abilities/renoma.svg` | Needs art |
| feature | Reputacja | najemnik | `icons/abilities/reputacja.svg` | Needs art |
| feature | Rewolwerowiec | kowboj | `icons/abilities/rewolwerowiec.svg` | Needs art |
| feature | Rusznikarstwo | chemik | `icons/abilities/rusznikarstwo.svg` | Needs art |
| feature | Rutyna | zolnierz | `icons/abilities/rutyna.svg` | Needs art |
| feature | Rzeźnik | wyjadacz-option | `icons/abilities/rzeznik.svg` | Needs art |
| feature | Rzuć broń i gleba! | sedzia | `icons/abilities/rzuc-bron-i-gleba.svg` | Needs art |
| feature | Samouk | cwaniak | `icons/abilities/samouk.svg` | Needs art |
| feature | Saper | zlodziej | `icons/abilities/saper.svg` | Needs art |
| feature | Serwisowanie | monter | `icons/abilities/serwisowanie.svg` | Needs art |
| feature | Skrytka | kurier | `icons/abilities/skrytka.svg` | Needs art |
| feature | Skuteczny cios | najemnik | `icons/abilities/skuteczny-cios.svg` | Needs art |
| feature | Slang | kurier | `icons/abilities/slang.svg` | Needs art |
| feature | Smakuje jak arszenik | chemik | `icons/abilities/smakuje-jak-arszenik.svg` | Needs art |
| feature | Sokole oko | wyjadacz-option | `icons/abilities/sokole-oko.svg` | Needs art |
| feature | Solówa | brutal | `icons/abilities/solowa.svg` | Needs art |
| feature | Specjalizacja | spec | `icons/abilities/specjalizacja-spec.svg` | Needs art |
| feature | Specjalizacja | zlodziej | `icons/abilities/specjalizacja-zlodziej.svg` | Needs art |
| feature | Spieprzysz to! | cwaniak | `icons/abilities/spieprzysz-to.svg` | Needs art |
| feature | Sportowiec | zwiadowca | `icons/abilities/sportowiec.svg` | Needs art |
| feature | Stalowy nadgarstek | wyjadacz-option | `icons/abilities/stalowy-nadgarstek.svg` | Needs art |
| feature | Strzelec | zabojca | `icons/abilities/strzelec.svg` | Needs art |
| feature | Stylówa | gwiazda | `icons/abilities/stylowa.svg` | Needs art |
| feature | Szaleńcza szarża | brutal | `icons/abilities/szalencza-szarza.svg` | Needs art |
| feature | Szary | szczur | `icons/abilities/szary.svg` | Needs art |
| feature | Szczęście | cwaniak | `icons/abilities/szczescie.svg` | Needs art |
| feature | Szybka gadka | cwaniak | `icons/abilities/szybka-gadka.svg` | Needs art |
| feature | Szybka produkcja | spec | `icons/abilities/szybka-produkcja.svg` | Needs art |
| feature | Szybkie badanie | spec | `icons/abilities/szybkie-badanie.svg` | Needs art |
| feature | Szybkie nogi | zlodziej | `icons/abilities/szybkie-nogi.svg` | Needs art |
| feature | Szybkie ręce | spec | `icons/abilities/szybkie-rece.svg` | Needs art |
| feature | Szybkość kota | zlodziej | `icons/abilities/szybkosc-kota.svg` | Needs art |
| feature | Śmiertelna obelga | cwaniak | `icons/abilities/smiertelna-obelga.svg` | Needs art |
| feature | Tarcza wiary | kaznodzieja-nowej-ery | `icons/abilities/tarcza-wiary.svg` | Needs art |
| feature | Trajektoria | spec | `icons/abilities/trajektoria.svg` | Needs art |
| feature | Trening w zbroi | zolnierz | `icons/abilities/trening-w-zbroi.svg` | Needs art |
| feature | Truciciel | szczur | `icons/abilities/truciciel.svg` | Needs art |
| feature | Trzeci atak | twardziel | `icons/abilities/trzeci-atak.svg` | Needs art |
| feature | Twardość | twardziel | `icons/abilities/twardosc.svg` | Needs art |
| feature | Ulubiona broń | twardziel | `icons/abilities/ulubiona-bron-twardziel.svg` | Needs art |
| feature | Ulubiona broń | zlodziej | `icons/abilities/ulubiona-bron-zlodziej.svg` | Needs art |
| feature | Ulubiona broń | zwiadowca | `icons/abilities/ulubiona-bron-zwiadowca.svg` | Needs art |
| feature | W czuły punkt | spec | `icons/abilities/w-czuly-punkt.svg` | Needs art |
| feature | Wściekły cios | brutal | `icons/abilities/wsciekly-cios.svg` | Needs art |
| feature | Wyczulone zmysły | zwiadowca | `icons/abilities/wyczulone-zmysly.svg` | Needs art |
| feature | Wyjadacz | zwiadowca | `icons/abilities/wyjadacz-zwiadowca.svg` | Needs art |
| feature | Wyjadacz | twardziel | `icons/abilities/wyjadacz.svg` | Needs art |
| feature | Wykształciuch | spec | `icons/abilities/wyksztalciuch.svg` | Needs art |
| feature | Z bara! | brutal | `icons/abilities/z-bara.svg` | Needs art |
| feature | Za garść gambli | gwiazda | `icons/abilities/za-garsc-gambli.svg` | Needs art |
| feature | Zabójczy cios | brutal | `icons/abilities/zabojczy-cios.svg` | Needs art |
| feature | Zawołajcie kolegów | gladiator | `icons/abilities/zawolajcie-kolegow.svg` | Needs art |
| feature | Zawsze w siodle | kowboj | `icons/abilities/zawsze-w-siodle.svg` | Needs art |
| feature | Zew areny | gladiator | `icons/abilities/zew-areny.svg` | Needs art |
| feature | Znajomości | kurier | `icons/abilities/znajomosci.svg` | Needs art |
| feature | Zryw | twardziel | `icons/abilities/zryw.svg` | Needs art |
| feature | Zwinność szczura | szczur | `icons/abilities/zwinnosc-szczura.svg` | Needs art |
| class | Brutal | brutal | `icons/klasy/brutal.svg` | Needs art |
| class | Cwaniak | cwaniak | `icons/klasy/cwaniak.svg` | Needs art |
| class | Spec | spec | `icons/klasy/spec.svg` | Needs art |
| class | Twardziel | twardziel | `icons/klasy/twardziel.svg` | Needs art |
| class | Złodziej | zlodziej | `icons/klasy/zlodziej.svg` | Needs art |
| class | Zwiadowca | zwiadowca | `icons/klasy/zwiadowca.svg` | Needs art |
| profession | Chemik | spec | `icons/profesje/chemik.svg` | Needs art |
| profession | Ganger | brutal | `icons/profesje/ganger.svg` | Needs art |
| profession | Gladiator | brutal | `icons/profesje/gladiator.svg` | Needs art |
| profession | Gwiazda | cwaniak | `icons/profesje/gwiazda.svg` | Needs art |
| profession | Kaznodzieja Nowej Ery | cwaniak | `icons/profesje/kaznodzieja.svg` | Needs art |
| profession | Kowboj | twardziel | `icons/profesje/kowboj.svg` | Needs art |
| profession | Kurier | zlodziej | `icons/profesje/kurier.svg` | Needs art |
| profession | Łowca Mutantów | zwiadowca | `icons/profesje/lowca-mutantow.svg` | Needs art |
| profession | Mafiozo | cwaniak | `icons/profesje/mafiozo.svg` | Needs art |
| profession | Medyk | spec | `icons/profesje/medyk.svg` | Needs art |
| profession | Monter | spec | `icons/profesje/monter.svg` | Needs art |
| profession | Najemnik | brutal | `icons/profesje/najemnik.svg` | Needs art |
| profession | Sędzia | zwiadowca | `icons/profesje/sedzia.svg` | Needs art |
| profession | Szczur | zlodziej | `icons/profesje/szczur.svg` | Needs art |
| profession | Wojownik Autostrady | twardziel | `icons/profesje/wojownik-autostrady.svg` | Needs art |
| profession | Zabójca | zlodziej | `icons/profesje/zabojca.svg` | Needs art |
| profession | Zabójca Maszyn | zwiadowca | `icons/profesje/zabojca-maszyn.svg` | Needs art |
| profession | Żołnierz | twardziel | `icons/profesje/zolnierz.svg` | Needs art |

1 additional old badges have no canonical match; listed in the audit, not assumed to need new art.

<!-- class-placeholder-audit:end -->

## How an item gets added here

Add a row any time a review finds an item on the actor's own portrait,
`icons/svg/mystery-man.svg`, or another clearly-wrong borrowed icon **with no
existing dedicated asset to just repoint it to**. A same-file data-fix (item points
at the wrong file, but the right file already exists on disk) is not a queue
entry either — fix that immediately in place, the way every icon-sweep entry
in IMPLEMENTATION.md already does; only queue items that need genuinely
**new** art.

## How a batch actually gets processed (recap of `Pipeline.md`)

1. Take the 9 "Suggested prompt content" cells above, feed them into the
   structured prompt in `Pipeline.md` (`reference_weapon.svg` style-reference
   + the 9 content lines as the "Contents" list), generate, save results to
   `in/`.
2. Run `normalize_icons.py` (crop/resize/transparency).
3. Copy the 9 results into the module's real `icons/**` tree, name them
   properly, write a dated `IMPLEMENTATION.md` entry (same format as every
   other icon-sweep entry, e.g. v0.14.19/v0.14.18/v0.14.17), and repoint each
   affected item's `img` at the real file.
4. Clear this file's queue table back to empty and bump "Next batch number".

---

# B. In-world objects (colour, top-down, map Tiles)

Pictures of the physical item as it lies on the map — what `vfx/grenade-thrown.webp` already
is for a thrown grenade. Everything that differs from class A:

| | Class A (sheet icon) | Class B (in-world object) |
|---|---|---|
| Style reference | `reference_weapon.svg` | **`vfx/grenade-thrown.webp`** |
| Look | white flat silhouette | full colour, realistic, painted/photographic |
| View | icon convention | **from directly above**, the object lying on the ground |
| Background | transparent (or black luma mask) | transparent — if the generator will not do that, a **flat pure `#00FF00`** background to key out. Never black: dark metal would key out with it |
| Shadow / ground | n/a | **none** — no floor, no cast shadow; Foundry draws it on the map |
| Aspect | forced 1:1 | **native** — never squared (the spike strip is 3:1; squaring it broke the tile) |
| Size / format | 256×256 PNG | **long side 128 px, WEBP** with alpha (see memory "WEBP, not PNG") |
| Processing | `normalize_icons.py` | **`normalize_world_assets.py`** (trim to content, keep aspect, resize, WEBP; `--key 00ff00` for a green background) |
| Destination | `icons/**` | `vfx/<item id>.webp` |

Readability: on the map these are drawn several times larger than life (a grenade at ~4×) and
still end up ~20–30 px on screen. Strong silhouette and contrast beat detail.

**Naming is the wiring.** A thrown/placed explosive's Tile uses `vfx/<subtype>.webp` when that
file exists (e.g. `vfx/grenade-molotov.webp`) and falls back otherwise — a thrown grenade to
`vfx/grenade-thrown.webp`, a placed charge (mine, C4, IED) to its own white sheet icon, since a
grenade photo would pretend to be a mine. A radio-fuzed charge looks for
`vfx/<subtype>-radio.webp` first. The tile's proportions come from the image itself. So a
finished file dropped in under the right name needs no code change (`_pendingTileTexture()` /
`_placedTexture()` in `actors/grenade-inventory.mjs`).

Batching: same 9-per-grid rule as class A, separate grid.

## Queue (B) — 9/9, gotowy do wygenerowania

**Briefy gotowe 2026-10-11:** [dev/art/m5/BRIEFS.md](../art/m5/BRIEFS.md), zestaw
`objekty`. MG generuje i edytuje; źródła `dev/art/m5/in/objekty/<key>.png`.
`python dev/art/m5/pack.py` przycina do alpha i konwertuje do `vfx/<key>.webp`.
Żaden z tych plików nie został jeszcze dostarczony.

Ordered by how long the object stays on the map. Thrown grenades lie there until the end of the
turn; placed charges can lie there for hours of game time.

| # | File | Item / where it shows up | Suggested prompt content |
|---|------|--------------------------|---------------------------|
| 1 | `grenade-molotov.webp` | Koktajl Mołotowa, thrown, lies until end of turn — and it is lit (emits light under WKK). Hand-off §2 asked for this first | Glass bottle lying on its side, seen from above, cloth rag stuffed in the neck and **burning** — small bright flame at the rag. Brownish liquid visible through the glass |
| 2 | `grenade-dynamite.webp` | Dynamit (laska), lit before throwing (hand-off §2.3) | Single red stick of dynamite lying on the ground, seen from above, short fuse at one end with a **sparking** tip |
| 3 | `grenade-c4-remote.webp` | Plastik C4, placed charge (hand-off §2.3) | Off-white/grey block of plastic explosive in olive wrapping, an electric blasting cap pushed into it, two thin wires trailing off |
| 4 | `grenade-ied.webp` | IED — timed (clock/fuse) variant (hand-off §2.3) | Short steel pipe bomb with end caps, a small wind-up alarm clock taped to it with wires — improvised, dirty, duct tape |
| 5 | `grenade-ied-radio.webp` | IED planted with a radio fuze — the Tile picks `vfx/<subtype>-radio.webp` for radio charges (`_placedTexture()` in `grenade-inventory.mjs`); a radio C4 would use `grenade-c4-remote-radio.webp` the same way, not queued | Same pipe bomb, with a small radio receiver box and a whip antenna instead of the clock |
| 6 | `grenade-smoke.webp` | Granat dymny, thrown | Cylindrical smoke grenade canister lying on its side, pull ring, wisp of grey smoke at the top |
| 7 | `grenade-flashbang.webp` | Granat hukowy, thrown | Flashbang: perforated cylindrical body lying on its side, spoon lever and pin ring |
| 8 | `grenade-incendiary.webp` | Granat zapalający, thrown | Incendiary grenade canister, red band markings, lying on its side |
| 9 | `grenade-improvised.webp` | Granat improwizowany, thrown | Improvised grenade: tin can packed with nails and bolts, taped shut, short fuse |

*Weapons on the ground (PLAN_paper_doll §9, added 2026-10-03): a dropped weapon's Tile uses
`vfx/<weapon id>.webp` (`weaponId` from `config/weapons-data.mjs`, e.g. `vfx/ar.webp`) when the file
exists, else the white sheet icon with a dark outline. Optional, per weapon, any time — not queued
as rows until the GM picks which weapons are worth it (long guns read worst as small white icons).*

*(Not queued, deliberately: Granat gazowy reuses the smoke canister in practice — a second
cylinder at 25 px would not be told apart; the frag grenade is `grenade-thrown.webp` already;
mines are drawn as a coloured square today, and whether armed mines should be visible to
players as objects at all is a GM call, not an art gap. Ask before adding them.)*

---

# C. Dźwięki produkcji (audio)

Nie grafika, ale ta sama zasada „każda prośba o asset ląduje tutaj” (MG, 2026-09-24). Źródło:
Freesound CC0 (przeglądarka → podpisany URL → ffmpeg → ogg), wpis w `CREDITS.md`. Wszystkie
sloty są w `scripts/production/oprawa.mjs` (`PRACA`, `ZDARZENIA`) — pusty slot (`null`) gra ciszę.
Część ma dziś tymczasowy zamiennik z plików, które już są w repo.

**Dostarczone 2026-10-11 — wszystkie 14 plików:** Freesound CC0, oryginalne nagrania
pobrane przez zalogowaną przeglądarkę → mono 44.1 kHz Vorbis OGG. Źródła, autorzy
i licencje: [CREDITS.md](../../CREDITS.md); konwersja i pomiary:
[dev/art/m5/AUDIO.md](../art/m5/AUDIO.md). Assety gotowe; kolumna „Dziś” poniżej
opisuje dotychczasowe sloty. Podpięcie starszych slotów produkcji pozostaje dla MG.

| # | Slot | Plik docelowy | Dziś | Czego szukać | Stan assetu |
|---|------|---------------|------|--------------|---|
| 1 | praca: kucie (kowal) | `sounds/produkcja/kucie.ogg` | `melee/degrade_chip.ogg` | kilka uderzeń młotka o kowadło, 2–3 s | **Gotowe 2026-10-11** |
| 2 | praca: warsztat (mechanik) | `sounds/produkcja/warsztat.ogg` | cisza | klucz grzechoczący, dokręcanie śruby | **Gotowe 2026-10-11** |
| 3 | praca: lutowanie (elektronik, haker) | `sounds/produkcja/lutowanie.ogg` | cisza | syk lutownicy, klikanie klawiatury | **Gotowe 2026-10-11** |
| 4 | praca: chemia (chemik, aptekarz, gorzelnik) | `sounds/produkcja/chemia.ogg` | `gadzety/dezynfekcja.ogg` | bulgotanie, brzęk szkła laboratoryjnego | **Gotowe 2026-10-11** |
| 5 | praca: szycie (krawiec) | `sounds/produkcja/szycie.ogg` | cisza | nożyce, przeciąganie nici przez skórę | **Gotowe 2026-10-11** |
| 6 | praca: drewno (stolarz) | `sounds/produkcja/drewno.ogg` | cisza | piłowanie, strugarka | **Gotowe 2026-10-11** |
| 7 | ukończenie | `sounds/produkcja/gotowe.ogg` | cisza | krótki, satysfakcjonujący „klik-zatrzask” + metaliczny dźwięk | **Gotowe 2026-10-11** |
| 8 | porażka / porzucenie | `sounds/produkcja/porazka.ogg` | cisza | coś pęka, sypie się na podłogę | **Gotowe 2026-10-11** |
| 9 | Szybka produkcja („iskra”) | `sounds/produkcja/iskra.ogg` | `explosives/detonator_switch.ogg` | elektryczny trzask iskry, bardzo krótki | **Gotowe 2026-10-11** |
| 10 | szabrowanie (PLAN_m5_postoj.md §7.16) | `sounds/postoj/szabrowanie.ogg` | brak slotu | przekopywanie gruzu, przesuwanie blach, 2–3 s | **Gotowe 2026-10-11** |
| 11 | bebeszenie: organiczne (§7.19) | `sounds/postoj/bebeszenie-mokre.ogg` | brak slotu | mokre cięcie, chrząstka | **Gotowe 2026-10-11** |
| 12 | bebeszenie: maszyna (§7.19) | `sounds/postoj/bebeszenie-metal.ogg` | brak slotu | odkręcanie, wyrywanie płyty, iskra | **Gotowe 2026-10-11** |
| 13 | odliczanie autodestrukcji (§7.18) | `sounds/postoj/autodestrukcja-beep.ogg` | brak slotu | elektroniczny pisk alarmowy, krótki, do zapętlenia | **Gotowe 2026-10-11** |
| 14 | zatwierdzona wymiana (§7.6) | `sounds/postoj/wymiana.ogg` | brak slotu | stuknięcie skrzynki o ladę, krótki pomruk zgody | **Gotowe 2026-10-11** |

---

# D. Doll UI art (`PLAN_paper_doll.md` §7a)

One-off panel art for the paper doll, not a batch: generate with an image model from the full
spec and prompt in `PLAN_paper_doll.md` §7a. No text, no lines in the image — the callout lines
and tiles are drawn by code, and the figure is used as a CSS mask coloured by the sheet's theme,
so only its shape matters. Drop the PNG source in `icons/doll/`; the implementing agent converts
it to WebP and measures the anchor points.

| # | File | What | Size |
|---|------|------|------|
| 1 | `icons/doll/mannequin.png` | Genderless full-body silhouette with range-target proportions, front view, A-pose, hands clear of the hips, feet visible. Solid flat black, crisp edges, no texture or wear, transparent background | 800 × 1600 |

**Done 2026-10-03:** the GM's `dev/icons/dolls/mannequin.fw.png` ships as `icons/doll/mannequin.webp`,
anchors re-measured in `scripts/config/doll-anchors.mjs`. The hand-drawn stand-in
`icons/doll/mannequin-placeholder.svg` stays as a fallback. New art later = convert to WebP, point
`MANNEQUIN_SRC` at it, re-measure the anchors.

---

# E. Żetony towarzyszy (top-down)

**Briefy gotowe 2026-10-11:** [dev/art/m5/BRIEFS.md](../art/m5/BRIEFS.md), zestaw
`towarzysze`; źródła `dev/art/m5/in/towarzysze/<key>.png`. Pozostają w kolejce do
wygenerowania i ręcznej edycji przez MG; packer zachowuje proporcje Mały / Średni.

Szablony paczki `towarzysze` (PLAN_m3_towarzysze.md §7.13, dodane 2026-10-10) biorą żeton jak Bestiariusz:
`tokens/<id>.webp` (własna grafika, najwyższy priorytet) → `tokens/aliases.json` → zaślepka. Dziś żadna z
tych dróg nie istnieje dla `towarzysz-*`, więc żeton to portret. Styl i proporcje: `tokens/PROMPT.md`
(widok z góry — pamięć projektu: okrągłe portrety z Roll20 są bezużyteczne jako żetony). WEBP.

| # | Plik | Kto | Opis do promptu |
|---|------|-----|-----------------|
| 1 | `tokens/towarzysz-psi-partner.webp` | Psi partner (s. 100), mały | Kundel z pustkowi widziany z góry, krótka sierść, obroża z kawałkiem łańcucha |
| 2 | `tokens/towarzysz-zmutowany-owad.webp` | Zmutowany owad (s. 99), mały | Owad wielkości psa z góry: chitynowy pancerz, odnóża do kopania, żuwaczki |
| 3 | `tokens/towarzysz-zmutowany-ssak.webp` | Zmutowany ssak (s. 99), duży | Potężny zmutowany drapieżnik z góry (niedźwiedź / pies-gigant), łyse placki skóry |
| 4 | `tokens/towarzysz-zmutowany-gad.webp` | Zmutowany gad (s. 100), średni | Jaszczur ziemnowodny z góry, płetwiasty ogon, łuski w kolorze błota |
| ~~5~~ | ~~`tokens/towarzysz-dron-kroczacy.webp`~~ | **Dostarczone 2026-10-10** (MG, z portretem w `tokens/portraits/`) | — |
| ~~6~~ | ~~`tokens/towarzysz-dron-latajacy.webp`~~ | **Dostarczone 2026-10-10** (MG, z portretem w `tokens/portraits/`) | — |

Drony mają już żetony i portrety (PLAN_m3_towarzysze.md §11, E8a). Zostają zwierzęta 1–4. Ludzcy towarzysze
żetonu z paczki nie mają (czysta karta postaci).

---

# F. Ikony stanów (białe glify, jak `icons/statuses/`)

**Batch 62 — zatwierdzony i dostarczony 2026-10-12:** `icons/statuses/wylaczony.svg`
i `.webp` z atlasu A. Repoint definicji stanu pozostaje dla MG; bez zmiany świata.

Stany modułu bez własnej grafiki — dziś pożyczona ikona rdzenia. Styl: biały glif na przezroczystym tle, jak
`icons/statuses/zranienie-*.svg` (`icons/statuses/ASSETS.md`); SVG reagujący na motyw.

| # | Plik | Stan | Opis do promptu |
|---|------|------|-----------------|
| 1 | `icons/statuses/wylaczony.svg` | Wyłączony (maszyna nie działa — PLAN_m3_towarzysze.md §7.4; dziś `icons/svg/lightning.svg`) | Symbol zasilania (koło z kreską) przekreślony albo przygaszony, bez tekstu |

---

# G. Ilustracje teatru wyobraźni (PLAN_m5_postoj.md §7.23, D42–D45, dodane 2026-10-11)

**Briefy gotowe 2026-10-11:** wszystkie 24 obrazy mają osobny gotowy prompt,
przeznaczenie, rozmiar wyświetlania, kadrowanie i dokładny drop point w
[dev/art/m5/BRIEFS.md](../art/m5/BRIEFS.md). Kolejność: handlarze + utrzymanie →
obozy → ruiny. MG generuje obrazy w DALL-E i ręcznie edytuje źródła; agent ich nie
generuje. Zapis: `dev/art/m5/in/<zestaw>/<klucz>.png`; pakowanie:
`python dev/art/m5/pack.py` (albo `--asset handlarze/bron`), kontrola: `--check`.
Dostarczone 2026-10-12: siedem portretów handlarzy (600×800 RGB WEBP) i trzy
bannery utrzymania (1200×400 RGB WEBP). Źródła MG przetworzono wyłącznie przez
crop/resize/konwersję; raport i hashe: `dev/art/m5/delivered-2026-10-12.json`.
Obozy i ruiny pozostają otwarte. Nazwy docelowe nie zmieniają się.

Obraz tylko tam, gdzie nie ma mapy: okna i karty graczy na postoju, w dziczy i przy szabrowaniu. Jeden obraz na
powierzchnię, czysta dekoracja — brak pliku = brak obrazu. Obrazy ogólne (bar pasuje do każdego baru); MG może
każdy nadpisać własnym. **Nazwa pliku = okablowanie** (`config/ilustracje.mjs`).

**Styl (D44), wspólny dla całej sekcji:** malowana ilustracja w duchu kart obozu z Baldur's Gate 3 — ciepłe
źródło światła (ognisko, lampa, neon) przeciw ponuremu, postapokaliptycznemu pustkowiu Neuroshimy. Bez tekstu,
bez rozpoznawalnych postaci na pierwszym planie (sylwetki w tle dopuszczalne), bez gore. WEBP.
**Formaty:** sceny 3:1 (1200 × 400), portrety handlarzy 3:4 (600 × 800), WEBP bez alpha.
Malowane obrazy: osobna generacja MG dla każdego promptu; atlasy po 9 dotyczą tylko glifów.

**Utrzymanie** — okno Doba (zmienia się przy wyborze poziomu), karta podsumowania doby, przeskok. 3:1.

| # | Plik | Poziom | Opis do promptu |
|---|------|--------|-----------------|
| 1 | `ui/postoj/utrzymanie-nedzny.webp` | **done** — Nędzny | Barłóg w ruinie: szmaty na betonie, puszka nad małym ogniskiem, przeciekający dach |
| 2 | `ui/postoj/utrzymanie-normalny.webp` | **done** — Normalny | Skromna izba: prycza, stół z miską gulaszu, lampa naftowa, zabite deskami okno |
| 3 | `ui/postoj/utrzymanie-bogaty.webp` | **done** — Bogaty | Wygodna komnata: łóżko z kocem, butelka przedwojennego trunku, gramofon, ciepłe światło |

**Obóz wg biomu** — okna KO / DO w dziczy i Doba poza miejscowością; biom z podróży drużyny. 3:1, noc, ognisko.

| # | Plik | Biomy | Opis do promptu |
|---|------|-------|-----------------|
| 4 | `ui/oboz/pustynia.webp` | Pustynia | Ognisko za wrakiem ciężarówki, wydmy, rozgwieżdżone niebo |
| 5 | `ui/oboz/preria.webp` | Preria | Obóz w wysokiej trawie przy zardzewiałym wiatraku, burza na horyzoncie |
| 6 | `ui/oboz/las.webp` | Las, Neodżungla | Ognisko między potężnymi, chorobliwie wyrośniętymi drzewami, hamaki, mgła |
| 7 | `ui/oboz/gory.webp` | Góry | Obóz pod skalnym nawisem, zaspą śniegu i opuszczoną stacją kolejki |
| 8 | `ui/oboz/bagna.webp` | Bagna | Ognisko na pomoście z desek nad czarną wodą, łódka, robaczki świętojańskie |
| 9 | `ui/oboz/ruiny.webp` | Ruiny, Miasto, Tereny Maszyn | Ognisko w beczce w zrujnowanym holu biurowca, w oddali światła maszyn |
| 10 | `ui/oboz/podziemia.webp` | Podziemia | Obóz na peronie metra, lampa karbidowa, ściany w graffiti |

**Handlarze** — stół wymiany, obok listy towaru; rodzaje z przykładów handlarzy RAW (s. 43–44). 3:4, postać za
ladą / straganem, twarz w półcieniu (to każdy handlarz tego rodzaju, nie konkretny BN).

| # | Plik | Rodzaj | Opis do promptu |
|---|------|--------|-----------------|
| 11 | `ui/handlarze/obwozny.webp` | **done** — Obwoźny sprzedawca (dzicz) | Wóz zaprzężony w zmutowane zwierzę, towar na plandece, latarnia |
| 12 | `ui/handlarze/barman.webp` | **done** — Barman (wioska) | Kontuar z beczek, butelki bez etykiet, taśma klejąca na lustrze |
| 13 | `ui/handlarze/stragan.webp` | **done** — Stragan rolnika | Skrzynki z warzywami, wiszące suszone mięso, waga szalkowa |
| 14 | `ui/handlarze/wielobranzowy.webp` | **done** — Sklep wielobranżowy, targowisko | Zagracone półki pod sufit, kanistry, koce, puszki, kasa rejestrująca jako ozdoba |
| 15 | `ui/handlarze/bron.webp` | **done** — Sklep z bronią, rusznikarz | Kraty, karabiny na ścianie, warsztat rusznikarski z tyłu, skrzynki amunicji |
| 16 | `ui/handlarze/apteka.webp` | **done** — Apteka, prochy | Słoiki i fiolki za siatką, czerwony krzyż namalowany ręcznie, waga apteczna |
| 17 | `ui/handlarze/warsztat.webp` | **done** — Złomiarz, warsztat, elektronika | Stosy części, kable, rozkręcone radio, lampa warsztatowa |

**Ruiny** — karta prośby szabrowania u graczy; 7 rodzajów z tabeli szabrowania (s. 271). 3:1, wnętrze, dzień
albo latarka.

| # | Plik | Rodzaj ruin | Opis do promptu |
|---|------|-------------|-----------------|
| 18 | `ui/ruiny/apteka.webp` | Apteka | Splądrowana apteka: przewrócone regały, rozsypane blistry, zielony krzyż bez prądu |
| 19 | `ui/ruiny/biuro.webp` | Biuro / mieszkanie | Opuszczone mieszkanie: kurz, zdjęcia na ścianie, pnącza przez okno |
| 20 | `ui/ruiny/magazyn.webp` | Niewielki magazyn | Regały wysokiego składowania, rozdarte kartony, wózek widłowy na boku |
| 21 | `ui/ruiny/piwnica.webp` | Piwnica / strych | Ciasna piwnica: słoiki na półkach, rury, smuga światła z okienka |
| 22 | `ui/ruiny/sklepik.webp` | Sklepik | Sklepik osiedlowy: zbita witryna, lada, przewrócona lodówka z napojami |
| 23 | `ui/ruiny/warsztat.webp` | Warsztat / pracownia | Warsztat samochodowy: kanał, narzędzia na tablicy, auto bez kół |
| 24 | `ui/ruiny/wrak.webp` | Wrak samolotu / statku | Rozerwany kadłub samolotu w piasku, rzędy foteli, kable zwisające z sufitu |

---

# H. Żetony wraków (top-down, PLAN_m5_postoj.md §7.18, dodane 2026-10-11)

**Briefy gotowe 2026-10-11:** cztery wraki w [dev/art/m5/BRIEFS.md](../art/m5/BRIEFS.md),
źródła `dev/art/m5/in/wraki/<klucz>.png`. Finalnie 400×400 (Mały, 70% kadru),
400×400 (Średni, 90%), 800×800 (Duży, 90%), 1600×1600 (największe maszyny, 92%).
Rzeczywista alpha, bez cienia, gruntu i krateru; packer nie usuwa tła i nie rysuje.
Wiersze pozostają otwarte do dostarczenia źródeł i sprawdzenia gotowych WEBP.

Po autodestrukcji maszyny żeton podmienia grafikę na wrak w rozmiarze żetonu. Styl jak `tokens/PROMPT.md`
(widok z góry), przezroczyste tło, bez cienia. WEBP. Brak pliku = żeton zostaje, tylko ślad wybuchu.

| # | Plik | Rozmiar | Opis do promptu |
|---|------|---------|-----------------|
| 1 | `tokens/wraki/maly.webp` | mały | Rozerwany korpus małego drona: wygięta blacha, kable, okopcenie |
| 2 | `tokens/wraki/sredni.webp` | średni | Wypalony szkielet maszyny wielkości człowieka, poskręcane kończyny, dymiące ślady |
| 3 | `tokens/wraki/duzy.webp` | duży | Rozbebeszony kadłub ciężkiej maszyny, pęknięte płyty pancerza, odsłonięte serwa |
| 4 | `tokens/wraki/gigantyczny.webp` | gigantyczny / ogromny | Ogromne, wypalone cielsko machiny Molocha, rozsypane gąsienice / nogi, krater wokół |

---

## Do podpięcia — przez MG

- **Starsze dźwięki produkcji (§C 1–9):** pliki w `sounds/produkcja/` są gotowe.
  Przepointować odpowiednie sloty `PRACA` i `ZDARZENIA` w
  `scripts/production/oprawa.mjs`; agent assetowy nie zmienia tego kodu.
- **Glify zatwierdzone 2026-10-12 (31 par WEBP/SVG):** pliki są zainstalowane.
  Lista wszystkich ścieżek: `review/candidates/batch-63/installed.json`.
  Zdolności pochodzenia biorą nazwę z pliku przy następnym rebuildzie
  `zdolnosci-pochodzenia`; Sztuczki mogą wymagać repointu `img` i rebuildu
  `sztuczki`. Karabin laserowy: `icons/weapons/karabin_laserowy.svg` — repoint
  ataku Biodroida i rebuild Bestiariusza. Emiter EMP: repoint `img` / rebuild
  `towarzysze`; Wyłączony: repoint definicji stanu. Istniejące przedmioty i
  efekty w świecie podmienia osobno MG. Bez przebudów ani migracji świata.
  Nazwy M5 Doba / Rozbiórka / Fanty są gotowe bez dodatkowego okablowania.
- **Dodatkowe 19 glifów zatwierdzonych 2026-10-12 (Batch 63):** zainstalowane
  ścieżki w `review/candidates/batch-64/installed.json`. Handel i Zabawka używają
  nazw M5 bez dodatkowego okablowania; starsze Sztuczki, zdolności pochodzenia
  i ataki Bestiariusza wymagające repointu / rebuildów pozostają dla MG, jak wyżej.
- **Dodatkowe 16 glifów zatwierdzonych 2026-10-12 (Batch 64):** zainstalowane
  ścieżki i wybrane źródła w `review/candidates/batch-64/reviewed-installed.json`
  oraz `review/candidates/batch-64/reviewed-addendum-installed.json`.
  Zdolności pochodzenia: następny rebuild `zdolnosci-pochodzenia`. Sztuczki:
  repoint `img` na wymienione pliki i rebuild `sztuczki`; istniejące przedmioty
  w świecie podmienia osobno MG. Agent assetowy nie wykonuje tych operacji.
- **Dodatkowe 18 glifów zatwierdzonych 2026-10-12 (Batch 65):** ścieżki w
  `review/candidates/batch-66/installed.json`. Szabrowanie używa dokładnej nazwy M5,
  bez dodatkowego okablowania. Wszystkie zdolności pochodzenia mają teraz pliki;
  ich rebuild oraz repoint `img` / rebuild starszych Sztuczek i migracje istniejących
  przedmiotów pozostają dla MG. Agent assetowy nie wykonuje tych operacji.
- **Dodatkowe 10 glifów zatwierdzonych 2026-10-12 (Batch 66):** ścieżki i
  wybrane źródła w `review/candidates/batch-66/reviewed-installed.json`.
  Starsze Sztuczki wymagające repointu `img` / rebuildu i aktualizacji istniejących
  przedmiotów w świecie pozostają dla MG. Agent assetowy nie wykonuje migracji.
- **Audyt katalogu 2026-10-12 — paliwo (wszystkie trzy grafiki gotowe):** dodać do
  `RAW_IKONY` w `scripts/production/wynik.mjs` mapy `paliwo-dobre` →
  `paliwo_dobre.svg`, `paliwo-przecietne` → `paliwo_przecietne.svg`,
  `paliwo-chrzczone` → `paliwo_chrzczone.svg` (wszystkie w `icons/items/loot/`).
  Zachować istniejące refy `raw:paliwo-*`; następnie przepointować starsze
  przedmioty przez MG. Agent assetowy nie edytuje tego resolvera ani świata.
- **Audyt katalogu 2026-10-12 — uzupełnienie medyka (gotowa grafika):** zmienić
  `REFILL_IMG` w `scripts/items/toolkit-medyk.mjs` z `icons/svg/heal.svg` na
  `modules/neuroshima-2026-overrides/icons/items/loot/uzupelnienie_medyka.svg`.
  Aktualizację istniejących przedmiotów wykonuje MG. Nowa generacja zbędna.
- **Dodatkowe 7 glifów zatwierdzonych 2026-10-13 (Batch 67):** dokładne ścieżki
  i źródła w `review/candidates/batch-67/reviewed-installed.json`. Bebeszenie
  używa nazwy M5 i nie wymaga wiring. Cztery starsze Sztuczki pozostają do
  repointu / rebuildu i aktualizacji przez MG; agent nie zmienia świata.
- **Malowane obrazy (§B/§E/§G/§H):** handlarze i utrzymanie są dostarczone;
  pozostałe obrazy oczekują na źródła MG w
  `dev/art/m5/in/<zestaw>/<klucz>.png`. Packer → kontrola gotowego WEBP → oznaczenie
  dostarczonego wiersza → wpis w CREDITS: „AI-generated with OpenAI DALL-E,
  hand-edited by the GM”. M5 używa dokładnych nazw, bez dodatkowego okablowania.

Nowe briefy, katalog i skrypty oraz dźwięki są w commitach `Assets: …`.
`MISSING.md` i główny `review/manifest.json` były już zmodyfikowane na starcie;
aktualizacje kolejki pozostawiono w drzewie roboczym, bez włączania wcześniejszych
zmian do commitów tej sesji. Metadata Batch 62 są niezależnie zachowane w
`review/candidates/batch-62/manifest-items.json`; importer tylko dopisuje karty.
