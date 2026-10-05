/**
 * The Foundry administrator password, from the DPAPI store written by Set-AgentSecret.ps1.
 *
 * Rules (PLAN_agentic_improvements.md §4, §5 B): the value never appears in argv, stdout,
 * logs or the repo. PowerShell decrypts it and hands it back base64-encoded on a pipe (so
 * non-ASCII passwords survive the console code page); it lives only in this process.
 */

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { FILES } from "./config.mjs";
import { CliError } from "./output.mjs";

let cached = null;

export function hasSecret() {
  return fs.existsSync(FILES.secret);
}

export function readAdminPassword() {
  if (cached !== null) return cached;
  if (!hasSecret()) {
    throw new CliError("No stored Foundry administrator password.", {
      code: "no-secret",
      hint: "Ask the GM to run dev/agent/Set-AgentSecret.ps1 in their own terminal (an agent must not run it)."
    });
  }
  const script = "$c = Import-Clixml -LiteralPath $env:FVTT_SECRET_FILE; "
    + "[Console]::Out.Write([Convert]::ToBase64String([Text.Encoding]::UTF8.GetBytes($c.GetNetworkCredential().Password)))";
  const res = spawnSync("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", script], {
    env: { ...process.env, FVTT_SECRET_FILE: FILES.secret },
    encoding: "utf8",
    windowsHide: true,
    timeout: 30_000
  });
  if (res.status !== 0 || !res.stdout) {
    // stderr from Import-Clixml names the file and the DPAPI failure, never the value.
    throw new CliError("Could not decrypt the stored administrator password.", {
      code: "secret-unreadable",
      hint: "The store is per Windows user; re-run dev/agent/Set-AgentSecret.ps1 as the GM.",
      details: { stderr: (res.stderr ?? "").trim().slice(0, 400) }
    });
  }
  cached = Buffer.from(res.stdout.trim(), "base64").toString("utf8");
  return cached;
}

/**
 * Compare the stored password with a data path's `Config/admin.txt` hash, offline, using
 * Foundry's own hashing code from the install (so a core change to the scheme is followed).
 * @returns {Promise<"match"|"mismatch"|"no-admin-password"|"no-secret">}
 */
export async function verifyAgainstDataPath(dataPath, installApp) {
  if (!hasSecret()) return "no-secret";
  const adminFile = path.join(dataPath, "Config", "admin.txt");
  if (!fs.existsSync(adminFile)) return "no-admin-password";
  const hash = fs.readFileSync(adminFile, "utf8").trim();
  const options = JSON.parse(fs.readFileSync(path.join(dataPath, "Config", "options.json"), "utf8"));
  const auth = await import(pathToFileURL(path.join(installApp, "dist", "core", "auth.mjs")).href);
  return auth.testPassword(readAdminPassword(), hash, auth.getSalt(options.passwordSalt)) ? "match" : "mismatch";
}
