/**
 * Neuroshima 5e — shared "what does this actor's own screen look like" resolver.
 *
 * Sibling to `light-sources.mjs`, deliberately not merged into it: a light source radiates light
 * *other* tokens can see (an `AmbientLight`/token `light` field, world-visible), while a vision
 * device only changes what its own wearer sees (`token.sight.visionMode` + `token.detectionModes`,
 * private to that token's own POV). Different write targets, different actors care about the
 * result, and — per `PLAN_nvg_thermal.md` §6 decision 2 — a deliberately independent exclusivity
 * slot: wearing NVG goggles while your own flashlight is lit is a real bloom/whiteout hazard in
 * reality, but v1 keeps this simple and unconditional (no cross-slot interaction at all). If that
 * turns out to matter at the table, it's a `light-sources.mjs` provider checking `getPowerStatus`-
 * style state on the *vision* item, not something owed to this file.
 *
 * ## Model
 *
 * Same provider/off-switch shape as `light-sources.mjs`: each vision-granting item module
 * (`gogle.mjs`, …) registers a *provider* — `fn(actor)` returns `null` or
 * `{ visionMode, color?, detectionModeId?, detectionRange? }` — and an *off-switch* — `fn(actor,
 * keepItem)` turns off every item *of that module's own type* except `keepItem`. On any change
 * that could affect vision, the item module calls `syncActorVision(actor)`, which asks every
 * registered provider, picks the (at most one, by design) active result, and pushes it to every
 * active token for that actor.
 *
 * Unlike light's "brightest wins" merge (multiple lit items can coexist, only the rendered result
 * needs picking), vision devices are meant to be mutually exclusive by construction — you wear one
 * pair of goggles at a time. If two providers somehow both return non-null at once, that means an
 * off-switch failed to do its job; `_bestVision` logs a warning and picks the first, rather than
 * silently guessing which one should render.
 *
 * ## Why `sight`/`detectionModes` don't need `light-sources.mjs`'s companion-document dance
 *
 * A light source needed a second, GM-only `AmbientLight` document because Foundry's cone lights
 * can't express two independently-angled cones on one `TokenDocument.light`. Vision has no such
 * limitation: `sight` and `detectionModes` are already fields on the token's own document, already
 * player-writable (same permission tier as `light` — no GM gate needed here). Both `sight` and
 * `detectionModes` are keyed/nested object fields (`detectionModes` is a `TypedObjectField` in
 * v14 — confirmed live against `common/documents/token.mjs`, `{[id]: {enabled, range}}`, NOT the
 * array shape `dev/packs/build-packs.mjs`'s bestiary builder writes into an offline-imported
 * LevelDB source doc — a different pipeline, irrelevant to a live `update()` call), so a dot-path
 * partial write reaches exactly one key without disturbing its siblings — same mechanism this
 * project already relies on for flags (`flags.MOD.-=key` deletion, used throughout
 * `latarka.mjs`/`gogle.mjs`), just applied to `sight.*`/`detectionModes.*` instead. Writing only
 * `sight.visionMode`/`sight.color` this way leaves whatever `range`/`angle`/`attenuation` dnd5e's
 * own sense computation (darkvision, etc.) already set completely untouched.
 *
 * To add/remove exactly the one `detectionModes` entry a device is responsible for — without
 * clobbering some *other* mode a token might carry, or losing track of which entry was ours to
 * remove once a device turns off — this file tracks "the detection mode id we last applied" on a
 * token flag (`VISION_DETECTION_FLAG`) — same bookkeeping pattern
 * `light-sources.mjs` uses for its `companionLightId` flag, just simpler: no embedded document to
 * create/delete, only an array entry to add/remove.
 *
 * ## `sightRange` is the mechanic; `visionMode` is only the paint
 *
 * Caught live (reported by the GM testing Noktowizor on Piekarz, `dev/bestiary/bestiary.json`
 * confirms this ruleset's own darkvision-equivalent creature sense is a genuine range grant, not a
 * color filter): the first cut of this file only ever touched `sight.visionMode`/`sight.color`.
 * That's real, but it's the *cosmetic* half — a green tint and a brightness boost on whatever the
 * token can *already* perceive. What actually determines how far into total darkness a token can
 * perceive anything at all (independent of ambient light) is `token.sight.range`, consumed by
 * core's `basicSight` DetectionMode (`DetectionModeDarkvision` — unconditional except for
 * blinded/invisible checks, gated purely by that range). A token with no darkvision sits at
 * whatever baseline its own `sight.range` happens to hold regardless of `visionMode` — NOT
 * "near-zero" as first assumed from Piekarz alone: a later audit (`normalize-sight-range.mjs`)
 * found the whole batch-imported cast sitting on inconsistent per-actor values (0–9m, no
 * correlation to WIS/Perception/anything else), since normalized to one deliberate small
 * baseline (`BASELINE_SIGHT_RANGE`, a GM call: enough to spot your own token and feel what's at
 * arm's reach, not RAW's full "no sense = no sight"). Whatever that baseline is, swapping to
 * `lightAmplification` alone re-colors and brightens whatever's already lit but never reveals so
 * much as one more unlit tile beyond it — exactly the "looks like NVG, doesn't act like
 * Noktowizja" bug reported.
 *
 * The fix, mirroring how this codebase already grants creature darkvision
 * (`dev/packs/build-packs.mjs`'s `sight: {range: c.senses?.darkvision ?? 0, visionMode: "basic"}`
 * — plain range + plain vision mode, no special coloring at all): a provider that should grant
 * real darkness-penetrating sight (RAW's "sees in darkness almost as well as day") sets
 * `sightRange`, and this file overrides `token.sight.range` to that value for as long as the
 * device is active, layering whatever `visionMode` on top purely for look-and-feel. The token's
 * own pre-override range is stashed on a token flag (`VISION_RANGE_BACKUP_FLAG`) the first time an
 * override is applied and restored verbatim the moment no provider asks for one — same
 * backup/restore shape as the `detectionModes` bookkeeping above, just for a scalar instead of a
 * keyed entry. A provider that only wants the color/exposure effect (no darkness-penetration
 * claim) simply omits `sightRange` and nothing here touches the token's own range at all.
 */

const MODULE_ID = "neuroshima-2026-overrides";
const VISION_DETECTION_FLAG = "visionDetectionId"; // id of the detectionModes entry we last wrote
const VISION_RANGE_BACKUP_FLAG = "visionRangeBackup"; // token's own sight.range, before we overrode it

/** @type {((actor: Actor) => object|null)[]} */
const _providers = [];

/**
 * Register a vision provider. `fn(actor)` must return either `null` (this provider has nothing
 * active for this actor right now) or `{ visionMode, color?, sightRange?, detectionModeId?,
 * detectionRange? }`. `visionMode` is a `CONFIG.Canvas.visionModes` id (e.g.
 * `"lightAmplification"`, or this module's own `TERMOWIZJA_VISION_ID`). `sightRange`, if present,
 * overrides `token.sight.range` for as long as this provider stays active — see this file's
 * "sightRange is the mechanic, visionMode is the paint" doc section below for why a device
 * granting actual darkness-penetrating sight (not just a color filter) needs this.
 * `detectionModeId`/`detectionRange`, if present, add one entry to the token's `detectionModes`
 * object for as long as this provider stays active.
 */
export function registerVisionProvider(fn) {
  _providers.push(fn);
}

/** @type {((actor: Actor, keepItem: Item) => Promise<void>)[]} */
const _offSwitches = [];

/**
 * Register an "off switch": `fn(actor, keepItem)` turns off every active vision device *of this
 * module's own type* on `actor` except `keepItem`. Called by `enforceSingleVisionSource`.
 */
export function registerVisionOffSwitch(fn) {
  _offSwitches.push(fn);
}

/**
 * Only one vision device may be active per actor at a time — you wear one pair of goggles, not
 * two, and Noktowizor/Termowizor are mutually exclusive with each other for the same reason. Call
 * this from a device's own "put on"/"turn on" function, right after that item's own state is
 * committed and before `syncActorVision` — same call order `enforceSingleLightSource` requires,
 * same reasoning.
 */
export async function enforceSingleVisionSource(actor, keepItem) {
  if (!actor) return;
  for (const fn of _offSwitches) {
    try { await fn(actor, keepItem); } catch (e) { console.warn(`${MODULE_ID} | vision-sources: off-switch threw`, e); }
  }
}

function _bestVision(actor) {
  let best = null;
  let extras = 0;
  for (const provider of _providers) {
    let candidate;
    try {
      candidate = provider(actor);
    } catch (e) {
      console.warn(`${MODULE_ID} | vision-sources: provider threw`, e);
      continue;
    }
    if (!candidate) continue;
    if (!best) best = candidate;
    else extras++;
  }
  if (extras > 0) {
    console.warn(`${MODULE_ID} | vision-sources: ${extras} extra active vision provider(s) on `
      + `"${actor?.name}" — an off-switch should have prevented this; rendering the first found.`);
  }
  return best;
}

/** Per-actor serialization queue — same race-condition guard as `light-sources.mjs`'s `_chains`. */
const _chains = new Map();

async function _doSyncActorVision(actor) {
  const desired = _bestVision(actor);

  // `getActiveTokens()` is scoped to `canvas.scene` (confirmed live against
  // `client/documents/actor.mjs`: it calls `getDependentTokens({linked, scenes: canvas.scene})`
  // and drops anything not on the *currently viewed* scene) — the wrong primitive here. A vision
  // toggle must land on the wearer's placed token regardless of which scene the client that fired
  // the update happens to be looking at right now: the GM console, a macro, or a hook replaying on
  // a second connected client can all run this while viewing a different scene than the one the
  // token actually sits on, and `getActiveTokens` would then silently find nothing and no-op.
  // Caught live: an equip+turnOn sequence run while the GM's own client was on the wrong scene
  // updated nothing, with no error anywhere, reproducing exactly the "toggled on, zero visible
  // effect" bug report this comment is now attached to. `getDependentTokens({linked})` with no
  // `scenes` filter walks every scene the actor has a token on, which is what a token-document-only
  // write (no canvas/placeable access needed) should have used from the start.
  for (const doc of actor.getDependentTokens?.({ linked: true }) ?? []) {
    if (!(game.user.isGM || doc.isOwner)) continue;

    const wantMode = desired?.visionMode ?? "basic";
    const wantColor = desired?.color ?? null;
    const update = {};
    if (doc.sight?.visionMode !== wantMode) update["sight.visionMode"] = wantMode;
    if ((doc.sight?.color ?? null) !== wantColor) update["sight.color"] = wantColor;

    // sightRange: see this file's "sightRange is the mechanic" doc section. Stash the token's own
    // range before the *first* override so it can be restored exactly, not just zeroed, once no
    // provider wants one anymore — a second device applying a *different* override reuses the
    // same backup rather than overwriting it with the previous device's already-overridden value.
    const rangeBackup = doc.getFlag(MODULE_ID, VISION_RANGE_BACKUP_FLAG);
    const hasBackup = rangeBackup != null;
    const wantRangeOverride = desired?.sightRange != null;

    if (wantRangeOverride) {
      if (!hasBackup) update[`flags.${MODULE_ID}.${VISION_RANGE_BACKUP_FLAG}`] = doc.sight?.range ?? 0;
      if (doc.sight?.range !== desired.sightRange) update["sight.range"] = desired.sightRange;
    } else if (hasBackup) {
      update["sight.range"] = rangeBackup;
      update[`flags.${MODULE_ID}.-=${VISION_RANGE_BACKUP_FLAG}`] = null;
    }

    // `detectionModes` is a `TypedObjectField` (confirmed live against v14's schema,
    // `common/documents/token.mjs`) — a plain object keyed by mode id (`{[id]: {enabled,
    // range}}`), NOT the array this file's first draft assumed by copying
    // `dev/packs/build-packs.mjs`'s bestiary-builder shape (that code writes into an
    // offline-imported LevelDB source doc, a different pipeline that may tolerate/migrate a
    // different shape — irrelevant here, this runs against a live `TokenDocument#update()`).
    // Dot-path partial writes are the correct tool for a keyed object field, same as this
    // project already relies on for flags (`flags.MOD.-=key` deletion) — no need to read-merge-
    // rewrite the whole object.
    const prevOurs = doc.getFlag(MODULE_ID, VISION_DETECTION_FLAG) ?? null;
    const nextId = desired?.detectionModeId ?? null;
    const nextRange = desired?.detectionRange ?? 0;

    if (prevOurs && prevOurs !== nextId) update[`detectionModes.-=${prevOurs}`] = null;
    if (nextId) {
      const cur = doc.detectionModes?.[nextId];
      if (!cur || cur.enabled !== true || cur.range !== nextRange) {
        update[`detectionModes.${nextId}`] = { enabled: true, range: nextRange };
      }
    }

    const flagStale = prevOurs !== nextId;
    if (Object.keys(update).length === 0 && !flagStale) continue;

    try {
      if (Object.keys(update).length) await doc.update(update);
      if (flagStale) {
        if (nextId) await doc.setFlag(MODULE_ID, VISION_DETECTION_FLAG, nextId);
        else await doc.unsetFlag(MODULE_ID, VISION_DETECTION_FLAG);
      }
    } catch (e) {
      console.warn(`${MODULE_ID} | vision-sources: nie udało się zsynchronizować widzenia tokena`, e);
    }
  }
}

/**
 * Recompute and push the actor's vision onto every active token it owns. Safe to call anytime
 * anything might have changed — putting goggles on/off, equipping, unequipping, battery dying.
 * Same per-actor serialization as `syncActorLight` — see that function's doc comment for why a
 * bare "compute then write" body isn't enough when overlapping calls can land out of order.
 */
export function syncActorVision(actor) {
  if (!actor) return Promise.resolve();
  const prior = _chains.get(actor.id) ?? Promise.resolve();
  const next = prior
    .then(() => _doSyncActorVision(actor))
    .catch((e) => console.warn(`${MODULE_ID} | vision-sources: sync chain error`, e));
  _chains.set(actor.id, next);
  return next;
}

/**
 * Re-sync every actor's vision on token placement — a token forks from `prototypeToken` at
 * creation and won't otherwise pick up whatever's already worn in the actor's inventory.
 */
export function registerVisionSources() {
  Hooks.on("createToken", (tokenDoc) => { if (tokenDoc.actor) syncActorVision(tokenDoc.actor); });
  console.log(`${MODULE_ID} | Vision-source resolver registered`);
}
