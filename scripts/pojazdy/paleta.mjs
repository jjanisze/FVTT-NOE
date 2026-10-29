/**
 * Neuroshima 5e — paleta kierowcy (PLAN_m4_pojazdy D41, D44, §4.6, pakiet K1; RAW s. 261–264).
 *
 * Jeden przycisk na HUD-zie pojazdu i kierowcy otwiera okno z tym, co kierowca może zrobić pojazdem: akcje cech z
 * katalogu (Gaz do dechy, Szósty bieg, Przerzutka, Akrobacja, Skok, Syrena, Działko wodne, Lemiesz, Uciąg, Ollie;
 * Slalom jako Reakcja), bieg wsteczny, a na planszy pościgu — manewry (P5c dopisuje je do `POZYCJE`). Wybór = karta
 * na czacie + efekt na aktorze pojazdu, który zmienia budżet jazdy, ST i Utrudnienia. Koszt akcji oznaczany, nie
 * pobierany (D7); nie-kierowca widzi paletę tylko do odczytu.
 *
 * ## Efekt palety
 *
 * Aktywny efekt na aktorze pojazdu z flagą `paleta: {id, walka, runda, tura, czas, faza}`. Części efektu wygasają
 * w dwóch chwilach (RAW: „do początku twojej następnej tury”, „do końca następnej tury”):
 *
 *   - `faza 0` — wszystko działa;
 *   - początek następnej tury kierowcy → `faza 1`: zostaje tylko to, co trwa „do końca następnej tury” (ST +5 Gazu do
 *     dechy), albo efekt znika;
 *   - koniec tej tury → efekt znika.
 *
 * Zdejmuje aktywny MG (`combatTurnChange`, tylko krok naprzód); poza walką — zegar świata (runda = 6 s, jak zegary
 * awarii). Przełączniki (wsteczny — do początku następnej tury kierowcy, Uciąg — do wyłączenia) to te same efekty.
 * Przerzutka to stan roweru (`flags.<mod>.przerzutka`), nie efekt.
 *
 * Kto czyta: budżet jazdy i skręty — `jazda.mjs` (`budzetPalety`, `wstecznyPojazdu`), obrót przy cofaniu —
 * `zeton.mjs`, ST i Ułatwienia Testów (Pojazdy) kierowcy — hak `dnd5e.preRollSkill` tutaj (jak Rajdowiec), Utrudnienia
 * ataków — źródło okoliczności tutaj, Slalom — hak RO pojazdu tutaj.
 */

import { kartaPostoju, wyslijKarte, zarejestrujAkcje } from "../postoj/karty.mjs";
import { zarejestrujZrodloOkolicznosci } from "../combat/okolicznosci.mjs";
import { change, CHANGE_TYPE } from "../config/effect-changes.mjs";
import { CECHY_POJAZDOW, cechyPojazdu } from "../config/vehicles-data.mjs";
import { krokNaprzod } from "../combat/tiki.mjs";
import {
  MODULE_ID, danePojazdu, jadacyPojazdu, jazdaZetonu, jestPojazdem, jestZetonemPojazdu, miejsceOId, pojazdJadacego, trybSceny
} from "./stan.mjs";
import { xNaTor } from "../scenes/poscig.mjs";
import { kierowcaPojazdu } from "./jadacy.mjs";
import { aktywneAwariePojazdu } from "./awarie.mjs";

export const FLAGA_PALETY = "paleta";
export const FLAGA_PRZERZUTKI = "przerzutka";
const MOVE = "system.attributes.movement.speeds.walk";
const RUNDA_S = () => Number(CONFIG.time?.roundTime) || 6;
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/** Przełożenia roweru (s. 263): mnożnik Szybkości rowerzysty. */
export const PRZELOZENIA = Object.freeze({
  szosowe: { nazwa: "Szosowe", mnoznik: 3, opis: "dobra droga" },
  standardowe: { nazwa: "Standardowe", mnoznik: 2, opis: "nie w trudnym terenie" },
  terenowe: { nazwa: "Terenowe", mnoznik: 1, opis: "trudny, stabilny teren" }
});

const CZAS = { akcja: "A", bonus: "B", reakcja: "R", przelacznik: "—" };

/**
 * Pozycje palety. Pola efektu (czyta `budzetPalety`): `ruch` — dodatkowy ruch w Szybkościach pojazdu, `st` — ST
 * Testów (Pojazdy), `ulatwienie`/`utrudnienie` tych testów, `atak` — Utrudnienie ataków (`atakNa`: "wszyscy" — pojazd
 * i jadący, "kierowca" — pojazd i kierowca), `wsteczny`, `slalom`; `wygasa` — która część żyje „do końca następnej
 * tury” (reszta: do jej początku); `bezEfektu` — tylko karta; `trwale` — przełącznik bez wygaśnięcia.
 * `cecha` — pozycja widoczna, gdy pojazd ma tę cechę; `kiedy(dane)` — dodatkowy warunek.
 * @type {Record<string, object>}
 */
export const POZYCJE = {
  gazDoDechy: {
    nazwa: "Gaz do dechy", czas: "bonus", cecha: "gazDoDechy", ikona: "fa-solid fa-gauge-high",
    ruch: 2, st: 5, atak: true, atakNa: "wszyscy", wygasa: { st: "koniec" }, blokujaAwarie: [11], wyklucza: ["ostroznaJazda"],
    skutek: "Do początku następnej tury kierowcy: dodatkowy ruch = Szybkość ×2; ataki na pojazd i jadących oraz ataki jadących z Utrudnieniem. ST Testów (Pojazdy) +5 do końca następnej tury. Trudny teren albo przeszkoda — przewrócenie, 4k10 pojazdowi i jadącym (s. 264)."
  },
  szostyBieg: {
    nazwa: "Szósty bieg", czas: "bonus", cecha: "szostyBieg", ikona: "fa-solid fa-gauge-high",
    ruch: 2, st: 5, atak: true, atakNa: "kierowca", wygasa: { st: "koniec" }, blokujaAwarie: [11], wyklucza: ["ostroznaJazda"],
    skutek: "Do początku następnej tury kierowcy: dodatkowy ruch = Szybkość ×2; ataki na motocykl i kierowcę oraz ataki kierowcy z Utrudnieniem. ST Testów (Pojazdy) +5 do końca następnej tury (s. 263)."
  },
  slalom: {
    nazwa: "Slalom", czas: "reakcja", cecha: "slalom", ikona: "fa-solid fa-route", slalom: true,
    skutek: "Ułatwienie do najbliższego Rzutu Obronnego pojazdu na Zręczność (do początku następnej tury kierowcy)."
  },
  syrena: {
    nazwa: "Syrena", czas: "bonus", cecha: "syrena", ikona: "fa-solid fa-bullhorn",
    skutek: "Do następnej tury kierowcy: Utrudnienie do Testów MDR (Percepcja) opartych na słuchu w promieniu 30 m — rozstrzyga MG (WKK)."
  },
  dzialkoWodne: {
    nazwa: "Działko wodne", czas: "akcja", cecha: "dzialkoWodne", ikona: "fa-solid fa-faucet-drip", bezEfektu: true, stanowisko: true,
    ro: { ability: "str", st: 13, porazka: "odepchnięcie o 3 m i Powalenie" },
    skutek: "Ze stanowiska: linia 18 m. Gasi Podpalenie i ogień; istoty w linii — RO SIŁ ST 13 albo odepchnięte o 3 m i Powalone. Zbiornik na 10 strzałów (WKK)."
  },
  lemiesz: {
    nazwa: "Lemiesz", czas: "akcja", cecha: "lemiesz", ikona: "fa-solid fa-snowplow", bezEfektu: true,
    ro: { ability: "str", st: 15, porazka: "przepchnięcie i Powalenie" },
    skutek: "Spycha przeszkody i mniejsze pojazdy; istoty przed lemieszem — RO SIŁ ST 15 albo przepchnięte i Powalone (WKK)."
  },
  uciag: {
    nazwa: "Uciąg", czas: "akcja", cecha: "uciag", ikona: "fa-solid fa-link", trwale: true, przelacznik: true,
    zmiany: [change(MOVE, CHANGE_TYPE.multiply, "0.5")],
    skutek: "Holowanie pojazdu do swojego rozmiaru albo przyczepy: Szybkość ×½ (holowany — też, MG). Przełącznik — zdejmij po odczepieniu (WKK)."
  },
  akrobacja: {
    nazwa: "Akrobacja", czas: "akcja", cecha: "akrobacja", ikona: "fa-solid fa-person-biking", bezEfektu: true, test: true,
    skutek: "Raz w turze, za połowę Szybkości: jazda na jednym kole, bez trzymanki, nawrót w miejscu. Porażka — Powalenie i zatrzymanie (s. 263)."
  },
  skok: {
    nazwa: "Skok", czas: "akcja", ikona: "fa-solid fa-arrow-up-right-dots", bezEfektu: true, test: true,
    kiedy: d => d.cechy.some(c => c.id.startsWith("skok")),
    skutek: "Po rozbiegu prosto w tej turze — skok przez przeszkodę lub przepaść; lądowanie — obrażenia od upadku (s. 262–264)."
  },
  ollie: {
    nazwa: "Ollie", czas: "akcja", cecha: "ollie", ikona: "fa-solid fa-person-skating", bezEfektu: true, test: true,
    skutek: "Raz w turze za ½ Szybkości: przeskok przez krawężnik lub przeszkodę do 1 m. Porażka — Powalenie (WKK)."
  },
  wsteczny: {
    nazwa: "Bieg wsteczny", czas: "przelacznik", ikona: "fa-solid fa-backward", przelacznik: true, wsteczny: true,
    kiedy: d => !!d.katalog.silnik,
    skutek: "Pojazd cofa przodem do przodu: droga liczy się ×2 (połowa Szybkości, s. 261), z cechą Cofanie autobusu i ciężarówki ×4; z cechą Cofanie Testy (Pojazdy) z Utrudnieniem. Wyłącza się na początku następnej tury kierowcy."
  },

  // Manewry kierowcy — tylko na planszy pościgu (P5c, D41; s. 268). Dalsze kroki (testy, ruchy wymuszone,
  // komplikacje) to przyciski kart obsługiwane przez `scenes/poscig-tura.mjs`.
  gazu: {
    nazwa: "Gazu!", czas: "akcja", plansza: true, ikona: "fa-solid fa-forward-fast", ruch: 1, blokujaAwarie: [11],
    skutek: "Do początku następnej tury kierowcy dodatkowy ruch równy Szybkości pojazdu (s. 268)."
  },
  hample: {
    nazwa: "Hample", czas: "bonus", plansza: true, ikona: "fa-solid fa-hand", hample: true,
    skutek: "Gwałtowne hamowanie: Test (Pojazdy) ST 10, inaczej komplikacja; natychmiast −2 znaczniki. Kierowcy jadących pojazdów na tych znacznikach — Test (Pojazdy) ST 10 albo kolizja (MG) (s. 268)."
  },
  obrot180: {
    nazwa: "Obrót 180°", czas: "akcja", plansza: true, ikona: "fa-solid fa-rotate", bezEfektu: true,
    skutek: "Tylko pojazdy Wielkie i mniejsze. Test (Pojazdy) ST 20, inaczej Przewrócenie; natychmiast −2 znaczniki, dalej jazda w drugą stronę (rola — MG). Jadący pojazd na tym znaczniku — Test (Pojazdy) ST 15 albo kolizja (s. 268)."
  },
  ostroznaJazda: {
    nazwa: "Ostrożna jazda", czas: "akcja", plansza: true, ikona: "fa-solid fa-gauge-simple-min",
    ulatwienie: true, zmiany: [change(MOVE, CHANGE_TYPE.multiply, "0.5")], wyklucza: ["gazDoDechy", "szostyBieg"],
    skutek: "Do początku następnej tury kierowcy: Szybkość ×½ i Ułatwienie do Testów (Pojazdy); nie razem z Gazem do dechy ani Szóstym biegiem (s. 268)."
  },
  stukniecie: {
    nazwa: "Stuknięcie", czas: "akcja", plansza: true, ikona: "fa-solid fa-car-burst", bezEfektu: true, cel: true,
    skutek: "Wyceluj pojazd (albo jadącego w nim) na tym samym znaczniku, co najwyżej twojego rozmiaru. Test (Pojazdy) ST 10, porażka o 5+ — komplikacja; sukces — kierowca celu: Test ST 15 (z Utrudnieniem, gdy twój pojazd większy), porażka — komplikacja (s. 268)."
  },
  zajechanie: {
    nazwa: "Zajechanie", czas: "akcja", plansza: true, ikona: "fa-solid fa-road-barrier", bezEfektu: true, cel: true,
    skutek: "Wyceluj pojazd na tym samym znaczniku. Test (Pojazdy) ST 10, porażka o 5+ — komplikacja; sukces — Szybkość celu ×½ do końca jego następnej tury (s. 268)."
  },

  // Bez pozycji w palecie — zakładają je komplikacje i manewry (`nalozEfektPalety`), wygasają jak paleta.
  kontakt: { nazwa: "Bez kontaktu wzrokowego", ukryta: true, ikona: "fa-solid fa-eye-slash", kontakt: true,
    skutek: "Komplikacja 7: do początku następnej tury kierowcy ani jadący nie atakują przeciwników, ani oni ich (s. 267)." },
  nawierzchnia: { nazwa: "Zniszczona nawierzchnia", ukryta: true, ikona: "fa-solid fa-road-circle-exclamation",
    zmiany: [change(MOVE, CHANGE_TYPE.multiply, "0.5")], wygasa: { zmiany: "koniec" },
    skutek: "Komplikacja 11: trudny teren do końca następnej tury kierowcy — Szybkość ×½ (s. 261, 267)." },
  zajechany: { nazwa: "Zajechana droga", ukryta: true, ikona: "fa-solid fa-road-barrier",
    zmiany: [change(MOVE, CHANGE_TYPE.multiply, "0.5")], wygasa: { zmiany: "koniec" },
    skutek: "Zajechanie: Szybkość ×½ do końca następnej tury kierowcy (s. 268)." },
  oslepienie: { nazwa: "Oślepiające światło", ukryta: true, ikona: "fa-solid fa-sun", statusy: ["blinded"], wygasa: { statusy: "koniec" },
    skutek: "Komplikacja 18: kierowca Oślepiony do końca następnej tury (s. 267)." }
};

/** Skok wg cechy: rozbieg (m), test i ST. */
const SKOKI = {
  skokOsobowki: { rozbieg: 72, umiejetnosc: "poj", st: 20, porazka: "przewrocenie" },
  skokAutobusu: { rozbieg: 72, umiejetnosc: "poj", st: 20, porazka: "przewrocenie" },
  skokMotocykla: { rozbieg: 36, umiejetnosc: "poj", st: 20, porazka: "powalenie" },
  skokRoweru: { rozbieg: 18, umiejetnosc: "akr", st: 15, porazka: "powalenie" }
};

/* -------------------------------------------- */
/*  Czyste funkcje                               */
/* -------------------------------------------- */

/**
 * Działające części efektów palety → liczby dla budżetu, testów i ataków. Czysta.
 * @param {{id: string, faza?: number}[]} wpisy  flagi `paleta` aktywnych efektów
 * @param {{cwierc?: boolean, cofanie?: boolean}} [o]  cecha Cofanie pojazdu
 * @returns {{ruch: number, st: number, ulatwienie: boolean, utrudnienie: boolean, atak: string|null,
 *   mnoznikDrogi: number, wsteczny: boolean, slalom: boolean, nazwy: string[]}}
 */
export function budzetPalety(wpisy, { cwierc = false, cofanie = false } = {}) {
  const out = { ruch: 0, st: 0, ulatwienie: false, utrudnienie: false, atak: null, mnoznikDrogi: 1, wsteczny: false, slalom: false,
    kontakt: false, hample: false, nazwy: [] };
  for (const w of wpisy ?? []) {
    const def = POZYCJE[w?.id];
    if (!def) continue;
    const faza = Number(w.faza) || 0;
    const dziala = czesc => (def.wygasa?.[czesc] === "koniec" ? faza <= 1 : faza === 0);
    let cos = false;
    if (def.ruch && dziala("ruch")) { out.ruch += def.ruch; cos = true; }
    if (def.st && dziala("st")) { out.st += def.st; cos = true; }
    if (def.ulatwienie && dziala("ulatwienie")) { out.ulatwienie = true; cos = true; }
    if (def.utrudnienie && dziala("utrudnienie")) { out.utrudnienie = true; cos = true; }
    if (def.atak && dziala("atak")) {
      out.atak = out.atak === "wszyscy" || def.atakNa === "wszyscy" ? "wszyscy" : "kierowca";
      cos = true;
    }
    if (def.slalom && dziala("slalom")) { out.slalom = true; cos = true; }
    if (def.kontakt && dziala("kontakt")) { out.kontakt = true; cos = true; }
    if (def.hample && dziala("hample")) { out.hample = true; cos = true; }
    if (def.wsteczny && dziala("wsteczny")) {
      out.wsteczny = true;
      out.mnoznikDrogi *= cwierc ? 4 : 2;
      if (cofanie) out.utrudnienie = true;
      cos = true;
    }
    if (cos || def.trwale || def.zmiany) out.nazwy.push(def.nazwa);
  }
  return out;
}

/**
 * Co zrobić z efektem palety przy zmianie tury. Czysta.
 * @param {{walka?: string|null, runda?: number, tura?: number, faza?: number}} f  flaga efektu
 * @param {{walka: string, runda: number, tura: number, krawedz: "start"|"koniec"}} t  tura kierowcy pojazdu
 * @param {object} def  pozycja palety
 * @returns {"zostaw"|"faza1"|"usun"}
 */
export function wygasniecie(f, t, def) {
  if (!def || def.trwale || !f || f.walka !== t.walka) return "zostaw";
  const faza = Number(f.faza) || 0;
  if (t.krawedz === "start") {
    // Następna tura kierowcy = start tury kierowcy później niż chwila założenia efektu.
    const pozniej = t.runda > (f.runda ?? -1) || (t.runda === f.runda && t.tura > (f.tura ?? -1));
    if (faza !== 0 || !pozniej) return "zostaw";
    return Object.values(def.wygasa ?? {}).includes("koniec") ? "faza1" : "usun";
  }
  return faza === 1 ? "usun" : "zostaw";
}

/** Poza walką: faza z zegara świata (runda = 6 s). Czysta. */
export function fazaZCzasu(f, teraz, runda = 6) {
  if (!Number.isFinite(f?.czas)) return Number(f?.faza) || 0;
  const minelo = teraz - f.czas;
  return minelo >= 2 * runda ? 2 : minelo >= runda ? 1 : 0;
}

/* -------------------------------------------- */
/*  Stan pojazdu                                 */
/* -------------------------------------------- */

/** Efekty palety na aktorze pojazdu. */
export function efektyPalety(actor) {
  return actor?.effects?.filter(e => !e.disabled && POZYCJE[e.flags?.[MODULE_ID]?.[FLAGA_PALETY]?.id]) ?? [];
}

function _cofanie(actor) {
  const d = danePojazdu(actor);
  const c = d ? cechyPojazdu(d.podwozie).find(x => x.id === "cofanie") : null;
  return { cofanie: !!c, cwierc: !!c?.cwierc };
}

/** Budżet palety pojazdu (aktor). */
export function paletaPojazdu(actor) {
  return budzetPalety(efektyPalety(actor).map(e => e.flags[MODULE_ID][FLAGA_PALETY]), _cofanie(actor));
}

/** Czy pojazd ma włączony bieg wsteczny (D41). */
export function wstecznyPojazdu(actor) {
  return paletaPojazdu(actor).wsteczny;
}

/** Mnożnik Szybkości rowerzysty z przełożenia (s. 263): domyślnie standardowe ×2. */
export function mnoznikPrzelozenia(actor) {
  return PRZELOZENIA[actor?.flags?.[MODULE_ID]?.[FLAGA_PRZERZUTKI]]?.mnoznik ?? PRZELOZENIA.standardowe.mnoznik;
}

/** Pozycje palety widoczne dla pojazdu: `[{id, def, oznaczenia: string[]}]`. */
export function pozycjePojazdu(pojazdDoc) {
  const actor = pojazdDoc?.actor;
  const dane = danePojazdu(actor);
  if (!dane) return [];
  const cechy = cechyPojazdu(dane.podwozie);
  const ctx = { ...dane, cechy, pojazd: pojazdDoc };
  const awarie = aktywneAwariePojazdu(actor);
  const aktywne = new Set(efektyPalety(actor).map(e => e.flags[MODULE_ID][FLAGA_PALETY].id));
  const out = [];
  const plansza = trybSceny(pojazdDoc.parent) === "plansza";
  for (const [id, def] of Object.entries(POZYCJE)) {
    if (def.ukryta || (def.plansza && !plansza)) continue;
    if (def.cecha && !cechy.some(c => c.id === def.cecha)) continue;
    if (def.kiedy && !def.kiedy(ctx)) continue;
    const oznaczenia = [];
    for (const a of def.blokujaAwarie ?? []) if (awarie.includes(a)) oznaczenia.push(`Awaria ${a} — niedostępne wg RAW (oznaczone, nie blokowane).`);
    for (const w of def.wyklucza ?? []) if (aktywne.has(w)) oznaczenia.push(`Wyklucza ${POZYCJE[w]?.nazwa ?? w} w tej samej turze (s. 268).`);
    if (id === "obrot180" && actor.system?.traits?.size === "grg") oznaczenia.push("Pojazd Ogromny — RAW: tylko Wielkie i mniejsze.");
    out.push({ id, def, aktywna: aktywne.has(id), oznaczenia });
  }
  return out;
}

/* -------------------------------------------- */
/*  Wykonanie                                    */
/* -------------------------------------------- */

function _turaTeraz() {
  const c = game.combat;
  return c?.started ? { walka: c.id, runda: c.round, tura: c.turn } : { walka: null, runda: null, tura: null };
}

/** Czy użytkownik może użyć palety: MG albo właściciel kierowcy (gracz za kierownicą). */
export function mozeUzycPalety(pojazdDoc, user = game.user) {
  if (user.isGM) return true;
  const kier = kierowcaPojazdu(pojazdDoc);
  return !!kier?.actor?.testUserPermission(user, "OWNER");
}

/**
 * Wybór z palety: karta + efekt na pojeździe. Przełącznik aktywny — zdejmuje go.
 * @param {TokenDocument} pojazdDoc
 * @param {string} id  klucz `POZYCJE`
 */
export async function uzyjPalety(pojazdDoc, id) {
  const def = POZYCJE[id];
  const actor = pojazdDoc?.actor;
  if (!def || !jestPojazdem(actor)) return null;
  if (!mozeUzycPalety(pojazdDoc)) return ui.notifications.warn("Paletą steruje kierowca (albo MG).");
  const poz = pozycjePojazdu(pojazdDoc).find(p => p.id === id);
  const kier = kierowcaPojazdu(pojazdDoc);
  const linie = [`<strong>${esc(def.nazwa)}</strong> [${CZAS[def.czas] ?? "—"}] — ${esc(def.skutek)}`];
  const ostrz = [...(poz?.oznaczenia ?? [])];
  if (!kier) ostrz.push("Nikt nie siedzi za kierownicą.");
  const przyciski = [];

  // Przełączniki: drugie kliknięcie zdejmuje.
  const jest = efektyPalety(actor).filter(e => e.flags[MODULE_ID][FLAGA_PALETY].id === id);
  if (def.przelacznik && jest.length) {
    await actor.deleteEmbeddedDocuments("ActiveEffect", jest.map(e => e.id));
    await wyslijKarte(kartaPostoju({ ikona: pojazdDoc.texture.src, tytul: `${def.nazwa} — wyłączone`, rodzaj: "info",
      linie: [`${esc(pojazdDoc.name)}: ${esc(def.nazwa)} — koniec.`] }), { actor: kier?.actor ?? actor });
    return { id, wylaczone: true };
  }

  if (id === "skok") {
    const d = danePojazdu(actor);
    const cecha = cechyPojazdu(d.podwozie).find(c => SKOKI[c.id]);
    const s = SKOKI[cecha?.id];
    if (s) {
      linie.push(`${esc(CECHY_POJAZDOW[cecha.id].opis(cecha))}`);
      const droga = Number(actor.flags?.[MODULE_ID]?.tura?.droga) || 0;
      if (game.combat?.started && droga < s.rozbieg) ostrz.push(`Rozbieg w tej turze: ${droga} m z ${s.rozbieg} m wymaganych (prosto).`);
      if (kier) przyciski.push(_przyciskTestu(kier, pojazdDoc, s.umiejetnosc, s.st, s.porazka));
    }
  }
  if (id === "akrobacja") {
    const c = cechyPojazdu(danePojazdu(actor).podwozie).find(x => x.id === "akrobacja");
    const umiej = c?.test === "pojazdy" ? "poj" : "akr";
    linie.push(`Test ${umiej === "poj" ? "MDR (Pojazdy)" : "ZRC (Akrobatyka)"} ST ${c?.st ?? 10}; koszt: połowa Szybkości (oznaczone).`);
    if (kier) przyciski.push(_przyciskTestu(kier, pojazdDoc, umiej, c?.st ?? 10, "powalenie"));
  }
  if (id === "ollie" && kier) przyciski.push(_przyciskTestu(kier, pojazdDoc, "akr", 10, "powalenie"));
  if (def.ro) {
    if (id === "dzialkoWodne") {
      const zbiornik = Number(actor.flags?.[MODULE_ID]?.zbiornikDzialka ?? 10);
      if (zbiornik <= 0) ostrz.push("Zbiornik pusty — 0 z 10 strzałów.");
      else await actor.setFlag(MODULE_ID, "zbiornikDzialka", zbiornik - 1);
      linie.push(`Zbiornik: <strong>${Math.max(0, zbiornik - 1)}</strong> z 10 strzałów.`);
      const operator = jadacyPojazdu(pojazdDoc).find(t => miejsceOId(actor, jazdaZetonu(t).miejsce)?.stanowisko);
      if (!operator) ostrz.push("Nikt nie stoi przy działku (stanowisko).");
    }
    linie.push("Wyceluj istoty w zasięgu (T) i kliknij — MG rzuca za każdą; porażka: Powalenie zastosowane, przesunięcie — MG na mapie.");
    przyciski.push({ akcja: "pojazd.roCelow", label: `RO ${def.ro.ability === "str" ? "SIŁ" : def.ro.ability.toUpperCase()} ST ${def.ro.st} — wycelowani`,
      ikona: "fa-solid fa-shield-halved", gm: true, dane: { ability: def.ro.ability, st: def.ro.st, porazka: def.ro.porazka, zrodlo: def.nazwa } });
  }
  if (def.plansza) _manewr(id, pojazdDoc, kier, linie, ostrz, przyciski);
  if (id === "wsteczny" && _cofanie(actor).cofanie) linie.push(`Cecha Cofanie: ${_cofanie(actor).cwierc ? "jedna czwarta Szybkości" : "połowa Szybkości"}, Testy (Pojazdy) z Utrudnieniem.`);

  if (!def.bezEfektu) await nalozEfektPalety(actor, id);
  await wyslijKarte(kartaPostoju({ ikona: pojazdDoc.texture.src, tytul: `${def.nazwa} — ${pojazdDoc.name}`,
    podtytul: def.czas === "przelacznik" ? "przełącznik kierowcy" : `[${CZAS[def.czas]}] ${{ akcja: "akcja", bonus: "akcja bonusowa", reakcja: "reakcja" }[def.czas]} kierowcy — koszt oznaczony (D7)`,
    rodzaj: ostrz.length ? "test" : "info", linie, ostrzezenia: ostrz, przyciski }), { actor: kier?.actor ?? actor });
  return { id };
}

/**
 * Efekt palety na aktorze (pojazd albo kierowca): od teraz, wygasa na krawędziach tur kierowcy. Komplikacje i manewry
 * zakładają tędy efekty bez pozycji w palecie (`ukryta`).
 * @param {Actor} actor
 * @param {string} id  klucz `POZYCJE`
 */
export async function nalozEfektPalety(actor, id) {
  const def = POZYCJE[id];
  if (!def || !actor) return null;
  const t = _turaTeraz();
  const [e] = await actor.createEmbeddedDocuments("ActiveEffect", [{
    name: `${def.nazwa}${def.trwale || def.ukryta ? "" : " (paleta)"}`, img: "icons/svg/upgrade.svg",
    description: `<p>${esc(def.skutek)}</p>`, statuses: def.statusy ?? [],
    system: { changes: def.zmiany ?? [] },
    flags: { [MODULE_ID]: { [FLAGA_PALETY]: { id, ...t, czas: t.walka ? null : game.time.worldTime, faza: 0 } } }
  }]);
  return e ?? null;
}

const ROZMIARY = ["tiny", "sm", "med", "lg", "huge", "grg"];

/** Tor pojazdu na planszy (środek żetonu). */
export function torPojazdu(doc) {
  const g = doc.parent.grid.size;
  return xNaTor(doc._source.x + doc._source.width * g / 2);
}

/** Pojazdy na planszy na podanych torach (bez tego). */
function _pojazdyNaTorach(pojazdDoc, tory) {
  return pojazdDoc.parent.tokens.filter(t => t.id !== pojazdDoc.id && jestZetonemPojazdu(t) && tory.includes(torPojazdu(t)));
}

/** Przycisk testu kierowcy pościgu z dalszymi krokami (JSON) — obsługa: `poscig-tura.mjs`. */
export function przyciskTestuPoscigu(pojazdDoc, { label, st, umiejetnosc = "poj", utrudnienie = false, sukces = [], porazka = [], porazka5 = [] }) {
  return { akcja: "poscig.testKierowcy", label, ikona: "fa-solid fa-dice-d20", wlasciciel: true,
    dane: { pojazd: pojazdDoc.uuid, st, umiejetnosc, utrudnienie: utrudnienie ? 1 : 0,
      sukces: JSON.stringify(sukces), porazka: JSON.stringify(porazka), porazka5: JSON.stringify(porazka5) } };
}

/** Przycisk kroków wymuszonych (ruch, awaria, komplikacja) — MG albo kierowca przez przekaźnik. */
export function przyciskKrokow(pojazdDoc, label, kroki, ikona = "fa-solid fa-arrows-left-right") {
  return { akcja: "poscig.kroki", label, ikona, wlasciciel: true, dane: { pojazd: pojazdDoc.uuid, kroki: JSON.stringify(kroki) } };
}

/** Manewr na planszy: linie, ostrzeżenia i przyciski karty (P5c). */
function _manewr(id, pojazdDoc, kier, linie, ostrz, przyciski) {
  const tor = torPojazdu(pojazdDoc);
  const kolizje = (tory, st) => {
    for (const p of _pojazdyNaTorach(pojazdDoc, tory)) {
      const k = kierowcaPojazdu(p);
      linie.push(`${esc(p.name)} na znaczniku ${torPojazdu(p)}${k ? "" : " (bez kierowcy)"} — Test (Pojazdy) ST ${st} albo kolizja (MG rozstrzyga).`);
      if (k) przyciski.push(przyciskTestuPoscigu(p, { label: `${p.name}: Pojazdy ST ${st}`, st }));
    }
  };
  if (id === "hample") {
    if (kier) przyciski.push(przyciskTestuPoscigu(pojazdDoc, { label: "Hample: Pojazdy ST 10", st: 10, porazka: [{ komplikacja: 1 }] }));
    przyciski.push(przyciskKrokow(pojazdDoc, "−2 znaczniki", [{ znaczniki: -2 }]));
    kolizje([tor - 1, tor - 2], 10);
  }
  if (id === "obrot180") {
    if (kier) przyciski.push(przyciskTestuPoscigu(pojazdDoc, { label: "Obrót: Pojazdy ST 20", st: 20, porazka: [{ awaria: 8 }] }));
    przyciski.push(przyciskKrokow(pojazdDoc, "−2 znaczniki", [{ znaczniki: -2 }]));
    kolizje([tor - 2], 15);
    linie.push("Po obrocie pojazd jedzie w drugą stronę — rolę w pościgu zmienia MG.");
  }
  if (POZYCJE[id].cel) {
    const t = [...game.user.targets][0]?.document ?? null;
    const cel = t ? (jestZetonemPojazdu(t) ? t : pojazdJadacego(t)) : null;
    if (!cel) ostrz.push("Wyceluj pojazd (albo jadącego w nim) na tym samym znaczniku — T, potem jeszcze raz z palety.");
    else {
      if (torPojazdu(cel) !== tor) ostrz.push(`${cel.name} jest na znaczniku ${torPojazdu(cel)}, nie na twoim (${tor}).`);
      const moj = ROZMIARY.indexOf(pojazdDoc.actor.system?.traits?.size), jego = ROZMIARY.indexOf(cel.actor.system?.traits?.size);
      if (id === "stukniecie" && moj < jego) ostrz.push("Twój pojazd jest mniejszy od celu — RAW: tylko maszyną co najmniej tego samego rozmiaru.");
      linie.push(`Cel: <strong>${esc(cel.name)}</strong>.`);
      const dalej = id === "stukniecie"
        ? [{ test: { pojazd: cel.uuid, st: 15, utrudnienie: moj > jego, porazka: [{ komplikacja: 1, pojazd: cel.uuid }] } }]
        : [{ efekt: "zajechany", pojazd: cel.uuid }];
      if (kier) przyciski.push(przyciskTestuPoscigu(pojazdDoc, { label: `${POZYCJE[id].nazwa}: Pojazdy ST 10`, st: 10,
        sukces: dalej, porazka5: [{ komplikacja: 1 }] }));
    }
  }
}

/** Przerzutka (s. 263): zmiana przełożenia roweru — akcja bonusowa, stan trwały. */
export async function ustawPrzerzutke(pojazdDoc, przelozenie) {
  const p = PRZELOZENIA[przelozenie];
  const actor = pojazdDoc?.actor;
  if (!p || !jestPojazdem(actor)) return;
  if (!mozeUzycPalety(pojazdDoc)) return ui.notifications.warn("Przerzutką zmienia rowerzysta (albo MG).");
  await actor.setFlag(MODULE_ID, FLAGA_PRZERZUTKI, przelozenie);
  const kier = kierowcaPojazdu(pojazdDoc);
  await wyslijKarte(kartaPostoju({ ikona: pojazdDoc.texture.src, tytul: `Przerzutka — ${pojazdDoc.name}`, podtytul: "[B] akcja bonusowa — koszt oznaczony (D7)",
    linie: [`Przełożenie <strong>${p.nazwa}</strong>: Szybkość rowerzysty ×${p.mnoznik} (${p.opis}, s. 263).`] }), { actor: kier?.actor ?? actor });
}

function _przyciskTestu(kier, pojazdDoc, umiejetnosc, st, porazka) {
  return { akcja: "pojazd.testPalety", label: `${umiejetnosc === "poj" ? "Pojazdy" : "Akrobatyka"} ST ${st}`, ikona: "fa-solid fa-dice-d20",
    wlasciciel: true, dane: { kierowca: kier.actor.uuid, pojazd: pojazdDoc.uuid, umiejetnosc, st, porazka } };
}

/** Test z karty palety; porażka: Powalenie kierowcy (jednoślady) albo [Przewrócenie] (awaria 8). */
async function _testPalety(_ev, btn) {
  const kier = await fromUuid(btn.dataset.kierowca);
  const pojazd = await fromUuid(btn.dataset.pojazd);
  const st = Number(btn.dataset.st) || 10;
  if (!kier?.isOwner || !pojazd) return ui.notifications.warn("Test rzuca kierowca.");
  const skill = btn.dataset.umiejetnosc === "poj" ? "poj" : "akr";
  const rolls = await kier.rollSkill({ skill, target: st }, {}, { data: { flavor: `${pojazd.name}: ${skill === "poj" ? "MDR (Pojazdy)" : "ZRC (Akrobatyka)"} ST ${st}` } });
  const r = Array.isArray(rolls) ? rolls[0] : rolls;
  if (!r || r.total >= st) return;
  const przew = btn.dataset.porazka === "przewrocenie";
  if (!przew && !kier.statuses?.has("prone")) await kier.toggleStatusEffect("prone", { active: true });
  await wyslijKarte(kartaPostoju({ ikona: pojazd.texture.src, tytul: "Porażka", rodzaj: "porazka",
    linie: [`${esc(kier.name)}: ${r.total} przy ST ${st} — ${przew ? "pojazd ląduje przewrócony (awaria 8, MG stosuje)." : "Powalenie (zastosowane) i zatrzymanie."}`],
    przyciski: przew ? [{ akcja: "pojazd.zastosujAwarie", label: "Zastosuj awarię 8", gm: true, ikona: "fa-solid fa-wrench", dane: { pojazd: pojazd.actor.uuid, k20: 8 } }] : []
  }), { actor: kier, flagi: { aktor: kier.uuid } });
}

/** MG: RO wycelowanych istot (Działko wodne, Lemiesz); porażka — Powalenie. */
async function _roCelow(_ev, btn) {
  if (!game.user.isGM) return;
  const ability = btn.dataset.ability, st = Number(btn.dataset.st) || 10;
  const cele = [...game.user.targets].filter(t => t.actor && !jestPojazdem(t.actor));
  if (!cele.length) return ui.notifications.warn("Wyceluj istoty (T), potem kliknij.");
  const linie = [];
  for (const t of cele) {
    const rolls = await t.actor.rollSavingThrow({ ability, target: st }, { configure: false },
      { data: { flavor: `${btn.dataset.zrodlo} — RO ST ${st}`, speaker: ChatMessage.getSpeaker({ token: t.document }) } });
    const r = Array.isArray(rolls) ? rolls[0] : rolls;
    const ok = r && r.total >= st;
    if (!ok && !t.actor.statuses?.has("prone")) await t.actor.toggleStatusEffect("prone", { active: true });
    linie.push(`${esc(t.name)}: ${r?.total ?? "—"} — ${ok ? "zdaje" : `${esc(btn.dataset.porazka)} (Powalenie zastosowane)`}`);
  }
  await wyslijKarte(kartaPostoju({ ikona: "icons/svg/combat.svg", tytul: `${btn.dataset.zrodlo} — wynik`, rodzaj: "info", linie }), { szept: "gm" });
}

/* -------------------------------------------- */
/*  Wygasanie (aktywny MG)                       */
/* -------------------------------------------- */

/** Żeton pojazdu, którego kierowcą jest kombatant (scena walki). */
function _pojazdKierowcy(combatant) {
  const tok = combatant?.token;
  const p = tok ? pojazdJadacego(tok) : null;
  return p && miejsceOId(p.actor, jazdaZetonu(tok).miejsce)?.kierowca ? p : null;
}

async function _wygas(actor, t) {
  if (!actor) return;
  const usun = [], faza1 = [];
  for (const e of efektyPalety(actor)) {
    const f = e.flags[MODULE_ID][FLAGA_PALETY];
    const co = wygasniecie(f, t, POZYCJE[f.id]);
    if (co === "usun") usun.push(e.id);
    else if (co === "faza1") faza1.push({ _id: e.id, [`flags.${MODULE_ID}.${FLAGA_PALETY}.faza`]: 1 });
  }
  if (faza1.length) await actor.updateEmbeddedDocuments("ActiveEffect", faza1);
  if (usun.length) await actor.deleteEmbeddedDocuments("ActiveEffect", usun);
}

async function _onTurnChange(combat, prior, current) {
  if (!game.users.activeGM?.isSelf || !krokNaprzod(prior, current)) return;
  const poprzedni = combat.combatants.get(prior?.combatantId);
  const biezacy = combat.combatants.get(current?.combatantId);
  // Efekty palety pojazdu i samego kierowcy (Oślepienie z komplikacji 18) liczą tury kierowcy.
  const koniec = { walka: combat.id, runda: prior?.round, tura: prior?.turn, krawedz: "koniec" };
  const start = { walka: combat.id, runda: current.round, tura: current.turn, krawedz: "start" };
  const pKoniec = _pojazdKierowcy(poprzedni);
  if (pKoniec) await _wygas(pKoniec.actor, koniec);
  if (poprzedni?.actor && efektyPalety(poprzedni.actor).length) await _wygas(poprzedni.actor, koniec);
  const pStart = _pojazdKierowcy(biezacy);
  if (pStart) await _wygas(pStart.actor, start);
  if (biezacy?.actor && efektyPalety(biezacy.actor).length) await _wygas(biezacy.actor, start);
}

/** Poza walką: zegar świata. */
async function _onWorldTime(worldTime) {
  if (!game.users.activeGM?.isSelf) return;
  const aktorzy = new Set(game.actors.filter(a => efektyPalety(a).length));
  for (const s of game.scenes) for (const t of s.tokens) if (!t.actorLink && efektyPalety(t.actor).length) aktorzy.add(t.actor);
  for (const actor of aktorzy) {
    const usun = [], faza1 = [];
    for (const e of efektyPalety(actor)) {
      const f = e.flags[MODULE_ID][FLAGA_PALETY], def = POZYCJE[f.id];
      if (def.trwale || f.walka || !Number.isFinite(f.czas)) continue;
      const faza = fazaZCzasu(f, worldTime, RUNDA_S());
      const zostaje = Object.values(def.wygasa ?? {}).includes("koniec");
      if (faza >= 2 || (faza === 1 && !zostaje)) usun.push(e.id);
      else if (faza === 1 && (Number(f.faza) || 0) === 0) faza1.push({ _id: e.id, [`flags.${MODULE_ID}.${FLAGA_PALETY}.faza`]: 1 });
    }
    if (faza1.length) await actor.updateEmbeddedDocuments("ActiveEffect", faza1);
    if (usun.length) await actor.deleteEmbeddedDocuments("ActiveEffect", usun);
  }
}

/** Koniec walki: efekty tej walki znikają (przełączniki trwałe zostają). */
async function _onDeleteCombat(combat) {
  if (!game.users.activeGM?.isSelf) return;
  for (const t of combat.scene?.tokens ?? []) {
    if (!jestZetonemPojazdu(t)) continue;
    const ids = efektyPalety(t.actor).filter(e => e.flags[MODULE_ID][FLAGA_PALETY].walka === combat.id && !POZYCJE[e.flags[MODULE_ID][FLAGA_PALETY].id].trwale).map(e => e.id);
    if (ids.length) await t.actor.deleteEmbeddedDocuments("ActiveEffect", ids);
  }
}

/* -------------------------------------------- */
/*  Testy, ataki, Slalom                         */
/* -------------------------------------------- */

/** ST +5 i Ułatwienie/Utrudnienie Testów (Pojazdy) kierowcy (jak Rajdowiec — w danych rzutu). */
function _onPreRollSkill(config) {
  if (config?.skill !== "poj") return;
  const actor = config.subject;
  const tok = actor?.isToken ? actor.token : canvas.scene?.tokens.find(t => t.actorId === actor?.id && jazdaZetonu(t));
  const pojazd = tok ? pojazdJadacego(tok) : null;
  if (!pojazd || !miejsceOId(pojazd.actor, jazdaZetonu(tok).miejsce)?.kierowca) return;
  const b = paletaPojazdu(pojazd.actor);
  if (b.st && Number.isFinite(Number(config.target))) config.target = Number(config.target) + b.st;
  if (b.ulatwienie) config.advantage = true;
  if (b.utrudnienie) config.disadvantage = true;
}

/** Pojazd i czy żeton to kierowca, gdy żeton to pojazd albo jego jadący. */
function _wPojezdzie(tokenLike) {
  const doc = tokenLike?.document ?? tokenLike;
  if (!doc) return null;
  if (jestZetonemPojazdu(doc)) return { pojazd: doc, kierowca: true };
  const p = pojazdJadacego(doc);
  return p ? { pojazd: p, kierowca: !!miejsceOId(p.actor, jazdaZetonu(doc).miejsce)?.kierowca } : null;
}

function _zrodloAtakow({ attackerToken, targets }) {
  const out = [];
  const a = _wPojezdzie(attackerToken);
  // Komplikacja 7 (s. 267): ani oni nas, ani my ich — oznaczone, rozstrzyga MG.
  const bezKontaktu = [a, ...(targets ?? []).map(_wPojezdzie)].find(x => x && paletaPojazdu(x.pojazd.actor).kontakt);
  if (bezKontaktu) out.push({ rodzaj: "uwaga", label: `${bezKontaktu.pojazd.name}: utrata kontaktu wzrokowego — atak niemożliwy do początku tury kierowcy (s. 267)`, strona: "MG" });
  if (a) {
    const b = paletaPojazdu(a.pojazd.actor);
    if (b.atak === "wszyscy" || (b.atak === "kierowca" && a.kierowca)) {
      out.push({ rodzaj: "utrudnienie", label: `${b.nazwy.join(", ")} — atakujący z jadącego pojazdu z Utrudnieniem (s. 263–264)`, strona: "atakujący" });
    }
  }
  for (const t of targets ?? []) {
    const c = _wPojezdzie(t);
    if (!c) continue;
    const b = paletaPojazdu(c.pojazd.actor);
    if (b.atak === "wszyscy" || (b.atak === "kierowca" && c.kierowca)) {
      out.push({ rodzaj: "utrudnienie", label: `Cel na ${b.nazwy.join(", ")} — ataki z Utrudnieniem (s. 263–264)`, strona: "cel" });
      break;
    }
  }
  return out;
}

/** Slalom: Ułatwienie do najbliższego RO ZRC pojazdu; zużyty po rzucie. */
function _onPreRollSave(config) {
  const actor = config?.subject;
  if (config?.ability !== "dex" || !jestPojazdem(actor) || !paletaPojazdu(actor).slalom) return;
  config.advantage = true;
}

async function _onRollSave(_rolls, { ability, subject } = {}) {
  if (ability !== "dex" || !jestPojazdem(subject) || !subject.isOwner) return;
  const ids = efektyPalety(subject).filter(e => e.flags[MODULE_ID][FLAGA_PALETY].id === "slalom").map(e => e.id);
  if (ids.length) await subject.deleteEmbeddedDocuments("ActiveEffect", ids);
}

/* -------------------------------------------- */
/*  Okno                                         */
/* -------------------------------------------- */

const okna = new Map();

class OknoPalety extends foundry.applications.api.ApplicationV2 {
  static DEFAULT_OPTIONS = {
    classes: ["neuro-okno-palety"],
    window: { title: "Paleta kierowcy", icon: "fa-solid fa-steering-wheel", resizable: false },
    position: { width: 380, height: "auto" }
  };

  constructor(pojazd, options = {}) {
    super({ id: `neuro-paleta-${pojazd.id}`, ...options });
    this.pojazd = pojazd;
  }

  get title() {
    return `${this.pojazd.name} — paleta kierowcy`;
  }

  async _renderHTML() {
    const p = this.pojazd;
    const div = document.createElement("div");
    div.className = "neuro-paleta";
    const actor = p.actor;
    if (!danePojazdu(actor)) {
      div.textContent = "To nie jest pojazd.";
      return div;
    }
    const { budzetJazdy } = await import("./jazda.mjs");
    const b = budzetJazdy(p);
    const kier = kierowcaPojazdu(p);
    const moze = mozeUzycPalety(p);
    const tura = actor.flags?.[MODULE_ID]?.tura;
    const walka = game.combat?.started ? game.combat : null;
    const droga = walka && tura?.walka === walka.id && tura.runda === walka.round ? tura.droga : 0;
    const naglowek = `<p class="neuro-paleta-info">${kier ? `Kierowca: <strong>${esc(kier.name)}</strong>` : "<em>Nikt nie kieruje.</em>"} · Szybkość ${b.v} m`
      + `${b.dodatkowy ? ` + ${b.dodatkowy} m (paleta)` : ""}${b.mnoznikDrogi !== 1 ? ` · cofanie: droga ×${b.mnoznikDrogi}` : ""}`
      + `${walka ? ` · w tej turze <strong>${droga}</strong> z ${b.limit} m (Przyspieszenie: do ${b.limit + b.v} m)` : ""}</p>`;
    const aktywne = efektyPalety(actor).map(e => {
      const f = e.flags[MODULE_ID][FLAGA_PALETY], def = POZYCJE[f.id];
      const kiedy = def.trwale ? "do wyłączenia" : (Number(f.faza) || 0) === 1 ? "do końca tej tury kierowcy" : "do początku następnej tury kierowcy";
      return `<li><i class="${esc(def.ikona)}" inert></i> ${esc(def.nazwa)} <span class="neuro-paleta-kiedy">— ${kiedy}</span></li>`;
    }).join("");
    const grupy = { akcja: "Akcje [A]", bonus: "Akcje bonusowe [B]", reakcja: "Reakcje [R]", przelacznik: "Przełączniki" };
    const pozycje = pozycjePojazdu(p);
    let lista = "";
    for (const [czas, tytul] of Object.entries(grupy)) {
      const w = pozycje.filter(x => (x.def.przelacznik && x.def.czas !== "akcja" ? "przelacznik" : x.def.czas) === czas);
      if (!w.length) continue;
      lista += `<h4>${tytul}</h4><div class="neuro-paleta-grupa">` + w.map(x => `<button type="button" class="neuro-paleta-btn${x.aktywna ? " active" : ""}"
        data-pozycja="${esc(x.id)}" ${moze ? "" : "disabled"} data-tooltip="${esc(x.def.skutek)}">
        <i class="${esc(x.def.ikona)}" inert></i> ${esc(x.def.nazwa)}${x.oznaczenia.length ? ` <i class="fa-solid fa-triangle-exclamation" data-tooltip="${esc(x.oznaczenia.join(" "))}"></i>` : ""}</button>`).join("") + "</div>";
    }
    if (cechyPojazdu(danePojazdu(actor).podwozie).some(c => c.id === "przerzutka")) {
      const teraz = actor.flags?.[MODULE_ID]?.[FLAGA_PRZERZUTKI] ?? "standardowe";
      lista += `<h4>Przerzutka [B]</h4><div class="neuro-paleta-grupa">` + Object.entries(PRZELOZENIA).map(([k, v]) =>
        `<button type="button" class="neuro-paleta-btn${teraz === k ? " active" : ""}" data-przelozenie="${k}" ${moze ? "" : "disabled"}
          data-tooltip="Szybkość rowerzysty ×${v.mnoznik} — ${esc(v.opis)}">${esc(v.nazwa)} ×${v.mnoznik}</button>`).join("") + "</div>";
    }
    div.innerHTML = `${naglowek}${aktywne ? `<ul class="neuro-paleta-aktywne">${aktywne}</ul>` : ""}${lista || "<p><em>Ten pojazd nie ma akcji w palecie.</em></p>"}
      ${moze ? "" : `<p class="neuro-paleta-info"><em>Tylko do odczytu — paletą steruje kierowca.</em></p>`}`;
    return div;
  }

  _replaceHTML(result, content) {
    content.replaceChildren(result);
  }

  _onRender(context, options) {
    super._onRender?.(context, options);
    this.element.querySelectorAll("[data-pozycja]").forEach(b => b.addEventListener("click", async ev => {
      ev.currentTarget.disabled = true;
      await uzyjPalety(this.pojazd, ev.currentTarget.dataset.pozycja);
      this.render();
    }));
    this.element.querySelectorAll("[data-przelozenie]").forEach(b => b.addEventListener("click", async ev => {
      await ustawPrzerzutke(this.pojazd, ev.currentTarget.dataset.przelozenie);
      this.render();
    }));
  }

  _onClose(options) {
    super._onClose?.(options);
    if (okna.get(this.pojazd.id) === this) okna.delete(this.pojazd.id);
  }
}

/** Otwiera paletę kierowcy pojazdu. */
export async function otworzPalete(pojazdDoc) {
  if (!jestZetonemPojazdu(pojazdDoc)) return null;
  await okna.get(pojazdDoc.id)?.close();
  const app = new OknoPalety(pojazdDoc);
  okna.set(pojazdDoc.id, app);
  return app.render({ force: true });
}

function _odswiezOkna(actor) {
  for (const app of okna.values()) if (app.pojazd.actor === actor && app.rendered) app.render();
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

export function registerPaleta() {
  zarejestrujAkcje("pojazd.testPalety", _testPalety);
  zarejestrujAkcje("pojazd.roCelow", _roCelow);
  zarejestrujZrodloOkolicznosci("paletaKierowcy", _zrodloAtakow);
  Hooks.on("dnd5e.preRollSkill", _onPreRollSkill);
  Hooks.on("dnd5e.preRollSavingThrow", _onPreRollSave);
  Hooks.on("dnd5e.rollSavingThrow", (rolls, data) => { _onRollSave(rolls, data).catch(err => console.error(`${MODULE_ID} | Slalom`, err)); });
  Hooks.on("combatTurnChange", (c, p, n) => { _onTurnChange(c, p, n).catch(err => console.error(`${MODULE_ID} | paleta: tura`, err)); });
  Hooks.on("updateWorldTime", t => { _onWorldTime(t).catch(err => console.error(`${MODULE_ID} | paleta: czas`, err)); });
  Hooks.on("deleteCombat", c => { _onDeleteCombat(c).catch(() => {}); });
  for (const h of ["createActiveEffect", "updateActiveEffect", "deleteActiveEffect"]) {
    Hooks.on(h, e => { if (e.parent instanceof Actor && e.flags?.[MODULE_ID]?.[FLAGA_PALETY]) _odswiezOkna(e.parent); });
  }
  Hooks.on("updateActor", (a, ch) => { if (foundry.utils.hasProperty(ch, `flags.${MODULE_ID}`)) _odswiezOkna(a); });
}
