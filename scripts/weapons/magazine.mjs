/**
 * Neuroshima 5e — Magazine tracking & reload system.
 *
 * Magazine state stored in module flags on the WEAPON item:
 *   flags["neuroshima-2026-overrides"].mag = { current: N, max: N, ammoType: "string" }
 *
 * Ammo items in inventory are consumable items with:
 *   system.type.value = "ammo"
 *   system.type.subtype = <ammoType string matching weapon.mag.ammoType>
 *   system.quantity = rounds available
 *
 * Reload behaviour:
 *   - Out of combat: free (no action cost, just confirms)
 *   - In combat: costs an Action (via CombatTracker check)
 *   - Finds best matching ammo from actor inventory
 *   - Fills magazine to max, deducts rounds from ammo item
 *   - Posts a chat message describing the reload
 *
 * Usage:
 *   registerMagazines()  — call during init (registers hooks)
 *   getMag(item)         — returns { current, max, ammoType } or null
 *   setMag(item, data)   — updates magazine flags
 *   spendRound(item)     — deducts 1 round, returns false if empty
 */

import { ABILITY_KEYS, buildAbilityRuleChangeNotice, hasAbility } from "../actors/abilities.mjs";
import { isJamImmune } from "./jams.mjs";
import {
  playWeaponSound,
  WeaponSound,
  playShotSound,
  playUtilitySound,
} from "./sounds.mjs";
import { seqScrollText } from "./sequencer.mjs";
import { tracerFire } from "./tracer-vfx.mjs";
import { AMMO_CALIBERS, AMMO_CALIBER_MAP, buildCaliberSelect } from "../config/ammo-data.mjs";
const MODULE_ID = "neuroshima-2026-overrides";
const MAGAZINE_TYPES = Object.freeze({
  INTERNAL: "wmag",
  CYLINDER: "beb",
  REMOVABLE: "wymienny"
});
const RELOAD_STATE_FLAG = "reloadState";
const CHAMBER_STATE_FLAG = "chamber";
const RELOAD_ACTIVITY_TYPE = "neuroReload";
const LOAD_ONE_ACTIVITY_TYPE = "neuroLoadOne";
const MAG_SWAP_ACTIVITY_TYPE = "neuroMagSwap";
const CUSTOM_ACTIVITY_TYPES = new Set(["neuroKs", "neuroDs", "neuroMs", "neuroOz", "neuroDublet", RELOAD_ACTIVITY_TYPE, LOAD_ONE_ACTIVITY_TYPE, MAG_SWAP_ACTIVITY_TYPE]);
const processedSingleShotActivities = new WeakSet();
const syncingMagazineUses = new Set();
const syncingManagedActivities = new Set();
const MANAGED_ACTIVITY_FLAGS = Object.freeze({
  MANAGED: "managedActivity",
  KIND: "magazineAction"
});

/* -------------------------------------------- */
/*  Public API                                    */
/* -------------------------------------------- */

/**
 * Get magazine state for a weapon item.
 * @param {Item5e} item
 * @returns {{ current: number, max: number, ammoType: string }|null}
 */
export function getMag(item) {
  const mag = item.getFlag(MODULE_ID, "mag");
  if (!mag || mag.max == null) return null;
  return foundry.utils.deepClone(mag);
}

export function getChamber(item) {
  return foundry.utils.deepClone(_getChamberState(item));
}

/**
 * Set magazine state on a weapon item.
 * @param {Item5e} item
 * @param {{ current?: number, max?: number, ammoType?: string }} data
 */
export async function setMag(item, data) {
  const current = getMag(item) ?? { current: 0, max: 0, ammoType: "" };
  const next = { ...current, ...data };
  await _applyMagazineState(item, next);
}

export async function setChamber(item, data) {
  await _setChamberState(item, data);
}

export function getMagazineType(item) {
  if (_hasProperty(item, MAGAZINE_TYPES.INTERNAL)) return MAGAZINE_TYPES.INTERNAL;
  if (_hasProperty(item, MAGAZINE_TYPES.CYLINDER)) return MAGAZINE_TYPES.CYLINDER;
  return MAGAZINE_TYPES.REMOVABLE;
}

/**
 * Deduct one round from the magazine.
 * @param {Item5e} item
 * @returns {boolean} false if magazine was already empty
 */
export async function spendRound(item) {
  const mag = getMag(item);
  if (!mag) return true; // no magazine tracked — allow firing
  if (mag.current <= 0) {
    ui.notifications.warn(`${item.name}: magazynek pusty!`);
    playUtilitySound("click", item, WeaponSound.EMPTY_CLICK, {
      caliberId: mag.ammoType, token: item.actor,
    });
    seqScrollText("PUSTE!", item.actor, { color: "#e67e22", fontSize: 30, duration: 1800 });
    return false;
  }
  await setMag(item, { current: mag.current - 1 });
  return true;
}

/**
 * Spend multiple rounds (for burst fire modes).
 * @param {Item5e} item
 * @param {number} count
 * @returns {boolean} false if not enough rounds
 */
export async function spendRounds(item, count) {
  const mag = getMag(item);
  if (!mag) return true;
  if (mag.current < count) {
    ui.notifications.warn(`${item.name}: za mało naboi! (${mag.current}/${count})`);
    return false;
  }
  await setMag(item, { current: mag.current - count });
  return true;
}

/* -------------------------------------------- */
/*  Registration                                  */
/* -------------------------------------------- */

export function registerMagazines() {
  registerReloadActivityType();
  registerLoadOneActivityType();
  registerMagSwapActivityType();
  registerAttackReloadGuard();

  // Inject magazine row into weapon item sheet.
  Hooks.on("renderItemSheet5e", onRenderItemSheet);

  Hooks.on("updateItem", onUpdateItemSyncMagazineUses);
  Hooks.on("createItem", item => {
    void syncWeaponMagazineActivities(item);
  });
  Hooks.on("updateItem", item => {
    void syncWeaponMagazineActivities(item);
  });
  Hooks.on("dnd5e.preUseActivity", onPreUseActivity);
  Hooks.on("dnd5e.postUseActivity", onPostUseActivity);
  
  // Quantum Magazines Restore Hook
  Hooks.on("deleteCombat", _restoreQuantumMagazines);
  Hooks.on("deleteCombatant", (combatant) => _restoreQuantumMagazinesForActor(combatant?.actor));

  Hooks.once("ready", () => {
    const mod = game.modules.get(MODULE_ID);
    if (mod) {
      mod.api ??= {};
      mod.api.magazines = {
        getMag,
        getChamber,
        setMag,
        setChamber,
        spendRound,
        spendRounds,
        getMagazineType
      };
    }

    void syncAllMagazineUses();
    void syncAllWeaponMagazineActivities();
  });

  console.log("Neuroshima 5e | Magazine system registered");
}

/* -------------------------------------------- */
/*  Item sheet injection                          */
/* -------------------------------------------- */

/**
 * Inject magazine row into the Details tab of a weapon item sheet.
 */
function onRenderItemSheet(app, html) {
  const item = app.document ?? app.item;
  if (!item || item.type !== "weapon") return;
  const isPlayMode = app._mode === app.constructor?.MODES?.PLAY;

  // Only show for firearms (palna* types), miotana weapons, or items that already have mag flag
  const weapType = item.system.type?.value ?? "";
  const isPalna = weapType.startsWith("palna");
  const isMiotana = weapType === "miotana";
  const hasMag = getMag(item) !== null;
  if (!isPalna && !isMiotana && !hasMag) return;

  // Read ammoType directly from raw flag so it's available even on weapons
  // that have a caliber set but no magazine capacity configured yet (max is null).
  const rawAmmoType = item.getFlag(MODULE_ID, "mag")?.ammoType ?? "";
  const mag = getMag(item) ?? { current: 0, max: 0, ammoType: rawAmmoType };
  const magazineType = getMagazineType(item);
  const ui = _getMagazineUi(magazineType, item);
  const reloadState = _getReloadState(item);
  const chamberState = _getChamberState(item, mag);

  // Find the physical details section (price/weight row) to insert after
  const detailsSection = html.querySelector(".item-properties, .details-tab, [data-tab='details'] .form-group:last-of-type");
  if (!detailsSection) return;

  const notes = [
    _shouldShowChamberStatus(item) ? `<span style="color:#6b7280">${_getChamberStateHint(item, chamberState, mag)}</span>` : "",
    reloadState.required ? `<span style="color:#ba3c24">${_getReloadStateHint(item, reloadState)}</span>` : "",
    _getCaliberNote(mag.ammoType) ? `<i style="color:#6b7280">${_getCaliberNote(mag.ammoType)}</i>` : ""
  ].filter(n => n?.trim()).join(" ");

  const magRow = document.createElement("div");
  magRow.classList.add("form-group", "neuro-mag-row");
  magRow.innerHTML = `
    <label>${ui.label}</label>
    <div class="form-fields" style="display:flex; flex-direction:column; gap:4px;">
      <div style="display:flex; align-items:center; gap:4px;">
        <input type="number" name="flags.${MODULE_ID}.mag.current"
               value="${mag.current}" min="0" max="${mag.max}"
               data-dtype="Number" style="width:40px; text-align:center;">
        <span>/</span>
        <input type="number" name="flags.${MODULE_ID}.mag.max"
               value="${mag.max}" min="0"
               data-dtype="Number" style="width:40px; text-align:center;" ${isPlayMode ? "disabled" : ""}>
      </div>
      <div style="display:flex; align-items:center; gap:4px;">
        <span style="font-size:11px; color:#888; white-space:nowrap;">Kaliber:</span>
        <div style="flex:1;">${buildCaliberSelect(rawAmmoType, isPlayMode, `flags.${MODULE_ID}.mag.ammoType`)}</div>
      </div>
      ${notes ? `<div style="font-size:11px; line-height:1.2; opacity:0.9;">${notes}</div>` : ""}
    </div>
  `;

  detailsSection.after(magRow);

  // Bulk restock button — distinct from the Activity-driven reload (neuroReload/
  // neuroLoadOne/neuroMagSwap, _onClickReload above): that one respects action
  // economy and is legal in combat; this one ignores capacity-per-action limits
  // entirely and tops the mag off in one go, which only makes sense as unhurried
  // downtime prep — hence the hard combat block instead of spending a resource.
  if (item.actor && mag.max) {
    const stockItem = _findAmmo(item.actor, mag.ammoType);
    const available = stockItem?.system?.quantity ?? 0;
    const inCombat = !!item.actor.inCombat;

    const bulkRow = document.createElement("div");
    bulkRow.classList.add("form-group", "neuro-bulk-reload-row");
    bulkRow.innerHTML = `
      <label></label>
      <div class="form-fields">
        <button type="button" class="neuro-bulk-reload-btn" style="width:auto; white-space:nowrap;"
                ${inCombat ? "disabled" : ""}
                ${inCombat ? `data-tooltip="Uzupełnianie z zapasu jest niedostępne podczas walki."` : ""}>
          <i class="fas fa-boxes-stacked"></i> Uzupełnij z zapasu (${available} szt.)
        </button>
      </div>
    `;
    bulkRow.querySelector(".neuro-bulk-reload-btn").addEventListener("click", async e => {
      e.preventDefault();
      await _onClickBulkReload(_getLiveItem(item));
    });
    magRow.after(bulkRow);
  }
}

/**
 * Bulk-restock a weapon's magazine from the actor's own ammo stock — as much as
 * the mag can hold and the inventory can supply, in one go, with no per-action
 * cap. Represents unhurried downtime prep (topping off before heading out), not a
 * combat action — hence the hard block below rather than spending a resource like
 * `_onClickReload` does. Loads the SAME caliber already chambered (`mag.ammoType`);
 * unlike `_onClickReload` this never prompts a Śrut/Breneka choice — "as many
 * bullets of this type" per the feature's own spec.
 */
async function _onClickBulkReload(item) {
  const actor = item.actor;
  if (!actor) {
    ui.notifications.warn("Broń nie jest przypisana do aktora.");
    return;
  }

  if (actor.inCombat) {
    ui.notifications.warn(`${item.name}: uzupełnianie magazynka z zapasu jest niedostępne podczas walki.`);
    return;
  }

  const mag = getMag(item);
  if (!mag) {
    ui.notifications.warn(`${item.name}: brak danych magazynka (ustaw Maks najpierw).`);
    return;
  }

  const needed = mag.max - mag.current;
  if (needed <= 0) {
    ui.notifications.info(`${item.name}: magazynek jest już pełny.`);
    return;
  }

  const ammoItem = _findAmmo(actor, mag.ammoType);
  if (!ammoItem) {
    ui.notifications.warn(`Brak amunicji (${mag.ammoType || "dowolnej"}) w ekwipunku.`);
    return;
  }

  const available = ammoItem.system.quantity ?? 0;
  const toLoad = Math.min(needed, available);
  if (toLoad <= 0) {
    ui.notifications.warn(`${ammoItem.name}: wyczerpana amunicja.`);
    return;
  }

  const newQty = available - toLoad;
  if (newQty <= 0) {
    await ammoItem.delete();
  } else {
    await ammoItem.update({ "system.quantity": newQty });
  }

  const newCurrent = mag.current + toLoad;
  await setMag(item, { current: newCurrent });
  await _clearReloadState(item);

  await _playBulkReloadClicks(item, actor, mag.ammoType, toLoad);
  seqScrollText("UZUPEŁNIONO", actor, { color: "#f1c40f", fontSize: 26, duration: 1500 });

  const justFull = (newCurrent === mag.max) ? " do pełna" : "";
  const justAll = (newQty === 0) ? " wszystkie swoje" : "";

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div style="border-left:3px solid #888;padding-left:8px;font-size:1.1em;">
      <strong>${actor.name}</strong> uzupełnia magazynek${justFull}, ładując po kolei${justAll} ${toLoad} x ${ammoItem.name} do <em>${item.name}</em>.<br>
      <span style="font-size:0.85em;color:#888;">[Stan: ${newCurrent}/${mag.max}]</span>
    </div>`
  });
}

/**
 * Rounds loaded "one by one" — plays the same single-insert click used by
 * `_onClickReload`'s per-round path, repeated with a short stagger. Capped well
 * below the actual count for large top-offs (e.g. 30 rounds into an Uzi's stick
 * mag) so it reads as "loading a bunch of rounds" rather than becoming a
 * multi-second sound-effect ordeal.
 */
async function _playBulkReloadClicks(item, actor, caliberId, count) {
  const clicks = Math.max(1, Math.min(count, 8));
  for (let i = 0; i < clicks; i++) {
    playUtilitySound("reload", item, WeaponSound.RELOAD_SINGLE, { caliberId, token: actor });
    if (i < clicks - 1) await new Promise(r => setTimeout(r, 180));
  }
}

async function onUpdateItemSyncMagazineUses(item, changes) {
  if (!item || item.type !== "weapon" || syncingMagazineUses.has(item.uuid)) return;
  const magChanged = foundry.utils.hasProperty(changes, `flags.${MODULE_ID}.mag`);
  const usesChanged = foundry.utils.hasProperty(changes, "system.uses.max") || foundry.utils.hasProperty(changes, "system.uses.spent");
  if (!magChanged && !usesChanged) return;

  const mag = item.getFlag(MODULE_ID, "mag");
  if (!mag || mag.max == null) return;
  if (magChanged) {
    await _syncUsesFromMagazine(item, mag);
    return;
  }

  await _syncMagazineFlagFromUses(item, mag);
}

/* -------------------------------------------- */
/*  Reload logic                                  */
/* -------------------------------------------- */

/**
 * Reload weapon from actor's ammo inventory.
 * Asks for confirmation, deducts rounds from ammo stack, fills mag.
 * @param {Item5e} item  The weapon item being reloaded
 */
async function _onClickReload(item) {
  const actor = item.actor;
  if (!actor) {
    ui.notifications.warn("Broń nie jest przypisana do aktora.");
    return;
  }

  const mag = getMag(item);
  if (!mag) {
    ui.notifications.warn(`${item.name}: brak danych magazynka (ustaw Maks najpierw).`);
    return;
  }

  const reloadState = _getReloadState(item);
  if (_canCycleReloadWithoutAmmo(item, mag, reloadState)) {
    await _performReloadAction(item, { chat: true, spendResource: true, source: "button" });
    return;
  }

  const magazineType = getMagazineType(item);
  const inCombat = !!actor.inCombat;

  const reloadPlan = _getReloadPlan(item, mag, { magazineType });
  const needed = mag.max - mag.current;
  if (needed <= 0) {
    ui.notifications.info(`${item.name}: ${reloadPlan.containerAccusative} jest ${reloadPlan.fullAdjective}.`);
    return;
  }

  // --- 1. Quantum Magazine Check for Removable Magazines in Combat ---
  if (inCombat && magazineType === MAGAZINE_TYPES.REMOVABLE) {
    const weapType = item.system.type?.value; 
    
    // Używamy ustandaryzowanego typu
    const qMag = actor.items.find(i => 
      i.type === "consumable" && 
      i.system.type?.value === "magazine" && 
      i.system.type?.subtype === weapType &&
      (i.system.uses?.value > 0)
    );

    if (!qMag) {
      ui.notifications.warn(`Zabrakło ci przygotowanych magazynków zapasowych w ekwipunku dla tej broni! Przeładowanie luzem niemożliwe w walce.`);
      return; 
    }
    // Odbierz jedno użycie magazynkowi kwantowemu
    await qMag.update({ "system.uses.value": Math.max(0, qMag.system.uses.value - 1) });
  }

  // --- 2. Dual-Ammo Shotgun Logic (.12 Ga) ---
  let ammoIdToLoad = mag.ammoType;
  let ammoItem = null;
  const is12Ga = mag.ammoType?.startsWith("12ga");
  
  if (is12Ga) {
    const sItem = _findAmmo(actor, "12ga_s");
    const bItem = _findAmmo(actor, "12ga_b");
    if (sItem && bItem) {
      const choice = await Dialog.wait({
        title: "Wybór Amunicji (.12 Ga)",
        content: "<p>Masz oba rodzaje amunicji do strzelby (Śrut i Brenekę). Jaką ładujesz?</p>",
        buttons: {
          s: { label: ".12 Ga (ś – śrut)", callback: () => sItem },
          b: { label: ".12 Ga (b – breneka)", callback: () => bItem }
        },
        close: () => null
      });
      if (!choice) return;
      ammoItem = choice;
      ammoIdToLoad = choice.system.type?.subtype; 
    } else {
      ammoItem = sItem || bItem;
      ammoIdToLoad = ammoItem?.system?.type?.subtype ?? mag.ammoType;
    }
  } else {
    ammoItem = _findAmmo(actor, mag.ammoType);
  }

  if (!ammoItem) {
    ui.notifications.warn(`Brak amunicji (${mag.ammoType || "dowolnej"}) w ekwipunku.`);
    return;
  }

  // --- 3. Determine how much to load ---
  const available = ammoItem.system.quantity ?? 0;
  
  let toLoadAmount = Math.min(needed, available);
  if (magazineType !== MAGAZINE_TYPES.REMOVABLE && reloadPlan.roundsPerAction && reloadPlan.roundsPerAction !== 99) {
    toLoadAmount = Math.min(reloadPlan.roundsPerAction, needed, available);
  }

  if (toLoadAmount <= 0) {
    ui.notifications.warn(`${ammoItem.name}: wyczerpana amunicja.`);
    return;
  }

  // Zaktualizuj kaliber w broni, jeśli się zmienił (strzelba)
  let newMagData = { current: mag.current + toLoadAmount };
  if (ammoIdToLoad !== mag.ammoType) {
    newMagData.ammoType = ammoIdToLoad;
  }

  // Deduct ammo from inventory
  const newQty = available - toLoadAmount;
  if (newQty <= 0) {
    await ammoItem.delete();
  } else {
    await ammoItem.update({ "system.quantity": newQty });
  }

  // Update weapon's mag
  await setMag(item, newMagData);
  await _clearReloadState(item);

  // Sound
  playUtilitySound(
    "reload",
    item,
    magazineType === MAGAZINE_TYPES.REMOVABLE ? WeaponSound.RELOAD_MAG : WeaponSound.RELOAD_SINGLE,
    { caliberId: newMagData?.ammoType, token: actor },
  );
  seqScrollText("ZAŁADOWANO", actor, { color: "#f1c40f", fontSize: 26, duration: 1500 });

  if (inCombat) {
    await _spendCombatResource(actor, reloadPlan.actionType);
  }

  // Chat message formatting
  const justFull = (newMagData.current === mag.max) ? " do pełna" : "";
  const justAll = (newQty === 0) ? " wszystkie swoje" : "";

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div style="border-left:3px solid #888;padding-left:8px;font-size:1.1em;">
      <strong>${actor.name}</strong> załadował${justFull}${justAll} ${toLoadAmount} x ${ammoItem.name} do <em>${item.name}</em>.<br>
      <span style="font-size:0.85em;color:#888;">[Stan: ${newMagData.current}/${mag.max}]</span>
    </div>`
  });
}

function _getReloadPlan(item, mag, { magazineType = getMagazineType(item) } = {}) {
  const canQuickSwap = hasAbility(item.actor, ABILITY_KEYS.SZYBKA_WYMIANA);
  const canQuickReload = hasAbility(item.actor, ABILITY_KEYS.SZYBKIE_PRZELADOWANIE);

  if (magazineType === MAGAZINE_TYPES.INTERNAL) {
    const actionType = canQuickReload ? "bonus" : "action";
    return {
      roundsPerAction: 1,
      dialogTitle: canQuickReload ? "Doładowanie magazynka wewnętrznego (Akcja bonusowa)" : "Doładowanie magazynka wewnętrznego",
      containerAccusative: "magazynek wewnętrzny",
      fullAdjective: "pełny",
      chatVerb: "doładowuje",
      actionType,
      actionLabel: actionType === "bonus" ? "Akcja bonusowa" : "Akcja",
      actionLabelAccusative: actionType === "bonus" ? "Akcję bonusową" : "Akcję",
      ruleChangeAbilityKey: canQuickReload ? ABILITY_KEYS.SZYBKIE_PRZELADOWANIE : null,
      ruleChangeText: canQuickReload ? "ta czynność została wykonana jako Akcja bonusowa zamiast Akcji." : "",
      confirmationText: (weapon, currentMag, toLoad, actionCost) => `Załadować <strong>${toLoad}</strong> nabój ${currentMag.ammoType} do magazynka wewnętrznego broni <strong>${weapon.name}</strong>${actionCost}?`,
    };
  }

  if (magazineType === MAGAZINE_TYPES.CYLINDER) {
    const actionType = canQuickReload ? "bonus" : "action";
    return {
      roundsPerAction: 1,
      dialogTitle: canQuickReload ? "Doładowanie bębenka (Akcja bonusowa)" : "Doładowanie bębenka",
      containerAccusative: "bębenek",
      fullAdjective: "pełny",
      chatVerb: "doładowuje bębenek w",
      actionType,
      actionLabel: actionType === "bonus" ? "Akcja bonusowa" : "Akcja",
      actionLabelAccusative: actionType === "bonus" ? "Akcję bonusową" : "Akcję",
      ruleChangeAbilityKey: canQuickReload ? ABILITY_KEYS.SZYBKIE_PRZELADOWANIE : null,
      ruleChangeText: canQuickReload ? "ta czynność została wykonana jako Akcja bonusowa zamiast Akcji." : "",
      confirmationText: (weapon, currentMag, toLoad, actionCost) => `Załadować <strong>${toLoad}</strong> nabój ${currentMag.ammoType} do bębenka broni <strong>${weapon.name}</strong>${actionCost}?`,
    };
  }

  const actionType = canQuickSwap ? "bonus" : "action";
  return {
    roundsPerAction: Number.isFinite(mag?.max) ? Math.max(Number(mag.max), 1) : 999,
    dialogTitle: canQuickSwap ? "Zmiana magazynka (Akcja bonusowa)" : "Zmiana magazynka",
    containerAccusative: "magazynek",
    fullAdjective: "pełny",
    chatVerb: "wsadza zapasowy magazynek w",
    actionType,
    actionLabel: actionType === "bonus" ? "Akcja bonusowa" : "Akcja",
    actionLabelAccusative: actionType === "bonus" ? "Akcję bonusową" : "Akcję",
    ruleChangeAbilityKey: canQuickSwap ? ABILITY_KEYS.SZYBKA_WYMIANA : null,
    ruleChangeText: canQuickSwap ? "wymiana całego magazynka została wykonana jako Akcja bonusowa zamiast Akcji." : "",
    confirmationText: (weapon, currentMag, toLoad, actionCost) => `Podmiana magazynka w <strong>${weapon.name}</strong>, na taki z <strong>${toLoad}</strong> ${_formatRoundWord(toLoad)} ${currentMag.ammoType} ${actionCost}?`,
  };
}

function _getMagazineUi(magazineType, item = null) {
  const canQuickSwap = item?.actor ? hasAbility(item.actor, ABILITY_KEYS.SZYBKA_WYMIANA) : false;
  const canQuickReload = item?.actor ? hasAbility(item.actor, ABILITY_KEYS.SZYBKIE_PRZELADOWANIE) : false;
  const reloadState = item ? _getReloadState(item) : {};
  const cycleOnly = item ? _canCycleReloadWithoutAmmo(item, getMag(item), reloadState) : false;

  /* Broń Miotana — quiver / ammo pouch */
  const weapType = item?.system?.type?.value ?? "";
  if (weapType === "miotana") {
    const caliberId = getMag(item)?.ammoType ?? "";
    const isArrow = caliberId === "strzala";
    const isBolt  = caliberId === "belt";
    const label   = isArrow ? "Kołczan (strzały)" : isBolt ? "Kołczan (bełty)" : "Ładunki";
    return {
      label,
      buttonLabel: "+1 ład",
      buttonTitle: "Uzupełnij ładunki z ekwipunku",
      hint: "Z broni miotanej odliczasz ładunek na atak."
    };
  }

  if (magazineType === MAGAZINE_TYPES.INTERNAL) {
    return {
      label: "Wmag.",
      buttonLabel: cycleOnly ? "⟳ Przeładuj" : "+1 nabój",
      buttonTitle: cycleOnly ? "Przeładuj broń po strzale" : "Załaduj 1 nabój do magazynka wewnętrznego",
      hint: canQuickReload ? "Doładowanie 1 szt: Akcja bonusowa." : "Doładowanie 1 szt: 1 Akcja."
    };
  }

  if (magazineType === MAGAZINE_TYPES.CYLINDER) {
    return {
      label: "Bębenek",
      buttonLabel: cycleOnly ? "⟳ Przeładuj" : "+1 nabój",
      buttonTitle: cycleOnly ? "Przeładuj broń po strzale" : "Załaduj 1 nabój do bębenka",
      hint: canQuickReload ? "Doładowanie 1 szt: Akcja bonusowa." : "Doładowanie 1 szt: 1 Akcja."
    };
  }

  return {
    label: "Magazynek",
    buttonLabel: cycleOnly ? "⟳ Przeładuj" : "↺ Zapasowy",
    buttonTitle: cycleOnly ? "Przeładuj broń po strzale" : "Wymień magazynek na zapasowy z ekwipunku",
    hint: canQuickSwap ? "Wymiana: Akcja bonusowa." : "Wymiana magazynka: 1 Akcja."
  };
}

function onPreUseActivity(activity) {
  const liveItem = _getLiveItem(activity?.item);
  if (!_isTrackedRangedWeapon(liveItem) || _isCustomActivity(activity)) return;

  if (_requiresManualReloadBeforeUse(liveItem)) {
    ui.notifications.warn(_getReloadRequiredWarning(liveItem));
    return false;
  }
}

/**
 * Return an optional rules-note paragraph for the current caliber (from ammo-data).
 * Shown below the magazine row in the item sheet.
 * @param {string} caliberId
 * @returns {string} HTML string (may be empty)
 */
function _getCaliberNote(caliberId) {
  if (!caliberId) return "";
  const caliber = AMMO_CALIBER_MAP[caliberId];
  return caliber?.note || "";
}

async function onPostUseActivity(activity) {
  const liveItem = _getLiveItem(activity?.item);
  if (!_isTrackedRangedWeapon(liveItem) || _isCustomActivity(activity)) return;
  if (!_isSingleShotActivity(activity)) return;
}

function uiForChat(magazineType) {
  if (magazineType === MAGAZINE_TYPES.INTERNAL) return "Wmag.";
  if (magazineType === MAGAZINE_TYPES.CYLINDER) return "Bębenek";
  return "Magazynek";
}

function _formatRoundWord(count) {
  return count === 1 ? "nabój" : "naboje";
}

function _hasProperty(item, property) {
  const properties = item?.system?.properties;
  if (!properties) return false;
  if (typeof properties.has === "function") return properties.has(property);
  if (Array.isArray(properties)) return properties.includes(property);
  return false;
}

/**
 * Find the best ammo item for a weapon in the actor's inventory.
 * Matches by ammoType string (case-insensitive) if set, otherwise any ammo.
 * @param {Actor5e} actor
 * @param {string} ammoType
 * @returns {Item5e|null}
 */
function _findAmmo(actor, ammoType) {
  const ammos = actor.itemTypes.consumable.filter(
    i => i.system.type?.value === "ammo" && (i.system.quantity ?? 0) > 0
  );
  if (!ammos.length) return null;

  if (ammoType) {
    const lower = ammoType.toLowerCase();
    const exact = ammos.find(
      i => (i.system.type?.subtype ?? "").toLowerCase() === lower
        || i.name.toLowerCase().includes(lower)
    );
    return exact || null;
  }
  return null;
}

function _restoreQuantumMagazines(combat) {
  for(let combatant of combat.combatants) {
    _restoreQuantumMagazinesForActor(combatant.actor);
  }
}

function _restoreQuantumMagazinesForActor(actor) {
  if (!actor) return;
  // Restore any item that is a magazine 
  actor.items.filter(i => i.type === "consumable" && i.system.type?.value === "magazine").forEach(i => {
    i.update({"system.uses.value": i.system.uses.max || 1 });
  });
}

async function syncAllMagazineUses() {
  const items = [
    ...Array.from(game.items ?? []),
    ...Array.from(game.actors ?? []).flatMap(actor => Array.from(actor.items ?? []))
  ];

  for (const item of items) {
    const mag = item?.type === "weapon" ? item.getFlag(MODULE_ID, "mag") : null;
    if (!mag || mag.max == null) continue;
    await _syncUsesFromMagazine(item, mag);
  }
}

async function _applyMagazineState(item, mag) {
  const normalized = {
    current: Math.max(0, Number(mag.current ?? 0)),
    max: Math.max(0, Number(mag.max ?? 0)),
    ammoType: mag.ammoType ?? ""
  };
  normalized.current = Math.min(normalized.current, normalized.max || normalized.current);

  syncingMagazineUses.add(item.uuid);
  try {
    await item.update({
      [`flags.${MODULE_ID}.mag`]: normalized,
      "system.uses.max": normalized.max,
      "system.uses.spent": Math.max(normalized.max - normalized.current, 0)
    });
  } finally {
    syncingMagazineUses.delete(item.uuid);
  }
}

async function _syncUsesFromMagazine(item, mag) {
  const expectedMax = Math.max(0, Number(mag.max ?? 0));
  const expectedSpent = Math.max(expectedMax - Math.max(0, Number(mag.current ?? 0)), 0);
  const currentMax = Number(item.system.uses?.max ?? 0);
  const currentSpent = Number(item.system.uses?.spent ?? 0);
  if ((currentMax === expectedMax) && (currentSpent === expectedSpent)) return;

  syncingMagazineUses.add(item.uuid);
  try {
    await item.update({
      "system.uses.max": expectedMax,
      "system.uses.spent": expectedSpent
    });
  } finally {
    syncingMagazineUses.delete(item.uuid);
  }
}

async function _syncMagazineFlagFromUses(item, mag) {
  const currentMax = Math.max(0, Number(item.system.uses?.max ?? mag.max ?? 0));
  const currentSpent = Math.max(0, Number(item.system.uses?.spent ?? 0));
  const expectedCurrent = Math.max(currentMax - currentSpent, 0);
  if ((Number(mag.max ?? 0) === currentMax) && (Number(mag.current ?? 0) === expectedCurrent)) return;

  syncingMagazineUses.add(item.uuid);
  try {
    await item.setFlag(MODULE_ID, "mag", {
      ...mag,
      max: currentMax,
      current: expectedCurrent
    });
  } finally {
    syncingMagazineUses.delete(item.uuid);
  }
}

/**
 * Mark the actor's action as spent in the current combat round.
 * dnd5e doesn't track this natively — we post a reminder chat message.
 * TODO: hook into activity cost system when dnd5e exposes it.
 * @param {Actor5e} actor
 */
async function _spendCombatAction(actor) {
  // For now: just set a flag so macros/automation can read it.
  // Future: integrate with action economy tracker.
  await actor.setFlag(MODULE_ID, "usedActionThisTurn", true);
}

async function _spendCombatResource(actor, actionType = "action") {
  if (actionType === "bonus") {
    await actor.setFlag(MODULE_ID, "usedBonusActionThisTurn", true);
    return;
  }

  await _spendCombatAction(actor);
}

function registerReloadActivityType() {
  if (CONFIG.DND5E.activityTypes[RELOAD_ACTIVITY_TYPE]) return;
  const BaseUtilityActivity = CONFIG.DND5E.activityTypes.utility?.documentClass;
  if (!BaseUtilityActivity) {
    console.warn("Neuroshima 5e | Could not register reload activity: missing base utility activity");
    return;
  }

  class NeuroReloadActivity extends BaseUtilityActivity {
    static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
      type: RELOAD_ACTIVITY_TYPE,
      title: "Przeładowanie",
      img: "modules/neuroshima-2026-overrides/icons/activities/activity_reload.svg",
      hint: "Neuroshima: ręczne przeładowanie komory po strzale albo demonstracyjne przeładowanie z wyrzuceniem naboju."
    }, { inplace: false }));

    async use(usage = {}, dialog = {}, message = {}) {
      const liveItem = _getLiveItem(this.item);
      if (!_isTrackedRangedWeapon(liveItem)) return false;
      return _performReloadAction(liveItem, {
        chat: true,
        spendResource: true,
        source: "activity"
      });
    }
  }

  CONFIG.DND5E.activityTypes[RELOAD_ACTIVITY_TYPE] = {
    documentClass: NeuroReloadActivity
  };
}

function registerLoadOneActivityType() {
  if (CONFIG.DND5E.activityTypes[LOAD_ONE_ACTIVITY_TYPE]) return;
  const BaseUtilityActivity = CONFIG.DND5E.activityTypes.utility?.documentClass;
  if (!BaseUtilityActivity) {
    console.warn("Neuroshima 5e | Could not register load-one activity: missing base utility activity");
    return;
  }

  class NeuroLoadOneActivity extends BaseUtilityActivity {
    static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
      type: LOAD_ONE_ACTIVITY_TYPE,
      title: "Doładuj 1 nabój",
      img: "modules/neuroshima-2026-overrides/icons/activities/activity_load_one.svg",
      hint: "Neuroshima: doładowanie pojedynczego naboju do magazynka wewnętrznego albo bębenka."
    }, { inplace: false }));

    async use(usage = {}, dialog = {}, message = {}) {
      const liveItem = _getLiveItem(this.item);
      if (!_isTrackedRangedWeapon(liveItem)) return false;
      return _performLoadOneAction(liveItem, {
        chat: true,
        spendResource: true,
        source: "activity"
      });
    }
  }

  CONFIG.DND5E.activityTypes[LOAD_ONE_ACTIVITY_TYPE] = {
    documentClass: NeuroLoadOneActivity
  };
}

function registerMagSwapActivityType() {
  if (CONFIG.DND5E.activityTypes[MAG_SWAP_ACTIVITY_TYPE]) return;
  const BaseUtilityActivity = CONFIG.DND5E.activityTypes.utility?.documentClass;
  if (!BaseUtilityActivity) {
    console.warn("Neuroshima 5e | Could not register mag-swap activity: missing base utility activity");
    return;
  }

  class NeuroMagSwapActivity extends BaseUtilityActivity {
    static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
      type: MAG_SWAP_ACTIVITY_TYPE,
      title: "Wymiana magazynka",
      img: "modules/neuroshima-2026-overrides/icons/activities/activity_mag_swap.svg",
      hint: "Neuroshima: wymień pusty magazynek na zapasowy z ekwipunku. Wymaga posiadania przygotowanego magazynka."
    }, { inplace: false }));

    async use(usage = {}, dialog = {}, message = {}) {
      const liveItem = _getLiveItem(this.item);
      return _onClickReload(liveItem);
    }
  }

  CONFIG.DND5E.activityTypes[MAG_SWAP_ACTIVITY_TYPE] = {
    documentClass: NeuroMagSwapActivity
  };
}

async function syncAllWeaponMagazineActivities() {
  const items = [
    ...Array.from(game.items ?? []),
    ...Array.from(game.actors ?? []).flatMap(actor => Array.from(actor.items ?? []))
  ];

  for (const item of items) {
    await syncWeaponMagazineActivities(item);
  }
}

async function syncWeaponMagazineActivities(item) {
  if (!_shouldManageMagazineActivities(item)) return;
  if (syncingManagedActivities.has(item.uuid)) return;

  syncingManagedActivities.add(item.uuid);
  try {
    await syncReloadActivity(item);
    await syncLoadOneActivity(item);
    await syncMagSwapActivity(item);
  } finally {
    syncingManagedActivities.delete(item.uuid);
  }
}

async function syncReloadActivity(item) {
  const managed = _findManagedMagazineActivity(item, "reload");
  const shouldHave = _hasProperty(item, "przeladowanie");

  if (!shouldHave) {
    if (managed) await item.deleteActivity(managed.id);
    return;
  }

  const data = _buildReloadActivityData(item);
  if (!managed) {
    await item.createActivity(RELOAD_ACTIVITY_TYPE, data, { renderSheet: false });
    return;
  }

  await item.updateActivity(managed.id, {
    name: data.name,
    activation: data.activation,
    description: data.description,
    roll: data.roll,
    flags: data.flags
  });
}

async function syncLoadOneActivity(item) {
  const managed = _findManagedMagazineActivity(item, "loadOne");
  const magazineType = getMagazineType(item);
  const shouldHave = [MAGAZINE_TYPES.INTERNAL, MAGAZINE_TYPES.CYLINDER].includes(magazineType);

  if (!shouldHave) {
    if (managed) await item.deleteActivity(managed.id);
    return;
  }

  const data = _buildLoadOneActivityData(item, magazineType);
  if (!managed) {
    await item.createActivity(LOAD_ONE_ACTIVITY_TYPE, data, { renderSheet: false });
    return;
  }

  await item.updateActivity(managed.id, {
    name: data.name,
    activation: data.activation,
    description: data.description,
    roll: data.roll,
    flags: data.flags
  });
}

async function syncMagSwapActivity(item) {
  const managed = _findManagedMagazineActivity(item, "magSwap");
  const shouldHave = getMag(item) !== null && getMagazineType(item) === MAGAZINE_TYPES.REMOVABLE;

  if (!shouldHave) {
    if (managed) await item.deleteActivity(managed.id);
    return;
  }

  const data = _buildMagSwapActivityData(item);
  if (!managed) {
    await item.createActivity(MAG_SWAP_ACTIVITY_TYPE, data, { renderSheet: false });
    return;
  }

  await item.updateActivity(managed.id, {
    name: data.name,
    activation: data.activation,
    description: data.description,
    flags: data.flags
  });
}

function _buildMagSwapActivityData(item) {
  const canQuickSwap = item.actor ? hasAbility(item.actor, ABILITY_KEYS.SZYBKA_WYMIANA) : false;
  return {
    name: canQuickSwap ? "Wymiana magazynka (AB)" : "Wymiana magazynka",
    activation: {
      type: canQuickSwap ? "bonus" : "action",
      value: 1
    },
    description: {
      chat: "",
      value: "<p>Wymie\u0144 aktualny magazynek na zapasowy z ekwipunku. Wymaga posiadania przygotowanego zapasowego magazynka.</p>"
    },
    flags: {
      [MODULE_ID]: {
        [MANAGED_ACTIVITY_FLAGS.MANAGED]: true,
        [MANAGED_ACTIVITY_FLAGS.KIND]: "magSwap"
      }
    }
  };
}

function _buildReloadActivityData(item) {
  return {
    name: "Przeładowanie",
    activation: {
      type: "bonus",
      value: 1,
      condition: "Neuroshima: zwykle Akcja Bonusowa; alternatywnie można potraktować jako darmową interakcję, jeśli MG tak prowadzi scenę."
    },
    description: {
      chat: "",
      value: "<p>Przeładowuje broń po strzale. Jeżeli w komorze był już żywy nabój, czynność wyrzuca go z broni i może załadować kolejny, jeśli w magazynku pozostała amunicja.</p>"
    },
    roll: {
      formula: "",
      name: "",
      prompt: false,
      visible: false
    },
    flags: {
      [MODULE_ID]: {
        [MANAGED_ACTIVITY_FLAGS.MANAGED]: true,
        [MANAGED_ACTIVITY_FLAGS.KIND]: "reload"
      }
    }
  };
}

function _buildLoadOneActivityData(item, magazineType = getMagazineType(item)) {
  const label = magazineType === MAGAZINE_TYPES.CYLINDER ? "bębenka" : "magazynka wewnętrznego";
  return {
    name: "Doładuj 1 nabój",
    activation: {
      type: "action",
      value: 1,
      condition: "Neuroshima: standardowo Akcja; przy Szybkim przeładowaniu może zejść do Akcji Bonusowej."
    },
    description: {
      chat: "",
      value: `<p>Doładowuje pojedynczy nabój do ${label}. Czynność zużywa amunicję z ekwipunku i respektuje ekonomię akcji.</p>`
    },
    roll: {
      formula: "",
      name: "",
      prompt: false,
      visible: false
    },
    flags: {
      [MODULE_ID]: {
        [MANAGED_ACTIVITY_FLAGS.MANAGED]: true,
        [MANAGED_ACTIVITY_FLAGS.KIND]: "loadOne"
      }
    }
  };
}

function _findManagedMagazineActivity(item, kind) {
  for (const activity of item.system.activities ?? []) {
    if (_getActivityModuleFlag(activity, MANAGED_ACTIVITY_FLAGS.MANAGED) !== true) continue;
    if (_getActivityModuleFlag(activity, MANAGED_ACTIVITY_FLAGS.KIND) === kind) return activity;
  }
  return null;
}

function _getActivityModuleFlag(activity, key) {
  return activity?.flags?.[MODULE_ID]?.[key];
}

function _shouldManageMagazineActivities(item) {
  if (!item || item.type !== "weapon" || item.pack) return false;
  const isFirearm = item.system.type?.value?.startsWith?.("palna") ?? false;
  return isFirearm
    || !!_findManagedMagazineActivity(item, "reload")
    || !!_findManagedMagazineActivity(item, "loadOne")
    || !!_findManagedMagazineActivity(item, "magSwap");
}

function registerAttackReloadGuard() {
  const BaseAttackActivity = CONFIG.DND5E.activityTypes?.attack?.documentClass;
  if (!BaseAttackActivity || BaseAttackActivity.prototype._neuroReloadWrapped) return;

  const originalRollAttack = BaseAttackActivity.prototype.rollAttack;
  BaseAttackActivity.prototype.rollAttack = async function neuroRollAttack(config = {}, dialog = {}, message = {}) {
    const liveItem = _getLiveItem(this.item);
    if (!_isTrackedRangedWeapon(liveItem) || _isCustomActivity(this)) {
      const result = await originalRollAttack.call(this, config, dialog, message);
      // Untracked firearms (e.g. jednorazowa) still get a shot sound
      const isUntrackedFirearm = !_isTrackedRangedWeapon(liveItem) && !_isCustomActivity(this)
        && liveItem?.system?.type?.value?.startsWith("palna");
      if (isUntrackedFirearm) {
        const cancelled = (result === false) || (result == null) || (Array.isArray(result) && result.length === 0);
        if (!cancelled) {
          playShotSound(liveItem, {
            caliberId: getMag(liveItem)?.ammoType, token: liveItem.actor,
          });
          _playSingleShotVfx(liveItem, result);
        }
      }
      return result;
    }

    if (_requiresManualReloadBeforeUse(liveItem)) {
      ui.notifications.warn(_getReloadRequiredWarning(liveItem));
      return false;
    }

    const mag = getMag(liveItem);
    if (mag && mag.current <= 0 && !_getManualReloadMode(liveItem)) {
      playUtilitySound("click", liveItem, WeaponSound.EMPTY_CLICK, {
        caliberId: mag.ammoType, token: liveItem.actor,
      });
      seqScrollText("PUSTE!", liveItem.actor, { color: "#e67e22", fontSize: 30, duration: 1800 });
      await _announceEmptyMagazine(liveItem);
      return false;
    }

    const snapshot = {
      spent: Number(liveItem.system.uses?.spent ?? 0),
      current: Number(getMag(liveItem)?.current ?? 0),
      chamberLoaded: _getChamberState(liveItem).loaded === true
    };

    const result = await originalRollAttack.call(this, config, dialog, message);
    if ((result === false) || (result == null)) return result;
    if (Array.isArray(result) && (result.length === 0)) return result;

    if (Array.isArray(result) && result.some(roll => roll?.isFumble) && !isJamImmune(liveItem)) {
      await _restoreAbortedShotState(liveItem, snapshot);
      return result;
    }

    await _processSingleShotAttack(this, liveItem, snapshot);
    playShotSound(liveItem, {
      caliberId: getMag(liveItem)?.ammoType, token: liveItem.actor,
    });
    _playSingleShotVfx(liveItem, result);
    return result;
  };

  BaseAttackActivity.prototype._neuroReloadWrapped = true;
}

/**
 * Fire the single-shot VFX (muzzle flash + tracer + hit impact) via Sequencer.
 * Hit/miss is derived from the first attack roll vs the current target's AC.
 * A full downrange payoff (tracer + impact) only shows when a target is selected —
 * this is intentional, to reward using Foundry's targeting (PLAN_shooting_vfx.md §1).
 *
 * @param {Item5e} item             The firearm that was fired.
 * @param {Array|boolean} result    Roll array returned by rollAttack.
 */
function _playSingleShotVfx(item, result) {
  const shooter = item?.actor;
  if (!shooter) return;
  const targetToken = game.user?.targets?.first() ?? null;
  const roll = Array.isArray(result) ? result[0] : null;
  const hit = _isAttackHit(roll, targetToken);
  tracerFire({
    shooter, target: targetToken, hit, rounds: 1,
    caliber: getMag(item)?.ammoType, weaponId: item.system?.identifier
  });
}

/**
 * Determine whether an attack roll hit a target token, by comparing the roll
 * total to the target's AC. Critical hits always hit; fumbles always miss.
 *
 * @param {object|null} roll         A dnd5e D20Roll (or null).
 * @param {Token|null} targetToken   The targeted canvas token (or null).
 * @returns {boolean}
 */
function _isAttackHit(roll, targetToken) {
  if (!roll || !targetToken) return false;
  if (roll.isCritical) return true;
  if (roll.isFumble) return false;
  const ac = targetToken.actor?.system?.attributes?.ac?.value;
  if (typeof ac !== "number") return false;
  return (roll.total ?? 0) >= ac;
}

function _getReloadState(item) {
  return item?.getFlag(MODULE_ID, RELOAD_STATE_FLAG) ?? {};
}

function _getChamberState(item, mag = getMag(item)) {
  const state = item?.getFlag(MODULE_ID, CHAMBER_STATE_FLAG);
  if (typeof state?.loaded === "boolean") return state;
  if (!_getManualReloadMode(item)) return { loaded: true };
  return { loaded: Number(mag?.current ?? 0) > 0 };
}

async function _setReloadState(item, state) {
  const normalized = Object.fromEntries(Object.entries(state ?? {}).filter(([, value]) => value !== false && value != null && value !== ""));
  if (Object.keys(normalized).length > 0) return item.setFlag(MODULE_ID, RELOAD_STATE_FLAG, normalized);
  return item.unsetFlag(MODULE_ID, RELOAD_STATE_FLAG);
}

async function _setChamberState(item, state) {
  const normalized = {
    loaded: state?.loaded === true
  };
  return item.setFlag(MODULE_ID, CHAMBER_STATE_FLAG, normalized);
}

async function _clearReloadState(item) {
  return _setReloadState(item, {});
}

function _isTrackedRangedWeapon(item) {
  return !!item && (item.type === "weapon") && (getMag(item) !== null);
}

function _isCustomActivity(activity) {
  return CUSTOM_ACTIVITY_TYPES.has(activity?.type);
}

function _isSingleShotActivity(activity) {
  return ["attack"].includes(activity?.type);
}

function _getLiveItem(item) {
  return item?.actor?.items?.get(item.id) ?? item;
}

function _getManualReloadMode(item) {
  if (_hasProperty(item, "ladowanie")) return "ladowanie";
  if (_hasProperty(item, "przeladowanie")) return "przeladowanie";
  return null;
}

function _shouldShowChamberStatus(item) {
  if (_getManualReloadMode(item)) return true;
  return [MAGAZINE_TYPES.INTERNAL, MAGAZINE_TYPES.CYLINDER].includes(getMagazineType(item));
}

function _ignoresManualReloadMode(item, mode = _getManualReloadMode(item)) {
  if (mode !== "przeladowanie") return false;
  return hasAbility(item?.actor, ABILITY_KEYS.SZYBKIE_PRZELADOWANIE);
}

function _requiresManualReloadBeforeUse(item) {
  const mode = _getManualReloadMode(item);
  if (!mode) return false;
  if (_ignoresManualReloadMode(item, mode)) return false;
  if (_getReloadState(item).required === true) return true;
  return _getChamberState(item).loaded !== true;
}

function _getReloadRequiredWarning(item) {
  const mode = _getReloadState(item).mode ?? _getManualReloadMode(item);
  const mag = getMag(item);
  if (mode === "przeladowanie") {
    if (Number(mag?.current ?? 0) <= 0) {
      return `${item.name}: komora jest pusta, a magazynek wewnętrzny także jest pusty.`;
    }
    return `${item.name}: po poprzednim strzale trzeba przeładować broń (darmowa interakcja lub Akcja Bonusowa).`;
  }

  return `${item.name}: po każdym strzale trzeba załadować nową sztukę amunicji.`;
}

async function _announceEmptyMagazine(item) {
  const mag = getMag(item);
  const magType = getMagazineType(item);
  const label = magType === MAGAZINE_TYPES.CYLINDER ? "bębenek" : "magazynek";
  const warningHtml = `<div class="neuro-chat-warning"><span class="neuro-chat-warning-icon">⚠</span><span><strong>${item.name}</strong> — ${label} pusty. Trzeba przeładować.</span></div>`;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: item.actor }),
    content: warningHtml
  });
}

function _getChamberStateHint(item, chamberState = _getChamberState(item), mag = getMag(item)) {
  const current = Number(mag?.current ?? 0);
  if (chamberState.loaded) return "Komora: załadowana.";

  if (_getManualReloadMode(item) === "przeladowanie") {
    return current > 0 ? "Komora: pusta (wymaga przeładowania)." : "Komora: pusta (i pusty magazynek).";
  }

  return current > 0 ? "Komora: pusta." : "Komora: pusta (rozładowana).";
}

function _getReloadStateHint(item, reloadState = _getReloadState(item)) {
  const mag = getMag(item);
  if (reloadState.mode === "przeladowanie") {
    return _canCycleReloadWithoutAmmo(item, mag, reloadState)
      ? "Przeładuj po strzale (bez użycia amunicji)."
      : (Number(mag?.current ?? 0) > 0
        ? "Przeładuj po strzale."
        : "Przeładuj (ale brak amunicji).");
  }

  return "Załaduj nową po strzale.";
}

function _shouldAnnounceQuickReload(item, mode = _getManualReloadMode(item), mag = getMag(item)) {
  const actualMode = _getManualReloadMode(item);
  if (actualMode !== "przeladowanie") return false;
  if (mode && (mode !== actualMode)) return false;
  if (!_ignoresManualReloadMode(item, actualMode)) return false;
  return Number(mag?.current ?? 0) > 0;
}

async function _announceQuickReload(item, mag = getMag(item)) {
  if (!_shouldAnnounceQuickReload(item, undefined, mag)) return;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: item.actor }),
    content: `<div style="border-left:3px solid #6b7a40;padding-left:8px"><strong>${item.actor?.name ?? "Postać"}</strong> błyskawicznie przeładowuje <em>${item.name}</em>. Broń jest gotowa do następnego strzału. Łącznie załadowane: ${Number(mag?.current ?? 0)}/${Number(mag?.max ?? 0)}.${buildAbilityRuleChangeNotice(ABILITY_KEYS.SZYBKIE_PRZELADOWANIE, "właściwość Przeładowanie została zignorowana; broń nie wymaga osobnej czynności przeładowania po strzale.")}</div>`
  });
}

async function _performReloadAction(item, { chat = true, spendResource = true, source = "button" } = {}) {
  const liveItem = _getLiveItem(item);
  const actor = liveItem?.actor;
  const mag = getMag(liveItem);
  if (!liveItem || !mag) return false;

  let current = Number(mag.current ?? 0);
  const chamberState = _getChamberState(liveItem, mag);
  const ejectedLiveRound = chamberState.loaded && (current > 0);

  if (ejectedLiveRound) {
    current = Math.max(current - 1, 0);
    await setMag(liveItem, { current });
  }

  const chamberLoaded = current > 0;
  await _setChamberState(liveItem, { loaded: chamberLoaded });
  await _clearReloadState(liveItem);

  if (actor?.inCombat && spendResource) {
    await _spendCombatResource(actor, "bonus");
  }

  if (chat) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: _getReloadActionChatContent(liveItem, {
        ejectedLiveRound,
        chamberLoaded,
        current,
        max: Number(mag.max ?? 0),
        source,
        spentBonus: !!actor?.inCombat && spendResource
      })
    });
  }

  const _isFirearm = liveItem.system.type?.value?.startsWith?.("palna") ?? false;
  playUtilitySound(
    "reload",
    liveItem,
    _isFirearm ? WeaponSound.RELOAD_SINGLE : WeaponSound.RELOAD_OTHER,
    { caliberId: mag?.ammoType, token: liveItem.actor },
  );
  seqScrollText("ZAŁADOWANO", liveItem.actor, { color: "#f1c40f", fontSize: 26, duration: 1500 });
  return { ejectedLiveRound, chamberLoaded, current };
}

async function _performLoadOneAction(item, { chat = true, spendResource = true, source = "activity" } = {}) {
  const liveItem = _getLiveItem(item);
  const actor = liveItem?.actor;
  if (!liveItem || !actor) return false;

  const magazineType = getMagazineType(liveItem);
  const mag = getMag(liveItem);
  if (!mag) {
    ui.notifications.warn(`${liveItem.name}: pojemność magazynka nie jest ustawiona. Otwórz kartę broni i ustaw pojemność w sekcji „Magazynek".`);
    return false;
  }
  if (![MAGAZINE_TYPES.INTERNAL, MAGAZINE_TYPES.CYLINDER].includes(magazineType)) {
    ui.notifications.warn(`${liveItem.name}: ta broń nie jest doładowywana po jednym naboju.`);
    return false;
  }

  if (Number(mag.current ?? 0) >= Number(mag.max ?? 0)) {
    ui.notifications.info(`${liveItem.name}: ${magazineType === MAGAZINE_TYPES.CYLINDER ? "bębenek" : "magazynek wewnętrzny"} jest pełny.`);
    return false;
  }

  const ammoItem = _findAmmo(actor, mag.ammoType);
  if (!ammoItem) {
    ui.notifications.warn(`Brak amunicji (${mag.ammoType || "dowolnej"}) w ekwipunku.`);
    return false;
  }

  const available = Number(ammoItem.system.quantity ?? 0);
  if (available <= 0) {
    ui.notifications.warn(`${ammoItem.name}: wyczerpana.`);
    return false;
  }

  if (available <= 1) {
    await ammoItem.delete();
  } else {
    await ammoItem.update({ "system.quantity": available - 1 });
  }

  await setMag(liveItem, { current: Number(mag.current ?? 0) + 1 });

  // Bugfix (2026-09-06, found via Pistolet na Race): unlike `_performReloadAction` (the
  // cycle-reload path for "przeładowanie" weapons), this single-round path never used to touch
  // chamber/reload-state at all. On a "ładowanie" weapon (single load-each-shot: Samoróbka,
  // Pistolet na Race, most rifles/shotguns/MGL1S/Moździerz — see `weapons-data.mjs` props lists)
  // that left `chamber.loaded` and `reloadState.required` stuck at whatever the LAST SHOT set
  // them to (false / true) even after this action just put a live round back in — so
  // `_requiresManualReloadBeforeUse` kept reporting "trzeba przeładować" and blocking every
  // activity (ATAK included) on an already-reloaded weapon. Confirmed live: Raynald's Pistolet
  // na Race, reloaded to 1/1 after its first shot, was still stuck exactly like this. A round is
  // now genuinely chambered, so both flags must reflect that, same as the cycle-reload path does.
  await _setChamberState(liveItem, { loaded: true });
  await _clearReloadState(liveItem);

  const reloadPlan = _getReloadPlan(liveItem, mag, { magazineType });
  if (actor.inCombat && spendResource) {
    await _spendCombatResource(actor, reloadPlan.actionType);
  }

  if (chat) {
    const nextMag = getMag(liveItem);
    const inCombatSpent = !!(actor.inCombat && spendResource);
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div style="border-left:3px solid #888;padding-left:8px"><strong>${actor.name}</strong> doładowuje <em>${liveItem.name}</em> o 1 nabój do ${magazineType === MAGAZINE_TYPES.CYLINDER ? "bębenka" : "magazynka wewnętrznego"}.<br>Stan broni: ${Number(nextMag?.current ?? 0)}/${Number(nextMag?.max ?? 0)}.${_getReloadRuleChangeNotice(reloadPlan, { inCombat: inCombatSpent })}</div>
      <ul class="card-footer pills unlist"><li class="pill transparent"><span class="label">${reloadPlan.actionLabel}${inCombatSpent ? "" : " (poza walką)"}</span></li></ul>`
    });
  }

  playUtilitySound("reload", liveItem, WeaponSound.RELOAD_SINGLE, {
    caliberId: getMag(liveItem)?.ammoType, token: actor,
  });
  seqScrollText("ZAŁADOWANO", actor, { color: "#f1c40f", fontSize: 26, duration: 1500 });
  return true;
}

function _getReloadActionChatContent(item, { ejectedLiveRound, chamberLoaded, current, max, spentBonus = false } = {}) {
  const actorName = item.actor?.name ?? "Postać";
  const pill = `<ul class="card-footer pills unlist"><li class="pill transparent"><span class="label">Akcja bonusowa${spentBonus ? "" : " (poza walką)"}</span></li></ul>`;

  if (ejectedLiveRound && chamberLoaded) {
    return `<div style="border-left:3px solid #888;padding-left:8px"><strong>${actorName}</strong> przeładowuje <em>${item.name}</em>, wyrzucając niezbitą sztukę z komory. Kolejny nabój wchodzi na miejsce.<br>Stan broni: ${current}/${max}.</div>${pill}`;
  }

  if (ejectedLiveRound) {
    return `<div style="border-left:3px solid #888;padding-left:8px"><strong>${actorName}</strong> przeładowuje <em>${item.name}</em>, wyrzucając ostatni niezbitą sztukę z komory.<br><em>Magazynek wewnętrzny jest pusty.</em></div>${pill}`;
  }

  if (chamberLoaded) {
    return `<div style="border-left:3px solid #888;padding-left:8px"><strong>${actorName}</strong> przeładowuje <em>${item.name}</em> po strzale. Broń znów jest gotowa.<br>Załadowa: ${current}/${max}.</div>${pill}`;
  }

  return `<div style="border-left:3px solid #888;padding-left:8px"><strong>${actorName}</strong> przeładowuje <em>${item.name}</em>, ale mechanizm chodzi na sucho.<br><em>Magazynek wewnętrzny jest pusty.</em></div>${pill}`;
}

function _getReloadRuleChangeNotice(reloadPlan, { inCombat = false } = {}) {
  if (!inCombat || !reloadPlan?.ruleChangeAbilityKey || !reloadPlan?.ruleChangeText) return "";
  return buildAbilityRuleChangeNotice(reloadPlan.ruleChangeAbilityKey, reloadPlan.ruleChangeText);
}

async function _consumeSingleShotAmmo(item, snapshot) {
  const mag = getMag(item);
  if (!mag) return false;

  if (_getManualReloadMode(item) && (_getChamberState(item, mag).loaded !== true)) return false;

  const beforeSpent = Number(snapshot?.spent ?? item.system.uses?.spent ?? 0);
  const afterSpent = Number(item.system.uses?.spent ?? 0);
  let consumed = false;
  if (afterSpent !== beforeSpent) {
    await _syncMagazineFlagFromUses(item, mag);
    consumed = true;
  }

  if (!consumed) {
    if (mag.current <= 0) return false;
    consumed = await spendRound(item);
  }

  if (_getManualReloadMode(item)) {
    await _setChamberState(item, { loaded: false });
  }

  return consumed;
}

async function _restoreAbortedShotState(item, snapshot) {
  const mag = getMag(item);
  if (mag && Number.isFinite(snapshot?.current)) {
    await setMag(item, { current: Number(snapshot.current) });
  }

  if (typeof snapshot?.chamberLoaded === "boolean") {
    await _setChamberState(item, { loaded: snapshot.chamberLoaded });
  }
}

async function _processSingleShotAttack(activity, liveItem, snapshot) {
  processedSingleShotActivities.add(activity);
  await _consumeSingleShotAmmo(liveItem, snapshot);
  await _markManualReloadAfterShot(liveItem);
  await _announceQuickReload(liveItem);
}

async function _markManualReloadAfterShot(item) {
  const mode = _getManualReloadMode(item);
  if (!mode) return;
  if (_ignoresManualReloadMode(item, mode)) {
    await _setChamberState(item, { loaded: Number(getMag(item)?.current ?? 0) > 0 });
    await _clearReloadState(item);
    return;
  }

  await _setReloadState(item, {
    required: true,
    mode,
    requiredAt: Date.now()
  });
}

function _canCycleReloadWithoutAmmo(item, mag = getMag(item), reloadState = _getReloadState(item)) {
  if (!reloadState.required) return false;
  if ((reloadState.mode ?? _getManualReloadMode(item)) !== "przeladowanie") return false;
  if (_ignoresManualReloadMode(item, "przeladowanie")) return false;
  return _getChamberState(item, mag).loaded !== true;
}

async function _completeCycleReload(item, { chat = true } = {}) {
  return _performReloadAction(item, { chat, spendResource: true, source: "button" });
}

/**
 * Predykaty reguł wystawione dla testów Quench (`scripts/tests/`). Wyłącznie odczyt —
 * pozwalają sprawdzić Sztuczkę „Szybkie palce" bez przechodzenia przez dialog przeładowania.
 */
export const __testing = Object.freeze({
  MAGAZINE_TYPES,
  reloadPlan: _getReloadPlan,
  manualReloadMode: _getManualReloadMode,
  ignoresManualReloadMode: _ignoresManualReloadMode,
  requiresManualReloadBeforeUse: _requiresManualReloadBeforeUse
});
