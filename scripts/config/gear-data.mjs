/**
 * Neuroshima 5e — crafting-output placeholders ("Produkcja" links) + graduated real gear.
 *
 * Toolkit items (Narzędzia małego X) list what they can produce in their
 * description, matching 5e-2024's "Craft:" line on stock tool items (Smith's
 * Tools → Ball Bearings, Caltrops, Crowbar, …), which renders as a row of
 * `@UUID[]{}` content-links with icons.
 *
 * Most of Neuroshima's listed outputs (per `Tabele/Narzedzia.md`) have no real
 * Item yet — no weight/price/ST, because the crafting system itself (recipes,
 * materials, time) is not built. Rather than leave those as dead text forever,
 * this module creates minimal STUB Items — link targets only, visibly and
 * explicitly marked TODO — so the toolkit description can link to *something*
 * real (with its icon) today, without inventing crafting rules we don't have.
 *
 * TODO(crafting-window): once a real crafting UI exists, these stubs are the
 * items it should point at — fill in real stats/rules then, and drop the TODO
 * banner from `_gearDescription()` below. Until then these are placeholders,
 * not usable items — do not price or equip them as if they were real gear.
 *
 * ## REAL_GEAR (2026-09-06, batch 39) — graduated stubs
 *
 * Five of the twelve placeholders above (Sidła, Sprzęt do wspinaczki, Strzały,
 * Wózek — Kolczatki too, but that one needs an actual deploy Activity, so it
 * moved to its own file, `items/kolczatka.mjs`) got dedicated icon art AND real
 * price/weight/description, closing exactly the TODO this file's header has
 * been carrying since batch 35. They're removed from `GEAR_PLACEHOLDERS` below
 * (no longer placeholders) and live instead in `REAL_GEAR`, built the same
 * shape (id/label/icon → an upsert-by-flag Item factory) but WITHOUT the
 * TODO banner, `craftingPlaceholder` flag, or hazard-icon fallback — these are
 * finished, priced items, not link targets waiting on a crafting system.
 *
 * Where the numbers come from: Wózek (dwukółka) and Sprzęt do wspinaczki both
 * have real RAW stat-table entries (`Podręcznik/source.txt` — K100 SPRZĘT
 * table; Wózek also gets its own "WÓZEK TYPU DWUKÓŁKA" stat block with PW/TT/
 * Ładowność). Strzały (20 szt.) is derived, not invented separately: exactly
 * 20 × the real "Strzała" ammo entry's own price/weight (`ammo-data.mjs`),
 * matching the "20 strzał" starting-equipment quantity already referenced
 * elsewhere (`classes-data.mjs`). Sidła has no RAW stat-table entry anywhere
 * in the sourcebook (checked directly, not assumed) — its price/weight is a
 * GM estimate, flagged as such in its own description rather than presented
 * as sourced.
 *
 * `_resolveProdukcjaLinks()` in `toolkits-data.mjs` merges `REAL_GEAR`'s
 * upserted items into the same link map `GEAR_PLACEHOLDERS` feeds — the
 * kowal's "Produkcja" list keeps linking to "sidła"/"wózek"/etc. by the same
 * `gearId`s exactly as before, now landing on real items instead of stubs.
 * Any already-issued placeholder copies of the 4 graduated ids (on Raynald or
 * anyone else) are fixed in place, not left stale — see
 * `migration/migrate-gear-graduation.mjs`.
 */

const MODULE_ID = "neuroshima-2026-overrides";

/** Core Foundry icon used to make "this is a stub" visually obvious at a glance. */
const TODO_ICON = "icons/svg/hazard.svg";

/**
 * @typedef {object} GearPlaceholder
 * @property {string} id     Key used to look this item up from toolkit produkcja links.
 * @property {string} label  Display name.
 */

/**
 * `icon` is set only once real art exists for that id (batch 35, 2026-08-29) —
 * everything else still falls back to `TODO_ICON` below. Not a statement that
 * the item itself is "finished"; see the file header — pricing/weight/ST for
 * these still don't exist, only the picture stopped being a TODO triangle.
 *
 * Sidła / Sprzęt do wspinaczki / Strzały / Wózek / Kolczatki graduated out of
 * this array in batch 39 — see `REAL_GEAR` below and `items/kolczatka.mjs`.
 */
export const GEAR_PLACEHOLDERS = [
  { id: "belty", label: "Bełty", icon: "belty.svg" },
  { id: "igly", label: "Igły", icon: "igly.svg" },
  { id: "klodka", label: "Kłódka", icon: "klodka.svg" },
  { id: "lom", label: "Łom", icon: "lom.svg" },
  { id: "lopata", label: "Łopata", icon: "lopata.svg" },
  { id: "podkowy", label: "Podkowy", icon: "podkowy.svg" },
  { id: "plyty_pancerne", label: "Płyty pancerne", icon: "plyty_pancerne.svg" }
];

function _gearDescription(label) {
  return `<p><strong>⚠ TODO (crafting):</strong> „${label}" to tymczasowy placeholder — link docelowy dla `
    + `sekcji „Produkcja" narzędzi rzemieślniczych, dopóki nie powstanie właściwy system craftingu `
    + `(surowce, czas, ST) i wynikająca z niego cena/waga. Nie traktować jako gotowy, wyceniony przedmiot.</p>`;
}

/** Build the bare Item data for one gear placeholder. */
export function buildGearItemData(gear) {
  return {
    name: gear.label,
    type: "loot",
    img: gear.icon ? `modules/${MODULE_ID}/icons/items/loot/${gear.icon}` : TODO_ICON,
    system: {
      description: { value: _gearDescription(gear.label) },
      quantity: 1
    },
    flags: { [MODULE_ID]: { craftingPlaceholder: true, gearId: gear.id } }
  };
}

/**
 * Create (or refresh) the gear-placeholder stub items on the given actor (by
 * default the Zbrojownia master). Upserts by the `gearId` flag.
 * @param {Actor} [actor]
 * @returns {Promise<Map<string, Item>>} gearId → the resulting Item.
 */
export async function createGearPlaceholders(actor) {
  actor ??= game.actors.find(a => a.getFlag(MODULE_ID, "isZbrojownia"));
  if ( !actor ) {
    ui.notifications.error("Brak aktora Zbrojownia (flaga isZbrojownia).");
    return new Map();
  }

  const result = new Map();
  for ( const gear of GEAR_PLACEHOLDERS ) {
    const data = buildGearItemData(gear);
    let item = actor.items.find(i => i.getFlag(MODULE_ID, "gearId") === gear.id);
    if ( item ) await item.update(data);
    else [item] = await actor.createEmbeddedDocuments("Item", [data]);
    result.set(gear.id, item);
  }
  return result;
}

/**
 * @typedef {object} RealGear
 * @property {string} id           Same `gearId` key the old placeholder used — kept stable so
 *   `toolkits-data.mjs`'s produkcjaEntries links and any already-issued copies migrate cleanly.
 * @property {string} label        Display name.
 * @property {string} icon         Filename inside `icons/items/loot/`.
 * @property {number} price        gb.
 * @property {number} weight       kg.
 * @property {number} avail        Suggested availability % (informational only, see ammo-data.mjs's
 *   own field doc for the same convention).
 * @property {string} description  Full HTML description (own prose + RAW citation where one exists).
 */

/** @type {RealGear[]} */
export const REAL_GEAR = [
  {
    id: "sidla", label: "Sidła", icon: "sidla.svg",
    price: 5, weight: 0.3, avail: 60,
    description:
      `<p><strong>Cena:</strong> 5 gb &nbsp;|&nbsp; <strong>Waga:</strong> 0,3 kg &nbsp;|&nbsp; <strong>Dostępność:</strong> 60%</p>`
      + `<p>Prosta pętla z drutu lub linki, zaczepiona na wygiętej gałęzi albo kołku — klasyczna wnyka na `
      + `drobną zwierzynę. Zastawienie: patrz <strong>Narzędzia małego kłusownika</strong>, akcja `
      + `„Zastawienie sideł" (ST 10).</p>`
      + `<p><em>Cena i waga to szacunek MG — ta pozycja nie ma formalnego wpisu w tabelach podręcznika `
      + `(sprawdzone bezpośrednio w źródle, nie założone).</em></p>`
  },
  {
    id: "sprzet_wspinaczkowy", label: "Sprzęt do wspinaczki", icon: "sprzet_wspinaczkowy.svg",
    price: 20, weight: 6, avail: 50,
    description:
      `<p><strong>Cena:</strong> 20 gb &nbsp;|&nbsp; <strong>Waga:</strong> 6 kg &nbsp;|&nbsp; <strong>Dostępność:</strong> 50%</p>`
      + `<p>Lina, uprząż i karabinki — komplet do bezpiecznej wspinaczki po ruinach i konstrukcjach. `
      + `Wymagany przez sztuczkę <strong>Człowiek-pająk</strong> (Alpinista): trzymając ten zestaw w `
      + `wolnych rękach (albo mając obie ręce wolne), Szybkość wspinania się równa się Szybkości ruchu.</p>`
  },
  {
    id: "strzaly", label: "Strzały (20 szt.)", icon: "strzaly.svg",
    price: 20, weight: 0.6, avail: 80,
    description:
      `<p><strong>Cena:</strong> 20 gb &nbsp;|&nbsp; <strong>Waga:</strong> 0,6 kg &nbsp;|&nbsp; <strong>Dostępność:</strong> 80%</p>`
      + `<p>Wiązka 20 strzał do łuku — produkt <strong>Narzędzi małego kłusownika/kowala</strong>, `
      + `sprzedawany i przechowywany w komplecie zamiast pojedynczo. Cena i waga to dokładnie 20 × `
      + `pojedyncza „Strzała" z tabeli Amunicji (1 gb / 0,03 kg każda) — ten wpis jest wygodnym bundlem, `
      + `nie osobną amunicją; w walce nadal używa się zwykłej Strzały.</p>`
  },
  {
    id: "wozek", label: "Wózek (dwukółka)", icon: "wozek.svg",
    price: 20, weight: 50, avail: 70,
    description:
      `<p><strong>Cena:</strong> 20 gb &nbsp;|&nbsp; <strong>Waga:</strong> 50 kg &nbsp;|&nbsp; <strong>Dostępność:</strong> 70%</p>`
      + `<p>Wytrzymała, stalowa dwukółka na gumowych kołach. Może ją ciągnąć jedna średnia istota lub dwie `
      + `małe. <strong>PW:</strong> 50, <strong>TT:</strong> 15, <strong>Ładowność:</strong> 100 kg `
      + `(podręcznik, „WÓZEK TYPU DWUKÓŁKA").</p>`
  },
  {
    id: "laptop_wojskowy", label: "Laptop wojskowy", icon: "laptop_wojskowy.svg",
    price: 140, weight: 7, avail: 5,
    description:
      `<p><strong>Cena:</strong> 140 gb &nbsp;|&nbsp; <strong>Waga:</strong> 7 kg &nbsp;|&nbsp; <strong>Dostępność:</strong> 5%</p>`
      + `<p>Bateria wystarcza na 24 godziny pracy, a pancerna obudowa i najlepszej jakości podzespoły `
      + `zapewniają bezpieczną i płynną pracę.</p>`
      + `<p><strong>Otrzymujesz Ułatwienie do wykonywanych Testów Inteligencji z użyciem tego sprzętu. `
      + `Może zastąpić Narzędzia małego hakera</strong> — czyli pozwala podejmować próby: Otwarcie zamka `
      + `elektronicznego (ST 15), Zakłócenie działania maszyny Molocha (ST 20), Złamanie hasła dostępu `
      + `(ST 20), nawet bez posiadania tego toolkitu. (Jak zawsze w tym module: Ułatwienie i zastępstwo `
      + `narzędzi to coś, co włącza się ręcznie przy rzucie, nie automatyczny efekt).</p>`
      + `<p><em>Produkcja (Schematy hakerskie): ST 30, 140 godzin, 50 Części elektronicznych (CE), `
      + `1 Chemia (CH), 14 Części zamiennych (CZ), 5 Materiałów konstrukcyjnych (MK) — referencyjne, `
      + `crafting jeszcze nie jest zautomatyzowany.</em></p>`
  },
  {
    id: "emulator_kart", label: "Emulator kart magnetycznych", icon: "emulator_kart.svg",
    price: 25, weight: 0.1, avail: 15,
    description:
      `<p><strong>Cena:</strong> 25 gb &nbsp;|&nbsp; <strong>Waga:</strong> 0,1 kg &nbsp;|&nbsp; <strong>Dostępność:</strong> 15%</p>`
      + `<p>Skonstruowane naprędce urządzenie do udawania karty magnetycznej. Pozwala włamywać się do `
      + `zamków elektronicznych opartych o takie karty. Stopień trudności ustala MG.</p>`
      + `<p><em>Cena/waga/dostępność to szacunek MG (homebrew, brak w podręczniku) — wzorowane na `
      + `„Wytrychach elektronicznych" (25 gb / 0,5 kg / 5%), najbliższym RAW odpowiedniku.</em></p>`
  }
];

function _realGearImg(gear) {
  return `modules/${MODULE_ID}/icons/items/loot/${gear.icon}`;
}

/** Build the real Item data for one graduated gear entry. */
export function buildRealGearItemData(gear) {
  return {
    name: gear.label,
    type: "loot",
    img: _realGearImg(gear),
    system: {
      description: { value: gear.description },
      quantity: 1,
      weight: { value: gear.weight, units: "kg" },
      price: { value: gear.price, denomination: "gp" }
    },
    flags: { [MODULE_ID]: { gearId: gear.id } }
  };
}

/**
 * Create (or refresh) the real-gear items on the given actor (by default the
 * Zbrojownia master). Upserts by the same `gearId` flag the old placeholders
 * used, so an already-issued placeholder copy (e.g. on Raynald) is updated in
 * place — name/icon/description/price/weight all refresh, and the stale
 * `craftingPlaceholder` flag is simply absent from now on (flags are merged,
 * not replaced by `.update()`, so a truly stubborn stale flag needs the
 * migration script, not this function — see `migrate-gear-graduation.mjs`).
 * @param {Actor} [actor]
 * @returns {Promise<Map<string, Item>>} gearId → the resulting Item.
 */
export async function createRealGear(actor) {
  actor ??= game.actors.find(a => a.getFlag(MODULE_ID, "isZbrojownia"));
  if ( !actor ) {
    ui.notifications.error("Brak aktora Zbrojownia (flaga isZbrojownia).");
    return new Map();
  }

  const result = new Map();
  for ( const gear of REAL_GEAR ) {
    const data = buildRealGearItemData(gear);
    let item = actor.items.find(i => i.getFlag(MODULE_ID, "gearId") === gear.id);
    if ( item ) {
      // `.update()` deep-merges `flags` by default — it does NOT drop a stale key just because
      // the new data doesn't mention it. Confirmed live (2026-09-06): updating a migrated item
      // with `buildRealGearItemData`'s output left the old `craftingPlaceholder: true` flag
      // sitting there untouched. Foundry's own `-=key` update syntax deletes it explicitly.
      data[`flags.${MODULE_ID}.-=craftingPlaceholder`] = null;
      await item.update(data);
    }
    else [item] = await actor.createEmbeddedDocuments("Item", [data]);
    result.set(gear.id, item);
  }
  return result;
}
