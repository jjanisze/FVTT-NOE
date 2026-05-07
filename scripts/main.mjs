/**
 * Neuroshima: Ostatnia Era — main module entry point.
 * 
 * Overrides dnd5e configuration to implement Neuroshima 5e rules:
 * - Polish terminology for abilities, skills, damage types
 * - 18 Neuroshima skills replacing dnd5e skill list
 * - 22 tool proficiency sets (narzędzia małego X)
 * - 12 Neuroshima damage types (adds explosive, removes force/necrotic/thunder)
 * - Spellcasting removal (Neuroshima has no magic)
 * - Currency → gamble (gb)
 * - Movement in meters
 */

import { registerSkills } from "./config/skills.mjs";
import { registerTools } from "./config/tools.mjs";
import { registerDamageTypes } from "./config/damage-types.mjs";
import { registerTerminology } from "./config/terminology.mjs";
import { removeSpellcasting } from "./config/spellcasting.mjs";
import { registerExhaustion } from "./config/exhaustion.mjs";
import { registerRestOverrides } from "./config/rest.mjs";
import { injectLocalization } from "./config/localization.mjs";
import { registerActorAbilities } from "./actors/abilities.mjs";
import { registerWeapons } from "./config/weapons.mjs";
import { registerZranienie } from "./combat/zranienie.mjs";
import { registerRerolls } from "./combat/rerolls.mjs";
import { registerKnockoutAndLastAction, onPreUpdateActorDeathSaves } from "./combat/knockout.mjs";
import { registerCoverSystem } from "./combat/cover.mjs";
import { registerMagazines } from "./weapons/magazine.mjs";
import { registerWeaponJams } from "./weapons/jams.mjs";
import { registerFireModes } from "./weapons/fire-modes.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/**
 * Init hook — fires during system initialization, before ready.
 * CONFIG.DND5E is already populated by dnd5e at this point.
 */
Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing Neuroshima 5e overrides`);

  // Phase 1: CONFIG overrides
  registerTerminology();
  registerSkills();
  registerTools();
  registerDamageTypes();
  removeSpellcasting();
  registerExhaustion();
  registerRestOverrides();
  registerActorAbilities();
  registerWeapons();

  // Phase 1: Combat systems
  registerZranienie();
  registerRerolls();
  registerKnockoutAndLastAction();
  registerCoverSystem();
  registerMagazines();
  registerWeaponJams();
  registerFireModes();

  // Ostatnia Akcja needs preUpdateActor to track previous death failures
  Hooks.on("preUpdateActor", onPreUpdateActorDeathSaves);

  console.log(`${MODULE_ID} | All Phase 1 overrides applied`);
});

/**
 * i18nInit hook — fires after i18n is initialized but before ready.
 * Verifies translations loaded correctly; fetches fallback if needed.
 */
Hooks.once("i18nInit", async () => {
  await injectLocalization();
});

/**
 * Ready hook — fires after all documents are loaded and the game is ready.
 * Used for runtime patches that require game data.
 */
Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | Neuroshima 5e module ready`);

  // Validate overrides
  const skillCount = Object.keys(CONFIG.DND5E.skills).length;
  const toolCount = Object.keys(CONFIG.DND5E.tools).length;
  const dmgCount = Object.keys(CONFIG.DND5E.damageTypes).length;
  const exhaustionSpeed = CONFIG.DND5E.conditionTypes?.exhaustion?.reduction?.speed;
  const shortRestMin = CONFIG.DND5E.restTypes?.short?.duration?.normal;
  const longRestMin = CONFIG.DND5E.restTypes?.long?.duration?.normal;

  console.log(`${MODULE_ID} | Skills: ${skillCount}, Tools: ${toolCount}, Damage types: ${dmgCount}`);
  console.log(`${MODULE_ID} | Exhaustion speed penalty: ${exhaustionSpeed} m/level`);
  console.log(`${MODULE_ID} | Rest durations: KO=${shortRestMin}min, DO=${longRestMin}min`);
  console.log(`${MODULE_ID} | Forsowanie: ${game.settings.get(MODULE_ID, "forsowanieEnabled") ? "ENABLED" : "DISABLED"}`);

  if (skillCount !== 18) console.warn(`${MODULE_ID} | Expected 18 skills, got ${skillCount}`);
  if (toolCount !== 22) console.warn(`${MODULE_ID} | Expected 22 tools, got ${toolCount}`);

  // Warn if not using modern rules (needed for exhaustion -2 per level)
  if (globalThis.dnd5e?.settings?.rulesVersion !== "modern") {
    console.warn(`${MODULE_ID} | ⚠ Rules version is "${globalThis.dnd5e?.settings?.rulesVersion}", not "modern". Exhaustion -2/level penalty requires modern rules.`);
    ui.notifications?.warn("Neuroshima: Ustaw Rules Version na 'Modern (2024)' w ustawieniach dnd5e, aby Wyczerpanie dawało -2 do testów.");
  }
});
