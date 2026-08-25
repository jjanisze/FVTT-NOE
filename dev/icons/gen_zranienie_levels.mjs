/**
 * Skleja `icons/statuses/zranienie-1..4.svg` z dwóch assetów dnd5e:
 * sylwetki `bloodied.svg` i czerwonej cyfry rzymskiej z `exhaustion-N.svg`.
 *
 * dnd5e pokazuje poziom Wyczerpania wyłącznie przez podmianę pliku ikony —
 * `_getExhaustionImage()` dokleja `-N` do ścieżki, a numer jest wrysowany
 * w plik jako druga ścieżka (`id="Numeral"`, `fill="#c70000"`). Żeby Zranienie
 * wyglądało tak samo, musi mieć własny komplet plików; nie da się tego zrobić
 * runtime'owo, bo rdzeń rysuje na żetonie sam `effect.img`.
 *
 * Cyfry są kopiowane z dnd5e, a nie rysowane od nowa — mają być identyczne.
 *
 * Uruchomienie: `npm run build:zranienie-icons`
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SYSTEM_DIRS = [
  "C:/Users/archo/AppData/Local/FoundryVTT/Data/systems/dnd5e/icons/svg/statuses",
  "C:/Git/fvtt-dnd5e/icons/svg/statuses"
];

const OUT_DIR = path.resolve(fileURLToPath(new URL("../../icons/statuses", import.meta.url)));
const LEVELS = 4;

/** `bloodied.svg` ma viewBox 512, cyfry z `exhaustion-N.svg` — 1866.7. */
const BLOODIED_SCALE = 1866.7 / 512;

function systemDir() {
  const found = SYSTEM_DIRS.find(d => fs.existsSync(path.join(d, "bloodied.svg")));
  if (!found) {
    console.error("Nie znalazlem ikon dnd5e. Sprawdzone sciezki:\n  " + SYSTEM_DIRS.join("\n  "));
    process.exit(1);
  }
  return found;
}

function read(dir, name) {
  return fs.readFileSync(path.join(dir, name), "utf8");
}

function extract(svg, re, what, file) {
  const m = svg.match(re);
  if (!m) {
    console.error(`Nie wyciagnalem ${what} z ${file} — dnd5e zmienilo format ikony.`);
    process.exit(1);
  }
  return m[0];
}

const dir = systemDir();
const bloodiedPath = extract(read(dir, "bloodied.svg"), /<path\b[^>]*\/?>(?:<\/path>)?/, "sylwetki", "bloodied.svg");

fs.mkdirSync(OUT_DIR, { recursive: true });

for (let level = 1; level <= LEVELS; level++) {
  const src = `exhaustion-${level}.svg`;
  const numeral = extract(read(dir, src), /<path id="Numeral"[^>]*\/?>(?:<\/path>)?/, "cyfry", src);

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<!-- Generowane przez dev/icons/gen_zranienie_levels.mjs — nie edytuj recznie. -->
<svg width="512" height="512" version="1.1" viewBox="0 0 1866.7 1866.7" xmlns="http://www.w3.org/2000/svg">
<g transform="scale(${BLOODIED_SCALE.toFixed(5)})">${bloodiedPath}</g>
${numeral}
</svg>
`;

  fs.writeFileSync(path.join(OUT_DIR, `zranienie-${level}.svg`), Buffer.from(svg, "utf8"));
  console.log(`zranienie-${level}.svg`);
}
