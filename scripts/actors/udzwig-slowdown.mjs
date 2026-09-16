/**
 * Neuroshima 5e — Udźwig: automatic Speed penalty (Przeciążenie/Unieruchomienie).
 *
 * RAW anchor (Zasady szczegółowe → Udźwig): "Jeśli sumaryczna waga tego, co nosisz,
 * przekroczy wartość udźwigu użytkowego, twoja Szybkość spada o połowę i wszystkie
 * ataki wykonujesz z Utrudnieniem. […] Jeśli sumaryczna waga tego, co nosisz, wyniesie
 * tyle, co wartość udźwigu maksymalnego, twoja szybkość spada do 0." Only the Speed
 * half is automated here — see "Scope" below for why the attack-disadvantage half
 * isn't.
 *
 * ## Why an automatic Active Effect, not a detect-and-surface button
 *
 * Every other combat consequence in this module (bleeding, disease flare-ups, damage
 * reduction) follows a "MG w pętli" doctrine: automate DETECTION, never automatic
 * APPLICATION — see `combat/bleeding.mjs`/`items/chemia.mjs` for the chat-card-button
 * shape. Requested live (2026-09-16) as a deliberate, explicit exception: "a second
 * order variable, not enforcement" — this changes the Speed FIELD on the sheet the same
 * way Wyczerpanie or a spell buff would, but a Speed value is advisory the moment a
 * player picks up their token: nothing here stops anyone from moving further on the
 * tactical map than the sheet says, the way a hard block on HP or an attack roll would
 * actually prevent an action. That's the load-bearing distinction that makes an
 * automatic AE acceptable here where it wouldn't be for, say, auto-applying damage.
 *
 * ## Scope: Speed only, not the attack disadvantage
 *
 * RAW's Przeciążenie clause is actually two penalties (half Speed AND Utrudnienie do
 * ataków). Only Speed is automated. Attack rolls in this system already flow through
 * `combat/*` modules that reason about advantage/disadvantage per-roll, contextually
 * (cover, called shots, etc.) — bolting a blanket "encumbered" disadvantage onto every
 * attack from here would duplicate that machinery instead of extending it, and unlike
 * Speed, disadvantage on a roll everyone can plainly see (a truly enforced, checkable
 * mechanical consequence) is exactly the kind of thing this module's own doctrine says
 * to surface for a human to apply, not silently inject. Flagged as a known gap, not an
 * oversight — revisit only if it actually bites at the table.
 *
 * ## Mechanism: one Active Effect, two possible shapes
 *
 * Unlike Bez dna's binary effect (`actors/bez-dna.mjs`), this one has three actor
 * states (Normalna/Przeciążenie/Unieruchomienie) but only two produce an effect, and
 * each needs a DIFFERENT change: ×0.5 (MULTIPLY) at Przeciążenie, override to 0 at
 * Unieruchomienie — RAW's "spada do 0" is an absolute floor, not a further reduction,
 * so OVERRIDE (not another MULTIPLY/ADD) is the correct mode. `system.attributes.
 * movement.walk` is dnd5e's own canonical key for this — confirmed via
 * `documents/active-effect.mjs`'s `SHIM_FIELDS`, which forwards the older
 * "movement.speed" spelling forward to this exact path, meaning core itself treats
 * `movement.walk` as the current name.
 *
 * Reads `actor.system.attributes.encumbrance` — already computed by dnd5e's own
 * `prepareEncumbrance()` per the RAW thresholds `../config/encumbrance-config.mjs`
 * installs — through the exact same `udzwigStatus()` the bar itself uses
 * (`encumbrance-breakdown.mjs`), so the Speed penalty and what the bar/ruler/hatch show
 * can never disagree about which zone the actor is actually in.
 *
 * ## Sync shape: copied from `bez-dna.mjs`, not reinvented
 *
 * Same fixed 16-char `_id` + `keepId` (a duplicate create can only fail loudly, never
 * actually duplicate), same debounce+per-actor-serialised queue collapsing a burst of
 * calls into one real sync — see that file's header for the exact race this defends
 * against. Extended here with `updateItem` (a quantity/weight edit on gear the actor
 * already owns is the single most common way carried weight actually changes during
 * play — unlike Bez dna, this isn't a binary presence/absence check) and a narrow
 * `updateActor` listener (Siła or Rozmiar changing after a level-up/transformation;
 * the Bez dna multiplier itself is already covered by `createItem`/`deleteItem` on that
 * feat, not this hook).
 */
import { udzwigStatus } from "./encumbrance-breakdown.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
// Dokładnie 16 znaków [A-Za-z0-9] — wymóg Foundry dla _id dokumentu (policzone wprost:
// n-e-u-r-o-U-d-z-w-i-g-S-l-o-w-0 = 16, nie zgadywane — patrz `bez-dna.mjs` po ten sam wymóg).
const EFFECT_ID = "neuroUdzwigSlow0";
const EFFECT_FLAG = "udzwigSlowZone";

const ZONE_CHANGES = {
  przeciazenie: [
    { key: "system.attributes.movement.walk", mode: CONST.ACTIVE_EFFECT_MODES.MULTIPLY, value: "0.5" }
  ],
  nieruchomienie: [
    { key: "system.attributes.movement.walk", mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: "0" }
  ]
};

const ZONE_NAMES = {
  przeciazenie: "Przeciążenie (Udźwig) — ×½ Szybkości",
  nieruchomienie: "Unieruchomienie (Udźwig) — Szybkość 0"
};

function _currentZone(actor) {
  const enc = actor?.system?.attributes?.encumbrance;
  const status = udzwigStatus(enc?.value, enc?.thresholds?.heavilyEncumbered, enc?.thresholds?.maximum);
  return status?.zone ?? "normalna";
}

/**
 * Dopina/aktualizuje/odpina statyczny Active Effect w zależności od aktualnej strefy
 * Udźwigu. Not safe to call concurrently on the same actor without the serialisation
 * below — see the file header (and `bez-dna.mjs`'s, same shape).
 */
async function _syncUdzwigSlowEffect(actor) {
  if (!actor?.effects) return;
  const existing = actor.effects.get(EFFECT_ID) ?? actor.effects.find(e => e.getFlag(MODULE_ID, EFFECT_FLAG));
  const zone = _currentZone(actor);

  if (zone === "normalna") {
    if (existing) await existing.delete();
    return;
  }

  // Already showing the right zone's effect — nothing to write. Unlike Bez dna's ON/OFF
  // effect, this one can be right-but-stale (actor moved from Przeciążenie straight to
  // Unieruchomienie without passing through Normalna), so "exists" alone isn't enough.
  if (existing?.getFlag(MODULE_ID, EFFECT_FLAG) === zone) return;

  const data = {
    _id: EFFECT_ID,
    name: ZONE_NAMES[zone],
    img: "icons/svg/downgrade.svg",
    changes: ZONE_CHANGES[zone],
    flags: { [MODULE_ID]: { [EFFECT_FLAG]: zone } }
  };

  if (existing) {
    await existing.update(data);
    return;
  }

  try {
    await actor.createEmbeddedDocuments("ActiveEffect", [data], { keepId: true });
  } catch (err) {
    // A sibling resync already won the race and created it — not an error from here.
    if (actor.effects.get(EFFECT_ID)) return;
    throw err;
  }
}

/**
 * Debounced, serialised per actor — same shape as `bez-dna.mjs`'s
 * `queueBezDnaSync`/`syncBezDnaEffect`. Collapses a burst of item/actor update calls
 * (quantity edits, a level-up granting several items at once, an import) into one real
 * sync per actor.
 */
const _syncChain = new Map();   // actorId -> tail promise
const _syncTimer = new Map();   // actorId -> debounce timeout

function queueUdzwigSlowSync(actor) {
  if (!actor?.id) return;
  const prev = _syncChain.get(actor.id) ?? Promise.resolve();
  const next = prev.catch(() => {}).then(() => _syncUdzwigSlowEffect(actor));
  _syncChain.set(actor.id, next);
  next.finally(() => { if (_syncChain.get(actor.id) === next) _syncChain.delete(actor.id); });
  return next;
}

function syncUdzwigSlowEffect(actor) {
  if (!actor?.id) return;
  clearTimeout(_syncTimer.get(actor.id));
  _syncTimer.set(actor.id, setTimeout(() => {
    _syncTimer.delete(actor.id);
    queueUdzwigSlowSync(actor);
  }, 150));
}

export function registerUdzwigSlowdown() {
  const resyncFromEmbedded = doc => {
    const actor = doc instanceof Actor ? doc : doc?.parent;
    if (actor instanceof Actor) syncUdzwigSlowEffect(actor);
  };
  // `createItem`/`deleteItem`: gear entering or leaving the pack. `updateItem`: the
  // far more common in-play case — reloading, consuming Prowiant, dropping a stack —
  // none of which create or delete the Item, just change its weight-relevant fields.
  Hooks.on("createItem", resyncFromEmbedded);
  Hooks.on("updateItem", resyncFromEmbedded);
  Hooks.on("deleteItem", resyncFromEmbedded);

  Hooks.on("updateActor", (actor, changes) => {
    const relevant = foundry.utils.hasProperty(changes, "system.abilities.str.value")
      || foundry.utils.hasProperty(changes, "system.traits.size");
    if (relevant) syncUdzwigSlowEffect(actor);
  });

  // Backfill: actors who are already over Udźwig użytkowy when the module loads (an
  // existing character, or a fresh import) get the effect immediately, without waiting
  // for the next inventory edit.
  Hooks.once("ready", () => {
    if (!game.user.isGM) return;
    for (const actor of game.actors) syncUdzwigSlowEffect(actor);
  });

  console.log(`${MODULE_ID} | Udźwig slowdown registered`);
}

/** Czyste-na-tyle-na-ile-się-da API wystawione dla testów Quench — patrz `bez-dna.mjs`'s
 * own `__testing` dla tego samego zastrzeżenia (pisze do prawdziwego dokumentu, ale
 * bezpieczne na `scratchActor`). */
export const __testing = Object.freeze({
  currentZone: _currentZone,
  syncUdzwigSlowEffect: _syncUdzwigSlowEffect,
  EFFECT_ID,
  EFFECT_FLAG
});
