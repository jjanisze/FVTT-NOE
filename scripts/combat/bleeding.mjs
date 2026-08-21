/**
 * Neuroshima 5e — Krwawienie (Hemofilia).
 *
 * RAW (str. 108): a haemophiliac who takes cięte or kłute damage starts bleeding.
 * At the end of each of their turns they roll RO na Kondycję ST 10; a failure
 * deals 1k4. The bleeding stops on any of three things:
 *
 *   - injecting the medicine (Desmopresyna / preparaty krwiopochodne),
 *   - a Test Medycyny ST 15 with narzędzia małego medyka,
 *   - three consecutive successful RO na Kondycję ST 10.
 *
 * All three are implemented. The streak reuses the same idea as the phobia
 * Przełamanie counter, so the two read the same way at the table.
 *
 * State lives in `flags.<module>.krwawienie = { active, streak, since }` plus the
 * `bleeding` status on the actor, so it is visible on the token as well as the sheet.
 */

import { effectsFor } from "../config/disease-effects.mjs";
import { getChoroby, takeDose } from "../actors/health-panel.mjs";
import { seqScrollText } from "../weapons/sequencer.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const FLAG = "krwawienie";

/** RAW thresholds. */
export const BLEED = Object.freeze({
  saveAbility: "con",
  saveDC: 10,
  damage: "1d4",
  medicineDC: 15,
  streakToStop: 3
});

/** Damage types that start a bleed — cięte / kłute. */
const BLEEDING_DAMAGE = new Set(["slashing", "piercing"]);

/* -------------------------------------------- */
/*  Registration                                 */
/* -------------------------------------------- */

export function registerBleeding() {
  // `dnd5e.preApplyDamage` only gets a total — the damage *types* are gone by
  // then. `calculateDamage` is the last hook that still sees the breakdown,
  // which is what decides whether a hit was cięte/kłute.
  Hooks.on("dnd5e.calculateDamage", _onCalculateDamage);
  Hooks.on("updateCombat", _onUpdateCombat);
  Hooks.on("renderChatMessageHTML", _bindBleedButtons);
  console.log("Neuroshima 5e | Krwawienie (Hemofilia) registered");
}

export const bleedingApi = { isBleeding, startBleeding, stopBleeding, rollBleedSave };

/* -------------------------------------------- */
/*  State                                       */
/* -------------------------------------------- */

/** The actor's Hemofilia entry, if they have one that is currently biting. */
function _hemofiliaEntry(actor) {
  return getChoroby(actor).find(e => effectsFor(e)?.bleed) ?? null;
}

export function isBleeding(actor) {
  return actor?.getFlag(MODULE_ID, FLAG)?.active === true;
}

/**
 * Start bleeding. No-op if already bleeding — a second cut does not stack a
 * second save, RAW describes one ongoing bleed.
 */
export async function startBleeding(actor, { reason = "" } = {}) {
  if (isBleeding(actor)) return;
  await actor.setFlag(MODULE_ID, FLAG, { active: true, streak: 0, since: game.time.worldTime });
  await actor.toggleStatusEffect("bleeding", { active: true });
  seqScrollText("KRWAWIENIE!", actor, { color: "#c0392b", fontSize: 32, duration: 2000 });

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-bleed-card">
      <div class="neuro-bleed-head"><i class="fa-solid fa-droplet"></i> KRWAWIENIE</div>
      <div class="neuro-bleed-body">Hemofilia. ${actor.name} zaczyna krwawić${reason ? ` (${reason})` : ""}.
        Na końcu każdej swojej tury: RO na Kondycję ST ${BLEED.saveDC}, porażka = ${BLEED.damage} obrażeń.</div>
      ${_stopButtons(actor)}
    </div>`,
    flags: { [MODULE_ID]: { bleed: true } }
  });
}

/** Stop bleeding and say why. */
export async function stopBleeding(actor, how = "") {
  if (!isBleeding(actor)) return;
  await actor.unsetFlag(MODULE_ID, FLAG);
  await actor.toggleStatusEffect("bleeding", { active: false });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-bleed-card is-stopped">
      <div class="neuro-bleed-head"><i class="fa-solid fa-droplet-slash"></i> KRWAWIENIE POWSTRZYMANE</div>
      <div class="neuro-bleed-body">${actor.name}${how ? ` — ${how}` : ""}.</div>
    </div>`
  });
}

/* -------------------------------------------- */
/*  Triggers                                    */
/* -------------------------------------------- */

/**
 * Hook: `dnd5e.calculateDamage(actor, damages, options)` — start a bleed when a
 * haemophiliac takes slashing or piercing damage. Reads the per-type breakdown
 * rather than a total, so a mixed-type hit (a bayonet with an explosive rider)
 * still counts, and pure bludgeoning correctly does not.
 */
function _onCalculateDamage(actor, damages, options) {
  if (actor?.type !== "character") return;
  if (!_hemofiliaEntry(actor)) return;
  if (isBleeding(actor)) return;

  // Healing arrives through the same path with a negative/`healing` type.
  const cut = (damages ?? []).find(d =>
    BLEEDING_DAMAGE.has(d.type) && (d.value ?? 0) > 0);
  if (!cut) return;

  const label = CONFIG.DND5E.damageTypes?.[cut.type]?.label ?? cut.type;
  // Deferred: this fires mid-calculation, and starting the bleed writes flags,
  // a token status and a chat card — none of which belong inside that call.
  setTimeout(() => startBleeding(actor, { reason: `obrażenia ${label.toLowerCase()}` }), 0);
}

/**
 * Hook: `updateCombat` — the end-of-turn save. Fires for the combatant whose
 * turn just ended, not the one starting, so the RO lands where RAW puts it.
 */
async function _onUpdateCombat(combat, changed, options) {
  if (!game.user.isGM) return;
  if (!("turn" in changed) && !("round" in changed)) return;

  const previous = combat.previous;
  const combatant = previous?.combatantId ? combat.combatants.get(previous.combatantId) : null;
  const actor = combatant?.actor;
  if (!actor || !isBleeding(actor)) return;

  await rollBleedSave(actor);
}

/* -------------------------------------------- */
/*  The save                                    */
/* -------------------------------------------- */

/**
 * One end-of-turn RO na Kondycję ST 10.
 * Failure deals 1k4 and resets the streak; success advances it, and three in a
 * row stop the bleeding.
 */
export async function rollBleedSave(actor) {
  if (!isBleeding(actor)) return;

  const rolls = await actor.rollSavingThrow(
    { ability: BLEED.saveAbility, target: BLEED.saveDC },
    { configure: false }
  );
  const roll = Array.isArray(rolls) ? rolls[0] : rolls;
  if (!roll) return;

  const state = actor.getFlag(MODULE_ID, FLAG) ?? { active: true, streak: 0 };
  const success = roll.total >= BLEED.saveDC;

  if (success) {
    const streak = (state.streak ?? 0) + 1;
    if (streak >= BLEED.streakToStop) {
      await stopBleeding(actor, `${BLEED.streakToStop} zdane RO na Kondycję pod rząd`);
      return;
    }
    await actor.setFlag(MODULE_ID, FLAG, { ...state, streak });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="neuro-bleed-card">
        <div class="neuro-bleed-head"><i class="fa-solid fa-droplet"></i> Krwawienie — RO zdane</div>
        <div class="neuro-bleed-body">Seria: ${streak}/${BLEED.streakToStop}. Krwawienie trwa.</div>
        ${_stopButtons(actor)}
      </div>`,
      flags: { [MODULE_ID]: { bleed: true } }
    });
    return;
  }

  const dmg = await new Roll(BLEED.damage).evaluate();
  await actor.applyDamage([{ value: dmg.total, type: "slashing" }], { ignore: true });
  await actor.setFlag(MODULE_ID, FLAG, { ...state, streak: 0 });

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    rolls: [dmg],
    content: `<div class="neuro-bleed-card is-bleeding">
      <div class="neuro-bleed-head"><i class="fa-solid fa-droplet"></i> Krwawienie — RO oblane</div>
      <div class="neuro-bleed-body">${actor.name} traci <strong>${dmg.total}</strong> PW. Seria przerwana.</div>
      ${_stopButtons(actor)}
    </div>`,
    flags: { [MODULE_ID]: { bleed: true } }
  });
}

/* -------------------------------------------- */
/*  Stop paths                                  */
/* -------------------------------------------- */

function _stopButtons(actor) {
  return `<div class="neuro-bleed-actions">
    <button type="button" class="neuro-bleed-btn" data-action="lek" data-actor-id="${actor.id}">
      <i class="fa-solid fa-syringe"></i> Wstrzyknij lek</button>
    <button type="button" class="neuro-bleed-btn" data-action="medycyna" data-actor-id="${actor.id}">
      <i class="fa-solid fa-kit-medical"></i> Medycyna ST ${BLEED.medicineDC}</button>
  </div>`;
}

function _bindBleedButtons(message, html) {
  if (!message.getFlag(MODULE_ID, "bleed")) return;
  const el = html instanceof HTMLElement ? html : html?.[0];
  for (const btn of el?.querySelectorAll(".neuro-bleed-btn") ?? []) {
    if (btn.dataset.bound) continue;
    btn.dataset.bound = "1";
    btn.addEventListener("click", _onClickBleedStop);
  }
}

async function _onClickBleedStop(event) {
  event.preventDefault();
  event.stopPropagation();
  const { action, actorId } = event.currentTarget.dataset;
  const actor = game.actors.get(actorId);
  if (!actor?.isOwner || !isBleeding(actor)) return;

  if (action === "lek") {
    const entry = _hemofiliaEntry(actor);
    if (!entry) return;
    // Spend a real dose through the normal medicine path, so supply is tracked
    // and the usual narrative card still fires.
    await takeDose(actor, entry.id);
    await stopBleeding(actor, "wstrzyknięty lek");
    return;
  }

  if (action === "medycyna") {
    // The medic is whoever is acting, not necessarily the patient.
    const medic = game.user.character ?? canvas.tokens.controlled[0]?.actor ?? actor;
    const kit = medic.items.find(i => i.type === "tool" && i.system.type?.baseItem === "medyka");
    if (!kit) {
      ui.notifications.warn(`${medic.name} nie ma narzędzi małego medyka — RAW wymaga ich do tego testu.`);
      return;
    }
    const rolls = await medic.rollSkill({ skill: "med", target: BLEED.medicineDC });
    const roll = Array.isArray(rolls) ? rolls[0] : rolls;
    if (!roll) return;
    if (roll.total >= BLEED.medicineDC) await stopBleeding(actor, `opatrzony przez ${medic.name}`);
    else ui.notifications.info(`Test Medycyny nieudany (${roll.total} vs ST ${BLEED.medicineDC}) — krwawienie trwa.`);
  }
}
