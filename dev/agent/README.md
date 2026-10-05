# `fvtt` — the agent's handle on FoundryVTT

Harness-neutral CLI (Claude Code, Copilot, Codex: anything that runs a shell). Design and decisions:
[`PLAN_agentic_improvements.md`](../../PLAN_agentic_improvements.md) — §4 safety model, §8 decisions.

```sh
npm run fvtt -- doctor                      # start here: what is up, what is wrong, what to do
npm run fvtt -- <command> [--profile=campaign|sandbox] [--key=value] [--flag]
npm run fvtt -- help                        # every command with its options
```

From outside the repo: `npm --prefix "<module folder>" run fvtt -- doctor`.
Every command prints **one JSON object** (`ok`, plus `error`/`code`/`hint` on failure); progress goes
to stderr. Exit code `0` ok · `1` failed · `2` refused by a guard · `3` usage.

## Commands

| Command | What it does |
|---|---|
| `doctor [--since=<min>]` | config, mode, secret (checked against `Config/admin.txt` offline), both servers, package locks, held LevelDBs, mutex, Chrome + Foundry tabs, `python`, dirty files with mtimes |
| `status` | one profile: `/api/status`, server processes, held LevelDBs, mutex |
| `start [--world=<id>] [--headless]` | desktop app (D3) behind the LevelDB interlock; waits for the world |
| `stop [--force]` / `kill` | world shutdown → `/quit` → kill only if stuck · `kill` = Foundry's executable only |
| `restart` | stop + start the same world + log every Foundry tab back in as its previous user |
| `packs [--only=a,b]` | stop → `build-packs` → `validate-packs` → start the same world → tabs back in. Sandbox: builds into the sandbox's own `packs/` |
| `login [--user=<name\|id>] [--context=<name>] [--page=<targetId>]` | log Chrome in as any user (D8). Default user: the profile's `loginUser` in the local config (campaign: MCP), else the only GM. `--context` = an isolated browser context, so GM and players can be logged in at once |
| `users` | the world's users (socket, no browser) |
| `wait-ready`, `reload` | wait for `game.ready` · hard reload (bypasses the ES module cache) |
| `quench [--filter=<key>] [--reload]` | run the module's Quench batches in a GM tab; `{total, passed, failed, failures[]}` |
| `logs [--since=<min>] [--level=warn] [--grep=<re>]` | the server's own JSON log (ports redacted) |
| `mode [development\|runtime]` | D2/D9 — set `runtime` only when the GM says so |
| `sandbox:init` | create/refresh the sandbox data path (idempotent) |
| `init --mcp-json=<path>` | create the local config (once per machine) |

## Rules (enforced in code, `lib/guards.mjs`, tested in `test/guards.test.mjs`)

- **Mode** (`mode.json`): *development* allows everything. *runtime* (game night) refuses every
  lifecycle and testing command on every profile; reads and GM logins still work (D9).
- **Interlock**: `start` refuses while the port answers, a Foundry process serves that data path, or
  any world/pack LevelDB under it is held (build-packs, foundry-mcp, a dying server).
- **Mutex**: one exclusive lock per profile for stop/start/packs, shared locks for Quench runs;
  stale as soon as the owning process is gone. `doctor` shows holders.
- **Kills** match Foundry's executable path, re-checked on the live pid. Chrome is never touched.
- **Secrets**: the admin password lives in `%LOCALAPPDATA%\neuroshima-agent\secrets.clixml` (DPAPI),
  written by the GM with `Set-AgentSecret.ps1`. It never appears in argv, output, logs or the repo;
  the browser gets a session cookie, not the password.
- **Nothing machine-specific in this repo** (it is public): install/data paths and the Chrome
  endpoint come from `%LOCALAPPDATA%\neuroshima-agent\config.json`; ports from each data path's
  `Config/options.json`. Output never prints hosts or ports.

## Profiles

- `campaign` — the GM's data path and world. The dev module there *is* this working tree.
- `sandbox` — `%LOCALAPPDATA%\FoundryVTT-Agent`, own port, runs concurrently (D1). Packages are real
  folders of junctions to the campaign install **except `packs/`** (a running world holds its
  packs' LevelDB; sharing them would lock one server out). This module's sandbox packs are built
  from the working tree. Every sandbox package is package-locked, so "Update all" there cannot
  write through a junction.

## One-time setup (human)

1. `npm run fvtt -- init --mcp-json=<path to the .mcp.json with the chrome-devtools browserUrl>`
2. Run `dev/agent/Set-AgentSecret.ps1` in your own terminal (prompts for the Foundry admin password).
3. Claude Code: add to the project's `.claude/settings.local.json` → `permissions.allow` (an agent
   may not edit its own permissions):
   ```json
   "Bash(npm run fvtt *)", "Bash(npm run --silent fvtt *)",
   "Bash(npm --prefix * run fvtt *)", "Bash(npm --prefix * run --silent fvtt *)",
   "Bash(node dev/agent/fvtt.mjs *)",
   "PowerShell(npm run fvtt *)", "PowerShell(npm run --silent fvtt *)",
   "PowerShell(npm --prefix * run fvtt *)", "PowerShell(node dev/agent/fvtt.mjs *)"
   ```
4. `npm run fvtt -- sandbox:init`

## Extending

One CLI, one config, one secret store, one mutex — new needs extend `fvtt.mjs`, no parallel
scripts. A new command must be classified in `guards.COMMAND_CLASS` (registration throws
otherwise) and its refusals tested. Foundry's HTTP shapes live only in `lib/foundry-http.mjs`.
`npm run test:agent` runs the guard tests (no server needed).

Gotcha: an agent inside VS Code inherits `ELECTRON_RUN_AS_NODE=1`; launched with
it, the desktop app runs as bare Node and exits with no window and no log line. `lib/proc.mjs`
`serverEnv()` strips it — launch Foundry through `fvtt start`, not by hand.
