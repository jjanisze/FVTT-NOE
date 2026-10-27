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

import "./config/dnd5e-fixes.mjs"; // first: workarounds for dnd5e bugs, before any document update can run
import { registerDocLiveness } from "./doc-liveness.mjs";
import { registerSkills } from "./config/skills.mjs";
import { registerTools } from "./config/tools.mjs";
import { registerProficiencyIcons } from "./config/proficiency-icons.mjs";
import { registerToolProficiency } from "./config/tool-proficiency.mjs";
import { registerDamageTypes } from "./config/damage-types.mjs";
import { registerCreatureTypes } from "./config/creature-types.mjs";
import { registerTermowizja, registerTermowizjaVision } from "./config/detection-termowizja.mjs";
import { registerSP } from "./actors/sp.mjs";
import { registerTerminology } from "./config/terminology.mjs";
import { removeSpellcasting } from "./config/spellcasting.mjs";
import { registerConditions } from "./config/conditions.mjs";
import { registerSpadanie } from "./config/spadanie.mjs";
import { registerStateColors } from "./config/state-colors.mjs";
import { registerExhaustion } from "./config/exhaustion.mjs";
import { registerLevelledConditions, levelledConditionsApi } from "./actors/levelled-conditions.mjs";
import { registerRestOverrides } from "./config/rest.mjs";
import { registerRestActivities, restActivitiesApi } from "./actors/rest-activities.mjs";
import { registerPauseScreen } from "./config/pause-screen.mjs";
import { injectLocalization } from "./config/localization.mjs";
import { registerActorAbilities } from "./actors/abilities.mjs";
import { registerPW } from "./actors/pw.mjs";
import { registerTowarzysze, towarzyszeApi } from "./actors/towarzysze.mjs";
import { registerTowarzyszeWalka, towarzyszeWalkaApi } from "./combat/towarzysze-walka.mjs";
import { registerTowarzyszeKarta } from "./actors/towarzysze-karta.mjs";
import { registerTowarzyszeTworzenie, towarzyszeTworzenieApi } from "./actors/towarzysze-tworzenie.mjs";
import { migrujTowarzysza } from "./migration/migrate-towarzysze.mjs";
import { registerDrony, dronyApi } from "./actors/drony.mjs";
import { registerDronySterowanie, dronySterowanieApi } from "./actors/drony-sterowanie.mjs";
import { registerDronyBron, premiaAtakuDrona } from "./actors/drony-bron.mjs";
import { registerDronyStan, dronyStanApi } from "./actors/drony-stan.mjs";
import { registerDronyZdalne, dronyZdalneApi } from "./actors/drony-zdalne.mjs";
import { registerDronyObraz, dronyObrazApi, registerKameraDronaVision } from "./actors/drony-obraz.mjs";
import { registerDronyOsd, dronyOsdApi } from "./actors/drony-osd.mjs";
import { registerDronyNaprawa, dronyNaprawaApi } from "./actors/drony-naprawa.mjs";
import { registerMaszyny, maszynyApi } from "./combat/maszyny.mjs";
import { registerCharacterDefaults } from "./actors/character-defaults.mjs";
import { registerClassState } from "./actors/class-state.mjs";
import { registerAbilityHotbar } from "./actors/ability-hotbar.mjs";
import { registerClassMigration } from "./migration/migrate-classes.mjs";
import { registerPochodzeniaMigration } from "./migration/migrate-pochodzenia.mjs";
import { registerSightRangeMigration } from "./migration/normalize-sight-range.mjs";
import { registerFovMigration } from "./migration/normalize-fov-angle.mjs";
import { registerPistoletRaceMigration } from "./migration/migrate-pistolet-race.mjs";
import { registerMagazynkiMigration } from "./migration/migrate-magazynki.mjs";
import { registerGearGraduationMigration } from "./migration/migrate-gear-graduation.mjs";
import { registerMedykGraduationMigration } from "./migration/migrate-medyk-graduation.mjs";
import { registerZetonLuxorMigration } from "./migration/migrate-zeton-luxor.mjs";
import { registerRescaleSurowceMigration } from "./migration/rescale-surowce-units.mjs";
import { registerGadzetyMigration } from "./migration/migrate-gadzety.mjs";
import { registerToolSubstitutesMigration } from "./migration/migrate-tool-substitutes.mjs";
import { registerEffectPrioritiesMigration } from "./migration/migrate-effect-priorities.mjs";
import { registerDnd5e6Migration } from "./migration/migrate-dnd5e6.mjs";
import { registerDniSwiataMigration } from "./migration/migrate-dni-swiata.mjs";
import { registerOznaczReakcjeBN } from "./migration/oznacz-reakcje-bn.mjs";
import { registerSrdCleanup } from "./config/srd-cleanup.mjs";
import { registerDnd5eSettings, dnd5eSettingsApi } from "./config/dnd5e-settings.mjs";
import { registerClassRules } from "./actors/class-rules.mjs";
import { registerKobaltAdvancement } from "./actors/kobalt-advancement.mjs";
import { registerBieglosci, bieglosciApi } from "./actors/bieglosci.mjs";
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
import { registerArmorRules, report as armorReport } from "./actors/armor-rules.mjs";
import { registerTT, ttApi } from "./actors/tt.mjs";
import { registerZranienie } from "./combat/zranienie.mjs";
import { registerCritRiders } from "./combat/crit-riders.mjs";
import { registerPackTactics } from "./combat/pack-tactics.mjs";
import { registerBestiaryThresholds } from "./combat/bestiary-thresholds.mjs";
import { registerArmourPiercing } from "./combat/armour-piercing.mjs";
import { registerRerolls } from "./combat/rerolls.mjs";
import { registerObalajaca } from './combat/obalajaca.mjs';
import { registerWeaponSaveProperties } from './combat/weapon-save-properties.mjs';
import { registerEmiterEmp, emiterEmpApi } from "./weapons/emiter-emp.mjs";
import { registerMeleeManeuvers, maneuversApi } from './combat/melee-maneuvers.mjs';
import { registerKnockoutAndLastAction } from "./combat/knockout.mjs";
import { registerUmieranie, umieranieApi } from "./combat/umieranie.mjs";
import { registerOkolicznosci, okolicznosciApi } from "./combat/okolicznosci.mjs";
import { registerRekonwalescencja, rekonwalescencjaApi } from "./actors/rekonwalescencja.mjs";
import { registerZagrozenia, zagrozeniaApi } from "./actors/zagrozenia.mjs";
import { registerCoverSystem } from "./combat/cover.mjs";
import { registerTrafienie } from "./combat/trafienie.mjs";
import { registerObrona, obronaApi } from "./combat/obrona.mjs";
import { registerMagazines } from "./weapons/magazine.mjs";
import { registerNpcAmmo } from "./weapons/npc-ammo.mjs";
import { registerWeaponJams } from "./weapons/jams.mjs";
import { registerMeleeDegradation } from "./weapons/melee-degradation.mjs";
import { registerFireModes } from "./weapons/fire-modes.mjs";
import { registerThrownWeapons } from "./weapons/thrown.mjs";
import { registerWlasciwosciBroni, wlasciwosciApi } from "./weapons/wlasciwosci.mjs";
import { registerImprowizacja, improwizacjaApi } from "./actors/improwizacja.mjs";
import { registerValidation } from "./config/validation.mjs";
import { registerWeaponSounds } from "./weapons/sounds.mjs";
import { registerEngineControls } from "./weapons/engine.mjs";
import { registerPochodnia, pochodniaApi } from "./wkk/items/pochodnia.mjs";
import { registerLightSources } from "./items/light-sources.mjs";
import { registerVisionSources } from "./items/vision-sources.mjs";
import { registerPowerSourceUI } from "./items/power-source.mjs";
import { registerBaterie, baterieApi } from "./items/baterie.mjs";
import { registerGadzety, gadzetyApi } from "./wkk/items/gadzety.mjs";
import { registerZetonLuxor, zetonLuxorApi } from "./wkk/items/zeton-luxor.mjs";
import { registerLatarka, latarkaApi } from "./items/latarka.mjs";
import { registerFlara, flaraApi } from "./wkk/items/flara.mjs";
import { registerPistoletNaRace } from "./wkk/items/pistolet-na-race.mjs";
import { registerGogle, gogleApi, registerNoktowizjaVision } from "./items/gogle.mjs";
import { registerWorldClock, worldClockApi } from "./world-clock.mjs";
import { registerTracerVfx } from "./weapons/tracer-vfx.mjs";
import { registerMapProps, mapPropsApi } from "./scenes/map-props.mjs";
import { registerMapSync, mapSyncApi } from "./scenes/map-sync.mjs";
import { registerMapWatch, mapWatchApi } from "./scenes/map-watch.mjs";
import { registerTransitions, transitionsApi } from "./scenes/transitions.mjs";
import { registerFxMarkers, fxMarkersApi } from "./scenes/fx-markers.mjs";
import { registerDifficultTerrainHint, difficultTerrainHintApi } from "./scenes/difficult-terrain-hint.mjs";
import { poscigApi } from "./scenes/poscig.mjs";
import { registerPoscigCanvas, poscigCanvasApi } from "./scenes/poscig-canvas.mjs";
import { registerPoscigUI, poscigUiApi } from "./scenes/poscig-ui.mjs";
import { registerPoscigSnap, poscigSnapApi } from "./scenes/poscig-snap.mjs";
import { registerPoscigMotion, poscigMotionApi } from "./scenes/poscig-motion.mjs";
import { registerDroga, drogaApi } from "./scenes/droga.mjs";
import { registerPoscigSerie, poscigSerieApi } from "./scenes/poscig-serie.mjs";
import { openTracerDebugPanel, registerTracerDebugPanelControls } from "./weapons/tracer-debug-panel.mjs";
import { openSoundDebugPanel, registerSoundDebugPanelControls } from "./weapons/sound-debug-panel.mjs";
import { registerAmmoSystem } from "./weapons/ammo.mjs";
import { registerAmmoInventory } from "./actors/ammo-inventory.mjs";
import { registerMagazineInventory } from "./actors/magazine-inventory.mjs";
import { registerItemStatePips } from "./actors/item-state-pips.mjs";
import { registerGrenadeInventory } from "./actors/grenade-inventory.mjs";
import { registerMolotov } from "./actors/molotov.mjs";
import { registerPlacedCharges, chargesApi } from "./actors/placed-charges.mjs";
import { registerSurowceInventory } from "./actors/surowce-inventory.mjs";
import { registerLekiInventory } from "./actors/leki-inventory.mjs";
import { registerDoll, dollApi } from "./actors/doll.mjs";
import { registerDollPanel } from "./actors/doll-panel.mjs";
import { registerDollRows } from "./actors/doll-rows.mjs";
import { registerGroundItems, groundApi } from "./actors/ground-items.mjs";
import { registerHandyBelt } from "./actors/handy-belt.mjs";
import { registerProwiantInventory } from "./actors/prowiant-inventory.mjs";
import { registerEncumbranceBreakdown } from "./actors/encumbrance-breakdown.mjs";
import { registerEncumbranceConfig } from "./config/encumbrance-config.mjs";
import { registerUdzwigSlowdown } from "./actors/udzwig-slowdown.mjs";
import { registerUdzwigAttackDisadvantage } from "./combat/udzwig-attack-disadvantage.mjs";
import { registerGrip } from "./combat/grip.mjs";
import { registerDropOnFail } from "./combat/drop-on-fail.mjs";
import { registerSheetShell } from "./actors/sheet-shell.mjs";
import { registerVehiclePortraitToggle } from "./actors/vehicle-portrait.mjs";
import { registerPojazdy, pojazdyApi } from "./pojazdy/index.mjs";
import { registerCanvasHistory } from "./canvas-history.mjs";
import { registerPojazdyMigration } from "./migration/migrate-pojazdy.mjs";
import { registerClassResourceDice } from "./actors/class-resource-dice.mjs";
import { registerPartySheet } from "./actors/party-sheet.mjs";
import { registerPartyTravel, travelApi } from "./actors/party-travel.mjs";
import { registerPartyLootLock } from "./actors/party-loot-lock.mjs";
import { suppliesApi } from "./actors/party-supplies.mjs";
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
import { kwasApi } from "./items/kwas.mjs";
import { registerStaza, stazaApi } from "./items/staza.mjs";
import { registerDetonator, detonatorApi } from "./items/detonator.mjs";
import { registerChemia, chemiaApi } from "./items/chemia.mjs";
import { sztuczkiApi } from "./config/sztuczki-data.mjs";
import { pochodzeniaApi } from "./config/pochodzenia-data.mjs";
import { zdolnosciApi } from "./config/class-features-coverage.mjs";
import { resyncClassFeatures } from "./migration/resync-class-features.mjs";
import { registerToolAvailability } from "./actors/tool-availability.mjs";
import { registerProdukcja, produkcjaApi } from "./production/index.mjs";
import { registerPostoj, handelApi, postojApi, fuksyApi, fantyApi } from "./postoj/index.mjs";
import { registerQuenchTests, testsApi } from "./tests/index.mjs";
import { monsterClosetApi } from "./dev/monster-closet.mjs";
import { characterClosetApi } from "./dev/character-closet.mjs";
import { activityRefOf } from "./config/chat-message-data.mjs";
import { cardPillLists } from "./config/chat-card-dom.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/**
 * Init hook — fires during system initialization, before ready.
 * CONFIG.DND5E is already populated by dnd5e at this point.
 */
Hooks.once("init", () => {
  console.log(`${MODULE_ID} | Initializing Neuroshima 5e overrides`);
  registerCanvasHistory();

  // Registered at init (not ready) so it's in place before the Token scene-controls
  // toolbar's first render — getSceneControlButtons can fire as early as canvasReady.
  registerTracerDebugPanelControls();
  registerSoundDebugPanelControls();
  registerPoscigUI();

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
  registerKameraDronaVision();
  /* Pierwsze w kolejce: śledzi `preDelete*`, żeby każda późniejsza warstwa mogła zapytać
     `isDocumentLive()` zanim zapisze do dokumentu z hooka. Samo nic nie robi poza notowaniem. */
  registerDocLiveness();

  removeSpellcasting();
  // Must precede registerExhaustion: it rebuilds conditionTypes wholesale, and
  // exhaustion.mjs then tunes the entry it leaves behind.
  registerConditions();
  registerSpadanie();
  // Przed pierwszym renderem czegokolwiek, bo arkusz czyta te zmienne bez wartosci zapasowych.
  registerStateColors();
  registerExhaustion();
  registerLevelledConditions();
  registerRestOverrides();
  // Zajęcia na odpoczynku (produkcja, czyszczenie broni…) — po nadpisaniu okien odpoczynku.
  registerRestActivities();
  registerPauseScreen();
  registerActorAbilities();

  // Phase 3: Class / progression layer
  registerPW();
  registerCharacterDefaults();
  // Bestiariusz: NPC proficiency bonus comes from the rulebook, not from CR.
  // Wraps prepareDerivedData like registerPW; the two chain safely.
  registerSP();
  // Po registerPW i registerSP — owinięcia danych pochodnych towarzyszy muszą być zewnętrzne (PLAN_m3 §7.3).
  registerTowarzysze();
  registerClassState();
  registerClassResourceDice();
  registerAbilityHotbar();
  registerClassMigration();
  // Musi iść po registerClassMigration — tamto podmienia całe api.migration, nie dopisuje do niego.
  registerPochodzeniaMigration();
  registerSightRangeMigration();
  registerFovMigration();
  registerPistoletRaceMigration();
  registerMagazynkiMigration();
  registerGearGraduationMigration();
  registerMedykGraduationMigration();
  registerZetonLuxorMigration();
  registerRescaleSurowceMigration();
  registerGadzetyMigration();
  registerToolSubstitutesMigration();
  registerEffectPrioritiesMigration();
  // Dane świata po dnd5e 6.0 (E11): klucze efektów, Palcożerca, TT towarzyszy — ręcznie, sucha próba domyślnie.
  registerDnd5e6Migration();
  // Dni chorób i dawek na zegar świata (2026-10-07) — raz, sama, u aktywnego MG.
  registerDniSwiataMigration();
  // Pojazdy świata na model M4: flaga podwozia, obrys, grafika (PLAN_m4_pojazdy E1) — raz, sama, u aktywnego MG.
  registerPojazdyMigration();
  registerOznaczReakcjeBN();
  registerSrdCleanup();
  registerDnd5eSettings();
  registerClassRules();
  registerBieglosci();
  registerKobaltAdvancement();
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
  registerMolotov();
  // Po registerGrenadeInventory: podmienia akcję wiersza dla min i ładunków (podkładanie).
  registerPlacedCharges();
  registerDetonator();
  registerSurowceInventory();
  registerLekiInventory();
  // Lalka (PLAN_paper_doll): sloty rąk, kabur, pasa i noszonego; `equipped` = aktywny.
  registerDoll();
  registerDollPanel();
  registerDollRows();
  // Ziemia (PLAN_paper_doll §9): upuszczone przedmioty jako Kafelki, przekaźnik MG. Ustawienia świata → init.
  registerGroundItems();
  registerHandyBelt();
  registerProwiantInventory();
  // Must precede any actor prepareDerivedData — Udźwig thresholds read these CONFIG
  // constants. registerEncumbranceBreakdown() only reads the already-computed result.
  registerEncumbranceConfig();
  registerEncumbranceBreakdown();
  registerUdzwigSlowdown();
  registerUdzwigAttackDisadvantage();
  // Chwyt (lalka, PLAN_paper_doll §5): strzał jedną ręką, oburęczna, dwuręczna, atak drugą ręką.
  registerGrip();
  // „Poddaj się!" (Szeryf) — oblany RO: broń z rąk postaci leci na ziemię.
  registerDropOnFail();
  registerWeapons();
  registerArmor();
  registerProficiencyIcons();
  registerArmorRules();
  // Po pancerzach: owinięcie danych pochodnych TT widzi już ich karę Szybkości (Roszada, P4).
  registerTT();
  registerValidation();

  // Phase 1: Combat systems
  registerZranienie();
  // Bestiariusz automation. Crit riders announce and wait for the GM;
  // pack tactics resolves silently (pure geometry, no judgement call).
  registerCritRiders();
  registerPackTactics();
  registerBestiaryThresholds();
  registerArmourPiercing();
  registerRerolls();
  registerObalajaca();
  registerWeaponSaveProperties();
  // Emiter EMP: biegłość ze zdolności, TT celu-maszyny (D27), ×0 na istoty żywe, Naładuj (230 V) (PLAN_m3 §7.12).
  registerEmiterEmp();
  registerMeleeManeuvers();
  registerKnockoutAndLastAction();
  // Umieranie i stabilizacja wg NOE (PLAN_m1_walka E1–E2): 0 PW, rzuty przeciw śmierci, karty MG.
  registerUmieranie();
  // Towarzysze w walce (PLAN_m3 §7.5): grupa z właścicielem, kolejność, Komenda i początek tury.
  registerTowarzyszeWalka();
  // Neutralizacja Stopnia Zranienia po DO i kalendarzyk zdrowia (PLAN_m1_walka E6).
  registerRekonwalescencja();
  // Zagrożenia środowiska: Przemarznięcie, doba bez snu, Uduszenie (PLAN_m1_walka E7).
  registerZagrozenia();
  // Jeden silnik okoliczności Testu Ataku (PLAN_m1_walka E3–E4): zasięg, zwarcie, stany, auto-TK.
  registerOkolicznosci();
  registerCoverSystem();
  // Jeden rozstrzygacz trafienia: werdykt na karcie ataku i tacka celów (PLAN_tt E2).
  registerTrafienie();
  // Okno „Reakcje celu” na karcie ataku (PLAN_tt E3–E5).
  registerObrona();
  registerMagazines();
  registerNpcAmmo();
  registerWeaponJams();
  registerMeleeDegradation();
  registerFireModes();
  // Must precede any toolkit item using it (Zbrojownia/actor items are loaded as
  // part of world init) — same phase as the fire-mode activity types above.
  registerToolkitCheckActivity();
  registerKowalActions();
  registerInventoryToggleFix();
  registerThrownWeapons();
  registerWlasciwosciBroni();
  registerImprowizacja();
  registerAmmoSystem();
  registerWeaponAddons();
  registerAddonInventoryUI();
  registerDozownik();
  registerZbrojowniaSync();
  registerMedyk();
  // Staza: Używanie → stabilizacja przez lejek umierania (PLAN_m1_walka U11).
  registerStaza();
  registerToolkitChecks();
  registerChemia();
  registerToolAvailability();
  // Produkcja — Roboty, przepisy, karty czatu (PLAN_produkcja). game.neuroshima.produkcja
  registerProdukcja();
  // M5 — handel, postój, szabrowanie, bebeszenie (PLAN_m5_postoj). game.neuroshima.handel / .postoj
  registerPostoj();

  // Nasłuch map wypchniętych z Tiled. W init, bo rejestruje ustawienia świata.
  registerMapWatch();
  // Przejścia między poziomami (trudne przejście, „Opuść bezpiecznie”). W init: typ zachowania regionu.
  registerTransitions();
  registerFxMarkers();

  // Trudny teren zapalany razem z miarką ruchu (ustawienie klienta).
  registerDifficultTerrainHint();

  // Phase 2: Damage application UI
  registerDamageReductionUI();

  // Last: its render hook relocates panels the injectors above have already built,
  // so it must be the final renderActorSheet listener registered.
  // Plakietka towarzysza w nagłówku (PLAN_m3 §7.6); pasek na karcie właściciela buduje sheet-shell.
  registerTowarzyszeKarta();
  // Narzędzie MG, kreator ludzkiego towarzysza, poziomy za właścicielem, ochrona klasy (PLAN_m3 §7.8).
  registerTowarzyszeTworzenie();
  // Drony: uchwyt bez klonów, produkcja, Rozłóż/Złóż przez przekaźnik MG (PLAN_m3 §7.9).
  registerDrony();
  // Komenda [B] / Steruj [A] / Reaguj [R] z Kontrolera, zatrzask i plakietki (PLAN_m3 §7.5).
  registerDronySterowanie();
  // Broń drona: atak, obrażenia i ST z twórcy i operatora (U13).
  registerDronyBron();
  // Maszyny: Wyłączony i [Zastosuj] Tabeli awarii; dron: zasilanie na zegarze, upadek latającego (PLAN_m3 §7.4, U15).
  registerMaszyny();
  registerDronyStan();
  // Tryb zdalny drona: sygnał, sesja operatora, wyjścia, bramka wizji, Esc (PLAN_m3 §7.10).
  registerDronyZdalne();
  // Obraz z kamery drona: tryb wizji i analogowy kanał FPV u operatora (PLAN_m3 §7.10, D34).
  registerDronyObraz();
  // OSD kamery drona z czcionką Betaflight (fonts/osd/, GPL-3 — D39).
  registerDronyOsd();
  // Naprawa drona: PW z uchwytu i w Postoju, awarie NOE (karta MG) i WKK (części wg tabeli) (PLAN_m3 §7.11).
  registerDronyNaprawa();
  registerSheetShell();

  // Vehicle sheet is still stock dnd5e (no Neuroshima subclass) — it's just missing the
  // portrait/token toggle every other actor sheet type has. Patches the live DOM, not a sheet.
  registerVehiclePortraitToggle();
  // M4 Pojazdy (PLAN_m4_pojazdy): obrys, jadący, kropki, prześwietlenie. game.neuroshima.pojazdy
  registerPojazdy();

  // Karta drużyny: stan członków, podróż, zapasy.
  registerPartyTravel();
  registerPartySheet();
  registerPartyLootLock();

  // Clean up activity chat card pills: remove NaN range, duration, empty strings for weapon cards
  Hooks.on("renderChatMessageHTML", (message, html) => {
    const activityType = activityRefOf(message)?.type;
    if (!activityType) return;

    // Only clean weapon-based activities
    const itemType = message.system?.item?.type;
    if (itemType !== "weapon") return;

    const el = html instanceof HTMLElement ? html : html?.[0];
    if (!el) return;

    // Defer via macrotask — same reason as ammo.mjs: dnd5e renders pills async
    setTimeout(() => {
      for (const pill of cardPillLists(el).flatMap(list => [...list.querySelectorAll("li.pill")])) {
        const text = pill.querySelector(".label")?.textContent?.trim() ?? "";
        if (
          !text ||
          text === "Instantaneous" ||
          text === "Natychmiastowe" ||
          /NaN/.test(text) ||
          text === "—"
        ) {
          pill.remove();
        }
      }

      // Hide a pill row left empty (dnd5e 6.0: the row is a `section.icon-row` around the list).
      for (const list of cardPillLists(el)) {
        if (!list.querySelector("li.pill")) (list.closest("section.icon-row") ?? list).remove();
      }
    });
  });

  // Nasłuch na `quenchReady` — bez modułu Quench hak nigdy nie odpali.
  registerQuenchTests();

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
  game.neuroshima.dnd5eSettings = dnd5eSettingsApi;
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

  // Trudność Trafienia wg NOE (PLAN_tt) — game.neuroshima.tt.compute(actor), .source(actor, "obled")
  game.neuroshima.tt = ttApi;
  // Reakcje celu — game.neuroshima.obrona.setTargets(message), .execute(message, tokenUuid, id)
  game.neuroshima.obrona = obronaApi;

  // Choroby / Fobie / lekarstwa — game.neuroshima.health.sunset() etc.
  game.neuroshima.health = { ...healthApi, syncEffects: syncDiseaseEffects, bleeding: bleedingApi };
  game.neuroshima.podpalenie = podpalenieApi;
  // Umieranie (PLAN_m1_walka) — game.neuroshima.umieranie.stan(actor), .stabilizuj(actor), .bnDoUmierania(actor)
  game.neuroshima.umieranie = umieranieApi;
  // Towarzysze i drony (PLAN_m3) — game.neuroshima.towarzysze.wlasciciel(actor), .wartosci(actor), .maStopnieZranienia(actor)
  game.neuroshima.towarzysze = { ...towarzyszeApi, ...towarzyszeWalkaApi, ...towarzyszeTworzenieApi, migruj: migrujTowarzysza };
  game.neuroshima.drony = { ...dronyApi, ...dronySterowanieApi, ...dronyStanApi, ...dronyZdalneApi, ...dronyObrazApi, ...dronyOsdApi, ...dronyNaprawaApi, premiaAtakuDrona };
  game.neuroshima.maszyny = maszynyApi;
  // Biegłości z awansów (PLAN_m6 §5.1) — game.neuroshima.bieglosci.audyt(actor): czego brakuje względem kompendium.
  game.neuroshima.bieglosci = bieglosciApi;
  // Właściwości broni długa / ciężka / jednorazowa (PLAN_m6 §5.3) — game.neuroshima.wlasciwosci.stanBroni(item)
  game.neuroshima.wlasciwosci = wlasciwosciApi;
  // Broń improwizowana (PLAN_m6 §5.2) — game.neuroshima.improwizacja.atakImprowizowany(actor, item)
  game.neuroshima.improwizacja = improwizacjaApi;
  game.neuroshima.emiterEmp = emiterEmpApi;
  // Okoliczności ataku — game.neuroshima.okolicznosci.rozstrzygnij(activity) (podgląd z bieżącymi celami)
  game.neuroshima.okolicznosci = okolicznosciApi;
  // Rekonwalescencja (PLAN_m1_walka E6) — .stan(actor), .kalendarzyk(actor), .dane(actor) (prognoza bez okna)
  game.neuroshima.rekonwalescencja = rekonwalescencjaApi;
  // Zagrożenia (PLAN_m1_walka E7) — .okno() (narzędzie MG), .wstrzymajOddech(actor), .stanOddechu(actor)
  game.neuroshima.zagrozenia = zagrozeniaApi;
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

  // Zdolności klasowe i profesji — ten sam rejestr dla 133 zdolności (PLAN_beta B5);
  // .resync() dosyła zmiany paczki do kopii na kartach (najpierw na sucho).
  game.neuroshima.zdolnosci = { ...zdolnosciApi, resync: resyncClassFeatures };

  // Manewry wręcz — game.neuroshima.manewry.pochwycenie(), .odepchniecie(), .wytracenie()
  game.neuroshima.manewry = maneuversApi;

  // Lalka — game.neuroshima.lalka.place(actor, item, "hand.0"), .locationOf(item), .migrate()
  game.neuroshima.lalka = dollApi;
  // Ziemia — game.neuroshima.ziemia.sweep() (MG: sprząta przedmioty ze sceny), .nearby(actor)
  game.neuroshima.ziemia = groundApi;

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
  game.neuroshima.kwas = kwasApi;
  game.neuroshima.staza = stazaApi;
  game.neuroshima.detonator = detonatorApi;
  game.neuroshima.charges = chargesApi;
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
  game.neuroshima.maps = { ...mapSyncApi, ...mapWatchApi, ...transitionsApi, ...fxMarkersApi };
  game.neuroshima.trudnyTeren = difficultTerrainHintApi;

  // Plansza pościgu — game.neuroshima.poscig.start({ scigani: ["GMT400"], ... })
  // Warstwa graficzna (przewijana pustynia + tory) budzi się sama na scenie z flagą pościgu.
  // Przycisk MG w narzędziach sceny rejestruje się w `init` (wyżej) — tutaj tylko API.
  registerPoscigCanvas();
  registerPoscigSnap();
  registerPoscigMotion();
  registerDroga();
  registerPoscigSerie();
  game.neuroshima.poscig = {
    ...poscigApi, ...poscigUiApi, ...poscigSnapApi, ...poscigMotionApi,
    tlo: poscigCanvasApi, ruch: poscigMotionApi, droga: drogaApi, serie: poscigSerieApi
  };

  // Karta drużyny — game.neuroshima.podroz.openBiomePicker(actor), .zapasy.hunt(grupa)
  game.neuroshima.podroz = travelApi;
  game.neuroshima.zapasy = suppliesApi;
  game.neuroshima.produkcja = produkcjaApi;
  game.neuroshima.handel = handelApi;
  game.neuroshima.postoj = postojApi;
  game.neuroshima.fuksy = fuksyApi;
  game.neuroshima.fanty = fantyApi;
  game.neuroshima.zajecia = restActivitiesApi;
  game.neuroshima.pojazdy = pojazdyApi;

  /* Pasek plakietek stanu na wierszach ekwipunku. **Musi być zarejestrowany jako ostatni
     z warstw dekorujących wiersze** — czyta klasy `neuro-*`, które dopinają `jams.mjs`,
     `melee-degradation.mjs`, `power-source.mjs` i `addons-inventory.mjs`. Foundry woła hooki
     w kolejności rejestracji, więc wcześniejsze miejsce w tej liście znaczy „zobaczy wiersz
     bez ich klas" i cichą utratę połowy plakietek. Patrz nagłówek `item-state-pips.mjs`. */
  registerItemStatePips();

  // Testy Quench — game.neuroshima.tests.run() / .run("choroby") / .list()
  game.neuroshima.tests = testsApi;

  // Szafa z potworami — scena kalibracyjna skali żetonów Bestiariusza.
  // Tylko konsola i agent (MG + agent to jedyni odbiorcy), bez przycisku w UI:
  // to narzędzie deweloperskie, a nie element sesji.
  // game.neuroshima.monsterCloset.regenerate() / .harvest() / .report()
  game.neuroshima.monsterCloset = monsterClosetApi;

  // Szafa z postaciami — ta sama kalibracja dla aktorów świata (drużyna, BN,
  // pojazdy). Wynik idzie wprost na `prototypeToken`, bez pliku i przebudowy.
  // game.neuroshima.characterCloset.regenerate() / .harvest() / .apply() / .report()
  game.neuroshima.characterCloset = characterClosetApi;

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

  // Rules version (modern: Wyczerpanie −2/level) is enforced by config/dnd5e-settings.mjs.
});


