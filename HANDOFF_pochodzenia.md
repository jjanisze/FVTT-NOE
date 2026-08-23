# HANDOFF — po v0.13.0 (Pochodzenia)

> Stan na 2026-08-23. Kasuj ten plik, gdy jego zawartość przestanie być prawdziwa —
> `ARCHITECTURE.md` opisuje `HANDOFF_*.md` jako dokument jednorazowy.

## Co właśnie zostało domknięte

Warstwa Pochodzeń jest kompletna i **zweryfikowana na żywej instancji** (Chrome DevTools, FVTT 14.360):

- Packi `pochodzenia` (12 itemów `background`) i `zdolnosci-pochodzenia` (36 `feat`ów).
- Advancementy przechodzą pełny cykl: nałożenie → `_source` cech rośnie o +1/+1 → zdjęcie → cofa się co do punktu.
- Krok `ItemChoice` pokazuje trzy zdolności właściwego regionu, nie wszystkie 36.
- 13 postaci zmigrowanych (`api.migration.migratePochodzenia`), cechy na kartach bez zmian,
  zero ręcznych duplikatów feat'ów w świecie.
- Rejestr automatyki wyodrębniony do `scripts/config/coverage-ledger.mjs` — HTML w packach
  bit w bit taki sam jak przed refaktorem (sprawdzone: 89 opisów).

Szczegóły i uzasadnienia decyzji: `IMPLEMENTATION.md` § Changelog v0.13.0.
Instrukcja obsługi pipeline'u: `DEV_GUIDE.md` §10d.

## Czego NIE ruszaj bez przeczytania

1. **`ARCHITECTURE.md` §7** — advancementy da się poprawnie nakładać i cofać **tylko** przez UI
   `AdvancementManager`. `advancement.apply()` i `deleteEmbeddedDocuments()` wywołane wprost
   cicho nic nie robią / nic nie cofają. Kosztowało to jedno fałszywie udane podejście do testów.
2. **Packi to artefakty builda.** Każda zmiana treści w `scripts/config/*-data.mjs` wymaga
   `npm run build:classes` przy **zamkniętym FoundryVTT**.
3. **`registerPochodzeniaMigration()` musi iść po `registerClassMigration()`** w `main.mjs` —
   to drugie podmienia całe `api.migration`, zamiast dopisywać do niego.

## Stan repozytorium — wymaga decyzji MG

`git status` pokazuje **ponad 100 zmian bez commita**, sięgających wstecz do v0.9.6
(ostatni commit: `97ef382`). To nie jest robota tej sesji — narosło przez kilka wersji.
Jest tam m.in. cała warstwa `party-sheet`, `armor`, `chemia`, `podroz` i sześć nowych packów.

**Nie commitowałem tego** — zakres jest zbyt duży i nie mój. Ktoś powinien to przejrzeć
i pociąć na sensowne commity, zanim narośnie dalej.

## Zaległości po Pochodzeniach

- **35 z 36 zdolności bez mechaniki.** Sporo z nich to zwykłe biegłości i Ułatwienia
  (`Edukacja`, `Górnik z dziada pradziada`, `Człowiek-aligator`) — nadają się na `Trait`
  advancement wprost na przedmiocie zdolności, bez żadnego kodu. `Fart`, `Telepata`, `Wierzę`
  są narracyjne z założenia i nie dostaną automatyki nigdy.
- **`npm run validate:packs` nie było uruchomione po refaktorze** — LevelDB było zajęte przez
  działającą grę. Uruchom przy zamkniętym FVTT. Ostatni znany wynik: `all checks passed`,
  180 advancementów, zero wiszących UUID-ów.
- **6 pustych szablonów po Roll20** (`Adam`, `Bob`, `Droer Quiyusti`, `Meksyk`, `Przydupas`,
  `Rish Scerki`) — jeden placeholder klasy, wszystkie cechy 10. Do skasowania albo do zbudowania.
  Migracja Pochodzeń je świadomie pomija.

## Następne w kolejce (z `IMPLEMENTATION.md`)

Nic nie jest zadeklarowane jako „następne". Otwarte i duże:

| Faza | Pozycja |
|---|---|
| 1 | Zaskoczenie / Niespodziewany atak → modyfikatory inicjatywy |
| 1 | Odepchnięcie, Pochwycenie, Wytrącenie jako opcje ataku |
| 2 | Progi udźwigu (SIŁ×5 / SIŁ×10 kg), przedmioty podręczne |
| 3 | Grafika bestiariusza — 30 z 51 istot wciąż bez artu |
| 4 | Zagrożenia środowiskowe jako pełne mechaniki (dziś same statusy) |
| 5 | Ikony pancerzy — `icons/armor/<id>.svg` to ścieżki bez plików |

## Sanity check na start

```js
// w konsoli GM przy uruchomionej grze
game.modules.get("neuroshima-2026-overrides").version;   // 0.13.0
game.neuroshima.pochodzenia.report();                     // 1/36
game.neuroshima.sztuczki.report();                        // 6/53
await game.modules.get("neuroshima-2026-overrides").api.migration.migratePochodzenia();
// oczekiwane: same „pominięto" — nie ma już czego migrować
```

```powershell
# przy ZAMKNIĘTYM FoundryVTT
cd $env:LOCALAPPDATA\FoundryVTT\Data\modules\neuroshima-2026-overrides
npm run validate:packs
npm run validate:css
```
