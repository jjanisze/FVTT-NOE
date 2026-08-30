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
4. Run the pre-flight checks:
   ```
   npm run validate:tests
   npm run validate:packs
   npm run validate:css
   ```
5. Commit (`git commit -am "release: v<x.y.z>"`), tag, and push:
   ```
   git tag v<x.y.z>
   git push origin master --tags
   ```
6. Pushing the tag triggers `.github/workflows/release.yml`, which:
   - verifies the tag's version matches `module.json`'s `version` (fails the build otherwise —
     fix and re-tag rather than fighting it),
   - zips the module's runtime files into `module.zip`,
   - creates a GitHub Release for the tag with `module.json` and `module.zip` attached, marked
     **latest**.
7. Confirm on the [Releases page](https://github.com/jjanisze/FVTT-NOE/releases)
   that the new release is there and marked "Latest". Foundry installs/updates will pick it up
   automatically from that point on.

## What's excluded from `module.zip`

The release zip only contains what a running Foundry instance needs — `module.json`, `scripts/`,
`styles/`, `templates/`, `lang/`, `icons/`, `sounds/`, `tokens/`, `ui/`, `packs/`, plus
`README.md`, `LICENSE`, `CREDITS.md`, and `docs/` for context. It deliberately drops the
developer-only material that would otherwise roughly double the download for no runtime benefit:
`dev/`, `.venv/`, `node_modules/`, `logs/`, `package.json`, dotfiles, `.github/`, and the dense
dev docs (`ARCHITECTURE.md`, `DEV_GUIDE.md`, `TESTING.md`, `IMPLEMENTATION.md`,
`neuroshima_5e_modifications.md`, `PLAN_*.md`, `HANDOFF_*.md`, `CONTRIBUTING.md`,
`RELEASING.md` itself). All of that stays fully available in the git repo/GitHub — only the
*download* is trimmed. See the `exclude` list in `.github/workflows/release.yml` if the split
ever needs to change.

## One-time bootstrap (not yet done — do not run until confirmed)

Before the *first* release can happen, the repo needs to actually exist on GitHub:

```
gh auth login
gh repo create jjanisze/FVTT-NOE --public --source=. --remote=origin
git push -u origin master
```

Then follow "Cutting a release" above for the first tag. This step is intentionally not automated
here — it's the actual "going public" moment and should be a deliberate, confirmed action.
