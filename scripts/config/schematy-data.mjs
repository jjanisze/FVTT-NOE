/**
 * Neuroshima 5e — Schematy: kształt przedmiotu (PLAN_produkcja §7, etap E3).
 *
 * **Schemat** to fizyczny przedmiot otwierający dostęp do jednego przepisu — zawsze
 * **standardowego** (przepisy profesji nie mają schematów, żyją tylko we Wprawie, D22).
 * Kupowany, sprzedawany, łupiony, jak każdy `loot`:
 *
 * - cena = cena przedmiotu, dostępność o połowę mniejsza (NOE s. 146) — flaga `availability`,
 *   ta sama, którą czytają handel (M5) i `Integracje/loot_generator.py`,
 * - trzy rozmiary wg godzin przepisu standardowego (D15 — prezentacja, obie wersje zasad),
 * - waga: z WKK 1 g na godzinę przepisu, bez WKK 0 (D15) — liczona w danych pochodnych
 *   (`production/schematy.mjs`), bo przełącznik WKK może się zmienić, a paczka jest stała.
 *
 * Plik czysty: czyta go też `dev/packs/build-packs.mjs` (paczka `schematy`).
 */

import { KATALOG, KATEGORIE, PRZEPISY_STANDARDOWE } from "./recipes-data.mjs";
import { rozmiarSchematu, wymagaSchematu, fmtGGMM, surowceString } from "./production-rules.mjs";
import { formatToolExpr, parseToolExpr } from "./tool-expr.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/**
 * Dedykowane białe glify trzech rozmiarów (batch 41).
 */
export const IKONY_SCHEMATU = Object.freeze({
  notatka: `modules/${MODULE_ID}/icons/items/loot/schemat_notatka.svg`,
  instrukcja: `modules/${MODULE_ID}/icons/items/loot/schemat_instrukcja.svg`,
  dokumentacja: `modules/${MODULE_ID}/icons/items/loot/schemat_dokumentacja.svg`
});

/** Flaga przedmiotu-Schematu (ta sama stała co w `production/zp.mjs`). */
export const SCHEMAT_FLAG = "schemat";

/** Czy dla tego przepisu powstaje Schemat w paczce: standardowy, wymagający schematu, z katalogu. */
export function maSchemat(p) {
  const k = KATALOG.get(p.wynik?.ref);
  return !!p.id?.startsWith("std/") && !!k && k.produkcja && k.schemat !== false && wymagaSchematu(p.cena);
}

/** Przepisy, dla których paczka `schematy` ma przedmiot. */
export function przepisySchematow() {
  return [...PRZEPISY_STANDARDOWE.values()].filter(maSchemat);
}

/** Opis Schematu — liczby przepisu, bez cytatów z podręcznika. */
function _opis(p, rozmiar) {
  const narz = formatToolExpr(parseToolExpr(p.narzedzia));
  return `<p><strong>Schemat (${rozmiar.label.toLowerCase()})</strong> — dostęp do przepisu na `
    + `<strong>${p.nazwa}</strong>${p.wynik.ilosc > 1 ? ` (×${p.wynik.ilosc})` : ""}.</p>`
    + `<p>ST ${p.st} · czas ${fmtGGMM(p.minuty)} · surowce: ${surowceString(p.surowce) || "—"} · narzędzia: ${narz}</p>`
    + `<p><em>Sam schemat nie daje umiejętności — potrzebna biegłość w narzędziach. Cena jak przedmiotu, `
    + `dostępność o połowę mniejsza (NOE s. 146).</em></p>`;
}

/**
 * Dane przedmiotu-Schematu dla przepisu (z danych albo ad hoc — wtedy snapshot w fladze).
 * @param {object} p           przepis
 * @param {{snapshot?: boolean}} [o]  `snapshot: true` — przepis spoza danych zapisany w Schemacie
 */
export function schematItemData(p, { snapshot = false } = {}) {
  const k = KATALOG.get(p.wynik?.ref);
  const rozmiar = rozmiarSchematu(p.minuty);
  const dost = Number(k?.dostepnosc);
  return {
    name: `Schemat: ${p.nazwa}`,
    type: "loot",
    img: IKONY_SCHEMATU[rozmiar.id],
    system: {
      description: { value: _opis(p, rozmiar), chat: "" },
      source: { custom: "Neuroshima RPG", rules: "2024" },
      quantity: 1,
      weight: { value: 0, units: "kg" },
      price: { value: p.cena, denomination: "gb" },
      identified: true
    },
    flags: {
      [MODULE_ID]: {
        [SCHEMAT_FLAG]: {
          przepisId: p.id,
          ref: p.wynik?.ref ?? null,
          rozmiar: rozmiar.id,
          minuty: p.minuty,
          ...(snapshot ? { snapshot: p } : {})
        },
        ...(Number.isFinite(dost) ? { availability: Math.floor(dost / 2) } : {})
      }
    }
  };
}

/** Folder paczki per kategoria katalogu. */
export function kategoriaSchematu(p) {
  const k = KATALOG.get(p.wynik?.ref);
  return { id: k?.kategoria ?? "sprzet", label: KATEGORIE[k?.kategoria]?.label ?? "Inne" };
}
