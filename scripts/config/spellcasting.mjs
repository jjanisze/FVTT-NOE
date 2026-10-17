/**
 * Neuroshima 5e — spellcasting removal.
 * Strips all magic-related configuration from dnd5e.
 * Neuroshima has no spells, magic schools, spell slots, or ritual casting.
 */
export function removeSpellcasting() {
  // Empty out spell schools
  CONFIG.DND5E.spellSchools = {};

  // Empty out spell levels
  if (CONFIG.DND5E.spellLevels) {
    CONFIG.DND5E.spellLevels = {};
  }

  // Empty out spell components
  if (CONFIG.DND5E.spellComponents) {
    CONFIG.DND5E.spellComponents = {};
  }

  // Empty out spell tags
  if (CONFIG.DND5E.spellTags) {
    CONFIG.DND5E.spellTags = {};
  }

  // `spellProgression`, `spellcastingTypes` and `spellPreparationModes` were deprecated proxies over
  // `CONFIG.DND5E.spellcasting` in 5.3 and are gone in 6.0; emptying them never touched the real table. That table
  // (casting methods, slot progressions) stays: dnd5e reads it in ~20 places while preparing any actor, and
  // nothing in Neuroshima has a spellcasting class to use it.

  console.log("Neuroshima 5e | Spellcasting config removed");
}
