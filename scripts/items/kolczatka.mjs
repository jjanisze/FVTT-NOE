/**
 * Neuroshima 5e — Kolczatki (folding spike-strip), homebrew `consumable` item.
 *
 * RAW anchor (podręcznik, "KOLCZATKI"): "W akcji Używanie możesz rozsypać kolczatki na
 * sąsiadującym z tobą obszarze wielkości 1,5 x 1,5 metra. Istota, która wejdzie na ten obszar po
 * raz pierwszy w turze, musi zdać Rzut Obronny na Zręczność o ST 15, inaczej otrzymuje 1 punkt
 * obrażeń kłutych oraz jej Szybkość zostaje zredukowana do 0, do początku jej następnej tury.
 * Pozbieranie kolczatek zajmuje 10 minut. Opona pojazdu, która wjechała na obszar z kolczatkami,
 * automatycznie zostaje przebita. Kolczatki nie działają na maszyny gąsienicowe i kroczące."
 * Full mechanic quoted in `buildKolczatkaItemData`'s description — not automated (this module's
 * own "GM-in-the-loop" convention: automate detection/placement, never silently apply saves or
 * damage — see e.g. `grenade-inventory.mjs`'s chat-card roll buttons, which stay one click, not
 * zero). This item automates exactly one thing: dropping the visual marker where a player says.
 *
 * ## Graduated from a GEAR_PLACEHOLDERS stub (2026-09-06, batch 39)
 *
 * Kolczatki used to be one of `gear-data.mjs`'s unpriced TODO stubs (a `loot` item, no mechanics,
 * generic batch-35 icon) — same family as Sidła/Wózek/etc. Those four graduated in place (still
 * `loot`, just real stats now — see `gear-data.mjs`'s `REAL_GEAR`). Kolczatki needed its own file
 * instead because it does something: a real "Rozłóż kolczatki" Activity that places a ground
 * marker, which means a real Activity + a GM-relayed privileged write, matching every other
 * "an item does a physical thing on the map" file in this folder (`flara.mjs`, `pistolet-na-
 * race.mjs`). Converting `type: "loot"` → `"consumable"` mid-item is exactly the type-boundary
 * trap `migration/migrate-pistolet-race.mjs` already documents (a plain `.update({type:...})`
 * silently no-ops the whole call) — so already-issued placeholder copies are migrated via
 * delete-then-recreate, not update; see `migration/migrate-gear-graduation.mjs`.
 *
 * ## Why a real Tile, not a Sequencer effect
 *
 * `explosion-vfx.mjs`'s scorch mark is a Sequencer effect because `TileDocument` has no
 * blend-mode field at all (checked directly against core's `tile.mjs`) and the scorch decal
 * NEEDS one. A spike strip has no such requirement — the user-supplied art
 * (`vfx/spike_strip.png`) is already a real transparent PNG (confirmed live: every corner pixel
 * is (0,0,0,0), not a baked-in white background), so a plain `Tile` composites correctly with no
 * blend mode at all. Tiles also get the GM something Sequencer effects don't: normal
 * select/move/rotate/resize/delete through Foundry's own canvas UI. That gap was raised live this
 * same session (scorch marks can only be ended, one at a time, through Sequencer's own Manager
 * panel — no move, no resize) — a spike strip a GM will very plausibly want to nudge or rotate to
 * actually line up with a road doesn't need that same limitation, so it isn't given it.
 *
 * `TileDocument.metadata.permissions.create` is role-gated (`ASSISTANT`+, confirmed this same
 * session while fixing the grenade-marker bug) with no per-document ownership exception — a normal
 * PLAYER can't create one directly, so this reuses the exact GM-relay idiom `flara.mjs` and
 * `grenade-inventory.mjs` already established: the deploying client only ever writes a plain,
 * normal-permission flag on their OWN actor; every connected client's `onUpdateActor` reacts; only
 * `game.user.isActiveGM` performs the actual privileged `createEmbeddedDocuments("Tile", …)`.
 *
 * ## Placement is free, not "adjacent to you" (deliberate RAW deviation)
 *
 * RAW's own area (1,5 × 1,5 m — one grid square) is scattered "na sąsiadującym z tobą obszarze"
 * (an area adjacent to you). The new art is a long, purpose-built folding strip meant to span a
 * lane ahead of a vehicle, not loose tacks dropped at your own feet — and the whole point raised
 * when this was commissioned was "player selects where" on the map, same free-placement idiom
 * grenades/Flara already use (`_pickCanvasPoint`), not a melee-adjacency check. Deployed size
 * (`TILE_SQUARES_LONG` × `TILE_SQUARES_WIDE`, below) is therefore bigger than RAW's own 1,5×1,5 m
 * effect area on purpose. Left as a known, stated mismatch — see the item description's own note
 * — rather than silently reconciled either direction: shrinking the graphic to match RAW's area
 * would fight the art's own proportions (a native 3:1 image, `vfx/spike_strip.png`, confirmed live
 * via PIL: exactly 2172×724 px), and stretching the RAW area to match the graphic is a balance
 * call only the GM should make.
 */

const MODULE_ID = "neuroshima-2026-overrides";

/* -------------------------------------------- */
/*  Constants                                     */
/* -------------------------------------------- */

const DEPLOY_ID = "kolczatka-rozloz";
const FLAG_MARKER = "kolczatka";                  // bool — identifies a Kolczatki item, isFlara/isLatarka idiom
const FLAG_PENDING = "kolczatkaPendingDeploy";    // actor flag — {sceneId, x, y, nonce}, GM-consumed

// Native art is exactly 3:1 (vfx/spike_strip.png, 2172x724 px — confirmed live, not assumed).
// Sized in grid squares, not meters/pixels, same reasoning as `explosion-vfx.mjs`'s ring/fire
// table: `scene.grid.size` converts this correctly no matter which scene it's deployed on.
export const TILE_SQUARES_LONG = 3;
export const TILE_SQUARES_WIDE = 1;

const ICON_BASE = `modules/${MODULE_ID}/icons/items/loot`;
const KOLCZATKA_IMG = `${ICON_BASE}/kolczatki.svg`;
const TILE_TEXTURE = `modules/${MODULE_ID}/vfx/spike_strip.png`;

const KOLCZATKA_NAME = "Kolczatki";
const KOLCZATKA_DESCRIPTION =
  `<p><strong>Cena:</strong> 10 gb &nbsp;|&nbsp; <strong>Waga:</strong> 0,5 kg &nbsp;|&nbsp; <strong>Dostępność:</strong> 40%</p>`
  + `<p>Składany pas z metalowymi kolcami — rozkłada się w poprzek drogi, żeby przebić opony `
  + `pościgowego pojazdu albo zranić kogoś, kto na niego wejdzie.</p>`
  + `<p><strong>W akcji Używanie możesz rozsypać kolczatki na obszarze wielkości 1,5 × 1,5 m.</strong> `
  + `Istota, która wejdzie na ten obszar po raz pierwszy w swojej turze, musi zdać Rzut Obronny na `
  + `Zręczność (ST 15), inaczej otrzymuje 1 punkt obrażeń kłutych, a jej Szybkość zostaje zredukowana `
  + `do 0 do początku jej następnej tury. Pozbieranie kolczatek zajmuje 10 minut. Opona pojazdu, która `
  + `wjechała na obszar z kolczatkami, automatycznie zostaje przebita. Kolczatki nie działają na `
  + `maszyny gąsienicowe i kroczące. <em>(Powyższe RO/obrażenia MG rozstrzyga ręcznie — automatyzowane `
  + `jest tylko postawienie znacznika na mapie.)</em></p>`
  + `<p><em>Uwaga: grafika na mapie (ok. ${TILE_SQUARES_LONG}×${TILE_SQUARES_WIDE} pola, pod kształt `
  + `nowego, długiego paska z kolcami) jest większa niż formalny obszar efektu z podręcznika `
  + `(1,5 × 1,5 m, jedno pole) — MG rozstrzyga zasięg działania wg własnego uznania.</em></p>`;

/* -------------------------------------------- */
/*  Helpers                                       */
/* -------------------------------------------- */

function _liveItem(item) {
  return item?.actor?.items?.get(item.id) ?? item;
}

export function isKolczatka(item) {
  return item?.type === "consumable" && !!item?.getFlag?.(MODULE_ID, FLAG_MARKER);
}

function _getActivity(item, identifier) {
  return item.system.activities?.find(a => a.visibility?.identifier === identifier) ?? null;
}

/**
 * Deliberate small duplication of `grenade-inventory.mjs`/`flara.mjs`'s own private
 * `_pickCanvasPoint` — same shape, not imported, matching this project's established pattern of
 * small independent per-item-file UI glue rather than coupling unrelated item files.
 */
async function _pickCanvasPoint() {
  if (!canvas?.app?.stage) {
    ui.notifications.warn("Brak aktywnej sceny do wyboru miejsca na kolczatki.");
    return null;
  }

  ui.notifications.info("Wybierz, gdzie rozłożyć kolczatki: kliknij na mapie (ESC, aby anulować).");

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

/* -------------------------------------------- */
/*  Chat card                                     */
/* -------------------------------------------- */

async function _postCard(item, html) {
  const speaker = ChatMessage.getSpeaker({ actor: item.actor });
  await ChatMessage.create({
    speaker,
    flavor: item.name,
    content: `<div class="neuro-flara-card"><div class="neuro-flara-head">${item.name}</div>${html}</div>`,
  });
}

/* -------------------------------------------- */
/*  Deploy                                        */
/* -------------------------------------------- */

async function _deployKolczatka(item) {
  item = _liveItem(item);
  const actor = item.actor;
  if (!actor) { ui.notifications.warn("Rozłożenie kolczatek wymaga, żeby leżały w ekwipunku postaci na scenie."); return; }

  const qty = Number(item.system.quantity ?? 0);
  if (qty <= 0) { ui.notifications.warn(`${item.name}: brak sztuk do rozłożenia.`); return; }

  const scene = canvas.scene;
  if (!scene) { ui.notifications.warn("Brak aktywnej sceny."); return; }

  const target = await _pickCanvasPoint();
  if (!target) return; // anulowane — nic nie zużyte

  const newQty = qty - 1;
  if (newQty <= 0) await item.delete();
  else await item.update({ "system.quantity": newQty });

  await _postCard(item,
    `<p>Rozłożone. Pas z kolcami rozciąga się na wskazanym miejscu — RO Zręczność ST 15 dla `
    + `każdego, kto na niego wejdzie (patrz opis przedmiotu).</p>`
    + `<p><em>Zostało: ${newQty} szt.</em></p>`);

  // Prywatny, niewidoczny sygnał dla aktywnego MG — patrz doc comment pliku, "Why a real Tile".
  // Aktor (nie przedmiot — ten mógł się właśnie usunąć) przeżywa, żeby każdy klient miał na czym
  // zareagować.
  await actor.setFlag(MODULE_ID, FLAG_PENDING, {
    sceneId: scene.id, x: target.x, y: target.y, nonce: foundry.utils.randomID(8),
  });
}

/* -------------------------------------------- */
/*  GM-side: spawn the Tile                       */
/* -------------------------------------------- */

async function _spawnKolczatkaTile(actor, pending) {
  try {
    const scene = game.scenes.get(pending.sceneId);
    if (scene) {
      const pxPerGrid = Number(scene.grid?.size ?? 100);
      const width = pxPerGrid * TILE_SQUARES_LONG;
      const height = pxPerGrid * TILE_SQUARES_WIDE;

      // v14 Tile x/y is the CENTER of the mesh, not a corner (confirmed elsewhere in this
      // project — corner-based math here would land it half a tile off, silently). Unlike the
      // Drawing/MeasuredTemplate math in `grenade-inventory.mjs`, no `- width/2` offset needed.
      await scene.createEmbeddedDocuments("Tile", [{
        x: pending.x, y: pending.y,
        width, height,
        rotation: 0, // GM can rotate via the normal Tile HUD to line it up with a road — see file doc comment.
        locked: false,
        texture: { src: TILE_TEXTURE },
        flags: { [MODULE_ID]: { kolczatkaTile: true } },
      }]);
    }
  } catch (e) {
    console.warn(`${MODULE_ID} | kolczatka: nie udało się utworzyć znacznika`, e);
  } finally {
    try { await actor.unsetFlag(MODULE_ID, FLAG_PENDING); } catch (_e) { /* aktor mógł już zniknąć */ }
  }
}

/* -------------------------------------------- */
/*  Activities                                    */
/* -------------------------------------------- */

const _ensuringActivities = new Map();

/** Same single-flight guard as `flara.mjs`'s `ensureFlaraActivities` — see its comment. */
export function ensureKolczatkaActivities(item) {
  if (!isKolczatka(item)) return Promise.resolve();
  const key = item.uuid ?? item.id;

  const inFlight = _ensuringActivities.get(key);
  if (inFlight) return inFlight;

  const promise = _ensureKolczatkaActivitiesUnguarded(item).finally(() => {
    _ensuringActivities.delete(key);
  });
  _ensuringActivities.set(key, promise);
  return promise;
}

async function _ensureKolczatkaActivitiesUnguarded(item) {
  if (!_getActivity(item, DEPLOY_ID)) {
    await item.createActivity("utility", {
      name: "Rozłóż kolczatki",
      // Interim reuse of the existing "throw" activity icon (same shape as spreading a strip on
      // the ground, close enough) — this activity wasn't one of batch 39's 9 commissioned icons,
      // same "reuse the closest shape until dedicated art exists" convention documented all over
      // this module (Raca sygnałowa/ammo_12_ga, grenade-signal/smoke_grenade, etc.).
      img: `modules/${MODULE_ID}/icons/activities/activity_throw.svg`,
      activation: { type: "action" },
      visibility: { identifier: DEPLOY_ID },
      description: { chatFlavor: "Pas z kolcami rozkłada się na wskazanym miejscu." },
    }, { renderSheet: false });
  }
}

/* -------------------------------------------- */
/*  Item factory                                  */
/* -------------------------------------------- */

export function buildKolczatkaItemData() {
  return {
    name: KOLCZATKA_NAME,
    type: "consumable",
    img: KOLCZATKA_IMG,
    system: {
      type: { value: "trinket", subtype: "" },
      description: { value: KOLCZATKA_DESCRIPTION, chat: "" },
      weight: { value: 0.5, units: "kg" },
      price: { value: 10, denomination: "gb" },
      quantity: 1,
      uses: { max: "", spent: 0, recovery: [] },
      identifier: "kolczatki",
      activities: {},
    },
    flags: { [MODULE_ID]: { [FLAG_MARKER]: true } },
  };
}

/** Creates a brand new Kolczatki item (world item, or embedded on `actor`). */
export async function createKolczatkaItem({ actor, quantity = 1 } = {}) {
  const data = buildKolczatkaItemData();
  data.system.quantity = quantity;

  const created = actor
    ? (await actor.createEmbeddedDocuments("Item", [data]))[0]
    : await Item.create(data);
  if (!created) throw new Error("Kolczatka: createEmbeddedDocuments/Item.create returned nothing");

  await ensureKolczatkaActivities(created);
  return created;
}

/**
 * Seeds/refreshes the Zbrojownia's own display copy — one stack, upserted by the item's own
 * marker flag, same shape as `flara.mjs`'s `createFlaraStock`. Doesn't reach into already-issued
 * copies elsewhere — see `migration/migrate-gear-graduation.mjs` for that.
 */
export async function createKolczatkaStock(actor) {
  actor ??= game.actors.find(a => a.getFlag(MODULE_ID, "isZbrojownia"));
  if (!actor) { ui.notifications.error("Brak aktora Zbrojownia (flaga isZbrojownia)."); return null; }

  const existing = actor.items.find(i => isKolczatka(i));
  const data = buildKolczatkaItemData();

  if (existing) await existing.update(data);
  else await actor.createEmbeddedDocuments("Item", [data]);

  for (const item of actor.items.filter(i => isKolczatka(i))) await ensureKolczatkaActivities(item);

  ui.notifications.info(`Zbrojownia: Kolczatki ${existing ? "zaktualizowane" : "dodane"}.`);
  return { created: existing ? 0 : 1, updated: existing ? 1 : 0 };
}

/* -------------------------------------------- */
/*  Hooks                                         */
/* -------------------------------------------- */

function onPreUseActivity(activity) {
  const item = _liveItem(activity?.item);
  if (!item || !isKolczatka(item)) return;
  if (activity.visibility?.identifier !== DEPLOY_ID) return;

  if (Number(item.system.quantity ?? 0) <= 0) {
    ui.notifications.warn(`${item.name}: brak sztuk do rozłożenia.`);
    return false;
  }
}

function onPostUseActivity(activity) {
  const item = _liveItem(activity?.item);
  if (!item || !isKolczatka(item)) return;
  if (activity.visibility?.identifier === DEPLOY_ID) _deployKolczatka(item);
}

/** Every client reacts; only the active GM's client actually creates the Tile. */
function onUpdateActor(actor, changes) {
  const pending = foundry.utils.getProperty(changes, `flags.${MODULE_ID}.${FLAG_PENDING}`);
  if (!pending) return;
  if (!game.user.isActiveGM) return;
  _spawnKolczatkaTile(actor, pending).catch(e => console.warn(`${MODULE_ID} | kolczatka: spawn failed`, e));
}

/** Backfill: any Kolczatki already in the world that's missing its activity gets it. */
async function ensureAllKolczatkaActivities() {
  const items = [...game.items, ...game.actors.map(a => [...a.items]).flat()];
  for (const item of items) {
    if (isKolczatka(item) && !_getActivity(item, DEPLOY_ID)) await ensureKolczatkaActivities(item);
  }
}

export function registerKolczatka() {
  Hooks.on("dnd5e.preUseActivity", onPreUseActivity);
  Hooks.on("dnd5e.postUseActivity", onPostUseActivity);
  Hooks.on("updateActor", onUpdateActor);

  Hooks.on("createItem", (item) => { if (game.user.isGM) ensureKolczatkaActivities(item); });
  if (game.user.isGM) ensureAllKolczatkaActivities();

  console.log(`${MODULE_ID} | Kolczatki registered`);
}

/** Public API, exposed on `game.neuroshima.kolczatka` from main.mjs. */
export const kolczatkaApi = {
  create: createKolczatkaItem,
  stock: createKolczatkaStock,
};
