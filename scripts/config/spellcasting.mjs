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

  // Empty out spell progression
  if (CONFIG.DND5E.spellProgression) {
    CONFIG.DND5E.spellProgression = {};
  }

  // Empty out spellcasting types
  if (CONFIG.DND5E.spellcastingTypes) {
    CONFIG.DND5E.spellcastingTypes = {};
  }

  // Remove spell preparation modes
  if (CONFIG.DND5E.spellPreparationModes) {
    CONFIG.DND5E.spellPreparationModes = {};
  }

  console.log("Neuroshima 5e | Spellcasting config removed");
}
