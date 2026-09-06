/**
 * Neuroshima 5e — Pistolet na Race: "Wystrzel flarę" utility activity.
 *
 * ## The gap this closes
 *
 * `config/weapons-data.mjs`'s `pistolet-na-race` entry already says, in its own doc comment,
 * that the weapon's "main use is signaling and lighting up the point of impact/throw (see
 * items/flara.mjs) — the damage below is only what happens when someone shoots the flare
 * straight at someone." That comment was written, but the actual link to `items/flara.mjs`
 * was never built — only the combat side (the catalog's `damage`/`range`, wired up through the
 * normal weapon ATAK/OBRAŻENIA activities like any other firearm) shipped. Live-tested
 * (2026-09-06): Raynald loaded the weapon, fired its ATAK activity at a target, hit — and got
 * only an attack/damage roll, no light, no way to "drop the flare" anywhere. This file is the
 * missing half: a second, independent activity that fires a Raca sygnałowa round to *light a
 * point on the map*, exactly like a thrown Flara, instead of at a creature.
 *
 * The two activities the item now carries are deliberately separate, not a mode switch on one:
 *   - **ATAK** (native dnd5e attack activity, already existed) — shoot AT a target/creature.
 *     Direct hit: 1k4 fire, target saves or catches fire (GM-adjudicated, see the catalog note).
 *   - **Wystrzel flarę** (this file's utility activity) — fire INTO a point on the map to light
 *     it up for a minute, the weapon's actual point per RAW/the homebrew's own intent. This is
 *     the one that answers "how do I use this like a signal/light gun."
 * Both spend the same chambered round (`flags.<module>.mag.current`, capacity 1, "ładowanie" —
 * reload between every shot either way) — there's only ever one Raca in the gun at a time,
 * whichever way it gets fired.
 *
 * ## Reuses Flara's standalone-light machinery, not a second copy of it
 *
 * The light itself (colour, radius, burn time, the GM-relay creation/expiry-sweep plumbing) is
 * owned entirely by `items/flara.mjs` — this file only calls its exported `requestFlareLight`
 * once a round has actually been spent, and quotes its exported `FLARE_LIGHT`/`BURN_SECONDS`
 * for the chat card text. See `flara.mjs`'s own "Reused by Pistolet na Race" doc comment.
 *
 * ## Detecting "is this item the Pistolet na Race", and why no new flag
 *
 * Unlike Latarka/Pochodnia/Flara (each a bespoke item file stamping its own `isX` marker flag
 * at creation), Pistolet na Race is just another entry in the shared `BRON_PALNA_KROTKA`
 * catalog (`config/weapons-data.mjs`) — `buildWeaponItemData` doesn't stamp per-entry identity
 * flags. Rather than add a new marker flag (and a new backfill sweep to retrofit it onto
 * already-issued copies, the exact drift class `project_catalog_drift_distributed_copies`
 * warns about), this detects the weapon by its caliber flag instead: `flags.mag.ammoType ===
 * "race"` is unique to this weapon, already set on every real instance (the catalog builder
 * sets it from `w.caliber` automatically, and so does `migration/migrate-pistolet-race.mjs`'s
 * placeholder conversion) — one less thing that can drift out of sync.
 *
 * ## Range: the weapon's own stated range, not a Strength-scaled throw
 *
 * A thrown handheld Flara's max distance depends on the thrower's Strength and the item's own
 * weight (`items/flara.mjs`'s `_computeThrowRange`) — a flare *gun* doesn't care how strong you
 * are, it's a fixed mechanical launch. This reads the weapon's own `system.range` (12 m / 30 m,
 * `config/weapons-data.mjs`) as the max instead — "flies further than a handheld flare" from the
 * original ask is true for anyone without an exceptional Strength score, and always true in the
 * sense that it no longer depends on Strength at all.
 *
 * ## Chamber bookkeeping after firing
 *
 * `weapons/magazine.mjs`'s own `_consumeSingleShotAmmo` (used by the native ATAK path) does two
 * things after a shot on a "ładowanie"/"przeładowanie" weapon: spends the round, and sets the
 * chamber to `loaded: false`. That second part isn't exported, so this calls the exported
 * `setChamber(item, { loaded: false })` directly after `spendRound` — for a `wmag` capacity-1
 * weapon like this one, that alone is enough to make `_requiresManualReloadBeforeUse` correctly
 * block further firing (either activity) until the next reload: its own logic falls through to
 * `return _getChamberState(item).loaded !== true` once the private `reloadState.required` flag
 * (which this file can't set — it's private to `magazine.mjs`) is left unset. Verified live
 * rather than assumed — see this file's registration doc comment below.
 */

import { getMag, spendRound, setChamber } from "./magazine.mjs";
import { playShotSound } from "./sounds.mjs";
import { requestFlareLight, FLARE_LIGHT, BURN_SECONDS } from "../items/flara.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const LAUNCH_ID = "pistolet-race-wystrzel";

/* -------------------------------------------- */
/*  Helpers                                       */
/* -------------------------------------------- */

function _liveItem(item) {
  return item?.actor?.items?.get(item.id) ?? item;
}

/** See this file's top doc comment, "Detecting…" — caliber flag, not a bespoke marker flag. */
function _isPistoletRace(item) {
  return item?.type === "weapon" && getMag(item)?.ammoType === "race";
}

function _getActivity(item, identifier) {
  return item.system.activities?.find(a => a.visibility?.identifier === identifier) ?? null;
}

/**
 * Canvas point picker + range measurement — a deliberate small duplication of
 * `items/flara.mjs`'s own private equivalents (themselves already a duplication of
 * `actors/grenade-inventory.mjs`'s), matching this project's established "small
 * independent per-item-file UI glue" convention (see `flara.mjs`'s own doc comment on it)
 * rather than extracting a shared module for a handful of lines used in three places.
 */
async function _pickCanvasPoint() {
  if (!canvas?.app?.stage) {
    ui.notifications.warn("Brak aktywnej sceny do wyboru punktu, w który leci raca.");
    return null;
  }

  ui.notifications.info("Wybierz, gdzie wyląduje raca sygnałowa: kliknij na mapie (ESC, aby anulować).");

  return new Promise(resolve => {
    const stage = canvas.app.stage;

    const cleanup = () => {
      stage.off("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };

    const onPointerDown = (event) => {
      cleanup();
      const p = event.data.getLocalPosition(stage);
      resolve({ x: p.x, y: p.y });
    };

    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      cleanup();
      resolve(null);
    };

    stage.once("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
  });
}

function _measureMeters(from, to) {
  if (!canvas?.grid) return 0;

  try {
    if (typeof canvas.grid.measurePath === "function") {
      const d = Number(canvas.grid.measurePath([{ A: from, B: to }])?.distance ?? 0);
      if (!Number.isNaN(d) && d > 0) return d;
    }
  } catch (_e) { /* fallback below */ }

  try {
    if (typeof canvas.grid.measureDistance === "function") {
      const d = Number(canvas.grid.measureDistance(from, to, { gridSpaces: true }));
      if (!Number.isNaN(d) && d > 0) return d;
    }
  } catch (_e) { /* geometric fallback below */ }

  const dx = (to.x ?? 0) - (from.x ?? 0);
  const dy = (to.y ?? 0) - (from.y ?? 0);
  const px = Math.hypot(dx, dy);
  const unitsPerGrid = Number(canvas.scene?.grid?.distance ?? 1);
  const pxPerGrid = Number(canvas.grid?.size ?? 100);
  return (px / pxPerGrid) * unitsPerGrid;
}

function _getActorToken(actor) {
  const own = (canvas?.tokens?.controlled ?? []).find(t => t.actor?.id === actor.id);
  if (own) return own;
  const active = actor.getActiveTokens?.(true, true) ?? [];
  return active[0] ?? null;
}

/** Same normalizer as `flara.mjs`'s — `getActiveTokens`'s fallback can hand back a bare
 * `TokenDocument` (no `.center`) instead of a placeable `Token`. */
function _centerOf(tokenOrDoc) {
  if (tokenOrDoc?.center) return { x: tokenOrDoc.center.x, y: tokenOrDoc.center.y };
  const doc = tokenOrDoc?.document ?? tokenOrDoc;
  if (typeof doc?.getCenterPoint === "function") return doc.getCenterPoint();
  return { x: doc?.x ?? 0, y: doc?.y ?? 0 };
}

/** See top doc comment, "Range" — the weapon's own stated range, not Strength-scaled. */
function _maxFireRange(item) {
  const long = Number(item.system?.range?.long ?? 0);
  if (long > 0) return long;
  const short = Number(item.system?.range?.value ?? 0);
  return short > 0 ? short : 30;
}

/* -------------------------------------------- */
/*  Fire!                                         */
/* -------------------------------------------- */

async function _fireFlareRound(item) {
  item = _liveItem(item);
  const actor = item.actor;
  if (!actor) { ui.notifications.warn("Wystrzelenie racy wymaga, żeby broń leżała w ekwipunku postaci na scenie."); return; }

  const mag = getMag(item);
  if (!mag || mag.current <= 0) {
    ui.notifications.warn(`${item.name}: magazynek pusty — brak racy do wystrzelenia.`);
    return;
  }

  const token = _getActorToken(actor);
  if (!token) { ui.notifications.warn("Brak aktywnego tokena tej postaci na scenie. Zaznacz token i spróbuj ponownie."); return; }

  const scene = token.scene ?? canvas.scene;
  if (!scene) { ui.notifications.warn("Brak aktywnej sceny."); return; }

  const target = await _pickCanvasPoint();
  if (!target) return; // anulowane — nic nie zużyte

  const origin = _centerOf(token);
  const distance = _measureMeters(origin, target);
  const maxRange = _maxFireRange(item);
  if (distance > maxRange) {
    ui.notifications.warn(`Strzał poza zasięgiem broni (${distance.toFixed(1)} m > ${maxRange.toFixed(1)} m).`);
  }

  const spent = await spendRound(item); // posts its own "PUSTE!" warning/sound if empty
  if (!spent) return;
  await setChamber(item, { loaded: false }); // see top doc comment, "Chamber bookkeeping"

  playShotSound(item, { caliberId: mag.ammoType, token: actor });

  const speaker = ChatMessage.getSpeaker({ actor });
  await ChatMessage.create({
    speaker,
    flavor: item.name,
    content: `<div class="neuro-flara-card"><div class="neuro-flara-head">${item.name}</div>`
      + `<p>Wystrzelona na <strong>${distance.toFixed(1)} m</strong> (maks. ${maxRange.toFixed(1)} m). `
      + `Ląduje, zapala się i pali czerwonym, migoczącym światłem przez <strong>${Math.round(BURN_SECONDS / 60)} minutę</strong> `
      + `(jasne ${FLARE_LIGHT.bright} m / słabe ${FLARE_LIGHT.dim} m) — światło blokują ściany.</p>`
      + `<p><em>Trzeba przeładować przed kolejnym strzałem.</em></p></div>`,
  });

  await requestFlareLight(actor, scene, target.x, target.y);
}

/* -------------------------------------------- */
/*  Activity                                      */
/* -------------------------------------------- */

const _ensuringActivities = new Map();

/** Same single-flight guard as `flara.mjs`'s `ensureFlaraActivities` — see its comment. */
export function ensurePistoletRaceActivities(item) {
  if (!_isPistoletRace(item)) return Promise.resolve();
  const key = item.uuid ?? item.id;

  const inFlight = _ensuringActivities.get(key);
  if (inFlight) return inFlight;

  const promise = _ensurePistoletRaceActivitiesUnguarded(item).finally(() => {
    _ensuringActivities.delete(key);
  });
  _ensuringActivities.set(key, promise);
  return promise;
}

async function _ensurePistoletRaceActivitiesUnguarded(item) {
  if (!_getActivity(item, LAUNCH_ID)) {
    await item.createActivity("utility", {
      name: "Wystrzel flarę",
      activation: { type: "action" },
      visibility: { identifier: LAUNCH_ID },
      description: {
        chatFlavor: "Raca leci, ląduje i zapala się.",
        value: "<p>Wystrzeliwuje załadowaną Racę sygnałową w wybrany punkt na mapie zamiast w cel — "
          + "ląduje i pali się jak rzucona Flara, tyle że dalej i bez zależności od Siły strzelca. "
          + "Do strzelania w przeciwnika (obrażenia od ognia) służy zwykła aktywność ATAK.</p>",
      },
    }, { renderSheet: false });
  }
}

/* -------------------------------------------- */
/*  Hooks                                         */
/* -------------------------------------------- */

function onPreUseActivity(activity) {
  const item = _liveItem(activity?.item);
  if (!item || !_isPistoletRace(item)) return;
  if (activity.visibility?.identifier !== LAUNCH_ID) return;

  const mag = getMag(item);
  if (!mag || mag.current <= 0) {
    ui.notifications.warn(`${item.name}: magazynek pusty — brak racy do wystrzelenia.`);
    return false;
  }
}

function onPostUseActivity(activity) {
  const item = _liveItem(activity?.item);
  if (!item || !_isPistoletRace(item)) return;
  if (activity.visibility?.identifier === LAUNCH_ID) _fireFlareRound(item);
}

/** Backfill: any Pistolet na Race already in the world that's missing its activity gets it —
 * needed because this weapon has no bespoke item-creation file to add it at creation time (it's
 * built off the shared `weapons-data.mjs` catalog like any other firearm), so every copy that
 * existed before this file shipped (Raynald's included) only gets the activity retroactively. */
async function ensureAllPistoletRaceActivities() {
  const items = [...game.items, ...game.actors.map(a => [...a.items]).flat()];
  for (const item of items) {
    if (_isPistoletRace(item) && !_getActivity(item, LAUNCH_ID)) await ensurePistoletRaceActivities(item);
  }
}

export function registerPistoletNaRace() {
  Hooks.on("dnd5e.preUseActivity", onPreUseActivity);
  Hooks.on("dnd5e.postUseActivity", onPostUseActivity);

  Hooks.on("createItem", (item) => { if (game.user.isGM) ensurePistoletRaceActivities(item); });
  if (game.user.isGM) ensureAllPistoletRaceActivities();

  console.log(`${MODULE_ID} | Pistolet na Race (Wystrzel flarę) registered`);
}
