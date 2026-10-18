#!/usr/bin/env node
/**
 * Where this module still speaks dnd5e 5.3 (PLAN_migracja_dnd5e6.md §3, §7): every data path, flag, API and DOM
 * hook that dnd5e 6.0 renamed, moved or removed, found statically in the module's code, templates and styles.
 *
 *   node dev/migration/dnd5e6-scan.mjs                     # counts per rule (JSON)
 *   node dev/migration/dnd5e6-scan.mjs --list[=rule,…]     # with every place (file:line and the line)
 *   node dev/migration/dnd5e6-scan.mjs --fail-on=rule,…    # exit 1 while a named rule still finds anything
 *   node dev/migration/dnd5e6-scan.mjs --fail-on=… --quiet  # only the failing places (`npm test`)
 *   node dev/migration/dnd5e6-scan.mjs --lang=<new en.json> [--lang-before=<old en.json>]  # + pl.json DND5E keys gone
 *
 * Each stage starts by refreshing its numbers from here (§6.1) and, once its rules reach zero, adds them to
 * `--fail-on` in `npm test` so they stay at zero (§7: "stare odczyty nie istnieją w kodzie — test statyczny").
 * Patterns are deliberately literal: a hit is a place to look at, not a verdict.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SCAN = [
  { dir: "scripts", ext: /\.m?js$/ },
  { dir: "dev/e2e", ext: /\.m?js$/ },
  { dir: "dev/poligon", ext: /\.m?js$/ },
  { dir: "dev/packs", ext: /\.m?js$/ },
  { dir: "templates", ext: /\.(hbs|html)$/ },
  { dir: "styles", ext: /\.css$/ }
];
// This scanner's own rule table would match itself.
// The adapter (chat-message-data.mjs) documents the 5.3 flags it replaces.
const SKIP_FILES = new Set(["dev/migration/dnd5e6-scan.mjs", "scripts/config/chat-message-data.mjs"]);

/** @type {{id: string, stage: string, what: string, test: RegExp, files?: RegExp}[]} */
export const RULES = [
  // §3.3 — chat message flags the dnd5e 6 world migration deletes (→ message.system.*, getAssociated*()).
  { id: "message-flags", stage: "E3", what: "flags.dnd5e.roll|use|messageType|item|activity|targets|originatingMessage on chat messages, and Activity#messageFlags that made them (gone in 6.0) → scripts/config/chat-message-data.mjs (message.type, message.system.*)",
    test: /flags\??\.dnd5e\??\.(roll|use|messageType|item|activity|targets|originatingMessage)\b|getFlag\(\s*["']dnd5e["']\s*,\s*["'](roll|use|messageType|item|activity|targets|originatingMessage)\b|["']flags\.dnd5e\.(roll|use|messageType|item|activity|targets|originatingMessage)\b|\bdnd5e:\s*\{\s*(roll|use|messageType|item|activity|targets|originatingMessage)\s*:|\.messageFlags\b/ },
  // §3.6 — effect origin moves to system.origin.{activity,effect,item,actor,behavior}.
  { id: "effect-origin", stage: "E3", what: "top-level ActiveEffect origin written from a uuid → system.origin",
    test: /^\s*origin:\s*[\w?.]+\.uuid\b/ },
  // §3.6 — top-level `changes` in new effect data: core v14 migrates it silently (no compatibility warning) until
  // v16. Not a static rule: rule tables (diseases, conditions, chemistry) legitimately hold `changes` lists that
  // builders put under `system.changes` (verified 2026-10-18); a runtime check of creation data belongs to E10.
  // §2.1 — core v14: `{-=key: null}` deletion → `{key: new foundry.data.operators.ForcedDeletion()}` (removed in v16;
  // `unsetFlag` already uses the operator). Triage E2: ~60 warnings with core as the last frame — the calls are ours.
  { id: "deletion-syntax", stage: "E3", what: "`-=key` forced deletion written in update data → `_del` (foundry.data.operators.ForcedDeletion) or unsetFlag; reading a `-=` key from hook changes stays for older callers",
    test: /\.-=[^"'`\n]*["'`]\]?\s*[:=,]\s*null\b/, files: /\.m?js$/ },
  // Core v14: MeasuredTemplate merged into Region (memory: v14 templates are Regions).
  // dnd5e 6.0 places activity templates as Regions through TemplatePlacement: its hooks are
  // dnd5e.{pre,post,}CreateMeasuredTemplate; the *ActivityTemplate ones fire only from the deprecated AbilityTemplate.
  { id: "scene-templates", stage: "E4", what: "Scene#templates / MeasuredTemplate documents (merged into Region in v14) and dnd5e 5.3's *ActivityTemplate hooks → Regions, dnd5e.createMeasuredTemplate",
    test: /\b\w*[sS]cene\??\.templates\b|ogladana\??\.templates\b|(getEmbeddedCollection|createEmbeddedDocuments|updateEmbeddedDocuments|deleteEmbeddedDocuments)\(\s*["']MeasuredTemplate["']|dnd5e\.(preCreate|create)ActivityTemplate\b/, files: /\.m?js$/ },
  { id: "effect-modes", stage: "E3", what: "CONST.ACTIVE_EFFECT_MODES (numeric modes) → string change types",
    test: /ACTIVE_EFFECT_MODES/ },
  // Core v14: the V1 Application framework is deprecated (Dialog → foundry.applications.api.DialogV2).
  { id: "v1-dialog", stage: "E7", what: "V1 Dialog / Application → DialogV2 / ApplicationV2 (core v14 deprecation)",
    test: /new Dialog\(|\bDialog\.(confirm|prompt|wait)\(|extends (Application|FormApplication|Dialog)\b|new FormApplication/, files: /\.m?js$/ },
  // §3.12 — renamed prepared-data paths: no shim for reads, `undefined` under the old key.
  { id: "movement", stage: "E3", what: "attributes.movement.<type> → attributes.movement.speeds.<type>",
    test: /movement\??\.(walk|fly|swim|climb|burrow|hover)\b|["']system\.attributes\.movement\.(walk|fly|swim|climb|burrow)["']|movement\.\$\{(?!.*speeds)/ },
  { id: "senses", stage: "E3", what: "attributes.senses.<sense> → attributes.senses.ranges.<sense>",
    test: /senses\??\.(darkvision|blindsight|tremorsense|truesight)\b/ },
  { id: "roll-bonuses", stage: "E3", what: "system.bonuses.{mwak,rwak,msak,rsak,abilities} → system.rolls.*",
    test: /bonuses\??\.(mwak|rwak|msak|rsak|abilities)\b/ },
  { id: "check-save-bonuses", stage: "E3", what: "abilities/skills/tools.*.bonuses.{check,save}, death/concentration bonuses, init.bonus → *.roll.bonus",
    test: /\.bonuses\??\.(check|save)\b|(death|concentration)\??\.bonuses\b|\binit\??\.bonus\b/ },
  // `ac.base` stays: 6.0 still prepares it (not persisted, attributes.mjs); `ac.calc` is now the winning formula id.
  { id: "armor-class", stage: "E3", what: "ac.flat|calc|formula as 5.3 stored the setup → ac.calcs / ac.formulas / ac.override",
    test: /\bac\??\.(flat|calc|formula)\b|["']system\.attributes\.ac\.(flat|calc|formula)["']/ },
  { id: "rarity", stage: "E3", what: "system.rarity → system.rarities",
    test: /system\??\.rarity\b(?!ies)/ },
  // §3.5 — CONFIG.DND5E tables whose shape changed in 6.0.
  { id: "config-tables", stage: "E3", what: "CONFIG.DND5E tables reshaped in 6.0 (check each use)",
    test: /CONFIG\.DND5E\.(activityTypes|itemProperties|actorSizes|conditionTypes|validProperties|requests|conditionEffects|restTypes|bloodied|shieldIds|itemRarity|armorProficienciesMap)\b/ },
  // §3.2, §3.10 — methods and APIs rewritten or gone.
  // dnd5e 6.0: `dnd5e.rollDeathSave` details carry `outcome` ("stable"/"revive"/"death"), no `chatString`.
  { id: "death-save-details", stage: "E4", what: "dnd5e.rollDeathSave details.chatString (5.3) → details.outcome",
    test: /\bchatString\b|DND5E\.DeathSave(Success|CriticalSuccess|Failure)\b/, files: /\.m?js$/ },
  { id: "activity-api", stage: "E4", what: "activity chat API: _usageChatButtons (now descriptors), activateChatListeners, getCardData",
    test: /\b_usageChatButtons\b|\bactivateChatListeners\b|\bgetCardData\b/ },
  // 6.0 groups targets (`buildTargetListEntry(targetList, {uuid, name})`, wrapped in damage-reduction/emiter-emp
  // since E3); what stays flagged is the 5.3 API the tray no longer has. Our own `_onApplyDamage` functions are
  // `dnd5e.applyDamage` listeners (unchanged hook), not the tray's method.
  { id: "damage-tray-api", stage: "E5", what: "damage tray 5.3 internals: _onChangeOptions (gone), the per-target list entry signature, the tray's _onApplyDamage",
    test: /\b_onChangeOptions\b|\.(refreshListEntry|_onApplyDamage)\b|buildTargetListEntry\s*=\s*function\s*\(\s*(li|uuid|target|token)\b/ },
  // §3.3 — dnd5e chat card DOM (cards render from message.system now; HTML changed).
  { id: "chat-card-dom", stage: "E6", what: "dnd5e chat card DOM: .chat-card, .card-tray, .card-header, .card-buttons, damage-application, effect-application",
    test: /\.chat-card\b|card-tray|\.card-header\b|\.card-buttons\b|damage-application|effect-application/ }
];

function* files() {
  for (const { dir, ext } of SCAN) {
    const base = path.join(ROOT, dir);
    if (!fs.existsSync(base)) continue;
    const walk = function* (d) {
      for (const e of fs.readdirSync(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) { if (e.name !== "node_modules") yield* walk(p); continue; }
        if (ext.test(e.name)) yield path.relative(ROOT, p).replaceAll("\\", "/");
      }
    };
    yield* walk(base);
  }
}

export function scan(rules = RULES) {
  const hits = Object.fromEntries(rules.map(r => [r.id, []]));
  for (const file of files()) {
    if (SKIP_FILES.has(file)) continue;
    const lines = fs.readFileSync(path.join(ROOT, file), "utf8").split(/\r?\n/);
    for (const r of rules) {
      if (r.files && !r.files.test(file)) continue;
      lines.forEach((line, i) => { if (r.test.test(line)) hits[r.id].push({ file, line: i + 1, text: line.trim().slice(0, 160) }); });
    }
  }
  return hits;
}

/**
 * DND5E.* keys in lang/pl.json against a dnd5e en.json (§3.13). The module also defines keys of its own in that
 * namespace (item properties, weapon groups — 47 on 2026-10-17); with `beforePath` (the previous dnd5e's en.json)
 * those are told apart from dnd5e keys that the new version dropped, whose successors now show in English.
 */
export function staleLangKeys(enJsonPath, beforePath = null) {
  const flat = (obj, prefix = "") => Object.entries(obj).flatMap(([k, v]) => (v && typeof v === "object" ? flat(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
  const keys = file => new Set(flat(JSON.parse(fs.readFileSync(file, "utf8"))));
  const pl = [...keys(path.join(ROOT, "lang", "pl.json"))].filter(k => k.startsWith("DND5E."));
  const en = keys(enJsonPath);
  const missing = pl.filter(k => !en.has(k)).sort();
  if (!beforePath) return { translated: pl.length, missing };
  const before = keys(beforePath);
  return { translated: pl.length, dropped: missing.filter(k => before.has(k)), ownKeys: missing.filter(k => !before.has(k)).length };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = name => process.argv.slice(2).find(a => a === `--${name}` || a.startsWith(`--${name}=`));
  const value = name => arg(name)?.split("=").slice(1).join("=") || null;
  const hits = scan();
  const listed = arg("list") ? (value("list")?.split(",") ?? Object.keys(hits)) : [];
  const out = {
    rules: RULES.map(r => {
      const h = hits[r.id];
      return {
        id: r.id, stage: r.stage, places: h.length, files: new Set(h.map(x => x.file)).size, what: r.what,
        ...(listed.includes(r.id) ? { at: h.map(x => `${x.file}:${x.line}  ${x.text}`) } : {})
      };
    })
  };
  if (value("lang")) out.lang = staleLangKeys(value("lang"), value("lang-before"));
  const failOn = value("fail-on")?.split(",").filter(Boolean) ?? [];
  const failing = failOn.filter(id => hits[id]?.length);
  const unknown = failOn.filter(id => !hits[id]);
  out.ok = failing.length === 0 && unknown.length === 0;
  if (failing.length) out.failing = failing;
  if (unknown.length) out.unknownRules = unknown;
  if (arg("quiet")) {
    for (const id of failing) for (const h of hits[id]) process.stdout.write(`dnd5e6-scan ${id}: ${h.file}:${h.line}  ${h.text}\n`);
    for (const id of unknown) process.stdout.write(`dnd5e6-scan: unknown rule ${id}\n`);
    if (out.ok) process.stdout.write(`dnd5e6-scan: ${failOn.length} rule(s) at zero\n`);
  } else process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
  process.exitCode = out.ok ? 0 : 1;
}
