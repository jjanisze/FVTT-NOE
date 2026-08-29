/**
 * Neuroshima 5e — generic critical-hit riders for Bestiariusz creatures.
 *
 * Several creatures do something extra on a critical hit that outlives the
 * fight: Bit-Boys bite a finger off (Palcożerca), and the same shape recurs on
 * other predators. This module implements that shape **once**, driven entirely
 * by the `critRider` automation descriptor emitted into the pack by
 * `dev/bestiary/gen_bestiary.py`, so adding a new one is a data change.
 *
 * ## House doctrine: automate detection, never application
 *
 * The crit is detected automatically and announced. Nothing is applied. The
 * card carries a button; the GM selects the victim's token and clicks it, and
 * only then does the effect land. That gap is the point — RAW says "damage
 * *and* debuff", but the GM keeps the standing option to grant a save, hand out
 * advantage, or waive it outright depending on the fiction.
 *
 * Deliberately decoupled from the damage roll: this is its own card, not a
 * rider appended to the damage card, so resolving it can wait.
 *
 * ## Data shape (from the automation layer)
 *
 *   {
 *     kind: "critRider",
 *     rider: "palcozerca",
 *     roll: "1d10",
 *     table: { "1-5": "palce lewej ręki", "6-10": "palce prawej ręki" },
 *     effect: { key, label, permanent, changes: [{key, mode, value}] },
 *     skipsZranienie: true
 *   }
 *
 * `combat/zranienie.mjs` reads `skipsZranienie` so a finger does not also cost
 * the victim a Stopień Zranienia, exactly as the rulebook says.
 */

const MODULE_ID = "neuroshima-2026-overrides";

// v14+: ActiveEffect change entries take a string `type` (see live example on any
// effect's `changes[].type`), not the old numeric `mode` from the now-deprecated
// CONST.ACTIVE_EFFECT_MODES — CONST.ACTIVE_EFFECT_CHANGE_TYPES exists but maps
// these same string keys to a different set of internal numbers, so the string
// keys themselves (not that object's values) are what belongs on the document.
const MODE = {
  add: "add",
  multiply: "multiply",
  override: "override",
  upgrade: "upgrade",
  downgrade: "downgrade"
};

/* -------------------------------------------- */
/*  Lookup                                       */
/* -------------------------------------------- */

/**
 * Every crit rider an actor owns, regardless of which item was used to attack.
 * Palcożerca is a *trait* ("Jeśli trafi krytycznie..."), not a property of the
 * claws, so it must fire on any critical the creature lands.
 * @param {Actor5e} actor
 * @returns {{item: Item5e, rider: object}[]}
 */
function ridersFor(actor) {
  const out = [];
  for (const item of actor?.items ?? []) {
    const auto = item.getFlag(MODULE_ID, "bestiary")?.automation;
    if (auto?.kind === "critRider") out.push({ item, rider: auto });
  }
  return out;
}

/** Does this actor have a crit rider that suppresses Stopień Zranienia? */
export function critSkipsZranienie(actor) {
  return ridersFor(actor).some(r => r.rider.skipsZranienie);
}

/* -------------------------------------------- */
/*  Detection                                    */
/* -------------------------------------------- */

async function onPostRollAttack(rolls, { subject } = {}) {
  if (!game.user.isGM) return;
  if (!rolls?.some(r => r?.isCritical)) return;

  const actor = subject?.item?.actor ?? subject?.actor;
  if (!actor) return;

  for (const { item, rider } of ridersFor(actor)) {
    await announceRider(actor, item, rider);
  }
}

async function announceRider(actor, item, rider) {
  const content = `
    <div class="neuro-crit-rider">
      <p><strong>${item.name}</strong> — trafienie krytyczne.</p>
      <p>${item.system.description?.value ?? ""}</p>
      <p class="neuro-crit-hint"><em>Zaznacz żeton ofiary i kliknij poniżej.</em></p>
      <button type="button" class="neuro-crit-rider-btn"
              data-actor-uuid="${actor.uuid}"
              data-item-id="${item.id}">
        🩸 Zastosuj: ${rider.effect?.label ?? item.name}
      </button>
    </div>`;

  await ChatMessage.create({
    content,
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
    flags: { [MODULE_ID]: { critRider: rider.rider } }
  });
}

/* -------------------------------------------- */
/*  Application (GM-driven)                      */
/* -------------------------------------------- */

async function onClickRider(event) {
  event.preventDefault();
  const btn = event.currentTarget;

  // Read the selection at *click* time, not at crit time, so the GM can take
  // the fiction detour first and still land the effect on the right token.
  const targets = canvas.tokens.controlled.filter(t => t.actor);
  if (!targets.length) {
    ui.notifications.warn("Zaznacz żeton ofiary, zanim zastosujesz efekt.");
    return;
  }

  const source = await fromUuid(btn.dataset.actorUuid);
  const item = source?.items?.get(btn.dataset.itemId);
  const rider = item?.getFlag(MODULE_ID, "bestiary")?.automation;
  if (!rider) return;

  for (const token of targets) await applyRider(token.actor, source, item, rider);

  btn.disabled = true;
  btn.textContent = "✔ Zastosowano";
}

async function applyRider(victim, source, item, rider) {
  let detail = "";
  if (rider.roll) {
    const roll = await new Roll(rider.roll).evaluate();
    detail = lookupTable(rider.table, roll.total) ?? String(roll.total);
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: source }),
      flavor: `${item.name} — ${victim.name}: ${detail}`
    });
  }

  const changes = (rider.effect?.changes ?? []).map(c => ({
    key: c.key,
    type: MODE[c.mode] ?? MODE.add,
    value: c.value,
    priority: 20
  }));

  await victim.createEmbeddedDocuments("ActiveEffect", [{
    name: detail ? `${rider.effect.label} (${detail})` : rider.effect.label,
    img: item.img,
    origin: source.uuid,
    disabled: false,
    // Permanent: it lasts "do czasu zastąpienia lub odrośnięcia" — there is no
    // duration that expresses that, so it is removed by hand when treated.
    duration: {},
    changes,
    flags: {
      [MODULE_ID]: {
        critRider: rider.rider,
        permanent: rider.effect?.permanent === true,
        detail
      }
    }
  }]);

  ui.notifications.info(`${victim.name}: ${rider.effect?.label ?? item.name}${detail ? ` — ${detail}` : ""}`);
}

/** Resolve "1-5" / "6-10" style keys against a rolled total. */
function lookupTable(table, total) {
  for (const [range, label] of Object.entries(table ?? {})) {
    const [lo, hi] = range.split("-").map(Number);
    if (total >= lo && total <= (Number.isFinite(hi) ? hi : lo)) return label;
  }
  return null;
}

/* -------------------------------------------- */
/*  Registration                                 */
/* -------------------------------------------- */

export function registerCritRiders() {
  Hooks.on("dnd5e.postRollAttack", onPostRollAttack);

  Hooks.on("dnd5e.renderChatMessage", (message, html) => {
    for (const btn of html.querySelectorAll(".neuro-crit-rider-btn")) {
      btn.addEventListener("click", onClickRider);
    }
  });

  console.log(`${MODULE_ID} | Crit riders registered (GM-applied, data-driven)`);
}
