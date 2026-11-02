/**
 * Neuroshima 5e — dawki leków: ułamek dawki i podawanie leku pacjentowi (czyste funkcje).
 *
 * Dzienne zapotrzebowanie na lek to jedna dawka. Sztuczka **Pan Plaster** (Do ostatniej kropelki, s. 105):
 * kto ją ma, wydziela pacjentowi lek na dowolną chorobę w połowie dawki — także sobie (decyzja MG 2026-11-02, D18).
 * Ułamek żyje na przedmiocie leku jako flaga „bieżąca dawka napoczęta w połowie” — `system.uses` dnd5e są całkowite:
 *
 *   - pół dawki z nienapoczętej: flaga w górę, użycie zostaje,
 *   - pół dawki z napoczętej: flaga w dół, jedno użycie schodzi,
 *   - pełna dawka: jedno użycie schodzi, flaga bez zmian (połówka dalej czeka).
 *
 * Zostaje więc `całe dawki − ½ × flaga`, a ostatnia połówka nie znika z opakowaniem: zużycie, które mogłoby skasować
 * przedmiot (`autoDestroy`), dzieje się dopiero przy drugiej połowie.
 */

/** Flaga przedmiotu leku: bieżąca dawka napoczęta w połowie. */
export const POL_DAWKI_FLAG = "polowaDawki";

/** Ile dawki schodzi naraz: pół z Panem Plastrem, inaczej cała. */
export const dawkaNaRaz = polowa => (polowa ? 0.5 : 1);

/**
 * Dawki w przedmiocie: całe opakowania × dawki w opakowaniu + reszta otwartego, minus napoczęta połowa.
 * @param {{quantity?: number, max?: number, spent?: number, polowa?: boolean}} p
 * @returns {number}
 */
export function pozostaleDawki({ quantity = 0, max = 0, spent = 0, polowa = false } = {}) {
  const qty = Number(quantity) || 0;
  const m = Number(max) || 0;
  const cale = m ? Math.max(0, (qty - 1) * m + (m - (Number(spent) || 0))) : qty;
  return Math.max(0, cale - (polowa && cale > 0 ? 0.5 : 0));
}

/**
 * Co zrobić z przedmiotem, żeby wydać dawkę.
 * @param {boolean} polowa       wydaje się pół dawki
 * @param {boolean} napoczeta    flaga połowy na przedmiocie
 * @returns {{zuzyjUzycie: boolean, flaga: boolean}}  czy zużyć jedno użycie, flaga połowy po wydaniu
 */
export function krokDawki(polowa, napoczeta) {
  if (!polowa) return { zuzyjUzycie: true, flaga: napoczeta };
  return napoczeta ? { zuzyjUzycie: true, flaga: false } : { zuzyjUzycie: false, flaga: true };
}

/** „2,5” — dawki po polsku (przecinek dziesiętny, bez zbędnego zera). */
export const fmtDawki = n => String(Math.round(Number(n) * 10) / 10).replace(".", ",");

/** Odmiana: 1 dawka, 2–4 dawki, 5+ dawek; ułamek — dawki („2,5 dawki”). */
export function slowoDawki(n) {
  const v = Number(n);
  if (!Number.isInteger(v)) return "dawki";
  if (v === 1) return "dawka";
  const r10 = v % 10;
  const r100 = v % 100;
  return r10 >= 2 && r10 <= 4 && (r100 < 12 || r100 > 14) ? "dawki" : "dawek";
}

/**
 * Pacjenci, którym dawca może podać lek: postacie z chorobą, którą lek leczy, bez dzisiejszej dawki.
 * @param {{id: string, nazwa: string, choroby: {id: string, key: string, name: string, dzis: boolean}[]}[]} kandydaci
 * @param {string[]} leczy       klucze chorób z katalogu leku (`treats`)
 * @param {string} dawcaId       sam sobie bierze lek z panelu chorób („Weź dawkę”), nie z tej listy
 * @returns {{aktorId: string, nazwa: string, wpisId: string, choroba: string, dzis: boolean}[]}
 */
export function pacjenciLeku(kandydaci, leczy, dawcaId) {
  const lek = new Set(leczy ?? []);
  const out = [];
  for (const k of kandydaci ?? []) {
    if (k.id === dawcaId) continue;
    for (const c of k.choroby ?? []) {
      if (lek.has(c.key)) out.push({ aktorId: k.id, nazwa: k.nazwa, wpisId: c.id, choroba: c.name, dzis: !!c.dzis });
    }
  }
  return out;
}
