/**
 * Neuroshima 5e — migrate legacy characters onto the real class layer.
 *
 * Before: every PC carries a broken placeholder class item
 * (`identifier: "lessunknown-classgreater"`, `hd: d6`, `rules: 2014`) or one named
 * "Wybierz", plus hand-typed stub feats with no activities, no recovery and a
 * nonsense `uses.max:1 / spent:1`.
 *
 * After: a real class item from `neuroshima.klasy` at the same level, with matched
 * abilities replaced by their compendium equivalents.
 *
 * ── SAFETY ─────────────────────────────────────────────────────────────────────
 * Unmatched feats are NEVER deleted. The live world contains a lot of homebrew and
 * origin/Sztuczka entries (`Urodzony Morderca`, `Młynek`, `Telepata`, `Fart`,
 * `Patriota`, …) that are not rulebook class abilities but do carry real play
 * history. They are left untouched and listed in the report for the GM to triage.
 *
 * Usage (console or macro):
 *   const api = game.modules.get("neuroshima-2026-overrides").api.migration;
 *   await api.migrateClasses();                    // dry run, prints a report
 *   await api.migrateClasses({ commit: true });    // apply
 *   await api.migrateClasses({ actors: ["Piekarz"], commit: true });
 */

import { CLASSES, PROFESSIONS } from "../config/classes-data.mjs";
import { CLASS_FEATURES } from "../config/class-features-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const PACK_CLASSES = `${MODULE_ID}.klasy`;
const PACK_PROFESSIONS = `${MODULE_ID}.profesje`;
const PACK_FEATURES = `${MODULE_ID}.zdolnosci-klasowe`;

/** Placeholder class identifiers written by the old hand-built sheets. */
const PLACEHOLDER_CLASS_IDS = new Set(["lessunknown-classgreater", "wybierz"]);

/* -------------------------------------------- */
/*  Name normalisation                           */
/* -------------------------------------------- */

const PL_MAP = { ą: "a", ć: "c", ę: "e", ł: "l", ń: "n", ó: "o", ś: "s", ż: "z", ź: "z" };

/**
 * Normalise a feat name for matching: lowercase, strip diacritics and punctuation,
 * drop parentheticals and trailing qualifiers ("Ulubiona Broń H&K G3" -> "ulubiona bron").
 */
export function normalize(name) {
  let s = String(name ?? "").toLowerCase().trim();
  s = s.replace(/\(.*?\)/g, " ");                 // "Mój Wróg (Maszyny)" -> "Mój Wróg"
  s = s.replace(/[ąćęłńóśźż]/g, c => PL_MAP[c] ?? c);
  // Hyphens are separators here, never part of a name: "Monter - Serwisowanie"
  // must normalise to "monter serwisowanie". No rulebook label contains one.
  s = s.replace(/[^a-z0-9\s]/g, " ");
  s = s.replace(/\s+/g, " ").trim();
  return s;
}

/**
 * Explicit aliases for legacy names that normalisation alone cannot resolve:
 * renamed abilities, typos, and sub-features that this module folds into one item.
 * Keys are already normalised.
 */
const ALIASES = {
  // Berserk was split into its four sub-benefits on the old sheets.
  "szal": "berserk",
  "sila berserkera": "berserk",
  "obrazenia berserkera": "berserk",
  "szarza berserkera": "berserk",
  "obled berserkera": "berserk",

  "cwaniacka motywacja": "motywacja",
  "szczescie cwaniaka": "szczescie",

  "trakejtoria lotu": "trajektoria",       // typo in the original sheet
  "trajektoria lotu": "trajektoria",

  "jachhhhty amen": "amen",                // player's flavour name, Amen in parens
  "monter serwisowanie": "serwisowanie",

  // Rewolwerowiec (Kowboj) was split into its separately-named sub-benefits on the old
  // sheets, exactly like Berserk above. Found live on Lorentz as two bare-name feats;
  // see IMPLEMENTATION.md (21).
  "jednoreki": "rewolwerowiec",
  "lekka spluwa": "rewolwerowiec",

  // NOT homebrew, despite what this entry said until IMPLEMENTATION.md (21): "Siódme poty"
  // is a real *origin* ability (Detroit, k6 1–2), so it is not a class feature and this
  // resolver must keep ignoring it — but it belongs to `migrate-pochodzenia.mjs`, which
  // does know it, not to the "leave this alone forever" bucket.
  "siodme poty": null,
  "siodme poty.": null
};

/**
 * Class-scoped feature ids: the same legacy name maps to a different feature
 * depending on which class the character turns out to be.
 */
const CLASS_SCOPED = {
  "ulubiona bron": {
    twardziel: "ulubiona-bron-twardziel",
    zlodziej: "ulubiona-bron-zlodziej",
    zwiadowca: "ulubiona-bron-zwiadowca"
  },
  "wyjadacz": { twardziel: "wyjadacz", zwiadowca: "wyjadacz-zwiadowca" },
  "specjalizacja": { spec: "specjalizacja-spec", zlodziej: "specjalizacja-zlodziej" }
};

/** normalised rulebook label -> feature id (built once). */
const LABEL_INDEX = (() => {
  const idx = new Map();
  for (const f of Object.values(CLASS_FEATURES)) {
    const key = normalize(f.label);
    if (!idx.has(key)) idx.set(key, []);
    idx.get(key).push(f.id);
  }
  return idx;
})();

/**
 * Resolve a legacy feat name to a feature id.
 * @returns {{id: string|null, ambiguous?: string[], scoped?: boolean}}
 */
function resolveFeatureId(name, classId) {
  const key = normalize(name);

  if (key in ALIASES) {
    const target = ALIASES[key];
    return { id: target };                        // may be null = deliberately ignored
  }

  if (CLASS_SCOPED[key]) {
    const id = classId ? CLASS_SCOPED[key][classId] ?? null : null;
    return { id, scoped: true };
  }

  const hits = LABEL_INDEX.get(key);
  if (!hits?.length) return { id: null };
  if (hits.length === 1) return { id: hits[0] };

  // Several features share a label — prefer the one owned by this class.
  const owned = hits.filter(id => {
    const f = CLASS_FEATURES[id];
    return f.owner === classId
      || f.alsoOwnedBy?.includes(classId)
      || PROFESSIONS[f.owner]?.klasa === classId;
  });
  if (owned.length === 1) return { id: owned[0] };
  return { id: null, ambiguous: hits };
}

/* -------------------------------------------- */
/*  Class inference                              */
/* -------------------------------------------- */

/**
 * Score each class by how many of the actor's feats are its abilities.
 * Class abilities weigh more than profession abilities, since professions are only
 * reachable through their parent class anyway.
 */
function inferClass(actor) {
  const scores = Object.fromEntries(Object.keys(CLASSES).map(c => [c, 0]));
  const evidence = Object.fromEntries(Object.keys(CLASSES).map(c => [c, []]));
  let professionHint = null;

  for (const item of actor.items) {
    if (item.type !== "feat") continue;
    const key = normalize(item.name);

    // class-scoped names are evidence for every class that has them
    if (CLASS_SCOPED[key]) {
      for (const cls of Object.keys(CLASS_SCOPED[key])) {
        scores[cls] += 1;
        evidence[cls].push(item.name);
      }
      continue;
    }

    const direct = ALIASES[key] ?? null;
    const ids = direct ? [direct] : (LABEL_INDEX.get(key) ?? []);
    for (const id of ids) {
      const f = CLASS_FEATURES[id];
      if (!f) continue;
      if (f.source === "klasa") {
        const owners = [f.owner, ...(f.alsoOwnedBy ?? [])];
        // A feature shared by three classes is weak evidence; weight it down.
        const weight = 3 / owners.length;
        for (const o of owners) {
          if (scores[o] === undefined) continue;
          scores[o] += weight;
          evidence[o].push(item.name);
        }
      } else {
        const parent = PROFESSIONS[f.owner]?.klasa;
        if (parent && scores[parent] !== undefined) {
          scores[parent] += 2;
          evidence[parent].push(item.name);
          professionHint ??= f.owner;
        }
      }
    }
  }

  const ranked = Object.entries(scores)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1]);

  if (!ranked.length) return { classId: null, confidence: 0, scores, evidence: [], professionHint };

  const [topId, topScore] = ranked[0];
  const runnerUp = ranked[1]?.[1] ?? 0;
  // Confidence is the margin over the runner-up, so a tie reports as low.
  const confidence = topScore === 0 ? 0 : (topScore - runnerUp) / topScore;

  return {
    classId: topId,
    confidence: Number(confidence.toFixed(2)),
    topScore,
    runnerUp,
    scores,
    evidence: [...new Set(evidence[topId])],
    professionHint: PROFESSIONS[professionHint]?.klasa === topId ? professionHint : null
  };
}

/* -------------------------------------------- */
/*  Migration                                    */
/* -------------------------------------------- */

async function _loadPacks() {
  const [classes, professions, features] = await Promise.all([
    game.packs.get(PACK_CLASSES)?.getDocuments(),
    game.packs.get(PACK_PROFESSIONS)?.getDocuments(),
    game.packs.get(PACK_FEATURES)?.getDocuments()
  ]);
  if (!classes || !features) throw new Error("Neuroshima class packs are not loaded.");
  return {
    classByIdentifier: new Map(classes.map(d => [d.system.identifier, d])),
    professionById: new Map((professions ?? []).map(d => [d.system.identifier, d])),
    featureById: new Map(features.map(d => [d.flags[MODULE_ID]?.abilityId, d]))
  };
}

/**
 * @param {object} [options]
 * @param {boolean} [options.commit=false]   apply changes (default: dry run)
 * @param {string[]} [options.actors]        limit to these actor names
 * @param {number} [options.minConfidence=0.2]
 */
export async function migrateClasses({ commit = false, actors = null, minConfidence = 0.2 } = {}) {
  if (!game.user.isGM) {
    ui.notifications?.error("Migracja klas wymaga uprawnień MG.");
    return null;
  }

  const packs = await _loadPacks();
  const targets = game.actors.filter(a =>
    a.type === "character" && (!actors || actors.includes(a.name)));

  const report = [];

  for (const actor of targets) {
    const entry = {
      actor: actor.name,
      level: actor.system.details?.level ?? 0,
      classInferred: null,
      confidence: 0,
      evidence: [],
      profession: null,
      replaced: [],
      preserved: [],
      ambiguous: [],
      corrupt: [],
      skipped: null
    };

    const classItems = actor.items.filter(i => i.type === "class");
    const placeholder = classItems.find(i =>
      PLACEHOLDER_CLASS_IDS.has(i.system.identifier) || !CLASSES[i.system.identifier]);
    const alreadyReal = classItems.find(i => CLASSES[i.system.identifier]);

    if (alreadyReal && !placeholder) {
      entry.skipped = `już zmigrowany (${alreadyReal.name} ${alreadyReal.system.levels})`;
      report.push(entry);
      continue;
    }
    if (!classItems.length && !actor.items.some(i => i.type === "feat")) {
      entry.skipped = "brak klasy i zdolności — pominięty";
      report.push(entry);
      continue;
    }

    const inferred = inferClass(actor);
    entry.classInferred = inferred.classId;
    entry.confidence = inferred.confidence;
    entry.evidence = inferred.evidence;
    entry.profession = inferred.professionHint;
    entry.scores = inferred.scores;

    if (!inferred.classId) {
      entry.skipped = "nie udało się rozpoznać klasy — wymaga ręcznego przypisania";
      report.push(entry);
      continue;
    }
    if (inferred.confidence < minConfidence) {
      entry.skipped = `niska pewność (${inferred.confidence}) — wymaga potwierdzenia MG`;
      report.push(entry);
      continue;
    }

    // Classify every feat.
    const toDelete = [];
    const toCreate = [];
    for (const item of actor.items) {
      if (item.type !== "feat") continue;

      if (!item.name || item.name === "<no name>") {
        entry.corrupt.push(item.id);
        continue;
      }

      const res = resolveFeatureId(item.name, inferred.classId);
      if (res.ambiguous) {
        entry.ambiguous.push({ name: item.name, candidates: res.ambiguous });
        entry.preserved.push(item.name);
        continue;
      }
      if (!res.id) {
        entry.preserved.push(item.name);
        continue;
      }
      const source = packs.featureById.get(res.id);
      if (!source) { entry.preserved.push(item.name); continue; }

      // Fold duplicates (Berserk's four sub-entries) into a single item.
      if (toCreate.some(c => c.flags[MODULE_ID]?.abilityId === res.id)) {
        entry.replaced.push(`${item.name} → ${source.name} (scalone)`);
        toDelete.push(item.id);
        continue;
      }

      entry.replaced.push(`${item.name} → ${source.name}`);
      toDelete.push(item.id);
      toCreate.push(source.toObject());
    }

    if (!commit) { report.push(entry); continue; }

    // ---- apply ----
    const levels = placeholder?.system.levels ?? actor.system.details?.level ?? 1;
    const classSource = packs.classByIdentifier.get(inferred.classId);

    if (placeholder) await actor.deleteEmbeddedDocuments("Item", [placeholder.id]);
    if (!alreadyReal && classSource) {
      const data = classSource.toObject();
      data.system.levels = Math.clamp(levels, 1, 12);
      await actor.createEmbeddedDocuments("Item", [data]);
    }
    if (inferred.professionHint) {
      const prof = packs.professionById.get(inferred.professionHint);
      if (prof && !actor.items.some(i => i.type === "subclass")) {
        await actor.createEmbeddedDocuments("Item", [prof.toObject()]);
        entry.profession = prof.name;
      }
    }
    if (toDelete.length) await actor.deleteEmbeddedDocuments("Item", toDelete);
    if (toCreate.length) await actor.createEmbeddedDocuments("Item", toCreate);

    entry.applied = true;
    report.push(entry);
  }

  _printReport(report, commit);
  return report;
}

/* -------------------------------------------- */
/*  Reporting                                    */
/* -------------------------------------------- */

function _printReport(report, commit) {
  const mode = commit ? "ZASTOSOWANO" : "PRÓBA (dry run)";
  console.groupCollapsed(`%cNeuroshima | Migracja klas — ${mode}`, "font-weight:bold");
  for (const e of report) {
    if (e.skipped) {
      console.log(`%c${e.actor}%c — pominięty: ${e.skipped}`, "font-weight:bold", "color:#888");
      continue;
    }
    console.groupCollapsed(
      `%c${e.actor}%c → ${e.classInferred} (pewność ${e.confidence}) `
      + `| zamienione ${e.replaced.length} | zachowane ${e.preserved.length}`,
      "font-weight:bold", "color:inherit");
    if (e.profession) console.log("profesja:", e.profession);
    console.log("przesłanki:", e.evidence.join(", "));
    if (e.replaced.length) console.log("zamienione:\n  " + e.replaced.join("\n  "));
    if (e.preserved.length) console.log("%czachowane (nietknięte):\n  " + e.preserved.join("\n  "), "color:#7a9440");
    if (e.ambiguous.length) console.warn("niejednoznaczne:", e.ambiguous);
    if (e.corrupt.length) console.warn(`uszkodzone wpisy (bez nazwy): ${e.corrupt.length} — nie usunięto`);
    console.groupEnd();
  }
  console.groupEnd();

  const migrated = report.filter(r => !r.skipped && r.classInferred).length;
  const needsHelp = report.filter(r => r.skipped && !/już zmigrowany/.test(r.skipped)).length;
  const preserved = report.reduce((n, r) => n + (r.preserved?.length ?? 0), 0);

  const summary = commit
    ? `Migracja zakończona: ${migrated} postaci, ${preserved} zdolności zachowanych bez zmian.`
    : `Próba migracji: ${migrated} postaci gotowych, ${needsHelp} wymaga decyzji MG. `
      + `Uruchom z { commit: true }, aby zastosować.`;

  ui.notifications?.info(summary);
  console.log(`%c${summary}`, "font-weight:bold");
}

/* -------------------------------------------- */

export function registerClassMigration() {
  const mod = game.modules?.get(MODULE_ID);
  if (mod) {
    mod.api ??= {};
    mod.api.migration = { migrateClasses, inferClass, normalize, resolveFeatureId };
  }
}
