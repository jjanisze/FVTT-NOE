/**
 * Neuroshima: Ostatnia Era â€” main module entry point.
 * 
 * Overrides dnd5e configuration to implement Neuroshima 5e rules:
 * - Polish terminology for abilities, skills, damage types
 * - 18 Neuroshima skills replacing dnd5e skill list
 * - 22 tool proficiency sets (narzÄ™dzia maÅ‚ego X)
 * - 12 Neuroshima damage types (adds explosive, removes force/necrotic/thunder)
 * - Spellcasting removal (Neuroshima has no magic)
 * - Currency â†’ gamble (gb)
 * - Movement in meters
 */

import { registerSkills } from "./config/skills.mjs";
import { registerTools } from "./config/tools.mjs";
import { registerToolProficiency } from "./config/tool-proficiency.mjs";
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
import { registerObalajaca } from './combat/obalajaca.mjs';
import { registerWeaponSaveProperties } from './combat/weapon-save-properties.mjs';
import { registerKnockoutAndLastAction, onPreUpdateActorDeathSaves } from "./combat/knockout.mjs";
import { registerCoverSystem } from "./combat/cover.mjs";
import { registerMagazines } from "./weapons/magazine.mjs";
import { registerWeaponJams } from "./weapons/jams.mjs";
import { registerMeleeDegradation } from "./weapons/melee-degradation.mjs";
import { registerFireModes } from "./weapons/fire-modes.mjs";
import { registerThrownWeapons } from "./weapons/thrown.mjs";
import { registerValidation } from "./config/validation.mjs";
import { registerWeaponSounds } from "./weapons/sounds.mjs";
import { registerEngineControls } from "./weapons/engine.mjs";
import { registerTracerVfx } from "./weapons/tracer-vfx.mjs";
import { openTracerDebugPanel, registerTracerDebugPanelControls } from "./weapons/tracer-debug-panel.mjs";
import { openSoundDebugPanel, registerSoundDebugPanelControls } from "./weapons/sound-debug-panel.mjs";
import { registerAmmoSystem } from "./weapons/ammo.mjs";
import { registerAmmoInventory } from "./actors/ammo-inventory.mjs";
import { registerMagazineInventory } from "./actors/magazine-inventory.mjs";
import { registerGrenadeInventory } from "./actors/grenade-inventory.mjs";
import { registerSurowceInventory } from "./actors/surowce-inventory.mjs";
import { registerSheetPositionStability } from "./actors/sheet-position-stability.mjs";
import { registerDamageReductionUI } from "./weapons/damage-reduction.mjs";
import { registerWeaponAddons } from "./weapons/addons.mjs";
import { registerAddonInventoryUI } from "./actors/addons-inventory.mjs";
import { registerDozownik } from "./weapons/dozownik.mjs";
import { registerSettings } from "./config/settings.mjs";
import { AMMO_CALIBERS, AMMO_CALIBER_MAP, GRENADE_TYPES, GRENADE_MAP } from "./config/ammo-data.mjs";
import { registerZbrojowniaSync } from "./actors/zbrojownia-sync.mjs";
import { TOOLKITS, createToolkits } from "./config/toolkits-data.mjs";
import { registerMedyk } from "./items/toolkit-medyk.mjs";
import { registerToolkitChecks } from "./items/toolkit-check.mjs";
import { registerToolAvailability } from "./actors/tool-availability.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/**
 * Init hook â€” fires during system initialization, before ready.
 * CONFIG.DND5E is already populated by dnd5e at this point.
 */
Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing Neuroshima 5e overrides`);

  // Registered at init (not ready) so it's in place before the Token scene-controls
  // toolbar's first render — getSceneControlButtons can fire as early as canvasReady.
  registerTracerDebugPanelControls();
  registerSoundDebugPanelControls();

  // Phase 1: CONFIG overrides
  registerSettings();
  registerTerminology();
  registerSkills();
  registerTools();
  registerToolProficiency();
  registerDamageTypes();
  removeSpellcasting();
  registerExhaustion();
  registerRestOverrides();
  registerActorAbilities();
  registerAmmoInventory();
  registerMagazineInventory();
  registerGrenadeInventory();
  registerSurowceInventory();
  registerSheetPositionStability();
  registerWeapons();
  registerValidation();

  // Phase 1: Combat systems
  registerZranienie();
  registerRerolls();
  registerObalajaca();
  registerWeaponSaveProperties();
  registerKnockoutAndLastAction();
  registerCoverSystem();
  registerMagazines();
  registerWeaponJams();
  registerMeleeDegradation();
  registerFireModes();
  registerThrownWeapons();
  registerAmmoSystem();
  registerWeaponAddons();
  registerAddonInventoryUI();
  registerDozownik();
  registerZbrojowniaSync();
  registerMedyk();
  registerToolkitChecks();
  registerToolAvailability();

  // Phase 2: Damage application UI
  registerDamageReductionUI();

  // Clean up activity chat card pills: remove NaN range, duration, empty strings for weapon cards
  Hooks.on("renderChatMessageHTML", (message, html) => {
    const activityType = message.flags?.dnd5e?.activity?.type;
    if (!activityType) return;

    // Only clean weapon-based activities
    const itemType = message.flags?.dnd5e?.item?.type;
    if (itemType !== "weapon") return;

    const el = html instanceof HTMLElement ? html : html?.[0];
    if (!el) return;

    // Defer via macrotask â€” same reason as ammo.mjs: dnd5e renders pills async
    setTimeout(() => {
      const footer = el.querySelector("ul.card-footer.pills");
      if (!footer) return;

      for (const pill of [...footer.querySelectorAll("li.pill")]) {
        const text = pill.querySelector(".label")?.textContent?.trim() ?? "";
        if (
          !text ||
          text === "Instantaneous" ||
          text === "Natychmiastowe" ||
          /NaN/.test(text) ||
          text === "â€”"
        ) {
          pill.remove();
        }
      }

      // Hide footer if nothing left
      if (!footer.querySelector("li.pill")) footer.remove();
    });
  });

  // Ostatnia Akcja needs preUpdateActor to track previous death failures
  Hooks.on("preUpdateActor", onPreUpdateActorDeathSaves);

  console.log(`${MODULE_ID} | All Phase 1 overrides applied`);
});

/**
 * i18nInit hook â€” fires after i18n is initialized but before ready.
 * Verifies translations loaded correctly; fetches fallback if needed.
 */
Hooks.once("i18nInit", async () => {
  await injectLocalization();
});

/**
 * Ready hook â€” fires after all documents are loaded and the game is ready.
 * Used for runtime patches that require game data.
 */
Hooks.once("ready", () => {
  console.log(`${MODULE_ID} | Neuroshima 5e module ready`);

  // Expose caliber data globally for use in macros and CDP scripts.
  // Usage: game.neuroshima.AMMO_CALIBERS  /  game.neuroshima.AMMO_CALIBER_MAP
  // Grenades stay separate from ammo, but are exposed in the same namespace for automation.
  game.neuroshima = { AMMO_CALIBERS, AMMO_CALIBER_MAP, GRENADE_TYPES, GRENADE_MAP, TOOLKITS, createToolkits };

  registerWeaponSounds();
  registerEngineControls();
  registerTracerVfx();
  if (game.neuroshima?.vfx) game.neuroshima.vfx.panel = openTracerDebugPanel;

  // Weapon-sound audition panel — game.neuroshima.sounds.panel()
  game.neuroshima.sounds = { panel: openSoundDebugPanel };

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
    console.warn(`${MODULE_ID} | âš  Rules version is "${globalThis.dnd5e?.settings?.rulesVersion}", not "modern". Exhaustion -2/level penalty requires modern rules.`);
    ui.notifications?.warn("Neuroshima: Ustaw Rules Version na 'Modern (2024)' w ustawieniach dnd5e, aby Wyczerpanie dawaÅ‚o -2 do testÃ³w.");
  }
});


