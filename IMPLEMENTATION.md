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
| `scripts/config/exhaustion.mjs` | Wyczerpanie (speed penalty override) |
| `scripts/config/rest.mjs` | Odpoczynki (4h KO / 24h DO) |
| `scripts/actors/abilities.mjs` | PROTOTYP: warstwa zdolności per aktor / per pionek |
| `scripts/combat/zranienie.mjs` | Stopień Zranienia (wound levels 0–4) |
| `scripts/combat/forsowanie.mjs` | Forsowanie (push failed checks) — DEPRECATED, replaced by rerolls.mjs |
| `scripts/combat/rerolls.mjs` | Przerzuty: Forsowanie + Fuks (reroll mechanics) |
| `scripts/combat/knockout.mjs` | Nokautowanie + Ostatnia Akcja |
| `scripts/combat/cover.mjs` | Dynamiczna osłona per atak + redukcja dla strzału przez |
| `scripts/combat/obalajaca.mjs` | Obsługa właściwości broni "Obalająca" i wymuszania RO na Siłę |
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
| `scripts/weapons/damage-reduction.mjs` | Rozszerzenie panelu Apply Damage o redukcję materiałową |
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

### 1.9 Melee Weapon Degradation
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

---

## Phase 2: Full Equipment Layer
- [ ] Weapon properties (cicha, ppanc, Wmag, etc.)
- [x] Właściwość "Obalająca" (skrypt wymuszający rzut obronny na celach, sprawdzenie rozmiaru celów)
- [ ] Weapon attachments/upgrades
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
- [ ] 6 klas z progression tables
- [ ] Professions (subklasy)
- [ ] Sztuczki (feat-like items)
- [ ] 12 Pochodzeń (origins) z bonusami cech
- [ ] Multiclass rules
- [ ] XP panel + personal PD tracking

## Phase 4: Long-Term Survival
- [ ] Choroby (3 stages, daily saves)
- [ ] Fobie (trigger checks, Przełamanie)
- [ ] Upojenie (4 levels, Kac mechanic)
- [ ] Environmental hazards (Podpalenie, Skażenie, Głód, etc.)
- [ ] Rest activities (cooking, hunting, gossip, cleaning)
- [ ] Vehicles (actor type + combat + chase system)
- [ ] Crafting system (schematy, produkcja, szabrowanie, bebeszenie)
- [ ] Drones

## Phase 5: Content & Polish
- [ ] Compendia (weapons, ammo, armor, tools, origins, classes, etc.)
- [ ] Enemy sheets + bestiary imports
- [ ] Color profiles (Stal, Rdza, Rtęć, Chrom)
- [ ] Regional price tables
- [ ] UI polish, tactical HUD

---

## Changelog

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
