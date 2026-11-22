# Local project hub

`fvtt hub [--registry=<private JSON file>]` starts/reuses the independent local project desk and returns one JSON object containing its runtime URL. `--stop` shuts down that instance when no job is running. It never starts Chrome. No dependencies or frontend build are required.

The optional registry supplies `title`, `subtitle`, `roots` (relative to the registry), curated `entries`, `mapGalleries`, and a private `graphicsFactory` module exporting `createPrivateGraphicsReview`. Entries use a logical `root`, relative `path`, stable `id`, `label`, `group` and `kind` (`gallery`, `document`, `obsidian`), with optional `historical`. A per-user configuration may set `hub.registry`; private registry contents stay outside this public repository.

The hub uses named-pipe/local-socket discovery, one lazy graphics service, read-only gallery mounts and existing report files. Foundry commands run through the existing CLI with explicit profiles. Mutations require matching host/origin and a per-process action token. Static paths check both the allowed gallery directory and resolved filesystem root, including junctions. Only named report artifacts and curated documents can be read.

`npm run test:hub` runs temporary-fixture checks. The hub is dev tooling and is excluded by the release ZIP include list. Local job archives are ignored under `logs/hub/`. Legacy E2E reports retain unknown code provenance; a successful old release check is never a claim about current working-tree changes.
