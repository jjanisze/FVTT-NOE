/**
 * Neuroshima 5e — Weapon addons core logic.
 *
 * Implements installAddon / removeAddon, SM slot guard,
 * Kolba składana toggle, and the preRollAttackV2 hook for conditional bonuses.
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
  Hooks.on("dnd5e.preRollAttackV2", _onPreRollAttackV2);
  Hooks.on("renderChatMessageHTML", _onRenderAddonsChatMessage);

  const mod = game.modules.get(MODULE_ID);
  if (mod) {
    mod.api ??= {};
    mod.api.addons = {
      installAddon,
      removeAddon,
      removeAddonEffects,
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

  // Apply changes to the weapon
  await _applyDelta(liveWeapon, def, delta);

  // Record the addon in flags
  const existing = getAddons(liveWeapon);
  await liveWeapon.setFlag(MODULE_ID, ADDONS_FLAG, [...existing, { id: addonId, delta }]);

  // Consume the loot item
  const qty = addonLootItem.system?.quantity ?? 1;
  if (qty <= 1) {
    await addonLootItem.delete();
  } else {
    await addonLootItem.update({ "system.quantity": qty - 1 });
  }

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
 * Remove an installed addon from a weapon and return its loot item to inventory.
 *
 * @param {Item5e} weapon
 * @param {string} addonId
 * @returns {Promise<boolean>}
 */
export async function removeAddon(weapon, addonId) {
  const liveWeapon = _getLiveItem(weapon);
  if (!liveWeapon) return false;

  const installed = getAddon(liveWeapon, addonId);
  if (!installed) {
    ui.notifications.warn(`Ulepszenie ${addonId} nie jest zainstalowane na tej broni.`);
    return false;
  }

  const def = ADDON_DEFS[addonId];
  if (!def) return false;

  // Reverse the delta
  await _reverseDelta(liveWeapon, def, installed.delta);

  // Remove from flags
  const remaining = getAddons(liveWeapon).filter(a => a.id !== addonId);
  if (remaining.length > 0) {
    await liveWeapon.setFlag(MODULE_ID, ADDONS_FLAG, remaining);
  } else {
    await liveWeapon.unsetFlag(MODULE_ID, ADDONS_FLAG);
  }

  // Dozownik: clear dose resource
  if (addonId === "dozownik") await clearDose(liveWeapon);

  // Return loot item to actor inventory
  const actor = liveWeapon.actor;
  if (actor) {
    await actor.createEmbeddedDocuments("Item", [_buildLootItemData(def)]);
  }

  // Chat message
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: liveWeapon.actor }),
    content: _buildRemoveMessage(def, liveWeapon),
  });

  liveWeapon.sheet?.render?.(true);
  return true;
}

/**
 * Remove addon effects from a weapon WITHOUT returning the loot item.
 * Used by melee-degradation.mjs when Naostrzenie blunts on weapon damage.
 *
 * @param {Item5e} weapon
 * @param {string} addonId
 */
export async function removeAddonEffects(weapon, addonId) {
  const liveWeapon = _getLiveItem(weapon);
  if (!liveWeapon) return false;

  const installed = getAddon(liveWeapon, addonId);
  if (!installed) return false;

  const def = ADDON_DEFS[addonId];
  if (!def) return false;

  await _reverseDelta(liveWeapon, def, installed.delta);

  // Remove addon record entirely (no refund, no blunted marker)
  const remaining = getAddons(liveWeapon).filter(a => a.id !== addonId);
  if (remaining.length > 0) {
    await liveWeapon.setFlag(MODULE_ID, ADDONS_FLAG, remaining);
  } else {
    await liveWeapon.unsetFlag(MODULE_ID, ADDONS_FLAG);
  }

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
    if (delta.attackBonus !== 0) {
      const cur = _parseBonus(weapon.system?.attack?.bonus);
      updates["system.attack.bonus"] = String(cur + delta.attackBonus);
    }
    if (delta.damageBonus !== 0) {
      const cur = _parseBonus(weapon.system?.damage?.base?.bonus);
      updates["system.damage.base.bonus"] = String(cur + delta.damageBonus);
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
    if (delta.attackBonus !== 0) {
      const cur = _parseBonus(weapon.system?.attack?.bonus);
      updates["system.attack.bonus"] = String(cur - delta.attackBonus);
    }
    if (delta.damageBonus !== 0) {
      const cur = _parseBonus(weapon.system?.damage?.base?.bonus);
      updates["system.damage.base.bonus"] = String(cur - delta.damageBonus);
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
      await weapon.deleteEmbeddedDocuments("Activity", [delta.activityId]);
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

  if (def.id === "bagnet") {
    activityData = {
      type: "attack",
      name: "Bagnet",
      img: `modules/${MODULE_ID}/icons/activities/bagnet.svg`,
      system: {
        damage: { base: { number: 1, denomination: 6, bonus: "", types: ["piercing"] } },
        range: { value: 2, units: "m" },
        attack: { ability: "str", type: { value: "melee", classification: "weapon" } },
      },
    };
  } else if (def.id === "granatnik") {
    activityData = {
      type: "attack",
      name: "Granatnik 40mm",
      img: `modules/${MODULE_ID}/icons/activities/granatnik.svg`,
      system: {
        damage: { base: { number: 3, denomination: 6, bonus: "", types: ["bludgeoning"] } },
        range: { value: 100, long: 100, units: "m" },
        attack: { ability: "dex", type: { value: "ranged", classification: "weapon" } },
      },
    };
  } else if (def.id === "srutowka-podlufowa") {
    activityData = {
      type: "attack",
      name: "Śrutówka .12 Ga",
      img: `modules/${MODULE_ID}/icons/activities/srutowka.svg`,
      system: {
        damage: { base: { number: 2, denomination: 6, bonus: "", types: ["bludgeoning"] } },
        range: { value: 6, long: 18, units: "m" },
        attack: { ability: "dex", type: { value: "ranged", classification: "weapon" } },
      },
    };
  }

  if (!activityData) return null;

  const created = await weapon.createEmbeddedDocuments("Activity", [activityData]);
  return created?.[0]?.id ?? null;
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
 * preRollAttackV2 — conditional bonuses
 * ============================================================ */

function _onPreRollAttackV2(config, _dialog, _message) {
  const item = config.subject?.item ?? config.subject;
  if (!item || item.type !== "weapon") return;

  const addons = getAddons(item);
  if (!addons.length) return;

  let totalBonus = 0;

  for (const installed of addons) {
    if (installed.blunted) continue;
    const def = ADDON_DEFS[installed.id];
    if (!def?.conditionalBonus) continue;

    const bonus = _resolveConditionalBonus(item, def, addons);
    totalBonus += bonus;
  }

  if (totalBonus !== 0) {
    // Append to existing parts bonus string
    const existing = config.data?.bonus ?? config.parts?.bonus ?? "";
    const newBonus = existing
      ? `${existing} + ${totalBonus}`
      : String(totalBonus);

    if (config.data) {
      config.data.bonus = newBonus;
    } else if (config.parts) {
      config.parts.bonus = newBonus;
    }
  }
}

function _resolveConditionalBonus(item, def, allInstalled) {
  const cb = def.conditionalBonus;
  if (!cb) return 0;

  if (cb.type === "range-zone") {
    // Determine if the attack is at normal or long range
    const isLong = _isLongRange(item);
    if (isLong === null) {
      // No target selected — assume normal range; apply normalBonus
      return cb.normalBonus ?? 0;
    }
    return isLong ? (cb.longBonus ?? 0) : (cb.normalBonus ?? 0);
  }

  if (cb.type === "no-sight") {
    // +1 if no other sight addon is installed
    const hasSight = allInstalled.some(a => a.id !== def.id && SIGHT_ADDON_IDS.has(a.id));
    return hasSight ? 0 : (cb.normalBonus ?? 0);
  }

  if (cb.type === "setup") {
    // +bonus only if the weapon is set up (folded / deployed)
    const setup = item.getFlag(MODULE_ID, SETUP_FLAG) ?? {};
    return setup[cb.setupKey] ? (cb.setupBonus ?? 0) : 0;
  }

  return 0;
}

/**
 * Returns true if the first selected target is beyond weapon's normal range.
 * Returns null if no targets are selected.
 */
function _isLongRange(item) {
  const normalRange = item.system?.range?.value ?? 0;
  if (!normalRange) return null;

  const targets = [...game.user.targets];
  if (!targets.length) return null;

  const token = item.actor?.getActiveTokens()?.[0];
  if (!token) return null;

  const target = targets[0];
  const dist = canvas.grid.measurePath([token.center, target.center])?.distance ?? 0;
  return dist > normalRange;
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
    if (a.blunted) li.classList.add("neuro-addon-pill--blunted");
    li.title = a.blunted ? `${def.label} (stępione)` : def.label;
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

function _buildRemoveMessage(def, weapon) {
  return `
    <div class="dnd5e2 chat-card">
      <div style="border-left:3px solid #7a4a4a;padding:4px 8px">
        Odinstalowano <strong>${def.label}</strong> z <strong>${weapon.name}</strong> → wrócił do ekwipunku.
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
    if (cb.type === "setup") parts.push(`+${cb.setupBonus} TA (po rozłożeniu)`);
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
      price: { value: def.price, denomination: "gp" },
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

/** Parse a bonus string like "1", "2", "" → number */
function _parseBonus(str) {
  if (!str) return 0;
  const n = parseInt(str, 10);
  return isNaN(n) ? 0 : n;
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
