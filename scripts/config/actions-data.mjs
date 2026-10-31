/**
 * Neuroshima 5e — warstwa akcji: definicje i czyste zasady znaczników (PLAN_m7 §3.0.1, D5, D6, D10).
 *
 * Minimalny kształt warstwy z `HANDOFF_movement_hotbar.md` §4: na razie tylko Reakcja [R] i Akcja Bonusowa [B].
 * Znacznik **oznacza, nie liczy budżetu**: pierwsze użycie zakłada stan „… zużyta”, każde następne przed jego
 * zdjęciem daje sygnał naruszenia (szept do MG i właścicieli, dźwięk) — działanie idzie dalej, MG może zignorować.
 * Handoff ruchu dołoży tu ruch i deklaracje A/B.
 *
 * RAW: 1 Akcja Bonusowa na turę, Reakcja „zazwyczaj po swojej turze” i wraca z nową turą (Tura w pigułce, s. 37);
 * Obezwładnienie — żadnych akcji, Akcji Bonusowych ani Reakcji (s. 35); Stopnie Zranienia (s. 32): Znaczny —
 * bez Reakcji, Poważny — bez Akcji Bonusowych (kumulują się, więc dalej też).
 *
 * Bez Foundry — testowane w warstwie 1 (`tests/akcje.test.mjs`).
 */

/** Rodzaje akcji ze znacznikiem. `status` — id stanu w `config/conditions.mjs` (`NEUROSHIMA_MARKERS`). */
export const AKCJE = Object.freeze({
  R: Object.freeze({ kind: "R", status: "reakcja", nazwa: "Reakcja", dopelniacz: "Reakcji", kiedy: "w tej rundzie" }),
  B: Object.freeze({ kind: "B", status: "akcjaBonusowa", nazwa: "Akcja Bonusowa", dopelniacz: "Akcji Bonusowej", kiedy: "w tej turze" })
});

/** `activity.activation.type` dnd5e → rodzaj znacznika. */
export const AKTYWACJA_DO_AKCJI = Object.freeze({ reaction: "R", bonus: "B" });

/** Od którego Stopnia Zranienia akcja przepada (s. 32): 2 Znaczny, 3 Poważny. */
export const ZRANIENIE_BLOKUJE = Object.freeze({ R: 2, B: 3 });
const STOPNIE = Object.freeze({ 2: "Znaczny", 3: "Poważny", 4: "Krytyczny" });

/** Stany, które odbierają wszystkie akcje: Obezwładnienie i stany, które je nadają (s. 35). */
export const STANY_BEZ_AKCJI = Object.freeze({
  incapacitated: "Obezwładnienie", unconscious: "Nieprzytomność", stunned: "Ogłuszenie", paralyzed: "Sparaliżowanie"
});

/**
 * Deklaracja akcji wobec obecnego znacznika.
 * @param {{uzycia?: {zrodlo: string}[], limit?: number}|null} znacznik  zapis znacznika (null — brak)
 * @param {"R"|"B"} kind
 * @param {string} zrodlo      co zużyło akcję (nazwa zdolności, przedmiotu)
 * @param {{stany?: Iterable<string>, zranienie?: number}} [aktor]
 * @returns {{znacznik: {uzycia: {zrodlo: string}[], limit: number}, powody: string[]}}
 */
export function zadeklarujAkcje(znacznik, kind, zrodlo, { stany = [], zranienie = 0 } = {}) {
  const def = AKCJE[kind];
  if (!def) throw new Error(`Nieznany rodzaj akcji „${kind}”`);
  const wczesniej = [...(znacznik?.uzycia ?? [])];
  const limit = Math.max(1, Number(znacznik?.limit) || 1);
  const uzycia = [...wczesniej, { zrodlo: String(zrodlo ?? "?") }];
  const powody = [];

  if (uzycia.length > limit) {
    powody.push(`${def.nazwa} już zużyta ${def.kiedy} (${wczesniej.map(u => u.zrodlo).join(", ")}) — teraz: ${zrodlo}.`);
  }
  const zestaw = new Set(stany);
  const stan = Object.keys(STANY_BEZ_AKCJI).find(s => zestaw.has(s));
  if (stan) powody.push(`${STANY_BEZ_AKCJI[stan]} — bez akcji, Akcji Bonusowych i Reakcji (s. 35).`);
  const z = Number(zranienie) || 0;
  if (z >= ZRANIENIE_BLOKUJE[kind]) {
    powody.push(`Stopień Zranienia ${STOPNIE[Math.min(z, 4)]} — bez ${def.dopelniacz} (s. 32).`);
  }
  return { znacznik: { uzycia, limit }, powody };
}

/**
 * Dodatkowa akcja w tej turze (Zryw, PLAN_m7 R9): podnosi limit znacznika o jeden.
 * @param {{uzycia?: object[], limit?: number}|null} znacznik
 * @returns {{uzycia: object[], limit: number}}
 */
export function dodatkowaAkcja(znacznik) {
  return { uzycia: [...(znacznik?.uzycia ?? [])], limit: Math.max(1, Number(znacznik?.limit) || 1) + 1 };
}

/** Linie opisu znacznika dla dymka i opisu efektu. */
export function opisZnacznika(kind, znacznik) {
  const def = AKCJE[kind];
  const uzycia = znacznik?.uzycia ?? [];
  const limit = znacznik?.limit ?? 1;
  return `${def.nazwa}: ${uzycia.map(u => u.zrodlo).join(", ") || "—"}${limit > 1 ? ` (limit ${limit})` : ""}`;
}
