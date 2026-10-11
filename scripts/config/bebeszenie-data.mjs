/**
 * Neuroshima 5e — bebeszenie: dane i czyste zasady (PLAN_m5_postoj.md §7.1, U15–U20, E0).
 *
 * Tabele bebeszenia bestii i maszyn (s. 269) przepisane ręcznie; WKK — wiersze Malutkiej bestii i Ogromnej
 * maszyny (`wkk/config/bebeszenie-kobalt.mjs`, D36). Odczyty MG luk RAW:
 *   - czas ÷ liczba osób (wykonawca + pomocnicy, D12) i ÷ liczba rodzajów przy jednym surowcu (U18);
 *   - powtórka po porażce działa rekurencyjnie na reszcie puli (U17): 10% teraz, 50% przepada, 40% zostaje;
 *   - tabela z kategorii istoty (U16), hybrydy — wybór w oknie.
 *
 * Pula w kilogramach z tabel; `naJednostki` przelicza na jednostki surowców modułu (1 gb = 100 g CH/CE/CZ,
 * 1 kg MK/MO) i sztuki mięsa (`prowiant:mieso`, 1 kg). Czysty: bez `game`.
 */

import { BESTIA_MALUTKA_KOBALT, MASZYNA_OGROMNA_KOBALT } from "../wkk/config/bebeszenie-kobalt.mjs";
import { SUROWCE_BY_CODE } from "./surowce-data.mjs";

/** Rozmiary dnd5e → nazwy z tabel (s. 269). */
export const ROZMIARY = Object.freeze({
  tiny: "Malutki", sm: "Mały", med: "Średni", lg: "Duży", huge: "Wielki", grg: "Ogromny"
});

const B = (minuty, st, MO, mieso) => Object.freeze({ minuty, st, kg: Object.freeze({ MO, mieso }) });
const MS = (minuty, st, CH, MK, CE, CZ) => Object.freeze({ minuty, st, kg: Object.freeze({ CH, MK, CE, CZ }) });

/** Tabela bebeszenia bestii (s. 269). Bez wiersza Malutki (WKK D36). */
export const BESTIE = Object.freeze({
  sm: B(30, 5, 10, 20),
  med: B(60, 10, 20, 40),
  lg: B(120, 15, 100, 200),
  huge: B(480, 20, 500, 2000),
  grg: B(1440, 20, 1000, 10000)
});

/** Tabela bebeszenia maszyn Molocha i SMARTa (s. 269). Bez wiersza Ogromny (WKK D36). */
export const MASZYNY = Object.freeze({
  tiny: MS(60, 5, 0.5, 5, 0.5, 1),
  sm: MS(120, 10, 2, 20, 2, 4),
  med: MS(480, 15, 5, 50, 5, 10),
  lg: MS(960, 20, 20, 500, 10, 20),
  huge: MS(1920, 25, 50, 3000, 50, 100)
});

/** Narzędzia i testy (s. 269). `pomocnik` — test pomocnika z narzędziami, ST 10 → Ułatwienie. */
export const TABELE_BEBESZENIA = Object.freeze({
  bestie: Object.freeze({
    label: "Bebeszenie bestii", narzedzia: Object.freeze(["rzeznika", "medyka"]),
    test: Object.freeze({ cecha: "wis", umiejetnosc: "sur" }), pomocnik: Object.freeze({ cecha: "wis", umiejetnosc: "sur", st: 10 }),
    rodzaje: Object.freeze(["MO", "mieso"])
  }),
  maszyny: Object.freeze({
    label: "Bebeszenie maszyn", narzedzia: Object.freeze(["elektronika", "mechanika", "kowala"]),
    test: Object.freeze({ cecha: "int", umiejetnosc: "tch" }), pomocnik: Object.freeze({ cecha: "int", umiejetnosc: "tch", st: 10 }),
    rodzaje: Object.freeze(["CH", "MK", "CE", "CZ"])
  })
});

/** Porażka (s. 269): 10% teraz, 50% przepada, 40% zostaje do kolejnej próby. */
export const PORAZKA = Object.freeze({ zysk: 0.1, strata: 0.5, reszta: 0.4 });

/** Hybrydy (§4 F11): maszyny z bio i organiczne z techniką — wybór tabeli w oknie, domyślnie z kategorii. */
export const HYBRYDY = Object.freeze(["biodroid", "pulser", "generacja-iii-techmutas", "techmorwa-malutka", "techmorwa-srednia"]);

/** Kategorie, przy których bebeszenie idzie z wiadomością publiczną (D10). */
export const KATEGORIE_JAWNE = Object.freeze(["czlowiek", "mutant"]);

/**
 * Tabela dla istoty (U16): maszyna → maszyny, reszta → bestie.
 * @param {{kategoria?: string, id?: string}} istota  `kategoria` — `creatureType` Bestiariusza
 * @returns {{tabela: "bestie"|"maszyny", hybryda: boolean, jawne: boolean}}
 */
export function tabelaDla(istota) {
  const tabela = istota?.kategoria === "maszyna" ? "maszyny" : "bestie";
  return {
    tabela,
    hybryda: HYBRYDY.includes(istota?.id),
    jawne: KATEGORIE_JAWNE.includes(istota?.kategoria)
  };
}

/**
 * Wiersz tabeli dla rozmiaru; WKK dokłada Malutką bestię i Ogromną maszynę (D36).
 * @returns {{minuty: number, st: number, kg: Record<string, number>, wkk?: boolean}|null}
 */
export function wierszBebeszenia(tabela, rozmiar, { kobalt = false } = {}) {
  const t = tabela === "maszyny" ? MASZYNY : BESTIE;
  if (t[rozmiar]) return t[rozmiar];
  if (!kobalt) return null;
  if (tabela === "bestie" && rozmiar === "tiny") return { ...BESTIA_MALUTKA_KOBALT, wkk: true };
  if (tabela === "maszyny" && rozmiar === "grg") return { ...MASZYNA_OGROMNA_KOBALT, wkk: true };
  return null;
}

/**
 * Pula bebeszenia w kg (U17, U19). Maszyna po wybuchu autodestrukcji — tylko MK (s. 204).
 * @param {"bestie"|"maszyny"} tabela
 * @param {string} rozmiar
 * @param {{autodestrukcja?: "wybuch"|null, kobalt?: boolean}} [o]
 * @returns {Record<string, number>|null}
 */
export function pulaBebeszenia(tabela, rozmiar, { autodestrukcja = null, kobalt = false } = {}) {
  const w = wierszBebeszenia(tabela, rozmiar, { kobalt });
  if (!w) return null;
  const pula = { ...w.kg };
  if (tabela === "maszyny" && autodestrukcja === "wybuch") {
    for (const r of ["CE", "CH", "CZ"]) pula[r] = 0;
  }
  return pula;
}

/**
 * Wynik próby (s. 269, U17). Sukces — cała pula (albo zakres jednego surowca); porażka — 10% teraz, 50% przepada,
 * 40% zostaje na kolejną próbę (rekurencyjnie, tymi samymi zasadami).
 * @param {{pula: Record<string, number>, sukces: boolean, zakres?: string|null}} o  `zakres` — jeden surowiec
 * @returns {{zysk: Record<string, number>, strata: Record<string, number>, reszta: Record<string, number>}}
 */
export function wynikBebeszenia({ pula, sukces, zakres = null }) {
  const zysk = {}, strata = {}, reszta = {};
  for (const [r, kg] of Object.entries(pula ?? {})) {
    const v = Math.max(0, Number(kg) || 0);
    const objety = !zakres || zakres === r;
    if (!objety) { reszta[r] = v; continue; }
    if (sukces) { zysk[r] = v; reszta[r] = 0; continue; }
    zysk[r] = v * PORAZKA.zysk;
    strata[r] = v * PORAZKA.strata;
    reszta[r] = v * PORAZKA.reszta;
  }
  return { zysk, strata, reszta };
}

/**
 * Czas bebeszenia w minutach (D12, U17, U18): czas wiersza × część puli, ÷ liczba osób, × 1 / liczba rodzajów
 * przy jednym surowcu. Pole do nadpisania w oknie.
 * @param {{wiersz: object, pomocnicy?: number, zakres?: string|null, pula?: Record<string, number>}} o
 */
export function czasBebeszenia({ wiersz, pomocnicy = 0, zakres = null, pula = null }) {
  if (!wiersz) return 0;
  const pelna = Object.values(wiersz.kg).reduce((a, b) => a + b, 0);
  const teraz = pula ? Object.values(pula).reduce((a, b) => a + (Number(b) || 0), 0) : pelna;
  const czesc = pelna > 0 ? Math.min(1, teraz / pelna) : 1;
  const rodzaje = Object.keys(wiersz.kg).length;
  const zakresM = zakres ? 1 / rodzaje : 1;
  const osoby = 1 + Math.max(0, Math.floor(Number(pomocnicy) || 0));
  return Math.max(1, Math.ceil(wiersz.minuty * czesc * zakresM / osoby));
}

/**
 * Kilogramy → jednostki modułu: surowce w jednostkach 1 gb (CH/CE/CZ ×10 na kg, MK/MO ×1), mięso w sztukach
 * `prowiant:mieso` (1 kg). Ułamki w dół — reszta poniżej jednostki przepada.
 * @returns {{surowce: Record<string, number>, mieso: number}}
 */
export function naJednostki(kg) {
  const surowce = {};
  let mieso = 0;
  for (const [r, v] of Object.entries(kg ?? {})) {
    if (r === "mieso") { mieso = Math.floor(Math.max(0, v) + 1e-9); continue; }
    const t = SUROWCE_BY_CODE[r];
    if (!t) continue;
    const n = Math.floor(Math.max(0, v) * t.gbPerKg + 1e-9);
    if (n > 0) surowce[r] = n;
  }
  return { surowce, mieso };
}

/** Pusta pula — nic więcej do wybebeszenia. */
export function pulaPusta(pula) {
  return Object.values(pula ?? {}).every(v => !(Number(v) > 1e-9));
}
