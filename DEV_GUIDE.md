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
6. **Testowanie**: informuj użytkownika żeby odświeżył FVTT (`F5`)

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
