/**
 * Local, per-user configuration of the `fvtt` agent CLI.
 *
 * Nothing machine-specific lives in this repo (it is public): install path, data paths,
 * the Chrome DevTools endpoint and the protected world list come from
 * `%LOCALAPPDATA%\neuroshima-agent\config.json`, written by `fvtt init`. Ports are not
 * stored there either — each Foundry data path's own `Config/options.json` is the source,
 * so the tool can never drift from what the server actually binds.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CliError } from "./output.mjs";

const LOCALAPPDATA = process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local");

// FVTT_AGENT_STATE_DIR exists for the unit tests, which must never touch the real locks.
export const STATE_DIR = process.env.FVTT_AGENT_STATE_DIR ?? path.join(LOCALAPPDATA, "neuroshima-agent");
export const FILES = {
  config: path.join(STATE_DIR, "config.json"),
  mode: path.join(STATE_DIR, "mode.json"),
  secret: path.join(STATE_DIR, "secrets.clixml"),
  locks: path.join(STATE_DIR, "locks"),
  contexts: path.join(STATE_DIR, "contexts.json")
};

export const MODULE_ID = "neuroshima-2026-overrides";
/** campaign: the GM's world · sandbox: dev, module linked to the working tree · release: module from the zip. */
export const PROFILES = ["campaign", "sandbox", "release"];
const DEFAULT_DATA = { sandbox: "FoundryVTT-Agent", release: "FoundryVTT-Release" };

/** Foundry's own default data path resolution (paths.mjs `userDataPaths`, minus CLI args). */
export function defaultFoundryDataPath() {
  const envData = path.join(LOCALAPPDATA, "FoundryVTT");
  if (process.env.FOUNDRY_VTT_DATA_PATH) return path.resolve(process.env.FOUNDRY_VTT_DATA_PATH);
  const options = readJson(path.join(envData, "Config", "options.json"));
  return options?.dataPath ? path.resolve(options.dataPath) : envData;
}

export function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (err) {
    if (err.code === "ENOENT") return null;
    throw new CliError(`Cannot parse ${file}: ${err.message}`);
  }
}

export function writeJson(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
}

export function loadConfig() {
  const cfg = readJson(FILES.config);
  if (!cfg) {
    throw new CliError("No local fvtt config.", {
      code: "no-config",
      hint: "Run `npm run fvtt -- init --mcp-json=<path to the .mcp.json holding the chrome-devtools browserUrl>`."
    });
  }
  return cfg;
}

/** `{mode, since, by}`; a missing file means development (D2: the state since the migration began). */
export function readMode() {
  return readJson(FILES.mode) ?? { mode: "development", since: null, by: "default" };
}

/** Foundry server options of a data path; the port, prefix and TLS come from here. */
export function readServerOptions(dataPath) {
  return readJson(path.join(dataPath, "Config", "options.json"));
}

/** A profile's data path, whether or not it has been initialised yet. */
export function profileDataPath(cfg, name) {
  const section = cfg[name] ?? {};
  return name === "campaign"
    ? path.resolve(section.dataPath ?? defaultFoundryDataPath())
    : path.resolve(section.dataPath ?? path.join(LOCALAPPDATA, DEFAULT_DATA[name]));
}

/**
 * Everything a command needs to address one Foundry server.
 * @param {object} cfg       loadConfig()
 * @param {string} [name]    "campaign" | "sandbox"
 */
export function resolveProfile(cfg, name = "campaign") {
  if (!PROFILES.includes(name)) {
    throw new CliError(`Unknown profile "${name}".`, { code: "usage", hint: `One of: ${PROFILES.join(", ")}.` });
  }
  const section = cfg[name] ?? {};
  const dataPath = profileDataPath(cfg, name);
  if (!dataPath) {
    throw new CliError(`Profile "${name}" has no data path.`, {
      code: "no-profile", hint: "Run `npm run fvtt -- sandbox:init` to create the sandbox data path."
    });
  }
  const options = readServerOptions(dataPath);
  if (!options?.port) {
    throw new CliError(`No port in ${path.join(dataPath, "Config", "options.json")}.`, {
      code: "no-profile",
      hint: name === "campaign" ? "Start Foundry once and set a port in Configuration."
        : name === "release" ? "Run `npm run release:check` (it builds the zip and installs the release sandbox)."
          : "Run `npm run fvtt -- sandbox:init`."
    });
  }
  const tls = Boolean(options.sslCert && options.sslKey);
  const prefix = options.routePrefix ? `/${String(options.routePrefix).replace(/^\/+|\/+$/g, "")}` : "";
  return {
    name,
    isCampaign: name === "campaign",
    dataPath,
    data: path.join(dataPath, "Data"),
    logs: path.join(dataPath, "Logs"),
    port: Number(options.port),
    baseUrl: `${tls ? "https" : "http"}://localhost:${options.port}${prefix}`,
    routePrefix: prefix,
    defaultWorld: section.world ?? options.world ?? null,
    // The campaign server is launched exactly as the GM launches it (no --dataPath) so
    // their own shortcut and ours produce indistinguishable processes.
    launchArgs: name === "campaign" ? [] : [`--dataPath=${dataPath}`]
  };
}

/** Worlds no tool may ever delete, whatever their id: the config list plus the campaign world. */
export function protectedWorlds(cfg) {
  return new Set([...(cfg.protectedWorlds ?? []), cfg.campaign?.world].filter(Boolean));
}

export function installPaths(cfg) {
  const dir = path.resolve(cfg.installDir);
  return {
    dir,
    exe: path.join(dir, "Foundry Virtual Tabletop.exe"),
    app: path.join(dir, "resources", "app"),
    mainJs: path.join(dir, "resources", "app", "main.js")
  };
}

/** The chrome-devtools endpoint: read from the MCP config so the two can never disagree. */
export function cdpUrl(cfg) {
  if (cfg.cdp?.url) return cfg.cdp.url.replace(/\/+$/, "");
  const file = cfg.cdp?.mcpJson;
  if (!file) return null;
  const mcp = readJson(file);
  const args = mcp?.mcpServers?.["chrome-devtools"]?.args ?? [];
  const flag = args.find(a => a.startsWith("--browserUrl") || a.startsWith("--browser-url"));
  if (!flag) return null;
  const url = flag.includes("=") ? flag.split("=").slice(1).join("=") : args[args.indexOf(flag) + 1];
  return url ? url.replace(/\/+$/, "") : null;
}
