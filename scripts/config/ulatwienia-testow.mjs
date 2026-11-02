/**
 * Neuroshima 5e — warunkowe Ułatwienia i premie w Testach Cechy i Rzutach Obronnych: czyste zasady (PLAN_m7 §3.0.3).
 *
 * Stock najpierw: warunek mieszczący się w danych rzutu albo aktora (Ja już swoje odchorowałem — RO na KON; Telepata
 * — Intuicja; „tylko w Berserku” — `statuses.berserk`) to **reguła Efektu Aktywnego dnd5e 6** na przedmiocie zdolności
 * (spike E0 b: działa w każdej ścieżce rzutu modułu). Ten rejestr jest dla warunków, których dnd5e w danych rzutu nie
 * ma: walka trwa (Rutyna), **źródło RO** (trucizna, kwas, skażenie, maszyna, Przerażenie — `kontekst` z karty, która
 * żąda rzutu), kategoria celu, biom drużyny, zagrożenie, które postać rejestruje (Szósty zmysł).
 *
 * Wiersz: `{ id, label, rzut: ["save:dex", "check:int", "skill:sur", "tool:*", "save:*"], rodzaj: "ulatwienie" |
 * "utrudnienie" | "premia", wartosc?, gdy(ctx) → true | false | "stol" }`. `"stol"` — warunek fabularny („gdy
 * rozmawiasz z półświatkiem”): moduł go nie zgaduje, tylko podsuwa (plakietka z nazwą zdolności).
 * Wynik trafia do okna rzutu jako **domyślny, nadpisywalny** (jak silnik okoliczności ataku).
 *
 * Bez Foundry — testowane w warstwie 1 (`tests/ulatwienia-testow.test.mjs`).
 */

/** Źródła RO, które karty żądające rzutu wpisują w `kontekst` (E0). */
export const KONTEKSTY_RO = Object.freeze({
  trucizna: "trucizna", kwas: "kwas", skazenie: "skażenie radioaktywne", choroba: "choroba", maszyna: "maszyna",
  przerazenie: "Przerażenie", obszar: "efekt obszarowy", pulapka: "pułapka", upadek: "upadek", srodowisko: "środowisko"
});

/**
 * Klucze rzutu, od najbardziej szczegółowego.
 * @param {{typ: "save"|"check"|"skill"|"tool", ability?: string, skill?: string, tool?: string}} r
 * @returns {string[]}
 */
export function kluczeRzutu({ typ, ability, skill, tool }) {
  const out = [];
  if (typ === "save") out.push(`save:${ability}`, "save:*");
  else {
    if (typ === "skill" && skill) out.push(`skill:${skill}`, "skill:*");
    if (typ === "tool" && tool) out.push(`tool:${tool}`, "tool:*");
    if (ability) out.push(`check:${ability}`);
    out.push("check:*");
  }
  return out;
}

/** Stany, w których postać jest ukryta przed wzrokiem (Ukrywanie się — `hiding`, Niewidoczność). */
export const STANY_UKRYCIA = Object.freeze(["hiding", "invisible"]);

/**
 * Sztuczka Ciszej niż cień (Jak cień, s. 102): kto na scenie szukającego ukrywa się z tą Sztuczką.
 * @param {{actorId: string, nazwa: string, ciszejNizCien: boolean, stany: Iterable<string>}[]} zetony  żetony sceny
 * @param {string} szukajacyId  aktor rzucający na Percepcję (sam siebie nie szuka)
 * @returns {string|null} nazwa pierwszej takiej postaci
 */
export function ktoSieUkrywa(zetony, szukajacyId) {
  const z = (zetony ?? []).find(t => t.ciszejNizCien && t.actorId !== szukajacyId
    && STANY_UKRYCIA.some(s => new Set(t.stany ?? []).has(s)));
  return z?.nazwa ?? null;
}

/** Czy wiersz dotyczy tego rzutu. */
export function pasuje(row, klucze) {
  return (row.rzut ?? []).some(k => klucze.includes(k));
}

/**
 * Rozstrzygnięcie dla jednego rzutu.
 * @param {object[]} rows   wiersze, które aktor posiada (filtr posiadania robi warstwa Foundry)
 * @param {object} ctx      `{ typ, ability, skill, tool, walka, kontekst: string[], … }`
 * @returns {{ulatwienia: object[], utrudnienia: object[], premie: object[], propozycje: object[]}}
 */
export function rozstrzygnijTest(rows, ctx) {
  const klucze = kluczeRzutu(ctx);
  const out = { ulatwienia: [], utrudnienia: [], premie: [], propozycje: [] };
  for (const row of rows) {
    if (!pasuje(row, klucze)) continue;
    let g;
    try { g = row.gdy ? row.gdy(ctx) : true; } catch (_e) { g = false; }
    if (!g) continue;
    const wpis = { id: row.id, label: row.label, ...(row.wartosc != null ? { wartosc: row.wartosc } : {}) };
    if (g === "stol") { out.propozycje.push({ ...wpis, rodzaj: row.rodzaj }); continue; }
    if (row.rodzaj === "ulatwienie") out.ulatwienia.push(wpis);
    else if (row.rodzaj === "utrudnienie") out.utrudnienia.push(wpis);
    else if (row.rodzaj === "premia") out.premie.push(wpis);
  }
  return out;
}

/** Czy kontekst RO zawiera któreś ze źródeł. */
export function zeZrodla(ctx, ...zrodla) {
  const k = new Set(ctx?.kontekst ?? []);
  return zrodla.some(z => k.has(z));
}
