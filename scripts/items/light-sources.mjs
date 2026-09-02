/**
 * Neuroshima 5e — shared "what's this actor's active light source" resolver.
 *
 * `pochodnia.mjs`'s own doc comment flagged this exact gap: its `syncTokenLight` overwrites
 * `token.light` rather than layering, "fine while this is the only light-granting item in the
 * module, but worth knowing if a second one ever ships." `latarka.mjs` is that second one, so
 * this is the fix — one place that knows about every light-granting item type, instead of two
 * (soon three, with Lampa Naftowa) private implementations each fighting the other for
 * `token.light` on every equip/ignite/toggle.
 *
 * ## Model
 *
 * Each light-granting item module (Pochodnia, Latarka, …) registers a *provider*: a function
 * that looks at one actor and returns the light it wants active right now, or `null`. On any
 * change that could affect illumination, that module calls `syncActorLight(actor)` here, which
 * asks every registered provider, picks the brightest result, and pushes it to every active
 * token for that actor — same idempotent "skip if unchanged" guard `pochodnia.mjs` already had,
 * now shared instead of duplicated.
 *
 * "Brightest" is compared by `dim` radius (a light's total useful reach), not `bright` — a
 * flashlight's 180 m dim throw should win over a torch's 12 m dim ring even though the torch's
 * *bright* ring is nominally wider up close. Ties fall back to `bright`.
 *
 * ## Two cones, one small inside one big — the part v1 got wrong
 *
 * A flashlight isn't one ring, it's two overlapping *cones* of different width: a narrow bright
 * spot (45°) sitting entirely inside a wider dim spill (90°). The wrong first cut collapsed both
 * into a single 90°-wide light with bright out to 45m and dim beyond it — which puts BRIGHT
 * everywhere in the 90° cone out to 45m, including the two side wedges (22.5°–45° off centre)
 * that RAW says should be dim *immediately*, right next to the token, not just "dim past 45m."
 * In a room smaller than 45m (most of them), that bug is invisible-by-omission: everything
 * visible reads as uniformly bright, no dim ring anywhere, because the geometry never even
 * reaches the point where the two cones' behaviour would diverge.
 *
 * Foundry's `LightData` only has one `angle` per light, so one `TokenDocument.light` can't
 * express two different cone widths at once. A provider that needs this shape returns an extra
 * `narrowAngle` (and `bright` becomes that narrow cone's *own* radius, since it doesn't need a
 * separate dim ring of its own — see `_doSyncActorLight`). When present, this resolver builds
 * *two* light sources instead of one:
 *   - the token's own `light` field: the WIDE cone, dim-only (`bright: 0`, `dim`, the wide `angle`)
 *   - a companion `AmbientLight` placed at the token's position: the NARROW cone, fully bright
 *     out to its own radius (`bright === dim`), rotation mirroring the *token's own* `rotation`
 *     field — confirmed live that `TokenDocument.light` has no `rotation` field of its own; a
 *     cone-angle token light always points wherever the token itself faces, which is also
 *     exactly what a player already does to aim it: drag-rotate the token like any other facing,
 *     no separate control needed. Kept glued to the token (position + rotation) via
 *     `updateToken`/`deleteToken` hooks, tracked by a flag on the token so it survives a reload.
 *
 * Creating/updating/deleting a Scene's embedded `AmbientLight` is GM-only by default Foundry
 * permissions (unlike a token's own fields, which an owning player can update) — so the actual
 * write is gated to `game.user.isGM`. A player's own client still updates their token's wide
 * light fine; the narrow companion catches up via the GM's client independently reacting to the
 * same underlying document change, same as any other GM-mediated automation in this module.
 *
 * This module owns no fuel/state of its own — it's pure plumbing between "N items know if
 * they're lit" and "1 token knows what its light looks like."
 */

const MODULE_ID = "neuroshima-2026-overrides";
const COMPANION_FLAG = "companionLightId";

/** @type {((actor: Actor) => object|null)[]} */
const _providers = [];

/**
 * Register a light provider. `fn(actor)` must return either `null` (this provider has nothing
 * lit for this actor right now) or `{ bright, dim, angle?, narrowAngle?, color?, alpha?,
 * animation? }`. `narrowAngle`, if present, is the width of the inner bright cone (nested
 * inside the wider `angle` cone) — see this file's doc comment.
 */
export function registerLightProvider(fn) {
  _providers.push(fn);
}

function _bestLight(actor) {
  let best = null;
  for (const provider of _providers) {
    let candidate;
    try {
      candidate = provider(actor);
    } catch (e) {
      console.warn(`${MODULE_ID} | light-sources: provider threw`, e);
      continue;
    }
    if (!candidate) continue;
    if (!best || candidate.dim > best.dim || (candidate.dim === best.dim && candidate.bright > best.bright)) {
      best = candidate;
    }
  }
  return best;
}

/**
 * Per-actor serialization queue for `syncActorLight` — see that function's doc comment for
 * why a bare "compute then write" body isn't enough here.
 */
const _chains = new Map();

async function _doSyncActorLight(actor) {
  const desired = _bestLight(actor);
  const hasNarrow = desired?.narrowAngle != null;

  // Always a *complete* light object, every field explicit — never a partial one. `update()`
  // recursively merges partial embedded-schema objects, so a partial "off" write (just
  // bright/dim/angle) would leave a previous light's color/alpha/animation stranded on the
  // token even after nothing is lit anymore. Full replacement sidesteps that whole class of bug.
  const wideLight = desired
    ? {
        bright: hasNarrow ? 0 : desired.bright,
        dim: desired.dim,
        angle: desired.angle ?? 360,
        color: desired.color ?? null,
        alpha: desired.alpha ?? 0.35,
        animation: desired.animation ?? { type: "", speed: 0, intensity: 0 },
      }
    : { bright: 0, dim: 0, angle: 360, color: null, alpha: 0.5, animation: { type: "", speed: 0, intensity: 0 } };

  for (const token of actor.getActiveTokens?.(true) ?? []) {
    if (game.user.isGM || token.isOwner) {
      const cur = token.document.light;
      const changed = cur.bright !== wideLight.bright || cur.dim !== wideLight.dim || cur.angle !== wideLight.angle
        || cur.color !== wideLight.color || cur.animation?.type !== wideLight.animation.type;
      if (changed) {
        try {
          await token.document.update({ light: wideLight });
        } catch (e) {
          console.warn(`${MODULE_ID} | light-sources: nie udało się zsynchronizować światła tokena`, e);
        }
      }
    }

    // Companion narrow cone — independent of whether the wide field above changed, since the
    // token could move/rotate without the light state itself changing. A cone-angle token light
    // has no `rotation` field of its own (confirmed live — `TokenDocument.light`'s schema simply
    // doesn't have one); it always points wherever the *token itself* is rotated. So does the
    // wide light already, automatically, for free — the companion has to be told explicitly
    // since it's a separate document, so `_syncCompanionLight` reads the pose off the token.
    await _syncCompanionLight(token, hasNarrow ? {
      narrowAngle: desired.narrowAngle,
      bright: desired.bright,
      color: desired.color, alpha: desired.alpha, animation: desired.animation,
    } : null);
  }
}

/**
 * Create/update/delete the narrow-cone companion `AmbientLight` glued to one token. GM-only
 * write (see this file's doc comment); a non-GM caller's computation is harmless but skipped.
 */
async function _syncCompanionLight(token, desired) {
  if (!game.user.isGM) return;
  const doc = token.document;
  const scene = token.scene;
  if (!scene) return;

  const existingId = doc.getFlag(MODULE_ID, COMPANION_FLAG);
  const existing = existingId ? scene.lights.get(existingId) : null;

  if (!desired) {
    if (existing) { try { await existing.delete(); } catch (e) { console.warn(`${MODULE_ID} | light-sources: companion delete failed`, e); } }
    if (existingId) { try { await doc.unsetFlag(MODULE_ID, COMPANION_FLAG); } catch (e) { /* token may already be gone */ } }
    return;
  }

  // `_source`, not the prepared fields: while a token is moving/turning, Foundry overwrites the
  // *prepared* `x`/`y`/`rotation` on the TokenDocument with the current animation frame's
  // interpolated values (`Token##animateFrame` → `mergeObject(this.document, this.#animationData)`).
  // `updateToken` fires when that animation is still at frame zero, so `token.center` and
  // `token.document.rotation` still read the token's *previous* pose — which is exactly the
  // one-move-behind companion. `_source` holds the committed post-update value. Core does the
  // same thing wherever it needs a token's real pose mid-animation (see `Token#_getDragOrigin`).
  const src = token.document._source;
  const center = token.document.getCenterPoint(src);
  const cfg = {
    x: center.x,
    y: center.y,
    rotation: src.rotation,
    walls: true,
    config: {
      angle: desired.narrowAngle,
      bright: desired.bright,
      dim: desired.bright, // fully bright out to its own radius — the wide cone supplies dim beyond it
      color: desired.color ?? null,
      alpha: desired.alpha ?? 0.5,
      animation: desired.animation ?? { type: "", speed: 0, intensity: 0 },
    },
  };

  if (existing) {
    // Diff against `_source`, not the prepared fields: `_glueCompanionToToken` below animates the
    // prepared `x`/`y`/`rotation` client-side every frame, so they don't describe what's actually
    // stored. `_source` does.
    const e = existing._source;
    const c = e.config;
    const changed = e.x !== cfg.x || e.y !== cfg.y || e.rotation !== cfg.rotation
      || c.angle !== cfg.config.angle || c.bright !== cfg.config.bright || c.dim !== cfg.config.dim
      || c.color !== cfg.config.color;
    if (changed) {
      try { await existing.update(cfg); } catch (e) { console.warn(`${MODULE_ID} | light-sources: companion update failed`, e); }
    }
  } else {
    try {
      const [created] = await scene.createEmbeddedDocuments("AmbientLight", [cfg]);
      await doc.setFlag(MODULE_ID, COMPANION_FLAG, created.id);
    } catch (e) {
      console.warn(`${MODULE_ID} | light-sources: companion create failed`, e);
    }
  }
}

/**
 * Keep the companion cone visually glued to the token *during* its move/turn animation.
 *
 * The document write in `_syncCompanionLight` commits the token's final pose the moment the move
 * is confirmed — correct, but it lands a full animation ahead of the token, so on a long drag the
 * narrow cone would sit at the destination for ~a second while the token (and its natively-animated
 * wide cone) slid over to meet it. This closes that gap purely client-side: no document write, no
 * network traffic, just the same trick core itself uses to animate a token's own light — mutate the
 * *prepared* `x`/`y`/`rotation` (which is what `AmbientLight#_getLightSourceData` reads) and re-init
 * the source. `prepareData()` restores them from `_source` on the next real update, so nothing here
 * can persist or drift. Runs on every client, GM or not, since it only touches local render state.
 */
function _glueCompanionToToken(token) {
  if (token.isPreview) return;
  const lightId = token.document.getFlag(MODULE_ID, COMPANION_FLAG);
  if (!lightId) return;
  const light = token.scene?.lights.get(lightId);
  const object = light?.object;
  if (!object || object.destroyed) return;

  const { x, y } = token.document.getCenterPoint();
  const rotation = token.document.rotation;
  if (light.x === x && light.y === y && light.rotation === rotation) return;

  light.x = x;
  light.y = y;
  light.rotation = rotation;
  object.initializeLightSource();
  object.renderFlags.set({ refreshPosition: true, refreshRotation: true, refreshField: true });
}

/**
 * Recompute and push the actor's light onto every active token it owns. Safe to call anytime
 * anything might have changed — igniting, extinguishing, equipping, unequipping, battery dying.
 *
 * Calls for the same actor are serialized into a chain, not run concurrently: `_bestLight`
 * reads live item state at the moment it *runs*, not at the moment it's called, so two
 * overlapping calls (e.g. the `createToken` hook's own sync racing a `turnOn`/`igniteTorch`
 * call fired moments later) can commit their `token.document.update()` writes in the opposite
 * order from which they were triggered — the earlier, stale "nothing lit yet" write landing
 * *after* the correct one, silently clobbering it back to dark. Chaining behind whatever's
 * already in flight for this actor guarantees writes commit in call order, so the most recent
 * call always wins, regardless of how the underlying document-update round-trip gets scheduled.
 */
export function syncActorLight(actor) {
  if (!actor) return Promise.resolve();
  const prior = _chains.get(actor.id) ?? Promise.resolve();
  const next = prior
    .then(() => _doSyncActorLight(actor))
    .catch((e) => console.warn(`${MODULE_ID} | light-sources: sync chain error`, e));
  _chains.set(actor.id, next);
  return next;
}

/**
 * Re-sync every actor's light on token placement — a token forks from `prototypeToken` at
 * creation and won't otherwise pick up whatever's already lit in the actor's inventory. Also
 * re-sync on token move/rotate (keeps a narrow-cone companion glued in place) and clean up the
 * companion on token deletion so it doesn't outlive the token it was following.
 */
export function registerLightSources() {
  Hooks.on("createToken", (tokenDoc) => { if (tokenDoc.actor) syncActorLight(tokenDoc.actor); });

  Hooks.on("updateToken", (tokenDoc, changes) => {
    if (!tokenDoc.actor) return;
    const moved = foundry.utils.hasProperty(changes, "x") || foundry.utils.hasProperty(changes, "y");
    const rotated = foundry.utils.hasProperty(changes, "rotation");
    if (moved || rotated) syncActorLight(tokenDoc.actor);
  });

  Hooks.on("refreshToken", (token, flags) => {
    if (flags?.refreshPosition || flags?.refreshRotation) _glueCompanionToToken(token);
  });

  Hooks.on("deleteToken", async (tokenDoc) => {
    if (!game.user.isActiveGM) return;
    const lightId = tokenDoc.getFlag(MODULE_ID, COMPANION_FLAG);
    if (!lightId) return;
    const light = tokenDoc.parent?.lights.get(lightId);
    if (light) { try { await light.delete(); } catch (e) { console.warn(`${MODULE_ID} | light-sources: orphaned companion cleanup failed`, e); } }
  });

  console.log(`${MODULE_ID} | Light-source resolver registered`);
}
