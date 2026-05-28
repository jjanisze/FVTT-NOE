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

const MODULE_ID = "neuroshima-2026-overrides";
const SOCKET_EVENT = `module.${MODULE_ID}`;
const SOUNDS_BASE = `modules/${MODULE_ID}/sounds`;

function getDefaultVolume() {
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
    /** Melee weapon degradation (Katana crack/chip) */
    MELEE_DEGRADE:    "melee_degrade"
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
    [WeaponSound.MELEE_DEGRADE]:      `${SOUNDS_BASE}/melee/degrade_chip.ogg`,
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
    _playLocal(data.soundKey, data.volume);
  });

  // Non-firearm ranged weapons: play shot sound on postRollAttack.
  // Firearms are handled directly in registerAttackReloadGuard (magazine.mjs).
  Hooks.on("dnd5e.postRollAttack", (rolls, { subject } = {}) => {
    const item = _getLiveItem(subject?.item);
    if (!item || item.type !== "weapon") return;
    if (_isFirearmItem(item)) return;           // handled separately
    if (!rolls?.length) return;                 // cancelled / no roll
      
      const attackType = subject?.attack?.type?.value ?? "";
      
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

      const attackType = subject?.attack?.type?.value ?? "";
      if (attackType === "melee") {
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
 */
export function playWeaponSound(soundKey, { volume } = {}) {
  if (!SOUND_PATHS[soundKey]) return;
  _playLocal(soundKey, volume);
  game.socket.emit(SOCKET_EVENT, {
    type: "weaponSound",
    soundKey,
    sceneId: canvas.scene?.id ?? null,
    volume: volume,
  });
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
 * Derive the correct single-shot sound key from a weapon item.
 * Checks for silencer property to select the muffled variant.
 *
 * @param {Item5e} item
 * @returns {string}  WeaponSound.SHOT_FIREARM | SHOT_SILENCED | SHOT_RANGED
 */
export function getShotSoundKey(item) {
  if (_isFirearmItem(item)) {
    if (_isRocketLauncher(item)) return WeaponSound.SHOT_ROCKET;
    if (_isGrenadeLauncher(item)) return WeaponSound.SHOT_GRENADE;
    return _isSilenced(item) ? WeaponSound.SHOT_SILENCED : WeaponSound.SHOT_FIREARM;
  }
  return WeaponSound.SHOT_RANGED;
}

/* -------------------------------------------- */
/*  Private helpers                               */
/* -------------------------------------------- */

function _playLocal(soundKey, volume) {
  let vol = volume ?? getDefaultVolume();
  
  // Apply an exponential scaling curve to make the volume slider feel more natural (logarithmic perception).
  // This causes 0.5 to be 0.25 actual amplitude (-12dB drop), and 0.05 to be 0.0025 (-52dB).
  vol = Math.pow(vol, 2);

  const src = SOUND_PATHS[soundKey];
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
