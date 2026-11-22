#!/usr/bin/env node
/**
 * Style ratchet (PLAN_m9_style.md §8.2, D17) — the NOE visual language may only get more consistent.
 *
 *   node dev/style/ratchet.mjs            # gate: fail when any counter grew or a new file has > 0
 *   node dev/style/ratchet.mjs --update   # lower the baseline to today's counts (never raises it)
 *   node dev/style/ratchet.mjs --report   # per-file table, biggest first
 *   node dev/style/ratchet.mjs --gate     # beta gate: player-visible CSS must be at 0
 *
 * What is counted, per file:
 *
 *   styles/**.css (except styles/noe/tokens*.css — the only place raw values may live)
 *     color   colour literals: #hex, rgb()/rgba(), hsl()/hsla(), named colours
 *     font    `font-family` / `font` declarations that name a typeface instead of a token
 *     motion  `animation` declarations with no `prefers-reduced-motion` counterpart (P8)
 *     core    selectors reaching into Foundry's own frame (#sidebar, #chat-log, …) — D13
 *
 *   scripts/**.mjs, templates/**.hbs
 *     inline  `style="…"` attributes that set colour, background, border or typeface;
 *             dynamic dimensions (`width:${x}px`) are fine and not counted
 *
 * `dev/style/allowlist.json` exempts whole files (canvas/PIXI drawing, the drone OSD, debug and
 * Poligon panels) and named core selectors — every entry carries its reason. No dependencies.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const BASELINE = path.join(HERE, "baseline.json");
const ALLOWLIST = path.join(HERE, "allowlist.json");
const METRICS = ["color", "font", "motion", "core", "inline"];

/** Foundry's own frame: styling these from module CSS needs a written reason (D13). */
const CORE_ROOTS = ["#sidebar", "#chat-log", "#hotbar", "#controls", "#players", "#notifications", "#pause", "#navigation", "#ui-left", "#ui-right", "#ui-top", "#ui-bottom", ".waypoint-label"];

const NAMED_COLORS = new Set(("aliceblue antiquewhite aqua aquamarine azure beige bisque black blanchedalmond blue blueviolet brown burlywood cadetblue chartreuse chocolate coral cornflowerblue cornsilk crimson cyan darkblue darkcyan darkgoldenrod darkgray darkgreen darkgrey darkkhaki darkmagenta darkolivegreen darkorange darkorchid darkred darksalmon darkseagreen darkslateblue darkslategray darkslategrey darkturquoise darkviolet deeppink deepskyblue dimgray dimgrey dodgerblue firebrick floralwhite forestgreen fuchsia gainsboro ghostwhite gold goldenrod gray green greenyellow grey honeydew hotpink indianred indigo ivory khaki lavender lavenderblush lawngreen lemonchiffon lightblue lightcoral lightcyan lightgoldenrodyellow lightgray lightgreen lightgrey lightpink lightsalmon lightseagreen lightskyblue lightslategray lightslategrey lightsteelblue lightyellow lime limegreen linen magenta maroon mediumaquamarine mediumblue mediumorchid mediumpurple mediumseagreen mediumslateblue mediumspringgreen mediumturquoise mediumvioletred midnightblue mintcream mistyrose moccasin navajowhite navy oldlace olive olivedrab orange orangered orchid palegoldenrod palegreen paleturquoise palevioletred papayawhip peachpuff peru pink plum powderblue purple rebeccapurple red rosybrown royalblue saddlebrown salmon sandybrown seagreen seashell sienna silver skyblue slateblue slategray slategrey snow springgreen steelblue tan teal thistle tomato turquoise violet wheat white whitesmoke yellow yellowgreen").split(" "));

/** Properties whose value can carry a colour — named colours are only looked for here. */
const COLOR_PROPS = /^(color|background|background-color|background-image|border|border-(top|right|bottom|left|block|inline)(-(start|end))?(-color)?|border-color|outline|outline-color|box-shadow|text-shadow|fill|stroke|caret-color|text-decoration|text-decoration-color|column-rule|accent-color|scrollbar-color|filter|mask|mask-image|--[\w-]+)$/;

const GENERIC_FONTS = new Set(["inherit", "initial", "unset", "revert", "serif", "sans-serif", "monospace", "cursive", "fantasy", "system-ui", "ui-monospace", "ui-sans-serif", "ui-serif"]);

const rel = p => path.relative(ROOT, p).replaceAll("\\", "/");

function walk(dir, test, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, test, out);
    else if (test(entry.name)) out.push(full);
  }
  return out;
}

/* -------------------------------------------- */
/*  CSS                                          */
/* -------------------------------------------- */

/** Comments out, string and url() interiors blanked — braces inside them must not count. */
function maskCss(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, " "))
    .replace(/url\(\s*(?:"[^"]*"|'[^']*'|[^)]*)\)/g, m => `url(${" ".repeat(m.length - 5)})`)
    .replace(/"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'/g, m => m[0] + "\u0001".repeat(m.length - 2) + m[0]);
}

/**
 * Flat list of style rules with the at-rule context they sit in.
 * @returns {{selector: string, context: string[], decls: {prop: string, value: string}[]}[]}
 */
function parseCss(source, original) {
  const rules = [];
  const stack = [];
  let i = 0;
  let segStart = 0;
  const n = source.length;
  const declsOf = (from, to) => {
    const out = [];
    for (const piece of splitTop(source.slice(from, to), from)) {
      const colon = piece.text.indexOf(":");
      if (colon < 0) continue;
      const prop = piece.text.slice(0, colon).trim().toLowerCase();
      if (!/^-{0,2}[\w-]+$/.test(prop)) continue;
      out.push({ prop, value: piece.text.slice(colon + 1).trim(), raw: original.slice(piece.start + colon + 1, piece.end).trim() });
    }
    return out;
  };
  while (i < n) {
    const ch = source[i];
    if (ch === "{") {
      const prelude = source.slice(segStart, i).trim();
      // A prelude may be preceded by declarations of the enclosing rule (CSS nesting) — keep the tail.
      const tail = prelude.includes(";") ? prelude.slice(prelude.lastIndexOf(";") + 1).trim() : prelude;
      stack.push({ prelude: tail, at: tail.startsWith("@"), bodyStart: i + 1, rule: null });
      const frame = stack.at(-1);
      if (!frame.at || /^@(font-face|page)/.test(tail)) {
        frame.rule = { selector: tail, context: stack.slice(0, -1).filter(f => f.at).map(f => f.prelude), decls: [], parent: stack.slice(0, -1).filter(f => !f.at).map(f => f.prelude).join(" ") };
        rules.push(frame.rule);
      }
      segStart = i + 1;
    } else if (ch === "}") {
      const frame = stack.pop();
      if (frame?.rule) frame.rule.decls.push(...declsOf(segStart, i));
      else if (frame && stack.length) { /* at-rule body end */ }
      segStart = i + 1;
    } else if (ch === ";" ) {
      const frame = stack.at(-1);
      if (frame?.rule) frame.rule.decls.push(...declsOf(segStart, i));
      segStart = i + 1;
    }
    i++;
  }
  return rules;
}

function splitTop(text, offset) {
  const out = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i <= text.length; i++) {
    const ch = text[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    if (i === text.length || (ch === ";" && depth === 0)) {
      if (text.slice(start, i).trim()) out.push({ text: text.slice(start, i), start: offset + start, end: offset + i });
      start = i + 1;
    }
  }
  return out;
}

function countColors(prop, value) {
  let nColors = 0;
  // Custom properties are scanned too: a raw colour parked in a local variable is still a raw colour.
  if (!COLOR_PROPS.test(prop)) return 0;
  const hex = value.match(/#[0-9a-f]{3,8}\b/gi) ?? [];
  nColors += hex.filter(h => [3, 4, 6, 8].includes(h.length - 1)).length;
  nColors += (value.match(/\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch)\(/gi) ?? []).length;
  // `color-mix()` over tokens is fine; a named colour inside it is still counted below.
  for (const word of value.toLowerCase().match(/(?<![\w-])[a-z]+(?![\w-]|\()/g) ?? []) if (NAMED_COLORS.has(word)) nColors++;
  return nColors;
}

function namesTypeface(prop, value, raw) {
  if (prop !== "font-family" && prop !== "font") return false;
  if (prop === "font" && /^(inherit|initial|unset)$/i.test(value)) return false;
  // Strings are masked in `value`; a quoted family means a typeface was named.
  if (/["']/.test(raw)) return true;
  const families = prop === "font" ? raw.replace(/^.*?\d[\w.%]*(?:\s*\/\s*[\w.%]+)?\s+/, "") : raw;
  return families.split(",").map(s => s.trim().toLowerCase()).filter(Boolean)
    .some(f => !f.startsWith("var(") && !GENERIC_FONTS.has(f) && !/^[\d.]/.test(f) && !/^(bold|italic|normal|\d+)$/.test(f));
}

function selectorsOf(rule) {
  return rule.selector.split(",").map(s => s.replace(/\s+/g, " ").trim()).filter(Boolean);
}

function scanCss(file, allow) {
  const original = fs.readFileSync(file, "utf8");
  const rules = parseCss(maskCss(original), original);
  const counts = { color: 0, font: 0, motion: 0, core: 0 };
  const reduced = rule => rule.context.some(c => /prefers-reduced-motion\s*:\s*reduce/.test(c));
  const noPreference = rule => rule.context.some(c => /prefers-reduced-motion\s*:\s*no-preference/.test(c));
  const stilled = new Set();
  for (const rule of rules) {
    if (!reduced(rule)) continue;
    if (rule.decls.some(d => /^animation(-name)?$/.test(d.prop) && /^none\b/.test(d.value))) selectorsOf(rule).forEach(s => stilled.add(s));
  }
  const allowedCore = new Set((allow.coreSelectors ?? []).filter(e => !e.file || e.file === rel(file)).map(e => e.selector));
  for (const rule of rules) {
    if (rule.selector.startsWith("@font-face")) continue;
    for (const decl of rule.decls) {
      counts.color += countColors(decl.prop, decl.value);
      if (namesTypeface(decl.prop, decl.value, decl.raw)) counts.font++;
      if (/^animation(-name)?$/.test(decl.prop) && !/^(none|inherit|unset|initial)\b/.test(decl.value) && !reduced(rule) && !noPreference(rule)) {
        if (!selectorsOf(rule).every(s => stilled.has(s))) counts.motion++;
      }
    }
    if (!rule.selector.startsWith("@")) {
      for (const sel of selectorsOf(rule)) {
        const full = `${rule.parent} ${sel}`.trim();
        const root = CORE_ROOTS.find(r => new RegExp(`(^|[\\s>+~,(])${r.replace(/[.#]/g, "\\$&")}(?![\\w-])`).test(full));
        if (root && !allowedCore.has(root)) counts.core++;
      }
    }
  }
  return counts;
}

/* -------------------------------------------- */
/*  Inline styles in scripts and templates       */
/* -------------------------------------------- */

const INLINE_ATTR = /\bstyle\s*=\s*(\\?["'])([\s\S]*?)\1/g;
const INLINE_PAINT = /(^|[;\s"'`{])(color|background(?:-color|-image)?|border(?:-[a-z-]+)?|outline(?:-color)?|font(?:-family)?|box-shadow|text-shadow|fill|stroke)\s*:/i;

/** The same paint set from script: `el.style.cssText = "…"` and `el.style.color = …`. */
const CSS_TEXT = /\bcssText\s*\+?=\s*(["'`])([\s\S]*?)\1/g;
const STYLE_PROP = /\.style\.(color|background\w*|border\w*|outline\w*|fontFamily|boxShadow|textShadow)\s*=(?!=)/g;

function scanInline(file) {
  const source = fs.readFileSync(file, "utf8");
  let inline = 0;
  for (const m of source.matchAll(INLINE_ATTR)) if (INLINE_PAINT.test(m[2])) inline++;
  for (const m of source.matchAll(CSS_TEXT)) if (INLINE_PAINT.test(m[2])) inline++;
  inline += (source.match(STYLE_PROP) ?? []).length;
  return { inline };
}

/* -------------------------------------------- */
/*  Run                                          */
/* -------------------------------------------- */

function readJson(file, fallback) {
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;
}

function globToRegExp(glob) {
  return new RegExp(`^${glob.split("**").map(part => part.split("*").map(s => s.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join("[^/]*")).join(".*")}$`);
}

export function measure() {
  const allow = readJson(ALLOWLIST, { files: [], coreSelectors: [] });
  for (const entry of [...(allow.files ?? []), ...(allow.coreSelectors ?? [])]) {
    if (!entry.reason?.trim()) throw new Error(`allowlist: wpis ${JSON.stringify(entry.path ?? entry.selector)} nie ma powodu`);
  }
  const allowed = (allow.files ?? []).map(e => ({ ...e, re: globToRegExp(e.path) }));
  const isAllowed = file => allowed.find(e => e.re.test(file));
  const counts = {};
  const exempt = {};
  const put = (file, value) => {
    const name = rel(file);
    const total = Object.values(value).reduce((a, b) => a + b, 0);
    if (!total) return;
    if (isAllowed(name)) exempt[name] = value;
    else counts[name] = value;
  };
  for (const file of walk(path.join(ROOT, "styles"), n => n.endsWith(".css"))) {
    if (/^styles\/noe\/tokens[\w.-]*\.css$/.test(rel(file))) continue;
    put(file, scanCss(file, allow));
  }
  for (const file of walk(path.join(ROOT, "scripts"), n => n.endsWith(".mjs"))) put(file, scanInline(file));
  for (const file of walk(path.join(ROOT, "templates"), n => n.endsWith(".hbs"))) put(file, scanInline(file));
  const unused = allowed.filter(e => !Object.keys(exempt).some(f => e.re.test(f))).map(e => e.path);
  return { counts, exempt, unused };
}

function totals(counts) {
  const t = Object.fromEntries(METRICS.map(m => [m, 0]));
  for (const value of Object.values(counts)) for (const m of METRICS) t[m] += value[m] ?? 0;
  return t;
}

function main() {
  const args = new Set(process.argv.slice(2));
  const { counts, exempt, unused } = measure();
  const baseline = readJson(BASELINE, null);
  const now = totals(counts);

  if (args.has("--report")) {
    const rows = Object.entries(counts).map(([file, v]) => [file, METRICS.reduce((a, m) => a + (v[m] ?? 0), 0), v]).sort((a, b) => b[1] - a[1]);
    for (const [file, total, v] of rows) console.log(`${String(total).padStart(5)}  ${file}  ${METRICS.filter(m => v[m]).map(m => `${m}=${v[m]}`).join(" ")}`);
    console.log(`\nRazem: ${METRICS.map(m => `${m}=${now[m]}`).join(" ")} w ${rows.length} plikach; poza bramką (allowlista): ${Object.keys(exempt).length} plików.`);
    return 0;
  }

  if (!baseline || args.has("--update")) {
    const next = {};
    const raised = [];
    for (const [file, value] of Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))) {
      const entry = {};
      for (const m of METRICS) {
        const cur = value[m] ?? 0;
        const old = baseline?.files?.[file]?.[m] ?? (baseline ? 0 : cur);
        if (cur > old) raised.push(`${file}: ${m} ${old} → ${cur}`);
        if (Math.min(cur, old)) entry[m] = Math.min(cur, old);
      }
      if (Object.keys(entry).length) next[file] = entry;
    }
    if (raised.length) {
      console.error(`Zapadka stylu: --update tylko obniża bazę, a te liczniki wzrosły:\n  ${raised.join("\n  ")}`);
      return 1;
    }
    fs.writeFileSync(BASELINE, `${JSON.stringify({ schema: "noe-style-ratchet/v1", totals: totals(next), files: next }, null, 2)}\n`);
    console.log(`Zapadka stylu: baza ${baseline ? "obniżona" : "utworzona"} — ${METRICS.map(m => `${m}=${totals(next)[m]}`).join(" ")}.`);
    return 0;
  }

  const problems = [];
  for (const [file, value] of Object.entries(counts)) {
    for (const m of METRICS) {
      const cur = value[m] ?? 0;
      const old = baseline.files[file]?.[m] ?? 0;
      if (cur > old) problems.push(`${file}: ${m} ${old} → ${cur}${baseline.files[file] ? "" : " (nowy plik — musi mieć 0)"}`);
    }
  }
  for (const glob of unused) problems.push(`allowlist: wpis "${glob}" nie pasuje do żadnego pliku — usuń go`);

  const base = baseline.totals ?? totals(baseline.files);
  if (args.has("--gate")) {
    const css = Object.entries(counts).filter(([f]) => f.endsWith(".css"));
    const left = css.reduce((a, [, v]) => a + (v.color ?? 0) + (v.font ?? 0) + (v.motion ?? 0) + (v.core ?? 0), 0);
    if (left) problems.push(`bramka bety (D17): CSS widoczny dla gracza ma jeszcze ${left} surowych wartości (${css.map(([f, v]) => `${f}: ${Object.entries(v).map(([m, c]) => `${m}=${c}`).join(" ")}`).join("; ")})`);
  }
  if (problems.length) {
    console.error(`Zapadka stylu — ${problems.length} problem(ów):\n  ${problems.join("\n  ")}\n\nKolory, kroje i odstępy biorą się z tokenów --noe-* (styles/noe/tokens*.css), sygnały z komponentów noe-*.\nWyjątek (canvas, OSD, debug) → dev/style/allowlist.json z powodem. Po zejściu z licznikami: node dev/style/ratchet.mjs --update`);
    return 1;
  }
  const lower = METRICS.filter(m => now[m] < (base[m] ?? 0));
  console.log(`Zapadka stylu OK — ${METRICS.map(m => `${m}=${now[m]}${now[m] < (base[m] ?? 0) ? ` (baza ${base[m]})` : ""}`).join(" ")}${lower.length ? " — liczniki spadły, zapisz: node dev/style/ratchet.mjs --update" : ""}`);
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(main());
