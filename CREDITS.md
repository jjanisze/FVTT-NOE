# Credits & asset sources

This file lists where the non-original content in this repository comes from, and under what
terms. The module's own code, configuration data, and documentation are MIT-licensed — see
[LICENSE](LICENSE). Everything below is either third-party, AI-generated, or derived from the
*Neuroshima Ostatnia Era* tabletop RPG, and is called out separately.

## Game system this overrides

This module modifies the [`dnd5e`](https://github.com/foundryvtt/dnd5e) system for
[Foundry Virtual Tabletop](https://foundryvtt.com/). Neither is redistributed here — install both
separately.

## Neuroshima Ostatnia Era content (compendia, terminology, rules)

*Neuroshima Ostatnia Era* (setting *Za Garść Gambli*) is a tabletop RPG published by
**Portal Games**. This module is an **unofficial, non-commercial fan conversion** of its rules to
the `dnd5e` engine. It is **not affiliated with, endorsed by, or produced in association with
Portal Games**. No scanned or verbatim pages of the book are redistributed; the compendia
(`packs/`) contain game-mechanical stats, translated terminology, and rules text needed to run
the system at the table — the same convention used by other fan-made 5e conversions of
non-5e-native games in the Foundry ecosystem. If you're a rights holder and have concerns about
specific content here, please open an issue (see [README.md](README.md#zgłaszanie-błędów)) — it
will be addressed promptly.

## Audio

### Freesound.org (CC0)

Most SFX (travel, explosives, and others) are individually-sourced Freesound.org tracks, all CC0
at the time of import. The full per-file source list, author, and license is tracked in:

- [`dev/audio/FREESOUND_TRAVEL_SOURCES.md`](dev/audio/FREESOUND_TRAVEL_SOURCES.md)
- [`dev/audio/FREESOUND_EXPLOSIVES_SOURCES.md`](dev/audio/FREESOUND_EXPLOSIVES_SOURCES.md)

### Fallout 2 decoded sound library

A subset of the shipped firearm sounds (`sounds/firearms/`) is decoded from the original
**Fallout 2** (Interplay / Black Isle Studios; property of Bethesda Softworks) game data, sourced
from a fan audio rip hosted at
[spriters-resource.com/pc_computer/fallout2](https://sounds.spriters-resource.com/pc_computer/fallout2/).
This is used here for **non-commercial fan purposes only**, consistent with how the wider
retro-gaming/modding community treats these rips. Source-identification notes and per-file
provenance live in [`dev/audio/lib/f2/DECODED_SOUND_MAP.md`](dev/audio/lib/f2/DECODED_SOUND_MAP.md).
If Bethesda or a rights holder would like these files removed, please open an issue — they will
be pulled without argument.

## Icons

Most item/ability/status icons are AI-generated (Google Gemini and OpenAI ChatGPT image models),
prompted for a flat, minimal, single-color silhouette style matching the base `dnd5e` icon set,
then normalized by a local script. Pipeline and prompt details:
[`dev/icons/Pipeline.md`](dev/icons/Pipeline.md). Status-effect icon spec:
[`icons/statuses/ASSETS.md`](icons/statuses/ASSETS.md).

## Token art

Bestiary token art is original work, borrowed (by reference, not copy) from `dnd5e`'s own
top-down token set where it fits, or a clearly-marked placeholder otherwise. Full sourcing rules,
including why `dnd5e`'s Forgotten Adventures tokens are **referenced by path and never copied
into this module** (their license forbids redistribution outside Foundry VTT), are documented in
[`tokens/README.md`](tokens/README.md).

## AI-assisted development

Significant parts of this module's code, documentation, and some art/audio-processing tooling
were produced with AI assistance (primarily Claude Code for code and docs; Gemini/ChatGPT for
some icon generation, as above). See the README's "O projekcie" section for why that's part of
why this ships only via GitHub rather than the official Foundry package listing.
