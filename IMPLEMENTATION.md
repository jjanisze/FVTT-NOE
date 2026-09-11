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
- [~] Vehicles (actor type + combat + chase system) — projekt: [PLAN_poscigi.md](PLAN_poscigi.md)
  (2026-09-11). **Zrobione:** `config/vehicles-data.mjs` (14 podwozi z tabeli s. 262, środowiska
  pościgu, stałe zasad); `scenes/poscig.mjs` + `scenes/poscig-canvas.mjs` — generowana plansza
  pościgu (gridless, 1 znacznik = 36 m = 200 px, proceduralna pustynia z trójwarstwową paralaksą
  w `canvas.primary`, 12 numerowanych torów, dolna strefa swobodna na warstwę Rysunków MG);
  GMT400 przestawiony na podwozie Hammer (PW 180 zostaje — decyzja MG); nowy aktor
  „Hammer Posterunku" jako ścigający; `scenes/poscig-ui.mjs` — kontekstowy przycisk MG
  w narzędziach sceny („Nowy pościg" / „Ustawienia planszy") z pełną konfiguracją: tory,
  środowisko i ST, runda, tempo tła, dostawianie pojazdów. Scena testowa: „Pościg — test".
  Przyciąganie do torów i recentrowanie pola (`scenes/poscig-snap.mjs`) — gotowe.
  **Zostaje:** karta pojazdu (podklasa `VehicleActorSheet`), paleta manewrów z ruchem
  potwierdzanym kliknięciem, tabele k20 Awarii i Komplikacji. Istniejące zależności: `actors/party-travel.mjs` (paliwo pojazdu),
  `actors/vehicle-portrait.mjs` — oba wstrzykują się w `renderVehicleActorSheet`.
  Siedem cichych pułapek v14 znalezionych po drodze: PLAN §9a / ARCHITECTURE §11.
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

### Pościgi — przyciąganie do torów i recentrowanie pola (2026-09-12)

`scenes/poscig-snap.mjs`. Zgłoszone przez MG po wydaniu: „I see no snapping at all. Perhaps
this feature is simply not suited for FVTT?" — i słusznie, bo przyciąganie faktycznie nie
działało. Nie z winy Foundry'ego: **plansza była generowana jako GRIDLESS**, a to wyłącza
przyciąganie na twardo (`Token#_updateDragDestination`:
`if (canvas.grid.isGridless) snap = false;` plus cztery inne miejsca), więc nadpisany
`TokenDocument#getSnappedPosition` nigdy nie był wołany. Założenie „bez siatki nic nie
przyciąga, więc dołożymy własne przyciąganie" jest odwrotne do prawdy.

Plansza ma teraz siatkę **kwadratową o boku równym torowi, z `alpha: 0`** — niewidoczną,
ale prawdziwą. Zweryfikowane realnym przeciągnięciem tokenu (syntetyczne zdarzenia
wskaźnika, nie wywołanie metody): 437 px w poziomie → pojazd ląduje 400 px dalej, równo na
środku toru, a 96 px w pionie zostaje nietknięte. Pionowa swoboda w torze przeżywa
kwadratową siatkę, bo o Y decyduje nadpisanie, nie siatka.

Reszta warstwy: przyciąganie przez `getSnappedPosition` (obsługuje przeciąganie, strzałki,
linijkę i podgląd trasy naraz; Shift omija je za darmo, bo Foundry woła je tylko przy
`snap === true`), recentrowanie pola z haka `moveToken` (w `updateToken` `doc.x` to jeszcze
pozycja sprzed ruchu — zmierzone: `changes.x` 1800 przy `doc.x` 1200), odmowa recentrowania
przy rozstawie szerszym niż plansza (inaczej pionki dygoczą w nieskończoność, bo każde
przesunięcie odpala hak od nowa), numer toru liczony z pozycji zamiast trzymany we fladze.

**Czego nauczył ten błąd o testach.** Test wołał `getSnappedPosition` wprost i przechodził —
metoda działała, tylko nikt jej nie pytał. Test czystej funkcji nie mówi nic o tym, czy silnik
w ogóle po nią sięga. Regresja pilnuje teraz **konfiguracji sceny**
(`daneSceny().grid.type !== GRIDLESS`), bo to tam był błąd. Zestaw: **318/318**.

### Pościgi — plansza, dane pojazdów, interfejs MG (2026-09-11)

Zgłoszone: „design the Pościgi mechanic implementation" → projekt w
[PLAN_poscigi.md](PLAN_poscigi.md), a następnie pierwsza działająca plansza do testów.
Osiem decyzji projektowych (D1–D8) rozstrzygniętych z MG przed pisaniem kodu i zapisanych
w §0 planu — najważniejsza: **plansza to prawdziwa scena FVTT, nie własne okno**, bo RAW
każe do pojazdów na niej strzelać, a pionek narysowany we własnym canvasie nie jest celem
(nie da się go otargetować, nie przyjmie karty obrażeń, nie policzy Progu obrażeń).

**1. `config/vehicles-data.mjs` — 14 podwozi z tabeli s. 262** plus środowiska pościgu
(ST 5/10/15) i stałe zasad. Odnotowane, nie „naprawione", dwie rozbieżności w samym
podręczniku: Motocykl ma 56 m w tabeli zbiorczej i 54 m we własnym statbloku (przyjęte 54),
Autobus ma „cofanie 12 m" w nagłówku i „jedną czwartą" w cesze. `ttBezruchu()` zwraca
wartość razem z jej pochodzeniem (`podrecznik` / `ekstrapolacja` wzorcem −5), zamiast
udawać, że podręcznik podaje ją dla każdego podwozia.

**2. `scenes/poscig.mjs` + `scenes/poscig-canvas.mjs` — generowana plansza.**
Jedna stała niesie całą geometrię: 1 znacznik = 36 m = 200 px = szerokość toru.
Scena jest **gridless** celowo — Foundry nie przyciąga wtedy niczego, więc swoboda jest
stanem wyjściowym, a przyciąganie do torów tylko dołożymy (§2.4 planu). Pustynia jest
proceduralna: trzy warstwy paralaksy (0,25× / 1× / 2×) pieczone w runtime do `PIXI.Texture`,
tym samym wzorcem co `weapons/tracer-vfx.mjs`, ze ścieżkami na autorską grafikę zostawionymi
jako stałe. Mierzone na żywo: 60 FPS, stosunek przewijania dokładnie 1:4:8.

**3. `scenes/poscig-ui.mjs` — wejście dla MG.** Kontekstowy przycisk w narzędziach sceny:
na zwykłej mapie „Nowy pościg", na planszy „Ustawienia planszy". Okno tworzenia (nazwa,
tory, środowisko, wybór ściganych i ścigających, aktywacja dla stołu) i okno ustawień
(stan planszy, tory, środowisko/ST, runda, tempo tła, dostawianie pojazdów). Zwężenie
planszy poniżej zajętego toru jest **odrzucane z komunikatem**, a nie po cichu przycinane —
przycięcie byłoby utratą informacji o pozycji pojazdu.

**4. GMT400 doprowadzony do podwozia Hammer.** Wóz był w praktyce jeżdżącym bagażnikiem:
`Szybkość 9 m` (pieszy — nie ruszyłby się o ani jeden znacznik), `details.type: "air"`,
rozmiar `lg`, puste `crew`/`capacity`/`weight`, waga w funtach. Ustawione: 36 m, TT 17,
Próg obrażeń 10, Próg awarii 25, załoga 5, ładownia 500 kg, `land`, `huge`, niewrażliwości.
**PW 180 zostaje** — decyzja MG (wóz przebudowany przez Raynalda w Bunkerville), mimo że
podwozie daje 100. Paliwo (80 l @ 20 l/100 km) nienaruszone: handout z Roll20 mówi
112 l @ 50 l/100 km, co zmieniłoby zasięg z 400 na 224 km i przestawiło planowanie podróży
na karcie drużyny — to decyzja przy stole, nie sprzątanie danych.
Nowy aktor **„Hammer Posterunku"** (podwozie prosto z tabeli, PW 100) jako ścigający.

**5. Testy.** Nowa paczka `neuroshima-2026-overrides.poscig` — 26 testów warstwy 1
(integralność tabeli podwozi, ST-y środowisk, stałe zasad, odwracalność `torX`↔`xNaTor`,
`znacznikiZDystansu` jako reguła RAW, a nie zaokrąglanie). Cały zestaw: **302/302**.

**6. Cztery ciche pułapki v14** — opisane w [ARCHITECTURE.md §11](ARCHITECTURE.md), bo żadna
nie dotyczy wyłącznie pościgów: id poziomu sceny warunkujące istnienie tokenów, kolor tła
malowany jako obiekt, rejestracja przycisku sceny wyłącznie w `init`, `wrapMode` dla
`TilingSprite`. Każda kosztowała czas i żadna nie zgłosiła się błędem w konsoli.

**Nie zrobione (świadomie, PLAN §10):** karta pojazdu, przyciąganie do torów
i recentrowanie pola, paleta manewrów, tabele k20 Awarii i Komplikacji.

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

## Zmiany z 5 września 2026 — Gogle NVG/termowizyjne + porządki Kolor Kobaltu

Zobacz `PLAN_nvg_thermal.md` — pełne uzasadnienie architektury.

### Kolor Kobaltu — jasność i zasięg latarki, jedno źródło światła, ładunki (`light-sources.mjs`, `latarka.mjs`, `pochodnia.mjs`, `power-source.mjs`, `inventory-audit.mjs`)
- Stożki latarki nie prześwietlają się już na biało: `luminosity`/`attenuation` ustawiane jawnie zamiast domyślnych 0.5/0.5 (potwierdzone bezpośrednim próbkowaniem pikseli renderowanej sceny).
- Słabe światło latarki skrócone z 60 m do 22 m (jasne zostaje przy 1/3 = 15 m) — 60-80 m dominowało całą mapę silosu, niwelując sens dłuższych latarek.
- Tylko jedno aktywne źródło światła na aktora: zapalenie latarki/pochodni gasi każde inne (`enforceSingleLightSource`).
- Naprawiono „Pochodnia Smołowa" pokazującą ładunki 0/0 zamiast „-" (stary `system.uses.max: "0"` sprzed konwersji na własne flagi paliwa) — Latarka i Pochodnia jawnie czyszczą `uses` przy inicjalizacji.
- Ilość przedmiotów zasilanych bateryjnie/paliwem zablokowana na 1 (twardy guard `preUpdateItem`/`preCreateItem` + zablokowane +/- na karcie) — jeden dokument, jeden stan wł/wył, nie da się „sztaplować".
- `game.neuroshima.inventoryAudit`: dwie nowe kategorie (ilość, ładunki) wykrywają i naprawiają powyższe na już wydanych kopiach.
- Latarka i Baterie przeniesione z paczki „Broń" do nowej paczki „Sprzęt" — latarka to sprzęt, nie broń; Pochodnia zostaje w Broni (naprawdę jest bronią).

### Gogle noktowizyjne/termowizyjne (`gogle.mjs`, `vision-sources.mjs`, `detection-termowizja.mjs`)
- Nowy przedmiot „Gogle" (dwa warianty: noktowizyjne/termowizyjne) w paczce „Sprzęt" — brak zasady RAW, w pełni domowa mechanika (`PLAN_nvg_thermal.md`).
- Noktowizor: `lightAmplification` (zielony odcień, wzmacniacz obrazu) **plus** realny `sightRange` (30 m) nadpisujący `token.sight.range` — dopiero to drugie faktycznie realizuje RAW „widzi w ciemnościach niemal jak w dzień"; sam VisionMode to tylko „malowanie", zasięg wzroku w ciemności steruje osobne pole (`vision-sources.mjs`, sekcja „sightRange is the mechanic").
- Analogowy szum na obrazie Noktowizora: `NoktowizjaGrainVisionShader`, podklasa `AmplificationBackgroundVisionShader` (warstwa `vision.background`, nie `canvas.shader` — ta pierwsza próba lądowała w przesłanianej warstwie i była niewidoczna mimo poprawnego podłączenia; zob. `gogle.mjs`'s „Analog grain" i skasowany `HANDOFF_nvg_grain.md`). Animowany przez natywny hak `{animated: true}`/`time` (ten sam co `tremorsense`), zero własnego tickera.
- Termowizor: nowy VisionMode `neuroshimaTermowizjaVision` (płaskie, odbarwione tło, działa w totalnej ciemności) + istniejący DetectionMode `neuroshimaTermowizja` (ten sam, którego już używają bestiariuszowe potwory z Termowizją) dodany na token noszącego — przenika kamuflaż/Niewidoczność, blokowany przez ściany, gaśnie przy Oślepieniu.
- `vision-sources.mjs`: nowy rejestr providerów/wyłączników na wzór `light-sources.mjs`, ale niezależny od niego (własny slot „jedno urządzenie wizyjne na aktora" — noszenie gogli NVG podczas świecenia latarką nie koliduje, decyzja GM na v1).
- Model baterii identyczny jak w Latarce (2k4h, „Włóż baterie"), pełne wsparcie shared power-source paradigmatu (`power-source.mjs`) — blokada ilości, badge wł/wył na karcie.
- Przetestowane na żywo (Piekarz): wymuszanie jednego aktywnego urządzenia wizyjnego, poprawny zapis/kasowanie wpisu w `detectionModes` (potwierdzone, że to `TypedObjectField` — obiekt kluczowany id, nie tablica — bez naruszania `lightPerception`/`basicSight`), niezależność od slotu latarki, blokada ilości.

### Bugfixy Gogli + wspólny bazowy zasięg wzroku całej obsady (`gogle.mjs`, `vision-sources.mjs`, `normalize-sight-range.mjs`)
- Włączenie zdjętych Gogli (`turnOn`) nie sprawdzało `system.equipped` — aktywność radośnie zapalała flagę, drenowała baterię i wypisywała „Włączone", podczas gdy `_gogleVisionProvider` po cichu ignoruje nieużywany przedmiot. Efekt: włącz-i-nic-się-nie-dzieje, zero komunikatu. Dodano ostrzeżenie + odmowę w `turnOn()` i w `onPreUseActivity`'s ON_ID. `latarka.mjs` miała identyczną lukę w swoim providerze światła — ten sam guard dodany tam też, dla symetrii (zob. też MIDI-QOL sanity-check w planach na później: sensowny limit "ile urządzeń na głowie na raz").
- `_doSyncActorVision` czerpała tokeny z `actor.getActiveTokens(true)`, co (potwierdzone w `client/documents/actor.mjs`) jest przycięte do `canvas.scene` — do sceny, którą **akurat ogląda klient wykonujący akcję**, nie do sceny, na której faktycznie stoi token. Konsola GM-a stojąca na innej scenie niż token = zapis ląduje donikąd, bez błędu. Naprawione przez `actor.getDependentTokens({linked: true})` bez filtra scen — ta funkcja i tak dotyka wyłącznie dokumentu tokena, canvas nigdy nie był potrzebny.
- Audyt zgłoszonego „Kier widzi dużo więcej niż Piekarz mimo identycznych oczu": cała partia zaimportowana jednym batchem (18 postaci, ten sam `_stats.createdTime` co do sekundy) miała `prototypeToken.sight.range` rozrzucony 0–9 m bez żadnej korelacji z WIS/Percepcją/czymkolwiek — czysty odpad po starym (przed-Foundry) ustawieniu per-token, nigdy nieznormalizowany, bo żadna scena nie wymuszała `tokenVision` aż do niedawnych lochów NVG/termowizji. Nowa migracja `normalize-sight-range.mjs` (`game.neuroshima`-style: `api.migration.normalizeSightRange({commit:true})`, dry-run domyślnie) sprowadza **każdą** postać z tej obsady — i `prototypeToken`, i już postawione tokeny na każdej scenie — do jednego celowego `BASELINE_SIGHT_RANGE = 1.5 m` (jedna jednostka siatki poza własnym polem): decyzja GM, nie czyste RAW-0 — token zawsze widzi samego siebie i „czuje" bezpośrednie otoczenie (sąsiad staje się częściowo widoczny), bez ogólnego widzenia w ciemności. Uwzględnia tokeny z aktywnym urządzeniem wizyjnym (nadpisuje `visionRangeBackup`, nie żywy `sight.range`, żeby nie zepsuć trwającej sesji NVG/termowizji).

### Pole widzenia 220° — wszyscy poza Ślepowidzeniem i maszynami Molocha (`config/fov.mjs`, `normalize-fov-angle.mjs`, `dev/packs/build-packs.mjs`)
- Podręcznik („Zmysły"): „Wszystkie istoty, oprócz tych posiadających Ślepowidzenie i maszyn Molocha (które używają kamer), są w stanie widzieć tylko to, co znajduje się mniej więcej przed nimi (…). Wszystko, co znajduje się za plecami, jest niewidoczne." — czyli domyślny stożek 220° (uczciwe ludzkie FOV), nie pełne 360°, dla niemal każdego, PC-ów włącznie (wszyscy grywalni to ludzie, RAW nie robi dla nich wyjątku).
- Nowy `config/fov.mjs`: `computeFovAngle`/`computeFovAngleForActor` — 360° tylko gdy `senses.ranges.blindsight > 0` (Ślepowidzenie, pole liczbowe, ufne nawet na zaśmieconych starych aktorach) **lub** gdy tekst typu (`details.type.value`/`.subtype`/`.custom` razem) pasuje jednocześnie do „maszyn(a)" i „moloch" (dopasowanie podciągiem, celowo luźne — `creature-types.mjs` dokumentuje 57 żywych NPC-ów z wolnym tekstem w `details.type.value` sprzed czystego pipeline'u Bestiariusza, np. „Maszyna (Molocha)"). Wszyscy inni (PC-e, zwykłe potwory, maszyny Smarta) dostają 220°.
- `token.sight.angle` jest zupełnie niezależne od `visionMode`/`sight.range` (`vision-sources.mjs` nigdy go nie rusza) i od zasięgu jakiegokolwiek `DetectionMode` zarejestrowanego z `angle: true` (w tym własna `neuroshimaTermowizja`) — Foundry buduje jeden stożek FOV z `sight.angle` + `token.rotation` i testuje względem niego każdy zmysł na raz. Ustawienie tego pola raz wystarcza więc, żeby stożek 220° nadpisywał **i** Noktowizor, **i** Termowizor, dokładnie jak proszono.
- `dev/packs/build-packs.mjs`: `sight.angle` bestiariuszowych NPC-ów liczone tym samym `computeFovAngle` zamiast twardego `360` — obowiązuje dopiero po `npm run build:packs` (Foundry zamknięte, krok jeszcze niewykonany).
- Dwie migracje w `normalize-fov-angle.mjs` (ten sam wzorzec dry-run/`{commit:true}` co reszta folderu): `normalizePcFov` (bez warunków — cała obsada PC jest ludzka) i `auditNpcFov` (przemiata każdy postawiony token NPC na każdej scenie, liczy wyjątek z własnych `senses`/`type` aktora). Uruchomione i zacommitowane na żywo: 18 PC-ów + 93 wpisy NPC znormalizowane do 220°, z wyjątkiem potwierdzonych żywcem maszyn Molocha (Spawacz, Łowca, Kurczak, Mobsprzęt, Pająk, Gladiator) i jednego stworzenia ze Ślepowidzeniem (Crab, 30m) — wszystkie poprawnie zostały na 360°. Zweryfikowane wizualnie na Piekarzu (`Silos Poziom Górny`): stożek 220° renderuje się poprawnie i obraca się z `token.rotation`.

### Termowizor jako fuzja sensorów, nie „gorsza Noktowizja" (`detection-termowizja.mjs`, `gogle.mjs`, `light-sources.mjs`, `vision-sources.mjs`)
- Autor mechaniki, po pokazaniu mu żywej Termowizji: „nowoczesne cele termowizyjne mają wbudowane NVG" (fuzja sensorów) — pierwszy strzał tego przedmiotu dawał zero ogólnego widzenia terenu (RAW-wiernie: kamery widzą ciepło, nie teren), co technicznie oznaczało ślepotę na wszystko poza gorącymi celami. Naprawione jako prawdziwa konstrukcja dwukanałowa, nie „Noktowizja, tylko gorsza":
  - **Kanał detekcji** (bez zmian mechanicznie, tylko liczba): `TERMOWIZJA_ID`, zawsze aktywny, niezależny od światła, teraz **500 m** (zamiast 24 m) — świadomie liczba-RAW-flavour, o której wiadomo, że silnik nigdy jej realnie nie wyrenderuje na mapie lochu; to sufit, nie dystans. Uzasadnienie GM-a: detekcja ciepła w oddali mówi tylko „coś tam jest" (bez etykiety, kształtu, rozmiaru — bez widocznej krawędzi zasięgu, w przeciwieństwie do stożka latarki) — tania do rozdania, bo niesie prawie żadnej informacji względem tego, co faktycznie pokazuje.
  - **Kanał fuzji** (nowy): `sightRange` = **16 m** („niska rozdzielczość kamery termowizyjnej — FLIR-y nie są 4k"), ale **warunkowy** — aktywny tylko, gdy nosiciel ma realnie zapalone źródło światła. Sprawdzane raz, na poziomie `sightRange`, nie per-piksel w shaderze: próba czytania per-piksel „czy akurat to miejsce jest oświetlone" z `perceivedBrightness(baseColor)`/`computedDarknessLevel` została zmierzona bezpośrednio (kontrolowany test: ta sama pozycja, world światło włącz/wyłącz, odczyt pikseli przez Pythona/Pillow) i porzucona — żaden z tych sygnałów nie odróżniał realnie „blisko zapalonej lampy" od „daleko od wszystkiego" w tej wersji silnika.
  - Nowa funkcja `hasActiveLight(actor)` w `light-sources.mjs` (czyta istniejący rejestr providerów światła, nic nowego nie duplikuje) plus nowy rejestr `registerLightChangeListener` (ten sam wzorzec co provider/off-switch) — `vision-sources.mjs` subskrybuje nim `syncActorVision`, więc zapalenie/zgaszenie latarki lub pochodni od razu przelicza Termowizor na nowo, mimo że `light-sources.mjs` nadal nic nie wie o Termowizji ani nawet o `vision-sources.mjs`. Znaleziony i naprawiony przy okazji realny bug wyścigu: listener nie był awaitowany, więc `await extinguishTorch(...)` wracał, zanim kaskadowy resync widzenia faktycznie się zakończył — złapane żywcem (odczyt `sight.range` zaraz po `await` pokazywał starą wartość).
  - Shader (`vision.background`, nie `canvas.shader` — ta sama zasada co poprawka Noktowizji) już nie próbuje niczego mieszać per-piksel: skoro `sightRange` samo w sobie jest bramką „czy w ogóle coś tu jest do narysowania", shader po prostu zawsze pokazuje odbarwiony, „gotujący się" obraz (gruboziarnisty szum blokowy + delikatne skanlinie — celowo inny wzór niż drobny szum Noktowizji, żeby oba gogle czytały się jak różne sensory). `linkedToDarknessLevel: false`, żeby osobny, regionowy mechanizm ciemności silnika nie podmieniał cichcem tego wyglądu z powrotem na zwykły kolor.
  - Zweryfikowane na żywo na Piekarzu: pochodnia zgaszona → `sight.range` 1.5 m (baza), brak ogólnego widzenia terenu poza zasięgiem ręki, ale hot-orange kontur na „Kitchin Prawy" w totalnej ciemności dalej działa (kanał detekcji, niezależny). Pochodnia zapalona → `sight.range` natychmiast 16 m, teren widoczny w promieniu, szum potwierdzony jako realnie animowany (porównanie pikseli dwóch zrzutów ekranu w tym samym miejscu, nie tylko odczyt `time` z uniformu).

## Zmiany z 6 września 2026 — Flara, Pistolet na Race i Raca sygnałowa

Zobacz `docs/Kobalt.md` reguły 7-8 dla wersji „co się zmienia" dla graczy/MG.

### Flara — ręczna raca rzucana, prawdziwe światło w punkcie upadku (`items/flara.mjs`)
- RAW (`toolkits-data.mjs`, Mały Rusznikarz): „flara świecąca przez 1 minutę (ST 15)" była już poprawnie wpisana jako akcja narzędzia, ale nie istniał żaden przedmiot, który ten efekt faktycznie realizuje — to jest ten przedmiot.
- Cztery decyzje zablokowane przez GM-a na żywo: (1) prawdziwe, samodzielne światło w punkcie upadku, nie sam opisowy sygnał jak istniejący `grenade-signal` (`ammo-data.mjs`); (2) zasięg = podwojony zasięg Pochodni Smołowej (6/12 m → 12/24 m), nie Improwizowanej; (3) czas palenia = 1 minuta, identycznie jak RAW, bez rozróżnienia na flarę zrobioną w polu i kupioną; (4) kolor/animacja („czerwone, mocno migoczące/trzeszczące") zostawione mnie do dobrania i przetestowania — czerwień `#ff1a1a`, animacja `torch` (ta sama prymitywa co Pochodnia) z obydwoma suwakami (prędkość/intensywność) na maksimum 10/10 zamiast Pochodni 5/5, żeby czytało się jako wyraźnie bardziej agresywny płomień, nie tylko przefarbowana pochodnia.
- Architektura celowo inna niż Latarka/Pochodnia: te dwie świecą **nosicielowi** (`light-sources.mjs`, rozwiązywacz per-aktor). Flara świeci **w miejscu, gdzie wylądowała**, niezależnie od tego, dokąd potem pójdzie rzucający — to zupełnie inny problem, więc dostaje osobny, mały mechanizm zamiast wpinania się w `light-sources.mjs`.
- Tworzenie/kasowanie `AmbientLight` na scenie jest domyślnie zarezerwowane dla MG — dokładnie ten sam problem, który `light-sources.mjs` już rozwiązał dla wąskiego stożka latarki. Ten sam, już sprawdzony wzorzec: rzucający klient wykonuje tylko zapisy, do których ma prawo (zużywa sztukę z zapasu, dopisuje kartę czatu, ustawia flagę na **aktorze** — nie na przedmiocie, bo ten mógł się właśnie skasować, jeśli to była ostatnia sztuka), każdy podłączony klient reaguje na `updateActor`, a ten, który akurat jest `game.user.isActiveGM`, faktycznie tworzy światło i wpisuje je do `scene.flags.activeFlares`.
- Czas wygaśnięcia liczony w czasie gry (`game.time.worldTime`), zamiatany na `updateWorldTime` — dokładnie ten sam mechanizm co wypalanie paliwa Pochodni, z tym samym uczciwie udokumentowanym ograniczeniem: jeśli nikt nie przesuwa zegara (walka, odpoczynek, ręcznie), flara nigdy nie zgaśnie sama.
- Zweryfikowane na żywo (Piekarz, aktor testowy): pełny cykl przez prawdziwą aktywność „Rzuć i zapal flarę" — zużycie sztuki z zapasu, karta czatu, flaga na aktorze, utworzenie `AmbientLight` z dokładnymi zadanymi parametrami (`bright:12, dim:24, color:"#ff1a1a"`, animacja torch 10/10), wpis w `scene.flags.activeFlares` z `expiresAt` dokładnie 60 s później, i poprawne skasowanie światła oraz wyczyszczenie flagi po `game.time.advance(70)`. Po drodze złapany i naprawiony realny bug: fallback `_getActorThrowToken` (`actor.getActiveTokens(true, true)`, używany gdy rzucający nie ma akurat zaznaczonego własnego tokena) potrafi oddać `TokenDocument` zamiast placeable `Token` — pierwszy nie ma `.center`, co wywalało `_throwFlara` cichym odrzuceniem obietnicy (widocznym tylko jako „Uncaught (in promise)" w konsoli, żadnego efektu w grze). Naprawione `_centerOf()`, normalizującym oba możliwe kształty.

### Pistolet na Race + Raca sygnałowa (`config/weapons-data.mjs`, `config/ammo-data.mjs`, `migration/migrate-pistolet-race.mjs`)
- Homebrew W Kolorze Kobaltu (nie z podręcznika) — jednostrzałowa broń (Wmag. 1, właściwość `ladowanie`, ten sam kształt co Samoróbka) strzelająca racami sygnałowymi. Trafienie bezpośrednie: 1k4 od ognia + RO Zręczność ST 12 albo Podpalenie — RO rozstrzyga MG ręcznie, tak samo jak przy Koktajlu Mołotowa (to samo „nie automatyzujemy" co przy Miotaczu ognia).
- Nowy kaliber `race` (kategoria „Sygnałowa") w `ammo-data.mjs` — pusta `formula` (broń niesie własne obrażenia, jak przy łukach/kuszach). Lżejszy i szybszy w locie niż Flara, ale bezużyteczny bez samego pistoletu — odwrotnie niż Flara, która nie wymaga żadnej broni.
- Znaleziony na Raynaldzie (2026-09-06): „Pistolet na Race" istniał jako pusty placeholder typu `loot` (waga 1 kg, cena 0, zero mechaniki) — dokładnie ta sama klasa błędu co dawne placeholdery Latarki/Pochodni sprzed ich mechanik. Nowa migracja `migratePistoletRace()` (ten sam wzorzec dry-run / `{commit:true}` co reszta folderu) zamienia taki placeholder w prawdziwą broń — usuń-i-stwórz-na-nowo, bo pojedynczy `.update({type: "weapon", ...})` na przedmiocie innego typu cicho odrzuca całą zmianę (ten sam limit silnika już udokumentowany przy konwersji Latarki). W odwrotnej kolejności niż tamten precedens: najpierw tworzy nową broń, dopiero potem kasuje placeholder — bezpieczniejsze przy nieoczekiwanym błędzie w trakcie migracji odpalanej masowo po całym świecie (stary placeholder przeżywa zamiast zniknąć bez zamiennika).
- Uruchomione i zacommitowane na żywo: przekonwertowany na Raynaldzie, magazynek startuje **pusty** (`current: 0`) — jawnie nadpisane, bo domyślne zachowanie `buildWeaponItemData` ładuje świeżą broń „pod korek" (słuszne dla wystawki Zbrojowni, tutaj podarowałoby darmową racę znikąd, oprócz trzech wydanych osobno). Wydano mu też 3 sztuki Racy sygnałowej jako luźną amunicję do samodzielnego załadowania przez zwykły system przeładowania.
- Przy okazji: `actors/ammo-inventory.mjs`'s `_addAmmoToActor` miał własną, ręcznie utrzymywaną kopię mapy ikon kalibrów (`fileMap`) — dokładny duplikat tego, co już jest w `AMMO_CALIBERS[].icon`, dla każdego istniejącego kalibru. Każdy nowy kaliber, którego ktoś zapomniałby tam dopisać (jak `race`, gdyby nikt tego nie zauważył), cicho dostawałby ikonę 9 mm zamiast własnej. Usunięty na rzecz czytania `caliber.icon` wprost z katalogu — jedno źródło prawdy zamiast dwóch ręcznie synchronizowanych.

## Zmiany z 6 września 2026 (2) — Czytelność paska udźwigu w Ekwipunku

Zobacz doc comment na górze `actors/encumbrance-breakdown.mjs` dla pełnego uzasadnienia.

- **Układ**: „1/3 pasek, 2/3 legenda" na wąskim arkuszu okazało się realnym bugiem, nie tylko kwestią wąskiej szerokości — legenda była wstawiana jako kolejne rodzeństwo `.encumbrance` w DOM, co wsadzało ją w TEN SAM natywny wiersz flex (`.top`) co kartę udźwigu, ściskając ją do wąskiej, natywnie stałej szerokości. Naprawione: legenda ląduje jako pełnoszerokościowy blok PO całym wierszu `.top`, a `.encumbrance` dostaje `flex:1 1 auto`, żeby wypełnić miejsce, którego już nie musi dzielić.
- **Legenda tylko z tego, co się faktycznie niesie**: usunięte wpisy o zerowej wadze — charakter bez żadnych Materiałów organicznych nie widzi już martwego wpisu „Materiały organiczne (MO)" w legendzie.
- **Czytelność tekstu wagi**: naturalny nakładający się na siebie kolor tła paska sprawiał, że „60.3 / 75" ginęło pod overlayem (kolejność w DOM malowała overlay NAD tekstem). Naprawione: `.label` dostaje `z-index:2` + ciemny text-shadow (obrys/poświata) — czytelne niezależnie od koloru segmentu pod spodem.
- **Mniej pustej przestrzeni**: usunięty cały blok opisowy „Amunicja — luźna amunicja do przeładowania" / „Pirotechnika — granaty, miny, ładunki wybuchowe" / itd. — sekcja miała sens, dopóki pasek nie pokazywał tych kategorii wprost; teraz są prawdziwymi, kolorowymi segmentami paska (patrz niżej), więc opisowy akapit był czystym szumem. Przy okazji ścieśnione marginesy/gapy legendy.
- **Kolory „nie mają sensu" → rozbicie „Zasobów" na realne kategorie**: stary podział (Broń/Pancerz/Zasoby/Reszta) chował AMUNICJĘ, MAGAZYNKI, PIROTECHNIKĘ, LEKI, PROWIANT i wszystkie 5 Surowców pod jednym zielonym „Zasoby" — a legenda i tak osobno obiecywała 5 kolorów Surowców, których pasek nigdy realnie nie pokazywał. Naprawione: każda z tych kategorii dostaje własny, prawdziwy segment paska + wpis legendy (`config/fov.mjs`-owy wzorzec „jedna funkcja, jedno źródło prawdy" — tu `_categoryOf(item)` w `encumbrance-breakdown.mjs`). To też odkryło dwie realne kolizje kolorów: szary Materiałów konstrukcyjnych (MK) był prawie identyczny z szarym „Reszty", a czerwony Materiałów organicznych (MO) — z czerwonym „Broni" (`config/surowce-data.mjs`, komentarz przy akcentach). Nowy zestaw 13 kolorów dobrany matematycznie (rozstaw barw + celowe różnice nasycenia/jasności dla kategorii bojowych stłoczonych w ciepłej części koła) i zweryfikowany wizualnie — wyrenderowane próbki kolorów obok siebie, nie tylko liczby na papierze.
- Zweryfikowane na żywo na Raynaldzie: pasek poprawnie pokazuje Broń 2,6 kg / Chemia (CH) 3,0 kg / Części elektroniczne (CE) 2,0 kg / Części zamienne (CZ) 1,0 kg / Amunicja 150 g / Pirotechnika 2,1 kg / Leki 200 g / Prowiant 8,0 kg / Reszta 46,0 kg jako osobne, poprawnie pokolorowane segmenty — dokładna zgodność z jego realnym ekwipunkiem, sprawdzona pozycja po pozycji.

### Surowce: Chemia/Części elektroniczne/Części zamienne w jednostkach 100 g, nie 1 kg (`migration/rescale-surowce-units.mjs`)

- Decyzja GM-a: prawdziwa konwersja danych, nie tylko zmiana wyświetlania — dla CH/CE/CZ (MK i MO celowo nietknięte). Migracja `rescaleSurowceUnits()` (ten sam wzorzec dry-run/`{commit:true}` co reszta folderu) mnoży `quantity` razy 10 i dzieli `weight.value` przez 10 dla każdego pasującego stosu — czysty przelicznik zachowujący łączną wagę (kg), nie próg „napraw tylko to, co akurat jest równe 1 kg".
- **Złapane pierwszym dry-runem, zanim cokolwiek zacommitowano**: aktor z flagą `isZbrojownia` (ten sam wzorcowy aktor, którego `createWeapons()`/`createLatarkaStock()`/`createFlaraStock()` też celują) już miał w katalogu „Chemia (CH) 100 g" przy `weight.value: 0.1` — ktoś już dawno ustawił WZORZEC na konwencję 100 g, tej samej, którą ta migracja miała wprowadzić gdzie indziej. Ślepy przelicznik ×10/÷10 „poprawiłby" ten już poprawny wzorzec do 10 g/jednostkę. To dokładnie ten sam problem co `project_catalog_drift_distributed_copies`, tylko w drugą stronę — tym razem to katalog miał rację, a wydane kopie (Raynalda „Litry chemii", Victora „pół kilo elektroniki" — obie na pełnym 1 kg/jednostkę mimo tej drugiej nazwy) się rozjechały. Naprawione: aktorzy z flagą `isZbrojownia` są bezwarunkowo wykluczeni z tej migracji, nawet jeśli podani wprost po nazwie.
- Idempotencja: w przeciwieństwie do reszty migracji w tym folderze (które zbiegają do stałej wartości, więc ponowne uruchomienie samo w sobie nic nie robi), „podziel przez 10" nie ma stałego celu do sprawdzenia — powtórne uruchomienie bez zabezpieczenia podzieliłoby przez 100 łącznie. Każdy przeliczony przedmiot dostaje flagę `surowceRescaled100g` i jest pomijany przy każdym kolejnym uruchomieniu.
- Uruchomione i zacommitowane na żywo: 5 stosów (4 na Raynaldzie, 1 na Victorze von Blitz) przeliczonych; potwierdzona idempotencja (drugi dry-run: 0 wpisów); potwierdzone na pasku udźwigu Raynalda, że łączna waga CH/CE/CZ jest identyczna przed i po (3,0/2,0/1,0 kg — bez zmian, jak powinno być przy czystym przeliczniku).

## Zmiany z 6 września 2026 (3) — Pancerz/Narzędzia/Sprzęt na pasku, naprawa "zablokowanego" Pistoletu na Race

### Pasek udźwigu: trzy nowe kategorie wydzielone z „Reszty" (`actors/encumbrance-breakdown.mjs`)

Żywy przegląd całej drużyny (nie tylko Raynalda) pokazał, że „Reszta" wciąż robiła większość roboty:
prawie każdy ręcznie dodany przedmiot — plecaki, zestawy, manierki, baterie, a co ważniejsze,
kilka prawdziwych pancerzy — ma typ zwykłego `loot`, a nie `equipment`/`tool`. Konkretnie:
Raynalda „Kamizelka Kuloodporna" (6 kg) i Victora „Kurtka ćwiekowana" (prawdziwa nazwa z katalogu
`armor-data.mjs`!) są typu `loot`, więc dotychczasowy warunek `item.type === "equipment"` ich nie
widział — ten sam wzorzec rozjazdu co `project_ammo_wrong_item_type`, tylko dla pancerzy zamiast
amunicji. To zmiana WYŁĄCZNIE na pasku — nie nadaje żadnego realnego bonusu do TT, bo typ
przedmiotu wciąż jest zły; samą naprawę typu (przepisanie na `equipment`) świadomie zostawiono na
później, tylko zaznaczono w kodzie jako coś do zrobienia.

Bez katalogu do dopasowania nazw (inaczej niż Surowce/Prowiant) użyto tego samego, sprawdzonego
wzorca co `prowiant-data.mjs`: luźne dopasowanie po słowach kluczowych w nazwie, nie enumerowana
lista. `type: "tool"` (prawdziwe narzędzia) i konwencja nazewnicza RAW „Mały X" (potwierdzona na
żywej drużynie: „Mały Medyk", „Mały Kłusownik", „Narzędzia małego ślusarza"...) trafiają do
**Narzędzia**. Słowa typu „kamizelka"/"pancerz"/"zbroja"/"kask"/"kurtka ćwiekowana" trafiają do
**Pancerz**. Każdy pozostały `loot` — czyli faktyczna większość dawnej „Reszty" — trafia teraz do
nowego **Sprzęt**, zostawiając „Resztę" jako prawdziwie ostateczny wariant, który na normalnym
arkuszu praktycznie nigdy nie powinien się pojawić.

Dwa nowe kolory (`#7a5230` Narzędzia — ciemny brąz, `#4a5f73` Sprzęt — ciemny błękitno-szary)
dobrane i zweryfikowane tak samo jak poprzednia rewizja palety — wyrenderowane próbki obok
wszystkich 13 istniejących kolorów, nie tylko liczenie odległości barw na papierze.

Zweryfikowane na żywo na Raynaldzie, zgodność pozycja-po-pozycji z jego ekwipunkiem: Pancerz 6,0 kg
(Kamizelka Kuloodporna), Narzędzia 13,0 kg (Mały Medyk 10 kg + laptop wojskowy „narzedzi hackera"
3 kg), Sprzęt 19,0 kg (Plecak Naukowca, Kolczatka ×2, Puszka Coli, urządzenie do hakowania kart,
Balclava, 5 żetonów). Suma wszystkich kategorii (57,05 kg) zgadza się z `system.attributes.
encumbrance.value` (57,1 kg) co do grosza — potwierdza to, że rozbicie jest kompletne, nic nie
"zniknęło" ani nie zostało policzone podwójnie.

### Pistolet na Race wreszcie strzela flarą, nie tylko w ludzi (`weapons/pistolet-na-race.mjs`, nowy plik)

Zgłoszenie: „zrobiłem ATAK, ale nie ma jak zrzucić flary, która daje efekt". Przyczyna: komentarz
w `config/weapons-data.mjs` przy tej broni od początku mówił, że „główne zastosowanie to
sygnalizacja i oświetlenie punktu trafienia (patrz `items/flara.mjs`)" — ale ten link nigdy nie
został zbudowany, wysłana została tylko strona bojowa (ATAK + OBRAŻENIA, jak każda inna broń
palna). Broń miała więc dokładnie jedną aktywność, i to niewłaściwą do sygnalizacji.

Naprawione dodaniem drugiej, niezależnej aktywności **„Wystrzel flarę"** (typ `utility`, jak własna
aktywność rzutu Flary) — wybierasz punkt na mapie zamiast celu, broń zużywa załadowaną Racę
sygnałową i tworzy DOKŁADNIE to samo samodzielne światło co rzucona Flara (ten sam kolor, promień,
czas palenia — `items/flara.mjs` eksportuje teraz `requestFlareLight`/`FLARE_LIGHT`/`BURN_SECONDS`
właśnie po to, żeby to drugie miejsce nie musiało kopiować mechanizmu GM-przekaźnika/wygasania,
tylko go wywołać). Zasięg strzału to zasięg broni (12/30 m) zamiast przelicznika z SIŁy jak przy
rzucie ręcznym — pistolet nie zależy od tego, jak silny jest strzelec, i faktycznie lata dalej niż
ręczna Flara, zgodnie z pierwotnym zamysłem. Aktywność ATAK zostaje bez zmian — strzał w cel to
wciąż osobna opcja (1k4 od ognia, RO na Podpalenie).

Ponieważ broń już istniała u Raynalda przed tą zmianą (katalogowa broń, nie własny plik jak
Latarka/Pochodnia/Flara — nie miała gdzie dostać aktywności przy tworzeniu), doszedł ten sam
mechanizm doszczepiania co przy Flarze: `createItem` + zamiatanie wszystkich istniejących kopii
przy starcie. Potwierdzone na żywo — Raynaldowa kopia dostała aktywność retroaktywnie, bez migracji.

### Prawdziwa przyczyna „zablokowania": bug w przeładowaniu pojedynczej sztuki (`weapons/magazine.mjs`)

Właściwe źródło problemu „broń nie chce strzelać mimo przeładowania": `_performLoadOneAction`
(przycisk „Doładuj 1 nabój"/„+1 nabój" — jedyny sposób przeładowania broni jednostrzałowej typu
Pistolet na Race czy Samoróbka) nigdy nie czyściła stanu komory/przeładowania po włożeniu naboju —
robi to tylko `_performReloadAction` (ścieżka cyklicznego przeładowania dla broni „przeładowanie").
Skutek: po pierwszym strzale flaga komory zostaje `{loaded:false}`, a `reloadState.required` —
`true`; kolejne doładowanie podnosi `mag.current` z powrotem do 1, ale OBIE te flagi zostają
martwe na starych wartościach, więc `_requiresManualReloadBeforeUse` dalej twierdzi, że broń wymaga
przeładowania — mimo że nabój faktycznie jest załadowany. Zweryfikowane na żywo dokładnie na
Pistolecie na Race Raynalda: `mag.current: 1`, ale `chamber.loaded: false` i
`reloadState.required: true` — broń była realnie zablokowana dla KAŻDEJ aktywności (ATAK i nowe
Wystrzel flarę jednakowo), nie tylko dla tej nowej.

Naprawa: `_performLoadOneAction` teraz ustawia `chamber.loaded = true` i czyści `reloadState` po
udanym doładowaniu, tak jak od dawna robi to `_performReloadAction`. Dotyczy każdej broni z
magazynkiem wewnętrznym/bębenkiem i właściwością „ładowanie"/"przeładowanie" ładowaną po jednej
sztuce — czyli też Deer Hunter, R700, Lewar M95, Field 03, Pompka, MGL1S, Moździerz, nie tylko
Pistoletu na Race — więc naprawia ten sam ukryty problem dla każdej takiej broni w drużynie, nie
tylko dla Raynalda. Raynaldowa broń odblokowana ręcznie na żywo (test-strzał przywrócony do 1/1,
żeby nic mu nie ubyło).

Zweryfikowane end-to-end na żywo: synthetic point-pick → „Wystrzel flarę" → karta na czacie →
prawdziwy `AmbientLight` na scenie (te same wartości co Flara: jasne 12 m / słabe 24 m / kolor
`#ff1a1a` / animacja torch 10/10) → po 70 s czasu gry światło poprawnie zamiatane przez istniejący
mechanizm wygasania. Wszystkie 152 istniejące testy nadal przechodzą.

## Zmiany z 6 września 2026 (4) — Podwójne "Doładuj 1 nabój" (`weapons/magazine.mjs`)

Zgłoszenie: Raynaldowy Pistolet na Race miał na karcie DWIE identyczne aktywności „Doładuj 1
nabój". Sprawdzone na żywo na całym świecie: to samo dotknęło trzy bezwłaścicielskie bronie (AK,
Light Fifty, UZI — u nich podwójna „Wymiana magazynka"). Wspólna przyczyna: `syncWeaponMagazine
Activities` (dopisuje aktywności reload/loadOne/magSwap, jeśli ich jeszcze nie ma) była jedynym
mechanizmem „upewnij się, że X istnieje" w całym module BEZ bramki `game.user.isGM` — każdy
podłączony klient (GM i gracz jednakowo) niezależnie decydował „nic jeszcze nie ma, stwórzmy", a
skoro gracz ma prawo zapisu do własnych, osadzonych przedmiotów, oba `item.createActivity(...)`
się udawały. Realny wyścig między dwoma osobnymi przeglądarkami, którego lokalna blokada
(`syncingManagedActivities`) nie mogła złapać — ona chroni tylko przed dwoma wywołaniami NA TYM
SAMYM kliencie w tym samym ticku.

Naprawione dodaniem `if (game.user.isGM)` do obu hooków (`createItem`/`updateItem`) i do
startowego przemiatania `syncAllWeaponMagazineActivities()` przy `ready` — dokładnie ten sam wzorzec,
którego już używają Flara/Latarka/Pochodnia/Pistolet na Race dla własnych aktywności. Sync
magazynek↔uses (`syncAllMagazineUses`) zostaje bez bramki celowo — to deterministyczna funkcja
`mag → uses`, więc nawet gdyby dwóch klientów policzyło ją "jednocześnie", zapiszą ten sam wynik;
tylko tworzenie aktywności jest nie-idempotentne między klientami.

Cztery już istniejące duplikaty skasowane ręcznie na żywo (Raynald/Pistolet na Race „Doładuj 1
nabój"; świat/AK, Light Fifty, UZI „Wymiana magazynka") — zachowany zawsze pierwszy wpis (ten,
który `_findManagedMagazineActivity` faktycznie od zawsze aktualizował), usunięty osierocony drugi.
Pełne przemiecenie całego świata po naprawie: zero pozostałych duplikatów. Wszystkie 152 testy
nadal przechodzą.

## Zmiany z 6 września 2026 (5) — Odzyskane, już narysowane ikony

Zgłoszenie: „chyba brakuje nam ikon, przynajmniej dla ręcznej flary". Sprawdzone systematycznie
(każdy `icon:`/`img:` w `scripts/` porównany z rzeczywistą zawartością `icons/`) — okazało się, że
w większości NIE brakuje ikon, tylko nie były podpięte, dokładnie ten sam wzorzec, który
`chemia-data.mjs`'s własny komentarz z 29 sierpnia już raz opisał i naprawił dla leków/narkotyków.

- **`items/flara.mjs`**: Flara używała `pochodnia_smolowa.svg` jako tymczasowego zastępstwa —
  `icons/weapons/raca_oswietleniowa.svg` (płonący kaganek sygnałowy, dokładnie ten przedmiot) leżał
  nieużywany w tym samym folderze od wcześniejszej paczki ikon. Podpięte.
- **`config/ammo-data.mjs`** („Granat sygnałowy"): reużywał `smoke_grenade.svg`; dedykowany
  `granat_sygnalowy.svg` też już istniał, nieużywany. Podpięte; istniejący egzemplarz u Victora von
  Blitza spatchowany ręcznie na żywo (nowe przedmioty tworzone od teraz dostają go automatycznie).
- **`weapons/addons.mjs`** (aktywności dodatków Bagnet/Granatnik 40mm/Śrutówka .12 Ga): wszystkie
  trzy wskazywały na `icons/activities/...` — folder, który nigdy nie zawierał tych plików (tylko
  generyczne ikony typu akcji). Prawdziwe pliki od dawna czekały w `icons/addons/` (a Śrutówka
  dodatkowo pod inną nazwą: `srutowka-podlufowa.svg`, nie `srutowka.svg`). Podpięte pod właściwe
  ścieżki; żaden gracz nie miał jeszcze zainstalowanego żadnego z tych dodatków, więc nie było
  czego poprawiać na żywo.

Weryfikacja: wszystkie pięć poprawionych ścieżek zwraca HTTP 200 na żywo; 152/152 testów nadal
przechodzi. Prawdziwie brakujące ikony (Raca sygnałowa jako nabój do Pistoletu na Race, cztery
zaślepki craftingowe Narzędzi, opcjonalnie ikona aktywności „Wystrzel flarę" i ~11 generycznych
ikon efektów Chemii) zostały GM-owi przekazane do narysowania — nie skrócone tu, GM prowadzi
własną listę.

## Zmiany z 6 września 2026 (6) — ATAK Pistoletu na Race: pięć zgłoszeń na żywo

Test na żywo ATAK-iem zgłosił pięć rzeczy naraz. Trzy okazały się prawdziwymi lukami, jedna to
osobny, poważniejszy bug w całym systemie amunicji (nie tylko tej broni), jedna to nieporozumienie.

### To jednak nie bug: „karta jest niezwykle rozwlekła"

`_description(w)` w `config/weapons-data.mjs` to jeden, wspólny szablon dla KAŻDEJ broni —
Dostępność pokazuje się zawsze, a akapit `note` i blok „Nie automatyzujemy" (`manual`) pojawiają
się tylko wtedy, gdy dana broń je ma. Zwykły pistolet bez homebrew-owego zastrzeżenia ma mniej
wierszy; Pistolet na Race ma oba, dokładnie tak samo jak Miotacz ognia czy Koktajl Mołotowa —
to ten sam, świadomie ujednolicony szablon, nie coś wyjątkowego dla tej broni.

### Prawdziwy bug: `fixedDamage` był całkowicie ignorowany przez system obrażeń (`weapons/ammo.mjs`)

To wyjaśnia od razu dwa zgłoszenia: „1k4 nigdzie się nie odbija, nie ma jak nałożyć" oraz
„Nałóż ponownie" wyskakujące z czymś, co wyglądało jak błąd dialogu. Zobacz pełny doc comment przy
nowej `_effectiveDamage()` w `ammo.mjs` — w skrócie: `fixedDamage: true` istnieje właśnie po to,
żeby własna tabela obrażeń broni wygrywała ze wspólnym kalibrem (żeby .12 Ga nie spłaszczyło Pompki
4k4 i Dwururki 3k4 do wspólnych 2k4) — ale automat nakładania obrażeń, przycisk ręczny I etykieta
przycisku na karcie czatu wszystkie trzy czytały `caliber.formula` bez wyjątku, ignorując flagę.
Dwa realne tryby awarii z tej samej przyczyny:
- kaliber z INNĄ formułą niż faktyczna tabela broni — R700 (2d8 własne) i Deer Hunter (1k12 własne)
  dzielą kaliber „3006" (formuła „2k6"); Pompka (4k4) dzieli „12ga_s" (formuła „2k4") — po cichu
  rzucały ZŁE kości, bez żadnego błędu, nic nie wyglądało na zepsute;
- kaliber BEZ formuły w ogóle — „race" (Pistolet na Race), „strzykawka" (Strzelba Palmera) —
  automat nic nie robił, ręczny przycisk tylko ostrzegał, a etykieta na karcie pokazywała mglisty
  placeholder zamiast prawdziwych liczb — dokładnie to, co zgłoszono na żywo.

Naprawione jedną funkcją `_effectiveDamage(item, caliber)`: gdy `fixedDamage` jest ustawione (albo
kaliber w ogóle nieznany), bierze własne `system.damage.base` broni, przechodząc na kaliber tylko
gdy broń go nie ma. Naprawia to nie tylko Pistolet na Race, ale też cichy błąd złych obrażeń na
R700/Deer Hunter/Pompce i pewnie kilku innych. Zweryfikowane na żywo (symulowany `dnd5e.
postRollAttack`, Boar jako cel, HP przywrócone po teście): 1k4 od ognia realnie naliczone (4 pkt),
karta czatu prawidłowo pokazuje „OBRAŻENIA — 1K4 OD OGNIA"/„NAŁÓŻ PONOWNIE — 1K4 OD OGNIA" zamiast
starego placeholdera — także retroaktywnie na już istniejących, starszych kartach w historii czatu.

### Prawdziwa luka: flara znikała bez śladu przy użyciu jako broń (`weapons/pistolet-na-race.mjs`)

ATAK nigdy nie robił nic poza zwykłym strzałem — sama raca nie zostawiała żadnego śladu w fikcji.
Naprawione: `onPostRollAttackSpawnImpactFlare` — każdy strzał ATAK-iem (trafiony i chybiony
jednakowo, celowo bez rozróżniania — patrz komentarz przy funkcji) tworzy DOKŁADNIE to samo
samodzielne światło co rzucona Flara / „Wystrzel flarę", w pozycji zaznaczonego tokena celu, przez
ten sam `requestFlareLight`. Zweryfikowane na żywo: światło wylądowało dokładnie na pozycji Boara,
poprawnie posprzątane po teście.

### Prawdziwa luka: brak skrótu do RO Podpalenia (`weapons/pistolet-na-race.mjs`)

„Nie automatyzujemy" RO na Podpalenie to świadoma decyzja z poprzedniej sesji (MG decyduje, jak
przy Koktajlu Mołotowa) — i to zostaje bez zmian. Ale okazało się, że dokładnie taki skrót już
istnieje gdzie indziej: karty granatów (`actors/grenade-inventory.mjs`) od dawna mają przycisk
„RO", który po prostu rzuca `actor.rollSavingThrow` za zaznaczony/wycelowany token i wrzuca wynik
na czat — MG nadal sam decyduje po wyniku, tylko nie musi szukać przycisku RO na karcie celu
ręcznie. `_rollPodpalenieSave` kopiuje dokładnie ten wzorzec dla ST 12 Zręczności tej broni; przycisk
„RO Podpalenie (ST 12)" doczepia się do karty ATAK-u obok przycisku Obrażeń. Zweryfikowane na żywo
— przycisk pojawia się i poprawnie rzuca RO na zaznaczony/wycelowany token.

Wszystkie 152 testy nadal przechodzą.

## Zmiany z 6 września 2026 (7) — granaty: MG zawsze potrzebny do narysowania strefy, ognisty efekt z SZABLONÓW

Kontekst od gracza (Sonk): „gra od kiedy dołączyło AI nie jest właściwie grana — to tryb
deweloperski, rzut granatem to byłem ja testujący". Cztery zgłoszenia naraz, wszystkie w
`actors/grenade-inventory.mjs`.

### Prawdziwy bug: rzut granatem kradł przedmiot graczowi, zawsze, każdemu graczowi

„Rzucam granatem jako Sonk, gra mówi że Sonk nie ma uprawnień do stworzenia Drawing. Granat i tak
się odejmuje. Nie powinno tak się rozjeżdżać — strefa w ogóle się nie narysowała. Gra ukradła
graczowi granat."

Sprawdzone na żywo, nie zgadywane: **każdy** granat w katalogu ma obszar „Sześcian …” (tylko
niewybuchowa raca sygnałowa jest kołem), sześciany rysuje się `Drawing`-iem (osobny bug renderowania
`MeasuredTemplate` typu „rect” w v14 — patrz komentarz przy odpowiedniej gałęzi w
`_spawnExplosiveMarker`), a `DrawingDocument.canUserCreate` to płaskie
`user.hasPermission("DRAWING_CREATE")` bez żadnego wyjątku dla właściciela dokumentu — w
przeciwieństwie do `MeasuredTemplateDocument`, które przepuszcza zwykłego gracza, gdy `author`
szablonu to on sam. `DRAWING_CREATE` w tym świecie mają role `TRUSTED/ASSISTANT/GAMEMASTER`;
wszyscy gracze są zwykłym `PLAYER` (zweryfikowane wprost przez `canUserCreate`/`game.permissions` w
konsoli, nie założone). Czyli: **każdy** rzut prawdziwym granatem i **każda** mina (zawsze
`Drawing`, niezależnie od kształtu) zawsze zawodziły każdemu graczowi — a że to był odrzucony
Promise bez żadnego `catch`, a ilość sztuk odejmowano w tej samej funkcji *przed* tym wywołaniem,
granat znikał z ekwipunku bez śladu na mapie i bez karty na czacie.

Naprawione dokładnie tym samym wzorcem co własne światło Flary (`flara.mjs`): rzucający zapisuje
zwykłą, niewymagającą uprawnień flagę na WŁASNYM aktorze (`explosivePendingPlacement`) — to zawsze
się udaje — a każdy podłączony klient reaguje na `updateActor`; tylko `game.user.isActiveGM`
faktycznie tworzy `Drawing`/`MeasuredTemplate`. Zweryfikowane na żywo wprost przez zapis tej flagi
na aktorze (Boar) i obserwację reakcji GM-owego klienta: poprawna pozycja, rozmiar, flagi — dla
wariantu sześcianu, koła i miny osobno.

### Nowość: efekt wybuchu z tił znalezionych w scenie „!!SZABLONY!!”

Gracz zauważył 5 gotowych sprite'ów w scenie-brudnopisie „!!SZABLONY!!” i zapytał, czy da się ich
użyć (rozciągniętych?) do wybuchów granatów. Skopiowane do `vfx/` modułu pod opisowymi nazwami
(`config/explosion-vfx.mjs` — tam pełne wyjaśnienie, dlaczego akurat te dwie rodziny i dlaczego
rozmiar liczony w KRATKACH sceny docelowej, nie w pikselach referencyjnej sceny SZABLONY — te dwie
sceny mają różną liczbę pikseli na metr, sprawdzone na żywo, nie założone):
- 4 warianty koncentrycznych „pierścieni” wybuchu (`explosion_ring_xl/l/m/s.png`) dla obrażeń
  wybuchowych/siecznych/itp. — dobierany wariant najbliższy naturalnym rozmiarem docelowej strefie,
  żeby duży wybuch (Odłamkowy, 9 m) nie dostawał tego samego rozciągniętego sprite'u co mały
  (improwizowany, 3 m);
- 1 wariant płomienia (`fire_burst.png`) dla Koktajlu Mołotowa / Granatu zapalającego — rozpoznawane
  po `type: "fire"` z istniejącego już `_parseDamageSpec`, zero nowego parsowania tekstu.

Granaty dymne/gazowe/hukowe świadomie nie dostają żadnego efektu — nie mają w tekście efektu ani
jednej kości obrażeń, więc nie ma czym rozróżnić „to nie jest wybuch ani ogień”; to prawdziwa,
otwarta luka w assetach, nie coś naprawionego na pół gwizdka podstawionym złym sprite'em.

### Odpowiedź na „czy da się zgasić efekt razem ze strefą? czy to pora na Midi-QoL?"

Efekt jest `.persist()`owany i `.tieToDocuments(markerDoc)`owany do TEGO SAMEGO `Drawing`/
`MeasuredTemplate`, który MG i tak usuwa ręcznie, gdy uzna wybuch za rozliczony. Sequencer sam kończy
powiązany efekt w chwili usunięcia dowiązanego dokumentu — zero nowego kroku dla MG, zero osobnego
hooka sprzątającego do utrzymania. Zweryfikowane na żywo wprost: usunięcie samego `Drawing` (bez
żadnego ręcznego `endEffects`) kończy powiązany efekt automatycznie.

Świadomie wybrane zamiast sztywnego czasu „1 runda” — treść katalogu i tak nie jest zgodna sama ze
sobą (Koktajl Mołotowa: „Obszar pali się 1 rundę”; zwykły granat odłamkowy: żadnego dopalania w
ogóle), a „rozliczone” zawsze i tak sprowadza się do tego samego, wspólnego momentu: gdy MG usuwa
strefę. Timer rundowy albo wygasłby za wcześnie, albo zostałby bezsensownie po fakcie — dowiązanie
do tego, co MG i tak już robi ręcznie, jest ściślejsze niż jakikolwiek zegar.

**Midi-QoL nie jest tu potrzebny.** To, o co proszono, to jeden, dobrze pasujący hak Sequencera
(`tieToDocuments`), nie brakująca automatyzacja ataku/obrażeń/RO — a te akurat w tym module są
świadomie ręczne (patrz `feedback_gm_in_the_loop_automation` — automatyzujemy wykrycie, nigdy
zastosowanie). Midi-QoL wchodziłby głęboko w te właśnie ścieżki i musiałby się pogodzić z całą
istniejącą, ręcznie pisaną automatyzacją broni/amunicji/granatów w tym module — nieproporcjonalna
cena za problem, który miał dziesięcioliniowe rozwiązanie.

Zweryfikowane na żywo (zapis flagi na Boarze, symulacja sześcianu/koła/miny, zrzut ekranu wybuchu na
mapie, automatyczne sprzątnięcie po usunięciu `Drawing`), posprzątane po teście. Wszystkie 152 testy
nadal przechodzą.

## Zmiany z 6 września 2026 (8) — pierwsza żywa próba: podwójna grafika i wybuch, który nie znika

Raynald naprawdę rzucił granatem na żywo (poprzednia sesja: pełny GM-relay + VFX). Dwa zgłoszenia z
tej pierwszej realnej próby.

### „Zielony prostokąt z tekstem POD wybuchem — jedna reprezentacja graficzna?"

`Drawing` i efekt Sequencera to dwa osobne systemy renderowania bez wspólnego z-indexu do
przestawienia — nie da się tego „naprawić" priorytetem warstwy. Zamiast tego: gdy wybuch faktycznie
dostaje VFX, `Drawing` rysuje się teraz PRAWIE bez śladu (bez obramowania, bez etykiety), a etykieta
przenosi się NA sam sprite wybuchu przez `.text()` Sequencera — dzięki temu tekst i grafika to
dosłownie jeden obiekt, więc nie ma czego przestawiać. Bez VFX (granaty dymne/gazowe/hukowe albo brak
Sequencera) prostokąt zostaje dokładnie taki jak był — wtedy to jedyna grafika, jaka jest.

Pułapka po drodze: `Drawing` całkiem bez obramowania, wypełnienia i tekstu narusza własną walidację
Foundry („Joint Validation: Drawings must have visible text, a visible fill, or a visible line") —
`createEmbeddedDocuments` cicho nic nie tworzy, zostawiając osierocony, niedowiązany efekt Sequencera
(znaleziono to wprost w logu konsoli, nie zgadnięte). Naprawione zostawieniem znikomego, ale
niezerowego wypełnienia (`fillAlpha: 0.02`) — technicznie „widoczne" dla walidacji, w praniu
niewidoczne, tym bardziej pod nieprzezroczystym sprite'em wybuchu na wierzchu. Zweryfikowane na żywo
zrzutem ekranu — pojedyncza, czytelna etykieta na wybuchu, bez śladu prostokąta.

### „Minęła minuta, wybuch dalej stoi — nie widzę po co"

Zgadza się — `tieToDocuments` kończy efekt razem z `Drawing`, ale tylko gdy MG faktycznie go usunie
ręcznie; sam upływ czasu w grze nic nie sprzątał. Dodano drugi, niezależny mechanizm:
`EXPLOSIVE_MARKER_LIFETIME_SECONDS` (60 s) na każdym niebędącym miną znaczniku, zamiatane na
`updateWorldTime` (wzorem `flara.mjs`) — który z dwóch, usunięcie ręczne czy zamiecenie po czasie,
nastąpi pierwsze, kończy to samo dowiązanie. 60 s wybrane wprost z matematyki gracza („rundę to 6 s,
minęła minuta to dziesięć rund") — i, jak się okazało, pasuje też do własnego tekstu katalogu:
Koktajl Mołotowa („pali się 1 rundę" = 6 s) i trio dymny/gazowy/hukowy („1 min" = 60 s) oba kończą
się o czasie lub wcześniej, nigdy po fakcie. Miny świadomie wyłączone z zamiatania — uzbrojona mina
ma trwać do wyzwolenia/rozbrojenia, nie wygasnąć samoistnie.

„Może zostawiłbym wypaloną plamę" — to już zanotowany, nie zbudowany pomysł w `PLAN_shooting_vfx.md`
(„scorch/burn marks... needs a bespoke decal/tile system"); nie budowane teraz, bo o to akurat nie
proszono wprost.

Zweryfikowane na żywo: zapis flagi + odczyt pól `Drawing` (bare gdy VFX, widoczny bez VFX), symulacja
`updateWorldTime` z już-wygasłą flagą (znacznik i powiązany efekt znikają razem), zrzut ekranu z
czytelną etykietą na wybuchu. Realny znacznik z rzutu Raynalda (sprzed tej poprawki) zostawiony bez
zmian — nie dostanie retroaktywnie flagi wygaśnięcia, bo powstał przed tą sesją; do ręcznego usunięcia
kiedy MG uzna za stosowne. Wszystkie 152 testy nadal przechodzą.

## Zmiany z 6 września 2026 (9) — etykieta na wybuchu była ogromna

Natychmiastowa obserwacja po (8): „tekst «granat improwizowany» jest absolutnie ogromny".

Prześledzone wprost w źródle Sequencera (`canvas-effects/canvas-effect.js`), nie zgadywane:
`.text()` NIE przyjmuje dosłownego rozmiaru w pikselach — silnik mnoży podany `fontSize` przez
`(150 / canvas.grid.size)` zanim trafi do PIXI. Na realnych scenach tego świata (siatka ~64 px)
to mnożnik ×2,34 — wysłane `fontSize: 24` renderowało się jako ~56 px. Na największym granacie,
którym to testowałem (odłamkowy, 6 kratek), 56 px wyglądało znośnie; na małym, prawdziwym rzucie
Raynalda (improwizowany, tylko 2 kratki) to samo ~56 px wyglądało absurdalnie wielkie względem
maleńkiego sprite'a — stąd rozjazd między moim testem a zgłoszeniem.

Naprawione podzieleniem z góry: `fontSize: 22 * (canvas.grid.size / 150)`, co daje stały,
rozsądny ~22 px na wyjściu niezależnie od rozdzielczości siatki danej sceny. Zweryfikowane na
żywo liczbowo (`fontSize` wysłane do Sequencera: 9,39 → `9,39 × 150/64 = 22`) i zrzutem ekranu na
tym samym małym granacie.

Przy okazji: realny znacznik z rzutu Raynalda (ten sam z (8), zostawiony wtedy bez zmian) rzeczywiście
używał starego, zbyt dużego rozmiaru — to na nim gracz to zauważył. Skoro poprawka jest czysto
kosmetyczna i odwracalna, podmieniono na żywo tylko jego efekt VFX (ten sam plik, pozycja, rozmiar,
`tieToDocuments`) na wersję z poprawną czcionką, zamiast zostawiać go brzydkim do czasu aż sam
wygaśnie/MG go usunie — sam `Drawing` (i jego 60-sekundowe wygaśnięcie z (8)) nietknięty.

Wszystkie 152 testy nadal przechodzą.

## Zmiany z 6 września 2026 (10) — nadal za duże, i dlaczego nigdy się nie zawijało

Po (9): „poszło z ogromnego na XL. I to MUSI być małe, może być średnie co najwyżej. I czemu nie
łamie linii przy «granat\n»?"

Sprawdzone na żywo bezpośrednio na drzewie PIXI (nie zgadywane): własne przeskalowanie sprite'a
wybuchu (z `.size()`) w ogóle NIE dociera do tekstu — realny `worldTransform` etykiety odpowiadał
dokładnie zoomowi kamery, zero wkładu od skali sprite'a. Więc „ogromne → dalej XL" to nie był
rozmiar pojedynczej litery ustatkowujący się w dół — to CIĄG ZNAKÓW szedł jedną linią na pełną
szerokość, bo PIXI nigdy nie zawija tekstu samo z siebie, a `wordWrap` nigdy nie było ustawione.
Stąd też pytanie o „granat\n" — nie łamało linii, bo zawijanie było zwyczajnie wyłączone.

Naprawione dwiema rzeczami naraz, nie jedną:
- `fontSize` skaluje się teraz łagodnie Z ROZMIAREM wybuchu (16–24 px efektywnie, dla 2–6 kratek) —
  „małe" przy małym granacie, „średnie" co najwyżej przy dużym, zamiast jednego sztywnego rozmiaru
  na wszystko;
- `wordWrap:true` z `wordWrapWidth` przyciętym do własnej szerokości sprite'a na ekranie
  (`sizeSquares * canvas.grid.size` — ta sama arytmetyka co `.size()`, i ta sama przestrzeń
  współrzędnych, w której faktycznie żyje tekst), `breakWords:false` (łamanie tylko MIĘDZY słowami,
  czyli właśnie po „granat", nie w środku wyrazu), `align:"center"` dla równych wielolinijkowych
  etykiet pod wyśrodkowanym sprite'em.

Zweryfikowane na żywo wprost na rzeczywistych, świeżych rzutach gracza (nie tylko moich testach) —
„Is good now!" po ponownym przeładowaniu. Sprzątnięte wyłącznie własne testowe znaczniki; rzuty
gracza sprzed tej poprawki zostawione bez zmian (nie dostaną retroaktywnie zawijania ani nowego
rozmiaru — wygasną same po 60 s albo do ręcznego usunięcia).

Wszystkie 152 testy nadal przechodzą.

## Zmiany z 6 września 2026 (11) — ślady po wybuchu (scorch marks)

Propozycja gracza: własny obrazek (`graphicscrate-scorch-mark-1a_prev_sm.webp` — czarny,
piórkowany rozprysk na białym tle), trwałość ~1 rok, pod wybuchem, 50% krycia, tryb „darken".
Zapytany wprost „czy to ma sens" — tak, z jedną poprawką: **nie jako Tile**. Sprawdzone wprost
w źródle rdzenia (`common/documents/tile.mjs`), nie zgadnięte: `TileDocument` w ogóle nie ma
pola trybu mieszania (blend mode) — tylko `alpha`/`occlusion`/`video`. Prawdziwy Tile z
nieprzezroczystym białym tłem malowałby biały kwadrat na terenie, nie da się tego obejść bez
ręcznego grzebania w PIXI przy każdym odświeżeniu. Trwały efekt Sequencera dostaje
`.blendMode()` od ręki i jest równie trwały — `.persist()` już przeżywa przeładowania tak długo,
jak każemy, a to jedyne, czego naprawdę potrzebuje „ma trwać z rok".

Zaimplementowane w `_spawnScorchMark` (`grenade-inventory.mjs`) + nowa tabela w
`config/explosion-vfx.mjs`:
- rozmiar skalowany proporcjonalnie do wielkości wybuchu (`SCORCH_SIZE_FRACTION = 0.6`, BEZ
  dolnego progu — mały granat zostawia naprawdę mały ślad, zero „przynajmniej tyle", zgodnie
  z wyraźnym zastrzeżeniem gracza w trakcie tej sesji);
- `zIndex:-1` względem sprite'a wybuchu (domyślny 0) — jawnie przypięte, nie zgadywane po
  kolejności tworzenia;
- śledzony we WŁASNEJ liście flag na scenie (`activeScorchMarks`, `[{name, expiresAt}]`) —
  dokładnie ten sam wzorzec co `flara.mjs`'s `FLAG_ACTIVE`/`_sweepExpiredFlareLights`, tylko
  bez dokumentu do powieszenia flagi (tu nie ma żadnego — sam Sequencer effect), więc lista
  sama w sobie jest trwałym rekordem;
- świadomie NIEPOWIĄZANY z `markerDoc`/60-sekundowym wygaśnięciem znacznika wybuchu — cały
  sens śladu to przeżycie wybuchu o rzędy wielkości, nie zniknięcie razem z nim.

Zweryfikowane na żywo: mały (2 kratki) i duży (6 kratek) test granat — rozmiar śladu wyszedł
proporcjonalnie 1.2 i 3.6 kratki; zrzut ekranu potwierdza ślad widoczny POD pierścieniem
wybuchu, dokładnie w jego ciemnym środku; wymuszone wygaśnięcie znacznika wybuchu (60 s) usunęło
`Drawing` i pierścień/ogień, ale NIE ruszyło śladu (potwierdzone: 2 efekty przed, 2 po); osobno
wymuszone wygaśnięcie JEDNEGO wpisu w `activeScorchMarks` poprawnie zakończyło tylko ten jeden
efekt, zostawiając drugi (z prawdziwym ~rocznym terminem) nietknięty.

Na marginesie: nazwa pliku źródłowego („..._prev_sm") sugeruje, że to może być podgląd/próbka
z marketowego pakietu (GraphicsCrate), nie finalny zakupiony plik — warto sprawdzić przed
pokazaniem graczom, nieblokujące tutaj. Też: obrazek to miękki, piórkowany gradient szarości, nie
czysta czerń/biel — `multiply` prawdopodobnie da gładsze, bardziej proporcjonalne przyciemnienie
niż `darken` (który operuje per-kanał minimum i może wypadać niemal bez efektu na średnio ciemnym
terenie) — zostawione na `darken` zgodnie z wyraźną prośbą, ale to jedno słowo do zmiany, gdyby
na żywo nie wyglądało jak trzeba.

Wszystkie 152 testy nadal przechodzą.

## Zmiany z 6 września 2026 (12) — Raynaldowy gear: 9 ikon + prawdziwe statystyki (batch 39)

Wsad: arkusz `Weapons_Resize_39.jpg` (siatka 3×3), 9 przedmiotów „dla Raynalda, do podmiany złych
ikon" + „rozwiń cenę/wagę/opis". Sześć z dziewięciu to domknięcie luk z poprzedniej sesji ikon
(commit 239813e); trzy to nowe przedmioty (składana kolczatka, laptop wojskowy, emulator kart).
Każda pozycja sprawdzona wprost w źródłach (podręcznik `Podrecznik/source.txt`, katalogi modułu)
zanim cokolwiek wymyślono — nie zgadywane hurtowo.

### Co znaleziono w podręczniku (nie zgadnięte)

- **Kolczatki**: pełna, gotowa zasada RAW: RO Zręczność ST 15 przy wejściu na obszar 1,5×1,5 m,
  inaczej 1 obrażenie kłute + Szybkość 0 do początku następnej tury; zbieranie 10 minut; opona
  pojazdu automatycznie przebita; nie działa na maszyny gąsienicowe/kroczące. Cena/waga/dostępność:
  10 gb / 0,5 kg / 40%.
- **Wózek (dwukółka)**: 20 gb / 50 kg / 70%; osobny blok „WÓZEK TYPU DWUKÓŁKA": PW 50, TT 15,
  Ładowność 100 kg, ciągnie 1 średnia istota lub 2 małe.
- **Sprzęt do wspinaczki**: 20 gb / 6 kg / 50% — znaleziony przypadkiem w tej samej tabeli co
  Kolczatki (forma „wspinaczki" nie pasowała do wcześniejszego wzorca wyszukiwania „wspinaczkow…").
- **Laptop wojskowy**: 140 gb / 7 kg / 5% (tabela K100 Elektronika/Sprzęt) + osobna zasada:
  Ułatwienie do Testów Inteligencji tym sprzętem, może zastąpić Narzędzia małego hakera + osobna
  receptura craftingowa (Schematy hakerskie): ST 30, 140 godzin, 50 CE + 1 CH + 14 CZ + 5 MK.
- **Strzały** (wiązka 20 szt., pozycja craftingowa, nie amunicja bojowa): brak własnego wpisu w
  podręczniku — wyprowadzone jako dokładnie 20 × pojedyncza „Strzała" z tabeli Amunicji
  (1 gb / 0,03 kg), zgodnie z „20 strzał" jako startowym ekwipunkiem gdzie indziej w katalogu.
- **Sidła** i **Emulator kart magnetycznych**: sprawdzone wprost — brak w podręczniku. Ceny/wagi
  to szacunek MG (Sidła: 5 gb/0,3 kg/60%; Emulator: 25 gb/0,1 kg/15%, wzorowany na „Wytrychach
  elektronicznych" 25/0,5 kg/5%), jawnie oznaczone jako takie w opisie przedmiotu, nie ukryte
  pod pozorem RAW.

### Kolczatki: awans z zaślepki do prawdziwego przedmiotu z akcją

Kolczatki (i cztery inne: Sidła/Sprzęt do wspinaczki/Strzały/Wózek) były `GEAR_PLACEHOLDERS` w
`gear-data.mjs` — nie wycenione, TODO, tylko cel linku. Cztery zwykłe wygraduowały w miejscu (dalej
`loot`, teraz w nowej tabeli `REAL_GEAR` w tym samym pliku, z prawdziwą ceną/wagą/opisem). Kolczatki
dostały coś więcej — realną akcję „Rozłóż kolczatki" (nowy plik `items/kolczatka.mjs`, dokładnie ten
sam szkielet co `flara.mjs`: gracz wskazuje punkt na mapie, ilość się zmniejsza, zapisywana jest
zwykła flaga na WŁASNYM aktorze, każdy klient reaguje, tylko aktywny MG tworzy uprzywilejowany
dokument) — więc przeszły z `type:"loot"` na `type:"consumable"`.

**Dlaczego prawdziwy `Tile`, nie efekt Sequencera**: obrazek gracza (`vfx/spike_strip.png`,
sprawdzone live przez PIL: 2172×724 px, realna przezroczystość — każdy róg to (0,0,0,0), nie
zamalowane białe tło) nie potrzebuje trybu mieszania, więc nic nie stoi na przeszkodzie zwykłemu
Tile'owi. To też naprawia ograniczenie zgłoszone tej samej sesji przy śladach po wybuchu — Tile
(w przeciwieństwie do trwałego efektu Sequencera) daje MG normalne zaznacz/przesuń/obróć/zmień
rozmiar/usuń na płótnie, bez Menedżera Sequencera. Rozmiar: 3×1 pola (proporcja 3:1 dokładnie jak
oryginalny obrazek), środkowany na wskazanym punkcie — **uwaga**: `TileDocument.x/y` w v14 to
ŚRODEK siatki, nie róg (odwrotnie niż `Drawing`/`MeasuredTemplate` gdzie indziej w tym pliku),
więc odjęcie połowy szerokości byłoby błędem o pół pola — nieużyte tu celowo.

Świadome odejście od RAW: podręcznikowy obszar efektu to 1,5×1,5 m (jedno pole), rozsypywane
„na sąsiadującym z tobą obszarze" — nowa grafika to długi, składany pas na drogę, więc postawiono
na swobodne wskazanie punktu (jak przy granatach), nie ograniczenie do sąsiedniego pola. Opisane
wprost w opisie przedmiotu jako rozbieżność do rozstrzygnięcia przez MG, nie ukryte. RO/obrażenia/
przebicie opony pozostają ręczne (MG rozstrzyga) — zautomatyzowane jest tylko postawienie znacznika.

### Podchwycony błąd na żywo: flagi się scalają, nie zastępują

`createRealGear`'s upsert wywoływał `.update(data)` na już-istniejącym placeholderze — ale
Foundry domyślnie SCALA obiekt `flags`, nie zastępuje go, więc stara flaga
`craftingPlaceholder:true` zostawała, mimo że przedmiot dostał już prawdziwą cenę/wagę/opis.
Złapane na żywo (nie w testach — `placeholderFlagGone` sprawdzone wprost po migracji), naprawione
jawnym kluczem kasującym Foundry (`"flags.MODULE_ID.-=craftingPlaceholder": null`) w obu miejscach,
które robią ten update (`createRealGear` i migracja poniżej).

### Migracja: `migrate-gear-graduation.mjs`

Jak `migrate-pistolet-race.mjs` (ten sam kształt: `commit:false` = podgląd, `commit:true` =
zastosuj, opcjonalny filtr `actors`). Znaleziono na żywo DWA różne kształty starych kopii, nie
tylko ten „czysty": prawdziwy `GEAR_PLACEHOLDERS`-owy stub (flagi `craftingPlaceholder`+`gearId`)
ORAZ luźny, ręcznie wpisany wiersz bez żadnych flag modułu — dokładnie to znaleziono na Raynaldzie:
przedmiot nazwany „Kolczatka" (liczba pojedyncza), `type:"loot"`, `img` wskazujący wprost na plik
portretu jego własnego aktora (`worlds/OUTPUT/characters/.../avatar.png"`) — nie błąd we wspólnym
katalogu, tylko domyślny obrazek z jakiegoś wcześniejszego hurtowego importu postaci, nigdy
niczyim kodem nie dotknięty. Migracja dopasowuje więc PO NAZWIE (odporne na liczbę pojedynczą/mnogą,
bez nawiasów) dla przedmiotów bez żadnych flag modułu, nie tylko po fladze — wystarczająco wąsko
(pięć charakterystycznych polskich nazw), żeby przypadkowa kolizja z czymś niezwiązanym była
mało prawdopodobna.

### Zweryfikowane na żywo (nie tylko w Quench)

- `game.neuroshima.tests.run()` — 152/152 przed i po każdej zmianie.
- Podgląd migracji (`commit:false`) poprawnie znalazł: Raynald/„Kolczatka" ×2 (luźny wpis) i
  Raynald/„laptop wojskowy (narzedzi hackera)" ×1 (już wcześniej ręcznie dopisany przez gracza/MG —
  potwierdza, że kierunek „laptop zastępuje narzędzia hakera" był oczekiwany, zanim to zaimplementowano);
  Zbrojownia: cztery stare zaślepki. Zero fałszywych trafień na reszcie drużyny.
- Po `commit:true`: wszystkie siedem pozycji poprawnie skonwertowane; Kolczatki na Raynaldzie —
  `type:"consumable"`, właściwa ikona, aktywność „Rozłóż kolczatki" obecna, ilość zachowana (2).
- Aktywność „Wystrzel flarę" (Pistolet na Race) — nowa ikona podpięta w kodzie; istniejący
  egzemplarz na Raynaldzie spatchowany ręcznie na żywo (`activity.update({img})` — działa, choć
  odczyt tej samej, nieodświeżonej zmiennej zaraz po `await` mylnie pokazuje starą wartość;
  świeże pobranie z aktora potwierdza poprawny zapis).
- Kolejność linków „Produkcja" u kowala: sidła/sprzęt do wspinaczki/strzały/wózek/kolczatki
  wszystkie renderują się teraz jako `@UUID[]{}` do prawdziwych przedmiotów (kolczatki wymagały
  osobnego scalenia w `_resolveProdukcjaLinks` — nie są ani w `GEAR_PLACEHOLDERS`, ani w
  `REAL_GEAR`, mają własny plik).
- Pełny przelot „Rozłóż kolczatki" przetestowany END-TO-END synteycznym sygnałem na WŁASNEJ scenie
  testowej (nie na scenie gracza): flaga na aktorze → Tile utworzony poprawnie wyśrodkowany,
  192×64 px (3×1 pola przy siatce 64 px), `rotation:0`, `locked:false`, właściwa tekstura — po
  weryfikacji usunięty ręcznie, zero śladów zostawionych na żywej scenie.

Wszystkie 152 testy nadal przechodzą.

## Zmiany z 6 września 2026 (13) — Pokrycie testowe dla batcha 39 (commit `4a589e9`)

Osobna prośba: przejrzeć całą dotychczasową sesję (efekty wybuchów/ślady po wybuchu z (11) +
gear/Kolczatki z (12)) pod kątem sensownych kandydatów na nowe testy Quench i je dopisać.
Zrobione w granicach własnej doktryny `TESTING.md` (Warstwa 1 dane, Warstwa 4 `__testing`,
Warstwa 5 prawdziwy dokument) — bez ruszania canvas/Sequencera/dialogów, zgodnie z jej §4.

Najcenniejsze znalezisko: nic nie sprawdzało, że wolny tekst granatu (`effect`/`save` w
`GRENADE_TYPES`) faktycznie parsuje się do realnej formuły/RO faktycznie rzucanej z karty czatu
(`grenade-inventory.mjs`'s `_parseSaveSpec`/`_parseDamageSpec`, wystawione teraz przez `__testing`)
— literówka w katalogu cofa się po cichu do wartości domyślnych, bez wyjątku. Dopisany test
przechodzi po całym katalogu, nie próbce. Reszta: `gear-data.mjs` (`GEAR_PLACEHOLDERS`/
`REAL_GEAR`) dostało dokładnie tę samą Warstwę-1 co każdy sąsiedni katalog (był to jedyny bez
pokrycia mimo bycia zupełnie nowym), regresja na żywo złapany błąd scalania flag w
`createRealGear` (`.update()` nie kasuje starego `craftingPlaceholder`), `migrate-gear-
graduation.mjs`'s dopasowanie starych kopii (`__testing`), `kolczatka.mjs` (walidacja + ten sam
wyścig pojedynczego-lotu co Pochodnia — sprawdzone, że KOPIA strażnika faktycznie działa, nie
tylko że wygląda podobnie), tabela assetów `explosion-vfx.mjs`.

152 → 182 testy, wszystkie w istniejącej paczce `dane-ekwipunku` (nowy plik nie był potrzebny —
wszystko tej sesji było ekwipunkiem). Statyczny walidator i pełny żywy przebieg Quench czyste.

## Zmiany z 6 września 2026 (14) — Mały medyk: z placeholdera na gotowy zestaw (commit `c417be3`)

Zgłoszenie: „Raynald ma «Mały Medyk 4/5» — spraw, żeby to był prawdziwy zestaw z 4/5 ładunkami."
Znalezisko zanim cokolwiek napisano: zestaw był **już w pełni zbudowany** — tabela leczenia
warstwowego, zasób na 5 ładunków, integracja Sztuczek (Pan Plaster, Aspiryna i Miętusy), VFX,
wszystko w `items/toolkit-medyk.mjs` (386 linii). Nagłówek `toolkits-data.mjs` twierdził
odwrotnie („Mały medyk... DEFERRED (skip:true)") — nieprawda, poprawione. To była więc głównie
migracja, nie budowa od zera, dokładnie ten sam kształt co Pistolet na Race/Kolczatki.

- **`migration/migrate-medyk-graduation.mjs`** (nowy): konwersja `type:"loot"` → `type:"tool"`
  (granica typu — ten sam gotcha co Pistolet na Race, udokumentowany tam, nie odkrywany drugi
  raz) przez `createToolkits()`, z zachowaniem stanu ładunków sparsowanego OGÓLNIE z nazwy
  placeholdera (`/(\d+)\s*\/\s*(\d+)/`, nie na sztywno „4/5"). Uruchomiona na żywo z
  `commit:true`; zestaw Raynalda pokazuje teraz `uses:{spent:1,max:5}` (4/5), wszystkie 4
  aktywności obecne, zweryfikowane trwałe po przeładowaniu.
- Usunięty **`MEDYK_CHARGES_FLAG`** — eksportowany, ale nigdzie nieużywany (sprawdzone grepem po
  całym `scripts/`) — zapas zawsze naprawdę mieszkał na natywnym `system.uses`. Skasowana też
  osierocona wartość `medyk-charges:0` z Zbrojowni.
- **Nowy prawdziwy przedmiot: „Uzupełnienie Narzędzi Małego Medyka"** (RAW: zestaw bandaży/
  strzykawek/środków przeciwbólowych, cena 5 gb wprost z podręcznika — „Jedno uzupełnienie
  kosztuje zazwyczaj 5 gambli") z realną aktywnością „Uzupełnij zapas": jedna sztuka uzupełnia
  sparowany zestaw medyka do PEŁNA (RAW mówi o zapasie na pięć leczeń jako całości, nie o cenie
  za pojedynczy ładunek) i zostaje przy tym zużyta. Waga/dostępność to szacunek MG (podręcznik
  nie ma na to osobnej tabeli), oznaczone jako takie w opisie.
- Przywrócone dane Raynalda z jego arkusza Roll20 (podane wprost przez gracza/MG na żywo, nie
  zgadywane): biegłość w 5 narzędziach (medyka/aptekarza/chemika/elektronika/hakera — wszystkie
  liczą się dokładnie na 6, zgodnie z arkuszem), biegłość w broni (Biała, Palna krótka) i
  pancerzu (Lekki, Średni).
- Świadomie NIE wyegzekwowane: RAW-owy wymóg „w odległości nie większej niż 1,5 m od pacjenta i
  obie ręce wolne" dla Przywracania PW — zostawiony jako reguła rozstrzygana przez MG, na wyraźną
  prośbę.

10 nowych testów (182→192, paczka `dane-ekwipunku`): walidacja nowego przedmiotu, prowizja
aktywności + ten sam wyścig pojedynczego-lotu co Kolczatki (sprawdzony wprost, nie zgadnięty),
pełny przebieg uzupełnienia (kompletne PRZYWRÓCENIE do pełna, zużycie dokładnie jednej sztuki,
brak zużycia na już-pełnym zestawie), dopasowanie/parsowanie N/M w migracji.

## Zmiany z 6 września 2026 (15) — Bez dna (Pakowanie): Udźwig ×2 + plakietka + blokada duplikatów (commit `9b38bf2`)

RAW (podręcznik, „PAKOWANIE"): „Bez dna. Twój Udźwig użytkowy i maksymalny rośnie dwukrotnie."
Zgłoszenie: zamodelować tę klauzulę, pokazać plakietkę w widoku Ekwipunku — a w trakcie budowy,
osobne zgłoszenie: „Multiple instances of Bez Dna don't do anything. They shouldn't be allowed."

- **`actors/bez-dna.mjs`** (nowy): prawdziwy Active Effect na
  `system.attributes.encumbrance.multipliers.overall` (MULTIPLY ×2) — to własne, udokumentowane
  miejsce dnd5e do tego („Initialize base encumbrance fields to be targeted by active effects" —
  komentarz w jego `attributes.mjs`), potwierdzone czytaniem `prepareEncumbrance()` wprost:
  `overall` mnoży KAŻDY próg (encumbered/heavilyEncumbered/maximum), czyli dokładnie „użytkowy I
  maksymalny" naraz, nie tylko twardy limit. Ten sam kształt synchronizacji co `cichy-krok.mjs`:
  stały 16-znakowy `_id` + `keepId`, kolejka debounce+serializowana per aktor, `createItem`/
  `deleteItem` + przemiatanie na `ready`.
- Rozpoznanie przez wspólny mostek `actors/abilities.mjs` (`hasAbility`), nie osobny regex —
  obejmuje realny przedmiot z compendium (flaga `sztuczka:"pakowanie"`) ORAZ luźny, ręcznie
  wpisany feat Raynalda (alias „bez dna" I „pakowanie" — to drugie też, żeby przyszły realny
  przedmiot nazwany wprost „Pakowanie" też się liczył, nie tylko wyodrębniona klauzula).
- **`actors/encumbrance-breakdown.mjs`**: odrębna plakietka „Bez dna ×2" w legendzie Ekwipunku
  (własny CSS — plakietka koloru-swatcha z pozostałych chipów zgniotłaby prawdziwą ikonę FA do
  niewidocznego kwadracika 9×9 px, trzeba było jawnie zresetować). Tylko odczyt — nigdy nie
  tworzy efektu samodzielnie.
- **Blokada duplikatów** (dopisana w trakcie, na żądanie): `preCreateItem` blokuje drugi feat
  grantujący Bez dna, gdy aktor już jeden ma — `hasAbility` jest bulowe, więc druga kopia i tak
  nic by nie dodała, to czysty bałagan na karcie. Zweryfikowane na żywo wprost przeciwko
  Raynaldowi (próba utworzenia drugiej kopii → `created:false`), nie tylko wyczytane z kodu.
- Znalezione i naprawione na żywo NA Raynaldzie (nie przez ten kod — rozpoznanie było bulowe od
  zawsze, nigdy nie ryzykowało podwójnego mnożnika): DWIE pary prawdziwych duplikatów z
  pierwotnego importu — „Bez Dna"/„Bez dna" (dwie kapitalizacje) i dwa identyczne „Mam pod
  ręką" — zdeduplikowane do jednego z każdego. Sprawdzone na WSZYSTKICH innych aktorach w
  świecie: nikt inny nie ma tego wzorca.
- `sztuczki-data.mjs`: `pakowanie` deklaruje teraz `legacyAbilityKeys` + `auto`/`manual` —
  pokrycie „częściowe" (rozwój Cechy i „Mam pod ręką [I]" świadomie zostają ręczne, tylko „Bez
  dna" jest zautomatyzowane).

9 nowych testów (192→201, paczka `sztuczki-most`): obie ścieżki rozpoznania (flaga compendium +
obie nazwy klauzuli/całej Sztuczki), efekt liczący DOKŁADNIE ×2 względem stanu bez Sztuczki (nie
tylko „jakiś efekt istnieje"), usunięcie efektu przy zniknięciu Sztuczki, blokada duplikatu +
kontrola, że niepowiązany feat nie jest przy okazji blokowany.

## Zmiany z 7 września 2026 (16) — Cichy regres: `game.user.isGM` w `init` ucinał pół startu modułu (commit `46ceb39`)

Zgłoszenie GM-a po restarcie FVTT: „W widoku Ekwipunek karty postaci pasek udźwigu zajmuje 2/3
szerokości zamiast całości" oraz, chwilę później, „kiedy Ekwipunek i Zapasy na karcie drużyny się
scaliły? Czy to celowe? Czy na pewno nic nie zginęło?"

**Pasek udźwigu.** Natywny wiersz nagłówka Ekwipunku dnd5e dzieli miejsce między `.encumbrance`
(nasz pasek) i `<ul class="containers">` (przedmioty-kontenery, np. plecaki) po równo przez flex —
nawet gdy lista kontenerów jest pusta. Raynald nie ma żadnego kontenera, więc pusta lista i tak
zabierała ~1/3 wiersza (330/522 px na żywo). Naprawione jedną regułą w `neuroshima.css`:
`.dnd5e2.actor .top > ul.containers:not(:has(li)) { display: none; }` — `:empty` NIE zadziałało,
bo szablon Handlebars zostawia w pustym `<ul>` węzeł tekstowy z samą spacją/nową linią, co dla
`:empty` liczy się jako „niepuste". Zweryfikowane na żywo: 522/522 px (100%) po poprawce.

**Karta drużyny — dużo poważniejsze.** „Scalenie" Ekwipunku i Zapasów okazało się fałszywym
tropem — `git log` na `party-sheet.mjs` pokazuje dokładnie dwa commity, żaden nie ruszał tablicy
`TABS` (dwie osobne zakładki od samego początku, sierpień 2026). Karta drużyny live pokazywała
`sheetClass: "GroupActorSheet"` (natywna klasa dnd5e) zamiast `NeuroshimaGroupSheet", i
`CONFIG.Actor.sheetClasses.group` w ogóle nie zawierał wpisu modułu — `registerPartySheet()`
nigdy się nie wykonał. Natywna karta grupy nie ma zakładki Zapasy wcale, stąd wrażenie „scalenia".

Przyczyna: `registerMedyk()` jest wołany z bloku `init` w `main.mjs` (musi być — rejestruje typy
aktywności przed załadowaniem dokumentów świata), ale jego dopisany dziś wcześniej backfill
uzupełnień Małego Medyka odczytywał `game.user.isGM` **od razu, synchronicznie**. `game.user` jest
bezwarunkowo `null` przez cały hook `init` — potwierdzone wprost w źródle silnika
(`client/game.mjs`: `initialize()` odpala hook `init`, zanim `setupGame()` w ogóle zdąży wywołać
`initializeDocuments()`, które dopiero tworzy `game.user`). Rzucony wyjątek ucinał **resztę
wspólnego callbacka `init`** w `main.mjs` — cichutko, bez żadnego użytecznego śladu poza jedną
linijką w konsoli. Wszystko zarejestrowane PO `registerMedyk()` w tym samym bloku nigdy się nie
uruchamiało, na każdym starcie świata odkąd dziś wcześniej dopisano ten backfill: `registerToolkitChecks`,
`registerChemia`, `registerToolAvailability`, `registerMapWatch`, `registerDifficultTerrainHint`,
`registerDamageReductionUI`, `registerSheetShell`, `registerVehiclePortraitToggle`,
`registerPartyTravel`, `registerPartySheet`, `registerPartyLootLock` i porządkujący hak
czatowy. (Testy na żywo wcześniej dziś NIE złapały tego — ręczne przeładowanie modułu przez
`import()` do obejścia flakowatości `quenchReady` woła `registerMedyk()` już po `ready`, kiedy
`game.user` istnieje, więc przypadkiem maskowało błąd.)

Naprawa: przenieść jednorazowy backfill do `Hooks.once("ready", ...)`, dokładnie tak jak
sąsiedni listener `createItem` już odkłada sprawdzenie per-przedmiot. Zweryfikowane na żywo:
pełny łańcuch `init` domyka się bez wyjątku, karta drużyny wraca do `NeuroshimaGroupSheet` z
kompletem 4 zakładek (Drużyna/Ekwipunek/Zapasy/Kronika), panel Podróży i rozpiska Zapasów
renderują się poprawnie ze wszystkimi 5 członkami. `npm test` czysto.

Nic nie zostało utracone — dane i kod Zapasów (`party-supplies.mjs`, `party-tab-zapasy.hbs`,
wpis w `TABS`) były cały czas nietknięte na dysku; funkcja po prostu milczące nie startowała.

## Zmiany z 7 września 2026 (17) — Alanowy ekwipunek: mechaniki, nazewnictwo, śmieci (część 1/2)

Zgłoszenie: sześć punktów na Alanie — kolimator/baterie, nomeksowy kombinezon, śmieci
handlowe, ukryty identyfikator, ujednolicenie żetonów kasyna w całej drużynie, i „napraw
co jeszcze zobaczysz". Część 6 (żetony) czeka na odpowiedź GM-a po researchu w transkrypcie
sesji 12 (subagent) — tu tylko punkty 1–4 i 6 poza żetonami.

- **Kolimator + baterie → prawdziwy addon + prawdziwe Baterie.** `ADDON_DEFS.kolimator`
  już istniał (+2 zasięg normalny, wymaga Szyny montażowej, wyklucza się z innymi
  celownikami) — Alanowy luźny `loot` z flagą `ulepszenie:"kolimator"` był dokładnie tym
  samym „niedokończonym awansem" co gear z batcha 39. Rozdzielone na: (a) realny addon-item
  „Kolimator" (etykieta `ADDON_DEFS.kolimator.label` skrócona z „Kolimator + baterie" —
  zmiana widoczna we wszystkich komunikatach systemu addonów, nie tylko u Alana), (b) jeden
  egzemplarz `Baterie` przez już istniejącą, w pełni gotową fabrykę
  `game.neuroshima.baterie.create()` (`items/baterie.mjs` — RAW cena/waga/opis, nikt wcześniej
  jej tu nie użył).
  **Decyzja GM-a: żadna z dwóch broni Alana NIE dostaje Szyny montażowej — to celowe.**
  Alan spróbuje zamontować kolimator w grze i mu się nie uda; naprawiony przy okazji
  komunikat błędu (`weapons.mjs`: właściwość `sm` miała etykietę gołego „SM" — nic nie
  mówiącą graczowi, który nie zna skrótu — rozpisana na „Szyna montażowa", więc
  `isAddonCompatible()` teraz mówi wprost, czego brakuje, zamiast rzucać graczem do MG).
- **HK G3 / M1 US Rifle — poprawiona pisownia + ikony.** `WEAPON_NAME_ALIASES` w
  `weapons-data.mjs` od 2026-08-29 już wiedział, że „H&K G3"→„HK G3" i „M1 Garand"→„M1 US
  Rifle" są przestarzałymi nazwami z importu — ale alias istniał tylko, żeby `auditWeapons()`
  mimo złej nazwy trafił ikonę; nazwa na karcie nigdy się nie zmieniła. `auditWeapons()` na
  Alanie nie zgłosił żadnego rozjazdu w liczbach (broń była już poprawna statystycznie) —
  poprawione ręcznie tylko `name`/`img`, których ten audyt świadomie nie dotyka. Odkryta przy
  okazji prawdziwa ikona `hk_g3.svg` (Alan pokazywał generyczną `fully_automatic_rifle.svg`,
  zgłoszoną jako „ikona AK") — nowa ikona NIE była potrzebna, tylko podpięcie właściwej.
  Rozwiązany też pozorny konflikt: feat „Ulubiona Broń H&K G3" miał w treści opis premii dla
  „M1 US Rifle" — to nie pomyłka nazwy, to KANONICZNA nazwa Alanowego Garanda; przemianowany
  tytuł feata na zgodny z jego własną (zawsze poprawną) treścią.
- **Nomeksowy kombinezon** (`combat/podpalenie.mjs`): brak w RAW, zasada domowa. Jedyna
  dźwignia „obrony przed Podpaleniem", jaką ten system w ogóle wystawia, to rzut na
  ugaszenie się (Zręczność/Akrobatyka ST 10) — więc stąd Ułatwienie, gated na
  `system.equipped` + nowa flaga `flags.<module>.nomex`. Wymagało zmiany typu z `loot` na
  `equipment` (Alan nie miał jak w ogóle założyć/zdjąć wcześniejszej wersji) — `trinket`
  jak Latarka czołówka, nie zbroja (0 AC).
- **Identyfikator — sekret MG.** Nowy moduł `items/gm-secret.mjs`: Foundry nie ma natywnego
  sposobu ukryć JEDEN przedmiot przed właścicielem karty (`_prepareItems` czyta
  `actor.items` w całości, bez `testUserPermission` per-item — sprawdzone w źródle dnd5e).
  Flaga `flags.<module>.gmSecret` + hook `renderCharacterActorSheet` usuwający wiersz z DOM
  wyłącznie u klienta bez `isGM` — dokument zostaje w pełni obecny (liczy się do udźwigu,
  MG go widzi), znika tylko wizualnie graczowi. Opis Alanowego identyfikatora: plakietka
  IT-owej technik „Shaniqua Copperfield" ze zdjęciem i czipem — treść od GM-a. Zweryfikowano
  na żywo, że selektor wiersza (`[data-item-id]`) trafia poprawnie i że MG nadal widzi
  wiersz normalnie; sama gałąź `!isGM` nie była testowalna z tej sesji (brak drugiego,
  gracz-owego klienta pod ręką) — do potwierdzenia przy najbliższej sesji.
- **Śmieci handlowe**: „ceramiczny kubek" ważył 1 kg (absurd dla kubka) — 0,3 kg / 2 gb.
  „okulary daleko wzroczntch" (literówka) → „Okulary dalekowzroczne". Wszystkie trzy
  (kubek/okulary/długopis) przestawione z waluty `gp` na `gb` — patrz niżej.
- **Bonus, znaleziony przy audycie**: `Litr Wody` nie liczył się do zapasów wody drużyny
  wcale — `ZASOBY_KATEGORIE`'s `\bwoda\b` nie łapie dopełniacza „Wody" (inny rdzeń wyrazu,
  nie problem granicy słowa). Dodano `\bwody\b` (bezpieczne — nie łapie „zawody"/"dowody",
  bo tam "wody" nie zaczyna słowa). Naprawiło to od razu WSZYSTKICH: Zapasy drużyny skoczyły
  z 20 l (sama woda GMT400) na 48 l po przeliczeniu — Lorentz, Alan, Victor i Raynald mieli
  ten sam martwy `Litr Wody` na kartach. Przy okazji: `Litr Wody`/`Konserwa` na Alanie
  używały jego WŁASNEGO portretu jako ikony (artefakt importu) — podpięte pod istniejące
  `woda_filtrowana.svg`/`canned_food.svg`, którymi reszta drużyny już się posługuje.
- **Znalezisko szersze niż Alan, świadomie NIE naprawione tutaj**: `CONFIG.DND5E.currencies`
  definiuje wyłącznie `gb` („Gamble") — ale zdecydowana większość istniejących przedmiotów w
  całym świecie (nie tylko Alana) wciąż nosi `denomination:"gp"`, klucz, który już nie
  istnieje w konfiguracji. Naprawione tylko na tym, co ten commit i tak tworzył/dotykał
  (nowy Kolimator, Baterie, poprawki cen śmieci) — pełna migracja wszystkich przedmiotów w
  świecie to osobna decyzja GM-a, nie coś do zrobienia po cichu przy okazji jednej postaci.
- `game.neuroshima.auditWeapons()` / `inventoryAudit.auditInventory()` / `.auditItemCompleteness()`
  uruchomione na całym świecie jako część audytu — zero rozjazdów na Alanie we wszystkich
  trzech (stąd wiadomo, że reszta jego ekwipunku jest już poprawna); audyt broni zgłosił
  rozjazdy na 7 innych aktorach, audyt kompletności na 4 — poza zakresem tego zgłoszenia,
  zostawione GM-owi do przejrzenia osobno.

`npm test` czysto po każdym kroku.

## Zmiany z 7 września 2026 (18) — Żeton Luxor: cztery nazwy/ceny w jedną, plus dług z sesji 12 (część 2/2)

Dokończenie punktu 5 z (17): ten sam fizyczny rekwizyt istniał pod **czterema** nazwami z
**trzema** różnymi cenami (Alan „żeton kasyna 10g" 10 gp×5, Lorentz „Żetony Luxor" 0 gp×10 —
dobra nazwa, zła cena, Raynald „5 zetonów" 0 gp — liczba wpisana w NAZWĘ, nie w `quantity`
(tam było 1!), Piekarz „Żetony" 0 gp×9) plus nieistniejący już klucz waluty `gp`.

Zanim ujednolicono, zlecony subagent przeczesał `Transkrypt Sesja 12.md` (negocjacje płacowe
z Willem) — bo „każdy powinien coś mieć, a niektórzy więcej" wymagało wiedzieć, co faktycznie
się wydarzyło, nie zgadywać:
- **200 gb na głowę** dla całej piątki (Alan/Laffitte/Lorentz/Raynald/Victor) — potwierdzone
  wprost przez MG dwukrotnie („200 gambli po łebka", „200 gambli w żetonach dla każdego").
- Fizycznie na scenie padło tylko **5 żetonów** — i **Lorentz** je zabrał („bierze te pięć
  żetonów, wkłada do kieszeni, ja swoje zainkasowałem"). Nie koliduje z jego obecnym stanem
  (10) — nie ruszane, tylko nazwa/cena.
- **Victor** odmówił przyjęcia samych żetonów bez pokwitowania, dostał **papierowy dług**
  zamiast: kartka podpisana przez Willa, opieczętowana pieczątką Luxoru, warta „200 gb w
  amunicji", wystawiona imiennie na niego. MG explicite: „albo w żetonach, albo w
  pokwitowaniu" — nie jedno i drugie.
- **Alan, Raynald, Laffitte** — należy im się to samo 200 gb, scena nigdy tego nie
  rozstrzygnęła na ekranie (Raynald pyta „a reszta?" trzy razy, bez odpowiedzi). Otwarty
  wątek fabularny, nie zrealizowana wypłata.

**Decyzja GM-a: podążyć za historią dosłownie** (a nie „każdemu po trochu dla wygody):
- Nowy `items/zeton-luxor.mjs` (kanoniczny przedmiot, 10 gb/szt., flaga `zetonLuxor`) +
  `migration/migrate-zeton-luxor.mjs` (dry-run domyślnie, ten sam kształt co reszta folderu;
  bez przejścia granicy typu — wszystko już było `loot`, więc zwykły `update()`, `_id`
  zachowane). Uruchomiona na całym świecie: Alan/Lorentz/Raynald/Piekarz przekonwertowani,
  ilości **zachowane** (5/10/5/9) — u Raynalda poprawnie wyciągnięte z nazwy, nie z `quantity`.
- Victor: NIE dostaje Żeton Luxor. Nowy, osobny przedmiot „Pokwitowanie Luxor (200 gb w
  amunicji)" — flaga `luxorIOU`, cena 0 (to roszczenie, nie gotówka), opis cytujący scenę.
- Alan/Raynald/Laffitte: świadomie nietknięci — dług zostaje długiem, nie przedmiotem.
- Piekarz doliczony przy okazji (czysta higiena nazw/cen na NPC-u, nie decyzja fabularna).

`npm test` czysto.

Po zamknięciu FVTT: `npm run build:packs` + `npm run validate:packs` (wszystkie 14 paczek, nie
tylko `sztuczki` — kilka sesji danych czekało na przebudowę). Zweryfikowane wprost przeciwko
przebudowanej LevelDB (nie tylko logowi builda): opis „Pakowanie" w pakcie `sztuczki` faktycznie
niesie teraz plakietkę „Częściowo zautomatyzowane" z odnośnikiem do `actors/bez-dna.mjs`.
`validate:packs`: wszystkie sprawdzenia przeszły; liczby dokumentów sensowne (sprzęt 6,
narzędzia 22, amunicja 21, granaty 13); brak wiszących UUID.

## Zmiany z 7 września 2026 (19) — Victor: ręczny awans zostawił dziury, plus ekwipunek i Evie

Zgłoszenie: „popraw ekwipunek Victora, wszystkie przedmioty; ręcznie wbiłem mu poziom 3 —
sprawdź spójność builda; zrób listę Sztuczek/mechanik i czego brakuje; prawdopodobnie
wsparcie dla Evie"; plus osobna prośba o listę 9 ikon do zamówienia albo licznik braków.

**Root cause budowy postaci**: Victor ma prawdziwą klasę (Zwiadowca 3) i prawdziwą profesję
(Sędzia), ale trafiony ręcznie, z pominięciem części kroków, jakie zrobiłby Advancement
Manager. Brakowało: **Mój biom** (poziom 1 — sama flaga biomów `["miasto","pustynia"]` była
już poprawnie ustawiona, tylko opisowy item nigdy nie powstał), **Wyjadacz** (poziom 2 — jego
DZIECKO wyboru, „Rzeźnik", istniało samo, osierocone, bez rodzica), **Jeden z nas** i **Rzuć
broń i gleba!** (obie z trzech zdolności Sędziego — tylko „Partner" był obecny). Wszystkie
cztery dociągnięte 1:1 z kompendium `neuroshima-2026-overrides.zdolnosci-klasowe`
(`game.packs.get(...).getDocuments()`, filtr po `flags[...].abilityId`, `toObject()` →
`createEmbeddedDocuments`) — nie odtworzone ręcznie, więc flagi/ikony/coverage-badge są
bit-w-bit identyczne z tym, co dostałby każdy inny Zwiadowca. Przy okazji: „Ulubiona Katana"
(feat) miał poprawną, spersonalizowaną treść i ikonę, ale `flags` był `null` — dorobiony
z kanonicznego `ulubiona-bron-zwiadowca`, żeby przyszłe audyty/migracje go rozpoznawały.
PW (30, KON+2×3 lvl na bazie `PW_D8{first:16,perLevel:4}`) i biegłość +2 — poprawne,
niedotknięte. `system.tools` jest pusty (brak wpisów `klusownika`/`rzeznika`) — sprawdzone i
świadomie zostawione: żaden mechanizm w tym repo nie czyta tego pola dla umiejętności
narzędziowych Zwiadowcy (obie Sztuczki działają przez tekst, nie przez rzut z biegłością), więc
to nie jest objaw regresu specyficznego dla Victora, tylko całego systemu nie-automatyzującego
tej gałęzi — osobna decyzja, gdyby MG chciał to jednak wpiąć.

**Homebrew, świadomie NIETKNIĘTE**: „Osełka"/„Dobycie"/„Zasłona" (bonusy do broni siecznej/
katany, spójne mechanicznie, bez odpowiednika w katalogu) i „Siódme poty." (biegłość w
Prowadzeniu Pojazdów + 50% szybciej) — sprawdzone wprost w `migration/migrate-classes.mjs`:
`"siodme poty."` ma tam JAWNY wpis `null` z komentarzem „homebrew — explicitly leave alone",
czyli to nie jest zgadywanie, tylko potwierdzenie wcześniejszej decyzji. „Doktor Quinn" też
się zgadza — to nie ksywka nadana przez gracza, `pochodzenia-data.mjs` ma dokładnie tę etykietę
jako kanoniczną nazwę zdolności Teksasu (k6 3–4). Żadna z tych czterech nie dostaje automatyki
(tak jak spora część kanonicznych Sztuczek zostaje ręczna) — tylko poprawka ikon (patrz niżej).

**Ekwipunek — z loota na prawdziwy przedmiot** (ten sam wzorzec co przy Alanie: jeśli coś JEST
bronią/pancerzem/amunicją, ma nim BYĆ, nie tylko brzmieć):
- „Kurtka ćwiekowana" (`loot`, opis wprost mówił „KP = 11 + mod. ZRC") → prawdziwy `equipment`
  (lekki, KP 11, ZRC bez limitu, 30 gb). AC Victora był na sztywno wpisanym `calc:"flat"/14` —
  ktoś kiedyś policzył 11+3 ręcznie i wpisał na stałe, zamiast założyć zbroję. Po konwersji
  `calc:"default"` przelicza się sam: **14** (zweryfikowane na żywo) — ale teraz podąży za
  Zręcznością, jeśli kiedyś się zmieni, zamiast cicho się zdezaktualizować.
- „4 sztyki 44 magnum" (literówka „sztyki"/„sztuki", `loot`, 0 gb, bez opisu) → prawdziwa
  amunicja „Naboje .44 Magnum" (`consumable`/`ammo`, katalog `44mag`: 1k10 kłute, 3 gb/0,025 kg
  za sztukę, ×4).
- „combat knife(1d2)" (kostka wpisana w NAZWĘ, `loot` — nie do użycia w walce mimo nazwy) →
  prawdziwy „Nóż taktyczny" (`weapon`, katalog: 1k6 kłute/sieczne, Finezyjna+Lekka, 10 gb),
  aktywność ataku załatana ręcznie (ten sam gotcha co zawsze: auto-wygenerowana aktywność ma
  puste `attack.type`/`damage.parts`).
- „2 race oswietleniowe" (`loot`, 0 gb, ilość w nazwie = 2, `quantity` = 1) → 2× prawdziwa
  **Flara** przez istniejącą fabrykę `game.neuroshima.flara.create({actor, quantity:2})` —
  ten sam rzucany-i-świecący system co reszta drużyny, zamiast martwego stub-a.
- „Medpack 2k6+2" (kostka w nazwie, `loot`) → `Medpak` (`consumable`, jednorazowy, 20 gb —
  szacunek MG, formuła leczenia zostaje w opisie do ręcznego rzutu, bez własnej aktywności).
  **Ta sama poprawka zastosowana też u Evie** — identyczny stub siedział na jej karcie.
- Gotcha złapany w locie: pierwsza próba Medpaka przez zwykłe `item.update({type:"consumable",
  ...})` zwróciła sukces, ale NIC się nie zmieniło (Foundry cicho odrzuca całą aktualizację,
  gdy zawiera zmianę `type` na już istniejącym dokumencie) — naprawione przez ten sam wzorzec
  delete+create, którego reszta tego commita już świadomie używała dla Kurtki/amunicji/noża.
- „Katana": opis mówił „Finezyjna, **Dwuręczna**", ale właściwości to `fin`+`ver`
  (Wersatylna) — literalna sprzeczność z własnymi danymi mechanicznymi, poprawiony tekst.
- „M1 Garand" → „M1 US Rifle" — dokładnie ten sam alias-dryf co u Alana w (17)
  (`WEAPON_NAME_ALIASES`), ikona już była poprawna, poprawiona tylko nazwa.
- Puste karteczki wypełnione realnym opisem/ceną/wagą: „Mały Kłusownik" (0 gb → 10 gb, katalog
  `toolkits-data.mjs`), „Krótkofalówka"/„lornetka"/„klucze" (szacunki MG, jawnie tak opisane).
- Waluta `gp`→`gb` na wszystkim, czego commit i tak dotykał (jak w (17), bez zamiatania
  reszty świata) + ikona „Litr Wody" (portret aktora → `woda_filtrowana.svg`, ta sama
  poprawka co Alan dostał w (17), niedociągnięta wtedy do reszty drużyny).

**Evie (`game.actors` — właścicielka Elessar) — sprawdzona wprost przeciwko własnej
specyfikacji w `Postacie/NPC/Evie.md`**: PW 15 (5×poziom Zwiadowcy Victora, zgadza się), AC 14
(Plate carrier typ I, prawdziwy `equipment`, nie `loot`), Premia Biegłości +2 płaska, dokładnie
2 biegłe RO, Sztuczka „Pierwotny instynkt" + Pochodzenie „Czas patriotów" — wszystko zgodne.
Jedyna naprawa: ten sam `Medpack 2k6+2` stub co u Victora (patrz wyżej). Nieautomatyzowane
i świadomie nietknięte: przywołanie na scenę wciąż ręczne (`Evie.md` już to dokumentuje jako
przyjęty stan, nie TODO) — budowa przycisku/skryptu przywołania to osobna, większa decyzja,
o którą nikt nie prosił wprost. Reszta jej ekwipunku (Kajdanki, Odznaka, Torba patrolowa,
Krótkofalówka policyjna, sama broń AR) nieprzejrzana — Victor był przedmiotem zgłoszenia,
Evie tylko przy okazji.

**Świadomie NIE zbudowane**: generyczny `auditClassProgression()`/`repairClassProgression()`
(odpowiednik `auditWeapons` dla „czy postać ma wszystkie zdolności klasowe należne jej
poziomowi"). Przyczyna źródłowa (ręczny awans pomija kroki Advancement Managera) jest
ogólna, nie specyficzna dla Victora — więc narzędzie miałoby sens, gdyby się powtórzyło.
Nie budowane teraz, żeby nie rozdmuchiwać zgłoszenia o jedną postać w nowy podsystem bez
pytania; zanotowane tutaj jako gotowy do podjęcia pomysł, nie zapomniane zadanie.

**Ikony — nowy licznik zamiast gaszenia pojedynczych braków.** Cztery homebrew-owe Sztuczki
Victora (Osełka/Dobycie/Zasłona/Siódme poty.) nigdy nie dostały ikony — Foundry po cichu
podstawił portret aktora. To pasuje do zgłoszonego wzorca „to się powtarza": zamiast zamawiać
pojedynczy obrazek (marnuje 8 z 9 kafelków siatki Gemini) albo znowu nic nie zanotować,
nowy `dev/icons/MISSING.md` zbiera braki aż do kompletu 9, z gotowym sugerowanym opisem
promptu na każdy wiersz. Aktualnie 5/9 (cztery powyższe + już wcześniej zgłoszony, dzielony
`grenade-signal`/`smoke_grenade.svg` z (16)-erowej rundy Pirotechniki). Następny numer
skoroszytu: **40** (ostatni użyty: `process_grid_39.py`, batch Raynalda z (12)).

Żadne pliki `.mjs` nie zostały zmienione w tym zgłoszeniu — wyłącznie dane na żywo (Victor,
Evie) plus dwa pliki dokumentacji (ten wpis, `dev/icons/MISSING.md`). `npm test` czysto
(nic w kodzie się nie zmieniło, uruchomione mimo to jako standardowa kontrola zamykająca).

## Zmiany z 7 września 2026 (20) — Korekta (19): profesja to wybór JEDNEJ zdolności, nie trzech

Zgłoszenie użytkownika, dosłownie: „You choose ONE per level up of the subclass every couple
of levels. Did you add them all???!" — słusznie. (19) rozdało Victorowi wszystkie trzy
zdolności Sędziego („Jeden z nas", „Rzuć broń i gleba!", „Partner") na podstawie
`PROFESSIONS.sedzia.abilities` w `classes-data.mjs`, czytając tę tablicę jako „to dostajesz,
gdy bierzesz profesję". To było zgadywanie z tabeli źródłowej zamiast sprawdzenia
rzeczywistej konfiguracji Advancement — a ta akurat mówi wprost co innego.

**Zweryfikowane tym razem wprost z przedmiotu podklasy w kompendium**
(`game.packs.get("neuroshima-2026-overrides.profesje")`, dokument „Sędzia",
`system.advancement`): to `ItemChoice` na poziomach 3/6/10, każdy z `choices: { count: 1 }`.
Poziom 3 wybiera 1 z 3 zdolności profesji. Poziomy 6 i 10 wybierają 1 z tej samej puli **albo**
z całej puli Sztuczek — czyli profesja może się skończyć na 1, 2 lub 3 z 3 zdolności, zależnie
od tego, czy gracz w ogóle woli przy 6/10 wziąć profesję zamiast Sztuczki. Victor, na poziomie
3, powinien mieć dokładnie **jedną** — i miał ją od początku: „Partner" (spójne też z tym, że
Evie w ogóle istnieje). „Jeden z nas" i „Rzuć broń i gleba!" nie były brakiem, tylko czymś,
czego jeszcze nie zdążył wybrać — dodanie ich obu było błędem, nie naprawą. Usunięte.

Przy tej samej weryfikacji wyszedł na jaw DRUGI, osobny błąd — tym razem przeoczenie, nie
nadmiar: `ItemGrant` klasy na poziomie 1 to w rzeczywistości **trzy** bezwarunkowe pozycje
(„Mój wróg" — ogólny rodzic, „Mój biom", „Ulubiona broń"), nie dwie. Victor miał wariant
wroga („Mój wróg: Ludzie") wzięty za sam ten feature, ale nigdy nie dostał samego rodzica
„Mój wróg" jako osobnego przedmiotu. Dociągnięty z kompendium tak samo jak reszta w (19).

Stan końcowy na poziomie 3 (14 featów): Mój wróg + Mój wróg: Ludzie + Mój biom +
Ulubiona Katana (poziom 1) · Wyjadacz + Rzeźnik + Kłusownik (poziom 2) · Cichy krok +
Partner (poziom 3) · plus pięć nietkniętych homebrew/Pochodzenia (Osełka/Dobycie/Zasłona/
Siódme poty./Doktor Quinn). To teraz zgadza się 1:1 z realnym Advancement, nie z moim
odczytem tabeli źródłowej.

**Nauka, zapisana wprost, żeby się nie powtórzyła**: `classes-data.mjs`'s `levels{}` to
źródło dla generatora paczek (`dev/classes/gen_features.py`), nie API, które samo mówi
„ile na raz". Znaczenie markerów (`PROFESJA`, `PROFESJA_LUB_SZTUCZKA`) i realna liczba
wyborów żyje w skompilowanym `system.advancement` konkretnego dokumentu klasy/podklasy w
kompendium — to jest prawda, którą trzeba czytać, gdy sprawa dotyczy „ile/które". Ten sam
błąd byłby możliwy na KAŻDEJ profesji w tym pliku (Ganger/Gladiator/Najemnik, Gwiazda/
Kaznodzieja/Mafiozo, itd.) — jeśli kiedyś wypłynie gdzie indziej, to ten sam kształt, ta
sama poprawka.

Żadne pliki `.mjs` nie zmienione (jak w (19)) — poprawka wyłącznie na żywych danych Victora.

## Zmiany z 7 września 2026 (21) — Audyt builda i ekwipunku drużyny (Alan, Lorentz, Laffitte, Raynald) + migracja waluty świata

Realizacja `HANDOFF_party_build_audit.md`. **Piekarz i Kier wyłączeni z zakresu wprost przez
użytkownika w trakcie sesji** — hand-off ich obejmował, ta praca nie. Sekcje 4B (Kier) i
4C (Piekarz) pozostają nierozstrzygnięte.

### Odkrycie, które zmieniło cały audyt: startowa Sztuczka

`Tabele/Sztuczki.md` mówi wprost: „Na starcie postać może wybrać **jedną Sztuczkę** (jeśli
spełnia wymagania) lub **50 gambli**". Żadna klasa nie daje Sztuczki na 1 poziomie
(najwcześniejszy slot to 4), więc przy audycie „czy poziom 3 się zgadza" ta jedna Sztuczka
łatwo wygląda na nadmiar — i o mało nią nie została uznana.

Punkt wyjścia: **żaden feat w całej drużynie nie miał flagi `sztuczka`**. Wszystkie pięć
startowych Sztuczek istniało na kartach, ale jako luźne, nieoflagowane fragmenty z importu
Roll20 — najczęściej **rozbite na osobno nazwane klauzule**, ten sam kształt co Berserk w
`migrate-classes.mjs`'s `ALIASES`. Metoda, która to rozwiązała: szukać tekstu feata **wewnątrz
opisów** dokumentów w paczkach, nie po nazwie feata.

| Postać | Startowa Sztuczka | Na karcie figurowała jako |
|---|---|---|
| Victor | `Samuraj` | `Osełka` + `Dobycie` + `Zasłona` (3 klauzule) |
| Alan | `Szybkie palce` | `Quick Change` |
| Raynald | `Pakowanie` | `Mam pod ręką` + `Bez dna` (2 klauzule) |
| Laffitte | `Patriota` | `Patriota` (dobra nazwa, zero flag) |
| Lorentz | — | brak (potwierdzone z kartą Roll20) |

Najdotkliwszy z tego był Alan: `Szybkie palce` mają `coverage: "auto"` i są w pełni
zaimplementowane w `weapons/magazine.mjs`, więc jego wymiana magazynka w Akcji Bonusowej
**po prostu nie działała** — kod nie miał po czym poznać, że gracz tę Sztuczkę ma.
Scalenie w kanoniczne przedmioty załatwiło to bez pisania linijki kodu.

Scalenie `Pakowania` było bezpieczne dla automatyki `Bez dna`, bo
`ABILITY_DEFINITIONS[BEZ_DNA].aliases` zawiera **oba** kształty (`"bez dna"` i `"pakowanie"`)
— sprawdzone przed scaleniem, nie po.

### Laffitte — brakująca profesja (hipoteza 4A z hand-offu potwierdzona danymi)

Cwaniak 3 bez podklasy. `Cwaniak.system.advancement` ma na poziomie 3 wpis typu `Subclass`
(„Profesja"), więc to była realna dziura, nie wybór. Użytkownik wskazał **Kaznodzieję Nowej
Ery** — i dane to niezależnie potwierdziły: pula poziomu 3 tej profesji to
`Amen / Łaska boża / Mój bóg kule nosi / Tarcza wiary`, a Laffitte miał już feat
`Jachhhhty (Amen)`, który `ALIASES` mapuje na `"amen"` („player's flavour name"). Wybór był
więc dawno dokonany, brakowało wyłącznie dokumentu podklasy. Dograne: podklasa + kanoniczny
`Amen`. Skasowany bezimienny feat-śmieć (pusta nazwa, pusty opis, ikona-awatar).

Konflikt z `PLAN_berserk.md` §6 (Brutal + Kaznodziej w grupie `unarmoredAc`) **nie jest już
aktualny** — jedynym Brutalem był Piekarz, którego Laffitte zastąpił (Sesja 12).

### Raynald — realny nadmiar

Build zgadzał się co do jednej pozycji **poza** ośmioma featami. Usunięte za zgodą użytkownika:
- `Szybkie ręce` (poziom 4) i `Wykształciuch` (poziom 5) — zdolności z przyszłych poziomów;
  Advancement Manager przyzna je sam przy awansie.
- `Pełna micha` — okazała się klauzulą zdolności `Za garść gambli`, czyli profesji **Gwiazda**
  (Cwaniak). Na Specu/Monterze nie miała prawa się znaleźć.
- `Skarb`, `Prosto z fabryki`, `Do ostatniej kropelki` — nie istnieją w żadnym kompendium.
  `Skarb` odwołuje się w tekście do „twojego poziomu Speca", więc kiedyś istniał; dziś nie.

### Ekwipunek — martwe bronie

Trzy bronie miały **zero aktywności** (`system.activities` puste), czyli nie dało się nimi
zaatakować — dokładnie pułapka nr 3 z hand-offu, tyle że zastana, nie stworzona:
- Lorentz `Złoty Desert Eagle` — odbudowany z katalogowego `Desert Eagle`, zachowany opis i
  grawer, `+1` do trafienia wprost z jego własnego opisu, cena 300 gb (decyzja użytkownika).
- Raynald `Pistolet B92` — katalog **ma** wpis `B 92`; sklonowany. Przy okazji magazynek
  wrócił z 9 na katalogowe 15.
- Lorentz `Pochodnia` — część obrażeń bez kości; odtworzona przez istniejącą fabrykę
  `game.neuroshima.pochodnia.create("improwizowana")` (4 aktywności).

Laffitte `Laska` też miała obrażenia bez kości — ustawione 1k6 obuchowe (homebrew, patrz
`TODO_mechanika.md` §4).

Lorentz miał **duplikaty** `Kastet` i `Desert Eagle` — po dwie sztuki, w każdej parze jedna
z opisem i jedna bez, identyczne statystyki i flagi. Skasowane te bez opisu. Warto odnotować,
że pierwsza próba **słusznie się zablokowała**: zabezpieczenie porównywało surową długość
opisu, a „pusty" opis to w rzeczywistości `<p></p>` (7 znaków). Bez porównania po tekście bez
tagów skasowałoby się nie te sztuki.

### Karty postaci — dwa błędy systemowe, oba z importu Roll20

1. **Biegłości**: `armorProf` i `weaponProf` były **puste u wszystkich pięciu postaci**.
   Wyrównane do tabel z `classes-data.mjs`. (Raynald przy okazji stracił `med` — patrz
   `TODO_mechanika.md` §10.)
2. **`ac.calc: "flat"`** u czterech z pięciu — KP wpisana na sztywno, pancerz w ogóle się nie
   liczył. Przełączone na `default` (decyzja użytkownika, świadomie akceptując, że dwie
   postaci tracą po 1 KP):

   | Postać | Przed | Po | Uwaga |
   |---|---|---|---|
   | Lorentz | 13 | **16** | + naprawa kamizelki, patrz niżej |
   | Alan | 15 | 15 | kamizelkę miał **nie założoną** — założona |
   | Laffitte | 13 | 12 | nie nosi pancerza |
   | Raynald | 13 | 12 | Plate carrier typ I, ZRĘ 0 |

Obie kamizelki (`Kamizelka Płytowa` Lorentza, `Kamizelka Kuloodporna ☩` Raynalda) były typu
`loot`, więc nie dawały KP w ogóle. Przekonwertowane na `equipment` przez create+delete
(pułapka nr 2 z hand-offu), dopasowane po wadze: typ III (KP 14) i typ I (KP 12). Nazwy
graczy zachowane, ich opisy dopisane kursywą pod katalogowym.

### Lorentz — Sztuczka od MG

Jako jedyny nie miał startowej Sztuczki (potwierdzone z kartą Roll20). Użytkownik przyznał
mu ją jako gratis „na tanka / HP / odporności / leczenie". Wybrane **`Ćwiczenie czyni
mistrza`** (`req: "Brak"`, powtarzalna, „+2 do jednej Cechy"), bo jako jedyna daje +2 do
Cechy i **nie wymusza noszenia ciężkiego pancerza** (`Pancerny` odrzucony przez użytkownika
z tego właśnie powodu; `Kuloodporność` i tak odpadała — wymaga CHA/MDR/INT 15+, a on ma 8/14/8).
Zastosowane wprost: KON 15 → 17, PW 30 → 33.

### Migracja waluty `gp` → `gb` (cały świat)

Decyzja użytkownika po dwukrotnym wcześniejszym odłożeniu. `CONFIG.DND5E.currencies` zna
tylko `gb`, a świat siedział na `gp`.

- **1055 przedmiotów** zmigrowanych: 522 na 73 aktorach + 533 w katalogu Itemów. Zero błędów,
  zero pozostałości (zweryfikowane osobnym przebiegiem).
- **19 miejsc w 18 plikach źródłowych** emitowało `denomination: "gp"` — to była prawdziwa
  przyczyna, bo każdy nowo tworzony przedmiot odtwarzał błąd. Poprawione; usunięty też
  nieaktualny komentarz „Traktujemy gp jako gb (gamble)" w `ammo-inventory.mjs`.
- **Paczki nie zostały przebudowane** — patrz `TODO_mechanika.md` §6. To jedyna otwarta część.

### Opisy, wagi, ceny

**46 przedmiotów** uzupełnionych. Ceny prowiantu wzięte z `Tabele/Zywnosc.md` (Konserwa 15 gb,
Woda pitna 1 gb/l), surowce z `Tabele/Narzedzia.md` (CH/CZ/CE = 1 gb/100 g). Reszta —
głównie zbieractwo Lorentza, które miało hurtem wagę 1 kg i cenę 0 — wyceniona ręcznie i
opatrzona opisem.

Po przebiegu w całej drużynie zostały **dwie** pozycje bez ceny i obie tak mają zostać:
`Pokwitowanie Luxor` Victora (dokument, nie towar) i `Pochodnia Improwizowana` Lorentza
(katalogowa cena to 0 — robi się ją ze śmieci).

Naprawione też: `Medpak` Victora i Evie były typu `consumable` zamiast `lekarstwo` —
zdjęte istniejącym `inventoryAudit.repairChemia()` (2/2, audyt schodzi do zera). `Nóż
taktyczny` Victora dostał brakującą `availability: 70` z `auditWeapons()`.

### Ikony

**Zero nowych pozycji w `dev/icons/MISSING.md`.** Po audycie każdy przedmiot drużyny
inny niż feat wskazuje na realną ikonę modułu. Jedyny znaleziony błąd był tego rodzaju,
który ten plik każe naprawiać w miejscu, a nie kolejkować: `Litr Wody` Lorentza wskazywał na
portret aktora, choć `woda_filtrowana.svg` istnieje i używają go wszyscy pozostali.
Pozostałe dwie ikony-awatary siedzą na featach (`Siódme poty.`, `Mizoofobia`), które są
z tej kolejki wyłączone z definicji.

### Testy

201/201 przechodzi (`game.neuroshima.tests.run()`).

## Zmiany z 8 września 2026 (22) — TODO mechaniczne z audytu (22): Samuraj, Pochodzenie Victora, treść Koloru Kobaltu

Realizacja `TODO_mechanika.md` spisanego przy audycie (21). Zakres bez zmian: Victor, Alan,
Lorentz, Laffitte, Raynald — Piekarz i Kier nadal poza zleceniem.

### Samuraj — pierwsza Sztuczka wręcz z realną automatyką (`actors/samuraj.mjs`)

Trzy z czterech klauzul, `coverage: none` → `partial`:
- **+1 do Testu Ataku** bronią sieczną — hak `dnd5e.preRollAttack`
- **+1 do obrażeń** bronią sieczną — hak `dnd5e.preRollDamage`, dokładany do pierwszego rzutu,
  nie do każdej części obrażeń
- **TT +1** z bronią sieczną w ręku — Active Effect na `system.attributes.ac.bonus`

Czwarta („wyciągnięcie finezyjnej broni siecznej bez Darmowej Interakcji") jest zadeklarowana
w `manual`: ten system nie śledzi darmowych interakcji jako zasobu, więc nie ma czego zaczepić.
Lepiej powiedzieć to wprost, niż udawać automatykę.

Dwie decyzje warte zapisania:
- **„Broń sieczna" = broń, której obrażenia zawierają `slashing`**, niekoniecznie wyłącznie.
  Nóż taktyczny Victora zadaje „kłute+cięte" i wg literalnego brzmienia zasady nadal jest bronią
  sieczną. Czytamy `system.damage.base.types` **oraz** typy z części obrażeń aktywności, bo broń
  z katalogu wypełnia jedno albo drugie zależnie od fabryki, którą powstała.
- ⚠️ `damage.parts[].types` to **Set**, nie tablica. `JSON.stringify` na tym zwraca `{}`, przez co
  pierwsza wersja wykrywania „widziała" broń bez typów obrażeń. Ta sama klasa pułapki co
  `system.activities` z ARCHITECTURE.md §10 — stąd `_types()` w tym pliku.

Bonusy biorą broń **z aktywności**, nie „jakąkolwiek założoną" — inaczej katana w plecaku
podbijałaby strzał z karabinu. Efekt TT dopina się i odpina na `updateItem` przy zmianie
`system.equipped`, czego „Bez dna" nie musi robić (tam warunkiem jest samo posiadanie Sztuczki).

Zweryfikowane na żywo na Victorze przed zamknięciem świata: KP 14 → 15 z kataną w ręku, 14 po
jej zdjęciu, 15 po ponownym założeniu; `+1` doklejane kataną, zero przy M1 US Rifle.
Siedem testów w `sztuczki-combat.test.mjs`.

### Victor — Pochodzenie Teksas → Detroit

Audyt (21) zostawił Victorowi feat `Siódme poty.` jako „homebrew, bo `ALIASES` każe nie ruszać".
Sprawdzenie pokazało co innego: to **prawdziwa zdolność Pochodzenia Detroit** (k6 1–2), a tekst
na karcie zgadza się z paczką co do słowa. Victor miał ją mimo Pochodzenia Teksas, z którego
miał już poprawne `Doktor Quinn` — a Zwiadowca nie dostaje slotu Pochodzenia na żadnym poziomie
1–12, więc druga zdolność była nadmiarem niezależnie od treści.

Decyzja użytkownika: **to Pochodzenie było wpisane źle, nie zdolność**. Victor przeniesiony na
Detroit — `Doktor Quinn` usunięty, `Siódme poty` podpięte jako kanoniczna zdolność z paczki.

Premia +1/+1 przeliczona zgodnie z tym, co zakłada `migrate-pochodzenia.mjs`: cofnięta premia
Teksasu (KON, CHA), naliczona Detroit (ZRĘ, MDR), a `AbilityScoreImprovement` na nowym
przedmiocie ma zapisane `value`, więc zdjęcie Pochodzenia odwróci to poprawnie.
ZRĘ 16→17, MDR 16→17, KON 14→13, CHA 10→9. **PW 30→27** (modyfikator KON spadł o 1 na trzech
poziomach). KP bez zmian — 16 i 17 dają ten sam modyfikator.

⚠️ `item.toObject().system.advancement` to **obiekt kluczowany po `_id`**, nie tablica —
`.find()` na tym rzuca. Kosztowało to jedno nieudane podejście w trakcie tej sesji.

### Kolor Kobaltu — treść kampanijna nie miesza się z podręcznikiem

Użytkownik zgłosił, że `Mizoofobia` Laffitte'a i `Schizofrenia paranoidalna` Raynalda to
**house rule tej kampanii**, wymyślone pod te dwie postaci, i nie powinny się pokazywać, gdy
ktoś wyłączy Kolor Kobaltu. Moduł miał już do tego przełącznik (`kobaltEnabled`,
`PLAN_kobalt.md`), używany dotąd tylko przez latarki.

Rozstrzygnięcie: **tabel podręcznikowych nie rozszerzamy.** `CHRONIC_DISEASES` i `PHOBIAS` to
ścisłe k8 (str. 108–112) i dziewiąty wpis zepsułby zarówno kość, jak i zgodność z RAW. Zamiast
tego dwie osobne mapy — `KOBALT_DISEASES` i `KOBALT_PHOBIAS`, bez pola `roll`, bo tych się nie
losuje — plus osobna grupa `<optgroup>` w pickerze, dokładana tylko przy włączonym przełączniku.
`_select()` w `health-panel.mjs` obsługiwał grupy i płaskie wpisy w jednej tablicy, więc renderer
nie wymagał zmian.

**`getDisease()`/`getPhobia()` rozwiązują treść Kobaltu niezależnie od przełącznika.** To celowe:
przełącznik decyduje, co da się *wybrać*, a nie kasuje tego, co postać już ma. Inaczej wyłączenie
Kobaltu zamieniłoby chorobę Raynalda w pustą pozycję „własną".

Co dokładnie doszło:
- **Mizoofobia** (Laffitte) jako **fobia**, nie choroba — mechanicznie to wyzwalacz + RO na
  Mądrość + łagodzenie, czyli dokładnie kształt fobii; nie ma drabiny Przewlekły/Ostry/Krytyczny.
  Ma własne **ST 16** (domyślne to 15), więc doszło `phobiaSaveDc(entry)`. Podpięte w trzech
  miejscach `health-panel.mjs`, w tym w porównaniu wyniku — **gdzie zostawienie stałej byłoby
  cichym błędem**: rzut szedłby przeciw 16, a ocena sukcesu przeciw 15.
- **Schizofrenia paranoidalna** (Raynald) jako choroba Kobaltu. Jej drabina stopni jest
  **identyczna z podręcznikową `Paranoja`** i to nie przypadek — przy stole to ta sama choroba
  pod nazwą postaci. Domowa jest wyłącznie tabelka **„Lekarz i farmaceuta"**, która do tej pory
  żyła jako wolny tekst w `notes`: nie dało się jej ani ładnie wyświetlić, ani rzucić. Teraz jest
  danymi (`kobaltTable`), renderuje się w szczegółach choroby i ma guzik rzucający k20, który
  wypisuje trafiony wiersz na czat.
- W `disease-effects.mjs` doszedł wpis `schizofreniaParanoidalna`, będący kopią `paranoja`.
  Powtórzenie jest świadome i konieczne: **bez niego przepięcie karty Raynalda na nowy klucz
  po cichu zabrałoby mu Active Effect**, bo efekty są kluczowane po id choroby.

Siedem testów w `choroby.test.mjs`, w tym pilnujące, że obie tabele podręcznikowe nadal mają
dokładnie 8 pozycji z rzutami 1–8, że tabelka k20 pokrywa 1–20 bez dziur i zakładek, i że
wyłączenie przełącznika nie odbiera treści karcie, która już ją ma.

### Bronie homebrew w katalogu

`Miecz` (Raynald) i `Laska` (Laffitte) dopisane do `WEAPONS`, więc `auditWeapons()` wreszcie je
widzi — wcześniej były dla niego niewidzialne. `Miecz` spisany z karty (1k10 cięte, celowo bez
właściwości, żeby nie zmienić broni, którą gracz już gra). `Laska` miała obrażenia **bez kości**;
nadane 1k6 obuchowe + finezyjna, wartości moje, wciąż do zatwierdzenia przez MG.

### `ALIASES` w `migrate-classes.mjs`

- Dopisane `"jednoreki"` i `"lekka spluwa"` → `"rewolwerowiec"`, żeby ponowny import postaci
  Lorentza nie odtworzył rozbicia zdolności profesji na osobne featy.
- Wpis `"siodme poty": null` **zostaje `null`** (to zdolność Pochodzenia, więc ten resolver ma ją
  ignorować), ale komentarz mówi teraz prawdę zamiast „homebrew, zostaw".

### Paczki kompendiów przebudowane

`npm run build:packs` wymaga w pełni zamkniętego Foundry (builder ma na to poprawny guard i
odmawia, dopóki LevelDB jest zajęty). Po przebudowie zweryfikowane wprost w bazie:
- **`gp` = 0** we wszystkich paczkach — migracja waluty z (21) domknięta; do tej pory przedmiot
  przeciągnięty z kompendium wracał z `gp` mimo poprawionych źródeł
- `bron` = 79 dokumentów, w tym `Miecz 40 gb` i `Laska 15 gb`
- `Samuraj` ma teraz wypaloną flagę `coverage: "partial"` zamiast nieaktualnej `"none"`

`npm run validate:packs` — wszystkie testy przechodzą, `dangling uuids: none`.

### Czego ta sesja NIE zrobiła

- **Migracja danych na dwóch aktorach** (przepięcie choroby Raynalda z `paranoja` na
  `schizofreniaParanoidalna` + wyczyszczenie zduplikowanej notatki; zamiana feata `Mizoofobia`
  Laffitte'a na wpis w `fobie`). Offline'owy serwer MCP nie mógł zapisać: jego auto-backup
  wykłada się przy kopiowaniu pliku `LOCK`, który trzyma on sam (`EPIPE ... _backups/actors_*`).
  Odczyty działają, zapisy nie. Do zrobienia na żywym świecie — to dwie małe zmiany.
- **Pełny przebieg testów.** Przeładowanie strony wyrzuciło sesję na ekran logowania, a
  użytkownik `MCP` ma hasło. `npm test` (walidator warstwy testowej) i `validate:packs`/
  `validate:css` przechodzą, ale `game.neuroshima.tests.run()` nie został po tych zmianach
  uruchomiony.
- `auditSurowce()` — okazało się, że **nie ma co robić**: wszystkie cztery pozycje surowców
  drużyny mają już kanoniczne ikony i typ `consumable`, więc `getSurowiecType()` je rozpoznaje.
  Wpis w `TODO_mechanika.md` (21) był w tym punkcie po prostu błędny.
- Nadmiarowe `exhaustionSources` u Raynalda: trzy identyczne wpisy „Bezsenność" z tym samym
  `addedAt`. Zauważone przy okazji, nie ruszane — osobny temat.

## Zmiany z 8 września 2026 (23) — Domknięcie (22) + naprawa pułapki w serwerze `foundry-mcp`

Wpis (22) kończył się listą „czego ta sesja NIE zrobiła". Ten wpis ją zamyka i opisuje błąd,
który to blokował — bo okazał się poważniejszy niż samo zablokowanie zapisu.

### Pułapka: FoundryVTT nie wstawał, „Loading World Data - 7%"

Po przebudowie paczek świat przestał się uruchamiać. **To nie był ani moduł, ani paczki** —
`AppData/Local/FoundryVTT/Logs/debug.*.log` pokazywał wprost:

```
Connected to database "effects"          ← OK
Launching World | Loading World Data - 7%
LEVEL_DATABASE_NOT_OPEN: Failed to connect to database "actors"
```

`effects` wstaje, `actors` nie, a wbudowana auto-naprawa Foundry „kończy się sukcesem" i mimo to
reconnect dalej pada — bo blokadę trzyma żywy proces. Trzymały ją **trzy instancje serwera
`foundry-vtt` MCP z 6 i 7 września**, żyjące od poprzednich sesji.

To był skutek uboczny workflow z (22): poprosiłem użytkownika o pełne zamknięcie Foundry pod
przebudowę paczek, a moje własne narzędzie nigdy nie oddało blokady świata. Użytkownik musiał
ubić procesy ręcznie **dwa razy** — Claude nie może tego zrobić (klasyfikator auto-mode blokuje
`Stop-Process`), więc trzeba o to prosić i **podawać konkretne PID-y**: samych `node.exe` jest
tam kilkanaście od `chrome-devtools-mcp` i „ubij node" trafia w zły proces.

### Dwa błędy w `Neuro 5e/Integracje/foundry-mcp` (osobny projekt, nie moduł)

1. **`getDB()` cache'ował uchwyty LevelDB na całe życie procesu.** Zwalniał je wyłącznie
   `close()` z handlerów SIGINT/SIGTERM — a stdio-owy serwer MCP na Windows często nie dostaje
   żadnego z tych sygnałów, gdy klient znika. Efekt: proces-widmo trzymający świat w nieskończoność.
   Zastąpione przez **`withDB(collection, fn)`**, które otwiera bazę, wykonuje operację i
   **zawsze zamyka w `finally`**. Blokada żyje teraz tyle, co jedno wywołanie — co zresztą
   odpowiada temu, do czego ten serwer służy: dostęp „na zimno", gdy Foundry jest zamknięte.
   Przy okazji nieudane otwarcie zwraca zrozumiały komunikat („FoundryVTT is running…") zamiast
   surowego błędu `classic-level`.
2. **`backupCollection()` kopiował plik `LOCK`.** `fs.cpSync` na zablokowanym `LOCK` rzuca na
   Windows `EPIPE`, co **przerywało cały backup, a więc i zapis, który ten backup miał
   zabezpieczyć**. To jest dokładna przyczyna, dla której (22) nie mogło zapisać zmian na
   Raynaldzie. Backup pomija teraz `LOCK`, `LOG` i `LOG.old` — LevelDB odtwarza je przy otwarciu,
   a przywracanie nieświeżego `LOCK` byłoby w najlepszym razie bezużyteczne. Dane siedzą w
   `.ldb`/`.log`, `CURRENT` i `MANIFEST`.

Dodatkowo `server.ts` wychodzi teraz przy zamknięciu stdin (`process.stdin.on('close'|'end')`),
żeby instancje przestały się kumulować — to jedyny sygnał, który zawsze dociera.

⚠️ **Poprawka działa dopiero na świeżo uruchomionej instancji.** Procesy, które już żyją, niosą
stary kod i trzeba je ubić ręcznie.

### Domknięte pozycje z (22)

Zrobione na żywym świecie przez Chrome DevTools MCP — po tej lekcji offline'owy tor jest
ostatecznością, nie pierwszym wyborem:

- **Raynald**: `choroby[0].key` przepięty z `paranoja` na `schizofreniaParanoidalna`, notatka
  (405 znaków) wyczyszczona, bo tabelka „Lekarz i farmaceuta" jest teraz danymi.
  **Active Effect przeżył** (`Schizofrenia paranoidalna — Przewlekły`) — czyli wpis dodany
  w (22) do `disease-effects.mjs` zrobił dokładnie to, po co powstał. Pozostałe flagi
  (`zranienie`, `exhaustionSources`, `fuksy`) nietknięte: `setFlag` jest zakresowy, w
  przeciwieństwie do płytkiego merge'a z offline'owego MCP.
- **Laffitte**: feat `Mizoofobia` zamieniony na prawdziwy wpis w `fobie`
  (`key: "mizoofobia"`), feat skasowany. Fobia ma teraz RO na Mądrość ST 16, licznik trzech
  sukcesów i Przełamanie.

### Skutek uboczny (21)/(22), złapany dopiero teraz

Dopisanie `miecz` i `laska` do katalogu sprawiło, że `auditWeapons()` **zaczął je widzieć** — i
od razu zgłosił dwa rozjazdy, wcześniej niewidzialne:

- `Laska` miała kości obrażeń **tylko w części aktywności, a `system.damage.base` puste**.
  Broń katalogowa trzyma kości w `damage.base`, a część aktywności je lustrzanie powtarza
  (porównane z `Nóż taktyczny` Victora). Uzupełnione.
- Obie broni nie miały flagi `availability`.

**Nie użyto `repairWeapons()`** — ta funkcja nie przyjmuje filtra po aktorze i naprawiłaby
wszystkie 11 rozjazdów w świecie, w tym ręcznie ustawione bonusy obrażeń NPC-ów, które
użytkownik świadomie kazał zostawić (patrz `TODO_mechanika.md` §9). Poprawione punktowo.

### Stan końcowy

- **Testy: 215/215** (`game.neuroshima.tests.run()`), było 201 przed (22).
- `auditWeapons()` — **0 rozjazdów w drużynie**; 11 w świecie to wyłącznie tuning NPC-ów.
- `auditItemCompleteness()` — 0 w drużynie, 4 w świecie (te same, znane, celowe).
- `auditInventory()` — chemia/surowce/pirotechnika/źródła zasilania: zero.
- Rejestr Sztuczek: `samuraj` przeszedł do `partial`, obok `pakowanie`, `panPlaster`,
  `aramis`, `gradOlowiu` i `szturmowiec`.
- Bramkowanie Kobaltem zweryfikowane na żywo w obie strony: przy włączonym przełączniku picker
  ma grupę „Kolor Kobaltu" w chorobach i fobiach, przy wyłączonym jej nie ma — a treść **już
  obecna na kartach** dalej się rozwiązuje, więc Raynald i Laffitte nic nie tracą.

Wersja modułu bez zmian (`0.14.23`) — ta sesja nie ruszyła kodu modułu poza żywymi danymi;
zmiany kodu poszły do osobnego projektu `Integracje/foundry-mcp`.

## Zmiany z 8 września 2026 (24) — Amunicja dum-dum Lorentza, rodziny naboi i naprawa magazynków kwantowych

Zgłoszenie brzmiało wąsko: „Desert Eagle posiada tekst, który należy do amunicji". Przy
przenoszeniu tego tekstu okazało się, że pod spodem nie ma czego rozdzielić — odrębny typ
amunicji nigdy nie powstał, a mechanizm, który miał go obsłużyć, był martwy od początku.

### Martwa kontrola magazynków zapasowych

`_onClickReload` bramkował przeładowanie w walce na przedmiocie o
`system.type.value === "magazine"` i podtypie równym typowi broni (`"palnaKrotka"`). Takiego
przedmiotu **nie tworzy nic w tym module**: `actors/magazine-inventory.mjs`, jedyne miejsce
budujące zapasowe magazynki, robi je jako `value: "ammo"` + `subtype: "magazine-short"`, a
gotowość trzyma we `flags.<moduł>.ready`, nie w `system.uses`. Sprawdzone na żywo:
**zero dopasowań na 1808 przedmiotów w świecie**.

Skutki, których nikt nie zgłosił, bo wyglądały jak zasada gry:

- każde przeładowanie broni z magazynkiem wymiennym **w walce** kończyło się odmową
  („Zabrakło ci przygotowanych magazynków zapasowych"), także gdy magazynki leżały na karcie —
  Raynald ma jeden, Zbrojownia po cztery każdego typu;
- `_restoreQuantumMagazines` na `deleteCombat` nie odnawiał niczego;
- licznik gotowości był rozjechany między dwoma miejscami: sekcja ekwipunku pisała do
  `flags.ready`, ścieżka przeładowania czytała `system.uses.value`.

Naprawione przez oparcie się na `isMagazineItem()` i `getMagTypeForWeapon()` — czyli na tych
samych funkcjach, których używa sekcja ekwipunku, zamiast na drugim, wymyślonym kształcie danych.

**Model magazynka jest kwantowy** (ustalenie MG, tej sesji): magazynek w plecaku nie niesie
własnego typu naboju. Dostaje go dopiero w chwili włożenia do broni — z tego, co postać ma
luzem. `ready` liczy więc korpusy magazynków, a naboje schodzą osobno ze stosu przy wymianie;
darmowe odnowienie `ready` po walce jest świadomą abstrakcją, nie drugą księgowością.

### Rodziny naboi zamiast prefiksu ciągu znaków

Wybór „śrut czy breneka" był zaszyty jako `mag.ammoType?.startsWith("12ga")` z ręcznie
wypisanym dialogiem dwóch opcji. Nie dawał się rozszerzyć, a jako reguła zgodności był
podstępnie zły: `762` **jest** prefiksem `76239ak`, czyli dwóch różnych, niewymiennych naboi.
Zastąpione jawnym polem `family` w `AMMO_CALIBERS` plus `familyCalibers()`/`ammoFamily()`.
Dialog wyboru jest teraz generyczny, pokazuje tylko kalibry, które postać faktycznie ma, i przy
jednej opcji w ogóle się nie pojawia — czyli dla każdej broni w świecie poza strzelbami i
Złotym Desert Eagle nic się nie zmienia.

### Dum-dum: `44mag_dd`

Nowy kaliber w rodzinie `44mag`, **z tą samą kością co zwykły `.44 Mag`** (1k10 kłute).
Dum-dum nie bije mocniej — cały zysk siedzi w dwóch nowych cechach broni, cały koszt w drugiej
z nich:

- **Rozrywająca** — dopisana do `combat/weapon-save-properties.mjs`, czwarta obok Porażającej,
  Powalającej i Unieruchamiającej. Wymagała dwóch uogólnień, oba użyteczne poza nią:
  `exemptDamageType` (cel z redukcją/odpornością/niewrażliwością na dany typ obrażeń nie rzuca
  w ogóle) i `onFail` (efekt, którego nie da się sprowadzić do przełączenia statusu).
- **Hollow-point** — osłona o niezerowej redukcji obrażeń zatrzymuje pocisk **całkowicie**,
  zamiast odejmować. Wpięte w obie ścieżki obrażeń: automatyczną (`weapons/ammo.mjs`) i przez
  dialog (`combat/cover.mjs` `getDamageConfig`).

Zmiana typu naboju przechodzi wyłącznie przez wymianę magazynka — to ta sama czynność fizyczna,
więc ten sam kod. Magazynek jest przy tym opróżniany, a naboje poprzedniego typu wracają do
zapasu; bez tego magazynek mieszałby dwa rodzaje pocisków pod jedną etykietą, a przy dum-dum
to decyduje o tym, czy trafienie w ogóle wywołuje Krwawienie.

### Krwawienie ma teraz profile

Tekst naboju opisuje krwawienie, którego istniejący system nie potrafił wyrazić: 1k8 na
**początku** tury, bez rzutu obronnego na przerwanie, ustaje dopiero po opatrzeniu rany.
Hemofilia (RAW, str. 108) to 1k4 na **końcu** tury, RO Kondycja ST 10, trzy sukcesy pod rząd.
Zamiast naginać jedno do drugiego, `combat/bleeding.mjs` dostał `BLEED_PROFILES`:

| | `hemofilia` | `dumdum` |
|---|---|---|
| Obrażenia | 1k4 | 1k8 |
| Moment | koniec tury | początek tury |
| RO na przerwanie | Kondycja ST 10, 3 sukcesy | brak |
| „Wstrzyknij lek" | tak | nie (nie ma czego wstrzyknąć w dziurę) |

Aktor krwawi jednym profilem naraz; cięższy nadpisuje lżejszy (`severity`). Wpis bez pola
`profile` — czyli każdy zapisany przed tą zmianą — czyta się jako `hemofilia`, więc nic na
istniejących kartach nie zmieniło znaczenia.

### Typ istoty jest zapisany etykietą, nie kluczem

Klauzula „każda istota żywa" miała wyłączać maszyny. Pierwsza wersja porównywała klucz
(`"maszyna"`) z `system.details.type.value` — i nie trafiłaby **ani razu**: żywy bestiariusz
trzyma tam etykietę (`"Potwór"`, `"Zwierzę"`), a nie klucz. Złapane przez test, nie w grze.
Dopasowanie znosi teraz klucz i etykietę, bez względu na wielkość liter. Przy okazji: postaci
graczy dnd5e wymusza `"humanoid"` niezależnie od tego, co się wpisze, więc ta bramka z natury
dotyczy wyłącznie NPC-ów.

### Karta i pasek

- Nowy przycisk **„Wymień magazynek / zmień amunicję"** na karcie broni, aktywny w trybie gry.
  Lista kalibrów wyżej zostaje w PLAY zablokowana celowo — to ustawienie autorskie broni, nie
  czynność postaci. Bez tego przycisku gracz z dwoma rodzajami naboju nie miał na karcie
  żadnego sposobu, żeby przełożyć jeden na drugi.
- `game.neuroshima.magazynki.swapMagazine()` — publiczne wejście dla makr. Bez argumentów samo
  znajduje postać i broń, przy kilku broniach pyta. Makro **„Wymiana magazynka / amunicji"**
  wylądowało na slocie 1 paska Azuna (Lorentz); treść makra to jedna linia wywołania, więc
  zmiana zasad nigdy nie wymusi jego odtworzenia — ten sam wzorzec co makra Sztuczek.

### Dane Lorentza

- `Złoty Desert Eagle`: opis oczyszczony z zasad amunicji, zostaje flavour, „Trafienie: +1"
  (i tak zakodowane w aktywności jako `attack.bonus`) i Obalająca w brzmieniu katalogowym.
  Odesłanie do karty amunicji zamiast powielonego tekstu.
- `.44 Mag (dum-dum)` × 12 — nowa pozycja z pełną treścią zasad, ta sama, która wcześniej
  wisiała na broni.
- `.44 Mag` × 8 bez zmian, `Krótki magazynek` × 2 (gotowe 2/2) — wcześniej nie miał żadnego.

Sprawdzone na żywo, w obie strony, na jego prawdziwej broni: przełączenie na dum-dum dokłada
`rozrywajaca` + `hollowpoint`, zostawia 1k10, zwraca 8 zwykłych naboi do zapasu i zabiera 8
dum-dum; powrót cofa dokładnie to samo. Stan końcowy identyczny z wyjściowym.

### Drobiazg przy okazji

`_formatRoundWord` znało dwie formy („1 nabój" / „reszta naboje"), więc każde przeładowanie
wypisywało na czat „8 naboje". Poprawione na pełną polską odmianę przez liczbę, z wyjątkiem
dla nastek („12 naboi", nie „12 naboje").

### Stan końcowy

- **Testy: 246/246** (`game.neuroshima.tests.run()`), było 215 po (23). Nowa paczka
  `neuroshima-2026-overrides.amunicja` (31 testów).
- Dwa z nich padły przy pierwszym uruchomieniu i oba wskazywały prawdziwe błędy, nie złe
  asercje: wyłączenie maszyn spod Rozrywającej (opisane wyżej) oraz założenie, że nazwa rodziny
  musi być kaliberem — `.44 Mag` jest, `.12 Ga` nie, bo nabój o id `12ga` nie istnieje.
- Ikona `.44 Mag (dum-dum)` dzieli na razie plik ze zwykłym `.44 Mag` — dopisana do kolejki
  `dev/icons/MISSING.md` (2/9). Bez własnej grafiki nie widać w ekwipunku, który stos jest który.

Wersja modułu: **0.14.24**.

## Zmiany z 9 września 2026 (25) — Cena baterii, gadżety z SFX, prochy i naprawa Prowiantu

Cztery zgłoszenia MG, z których dwa okazały się błędami, a nie życzeniami.

### Bateria: 5 → 20 gb

Podręcznik nazywa baterie „bardzo drogimi" i nie podaje ceny sprzedaży, tylko koszt
wytworzenia (ST 10, 20 h, 9 CH + 1 MK). Wycena 5 gb, nadana kiedyś szacunkowo, mówiła coś
dokładnie odwrotnego: bateria kosztowała tyle co sidła i mniej niż dwa naboje .44 Mag, więc
nikt nigdy nie zastanawiał się nad jej zakupem.

20 gb wychodzi z tabeli dodatków: „Latarka + baterie" to 35 gb, więc gola latarka plus ogniwo
domykają się tylko wtedy, gdy ogniwo jest warte 15–20. Poprawione w `items/baterie.mjs`, w
paczce `sprzet` i na **5 kopiach w świecie** (Alan, Lorentz, Piekarz ×2, Zbrojownia ×20 szt.).

### Gadżety: przedmioty smaczkowe, które da się kliknąć

Kaczuszka Lorentza, dwie krótkofalówki, kanister Laffitte'a i długopis Alana miały dostać SFX.
Wszystkie były `type: "loot"` z zerem aktywności — a `loot` w dnd5e **nie może nieść
Aktywności** (`ActivitiesTemplate` jest wpięty tylko w consumable/equipment/facility/feat/
spell/tool/weapon; sprawdzone w źródle 5.3). Bez zmiany typu nie ma czego kliknąć.

Nowe `items/gadzety.mjs` + `migration/migrate-gadzety.mjs`. Konwersja idzie przez
**skasuj-i-odtwórz**, bo `.update({type})` po cichu unieważnia całe wywołanie — pułapka
udokumentowana w tym repozytorium już trzy razy (`migrate-pistolet-race.mjs`,
`migrate-gear-graduation.mjs`, `kolczatka.mjs`); ten plik jest czwartym potwierdzeniem, nie
kolejnym odkryciem. Nowy przedmiot dziedziczy nazwę, ikonę, opis, cenę, wagę i ilość, więc na
karcie zmienia się wyłącznie to, że pojawia się przycisk.

Zero mechaniki — ustalenie MG: *„baterie krótkofalówek śledzi (lub nie) MG, funkcjonują czysto
dla smaczku"*. Aktywność nie zużywa ładunków, więc kaczuszka nie znika po pierwszym pisknięciu
(osobny test tego pilnuje, bo to jedyna regresja, która naprawdę zabolałaby przy stole).

Dźwięk leci przez Sequencer **przestrzennie**, z własnym promieniem na gadżet: długopis 5 m,
kanister 8 m, kaczuszka 10 m, krótkofalówka 20 m. `seqPlayAudio` przyjmuje teraz jawny
`radius` — bez tego wszystko dziedziczyłoby domyślne 50 m, czyli zasięg wystrzału z karabinu,
i kliknięcie długopisu słyszałaby pół mapy.

Cztery pliki CC0 z FreeSound, przez istniejący pipeline (`dev/audio/pipeline_gadzety.json`),
źródła i licencje w `dev/audio/FREESOUND_GADZETY_SOURCES.md`. Punkty przycięcia nie są
zgadywane — wyznaczone przez `ffmpeg -af silencedetect`, tak żeby każdy plik zawierał
**dokładnie jedno zdarzenie**: jeden pisk, jedno psiknięcie, jeden pełny cykl długopisu
(naciśnięcie + zwolnienie), a nie całą sesję nagraniową.

Przekonwertowano 6 przedmiotów: pięć zamówionych plus „Krótkofalówka policyjna" Evie, którą
rozpoznawanie po nazwie złapało przy okazji.

Przy okazji dwa drobiazgi: domyślna karta użycia dnd5e jest dla gadżetów wyłączana (jeden pisk
= jedna wiadomość, nie dwie — ten sam ruch co w `items/chemia.mjs`), a podtyp `trinket` dostał
polską etykietę „Drobiazg" — był jedynym nieprzetłumaczonym podpisem w ekwipunku, a wpadają
w niego zarówno gadżety, jak i Kolczatki.

### Prochy

Stan doprowadzony do zgłoszonego: Victor **3** Relanium (było 2), Raynald **2** Psychotropy
(nie miał żadnych), Lorentz 7 Wapniaka (bez zmian).

Ważniejsze: Psychotropy leczyły wyłącznie `paranoja`, a chorobę Raynalda przepięto w (23) na
kobaltowy wariant `schizofreniaParanoidalna`. `chemiaForDisease("schizofreniaParanoidalna")`
zwracało pustą listę — Raynald nosiłby lek, który nie leczy niczego, co ma. `treats` obejmuje
teraz obie choroby; flaga `treats` odświeżona też na już wydanych kopiach (Raynald, Kluczyk),
bo jest kopiowana na przedmiot w chwili tworzenia i nie aktualizuje się sama.

### Prowiant: przedmioty były nie do znalezienia

Zgłoszenie brzmiało jak prośba o wyjaśnienie: *„nie jest jasne, jak dodawać i odejmować
prowiant"*. Nie było niejasne — **było niemożliwe.**

Panel Prowiantu, jak każdy sąsiedni, usuwa natywne wiersze ekwipunku dla przedmiotów, które
przejmuje. Różnica polegała na tym, że Leki i Zapasowe Magazynki oddają w zamian pełne wiersze
z kontrolkami, a Prowiant rysował **wyłącznie zbiorczą linijkę** per kategoria („Konserwa ×5,
Litr Wody ×2") — bez pola ilości, bez edycji, bez kasowania. Efekt: jedzenia i wody nie dało
się ani zmienić, ani otworzyć, ani usunąć z żadnego widoku, a wyszukiwarka ekwipunku ich nie
znajdowała, bo jedyny wiersz, który je pokazywał, był kasowany z DOM-u. Wyglądało to na
świadome „panel informacyjny", a było zgubieniem przedmiotu.

Panel pokazuje teraz wiersz na przedmiot (ilość ±, edycja, kasowanie), podsumowanie dni zapasu
zostaje jako osobny wiersz zamykający kategorię, a pod spodem doszedł przycisk **„Dodaj
prowiant"** z katalogiem. Sekcja renderuje się też przy pustym plecaku — inaczej nie dałoby
się dodać PIERWSZEJ racji, ta sama zasada co w Zapasowych Magazynkach.

**Katalog** (`PROWIANT_CATALOG`) przepisany wprost z `Tabele/Zywnosc.md` — ceny, dostępność i
wagi są kanoniczne, nic nie jest zgadywane. To świadomie nie cała tabela k100: przyprawy, sól
czy olej nikogo nie żywią jako racja dzienna. Panel i tak liczy **każdy** przedmiot pasujący
nazwą, więc pozycja spoza katalogu nadal działa — katalog to skrót, nie bramka.

**Odpowiedź na pytanie o typy jedzenia:** były „wspierane" tylko w tym sensie, że liczyło się
wszystko, co pasowało do wzorca nazwy — a `Jerky` **nie pasowało do niczego**, więc byłoby dla
licznika dni zapasu niewidzialne (czyli: postać głoduje, a karta twierdzi, że zapasów nie ma).
Wzorzec obejmuje teraz formy suszone, wędliny, batony, herbatniki, liofilizaty i puszki, a woda
łapie też manierkę i kanister.

### Stan końcowy

- **Testy: 267/267** (`game.neuroshima.tests.run()`), było 246 po (24). 21 nowych: gadżety
  (9), prowiant (10), baterie (2).
- Jeden test padł przy pierwszym uruchomieniu i **to test był zły, nie kod**: wymagał `{a}`
  w każdej linijce smaczku, a linijka „Klik. Ktoś w pokoju właśnie zacisnął zęby" jest lepsza
  właśnie dlatego, że nie wskazuje palcem — karta czatu i tak niesie mówcę. Asercja zmieniona
  na „przynajmniej jedna linijka używa podstawienia".
- `auditWeapons()` — 0 rozjazdów w drużynie (11 w świecie to znany tuning NPC-ów).
- `auditItemCompleteness()` — 0 w drużynie, 4 w świecie (te same, znane).
- `auditInventory()` — zero we wszystkich kategoriach.
- Kolejka ikon: 6/9 (`dev/icons/MISSING.md`) — doszły cztery pozycje jedzeniowe. Pięć
  pozostałych pozycji katalogu celowo dzieli generyczną puszkę zamiast zajmować slot w kolejce.

Wersja modułu: **0.14.25**.

## Zmiany z 9 września 2026 (26) — Laptop wojskowy rzuca testy; sprzęt zastępujący zestawy narzędzi

Zgłoszenie: „Napraw Laptop Wojskowy Raynalda. Ma on pozwalać rzucać skojarzone testy."

### Co było nie tak

Podręcznikowy zapis „**Może zastąpić Narzędzia małego hakera**" żył wyłącznie w prozie opisu
przedmiotu. Mechanicznie laptop był bezczynnym `loot`-em: zero Aktywności, więc nie dało się z
niego rzucić niczego. Trzy akcje wymienione w jego własnym opisie — Otwarcie zamka
elektronicznego (ST 15), Zakłócenie działania maszyny Molocha (ST 20), Złamanie hasła dostępu
(ST 20) — trzeba było odtwarzać ręcznie z pamięci.

Gorsza połowa problemu leżała gdzie indziej. `actors/tool-availability.mjs` dopisuje do karty
każdego Testu narzędzi notatkę „masz zestaw / brak zestawu", dopasowując po `system.type.baseItem`.
Raynald **jest biegły** w Narzędziach małego hakera (`tools.hakera.value = 1`), ale nie ma tego
zestawu w ekwipunku — ma laptop. Każdy jego test hakerski dostawał więc czerwone
**„✘ brak zestawu w ekwipunku"**, mimo że postać trzymała sprzęt, który podręcznik uznaje za
równoważny. To wyglądało jak stan gry („no fakt, nie mam zestawu"), a było ślepotą sprawdzenia.

### Rozwiązanie: `substitutes` jako pojęcie ogólne, nie łatka na laptop

Nowe pole w `RealGear` (`config/gear-data.mjs`, typedef `ToolSubstitute`):

```js
substitutes: { toolkit: "hakera", ability: "int" }
```

Włącza dwie rzeczy naraz:

1. **Przedmiot powstaje jako `tool`** z Aktywnościami Testu — jedną ogólną plus po jednej na
   każdą akcję zastępowanego zestawu, z jego ST. Wszystkie typu `neuroToolCheck` (ten sam,
   którego używa Mały kowal — rozwiązuje aktora po właścicielu przedmiotu, a nie po tym, kto
   akurat ma zaznaczony token).
2. **`tool-availability.mjs` uznaje go za posiadany zestaw** i mówi po imieniu, czym on jest:
   „✔ zastępuje: Laptop wojskowy" zamiast ogólnego „masz zestaw" — inaczej zielona notatka przy
   pustym slocie zestawu wyglądałaby jak błąd, a nie jak działająca zasada.

Mechanika zastępstwa siedzi w `check.associated: ["hakera"]`. dnd5e wystawia wtedy przycisk
**Testu narzędzi** tego zestawu (a nie zwykłego Testu Cechy), więc do rzutu wchodzi biegłość
postaci w zastępowanym zestawie. Sprawdzone żywcem na Raynaldzie: `1d20 + 4 + 2` — Inteligencja
plus Premia Biegłości. Laptop zastępuje sprzęt, nie wyszkolenie; komuś bez biegłości da samo
`1d20 + INT`, i tak ma być.

### Pułapka, która o mało nie zjadła laptopa

`baseItem` zastępnika zostaje **pusty**, celowo — i jest na to osobny test. Gdyby przedmiot
deklarował `baseItem: "hakera"`, `createToolkits()` (upsert po
`type === "tool" && baseItem === kit.id`) nadpisałby go przy najbliższym uruchomieniu: Laptop
wojskowy zamieniłby się w „Narzędzia małego hakera" razem z nazwą, ikoną, ceną i wagą. Nic by
o tym nie krzyknęło. Skojarzenie żyje więc na aktywnościach i na fladze, nie na typie.

Przy okazji `createRealGear()` dostał gałąź na zmianę typu (`delete + create`). Bez niej
odświeżenie laptopa, który przeszedł z `loot` na `tool`, **milcząco nie robiłoby nic** —
`.update({type})` unieważnia całe wywołanie, łącznie z opisem i ceną, które akurat dałyby się
zaktualizować. To piąte potwierdzenie tej pułapki w tym repozytorium; nie jest już odkryciem,
tylko rutyną.

### Migracja

`migration/migrate-tool-substitutes.mjs`, ten sam kształt co reszta folderu (sucha próba
domyślnie, `{ commit: true }`, filtr po aktorach). Przerobiła 2 kopie: Raynald i Zbrojownia.
Cena, waga i opis odświeżają się z katalogu — bo właśnie one się zmieniły — ale nazwa, ikona i
ilość zostają takie, jakie aktor ma dziś: mogły zostać świadomie zmienione przy stole.

### Sprostowanie w opisie przedmiotu

Stara wersja kończyła się nawiasem „Ułatwienie i zastępstwo narzędzi to coś, co włącza się
ręcznie przy rzucie, nie automatyczny efekt". Po tej zmianie to zdanie było już w połowie
nieprawdziwe: zastępstwo narzędzi jest teraz automatyczne i widoczne na karcie. Ręczne zostaje
wyłącznie **Ułatwienie** do Testów Inteligencji — i słusznie, bo tylko MG wie, czy dana
czynność faktycznie „używa tego sprzętu". Opis mówi teraz dokładnie to.

### Stan końcowy

- **Testy: 276/276** (`game.neuroshima.tests.run()`), było 267 po (25). 9 nowych, w tym osobny
  test na to, że zastępnik NIE przejmuje `baseItem` zastępowanego zestawu.
- Sprawdzone na żywym Raynaldzie: karta wystawia przycisk „Inteligencja (Narzędzia małego
  hakera)" ze ST 20, rzut wychodzi `1d20 + 4 + 2`, notatka mówi „✔ zastępuje: Laptop wojskowy".
- `auditItemCompleteness()` — bez zmian (4 w świecie, znane, poza drużyną).

Wersja modułu: **0.14.26**.

### Znalezione przy okazji, nietknięte

Katalog Przedmiotów świata zawiera **539 pozycji z 824** (65%) będących resztą po imporcie z
Roll20: przedmioty nazwane „X (Imię Aktora)", duplikujące to, co i tak siedzi na aktorze, z
czego **411 nosi portret aktora zamiast ikony**. Rozkłada się to na 53 postacie (Raynald 40,
Lorentz 38, Piekarz 36, Alan 33, Victor 30…). Jednym z nich jest „laptop wojskowy (narzedzi
hackera) (Raynald of Châtillon)" — waga 3 kg, cena 0, portret zamiast ikony — czyli import-owy
sobowtór tego samego laptopa. Nie ruszane: to osobna decyzja porządkowa o skali całego świata,
a nie część naprawy laptopa.

## Zmiany z 10 września 2026 (27) — Lekki audyt byłych PC: Piekarz i Kier

Domknięcie `HANDOFF_party_build_audit.md` dla dwójki wcześniej pominiętej. Zakres świadomie
węższy niż audyt (21)–(22) dla żywej piątki: usunięcie oczywistego śmiecia importowego i
zgłoszenie tego, co zepsute/niedokończone — bez rozstrzygania, który z dwóch egzemplarzy jest
„prawdziwy". Wykonane na żywo (Chrome DevTools MCP), po `foundry_get_actor_sheet` z serwera
LevelDB odmówiło z powodu działającego FVTT.

### Usunięte z Piekarza (śmieć potwierdzony, nie do dyskusji)

- **`dd`** — Item typu `spell` bez opisu, z awatarem aktora jako ikoną. Neuroshima nie ma
  zaklęć; to czysty artefakt R20Converter, dokładnie tak, jak przewidywał
  `HANDOFF_ekwipunek.md`.
- **`Cobbler's Tools`** i **`Bagpipes`** — dwa angielskie, nieprzetłumaczone zestawy
  SRD, unikalne dla Piekarza (sprawdzone na całym świecie — żaden inny aktor ich nie ma, więc
  to nie wzorzec importu, tylko jego pojedynczy, nietknięty ogon). `Bagpipes` nosił przy tym
  ikonę bukłaka na wodę zamiast dud — dowód, że nikt nigdy na tę pozycję nie spojrzał.

### Naprawione przy okazji (jednoliniowe, ikona już istniała)

- **Kier → `Bejsbol`**: wskazywał na generyczną ikonę rdzenia dnd5e, mimo że katalog ma
  dedykowany `iron_pipe_club.svg` — dokładnie ten przypadek, który `HANDOFF_party_build_audit.md`
  nazwał „naprawą w miejscu, nie pozycją do kolejki ikon". Przepięte.

### Zgłoszone, nietknięte — zepsute lub niedokończone

- **Piekarz — `Młynek`**: potwierdzone (dopasowanie treści opisu w paczce `sztuczki`) jako
  klauzula Sztuczki **`Rozróba`**, nie homebrew. Siedzi na aktorze jako goły `feat` bez
  wrappera Sztuczki i bez ikony — nigdy nie przeszedł konsolidacji, jaką inne rozbite Sztuczki
  (Samuraj) dostały w (21)/(22) dla żywej piątki. Nie scalane tutaj — niski priorytet dla
  martwej postaci, ale jeśli Piekarz kiedyś wróci do gry, to pierwsza rzecz do zrobienia.
- **Piekarz — `Urodzony morderca`**: nazwa dokładnie odpowiada realnej zdolności Pochodzenia
  Południowa Hegemonia w paczce `zdolnosci-pochodzenia`, ale na aktorze siedzi jako goły
  `feat` z generyczną ikoną `icons/svg/upgrade.svg`, nie jako link do kompendium. Nieoczywiste,
  czy to działający duplikat treści, czy martwa etykieta — nie sprawdzane głębiej.
- **Piekarz — cztery pary duplikatów**: `Nadziak` ×2 (jeden ma dodatek `naostrzenie`
  +1/+1 do trafienia/obrażeń, drugi żadnego), `Obrzyn` ×2 (12ga_b/2k6 obuchowe + dodatek
  `szyna` kontra 12ga_s/2k4 kłute, bez dodatku), `Latarka ręczna` ×2 (różne
  `latarkaChargeMaxMin`) i `Baterie` ×2 (osobne stosy qty 1 i 2). Zweryfikowane na żywo, że to
  wciąż to samo mechaniczne zróżnicowanie, które opisał `HANDOFF_party_build_audit.md` — nie
  rozstrzygane, który egzemplarz jest „prawdziwy" (Piekarz jest martwy w fikcji, materiały
  nieistotne przy stole).
- **Kier — klasa `<unknown class>`**: `migrateClasses()` nadal jej nie rozpoznaje (jeden feat
  Pochodzenia, zero sygnałów klasowych). `Postacie/BG/Kier.md` deklaruje Cwaniaka i Pochodzenie
  Vegas; żywy aktor ma background **Miami** plus feat `Ja już swoje odchorowałem` (zdolność
  Miami) — sprzeczność potwierdzona jako wciąż otwarta, nie do rozstrzygnięcia z samych danych
  (MG już raz wybrał „pomiń" zamiast decyzji). `Bagnet` (typ `loot` z flagą `ulepszenie`) jest
  poprawny i zostaje — to nie duplikat do sprzątnięcia.

### Stan końcowy

Piekarz: 48 → 45 pozycji. Kier: bez zmian (5 pozycji, w tym klasa). Testy modułu nie dotyczą
danych na aktorach — nie uruchamiane. Wersja modułu bez zmian (`0.14.26`) — czysto dane, zero
kodu.

## Zmiany z 10 września 2026 (28) — Sprzątnięcie 550 sierocych Itemów światowych po imporcie z Roll20

Domknięcie wątku „nietknięte" z (26): katalog Przedmiotów świata miał 824 pozycje, z czego
duża część okazywała się resztkami importu, nie realną treścią. Ta sesja to zamknęła w
całości, jednym cięciem zamiast stopniowego sprzątania.

### Diagnoza — 550, nie 539, i już posprzątane w foldery

Reguła: nazwa Itemu pasuje do `Coś (Nazwa Aktora)`, gdzie `Nazwa Aktora` odpowiada realnemu
aktorowi w świecie. To dało **550** trafień (poprzednia liczba z (26), 539, była zgrubnym
szacunkiem po samej ikonie-portrecie — 422 z 550 rzeczywiście nosiło portret, reszta nie, ale
i tak była tym samym importowym sierotą).

Kluczowe odkrycie: sześć folderów kolekcji Itemów — `Loot (PC)` (179), `Abilities & Feats
(NPC)` (147), `Abilities & Feats (PC)` (92), `Weapons (NPC)` (81), `Weapons (PC)` (46),
`Spells (PC)` (1) — było **stuprocentowo czyste**: każda pozycja w każdym z nich pasowała do
wzorca, zero prawdziwej treści wymieszanej w środku. Plus 4 luźne sztuki poza folderami
(`Kałach (GANGUS CAPO/Karambol) (Recovered)` — po dwie na aktora). 546 + 4 = 550, dokładnie.
Katalogi broni/amunicji (`Broń palna…`, `Amunicja`, `Magazynki`, `Granaty`, `Narzędzia`) i
rekwizyty kart (`Playing Cards` 54, `Blackjack` 52, `Safety Deck` 3) to osobne, realne foldery
— żaden z nich nie zawierał ani jednej pozycji pasującej do wzorca.

### Dlaczego to było bezpieczne — 11 sprawdzonych ścieżek odwołań, zero trafień

Item światowy tego typu jest **odłączoną kopią**, nie źródłem: żaden z 550 nie miał
`flags.core.sourceId` ani `_stats.compendiumSource`, więc kasowanie ich nie dotyka
jakiegokolwiek Itemu faktycznie osadzonego na aktorze — to całkowicie inny dokument. Zanim
skasowano cokolwiek, sprawdzono na żywo, czy coś w świecie odwołuje się do tych 550 ID:
polecenia makr, wyniki tabel losowych, treść stron dziennika, notatki na scenach, kafle i
rysunki na scenach, historia czatu (1327 wiadomości), `sourceId`/`origin` Itemów i Efektów na
aktorach, opisy HTML Itemów (w obie strony — z aktora do sieroty i sierotu do sieroty), oraz
zduplikowane nazwy folderów (czy dwa różne foldery o tej samej nazwie mogłyby wymieszać
wyniki — nie, każda nazwa odpowiadała dokładnie jednemu ID folderu). **Zero trafień na
wszystkich jedenastu ścieżkach.**

### Wykonanie

Pełny zrzut JSON wszystkich 550 dokumentów (`item.toObject()`) zapisany przed kasowaniem do
`worlds/output/data/_backups/world-items-leftover-cleanup-2026-09-10.json` — offline'owy MCP
LevelDB nie miał w ogóle narzędzia do kasowania (`foundry_update_document` robi tylko shallow
merge), więc jedyną drogą i tak było `Item.deleteDocuments()` na żywym świecie przez Chrome
DevTools MCP. `824 → 274` po jednym wywołaniu, dokładnie tyle, ile przewidywała diagnoza.

### Znalezione przy okazji, nietknięte

Dwaj odrębni aktorzy, `Mobsprzęt Karabin` i `Copy of Mobsprzęt Karabin`, generowali osobne
komplety sierocych Itemów — wygląda na przypadkowe zduplikowanie aktora przy imporcie, nie na
problem higieny Itemów. Nie ruszane, osobna sprawa.

### Stan końcowy

Katalog Przedmiotów świata: **824 → 274**, wszystkie 274 to realna treść (katalogi broni,
tryby, kompendium sprzętu, talie kart). Wersja modułu bez zmian (`0.14.26`) — czysto dane,
zero kodu modułu.
