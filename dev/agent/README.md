# `fvtt` — the agent's handle on FoundryVTT

Harness-neutral CLI (Claude Code, Copilot, Codex: anything that runs a shell). Design and decisions:
[`PLAN_agentic_improvements.md`](../../PLAN_agentic_improvements.md) — §4 safety model, §8 decisions.

```sh
npm run fvtt -- doctor                      # start here: what is up, what is wrong, what to do
npm run fvtt -- <command> [--profile=campaign|sandbox|release|poligon] [--key=value] [--flag]
npm run fvtt -- help                        # every command with its options
```

From outside the repo: `npm --prefix "<module folder>" run fvtt -- doctor`.
Every command prints **one JSON object** (`ok`, plus `error`/`code`/`hint` on failure); progress goes
to stderr. Exit code `0` ok · `1` failed · `2` refused by a guard · `3` usage.

## Commands

| Command | What it does |
|---|---|
| `doctor [--since=<min>]` | config, mode, freeze, the Foundry version and each data path's installed dnd5e and module against module.json's requirements, secret (checked against `Config/admin.txt` offline), every server, package locks, held LevelDBs (holders named only when a server is down and something still holds one; idle foundry-mcp processes are just counted), mutex, Chrome + Foundry tabs — **a user logged in from two tabs is a problem** (every active-GM automation runs twice), `python`, dirty files by folder + the newest ten |
| `status` | one profile: `/api/status`, server processes, held LevelDBs, mutex |
| `start [--world=<id>] [--headless]` | desktop app (D3) behind the LevelDB interlock; waits for the world |
| `stop [--force]` / `kill` | world shutdown → `/quit` → kill only if stuck · `kill` = Foundry's executable only |
| `restart` | stop + start the same world + log every Foundry tab back in as its previous user |
| `packs [--only=a,b]` | stop → `build-packs` → `validate-packs` → start the same world → tabs back in. Sandbox: builds into the sandbox's own `packs/` |
| `login [--user=<name\|id>] [--context=<name>] [--page=<targetId>]` | log Chrome in as any user (D8). Default user: the profile's `loginUser` in the local config (campaign: MCP), else the only GM. `--context` = an isolated browser context, so GM and players can be logged in at once. Without one it re-uses a tab already showing that user (or a dead fvtt tab) before opening a new one, and warns when the user ends up in two tabs |
| `users` | the world's users (socket, no browser) |
| `wait-ready`, `reload` | wait for `game.ready` · hard reload (bypasses the ES module cache) |
| `eval --expr=<js> \| --file=<path> [--user=<name>] [--args=<json>]` | run JavaScript in a ready Foundry tab (the one logged in as `--user`, else the GM's) and print the JSON result; a file is the body of an async function (`return` the value, `args` in scope). Documents and applications come back as their identity. Classified *testing*: refused in runtime mode |
| `quench [--filter=<key>] [--reload]` | run the module's Quench batches in a GM tab (a GM tab is picked even with player contexts open); `{total, passed, failed, failures[]}` and `compat` (compatibility warnings the page logged, by caller, the module's listed), plus `warnings` when the same user is in several tabs or another GM is the active GM (active-GM-only hooks then run in their browser) |
| `world:create <slug> [--fixture=skirmish]`, `world:seed`, `world:launch`, `world:list`, `world:delete <id> [--stop]` | sandbox worlds `agent-<slug>-<local date>` with a marker; delete only behind the §4 guards, Foundry's own uninstall, fvtt's browser contexts disposed. Creating or switching a world disposes fvtt's contexts first (their sessions belong to the world going down); the hint names the GM tab a fixture leaves logged in |
| `e2e [--suites=boot,…] [--keep] [--reuse] [--trace-writes]` | Layer 6: fresh sandbox world, GM + players each in an isolated context (hard-reloaded: current code), fixture reseeded per suite after every client is quiet and combats are ended, console errors per client in four phases (boot, seed, suite, late — only `KNOWN_CORE_ERRORS` in `lib/compat.mjs` and a suite's `allowConsoleErrors` pass; TESTING.md, warstwa 6), compatibility warnings by caller, server-log errors, screenshots → `logs/e2e/<run>/report.json`. Refuses up front when another tab is logged in as one of its users (fvtt's own stale contexts are closed). `--trace-writes`: every document write with a short stack, per suite, `<suite>-writes.json`. Green deletes the world; red keeps world and tabs for inspection. Suites: `dev/e2e/suites/`; in-browser helpers `window.__e2e` (`lib/e2e-page.mjs`) |
| `logs [--since=<min>] [--level=warn] [--grep=<re>]` | the server's own JSON log (ports redacted) |
| `mode [development\|runtime]` | D2/D9 — set `runtime` only when the GM says so |
| `freeze [on\|off] [--reason=…] [--until=<stage>]` | the campaign freeze of the dnd5e 6 migration (`PLAN_migracja_dnd5e6.md` D2): while on, every command without `--profile` addresses the **sandbox**, and `start`, `restart`, `packs`, `login`, `reload`, `eval`, `quench`, `system:install` refuse the campaign; stopping, reading, `backup` and `poligon:clone` of it stay allowed. `off` only on the GM's word (E11) |
| `backup --profile=<p> [--world=a,b] [--reason=<word>] [--dest=<dir>] [--app]` | a stopped data path → `<backup dir>/<date>_<profile>[-<reason>]/`: one zip per world, dnd5e, third-party modules (never this module — it is in git), `Data/assets`, optionally the Foundry install; `Config/options.json` (no licence, no admin password); `manifest.json` (versions, git commit, per-world document counts), `SHA256SUMS`, a restore `README.md`. Every archive CRC-tested and every world unpacked to a temp folder and opened. Links and junctions are listed, not followed. The backup dir: `init --backup-dir=…` (the archiver is `lib/archive.py`, stdlib Python ≥ 3.12) |
| `system:install --profile=<p> [--from=<zip\|folder>] [--campaign]` | replace a stopped data path's dnd5e from a release zip or an unpacked release (a source checkout is refused); the old folder is kept under `<dataPath>/agent-state/systems/`, the new one package-locked. Default source: `init --dnd5e-source=…`. The campaign only with `--campaign` (the switch-over, GM's word) and never while frozen |
| `module:install --from=<zip|folder>` | replace a third-party module (D11 of `PLAN_migracja_dnd5e6.md`): installed into the campaign's `Data/modules` — the folders every other data path links to — the old one kept under the campaign's `agent-state/modules/`, then the sandbox, release and Poligon copies re-linked (links removed without touching their targets, copied files and packs taken anew). Every Foundry server must be down; never this module. Zips are unpacked by `lib/archive.py` (streamed) |
| `sandbox:init` | create/refresh the sandbox data path (idempotent; also refreshes the module.json copy — `doctor` says when it is stale). A new data path gets dnd5e from the configured source, else a copy of the campaign's |
| `poligon:init [--skip-packs] [--force]` | the GM's testing ground ([`dev/poligon/README.md`](../poligon/README.md)): its own data path and port, the campaign's active modules (asked from a ready campaign page), world `poligon` (Gamemaster + Gracz 1–5, with a Poligon marker file), the world's loader (`esmodules`) and the Data-root junction to `dev/poligon`, packs from the working tree, the campaign's rule settings copied once. Idempotent |
| `poligon:start [--seats=3\|1,4\|"Gracz 2"] [--no-gm] [--klon] [--force]` | start the Poligon world (or the clone) and open seats: the GM's and players' windows, each an isolated browser context; switching worlds is a restart behind the human guard |
| `poligon:clone [--refresh]` | one-way copy of the campaign world onto the Poligon path under its own id (LevelDB without `LOCK`, the campaign keeps running), `[KLON]` title, red banner; replaces only a clone it made, never while it runs. `poligon:start --klon` restarts the Poligon server into it |
| `poligon:stop [--force]` | stop the Poligon server — refused while someone fvtt did not log in is connected |
| `poligon:reset <station…> \| --all \| --list` | rebuild stations in a GM page (`game.poligon.stations.reset`) — **only when the GM asks** (H-D9) |
| `poligon:obsada [--rebuild] [--only=id,id]` | build the persona compendium through dnd5e's real advancement |
| `poligon:findings [--since=<min\|ISO>] [--open] [--md]` | the GM's findings (journal "Poligon · Uwagi") as JSON; `--md` → `logs/poligon/` (git-ignored) |
| `init --mcp-json=<path>` | create the local config (once per machine); on an existing one `--dnd5e-source=<release zip\|folder>` and `--backup-dir=<folder>` set one entry each, and `--force` keeps every entry it does not own |

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
- **Poligon** (`PLAN_human_testing.md` §3.2): `world:*` and `e2e` refuse `--profile=poligon`; `stop`,
  `restart`, `kill`, `packs` and `poligon:stop` on it refuse while a user fvtt did not log in is connected
  (a person — the default context and the `seat-*` contexts count as people), `--force` only on the GM's
  word; logins there always go to an isolated `seat-<user>` context (the session cookie is per host, not
  per port — a Poligon login in Chrome's default context would log the campaign tab out); the world
  `poligon` is protected and can never pass the delete guards.
- **Nothing machine-specific in this repo** (it is public): install/data paths and the Chrome
  endpoint come from `%LOCALAPPDATA%\neuroshima-agent\config.json`; ports from each data path's
  `Config/options.json`. Output never prints hosts or ports.

## Profiles

- `campaign` — the GM's data path and world. The dev module there *is* this working tree.
- `poligon` — `%LOCALAPPDATA%\FoundryVTT-Poligon`, set up like the sandbox, own port, concurrent with both;
  the GM's, not an agent's (`poligon:*` above). Its default world is `poligon`.
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

E2e initializes an empty scene on every client before the first fixture, so optional canvas modules
cannot race the initial wall draw ahead of Foundry's render queues. Each isolated context is its own window,
and a covered window is hidden to Chrome, which throttles its timers — steps 3–30× slower, core animation and
notification errors (2026-10-17). So clients run **in the background** when Chrome has the no-throttle flags
(`NO_THROTTLE_FLAGS` in `lib/proc.mjs`; the vault's chrome-debug launcher passes them, `doctor` reports
`chrome.noThrottle` and a problem without them): no `Page.bringToFront`, focus emulated, windows stay behind the
GM's work and out of reach of the GM's mouse. Without the flags clients come to the front for clicks, keys and
screenshots. A suite that needs a client "in front" calls `client.front(ms)` — never `Page.bringToFront` directly,
which would pop the window under the GM's cursor; `front` keeps its settle wait in both modes (two clicks on one
spot without it count as a double-click). Either way the windows are cascaded (`cascadeWindows` in `lib/cdp.mjs`) so none fully covers
another. Chrome ignores window moves while a window-modal dialog is open (its search engine choice screen after
an update); a human dismisses that once. TESTING.md, warstwa 6. `logs/e2e/<run>/report.json` is
updated after every suite (`running: true` until the final report); failed assertions and console
errors are available while later suites continue. Suite actor names must not collide with Poligon
station names when both run in the same throwaway world.

One CLI, one config, one secret store, one mutex — new needs extend `fvtt.mjs`, no parallel
scripts. A new command must be classified in `guards.COMMAND_CLASS` (registration throws
otherwise) and its refusals tested. Foundry's HTTP shapes live only in `lib/foundry-http.mjs`.
`npm run test:agent` runs the guard tests (no server needed).

Gotcha: an agent inside VS Code inherits `ELECTRON_RUN_AS_NODE=1`; launched with
it, the desktop app runs as bare Node and exits with no window and no log line. `lib/proc.mjs`
`serverEnv()` strips it — launch Foundry through `fvtt start`, not by hand.
