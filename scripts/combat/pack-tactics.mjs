/**
 * Neuroshima 5e — Współpraca (pack tactics) for Bestiariusz creatures.
 *
 * "Ma Ułatwienie w Testach Ataku, jeśli w zasięgu 1,5 m od celu znajduje się
 * choć jeden jego sojusznik, który jest przytomny." — ten creatures share this
 * wording verbatim, so it is implemented once and driven by the `packTactics`
 * automation descriptor from `dev/bestiary/gen_bestiary.py`.
 *
 * ## Why this cannot be an Active Effect
 *
 * dnd5e core has no flag-based advantage system — there is no
 * `flags.dnd5e.advantage.attack.*` for an effect to write to (that is
 * MIDI-QOL/DAE, neither of which is installed). Conditional advantage therefore
 * has to be decided at roll time, which is what
 * `dnd5e.postBuildAttackRollConfig` is for. `disease-effects.mjs`,
 * `levelled-conditions.mjs` and `weapons/addons.mjs` all inject into the same
 * hook.
 *
 * Unlike the crit riders this one *is* applied automatically. It is a pure
 * geometric fact with no narrative weight — there is no judgement call for the
 * GM to make about whether another Bit-Boy is standing next to the target — so
 * stopping to ask would be friction, not control.
 */

const MODULE_ID = "neuroshima-2026-overrides";

/** Grid distance in scene units between two placed tokens. */
function distanceBetween(a, b) {
  return canvas.grid.measurePath([a.center ?? a, b.center ?? b]).distance;
}

/**
 * Find a conscious ally adjacent to the target.
 * @param {Token} attackerToken
 * @param {Token} targetToken
 * @param {number} range   metres
 * @returns {Token|null}
 */
function findSupportingAlly(attackerToken, targetToken, range) {
  for (const token of canvas.tokens.placeables) {
    if (!token.actor) continue;
    if (token.id === attackerToken.id) continue;
    // Same side as the attacker — Bestiariusz creatures are hostile, and a
    // rival gang member is still "sojusznik" for this purpose.
    if (token.document.disposition !== attackerToken.document.disposition) continue;
    // "który jest przytomny"
    const hp = token.actor.system?.attributes?.hp?.value ?? 1;
    if (hp <= 0) continue;
    if (token.actor.statuses?.has("unconscious") || token.actor.statuses?.has("incapacitated")) continue;
    if (distanceBetween(token, targetToken) > range) continue;
    return token;
  }
  return null;
}

/** The packTactics descriptor on an actor, if it has one. */
function packTacticsFor(actor) {
  for (const item of actor?.items ?? []) {
    const auto = item.getFlag(MODULE_ID, "bestiary")?.automation;
    if (auto?.kind === "packTactics") return { item, range: auto.range ?? 1.5 };
  }
  return null;
}

function onPostBuildAttackRollConfig(config) {
  try {
    const actor = config?.subject?.item?.actor ?? config?.subject?.actor;
    if (!actor) return;

    const pack = packTacticsFor(actor);
    if (!pack) return;

    const attackerToken = actor.getActiveTokens?.()[0];
    if (!attackerToken) return;

    // dnd5e stores the current target set on the user.
    const targetToken = Array.from(game.user.targets ?? [])[0];
    if (!targetToken) return;

    const ally = findSupportingAlly(attackerToken, targetToken, pack.range);
    if (!ally) return;

    for (const roll of config.rolls ?? []) {
      roll.options ??= {};
      roll.options.advantage = true;
    }
    console.log(`${MODULE_ID} | Współpraca: ${actor.name} ma Ułatwienie (wsparcie: ${ally.name})`);
  } catch (err) {
    console.error(`${MODULE_ID} | pack tactics failed`, err);
  }
}

export function registerPackTactics() {
  Hooks.on("dnd5e.postBuildAttackRollConfig", onPostBuildAttackRollConfig);
  console.log(`${MODULE_ID} | Pack tactics registered (Współpraca)`);
}
