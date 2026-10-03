/**
 * WKK — „Dziurawy hełm” (PLAN_tt.md D12a, decyzja MG 2026-10-03).
 *
 * RAW (NOE s. 115, Krytyczna ochrona): hełm, który zamienił Trafienie Krytyczne na zwykłe
 * obrażenia, ulega zniszczeniu — znika. Z Kolorem Kobaltu zostaje po nim śmieć: przestrzelona
 * skorupa do sprzedania za grosze albo na surowce. Gospodarz reguły: `combat/obrona.mjs`
 * (`breakHelmet`), wariant RAW obok — bez Kobaltu hełm po prostu znika.
 */

const MODULE_ID = "neuroshima-2026-overrides";

/** Dane przedmiotu — `loot` / `junk`, 2 gb, 3 kg (waga hełmu z tabeli). */
export function dziurawyHelmData(helmet = null) {
  return {
    name: "Dziurawy hełm",
    type: "loot",
    // Ikona hełmu z katalogu do czasu własnej (dev/icons/MISSING.md).
    img: `modules/${MODULE_ID}/icons/armor/helm.svg`,
    system: {
      type: { value: "junk" },
      quantity: 1,
      price: { value: 2, denomination: "gb" },
      weight: { value: Number(helmet?.system?.weight?.value) || 3, units: "kg" },
      description: {
        value: `<p>Hełm, który przyjął Trafienie Krytyczne zamiast głowy właściciela${helmet ? ` (${foundry.utils.escapeHTML(helmet.name)})` : ""}. `
          + `Do niczego już nie chroni — złom do sprzedania albo na surowce.</p>`
          + `<p><em>Kolor Kobaltu: zostaje po Krytycznej ochronie (RAW: hełm znika).</em></p>`
      }
    },
    flags: { [MODULE_ID]: { dziurawyHelm: true } }
  };
}
