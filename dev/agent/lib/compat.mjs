/**
 * What the browser console tells a test run, sorted (PLAN_migracja_dnd5e6.md E0 (4)) — pure functions over
 * CDP console events, so `npm run test:agent` covers them without a browser.
 *
 *  - Known core errors: the run-level allowlist of layer 6. Exactly the core teardown errors a reseed between
 *    suites provokes in a background window; anything else in the console fails the suite.
 *  - Compatibility warnings: core's `logCompatibilityWarning` (dnd5e calls the same function) logs an Error
 *    through `console.warn`. Each one is attributed to whoever called the deprecated API — this module, dnd5e,
 *    core or another package — from the Error's stack. From E10 a warning whose caller is this module fails.
 */

import { MODULE_ID } from "./config.mjs";

/**
 * Core errors a reseed provokes while the previous suite's animations still run (release gates of 2026-10-17):
 * a notification posted into a removed element, and core's scrolling text — its `y` animation and its
 * `destroy` — on a canvas that was torn down under it. No frame of any package is involved.
 */
export const KNOWN_CORE_ERRORS = [
  { id: "post-notification", test: /Cannot set properties of null \(setting 'hidden'\)[\s\S]*#postNotification/ },
  { id: "scrolling-text", test: /PreciseText\.destroy[\s\S]*createScrollingText/ },
  { id: "scrolling-text", test: /Cannot read properties of null \(reading 'position'\)\s+at set y [\s\S]*#animateFrame/ }
];

/** The allowlist entry an error text matches, or null. A frame from any package disqualifies it. */
export function knownCoreError(text) {
  const s = String(text ?? "");
  if (/\/(modules|systems)\//.test(s)) return null;
  return KNOWN_CORE_ERRORS.find(k => k.test.test(s))?.id ?? null;
}

/** Origins (host:port) out of anything that lands in a report — paths are enough. */
export const stripOrigins = s => String(s ?? "").replace(/https?:\/\/[^/\s)]+/g, "");

/** Who a stack frame belongs to, from the URL in it. */
export function frameOwner(frame) {
  const f = String(frame);
  if (f.includes(`/modules/${MODULE_ID}/`)) return "module";
  if (f.includes("/systems/dnd5e/")) return "dnd5e";
  if (/\/(modules|systems)\//.test(f)) return "other";
  // Code the harness evaluated over CDP has no URL (`<anonymous>:3:18`); a native frame is `Array.map (<anonymous>)`.
  if (f.includes("/agent-e2e/") || f.includes("/agent-poligon/") || /<anonymous>:\d+/.test(f)) return "harness";
  if (/\/scripts\/|\/common\/|\/client\//.test(f) || /\(<anonymous>\)$|\(native\)$/.test(f)) return "core";
  return "unknown";
}

/** Raise V8's stack depth (10) before any page script runs: a deprecated getter read through `deepClone`'s recursion
 * otherwise loses its caller below the cut. For `Page.addScriptToEvaluateOnNewDocument`. */
export const DEEP_STACKS = "Error.stackTraceLimit = Math.max(Error.stackTraceLimit || 0, 50);";

const isFrame = line => /^\s*at\s/.test(line);

/**
 * A console message → a compatibility warning, or null. `args` are CDP RemoteObjects; core passes one Error
 * whose `description` is its stack. Recognised by the helper's frame or by the since/until text it composes.
 * @returns {{message: string, caller: string, frames: string[], deprecated: string|null, involvesModule: boolean}|null}
 */
export function parseCompatWarning(type, args = []) {
  if (type !== "warning" && type !== "error") return null;
  const err = args.find(a => a?.subtype === "error");
  const text = stripOrigins(err?.description ?? args.map(a => a?.value ?? a?.description ?? "").join(" "));
  if (!/logCompatibilityWarning|Deprecated since Version|Backwards-compatible support will be removed/.test(text)) return null;
  const lines = text.split("\n");
  const message = lines.filter(l => !isFrame(l)).join("\n").replace(/^Error:\s*/, "").trim();
  const frames = lines.filter(isFrame).map(l => l.trim().replace(/^at\s+/, ""));
  // [helper, deprecated API, caller, …]. The caller is the first frame after the deprecated API that is not core's
  // own plumbing (`deepClone`, `mergeObject` reading a shimmed getter on someone's behalf); all core → core's.
  const at = frames.findIndex(f => /logCompatibilityWarning/.test(f));
  const from = at >= 0 ? at + 2 : 1;
  const deprecated = at >= 0 ? frames[at + 1] ?? null : null;
  const callerFrame = frames.slice(from).find(f => frameOwner(f) !== "core") ?? frames[from] ?? null;
  return {
    message,
    caller: callerFrame ? frameOwner(callerFrame) : "unknown",
    callerFrame,
    deprecated,
    frames: frames.slice(Math.max(0, at), Math.max(0, at) + 16),
    involvesModule: frames.some(f => frameOwner(f) === "module")
  };
}

/** Warnings deduplicated by message + calling frame, counted; plus a tally by caller. */
export function summariseCompat(list) {
  const byKey = new Map();
  for (const w of list) {
    const key = `${w.message}\u0000${w.callerFrame ?? ""}`;
    const prev = byKey.get(key);
    if (prev) prev.count++;
    else byKey.set(key, { ...w, count: 1 });
  }
  const unique = [...byKey.values()];
  const byCaller = {};
  for (const w of unique) byCaller[w.caller] = (byCaller[w.caller] ?? 0) + w.count;
  return { total: list.length, byCaller, unique };
}
