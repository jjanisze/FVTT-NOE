/**
 * Neuroshima 5e — Trudność Trafienia wg NOE: silnik (PLAN_tt.md, Część A).
 *
 * Czysty: bez `game`, bez `CONFIG`, bez dokumentów. Wejście to migawka postaci (buduje ją
 * `actors/tt.mjs`), wyjście — rozkład, który dymek TT rysuje wiersz po wierszu.
 *
 * ## Reguły
 *
 *   - Podstawa: 10 + mod. ZRC (s. 15, 53). Pancerz: wartość z tabeli + ZRC wg kategorii (s. 113–114).
 *   - **Metody konkurują, wygrywa najwyższa** — „Jeśli masz dostęp do kilku sposobów obliczania TT,
 *     możesz korzystać tylko z jednego z nich” (s. 59, Wieloklasowość). Bez przypinania (D3); furtką
 *     jest metoda „Stała” / „Własna formuła” w oknie TT dnd5e (D6).
 *   - **Premie stałe sumują się z wygraną metodą** (D1, RAI — wiersz w `scripts/wkk/README.md`).
 *   - „Pancerz” w warunkach zdolności = lekki, średni, ciężki **i ochraniacze** — autor systemu,
 *     2026-10-03: „Nałokietniki i nagolenniki są pancerzem, ponieważ dają premie do TT i są w tabeli
 *     Pancerze” (D4, RAI). Hełm i tarcza gaszą zdolność tylko tam, gdzie są wymienione z nazwy
 *     („Goła klata zaś bezpośrednio zakazuje Hełmu, bo ma go w opisie”). Metody podstawowe
 *     (TT podstawowa / pancerz) zależą wyłącznie od pancerza korpusu — ochraniacze dokładają swoje +1.
 *   - Ochraniacze, Inteligentna obrona i Koci odskok to Efekty Aktywne na `ac.bonus` — nie liczy
 *     ich silnik, tylko dnd5e (§4.2), więc tutaj ich nie ma.
 *
 * ## Tabele
 *
 * Nowe źródło TT = nowy wiersz, nie nowy `if`. Wiersz:
 *   `id`, `label`, `gen` (dopełniacz — „słabsza od Gołej klaty”, tylko metody), `page`,
 *   `kind` (`method` / `cap` / `bonus`),
 *   `ability` — klucz `ABILITY_KEYS` (`actors/abilities.mjs`) albo `null` (przysługuje każdemu),
 *   `when(s)` — `true` albo powód odrzucenia (zdanie po polsku, druga osoba),
 *   `parts(s, ctx)` (metody) albo `value(s)` (limity, premie).
 *
 * Posiadane źródła, które dziś nie działają, trafiają do `rejected` z powodem — dymek pokazuje
 * je jako „nie liczy się”. Nieposiadanych nie listujemy.
 */

/**
 * @typedef {object} TTArmor
 * @property {string} name
 * @property {"light"|"medium"|"heavy"} type
 * @property {number} value          Wartość pancerza już po wytrzymałości (`production/naprawa.mjs`).
 * @property {number} [lost]         O ile wytrzymałość zbiła pancerz — tylko do dymka.
 * @property {number|null} dexCap    Limit mod. ZRC z tabeli (`system.armor.dex`), `null` = bez limitu.
 *
 * @typedef {object} TTSnapshot
 * @property {{str:number,dex:number,con:number,int:number,wis:number,cha:number}} mods
 * @property {number} prof
 * @property {TTArmor|null} armor    Pancerz korpusu (lekki, średni, ciężki).
 * @property {boolean} [guards]       Założone ochraniacze rąk albo nóg — też pancerz (D4).
 * @property {boolean} helmet         Hełm na głowie (lalka).
 * @property {boolean} shieldInHand   Tarcza w ręce (lalka).
 * @property {Set<string>} owned      Klucze zdolności, które postać ma.
 * @property {{berserk:boolean, dodging:boolean, incapacitated:boolean, speed0:boolean}} states
 * @property {{zaslona:boolean, twoHatchets:boolean}} held
 */

/** Strona podręcznika reguły wieloklasowości — powód przegranej metody. */
export const MULTICLASS_PAGE = "s. 59";

const _num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const _sum = parts => parts.reduce((n, p) => n + _num(p.value), 0);

/**
 * Co z noszonego sprzętu gasi zdolność; `null` = nic. Pancerz — także same ochraniacze (D4) — gasi
 * zawsze, hełm i tarcza — tylko gdy zdolność je wymienia.
 */
function _wearing(s, { helmet = false, shield = false } = {}) {
  if (s.armor) return "nosisz pancerz";
  if (s.guards) return "nosisz ochraniacze (to też pancerz)";
  if (helmet && s.helmet) return "nosisz hełm";
  if (shield && s.shieldInHand) return "masz tarczę w ręce";
  return null;
}

/**
 * Część ZRC pancerza. Lekki — w całości; średni — do limitu; ciężki — wcale (s. 113–114).
 * `capBonus` podnosi limit (Trening w zbroi, D5: także ciężki 0 → 1). Ciężki nigdy nie dokłada
 * kary za ujemną ZRC — Trening tylko otwiera limit w górę, nie zmienia tego.
 * @returns {{value:number, cap:number|null, raised:number|null}}
 */
export function armorDexPart(armor, dex, capBonus = 0) {
  const heavy = armor?.type === "heavy";
  const cap = heavy ? 0 : (Number.isFinite(armor?.dexCap) ? armor.dexCap : null);
  if (cap === null) return { value: dex, cap: null, raised: null };
  const raised = cap + capBonus;
  let value = Math.min(dex, raised);
  if (heavy) value = Math.max(0, value);
  return { value, cap, raised };
}

/* -------------------------------------------- */
/*  Metody                                       */
/* -------------------------------------------- */

/**
 * Kolejność = rozstrzyganie remisów (PLAN_tt §4.1): pancerz, bez pancerza, Goła klata, Tarcza wiary.
 */
export const TT_METHODS = Object.freeze([
  {
    id: "pancerz", label: "Pancerz", gen: "pancerza", page: "s. 113–114", kind: "method", ability: null,
    when: s => (s.armor ? true : "nie nosisz pancerza"),
    parts: (s, { capBonus = 0 } = {}) => {
      const dex = armorDexPart(s.armor, s.mods.dex, capBonus);
      const lost = _num(s.armor.lost);
      return [
        { label: s.armor.name, value: _num(s.armor.value), note: lost > 0 ? `−${lost} uszkodzenie` : null },
        { label: "ZRC", value: dex.value }
      ];
    }
  },
  {
    // Bez pancerza korpusu; ochraniacze (pancerz w sensie zdolności, D4) dokładają do niej swoje +1.
    id: "bezPancerza", label: "TT podstawowa", gen: "podstawowej TT", page: "s. 15", kind: "method", ability: null,
    when: s => (s.armor ? "nosisz pancerz" : true),
    parts: s => [{ label: "10", value: 10 }, { label: "ZRC", value: s.mods.dex }]
  },
  {
    id: "golaKlata", label: "Goła klata", gen: "Gołej klaty", page: "s. 67", kind: "method", ability: "golaKlata",
    when: s => _wearing(s, { helmet: true, shield: true }) ?? true,
    parts: s => [{ label: "10", value: 10 }, { label: "ZRC", value: s.mods.dex }, { label: "KON", value: s.mods.con }]
  },
  {
    id: "tarczaWiary", label: "Tarcza wiary", gen: "Tarczy wiary", page: "s. 75", kind: "method", ability: "tarczaWiary",
    when: s => _wearing(s) ?? true,
    parts: s => [{ label: "10", value: 10 }, { label: "ZRC", value: s.mods.dex }, { label: "CHA", value: s.mods.cha }]
  }
]);

/* -------------------------------------------- */
/*  Limity                                       */
/* -------------------------------------------- */

/** Podnoszą limit ZRC z pancerza. Nigdy nie obniżają TT. */
export const TT_CAPS = Object.freeze([
  {
    id: "treningWZbroi", label: "Trening w zbroi", page: "s. 89", kind: "cap", ability: "treningWZbroi",
    when: s => (s.armor ? true : s.guards ? "ochraniacze nie ograniczają ZRC" : "nie nosisz pancerza"),
    value: () => 1
  }
]);

/* -------------------------------------------- */
/*  Premie stałe                                 */
/* -------------------------------------------- */

export const TT_BONUSES = Object.freeze([
  {
    id: "obled", label: "Obłęd Berserkera", page: "s. 67", kind: "bonus", ability: "berserk",
    when: s => (!s.states?.berserk ? "nie jesteś w Berserku" : (_wearing(s, { helmet: true, shield: true }) ?? true)),
    value: s => Math.max(0, _num(s.mods.str))
  },
  {
    // Wyjadacz Twardziela i Zwiadowcy — ta sama opcja z dwóch klas liczy się raz (P5, jak Drugi atak).
    // „Kiedy nosisz pancerz” — same ochraniacze też (D4, autor systemu).
    id: "obslugaPancerza", label: "Obsługa pancerza", page: "s. 86, 98", kind: "bonus", ability: "obslugaPancerza",
    when: s => ((s.armor || s.guards) ? true : "nie nosisz pancerza"),
    value: () => 2
  },
  {
    id: "kuloodpornosc", label: "Kuloodporność", page: "s. 104", kind: "bonus", ability: "kuloodpornosc",
    when: s => _wearing(s, { helmet: true, shield: true }) ?? true,
    value: s => _num(s.prof)
  },
  {
    // „Gdy dzierżysz” — broń w ręce, nie „zaatakowałeś w tej turze” (P1, P2).
    id: "zaslona", label: "Zasłona (Samuraj)", page: "s. 107", kind: "bonus", ability: "samuraj",
    when: s => (s.held?.zaslona ? true : "nie dzierżysz finezyjnej broni białej tnącej"),
    value: () => 1
  },
  {
    id: "siekierki", label: "Tańczący z siekierkami", page: "s. 107", kind: "bonus", ability: "siekierezada",
    when: s => (s.held?.twoHatchets ? true : "nie masz siekierki w obu rękach"),
    value: () => 1
  },
  {
    // Unikanie (s. 30) gaśnie przy Obezwładnieniu i Szybkości 0 — Roszada razem z nim (P4).
    id: "roszada", label: "Roszada (Szachista)", page: "s. 107", kind: "bonus", ability: "szachista",
    when: s => {
      if (!s.states?.dodging) return "nie Unikasz";
      if (s.states.incapacitated) return "jesteś Obezwładniony";
      if (s.states.speed0) return "twoja Szybkość spadła do 0";
      return true;
    },
    value: () => 3
  }
]);

/** Wszystkie klucze zdolności, o które silnik pyta — `actors/tt.mjs` buduje z nich `owned`. */
export const TT_ABILITY_KEYS = Object.freeze([...new Set(
  [...TT_METHODS, ...TT_CAPS, ...TT_BONUSES].map(r => r.ability).filter(Boolean)
)]);

/* -------------------------------------------- */
/*  Silnik                                       */
/* -------------------------------------------- */

const _row = (r, extra = {}) => ({ id: r.id, label: r.label, page: r.page, kind: r.kind, ...extra });

/**
 * Policz TT postaci.
 *
 * @param {TTSnapshot} s
 * @returns {{
 *   method: {id:string, label:string, page:string, kind:string, value:number, parts:object[]},
 *   caps: object[], bonuses: object[], total: number, rejected: object[]
 * }}
 */
export function computeTT(s) {
  const owned = s.owned instanceof Set ? s.owned : new Set(s.owned ?? []);
  const owns = r => !r.ability || owned.has(r.ability);
  const rejected = [];

  // Limity najpierw — kształtują metodę „pancerz”.
  let capBonus = 0;
  const capRows = [];
  for (const r of TT_CAPS) {
    if (!owns(r)) continue;
    const ok = r.when(s);
    if (ok !== true) { rejected.push(_row(r, { reason: ok })); continue; }
    capBonus += _num(r.value(s));
    capRows.push(r);
  }

  // Metody: dozwolone przez ekwipunek konkurują; posiadane zablokowane idą do odrzuconych.
  const candidates = [];
  for (const r of TT_METHODS) {
    if (!owns(r)) continue;
    const ok = r.when(s);
    // Podstawowe metody (pancerz / bez pancerza) wykluczają się wzajemnie — tej, która nie
    // pasuje, nie ma w ogóle; posiadana zdolność idzie do odrzuconych z wartością.
    if (ok !== true && !r.ability) continue;
    const parts = r.parts(s, { capBonus });
    const value = _sum(parts);
    if (ok !== true) { rejected.push(_row(r, { value, reason: ok })); continue; }
    candidates.push({ r, parts, value });
  }
  // Remis zostaje przy wcześniejszym wierszu tabeli.
  const win = candidates.reduce((best, c) => (c.value > best.value ? c : best), candidates[0]);
  for (const c of candidates) {
    if (c === win || !c.r.ability) continue;
    const verb = c.value === win.value ? "nie mocniejsza od" : "słabsza od";
    rejected.push(_row(c.r, { value: c.value, reason: `${verb} ${win.r.gen ?? win.r.label} (${MULTICLASS_PAGE})` }));
  }

  // Limit, który przeszedł warunek, ale niczego nie dał, też jest w dymku — z powodem.
  const caps = [];
  if (capRows.length && s.armor) {
    const dex = _num(s.mods.dex);
    const without = armorDexPart(s.armor, dex, 0);
    const gain = armorDexPart(s.armor, dex, capBonus).value - without.value;
    for (const r of capRows) {
      if (gain > 0) { caps.push(_row(r, { value: gain })); continue; }
      const reason = without.cap === null
        ? "ten pancerz nie ogranicza ZRC"
        : `ZRC ${_signed(dex)} mieści się w limicie ${without.cap}`;
      rejected.push(_row(r, { reason }));
    }
  }

  const bonuses = [];
  for (const r of TT_BONUSES) {
    if (!owns(r)) continue;
    const value = _num(r.value(s));
    const ok = r.when(s);
    if (ok === true) bonuses.push(_row(r, { value }));
    else rejected.push(_row(r, { value, reason: ok }));
  }

  const method = _row(win.r, { value: win.value, parts: win.parts });
  return { method, caps, bonuses, total: win.value + _sum(bonuses), rejected };
}

/**
 * Metoda, która przegrywa **niezależnie od ekwipunku** (P10) — wyszarzana na karcie. Goła klata
 * działa w węższych warunkach niż Tarcza wiary (bez hełmu i tarczy), więc przegrywa zawsze, gdy
 * jest ściśle słabsza; Tarcza wiary nie przegrywa nigdy na stałe, bo w hełmie zostaje sama.
 * @param {TTSnapshot} s
 * @returns {string[]}  Id metod do wyszarzenia.
 */
export function permanentlyLosingMethods(s) {
  const owned = s.owned instanceof Set ? s.owned : new Set(s.owned ?? []);
  if (!owned.has("golaKlata") || !owned.has("tarczaWiary")) return [];
  return _num(s.mods.con) < _num(s.mods.cha) ? ["golaKlata"] : [];
}

/** „+3”, „−1”, „0” — liczba ze znakiem do dymka. */
export function _signed(n) {
  const v = _num(n);
  return v > 0 ? `+${v}` : v < 0 ? `−${Math.abs(v)}` : "0";
}

/** Powierzchnia dla testów Quench (TESTING.md, warstwa 4). */
export const __testing = Object.freeze({ armorDexPart, computeTT, permanentlyLosingMethods });
