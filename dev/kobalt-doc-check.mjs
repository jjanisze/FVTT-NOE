#!/usr/bin/env node
/**
 * `docs/Kobalt.md` against the WKK code (`npm test`, release gate).
 *
 * The page is the one public answer to "what does the Kolor Kobaltu setting do". It drifted once: 22 rules
 * listed, while twenty more pieces of WKK content — items, a disease, a phobia, a class feature, magazine and
 * vehicle rules — lived only in `scripts/wkk/` and the code. This check fails when:
 *   1. a `### N.` rule has no row N in the "Spis zasad WKK" table (or the other way round), numbering has a gap,
 *      or a row names a switch other than the known ones;
 *   2. a file under `scripts/wkk/` (the registry aside) is not named on the page;
 *   3. a WKK name from the code — item, ammo, armour, disease, phobia, class feature, vehicle trait, setting —
 *      does not appear on the page.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { KOBALT_WEAPONS } from "../scripts/wkk/config/weapons-data.mjs";
import { KOBALT_AMMO, KOBALT_EXPLOSIVES } from "../scripts/wkk/config/ammo-data.mjs";
import { KOBALT_ARMORS } from "../scripts/wkk/config/armor-data.mjs";
import { KOBALT_DISEASES } from "../scripts/wkk/config/diseases-data.mjs";
import { KOBALT_PHOBIAS } from "../scripts/wkk/config/phobias-data.mjs";
import { KOBALT_CLASS_FEATURES } from "../scripts/wkk/config/class-features-data.mjs";
import { POCHODNIA_VARIANTS } from "../scripts/wkk/items/pochodnia.mjs";
import { GADZETY } from "../scripts/wkk/items/gadzety.mjs";
import { ZETON_LUXOR_ITEM } from "../scripts/wkk/items/zeton-luxor.mjs";
import { CECHY_POJAZDOW } from "../scripts/config/vehicles-data.mjs";

const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const DOC = path.join(MODULE_ROOT, "docs", "Kobalt.md");
const WKK_DIR = path.join(MODULE_ROOT, "scripts", "wkk");
const SUMMARY_HEADING = "## Spis zasad WKK";
/** Values of the summary table's last column. */
export const SWITCHES = ["Kolor Kobaltu", "Kobalt: sen", "Kobalt: jakość wody", "Darmowe upuszczanie", "zawsze"];
/** Not a rule — the census of everything else in the folder. */
const NOT_A_RULE_FILE = new Set(["registry.mjs"]);

const fold = s => String(s).replace(/\s+/g, " ").trim().toLocaleLowerCase("pl");

/** Rule numbers from `### N.` headings and from the summary table rows. */
export function ruleNumbers(doc) {
  const text = doc.replaceAll("\r\n", "\n");
  const headings = [...text.matchAll(/^### (\d+)\. /gm)].map(m => Number(m[1]));
  const start = text.indexOf(`${SUMMARY_HEADING}\n`);
  const rows = [];
  if (start >= 0) {
    const after = text.slice(start + SUMMARY_HEADING.length);
    const end = after.search(/^## /m);
    for (const line of (end >= 0 ? after.slice(0, end) : after).split("\n")) {
      const m = line.match(/^\|\s*(\d+)\s*\|/);
      if (!m) continue;
      const cells = line.split("|").slice(1, -1).map(c => c.trim());
      rows.push({ n: Number(m[1]), cells });
    }
  }
  return { headings, rows, hasSummary: start >= 0 };
}

/** Problems with numbering and the summary table. */
export function numberingProblems(doc) {
  const { headings, rows, hasSummary } = ruleNumbers(doc);
  if (!hasSummary) return [`no "${SUMMARY_HEADING}" section`];
  const problems = [];
  const dup = list => list.filter((n, i) => list.indexOf(n) !== i);
  const tableNums = rows.map(r => r.n);
  for (const n of new Set(dup(headings))) problems.push(`rule ${n}: two "### ${n}." headings`);
  for (const n of new Set(dup(tableNums))) problems.push(`rule ${n}: two rows in the summary table`);
  for (const n of headings) if (!tableNums.includes(n)) problems.push(`rule ${n}: heading without a row in the summary table`);
  for (const n of tableNums) if (!headings.includes(n)) problems.push(`rule ${n}: summary row without a "### ${n}." heading`);
  const max = Math.max(0, ...headings, ...tableNums);
  for (let n = 1; n <= max; n++) {
    if (!headings.includes(n) && !tableNums.includes(n)) problems.push(`rule ${n}: missing — numbering has a gap`);
  }
  for (const r of rows) {
    if (r.cells.length !== 5) problems.push(`rule ${r.n}: summary row has ${r.cells.length} columns, expected 5`);
    else if (!SWITCHES.includes(r.cells[4])) {
      problems.push(`rule ${r.n}: switch "${r.cells[4]}" is not one of: ${SWITCHES.join(", ")}`);
    }
  }
  return problems;
}

/** `scripts/wkk/…` paths of every module in the WKK folder that should be on the page. */
export function wkkFiles(dir = WKK_DIR) {
  const out = [];
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p);
      else if (e.name.endsWith(".mjs") && !NOT_A_RULE_FILE.has(e.name)) {
        out.push(`scripts/wkk/${path.relative(dir, p).replaceAll("\\", "/")}`);
      }
    }
  };
  walk(dir);
  return out.sort();
}

/** Display names of the WKK world settings, read from their `game.settings.register` calls. */
export function wkkSettingNames(scriptsDir = path.join(MODULE_ROOT, "scripts")) {
  const names = [];
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (e.name !== "tests") walk(p); continue; }
      if (!e.name.endsWith(".mjs")) continue;
      const src = fs.readFileSync(p, "utf8");
      for (const m of src.matchAll(/game\.settings\.register\(\s*MODULE_ID\s*,\s*[^,]+,\s*\{\s*name:\s*"([^"]+)"/g)) {
        if (/\(WKK\)|Kobalt/.test(m[1])) names.push(m[1]);
      }
    }
  };
  walk(scriptsDir);
  return names.sort();
}

/** Every WKK name from the data modules, with where it comes from. */
export function wkkNames() {
  const names = [];
  const add = (source, list) => { for (const n of list) if (n) names.push({ source, name: n }); };
  add("wkk/config/weapons-data.mjs", KOBALT_WEAPONS.map(w => w.name));
  add("wkk/config/ammo-data.mjs", [...KOBALT_AMMO, ...KOBALT_EXPLOSIVES].map(a => a.label));
  add("wkk/config/armor-data.mjs", KOBALT_ARMORS.map(a => a.name));
  add("wkk/config/diseases-data.mjs", Object.values(KOBALT_DISEASES).map(d => d.label));
  add("wkk/config/phobias-data.mjs", Object.values(KOBALT_PHOBIAS).map(p => p.label));
  add("wkk/config/class-features-data.mjs", Object.values(KOBALT_CLASS_FEATURES).map(f => f.label));
  add("wkk/items/pochodnia.mjs", Object.values(POCHODNIA_VARIANTS).map(v => v.label));
  add("wkk/items/gadzety.mjs", Object.values(GADZETY).map(g => g.label));
  add("wkk/items/zeton-luxor.mjs", [ZETON_LUXOR_ITEM.label]);
  add("config/vehicles-data.mjs (CECHY_POJAZDOW, warstwa WKK)",
    Object.values(CECHY_POJAZDOW).filter(c => c.warstwa === "WKK").map(c => c.nazwa));
  return names;
}

/** All problems for one page text. */
export function checkKobaltDoc(doc, { files = wkkFiles(), names = wkkNames(), settings = wkkSettingNames() } = {}) {
  const problems = numberingProblems(doc);
  for (const f of files) if (!doc.includes(f)) problems.push(`${f}: not named on the page (add a <!-- kod: ${f} --> under its rule)`);
  const text = fold(doc);
  for (const { source, name } of names) {
    if (!text.includes(fold(name))) problems.push(`"${name}" (${source}): not on the page`);
  }
  for (const s of settings) if (!text.includes(fold(s))) problems.push(`setting "${s}": not on the page`);
  return problems;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const problems = checkKobaltDoc(fs.readFileSync(DOC, "utf8"));
  for (const p of problems) process.stdout.write(`docs/Kobalt.md: ${p}\n`);
  if (!problems.length) {
    const { headings } = ruleNumbers(fs.readFileSync(DOC, "utf8"));
    process.stdout.write(`docs/Kobalt.md: ${headings.length} WKK rules, in sync with scripts/wkk/ and the code\n`);
  }
  process.exitCode = problems.length ? 1 : 0;
}
