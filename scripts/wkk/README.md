# WKK — "W Kolorze Kobaltu"

This folder is the exclusive home for content that is **not** in the *Neuroshima Ostatnia Era*
rulebook. Everything else in `scripts/` is NOE: a straight translation of the book, reusable by
any table running this module regardless of house rules.

## The classification rule

> If it's in the RAW textbook, it's NOE. If it's not, it's WKK — no exceptions, including for
> content that patches a broken engine default or is player-specific ephemera. If a RAW item's
> numbers were house-ruled for this campaign, it's an NOE item with a WKK override.

This is a hard binary, decided directly by the GM (2026-09). Two cases that might look like
exceptions and aren't:

- **Content with no RAW equivalent is still 100% WKK**, even when it exists to work around a
  broken engine default rather than to add homebrew flavor. Pochodnia (`items/pochodnia.mjs`)
  replaces dnd5e's stock Torch, whose 40ft attack-template AOE is broken — but RAW states no
  torch stats, damage, range, fuel, or construction requirements at all, so there is nothing to
  fall back to. The "NOE equivalent" of Pochodnia without WKK is "GM, go make one up."
- **Player/character-specific ephemera is still WKK**, not some other tier. Lorentz's rubber
  duck, Alan's pen, Laffitte's cane, Raynald's sword, his personalized disease variant, the
  Żeton Luxor casino chip — none of these are in the rulebook, so by the rule above they're WKK,
  full stop. Other tables who enable WKK will see this table's in-jokes; that's an accepted cost
  of keeping the rule simple rather than inventing a fourth bucket for "campaign-specific but
  still mechanical" content.

## What's actually in here

| File | What it holds |
|---|---|
| `wkk/items/pochodnia.mjs` | Both torch variants + fuel/refuel/ignition mechanics |
| `wkk/items/flara.mjs` | Handheld flare |
| `wkk/items/pistolet-na-race.mjs` | Flare pistol + its "Wystrzel flarę" activity |
| `wkk/items/zeton-luxor.mjs` | Żeton Luxor prop |
| `wkk/items/gadzety.mjs` | The 4 flavor click-items |
| `wkk/config/ammo-data.mjs` | `44mag_dd`, `race` ammo entries |
| `wkk/config/weapons-data.mjs` | `pistolet-na-race`, `laska`, `miecz` weapon entries |
| `wkk/config/diseases-data.mjs` | Schizofrenia paranoidalna + its stable id |
| `wkk/config/phobias-data.mjs` | Mizoofobia |
| `wkk/config/latarka-overrides.mjs` | `LIGHT_KOBALT` — see the override pattern below |
| `wkk/combat/weapon-save-properties.mjs` | `rozrywajaca` |
| `wkk/combat/bleeding.mjs` | `dumdum` bleed profile |
| `wkk/registry.mjs` | Every WKK export in one place — see its own header comment |

Every file above has a matching "host" file at the equivalent path one level up (e.g.
`wkk/config/ammo-data.mjs` ↔ `config/ammo-data.mjs`) that imports it and splices it into an
otherwise-RAW array/object, at the exact position the entry used to live inline. The host
file's public exports (name, shape, behavior) are unchanged by this — only *where the WKK piece
is defined* moved. `disease-effects.mjs` is the one exception: its WKK-driven entry
(`schizofreniaParanoidalna`) is mechanically identical to the RAW `paranoja` entry it sits next
to (same disease, different in-fiction name), so rather than relocate a duplicate, that file now
shares one local constant between both keys — see its own comment.

## The override pattern (NOE item + WKK numbers)

Currently one case: Latarka's light radius (`items/latarka.mjs`). The shape to copy for the
next one:

- The RAW value stays in the host file, named `..._RAW`.
- The WKK value moves to its `wkk/` counterpart, named `..._KOBALT`, with a doc comment
  explaining what changed and why.
- The host file keeps the live branch (`isKobaltEnabled() ? X_KOBALT : X_RAW`) at the single
  point of use — no forked files, no strategy pattern, per `PLAN_kobalt.md`'s original decision.

## What this pass did *not* change

This reorganization does not change what the live module ships or how the `kobaltEnabled`
world setting behaves — every `registerX()` call `main.mjs` fires today still fires
unconditionally, and `dev/packs/build-packs.mjs` still produces exactly one compendium set, the
same as before this folder existed. What it buys is a mechanical starting point for an actual
RAW-only build variant later: `wkk/registry.mjs` is the one file that would need consulting to
know everything such a build should leave out.
