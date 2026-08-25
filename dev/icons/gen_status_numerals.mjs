/**
 * Skleja ikony poziomów stanów z assetów dnd5e, wpalając w cyfrę rzymską kolor stanu
 * z `scripts/config/state-colors.mjs`.
 *
 * Wynik:
 *   icons/statuses/zranienie-1..4.svg     sylwetka `bloodied.svg`   + cyfra w kolorze Zranienia
 *   icons/statuses/wyczerpanie.svg        kopia `exhaustion.svg`    (poziom 0, bez cyfry)
 *   icons/statuses/wyczerpanie-1..6.svg   kopia `exhaustion-N.svg`  + cyfra przemalowana
 *
 * ## Dlaczego w ogóle własne pliki
 *
 * dnd5e pokazuje poziom stanu wyłącznie przez podmianę pliku ikony —
 * `ActiveEffect5e._getExhaustionImage()` dokleja `-N` do ścieżki, a numer jest wrysowany
 * w plik jako druga ścieżka (`id="Numeral"`). Runtime nic tu nie zdziała: rdzeń rysuje na
 * żetonie sam `effect.img` (`Token#_drawEffect`), a że tekstura idzie do PIXI, to zmienne
 * CSS w SVG się nie rozwiną i koloru też nie da się podać z zewnątrz.
 *
 * Wyczerpanie nie wymaga przez to nadpisania kodu dnd5e: `_getExhaustionImage()` buduje
 * ścieżkę z `CONFIG.DND5E.conditionTypes.exhaustion.img`, więc wystarczy wskazać tam nasz
 * plik bazowy i system sam pójdzie po nasz komplet.
 *
 * Cyfry są **kopiowane** z dnd5e, nie rysowane od nowa — wszystkie stany mają wyglądać
 * jak jeden zestaw, różniąc się tylko barwą.
 *
 * Uruchomienie: `npm run build:status-icons`
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { STATE_COLORS } from "../../scripts/config/state-colors.mjs";

const SYSTEM_DIRS = [
  "C:/Users/archo/AppData/Local/FoundryVTT/Data/systems/dnd5e/icons/svg/statuses",
  "C:/Git/fvtt-dnd5e/icons/svg/statuses"
];

const OUT_DIR = path.resolve(fileURLToPath(new URL("../../icons/statuses", import.meta.url)));
const ZRANIENIE_LEVELS = 4;
const WYCZERPANIE_LEVELS = 6;

/** Kolor, którym dnd5e maluje cyfrę we własnych plikach — punkt zaczepienia przemalowania. */
const DND5E_NUMERAL = "#c70000";
/** `bloodied.svg` ma viewBox 512, cyfry z `exhaustion-N.svg` — 1866.7. */
const BLOODIED_SCALE = 1866.7 / 512;

const BANNER = "<!-- Generowane przez dev/icons/gen_status_numerals.mjs — nie edytuj recznie. -->";

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

function write(name, svg) {
  fs.writeFileSync(path.join(OUT_DIR, name), Buffer.from(svg, "utf8"));
  console.log(name);
}

function extract(svg, re, what, file) {
  const m = svg.match(re);
  if (!m) {
    console.error(`Nie wyciagnalem ${what} z ${file} — dnd5e zmienilo format ikony.`);
    process.exit(1);
  }
  return m[0];
}

/** Przemalowanie cyfry. Twarde sprawdzenie, bo cicha porazka dalaby ikone w kolorze dnd5e. */
function recolor(numeral, color, file) {
  if (!numeral.includes(DND5E_NUMERAL)) {
    console.error(`Cyfra w ${file} nie ma juz ${DND5E_NUMERAL} — dnd5e zmienilo paleta ikon.`);
    process.exit(1);
  }
  return numeral.replaceAll(DND5E_NUMERAL, color);
}

const dir = systemDir();
fs.mkdirSync(OUT_DIR, { recursive: true });

/* ---- Zranienie: sylwetka z jednego pliku, cyfra z drugiego ---- */

const bloodiedPath = extract(read(dir, "bloodied.svg"), /<path\b[^>]*\/?>(?:<\/path>)?/, "sylwetki", "bloodied.svg");

for (let level = 1; level <= ZRANIENIE_LEVELS; level++) {
  const src = `exhaustion-${level}.svg`;
  const numeral = recolor(
    extract(read(dir, src), /<path id="Numeral"[^>]*\/?>(?:<\/path>)?/, "cyfry", src),
    STATE_COLORS.zranienie, src);

  write(`zranienie-${level}.svg`, `<?xml version="1.0" encoding="UTF-8"?>
${BANNER}
<svg width="512" height="512" version="1.1" viewBox="0 0 1866.7 1866.7" xmlns="http://www.w3.org/2000/svg">
<g transform="scale(${BLOODIED_SCALE.toFixed(5)})">${bloodiedPath}</g>
${numeral}
</svg>
`);
}

/* ---- Wyczerpanie: całe pliki dnd5e, zmieniona tylko barwa cyfry ---- */

write("wyczerpanie.svg", read(dir, "exhaustion.svg").replace("<svg", `${BANNER}\n<svg`));

for (let level = 1; level <= WYCZERPANIE_LEVELS; level++) {
  const src = `exhaustion-${level}.svg`;
  const svg = recolor(read(dir, src), STATE_COLORS.wyczerpanie, src);
  write(`wyczerpanie-${level}.svg`, svg.replace("<svg", `${BANNER}\n<svg`));
}
