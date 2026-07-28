/**
 * Neuroshima 5e — Sound bank registry (editorial layer).
 *
 * AUTHOR-TIME EDITABLE. This is the hand-maintained half of the sound system:
 * which caliber / weapon draws its audio from which Fallout 2 sound bank, and
 * which slot each fire mode uses. The machine-maintained half — what files
 * actually exist and how many alternate takes each slot has — is generated
 * into `sound-bank-manifest.mjs` by `dev/audio/build_sound_banks.ps1`.
 *
 * ---------------------------------------------------------------------------
 * WHY BANKS, AND NOT MORE `WeaponSound` KEYS
 * ---------------------------------------------------------------------------
 * The old model was flat: one `WeaponSound` enum member → one file path, with
 * `CALIBER_VFX[id].sound.{p,ks,…}` remapping a caliber onto a *different
 * existing tier*. Giving ten calibers their own shot + burst + reload + click
 * would have meant ~40 new enum members and 40 `SOUND_PATHS` lines, which is
 * why it never happened (see the stub comment left in `weapon-vfx.mjs`).
 *
 * The source material isn't shaped that way. Each Fallout 2 weapon prototype
 * is a *set*: a fire sound, often a burst, a reload, a dry-fire click, and
 * impact sounds split four ways by target material — each with 1–3 alternate
 * takes. A "bank" models that set directly, so a caliber names one bank and
 * gets every slot at once, and alternate takes become free playback variety.
 *
 * The `WeaponSound` enum in `sounds.mjs` is NOT replaced — it still owns every
 * event that isn't weapon-archetype-specific (jams, cleaning, explosives,
 * melee). Banks layer on top and win when present.
 *
 * ---------------------------------------------------------------------------
 * SLOTS
 * ---------------------------------------------------------------------------
 *   shot        single shot (P)
 *   burst       automatic fire (KS / DS / MS / OZ)
 *   reload      magazine change or bolt cycle
 *   click       dry fire on an empty chamber
 *   impact      material-less impact (launchers, thrown, explosions)
 *   impact-F/M/S/W   impact by target material — flesh / metal / stone / wood
 *                    (letters per DECODED_SOUND_MAP.md; that doc flags the
 *                    exact letter→material reading as an unconfirmed guess,
 *                    so treat MATERIAL_BY_CREATURE_TYPE below as tunable)
 *
 * ---------------------------------------------------------------------------
 * SOURCING NOTES — read before changing an assignment
 * ---------------------------------------------------------------------------
 * Provenance for every bank is in `dev/audio/lib/f2/DECODED_SOUND_MAP.md`
 * (symbol table + confidence) and `listen/LISTENING_NOTES.md` (the raw by-ear
 * session it was built from).
 *
 * CONFIRMED BY EAR (2026-07-25 audition pass):
 *   `pistol` (A) and `shotgun` (R) are right. Everything below marked
 *   `confidence: "high"` in BANK_INFO can be trusted.
 *
 * CORRECTED BY EAR — do not "restore" these from the notes:
 *  - Symbol `#` is an ENERGY weapon, not an SMG. LISTENING_NOTES.md line 17
 *    calls its `_1` fire recording "UZI burst (medium caliber)", which made it
 *    look like the library's only SMG burst. It is not: fire, click and reload
 *    are all an EMP/pulse rifle, exactly as DECODED_SOUND_MAP.md's original
 *    "energy weapon" reading (from the b4_09 reload) had it. Consequence: there
 *    is NO SMG burst in this library, so 9mm/45acp automatic fire uses the
 *    generic tiers. Its 16 *hit* recordings are a different weapon — since
 *    identified by ear as a light/intermediate rifle — and are now the
 *    `impact-intermediate` bank, which supplies burst impacts to every rifle
 *    caliber (no other ballistic set has them).
 *  - Symbol `@` (`hmg`) contradicts the summary's "heavy energy weapon" on the
 *    strength of its fire recordings ("a single, powerful shot from a high
 *    caliber weapon"; "four low fire rate shots") — a heavy MG, which is what
 *    .50 BMG needs and has no other candidate for. Its fire and impacts are
 *    kept; its RELOAD was confirmed by ear to be an electric/energy action and
 *    is blacklisted. Fire identity itself still `confidence: "audition"`.
 *
 * STANDING RULE: the minigun sound belongs to the Minigun alone. No shared
 * caliber may borrow it for MS — see the notes on `556` and `762`.
 *
 * Banks still marked `confidence: "audition"` sound right on paper but have not
 * been confirmed in context. Audition via `game.neuroshima.sounds.panel()` and
 * correct the mapping here.
 *
 * LESSON: identify a symbol by its FIRE recording. Fallout 2 demonstrably
 * reuses and misassigns reload audio (already noted for `H` and `L`), and both
 * `#` and `@` were mis-filed by reasoning from their reloads.
 */

import { BANK_MANIFEST, BANKS_BASE } from "./sound-bank-manifest.mjs";

/* -------------------------------------------- */
/*  Bank metadata                                 */
/* -------------------------------------------- */

/**
 * Human-facing description of each bank: which Fallout 2 prototype it came
 * from and how much to trust the identification. Drives the audition panel's
 * labels; `confidence` is documentation, never behaviour.
 *
 * confidence: "high"     — recognized outright by ear (e.g. "100% minigun")
 *             "medium"   — consistent, plausible, not independently confirmed
 *             "audition" — needs the author's ear before being trusted
 */
export const BANK_INFO = Object.freeze({
  // Confirmed good by ear. Author noted it reads as though it could be a
  // semi-auto RIFLE rather than a pistol — worth trying against a rifle caliber
  // if the pistol tier ever needs rebalancing, but it works as-is for pistols.
  "pistol":        { symbol: "A",  label: "Pistolet półautomatyczny",   confidence: "high" },
  // Confirmed by ear: internally consistent, and reads as a SILENCED weapon —
  // or as a quiet dart / thrown-weapon impact. So it is the suppressed-fire
  // tier (any weapon with a tłumik, whatever its caliber — see SILENCED_BANK),
  // and also the impact source for blowgun darts. .22 LR keeps it as its normal
  // report, being genuinely quiet; .38 SPL moved to `pistol`.
  "silenced":      { symbol: "U",  label: "Broń cicha / z tłumikiem",   confidence: "high" },
  "pistol-heavy":  { symbol: "B",  label: "Ciężki kaliber (rewolwer?)", confidence: "audition" },
  "ar":            { symbol: "G",  label: "Karabin AR (M4/M16)",        confidence: "high" },
  "fnfal":         { symbol: "H",  label: "FN FAL",                     confidence: "high" },
  "ak":            { symbol: "D",  label: "Karabin AK",                 confidence: "medium" },
  // Confirmed by ear: "big boom in 2 flavors" — a large-bore rifle report with
  // two usable takes. Suits the bolt-action hunting tier (.30-06).
  "rifle-high":    { symbol: "E",  label: "Karabin dużego kalibru",     confidence: "high" },
  "bolt":          { symbol: "RIFLE", label: "Przeładowanie kb powtarzalnego", confidence: "high" },
  // Confirmed good by ear.
  "shotgun":       { symbol: "R",  label: "Strzelba pompka",            confidence: "high" },
  // `shotIsSustained`: this bank's "shot" is ~1.9 s of continuous minigun fire,
  // not a single report, so it serves as its own burst. Without this flag the
  // burst-mode lookup would find no `burst` slot and fall through to a generic
  // tier. See bankFireFile().
  "minigun":       { symbol: "L",  label: "Minigun", confidence: "high", shotIsSustained: true },
  // Fire + impacts read as a slow-firing heavy MG and are kept. Its RELOAD is
  // an electric/energy weapon action and is blacklisted in
  // build_sound_banks.ps1 — the same reload-vs-fire mismatch that got `@`
  // mis-filed as an energy weapon to begin with. .50 BMG borrows a reload.
  "hmg":           { symbol: "@",  label: "Ciężki karabin maszynowy",   confidence: "audition" },
  "launcher":      { symbol: "N",  label: "Wyrzutnia / moździerz",      confidence: "high" },
  "crossbow":      { symbol: "Z",  label: "Kusza",                      confidence: "high" },
  "flamethrower":  { symbol: "I/!",label: "Miotacz ognia",              confidence: "high" },
  // Fire sound only — symbol O's "hit" is an explosion/car-crash and is
  // blacklisted in build_sound_banks.ps1 rather than banked.
  "thrown":        { symbol: "O",  label: "Broń rzucana",               confidence: "medium" },
  "thrown-net":    { symbol: "WF4",label: "Bolas / bumerang",           confidence: "medium" },
  "explosion":     { symbol: "P",  label: "Wybuch duży",                confidence: "medium" },
  "explosion-emp": { symbol: "Q",  label: "Wybuch EMP",                 confidence: "medium" },
  "flyby":         { symbol: "WFN",label: "Przelot rakiety",            confidence: "medium" },

  // Impacts only, and the single most useful impact set in the library.
  // Symbol `#`'s fire/click/reload are an EMP/pulse rifle, but its 16 hit
  // recordings are a different weapon — identified by ear as a LIGHT or
  // INTERMEDIATE rifle (5.56 / 7.62x39 class), with the single-vs-burst split
  // confirmed accurate. Critically it is the ONLY ballistic set with BOTH
  // single and burst hits across all four materials, so it is what gives the
  // rifle calibers real burst impacts.
  "impact-intermediate": { symbol: "#", label: "Trafienia — karabin pośredni", confidence: "high" },

  // The library's only genuine SMG reload (UZI.wav). Not reachable from any
  // caliber: the SMGs that would want it are 9mm/45acp and therefore take the
  // pistol bank. Available for a WEAPON_BANKS override per actual SMG.
  "uzi":           { symbol: "UZI", label: "Przeładowanie UZI",         confidence: "high" },

  // ---- SYNTHESIZED banks (dev/audio/build_synth_bursts.ps1) ----
  // NOT decoded Fallout 2 recordings. Each is that weapon's own single-shot
  // report repeated at its real cyclic rate, because the library contains no
  // SMG burst at all and nothing long enough for MS. Marked "synth" so they are
  // never mistaken for source material; replace them if real audio turns up.
  "smg-synth":     { symbol: "A→", label: "Seria PM (synteza)",         confidence: "synth" },
  "ar-synth":      { symbol: "G→", label: "Seria ciągła 5,56 (synteza)", confidence: "synth" },
  "fnfal-synth":   { symbol: "H→", label: "Seria ciągła 7,62 (synteza)", confidence: "synth" },
});

/* -------------------------------------------- */
/*  Caliber → bank assignment                     */
/* -------------------------------------------- */

/**
 * Per-caliber bank assignment.
 *
 * Shape:
 *   bank    — default bank for every slot
 *   modes   — per-fire-mode bank override, for when a caliber's automatic fire
 *             must come from a different prototype than its single shot (very
 *             common: pistol calibers fire single from a pistol but burst from
 *             an SMG, and the library has no prototype covering both)
 *   borrow  — per-slot fallback bank, consulted when `bank` has no recording in
 *             that slot at all. Several prototypes captured a fire sound and
 *             nothing else (symbols B, E, G have no hits; B and E have no
 *             reload), so without this those calibers would drop to a generic
 *             placeholder for everything but the shot itself. Keys are slot
 *             names: `impact`, `reload`, `click`.
 *
 * Fire-mode roster per caliber is documented in `caliber-vfx.mjs`; only modes
 * a caliber actually has need an entry, but extra ones are harmless.
 */
export const CALIBER_BANKS = Object.freeze({
  /* ── Pistoletowa ─────────────────────────────────────────────── */

  // Weakest tier. `U` is "a short soft thump" — the only prototype quiet
  // enough to read as rimfire rather than a service pistol.
  // Genuinely quiet cartridge, so the silenced bank is its normal report too.
  "22lr":    { bank: "silenced" },

  // .38 SPL is a revolver round and no revolver prototype exists in the library
  // (`A`'s slide-rack reload confirms semi-auto; B and G were both checked and
  // rejected as magnums). It takes `pistol` — a correct-but-semi-auto report
  // beats the suppressed tier, which would make an unsuppressed revolver quiet.
  "38spl":   { bank: "pistol" },

  // The reference service-pistol sound, confirmed good by ear.
  //
  // Automatic modes (KS/DS/OZ — Empepiątka, UZI, Tommy gun) have NO bank: there
  // is no SMG burst anywhere in the library. Symbol `#` looked like one per
  // LISTENING_NOTES.md, but on listening it is an EMP/pulse rifle (see header),
  // so it was dissolved. Those modes fall through to the generic burst tiers,
  // which is the honest answer until real SMG audio is sourced.
  "9mm":     { bank: "pistol", modes: { ks: "smg-synth", ds: "smg-synth", oz: "smg-synth" } },

  // Same prototype as 9mm: the library has no separate .45-weight pistol.
  // Distinguished by tracer visuals, not audio.
  "45acp":   { bank: "pistol", modes: { ks: "smg-synth", ds: "smg-synth", oz: "smg-synth" } },

  // `B` is "a large caliber rifle, revolver or shotgun" / "a loud explosion,
  // like a loud gunshot" — the heaviest handgun-plausible report available,
  // which suits a .44 Magnum. Fire-only prototype: it has a click but no
  // reload and no hits, so both borrow the semi-auto pistol. Imperfect — .44
  // Magnum is a revolver and no cylinder-spin reload exists anywhere in the
  // library (b4_07/b4_08 were both checked and are semi-auto actions).
  "44mag":   { bank: "pistol-heavy", borrow: { impact: "pistol", reload: "pistol" } },

  /* ── Karabinowa ──────────────────────────────────────────────── */

  // `G`'s M4/M16 charging-handle reload makes it unambiguously the AR, i.e.
  // 5.56. It has no burst or impact recording: burst borrows the FN FAL (the
  // closest rifle-burst in the library), impacts borrow the AK.
  //
  // MS is deliberately NOT mapped: the minigun sound is reserved exclusively for
  // the Minigun itself (author's call — it is too distinctive to share), so MS
  // falls through to the generic burst_crushing tier.
  "556":     { bank: "ar", modes: { ks: "fnfal", ds: "fnfal", oz: "fnfal", ms: "ar-synth" },
               borrow: { impact: "impact-intermediate" } },

  // `D` reads as an intermediate-caliber rifle with a mag-fed reload — the AK.
  // Only P and DS exist for this caliber; DS borrows the FN FAL burst.
  "76239ak": { bank: "ak", modes: { ds: "fnfal", oz: "fnfal", ms: "fnfal-synth" },
               borrow: { impact: "impact-intermediate" } },

  // The FN FAL is a 7.62 battle rifle and the one prototype with BOTH a
  // confirmed single and a confirmed burst recording, so P/KS/DS/OZ all resolve
  // within its own bank. MS uses the generic crushing tier — see the note on
  // 556 for why it does not borrow the minigun.
  "762":     { bank: "fnfal", modes: { ms: "fnfal-synth" },
               borrow: { impact: "impact-intermediate" } },

  // Bolt-action hunting tier (Lewar M95, Field 03, M1). `E` is "a single high
  // caliber shot" and nothing else — no reload, no click, no hits. Reload comes
  // from the `bolt` bank (RIFLE.wav, "loading of a single round into a chambered
  // rifle"), which is precisely this weapon class.
  "3006":    { bank: "rifle-high",
               borrow: { impact: "impact-intermediate", reload: "bolt", click: "ak" } },

  // Anti-materiel. `@`'s fire recordings are "a single, powerful shot from a
  // high caliber weapon" plus "four low fire rate shots" — a heavy MG, which
  // is what Browning / Light Fifty are. See the header note: this contradicts
  // DECODED_SOUND_MAP.md's "energy weapon" summary on purpose.
  //
  // `@` recorded metal hits only, so flesh/stone/wood impacts borrow the
  // minigun — the other heavy automatic weapon, and the closest match in
  // weight. Metal still comes from `@` itself, which is the authentic heavy
  // ricochet of the two.
  // Reload borrows the bolt-action single-round load: `@`'s own reload is an
  // electric/energy action (confirmed by ear) and is blacklisted. Light Fifty
  // is an anti-materiel rifle, so a deliberate single-round chambering reads
  // right for it; Browning being belt-fed is the weaker half of that argument.
  "50bmg":   { bank: "hmg", borrow: { impact: "minigun", reload: "bolt" } },

  /* ── Śrutowa ─────────────────────────────────────────────────── */

  // `R` is confirmed at both ends (pump-action retraction + shell insert).
  // Its "burst" is a genuine 3-shell string, so KS maps to it usefully.
  "12ga_s":  { bank: "shotgun" },
  "12ga_b":  { bank: "shotgun" },

  /* ── Granatnikowa / Ppanc ────────────────────────────────────── */

  // `N` is "insertion of a rocket into a tube, or a mortar" — it covers the
  // launcher family: Bazooka (60 mm) and Moździerz (120 mm).
  "60mm":    { bank: "launcher" },
  "120mm":   { bank: "launcher" },

  // 40 mm (MGL1S, Thumper) is deliberately NOT here. It keeps the dedicated
  // `shot_grenade.ogg` from SOUND_PATHS: symbol N's report is a rocket leaving
  // a tube, far too big for a 40 mm grenade launcher, whose signature is a
  // hollow thump. This is a real assigned sound, not a gap — the audit script
  // lists it as "no bank" only because the coverage is outside the bank system.

  /* ── Miotana ─────────────────────────────────────────────────── */

  // `Z`'s ratchet-and-pulley reload is a crossbow cocking mechanism.
  "belt":    { bank: "crossbow" },

  // Blowgun darts and syringe rounds. Symbol U was described as reading like a
  // "silent dart / thrown weapon impact", which is literally this.
  "igla":       { bank: "silenced" },
  "strzykawka": { bank: "silenced" },

  // Bows and slings keep their existing generic ranged sounds — no prototype in
  // the library reads as a bowstring.
});

/**
 * Per-weapon bank override, keyed by `item.system.identifier`.
 *
 * Only for signature weapons that must not sound like their caliber's default.
 * Most weapons should NOT appear here. Mirrors `WEAPON_VFX`'s role for visuals.
 */
export const WEAPON_BANKS = Object.freeze({
  // 7.62 MS, but must not share The Pig's generic burst — this is the one
  // prototype in the library confirmed "100% minigun, beyond all doubt".
  "minigun": { bank: "minigun" },

  // Miotacz ognia — not a caliber weapon at all (its ammo is "Paliwo", which is
  // not in AMMO_CALIBERS), so it can only be reached by identifier.
  "miotacz-ognia": { bank: "flamethrower" },

  // LAW — the one weapon in BronPalna.md whose ammunition is "Rakieta", a type
  // that has no AMMO_CALIBERS entry, so the item carries NO ammoType at all and
  // no caliber lookup can reach it. Without this it fell through to the generic
  // SHOT_ROCKET tier while its sibling Bazooka (60 mm) used the launcher bank —
  // two disposable rocket launchers that sounded nothing alike.
  "law": { bank: "launcher" },
});

/* -------------------------------------------- */
/*  Impact material inference                     */
/* -------------------------------------------- */

/**
 * dnd5e creature type → impact material letter.
 *
 * The letters' real meanings are an educated guess (see DECODED_SOUND_MAP.md),
 * so this table is where to tune if flesh/metal/stone/wood turn out to be
 * ordered differently than assumed.
 *
 * An actor can override its material outright with
 * `flags.neuroshima-2026-overrides.impactMaterial` = "F" | "M" | "S" | "W",
 * which is the escape hatch for cases creature type can't express — a
 * power-armoured human should ring like metal, a scrap golem like stone.
 */
export const MATERIAL_BY_CREATURE_TYPE = Object.freeze({
  humanoid:    "F",
  beast:       "F",
  monstrosity: "F",
  giant:       "F",
  aberration:  "F",
  undead:      "F",
  ooze:        "F",
  fiend:       "F",
  celestial:   "F",
  dragon:      "F",
  fey:         "F",
  construct:   "M",   // roboty, maszyny, pojazdy
  elemental:   "S",   // kamień / beton / bezpostaciowe
  plant:       "W",   // drewno / roślinność
});

/** Material used when nothing better can be determined. */
export const DEFAULT_IMPACT_MATERIAL = "F";

/** Valid material letters, in audition-panel display order. */
export const IMPACT_MATERIALS = Object.freeze(["F", "M", "S", "W"]);

/** Human-facing material names for the audition panel. */
export const MATERIAL_LABELS = Object.freeze({
  F: "Ciało (flesh)",
  M: "Metal",
  S: "Kamień / beton",
  W: "Drewno",
});

/* -------------------------------------------- */
/*  Resolution                                    */
/* -------------------------------------------- */

/** Fire modes that should use a burst slot rather than `shot`. */
const BURST_MODES = new Set(["ks", "ds", "ms", "oz"]);

/**
 * Which fire modes each caliber can actually be used in, per the official
 * roster in `Tabele/Bronie/BronPalna.md` (reproduced in caliber-vfx.mjs's
 * header). Documentation only — nothing here blocks a roll, and house rules may
 * add permutations.
 *
 * Its real job is telling "this caliber has no sound for a mode it can fire" —
 * a genuine gap — apart from "this caliber cannot fire that mode at all", which
 * is not. The audition panel greys out the latter so the two stop looking alike.
 *
 * OZ (ogień zaporowy) is not part of the printed roster: it is granted by weapon
 * properties rather than by caliber, so it is listed wherever automatic fire is
 * plausible.
 */
export const CALIBER_FIRE_MODES = Object.freeze({
  "22lr":    ["p"],
  "38spl":   ["p"],
  "9mm":     ["p", "ks", "ds", "oz"],
  "45acp":   ["p", "ks", "ds", "oz"],
  "44mag":   ["p"],
  "556":     ["p", "ks", "ds", "ms", "oz"],
  "76239ak": ["p", "ds", "oz"],
  "762":     ["p", "ks", "ds", "ms", "oz"],
  "3006":    ["p"],
  "50bmg":   ["p", "ds", "ms", "oz"],
  "12ga_s":  ["p"],
  "12ga_b":  ["p"],
  "40mm":    ["p"],
  "60mm":    ["p"],
  "120mm":   ["p"],
  "strzala": ["p"],
  "belt":    ["p"],
  "kulka":   ["p"],
  "igla":    ["p"],
  "strzykawka": ["p"],
});

/**
 * True when `caliberId` can be fired in `fireMode` at all.
 * Unknown calibers return true — absence of a roster entry is not a rule.
 */
export function caliberHasMode(caliberId, fireMode) {
  const modes = CALIBER_FIRE_MODES[caliberId];
  return modes ? modes.includes(fireMode) : true;
}

/**
 * Bank used for any suppressed weapon, whatever its caliber.
 * Symbol `U` was confirmed by ear as a silenced weapon rather than merely a
 * weak one, which makes it the suppressed tier rather than a cartridge tier.
 */
export const SILENCED_BANK = "silenced";

/**
 * Resolve which bank a weapon/caliber combination should draw from for a
 * given fire mode. Weapon identifier wins over caliber, matching the
 * weapon-then-caliber cascade used for tracer visuals.
 *
 * @param {object} [opts]
 * @param {string|null} [opts.weaponId]  item.system.identifier
 * @param {string|null} [opts.caliberId] getMag(item)?.ammoType
 * @param {string}      [opts.fireMode]  "p" | "ks" | "ds" | "ms" | "oz"
 * @returns {string|null} Bank name, or null when nothing is assigned.
 */
export function resolveBank({ weaponId, caliberId, fireMode = "p" } = {}) {
  const weaponEntry = weaponId ? WEAPON_BANKS[weaponId] : null;
  const caliberEntry = caliberId ? CALIBER_BANKS[caliberId] : null;
  const entry = weaponEntry ?? caliberEntry;
  if (!entry) return null;
  return entry.modes?.[fireMode] ?? entry.bank ?? null;
}

/**
 * Build the file path for one bank slot, choosing a random alternate take.
 *
 * Returns null when the bank or slot doesn't exist, which is the signal for
 * the caller to fall back to a generic `WeaponSound` tier — a bank is always
 * an enhancement over the generic behaviour, never a prerequisite for it.
 *
 * @param {string|null} bank  Bank name.
 * @param {string} slot       "shot" | "burst" | "reload" | "click" | "impact" | "impact-F" | …
 * @returns {string|null}     Path relative to the FVTT data root.
 */
export function bankFile(bank, slot) {
  if (!bank) return null;
  const slots = BANK_MANIFEST[bank];
  const count = slots?.[slot];
  if (!count) return null;
  const take = 1 + Math.floor(Math.random() * count);
  return `${BANKS_BASE}/${bank}/${slot}_v${take}.ogg`;
}

/**
 * Resolve a fire sound straight to a file path.
 *
 * A burst mode NEVER degrades to the bank's single `shot`. One report standing
 * in for a 3-to-200-round burst is worse than the generic burst tier, which was
 * authored for exactly that job — so when a bank has no burst recording this
 * returns null and the caller falls back. The sole exception is a bank flagged
 * `shotIsSustained` (the minigun), whose "shot" is already several seconds of
 * continuous fire and therefore IS its burst.
 *
 * @param {object} [opts]  Same as resolveBank().
 * @returns {string|null}
 */
export function bankFireFile({ weaponId, caliberId, fireMode = "p", silenced = false } = {}) {
  // A suppressor changes the report far more than the cartridge does, so it
  // overrides the caliber's bank outright for the single shot. Automatic fire
  // has no suppressed recording, so it keeps the weapon's normal bank.
  if (silenced && !BURST_MODES.has(fireMode) && BANK_MANIFEST[SILENCED_BANK]) {
    return bankFile(SILENCED_BANK, "shot");
  }

  const bank = resolveBank({ weaponId, caliberId, fireMode });
  if (!bank) return null;

  if (!BURST_MODES.has(fireMode)) return bankFile(bank, "shot");

  // Mode-specific burst first: a 3-round KS and a 200-round MS are different
  // events, and the synthesized banks provide one file per mode. Falls back to
  // the bank's single generic `burst` (the FN FAL and shotgun recordings cover
  // every mode with one take), then to a sustained `shot` for the minigun.
  return bankFile(bank, `burst-${fireMode}`)
      ?? bankFile(bank, "burst")
      ?? (BANK_INFO[bank]?.shotIsSustained ? bankFile(bank, "shot") : null);
}

/**
 * The registry entry backing a weapon/caliber, weapon identifier winning.
 * @returns {object|null}
 */
function _entryFor(weaponId, caliberId) {
  return (weaponId ? WEAPON_BANKS[weaponId] : null)
      ?? (caliberId ? CALIBER_BANKS[caliberId] : null)
      ?? null;
}

/**
 * Resolve a non-fire slot (reload / click) to a file path.
 *
 * Uses the caliber's default bank, ignoring per-mode overrides — you reload
 * the gun in your hands, not the SMG its burst audio was borrowed from. Falls
 * back to the `borrow` bank for that slot when the weapon's own prototype never
 * recorded one.
 *
 * @param {string} slot  "reload" | "click"
 * @param {object} [opts]
 * @param {string|null} [opts.weaponId]
 * @param {string|null} [opts.caliberId]
 * @returns {string|null}
 */
export function bankUtilityFile(slot, { weaponId, caliberId } = {}) {
  // Deliberately NOT suppressor-aware: a silencer changes the report, not the
  // magazine change or the dry click.
  const bank = resolveBank({ weaponId, caliberId, fireMode: "p" });
  const own = bankFile(bank, slot);
  if (own) return own;

  const borrowed = _entryFor(weaponId, caliberId)?.borrow?.[slot];
  return borrowed ? bankFile(borrowed, slot) : null;
}

/**
 * Resolve an impact sound for a hit on a given material.
 *
 * Single-round and burst impacts are separate slots, and the fallback between
 * them is deliberately ONE-WAY.
 *
 * The Fallout 2 burst hit recordings are multi-hit strings — several rounds
 * landing in sequence. Playing one for a single shot is audibly wrong; an
 * earlier revision merged the two as alternate takes of one slot and the result
 * was a "burst-burst-single-single" cycle across each material's four takes.
 * So a single shot NEVER reaches for a burst recording.
 *
 * The reverse fallback is allowed: only symbols `#` and `@` recorded burst hits
 * at all, so without it a burst from any other weapon would land silently. One
 * impact standing in for a burst is a much smaller error than a whole string
 * standing in for one round.
 *
 * Resolution walks the prefix list (burst first for burst modes, then single),
 * and within each prefix: own bank's material → borrowed bank's material. Then
 * material-less `impact` (launchers), then the borrowed bank's default material.
 *
 * @param {object} [opts]
 * @param {string|null} [opts.weaponId]
 * @param {string|null} [opts.caliberId]
 * @param {string} [opts.material]  "F" | "M" | "S" | "W"
 * @param {string} [opts.fireMode]  Picks single vs burst impact family.
 * @returns {string|null}
 */
export function bankImpactFile({
  weaponId, caliberId, material = DEFAULT_IMPACT_MATERIAL, fireMode = "p",
} = {}) {
  const bank = resolveBank({ weaponId, caliberId, fireMode: "p" });
  const borrowed = _entryFor(weaponId, caliberId)?.borrow?.impact;

  // Burst prefers a burst recording but accepts a single; single is single-only.
  const prefixes = BURST_MODES.has(fireMode) ? ["impact-burst", "impact"] : ["impact"];

  for (const prefix of prefixes) {
    const own = bankFile(bank, `${prefix}-${material}`);
    if (own) return own;
    const lent = borrowed ? bankFile(borrowed, `${prefix}-${material}`) : null;
    if (lent) return lent;
  }

  // Material-less impact (launchers, thrown), then the borrow bank's default.
  return bankFile(bank, "impact")
      ?? (borrowed
            ? bankFile(borrowed, `impact-${DEFAULT_IMPACT_MATERIAL}`) ?? bankFile(borrowed, "impact")
            : null);
}

/**
 * Determine which impact material a target should sound like.
 *
 * @param {Actor|null} actor  The actor being hit.
 * @returns {string} One of IMPACT_MATERIALS.
 */
export function impactMaterialFor(actor) {
  const override = actor?.getFlag?.("neuroshima-2026-overrides", "impactMaterial");
  if (override && IMPACT_MATERIALS.includes(override)) return override;

  // Player characters are always flesh — `details.type` is an NPC-only field.
  const rawType = actor?.system?.details?.type?.value;
  if (!rawType) return DEFAULT_IMPACT_MATERIAL;

  return MATERIAL_BY_CREATURE_TYPE[rawType] ?? DEFAULT_IMPACT_MATERIAL;
}

/** All bank names that have at least one file, for the audition panel. */
export function listBanks() {
  return Object.keys(BANK_MANIFEST).sort();
}

/** Slots present in a bank, in a stable display order. */
export function listSlots(bank) {
  const slots = BANK_MANIFEST[bank];
  if (!slots) return [];
  const order = ["shot", "burst", "reload", "click", "ambient", "impact",
                 "impact-F", "impact-M", "impact-S", "impact-W",
                 "impact-burst", "impact-burst-F", "impact-burst-M",
                 "impact-burst-S", "impact-burst-W"];
  return Object.keys(slots).sort((a, b) => {
    const ia = order.indexOf(a), ib = order.indexOf(b);
    return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
  });
}

/** Variant count for one slot, or 0 when the slot doesn't exist. */
export function slotTakes(bank, slot) {
  return BANK_MANIFEST[bank]?.[slot] ?? 0;
}

/** Explicit path to one specific take, for audition (no randomization). */
export function bankFileTake(bank, slot, take) {
  if (!slotTakes(bank, slot)) return null;
  return `${BANKS_BASE}/${bank}/${slot}_v${take}.ogg`;
}
