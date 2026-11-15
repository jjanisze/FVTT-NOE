/**
 * Neuroshima 5e — skok (PLAN_m8_ruch_i_ekonomia_akcji.md §4.5, E3): czysty kalkulator, bez Foundry.
 *
 * Jeden wynik dla palety/karty, makr, Regionu `skok` i natywnego ruchu „Skok” (§4.5):
 *   - **w dal** (NOE s. 256): SIŁ × 0,3 m po co najmniej 3 m rozbiegu bezpośrednio przed skokiem; z miejsca połowa;
 *   - **wzwyż** (s. 256): (2 + mod. SIŁ) × 0,3 m, z miejsca połowa; sięgnięcie = wysokość skoku + 1,5 × wzrost;
 *   - **Skoczek** (Zwinność szczura, s. 94): maksimum skoku w dal z ZRC zamiast SIŁ — wysokości nie rusza (§2.2);
 *   - **Skok Gladiatora** (Zew areny, s. 70, w Berserku): wysokość i odległość ×2; cel na polu lądowania — RO SIŁ
 *     ST 8 + mod. SIŁ + PB, porażka: Powalenie i 1k6 obuchowych za każde pełne 3 m (D33, WKK).
 * Koszt skoku to 1:1 jego długości (s. 256) — liczy go natywny ruch „Skok” (dnd5e) albo Region; rozbieg to zwykły ruch.
 * Bez zaokrąglania w górę: 4,2 m nie staje się 4,5 m przez siatkę (§4.5). Bez obowiązkowego testu zwykłego skoku —
 * drukowany jest tylko test lądowania na trudnym terenie po skoku w dal (Akrobatyka ST 10, inaczej Powalenie).
 */

import { metry } from "./ekonomia-data.mjs";

/** 30 cm na punkt cechy (s. 256). */
export const M_ZA_PUNKT = 0.3;
/** Rozbieg: co najmniej 3 m bezpośrednio przed skokiem (s. 256). */
export const ROZBIEG_M = 3;
/** Lądowanie na trudnym terenie po skoku w dal: Akrobatyka ST 10, inaczej Powalenie (s. 256). */
export const ST_LADOWANIA = 10;
/** Skok Gladiatora: kość obrażeń na każde pełne 3 m (D33). */
export const GLADIATOR_M_NA_KOSC = 3;

const _zaokr = n => Math.round((Number(n) || 0) * 100) / 100;
const EPS = 1e-6;

/**
 * Zasięg skoku z rozbiegiem albo z miejsca.
 * @param {object} d
 * @param {number} [d.sila]      wartość SIŁ
 * @param {number} [d.zrc]       wartość ZRC (Skoczek)
 * @param {number} [d.modSily]   modyfikator SIŁ
 * @param {boolean} [d.rozbieg]  co najmniej 3 m rozbiegu
 * @param {boolean} [d.skoczek]  Zwinność szczura: w dal z ZRC
 * @param {boolean} [d.gladiator] Skok Gladiatora (zdolność + aktywny Berserk): ×2
 * @param {number|null} [d.wzrost] wzrost w metrach — sięgnięcie; bez niego `null`
 * @returns {{dal: number, wzwyz: number, siegniecie: number|null, rozbieg: boolean, wzorDal: string, wzorWzwyz: string}}
 */
export function zasiegSkoku({ sila = 10, zrc = 10, modSily = 0, rozbieg = true, skoczek = false, gladiator = false, wzrost = null } = {}) {
  const k = (rozbieg ? 1 : 0.5) * (gladiator ? 2 : 1);
  const wartosc = Math.max(0, Number(skoczek ? zrc : sila) || 0);
  const dal = _zaokr(wartosc * M_ZA_PUNKT * k);
  const punktyWzwyz = Math.max(0, 2 + (Number(modSily) || 0));
  const wzwyz = _zaokr(punktyWzwyz * M_ZA_PUNKT * k);
  const dopisek = `${rozbieg ? "" : " ÷ 2 (z miejsca)"}${gladiator ? " × 2 (Skok Gladiatora)" : ""}`;
  return {
    dal, wzwyz, rozbieg: !!rozbieg,
    siegniecie: Number.isFinite(wzrost) && wzrost > 0 ? _zaokr(wzwyz + 1.5 * wzrost) : null,
    wzorDal: `${skoczek ? "ZRC" : "SIŁ"} ${wartosc} × 0,3 m${dopisek}`,
    wzorWzwyz: `(2 ${(Number(modSily) || 0) < 0 ? "−" : "+"} ${Math.abs(Number(modSily) || 0)}) × 0,3 m${dopisek}`
  };
}

const _SKOK_DAL = /(?:długości|na odległość|w dal)\s+(?:do\s+)?([\d,]+)\s*m/i;
const _SKOK_WZWYZ = /wysokości\s+(?:do\s+)?([\d,]+)\s*m/i;

/**
 * Stały skok istoty z opisu cechy (s. 256: istoty skaczą wg opisu, §9: bez ludzkiego wzoru SIŁ) — „skok długości 6 m
 * lub wysokości do 3 m” (Bit-boy), „skok na odległość 18 m” (Skakun). To samo co reguła generatora Bestiariusza
 * (`dev/bestiary/gen_bestiary.py`, `kind: "skok"`), więc działa też na kopiach sprzed przebudowy paczki. Skok warunkowy
 * („co najmniej 9 m” — Skok łowcy) nie jest zasięgiem: `null`.
 * @param {string} tekst
 * @returns {{dal: number|null, wzwyz: number|null}|null}
 */
export function skokIstotyZOpisu(tekst) {
  const t = String(tekst ?? "");
  const d = _SKOK_DAL.exec(t), w = _SKOK_WZWYZ.exec(t);
  if (!d && !w) return null;
  const n = m => (m ? Number(m[1].replace(",", ".")) : null);
  return { dal: n(d), wzwyz: n(w) };
}

/**
 * Zasięgi istoty ze stałego skoku — ten sam kształt co `zasiegSkoku` (z rozbiegu i z miejsca jednakowo: opis nie
 * zna rozbiegu). Brak liczby wzwyż — `null` (bez ostrzeżenia, rozstrzyga stół).
 * @param {{dal: number|null, wzwyz: number|null}} skok
 * @param {string} cecha  nazwa cechy do wzoru („Skok”)
 */
export function zasiegIstoty(skok, cecha) {
  const z = {
    dal: skok?.dal ?? null, wzwyz: skok?.wzwyz ?? null, rozbieg: true, siegniecie: null,
    wzorDal: `cecha „${cecha}”`, wzorWzwyz: `cecha „${cecha}”`
  };
  return { zRozbiegu: z, zMiejsca: { ...z, rozbieg: false }, istota: true };
}

/**
 * Skoki w trasie: odcinki „Skok” idące po sobie to jeden skok; rozbieg to zwykły chód tuż przed nim (także z
 * wcześniejszych ruchów tej tury — „kilka dragów”, §4.5), nie koszt terenu.
 * @param {{akcja: string, poziomo: number, pionowo: number, nowy?: boolean}[]} odcinki  w kolejności trasy;
 *   `pionowo` ze znakiem (w górę dodatnie), `nowy` — odcinek z oceniany części ruchu (starsze tylko jako rozbieg)
 * @returns {{poziomo: number, wzwyz: number, rozbieg: number, koniec: number}[]}  `koniec` — indeks ostatniego odcinka
 */
export function skokiWTrasie(odcinki) {
  const out = [];
  let i = 0;
  while (i < odcinki.length) {
    if (odcinki[i].akcja !== "jump") { i++; continue; }
    const start = i;
    let poziomo = 0, wzwyz = 0, wysokosc = 0, nowy = false;
    while (i < odcinki.length && odcinki[i].akcja === "jump") {
      poziomo += Number(odcinki[i].poziomo) || 0;
      wysokosc += Number(odcinki[i].pionowo) || 0;
      wzwyz = Math.max(wzwyz, wysokosc);
      nowy ||= odcinki[i].nowy !== false;
      i++;
    }
    let rozbieg = 0;
    for (let j = start - 1; j >= 0 && odcinki[j].akcja === "walk"; j--) rozbieg += Number(odcinki[j].poziomo) || 0;
    if (nowy) out.push({ poziomo: _zaokr(poziomo), wzwyz: _zaokr(wzwyz), rozbieg: _zaokr(rozbieg), koniec: i - 1 });
  }
  return out;
}

/**
 * Ocena wykonanego skoku względem zasięgu. Przekroczenie ostrzega, nie blokuje (§1 zasada 3).
 * @param {{poziomo: number, wzwyz: number, rozbieg: number}} skok
 * @param {{zRozbiegu: object, zMiejsca: object}|{reczny: string}} zasiegi  z `zasiegSkoku`
 * @returns {string[]} ostrzeżenia
 */
export function ocenSkok(skok, zasiegi) {
  if (!zasiegi || zasiegi.reczny) {
    return [`Skok ${metry(skok.poziomo)} m — ${zasiegi?.reczny ?? "zasięg do rozstrzygnięcia przy stole"}.`];
  }
  const zRozbiegu = skok.rozbieg + EPS >= ROZBIEG_M;
  const z = zRozbiegu ? zasiegi.zRozbiegu : zasiegi.zMiejsca;
  const jak = zasiegi.istota ? "stały skok istoty" : zRozbiegu ? "z rozbiegu" : `z miejsca — rozbieg ${metry(skok.rozbieg)} m < 3 m`;
  const ostrz = [];
  if (z.dal != null && skok.poziomo > z.dal + EPS) {
    ostrz.push(`Skok ${metry(skok.poziomo)} m — ponad zasięg ${metry(z.dal)} m (${jak}; ${z.wzorDal}).`);
  }
  if (z.wzwyz != null && skok.wzwyz > z.wzwyz + EPS) {
    ostrz.push(`Skok wzwyż ${metry(skok.wzwyz)} m — ponad ${metry(z.wzwyz)} m (${jak}; ${z.wzorWzwyz}).`);
  }
  return ostrz;
}

/** Skok Gladiatora: kości obrażeń (D33) — `floor(max(długość, wysokość) / 3 m)`, bez sumowania i zaokrąglania w górę. */
export function kosciGladiatora({ poziomo = 0, wzwyz = 0 } = {}) {
  return Math.floor(Math.max(Number(poziomo) || 0, Number(wzwyz) || 0) / GLADIATOR_M_NA_KOSC + EPS);
}

/** ST RO na Siłę celu Skoku Gladiatora: 8 + mod. SIŁ + PB (s. 70). */
export const stGladiatora = ({ modSily = 0, pb = 0 } = {}) => 8 + (Number(modSily) || 0) + (Number(pb) || 0);

/** Kolejność rozmiarów dnd5e (od najmniejszego). */
const ROZMIARY = ["tiny", "sm", "med", "lg", "huge", "grg"];

/** Skok Gladiatora: cel nie większy od skaczącego o więcej niż jeden rozmiar (s. 70). */
export function gladiatorDosiega(rozmiarSkoczka, rozmiarCelu) {
  const s = ROZMIARY.indexOf(rozmiarSkoczka ?? "med");
  const c = ROZMIARY.indexOf(rozmiarCelu ?? "med");
  return (c < 0 ? 2 : c) <= (s < 0 ? 2 : s) + 1;
}

/**
 * Skok przez szczelinę Regionu (`gap` m): doskakuje, czy ląduje w niej — i gdzie.
 * @param {number} szczelina  szerokość w metrach
 * @param {number} zasieg     zasięg skoku w dal
 * @param {number} pole       wielkość pola siatki w metrach
 * @returns {{doskakuje: boolean, dlugosc: number, polaWglab: number}}  `polaWglab` — w którym polu szczeliny
 *   (1 = pierwsze) kończy się krótki skok; przy doskoku długość = szerokość szczeliny
 */
export function skokPrzezSzczeline(szczelina, zasieg, pole = 1.5) {
  if (zasieg + EPS >= szczelina) return { doskakuje: true, dlugosc: _zaokr(szczelina), polaWglab: 0 };
  const pol = Math.max(1, Math.round(szczelina / pole));
  return { doskakuje: false, dlugosc: _zaokr(Math.max(0, zasieg)), polaWglab: Math.min(pol, Math.floor(Math.max(0, zasieg) / pole + EPS) + 1) };
}
