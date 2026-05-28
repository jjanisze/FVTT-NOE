/**
 * Neuroshima 5e — Stopień Zranienia (Wound Level) system.
 * 
 * When PW drop to 0 or a critical hit is received, the character gains
 * a Stopień Zranienia. This coexists with dnd5e death saves.
 * 
 * Levels and penalties (cumulative — each new level adds its effect to all previous):
 *   0: Brak — no penalties
 *   1: Lekki — speed -4.5 m
 *   2: Znaczny — speed -4.5 m, no Reactions
 *   3: Poważny — speed -4.5 m, no Reactions, no Bonus Actions
 *   4: Krytyczny — speed -4.5 m, no Reactions, no Bonus Actions, +1 Wyczerpanie
 *   5+: Śmierć (next wound after Krytyczny = death)
 * 
 * Data stored in module flags:
 *   flags.neuroshima-2026-overrides.zranienie = { level: 0-4 }
 */

import { addExhaustion } from "../config/exhaustion.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/**
 * Zranienie level definitions.
 */
export const ZRANIENIE_LEVELS = {
  0: { label: "Brak", speedPenalty: 0, noReaction: false, noBonusAction: false, exhaustion: false },
  1: { label: "Lekki", speedPenalty: 4.5, noReaction: false, noBonusAction: false, exhaustion: false },
  2: { label: "Znaczny", speedPenalty: 4.5, noReaction: true, noBonusAction: false, exhaustion: false },
  3: { label: "Poważny", speedPenalty: 4.5, noReaction: true, noBonusAction: true, exhaustion: false },
  4: { label: "Krytyczny", speedPenalty: 4.5, noReaction: true, noBonusAction: true, exhaustion: true }
};

/**
 * Register Zranienie hooks — call during init.
 */
export function registerZranienie() {
  // Hook into HP changes to detect PW→0 (preUpdate so we can read old HP)
  Hooks.on("preUpdateActor", onPreUpdateActor);

  // After update, apply wound if flagged by preUpdate
  Hooks.on("updateActor", onUpdateActorZranienie);

  // Hook into damage rolls to detect critical hits
  Hooks.on("dnd5e.rollDamage", onRollDamage);

  // Inject zranienie display on character and NPC sheets
  Hooks.on("renderCharacterActorSheet", onRenderCharacterSheet);
  Hooks.on("renderNPCActorSheet", onRenderNPCSheet);

  // Sync flag when the AE is deleted manually from Effects tab
  Hooks.on("deleteActiveEffect", onDeleteActiveEffect);

  // Fix death saves: remove exhaustion penalty (not a d20 test per Neuroshima rules)
  Hooks.on("dnd5e.preRollDeathSave", onPreRollDeathSave);

  console.log("Neuroshima 5e | Zranienie system registered");
}

/**
 * Detect when HP is about to drop to 0 and queue wound application.
 * Using preUpdateActor because actor.system still holds OLD values here.
 */
function onPreUpdateActor(actor, changes, options, userId) {
  // Only process for the GM (avoid double processing)
  if (!game.user.isGM) return;

  // Check if HP is being set to 0
  const newHP = foundry.utils.getProperty(changes, "system.attributes.hp.value");
  if (newHP !== 0) return;

  // Check that current HP is > 0 (actor has old values in preUpdate)
  const oldHP = actor.system.attributes.hp.value;
  if (oldHP === undefined || oldHP <= 0) return;

  // Flag the options so we can apply the wound in updateActor (after the update)
  foundry.utils.setProperty(options, `${MODULE_ID}.applyZranienie`, true);
}

/**
 * After actor update, apply queued wound and 0-HP conditions if flagged in preUpdate.
 */
async function onUpdateActorZranienie(actor, changes, options, userId) {
  if (!game.user.isGM) return;
  if (!options?.[MODULE_ID]?.applyZranienie) return;

  // Apply wound level
  await applyZranienie(actor, "PW spadły do 0");

  // Apply Unconscious + Prone (dnd5e does NOT do this automatically)
  await _applyZeroHPConditions(actor);
}

/**
 * React to damage rolls — detect critical hits.
 * dnd5e.rollDamage fires after a damage roll is completed.
 */
async function onRollDamage(item, roll, data) {
  // Only GM processes
  if (!game.user.isGM) return;

  // Check if the originating attack was a critical hit
  if (!data?.isCritical) return;

  // Get the target(s) from the roll
  const targets = data?.targets ?? [];
  for (const target of targets) {
    const actor = target?.actor;
    if (actor) {
      await applyZranienie(actor, "Trafienie krytyczne");
    }
  }
}

/**
 * When the Zranienie Active Effect is deleted (e.g. via the Effects tab),
 * reset the wound level flag to 0 to keep them in sync.
 */
async function onDeleteActiveEffect(effect, options, userId) {
  if (!game.user.isGM) return;
  if (!effect.getFlag(MODULE_ID, "zranieniEffect")) return;
  const actor = effect.parent;
  if (!actor || !(actor instanceof Actor)) return;
  // Reset wound flag to 0 without trying to delete the (already gone) effect
  await actor.setFlag(MODULE_ID, "zranienie", { level: 0 });
}

/**
 * Hook: dnd5e.preRollDeathSave
 *
 * Death saves in Neuroshima are NOT d20 tests — they are pure luck rolls:
 * "nie jest powiązany z żadną Cechą Bazową i nie jest też Testem k20"
 *
 * dnd5e applies exhaustion penalty (-2 × level) to all d20 rolls including
 * death saves. We strip the @exhaustion part to make it a flat d20 vs 10.
 *
 * @param {object} config - Roll configuration (has .rolls array)
 * @param {object} dialog - Dialog configuration
 * @param {object} message - Message configuration
 */
function onPreRollDeathSave(config, dialog, message) {
  // Strip exhaustion penalty from each roll's parts
  if (config.rolls) {
    for (const roll of config.rolls) {
      if (roll.parts) {
        const idx = roll.parts.indexOf("@exhaustion");
        if (idx !== -1) {
          roll.parts.splice(idx, 1);
          delete roll.data?.exhaustion;
        }
      }
    }
  }
}

/**
 * Apply one level of Zranienie to an actor.
 * @param {Actor} actor - The actor to wound
 * @param {string} reason - Description of what caused the wound
 */
export async function applyZranienie(actor, reason = "") {
  const current = actor.getFlag(MODULE_ID, "zranienie")?.level ?? 0;
  const newLevel = current + 1;

  if (newLevel > 4) {
    // Death — next wound after Krytyczny
    await ChatMessage.create({
      content: `<strong>${actor.name}</strong> otrzymuje kolejny Stopień Zranienia ponad Krytyczny — <strong>ŚMIERĆ</strong>. ${reason ? `(${reason})` : ""}`,
      speaker: ChatMessage.getSpeaker({ actor })
    });
    return;
  }

  // Update flag
  await actor.setFlag(MODULE_ID, "zranienie", { level: newLevel });

  const levelInfo = ZRANIENIE_LEVELS[newLevel];

  // Apply/update Active Effect for mechanical penalties
  await _syncZranieniEffect(actor, newLevel);

  // Chat message
  const penalties = _buildZranieniDescription(newLevel);
  await ChatMessage.create({
    content: `<strong>${actor.name}</strong> otrzymuje Stopień Zranienia: <strong>${levelInfo.label}</strong> (poziom ${newLevel}/4). ${reason ? `(${reason})` : ""}<br>Kary: ${penalties || "brak"}.`,
    speaker: ChatMessage.getSpeaker({ actor })
  });

  // Auto-apply exhaustion at Krytyczny level
  if (levelInfo.exhaustion) {
    await addExhaustion(actor, "zranienie", { chat: false });
  }
}

/**
 * Get the current Zranienie level for an actor.
 * @param {Actor} actor
 * @returns {number} 0-4
 */
export function getZranienieLvl(actor) {
  return actor.getFlag(MODULE_ID, "zranienie")?.level ?? 0;
}

/**
 * Set Zranienie level directly (for GM use / recovery).
 * @param {Actor} actor
 * @param {number} level 0-4
 */
export async function setZranienie(actor, level) {
  const clamped = Math.max(0, Math.min(4, level));
  await actor.setFlag(MODULE_ID, "zranienie", { level: clamped });
  await _syncZranieniEffect(actor, clamped);
}

/* -------------------------------------------- */
/*  Active Effect Management                     */
/* -------------------------------------------- */

const ZRANIENIE_ICON = "systems/dnd5e/icons/svg/statuses/bleeding.svg";

/**
 * Build the description text for a given wound level.
 * @param {number} level 1-4
 * @returns {string}
 */
function _buildZranieniDescription(level) {
  const info = ZRANIENIE_LEVELS[level];
  if (!info) return "";
  const parts = [];
  if (info.speedPenalty) parts.push(`Szybkość -${info.speedPenalty} m`);
  if (info.noReaction) parts.push("brak Reakcji");
  if (info.noBonusAction) parts.push("brak Akcji dodatkowej");
  if (info.exhaustion) parts.push("+1 Wyczerpanie (jednorazowo)");
  return parts.join(", ");
}

/**
 * Create, update, or remove the Zranienie Active Effect on an actor
 * to match the given wound level.
 * 
 * @param {Actor} actor
 * @param {number} level 0-4 (0 = remove effect)
 */
async function _syncZranieniEffect(actor, level) {
  const existing = actor.effects.find(e => e.getFlag(MODULE_ID, "zranieniEffect"));

  if (level <= 0) {
    // Remove effect if wound is healed
    if (existing) await existing.delete();
    return;
  }

  const info = ZRANIENIE_LEVELS[level];
  if (!info) return;

  // Build AE changes — speed penalty applied to all movement types
  const changes = [];
  if (info.speedPenalty) {
    for (const moveType of ["walk", "fly", "swim", "climb", "burrow"]) {
      changes.push({
        key: `system.attributes.movement.${moveType}`,
        mode: CONST.ACTIVE_EFFECT_MODES.ADD,
        value: String(-info.speedPenalty),
        priority: 20
      });
    }
  }

  const effectData = {
    name: `Zranienie: ${info.label}`,
    img: ZRANIENIE_ICON,
    changes,
    description: _buildZranieniDescription(level),
    flags: {
      [MODULE_ID]: { zranieniEffect: true }
    }
  };

  if (existing) {
    await existing.update(effectData);
  } else {
    await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
  }
}

/* -------------------------------------------- */
/*  0 HP Conditions — Unconscious + Prone        */
/* -------------------------------------------- */

/**
 * Apply Unconscious and Prone conditions when HP drops to 0.
 *
 * Per Neuroshima rules: "padasz na ziemię i otrzymujesz stan Nieprzytomność.
 * Stan ten trwa do momentu odzyskania przynajmniej jednego Punktu Wytrzymałości."
 *
 * Uses Actor5e.toggleStatusEffect which is the clean API for status conditions.
 * try/catch guards against duplicate-ID errors if the hook fires more than once.
 */
const _applyingConditions = new Set();
async function _applyZeroHPConditions(actor) {
  if (!actor?.id) return;
  if (typeof actor.toggleStatusEffect !== "function") return;
  // Guard against double-invocation (e.g. if updateActor fires twice)
  if (_applyingConditions.has(actor.id)) return;
  _applyingConditions.add(actor.id);
  try {
    for (const status of ["unconscious"]) {
      const already = actor.effects.some(e => e.statuses?.has(status));
      if (!already) {
        await actor.toggleStatusEffect(status, { active: true });
        // Note: dnd5e auto-applies "prone" as a rider of "unconscious"
      }
    }
  } finally {
    _applyingConditions.delete(actor.id);
  }
}

/* -------------------------------------------- */
/*  Sheet Display — Wound Level Indicator        */
/* -------------------------------------------- */

/**
 * Build the 4-pip wound indicator row (pips container + "ZRANIENIE" label).
 * Shared between character sheet and NPC sheet injection.
 * @param {Actor} actor
 * @returns {HTMLElement}
 */
function _buildZranieniRow(actor) {
  const level = actor.getFlag(MODULE_ID, "zranienie")?.level ?? 0;
  const isOwner = actor.isOwner;

  const row = document.createElement("div");
  row.classList.add("neuro-zranienie-row");
  Object.assign(row.style, {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "2px",
    padding: "0",
    margin: "0"
  });

  // Pips container
  const pipsContainer = document.createElement("div");
  Object.assign(pipsContainer.style, {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "5px"
  });

  // 4 pips — matching exhaustion pip size (16px) with red theme
  for (let n = 1; n <= 4; n++) {
    const pip = document.createElement("div");
    pip.classList.add("zranienie-pip");
    const isFilled = n <= level;
    const isDeath = n === 4;
    if (isFilled) pip.classList.add("filled");
    if (isDeath) pip.classList.add("death");
    const lvlInfo = ZRANIENIE_LEVELS[n];
    pip.setAttribute("data-tooltip", `${lvlInfo.label} (${n}/4)`);
    pip.setAttribute("data-n", n);

    // Colors — bright enough to see on dark background
    const borderColor = isDeath ? "#e74c3c" : "#c0392b";
    const bgColor = isFilled
      ? (isDeath ? "#e74c3c" : "#c0392b")
      : "rgba(192, 57, 43, 0.15)";
    const shadow = isFilled
      ? `0 0 6px ${isDeath ? "rgba(231,76,60,0.7)" : "rgba(192,57,43,0.5)"}`
      : `0 0 4px rgba(0,0,0,0.3)`;

    Object.assign(pip.style, {
      width: "16px",
      height: "16px",
      minWidth: "16px",
      minHeight: "16px",
      borderRadius: "50%",
      border: `2px solid ${borderColor}`,
      background: bgColor,
      padding: "0",
      margin: "0",
      boxSizing: "border-box",
      display: "block",
      flexShrink: "0",
      cursor: isOwner ? "pointer" : "default",
      boxShadow: shadow,
      transition: "all 0.2s ease"
    });

    if (isOwner) {
      pip.addEventListener("click", async (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const clickedN = Number(ev.currentTarget.dataset.n);
        const newLevel = (clickedN <= level) ? clickedN - 1 : clickedN;
        await setZranienie(actor, newLevel);
      });
    }

    pipsContainer.appendChild(pip);
  }

  row.appendChild(pipsContainer);

  // "ZRANIENIE" label
  const zranieniLabel = document.createElement("div");
  zranieniLabel.classList.add("neuro-zranienie-label");
  Object.assign(zranieniLabel.style, {
    fontSize: "9px",
    color: "#c0392b",
    textTransform: "uppercase",
    letterSpacing: "1px",
    fontFamily: "var(--dnd5e-font-roboto-condensed, 'Roboto Condensed', sans-serif)",
    fontWeight: "bold",
    lineHeight: "12px",
    position: "relative",
    zIndex: "1"
  });
  zranieniLabel.textContent = "Zranienie";
  row.appendChild(zranieniLabel);

  return row;
}

/**
 * Build the "WYCZERPANIE" section label.
 * Used only on the character sheet to label the exhaustion pips above the wound row.
 * @returns {HTMLElement}
 */
function _buildExhaustionSectionLabel() {
  const div = document.createElement("div");
  div.classList.add("neuro-exhaustion-label");
  Object.assign(div.style, {
    textAlign: "center",
    fontSize: "9px",
    color: "var(--dnd5e-color-gold, #c9a96e)",
    textTransform: "uppercase",
    letterSpacing: "1px",
    fontFamily: "var(--dnd5e-font-roboto-condensed, 'Roboto Condensed', sans-serif)",
    fontWeight: "bold",
    lineHeight: "12px",
    margin: "0 0 5px 0",
    padding: "0"
  });
  div.textContent = "Wyczerpanie";
  return div;
}

/**
 * Inject the wound indicator into the character sheet sidebar.
 * Placed between the exhaustion pips row and the lozenges (init/speed/prof).
 * @param {HTMLElement} el - Sheet root element
 * @param {Actor} actor
 */
function _injectIntoCharacterSheet(el, actor) {
  const statsDiv = el.querySelector(".sidebar .stats");
  if (!statsDiv) return;
  const lozenges = statsDiv.querySelector(".lozenges");
  if (!lozenges) return;

  // Remove existing indicators (re-render safe)
  statsDiv.querySelector(".neuro-zranienie-row")?.remove();
  statsDiv.querySelector(".neuro-exhaustion-label")?.remove();

  statsDiv.insertBefore(_buildExhaustionSectionLabel(), lozenges);

  const row = _buildZranieniRow(actor);
  // Overlap the label into the lozenges whitespace below
  row.querySelector(".neuro-zranienie-label").style.marginBottom = "-10px";
  statsDiv.insertBefore(row, lozenges);

  // Pull lozenges up to close the gap
  lozenges.style.marginTop = "-12px";
}

/**
 * Inject the wound indicator into the NPC sheet.
 * Placed in the header's portrait column, directly below the AC+HP vitals bar.
 * This keeps it visually grouped with the portrait rather than the trait pills.
 * Falls back to top of sidebar if the header structure is missing.
 * @param {HTMLElement} el - Sheet root element
 * @param {Actor} actor
 */
function _injectIntoNPCSheet(el, actor) {
  // Clean up any previous injection in either location
  el.querySelector(".sheet-header .left .neuro-zranienie-row")?.remove();
  el.querySelector(".sidebar .neuro-zranienie-row")?.remove();

  const row = _buildZranieniRow(actor);

  const headerLeft = el.querySelector(".sheet-header .left");
  const vitals = headerLeft?.querySelector(".vitals");

  if (headerLeft && vitals) {
    // Insert directly after the AC+HP bar — header flexes to accommodate
    Object.assign(row.style, { margin: "4px 0 0 0", padding: "0" });
    vitals.after(row);
    return;
  }

  // Fallback: top of sidebar
  const sidebar = el.querySelector(".sidebar");
  if (!sidebar) return;
  Object.assign(row.style, { margin: "4px 0 8px 0" });
  sidebar.insertBefore(row, sidebar.firstChild);
}

/**
 * Hook: renderCharacterActorSheet — inject wound indicator into character sheets.
 */
function onRenderCharacterSheet(app, html, context) {
  const actor = app.document ?? app.actor;
  if (!actor) return;
  const el = html instanceof HTMLElement ? html : html?.[0];
  if (!el) return;
  _injectIntoCharacterSheet(el, actor);
}

/**
 * Hook: renderNPCActorSheet — inject wound indicator into NPC sheets.
 */
function onRenderNPCSheet(app, html, context) {
  const actor = app.document ?? app.actor;
  if (!actor) return;
  const el = html instanceof HTMLElement ? html : html?.[0];
  if (!el) return;
  _injectIntoNPCSheet(el, actor);
}
