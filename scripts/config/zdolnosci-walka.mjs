/**
 * Neuroshima 5e — zdolności walki z kontekstem (PLAN_m7 E4, rodziny R4 i R5): czyste reguły.
 *
 * Bez `game`, `canvas` i dokumentów — warstwa Foundry to `combat/zdolnosci-walka.mjs` (premie, Ułatwienia, Strzelec,
 * Refleks łowcy) i `combat/zdolnosci-akcje.mjs` (Ulubiona broń, Promocja, Celowanie, Słaby punkt, Szybka gadka,
 * Szybkie badanie). Testy: `tests/okolicznosci.test.mjs`, warstwa 1.
 */

/** Mój wróg (Zwiadowca 1, s. 96) — opcja → kategorie istot (`config/creature-types.mjs`); roje liczą się jak zwierzęta. */
export const MOJ_WROG_KATEGORIE = Object.freeze({
  "moj-wrog-ludzie": Object.freeze(["czlowiek"]),
  "moj-wrog-maszyny": Object.freeze(["maszyna"]),
  "moj-wrog-mutanty": Object.freeze(["mutant"]),
  "moj-wrog-potwory": Object.freeze(["potwor"]),
  "moj-wrog-zwierzeta": Object.freeze(["zwierze", "rojZwierzat"])
});

/** Kolumna „Mój wróg” tabeli Zwiadowcy (s. 97) dla poziomu 1. */
export const MOJ_WROG_DOMYSLNIE = "+1/1k6";

/**
 * Premia Mojego wroga z kolumny tabeli: „+2/2k6” → `{ atak: 2, obrazenia: "2d6" }`; nieczytelna — `null`.
 * @param {string} skala
 */
export function premiaMojegoWroga(skala) {
  const m = /^\s*\+?(\d+)\s*\/\s*(\d+)\s*[kd]\s*(\d+)\s*$/i.exec(String(skala ?? ""));
  return m ? { atak: Number(m[1]), obrazenia: `${m[2]}d${m[3]}` } : null;
}

/** Słaby punkt (Zabójca maszyn, s. 101) — ST Testu INT (Technika) z rozmiaru maszyny (klucze rozmiarów dnd5e). */
export const ST_SLABEGO_PUNKTU = Object.freeze({ tiny: 5, sm: 5, med: 10, lg: 15, huge: 20, grg: 25 });

export function stSlabegoPunktu(rozmiar) {
  return ST_SLABEGO_PUNKTU[rozmiar] ?? null;
}

/** Zawołajcie kolegów (Gladiator, s. 70): tylu przeciwników ≤ 1,5 m. */
export const ZAWOLAJCIE_ILU = 2;
/** Ja i mój gang! (Ganger, s. 69): sojusznik w promieniu tylu metrów od Brutala w Berserku. */
export const ZASIEG_GANGU = 3;
/** Dwóch na jednego (Ganger, s. 69): premia do Testów Ataku wręcz. */
export const DWOCH_NA_JEDNEGO = 2;
/** Rzeźnik (Wyjadacz, s. 86/98): premia do obrażeń. */
export const RZEZNIK = 3;

/* -------------------------------------------- */
/*  Chwile walki                                 */
/* -------------------------------------------- */

const _po = (a, b) => a.round > b.round || (a.round === b.round && a.turn > b.turn);

/**
 * Koniec ostatniej **zakończonej** tury kombatanta o indeksie `moj` przed chwilą `teraz` (D13): trwa jego tura albo
 * jego miejsce w kolejności jeszcze nie nadeszło — koniec tury z poprzedniej rundy; już minęło — z tej rundy.
 * @param {{round: number, turn: number}} teraz
 * @param {number} moj
 */
export function koniecPoprzedniejTury(teraz, moj) {
  return teraz.turn > moj ? { round: teraz.round, turn: moj } : { round: teraz.round - 1, turn: moj };
}

/**
 * Dwóch na jednego (D13): czy chwila ataku sojusznika mieści się w oknie „od końca twojej poprzedniej tury” do teraz.
 * Kolejność inicjatywy nie decyduje — okno kroczy z turą atakującego.
 * @param {{round: number, turn: number}|null} chwila  atak sojusznika (indeks tury przeliczony na dzisiejszą kolejność)
 * @param {{round: number, turn: number}} teraz
 * @param {number} moj                                 indeks tury atakującego
 */
export function wOknieOdPoprzedniejTury(chwila, teraz, moj) {
  if (!chwila || !teraz || !Number.isInteger(moj) || moj < 0 || !Number.isInteger(chwila.turn) || chwila.turn < 0) return false;
  return _po(chwila, koniecPoprzedniejTury(teraz, moj)) && !_po(chwila, teraz);
}

/**
 * Zasadzka, Jeden strzał — Pierwszy atak: pierwsza runda i atakujący jest w kolejności przed celem.
 * @param {{round: number, turn: number}|null} teraz
 * @param {number} indeksAtakujacego
 * @param {number} indeksCelu  −1 — cel poza walką
 */
export function przedCelemWPierwszejRundzie(teraz, indeksAtakujacego, indeksCelu) {
  if (!teraz || teraz.round !== 1) return false;
  if (!(indeksAtakujacego >= 0) || !(indeksCelu >= 0)) return false;
  return indeksAtakujacego < indeksCelu;
}

/* -------------------------------------------- */
/*  Ręce, broń                                   */
/* -------------------------------------------- */

/**
 * Rzeźnik (U9): druga ręka nie trzyma **innej broni**. Chwyt oburęczny tej samej broni — tak; tarcza nie jest bronią
 * (Cios tarczą to atak bez broni, s. 115); bliźniak improwizowany (M6 E3) w drugiej ręce nie jest bronią, dopóki
 * nim nie atakujesz — lalka trzyma przedmiot-oryginał, nie bliźniaka.
 * @param {{id: string|null, bron: boolean}[]} trzymane  zawartość obu rąk
 * @param {string} bronId                                broń ataku
 */
export function rzeznikDziala(trzymane, bronId) {
  return !(trzymane ?? []).some(h => h?.id && h.id !== bronId && h.bron);
}

/**
 * Dodatkowa kość Zabójczej spluwy (Clint, s. 88): „Peacemaker zadaje 2k8 zamiast 1k8” — kość pierwszego członu
 * obrażeń. `null`, gdy w formule nie ma kości.
 * @param {string} formula
 */
export function koscZabojczejSpluwy(formula) {
  const m = /(\d*)d(\d+)/i.exec(String(formula ?? ""));
  return m ? `1d${m[2]}` : null;
}

/**
 * Ile Ulubionych broni (s. 86, 91, 97): Twardziel — kolumna tabeli; Zwiadowca — dwie od 9. poziomu; Złodziej — jedna.
 * @param {string} abilityId
 * @param {{skala?: number|null, poziom?: number}} o
 */
export function limitUlubionych(abilityId, { skala = null, poziom = 1 } = {}) {
  if (abilityId === "ulubiona-bron-twardziel") return Math.max(1, Number(skala) || 1);
  if (abilityId === "ulubiona-bron-zwiadowca") return poziom >= 9 ? 2 : 1;
  return 1;
}

/** Zdolności z Ulubioną bronią. */
export const ULUBIONA_BRON = Object.freeze(["ulubiona-bron-twardziel", "ulubiona-bron-zlodziej", "ulubiona-bron-zwiadowca"]);

/** Szybka gadka (Cwaniak 3, s. 73) — Testy Wpływania (s. 41); Szybkie badanie (Spec 2, s. 78) — Badanie, Test INT. */
export const UMIEJETNOSCI_AKCJI = Object.freeze({
  "szybka-gadka": Object.freeze({ akcja: "Wpływanie", skille: Object.freeze(["osz", "per", "wys", "zas", "tre"]), cecha: null }),
  "szybkie-badanie": Object.freeze({ akcja: "Badanie", skille: Object.freeze(["his", "med", "prz", "sle", "tch"]), cecha: "int" })
});
