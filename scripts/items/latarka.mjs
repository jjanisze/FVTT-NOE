/**
 * Neuroshima 5e — Latarka (flashlight), homebrew `equipment` item.
 *
 * RAW (podręcznik, "LATARKA"): "Ręczna, czołowa, montowana na broni lub przypinana do
 * ramienia. Rzuca jasne światło w stożku (45 stopni) o długości 45 metrów, i słabe światło
 * w stożku (90 stopni) o długości 180 metrów. Wewnętrzna bateria wystarcza na 2k4 godzin
 * świecenia. Droższe latarki z dynamem nie wymagają baterii, ale trzeba kręcić korbką, żeby
 * świeciły."
 *
 * Four physical mounts (`reczna`/`czolowa`/`naramienna`/gun-rail — the last is the separate
 * `latarka` weapon addon in `addons-data.mjs`, not this file) are mechanically identical here;
 * they're four catalog entries sharing one implementation, differing only in name/description/
 * hands-free flavor — same reasoning `pochodnia.mjs` uses variants for genuinely different
 * burn stats, except here the *forms* don't differ mechanically at all. `dynamowa` is the one
 * real mechanical fork: no battery, never runs dark, but RAW's "trzeba kręcić korbką" is left
 * as a GM-adjudicated one-hand-busy condition (flavor text only) rather than simulated action
 * economy — consistent with this project's general "automate detection, not enforcement"
 * posture elsewhere (`disease-effects.mjs`, addon reveal-position tags, …).
 *
 * ## Cone light — two nested cones, not one
 *
 * RAW wants a **narrow** 45°/45 m bright cone nested inside a **wider** 90°/180 m dim cone —
 * so the two wedges *between* those angles (22.5°–45° off centre, either side) should read as
 * dim immediately, right next to the wielder, not just "dim past 45m." A single-light
 * approximation (one `angle` shared by both bright and dim, since that's all `LightData`
 * supports on its own) got this wrong in an earlier pass: it made the *whole* 90° cone bright
 * out to 45m, which is indistinguishable from correct in a room smaller than 45m — most of
 * them — since the geometry never reaches the point where the two shapes would diverge.
 *
 * Fixed via `light-sources.mjs`'s companion-light mechanism: this provider returns
 * `narrowAngle: 45` alongside the normal fields, and the resolver builds two real light
 * sources — the token's own (wide, dim-only) plus a companion `AmbientLight` (narrow, fully
 * bright) glued to the token's position and aimed the same direction. See that file's doc
 * comment for the mechanics and the GM-only write it requires.
 *
 * Direction **is** synced to token facing, but not via anything this module built — it's just
 * how Foundry's cone lights work: confirmed live that a token's own light has no independent
 * `rotation` field at all, it always points wherever the token itself is rotated. `tracer-vfx.mjs`
 * separately documents that *that* module doesn't treat token rotation as live facing (it
 * computes shooter→target vectors ad hoc for bullet tracers instead) — an unrelated concern
 * about a different visual, not a contradiction here. Aiming the flashlight is exactly the
 * existing, native affordance every token already has: drag-rotate it like any other facing.
 * `light-sources.mjs`'s companion cone mirrors the token's `rotation` field on every move/turn.
 *
 * ## Battery model
 *
 * Charge is a 0–100 percentage of the *currently loaded* battery's rolled lifetime, stored as
 * an item flag (not `system.uses` — same reasoning as `pochodnia.mjs`: a Latarka can be an
 * unowned world item). Unlike Pochodnia, running dry doesn't destroy the item — it just goes
 * dark (`FLAG_ON` false, `FLAG_HAS_BATTERY` false) until "Włóż baterie" loads a fresh one and
 * rolls a new 2k4-hour lifetime. See `baterie.mjs` for why the battery itself isn't a tracked,
 * swappable object with its own continuity.
 */

import { registerLightProvider, registerLightOffSwitch, enforceSingleLightSource, syncActorLight } from "./light-sources.mjs";
import { registerPowerSource, getPowerStatus, renderPowerRow } from "./power-source.mjs";
import { isBaterie } from "./baterie.mjs";
import { isKobaltEnabled } from "../config/settings.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/* -------------------------------------------- */
/*  Constants                                     */
/* -------------------------------------------- */

const ON_ID = "latarka-wlacz";
const OFF_ID = "latarka-wylacz";
const INSERT_ID = "latarka-wloz-baterie";

const FLAG_FORM = "latarkaForm";               // "reczna" | "czolowa" | "naramienna" | "dynamowa"
const FLAG_ON = "latarkaOn";                   // bool
const FLAG_HAS_BATTERY = "latarkaHasBaterie";  // bool — irrelevant/always-true-in-spirit for dynamowa
const FLAG_CHARGE = "latarkaCharge";           // 0–100, % of the loaded battery's rolled lifetime remaining
const FLAG_CHARGE_MAX_MIN = "latarkaChargeMaxMin"; // minutes rolled (2k4h) for the *current* battery
const FLAG_START = "latarkaStartTime";         // worldTime this ON session started
const FLAG_BURNOUT_AT = "latarkaBurnoutAt";    // worldTime this session would go dark on its own

// Two nested cones, not one: a narrow 45° bright spot entirely inside a wider 90° dim spill.
// See `light-sources.mjs`'s doc comment for why this needs `narrowAngle` rather than a single
// `angle` — the v1 approximation that collapsed both into one 90°-wide light was simply wrong,
// not just imprecise: it put bright light in the two side wedges (22.5°–45° off centre) that
// RAW says should read as dim immediately, not just "dim past 45m."
//
// Kolor Kobaltu (docs/Kobalt.md, rule 6) shrinks both radii — RAW's ranges are considered too
// generous on a VTT. Bright cuts cleanly to 1/3 (45m -> 15m) and reads right at that scale. Dim
// does NOT also get the flat 1/3 treatment (that would still be 60m): on the actual silo/dungeon
// maps this campaign uses, a 60m dim spill lit most of a level at once, which felt less like "a
// flashlight in the dark" and more like turning on the room lights — it also flattened any reason
// to want a longer-ranged upgrade later. 22m keeps a real dim halo past the bright cone (RAW's own
// bright:dim ratio, ~1:4, would be pointless to preserve here) without trivializing exploration.
// Cone angles are unaffected by either of the above — locked decision, `PLAN_kobalt.md` — only
// distance shrinks.
const LIGHT_RAW = { bright: 45, dim: 180, angle: 90, narrowAngle: 45 };
const LIGHT_KOBALT = { bright: 15, dim: 22, angle: 90, narrowAngle: 45 };

function _light() {
  return isKobaltEnabled() ? LIGHT_KOBALT : LIGHT_RAW;
}

const LIGHT_COLOR = "#dce8ff"; // cool white — deliberately distinct from Pochodnia's warm flicker
const NO_ANIMATION = { type: "", speed: 0, intensity: 0 };

const ICON_BASE = `modules/${MODULE_ID}/icons/items/loot`;

export const LATARKA_FORMS = {
  reczna: {
    key: "reczna",
    label: "Latarka ręczna",
    battery: true,
    img: `${ICON_BASE}/latarka.svg`,
    // RAW also lists "przypinana do ramienia" as a mounting option — dropped as a separate
    // form (was `naramienna`): identical stats, identical hands-free-ness to `czolowa`, no
    // mechanical or RAW-stated distinction between "strapped to your head" and "strapped to
    // your arm." A player who wants that flavor can just call this one that; it doesn't earn
    // its own catalog entry. See chat log 2026-09-04 for the fuller argument.
    description: "<p>Trzymana w dłoni (lub przypięta do ramienia/paska szelkami) — zajmuje "
      + "jedną rękę, dopóki świeci, chyba że przypięta.</p>",
  },
  czolowa: {
    key: "czolowa",
    label: "Latarka czołówka",
    battery: true,
    img: `${ICON_BASE}/latarka_czolowa.svg`,
    description: "<p>Opaska na głowę. Nie zajmuje rąk — świeci tam, gdzie patrzysz.</p>",
  },
  dynamowa: {
    key: "dynamowa",
    label: "Latarka z dynamem",
    battery: false,
    img: `${ICON_BASE}/latarka_dynamo.svg`,
    description: "<p>Droższa, ale nigdy nie siada jej bateria — bo jej nie ma. Trzeba kręcić "
      + "korbką, żeby świeciła (MG może uznać to za zajętą rękę na czas świecenia).</p>",
  },
};

/**
 * Flavor-text tail describing the light cone, kept in sync with `_light()` — baked into the
 * item's description at creation/initialization time (like the rest of the catalog data), so it
 * reflects whatever the Kobalt toggle says *right now*, not necessarily forever: flipping the
 * toggle later re-syncs the actual light values live (see `registerLatarka`'s `updateSetting`
 * hook) but does NOT rewrite already-created items' description text. Acceptable per
 * `PLAN_kobalt.md` — cosmetic drift only, not a mechanical one.
 */
function _descriptionTail() {
  const l = _light();
  return `<p>Jasne światło w stożku ${l.narrowAngle}° na ${l.bright} m, słabe światło w stożku `
    + `${l.angle}° na ${l.dim} m.</p>`;
}

/* -------------------------------------------- */
/*  Helpers                                       */
/* -------------------------------------------- */

function _liveItem(item) {
  return item?.actor?.items?.get(item.id) ?? item;
}

function isLatarka(item) {
  return item?.type === "equipment" && !!item.getFlag?.(MODULE_ID, FLAG_FORM);
}

function formOf(item) {
  return LATARKA_FORMS[item?.getFlag?.(MODULE_ID, FLAG_FORM)] ?? null;
}

function usesBattery(item) {
  return !!formOf(item)?.battery;
}

function isOn(item) {
  return !!item?.getFlag?.(MODULE_ID, FLAG_ON);
}

function hasBattery(item) {
  return usesBattery(item) ? !!item?.getFlag?.(MODULE_ID, FLAG_HAS_BATTERY) : true;
}

function _getActivity(item, identifier) {
  return item.system.activities?.find(a => a.visibility?.identifier === identifier) ?? null;
}

/* -------------------------------------------- */
/*  Chat card                                     */
/* -------------------------------------------- */

async function _postCard(item, html, { flavor } = {}) {
  const speaker = ChatMessage.getSpeaker({ actor: item.actor });
  await ChatMessage.create({
    speaker,
    flavor: flavor ?? item.name,
    content: `<div class="neuro-latarka-card"><div class="neuro-latarka-head">${item.name}</div>${html}</div>`,
  });
}

/* -------------------------------------------- */
/*  Token illumination                            */
/* -------------------------------------------- */

/** Registered once at `registerLatarka()` — see `light-sources.mjs`. */
function _latarkaLightProvider(actor) {
  if (!actor) return null;
  let best = null;
  for (const item of actor.items) {
    if (!isLatarka(item) || !isOn(item)) continue;
    if (!item.system?.equipped) continue;
    if (!best) best = _light();
  }
  if (!best) return null;
  return {
    ...best,
    color: LIGHT_COLOR,
    // Both dialed down from LightData's 0.5/0.5 defaults — see `light-sources.mjs`'s doc comment
    // for how these were picked (direct pixel-sampling the live rendered canvas, not guesswork):
    // at the default, both cones read as a flat, blown-out white regardless of alpha, because a
    // flashlight's radii are large enough to hit Foundry's "Bright"/"Dim" classification across
    // most of a typical room. `luminosity` is what actually pulls that down to a proper
    // hotspot-to-fade beam; `alpha` alone barely moves it.
    alpha: 0.15,
    luminosity: 0.2,
    animation: NO_ANIMATION,
  };
}

/* -------------------------------------------- */
/*  Charge accounting — same shape as pochodnia.mjs's fuel                                    */
/* -------------------------------------------- */

/**
 * Charge percentage right now — while on, this keeps draining between flag writes (the flag
 * only refreshes on toggle/insert/burnout), so anything that needs to *show* current charge
 * must compute it live with the same formula that actually banks it, not just read the stale
 * flag. See `pochodnia.mjs`'s `_liveFuelPercent` for the identical reasoning.
 */
function _liveChargePercent(item) {
  const charge = item.getFlag(MODULE_ID, FLAG_CHARGE) ?? 0;
  if (!isOn(item) || !usesBattery(item)) return charge;

  const maxMin = item.getFlag(MODULE_ID, FLAG_CHARGE_MAX_MIN);
  if (!maxMin) return charge;

  const start = item.getFlag(MODULE_ID, FLAG_START) ?? game.time.worldTime;
  const elapsedMin = Math.max(0, (game.time.worldTime - start) / 60);
  const consumedPct = (elapsedMin / maxMin) * 100;
  return Math.max(0, charge - consumedPct);
}

/** Registered once at `registerLatarka()` — see `items/power-source.mjs`. */
function _latarkaPowerDescriptor(item) {
  const form = formOf(item);
  if (!form) return null;
  const on = isOn(item);

  if (!form.battery) {
    return { on, unlimited: true, percent: 100, remainingMinutes: 0, unitLabel: "Zasilanie" };
  }

  const percent = _liveChargePercent(item);
  return {
    on,
    unlimited: false,
    percent,
    remainingMinutes: (item.getFlag(MODULE_ID, FLAG_CHARGE_MAX_MIN) ?? 0) * (percent / 100),
    unitLabel: "Bateria",
    flagPath: `flags.${MODULE_ID}.${FLAG_CHARGE}`,
    editable: item.isOwner && !on,
    onNote: "świeci",
    offHint: "",
  };
}

/* -------------------------------------------- */
/*  Turn on / off / insert battery / go dark      */
/* -------------------------------------------- */

export async function turnOn(item) {
  item = _liveItem(item);
  if (!formOf(item) || isOn(item)) return;
  // Same equipped gate as `onPreUseActivity`'s ON_ID branch — repeated here because this function
  // is also a public API entry point, which bypasses that hook. Same bug class as `gogle.mjs`'s
  // identical fix: `_light()` silently skips an unequipped item (correctly), so without this check
  // the Activity would flip `latarkaOn` true, start draining the battery clock, and post "Zapala
  // się" for a flashlight sitting unequipped in a backpack — zero visible effect, zero explanation.
  if (!item.system?.equipped) { ui.notifications.warn(`${item.name}: załóż ją najpierw (nie jest noszona).`); return; }

  if (usesBattery(item)) {
    if (!hasBattery(item)) { ui.notifications.warn(`${item.name}: brak baterii.`); return; }
    const charge = item.getFlag(MODULE_ID, FLAG_CHARGE) ?? 0;
    if (charge <= 0) { ui.notifications.warn(`${item.name}: baterie są martwe.`); return; }

    const maxMin = item.getFlag(MODULE_ID, FLAG_CHARGE_MAX_MIN) ?? 1;
    const now = game.time.worldTime;
    const remainingSec = maxMin * 60 * (charge / 100);

    await item.update({
      [`flags.${MODULE_ID}.${FLAG_ON}`]: true,
      [`flags.${MODULE_ID}.${FLAG_START}`]: now,
      [`flags.${MODULE_ID}.${FLAG_BURNOUT_AT}`]: now + remainingSec,
    });
  } else {
    await item.update({ [`flags.${MODULE_ID}.${FLAG_ON}`]: true });
  }

  // Only one light source per actor (locked design decision — see `enforceSingleLightSource`'s
  // doc comment). Must run after this item's own ON write above (so it isn't the thing that
  // gets turned back off) but before the sync below, so that sync sees the final, settled state.
  await enforceSingleLightSource(item.actor, item);

  await syncActorLight(item.actor);
  await _postCard(item, `<p>Zapala się.${usesBattery(item)
    ? ` Bateria: <strong>${Math.round(_liveChargePercent(item))}%</strong>.`
    : " Korbka zaczyna kręcić się w dłoni."}</p>`);
}

export async function turnOff(item, { silent = false, reason = null } = {}) {
  item = _liveItem(item);
  if (!formOf(item) || !isOn(item)) return;

  const update = { [`flags.${MODULE_ID}.${FLAG_ON}`]: false };
  if (usesBattery(item)) {
    update[`flags.${MODULE_ID}.${FLAG_CHARGE}`] = _liveChargePercent(item);
    update[`flags.${MODULE_ID}.-=${FLAG_START}`] = null;
    update[`flags.${MODULE_ID}.-=${FLAG_BURNOUT_AT}`] = null;
  }
  await item.update(update);

  await syncActorLight(item.actor);
  if (!silent) {
    const tail = usesBattery(item)
      ? ` Bateria zachowana: <strong>${Math.round(_liveChargePercent(item))}%</strong>.`
      : "";
    await _postCard(item, `<p>Gaśnie${reason ? ` — ${reason}` : ""}.${tail}</p>`);
  }
}

/** Registered once at `registerLatarka()` — see `light-sources.mjs`'s `enforceSingleLightSource`. */
async function _turnOffOtherLatarki(actor, keepItem) {
  for (const item of actor.items) {
    if (item.id === keepItem?.id) continue;
    if (isLatarka(item) && isOn(item)) await turnOff(item, { reason: "zapalono inne źródło światła" });
  }
}

/** GM/owner-driven: consumes one owned Baterie item, loads a fresh 2k4h charge. */
export async function insertBattery(item) {
  item = _liveItem(item);
  if (!formOf(item) || !usesBattery(item)) return;
  const actor = item.actor;
  if (!actor) { ui.notifications.warn("Włożenie baterii wymaga, żeby latarka leżała w ekwipunku."); return; }

  const stack = actor.items.find(i => isBaterie(i) && (i.system.quantity ?? 0) > 0);
  if (!stack) { ui.notifications.warn("Brak baterii w ekwipunku."); return; }

  const qty = stack.system.quantity ?? 1;
  if (qty <= 1) await stack.delete();
  else await stack.update({ "system.quantity": qty - 1 });

  const rollMinutes = (await new Roll("2d4").roll()).total * 60;

  const wasOn = isOn(item);
  const update = {
    [`flags.${MODULE_ID}.${FLAG_HAS_BATTERY}`]: true,
    [`flags.${MODULE_ID}.${FLAG_CHARGE}`]: 100,
    [`flags.${MODULE_ID}.${FLAG_CHARGE_MAX_MIN}`]: rollMinutes,
  };
  if (wasOn) {
    const now = game.time.worldTime;
    update[`flags.${MODULE_ID}.${FLAG_START}`] = now;
    update[`flags.${MODULE_ID}.${FLAG_BURNOUT_AT}`] = now + rollMinutes * 60;
  }
  await item.update(update);

  if (wasOn) await syncActorLight(item.actor);
  await _postCard(item,
    `<p>Świeże baterie. Starczą na <strong>${Math.round(rollMinutes / 60)} godzin</strong>.</p>`);
}

/** Battery ran out on its own — go dark, don't destroy the item. */
async function _goDark(item) {
  item = _liveItem(item);
  if (!isOn(item)) return;

  await item.update({
    [`flags.${MODULE_ID}.${FLAG_ON}`]: false,
    [`flags.${MODULE_ID}.${FLAG_HAS_BATTERY}`]: false,
    [`flags.${MODULE_ID}.${FLAG_CHARGE}`]: 0,
    [`flags.${MODULE_ID}.-=${FLAG_START}`]: null,
    [`flags.${MODULE_ID}.-=${FLAG_BURNOUT_AT}`]: null,
  });

  await syncActorLight(item.actor);
  await _postCard(item, `<p>Bateria siada. Światło gaśnie.</p>`, { flavor: "Rozładowana" });
}

/* -------------------------------------------- */
/*  Activities                                    */
/* -------------------------------------------- */

const _ensuringActivities = new Map();

/** Same single-flight guard as `pochodnia.mjs`'s `ensurePochodniaActivities` — see its comment. */
export function ensureLatarkaActivities(item) {
  if (!isLatarka(item)) return Promise.resolve();
  const key = item.uuid ?? item.id;

  const inFlight = _ensuringActivities.get(key);
  if (inFlight) return inFlight;

  const promise = _ensureLatarkaActivitiesUnguarded(item).finally(() => {
    _ensuringActivities.delete(key);
  });
  _ensuringActivities.set(key, promise);
  return promise;
}

async function _ensureLatarkaActivitiesUnguarded(item) {
  if (!_getActivity(item, ON_ID)) {
    await item.createActivity("utility", {
      name: "Włącz latarkę",
      activation: { type: "action" },
      visibility: { identifier: ON_ID },
      description: { chatFlavor: "Latarka zapala się." },
    }, { renderSheet: false });
  }
  if (!_getActivity(item, OFF_ID)) {
    await item.createActivity("utility", {
      name: "Wyłącz latarkę",
      activation: { type: "special" },
      visibility: { identifier: OFF_ID },
      description: { chatFlavor: "Latarka gaśnie." },
    }, { renderSheet: false });
  }
  if (usesBattery(item) && !_getActivity(item, INSERT_ID)) {
    await item.createActivity("utility", {
      name: "Włóż baterie",
      activation: { type: "special" },
      visibility: { identifier: INSERT_ID },
      description: { chatFlavor: "Świeże baterie." },
    }, { renderSheet: false });
  }
}

/**
 * Converts an existing item into a Latarka of the given form in place — same `_id`, so it keeps
 * its inventory slot, sheet position and ownership. Same reasoning as `pochodnia.mjs`'s
 * `initializePochodnia`.
 *
 * **Only safe when the source item is already `type: "equipment"`.** Confirmed live: a plain
 * `item.update({type: "equipment", ...})` on a *different*-typed item (e.g. the pre-existing
 * `"loot"`-typed "Latarka czołówka" placeholders this project shipped before this mechanic
 * existed) silently drops the type change **and everything else in that same update call**
 * (name, flags included) — no error, no thrown rejection, just a no-op. Foundry does support
 * type-changing updates, but not via this shape; migrating a genuinely different-typed
 * placeholder needs delete-then-`createLatarkaItem` instead (loses the original `_id`, which is
 * the actual, acceptable cost of crossing a type boundary — see the live-migration notes for
 * the eight PC headlamps + Evie's "Latarka taktyczna" this was first written for).
 */
export async function initializeLatarka(item, formKey) {
  const form = LATARKA_FORMS[formKey];
  if (!form) throw new Error(`Nieznana forma Latarki: ${formKey}`);

  await item.update({
    name: form.label,
    type: "equipment",
    img: form.img,
    "system.description.value": form.description + _descriptionTail(),
    "system.weight.value": 0.3,
    "system.weight.units": "kg",
    "system.price.value": form.battery ? 15 : 60,
    "system.price.denomination": "gp",
    "system.type.value": "trinket",
    // Explicit clear, not omitted — see `pochodnia.mjs`'s `initializePochodnia` doc comment for
    // why: this function converts an item that may have carried a real `uses.max` from *its*
    // pre-conversion type, and leaving it would show a stray "0 / 0" ładunki on the sheet forever.
    "system.uses.max": "",
    "system.uses.spent": 0,
    "system.uses.recovery": [],
    [`flags.${MODULE_ID}.${FLAG_FORM}`]: formKey,
    [`flags.${MODULE_ID}.${FLAG_ON}`]: false,
    [`flags.${MODULE_ID}.${FLAG_HAS_BATTERY}`]: !form.battery,
    [`flags.${MODULE_ID}.${FLAG_CHARGE}`]: 0,
  });

  await ensureLatarkaActivities(item);
  return item;
}

/* -------------------------------------------- */
/*  Item factory                                  */
/* -------------------------------------------- */

function _baseSystemData() {
  return {
    type: { value: "trinket", baseItem: "" },
    uses: { max: "", spent: 0, recovery: [] },
    equipped: false, identified: true, quantity: 1,
  };
}

export function buildLatarkaItemData(formKey) {
  const form = LATARKA_FORMS[formKey];
  if (!form) throw new Error(`Nieznana forma Latarki: ${formKey}`);

  return {
    name: form.label,
    type: "equipment",
    img: form.img,
    system: {
      ..._baseSystemData(),
      description: { value: form.description + _descriptionTail(), chat: "" },
      weight: { value: 0.3, units: "kg" },
      price: { value: form.battery ? 15 : 60, denomination: "gp" },
      identifier: `latarka-${formKey}`,
    },
    flags: {
      [MODULE_ID]: {
        [FLAG_FORM]: formKey,
        [FLAG_ON]: false,
        [FLAG_HAS_BATTERY]: !form.battery, // dynamo is always "ready"; battery forms start empty
        [FLAG_CHARGE]: 0,
      }
    }
  };
}

/**
 * Seeds/refreshes the Zbrojownia's own copy of every Latarka form — one of each, upserted by
 * name, same shape as `weapons-data.mjs`'s `createWeapons()`. Only touches the catalog item
 * itself (name/description/price/flags reset to factory-fresh); doesn't reach into any other
 * actor's already-issued copies — see `project_catalog_drift_distributed_copies` for why that's
 * a distinct, separate concern (`auditWeapons`/`repairWeapons`'s territory, not this).
 */
export async function createLatarkaStock(actor) {
  actor ??= game.actors.find(a => a.getFlag(MODULE_ID, "isZbrojownia"));
  if (!actor) { ui.notifications.error("Brak aktora Zbrojownia (flaga isZbrojownia)."); return null; }

  const byName = new Map(actor.items.filter(i => isLatarka(i)).map(i => [i.name, i]));
  const toCreate = [];
  const toUpdate = [];

  for (const formKey of Object.keys(LATARKA_FORMS)) {
    const data = buildLatarkaItemData(formKey);
    const existing = byName.get(data.name);
    if (existing) toUpdate.push({ _id: existing.id, ...data });
    else toCreate.push(data);
  }

  if (toCreate.length) await actor.createEmbeddedDocuments("Item", toCreate);
  if (toUpdate.length) await actor.updateEmbeddedDocuments("Item", toUpdate);

  for (const item of actor.items.filter(i => isLatarka(i))) await ensureLatarkaActivities(item);

  ui.notifications.info(`Zbrojownia: ${toCreate.length} nowych latarek, ${toUpdate.length} zaktualizowanych.`);
  return { created: toCreate.length, updated: toUpdate.length };
}

export async function createLatarkaItem(formKey, { actor } = {}) {
  const data = buildLatarkaItemData(formKey);
  const created = actor
    ? (await actor.createEmbeddedDocuments("Item", [data]))[0]
    : await Item.create(data);
  if (!created) throw new Error("Latarka: createEmbeddedDocuments/Item.create returned nothing");

  await ensureLatarkaActivities(created);
  return created;
}

/* -------------------------------------------- */
/*  Hooks                                         */
/* -------------------------------------------- */

function onPreUseActivity(activity) {
  const item = _liveItem(activity?.item);
  if (!item || !isLatarka(item)) return;
  const identifier = activity.visibility?.identifier;

  if (identifier === ON_ID) {
    if (isOn(item)) { ui.notifications.warn(`${item.name} już świeci.`); return false; }
    if (usesBattery(item) && !hasBattery(item)) {
      ui.notifications.warn(`${item.name}: brak baterii.`);
      return false;
    }
    // See `turnOn()`'s matching comment — `_light()` silently skips an unequipped item.
    if (!item.system?.equipped) {
      ui.notifications.warn(`${item.name}: załóż ją najpierw (nie jest noszona).`);
      return false;
    }
  }
  if (identifier === OFF_ID && !isOn(item)) {
    ui.notifications.warn(`${item.name} nie świeci.`);
    return false;
  }
}

function onPostUseActivity(activity) {
  const item = _liveItem(activity?.item);
  if (!item || !isLatarka(item)) return;
  const identifier = activity.visibility?.identifier;
  if (identifier === ON_ID) turnOn(item);
  else if (identifier === OFF_ID) turnOff(item);
  else if (identifier === INSERT_ID) insertBattery(item);
}

/** GM-only sweep: go dark on anything whose scheduled instant has passed. */
async function onWorldTime() {
  if (!game.user.isActiveGM) return;
  const now = game.time.worldTime;
  const items = [...game.items, ...game.actors.map(a => [...a.items]).flat()];
  for (const item of items) {
    const at = item.getFlag(MODULE_ID, FLAG_BURNOUT_AT);
    if (at != null && now >= at) await _goDark(item);
  }
}

function onUpdateItem(item, changes) {
  if (!isLatarka(item)) return;
  if (foundry.utils.hasProperty(changes, "system.equipped")) syncActorLight(item.actor);
}

/**
 * Bateria row on the item sheet's Details tab — shared markup/logic from
 * `items/power-source.mjs`. Dynamo forms skip this entirely (nothing to show/edit).
 */
function onRenderItemSheet(app, html) {
  const item = app.document ?? app.item;
  if (!isLatarka(item) || !usesBattery(item)) return;

  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;

  const status = getPowerStatus(item);
  if (status) renderPowerRow(root, status);
}

async function ensureAllLatarkaActivities() {
  const items = [...game.items, ...game.actors.map(a => [...a.items]).flat()];
  for (const item of items) {
    if (isLatarka(item) && !_getActivity(item, ON_ID)) await ensureLatarkaActivities(item);
  }
}

export function registerLatarka() {
  registerLightProvider(_latarkaLightProvider);
  registerLightOffSwitch(_turnOffOtherLatarki);
  registerPowerSource({ test: isLatarka, describe: _latarkaPowerDescriptor });

  Hooks.on("dnd5e.preUseActivity", onPreUseActivity);
  Hooks.on("dnd5e.postUseActivity", onPostUseActivity);
  Hooks.on("updateWorldTime", onWorldTime);
  Hooks.on("updateItem", onUpdateItem);
  Hooks.on("renderItemSheet5e", onRenderItemSheet);

  Hooks.on("createItem", (item) => { if (game.user.isGM) ensureLatarkaActivities(item); });
  if (game.user.isGM) ensureAllLatarkaActivities();

  // Kolor Kobaltu (docs/Kobalt.md, rule 6) changes `_light()`'s output live, but nothing
  // re-pushes that to already-placed tokens on its own — `syncActorLight` only runs when
  // something *item-side* changes (ignite, equip, battery...). Re-sync every actor's light the
  // moment the GM flips the world setting, on every client — same "each client independently
  // reacts to the same document change" pattern `light-sources.mjs`'s own doc comment describes
  // for the wide/narrow light split.
  Hooks.on("updateSetting", (setting) => {
    if (setting.key !== `${MODULE_ID}.kobaltEnabled`) return;
    for (const actor of game.actors) syncActorLight(actor);
  });

  console.log(`${MODULE_ID} | Latarka registered`);
}

/** Public API, exposed on `game.neuroshima.latarka` from main.mjs. */
export const latarkaApi = {
  forms: LATARKA_FORMS,
  turnOn,
  turnOff,
  insertBattery,
  create: createLatarkaItem,
  initialize: initializeLatarka,
  stock: createLatarkaStock,
};
