/**
 * Neuroshima 5e — walidacja przepisów produkcji (`npm run validate:recipes`, PLAN_produkcja §5.1).
 *
 * Sam import `scripts/config/recipes-data.mjs` już sprawdza składnię wyrażeń narzędzi,
 * surowców i duplikaty (rzuca). Tu dochodzą rzeczy, które w przeglądarce psują się po cichu:
 *
 *   BŁĘDY (exit 1)
 *   - wiersz tabeli RAW wskazuje nieistniejący wpis katalogu,
 *   - nadpisanie (`NADPISANIA`) dla wpisu, którego nie ma — literówka w kluczu wyłącza je bez słowa,
 *   - zaślepka przekierowana na nieistniejący cel,
 *   - przepis bez żadnych surowców przy wartości ≥ 2 gb (przedmiot z niczego).
 *
 *   OSTRZEŻENIA
 *   - przepis profesji gorszy od standardowego (§5.1b) — w module nie szkodzi, bo lista
 *     wybiera lepszy; to materiał dla autora (`docs/Errata-produkcja.md`).
 *
 *   INFORMACJE
 *   - braki w katalogach: cele `raw:` / `tabela:` i zaślepki bez ceny — zadania, nie błędy,
 *   - wpisy świadomie nieprodukowalne.
 *
 * `--szczegoly` wypisuje też zgodność każdego wiersza tabel ze wzorem.
 */

import {
  KATALOG, PRZEPISY_STANDARDOWE, PRZEPISY_PROFESJI, PRZEPISY_ELABORACJI, LISTA_PROFESJI, __testing as R
} from "../scripts/config/recipes-data.mjs";
import { budzetSurowcow, standardoweMinuty, stZWartosci, sumaGb, fmtGGMM } from "../scripts/config/production-rules.mjs";
import { productionGearIdForRef } from "../scripts/items/production-gear.mjs";

const verbose = process.argv.includes("--szczegoly");
const errors = [];
const warnings = [];
const err = m => errors.push(m);
const warn = m => warnings.push(m);

/* ---- odwołania ---- */

const allRows = [
  ...Object.entries(R.TABELE).flatMap(([t, rows]) => rows.map(r => ({ t, r }))),
  ...R.ELABORACJA.map(r => ({ t: "elaboracja", r }))
];
for (const { t, r } of allRows) {
  if (!KATALOG.has(r.ref)) {
    const hint = r.ref.startsWith("tabela:") ? " (brak definicji w TABELA_BEZ_CENY)" : "";
    err(`${t}: „${r.nazwa}” → ${r.ref} nie istnieje w KATALOG${hint}`);
  }
}
for (const ref of Object.keys(R.NADPISANIA)) {
  if (!KATALOG.has(ref)) err(`NADPISANIA: ${ref} — nie ma takiego wpisu (literówka wyłącza nadpisanie bez słowa)`);
}
for (const [id, z] of Object.entries(R.ZASLEPKI)) {
  if (z.zamiast && !KATALOG.has(z.zamiast)) err(`ZASLEPKI: ${id} → ${z.zamiast} nie istnieje`);
}

for (const k of KATALOG.values()) {
  if (typeof k.nazwa !== "string" || !k.nazwa.trim()) err(`${k.ref}: brak nazwy (inne pole w pliku danych?)`);
  if (!Number.isFinite(k.cena)) err(`${k.ref}: cena nie jest liczbą`);
}

/* ---- surowce ---- */

const all = [...PRZEPISY_STANDARDOWE.values(), ...PRZEPISY_PROFESJI.values(), ...PRZEPISY_ELABORACJI.values()];
for (const p of all) {
  // D37: nic z niczego — przedmiot za 1 gb robi się partią (`partiaMinimalna`), nie za darmo.
  if (sumaGb(p.surowce) <= 0) err(`${p.id}: wartość ${p.wartosc} gb, a surowców zero`);
}

/* ---- audyt: profesja vs standard (§5.1b) ---- */

const gorszeWeWszystkim = [];
const gorszeWCzesci = [];
const niezgodneZeWzorem = [];
for (const p of [...PRZEPISY_PROFESJI.values(), ...PRZEPISY_ELABORACJI.values()]) {
  if (p.wynik.ref.startsWith("tabela:")) continue; // cena wyprowadzona z tego wiersza — z definicji zgodny
  const std = {
    min: standardoweMinuty(p.wartosc, p.jednorazowy),
    gb: budzetSurowcow(p.wartosc),
    st: stZWartosci(p.wartosc)
  };
  const t = { min: p.minuty, gb: sumaGb(p.surowce), st: p.st };
  const gorsze = ["min", "gb", "st"].filter(k => t[k] > std[k]);
  const lepsze = ["min", "gb", "st"].filter(k => t[k] < std[k]);
  const opis = `${p.id} — tabela ${fmtGGMM(t.min)} / ${t.gb} gb / ST ${t.st}, `
    + `standard ${fmtGGMM(std.min)} / ${std.gb} gb / ST ${std.st} (wartość ${p.wartosc} gb)`;
  if (gorsze.length === 3) gorszeWeWszystkim.push(opis);
  else if (gorsze.length && !lepsze.length) gorszeWCzesci.push(`${opis} [gorsze: ${gorsze.join(", ")}]`);
  if (gorsze.length || lepsze.length) niezgodneZeWzorem.push(`${opis} [${gorsze.map(g => "+" + g).concat(lepsze.map(l => "-" + l)).join(" ")}]`);
}
for (const o of gorszeWeWszystkim) warn(`gorszy we wszystkim: ${o}`);
for (const o of gorszeWCzesci) warn(`gorszy w części: ${o}`);

/* ---- braki w katalogach ---- */

const raw = [...KATALOG.values()].filter(k => {
  return k.pochodzenie === "raw" && !productionGearIdForRef(k.ref);
});
const tabela = [...KATALOG.values()].filter(k => k.pochodzenie === "tabela" && !productionGearIdForRef(k.ref));
const zaslepki = [...KATALOG.values()].filter(k => k.zaslepka && !k.zamiast);
const nieprodukowalne = [...KATALOG.values()].filter(k => !k.produkcja && !k.zaslepka);

/* ---- raport ---- */

const line = s => console.log(s);
line(`Katalog: ${KATALOG.size} wpisów · przepisy: ${PRZEPISY_STANDARDOWE.size} standardowych, `
  + `${PRZEPISY_PROFESJI.size} profesji, ${PRZEPISY_ELABORACJI.size} elaboracji`);
line(`Listy profesji: ${Object.entries(LISTA_PROFESJI).map(([k, v]) => `${k} ${v.size}`).join(", ")}`);
line("");
line(`Braki w katalogach (zadania, nie błędy):`);
line(`  z cennika NOE, bez mechaniki modułu (raw:): ${raw.map(k => k.nazwa).join(", ")}`);
line(`  bez ceny w podręczniku (tabela:, cena = 2 × surowce): ${tabela.map(k => `${k.nazwa} [${k.wynik}]`).join(", ")}`);
line(`  zaślepki gear-data bez ceny: ${zaslepki.map(k => k.nazwa).join(", ") || "—"}`);
line(`  świadomie nieprodukowalne: ${nieprodukowalne.map(k => k.nazwa).join(", ") || "—"}`);
if (verbose) {
  line("");
  line("Tabele niezgodne ze wzorem (+ gorsze, − lepsze):");
  for (const o of niezgodneZeWzorem) line(`  ${o}`);
}
line("");
if (warnings.length) {
  line(`Ostrzeżenia (${warnings.length}):`);
  for (const w of warnings) line(`  ⚠ ${w}`);
  line("");
}
if (errors.length) {
  line(`BŁĘDY (${errors.length}):`);
  for (const e of errors) line(`  ✗ ${e}`);
  process.exit(1);
}
line("OK — przepisy spójne.");
