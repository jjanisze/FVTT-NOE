/**
 * Neuroshima 5e — Wyczerpanie (Exhaustion) with source tracking.
 *
 * Neuroshima exhaustion rules:
 * - Stacks from 1 to 6 (same as dnd5e)
 * - Each level: -2 to every d20 test (dnd5e modern rules)
 * - Each level: -1.5 m speed (not -5 ft)
 * - Death at 6 levels
 * - Each level has a tracked SOURCE — you can't hydrate away a sleepless night.
 *
 * Data model (module flags on actor):
 *   flags.neuroshima-2026-overrides.exhaustionSources = [
 *     { source: "odwodnienie", label: "Odwodnienie", addedAt: timestamp },
 *     { source: "bezsennosc", label: "Bezsenność", addedAt: timestamp },
 *     ...
 *   ]
 *   Array length = actor's exhaustion level. Each entry = one level from a specific cause.
 *
 * Recovery: removing a level requires specifying which source is resolved.
 *   - Long rest auto-recovery is intercepted: only removes "ogolne" or "forsowanie".
 *   - Other sources require explicit GM action or specific remedies.
 */

const MODULE_ID = "neuroshima-2026-overrides";

import { seqScrollText } from "../weapons/sequencer.mjs";

/**
 * Known exhaustion sources with Polish labels and whether long rest auto-clears them.
 * `color` tints that level's pip in the Stan panel, so a glance at the track shows what
 * the character is actually suffering from.
 */
export const EXHAUSTION_SOURCES = {
  bezsennosc:   { label: "Bezsenno\u015b\u0107",            restClears: false, color: "#7f8cff" },
  kac:          { label: "Kac",                    restClears: true,  color: "#d9a441" },
  niedozywienie:{ label: "Niedo\u017cywienie",          restClears: false, color: "#b07d3a" },
  odwodnienie:  { label: "Odwodnienie",            restClears: false, color: "#2196f3" },
  przemarznie:  { label: "Przemarzni\u0119cie",         restClears: false, color: "#9fe8ff" },
  skazenie:     { label: "Ska\u017cenie radioaktywne",  restClears: false, color: "#7fff3f" },
  choroba:      { label: "Choroba",                restClears: false, color: "#a569bd" },
  zranienie:    { label: "Stopie\u0144 Zranienia",      restClears: false, color: "#c0392b" },
  uduszenie:    { label: "Uduszenie",              restClears: true,  color: "#5d6d7e" },
  forsowanie:   { label: "Forsowanie",             restClears: true,  color: "#ff8a3d" },
  ogolne:       { label: "Og\u00f3lne",                 restClears: true,  color: "#9aa0a6" }
};

/**
 * Register exhaustion CONFIG overrides and rest interception hook.
 */
export function registerExhaustion() {
  const exhaustion = CONFIG.DND5E.conditionTypes?.exhaustion;
  if (!exhaustion) {
    console.warn("Neuroshima 5e | conditionTypes.exhaustion not found, skipping override");
    return;
  }

  // Override speed reduction: 1.5 m per level instead of 5 ft
  exhaustion.reduction ??= {};
  exhaustion.reduction.speed = 1.5;
  // rolls: 2 stays the same (already matches Neuroshima's -2 per level)

  // Polish label
  exhaustion.name = "Wyczerpanie";

  // Intercept long rest exhaustion recovery
  Hooks.on("dnd5e.preRestCompleted", onPreRestCompleted);

  // Intercept manual exhaustion changes (sheet pip clicks) BEFORE they apply
  Hooks.on("preUpdateActor", onPreUpdateActor);

  // Source labels on the sheet are the Stan panel's job (actors/sheet-shell.mjs) — it reads
  // getExhaustionSources() directly. The native pips it used to annotate are now hidden.

  console.log("Neuroshima 5e | Exhaustion overrides applied (speed: -1.5 m/level, source tracking)");
}

/* -------------------------------------------- */
/*  Source-tracked API                           */
/* -------------------------------------------- */

/**
 * Get the current exhaustion sources array for an actor.
 * @param {Actor} actor
 * @returns {Array<{source: string, label: string, addedAt: number}>}
 */
export function getExhaustionSources(actor) {
  const raw = actor.getFlag(MODULE_ID, "exhaustionSources");
  return raw ? foundry.utils.deepClone(raw) : [];
}

/**
 * Add one level of exhaustion from a specific source.
 * Updates both the source array (flag) and the dnd5e exhaustion attribute.
 * @param {Actor} actor
 * @param {string} sourceKey - Key from EXHAUSTION_SOURCES
 * @param {object} [options]
 * @param {boolean} [options.chat=true] - Post a chat message
 * @returns {Promise<number>} New exhaustion level
 */
export async function addExhaustion(actor, sourceKey, { chat = true } = {}) {
  const currentLevel = actor.system.attributes?.exhaustion ?? 0;
  if (currentLevel >= 6) return currentLevel; // already dead

  const sourceDef = EXHAUSTION_SOURCES[sourceKey] ?? EXHAUSTION_SOURCES.ogolne;
  const label = sourceDef.label;

  // Deep-copy sources to avoid mutating the actor's in-memory flag data
  const sources = getExhaustionSources(actor);
  sources.push({
    source: sourceKey,
    label,
    addedAt: Date.now()
  });

  const newLevel = currentLevel + 1;

  // Update both flag and attribute — use _apiUpdate guard to skip preUpdateActor interception
  _apiUpdate = true;
  try {
    await actor.update({
      "system.attributes.exhaustion": newLevel,
      [`flags.${MODULE_ID}.exhaustionSources`]: sources
    });
  } finally {
    _apiUpdate = false;
  }

  if (chat) {
    const deathWarning = newLevel >= 6 ? " — <strong>ŚMIERĆ!</strong>" : "";
    await ChatMessage.create({
      content: `<strong>${actor.name}</strong> otrzymuje 1 poziom Wyczerpania z powodu: <em>${label}</em> (${newLevel}/6).${deathWarning}`,
      speaker: ChatMessage.getSpeaker({ actor })
    });
  }

  seqScrollText("WYCZERPANIE", actor, { color: "#3498db", fontSize: 26, duration: 1800 });
  return newLevel;
}

/**
 * Remove one level of exhaustion from a specific source.
 * @param {Actor} actor
 * @param {string} sourceKey - Which source to remove (removes oldest matching entry)
 * @param {object} [options]
 * @param {boolean} [options.chat=true] - Post a chat message
 * @returns {Promise<number>} New exhaustion level
 */
export async function removeExhaustion(actor, sourceKey, { chat = true } = {}) {
  const currentLevel = actor.system.attributes?.exhaustion ?? 0;
  if (currentLevel <= 0) return 0;

  const sources = getExhaustionSources(actor);
  const idx = sources.findIndex(s => s.source === sourceKey);
  if (idx === -1) {
    if (chat) {
      ui.notifications.warn(`${actor.name} nie ma Wyczerpania ze źródła: ${EXHAUSTION_SOURCES[sourceKey]?.label ?? sourceKey}`);
    }
    return currentLevel;
  }

  const removed = sources.splice(idx, 1)[0];
  const newLevel = Math.max(0, currentLevel - 1);

  // Build update — use Foundry's -=key deletion syntax when sources is empty,
  // because setting a flag to [] can be silently dropped by the diff algorithm.
  const updateData = { "system.attributes.exhaustion": newLevel };
  if (sources.length > 0) {
    updateData[`flags.${MODULE_ID}.exhaustionSources`] = sources;
  } else {
    updateData[`flags.${MODULE_ID}.-=exhaustionSources`] = null;
  }

  _apiUpdate = true;
  try {
    await actor.update(updateData);
  } finally {
    _apiUpdate = false;
  }

  if (chat) {
    await ChatMessage.create({
      content: `<strong>${actor.name}</strong> traci 1 poziom Wyczerpania — usunięto: <em>${removed.label}</em> (${newLevel}/6).`,
      speaker: ChatMessage.getSpeaker({ actor })
    });
  }

  return newLevel;
}

/**
 * Get a formatted summary of an actor's exhaustion sources.
 * @param {Actor} actor
 * @returns {string} e.g. "Forsowanie ×2, Odwodnienie ×1"
 */
export function formatExhaustionSources(actor) {
  const sources = getExhaustionSources(actor);
  if (!sources.length) return "Brak";

  // Count occurrences
  const counts = {};
  for (const s of sources) {
    counts[s.label] = (counts[s.label] ?? 0) + 1;
  }
  return Object.entries(counts)
    .map(([label, count]) => count > 1 ? `${label} ×${count}` : label)
    .join(", ");
}

/* -------------------------------------------- */
/*  Rest Recovery Interception                   */
/* -------------------------------------------- */

/**
 * Intercept dnd5e's pre-rest-completed to replace the blanket exhaustion
 * recovery with source-aware recovery.
 *
 * dnd5e sets `exhaustionDelta: -1` for long rests. We:
 * 1. Cancel the default exhaustion change (set delta to 0)
 * 2. Auto-remove one rest-clearable source if available
 * 3. Report which sources remain
 */
function onPreRestCompleted(actor, result) {
  const delta = result.exhaustionDelta ?? 0;
  if (delta >= 0) return; // Only intercept recovery (negative delta)

  // Cancel dnd5e's blanket recovery
  const path = "system.attributes.exhaustion";
  const currentLevel = foundry.utils.getProperty(result.clone, path) ?? 0;
  // Undo the delta that dnd5e already applied to updateData
  if (result.updateData?.[path] !== undefined) {
    result.updateData[path] = currentLevel; // keep current value
  }

  // Find a rest-clearable source and remove it
  const sources = getExhaustionSources(actor);
  const clearableIdx = sources.findIndex(s => {
    const def = EXHAUSTION_SOURCES[s.source];
    return def?.restClears === true;
  });

  if (clearableIdx !== -1) {
    const cleared = sources[clearableIdx];
    sources.splice(clearableIdx, 1);
    const newLevel = Math.max(0, currentLevel - 1);

    // Update the rest result to apply our change
    result.updateData[path] = newLevel;
    result.updateData[`flags.${MODULE_ID}.exhaustionSources`] = sources;

    // Add info to the rest chat message
    const remaining = sources.length
      ? sources.map(s => s.label).join(", ")
      : "brak";

    // Schedule a follow-up chat message (can't await in sync hook)
    setTimeout(() => {
      ChatMessage.create({
        content: `<strong>${actor.name}</strong> — Długi odpoczynek usuwa Wyczerpanie: <em>${cleared.label}</em>.<br>Pozostałe źródła: ${remaining}.`,
        speaker: ChatMessage.getSpeaker({ actor })
      });
    }, 500);
  } else if (sources.length > 0) {
    // Has exhaustion but nothing rest-clearable
    const remaining = sources.map(s => s.label).join(", ");
    setTimeout(() => {
      ChatMessage.create({
        content: `<strong>${actor.name}</strong> — Długi odpoczynek NIE usuwa Wyczerpania. Żadne ze źródeł nie ustępuje podczas odpoczynku.<br>Źródła: ${remaining}.`,
        speaker: ChatMessage.getSpeaker({ actor })
      });
    }, 500);
  }
}

/* -------------------------------------------- */
/*  Manual Change Interception (Sheet Clicks)    */
/* -------------------------------------------- */

// Guard flag — when true, our API is driving the update, don't intercept
let _apiUpdate = false;

/**
 * Intercept exhaustion changes BEFORE they apply.
 * If the change didn't come from our API, BLOCK it and show a dialog.
 * The dialog then uses the API to apply the change with proper source tracking.
 *
 * Returning false from preUpdateActor prevents the update entirely.
 */
function onPreUpdateActor(actor, changes, options, userId) {
  if (_apiUpdate) return true; // allow API-driven updates through
  if (game.userId !== userId) return true;

  const newExhaustion = foundry.utils.getProperty(changes, "system.attributes.exhaustion");
  if (newExhaustion === undefined) return true;

  // If our flags are also in the update, it came from our API (addExhaustion/removeExhaustion)
  const flagUpdate = foundry.utils.getProperty(changes, `flags.${MODULE_ID}.exhaustionSources`);
  if (flagUpdate !== undefined) return true;

  const currentLevel = actor.system.attributes?.exhaustion ?? 0;
  if (newExhaustion === currentLevel) return true; // no real change

  if (newExhaustion > currentLevel) {
    const levelsToAdd = newExhaustion - currentLevel;
    promptExhaustionSource(actor, levelsToAdd);
  } else {
    const levelsToRemove = currentLevel - newExhaustion;
    promptExhaustionRemoval(actor, levelsToRemove);
  }

  return false; // BLOCK the raw update — dialog will handle it via API
}

/**
 * Show dialog asking the GM/player to pick what caused the exhaustion.
 * The raw update was already blocked — dialog applies the change via API on confirm.
 * @param {Actor} actor
 * @param {number} count - How many levels to add
 */
async function promptExhaustionSource(actor, count) {
  const sourceOptions = Object.entries(EXHAUSTION_SOURCES)
    .map(([key, { label }]) => `<option value="${key}">${label}</option>`)
    .join("");

  const content = `
    <p><strong>${actor.name}</strong> — dodać ${count} ${count === 1 ? "poziom" : "poziomy"} Wyczerpania.</p>
    <p>Wybierz źródło dla każdego poziomu:</p>
    ${Array.from({ length: count }, (_, i) => `
      <div style="margin-bottom: 4px;">
        <label>Poziom ${i + 1}:</label>
        <select name="source-${i}" style="width: 100%;">${sourceOptions}</select>
      </div>
    `).join("")}
  `;

  new Dialog({
    title: "Źródło Wyczerpania",
    content,
    buttons: {
      confirm: {
        icon: '<i class="fas fa-check"></i>',
        label: "Zatwierdź",
        callback: async (html) => {
          // Collect all sources and apply in a single batched update
          // to avoid race conditions with sequential actor.update() calls
          const keys = [];
          for (let i = 0; i < count; i++) {
            keys.push(html.find(`[name="source-${i}"]`).val());
          }

          const currentLevel = actor.system.attributes?.exhaustion ?? 0;
          const sources = getExhaustionSources(actor);

          for (const key of keys) {
            const sourceDef = EXHAUSTION_SOURCES[key] ?? EXHAUSTION_SOURCES.ogolne;
            sources.push({ source: key, label: sourceDef.label, addedAt: Date.now() });
          }

          const newLevel = Math.min(6, currentLevel + keys.length);

          _apiUpdate = true;
          try {
            await actor.update({
              "system.attributes.exhaustion": newLevel,
              [`flags.${MODULE_ID}.exhaustionSources`]: sources
            });
          } finally {
            _apiUpdate = false;
          }

          // Chat messages
          for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            const sourceDef = EXHAUSTION_SOURCES[key] ?? EXHAUSTION_SOURCES.ogolne;
            const lvl = currentLevel + i + 1;
            const deathWarning = lvl >= 6 ? " — <strong>ŚMIERĆ!</strong>" : "";
            await ChatMessage.create({
              content: `<strong>${actor.name}</strong> otrzymuje 1 poziom Wyczerpania z powodu: <em>${sourceDef.label}</em> (${lvl}/6).${deathWarning}`,
              speaker: ChatMessage.getSpeaker({ actor })
            });
          }
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: "Anuluj"
        // Do nothing — the raw update was already blocked
      }
    },
    default: "confirm"
  }).render(true);
}

/**
 * Show dialog asking which exhaustion source was resolved.
 * The raw update was already blocked — dialog applies the change via API on confirm.
 * @param {Actor} actor
 * @param {number} count - How many levels to remove
 */
async function promptExhaustionRemoval(actor, count) {
  const sources = getExhaustionSources(actor);
  if (!sources.length) return;

  // Build checkboxes for each tracked source
  const sourceRows = sources.map((s, i) => `
    <div style="margin-bottom: 2px;">
      <label>
        <input type="checkbox" name="remove" value="${i}" ${i < count ? "checked" : ""}>
        ${s.label} <small style="color: #888;">(${new Date(s.addedAt).toLocaleDateString("pl-PL")})</small>
      </label>
    </div>
  `).join("");

  const content = `
    <p><strong>${actor.name}</strong> — usunąć ${count} ${count === 1 ? "poziom" : "poziomy"} Wyczerpania.</p>
    <p>Które źródła zostały rozwiązane? (zaznacz ${count}):</p>
    ${sourceRows}
  `;

  new Dialog({
    title: "Usunięcie Wyczerpania",
    content,
    buttons: {
      confirm: {
        icon: '<i class="fas fa-check"></i>',
        label: "Zatwierdź",
        callback: async (html) => {
          const checked = html.find('[name="remove"]:checked')
            .map((_, el) => Number(el.value))
            .get()
            .sort((a, b) => b - a); // reverse order so splice indices stay valid

          if (!checked.length) return;

          // Batch: remove all selected sources in one update
          const removedLabels = [];
          for (const idx of checked) {
            if (sources[idx]) {
              removedLabels.push(sources[idx].label);
              sources.splice(idx, 1);
            }
          }

          const currentLevel = actor.system.attributes?.exhaustion ?? 0;
          const newLevel = Math.max(0, currentLevel - removedLabels.length);

          const updateData = { "system.attributes.exhaustion": newLevel };
          if (sources.length > 0) {
            updateData[`flags.${MODULE_ID}.exhaustionSources`] = sources;
          } else {
            updateData[`flags.${MODULE_ID}.-=exhaustionSources`] = null;
          }

          _apiUpdate = true;
          try {
            await actor.update(updateData);
          } finally {
            _apiUpdate = false;
          }

          // Chat messages
          for (const label of removedLabels) {
            await ChatMessage.create({
              content: `<strong>${actor.name}</strong> traci 1 poziom Wyczerpania — usunięto: <em>${label}</em> (${Math.max(0, currentLevel - removedLabels.indexOf(label) - 1)}/6).`,
              speaker: ChatMessage.getSpeaker({ actor })
            });
          }
        }
      },
      cancel: {
        icon: '<i class="fas fa-times"></i>',
        label: "Anuluj"
        // Do nothing — the raw update was already blocked
      }
    },
    default: "confirm"
  }).render(true);
}
