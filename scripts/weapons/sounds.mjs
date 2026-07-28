/**
 * Neuroshima 5e — Weapon sound effects.
 *
 * Plays weapon sound effects heard by all players on the same scene.
 * Socket-based: the acting player plays locally + emits to others on same scene.
 *
 * Sound files go in:
 *   modules/neuroshima-2026-overrides/sounds/firearms/
 *   modules/neuroshima-2026-overrides/sounds/ranged/
 *
 * Recommended format: OGG Vorbis, 44100 Hz mono, normalized to -18 LUFS / -12 dBFS peak.
 * Convert with: ffmpeg -i input.wav -af loudnorm=I=-18:LRA=11:TP=-1.5 -c:a libvorbis -q:a 5 output.ogg
 *
 * TODO (future): filter by distance and LOS before playing for remote clients.
 */

import { seqPlayAudio } from "./sequencer.mjs";
import { getCaliberSoundOverride } from "../config/caliber-vfx.mjs";
import { getWeaponSoundOverride } from "../config/weapon-vfx.mjs";
import {
  bankFireFile,
  bankUtilityFile,
  bankImpactFile,
  impactMaterialFor,
} from "../config/sound-banks.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const SOCKET_EVENT = `module.${MODULE_ID}`;
const SOUNDS_BASE = `modules/${MODULE_ID}/sounds`;

export function getDefaultVolume() {
  return game.settings.get(MODULE_ID, "weaponSoundVolume") ?? 0.5;
}

/* -------------------------------------------- */
/*  Sound key enum                                */
/* -------------------------------------------- */

/** Identifiers for each weapon sound event. Pass these to playWeaponSound(). */
export const WeaponSound = Object.freeze({
  /** Single shot — firearm (pistol / rifle / shotgun). */
  SHOT_FIREARM:     "shot_firearm",
  /** Single shot — firearm with silencer / suppressor. */
  SHOT_SILENCED:    "shot_silenced",
  /** Single shot — non-firearm ranged (bow / crossbow / sling). */
  SHOT_RANGED:      "shot_ranged",
  /** Short burst / Krótka seria (KS, 3 rounds). */
  BURST_SHORT:      "burst_short",
  /** Long burst / Długa seria (DS, 10-30 rounds). */
  BURST_LONG:       "burst_long",
  /** Crushing burst / Miażdżąca seria (MS, 50-200 rounds). */
  BURST_CRUSHING:   "burst_crushing",
  /** Suppressive fire / Ogień zaporowy (OZ, 6 rounds). */
  SUPPRESSIVE:      "suppressive",
  /** Weapon jam — metallic click of a jammed action. */
  JAM:              "jam",
  /** Dry-fire / empty magazine click — Klik! */
  EMPTY_CLICK:      "empty_click",
  /** Magazine swap + bolt cycle — Wymiana magazynka i zamek. */
  RELOAD_MAG:       "reload_mag",
  /** Load one round or bolt cycle — Doładuj 1 nabój / Przeładowanie. */
  RELOAD_SINGLE:    "reload_single",
  /** Reload of non-firearm ranged weapon (bow, crossbow, sling). */
  RELOAD_OTHER:     "reload_other",
  /** Jam cleared — Usunięcie zacięcia. */
  UNJAM:            "unjam",
  /** Permanent weapon damage — Trwałe popsucie broni palnej. */
  WEAPON_BREAK:     "weapon_break",
  /** Cleaning weapon — Czyszczenie broni. */
  CLEAN_WEAPON:     "clean_weapon",
  /** Rocket launcher / bazooka shot — Strzał z wyrzutni rakiet. */
  SHOT_ROCKET:      "shot_rocket",
  /** Grenade launcher shot — Strzał z granatnika (MGL1S, Thumper). */
  SHOT_GRENADE:     "shot_grenade",
  /** Large explosion — wybuch wielki (Bazooka, LAW, Moździerz). */
  EXPLOSION_LARGE:  "explosion_large",
  /** Small explosion — wybuch mały (MGL1S, Thumper). */
  EXPLOSION_SMALL:  "explosion_small",
  /** Thrown explosive: flashbang detonation. */
  EXP_FLASHBANG:    "exp_flashbang",
  /** Thrown explosive: gas/smoke discharge. */
  EXP_GAS:          "exp_gas",
  /** Thrown explosive: molotov/fire burst. */
  EXP_MOLOTOV:      "exp_molotov",
  /** Thrown explosive: pipebomb-style blast. */
  EXP_PIPEBOMB:     "exp_pipebomb",
  /** Thrown explosive: generic heavy blast (frag/mines/C4/dynamite). */
  EXP_BLAST:        "exp_blast",
  /** Thrown explosive: short heavy blast (trimmed), used by remote charges and derived types. */
  EXP_BLAST_SHORT:  "exp_blast_short",
  /** Thrown explosive: remote detonator click (optional flavor). */
  EXP_DETONATOR:    "exp_detonator",
  /** Thrown explosive: mine arming clunk/beep (set, not detonate). */
  MINE_ARM:         "mine_arm",
    
    // --- MELEE WEAPONS ---
    /** Missing a melee attack (whoosh) */
    MELEE_MISS:       "melee_miss",
    /** Hitting with a blunt weapon */
    MELEE_HIT_BLUNT:  "melee_hit_blunt",
    /** Hitting with a slashing/piercing weapon */
    MELEE_HIT_SLASHING:"melee_hit_slashing",
    /** Critical/Heavy hit (15+ dmg) */
    MELEE_HIT_HEAVY:  "melee_hit_heavy",
    /** Massive hit (30+ dmg) */
    MELEE_HIT_MASSIVE:"melee_hit_massive",
    /** Piła spalinowa hit — chainsaw biting in, overrides the generic slashing tier. */
    MELEE_HIT_CHAINSAW:"melee_hit_chainsaw",
    /** Melee weapon degradation (Katana crack/chip) */
    MELEE_DEGRADE:    "melee_degrade",

    // --- SPALINOWA (combustion-engine weapons, e.g. Piła spalinowa) ---
    /** Engine pull-start / ignition. */
    ENGINE_START:      "engine_start",
    /** Engine shutdown. */
    ENGINE_STOP:       "engine_stop",
    /** Idle loop while the engine is running (see engine.mjs — persisted via Sequencer). */
    ENGINE_IDLE_LOOP:  "engine_idle_loop",

    // --- PROJECTILE IMPACT ---
    /** A round landing on a target. Bank-only: the generic tier has no file,
     *  so nothing plays unless the weapon's bank has an impact recording. */
    IMPACT:           "impact"
  });
  
  /* -------------------------------------------- */
  /*  Sound file paths                              */
  /* -------------------------------------------- */
  
  /**
   * Map each WeaponSound key to its OGG file path (relative to Foundry Data root).
   * Replace the placeholder filenames with real assets when audio is ready.
   * Missing files are silently ignored (no error thrown).
   */
  const SOUND_PATHS = Object.freeze({
    [WeaponSound.SHOT_FIREARM]:   `${SOUNDS_BASE}/firearms/shot_pistol.ogg`,
    [WeaponSound.SHOT_SILENCED]:  `${SOUNDS_BASE}/firearms/shot_silenced.ogg`,
    [WeaponSound.SHOT_RANGED]:    `${SOUNDS_BASE}/ranged/bow_shot.ogg`,
    [WeaponSound.BURST_SHORT]:    `${SOUNDS_BASE}/firearms/burst_short.ogg`,
    [WeaponSound.BURST_LONG]:     `${SOUNDS_BASE}/firearms/burst_long.ogg`,
    [WeaponSound.BURST_CRUSHING]: `${SOUNDS_BASE}/firearms/burst_crushing.ogg`,
    [WeaponSound.SUPPRESSIVE]:    `${SOUNDS_BASE}/firearms/suppressive.ogg`,
    [WeaponSound.JAM]:            `${SOUNDS_BASE}/firearms/jam.ogg`,
    [WeaponSound.EMPTY_CLICK]:    `${SOUNDS_BASE}/firearms/click_empty.ogg`,
    [WeaponSound.RELOAD_MAG]:     `${SOUNDS_BASE}/firearms/reload_mag.ogg`,
    [WeaponSound.RELOAD_SINGLE]:  `${SOUNDS_BASE}/firearms/reload_single.ogg`,
    [WeaponSound.RELOAD_OTHER]:   `${SOUNDS_BASE}/ranged/reload_other.ogg`,
    [WeaponSound.UNJAM]:          `${SOUNDS_BASE}/firearms/unjam.ogg`,
    [WeaponSound.WEAPON_BREAK]:   `${SOUNDS_BASE}/firearms/break_permanent.ogg`,
    [WeaponSound.CLEAN_WEAPON]:   `${SOUNDS_BASE}/firearms/clean_weapon.ogg`,
    [WeaponSound.SHOT_ROCKET]:    `${SOUNDS_BASE}/firearms/shot_rocket.ogg`,
    [WeaponSound.SHOT_GRENADE]:    `${SOUNDS_BASE}/firearms/shot_grenade.ogg`,
    [WeaponSound.EXPLOSION_LARGE]: `${SOUNDS_BASE}/firearms/explosion_large.ogg`,
    [WeaponSound.EXPLOSION_SMALL]: `${SOUNDS_BASE}/firearms/explosion_small.ogg`,
    [WeaponSound.EXP_FLASHBANG]:   `${SOUNDS_BASE}/explosives/flashbang.ogg`,
    [WeaponSound.EXP_GAS]:         `${SOUNDS_BASE}/explosives/gas_grenade.ogg`,
    [WeaponSound.EXP_MOLOTOV]:     `${SOUNDS_BASE}/explosives/molotov_fire.ogg`,
    [WeaponSound.EXP_PIPEBOMB]:    `${SOUNDS_BASE}/explosives/pipe_bomb.ogg`,
    [WeaponSound.EXP_BLAST]:       `${SOUNDS_BASE}/explosives/explosion.ogg`,
    [WeaponSound.EXP_BLAST_SHORT]: `${SOUNDS_BASE}/explosives/explosion_short.ogg`,
    [WeaponSound.EXP_DETONATOR]:   `${SOUNDS_BASE}/explosives/detonator_switch.ogg`,
    [WeaponSound.MINE_ARM]:        `${SOUNDS_BASE}/explosives/mine_arm_click.ogg`,
    
    // Melee maps (to be added)
    [WeaponSound.MELEE_MISS]:         `${SOUNDS_BASE}/melee/miss_whoosh.ogg`,
    [WeaponSound.MELEE_HIT_BLUNT]:    `${SOUNDS_BASE}/melee/hit_blunt.ogg`,
    [WeaponSound.MELEE_HIT_SLASHING]: `${SOUNDS_BASE}/melee/hit_slashing.ogg`,
    [WeaponSound.MELEE_HIT_HEAVY]:    `${SOUNDS_BASE}/melee/hit_heavy.ogg`,
    [WeaponSound.MELEE_HIT_MASSIVE]:  `${SOUNDS_BASE}/melee/hit_massive.ogg`,
    [WeaponSound.MELEE_HIT_CHAINSAW]: `${SOUNDS_BASE}/melee/hit_chainsaw.ogg`,
    [WeaponSound.MELEE_DEGRADE]:      `${SOUNDS_BASE}/melee/degrade_chip.ogg`,

    [WeaponSound.ENGINE_START]:       `${SOUNDS_BASE}/melee/engine_start.ogg`,
    [WeaponSound.ENGINE_STOP]:        `${SOUNDS_BASE}/melee/engine_stop.ogg`,
    [WeaponSound.ENGINE_IDLE_LOOP]:   `${SOUNDS_BASE}/melee/engine_idle_loop.ogg`,
  });

/* -------------------------------------------- */
/*  Public API                                    */
/* -------------------------------------------- */

/**
 * Register the socket listener and non-firearm ranged shot hook.
 * Must be called once from the `ready` hook (after game.socket is live).
 */
export function registerWeaponSounds() {
  // Scene-scoped socket listener: play sounds emitted by other clients.
  game.socket.on(SOCKET_EVENT, data => {
    if (data?.type !== "weaponSound") return;
    if (data.sceneId && canvas.scene?.id !== data.sceneId) return;
    _playLocal(data.soundKey, data.volume, data.src);
  });

  // Non-firearm ranged weapons: play shot sound on postRollAttack.
  // Firearms are handled directly in registerAttackReloadGuard (magazine.mjs).
  Hooks.on("dnd5e.postRollAttack", (rolls, { subject } = {}) => {
    const item = _getLiveItem(subject?.item);
    if (!item || item.type !== "weapon") return;
    if (_isFirearmItem(item)) return;           // handled separately
    if (!rolls?.length) return;                 // cancelled / no roll
      
      const attackType = subject?.attack?.type?.value || item.system?.attackType || "";
      
      // Ranged shot
      if (attackType === "ranged") {
        playWeaponSound(WeaponSound.SHOT_RANGED);
      }
      
      // Melee Miss check
      if (attackType === "melee") {
        // If there is exactly one target, we can definitively check AC
        if (game.user.targets.size === 1) {
          const target = game.user.targets.first();
          const targetAc = target?.actor?.system?.attributes?.ac?.value;
          const rollTotal = rolls[0].total; // Total after modifiers
          
          if (targetAc && rollTotal < targetAc) {
             playWeaponSound(WeaponSound.MELEE_MISS);
          }
        }
      }
    });
    
    // Melee Hit + Explosion sounds
    Hooks.on("dnd5e.rollDamage", (rolls, { subject } = {}) => {
      const item = _getLiveItem(subject?.item);
      if (!item || item.type !== "weapon") return;
      if (!rolls?.length) return;

      // Explosion sounds (Bazooka, LAW, Moździerz, MGL1S, Thumper) — failsafe type+property check
      const explosionKey = _getExplosionSoundKey(item);
      if (explosionKey) {
        playWeaponSound(explosionKey);
        return;
      }

      if (_isFirearmItem(item)) return;  // other firearms handled in rollAttack

      // subject?.attack?.type?.value may be empty if DataModel getter hasn't run — fallback to item
      const attackType = subject?.attack?.type?.value || item.system?.attackType || "";
      if (attackType === "melee") {
        // Piła spalinowa: dedicated "chainsaw biting in" sound, regardless of damage tier —
        // the generic slashing bucket doesn't say "chainsaw", and the tiers below aren't
        // meaningful for it.
        if (item.system?.identifier === "pila-spalinowa") {
          playWeaponSound(WeaponSound.MELEE_HIT_CHAINSAW);
          return;
        }

        const dmgTotal = rolls.reduce((acc, r) => acc + r.total, 0);
        const dmgType = rolls[0]?.options?.type ?? "bludgeoning"; // heurystyka

        // Wybierz dźwięk zależnie od obrażeń (potężne hity vs zwykłe)
        if (dmgTotal >= 30) {
          playWeaponSound(WeaponSound.MELEE_HIT_MASSIVE);
        } else if (dmgTotal >= 15) {
          playWeaponSound(WeaponSound.MELEE_HIT_HEAVY);
        } else {
          // Zwykłe uderzenie - obuch czy cięte/kłute?
          if (dmgType === "bludgeoning" || dmgType === "obuchowe") {
             playWeaponSound(WeaponSound.MELEE_HIT_BLUNT);
          } else {
             playWeaponSound(WeaponSound.MELEE_HIT_SLASHING);
          }
        }
      }
  });

  console.log("Neuroshima 5e | Weapon sounds registered");
}

/**
 * Play a weapon sound, heard by all players on the same scene.
 * The calling client hears it immediately; others receive it via socket.
 *
 * @param {string} soundKey  One of WeaponSound.*
 * @param {object} [opts]
 * @param {number} [opts.volume]  0–1 volume level (defaults to setting)
 * @param {Actor|TokenDocument|Token|null} [opts.token]  Origin for positional audio.
 * @param {string} [opts.src]  Explicit file path, overriding the SOUND_PATHS
 *   lookup. Used by the bank layer (sound-banks.mjs), which resolves a concrete
 *   per-weapon file — and a random alternate take — that no static enum entry
 *   could name. `soundKey` is still required and still meaningful: it selects
 *   the hearing radius in sequencer.mjs's SOUND_RADIUS table.
 */
/**
 * Resolve a WeaponSound key to its file path, for callers that need the raw
 * path rather than one-shot playback (e.g. engine.mjs building a persisted,
 * looping Sequencer sound).
 *
 * @param {string} soundKey  One of WeaponSound.*
 * @returns {string|undefined}
 */
export function getWeaponSoundPath(soundKey) {
  return SOUND_PATHS[soundKey];
}

export function playWeaponSound(soundKey, { volume, token, src: srcOverride } = {}) {
  const src = srcOverride ?? SOUND_PATHS[soundKey];
  if (!src) return;
  const vol = Math.pow(volume ?? getDefaultVolume(), 2);
  if (seqPlayAudio(src, vol, { soundKey, token })) return;
  // Legacy fallback: play locally + broadcast via socket.
  foundry.audio.AudioHelper.play({ src, volume: vol, loop: false }).catch(() => {});
  game.socket.emit(SOCKET_EVENT, {
    type: "weaponSound",
    soundKey,
    // The resolved path must travel with the event. Remote clients cannot
    // re-derive it: SOUND_PATHS[soundKey] would give them the generic tier
    // instead of the bank file, and even a matching bank would re-randomize
    // to a different take, so each client would hear a different shot.
    src: srcOverride ?? null,
    sceneId: canvas.scene?.id ?? null,
    volume: volume,
  });
}

/* -------------------------------------------- */
/*  Bank-aware playback (see sound-banks.mjs)     */
/* -------------------------------------------- */

/**
 * Play the single-shot (P) sound for a weapon, preferring its sound bank.
 *
 * Falls back to the generic tier resolved by getShotSoundKey() when the
 * weapon's caliber has no bank assigned, or its bank has no `shot` recording.
 *
 * @param {Item5e|null} item
 * @param {object} [opts]
 * @param {string|null} [opts.caliberId]
 * @param {Actor|TokenDocument|Token|null} [opts.token]
 */
export function playShotSound(item, { caliberId, token } = {}) {
  const key = getShotSoundKey(item, { caliberId });
  const src = bankFireFile({
    weaponId: item?.system?.identifier,
    caliberId,
    fireMode: "p",
    // A suppressor overrides the caliber's bank entirely — see SILENCED_BANK.
    silenced: _isSilenced(item),
  });
  playWeaponSound(key, { src, token });
}

/**
 * Play the burst sound for a weapon in a given fire mode, preferring its bank.
 *
 * @param {Item5e|null} item
 * @param {string} fireMode  "ks" | "ds" | "ms" | "oz"
 * @param {object} [opts]
 * @param {string|null} [opts.caliberId]
 * @param {Actor|TokenDocument|Token|null} [opts.token]
 */
export function playBurstSound(item, fireMode, { caliberId, token } = {}) {
  const key = getBurstSoundKey(item, fireMode, { caliberId });
  const src = bankFireFile({
    weaponId: item?.system?.identifier,
    caliberId,
    fireMode,
  });
  playWeaponSound(key, { src, token });
}

/**
 * Play a reload or dry-fire-click sound, preferring the weapon's bank.
 *
 * @param {string} slot  "reload" | "click"
 * @param {Item5e|null} item
 * @param {string} fallbackKey  WeaponSound.* used when the bank has no such slot.
 * @param {object} [opts]
 * @param {string|null} [opts.caliberId]
 * @param {Actor|TokenDocument|Token|null} [opts.token]
 */
export function playUtilitySound(slot, item, fallbackKey, { caliberId, token } = {}) {
  const src = bankUtilityFile(slot, {
    weaponId: item?.system?.identifier,
    caliberId,
  });
  playWeaponSound(fallbackKey, { src, token });
}

/**
 * Play the impact sound for a round landing on a target.
 *
 * The material is inferred from the target actor (creature type, or an explicit
 * `flags.neuroshima-2026-overrides.impactMaterial` override) — see
 * sound-banks.mjs. Silent when the firing weapon's bank has no impact
 * recording, which is the common case for fire-only prototypes without an
 * `impact:` delegate.
 *
 * @param {Item5e|null} item          The weapon that fired.
 * @param {Actor|null} targetActor    The actor being hit.
 * @param {object} [opts]
 * @param {string|null} [opts.caliberId]
 * @param {string} [opts.fireMode]  "p" for a single round, or a burst mode.
 *   Selects the single vs burst impact recording — the burst ones are multi-hit
 *   strings and are wrong for a single shot. Defaults to "p".
 * @param {Actor|TokenDocument|Token|null} [opts.token]  Impact origin (the TARGET,
 *   not the shooter — the sound happens where the round lands).
 */
export function playImpactSound(item, targetActor, { caliberId, fireMode = "p", token } = {}) {
  const src = bankImpactFile({
    weaponId: item?.system?.identifier,
    caliberId,
    material: impactMaterialFor(targetActor),
    fireMode,
  });
  if (!src) return;
  playWeaponSound(WeaponSound.IMPACT, { src, token: token ?? targetActor });
}

/**
 * Play the appropriate explosion sound for a weapon, if any.
 * Called by ammo.mjs after a damage roll via the caliber-damage path
 * (which bypasses Activity.rollDamage and therefore dnd5e.rollDamage hook).
 *
 * @param {Item5e} item  The weapon that was fired.
 */
export function playExplosionSoundForItem(item) {
  const key = _getExplosionSoundKey(_getLiveItem(item));
  if (key) playWeaponSound(key);
}

/**
 * Play thrown-explosive SFX by consumable subtype (grenade-*).
 *
 * @param {string} subtype
 */
export function playExplosiveSoundForSubtype(subtype) {
  if (!subtype) return;
  const key = _getThrownExplosiveSoundKey(subtype);
  if (key) playWeaponSound(key);
}

/**
 * Derive the correct single-shot (P) sound key from a weapon item.
 * Checks the weapon-specific and caliber-specific overrides first (see
 * weapon-vfx.mjs / caliber-vfx.mjs) — this lookup runs BEFORE the firearm
 * check below, not nested inside it, so calibers on non-"palna"-typed items
 * (e.g. Moździerz, type "specjalna") still get consulted rather than being
 * silently skipped. Falls back to silencer/rocket/grenade/ranged detection
 * when no override exists.
 *
 * @param {Item5e|null} item
 * @param {object} [opts]
 * @param {string|null} [opts.caliberId]  getMag(item)?.ammoType, if known
 * @returns {string}  WeaponSound.SHOT_FIREARM | SHOT_SILENCED | SHOT_RANGED | ...
 */
export function getShotSoundKey(item, { caliberId } = {}) {
  const weaponOverride = getWeaponSoundOverride(item?.system?.identifier, "p");
  if (weaponOverride) return weaponOverride;
  const caliberOverride = getCaliberSoundOverride(caliberId, "p");
  if (caliberOverride) return caliberOverride;

  if (_isFirearmItem(item)) {
    if (_isRocketLauncher(item)) return WeaponSound.SHOT_ROCKET;
    if (_isGrenadeLauncher(item)) return WeaponSound.SHOT_GRENADE;
    return _isSilenced(item) ? WeaponSound.SHOT_SILENCED : WeaponSound.SHOT_FIREARM;
  }
  return WeaponSound.SHOT_RANGED;
}

/**
 * Derive the correct burst-mode sound key from a weapon item. Same
 * weapon-then-caliber-then-default priority as getShotSoundKey; see that
 * function's doc comment for why the override check must not be nested
 * inside a firearm-type gate.
 *
 * @param {Item5e|null} item
 * @param {string} fireMode  "ks" | "ds" | "ms" | "oz"
 * @param {object} [opts]
 * @param {string|null} [opts.caliberId]  getMag(item)?.ammoType, if known
 * @returns {string}  WeaponSound.BURST_SHORT | BURST_LONG | BURST_CRUSHING | SUPPRESSIVE
 */
export function getBurstSoundKey(item, fireMode, { caliberId } = {}) {
  const weaponOverride = getWeaponSoundOverride(item?.system?.identifier, fireMode);
  if (weaponOverride) return weaponOverride;
  const caliberOverride = getCaliberSoundOverride(caliberId, fireMode);
  if (caliberOverride) return caliberOverride;

  switch (fireMode) {
    case "ks": return WeaponSound.BURST_SHORT;
    case "ds": return WeaponSound.BURST_LONG;
    case "ms": return WeaponSound.BURST_CRUSHING;
    case "oz": return WeaponSound.SUPPRESSIVE;
    default: return WeaponSound.BURST_SHORT;
  }
}

/* -------------------------------------------- */
/*  Private helpers                               */
/* -------------------------------------------- */

function _playLocal(soundKey, volume, srcOverride) {
  let vol = volume ?? getDefaultVolume();

  // Apply an exponential scaling curve to make the volume slider feel more natural (logarithmic perception).
  // This causes 0.5 to be 0.25 actual amplitude (-12dB drop), and 0.05 to be 0.0025 (-52dB).
  vol = Math.pow(vol, 2);

  // Prefer the path the emitting client resolved, so every client hears the
  // same bank file and the same alternate take.
  const src = srcOverride ?? SOUND_PATHS[soundKey];
  if (!src) return;
  // foundry.audio.AudioHelper.play is the confirmed-working static API in FVTT v14.
  foundry.audio.AudioHelper.play({ src, volume: vol, loop: false }).catch(() => {});
}

function _isFirearmItem(item) {
  return item?.system?.type?.value?.startsWith?.("palna") ?? false;
}

/**
 * Check whether a weapon has a silencer / suppressor attached.
 * Looks for the "wyciszony" or "tlumik" item property.
 */
function _isSilenced(item) {
  const props = item?.system?.properties;
  if (!props) return false;
  if (typeof props.has === "function") return props.has("wyciszony") || props.has("tlumik");
  if (Array.isArray(props)) return props.includes("wyciszony") || props.includes("tlumik");
  return false;
}

function _isRocketLauncher(item) {
  const type = item?.system?.type?.value ?? "";
  if (type !== "palnaCiezka") return false;
  const props = item?.system?.properties;
  if (!props) return false;
  if (typeof props.has === "function") return props.has("ppanc");
  if (Array.isArray(props)) return props.includes("ppanc");
  return false;
}

function _isGrenadeLauncher(item) {
  const type = item?.system?.type?.value ?? "";
  if (type !== "palnaCiezka") return false;
  const props = item?.system?.properties;
  if (!props) return false;
  if (typeof props.has === "function") return props.has("burzaca");
  if (Array.isArray(props)) return props.includes("burzaca");
  return false;
}

/**
 * Returns the appropriate explosion sound key for a weapon that detonates on impact,
 * or null if the weapon has no explosion.
 * Failsafe: checks weapon type + specific property combo to avoid false positives.
 */
function _getExplosionSoundKey(item) {
  const type = item?.system?.type?.value ?? "";
  const props = item?.system?.properties;
  if (!props) return null;
  const hasProp = (key) =>
    typeof props.has === "function" ? props.has(key) : Array.isArray(props) && props.includes(key);
  // palnaCiezka + ppanc → Bazooka, LAW (rocket launchers) → LARGE
  if (type === "palnaCiezka" && hasProp("ppanc"))    return WeaponSound.EXPLOSION_LARGE;
  // specjalna + burzaca → Moździerz → LARGE
  if (type === "specjalna"   && hasProp("burzaca")) return WeaponSound.EXPLOSION_LARGE;
  // palnaCiezka + burzaca → MGL1S, Thumper (grenade launchers) → SMALL
  if (type === "palnaCiezka" && hasProp("burzaca")) return WeaponSound.EXPLOSION_SMALL;
  return null;
}

function _getThrownExplosiveSoundKey(subtype) {
  switch (subtype) {
    case "grenade-smoke":
    case "grenade-gas":
      return WeaponSound.EXP_GAS;
    case "grenade-flashbang":
      return WeaponSound.EXP_FLASHBANG;
    case "grenade-molotov":
      return WeaponSound.EXP_MOLOTOV;
    case "grenade-pipebomb-fuze":
      return WeaponSound.EXP_PIPEBOMB;
    case "grenade-antipersonnel-mine":
    case "grenade-antivehicle-mine":
      return WeaponSound.MINE_ARM;
    case "grenade-c4-remote":
    case "grenade-dynamite-remote":
      return WeaponSound.EXP_BLAST_SHORT;
    case "grenade-improvised":
    case "grenade-frag":
      return WeaponSound.EXP_BLAST;
    case "grenade-incendiary":
      return WeaponSound.EXP_MOLOTOV;
    default:
      return WeaponSound.EXP_BLAST;
  }
}

function _getLiveItem(item) {
  return item?.actor?.items?.get(item.id) ?? item;
}
