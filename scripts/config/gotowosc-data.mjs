/**
 * Neuroshima 5e — gotowość do tury M8 (PLAN_m8_ruch_i_ekonomia_akcji.md §8.4, E8): czysty model, bez Foundry.
 *
 *   - **Pozycja w widocznej kolejności** — „Twoja tura za X”: ilu widocznych kombatantów jest przed tobą (ukrytych nie
 *     liczymy i nie zdradzamy; pokonanych pomija się przy `skipDefeated`). 1 = „Gotuj się, jesteś następny”.
 *     „Następny w widocznej kolejności” nie obiecuje braku ukrytej tury po drodze. Kotwice tury M3/M4
 *     (`combat/kotwica-tury.mjs`): uczestnik, którego tura jest pomijana (wierzchowiec prowadzony — działa w turze
 *     jeźdźca), nie liczy się i nie daje sygnału; uczestnik z kotwicą, który gra własną turę tuż za kotwicą (pasażer
 *     „Za kierowcą”, towarzysz), liczy się jak każda tura — towarzysz bez komendy bywa pominięty dopiero na starcie.
 *   - **Sygnały** — dwa: „następny” i „start własnej tury”, każdy raz na instancję tury (klucz walka:runda:kombatant).
 *     Rerender, zmiana tokenu, efekty i ruch niczego nie powtarzają. Pierwsze wejście w środku tury nie udaje startu.
 *     W pauzie — bez świeżych sygnałów; po wznowieniu najwyżej aktualny, bez kolejki zaległych.
 *   - **Zegar** — rzeczywisty czas tury minus pauzy (liczony z początku i sumy pauz, nie dodawaniem interwałów);
 *     po 30 s żółty, po 60 s czerwony. Nie mierzy winy, nie karze, nie kończy tury, nigdzie nie wysyła statystyk.
 */

/** Progi pilności zegara (§8.4). */
export const PROG_ZOLTY_MS = 30_000;
export const PROG_CZERWONY_MS = 60_000;

/**
 * Stan gotowości podmiotu.
 * @param {{id: string, widoczny: boolean, pokonany?: boolean, pominiety?: boolean}[]} kolejnosc  wszystkie tury w
 *   kolejności walki; `pominiety` — tura z kotwicą, która się nie odbywa (M4 wierzchowiec)
 * @param {number} indeks        indeks bieżącej tury
 * @param {Iterable<string>} moje  id kombatantów podmiotu (przypisana postać, opcjonalnie inni własni)
 * @param {{skipDefeated?: boolean}} [o]
 * @returns {{stan: "tura"|"nastepny"|"oczekiwanie"|null, za: number|null, kto: string|null}}
 *   `kto` — id mojego kombatanta, którego dotyczy stan
 */
export function stanGotowosci(kolejnosc, indeks, moje, { skipDefeated = false } = {}) {
  const ja = new Set(moje);
  const n = kolejnosc?.length ?? 0;
  if (!n || !ja.size) return { stan: null, za: null, kto: null };
  const i0 = Math.max(0, Math.min(n - 1, Number(indeks) || 0));
  const biez = kolejnosc[i0];
  if (biez && ja.has(biez.id)) return { stan: "tura", za: 0, kto: biez.id };
  let przed = 0;
  for (let k = 1; k < n; k++) {
    const c = kolejnosc[(i0 + k) % n];
    if (skipDefeated && c.pokonany) continue;
    if (c.pominiety) continue;
    if (ja.has(c.id)) {
      const za = przed + 1;
      return { stan: za === 1 ? "nastepny" : "oczekiwanie", za, kto: c.id };
    }
    if (c.widoczny) przed += 1;
  }
  return { stan: null, za: null, kto: null };
}

/**
 * Sygnał do odtworzenia przy zmianie stanu: „start” albo „nastepny” — raz na instancję tury. `zagrane` — zbiór
 * kluczy już obsłużonych (rośnie u wołającego). Pierwsza obserwacja (`pierwsza`) tylko oznacza stan jako znany.
 * @param {{stan: string|null, klucz: string|null}} obecny
 * @param {{zagrane: Set<string>, pauza?: boolean, pierwsza?: boolean}} o
 * @returns {"start"|"nastepny"|null}
 */
export function sygnalDoZagrania(obecny, { zagrane, pauza = false, pierwsza = false }) {
  if (!obecny?.klucz || !["tura", "nastepny"].includes(obecny.stan)) return null;
  const k = `${obecny.klucz}|${obecny.stan}`;
  if (zagrane.has(k)) return null;
  if (pierwsza) { zagrane.add(k); return null; }
  if (pauza) return null;            // w pauzie bez świeżych sygnałów; po wznowieniu — ten jeden, jeśli wciąż aktualny
  zagrane.add(k);
  return obecny.stan === "tura" ? "start" : "nastepny";
}

/**
 * Czas tury w ms: od początku minus suma pauz i trwająca pauza.
 * @param {{start: number, pauzaMs?: number, pauzaOd?: number|null}} z
 * @param {number} teraz
 */
export function czasTury({ start, pauzaMs = 0, pauzaOd = null }, teraz) {
  const trwa = pauzaOd != null ? Math.max(0, teraz - pauzaOd) : 0;
  return Math.max(0, teraz - start - (Number(pauzaMs) || 0) - trwa);
}

/** `m:ss.cc` */
export function formatCzasu(ms) {
  const cs = Math.floor(Math.max(0, ms) / 10);
  const m = Math.floor(cs / 6000);
  const s = Math.floor((cs % 6000) / 100);
  const c = cs % 100;
  return `${m}:${String(s).padStart(2, "0")}.${String(c).padStart(2, "0")}`;
}

/** Faza pilności zegara: spokój, żółty (≥ 30 s), czerwony (≥ 60 s). */
export function fazaCzasu(ms) {
  if (ms >= PROG_CZERWONY_MS) return "czerwony";
  if (ms >= PROG_ZOLTY_MS) return "zolty";
  return "spokoj";
}

/** Tekst panelu (bez zegara). */
export function tekstGotowosci({ stan, za }) {
  if (stan === "tura") return "Twoja tura";
  if (stan === "nastepny") return "Gotuj się, jesteś następny";
  if (stan === "oczekiwanie") return `Twoja tura za ${za}`;
  return "";
}
