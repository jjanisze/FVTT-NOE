#!/usr/bin/env node
/**
 * Generated source map (PLAN_agentic_improvements.md §5 F): "which file defines class X" for
 * FoundryVTT core and the dnd5e system, as a greppable Markdown table — so agents stop guessing
 * file names from memory (v13's `application-v2.mjs` & co. sent sessions to files v14 does not have).
 *
 *   node dev/agent/index-sources.mjs --foundry=<install>/resources/app --dnd5e=<dnd5e source checkout> --out=<file.md>
 *
 * Regenerate after every Foundry or dnd5e version change. Paths come from arguments only — this
 * repo is public; the output lives with the agent skills in the campaign vault.
 */

import fs from "node:fs";
import path from "node:path";

const arg = name => process.argv.slice(2).find(a => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const foundry = arg("foundry");
const dnd5e = arg("dnd5e");
const out = arg("out");
if (!foundry || !dnd5e || !out) {
  console.error("usage: node dev/agent/index-sources.mjs --foundry=<resources/app> --dnd5e=<dnd5e checkout> --out=<file.md>");
  process.exit(3);
}

const CLASS = /^export\s+(?:default\s+)?(?:abstract\s+)?class\s+(\w+)(?:\s+extends\s+([\w.]+(?:\([^)]*\))?))?/gm;

function scan(root, sub) {
  const rows = [];
  const walk = d => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) { if (!["node_modules", "dist", "packs"].includes(e.name)) walk(p); continue; }
      if (!/\.m?js$/.test(e.name)) continue;
      const text = fs.readFileSync(p, "utf8");
      for (const m of text.matchAll(CLASS)) {
        rows.push({ cls: m[1], ext: (m[2] ?? "").replace(/\(.*/, ""), file: path.relative(root, p).replaceAll("\\", "/") });
      }
    }
  };
  for (const s of sub) if (fs.existsSync(path.join(root, s))) walk(path.join(root, s));
  return rows.sort((a, b) => a.cls.localeCompare(b.cls) || a.file.localeCompare(b.file));
}

const release = JSON.parse(fs.readFileSync(path.join(foundry, "package.json"), "utf8")).release ?? {};
const system = JSON.parse(fs.readFileSync(path.join(dnd5e, "system.json"), "utf8"));
const core = scan(foundry, ["client", "common"]);
const sys = scan(dnd5e, ["module"]);
const table = rows => ["| Class | extends | File |", "|---|---|---|", ...rows.map(r => `| \`${r.cls}\` | ${r.ext ? `\`${r.ext}\`` : ""} | \`${r.file}\` |`)].join("\n");

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, `# FoundryVTT ${release.generation}.${release.build} + dnd5e ${system.version} — class → file

> **Generated** by \`neuroshima-2026-overrides/dev/agent/index-sources.mjs\` on ${new Date().toISOString().slice(0, 10)}.
> Do not edit; regenerate after a Foundry or dnd5e update. Grep it: \`grep -n "ApplicationV2" <this file>\`.
> Core paths are relative to \`<Foundry install>/resources/app/\`; dnd5e paths to the dnd5e source checkout.

## FoundryVTT core (${core.length} exported classes)

${table(core)}

## dnd5e ${system.version} (${sys.length} exported classes)

${table(sys)}
`);
console.log(JSON.stringify({ ok: true, out, foundry: `${release.generation}.${release.build}`, dnd5e: system.version, core: core.length, dnd5eClasses: sys.length }));
