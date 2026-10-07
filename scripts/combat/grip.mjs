/**
 * Neuroshima 5e — chwyt: co ręce znaczą dla ataku (PLAN_paper_doll §5).
 *
 * Model rąk: `actors/doll.mjs` (lalka). Ten plik czyta wyłącznie jej predykaty.
 *
 * ## Superpozycja chwytu (D2, RAI)
 *
 * Przedmiot trzymany w ręce **może** być chwycony oburącz wtedy i tylko wtedy, gdy druga ręka
 * jest pusta. Chwytu się nie zapisuje — rzut domyślnie bierze najlepszy dostępny chwyt, gracz
 * może wybrać gorszy (D6). Karabin trzymany „oburącz" nigdy nie blokuje granatu ani medpaka:
 * robi to ręka, która mogła być na kolbie. Uwagę wywołują dopiero dwie **zajęte** ręce.
 *
 * ## Poziomy konsekwencji (§5) — według tego, gdzie MG naprawdę poprawia rzut
 *
 * | Poziom | Co | RAW |
 * |---|---|---|
 * | domyślne w oknie (do zmiany) | strzał z broni palnej jedną ręką → Utrudnienie | Broń, s. 118–119 |
 * |  | oburęczna: chwyt oburącz wybrany, gdy druga ręka wolna; inaczej tylko jednorącz | s. 117 |
 * |  | długa seria jedną ręką → cele mają Ułatwienie w RO (`weapons/fire-modes.mjs`) | Broń, Długa seria |
 * |  | atak drugą ręką (lekka) tylko, gdy druga ręka trzyma broń lekką | s. 117 |
 * | ostrzeżenie | dwuręczna jedną ręką — RAW nie pozwala nią atakować, decyduje MG | s. 117 |
 * | cicho, przez `equipped` | Tarcza, Zasłona Samuraja, gogle, latarki, Nomex — działają tylko aktywne | — |
 *
 * Wyjątki od Utrudnienia za strzał jedną ręką: właściwość **poręczna**; **Jednoręki**
 * (Rewolwerowiec — rewolwery; Pistolero, WKK — pistolety); **Stalowy nadgarstek** (Wyjadacz:
 * broń palna krótka i pistolety maszynowe); **Pulp Fiction** (pistolet i PM). Te same zdolności
 * czynią broń palną krótką „lekką" w rękach posiadacza.
 *
 * Mechanizm — kopia `combat/udzwig-attack-disadvantage.mjs`: `dnd5e.preRollAttack` ustawia
 * wartości domyślne przed oknem (także przy rzucie bez okna), a uzasadnienie jedzie na
 * `roll.options.neuroGrip` i jest malowane jako pigułki na karcie ataku.
 *
 * BN-y nie mają lalki (D10) — nic z tego ich nie dotyczy.
 */

import { isDollActor, gripFor, freeHands, heldItems } from "../actors/doll.mjs";
import { hasWeaponProperty } from "../config/weapons.mjs";
import { handgunPerkFor } from "../actors/rewolwerowiec.mjs";
import { ABILITY_KEYS, hasAbility } from "../actors/abilities.mjs";
import { WEAPONS } from "../config/weapons-data.mjs";
import { zarejestrujZrodloOkolicznosci } from "./okolicznosci.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Broń palna w rozumieniu RAW (bez broni specjalnej — miotacz ognia, moździerz). */
const FIREARM_TYPES = new Set(["palnaKrotka", "palnaPosr", "palnaDluga", "palnaCiezka"]);

/** Pistolety maszynowe — podsekcja Broni Palnej Pośredniej w tabeli broni. */
const SMG_IDS = new Set(["hk-universal", "empepiatka", "tommy-gun", "uzi"]);
const SMG_NAMES = new Set(WEAPONS.filter(w => SMG_IDS.has(w.id)).map(w => w.name.toLowerCase()));

export function isFirearm(item) {
  return item?.type === "weapon" && FIREARM_TYPES.has(item.system?.type?.value);
}

export function isShortFirearm(item) {
  return item?.type === "weapon" && item.system?.type?.value === "palnaKrotka";
}

export function isSmg(item) {
  if (item?.type !== "weapon") return false;
  const id = item.flags?.[MODULE_ID]?.weaponId;
  return SMG_IDS.has(id) || SMG_NAMES.has(String(item.name ?? "").trim().toLowerCase());
}

/**
 * Dlaczego ta postać strzela z tej broni jedną ręką bez Utrudnienia — albo `null`.
 * @param {Actor} actor
 * @param {Item} item
 * @returns {string|null}
 */
export function oneHandedExemption(actor, item) {
  if (hasWeaponProperty(item, "poreczna")) return "poręczna";
  const perk = handgunPerkFor(item);
  if (perk === ABILITY_KEYS.REWOLWEROWIEC) return "Jednoręki (Rewolwerowiec)";
  if (perk === ABILITY_KEYS.PISTOLERO) return "Jednoręki (Pistolero)";
  const handgunOrSmg = isShortFirearm(item) || isSmg(item);
  if (handgunOrSmg && hasAbility(actor, ABILITY_KEYS.STALOWY_NADGARSTEK)) return "Stalowy nadgarstek";
  if (handgunOrSmg && hasAbility(actor, ABILITY_KEYS.PULP_FICTION)) return "Pulp Fiction";
  return null;
}

/**
 * Czy broń jest „lekka" w rękach tej postaci: właściwość `lgt` albo zdolność, która ją nadaje
 * (Rewolwerowiec/Pistolero — rewolwery/pistolety; Stalowy nadgarstek, Pulp Fiction — broń
 * palna krótka).
 */
export function isLightFor(actor, item) {
  if (item?.type !== "weapon") return false;
  if (hasWeaponProperty(item, "lgt")) return true;
  if (!isShortFirearm(item)) return false;
  return !!handgunPerkFor(item)
    || hasAbility(actor, ABILITY_KEYS.STALOWY_NADGARSTEK)
    || hasAbility(actor, ABILITY_KEYS.PULP_FICTION);
}

/**
 * Ręce wokół przedmiotu: `{held, hand, otherBusy, otherItem, otherLabel}`, albo `null`, gdy
 * aktor nie ma lalki.
 */
export function handContext(item) {
  const actor = item?.actor;
  if (!actor || !isDollActor(actor)) return null;
  const g = gripFor(item);
  if (!g?.held) return { held: false, hand: null, otherBusy: false, otherItem: null, otherLabel: null };
  const otherItem = g.otherItemId ? actor.items.get(g.otherItemId) ?? null : null;
  return {
    held: true,
    hand: g.hand,
    otherBusy: g.grips.length === 1,
    otherItem,
    otherLabel: otherItem?.name ?? g.otherOccupant?.label ?? null
  };
}

/**
 * Długa seria jedną ręką (RAW: cele dostają Ułatwienie w RO). Wyjątki od Utrudnienia do ataku
 * (poręczna, Jednoręki…) tu nie działają — mówią o Teście Ataku, nie o RO celów.
 */
export function firedOneHanded(item) {
  const h = handContext(item);
  return !!(h?.held && h.otherBusy && isFirearm(item));
}

/**
 * Wolna ręka do czynności z RAW, które jej wymagają (Pochwycenie, szybkoładowacz, łapanie
 * broni powracającej, przedmiot z pasa przy dwóch zajętych rękach, medyk — obie).
 * @param {Actor} actor
 * @param {number} [need]  Ile wolnych rąk potrzeba.
 * @returns {{ok: boolean, free: number, held: string[]}|null}  `null` — aktor bez lalki.
 */
export function freeHandCheck(actor, need = 1) {
  if (!isDollActor(actor)) return null;
  const free = freeHands(actor);
  const held = heldItems(actor).map(h => h.item?.name ?? h.occupant?.label).filter(Boolean);
  return { ok: free >= need, free, held };
}

/** Pigułka „brak wolnej ręki" do kart czatu albo "". */
export function freeHandPill(actor, { need = 1, what = "" } = {}) {
  const c = freeHandCheck(actor, need);
  if (!c || c.ok) return "";
  const label = need >= 2 ? "potrzebne obie ręce" : "brak wolnej ręki";
  const tip = `${what ? `${what}: ` : ""}${label} — w rękach: ${c.held.join(", ") || "nic"}. Decyduje MG.`;
  return `<span class="neuro-handy-pill is-from-pack neuro-grip-pill" data-tooltip="${_esc(tip)}">`
    + `<i class="fa-solid fa-hand" inert></i> ${label}</span>`;
}

function _esc(s) {
  return String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
}

/* -------------------------------------------- */
/*  Hak ataku                                    */
/* -------------------------------------------- */

/**
 * Hook: `dnd5e.preRollAttack`. Wartości domyślne przed oknem — gracz i MG mogą je zmienić.
 * Notatki jadą na `roll.options.neuroGrip` (jak `neuroUdzwigAttack`), żeby pigułka na karcie
 * nie zależała od tego, czy okno w ogóle się pokazało.
 */
function onPreRollAttack(config, dialog) {
  const item = config.subject?.item;
  const actor = item?.actor;
  if (item?.type !== "weapon" || !actor) return;
  const h = handContext(item);
  if (!h?.held) return;

  const notes = [];
  const busy = h.otherBusy;
  const other = h.otherLabel;
  const setMode = mode => {
    config.attackMode = mode;
    for (const roll of config.rolls ?? []) {
      roll.options ??= {};
      roll.options.attackMode = mode;
    }
  };
  const modeOptions = () => dialog?.options?.attackModeOptions;
  const dropModes = values => {
    if (dialog?.options?.attackModeOptions) {
      dialog.options.attackModeOptions = dialog.options.attackModeOptions.filter(o => !values.includes(o.value));
    }
  };

  // Oburęczna (s. 117): chwyt oburącz domyślnie, gdy druga ręka wolna; inaczej tylko jednorącz.
  if (hasWeaponProperty(item, "ver")) {
    const grip = [undefined, null, "", "oneHanded", "twoHanded"].includes(config.attackMode);
    if (grip) setMode(busy ? "oneHanded" : "twoHanded");
    if (busy) {
      dropModes(["twoHanded"]);
      notes.push({ level: "info", text: `Oburęczna jednorącz — druga ręka: ${other}` });
    }
  }

  // Dwuręczna (s. 117): trzymać jedną ręką wolno (D3), atakować — nie. Ostrzeżenie, nie blokada.
  if (hasWeaponProperty(item, "two") && busy) {
    notes.push({ level: "warn", text: `Dwuręczna, druga ręka zajęta (${other}) — RAW: nie można nią atakować, decyduje MG` });
  }

  // Broń palna jedną ręką (s. 118–119): Utrudnienie ustawia silnik okoliczności ataku
  // (`zrodloJednaReka` niżej, PLAN_m1_walka D6); tu zostaje tylko informacja o zwolnieniu.
  if (isFirearm(item) && busy) {
    const exempt = oneHandedExemption(actor, item);
    if (exempt) notes.push({ level: "info", text: `Jedną ręką bez Utrudnienia — ${exempt}` });
  }

  // Atak drugą ręką (lekka, s. 117): dozwolony, gdy obie ręce trzymają broń lekką.
  const otherLight = h.otherItem && isLightFor(actor, h.otherItem);
  const selfLight = isLightFor(actor, item);
  if (selfLight && otherLight) {
    const opts = modeOptions();
    if (opts && !opts.some(o => o.value === "offhand")) {
      opts.push({ value: "offhand", label: CONFIG.DND5E.attackModes?.offhand?.label ?? "Atak drugą ręką" });
    }
  } else {
    dropModes(["offhand", "thrown-offhand"]);
    if (["offhand", "thrown-offhand"].includes(config.attackMode)) {
      setMode(modeOptions()?.find(o => o.value)?.value ?? "oneHanded");
    }
  }

  if (!notes.length) return;
  for (const roll of config.rolls ?? []) {
    roll.options ??= {};
    roll.options.neuroGrip = { notes };
  }
}

/**
 * Źródło silnika okoliczności ataku (`combat/okolicznosci.mjs`, PLAN_m1_walka D6): strzał z broni palnej
 * jedną ręką, gdy druga jest zajęta i nic nie zwalnia (s. 118–119) → Utrudnienie.
 * @param {{item: Item5e, actor: Actor}} ctx
 */
function zrodloJednaReka(ctx) {
  const item = ctx?.item;
  const actor = item?.actor;
  if (item?.type !== "weapon" || !actor || !isFirearm(item)) return [];
  const h = handContext(item);
  if (!h?.held || !h.otherBusy || oneHandedExemption(actor, item)) return [];
  return [{ rodzaj: "utrudnienie", label: `Strzał jedną ręką (druga ręka: ${h.otherLabel})`, strona: "s. 118" }];
}

/** Hook: `dnd5e.renderChatMessage` — pigułki chwytu na karcie ataku. */
function onRenderChatMessage(message, html) {
  if (message.getFlag("dnd5e", "roll")?.type !== "attack") return;
  const notes = message.rolls?.[0]?.options?.neuroGrip?.notes;
  if (!notes?.length || html.querySelector(".neuro-grip-badge")) return;
  let pillList = html.querySelector("ul.card-footer.pills");
  if (!pillList) {
    pillList = document.createElement("ul");
    pillList.className = "card-footer pills unlist";
    (html.querySelector(".chat-card") ?? html).appendChild(pillList);
  }
  for (const n of notes) {
    const pill = document.createElement("li");
    pill.className = `pill neuro-grip-badge${n.level === "warn" ? " maroon" : ""}`;
    pill.innerHTML = `<i class="fa-solid fa-hand" inert></i> <span class="label">${_esc(n.text)}</span>`;
    pillList.appendChild(pill);
  }
}

export function registerGrip() {
  Hooks.on("dnd5e.preRollAttack", onPreRollAttack);
  zarejestrujZrodloOkolicznosci("jednaReka", zrodloJednaReka);
  Hooks.on("dnd5e.renderChatMessage", onRenderChatMessage);
  console.log("Neuroshima 5e | Grip consequences registered");
}

export const __testing = Object.freeze({ onPreRollAttack, zrodloJednaReka, SMG_IDS });
