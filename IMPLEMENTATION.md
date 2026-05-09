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
| `scripts/weapons/jams.mjs` | Zacięcie i uszkodzenie broni palnej |
| `scripts/config/ammo-data.mjs` | 20 definicji kalibru (edytowalnych) — formuły, typy obrażeń, efekty |
| `scripts/weapons/ammo.mjs` | System amunicji — sync obrażeń, auto-apply, przycisk Obrażenia |
| `scripts/weapons/magazine.mjs` | Magazynki + synchronizacja `system.uses` + dropdown kalibru |
| `scripts/weapons/fire-modes.mjs` | KS/DS/MS/OZ + synchronizacja aktywności |
| `scripts/migration/migrate-weapon-ammo.js` | Migracja istniejących broni → kalibry |
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

### 1.7 Ammo & Magazine Tracking
- [x] `scripts/config/ammo-data.mjs` — 20 kalibru w 5 grupach (Pistoletowa / Karabinowa / Śrutowa / Granatnikowa / Miotana), edytowalne author-time; każdy kaliber: id, label, formula, type, props, note, aoe, price, avail
- [x] Dropdown `<select>` kalibru w arkuszu broni (grouped optgroup); zastąpił wolne pole tekstowe; dostępny dla palna\* i miotana; disabled w trybie play
- [x] `updateItem` hook: zmiana kalibru → automatyczny sync `system.damage.base.number` + `denomination` + `types` + właściwości broni (stare ammo-props usuwane, nowe dodawane; śledzone w `flags.ammoProps`)
- [x] `dnd5e.postRollAttack`: auto-roll obrażeń z kalibru + `actor.applyDamage()` dla zacelowanych tokenów gdy aktywna walka; sprawdza hit (roll.total ≥ AC celu); pomija burst-mode (KS/DS/MS/OZ)
- [x] Czerwony przycisk „Obrażenia" w wiadomościach czatu ataku (weapon z ustawionym kalibrem); GM/właściciel może ręcznie nałożyć obrażenia na zacelowane/zaznaczone tokeny
- [x] Notatka kalibru (np. „Obalająca", „Śrut vs. małe istoty") wyświetlana pod wierszem magazynka w arkuszu broni
- [x] Migracja `migrate-weapon-ammo.js`: 101 broni skalibrowanych przez regex (2026-05-08); formuły obrażeń ustawione przez `number`/`denomination`
- [x] Flagi per broń: `ammo.type`, `ammo.current`, `ammo.max`
- [x] Obsługa typów magazynków: Wmag., Bęb., wymienny
- [x] `Szybka wymiana` i `Szybkie przeładowanie` podpięte do prototypowej warstwy zdolności dla reloadu
- [x] `Przeładowanie` blokuje kolejny strzał do czasu przeładowania po strzale; `Szybkie przeładowanie` ignoruje ten wymóg
- [x] Po strzale z `Szybkim przeładowaniem` czat pokazuje, że broń automatycznie wróciła do gotowości, jeśli w magazynku została amunicja
- [x] Broń z `Przeładowaniem` śledzi stan komory oddzielnie od łącznej liczby naboi w broni
- [x] Broń z `Przeładowaniem` dostaje osobną activity `Przeładowanie`, która może też demonstracyjnie wyrzucić żywy nabój z komory
- [x] Broń z Wmag. i Bęb. dostaje osobną activity `Doładuj 1 nabój`
- [x] Komunikaty czatu rozróżniają: przeładowanie po strzale, wyrzucenie niezbitego naboju i suchy cykl przy pustym magazynku wewnętrznym
- [x] `Ładowanie` wymusza doładowanie nowej sztuki amunicji po strzale
- [x] Trwały zestaw testowy rozdzielony na `TESTER - Bez sztuczek` i `TESTER - Ze sztuczkami` (Mag., Wmag., Bęb., `Przeładowanie`, `Ładowanie`)
- [x] Synchronizacja magazynka z kolumną `Ładunki` (`system.uses`)
- [x] Poza trybem edycji tylko bieżący stan magazynka jest edytowalny
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

### 1.9 Melee Weapon Degradation
- [ ] Nat 1 → kość obrażeń spada (k12→k10→k8→k6→k4)
- [ ] Tracking current vs base damage die per weapon
- [ ] Naprawa przez kowala lub narzędzia

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

---

## Phase 2: Full Equipment Layer
- [ ] Weapon properties (cicha, obalająca, ppanc, Wmag, etc.)
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

### v0.1.1 — Phase 1 Combat & Mechanics (2026-04-26)
- **Wyczerpanie**: speed penalty 1.5m/level, rolls -2/level (modern rules), EXHAUSTION_SOURCES enum, full source tracking (flags, dialogs, tooltips, rest integration)
- **Odpoczynki**: KO=4h, DO=24h, polskie etykiety
- **Nokautowanie**: melee bludgeoning attack at 0 PW → attacker chooses: knockout (1 PW + Unconscious) or normal damage, purple styled chat
- **Ostatnia Akcja**: 3 death save failures → prominent red chat announcement with narrative text, persistent notification to player
- **Przerzuty (Forsowanie + Fuks)**: unified reroll bar under d20 results, confirmation dialogs, styled chat messages, Fuks resource tracking (max 3)
- **Spellcasting CSS**: hide Spellbook tab, spell slots, spell DC, pact magic, concentration
- **CSS cleanup**: reduced post-apo filter intensity, removed forced background/color overrides
