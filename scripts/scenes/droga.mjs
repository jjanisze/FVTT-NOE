/**
 * Neuroshima 5e — metryka drogi na planszy pościgu (PLAN_m4_pojazdy §6.2.2, D24, D27).
 *
 * Plansza to **złożona droga**: tor = 280 px rysowany jako 6 m (pojazdy w prawdziwej skali), ale między pojazdami
 * liczy się jako znacznik pościgu, 36 m. Każdy pojazd to **wyspa** w prawdziwej skali przypięta do drogi środkiem.
 * Każdy punkt planszy ma współrzędne drogi w metrach:
 *
 *  - **S (wzdłuż)** = 36 m × tor środka wyspy + przesunięcie od środka wyspy w prawdziwych metrach; poza wyspą —
 *    36 m × tor pod punktem (tor ciągły: środek toru n = n);
 *  - **T (w poprzek)** = prawdziwe metry z y;
 *  - odległość = linia prosta w (S, T).
 *
 * Przynależność punktu: środek jadącego → jego pojazd; punkt na prostokącie pionka albo do 1,5 m od niego → ten pionek
 * (najbliższy środkiem); reszta — goła droga. Strefa swobodna (pod `FREEFORM_Y`) nie jest drogą — mierzy się tam
 * zwykłymi metrami rysunku.
 *
 * ## Gdzie się podpina
 *
 * `SquareGrid#_measurePath` (łatka na prototypie, tylko dla scen planszy): rdzeń sumuje odcinki w `measurePath`, więc linijka, zasięgi
 * i cechy zależne od zasięgu (`combat/okolicznosci.mjs`, `combat/pack-tactics.mjs`, `weapons/addons.mjs`) widzą
 * metrykę drogi bez zmian u siebie. **Ruch żetonu** (rdzeń podaje funkcję kosztu i mierzy między punktami kotwicy, nie
 * środkami) liczy się gołą drogą: zmiana toru = 36 m, bez wysp — inaczej pojazd mierzyłby się od własnego obrysu.
 *
 * **Zasada na przyszłość (D27):** na planszy odległość bierze się z `measurePath` albo z `odlegloscNaDrodze`, nigdy
 * z pikseli. Strażnik — Quench `poscig` (metryka) i e2e (konsumenci).
 */

import { FLAG_ROLA, FREEFORM_Y, LANE_W, MARGIN_X, poscigFlag, staraPlansza } from "./poscig.mjs";
import { METRY_NA_ZNACZNIK } from "../config/vehicles-data.mjs";
import { METRY_KRATKI_POJAZDU, jazdaZetonu, jestZetonemPojazdu, kratkaPojazdu } from "../pojazdy/stan.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Punkt do 1,5 m od pionka należy jeszcze do jego wyspy (rozrzut granatu, punkt linijki tuż przy masce). */
export const MARGINES_WYSPY_M = 1.5;

/* -------------------------------------------- */
/*  Czysta geometria (testowalna bez Foundry)    */
/* -------------------------------------------- */

/** Tor ciągły: środek toru n daje n, krawędź między torami — n + 0,5. */
export function torCiagly(x) {
  return (x - MARGIN_X - LANE_W / 2) / LANE_W + 1;
}

/**
 * Wyspa punktu wśród prostokątów pionków (px). Najpierw jadący (środek ≈ punkt → jego pojazd), potem prostokąt
 * z marginesem, przy kilku — najbliższy środkiem.
 * @param {{x: number, y: number}} p
 * @param {{id: string, x: number, y: number, w: number, h: number}[]} wyspy
 * @param {{x: number, y: number, pojazd: string}[]} jadacy   środki jadących i id ich pojazdów
 * @param {number} marginesPx
 */
export function wyspaPunktuCzysta(p, wyspy, jadacy = [], marginesPx = 0) {
  const j = jadacy.find(r => Math.abs(r.x - p.x) < 1 && Math.abs(r.y - p.y) < 1);
  if (j) {
    const w = wyspy.find(v => v.id === j.pojazd);
    if (w) return w;
  }
  let best = null, bd = Infinity;
  for (const w of wyspy) {
    if (p.x < w.x - marginesPx || p.x > w.x + w.w + marginesPx || p.y < w.y - marginesPx || p.y > w.y + w.h + marginesPx) continue;
    const d = Math.hypot(p.x - (w.x + w.w / 2), p.y - (w.y + w.h / 2));
    if (d < bd) { bd = d; best = w; }
  }
  return best;
}

/**
 * Współrzędne drogi punktu (m).
 * @param {{x: number, y: number}} p
 * @param {{x: number, y: number, w: number, h: number}|null} wyspa
 * @param {number} pxNaMetr  skala rysunku (70 px na 1,5 m → 46,67)
 * @param {{swobodna?: boolean}} [opts]  `swobodna` — strefa swobodna: zwykłe metry rysunku w obu osiach
 * @returns {{s: number, t: number}}
 */
export function naDrodzeCzyste(p, wyspa, pxNaMetr, { swobodna = false } = {}) {
  if (swobodna) return { s: p.x / pxNaMetr, t: p.y / pxNaMetr };
  if (!wyspa) return { s: METRY_NA_ZNACZNIK * torCiagly(p.x), t: p.y / pxNaMetr };
  const cx = wyspa.x + wyspa.w / 2;
  return { s: METRY_NA_ZNACZNIK * torCiagly(cx) + (p.x - cx) / pxNaMetr, t: p.y / pxNaMetr };
}

/** Odległość dwóch punktów drogi (m). */
export const odlegloscWspolrzednych = (A, B) => Math.hypot(A.s - B.s, A.t - B.t);

/* -------------------------------------------- */
/*  Scena                                        */
/* -------------------------------------------- */

/** Skala rysunku planszy: piksele na metr. */
export function pxNaMetr(scene) {
  return kratkaPojazdu(scene) / METRY_KRATKI_POJAZDU;
}

/** Wyspy sceny: pionki pościgu i pojazdy M4 w pasie (prostokąty żetonów, stan docelowy `_source`). */
export function wyspySceny(scene) {
  const g = scene.grid.size;
  const out = [];
  for (const t of scene.tokens) {
    if (jazdaZetonu(t)) continue;
    if (!t.getFlag(MODULE_ID, FLAG_ROLA) && !jestZetonemPojazdu(t)) continue;
    const s = t._source;
    const w = s.width * g, h = s.height * g;
    if (s.y + h / 2 >= FREEFORM_Y) continue;
    out.push({ id: t.id, x: s.x, y: s.y, w, h, token: t });
  }
  return out;
}

/** Środki jadących sceny (do rozpoznania punktu „środek jadącego”). */
export function jadacySceny(scene) {
  const out = [];
  for (const t of scene.tokens) {
    const j = jazdaZetonu(t);
    if (!j) continue;
    const c = t.getCenterPoint(t._source);
    out.push({ x: c.x, y: c.y, pojazd: j.pojazd });
  }
  return out;
}

/** Kontekst pomiaru jednej sceny — wyspy i jadący liczeni raz na pomiar. */
export function kontekstDrogi(scene) {
  const k = pxNaMetr(scene);
  return { scene, k, wyspy: wyspySceny(scene), jadacy: jadacySceny(scene), margines: MARGINES_WYSPY_M * k };
}

/**
 * Współrzędne drogi punktu sceny.
 * @param {object} ctx  `kontekstDrogi(scene)`
 * @param {{x: number, y: number}} p
 * @param {{gola?: boolean}} [opts]  `gola` — bez wysp (ruch żetonu po drodze)
 */
export function naDrodze(ctx, p, { gola = false } = {}) {
  if (p.y >= FREEFORM_Y) return { ...naDrodzeCzyste(p, null, ctx.k, { swobodna: true }), wyspa: null };
  const wyspa = gola ? null : wyspaPunktuCzysta(p, ctx.wyspy, ctx.jadacy, ctx.margines);
  return { ...naDrodzeCzyste(p, wyspa, ctx.k), wyspa: wyspa?.token ?? null };
}

/** Odległość (m) dwóch punktów planszy po drodze. */
export function odlegloscNaDrodze(scene, a, b, { gola = false, ctx = null } = {}) {
  const c = ctx ?? kontekstDrogi(scene);
  const A = naDrodze(c, a, { gola }), B = naDrodze(c, b, { gola });
  return Math.hypot(odlegloscWspolrzednych(A, B), (b.elevation ?? 0) - (a.elevation ?? 0));
}

/** Czy scena mierzy po drodze (plansza złożonej drogi; stara plansza — nie). */
export function mierzyDroga(scene) {
  return !!poscigFlag(scene) && !staraPlansza(scene) && pxNaMetr(scene) > 0;
}

/* -------------------------------------------- */
/*  Siatka planszy                               */
/* -------------------------------------------- */

/** Siatka → scena dla siatek przypiętych jawnie (testy); reszta szukana wśród scen świata. */
const _sceny = new WeakMap();

/** Scena, do której należy instancja siatki. Rdzeń tworzy siatkę od nowa przy każdym resecie danych sceny. */
function scenaSiatki(grid) {
  if (_sceny.has(grid)) return _sceny.get(grid);
  if (globalThis.canvas?.scene?.grid === grid) return canvas.scene;
  return game.scenes?.find(s => s.grid === grid) ?? null;
}

/** Przypnij siatkę do sceny jawnie (scena spoza `game.scenes`, np. w teście). */
export function podepnijSiatke(scene) {
  if (scene?.grid) _sceny.set(scene.grid, scene);
}

/**
 * `SquareGrid#_measurePath` dla planszy: po pomiarze rdzenia każdy odcinek dostaje odległość po drodze; koszt odcinka
 * skaluje się tak samo (mnożnik trudnego terenu zostaje). Łatka na prototypie, nie na instancji — **rdzeń buduje
 * siatkę sceny od nowa przy każdym resecie jej danych** (np. po zmianie żetonu), więc łatka na instancji ginie po
 * cichu i linijka wraca do 6 m na tor.
 */
function _patchSquareGrid() {
  const Square = foundry.grid.SquareGrid;
  if (Square.prototype._neuroDroga) return;
  const oryginal = Square.prototype._measurePath;
  Square.prototype._measurePath = function (waypoints, options, result) {
    oryginal.call(this, waypoints, options, result);
    const scene = scenaSiatki(this);
    if (!scene || !mierzyDroga(scene)) return;
    // Ruch żetonu (`TokenDocument#measureMovementPath`: punkty kotwic z `action`, zwykle z funkcją kosztu) — goła droga
    // (D27, nagłówek pliku). Linijka i zasięgi podają gołe punkty.
    const gola = typeof options?.cost === "function" || waypoints.some(w => typeof w?.cost === "function" || (w && "action" in w));
    const ctx = kontekstDrogi(scene);
    for (let i = 1; i < waypoints.length; i++) {
      const seg = result.waypoints[i]?.backward;
      if (!seg) continue;
      const d = odlegloscNaDrodze(scene, waypoints[i - 1], waypoints[i], { gola, ctx });
      const mnoznik = seg.distance > 0 && Number.isFinite(seg.cost) ? seg.cost / seg.distance : 1;
      seg.distance = d;
      if (Number.isFinite(seg.cost)) seg.cost = d * mnoznik;
    }
  };
  Object.defineProperty(Square.prototype, "_neuroDroga", { value: true });
}

/** Wołane w `ready` (`main.mjs`, obok reszty planszy). */
export function registerDroga() {
  _patchSquareGrid();
}

export const drogaApi = {
  torCiagly, naDrodze, kontekstDrogi, odlegloscNaDrodze, mierzyDroga, pxNaMetr, wyspySceny, MARGINES_WYSPY_M
};
