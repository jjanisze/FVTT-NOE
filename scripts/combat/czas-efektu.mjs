/**
 * Neuroshima 5e — początek efektu przestawiony na innego uczestnika walki (v14).
 *
 * Rdzeń v14 wygasza efekt na końcu/początku tury kombatanta zapisanego w `start.combatant`, a przy tworzeniu wpisuje
 * tam tego, czyja tura trwa (pamięć projektu: `actors/tt.mjs`). Skutki „do końca następnej tury [kogoś innego]”
 * trzeba więc przestawić. Pułapka: częściowe `start` w danych tworzenia (bez `time`) nie przechodzi walidacji
 * schematu i efekt **po cichu się nie tworzy** (`createEmbeddedDocuments` zwraca pustą listę, w konsoli
 * „start: time may not be undefined”). Dlatego pełny początek z `ActiveEffect.getEffectStart` i podmieniony kombatant.
 */

/**
 * Pełne `start` efektu z kombatantem `combatant` (bieżąca runda i tura walki).
 * @param {Combatant} combatant
 * @param {Combat} [combat]
 * @returns {object}
 */
export function startNaKombatanta(combatant, combat = game.combat) {
  return { ...ActiveEffect.implementation.getEffectStart(combat), combatant: combatant.id };
}
