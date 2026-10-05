# PLAN — Agentic improvements: Foundry lifecycle, sandbox worlds, release gate, instruction hygiene

> Status: **S0–S5 DONE, S6 SET UP** (2026-10-05) — progress log and open items in §9; tools in
> `dev/agent/`, `dev/e2e/`, `dev/release/`. Decisions D1–D9 (§8). Written by an agent, for agents.
> Scope spans three places: this repo (`dev/agent/`, `dev/e2e/`, release scripts — public, so no
> hosts, ports, secrets or personal paths in it), the campaign vault (agent instructions, skills, MCP
> config) and the user profile (secret store, sandbox data path). Each stage says where it lands.
> Size: **L** — its own plan, executed in stages; S0–S1 alone remove most of today's friction.

---

## 1. Why — what the last 29 sessions show

Mined from the Claude Code transcripts of this project (2026-08-27 → 2026-10-04; the miner is
kept for reruns, §6 S6). Counts are tool calls, errors are tool results flagged as errors.

| Finding | Evidence | What it costs |
|---|---|---|
| **Foundry work is done by injecting JS** | `evaluate_script` 3 790 calls (2nd most used tool after Bash); every session re-writes the same "wait until `game.ready`, then run Quench" snippet | ~60 errors from running before `game` exists, page ids changing after reconnects, guessed API shapes |
| **Pack builds need Foundry closed → human handoff** | "build:packs" in 604 messages; every implementation session since 09-21 hits a locked pack; the session before this plan waited on "Foundry closed, proceed" | Hours of idle wait; packs and code drift apart between handoffs |
| **Quench cannot reach the risky parts** | Quench runs **in the campaign world** (TESTING.md §5), so no combats, scenes, tokens, dialogs, `activity.use()`, players | Bugs found by the GM, not by tests: grenade detonating immediately instead of end of turn; Zranienie from crits never firing after a dnd5e 5 hook-signature change; "Sonk lacks permission to create Drawing" (player-only path); expand icon, flashlight cone, NVG noise, thermals "fixed" but not |
| **Chrome/CDP connection is the #1 infra failure** | 26 + 9 preflight failures, 14 MCP connect failures, 19 "page ids have changed"; one agent asked another for help | Long diagnosis; `CLAUDE.md` grew a page of Chrome troubleshooting |
| **Session expiry misread as broken tooling** | Agent: "need to reconnect the chrome-devtools MCP"; GM: "No… just needed to re-log-in" | Agents may not log in (memory rule) — so any expired session is a handoff |
| **Process control trips the auto-mode classifier** | 11 PowerShell + 3 Bash blocks; one agent retried the same blocked `Stop-Process chrome` **8 times** | Wasted turns; no sanctioned way to stop/start anything |
| **PowerShell is the least reliable tool** | 64 errors / 241 calls (27%) vs Bash 95 / 4 919 (2%) | Mostly preflight scripts and quoting |
| **`python3` resolves to the Windows Store stub** | 23 × "nie znaleziono Python" | Trivial, recurring |
| **Stale instructions send agents to files that don't exist** | `fvtt-api` skill cites v13 names (`application-v2.mjs`, `document-sheet-v2.mjs`, `actor-sheet-v2.mjs`, `common/abstract/data-model.mjs`; v14 has `application.mjs`, `document-sheet.mjs`, `actor-sheet.mjs`, `data.mjs`); copilot-instructions still name the deleted `podrecznik.md`; 25+ Grep "path does not exist" on guessed core/dnd5e paths | Wrong mental model before the first line of code |
| **Pipelines get missed** | GM: "You missed the bestiary pipeline. Make a note so future agents have a harder time missing it" | Hand-made data that the next build overwrites |
| **Three harnesses, one set of instructions** | Claude Code (`CLAUDE.md`), Copilot (`.github/copilot-instructions.md`), Codex (icon agent: no MCP servers exposed, asks for `AGENTS.md` — `dev/icons/CODEX_TODO.md`) | Tooling that only one harness can call |
| **Concurrent agents share one Foundry and one tree** | 2026-10-03: icon agent and this agent edited `IMPLEMENTATION.md` and `build-packs.mjs` at once; pack rebuild had to wait for the other agent | Any agent stopping Foundry kills the other's test run |
| **Release packaging was never tested** | Found 2026-10-03 without installing anything: the zip excluded `*.log` (10/16 freshly built packs keep all records there) and `vfx/` | Next release would have shipped empty compendia |

Also found while researching (not from transcripts):

- The dev module folder **is the git working tree** and has **no package lock**; its `manifest`
  points at the GitHub "latest" release. dnd5e has no lock either and its manifest points at
  `master`. One "Update all" in Setup can overwrite uncommitted work or move dnd5e past the
  version this module verifies.
- Foundry's setup endpoint will `rm -rf` a world folder (`uninstallPackage`) — and a **module**
  folder, i.e. this repo — with nothing but a path-containment check. Any tool built on it needs
  its own guard (§4).

## 2. Goals and non-goals

**Goals**
1. An agent can, without a human: check Foundry and Chrome health; stop, start and restart the
   server; rebuild packs and come back to the same world; run Quench and get a machine-readable
   result.
2. An agent can create a **sandbox world**, seed it, log in as GM and as players (separate browser
   contexts), test what Quench cannot, and delete the world — and is *unable* to delete anything else.
3. A **release gate**: no tag without a clean install from the actual zip passing a smoke suite.
4. Instructions that are correct, short, harness-neutral, and point at tools instead of describing
   manual workarounds.

**Non-goals** — agents logging into the campaign world as players; pixel-diff visual regression
(screenshots are evidence, not assertions, for now); CI that boots Foundry in GitHub Actions
(license); automating Chrome restarts (stays human, §4).

## 3. What Foundry v14 already gives us (researched in `resources/app/dist`)

All server code ships readable. Endpoints an agent tool can drive over plain HTTP:

| Endpoint | Auth | Use |
|---|---|---|
| `GET /api/status` | none | `{active, version, world, system, systemVersion, users, uptime}` — the liveness probe; `users` = connected clients |
| `POST /auth` `{adminPassword}` | — | admin session cookie (password hash lives in `Config/admin.txt`) |
| `POST /setup` `launchWorld` | admin | start a world |
| `POST /setup` `{shutdown: true}` / `POST /join` `shutdown` | admin | world → setup screen |
| `POST /quit` | admin | clean application exit — **no process killing needed** |
| `POST /create` `createWorld` `{id/name, title, system}` | admin | new world (refuses existing id) |
| `POST /setup` `uninstallPackage` `{type, id}` | admin | deletes `worlds/<id>` — or `modules/<id>`! (§4) |
| `POST /setup` `lockPackage` `{type, id, shouldLock}` | admin | writes `<id>.lock` — blocks updates |
| `POST /setup` `createBackup` / `createSnapshot` / `restoreBackup` | admin | Foundry's own backups — safety net for campaign operations |
| `POST /join` `join` `{userid, password}` | — | user login |
| `POST /join` `loginAs` `{userId}` (camelCase, unlike `join`) | admin **or** GM session | log in as any user without their password |
| socket.io `getJoinData` | any session | the user list (id, name, role) — no HTTP route exists for it |

Verified 2026-10-05 in `dist/sessions.mjs`, `dist/server/views/*.mjs`: `POST /auth` sets the admin
flag on the session **even while a world runs** (it then redirects to `/join`), so an admin session is
always obtainable. Sessions are **in-memory and expire 24 h after creation** — every server restart
logs every client out, and a long session silently expires (the "landed on /join after midnight"
reports). Both body formats (JSON, urlencoded) are parsed.

Process: the server takes `--key=value` args; `--dataPath=` (or `FOUNDRY_VTT_DATA_PATH`) selects
the data folder, `--port=`, `--world=<id>` auto-launches a world. The headless server is
`node <install>/resources/app/main.js` (needs Node 24 — installed); the desktop app runs the same
server inside Electron. Browser side: chrome-devtools MCP `new_page` has **`isolatedContext`** —
separate cookies per context, so GM and players can be logged in at once in the shared Chrome.

## 4. Safety model

| Action | Guard (enforced in code, not by instruction) |
|---|---|
| Delete a world | id starts with `agent-`; `worlds/<id>/.agent-sandbox.json` exists and names that id; not the active world; not in the protected list (campaign id read from config); the client only ever sends `uninstallPackage` with `type: "world"` — module/system uninstall is not implementable through the tool |
| Stop / restart / kill the server | global mutex free (another agent's test run); **mode = development** (D2: the default until the GM says "we are switching to runtime mode" — then every lifecycle command refuses until switched back); prefer `/quit`, kill only the Foundry process (matched by executable path), never Chrome |
| Start the server | **LevelDB interlock** (D5): refuses while any world or pack LevelDB under the target data path is held (build-packs, foundry-mcp, a still-dying server); refuses if the port answers; waits for `/api/status.active` |
| Locked packages | the tool refuses any setup action on a package whose `<id>.lock` exists — the server does not check locks itself, only the setup UI does (§8 D7) |
| Secrets | never in argv (visible in process lists), never printed, never in repo or transcript; read by the tool itself from a per-user encrypted store (§5 B) |
| Packages | dev module and dnd5e carry Foundry package locks (set 2026-10-04); tools never install or update packages in the campaign data path |
| Chrome | still human: no tool kills or relaunches Chrome; `doctor` prints the exact human command when CDP is down |
| Campaign world | ~~agents never log in there as a player~~ superseded by **D8**: `fvtt login` logs any browser context in as any user (GM or player) in any world; in runtime mode player logins are refused (D9). The password goes to the server only — the browser receives a session cookie |
| Runtime mode | **D9**: lifecycle (start/stop/packs/worlds) and testing (quench/reload/e2e) refused on **every** profile, sandbox included; reads and GM logins allowed |

## 5. Design

### A. `fvtt` CLI — `dev/agent/fvtt.mjs` (this repo), `npm run fvtt -- <cmd>`

Harness-neutral (Claude Code, Copilot, Codex all run shell commands); every command prints one
JSON object, exit code ≠ 0 on failure, human hint in `hint`. Host/port/data paths come from a local,
untracked config (`%LOCALAPPDATA%\neuroshima-agent\config.json`, created in S0), never from the repo.

| Command | Does |
|---|---|
| `status` | `/api/status` + which data path/world + whether the server process is ours or the desktop app |
| `doctor` | status + Chrome CDP probe + id of the Foundry page(s) + pack/world LevelDB lock state + mutex holder + `python` resolution + dirty files in this repo touched by other agents. Replaces the Chrome section of `CLAUDE.md` with "run `fvtt doctor`" |
| `stop` / `start [--world]` / `restart` / `kill` | §4 guards; `start` launches the **desktop app** (D3) with `--world=<id>` (`--dataPath`/`--port` for the sandbox) so the GM can inspect or tweak it after the session; server output is read from `Logs/debug.<date>.log` (JSON lines), not stdout, so headless buys nothing; `restart` returns to the same world |
| `logs [--since] [--level]` | tail of the server's JSON log — errors since start, migrations, deletions |
| `mode [development\|runtime]` | reads/sets `mode.json` (D2). Set to `runtime` only on the GM's explicit "switching to runtime mode"; every lifecycle command reads it first |
| `packs` `[--only=…]` | mutex → stop → `build:packs` → `validate:packs` → start same world → wait → print reload hint (or reload via CDP). The single biggest friction removal |
| `quench [--filter] [--page]` | via CDP: wait for `game.ready` + module API, run `game.neuroshima.tests.run`, return `{passed, failed, failures[]}` |
| `wait-ready [--page]` | the "is `game` there yet" snippet, once |
| `backup` | `createBackup` of the active world (before migrations an agent runs on the campaign) |
| `world:create/launch/list/delete`, `login`, `e2e` | §5 C, D |

Thin MCP wrapper (optional, S5): the same functions exposed as tools for harnesses that prefer MCP.
Logic lives in the CLI either way.

### B. Secrets — per-user, encrypted, outside every repo

`%LOCALAPPDATA%\neuroshima-agent\secrets.clixml`, Windows DPAPI (PowerShell `Export-Clixml` of a
`PSCredential`) — readable only by this Windows user, no dependency. Created **by the human** with
`dev/agent/Set-AgentSecret.ps1` (prompt with `Read-Host -AsSecureString`; the agent never types
it). `fvtt.mjs` decrypts via a PowerShell child process and passes the value on stdin to its own HTTP
calls. Contents: Foundry admin password only. Users in sandbox worlds need **no** passwords: the
tool logs in with the admin session and `loginAs`. Honest limit: an agent with shell access as the
same user *could* decrypt the file — the goal is "never in transcripts, repos, argv or logs", not
"hidden from a hostile local process".

### C. Sandbox worlds and data paths

Two modes, one convention (`agent-<slug>-<yyyymmdd>`, marker file, protected list):

- **Dev sandbox** — tests code from the working tree on a **second data path**
  (`%LOCALAPPDATA%\FoundryVTT-Agent`), served by a **second server on its own port, concurrently**
  with the campaign server (D1: allowed — single user). The campaign server is never switched away
  for a test. The sandbox's dnd5e is its own copy (own lock state), so a dnd5e upgrade can be tried
  there first. **Correction (2026-10-05):** the module folder is *not* one junction to the working
  tree — a running world holds the LevelDB of every active package's `packs/`, so two servers on one
  `packs/` lock each other out. Every sandbox package is a real folder whose directories are
  junctions, **except `packs/`**: copied for third-party modules, *built* for this module
  (`build-packs --out=`), which also means a sandbox pack rebuild never stops the campaign server.
  Every sandbox package is package-locked so the sandbox's "Update all" cannot write through a
  junction. `fvtt sandbox:init` does all of it (idempotent). Spike result: two desktop-app
  instances coexist fine (§6 S0) — no headless fallback needed.
- **Release sandbox** — the second data path with the module **extracted from `module.zip`** and
  dnd5e pinned (copied from the campaign install or installed from the 5.3.0 release manifest).
  Two worlds, as agreed 2026-10-03: *bare* (dnd5e + module) and *recommended* (+ Sequencer,
  Splatter, Quench).

`world:create` = admin `createWorld` → marker → launch → `loginAs` GM via HTTP → enable modules
(`core.moduleConfiguration`) → reload → create users (GM + `Gracz 1..3`) → seed a **fixture**:
`dev/e2e/fixtures/<name>.mjs` (scene with grid and walls, PCs built from the compendium through
real advancement, a few Bestiariusz NPCs, ammo and grenades). Fixtures are code, so every run starts
identical. `world:delete` = §4 guards → `uninstallPackage {type: "world"}`.

`login --user "Gracz 1" [--context gracz1]` = admin session → `loginAs` → session cookie set via CDP
(`Network.setCookie`) into an isolated browser context → page opened at `/game` → prints the page id
for chrome-devtools MCP. **Spike in S0**: confirm chrome-devtools MCP lists pages from a context our
script created; fallback is the agent opening `new_page {isolatedContext}` and the tool only
supplying a one-time login URL.

### D. Layer 6 tests — sandbox end-to-end (`dev/e2e/`)

`playwright-core` driving the installed Chrome (no browser download), against a sandbox world,
with GM and player contexts at once. Output: `logs/e2e/<run>/report.json`, screenshots per step,
browser console errors per client. First suite — every item is a bug that reached the GM:

1. **Boot**: zero console errors per client; every pack opens with the expected record count.
2. **Character from zero** through advancement (class → Pochodzenie → Sztuczka) as a player.
3. **Combat**: real `Combat` with tokens; semi-auto and burst with ammo; crit → Stopień Zranienia
   (the dnd5e 5 hook regression); grenade thrown by a **player**, detonates at end of turn.
4. **Player-only paths**: ground drop/pick-up through the GM relay; placing charges; drawing permissions.
5. **Dialog flows** with `activity.use()` auto-configured (`configure: false`): Kondycha heal, Zwinne
   dłonie push-round, repair.
6. **Display evidence**: TT tooltip, inventory bars, badges — screenshot attached, reviewed by the
   agent, not pixel-diffed.

Rule added to `TESTING.md`: a change touching UI, canvas, combat, dialogs or player permissions is
not done until a Layer 6 run (or a scripted sandbox check) shows it — screenshot in the hand-off.

### E. Release gate

`npm run release:check` — the RELEASING.md prerequisite:

1. `npm test`, `validate:packs`, `validate:css`, `validate:recipes`, generator dry-runs (no diff).
2. `dev/release/build-zip.mjs` — **the** include list, used by the GitHub workflow too (today the
   list lives only in YAML, which is how `vfx/` and `*.log` went wrong). Verifies the zip: every
   pack in the zip opens and has the same record count as `packs/`.
3. Release sandbox from that zip → *bare* world: Boot + Character + Combat suites; *recommended*
   world: same + Quench inside the sandbox.
4. Report in `logs/release/<version>.json`; the tag is created only if all green.

Workflow side: the tag job runs step 1 + 2 in GitHub Actions (Node only, no Foundry) and fails the
release on any difference. Version policy: `module.json` `verified` = what the release sandbox ran;
raise dnd5e `minimum` to what is actually tested (5.3.0) instead of claiming 5.0.0. Updating
Foundry or dnd5e: release sandbox first → green → bump `verified` → only then the campaign install.

### F. Instruction hygiene (vault + repo)

- **`AGENTS.md`** at the vault root and in this repo: harness-neutral operating manual (tools,
  pipelines, safety rules). `CLAUDE.md` imports it (`@AGENTS.md`), copilot-instructions links it,
  Codex reads it natively. Campaign tone/persona stays in copilot-instructions as today.
- **Pipelines index** in `AGENTS.md`: bestiary, class features (`gen_features.py`), packs, maps,
  icons — "never hand-edit X, run Y" in one table, so it can't be missed again.
- **Generated source map** replaces hand-written file layouts in the `fvtt-api` skill:
  `dev/agent/index-sources.mjs` writes class → file tables for core v14 and dnd5e 5.3, regenerated
  on version bump. Fix now: the v13 file names listed in §1; `podrecznik.md` and `source.txt`
  references in copilot-instructions; `Tabele/*` paths for the loot generator (verify).
- **Memory review**: `foundry-mcp holds the world lock` — the server now opens LevelDB per call;
  rewrite as history or delete. `Reload Foundry without logging out … never attempt a login` —
  narrow to "never log into the **campaign** world as a player; sandbox logins via `fvtt login`".
  `MCP timeout ≠ Chrome broken` and the CDP memories → point at `fvtt doctor`.
- **Small fixes**: `python3` → `python` shim in the bash profile (or `.venv` path in AGENTS.md);
  "files with Polish quotes `„”`: write scripts with the file tool, not heredocs" (14 + 7 quoting
  failures); Codex config exposing chrome-devtools and foundry-vtt MCP (`CODEX_TODO.md`).
- **`CLAUDE.md` shrinks**: Chrome troubleshooting → `fvtt doctor` + one paragraph.

### G. Multi-agent coordination

- **Mutex** for anything that stops Foundry or builds packs:
  `%LOCALAPPDATA%\neuroshima-agent\locks\fvtt.json` `{owner, purpose, since, pid}`; stale after the
  owner's pid is gone; `doctor` shows the holder. Quench runs take a shared lock so a rebuild waits.
- **Who touches what**: `doctor` lists working-tree files modified since the session started that
  this agent didn't write (the "file changed on disk" surprises of 2026-10-03), so an agent knows
  before committing what isn't its own.

### H. `foundry-mcp` (vault `Integracje/foundry-mcp`)

`foundry_status` tool (calls `/api/status`, says "Foundry is running — use chrome-devtools" before
trying to open LevelDB); optional `world` parameter so sandbox worlds are readable offline; default
read-only when Foundry is up. Exposed to Codex as well (S5).

## 6. Stages

| Stage | Where | Content | Done when |
|---|---|---|---|
| **S0** Prerequisites & spikes | user profile, Foundry setup | ~~Package locks~~ (done 2026-10-04); local `config.json` and `mode.json` (`development`); secret store created by the human (D4); Claude Code allow rule for `npm run fvtt -- *` (D5); spikes: second desktop-app instance with `--dataPath --port --world` next to the campaign one (D1, Electron profile contention), `loginAs` cookie into a CDP context visible to chrome-devtools MCP, `/quit` and process kill from the script under auto mode, LevelDB interlock detecting a held pack | Each spike has a yes/no recorded in this file |
| **S1** `fvtt` core | repo `dev/agent/` | `status`, `doctor`, `stop/start/restart`, `wait-ready`, `quench`, `packs`, mutex, play lock, guards + unit tests of the guards | An agent rebuilds packs and returns to a tested world with no human step |
| **S2** Sandbox worlds | repo | `world:create/launch/list/delete`, users, `login`, first fixture | Create → log in as GM and Gracz 1 → delete, twice, no leftovers; delete refuses `output` and a non-marked `agent-*` |
| **S3** Layer 6 | repo `dev/e2e/`, `TESTING.md` | Harness + suites 1–3, then 4–6 | Re-introducing the 2026-09-23 grenade bug and the Zranienie hook bug turns a suite red |
| **S4** Release gate | repo, workflow | `build-zip.mjs` shared with the workflow, zip verification, release sandbox, `release:check`, RELEASING.md, version policy | A release candidate built from today's tree passes, and one built with the old exclude list fails |
| **S5** Instructions & MCP | vault + repo | `AGENTS.md`, CLAUDE.md shrink, generated source map, stale-reference fixes, memory review, `foundry-mcp` status/world, Codex exposure, MCP wrapper over the CLI | Path checker (the one used for §1) finds zero dead references |
| **S6** Retro loop | vault `Integracje/agent-retro/` | The transcript miner from this research as a script; rerun monthly or after a big slice; findings appended here | One rerun produces a shorter §1 |

S1 first: it pays back in the very next implementation session. S2–S3 are where tests start
catching what the GM catches today. S4 must be green before the next release is tagged.

**S0 record (2026-10-05)**

| Item | Result |
|---|---|
| Local `config.json` + `mode.json` | **done** — `fvtt init --mcp-json=<vault .mcp.json>`; the CDP endpoint is read from the MCP config (never duplicated), ports from each data path's own `Config/options.json` |
| Secret store | **done** — GM ran `dev/agent/Set-AgentSecret.ps1`; `doctor` verifies it offline against both data paths' `Config/admin.txt` |
| Allow rule for `fvtt` | **human step** — the auto-mode classifier refuses an agent editing its own permissions (correctly). Rules to add are in `dev/agent/README.md` |
| Spike: second desktop app next to the campaign one | **yes** — campaign world + sandbox setup screen served concurrently, no Electron profile errors, license verified from the copied `license.json` |
| Spike: `/quit` and kill under auto mode | **yes** — kill: Electron tree down in 1.7 s; graceful: world shutdown + `/quit` in 1.4 s, no kill needed, no classifier block |
| Spike: LevelDB interlock | **yes** — 58 DBs checked in ~5 ms; a pack held by another process is reported, released one is not |
| Spike: `loginAs` cookie in a CDP context visible to chrome-devtools MCP | **yes** — contexts created by `fvtt` (`disposeOnDetach: false`) survive the CLI and their pages appear in `list_pages`; the MCP labels only contexts it saw at connect time as isolated, the rest look like ordinary pages — use `evaluate_script` → `game.user.name` to tell them apart |
| Found on the way | an agent inside VS Code inherits `ELECTRON_RUN_AS_NODE=1`: the desktop app then starts as bare Node and exits with **no window and no log line**. `fvtt` strips `ELECTRON_*`/`VSCODE_*`/`NODE_OPTIONS` from the server's environment |

## 7. Risks

- **Second instance friction**: licensing is fine (D1), but two Electron instances may fight over
  one profile directory — headless fallback for the sandbox only.
- **Foundry internals**: setup actions are not a documented API; S1 pins them in one module with a
  smoke test, re-checked on every core update (part of the release-sandbox update path).
- **Auto mode**: scripted lifecycle calls may still be classified as risky; the fix is an explicit
  allow rule for `npm run fvtt -- …` (S0), not retrying.
- **Tool sprawl**: one CLI, one config, one secret store, one mutex. New needs extend `fvtt.mjs`;
  no parallel scripts.

## 8. Decisions (GM, 2026-10-04)

| # | Question | Decision |
|---|---|---|
| D1 | Second Foundry server (own data path, own port) **concurrently** with the campaign server? | **Yes** — single-user scenario. Dev sandboxes never touch the campaign server; friction to expect is technical (Electron profile), not licensing |
| D2 | When may an agent restart the campaign server unasked? | **Always, while in development mode** — which is the state since the FVTT migration began. A command invoked from VS Code is development context; restart as development needs. The GM switches explicitly ("we are switching to runtime mode, you will help me co-GM the live campaign") — that is the game-night mutex: `mode.json` → `runtime`, lifecycle commands refuse |
| D3 | Desktop app or headless? | **Desktop app** — the GM can inspect and tweak it after the session. Headless only where it buys something: server output comes from `Logs/debug.<date>.log` anyway; the sandbox may fall back to headless if two Electron instances conflict |
| D4 | Secret store? | **DPAPI file under the user profile**, created once by the GM. Requirements: never pushed, never in grep output of any repo, never printed — protection against accidental leakage, not against the local user |
| D5 | Prompt-free lifecycle? | **Yes — launch and kill, unprompted, in development mode**, launch only behind the LevelDB interlock (nothing holds a world/pack lock). Process kills are scoped to Foundry; Chrome stays human |
| D6 | `AGENTS.md` as the shared manual, `CLAUDE.md` importing it? | **Yes** |
| D7 | Lock the dev module and dnd5e? | **Done 2026-10-04** — `neuroshima-2026-overrides.lock` (git-ignored by `*.lock`) and `dnd5e.lock`. What a lock does in v14 (read in `public/scripts/foundry.mjs`): the setup screen skips the package in **Update all**, hides its Update button and **Edit Module** (which rewrites `module.json`), and refuses **Uninstall**. It does not affect loading the package in a world — development is unaffected. The server endpoints themselves ignore locks, so `fvtt` must check them (§4). Don't lock a **world**: locked worlds cannot be launched or edited. Docs: [Module Management](https://foundryvtt.com/article/modules/), [Package Management](https://foundryvtt.com/article/package-management/) |
| D8 | (2026-10-05) May `fvtt` log browsers in? | **Yes, everywhere, as anyone** — players and every GM, campaign included. The admin password protects against *leakage* (logs, chat, repos), not against the agent. Mechanism: admin auth + `loginAs` over HTTP, session id injected as the browser's cookie — the password never reaches the page. Restarts restore every tab as its previous user |
| D9 | (2026-10-05) Does runtime mode also freeze sandboxes? | **Yes.** Game night takes all of the GM's bandwidth; development then is infeasible, at most small fixes. Agent work during a game is co-GM content: maps, NPCs, images ("a desert battlemap, night, 2× techmutants + a dog and a shed"). So runtime = no lifecycle, no Quench/e2e on any profile; reads and GM logins stay |

### Residual risks after the locks

- **Core updates** are not packages and cannot be locked: update Foundry itself only after the
  release sandbox ran green on the new build (§5 E).
- **Deliberate unlock + update** stays possible — intended for dnd5e upgrades, done in the
  sandbox first.
- **Uncommitted work** is still only on disk: the working tree is the module folder. Commit and
  push in small steps; Foundry's `createBackup` can snapshot packages too, but git is the backup.
- **Direct API calls** bypass locks — only `fvtt` talks to the setup endpoints, and it refuses.

## 9. Progress log

**2026-10-05 — S0 + S1 + S2 done.** `dev/agent/` (README there): `fvtt` CLI, 17 guard tests
(`npm run test:agent`), sandbox data path, world commands, fixture `dev/e2e/fixtures/skirmish.mjs`.

- **S1 done-when met**: `fvtt packs` = world shutdown → `/quit` → build → validate → start same
  world → MCP tab logged back in (14 s), then `fvtt quench` 759/759 (19 s). No human step.
- **S2 done-when met**: twice `world:create e2e --fixture=skirmish` (7 s: world, modules, 3 players,
  scene + walls + 5 tokens, PCs with B 92 / 9 mm / grenade, 2 Bestiariusz NPCs) → GM and Gracz 1
  logged in at once in isolated contexts → `world:delete --stop` (Foundry's `uninstallPackage`,
  contexts disposed). No world folder, context, tab, lock or held DB left. `world:delete` refuses
  `output` (not agent), an unmarked `agent-*` folder, and the running world without `--stop`.
- Found while verifying: `POST /auth` redirects to `/auth` whenever a world is active, success
  or not (the redirect only means something on the setup screen); a fresh world's firstLaunch
  already holds an empty `core.moduleConfiguration` document — a second one is ignored, so the
  bootstrap updates it; fresh worlds start paused (the fixture unpauses).
- **S3 started** — harness `fvtt e2e` on fvtt's own CDP layer (GM decision 2026-10-05: no
  Playwright), suite 1 *boot* green. **Its first run caught two real player-only bugs**, both fixed:
  `weapons/fire-modes.mjs` synced weapon activities on every client (players tried to write other
  players' guns — "lacks permission to update Item" / "Nie możesz tak po prostu wcisnąć tego
  komuś!"; now the active GM, or the owner when no GM is online) and `weapons/magazine.mjs`
  re-projected magazines on clients that cannot write the weapon (now owners only). Quench 759/759.
  Harness lesson: right after a reload the old document still answers `game.ready` — fvtt marks
  pages stale before every reload/navigation.
- **S3 done-when met** (2026-10-05): suite 3 *combat* — the player shoots with forced dice
  (`CONFIG.Dice.randomUniform`; v14 rolls `ceil((1 − u) · faces)`), linked crit damage, the GM applies
  it the dnd5e-tray way → Stopień Zranienia on a target that stays standing, a normal hit as negative
  control; the player throws a grenade through the sheet button and a real CDP canvas click → charge
  pending, detonates on the GM's next turn. **Mutation-checked**: unregistering the Zranienie
  `dnd5e.applyDamage` handler → red at the crit step; `_currentTurnAnchor()` returning null
  (immediate detonation, the 09-23 behaviour) → red at the throw step; real code green.
  Boot + combat from scratch: ~21 s, world deleted afterwards. TESTING.md: warstwa 6 + the rule.
  Harness lessons: close framed popups after seeding (a player with no character at login gets the
  User Configuration window over the canvas); documents cannot be returned by value.
- S3 remaining (coverage, not the done-when): suite 2 character-from-zero through advancement,
  4 player-only paths (ground drop/pick-up via the GM relay, placing charges, drawing permission),
  5 dialog flows (Kondycha heal, Zwinne dłonie, repair), 6 display evidence; burst fire in suite 3
  (needs a B 93R in the fixture).
- **S4 done** (2026-10-05): `npm run release:check [-- --ci | --skip-sandbox | --tag]` and
  `dev/release/build-zip.mjs` (THE include list, own deterministic zip writer, zip built from a git
  ref — the tree's compacted packs zipped 12/16 broken). Full gate green on 4ca7d10 in 76 s; the
  workflow runs `release-check.mjs --ci` and ships the zip it built. **Done-when met**: today's
  tree passes; the old `-x "*.log"` list fails on a fresh-pack commit (e76d559: two empty
  compendiums, one partial). **The gate's first runs found two real problems**: (1) HEAD's
  `sprzet` held 7 Foundry-edited records (campaign user ownership) — packs recommitted;
  (2) a fresh world is imperial, so on a new install Udźwig came out in pounds (8 Quench tests red
  in the release sandbox) — GM decision: the module switches dnd5e to metric on the GM's first
  ready. dnd5e `minimum` → 5.3.0 (= verified). RELEASING.md rewritten around the gate.
- **S5 done** (2026-10-05) — **done-when met: 0 dead references** in 21 instruction files (1 551
  references) by the vault's `Integracje/agent-retro/check_doc_paths.mjs`. `AGENTS.md` here and in
  the agent root of the vault (`neuro5e/AGENTS.md`, imported by `CLAUDE.md` via `@AGENTS.md`, linked
  from copilot-instructions, a pointer at the vault root for Codex/Copilot sessions started there);
  pipelines index in both. `CLAUDE.md` 122 → 62 lines, Chrome troubleshooting → `fvtt doctor`.
  Generated source map: `dev/agent/index-sources.mjs` → vault `.github/skills/fvtt-source-map.md`
  (652 core + 342 dnd5e classes); `fvtt-api` skill fixed to v14 names. Stale references fixed: loot
  generator paths (and the script's own default, which made a bare run fail), DEV_GUIDE, roll20,
  the "not yet done" release bootstrap. foundry-mcp (§5 H): `foundry_status`, optional `world` on
  read tools (sandbox/release worlds, read-only), reads from a snapshot while Foundry holds the
  world, writes refused then (and no backup left behind). Memory: login/restart rules, runtime
  mode, foundry-mcp lock as history, CDP memories → `fvtt doctor`. Not done: a `python3` shim in
  the user's shell profile (documented instead), the optional MCP wrapper over `fvtt`, Codex MCP
  exposure (needs the GM's go-ahead: it writes the Chrome endpoint into Codex's own config).
- **S6 set up** (2026-10-05): the vault's `Integracje/agent-retro/mine_sessions.py` takes
  `--since/--until/--label`, reports per-session rates and diffs against the previous retro file;
  README describes the monthly loop. **Baseline** (28 sessions up to 2026-10-04): 647 tool calls
  per session, `evaluate_script` 20.9 % of them, PowerShell errors 26.6 % (Bash 1.9 %), per session
  1.07 "close Foundry" hand-offs, 0.79 CDP connect timeouts, 2.39 pack-lock errors, 1.71 missing
  paths, 6.1 GM corrections. The build session itself: `evaluate_script` 3.9 %. **Done-when pending
  by nature**: the first monthly retro after real use of `fvtt` decides whether §1 got shorter.
- Still open in S0: the Claude Code allow rule (human — README "One-time setup").
- Next: remaining S3 coverage and the first S6 monthly retro. Layer 6 uses fvtt's CDP runner.

### Codex field test (2026-10-05)

- Ran `doctor`, `sandbox:init`, `world:create poscig --fixture=poscig`, `world:seed`, explicit
  GM/player `login` contexts, `reload`, campaign and sandbox `quench`, chase/all-suite `e2e`,
  `release:check -- --skip-sandbox`, and a final preview `world:launch`. Development mode and
  sandbox isolation behaved as documented. The campaign stayed on its original scene.
- Chrome MCP supplied before/after screenshots, foreground selection, a GPU-backed trace and
  `performance_analyze_insight`; direct live API reads identified native artwork directions.
  Foundry MCP `foundry_status` and a sandbox actor search read the running world successfully.
  The e2e runner supplied persistent screenshot/report files and deleted the green test world.
- Approvals: **64 shell escalation requests through validation and preview setup**, including
  read-only diagnostics; **zero human approval replies or clarification round trips** observed.
  The shell sandbox failed during setup before four initial commands could run, so subsequent
  shell calls required escalation and were handled by automatic review. This inflated the
  escalation count well beyond the lifecycle commands anticipated in the handoff.
- Friction: Chrome MCP refused screenshot/trace output paths as outside configured roots, even
  for declared workspace roots; inline screenshots and fvtt's on-disk screenshots worked. The
  trace itself completed, but the available insight concerned the FPS widget, so ticker cost
  was measured directly in-page. `quench` automatically selected a player tab when several
  contexts were open and refused; explicit `--page=<GM target>` worked. Context labels were
  absent in `list_pages`, as predicted; `game.user.name` and `game.world.id` disambiguated them.
- Opening manual `gm` alongside `e2e-gm` logged the same active GM in twice. Sandbox Quench then
  duplicated several provisioned item activities (761/771); closing only the extra agent tabs
  and rerunning gave 771/771. Keep one GM tab for this kind of check; this is also useful evidence
  for future multi-GM hardening. No unrelated item code was changed.
- A clean chase run was invalidated when the between-lanes and free-zone controls were moved
  during the winter sample. Reseeding fixed it; the suite now records document invariance over
  each full sample. Another failure was a test checking the setting before a preceding replicated
  movement settled; it now waits for that movement. A stronger cross-client check caught and
  fixed a real v14 bug: user-setting `onChange` is broadcast to other clients, so read the current
  user's setting instead of adopting the callback argument.
- No GM intervention was needed. The user's render-time/VRAM recommendation adjustment was
  sufficient when the baseline exceeded 20 ms p95; no quality reduction or new approval was
  needed. Final evidence and the performance table: `PLAN_poscigi.md`, Codex hand-back entry.
