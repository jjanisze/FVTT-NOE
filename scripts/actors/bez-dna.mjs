/**
 * Neuroshima 5e — Bez dna (jedna z trzech klauzul Sztuczki „Pakowanie", `sztuczki-data.mjs`).
 *
 * RAW anchor (podręcznik, "PAKOWANIE"): "Bez dna. Twój Udźwig użytkowy i maksymalny rośnie
 * dwukrotnie." Requested live: "Raynald has Bez Dna. This Sztuczka should be modelled... should
 * effect carry weight" + a badge in the Ekwipunek view. Found on Raynald as a bare-name feat
 * (Roll20-migration shape, no compendium flag) — TWICE over, in two different capitalisations
 * ("Bez Dna" and "Bez dna"), same class of duplicate this session already found for "Kolczatka"/
 * "laptop wojskowy (narzedzi hackera)". Deduplicated live, not fixed by this file — `hasAbility`
 * below only needs ONE matching item to resolve true either way, duplicates or not.
 *
 * The other two clauses of "Pakowanie" are NOT this file's concern: the +1 INT/MDR ability bump
 * is (per `sztuczki-data.mjs`'s own file header) never counted as automation in this project, and
 * "Mam pod ręką [I]" (free-interaction item pull) is left manual — see `pakowanie.manual`.
 *
 * ## Mechanism: a real Active Effect, not a hand-patched number
 *
 * `system.attributes.encumbrance.multipliers.overall` is dnd5e's own, first-class hook for
 * exactly this ("Initialize base encumbrance fields to be targeted by active effects" — core's
 * own `attributes.mjs` doc comment) — confirmed by reading `prepareEncumbrance()` directly:
 * `overall` multiplies EVERY threshold (`encumbered`, `heavilyEncumbered`, `maximum`), which is
 * exactly "Udźwig użytkowy I maksymalny" (both, not just the hard cap). A native `MULTIPLY`
 * Active Effect means dnd5e's own derived-data pipeline applies it automatically on every
 * preparation cycle — no hook needed to re-run the math by hand — and the existing carry-weight
 * bar (`encumbrance-breakdown.mjs`) picks up the new, doubled max for free, since it only ever
 * reads the native bar's already-correct `aria-valuemax`.
 *
 * ## Detection: `hasAbility`, not a bespoke regex
 *
 * Uses the shared bridge (`actors/abilities.mjs`) — covers a real compendium-flagged Sztuczka
 * item AND Raynald's actual flagless bare-name shape via its built-in alias fallback, rather than
 * duplicating `_hasFeat`-style matching a third time (see `sztuczki-bridge.test.mjs`'s own doc
 * comment: the name-only fallback used by `melee-maneuvers.mjs`/`toolkit-medyk.mjs` is called out
 * there as the fragile path — `abilities.mjs` is the newer, tested, shared one).
 *
 * ## Sync shape: copied from `cichy-krok.mjs`, not reinvented
 *
 * Same fixed 16-char `_id` + `keepId` (a duplicate create can only fail loudly, never actually
 * duplicate), same debounce+per-actor-serialised queue collapsing a burst of `createItem` calls
 * from a single level-up/import into one real sync, same `createItem`/`deleteItem` + `ready`-time
 * backfill wiring. `cichy-krok.mjs`'s own header documents the exact race this defends against
 * (found live on Victor) — not re-derived here, three of these in one codebase already (this one,
 * `cichy-krok.mjs`, and this same session's medyk-refill duplicate-activity bug) is enough.
 *
 * ## Duplicates blocked, not just harmlessly ignored (2026-09-06, follow-up)
 *
 * `hasAbility` is boolean — a second matching feat changes nothing the moment it's checked, so
 * Raynald's own real duplicates ("Bez Dna" + "Bez dna") never risked a double multiplier. But
 * "doesn't break anything" and "should exist" are different questions — requested live: a second
 * copy grants nothing extra, so it shouldn't be creatable at all. `_onPreCreateItem` blocks it
 * going forward; it does not retroactively clean up what's already on a sheet (that was a one-off
 * live fix on Raynald specifically, not this guard's job).
 */
import { ABILITY_KEYS, ABILITY_DEFINITIONS, hasAbility } from "./abilities.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
// Musi być dokładnie 16 znaków [A-Za-z0-9] — wymóg Foundry dla _id dokumentu (policzone wprost:
// n-e-u-r-o-B-e-z-D-n-a-0-0-0-0-1 = 16, nie zgadywane).
const EFFECT_ID = "neuroBezDna00001";
const EFFECT_FLAG = "bezDnaEffect";
const MULTIPLIER = 2;

function _hasBezDna(actor) {
  return hasAbility(actor, ABILITY_KEYS.BEZ_DNA);
}

/**
 * Whether a single (not-yet-necessarily-embedded) item would, on its own, grant Bez dna —
 * same two shapes `getResolvedAbility` checks (compendium flag / bare-name alias), applied to
 * ONE candidate item instead of an actor's whole list. Kept separate from `abilities.mjs` rather
 * than reusing `getResolvedAbility` on a throwaway `{items:[item]}` stand-in — that would work,
 * but reads like a hack; this reads like what it is.
 */
function _itemGrantsBezDna(item) {
  if (item?.getFlag?.(MODULE_ID, "sztuczka") === "pakowanie") return true;
  const aliases = ABILITY_DEFINITIONS[ABILITY_KEYS.BEZ_DNA]?.aliases ?? [];
  const name = String(item?.name ?? "").trim().toLowerCase();
  return aliases.some(alias => name.includes(alias));
}

/**
 * Requested live (2026-09-06): "Multiple instances of Bez Dna don't do anything. They shouldn't
 * be allowed." — `hasAbility` is boolean (a second matching item changes nothing, the Active
 * Effect is created/left alone exactly the same either way), so a duplicate is pure sheet clutter
 * at best, confusing at worst. Blocks creating a SECOND feat that would grant Bez dna once the
 * actor already has one — covers both a fresh compendium drag and another hand-typed Roll20-style
 * stand-in. Does not touch anything already on a sheet (Raynald's own pre-existing duplicates were
 * fixed live, once, directly — not by this guard, which only ever looks forward).
 */
function _onPreCreateItem(item, _data, _options, _userId) {
  if (item?.type !== "feat") return;
  const actor = item.actor;
  if (!actor) return;
  if (!_itemGrantsBezDna(item)) return;
  if (!_hasBezDna(actor)) return; // this would be the first one — nothing to block

  ui.notifications.warn(
    `${actor.name} ma już Sztuczkę „Bez dna” (Pakowanie) — druga kopia nic by nie dodała `
    + `(Udźwig nie sumuje się), więc nie została utworzona.`
  );
  return false;
}

/**
 * Dopina/odpina statyczny Active Effect w zależności od tego, czy aktor aktualnie ma "Bez dna".
 * Not safe to call concurrently on the same actor without the serialisation below — see the
 * file header. `keepId` means a duplicate create can only ever fail loudly, never actually
 * duplicate the effect; the try/catch avoids an unhandled promise rejection on the losing call(s).
 */
async function _syncBezDnaEffect(actor) {
  if (!actor?.effects) return;
  const existing = actor.effects.get(EFFECT_ID) ?? actor.effects.find(e => e.getFlag(MODULE_ID, EFFECT_FLAG));
  const should = _hasBezDna(actor);

  if (!should) {
    if (existing) await existing.delete();
    return;
  }
  if (existing) return; // stan binarny, bez poziomów — nic do zsynchronizowania

  try {
    await actor.createEmbeddedDocuments("ActiveEffect", [{
      _id: EFFECT_ID,
      name: "Bez dna (Pakowanie)",
      img: "icons/svg/upgrade.svg",
      changes: [{
        key: "system.attributes.encumbrance.multipliers.overall",
        mode: CONST.ACTIVE_EFFECT_MODES.MULTIPLY,
        value: String(MULTIPLIER),
        priority: 20
      }],
      flags: { [MODULE_ID]: { [EFFECT_FLAG]: true } }
    }], { keepId: true });
  } catch (err) {
    // A sibling resync already won the race and created it — not an error from here.
    if (actor.effects.get(EFFECT_ID)) return;
    throw err;
  }
}

/**
 * Debounced, serialised per actor — same shape as `cichy-krok.mjs`'s `queueCichyKrokSync`/
 * `syncCichyKrokTerrain`. Collapses a burst of `createItem` calls (one per granted item on a
 * single level-up/import, all unawaited) into one real sync.
 */
const _syncChain = new Map();   // actorId -> tail promise
const _syncTimer = new Map();   // actorId -> debounce timeout

function queueBezDnaSync(actor) {
  if (!actor?.id) return;
  const prev = _syncChain.get(actor.id) ?? Promise.resolve();
  const next = prev.catch(() => {}).then(() => _syncBezDnaEffect(actor));
  _syncChain.set(actor.id, next);
  next.finally(() => { if (_syncChain.get(actor.id) === next) _syncChain.delete(actor.id); });
  return next;
}

function syncBezDnaEffect(actor) {
  if (!actor?.id) return;
  clearTimeout(_syncTimer.get(actor.id));
  _syncTimer.set(actor.id, setTimeout(() => {
    _syncTimer.delete(actor.id);
    queueBezDnaSync(actor);
  }, 150));
}

export function registerBezDna() {
  Hooks.on("preCreateItem", _onPreCreateItem);

  const resync = doc => {
    const actor = doc instanceof Actor ? doc : doc?.parent;
    if (actor instanceof Actor) syncBezDnaEffect(actor);
  };
  Hooks.on("createItem", resync);
  Hooks.on("deleteItem", resync);

  // Backfill: postacie, które już mają Sztuczkę (np. Raynald), dostają efekt od razu, bez
  // czekania na kolejny createItem. Różne aktory nie dzielą stanu, więc bez serializacji tej pętli.
  Hooks.once("ready", () => {
    if (!game.user.isGM) return;
    for (const actor of game.actors) syncBezDnaEffect(actor);
  });

  console.log(`${MODULE_ID} | Bez dna registered`);
}

/** Czyste-na-tyle-na-ile-się-da API wystawione dla testów Quench — Warstwa 4/5 (TESTING.md).
 * `syncBezDnaEffect` pisze do prawdziwego dokumentu, więc to nie jest ściśle "czysta funkcja",
 * ale nie dotyka `canvas` ani dialogów — bezpieczne na `scratchActor`. */
export const __testing = Object.freeze({
  hasBezDna: _hasBezDna,
  itemGrantsBezDna: _itemGrantsBezDna,
  syncBezDnaEffect: _syncBezDnaEffect,
  onPreCreateItem: _onPreCreateItem,
  EFFECT_ID,
  EFFECT_FLAG
});
