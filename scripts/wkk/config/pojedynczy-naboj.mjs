/**
 * Neuroshima 5e — WKK: nabój wepchnięty do wpiętego magazynka w walce.
 *
 * RAW ładuje po jednym naboju tylko magazynek wewnętrzny i bębenek; do wymiennego magazynka w walce
 * naboi nie wkłada się wcale (RAI, `weapons/magazine.mjs`, `_performLoadOneAction()`). Pomysł, żeby
 * dopuścić to jako **wadę** broni z wymiennym magazynkiem, okupioną Testem Zwinnych dłoni, dał
 * autor mechaniki (konsultacja 2026-09-22; podziękowania — README); liczby i skutki porażki są
 * tego stołu (decyzje MG 2026-09-22 i 2026-10-03) — stąd WKK, nie RAI.
 *
 *   • ST zależy od kalibru: im większy nabój, tym trudniej wepchnąć go w gniazdo magazynka.
 *   • Porażka — nabój wypada na ziemię (przedmioty na ziemi, `actors/ground-items.mjs`).
 *   • Pechowa jedynka — nabój wchodzi, ale krzywo: broń się zacina. Broń, która się nie zacina
 *     (Niezawodny, Jak dbasz, tak masz, Wychuchana spluwa), traktuje to jak zwykłą porażkę.
 *   • Akcja przepada w każdym wypadku.
 *
 * Gospodarz: `weapons/magazine.mjs` (`_performPushRoundAction`), tylko z włączonym Kobaltem.
 */

/** ST Testu Zwinnych dłoni wg kategorii kalibru (`AMMO_CALIBERS[].category`). */
export const ST_WEPCHNIECIA = Object.freeze({
  Pistoletowa: 12,   // krótki nabój, płytkie gniazdo — wykonalne pod presją
  "Śrutowa": 14,     // długa łuska, ale magazynki rurowe są wyrozumiałe
  Karabinowa: 15     // długi nabój, sprężyna pod pełnym naciskiem
});

/** Wyjątki po identyfikatorze kalibru — cięższe niż reszta swojej kategorii. */
export const ST_WEPCHNIECIA_KALIBER = Object.freeze({
  "50bmg": 18        // rozmiar naboju czyni z tego głównie deklarację intencji
});

/**
 * ST wepchnięcia naboju tego kalibru albo `null`, gdy kalibru nie wpycha się pojedynczo
 * (granaty, amunicja specjalna).
 * @param {{id: string, category: string}|null|undefined} caliber  wpis `AMMO_CALIBER_MAP`
 * @returns {number|null}
 */
export function stWepchniecia(caliber) {
  if (!caliber) return null;
  return ST_WEPCHNIECIA_KALIBER[caliber.id] ?? ST_WEPCHNIECIA[caliber.category] ?? null;
}

/**
 * Skutek Testu.
 * @param {object} test
 * @param {number} test.total       wynik Testu
 * @param {boolean} test.fumble     naturalna 1
 * @param {number} test.st
 * @param {boolean} test.jamImmune  broń się nie zacina (zdolność albo stan broni)
 * @returns {"zaladowany"|"upadl"|"zaciecie"}
 */
export function wynikWepchniecia({ total, fumble, st, jamImmune }) {
  if (fumble) return jamImmune ? "upadl" : "zaciecie";
  return Number(total) >= st ? "zaladowany" : "upadl";
}
