/**
 * Finding, starting and killing Foundry server processes — and nothing else.
 *
 * A process counts as Foundry only by its executable path: the desktop app's
 * `Foundry Virtual Tabletop.exe` from the configured install, or `node.exe` running that
 * install's `resources/app/main.js` (headless). Kills go through `assertKillable`, which
 * re-checks that on the live process, so a recycled pid can never take Chrome or an
 * editor with it (§4: Chrome stays human).
 */

import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { CliError, refuse } from "./output.mjs";

const norm = p => (p ? path.resolve(p).toLowerCase() : "");

function powershellJson(script) {
  const res = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command",
    `$ProgressPreference='SilentlyContinue'; ${script} | ConvertTo-Json -Depth 3 -Compress`], {
    encoding: "utf8", windowsHide: true, timeout: 60_000
  });
  if (res.status !== 0) throw new CliError(`PowerShell query failed: ${(res.stderr ?? "").trim().slice(0, 300)}`);
  const text = res.stdout.trim();
  if (!text) return [];
  const parsed = JSON.parse(text);
  return Array.isArray(parsed) ? parsed : [parsed];
}

/** All candidate processes, with command lines. One PowerShell round-trip. */
export function listProcesses() {
  return powershellJson(
    "Get-CimInstance Win32_Process -Filter \"Name='Foundry Virtual Tabletop.exe' OR Name='node.exe'\" | "
    + "Select-Object ProcessId, ParentProcessId, Name, ExecutablePath, CommandLine, "
    + "@{n='Created';e={$_.CreationDate.ToString('o')}}"
  ).map(p => ({
    pid: p.ProcessId, ppid: p.ParentProcessId, name: p.Name,
    exe: p.ExecutablePath ?? "", cmd: p.CommandLine ?? "", created: p.Created
  }));
}

/** `--dataPath=` from a Foundry command line, or null when it uses the default. */
export function dataPathArg(cmd) {
  const m = /--dataPath=(?:"([^"]+)"|(\S+))/.exec(cmd ?? "");
  return m ? path.resolve(m[1] ?? m[2]) : null;
}

/**
 * Foundry server processes (Electron main process or headless node), each tagged with the
 * data path it serves. Electron helper processes (`--type=renderer` etc.) are folded into
 * their main process.
 */
export function foundryServers(install, defaultDataPath, processes = listProcesses()) {
  const exe = norm(install.exe);
  const mainJs = norm(install.mainJs);
  return processes.filter(p => {
    if (norm(p.exe) === exe) return !/--type=/.test(p.cmd);
    return p.name.toLowerCase() === "node.exe" && p.cmd.toLowerCase().replaceAll("/", "\\").includes(mainJs);
  }).map(p => ({
    pid: p.pid,
    kind: norm(p.exe) === exe ? "desktop" : "headless",
    dataPath: dataPathArg(p.cmd) ?? path.resolve(defaultDataPath),
    created: p.created
  }));
}

/** Other processes that can hold a world/pack LevelDB: our pack builder, foundry-mcp. */
export function levelDbSuspects(processes = listProcesses()) {
  return processes.filter(p => /build-packs\.mjs|foundry-mcp|tsx.*server\.ts/i.test(p.cmd))
    .map(p => ({ pid: p.pid, what: /build-packs/.test(p.cmd) ? "build-packs" : "foundry-mcp", created: p.created }));
}

/** pid that listens on `port` (IPv4 or IPv6), or null. */
export function listenerPid(port) {
  const rows = powershellJson(`Get-NetTCPConnection -State Listen -LocalPort ${Number(port)} -ErrorAction SilentlyContinue | Select-Object OwningProcess`);
  return rows[0]?.OwningProcess ?? null;
}

export function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    return err.code === "EPERM";
  }
}

/** Re-reads the live process and refuses unless it is a Foundry server process. */
export function assertKillable(pid, install) {
  const live = listProcesses().find(p => p.pid === pid);
  if (!live) return false;
  const ok = norm(live.exe) === norm(install.exe)
    || (live.name.toLowerCase() === "node.exe" && live.cmd.toLowerCase().replaceAll("/", "\\").includes(norm(install.mainJs)));
  if (!ok) {
    throw refuse(`pid ${pid} is not a Foundry server process (${live.name}).`, "not-foundry",
      "fvtt only ever kills Foundry's own executable; anything else is a human's call.");
  }
  return true;
}

/** Kill a Foundry server and its helper processes. */
export function killTree(pid, install) {
  if (!assertKillable(pid, install)) return { pid, killed: false, reason: "already gone" };
  const res = spawnSync("taskkill.exe", ["/PID", String(pid), "/T", "/F"], { encoding: "utf8", windowsHide: true });
  return { pid, killed: res.status === 0, output: (res.stdout || res.stderr || "").trim().slice(0, 300) };
}

/**
 * The environment a Foundry server gets. An agent running inside VS Code (Claude Code,
 * Copilot) inherits the extension host's ELECTRON_RUN_AS_NODE=1, which turns the desktop
 * app's executable into a bare Node that exits at once — no window, no log line, nothing
 * (found 2026-10-05). VSCODE_* and NODE_OPTIONS do not belong in a server either.
 */
export function serverEnv(env = process.env) {
  return Object.fromEntries(Object.entries(env).filter(([k]) => !/^(ELECTRON_|VSCODE_|NODE_OPTIONS$)/i.test(k)));
}

/** Launch a server detached from this process; it outlives the CLI. */
export function launch(install, { headless = false, args = [] } = {}) {
  const [cmd, argv] = headless
    ? [process.execPath, [install.mainJs, ...args]]
    : [install.exe, args];
  const child = spawn(cmd, argv, { detached: true, stdio: "ignore", windowsHide: headless, cwd: install.dir, env: serverEnv() });
  child.unref();
  return { pid: child.pid, kind: headless ? "headless" : "desktop" };
}
