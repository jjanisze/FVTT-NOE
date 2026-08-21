/**
 * Neuroshima 5e — one-shot migration: Choroby / Fobie / Fuks off the text fields.
 *
 * Before the health panel existed, every character tracked this by hand in free
 * text, in three different places and three different formats:
 *
 *  - `system.details.biography.value` — the six pregens carry
 *    `<h1>NARZĘDZIA</h1> … <h1>CHOROBA: X</h1> … <h1>FOBIA: Y</h1> … <h1>OPIS: Z</h1>`
 *  - `system.details.bond` — "Zdrowy na <choroba> (<lek>)" / "CHOROBA: … / LEK: …"
 *  - `system.details.ideal` / `.flaw` — the live PCs keep "Fuksy: N", "Zranienie: N"
 *    and a hand-typed disease/phobia write-up here
 *
 * This moves all of it into the structured flags the panel reads, leaving only
 * narrative behind. Text that is neither a disease nor a phobia (homebrew traits
 * such as Raynald's "Narkoleptyk") is deliberately left where it is — it is not
 * this migration's business to invent a home for it.
 *
 * The plan is written out per actor rather than derived by regex: these are live
 * PC sheets, the formats disagree with each other, and an explicit table is both
 * safer and a record of what moved.
 *
 * Usage (browser console, GM):
 *   const m = await import("/modules/neuroshima-2026-overrides/scripts/migration/migrate-health.mjs");
 *   await m.migrateHealth({ dryRun: true });   // report only
 *   await m.migrateHealth();                   // apply
 */

import { addDisease, addPhobia } from "../actors/health-panel.mjs";
import { setFuksy } from "../combat/rerolls.mjs";
import { PHOBIAS } from "../config/phobias-data.mjs";
import { CHRONIC_DISEASES } from "../config/diseases-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/**
 * Per-actor migration plan.
 *
 * - `fuksy` / `zranienie`: values found in the text fields, moved to the flags
 *   that now own them (`rerolls.mjs` / `zranienie.mjs`).
 * - `diseases` / `phobias`: `key` prefills RAW text; `notes` carries table-specific
 *   homebrew worth keeping; `medicineItem` names the existing supply item to link.
 * - `stripBio`: `<h1>` section headings to delete from the biography.
 * - `clear`: detail fields emptied outright.
 * - `stripLines`: regexes removed line-by-line from a detail field.
 * - `toolkits`: loot placeholders replaced with real `tool` items.
 * - `itemDescriptions`: bio sections moved onto the item they describe.
 */
export const PLAN = {
  /* ---- Pregens. Unused test characters; legacy house rules purged in favour
     of RAW (przełamanie durations were 24h, RAW says 1h/8h). ---- */

  "Buźka": {
    diseases: [{ key: "zaburzeniaBledinka", medicineItem: "Actinix/Rephidal (20)", medicine: "Actinix" }],
    phobias: [{ key: "robofobia" }],
    // NARZĘDZIA is kept: it lists tool *proficiencies* (Występy: Gitara,
    // Oszustwo: Karty), not a kit, so there is no item to move it onto.
    stripBio: ["CHOROBA", "FOBIA", "BRONIE SPECJALNE"],
    clear: ["bond", "flaw"],
    itemDescriptions: [{ item: "Koktajl Mołotowa", section: "BRONIE SPECJALNE" }]
  },
  "Carson": {
    // Reptiliofobia is not on the k8 table — rerolled, see `_rollPhobia`.
    diseases: [{ key: "syndromDraculi", medicineItem: "Dracophen (20)", medicine: "Dracophen" }],
    phobias: [{ reroll: true }],
    stripBio: ["CHOROBA", "FOBIA", "NARZĘDZIA"],
    clear: ["bond", "flaw"],
    toolkits: [{ loot: "Narzędzia Rusznikarza (30)", kit: "rusznikarza" }]
  },
  "Dante": {
    diseases: [{ key: "szalenstwoBostonskie", medicineItem: "Relanium (20)", medicine: "Relanium" }],
    phobias: [{ key: "nyktofobia" }],
    stripBio: ["CHOROBA", "FOBIA", "NARZĘDZIA"],
    clear: ["bond", "flaw"],
    toolkits: [{ loot: "Narzędzia kowalskie (30)", kit: "kowala" }]
  },
  "Góra": {
    // The bond field said "Zaburzenia błędnika (Actinix)" — stale, copy-pasted
    // from Buźka. The biography and the actual supply item both say Osteoporoza
    // / Wapniak, so those win.
    diseases: [{ key: "osteoporoza", medicineItem: "Wapniak (20)", medicine: "Wapniak" }],
    phobias: [{ key: "mutkofobia" }],
    stripBio: ["CHOROBA", "FOBIA", "NARZĘDZIA"],
    clear: ["bond", "flaw"],
    toolkits: [{ loot: "Zestaw Kucharza (20)", kit: "kucharza" }]
  },
  "Iris": {
    diseases: [{ key: "niewydolnoscKrazenia", medicineItem: "Aspiryna K (20)", medicine: "Aspiryna K" }],
    phobias: [{ key: "klaustrofobia" }],
    stripBio: ["CHOROBA", "FOBIA", "NARZĘDZIA"],
    clear: ["bond", "flaw"],
    toolkits: [{ loot: "Torba lekarska 5/5 (60)", kit: "medyka" }]
  },
  "Kluczyk": {
    diseases: [{ key: "paranoja", medicineItem: "Psychotropy (20)", medicine: "Psychotropy" }],
    phobias: [{ key: "arachnofobia" }],
    stripBio: ["CHOROBA", "FOBIA", "NARZĘDZIA"],
    clear: ["bond", "flaw"],
    toolkits: [{ loot: "Zestaw złodzieja (30)", kit: "slusarza" }]
  },

  /* ---- Live campaign PCs. Homebrew is preserved verbatim in `notes`. ---- */

  "Alan": {
    fuksy: 1,
    stripLines: { ideal: [/^Fuksy:/i, /^Zranienie:/i, /^Wyczerpanie:/i] }
  },
  "Lorentz": {
    fuksy: 1,
    diseases: [{ key: "osteoporoza", medicineItem: "Wapniak", medicine: "Wapniak", stage: 0 }],
    stripLines: { ideal: [/^Fuksy:/i, /^Zranienie:/i, /^Wyczerpanie:/i, /^Choroba:/i] },
    clear: ["flaw"]
  },
  "Piekarz": {
    fuksy: 3,
    zranienie: 2,
    diseases: [{ key: "szalenstwoBostonskie", medicineItem: "Relanium", medicine: "Relanium", stage: 0 }],
    stripLines: { ideal: [/^Fuksy:/i, /^Zranienie:/i, /^\s*-\s*\[\d\]/, /^Wyczerpanie:/i, /^Choroba:/i] },
    clear: ["flaw"]
  },
  "Raynald of Châtillon": {
    fuksy: 3,
    diseases: [{
      // "Schizofrenia paranoidalna" reproduces Paranoja's stage text verbatim —
      // same disease under a table name, so the RAW entry is kept and renamed.
      key: "paranoja",
      name: "Schizofrenia paranoidalna",
      medicine: "Psychotropy",
      stage: 0,
      notes: "LEKARZ I FARMACEUTA (homebrew): biorąc leki (zwykle wieczorem) rzuć 1k20.\n"
        + "1 — podmienili wszystkie tabletki; zniszcz 1k8 tabletek zanim spostrzeżesz, "
        + "że nie wszystkie są otrute.\n"
        + "2–10 — osłabili tabletki; żeby lek zadziałał, musisz zażyć podwójną dawkę.\n"
        + "11–19 — nie podmienili tabletek.\n"
        + "20 — tabletka puściła do Ciebie oczko; jesteś pewien, że Schizofrenia "
        + "nie pogorszy się, jeżeli dziś nie weźmiesz leków."
    }],
    stripLines: { ideal: [/^Fuksy:/i, /^Zranienie:/i, /^Wyczerpanie:/i, /^Choroba:/i] },
    // Narkoleptyk / Wyczulony are homebrew traits, not a phobia — left in place.
    stripFlawBlock: { start: /^Schizofrenia paranoidalna/i, end: /^Narkoleptyk:/i }
  },
  "Victor von Blitz": {
    fuksy: 1,
    zranienie: 2,
    diseases: [{ key: "szalenstwoBostonskie", medicineItem: "Relanium", medicine: "Relanium", stage: 0 }],
    phobias: [{ key: "rodentofobia", streak: 0 }],
    stripLines: { ideal: [/^Fuksy:/i, /^Zranienie:/i, /^\s*-\s*\[\d\]/, /^Wyczerpanie:/i, /^Choroba:/i] },
    clear: ["flaw"]
  }
};

/* -------------------------------------------- */
/*  Biography section handling                   */
/* -------------------------------------------- */

/**
 * Headings that mark the start of the narrative, even when they were typed as a
 * big-font paragraph instead of a real `<h1>` (Iris's sheet does exactly that,
 * which would otherwise put her whole life story inside the FOBIA section and
 * delete it along with the block).
 */
const INLINE_HEADING = /^(OPIS|BIOGRAFIA|HISTORIA)\s*:?/i;

/**
 * Split a biography into `<h1>`-delimited sections.
 * @param {string} html
 * @returns {{heading: string, html: string}[]} `heading` is "" for the preamble.
 */
export function splitBioSections(html) {
  const doc = new DOMParser().parseFromString(`<div>${html ?? ""}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  const sections = [{ heading: "", nodes: [] }];
  for (const node of Array.from(root.childNodes)) {
    const text = (node.textContent ?? "").trim();
    if (node.nodeName === "H1") {
      sections.push({ heading: text, nodes: [] });
    } else if (node.nodeType === Node.ELEMENT_NODE && INLINE_HEADING.test(text) && text.length < 60) {
      // Promote the fake heading to a real section boundary and drop its markup.
      sections.push({ heading: text.replace(/\s+/g, " "), nodes: [] });
    } else {
      sections.at(-1).nodes.push(node);
    }
  }
  return sections.map(s => ({
    heading: s.heading,
    html: s.nodes.map(n => n.outerHTML ?? n.textContent ?? "").join("")
  }));
}

/** True when a section heading starts with one of the given labels. */
function _headingMatches(heading, labels) {
  const h = heading.toUpperCase();
  return labels.some(l => h.startsWith(l.toUpperCase()));
}

/** Rebuild a biography without the named `<h1>` sections. */
function _stripBioSections(html, headings) {
  return splitBioSections(html)
    .filter(s => !(s.heading && _headingMatches(s.heading, headings)))
    .map(s => (s.heading ? `<h1>${s.heading}</h1>` : "") + s.html)
    .join("")
    .trim();
}

/** Extract one named section's inner HTML (without its heading). */
function _bioSection(html, heading) {
  return splitBioSections(html).find(s => s.heading && _headingMatches(s.heading, [heading]))?.html ?? "";
}

/** Drop lines matching any of `patterns` from a plain-text field. */
function _stripLines(text, patterns) {
  return String(text ?? "")
    .split("\n")
    .filter(line => !patterns.some(p => p.test(line.trim())))
    .join("\n")
    .trim();
}

/** Drop a contiguous block from `start` up to (not including) `end`. */
function _stripBlock(text, { start, end }) {
  const lines = String(text ?? "").split("\n");
  const from = lines.findIndex(l => start.test(l.trim()));
  if (from < 0) return text;
  let to = lines.findIndex((l, i) => i > from && end.test(l.trim()));
  if (to < 0) to = lines.length;
  return [...lines.slice(0, from), ...lines.slice(to)].join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/* -------------------------------------------- */
/*  Phobia reroll                                */
/* -------------------------------------------- */

/**
 * Roll k8 on the phobia table. Used for Carson, whose Reptiliofobia is a legacy
 * house rule with no entry on the RAW table.
 */
async function _rollPhobia() {
  const roll = await new Roll("1d8").evaluate();
  const entry = Object.entries(PHOBIAS).find(([, p]) => p.roll === roll.total);
  return { key: entry[0], roll: roll.total };
}

/* -------------------------------------------- */
/*  Migration                                    */
/* -------------------------------------------- */

/**
 * Run the migration.
 * @param {object} [options]
 * @param {boolean} [options.dryRun=false]  Report without writing anything.
 * @returns {Promise<object[]>} one report row per actor
 */
export async function migrateHealth({ dryRun = false } = {}) {
  if (!game.user.isGM) {
    ui.notifications.error("Migracja Chorób/Fobii wymaga uprawnień MG.");
    return [];
  }

  const report = [];

  for (const [name, plan] of Object.entries(PLAN)) {
    const actor = game.actors.getName(name);
    if (!actor) {
      report.push({ actor: name, skipped: "brak aktora" });
      continue;
    }

    const row = { actor: name, diseases: [], phobias: [], fields: [], items: [] };
    const details = actor.system.details;
    const update = {};

    /* --- Fuks + Zranienie --- */
    if (plan.fuksy !== undefined) {
      row.fuksy = plan.fuksy;
      if (!dryRun) await setFuksy(actor, plan.fuksy);
    }
    if (plan.zranienie !== undefined) {
      row.zranienie = plan.zranienie;
      if (!dryRun) await actor.setFlag(MODULE_ID, "zranienie", { level: plan.zranienie });
    }

    /* --- Diseases --- */
    for (const d of plan.diseases ?? []) {
      const key = d.key;
      const def = CHRONIC_DISEASES[key];
      const item = d.medicineItem ? actor.items.find(i => i.name === d.medicineItem) : null;
      row.diseases.push({
        key, name: d.name ?? def?.label, medicine: d.medicine ?? def?.medicine,
        linked: item?.name ?? null, hasNotes: !!d.notes
      });
      if (!dryRun) {
        await addDisease(actor, key, {
          ...(d.name ? { name: d.name } : {}),
          ...(d.medicine ? { medicine: d.medicine } : {}),
          stage: d.stage ?? 0,
          itemId: item?.id ?? null,
          notes: d.notes ?? ""
        });
      }
    }

    /* --- Phobias --- */
    for (const p of plan.phobias ?? []) {
      let key = p.key;
      let rolled = null;
      if (p.reroll) ({ key, roll: rolled } = await _rollPhobia());
      row.phobias.push({ key, name: PHOBIAS[key]?.label, rolled });
      if (!dryRun) await addPhobia(actor, key, { streak: p.streak ?? 0 });
    }

    /* --- Text fields --- */
    if (plan.stripBio?.length) {
      const before = details.biography?.value ?? "";
      const after = _stripBioSections(before, plan.stripBio);
      if (after !== before) {
        update["system.details.biography.value"] = after;
        row.fields.push(`biografia: -${before.length - after.length} znaków`);
      }
    }
    for (const field of plan.clear ?? []) {
      if (details[field]) {
        update[`system.details.${field}`] = "";
        row.fields.push(`${field}: wyczyszczone`);
      }
    }
    for (const [field, patterns] of Object.entries(plan.stripLines ?? {})) {
      const after = _stripLines(details[field], patterns);
      if (after !== (details[field] ?? "")) {
        update[`system.details.${field}`] = after;
        row.fields.push(`${field}: linie statusu usunięte`);
      }
    }
    if (plan.stripFlawBlock) {
      const after = _stripBlock(details.flaw, plan.stripFlawBlock);
      if (after !== (details.flaw ?? "")) {
        update["system.details.flaw"] = after;
        row.fields.push("flaw: blok choroby usunięty");
      }
    }

    /* --- Bio sections moved onto their item --- */
    for (const move of plan.itemDescriptions ?? []) {
      const item = actor.items.find(i => i.name === move.item);
      const html = _bioSection(details.biography?.value ?? "", move.section);
      if (!item || !html) {
        row.items.push(`${move.item}: POMINIĘTE (${item ? "brak sekcji" : "brak przedmiotu"})`);
        continue;
      }
      row.items.push(`${move.item} ← ${move.section}`);
      if (!dryRun) await item.update({ "system.description.value": html });
    }

    /* --- Loot toolkit → real tool item --- */
    for (const t of plan.toolkits ?? []) {
      const loot = actor.items.find(i => i.name === t.loot);
      if (!loot) {
        row.items.push(`${t.loot}: POMINIĘTE (brak przedmiotu)`);
        continue;
      }
      row.items.push(`${t.loot} → narzędzia małego ${t.kit}`);
      if (!dryRun) {
        await game.neuroshima.createToolkits(actor, { only: [t.kit] });
        await loot.delete();
      }
    }

    if (!dryRun && Object.keys(update).length) await actor.update(update);
    report.push(row);
  }

  console.table(report.map(r => ({
    aktor: r.actor,
    fuks: r.fuksy ?? "",
    zranienie: r.zranienie ?? "",
    choroby: (r.diseases ?? []).map(d => d.name).join(", "),
    fobie: (r.phobias ?? []).map(p => p.name + (p.rolled ? ` (k8=${p.rolled})` : "")).join(", "),
    pola: (r.fields ?? []).join(" · "),
    przedmioty: (r.items ?? []).join(" · ")
  })));

  ui.notifications.info(dryRun
    ? `Migracja (próbna): ${report.length} postaci — szczegóły w konsoli.`
    : `Migracja zakończona: ${report.length} postaci.`);

  return report;
}
