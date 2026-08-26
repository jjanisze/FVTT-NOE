/**
 * Neuroshima 5e — statyczna kontrola warstwy testowej.
 *
 * Same testy chodzą w przeglądarce (Quench), więc `npm test` nie może ich uruchomić.
 * Może za to sprawdzić rzeczy, które w przeglądarce psują się po cichu:
 *
 *   1. paczka nie wpięta w `index.mjs` — plik istnieje, testów nie ma i nikt tego nie widzi,
 *   2. klucz paczki bez prefiksu id modułu — Quench odrzuca rejestrację i tylko loguje błąd,
 *   3. błąd składni — najczęściej polski cudzysłów zamknięty prostym `"`, którego TypeScript
 *      nie zgłasza, a przeglądarka wywala `SyntaxError` i cały moduł testów nie ładuje się wcale.
 *
 * Uruchomienie: `npm test`
 */

import { readdirSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const MODULE_ID = "neuroshima-2026-overrides";
const TESTS_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "scripts", "tests");

const problems = [];
const note = (file, message) => problems.push(`${file}: ${message}`);

const allFiles = readdirSync(TESTS_DIR).filter(name => name.endsWith(".mjs"));
const files = allFiles.filter(name => name.endsWith(".test.mjs"));
const index = readFileSync(join(TESTS_DIR, "index.mjs"), "utf8");

for (const file of allFiles) {
  try {
    execFileSync(process.execPath, ["--check", join(TESTS_DIR, file)], { stdio: "pipe" });
  } catch (err) {
    const detail = String(err.stderr ?? err.message).split("\n").find(line => line.includes("Error")) ?? "";
    note(file, `błąd składni — ${detail.trim()}`);
  }
}

for (const file of files) {
  const source = readFileSync(join(TESTS_DIR, file), "utf8");

  if (!index.includes(`./${file}`)) note(file, "nie jest zaimportowana w index.mjs");

  const registrars = [...source.matchAll(/export function (register\w*Tests)\b/g)].map(m => m[1]);
  if (!registrars.length) note(file, "brak eksportowanej funkcji register*Tests");
  for (const registrar of registrars) {
    if (!index.includes(`${registrar}(quench)`)) note(file, `${registrar}() nie jest wywoływana w index.mjs`);
  }

  for (const [, key] of source.matchAll(/registerBatch\(\s*`([^`]+)`/g)) {
    if (!key.startsWith("${MODULE_ID}.") && !key.startsWith(`${MODULE_ID}.`)) {
      note(file, `klucz paczki "${key}" nie zaczyna się od id modułu — Quench go odrzuci`);
    }
  }
}

if (!files.length) note("scripts/tests", "nie znaleziono żadnego pliku *.test.mjs");

if (problems.length) {
  console.error(`Warstwa testowa — ${problems.length} problem(ów):`);
  for (const problem of problems) console.error(`  ✘ ${problem}`);
  console.error("\nSame testy uruchom w Foundry: game.neuroshima.tests.run()");
  process.exit(1);
}

console.log(`Warstwa testowa OK — ${files.length} paczek wpiętych w index.mjs.`);
console.log("Uruchomienie testów: w konsoli Foundry `game.neuroshima.tests.run()` albo okno Quench.");
