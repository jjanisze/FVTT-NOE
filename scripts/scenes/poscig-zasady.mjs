/**
 * Neuroshima 5e — zasady pościgu: czyste funkcje (PLAN_m4_pojazdy §6.2.5, P5, D34–D41; RAW s. 266–268).
 *
 * Bez `game`, bez dokumentów — pod Quench. Haki, karty i przyciski: `poscig-tura.mjs`; geometria planszy
 * (tor = znacznik): `poscig.mjs`, metryka drogi: `droga.mjs`.
 *
 *  - **Zapas metrów (D34, RAI):** reszta drogi poniżej pełnego znacznika przechodzi na następną turę, najwyżej 35 m;
 *    niewykorzystane pełne znaczniki przepadają jak w RAW. Autobus (24 m) awansuje dwa razy na trzy tury.
 *  - **Test Pościgu (D35):** nat. 20 — bez komplikacji i +1 znacznik; nat. 1 — dwie; porażka — jedna.
 *  - **Komplikacje k20 (D36, s. 267)** — dane `KOMPLIKACJE_POSCIGU`: parafraza i skutek do przycisków.
 *  - **Atak na kierowcę (D36):** Test (Pojazdy) ST max(10, ½ obrażeń); porażka — −1 znacznik, o 5+ — Przewrócenie.
 *  - **Wręcz na znaczniku (D37):** ten sam znacznik = zasięg wręcz; jedyny wyjątek od metryki drogi (D27).
 *  - **Dryf (D38):** wszystko poza pojazdami i jadącymi cofa się o 3 znaczniki na rundę.
 *  - **Koniec (D40):** przewaga 7, po 10 rundach najdalszy, wyeliminowany, meta.
 */

import { METRY_NA_ZNACZNIK, PRZEWAGA_KONCZACA, RUND_MAKS } from "../config/vehicles-data.mjs";

/** Największy zapas metrów (D34): mniej niż jeden znacznik. */
export const ZAPAS_MAKS = METRY_NA_ZNACZNIK - 1;

/** Dryf drogi na rundę (D38, RAW: „cofają się o trzy znaczniki pościgu na rundę”). */
export const DRYF_ZNACZNIKOW = 3;

/**
 * Limit znaczników w tej turze: ⌊(budżet + zapas) / 36⌋. Budżet = Szybkość efektywna + dodatki palety.
 * @param {number} budzet  metry
 * @param {number} [zapas]  metry z poprzedniej tury
 */
export function limitZnacznikow(budzet, zapas = 0) {
  return Math.max(0, Math.floor(((Number(budzet) || 0) + (Number(zapas) || 0)) / METRY_NA_ZNACZNIK));
}

/**
 * Zapas na następną turę (D34): budżet + poprzedni zapas − 36 × przebyte znaczniki, w [0, 35].
 * @param {number} budzet
 * @param {number} zapas
 * @param {number} przebyte  pełne znaczniki przejechane w tej turze (bez ruchów wymuszonych)
 */
export function zapasPoTurze(budzet, zapas, przebyte) {
  const reszta = (Number(budzet) || 0) + (Number(zapas) || 0) - METRY_NA_ZNACZNIK * Math.max(0, Number(przebyte) || 0);
  return Math.max(0, Math.min(ZAPAS_MAKS, Math.round(reszta * 10) / 10));
}

/** Pełne znaczniki z drogi przejechanej w turze (36 m na tor, metryka drogi — D27). */
export function przebyteZnaczniki(metry) {
  return Math.max(0, Math.round((Number(metry) || 0) / METRY_NA_ZNACZNIK));
}

/**
 * Wynik Testu Pościgu (D35). `naturalny` — wynik k20 (po Ułatwieniu/Utrudnieniu).
 * @returns {{komplikacje: number, znacznik: number, awaria: boolean, rodzaj: "nat20"|"sukces"|"porazka"|"nat1"}}
 */
export function wynikTestuPoscigu(total, st, naturalny) {
  if (naturalny === 20) return { komplikacje: 0, znacznik: 1, awaria: false, rodzaj: "nat20" };
  const awaria = Number.isFinite(total) && total < st - 5; // porażka o 6+ (RAW s. 264: każdy Test (Pojazdy))
  if (naturalny === 1) return { komplikacje: 2, znacznik: 0, awaria, rodzaj: "nat1" };
  if (total >= st) return { komplikacje: 0, znacznik: 0, awaria: false, rodzaj: "sukces" };
  return { komplikacje: 1, znacznik: 0, awaria, rodzaj: "porazka" };
}

/** ST Testu (Pojazdy) trafionego kierowcy (D36, s. 266): 10 albo połowa obrażeń. */
export function stAtakuNaKierowce(obrazenia) {
  return Math.max(10, Math.floor((Number(obrazenia) || 0) / 2));
}

/** Skutek porażki trafionego kierowcy: −1 znacznik, o 5+ — Przewrócenie (awaria 8). */
export function skutekAtakuNaKierowce(total, st) {
  if (total >= st) return null;
  return st - total >= 5 ? "przewrocenie" : "cofnij";
}

/** Wręcz na planszy (D37): ten sam znacznik — w zasięgu, bez względu na rząd. */
export function wZasieguWreczNaPlanszy(torA, torB) {
  return Number.isFinite(torA) && torA === torB;
}

/**
 * Dryf (D38): nowy tor rzeczy na drodze i pojazdy minięte po drodze (tory, które dryf przekroczył).
 * @param {number} tor  tor rzeczy przed dryfem
 * @param {{id: string, tor: number}[]} pojazdy
 * @returns {{tor: number, minieci: string[]}}
 */
export function dryf(tor, pojazdy = [], o = DRYF_ZNACZNIKOW) {
  const nowy = tor - o;
  const minieci = pojazdy.filter(p => p.tor < tor && p.tor >= nowy).map(p => p.id);
  return { tor: nowy, minieci };
}

/**
 * Warunki końca pościgu (D40), sprawdzane na początku rundy.
 * @param {{przewaga: number|null, runda: number, wyeliminowani: string[], naMecie: string[]}} s
 * @returns {string[]}  powody (puste — pościg trwa)
 */
export function warunkiKonca({ przewaga = null, runda = 1, wyeliminowani = [], naMecie = [] } = {}) {
  const out = [];
  if (przewaga !== null && przewaga >= PRZEWAGA_KONCZACA) out.push(`Ścigany ma ${przewaga} znaczników przewagi (próg: ${PRZEWAGA_KONCZACA}).`);
  if (runda > RUND_MAKS) out.push(`Minęło ${RUND_MAKS} rund — wygrywa ten, kto jest najdalej.`);
  for (const n of wyeliminowani) out.push(`${n} — wyeliminowany (wrak albo trwałe zatrzymanie).`);
  for (const n of naMecie) out.push(`${n} — na mecie.`);
  return out;
}

/**
 * Tabela komplikacji pościgu k20 (s. 267) — parafrazy (repozytorium publiczne). `skutek` mówi kartom, jakie przyciski
 * pokazać: `awaria` (losuj z Tabeli awarii), `szybkoscPolowa`, `obrazenia` (wzór pojazdowi), `kontakt` (bez kontaktu
 * wzrokowego), `znaczniki` (ruch wymuszony), `roJadacych` (RO pasażerów), `test` (test kierowcy z dalszym skutkiem),
 * `trudnyTeren`, `przepasc`, `roKierowcy`.
 * @type {{od: number, do: number, nazwa: string, opis: string, skutek: object}[]}
 */
export const KOMPLIKACJE_POSCIGU = Object.freeze([
  { od: 1, do: 3, nazwa: "Nagła awaria pojazdu", opis: "Coś w pojeździe odmawia posłuszeństwa — wylosuj awarię.", skutek: { awaria: true } },
  { od: 4, do: 4, nazwa: "Guma albo napęd", opis: "Szybkość pojazdu spada o połowę (naprawa jak awaria 2).", skutek: { szybkoscPolowa: true } },
  { od: 5, do: 5, nazwa: "Poślizg", opis: "Test (Pojazdy) ST 20, inaczej Przewrócenie.", skutek: { test: { umiejetnosc: "poj", st: 20, porazka: [{ awaria: 8 }] } } },
  { od: 6, do: 6, nazwa: "Przydrożny wrak", opis: "Pojazd zahacza o wrak: 2k12 obrażeń.", skutek: { obrazenia: "2d12" } },
  { od: 7, do: 7, nazwa: "Utrata kontaktu wzrokowego", opis: "Do początku następnej tury kierowcy ani wy nie atakujecie przeciwników, ani oni was.", skutek: { kontakt: true } },
  { od: 8, do: 8, nazwa: "Przeszkoda", opis: "Objazd dużej przeszkody — cofasz się o znacznik.", skutek: { znaczniki: -1 } },
  { od: 9, do: 9, nazwa: "Wyboje", opis: "Pasażerowie: RO SIŁ ST 15 albo 1k6 obuchowych; porażka o 5+ — Powalenie.", skutek: { roJadacych: { ability: "str", st: 15, wzor: "1d6", powalenie5: true, kto: "pasazerowie" } } },
  { od: 10, do: 10, nazwa: "Nagły zakręt", opis: "Test (Pojazdy) ST 20, inaczej Przewrócenie.", skutek: { test: { umiejetnosc: "poj", st: 20, porazka: [{ awaria: 8 }] } } },
  { od: 11, do: 11, nazwa: "Zniszczona nawierzchnia", opis: "Trudny teren do końca następnej tury kierowcy.", skutek: { trudnyTeren: true } },
  { od: 12, do: 12, nazwa: "Stromy zjazd", opis: "Test (Pojazdy) ST 15: sukces — znacznik więcej, porażka — Przewrócenie.", skutek: { test: { umiejetnosc: "poj", st: 15, sukces: [{ znaczniki: 1 }], porazka: [{ awaria: 8 }] } } },
  { od: 13, do: 13, nazwa: "Gubisz drogę", opis: "Test MDR (Percepcja) ST 20, inaczej −2 znaczniki i Utrata kontaktu wzrokowego.", skutek: { test: { umiejetnosc: "prc", st: 20, porazka: [{ znaczniki: -2 }, { kontakt: true }] } } },
  { od: 14, do: 14, nazwa: "Zwierzak albo pojazd na drodze", opis: "Test (Pojazdy) ST 15, inaczej potrącenie: k4 — wielka 6k10, duża 4k10, średnia 2k10, mała 1k10.", skutek: { test: { umiejetnosc: "poj", st: 15, porazka: [{ przeszkoda: true }] } } },
  { od: 15, do: 15, nazwa: "Dziura albo przepaść", opis: "Zatrzymaj się (Hample) albo skacz; k4 — 18, 9, 6 albo 3 m. Przepaść zostaje na drodze dla tych za pojazdem.", skutek: { przepasc: true } },
  { od: 16, do: 16, nazwa: "Podmuch wiatru", opis: "Test (Pojazdy) ST 20, inaczej −1 znacznik.", skutek: { test: { umiejetnosc: "poj", st: 20, porazka: [{ znaczniki: -1 }] } } },
  { od: 17, do: 17, nazwa: "Chmara owadów", opis: "Kierowca i pasażerowie: RO KON ST 15, inaczej bez akcji i akcji bonusowej w najbliższej turze.", skutek: { roJadacych: { ability: "con", st: 15, kto: "wszyscy", porazkaTekst: "bez akcji i akcji bonusowej w najbliższej turze" } } },
  { od: 18, do: 18, nazwa: "Oślepiające światło", opis: "Kierowca: RO KON ST 15, inaczej Oślepienie do końca następnej tury.", skutek: { roJadacych: { ability: "con", st: 15, kto: "kierowca", oslepienie: true } } },
  { od: 19, do: 19, nazwa: "Zjazd z wygodnej trasy", opis: "Cofasz się o znacznik.", skutek: { znaczniki: -1 } },
  { od: 20, do: 20, nazwa: "Wąski przesmyk", opis: "Test (Pojazdy) ST 15, inaczej 2k12 obrażeń.", skutek: { test: { umiejetnosc: "poj", st: 15, porazka: [{ obrazenia: "2d12" }] } } }
]);

/** Wpis tabeli komplikacji dla wyniku k20. */
export function komplikacja(k20) {
  const n = Number(k20);
  return KOMPLIKACJE_POSCIGU.find(k => n >= k.od && n <= k.do) ?? null;
}

/** k4 przeszkody z komplikacji 14 → rozmiar i obrażenia. */
export const PRZESZKODY_K4 = Object.freeze({ 1: ["wielka", "6d10"], 2: ["duża", "4d10"], 3: ["średnia", "2d10"], 4: ["mała", "1d10"] });

/** k4 przepaści z komplikacji 15 → szerokość w metrach. */
export const PRZEPASCI_K4 = Object.freeze({ 1: 18, 2: 9, 3: 6, 4: 3 });
