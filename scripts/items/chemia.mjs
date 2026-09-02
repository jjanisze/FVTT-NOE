/**
 * Neuroshima 5e — Chemia, leki i narkotyki (runtime).
 *
 * `config/chemia-data.mjs` is the catalogue; this file is everything that cannot
 * be expressed as a plain Active Effect sitting on an item.
 *
 * ## Why the item's own Active Effects are applied by hand
 *
 * Every entry carries its effects on the item with `transfer: false`, exactly like
 * an SRD potion. What it does NOT do is list them in `activity.effects`, because
 * dnd5e's "apply effect" button on the usage card applies to *selected tokens* —
 * wrong for something you swallow, and wiring both paths would apply everything
 * twice. So the activity is a bare `utility` that spends a dose, and this module
 * hooks `dnd5e.postUseActivity` and copies the effects onto whoever spent it.
 * Same shape as `items/toolkit-medyk.mjs`.
 *
 * ## Deferred effects, and the honest limits of them
 *
 * dnd5e itself has no effect-expiry hook — but Foundry v13+ CORE does now
 * (`client/helpers/active-effect-registry.mjs`'s `ActiveEffectRegistry`, ticking on
 * `updateWorldTime` and every combat round/turn event — see `podpalenie.mjs` for it
 * already in use here, and DEV_GUIDE.md §10e for the full mechanism). That doesn't
 * change the conclusion below, though: its default `CONFIG.ActiveEffect.expiryAction`
 * ("update") only flips `duration.expired = true` — it never deletes the effect or
 * runs any of our logic on its own. So "when Anestix wears off, roll Kondycja" still
 * cannot hang directly off the effect; the only thing core buys us is correct
 * `duration.remaining` arithmetic to read, not the follow-up action itself.
 *
 * What this module does instead:
 *   1. applies the effect with a real dnd5e `duration`, so the token HUD counts down;
 *   2. records the follow-up on `flags.<mod>.chemiaPending`;
 *   3. watches `updateWorldTime` — Foundry's combat tracker advances world time by
 *      `CONFIG.time.roundTime` on every round (`Combat#nextRound` → `worldTime.delta`),
 *      so in tracked combat the resolution genuinely fires by itself;
 *   4. puts a **Rozlicz teraz** button on the usage card for everything else,
 *      because outside combat world time only moves when a human moves it.
 *
 * Nothing here pretends to automate what it does not. Anything left to the table
 * is declared in `mech.manual` and printed on the card under "Nie automatyzujemy".
 */

import {
  CHEMIA, CHEMIA_FLAVOR, CHEMIA_FLAVOR_DEFAULT, getChemia, chemiaEffectId, chemiaEffects
} from "../config/chemia-data.mjs";
import {
  addExhaustion, removeExhaustion, getExhaustionSources
} from "../config/exhaustion.mjs";
import { applyZranienie, getZranienieLvl, setZranienie } from "../combat/zranienie.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** `flags.<mod>.chemiaPending` — follow-ups waiting for their moment. */
const PENDING_FLAG = "chemiaPending";
/** `flags.<mod>.chemiaDoses` — `{ [key]: { day, count } }` for daily limits. */
const DOSES_FLAG = "chemiaDoses";
/** `flags.<mod>.chemiaPainkiller` — running dose count, cleared by a short rest. */
const PAINKILLER_FLAG = "chemiaPainkiller";

/* -------------------------------------------- */
/*  Registration                                 */
/* -------------------------------------------- */

export function registerChemia() {
  Hooks.on("dnd5e.preUseActivity", _onPreUseActivity);
  Hooks.on("dnd5e.postUseActivity", _onPostUseActivity);
  Hooks.on("updateWorldTime", _onWorldTime);
  Hooks.on("combatTurnChange", _onTurnChange);
  Hooks.on("dnd5e.restCompleted", _onRestCompleted);
  Hooks.on("renderChatMessageHTML", _onRenderChatMessage);

  console.log("Neuroshima 5e | Chemia registered");
}

/** Public API, exposed on `game.neuroshima.chemia` from main.mjs. */
export const chemiaApi = {
  take: takeChemia,
  pending: getPending,
  resolvePending,
  grant: grantChemia
};

/* -------------------------------------------- */
/*  Activity plumbing                            */
/* -------------------------------------------- */

/** Which catalogue entry, if any, an activity belongs to. */
function _keyOf(activity) {
  const key = activity?.flags?.[MODULE_ID]?.chemiaKey
    ?? activity?.item?.flags?.[MODULE_ID]?.chemiaKey;
  return CHEMIA[key] ? key : null;
}

/**
 * Suppress the native usage card — this module posts a card that actually says
 * what happened, and two cards per dose is noise. Chronic-disease medicines keep
 * the native card suppressed too, because the health panel posts their own.
 *
 * Four parameters, not three: `dnd5e.preUseActivity` passes `dialogConfig` before
 * `messageConfig` (mixin.mjs:222). Getting that wrong silently writes `create` onto
 * the dialog config and lets the native card through.
 */
function _onPreUseActivity(activity, _usageConfig, _dialogConfig, messageConfig) {
  if (!_keyOf(activity)) return;
  messageConfig.create = false;
}

/** Resolve the dose once dnd5e has spent the charge. */
async function _onPostUseActivity(activity, usageConfig, results) {
  const key = _keyOf(activity);
  if (!key) return;

  // `actors/health-panel.mjs` spends chronic-disease doses through the same
  // activity, but posts its own card with the remaining supply on it. It sets
  // this marker so one swallowed pill does not produce two cards.
  if (usageConfig?.neuroSilent) return;

  const actor = activity.actor;
  if (!actor) return;
  // `use()` runs on a clone; write to the real embedded item.
  const item = actor.items.get(activity.item?.id) ?? activity.item;

  await takeChemia(actor, key, { item });
}

/* -------------------------------------------- */
/*  Taking a dose                                */
/* -------------------------------------------- */

/**
 * Apply one dose of `key` to `actor` and report what happened.
 *
 * Does NOT consume anything — the activity's own `itemUses` consumption already
 * did that, and calling this straight from a macro is meant to be a free
 * "just apply the effects" entry point.
 *
 * @param {Actor} actor
 * @param {string} key                Catalogue key.
 * @param {object} [options]
 * @param {Item}   [options.item]     Source item, for effect data and card art.
 * @returns {Promise<string[]>}       The report lines that were posted.
 */
export async function takeChemia(actor, key, { item } = {}) {
  const def = getChemia(key);
  if (!def) throw new Error(`Unknown chemia entry "${key}"`);
  const m = def.mech ?? {};
  const lines = [];

  // Daily limit first: an over-limit dose may replace everything below.
  if (m.dailyMax) {
    const taken = _dosesToday(actor, key);
    if (taken >= m.dailyMax) {
      await _bumpDoses(actor, key);
      await _resolveOverdose(actor, def, key, lines);
      await _postCard(actor, def, key, item, lines);
      return lines;
    }
    await _bumpDoses(actor, key);
  }

  if (m.heal) await _applyHeal(actor, m.heal, lines);
  if (m.hpPerDose) await _applyPainkillerDose(actor, def, key, item, lines);
  if (m.clears) await _applyClears(actor, m.clears, lines);
  if (m.drink) await _applyDrink(actor, lines);

  if (m.effect) {
    if (m.delayRounds) {
      await _schedulePending(actor, {
        kind: "start", key, itemUuid: item?.uuid ?? null,
        at: game.time.worldTime + (m.delayRounds * (CONFIG.time?.roundTime ?? 6)),
        label: def.label
      });
      lines.push(`Zacznie działać za ${m.delayRounds} rund${m.delayRounds === 1 ? "ę" : "y"}.`);
    } else {
      await _applyEffect(actor, key, "effect", item, lines);
      await _scheduleAfter(actor, def, key, item, lines);
    }
  }

  if (m.side) await _rollSideEffect(actor, def, key, item, lines);
  if (m.rage) await _startRage(actor, def, key, item, lines);
  if (m.pendingRest) await _armPendingRest(actor, def, key, item, lines);

  await _postCard(actor, def, key, item, lines);
  return lines;
}

/* -------------------------------------------- */
/*  Individual mechanics                         */
/* -------------------------------------------- */

/** Roll and apply dice healing. */
async function _applyHeal(actor, heal, lines) {
  const formula = `${heal.number}d${heal.denomination}${heal.bonus ? ` + ${heal.bonus}` : ""}`;
  const roll = await new Roll(formula).evaluate();
  await actor.applyDamage([{ value: roll.total, type: "healing" }], { isDelta: true });
  lines.push(`Przywrócone PW: <strong>${roll.total}</strong> <em>(${formula})</em>.`);
}

/**
 * Painkiller: 1 PW per tablet, and every tablet is another −1 to Mądrość checks.
 * The penalty lives in one Active Effect that gets rebuilt on each dose, so the
 * changes never stack into a second effect the sheet would have to add up.
 */
async function _applyPainkillerDose(actor, def, key, item, lines) {
  const m = def.mech;
  await actor.applyDamage([{ value: m.hpPerDose, type: "healing" }], { isDelta: true });

  const state = actor.getFlag(MODULE_ID, PAINKILLER_FLAG) ?? { doses: 0 };
  const doses = state.doses + 1;
  await actor.setFlag(MODULE_ID, PAINKILLER_FLAG, { doses });

  const p = m.dosePenalty;
  const penalty = doses * p.perDose;
  const changes = [{
    key: `system.abilities.${p.ability}.bonuses.check`,
    mode: CONST.ACTIVE_EFFECT_MODES.ADD,
    value: String(penalty)
  }];

  const existing = _actorEffect(actor, key, "dosePenalty");
  if (existing) await existing.update({ changes });
  else await _applyEffect(actor, key, "dosePenalty", item, [], { changes });

  lines.push(`Przywrócone PW: <strong>${m.hpPerDose}</strong>. `
    + `Tabletek w organizmie: <strong>${doses}</strong> → <strong>${penalty}</strong> do testów Mądrości.`);

  const score = actor.system.abilities?.[p.ability]?.value ?? 10;
  if (p.unconsciousWhenOverAbility && doses > score) {
    await actor.toggleStatusEffect("unconscious", { active: true });
    lines.push(`<span class="bad">Kara przekroczyła Mądrość (${score}) — utrata przytomności.</span>`);
  }
}

/** Radiation, poison, exhaustion — whatever the dose washes out. */
async function _applyClears(actor, clears, lines) {
  if (clears.radiation) {
    await game.neuroshima?.conditions?.clearRadiation?.(actor);
    lines.push("Skażenie radioaktywne usunięte.");
  }

  if (clears.exhaustionSource) {
    let removed = 0;
    while (getExhaustionSources(actor).some(s => s.source === clears.exhaustionSource)) {
      await removeExhaustion(actor, clears.exhaustionSource, { chat: false });
      if (++removed > 6) break;
    }
    if (removed) lines.push(`Wyczerpanie ze Skażenia zdjęte (${removed}).`);
  }

  if (clears.exhaustion) {
    // RAW says "1 poziom", without naming a cause — take the most recent one.
    const sources = getExhaustionSources(actor);
    const last = sources[sources.length - 1];
    if (last) {
      await removeExhaustion(actor, last.source, { chat: false });
      lines.push(`Zdjęty 1 poziom Wyczerpania: <em>${last.label}</em>.`);
    } else {
      lines.push("Brak Wyczerpania do zdjęcia — dawka się marnuje.");
    }
  }

  if (clears.poisoned) {
    if (actor.statuses.has("poisoned")) {
      await actor.toggleStatusEffect("poisoned", { active: false });
      lines.push("Zatrucie usunięte.");
    } else {
      lines.push("Brak trucizn w organizmie.");
    }
  }
}

/** One portion of alcohol goes through the Upojenie track, not through us. */
async function _applyDrink(actor, lines) {
  const drink = game.neuroshima?.conditions?.drink;
  if (!drink) return;
  await drink(actor);
  lines.push("Porcja alkoholu — RO na Kondycję przeciw Upojeniu (osobna karta).");
}

/**
 * Copy one of the item's Active Effects onto the actor.
 * @param {object} [overrides] Merged into the effect data (Painkiller's changes).
 * @returns {Promise<ActiveEffect|null>}
 */
async function _applyEffect(actor, key, role, item, lines, overrides = {}) {
  const source = _sourceEffect(item, key, role);
  if (!source) return null;

  const data = foundry.utils.mergeObject(source, {
    origin: item?.uuid ?? actor.uuid,
    duration: source.duration?.seconds || source.duration?.rounds
      ? { ...source.duration, startTime: game.time.worldTime }
      : source.duration
  }, { inplace: false });
  foundry.utils.mergeObject(data, overrides);

  // Same drug twice = one refreshed effect, not two half-expired ones.
  const existing = _actorEffect(actor, key, role);
  if (existing) await existing.delete();

  const [created] = await actor.createEmbeddedDocuments("ActiveEffect", [data]);
  if (created && lines) lines.push(`Efekt: <strong>${created.name}</strong>${_durationText(created)}.`);
  return created ?? null;
}

/**
 * The RO that decides whether a side effect lands (RadOff's vomiting, AR-23's
 * scatterbrain). Rolled without a dialog — a side effect is not a player choice.
 */
async function _rollSideEffect(actor, def, key, item, lines) {
  const side = def.mech.side;
  const total = await _rollSave(actor, side.save);
  if (total === null) return;

  if (total >= side.save.dc) {
    lines.push(`${side.label}: RO ${_abilityLabel(side.save.ability)} `
      + `<strong>${total}</strong> vs ST ${side.save.dc} — <span class="good">zdane</span>.`);
    return;
  }
  lines.push(`${side.label}: RO ${_abilityLabel(side.save.ability)} `
    + `<strong>${total}</strong> vs ST ${side.save.dc} — <span class="bad">oblane</span>.`);
  if (side.effect) await _applyEffect(actor, key, "side", item, lines);
}

/**
 * Szał bojowy as a real state, not just an announcement.
 *
 * Worth saying plainly: the szał in `actors/disease-effects.mjs` is a *trigger* —
 * it rolls a k100 on a failed test and posts a card. It applies nothing and
 * forces nothing. AR-35's szał is a condition you are in, so it gets its own
 * Active Effect here; only the card styling (`.neuro-rage-card`) is shared.
 */
async function _startRage(actor, def, key, item, lines) {
  const rage = def.mech.rage;
  await _applyEffect(actor, key, "rage", item, null);
  lines.push(`<span class="bad">SZAŁ BOJOWY.</span> Na końcu każdej tury RO `
    + `${_abilityLabel(rage.endSave.ability)} ST ${rage.endSave.dc}, żeby go przerwać.`);
}

/** Trybiotyl: the ointment does its work during the rest, not now. */
async function _armPendingRest(actor, def, key, item, lines) {
  const pr = def.mech.pendingRest;
  await _applyEffect(actor, key, "pendingRest", item, null);
  await _schedulePending(actor, {
    kind: "rest", key, itemUuid: item?.uuid ?? null, rest: pr.rest, label: def.label
  });
  lines.push(`${pr.label} — zadziała po ${pr.rest === "shortRest" ? "Krótkim" : "Długim"} Odpoczynku.`);
}

/** Book the "after it wears off" resolution against world time. */
async function _scheduleAfter(actor, def, key, item, lines) {
  const after = def.mech.after;
  if (!after) return;
  const seconds = def.mech.effect?.seconds
    ?? (def.mech.effect?.rounds ?? 0) * (CONFIG.time?.roundTime ?? 6);
  await _schedulePending(actor, {
    kind: "after", key, itemUuid: item?.uuid ?? null,
    at: game.time.worldTime + seconds, label: after.label
  });
}

/* -------------------------------------------- */
/*  Daily limits                                 */
/* -------------------------------------------- */

/** Current world day index — the same counter „Zachód słońca” advances. */
function _today() {
  return game.settings.get(MODULE_ID, "dayCounter");
}

function _dosesToday(actor, key) {
  const rec = (actor.getFlag(MODULE_ID, DOSES_FLAG) ?? {})[key];
  return rec?.day === _today() ? (rec.count ?? 0) : 0;
}

async function _bumpDoses(actor, key) {
  const all = foundry.utils.deepClone(actor.getFlag(MODULE_ID, DOSES_FLAG) ?? {});
  const day = _today();
  all[key] = all[key]?.day === day ? { day, count: all[key].count + 1 } : { day, count: 1 };
  await actor.setFlag(MODULE_ID, DOSES_FLAG, all);
}

/**
 * What exceeding `dailyMax` costs. Medpak just wastes the dose; AR-35 rolls for
 * your life — and that roll is automated, but flipping a character to dead is
 * not, so the card hands the GM a button instead of doing it behind their back.
 */
async function _resolveOverdose(actor, def, key, lines) {
  const od = def.mech.overdose ?? {};
  if (od.noEffect) {
    lines.push(`<span class="bad">${od.label ?? "Przedawkowanie"}.</span> ${od.text ?? ""}`);
    return;
  }
  if (!od.chance) return;

  const roll = await new Roll("1d100").evaluate();
  const died = roll.total <= od.chance;
  lines.push(`<span class="bad">${od.label ?? "Przedawkowanie"}.</span> ${od.text ?? ""} `
    + `k100 = <strong>${roll.total}</strong> vs ${od.chance}% — `
    + (died
      ? `<span class="bad">serce nie wytrzymuje</span>.`
      : `<span class="good">serce wytrzymuje</span>.`));
  if (died) {
    await actor.update({ "system.attributes.hp.value": 0 });
    lines.push(`<button type="button" class="neuro-chemia-dead" data-actor-id="${actor.id}">`
      + `Potwierdź śmierć</button>`);
  }
}

/* -------------------------------------------- */
/*  Pending resolutions                          */
/* -------------------------------------------- */

/** @returns {object[]} pending entries (fresh array, safe to mutate). */
export function getPending(actor) {
  return foundry.utils.deepClone(actor.getFlag(MODULE_ID, PENDING_FLAG) ?? []);
}

async function _schedulePending(actor, entry) {
  const list = getPending(actor);
  list.push({ id: foundry.utils.randomID(12), ...entry });
  await actor.setFlag(MODULE_ID, PENDING_FLAG, list);
}

async function _dropPending(actor, id) {
  const list = getPending(actor).filter(p => p.id !== id);
  if (list.length) await actor.setFlag(MODULE_ID, PENDING_FLAG, list);
  else await actor.unsetFlag(MODULE_ID, PENDING_FLAG);
}

/**
 * World time moved. Anything whose window has closed gets resolved now.
 * GM-only: this must happen once, not once per connected client.
 */
async function _onWorldTime() {
  if (!game.user.isActiveGM) return;
  for (const actor of game.actors) {
    for (const p of getPending(actor)) {
      if (p.at == null || game.time.worldTime < p.at) continue;
      await resolvePending(actor, p.id);
    }
  }
}

/**
 * Resolve one pending follow-up — from the clock, or from the card's button.
 * @param {Actor} actor
 * @param {string} pendingId
 */
export async function resolvePending(actor, pendingId) {
  const p = getPending(actor).find(e => e.id === pendingId);
  if (!p) return;
  await _dropPending(actor, p.id);

  const def = getChemia(p.key);
  if (!def) return;
  const item = p.itemUuid ? await fromUuid(p.itemUuid).catch(() => null) : null;
  const lines = [];

  if (p.kind === "start") {
    await _applyEffect(actor, p.key, "effect", item, lines);
    await _scheduleAfter(actor, def, p.key, item, lines);
  } else if (p.kind === "after") {
    await _resolveAfter(actor, def, p.key, lines);
  } else if (p.kind === "rest") {
    await _resolveRestPending(actor, def, p.key, lines);
  }

  if (lines.length) await _postCard(actor, def, p.key, item, lines, { head: p.label });
}

/** The bill comes due: the effect has run out, roll for what it cost. */
async function _resolveAfter(actor, def, key, lines) {
  const after = def.mech.after;
  const live = _actorEffect(actor, key, "effect");
  if (live) await live.delete();

  lines.push(after.text ?? "");
  const total = await _rollSave(actor, after.save);
  if (total === null) return;

  if (total >= after.save.dc) {
    lines.push(`RO ${_abilityLabel(after.save.ability)} <strong>${total}</strong> `
      + `vs ST ${after.save.dc} — <span class="good">zdane</span>.`);
    return;
  }

  const margin = after.save.dc - total;
  lines.push(`RO ${_abilityLabel(after.save.ability)} <strong>${total}</strong> `
    + `vs ST ${after.save.dc} — <span class="bad">oblane</span>.`);

  const fail = after.onFail ?? {};
  if (fail.hpToOne) {
    await actor.update({ "system.attributes.hp.value": 1 });
    lines.push("PW spadają do <strong>1</strong>.");
  }
  if (fail.exhaustion) {
    await addExhaustion(actor, fail.exhaustion, { chat: false });
    lines.push("Poziom Wyczerpania.");
  }
  let wounds = fail.zranienie ?? 0;
  if (fail.extraOnMargin && margin >= fail.extraOnMargin.by) {
    wounds += fail.extraOnMargin.zranienie ?? 0;
    lines.push(`Porażka o ${margin} — dodatkowy Stopień Zranienia.`);
  }
  for (let i = 0; i < wounds; i++) await applyZranienie(actor, def.label);
}

/** Trybiotyl's ointment cashing in after the rest. */
async function _resolveRestPending(actor, def, key, lines) {
  const pr = def.mech.pendingRest;
  const marker = _actorEffect(actor, key, "pendingRest");
  if (marker) await marker.delete();

  const delta = pr.apply?.zranienie ?? 0;
  if (delta) {
    const level = getZranienieLvl(actor);
    const next = Math.max(0, level + delta);
    await setZranienie(actor, next);
    lines.push(`Stopień Zranienia: ${level} → <strong>${next}</strong>.`);
  }
}

/** Rests clear what rests clear. */
async function _onRestCompleted(actor, result) {
  if (!game.user.isActiveGM) return;
  const longRest = result?.longRest ?? result?.type === "long";

  // Painkiller's fog lifts after a short rest, and a long rest includes one.
  const pk = actor.getFlag(MODULE_ID, PAINKILLER_FLAG);
  if (pk?.doses) {
    await actor.unsetFlag(MODULE_ID, PAINKILLER_FLAG);
    await _actorEffect(actor, "painkiller", "dosePenalty")?.delete();
  }

  // Effects with no dnd5e duration that were declared `untilLongRest`.
  if (longRest) {
    for (const e of actor.effects) {
      if (e.flags?.[MODULE_ID]?.clearOn === "longRest") await e.delete();
    }
  }

  for (const p of getPending(actor)) {
    if (p.kind !== "rest") continue;
    if (p.rest === "longRest" && !longRest) continue;
    await resolvePending(actor, p.id);
  }
}

/* -------------------------------------------- */
/*  Combat ticks — regeneration and szał         */
/* -------------------------------------------- */

/**
 * Deadline regenerates at the start of a turn, and szał asks for a RO at the end
 * of one — so this listens to `combatTurnChange`, which hands over both the turn
 * that just finished and the one starting, rather than `updateCombat`, where
 * `combat.combatant` has already moved on and the szał RO would land on the
 * wrong character.
 *
 * Both only exist inside a tracked combat; outside it, `mech.manual` says so.
 */
async function _onTurnChange(combat, previous, current) {
  if (!game.user.isActiveGM) return;

  const ended = combat.combatants.get(previous?.combatantId)?.actor ?? null;
  const started = combat.combatants.get(current?.combatantId)?.actor ?? null;

  // End of turn: roll to come out of the szał.
  if (ended) {
    // Snapshot — `_offerRageEnd` deletes effects, and deleting mid-iteration
    // over a live EmbeddedCollection skips entries.
    for (const effect of [...ended.effects]) {
      const f = effect.flags?.[MODULE_ID];
      if (f?.chemiaRole !== "rage") continue;
      const def = getChemia(f.chemiaKey);
      if (def?.mech?.rage) await _offerRageEnd(ended, def, f.chemiaKey, effect);
    }
  }

  // Start of turn: regeneration ticks.
  if (started) {
    for (const effect of [...started.effects]) {
      const f = effect.flags?.[MODULE_ID];
      if (f?.chemiaRole !== "effect") continue;
      const def = getChemia(f.chemiaKey);
      if (!def?.mech?.regen) continue;

      await started.applyDamage([{ value: def.mech.regen.hp, type: "healing" }], { isDelta: true });
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: started }),
        content: `<div class="neuro-chemia-card"><div class="neuro-chemia-head">`
          + `<i class="fa-solid fa-heart-pulse"></i> ${def.label}</div>`
          + `<div class="neuro-chemia-line">Regeneracja: +${def.mech.regen.hp} PW.</div></div>`
      });
    }
  }
}

/** End-of-turn RO to come out of the szał, and the crash that follows. */
async function _offerRageEnd(actor, def, key, effect) {
  const rage = def.mech.rage;
  const total = await _rollSave(actor, rage.endSave);
  if (total === null) return;

  const ended = total >= rage.endSave.dc;
  if (ended) {
    await effect.delete();
    const immunity = _actorEffect(actor, key, "effect");
    if (immunity) await immunity.delete();
    if (rage.after?.effect) await _applyEffect(actor, key, "rageAfter", null, null);
  }

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-rage-card ${ended ? "" : "is-raging"}">
      <div class="neuro-rage-head"><i class="fa-solid fa-face-angry"></i> ${def.label}</div>
      <div class="neuro-rage-body">RO ${_abilityLabel(rage.endSave.ability)} `
      + `<strong>${total}</strong> vs ST ${rage.endSave.dc} — ${ended
        ? `szał ustaje, ${actor.name} pada Obezwładniony.`
        : `<strong>szał trwa</strong>.`}</div></div>`
  });
}

/* -------------------------------------------- */
/*  Chat card                                    */
/* -------------------------------------------- */

/** Post the "what this dose did" card, including what it deliberately did not. */
async function _postCard(actor, def, key, item, lines, { head } = {}) {
  const pool = CHEMIA_FLAVOR[key] ?? CHEMIA_FLAVOR_DEFAULT;
  const flavor = pool[Math.floor(Math.random() * pool.length)]
    .replace("{a}", actor.name)
    .replace("{m}", def.label);

  const pending = getPending(actor).filter(p => p.key === key && p.at != null);
  const buttons = pending.map(p =>
    `<button type="button" class="neuro-chemia-resolve" data-actor-id="${actor.id}" `
    + `data-pending-id="${p.id}">Rozlicz teraz: ${p.label}</button>`).join("");

  const manual = def.mech?.manual
    ? `<div class="neuro-chemia-manual"><strong>Nie automatyzujemy:</strong> ${def.mech.manual}</div>`
    : "";

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-chemia-card">
      <div class="neuro-chemia-head">
        <img class="neuro-chemia-icon" src="${item?.img ?? def.img ?? "icons/svg/pill.svg"}" alt="">
        ${head ?? def.label}
      </div>
      <div class="neuro-chemia-flavor">${flavor}</div>
      ${lines.filter(Boolean).map(l => `<div class="neuro-chemia-line">${l}</div>`).join("")}
      ${buttons ? `<div class="neuro-chemia-actions">${buttons}</div>` : ""}
      ${manual}
    </div>`,
    flags: { [MODULE_ID]: { chemia: { key, actorId: actor.id } } }
  });
}

/** Wire the card's buttons. */
function _onRenderChatMessage(message, html) {
  if (!message.flags?.[MODULE_ID]?.chemia) return;

  for (const btn of html.querySelectorAll(".neuro-chemia-resolve")) {
    btn.addEventListener("click", async ev => {
      ev.preventDefault();
      btn.disabled = true;
      const actor = game.actors.get(btn.dataset.actorId);
      if (actor) await resolvePending(actor, btn.dataset.pendingId);
    });
  }

  for (const btn of html.querySelectorAll(".neuro-chemia-dead")) {
    if (!game.user.isGM) { btn.remove(); continue; }
    btn.addEventListener("click", async ev => {
      ev.preventDefault();
      btn.disabled = true;
      const actor = game.actors.get(btn.dataset.actorId);
      if (actor) await actor.toggleStatusEffect("dead", { active: true });
    });
  }
}

/* -------------------------------------------- */
/*  Helpers                                      */
/* -------------------------------------------- */

/**
 * The effect template for one `mech` slot.
 *
 * The catalogue is the fallback and usually the *only* source, because a
 * single-dose consumable has `autoDestroy` — by the time `postUseActivity` fires,
 * the item that carried the effects has already deleted itself. The item is
 * consulted first anyway so a GM who hand-edits an effect on a specific vial
 * gets what they edited.
 */
function _sourceEffect(item, key, role) {
  const id = chemiaEffectId(key, role);
  const onItem = item?.effects?.get?.(id);
  if (onItem) return onItem.toObject();
  return chemiaEffects(key).find(e => e._id === id) ?? null;
}

/** The live copy of a chemia effect on an actor, if any. */
function _actorEffect(actor, key, role) {
  return actor.effects.find(e =>
    e.flags?.[MODULE_ID]?.chemiaKey === key && e.flags?.[MODULE_ID]?.chemiaRole === role) ?? null;
}

/**
 * Roll a saving throw with no dialog. `configure: false` matters — without it
 * dnd5e opens a dialog, which hangs anything driving this programmatically.
 * @returns {Promise<number|null>}
 */
async function _rollSave(actor, save) {
  const rolls = await actor.rollSavingThrow(
    { ability: save.ability, target: save.dc },
    { configure: false },
    { create: true }
  );
  const roll = Array.isArray(rolls) ? rolls[0] : rolls;
  return roll?.total ?? null;
}

function _abilityLabel(ability) {
  return CONFIG.DND5E.abilities?.[ability]?.label ?? ability.toUpperCase();
}

function _durationText(effect) {
  const s = effect.duration?.seconds;
  if (s) return s >= 60 ? ` (${Math.round(s / 60)} min)` : ` (${s} s)`;
  const r = effect.duration?.rounds;
  return r ? ` (${r} rund)` : "";
}

/**
 * Put a catalogue entry into someone's hands — for macros and shop payouts.
 * Prefers the compendium so the world keeps one source of truth.
 * @param {Actor} actor
 * @param {string} key
 * @param {number} [quantity=1]
 * @returns {Promise<Item|null>}
 */
async function grantChemia(actor, key, quantity = 1) {
  const def = getChemia(key);
  if (!def) throw new Error(`Unknown chemia entry "${key}"`);

  const pack = game.packs.get(`${MODULE_ID}.lekarstwa`);
  const index = pack?.index.find(e => e.name === def.label);
  if (!index) {
    ui.notifications.warn(`Brak „${def.label}” w kompendium lekarstw — zbuduj pack.`);
    return null;
  }
  const doc = await pack.getDocument(index._id);
  const data = doc.toObject();
  delete data._id;
  data.system.quantity = quantity;
  const [created] = await actor.createEmbeddedDocuments("Item", [data]);
  return created ?? null;
}
