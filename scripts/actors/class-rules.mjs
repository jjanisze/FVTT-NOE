/**
 * Neuroshima 5e — multiclass non-stacking rules.
 *
 * Rulebook (§ Wieloklasowość):
 *   - TT bonuses from different classes do not stack — take the highest.
 *   - Drugi atak does not stack.
 *
 * Two families are affected, declared via `exclusiveGroup` in
 * `class-features-data.mjs`:
 *
 *   unarmoredAc   Goła klata (Brutal), Tarcza wiary (Kaznodzieja),
 *                 Obłęd Berserkera (part of Berserk)
 *                 -> the rulebook says outright: "Ta zdolność nie łączy się
 *                    z podobnie działającymi zdolnościami innych klas."
 *
 *   extraAttack   Drugi atak (Brutal/Twardziel/Zwiadowca), Trzeci atak (Twardziel)
 *                 -> the highest tier wins; a character with Drugi atak from two
 *                    classes still attacks twice, not three times.
 *
 * Rather than mutate the actor, this reports the winner and greys the losers on
 * the sheet, so the GM can see *why* a feature is inert.
 */

import { CLASS_FEATURES } from "../config/class-features-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Within a group, higher rank wins. Unlisted ids rank 0. */
const GROUP_RANK = {
  extraAttack: { "drugi-atak": 1, "trzeci-atak": 2 }
};

/**
 * Unarmoured-AC formulas, evaluated to pick the best one for this actor.
 * Only meaningful while wearing no armour, helmet or shield.
 */
const UNARMORED_AC = {
  "gola-klata":   a => 10 + (a.system.abilities?.dex?.mod ?? 0) + (a.system.abilities?.con?.mod ?? 0),
  "tarcza-wiary": a => 10 + (a.system.abilities?.cha?.mod ?? 0)
};

/** Is the actor wearing anything that disables the unarmoured-AC features? */
export function isUnarmoured(actor) {
  return !actor.items.some(i =>
    i.type === "equipment"
    && i.system.equipped
    && ["light", "medium", "heavy", "shield"].includes(i.system.type?.value));
}

/**
 * Resolve every exclusive group on an actor.
 * @returns {Record<string, {winner: string|null, suppressed: string[]}>}
 */
export function resolveExclusiveGroups(actor) {
  const groups = {};

  for (const item of actor.items) {
    const abilityId = item.getFlag(MODULE_ID, "abilityId");
    if (!abilityId) continue;
    const group = CLASS_FEATURES[abilityId]?.exclusiveGroup;
    if (!group) continue;
    (groups[group] ??= []).push(abilityId);
  }

  const out = {};
  for (const [group, ids] of Object.entries(groups)) {
    if (ids.length <= 1) { out[group] = { winner: ids[0] ?? null, suppressed: [] }; continue; }

    let winner;
    if (group === "unarmoredAc") {
      winner = ids
        .map(id => ({ id, value: UNARMORED_AC[id]?.(actor) ?? -Infinity }))
        .sort((a, b) => b.value - a.value)[0]?.id ?? ids[0];
    } else {
      const rank = GROUP_RANK[group] ?? {};
      winner = [...ids].sort((a, b) => (rank[b] ?? 0) - (rank[a] ?? 0))[0];
    }

    out[group] = { winner, suppressed: ids.filter(id => id !== winner) };
  }
  return out;
}

/* -------------------------------------------- */

function _onRenderSheet(app, html) {
  const actor = app.document ?? app.actor;
  if (actor?.type !== "character") return;

  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;

  const groups = resolveExclusiveGroups(actor);
  const suppressed = new Map();
  for (const [group, { winner, suppressed: ids }] of Object.entries(groups)) {
    for (const id of ids) suppressed.set(id, { group, winner });
  }
  if (!suppressed.size) return;

  for (const item of actor.items) {
    const abilityId = item.getFlag(MODULE_ID, "abilityId");
    const info = abilityId ? suppressed.get(abilityId) : null;
    if (!info) continue;

    const row = root.querySelector(`[data-item-id="${item.id}"]`);
    if (!row) continue;

    row.classList.add("neuro-suppressed-feature");
    const winnerLabel = CLASS_FEATURES[info.winner]?.label ?? info.winner;
    row.dataset.tooltip = `Nie łączy się z: ${winnerLabel} (reguła wieloklasowości). `
      + `Aktywna pozostaje tylko jedna zdolność z tej grupy.`;
  }
}

export function registerClassRules() {
  for (const hook of ["renderCharacterActorSheet", "renderActorSheet"]) {
    Hooks.on(hook, _onRenderSheet);
  }

  const mod = game.modules?.get(MODULE_ID);
  if (mod) {
    mod.api ??= {};
    mod.api.classRules = { resolveExclusiveGroups, isUnarmoured };
  }

  console.log(`${MODULE_ID} | Multiclass non-stacking rules registered`);
}
