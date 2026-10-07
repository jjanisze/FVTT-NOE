/**
 * Neuroshima 5e — Stopień Zranienia (Wound Level) system.
 * 
 * When PW drop to 0 or a critical hit is received, the character gains
 * a Stopień Zranienia. This coexists with dnd5e death saves.
 * 
 * Levels and penalties (cumulative — each new level adds its effect to all previous):
 *   0: Brak — no penalties
 *   1: Lekki — speed -4.5 m
 *   2: Znaczny — speed -4.5 m, no Reactions
 *   3: Poważny — speed -4.5 m, no Reactions, no Bonus Actions
 *   4: Krytyczny — speed -4.5 m, no Reactions, no Bonus Actions, +1 Wyczerpanie
 *   5+: Śmierć (next wound after Krytyczny = death)
 * 
 * Data stored in module flags:
 *   flags.neuroshima-2026-overrides.zranienie = { level: 0-4 }
 *
 * ## Single store, three views
 *
 * That flag is the **only** place the wound level is kept. Everything else derives
 * from it and writes back through `setZranienie` / `applyZranienie`:
 *
 *   1. the Active Effect carrying the speed penalty (`_syncZranieniEffect`),
 *   2. the four pips on the character and NPC sheets (`_buildZranieniRow`),
 *   3. the status icon on the token (registered in `config/conditions.mjs`, cycled
 *      by `actors/levelled-conditions.mjs`).
 *
 * This mirrors how dnd5e keeps Wyczerpanie honest — one store, N derived views, one
 * write funnel — except that dnd5e stores the level on the effect and derives the
 * actor attribute, while this stores it on the actor and derives the effect. Either
 * direction is fine; having two stores is not.
 *
 * The effect is created with the **static id dnd5e assigns to the `zranienie` status**
 * so that a stray `toggleStatusEffect("zranienie")` from a macro or another module
 * collides with this document instead of quietly creating a second, unmanaged wound
 * effect beside it.
 */

import { addExhaustion, zdejmijWyjsciem } from "../config/exhaustion.mjs";
import { critSkipsZranienie } from "./crit-riders.mjs";
import { seqScrollText } from "../weapons/sequencer.mjs";
import { registerHudLevelled } from "../actors/levelled-conditions.mjs";
import { CHANGE_TYPE, change } from "../config/effect-changes.mjs";
import { isCriticalHitOn } from "./trafienie.mjs";
// Cykl importów z `umieranie.mjs` jest bezpieczny: obie strony wołają się tylko z ciał funkcji.
import { zaproponujSmierc } from "./umieranie.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Flaga na karcie obrażeń: UUID aktorów, którym ten krytyk już nadał Stopień (ponowne „Zastosuj”). */
const CRIT_WOUNDED_FLAG = "zranienieKrytyk";

/**
 * Aktorzy, których PW właśnie spadły do 0 (`preUpdateActor`) — UUID → znacznik czasu. Krytyk,
 * który przy tym samym trafieniu zbił PW do 0, nie dokłada drugiego Stopnia (s. 32: „Trafienie
 * Krytyczne **albo** PW spadną do 0”).
 */
const _zeroHpAt = new Map();
const ZERO_HP_WINDOW_MS = 3000;

/**
 * Zranienie level definitions.
 */
export const ZRANIENIE_LEVELS = {
  0: { label: "Brak", speedPenalty: 0, noReaction: false, noBonusAction: false, exhaustion: false },
  1: { label: "Lekki", speedPenalty: 4.5, noReaction: false, noBonusAction: false, exhaustion: false },
  2: { label: "Znaczny", speedPenalty: 4.5, noReaction: true, noBonusAction: false, exhaustion: false },
  3: { label: "Poważny", speedPenalty: 4.5, noReaction: true, noBonusAction: true, exhaustion: false },
  4: { label: "Krytyczny", speedPenalty: 4.5, noReaction: true, noBonusAction: true, exhaustion: true }
};

/**
 * Register Zranienie hooks — call during init.
 */
export function registerZranienie() {
  // PW → 0: znacznik czasu dla ścieżki krytyka niżej (jeden Stopień za ten sam cios). Stopień za
  // samo zejście do 0 PW nakłada `combat/umieranie.mjs` — tylko BG i BN w maszynie umierania; zwykły
  // BN przy 0 PW umiera bez Stopnia (PLAN_m1_walka D2).
  Hooks.on("preUpdateActor", onPreUpdateActor);

  // Trafienie Krytyczne → Stopień Zranienia, gdy MG nakłada obrażenia z karty (tacka dnd5e).
  // Do 2026-10 był tu hak `dnd5e.rollDamage` w sygnaturze `(item, roll, data)`, której żadna
  // wersja dnd5e nie miała — `data.isCritical` zawsze puste, krytyk nigdy nie ranił (PLAN_tt W6).
  Hooks.on("dnd5e.applyDamage", onApplyDamage);

  // Wound pips on the sheet are owned by actors/sheet-shell.mjs (Stan panel), which reads
  // this module's level through the levelled-condition registry.

  // Sync flag when the AE is deleted manually from Effects tab
  Hooks.on("deleteActiveEffect", onDeleteActiveEffect);

  // Rzut przeciw śmierci jako czysta k20 (bez Wyczerpania i reszty) — `combat/umieranie.mjs` (U12).

  // Token-HUD cycling for the wound pips' third view. Deliberately wired to
  // `setZranienie`, the same writer the sheet pips use, so a HUD click and a pip
  // click do exactly the same thing — including *not* firing the death check or the
  // auto-Wyczerpanie, which belong to `applyZranienie` (damage-driven wounds) and
  // never fired from manual pip edits either.
  registerHudLevelled("zranienie", {
    label: "Stopień Zranienia",
    max: 4,
    get: getZranienieLvl,
    set: setZranienie,
    summary: _zranienieSummary,
    img: _zranienieImage
  });

  // Backfill, as the disease and levelled-condition layers already do. A wounded
  // actor whose effect went missing — deleted before the delete-sync hook existed,
  // or set by an older code path that only wrote the flag — silently stops paying
  // the −4,5 m and now would also show no token icon. Re-deriving the effect from
  // the flag costs nothing when they already agree.
  Hooks.once("ready", async () => {
    if (!game.user.isGM) return;
    for (const actor of game.actors) {
      const level = getZranienieLvl(actor);
      if (level <= 0) continue;
      const effect = actor.effects.find(e => e.getFlag(MODULE_ID, "zranieniEffect"));
      // `showIcon` sprzed v14 zostawia efekt bez ikony na żetonie — też do odtworzenia,
      // podobnie jak płaska ikona sprzed wersji z cyfrą poziomu.
      if (effect
        && (effect.showIcon === CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS)
        && (effect.img === _zranienieImage(level))) continue;
      console.warn(`${MODULE_ID} | ${actor.name}: Zranienie ${level} bez efektu lub bez ikony — odtwarzam.`);
      await _syncZranieniEffect(actor, level);
    }
  });

  console.log("Neuroshima 5e | Zranienie system registered");
}

/**
 * PW właśnie spadają do 0 — zapamiętaj dla ścieżki krytyka, która przychodzi zaraz po tej
 * aktualizacji (`onApplyDamage`). `preUpdateActor`, bo tu `actor.system` ma jeszcze stare PW.
 */
function onPreUpdateActor(actor, changes, options, userId) {
  if (!game.user.isGM) return;
  const newHP = foundry.utils.getProperty(changes, "system.attributes.hp.value");
  if (newHP !== 0) return;
  const oldHP = actor.system.attributes.hp.value;
  if (oldHP === undefined || oldHP <= 0) return;
  _zeroHpAt.set(actor.uuid, Date.now());
}

/**
 * Trafienie Krytyczne dotarło do celu — MG nakłada obrażenia z karty (RAW s. 32).
 *
 * Kiedy: przy **nakładaniu** wyniku rzutu obrażeń, nie przy samym rzucie. Krytyk należy do Testu
 * Ataku i jest czytany z żywego werdyktu celu na karcie ataku (`isCriticalHitOn`), więc reakcja
 * użyta już po rzucie obrażeń — Krytyczna ochrona, Inteligentna obrona — wygrywa. Rzut obrażeń
 * robi atakujący, często gracz, którego klient i tak nie może pisać do celu; nakłada MG.
 *
 * Raz na trafienie: ponowne „Zastosuj” tej samej karty temu samemu celowi nie dokłada Stopnia,
 * a krytyk, który przy okazji zbił PW do 0, daje jeden Stopień, nie dwa („albo”, s. 32).
 * Krytyk, który nie zadał obrażeń (próg obrażeń, niewrażliwość, mnożnik 0), **nie rani** — „nie ma
 * czego zranić”. Interpretacja MG (2026-10-04), czeka na potwierdzenie autora systemu; RAW wiąże
 * Stopień z samym krytykiem (PLAN_tt W6).
 *
 * Hook: `dnd5e.applyDamage(actor, amount, options)` — po aktualizacji PW, na kliencie nakładającym.
 */
async function onApplyDamage(actor, amount, options = {}) {
  if (!game.user.isGM) return;
  // Znacznik „PW właśnie 0” zdejmujemy przy każdym nałożeniu — dotyczy tylko tego ciosu.
  const droppedToZero = _droppedToZeroJustNow(actor);
  if (!(amount > 0) || _isHealing(options)) return;
  if (!isCriticalHitOn(actor, options)) return;

  const message = options.origin ?? options.originatingMessage ?? null;
  // Palcożerca: „Atak nie powoduje otrzymania Stopnia Zranienia” — rider w `crit-riders.mjs`.
  const attacker = message?.getAssociatedActor?.() ?? null;
  if (attacker && critSkipsZranienie(attacker)) return;

  const already = message?.getFlag?.(MODULE_ID, CRIT_WOUNDED_FLAG) ?? [];
  if (already.includes(actor.uuid)) return;
  if (message?.id && game.messages.get(message.id) === message) {
    await message.setFlag(MODULE_ID, CRIT_WOUNDED_FLAG, [...already, actor.uuid]);
  }

  if (droppedToZero) return; // Stopień za PW 0 już nałożony — ten sam cios
  await applyZranienie(actor, "Trafienie krytyczne");
}

/** Leczenie przez tackę (rzut leczenia) nie jest trafieniem. */
function _isHealing(options) {
  const rolls = (options?.origin ?? options?.originatingMessage)?.rolls ?? [];
  if (!rolls.length) return false;
  return rolls.every(r => (r?.options?.type ?? "") in (CONFIG.DND5E.healingTypes ?? {}));
}

function _droppedToZeroJustNow(actor) {
  const at = _zeroHpAt.get(actor.uuid);
  _zeroHpAt.delete(actor.uuid);
  return Number.isFinite(at) && (Date.now() - at) < ZERO_HP_WINDOW_MS;
}

/**
 * When the Zranienie Active Effect is deleted (e.g. via the Effects tab),
 * reset the wound level flag to 0 to keep them in sync.
 */
async function onDeleteActiveEffect(effect, options, userId) {
  if (!game.user.isGM) return;
  if (!effect.getFlag(MODULE_ID, "zranieniEffect")) return;
  // A migration swap deletes the old effect only to recreate it under the static id;
  // treating that as a heal would wipe the level the recreate is about to re-render.
  if (options?.[MODULE_ID]?.zranienieMigration) return;
  const actor = effect.parent;
  if (!actor || !(actor instanceof Actor)) return;
  // Already 0 — nothing to sync, and writing anyway would re-enter _syncZranieniEffect.
  if ((actor.getFlag(MODULE_ID, "zranienie")?.level ?? 0) === 0) return;
  // Reset wound flag to 0 without trying to delete the (already gone) effect
  const przed = actor.getFlag(MODULE_ID, "zranienie")?.level ?? 0;
  await actor.setFlag(MODULE_ID, "zranienie", { level: 0 });
  await _poZejsciu(actor, przed, 0);
}

/**
 * Zejście z Krytycznego (RAI, orzeczenie autora systemu 2026-10-06 — PLAN_m1_walka D5): zdejmuje
 * wszystkie poziomy Wyczerpania ze Zranienia, jeśli jeszcze są. Każdą drogą — Regeneracja, Pomoc
 * medyczna, pipki, HUD, skasowany efekt. W NOE te poziomy schodzą też zwykłym DO; w WKK tylko tak.
 * Ponowne wejście w Krytyczny nadaje je znowu (`applyZranienie`).
 */
async function _poZejsciu(actor, przed, po) {
  if (!(przed >= 4 && po < 4)) return;
  await zdejmijWyjsciem(actor, "zejscie-z-krytycznego", { powod: "zejście z Krytycznego Stopnia Zranienia" });
}

/**
 * Apply one level of Zranienie to an actor.
 * @param {Actor} actor - The actor to wound
 * @param {string} reason - Description of what caused the wound
 */
export async function applyZranienie(actor, reason = "") {
  const current = actor.getFlag(MODULE_ID, "zranienie")?.level ?? 0;
  const newLevel = current + 1;

  if (newLevel > 4) {
    // Kolejny Stopień przy Krytycznym — „natychmiast umiera” (s. 32), ale śmierć potwierdza MG
    // (PLAN_m1_walka D1): karta „Śmierć” zamiast samej linii na czacie.
    await zaproponujSmierc(actor, "stopien", { powod: reason });
    return;
  }

  // Update flag
  await actor.setFlag(MODULE_ID, "zranienie", { level: newLevel });

  const levelInfo = ZRANIENIE_LEVELS[newLevel];

  // Apply/update Active Effect for mechanical penalties
  await _syncZranieniEffect(actor, newLevel);

  // Chat message
  const penalties = _buildZranieniDescription(newLevel);
  await ChatMessage.create({
    content: `<strong>${actor.name}</strong> otrzymuje Stopień Zranienia: <strong>${levelInfo.label}</strong> (poziom ${newLevel}/4). ${reason ? `(${reason})` : ""}<br>Kary: ${penalties || "brak"}.`,
    speaker: ChatMessage.getSpeaker({ actor })
  });

  const scrollText = newLevel >= 4 ? "KRYTYCZNE ZRANIENIE!" : "ZRANIONY!";
  const scrollColor = newLevel >= 4 ? "#8e44ad" : "#e74c3c";
  seqScrollText(scrollText, actor, { color: scrollColor, fontSize: 30, duration: 2000 });

  // Auto-apply exhaustion at Krytyczny level
  if (levelInfo.exhaustion) {
    await addExhaustion(actor, "zranienie", { chat: false });
  }
}

/**
 * Get the current Zranienie level for an actor.
 * @param {Actor} actor
 * @returns {number} 0-4
 */
export function getZranienieLvl(actor) {
  return actor.getFlag(MODULE_ID, "zranienie")?.level ?? 0;
}

/**
 * Set Zranienie level directly (for GM use / recovery).
 * @param {Actor} actor
 * @param {number} level 0-4
 */
export async function setZranienie(actor, level) {
  const clamped = Math.max(0, Math.min(4, level));
  const przed = getZranienieLvl(actor);
  await actor.setFlag(MODULE_ID, "zranienie", { level: clamped });
  await _syncZranieniEffect(actor, clamped);
  await _poZejsciu(actor, przed, clamped);
}

/* -------------------------------------------- */
/*  Active Effect Management                     */
/* -------------------------------------------- */

const ZRANIENIE_ICON = "systems/dnd5e/icons/svg/statuses/bloodied.svg";

/**
 * Ikona z wrysowaną czerwoną cyfrą rzymską — dokładnie ten mechanizm, którym dnd5e
 * pokazuje poziom Wyczerpania (`ActiveEffect5e._getExhaustionImage`): rdzeń rysuje na
 * żetonie sam `effect.img`, więc poziom można podać wyłącznie osobnym plikiem.
 * Komplet składa `dev/icons/gen_status_numerals.mjs` z assetów dnd5e.
 * @param {number} level 1-4
 */
function _zranienieImage(level) {
  return level >= 1 && level <= 4
    ? `modules/${MODULE_ID}/icons/statuses/zranienie-${level}.svg`
    : ZRANIENIE_ICON;
}

/**
 * Everything a wound level costs. The table rows are already absolute rather than
 * incremental — the −4,5 m does not stack — so this is the total at that level.
 * @param {number} level 1-4
 * @returns {{title?: string, lines: string[]}}
 */
function _zranienieSummary(level) {
  const info = ZRANIENIE_LEVELS[level];
  if (!info) return { lines: [] };
  const lines = [];
  if (info.speedPenalty) lines.push(`Szybkość −${String(info.speedPenalty).replace(".", ",")} m`);
  if (info.noReaction) lines.push("Brak Reakcji");
  if (info.noBonusAction) lines.push("Brak Akcji dodatkowej");
  if (info.exhaustion) lines.push("+1 Wyczerpanie (jednorazowo)");
  return { title: info.label, lines };
}

/**
 * Build the description text for a given wound level.
 * @param {number} level 1-4
 * @returns {string}
 */
function _buildZranieniDescription(level) {
  return _zranienieSummary(level).lines.join(", ");
}

/**
 * Create, update, or remove the Zranienie Active Effect on an actor
 * to match the given wound level.
 * 
 * @param {Actor} actor
 * @param {number} level 0-4 (0 = remove effect)
 */
async function _syncZranieniEffect(actor, level) {
  const staticId = _zranienieStaticId();
  // Prefer the static id; fall back to the ownership flag so effects created before
  // the status existed are still found (and, below, migrated onto the static id).
  const existing = (staticId ? actor.effects.get(staticId) : null)
    ?? actor.effects.find(e => e.getFlag(MODULE_ID, "zranieniEffect"));

  if (level <= 0) {
    // Remove effect if wound is healed
    if (existing) await existing.delete();
    return;
  }

  const info = ZRANIENIE_LEVELS[level];
  if (!info) return;

  // Build AE changes — speed penalty applied to all movement types
  const changes = [];
  if (info.speedPenalty) {
    for (const moveType of ["walk", "fly", "swim", "climb", "burrow"]) {
      changes.push(change(`system.attributes.movement.${moveType}`, CHANGE_TYPE.add, -info.speedPenalty));
    }
  }

  const effectData = {
    name: `Zranienie: ${info.label}`,
    img: _zranienieImage(level),
    system: { changes },
    // Lights the token icon. The status id is what makes this effect and the HUD
    // button the same thing rather than two things that look alike.
    statuses: ["zranienie"],
    // FVTT v14: `isTemporary` liczy tylko czas trwania, a domyślne `CONDITIONAL`
    // znaczy „rysuj tylko, jeśli tymczasowy" — bez tego ikona nie wchodzi na żeton.
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
    description: _buildZranieniDescription(level),
    flags: {
      [MODULE_ID]: { zranieniEffect: true }
    }
  };

  if (existing && (!staticId || existing.id === staticId)) {
    await existing.update(effectData);
    return;
  }

  // Either nothing existed, or an effect from before the status did — one created
  // with a random id cannot be given the static one, so it is replaced. The delete
  // would normally zero the flag via onDeleteActiveEffect; `zranienieMigration`
  // tells that handler this is a swap, not a heal.
  if (existing) {
    await existing.delete({ [MODULE_ID]: { zranienieMigration: true } });
  }
  await actor.createEmbeddedDocuments(
    "ActiveEffect",
    [staticId ? { ...effectData, _id: staticId } : effectData],
    { keepId: !!staticId }
  );
}

/**
 * The id dnd5e assigns to the `zranienie` status when it builds `CONFIG.statusEffects`
 * (`staticID("dnd5e" + id)`). Read rather than hardcoded, so it cannot drift from
 * whatever the system actually generates.
 * @returns {string|null} null before `i18nInit`, or if the status is not registered.
 */
function _zranienieStaticId() {
  return CONFIG.statusEffects?.find(s => s.id === "zranienie")?._id ?? null;
}

/* Nieprzytomność przy 0 PW (i jej koniec przy leczeniu) — `combat/umieranie.mjs` (PLAN_m1_walka U4). */

/* -------------------------------------------- */
/*  Sheet Display                                */
/* -------------------------------------------- */

/* Wound pips moved to actors/sheet-shell.mjs — see the Stan panel there. This module
   still owns the level, its penalties and the token-HUD registration. */
