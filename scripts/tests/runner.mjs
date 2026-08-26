/**
 * Neuroshima 5e — uruchamianie testów Quench z konsoli.
 *
 * Quench ma własne okno (Game Settings → Quench), ale przy pracy przez CDP/konsolę
 * wygodniej jest dostać zwięzły wynik jako obiekt. `game.neuroshima.tests.run()`
 * robi to i po drodze omija dwie pułapki Quencha:
 *
 * 1. `quench.runBatches()` wywala się, gdy okno wyników nigdy nie zostało wyrenderowane
 *    (`_setElementDisabled` czyta `this.element.querySelector` na `undefined`).
 *    Dlatego najpierw `app.render(true)`.
 * 2. Po takim wywale instancja mocha zostaje „zajęta" na stałe — `quench.abort()` tego
 *    nie cofa i jedynym wyjściem jest F5. Stąd `assertIdle()` z jasnym komunikatem
 *    zamiast enigmatycznego „Mocha instance is currently running tests".
 */

import { MODULE_ID } from "./helpers.mjs";

/** @returns {Quench} */
function requireQuench() {
  const quench = globalThis.quench;
  if (!quench) throw new Error("Moduł Quench nie jest włączony — brak globalnego `quench`.");
  return quench;
}

function assertIdle(quench) {
  if (quench._currentRunner?.state === "running") {
    throw new Error("Mocha jest zajęta poprzednim przebiegiem. Quench nie potrafi się z tego "
      + "wygrzebać (`abort()` nie pomaga) — odśwież stronę (F5) i spróbuj ponownie.");
  }
}

/** Klucze paczek zarejestrowanych przez ten moduł. */
export function listBatches() {
  return Array.from(requireQuench()._testBatches.keys()).filter(key => key.startsWith(`${MODULE_ID}.`));
}

/**
 * Odpala paczki tego modułu i zwraca podsumowanie.
 *
 * @param {string} [filter]  Fragment klucza paczki, np. `"choroby"`. Pusty = wszystkie.
 * @returns {Promise<{total: number, passed: number, failed: number, durationMs: number,
 *                    batches: string[], failures: {title: string, error: string}[]}>}
 *
 * @example game.neuroshima.tests.run()            // wszystko
 * @example game.neuroshima.tests.run("ekwipunek") // jedna paczka
 */
export async function runTests(filter = "") {
  const quench = requireQuench();
  assertIdle(quench);

  const batches = listBatches().filter(key => key.includes(filter));
  if (!batches.length) throw new Error(`Żadna paczka nie pasuje do "${filter}". Dostępne: ${listBatches().join(", ")}`);

  await quench.app.render(true);
  const runner = await quench.runBatches(batches);

  const failures = [];
  runner.on("fail", (test, err) => failures.push({
    title: test.fullTitle?.() ?? test.title,
    error: String(err?.message ?? err)
  }));
  if (runner.state !== "stopped") await new Promise(resolve => runner.on("end", resolve));

  const summary = {
    total: runner.stats.tests,
    passed: runner.stats.passes,
    failed: runner.stats.failures,
    durationMs: runner.stats.duration,
    batches,
    failures
  };
  console.log(`${MODULE_ID} | Quench: ${summary.passed}/${summary.total} OK w ${summary.durationMs} ms`,
    summary.failed ? summary.failures : "");
  return summary;
}
