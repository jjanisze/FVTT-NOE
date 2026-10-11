/**
 * Neuroshima 5e — Fanty (PLAN_m5_postoj.md U25, E0).
 *
 * Tabela Fantów (s. 133) przepisana ręcznie; testy sprawdzają domknięcie k100. Fant daje Fuksa trwałego
 * przy **pierwszym** wykorzystaniu przez danego bohatera (s. 17). Za Fant wymagający drobnej naprawy
 * klient da połowę wartości (s. 132 — stan „zepsuty”, `config/handel-data.mjs`).
 *
 * **Erratum (U25):** druk nie ma wyniku 85 (81–84, potem 86–87). Moduł czyta 81–85 jako „CD z muzyką
 * rozrywkową” — pytanie do autora w `docs/Pytania-do-autora.md`.
 *
 * Pola: `rodzaj` — jedzenie / napoj / uzywka / lektura / nagranie / gra / zabawka / inne; `zuzywalny` — znika
 * przy użyciu (jedzenie, napój, używka, papier); `kilkuosobowy` — gry, konsole, nagrania i przedwojenny
 * alkohol, z których korzysta kilka osób naraz (U25; s. 47 — rozrywka w dziczy). Sprzęt do odtwarzania
 * (magnetowid, odtwarzacz, konsola) — w opisie, bez sprawdzania (T0).
 *
 * Czysty: czyta go też Node (paczka `sprzet`, folder Fanty; paczka `tabele`).
 */

const F = (od, do_, nazwa, wartosc, rodzaj, o = {}) => Object.freeze({
  od, do: do_, nazwa, wartosc, rodzaj,
  zuzywalny: !!o.zuzywalny, kilkuosobowy: !!o.kilkuosobowy,
  ...(o.wymaga ? { wymaga: o.wymaga } : {}),
  ...(o.erratum ? { erratum: o.erratum } : {})
});

/** Wiersze k100 (s. 133); 100 — „rzuć dwa razy” (`FANT_RZUC_DWA_RAZY`). */
export const FANTY = Object.freeze([
  F(1, 1, "Papier toaletowy", 30, "inne", { zuzywalny: true }),
  F(2, 2, "Batonik Twinki", 30, "jedzenie", { zuzywalny: true }),
  F(3, 3, "Batonik Tiger", 30, "jedzenie", { zuzywalny: true }),
  F(4, 4, "Chipsy Plays", 30, "jedzenie", { zuzywalny: true }),
  F(5, 5, "Chipsy Stars", 30, "jedzenie", { zuzywalny: true }),
  F(6, 6, "Chipsy Crumchip", 30, "jedzenie", { zuzywalny: true }),
  F(7, 7, "Czekolada", 40, "jedzenie", { zuzywalny: true }),
  F(8, 8, "Cukierek", 10, "jedzenie", { zuzywalny: true }),
  F(9, 9, "Lizak", 10, "jedzenie", { zuzywalny: true }),
  F(10, 10, "Cygaro przedwojenne", 60, "uzywka", { zuzywalny: true }),
  F(11, 13, "Pisemko Gunmaniak", 70, "lektura"),
  F(14, 15, "Pisemko Motomaniak", 90, "lektura"),
  F(16, 17, "Gra karciana", 50, "gra", { kilkuosobowy: true }),
  F(18, 19, "Gra planszowa", 90, "gra", { kilkuosobowy: true }),
  F(20, 20, "Gra fabularna", 40, "gra", { kilkuosobowy: true }),
  F(21, 21, "Kaseta (rock)", 50, "nagranie", { kilkuosobowy: true, wymaga: "magnetofon" }),
  F(22, 22, "Kaseta (country)", 50, "nagranie", { kilkuosobowy: true, wymaga: "magnetofon" }),
  F(23, 23, "Kaseta (rock & roll)", 50, "nagranie", { kilkuosobowy: true, wymaga: "magnetofon" }),
  F(24, 24, "Kaseta (disco)", 50, "nagranie", { kilkuosobowy: true, wymaga: "magnetofon" }),
  F(25, 27, "Kaseta VHS (film akcji)", 80, "nagranie", { kilkuosobowy: true, wymaga: "magnetowid" }),
  F(28, 30, "Kaseta VHS (kreskówki)", 60, "nagranie", { kilkuosobowy: true, wymaga: "magnetowid" }),
  F(31, 32, "Kaseta VHS (film przyrodniczy lub XXX)", 150, "nagranie", { kilkuosobowy: true, wymaga: "magnetowid" }),
  F(33, 33, "Cartridge z grami", 30, "gra", { kilkuosobowy: true, wymaga: "konsola na cartridge" }),
  F(34, 34, "Konsola na cartridge", 60, "gra", { kilkuosobowy: true }),
  F(35, 35, "Gra na konsolę video", 40, "gra", { kilkuosobowy: true, wymaga: "konsola do gier video" }),
  F(36, 36, "Konsola do gier video", 80, "gra", { kilkuosobowy: true }),
  F(37, 40, "Przenośna konsola do gier", 120, "gra", { kilkuosobowy: true }),
  F(41, 42, "Książka (romans)", 15, "lektura"),
  F(43, 44, "Książka (kryminał)", 15, "lektura"),
  F(45, 46, "Książka (fantasy)", 15, "lektura"),
  F(47, 48, "Książka (sci-fi)", 15, "lektura"),
  F(49, 50, "Książka z dowcipami", 15, "lektura"),
  F(51, 53, "Książka filozoficzna", 30, "lektura"),
  F(54, 55, "Książka coachingowa", 10, "lektura"),
  F(56, 60, "Książka dla dzieci", 10, "lektura"),
  F(61, 68, "Komiks", 30, "lektura"),
  F(69, 69, "Magazyn przyrodniczy", 100, "lektura"),
  F(70, 70, "Plakat gwiazdy filmowej", 30, "inne"),
  F(71, 71, "Plakat gwiazdy muzyki", 30, "inne"),
  F(72, 73, "CD z encyklopedią", 100, "nagranie", { kilkuosobowy: true, wymaga: "komputer" }),
  F(74, 76, "CD z grą PC", 50, "gra", { kilkuosobowy: true, wymaga: "komputer" }),
  F(77, 80, "CD z muzyką klasyczną", 70, "nagranie", { kilkuosobowy: true, wymaga: "odtwarzacz CD" }),
  F(81, 85, "CD z muzyką rozrywkową", 50, "nagranie", { kilkuosobowy: true, wymaga: "odtwarzacz CD", erratum: "druk: 81–84, brak wyniku 85" }),
  F(86, 87, "Przedwojenna wódka", 100, "napoj", { zuzywalny: true, kilkuosobowy: true }),
  F(88, 89, "Przedwojenny rum", 100, "napoj", { zuzywalny: true, kilkuosobowy: true }),
  F(90, 91, "Przedwojenna whisky", 100, "napoj", { zuzywalny: true, kilkuosobowy: true }),
  F(92, 93, "Przedwojenny gin", 100, "napoj", { zuzywalny: true, kilkuosobowy: true }),
  F(94, 95, "Pluszowa maskotka", 60, "zabawka"),
  F(96, 97, "Pudełko klocków", 100, "zabawka"),
  F(98, 98, "Gadająca lalka", 50, "zabawka"),
  F(99, 99, "Autko R/C", 100, "zabawka")
]);

/** Wynik 100 — rzuć dwa razy (s. 133). */
export const FANT_RZUC_DWA_RAZY = 100;

/** Etykiety rodzajów i czasownik użycia (s. 17: „wypije, obejrzy, przeczyta, zagra”). */
export const RODZAJE_FANTOW = Object.freeze({
  jedzenie: Object.freeze({ label: "Jedzenie", czynnosc: "Zjedz" }),
  napoj: Object.freeze({ label: "Napój", czynnosc: "Wypij" }),
  uzywka: Object.freeze({ label: "Używka", czynnosc: "Zapal" }),
  lektura: Object.freeze({ label: "Lektura", czynnosc: "Przeczytaj" }),
  nagranie: Object.freeze({ label: "Nagranie", czynnosc: "Odtwórz" }),
  gra: Object.freeze({ label: "Gra", czynnosc: "Zagraj" }),
  zabawka: Object.freeze({ label: "Zabawka", czynnosc: "Pobaw się" }),
  inne: Object.freeze({ label: "Różne", czynnosc: "Użyj" })
});

/** Stabilny identyfikator Fantu z nazwy (klucz flagi i `_id` w paczce). */
export function idFantu(f) {
  return String(f.nazwa)
    .toLowerCase()
    .normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/ł/g, "l")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Wiersz dla wyniku k100 (1–99) albo `null` (100 — rzuć dwa razy). */
export function fantDla(k100) {
  const w = Number(k100);
  return FANTY.find(f => w >= f.od && w <= f.do) ?? null;
}

/** Rodzaj Fantu po id albo nazwie. */
export function rodzajFantu(idLubNazwa) {
  const f = FANTY.find(x => idFantu(x) === idLubNazwa || x.nazwa === idLubNazwa);
  return f?.rodzaj ?? null;
}

/** Fanty kilkuosobowe (U25) — podpowiedź Rozrywki w dziczy i wiosce (U34). */
export const KILKUOSOBOWE = Object.freeze(FANTY.filter(f => f.kilkuosobowy).map(idFantu));

/**
 * Losowanie Fantu (s. 133): wynik 100 — dwa kolejne rzuty (rekurencyjnie).
 * @param {() => number} rng
 * @returns {object[]} wiersze
 */
export function losujFanty(rng, { glebokosc = 0 } = {}) {
  const k = 1 + Math.floor(rng() * 100);
  if (k === FANT_RZUC_DWA_RAZY && glebokosc < 5) {
    return [...losujFanty(rng, { glebokosc: glebokosc + 1 }), ...losujFanty(rng, { glebokosc: glebokosc + 1 })];
  }
  const f = fantDla(k === FANT_RZUC_DWA_RAZY ? 99 : k);
  return f ? [f] : [];
}
