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
| `scripts/config/conditions.mjs` | Stany — 14 z TABELI STANÓW + 9 zagrożeń + 5 znaczników + 3 stopniowane; usunięcie stanów fantasy |
| `scripts/config/levelled-conditions-data.mjs` | Tabele Upojenia (4 stopnie) i Skażenia (4 poziomy, ST) |
| `scripts/actors/levelled-conditions.mjs` | Egzekwowanie Upojenia/Skażenia + rejestr HUD dla stanów stopniowanych (też Zranienie) |
| `icons/statuses/ASSETS.md` | Specyfikacja ikon dla 2 stanów bez odpowiednika w dnd5e |
| `scripts/config/exhaustion.mjs` | Wyczerpanie (speed penalty override) |
| `scripts/config/rest.mjs` | Odpoczynki (4h KO / 24h DO) |
| `scripts/actors/abilities.mjs` | Most: stare klucze zdolności -> realne przedmioty z packów |
| `scripts/config/diseases-data.mjs` | 8 chorób przewlekłych (k8) + 4 popularne — tekst stanów wg RAW |
| `scripts/config/phobias-data.mjs` | 8 fobii (k8) — Efekt + Przełamanie wg RAW |
| `scripts/config/chemia-data.mjs` | 35 pozycji chemii: leki, narkotyki, używki, materiały pirotechniczne — dane, Active Effects, activities |
| `scripts/items/chemia.mjs` | Egzekwowanie chemii: leczenie, dawki dzienne, szał, efekty odroczone, karty czatu |
| `scripts/config/sztuczki-data.mjs` | 53 Sztuczki + rejestr tego, co system faktycznie automatyzuje |
| `scripts/config/pochodzenia-data.mjs` | 12 Pochodzeń jako `background` (pack `pochodzenia`) + 36 zdolności (pack `zdolnosci-pochodzenia`) + rejestr automatyki |
| `scripts/migration/migrate-pochodzenia.mjs` | Wstawienie Pochodzenia w slot `background` postaci z Roll20 (cofa +1/+1 wliczone ręcznie) |
| `scripts/config/coverage-ledger.mjs` | Wspólna fabryka rejestru automatyki (`status`/`html`/`coverage`/`report`) dla Sztuczek i Pochodzeń |
| `scripts/actors/health-panel.mjs` | Panel Choroby/Fobie (Biografia), pasek w sidebarze, dawki, Przełamanie, Zachód słońca |
| `scripts/config/disease-effects.mjs` | Mechanika stanów chorób — zmiany AE, ataki, sytuacyjne, szał, krwawienie, mnożnik upadku |
| `scripts/actors/disease-effects.mjs` | Egzekwowanie: sync Active Effects, Utrudnienie do ataków, przycisk Szału |
| `scripts/combat/bleeding.mjs` | Krwawienie (Hemofilia) — wyzwalacz, RO na koniec tury, trzy drogi zatrzymania |
| `scripts/combat/falling.mjs` | Spadanie [ZAGROŻENIE] — 1k6/1,5 m, Powalenie, upadek do cieczy, mnożnik Osteoporozy |
| `scripts/actors/fuks-pips.mjs` | Trzy piki Fuksa w nagłówku karty (zastępują gwiazdkę Inspiration) |
| `scripts/migration/migrate-health.mjs` | Migracja Chorób/Fobii/Fuksów z pól tekstowych na flagi |
| `scripts/combat/zranienie.mjs` | Stopień Zranienia (wound levels 0–4) |
| `scripts/combat/rerolls.mjs` | Przerzuty: Forsowanie + Fuks (reroll mechanics) |
| `scripts/combat/knockout.mjs` | Nokautowanie + Ostatnia Akcja |
| `scripts/combat/cover.mjs` | Dynamiczna osłona per atak + redukcja dla strzału przez |
| `scripts/combat/obalajaca.mjs` | Obsługa właściwości broni "Obalająca" i wymuszania RO na Siłę |
| `scripts/combat/weapon-save-properties.mjs` | Cechy "RO przy trafieniu": Porażająca/Powalająca/Unieruchamiająca — przycisk + save + stan, respektuje odporności |
| `scripts/combat/melee-maneuvers.mjs` | Pochwycenie / Odepchnięcie / Wytrącenie — okno manewru, RO celu (SIŁ albo ZRC), stan/ruch/wypuszczenie przedmiotu |
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
| `scripts/weapons/pochodnia.mjs` | Pochodnia (broń improwizowana) — 2 warianty, paliwo %, zapal/zgaś, wypalanie przez zegar świata (`updateWorldTime`), best-effort światło tokena |
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
| `scripts/config/weapons-data.mjs` | 74 bronie z tabel — obrażenia, zasięgi, właściwości, kaliber, magazynek, waga, cena, dostępność. Źródło packa `bron` i `createWeapons()` |
| `scripts/config/armor-data.mjs` | 17 pancerzy z `Pancerz.md` — KP, wymagana SIŁA, próg obrażeń, odporność kinetyczna, szczelność, czas zakładania |
| `scripts/config/armor.mjs` | Override `equipmentTypes`/`armorProficiencies`, czyszczenie `armorIds`/`shieldIds`, trzy własne właściwości ekwipunku |
| `scripts/actors/armor-rules.mjs` | Mechanika pancerzy — próg obrażeń, odporność kinetyczna, kara za brak wyszkolenia, kara Szybkości, Skradanie się, ostrzeżenia o regułach ręcznych |
| `scripts/migration/migrate-weapon-ammo.js` | Migracja istniejących broni → kalibry |
| `scripts/migration/migrate-weapon-types.js` | Migracja istniejących broni → poprawne kategorie Neuroshimy |
| `scripts/actors/surowce-inventory.mjs` | Panel „Surowce" w Ekwipunku — 5 typów (CH/CE/CZ/MK/MO) wyciągnięte z Używek jako osobne pule z paskiem wagi. Żywe, wpięte w `main.mjs`; dopisane do tabeli 2026-08-21, wcześniej brakowało wiersza mimo że kod istniał od dawna |
| `scripts/actors/zbrojownia-sync.mjs` | Narzędzie GM: jeden NPC jako kanoniczna „Zbrojownia" — przycisk w nagłówku karty synchronizuje broń z jego ekwipunku do folderów w World Items |
| `scripts/actors/sheet-shell.mjs` | Powłoka arkusza (§1.15) — podklasy `NeuroshimaCharacterSheet`/`NeuroshimaNPCSheet` (tylko `PARTS`/`TABS`), zakładka Zasoby, panel Stan, skrót ZR/WY. Rejestracja w `ready`, hook renderowania rejestrowany jako ostatni w `main.mjs` |
| `scripts/actors/vehicle-portrait.mjs` | Karta Pojazdu (§1.15a) — przełącznik Portret/Token na żywym DOM stockowego `VehicleActorSheet` dnd5e (brak własnej podklasy Neuroshimy dla pojazdów) |
| `scripts/actors/class-resource-dice.mjs` | Zdolności „raz na rundę, N kości" (Phase 3) — Wściekły cios wdrożony i przetestowany, mechanizm generyczny po `resource`/`oncePerTurn`, reszta rodziny czeka na osobny przebieg |
| `templates/tab-zasoby.hbs` | Pusta skorupa zakładki Zasoby — wypełniana po renderze przez `sheet-shell.mjs` |
| `styles/neuroshima.css` | CSS — post-apo visual + hide spellcasting (1365 linii, sekcje oznaczone `/* === */`, waliduj po edycji: `npm run validate:css`) |

---

**Znaczniki w trackerze:** `[x]` zrobione · `[~]` częściowo (zakres opisany przy wpisie) ·
`[ ]` do zrobienia · `[—]` świadoma decyzja, że tego nie robimy — nie zaległość.

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
- [x] **9 zagrożeń** zachowanych: Krwawienie, Podpalenie, Uduszenie, Niedożywienie, Odwodnienie,
  Spadanie, Choroba, Zaskoczenie, Niespodziewany atak (`ambush` — lustrzane odbicie Zaskoczenia,
  jedyny stan bez odpowiednika w dnd5e). Każde z nich albo jest nazwanym [ZAGROŻENIEM] z
  podręcznika, albo jest już sterowane kodem modułu (`bleeding.mjs`, `falling.mjs`)
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
- [x] Cykl poziomów w HUD pionka: LPM w górę, PPM w dół — ten sam gest co Wyczerpanie. Poziom
  pokazuje nakładka z numerem (`.neuro-condition-level`) w barwie toru; stany, które mają komplet
  ikon z wrysowaną cyfrą (Zranienie, Wyczerpanie), zamiast niej podmieniają tło kontrolki — patrz v0.14.4
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
- [—] Świadomie **poza automatyką** (wyzwalacze czasu i miejsca, per wybór zakresu):
  odliczanie 4 h do kolejnego stopnia Kaca, godzinowy tick skażenia, tagowanie sceny/strefy
  poziomem skażenia. Warstwa daje przyciski i arytmetykę; kiedy je nacisnąć, decyduje MG
- [—] Świadomie poza automatyką (brak pola w dnd5e / czysty opis): „Ułatwienie do RO przeciw
  Przerażeniu" (RO są kluczowane cechą, nie odpieranym stanem), „nie potrafisz przejść 3 m
  w linii prostej". Wypisywane w opisie efektu jako „Poza automatyką: …"
- [x] Ikony: placeholdery `icons/statuses/upojenie.svg` / `skazenie.svg` + pełna specyfikacja
  do podmiany w `icons/statuses/ASSETS.md`
- [x] Wspólna paleta torów (`config/state-colors.mjs`) — jedna tabela zasila pipki, cyfry na
  ikonach żetonu, nakładkę w HUD i akcenty paneli; patrz v0.14.4

### 1.6 Wyczerpanie (Neuroshima rules)
- [x] -2 do każdego testu k20 per level (dnd5e modern rules — `rolls: 2`)
- [x] -1.5m Szybkości per level (`reduction.speed = 1.5`)
- [x] Śmierć przy 6 poziomach (kept from dnd5e)
- [x] EXHAUSTION_SOURCES enum (bezsenność, kac, niedożywienie, odwodnienie, etc.)
- [x] Tracking source type per actor (flags + pip tooltips + add/remove dialogs)
- [x] preUpdateActor blocks raw pip clicks → source selection dialog
- [x] renderCharacterActorSheet hook injects source labels into pip tooltips
- [x] Rest recovery: only clears sources with `restClears: true`
- [x] Własny komplet ikon poziomów (`wyczerpanie-1..6.svg`, niebieska cyfra) przez podmianę
  `conditionTypes.exhaustion.img` — bez nadpisywania `_getExhaustionImage`

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
- [x] Brak automatycznej walidacji wymagań sztuczek / zdolności; warunki zakupu pozostają po stronie MG
- [x] `Grad ołowiu` znosi tylko blokadę `KS -> kolejna KS` w tej samej rundzie
- [x] `Wychuchana spluwa` może być zmieniana tylko poza walką, z komunikatami start/stop i jedną aktywną bronią naraz
- [x] Zdolności wpływające na broń wynikają wyłącznie z przedmiotów na karcie (zdolność klasowa / Sztuczka / zdolność z Pochodzenia). Panel prototypowy z flagami per aktor / per pionek został usunięty — patrz nagłówek `actors/abilities.mjs`
- [x] `Wychuchana spluwa` działa tylko przy posiadanej zdolności; sama flaga na broni nie wystarcza

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
- [x] `Grad ołowiu` zdejmuje limit `1 KS/rundę`; limit ataków w turze pozostaje po stronie gracza / MG, nie karty
- [x] `Szturmowiec` zmienia domyślny rzut `KS` z utrudnienia na normalny; MG może ręcznie nadpisać wybór w dialogu
- [x] Długa seria (DS): 10–30 nabojów, linia, RO ZRC, progi obrażeń — vertical slice
- [x] `Ruchome gniazdo CKM` podwaja koszt amunicji i liczbę kości obrażeń dla `DS`, z osobnym komunikatem wyjątku reguły
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
- [—] Impact spark/blood + błysk tokena (`PLAN_shooting_vfx.md` §3, warstwy "impact"/"token flash") — porzucone, nie tylko odłożone; trafienie ma dziś tylko warstwę dźwiękową
- [x] Panel debug (`tracer-debug-panel.mjs`) — rejestrowany w `init`, przycisk widoczny tylko dla GM (`visible: game.user?.isGM`), testowe salwy wszystkich 6 trybów + eksport configu

### 1.22 Sound Banks (Audiobanki)
- [x] `sound-bank-manifest.mjs` (auto-lista plików) + `sound-banks.mjs` (redakcyjne mapowanie kaliber/broń → bank → slot → losowy take), w tym syntezowane banki serii (`smg-synth`/`ar-synth`/`fnfal-synth`) tam, gdzie nie istniało nagranie
- [x] Żywe dla: pojedynczy strzał, przeładowanie, puste kliknięcie (`magazine.mjs`), trafienie pojedynczym strzałem (`ammo.mjs`)
- [x] **(2026-07-29)** `fire-modes.mjs` KS/DS/MS/OZ przełączone na `playBurstSound()` — banki serii (w tym syntezowane `smg-synth`/`ar-synth`/`fnfal-synth`) rozwiązują się teraz w realnej rozgrywce, nie tylko w panelu debug
- [—] Dźwięki trafienia serią (`impact-burst-*`) nieosiągalne strukturalnie — obrażenia serii idą przez `Activity.rollDamage` + ręczny Apply Damage, z pominięciem ścieżki w `ammo.mjs`, która zna kaliber+broń (udokumentowane w komentarzu `ammo.mjs:178-181`)
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
- [x] Zaskoczenie → Utrudnienie do inicjatywy — **natywny mechanizm dnd5e, zero własnego kodu**.
  `prepareInitiative()` (`data/actor/templates/attributes.mjs`) czyta `hasConditionEffect("initiativeDisadvantage")`,
  a `surprised` jest w tej tablicy od startu. Zweryfikowane na żywo: formuła `1d20 + 0` → `1d20dis + 0`.
  Uwaga: `settings.mjs → applyLegacyRules()` usuwa `surprised` z tej tablicy przy `rulesVersion: "legacy"` —
  świat jedzie na `modern`, więc nie dotyczy
- [x] Niespodziewany atak → Ułatwienie do inicjatywy — nowy stan `ambush` („Niespodziewany atak")
  w `NEUROSHIMA_ZAGROZENIA` + `conditionEffects.initiativeAdvantage`. Nakładany ręcznie z palety
  stanów żetonu, symetrycznie do `surprised` — kto był gotów w chwili wybuchu walki, rozstrzyga MG,
  nie mechanika. Ikona po skasowanym `marked`. Zweryfikowane na żywo: `1d20adv + 0`

### 1.13 Special Melee Actions
- [x] Odepchnięcie, Pochwycenie, Wytrącenie jako opcje ataku (`combat/melee-maneuvers.mjs`)

### 1.14 Rest Overrides
- [x] Krótki odpoczynek = 4h / 240min (nie 1h)
- [x] Długi odpoczynek = 24h / 1440min (nie 8h)
- [x] Polskie etykiety (Krótki/Długi odpoczynek)
- [x] Zakłócenie DO — **notatka referencyjna w oknie odpoczynku (`config/rest.mjs`), nie automatyka**. Było: pole „Przerwany po (godz.)" liczące ≥4h → automatyczne przekierowanie na `actor.shortRest()`. Zamienione na statyczny cytat z reguły (triggery zakłócenia, próg 1 PW do rozpoczęcia, próg 4h do korzyści Krótkiego, wznowienie z +1h za przerwę) — świadoma decyzja: mniej pól nikt nie wypełnia poprawnie, GM i tak woli rozstrzygać to sam. Patrz v0.14.12

### 1.15 Custom Character Sheet Shell
Szczegółowy plan (pre-dig 2026-08-21: sheet class/PARTS/TABS map, wszystkie 15 istniejących
punktów wstrzykiwania w arkusz, decyzja architektoniczna do podjęcia): `PLAN_sheet_shell.md`

Wybrany wariant: **(C) Hybryda** — cienka podklasa `CharacterActorSheet`/`NPCActorSheet`
posiada wyłącznie `PARTS` i `TABS`, całą treść nadal wstrzykują istniejące hooki `render*`.
Rejestracja w `ready`, nie w `init`/`setup` — `DocumentSheetConfig.registerSheet` kolejkuje
wszystko zgłoszone przed `game.ready`, więc `CONFIG.Actor.sheetClasses` jest do tego momentu puste.

- [x] Ukrycie/usunięcie elementów fantasy (spellbook, pact magic, etc.)
  - Zakładka `spells` usunięta z `PARTS`/`TABS` obu arkuszy, `bastion` usunięty z karty postaci
  - Reguły CSS ukrywające sloty/koncentrację przepięte z `.dnd5e2.character` na `.dnd5e2.actor` —
    dotąd wszystkie 69 BN-ów miało w pełni widoczną zakładkę czarów
- [x] Sekcja Zranienie + Wyczerpanie na głównej karcie
  - Panel **Stan** w pasku bocznym (obie karty): Wyczerpanie, Zranienie, Upojenie jako klikalne
    rzędy pipsów, pod nimi rząd Skażenia (przycisk rzutu, nie tor)
  - Poziomy czytane z rejestru levelled-conditions (`getLevelledRegistry()`), więc panel nie wie,
    jak działa którykolwiek tor — ta sama inwersja zależności co HUD tokena
  - Wyczerpanie na pierwszym miejscu, powiększone pipsy, każdy zabarwiony kolorem **źródła** tego
    poziomu (`EXHAUSTION_SOURCES[key].color`); tooltip `Wyczerpanie n/6 — Kac`. Poziomy bez
    zapisanego źródła (ustawione surowo przez MG) dostają neutralny pips
  - Kolumna odczytu `n/max` skasowana z rzędów — pipsy niosą tę informację same, a zwolnione
    miejsce poszło na większe pipsy Wyczerpania
  - Tooltip pipsa wylicza **skumulowany** koszt stania na tym poziomie (tor wypełnia się
    ciągle od lewej, więc pips *n* to zawsze suma 1..*n*): Wyczerpanie liczy z `reduction`,
    Zranienie i Upojenie dostają go od właściciela toru przez `registerHudLevelled({ summary })`
  - Nagłówek `♥ STAN` jako legenda na środku górnej krawędzi ramki (tło przykrywa obramowanie)
  - Aktywne choroby i fobie przeniesione spod pipsów Zranienia na dół panelu, pod przycisk
    Skażenia — kursywa, listwa z lewej, 9 px; sterowanie nadal na zakładce Biografia
  - Natywne pipsy Wyczerpania (dzielone 3+3 wokół odznaki KP) ukryte — panel przejął ten tor
  - Stary wstrzykiwacz rzędu Zranienia w `combat/zranienie.mjs` wycofany (usunięte hooki + 6 funkcji)
- [x] Neuroshima-specific layout
  - Nowa zakładka **Zasoby** (za Ekwipunkiem): amunicja, magazynki, ładunki, surowce przeniesione
    z Ekwipunku po renderze — żaden z czterech wstrzykiwaczy nie wymagał zmiany
  - Ekwipunek jako domyślna zakładka karty postaci, Akcje i cechy dla BN
  - Polskie etykiety zakładek, nagłówek arkusza w stylistyce Neuroshimy

### 1.15a Karta Pojazdu — przełącznik Portret/Token
`scripts/actors/vehicle-portrait.mjs`. Pojazdy **nie** mają podklasy Neuroshimy — to wciąż
gołe `VehicleActorSheet` z dnd5e, więc to jedyne miejsce w module, gdzie łatka idzie na żywy
DOM stockowego arkusza zamiast przez `sheet-shell.mjs`.

- [x] **Zdiagnozowana luka górna**: `CharacterActorSheet`/`NPCActorSheet` wołają wspólny
  `_preparePortrait()` (`base-actor-sheet.mjs`), który daje przełącznik
  `flags.dnd5e.showTokenPortrait` + `<img>` śledzący ścieżkę Portret/Token. `VehicleActorSheet`
  nigdy tej metody nie woła, a `templates/actors/vehicle/sidebar.hbs` ma na sztywno
  `document.img` + `data-edit="img"` — zero przełącznika, zero podglądu/edycji tokena z karty.
  Zweryfikowane w źródle dnd5e (nie w tym module) — to luka stockowa, nie coś, co Neuroshima
  zepsuła
- [x] Backend już działa dla każdego typu aktora bez zmian: `Actor5e#getPreferredArtwork()`
  i akcje arkusza `editImage`/`showArtwork` (rdzeń Foundry, `document-sheet.mjs`) /
  `configurePrototypeToken` (rdzeń dnd5e, `actor-sheet.mjs`) są generyczne — problem był
  wyłącznie w szablonie, którego nie da się nadpisać z poziomu modułu bez kopiowania całego
  pliku systemu
- [x] Hook `renderVehicleActorSheet` dogrywa na żywym DOM to, czego brakuje w szablonie:
  przełącznik (`.slide-toggle`, ta sama klasa co reszta dnd5e — darmowe stylowanie, w tym
  okrągły kadr `.portrait.token`), `<img src>` śledzące flagę, `data-action`/`data-edit`/
  `data-type` przełączane między `img` a `prototypeToken.texture.src` (lub `token.texture.src`
  dla zsynchronizowanego tokena na scenie)
- [x] Przełącznik bez atrybutu `name` — zapis idzie wyłącznie przez jawny `actor.setFlag()`
  w handlerze `change`, żeby nie ścigać się z generycznym submitem formularza arkusza o tę samą
  flagę przy okazji edycji innego pola
- [x] Widoczny tylko gdy `app.isEditable` — usuwany z DOM, gdy odbierze się uprawnienia (np.
  graczowi bez właściciela), tak samo jak stockowy przełącznik na karcie postaci/BN
- [x] Live-verified na GMT400 (jedyny pojazd w świecie): kliknięcie przełącza podpis
  PORTRET ⇄ TOKEN, `<img>` faktycznie zmienia plik (`avatar.png` → `token.png`, różne pliki),
  kadr staje się okrągły, `data-edit` poprawnie wskazuje `prototypeToken.texture.src` w trybie
  token — kliknięcie obrazka otwiera FilePicker na właściwym polu

### 1.16 Level Progression
- [x] Level cap 12
- [x] PD thresholds (50, 150, 300… 3400) — `actors/pd-panel.mjs`, progi 0…3400 dla poz. 1–12.
  **Stał tu jako `[ ]` mimo zamknięcia w v0.6.0**; live: panel pokazuje „poz. 1 · 50 PD do 2"
- [x] Pasywna Percepcja display — natywne dnd5e, wartość pasywna stoi przy każdej Umiejętności
  (18 węzłów `.passive` na karcie). Nic do dopisania

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
- [x] **Armor handling** (lekki/średni/ciężki + wspomagany) — `config/armor-data.mjs` (17 pozycji),
  `config/armor.mjs` (override `CONFIG.DND5E` bez zawężania schematu), `actors/armor-rules.mjs`
  (próg obrażeń, odporność kinetyczna, kara za brak wyszkolenia, kara prędkości za niską SIŁĘ).
  Patrz v0.11.0 w Changelogu
- [—] Armor durability — **decyzja: świadomie poza automatyką**, nie „odłożone". Wytrzymałość
  pancerzy siedzi w polu `manual`, drukuje się w opisie przedmiotu i zbiera przez
  `game.neuroshima.pancerze.report()`
- [ ] Carry thresholds (SIŁ×5 / SIŁ×10 kg)
- [ ] Przedmioty podręczne (3 sloty)
- [x] **Surowce** (5 typów: CH, CE, CZ, MK, MO) — `actors/surowce-inventory.mjs`, panel w Ekwipunku.
  Był tu jako `[ ]` mimo gotowego, wpiętego kodu — znalezione przy porządkach 2026-08-21 (patrz
  wiersz w tabeli plików na górze)
- [x] **Lekarstwa** jako Używki — zrobione, patrz §4.2 (Phase 4). ~~Medical items~~ wykreślone stąd
  z tego samego powodu co Surowce wyżej
- [ ] Fanty, pozostałe consumables poza lekarstwami
- [ ] Gambling/barter UI (k100, location mods, regional prices)
- [ ] Object destruction (TT/PW by material/size)
- [~] **Broń improwizowana** — jeden konkretny przykład zrobiony (Pochodnia, patrz §1.23),
  ogólna zasada „1k4, bez Premii Biegłości, typ wg MG" pozostaje ręczna dla innych przedmiotów

### 1.23 Pochodnia (improvised torch)
- [x] `weapons/pochodnia.mjs` — homebrew zastępujące zepsuty SRD Torch (jego auto-wygenerowana
  aktywność ataku niosła `target.template` typu promień 40 stóp — kompendium modeluje zasięg
  światła jako cel ataku, stąd gigantyczny szablon przy próbie użycia). Zamiast łatać, świeży
  `weapon` item od zera
- [x] RAW **Broń improwizowana**: bez Premii Biegłości (`proficient: 0`), 1k4 obuchowe. Zapalona
  dodaje płaski +1 od ognia (osobna część obrażeń, ten sam wzorzec co „+1 fire" na oryginalnym
  SRD Torch)
- [x] 2 warianty: **Pochodnia Improwizowana** (patyk+szmata, 30 min, 0,6 kg, 0 gb) i
  **Pochodnia Smołowa** (maczana w smole, 1,5 h, 0,4 kg — lżejsza, ma wartość, 8 gb)
- [x] Paliwo jako flaga itemu 0–100% (nie `system.uses` — Pochodnia bywa nieprzypisanym
  przedmiotem świata, bez aktora do trzymania recovery). Zapalenie kosztuje **10% maks. paliwa**
  zawsze, niezależnie od wariantu
- [x] **Nieudane zapalenie**: przy paliwie ≤10% zapalenie nie odpala światła — reszta paliwa
  syczy i gaśnie, item od razu staje się Wypaloną Pochodnią (specjalny komunikat czatu)
- [x] Ręczne zgaszenie (aktywność `special`, bez kosztu akcji w grze) zachowuje niewypalone
  paliwo — oblicza `elapsed / burnSeconds` względem `game.time.worldTime` w chwili zapalenia
- [x] **Wypalanie samoistne przez zegar świata** — paliwo to flaga itemu, nie Active Effect
  (patrz wyżej), więc rdzeniowy `ActiveEffectRegistry` (Foundry v13+, patrz DEV_GUIDE.md §10e)
  nie ma tu czego pilnować niezależnie od tego, że istnieje. `pochodnia.mjs` planuje absolutny
  moment wypalenia (`worldTime`) i zamiata go hookiem `updateWorldTime`, tylko GM
  (`game.user.isActiveGM`) — identyczny kształt co `chemiaPending`/`_onWorldTime` w chemii
- [x] Wypalenie **w miejscu** (ten sam `_id`) — zmienia nazwę/ikonę/opis/obrażenia na
  Wypaloną Pochodnię zamiast usuwać i tworzyć nowy przedmiot; nadal używalna jako pałka (1k4
  obuchowe, bez ognia, bez światła, nie da się ponownie zapalić)
- [x] **Oświetlenie tokena — best effort, nie warstwowe**. Brak natywnego łącza item→token
  light w tej wersji dnd5e (Active Effects dotykają tylko Actor, `prototypeToken` nie
  synchronizuje się z już postawionymi tokenami). `syncTokenLight()` ręcznie nadpisuje
  `token.document.light` najjaśniejszą zapaloną+założoną Pochodnią aktora przy zapaleniu/
  zgaszeniu/zmianie `equipped`/nowym tokenie na scenie. **Nadpisuje, nie sumuje** z innym
  źródłem światła — świadomie bez konfliktu, dopóki to jedyny item ze światłem w module
- [x] Piekarz: istniejący placeholder „Pochodnia" (finezyjna/lekka, bez ognia/światła)
  zaktualizowany w miejscu na Pochodnię Smołową (ten sam `_id`) zamiast zostawiony jako martwy
  duplikat — patrz `game.neuroshima.pochodnia.initialize(item, "smolowa")`
- [x] Ikony `pochodnia_improwizowana.svg` / `pochodnia_smolowa.svg` / `pochodnia_wypalona.svg` —
  `dev/icons/process_grid_29.py` (batch 29, 9 ikon: 3 Pochodnia + 6 zaległości Piekarza,
  patrz niżej). Piekarz przełączony ze stockowego `torch-brown-lit.webp` na docelową ikonę
- [x] `game.neuroshima.pochodnia` API: `.variants`, `.ignite()`, `.extinguish()`, `.burnOut()`,
  `.initialize(item, variantKey)`, `.create(variantKey, {actor})`
- [x] `dev/icons/process_grid_29.py` — 9 ikony z jednego batcha: 3 Pochodnia (`weapons/`) +
  6 zaległości Piekarza (`items/loot/`: `fajka`, `nabicie_tytoniu`, `manierka`,
  `zdjecie_kobiety`, `flaga_usa`, `zetony`). Wszystkie 7 (Pochodnia + 6) podpięte na żywo do
  jego przedmiotów; `Konserwa` (osobny leftover z Roll20) przy okazji podpięta pod już istniejącą,
  wcześniej niewykorzystaną `weapons/canned_food.svg`

## Phase 3: Progression Layer
Szczegółowy plan: `PLAN_classes.md`
- [x] 6 klas z progression tables — `config/classes-data.mjs`, pack `neuroshima.klasy` (165 advancementów)
- [x] Professions (subklasy) — 18 profesji, pack `neuroshima.profesje`
- [x] 133 zdolności klasowych/profesji — pack `neuroshima.zdolnosci-klasowe`, tekst dosłownie z podręcznika
- [x] PW wg Neuroshimy (16+KON / 4+KON, 12+KON / 3+KON) — `actors/pw.mjs`; natywny `HitPoints` advancement tego nie wyraża
- [x] Zdolności stanowe (Berserk, Kondycha) — `actors/class-state.mjs`, AE + czas trwania + warunki przerwania.
  **Berserk vs. stock Rage** (2026-08-28, `PLAN_berserk.md`): AE dobite o Obrażenia Berserkera
  (`bonuses.mwak.damage += @scale.brutal.obrazeniaBerserkera`) i Siłę Berserkera (Ułatwienie
  `str.check`/`str.save`) — tekst zdolności je obiecywał, żadne nie miało automatyki. Świadomie
  **nie** dobite: odporność na obrażenia (Rage ją ma, Berserk w ogóle jej nie obiecuje w tekście —
  to nie luka, to różnica reguł) ani zerwanie stanu przy założeniu ciężkiego pancerza (też nienapisane
  w tekście). Karta czatu na **każde** zejście stanu (ręczne, przerwane, po czasie), nie tylko po
  czasie jak wcześniej — patrz plan po szczegóły stylu. Kara „bez akcji po Berserku" zostaje
  świadomie tylko po naturalnym końcu 10 rund (nie po ręcznym zejściu ani przerwaniu — wyjątek
  jakości życia, nie błąd). Cztery zdolności czytające `requiresState: "neuro-berserk"`
  (Z bara!, Ja i mój gang!, Zew areny, Maszyna do zabijania) zostają bez automatyki bramkowania —
  sprawdzone wprost na źródle dnd5e (`fvtt-dnd5e`, ścieżka Berserkera): nawet oficjalny moduł nie
  bramkuje swoich odpowiedników (Frenzy, Mindless Rage, Retaliation) stanem Rage
- [~] **Zdolności „raz na rundę, N kości"** (Wściekły cios i pokrewne) — `actors/class-resource-dice.mjs`.
  Dane (`resource`/`oncePerTurn` w `class-features-data.mjs`) istniały od dawna dla sześciu zdolności
  (Wściekły cios, Bolesny atak, Słaby punkt, Mutant na śniadanie, Maszyna do zabijania, Mój bóg kule
  nosi), ale nic ich nie czytało — aktywacja paliła jedno użycie i drukowała gołą kartę z tekstem
  zdolności, bez rzutu, bez bramki rundy. Mechanizm napisany generycznie po tych polach, ale
  **przetestowany end-to-end tylko na Wściekłym ciosie** — reszta rodziny ma inne warunki spustu
  (bardziej Sneak Attack niż Rage) i celowo czeka na osobny przebieg
  - Klik zdolności (pasek skrótów lub własny przycisk „Użyj" na karcie) przechwytywany przez
    `dnd5e.preUseActivity` (ten sam punkt co przełączniki stanowe w `class-state.mjs`, z tego samego
    powodu: karta postaci ma drugie wejście do tej samej aktywności, które inaczej cicho paliłoby
    użycie bez żadnego efektu)
  - Zamiast Dialogu — **karta czatu** z rzędem przycisków `1k6…Nk6` (N = pozostałe użycia) i
    selektorem typu obrażeń (domyślnie Obuchowe). Jeden klik = cała decyzja, zero dodatkowego
    potwierdzania — zgodnie z „raz w rundzie" z tekstu zdolności
  - Bramka rundy: flaga na przedmiocie (`combatId`+`round`), aktywna tylko w trakcie walki — poza
    walką nie da się policzyć „rundy", więc świadomie bez blokady (stołowa decyzja, jak Forsowanie)
  - Rzut idzie przez `CONFIG.Dice.DamageRoll` + `roll.toMessage()` (ten sam wzorzec co „Rzuć
    obrażenia" na kartach granatów) — naturalna, natywna karta Apply Damage, moduł nigdy sam nie
    rusza PW celu. Cel = to, co jest aktualnie zaznaczone w `game.user.targets` w chwili kliknięcia
    (to samo założenie, na którym stoi natywny przycisk Apply Damage i już wcześniej wykrywanie trafień
    w `dozownik.mjs`) — nie osobny tracker „ostatniego celu"
  - Sequencer (miękka zależność): `seqScrollText` nad atakującym, `jb2a.impact.009.orange` na celu
    (JB2A zweryfikowany na żywo w bazie Sequencera — klucz istnieje, nie zgadywany)
  - Live-verified na Piekarzu (Brutal 3): karta z 2 z 3 dostępnych kości, klik „2k6" → zużycie
    3/3, poprawny rzut 2k6 Obuchowe, natywny panel Apply Damage z realnym celem, bramka rundy
    potwierdzona (drugi klik w tej samej rundzie walki nie tworzy żadnej nowej wiadomości)
- [x] Pasek skrótów zdolności — `actors/ability-hotbar.mjs`, auto-makra + licznik ładunków + grafika stanu aktywnego
- [x] Odnawianie na odpoczynkach — **bez własnego kodu**, natywne `uses.recovery` (`sr`/`lr`) działa na przedefiniowanych 4h/24h
- [x] Multiclass rules (nie kumulują się: TT bez pancerza, Drugi atak) — `actors/class-rules.mjs`
- [x] XP panel + personal PD tracking — `actors/pd-panel.mjs` (progi 0…3400, auto-PD za Stopień Zranienia)
- [x] Migracja 22 istniejących postaci — `migration/migrate-classes.mjs` (11 rozpoznanych, homebrew zachowany)
- [x] Usunięcie pozostałości SRD — `config/srd-cleanup.mjs` (klasy/zaklęcia/rasy ukryte i zablokowane).
  **Bugfix (2026-08-28)**: to ukrywało tylko wpis w bocznym pasku Compendium Directory — osobny,
  nigdy nie dotknięty mechanizm dnd5e (`dnd5e.packSourceConfiguration`, czyta go Compendium
  Browser przy każdym otwarciu, `CompendiumBrowserSettingsConfig.collateSources()`) wciąż wliczał
  te same pakiety. Złapane na żywo: wybór Profesji (podklasy) dla Victora nadal listował
  wszystkich 12 fantasy klas SRD (Barbarian…Wizard) obok 6 klas Neuroshimy, mimo że
  `hideSrdPacks` jest domyślnie włączone. `hideFromCompendiumBrowser()` dopisuje te same
  `FANTASY_PACKS` do tego drugiego ustawienia. **Uwaga**: `dnd5e.registry.classes` (lista w
  filtrze „KLASA" po lewej) cache'uje się raz na sesję, leniwie, przy pierwszym otwarciu
  przeglądarki — działa poprawnie tylko dla przeglądarek otwartych **po** przeładowaniu klienta,
  które nastąpi po tym ustawieniu (nic do naprawienia, po prostu wymaga F5, tak jak reszta
  zmian w tej sesji)
- [x] Sztuczki (feat-like items) — pack `neuroshima.sztuczki` z **53 pozycjami** (`config/sztuczki-data.mjs`),
  ItemChoice podpięte do puli po obu stronach (klasy i profesje). Mechanikę ma na razie **6/53**
  (3 pełne, 3 częściowe) — reszta to opis + jawny rejestr „tego nie automatyzujemy"
  (`game.neuroshima.sztuczki.report()`)
- [x] 12 Pochodzeń (origins) z bonusami cech — pack `pochodzenia` (12 itemów typu `background`,
  natywny slot dnd5e) i `zdolnosci-pochodzenia` (36 zdolności z `Tabele/Pochodzenie.md`),
  oba z `config/pochodzenia-data.mjs`. Premie +1/+1 nakłada `AbilityScoreImprovement` z `fixed`,
  wybór zdolności — `ItemChoice` z pulą trzech pozycji regionu. Bez własnego kodu.
  Mechanikę ma **1 z 36** (`Wychuchana spluwa`); reszta to opis + rejestr
  (`game.neuroshima.pochodzenia.report()`)
- [x] Migracja Pochodzeń — `migration/migrate-pochodzenia.mjs` (13 postaci: 10 wywnioskowanych
  z ręcznych featów, 3 wylosowane k12; premie wliczone wcześniej ręcznie cofnięte, cechy bez zmian)
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
  - **Bugfix (2026-08-28)**: `_id` na sztywno (`neuroCichyKrok01`) + trzy hooki (`createItem`/`deleteItem`/
    `advancementManagerComplete`) wołające sync bez żadnej serializacji — awans o poziom, który przyznaje
    Cichy krok razem z czymkolwiek innym (złapane live: Victor → poziom 3 → Profesja Partner), tworzy oba
    itemy w jednym `createEmbeddedDocuments`, więc kilka niezależnych, nieawaitowanych wywołań widzi ten sam
    stan „efektu jeszcze nie ma" i więcej niż jedno próbuje go stworzyć — pierwsze wygrywa, reszta rzuca
    nieobsłużony `The _id [...] already exists`. Dane nigdy się nie psuły (Foundry odrzuca duplikat po ID —
    Victor po incydencie miał dokładnie jeden efekt), ale konsola wyglądała jak awaria. Fix: debounce +
    serializacja per aktor, ten sam kształt co `queueHotbarSync`/`scheduleHotbarSync` w `ability-hotbar.mjs`,
    plus try/catch połykający przegraną stronę wyścigu jako no-op zamiast rzucać. Live-verified: ten sam
    ciąg zdarzeń (batch dwóch itemów + dwa `advancementManagerComplete` z rzędu) na świeżym, przeładowanym
    kliencie — jeden efekt, zero błędów, zero unhandled rejections

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
- [—] Zombie (nakładka Death Breath) i Mobsprzęt (losowane podwozie/broń) świadomie poza packiem —
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
- [—] Świadomie **poza automatyką** (2 stany bez części mechanicznej + zdania czysto opisowe):
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
- [x] `chemia-data.mjs` — **35 pozycji** (leki przewlekłe, bojowe, popromienne, narkotyki, używki,
  materiały pirotechniczne) jako **Używki** (`consumable`, typ `lekarstwo`
  zarejestrowany w `terminology.mjs`), z cenami/dostępnością z tabeli LEKARSTWA (str. 111)
  i aktywnością „Zażyj dawkę" (`itemUses` + `autoDestroy`). Zastąpił `medicine-data.mjs` (12 pozycji)
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
  (fallback: budowa przedmiotu wprost z `chemia-data.mjs`, gdy pack nie jest zbudowany)
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
- [~] Environmental hazards. **Głód i Odwodnienie wykreślone** — zrobione w `actors/party-supplies.mjs`
  (`consumeDailyNeeds`: dzienne zapotrzebowanie z ekwipunku, pół racji bez konsekwencji, poniżej —
  RO KON ST 10 dla jedzenia i automatyczne Wyczerpanie dla wody, znaczniki `malnutrition`/`dehydration`,
  źródła `niedozywienie`/`odwodnienie`, których DO nie zdejmie). Wpis przeżył jako martwy TODO,
  tak samo jak Upojenie i Skażenie wyżej — znaleziony przy porządkach 2026-08-25.
  **Podpalenie wykreślone** — `combat/podpalenie.mjs`, v0.14.5 (1k4 ognia na początku tury,
  `duration` FVTT zamiast własnego licznika, płomień Sequencera na żetonie, akcja „Ugaś się"
  w panelu STAN). **Zostaje: Przemarznięcie i Uduszenie** — mają gotowe klucze
  w `EXHAUSTION_SOURCES` i żadnej automatyki
- [~] Rest activities — **polowanie i gotowanie zrobione** (`party-supplies.mjs`: `hunt()` — 1 h,
  Test Mądrości (Sztuka przetrwania) ST 15; `cook()`). Zostają: plotki i czyszczenie sprzętu
- [ ] Vehicles (actor type + combat + chase system)
- [ ] Crafting system (schematy, produkcja, szabrowanie, bebeszenie)
- [ ] Drones

## Phase 5: Content & Polish
- [~] **Tracer/Muzzle VFX** — muzzle flash + bullet tracer żywe dla P/KS/DS/MS (własny silnik PIXI, patrz §1.21); OZ świadomie bez tracera (poza zakresem), eksplozje na templatach i iskry/krew trafienia wciąż nie zaimplementowane
- [x] **Compendia broń i pancerze** — zbudowane w v0.11.0 (patrz Changelog). `bron` 74 pozycje
  (złożone z tabel `Tabele/Bronie/*.md` + Zbrojowni), `pancerze` 17 pozycji wraz z czterema
  regułami, których moduł nie miał. Rozpoznanie: [HANDOFF_bron_pancerze.md](HANDOFF_bron_pancerze.md).
  **Ten punkt stał tu jako `[ ]` jeszcze po wydaniu v0.11.0** — znalezione przy porządkach 2026-08-22
- [ ] **Ikony pancerzy** — `icons/armor/<id>.svg` to na razie ścieżki bez plików; przepuszczenie ich
  przez `dev/icons/process_grid_N.py` odsunięte na osobne zadanie (v0.11.0)
- [x] **Bestiariusz** — 51 istot, kompendium `neuroshima.bestiariusz`. ~~Enemy sheets + bestiary imports~~
  było tu jako `[ ]` mimo że warstwa jest gotowa i zweryfikowana — patrz podsekcja „Bestiariusz"
  na końcu Phase 3 wyżej (dodana przy porządkach 2026-08-21, bo ta praca nigdy nie dostała
  własnego miejsca w tym trackerze)
- [ ] Color profiles (Stal, Rdza, Rtęć, Chrom)
- [ ] Regional price tables
- [ ] UI polish, tactical HUD
- [—] **Ikony broni per-typ** (`weapons/icons.js`) — **plik usunięty w v0.13.0**. Był osierocony
  od 2026-08-21 (jedyny importer, `scripts/main.js`, był martwym duplikatem entry pointu).
  Zadanie okazało się zrobione gdzie indziej: broń obsługuje hook `preCreateItem`
  w `config/weapons.mjs` (`WEAPON_ICON_MAP` + aliasy + fallback per typ broni), a amunicja,
  granaty i materiały wybuchowe mają pole `icon` przy każdej z 34 pozycji w `config/ammo-data.mjs`.
  Jedyne, co `icons.js` wnosił ponad to, to dopasowanie po słowach kluczowych dla itemów robionych
  ręcznie — i to wadliwe (reguła `"bolt"` dla karabinów powtarzalnych przechwytywała bełty do kuszy,
  klucz `"ar"` łapał *Barrett*, a hook nadpisywał też ikony ustawione ręcznie przez MG)

---

## Changelog

### v0.14.20 — Kompletność ekwipunku: brakujące aliasy broni, duplikaty, nowy audyt wagi/ceny/źródła (2026-08-29)

Zgłoszone: „Make sure all items have a weight, value in gabels and are somewhere in the
compendium" + w trakcie, mimochodem: „Lorentz has a 338 and bejsbol as łup and as
weapons — duplication. Why is the weapons baseball without an icon?"

**1. `auditWeapons()` miał martwe pole. Cztery bronie były dla niego niewidzialne.**
Dopasowanie po nazwie (case-insensitive + `WEAPON_NAME_ALIASES`) nie miało wpisu dla
kilku realnych kopii, więc `diffWeaponItem` nigdy nie dochodził do porównania —
`auditWeapons()` po prostu je pomijał, bez ostrzeżenia. Skutek nie ograniczał się do
wagi/ceny: **brakująca właściwość `tryb_p` = ZERO aktywności strzeleckich — broń nie
dawała się w ogóle wystrzelić**, po cichu. Znalezione i naprawione:
- Alan „H&K G3" → katalogowe „HK G3" (waga 1→4, cena 0→130, zasięg daleki, dostępność,
  magazynek 30 naboi, właściwości `amm/tryb_p/tryb_ks/tryb_ds` — bez tego pola broń nie
  miała żadnej aktywności ataku).
- Alan i Victor „M1 Garand" → katalogowe „M1 US Rifle" (ta sama drużyna kopii miała ten
  sam problem niezależnie u dwóch graczy — waga 1→4, cena 0→80, magazynek 8, ustalone
  obrażenia kalibru).
- Lorentz „38-ka" → katalogowe „Trzydziestka ósemka" (cena 0→35, zasięg, magazynek 6
  naboi bębenkowych).
- GMT400 „Browning M2 (z trójnogiem)" → katalogowe „Browning", Richard Craddock (x2)
  „FN Minimi (taśma XXL)" → katalogowe „Minimi" — ten sam kształt bugu na ciężkiej broni
  pojazdowej.

Dodano 5 wpisów do `WEAPON_NAME_ALIASES` (`weapons-data.mjs`). `game.neuroshima.repairWeapons()`
naprawił wszystkie 7 kopii jedną komendą; pełny zestaw testów (140/140) przeszedł bez zmian.

**2. Lorentz: prawdziwa duplikacja, nie tylko brakująca ikona.** „38-ka" i „bejsbol"
istniały u niego DWA razy — raz jako właściwa broń (`type: weapon`, z aktywnościami),
raz jako martwy `loot`-owy relikt z importu (ten sam kształt co Alanowy zduplikowany
H&K G3 z 2026-08-29 wcześniej). Oba duplikaty usunięte. Ikona broni „Bejsbol" była na
avatarze Lorentza (nigdy nie ustawiona) — katalogowe „Bejsbol/Rurka" wskazuje na
`iron_pipe_club.svg` (RAW łączy oba warianty w jeden wpis), ale osobna
`icons/weapons/baseball_bat.svg` już istniała na dysku i pasuje dokładnie do nazwy
tego konkretnego egzemplarza — podpięta bezpośrednio, katalog zostawiony bez zmian
(nie każe wszystkim „Bejsbolom" nosić kij, tylko domyślny wpis łączony).

**3. Nowy audyt: `auditItemCompleteness()`.** Read-only, na zawsze — nie ma bezpiecznej
automatycznej naprawy dla „wymyśl wagę i cenę przedmiotu, którego nikt nie skatalogował",
to decyzja MG. Zgłasza fizyczny przedmiot (weapon/equipment/consumable/loot/tool) tylko
gdy ma **jednocześnie zerową/brakującą wagę I cenę I** nie da się go dopasować do
żadnego katalogu/flagi modułu (broń, pancerz, addon, chemia, granat/amunicja po
subtype, toolkit, gear-placeholder, surowiec). Pomija cechy/klasy/podklasy/pochodzenia
(nie mają wagi z definicji), aktorów `TEST*` (fixtures QA) i naturalne ataki potworów
SRD (`system.type.value === "natural"` — nikt nie kupuje kłów dzika).

Pierwszy przebieg na całej drużynie: 56 trafień → po odsianiu ataków SRD i fixture'ów
QA, **30 realnych**. Naprawione ręcznie (GM-owe wartości, nie zgaduje ich audyt):
- Alanowe resztki flavorowe (Pendrive Rodzinny, okulary, długopis, identyfikator,
  żeton kasyna — którego nazwa dosłownie podaje wartość: 10 gb) dostały realną wagę i cenę.
- „Latarka czołówka" i „Zapałki" — wspólna zawartość Plecaka turysty/żołnierza/
  naukowca (`Podrecznik` §5 Tworzenie postaci: RAW wymienia je jako *Zawartość*
  plecaka, nigdy nie wycenia osobno) — dostały realną wagę, cena została na 0
  świadomie, zgodnie ze źródłem, nie przez zaniedbanie. Naprawione na 8 aktorach
  (Alan, Victor, Buźka, Carson, Dante, Góra, Iris, Kluczyk).
- Zapalniczka Zippo, Talia kart (Buźka), Odznaka (Evie — pasuje do już podpiętej
  ikony `odznaka.svg`), Nabicie tytoniu (Piekarz) — osobiste przedmioty z realną
  wartością handlową, dostały wagę i cenę.
- Raynald: „Konserwa" była **zdublowana** (dwa identyczne stosy po 2 sztuki) —
  scalone do jednego stosu ×4, waga naprawiona do 1 kg (reszta drużyny miała 1 kg,
  jego kopia miała 0 — dryf, nie wybór).

Pozostałe 4 z pierwotnych 56 to świadome wyjątki, nietknięte: dwa czysto narracyjne
pamiątki bez wartości handlowej (Piekarzowe zdjęcie, Dantego list od Gordona), jeden
fixture QA („Latarnik" trzyma testowy miecz), jeden SRD-owy loot potwora (Priest
Acolyte's Holy Symbol — nie treść Neuroshimy).

**Nowe API:** `game.neuroshima.inventoryAudit.auditItemCompleteness()`.

---

### v0.14.19 — Icon sweep: skoroszyt 37, ostatnie braki Alana + wspólny starter-kit (2026-08-29)

`process_grid_37.py` — 9 nowych ikon, `icons/items/loot/`:

- Alanowe 5 czysto flavorowych drobiazgów, wcześniej na `hazard.svg`: Nomeksowy
  kombinezon, ceramiczny kubek, okulary, długopis, identyfikator.
- 4 pozycje wspólnego „starter-kitu" wykryte przy okazji audytu ikon lootu: Śpiwór,
  Menażka, Ubranie (generyczne — pokrywa też warianty „Ubranie Pustynne"/„Ubranie
  wojskowe" tym samym rysunkiem) na Buźce/Carsonie/Dantem/Górze/Iris/Kluczyku (19
  przedmiotów na 6 aktorach), plus Zestaw Żołnierza na Lorentzu.

Zero przedmiotów na `hazard.svg` czy `icons/svg/item-bag.svg` u Alana i tej szóstki NPC.

---

### v0.14.18 — Kolimator: prawdziwy addon, nie luźny loot; reużycie ikon na 6 NPC (2026-08-29)

Zgłoszone: „Kolimator is not an attachment that can be mounted." Słusznie — batch 36
potraktował Alanowe „kolimator" jak zwykły flavor-loot i wygenerował mu nową ikonę w
`icons/items/loot/`, ale to przeoczenie: `kolimator` to od dawna prawdziwa, w pełni
zaimplementowana pozycja w katalogu addonów broni (`ADDON_DEFS.kolimator`,
`weapons/addons.mjs`) z **już istniejącą** grafiką pod `icons/addons/kolimator.svg` —
tylko Alanowy przedmiot nie miał flagi `flags.neuroshima-2026-overrides.ulepszenie`,
więc `installAddon()` go nie rozpoznawał. Naprawiono: przedmiot przemianowany na
„Kolimator + baterie" (etykieta z katalogu), ikona przepięta na `icons/addons/kolimator.svg`,
cena/waga zrównane z definicją (50 gb / 0,15 kg), dodana flaga `ulepszenie: "kolimator"`.
Osierocone `items/loot/kolimator.{png,svg}` z batcha 36 usunięte; `process_grid_36.py`
oznaczony, żeby nie regenerować tego slotu ponownie.

Zastrzeżenie dla gracza: kolimator wymaga właściwości `sm` (Szyna) na broni
(`requiresProperties`), a katalogowy H&K G3 (`weapons-data.mjs`, `hk-g3`) jej nie ma —
to zgodne z RAW, nie bug, więc montaż na obecnym karabinie Alana nie zadziała, dopóki
broń nie dostanie szyny (inna decyzja, nieruszona tutaj).

Przy okazji: audyt całej drużyny pod kątem ikon lootu ujawnił, że sześciu NPC ze
wspólnym „stater-kitem" (Buźka, Carson, Dante, Góra, Iris, Kluczyk) nosiło Manierkę i
Zapałki na generycznym `icons/svg/item-bag.svg`, mimo że pasujące ikony (`manierka.svg`,
`zapalki_sztormowe.svg`) już istnieją w `icons/items/loot/`. Przepięte bez nowej grafiki —
11 przedmiotów na 6 aktorach.

---

### v0.14.17 — Chemia: cała paleta ikon, sprzątanie Alana (2026-08-29)

Zgłoszone wprost, cztery osobne rzeczy dotyczące Alana:

**1. Ikony chemii, party-wide.** Skan `chemia-data.mjs` wykrył, że 28 z 35 pozycji
katalogu Chemii renderowało się na generycznych ikonach rdzenia Foundry
(`icons/svg/pill.svg`, `stoned.svg`, `tankard.svg`, `aura.svg`, `heal.svg`, `blood.svg`,
`radiation.svg`, `barrel.svg`...), mimo że dedykowana grafika (`icons/items/drugs/*.svg`,
26 plików) leżała nieużywana na dysku od poprzednich skoroszytów — `def.img` po prostu
nigdy nie wskazał na nią. Naprawiono katalog (28 wpisów przepięte na realną ikonę; 7 bez
odpowiednika — `desmopresyna`, `aspirynaK`, `dracophen`, `reminex`, `psychotropy`,
`actinix`, `nitrogliceryna` — dostały jawny `TODO_ICON` zamiast cichego fallbacku).
Ponieważ edycja katalogu nie cofa się na przedmioty już stworzone na kartach, dodano
`auditChemiaIcons`/`repairChemiaIcons` do `inventory-audit.mjs` (zwykły `update()`, nie
delete+create — `img` to zwykłe pole, nie `type`) i wpięto jako czwartą kategorię
`auditInventory`/`repairInventory`. Uruchomione: **13 przedmiotów na całej drużynie**
miało przestarzałą ikonę — teraz 0.

**2. „Bestiariusz" — fałszywy wpis w ekwipunku Alana.** Okazał się ręczną notatką gracza
(`feat` z `requirements: "spotkane bestie"`, treść: „Wielki pająk / Gladiator (maszyna
molocha)"), nie prawdziwą mechaniką — „Pierwsze spotkanie" (RO na Mądrość przy pierwszym
starciu z danym typem wroga) już istnieje, ale po stronie potwora: to metadana
automatyzacji w `bestiary-data.mjs`/`gen_bestiary.py` (`rule_pierwsze_spotkanie`),
odpalana ręcznie przez MG, gdy drużyna faktycznie zobaczy stwora — nie coś, co powinno
siedzieć jako przedmiot na karcie gracza. Skonsumowane: przedmiot usunięty, żaden
odpowiednik po stronie PC nie jest potrzebny.

**3. „Mój Biom Ruiny, Lasy" — sprzeczny z prawdziwym systemem.** Alan miał martwy,
zaszyty na sztywno przedmiot z importu (identifier `moj-biom-ruiny-lasy`, tekst
przerobiony z Ulubionego Terenu Rangera 5e), niezależny od właściwego systemu wyboru
biomów (`podroz-data.mjs`/`party-travel.mjs`, flaga `biomy` + picker na pasku karty).
Flaga tymczasem stała na `["ruiny","tereny-maszyn"]` — inny biom niż to, co mówił
przedmiot. Skan całej drużyny: to jedyny taki hardkodowany przedmiot (Victor korzysta
z samej flagi, bez duplikatu). Naprawiono: przedmiot usunięty, flaga poprawiona na
`["ruiny","las"]` zgodnie z tym, co mówił stary tekst.

**4. „Multiple missing item icons and definitions" — pełny przegląd ekwipunku Alana.**
Poza duplikatem H&K G3 (typu `loot`, obok prawdziwej broni — usunięty) i trzema
przedmiotami z ikonami pożyczonymi od zupełnie innych rzeczy (Plecak Turysty na
`ak_47.svg`, Latarka czołówka na `armalite_carbine.svg`, żeton kasyna na avatarze)
naprawionymi przez podpięcie już istniejącej, poprawnej ikony — trzy przedmioty
awansowały do prawdziwych systemowych odpowiedników zamiast luźnego lootu:
„pain kilery" (x4) → prawdziwy `chemiaItemData("painkiller")` (dawkowanie, przycisk
Zażyj), „Komponenty Amunicji" (x27) → prawdziwy surowiec Chemia (CH) (zgodnie z notatką
w `surowce-data.mjs`, że zapłonniki amunicji ciągną z puli CH), „Kamizelka kuloodporna"
→ prawdziwy pancerz `equipment` (Plate carrier typ I — najbliższy RAW odpowiednik,
„Kamizelka nośna z lekkimi płytami"; nie założony automatycznie). Dziewięć przedmiotów
bez odpowiednika w żadnym katalogu (7 pozycji Chemii bez grafiki w ogóle — Desmopresyna,
Aspiryna K, Dracophen, Reminex, Psychotropy, Actinix, Nitrogliceryna — plus Alanowe
kolimator i Pendrive Rodzinny) dostało tymczasowo uczciwy `icons/svg/hazard.svg`
zamiast mylącego avatara postaci albo cichego fallbacku, do czasu zamówienia grafiki
(skoroszyt 36).

**Nowe API:** `game.neuroshima.inventoryAudit.auditChemiaIcons()` /
`.repairChemiaIcons()`.

**Uzupełnienie tego samego dnia — skoroszyt 36 przetworzony.** Wszystkie 9 pozycji
z listy wyżej ma teraz docelową grafikę: `process_grid_36.py`,
`icons/items/drugs/{desmopresyna,aspiryna_k,dracophen,reminex,psychotropy,actinix}.svg`
i `icons/items/loot/{nitrogliceryna,kolimator,pendrive}.svg`. Katalog Chemii przepięty
z `hazard.svg` na docelowe ikony (`TODO_ICON` stał się martwym kodem i został usunięty
z `chemia-data.mjs` — cała trzydziestopięcio-pozycyjna paleta ma teraz realną grafikę);
`repairInventory()` przeniósł zmianę na 4 już istniejące egzemplarze na kartach; Alanowe
kolimator i Pendrive Rodzinny przepięte bezpośrednio. Zero nierozwiązanych placeholderów
w Chemii; z siedmiu czysto flavorowych drobiazgów Alana zostały cztery bez dedykowanej
grafiki (nomeksowy lombinezon, ceramiczny kubek, okulary, długopis, identyfikator) —
świadomie, to czysty flavor bez wagi mechanicznej.

**Nadal otwarte, nie ruszone w tym przebiegu:** trzy puste `<no name>` śmieciowe
przedmioty (Victor, Lorentz, Laffitte) — czeka na decyzję, usuwać czy nie; konwersja
Cobbler's Tools / Bagpipes / Alchemist's Supplies na lokalne toolkity — czeka na
potwierdzenie.

---

### v0.14.16 — Ekwipunek całej drużyny: audyt kategorii, Leki/Prowiant w Zasobach, legenda + segmentowany pasek (2026-08-29)

Zgłoszone wprost: „pirotechnika into pirotechnika" — Raynaldowi poprzedniego dnia poprawiono
ikonę „Litry chemii" na `chemia.svg`, ale przedmiot dalej był `type:"loot"`, więc panel Surowce
(`getSurowiecType()`) w ogóle nie dochodził do sprawdzania ikony — wymaga `type==="consumable"`
jako pierwszego warunku. Ten sam kształt błędu miał panel Pirotechniki (potrzebuje
`consumable`+`ammo`+`grenade-*`, nie tylko wybuchowo brzmiącej nazwy) i cały system Chemii
(prawdziwy typ `lekarstwo` z działającym dawkowaniem, którego zwykły `loot` nigdy nie dostaje).

- **`config/inventory-audit.mjs` (nowy)** — trzy pary audit/repair (Surowce, Pirotechnika,
  Chemia) w tym samym kształcie co `auditWeapons()`/`repairWeapons()`: najpierw czytelny
  raport, naprawa dopiero na wyraźne wywołanie. `game.neuroshima.inventoryAudit.*`.
  Przeskanowano **całą drużynę** (nie tylko 6 postaci z sesji ikon) — 11 aktorów, 25
  przedmiotów z rozjazdem, wszystkie naprawione i zweryfikowane live.
  - Pirotechnika: dopasowanie po polskich aliasach nazw (deklinacja/liczba mnoga psuje
    prosty substring-match z Chemii — „granaty dymne" nie zawiera „granat dymny"), z
    wyciąganiem wiodącej liczby z nazwy jako `quantity` („3 granaty dymne" → ×3).
    Dodano brakujący `grenade-signal` do `GRENADE_TYPES` (`ammo-data.mjs`) — realny,
    powtarzający się przedmiot bez katalogowego odpowiednika. Tymczasowo dzieli ikonę
    z `grenade-smoke` (`smoke_grenade.svg`) — TODO w komentarzu, prawdziwa grafika nie
    zamówiona.
  - Chemia: użyto istniejącego `chemiaKeyByName()` (już tolerował „Wapniak (20)" w
    dawkowaniu) do podniesienia luźnego lootu do prawdziwych itemów `lekarstwo` —
    Relanium/Trybiotyl/Medpak/Taurus itd. dostają teraz realny przycisk „Zażyj"/
    „Posmaruj ranę" z efektami, zamiast fallbackowego liczenia `quantity`.
  - **Bugfix po drodze**: `updateEmbeddedDocuments` z kluczem `type` w payloadzie nie
    rzuca błędu, tylko cicho zwraca pustą tablicę wyników — Foundry nie pozwala zmienić
    `type` dokumentu przez zwykły update. Wszystkie trzy repairy robią delete+create,
    nie update; złapane live dopiero po tym, jak pierwsza wersja repairSurowce/
    repairPirotechnika nic nie zmieniła mimo `total: 25` z audytu.
- **`actors/leki-inventory.mjs` (nowy)** — panel „Leki" w Zasobach, lista `lekarstwo`
  z przyciskiem używającym natywnej aktywności itemu (`activity.use()`, nie
  `neuroSilent` — to jest świeże kliknięcie, nie duplikat). Zweryfikowane live: Relanium
  3→2 szt. po kliknięciu, karta czatu `neuro-chemia-card` na czacie, brak błędów.
- **`config/prowiant-data.mjs` + `actors/prowiant-inventory.mjs` (nowe)** — panel
  „Prowiant" (jedzenie/woda), informacyjny z założenia (decyzja 2026-08-29: żadnej
  automatycznej kary). Dopasowanie po luźnym regexie nazwy zamiast sztywnego katalogu —
  live-skan całej drużyny pokazał, że w praktyce liczą się właściwie tylko „Konserwa"
  i „Litr Wody"; wagi produktu nigdy nie są zgadywane, panel sumuje to, co item i tak
  już ma w `system.weight × quantity`. Licznik dni zapasu wprost z progów RAW
  (`Tabele/Zywnosc.md`: 0,5 kg jedzenia / 2 l wody dziennie).
- **`actors/encumbrance-breakdown.mjs` (nowy)** — pasek udźwigu (`.encumbrance .meter.progress`)
  podniesiony do 22px i nakładka z 4 kolorowymi segmentami (Broń/Pancerz/Zasoby/Reszta,
  proporcjonalnie do wagi względem `max`), plus legenda pod paskiem: te same 4 kolory,
  5 kolorów akcentu Surowców (`SUROWCE_TYPES`) i jednozdaniowy opis każdej sekcji Zasobów.
  „Zasoby" na pasku to ścisły nadzbiór tego, co pokazują panele w zakładce Zasoby —
  liczone tymi samymi funkcjami (`getSurowiecType`/`getProwiantCategory`/`chemiaKey`/
  `ammo`), więc pasek i zakładka fizycznie nie mogą się rozjechać.
- Zdecydowane wprost (2026-08-29): Prowiant wyłącznie informacyjny (bez automatycznej kary
  Wyczerpania), legacy leki podniesione do prawdziwych itemów `lekarstwo` (nie zostawione
  jako luźny loot).

### v0.14.15 — Icon sweep: pancerze w komplecie, część placeholderów craftingu z realną grafiką (2026-08-29)

Wieloetapowa akcja domalowywania ikon (batch 29-35, `dev/icons/process_grid_*.py`), część
skupiona na sprzęcie sześciu postaci (Piekarz/Victor/Lorentz/Laffitte/Raynald/Evie — bronie,
plecaki, drobiazgi fabularne), część na lukach systemowych:

- **`icons/armor/` — było puste, teraz 17/17.** Cały katalog pancerzy (`armor-data.mjs`)
  renderował się jako broken image od początku istnienia modułu; nikt tego nie zauważył, bo
  żaden gracz nie miał jeszcze pancerza z tej listy w ekwipunku. Samowiążące — nazwa pliku =
  dokładne `id` z `ARMOR_MAP`, `buildArmorItemData()` już tam wskazywał, więc zero zmian w
  kodzie / zero per-aktor wiring.
- **`gear-data.mjs` (`GEAR_PLACEHOLDERS`)** — `buildGearItemData()` miał `img: TODO_ICON`
  zahardkodowane bez wyjątku dla wszystkich 12 stubów craftingowych. Dodano opcjonalne pole
  `icon` per wpis; 8/12 (Bełty\*, Igły, Kłódka, Kolczatki, Łom, Łopata, Podkowy, Płyty
  pancerne) ma teraz realną grafikę zamiast trójkąta z wykrzyknikiem, reszta (Sidła, Sprzęt
  wspinaczkowy, Strzały, Wózek) świadomie zostaje na `TODO_ICON` do czasu domalowania. Nie
  zmienia statusu „placeholder" tych itemów — patrz nagłówek pliku, wciąż brak wagi/ceny/ST,
  zmieniła się wyłącznie ikona.
  \* „Bełty" okazały się martwym wpisem — prawdziwe groty kuszy już istnieją jako oddzielny
  item „Bełt" (`ammo_bolt.svg`) w amunicji; nowa ikona `belty.svg` zostaje nieużywana.
- Testowanie `createGearPlaceholders()` po edycji ujawniło ten sam gotchas co przy naprawie
  Cichego kroku: dynamiczny `import()` tego samego URL-a w tej samej sesji zwraca modułowy
  cache sprzed edycji, nie świeży plik — trzeba pełnego przeładowania klienta, żeby zobaczyć
  zmianę z dysku. Po przeładowaniu `game.neuroshima.createGearPlaceholders()` (publiczne API)
  poprawnie zaktualizował 7 już istniejących stubów na Zbrojowni + potwierdził 4 zostają na
  starej ikonie.
- Przy okazji naprawiono ~30 itemów na sześciu postaciach, które wskazywały na zły, ale już
  istniejący plik (np. Uzi → `machine_pistol.svg` zamiast własnego `uzi.svg`, „combat knife"
  → `baseball_bat.svg` zamiast `combat_knife.svg`) — bez generowania nowej grafiki, czysty
  data-fix.

### v0.14.14 — Bugfix: notatki Długiego odpoczynku 8px w prawo względem reszty okna (2026-08-28)

Zgłoszone wprost po zrzucie ekranu: `.neuro-rest-note` miało `margin: 0 0 8px 8px` — zbędny
lewy margines (relikt myślenia o miejscu na wystający znacznik-kółko, które i tak korzysta
z paddingu `.window-content`, nie z marginesu notatki). Zmierzone `getBoundingClientRect`
przed poprawką: notatki na 835,5px, natywny box i fieldset PW na 827,5px — dokładnie 8px
różnicy. Poprawka: `margin: 0 0 8px`. Zweryfikowane na żywo po przeładowaniu: wszystkie
cztery bloki (dwie notatki, natywny `.note.info`, fieldset) na tym samym `left`

### v0.14.13 — Notatka Długiego odpoczynku: dwie, w stylu natywnych `.note` z dnd5e (2026-08-28)

Dopracowanie v0.14.12 na żądanie: jedna gęsta notatka rozbita na dwie — niebieska `info`
(same triggery zakłócenia) i bursztynowa `warn` (konsekwencje: próg 1 PW, próg 4h, wznowienie
+1h). Obie stylizowane na wzór natywnego pudełka `.note.info` z dnd5e (`less/v2/apps.less`),
które i tak stoi tuż pod nimi w tym samym oknie — bordered box, kółko-znacznik z ikoną,
przyciemnione tło koloru obwódki (`color-mix`), `--dnd5e-color-note-warn` dla wariantu warn.
Własna klasa `.neuro-rest-note` zamiast bezpośredniego użycia `.note` dnd5e, bo tamten selektor
wymaga bycia bezpośrednim dzieckiem `section`/`fieldset` pod `.window-content` — nowe notatki są
wstrzykiwane luźno na początku okna i nie spełniają tego wymogu. Rozmiar czcionki i odstęp
wierszy (był 14px/16px, ledwo mieszczący litery) poprawione na 12px/18px — dokładnie to, na czym
stoi natywny box obok. CSS w `styles/neuroshima.css` (nowa sekcja „OKNO DŁUGIEGO ODPOCZYNKU"),
zweryfikowane `npm run validate:css` i na żywo (zrzut ekranu, `getComputedStyle`)

### v0.14.12 — Zakłócenie Długiego odpoczynku: pole zamienione na notatkę referencyjną (2026-08-28)

Na żądanie: usunięcie pola „Przerwany po (godz.)" z okna Długiego odpoczynku (`config/rest.mjs`)
— dotąd trzeba było ręcznie wpisać liczbę godzin, a hook `dnd5e.longRest` sam przeliczał próg
≥4h i przekierowywał na `actor.shortRest()`. Zastąpione statyczną notatką (RAW z Podręcznika,
„Zakłócenie Długiego odpoczynku"): triggery przerwania (Inicjatywa/obrażenia/podróż >1h), próg
1 PW do rozpoczęcia, próg 4h do korzyści Krótkiego (rozliczane już ręcznie przez GM), możliwość
wznowienia z +1h za przerwę — żadna z tych czterech klauzul nie miała wcześniej odpowiednika
w polu, które liczyło tylko próg 4h. Wstrzyknięta przez `_onRender` na podklasie
`restTypes.long.dialogClass` (ta sama ścieżka rozszerzenia co usunięte pole), nie przez hook
renderowania — jedna odpowiedzialność, jedna klasa. `onLongRest`/`resolveInterruptedLongRest`
i stała `INTERRUPT_THRESHOLD_HOURS` usunięte w całości, nieużywane nigdzie indziej. Zweryfikowane
na żywo: notatka renderuje się raz, na górze okna „Długi odpoczynek", zamknięcie okna bez
potwierdzenia odpoczynku nie rusza stanu postaci

### v0.14.11 — Bugfix: odpoczynek nie kończył aktywnego Berserku (2026-08-28)

Zgłoszenie: „Długi odpoczynek z jakiegoś powodu nie skończył berserku". Potwierdzone na żywo:
włączony Berserk na Piekarzu, odpoczynek, efekt został aktywny dalej. Przyczyna: jedyny kod
kasujący stan po czasie to hook `updateCombat` (sprawdza `duration.remaining <= 0` przy zmianie
rundy/tury) — odpoczynek (4h/24h w tych zasadach, oba dużo dłuższe niż 10 rund Berserku) nigdy
nie odpala `updateCombat`, więc nic nie pilnowało „to zostało włączone przez odpoczynek". Efekt
siedziałby aktywny bezterminowo, dopóki nie wystartowałaby walka albo ktoś nie zauważył i nie
wyłączył ręcznie

**Naprawa**: hook `dnd5e.restCompleted` w `registerClassState()` — kasuje każdy aktywny efekt
oznaczony `classState` na odpoczywającym aktorze, przez ten sam `_announceEnd()` co każda inna
ścieżka zejścia (scrollText + karta „Koniec Berserku", świadomie **bez** kary „bez akcji" — ta
żyje wyłącznie w gałęzi `updateCombat` i po odpoczynku byłaby bez sensu). Bez blokady `isGM` —
w przeciwieństwie do `updateCombat` (odpala się na każdym podłączonym kliencie śledzącym tracker
walki), `dnd5e.restCompleted` odpala się raz, lokalnie, tylko u tego, kto faktycznie wywołał
odpoczynek. Zweryfikowane end-to-end: włączony Berserk, `actor.longRest()` wprost, efekt zniknął
natychmiast, poprawna karta, użycia poprawnie zresetowane do 0/2 przez natywną regenerację
(niepowiązane, bez zmian). Utknięty efekt sprzed poprawki skasowany ręcznie, żeby nie zostawić
martwego stanu. Pełne rozpoznanie: `PLAN_berserk.md` §5b

### v0.14.10 — Bugfix: karta postaci paliła realny użytek Berserku bez żadnego efektu (2026-08-28)

Zgłoszenie: „nic się nie zmienia, gdy używam Berserku na Piekarzu" / „czy muszę być w trybie
tury?". Nie tura — `toggleClassState` nigdy nie sprawdzał walki/tury. Prawdziwa przyczyna,
znaleziona na żywo: `build-packs.mjs` (`buildFeature()`) generuje domyślną, klikalną aktywność
`"utility"` dla **każdej** zdolności z akcją lub użyciami — bez pojęcia o zdolnościach `toggle`.
Pasek skrótów (`ability-hotbar.mjs`) już wcześniej omijał ten problem (`toggle` → wprost
`toggleClassState`, z pominięciem `item.use()`), ale **natywny przycisk „użyj" wprost na karcie
postaci** — najbardziej naturalny sposób kliknięcia — szedł przez tę domyślną aktywność: zużywał
realne, ograniczone Długim odpoczynkiem użycie, wysyłał gołą kartę z samym opisem, i **nie
nakładał żadnej mechaniki** (zero AE, zero automatyki), bo cała logika `class-state.mjs` siedziała
wyłącznie na ścieżce paska skrótów. Nie hipotetyczne: Piekarz miał już 1 z 2 dziennych Berserków
zużyte, zanim ta sesja czegokolwiek dotknęła — niemal na pewno spalone dokładnie w ten sposób,
w realnej rozgrywce, bez żadnego efektu. Odtworzone celowo (`berserkItem.use()`, ta sama ścieżka
co klik na karcie): licznik użyć poszedł 1→2, poszła goła karta `activation-card`, żaden AE się nie
pojawił — natychmiast cofnięte do 1, żeby własna diagnostyka nie pogłębiła problemu

**Naprawa**: hook `dnd5e.preUseActivity` w `registerClassState()` — dla przedmiotu oznaczonego
jako zdolność `toggle`, anuluje natywną aktywność (`return false`, przed jakąkolwiek konsumpcją
czy kartą) i woła `toggleClassState()` — tę samą funkcję, której pasek skrótów już używał. Każde
wejście zbiega się teraz do jednej ścieżki mechaniki. Zweryfikowane end-to-end na Piekarzu
prawdziwym wywołaniem natywnym: pojedyncza konsumpcja (1→2, nie 1→3), właściwa stylizowana
karta „🩸 BERSERK", realny AE; wyłączenie tą samą drogą — czysto; stan końcowy cofnięty do
nietkniętego 1/2. Generalizuje się na Kondychę (jedyną drugą zdolność `toggle`) za darmo — hook
bramkuje po `feature.toggle`, nie po konkretnej zdolności. Pełne rozpoznanie: `PLAN_berserk.md` §5a

### v0.14.9 — Dlaczego Rage widać w Efektach a Berserka nie; VFX wypróbowane i cofnięte (2026-08-28)

- **„Stany" to nie to, o co pytał użytkownik** — to natywna paleta stanów (Nieprzytomność,
  Ogłuszenie…), osobna od sekcji Efekty (Tymczasowe/Pasywne/Nieaktywne). Rzeczywiste pytanie:
  dlaczego Rage siedzi pod „Nieaktywne efekty" nawet bez użycia, a Berserk nigdy. Odpowiedź,
  sprawdzona wprost na Piekarzu (miał oba przedmioty): przedmiot Rage niesie własny, trwały,
  domyślnie wyłączony efekt (`disabled:true`, `transfer:true`) — samo posiadanie przedmiotu
  wystarcza, by był widoczny. Przedmiot Berserka nie niesie żadnego efektu (`effects.size === 0`
  na obu postaciach) — `class-state.mjs` tworzy prawdziwy dokument dopiero przy włączeniu
  i kasuje go przy wyłączeniu, więc w stanie wyłączonym nie ma czego wylistować. **Decyzja:
  zostaje bez zmian** — atrapa efektu wyłącznie dla parytetu widoczności w zakładce Efekty była
  rozważona i odrzucona (więcej ruchomych części, zero realnej korzyści)
- **Scrolling text już działał** — sprawdzone wprost (dłuższy czas trwania, złapane na ekranie),
  nie był to brakujący feature. Wyglądał na nieobecny, bo testy szły na Dantem, który nie ma
  żadnego pionka na żadnej realnej scenie (`seqScrollText` cicho nic nie robi bez pionka do
  wycelowania — poprawne zachowanie, nie błąd)
- **Trwała aura VFX (JB2A `on_token_buff.001.001.purplered`) wypróbowana i cofnięta tej samej
  sesji** — zbudowana z jawną zgodą użytkownika („trwała aura na czas trwania" — wybrana opcja),
  zweryfikowana na żywo (`Sequencer.EffectManager`, poprawne sprzątanie na wszystkich trzech
  ścieżkach zejścia stanu przez współdzielony `_announceEnd()`), odrzucona na miejscu po
  zobaczeniu w akcji („fioletowe gwiazdki i pulsy" — zbyt dużo). Usunięta w całości (config `vfx`,
  oba miejsca wywołania, martwy import) zamiast zostawiona wyłączona. **Stan obecny: sam
  scrollText, zero VFX na płótnie**
- **SFX świadomie pominięte** — brak jakiegokolwiek assetu ryku/okrzyku w module (wszystko
  w `sounds/` to broń palna/przeładowania/wybuchy); odłożone do czasu realnego pliku audio
- Pełne rozpoznanie i uzasadnienia: `PLAN_berserk.md` §2b

### v0.14.8 — Karta Berserku: porównana z realną kartą Rage, zły kontrast naprawiony (2026-08-28)

Kontynuacja v0.14.7, tego samego dnia, po bezpośrednim sprawdzeniu na żywo (chrome-devtools MCP,
dane testowe cofnięte) zamiast czytania samego źródła:

- **Karta Rage rzeczywiście wyzwolona** na jednorazowym aktorze: header ze zwijaną sekcją, opis
  z akapitów (jedna lista `<ul>` tylko dla sposobów przedłużenia Rage, nie dla przyznawanych
  korzyści), stopka z pigułkami (`pills`) — jedna z nich to **czas trwania** ("10 minutes" na
  przedmiocie 2024; starszy przedmiot 2014 `classfeatures.Rage` ma "1 min" i pojedynczy,
  domyślnie wyłączony efekt widoczny w karcie przedmiotu pod „Nieaktywne efekty" — stąd
  „Rage Inactive, 1 minute" z pytania). Do tego zasobnik „Efekty" (`<effect-application>`,
  wstrzykiwany po stronie klienta — nieobecny w zapisanej treści wiadomości, więc niewidoczny
  przy samym czytaniu źródła) z przyciskiem „Zastosuj do wycelowanych/zaznaczonych". **Użycie
  przedmiotu samo w sobie NIE włącza efektu** — sprawdzone wprost: aktywność zużyła użycie
  i wysłała kartę, ale efekt `Rage` na przedmiocie został `disabled: true`, dopóki ktoś nie
  kliknie „Zastosuj". Berserk jest więc de facto **bardziej** zautomatyzowany niż stockowy Rage:
  włącza się natychmiast i bezwarunkowo na rzucającym, bez osobnego kliknięcia i bez
  dwuznaczności celu
- **Karta Berserku dobita do tego, co Rage faktycznie komunikuje** (decyzja użytkownika: styl
  modułu, nie natywna otoczka kart dnd5e) — `class-state.mjs`: linia wprowadzająca, wypunktowany
  rozkład czterech korzyści (Siła/Obrażenia/Obłęd/Szarża Berserkera, z żywymi wartościami kości
  obrażeń i premii do TT), stopka-pigułka `Akcja Bonusowa · 10 rund · Cel: Ty`
- **Zgłoszony i naprawiony błąd kontrastu**: „ekstremalnie niski kontrast tekstu z tłem". Przyczyna
  źródłowa, potwierdzona odczytem `getComputedStyle` na żywo: dziennik czatu tego świata niesie
  własną klasę `theme-light`, niezależną od ciemnego motywu reszty UI — tło wiadomości to
  `rgb(241, 235, 232)` (prawie białe). Karty modułu (Berserk i Forsowanie/Fuks w `rerolls.mjs`)
  używały na sztywno jasnoszarych kolorów tekstu (`#aaa`/`#ccc`/`#888`) zakładających ciemne tło —
  prawie niewidocznych na jasnym. Naprawa: zamiana na tokeny motywu dnd5e/Foundry
  (`var(--color-text-primary, ...)`/`var(--color-text-secondary, ...)`), które poprawnie
  przełączają się z motywem danego dziennika czatu (potwierdzone: `--color-text-primary` to
  `#191813` pod `theme-light`, `#efe6d8` pod `theme-dark`). Zweryfikowane ponownie na żywo po
  poprawce: tekst listy `rgb(25, 24, 19)` na tym samym jasnym tle karty — czytelny. Ten sam wzorzec
  (nienaprawiony, tylko oznaczony) istnieje też w `knockout.mjs`, `exhaustion.mjs`, `magazine.mjs`

### v0.14.7 — Berserk dobity do parytetu z Rage (2026-08-28)

Porównanie z górnej półki: stock D&D 5e (2024) Barbarian Rage vs. Brutal Berserk. Pełne
rozpoznanie w `PLAN_berserk.md`. `actors/class-state.mjs`:

- **Obrażenia Berserkera** i **Siła Berserkera** dobite jako Active Effect zmiany na tym samym
  przełączniku, który już dawał premię do TT (Obłęd Berserkera) — tekst zdolności je obiecywał
  od zawsze, kod tego nie liczył. Te same ścieżki dnd5e co oficjalny efekt Rage
  (`bonuses.mwak.damage`, `abilities.str.check/save.roll.mode`), ta sama skala co dnd5e's
  `@scale.barbarian.rage-damage` (tu: `@scale.brutal.obrazeniaBerserkera`, już istniejący w
  `classes-data.mjs`, tylko nieużywany)
- **Karta czatu na każde zejście stanu** — wcześniej tylko naturalny koniec po 10 rundach dostawał
  cokolwiek (scrollText + osobna karta „bez akcji"); ręczne wyłączenie i przerwanie przez stan
  (Nieprzytomność/Obezwładnienie/Zauroczenie) nie dawały żadnego sygnału na stole. Teraz wszystkie
  trzy ścieżki przechodzą przez jeden `_announceEnd()`, w tym samym stylu co karty
  Forsowania/Fuksa (`combat/rerolls.mjs`) — kolorowy border-left, pogrubiony tytuł, szary opis
- Świadomie **nie** dobite: odporność na obrażenia (Rage ją ma, tekst Berserka jej nigdy nie
  obiecywał — różnica reguł, nie luka), przerwanie stanu przy założeniu ciężkiego pancerza (też
  nie w tekście), rozszerzenie kary „bez akcji" na ręczne/przerwane zejście (zapytane wprost,
  decyzja: zostaje tylko po naturalnym końcu)
- Cztery zdolności z `requiresState: "neuro-berserk"` (Z bara!, Ja i mój gang!, Zew areny, Maszyna
  do zabijania) zostają bez bramkowania stanem — flaga deklarowana, nigdzie nieczytana, i tak
  zostaje. Sprawdzone wprost na źródle `fvtt-dnd5e`: nawet oficjalna Ścieżka Berserkera nie
  bramkuje swoich odpowiedników (Frenzy — zero warunku aktywacji mimo tekstu „if your Rage is
  active"; Mindless Rage — AE na odporność istnieje, ale wysyłany `disabled: true` i **nie**
  włączany automatycznie z Rage, wprost w komentarzu producenta)

### v0.14.6 — Karta Drużyny: blokada łupu, upływ czasu podróży, poprawki uprawnień (2026-08-26)

Ekwipunek grupy (aktor-grupa, nie pojazd) był wolną wagą za darmo — nic go nie liczyło do
niczyjego udźwigu, nic nie wymuszało podziału. Nowy `actors/party-loot-lock.mjs`: dopóki worek
coś zawiera, gra jest zapauzowana (`game.togglePause`, natywny mechanizm — blokuje ruch tokenów
każdemu poza MG za darmo). Gracze rozdzielają zawartość przeciąganiem na swoje karty; zamknięcie
karty drużyny przez wymaganego gracza to commitment („biorę, co wzięłam", z potwierdzeniem);
gdy zamkną wszyscy (albo worek naturalnie opustoszeje) — reszta przepada, pauza znika.
Baner + pulsująca poświata w zakładce Ekwipunek, link do karty w wiadomości czatu, przyjazny
komunikat zamiast technicznego błędu uprawnień przy próbie wciśnięcia itemu komuś innemu.

`postTravelSummary()` zyskał guzik **„Zatwierdź upływ czasu"** w karcie czatu — MG jednym
kliknięciem przesuwa `game.time.advance()` o realny czas przejazdu (był to od zawsze
kosmetyczny opis, zero wpływu na `game.time`). Wyruszenie odmawia, gdy łup zablokowany albo gra
zapauzowana z dowolnego innego powodu (wcześniej pauza nie blokowała nic poza canvasem).
Naprawiony też realny bug w selektorze tempa: trudny teren wymuszał Powolne w wyliczeniach, ale
selektor nadal pokazywał Normalne/Szybkie jako wybieralne — teraz są `niedostępne`.

**Dwa realne, cichutkie bugi znalezione przy okazji** (opisane szerzej w ARCHITECTURE.md §9):

- `makeDefault: game.user.isGM` przy rejestracji karty drużyny **i** powłoki kart postaci/BN
  (`sheet-shell.mjs`) — `DocumentSheetConfig#registerSheet` liczy „domyślność" osobno na każdym
  kliencie, nie zapisuje ustawienia świata wbrew komentarzowi w starym kodzie. Efekt: gracze od
  nieznanej liczby sesji dostawali **stockową kartę dnd5e** zamiast naszej powłoki — bez błędu,
  bez ostrzeżenia. Naprawione na `makeDefault: true` w obu miejscach.
- `Hooks.on("renderActorSheet", …)` nigdy nie odpala się dla karty grupy (inny łańcuch klas,
  kończy się na `ActorSheetV2`, nie na `ActorSheet`) — zweryfikowane instrumentacją
  `Hooks.callAll` na żywo. Naprawione przez rejestrację na `renderGroupActorSheet` wprost.

Nowa paczka testów Quench `druzyna` (`tests/party.test.mjs`, 12 testów) pokrywa cykl życia
blokady i regresję selektora tempa. `DialogV2.confirm`/`ChatMessage.create`/`game.paused` są
podstawiane przez `stub()` — zero prawdziwych dialogów, zero pauzowania żywego stołu w teście.

### v0.14.5 — Podpalenie: ogień, który sam się liczy (2026-08-25)

Podpalenie było stanem-atrapą: pełny opis w `conditions.mjs`, ikona na żetonie i trzy pozycje
treści (miotacz ognia, dwa naboje zapalające, smok z bestiariusza) mówiące wprost „nakładany
ręcznie". Teraz `combat/podpalenie.mjs` egzekwuje RAW: **1k4 obrażeń od ognia na początku
każdej tury płonącego**, przez dwie rundy, plus akcja na ugaszenie się.

**Czas trwania jedzie schematem FVTT, nie własnym licznikiem.** Kuszące było dopisać flagę
z licznikiem tur i odejmować ją ręcznie — i byłby to trzeci taki licznik w module. Zamiast
tego wpis stanu deklaruje `duration: { value: 2, units: "rounds", expiry: "turnStart" }`,
a `ActiveEffect.fromStatusEffect` kopiuje **cały** wpis z `CONFIG.statusEffects` do efektu.
Dzięki temu odliczanie, przeliczanie przy zmianie rundy i etykieta „2 rundy" w karcie efektów
są już napisane przez rdzeń — czytamy tylko `effect.updateDuration().remaining`.

Jednego rdzeń nie zrobi: **nie skasuje wygasłego efektu.** `CONFIG.ActiveEffect.expiryAction`
domyślnie wynosi `"update"`, więc `ActiveEffectRegistry` tylko stawia `duration.expired = true`
i zostawia ikonę na żetonie. Przełączenie tego na `"delete"` jest ustawieniem **globalnym** —
dotknęłoby każdego efektu w świecie, łącznie z cudzymi. Dlatego kasowanie jest po naszej
stronie, w haku `updateCombat`, i to jedyny fragment systemu, który tu zastępujemy (ARCHITECTURE §8).

**Ile realnie tyknięć.** Rdzeń liczy `remaining = value - (runda_bieżąca - runda_startu)`,
więc wynik zależy od tego, kiedy w rundzie zapalił się ogień:

| Zapalony | Obrażenia | Gaśnie |
|---|---|---|
| przed swoją turą w rundzie R | tury R i R+1 → **2×1k4** | początek tury w R+2 |
| w swojej turze w rundzie R | tura R+1 → **1×1k4** | początek tury w R+2 |

To ta sama arytmetyka, którą 5e stosuje do każdego efektu na rundy, i zgadza się z językiem
podręcznika („płonie przez dwie rundy"). Gdyby MG chciał zawsze dokładnie dwa tyknięcia,
trzeba by liczyć **własne tury ofiary**, a tego `duration.units` nie wyraża — `"turns"` liczy
tury wszystkich w inicjatywie.

**Poza walką nic nie tyka.** Nie ma rund, więc nie ma początku tury. Płonący NPC pali się,
dopóki ktoś nie zdejmie stanu — człowiek pochodnia jest sceną, nie błędem.

**Widać, że się pali.** Zapalenie to jednorazowy `jb2a.flames.02.orange` plus doczepiony,
trwały `jb2a.flames.01.orange` przez Sequencera i scrolling text „PŁONIE!" w kolorze
`--neuro-color-podpalenie` (`#e8590c`, piąty wpis w palecie z v0.14.4). Ugaszenie ręczne daje
plusk wody i dym; **wypalenie się z czasu daje sam dym** — rozróżnia je opcja `neuroBurnout`
przepuszczana przez `effect.delete()` i odczytywana w haku `deleteActiveEffect`.
JB2A i Sequencer są miękkimi zależnościami: `seqEffect()` sprawdza `Sequencer.Database.entryExists`
i po cichu odpuszcza, bo brak wtyczki ma kosztować płomień, a nie zasadę.
Hak `canvasReady` dosynchronizowuje płomienie po przeładowaniu.

**Gaszenie się akcją** (`Ugaś się` w panelu STAN, widoczne tylko gdy postać płonie):
Powalenie leci **zawsze** — to nie kara za porażkę, tylko sposób, w jaki się gasi — a test
decyduje wyłącznie o tym, czy ogień zszedł. Sukces gasi od razu, bez drugiego kliknięcia.

> **Interpretacja domowa.** RAW mówi tylko „używając akcji, może spróbować się ugasić,
> przewracając się i turlając po ziemi" — bez ST i bez nazwania Powalenia. Moduł przyjmuje
> **Test Zręczności (Akrobatyka) ST 10**. Próg siedzi w `PODPALENIE.douseDC`, umiejętność
> w `PODPALENIE.douseSkill` (klucz `akr`, nie dnd5e-owe `acr`).

Nowe w `weapons/sequencer.mjs`: `seqEffect()` / `seqEndEffect()` / `seqEffectRunning()` —
ogólne API do efektów na kanwie, dotąd moduł umiał przez Sequencera tylko dźwięk i tekst.

### v0.14.4 — Jedna paleta stanów (2026-08-25)

Kolory stanów stopniowanych były rozsiane po czterech miejscach jako hexy i zdążyły się
rozjechać: Upojenie miało pipkę fioletową, a scrolling text złoty; Zranienie i Wyczerpanie
nosiły na żetonie **tę samą** czerwoną cyfrę dnd5e, więc dwie białe sylwetki różniło tylko
to, jaki mają kształt. Teraz tabela `config/state-colors.mjs` jest jedynym źródłem:

| Stan | kolor |
|---|---|
| Zranienie | `#c0392b` |
| Wyczerpanie | `#3498db` |
| Upojenie | `#9b59b6` |
| Skażenie | `#7fff3f` |

Tabela musi żyć w JS, a nie w arkuszu, bo ma dwóch konsumentów, których CSS nie obsłuży.
Ikona żetonu idzie do PIXI jako tekstura, więc `var(--icon-fill)` w SVG nigdy się nie
rozwinie — kolor jest **wpalany w plik** przez generator, który importuje tę samą stałą w
Node. Drugim jest `EXHAUSTION_SOURCES`, gdzie barwa jedzie inline stylem na pipkę. Runtime
publikuje tabelę jako `--neuro-color-*` na `:root` w `init`, więc arkusz tylko ją *stosuje*
i nie powtarza już żadnego hexa.

**Wyczerpanie dostało własny komplet ikon bez nadpisywania czegokolwiek.**
`ActiveEffect5e._getExhaustionImage()` buduje ścieżkę poziomu z
`CONFIG.DND5E.conditionTypes.exhaustion.img`, więc wystarczyło wskazać tam
`icons/statuses/wyczerpanie.svg`, a dnd5e samo poszło po `wyczerpanie-1..6.svg`. Generator
(`dev/icons/gen_status_numerals.mjs`, `npm run build:status-icons` — dawne
`gen_zranienie_levels.mjs` / `build:zranienie-icons` z wpisu niżej) kopiuje pliki systemu i
przemalowuje w nich tylko cyfrę, z twardym sprawdzeniem obecności `#c70000` — cicha porażka
dałaby ikony w barwie dnd5e i nikt by tego nie zauważył.

**Token HUD mówi jednym językiem.** Zranienie ma teraz komplet ikon z cyfrą, więc pokazuje
poziom podmianą tła kontrolki — tą samą sztuczką, którą dnd5e stosuje dla Wyczerpania w
`onTokenHUDRender` — zamiast doklejanego badge'a. Badge zostaje dla Upojenia i Skażenia,
które są rysowane ręcznie i cyfr w plikach nie mają, ale bierze barwę swojego toru zamiast
uniwersalnego złota. Rozstrzyga o tym opcjonalne `img` w `registerHudLevelled`.

### v0.14.3 — Poziom Zranienia na żetonie, koniec z przewlekłym znacznikiem (2026-08-25)

**Zranienie pokazuje teraz stopień tak samo jak Wyczerpanie: czerwoną cyfrą rzymską.**
dnd5e nie robi tego runtime'owo — `ActiveEffect5e._getExhaustionImage()` po prostu dokłada
`-N` do ścieżki ikony, a cyfra jest wrysowana w plik jako druga ścieżka (`id="Numeral"`,
`fill="#c70000"`). Rdzeń rysuje na żetonie sam `effect.img` (`Token#_drawEffect`), więc nie
ma innej drogi niż własny komplet plików. `dev/icons/gen_zranienie_levels.mjs` skleja
`icons/statuses/zranienie-1..4.svg` z sylwetki `bloodied.svg` i cyfr wyciętych z
`exhaustion-N.svg` — cyfry są kopiowane, nie rysowane od nowa, żeby oba stany wyglądały
identycznie. `npm run build:zranienie-icons`. Backfill przy `ready` odtwarza teraz efekt
także wtedy, gdy niesie starą, bezpoziomową ikonę.

**Choroba przewlekła w stanie bazowym schodzi z żetonu.** Znacznik `diseased` na stanie,
którego gracz nigdy nie zdejmie, nie niesie informacji — jest szumem, tym bardziej że
żeton ma skończoną liczbę czytelnych ikon. Zostaje dla chorób nabytych i dla przewlekłych
podbitych na Ostry/Krytyczny, bo te są odwracalne zachodem słońca i wtedy znacznik znaczy
„coś się pogorszyło". Rozstrzyga `isBaselineChronic()` w `config/diseases-data.mjs`.

Sam efekt nie znika: choroba bazowa z mechaniką (np. Niewydolność krążenia — Utrudnienie
w Testach Siły i Kondycji) dalej ma Active Effect i dalej płaci. Zmienia się `showIcon` na
`NEVER`, bo `Token#_drawEffects` filtruje po tym polu **niezależnie od `statuses`** — samo
odebranie znacznika zostawiłoby ikonę na żetonie. Choroba bazowa bez mechaniki (Hemofilia)
nie ma już po co istnieć jako efekt i nie jest tworzona.

### v0.14.2 — Odpoczynek: martwy hak, który zabierał PW (2026-08-25)

**Przechwycenie regeneracji Wyczerpania nie działało od pierwszego commita.**
`onPreRestCompleted` czytało `result.exhaustionDelta`, a dnd5e trzyma tę liczbę w
**`config`** — `initiateRest` (`actor.mjs:2170`) przepisuje ją z `restTypes` do konfiguracji,
`result` jej nigdy nie niesie. `git log -S "result.exhaustionDelta"` wskazuje jeden commit:
`7f3252b`, czyli wersję początkową. Hak odpalał się poprawnie i za każdym razem wychodził
w pierwszej linii.

Kaskada, która z tego wyszła, ma trzy piętra:

1. Ryczałtowe `-1` z dnd5e trafiało do `result.updateData` nietknięte — bez oglądania się
   na źródła Wyczerpania.
2. Nasz własny `onPreUpdateActor` widział surowy zapis poziomu bez towarzyszącej flagi
   `exhaustionSources`, uznawał go za zapis „z zewnątrz" i zwracał `false`.
3. `false` z `preUpdateActor` kasuje w rdzeniu **cały** update dokumentu
   (`client/data/client-backend.mjs:240` robi `continue`, nie usuwa pojedynczej ścieżki).
   Czyli długi odpoczynek postaci z Wyczerpaniem nie przywracał ani PW, ani Kości
   Wytrzymałości, ani zasobów — do tego wyskakiwało niezamówione okienko „które źródło
   ustępuje?". `updateItems`/`deleteItems` idą osobnymi wywołaniami, więc ładunki i użycia
   wracały normalnie; to dodatkowo maskowało objaw.

Nikt tego nie zauważył, bo przy zerowym Wyczerpaniu `Math.max(0, 0 - 1) === 0`, więc
`newExhaustion === currentLevel` i strażnik przepuszczał zapis. Błąd gryzł wyłącznie postacie,
które faktycznie coś dźwigały.

Poprawka trzyma się szkieletu dnd5e (ARCHITECTURE §8): hak nadal tylko **podmienia liczbę**
w `result.updateData`, zamiast wyzerować `restTypes.long.exhaustionDelta` i pisać poziom
samodzielnie. Dzięki temu zostaje jedno `actor.update(…, {isRest: true})`, karta odpoczynku
liczy delty z tego samego obiektu (`ActorDeltasField.getDeltas`), a `_onUpdateExhaustion`
dalej synchronizuje natywny efekt Wyczerpania. Poziom zawsze jedzie razem z `exhaustionSources`
w tym samym zapisie — inaczej strażnik z punktu 2 znów zabrałby aktorowi PW. Ostatnie źródło
kasujemy kluczem `-=exhaustionSources`, tak jak `removeExhaustion`, bo pusta tablica bywa
gubiona przez diff; strażnik rozpoznaje teraz obie pisownie.

**Świadome odstępstwo od dnd5e.** System przy `malnourished`/`dehydrated` nie redukuje
Wyczerpania **wcale**. Neuroshima blokuje tylko ten poziom, który z tych stanów pochodzi
(`restClears: false`), a Forsowanie czy Kac mają ustąpić normalnie. Nasz model jest drobniejszy,
więc rozstrzyga — uzasadnienie stoi przy `onPreRestCompleted` i w ARCHITECTURE §8.

Notatka na czat przeniesiona z dwóch `setTimeout(…, 500)` na hak `dnd5e.restCompleted`:
`result` to ten sam obiekt w obu hakach, więc wiadomość odkłada się w `result.neuroExhaustionNote`
i wychodzi dopiero wtedy, gdy odpoczynek naprawdę się odbył.

**Osobno: manifest z BOM-em wyłączał cały moduł.** `module.json` został przy v0.14.1 przepisany
przez PowerShell i dostał `EF BB BF` na początku oraz podwójnie zakodowane myślniki. Foundry
czyta manifesty przez `fs.readFileSync(…, "utf8")`, które BOM-a nie zdejmuje, więc `JSON.parse`
wywalał się na pierwszym znaku i pakiet wypadał z listy. W UI nie widać nic: `core.moduleConfiguration`
dalej mówi `true`, moduł po prostu nie istnieje. Ślad jest wyłącznie w logu serwera
(`Logs/debug.*.log`: `Error loading module … is not valid JSON`). Manifest odtworzony bajt
w bajt z gita, a numer wersji podbija teraz `npm run bump:version` (`dev/bump-version.mjs`) —
Node, UTF-8 bez BOM, z twardą asercją na BOM. **Nie edytuj `module.json` przez PowerShell.**

### v0.14.1 — `showIcon`: stany, które przestały być widoczne na żetonie (2026-08-24)

**FVTT v14 dołożył `ActiveEffectData.showIcon` i przedefiniował `isTemporary`.** `isTemporary`
to teraz wyłącznie „ma czas trwania" — status na efekcie już się nie liczy. `Token#_drawEffects`
rysuje ikonę tylko dla `showIcon === ALWAYS` albo `CONDITIONAL && isTemporary`, a schemat daje
domyślnie `CONDITIONAL`. Efekty budowane ręcznie przez moduł — bezterminowe, bo Zranienie ani
Upojenie nie mają czasu trwania — wypadły z żetonu bez śladu w konsoli. `toggleStatusEffect`
było odporne: `ActiveEffect.fromStatusEffect` ustawia `showIcon ??= ALWAYS`. Migracja rdzenia
`migrateTemporary` też podnosi `showIcon`, ale tylko dla danych **wczytywanych z dysku** —
nowo tworzone dokumenty przechodzą obok niej.

Doszło `showIcon: ALWAYS` w trzech miejscach: `combat/zranienie.mjs`, `actors/levelled-conditions.mjs`,
`actors/disease-effects.mjs`. Obie synchronizacje porównują teraz `showIcon` przy wykrywaniu
zmian, a backfill Zranienia odtwarza efekt także wtedy, gdy efekt *jest*, ale bez ikony —
inaczej naprawa nie dosięgłaby aktorów, którzy już mają stan.

**Przy okazji wyszły trzy stany, które nie wchodziły na żeton z zupełnie innych powodów:**

- **Upojenie i Skażenie** nie niosły własnego `id` w `statuses`, więc nawet z poprawnym
  `showIcon` żeton i przycisk w HUD były dwiema osobnymi rzeczami. Skażenia w ogóle nie było:
  `_buildEffect` zwracało `null`, bo ten stan nie ma `changes` — jego konsekwencje przychodzą
  jako Wyczerpanie. Ale znacznik na żetonie **jest** całą treścią tego stanu, więc dostaje efekt.
- **Choroba** (`diseased`) — `syncDiseaseEffects` pomijało wpisy bez mechaniki (`effectsFor`
  zwraca `null` np. dla Hemofilii), więc chory bohater wyglądał na zdrowego. Teraz każda choroba
  dostaje efekt ze znacznikiem, a mechanika jest opcjonalnym dodatkiem.
- **Niedożywienie i Odwodnienie** (`actors/party-supplies.mjs`) naliczały Wyczerpanie
  z oznaczonym źródłem, ale nie stawiały znacznika. To nie jest ozdoba: dnd5e czyta
  `hasConditionEffect("malnourished" / "dehydrated")` w długim odpoczynku i przy nich nie
  redukuje Wyczerpania. Zdejmuje je wyłącznie pełna racja — pół racji zostawia stan, zgodnie
  z „nie da się usunąć, dopóki nie zje pełnej dziennej porcji".

Świadomie bez zmian: **Podpalenie** zostaje ręczne (`weapons-data.mjs` mówi to wprost — moduł
nie wie, kiedy ogień gaśnie), a `falling` to zdarzenie chwilowe, nie stan — `combat/falling.mjs`
nakłada z niego Powalenie i to jest cały jego ślad.

### v0.14.0 — Manewry wręcz, inicjatywa, przerwany odpoczynek (2026-08-24)

Domknięcie czterech otwartych pozycji Fazy 1 (§1.12–§1.14).

**Zaskoczenie działało od zawsze i nie jest naszym kodem.** `prepareInitiative()` w dnd5e czyta
`hasConditionEffect("initiativeDisadvantage")`, a `surprised` siedzi w tej tablicy natywnie —
sprawdzone na żywo, `1d20 + 0` → `1d20dis + 0`. Warto było sprawdzić, bo tablica sama w sobie
niczego nie gwarantuje (patrz historia `skills.ste`), a `applyLegacyRules()` wycina z niej
`surprised` przy `rulesVersion: "legacy"`. Świat jedzie na `modern`.

**Niespodziewany atak to nowy stan `ambush`, nakładany ręcznie.** Lustrzane odbicie `surprised`,
dopisane do `conditionEffects.initiativeAdvantage`. Nie ma jak tego wyliczyć: to rozstrzygnięcie
MG o tym, kto w chwili wybuchu walki trzymał broń w garści. Świadomie **bez** przycisku
w trackerze walki — paleta stanów na żetonie jest już gestem używanym dla Zaskoczenia,
a cała wartość tego stanu leży w symetrii z nim. Ikona po skasowanym `marked`.

**`combat/melee-maneuvers.mjs` (nowy) — brat, nie potomek `weapon-save-properties.mjs`.**
Tam wyzwalaczem jest cecha broni na karcie czatu i to cecha narzuca, czym cel się broni;
tutaj wyzwalaczem jest akcja w turze, cechę RO wybiera cel, a ST bywa podmieniane wprost
(nocny ghul ma Pochwycenie ST 13 zamiast 8 + SIŁ + PB). Wspólne zostawało jedno wywołanie
`rollSavingThrow`, więc `SAVE_PROPERTIES` musiałby dostać trzy nowe tryby na trzy wyjątki.

- **ST edytowalne w oknie manewru** — to jest cała obsługa istot ze stałym ST z Bestiariusza,
  bez dotykania generowanego `bestiary-data.mjs` i bez przebudowy packa.
- **Cechę RO wybiera cel** → bierzemy tę z wyższą premią (`abilities.<ab>.save.value`).
  Pytanie gracza o wybór bez alternatywy byłoby klikaniem dla klikania.
- **Rozmiar**: idziemy za „ZASADY SZCZEGÓŁOWE" (cel maksymalnie o jeden rozmiar większy),
  nie za tabelą akcji w „WALKA" (cel twojego rozmiaru lub mniejszy) — te dwa miejsca
  w podręczniku się różnią, a szczegółowe mówi o sobie, że jest wspólne dla wszystkich.
  Przekroczenie limitu to pytanie do MG, nie blokada.
- **Odepchnięcie** liczy wektor atakujący→cel, przesuwa o 1,5 m i **przerywa ruch o ścianę**
  (`polygonBackends.move.testCollision`); alternatywa to `prone`.
- **Wytrącenie** zdejmuje `system.equipped` z wybranej broni — dnd5e nie modeluje rąk,
  więc „wypadło z ręki" nie ma lepszego odpowiednika. Ułatwienie za trzymanie oburącz
  to checkbox, bo przedmiot wybiera się dopiero po nieudanym RO.
- **Brak uprawnień do celu** kończy się kartą w czacie z gotowym ST zamiast wyjątku —
  gracz może zainicjować manewr na cudzym żetonie, rozstrzyga MG.
- Wejścia: przycisk w pasku narzędzi Żetonu, `game.neuroshima.manewry.*`, oraz przycisk
  na karcie czatu **„Z bara!"** (Brutal 2), którego cała mechanika to Odepchnięcie.
- **Aramis** dostał realne pokrycie: posiadanie Sztuczki domyślnie zaznacza Utrudnienie w RO
  celu przy Wytrąceniu. Ekonomia Akcji Bonusowej zostaje `manual` — moduł jej nie liczy.

**Przy okazji: przyciski `obalajaca` i `weapon-save-properties` nie wyświetlały się wcale.**
Oba wisiały na `renderChatMessageHTML`, które leci **przed** `ChatMessageDataModel#getHTML`,
a to nadpisuje całe `.message-content` przez `innerHTML`. Wstrzyknięcie znikało w tym samym
tiku. Poprawny hak to `dnd5e.renderChatMessage` — moduł znał tę pułapkę (komentarz
w `disease-effects.mjs`), ale te dwa pliki jej nie uwzględniały.

**Przerwany Długi odpoczynek** (`config/rest.mjs`): pole „Przerwany po (godz.)" w oknie
Długiego odpoczynku, podklasa `restTypes.long.dialogClass` zamiast dłubania w DOM. Wartość
wraca do `config` przez `mergeObject` w `BaseRestDialog`, a hak `dnd5e.longRest` zwraca `false`
— odpoczynek nigdy się nie liczy, zamiast liczyć się i być cofanym. ≥ 4 h uruchamia Krótki
odpoczynek, mniej daje wpis w czacie i nic więcej. Zegar świata zostaje nietknięty: żaden
z `restTypes` w tym świecie nie ma `advanceTime`, więc dnd5e i tak nie przesuwa czasu przy
odpoczynku. Pułapka przy rozszerzaniu: `BaseRestDialog._prepareContext` składa `formSections`
**zanim** wróci do podklasy, więc przy pustym `fields` trzeba najpierw dołożyć sekcję.

### v0.13.0 — Pochodzenia w komplecie (2026-08-23)

Pack `zdolnosci-pochodzenia` startował w v0.12.0 z jedną pozycją, bo tylko `Wychuchana spluwa`
miała kod. Teraz ma **wszystkie 36 zdolności z 12 Pochodzeń** (`config/pochodzenia-data.mjs`,
źródło: `Tabele/Pochodzenie.md`), a obok stanął drugi pack — **`pochodzenia`, 12 itemów typu
`background`**.

**Pochodzenie to `background`, nie własny typ.** Reguły dnd5e 2024 dają backgroundowi dokładnie
to, czego Neuroshima chce od Pochodzenia: podbicie Cech Bazowych i jedną zdolność z zamkniętej
listy. Slot jest na karcie, Advancement Manager go prowadzi, zdjęcie przedmiotu cofa premie —
wszystko natywne, zero linii kodu w module. Rozważana alternatywa (feat + Active Effect
+ własny panel) wymagałaby własnego UI i własnej obsługi cofania.

**Automatyzacja: 1 z 36, i tak jest napisane.** Pochodzenia dostały ten sam rejestr co Sztuczki
— pola `auto: [{what, where}]` i `manual`, badge w opisie przedmiotu, `game.neuroshima.pochodzenia.report()`.
Trzydzieści pięć wpisów mówi wprost „bez automatyki — efekt rozstrzyga MG przy stole", zamiast
udawać, że system je pilnuje. Sporo z nich to zwykłe biegłości i Ułatwienia — te dostaną
`Trait` advancement na przedmiocie zdolności, gdy przyjdzie na nie kolej; część (`Fart`,
`Telepata`, `Wierzę`) to rzeczy narracyjne, które automatyki nie dostaną nigdy.

**CSS bez przebudowy packa.** Badge'y Pochodzeń nie dostały własnych reguł — istniejące selektory
`.neuro-sztuczka-*` przyjęły aliasy `.neuro-pochodzenie-*` przecinkiem. Alternatywą było
przemianowanie klas na wspólną nazwę, ale to wymusiłoby przebudowę packa `sztuczki` (53 opisy
mają te klasy wpisane w HTML), a LevelDB jest single-writer — czyli zamknięcie gry przy każdej
kosmetycznej zmianie. Nagłówek sekcji w `styles/neuroshima.css` mówi teraz, że obsługuje oba.

**Premie cech: `AbilityScoreImprovement` z `fixed`, nie Active Effect.** Advancement zna górny
limit 20, sam się cofa przy zdejmowaniu Pochodzenia i pokazuje się w Advancement Managerze jako
krok tworzenia postaci. Active Effect na przedmiocie zrobiłby to samo liczbowo, ale byłby modyfikatorem
doklejonym do wyniku, nie zmianą Cechy Bazowej — a od Cech Bazowych zależy u nas m.in. wymaganie
wstępne klasy (`requirement.value`). `points: 0`, żeby gracz nie dostał do rozdania nic ponad
te dwa punkty (dnd5e domyślnie daje `points: 3` backgroundom w regułach 2024 — tu wyłączone).

**Pula zdolności: `allowDrops: true`, świadomie.** Spec na poz. 5 dobiera **drugą** zdolność
ze swojego Pochodzenia, a Sztuczka `Patriota` **kolejną**. Spec dostał własny `ItemChoice`
(`classes-data.mjs` miał stałą `POCHODZENIE` od v0.6.0, ale `buildClass` ją pomijał z komentarzem
„origins are out of scope this pass" — teraz nie jest), tyle że z pulą **wszystkich 36** zdolności:
dnd5e nie potrafi uzależnić puli advancementu od tego, jaki background nosi postać. `Patriota`
idzie przez zwykłe przeciągnięcie z kompendium. Alternatywą był hook filtrujący pulę po
`system.details.background` — odrzucone, bo to kod pilnujący czegoś, co MG i tak widzi na karcie.

**Slot na karcie był zarezerwowany od v0.9.0.** `config/srd-cleanup.mjs` ukrywa pigułkę
„Dodaj gatunek" (ras w Neuroshimie nie ma), ale „Dodaj Pochodzenie" zostawia — z komentarzem,
że czeka na origins. Teraz doczekała.

**Walidator: druga awaria tej samej klasy.** Wykrywanie zajętej bazy sprawdzało `err.code`,
a `classic-level` opakowuje błąd blokady — `code` to `LEVEL_DATABASE_NOT_OPEN`, a `LEVEL_LOCKED`
siedzi na `err.cause`. Zamiast czytelnego „zamknij FoundryVTT" leciał surowy stack trace.
Poprawione; `dev/packs/build-packs.mjs` miał to dobrze od początku.

**Migracja postaci wykonana — `migration/migrate-pochodzenia.mjs`.** 13 postaci dostało Pochodzenie
w slocie: 10 wywnioskowanych z ręcznie zrobionych feat'ów przeniesionych z Roll20 (`Fart` → Vegas,
`Doktor Quinn` → Teksas, …), 3 wylosowane k12, bo nie było czego wnioskować (Kier, Raynald, Victor).
Duplikaty feat'ów skasowane — na żadnej postaci nie został już ręczny odpowiednik pozycji z packa.

Kluczowe: **MG miał premie +1/+1 już wliczone w spisane Cechy Bazowe.** Nałożenie Pochodzenia
podwoiłoby je, więc migracja odejmuje premię tuż przed uruchomieniem Advancement Managera, a ten
dokłada ją z powrotem. Na karcie zero zmian (zweryfikowane co do punktu na wszystkich 13), ale +1/+1
siedzi teraz w `value` advancementu — czyli zdjęcie Pochodzenia je poprawnie cofnie. Manifest
cofania migracji: `dev/backup/pochodzenia-migracja-2026-08-23.json`.

Pominięte świadomie: 6 pustych szablonów po imporcie (jeden placeholder klasy, wszystkie cechy 10)
i 3 aktorów technicznych bez klasy (`Zbrojownia`, `TESTCHAR`, `TESTER`). Skrypt jest idempotentny —
przy ponownym uruchomieniu raportuje tylko pominięcia.

**Migracji nie da się napisać bez UI.** `AdvancementManager` trzyma `#forward` i `#complete` jako
pola prywatne, a `advancement.apply()` pisze przez `actor.updateSource()`, czyli do *klona* managera,
i dodatkowo czyta `configuration.fixed` wyłącznie przy `{ initial: true }`. Wywołane wprost nie
zmienia niczego, co przetrwa — pierwsze podejście do testów wyglądało na sukces, a nie zapisało nic.
Jedyne publiczne wejście to handler `data-action`, więc skrypt klika przyciski własnego managera.
Skutek uboczny tej samej zasady: **`actor.deleteEmbeddedDocuments("Item", …)` nie cofa advancementów** —
cofanie żyje w `Item5e#deleteDialog()`, czyli w ścieżce UI. Skrypt kasujący Pochodzenia hurtem
zostawiłby postacie z zawyżonymi cechami.

**`scripts/weapons/icons.js` skasowany.** Domknięcie sprawy otwartej 2026-08-21. Plik nie był
importowany przez nic od czasu usunięcia martwego `scripts/main.js`, a jego zadanie przejęły
dwa lepsze mechanizmy: hook `preCreateItem` w `config/weapons.mjs` (nazwa kanoniczna → ikona,
plus aliasy i fallback per typ broni) oraz pole `icon` przy każdej z 34 pozycji
w `config/ammo-data.mjs`. Rozmyte dopasowanie po słowach kluczowych, jedyne czego tam nie ma,
i tak było wadliwe: reguła `"bolt"` (karabin powtarzalny) stała przed regułą amunicji i zjadała
bełty do kuszy, klucz `"ar"` łapał *Barrett*, a hook nadpisywał ikony ustawione ręcznie przez MG.

### v0.12.0 — Koniec panelu prototypowego zdolności (2026-08-22)

Na górze zakładki „Szczegóły" każdej karty aktora siedział rozwijany panel
**„Prototyp: zdolności aktora / pionka"** — siedem zdolności wpływających na broń, każda
z parą list rozwijanych (aktor / pionek: *dziedzicz / włącz / wyłącz*). Powstał, zanim
w module istniały jakiekolwiek packi ze zdolnościami: skoro nie było czego posiadać,
zdolność trzeba było zadeklarować flagą.

Dziś każda z tych siedmiu ma realny przedmiot, więc panel dublował informację, którą i tak
widać na karcie — i mógł jej zaprzeczyć. Usunięty w całości: panel, obie warstwy flag
(`flags.<mod>.abilities` na aktorze i na pionku), settery, blok CSS i połowa
`mod.api.abilities`.

**Co zostało w `actors/abilities.mjs`** — sam most. `hasAbility(actor, KEY)` odpytuje teraz
wyłącznie przedmioty na karcie, a mapowanie deklarują same dane, nie resolver:

| Klucz | Realny przedmiot | Pack | Deklaracja |
|---|---|---|---|
| `jakDbaszTakMasz` | zdolność klasowa | `zdolnosci-klasowe` | `legacyAbilityKey` |
| `gradOlowiu`, `ruchomeGniazdoCkm`, `szturmowiec` | Sztuczka o tej samej nazwie | `sztuczki` | `legacyAbilityKeys` |
| `szybkaWymiana` + `szybkiePrzeladowanie` | Sztuczka `Szybkie palce` — obie naraz | `sztuczki` | `legacyAbilityKeys` |
| `wychuchanaSpluwa` | zdolność z Pochodzenia | `zdolnosci-pochodzenia` | `legacyAbilityKey` |

**Nowy pack `zdolnosci-pochodzenia`** (`config/pochodzenia-data.mjs`, 1 pozycja).
`Wychuchana spluwa` to zdolność z Pochodzenia (Federacja Appalachów, k6: 3–4), a Pochodzenia
jako całość czekają na własny przebieg. Pack startuje z tą jedną, bo tylko ona spoza klas
i Sztuczek jest realnie egzekwowana przez kod (`weapons/jams.mjs` — odporność wybranej broni
na zacięcia). Kształt wpisu jest taki sam jak u Sztuczek, więc dopisanie pozostałych 35
zdolności to uzupełnienie tablicy. *(Zrobione w v0.13.0 — patrz wyżej.)*

**Przy okazji**: cztery Sztuczki dostały niepuste `auto: [{what, where}]`, więc
`game.neuroshima.sztuczki.report()` przestaje je liczyć jako „bez automatyki", a badge
w opisie przedmiotu mówi prawdę.

**Utracona możliwość**: jawne *wyłączenie* zdolności, którą postać posiada (tri-state dawał
„Wyłącz" nadpisujące realny przedmiot, osobno per pionek). Nikt tego nie używał — w świecie
były 3 aktorzy z flagami, wszyscy testowi, i 0 flag na pionkach.

**Sprzątanie po stronie wywołań**: argument `{ tokenDocument }` przy `hasAbility()` był
resztką po nadpisaniach per pionek i nic już nie robił — usunięty z 12 wywołań w
`fire-modes.mjs` / `jams.mjs` / `magazine.mjs`, razem z trzema osieroconymi helperami
`_getItemToken()` / `_getActorToken()`.

**Walidator packów naprawiony przy okazji.** `dev/packs/validate-packs.mjs` nie ruszał się od
czasu, gdy pack `sztuczki` był pusty: `byId` budował się wyłącznie z zdolności klasowych i profesji,
więc **każde** UUID Sztuczki w puli klasy raportował jako `dangling`, a pule poziomów
„Zdolność z profesji / Sztuczka" mierzył wobec samych zdolności profesji (`pool 57, expected 4`).
Kilkaset fałszywych błędów, `exit 1` od v0.10.0 — czyli walidacja packów nie działała od trzech
wersji. Teraz liczy też Sztuczki i nowe Pochodzenia: `all checks passed`.

**Audyt trackera.** Skoro walidator zamarł w przeszłości, ten sam test przeszedł cały
`IMPLEMENTATION.md`. Pięć wpisów opisywało nieistniejący stan: *Compendia broń i pancerze*
i *Armor handling* stały jako `[ ]` mimo zamknięcia w v0.11.0, *PD thresholds* mimo v0.6.0,
*Pasywna Percepcja* jest natywna w dnd5e i nigdy nie wymagała kodu, a licznik automatyki
Sztuczek mówił 2/53 zamiast 6/53. Doszła też legenda znaczników — `[—]` oznacza teraz
**świadomą decyzję, że czegoś nie robimy**, wcześniej nieodróżnialną od zaległości
(sześć takich wpisów udawało `[ ]`).

### v0.11.0 — Broń i pancerze jako kompendia (2026-08-23)

Dwa ostatnie brakujące kompendia. Do tej pory broń istniała wyłącznie jako 75 itemów na
aktorze **Zbrojownia**, a pancerzy nie było w świecie w ogóle — sześć sztuk typu `equipment`
to były resztki SRD na demo-aktorach.

**Broń** (`config/weapons-data.mjs` → pack `bron`, 74 pozycje)

- Złożone z **dwóch** źródeł, bo żadne nie było kompletne: tabele
  (`BronPalna.md`, `BronBiala.md`, `BronMiotana.md`) dały wagi i ceny — na Zbrojowni 49/75
  pozycji miało `weight: 0`, a 28/75 `price: 0` — a Zbrojownia dała ikony i kalibry.
  Rozstrzygające są tabele; Zbrojownia służyła wyłącznie do kontroli krzyżowej.
- **Zbrojownia przestaje być źródłem prawdy, ale zostaje jako aktor.**
  `zbrojownia-sync.mjs` stoi na niej i działa bez zmian; `game.neuroshima.createWeapons(aktor)`
  zasiewa ją z tego samego pliku danych, co pack — dopisuje i aktualizuje po nazwie,
  **nigdy nie kasuje**, więc ręczne dopiski MG przeżywają ponowne zasianie.
- **Trybów ognia nie ma w danych.** Buduje je na żywo `weapons/fire-modes.mjs`
  z właściwości broni; zapisanie ich do packa zamroziłoby wynik i podwoiło aktywności
  po pierwszym przeliczeniu. `system.activities` w packu jest celowo puste.
- `WEAPON_ICON_MAP` w `config/weapons.mjs` nie jest już drugą listą 85 nazw do ręcznego
  utrzymania — wyprowadza się z `WEAPON_ICONS` plus aliasy nazw ze świata.
- Zestawy dozwolonych właściwości per kategoria były węźsze niż tabele: broń miotana
  nie miała `wmag` ani cech RO-przy-trafieniu, żadna broń palna nie miała `amm`,
  długa nie miała `dublet`. Poszerzone.
- **Zmiana zachowania w `weapons/ammo.mjs`:** flaga `fixedDamage` blokuje nadpisanie
  formuły obrażeń przez formułę kalibru. Bez tego wybór .12 Ga sprowadzał Pompę (4k4)
  i Dwurówkę (3k4) do wspólnych 2k4. Dotyczy 9 sztuk broni, które w tabelach mają
  własne kostki niezależne od naboju.

**Pancerze** (`config/armor-data.mjs` + `config/armor.mjs` + `actors/armor-rules.mjs` → pack `pancerze`, 17 pozycji)

- **Override `CONFIG.DND5E` bez zawężania schematu.** `equipmentTypes` w dnd5e 5.3 to
  **płaska kopia** `miscEquipmentTypes` + `armorTypes` robiona raz przy ładowaniu
  (`config.mjs:1657`) — mutowanie samych źródeł nie wystarcza, trzeba przebudować wszystkie trzy.
  Kluczy `light`/`medium`/`heavy`/`natural`/`shield` **nie usuwamy**, tylko zmieniamy etykiety:
  `equipment.mjs:150` liczy `isArmor` przez `type.value in CONFIG.DND5E.armorTypes`,
  więc usunięcie ich zabiłoby liczenie KP. Zawężenie jest bezpieczne, bo
  `equipment.mjs:66` używa `ItemTypeField` **bez `choices`** — sprawdzone na żywo:
  wszystkie 6 przedmiotów SRD na demo-aktorach dalej się ładują z poprawnym KP
  (ARCHITECTURE.md §2).
- `armorIds` i `shieldIds` wyczyszczone — SRD-owa lista „Leather/Chain Shirt/Plate" nie ma
  czego szukać w Neuroshimie.
- **Cztery reguły, których moduł nie miał:**
  - **Próg obrażeń** — hak `dnd5e.calculateDamage`. Natywne `attributes.hp.dt` odpada
    z dwóch powodów: jest zdefiniowane tylko dla NPC/pojazdów, nie dla postaci, i dotyczy
    **wszystkich** typów obrażeń, a neuroshimowy próg łapi tylko obrażenia kinetyczne.
    Sumuje cięte + kłute + obuchowe **po** odpornościach.
  - **Odporność kinetyczna** — zwykły Efekt Aktywny przedmiotu na `system.traits.dr.value`,
    żeby położyło się na karcie tam, gdzie gracz tego szuka.
  - **Kara za brak wyszkolenia** — Utrudnienie na `abilities.str|dex.check|save.roll.mode`
    w danych pochodnych (łapi też Umiejętności i Narzędzia, bo `#rollSkillTool` składa
    tryb Cechy z trybem Umiejętności) plus hak `dnd5e.preRollAttack` na Testy Ataku.
    Świadomie **nie** `postBuildAttackRollConfig` — ten odpala się wyłącznie przez okno
    dialogowe, więc makro z `configure:false` przepuściłoby karę.
  - **Kara prędkości za zbyt niską SIŁĘ** — −4,5 m. Pole `system.strength` istnieje
    w schemacie dnd5e 5.3, ale system nic z nim nie robi.
- **Naprawiony martwy `stealthDisadvantage`.** dnd5e ma na sztywno wpisane
  `skills.ste.roll.mode`, a `config/skills.mjs` dawno przemianował Skradanie się na `skr` —
  natywna reguła pisała więc do pola, którego nie ma w `CONFIG.DND5E.skills` i którego nic
  nie czyta. W świecie **żadna** zbroja nigdy nie dała Utrudnienia do Skradania.
  Przepięte na `skr`.
- **Konsekwencja dla Cichego kroku** (`actors/cichy-krok.mjs`): klauzula „nie otrzymujesz
  Utrudnienia do Skradania się za noszenie pancerza" miała dotąd puste pole do działania.
  Teraz jest realizowana przez `registerStealthExemption()` w danych pochodnych, a nie
  w haku rzutu — `dnd5e.postBuildSkillRollConfig` odpala się wyłącznie przez okno dialogowe,
  więc anulowanie zrobione tam przeciekałoby przy każdym rzucie z pominięciem dialogu.
- **Czego świadomie nie automatyzujemy** (§5 — reguła wypisywana graczowi, nie milcząca):
  szczelność i zapas tlenu, „Skradanie niemożliwe" w pancerzach wspomaganych
  (moduł nakłada tylko Utrudnienie, resztę rozstrzyga MG), Krytyczna ochrona hełmu,
  trzy akcje tarczy, wytrzymałość pancerzy, sen w pancerzu, pływanie, czas zakładania
  i zdejmowania oraz mnożniki ceny pancerza dla zwierząt. Wszystko ląduje w polu `manual`,
  jest drukowane w opisie przedmiotu, wyskakuje jako ostrzeżenie przy zakładaniu
  i da się zebrać przez `game.neuroshima.pancerze.report()`.
- **Ikony pancerzy to na razie ścieżki bez plików** (`icons/armor/<id>.svg`) — przepuszczenie
  ich przez `dev/icons/process_grid_N.py` jest odsunięte na osobne zadanie.

**Znane rozjazdy do decyzji MG** — nazewnictwo w świecie vs tabele: `Bejsbol` i `Rurka`
to w tabelach jedna pozycja `Bejsbol/Rurka`; `Trzydziestka` → `Trzydziestka ósemka`;
`AK` → `AK (Kałach)`; obie kusze mają w tabeli dłuższe nazwy. Aliasy w
`WEAPON_NAME_ALIASES` pilnują, żeby `createWeapons()` nie zrobiło duplikatów, ale samą
zmianę nazw na istniejących itemach zostawiam MG. Osobno: **Oszczep** jest w tabeli bronią
białą z właściwością „rzucana", a w świecie ma typ `miotana`.

### v0.10.0 — Chemia, Sztuczki i trzy nowe kompendia (2026-08-23)

**Chemia, leki i narkotyki** (`config/chemia-data.mjs` + `items/chemia.mjs`)

- 35 pozycji z `ChemiaIDrugi.md` w jednym pliku danych: leki przewlekłe, bojowe, popromienne,
  antybiotyki, narkotyki, używki i materiały pirotechniczne. Zastępuje `medicine-data.mjs` (12 pozycji,
  skasowany). Jedno źródło prawdy dla kompendium `lekarstwa`, panelu zdrowia i runtime'u.
- Każda pozycja to `consumable` typu `lekarstwo` z podtypem, `uses` + `autoDestroy`, aktywnością
  „Zażyj" i item-level Active Effects — dokładnie tak, jak SRD robi mikstury i trucizny.
- **Efekty odroczone bez hooka od wygaśnięcia.** dnd5e 5.3 samo w sobie nie ma czegoś takiego
  jak „zrób coś, gdy ten efekt się skończy" (`grep expir` po `module/` daje zero trafień) — ⚠️
  ale to zły katalog: Foundry v13+ ma taki mechanizm w **rdzeniu** (`ActiveEffectRegistry`,
  patrz `podpalenie.mjs` i DEV_GUIDE.md §10e). Nie zmienia to wniosku poniżej — rejestr rdzenia
  domyślnie tylko oznacza `duration.expired = true`, nie odpala żadnej naszej logiki — więc
  „po zejściu z Anestixu" nadal jest złożone z czterech kawałków, z których każdy sam w sobie
  jest natywny: (1) prawdziwe `duration` na AE, żeby HUD odliczał; (2) rekord w
  `flags.<mod>.chemiaPending`; (3) obserwator `updateWorldTime` — uzasadniony tym, że
  `Combat#nextRound` przesuwa czas świata, więc walka rozlicza się sama; (4) przycisk
  **Rozlicz teraz** na karcie czatu, na wypadek gdy czas nie idzie. Przetestowane na żywo:
  Anestix rozlicza się i przez upływ czasu, i przyciskiem.
- **Painkiller** — kara skalowana dawką: jeden efekt przebudowywany przy każdej tabletce
  (nigdy stos efektów), −1 do testów MDR za dawkę, `unconscious` gdy liczba dawek przekroczy
  wartość Mądrości, kasowane na odpoczynku. Zweryfikowane na 9 dawkach przy MDR 8.
- **Limity dobowe** (Medpak 2/dobę, AR-35 1/dobę) na fladze `chemiaDoses = {klucz: {day, count}}`
  spiętej ze światowym licznikiem `dayCounter`, tym samym, co obsługuje Zachód słońca.
- **Przedawkowanie AR-35** — rzut k100 vs 75% jest zautomatyzowany, ale *uśmiercenie postaci
  nie*: przy porażce karta pokazuje przycisk **Potwierdź śmierć** dla MG. Automat, który sam
  zabija BG, to nie jest automat, którego się chce.
- **Szał bojowy** — osobny AE ze stanem, RO Mądrość ST 20 **na końcu tury** przez
  `combatTurnChange` (nie `updateCombat`: tam `combat.combatant` jest już przesunięty i rzut
  spadłby na następną postać), a po ustaniu szału `incapacitated` + Wyczerpanie.
- **Wyczerpanie z własnym kolorem**: nowe źródło `deadline` w `config/exhaustion.mjs`
  (czerwony pik), tak jak `choroba` dostała swój w v0.9.6.
- **Zasada domowa: mechanika, która działa po cichu, to błąd.** Wszystko, czego moduł nie
  egzekwuje, siedzi w polu `mech.manual` i ląduje na karcie czatu pod nagłówkiem
  „Nie automatyzujemy" — np. przymus atakowania w szale albo regeneracja Deadline'u poza walką
  (10 minut to 100 tur, tury istnieją tylko w inicjatywie).
- Podwójne karty rozwiązane markerem `neuroSilent` w konfiguracji użycia aktywności
  (przetrwa `deepClone` w `_prepareUsageConfig`), a nie ślepym wyciszeniem — lek na chorobę
  przewlekły wzięty wprost z ekwipunku dalej dostaje własną kartę.

**Sztuczki** (`config/sztuczki-data.mjs`, kompendium `sztuczki`)

- 53 Sztuczki przepisane z `Tabele/Sztuczki.md`, w 9 kategoriach, wpięte w pulę `ItemChoice`
  po obu stronach (klasy i profesje). Pack przestał być pusty.
- **Rejestr pokrycia**: każdy wpis deklaruje `auto: [{co, gdzie}]` i opcjonalne `manual`.
  Z tego wychodzi status `auto`/`partial`/`none`, kolorowa plakietka w opisie przedmiotu
  i raport `game.neuroshima.sztuczki.report()`. Dziś: 1 auto, 1 partial, 51 bez mechaniki —
  i to jest widoczne, zamiast udawać, że działa. Bonusy do cech („+1 ZRC lub MDR”) **nie**
  liczą się jako automatyzacja.

**Nowe kompendia**

- `amunicja` (20, z `ammo-data.mjs`), `granaty` (12, z `GRENADE_TYPES`),
  `narzedzia` (22, z `toolkits-data.mjs` — każde z aktywnościami typu `check` per zastosowanie).
  Wszystkie budowane z tych samych plików danych, których używa runtime.
- Granaty zostają typem `ammo`, żeby `grenade-inventory.mjs` dalej je znajdował.
- Brakujące kompendia (**broń**, **pancerze**) mają teraz jawne TODO w `build-packs.mjs`
  z opisem, czego brakuje: nowych `weapons-data.mjs` / `armor-data.mjs` z `podrecznik.md`.

**Poprawki**

- **Kompendium `lekarstwa` było puste.** Winne było gołe `*.log` w `.gitignore`, które łapało
  WAL LevelDB. Wzorzec zawężony do `logs/*.log`. W repo wendorującym LevelDB gołe `*.log`
  nigdy nie jest bezpieczne.
- **Item-level Active Effects nie trafiały do packa.** `effects` to pole *hierarchiczne*
  (`EmbeddedCollectionField.hierarchical === true`), więc Foundry trzyma je pod własnym
  prefiksem klucza — `!items.effects!<itemId>.<effectId>` — a w samym przedmiocie zostają
  tylko identyfikatory. Wpisana inline tablica `effects` czyta się z powrotem jako pusta,
  po cichu. `writePack` rozbija je tak samo, jak `writeActorPack` rozbija `!actors.items!`.
- `dnd5e.preUseActivity` przekazuje **cztery** argumenty (`activity, usageConfig, dialogConfig,
  messageConfig`). Uchwyt chemii deklarował trzy i wyciszał kartę na złym obiekcie.
- Panel Surowców nie wypisuje już stosów o zerowej ilości — „masz 0 kg nitrogliceryny" to nie
  jest informacja. Gdy nic nie zostało, panel znika w całości.

**Porządki**

- Skasowane trzy martwe pliki: `add-weights.mjs` (jednorazowa migracja wag amunicji, dawno
  zastosowana), `main.mjs` w katalogu głównym (pusty, `module.json` ładuje `scripts/main.mjs`)
  oraz `scripts/combat/forsowanie.mjs` (zastąpiony przez `rerolls.mjs`, nieimportowany od dawna
  i oznaczony jako DEPRECATED w tabeli plików).
- `ARCHITECTURE.md` dostał dwa brakujące niezmienniki: „packi to artefakty builda" (z pułapką
  pól hierarchicznych) i „automatyzacja jest deklarowana, nigdy cicha".
- TODO na brakujące kompendia w `build-packs.mjs` przepisane z rozpoznaniem w ręku — z liczbami,
  ścieżkami do tabel źródłowych i wskazaniem, czego naprawdę brakuje (patrz
  `HANDOFF_bron_pancerze.md`).

### v0.9.6 — Przegląd wszystkich chorób (2026-08-22)

**Gorszy stan nie może być łagodniejszy od poprzedniego.** W danym momencie aktywny jest
tylko jeden Active Effect na chorobę, więc każdy stan opisuje **sumę**, a nie przyrost.
Podręcznik tak nie pisze — wymienia nowy objaw i milczy o poprzednich, co czytane
dosłownie leczyło ból pleców w chwili, gdy zaczynał się krwotok. Brakujące kary są teraz
wypisane wprost w każdym stanie:

| Choroba | Stan | Było | Jest |
|---|---|---|---|
| Szaleństwo bostońskie | 2 | **żadnych kar** — najgorszy stan łagodniejszy niż średni | Utrudnienie do Testu Intelektu i Charyzmy |
| Osteoporoza | 2 | tylko pół szybkości | + Test/RO Siły, Ataki Siłą |
| Paranoja | 2 | tylko `frightened` | + kary Intelektu/Roztropności i Wpływania ze stanu 1 |
| Syndrom Thurmana | 2 | tylko Intelekt = 2 | + Test Charyzmy |
| Niewydolność krążenia | 2 | same Testy Cech | + wszystkie RO i Ataki („wszystkie Testy”) |
| Zaburzenia błędnika | 1 | gubił warunek pasażera | warunek wrócił |
| Zaburzenia błędnika | 2 | same Testy Cech | + wszystkie RO i Ataki |

Utrata *premii* przy pogorszeniu (Ułatwienie Paranoi, Ułatwienie w Zastraszaniu przy
Szaleństwie) nie jest złamaniem tej zasady — to właśnie choroba postępuje.

**Syndrom Draculi parzy światłem.** `tick` miał typ `bludgeoning`; poparzenia słoneczne
zadają teraz obrażenia typu `light` („Od światła”), który i tak był już w konfiguracji.

**Choroby nabyte wreszcie coś robią.** `saveDC` przy chorobie popromiennej i szczurzej
gorączce było martwą daną — nie czytał go żaden kod, a Zachód słońca pomijał te wpisy,
bo nie mają drabinki stanów. Zastąpiło je `dailySave: { dc, success }` i Zachód słońca
rzuca za nie RO na Kondycję:

- **zdane** — szczurza gorączka mija; choroba popromienna przechodzi w losową chorobę
  przewlekłą (k8), zachowując to samo `id` wpisu, żeby wiersz na karcie nie skakał;
- **oblane** — poziom Wyczerpania ze źródła **Choroba** (nowy klucz, fioletowy pips)
  i utrata korzyści z odpoczynku na następny dzień.

**Odpoczynek naprawdę nie działa.** Flaga `noRestDay` trzyma numer dnia, a haki
`dnd5e.preShortRest` / `dnd5e.preLongRest` anulują odpoczynek z komunikatem. dnd5e nie
ma trybu „odpoczynek, który nic nie leczy”, a odpoczynek cicho nic nie robiący byłby
gorszy niż taki, który mówi dlaczego. Flaga starzeje się sama — licznik dni idzie tylko
do przodu.

**Świadomie bez automatyki:** choroba zakaźna (RO to test zarażenia od kogoś innego)
i Death Breath (jednorazowa przemiana w zombie). Oba mają kadencję, której system nie
widzi; `saveNote` zostaje jako proza na panelu, żeby było widać, że to robota MG.

### v0.9.5 — Jedno wejście do wszystkich torów (2026-08-22)

`game.neuroshima.conditions.set(actor, "zranienie", n)` **nie robiło nic** — `setLevel`
sięgało wyłącznie do magazynu flagowego `levelled-conditions.mjs`, a Zranienie ma swój
własny w `combat/zranienie.mjs`. Zwracało 0, co przy stanie 0 wygląda dokładnie jak
sukces. Kosztowało to osierocony Efekt „Zranienie: Krytyczny" na Piekarzu przy
Szybkości 3 m i poziomie rany 0.

- `get`/`set`/`adjust` idą teraz przez rejestr `HUD_CYCLE`, czyli przez writer
  właściciela toru — ta sama ścieżka co klik w HUD i klik w pips. Efekt, czat i VFX
  odpalają się tak samo bez względu na to, skąd przyszło wywołanie.
- **Nieznane id rzuca wyjątkiem** z listą dostępnych. Cicha zerowa odpowiedź była tu
  gorsza niż błąd, bo nie da się jej odróżnić od stanu czystego.
- Nowe `C.tracks()` zwraca cały rejestr — to, z czego panel Stan i tak już korzystał
  przez `getLevelledRegistry()`.
- Flagowe `getLevel`/`setLevel`/`adjustLevel` przestały być eksportowane: to magazyn
  dwóch konkretnych stanów, nie API ogólne. Granica jest teraz widoczna w kodzie.
- `LevelledTrack` jako typedef; `registerHudLevelled` i `getLevelledRegistry` na niego
  wskazują, więc `summary` przestało ginąć w opisach.

Dokumentacja: `DEV_GUIDE.md` §10a.

Pliki: `scripts/actors/levelled-conditions.mjs`, `scripts/main.mjs`.

### v0.9.4 — Choroba mówi, kiedy zadziałała (2026-08-22)

Utrudnienie z Efektu Aktywnego jest przy stole niewidzialne: okienko rzutu wstaje już
ustawione i nikt nie pamięta dlaczego. Ułatwienie oczywiście pamiętają wszyscy.

- Pod każdym k20, który choroba nagięła, pojawia się tag z jej nazwą i kierunkiem
  (`Szaleństwo bostońskie: Utrudnienie`). Widzą go wszyscy, nie tylko MG — to gracz
  potrzebuje przypomnienia.
- Atrybucja czyta klucze `roll.mode` Efektów, więc działa dla Testów Umiejętności, Cech
  i RO bez osobnej tabeli. Ataki korzystają z `neuroDiseasePenalty` zapisanego już wcześniej
  przez `_onPostBuildAttackRollConfig` — flaga, która do tej pory nie miała odbiorcy.
- Choroba dająca do tego samego rzutu i Utrudnienie, i Ułatwienie sumuje się do zera
  i nie dostaje tagu, bo faktycznie niczego nie zmieniła.
- Wpisy chorób i fobii w panelu Stan dostały ten sam tooltip co pipsy: pogrubiony
  nagłówek `Nazwa 1/3 — Przewlekły` i tekst etapu rozbity na punkty. Fobia dokłada
  licznik zdanych RO.

Pliki: `scripts/actors/disease-effects.mjs`, `scripts/actors/health-panel.mjs`,
`styles/neuroshima.css`.

### v0.9.3 — Tooltipy pipsów liczą sumę kar (2026-08-22)

Tor wypełnia się ciągle od lewej, więc pips *n* nigdy nie znaczy „ten jeden poziom” — znaczy
„tyle, ile masz, stojąc na *n*”. Tooltipy mówią to wprost, jak wpisy chorób.

- `registerHudLevelled` przyjmuje teraz opcjonalne `summary(level) → { title?, lines[] }`.
  Właściciel toru zna swoje kary, panel Stan tylko je wyświetla — ta sama inwersja zależności
  co przy `get`/`set`.
- **Upojenie** (kumulatywne) zwraca wiersze 1..*n* z `UPOJENIE_LEVELS`, verbatim z podręcznika.
- **Zranienie** zwraca kary z `ZRANIENIE_LEVELS` plus nazwę stopnia w nagłówku
  (`Zranienie 2/4 — Znaczny`). `_buildZranieniDescription()` korzysta teraz z tego samego
  źródła, więc opis w czacie i tooltip nie mogą się rozjechać.
- **Wyczerpanie** liczy arytmetycznie z `CONFIG.DND5E.conditionTypes.exhaustion.reduction`
  (−2/poziom do k20, −1,5 m Szybkości), więc zmiana nadpisania w `config/exhaustion.mjs`
  automatycznie przechodzi do tooltipów. Na 6/6 dochodzi „Śmierć”.
- **Skażenie** świadomie bez `summary` — jego poziomy to pasma ST, nie kary. Generyczna
  implementacja daje pustą listę sama z siebie (wiersze `SKAZENIE_LEVELS` nie mają `text`),
  więc nie ma tu żadnego wyjątku do utrzymania.
- Tooltipy przeszły z `data-tooltip` na `data-tooltip-html` + `data-tooltip-class`, bo lista
  wypunktowana nie mieści się w zwykłym tekście.

Pliki: `scripts/actors/levelled-conditions.mjs`, `scripts/actors/sheet-shell.mjs`,
`scripts/combat/zranienie.mjs`, `styles/neuroshima.css`.

### v0.9.2 — Panel Stan jako jedyne miejsce na stan (2026-08-22)

Sprzątanie po v0.9.1: skoro panel Stan istnieje, wszystko inne rozsypane po arkuszu jest
dublem. Górna część paska bocznego wraca do dnd5e.

- Pasek skrótu `WY n/6` / `ZR n/4` spod punktów wytrzymałości **usunięty** — powtarzał to,
  co panel mówi dokładniej dwa cale niżej (`_buildGlance` skasowane).
- Odczyt `WY n/6` z nagłówka panelu **usunięty** — pipsy już to pokazują.
- Listwa aktywnych chorób/fobii przeniesiona z `.sidebar .stats` na dół panelu Stan, pod
  przycisk Skażenia. `health-panel.mjs` eksportuje teraz `buildHealthStrip()`, a `_injectStrip()`
  zniknęło — panel Stan składa ją sam. Osobna stylistyka (kursywa, listwa z lewej, tło),
  żeby czytała się jako raport, nie kontrolka; rozmiar pisma bez zmian (9 px).
- Nagłówek `♥ STAN` przeniesiony na środek górnej krawędzi ramki, w stylu `legend` — panel
  i nagłówek dzielą `--neuro-stan-bg`, więc tło przykrywa obramowanie bez dobierania koloru
  do tła arkusza. Zwolniony cały wiersz wysokości panelu.

Pliki: `scripts/actors/sheet-shell.mjs`, `scripts/actors/health-panel.mjs`, `styles/neuroshima.css`.

### v0.9.1 — Skażenie jako rzut, Wyczerpanie ze źródłem (2026-08-22)

Rewizja panelu Stan po pierwszym kontakcie z nim. Skażenie było w nim czwartym torem pipsów,
ale jego cztery poziomy to **pasma natężenia** — ST godzinowego RO na Kondycję, cecha miejsca,
nie postaci. Kliknięcie trzeciego pipsa nic nie robiło i nic nie znaczyło, a prawdziwy licznik
(oblane RO, trzy do choroby popromiennej) był w ogóle niewidoczny. Przy okazji wyszły dwa błędy.

- **Skażenie przestaje być torem.** Rząd `neuro-stan-rad`: etykieta jest przyciskiem
  (`☢ SKAŻENIE`, taśma ostrzegawcza w tle), a obok trzy nieklikalne znaczniki = oblane rzuty.
  Kliknięcie otwiera `promptRadiationSave()` — MG wybiera pasmo (`Niski ST 10` … `Zabójczy ST 25`),
  leci RO na Kondycję, `seqScrollText` pokazuje `ODPORNY` albo `+1 WYCZERPANIE`.
  **ST jest podawany per rzut** — zapisany poziom `skazenie` nie jest już przez to dotykany
  (nadal żyje: karmi HUD tokena i ikonę stanu, ale nie udaje toru na arkuszu).
- **Poprawka: trzecia porażka nagradzała chorobę w kółko.** Warunek `failures >= 3` nigdy nie
  zerował licznika, więc przy 4., 5., 6. porażce znów ogłaszał chorobę popromienną. Teraz choroba
  jest przyznawana raz (ze sprawdzeniem `getChoroby`), a licznik wraca do zera.
- **Poprawka: martwy hook tooltipów Wyczerpania.** `config/exhaustion.mjs` dopisywał źródła do
  tooltipów **natywnych** pipsów — tych, które §1.15 ukryło CSS-em. Funkcja `onRenderActorSheet`
  i jej rejestracja usunięte; źródła prezentuje teraz panel Stan.
- **Wyczerpanie niesie źródło.** `EXHAUSTION_SOURCES` dostało pole `color`; panel maluje nim pipsy,
  więc rzut oka na tor mówi, *na co* postać cierpi, a nie tylko ile tego ma.
- Suma Wyczerpania przeniesiona do nagłówka panelu; kolumna `n/max` z rzędów zniknęła.

Pliki: `scripts/actors/sheet-shell.mjs`, `scripts/actors/levelled-conditions.mjs`,
`scripts/config/exhaustion.mjs`, `styles/neuroshima.css`.

### v0.9.0 — Własna powłoka arkusza (2026-08-22)

Domknięcie §1.15. Do tej pory arkusz był stockowym `dnd5e` z piętnastoma wstrzykiwaczami
doklejającymi treść po renderze — działało, ale nikt nie kontrolował samej ramy: zakładka czarów
zostawała, Zranienie i Wyczerpanie siedziały w dwóch osobnych rogach paska bocznego (etykieta
`WYCZERPANIE` opisywała w praktyce pipsy Zranienia poniżej), a cztery panele zasobów tłoczyły się
na dole Ekwipunku. Ten wpis dokłada cienką podklasę, która przejmuje `PARTS` i `TABS`, i nic więcej
— **wariant (C) Hybryda** z `PLAN_sheet_shell.md` §2. Cała treść nadal powstaje z hooków `render*`,
więc żaden z piętnastu istniejących wstrzykiwaczy nie wymagał zmiany.

- **`actors/sheet-shell.mjs`** (nowy) — `NeuroshimaCharacterSheet` / `NeuroshimaNPCSheet` nad
  klasami zarejestrowanymi aktualnie przez system (czytane z `CONFIG.Actor.sheetClasses`, nie
  z globala `dnd5e`). `PARTS` kopiowane klucz po kluczu, nie przepisywane — część dodana przez
  przyszłą aktualizację dnd5e przeżyje. Rejestracja w `ready`: `registerSheet` kolejkuje wszystko
  zgłoszone przed `game.ready`, a dnd5e rejestruje własne arkusze w `init`, więc w `setup` rejestr
  jest jeszcze pusty i klasa bazowa nie istnieje.
- **Zakładka Zasoby** (`templates/tab-zasoby.hbs`) — amunicja, magazynki, ładunki wybuchowe
  i surowce przenoszone po renderze z Ekwipunku do własnej zakładki. Ekwipunek wraca do bycia
  listą przedmiotów.
- **Panel Stan** — Zranienie, Wyczerpanie, Upojenie i Skażenie w jednej karcie paska bocznego,
  na karcie postaci i BN. Poziomy przez `getLevelledRegistry()` (nowy eksport
  `actors/levelled-conditions.mjs`), więc panel nie zna mechaniki żadnego toru. Natywne pipsy
  Wyczerpania rozbite 3+3 wokół odznaki KP ukryte; zapis idzie w `system.attributes.exhaustion`,
  czyli przez ten sam guard `preUpdateActor` co natywny klik.
- **Skrót `ZR`/`WY`** pod punktami wytrzymałości — stan czyta się razem z PW, nie po scrollu.
- **Fantasy UI na kartach BN** — reguły ukrywające czary były do tej pory scope'owane
  `.dnd5e2.character`, więc wszystkie 69 BN-ów miało w pełni widoczną zakładkę czarów, sloty
  i koncentrację. Przepięte na `.dnd5e2.actor`; sama zakładka wypada już z `PARTS`.
- **Sprzątanie**: usunięty stary wstrzykiwacz Zranienia z `combat/zranienie.mjs` (2 hooki
  i 6 funkcji budujących inline'owe style) — panel Stan go zastępuje. Naprawiony `wrapper` bez
  `className` w `actors/magazine-inventory.mjs`, przez który kotwica `.neuro-magazine-wrapper`
  w `actors/surowce-inventory.mjs` była martwa od początku.

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
  *(Warstwa flag i jej panel zostały usunięte w v0.12.0 — patrz niżej.)*
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
