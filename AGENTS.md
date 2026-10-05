# AGENTS.md — operating manual for agents in this repo

For any agent harness (Claude Code, Copilot, Codex, …). This repo is the FoundryVTT module
**Neuroshima: Ostatnia Era** (dnd5e 5.3 overrides) and it is **public** — see "Rules" before
writing anything. Deep docs: [DEV_GUIDE.md](DEV_GUIDE.md) (dnd5e integration),
[ARCHITECTURE.md](ARCHITECTURE.md), [TESTING.md](TESTING.md), [IMPLEMENTATION.md](IMPLEMENTATION.md)
(status matrix + changelog), [RELEASING.md](RELEASING.md); topic plans `PLAN_*.md`; check for a
`HANDOFF_*.md` before starting module work.

## Start here

```sh
npm run fvtt -- doctor        # Foundry + Chrome up? who is logged in? mode? anything held or broken?
```

`fvtt` ([dev/agent/README.md](dev/agent/README.md)) is how agents drive Foundry — not hand-written
CDP snippets, not process kills, not asking the GM to close Foundry:

| Need | Command |
|---|---|
| Rebuild compendia and get back into a working world | `npm run fvtt -- packs [--only=bron,…]` |
| Restart Foundry, tabs logged back in | `npm run fvtt -- restart` |
| A tab sits on `/join` (restart or 24 h session expiry) | `npm run fvtt -- login [--user=…]` |
| Pick up edited `scripts/**` in the browser | `npm run fvtt -- reload` |
| Run the Quench batches (layers 1–5) | `npm run fvtt -- quench [--filter=…]` |
| GM + players, real combat, clicks — in a throwaway world | `npm run fvtt -- e2e [--suites=…]` (layer 6) |
| A sandbox world to poke at | `npm run fvtt -- world:create <slug> --fixture=skirmish` |
| Before tagging a release | `npm run release:check -- --tag` |

Mode: `development` (default) — agents may stop/start/restart Foundry unprompted. `runtime` = game
night: lifecycle and test commands refuse; the GM switches modes by saying so.

## Pipelines — never hand-edit the output, run the generator

| Output | Source of truth | Run |
|---|---|---|
| `packs/*` (all 16 compendia) | `scripts/config/*-data.mjs`, item builders in `scripts/**` | `npm run fvtt -- packs` |
| Bestiariusz (pack `bestiariusz`), `scripts/config/bestiary-data.mjs` | NOE Markdown in the campaign vault (`Podrecznik/NOE/13 NOTATNIK ŁOWCY/`) → `dev/bestiary/bestiary.json` | `npm run build:bestiary` (then `fvtt packs`). Never create or edit monster actors by hand. The parser is strict (unknown label/skill/damage type/condition = build error). Portraits: the world's `characters/<NNN>_-_<Name>/avatar.*` (fuzzy name match, `PORTRAIT_ALIASES` in `build-packs.mjs`); top-down token art `tokens/<creature-id>.png` wins over `tokens/aliases.json` and `tokens/_placeholder/`. Details: IMPLEMENTATION.md, "Bestiariusz" |
| `scripts/config/class-features-data.mjs` | `dev/classes/classes.json`, `professions.json` (← `extract_classes.py`/`extract_professions.py` from NOE) | `npm run build:classes` |
| Class/status placeholder icons, token templates | `dev/icons/gen_*` | `npm run build:icons`, `build:status-icons`, `build:token-templates`; real art requests go in `dev/icons/MISSING.md`; icon pipeline: `dev/icons/Pipeline.md` |
| Scenes named `… (2026)` in the world | the Maps repo (Tiled) → `tools/push.py` → `game.neuroshima.maps.update()` | fix maps in Tiled; generated walls edited in Foundry are overwritten |
| `module.zip` | `dev/release/build-zip.mjs` (the one include list) | `npm run release:check` |
| Source map "class → file" for Foundry/dnd5e (campaign vault skills) | the installed sources | `node dev/agent/index-sources.mjs …` after a Foundry/dnd5e update |

`npm run release:check` re-runs every generator and fails on anything stale.

## Rules

- **Public repo.** No campaign spoilers, no hosts, ports, secrets or personal paths — in code,
  comments, plans or commit messages. New mechanics: NOE (rulebook) or WKK (house rules)? See
  [scripts/wkk/README.md](scripts/wkk/README.md).
- **Foundry state is shared** with the GM and with other agents: `fvtt` takes a per-server mutex,
  refuses to start while any LevelDB is held, never touches Chrome. Agent worlds live only in the
  sandbox data paths (`agent-<slug>-<date>`); `world:delete` refuses anything else.
- **Logins** go through `fvtt login` (any user, D8) — never type a password into a page.
- **Tests:** `npm test` (static), `npm run test:agent`, `fvtt quench`, `fvtt e2e`. A change touching
  UI, canvas, combat, dialogs or player permissions is not done without a layer-6 run or sandbox
  check — screenshot in the hand-off ([TESTING.md](TESTING.md) §3).
- **Assets:** WEBP, not PNG, for anything shipped.

## Practicalities

- Python is `python` (the campaign vault's `.venv` comes first on PATH); `python3` is the
  Windows Store stub. Python printing Polish text into a pipe needs `PYTHONUTF8=1`.
- Files containing Polish quotes („”) or regex escapes (`\r\n`): write them with the file/edit
  tool, not shell heredocs — quoting mangles them silently.
- An agent inside VS Code inherits `ELECTRON_RUN_AS_NODE=1`; launch Foundry via `fvtt start`, not
  the executable.
- Windows checkout: git converts LF to CRLF; generators write LF — compare text, not bytes.
- Commits: small, imperative subject (`Area: what changed`), body says why; LevelDB churn in
  `packs/` after a world start is compaction, not content — `fvtt packs` + commit when records change.
