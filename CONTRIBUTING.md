# Contributing

This is a small, mostly-solo fan project developed with heavy AI assistance (Claude Code). PRs,
issues, and AI-assisted contributions are all welcome — human review still gates every merge.

## Reporting a bug

Open a [GitHub Issue](https://github.com/jjanisze/FVTT-NOE/issues/new/choose)
using the "Bug report" template. Good bug reports include:

- FoundryVTT version, `dnd5e` system version, and this module's version (all visible in
  **Add-on Modules**).
- Exact steps to reproduce.
- Any error text from the browser console (F12 → Console) — the actual stack trace, not a
  paraphrase.
- What you expected to happen vs. what actually happened.

If it's specifically a rules/mechanics disagreement with the printed book, say so explicitly and
cite the page/table if you have it — that's a different kind of bug than a code error and gets
triaged differently.

Player-facing framing of the same process (Polish) lives in the
[README](README.md#zgłaszanie-błędów).

## Proposing a change

1. Read [`ARCHITECTURE.md`](ARCHITECTURE.md) first — it documents the hard invariants
   (`CONFIG.DND5E` mutation timing, DataModel schema strictness, compendium build-artifact rule,
   etc.). Most subtle bugs in this codebase come from violating one of these.
2. Check [`DEV_GUIDE.md`](DEV_GUIDE.md) for environment setup, critical paths, and where things
   live.
3. **Never hand-edit a compendium under `packs/`** — every pack is a build artifact of
   `dev/packs/build-packs.mjs` from a `scripts/config/*-data.mjs` source file. Edit the source,
   then run `npm run build:packs`.
4. Follow the commit style already in the log: short imperative subject with a
   `feat:`/`docs:`/`fix:` prefix, Polish or English body as fits (existing history mixes both —
   match whichever the surrounding commits use for that area).
5. Before opening a PR, run the existing validation scripts:
   ```
   npm run validate:tests
   npm run validate:packs
   npm run validate:css
   ```
6. Mechanics changes need live verification inside Foundry via Quench — see
   [`TESTING.md`](TESTING.md) for why there's no Node test runner and how the browser-based tests
   are organized.
7. If your change affects `module.json`'s `version`, use `npm run bump:version <x.y.z>` rather
   than hand-editing the field (it guards against a BOM corrupting the manifest).

## Releasing

Not a contributor concern for most PRs, but if you're picking up release duties: see
[`RELEASING.md`](RELEASING.md).
