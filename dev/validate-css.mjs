#!/usr/bin/env node
/**
 * Lightweight structural CSS validator (zero dependencies).
 *
 * This does NOT validate the full CSS spec (property names/values, vendor
 * prefixes, selector correctness, etc). It only checks *structural
 * integrity* — the class of bug that silently breaks a browser's CSS
 * parser without throwing any visible error:
 *
 *   - declarations/statements sitting outside any rule block (orphaned
 *     `property: value;` left behind when a rule gets split by an edit)
 *   - stray closing '}' with no matching '{'
 *   - unclosed rule block at end of file
 *   - empty selector / at-rule prelude right before '{'
 *
 * Comments and string contents (incl. quoted url() args) are masked out
 * before scanning so braces/colons/semicolons inside them are ignored.
 *
 * Usage:
 *   node dev/validate-css.mjs                        (checks styles/*.css)
 *   node dev/validate-css.mjs styles/neuroshima.css   (checks specific file(s))
 *
 * Exit code: 0 = OK, 1 = NOK (at least one file has structural errors).
 */

import { readFileSync, readdirSync } from "node:fs";
import { join, resolve, dirname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const MODULE_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function findDefaultFiles() {
  const stylesDir = join(MODULE_ROOT, "styles");
  return readdirSync(stylesDir)
    .filter(f => f.endsWith(".css"))
    .map(f => join(stylesDir, f));
}

function lineColAt(text, index) {
  let line = 1;
  let lastNewline = -1;
  for (let i = 0; i < index; i++) {
    if (text[i] === "\n") { line++; lastNewline = i; }
  }
  return { line, col: index - lastNewline };
}

/** Replace comment/string interiors with spaces, preserving length and newlines. */
function maskNonStructural(source) {
  let out = "";
  let i = 0;
  const n = source.length;
  while (i < n) {
    const ch = source[i];
    const next = source[i + 1];

    if (ch === "/" && next === "*") {
      out += "  ";
      i += 2;
      while (i < n && !(source[i] === "*" && source[i + 1] === "/")) {
        out += source[i] === "\n" ? "\n" : " ";
        i++;
      }
      if (i < n) { out += "  "; i += 2; }
      continue;
    }

    if (ch === "'" || ch === '"') {
      const quote = ch;
      out += " ";
      i++;
      while (i < n && source[i] !== quote) {
        if (source[i] === "\\" && i + 1 < n) {
          out += "  ";
          i += 2;
          continue;
        }
        out += source[i] === "\n" ? "\n" : " ";
        i++;
      }
      if (i < n) { out += " "; i++; }
      continue;
    }

    out += ch;
    i++;
  }
  return out;
}

const TOP_LEVEL_AT_RULE_STATEMENT = /^@(import|charset|namespace|layer)\b/i;

function validateCss(source, fileLabel) {
  const errors = [];
  const masked = maskNonStructural(source);
  const n = masked.length;

  let depth = 0;
  let segmentStart = 0;
  const openStack = [];

  for (let i = 0; i < n; i++) {
    const ch = masked[i];

    if (ch === "{") {
      const prelude = source.slice(segmentStart, i).trim();
      if (prelude.length === 0) {
        const { line, col } = lineColAt(source, i);
        errors.push(`${fileLabel}:${line}:${col} — empty selector/at-rule prelude before '{'`);
      }
      openStack.push({ index: i, prelude });
      depth++;
      segmentStart = i + 1;
      continue;
    }

    if (ch === "}") {
      if (depth === 0) {
        const { line, col } = lineColAt(source, i);
        errors.push(`${fileLabel}:${line}:${col} — stray closing '}' with no matching '{'`);
        segmentStart = i + 1;
        continue;
      }
      openStack.pop();
      depth--;
      segmentStart = i + 1;
      continue;
    }

    if (ch === ";" && depth === 0) {
      const segment = source.slice(segmentStart, i).trim();
      if (segment.length > 0 && !TOP_LEVEL_AT_RULE_STATEMENT.test(segment)) {
        const { line, col } = lineColAt(source, segmentStart);
        errors.push(`${fileLabel}:${line}:${col} — declaration/statement found outside any rule block: "${segment.slice(0, 60)}"`);
      }
      segmentStart = i + 1;
    }
  }

  if (depth !== 0) {
    const last = openStack[openStack.length - 1];
    const { line, col } = lineColAt(source, last.index);
    errors.push(`${fileLabel}:${line}:${col} — unclosed block starting here (prelude: "${last.prelude.slice(0, 60)}")`);
  } else {
    const trailing = source.slice(segmentStart).trim();
    if (trailing.length > 0) {
      const { line, col } = lineColAt(source, segmentStart);
      errors.push(`${fileLabel}:${line}:${col} — trailing content after last rule with no terminator: "${trailing.slice(0, 60)}"`);
    }
  }

  return errors;
}

function main() {
  const args = process.argv.slice(2);
  const files = args.length > 0
    ? args.map(f => resolve(process.cwd(), f))
    : findDefaultFiles();

  let anyErrors = false;
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    const label = relative(MODULE_ROOT, file);
    const errors = validateCss(source, label);
    if (errors.length === 0) {
      console.log(`OK    ${label}`);
    } else {
      anyErrors = true;
      console.log(`NOK   ${label}`);
      for (const err of errors) console.log(`      ${err}`);
    }
  }

  process.exit(anyErrors ? 1 : 0);
}

main();
