/**
 * Neuroshima 5e — Flara (handheld signal/light flare), homebrew `consumable` item.
 *
 * RAW anchor (podręcznik, "MAŁY RUSZNIKARZ"): the toolkit's own "Używanie" line already lists
 * "flara świecąca przez 1 minutę (ST 15)" as a field-made result (`toolkits-data.mjs`'s
 * `rusznikarza.actions` already carries that DC verbatim). This file is the catalog item that
 * ability (and a plain purchase) actually produces — RAW names the effect, this is what was
 * missing to make it a real, usable, thrown thing on the table.
 *
 * ## Why this is its own file, not a Pochodnia variant
 *
 * Pochodnia is a *carried* light: lit, it follows the wielder until extinguished or burnt out
 * (`weapons/pochodnia.mjs`, `light-sources.mjs`'s per-actor resolver). A Flara is the opposite —
 * its entire point is to light up a spot you are *not* standing in (thrown ahead into a dark
 * room, dropped behind you while retreating). Modelling it as "just another Pochodnia variant"
 * would have been the cheap path, but it would light the wrong token. So Flara gets its own,
 * much smaller, standalone-light mechanism instead of plugging into `light-sources.mjs` at all —
 * that resolver is *per actor*, this is *per point on the map*, and the two never need to know
 * about each other.
 *
 * ## Design locked live (2026-09-06, GM sign-off on all four forks)
 *
 * 1. **Real light at the landing spot**, not a flavor-only signal like the existing
 *    `grenade-signal` entry (`config/ammo-data.mjs`) — a genuine standalone `AmbientLight`,
 *    independent of any actor/token, that outlives the throw.
 * 2. **Range = double Pochodnia Smołowa's** (6 m bright / 12 m dim → 12 m bright / 24 m dim),
 *    not the Improwizowana variant.
 * 3. **Burn time = 1 minute**, matching RAW's field-made flare exactly — no mechanical split
 *    between a hasty tool-made flare and a bought one.
 * 4. Colour/animation ("red, very flickery/crackly/uneven") were left to me to pick and tune,
 *    same "rendering tuning knob" delegation pattern already used for Termowizor's shader this
 *    same session — see `FLARE_COLOR`/`FLARE_ANIMATION` below. Reuses the "torch" animation type
 *    Pochodnia already uses (a proven flicker primitive) but maxes both sliders (10/10 vs
 *    Pochodnia's 5/5) so it reads as distinctly more violent, not just "another torch."
 *
 * ## Standalone timed light — new plumbing, small on purpose
 *
 * Creating/deleting a Scene's embedded `AmbientLight` is GM-only by default Foundry permissions
 * (`light-sources.mjs`'s own doc comment already established this for the Latarka narrow-cone
 * companion). A non-GM player throwing a Flara can't create one directly. The fix reuses the
 * exact pattern already proven in this codebase for "a player action needs a GM-privileged side
 * effect": the throwing client performs only normal-permission writes (consume the item, post
 * the chat card, set a flag on their OWN actor recording where/what to light), and EVERY
 * connected client reacts to that actor-flag change — the one currently `game.user.isActiveGM`
 * does the actual privileged `AmbientLight` creation, exactly how `light-sources.mjs` describes
 * its own narrow-cone companion catching up "via the GM's client independently reacting to the
 * same underlying document change."
 *
 * The flag lives on the ACTOR (`FLAG_PENDING`), not the item — the item may be `.delete()`d in
 * the same operation (last one in the stack), and a deleted document's flags aren't a reliable
 * signal for other clients to react to. The actor always survives.
 *
 * Expiry is tracked per-SCENE (`FLAG_ACTIVE`, an array of `{lightId, expiresAt}`), swept on
 * `updateWorldTime` exactly like Pochodnia's own fuel-burnout sweep (`weapons/pochodnia.mjs`) —
 * same reasoning: a Flara's 1-minute clock is *game* time, not wall-clock time, so it only counts
 * down while something is actually advancing world time (combat rounds, rests, the GM's clock).
 * A flare thrown while nobody ever advances time again simply never expires — same honest,
 * already-documented-elsewhere limitation as every other fuel/burnout clock in this module.
 *
 * Known, accepted gap: two Flarae thrown by the same actor inside the same sub-second window
 * could have the second `setFlag` clobber the first before the GM's client reacts to it, losing
 * that one light. Not guarded against (no single-flight lock here) — this is a much rarer and
 * lower-stakes race than the real one caught in `light-sources.mjs`'s `syncActorLight` chain this
 * session (that one broke a per-tick vision read on *every* torch toggle; this one needs two
 * throws inside roughly the same network round-trip to even matter, and the failure mode is just
 * "one flare doesn't light up," not stale/wrong data).
 *
 * ## Reused by Pistolet na Race (2026-09-06, 2nd pass)
 *
 * `weapons/pistolet-na-race.mjs`'s own "Wystrzel flarę" utility activity produces the exact same
 * standalone light — same colour, radius, burn time — just launched by spending a chambered Raca
 * sygnałowa round instead of consuming a Flara item stack. Rather than a second copy of the
 * GM-relay/expiry-sweep machinery above, it calls `requestFlareLight` (exported below), which is
 * the same `actor.setFlag(FLAG_PENDING, …)` write `_throwFlara` itself makes — `onUpdateActor`/
 * `_spawnFlareLight`/`_sweepExpiredFlareLights` don't know or care which item triggered it.
 * `FLARE_LIGHT`/`BURN_SECONDS` are exported alongside it so both items' chat text always quotes
 * the same numbers, by construction, rather than two hand-copied literals drifting apart later.
 */

const MODULE_ID = "neuroshima-2026-overrides";

/* -------------------------------------------- */
/*  Constants                                     */
/* -------------------------------------------- */

const THROW_ID = "flara-rzuc";
const FLAG_MARKER = "flara";          // bool — identifies a Flara item, same idiom as isLatarka/isPochodnia
const FLAG_PENDING = "flarePendingThrow"; // actor flag — {sceneId, x, y, nonce}, GM-consumed
const FLAG_ACTIVE = "activeFlares";    // scene flag — [{lightId, expiresAt}]

// 2× Pochodnia Smołowa (6/12 m) — locked live, see this file's top doc comment, point 2.
// Exported: `weapons/pistolet-na-race.mjs`'s own flare-launch quotes these same two numbers
// instead of hand-copying them (see this file's "Reused by Pistolet na Race" doc comment).
export const FLARE_LIGHT = { bright: 12, dim: 24 };
export const BURN_SECONDS = 60; // 1 minuta — locked live, point 3.

// Colour/animation — my call to make and tune (point 4). Red, distinct from Pochodnia's warm
// orange (#ff8c3c) and Latarka's cool white (#dce8ff); "torch" animation reused from Pochodnia
// but both sliders maxed (10/10 vs Pochodnia's 5/5) so it reads as a distinctly rougher flicker,
// not just a recoloured torch. Alpha/luminosity dialed down from LightData's 0.5/0.5 schema
// defaults on the same grounds `light-sources.mjs` already documented for Latarka: a 12/24 m
// light at the default luminosity reads as a flat white-out up close, not a hotspot-to-fade glow.
// Not pixel-verified against a live render the way Termowizor's shader was — that rigor was
// warranted there because the question was "does this signal exist in the engine at all," which
// isn't in doubt here: this is the same well-understood LightData schema Latarka/Pochodnia
// already validated, just new numbers on it.
const FLARE_COLOR = "#ff1a1a";
const FLARE_ALPHA = 0.25;
const FLARE_LUMINOSITY = 0.35;
const FLARE_ATTENUATION = 0.4;
const FLARE_ANIMATION = { type: "torch", speed: 10, intensity: 10 };

const ICON_BASE = `modules/${MODULE_ID}/icons/weapons`;
// Fixed (2026-09-06): this was reusing pochodnia_smolowa.svg as an interim placeholder, but
// `icons/weapons/raca_oswietleniowa.svg` — a lit flare stick, exactly this item — was already
// sitting in the same directory, unused, from an earlier art batch. Same class of gap the
// chemia-data.mjs icon sweep found and fixed once already (see its own doc comment).
const FLARA_IMG = `${ICON_BASE}/raca_oswietleniowa.svg`;

const FLARA_NAME = "Flara";
const FLARA_DESCRIPTION =
  `<p><strong>Flara</strong> — ręczna raca sygnałowa/oświetleniowa. „Rzuć i zapal” to jeden ruch: `
  + `ląduje we wskazanym punkcie i pali się czerwonym, mocno migoczącym światłem przez 1 minutę `
  + `(jasne ${FLARE_LIGHT.bright} m, słabe ${FLARE_LIGHT.dim} m), zanim zgaśnie na dobre. Światło `
  + `blokują ściany, jak każde inne.</p>`
  + `<p>Nie wymaga żadnej broni — w przeciwieństwie do Racy sygnałowej, która potrzebuje Pistoletu `
  + `na Race, ale za to leci dalej i waży mniej.</p>`
  + `<p><strong>Mały Rusznikarz</strong> potrafi wykonać taką flarę w polu (Zręczność lub `
  + `Inteligencja, ST 15).</p>`;

/* -------------------------------------------- */
/*  Helpers                                       */
/* -------------------------------------------- */

function _liveItem(item) {
  return item?.actor?.items?.get(item.id) ?? item;
}

export function isFlara(item) {
  return item?.type === "consumable" && !!item?.getFlag?.(MODULE_ID, FLAG_MARKER);
}

function _getActivity(item, identifier) {
  return item.system.activities?.find(a => a.visibility?.identifier === identifier) ?? null;
}

/**
 * Canvas point picker + throw-range helpers below are a deliberate small duplication of
 * `actors/grenade-inventory.mjs`'s own private equivalents (`_pickCanvasPoint`,
 * `_measureMeters`, `_getActorThrowToken`, `_computeThrowRange`) — same shape, not imported,
 * matching this project's existing pattern of small independent per-item-file UI glue (Latarka
 * and Pochodnia duplicate `_liveItem`/`_postCard` rather than sharing a base class) rather than
 * coupling two otherwise-unrelated item files over a handful of lines each.
 */
async function _pickCanvasPoint() {
  if (!canvas?.app?.stage) {
    ui.notifications.warn("Brak aktywnej sceny do wyboru punktu upadku flary.");
    return null;
  }

  ui.notifications.info("Wybierz, gdzie wyląduje flara: kliknij na mapie (ESC, aby anulować).");

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

function _getActorThrowToken(actor) {
  const own = (canvas?.tokens?.controlled ?? []).find(t => t.actor?.id === actor.id);
  if (own) return own;
  const active = actor.getActiveTokens?.(true, true) ?? [];
  return active[0] ?? null;
}

/**
 * `_getActorThrowToken`'s fallback branch (no controlled token — the normal path when a player
 * has their own token selected never reaches it) can hand back either a placeable `Token` (has a
 * real `.center` getter) or a bare `TokenDocument` (no `.center` at all — confirmed live: reading
 * `.center.x` on one throws). Normalizes either shape to a plain `{x, y}` instead of assuming
 * which one `_getActorThrowToken` returned.
 */
function _centerOf(tokenOrDoc) {
  if (tokenOrDoc?.center) return { x: tokenOrDoc.center.x, y: tokenOrDoc.center.y };
  const doc = tokenOrDoc?.document ?? tokenOrDoc;
  if (typeof doc?.getCenterPoint === "function") return doc.getCenterPoint();
  return { x: doc?.x ?? 0, y: doc?.y ?? 0 };
}

function _computeThrowRange(actor, item) {
  const str = Number(actor.system?.abilities?.str?.value ?? 8);
  const weight = Number(item.system?.weight?.value ?? item.system?.weight ?? 0.3);
  const safeWeight = Math.max(0.2, weight);
  const max = Math.max(2, Math.round((str * 2) / safeWeight));
  return { str, weight: safeWeight, max };
}

/* -------------------------------------------- */
/*  Chat card                                     */
/* -------------------------------------------- */

async function _postCard(item, html, { flavor } = {}) {
  const speaker = ChatMessage.getSpeaker({ actor: item.actor });
  await ChatMessage.create({
    speaker,
    flavor: flavor ?? item.name,
    content: `<div class="neuro-flara-card"><div class="neuro-flara-head">${item.name}</div>${html}</div>`,
  });
}

/* -------------------------------------------- */
/*  Throw + ignite                                */
/* -------------------------------------------- */

async function _throwFlara(item) {
  item = _liveItem(item);
  const actor = item.actor;
  if (!actor) { ui.notifications.warn("Rzucenie flary wymaga, żeby leżała w ekwipunku postaci na scenie."); return; }

  const qty = Number(item.system.quantity ?? 0);
  if (qty <= 0) { ui.notifications.warn(`${item.name}: brak sztuk do rzutu.`); return; }

  const token = _getActorThrowToken(actor);
  if (!token) { ui.notifications.warn("Brak aktywnego tokena tej postaci na scenie. Zaznacz token i spróbuj ponownie."); return; }

  const scene = token.scene ?? canvas.scene;
  if (!scene) { ui.notifications.warn("Brak aktywnej sceny."); return; }

  const target = await _pickCanvasPoint();
  if (!target) return; // anulowane — nic nie zużyte

  const origin = _centerOf(token);
  const distance = _measureMeters(origin, target);
  const range = _computeThrowRange(actor, item);
  if (distance > range.max) {
    ui.notifications.warn(`Rzut poza optymalnym zasięgiem (${distance.toFixed(1)} m > ${range.max.toFixed(1)} m).`);
  }

  const newQty = qty - 1;
  if (newQty <= 0) await item.delete();
  else await item.update({ "system.quantity": newQty });

  await _postCard(item,
    `<p>Rzucona na <strong>${distance.toFixed(1)} m</strong> (SIŁ ${range.str}, maks. ${range.max.toFixed(1)} m). `
    + `Ląduje, zapala się i pali czerwonym, migoczącym światłem przez <strong>1 minutę</strong> `
    + `(jasne ${FLARE_LIGHT.bright} m / słabe ${FLARE_LIGHT.dim} m) — światło blokują ściany.</p>`
    + `<p><em>Zostało: ${newQty} szt.</em></p>`);

  // Prywatny, niewidoczny sygnał dla aktywnego MG — patrz doc comment pliku, sekcja
  // "Standalone timed light". Aktor (nie przedmiot — ten mógł się właśnie usunąć) przeżywa,
  // żeby każdy klient miał na czym zareagować.
  await actor.setFlag(MODULE_ID, FLAG_PENDING, {
    sceneId: scene.id, x: target.x, y: target.y, nonce: foundry.utils.randomID(8),
  });
}

/* -------------------------------------------- */
/*  GM-side: spawn the standalone light, sweep its expiry */
/* -------------------------------------------- */

/**
 * Requests a standalone flare light at `(x, y)` on `scene`, via the same GM-relayed
 * actor-flag `_throwFlara` itself uses (see this file's "Reused by Pistolet na Race" doc
 * comment) — every connected client's `onUpdateActor` below reacts, only the active GM's
 * client actually creates the `AmbientLight`. `actor` just needs to be a document any
 * client can write a flag to; it need not be holding a Flara item itself.
 * @param {Actor} actor
 * @param {Scene} scene
 * @param {number} x
 * @param {number} y
 */
export async function requestFlareLight(actor, scene, x, y) {
  await actor.setFlag(MODULE_ID, FLAG_PENDING, {
    sceneId: scene.id, x, y, nonce: foundry.utils.randomID(8),
  });
}

async function _spawnFlareLight(actor, pending) {
  try {
    const scene = game.scenes.get(pending.sceneId);
    if (scene) {
      const created = (await scene.createEmbeddedDocuments("AmbientLight", [{
        x: pending.x, y: pending.y, rotation: 0, walls: true,
        config: {
          bright: FLARE_LIGHT.bright, dim: FLARE_LIGHT.dim, angle: 360,
          color: FLARE_COLOR, alpha: FLARE_ALPHA,
          luminosity: FLARE_LUMINOSITY, attenuation: FLARE_ATTENUATION,
          animation: foundry.utils.deepClone(FLARE_ANIMATION),
        },
      }]))[0];

      if (created) {
        const list = foundry.utils.deepClone(scene.getFlag(MODULE_ID, FLAG_ACTIVE) ?? []);
        list.push({ lightId: created.id, expiresAt: game.time.worldTime + BURN_SECONDS });
        await scene.setFlag(MODULE_ID, FLAG_ACTIVE, list);
      }
    }
  } catch (e) {
    console.warn(`${MODULE_ID} | flara: nie udało się utworzyć światła`, e);
  } finally {
    // Zawsze, nawet po błędzie powyżej — flaga jest jednorazowym sygnałem, musi zniknąć, żeby nie
    // wystrzelić drugi raz przy następnej, niezwiązanej zmianie aktora. Bez tego `finally` błąd w
    // tworzeniu światła (np. scena skasowana w międzyczasie) zostawiłby martwą flagę na zawsze.
    try { await actor.unsetFlag(MODULE_ID, FLAG_PENDING); } catch (_e) { /* aktor mógł już zniknąć */ }
  }
}

/** GM-only sweep: delete any standalone flare light whose minute is up. */
async function _sweepExpiredFlareLights() {
  if (!game.user.isActiveGM) return;
  const now = game.time.worldTime;

  for (const scene of game.scenes) {
    const list = scene.getFlag(MODULE_ID, FLAG_ACTIVE);
    if (!list?.length) continue;

    const due = list.filter(f => now >= f.expiresAt);
    if (!due.length) continue;

    const remaining = list.filter(f => now < f.expiresAt);
    const idsToDelete = due.map(f => f.lightId).filter(id => scene.lights.has(id));

    try {
      if (idsToDelete.length) await scene.deleteEmbeddedDocuments("AmbientLight", idsToDelete);
    } catch (e) {
      console.warn(`${MODULE_ID} | flara: nie udało się usunąć wygasłego światła`, e);
    }

    if (remaining.length) await scene.setFlag(MODULE_ID, FLAG_ACTIVE, remaining);
    else await scene.unsetFlag(MODULE_ID, FLAG_ACTIVE);
  }
}

/* -------------------------------------------- */
/*  Activities                                    */
/* -------------------------------------------- */

const _ensuringActivities = new Map();

/** Same single-flight guard as `pochodnia.mjs`'s `ensurePochodniaActivities` — see its comment. */
export function ensureFlaraActivities(item) {
  if (!isFlara(item)) return Promise.resolve();
  const key = item.uuid ?? item.id;

  const inFlight = _ensuringActivities.get(key);
  if (inFlight) return inFlight;

  const promise = _ensureFlaraActivitiesUnguarded(item).finally(() => {
    _ensuringActivities.delete(key);
  });
  _ensuringActivities.set(key, promise);
  return promise;
}

async function _ensureFlaraActivitiesUnguarded(item) {
  if (!_getActivity(item, THROW_ID)) {
    await item.createActivity("utility", {
      name: "Rzuć i zapal flarę",
      activation: { type: "action" },
      visibility: { identifier: THROW_ID },
      description: { chatFlavor: "Flara leci, ląduje i zapala się." },
    }, { renderSheet: false });
  }
}

/* -------------------------------------------- */
/*  Item factory                                  */
/* -------------------------------------------- */

export function buildFlaraItemData() {
  return {
    name: FLARA_NAME,
    type: "consumable",
    img: FLARA_IMG,
    system: {
      type: { value: "trinket", subtype: "" },
      description: { value: FLARA_DESCRIPTION, chat: "" },
      weight: { value: 0.3, units: "kg" },
      price: { value: 15, denomination: "gp" },
      quantity: 1,
      uses: { max: "", spent: 0, recovery: [] },
      identifier: "flara",
      activities: {},
    },
    flags: { [MODULE_ID]: { [FLAG_MARKER]: true } },
  };
}

/** Creates a brand new Flara item (world item, or embedded on `actor`). */
export async function createFlaraItem({ actor, quantity = 1 } = {}) {
  const data = buildFlaraItemData();
  data.system.quantity = quantity;

  const created = actor
    ? (await actor.createEmbeddedDocuments("Item", [data]))[0]
    : await Item.create(data);
  if (!created) throw new Error("Flara: createEmbeddedDocuments/Item.create returned nothing");

  await ensureFlaraActivities(created);
  return created;
}

/**
 * Seeds/refreshes the Zbrojownia's own display copy — one stack, upserted by name, same shape
 * as `latarka.mjs`'s `createLatarkaStock`. Doesn't reach into already-issued copies elsewhere.
 */
export async function createFlaraStock(actor) {
  actor ??= game.actors.find(a => a.getFlag(MODULE_ID, "isZbrojownia"));
  if (!actor) { ui.notifications.error("Brak aktora Zbrojownia (flaga isZbrojownia)."); return null; }

  const existing = actor.items.find(i => isFlara(i));
  const data = buildFlaraItemData();

  if (existing) await existing.update(data);
  else await actor.createEmbeddedDocuments("Item", [data]);

  for (const item of actor.items.filter(i => isFlara(i))) await ensureFlaraActivities(item);

  ui.notifications.info(`Zbrojownia: Flara ${existing ? "zaktualizowana" : "dodana"}.`);
  return { created: existing ? 0 : 1, updated: existing ? 1 : 0 };
}

/* -------------------------------------------- */
/*  Hooks                                         */
/* -------------------------------------------- */

function onPreUseActivity(activity) {
  const item = _liveItem(activity?.item);
  if (!item || !isFlara(item)) return;
  if (activity.visibility?.identifier !== THROW_ID) return;

  if (Number(item.system.quantity ?? 0) <= 0) {
    ui.notifications.warn(`${item.name}: brak sztuk do rzutu.`);
    return false;
  }
}

function onPostUseActivity(activity) {
  const item = _liveItem(activity?.item);
  if (!item || !isFlara(item)) return;
  if (activity.visibility?.identifier === THROW_ID) _throwFlara(item);
}

/** Every client reacts; only the active GM's client actually creates the light. */
function onUpdateActor(actor, changes) {
  const pending = foundry.utils.getProperty(changes, `flags.${MODULE_ID}.${FLAG_PENDING}`);
  if (!pending) return;
  if (!game.user.isActiveGM) return;
  _spawnFlareLight(actor, pending).catch(e => console.warn(`${MODULE_ID} | flara: spawn failed`, e));
}

async function onWorldTime() {
  await _sweepExpiredFlareLights();
}

/** Backfill: any Flara already in the world that's missing its activity gets it. */
async function ensureAllFlaraActivities() {
  const items = [...game.items, ...game.actors.map(a => [...a.items]).flat()];
  for (const item of items) {
    if (isFlara(item) && !_getActivity(item, THROW_ID)) await ensureFlaraActivities(item);
  }
}

export function registerFlara() {
  Hooks.on("dnd5e.preUseActivity", onPreUseActivity);
  Hooks.on("dnd5e.postUseActivity", onPostUseActivity);
  Hooks.on("updateActor", onUpdateActor);
  Hooks.on("updateWorldTime", onWorldTime);

  Hooks.on("createItem", (item) => { if (game.user.isGM) ensureFlaraActivities(item); });
  if (game.user.isGM) ensureAllFlaraActivities();

  console.log(`${MODULE_ID} | Flara registered`);
}

/** Public API, exposed on `game.neuroshima.flara` from main.mjs. */
export const flaraApi = {
  create: createFlaraItem,
  stock: createFlaraStock,
};
