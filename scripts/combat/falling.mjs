/**
 * Neuroshima 5e — Spadanie [ZAGROŻENIE].
 *
 * dnd5e 5.3 ships a `falling` status icon and nothing else — there is no falling
 * damage anywhere in the system. The rules exist though, so this implements them:
 *
 *   - 1k6 obrażeń obuchowych za każde 1,5 metra wysokości,
 *   - stan Powalenie po uderzeniu o podłoże, chyba że obrażenia wyniosły 0,
 *   - upadek do wody/cieczy: Reakcja + Test Siły (Atletyka) ST 10 lub Zręczności
 *     (Akrobatyka) ST 10 — sukces: brak obrażeń, porażka: połowa.
 *
 * Osteoporoza multiplies the result (×2 przewlekły/ostry, ×4 krytyczny). The
 * multiplier is read off the falling actor's diseases rather than hard-coded, so
 * any future condition can join by declaring `fallMultiplier` in
 * `config/disease-effects.mjs`.
 *
 * Available to the GM as a scene-control button and as
 * `game.neuroshima.falling.fall(actor, { metres, intoLiquid })`.
 */

import { effectsFor } from "../config/disease-effects.mjs";
import { getChoroby } from "../actors/health-panel.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** RAW constants (SPADANIE [ZAGROŻENIE]). */
export const FALLING = Object.freeze({
  metresPerDie: 1.5,
  die: "d6",
  damageType: "bludgeoning",
  liquidDC: 10,
  liquidSkills: [
    { skill: "atl", label: "Atletyka (Siła)" },
    { skill: "akr", label: "Akrobatyka (Zręczność)" }
  ],
  /** Fall speed used for multi-round falls, ~50 m/s = 300 m per round. */
  metresPerRound: 300
});

/* -------------------------------------------- */
/*  Registration                                 */
/* -------------------------------------------- */

export function registerFalling() {
  Hooks.on("getSceneControlButtons", controls => {
    const tools = controls.tokens?.tools;
    if (!tools) return;
    tools.neuroshimaFalling = {
      name: "neuroshimaFalling",
      title: "Spadanie — obrażenia od upadku (MG)",
      icon: "fa-solid fa-person-falling",
      order: Object.keys(tools).length,
      button: true,
      visible: game.user?.isGM ?? false,
      onChange: () => promptFall()
    };
  });
  console.log("Neuroshima 5e | Spadanie registered");
}

export const fallingApi = { fall, promptFall, fallMultiplier };

/* -------------------------------------------- */
/*  Disease multiplier                          */
/* -------------------------------------------- */

/**
 * Falling-damage multiplier owed by an actor's diseases (Osteoporoza today).
 * Multipliers do not stack — the worst one wins, which is how "poczwórne"
 * replaces "podwójne" as Osteoporoza progresses rather than compounding to ×8.
 * @param {Actor} actor
 * @returns {{value: number, reason: string|null}}
 */
export function fallMultiplier(actor) {
  let value = 1;
  let reason = null;
  for (const entry of getChoroby(actor)) {
    const m = effectsFor(entry)?.fallMultiplier;
    if (m && m > value) {
      value = m;
      reason = entry.name;
    }
  }
  return { value, reason };
}

/* -------------------------------------------- */
/*  The fall                                    */
/* -------------------------------------------- */

/**
 * Resolve a fall for one actor.
 * @param {Actor} actor
 * @param {object} options
 * @param {number} options.metres        Height fallen.
 * @param {boolean} [options.intoLiquid] Offer the Atletyka/Akrobatyka reaction.
 * @param {boolean} [options.apply=true] Apply the damage, or just report it.
 */
export async function fall(actor, { metres, intoLiquid = false, apply = true } = {}) {
  if (!actor || !(metres > 0)) return null;

  const dice = Math.floor(metres / FALLING.metresPerDie);
  if (dice < 1) {
    ui.notifications.info(`${actor.name}: upadek z ${metres} m nie zadaje obrażeń (poniżej ${FALLING.metresPerDie} m).`);
    return null;
  }

  const roll = await new Roll(`${dice}${FALLING.die}`).evaluate();
  const base = roll.total;

  const { value: mult, reason } = fallMultiplier(actor);

  // Liquid landing is resolved before the multiplier, so a clean entry means no
  // damage at all and the disease has nothing to multiply.
  let liquid = null;
  if (intoLiquid) liquid = await _resolveLiquidLanding(actor);

  let total = base * mult;
  if (liquid?.outcome === "clean") total = 0;
  else if (liquid?.outcome === "half") total = Math.floor(total / 2);

  if (apply && total > 0) {
    await actor.applyDamage([{ value: total, type: FALLING.damageType }], { ignore: true });
    // RAW: Powalenie on impact, unless the fall dealt no damage at all.
    await actor.toggleStatusEffect("prone", { active: true });
  }

  const rows = [
    `<div class="neuro-fall-row"><span>Wysokość</span><span>${metres} m → ${dice}${FALLING.die}</span></div>`,
    `<div class="neuro-fall-row"><span>Bazowo</span><span>${base}</span></div>`
  ];
  if (mult > 1) {
    rows.push(`<div class="neuro-fall-row is-disease"><span>${reason}</span><span>×${mult}</span></div>`);
  }
  if (liquid) {
    rows.push(`<div class="neuro-fall-row"><span>${liquid.label}</span><span>${liquid.text}</span></div>`);
  }

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    rolls: [roll],
    content: `<div class="neuro-fall-card">
      <div class="neuro-fall-head"><i class="fa-solid fa-person-falling"></i> SPADANIE</div>
      ${rows.join("")}
      <div class="neuro-fall-total">${total} obrażeń obuchowych${total > 0 ? " + Powalenie" : ""}</div>
    </div>`
  });

  return { dice, base, mult, total };
}

/**
 * Water/liquid landing: a Reaction and a Test SIŁ (Atletyka) or ZRC (Akrobatyka)
 * ST 10. Success negates the damage entirely, failure halves it.
 * @returns {Promise<{outcome: string, label: string, text: string}>}
 */
async function _resolveLiquidLanding(actor) {
  const choice = await foundry.applications.api.DialogV2.wait({
    window: { title: "Upadek do cieczy" },
    content: `<p><strong>${actor.name}</strong> spada do wody lub innej cieczy.</p>
      <p>Reakcja: Test o ST ${FALLING.liquidDC}, żeby spaść na nogi lub głowę.
      Sukces: brak obrażeń. Porażka: połowa obrażeń.</p>`,
    buttons: [
      ...FALLING.liquidSkills.map(s => ({ action: s.skill, label: s.label })),
      { action: "skip", label: "Bez Reakcji" }
    ]
  }).catch(() => "skip");

  if (!choice || choice === "skip") {
    return { outcome: "full", label: "Reakcja", text: "niewykorzystana" };
  }

  const rolls = await actor.rollSkill({ skill: choice, target: FALLING.liquidDC });
  const roll = Array.isArray(rolls) ? rolls[0] : rolls;
  const label = FALLING.liquidSkills.find(s => s.skill === choice)?.label ?? choice;
  if (!roll) return { outcome: "full", label, text: "przerwane" };

  return roll.total >= FALLING.liquidDC
    ? { outcome: "clean", label, text: `${roll.total} — sukces, brak obrażeń` }
    : { outcome: "half", label, text: `${roll.total} — porażka, połowa obrażeń` };
}

/* -------------------------------------------- */
/*  GM prompt                                   */
/* -------------------------------------------- */

/**
 * Ask for a height and apply the fall to the selected tokens.
 * Shows the disease multiplier up front, so it is obvious before rolling that
 * Osteoporoza is about to make this much worse.
 */
export async function promptFall() {
  const actors = canvas.tokens.controlled.map(t => t.actor).filter(Boolean);
  if (!actors.length) {
    ui.notifications.warn("Zaznacz pionek (lub kilka), który spada.");
    return;
  }

  const notes = actors.map(a => {
    const { value, reason } = fallMultiplier(a);
    return `<li>${a.name}${value > 1 ? ` — <strong>${reason}: ×${value}</strong>` : ""}</li>`;
  }).join("");

  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: "Spadanie" },
    content: `<p>1k6 obrażeń obuchowych za każde ${FALLING.metresPerDie} m. Powalenie po uderzeniu.</p>
      <ul class="neuro-fall-targets">${notes}</ul>
      <div class="form-group"><label>Wysokość (m)</label>
        <input type="number" name="metres" value="3" min="0" step="0.5" autofocus></div>
      <div class="form-group"><label>Upadek do wody / cieczy</label>
        <input type="checkbox" name="intoLiquid"></div>`,
    ok: {
      label: "Spadaj",
      callback: (_ev, button) => ({
        metres: Number(button.form.elements.metres.value),
        intoLiquid: button.form.elements.intoLiquid.checked
      })
    }
  }).catch(() => null);

  if (!result) return;
  for (const actor of actors) await fall(actor, result);
}
