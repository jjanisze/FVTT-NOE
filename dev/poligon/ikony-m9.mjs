#!/usr/bin/env node
/**
 * M9 · odświeżenie ścieżek ikon w istniejących dokumentach **Poligonu** (HANDOFF_m9_graphics_to_code.md, krok 5).
 *
 *   node dev/poligon/ikony-m9.mjs                 # plan (domyślnie): nic nie zapisuje, raport do logs/poligon/ikony-m9/
 *   node dev/poligon/ikony-m9.mjs --apply         # zapis; dziennik zmian (undo) i kopia stron Galerii obok raportu
 *   node dev/poligon/ikony-m9.mjs --undo=<plik>   # przywraca `from` z dziennika zmian `--apply`
 *
 * Pełna kopia świata przed pierwszym zapisem: `npm run fvtt -- backup --profile=poligon --world=poligon` (przy
 * zatrzymanym Poligonie). Ten skrypt dokłada dziennik zmian pole po polu — cofnięcie bez przywracania kopii.
 *
 * Wiązania pochodzą z zatwierdzonego manifestu (`dev/finish/manifest.json`: pack + pole konsumenta + id),
 * te same co w `build-packs` — nigdy z nazwy przedmiotu ani globalnej podmiany ścieżek. Reszta to reguła
 * runtime modułu; co niejednoznaczne, trafia do raportu. Idempotentny: drugi `--apply` zmienia 0 pól.
 * Tylko Poligon: strona sprawdza `game.world.id === "poligon"`; migracja kampanii to osobne polecenie MG.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { MODULE_ROOT, abs, loadManifest } from "../finish/lib/profile.mjs";
import { odswiezIkony } from "./lib/ikony-m9-strona.mjs";

const args = process.argv.slice(2);
const APPLY = args.includes("--apply");
const UNDO = args.find(a => a.startsWith("--undo="))?.slice(7);
const mode = UNDO ? "undo" : APPLY ? "apply" : "plan";
const OUT_DIR = abs("logs/poligon/ikony-m9");
const EXPORTED = new Set(["pilot", "approved"]);

function data() {
  if (UNDO) {
    const log = JSON.parse(fs.readFileSync(path.resolve(UNDO), "utf8"));
    if (log.mode !== "apply" || !Array.isArray(log.changes)) throw new Error(`${UNDO}: to nie jest dziennik --apply.`);
    return { mode, changes: log.changes };
  }
  const manifest = loadManifest();
  const bindings = {}, outputs = {};
  for (const e of manifest.entries) {
    if (e.kind !== "icon") continue;
    const out = e.outputs[0].path;
    outputs[out] = e.wrapper;
    if (!EXPORTED.has(e.review?.status) || !fs.existsSync(abs(out))) continue;
    for (const c of e.consumers) if (c.type === "pack") for (const id of c.ids ?? []) {
      const key = `${c.pack}:${c.via}:${id}`;
      if (bindings[key] && bindings[key] !== out) throw new Error(`Niejednoznaczny konsument w manifeście: ${key}`);
      bindings[key] = out;
    }
  }
  return { mode, bindings, outputs, profile: manifest.profile?.id ?? manifest.profile };
}

function evalInPoligon(payload) {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), "noe-ikony-m9-")), "body.js");
  fs.writeFileSync(file, `return (${odswiezIkony.toString()})(${JSON.stringify(payload)});\n`);
  const res = spawnSync(process.execPath, [path.join(MODULE_ROOT, "dev/agent/fvtt.mjs"), "eval", "--profile=poligon", "--user=Gamemaster", `--file=${file}`, "--timeout=1800"],
    { cwd: MODULE_ROOT, encoding: "utf8", maxBuffer: 256 << 20, windowsHide: true });
  fs.rmSync(path.dirname(file), { recursive: true, force: true });
  const text = res.stdout ?? "";
  const json = text.slice(text.indexOf("{"));
  let parsed;
  try { parsed = JSON.parse(json); } catch { throw new Error(`fvtt eval nie zwrócił JSON (kod ${res.status}):\n${(res.stderr || text).split(/\r?\n/).slice(-15).join("\n")}`); }
  if (!parsed.ok) throw new Error(`fvtt eval: ${JSON.stringify(parsed).slice(0, 2000)}`);
  return parsed.value;
}

const payload = data();
const result = evalInPoligon(payload);
fs.mkdirSync(OUT_DIR, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
const base = path.join(OUT_DIR, `${stamp}-${mode}`);
fs.writeFileSync(`${base}.json`, JSON.stringify({ ...result, profile: payload.profile ?? null }, null, 1));

if (mode === "undo") {
  console.log(`Cofnięto ${result.restored} pól w ${result.items} przedmiotach; brakujących: ${result.missing.length}.`);
  process.exit(result.missing.length ? 1 : 0);
}

const c = result.counts;
const lines = [
  `# M9 · ikony Poligonu — ${mode} ${stamp}`, "",
  `Profil ${payload.profile}; świat ${result.world}; strona ${result.user}.`, "",
  `| | |`, `| --- | ---: |`,
  `| przedmioty | ${c.items} |`, `| pola obrazów | ${c.fields} |`,
  `| **do zmiany** | **${c.changed}** (wiązanie ${c.byVia.binding}, reguła ${c.byVia.rule}) |`,
  `| już wykończone | ${c.alreadyFinished} |`, `| grafika spoza modułu (bez zmian) | ${c.notModuleArt} |`,
  `| grafika własna przy wiązaniu (bez zmian) | ${c.customKept} |`, `| nieznane wykończenie (bez zmian) | ${c.staleFinished} |`,
  `| nierozstrzygnięte (bez zmian) | ${c.unresolved} |`, "",
  `Grupy zapisu: ${result.groups}. Galeria: ${result.galeria ? (result.galeria.ok ? `${result.galeria.updated} stron do odświeżenia, ${result.galeria.created} nowych` : result.galeria.reason) : "brak stanowiska"}.`, "",
  "## Nierozstrzygnięte — do przeglądu (master, liczba pól, przykłady)", "",
  ...(result.unresolved.length ? result.unresolved.map(u => `- \`${u.wrapper}\` × ${u.n} — ${u.examples.join("; ")}`) : ["Brak."]), "",
  "## Grafika własna przy wiązaniu (zostaje)", "",
  ...(result.customKept.length ? result.customKept.map(k => `- ${k.parent ? `${k.parent} › ` : ""}${k.name} (${k.field}): \`${k.img}\` ≠ \`${k.bound}\``) : ["Brak."]), ""
];
fs.writeFileSync(`${base}.md`, lines.join("\n"));
console.log(lines.slice(0, 18).join("\n"));
console.log(`\nRaport: ${path.relative(MODULE_ROOT, base)}.md / .json${mode === "apply" ? " — dziennik zmian do --undo i kopia stron Galerii w .json" : ""}`);
