/**
 * Compendium lookups for station builders — by the module's own flags first (weaponId, caliber,
 * grenade, bestiary id, toolkit …), names second, so a renamed item shows up as a missing pick in
 * the build summary, not as a crash halfway through a reset.
 */

import { MODULE_ID } from "./guard.mjs";

const cache = new Map();

/** Every document of a module pack (`"bron"`) or a full pack id (`"world.poligon-obsada"`), cached per page. */
export async function packDocs(name) {
  const id = name.includes(".") ? name : `${MODULE_ID}.${name}`;
  if (!cache.has(id)) {
    const pack = game.packs.get(id);
    cache.set(id, pack ? pack.getDocuments() : Promise.resolve([]));
  }
  return cache.get(id);
}

export function forgetPack(name) {
  cache.delete(name.includes(".") ? name : `${MODULE_ID}.${name}`);
}

const FLAG_KEYS = {
  bron: "weaponId", amunicja: "caliber", granaty: "grenade", narzedzia: "toolkit", pancerze: "armorId",
  lekarstwa: "chemiaKey", klasy: "classId", profesje: "professionId", pochodzenia: "originId",
  "zdolnosci-klasowe": "abilityId", towarzysze: "towarzyszSzablon"
};

/**
 * One document: `ref` is a name (case-insensitive), `{flag: value}` on the pack's own key, a
 * `{key: value}` flag pair, or a predicate. Bestiary entries match `flags.<mod>.bestiary.id` too.
 */
export async function find(pack, ref) {
  const docs = await packDocs(pack);
  if (typeof ref === "function") return docs.find(ref) ?? null;
  if (ref && typeof ref === "object") {
    const [[key, value]] = Object.entries(ref);
    const k = key === "flag" ? FLAG_KEYS[pack] : key;
    return docs.find(d => d.flags?.[MODULE_ID]?.[k] === value) ?? null;
  }
  const want = String(ref).toLowerCase();
  return docs.find(d => d.name.toLowerCase() === want)
    ?? docs.find(d => d.flags?.[MODULE_ID]?.[FLAG_KEYS[pack]] === ref)
    ?? docs.find(d => d.flags?.[MODULE_ID]?.bestiary?.id === ref)
    ?? null;
}

/** `"bron:B 92"` / `"granaty:{grenade-frag}"` → `[pack, ref]`. */
export function parseRef(s) {
  const m = /^([a-z-]+):(.+)$/.exec(String(s));
  if (!m) throw new Error(`Poligon: item ref "${s}" is not "pack:name"`);
  const flag = /^\{(.+)\}$/.exec(m[2]);
  return [m[1], flag ? { flag: flag[1] } : m[2]];
}

/** A bestiary entry by its creature id (`"gangus-kapo"`) or name. */
export async function bestiary(ref) {
  return find("bestiariusz", d => d.flags?.[MODULE_ID]?.bestiary?.id === ref || d.name.toLowerCase() === String(ref).toLowerCase());
}
