/**
 * Neuroshima 5e — Ammo / caliber system.
 *
 * Responsibilities:
 *   1. When caliber (mag.ammoType) changes on a weapon outside the magazine system →
 *      auto-sync system.damage.base.formula + types + ammo-derived properties.
 *   2. Single-shot damage (PLAN_tt E2, D8): the NATIVE dnd5e "Obrażenia" button and damage
 *      roll, with the round's dice injected at roll time by the same builder the bursts use —
 *      no ability modifier, with the round's properties (`rozrywajaca`, `hollowpoint`). The
 *      caliber comes from the card the shot was fired from (`shotCaliber`), else the magazine.
 *
 * What is gone (2026-10, PLAN_tt Z3/Z5): the auto-damage that rolled and applied damage straight
 * off a single-shot attack in combat, and our own red "Obrażenia" button. The first took the roll
 * away from the player and made every RAW defensive reaction impossible; the second never doubled
 * dice on a critical and bypassed `dnd5e.preRollDamage` (the damage dialog, "Redukcja osłony",
 * every bonus hook). Damage is now always rolled by the attacker and applied by the GM from the
 * native tray on the damage card (`weapons/damage-reduction.mjs` extends it).
 */

import { AMMO_CALIBER_MAP } from "../config/ammo-data.mjs";
import { getMag } from "./magazine.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const AMMO_PROPS_FLAG = "ammoProps";
const SINGLE_SHOT_PATCH = Symbol("neuro-single-shot-damage");

/** Guard: prevent updateItem recursion when we trigger a caliber-sync update. */
const syncingCaliberUpdate = new Set();

/* ─────────────────────────────────────────────────────────────────── */
/*  Registration                                                        */
/* ─────────────────────────────────────────────────────────────────── */

export function registerAmmoSystem() {
  // 1. Sync weapon damage / properties when caliber flag changes.
  Hooks.on("updateItem", _onUpdateItemSyncCaliberDamage);

  // 2. Single shot: native damage roll with the round's dice.
  _patchSingleShotDamage();

  console.log("Neuroshima 5e | Ammo system registered");
}

/* ─────────────────────────────────────────────────────────────────── */
/*  1. Caliber → damage sync                                           */
/* ─────────────────────────────────────────────────────────────────── */

/**
 * When flags.neuroshima-2026-overrides.mag.ammoType changes on a weapon,
 * update the weapon's base damage formula, damage type, and properties.
 */
async function _onUpdateItemSyncCaliberDamage(item, changes) {
  if (item.type !== "weapon") return;
  if (syncingCaliberUpdate.has(item.uuid)) return;

  /* Broń w systemie magazynków NIE przechodzi tędy.
     `flags.mag` jest dla niej projekcją przeliczaną po każdym strzale, więc `ammoType` zmienia
     się przy każdym naboju z mieszanego magazynka — a ten hook pisze do `system.damage.base`,
     czyli do bazy, co z kolei odpala `syncWeaponFireModes` i resetuje `damage.parts` oraz flagi
     modułu (udokumentowany wzorzec clobbera, ARCHITECTURE.md). Zamiast tego obrażenia
     wstrzykiwane są w momencie rzutu — `effectiveDamageFor()` niżej. Zapis byłby cache'em,
     a cache trzeba by unieważniać w każdym trybie ognia osobno (PLAN_magazynki.md §8).

     Hook zostaje dla broni POZA systemem: ręcznie zrobione sztuki w świecie, na których MG
     ustawia kaliber z ręki. Tam `flags.mag` jest nadal zwykłym stanem, nie projekcją. */
  if (getMag(item) !== null) return;

  const ammoTypePath = `flags.${MODULE_ID}.mag.ammoType`;
  if (!foundry.utils.hasProperty(changes, ammoTypePath)) return;

  const caliberId = foundry.utils.getProperty(changes, ammoTypePath) ?? "";
  const caliber = AMMO_CALIBER_MAP[caliberId] ?? null;

  const updates = {};

  /* ── Damage formula + type ── */
  // `fixedDamage` = kostki broni biją domyślną formułę kalibru. Bez tego wybór
  // .12 Ga sprowadziłby Pompkę (4k4) i Dwurówkę (3k4) do wspólnych 2k4.
  const fixedDamage = item.getFlag(MODULE_ID, "fixedDamage") === true;
  if (caliber?.formula && !fixedDamage) {
    const parsed = _parseDamageFormula(caliber.formula);
    if (parsed) {
      updates["system.damage.base.number"] = parsed.number;
      updates["system.damage.base.denomination"] = parsed.denomination;
    }
    updates["system.damage.base.types"] = [caliber.type];
  }

  /* ── Ammo-derived properties ── */
  // Read the weapon's current property set, then:
  //   a) Remove properties that were previously added by the OLD caliber.
  //   b) Add properties from the NEW caliber.
  const currentProps = new Set(item.system?.properties ?? []);
  const oldAmmoProps = item.getFlag(MODULE_ID, AMMO_PROPS_FLAG) ?? [];
  for (const p of oldAmmoProps) currentProps.delete(p);

  const newAmmoProps = caliber?.props ?? [];
  for (const p of newAmmoProps) currentProps.add(p);

  updates["system.properties"] = [...currentProps];
  updates[`flags.${MODULE_ID}.${AMMO_PROPS_FLAG}`] = newAmmoProps;

  if (foundry.utils.isEmpty(updates)) return;

  syncingCaliberUpdate.add(item.uuid);
  try {
    await item.update(updates);
  } finally {
    syncingCaliberUpdate.delete(item.uuid);
  }
}

/* ─────────────────────────────────────────────────────────────────── */
/*  2. Single shot: native damage roll, round's dice                    */
/* ─────────────────────────────────────────────────────────────────── */

/** Broń w systemie kalibrów: magazynek symulacyjny albo kaliber ustawiony z ręki (`flags.mag`). */
export function isCaliberWeapon(item) {
  return item?.type === "weapon" && ((getMag(item) !== null) || !!item.getFlag(MODULE_ID, "mag")?.ammoType);
}

/** Kaliber strzału pojedynczego: z karty, z której oddano strzał, inaczej głowa magazynka. */
function _singleShotCaliber(item, rollConfig) {
  return rollConfig?.neuroCaliber || getMag(item)?.ammoType || item.getFlag(MODULE_ID, "mag")?.ammoType || null;
}

/**
 * Właściwości obrażeń dla naboju w tej broni (`options.properties` rzutu → `damages[].properties`
 * w tacce MG). Wspólne dla strzału pojedynczego i serii (`fire-modes.mjs`).
 *
 *   - z broni — tylko fizyczne w sensie dnd5e (`isPhysical`: magiczna, posrebrzana…); reszta listy
 *     broni to tryby ognia i chwyt, nie cechy trafienia, a `ppanc` broni czyta
 *     `combat/armour-piercing.mjs` z samego przedmiotu;
 *   - z naboju — **wszystkie**: to właściwości trafienia (`rozrywajaca`, `hollowpoint` dum-dum,
 *     `ppanc`/`przebijajaca`), a żadna z nich nie jest `isPhysical`. Filtr, który stał tu do
 *     2026-10, wycinał je co do jednej — dotyczyło to serii od początku, a pojedynczy strzał
 *     omijał problem tylko dlatego, że auto-obrażenia składały `damages` same (PLAN_tt E2).
 */
export function caliberDamageProperties(item, caliberId) {
  const physical = Array.from(item.system?.properties ?? [])
    .filter(property => CONFIG.DND5E.itemProperties[property]?.isPhysical);
  return Array.from(new Set([...physical, ...(effectiveDamageFor(item, caliberId)?.props ?? [])]));
}

/**
 * Konfiguracja rzutu obrażeń strzału pojedynczego: kości naboju (`effectiveDamageFor`), bez
 * modyfikatora z cechy (Neuroshima nie dodaje go do broni palnej), z właściwościami naboju.
 * `null` — profil bez kości (Dmuchawka: same „+1”); wtedy zostaje natywna część obrażeń.
 */
export function buildCaliberDamageRoll(item, rollData, caliberId) {
  const profile = effectiveDamageFor(item, caliberId);
  if (!profile?.formula) return null;
  return {
    base: true,
    data: { ...rollData },
    parts: [profile.formula],
    options: {
      type: profile.type,
      types: [profile.type],
      properties: caliberDamageProperties(item, caliberId),
      neuroCaliber: caliberId ?? null
    }
  };
}

/**
 * Natywna aktywność ataku (tryb P) liczy bazę obrażeń z `system.damage.base` broni + `@mod`.
 * Dla broni z kalibrem podmieniamy wyłącznie część bazową — reszta (dodatkowe części, krytyk,
 * haki `preRollDamage`, okno z „Redukcją osłony”) zostaje natywna. Serie mają własne klasy
 * aktywności z własnym `_processDamagePart` (`fire-modes.mjs`) i tego nie widzą.
 */
function _patchSingleShotDamage() {
  const Base = CONFIG.DND5E.activityTypes.attack?.documentClass;
  if (!Base || Base.prototype[SINGLE_SHOT_PATCH]) return;
  Base.prototype[SINGLE_SHOT_PATCH] = true;

  const originalPart = Base.prototype._processDamagePart;
  Base.prototype._processDamagePart = function (damage, rollConfig, rollData, index = 0) {
    try {
      if (damage?.base) {
        const item = _getLiveItem(this.item);
        if (isCaliberWeapon(item)) {
          const built = buildCaliberDamageRoll(item, rollData, _singleShotCaliber(item, rollConfig));
          if (built) return built;
        }
      }
    } catch (err) {
      console.error(`${MODULE_ID} | Obrażenia strzału pojedynczego — wracam do natywnych`, err);
    }
    return originalPart.call(this, damage, rollConfig, rollData, index);
  };

  // Przycisk „Obrażenia” na karcie użycia: kaliber z karty (`magazine.mjs` stempluje `shotCaliber`
  // w `preCreateChatMessage`, zanim nabój zejdzie), a nie głowa magazynka, która jest już następnym
  // nabojem. Rzut z arkusza broni nie ma karty — bierze głowę (PLAN_tt §7, świadomie).
  const originalRollDamage = Base.prototype.rollDamage;
  Base.prototype.rollDamage = function (config = {}, dialog = {}, message = {}) {
    if (!config.neuroCaliber) {
      const messageId = config.event?.target?.closest?.("[data-message-id]")?.dataset?.messageId;
      const caliber = messageId ? game.messages.get(messageId)?.getFlag(MODULE_ID, "shotCaliber") : null;
      if (caliber) config = { ...config, neuroCaliber: caliber };
    }
    return originalRollDamage.call(this, config, dialog, message);
  };
}

/* ─────────────────────────────────────────────────────────────────── */
/*  Helpers                                                             */
/* ─────────────────────────────────────────────────────────────────── */

/**
 * Resolve the {formula, type, props} this weapon should actually roll for damage — everywhere
 * above used to read `caliber.formula`/`caliber.type` unconditionally, which is right for the
 * vast majority of weapons but wrong for two real, found-live cases:
 *
 * ## Bugfix (2026-09-06), found via Pistolet na Race
 *
 * `fixedDamage: true` (`config/weapons-data.mjs` — Magnum .44, .30-06/12 Ga/„.50 BMG" weapons,
 * Pistolet na Race, Strzelba Palmera, …) exists SPECIFICALLY because a weapon's own table damage
 * differs from its shared caliber's generic baseline (see this weapon-catalog's own comment on
 * the flag: ".12 Ga would collapse Pompka's 4k4 and Dwururka's 3k4 into a shared 2k4"). Every
 * damage-rolling path in this file ignored that flag completely and used `caliber.formula`
 * regardless — two distinct failure modes from the same root cause, both real:
 *   - A caliber with a real but DIFFERENT formula than the weapon's actual table value — R700
 *     (own damage 2d8) and Deer Hunter (own damage 1d12) both share caliber "3006" (formula
 *     "2d6"); Pompka (4d4) shares "12ga_s" (formula "2d4") — silently rolled the WRONG dice, no
 *     error, nothing visibly off.
 *   - A caliber with NO formula at all — Pistolet na Race's "race", Strzelba Palmera's
 *     "strzykawka" — every path below bailed out entirely: auto-apply did nothing, the manual
 *     button did nothing but warn "ta amunicja nie ma formuły obrażeń," and the chat-card button
 *     label fell back to a vague "(TYP — formuła z broni)" placeholder. Exactly the "1d4 fire
 *     damage isn't reflected anywhere, no way to apply it" symptom reported live, and the
 *     "Nałóż ponownie" click producing that same warning (misread as a broken dialog).
 *
 * Fixed by preferring the weapon's own `system.damage.base` whenever `fixedDamage` is set (or the
 * caliber id isn't recognised at all — the old per-callsite fallback this replaces), falling back
 * to the caliber only when the weapon's own base has no usable dice. Dmuchawka's igła caliber also
 * has an empty formula, but that weapon's own damage is a flat "+1" bonus with no dice at all
 * (`number`/`denomination` both null) — this correctly still returns `null` for it rather than
 * inventing a formula that was never there.
 *
 * @param {Item5e} item             The weapon (live, embedded).
 * @param {object|null} caliber     `AMMO_CALIBER_MAP[caliberId]`, or null if unrecognised.
 * @returns {{formula: string, type: string, props: string[]}|null}
 */
/**
 * Profil obrażeń dla konkretnego naboju w tej broni — wspólny dla strzału pojedynczego
 * (`ammo.mjs`) i dla serii (`fire-modes.mjs`).
 *
 * Kaliber niesie nie tylko `formula`, ale też **`props`** — dum-dum dokłada `rozrywajaca`
 * i `hollowpoint`, a te napędzają `wkk/combat/weapon-save-properties.mjs` i `combat/bleeding.mjs`.
 * Gdyby odświeżały się same kości, dum-dum zadałby swoje obrażenia, ale nie wywołał Krwawienia.
 * **Obrażenia i właściwości idą zawsze razem** — dlatego jedna funkcja zwraca oba.
 *
 * @param {Item5e} item
 * @param {string|null} caliberId
 * @returns {{formula: string, type: string, props: string[]}|null}
 */
export function effectiveDamageFor(item, caliberId) {
  return _effectiveDamage(item, caliberId ? (AMMO_CALIBER_MAP[caliberId] ?? null) : null);
}

function _effectiveDamage(item, caliber) {
  const preferWeaponDamage = (item.getFlag(MODULE_ID, "fixedDamage") === true) || !caliber;
  if (preferWeaponDamage) {
    const base = item.system?.damage?.base;
    const n = Number(base?.number);
    const d = Number(base?.denomination);
    if (Number.isFinite(n) && n > 0 && Number.isFinite(d) && d > 0) {
      return {
        formula: `${n}d${d}`,
        type: base?.types?.[0] ?? caliber?.type ?? "piercing",
        props: caliber?.props ?? [],
      };
    }
  }
  if (caliber?.formula) return { formula: caliber.formula, type: caliber.type, props: caliber.props ?? [] };
  return null;
}

/**
 * Parse a simple "NdM" damage formula into {number, denomination}.
 * Returns null if the formula doesn't match standard dice notation.
 * @param {string} formula  e.g. "2d8", "1d6", "15d6"
 * @returns {{ number: number, denomination: number }|null}
 */
function _parseDamageFormula(formula) {
  if (!formula) return null;
  const match = formula.match(/^(\d+)d(\d+)$/);
  if (!match) return null;
  return { number: parseInt(match[1], 10), denomination: parseInt(match[2], 10) };
}

/**
 * Resolve the live (embedded) item from an activity's (possibly cloned) item.
 * dnd5e v5.3 clones items during activity use — always look up via actor.items.
 */
function _getLiveItem(item) {
  if (!item) return null;
  const actor = item.actor;
  if (!actor) return item;
  return actor.items.get(item.id) ?? item;
}


