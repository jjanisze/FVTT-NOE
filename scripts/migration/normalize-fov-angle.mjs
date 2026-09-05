/**
 * Neuroshima 5e — apply the 220° facing-cone default (`config/fov.mjs`) to already-existing data.
 *
 * `config/fov.mjs`'s `computeFovAngle` is now the policy for anything built going forward (the
 * bestiary pack builder uses it; a fresh compendium pull already gets the right angle). This file
 * is the retrofit for what already exists in the live world, split in two because the two halves
 * have very different confidence levels:
 *
 * - `normalizePcFov` — the same 18-character batch cast `normalize-sight-range.mjs` already
 *   normalized (imported from there rather than duplicated). Every PC is human with no
 *   Ślepowidzenie, so there is no exemption branch to get wrong: this just writes
 *   `DEFAULT_FOV_ANGLE` unconditionally onto `prototypeToken.sight.angle` and every already-placed
 *   token's own `sight.angle`, across every scene (`actor.getDependentTokens({linked:true})`, no
 *   scene filter — same reasoning as `normalize-sight-range.mjs`'s own fix: this only ever touches
 *   the TokenDocument, never the canvas, so there's no reason to scope it to `canvas.scene`).
 *
 * - `auditNpcFov` — every placed token on every scene whose actor is *not* a PC. Lower confidence
 *   on purpose: `creature-types.mjs` documents 57 live-world NPCs carrying **free-text**
 *   `details.type.value` predating this project's own clean bestiary pipeline, so
 *   `computeFovAngleForActor`'s Moloch-machine match is a best-effort substring test, not a
 *   guaranteed-clean lookup. Dry run by default like every migration in this folder — read the
 *   report before committing, especially rows where `typeText` looks like legacy free text rather
 *   than a clean Bestiariusz `creatureType`/`typeNote` pair.
 *
 * Usage (console or macro), same shape as this folder's other migrations:
 *   const api = game.modules.get("neuroshima-2026-overrides").api.migration;
 *   await api.normalizePcFov();                    // dry run
 *   await api.normalizePcFov({ commit: true });
 *   await api.auditNpcFov();                        // dry run, every scene
 *   await api.auditNpcFov({ commit: true });
 *   await api.auditNpcFov({ scenes: ["Silos Poziom Górny"], commit: true });
 */

import { BATCH_CAST } from "./normalize-sight-range.mjs";
import { DEFAULT_FOV_ANGLE, computeFovAngleForActor } from "../config/fov.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/**
 * @param {object} [options]
 * @param {boolean} [options.commit=false]
 * @param {string[]} [options.actors] Restrict to these actor names instead of the full BATCH_CAST.
 */
export async function normalizePcFov({ commit = false, actors = null } = {}) {
  const names = actors ?? BATCH_CAST;
  const report = [];

  for (const name of names) {
    const actor = game.actors.find(a => a.name === name);
    if (!actor) { report.push({ aktor: name, status: "pominięto", powód: "nie znaleziono aktora" }); continue; }

    const protoAngle = actor.prototypeToken.sight.angle;
    const tokens = actor.getDependentTokens?.({ linked: true }) ?? [];
    const tokenRows = tokens.map(doc => ({
      scene: doc.parent?.name ?? "?",
      current: doc.sight.angle,
      doc,
    }));

    report.push({
      aktor: name,
      "prototypeToken.sight.angle": `${protoAngle} → ${DEFAULT_FOV_ANGLE}`,
      "placed tokens": tokenRows.map(r => `${r.scene}: ${r.current} → ${DEFAULT_FOV_ANGLE}`).join("; ") || "(brak)",
      status: commit ? "zmigrowano" : "gotowe do migracji",
    });

    if (!commit) continue;

    if (protoAngle !== DEFAULT_FOV_ANGLE) await actor.update({ "prototypeToken.sight.angle": DEFAULT_FOV_ANGLE });
    for (const row of tokenRows) {
      if (row.doc.sight.angle !== DEFAULT_FOV_ANGLE) await row.doc.update({ "sight.angle": DEFAULT_FOV_ANGLE });
    }
  }

  _printReport(report, commit, "Pole widzenia (PC)");
  return report;
}

/**
 * @param {object} [options]
 * @param {boolean} [options.commit=false]
 * @param {string[]} [options.scenes] Restrict to these scene names instead of every scene.
 */
export async function auditNpcFov({ commit = false, scenes = null } = {}) {
  const targetScenes = scenes
    ? game.scenes.filter(s => scenes.includes(s.name))
    : game.scenes.contents;
  const report = [];

  for (const scene of targetScenes) {
    for (const doc of scene.tokens) {
      const actor = doc.actor;
      if (!actor || actor.type === "character") continue; // PCs go through normalizePcFov instead.

      const target = computeFovAngleForActor(actor);
      const current = doc.sight.angle;
      if (current === target) continue; // Already right — don't clutter the report with no-ops.

      const type = actor.system?.details?.type ?? {};
      report.push({
        scena: scene.name,
        token: doc.name,
        aktor: actor.name,
        typeText: `${type.value ?? ""} / ${type.subtype ?? ""}`.trim(),
        blindsight: actor.system?.attributes?.senses?.ranges?.blindsight ?? 0,
        "sight.angle": `${current} → ${target}`,
        status: commit ? "zmigrowano" : "gotowe do migracji",
      });

      if (commit) await doc.update({ "sight.angle": target });
    }
  }

  _printReport(report, commit, "Pole widzenia (NPC)");
  if (!commit) {
    console.log(`%cPrzejrzyj kolumnę "typeText" przed commitem — wolny dopasowywacz na luźnym tekście `
      + `(zob. doc comment tego pliku).`, "color:orange");
  }
  return report;
}

function _printReport(report, commit, label) {
  console.table(report);
  const migrated = report.filter(r => r.status === "zmigrowano" || r.status === "gotowe do migracji").length;
  const summary = commit
    ? `${label}: znormalizowano ${migrated} wpisów.`
    : `${label}: ${migrated} wpisów gotowych. Uruchom z { commit: true }, aby zastosować.`;
  ui.notifications?.info(summary);
  console.log(`%c${summary}`, "font-weight:bold");
}

/* -------------------------------------------- */

export function registerFovMigration() {
  const mod = game.modules?.get(MODULE_ID);
  if (mod) {
    mod.api ??= {};
    mod.api.migration ??= {};
    mod.api.migration.normalizePcFov = normalizePcFov;
    mod.api.migration.auditNpcFov = auditNpcFov;
  }
}
