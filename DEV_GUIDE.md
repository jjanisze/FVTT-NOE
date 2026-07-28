# Neuroshima Overrides — Developer & Agent Guide

> Przewodnik operacyjny: jak efektywnie rozwijać moduł `neuroshima-2026-overrides` z poziomu Copilota i agentów.

---

## 1. Środowisko — co mamy

### Wersje

| Komponent | Wersja | Uwagi |
|-----------|--------|-------|
| FoundryVTT | 14.360 | Stable, coreVersion w world.json |
| dnd5e | 5.3.0 (installed) / 5.3.2 (latest) | Compiled bundle `dnd5e.mjs` ~2.8 MB |
| Node.js | 18+ wymagany | Przez foundry-mcp i ewentualny build pipeline |
| Moduł | 1.0.0 | Placeholder — init hook + CSS filter |

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
├── module.json              # Manifest — DO AKTUALIZACJI (compatibility stale)
├── scripts/
│   └── main.js              # Entry point (esmodule)
├── styles/
│   └── neuroshima.css        # Stylesheet
├── dev/
│   └── validate-css.mjs     # Structural CSS validator (patrz 2.5) — uruchamiaj po KAŻDEJ ręcznej edycji neuroshima.css
├── neuroshima_5e_modifications.md  # Plan nadpisań
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

## 4. Co trzeba zainstalować / skonfigurować

### 4.1 Wymagania natychmiastowe (Phase 1 MVP)

| Co | Dlaczego | Status |
|----|----------|--------|
| Node.js 18+ | Build tools, MCP, ewentualne testy | ✅ Prawdopodobnie jest (foundry-mcp działa) |
| Git | Version control modułu | ✅ Workspace jest w Git |
| Foundry CLI (`foundryvtt`) | `npm i -g @foundryvtt/foundryvtt-cli` — pack/unpack compendia | ❌ Do zainstalowania |
| Source map support | Debugowanie dnd5e.mjs | ✅ .map jest w systemie |

### 4.2 Rekomendowany build pipeline

Moduł powinien mieć minimalny build:

```
neuroshima-2026-overrides/
├── package.json              # npm scripts: build, watch, lint
├── vite.config.js            # lub rollup — bundling ESM
├── src/                      # Źródło TypeScript/JS
│   ├── module.mjs            # Hooks.once('init', ...) entry
│   ├── config/               # CONFIG.DND5E overrides
│   │   ├── skills.mjs
│   │   ├── tools.mjs
│   │   ├── damage-types.mjs
│   │   └── conditions.mjs
│   ├── sheets/               # Custom sheet classes
│   │   ├── neuroshima-character-sheet.mjs
│   │   └── neuroshima-npc-sheet.mjs
│   ├── combat/               # Combat pipeline hooks
│   │   ├── attack-hooks.mjs  # Nat 1 jam, critical → Zranienie
│   │   ├── fire-modes.mjs    # P, KS, DS, OZ
│   │   └── ammo.mjs          # Magazine logic
│   ├── mechanics/            # Neuroshima-specific subsystems
│   │   ├── zranienie.mjs
│   │   ├── wyczerpanie.mjs
│   │   ├── forsowanie.mjs
│   │   └── oslona.mjs
│   ├── lang/                 # Localization
│   │   └── pl.json           # Polish labels
│   └── templates/            # Handlebars partials
│       ├── actors/
│       └── items/
├── styles/
│   └── neuroshima.css
└── module.json
```

**Dlaczego build pipeline?**
- TypeScript/JSDoc type checking against FoundryVTT types
- Multiple source files → single ESM bundle
- Hot reload during development (Vite)
- Łatwiejsze zarządzanie templateami i lokalizacją

**Alternatywa: NO BUILD** (prostsze, ale mniej skalowalne):
- Wiele `.mjs` plików w `scripts/`, importowanych bezpośrednio
- module.json listuje jeden entry point, który importuje resztę
- Brak type checking, ale szybszy start

### 4.3 Typy FoundryVTT

```bash
npm install --save-dev @league-of-foundry-developers/foundry-vtt-types
# lub: @foundryvtt/types (official, jeśli dostępne)
```

Albo: JSDoc + ręczne `@type` annotations z referencją do API docs.

### 4.4 Aktualizacja module.json

**NATYCHMIAST** — obecny manifest jest stale:

```json
{
  "compatibility": { "minimum": "11", "verified": "12" }
  // ↑ FVTT jest na v14!
  
  "relationships": {
    "systems": [{ "id": "dnd5e", "version": "3.0.0" }]
    // ↑ dnd5e jest na v5.3.0!
  }
}
```

Powinno być:
```json
{
  "compatibility": { "minimum": "14", "verified": "14" },
  "relationships": {
    "systems": [{ "id": "dnd5e", "type": "system", "compatibility": { "minimum": "5.0.0", "verified": "5.3.0" } }]
  }
}
```

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
6. **Testowanie**: informuj użytkownika żeby odświeżył FVTT (`F5`)

---

## 6. Co trzeba zbudować / kupić / skonfigurować

### 6.1 Narzędzia do zainstalowania

| Narzędzie | Komenda | Cel |
|-----------|---------|-----|
| Foundry CLI | `npm i -g @foundryvtt/foundryvtt-cli` | Pack/unpack compendia, scaffolding |
| Vite (opcjonalnie) | `npm i -D vite` | Build pipeline, hot reload |
| FoundryVTT Types | `npm i -D @league-of-foundry-developers/foundry-vtt-types` | Type checking |
| ESLint | `npm i -D eslint` | Linting |

### 6.2 Narzędzia do zbudowania (custom)

| Narzędzie | Cel | Priorytet |
|-----------|-----|-----------|
| **Localization generator** | Skrypt generujący `pl.json` z kluczy dnd5e `en.json` + Neuroshima terminologia | Phase 1 |
| **Config diff tool** | Porównuje aktualny `CONFIG.DND5E` z targetem Neuroshimy — raportuje co już nadpisane, co brakuje | Phase 1 |
| **Compendium builder** | Skrypt generujący JSON entries dla broni, amunicji, narzędzi z danych w `Tabele/` | Phase 2 |
| **Sheet data validator** | Sprawdza czy flagi modułu na aktorach mają poprawną strukturę | Phase 2 |

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
