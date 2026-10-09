/**
 * Neuroshima 5e — tiki tury najwyżej raz na turę (PLAN_m3_towarzysze.md F17).
 *
 * Rdzeń v14 i dnd5e odpalają zdarzenia tury tylko naprzód (`Combat#_manageTurnEvents`), ale haki
 * `updateCombat` i `combatTurnChange` idą przy każdej zmianie — także wstecz. Tik bez sprawdzenia kierunku
 * zadawał przy cofnięciu tury drugie 1k4 od ognia, a ponowne „naprzód” trzecie. Dwa warunki, oba potrzebne:
 *
 *   - **kierunek** — tylko krok naprzód (wstecz „koniec tury” poprzedniego to cofnięta tura, nie koniec);
 *   - **pamięć** — ostatni tik każdego rodzaju na aktorze: walka, runda, uczestnik, krawędź. Ponowny krok
 *     naprzód przez turę, która już tyknęła, nic nie robi. Pamięć to flaga zapisywana tylko wtedy, gdy tik
 *     naprawdę idzie, więc przeżywa przeładowanie i zmianę MG.
 *
 * Konsumenci: `combat/bleeding.mjs`, `combat/podpalenie.mjs`, `items/chemia.mjs` (regeneracja, szał),
 * `actors/zagrozenia.mjs` (Uduszenie).
 */

const MODULE_ID = "neuroshima-2026-overrides";

/** `flags.<mod>.tiki = { [rodzaj]: "<walka>:<runda>:<uczestnik>:<krawędź>" }`. */
export const FLAG_TIKI = "tiki";

const _num = v => (Number.isFinite(Number(v)) ? Number(v) : -1);

/**
 * Czy przejście `prior` → `current` to krok naprzód (runda dalej albo ta sama runda i dalsza tura). Czyste.
 * @param {{round?: number, turn?: number|null}|null} prior
 * @param {{round?: number, turn?: number|null}|null} current
 */
export function krokNaprzod(prior, current) {
  if (!current) return false;
  const pr = _num(prior?.round), cr = _num(current.round);
  if (cr !== pr) return cr > pr;
  return _num(current.turn) > _num(prior?.turn);
}

/** Klucz pamięci tiku. Czysty. */
export function kluczTiku(combatId, round, combatantId, krawedz) {
  return `${combatId}:${round}:${combatantId}:${krawedz}`;
}

/**
 * Zgoda na tik i zapis pamięci — wołane tuż przed tikiem, u jednego wykonawcy.
 * @param {Actor} actor
 * @param {string} rodzaj      np. "podpalenie", "krwawienie"
 * @param {Combat} combat
 * @param {{round: number, combatantId: string, krawedz: "start"|"end"}} p
 * @returns {Promise<boolean>}  `false` — ta tura już tyknęła
 */
export async function tikRaz(actor, rodzaj, combat, { round, combatantId, krawedz }) {
  if (!actor || !combat) return false;
  const klucz = kluczTiku(combat.id, round, combatantId, krawedz);
  const pamiec = actor.getFlag(MODULE_ID, FLAG_TIKI) ?? {};
  if (pamiec[rodzaj] === klucz) return false;
  await actor.setFlag(MODULE_ID, FLAG_TIKI, { ...pamiec, [rodzaj]: klucz });
  return true;
}

export const __testing = Object.freeze({ krokNaprzod, kluczTiku });
