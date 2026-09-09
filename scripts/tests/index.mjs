/**
 * Neuroshima 5e — rejestracja paczek testowych Quench.
 *
 * Quench (`quench`, moduł opcjonalny) odpala mocha + chai wewnątrz Foundry. Paczki
 * rejestrujemy w haku `quenchReady`, więc bez zainstalowanego Quencha ten plik nic nie robi.
 *
 * Klucz paczki MUSI zaczynać się od identyfikatora modułu — inaczej Quench odmawia
 * rejestracji i wypisuje błąd do konsoli.
 *
 * Zasady, których trzymają się tutejsze testy (pełny opis: `TESTING.md`):
 *   • żadnych zmian w stanie świata, które przetrwają test — wszystko sprząta `scratchCleanup()`,
 *   • żadnego tworzenia walk ani przełączania scen — stan globalny podstawiamy przez `stub()`,
 *   • żadnego `activity.use()` — dialogi i karty czatu to nie jest miejsce na asercje.
 *
 * Dodając nową paczkę: plik `<obszar>.test.mjs` z funkcją `register*Tests(quench)`,
 * import poniżej, wpis w `registerQuenchTests()`. `npm test` pilnuje, żeby nic się nie zgubiło.
 */

import { registerSztuczkiDataTests } from "./sztuczki-data.test.mjs";
import { registerSztuczkiBridgeTests } from "./sztuczki-bridge.test.mjs";
import { registerSztuczkiCombatTests } from "./sztuczki-combat.test.mjs";
import { registerConfigTests } from "./config.test.mjs";
import { registerEquipmentDataTests } from "./ekwipunek-dane.test.mjs";
import { registerDiseaseTests } from "./choroby.test.mjs";
import { registerAmmoTests } from "./amunicja.test.mjs";
import { registerPartyTests } from "./party.test.mjs";
import { runTests, listBatches } from "./runner.mjs";

export function registerQuenchTests() {
  Hooks.on("quenchReady", quench => {
    registerConfigTests(quench);
    registerEquipmentDataTests(quench);
    registerDiseaseTests(quench);
    registerAmmoTests(quench);
    registerPartyTests(quench);
    registerSztuczkiDataTests(quench);
    registerSztuczkiBridgeTests(quench);
    registerSztuczkiCombatTests(quench);
    console.log("Neuroshima 5e | Quench batches registered");
  });
}

/** Wystawiane w `ready` jako `game.neuroshima.tests`. */
export const testsApi = { run: runTests, list: listBatches };
