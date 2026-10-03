/**
 * Neuroshima 5e — rejestr pokrycia zdolności klasowych i profesji (PLAN_beta, bramka B5).
 *
 * Ten sam kontrakt co Sztuczki i Pochodzenia (`coverage-ledger.mjs`): każda zdolność niesie
 * `auto: [{what, where}]` i opcjonalne `manual`. Pola mieszkają w danych zdolności — dla
 * podręcznika w generatorze (`dev/classes/gen_features.py`, tabela `COVERAGE`), dla WKK
 * w `wkk/config/class-features-data.mjs` — a tutaj tylko je czytamy. Osobny plik, bo
 * `class-features-data.mjs` jest generowany i nie powinien nosić ręcznego kodu.
 *
 * Plakietka jest wypiekana w opis przedmiotu przez builder paczek (`buildFeature`), więc
 * zmiana wpisu wymaga przebudowy paczki `zdolnosci-klasowe` przy zamkniętym Foundry.
 *
 * Licznik użyć, jego odnawianie i makro na pasku to księgowość, nie automatyka — nie liczą się.
 */

import { CLASS_FEATURES } from "./class-features-data.mjs";
import { createCoverageLedger } from "./coverage-ledger.mjs";

const LEDGER = createCoverageLedger({
  entries: CLASS_FEATURES,
  cssPrefix: "neuro-zdolnosc",
  noneHtml: "<strong>Bez automatyki efektu.</strong> Rozstrzyga MG przy stole.",
  title: "Zdolności klasowe i profesji"
});

/**
 * Ile z jednej zdolności system naprawdę egzekwuje.
 * @param {string} id  Klucz w `CLASS_FEATURES`.
 * @returns {"auto"|"partial"|"none"}
 */
export const featureStatus = LEDGER.status;

/** Plakietka doklejana do opisu przedmiotu przez builder paczek. */
export const featureCoverageHtml = LEDGER.html;

/** Cały rejestr: `{auto, partial, none}` — tablice kluczy. */
export const featuresCoverage = LEDGER.coverage;

/** Publiczne API — `game.neuroshima.zdolnosci.report()` wypisuje, co zostaje na głowie MG. */
export const zdolnosciApi = {
  all: CLASS_FEATURES,
  status: featureStatus,
  coverage: featuresCoverage,
  report: LEDGER.report
};
