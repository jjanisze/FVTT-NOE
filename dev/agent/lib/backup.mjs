/**
 * `fvtt backup` (PLAN_migracja_dnd5e6.md E0 (3)): a full copy of one data path, taken while nothing serves it, into
 * `<backup dir>/<yyyy-mm-dd>_<profile>[-<reason>]/` — the folder layout of the campaign's 2026-10-17 backup:
 *
 *   world-<id>.zip · system-dnd5e-<version>.zip · modules-third-party.zip · assets.zip · [foundry-app-<version>.zip]
 *   Config-options.json · manifest.json (versions, parts, record counts) · SHA256SUMS · README.md
 *
 * This module is not in it (it is in git; the manifest names the commit). The license and the admin password are
 * never copied. After writing, every archive is CRC-tested and each world archive is unpacked to a temporary
 * folder and its databases opened and counted — a backup that does not restore is not one.
 */

import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { MODULE_ID } from "./config.mjs";
import { CliError, note, refuse } from "./output.mjs";
import { classicLevel } from "./packs.mjs";
import { packageVersion } from "./systems.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const MODULE_ROOT = path.resolve(HERE, "../../..");

const localDate = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const slug = s => String(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

function python(args) {
  const res = spawnSync("python", ["-I", path.join(HERE, "archive.py"), ...args], {
    encoding: "utf8", windowsHide: true, maxBuffer: 64 * 1024 * 1024, env: { ...process.env, PYTHONUTF8: "1" }
  });
  if (res.status !== 0) throw new CliError(`archive.py ${args[0]} failed: ${(res.stderr ?? "").trim().split(/\r?\n/).slice(-5).join(" | ")}`, { code: "archive" });
  for (const line of (res.stderr ?? "").trim().split(/\r?\n/).filter(Boolean)) note(line);
  return JSON.parse(res.stdout);
}

function sha256(file) {
  const h = crypto.createHash("sha256");
  const fd = fs.openSync(file, "r");
  const buf = Buffer.alloc(1 << 20);
  try {
    for (let n; (n = fs.readSync(fd, buf, 0, buf.length, null)) > 0;) h.update(buf.subarray(0, n));
  } finally {
    fs.closeSync(fd);
  }
  return h.digest("hex");
}

/** Top-level documents per world database (`!actors!<id>` — embedded keys have more segments). */
async function countWorldRecords(worldDir, installApp) {
  const dataDir = path.join(worldDir, "data");
  const out = {};
  if (!fs.existsSync(dataDir)) return out;
  let ClassicLevel = null;
  for (const name of fs.readdirSync(dataDir).sort()) {
    const dir = path.join(dataDir, name);
    if (!fs.existsSync(path.join(dir, "CURRENT"))) continue;
    ClassicLevel ??= classicLevel(installApp);
    const db = new ClassicLevel(dir, { keyEncoding: "utf8", valueEncoding: "json", createIfMissing: false });
    await db.open();
    try {
      let n = 0;
      for await (const key of db.keys()) if (key.split("!").length === 3) n++;
      out[name] = n;
    } finally {
      await db.close().catch(() => {});
    }
  }
  return out;
}

/** The worlds a backup of this profile takes when none are named: the campaign's, the Poligon's, else all. */
export function defaultWorlds(profile, cfg) {
  const worldsDir = path.join(profile.data, "worlds");
  const all = fs.existsSync(worldsDir)
    ? fs.readdirSync(worldsDir, { withFileTypes: true }).filter(d => d.isDirectory() && fs.existsSync(path.join(worldsDir, d.name, "world.json"))).map(d => d.name)
    : [];
  if (profile.name === "campaign") return [cfg.campaign?.world].filter(Boolean);
  if (profile.name === "poligon") return all.filter(w => w === "poligon");
  return all;
}

function gitState() {
  const run = args => spawnSync("git", args, { cwd: MODULE_ROOT, encoding: "utf8", windowsHide: true }).stdout?.trim() ?? null;
  return { commit: run(["rev-parse", "--short", "HEAD"]), dirty: (run(["status", "--porcelain"]) ?? "").split(/\r?\n/).filter(Boolean).length };
}

/**
 * @param {object} p
 * @param {object} p.profile  resolveProfile(); the caller has checked the data path is quiet and holds the mutex
 * @param {object} p.install  installPaths()
 * @param {string} p.root     the backup directory (`backup.dir` in the local config, or --dest)
 * @param {string[]} p.worlds world ids
 * @param {string} [p.reason]
 * @param {boolean} [p.app]   also the Foundry application folder
 */
export async function runBackup({ profile, install, root, worlds, reason = null, app = false }) {
  const t0 = Date.now();
  if (!root || !fs.existsSync(root)) {
    throw new CliError(`Backup directory ${root ?? "(none)"} is not there.`, {
      code: "usage", hint: "Set it once: `npm run fvtt -- init --backup-dir=<folder>`, or pass --dest=<folder> (is the drive connected?)."
    });
  }
  const dest = path.join(root, `${localDate()}_${profile.name}${reason ? `-${slug(reason)}` : ""}`);
  if (fs.existsSync(dest)) throw refuse(`${dest} already exists.`, "exists", "Pass another --reason=<word> (it becomes part of the folder name).");
  const data = profile.data;
  for (const w of worlds) {
    if (!fs.existsSync(path.join(data, "worlds", w, "world.json"))) throw new CliError(`No world ${w} on the ${profile.name} data path.`, { code: "usage" });
  }

  const foundry = JSON.parse(fs.readFileSync(path.join(install.app, "package.json"), "utf8")).release ?? {};
  const foundryVersion = `${foundry.generation}.${foundry.build}`;
  const dnd5e = packageVersion(path.join(data, "systems", "dnd5e"));
  const parts = [
    ...worlds.map(w => ({ file: `world-${w}.zip`, src: path.join(data, "worlds", w) })),
    ...(dnd5e ? [{ file: `system-dnd5e-${dnd5e}.zip`, src: path.join(data, "systems", "dnd5e") }] : []),
    { file: "modules-third-party.zip", src: path.join(data, "modules"), skip: [MODULE_ID] },
    ...(fs.existsSync(path.join(data, "assets")) ? [{ file: "assets.zip", src: path.join(data, "assets") }] : []),
    ...(app ? [{ file: `foundry-app-${foundryVersion}.zip`, src: path.resolve(install.app, "..", "..") }] : [])
  ];

  fs.mkdirSync(dest, { recursive: false });
  const spec = path.join(os.tmpdir(), `fvtt-backup-${process.pid}.json`);
  fs.writeFileSync(spec, JSON.stringify({ dest, parts }));
  let zipped;
  try {
    zipped = python(["zip", spec]).parts;
  } finally {
    fs.rmSync(spec, { force: true });
  }
  const optionsSrc = path.join(profile.dataPath, "Config", "options.json");
  if (fs.existsSync(optionsSrc)) fs.copyFileSync(optionsSrc, path.join(dest, "Config-options.json"));

  // Restore check: each world unpacked to a temporary folder, its databases opened and counted.
  const worldInfo = [];
  for (const w of worlds) {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fvtt-restore-"));
    try {
      python(["extract", path.join(dest, `world-${w}.zip`), tmp]);
      const manifest = JSON.parse(fs.readFileSync(path.join(tmp, w, "world.json"), "utf8"));
      worldInfo.push({
        id: w, title: manifest.title, system: manifest.system, systemVersion: manifest.systemVersion ?? null,
        coreVersion: manifest.compatibility?.verified ?? manifest.coreVersion ?? null,
        records: await countWorldRecords(path.join(tmp, w), install.app)
      });
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  }

  const modulesDir = path.join(data, "modules");
  const modules = Object.fromEntries(fs.readdirSync(modulesDir, { withFileTypes: true })
    .filter(d => d.name !== MODULE_ID && (d.isDirectory() || d.isSymbolicLink()))
    .map(d => [d.name, packageVersion(path.join(modulesDir, d.name), "module.json")]));
  const manifest = {
    createdAt: new Date().toISOString(), by: process.env.FVTT_AGENT ?? "fvtt backup", profile: profile.name, reason,
    foundry: foundryVersion, dnd5e, module: { id: MODULE_ID, version: packageVersion(path.join(modulesDir, MODULE_ID), "module.json"), ...gitState() },
    modules, worlds: worldInfo, parts: zipped, config: fs.existsSync(path.join(dest, "Config-options.json")) ? "Config-options.json" : null
  };
  fs.writeFileSync(path.join(dest, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  fs.writeFileSync(path.join(dest, "README.md"), readme(manifest));
  const sums = fs.readdirSync(dest).filter(f => f !== "SHA256SUMS" && fs.statSync(path.join(dest, f)).isFile()).sort()
    .map(f => `${sha256(path.join(dest, f))}  ${f}`);
  fs.writeFileSync(path.join(dest, "SHA256SUMS"), `${sums.join("\n")}\n`);

  const bad = zipped.filter(p => p.crc !== "ok");
  return {
    ok: bad.length === 0, dest, ms: Date.now() - t0, foundry: foundryVersion, dnd5e, worlds: worldInfo,
    parts: zipped.map(p => ({ file: p.file, files: p.files, mb: Math.round(p.sourceBytes / 1048576), crc: p.crc, linksSkipped: p.links.length })),
    sizeMb: Math.round(fs.readdirSync(dest).reduce((a, f) => a + fs.statSync(path.join(dest, f)).size, 0) / 1048576)
  };
}

function readme(m) {
  const worlds = m.worlds.map(w => `- \`${w.id}\` — ${w.title} (${w.system} ${w.systemVersion ?? "?"}, core ${w.coreVersion ?? "?"}): ` +
    `${Object.values(w.records).reduce((a, b) => a + b, 0)} documents in ${Object.keys(w.records).length} databases`).join("\n");
  return `# Foundry backup — ${m.profile}${m.reason ? `, ${m.reason}` : ""}

Made by \`fvtt backup\` on ${m.createdAt} with nothing serving the data path. Foundry ${m.foundry}, dnd5e ${m.dnd5e ?? "—"},
${m.module.id} ${m.module.version} (commit ${m.module.commit}${m.module.dirty ? `, ${m.module.dirty} uncommitted files` : ""}; the module itself is in git, not here).

${worlds}

| File | Contents |
|---|---|
${m.parts.map(p => `| \`${p.file}\` | ${p.files} files, ${Math.round(p.sourceBytes / 1048576)} MB${p.links.length ? `; ${p.links.length} links not followed` : ""} |`).join("\n")}
| \`Config-options.json\` | the data path's \`Config/options.json\` (no licence, no admin password) |
| \`manifest.json\` | versions, archives, per-world document counts |
| \`SHA256SUMS\` | \`sha256sum -c SHA256SUMS\` |

Checked when written: every archive CRC-tested; every world unpacked to a temporary folder and its databases opened
and counted (\`manifest.json\` → \`worlds[].records\`).

## Restore

With Foundry stopped: unpack \`world-<id>.zip\` into \`Data/worlds/\` (the archive holds the \`<id>/\` folder),
\`system-dnd5e-*.zip\` into \`Data/systems/\`, \`modules-third-party.zip\` into \`Data/\`, \`assets.zip\` into \`Data/\`.
Move the current folders aside first rather than unpacking over them. The application archive, when present,
replaces the Foundry install folder.
`;
}
