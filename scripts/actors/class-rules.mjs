/**
 * Neuroshima 5e — multiclass non-stacking rules.
 *
 * Rulebook (§ Wieloklasowość, s. 59):
 *   - Only one way of computing TT at a time — the highest wins.
 *   - Drugi atak does not stack.
 *
 * Two families are affected, declared via `exclusiveGroup` in
 * `class-features-data.mjs`:
 *
 *   unarmoredAc   Goła klata (Brutal), Tarcza wiary (Kaznodzieja) — TT *methods*.
 *                 The TT itself is applied by the TT engine (`config/tt-rules.mjs`,
 *                 `actors/tt.mjs`), which picks the best method every time data is
 *                 prepared. Obłęd Berserkera is a bonus on top of any method (D1/D2),
 *                 not a member of this group. Here we only grey the method that loses
 *                 *regardless of equipment* (PLAN_tt P10); a momentarily inactive one
 *                 (helmet, armour) is explained in the TT tooltip instead.
 *
 *   extraAttack   Drugi atak (Brutal/Twardziel/Zwiadowca), Trzeci atak (Twardziel)
 *                 -> the highest tier wins; a character with Drugi atak from two
 *                    classes still attacks twice, not three times.
 *
 * Rather than mutate the actor, this reports the winner and greys the losers on
 * the sheet, so the GM can see *why* a feature is inert.
 */

import { CLASS_FEATURES } from "../config/class-features-data.mjs";
import { ttSnapshot } from "./tt.mjs";
import { permanentlyLosingMethods } from "../config/tt-rules.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Within a group, higher rank wins. Unlisted ids rank 0. */
const GROUP_RANK = {
  extraAttack: { "drugi-atak": 1, "trzeci-atak": 2 }
};

/** TT engine method id → class feature id. */
const TT_METHOD_FEATURE = { golaKlata: "gola-klata", tarczaWiary: "tarcza-wiary" };

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

    if (group === "unarmoredAc") {
      const losing = new Set(permanentlyLosingMethods(ttSnapshot(actor)).map(m => TT_METHOD_FEATURE[m]));
      const suppressed = ids.filter(id => losing.has(id));
      out[group] = { winner: ids.find(id => !losing.has(id)) ?? null, suppressed };
      continue;
    }

    const rank = GROUP_RANK[group] ?? {};
    const winner = [...ids].sort((a, b) => (rank[b] ?? 0) - (rank[a] ?? 0))[0];
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
    row.dataset.tooltip = info.group === "unarmoredAc"
      ? `Zawsze słabsza od: ${winnerLabel} — liczy się tylko jeden sposób obliczania TT (s. 59). `
        + `Rozkład TT: dymek przy TT na karcie.`
      : `Nie łączy się z: ${winnerLabel} (reguła wieloklasowości). `
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
    mod.api.classRules = { resolveExclusiveGroups };
  }

  console.log(`${MODULE_ID} | Multiclass non-stacking rules registered`);
}
