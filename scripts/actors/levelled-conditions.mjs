/**
 * Neuroshima 5e — enforcement for Upojenie and Skażenie radioaktywne.
 *
 * These are the two Neuroshima stany with a level track that dnd5e has no
 * equivalent for. dnd5e *does* have levelled-condition machinery, but it is keyed
 * to the literal id `exhaustion` and to `system.attributes.exhaustion`
 * (`active-effect.mjs` → `_prepareExhaustionLevel`, `_manageExhaustion`), so none of
 * it is reusable. This file supplies the missing parts:
 *
 *  1. **Level storage** — `flags.<module>.upojenie` / `.skazenie`, a plain integer
 *     0–4. Everything else derives from it, so there is exactly one place a level
 *     can change and one hook needed to react.
 *  2. **Active Effects** — one per condition, rebuilt from the level. Same contract
 *     as `disease-effects.mjs`: real, visible, module-owned effects (flagged
 *     `levelledCondition`), never touching anything added by hand.
 *  3. **Token HUD cycling** — left-click raises, right-click lowers, mirroring how
 *     Wyczerpanie behaves. Registered the same way dnd5e registers its own
 *     (capture-phase document listeners keyed off `data-status-id`).
 *  4. **The saves the tables exist for** — `drink()` and `radiationSave()`.
 *
 * ## Deliberately not automated
 * The *triggers* are left to the table: nothing here watches the clock for the
 * four-hour Kac step or the hourly radiation tick, and nothing tags a scene as
 * contaminated. Those are time-and-place rulings the GM makes; this layer supplies
 * the buttons and does the arithmetic once a ruling is made.
 */

import { LEVELLED_CONDITIONS, UPOJENIE_LEVELS, SKAZENIE_LEVELS,
  UPOJENIE_DRINK_DC, UPOJENIE_SOBER_DC, SKAZENIE_DISEASE_THRESHOLD } from "../config/levelled-conditions-data.mjs";
import { addExhaustion } from "../config/exhaustion.mjs";
import { seqScrollText } from "../weapons/sequencer.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const EFFECT_FLAG = "levelledCondition";
/** Failed radiation saves so far, toward choroba popromienna. */
const RAD_FAILURES_FLAG = "skazenieFailures";

/* -------------------------------------------- */
/*  Registration                                 */
/* -------------------------------------------- */

export function registerLevelledConditions() {
  // The two conditions this file owns outright. Zranienie adds itself from
  // `combat/zranienie.mjs`; registration order does not matter, because the HUD
  // hooks read the map at render time, not at registration time.
  for (const [id, def] of Object.entries(LEVELLED_CONDITIONS)) {
    registerHudLevelled(id, {
      label: def.label,
      max: def.max,
      get: actor => getLevel(actor, id),
      set: (actor, level) => setLevel(actor, id, level)
    });
  }

  // One hook covers every path that can move a level: HUD click, API, macro.
  // Clearing a level deletes the flag rather than writing 0, and Foundry spells a
  // deletion `-=key` — matching only the bare key would leave the effect behind
  // on exactly the transition that is supposed to remove it.
  Hooks.on("updateActor", (actor, changed) => {
    const flags = foundry.utils.getProperty(changed, `flags.${MODULE_ID}`) ?? {};
    const touched = Object.keys(LEVELLED_CONDITIONS)
      .some(id => (flags[id] !== undefined) || (flags[`-=${id}`] !== undefined));
    if (!touched) return;
    if (!actor.isOwner) return;
    syncLevelledConditions(actor);
  });

  // Backfill, for the same reasons as diseases: sheets that predate this layer,
  // and edits to the level tables that need to reach actors nobody will open.
  // The sync is a no-op when nothing differs.
  Hooks.once("ready", () => {
    if (!game.user.isGM) return;
    for (const actor of game.actors) {
      if (!Object.keys(LEVELLED_CONDITIONS).some(id => getLevel(actor, id) > 0)) continue;
      syncLevelledConditions(actor);
    }
  });

  // Attack-roll disadvantage — dnd5e has no `attack.roll.mode` field, so it has to
  // ride the roll config, same as diseases and weapon addons.
  Hooks.on("dnd5e.postBuildAttackRollConfig", _onPostBuildAttackRollConfig);

  // Level cycling in the token HUD. dnd5e does this with capture-phase document
  // listeners rather than a render hook, because the HUD re-renders on every
  // toggle; matching that means one registration instead of a rebind per render.
  document.addEventListener("click", _onClickTokenHUD, { capture: true });
  document.addEventListener("contextmenu", _onClickTokenHUD, { capture: true });

  // Show the current level on the HUD badge. dnd5e does the equivalent for
  // Wyczerpanie by swapping in a numbered `exhaustion-N.svg`; a text overlay gets
  // the same information across without eight more icon files to keep in sync.
  Hooks.on("renderTokenHUD", _onRenderTokenHUD);

  console.log(`${MODULE_ID} | Stany stopniowane zarejestrowane (Upojenie, Skażenie)`);
}

/* -------------------------------------------- */
/*  HUD registry                                 */
/* -------------------------------------------- */

/**
 * Conditions that cycle by level in the token HUD.
 *
 * Upojenie and Skażenie register themselves from `LEVELLED_CONDITIONS` below.
 * **Stopień Zranienia registers from `combat/zranienie.mjs`** — it owns its own
 * store, penalties and pips, and long predates this file. Inverting the dependency
 * this way keeps that ownership intact: this layer supplies the HUD gesture and the
 * badge, and never learns how wounds work.
 *
 * `get`/`set` are the owner's accessors, so a HUD click and a pip click are the same
 * write against the same store — which is the whole point. Nothing here caches a
 * level; every read goes back to the owner.
 *
 * @type {Map<string, {label: string, max: number, get: (a: Actor) => number, set: (a: Actor, n: number) => Promise<any>}>}
 */
const HUD_CYCLE = new Map();

/**
 * Register a levelled condition for token-HUD cycling and level badging.
 * @param {string} id  Status id, as registered in `CONFIG.DND5E.conditionTypes`.
 * @param {object} spec
 * @param {string} spec.label
 * @param {number} spec.max
 * @param {(actor: Actor) => number} spec.get
 * @param {(actor: Actor, level: number) => Promise<any>} spec.set
 */
export function registerHudLevelled(id, { label, max, get, set }) {
  HUD_CYCLE.set(id, { label, max, get, set });
}

/* -------------------------------------------- */
/*  Level accessors                              */
/* -------------------------------------------- */

/**
 * Current level of a levelled condition.
 * @param {Actor} actor
 * @param {string} id  Key in LEVELLED_CONDITIONS.
 * @returns {number} 0 when absent.
 */
export function getLevel(actor, id) {
  const raw = actor?.getFlag(MODULE_ID, id);
  return Number.isFinite(raw) ? Math.clamp(raw, 0, LEVELLED_CONDITIONS[id]?.max ?? 4) : 0;
}

/**
 * Set a levelled condition outright. Clamped to the condition's max; writing 0
 * deletes the flag so actors do not accumulate zeroed keys.
 * @param {Actor} actor
 * @param {string} id
 * @param {number} level
 * @param {object} [options]
 * @param {boolean} [options.chat=true]  Post a chat message describing the change.
 * @returns {Promise<number>} The level actually stored.
 */
export async function setLevel(actor, id, level, { chat = true } = {}) {
  const def = LEVELLED_CONDITIONS[id];
  if (!actor || !def) return 0;

  const previous = getLevel(actor, id);
  const next = Math.clamp(Math.round(level), 0, def.max);
  if (next === previous) return previous;

  await actor.update(next > 0
    ? { [`flags.${MODULE_ID}.${id}`]: next }
    : { [`flags.${MODULE_ID}.-=${id}`]: null });

  if (chat) {
    const verb = next > previous ? "otrzymuje" : "traci";
    const detail = next > 0 ? ` — stopień ${next}/${def.max}` : " — stan ustępuje";
    await ChatMessage.create({
      content: `<strong>${actor.name}</strong> ${verb} <em>${def.label}</em>${detail}.`,
      speaker: ChatMessage.getSpeaker({ actor })
    });
  }

  if (next > previous) {
    seqScrollText(def.label.toUpperCase(), actor, {
      color: id === "upojenie" ? "#c88a2e" : "#7ac943", fontSize: 26, duration: 1800
    });
  }
  return next;
}

/**
 * Move a levelled condition by a delta. The common case for HUD clicks and for the
 * Kac / exposure rules, both of which step by one.
 * @returns {Promise<number>} The new level.
 */
export async function adjustLevel(actor, id, delta, options = {}) {
  return setLevel(actor, id, getLevel(actor, id) + delta, options);
}

/* -------------------------------------------- */
/*  Active Effect sync                           */
/* -------------------------------------------- */

/**
 * Active Effect data for a condition at its current level, or null when the level
 * carries nothing an effect can express (Skażenie never does — it is a marker whose
 * consequences arrive as Wyczerpanie).
 */
function _buildEffect(id, level) {
  const def = LEVELLED_CONDITIONS[id];
  if (!def || level <= 0) return null;

  // Upojenie is cumulative — stopień 3 also carries 1 and 2. Skażenie is not.
  const rows = def.cumulative
    ? def.levels.filter(r => r.level <= level)
    : def.levels.filter(r => r.level === level);

  const changes = rows.flatMap(r => (r.changes ?? []).map(c => ({ ...c })));
  const statuses = rows.flatMap(r => r.statuses ?? []);
  if (!changes.length && !statuses.length) return null;

  const text = rows.map(r => `<p><strong>Stopień ${r.level}.</strong> ${r.text}</p>`).join("");
  const manual = rows.filter(r => r.manual).map(r => r.manual);

  return {
    name: `${def.label} ${level}`,
    img: `modules/${MODULE_ID}/icons/statuses/${id}.svg`,
    changes,
    statuses: [...new Set(statuses)],
    disabled: false,
    transfer: false,
    description: text + (manual.length
      ? `<hr><p><em>Poza automatyką:</em> ${manual.join(" ")}</p>`
      : ""),
    flags: { [MODULE_ID]: { [EFFECT_FLAG]: { id, level } } }
  };
}

/**
 * Reconcile an actor's module-owned levelled-condition effects with their current
 * levels: create what is missing, update what drifted, delete what no longer holds.
 * @param {Actor} actor
 */
export async function syncLevelledConditions(actor) {
  if (!actor) return;

  const wanted = new Map();
  for (const id of Object.keys(LEVELLED_CONDITIONS)) {
    const data = _buildEffect(id, getLevel(actor, id));
    if (data) wanted.set(id, data);
  }

  const toDelete = [];
  const toUpdate = [];
  for (const effect of actor.effects.filter(e => e.getFlag(MODULE_ID, EFFECT_FLAG))) {
    const { id } = effect.getFlag(MODULE_ID, EFFECT_FLAG);
    const target = wanted.get(id);
    if (!target) { toDelete.push(effect.id); continue; }
    wanted.delete(id);

    // Only write on a real difference — this runs on every level change, and a
    // pointless update re-renders every open sheet.
    const current = effect.toObject();
    const differs = current.name !== target.name
      || JSON.stringify(current.changes) !== JSON.stringify(target.changes)
      || JSON.stringify([...(current.statuses ?? [])].sort()) !== JSON.stringify([...target.statuses].sort());
    if (differs) toUpdate.push({ _id: effect.id, ...target });
  }

  if (toDelete.length) await actor.deleteEmbeddedDocuments("ActiveEffect", toDelete);
  if (toUpdate.length) await actor.updateEmbeddedDocuments("ActiveEffect", toUpdate);
  if (wanted.size) await actor.createEmbeddedDocuments("ActiveEffect", [...wanted.values()]);
}

/* -------------------------------------------- */
/*  Attack rolls                                 */
/* -------------------------------------------- */

/**
 * Hook: `dnd5e.postBuildAttackRollConfig`.
 *
 * Only Upojenie stopień 3 reaches attacks ("Utrudnienie do wszystkich testów").
 * Writes `advantageMode` directly rather than `options.disadvantage`, because
 * `applyKeybindings` has already resolved that boolean by the time this hook runs —
 * see the header of `actors/disease-effects.mjs`.
 */
function _onPostBuildAttackRollConfig(process, config) {
  const activity = process?.subject;
  const actor = activity?.actor ?? activity?.item?.actor;
  if (!actor) return;

  const reasons = [];
  for (const [id, def] of Object.entries(LEVELLED_CONDITIONS)) {
    const level = getLevel(actor, id);
    if (!level) continue;
    const rows = def.cumulative ? def.levels.filter(r => r.level <= level) : def.levels.filter(r => r.level === level);
    if (rows.some(r => r.attack === "all")) reasons.push(`${def.label} ${level}`);
  }
  if (!reasons.length) return;

  const ADV = CONFIG.Dice.D20Roll.ADV_MODE;
  config.options ??= {};
  config.options.advantageMode = config.options.advantageMode === ADV.ADVANTAGE
    ? ADV.NORMAL        // advantage and disadvantage cancel, as 5e stacks them
    : ADV.DISADVANTAGE;
  config.options.neuroLevelledPenalty = reasons;
}

/* -------------------------------------------- */
/*  Token HUD level cycling                      */
/* -------------------------------------------- */

/**
 * Left-click raises a levelled condition, right-click lowers it — the same gesture
 * Wyczerpanie already uses, so the two behave alike in the HUD.
 * @param {PointerEvent} event
 */
function _onClickTokenHUD(event) {
  const target = event.target;
  if (!target?.classList?.contains("effect-control")) return;

  const id = target.dataset?.statusId;
  const spec = HUD_CYCLE.get(id);
  if (!spec) return;

  const actor = canvas.hud.token?.object?.actor;
  if (!actor) return;

  // Stop the default toggle: left-clicking a status normally flips it on or off,
  // which for a levelled condition would jump straight between 0 and 1 and skip
  // whatever the owner does on the way (chat, riders, auto-Wyczerpanie).
  event.preventDefault();
  event.stopPropagation();

  const level = spec.get(actor);
  spec.set(actor, Math.clamp(level + (event.button === 0 ? 1 : -1), 0, spec.max));
}

/**
 * Stamp the current level onto the HUD icon, and spell it out in the tooltip so the
 * number is not the only cue.
 *
 * The badge cannot be a child of the icon: Foundry builds each status control as a
 * bare `<img class="effect-control">`, and `<img>` is a void element — appending to
 * it is accepted by the DOM and then never rendered. So the badge goes into the
 * palette instead (which is `position: absolute`, and therefore both the containing
 * block and the icons' `offsetParent`) and is positioned over its icon.
 *
 * Position has to be measured, and at render time the palette is still collapsed,
 * so every offset would read 0. A ResizeObserver re-runs the placement when the
 * palette is actually laid out, which is also what keeps the badge correct if the
 * HUD is rescaled.
 *
 * @param {Application} hud
 * @param {HTMLElement|jQuery} html
 */
function _onRenderTokenHUD(hud, html) {
  const actor = hud.object?.actor;
  if (!actor) return;

  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;

  const wanted = [];
  for (const [id, spec] of HUD_CYCLE) {
    const control = root.querySelector(`[data-status-id="${id}"]`);
    if (!control) continue;

    const level = spec.get(actor);
    control.setAttribute("data-tooltip", level ? `${spec.label} ${level}/${spec.max}` : spec.label);
    if (level) wanted.push({ control, level });
  }

  const palette = wanted[0]?.control?.parentElement;
  // Stale badges from the previous render of this same element.
  root.querySelectorAll(".neuro-condition-level").forEach(b => b.remove());
  if (!palette) return;

  const badges = wanted.map(({ control, level }) => {
    const badge = document.createElement("span");
    badge.className = "neuro-condition-level";
    badge.textContent = String(level);
    palette.append(badge);
    return { badge, control };
  });

  const place = () => {
    for (const { badge, control } of badges) {
      if (!control.offsetWidth) continue;   // palette still collapsed
      badge.style.left = `${control.offsetLeft + control.offsetWidth - 10}px`;
      badge.style.top = `${control.offsetTop + control.offsetHeight - 10}px`;
      badge.style.visibility = "visible";
    }
  };
  place();
  new ResizeObserver(place).observe(palette);
}

/* -------------------------------------------- */
/*  Upojenie — the drink and the hangover        */
/* -------------------------------------------- */

/**
 * Wypij porcję — 100 ml mocnego lub 500 ml słabego alkoholu. RO na Kondycję o ST 15;
 * porażka to jeden stopień Upojenia.
 * @param {Actor} actor
 * @returns {Promise<{roll: Roll, success: boolean, level: number}|null>}
 */
async function drink(actor) {
  if (!actor) return null;

  const roll = await actor.rollSavingThrow(
    { ability: "con", target: UPOJENIE_DRINK_DC },
    { configure: false }
  );
  const result = Array.isArray(roll) ? roll[0] : roll;
  if (!result) return null;

  const success = result.total >= UPOJENIE_DRINK_DC;
  const level = success ? getLevel(actor, "upojenie") : await adjustLevel(actor, "upojenie", 1);

  await ChatMessage.create({
    content: success
      ? `<strong>${actor.name}</strong> wypija porcję i trzyma się na nogach.`
      : `<strong>${actor.name}</strong> wypija porcję — <em>Upojenie ${level}</em>.`,
    speaker: ChatMessage.getSpeaker({ actor })
  });
  return { roll: result, success, level };
}

/**
 * Kac — cztery godziny bez alkoholu obniżają stopień o 1. Przy każdym obniżeniu
 * RO na Kondycję o ST 10; porażka oznacza poziom Wyczerpania.
 *
 * Called once per four-hour block by the GM; nothing here watches the clock.
 * @param {Actor} actor
 * @returns {Promise<{success: boolean, level: number}|null>}
 */
async function soberUp(actor) {
  const current = getLevel(actor, "upojenie");
  if (!actor || current <= 0) return null;

  const roll = await actor.rollSavingThrow(
    { ability: "con", target: UPOJENIE_SOBER_DC },
    { configure: false }
  );
  const result = Array.isArray(roll) ? roll[0] : roll;
  const success = (result?.total ?? 0) >= UPOJENIE_SOBER_DC;

  const level = await adjustLevel(actor, "upojenie", -1, { chat: false });
  if (!success) await addExhaustion(actor, LEVELLED_CONDITIONS.upojenie.exhaustionSource);

  await ChatMessage.create({
    content: `<strong>${actor.name}</strong> trzeźwieje — <em>Upojenie ${level}</em>.`
      + (success ? "" : " Kac zbiera żniwo: <strong>+1 Wyczerpanie</strong>."),
    speaker: ChatMessage.getSpeaker({ actor })
  });
  return { success, level };
}

/* -------------------------------------------- */
/*  Skażenie — the hourly save                   */
/* -------------------------------------------- */

/**
 * RO na Kondycję against the actor's current contamination level. Failure is a
 * level of Wyczerpanie; three failures give choroba popromienna.
 *
 * Per RAW the test repeats every hour until RadOff is taken — the repetition is the
 * GM's to call, so this rolls exactly once.
 * @param {Actor} actor
 * @returns {Promise<{success: boolean, failures: number}|null>}
 */
async function radiationSave(actor) {
  const level = getLevel(actor, "skazenie");
  if (!actor || level <= 0) return null;

  const band = SKAZENIE_LEVELS.find(l => l.level === level);
  const roll = await actor.rollSavingThrow(
    { ability: "con", target: band.dc },
    { configure: false }
  );
  const result = Array.isArray(roll) ? roll[0] : roll;
  const success = (result?.total ?? 0) >= band.dc;

  let failures = actor.getFlag(MODULE_ID, RAD_FAILURES_FLAG) ?? 0;
  if (!success) {
    failures += 1;
    await actor.setFlag(MODULE_ID, RAD_FAILURES_FLAG, failures);
    await addExhaustion(actor, LEVELLED_CONDITIONS.skazenie.exhaustionSource);
  }

  const warning = !success && failures >= SKAZENIE_DISEASE_THRESHOLD
    ? `<br><strong>Trzecia porażka — choroba popromienna.</strong> Dodaj ją na zakładce Biografia.`
    : !success ? `<br>Oblane RO: ${failures}/${SKAZENIE_DISEASE_THRESHOLD}.` : "";

  await ChatMessage.create({
    content: `<strong>${actor.name}</strong> — skażenie ${band.name.toLowerCase()} (ST ${band.dc}): `
      + (success ? "wytrzymuje." : "<em>+1 Wyczerpanie</em>.") + warning,
    speaker: ChatMessage.getSpeaker({ actor })
  });
  return { success, failures };
}

/**
 * RadOff clears the exposure and the failure count. Levels of Wyczerpanie already
 * taken stay — they are their own state, cleared through the normal rest rules.
 */
async function clearRadiation(actor) {
  if (!actor) return;
  await setLevel(actor, "skazenie", 0, { chat: false });
  await actor.update({ [`flags.${MODULE_ID}.-=${RAD_FAILURES_FLAG}`]: null });
  await ChatMessage.create({
    content: `<strong>${actor.name}</strong> przyjmuje RadOff — skażenie ustępuje.`,
    speaker: ChatMessage.getSpeaker({ actor })
  });
}

/* -------------------------------------------- */
/*  API                                          */
/* -------------------------------------------- */

/** Exposed as `game.neuroshima.conditions`. */
export const levelledConditionsApi = {
  get: getLevel,
  set: setLevel,
  adjust: adjustLevel,
  sync: syncLevelledConditions,
  drink,
  soberUp,
  radiationSave,
  clearRadiation,
  UPOJENIE_LEVELS,
  SKAZENIE_LEVELS
};
