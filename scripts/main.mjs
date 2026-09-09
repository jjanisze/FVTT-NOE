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
import { registerCreatureTypes } from "./config/creature-types.mjs";
import { registerTermowizja, registerTermowizjaVision } from "./config/detection-termowizja.mjs";
import { registerSP } from "./actors/sp.mjs";
import { registerTerminology } from "./config/terminology.mjs";
import { removeSpellcasting } from "./config/spellcasting.mjs";
import { registerConditions } from "./config/conditions.mjs";
import { registerStateColors } from "./config/state-colors.mjs";
import { registerExhaustion } from "./config/exhaustion.mjs";
import { registerLevelledConditions, levelledConditionsApi } from "./actors/levelled-conditions.mjs";
import { registerRestOverrides } from "./config/rest.mjs";
import { registerPauseScreen } from "./config/pause-screen.mjs";
import { injectLocalization } from "./config/localization.mjs";
import { registerActorAbilities } from "./actors/abilities.mjs";
import { registerPW } from "./actors/pw.mjs";
import { registerClassState } from "./actors/class-state.mjs";
import { registerAbilityHotbar } from "./actors/ability-hotbar.mjs";
import { registerClassMigration } from "./migration/migrate-classes.mjs";
import { registerPochodzeniaMigration } from "./migration/migrate-pochodzenia.mjs";
import { registerSightRangeMigration } from "./migration/normalize-sight-range.mjs";
import { registerFovMigration } from "./migration/normalize-fov-angle.mjs";
import { registerPistoletRaceMigration } from "./migration/migrate-pistolet-race.mjs";
import { registerGearGraduationMigration } from "./migration/migrate-gear-graduation.mjs";
import { registerMedykGraduationMigration } from "./migration/migrate-medyk-graduation.mjs";
import { registerZetonLuxorMigration } from "./migration/migrate-zeton-luxor.mjs";
import { registerRescaleSurowceMigration } from "./migration/rescale-surowce-units.mjs";
import { registerGadzetyMigration } from "./migration/migrate-gadzety.mjs";
import { registerToolSubstitutesMigration } from "./migration/migrate-tool-substitutes.mjs";
import { registerSrdCleanup } from "./config/srd-cleanup.mjs";
import { registerClassRules } from "./actors/class-rules.mjs";
import { registerCichyKrok } from "./actors/cichy-krok.mjs";
import { registerBezDna } from "./actors/bez-dna.mjs";
import { registerSamuraj } from "./actors/samuraj.mjs";
import { registerPDPanel } from "./actors/pd-panel.mjs";
import { registerHealthPanel, healthApi } from "./actors/health-panel.mjs";
import { registerDiseaseEffects, syncDiseaseEffects } from "./actors/disease-effects.mjs";
import { registerBleeding, bleedingApi } from "./combat/bleeding.mjs";
import { registerPodpalenie, podpalenieApi } from "./combat/podpalenie.mjs";
import { registerFalling, fallingApi } from "./combat/falling.mjs";
import { registerFuksPips } from "./actors/fuks-pips.mjs";
import { registerWeapons } from "./config/weapons.mjs";
import { registerArmor } from "./config/armor.mjs";
import { registerArmorRules, report as armorReport } from "./actors/armor-rules.mjs";import { registerZranienie } from "./combat/zranienie.mjs";
import { registerCritRiders } from "./combat/crit-riders.mjs";
import { registerPackTactics } from "./combat/pack-tactics.mjs";
import { registerBestiaryThresholds } from "./combat/bestiary-thresholds.mjs";
import { registerRerolls } from "./combat/rerolls.mjs";
import { registerObalajaca } from './combat/obalajaca.mjs';
import { registerWeaponSaveProperties } from './combat/weapon-save-properties.mjs';
import { registerMeleeManeuvers, maneuversApi } from './combat/melee-maneuvers.mjs';
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
import { registerPochodnia, pochodniaApi } from "./weapons/pochodnia.mjs";
import { registerLightSources } from "./items/light-sources.mjs";
import { registerVisionSources } from "./items/vision-sources.mjs";
import { registerPowerSourceUI } from "./items/power-source.mjs";
import { registerBaterie, baterieApi } from "./items/baterie.mjs";
import { registerGadzety, gadzetyApi } from "./items/gadzety.mjs";
import { registerZetonLuxor, zetonLuxorApi } from "./items/zeton-luxor.mjs";
import { registerLatarka, latarkaApi } from "./items/latarka.mjs";
import { registerFlara, flaraApi } from "./items/flara.mjs";
import { registerPistoletNaRace } from "./weapons/pistolet-na-race.mjs";
import { registerGogle, gogleApi, registerNoktowizjaVision } from "./items/gogle.mjs";
import { registerWorldClock, worldClockApi } from "./world-clock.mjs";
import { registerTracerVfx } from "./weapons/tracer-vfx.mjs";
import { registerMapProps, mapPropsApi } from "./scenes/map-props.mjs";
import { registerMapSync, mapSyncApi } from "./scenes/map-sync.mjs";
import { registerMapWatch, mapWatchApi } from "./scenes/map-watch.mjs";
import { registerDifficultTerrainHint, difficultTerrainHintApi } from "./scenes/difficult-terrain-hint.mjs";
import { openTracerDebugPanel, registerTracerDebugPanelControls } from "./weapons/tracer-debug-panel.mjs";
import { openSoundDebugPanel, registerSoundDebugPanelControls } from "./weapons/sound-debug-panel.mjs";
import { registerAmmoSystem } from "./weapons/ammo.mjs";
import { registerAmmoInventory } from "./actors/ammo-inventory.mjs";
import { registerMagazineInventory } from "./actors/magazine-inventory.mjs";
import { registerGrenadeInventory } from "./actors/grenade-inventory.mjs";
import { registerSurowceInventory } from "./actors/surowce-inventory.mjs";
import { registerLekiInventory } from "./actors/leki-inventory.mjs";
import { registerProwiantInventory } from "./actors/prowiant-inventory.mjs";
import { registerEncumbranceBreakdown } from "./actors/encumbrance-breakdown.mjs";
import { registerSheetShell } from "./actors/sheet-shell.mjs";
import { registerVehiclePortraitToggle } from "./actors/vehicle-portrait.mjs";
import { registerClassResourceDice } from "./actors/class-resource-dice.mjs";
import { registerPartySheet } from "./actors/party-sheet.mjs";
import { registerPartyTravel, travelApi } from "./actors/party-travel.mjs";
import { registerPartyLootLock } from "./actors/party-loot-lock.mjs";
import { suppliesApi } from "./actors/party-supplies.mjs";
import { registerSheetPositionStability } from "./actors/sheet-position-stability.mjs";
import { registerDamageReductionUI } from "./weapons/damage-reduction.mjs";
import { registerWeaponAddons } from "./weapons/addons.mjs";
import { registerAddonInventoryUI } from "./actors/addons-inventory.mjs";
import { registerDozownik } from "./weapons/dozownik.mjs";
import { registerSettings } from "./config/settings.mjs";
import { AMMO_CALIBERS, AMMO_CALIBER_MAP, GRENADE_TYPES, GRENADE_MAP } from "./config/ammo-data.mjs";
import { registerZbrojowniaSync } from "./actors/zbrojownia-sync.mjs";
import { TOOLKITS, createToolkits, syncToolkitToAllHolders } from "./config/toolkits-data.mjs";
import { WEAPONS, createWeapons, auditWeapons, repairWeapons } from "./config/weapons-data.mjs";
import {
  auditSurowce, repairSurowce, auditPirotechnika, repairPirotechnika,
  auditChemia, repairChemia, auditChemiaIcons, repairChemiaIcons,
  auditItemCompleteness,
  auditPowerSourceQuantity, repairPowerSourceQuantity,
  auditPowerSourceUses, repairPowerSourceUses,
  auditInventory, repairInventory
} from "./config/inventory-audit.mjs";
import { ARMORS, createArmors } from "./config/armor-data.mjs";import { registerMedyk, medykRefillApi } from "./items/toolkit-medyk.mjs";
import { registerToolkitChecks } from "./items/toolkit-check.mjs";
import { registerToolkitCheckActivity } from "./items/toolkit-check-activity.mjs";
import { registerKowalActions } from "./items/toolkit-kowal.mjs";
import { registerInventoryToggleFix } from "./actors/inventory-toggle-fix.mjs";
import { GEAR_PLACEHOLDERS, createGearPlaceholders, REAL_GEAR, createRealGear } from "./config/gear-data.mjs";
import { registerKolczatka, kolczatkaApi } from "./items/kolczatka.mjs";
import { registerGmSecretItems } from "./items/gm-secret.mjs";
import { registerChemia, chemiaApi } from "./items/chemia.mjs";
import { sztuczkiApi } from "./config/sztuczki-data.mjs";
import { pochodzeniaApi } from "./config/pochodzenia-data.mjs";
import { registerToolAvailability } from "./actors/tool-availability.mjs";
import { registerQuenchTests, testsApi } from "./tests/index.mjs";

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
  registerCreatureTypes();
  registerTermowizja();
  registerTermowizjaVision();
  registerNoktowizjaVision();
  removeSpellcasting();
  // Must precede registerExhaustion: it rebuilds conditionTypes wholesale, and
  // exhaustion.mjs then tunes the entry it leaves behind.
  registerConditions();
  // Przed pierwszym renderem czegokolwiek, bo arkusz czyta te zmienne bez wartosci zapasowych.
  registerStateColors();
  registerExhaustion();
  registerLevelledConditions();
  registerRestOverrides();
  registerPauseScreen();
  registerActorAbilities();

  // Phase 3: Class / progression layer
  registerPW();
  // Bestiariusz: NPC proficiency bonus comes from the rulebook, not from CR.
  // Wraps prepareDerivedData like registerPW; the two chain safely.
  registerSP();
  registerClassState();
  registerClassResourceDice();
  registerAbilityHotbar();
  registerClassMigration();
  // Musi iść po registerClassMigration — tamto podmienia całe api.migration, nie dopisuje do niego.
  registerPochodzeniaMigration();
  registerSightRangeMigration();
  registerFovMigration();
  registerPistoletRaceMigration();
  registerGearGraduationMigration();
  registerMedykGraduationMigration();
  registerZetonLuxorMigration();
  registerRescaleSurowceMigration();
  registerGadzetyMigration();
  registerToolSubstitutesMigration();
  registerSrdCleanup();
  registerClassRules();
  registerCichyKrok();
  registerBezDna();
  registerSamuraj();
  registerPDPanel();

  // Phase 4: Long-term survival layer
  registerHealthPanel();
  registerDiseaseEffects();
  registerBleeding();
  registerPodpalenie();
  registerFalling();
  registerFuksPips();

  registerAmmoInventory();
  registerMagazineInventory();
  registerGrenadeInventory();
  registerSurowceInventory();
  registerLekiInventory();
  registerProwiantInventory();
  registerEncumbranceBreakdown();
  registerSheetPositionStability();
  registerWeapons();
  registerArmor();
  registerArmorRules();
  registerValidation();

  // Phase 1: Combat systems
  registerZranienie();
  // Bestiariusz automation. Crit riders announce and wait for the GM;
  // pack tactics resolves silently (pure geometry, no judgement call).
  registerCritRiders();
  registerPackTactics();
  registerBestiaryThresholds();
  registerRerolls();
  registerObalajaca();
  registerWeaponSaveProperties();
  registerMeleeManeuvers();
  registerKnockoutAndLastAction();
  registerCoverSystem();
  registerMagazines();
  registerWeaponJams();
  registerMeleeDegradation();
  registerFireModes();
  // Must precede any toolkit item using it (Zbrojownia/actor items are loaded as
  // part of world init) — same phase as the fire-mode activity types above.
  registerToolkitCheckActivity();
  registerKowalActions();
  registerInventoryToggleFix();
  registerThrownWeapons();
  registerAmmoSystem();
  registerWeaponAddons();
  registerAddonInventoryUI();
  registerDozownik();
  registerZbrojowniaSync();
  registerMedyk();
  registerToolkitChecks();
  registerChemia();
  registerToolAvailability();

  // Nasłuch map wypchniętych z Tiled. W init, bo rejestruje ustawienia świata.
  registerMapWatch();

  // Trudny teren zapalany razem z miarką ruchu (ustawienie klienta).
  registerDifficultTerrainHint();

  // Phase 2: Damage application UI
  registerDamageReductionUI();

  // Last: its render hook relocates panels the injectors above have already built,
  // so it must be the final renderActorSheet listener registered.
  registerSheetShell();

  // Vehicle sheet is still stock dnd5e (no Neuroshima subclass) — it's just missing the
  // portrait/token toggle every other actor sheet type has. Patches the live DOM, not a sheet.
  registerVehiclePortraitToggle();

  // Karta drużyny: stan członków, podróż, zapasy.
  registerPartyTravel();
  registerPartySheet();
  registerPartyLootLock();

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

  // Nasłuch na `quenchReady` — bez modułu Quench hak nigdy nie odpali.
  registerQuenchTests();

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
  game.neuroshima = {
    AMMO_CALIBERS, AMMO_CALIBER_MAP, GRENADE_TYPES, GRENADE_MAP, TOOLKITS, createToolkits,
    syncToolkitToAllHolders, GEAR_PLACEHOLDERS, createGearPlaceholders, REAL_GEAR, createRealGear
  };

  // Broń i pancerze — dane z tabel są źródłem prawdy dla kompendiów i dla
  // odtworzenia zawartości Zbrojowni: game.neuroshima.createWeapons()
  game.neuroshima.WEAPONS = WEAPONS;
  game.neuroshima.createWeapons = createWeapons;
  // game.neuroshima.auditWeapons() — read-only drift report (console + return value).
  // game.neuroshima.repairWeapons() — applies exactly what the audit finds.
  game.neuroshima.auditWeapons = auditWeapons;
  game.neuroshima.repairWeapons = repairWeapons;

  // Cross-actor inventory categorisation (Surowce/Pirotechnika/Chemia) — items whose
  // icon/name looks right but whose `type` keeps them invisible to the matching Zasoby
  // panel. Same audit-then-repair shape as weapons above.
  // game.neuroshima.inventoryAudit.auditInventory() / .repairInventory() — everything.
  // Per-category variants if you only want to touch one bucket.
  game.neuroshima.inventoryAudit = {
    auditSurowce, repairSurowce,
    auditPirotechnika, repairPirotechnika,
    auditChemia, repairChemia,
    auditChemiaIcons, repairChemiaIcons,
    auditItemCompleteness,
    auditPowerSourceQuantity, repairPowerSourceQuantity,
    auditPowerSourceUses, repairPowerSourceUses,
    auditInventory, repairInventory
  };

  game.neuroshima.ARMORS = ARMORS;
  game.neuroshima.createArmors = createArmors;

  // Pancerze — game.neuroshima.pancerze.report() wypisuje, co moduł liczy sam,
  // a co zostaje po stronie MG.
  game.neuroshima.pancerze = { report: armorReport };

  // Choroby / Fobie / lekarstwa — game.neuroshima.health.sunset() etc.
  game.neuroshima.health = { ...healthApi, syncEffects: syncDiseaseEffects, bleeding: bleedingApi };
  game.neuroshima.podpalenie = podpalenieApi;
  game.neuroshima.falling = fallingApi;

  // Upojenie / Skażenie / Zranienie — game.neuroshima.conditions.drink(actor) etc.
  // `.get/.set/.adjust` cover all three tracks, whoever owns the store.
  game.neuroshima.conditions = levelledConditionsApi;

  // Chemia, leki i narkotyki — game.neuroshima.chemia.take(actor, "medpak")
  game.neuroshima.chemia = chemiaApi;

  // Sztuczki — game.neuroshima.sztuczki.report() wypisuje, ile z nich system
  // naprawdę egzekwuje, a ile zostaje na głowie MG.
  game.neuroshima.sztuczki = sztuczkiApi;

  // Pochodzenia — ten sam rejestr dla 36 zdolności z 12 regionów.
  game.neuroshima.pochodzenia = pochodzeniaApi;

  // Manewry wręcz — game.neuroshima.manewry.pochwycenie(), .odepchniecie(), .wytracenie()
  game.neuroshima.manewry = maneuversApi;

  registerWeaponSounds();
  registerEngineControls();
  registerLightSources();
  registerVisionSources();
  registerPowerSourceUI();
  registerPochodnia();
  game.neuroshima.pochodnia = pochodniaApi;
  registerBaterie();
  registerGadzety();
  game.neuroshima.baterie = baterieApi;
  // Przedmioty smaczkowe z SFX — game.neuroshima.gadzety
  game.neuroshima.gadzety = gadzetyApi;
  registerZetonLuxor();
  game.neuroshima.zetonLuxor = zetonLuxorApi;
  registerLatarka();
  game.neuroshima.latarka = latarkaApi;
  registerFlara();
  game.neuroshima.flara = flaraApi;
  registerKolczatka();
  game.neuroshima.kolczatka = kolczatkaApi;
  registerGmSecretItems();
  game.neuroshima.medykRefill = medykRefillApi;
  registerPistoletNaRace();
  registerGogle();
  game.neuroshima.gogle = gogleApi;
  registerWorldClock();
  game.neuroshima.time = worldClockApi;
  registerTracerVfx();
  if (game.neuroshima?.vfx) game.neuroshima.vfx.panel = openTracerDebugPanel;

  // Weapon-sound audition panel — game.neuroshima.sounds.panel()
  game.neuroshima.sounds = { panel: openSoundDebugPanel };

  // Propy map z Tiled (szlaban, wrota silosu, pojazdy) —
  // game.neuroshima.props.toggleProp("silo-hatch")
  registerMapProps();
  game.neuroshima.props = mapPropsApi;

  // Aktualizacja sceny po ponownym eksporcie mapy z Tiled —
  // game.neuroshima.maps.update("UPSIDE")
  registerMapSync();
  game.neuroshima.maps = { ...mapSyncApi, ...mapWatchApi };
  game.neuroshima.trudnyTeren = difficultTerrainHintApi;

  // Karta drużyny — game.neuroshima.podroz.openBiomePicker(actor), .zapasy.hunt(grupa)
  game.neuroshima.podroz = travelApi;
  game.neuroshima.zapasy = suppliesApi;

  // Testy Quench — game.neuroshima.tests.run() / .run("choroby") / .list()
  game.neuroshima.tests = testsApi;

  // Validate overrides
  const skillCount = Object.keys(CONFIG.DND5E.skills).length;
  const toolCount = Object.keys(CONFIG.DND5E.tools).length;
  const dmgCount = Object.keys(CONFIG.DND5E.damageTypes).length;
  const exhaustionSpeed = CONFIG.DND5E.conditionTypes?.exhaustion?.reduction?.speed;
  const conditionCount = Object.keys(CONFIG.DND5E.conditionTypes ?? {}).length;
  const shortRestMin = CONFIG.DND5E.restTypes?.short?.duration?.normal;
  const longRestMin = CONFIG.DND5E.restTypes?.long?.duration?.normal;

  console.log(`${MODULE_ID} | Skills: ${skillCount}, Tools: ${toolCount}, Damage types: ${dmgCount}`);
  console.log(`${MODULE_ID} | Exhaustion speed penalty: ${exhaustionSpeed} m/level`);
  console.log(`${MODULE_ID} | Rest durations: KO=${shortRestMin}min, DO=${longRestMin}min`);
  console.log(`${MODULE_ID} | Forsowanie: ${game.settings.get(MODULE_ID, "forsowanieEnabled") ? "ENABLED" : "DISABLED"}`);

  if (skillCount !== 18) console.warn(`${MODULE_ID} | Expected 18 skills, got ${skillCount}`);
  if (toolCount !== 22) console.warn(`${MODULE_ID} | Expected 22 tools, got ${toolCount}`);
  // 14 z TABELI STANÓW + 9 zagrożeń (incl. "ambush" — Niespodziewany atak, see
  // conditions.mjs's NEUROSHIMA_ZAGROZENIA) + Upojenie + Skażenie + Zranienie
  if (conditionCount !== 26) console.warn(`${MODULE_ID} | Expected 26 conditions, got ${conditionCount}`);

  // Warn if not using modern rules (needed for exhaustion -2 per level)
  if (globalThis.dnd5e?.settings?.rulesVersion !== "modern") {
    console.warn(`${MODULE_ID} | âš  Rules version is "${globalThis.dnd5e?.settings?.rulesVersion}", not "modern". Exhaustion -2/level penalty requires modern rules.`);
    ui.notifications?.warn("Neuroshima: Ustaw Rules Version na 'Modern (2024)' w ustawieniach dnd5e, aby Wyczerpanie dawaÅ‚o -2 do testÃ³w.");
  }
});


