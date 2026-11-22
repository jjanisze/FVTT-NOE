# Hand-off — Ekwipunek: ikony, aliasy broni, audyt kompletności

Napisane 2026-08-29 przez poprzedniego agenta, po `v0.14.20` (commit — patrz `git log -1`
w chwili czytania tego pliku; ten dokument został scalony w tym samym commicie co reszta
sesji, więc `git log` na `HANDOFF_ekwipunek.md` samym w sobie nic dodatkowego nie powie).
Wszystko poniżej jest **zweryfikowane na żywym świecie** (Chrome DevTools MCP), nie
zgadywane. Nie odkrywaj tego ponownie.

---

## 1. Co jest zamknięte — nie zaczynaj od nowa

- **Cały katalog Chemii (35 pozycji) ma teraz realną ikonę**, nie generyczny fallback
  rdzenia Foundry. Regresja tej klasy bugów ma teraz test: `dane-ekwipunku` →
  „Chemia" → „każda pozycja ma własną ikonę". Jeśli kiedyś zobaczysz `icons/svg/pill.svg`
  na karcie leku, to **nowy** przypadek, nie nawrót starego.
- **`WEAPON_NAME_ALIASES`** (`weapons-data.mjs`) ma teraz wpisy dla H&K G3, M1 Garand,
  38-ka, Browning M2 (z trójnogiem), FN Minimi (taśma XXL) — zobacz DEV_GUIDE.md §14.2
  zanim uznasz kolejne „broń X nie działa" za nowy, egzotyczny bug. Sprawdź najpierw, czy
  to po prostu kolejny brakujący alias.
- **`game.neuroshima.inventoryAudit.auditItemCompleteness()`** istnieje i działa —
  read-only na zawsze (patrz DEV_GUIDE.md §14.3, dlaczego nigdy nie dostanie `repair*`).
  Pierwszy przebieg party-wide (56→30 realnych trafień) już rozliczony, patrz
  IMPLEMENTATION.md v0.14.20 dla pełnej listy co naprawiono i co świadomie zostawiono.
- Testy: 149/149 (`game.neuroshima.tests.run()` w konsoli Foundry, albo okno Quench).

## 2. Co jest OTWARTE — nie moje, nie ruszone w tej sesji

Znalezione po drodze, świadomie nietknięte (poza zakresem tego, o co proszono):

- **`PLAN_toolkits.md`, sekcja „Follow-up — native dnd5e UI parity"**: `nativeCheck: true`
  (przełącza generyczny `check` na natywny UI dnd5e z poprawnym rollerem) jest wdrożone
  tylko dla **kowala**, jako „vertical slice". Plan explicite mówi: powtórz dla
  pozostałych 21 zestawów narzędziowych, gdy kowal zostanie zweryfikowany na żywo, potem
  wygaś `items/toolkit-check.mjs`. Nie sprawdzałem, czy kowal został już zweryfikowany —
  zacznij od przeczytania całej tej sekcji planu, nie tylko tego akapitu.
- **`PLAN_berserk.md`, §6 „Known gap, flagged not fixed"**: czy `Obłęd Berserkera`
  powinien należeć do grupy `unarmoredAc` (nie da się tego dziś rozstrzygnąć strukturalnie
  — `resolveExclusiveGroups()` skanuje tylko pasywne Itemy, a Obłęd to warunkowy bonus AE).
  Flagowane jako „może nie być bugiem", nie naprawione. Dotknij tylko jeśli faktycznie
  wypłynie przy stole (Brutal + Kaznodziej, oboje obecnie w drużynie).
- Cztery pozycje, które `auditItemCompleteness()` dalej zgłasza i **powinny** — to nie
  są przeoczenia: list od Gordona i zdjęcie kobiety (Piekarz/Dante — pamiątki bez
  wartości handlowej), fixture QA na aktorze „Latarnik", Holy Symbol z SRD-owego Priest
  Acolyte (nie treść Neuroshimy). Nie „naprawiaj" tych czterech.

## 3. Środowisko — jeśli od razu wracasz do żywego świata

FoundryVTT działa lokalnie i trzyma blokadę LevelDB — pracuj przez Chrome DevTools MCP
(`ToolSearch` po `mcp__chrome-devtools__*`), nie przez `mcp__foundry-vtt__*` offline.
**Nigdy nie zapisuj portu na sztywno** — wykryj żywą stronę po tytule/URL
(`list_pages`), zgodnie z regułą projektu (`CLAUDE.md`, „No network specifics"). Świeży
kod modułu wymaga pełnego `navigate_page` (`type: "reload"`) — dynamiczny `import()` w tej
samej sesji przeglądarki zwraca stary, zbuforowany moduł, nie plik z dysku.

`item.system.activities` to `Map` (dnd5e `ActivityCollection`), nie zwykły obiekt —
`Object.values()` na nim milcząco zwraca `[]` niezależnie od realnej zawartości. Czytaj
przez `[...collection.values()]`. Zobacz ARCHITECTURE.md §10 — kosztowało to całą serię
niepotrzebnych napraw na żywej broni gracza, zanim się to złapało.

## 4. Stan repo w chwili pisania

`module.json` był 14 wersji za `IMPLEMENTATION.md` (`0.14.6` scommitowane, `0.14.14`
niescommitowane w polu wersji, changelog już przy `0.14.20`) — poprawione w tym samym
commicie co ten plik. Jeśli znów zobaczysz taki rozjazd, zanim zaczniesz nową pracę:
zbierz numer wersji z ostatniego wpisu `IMPLEMENTATION.md` i wpisz go do `module.json`
jako część commitu, nie osobno.

---

**Skasuj ten plik, gdy przestanie być prawdziwy** (konwencja repo, patrz
`ARCHITECTURE.md` → „Dokumentacja towarzysząca") — czyli gdy sekcja 2 się wyczyści albo
zdezaktualizuje, którykolwiek nastąpi pierwszy.
