/**
 * Neuroshima 5e — one baseline `token.sight.range` for the whole batch-imported cast.
 *
 * Before: the 18 characters imported together in one batch (same `_stats.createdTime`, down
 * to the second) each carry a different `prototypeToken.sight.range` — 5, 8, 9 or 0 m, with no
 * correlation to WIS, passive Perception, race or anything else on the sheet (checked live:
 * Kier — WIS 12, passive Perception 11 — sits at 5m; Piekarz — WIS 8, passive Perception 9 —
 * sits at 9m, the opposite of what a stat-driven formula would produce). Nobody in the batch has
 * any real darkvision (`senses.ranges.darkvision` is 0 across the board), so this was never a
 * rules-driven number to begin with. Almost certainly a leftover per-token setting from
 * whatever this cast's vision was configured as before this project's own tooling existed —
 * `tokens/README.md` already documents the same migration needing to replace Roll20-era token
 * *art*; this is the sight-range equivalent, just never noticed because no scene enforced
 * `tokenVision` until the recent NVG/thermal dungeon scenes made it visible (`PLAN_nvg_thermal.md`).
 *
 * After: every batch-cast character's `prototypeToken.sight.range`, and every already-placed
 * token's own `sight.range` (across every scene, not just the one being viewed — see
 * `vision-sources.mjs`'s own `getDependentTokens` fix for why `getActiveTokens` is the wrong
 * primitive here), lands on `BASELINE_SIGHT_RANGE`.
 *
 * ── WHY A NON-ZERO BASELINE AT ALL ──────────────────────────────────────────────
 * RAW-pure would be 0m (no special sense = no sight in total darkness, full stop). Deliberately
 * not what got picked: a GM call (this file's whole reason to ask rather than assume) settled on
 * "you can always spot your own token, and feel what's within arm's reach — including a creature
 * standing right next to you" over true blindness. Confirmed live on Piekarz in "Silos Poziom
 * Górny" before picking this: at `range: 0` the token's own square renders in full (Foundry's
 * vision polygon trivially includes its own zero-distance origin) but *nothing* adjacent does —
 * not even a hint of the floor a tile over. `range: 1.5` (exactly one grid unit here — this
 * scene's `grid.distance` is 1.5m/square) was the value that actually got eyeballed against a
 * screenshot and confirmed: the halo reaches roughly half of a directly-adjacent tile at its
 * nearest point, tapering off toward the corners — "if Lorentz stands next to Piekarz, both
 * at least partially see each other" without opening up general darkvision-grade sight.
 *
 * ── WHY THE OVERRIDE-AWARE BRANCH ────────────────────────────────────────────────
 * A token currently mid-way through a Noktowizor/Termowizor session has `sight.range` sitting at
 * that device's own override (see `gogle.mjs`'s `GOGLE_NOKTO_RANGE`/`GOGLE_TERMO_RANGE`), with the
 * token's *true* baseline stashed on `flags.MODULE_ID.visionRangeBackup`
 * (`vision-sources.mjs`'s "sightRange is the mechanic" doc section) for `syncActorVision` to
 * restore once the device turns off. Overwriting `sight.range` directly on such a token would
 * silently corrupt nothing *today* (the device is still on) but would restore to the *old* baseline
 * the moment it switches off, undoing this migration invisibly. So: if the backup flag is present,
 * this rewrites the flag instead of `sight.range` — the device stays exactly as it is right now,
 * and whenever it does turn off, it now restores to the new baseline rather than the old one.
 *
 * Usage (console or macro), same shape as this file's siblings:
 *   const api = game.modules.get("neuroshima-2026-overrides").api.migration;
 *   await api.normalizeSightRange();                    // dry run, prints a report
 *   await api.normalizeSightRange({ commit: true });    // apply
 *   await api.normalizeSightRange({ actors: ["Piekarz"], commit: true });
 */

const MODULE_ID = "neuroshima-2026-overrides";
const VISION_RANGE_BACKUP_FLAG = "visionRangeBackup"; // must match vision-sources.mjs

/** m — see this file's "why a non-zero baseline" doc section for how this number was picked. */
export const BASELINE_SIGHT_RANGE = 1.5;

/**
 * The batch import's own roster (same `_stats.createdTime`, confirmed live) — deliberately a
 * fixed list, not "every character actor", so a future one-off NPC-as-character sheet or test
 * actor never gets silently swept in. Pass `{ actors: [...] }` to narrow further; there is no way
 * to widen past this list short of editing it.
 */
export const BATCH_CAST = [
  "Adam", "Bob", "Buźka", "Carson", "Dante", "Droer Quiyusti", "Góra", "Iris", "Kier",
  "Kluczyk", "Laffitte", "Lorentz", "Meksyk", "Piekarz", "Przydupas", "Raynald of Châtillon",
  "Rish Scerki", "Victor von Blitz",
];

/**
 * @param {object} [options]
 * @param {boolean} [options.commit=false] Dry run by default, same convention as this file's
 *   siblings (`migrateClasses`/`migratePochodzenia`) — prints what *would* change and does nothing
 *   until called again with `commit: true`.
 * @param {string[]} [options.actors] Restrict to these actor names instead of the full BATCH_CAST.
 * @param {number} [options.baseline=BASELINE_SIGHT_RANGE] Override the target range.
 */
export async function normalizeSightRange({ commit = false, actors = null, baseline = BASELINE_SIGHT_RANGE } = {}) {
  const names = actors ?? BATCH_CAST;
  const report = [];

  for (const name of names) {
    const actor = game.actors.find(a => a.name === name);
    if (!actor) { report.push({ aktor: name, status: "pominięto", powód: "nie znaleziono aktora" }); continue; }

    const protoRange = actor.prototypeToken.sight.range;
    const tokens = actor.getDependentTokens?.({ linked: true }) ?? [];
    const tokenRows = tokens.map(doc => {
      const backup = doc.getFlag(MODULE_ID, VISION_RANGE_BACKUP_FLAG);
      const overridden = backup != null;
      return {
        scene: doc.parent?.name ?? "?",
        current: overridden ? `${doc.sight.range} (urządzenie aktywne, backup=${backup})` : doc.sight.range,
        target: overridden ? `bez zmian (backup → ${baseline})` : baseline,
        doc, overridden, backup,
      };
    });

    report.push({
      aktor: name,
      "prototypeToken.sight.range": `${protoRange} → ${baseline}`,
      "placed tokens": tokenRows.map(r => `${r.scene}: ${r.current} → ${r.target}`).join("; ") || "(brak)",
      status: commit ? "zmigrowano" : "gotowe do migracji",
    });

    if (!commit) continue;

    if (protoRange !== baseline) await actor.update({ "prototypeToken.sight.range": baseline });
    for (const row of tokenRows) {
      if (row.overridden) {
        if (row.backup !== baseline) await row.doc.setFlag(MODULE_ID, VISION_RANGE_BACKUP_FLAG, baseline);
      } else if (row.doc.sight.range !== baseline) {
        await row.doc.update({ "sight.range": baseline });
      }
    }
  }

  _printReport(report, commit);
  return report;
}

function _printReport(report, commit) {
  console.table(report);
  const migrated = report.filter(r => r.status === "zmigrowano" || r.status === "gotowe do migracji").length;
  const summary = commit
    ? `Zasięg wzroku: znormalizowano ${migrated} postaci.`
    : `Zasięg wzroku: ${migrated} postaci gotowych. Uruchom z { commit: true }, aby zastosować.`;
  ui.notifications?.info(summary);
  console.log(`%c${summary}`, "font-weight:bold");
}

/* -------------------------------------------- */

export function registerSightRangeMigration() {
  const mod = game.modules?.get(MODULE_ID);
  if (mod) {
    mod.api ??= {};
    mod.api.migration ??= {};
    mod.api.migration.normalizeSightRange = normalizeSightRange;
  }
}
