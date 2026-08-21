# Neuroshima 5e Module — Changelog & Implementation Tracker

## Files

| Plik | Rola |
|------|------|
| `module.json` | Manifest modułu |
| `scripts/main.mjs` | Entry point — hooki init/i18nInit/ready |
| `scripts/config/skills.mjs` | 18 skilli Neuroshimy |
| `scripts/config/tools.mjs` | 22 narzędzia |
| `scripts/config/damage-types.mjs` | 11 typów obrażeń + leczenie |
| `scripts/config/terminology.mjs` | Polskie cechy, waluta, jednostki |
| `scripts/config/spellcasting.mjs` | Usunięcie spellcastingu |
| `scripts/config/localization.mjs` | Fallback i18n (weryfikacja + ręczny fetch) |
| `lang/pl.json` | 553 tłumaczeń (zagnieżdżone JSON) |
| `scripts/config/conditions.mjs` | Stany — 14 z TABELI STANÓW + 8 zagrożeń + 5 znaczników + 3 stopniowane; usunięcie stanów fantasy |
| `scripts/config/levelled-conditions-data.mjs` | Tabele Upojenia (4 stopnie) i Skażenia (4 poziomy, ST) |
| `scripts/actors/levelled-conditions.mjs` | Egzekwowanie Upojenia/Skażenia + rejestr HUD dla stanów stopniowanych (też Zranienie) |
| `icons/statuses/ASSETS.md` | Specyfikacja ikon dla 2 stanów bez odpowiednika w dnd5e |
| `scripts/config/exhaustion.mjs` | Wyczerpanie (speed penalty override) |
| `scripts/config/rest.mjs` | Odpoczynki (4h KO / 24h DO) |
| `scripts/actors/abilities.mjs` | PROTOTYP: warstwa zdolności per aktor / per pionek |
| `scripts/config/diseases-data.mjs` | 8 chorób przewlekłych (k8) + 4 popularne — tekst stanów wg RAW |
| `scripts/config/phobias-data.mjs` | 8 fobii (k8) — Efekt + Przełamanie wg RAW |
| `scripts/config/medicine-data.mjs` | 12 lekarstw jako Używki (ceny/dostępność/dawki) + flavour „Weź dawkę" |
| `scripts/actors/health-panel.mjs` | Panel Choroby/Fobie (Biografia), pasek w sidebarze, dawki, Przełamanie, Zachód słońca |
| `scripts/config/disease-effects.mjs` | Mechanika stanów chorób — zmiany AE, ataki, sytuacyjne, szał, krwawienie, mnożnik upadku |
| `scripts/actors/disease-effects.mjs` | Egzekwowanie: sync Active Effects, Utrudnienie do ataków, przycisk Szału |
| `scripts/combat/bleeding.mjs` | Krwawienie (Hemofilia) — wyzwalacz, RO na koniec tury, trzy drogi zatrzymania |
| `scripts/combat/falling.mjs` | Spadanie [ZAGROŻENIE] — 1k6/1,5 m, Powalenie, upadek do cieczy, mnożnik Osteoporozy |
| `scripts/actors/fuks-pips.mjs` | Trzy piki Fuksa w nagłówku karty (zastępują gwiazdkę Inspiration) |
| `scripts/migration/migrate-health.mjs` | Migracja Chorób/Fobii/Fuksów z pól tekstowych na flagi |
| `scripts/combat/zranienie.mjs` | Stopień Zranienia (wound levels 0–4) |
| `scripts/combat/forsowanie.mjs` | Forsowanie (push failed checks) — DEPRECATED, replaced by rerolls.mjs |
| `scripts/combat/rerolls.mjs` | Przerzuty: Forsowanie + Fuks (reroll mechanics) |
| `scripts/combat/knockout.mjs` | Nokautowanie + Ostatnia Akcja |
| `scripts/combat/cover.mjs` | Dynamiczna osłona per atak + redukcja dla strzału przez |
| `scripts/combat/obalajaca.mjs` | Obsługa właściwości broni "Obalająca" i wymuszania RO na Siłę |
| `scripts/combat/weapon-save-properties.mjs` | Cechy "RO przy trafieniu": Porażająca/Powalająca/Unieruchamiająca — przycisk + save + stan, respektuje odporności |
| `scripts/weapons/jams.mjs` | Zacięcie i uszkodzenie broni palnej |
| `scripts/config/ammo-data.mjs` | 20 definicji kalibru (edytowalnych) — formuły, typy obrażeń, efekty |
| `scripts/weapons/ammo.mjs` | System amunicji — sync obrażeń, auto-apply, przycisk Obrażenia |
| `scripts/actors/ammo-inventory.mjs` | Natywne okno dodawania amunicji na karcie oraz UI Illusion (kategoria Amunicja); filtruje `magazine-*` |
| `scripts/actors/grenade-inventory.mjs` | Sekcja „Materiały wybuchowe" — osobna tabela granatów/min/ładunków, rzut na scenę, karta czatu z RO/obrażeniami |
| `scripts/actors/magazine-inventory.mjs` | Sekcja „Zapasowe Magazynki" — 6 typów, ±Ilość, ±Gotowych, dialog DODAJ MAGAZYNEK |
| `scripts/actors/sheet-position-stability.mjs` | Stabilizacja pozycji karty aktora po klikach +/- w sekcjach inventory |
| `scripts/weapons/magazine.mjs` | Magazynki Kwantowe + Strzelba Dual-Ammo (.12 Ga) + synchronizacja `system.uses` |
| `scripts/weapons/fire-modes.mjs` | KS/DS/MS/OZ + synchronizacja aktywności |
| `scripts/weapons/sounds.mjs` | Dźwięki broni i materiałów wybuchowych (strzały, eksplozje, zapalniki, miny) |
| `scripts/weapons/sequencer.mjs` | Integracja Sequencera — `seqPlayAudio`/`seqStartLoop`/`seqStopLoop`/`seqScrollText` (soft dependency, legacy fallback) |
| `scripts/weapons/engine.mjs` | Silnik (`spalinowa`) — start/stop pętli dźwięku przez `seqStartLoop`/`seqStopLoop`, auto-tworzenie aktywności uruchom/zgaś |
| `scripts/weapons/tracer-vfx.mjs` | Własny silnik PIXI smug/błysków lufy (baked textures, nie Sequencer webm) — `tracerFire`/`tracerFireArea`, cache wizualny per kaliber/broń |
| `scripts/weapons/tracer-debug-panel.mjs` | Panel GM do tuningu VFX na żywo (suwaki TUNE, testowe salwy, eksport configu) |
| `scripts/weapons/sound-debug-panel.mjs` | Panel GM do audiobanków (odsłuch pojedynczych plików, audyt rozwiązania kaliber→bank) |
| `scripts/config/caliber-vfx.mjs` | Warianty VFX per kaliber (14 kalibrów: długość/kolor/prędkość smugi, rozrzut) |
| `scripts/config/weapon-vfx.mjs` | Nadpisania VFX dla broni sygnaturowych (Minigun, Świnia, Browning, Light Fifty 2K20, Miotacz ognia, LAW) |
| `scripts/config/sound-bank-manifest.mjs` | Auto-generowana lista plików audio (wejście do `sound-banks.mjs`) |
| `scripts/config/sound-banks.mjs` | Redakcyjne mapowanie kaliber/broń → bank → slot → losowy take |
| `scripts/weapons/damage-reduction.mjs` | Rozszerzenie panelu Apply Damage o redukcję materiałową |
| `scripts/weapons/addons.mjs` | System Ulepszeń Broni — install/remove, delta, bonusy warunkowe, aktywności (bagnet/granatnik/śrutówka), toggle setup |
| `scripts/weapons/melee-degradation.mjs` | Degradacja kości obrażeń broni białej (k12→…→1) + naprawa; Naostrzenie niszczone przy uszkodzeniu (RAW) |
| `scripts/weapons/dozownik.mjs` | Ulepszenie Dozownik — zasób dawek (np. trucizna na ostrzu) |
| `scripts/weapons/thrown.mjs` | Obsługa broni miotanej (rzut, zasięg) |
| `scripts/actors/addons-inventory.mjs` | UI Ulepszeń — context menu na loot, panel na arkuszu broni, chat tagi, przyciski toggle setup |
| `scripts/config/addons-data.mjs` | Statyczny słownik ADDON_DEFS (definicje wszystkich ulepszeń) |
| `scripts/config/weapons.mjs` | Override kategorii broni D&D 5e na kategorie Neuroshimy |
| `scripts/migration/migrate-weapon-ammo.js` | Migracja istniejących broni → kalibry |
| `scripts/migration/migrate-weapon-types.js` | Migracja istniejących broni → poprawne kategorie Neuroshimy |
| `styles/neuroshima.css` | CSS — post-apo visual + hide spellcasting |

---

## Phase 1: Playable MVP

### 1.1 Terminology & Localization
- [x] Polskie nazwy cech (SIŁ, ZRC, KON, INT, MDR, CHA) — direct strings
- [x] Usunięcie HON/SAN
- [x] AC → TT, HP → PW, HD → KW w CONFIG
- [x] Waluta → Gamble (gb)
- [x] Jednostki ruchu → metry (m/km)
- [x] Level cap → 12
- [x] `lang/pl.json` — 553 tłumaczeń (TYPES, EFFECT, DND5E nested)
- [x] `module.json` — rejestracja lang dla "en" i "pl"
- [x] `localization.mjs` — async fallback z weryfikacją sentinel key

### 1.2 Skills & Tools
- [x] 18 skilli Neuroshimy z poprawnymi cechami (Medycyna=INT, Pojazdy=MDR)
- [x] 22 zestawy narzędzi z polskimi nazwami
- [x] Usunięcie standardowych skilli dnd5e

### 1.3 Damage Types
- [x] 11 typów obrażeń (dodano Wybuchowe, usunięto Force/Necrotic/Thunder)
- [x] Polskie nazwy typów leczenia

### 1.4 Spellcasting Removal
- [x] Wyzerowanie spell schools, spell levels, spell list preparation modes
- [x] Ukrycie zakładki Spellbook w sheet (CSS: `.tab[data-tab="spells"]`)
- [x] Ukrycie spell slots, spell DC, spell attack bonus, pact magic, concentration

### 1.5 Stopień Zranienia
- [x] Flagi modułu na aktorze: `zranienie.level` (0–4)
- [x] Automatyczne nadanie Zranienia przy PW→0 (hook updateActor)
- [x] Automatyczne nadanie Zranienia przy trafieniu krytycznym (hook dnd5e.rollDamage)
- [x] Penalty: speed -1.5/3/4.5/6 m, no reactions (lvl 2+), no bonus actions (lvl 3+)
- [x] Krytyczny Stopień + kolejny = śmierć (komunikat czatu)
- [x] Auto-Wyczerpanie przy Krytycznym (lvl 4)
- [x] Komunikaty czatu z informacją o karach
- [x] Active Effects for speed penalties (walk/fly/swim/climb/burrow reduction)
- [x] Stopień Zranienia wyświetlany na karcie BN (renderNPCActorSheet) — piki w kolumnie portretu, pod paskiem HP
- [x] Ostatnia Akcja prompt (3 death save failures)
- [x] Nokautowanie — melee bludgeoning at 0 PW → choice: 1 PW + Nieprzytomność
- [x] **Stan `zranienie` na pionku (2026-08-03)** — trzeci *widok* tej samej flagi, obok efektu
  i pików. Nie drugie miejsce przechowywania: `flags.<mod>.zranienie.level` pozostaje jedynym
  magazynem, wszystko inne z niego wynika i zapisuje przez `setZranienie`/`applyZranienie`.
  Ten sam układ, którym dnd5e trzyma w ryzach Wyczerpanie (jeden magazyn, N widoków, jeden lejek
  zapisu) — z tą różnicą, że dnd5e trzyma poziom na efekcie i wylicza atrybut aktora
  (`prepareExhaustionLevel` + `_onUpdateExhaustion`), a tu jest odwrotnie. Kierunek jest obojętny;
  dwa magazyny nie
- [x] **Statyczne `_id` efektu** (`dnd5ezranienie00`, czytane z `CONFIG.statusEffects`, nie wpisane
  na sztywno) — bez tego `toggleStatusEffect("zranienie")` z makra lub innego modułu tworzyłby
  **drugi, niezarządzany** efekt rany obok właściwego. To była realna wersja obawy o duplikację.
  Zweryfikowane na żywo: włączenie statusu z zewnątrz trafia w dokument modułu, nie tworzy rywala
- [x] Ikona zmieniona z `bleeding.svg` na `bloodied.svg` — po rejestracji Krwawienia jako osobnego
  stanu stara ikona była nie do odróżnienia od niego na pionku. `bloodied.svg` zwolniło się,
  bo moduł zeruje `bloodied.threshold` (Neuroshima mierzy obrażenia Stopniem Zranienia), więc
  ikona ląduje na mechanice, która ją zastąpiła — zero nowych assetów
- [x] Klik w HUD idzie przez `setZranienie`, ten sam zapis co piki na karcie, więc oba gesty robią
  dokładnie to samo — w tym **nie** odpalają sprawdzenia śmierci ani auto-Wyczerpania, które
  należą do `applyZranienie` (rany od obrażeń) i z ręcznej edycji pików nigdy nie leciały
- [x] **Backfill przy starcie** — jak przy chorobach i stanach stopniowanych. Wykrył i naprawił
  realny, wcześniejszy rozjazd: Piekarz i Victor von Blitz mieli flagę Zranienia 2 i **zero
  efektu**, czyli od jakiegoś czasu nie płacili −4,5 m (Victor chodził 9 m zamiast 4,5)

### 1.5a Stany (Conditions / Status Effects)
Źródło: **TABELA STANÓW** (*Walka*) + **ZAGROŻENIA** (*Zasady szczegółowe*).

- [x] **14 stanów z TABELI STANÓW** — wszystkie mapują się 1:1 na istniejące id dnd5e:
  Nieprzytomność=`unconscious`, Niewidoczność=`invisible`, Obezwładnienie=`incapacitated`,
  Ogłuchnięcie=`deafened`, Ogłuszenie=`stunned`, Oślepienie=`blinded`, Pochwycenie=`grappled`,
  Powalenie=`prone`, Przerażenie=`frightened`, Sparaliżowanie=`paralyzed`,
  Unieruchomienie=`restrained`, Wyczerpanie=`exhaustion`, Zatrucie=`poisoned`, Zauroczenie=`charmed`
- [x] **Kolizja nazw naprawiona**: `lang/pl.json` tłumaczyło `ConDeafened` jako „Ogłuszony", a w
  Neuroshimie **Ogłuszenie to `stunned`**, zaś `deafened` to Ogłuchnięcie. Nazwy ustawiane są
  teraz literalnie w `conditions.mjs` (przechodzą przez `preLocalize` bez zmian, jak
  `exhaustion.name` już wcześniej), więc rulebookowe brzmienie stoi obok rulebookowego tekstu
- [x] **8 zagrożeń** zachowanych: Krwawienie, Podpalenie, Uduszenie, Niedożywienie, Odwodnienie,
  Spadanie, Choroba, Zaskoczenie. Każde z nich albo jest nazwanym [ZAGROŻENIEM] z podręcznika,
  albo jest już sterowane kodem modułu (`bleeding.mjs`, `falling.mjs`)
- [x] **5 znaczników** technicznych: Martwy (`DEFEATED` — wymagany przez rdzeń), Ustabilizowany,
  Unikanie, Ukrywanie się, Sen
- [x] **13 usuniętych**: `petrified`, `cursed`, `transformed`, `silenced`, `concentrating`,
  `ethereal`, `flying`, `hovering`, `burrowing`, `marked`, `coverHalf/ThreeQuarters/Total`.
  Osłona jest rozstrzygana per atak w dialogu (`cover.mjs`) i nigdy nie czytana z pionka, więc
  trzy znaczniki osłony były wyłącznie dekoracją
- [x] `reference` usuwane ze wszystkich stanów — wskazywały na strony reguł SRD opisujące
  **D&D-ową** wersję stanu; zastąpione tekstem z podręcznika w `description`
- [x] **Bugfix: `conditionEffects`** — dnd5e stosuje drabinkę Wyczerpania z 2024 (Utrudnienie do
  testów na 1, ½ ruchu na 2, Utrudnienie do RO i ataków na 3, **½ maks. PW na 4**, brak ruchu na 5).
  Neuroshima ma płaskie −2/poziom i −1,5 m/poziom i nic więcej. Bez tej poprawki postać
  z Wyczerpaniem 2 dostawała modułowe −3 m **oraz** dnd5e-owe ×0,5, a na poziomie 4 po cichu
  traciła połowę maksymalnych PW. Wszystkie wpisy `exhaustion-N` wycięte
- [x] **Przerażenie** dopisane do `abilityCheckDisadvantage`/`attackDisadvantage` — w 5e Utrudnienie
  działa tylko przy widocznym źródle, więc dnd5e zostawia to MG; wpis Neuroshimy jest bezwarunkowy
- [x] `bloodied.threshold = 0` — Zakrwawiony (≤50% PW) wyłączony; Neuroshima mierzy obrażenia
  Stopniem Zranienia i dwa konkurujące wskaźniki „jak bardzo oberwałem" są gorsze niż jeden
- [x] Ostrzeżenie w konsoli, gdy aktualizacja dnd5e wprowadzi stan spoza list — cicha akceptacja
  wpuszczałaby reguły 5e z powrotem, ciche usunięcie mogłoby zepsuć silnik

### 1.5b Stany stopniowane — Upojenie, Skażenie, Zranienie
Stany z drabinką poziomów. **Ograniczenie**: mechanika stopni w dnd5e jest
zaszyta pod literalne `exhaustion` i `system.attributes.exhaustion`
(`active-effect.mjs` → `_prepareExhaustionLevel`, `_manageExhaustion`), więc `levels: 4` samo
z siebie nic nie daje — poziomy, piki i cykl kliknięć musiały powstać od zera.

- [x] **Upojenie** (4 stopnie, tabela z *Zasad szczegółowych*) — kumulatywne: stopień 3 niesie
  też 1 i 2. Stopień 1: Utrudnienie CHA/INT; 2: + MDR; 3: + wszystkie Testy Cech i Testy Ataku,
  ½ Szybkości; 4: `unconscious`
- [x] **Skażenie radioaktywne** (4 poziomy: Niski ST 10 / Niebezpieczny ST 15 / Krytyczny ST 20 /
  Zabójczy ST 25). Poziom **nie** nakłada kar wprost — niesie ST godzinowego RO na Kondycję,
  a szkoda przychodzi jako Wyczerpanie. Licznik oblanych RO na aktorze; trzeci = choroba popromienna
- [x] **Uwaga**: `neuroshima_5e_modifications.md` §16.2 podaje ST 5/10/15/20 — to **nie zgadza się
  z RAW**. Tabela POZIOM SKAŻENIA RADIOAKTYWNEGO daje 10/15/20/25. Kod idzie za podręcznikiem
- [x] Poziomy trzymane w fladze `flags.<mod>.upojenie` / `.skazenie` (0–4); jeden hook `updateActor`
  obsługuje wszystkie ścieżki zmiany
- [x] Active Effects budowane z poziomu, własność modułu przez flagę `levelledCondition` —
  ten sam kontrakt co `disease-effects.mjs`; ręcznie dodanych efektów nie rusza
- [x] Utrudnienie do ataków (Upojenie 3) przez `dnd5e.postBuildAttackRollConfig` — dnd5e nie ma
  pola `attack.roll.mode`; `advantageMode` pisany wprost, bo `applyKeybindings` rozwiązuje
  `options.disadvantage` **przed** hookiem
- [x] Cykl poziomów w HUD pionka: LPM w górę, PPM w dół — ten sam gest co Wyczerpanie; nakładka
  z numerem stopnia (`.neuro-condition-level`) zamiast ośmiu numerowanych ikon
- [x] **Nakładka musi wisieć na palecie, nie na ikonie** — Foundry buduje każdy przycisk statusu
  jako goły `<img class="effect-control">`, a `<img>` to element pusty: `append()` przechodzi
  w DOM i nigdy się nie renderuje. Nakładka trafia więc do palety (`position: absolute`, czyli
  blok zawierający i `offsetParent` ikon) i jest pozycjonowana nad swoją ikoną. Pozycję trzeba
  zmierzyć, a w chwili renderu paleta jest jeszcze zwinięta i wszystkie offsety wynoszą 0 —
  `ResizeObserver` przelicza ją, gdy paleta faktycznie dostanie layout
- [x] **Rejestr HUD** (`registerHudLevelled`) — Upojenie i Skażenie rejestrują się z tabel w tym
  pliku, **Zranienie z `combat/zranienie.mjs`**. Odwrócona zależność: warstwa HUD dostaje gest
  i nakładkę, a nie dowiaduje się, jak działają rany
- [x] API `game.neuroshima.conditions`: `drink()` (RO KON ST 15), `soberUp()` (Kac — RO KON ST 10,
  porażka = Wyczerpanie), `radiationSave()`, `clearRadiation()` (RadOff), `get/set/adjust/sync`
- [x] Backfill przy starcie świata dla GM — jak przy chorobach; sync jest no-opem, gdy nic się nie różni
- [ ] Świadomie **poza automatyką** (wyzwalacze czasu i miejsca, per wybór zakresu):
  odliczanie 4 h do kolejnego stopnia Kaca, godzinowy tick skażenia, tagowanie sceny/strefy
  poziomem skażenia. Warstwa daje przyciski i arytmetykę; kiedy je nacisnąć, decyduje MG
- [ ] Świadomie poza automatyką (brak pola w dnd5e / czysty opis): „Ułatwienie do RO przeciw
  Przerażeniu" (RO są kluczowane cechą, nie odpieranym stanem), „nie potrafisz przejść 3 m
  w linii prostej". Wypisywane w opisie efektu jako „Poza automatyką: …"
- [x] Ikony: placeholdery `icons/statuses/upojenie.svg` / `skazenie.svg` + pełna specyfikacja
  do podmiany w `icons/statuses/ASSETS.md`

### 1.6 Wyczerpanie (Neuroshima rules)
- [x] -2 do każdego testu k20 per level (dnd5e modern rules — `rolls: 2`)
- [x] -1.5m Szybkości per level (`reduction.speed = 1.5`)
- [x] Śmierć przy 6 poziomach (kept from dnd5e)
- [x] EXHAUSTION_SOURCES enum (bezsenność, kac, niedożywienie, odwodnienie, etc.)
- [x] Tracking source type per actor (flags + pip tooltips + add/remove dialogs)
- [x] preUpdateActor blocks raw pip clicks → source selection dialog
- [x] renderCharacterActorSheet hook injects source labels into pip tooltips
- [x] Rest recovery: only clears sources with `restClears: true`

### 1.7 Ammo & Magazine Tracking (Native)
- [x] Natywny Tab Amunicji: Oddzielenie amunicji od `Używek` metodą UI Illusion (własny panel w ekwipunku) + suwak tworzenia per kaliber (baza `ammo-data.mjs`).
- [x] Różnicowanie Strzelb: Jeżeli broń ma kaliber `.12 Ga`, a gracz posiada oba typy pudełek (Śrut i Breneka), okno Przeładowania zadaje pytanie wyboru, aktualizując modyfikatory lufy w locie.  
- [x] Magazynki Kwantowe: Dodano śledzenie w Ekwipunku sztuk magazynków zapasowych (`Mag. do broni...`).
- [x] Blokady bojowe: Twarda blokada akcji rzutu przeładowania broni *wymiennej* w czasie trwania Walki przy zerowym zasobie odpowiedniego `Kwantowego Magazynka` (przeciw "kieszeniowaniu luzem" cekaemów).
- [x] Regeneracja zasobów: Auto-reset Uses na flagowanych Kwantowych Magazynkach po zakończeniu enclunteru (hook `deleteCombat` / `deleteCombatant`).
- [x] **Zapasowe Magazynki** (`magazine-inventory.mjs`) — sekcja ponad Amunicją w inventory
  - 6 typów: Krótki / Pośredni / Długi / Ciężki / Kołczan / Szybkoładowarka Rew.
  - Kolumny: Ikona+Nazwa | Cena | Waga | Ilość(±) | Gotowych(±) | Edytuj/Usuń
  - `flags["neuroshima-2026-overrides"].ready` = liczba gotowych/załadowanych
  - Mapowanie broń→typ: właściwość `beb`→speedloader, `wmag`→null, Neuroshima types, `martialR` z kalibru (3-krokowy algorytm)
  - Dialog DODAJ MAGAZYNEK (typ, ilość, gotowych, podgląd ceny/wagi)
  - Sekcja zawsze widoczna (nie tylko gdy są magazynki w inventory)
- [x] Ikony magazynków: `icons/magazines/` — 6 SVG (5 z Weapons_Resize_11 + `speedloader.svg` z Weapons_Resize_12)
- [x] `dev/icons/process_grid_12.py` — przetworzono 9 ikon (speedloader, tourniquet, wax_candle, super_glue, disinfectant_spray, magnifying_glass, detergent, duct_tape, lighter)
- [x] `dev/icons/process_single.py` — nowy skrypt do przetwarzania pojedynczych tile'ów (nie siatek)
- [x] `PLAN_magazine_system.md` — architektura systemu (model danych, algorytm przeładowania, layout UI)
- [x] Pop-upy i Czat: Zlikwidowano uciążliwy slider "Ilu naboi ładujesz?" na rzecz natychmiastowego `fill-to-max` i potrącenia z karty; Czat loguje flavour tekst, np: *[Załadował wszystkie swoje X do Y] / [Załadował do pełna]*.
- [x] Komunikaty czatu: broń pusta / zacięcie
- [x] Nieudane odblokowanie zacięcia uszkadza broń i wymaga naprawy
- [x] Naprawa uszkodzonej broni wymaga Narzędzi małego rusznikarza
- [x] Flaga `cleaned` per broń + osobny przycisk czyszczenia jako aktywność odpoczynku (1h)
- [x] `cleaned` znika po następnym użyciu broni
- [x] Hooki na `Jak Dbasz, Tak Masz` i `Wychuchana spluwa`
- [x] PROTOTYP: brak automatycznej walidacji wymagań sztuczek / zdolności; warunki zakupu pozostają po stronie MG
- [x] PROTOTYP: `Grad ołowiu` podpięty do warstwy zdolności; sztuczka znosi tylko blokadę `KS -> kolejna KS` w tej samej rundzie
- [x] `Wychuchana spluwa` może być zmieniana tylko poza walką, z komunikatami start/stop i jedną aktywną bronią naraz
- [x] PROTOTYP: warstwa zdolności per aktor / per pionek (flagi + resolver + panel na karcie aktora)
- [x] PROTOTYP: `Wychuchana spluwa` działa tylko przy aktywnej zdolności; sama flaga na broni nie wystarcza

### 1.7a Materiały Wybuchowe / Granaty
- [x] Oddzielenie materiałów wybuchowych od sekcji Amunicja — osobna tabela „Materiały wybuchowe" w inventory
- [x] Obsługiwane typy `grenade-*`: granaty, miny, ładunki zdalne, pipebomb, Mołotow i granat zapalający
- [x] Klik na nazwę / przycisk „Rzuć" inicjuje wybór punktu na scenie, pomiar odległości i redukcję ilości
- [x] Zasięg rzutu zależny od SIŁ i wagi ładunku; karta czatu pokazuje odległość i pasmo rzutu
- [x] Obszary efektu parsowane z definicji (`Koło`, `Sześcian`, wariant otwarty/budynek)
- [x] Sześciany wybuchu renderowane jako `Drawing`, nie `MeasuredTemplate rect`, aby uniknąć artefaktów FVTT
- [x] Miny stawiają marker uzbrojenia zamiast standardowego template wybuchu
- [x] Tekst na scenie przy markerach/template jest mały i opisuje powiązany ładunek (np. „granat zapalający")
- [x] Karta czatu granatu ma akcje „Rzuć RO na zaznaczonych" i „Rzuć obrażenia"
- [x] `Rzuć obrażenia` generuje standardowy roll obrażeń do chatu, a dalsze Apply Damage odbywa się już w natywnym panelu dnd5e
- [x] `Rzuć RO na zaznaczonych` działa natychmiast (`configure: false`) na zaznaczonych lub wycelowanych pionkach
- [x] Dźwięki materiałów wybuchowych są mapowane per subtype (gaz, flashbang, Mołotow, pipebomb, mina, C4/dynamit, granat zapalający)

### 1.7b Stabilność UI Inventory
- [x] Stabilizacja pozycji karty aktora po klikach +/- w sekcjach custom inventory (ammo / granaty / magazynki / natywne quantity)
- [x] Snapshot pozycji arkusza przy kliku i przywrócenie po małym dryfie rerenderu (bez korekty dużych, intencjonalnych przesunięć)

### 1.8 Fire Modes (Tryby Ognia)
- [x] Ogień pojedynczy (P) — bazowa aktywność `attack` broni palnej automatycznie przemianowana na „Ogień pojedynczy" przy sync
- [x] **Bugfix (2026-07-04)**: P był zawsze obecny niezależnie od `tryb_p` (broń bez tej właściwości, np. Minigun — RAW ma tylko MS — i tak dostawała pojedynczy strzał). `syncBaseAttackActivity` teraz bramkuje bazową aktywność `attack` przez `_hasProperty(item,"tryb_p")`, symetrycznie jak KS/DS/MS/OZ (tworzy/usuwa). `_findReferenceAttackActivity` ma fallback do `DEFAULT_ATTACK_ACTIVITY_TEMPLATE`, żeby buildery KS/DS/MS/OZ nadal miały wzorzec (zasięg/aktywacja) nawet gdy broń nie ma trybu P. Zweryfikowano na całym świecie (188 broni palnych, 0 anomalii po fixie); przy okazji naprawiono niezwiązaną korupcję danych na „H&K UMP (uszkodzone)" (klucz mapy `system.activities` różnił się od wewnętrznego `_id` aktywności, przez co natywny `item.deleteActivity()` cicho nic nie robił).
- [x] Krótka seria (KS): 3 naboje, Utrudnienie, 3× obrażenia, bez mod.
- [x] PROTOTYP: `Grad ołowiu` zdejmuje limit `1 KS/rundę`; limit ataków w turze pozostaje po stronie gracza / MG, nie karty
- [x] PROTOTYP: `Szturmowiec` zmienia domyślny rzut `KS` z utrudnienia na normalny; MG może ręcznie nadpisać wybór w dialogu
- [x] Długa seria (DS): 10–30 nabojów, linia, RO ZRC, progi obrażeń — vertical slice
- [x] PROTOTYP: `Ruchome gniazdo CKM` podwaja koszt amunicji i liczbę kości obrażeń dla `DS`, z osobnym komunikatem wyjątku reguły
- [x] Template DS/MS znika automatycznie po wyjściu z tury strzelca
- [x] Miażdżąca seria (MS): 50–200 nabojów, szerokość 3m, RO ZRC + RO SIŁ
- [x] Ogień zaporowy (OZ): 6 nabojów, template do początku następnej tury strzelca, RO MDR, blokada Akcji/BA — vertical slice
- [x] Pechowa jedynka: zacięcie na nat 1, Akcja + Zwinne dłonie ST 10, porażka = uszkodzenie broni
- [x] **Bugfix**: guard serii/OZ sprawdza `item.actor?.inCombat` — ostrzeżenie nie odpala się poza walką
- [x] **Bugfix**: DS/MS `rollDamage` z chat carda używał zawsze domyślnego mnożnika — root cause: `syncLongBurstActivity` resetuje `damage.parts`/flagi do `DS_THRESHOLDS[0]` przy każdym `updateItem`; fix: `_burstSelectionCache` (module Map) + `sync*BurstActivity` teraz zachowuje istniejącą selekcję
- [x] Ikony aktywności: `icons/activities/` — 9 SVG (process_grid_13.py); `metadata.img` ustawione dla wszystkich neuro* typów; `syncBaseAttackActivityName` ustawia też `img` dla „Ogień pojedynczy"

### 1.19 Sequencer Integration
Szczegółowy plan: `PLAN_sequencer.md` (status w planie był nieaktualny — patrz commit 2026-07-29, poniższe odzwierciedla stan faktyczny)

**Phase 0 — Setup (soft dependency)** — [x] DONE
- [x] `module.json` — Sequencer jako `relationships.optional` (min 4.0.0)
- [x] `scripts/weapons/sequencer.mjs` — `_getSequencer()` helper, legacy fallback pozostaje po stronie wołających (`sounds.mjs`)
- [x] `seqPlayAudio(src, vol, { token, soundKey })` — jedyny punkt wyjścia dla audio przez Sequencer
- [x] `seqScrollText(text, token, opts)` — no-op bez Sequencera

**Phase 1 — Audio Migration (globalne dźwięki, identyczne zachowanie)** — [x] DONE
- [x] `playWeaponSound()` (`sounds.mjs`) woła `seqPlayAudio()` jako pierwsze; `AudioHelper.play()` + `game.socket.emit()` to **świadomie zachowany** fallback na wypadek braku Sequencera, nie dług techniczny
- [x] `SOCKET_EVENT`/listener celowo pozostają żywe dopóki fallback jest w użyciu (zgodnie z pierwotnym planem — usunięcie odłożone, nie zapomniane)
- [x] Walidacja: wieloosobowo — wszyscy słyszą strzał bez custom socketu (gdy Sequencer aktywny)

**Phase 2 — Positional Audio** — [x] DONE
- [x] `seqPlayAudio` — gałąź pozycyjna (`SOUND_RADIUS` per soundKey, `distanceEasing`/`panSound`/`muffledEffect`, `alwaysForGMs`)
- [x] Pojedynczy strzał / przeładowanie / puste kliknięcie (`magazine.mjs`) i trafienie (`ammo.mjs`, impact na celu) przekazują `token`
- [x] **(2026-07-29)** KS/DS/MS/OZ w `fire-modes.mjs` przełączone z `playWeaponSound(WeaponSound.BURST_*)` na `playBurstSound(liveItem, mode, { caliberId, token })` — serie ogniowe grają się teraz pozycyjnie z tokena strzelca, tak samo jak P

**Phase 3 — Scrolling Combat Text (zero nowych assetów)** — [x] DONE
- [x] `ZACIĘCIE!` (czerwony) nad tokenem strzelca — `jams.mjs`
- [x] `PUSTE!` (pomarańczowy) + `ZAŁADOWANO` (żółty) — `magazine.mjs`
- [x] `ZRANIONY!` / `KRYTYCZNE ZRANIENIE!` (czerwony/fioletowy) — `zranienie.mjs`
- [x] `WYCZERPANIE` (niebieski) — `exhaustion.mjs` `addExhaustion` path
- [x] `FUKS!` (zielony) — `rerolls.mjs` po użyciu Fuksa
- [x] Bonus poza planem: `toolkit-medyk.mjs` (tekst stabilizacji/leczenia)

### 1.21 Tracer/Muzzle VFX Engine
Zastępuje pierwotne podejście z `PLAN_shooting_vfx.md` (Sequencer `.effect()` + webm JB2A) — nie skaluje się do serii Minigunu. Zamiast tego własny silnik PIXI z wypiekanymi (baked) teksturami.

- [x] `tracer-vfx.mjs` — `tracerFire()` (pojedynczy cel), `tracerFireArea()` (linia/szablon, per-token trafienie), `_bakeTracerTexture`/`_bakeMuzzleTexture`, pula obiektów, licznik FPS
- [x] Warianty wizualne per kaliber (`caliber-vfx.mjs`, 14 kalibrów) i per broń sygnaturowa (`weapon-vfx.mjs`, 5 broni: Minigun, Świnia, Browning, Light Fifty 2K20, Miotacz ognia, LAW) — kaskada broń > kaliber > globalny TUNE
- [x] **Pojedynczy strzał**: `magazine.mjs` `_playSingleShotVfx()` woła `tracerFire()` z realnego `neuroRollAttack` — trafienie/pudło rozstrzygane przez `_isAttackHit()` (krytyk=trafienie, pech=pudło, inaczej rzut≥TT)
- [x] **KS**: `fire-modes.mjs` `_playShortBurstVfx()` analogicznie
- [x] **(2026-07-29) DS/MS**: `_playAreaBurstVfx()` (nowy helper, mirror `_playShortBurstVfx`) woła `tracerFireArea(liveItem, results.templates[0], selection.bullets)` z produkcyjnych handlerów `use()` — serie obszarowe mają teraz tracer na stole. Bez per-tokenowego trafienie/pudło: `tracerFireArea` zawsze kończy próbkowane impakty (`hit:true`), zgodnie z RAW, gdzie każdy nabój serii ląduje gdzieś w szablonie niezależnie od indywidualnych RO celów. OZ świadomie pominięte (poza zakresem VFX per `PLAN_shooting_vfx.md` §2), dostało tylko poprawkę dźwięku (patrz Phase 2 wyżej)
- [ ] Screen shake (zaplanowany w `PLAN_sequencer.md` §6.3 dla DS/MS) — nieobecny w kodzie
- [ ] Impact spark/blood + błysk tokena (`PLAN_shooting_vfx.md` §3, warstwy "impact"/"token flash") — porzucone, nie tylko odłożone; trafienie ma dziś tylko warstwę dźwiękową
- [x] Panel debug (`tracer-debug-panel.mjs`) — rejestrowany w `init`, przycisk widoczny tylko dla GM (`visible: game.user?.isGM`), testowe salwy wszystkich 6 trybów + eksport configu

### 1.22 Sound Banks (Audiobanki)
- [x] `sound-bank-manifest.mjs` (auto-lista plików) + `sound-banks.mjs` (redakcyjne mapowanie kaliber/broń → bank → slot → losowy take), w tym syntezowane banki serii (`smg-synth`/`ar-synth`/`fnfal-synth`) tam, gdzie nie istniało nagranie
- [x] Żywe dla: pojedynczy strzał, przeładowanie, puste kliknięcie (`magazine.mjs`), trafienie pojedynczym strzałem (`ammo.mjs`)
- [x] **(2026-07-29)** `fire-modes.mjs` KS/DS/MS/OZ przełączone na `playBurstSound()` — banki serii (w tym syntezowane `smg-synth`/`ar-synth`/`fnfal-synth`) rozwiązują się teraz w realnej rozgrywce, nie tylko w panelu debug
- [ ] Dźwięki trafienia serią (`impact-burst-*`) nieosiągalne strukturalnie — obrażenia serii idą przez `Activity.rollDamage` + ręczny Apply Damage, z pominięciem ścieżki w `ammo.mjs`, która zna kaliber+broń (udokumentowane w komentarzu `ammo.mjs:178-181`)
- [x] Panel debug (`sound-debug-panel.mjs`) — 3 zakładki (BANKI/KALIBRY/NIEZNANE), rejestrowany w `init`, GM-only, odtwarzanie lokalne bez broadcastu

### 1.20 Melee Weapon Degradation
- [x] Nat 1 → kość obrażeń spada (k12→k10→k8→k6→k4)
- [x] Tracking current vs base damage die per weapon
- [x] Naprawa przez kowala lub narzędzia

### 1.10 Osłona (Cover)
- [x] Osłona rozstrzygana per konkretny atak, domyślnie brak osłony
- [x] Wokół osłony: +2/+5 TT i +2/+5 RO ZRC, pełna osłona blokuje strzał bezpośredni
- [x] Przez osłonę: bez bonusu do TT/RO, poziom 1-5 daje redukcję obrażeń 5/10/15/20/40
- [x] KS i ataki bezpośrednie pytają o osłonę celu względem strzelca
- [x] DS pyta o osłonę osobno dla każdego celu; redukcję dla strzału przez MG stosuje ręcznie
- [x] OZ nie sprawdza automatycznie, czy cel jest pod osłoną

### 1.11 Forsowanie (Optional)
- [x] "Forsuj" button w chat card po skill/tool/ability check
- [x] Reroll: k20 + pełna wartość cechy (nie mod.)
- [x] Auto 1 Wyczerpanie
- [x] Nie dotyczy: ataki, rzuty obronne (filtr rollType)
- [x] World-level toggle (`forsowanieEnabled` setting)
- [x] Przyciski dostępne tylko dla aktorów typu `character` (BG), nie dla BN (`npc`)
- [x] Fuks (Lucky Break) — reroll any d20 test, costs 1 Fuks (max 3)
- [x] Fuks button greyed out when 0 Fuksy
- [x] **Fuks na karcie (`fuks-pips.mjs`)**: natywna gwiazdka Inspiration usunięta z nagłówka
  (była binarna i podpięta pod `system.attributes.inspiration`, czyli pod nic — realny zasób
  od zawsze siedzi w `flags.<mod>.fuksy`). W jej miejsce trzy klikalne koniczyny 0–3, ta sama
  semantyka klikania co piki Zranienia (klik w najwyższy zapalony cofa o jeden)
- [x] Confirmation dialogs for both Forsowanie and Fuks
- [x] Styled chat messages (amber for Forsowanie, green for Fuks)

### 1.12 Initiative Variants
- [ ] Zaskoczenie → Utrudnienie do inicjatywy
- [ ] Niespodziewany atak → Ułatwienie do inicjatywy

### 1.13 Special Melee Actions
- [ ] Odepchnięcie, Pochwycenie, Wytrącenie jako opcje ataku

### 1.14 Rest Overrides
- [x] Krótki odpoczynek = 4h / 240min (nie 1h)
- [x] Długi odpoczynek = 24h / 1440min (nie 8h)
- [x] Polskie etykiety (Krótki/Długi odpoczynek)
- [ ] Przerwanie DO po 4h → benefity KO

### 1.15 Custom Character Sheet Shell
- [ ] Ukrycie/usunięcie elementów fantasy (spellbook, pact magic, etc.)
- [ ] Sekcja Zranienie + Wyczerpanie na głównej karcie
- [ ] Neuroshima-specific layout

### 1.16 Level Progression
- [x] Level cap 12
- [ ] PD thresholds (50, 150, 300... 3400)
- [ ] Pasywna Percepcja display

### 1.17 Weapon Types / Kategorie Broni
- [x] Usunięcie The Simple/Martial D&D weapon types.
- [x] Zdefiniowanie `Broń biała`, `Broń miotana`, `Broń palna krótka/pośrednia/długa/ciężka`, `Broń specjalna`
- [x] Implementacja mutacyjna na `CONFIG.DND5E.weaponTypes` chroniąca przed DataModelValidationError
- [x] Podpięcie hooków `setup` oraz `i18nInit` dla uniknięcia cache'owania UI Dropdownu
- [x] Skrypt `migrate-weapon-types.js` do aktualizacji przedmiotów na the Aktorach i w świecie

### 1.18 Ulepszenia Broni (Weapon Addons)
- [x] Architektura: ulepszenie = loot item z flagą `ulepszenie: ID`; instalacja zużywa przedmiot, deinstalacja zwraca go do ekwipunku (`PLAN_weapon_addons.md`)
- [x] `addons-data.mjs` — statyczny słownik `ADDON_DEFS` (kategorie, ceny, wymagania, tryby `direct`/`property`/`conditional`/`activity`, sloty SM)
- [x] `installAddon` / `removeAddon` — system delta (reversible): `_computeDelta`/`_applyDelta`/`_reverseDelta`; rollback przy błędzie (`try/catch`)
- [x] Kaskadowe usuwanie zależnych ulepszeń (`removeAddon(..., {cascade})`, `_getDependentAddons`); blokada gdy `cascade:false`
- [x] Tryb `direct` — statyczne bonusy: +1 TA wstrzykiwany w `dnd5e.postBuildAttackRollConfig` (dnd5e 5.3 nie ma `system.attack.bonus`), +1 obrażeń na `system.damage.base.bonus`
- [x] Tryb `property` — nadanie/odebranie właściwości broni (`cicha`, `porazajaca`, `dluga`…) przez `system.properties`
- [x] Tryb `conditional` — bonusy zależne od strefy zasięgu / braku celownika / toggle, liczone w hooku roll-time
- [x] Tryb `activity` — ulepszenia tworzące własną aktywność (bagnet, granatnik, śrutówka) przez `item.createActivity`; oznaczone `flags.managedActivity`+`addonActivity`; `damage.includeBase:false`, `range.override:true`
- [x] Szyna montażowa (SM) — sloty (max 3), walidacja kompatybilności, `countSMSlots`
- [x] Toggle setup (Kolba składana, laser, dwójnóg) — `flags.setup`, przyciski na arkuszu + checkbox w dialogu ataku
- [x] UI: context menu „Zainstaluj na broni" na loot, panel ulepszeń na arkuszu broni, piny w chat cardzie
- [x] Integracja z jams (`zestaw-sprezyn`), degradacją (`utwardzenie` = odporność na uszkodzenie), trybami ognia (`chwyt-przedni`+1, `trojnog`+2, `ruchome-gniazdo`)
- [x] Dozownik (`dozownik.mjs`) — zasób dawek, klucz `clearDose`/`initDose`
- [x] **Naostrzenie (RAW)**: +1 TA / +1 obrażeń „do czasu uszkodzenia broni" — przy degradacji broni Naostrzenie jest **trwale niszczone** (`removeAddon(..., {refund:false})`), nie wraca po naprawie; gracz musi kupić nowe. Usunięto błędny system „blunted/stępione"
- [x] Walidacja live (FVTT 14.361 / dnd5e 5.3): wszystkie 5 klas ulepszeń install/roll/remove odwracalnie; testy awaryjne (głęboka kaskada, podwójne usunięcie, duplikat) nie rzucają wyjątków

---

## Phase 2: Full Equipment Layer
- [x] **Sequencer: Spatial Audio** — pozycjonowanie dźwięku z tokena, zanikanie z odległością, stereo pan, muffling przez ściany — żywe dla P/KS/DS/MS/OZ oraz trafienia (patrz §1.19 Phase 2)
- [~] Weapon properties (cicha, ppanc, Wmag, etc.) — zdefiniowane + filtrowane per typ + tooltipy; egzekwowanie mechaniczne częściowe. Porażająca/Powalająca/Unieruchamiająca egzekwowane (`weapon-save-properties.mjs`, live-verified). Reszta: patrz `PLAN_weapon_properties.md`
- [x] Właściwość "Obalająca" (skrypt wymuszający rzut obronny na celach, sprawdzenie rozmiaru celów)
- [x] Weapon attachments/upgrades — patrz §1.18 Ulepszenia Broni (`addons.mjs`, live-verified)
- [ ] Armor handling (lekki/średni/ciężki + powered armor)
- [ ] Armor durability (opcjonalnie)
- [ ] Carry thresholds (SIŁ×5 / SIŁ×10 kg)
- [ ] Przedmioty podręczne (3 sloty)
- [ ] Surowce (5 typów: CH, CE, CZ, MK, MO)
- [ ] Medical items, Fanty, consumables
- [ ] Gambling/barter UI (k100, location mods, regional prices)
- [ ] Object destruction (TT/PW by material/size)
- [ ] Broń improwizowana

## Phase 3: Progression Layer
Szczegółowy plan: `PLAN_classes.md`
- [x] 6 klas z progression tables — `config/classes-data.mjs`, pack `neuroshima.klasy` (165 advancementów)
- [x] Professions (subklasy) — 18 profesji, pack `neuroshima.profesje`
- [x] 133 zdolności klasowych/profesji — pack `neuroshima.zdolnosci-klasowe`, tekst dosłownie z podręcznika
- [x] PW wg Neuroshimy (16+KON / 4+KON, 12+KON / 3+KON) — `actors/pw.mjs`; natywny `HitPoints` advancement tego nie wyraża
- [x] Zdolności stanowe (Berserk, Kondycha) — `actors/class-state.mjs`, AE + czas trwania + warunki przerwania
- [x] Pasek skrótów zdolności — `actors/ability-hotbar.mjs`, auto-makra + licznik ładunków + grafika stanu aktywnego
- [x] Odnawianie na odpoczynkach — **bez własnego kodu**, natywne `uses.recovery` (`sr`/`lr`) działa na przedefiniowanych 4h/24h
- [x] Multiclass rules (nie kumulują się: TT bez pancerza, Drugi atak) — `actors/class-rules.mjs`
- [x] XP panel + personal PD tracking — `actors/pd-panel.mjs` (progi 0…3400, auto-PD za Stopień Zranienia)
- [x] Migracja 22 istniejących postaci — `migration/migrate-classes.mjs` (11 rozpoznanych, homebrew zachowany)
- [x] Usunięcie pozostałości SRD — `config/srd-cleanup.mjs` (klasy/zaklęcia/rasy ukryte i zablokowane)
- [ ] Sztuczki (feat-like items) — pack `neuroshima.sztuczki` utworzony **pusty**, ItemChoice już podpięte
- [ ] 12 Pochodzeń (origins) z bonusami cech
- [x] **Cichy krok** (Zwiadowca poz. 3, `actors/cichy-krok.mjs`, 2026-08-21) — pierwsza z 133 zdolności
  klasowych/profesji, która dostała mechanikę zamiast samego tekstu. Trzy klauzule:
  - Trudny teren nie spowalnia ruchu — Active Effect (`ADD "all"` na natywnym
    `movement.ignoredDifficultTerrain`), sync przy `createItem`/`deleteItem`/`advancementManagerComplete`
    + backfill na `ready` (ten sam wzorzec co `zranienie.mjs`)
  - Ułatwienie do Skradania bez ciężkiej zbroi — `dnd5e.postBuildSkillRollConfig`, bo dnd5e liczy
    Utrudnienie ze zbroi wprost w `prepareDerivedData` (żadne pole do nadpisania przez AE, jak przy
    Utrudnieniu z ataku w `pack-tactics.mjs`)
  - **Bugfix sąsiedni, nieusunięty**: Utrudnienie ze zbroi w rdzeniu dnd5e ląduje na sztywno pod
    `skills.ste.roll.mode`, a Skradanie się w tym świecie ma klucz `skr` (`config/skills.mjs`) — więc
    ta gałąź rdzenia jest dziś martwym kodem, zbroja nigdy nie daje Utrudnienia do Skradania.
    Zweryfikowane na żywo. Nieszkodliwe (Cichy krok i tak daje Ułatwienie), ale osobny fix na przyszłość
  - Wszystko zweryfikowane live na Alanie (CDP): efekt terenu doszedł backfillem, rzut na `skr` wyszedł
    jako `1d20adv`

### Bestiariusz
Dodane do trackera 2026-08-21 — warstwa była kompletna i zweryfikowana od jakiegoś czasu, ale nie
miała tu własnego miejsca (patrz stary, błędny wpis `[ ] Enemy sheets + bestiary imports` pod
Phase 5, teraz skreślony). Pełny opis pipeline'u: `DEV_GUIDE.md` §11.

- [x] 51 istot jako kompendium `neuroshima.bestiariusz` (6 folderów) — pipeline
  `Podrecznik/Bestiariusz/*.md` (Obsidian, źródło treści) → `dev/bestiary/extract_bestiary.py` →
  `gen_bestiary.py` → `scripts/config/bestiary-data.mjs` → `dev/packs/build-packs.mjs`
- [x] **89 z 261 zdolności zautomatyzowane** — `RULES` (klucz = nazwa zdolności, powtarzalne
  między istotami: Pierwsze spotkanie, Algorytm czuwania, Współpraca, Światłowstręt) +
  `AUTOMATION` (klucz = `"<istota>.<zdolność>"`, przypadki jednostkowe). Reszta: `feat` z samym
  tekstem, czytelne na karcie, nieautomatyczne
- [x] Doktryna MG-w-pętli: `combat/crit-riders.mjs` (Palcożerca) wykrywa i czeka na klik MG;
  `combat/pack-tactics.mjs` (Współpraca) stosuje się automatycznie — czysta geometria, brak decyzji
- [x] `combat/bestiary-thresholds.mjs` — próg obrażeń (dnd5e ma to tylko na pojazdach; broń `ppanc`
  go ignoruje), próg awarii maszyn (krytyk lub ≥próg → `MACHINE_FAILURES` k20), Tchórzliwość
  (podpowiedź dla MG, nie wymusza zachowania)
- [x] `actors/sp.mjs` — SP ≠ PB dla NPC. `npc.mjs:380` rdzenia liczy PB z CR; Koń (Skażony) ma
  PB **+1**, którego 5e w ogóle nie zna. `details.cr` trzyma SP, PB wraca z flagi
- [x] `config/creature-types.mjs` — 5 kategorii Bestiariusza zamiast taksonomii fantasy; też
  źródło koloru krwi dla Splatter (`prototypeToken.flags.splatter.bloodColor`)
- [x] `config/detection-termowizja.mjs` — Termowizja jako prawdziwy DetectionMode na żetonie
  (schemat `senses` w dnd5e jest zamknięty). Widzi przez Niewidoczność, nie przez ściany
- [x] Żetony top-down: 21/51 aliasy na grafikę systemową już w Data (`tokens/aliases.json`,
  licencja Forgotten Adventures zabrania kopiowania plików), 30/51 wygenerowane placeholdery
  (`tokens/_placeholder/`, żółto-czarny pas + kod literowy + trójkąt kierunku), reszta portret w
  pierścieniu. Token art z Roll20 świadomie zignorowany (okrągłe kadry, nie top-down)
- [ ] Docelowa grafika (poziom 1 pipeline'u) dla istot bez aliasu/artu — 30 z 51 wciąż na
  placeholderze, patrz `tokens/README.md`
- [ ] Zombie (nakładka Death Breath) i Mobsprzęt (losowane podwozie/broń) świadomie poza packiem —
  patrz `DEV_GUIDE.md` §11.8

## Phase 4: Long-Term Survival

### 4.1 Choroby i Fobie (`health-panel.mjs`)
- [x] **Panel na zakładce Biografia** — dwa bloki (Choroby / Fobie) nad polem biografii.
  Pusty blok to jedna linia z listą wyboru + `+`; każdy wpis to jeden wiersz ze wszystkimi
  kontrolkami. Obsługuje 0, 1 i wiele wpisów bez zmiany „ciężaru" layoutu
- [x] **Pasek statusu w sidebarze** — pod pikami Zranienia, tylko do odczytu (kontrolki są
  na Biografii, więc pasek wyłącznie raportuje); znika całkowicie, gdy nie ma czego pokazać
- [x] `diseases-data.mjs` — 8 chorób przewlekłych z tabeli k8 + 4 popularne (popromienna,
  szczurza gorączka, zakaźna, Death Breath); tekst stanów dosłownie z podręcznika
- [x] Wybór z listy prefilluje nazwę/lek/stany; **wszystko pozostaje edytowalne**, a wpis
  „własna…" pozwala napisać własną chorobę z własną drabinką stanów
- [x] Choroba z samym „stanem ogólnym" (Hemofilia) nie bierze udziału w RO o zachodzie słońca (RAW str. 109)
- [x] `phobias-data.mjs` — 8 fobii z tabeli k8 (Efekt + Przełamanie), również edytowalne
- [x] **Przełamanie**: przycisk rzuca RO na Mądrość ST 15; sukces = Przełamanie i +1 do serii,
  trzy z rzędu leczą fobię na stałe (wpis znika); porażka zeruje serię i zapala stan „Lęk!"
- [x] Piki serii 0/3 na wierszu fobii + przełącznik „wyzwalacz w zasięgu"
### 4.1a Egzekwowanie stanów chorób (`disease-effects.mjs`)
Mechanika mieszka osobno od tekstu (`diseases-data.mjs` cytuje podręcznik i nie może dryfować;
`config/disease-effects.mjs` koduje decyzje, jak to zdanie przekłada się na dnd5e).
**22 z 24 stanów** ma egzekwowaną część mechaniczną; wszystkie zweryfikowane na żywo.

- [x] **Active Effects, jeden per (wpis choroby, stan)** — realne, widoczne efekty w zakładce
  Efekty, nie ukryta matematyka przy rzucie. Gracz z Utrudnieniem może pokazać palcem powód.
  Moduł jest właścicielem tylko swoich efektów (flaga `diseaseEffect`); ręcznie dodanych nie rusza,
  a ręcznie wyłączonego nie włącza z powrotem
- [x] **Kluczowe odkrycie**: dnd5e 5.3 ma `AdvantageModeField` na `abilities.<x>.check.roll.mode`,
  `.save.roll.mode` i `skills.<id>.roll.mode` (tryb ADD, −1 = Utrudnienie), a rzut umiejętności
  **łączy** tryb cechy z trybem umiejętności (`AdvantageModeField.combineFields`). Dlatego
  „Utrudnienie w Testach Cech opartych na Charyzmie" to **jedna** zmiana, obejmująca też testy
  umiejętności opartych na CHA — zgodnie z tym, jak Neuroshima rozumie „Test Cechy"
- [x] Nadpisania wartości: `int.value` → 6 / 2 (Thurman), `movement.walk` → 0 (OVERRIDE)
  lub ×0.5 (MULTIPLY, Osteoporoza), `senses.darkvision` → 18 (UPGRADE, Draculi)
- [x] Stany i odporności: `prone` (Niewydolność krytyczny), `frightened` (Paranoja krytyczny),
  **odporność** na `frightened` przez `traits.ci` (Thurman krytyczny)
- [x] **Utrudnienie do ataków** — dnd5e nie ma pola `attack.roll.mode`, więc jedzie na
  `dnd5e.postBuildAttackRollConfig` (ten sam hook co bonusy ulepszeń). Zakres per cecha
  („Testach Ataku opartych na Sile" trafia tylko w broń na SIŁ) albo globalny.
  **Uwaga na kolejność**: `BasicRoll.buildConfigure` woła `applyKeybindings` (które rozwiązuje
  `options.disadvantage` w `options.advantageMode`) **przed** `buildConfig`/hookiem — ustawienie
  booleana w hooku jest cichym no-opem. Kod pisze `advantageMode` wprost, a istniejące Ułatwienie
  znosi się do normalnego zamiast być nadpisane, tak jak stackuje to 5e
- [x] **Przełączniki sytuacyjne** — stany warunkowe, których system nie widzi („w świetle dziennym",
  „jako pasażer pojazdu"), dostają chip na wierszu choroby; włączenie tworzy drugi AE, wyłączenie
  go usuwa. Syndrom Draculi ostry/krytyczny dokłada przycisk `1k4`/`1k6` za minutę ekspozycji
- [x] **Szał** (Szaleństwo bostońskie) — przycisk pod nieudanym rzutem, tylko dla MG.
  Zasada domowa MG: **każdy nieudany k20 poza Rzutem Obronnym**. RAW mówi „Testach Cech" przy
  ostrym i „każda porażka" przy krytycznym; dosłowne czytanie tego drugiego odpalałoby prompt
  przy RO, czyli praktycznie co rundę walki. Stan ostry reaguje tylko na testy INT/CHA
  (jak w RAW), krytyczny na wszystko poza RO. ST bywa tylko w głowie MG, więc przycisk pojawia się
  na każdym kwalifikującym się rzucie **poza** tym, o którym wiadomo, że się udał. Nic nie
  rozstrzyga się samo — k100 leci dopiero po kliknięciu
- [x] Backfill przy starcie świata: karty sprzed tej warstwy i zmiany w tabeli efektów
  dojeżdżają same; sync jest no-opem, gdy nic się nie różni
- [ ] Świadomie **poza automatyką** (2 stany bez części mechanicznej + zdania czysto opisowe):
  „atakujesz wszystkich wokół", „jedyną akcją jest Unikanie", „tylko broń improwizowana",
  „nie przejdziesz 3 m w linii prostej". Panel wypisuje je pod stanem jako „Poza automatyką: …",
  żeby było widać, która połowa stanu jest egzekwowana

### 4.1b Krwawienie — Hemofilia (`bleeding.mjs`)
- [x] Wyzwalacz: obrażenia **cięte lub kłute**. Czytane z `dnd5e.calculateDamage`, nie
  `preApplyDamage` — ten drugi dostaje wyłącznie sumę, typy są już wtedy stracone. Dzięki temu
  trafienie mieszane (bagnet + rider) łapie, a czysto obuchowe nie
- [x] Stan `bleeding` na pionku + flaga z serią; RO na Kondycję ST 10 na koniec **swojej** tury
  (hook `updateCombat` patrzy na `combat.previous`, więc RO ląduje tam, gdzie stawia je RAW)
- [x] Porażka = 1k4 obrażeń i zerowanie serii; trzy sukcesy pod rząd kończą krwawienie
- [x] Trzy drogi zatrzymania z RAW: wstrzyknięcie leku (zużywa realną dawkę przez normalną ścieżkę
  Używek), Test Medycyny ST 15 **wymagający narzędzi małego medyka** u leczącego, oraz seria 3 RO

### 4.1c Spadanie [ZAGROŻENIE] (`falling.mjs`)
- [x] dnd5e 5.3 ma tylko **ikonę statusu** `falling` — zero obrażeń od upadku w całym systemie.
  Zaimplementowane wg RAW: 1k6 obuchowych za każde 1,5 m, Powalenie po uderzeniu (chyba że
  obrażenia wyniosły 0), upadek do cieczy = Reakcja + Test Siły (Atletyka) lub Zręczności
  (Akrobatyka) ST 10, sukces znosi obrażenia, porażka je połowi
- [x] **Mnożnik Osteoporozy** (×2 przewlekły/ostry, ×4 krytyczny) czytany z tabeli efektów, nie
  wpisany na sztywno — mnożniki się nie kumulują, wygrywa najgorszy, żeby „poczwórne" zastępowało
  „podwójne" zamiast zbijać się do ×8. Rozliczany po teście na ciecz, więc czyste wejście do wody
  oznacza brak obrażeń, a choroba nie ma czego mnożyć
- [x] Przycisk MG na pasku narzędzi + `game.neuroshima.falling.fall(actor, { metres, intoLiquid })`;
  dialog pokazuje mnożnik z góry, zanim cokolwiek poleci

### 4.2 Lekarstwa i dawkowanie
- [x] `medicine-data.mjs` — 12 lekarstw jako **Używki** (`consumable`, typ `lekarstwo`
  zarejestrowany w `terminology.mjs`), z cenami/dostępnością z tabeli LEKARSTWA (str. 111)
  i aktywnością „Zażyj dawkę" (`itemUses` + `autoDestroy`)
- [x] Kompendium `neuroshima-2026-overrides.lekarstwa` budowane z tego samego pliku
      (`dev/packs/build-packs.mjs`) — jedno źródło prawdy, bez ręcznej edycji packa
- [x] **Przycisk „Weź dawkę"** na wierszu choroby: zużycie idzie przez **natywną ścieżkę
  aktywności przedmiotu**, więc lek zachowuje się tak samo brany z panelu i z listy Używek
  (uses → quantity → autoDestroy). Stary loot bez aktywności (np. „Wapniak (20)") ma fallback
  na dekrementację `quantity` — dzięki temu istniejące karty działają bez migracji ekwipunku
- [x] Rozwiązywanie zapasu: jawny link do przedmiotu → dopasowanie po kluczu leku →
  luźne dopasowanie po nazwie (to ostatnie sprawia, że „Wapniak" trafia w „Wapniak (20)",
  a „Actinix" w „Actinix/Rephidal")
- [x] Brak leku w ekwipunku → dialog „dodać opakowanie?" importujący z kompendium
  (fallback: budowa przedmiotu wprost z `medicine-data.mjs`, gdy pack nie jest zbudowany)
- [x] Karta czatu z narracją — losowa linia per lek („*Góra chrupie kredową tabletkę wapniaka,
  krzywiąc się na smak tynku*"), plus zapas i ostrzeżenie przy ≤1 dawce
- [x] **Zachód słońca** (przycisk MG na pasku narzędzi + `game.neuroshima.health.sunset()`):
  każdy, kto nie wziął dziś dawki, rzuca RO na Kondycję ST 10 — naturalna 20 wraca do stanu
  przewlekłego, naturalna 1 pogarsza o dwa stany, porażka o jeden. Raport zbiorczy szeptem do MG
- [x] „Dzień" to licznik świata (`dayCounter`), **nie** `game.time.worldTime` — przy tym stole
  czas świata nie jest przesuwany, więc oparcie o niego dawałoby ciche fałszywe trafienia

### 4.3 Migracja z pól tekstowych (`migrate-health.mjs`)
- [x] Stan chorób/fobii/Fuksów żył wcześniej w trzech miejscach i trzech formatach:
  biografii (`<h1>CHOROBA: X</h1>`), `system.details.bond` („Zdrowy na X (lek)") oraz
  `.ideal`/`.flaw` („Fuksy: 3", „Zranienie: 2" + ręczny opis choroby)
- [x] 11 postaci zmigrowanych; plan jest **jawną tabelą per aktor**, nie regexem — formaty
  są niespójne, a to są żywe karty BG
- [x] Homebrew zachowany: „Lekarz i Farmaceuta" Raynalda (tabela k20 podmienianych tabletek)
  wylądował w notatkach choroby; „Narkoleptyk"/„Wyczulony" zostawione w polu Słabości,
  bo to nie choroba ani fobia
- [x] Sprzeczność u Góry rozstrzygnięta: pole Więzi mówiło „Zaburzenia błędnika (Actinix)"
  (kopiuj-wklej z Buźki), biografia i realny przedmiot mówiły Osteoporoza/Wapniak — wygrały te drugie
- [x] Reptiliofobia Carsona (spoza tabeli k8) przelosowana → **Pirofobia** (k8 = 6);
  przełamania wyrównane do RAW (1h/8h zamiast rozjechanych 24h)
- [x] Loot udający narzędzia zamieniony na realne przedmioty `tool` z `toolkits-data.mjs`:
  Rusznikarz (Carson), Kowal (Dante), Kucharz (Góra), Medyk (Iris), Ślusarz (Kluczyk)
- [x] Sekcja „BRONIE SPECJALNE" Buźki przeniesiona na opis przedmiotu Koktajl Mołotowa
- [x] `createToolkits(actor, { only })` — nowa opcja, żeby dołożyć pojedynczy zestaw

- [x] ~~Upojenie (4 levels, Kac mechanic)~~ — **stale, duplikat.** Zrobione, patrz §1.5b (4 stopnie,
  kumulatywne, HUD, `game.neuroshima.conditions.drink()`/`soberUp()`). Ten wpis powinien był
  zniknąć przy zamknięciu §1.5b i zamiast tego przeżył jako martwy TODO — znaleziony przy
  porządkach 2026-08-21
- [ ] Environmental hazards (Podpalenie, Głód, Odwodnienie jako pełne mechaniki — dziś same
  stany bez egzekwowania poza tym, co obejmuje `disease-effects.mjs`). **Skażenie wykreślone
  stąd** z tego samego powodu co Upojenie wyżej — zrobione, §1.5b
- [ ] Rest activities (cooking, hunting, gossip, cleaning)
- [ ] Vehicles (actor type + combat + chase system)
- [ ] Crafting system (schematy, produkcja, szabrowanie, bebeszenie)
- [ ] Drones

## Phase 5: Content & Polish
- [~] **Tracer/Muzzle VFX** — muzzle flash + bullet tracer żywe dla P/KS/DS/MS (własny silnik PIXI, patrz §1.21); OZ świadomie bez tracera (poza zakresem), eksplozje na templatach i iskry/krew trafienia wciąż nie zaimplementowane
- [ ] Compendia: broń, amunicja, pancerz, Pochodzenia — klasy/profesje/zdolności-klasowe/sztuczki/lekarstwa/bestiariusz **już zbudowane** (patrz Phase 3 wyżej i podsekcja „Bestiariusz" na końcu Phase 3), ten wpis to tylko pozostałe brakujące kompendia
- [x] **Bestiariusz** — 51 istot, kompendium `neuroshima.bestiariusz`. ~~Enemy sheets + bestiary imports~~
  było tu jako `[ ]` mimo że warstwa jest gotowa i zweryfikowana — patrz podsekcja „Bestiariusz"
  na końcu Phase 3 wyżej (dodana przy porządkach 2026-08-21, bo ta praca nigdy nie dostała
  własnego miejsca w tym trackerze)
- [ ] Color profiles (Stal, Rdza, Rtęć, Chrom)
- [ ] Regional price tables
- [ ] UI polish, tactical HUD
- [ ] **Ikony broni per-typ** (`weapons/icons.js`, `RULES` — słowa kluczowe nazwy → ikona
  rewolwer/pistolet/SMG/karabin/...) — **odkryte osierocone 2026-08-21**: jedyny importer,
  `scripts/main.js`, był martwym duplikatem entry pointu i został usunięty przy porządkach.
  `setupWeaponIcons()` prawdopodobnie nie działał od dłuższego czasu; nikt tego nie zauważył.
  Do decyzji: wpiąć `setupWeaponIcons()` do `scripts/main.mjs` (`ready`), przenieść logikę do
  `config/weapons.mjs`, albo świadomie porzucić i skasować plik

---

## Changelog

### v0.8.0 — Bestiariusz, Cichy krok, porządki repo (2026-08-21)

Skonsolidowana dostawa dwóch tygodni pracy, która nigdy nie dostała changelogu ani bumpa
`module.json` (był zamrożony na 0.2.0 od dawna przed tym wpisem — patrz notatka o porządkach
niżej). Zakres realny, nie w kolejności chronologicznej co do godziny.

- **Bestiariusz** (51 istot, kompendium `neuroshima.bestiariusz`) — pełny pipeline
  `Podrecznik/Bestiariusz/` → `dev/bestiary/` → `bestiary-data.mjs` → pack. 89/261 zdolności
  zautomatyzowane, doktryna MG-w-pętli (`crit-riders.mjs` czeka na klik, `pack-tactics.mjs`
  stosuje się sam). Nowe statystyki, których dnd5e nie ma: SP≠PB (`sp.mjs`), próg
  obrażeń/awarii maszyn (`bestiary-thresholds.mjs`), 5 kategorii typów istot
  (`creature-types.mjs`), Termowizja jako `DetectionMode` (`detection-termowizja.mjs`).
  Żetony top-down: 21/51 alias, 30/51 placeholder. Szczegóły: nowa podsekcja „Bestiariusz"
  pod Phase 3 w tym pliku, oraz `DEV_GUIDE.md` §11.
- **Cichy krok** (`actors/cichy-krok.mjs`, Zwiadowca poz. 3) — pierwsza z 133 zdolności
  klasowych/profesji z realną mechaniką zamiast samego tekstu. Patrz Phase 3 wyżej.
- **Porządki repo (2026-08-21)**: 314 zmienionych plików (299 nigdy niezacommitowanych — cały
  ten wpis siedział tylko w working tree) rozdzielone na commity per warstwa. Naprawione przy
  okazji: zduplikowane nagłówki §8/§9 w `DEV_GUIDE.md`, martwy `scripts/main.js` (duplikat
  entry pointu — jedyny prawdziwy jest `scripts/main.mjs` z `module.json`), dwa martwe stany w
  tym pliku (Upojenie i Skażenie oznaczone `[ ]` mimo że gotowe od §1.5b), stary wpis
  „Enemy sheets + bestiary imports" `[ ]` mimo gotowej warstwy Bestiariusza, opis
  nigdy-nieprzyjętego build pipeline'u (Vite/TS/ESLint) w `DEV_GUIDE.md` §4/§6 zastąpiony
  opisem realnego stanu (NO BUILD). `module.json` `version` doszlusowany do tego wpisu.

### v0.7.1 — Egzekwowanie stanów chorób, Krwawienie, Spadanie (2026-08-02)

Domknięcie luki z v0.7.0 („stany chorób nie nakładają efektów"). **22 z 24 stanów** ma teraz
egzekwowaną część mechaniczną; reszta jest jawnie oznaczona na karcie jako „Poza automatyką".

- **`disease-effects.mjs`** (dane + egzekwowanie): mechanika trzymana osobno od cytatu
  z podręcznika, bo to osobna klasa decyzji. Active Effects są **widoczne** w zakładce Efekty —
  gracz z Utrudnieniem ma gdzie pokazać powód. Moduł rusza wyłącznie własne efekty.
- **Odkrycie, które zdecydowało o kształcie tabeli**: rzut umiejętności w dnd5e 5.3 łączy
  `abilities.<x>.check.roll.mode` z `skills.<id>.roll.mode`, więc „Utrudnienie w Testach Cech
  opartych na Charyzmie" to jedna zmiana obejmująca też testy CHA-umiejętności — dokładnie tak,
  jak Neuroshima rozumie „Test Cechy".
- **Ataki**: `postBuildAttackRollConfig` z zakresem per cecha. Pułapka kolejności: `applyKeybindings`
  rozwiązuje `options.disadvantage` **przed** hookiem, więc ustawianie booleana jest no-opem —
  kod pisze `advantageMode`, a Ułatwienie znosi się do normalnego zamiast zniknąć.
- **Przełączniki sytuacyjne**: „w świetle dziennym" / „jako pasażer pojazdu" jako chip na wierszu
  choroby; Draculi dokłada przycisk ekspozycji 1k4/1k6 na minutę.
- **Szał**: przycisk pod nieudanym rzutem, GM-only, k100 dopiero po kliknięciu. Zasada domowa —
  każdy nieudany k20 poza RO (dosłowne „każda porażka" z krytycznego odpalałoby prompt co rundę).
- **Krwawienie (Hemofilia)**: pełna pętla — wyzwalacz na obrażeniach ciętych/kłutych czytany
  z `dnd5e.calculateDamage` (`preApplyDamage` dostaje już tylko sumę, bez typów), RO ST 10 na koniec
  swojej tury, 1k4 przy porażce, i trzy drogi wyjścia z RAW: lek, Medycyna ST 15 z narzędziami
  małego medyka, albo trzy zdane RO pod rząd.
- **Spadanie**: dnd5e ma tylko ikonę statusu `falling` i zero mechaniki, więc zagrożenie
  zaimplementowane wg RAW (1k6 za 1,5 m, Powalenie, Reakcja Atletyka/Akrobatyka ST 10 przy upadku
  do cieczy). Mnożnik Osteoporozy ×2/×4 czytany z tabeli efektów; mnożniki nie kumulują się.
- **Walidacja live**: wszystkie 22 stany przebadane na aktorze testowym (wartości cech, Szybkość,
  widzenie w ciemności, stany, odporności, tryby rzutów), 6 scenariuszy Utrudnienia do ataków,
  7 przypadków bramkowania Szału, pełna pętla krwawienia z dwiema drogami zatrzymania,
  ×1/×2/×4 dla Spadania. Zero błędów w konsoli; aktor testowy i 39 wiadomości posprzątane.

### v0.7.0 — Choroby, Fobie, Lekarstwa, Fuks na karcie (2026-08-01)

- **Choroby i Fobie** (`health-panel.mjs`, `diseases-data.mjs`, `phobias-data.mjs`): panel na
  zakładce Biografia + pasek statusu w sidebarze. Postać może mieć dowolnie wiele chorób i fobii;
  pusty blok kosztuje jedną linię, każdy wpis jeden wiersz, kontrolki nie powtarzają się per wpis.
  Wybór z tabeli k8 prefilluje tekst RAW, ale każde pole zostaje edytowalne, a wpis „własna…"
  pozwala napisać schorzenie od zera (z własną drabinką stanów).
- **Lekarstwa jako Używki** (`medicine-data.mjs`, kompendium `lekarstwa`): 12 leków jako
  `consumable` z aktywnością „Zażyj dawkę". Przycisk na karcie zużywa dawkę **natywną ścieżką
  aktywności**, więc lek działa identycznie z panelu i z listy Używek. Stary loot (`Wapniak (20)`)
  nadal działa dzięki fallbackowi na `quantity` — nie było potrzeby migrować ekwipunku.
  Karta czatu opisuje, jak postać *widocznie* bierze leki (losowa linia per lek).
- **Zachód słońca**: przycisk MG wykonuje RO na Kondycję ST 10 dla każdego, kto nie wziął dawki
  (nat 20 → powrót do przewlekłego, nat 1 → dwa stany w dół) i przesuwa licznik dnia.
  Świadomie oparte o własny licznik, nie o `game.time.worldTime` — czas świata przy tym stole stoi.
- **Fuks** (`fuks-pips.mjs`): natywna gwiazdka Inspiration w nagłówku była binarna i nie była
  podpięta pod nic — realny zasób 0–3 od zawsze żył w `flags.<mod>.fuksy` i tam sięgał przycisk
  przerzutu. Gwiazdka usunięta, w jej miejsce trzy klikalne koniczyny zgodne z RAW.
- **Migracja 11 postaci** (`migrate-health.mjs`): choroby/fobie/Fuksy/Zranienie ściągnięte
  z pól `biography` / `bond` / `ideal` / `flaw` do flag. Plan to jawna tabela per aktor, nie regex.
  Reptiliofobia Carsona (spoza tabeli) przelosowana na Pirofobię (k8 = 6), przełamania wyrównane
  do RAW. Pięć zestawów narzędzi udających loot zamienionych na realne przedmioty `tool`.
  Homebrew (tabela k20 „Lekarz i Farmaceuta" Raynalda) zachowany w notatkach choroby.
### v0.6.0 — Warstwa Klas: 6 klas, 18 profesji, 133 zdolności, kompendia, pasek skrótów (2026-07-31)
Plan: `PLAN_classes.md`. Zastępuje w całości klasy dnd5e (nie ma klerykа).

- **Ekstrakcja z podręcznika** (`dev/classes/`): 76 zdolności klasowych + 61 z profesji wyciągniętych
  z `Podrecznik/source.txt` wraz z tagami akcji `[A]/[B]/[R]`, odmyślnikowane, zweryfikowane
  względem listy nazw (0 niedopasowań). Pipeline jest odtwarzalny: `npm run build:classes`.
- **⚠ `Tabele/Klasy.md` zawierał realne błędy mechaniczne** — poprawione w repozytorium vaulta:
  kolumna *Berserki* Brutala (było 1,1,2… zamiast 2,2,2,3,3,3,4,4,4,5,5,5), *Mój wróg* i *Mój biom*
  Zwiadowcy, poziomy profesji Twardziela (3/**7**/11, nie 3/6/11), pula umiejętności Cwaniaka (4 z **8**),
  lista *Wyjadacza* Zwiadowcy. Dodatkowo **9 zdolności** oznaczonych `(?)`/`—` faktycznie istnieje
  (Szósty zmysł, Brutalny cios, Szaleńcza szarża, Solówa, Paranoja, Zabójczy cios, Sportowiec,
  Wyczulone zmysły, Pogoń). Źródłem prawdy jest teraz `config/classes-data.mjs`.
  Znany błąd podręcznika: **Samouk** ma nagłówek „POZIOM 7", tabela podaje 9 — przyjęto 9.
- **Kompendia** (`dev/packs/build-packs.mjs`, `classic-level` z instalacji Foundry, bez `npm install`):
  `klasy` (6), `profesje` (18), `zdolnosci-klasowe` (133), `sztuczki` (pusty, ale podpięty).
  Deterministyczne ID z hasha slugu, więc przebudowa nie psuje UUID-ów w advancementach.
  ⚠ Przebudowa wymaga **zamkniętego Foundry** (LevelDB trzyma blokadę) — skrypt to wykrywa i podpowiada.
- **`pw.mjs`**: PW liczone płasko per poziom. dnd5e `HitPoints` advancement jest przywiązany do
  średniej z kości (k8→5), więc **nie potrafi** dać 16 na 1. poziomie. Wieloklasowość: pierwsza klasa
  postaci wnosi wartość „poz. 1", pozostałe poziomy swoją wartość „kolejne". Zweryfikowane 1→12.
- **`class-state.mjs`**: Berserk jako realny przełącznik — zużywa użycie, nakłada AE na 10 rund,
  przerywa się na Nieprzytomności/Obezwładnieniu/Zauroczeniu, ogłasza „brak akcji w następnej turze".
  *Obłęd Berserkera* zeruje swoją premię do TT gdy postać założy pancerz, zamiast znikać.
- **`ability-hotbar.mjs`**: makra tworzone/usuwane automatycznie wraz z poziomami; na slocie rysowany
  licznik ładunków (`●●○○`, wyszarzenie przy 0) i podmiana grafiki + pulsująca ramka przy aktywnym stanie.
  **Bugfix**: `createEmbeddedDocuments` odpala `createItem` raz na dokument — równoległe synchronizacje
  tworzyły duplikaty makr (5× na zdolność). Naprawione debounce + szeregowanie per aktor + reuse istniejącego makra.
- **Odpoczynki**: potwierdzone empirycznie, że **nie trzeba własnego kodu** — `rest.mjs` zmienia tylko
  czas trwania, więc natywne `uses.recovery {period:"lr"}` odnawia Berserki po Długim, a nie po Krótkim.
- **`migrate-classes.mjs`**: 11 z 22 postaci rozpoznanych i zmigrowanych (klasa + profesja + zdolności
  z kompendium). **Zdolności niepasujące NIE są usuwane** — świat zawiera dużo homebrew
  (`Urodzony Morderca`, `Młynek`, `Telepata`, `Fart`, `Patriota`), które ma realną historię gry.
  Cztery pod-zdolności Berserka scalane w jeden przedmiot. Pozostałe 8 postaci nie ma żadnych
  rozpoznawalnych zdolności — raport wskazuje je MG do ręcznego przypisania.
- **`srd-cleanup.mjs`**: kompendia klas/zaklęć/ras/pochodzeń D&D ukryte i zablokowane (przełącznik w
  ustawieniach świata). Bestiariusze i ekwipunek zostają jako materiał źródłowy. Ukryty natywny pasek XP
  i slot „Add Species". **Wsparcie potworów nietknięte** — BN-i używają `feat`, mogą teraz odwoływać się
  do prawdziwych zdolności z kompendium.
- **`pd-panel.mjs`**: progi PD 0…3400 (poz. 1–12), osobiste kategorie (Pierwsze Spotkanie / Nowy obszar
  z notatką, Stopień Zranienia auto-przyznawane w walce), Przechwałki, Nagroda publiczności, PD grupowe MG.
  Pasek postępu do następnego poziomu + log wpisów z możliwością cofnięcia.
- **`abilities.mjs`**: prototypowa warstwa flag dostaje nowe, najwyższe źródło — realny przedmiot
  zdolności klasowej (`source: "feature"`). `fire-modes.mjs` / `jams.mjs` / `magazine.mjs` bez zmian.
- **Assety**: 159 zastępczych SVG (`dev/icons/gen_class_placeholders.mjs`), kolorowane per klasa,
  z wariantami `_active` dla zdolności przełączanych. Podmiana po nazwie pliku, bez zmian w kodzie.

### v0.5.0 — Tracer VFX Engine, Sound Banks, Sequencer Audio/Scrolling-Text (2026-07-29)
- **`sequencer.mjs`**: Sequencer jako soft dependency w pełni działa dla audio (`seqPlayAudio`, globalne + pozycyjne z `SOUND_RADIUS`/`distanceEasing`/`panSound`/`muffledEffect`), scrolling text (`seqScrollText` — ZACIĘCIE/PUSTE/ZAŁADOWANO/ZRANIONY/KRYTYCZNE ZRANIENIE/WYCZERPANIE/FUKS, plus tekst stabilizacji w `toolkit-medyk.mjs`) i nowe pętle audio (`seqStartLoop`/`seqStopLoop`, poza pierwotnym planem) dla silnika (`engine.mjs`, `spalinowa`). Legacy socket fallback (`sounds.mjs`) **celowo** zachowany, nie usunięty.
- **Pozycyjność serii (2026-07-29)**: KS/DS/MS/OZ w `fire-modes.mjs` przełączone z `playWeaponSound(WeaponSound.BURST_*)` na `playBurstSound(liveItem, mode, { caliberId, token })` — serie ogniowe grają się teraz pozycyjnie z tokena strzelca i rozwiązują bank audio, tak samo jak strzał pojedynczy.
- **`tracer-vfx.mjs`** (nowy, 916 linii): zastępuje pierwotny plan Sequencer `.effect()` + webm/JB2A z `PLAN_shooting_vfx.md` (nie skalował się do Minigunu) własnym silnikiem PIXI z wypiekanymi teksturami smug/błysków lufy, per-caliber/per-broń wariantami (`caliber-vfx.mjs` × 14, `weapon-vfx.mjs` × 5 broni sygnaturowych), pulą obiektów i licznikiem FPS. `tracerFire()` (pojedynczy cel) jest **żywe w produkcji** dla strzału pojedynczego (`magazine.mjs`) i KS (`fire-modes.mjs`). **(2026-07-29)** `tracerFireArea()` (linia/szablon) podłączone do DS/MS przez nowy helper `_playAreaBurstVfx()` — serie obszarowe mają teraz tracer na stole (zawsze pełny impakt na próbkowanych punktach, bez per-tokenowego trafienie/pudło — RAW: każdy nabój serii ląduje gdzieś w szablonie). OZ świadomie bez tracera (poza zakresem §2 planu). Impact spark/blood + błysk tokena z pierwotnego planu **porzucone** (nie tylko odłożone) — trafienie ma dziś wyłącznie warstwę dźwiękową. Screen shake dla serii **nie zaimplementowany**.
- **`sound-banks.mjs`** (nowy, 637 linii) + `sound-bank-manifest.mjs`: redakcyjne mapowanie kaliber/broń → bank → slot → losowy take, w tym syntezowane banki serii (`smg-synth`/`ar-synth`/`fnfal-synth`) tam, gdzie nie istniało nagranie. **Żywe dla wszystkich trybów ognia** (P/KS/DS/MS/OZ) po podłączeniu `playBurstSound()` do `fire-modes.mjs` (patrz wyżej). Dźwięki trafienia serią pozostają nieosiągalne strukturalnie (obrażenia serii idą przez `Activity.rollDamage` + ręczny Apply Damage, z pominięciem `ammo.mjs`, jedynego miejsca, które zna kaliber+broń w momencie trafienia).
- **Panele debug** (`tracer-debug-panel.mjs`, `sound-debug-panel.mjs`): rejestrowane w hooku `init`, przyciski na pasku scenoombardowym widoczne tylko dla GM. Tracer panel: 22 suwaki/kolory tuningu, testowe salwy wszystkich 6 trybów (w tym obszarowych — jedyny sposób na przetestowanie DS/MS/OZ), eksport configu. Sound panel: 3 zakładki (BANKI/KALIBRY/NIEZNANE), audyt rzeczywistego rozwiązania kaliber→bank.
- **Nowe assety audio**: dziesiątki nowych `.wav` (firearms/melee/energy/weapon-adjacent) + `dev/audio/*` (build_sound_banks.ps1, build_synth_bursts.ps1, build_audition_set.ps1, process_f2_caliber_sfx.ps1) do budowy/przetwarzania/odsłuchu banków.
- **Poza zakresem tego commita, ale dodane przy okazji**: `surowce-inventory.mjs`, `tool-availability.mjs`, `tool-proficiency.mjs`, `toolkits-data.mjs`, `toolkit-check.mjs`, `toolkit-medyk.mjs` — szkielet warstwy narzędzi/surowców (`PLAN_tool_proficiency.md`, `PLAN_toolkits.md`), nie broń — nieopisane szczegółowo tutaj.

### v0.4.1 — Cechy „RO przy trafieniu": Porażająca/Powalająca/Unieruchamiająca (2026-06-18)
- **weapon-save-properties.mjs** (nowy): generyczny system trzech cech broni wymuszających Rzut Obronny i stan przy trafieniu, uogólnienie wzorca `obalajaca.mjs`. Jeden słownik `SAVE_PROPERTIES` + jeden hook wstrzykujący przycisk (`renderChatMessageHTML`) + jeden handler kliknięcia (`renderChatLog`).
  - **Porażająca** → RO Kondycja (`con`) ST 10 albo Powalenie (`prone`); każdy rozmiar.
  - **Powalająca** → RO Siła (`str`) ST `8+SIŁ+PB` napastnika albo Powalenie; cel ≤ Duży (poza zakresem dialog potwierdzenia MG).
  - **Unieruchamiająca** → RO Zręczność (`dex`) ST `8+SIŁ+PB` albo Unieruchomienie (`restrained`); cel Średni/Duży.
- **Odporności na stany**: `_isImmuneToCondition` czyta `system.traits.ci.value`; cel odporny nie wykonuje RO i otrzymuje komunikat o odporności (zgodnie z dnd5e `prepareResistImmune`, które i tak usuwa stan odporny).
- **ST**: `target` (nie `targetValue`) — zweryfikowany klucz dnd5e 5.3 `rollSavingThrow`. Czyta właściwość z broni i z amunicji.
- **Walidacja live** (Foundry 14.361 / dnd5e 5.3): wszystkie 3 cechy — ścieżka zdanego i oblanego RO (np. con 9<10→prone, str 2<9→prone, dex 5<9→restrained), poprawne ST i cecha. Odporność: stworzono testowego NPC (ci = prone+restrained) — RO pominięty, raport odporności, brak stanu. Testowy aktor/token i spam czatu posprzątane.

### v0.4.0 — System Ulepszeń Broni + Naostrzenie RAW (2026-06-18)
- **addons.mjs / addons-inventory.mjs / addons-data.mjs** (nowe): pełny system Ulepszeń Broni. Ulepszenie = loot item z flagą `ulepszenie:ID`; instalacja zużywa przedmiot, deinstalacja zwraca. Cztery tryby: `direct` (statyczne bonusy), `property` (właściwości broni), `conditional` (bonusy zależne od kontekstu rzutu), `activity` (bagnet/granatnik/śrutówka jako osobna aktywność).
- **System delta**: każda zmiana zapisana jako odwracalny delta (`_computeDelta`/`_applyDelta`/`_reverseDelta`); rollback przy błędzie instalacji; kaskadowe usuwanie zależnych ulepszeń.
- **Attack-bonus fix**: dnd5e 5.3 nie ma pola `system.attack.bonus` na broni — statyczne +TA wstrzykiwane w hooku `dnd5e.postBuildAttackRollConfig` do `config.parts` (zamiast zapisu na broni). Bonusy warunkowe liczone tym samym hookiem.
- **Szyna montażowa (SM)**: sloty (max 3), walidacja kompatybilności; toggle setup (Kolba składana, laser, dwójnóg) przez `flags.setup` + checkbox w dialogu ataku.
- **Naostrzenie wg RAW**: bonus „+1 TA i obrażeń, do czasu uszkodzenia broni" — przy degradacji broni (`degradeWeapon`) Naostrzenie jest **trwale niszczone** przez `removeAddon(item,"naostrzenie",{refund:false})`: cofnięty efekt, usunięty wpis, bez zwrotu przedmiotu. `repairWeapon` przywraca tylko kość obrażeń, NIE Naostrzenie. Usunięto wcześniejszy, niezgodny z RAW mechanizm „blunted/stępione" (funkcje `bluntAddon`/`unbluntAddon`/`removeAddonEffects`, klasa CSS `--blunted`, martwe referencje).
- **Walidacja live**: install → +1 dmg / +1 TA; degrade → kość spada, Naostrzenie znika, brak zwrotu lootu; repair → kość wraca, Naostrzenie pozostaje usunięte. Brak błędów w konsoli.
- **PLAN_weapon_properties.md** (nowy): inwentaryzacja egzekwowania właściwości broni (zrobione / do zrobienia / poza zakresem).

### v0.1.0 — Phase 1 Foundation (2026-04-26)
- **CONFIG overrides**: 18 skilli, 22 narzędzia, 11 typów obrażeń, polskie cechy
- **Spellcasting**: wyzerowane spell schools/levels/preparation modes
- **Terminology**: TT, PW, KW, Gamble, metry, level cap 12
- **Localization**: 553 tłumaczeń w `lang/pl.json` (nested JSON)
  - TYPES (Actor/Item), EFFECT.DND5E (28 statusów), DND5E.* (pełny UI)
  - Registered for both "en" and "pl" languages
  - Async fallback in `localization.mjs` with sentinel verification
- **Direct Polish labels**: all CONFIG entries use literal strings (bypass preLocalize timing issue)

### v0.2.1 — Ammo / Caliber System (2026-05-08)
- **ammo-data.mjs**: 20 kalibru w 5 grupach (Pistoletowa / Karabinowa / Śrutowa / Granatnikowa / Miotana); każdy z formułą, typem obrażeń, właściwościami broni, notatką reguł, ceną, dostępnością
- **magazine.mjs refactor**: pole tekstowe `kaliber:` → grupowany `<select>` z `buildCaliberSelect()`; miotana dodana do warunku wyświetlania wiersza mag; `_getCaliberNote()` wyświetla notatki reguł kalibru; `rawAmmoType` czytany z flagi bezpośrednio (działa też gdy brak `max`)
- **ammo.mjs** (nowy): `registerAmmoSystem()` rejestruje trzy hooki:
  - `updateItem` → sync `system.damage.base.{number,denomination,types}` + `system.properties` przy zmianie kalibru
  - `dnd5e.postRollAttack` → auto-apply obrażeń do trafionych zacelowanych tokenów (tylko w walce)
  - `renderChatMessage` → przycisk „Obrażenia" na wiadomościach rzutu ataku: zielony (auto zadziałał) / czerwony (brak celu — ręczne nałożenie przez GM)
- **main.mjs**: `registerAmmoSystem()` dodane do hooka `init`
- **migrate-weapon-ammo.js** (nowy): regex-based mapowanie nazwy broni → kaliber; używa `number`/`denomination` (dnd5e v5.3 `formula` to computed getter, nie pole); 101 broni skalibrowanych w świecie
- **neuroshima.css**: `.neuro-damage-btn` (zielony / czerwony), `.neuro-auto-damage-msg` i subklasy

### v0.3.0 — Weapon Types & Obalająca (2026-05-10)
- **Kategorie Broni**: Usunięto podziały simple/martial z D&D 5e na rzecz kategorii z Neuroshimy: Broń biała, miotana, palna krótka, palna pośrednia, palna długa, palna ciężka, specjalna. Implementacja dokonana bezpiecznie z pominięciem strict validation uderzających wcześniej w standard UI z DataModelami, wpinając się bezpośrednio w hook `i18nInit`.
- **Właściwości Broni - Obalająca**: Wyodrębniona automatyzacja. Jeżeli broń lub podpięta amunicja posiada opis z frazą "Obalająca", rzut udostępnia interaktywny przycisk na kartach czatu. Przycisk sprawdza rozmiar i dla istot >= Dużych zwraca ostrzeżenie z możliwością wymuszenia RO na Siłę.
- **Skrypty i Migracje**: W module pojawił się skrypt `migrate-weapon-types.js` masowo łatający typ broni u 100+ przedmiotów. Mechanika omija wyjątki środowiska D&D 5e (jak naturalne ataki u mobów).

### v0.1.1 — Phase 1 Combat & Mechanics (2026-04-26)
- **Wyczerpanie**: speed penalty 1.5m/level, rolls -2/level (modern rules), EXHAUSTION_SOURCES enum, full source tracking (flags, dialogs, tooltips, rest integration)
- **Odpoczynki**: KO=4h, DO=24h, polskie etykiety
- **Nokautowanie**: melee bludgeoning attack at 0 PW → attacker chooses: knockout (1 PW + Unconscious) or normal damage, purple styled chat
- **Ostatnia Akcja**: 3 death save failures → prominent red chat announcement with narrative text, persistent notification to player
- **Przerzuty (Forsowanie + Fuks)**: unified reroll bar under d20 results, confirmation dialogs, styled chat messages, Fuks resource tracking (max 3)
- **Spellcasting CSS**: hide Spellbook tab, spell slots, spell DC, pact magic, concentration
- **CSS cleanup**: reduced post-apo filter intensity, removed forced background/color overrides

## Zmiany z 17 maja 2026 - Tłumaczenia UI w DND5e v3
- Naprawiono parser JSON pliku \pl.json\ (usunięto BOM oraz duplikaty/ucięte klamry), co blokowało natywne wczytywanie języków przez Foundry.
- Zaktualizowano klucze lokalizacyjne specyficzne dla nowej architektury ApplicationV2 (np. \DND5E.ItemWeaponType\, \DND5E.WEAPON.FIELDS.ammunition.type.label\).
- Dodano obsługę dymków informacyjnych dla właściwości broni w \scripts/config/weapons.mjs\. Przystosowano skrypt do wstrzykiwania do \<dnd5e-checkbox>\ właściwych dla DND5e v3.

## Zmiany z 17 maja 2026 - System Zapasowych Magazynków
- **magazine-inventory.mjs** (nowy): sekcja „Zapasowe Magazynki" wstrzykiwana ponad sekcją Amunicja; 6 typów (short/medium/long/heavy/quiver/speedloader); kolumny Ilość i Gotowych z ± przyciskami; dialog DODAJ MAGAZYNEK; zawsze widoczna.
- **ammo-inventory.mjs**: filtr `!subtype?.startsWith("magazine-")` — magazynki nie trafiają do sekcji Amunicja; wrapper dostał klasę `neuro-ammo-wrapper` dla precyzyjnego pozycjonowania.
- **main.mjs**: `registerMagazineInventory()` dodane obok `registerAmmoInventory()`.
- **neuroshima.css**: reguły `.neuro-magazine-list` (input borderless, glow, adjustment buttons).
- **Ikony**: `Weapons_Resize_12.png` → 9 ikon (process_grid_12.py); `speedloader.svg` → `icons/magazines/`. Dodano `process_single.py`.
- **PLAN_magazine_system.md** (nowy): architektura, model danych, mapowanie typ broni→magazynek, algorytm przeładowania.

## Zmiany z 17 maja 2026 - Bugfixy Fire Modes
- **fire-modes.mjs**: `_canUseBurstMode` i `_canUseSuppressiveFire` — dodano `|| !item.actor?.inCombat`; ostrzeżenie o serii nie odpala się gdy `game.combat` wskazuje na zakończony dokument.
- **fire-modes.mjs** (DS/MS damage multiplier): root cause = `syncLongBurstActivity`/`syncCrushingBurstActivity` resetowało `damage.parts` i flagi do `DS_THRESHOLDS[0]` przy każdym `updateItem`. Fix: dodano `_burstSelectionCache` (module-level Map) — `use()` zapisuje selekcję in-memory bez DB write; `rollDamage()` czyta z cache i patchuje `this.updateSource()`. Funkcje sync teraz zachowują istniejący `burstBullets/Multiplier` zamiast resetować; `liveItem.update()` (tylko flagi) przywrócone dla cross-session persistence.

## Zmiany z 27 maja 2026 — Stopień Zranienia na karcie BN
- **zranienie.mjs — wsparcie NPC**: dodano hook `renderNPCActorSheet`; piki zranienia wyświetlają się teraz na kartach BN, nie tylko BG.
- **Refaktoryzacja Sheet Display**: logika DOM wydzielona w osobne funkcje:
  - `_buildZranieniRow(actor)` — buduje 4 piki + etykietę (współdzielone BG/BN)
  - `_buildExhaustionSectionLabel()` — etykieta „Wyczerpanie" tylko dla karty BG
  - `_injectIntoCharacterSheet(el, actor)` — wstrzyknięcie w `.stats .lozenges` (BG)
  - `_injectIntoNPCSheet(el, actor)` — wstrzyknięcie w `.sheet-header .left` za `.vitals` (BN); header rozszerza się naturalnie, sidebar przesuwa się w dół
- **Konsolidacja duplikacji**: `applyZranienie` używa `_buildZranieniDescription()` zamiast własnej listy kar.
- **Pozycjonowanie BN**: piki lądują tuż pod paskiem AC+HP w kolumnie portretu, w pustej przestrzeni między portretem a paskiem bocznym.

## Zmiany z 25 maja 2026 - Ikony Aktywności
- **process_grid_13.py** (nowy): przetwarza `Weapons_Resize_13.png` → 9 SVG ikon aktywności.
- **icons/activities/** (nowy folder): `activity_single_fire`, `activity_short_burst`, `activity_long_burst`, `activity_crushing_burst`, `activity_suppressive_fire`, `activity_reload`, `activity_load_one`, `activity_melee`, `activity_throw`.
- **fire-modes.mjs**: dodano `img` do `static metadata` dla KS, DS, OZ, MS; `syncBaseAttackActivityName` ustawia też `img: activity_single_fire.svg`.
- **magazine.mjs**: dodano `img` do `static metadata` dla neuroReload i neuroLoadOne.

## Zmiany z 27 maja 2026 — Dźwięki Eksplozji + Bronie Obszarowe

### Dźwięki (sounds.mjs, ammo.mjs)
- **sounds/firearms/**: pobrano 3 nowe pliki OGG:
  - `explosion_large.ogg` — "BOOMING PUNCHY EXPLOSION" (misosound #251759, CC0, 3s)
  - `explosion_small.ogg` — "Small Explosion" (ryansnook #110115, CC BY-NC 4.0, 1.2s)
  - `shot_grenade.ogg` — "Grenade Launcher M203" (LeMudCrab #163458, CC0, 0.4s)
- **WeaponSound enum**: dodano `SHOT_GRENADE`, `EXPLOSION_LARGE`, `EXPLOSION_SMALL`
- **getShotSoundKey()**: `palnaCiezka + burzaca` → `SHOT_GRENADE` (MGL1S, Thumper)
- **_isRocketLauncher()**: teraz wymaga `type === "palnaCiezka"` — wyklucza Light Fifty (`palnaDluga + ppanc`)
- **_isGrenadeLauncher()**: nowy helper — `palnaCiezka + burzaca`
- **_getExplosionSoundKey()**: nowy helper — failsafe detekcja eksplozji:
  - `palnaCiezka + ppanc` → `EXPLOSION_LARGE` (Bazooka, LAW)
  - `specjalna + burzaca` → `EXPLOSION_LARGE` (Moździerz)
  - `palnaCiezka + burzaca` → `EXPLOSION_SMALL` (MGL1S, Thumper)
- **playExplosionSoundForItem(item)**: nowy eksport — wywołuje `_getExplosionSoundKey` + `playWeaponSound`
- **Root cause bugfix** (`dnd5e.rollDamage` nie działało): strzał z Bazooki/MGL1S jest obsługiwany przez `ammo.mjs` (`_applyDamageFromButton`, `_onPostRollAttackAutoApply`), które robią własny `DamageRoll.evaluate()` z pominięciem `Activity.rollDamage()`. Hook `dnd5e.rollDamage` nigdy nie odpala dla tych broni.
- **ammo.mjs**: import `playExplosionSoundForItem`; wywołanie po `roll.evaluate()` w `_onPostRollAttackAutoApply` i `_applyDamageFromButton`

### Konfiguracja właściwości broni (weapons.mjs)
- `palnaCiezka`: dodano `burzaca` do dozwolonych właściwości (MGL1S, Thumper są burząca)
- `specjalna`: dodano `burzaca` do dozwolonych właściwości (Moździerz jest burząca)

### TESTER — Bronie obszarowe
Dodano dwie bronie testowe do aktora „TESTER - Bez sztuczek":
- **MGL1S** (`id: rE3K8YLyRvAix6Ev`): `palnaCiezka`, `beb/tryb_p/burzaca/przeladowanie`, kaliber `40mm` (6d6 explosive), bębenek 6, szablon `cube 3m`, aktywności: attack + neuroLoadOne
- **Moździerz** (`id: CbSx1PSxkpYf27ti`): `specjalna`, `wmag/tryb_p/ladowanie/ciezka/burzaca`, kaliber `120mm` (10d6 slashing), wmag 1, szablon `cube 9m`, aktywności: attack + neuroLoadOne

## Zmiany z 27-28 maja 2026 — Materiały wybuchowe, chat i stabilizacja arkusza

### Explosives inventory / UX (`grenade-inventory.mjs`, `ammo-data.mjs`)
- Dodano osobną sekcję „Materiały wybuchowe" na karcie aktora; granaty nie są już mieszane z amunicją.
- `GRENADE_TYPES` rozszerzono o miny, ładunki zdalne, pipebomb, Mołotow i granat zapalający.
- Klik na ładunek otwiera flow rzutu: wybór punktu na scenie, pomiar dystansu, oznaczenie obszaru i redukcja ilości.
- Dla sześcianów używany jest `Drawing`, co usuwa wcześniejsze artefakty renderu/cleanup template'ów.
- Miny stawiają uzbrojony marker na scenie zamiast klasycznego template'a wybuchu.

### Chat granatów / Apply Damage (`grenade-inventory.mjs`, `damage-reduction.mjs`)
- Karta czatu po rzucie ładunkiem pokazuje akcje `Rzuć RO na zaznaczonych` oraz `Rzuć obrażenia`.
- `Rzuć RO` wykonuje natychmiastowe rzuty obronne (`configure: false`) dla zaznaczonych lub wycelowanych pionków.
- `Rzuć obrażenia` nie aplikuje już obrażeń ręcznie; tworzy standardowy roll `damage`, dzięki czemu stopień i osłona są ustawiane w natywnym panelu Apply Damage dnd5e.
- Wykorzystano istniejące rozszerzenie `damage-reduction.mjs`, które dodaje materiałową redukcję obrażeń do panelu Apply Damage.

### Dźwięki materiałów wybuchowych (`sounds.mjs`, `dev/audio/*`, `sounds/explosives/*`)
- Dodano dedykowane mapowanie SFX dla subtype `grenade-*`.
- Mołotow i granat zapalający korzystają z tego samego profilu dźwięku ognia.
- Miny dostały krótki dźwięk uzbrajania; C4 i dynamit używają skróconego blastu bez długiego overlay detonatora.
- Pipeline `process_explosive_sfx.ps1` i dokument źródeł FreeSound zaktualizowano o nowe sample.

### Stabilność arkusza (`sheet-position-stability.mjs`)
- Dodano lekki mechanizm blokady pozycji arkusza po klikach +/- w custom inventory.
- Fix eliminuje mikro-przesunięcie karty aktora w dół po aktualizacji ilości podczas rerenderu.
