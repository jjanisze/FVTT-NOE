/**
 * Neuroshima 5e — Krwawienie.
 *
 * Two sources produce the same visible condition but do NOT behave the same way, so the
 * mechanics live in `BLEED_PROFILES` and the state carries which one is running:
 *
 *   - `hemofilia` — RAW (str. 108), the original and still the default.
 *   - `dumdum`    — homebrew "W Kolorze Kobaltu", from the dum-dum round (.44 Mag, caliber
 *                   `44mag_dd`). Hits harder (1k8), lands at the START of the victim's turn,
 *                   and crucially cannot be waited out: there is no save that stops it, only
 *                   dressing the wound does. That is the whole point of the ammunition.
 *
 * Both share the `bleeding` status and the token icon, and an actor only ever runs ONE bleed
 * at a time — a dum-dum round hitting an already-bleeding haemophiliac upgrades the bleed to
 * the worse profile rather than stacking a second one (`severity`), and the reverse does not
 * downgrade it. Nothing in the fiction supports two independent bleeds, and two concurrent
 * end-of-turn saves would be unreadable at the table.
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

/** RAW thresholds. Kept as the Hemofilia profile's values and as the module's public constant. */
export const BLEED = Object.freeze({
  saveAbility: "con",
  saveDC: 10,
  damage: "1d4",
  medicineDC: 15,
  streakToStop: 3
});

/**
 * Per-source bleed behaviour.
 *
 * `when`      — "end" or "start" of the victim's own turn.
 * `save`      — null means the bleed cannot be shrugged off; only a stop path ends it.
 * `dose`      — whether "Wstrzyknij lek" is offered. Only Hemofilia has a medicine to inject;
 *               a dum-dum wound is a hole, not a disorder, so it gets the bandage path only.
 * `severity`  — higher wins when a second source hits an already-bleeding actor.
 */
export const BLEED_PROFILES = Object.freeze({
  hemofilia: Object.freeze({
    id: "hemofilia",
    label: "Krwawienie (hemofilia)",
    when: "end",
    damage: BLEED.damage,
    medicineDC: BLEED.medicineDC,
    dose: true,
    severity: 1,
    save: Object.freeze({ ability: BLEED.saveAbility, dc: BLEED.saveDC, streakToStop: BLEED.streakToStop })
  }),
  dumdum: Object.freeze({
    id: "dumdum",
    label: "Krwawienie (pocisk dum-dum)",
    when: "start",
    damage: "1d8",
    medicineDC: 15,
    dose: false,
    severity: 2,
    save: null
  })
});

/** Profil krwawienia aktora — brak zapisanego profilu = Hemofilia (stan sprzed tej zmiany). */
export function bleedProfile(actor) {
  const key = actor?.getFlag(MODULE_ID, FLAG)?.profile ?? "hemofilia";
  return BLEED_PROFILES[key] ?? BLEED_PROFILES.hemofilia;
}

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

/**
 * Name this function carried before bleed profiles existed, when every bleed was a save.
 * Kept because it is reachable as `game.neuroshima.health.bleeding.rollBleedSave` and may sit
 * in someone's macro; it is the same tick either way.
 */
export const rollBleedSave = tickBleed;

export const bleedingApi = { isBleeding, startBleeding, stopBleeding, tickBleed, rollBleedSave, bleedProfile, BLEED_PROFILES };

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
 * Start bleeding. A second cut does not stack a second save — RAW describes one ongoing bleed,
 * and the same holds for the homebrew profile. A *worse* source does upgrade the bleed in
 * place, though: taking a dum-dum round while already bleeding from hemofilia has to matter,
 * otherwise the ammunition would be strictly worse against exactly the targets it is meant for.
 *
 * @param {Actor5e} actor
 * @param {object} [options]
 * @param {string} [options.reason]   Free text for the chat card.
 * @param {string} [options.profile]  Key in `BLEED_PROFILES`. Defaults to Hemofilia.
 */
export async function startBleeding(actor, { reason = "", profile = "hemofilia" } = {}) {
  const next = BLEED_PROFILES[profile] ?? BLEED_PROFILES.hemofilia;

  if (isBleeding(actor)) {
    const current = bleedProfile(actor);
    if (next.severity <= current.severity) return;

    const state = actor.getFlag(MODULE_ID, FLAG) ?? {};
    await actor.setFlag(MODULE_ID, FLAG, { ...state, profile: next.id, streak: 0 });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="neuro-bleed-card is-bleeding">
        <div class="neuro-bleed-head"><i class="fa-solid fa-droplet"></i> KRWAWIENIE SIĘ POGŁĘBIA</div>
        <div class="neuro-bleed-body">${actor.name} krwawił już wcześniej, ale rana${reason ? ` (${reason})` : ""}
          jest gorsza. Obowiązuje teraz: <strong>${next.label}</strong> — ${_profileRule(next)}</div>
        ${_stopButtons(actor)}
      </div>`,
      flags: { [MODULE_ID]: { bleed: true } }
    });
    return;
  }

  await actor.setFlag(MODULE_ID, FLAG, {
    active: true, streak: 0, since: game.time.worldTime, profile: next.id
  });
  await actor.toggleStatusEffect("bleeding", { active: true });
  seqScrollText("KRWAWIENIE!", actor, { color: "#c0392b", fontSize: 32, duration: 2000 });

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-bleed-card">
      <div class="neuro-bleed-head"><i class="fa-solid fa-droplet"></i> KRWAWIENIE</div>
      <div class="neuro-bleed-body">${next.label}. ${actor.name} zaczyna krwawić${reason ? ` (${reason})` : ""}.
        ${_profileRule(next)}</div>
      ${_stopButtons(actor)}
    </div>`,
    flags: { [MODULE_ID]: { bleed: true } }
  });
}

/** One-line rules reminder for a profile, used on every card it produces. */
function _profileRule(profile) {
  const when = profile.when === "start" ? "Na początku" : "Na końcu";
  if (!profile.save) {
    return `${when} każdej swojej tury: <strong>${profile.damage}</strong> obrażeń. `
      + `Nie da się tego przeczekać — krwawienie ustaje dopiero po opatrzeniu rany `
      + `(Medycyna ST ${profile.medicineDC}).`;
  }
  const abilityLabel = CONFIG.DND5E.abilities?.[profile.save.ability]?.label ?? profile.save.ability;
  return `${when} każdej swojej tury: RO na ${abilityLabel} ST ${profile.save.dc}, `
    + `porażka = ${profile.damage} obrażeń. ${profile.save.streakToStop} zdane RO pod rząd kończą krwawienie.`;
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
 * Hook: `updateCombat` — the periodic bleed tick.
 *
 * One turn boundary is two events: the previous combatant's turn ended and the current one's
 * began. Which of the two actors ticks is decided by that actor's own profile (`when`), not by
 * the hook — Hemofilia lands its RO at the end of its victim's turn where RAW puts it, while a
 * dum-dum wound opens up at the start of theirs. Both are checked here so the two never need
 * separate wiring.
 */
async function _onUpdateCombat(combat, changed, options) {
  if (!game.user.isGM) return;
  if (!("turn" in changed) && !("round" in changed)) return;

  const previousId = combat.previous?.combatantId;
  const ended = previousId ? combat.combatants.get(previousId)?.actor ?? null : null;
  const started = combat.combatant?.actor ?? null;

  if (ended && isBleeding(ended) && bleedProfile(ended).when === "end") await tickBleed(ended);
  if (started && isBleeding(started) && bleedProfile(started).when === "start") await tickBleed(started);
}

/* -------------------------------------------- */
/*  The save                                    */
/* -------------------------------------------- */

/**
 * One bleed tick, on whichever turn edge the actor's profile names.
 *
 * With a save (Hemofilia): failure deals the damage and resets the streak, success advances it,
 * and enough successes in a row stop the bleeding. Without one (dum-dum): the damage simply
 * lands, every turn, until somebody dresses the wound.
 */
export async function tickBleed(actor) {
  if (!isBleeding(actor)) return;
  const profile = bleedProfile(actor);
  const state = actor.getFlag(MODULE_ID, FLAG) ?? { active: true, streak: 0 };

  if (profile.save) {
    const rolls = await actor.rollSavingThrow(
      { ability: profile.save.ability, target: profile.save.dc },
      { configure: false }
    );
    const roll = Array.isArray(rolls) ? rolls[0] : rolls;
    if (!roll) return;

    if (roll.total >= profile.save.dc) {
      const streak = (state.streak ?? 0) + 1;
      if (streak >= profile.save.streakToStop) {
        await stopBleeding(actor, `${profile.save.streakToStop} zdane RO pod rząd`);
        return;
      }
      await actor.setFlag(MODULE_ID, FLAG, { ...state, streak });
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<div class="neuro-bleed-card">
          <div class="neuro-bleed-head"><i class="fa-solid fa-droplet"></i> Krwawienie — RO zdane</div>
          <div class="neuro-bleed-body">Seria: ${streak}/${profile.save.streakToStop}. Krwawienie trwa.</div>
          ${_stopButtons(actor)}
        </div>`,
        flags: { [MODULE_ID]: { bleed: true } }
      });
      return;
    }
  }

  const dmg = await new Roll(profile.damage).evaluate();
  await actor.applyDamage([{ value: dmg.total, type: "slashing" }], { ignore: true });
  await actor.setFlag(MODULE_ID, FLAG, { ...state, streak: 0 });

  const head = profile.save ? "Krwawienie — RO oblane" : "Krwawienie";
  const tail = profile.save
    ? "Seria przerwana."
    : `Rana nie chce się zamknąć — opatrz ją (Medycyna ST ${profile.medicineDC}), żeby to przerwać.`;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    rolls: [dmg],
    content: `<div class="neuro-bleed-card is-bleeding">
      <div class="neuro-bleed-head"><i class="fa-solid fa-droplet"></i> ${head}</div>
      <div class="neuro-bleed-body">${actor.name} traci <strong>${dmg.total}</strong> PW. ${tail}</div>
      ${_stopButtons(actor)}
    </div>`,
    flags: { [MODULE_ID]: { bleed: true } }
  });
}

/* -------------------------------------------- */
/*  Stop paths                                  */
/* -------------------------------------------- */

function _stopButtons(actor) {
  const profile = bleedProfile(actor);
  // "Wstrzyknij lek" wydaje dawke leku na Hemofilie przez `takeDose` - bez wpisu choroby nie ma
  // czego wydac, wiec przy dum-dum przycisku po prostu nie ma, zamiast dawac guzik, ktory
  // cicho nic nie robi.
  const dose = profile.dose
    ? `<button type="button" class="neuro-bleed-btn" data-action="lek" data-actor-id="${actor.id}">
        <i class="fa-solid fa-syringe"></i> Wstrzyknij lek</button>`
    : "";
  return `<div class="neuro-bleed-actions">
    ${dose}
    <button type="button" class="neuro-bleed-btn" data-action="medycyna" data-actor-id="${actor.id}">
      <i class="fa-solid fa-kit-medical"></i> Medycyna ST ${profile.medicineDC}</button>
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
    const dc = bleedProfile(actor).medicineDC;
    // The medic is whoever is acting, not necessarily the patient.
    const medic = game.user.character ?? canvas.tokens.controlled[0]?.actor ?? actor;
    const kit = medic.items.find(i => i.type === "tool" && i.system.type?.baseItem === "medyka");
    if (!kit) {
      ui.notifications.warn(`${medic.name} nie ma narzędzi małego medyka — RAW wymaga ich do tego testu.`);
      return;
    }
    const rolls = await medic.rollSkill({ skill: "med", target: dc });
    const roll = Array.isArray(rolls) ? rolls[0] : rolls;
    if (!roll) return;
    if (roll.total >= dc) await stopBleeding(actor, `opatrzony przez ${medic.name}`);
    else ui.notifications.info(`Test Medycyny nieudany (${roll.total} vs ST ${dc}) — krwawienie trwa.`);
  }
}
