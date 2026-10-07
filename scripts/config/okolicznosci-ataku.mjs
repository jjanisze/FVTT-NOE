/**
 * Neuroshima 5e — okoliczności Testu Ataku: czysty silnik (PLAN_m1_walka.md §7.5, E3–E4).
 *
 * Czysty: bez `game`, bez `canvas`, bez dokumentów. Wejście to migawka ataku (buduje ją
 * `combat/okolicznosci.mjs`), wyjście — listy Ułatwień i Utrudnień z powodem i stroną, uwagi dla
 * stołu i automatyczne Trafienie Krytyczne. Tryb rzutu to reguła 5e: dowolne Ułatwienie i dowolne
 * Utrudnienie znoszą się, liczba się nie liczy.
 *
 * ## Reguły (RAW)
 *
 *   - **Zasięg** (s. 28): cel w zasięgu dalekim — Utrudnienie; poza dalekim atak chybia (uwaga, nie
 *     blokada — pomiar od krawędzi żetonów bywa nieprecyzyjny, decyduje MG).
 *   - **Atak dystansowy w zwarciu** (s. 28): Utrudnienie, jeśli ≤ 1,5 m jest przeciwnik, który cię
 *     widzi, nie jest Nieprzytomny i ma Szybkość > 0 (U7: Oślepienie, Pochwycenie, Sparaliżowanie,
 *     Unieruchomienie — wyłączają; niewidzialnego atakującego nikt nie widzi).
 *   - **Stany** (s. 35): własne Utrudnienie — Oślepienie, Przerażenie, Zatrucie, Unieruchomienie,
 *     Pochwycenie (cele inne niż pochwytujący), Powalenie (wręcz); własne Ułatwienie — Niewidoczność.
 *     Przeciw tobie Ułatwienie — Nieprzytomność, Ogłuszenie, Oślepienie, Unieruchomienie, Powalenie
 *     ≤ 1,5 m; Utrudnienie — Powalenie dalej, Niewidoczność. Sparaliżowanie w NOE **nie** daje
 *     Ułatwienia (inaczej niż w 5e) — tylko automatyczne TK.
 *   - **Automatyczne Trafienie Krytyczne** (s. 35): Nieprzytomny albo Sparaliżowany cel, atakujący
 *     ≤ 1,5 m — każde trafienie jest krytyczne. Wchodzi do werdyktu (`combat/trafienie.mjs`).
 *   - **Bieganie** (s. 30): Utrudnienie do własnych ataków; ataki dystansowe przeciw biegnącemu
 *     z Utrudnieniem do końca jego bieżącej tury (U8: „cel biegnie i trwa jego tura”).
 *   - **Unikanie** (s. 30): ataki przeciw tobie z Utrudnieniem, jeśli widzisz napastnika; przepada
 *     przy Obezwładnieniu i Szybkości 0.
 *
 * ## Tabela
 *
 * Nowe źródło = nowy wiersz, nie nowy `if` (wzorzec `config/tt-rules.mjs`). Wiersz: `id`, `rodzaj`
 * (`ulatwienie` / `utrudnienie` / `uwaga`), `label`, `strona`, `cel` (wymaga dokładnie jednego celu),
 * `gdy(s)` → `true` albo tekst (powód w dymku zamiast `label`). Źródła spoza RAW i spoza tej tabeli
 * (pancerz bez wyszkolenia, Udźwig, choroby…) przychodzą gotowe w `s.zewnetrzne`.
 */

/** Zasięg „obok ciebie” w metrach (s. 28, 35). */
export const OBOK = 1.5;

const _f = Object.freeze;
/** Liczba albo null — `null`, `undefined` i "" to „nieznane”, nie 0 (`Number(null) === 0`). */
const _num = v => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

/**
 * @typedef {object} Uczestnik
 * @property {Set<string>} stany   id statusów dnd5e + markery modułu (`dodging`, `bieganie`)
 * @property {boolean} [szybkosc0] Szybkość 0 (stan albo ruch)
 * @property {string} [nazwa]
 *
 * @typedef {object} MigawkaAtaku
 * @property {Uczestnik} atakujacy
 * @property {Uczestnik|null} cel          null — brak celu albo kilka celów
 * @property {number} [liczbaCelow]
 * @property {boolean} wrecz
 * @property {number|null} [odleglosc]     metry, od krawędzi żetonów; null — nieznana
 * @property {{normalny: number|null, daleki: number|null}} [zasieg]
 * @property {Uczestnik[]} [wrogowieObok]  przeciwnicy ≤ 1,5 m od atakującego (filtr U7 robi silnik)
 * @property {boolean|null} [celPochwytuje] czy cel trzyma atakującego; null — nie wiadomo
 * @property {boolean} [turaCelu]          trwa tura celu
 * @property {{id: string, rodzaj: string, label: string, strona?: string}[]} [zewnetrzne]
 */

const ma = (u, id) => !!u?.stany?.has?.(id);
const _dist = s => _num(s.odleglosc);

/** Ten przeciwnik widzi atakującego i może przeszkadzać (s. 28, U7). */
export function przeszkadzaWZwarciu(wrog, atakujacy) {
  if (!wrog) return false;
  if (["unconscious", "blinded", "grappled", "paralyzed", "restrained", "dead"].some(id => ma(wrog, id))) return false;
  if (wrog.szybkosc0) return false;
  return !ma(atakujacy, "invisible");
}

/** Cel z Unikaniem widzi napastnika i nie stracił korzyści (s. 30). */
function _unikanieDziala(cel, atakujacy) {
  if (!ma(cel, "dodging")) return false;
  if (["incapacitated", "unconscious", "stunned", "paralyzed"].some(id => ma(cel, id)) || cel.szybkosc0) return false;
  return !ma(cel, "blinded") && !ma(atakujacy, "invisible");
}

/** Automatyczne Trafienie Krytyczne wobec tego celu (s. 35) — `null` albo `{ id, label, strona }`. */
export function autoKrytyk(cel, odleglosc) {
  const d = _num(odleglosc);
  if (d === null || d > OBOK) return null;
  if (ma(cel, "unconscious")) return _f({ id: "autoKrytyk", label: "Nieprzytomny cel ≤ 1,5 m — każde trafienie krytyczne", strona: "s. 35" });
  if (ma(cel, "paralyzed")) return _f({ id: "autoKrytyk", label: "Sparaliżowany cel ≤ 1,5 m — każde trafienie krytyczne", strona: "s. 35" });
  return null;
}

/** Źródła RAW. Kolejność = kolejność w dymku. */
export const ZRODLA_OKOLICZNOSCI = _f([
  // Zasięg i zwarcie (s. 28)
  _f({ id: "zasiegDaleki", rodzaj: "utrudnienie", label: "Cel w zasięgu dalekim", strona: "s. 28", cel: true,
    gdy: s => !s.wrecz && _dist(s) !== null && _num(s.zasieg?.normalny) !== null
      && _dist(s) > _num(s.zasieg.normalny) && (_num(s.zasieg.daleki) === null || _dist(s) <= _num(s.zasieg.daleki)) }),
  _f({ id: "pozaZasiegiem", rodzaj: "uwaga", label: "Cel poza zasięgiem dalekim — atak chybia", strona: "s. 28", cel: true,
    gdy: s => !s.wrecz && _dist(s) !== null && _num(s.zasieg?.daleki) !== null && _dist(s) > _num(s.zasieg.daleki) }),
  _f({ id: "dystansowyWZwarciu", rodzaj: "utrudnienie", label: "Atak dystansowy w zwarciu", strona: "s. 28",
    gdy: s => {
      if (s.wrecz) return false;
      const wrog = (s.wrogowieObok ?? []).find(w => przeszkadzaWZwarciu(w, s.atakujacy));
      return wrog ? `Atak dystansowy w zwarciu${wrog.nazwa ? ` (${wrog.nazwa})` : ""}` : false;
    } }),

  // Stany atakującego (s. 35)
  _f({ id: "oslepienie", rodzaj: "utrudnienie", label: "Oślepienie", strona: "s. 35", gdy: s => ma(s.atakujacy, "blinded") }),
  _f({ id: "przerazenie", rodzaj: "utrudnienie", label: "Przerażenie", strona: "s. 35", gdy: s => ma(s.atakujacy, "frightened") }),
  _f({ id: "zatrucie", rodzaj: "utrudnienie", label: "Zatrucie", strona: "s. 35", gdy: s => ma(s.atakujacy, "poisoned") }),
  _f({ id: "unieruchomienie", rodzaj: "utrudnienie", label: "Unieruchomienie", strona: "s. 35", gdy: s => ma(s.atakujacy, "restrained") }),
  _f({ id: "pochwycenie", rodzaj: "utrudnienie", label: "Pochwycenie — cel cię nie trzyma", strona: "s. 35",
    gdy: s => ma(s.atakujacy, "grappled") && s.cel && (s.celPochwytuje === false
      || (s.celPochwytuje == null && _dist(s) !== null && _dist(s) > OBOK)) }),
  _f({ id: "pochwycenieNiepewne", rodzaj: "uwaga", label: "Pochwycenie — Utrudnienie, jeśli cel cię nie trzyma (decyduje MG)", strona: "s. 35",
    gdy: s => ma(s.atakujacy, "grappled") && s.cel && s.celPochwytuje == null && (_dist(s) === null || _dist(s) <= OBOK) }),
  _f({ id: "powalenieWrecz", rodzaj: "utrudnienie", label: "Powalenie — atak wręcz", strona: "s. 35", gdy: s => s.wrecz && ma(s.atakujacy, "prone") }),
  _f({ id: "niewidocznosc", rodzaj: "ulatwienie", label: "Niewidoczność (chyba że cel cię widzi)", strona: "s. 35", gdy: s => ma(s.atakujacy, "invisible") }),
  _f({ id: "bieganie", rodzaj: "utrudnienie", label: "Bieganie", strona: "s. 30", gdy: s => ma(s.atakujacy, "bieganie") }),

  // Stany celu (s. 35) — tylko przy jednym celu
  _f({ id: "celNieprzytomny", rodzaj: "ulatwienie", label: "Cel Nieprzytomny", strona: "s. 35", cel: true, gdy: s => ma(s.cel, "unconscious") }),
  _f({ id: "celOgluszony", rodzaj: "ulatwienie", label: "Cel Ogłuszony", strona: "s. 35", cel: true, gdy: s => ma(s.cel, "stunned") }),
  _f({ id: "celOslepiony", rodzaj: "ulatwienie", label: "Cel Oślepiony", strona: "s. 35", cel: true, gdy: s => ma(s.cel, "blinded") }),
  _f({ id: "celUnieruchomiony", rodzaj: "ulatwienie", label: "Cel Unieruchomiony", strona: "s. 35", cel: true, gdy: s => ma(s.cel, "restrained") }),
  _f({ id: "celPowalonyBlisko", rodzaj: "ulatwienie", label: "Cel Powalony, ≤ 1,5 m", strona: "s. 35", cel: true,
    gdy: s => ma(s.cel, "prone") && _dist(s) !== null && _dist(s) <= OBOK }),
  _f({ id: "celPowalonyDaleko", rodzaj: "utrudnienie", label: "Cel Powalony, dalej niż 1,5 m", strona: "s. 35", cel: true,
    gdy: s => ma(s.cel, "prone") && _dist(s) !== null && _dist(s) > OBOK }),
  _f({ id: "celNiewidoczny", rodzaj: "utrudnienie", label: "Cel Niewidoczny", strona: "s. 35", cel: true, gdy: s => ma(s.cel, "invisible") }),
  _f({ id: "celUnika", rodzaj: "utrudnienie", label: "Cel Unika", strona: "s. 30", cel: true, gdy: s => _unikanieDziala(s.cel, s.atakujacy) }),
  _f({ id: "celBiegnie", rodzaj: "utrudnienie", label: "Cel Biegnie (jego tura)", strona: "s. 30", cel: true,
    gdy: s => !s.wrecz && ma(s.cel, "bieganie") && !!s.turaCelu })
]);

/** Tryb jak `ADV_MODE` dnd5e: 1 Ułatwienie, −1 Utrudnienie, 0 zwykły (oba znoszą się). */
export function trybRzutu(ulatwienia, utrudnienia) {
  const u = ulatwienia?.length > 0;
  const t = utrudnienia?.length > 0;
  if (u && !t) return 1;
  if (t && !u) return -1;
  return 0;
}

/**
 * Rozstrzygnięcie okoliczności jednego Testu Ataku.
 * @param {MigawkaAtaku} s
 * @returns {{ulatwienia: object[], utrudnienia: object[], uwagi: object[], autoKrytyk: object|null, tryb: number}}
 */
export function rozstrzygnijOkolicznosci(s) {
  const out = { ulatwienia: [], utrudnienia: [], uwagi: [] };
  const dodaj = (rodzaj, wpis) => {
    const lista = rodzaj === "ulatwienie" ? out.ulatwienia : rodzaj === "utrudnienie" ? out.utrudnienia : out.uwagi;
    lista.push(_f(wpis));
  };
  for (const z of ZRODLA_OKOLICZNOSCI) {
    if (z.cel && !s.cel) continue;
    const wynik = z.gdy(s);
    if (!wynik) continue;
    dodaj(z.rodzaj, { id: z.id, label: typeof wynik === "string" ? wynik : z.label, strona: z.strona });
  }
  for (const z of s.zewnetrzne ?? []) dodaj(z.rodzaj, { id: z.id, label: z.label, strona: z.strona ?? "" });
  if ((s.liczbaCelow ?? (s.cel ? 1 : 0)) > 1) {
    dodaj("uwaga", { id: "kilkaCelow", label: "Kilka celów — stany celów i zasięg nie wchodzą do trybu rzutu", strona: "" });
  }
  return {
    ...out,
    autoKrytyk: s.cel ? autoKrytyk(s.cel, s.odleglosc) : null,
    tryb: trybRzutu(out.ulatwienia, out.utrudnienia)
  };
}

export const __testing = _f({ rozstrzygnijOkolicznosci, trybRzutu, autoKrytyk, przeszkadzaWZwarciu });
