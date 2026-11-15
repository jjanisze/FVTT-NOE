/**
 * Neuroshima 5e — pasek walki M8: skróty panelu i szablony paska (PLAN_m8_ruch_i_ekonomia_akcji §8.3, E7). Czysto.
 *
 * Szablon to dziesięć slotów pierwszej strony paska, wypełnianych tym, co postać **rzeczywiście ma**: broń główna i
 * zapasowa, obsługa broni (przeładowanie), dwie decyzje klasowe, ekwipunek, Unikanie, Odstąpienie, paleta Ruch i paleta
 * Więcej. Pusta pozycja (brak drugiej broni, brak zdolności) zostaje pusta. Szablon układa się wyłącznie na jawne
 * żądanie (przycisk „Ułóż pasek”), z podglądem; nic nie układa się samo.
 *
 * Planer nie rusza makr użytkownika: zajęty przez nie slot to konflikt — element ląduje za dziesiątką. Makra modułu
 * (zdolności, skróty, szablon) w slotach szablonu mogą się przesunąć; przesunięcie nie jest usunięciem.
 */

/** Operacje panelu jako skróty paska (`game.neuroshima.skroty.uzyj`). `ruch` i `wiecej` — palety. */
export const SKROTY = Object.freeze({
  przyspieszenie: { label: "Przyspiesz", img: "icons/svg/wingfoot.svg" },
  bieganie: { label: "Biegnij", img: "icons/svg/wingfoot.svg" },
  dodging: { label: "Unik", img: "icons/svg/shield.svg" },
  odstapienie: { label: "Odstąp", img: "icons/svg/door-exit.svg" },
  padnij: { label: "Padnij / Powstań", img: "icons/svg/falling.svg" },
  powstan: { label: "Padnij / Powstań", img: "icons/svg/falling.svg" },
  pomoz: { label: "Pomóż", img: "icons/svg/regen.svg" },
  wyczekaj: { label: "Wyczekaj", img: "icons/svg/clockwork.svg" },
  reaguj: { label: "Reaguj", img: "icons/svg/lightning.svg" },
  skok: { label: "Skok", img: "icons/svg/jump.svg" },
  ruch: { label: "Ruch", img: "icons/svg/walk.svg" },
  wiecej: { label: "Więcej", img: "icons/svg/book.svg" }
});

/** Wersja szablonów — zapisywana przy ułożeniu (użytkownik × postać), żeby późniejsza zmiana szablonu była widoczna. */
export const WERSJA_SZABLONU = 1;

/** Dziesięć slotów szablonu w kolejności 1–9, 0 (sloty paska 1–10). */
export const SLOTY_SZABLONU = Object.freeze([
  { klucz: "bron", label: "Broń główna" },
  { klucz: "zapas", label: "Broń zapasowa" },
  { klucz: "obsluga", label: "Obsługa broni" },
  { klucz: "klasa1", label: "Decyzja klasowa" },
  { klucz: "klasa2", label: "Decyzja klasowa" },
  { klucz: "ekwipunek", label: "Ekwipunek" },
  { klucz: "unik", label: "Unikanie" },
  { klucz: "odstap", label: "Odstąpienie" },
  { klucz: "ruch", label: "Ruch" },
  { klucz: "wiecej", label: "Więcej" }
]);

/**
 * Sześć szablonów: kolejność decyzji klasowych (tylko posiadane; brak — następna, potem inne posiadane zdolności z
 * akcją). `ruchB` — zdolność, której warianty B trafiają do palety Ruch zamiast osobnego slotu (Złodziej: Szybkie nogi,
 * zamiast klasowego „B Bieganie”, §8.3).
 */
export const SZABLONY = Object.freeze({
  brutal: Object.freeze({ label: "Brutal", klasa: ["berserk", "z-bara", "solowa"] }),
  cwaniak: Object.freeze({ label: "Cwaniak", klasa: ["szybka-gadka", "cwaniacki-zwod", "obelga", "glowa-do-gory", "motywacja"] }),
  spec: Object.freeze({ label: "Spec", klasa: ["dobra-rada", "szybkie-badanie", "szybkie-rece", "inteligentna-obrona"] }),
  twardziel: Object.freeze({ label: "Twardziel", klasa: ["przycelowanie", "kondycha", "zryw"] }),
  zlodziej: Object.freeze({ label: "Złodziej", klasa: ["kocie-kosci", "matrix"], ruchB: "szybkie-nogi" }),
  zwiadowca: Object.freeze({ label: "Zwiadowca", klasa: ["klusownik"] })
});

/**
 * Zdolności, które nie są decyzją w turze: wybór Ulubionej broni to ustawienie (atak za B wybiera się w „Sposobie
 * ataku”), Szybkie nogi to warianty w palecie Ruch.
 */
export const POMIN_W_DECYZJACH = Object.freeze(["szybkie-nogi", "ulubiona-bron-twardziel", "ulubiona-bron-zlodziej", "ulubiona-bron-zwiadowca"]);

/** Warianty B Szybkich nóg w palecie Ruch (s. 89): Przyspieszenie, Odstąpienie, Ukrywanie się w Akcji Bonusowej. */
export const WARIANTY_SZYBKICH_NOG = Object.freeze([
  { id: "przyspieszenie", label: "Przyspiesz [B]", deklaracja: "przyspieszenie" },
  { id: "odstapienie", label: "Odstąp [B]", deklaracja: "odstapienie" },
  { id: "ukrycie", label: "Ukryj się [B]", umiejetnosc: "skr" }
]);

/**
 * Dwie decyzje klasowe: kolejność szablonu klasy (posiadane), potem inne posiadane zdolności paska z akcją (A/B/R) wg
 * poziomu, potem reszta. Zryw i zdolności wyższych poziomów — tylko gdy postać je ma.
 * @param {string|null} klasa  identyfikator klasy (`brutal`…)
 * @param {{id: string, action?: string|null, level?: number|null}[]} posiadane  zdolności z makrem paska
 * @param {number} [ile]
 * @returns {string[]}
 */
export function decyzjeKlasowe(klasa, posiadane, ile = 2) {
  const ma = new Map((posiadane ?? []).filter(p => !POMIN_W_DECYZJACH.includes(p.id)).map(p => [p.id, p]));
  const out = (SZABLONY[klasa]?.klasa ?? []).filter(id => ma.has(id));
  const reszta = [...ma.values()].filter(p => !out.includes(p.id))
    .sort((a, b) => (b.action ? 1 : 0) - (a.action ? 1 : 0) || (Number(a.level) || 99) - (Number(b.level) || 99) || a.id.localeCompare(b.id));
  return [...out, ...reszta.map(p => p.id)].slice(0, ile);
}

/**
 * Plan ułożenia szablonu na obecnym pasku.
 * @param {({klucz: string, id: string, label: string}|null)[]} wpisy  dziesięć pozycji (`id` — tożsamość makra:
 *   `item:<uuid>:<aktywność>`, `zdolnosc:<id>`, `skrot:<akcja>`), `null` — pusto
 * @param {Record<number, {id: string|null, nasze: boolean, nazwa: string}>} pasek  zajęte sloty: tożsamość makra modułu
 *   (`nasze`) albo makro użytkownika
 * @param {{maxSlot?: number}} [o]
 * @returns {{kroki: object[], odsuniecia: {z: number, do: number|null, nazwa: string}[]}}
 *   `kroki[i]` = `{slot, klucz, label, id, akcja: "jest"|"dodaj"|"przenies"|"konflikt"|"brak", z: number|null,
 *   do: number|null, zajety: string|null}`; przy konflikcie `do` — slot za dziesiątką (albo `null` — brak miejsca)
 */
export function planPaska(wpisy, pasek, { maxSlot = 50 } = {}) {
  const N = SLOTY_SZABLONU.length;
  const gdzie = new Map();
  for (const [s, m] of Object.entries(pasek ?? {})) {
    if (m?.nasze && m.id && !gdzie.has(m.id)) gdzie.set(m.id, Number(s));
  }
  const zajete = new Set(Object.keys(pasek ?? {}).map(Number));
  const docelowe = new Map();   // slot → id (w slotach szablonu)
  const kroki = [];
  for (let i = 0; i < N; i++) {
    const slot = i + 1;
    const w = wpisy[i] ?? null;
    const base = { slot, klucz: SLOTY_SZABLONU[i].klucz, label: w?.label ?? SLOTY_SZABLONU[i].label, id: w?.id ?? null, z: null, do: slot, zajety: null };
    if (!w) { kroki.push({ ...base, akcja: "brak", do: null }); continue; }
    const cur = pasek?.[slot];
    if (cur?.nasze && cur.id === w.id) { kroki.push({ ...base, akcja: "jest" }); docelowe.set(slot, w.id); continue; }
    if (cur && !cur.nasze) { kroki.push({ ...base, akcja: "konflikt", zajety: cur.nazwa, z: gdzie.get(w.id) ?? null }); continue; }
    const z = gdzie.get(w.id) ?? null;
    kroki.push({ ...base, akcja: z ? "przenies" : "dodaj", z });
    docelowe.set(slot, w.id);
  }
  // Wolne sloty za dziesiątką: puste albo zwalniane przez przenoszone do szablonu makra modułu.
  const zwalniane = new Set(kroki.filter(k => k.akcja === "przenies" && k.z > N).map(k => k.z));
  const rezerwa = new Set();
  const wolny = () => {
    for (let s = N + 1; s <= maxSlot; s++) {
      if ((!zajete.has(s) || zwalniane.has(s)) && !rezerwa.has(s)) { rezerwa.add(s); return s; }
    }
    return null;
  };
  // Makra modułu w slotach szablonu, które nie są tam chciane: do swojego slotu szablonu albo za dziesiątkę.
  const odsuniecia = [];
  const chcianeId = new Set(docelowe.values());
  for (let slot = 1; slot <= N; slot++) {
    const cur = pasek?.[slot];
    if (!cur?.nasze || docelowe.get(slot) === cur.id) continue;
    if (chcianeId.has(cur.id)) continue;   // przenosi go krok jego slotu
    odsuniecia.push({ z: slot, do: wolny(), nazwa: cur.nazwa });
  }
  // Konflikty: element już na pasku zostaje za dziesiątką albo idzie tam z odsuniętym makrem; nowy — wolny slot.
  for (const k of kroki) {
    if (k.akcja !== "konflikt") continue;
    if (k.z && k.z > N) k.do = k.z;
    else if (k.z) k.do = odsuniecia.find(o => o.z === k.z)?.do ?? null;
    else k.do = wolny();
  }
  return { kroki, odsuniecia };
}
