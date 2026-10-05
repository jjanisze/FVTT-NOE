# Releasing

How a new version gets from a working tree to something Foundry can one-click install/update.

## How installs/updates actually work

`module.json` ships with:

```json
"manifest": "https://github.com/jjanisze/FVTT-NOE/releases/latest/download/module.json",
"download": "https://github.com/jjanisze/FVTT-NOE/releases/latest/download/module.zip"
```

Both point at GitHub's `/releases/latest/download/<asset-name>` redirect, which always resolves
to whichever release is currently marked **latest** — not a specific tag. That means:

- Foundry's installer/updater always finds the current version through one stable URL. No
  per-version URL templating, no keeping module.json's `download` field in sync with a tag by
  hand.
- The tradeoff: this pattern only supports installing/updating to *latest*. That's an accepted
  limitation for a project this size — see `.github/workflows/release.yml` if that ever needs to
  change (would require templating a versioned `download` URL into each release's `module.json`
  instead).

## Cutting a release

1. Make sure `main`/`master` is what you want to ship.
2. Bump the version (updates `module.json`'s `version` field with a BOM guard):
   ```
   npm run bump:version <x.y.z>
   ```
3. Add a changelog entry to [`IMPLEMENTATION.md`](IMPLEMENTATION.md) (existing convention — see
   its `## Changelog` section).
4. Commit (`git commit -am "release: v<x.y.z>"`) — the gate tests a commit, not a working tree.
5. Run the release gate; it creates the tag **only if everything is green on that exact commit**:
   ```
   npm run release:check -- --tag
   ```
   Needs the Foundry install, Chrome with remote debugging and the campaign vault (it runs the
   `fvtt` agent tooling — `dev/agent/README.md`). What it does, in order: static checks
   (`npm test`, agent guard tests, CSS, recipes); every generator re-run and compared with what is
   committed (bestiary and class features from the NOE vault, the data modules from their JSON —
   nothing left modified); `dev/release/build-zip.mjs` builds `dist/module.zip` from the commit and
   verifies it; a fresh `build-packs` must validate and hold the same records as the zip's packs;
   the version policy below; then a **release sandbox** — a separate Foundry data path where the
   module is installed *from the zip* — runs every Layer 6 e2e suite in a *bare* world (module
   only) and a *recommended* one (+ Quench, Sequencer, Splatter), plus the Quench batches in the
   latter. Report: `logs/release/<version>-<time>.json`. Red → fix, commit, run again.
6. Push the commit and the tag:
   ```
   git push origin master v<x.y.z>
   ```
7. Pushing the tag triggers `.github/workflows/release.yml`, which:
   - verifies the tag's version matches `module.json`'s `version` (fails the build otherwise —
     fix and re-tag rather than fighting it),
   - runs the gate's CI subset (`release-check.mjs --ci`: everything above that needs neither
     Foundry nor the private vault) and builds `module.zip` with the same `build-zip.mjs`,
   - creates a GitHub Release for the tag with `module.json` and `module.zip` attached, marked
     **latest**.

### Version policy

- `module.json` `compatibility.verified` (Foundry) and the dnd5e `verified` are what the release
  sandbox actually ran. dnd5e `minimum` equals `verified` — claim only what is tested
  (`release:check` fails otherwise).
- Updating Foundry or dnd5e: try the new version in the release sandbox first (its dnd5e is its
  own copy, `%LOCALAPPDATA%\FoundryVTT-Release`) → green → bump `verified` → only then update the
  campaign install. The campaign's dnd5e and this module carry Foundry package locks so "Update
  all" cannot move them by accident.
7. Confirm on the [Releases page](https://github.com/jjanisze/FVTT-NOE/releases)
   that the new release is there and marked "Latest". Foundry installs/updates will pick it up
   automatically from that point on.

## What's excluded from `module.zip`

> **Packs ship with their `.log` files.** A built LevelDB pack holds its records in `000NNN.log` until
> compaction; until 2026-10-03 the zip excluded `*.log` and ten of sixteen compendiums arrived empty.
> Only `LOCK` is excluded.

The release zip only contains what a running Foundry instance needs — `module.json`, `scripts/`,
`styles/`, `templates/`, `lang/`, `icons/`, `sounds/`, `tokens/`, `ui/`, `vfx/`, `packs/`, plus
`README.md`, `LICENSE`, `CREDITS.md`, and `docs/` for context. It deliberately drops the
developer-only material that would otherwise roughly double the download for no runtime benefit:
`dev/`, `.venv/`, `node_modules/`, `logs/`, `package.json`, dotfiles, `.github/`, and the dense
dev docs (`ARCHITECTURE.md`, `DEV_GUIDE.md`, `TESTING.md`, `IMPLEMENTATION.md`,
`neuroshima_5e_modifications.md`, `PLAN_*.md`, `HANDOFF_*.md`, `CONTRIBUTING.md`,
`RELEASING.md` itself). All of that stays fully available in the git repo/GitHub — only the
*download* is trimmed. The include list lives in **one** place, `dev/release/build-zip.mjs`
(`INCLUDE_FILES`, `INCLUDE_DIRS`, `EXCLUDE`), used by the local gate and the workflow alike; change
it there. The zip is built from a git commit, not the working tree — Foundry compacts `packs/` on
every world start, so the tree's pack files rarely match any commit.

## One-time bootstrap — done

The public repository exists (`origin`), and releases have been cut from it since v0.14.
