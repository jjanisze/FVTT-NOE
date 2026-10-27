/**
 * Neuroshima 5e — upadek (NOE, Eksploracja, „Spadanie”, s. 43: 1k6 obrażeń za każde 1,5 m wysokości i Powalenie).
 *
 * dnd5e 6.0 has the whole mechanism: a token left above a lower surface gets the `falling` status (our „Spadanie”,
 * `conditions.mjs`); the GM clicks that status icon on the token, it drops to the surface and the GM gets a damage card
 * with the faller already on the tray — GM in the loop — and damage applied from it knocks prone (only if it dealt
 * any, as our status text says). A scene without movement surfaces still works: dnd5e takes the base of every level as
 * its floor (`TokenDocument5e#_findSupportingSurface`). Fliers follow NOE, not stock (`actors/latanie.mjs`: a prone
 * flier descends without damage, incapacitated alone keeps it aloft). The GM's tool in `combat/falling.mjs` stays for
 * falls the canvas cannot see — a drop painted on the map, liquid, a height from the story. Osteoporoza's multiplier
 * goes on in the tray (`combat/falling.mjs` `onFallDamage`). Only the numbers differ: the 2024 rule is 1d6 per
 * 10 ft, at most 20d6; NOE is per 1,5 m — 5 ft in dnd5e's metric (`movementUnits.m`: 1,5 m = 5 ft) — with no cap.
 *
 * GM, 2026-10-18: dnd5e's own mechanism wherever it gives exactly RAW (PLAN_migracja_dnd5e6.md E9).
 */
export const NOE_FALLING = Object.freeze({ distancePerDie: 5, maximumDice: Infinity, damageDie: "d6", damageType: "bludgeoning" });

export function registerSpadanie() {
  Object.assign(CONFIG.DND5E.falling, NOE_FALLING);
}
