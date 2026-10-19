/**
 * Neuroshima 5e — M4 Pojazdy (PLAN_m4_pojazdy). Rejestracja i `game.neuroshima.pojazdy`.
 *
 * Mapa plików:
 *  - `stan.mjs`       — co jest pojazdem, obrys, miejsca, kto jedzie (jedyne miejsce czytające flagi)
 *  - `geometria.mjs`  — czyste funkcje: obrys w czterech kierunkach, układ miejsc, obroty
 *  - `zeton.mjs`      — podklasa żetonu: siatka w obrysie naturalnym, jadący w animacji, ukrycie,
 *                       kropki, prześwietlenie; zapis po ruchu (MG)
 */

import { registerZetonPojazdu, instrukcjePoRuchu, przeswietlany, mozePrzeswietlic } from "./zeton.mjs";
import {
  MODULE_ID, FLAGA_JAZDA, danePojazdu, jadacyPojazdu, jazdaZetonu, jestPojazdem, miejscaPojazdu, pojazdJadacego
} from "./stan.mjs";
import { ROZMIAR_MIEJSCA, naroznikDlaSrodka, srodekMiejsca, normalizujKat } from "./geometria.mjs";
import * as geometria from "./geometria.mjs";

export function registerPojazdy() {
  registerZetonPojazdu();
}

/**
 * Posadzenie żetonu na miejscu — od razu, bez kosztów (MG; okno miejsc z kosztami RAW to E3).
 * @param {TokenDocument} pojazd
 * @param {TokenDocument} jadacy
 * @param {string} [miejsce]  id miejsca; domyślnie pierwsze wolne
 */
async function posadz(pojazd, jadacy, miejsce) {
  if (!jestPojazdem(pojazd.actor)) throw new Error("To nie jest pojazd.");
  const zajete = new Set(jadacyPojazdu(pojazd).filter(t => t.id !== jadacy.id).map(t => jazdaZetonu(t).miejsce));
  const miejsca = miejscaPojazdu(pojazd.actor);
  const cel = miejsca.find(m => m.id === miejsce) ?? miejsca.find(m => !zajete.has(m.id));
  if (!cel || zajete.has(cel.id)) throw new Error("Brak wolnego miejsca.");
  const poprzednia = jazdaZetonu(jadacy);
  const rozmiar = poprzednia?.rozmiar ?? { w: jadacy._source.width, h: jadacy._source.height };
  const sort = poprzednia?.sort ?? jadacy._source.sort;
  const kratka = pojazd.parent.grid.size;
  const s = srodekMiejsca(pojazd.getCenterPoint(pojazd._source), pojazd._source.rotation, cel, kratka);
  const { x, y } = naroznikDlaSrodka(s, ROZMIAR_MIEJSCA, ROZMIAR_MIEJSCA, kratka);
  await jadacy.update({
    [`flags.${MODULE_ID}.${FLAGA_JAZDA}`]: { pojazd: pojazd.id, miejsce: cel.id, obrot: 0, rozmiar, sort },
    sort: Math.max(sort, pojazd._source.sort + 1)
  });
  await pojazd.parent.moveTokens({
    [jadacy.id]: { destination: { x, y, width: ROZMIAR_MIEJSCA, height: ROZMIAR_MIEJSCA,
      rotation: normalizujKat(pojazd._source.rotation), elevation: pojazd._source.elevation, action: "displace" } }
  }, { animate: false, showRuler: false, method: "api" });
  return cel.id;
}

/** Wysadzenie obok pojazdu: rozmiar i kolejność rysowania wracają (D2). */
async function wysadz(jadacy, { x, y } = {}) {
  const j = jazdaZetonu(jadacy);
  if (!j) return;
  const pojazd = pojazdJadacego(jadacy);
  const kratka = jadacy.parent.grid.size;
  const { w, h } = j.rozmiar ?? { w: 1, h: 1 };
  let cel = { x, y };
  if (x === undefined && pojazd) {
    const dane = danePojazdu(pojazd.actor);
    const c = pojazd.getCenterPoint(pojazd._source);
    // Lewa burta, tuż za obrysem — wolne pole dobiera E3.
    const s = srodekMiejsca(c, pojazd._source.rotation, { x: dane.obrys.w / 2 + w / 2 + 0.1, y: 0 }, kratka);
    cel = naroznikDlaSrodka(s, w, h, kratka);
  }
  await jadacy.update({ [`flags.${MODULE_ID}.${FLAGA_JAZDA}`]: _del, sort: j.sort ?? jadacy._source.sort });
  await jadacy.parent.moveTokens({
    [jadacy.id]: { destination: { x: cel.x ?? jadacy._source.x, y: cel.y ?? jadacy._source.y, width: w, height: h,
      action: "displace" } }
  }, { animate: false, showRuler: false, method: "api" });
}

export const pojazdyApi = {
  geometria,
  danePojazdu, miejscaPojazdu, jadacyPojazdu, pojazdJadacego, jestPojazdem,
  instrukcjePoRuchu, przeswietlany, mozePrzeswietlic,
  posadz, wysadz
};
