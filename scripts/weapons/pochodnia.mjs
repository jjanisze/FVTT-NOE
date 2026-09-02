/**
 * Neuroshima 5e — Pochodnia (torch), homebrew improvised weapon.
 *
 * Replaces the SRD "Torch" consumable, whose auto-generated attack Activity carries a
 * `target.template = { type: "radius", size: "40", units: "ft" }` — the compendium models
 * the torch's *light radius* as an attack-target template, so using it in combat prompts a
 * 40-foot AOE circle on the scene. That's the "hilariously large templates" bug; not worth
 * patching, so this is a fresh homebrew `weapon` item instead.
 *
 * Base stats follow RAW **Broń improwizowana** (podręcznik, "BROŃ IMPROWIZOWANA"):
 * no proficiency bonus, 1k4 damage of a type the GM deems fitting — here obuchowe (blunt).
 * Lit adds a flat +1 od ognia on top, mirroring how the stock SRD Torch models its own
 * "+1 fire damage" (a second `damage.parts` entry with `custom.formula: "1"`).
 *
 * ## Fuel model
 *
 * Fuel is a 0–100 percentage of the variant's total burn time, stored as an item flag
 * (not `system.uses` — a Pochodnia can be an unowned world item with no actor to hang
 * `system.uses` recovery off of). Igniting costs a flat 10% of max fuel just to get it lit
 * (striking sparks, catching the rag); the remaining fuel then burns down in real elapsed
 * game time. If fuel is already ≤10% when you try to light it, ignition fails outright —
 * the last of the fuel sputters out and the torch becomes a Wypalona Pochodnia without ever
 * giving light.
 *
 * Extinguishing early (an action-free "special" activity, matching `engine.mjs`'s
 * Zgaś silnik) banks whatever fuel percentage hadn't burned yet.
 *
 * ## Burnout scheduling — same shape as `items/chemia.mjs`
 *
 * Fuel isn't an Active Effect at all (see "Fuel model" above — a Pochodnia can be an
 * unowned world item with no actor to hang one on), so Foundry v13+'s core
 * `ActiveEffectRegistry` (see `chemia.mjs`'s note, or DEV_GUIDE.md §10e) doesn't apply here
 * regardless of what it does or doesn't automate — there's no effect for it to track. A
 * torch that burns all the way down still can't detect its own expiry on its own, so: record
 * an absolute `game.time.worldTime` burnout instant on the item, sweep for due entries on
 * `updateWorldTime` (GM-only — this must run once, not once per client), and ride along
 * whenever combat or a rest actually advances world time. Nothing forces world time to move
 * outside of that — same honest limitation chemia.mjs documents, and by design: this GM
 * always tracks fuel against in-fiction game time, never real wall-clock time, precisely so
 * that world time standing still (nobody advancing it) means no fuel burns — see the "always
 * game time" decision in the project's own notes.
 *
 * ## Token illumination
 *
 * dnd5e 5.3 has no native link between an item's data and a placed token's `light` field
 * (Active Effects only touch the Actor document; a placed TokenDocument's appearance forks
 * from `prototypeToken` at creation and doesn't sync afterward). This module drives it by
 * hand: on ignite/extinguish/equip-toggle, it tells `light-sources.mjs` "here's what I'd want
 * lit for this actor," and that shared resolver picks the brightest light across every
 * light-granting item type (Pochodnia, Latarka, …) and pushes it to the actor's tokens. See
 * `items/light-sources.mjs`'s own doc comment for why this moved out of a private
 * per-module implementation — this file used to own that logic outright, back when it was the
 * only light-granting item in the module.
 */

import { registerLightProvider, syncActorLight } from "../items/light-sources.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/* -------------------------------------------- */
/*  Constants                                     */
/* -------------------------------------------- */

const ATTACK_ID = "pochodnia-atak";
const IGNITE_ID = "pochodnia-zapal";
const EXTINGUISH_ID = "pochodnia-zgas";

const FLAG_VARIANT = "pochodniaVariant";       // "improwizowana" | "smolowa" — set even once burnt (origin record)
const FLAG_LIT = "pochodniaLit";               // bool
const FLAG_FUEL = "pochodniaFuel";             // 0–100, % of max burn time remaining
const FLAG_START = "pochodniaStartTime";       // worldTime this lit session started
const FLAG_BURNOUT_AT = "pochodniaBurnoutAt";  // worldTime this session would run out on its own
const FLAG_BURNT = "pochodniaBurnt";           // bool — true once it's a Wypalona Pochodnia

const IGNITE_COST_PCT = 10;

const TORCH_COLOR = "#ff8c3c";
const TORCH_ANIMATION = { type: "torch", speed: 5, intensity: 5 };

/** Fire damage part appended to the attack activity while lit. Mirrors the stock SRD Torch. */
const FIRE_BONUS_PART = {
  types: ["fire"],
  custom: { enabled: true, formula: "1" },
  scaling: { mode: "", number: null, formula: "" }
};

const ICON_BASE = `modules/${MODULE_ID}/icons/weapons`;

export const POCHODNIA_VARIANTS = {
  improwizowana: {
    key: "improwizowana",
    label: "Pochodnia Improwizowana",
    burnMinutes: 30,
    light: { bright: 3, dim: 6 },
    weight: 0.6,
    price: 0,
    img: `${ICON_BASE}/pochodnia_improwizowana.svg`,
    description: "<p>Patyk, szmata, coś łatwopalnego znalezionego na miejscu. Skręcona naprędce, "
      + "pali się szybko i nierówno.</p><p><strong>Broń improwizowana</strong> — bez Premii Biegłości. "
      + "1k4 obuchowe; zapalona dodaje +1 od ognia. Zapalenie zużywa 10% paliwa. Pali się ok. 30 minut.</p>",
  },
  smolowa: {
    key: "smolowa",
    label: "Pochodnia Smołowa",
    burnMinutes: 90,
    light: { bright: 6, dim: 12 },
    weight: 0.4,
    price: 8,
    img: `${ICON_BASE}/pochodnia_smolowa.svg`,
    description: "<p>Solidnie zrobiona, drzewce maczane w smole. Pali się długo i równo, lżejsza "
      + "od naprędce skręconej wersji.</p><p><strong>Broń improwizowana</strong> — bez Premii Biegłości. "
      + "1k4 obuchowe; zapalona dodaje +1 od ognia. Zapalenie zużywa 10% paliwa. Pali się ok. 1,5 godziny.</p>",
  }
};

const BURNT_LABEL = "Wypalona Pochodnia";
const BURNT_IMG = `${ICON_BASE}/pochodnia_wypalona.svg`;
const BURNT_DESCRIPTION = "<p>Zwęglony kij. Dawno wypalona — nie da się jej ponownie zapalić. "
  + "Nadal można nią walić jak pałką.</p><p><strong>Broń improwizowana</strong> — bez Premii Biegłości. 1k4 obuchowe.</p>";

/* -------------------------------------------- */
/*  Helpers                                       */
/* -------------------------------------------- */

function _liveItem(item) {
  return item?.actor?.items?.get(item.id) ?? item;
}

function isPochodnia(item) {
  return item?.type === "weapon" && !!item.getFlag?.(MODULE_ID, FLAG_VARIANT);
}

function isBurnt(item) {
  return !!item?.getFlag?.(MODULE_ID, FLAG_BURNT);
}

function isLit(item) {
  return !!item?.getFlag?.(MODULE_ID, FLAG_LIT);
}

function variantOf(item) {
  return POCHODNIA_VARIANTS[item?.getFlag?.(MODULE_ID, FLAG_VARIANT)] ?? null;
}

function _getActivity(item, identifier) {
  return item.system.activities?.find(a => a.visibility?.identifier === identifier) ?? null;
}

function _attackActivity(item) {
  return _getActivity(item, ATTACK_ID) ?? item.system.activities?.find(a => a.type === "attack") ?? null;
}

/** Damage parts with any prior fire-bonus part stripped — the stable "base only" state. */
function _baseParts(activity) {
  const parts = foundry.utils.deepClone(activity?.toObject?.().damage?.parts ?? activity?.damage?.parts ?? []);
  return parts.filter(p => !(p.types?.includes("fire") && p.custom?.formula === "1"));
}

/* -------------------------------------------- */
/*  Chat card                                     */
/* -------------------------------------------- */

async function _postCard(item, html, { flavor } = {}) {
  const speaker = ChatMessage.getSpeaker({ actor: item.actor });
  await ChatMessage.create({
    speaker,
    flavor: flavor ?? item.name,
    content: `<div class="neuro-pochodnia-card"><div class="neuro-pochodnia-head">${item.name}</div>${html}</div>`,
  });
}

/* -------------------------------------------- */
/*  Token illumination                            */
/* -------------------------------------------- */

/** Registered once at `registerPochodnia()` — see `items/light-sources.mjs`. */
function _pochodniaLightProvider(actor) {
  if (!actor) return null;
  let best = null;
  for (const item of actor.items) {
    if (!isPochodnia(item) || isBurnt(item) || !isLit(item)) continue;
    if (!item.system?.equipped) continue;
    const variant = variantOf(item);
    if (!variant) continue;
    if (!best || variant.light.bright > best.bright) best = variant.light;
  }
  if (!best) return null;
  return { bright: best.bright, dim: best.dim, color: TORCH_COLOR, alpha: 0.35, animation: TORCH_ANIMATION };
}

/** Thin alias kept so every existing call site below reads the same as before the refactor. */
const syncTokenLight = syncActorLight;

/* -------------------------------------------- */
/*  Activities                                    */
/* -------------------------------------------- */

/**
 * Single-flight lock for `ensurePochodniaActivities`, keyed by item — see that function's
 * doc comment for why a bare check-then-act body isn't enough. Maps to the in-flight
 * Promise (not just a boolean): a concurrent caller AWAITS the same promise instead of
 * either duplicating the work or — the bug a plain "skip if busy" boolean guard produces —
 * returning immediately while the real work is still in flight, so a caller reading the
 * item's activities right after `await ensurePochodniaActivities(item)` could still see it
 * mid-build.
 */
const _ensuringActivities = new Map();

/**
 * Ensures a Pochodnia item has its attack activity tagged (stable target for damage-part
 * patches) and its Zapal/Zgaś utility activities present. Safe to call on every load and on
 * every new item — but the check-then-act body below is only idempotent against SEQUENTIAL
 * calls, not concurrent ones: `createPochodniaItem` explicitly awaits this after creating the
 * item, but the `registerPochodnia()` `createItem` hook ALSO fires it (needed for a bare
 * compendium/manual `Item.create` with no explicit caller) — both read `item.system.activities`
 * before either write lands, both see the Zapal/Zgaś activities missing, both create them,
 * and the item ends up with two of each. Caught live creating a torch for Piekarz.
 */
export function ensurePochodniaActivities(item) {
  if (!isPochodnia(item)) return Promise.resolve();
  const key = item.uuid ?? item.id;

  const inFlight = _ensuringActivities.get(key);
  if (inFlight) return inFlight;

  const promise = _ensurePochodniaActivitiesUnguarded(item).finally(() => {
    _ensuringActivities.delete(key);
  });
  _ensuringActivities.set(key, promise);
  return promise;
}

async function _ensurePochodniaActivitiesUnguarded(item) {
  const attack = item.system.activities?.find(a => a.type === "attack");
  if (attack && attack.visibility?.identifier !== ATTACK_ID) {
    await item.update({ [`system.activities.${attack._id}.visibility.identifier`]: ATTACK_ID });
  }

  if (!_getActivity(item, IGNITE_ID)) {
    await item.createActivity("utility", {
      name: "Zapal pochodnię",
      activation: { type: "action" },
      visibility: { identifier: IGNITE_ID },
      description: { chatFlavor: "Pochodnia zapala się." },
    }, { renderSheet: false });
  }
  if (!_getActivity(item, EXTINGUISH_ID)) {
    await item.createActivity("utility", {
      name: "Zgaś pochodnię",
      activation: { type: "special" },
      visibility: { identifier: EXTINGUISH_ID },
      description: { chatFlavor: "Pochodnia gaśnie, niewypalone paliwo zostaje zachowane." },
    }, { renderSheet: false });
  }
}

/* -------------------------------------------- */
/*  Ignite / extinguish / burn out                */
/* -------------------------------------------- */

export async function igniteTorch(item) {
  item = _liveItem(item);
  const variant = variantOf(item);
  if (!variant || isBurnt(item) || isLit(item)) return;

  const fuel = item.getFlag(MODULE_ID, FLAG_FUEL) ?? 100;

  if (fuel <= IGNITE_COST_PCT) {
    await burnOut(item, { failedIgnition: true });
    return;
  }

  const newFuel = fuel - IGNITE_COST_PCT;
  const burnSeconds = variant.burnMinutes * 60 * (newFuel / 100);
  const now = game.time.worldTime;
  const attack = _attackActivity(item);

  const update = {
    [`flags.${MODULE_ID}.${FLAG_LIT}`]: true,
    [`flags.${MODULE_ID}.${FLAG_FUEL}`]: newFuel,
    [`flags.${MODULE_ID}.${FLAG_START}`]: now,
    [`flags.${MODULE_ID}.${FLAG_BURNOUT_AT}`]: now + burnSeconds,
  };
  if (attack) {
    update[`system.activities.${attack._id}.damage.parts`] = [..._baseParts(attack), foundry.utils.deepClone(FIRE_BONUS_PART)];
  }
  await item.update(update);

  await syncTokenLight(item.actor);
  await _postCard(item,
    `<p>Zapala się. Ognisty koniec syczy, potem łapie równy płomień. `
    + `Paliwo: <strong>${Math.round(newFuel)}%</strong>.</p>`);
}

/**
 * Fuel percentage right now — while lit this keeps burning down between flag writes
 * (the flag itself only gets refreshed on ignite/extinguish/burnout), so anything that
 * needs to *show* current fuel (the item-sheet row, chat cards) must compute it live
 * with the same formula `extinguishTorch`/`burnOut` use to actually bank it, not just
 * read the stale flag.
 */
function _liveFuelPercent(item) {
  const fuel = item.getFlag(MODULE_ID, FLAG_FUEL) ?? 0;
  if (!isLit(item)) return fuel;

  const variant = variantOf(item);
  if (!variant) return fuel;

  const start = item.getFlag(MODULE_ID, FLAG_START) ?? game.time.worldTime;
  const elapsedSec = Math.max(0, game.time.worldTime - start);
  const burnSeconds = variant.burnMinutes * 60;
  const consumedPct = burnSeconds > 0 ? (elapsedSec / burnSeconds) * 100 : 100;
  return Math.max(0, fuel - consumedPct);
}

export async function extinguishTorch(item, { silent = false } = {}) {
  item = _liveItem(item);
  const variant = variantOf(item);
  if (!variant || !isLit(item)) return;

  const remaining = _liveFuelPercent(item);
  const attack = _attackActivity(item);

  const update = {
    [`flags.${MODULE_ID}.${FLAG_LIT}`]: false,
    [`flags.${MODULE_ID}.${FLAG_FUEL}`]: remaining,
    [`flags.${MODULE_ID}.-=${FLAG_START}`]: null,
    [`flags.${MODULE_ID}.-=${FLAG_BURNOUT_AT}`]: null,
  };
  if (attack) update[`system.activities.${attack._id}.damage.parts`] = _baseParts(attack);
  await item.update(update);

  await syncTokenLight(item.actor);
  if (!silent) {
    await _postCard(item,
      `<p>Zgaszona. Niewypalone paliwo zachowane: <strong>${Math.round(remaining)}%</strong>.</p>`);
  }
}

/**
 * Turns a Pochodnia into a Wypalona Pochodnia, in place — same `_id`, so it stays wherever
 * it already was (inventory slot, chat history references, addon-style cross-links).
 */
export async function burnOut(item, { failedIgnition = false } = {}) {
  item = _liveItem(item);
  if (isBurnt(item)) return;
  const attack = _attackActivity(item);

  const update = {
    name: BURNT_LABEL,
    img: BURNT_IMG,
    "system.description.value": BURNT_DESCRIPTION,
    "system.price.value": 0,
    [`flags.${MODULE_ID}.${FLAG_LIT}`]: false,
    [`flags.${MODULE_ID}.${FLAG_FUEL}`]: 0,
    [`flags.${MODULE_ID}.${FLAG_BURNT}`]: true,
    [`flags.${MODULE_ID}.-=${FLAG_START}`]: null,
    [`flags.${MODULE_ID}.-=${FLAG_BURNOUT_AT}`]: null,
  };
  if (attack) update[`system.activities.${attack._id}.damage.parts`] = _baseParts(attack);
  await item.update(update);

  await syncTokenLight(item.actor);

  if (failedIgnition) {
    await _postCard(item,
      `<p><span class="bad">Nie chce się zapalić.</span> Ostatnie resztki paliwa syczą i gasną — `
      + `pochodnia jest teraz <strong>wypalona</strong>.</p>`,
      { flavor: "Nieudane zapalenie" });
  } else {
    await _postCard(item, `<p>Paliwo się kończy. Płomień gaśnie na dobre.</p>`, { flavor: "Wypalona" });
  }
}

/* -------------------------------------------- */
/*  Item factory                                  */
/* -------------------------------------------- */

/** Base `system` data shared by every Pochodnia variant, before variant-specific fields. */
function _baseSystemData() {
  return {
    type: { value: "biala", baseItem: "" },
    damage: {
      base: {
        number: 1, denomination: 4, bonus: "", types: ["bludgeoning"],
        custom: { enabled: false, formula: "" }, scaling: { mode: "", number: null, formula: "" }
      }
    },
    equipped: false, identified: true, proficient: 0, properties: ["fin"], quantity: 1,
    range: { value: null, long: null, units: "m" },
  };
}

/**
 * Converts an existing plain `weapon` item into a Pochodnia of the given variant (name,
 * icon, weight, price, description, damage, flags) and provisions its activities. Used to
 * upgrade a placeholder item without losing its `_id` / sheet position / ownership.
 */
export async function initializePochodnia(item, variantKey) {
  const variant = POCHODNIA_VARIANTS[variantKey];
  if (!variant) throw new Error(`Nieznany wariant Pochodni: ${variantKey}`);

  await item.update({
    name: variant.label,
    img: variant.img,
    "system.description.value": variant.description,
    "system.weight.value": variant.weight,
    "system.weight.units": "kg",
    "system.price.value": variant.price,
    "system.price.denomination": "gp",
    "system.proficient": 0,
    "system.properties": ["fin"],
    "system.type.value": "biala",
    "system.damage.base": _baseSystemData().damage.base,
    [`flags.${MODULE_ID}.${FLAG_VARIANT}`]: variantKey,
    [`flags.${MODULE_ID}.${FLAG_LIT}`]: false,
    [`flags.${MODULE_ID}.${FLAG_FUEL}`]: 100,
    [`flags.${MODULE_ID}.${FLAG_BURNT}`]: false,
  });

  await ensurePochodniaActivities(item);
  return item;
}

/**
 * Full item-data shape for a Pochodnia variant — no `_id`, no live-document calls, so this
 * runs equally well inside a Foundry client (`createPochodniaItem`) or a plain Node build
 * script (`dev/packs/build-packs.mjs`, generating the `bron` compendium entry). Keeping both
 * fed from one function is the same discipline `buildWeaponItemData`/`buildArmorItemData`
 * already follow — pack and runtime-created copies can't drift apart if there's only one
 * place that decides the shape.
 *
 * `system.activities` is deliberately absent/empty here, same reasoning as `buildWeapon()`'s
 * comment in build-packs.mjs: the Zapal/Zgaś activities are built live by
 * `ensurePochodniaActivities()`, which every Pochodnia gets for free via the `createItem`
 * hook the moment it's dragged out of the compendium — baking them into the packed data
 * would freeze them and risk duplicating on the first activity-tagging pass.
 */
export function buildPochodniaItemData(variantKey) {
  const variant = POCHODNIA_VARIANTS[variantKey];
  if (!variant) throw new Error(`Nieznany wariant Pochodni: ${variantKey}`);

  return {
    name: variant.label,
    type: "weapon",
    img: variant.img,
    system: {
      ..._baseSystemData(),
      description: { value: variant.description, chat: "" },
      weight: { value: variant.weight, units: "kg" },
      price: { value: variant.price, denomination: "gp" },
      identifier: `pochodnia-${variantKey}`,
    },
    flags: {
      [MODULE_ID]: {
        [FLAG_VARIANT]: variantKey, [FLAG_LIT]: false, [FLAG_FUEL]: 100, [FLAG_BURNT]: false
      }
    }
  };
}

/** Creates a brand new Pochodnia item (world item, or embedded on `actor`). */
export async function createPochodniaItem(variantKey, { actor } = {}) {
  const data = buildPochodniaItemData(variantKey);

  const created = actor
    ? (await actor.createEmbeddedDocuments("Item", [data]))[0]
    : await Item.create(data);
  if (!created) throw new Error("Pochodnia: createEmbeddedDocuments/Item.create returned nothing");

  await ensurePochodniaActivities(created);
  return created;
}

/* -------------------------------------------- */
/*  Hooks                                         */
/* -------------------------------------------- */

function onPreUseActivity(activity) {
  const item = _liveItem(activity?.item);
  if (!item || !isPochodnia(item)) return;
  const identifier = activity.visibility?.identifier;

  if (identifier === IGNITE_ID) {
    if (isBurnt(item)) { ui.notifications.warn(`${item.name} jest wypalona.`); return false; }
    if (isLit(item)) { ui.notifications.warn(`${item.name} już płonie.`); return false; }
  }
  if (identifier === EXTINGUISH_ID && !isLit(item)) {
    ui.notifications.warn(`${item.name} nie jest zapalona.`);
    return false;
  }
}

function onPostUseActivity(activity) {
  const item = _liveItem(activity?.item);
  if (!item || !isPochodnia(item)) return;
  const identifier = activity.visibility?.identifier;
  if (identifier === IGNITE_ID) igniteTorch(item);
  else if (identifier === EXTINGUISH_ID) extinguishTorch(item);
}

/** GM-only sweep: burn out anything whose scheduled instant has passed. */
async function onWorldTime() {
  if (!game.user.isActiveGM) return;
  const now = game.time.worldTime;
  const items = [...game.items, ...game.actors.map(a => [...a.items]).flat()];
  for (const item of items) {
    const at = item.getFlag(MODULE_ID, FLAG_BURNOUT_AT);
    if (at != null && now >= at) await burnOut(item);
  }
}

function onUpdateItem(item, changes) {
  if (!isPochodnia(item)) return;
  if (foundry.utils.hasProperty(changes, "system.equipped")) syncTokenLight(item.actor);
}

/**
 * Paliwo (fuel) row on the item sheet's Details tab — same anchor `magazine.mjs`'s own
 * Magazynek row uses. Manual refuelling (dolanie oleju, nowa szmata…) is deliberately not
 * automated — RAW/FVTT convention already lets a player freely edit their own item's
 * tracked numeric resource (charges, ammo, …), so this is just that: a plain number input
 * bound straight to the fuel flag, editable by the item's owner.
 *
 * Only editable while UNLIT. While lit, the stored flag is stale on purpose — see
 * `_liveFuelPercent`'s comment — so editing it directly would either show a player a
 * number that doesn't match what they're watching burn, or get silently overwritten by
 * the next extinguish/burnout's own recalculation from `FLAG_START`. Extinguish first
 * (which correctly banks the live remaining %), edit, then relight.
 */
function onRenderItemSheet(app, html) {
  const item = app.document ?? app.item;
  if (!isPochodnia(item) || isBurnt(item)) return;

  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;

  const detailsSection = root.querySelector(".item-properties, .details-tab, [data-tab='details'] .form-group:last-of-type");
  if (!detailsSection) return;

  const lit = isLit(item);
  const pct = Math.round(_liveFuelPercent(item));
  const canEdit = item.isOwner && !lit;

  const row = document.createElement("div");
  row.classList.add("form-group", "neuro-pochodnia-fuel-row");
  row.innerHTML = canEdit
    ? `
      <label>Paliwo</label>
      <div class="form-fields" style="display:flex; align-items:center; gap:6px;">
        <input type="number" name="flags.${MODULE_ID}.${FLAG_FUEL}" value="${pct}" min="0" max="100" step="1"
               data-dtype="Number" style="width:60px; text-align:center;">
        <span>%</span>
        <span style="font-size:11px; color:#888;">Ręczna edycja — dolanie oleju, świeża szmata itp.</span>
      </div>
    `
    : `
      <label>Paliwo</label>
      <div class="form-fields">
        <span>${pct}%${lit ? " — płonie, zgaś by edytować ręcznie" : ""}</span>
      </div>
    `;

  detailsSection.after(row);
}

/** Backfill: any Pochodnia already in the world that's missing its activities gets them. */
async function ensureAllPochodniaActivities() {
  const items = [...game.items, ...game.actors.map(a => [...a.items]).flat()];
  for (const item of items) {
    if (isPochodnia(item) && (!_getActivity(item, IGNITE_ID) || !_getActivity(item, EXTINGUISH_ID))) {
      await ensurePochodniaActivities(item);
    }
  }
}

export function registerPochodnia() {
  registerLightProvider(_pochodniaLightProvider);

  Hooks.on("dnd5e.preUseActivity", onPreUseActivity);
  Hooks.on("dnd5e.postUseActivity", onPostUseActivity);
  Hooks.on("updateWorldTime", onWorldTime);
  Hooks.on("updateItem", onUpdateItem);
  Hooks.on("renderItemSheet5e", onRenderItemSheet);
  // Token light-sync on creation is handled centrally by light-sources.mjs's own
  // `createToken` hook — no need to duplicate it here.

  Hooks.on("createItem", (item) => { if (game.user.isGM) ensurePochodniaActivities(item); });
  if (game.user.isGM) ensureAllPochodniaActivities();

  console.log("Neuroshima 5e | Pochodnia registered");
}

/** Public API, exposed on `game.neuroshima.pochodnia` from main.mjs. */
export const pochodniaApi = {
  variants: POCHODNIA_VARIANTS,
  ignite: igniteTorch,
  extinguish: extinguishTorch,
  burnOut,
  initialize: initializePochodnia,
  create: createPochodniaItem,
};
