/**
 * Neuroshima 5e — WKK content registry.
 *
 * The one file that knows the full extent of "W Kolorze Kobaltu" content. Nothing here is
 * required at runtime — every consumer today imports its own WKK sibling directly (e.g.
 * `config/ammo-data.mjs` imports `KOBALT_AMMO` straight from `wkk/config/ammo-data.mjs`), and
 * `main.mjs` still registers every WKK item unconditionally, exactly as before this file
 * existed — see `scripts/wkk/README.md` for why (this pass is organizational; nothing about
 * what ships in the live module has changed).
 *
 * This registry exists for the case that DOES need "all WKK content" as one thing: a future
 * RAW-only build variant. When that gets built, it should need to import exactly this file to
 * know everything to leave out, rather than re-deriving the census this file already encodes.
 */

export { isKobaltEnabled } from "../config/settings.mjs";

// Whole items — no RAW counterpart exists for any of these (see each file's own doc comment
// for why). `main.mjs` currently registers all of them unconditionally.
export { registerPochodnia, pochodniaApi } from "./items/pochodnia.mjs";
export { registerFlara, flaraApi } from "./items/flara.mjs";
export { registerPistoletNaRace } from "./items/pistolet-na-race.mjs";
export { registerZetonLuxor, zetonLuxorApi } from "./items/zeton-luxor.mjs";
export { registerGadzety, gadzetyApi } from "./items/gadzety.mjs";

// Catalog entries spliced into an otherwise-RAW array/object by the host file named.
export { KOBALT_AMMO } from "./config/ammo-data.mjs";                     // → config/ammo-data.mjs
export { KOBALT_WEAPONS, LASKA, MIECZ, PISTOLET_NA_RACE, ZLOTY_DESERT_EAGLE } from "./config/weapons-data.mjs"; // → config/weapons-data.mjs
export { KOBALT_DISEASES, SCHIZOFRENIA_PARANOIDALNA_ID } from "./config/diseases-data.mjs"; // → config/diseases-data.mjs, config/disease-effects.mjs, config/chemia-data.mjs
export { KOBALT_PHOBIAS } from "./config/phobias-data.mjs";               // → config/phobias-data.mjs
export { ROZRYWAJACA } from "./combat/weapon-save-properties.mjs";        // → combat/weapon-save-properties.mjs
export { DUMDUM_BLEED_PROFILE } from "./combat/bleeding.mjs";             // → combat/bleeding.mjs

// The one "NOE item, WKK numbers" override case — see items/latarka.mjs's `_light()`.
export { LIGHT_KOBALT } from "./config/latarka-overrides.mjs";            // → items/latarka.mjs
