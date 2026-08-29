/**
 * Neuroshima 5e — cross-actor inventory category audit/repair.
 *
 * Three categorisation systems on the sheet each gate on the item's actual
 * `type`/`system.type` fields, not just its icon or name — so a loot item that
 * merely *looks* right (correct icon, correct-sounding name) can still be
 * invisible to the panel that's supposed to show it. Caught live, 2026-08-29:
 * Raynald's "Litry chemii" had `chemia.svg` (the Surowce icon) but was still
 * `type: "loot"`, so `getSurowiecType()` — which requires `type === "consumable"`
 * before it even looks at the icon — silently skipped it. Same shape of bug
 * hits the Pirotechnika panel (needs `consumable` + `ammo` + `grenade-*`
 * subtype, not just a grenade-sounding name) and the Chemia system (has a real
 * `lekarstwo` item type with working dosing/effects that plain loot never gets).
 *
 * Same audit/repair shape as `weapons-data.mjs` (`auditWeapons`/`repairWeapons`):
 * read-only report first, explicit repair second, nothing touched without
 * calling the repair function. Skips the Zbrojownia master actor — it is
 * catalog data, not carried inventory.
 */

import { SUROWCE_TYPES, getSurowiecType } from "./surowce-data.mjs";
import { GRENADE_TYPES, GRENADE_MAP, AMMO_CALIBER_MAP } from "./ammo-data.mjs";
import { CHEMIA, chemiaKeyByName, chemiaItemData } from "./chemia-data.mjs";
import { WEAPONS, WEAPON_NAME_ALIASES } from "./weapons-data.mjs";
import { ARMORS } from "./armor-data.mjs";
import { ADDON_DEFS } from "./addons-data.mjs";
import { TOOLKITS } from "./toolkits-data.mjs";
import { GEAR_PLACEHOLDERS } from "./gear-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/* -------------------------------------------- */
/*  Surowce (raw crafting materials)             */
/* -------------------------------------------- */

const SUROWCE_ICON_BASENAMES = new Set(SUROWCE_TYPES.map(t => t.icon.toLowerCase()));

function _iconBasename(item) {
  return (item.img || "").split("/").pop()?.toLowerCase() ?? "";
}

/**
 * Items whose icon is a Surowce icon but whose `type` isn't `consumable`,
 * so `getSurowiecType()` never gets far enough to look at the icon.
 */
export function auditSurowce() {
  const diffs = [];
  for (const actor of game.actors) {
    if (actor.getFlag(MODULE_ID, "isZbrojownia")) continue;
    for (const item of actor.items) {
      if (item.type === "consumable") continue;
      if (!SUROWCE_ICON_BASENAMES.has(_iconBasename(item))) continue;
      diffs.push({ actor: actor.name, actorId: actor.id, item: item.name, itemId: item.id,
        current: item.type, expected: "consumable" });
    }
  }
  return diffs;
}

/**
 * Foundry does not allow an embedded Item's document `type` to change via a plain
 * update — confirmed live: `updateEmbeddedDocuments` with a `type` key returns an
 * empty result array (no error, no-op) rather than applying it. Every repair here
 * has to delete the old document and create a fresh one of the right type instead.
 */
export async function repairSurowce(diffs) {
  diffs ??= auditSurowce();
  for (const d of diffs) {
    const actor = game.actors.get(d.actorId);
    const item = actor?.items.get(d.itemId);
    if (!item) continue;

    const data = item.toObject();
    delete data._id;
    data.type = "consumable";
    await actor.createEmbeddedDocuments("Item", [data]);
    await actor.deleteEmbeddedDocuments("Item", [d.itemId]);
  }
  return diffs.length;
}

/* -------------------------------------------- */
/*  Pirotechnika (grenades/mines/charges)        */
/* -------------------------------------------- */

/**
 * Loose Polish-declension aliases — `chemiaKeyByName`'s substring trick doesn't
 * survive plural/case endings ("granaty dymne" does not contain "granat dymny"),
 * so grenades get an explicit regex table instead. Order matters: first match wins.
 */
const GRENADE_NAME_ALIASES = [
  { re: /koktajl\s*mo[lł]otowa/i, id: "grenade-molotov" },
  { re: /mina\s*przeciwpiech/i, id: "grenade-antipersonnel-mine" },
  { re: /mina\s*przeciwpojazd/i, id: "grenade-antivehicle-mine" },
  { re: /\bc-?4\b/i, id: "grenade-c4-remote" },
  { re: /dynamit/i, id: "grenade-dynamite-remote" },
  { re: /pipebomb/i, id: "grenade-pipebomb-fuze" },
  { re: /granat(?:y)?\s*dymn/i, id: "grenade-smoke" },
  { re: /granat(?:y)?\s*gazow/i, id: "grenade-gas" },
  { re: /granat(?:y)?\s*huk/i, id: "grenade-flashbang" },
  { re: /ładunek\s*improwizowany|ladunek\s*improwizowany|granat(?:y)?\s*improwizowany/i, id: "grenade-improvised" },
  { re: /granat(?:y)?\s*od[lł]amkow/i, id: "grenade-frag" },
  { re: /granat(?:y)?\s*zapalaj/i, id: "grenade-incendiary" },
  { re: /granat(?:y)?\s*sygna[lł]ow/i, id: "grenade-signal" }
];

function _grenadeIdForName(name) {
  const norm = String(name ?? "");
  for (const { re, id } of GRENADE_NAME_ALIASES) if (re.test(norm)) return id;
  return null;
}

/** Leading count in a Polish plural item name — "3 granaty dymne" → 3. */
function _leadingCount(name) {
  const m = String(name ?? "").match(/^(\d+)\s+/);
  return m ? Number(m[1]) : null;
}

function _isProperGrenadeItem(item, id) {
  return item.type === "consumable"
    && item.system.type?.value === "ammo"
    && item.system.type?.subtype === id;
}

export function auditPirotechnika() {
  const diffs = [];
  for (const actor of game.actors) {
    if (actor.getFlag(MODULE_ID, "isZbrojownia")) continue;
    for (const item of actor.items) {
      if (item.type !== "loot" && item.type !== "weapon") continue;
      const id = _grenadeIdForName(item.name);
      if (!id) continue;
      if (_isProperGrenadeItem(item, id)) continue;

      const def = GRENADE_MAP[id];
      const count = _leadingCount(item.name);
      diffs.push({
        actor: actor.name, actorId: actor.id, item: item.name, itemId: item.id,
        current: `${item.type} "${item.name}"`,
        expected: `consumable/ammo/${id} ("${def.label}"${count ? `, ×${count}` : ""})`,
        grenadeId: id,
        quantity: count ?? item.system.quantity ?? 1
      });
    }
  }
  return diffs;
}

export async function repairPirotechnika(diffs) {
  diffs ??= auditPirotechnika();
  for (const d of diffs) {
    const actor = game.actors.get(d.actorId);
    const def = GRENADE_MAP[d.grenadeId];
    if (!actor || !def) continue;

    // Fold into an existing proper grenade stack of the same subtype, if any.
    const existing = actor.items.find(i => i.id !== d.itemId && _isProperGrenadeItem(i, d.grenadeId));
    if (existing) {
      await existing.update({ "system.quantity": (existing.system.quantity ?? 0) + d.quantity });
      await actor.deleteEmbeddedDocuments("Item", [d.itemId]);
      continue;
    }

    // `type` can't change via update (see repairSurowce) — delete + create instead.
    await actor.createEmbeddedDocuments("Item", [{
      name: def.label,
      type: "consumable",
      img: `modules/${MODULE_ID}/icons/weapons/${def.icon}`,
      system: {
        type: { value: "ammo", subtype: d.grenadeId },
        quantity: d.quantity,
        weight: { value: def.weight, units: "kg" },
        price: { value: def.price, denomination: "gp" },
        description: {
          value: `<p><strong>Obszar:</strong> ${def.area ?? "—"}</p><p><strong>RO:</strong> ${def.save ?? "—"}</p><p>${def.effect ?? ""}</p>`
        }
      }
    }]);
    await actor.deleteEmbeddedDocuments("Item", [d.itemId]);
  }
  return diffs.length;
}

/* -------------------------------------------- */
/*  Chemia (drugs/medicine → real lekarstwo)     */
/* -------------------------------------------- */

export function auditChemia() {
  const diffs = [];
  for (const actor of game.actors) {
    if (actor.getFlag(MODULE_ID, "isZbrojownia")) continue;
    for (const item of actor.items) {
      if (item.type !== "loot" && item.type !== "consumable") continue;
      if (item.getFlag(MODULE_ID, "chemiaKey")) continue; // already a real lekarstwo item
      const key = chemiaKeyByName(item.name);
      if (!key) continue;

      const def = CHEMIA[key];
      const count = _leadingCount(item.name); // e.g. "2 Taurus" — the "2" isn't in system.quantity
      diffs.push({
        actor: actor.name, actorId: actor.id, item: item.name, itemId: item.id,
        current: `${item.type} "${item.name}"`,
        expected: `lekarstwo "${def.label}"${count ? ` (×${count})` : ""}`,
        chemiaKey: key,
        quantity: count ?? item.system.quantity ?? 1
      });
    }
  }
  return diffs;
}

export async function repairChemia(diffs) {
  diffs ??= auditChemia();
  for (const d of diffs) {
    const actor = game.actors.get(d.actorId);
    if (!actor) continue;
    const data = chemiaItemData(d.chemiaKey, { quantity: d.quantity });
    await actor.createEmbeddedDocuments("Item", [data]);
    await actor.deleteEmbeddedDocuments("Item", [d.itemId]);
  }
  return diffs.length;
}

/* -------------------------------------------- */
/*  Chemia icons (catalog art added after the    */
/*  item was already created on a sheet)         */
/* -------------------------------------------- */

/**
 * `chemia-data.mjs` shipped most of its catalog on generic Foundry core
 * placeholders for a long time even after dedicated art landed in
 * `icons/items/drugs/` — `def.img` just never got pointed at it (fixed
 * 2026-08-29). Editing the catalog does not retroactively touch items already
 * created on a sheet; this repairs those. Unlike type changes, `img` is a
 * plain field — a normal `update()` works, no delete+create needed.
 */
export function auditChemiaIcons() {
  const diffs = [];
  for (const actor of game.actors) {
    if (actor.getFlag(MODULE_ID, "isZbrojownia")) continue;
    for (const item of actor.items) {
      const key = item.getFlag(MODULE_ID, "chemiaKey");
      if (!key) continue;
      const def = CHEMIA[key];
      if (!def?.img || item.img === def.img) continue;
      diffs.push({
        actor: actor.name, actorId: actor.id, item: item.name, itemId: item.id,
        current: item.img, expected: def.img
      });
    }
  }
  return diffs;
}

export async function repairChemiaIcons(diffs) {
  diffs ??= auditChemiaIcons();
  for (const d of diffs) {
    const actor = game.actors.get(d.actorId);
    const item = actor?.items.get(d.itemId);
    if (!item) continue;
    await item.update({ img: d.expected });
  }
  return diffs.length;
}

/* -------------------------------------------- */
/*  Item completeness: weight, price, catalog    */
/*  sourcing (2026-08-29)                        */
/* -------------------------------------------- */

/**
 * Read-only. Physical items only (weapon/equipment/consumable/loot/tool) — feats,
 * classes, subclasses and backgrounds have no weight/price by design and are skipped.
 * Flags an item when it has BOTH zero/missing weight AND zero/missing price AND cannot
 * be traced to any of the module's catalogs (weapon/armor/addon/chemia/grenade/ammo/
 * toolkit/gear-placeholder/surowiec) — that combination is the actual "nobody ever put
 * real data behind this" signal. An item legitimately free (a note) or legitimately
 * weightless-but-valuable would only trip ONE of the two, not both, so this stays
 * narrow on purpose: report the "hand-typed one-off with nothing behind it" case,
 * not every item that happens to have a 0 somewhere for a good reason.
 *
 * Deliberately read-only-forever, unlike the audits above: there is no safe automatic
 * repair for "invent a weight and a price for a narrative item nobody catalogued" —
 * that is a GM call, per house doctrine (detect, never silently apply).
 */
const _WEAPON_INDEX = new Map(WEAPONS.map(w => [w.name.toLowerCase(), w]));
for (const [alias, canonical] of Object.entries(WEAPON_NAME_ALIASES)) {
  const cat = WEAPONS.find(w => w.name === canonical);
  if (cat) _WEAPON_INDEX.set(alias.toLowerCase(), cat);
}
const _ARMOR_INDEX = new Map(ARMORS.map(a => [a.name.toLowerCase(), a]));
const _TOOLKIT_INDEX = new Map(TOOLKITS.map(t => [t.label.toLowerCase(), t]));
const _GEAR_INDEX = new Map(GEAR_PLACEHOLDERS.map(g => [g.label.toLowerCase(), g]));

const PHYSICAL_TYPES = new Set(["weapon", "equipment", "consumable", "loot", "tool", "container"]);

/** Whether an item can be traced to a known catalog/flag source, regardless of type. */
function _hasKnownSource(item) {
  if (item.getFlag(MODULE_ID, "chemiaKey")) return true;
  if (item.getFlag(MODULE_ID, "ulepszenie") && ADDON_DEFS[item.getFlag(MODULE_ID, "ulepszenie")]) return true;
  if (getSurowiecType(item)) return true;

  const nameLower = (item.name ?? "").toLowerCase();
  if (item.type === "weapon" && _WEAPON_INDEX.has(nameLower)) return true;
  if (item.type === "equipment" && _ARMOR_INDEX.has(nameLower)) return true;
  if (item.type === "tool" && _TOOLKIT_INDEX.has(nameLower)) return true;
  if (item.type === "loot" && _GEAR_INDEX.has(nameLower)) return true;

  if (item.type === "consumable" && item.system.type?.value === "ammo") {
    const subtype = item.system.type?.subtype;
    if (subtype && (GRENADE_MAP[subtype] || AMMO_CALIBER_MAP[subtype])) return true;
  }
  return false;
}

function _isEmptyValue(v) {
  return v == null || v === 0;
}

export function auditItemCompleteness() {
  const diffs = [];
  for (const actor of game.actors) {
    if (actor.getFlag(MODULE_ID, "isZbrojownia")) continue;
    if (/^TEST/i.test(actor.name)) continue; // dev/QA fixtures, not campaign content
    for (const item of actor.items) {
      if (!PHYSICAL_TYPES.has(item.type)) continue;
      // SRD monster natural weapons/attacks (Bite, Claw, Slam, Gore, spell-attack
      // stand-ins like "Arcane Burst") are legitimately uncosted — nobody buys a
      // boar's tusks. dnd5e's own weapon subtype for these is "natural".
      if (item.type === "weapon" && item.system.type?.value === "natural") continue;

      const weight = item.system.weight?.value ?? item.system.weight ?? null;
      const price = item.system.price?.value ?? null;
      if (!_isEmptyValue(weight) || !_isEmptyValue(price)) continue; // at least one is real — not this bug
      if (_hasKnownSource(item)) continue;

      diffs.push({
        actor: actor.name, actorId: actor.id, item: item.name, itemId: item.id,
        type: item.type, weight, price
      });
    }
  }

  const actorsAffected = new Set(diffs.map(d => d.actorId)).size;
  console.log(`Neuroshima 5e | Item completeness audit: ${diffs.length} item(s) with no `
    + `weight, no price and no catalog source, across ${actorsAffected} actor(s).`, diffs);
  ui.notifications.info(
    diffs.length
      ? `Audyt kompletności: ${diffs.length} przedmiotów bez wagi/ceny/źródła na ${actorsAffected} aktorach `
        + `(szczegóły w konsoli). To lista do przejrzenia przez MG — nic nie zostało zmienione.`
      : "Audyt kompletności: brak przedmiotów bez wagi/ceny/źródła."
  );
  return { actors: actorsAffected, items: diffs.length, diffs };
}

/* -------------------------------------------- */
/*  Combined                                     */
/* -------------------------------------------- */

export function auditInventory() {
  const surowce = auditSurowce();
  const pirotechnika = auditPirotechnika();
  const chemia = auditChemia();
  const chemiaIcons = auditChemiaIcons();
  const all = [...surowce, ...pirotechnika, ...chemia, ...chemiaIcons];
  const actorsAffected = new Set(all.map(d => d.actorId)).size;

  console.log(`Neuroshima 5e | Inventory category audit: Surowce ${surowce.length}, `
    + `Pirotechnika ${pirotechnika.length}, Chemia ${chemia.length}, Chemia icons ${chemiaIcons.length} `
    + `— ${all.length} total across ${actorsAffected} actor(s).`,
    { surowce, pirotechnika, chemia, chemiaIcons });
  ui.notifications.info(
    all.length
      ? `Audyt ekwipunku: ${all.length} przedmiotów z rozjazdem na ${actorsAffected} aktorach `
        + `(Surowce ${surowce.length}, Pirotechnika ${pirotechnika.length}, Chemia ${chemia.length}, `
        + `ikony chemii ${chemiaIcons.length}) — szczegóły w konsoli.`
      : "Audyt ekwipunku: brak rozjazdów."
  );

  return { surowce, pirotechnika, chemia, chemiaIcons, actors: actorsAffected, items: all.length };
}

export async function repairInventory() {
  const report = auditInventory();
  const n1 = await repairSurowce(report.surowce);
  const n2 = await repairPirotechnika(report.pirotechnika);
  const n3 = await repairChemia(report.chemia);
  const n4 = await repairChemiaIcons(report.chemiaIcons);
  const total = n1 + n2 + n3 + n4;
  ui.notifications.info(`Naprawiono ${total} przedmiotów `
    + `(Surowce ${n1}, Pirotechnika ${n2}, Chemia ${n3}, ikony chemii ${n4}).`);
  return total;
}
