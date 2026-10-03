/**
 * Neuroshima 5e — wynik produkcji: z `ref` przepisu do prawdziwego przedmiotu (PLAN_produkcja §5.3).
 *
 * Źródła danych przedmiotu, w kolejności pewności:
 *
 * 1. **Kompendium modułu** — broń, pancerze, amunicja, granaty, leki, zestawy, magazynki, sprzęt.
 *    Przedmioty z paczek mają już aktywności, efekty i flagi; id jest deterministyczne
 *    (`idFor` z `dev/packs/build-packs.mjs` — tu odtworzone w przeglądarce), więc zbudowany
 *    przedmiot jest dokładnie tym, co MG wyciąga z paczki.
 * 2. **Builder z pliku danych** — ulepszenia, prowiant, sprzęt z `REAL_GEAR`, kolczatki,
 *    uzupełnienie medyka: tych paczki nie mają.
 * 3. **Zwykły `loot`** — przedmioty z cennika NOE bez katalogu modułu (`raw:`, `tabela:`).
 *
 * Wynik trafia do aktora, który trzyma Robotę (traktor zbudowany w Miejscu zostaje w Miejscu).
 * Przedmioty stosowalne dokładamy do stosu z tego samego źródła; broń, pancerz i magazynki
 * zawsze osobno (magazynek niesie własną kolejkę naboi — `quantity` musi zostać 1).
 */

import { KATALOG } from "../config/recipes-data.mjs";
import { ADDON_DEFS } from "../config/addons-data.mjs";
import { buildAddonLootItemData } from "../weapons/addons.mjs";
import { buildProwiantItemData } from "../config/prowiant-data.mjs";
import { REAL_GEAR, buildRealGearItemData } from "../config/gear-data.mjs";
import { buildKolczatkaItemData, ensureKolczatkaActivities } from "../items/kolczatka.mjs";
import { buildMedykRefillItemData, ensureMedykRefillActivities } from "../items/toolkit-medyk.mjs";
import { WEAPON_MAP, buildWeaponItemData } from "../config/weapons-data.mjs";
import { ARMOR_MAP, buildArmorItemData } from "../config/armor-data.mjs";
import { AMMO_CALIBER_MAP, buildAmmoItemData } from "../config/ammo-data.mjs";
import { PRODUCTION_GEAR, buildProductionGearItemData, productionGearIdForRef, productionGearRef } from "../items/production-gear.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const ICON = `modules/${MODULE_ID}/icons/items/loot`;

/** Paczka i rodzaj `idFor` per źródło `ref` (zob. `build*` w `dev/packs/build-packs.mjs`). */
const PACZKI = Object.freeze({
  weapon: { pack: "bron", kind: "weapon" },
  armor: { pack: "pancerze", kind: "armor" },
  ammo: { pack: "amunicja", kind: "ammo" },
  grenade: { pack: "granaty", kind: "grenade" },
  chemia: { pack: "lekarstwa", kind: "medicine" },
  toolkit: { pack: "narzedzia", kind: "toolkit" },
  magazine: { pack: "magazynki", kind: "magazine" }
});

/** `item:` z paczki `sprzet` — [rodzaj, slug] jak w builderze paczek. */
const SPRZET = Object.freeze({
  "latarka-reczna": ["equipment", "latarka-reczna"],
  "latarka-czolowa": ["equipment", "latarka-czolowa"],
  "latarka-dynamowa": ["equipment", "latarka-dynamowa"],
  "gogle-noktowizor": ["equipment", "gogle-noktowizor"],
  "gogle-termowizor": ["equipment", "gogle-termowizor"],
  "baterie": ["loot", "baterie"],
  "kwas": ["consumable", "kwas"],
  "detonator": ["equipment", "detonator-radiowy"],
  "zapalnik-elektryczny": ["consumable", "zapalnik-elektryczny"]
});

/** Production outputs promoted to reusable prototypes in the `sprzet` pack. */
const PRODUCTION_SPRZET = Object.freeze(Object.fromEntries(
  Object.keys(PRODUCTION_GEAR).map(id => [productionGearRef(id), ["loot", id]])
));

/** Ikony przedmiotów z cennika, które już mają grafikę; reszta — `dev/icons/MISSING.md`. */
const RAW_IKONY = Object.freeze({
  "radio": "radio.svg",
  "akumulator": "akumulator.svg",
  "agregat": "agregat.svg",
  "alternator": "alternator.svg",
  "defibrylator": "defibrylator.svg",
  "detektor-ruchu": "detektor_ruchu.svg",
  "komputer-osobisty": "komputer_osobisty.svg",
  "komputer-gamingowy": "komputer_gamingowy.svg",
  "kontroler": "kontroler_zdalnego_sterowania.svg",
  "miernik-skazenia": "miernik_skazenia_chemicznego.svg",
  "wykrywacz-metalu": "wykrywacz_metalu.svg",
  "palnik": "palnik_acetylenowo_tlenowy.svg",
  "srodek-usypiajacy": "srodek_usypiajacy.svg",
  "srodki-dezynfekujace": "srodki_dezynfekujace.svg",
  "paralotnia": "paralotnia.svg",
  "adapter-wifi": "adapter_wifi.svg",
  "monitorek": "monitorek.svg",
  "router": "router.svg",
  "krotkofalowka": "krotkofalowka.svg",
  "miernik-promieniowania": "miernik_promieniowania.svg",
  "nosnik-danych": "pendrive.svg",
  "klodka": "klodka.svg",
  "lopata": "lopata.svg",
  "proch-czarny-20g": "proch_czarny.svg",
  "proch-strzelniczy-20g": "proch_strzelniczy.svg",
  "nitrogliceryna-20g": "nitrogliceryna.svg"
});

/** Zastępcza ikona per kategoria — nigdy ikona surowca (`auditSurowce` zgłasza loot z nią). */
const IKONA_KATEGORII = Object.freeze({
  elektronika: "icons/svg/lightning.svg",
  komputery: "icons/svg/lightning.svg",
  "chemia-uzytkowa": "icons/svg/pill.svg",
  leki: "icons/svg/pill.svg",
  "materialy-wybuchowe": "icons/svg/fire.svg",
  uslugi: "icons/svg/gears.svg",
  pojazdy: "icons/svg/wing.svg"
});

const ID_CHARS = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

/** `idFor` z `dev/packs/build-packs.mjs`, w przeglądarce (SHA-1 przez WebCrypto). */
async function _idFor(kind, slug) {
  const bytes = new TextEncoder().encode(`${MODULE_ID}:${kind}:${slug}`);
  const h = new Uint8Array(await crypto.subtle.digest("SHA-1", bytes));
  let out = "";
  for (let i = 0; i < 16; i++) out += ID_CHARS[h[i] % ID_CHARS.length];
  return out;
}

/** UUID przedmiotu w kompendium modułu dla danego `ref` albo null. */
export async function uuidWKompendium(ref) {
  const [src, id] = String(ref).split(/:(.*)/s);
  if (PACZKI[src]) return `Compendium.${MODULE_ID}.${PACZKI[src].pack}.Item.${await _idFor(PACZKI[src].kind, id)}`;
  if (src === "item" && SPRZET[id]) return `Compendium.${MODULE_ID}.sprzet.Item.${await _idFor(...SPRZET[id])}`;
  if (PRODUCTION_SPRZET[ref]) return `Compendium.${MODULE_ID}.sprzet.Item.${await _idFor(...PRODUCTION_SPRZET[ref])}`;
  return null;
}

/** Zwykły `loot` dla celu bez katalogu modułu (albo gdy paczka zawiodła). */
function _lootZKatalogu(k) {
  const id = k.ref.split(":").slice(1).join(":");
  const img = RAW_IKONY[id] ? `${ICON}/${RAW_IKONY[id]}` : (IKONA_KATEGORII[k.kategoria] ?? "icons/svg/item-bag.svg");
  const zrodlo = k.s ? `NOE s. ${k.s}` : "tabela profesji — cena wyliczona z surowców";
  return {
    name: k.nazwa,
    type: "loot",
    img,
    system: {
      quantity: 1,
      weight: { value: k.waga, units: "kg" },
      price: { value: k.cena, denomination: "gb" },
      description: {
        value: `<p><em>Przedmiot z produkcji (${zrodlo}). Moduł nie ma jeszcze dla niego mechaniki — `
          + `zasady rozstrzyga MG.</em></p>`
      }
    },
    flags: { [MODULE_ID]: { produktZastepczy: k.ref } }
  };
}

/**
 * Dane jednego przedmiotu-wyniku (ilość 1). `null` dla wyników, które nie są przedmiotem
 * (aktor, usługa — karta dla MG).
 * @returns {Promise<{data: object, uuid: string|null, stos: boolean, poUtworzeniu?: Function}|null>}
 */
export async function daneWyniku(ref) {
  const k = KATALOG.get(ref);
  if (!k || k.wynik !== "item") return null;
  const [src, id] = String(ref).split(/:(.*)/s);

  const uuid = await uuidWKompendium(ref);
  if (uuid) {
    const doc = await fromUuid(uuid).catch(() => null);
    if (doc) {
      const data = game.items.fromCompendium(doc, { keepId: false, clearFolder: true });
      const stos = ["consumable", "loot"].includes(data.type) && src !== "magazine";
      return { data, uuid, stos };
    }
    // Paczka jeszcze nieprzebudowana (nowy wpis katalogu) — ten sam builder, którego używa paczka.
    if (src === "weapon" && WEAPON_MAP[id]) return { data: buildWeaponItemData(WEAPON_MAP[id]), uuid: null, stos: false };
    if (src === "armor" && ARMOR_MAP[id]) return { data: buildArmorItemData(ARMOR_MAP[id]), uuid: null, stos: false };
    if (src === "ammo" && AMMO_CALIBER_MAP[id]) return { data: buildAmmoItemData(AMMO_CALIBER_MAP[id]), uuid: null, stos: true };
    const productionGearId = productionGearIdForRef(ref);
    if (productionGearId) {
      return { data: buildProductionGearItemData(productionGearId), uuid: null, stos: true };
    }
    console.warn(`${MODULE_ID} | produkcja: brak ${uuid} w kompendium (${ref}) — tworzę zwykły przedmiot`);
  }

  if (src === "addon" && ADDON_DEFS[id]) return { data: buildAddonLootItemData(ADDON_DEFS[id]), uuid: null, stos: false };
  if (src === "prowiant") return { data: buildProwiantItemData(id, 1), uuid: null, stos: true };
  if (src === "gear") {
    const g = REAL_GEAR.find(x => x.id === id);
    if (g) return { data: buildRealGearItemData(g), uuid: null, stos: false };
  }
  if (ref === "item:kolczatka") return { data: buildKolczatkaItemData(), uuid: null, stos: false, poUtworzeniu: ensureKolczatkaActivities };
  if (ref === "item:medyk-refill") return { data: buildMedykRefillItemData(), uuid: null, stos: false, poUtworzeniu: ensureMedykRefillActivities };
  return { data: _lootZKatalogu(k), uuid: null, stos: true };
}

/**
 * Wynik przepisu ad hoc MG: dane przedmiotu zapisane w snapshocie (przeciągnięty dowolny
 * przedmiot, §5.1 pkt 3). Bez `_id`, bez folderu — nowa sztuka, nie kopia z tym samym id.
 */
function _zDanych(dane) {
  const data = foundry.utils.deepClone(dane);
  delete data._id;
  delete data.folder;
  delete data.sort;
  delete data.ownership;
  if (data.flags?.[MODULE_ID]) delete data.flags[MODULE_ID].robota;
  const uuid = data._stats?.compendiumSource ?? null;
  return { data, uuid, stos: ["consumable", "loot"].includes(data.type) };
}

/** Ikona wyniku (Robota i Schemat noszą ikonę tego, co powstanie). */
export async function ikonaWyniku(ref, dane = null) {
  if (dane?.img) return dane.img;
  const k = KATALOG.get(ref);
  if (!k) return "icons/svg/item-bag.svg";
  if (k.wynik !== "item") return IKONA_KATEGORII[k.kategoria] ?? "icons/svg/item-bag.svg";
  try {
    return (await daneWyniku(ref))?.data?.img ?? "icons/svg/item-bag.svg";
  } catch {
    return "icons/svg/item-bag.svg";
  }
}

/** Istniejący stos tego samego wyniku u aktora. */
function _stosU(actor, wynik) {
  return actor.items.find(i => {
    if (i.type !== wynik.data.type) return false;
    if (wynik.uuid) return i._stats?.compendiumSource === wynik.uuid;
    const f = i.flags?.[MODULE_ID] ?? {};
    const wf = wynik.data.flags?.[MODULE_ID] ?? {};
    if (wf.produktZastepczy) return f.produktZastepczy === wf.produktZastepczy;
    return i.name === wynik.data.name && (wf.prowiantId == null || f.prowiantId === wf.prowiantId);
  }) ?? null;
}

/**
 * Tworzy wynik u `holder`. Zwraca utworzone / zaktualizowane przedmioty.
 * @param {Actor} holder
 * @param {{ref: string, ilosc: number}} wynikPrzepisu
 * @param {{znacznik?: object}} [opts]  `znacznik` trafia do `flags.<mod>.produkcja` nowych sztuk
 * @returns {Promise<Item[]>}
 */
export async function utworzWynik(holder, wynikPrzepisu, { znacznik = null } = {}) {
  const ilosc = Math.max(1, Math.floor(wynikPrzepisu.ilosc ?? 1));
  const w = wynikPrzepisu.dane ? _zDanych(wynikPrzepisu.dane) : await daneWyniku(wynikPrzepisu.ref);
  if (!w) return [];

  if (w.stos) {
    const stos = _stosU(holder, w);
    if (stos) {
      await stos.update({ "system.quantity": (Number(stos.system.quantity) || 0) + ilosc });
      return [stos];
    }
    const data = foundry.utils.deepClone(w.data);
    data.system.quantity = ilosc;
    if (znacznik) foundry.utils.setProperty(data, `flags.${MODULE_ID}.produkcja`, znacznik);
    const created = await holder.createEmbeddedDocuments("Item", [data]);
    for (const c of created) await w.poUtworzeniu?.(c);
    return created;
  }

  const docs = Array.from({ length: ilosc }, () => {
    const data = foundry.utils.deepClone(w.data);
    if (data.system) data.system.quantity = 1;
    if (znacznik) foundry.utils.setProperty(data, `flags.${MODULE_ID}.produkcja`, znacznik);
    return data;
  });
  const created = await holder.createEmbeddedDocuments("Item", docs);
  for (const c of created) await w.poUtworzeniu?.(c);
  return created;
}

/* -------------------------------------------- */
/*  Przedmiot → cel w katalogu                   */
/* -------------------------------------------- */

let _poUuid = null;

/** Odwrotny indeks UUID kompendium → `ref` (liczony raz, 300+ skrótów SHA-1). */
async function _indeksUuid() {
  if (_poUuid) return _poUuid;
  const out = new Map();
  for (const ref of KATALOG.keys()) {
    const uuid = await uuidWKompendium(ref);
    if (uuid) out.set(uuid, ref);
  }
  _poUuid = out;
  return out;
}

/**
 * Który wpis katalogu to jest (przeciągnięty przedmiot → Schemat, Wprawa, przepis ad hoc).
 * Kolejność: źródło w kompendium, flagi modułu, nazwa. `null` — przedmiot spoza katalogu.
 * @param {Item|object} item
 * @returns {Promise<string|null>}
 */
export async function refDlaPrzedmiotu(item) {
  const src = item?._stats?.compendiumSource ?? item?.uuid;
  if (src) {
    const ref = (await _indeksUuid()).get(src);
    if (ref) return ref;
  }
  const f = item?.flags?.[MODULE_ID] ?? {};
  const kandydaci = [
    f.produktZastepczy,
    f.ulepszenie && `addon:${f.ulepszenie}`,
    f.prowiantId && `prowiant:${f.prowiantId}`,
    f.chemiaKey && `chemia:${f.chemiaKey}`,
    f.magazine?.id && `magazine:${f.magazine.id}`,
    f.gearId && `gear:${f.gearId}`
  ].filter(Boolean);
  for (const ref of kandydaci) if (KATALOG.has(ref)) return ref;
  const nazwa = String(item?.name ?? "").trim().toLowerCase();
  for (const k of KATALOG.values()) if (k.nazwa.toLowerCase() === nazwa && !k.zaslepka) return k.ref;
  return null;
}

export const __testing = Object.freeze({ idFor: _idFor, PACZKI, SPRZET });
