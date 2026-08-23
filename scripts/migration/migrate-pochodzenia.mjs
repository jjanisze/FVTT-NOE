/**
 * Neuroshima 5e — put a Pochodzenie into every legacy character's `background` slot.
 *
 * Before: characters migrated from Roll20 in v0.6.0 have an empty background slot and
 * carry hand-typed feats named after origin abilities (`Fart`, `Telepata`,
 * `Urodzony Morderca`, …) with no activities and no link to a compendium.
 *
 * After: a real `background` item from `neuroshima.pochodzenia`, its `AbilityScoreImprovement`
 * and `ItemChoice` advancements applied through the native dnd5e pipeline, and the hand-made
 * duplicate deleted.
 *
 * ── THE +1/+1 PROBLEM ──────────────────────────────────────────────────────────
 * The GM already baked the origin's +1/+1 into the written Cechy Bazowe. Applying the
 * background on top would double it. So each ability in the bonus is decremented *before*
 * the manager runs, and the advancement puts it straight back. Net effect on the sheet:
 * zero. The point of the round trip is that the +1/+1 now lives in the advancement's
 * `value`, so removing the Pochodzenie later reverses it correctly.
 *
 * ── WHY THE UI IS DRIVEN INSTEAD OF CALLED ─────────────────────────────────────
 * `AdvancementManager` keeps `#forward` and `#complete` private; the only public entry is
 * the `data-action` handler. `advancement.apply()` writes through `actor.updateSource()`,
 * i.e. into the manager's *clone*, and needs `{ initial: true }` before it will read
 * `configuration.fixed` at all. Calling it directly therefore mutates nothing that survives.
 * Clicking the manager's own buttons is the supported path, so that is what this does.
 *
 * Usage (console or macro):
 *   const api = game.modules.get("neuroshima-2026-overrides").api.migration;
 *   await api.migratePochodzenia();                                   // dry run, prints a report
 *   await api.migratePochodzenia({ commit: true });                   // apply
 *   await api.migratePochodzenia({ actors: ["Piekarz"], commit: true });
 */

import { POCHODZENIA, ORIGIN_ABILITIES, pochodzeniaApi } from "../config/pochodzenia-data.mjs";
import { normalize } from "./migrate-classes.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const PACK_ORIGINS = `${MODULE_ID}.pochodzenia`;
const PACK_ABILITIES = `${MODULE_ID}.zdolnosci-pochodzenia`;

/* -------------------------------------------- */
/*  Inference                                    */
/* -------------------------------------------- */

/** Normalised ability name → origin key. Built once from the data module. */
const ORIGIN_BY_ABILITY = new Map(
  Object.values(ORIGIN_ABILITIES).map(a => [normalize(a.label), a.origin])
);

/** Normalised origin label → origin key, for feats whose `requirements` names the region. */
const ORIGIN_BY_LABEL = new Map(
  Object.entries(POCHODZENIA).map(([key, o]) => [normalize(o.label), key])
);

/**
 * Every hand-made feat on the actor that shadows a compendium origin ability.
 * Items already granted by this module are excluded — they are not duplicates.
 */
function legacyOriginFeats(actor) {
  return actor.items.filter(i => i.type === "feat"
    && !i.flags?.[MODULE_ID]?.originAbilityId
    && ORIGIN_BY_ABILITY.has(normalize(i.name)));
}

/**
 * Work out which Pochodzenie a legacy character was built as.
 * @returns {{key: string, abilityId: string, source: string}|null}
 */
function inferOrigin(actor) {
  for (const feat of legacyOriginFeats(actor)) {
    const key = ORIGIN_BY_ABILITY.get(normalize(feat.name));
    const ability = pochodzeniaApi.of(key).find(a => normalize(a.label) === normalize(feat.name));
    return { key, abilityId: ability.label, source: `zdolność „${feat.name}"` };
  }
  // Fallback: the old sheets wrote the region name into `requirements`.
  for (const feat of actor.items) {
    const key = ORIGIN_BY_LABEL.get(normalize(feat.system?.requirements ?? ""));
    if (key) return { key, abilityId: pochodzeniaApi.of(key)[0].label, source: `requirements: ${feat.system.requirements}` };
  }
  return null;
}

/** k12 for the region, k6 for the ability — the rulebook's own procedure. */
function rollOrigin() {
  const keys = Object.keys(POCHODZENIA);
  const key = keys[Math.floor(Math.random() * keys.length)];
  const pool = pochodzeniaApi.of(key);
  return { key, abilityId: pool[Math.floor(Math.random() * pool.length)].label, source: "k12/k6" };
}

/**
 * Actors that must not get an origin rolled for them: blank sheets left over from the Roll20
 * import (one placeholder class item, a flat 10 everywhere) and the GM's utility actors
 * (`Zbrojownia`, `TESTCHAR`), which have no class item because nobody plays them.
 * @returns {string|null}  Reason to skip, or `null` to proceed.
 */
function skipReason(actor) {
  if (!actor.items.some(i => i.type === "class")) return "aktor techniczny — brak klasy";
  const abilities = Object.values(actor.system._source.abilities ?? {});
  if (actor.items.size <= 3 && abilities.every(a => a.value === 10)) {
    return "pusty szablon po imporcie z Roll20";
  }
  return null;
}

/* -------------------------------------------- */
/*  Application                                  */
/* -------------------------------------------- */

async function until(test, timeout = 8000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const value = test();
    if (value) return value;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return null;
}

/**
 * Run one character through the native AdvancementManager.
 * @returns {Promise<string|null>}  An error message, or `null` on success.
 */
async function applyOrigin(actor, { key, abilityId }, backgrounds) {
  const bonus = pochodzeniaApi.bonus(key);
  const before = actor.system._source.abilities;

  const undo = {};
  for (const [ability, delta] of Object.entries(bonus)) {
    undo[`system.abilities.${ability}.value`] = before[ability].value - delta;
  }
  await actor.update(undo);

  const source = backgrounds.find(d => d.system.identifier === key);
  const manager = dnd5e.applications.advancement.AdvancementManager.forNewItem(actor, source.toObject());
  await manager.render(true);

  const next = await until(() => [...(manager.element?.querySelectorAll("button, a") ?? [])]
    .find(b => b.dataset.action === "next" || /next/i.test(b.innerText)));
  if (!next) return "AdvancementManager nie wystartował";
  next.click();

  const checkbox = await until(() => [...(manager.element?.querySelectorAll("li[data-uuid]") ?? [])]
    .find(row => row.innerText.trim().startsWith(abilityId))
    ?.querySelector("dnd5e-checkbox"));
  if (!checkbox) return `nie znaleziono zdolności „${abilityId}" w puli`;
  checkbox.checked = true;
  checkbox.dispatchEvent(new Event("change", { bubbles: true }));

  const complete = await until(() => [...(manager.element?.querySelectorAll("button, a") ?? [])]
    .find(b => b.dataset.action === "complete" || /complete/i.test(b.innerText)));
  complete.click();

  const done = await until(() => actor.items.some(i => i.type === "background"), 12000);
  if (!done) return "manager nie zatwierdził zmian";

  const duplicates = legacyOriginFeats(actor);
  if (duplicates.length) await actor.deleteEmbeddedDocuments("Item", duplicates.map(i => i.id));
  return null;
}

/* -------------------------------------------- */

/**
 * @param {object} [options]
 * @param {boolean} [options.commit=false]      Apply the changes. Otherwise only report.
 * @param {string[]} [options.actors=null]      Restrict to these actor names.
 * @param {boolean} [options.roll=true]         Roll k12 for characters whose origin cannot be inferred.
 * @param {boolean} [options.force=false]       Also process blank templates and utility actors.
 * @returns {Promise<object[]>}  One row per character, and a restore manifest under `.backup`.
 */
export async function migratePochodzenia({ commit = false, actors = null, roll = true, force = false } = {}) {
  const backgrounds = await game.packs.get(PACK_ORIGINS)?.getDocuments() ?? [];
  if (!backgrounds.length) {
    ui.notifications?.error(`Kompendium ${PACK_ORIGINS} jest puste — zbuduj packi (npm run build:classes).`);
    return [];
  }
  await game.packs.get(PACK_ABILITIES)?.getIndex();

  const pool = game.actors.filter(a => a.type === "character"
    && (!actors || actors.includes(a.name))
    && !a.items.some(i => i.type === "background"));

  const report = [];
  const backup = [];
  for (const actor of pool) {
    const skip = force ? null : skipReason(actor);
    if (skip) {
      report.push({ aktor: actor.name, status: "pominięto", powód: skip });
      continue;
    }
    const choice = inferOrigin(actor) ?? (roll ? rollOrigin() : null);
    if (!choice) {
      report.push({ aktor: actor.name, status: "pominięto", powód: "nie da się wywnioskować Pochodzenia" });
      continue;
    }

    const bonus = pochodzeniaApi.bonus(choice.key);
    const row = {
      aktor: actor.name,
      pochodzenie: POCHODZENIA[choice.key].label,
      zdolność: choice.abilityId,
      źródło: choice.source,
      premia: Object.entries(bonus).map(([a, v]) => `${a} +${v}`).join(", "),
      duplikaty: legacyOriginFeats(actor).map(i => i.name)
    };

    if (!commit) {
      report.push({ ...row, status: "gotowe do migracji" });
      continue;
    }

    backup.push({
      id: actor.id,
      imie: actor.name,
      abilities: Object.fromEntries(Object.entries(actor.system._source.abilities).map(([k, v]) => [k, v.value])),
      usuwaneFeaty: legacyOriginFeats(actor).map(i => i.toObject())
    });

    const error = await applyOrigin(actor, choice, backgrounds);
    report.push({ ...row, status: error ? `BŁĄD: ${error}` : "zmigrowano" });
  }

  _printReport(report, commit);
  report.backup = backup;
  return report;
}

/* -------------------------------------------- */

function _printReport(report, commit) {
  console.table(report);
  const migrated = report.filter(r => r.status === "zmigrowano" || r.status === "gotowe do migracji").length;
  const failed = report.filter(r => String(r.status).startsWith("BŁĄD")).length;
  const summary = commit
    ? `Pochodzenia: zmigrowano ${migrated} postaci${failed ? `, ${failed} z błędem` : ""}.`
    : `Pochodzenia: ${migrated} postaci gotowych. Uruchom z { commit: true }, aby zastosować.`;
  ui.notifications?.[failed ? "warn" : "info"](summary);
  console.log(`%c${summary}`, "font-weight:bold");
  if (commit) console.log("Manifest cofania: zwrócona tablica ma pole .backup — zapisz je, zanim zamkniesz konsolę.");
}

/* -------------------------------------------- */

export function registerPochodzeniaMigration() {
  const mod = game.modules?.get(MODULE_ID);
  if (mod) {
    mod.api ??= {};
    mod.api.migration ??= {};
    mod.api.migration.migratePochodzenia = migratePochodzenia;
    mod.api.migration.inferOrigin = inferOrigin;
  }
}
