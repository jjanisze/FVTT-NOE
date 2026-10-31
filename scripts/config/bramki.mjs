/**
 * Neuroshima 5e — bramki „raz na turę / rundę / walkę” (PLAN_m7 §3.0.4).
 *
 * Stock najpierw: limit, który jest zasobem, to `uses` z odnawianiem `turnStart` (Bolesny atak, Mój bóg kule nosi).
 * Ta bramka jest dla limitów, które zasobem nie są — Ułatwienie „raz w rundzie” (Mutant na śniadanie, Słaby punkt,
 * Zwód), przerzut „raz na walkę” (Clint). Uogólnia `resourceDiceRound` z `actors/class-resource-dice.mjs`.
 *
 * Zapis: `{ combatId, round, turn }` z chwili użycia. „Raz na turę” to **każda** tura (także cudza — Bolesny atak w
 * Reakcji), nie tylko własna. Poza walką bramki nie ma (jak przy Wściekłym ciosie).
 *
 * Bez Foundry — testowane w warstwie 1 (`tests/akcje.test.mjs`).
 */

/** Zakresy bramki. */
export const ZAKRESY = Object.freeze(["tura", "runda", "walka"]);

/**
 * Czy bramka jest już zajęta w tej chwili walki.
 * @param {{combatId: string, round: number, turn: number}|null} zapis  ostatnie użycie
 * @param {"tura"|"runda"|"walka"} zakres
 * @param {{combatId: string, round: number, turn: number}|null} teraz  chwila walki (null — poza walką)
 * @returns {boolean}
 */
export function bramkaZajeta(zapis, zakres, teraz) {
  if (!zapis || !teraz?.combatId || zapis.combatId !== teraz.combatId) return false;
  if (zakres === "walka") return true;
  if (zapis.round !== teraz.round) return false;
  return zakres === "runda" || zapis.turn === teraz.turn;
}
