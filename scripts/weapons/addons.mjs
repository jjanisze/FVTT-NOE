/**
 * Neuroshima 5e — Weapon addons core logic.
 *
 * Implements installAddon / removeAddon, SM slot guard,
 * Kolba składana toggle, and the dnd5e.postBuildAttackRollConfig hook that
 * injects both static (Naostrzenie) and conditional (sights, laser) attack bonuses.
 *
 * Does NOT handle UI — that lives in actors/addons-inventory.mjs.
 */

import {
  ADDON_DEFS, SIGHT_ADDON_IDS,
  hasAddon, getAddon, getAddons, countSMSlots,
} from "../config/addons-data.mjs";
import { initDose, clearDose } from "./dozownik.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const ADDONS_FLAG = "addons";
const SETUP_FLAG  = "setup";

/* ============================================================
 * Registration
 * ============================================================ */

export function registerWeaponAddons() {
  // Conditional attack bonuses are injected AFTER dnd5e assembles the roll parts.
  // (dnd5e.preRollAttackV2 is too early — AttackActivity._buildAttackConfig clobbers
  //  config.parts/config.data afterwards, so anything set there is lost.)
  Hooks.on("dnd5e.postBuildAttackRollConfig", _onPostBuildAttackRollConfig);

  // Inject toggle fields (laser on/off, bipod deployed) into the attack roll dialog.
  Hooks.on("renderAttackRollConfigurationDialog", _onRenderAttackDialog);

  // Clear captured per-roll toggle state once the attack roll is complete.
  Hooks.on("dnd5e.postRollAttack", (rolls, { subject } = {}) => {
    if (subject?.uuid) _rollToggleState.delete(subject.uuid);
  });

  Hooks.on("renderChatMessageHTML", _onRenderAddonsChatMessage);

  const mod = game.modules.get(MODULE_ID);
  if (mod) {
    mod.api ??= {};
    mod.api.addons = {
      installAddon,
      installAddonById,
      removeAddon,
      hasAddon,
      getAddon,
      getAddons,
      countSMSlots,
      isAddonCompatible,
      getCompatibleAddonsForWeapon,
      toggleSetup,
      getSetup,
    };
  }

  console.log("Neuroshima 5e | Weapon addons core registered");
}

/* ============================================================
 * Validation helpers
 * ============================================================ */

/**
 * Check whether an addon can be installed on a weapon.
 * Returns null if ok, or a human-readable error string.
 * @param {Item5e} weapon
 * @param {AddonDef} def
 * @returns {string|null}
 */
export function isAddonCompatible(weapon, def) {
  if (weapon?.type !== "weapon") return "To nie jest broń.";

  // Quantity guard — addons are per-instance flags; stacked weapons can't be modified
  if ((weapon.system?.quantity ?? 1) > 1) {
    return `Broń ma ilość > 1. Rozdziel stos przed instalacją ulepszenia.`;
  }

  const weaponType = weapon.system?.type?.value;
  const props = weapon.system?.properties ?? new Set();

  // Weapon type restriction
  if (def.requiresWeaponTypes.length > 0 && !def.requiresWeaponTypes.includes(weaponType)) {
    return `Ulepszenie ${def.label} nie pasuje do typu broni (${weaponType}).`;
  }

  // Required properties on the weapon
  for (const p of def.requiresProperties) {
    if (!props.has(p)) {
      const propLabel = CONFIG.DND5E?.itemProperties?.[p]?.label ?? p;
      return `Broń musi mieć właściwość „${propLabel}".`;
    }
  }

  // Required damage types (e.g. bludgeoning for Dociążenie)
  const dmgTypesRaw = weapon.system?.damage?.base?.types ?? [];
  const dmgTypes = dmgTypesRaw instanceof Set ? [...dmgTypesRaw] : Array.from(dmgTypesRaw);
  for (const t of (def.requiresDamageTypes ?? [])) {
    if (!dmgTypes.includes(t)) {
      const typeLabel = CONFIG.DND5E?.damageTypes?.[t]?.label ?? t;
      return `Broń musi zadawać obrażenia „${typeLabel}".`;
    }
  }

  // Required addons already installed
  for (const reqId of def.requiresAddons) {
    if (!hasAddon(weapon, reqId)) {
      const reqDef = ADDON_DEFS[reqId];
      return `Wymagane ulepszenie: ${reqDef?.label ?? reqId}.`;
    }
  }

  // Mutual exclusion
  const installedIds = getAddons(weapon).map(a => a.id);
  for (const excId of def.exclusiveWith) {
    if (installedIds.includes(excId)) {
      const excDef = ADDON_DEFS[excId];
      return `Wyklucza się z: ${excDef?.label ?? excId}.`;
    }
  }
  // Also check if the same addon is already installed
  if (hasAddon(weapon, def.id)) {
    return `Ulepszenie ${def.label} jest już zainstalowane.`;
  }

  // SM slot check
  if (def.usesSMSlot) {
    if (!props.has("sm")) {
      return `Wymaga Szyny montażowej (SM).`;
    }
    if (countSMSlots(weapon) >= 3) {
      return `Szyna montażowa jest pełna (3/3 slotów zajęte).`;
    }
  }

  return null;
}

/**
 * Returns all addons that can currently be installed on the weapon.
 * @param {Item5e} weapon
 * @returns {AddonDef[]}
 */
export function getCompatibleAddonsForWeapon(weapon) {
  return Object.values(ADDON_DEFS).filter(def => isAddonCompatible(weapon, def) === null);
}

/* ============================================================
 * Install
 * ============================================================ */

/**
 * Install an addon from a loot item onto a weapon.
 *
 * @param {Item5e} weapon        — the embedded weapon item (must have actor)
 * @param {Item5e} addonLootItem — the loot item with flags.neuroshima.ulepszenie
 * @returns {Promise<boolean>}
 */
export async function installAddon(weapon, addonLootItem) {
  const addonId = addonLootItem.getFlag(MODULE_ID, "ulepszenie");
  if (!addonId) {
    ui.notifications.warn("Ten przedmiot nie jest ulepszeniem broni.");
    return false;
  }

  const ok = await installAddonById(weapon, addonId);
  if (!ok) return false;

  // Consume the loot item (only once installation actually succeeded)
  const qty = addonLootItem.system?.quantity ?? 1;
  if (qty <= 1) {
    await addonLootItem.delete();
  } else {
    await addonLootItem.update({ "system.quantity": qty - 1 });
  }

  return true;
}

/**
 * Install an addon directly by id, with no loot item to consume — for flows where the
 * upgrade is earned rather than bought (e.g. the kowal toolkit's "Naostrzenie broni"
 * action honing an edge with a successful check, see `items/toolkit-kowal.mjs`).
 * Shares every validation/rollback/chat-message/hook step with `installAddon`; only the
 * loot-item consumption is skipped.
 *
 * @param {Item5e} weapon
 * @param {string} addonId
 * @returns {Promise<boolean>}
 */
export async function installAddonById(weapon, addonId) {
  const def = ADDON_DEFS[addonId];
  if (!def) {
    ui.notifications.warn(`Nieznane ulepszenie: ${addonId}`);
    return false;
  }

  const liveWeapon = _getLiveItem(weapon);
  if (!liveWeapon) return false;

  const err = isAddonCompatible(liveWeapon, def);
  if (err) {
    ui.notifications.warn(err);
    return false;
  }

  // Compute what we will change (the delta)
  const delta = _computeDelta(liveWeapon, def);

  // Apply changes to the weapon. If anything throws, roll back so we never
  // leave the weapon in a half-modified state.
  try {
    await _applyDelta(liveWeapon, def, delta);
  } catch (err) {
    console.error(`Neuroshima 5e | installAddonById(${addonId}) failed during _applyDelta`, err);
    try { await _reverseDelta(_getLiveItem(liveWeapon), def, delta); } catch (_) { /* best effort */ }
    ui.notifications.error(`Nie udało się zainstalować: ${def.label}. Zmiany cofnięto.`);
    return false;
  }

  // Record the addon in flags
  const existing = getAddons(liveWeapon);
  await liveWeapon.setFlag(MODULE_ID, ADDONS_FLAG, [...existing, { id: addonId, delta }]);

  // Chat message
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: liveWeapon.actor }),
    content: _buildInstallMessage(def, liveWeapon),
  });

  // If konwersja: open caliber change dialog
  if (def.openCaliberChangeOnInstall) {
    _openCaliberChangeDialog(liveWeapon);
  }

  // Dozownik: initialize dose resource
  if (addonId === "dozownik") await initDose(liveWeapon);

  liveWeapon.sheet?.render?.(true);
  return true;
}

/* ============================================================
 * Remove
 * ============================================================ */

/**
 * Find addons currently installed that DEPEND on `addonId` and would be
 * orphaned if it were removed. Two dependency sources:
 *  1. explicit `requiresAddons` (e.g. bagnet → uchwyt-bagnetu)
 *  2. SM-slot addons depend on whatever grants the `sm` property (szyna)
 *
 * @param {Item5e} weapon
 * @param {string} addonId
 * @returns {string[]} dependent addon ids (installed)
 */
function _getDependentAddons(weapon, addonId) {
  const def = ADDON_DEFS[addonId];
  if (!def) return [];
  const installedIds = getAddons(weapon).map(a => a.id);
  const grantsSm = (def.grantProperties ?? []).includes("sm");

  return installedIds.filter(id => {
    if (id === addonId) return false;
    const d = ADDON_DEFS[id];
    if (!d) return false;
    if ((d.requiresAddons ?? []).includes(addonId)) return true;
    if (grantsSm && d.usesSMSlot) return true;
    return false;
  });
}

/**
 * Remove an installed addon from a weapon and return its loot item to inventory.
 * If other installed addons depend on this one (SM-mounted addons depend on the
 * rail; bagnet depends on its mount), they are cascade-removed first so the
 * weapon never ends up in an inconsistent (orphaned) state.
 *
 * @param {Item5e} weapon
 * @param {string} addonId
 * @param {object} [opts]
 * @param {boolean} [opts.cascade=true]  Auto-remove dependents (returns them to inventory too).
 * @param {boolean} [opts.refund=true]   Return the loot item to inventory. Set false when the
 *                                        addon is destroyed/consumed (e.g. Naostrzenie lost on
 *                                        weapon damage — RAW: "do czasu uszkodzenia broni").
 *                                        Forced to `false` regardless if the addon's own def
 *                                        sets `refundable: false` — a permanent attachment
 *                                        never comes back out as a loot item, no matter who
 *                                        asks or how it was installed.
 * @returns {Promise<boolean>}
 */
export async function removeAddon(weapon, addonId, opts = {}) {
  const { cascade = true, refund: refundRequested = true } = opts;
  const liveWeapon = _getLiveItem(weapon);
  if (!liveWeapon) return false;

  const installed = getAddon(liveWeapon, addonId);
  if (!installed) {
    ui.notifications.warn(`Ulepszenie ${addonId} nie jest zainstalowane na tej broni.`);
    return false;
  }

  const def = ADDON_DEFS[addonId];
  if (!def) return false;

  const refund = refundRequested && (def.refundable !== false);

  // Cascade: remove anything that depends on this addon first.
  const dependents = _getDependentAddons(liveWeapon, addonId);
  if (dependents.length && !cascade) {
    const names = dependents.map(id => ADDON_DEFS[id]?.label ?? id).join(", ");
    ui.notifications.warn(`Najpierw odinstaluj zależne ulepszenia: ${names}.`);
    return false;
  }
  for (const depId of dependents) {
    await removeAddon(liveWeapon, depId, { cascade: true });
  }

  // Reverse the delta (re-read live weapon — cascade above mutated it)
  const fresh = _getLiveItem(liveWeapon);
  const freshInstalled = getAddon(fresh, addonId) ?? installed;
  await _reverseDelta(fresh, def, freshInstalled.delta);

  // Remove from flags
  const remaining = getAddons(fresh).filter(a => a.id !== addonId);
  if (remaining.length > 0) {
    await fresh.setFlag(MODULE_ID, ADDONS_FLAG, remaining);
  } else {
    await fresh.unsetFlag(MODULE_ID, ADDONS_FLAG);
  }

  // Dozownik: clear dose resource
  if (addonId === "dozownik") await clearDose(fresh);

  // Return loot item to actor inventory (unless the addon was destroyed/consumed)
  const actor = fresh.actor;
  if (actor && refund) {
    await actor.createEmbeddedDocuments("Item", [_buildLootItemData(def)]);
  }

  // Chat message
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: fresh.actor }),
    content: _buildRemoveMessage(def, fresh, dependents, { refund }),
  });

  fresh.sheet?.render?.(true);
  return true;
}

/* ============================================================
 * Delta computation and application
 * ============================================================ */

function _computeDelta(weapon, def) {
  const delta = {
    properties: { added: [], removed: [] },
    attackBonus: 0,
    damageBonus: 0,
    rangeNormal: 0,
    rangeLong: 0,
    rangeX2Original: null, // for range-x2
    activityId: null,
  };

  const modes = def.applyMode;
  const props = new Set(weapon.system?.properties ?? []);

  if (modes.includes("direct")) {
    delta.attackBonus = def.attackBonus ?? 0;
    delta.damageBonus = def.damageBonus ?? 0;
    delta.rangeNormal  = def.rangeNormalBonus ?? 0;
    delta.rangeLong    = def.rangeLongBonus ?? 0;
  }

  if (modes.includes("property")) {
    for (const p of (def.grantProperties ?? [])) {
      if (!props.has(p)) delta.properties.added.push(p);
    }
    for (const p of (def.removeProperties ?? [])) {
      if (props.has(p)) delta.properties.removed.push(p);
    }
  }

  if (modes.includes("range-x2")) {
    const currentNormal = weapon.system?.range?.value ?? 0;
    const currentLong   = weapon.system?.range?.long  ?? 0;
    delta.rangeX2Original = { normal: currentNormal, long: currentLong };
    delta.rangeNormal = currentNormal; // will be doubled
    delta.rangeLong   = currentLong;   // will be doubled
  }

  return delta;
}

async function _applyDelta(weapon, def, delta) {
  const modes = def.applyMode;
  const updates = {};

  if (modes.includes("direct")) {
    // NOTE: attackBonus is intentionally NOT written here. dnd5e 5.3 has no
    // system.attack.bonus field; the +TA is injected at roll time by
    // _onPostBuildAttackRollConfig (reads def.attackBonus for installed addons).
    if (delta.damageBonus !== 0) {
      updates["system.damage.base.bonus"] = _composeBonus(weapon.system?.damage?.base?.bonus, delta.damageBonus);
    }
    if (delta.rangeNormal !== 0) {
      updates["system.range.value"] = (weapon.system?.range?.value ?? 0) + delta.rangeNormal;
    }
    if (delta.rangeLong !== 0) {
      updates["system.range.long"] = (weapon.system?.range?.long ?? 0) + delta.rangeLong;
    }
  }

  if (modes.includes("property")) {
    const props = new Set(weapon.system?.properties ?? []);
    for (const p of delta.properties.added)   props.add(p);
    for (const p of delta.properties.removed)  props.delete(p);
    updates["system.properties"] = [...props];
  }

  if (modes.includes("range-x2") && delta.rangeX2Original) {
    updates["system.range.value"] = (delta.rangeX2Original.normal ?? 0) * 2;
    updates["system.range.long"]  = (delta.rangeX2Original.long  ?? 0) * 2;
  }

  if (Object.keys(updates).length > 0) {
    await weapon.update(updates);
  }

  // Activity addons handled separately (after weapon is updated)
  if (modes.includes("activity")) {
    const activityId = await _createAddonActivity(weapon, def);
    delta.activityId = activityId ?? null;
  }
}

async function _reverseDelta(weapon, def, delta) {
  const modes = def.applyMode;
  const updates = {};

  if (modes.includes("direct")) {
    // attackBonus not written (see _applyDelta note); nothing to reverse for TA.
    if (delta.damageBonus !== 0) {
      updates["system.damage.base.bonus"] = _decomposeBonus(weapon.system?.damage?.base?.bonus, delta.damageBonus);
    }
    if (delta.rangeNormal !== 0) {
      updates["system.range.value"] = (weapon.system?.range?.value ?? 0) - delta.rangeNormal;
    }
    if (delta.rangeLong !== 0) {
      updates["system.range.long"] = (weapon.system?.range?.long ?? 0) - delta.rangeLong;
    }
  }

  if (modes.includes("property")) {
    const props = new Set(weapon.system?.properties ?? []);
    for (const p of (delta.properties?.added ?? []))    props.delete(p);
    for (const p of (delta.properties?.removed ?? []))  props.add(p);
    updates["system.properties"] = [...props];
  }

  if (modes.includes("range-x2") && delta.rangeX2Original) {
    updates["system.range.value"] = delta.rangeX2Original.normal;
    updates["system.range.long"]  = delta.rangeX2Original.long;
  }

  if (Object.keys(updates).length > 0) {
    await weapon.update(updates);
  }

  // Delete activity if one was created
  if (modes.includes("activity") && delta.activityId) {
    try {
      // dnd5e 5.3: remove from the activities collection (not deleteEmbeddedDocuments).
      if (weapon.system.activities?.has?.(delta.activityId)) {
        await weapon.update({ [`system.activities.-=${delta.activityId}`]: null });
      }
    } catch (_) {
      // Activity may already be gone
    }
  }
}

/* ============================================================
 * Activity creation for Bagnet / Granatnik / Śrutówka
 * ============================================================ */

async function _createAddonActivity(weapon, def) {
  let activityData;

  // Marker so fire-modes.mjs skips renaming/managing these, and includeBase:false
  // so the addon's own damage doesn't inherit the host weapon's base damage.
  const addonFlags = { [MODULE_ID]: { managedActivity: true, addonActivity: def.id } };

  if (def.id === "bagnet") {
    activityData = {
      type: "attack",
      name: "Bagnet",
      // Fixed (2026-09-06): pointed at icons/activities/ (only holds generic action-type icons —
      // this file never existed there), not icons/addons/ where the real bagnet.svg already is.
      img: `modules/${MODULE_ID}/icons/addons/bagnet.svg`,
      damage: { includeBase: false, parts: [{ number: 1, denomination: 6, types: ["piercing"] }] },
      range: { override: true, value: 2, units: "m" },
      attack: { ability: "str", type: { value: "melee", classification: "weapon" } },
      flags: addonFlags,
    };
  } else if (def.id === "granatnik") {
    activityData = {
      type: "attack",
      name: "Granatnik 40mm",
      // Fixed (2026-09-06): same icons/activities/ vs icons/addons/ mixup as Bagnet above.
      img: `modules/${MODULE_ID}/icons/addons/granatnik.svg`,
      damage: { includeBase: false, parts: [{ number: 3, denomination: 6, types: ["bludgeoning"] }] },
      range: { override: true, value: 100, units: "m" },
      attack: { ability: "dex", type: { value: "ranged", classification: "weapon" } },
      flags: addonFlags,
    };
  } else if (def.id === "srutowka-podlufowa") {
    activityData = {
      type: "attack",
      name: "Śrutówka .12 Ga",
      // Fixed (2026-09-06): wrong directory (icons/activities/, same mixup as the two above) AND
      // wrong basename — the real file is srutowka-podlufowa.svg, matching def.id, not srutowka.svg.
      img: `modules/${MODULE_ID}/icons/addons/srutowka-podlufowa.svg`,
      damage: { includeBase: false, parts: [{ number: 2, denomination: 6, types: ["bludgeoning"] }] },
      range: { override: true, value: 6, units: "m" },
      attack: { ability: "dex", type: { value: "ranged", classification: "weapon" } },
      flags: addonFlags,
    };
  }

  if (!activityData) return null;

  // dnd5e 5.3: activities are NOT embedded documents — must use Item5e#createActivity.
  // (createEmbeddedDocuments("Activity", …) throws.)
  const { type, ...data } = activityData;
  const before = new Set(weapon.system.activities?.map(a => a.id) ?? []);
  await weapon.createActivity(type, data, { renderSheet: false });
  const liveWeapon = _getLiveItem(weapon);
  const created = (liveWeapon.system.activities ?? []).find(a => !before.has(a.id));
  return created?.id ?? null;
}

/* ============================================================
 * Kolba składana toggle
 * ============================================================ */

/**
 * Toggle the "kolba składana" folded/unfolded state on a weapon.
 * Folded: removes `dluga` property, halves range.long.
 * Unfolded: restores both.
 *
 * @param {Item5e} weapon
 * @returns {Promise<boolean>}
 */
export async function toggleSetup(weapon, key) {
  const liveWeapon = _getLiveItem(weapon);
  if (!liveWeapon) return false;

  const setup = getSetup(liveWeapon);
  const current = setup[key] ?? false;
  const newState = !current;

  await liveWeapon.setFlag(MODULE_ID, SETUP_FLAG, { ...setup, [key]: newState });

  if (key === "kolbaSkladana") {
    await _applyKolbaState(liveWeapon, newState);
  }

  liveWeapon.sheet?.render?.(true);
  return newState;
}

export function getSetup(weapon) {
  return weapon?.getFlag(MODULE_ID, SETUP_FLAG) ?? {};
}

async function _applyKolbaState(weapon, folded) {
  const installed = getAddon(weapon, "kolba-skladana");
  if (!installed) return;

  const props = new Set(weapon.system?.properties ?? []);
  const updates = {};

  if (folded) {
    // Fold: remove `dluga`, save original range.long, halve it
    const originalLong = weapon.system?.range?.long ?? 0;
    props.delete("dluga");
    updates["system.properties"] = [...props];
    updates["system.range.long"] = Math.floor(originalLong / 2);
    // Save original for restoration
    await weapon.setFlag(MODULE_ID, "kolbaOriginalRangeLong", originalLong);
  } else {
    // Unfold: restore `dluga` and original range.long
    props.add("dluga");
    updates["system.properties"] = [...props];
    const originalLong = weapon.getFlag(MODULE_ID, "kolbaOriginalRangeLong");
    if (originalLong != null) {
      updates["system.range.long"] = originalLong;
      await weapon.unsetFlag(MODULE_ID, "kolbaOriginalRangeLong");
    }
  }

  await weapon.update(updates);
}

/* ============================================================
 * Conditional attack bonuses (roll-time)
 * ============================================================ */

/**
 * Per-roll toggle state captured from the attack dialog checkboxes,
 * keyed by activity uuid. Consumed once by _onPostBuildAttackRollConfig.
 * @type {Map<string, Record<string, boolean>>}
 */
const _rollToggleState = new Map();

/**
 * Fires AFTER dnd5e has assembled the attack roll parts (survives the
 * _buildAttackConfig clobber). Appends conditional addon bonuses to config.parts.
 *
 * @param {object} process  Full attack process configuration.
 * @param {object} config   The individual D20 roll configuration (has .parts/.data).
 * @param {number} index    Roll index.
 * @param {object} [opts]   { app, formData }
 */
function _onPostBuildAttackRollConfig(process, config, index, opts = {}) {
  const activity = process?.subject;
  const item = activity?.item;
  if (!item || item.type !== "weapon") return;

  const addons = getAddons(item);
  if (!addons.length) return;

  // Resolve toggle state: prefer live form data, then captured dialog state, then persisted flags.
  const toggles = _resolveToggleState(activity, item, opts?.formData);

  let totalBonus = 0;
  const labels = [];

  for (const installed of addons) {
    const def = ADDON_DEFS[installed.id];
    if (!def) continue;

    // Static attack bonus from "direct" addons (e.g. Naostrzenie +1 TA).
    // dnd5e 5.3 has no system.attack.bonus field, so static TA bonuses must be
    // injected here at roll time instead of written onto the weapon.
    if (def.applyMode?.includes("direct") && (def.attackBonus ?? 0) !== 0) {
      totalBonus += def.attackBonus;
      labels.push(def.label);
    }

    // Conditional bonuses (range-zone, no-sight, toggle).
    if (def.conditionalBonus) {
      const bonus = _resolveConditionalBonus(item, def, addons, toggles);
      if (bonus !== 0) {
        totalBonus += bonus;
        labels.push(def.label);
      }
    }
  }

  if (totalBonus !== 0) {
    config.parts ??= [];
    config.parts.push(String(totalBonus));
    // Stash applied labels so the chat card can show exactly what was added.
    foundry.utils.setProperty(config, "options.neuroAddonBonus", { total: totalBonus, labels });
  }
}

/**
 * Resolve the active toggle map for a roll (laser on/off, bipod deployed).
 * @returns {Record<string, boolean>}
 */
function _resolveToggleState(activity, item, formData) {
  const persisted = item.getFlag(MODULE_ID, SETUP_FLAG) ?? {};
  const captured = _rollToggleState.get(activity?.uuid) ?? {};
  const live = {};

  if (formData?.get) {
    for (const key of TOGGLE_KEYS) {
      const raw = formData.get(`neuroToggle.${key}`);
      if (raw !== null && raw !== undefined) live[key] = raw === "true" || raw === "on" || raw === true;
    }
  }

  return { ...persisted, ...captured, ...live };
}

/**
 * Compute the bonus a single conditional addon contributes to this attack.
 * @param {Item5e} item
 * @param {AddonDef} def
 * @param {Array} allInstalled
 * @param {Record<string, boolean>} toggles
 * @returns {number}
 */
function _resolveConditionalBonus(item, def, allInstalled, toggles = {}) {
  const cb = def.conditionalBonus;
  if (!cb) return 0;

  if (cb.type === "range-zone") {
    // Range-dependent sight. Only applies when we can measure the shot;
    // without a target we cannot know the zone, so it does not apply.
    const isLong = _isLongRange(item);
    if (isLong === null) return 0;
    return isLong ? (cb.longBonus ?? 0) : (cb.normalBonus ?? 0);
  }

  if (cb.type === "no-sight") {
    // +1 only if no other sighting device is installed.
    const hasSight = allInstalled.some(a => a.id !== def.id && SIGHT_ADDON_IDS.has(a.id));
    return hasSight ? 0 : (cb.normalBonus ?? 0);
  }

  if (cb.type === "toggle") {
    // Driven by a per-roll dialog checkbox (laser on, bipod deployed, …).
    return toggles[cb.setupKey] ? (cb.setupBonus ?? 0) : 0;
  }

  return 0;
}

/**
 * Returns true if the first selected target is beyond the weapon's normal range.
 * Returns null if range cannot be measured (no normal range, no token, no target).
 */
function _isLongRange(item) {
  const normalRange = item.system?.range?.value ?? 0;
  if (!normalRange) return null;

  const targets = [...(game.user?.targets ?? [])];
  if (!targets.length) return null;

  const token = item.actor?.getActiveTokens?.()?.[0];
  if (!token) return null;

  const target = targets[0];
  try {
    const dist = canvas.grid.measurePath([token.center, target.center])?.distance ?? 0;
    return dist > normalRange;
  } catch (_) {
    return null;
  }
}

/* ============================================================
 * Attack dialog — addon toggle checkboxes
 * ============================================================ */

/** Toggle keys that may appear as dialog checkboxes (conditional-toggle addons). */
const TOGGLE_KEYS = ["laserActive", "dwojnog"];

/**
 * Inject toggle checkboxes (laser on/off, bipod deployed) into the attack roll dialog
 * for any installed conditional-toggle addon. Captures their state per roll.
 */
function _onRenderAttackDialog(app, html) {
  const activity = app?.config?.subject ?? app?.options?.subject;
  const item = activity?.item;
  if (!item || item.type !== "weapon") return;

  const addons = getAddons(item);
  if (!addons.length) return;

  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;
  if (root.querySelector(".neuro-addon-toggles")) return; // avoid double inject

  const persisted = item.getFlag(MODULE_ID, SETUP_FLAG) ?? {};
  const toggleDefs = [];
  for (const installed of addons) {
    const def = ADDON_DEFS[installed.id];
    const cb = def?.conditionalBonus;
    if (cb?.type !== "toggle") continue;
    toggleDefs.push({
      key: cb.setupKey,
      label: def.label,
      bonus: cb.setupBonus ?? 0,
      checked: persisted[cb.setupKey] ?? false,
      reveals: !!def.revealsPositionWhenActive,
    });
  }
  if (!toggleDefs.length) return;

  // Seed captured state with defaults so a roll without interaction still respects persistence.
  const seed = {};
  for (const t of toggleDefs) seed[t.key] = t.checked;
  _rollToggleState.set(activity.uuid, seed);

  const container = document.createElement("div");
  container.className = "neuro-addon-toggles form-group";
  container.innerHTML = `
    <label style="font-weight:bold">Ulepszenia</label>
    <div class="form-fields" style="flex-direction:column;align-items:flex-start;gap:4px">
      ${toggleDefs.map(t => `
        <label class="checkbox" style="display:flex;align-items:center;gap:6px">
          <input type="checkbox" name="neuroToggle.${t.key}" ${t.checked ? "checked" : ""}>
          ${t.label} <span style="opacity:0.7">(+${t.bonus} TA${t.reveals ? ", ujawnia pozycję" : ""})</span>
        </label>
      `).join("")}
    </div>
  `;

  // Wire up state capture
  container.querySelectorAll("input[type=checkbox]").forEach(input => {
    input.addEventListener("change", () => {
      const key = input.name.replace("neuroToggle.", "");
      const state = _rollToggleState.get(activity.uuid) ?? {};
      state[key] = input.checked;
      _rollToggleState.set(activity.uuid, state);
    });
  });

  // Insert before the dialog buttons (footer), else append to the form.
  const form = root.querySelector("form") ?? root;
  const buttons = form.querySelector(".dialog-buttons") ?? form.querySelector("footer");
  if (buttons) form.insertBefore(container, buttons);
  else form.appendChild(container);
}

/* ============================================================
 * Chat card — addon badge injection
 * ============================================================ */

function _onRenderAddonsChatMessage(message, html) {
  // Only activity cards (attack, damage, etc.)
  if (!message.flags?.dnd5e?.activity) return;

  // item.uuid is set on roll cards; usage cards only have activity.uuid — extract item from it
  const itemUuid = message.flags?.dnd5e?.item?.uuid
    ?? message.flags?.dnd5e?.activity?.uuid?.split(".Activity.")[0];
  if (!itemUuid) return;

  const item = fromUuidSync(itemUuid);
  if (!item || item.type !== "weapon") return;

  const addons = getAddons(item);
  if (!addons.length) return;

  if (!game.user.isGM && !item.isOwner) return;

  // Defer to run after dnd5e finishes its own DOM mutations
  setTimeout(() => _injectAddonBadges(html, addons), 0);
}

function _injectAddonBadges(html, addons) {
  const el = html instanceof HTMLElement ? html : html?.[0];
  if (!el) return;

  // Don't inject twice
  if (el.querySelector(".neuro-addon-pill")) return;

  // Try to find the existing native dnd5e footer pill list and append there
  const pillsList = el.querySelector("ul.card-footer.pills");

  for (const a of addons) {
    const def = ADDON_DEFS[a.id];
    if (!def) continue;

    const li = document.createElement("li");
    li.className = "pill transparent neuro-addon-pill";
    li.title = def.label;
    li.innerHTML = `<i class="fa-solid fa-wrench"></i> <span class="label">${def.label}</span>`;

    if (pillsList) {
      pillsList.appendChild(li);
    } else {
      // No footer list exists yet — create one
      let footer = el.querySelector("ul.card-footer");
      if (!footer) {
        footer = document.createElement("ul");
        footer.className = "card-footer pills unlist";
        el.appendChild(footer);
      }
      footer.appendChild(li);
    }
  }
}

/* ============================================================
 * Chat message builders
 * ============================================================ */

function _buildInstallMessage(def, weapon) {
  const effectLines = _describeEffects(def);
  return `
    <div class="dnd5e2 chat-card">
      <div style="border-left:3px solid #4a7a4a;padding:4px 8px">
        Zainstalowano <strong>${def.label}</strong> na <strong>${weapon.name}</strong>.
        ${effectLines ? `<div style="margin-top:4px;font-size:12px">${effectLines}</div>` : ""}
      </div>
    </div>
  `;
}

function _buildRemoveMessage(def, weapon, dependents = [], opts = {}) {
  const { refund = true } = opts;
  const cascadeNote = dependents.length
    ? `<div style="margin-top:4px;font-size:12px;opacity:0.85">Odinstalowano też zależne: ${
        dependents.map(id => ADDON_DEFS[id]?.label ?? id).join(", ")
      }.</div>`
    : "";
  const outcome = refund
    ? `→ wrócił do ekwipunku.`
    : `→ <span style="color:#c0392b">zniszczone</span>.`;
  return `
    <div class="dnd5e2 chat-card">
      <div style="border-left:3px solid #7a4a4a;padding:4px 8px">
        Odinstalowano <strong>${def.label}</strong> z <strong>${weapon.name}</strong> ${outcome}
        ${cascadeNote}
      </div>
    </div>
  `;
}

function _describeEffects(def) {
  const parts = [];
  if (def.attackBonus > 0) parts.push(`+${def.attackBonus} do Testów Ataku`);
  if (def.damageBonus > 0) parts.push(`+${def.damageBonus} do obrażeń`);
  if (def.rangeNormalBonus > 0) parts.push(`+${def.rangeNormalBonus}m zasięg normalny`);
  if (def.rangeLongBonus > 0)   parts.push(`+${def.rangeLongBonus}m zasięg daleki`);
  if (def.grantProperties?.length) {
    const names = def.grantProperties.map(p => CONFIG.DND5E?.itemProperties?.[p]?.label ?? p);
    parts.push(`właściwość: ${names.join(", ")}`);
  }
  if (def.applyMode.includes("conditional") && def.conditionalBonus) {
    const cb = def.conditionalBonus;
    if (cb.type === "range-zone") {
      if (cb.normalBonus) parts.push(`+${cb.normalBonus} TA (normalny zasięg)`);
      if (cb.longBonus)   parts.push(`+${cb.longBonus} TA (daleki zasięg)`);
    }
    if (cb.type === "toggle")   parts.push(`+${cb.setupBonus} TA (po włączeniu)`);
    if (cb.type === "no-sight") parts.push(`+${cb.normalBonus} TA (brak innych przyrządów)`);
  }
  return parts.join("; ");
}

/* ============================================================
 * Loot item template for returning on uninstall
 * ============================================================ */

function _buildLootItemData(def) {
  // Some addon IDs differ from their icon file names
  const ICON_NAME_MAP = { "dociazone": "dociazenie" };
  const iconFile = ICON_NAME_MAP[def.id] ?? def.id;
  const iconPath = `modules/${MODULE_ID}/icons/addons/${iconFile}.svg`;
  return {
    name: def.label,
    type: "loot",
    img: iconPath,
    system: {
      quantity: 1,
      price: { value: def.price, denomination: "gb" },
      weight: { value: def.weight, units: "kg" },
    },
    flags: {
      [MODULE_ID]: { ulepszenie: def.id },
    },
  };
}

/* ============================================================
 * Utilities
 * ============================================================ */

/**
 * Add a flat delta to a weapon's `damage.base.bonus`, preserving a formula-valued
 * bonus (e.g. "@abilities.str.mod", hand-entered by a player — see the live audit
 * note on this field in `weapons-data.mjs`) instead of collapsing it. `_parseBonus`
 * alone does `parseInt("@abilities.str.mod") → NaN → 0`, which silently replaced a
 * character's ability-mod bonus with a bare "1" the moment Naostrzenie/Osełka was
 * installed — caught live on Piekarz's Nadziak.
 */
function _composeBonus(existing, delta) {
  const trimmed = (existing ?? "").toString().trim();
  if (!delta) return trimmed;
  if (!trimmed) return String(delta);

  const n = Number(trimmed);
  if (Number.isFinite(n)) return String(n + delta); // both plain numbers — keep numeric

  return delta > 0 ? `${trimmed} + ${delta}` : `${trimmed} - ${Math.abs(delta)}`;
}

/**
 * Inverse of `_composeBonus` — strips the exact trailing "+ N"/"- N" term a prior
 * `_composeBonus(existing, delta)` call would have appended; falls back to appending
 * the negated delta if the trailing term doesn't match (e.g. hand-edited since).
 */
function _decomposeBonus(existing, delta) {
  const trimmed = (existing ?? "").toString().trim();
  if (!delta) return trimmed;

  const n = Number(trimmed);
  if (Number.isFinite(n)) return String(n - delta);

  const suffix = delta > 0 ? ` + ${delta}` : ` - ${Math.abs(delta)}`;
  if (trimmed.endsWith(suffix)) return trimmed.slice(0, -suffix.length);
  return _composeBonus(trimmed, -delta);
}

/** Resolve live item from possibly-cloned item. */
function _getLiveItem(item) {
  if (!item) return null;
  if (item.actor) return item.actor.items.get(item.id) ?? item;
  return item;
}

/** Open caliber change dialog (delegates to ammo.mjs API). */
function _openCaliberChangeDialog(weapon) {
  const ammoApi = game.modules.get(MODULE_ID)?.api?.ammo;
  if (ammoApi?.openCaliberChangeDialog) {
    ammoApi.openCaliberChangeDialog(weapon);
  }
}
