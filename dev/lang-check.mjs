#!/usr/bin/env node
/**
 * Duplicate keys in `lang/*.json` (`npm test`).
 *
 * JSON parsing keeps the last of two equal keys, so a second `"ITEM": { … }` block silently discards every
 * translation of the first. `lang/pl.json` carried three `DND5E.ITEM` blocks and two `DND5E.WEAPON` — 34 dead
 * translations, item property names among them, until the dnd5e 6 migration (PLAN_migracja_dnd5e6.md E7).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const LANG = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "lang");

/** Every key that appears twice in one object: `{ path, first, again }` with line numbers. */
export function duplicateKeys(source) {
  const s = source;
  const dups = [];
  let i = 0;
  let line = 1;
  const ws = () => { while (/\s/.test(s[i])) { if (s[i] === "\n") line++; i++; } };
  const str = () => { const start = i; i++; while (s[i] !== '"') i += s[i] === "\\" ? 2 : 1; i++; return JSON.parse(s.slice(start, i)); };
  const val = at => {
    ws();
    if (s[i] === "{") {
      i++;
      const seen = new Map();
      ws();
      if (s[i] === "}") { i++; return; }
      for (;;) {
        ws();
        const keyLine = line;
        const k = str();
        ws();
        i++;
        if (seen.has(k)) dups.push({ path: `${at}${k}`, first: seen.get(k), again: keyLine });
        seen.set(k, keyLine);
        val(`${at}${k}.`);
        ws();
        if (s[i] === ",") { i++; continue; }
        i++;
        return;
      }
    }
    if (s[i] === "[") {
      i++;
      ws();
      if (s[i] === "]") { i++; return; }
      for (;;) { val(at); ws(); if (s[i] === ",") { i++; continue; } i++; return; }
    }
    if (s[i] === '"') { str(); return; }
    while (!/[,}\]\s]/.test(s[i])) i++;
  };
  val("");
  return dups;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  let problems = 0;
  for (const file of fs.readdirSync(LANG).filter(f => f.endsWith(".json"))) {
    for (const d of duplicateKeys(fs.readFileSync(path.join(LANG, file), "utf8"))) {
      problems++;
      process.stdout.write(`lang/${file}: duplicate key ${d.path} (lines ${d.first} and ${d.again}) — the first block is ignored\n`);
    }
  }
  if (!problems) process.stdout.write("lang: no duplicate keys\n");
  process.exitCode = problems ? 1 : 0;
}
