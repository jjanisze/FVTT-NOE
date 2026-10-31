/**
 * Neuroshima 5e — Krwawienie.
 *
 * Two sources produce the same visible condition but do NOT behave the same way, so the
 * mechanics live in `BLEED_PROFILES` and the state carries which one is running:
 *
 *   - `hemofilia` — RAW (str. 109), the original and still the default.
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
 * RAW (str. 109): a haemophiliac who takes cięte or kłute damage starts bleeding.
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
 * With Kolor Kobaltu (WKK #43, `KRWAWIENIE_KOBALT`): the Medycyna test spends a kit charge, and a
 * bleed without a save also stops on the Hemofilia medicine or on its own after three turns of
 * damage — `drogiZatrzymania` is the one place that decides which stop paths a bleed has.
 *
 * State lives in `flags.<module>.krwawienie = { active, streak, tury, since, profile }` plus the
 * `bleeding` status on the actor, so it is visible on the token as well as the sheet.
 */

import { effectsFor } from "../config/disease-effects.mjs";
import { chemiaForDisease, chemiaKeyByName } from "../config/chemia-data.mjs";
import { isKobaltEnabled } from "../config/settings.mjs";
import { dosesRemaining, getChoroby, takeDose, zuzyjDawke } from "../actors/health-panel.mjs";
import { maDnoTorby, zapasyMedyka, zuzyjLadunekMedyka } from "../items/toolkit-medyk.mjs";
import { seqScrollText } from "../weapons/sequencer.mjs";
import { DUMDUM_BLEED_PROFILE, KRWAWIENIE_KOBALT } from "../wkk/combat/bleeding.mjs";
import { krokNaprzod, tikRaz } from "./tiki.mjs";

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
  // WKK-only, no RAW basis — see wkk/combat/bleeding.mjs.
  dumdum: DUMDUM_BLEED_PROFILE,
  // Podstępny atak (Złodziej 3, s. 92; PLAN_m7 E5): 1k8 at the start of the victim's turn, no save — it stops
  // "po opatrzeniu rany", read as the Hemofilia test (MG; the book gives no ST — Pytania do autora §17).
  podstepny: Object.freeze({
    id: "podstepny",
    label: "Krwawienie (Podstępny atak)",
    when: "start",
    damage: "1d8",
    medicineDC: BLEED.medicineDC,
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

/**
 * Which stop paths a bleed with this profile has, besides the Medycyna test every bleed gets.
 * @param {object} profile  An entry of `BLEED_PROFILES`.
 * @param {{kobalt?: boolean}} [opts]
 * @returns {{lek: boolean, ladunek: boolean, turyObrazen: number|null}}
 *   `lek` — "Wstrzyknij lek" is offered; `ladunek` — the test spends a kit charge;
 *   `turyObrazen` — the bleed ends on its own after this many turns of damage (null: never).
 */
export function drogiZatrzymania(profile, { kobalt = isKobaltEnabled() } = {}) {
  const k = kobalt ? KRWAWIENIE_KOBALT : null;
  const bezRO = !profile?.save;
  return {
    lek: !!profile?.dose || (bezRO && !!k?.lek),
    ladunek: !!k?.ladunek,
    turyObrazen: bezRO && k ? k.turyObrazen : null
  };
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

export const bleedingApi = {
  isBleeding, startBleeding, stopBleeding, tickBleed, rollBleedSave, bleedProfile, drogiZatrzymania, podajLek, opatrz,
  BLEED_PROFILES
};

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
    const state = actor.getFlag(MODULE_ID, FLAG) ?? {};
    if (next.severity < current.severity) return;
    if (next.severity === current.severity) {
      // A bleed that runs out by itself (WKK #43) is renewed by a fresh wound of the same weight — the new
      // one replaces the old, as with Podstępny atak's other effects. Otherwise there is nothing to renew.
      const limit = drogiZatrzymania(next).turyObrazen;
      if (!limit) return;
      await actor.setFlag(MODULE_ID, FLAG, { ...state, profile: next.id, tury: 0 });
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<div class="neuro-bleed-card is-bleeding">
          <div class="neuro-bleed-head"><i class="fa-solid fa-droplet"></i> NOWA RANA</div>
          <div class="neuro-bleed-body">${actor.name}${reason ? ` (${reason})` : ""} — ${next.label}, ${limit} tury od nowa.
            ${_profileRule(next)}</div>
          ${_stopButtons(actor)}
        </div>`,
        flags: { [MODULE_ID]: { bleed: true } }
      });
      return;
    }

    await actor.setFlag(MODULE_ID, FLAG, { ...state, profile: next.id, streak: 0, tury: 0 });
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
    active: true, streak: 0, tury: 0, since: game.time.worldTime, profile: next.id
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
  const drogi = drogiZatrzymania(profile);
  if (!profile.save && drogi.turyObrazen) {
    return `${when} każdej swojej tury: <strong>${profile.damage}</strong> obrażeń, najwyżej przez `
      + `${drogi.turyObrazen} tury. Wcześniej przerywa je opatrzenie rany (Medycyna ST ${profile.medicineDC}, `
      + `ładunek narzędzi małego medyka)${drogi.lek ? " albo lek na Hemofilię (Desmopresyna)" : ""}.`;
  }
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
  // Wstecz nie ma końca ani początku tury — i każda tura tyka raz (PLAN_m3 F17).
  if (!krokNaprzod(combat.previous, combat.current)) return;

  const previousId = combat.previous?.combatantId;
  const ended = previousId ? combat.combatants.get(previousId)?.actor ?? null : null;
  const started = combat.combatant?.actor ?? null;

  if (ended && isBleeding(ended) && bleedProfile(ended).when === "end"
    && await tikRaz(ended, "krwawienie", combat, { round: combat.previous.round, combatantId: previousId, krawedz: "end" })) {
    await tickBleed(ended);
  }
  if (started && isBleeding(started) && bleedProfile(started).when === "start"
    && await tikRaz(started, "krwawienie", combat, { round: combat.current.round, combatantId: combat.current.combatantId, krawedz: "start" })) {
    await tickBleed(started);
  }
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
  // Turns of damage are counted always, so switching Kobalt on mid-bleed counts the turns already bled.
  const tury = profile.save ? 0 : (state.tury ?? 0) + 1;
  const limit = profile.save ? null : drogiZatrzymania(profile).turyObrazen;
  const koniec = !!limit && tury >= limit;
  if (!koniec) await actor.setFlag(MODULE_ID, FLAG, { ...state, streak: 0, tury });

  const head = profile.save ? "Krwawienie — RO oblane" : "Krwawienie";
  let tail = `Rana nie chce się zamknąć — opatrz ją (Medycyna ST ${profile.medicineDC}), żeby to przerwać.`;
  if (profile.save) tail = "Seria przerwana.";
  else if (koniec) tail = `To ${limit}. tura krwawienia — rana zasycha.`;
  else if (limit) tail = `Tura ${tury}/${limit} — opatrz ranę (Medycyna ST ${profile.medicineDC}), żeby przerwać wcześniej.`;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    rolls: [dmg],
    content: `<div class="neuro-bleed-card is-bleeding">
      <div class="neuro-bleed-head"><i class="fa-solid fa-droplet"></i> ${head}</div>
      <div class="neuro-bleed-body">${actor.name} traci <strong>${dmg.total}</strong> PW. ${tail}</div>
      ${koniec ? "" : _stopButtons(actor)}
    </div>`,
    flags: { [MODULE_ID]: { bleed: true } }
  });
  if (koniec) await stopBleeding(actor, `${limit} tury krwawienia, rana zaschła (WKK)`);
}

/* -------------------------------------------- */
/*  Stop paths                                  */
/* -------------------------------------------- */

function _stopButtons(actor) {
  const profile = bleedProfile(actor);
  // "Wstrzyknij lek": u chorego na Hemofilię dawka z jego wpisu choroby (`takeDose`); przy krwawieniu
  // bez RO z Kobaltem (WKK #43) — dawka leku na Hemofilię z ekwipunku. Bez żadnej z tych dróg przycisku
  // nie ma, zamiast guzika, który cicho nic nie robi.
  const dose = drogiZatrzymania(profile).lek
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

  // The medic is whoever is acting, not necessarily the patient.
  const medic = game.user.character ?? canvas.tokens.controlled[0]?.actor ?? actor;
  if (action === "lek") await podajLek(actor, medic);
  if (action === "medycyna") await opatrz(actor, medic);
}

/**
 * "Wstrzyknij lek": a haemophiliac doses from their disease entry; a bleed without a save (WKK #43) takes a
 * Hemofilia medicine — the patient's own first, then the medic's.
 * @param {Actor} actor  The bleeding actor.
 * @param {Actor} [medic]
 * @returns {Promise<boolean>} Whether the bleeding stopped.
 */
export async function podajLek(actor, medic = actor) {
  if (!isBleeding(actor) || !drogiZatrzymania(bleedProfile(actor)).lek) return false;
  const entry = _hemofiliaEntry(actor);
  if (entry) {
    // Spend a real dose through the normal medicine path, so supply is tracked
    // and the usual narrative card still fires.
    await takeDose(actor, entry.id);
    await stopBleeding(actor, "wstrzyknięty lek");
    return true;
  }
  const lek = _lekNaHemofilie(actor) ?? (medic === actor ? null : _lekNaHemofilie(medic));
  if (!lek) {
    ui.notifications.warn(`Brak leku na Hemofilię (Desmopresyna, Preparaty krwiopochodne) u ${actor.name}`
      + `${medic === actor ? "" : ` ani u ${medic.name}`}.`);
    return false;
  }
  if (!lek.isOwner) {
    ui.notifications.warn(`${lek.name} należy do ${lek.actor?.name} — poda go gracz tej postaci.`);
    return false;
  }
  if (!await zuzyjDawke(lek)) return false;
  await stopBleeding(actor, `wstrzyknięty lek (${lek.name}${lek.actor === actor ? "" : `, ${lek.actor?.name}`})`);
  return true;
}

/**
 * Test Medycyny with narzędzia małego medyka against the profile's ST. WKK #43: it spends a kit charge, either
 * result; an empty kit only with Aspiryna i Miętusy — with Utrudnienie and no charge.
 * @param {Actor} actor  The bleeding actor.
 * @param {Actor} [medic]
 * @param {{dialog?: object}} [opts]  Passed to `rollSkill` (tests fast-forward it).
 * @returns {Promise<boolean|null>} Whether the bleeding stopped; null when no test was rolled.
 */
export async function opatrz(actor, medic = actor, { dialog = {} } = {}) {
  if (!isBleeding(actor)) return null;
  const profile = bleedProfile(actor);
  const dc = profile.medicineDC;
  const kit = medic.items.find(i => i.type === "tool" && i.system.type?.baseItem === "medyka");
  if (!kit) {
    ui.notifications.warn(`${medic.name} nie ma narzędzi małego medyka — RAW wymaga ich do tego testu.`);
    return null;
  }
  let zapas = null;
  let pustaTorba = false;
  if (drogiZatrzymania(profile).ladunek) {
    zapas = zapasyMedyka(medic).find(z => z.remaining >= 1 && z.item.isOwner) ?? null;
    pustaTorba = !zapas;
    if (pustaTorba && !maDnoTorby(medic)) {
      ui.notifications.warn(`${medic.name} ma pustą torbę małego medyka (WKK: test na krwawienie zużywa ładunek).`);
      return null;
    }
  }
  const rolls = await medic.rollSkill({ skill: "med", target: dc, ...(pustaTorba ? { disadvantage: true } : {}) }, dialog);
  const roll = Array.isArray(rolls) ? rolls[0] : rolls;
  if (!roll) return null;
  const zostalo = zapas ? await zuzyjLadunekMedyka(zapas.item) : null;
  const ladunek = zapas ? `; −1 ładunek, zostało ${zostalo}/${zapas.max}` : pustaTorba ? "; pusta torba, Aspiryna i Miętusy" : "";
  if (roll.total >= dc) {
    await stopBleeding(actor, `opatrzony przez ${medic.name}${ladunek}`);
    return true;
  }
  ui.notifications.info(`Test Medycyny nieudany (${roll.total} vs ST ${dc}) — krwawienie trwa${ladunek}.`);
  return false;
}

/** A Hemofilia medicine (Desmopresyna, Preparaty krwiopochodne) the actor carries with a dose left. */
function _lekNaHemofilie(actor) {
  const klucze = chemiaForDisease("hemofilia");
  return actor?.items.find(i => i.type === "consumable"
    && klucze.includes(i.getFlag(MODULE_ID, "chemiaKey") ?? chemiaKeyByName(i.name))
    && dosesRemaining(i) > 0) ?? null;
}
