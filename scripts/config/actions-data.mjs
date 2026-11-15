/**
 * Neuroshima 5e — warstwa akcji: definicje znaczników M7 (PLAN_m7 §3.0.1, D5, D6, D10) na ledgerze M8.
 *
 * Od M8 (PLAN_m8_ruch_i_ekonomia_akcji §5.1) jedyną prawdą o kosztach jest ledger walczącego
 * (`config/ekonomia-data.mjs`, `combat/ekonomia.mjs`). Znaczniki „Reakcja zużyta” i „Akcja bonusowa zużyta” zostają
 * jako jego **projekcja** — widok na żetonie i w HUD, który czytają inne moduły; ręczna zmiana z HUD-u to korekta.
 *
 * RAW: 1 Akcja Bonusowa na turę, Reakcja „zazwyczaj po swojej turze” i wraca z nową turą (Tura w pigułce, s. 37);
 * Obezwładnienie — żadnych akcji, Akcji Bonusowych ani Reakcji (s. 35); Stopnie Zranienia (s. 32): Znaczny —
 * bez Reakcji, Poważny — bez Akcji Bonusowych (kumulują się, więc dalej też).
 */

export { STANY_BEZ_AKCJI, ZRANIENIE_ZAKAZ as ZRANIENIE_BLOKUJE } from "./ekonomia-data.mjs";

/** Rodzaje akcji ze znacznikiem. `status` — id stanu w `config/conditions.mjs` (`NEUROSHIMA_MARKERS`). */
export const AKCJE = Object.freeze({
  R: Object.freeze({ kind: "R", status: "reakcja", nazwa: "Reakcja", dopelniacz: "Reakcji", kiedy: "w tej rundzie" }),
  B: Object.freeze({ kind: "B", status: "akcjaBonusowa", nazwa: "Akcja Bonusowa", dopelniacz: "Akcji Bonusowej", kiedy: "w tej turze" })
});

/**
 * `activity.activation.type` dnd5e → rodzaj akcji. `action` liczy się poza aktywnościami ataku: Atakowanie to
 * instancja z kilkoma slotami (§7.1), nie „jedna aktywność = jedna A”.
 */
export const AKTYWACJA_DO_AKCJI = Object.freeze({ action: "A", reaction: "R", bonus: "B" });

/** Linia opisu znacznika dla dymka i opisu efektu. */
export function opisZnacznika(kind, znacznik) {
  const def = AKCJE[kind];
  const uzycia = znacznik?.uzycia ?? [];
  const limit = znacznik?.limit ?? 1;
  return `${def.nazwa}: ${uzycia.map(u => u.zrodlo).join(", ") || "—"}${limit > 1 ? ` (limit ${limit})` : ""}`;
}
