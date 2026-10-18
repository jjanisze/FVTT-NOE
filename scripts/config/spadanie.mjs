/**
 * Neuroshima 5e — upadek (NOE, Eksploracja, „Spadanie”, s. 43: 1k6 obrażeń za każde 1,5 m wysokości i Powalenie).
 *
 * dnd5e 6.0 has the whole mechanism: a token left above a lower surface gets the `falling` status (our „Spadanie”,
 * `conditions.mjs`); the GM clicks that status icon on the token, it drops to the surface and the GM gets a damage card
 * with the faller already on the tray — GM in the loop — and damage applied from it knocks prone (only if it dealt
 * any, as our status text says). Fliers are exempt unless prone or incapacitated, and nothing happens on scenes
 * without surfaces (there, and for falls into liquid, the GM's tool in `combat/falling.mjs`). Osteoporoza's multiplier
 * goes on in the tray (`combat/falling.mjs` `onFallDamage`). Only the numbers differ: the 2024 rule is 1d6 per
 * 10 ft, at most 20d6; NOE is per 1,5 m — 5 ft in dnd5e's metric (`movementUnits.m`: 1,5 m = 5 ft) — with no cap.
 *
 * GM, 2026-10-18: dnd5e's own mechanism wherever it gives exactly RAW (PLAN_migracja_dnd5e6.md E9).
 */
export const NOE_FALLING = Object.freeze({ distancePerDie: 5, maximumDice: Infinity, damageDie: "d6", damageType: "bludgeoning" });

export function registerSpadanie() {
  Object.assign(CONFIG.DND5E.falling, NOE_FALLING);
}
