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
const DEFAULT_VOLUME = 0.7;

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
    _playLocal(data.soundKey, data.volume ?? DEFAULT_VOLUME);
  });

  // Non-firearm ranged weapons: play shot sound on postRollAttack.
  // Firearms are handled directly in registerAttackReloadGuard (magazine.mjs).
  Hooks.on("dnd5e.postRollAttack", (rolls, { subject } = {}) => {
    const item = _getLiveItem(subject?.item);
    if (!item || item.type !== "weapon") return;
    if (_isFirearmItem(item)) return;           // handled separately
    if (!rolls?.length) return;                 // cancelled / no roll
    // Only ranged weapon attacks (rwak), not melee (mwak).
    const attackType = subject?.attack?.type?.value ?? "";
    if (attackType !== "rwak") return;
    playWeaponSound(WeaponSound.SHOT_RANGED);
  });

  console.log("Neuroshima 5e | Weapon sounds registered");
}

/**
 * Play a weapon sound, heard by all players on the same scene.
 * The calling client hears it immediately; others receive it via socket.
 *
 * @param {string} soundKey  One of WeaponSound.*
 * @param {object} [opts]
 * @param {number} [opts.volume=0.7]  0–1 volume level
 */
export function playWeaponSound(soundKey, { volume = DEFAULT_VOLUME } = {}) {
  if (!SOUND_PATHS[soundKey]) return;
  _playLocal(soundKey, volume);
  game.socket.emit(SOCKET_EVENT, {
    type: "weaponSound",
    soundKey,
    sceneId: canvas.scene?.id ?? null,
    volume,
  });
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
    return _isSilenced(item) ? WeaponSound.SHOT_SILENCED : WeaponSound.SHOT_FIREARM;
  }
  return WeaponSound.SHOT_RANGED;
}

/* -------------------------------------------- */
/*  Private helpers                               */
/* -------------------------------------------- */

function _playLocal(soundKey, volume = DEFAULT_VOLUME) {
  const src = SOUND_PATHS[soundKey];
  if (!src) return;
  // foundry.audio.AudioHelper.play is the confirmed-working static API in FVTT v14.
  foundry.audio.AudioHelper.play({ src, volume, loop: false }).catch(() => {});
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

function _getLiveItem(item) {
  return item?.actor?.items?.get(item.id) ?? item;
}
