# Neuroshima Overrides — Developer & Agent Guide

> Przewodnik operacyjny: jak efektywnie rozwijać moduł `neuroshima-2026-overrides` z poziomu Copilota i agentów.

---

## 1. Środowisko — co mamy

### Wersje

| Komponent | Wersja | Uwagi |
|-----------|--------|-------|
| FoundryVTT | 14.360 | Stable, coreVersion w world.json |
| dnd5e | 5.3.0 (installed) / 5.3.2 (latest) | Compiled bundle `dnd5e.mjs` ~2.8 MB |
| Node.js | 18+ wymagany | Przez foundry-mcp i skrypty w `dev/` |
| Moduł | patrz `module.json` (`version`) | Nie placeholder — ~90 plików `.mjs`, Phase 1–4 częściowo/w pełni żywe. Bump + wpis w `IMPLEMENTATION.md` § Changelog przy każdej znaczącej dostawie funkcji. |

### Ścieżki krytyczne

```
FVTT_DATA     = C:\Users\archo\AppData\Local\FoundryVTT\Data
MODULE_DIR    = %FVTT_DATA%\modules\neuroshima-2026-overrides
DND5E_DIR     = %FVTT_DATA%\systems\dnd5e
WORLD_DIR     = %FVTT_DATA%\worlds\output
WORLD_DB      = %WORLD_DIR%\data\          # LevelDB per collection
FVTT_CONFIG   = C:\Users\archo\AppData\Local\FoundryVTT\Config\options.json

# Workspace roots:
KAMPANIA      = C:\Git\Neuroshima\neuro5e\Neuro 5e
FOUNDRY_MCP   = %KAMPANIA%\Integracje\foundry-mcp
LIVE_MCP      = C:\Git\Neuroshima\FoundryVTTMCP
```

### Pliki modułu (edytowalne bezpośrednio)

```
neuroshima-2026-overrides/
├── module.json              # Manifest — esmodules: ["scripts/main.mjs"] (jedyny entry point)
├── scripts/
│   ├── main.mjs              # Entry point — importuje i rejestruje ~90 modułów niżej, w kolejności hooków init/ready
│   ├── config/                # CONFIG.DND5E overrides + statyczne dane (klasy, bestiariusz, choroby, kalibry...)
│   ├── actors/                # Panele/warstwy per-aktor (zdrowie, PD, PW, hotbar zdolności...)
│   ├── combat/                 # Hooki walki (Zranienie, Krwawienie, Spadanie, cover, save properties...)
│   ├── weapons/                 # Amunicja, magazynki, tryby ognia, VFX/audio, ulepszenia
│   ├── scenes/                   # Warstwa map (propy, sync z Tiled, trudny teren)
│   └── migration/                 # Migracje jednorazowe (część .mjs importowane, część .js do wklejenia w konsolę GM)
├── styles/
│   └── neuroshima.css        # Stylesheet — waliduj po KAŻDEJ edycji (patrz 2.5)
├── packs/                    # Kompendia LevelDB — GENEROWANE, patrz §8.2/§9.2. Nie edytuj plików wprost.
├── icons/ tokens/            # Assety — patrz icons/statuses/ASSETS.md, tokens/README.md
├── dev/                      # Skrypty builda/ekstrakcji (patrz §8.1, §9.1, 2.5) — nie runtime modułu
├── neuroshima_5e_modifications.md  # Plan nadpisań ORYGINALNY — patrz banner na górze tego pliku, IMPLEMENTATION.md jest źródłem aktualnego stanu
├── IMPLEMENTATION.md          # Tracker: co jest zrobione, co nie, changelog — CZYTAJ TO NAJPIERW
├── PLAN_*.md                   # Plany projektowe per-subsystem, każdy z nagłówkiem Status:
└── DEV_GUIDE.md              # Ten plik
```

---

## 2. Dostępne narzędzia

### 2.1 Offline MCP (`foundry-mcp`)

Daje bezpośredni dostęp do danych kampanii w LevelDB **gdy FVTT jest wyłączony**.

**Jak używać:** narzędzia MCP są zarejestrowane w `.vscode/mcp.json` — Copilot widzi je jako `mcp_foundry-vtt_foundry_*`.

| Narzędzie | Do czego |
|-----------|----------|
| `foundry_world_info` | Metadata świata |
| `foundry_list_collections` | Kolekcje LevelDB (actors, items, journal…) |
| `foundry_list_documents` | Lista dokumentów w kolekcji |
| `foundry_get_document` | Pełny dokument + embedded |
| `foundry_search_documents` | Regex po nazwach |
| `foundry_get_actor_sheet` | Aktor + items + effects + system |
| `foundry_get_journal_page_content` | Treść stron journala |
| `foundry_update_document` | Patch top-level (z auto-backup) |
| `foundry_update_embedded` | Patch embedded doc |

**Ograniczenie**: LevelDB jest single-writer — FVTT musi być wyłączony.

### 2.2 Live MCP (w rozwoju — `FoundryVTTMCP/`)

Docelowo: Socket.IO do działającej instancji FVTT. Obecnie: design doc + forki bazowych projektów. **Jeszcze nie operacyjny.**

### 2.3 Źródło dnd5e

Compiled bundle jest trudny do czytania. Referencje:

- **GitHub source**: `https://github.com/foundryvtt/dnd5e/tree/master/module/`
- **Lokalna kopia compiled**: `%DND5E_DIR%\dnd5e.mjs` (2.8 MB, searchable)
- **Source map**: `%DND5E_DIR%\dnd5e-compiled.mjs.map`
- **Templates**: `%DND5E_DIR%\templates\` (Handlebars .hbs)
- **Localization**: `%DND5E_DIR%\lang\en.json` (~500 KB)

### 2.4 FoundryVTT API Docs

- **Official**: `https://foundryvtt.com/api/` (TypeDoc, v14)
- **Community wiki**: `https://foundryvtt.wiki/en/development/api`
- **dnd5e wiki**: `https://github.com/foundryvtt/dnd5e/wiki` (jeśli istnieje)

### 2.5 CSS Structural Validator (`dev/validate-css.mjs`)

**UŻYWAJ TEGO PO KAŻDEJ RĘCZNEJ EDYCJI `styles/neuroshima.css`.**

Zero-dependency skrypt Node, który wykrywa klasę błędów CSS łamiących parser przeglądarki
*po cichu* — bez żadnego błędu w konsoli, po prostu wszystkie reguły za miejscem błędu znikają
z `document.styleSheets`. Typowy scenariusz: edycja wstawia nową regułę w środku istniejącej,
zostawiając osierocone deklaracje (`property: value;`) bez selektora i/lub nadmiarowy `}`.

```bash
node dev/validate-css.mjs        # sprawdza styles/*.css (domyślnie)
node dev/validate-css.mjs styles/neuroshima.css
npm run validate:css             # alias w package.json
```

- Exit code `0` = OK, `1` = NOK (drukuje `plik:linia:kolumna` + fragment dla każdego błędu).
- Wykrywa: deklaracje poza blokiem reguły, osierocone `}`, niezamknięte bloki, puste selektory.
- NIE jest pełnym walidatorem CSS (nie sprawdza nazw/wartości właściwości ani poprawności selektorów) —
  tylko integralność strukturalną (nawiasy klamrowe / średniki na poziomie pliku).
- Brak automatycznego hooka (CI/pre-commit) na 2026-07-02 — uruchamiaj ręcznie po edycji.

---

## 3. Architektura dnd5e v5.3.0 — co trzeba wiedzieć

### 3.1 CONFIG.DND5E — centralny punkt konfiguracji

Wszystkie listy (skills, tools, damage types, conditions, weapon properties) żyją w `CONFIG.DND5E`. Moduł może je nadpisywać w hookach `init` lub `setup`.

```javascript
// Przykład: podmiana listy skilli
Hooks.once("init", () => {
    CONFIG.DND5E.skills = {
        akr: { label: "Akrobatyka", ability: "dex", icon: "..." },
        atl: { label: "Atletyka", ability: "str", icon: "..." },
        // ... reszta 18 Neuroshimowych skilli
    };
});
```

**Kluczowe config keys do nadpisania:**

| Key | Co zawiera | Priorytet |
|-----|-----------|-----------|
| `CONFIG.DND5E.skills` | 18 skills z ability pairings | Phase 1 |
| `CONFIG.DND5E.tools` | Tool proficiencies | Phase 1 |
| `CONFIG.DND5E.damageTypes` | Typy obrażeń (12 w Neuroshimie) | Phase 1 |
| `CONFIG.DND5E.conditionTypes` | Stany (exhaustion, prone, etc.) | Phase 1 |
| `CONFIG.DND5E.weaponTypes` | Kategorie broni | Phase 2 |
| `CONFIG.DND5E.itemProperties` | Właściwości broni/ekwipunku | Phase 2 |
| `CONFIG.DND5E.currencies` | Waluty (→ gamble/gb) | Phase 2 |
| `CONFIG.DND5E.spellSchools` | USUNĄĆ | Phase 1 |
| `CONFIG.DND5E.spellLevels` | USUNĄĆ | Phase 1 |

### 3.2 Hook Pipeline

dnd5e exposes hooks na różnych etapach:

```
Atak: dnd5e.preRollAttack → dnd5e.rollAttack → dnd5e.postRollAttack
Obrażenia: dnd5e.preRollDamage → dnd5e.rollDamage → dnd5e.rollDamageV2
Kalkulacja: dnd5e.calculateDamage
Rzut: dnd5e.buildRollConfig → dnd5e.postBuildRollConfig
Rest: dnd5e.preShortRest / dnd5e.preLongRest → dnd5e.shortRest / dnd5e.longRest
Display: dnd5e.preDisplayCard → dnd5e.displayCard
Recharge: dnd5e.rollRecharge → dnd5e.postRollRecharge
```

**Najważniejsze dla Neuroshimy:**
- `dnd5e.postRollAttack` → nat 1 jam detection, Trafienie Krytyczne → Zranienie
- `dnd5e.calculateDamage` → Osłona damage reduction, Przebijanie Osłony
- `dnd5e.preShortRest` / `dnd5e.preLongRest` → zmiana czasu trwania (4h / 24h)
- `dnd5e.buildRollConfig` → Forsowanie (podmiana modyfikatora na raw ability score)

### 3.3 Sheet Architecture

dnd5e v5.3.0 uses **ApplicationV2** (Foundry v12+ framework). Sheets are not registered via the old `Actors.registerSheet()` — they use class metadata and ApplicationV2 options.

**Podejście modułowe:**
1. **Lekkie** (Phase 1): inject dodatkowe pola przez `renderActorSheet` hook + CSS
2. **Średnie** (Phase 2): extend `ActorSheet5e` z custom tabs i panels
3. **Ciężkie** (Phase 3+): custom sheet class z dedykowanymi templateami

### 3.4 Data Model

Dane aktora leżą w `actor.system`:
```javascript
actor.system.abilities      // { str: { value, mod, save, ... }, dex: ... }
actor.system.attributes      // { ac, hp, death, exhaustion, ... }
actor.system.skills          // { acr: { value, ability, mod, ... }, ... }
actor.system.traits          // { weaponProf, armorProf, languages, ... }
actor.system.details         // { level, xp, race, background, ... }
```

**Neuroshima-specific data** (brak w dnd5e) musi iść do:
```javascript
actor.flags["neuroshima-2026-overrides"]   // Module flags namespace
// Alternatywnie: actor.system z patchem DataModel (bardziej inwazyjne)
```

Flagi do przechowywania: Stopień Zranienia, Fuksy, Choroba, Fobia, magazine state, Upojenie, surowce, Przedmioty podręczne, PD tracking.

---

## 4. Build — co jest, a co świadomie nie jest

**Decyzja zapadła i jest wdrożona: NO BUILD.** `module.json` (`esmodules: ["scripts/main.mjs"]`)
ładuje jeden plik, który importuje ~90 innych `.mjs` bezpośrednio — Foundry serwuje je jako
natywne ESM, bez bundlera. Sekcje poniżej opisują **co faktycznie jest zainstalowane i czemu
służy**, nie plan na przyszłość.

> ⚠️ Wcześniejsza wersja tej sekcji opisywała hipotetyczny pipeline (Vite/Rollup, `src/`,
> TypeScript types, ESLint, Foundry CLI) jako "rekomendowany". Nic z tego nie zostało przyjęte —
> nie ma `vite.config.js`, `tsconfig`, `.eslintrc`, katalogu `src/`, ani `@league-of-foundry-developers/foundry-vtt-types`
> w `package.json`. Traktuj to jako historię decyzji (odrzucone), nie zaległy TODO.
> `module.json`'owe `compatibility`/`relationships`, które ta sekcja kiedyś nazywała stale,
> są już poprawne (`14`/`14`, dnd5e `5.0.0`–`5.3.0`) — nie ma nic do zrobienia tutaj.

### 4.1 Co jest faktycznie zainstalowane

| Co | Do czego | Gdzie |
|----|----------|-------|
| Node.js 18+ | Skrypty w `dev/` (build packów, ekstrakcja klas/bestiariusza, generowanie ikon) | wymagany lokalnie |
| Python 3 | Część skryptów `dev/` (ekstrakcja z PDF/Obsidian, generowanie żetonów) | `npm run build:*` woła `python` wprost, patrz `package.json` |
| Git | Kontrola wersji | ten katalog jest repo od 2026-06 |
| `foundry-mcp` | Odczyt LevelDB świata offline | `Integracje/foundry-mcp` w `KAMPANIA` |
| **Foundry CLI, Vite, TypeScript types, ESLint** | — | **nie zainstalowane, nie planowane** |

### 4.2 Build scripts (`package.json`)

Wszystkie realne komendy builda — dane źródłowe → `scripts/config/*-data.mjs` → kompendia
LevelDB. Patrz §10.2 (klasy) i §11.2 (bestiariusz) po pełny pipeline per warstwa.

```bash
npm run build:packs           # dev/packs/build-packs.mjs — wszystkie kompendia z aktualnych *-data.mjs
npm run validate:packs        # regresja: UUID-y, liczba wyborów per poziom, recovery
npm run build:classes         # gen_features.py → ikony → packi → walidacja (klasy/profesje/zdolności)
npm run build:bestiary        # extract → gen → pack (bestiariusz)
npm run build:status-icons    # dev/icons/gen_status_numerals.mjs — ikony poziomów Zranienia i Wyczerpania
npm run validate:css          # dev/validate-css.mjs — patrz §2.5
npm run build:token-templates / build:token-placeholders
```

⚠️ **Foundry musi być zamknięty** dla `build:packs`/`build:classes`/`build:bestiary` — LevelDB
jest single-writer i blokuje katalog `packs/`.

---

## 5. Workflow deweloperski

### 5.1 Edit → Test cycle

1. Edytuj pliki w `MODULE_DIR` (workspace root "Neuroshima Overrides")
2. W FVTT: `F5` (refresh) — moduł się przeładuje
3. Otwórz DevTools (`F12`) w FVTT → Console → filtruj "Neuroshima"
4. Sprawdź `CONFIG.DND5E` w konsoli po override'ach

### 5.2 Debugowanie dnd5e

```javascript
// W konsoli FVTT:
CONFIG.DND5E.skills         // Czy override zadziałał?
game.actors.getName("Kluczyk").system   // Dane aktora
game.actors.getName("Kluczyk").flags    // Flagi modułu
```

Source map (`dnd5e-compiled.mjs.map`) pozwala na breakpointy w oryginalnym źródle przez DevTools.

### 5.3 Jak agent powinien pracować

1. **Czytanie dnd5e**: grepuj `dnd5e.mjs` po wzorcach (`grep_search` z `includePattern` na ścieżkę systemu) lub użyj subagenta Explore
2. **Czytanie danych kampanii**: użyj MCP tools (`mcp_foundry-vtt_foundry_*`) gdy FVTT jest offline
3. **Edycja modułu**: bezpośrednio przez `replace_string_in_file` / `create_file` w `MODULE_DIR`
4. **Edycja `styles/neuroshima.css`**: po KAŻDEJ zmianie uruchom `node dev/validate-css.mjs` (patrz 2.5) —
   błędnie sklejone reguły CSS nie rzucają żadnego błędu w przeglądarce, tylko po cichu tracą wszystko
   co jest za nimi w pliku
5. **Tworzenie compendiów**: JSON files w `packs/_source/`, potem `fvtt package pack`
6. **Testowanie**: dopisz paczkę Quench dla każdej nowej tabeli danych i każdego czystego
   predykatu reguł (patrz 12 i `TESTING.md`), uruchom `npm test`, poproś użytkownika o `F5`,
   a potem `game.neuroshima.tests.run()` w konsoli
7. **Nigdy nie przepisuj `module.json` (ani żadnego JSON-a) przez PowerShell.** PS 5.1 dokłada
   BOM i potrafi podwójnie zakodować UTF-8. Foundry czyta manifest przez
   `fs.readFileSync(…, "utf8")`, które BOM-a nie zdejmuje — `JSON.parse` wywala się na pierwszym
   znaku i **cały moduł znika z listy pakietów**. UI nie mówi nic: `core.moduleConfiguration`
   dalej ma `true`, więc świat wygląda normalnie, po prostu bez modułu. Jedyny ślad jest w
   `%LOCALAPPDATA%\FoundryVTT\Logs\debug.*.log` (`Error loading module … is not valid JSON`).
   Do podbicia wersji służy `npm run bump:version 0.14.3`; do reszty — edytor.

### 5.4 „Moduł się nie ładuje" — kolejność sprawdzania

1. `game.modules.get("neuroshima-2026-overrides")` w konsoli. **`undefined` znaczy, że Foundry
   odrzucił manifest**, a nie że moduł jest wyłączony — wyłączony byłby obecny z `active: false`.
2. Zajrzyj do `Logs/debug.<data>.log` i grepuj `Error loading module`.
3. Sprawdź pierwsze bajty manifestu: `[System.IO.File]::ReadAllBytes("module.json")[0..2]`.
   `EF BB BF` to BOM — patrz punkt 7 wyżej; przywróć plik `git checkout <commit> -- module.json`.
4. Manifesty czyta **serwer przy starcie świata**. Po naprawie `F5` nie wystarczy — trzeba wrócić
   do Setupu i odpalić świat ponownie.

---

## 6. Narzędzia custom — co powstało, a co nie

Sekcja 4 pokrywa już, czego **świadomie nie zainstalowano** (Foundry CLI, Vite, types, ESLint —
nie duplikuj tu tej listy). Poniżej: pomysły na custom tooling z wczesnego planowania, i co się
z nimi realnie stało.

| Narzędzie | Cel | Status |
|-----------|-----|-----------|
| **Compendium builder** | Generowanie kompendiów z danych źródłowych | ✅ zbudowane — `dev/packs/build-packs.mjs` + `validate-packs.mjs`, per-warstwa pipeline w §8.2/§9.2 |
| **Localization generator** | Auto-generacja `pl.json` z kluczy dnd5e `en.json` | ❌ nie zbudowane — 553 tłumaczenia w `lang/pl.json` pisane ręcznie, weryfikowane przez `localization.mjs` (sentinel key fallback) |
| **Config diff tool** | Porównanie `CONFIG.DND5E` na żywo z targetem Neuroshimy | ❌ nie zbudowane |
| **Sheet data validator** | Walidacja struktury flag modułu na aktorach | ❌ nie zbudowane jako osobne narzędzie — walidacja dziś jest ad-hoc (backfill-przy-starcie per warstwa: zdrowie, klasy, Zranienie, patrz IMPLEMENTATION.md) |

### 6.3 Dostępy i uprawnienia

| Zasób | Status | Wymagane działanie |
|-------|--------|-------------------|
| Pliki modułu | ✅ W workspace | Edycja bezpośrednia |
| dnd5e source (compiled) | ✅ Lokalnie | Read-only, grep do referencji |
| dnd5e source (GitHub) | ✅ Publiczny | `fetch_webpage` po konkretne pliki |
| LevelDB world data | ✅ Przez MCP | Wymaga offline FVTT |
| FoundryVTT runtime | ❌ Z poziomu agenta | Agent nie ma dostępu do działającego FVTT — testuje użytkownik |
| FoundryVTT API docs | ✅ Publiczne | `fetch_webpage` po docs |

---

## 7. Strategia implementacji Phase 1

> ✅ Historyczna — wszystkie 6 kroków niżej są dawno zrobione (patrz `IMPLEMENTATION.md` Phase 1).
> Zostawione jako przykład "jak rozbić fazę na kroki", nie jako lista roboczą.

### Krok 1: Scaffold modułu
- Zaktualizuj `module.json` (compatibility, relationships)
- Stwórz strukturę `src/` albo rozbuduj `scripts/`
- Dodaj `package.json` z dev dependencies

### Krok 2: CONFIG overrides (skills, tools, damage types)
- Podmień `CONFIG.DND5E.skills` na 18 Neuroshimowych skilli
- Dodaj 22 tool sets z poprawnymi ability pairings
- Podmień damage types na 12 Neuroshimowych
- Usuń/ukryj spellcasting config

### Krok 3: Localization
- Stwórz `lang/pl.json` z tłumaczeniami terminów
- Zarejestruj language file w `module.json`
- Override kluczowe dnd5e labels (AC → TT, HP → PW, Hit Dice → KW)

### Krok 4: Tracking na flagach
- Zdefiniuj schema flag modułu (Zranienie, Wyczerpanie, Fuksy)
- Hook `renderActorSheet` → inject panele trackingowe
- Obsługa zapisu/odczytu flag

### Krok 5: Combat hooks
- `dnd5e.postRollAttack` → detekcja nat 1 (zacięcie broni)
- `dnd5e.postRollAttack` → Trafienie Krytyczne → Stopień Zranienia
- Chat buttons dla Forsowania

### Krok 6: Ammo/Magazine
- Flagi na item (currentAmmo, maxCapacity, ammoType, fireMode)
- Hook lub Activity override dla przeładowania
- Chat card z przyciskami trybów ognia

---

## 8. Ryzyka i decyzje do podjęcia

### 8.1 Moduł vs System fork

Plan zakłada moduł. Ale jeśli Phase 1 wymaga:
- Podmianę DataModel aktora (nie tylko flagi)
- Override rest workflow (4h/24h zamiast 1h/8h)
- Głęboką ingerencję w combat pipeline

…to może być taniej zforkować dnd5e w dedykowany system. **Decyzja po Phase 1.**

### 8.2 ApplicationV2 vs Legacy Sheets

dnd5e v5.3.0 migruje na ApplicationV2. Stare `ActorSheet` API może nie działać. Trzeba sprawdzić czy `registerSheet` wciąż jest wspierany w v14.

### 8.3 dnd5e Updates

dnd5e jest aktywnie rozwijany (5.3.0 → 5.3.2 już wyszedł). Override'y CONFIG mogą się zepsuć przy update'ach. Strategie:
- Pinuj wersję dnd5e w `module.json`
- Testuj przy każdym update
- Preferuj hooki nad monkey-patchingiem

### 8.4 Compendium Format

FoundryVTT v14 używa LevelDB dla compendiów (nie JSON). Do budowania:
```bash
fvtt package pack --in packs/_source/weapons --out packs/weapons
```
Źródła trzymaj jako JSON w `packs/_source/`.

---

## 9. Referencje szybkie dla agentów

### Grep patterns do szukania w dnd5e.mjs

```
# Skills config
grep: "CONFIG.DND5E.skills" | "skill.*label" | "skill.*ability"

# Sheet registration
grep: "registerSheet" | "ActorSheet" | "ItemSheet"

# Roll hooks
grep: "dnd5e\\.preRoll" | "dnd5e\\.postRoll" | "dnd5e\\.roll"

# Rest mechanics
grep: "shortRest|longRest|restVariant"

# Exhaustion
grep: "exhaustion" | "prepareExhaustion"

# Death saves
grep: "death\\.success|death\\.failure|deathSave"

# Conditions
grep: "conditionTypes|conditionEffect|hasCondition"
```

### MCP tool prefixes

Szukaj narzędzi MCP przez `tool_search` z query `mcp foundry`. Nazwy zaczynają się od `mcp_foundry-vtt_foundry_`.

### Kluczowe pliki do czytania

| Plik | Zawiera |
|------|---------|
| `neuroshima_5e_modifications.md` | Pełny plan nadpisań (aktualny plik) |
| `A-README-AI.md` | Kontekst kampanii, frakcje, fabuła |
| `Tabele/Dostepnosc.md` | Dostępność przedmiotów per lokacja |
| `podrecznik.md` | Treść podręcznika Neuroshima 5e |
| `dnd5e.mjs` | Compiled source dnd5e (grep-friendly) |
| `lang/en.json` | Klucze lokalizacyjne dnd5e |

---

## 10. Warstwa klas (Phase 3) — pipeline i workflow

Pełna architektura: `PLAN_classes.md`. Ta sekcja to instrukcja obsługi.

### 10.1 Źródło prawdy

```
Podrecznik/source.txt                    surowy dump PDF (nie edytować)
  ↓  dev/classes/extract_classes.py      76 zdolności klasowych  → classes.json
  ↓  dev/classes/extract_professions.py  61 zdolności profesji   → professions.json
  ↓  dev/classes/gen_features.py         + metadane automatyki   → scripts/config/class-features-data.mjs
scripts/config/classes-data.mjs          RĘCZNIE PISANE: tabele poziomów, PW, biegłości, scale values
  ↓  dev/packs/build-packs.mjs           → packs/{klasy,profesje,zdolnosci-klasowe,sztuczki}
  ↓  dev/packs/validate-packs.mjs        regresja: UUID-y, liczba wyborów per poziom, recovery
```

⚠️ **`Tabele/Klasy.md` NIE jest źródłem prawdy** — zawierał realne błędy mechaniczne
(patrz `PLAN_classes.md` §3.3). Mechanikę bierz z `classes-data.mjs`.

⚠️ **`class-features-data.mjs` jest generowany** — nie edytuj ręcznie. Zmiany automatyki
(uses/recovery/toggle/hotbar) wprowadzaj w słowniku `AUTOMATION` w `gen_features.py`.

### 10.2 Przebudowa

```bash
npm run build:classes     # generuj → ikony → packi → walidacja
npm run validate:packs    # sama walidacja
```

⚠️ **Foundry musi być zamknięte** — LevelDB trzyma blokadę na katalogu `packs/`.
Skrypt wykrywa to i wypisuje instrukcję zamiast rzucać `EPERM`.

Dla samych poprawek treści (nazwy, opisy) można edytować żywe kompendium z konsoli
przeglądarki — zapisuje do tej samej bazy:

```js
const p = game.packs.get("neuroshima-2026-overrides.zdolnosci-klasowe");
await p.configure({ locked: false });
```

⚠️ Przy `import()` modułu z konsoli **dodaj cache-buster**, inaczej dostaniesz starą wersję:
`await import(url + "?v=" + Date.now())`.

### 10.3 Migracja postaci

```js
const api = game.modules.get("neuroshima-2026-overrides").api.migration;
await api.migrateClasses();                     // dry run — raport w konsoli
await api.migrateClasses({ commit: true });     // zastosuj
await api.migrateClasses({ actors: ["Piekarz"], commit: true });
```

Zdolności nierozpoznane **nigdy nie są usuwane** — świat zawiera dużo homebrew z realną
historią gry. Raport wskazuje je MG do ręcznej decyzji.

### 10.4 API modułu

```js
const api = game.modules.get("neuroshima-2026-overrides").api;
api.classState.toggleClassState(actor, "berserk");   // przełącz stan
api.classState.activeStates(actor);                   // ["neuro-berserk"] — punkt zaczepienia dla VFX
api.hotbar.sync(actor);                               // przebuduj pasek skrótów
api.pd.awardPD(actor, "spotkanie", { note: "..." });  // przyznaj PD
api.classRules.resolveExclusiveGroups(actor);         // reguły niekumulowania
```

### 10.5 Dodanie nowej zdolności

1. Dopisz tekst do `dev/classes/classes.json` lub `professions.json`
2. Dodaj wpis do `AUTOMATION` w `gen_features.py` (jeśli ma uses/toggle/hotbar)
3. Wpisz jej id do tabeli poziomów w `classes-data.mjs`
4. `npm run build:classes`

Walidator złapie literówkę w id (`unresolved grant`) i niezgodność liczby wyborów per poziom.

---

## 10a. Stany stopniowane (Wyczerpanie, Zranienie, Upojenie, Skażenie)

### 10a.1 Kto co posiada

Tory **nie** mają wspólnego magazynu — każdy zostaje przy swoim właścicielu, a rejestr
`HUD_CYCLE` w `actors/levelled-conditions.mjs` zbiera tylko akcesory.

| Tor | Magazyn | Właściciel |
|---|---|---|
| Wyczerpanie | `system.attributes.exhaustion` (natywne dnd5e) + `flags.<mod>.exhaustionSources` | `config/exhaustion.mjs` |
| Zranienie | `flags.<mod>.zranienie.level` | `combat/zranienie.mjs` |
| Upojenie, Skażenie | `flags.<mod>.<id>` (liczba) | `actors/levelled-conditions.mjs` |

Rejestracja z zewnątrz: `registerHudLevelled(id, { label, max, get, set, summary, img })`.
Rejestr daje HUD-owi cykl klikania, karcie panel Stan, a tooltipom treść — właściciel
nie musi wiedzieć o żadnym z tych trzech.

### 10a.1a Poziom na żetonie i kolor toru

Rdzeń rysuje na żetonie **wyłącznie `effect.img`** — nie ma żadnego licznika ani nakładki,
więc poziom da się pokazać tylko osobnym plikiem ikony. dnd5e robi dokładnie to
(`ActiveEffect5e._getExhaustionImage` dokleja `-N` do ścieżki) i my robimy to samo.

- Ikony poziomów generuje `dev/icons/gen_status_numerals.mjs` (`npm run build:status-icons`).
- Wyczerpanie przekierowujemy **bez nadpisywania kodu**: `_getExhaustionImage` buduje ścieżkę
  z `CONFIG.DND5E.conditionTypes.exhaustion.img`, więc `exhaustion.mjs` podmienia to jedno pole.
- Tor, który poda `img: level => path`, pokazuje poziom w Token HUD podmianą tła kontrolki
  (sztuczka z `ActiveEffect5e.onTokenHUDRender`). Tor bez `img` dostaje badge `.neuro-condition-level`.
- Kolory: `config/state-colors.mjs`. Tabela jest w JS, bo czyta ją też generator w Node —
  tekstura idzie do PIXI, więc `var(--icon-fill)` w SVG nigdy się nie rozwinie i barwa musi być
  wpalona w plik. Runtime publikuje ją jako `--neuro-color-<id>` na `:root` w `init`.

### 10a.2 API

```js
const C = game.neuroshima.conditions;
C.get(actor, "zranienie");          // 0–4, dowolny zarejestrowany tor
C.set(actor, "zranienie", 3);       // idzie przez writer właściciela (AE, czat, VFX)
C.adjust(actor, "upojenie", +1);
C.tracks();                          // Map<id, LevelledTrack> — wszystkie tory
C.drink(actor);                      // RO na Kondycję po kielichu
C.promptRadiationSave(actor);        // wybór pasma ST → RO przeciw skażeniu
```

**Nieznane id rzuca wyjątkiem.** Wcześniej `set` po cichu zwracało 0 dla `zranienie`
(bo sięgało tylko do magazynu flagowego tego pliku), co przy stanie 0 wygląda
identycznie jak sukces — pułapka, która zostawiła osierocone Efekty na żywej postaci.

### 10a.3 Skażenie to nie tor

Jego cztery „poziomy” to **pasma ST** godzinowego RO, nie kumulujące się kary.
W panelu Stan jest paskiem zagrożenia z trzema znacznikami oblanych rzutów; trzeci
daje chorobę popromienną i zeruje licznik. Dlatego jako jedyny nie ma `summary`.

---

## 10b. Chemia — efekty odroczone i pola hierarchiczne

### 10b.1 Active Effects w kompendium Itemów mają własny prefiks klucza

`Item#effects` jest polem **hierarchicznym** (`EmbeddedCollectionField.hierarchical === true`,
`common/data/fields.mjs`). Foundry daje każdemu takiemu polu osobny prefiks klucza w LevelDB —
to ten sam powód, dla którego pack aktorów rozbija się na `!actors!` / `!actors.items!` /
`!actors.items.effects!`. Dla packa przedmiotów:

```
!items!<itemId>                              ← przedmiot; jego "effects" to LISTA ID
!items.effects!<itemId>.<effectId>           ← każdy efekt osobno
```

Wpisanie `effects: [{...}]` wprost do dokumentu **nie rzuca błędem** — czyta się z powrotem
jako pusta kolekcja. Tak właśnie chemia pojechała najpierw bez ani jednego efektu.
`writePack` w `dev/packs/build-packs.mjs` rozbija to sam; nie „upraszczaj" go z powrotem.

Uwaga na kontrast: **`system.activities` to zwykłe pole obiektowe**, nie hierarchiczne.
Aktywności (razem z ręcznie nadanymi `_id` i własnymi `flags`) jadą w dokumencie i przeżywają
round-trip przez pack. Wcześniejsza notatka, że „zapisane na sztywno id aktywności są gubione",
dotyczy tylko `activities` na najwyższym poziomie, którego dnd5e nie używa.

### 10b.2 dnd5e nie ma hooka „efekt wygasł"

`grep -ri "expir" module/` po źródłach dnd5e 5.3 daje zero trafień. Nie ma czego podpiąć.
Mechaniki typu „gdy Anestix przestanie działać, rzuć RO Kondycja" składamy z czterech
natywnych kawałków:

1. prawdziwe `duration` na Active Effekcie — HUD odlicza, gracz widzi, ile zostało;
2. rekord w `flags.<mod>.chemiaPending` — co, komu i o której się należy;
3. obserwator `updateWorldTime` — działa, bo `Combat#nextRound` i odpoczynki przesuwają czas
   świata (`game.time.advance(60 * config.duration)` w `Actor#_rest`);
4. przycisk **Rozlicz teraz** na karcie czatu — bo poza walką czas świata potrafi stać.

Czwarty punkt nie jest workaroundem, tylko przyznaniem się: nic tu nie tyka samo z siebie.

### 10b.3 Arności hooków, na których łatwo się przejechać

```js
Hooks.on("dnd5e.preUseActivity",  (activity, usageConfig, dialogConfig, messageConfig) => {});
Hooks.on("dnd5e.postUseActivity", (activity, usageConfig, results) => {});
Hooks.on("combatTurnChange",      (combat, previous, current) => {});
Hooks.on("dnd5e.restCompleted",   (actor, result, config) => {});
```

- `preUseActivity` ma **cztery** argumenty. Nazwanie trzeciego `messageConfig` nie rzuca błędem,
  tylko po cichu ustawia `create` na konfiguracji dialogu i natywna karta i tak leci.
- Koniec tury to `combatTurnChange`, **nie** `updateCombat`. Przy `updateCombat`
  `combat.combatant` jest już przesunięty, więc rzut „na koniec tury" spada na następną postać.
  `previous.combatantId` daje tego, komu tura właśnie minęła.
- Dodatkowe klucze w konfiguracji użycia (`activity.use({ neuroSilent: true }, ...)`) **przeżywają**
  — `_prepareUsageConfig` robi `deepClone`. To czysty sposób, żeby jeden moduł powiedział
  drugiemu „tę kartę wystawiam ja".

---

## 10c. Pancerze — cztery reguły, których dnd5e nie ma

### 10c.1 Próg obrażeń: dlaczego nie natywne `hp.dt`

dnd5e ma gotowy próg obrażeń — `system.attributes.hp.dt`, obsługiwany w
`Actor5e#calculateDamage` (`actor.mjs:882`). Odpada z dwóch niezależnych powodów:

1. Jest zdefiniowany w `AttributesFields.hitPoints` **tylko dla NPC, obiektów i pojazdów**.
   Postacie graczy nie mają tego pola w schemacie.
2. Dotyczy **wszystkich** typów obrażeń naraz, a neuroshimowy próg z pancerza łapie wyłącznie
   obrażenia kinetyczne (cięte, kłute, obuchowe).

Zostaje hak `dnd5e.calculateDamage(actor, damages, options)` — odpala się na samym końcu
`calculateDamage` (`actor.mjs:901`), czyli **po** odpornościach, co jest dokładnie tym, czego
wymaga tabela. `damages` to tablica z doliczonym `.amount`; każdy wpis ma `{value, type, properties, active}`.
Wpis wyzerowany progiem oznaczamy `active.threshold = true`, tak jak robi to natywna ścieżka.

### 10c.2 `AdvantageModeField.setMode` — który model podać

```js
dnd5e.dataModels.fields.AdvantageModeField.setMode(actor.system, "abilities.str.check.roll.mode", -1);
```

`setMode(model, keyPath, value)` (`data/fields/advantage-mode-field.mjs:169`) wybiera schemat
w zależności od ścieżki: gdy zaczyna się od `"system."`, bierze `model.system.schema`, w przeciwnym
razie `model.schema`. Nasze ścieżki nie mają prefiksu, więc modelem musi być **`actor.system`**,
a nie `actor`. Podanie `actor` nie rzuca błędem — po prostu nic nie ustawia.

Tryb Cechy dociera do Umiejętności i Narzędzi za darmo: `#rollSkillTool` (`actor.mjs:1278`) składa
`abilities.<id>.check.roll.mode` z `skills.<id>.roll.mode`. Testy Ataku **nie** — te trzeba złapać
osobno hakiem `dnd5e.preRollAttack` (patrz ARCHITECTURE.md §6, dlaczego nie `postBuild…`).

### 10c.3 Brak haka po `prepareDerivedData`

dnd5e nie ma niczego w rodzaju `dnd5e.postPrepareDerivedData`. Utarty wzorzec w tym module
(`actors/pw.mjs`, `actors/sp.mjs`, teraz `actors/armor-rules.mjs`) to owinięcie prototypu:

```js
const original = CONFIG.Actor.documentClass.prototype.prepareDerivedData;
CONFIG.Actor.documentClass.prototype.prepareDerivedData = function () {
  original.apply(this, arguments);
  applyArmorPenalties(this);
};
```

Owijanie się kaskaduje bezpiecznie — kolejne moduły dokładają swoje warstwy.

**Nie waliduj tego przez ręczne `actor.prepareData()`.** Drugie wywołanie rzuca
`Cannot redefine property: darkvision` — to quirk Foundry, nie objaw błędu w owinięciu.
Czytaj `actor.system` bezpośrednio albo wymuś przeliczenie prawdziwym `update()`.

---

## 10d. Pochodzenia — pipeline i migracja

### 10d.1 Źródło prawdy

```
Tabele/Pochodzenie.md                    12 regionów (k12) + 36 zdolności (k6) — treść (Obsidian)
scripts/config/pochodzenia-data.mjs      RĘCZNIE PISANE: premie cech, teksty, rejestr auto/manual
  ↓  dev/packs/build-packs.mjs           → packs/{pochodzenia,zdolnosci-pochodzenia}
  ↓  dev/packs/validate-packs.mjs        regresja: fixed == attrBonus, pula ItemChoice == 3, UUID-y
```

Pochodzenie jest itemem typu **`background`** — natywny slot dnd5e 2024, nie własny typ.
Cała mechanika to dwa advancementy na poziomie 0, doklejane przez builder:

| Advancement | Konfiguracja | Efekt |
|---|---|---|
| `AbilityScoreImprovement` | `fixed: {con: 1, int: 1}`, `points: 0`, `cap: 1` | +1/+1 do **Cech Bazowych** (nie modyfikator) |
| `ItemChoice` | `pool` = 3 zdolności regionu, `allowDrops: true` | wybór jednej zdolności |

`points: 0` jest istotne — dnd5e w regułach 2024 domyślnie daje backgroundowi `points: 3`
do rozdania (`background.mjs::_advancementToCreate`). Tu jest wyłączone.

Spec na poz. 5 dobiera **drugą** zdolność: własny `ItemChoice` w `packs/klasy` z pulą
**wszystkich 36** pozycji, bo dnd5e nie potrafi uzależnić puli advancementu od noszonego backgroundu.

### 10d.2 Migracja postaci

```js
const api = game.modules.get("neuroshima-2026-overrides").api.migration;
await api.migratePochodzenia();                                  // dry run — console.table
await api.migratePochodzenia({ commit: true });                  // zastosuj
await api.migratePochodzenia({ actors: ["Piekarz"], commit: true });
await api.migratePochodzenia({ roll: false });                   // tylko wywnioskowane, bez k12
```

Pochodzenie jest wnioskowane z ręcznie zrobionych feat'ów przeniesionych z Roll20 (`Fart` → Vegas),
a gdy nie ma z czego — losowane k12/k6. Pomijane są puste szablony po imporcie i aktorzy techniczni
bez klasy. Skrypt jest idempotentny (postać z zajętym slotem `background` nie jest ruszana).

⚠️ **Premie +1/+1 są odejmowane przed nałożeniem Pochodzenia**, bo MG miał je już wliczone
w spisane Cechy Bazowe. Na karcie nic się nie zmienia; zmienia się to, gdzie te punkty *mieszkają*.
Jeśli kiedyś odpalasz to na postaci zbudowanej **bez** wliczonej premii, cechy spadną o 1 —
wtedy podnieś je ręcznie po migracji.

Manifest cofania: `dev/backup/pochodzenia-migracja-2026-08-23.json` (cechy przed + pełne
`toObject()` skasowanych feat'ów).

### 10d.3 Dlaczego migracja klika w UI

`AdvancementManager` nie ma publicznego API do przewijania kroków — `#forward` i `#complete`
są polami prywatnymi, a jedyne wejście to handler `data-action`. Do tego:

- `advancement.apply()` pisze przez `actor.updateSource()`, czyli do **klona** managera, i czyta
  `configuration.fixed` **tylko** przy `{ initial: true }`. Wywołane wprost nie zapisuje nic —
  i nie zgłasza błędu.
- `actor.deleteEmbeddedDocuments("Item", [bgId])` **nie cofa** advancementów. Cofanie siedzi
  w `Item5e#deleteDialog()`, czyli też w ścieżce UI. Skrypt kasujący Pochodzenia hurtem zostawi
  postacie z zawyżonymi cechami i osieroconymi zdolnościami.

Stąd `migration/migrate-pochodzenia.mjs` renderuje prawdziwy manager i klika jego przyciski.

### 10d.4 Rejestr automatyki

```js
game.neuroshima.pochodzenia.report();      // auto / partial / none
game.neuroshima.pochodzenia.of("vegas");   // 3 zdolności regionu
game.neuroshima.pochodzenia.bonus("vegas") // { dex: 1, cha: 1 }
```

Stan: **1 z 36** zdolności ma kod (`Wychuchana spluwa` → `weapons/jams.mjs`). Reszta drukuje
badge „bez automatyki" na karcie przedmiotu. Klasy CSS `.neuro-pochodzenie-*` to aliasy
`.neuro-sztuczka-*` w tej samej regule — patrz nagłówek sekcji w `styles/neuroshima.css`.

---

## 10e. Stany na czas — `duration` FVTT zamiast własnego licznika

### 10e.1 Wpis stanu może nieść `duration`

`ActiveEffect.fromStatusEffect` (`client/documents/active-effect.mjs:127`) **głęboko klonuje
cały wpis** z `CONFIG.statusEffects` do danych efektu, odcinając tylko `id` i `hud`; nadpisanie
w dnd5e (`module/documents/active-effect.mjs:154`) zdejmuje dodatkowo `reference`. Wystarczy
więc dopisać `duration` do wpisu w `config/conditions.mjs` i przełączenie stanu z HUD-a już
odlicza:

```js
burning: {
  name: "Podpalenie",
  duration: { value: 2, units: "rounds", expiry: "turnStart" },
  ...
}
```

Schemat to `{ value, units, expiry, expired }`. Stare `{ rounds: N }` jeszcze się migruje,
ale jest deprecated — nie pisz tak w nowym kodzie. Dozwolone `expiry` to
`CONST.ACTIVE_EFFECT_EXPIRY_EVENTS`: `combatStart`, `roundStart`, `turnStart`, `combatEnd`,
`roundEnd`, `turnEnd`.

Odczyt zostawionej reszty: `effect.updateDuration().remaining` (`active-effect.mjs:289`).
Metoda przy okazji przelicza `_source.duration`, jeśli jednostki się rozjechały — i to ta sama,
z której korzysta rdzeń.

### 10e.2 Rdzeń **nie skasuje** wygasłego efektu

`ActiveEffectRegistry.refresh(event)` (`client/helpers/active-effect-registry.mjs:107`) działa
wedle `CONFIG.ActiveEffect.expiryAction`, które domyślnie wynosi **`"update"`** — stawia
`duration.expired = true` i nic więcej. Ikona zostaje na żetonie.

Przełączenie na `"delete"` jest **globalne dla świata**, więc dotknęłoby też efektów
systemowych i cudzych modułów. Dlatego reakcja na wygaśnięcie jest po naszej stronie
(`combat/podpalenie.mjs`, hak `updateCombat`) i liczy się jako zastąpienie systemu
w rozumieniu ARCHITECTURE §8. Arytmetykę czasu nadal robi rdzeń — my tylko sprzątamy.

Kolejność w rundzie: haki `updateCombat` → `Combat#_onStartTurn` → `registry.refresh("turnStart")`.
Czyli w `updateCombat` `remaining` jest jeszcze **sprzed** oznaczenia wygaśnięcia — trzeba
sprawdzać `<= 0` samemu.

### 10e.3 Dwie pułapki, które kosztowały sesję debugowania

- **Aktor syntetyczny ≠ aktor bazowy.** Dla niepowiązanego żetonu HUD woła
  `token.actor.toggleStatusEffect(...)`, czyli aktora syntetycznego, i `combat.combatant.actor`
  też nim jest. Nałożenie stanu na aktora **bazowego** zapali płomień (bo `getActiveTokens()`
  dopasowuje po `actorId` niezależnie od powiązania), ale żaden hak turowy go nie zobaczy.
  W danych w czacie i w `dataset` trzymaj `actor.uuid`, nie `actor.id`.
- **Zabłąkana aktywna walka.** `_prepareCombatBasedDuration` (`:417`) szuka walki jako
  `game.combats.get(start.combat?.id) ?? game.combat`. Jeśli nie znajdzie w niej komabatanta,
  **przelicza rundy na sekundy** (`rounds: 2` → `seconds: 12`) i odliczanie przestaje reagować
  na tury. Objaw: `units` nagle jest `"seconds"`. Przyczyna zwykle nie leży w kodzie, tylko
  w pustej walce zostawionej jako aktywna.

### 10e.4 Efekty na kanwie — `seqEffect`

`weapons/sequencer.mjs` eksportuje `seqEffect(file, source, opts)`, `seqEndEffect(name)`
i `seqEffectRunning(name)`. Sequencer i JB2A są **miękkimi zależnościami**: `seqEffect`
sprawdza `Sequencer.Database.entryExists(file)` i zwraca `false`, zamiast rzucić — brak wtyczki
ma kosztować efekt, nie zasadę. Trwałe efekty nazywaj deterministycznie
(`neuro-<stan>-<tokenId>`), żeby dało się je dosynchronizować w haku `canvasReady`.

---

## 11. Warstwa bestiariusza — pipeline i workflow

### 11.1 Źródło prawdy

```
Podrecznik/Bestiariusz/*.md              52 profile — ŹRÓDŁO TREŚCI (Obsidian)
  ↓  dev/bestiary/extract_bestiary.py    czysta transkrypcja → bestiary.json
  ↓  dev/bestiary/gen_bestiary.py        + RULES/AUTOMATION  → scripts/config/bestiary-data.mjs
  ↓  dev/packs/build-packs.mjs           → packs/bestiariusz (51 aktorów, 6 folderów)
```

⚠️ **`bestiary.json` i `bestiary-data.mjs` są generowane** — nie edytuj ręcznie.
Treść zmieniaj w plikach vaulta, automatykę w `RULES`/`AUTOMATION` w `gen_bestiary.py`.

**Parser jest surowy.** Nieznana etykieta nagłówka, sekcja, umiejętność, typ obrażeń,
stan czy zmysł to **błąd builda**, nie ciche pominięcie — ta sama postawa co
`validate-packs.mjs` wobec `unresolved grant`. Defekty samego podręcznika
(brakująca jednostka, brakujący typ obrażeń) idą osobnym kanałem `warnings`,
żeby literówka w transkrypcji nie blokowała builda.

### 11.2 Przebudowa

```bash
npm run build:bestiary      # extract → gen → pack
```

⚠️ **Foundry musi być zamknięte** przy przebudowie istniejącego packa (blokada LevelDB).
`--only=<pack>` pozwala przebudować podzbiór:

```bash
node dev/packs/build-packs.mjs --only=bestiariusz
```

### 11.3 Dwie warstwy automatyki

| Warstwa | Gdzie | Zasięg |
|---|---|---|
| `RULES` | klucz = **nazwa zdolności** | Zdolności powtarzalne między istotami — `Pierwsze spotkanie` (32), `Algorytm czuwania` (11), `Współpraca` (10), `Światłowstręt` (4) |
| `AUTOMATION` | klucz = `"<istota>.<zdolność>"` | Przypadki jednostkowe |

Czego nie obejmie żadna z nich, ląduje jako `feat` z samym tekstem — czytelne na
karcie, nieautomatyczne. **89 z 261 zdolności jest zautomatyzowanych.**

### 11.4 Doktryna: MG w pętli

**Automatyzujemy wykrycie i księgowanie. Nigdy zastosowanie.**

Wyzwalacz odpala się sam i wrzuca kartę z przyciskiem; MG zaznacza żeton ofiary
i klika. Zaznaczenie czytane jest **w momencie kliknięcia**, nie wykrycia, więc MG
może najpierw rozegrać scenę. Dotyczy `combat/crit-riders.mjs` (Palcożerca)
i progu awarii maszyn.

Wyjątek: `combat/pack-tactics.mjs` (Współpraca) stosuje się automatycznie — to czysta
geometria, nie ma tam decyzji do podjęcia.

Natywne `effects` na activity dnd5e **też** spełniają tę doktrynę: karta oferuje
efekt i czeka na kliknięcie MG. Stąd Pochwycenie/Unieruchomienie nie wymagają kodu.

### 11.5 Czego dnd5e nie ma (i gdzie to dopisaliśmy)

| Statystyka | Plik | Uwaga |
|---|---|---|
| **SP ≠ PB** | `actors/sp.mjs` | `npc.mjs:380` wylicza PB z CR. Koń (Skażony) ma PB **+1**, którego 5e w ogóle nie zna. `details.cr` trzyma SP, PB wraca z flagi. |
| **Próg obrażeń** | `combat/bestiary-thresholds.mjs` | W dnd5e istnieje wyłącznie na pojazdach. Broń `ppanc` go ignoruje. |
| **Próg awarii** | `combat/bestiary-thresholds.mjs` | Krytyk lub ≥ próg w jednym ataku → `MACHINE_FAILURES` (k20). |
| **Tchórzliwość** | `combat/bestiary-thresholds.mjs` | Wyłącznie podpowiedź dla MG — nie wymusza zachowania. |
| **Termowizja** | `config/detection-termowizja.mjs` | Schemat `senses` w dnd5e jest zamknięty, więc to prawdziwy DetectionMode na żetonie. Widzi przez Niewidoczność, nie widzi przez ściany. |
| **Typy istot** | `config/creature-types.mjs` | 5 kategorii Bestiariusza zamiast taksonomii fantasy. |

### 11.6 Krew (Splatter)

Kolor idzie do **`prototypeToken.flags.splatter.bloodColor`**, wprost z `BLOOD_TYPES`
w `config/creature-types.mjs`. **Nie** do `details.type.custom` — to pole nadpisuje
wyświetlany typ istoty (każdy potwór miałby na karcie „czerwona"). Override
per-token wygrywa z globalnym `bloodColor` i z `BloodSheetData`.

### 11.7 Grafika

- **Portrety**: zbierane z `worlds/output/characters/<NNN>_-_<NAZWA>/avatar.{png,jpg}`.
  Trafia **23 z 51**; reszta dostaje `icons/svg/mystery-man.svg`. Builder wypisuje listę braków.
- Nazwy folderów są hex-escapowane, a separator i escape to ten sam znak `_` —
  „GANGUS_CAPO" rozjeżdża się, bo `_CA` to poprawny hex. Rozstrzyga poprawność UTF-8.
  Rozbieżności nazw (Jaggernaut, Kidnapper, WILKOLUD) są w `PORTRAIT_ALIASES` — jawnie,
  bo zły portret jest gorszy niż brak portretu.
- **Token art z Roll20 jest świadomie ignorowany.** To okrągłe kadry portretu z Roll20,
  gdzie żetony się nie obracają; FVTT je obraca.
- **Żetony top-down** — cztery warstwy, sprawdzane w tej kolejności (`tokenArtSource`):
  1. `tokens/<id>.webp` → `own` — grafika docelowa. **Najwyższy priorytet celowo**:
     pipeline z assetami wrzuca pliki i one po prostu wygrywają, bez sprzątania
     aliasów i atrap.
  2. `tokens/aliases.json` → `alias` — wskazanie na grafikę już obecną w Data
     (np. `systems/dnd5e/tokens/...`). **21 z 51**.
  3. `tokens/_placeholder/<id>.webp` → `placeholder` — generowana atrapa
     (`npm run build:token-placeholders`). **30 z 51**.
  4. brak → `portrait` — portret w pierścieniu, `lockRotation: true`.

  Cokolwiek z 1–3 **odblokowuje obrót** (`lockRotation: false`) i wyłącza pierścień —
  o to w tym wszystkim chodzi. `bestiary.tokenArtPending` jest prawdą dla wszystkiego
  poza `own`, więc lista „do zrobienia" to jeden filtr po fladze.
- **Wzorzec stylu i wymiarów: `systems/dnd5e/tokens/`** (662 żetony). Zmierzone konwencje:
  400 px na pole siatki, **głowa w dół (południe)**, wypalony cień w prawo-dół,
  wypełnienie 85–99%. 330 z 331 potworów dnd5e ma `lockRotation: false`.
  Szablony: `npm run build:token-templates` → `tokens/_template/`.
- ⚠️ Te żetony to art **Forgotten Adventures** na licencji zabraniającej redystrybucji
  (`systems/dnd5e/tokens/LICENSE`). Wskazywanie ścieżki — OK. Kopiowanie plików do modułu — nie.

### 11.8 Poza kompendium

- **Zombie (Nakładka Death Breath)** — nakładka na nosiciela, nie istota (`overlay: true`).
  Wyłączony z packa; docelowo Active Effect / makro.
- **Mobsprzęt** — podwozie i broń losowane z tabel (`randomized: true`). W packu jest,
  ale z jedną, uśrednioną konfiguracją.

---

## 12. Testy (Quench)

Pełna metodyka: **[TESTING.md](TESTING.md)**. Tutaj minimum operacyjne.

### 12.1 Uruchamianie

```js
game.neuroshima.tests.run()           // wszystko
game.neuroshima.tests.run("choroby")  // filtr po kluczu paczki
game.neuroshima.tests.list()          // co jest zarejestrowane
```

Zwraca `{ total, passed, failed, durationMs, batches, failures[] }` — nadaje się do
odczytania przez CDP, bez zaglądania w UI. Wymaga włączonego modułu `quench`.

`npm test` **nie uruchamia testów** — robi statyczną kontrolę warstwy testowej:
paczka wpięta w `index.mjs`, klucz z prefiksem id modułu, `node --check` na składni.
Ta trzecia rzecz łapie polski `„` zamknięty prostym `"`, którego TypeScript nie zgłasza,
a który wywala import całego `index.mjs` — znikają wtedy wszystkie paczki naraz.

### 12.2 Obowiązek agenta

Dodajesz tabelę danych albo czysty predykat reguł? **Dopisz paczkę.** Konkretnie:

- nowa tabela (broń, pancerz, choroba, Sztuczka, pochodzenie) → asercje na unikalność
  `id`, domknięcie odwołań między tabelami, obecność kluczy w `CONFIG.DND5E`,
  `Roll.validate` na formułach, istnienie ikon;
- nowa funkcja decyzyjna bez efektów ubocznych → wystaw ją przez `export const __testing`
  na końcu pliku i przetestuj tablicę przypadków brzegowych;
- nowa rodzina danych ze stopniami/poziomami → napisz **niezmiennik** („kary nie maleją”),
  nie asercje na konkretne wartości.

Nie testuj: `activity.use()`, przepływów zależnych od `canvas`/celów, dialogów, VFX,
dźwięku, zawartości kompendiów (testuj generator). Uzasadnienie: TESTING.md §4.

### 12.3 Higiena

Testy chodzą w **prawdziwym świecie kampanii**. `scratchActor()` do tworzenia,
`scratchCleanup()` w `after()`, `stub()` do podmiany stanu globalnego z przywróceniem
w `afterEach()`. Wszystko z `scripts/tests/helpers.mjs`.

Dokumenty tymczasowe w dnd5e 5.3 **nie działają** — `prepareData` rzuca w `new HitDice`,
bo `actor.classes` jeszcze nie istnieje. Stąd prawdziwe dokumenty z prefiksem `[Quench]`.

### 12.4 Dwie pułapki, które kosztują czas

- Foundry nie unieważnia cache'u ESM. Po edycji `scripts/**` wymuś
  `fetch(url, { cache: "reload" })`, dopiero potem F5. Inaczej testujesz stary plik.
- Jeśli mocha zgłosi `Mocha instance is currently running tests` — pomaga **wyłącznie F5**.
  `quench.abort()` nie odblokowuje.

## 13. Karta drużyny — blokada łupu, podróż, upływ czasu (2026-08-26)

### 13.1 Pliki

| Plik | Odpowiedzialność |
|---|---|
| `actors/party-sheet.mjs` | Cienka podklasa stockowego `GroupActorSheet` — PARTS, TABS, akcje, `close()` |
| `actors/party-loot-lock.mjs` | Cykl życia blokady łupu (poniżej), baner w Ekwipunku, przyjazne błędy uprawnień |
| `actors/party-travel.mjs` | Tempo/biomy/trudny teren, panel Podróż, guzik zatwierdzenia czasu w czacie |
| `actors/party-supplies.mjs` | Zakładka Zapasy (jedzenie/woda/leki/paliwo) |

### 13.2 Blokada łupu — jak to działa

Ekwipunek grupy (aktor-grupa, **nie** `primaryVehicle`) to wspólny worek na jeszcze
nieprzydzielony łup. Bez reguły to wolna waga za darmo — nic go nie liczy do niczyjego
udźwigu. Reguła stołu: dopóki worek coś zawiera, `game.paused = true` (blokuje ruch
tokenów wszystkim poza MG — natywny mechanizm, zero customowego kodu na canvasie).

- Start/koniec sesji: `createItem`/`deleteItem` na aktorze-grupie, prowadzone wyłącznie
  przez `isActiveGM` (unika wyścigu przy wielu oknach MG).
- `flags.<mod>.lootSession = { active, requiredUserIds, closedBy }` — `requiredUserIds`
  to zrzut właścicieli-graczy żywych członków drużyny, którzy byli online w momencie
  startu. Offline w tym momencie = pomijani automatycznie (nie blokują sesji na zawsze).
- Zamknięcie karty drużyny przez wymaganego gracza = commitment: `confirmLootClose()`
  pyta (`DialogV2.confirm`), po potwierdzeniu zapisuje **tylko własny klucz**
  `closedBy.<userId>` — osobne klucze pod wspólną flagą mergują się bez wyścigu przy
  jednoczesnych zapisach różnych klientów.
- Wszyscy zamknęli (albo worek naturalnie opustoszał) → GM kasuje resztę, zdejmuje
  flagę, `game.togglePause(false)`.
- MG ma ręczny override (`forceEndLootSession`) na wypadek gracza offline/AFK.
- API: `isLootLocked(actor)`, `lootLockContext(actor)` (do szablonów),
  `confirmLootClose(actor)`, `forceEndLootSession(actor)`.

**Wymóg wdrożeniowy**: gracze muszą mieć permisję **Owner** na aktorze-grupie (żeby w
ogóle mogli przeciągać itemy do swojego ekwipunku i zapisać własne „zamknięte") — to
osobne ustawienie w Configure Ownership, moduł tego nie ustawia automatycznie.

### 13.3 Upływ czasu podróży

`postTravelSummary()` nie przesuwa `game.time` automatycznie — tylko dolicza do karty
czatu guzik **„Zatwierdź upływ czasu (Xh)"** z realną liczbą sekund w `data-sekundy`.
MG klika, gdy uzna, że drużyna faktycznie doszła (po scenkach/encounterach po drodze),
`game.time.advance()` przesuwa świat, karta dopisuje `przed → po` z `game.time.calendar`.
Gracz klikający dostaje `ui.notifications.warn`, nie cichy no-op — `game.time.advance`
zapisuje world setting, do którego gracz i tak nie ma uprawnień.

Guard: `postTravelSummary` odmawia, jeśli `isLootLocked(actor)` albo
`game.paused && !game.user.isGM` (pauza z dowolnego innego powodu też blokuje graczy;
MG może obejść oba celowo).

Zobacz też ARCHITECTURE.md §9 — dwie pułapki ApplicationV2, na które trafiono przy
budowie tego podsystemu (hook per-subklasa, `makeDefault` per-klient, wstrzykiwanie DOM
do systemowego CSS gridu, bubble-vs-capture przy customowych guzikach w czacie).
