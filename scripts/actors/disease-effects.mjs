/**
 * Neuroshima 5e — enforcement layer for disease stages.
 *
 * Turns the specs in `config/disease-effects.mjs` into things the table can see:
 *
 *  1. **Active Effects** — one per (disease entry, stage), plus a second one per
 *     active situational toggle. They are real, visible effects in the Efekty tab,
 *     not hidden roll-time maths: a player who has Utrudnienie deserves to be able
 *     to point at the reason.
 *  2. **Attack-roll disadvantage** — dnd5e has no `attack.roll.mode` field, so this
 *     rides `dnd5e.postBuildAttackRollConfig`, the same hook the weapon addons use.
 *  3. **Roll attribution** — a tag under any d20 the disease bent, naming it and the
 *     direction. Utrudnienie applied by an Active Effect is otherwise invisible at the
 *     table: the dialog just comes up pre-set and nobody remembers why. The Ułatwienie
 *     half, of course, everyone remembers.
 *  4. **Szał** — Szaleństwo bostońskie adds a button to eligible failed rolls.
 *     It never fires by itself; the GM decides whether to throw the coin.
 *
 * Effects are owned entirely by this module: everything it creates carries
 * `flags.<module>.diseaseEffect`, and a resync only ever touches its own. Effects
 * added by hand are never modified or deleted.
 *
 * ## Why advantageMode and not `options.disadvantage`
 * `BasicRoll.buildConfigure` calls `applyKeybindings` (which resolves
 * `options.disadvantage` into `options.advantageMode`) *before* it calls
 * `buildConfig` / the `postBuild…RollConfig` hooks. Setting the boolean at that
 * point is a silent no-op — the mode has already been decided. So this writes
 * `advantageMode` directly, and a pre-existing advantage cancels to normal rather
 * than being overwritten, matching how 5e stacks the two.
 */

import { effectsFor } from "../config/disease-effects.mjs";
import { getChoroby } from "./health-panel.mjs";
import { DISEASE_STAGES, NO_REST_FLAG, getDisease, diseaseStages, isBaselineChronic } from "../config/diseases-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const EFFECT_FLAG = "diseaseEffect";

/* -------------------------------------------- */
/*  Registration                                 */
/* -------------------------------------------- */

export function registerDiseaseEffects() {
  // A stage can only move by writing the flag — panel click, sunset routine,
  // migration and macros all funnel through it, so one hook covers every path.
  Hooks.on("updateActor", (actor, changed) => {
    if (foundry.utils.getProperty(changed, `flags.${MODULE_ID}.choroby`) === undefined) return;
    if (!actor.isOwner) return;
    syncDiseaseEffects(actor);
  });

  // Backfill on load. Characters that predate this layer have no effects yet,
  // and edits to `disease-effects.mjs` need to reach sheets that are not going
  // to be touched otherwise. The sync is a no-op when nothing differs, so this
  // is cheap and it never clobbers an effect a GM disabled by hand.
  Hooks.once("ready", () => {
    if (!game.user.isGM) return;
    for (const actor of game.actors) {
      if (actor.type !== "character") continue;
      if (!(actor.getFlag(MODULE_ID, "choroby") ?? []).length) continue;
      syncDiseaseEffects(actor);
    }
  });

  Hooks.on("dnd5e.postBuildAttackRollConfig", _onPostBuildAttackRollConfig);
  // Attribution before the szał button: both append to `.message-content`, and the
  // reason for the roll going badly should read above the consequence.
  Hooks.on("dnd5e.renderChatMessage", _onAnnotateRoll);
  // The listener is attached where the button is built: core's
  // `renderChatMessageHTML` fires *before* `dnd5e.renderChatMessage`, so a
  // separate binding hook would always run against a DOM without the button yet.
  Hooks.on("dnd5e.renderChatMessage", _onRenderRollMessage);

  // "Brak korzyści z Długiego i Krótkiego odpoczynku" — cancelling the rest outright
  // is the honest reading: dnd5e has no way to grant a rest that heals nothing, and a
  // rest that silently did nothing would be worse than one that says why.
  Hooks.on("dnd5e.preShortRest", _onPreRest);
  Hooks.on("dnd5e.preLongRest", _onPreRest);

  console.log("Neuroshima 5e | Disease effects registered");
}

/**
 * Block a rest the character's disease has taken away for the day.
 * @param {Actor} actor
 * @returns {boolean}  False cancels the rest.
 */
function _onPreRest(actor) {
  const denied = actor.getFlag(MODULE_ID, NO_REST_FLAG);
  if (denied !== game.settings.get(MODULE_ID, "dayCounter")) return true;
  ui.notifications.warn(`${actor.name}: choroba nie daje odpocząć — żadnych korzyści `
    + `z odpoczynku aż do następnego zachodu słońca.`);
  return false;
}

/** Exposed on `game.neuroshima.health.syncEffects` for macros / one-off repairs. */
export { syncDiseaseEffects };

/* -------------------------------------------- */
/*  Active Effect sync                           */
/* -------------------------------------------- */

/** Stable per-effect key, so a resync updates documents instead of churning them. */
function _effectKey(entry, conditional) {
  return `${entry.id}:${entry.stage ?? 0}${conditional ? ":cond" : ""}`;
}

/**
 * Active Effect data for one disease entry, or for its situational rider.
 * Znacznik `diseased` dostają tylko choroby nienormalne — popularne i przewlekłe podbite
 * do stopnia Ostry/Krytyczny. Przewlekła w stanie bazowym zostałaby na żetonie na zawsze,
 * a stan, którego nie da się zdjąć, niczego nie komunikuje (`isBaselineChronic`).
 * @returns {object|null} null when there is nothing an effect can carry.
 */
function _buildEffect(entry, spec, conditional) {
  const source = conditional ? spec.conditional : spec;
  const changes = source.changes ?? [];
  const marker = !conditional && !isBaselineChronic(entry) ? ["diseased"] : [];
  const statuses = [...marker, ...(source.statuses ?? [])];
  if (!changes.length && !statuses.length) return null;

  const stageLabel = DISEASE_STAGES[entry.stage ?? 0]?.label ?? "";
  const staged = diseaseStages(entry).length > 1;

  return {
    name: conditional
      ? `${entry.name} — ${source.label}`
      : `${entry.name}${staged && stageLabel ? ` — ${stageLabel}` : ""}`,
    img: "icons/svg/biohazard.svg",
    changes: changes.map(c => ({ ...c })),
    statuses: [...statuses],
    // FVTT v14: `isTemporary` liczy tylko czas trwania, a domyślne `CONDITIONAL`
    // znaczy „rysuj tylko, jeśli tymczasowy" — bez tego ikona nie wchodzi na żeton.
    // Choroba bazowa nie ma znacznika, więc nie ma też czego rysować: `showIcon`
    // filtruje się niezależnie od `statuses`, a sam efekt musi zostać — niesie mechanikę.
    showIcon: statuses.length
      ? CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS
      : CONST.ACTIVE_EFFECT_SHOW_ICON.NEVER,
    disabled: false,
    transfer: false,
    description: conditional
      ? `<p>Efekt sytuacyjny: ${source.label}.</p>`
      : `<p>${diseaseStages(entry)[entry.stage ?? 0] ?? ""}</p>`,
    flags: {
      [MODULE_ID]: {
        [EFFECT_FLAG]: { entryId: entry.id, key: _effectKey(entry, conditional), conditional }
      }
    }
  };
}

/**
 * Reconcile an actor's module-owned disease effects with their current entries:
 * create what is missing, update what drifted, delete what no longer applies.
 * @param {Actor} actor
 */
async function syncDiseaseEffects(actor) {
  if (!actor || actor.type !== "character") return;

  const wanted = new Map();
  for (const entry of getChoroby(actor)) {
    // Choroba bez mechaniki wciąż dostaje efekt — o ile ma choć znacznik na żetonie.
    const spec = effectsFor(entry) ?? {};

    const base = _buildEffect(entry, spec, false);
    if (base) wanted.set(_effectKey(entry, false), base);

    // The rider exists only while its toggle is on.
    if (spec.conditional && entry.conditionalOn) {
      const cond = _buildEffect(entry, spec, true);
      if (cond) wanted.set(_effectKey(entry, true), cond);
    }
  }

  const toDelete = [];
  const toUpdate = [];

  for (const effect of actor.effects.filter(e => e.getFlag(MODULE_ID, EFFECT_FLAG))) {
    const key = effect.getFlag(MODULE_ID, EFFECT_FLAG).key;
    const target = wanted.get(key);
    if (!target) { toDelete.push(effect.id); continue; }
    wanted.delete(key);

    // Only write when something actually differs: this resync runs on every
    // disease-flag change, and a pointless update re-renders every open sheet.
    const current = effect.toObject();
    const differs = current.name !== target.name
      || current.showIcon !== target.showIcon
      || JSON.stringify(current.changes) !== JSON.stringify(target.changes)
      || JSON.stringify([...(current.statuses ?? [])].sort())
         !== JSON.stringify([...target.statuses].sort());
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
 * Attack-roll disadvantage owed by an actor's diseases.
 * @param {Actor} actor
 * @param {string} ability  Ability the attack is keyed off.
 * @returns {string[]}      One reason per contributing disease.
 */
function _attackPenalties(actor, ability) {
  const reasons = [];
  for (const entry of getChoroby(actor)) {
    const spec = effectsFor(entry);
    if (!spec) continue;
    if (spec.attack === "all" || spec.attack === ability) {
      reasons.push(`${entry.name} (${DISEASE_STAGES[entry.stage ?? 0]?.label ?? ""})`);
    }
    if (entry.conditionalOn && spec.conditional
      && (spec.conditional.attack === "all" || spec.conditional.attack === ability)) {
      reasons.push(`${entry.name} — ${spec.conditional.label}`);
    }
  }
  return reasons;
}

/**
 * Hook: `dnd5e.postBuildAttackRollConfig(process, config, index)`.
 * @param {object} process  Roll process config; `subject` is the activity.
 * @param {object} config   Per-roll config (`parts`, `options`).
 */
function _onPostBuildAttackRollConfig(process, config) {
  const activity = process?.subject;
  const actor = activity?.actor ?? activity?.item?.actor;
  if (actor?.type !== "character") return;

  const ability = activity.ability || activity.item?.abilityMod || "str";
  const reasons = _attackPenalties(actor, ability);
  if (!reasons.length) return;

  const ADV = CONFIG.Dice.D20Roll.ADV_MODE;
  config.options ??= {};
  config.options.advantageMode = config.options.advantageMode === ADV.ADVANTAGE
    ? ADV.NORMAL        // a source of advantage and a source of disadvantage cancel
    : ADV.DISADVANTAGE;
  config.options.neuroDiseasePenalty = reasons;
}

/* -------------------------------------------- */
/*  Roll attribution                             */
/* -------------------------------------------- */

/**
 * Roll-mode fields a rolled d20 passed through, so a change targeting one of them
 * can be recognised after the fact.
 *
 * dnd5e stores only `skillId` for a skill check, never the ability actually used,
 * so a check rolled with a swapped ability is attributed to the skill's default.
 * @param {object} rollData  `message.flags.dnd5e.roll`
 * @returns {string[]}
 */
function _rollModeKeys(rollData) {
  switch (rollData.type) {
    case "skill": {
      const abl = CONFIG.DND5E.skills?.[rollData.skillId]?.ability;
      return [
        `system.skills.${rollData.skillId}.roll.mode`,
        ...(abl ? [`system.abilities.${abl}.check.roll.mode`] : [])
      ];
    }
    case "tool": return [`system.tools.${rollData.toolId}.roll.mode`];
    case "ability": return [`system.abilities.${rollData.ability}.check.roll.mode`];
    case "save": return [`system.abilities.${rollData.ability}.save.roll.mode`];
    default: return [];
  }
}

/**
 * Diseases that bent this roll, and which way. A disease granting both advantage and
 * disadvantage to the same roll nets to zero and is dropped — it changed nothing.
 * @returns {{name: string, mode: number}[]}
 */
function _rollInfluences(actor, rollData, roll) {
  // Attack rolls never touch a roll-mode field; `_onPostBuildAttackRollConfig`
  // already recorded its reasons on the roll, which the message persists.
  if (rollData.type === "attack") {
    return (roll?.options?.neuroDiseasePenalty ?? []).map(name => ({ name, mode: -1 }));
  }

  const keys = _rollModeKeys(rollData);
  if (!keys.length) return [];

  const found = [];
  for (const entry of getChoroby(actor)) {
    const spec = effectsFor(entry);
    if (!spec) continue;

    const sources = [{ name: entry.name, spec }];
    if (entry.conditionalOn && spec.conditional) {
      sources.push({ name: `${entry.name} — ${spec.conditional.label}`, spec: spec.conditional });
    }
    for (const source of sources) {
      const mode = (source.spec.changes ?? [])
        .filter(c => keys.includes(c.key))
        .reduce((sum, c) => sum + (Number(c.value) || 0), 0);
      if (mode) found.push({ name: source.name, mode });
    }
  }
  return found;
}

/**
 * Hook: `dnd5e.renderChatMessage`. Tag the roll with the disease behind it.
 * Shown to everyone, not just the GM — the player is the one who needs reminding.
 */
function _onAnnotateRoll(message, html) {
  const rollData = message.flags?.dnd5e?.roll;
  if (!rollData) return;
  if (html.querySelector(".neuro-disease-note")) return;

  const actor = game.actors.get(message.speaker?.actor);
  if (actor?.type !== "character") return;

  const notes = _rollInfluences(actor, rollData, message.rolls?.[0]);
  if (!notes.length) return;

  const box = document.createElement("div");
  box.className = "neuro-disease-note";
  for (const note of notes) {
    const tag = document.createElement("span");
    tag.className = `neuro-disease-tag ${note.mode > 0 ? "is-adv" : "is-dis"}`;
    const icon = document.createElement("i");
    icon.className = "fa-solid fa-biohazard";
    tag.appendChild(icon);
    tag.appendChild(document.createTextNode(
      `${note.name}: ${note.mode > 0 ? "Ułatwienie" : "Utrudnienie"}`));
    box.appendChild(tag);
  }
  (html.querySelector(".message-content") ?? html).appendChild(box);
}

/* -------------------------------------------- */
/*  Szał (Szaleństwo bostońskie)                 */
/* -------------------------------------------- */

/** Roll types the szał can key off. Saving throws are excluded by house rule. */
const RAGE_ROLL_TYPES = ["skill", "ability", "tool", "attack"];

/**
 * Which stage, if any, arms the szał for this actor.
 * @returns {{entry: object, rage: object}|null}
 */
function _rageStage(actor) {
  for (const entry of getChoroby(actor)) {
    const spec = effectsFor(entry);
    if (spec?.rage) return { entry, rage: spec.rage };
  }
  return null;
}

/**
 * Attach the szał button to eligible rolls.
 *
 * House rule agreed with the GM: **every failed d20 except a saving throw**.
 * RAW says "Testach Cech" at ostry and "każda porażka" at krytyczny; taking the
 * latter literally would fire on saves, which in combat is nearly every round.
 *
 * A ST is often only in the GM's head, so the button appears on any eligible
 * roll *unless* a known DC shows the roll succeeded. The GM judges the failure
 * and decides whether to click; nothing resolves on its own.
 */
function _onRenderRollMessage(message, html) {
  if (!game.user.isGM) return;
  const rollData = message.flags?.dnd5e?.roll;
  if (!rollData || !RAGE_ROLL_TYPES.includes(rollData.type)) return;
  if (message.flags?.[MODULE_ID]?.rageOffered) return;
  if (html.querySelector(".neuro-rage-bar")) return;

  const actor = game.actors.get(message.speaker?.actor);
  if (actor?.type !== "character") return;

  const armed = _rageStage(actor);
  if (!armed) return;

  // Ostry reacts only to the INT/CHA tests RAW names; krytyczny to everything.
  if (armed.rage.chance < 100) {
    const ability = rollData.ability ?? CONFIG.DND5E.skills?.[rollData.skillId]?.ability;
    if (!["int", "cha"].includes(ability)) return;
  }

  // Don't nag on a roll we can see succeeded.
  const roll = message.rolls?.[0];
  const dc = roll?.options?.target;
  if (dc != null && roll.total >= dc) return;

  const bar = document.createElement("div");
  bar.className = "neuro-rage-bar";

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "neuro-rage-btn";
  btn.innerHTML = `<i class="fa-solid fa-face-angry"></i> `
    + (armed.rage.chance < 100 ? `Rzuć na szał (${armed.rage.chance}%)` : "Ogłoś szał");
  btn.addEventListener("click", ev => _resolveRage(ev, message, actor, armed));
  bar.appendChild(btn);

  (html.querySelector(".message-content") ?? html).appendChild(bar);
}

/** Roll the k100 (if the stage calls for one) and announce the outcome. */
async function _resolveRage(event, message, actor, armed) {
  event.preventDefault();
  event.stopPropagation();
  const btn = event.currentTarget;
  btn.disabled = true;

  const pct = armed.rage.chance;
  let raged = true;
  let detail = "";
  if (pct < 100) {
    const roll = await new Roll("1d100").evaluate();
    raged = roll.total <= pct;
    detail = ` <span class="neuro-rage-roll">(k100 = ${roll.total} vs ${pct})</span>`;
  }

  await message.setFlag(MODULE_ID, "rageOffered", true);
  btn.closest(".neuro-rage-bar")?.remove();

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-rage-card ${raged ? "is-raging" : ""}">
      <div class="neuro-rage-head"><i class="fa-solid fa-face-angry"></i> ${armed.entry.name}</div>
      <div class="neuro-rage-body">${raged
        ? `<strong>SZAŁ!</strong> ${actor.name} rzuca się na źródło frustracji i nie odpuszcza, póki go nie zniszczy.`
        : `${actor.name} zaciska zęby i się powstrzymuje.`}${detail}</div>
    </div>`
  });
}
