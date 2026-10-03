/**
 * Neuroshima 5e — Lalka (paper doll): warstwa Foundry.
 *
 * Plan i decyzje MG: `PLAN_paper_doll.md`. Czysty model (sloty, rodziny, rozstrzyganie ruchu,
 * koszty): `actors/doll-model.mjs`. Panel na karcie: `actors/doll-panel.mjs`.
 *
 * ## Co tu jest
 *
 *   - **Odczyt.** Przedmioty aktora → `DollItem` modelu; predykaty, które czytają reguły:
 *     `locationOf`, `inHand`, `heldItems`, `freeHands`, `isStowed`, `gripFor`. Reguły nigdy nie
 *     czytają flagi `slots` wprost.
 *   - **Jeden lejek zapisu.** `place` / `takeOff` / `drop` (+ `equip`, `draw`) → `resolve()`
 *     modelu → pytania do gracza (jeśli są) → jedna partia `updateEmbeddedDocuments`.
 *   - **Nic nie omija lejka.** `preUpdateItem` przekierowuje natywne zapisy `system.equipped`
 *     (przełącznik dnd5e, menu kontekstowe, kod modułu) i przelicza sloty przy spadku ilości;
 *     `preCreateItem` zdejmuje sloty z kopii (dnd5e kopiuje przedmioty między aktorami, Duplikuj
 *     też) i kładzie nową sztukę do plecaka.
 *   - **Użycie przedmiotu** (D8): z plecaka — załóż; z kabury — dobądź (bez ataku); z ręki — atak.
 *     Bramka jest wołana przez opakowanie `Item#use` w `config/validation.mjs` i przez
 *     `dnd5e.preUseActivity` (makra aktywności i lista aktywności rozwiniętego wiersza omijają
 *     `Item#use` — potwierdzone na żywo, plan §15). Jedno bez drugiego zostawia dziurę.
 *
 * ## `system.equipped` = aktywny
 *
 * dnd5e wygasza Efekty Aktywne przedmiotu, gdy `equipped === false`, a każdy konsument w module,
 * który czyta `equipped` (gogle, latarki, Nomex, Samuraj, Wytrącenie, pancerze), i tak ma na myśli
 * „w użyciu". Lalka ustawia więc `equipped` = sztuka w ręce albo noszona. Broń w kaburze przestaje
 * liczyć się jako „w ręku" bez zmiany w tamtych plikach. Pas ma własną semantykę i jego `equipped`
 * zostaje nietknięty (`governsEquipped`).
 *
 * ## Kto ma lalkę (D10)
 *
 * Postacie (`character`), poza magazynem Zbrojowni. BN-y są uproszczone — zostaje im natywny
 * przełącznik i krótka ścieżka `drop()` (broń na ziemię, bez slotów). Towarzysze mogą się włączyć
 * flagą `flags.<mod>.doll = true` (§10).
 */

import {
  SLOT_GROUPS, DOLL_FAMILIES, HAND_LABELS, slotId, parseSlot, groupOf, tierOf, isActiveSlot, slotLabel,
  classifyItem, blocksOf, capacityBonusOf, readSlots, layoutOf, locationOf as modelLocationOf,
  gripOf, resolve, applyMoves, normalizeMoves, slotsAfterSpend, moveCost, governsEquipped, packCount
} from "./doll-model.mjs";
import { handyFamilyOf } from "./handy-items.mjs";
import { isKobaltEnabled } from "../config/settings.mjs";
import { POWER_ARMOR_BLOCKS_KOBALT } from "../wkk/config/doll-kobalt.mjs";
import { ABILITY_KEYS, hasAbility } from "./abilities.mjs";
import { handgunPerkFor } from "./rewolwerowiec.mjs";
import { isZaslonaWeapon } from "./samuraj.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Flaga na przedmiocie: sloty zajęte przez jego sztuki. */
export const SLOTS_FLAG = "slots";

/** Flaga pasa sprzed lalki (`actors/handy-items.mjs` v2.0) — czytana, przepisywana na `slots`. */
const LEGACY_BELT_FLAG = "atHand";

/** Flaga na aktorze: nieprzedmiotowi lokatorzy rąk (`[{slot: "hand.1", label}]`) — §5. */
export const HAND_OCCUPANTS_FLAG = "handOccupants";

/* -------------------------------------------- */
/*  Kto ma lalkę                                 */
/* -------------------------------------------- */

export function isDollActor(actor) {
  if (!actor || actor.documentName !== "Actor") return false;
  if (actor.getFlag?.(MODULE_ID, "isZbrojownia")) return false;
  if (actor.type === "character") return true;
  return actor.getFlag?.(MODULE_ID, "doll") === true;
}

/** Rodzina przedmiotu albo `null` (furtka — natywny przełącznik dnd5e). */
export function familyOf(item) {
  return classifyItem(item, { handyFamily: handyFamilyOf });
}

/** Przedmiot rządzony przez lalkę: aktor ma lalkę, a przedmiot rodzinę. */
export function isGoverned(item) {
  return !!item && isDollActor(item.actor) && familyOf(item) !== null;
}

/* -------------------------------------------- */
/*  Odczyt                                       */
/* -------------------------------------------- */

function _qty(item) {
  return Math.max(0, Math.floor(Number(item?.system?.quantity ?? 1)) || 0);
}

/** Zapisane sloty; stara flaga pasa: lista pozycji → `belt.N`, liczba/`true` → sztuki bez miejsca. */
function _stored(item, quantity) {
  const f = item.flags?.[MODULE_ID] ?? {};
  if (Array.isArray(f[SLOTS_FLAG])) return { slots: readSlots(f[SLOTS_FLAG], quantity), legacy: 0 };
  const raw = f[LEGACY_BELT_FLAG];
  if (raw == null) return { slots: [], legacy: 0 };
  if (Array.isArray(raw)) {
    const pos = [...new Set(raw.map(n => Math.floor(Number(n))).filter(n => Number.isFinite(n) && n >= 0))];
    return { slots: pos.map(n => slotId("belt", n)).slice(0, quantity), legacy: 0 };
  }
  const n = raw === true ? 1 : Math.max(0, Math.floor(Number(raw)) || 0);
  return { slots: [], legacy: Math.min(n, quantity) };
}

/**
 * Przedmiot jako `DollItem` modelu albo `null`. Bez kontekstu aktora — sztuki starej flagi pasa
 * bez pozycji (`legacy`) dostają miejsca dopiero w `dollItems()`.
 */
export function dollItemOf(item, { kobalt = isKobaltEnabled() } = {}) {
  const family = familyOf(item);
  if (!family) return null;
  const quantity = _qty(item);
  const { slots, legacy } = _stored(item, quantity);
  return {
    id: item.id, name: item.name, family, quantity, slots, legacy,
    blocks: blocksOf(item, family, { powerArmorKobalt: kobalt ? POWER_ARMOR_BLOCKS_KOBALT : [] }),
    capacity: capacityBonusOf(item)
  };
}

/** Wszystkie przedmioty lalki aktora, w kolejności przedmiotów aktora (kolizje: pierwszy wygrywa). */
export function dollItems(actor) {
  const kobalt = isKobaltEnabled();
  const items = [];
  for (const i of actor?.items ?? []) {
    const d = dollItemOf(i, { kobalt });
    if (d) items.push(d);
  }
  // Pas v1 (liczba albo `true`): sztuki bez pozycji zajmują pierwsze wolne sloty pasa.
  const loose = items.filter(d => d.legacy > 0);
  if (loose.length) {
    const taken = new Set(items.flatMap(d => d.slots));
    for (const d of loose) {
      let i = 0;
      for (let n = 0; n < d.legacy && d.slots.length < d.quantity; n++) {
        while (taken.has(slotId("belt", i))) i++;
        d.slots.push(slotId("belt", i));
        taken.add(slotId("belt", i));
      }
    }
  }
  return items;
}

/**
 * Lokatorzy rąk z flagi aktora — lista `[{slot, label, kind, actorUuid}]` (lista, nie obiekt:
 * id slotu ma kropkę, a kropka w kluczu flagi rozjeżdża się w zagnieżdżenie). Wynik: mapa
 * `slot → lokator`, jak chce model.
 */
function _occupants(actor) {
  const raw = actor?.getFlag?.(MODULE_ID, HAND_OCCUPANTS_FLAG);
  if (!Array.isArray(raw)) return {};
  return Object.fromEntries(raw.filter(o => groupOf(o?.slot) === "hand" && o.label).map(o => [o.slot, o]));
}

/** Puszcza lokatora ręki (× na lalce): pochwycony cel, kierownica. */
export async function releaseHand(actor, slot) {
  const list = actor?.getFlag?.(MODULE_ID, HAND_OCCUPANTS_FLAG);
  if (!Array.isArray(list)) return false;
  await actor.setFlag(MODULE_ID, HAND_OCCUPANTS_FLAG, list.filter(o => o?.slot !== slot));
  return true;
}

/** Pełny stan lalki: przedmioty, lokatorzy rąk, rozkład. */
export function dollState(actor) {
  const items = dollItems(actor);
  const occupants = _occupants(actor);
  return { items, occupants, layout: layoutOf(items, { occupants }) };
}

/** Sloty przedmiotu (z sztukami starej flagi pasa rozmieszczonymi). */
export function slotsOf(item) {
  if (!item?.actor) return dollItemOf(item)?.slots ?? [];
  return dollItems(item.actor).find(d => d.id === item.id)?.slots ?? [];
}

/**
 * Gdzie jest stos: `{kind, slots, count}`; `kind` ∈ hand / worn / belt / holster / pack.
 * Przedmiot spoza lalki → `null`. BN-y: natywne `equipped` (broń/tarcza — ręka, reszta — noszone).
 */
export function locationOf(item) {
  if (!item) return null;
  if (!isDollActor(item.actor)) {
    if (!item.system?.equipped) return { kind: "pack", slots: [], count: 0 };
    const held = item.type === "weapon" || item.system?.type?.value === "shield";
    return { kind: held ? "hand" : "worn", slots: [], count: 1 };
  }
  const d = dollItems(item.actor).find(x => x.id === item.id);
  return d ? modelLocationOf(d) : null;
}

/** Czy przedmiot (którakolwiek sztuka) jest w ręce. */
export function inHand(item) {
  return locationOf(item)?.kind === "hand";
}

/** Czy stos jest schowany (pas, pochwa, kabura) i nic z niego nie jest w ręce ani noszone. */
export function isStowed(item) {
  const k = locationOf(item)?.kind;
  return k === "belt" || k === "holster";
}

/** Slot ręki trzymającej przedmiot albo `null`. */
export function handOf(item) {
  return slotsOf(item).find(s => groupOf(s) === "hand") ?? null;
}

/** `[{slot, item, occupant}]` dla obu rąk. BN: założone bronie i tarcze jako „ręce" bez slotu. */
export function heldItems(actor) {
  if (!isDollActor(actor)) {
    return (actor?.items ?? []).filter(i => i.system?.equipped
      && (i.type === "weapon" || i.system?.type?.value === "shield"))
      .map(item => ({ slot: null, item, occupant: null }));
  }
  const { layout, occupants } = dollState(actor);
  return [0, 1].map(i => slotId("hand", i)).map(slot => ({
    slot,
    item: actor.items.get(layout.slots.get(slot)) ?? null,
    occupant: occupants[slot] ?? null
  }));
}

/** Ile rąk wolnych (bez przedmiotu i bez lokatora). */
export function freeHands(actor) {
  if (!isDollActor(actor)) return Math.max(0, 2 - heldItems(actor).length);
  return heldItems(actor).filter(h => !h.item && !h.occupant).length;
}

/** Chwyt przedmiotu w ręce (§5): `{held, hand, other, otherItemId, otherOccupant, grips}`. */
export function gripFor(item) {
  if (!item?.actor || !isDollActor(item.actor)) return null;
  const { items, occupants } = dollState(item.actor);
  return gripOf(items, item.id, { occupants });
}

/* -------------------------------------------- */
/*  Pytania do gracza                            */
/* -------------------------------------------- */

const DEST_LABEL = { ground: "upuść", pack: "do plecaka" };

function _destText(dest) {
  if (dest === "ground" || dest === "pack") return DEST_LABEL[dest];
  const g = groupOf(dest);
  if (g === "melee") return "do pochwy";
  if (g === "ranged") return "do kabury";
  if (g === "belt") return "na pas";
  if (g === "hand") return `do ręki (${slotLabel(dest).toLowerCase()})`;
  return slotLabel(dest).toLowerCase();
}

function _esc(s) {
  return String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
}

/**
 * Jedno pytanie modelu → odpowiedź (fragment `answers`) albo `null` (anulowane).
 * Zawsze jedno okno (D31: nigdy dwa pytania z rzędu w jednym ruchu).
 */
async function _ask(actor, item, question) {
  const DialogV2 = foundry.applications.api.DialogV2;
  const name = id => actor.items.get(id)?.name ?? "?";

  if (question.kind === "confirmArmor") {
    const armor = actor.items.get(question.itemId);
    const don = armor?.getFlag(MODULE_ID, "donTime") ?? 1;
    const ok = await DialogV2.confirm({
      window: { title: `Zdjąć ${armor?.name ?? "pancerz"}?` },
      content: `<p><strong>${_esc(item.name)}</strong> nie zmieści się razem z
        <strong>${_esc(armor?.name)}</strong>. Pancerz zejdzie do plecaka
        (${don} ${don === 1 ? "akcja" : "akcje"}).</p>`,
      rejectClose: false
    });
    return ok ? { confirm: true } : null;
  }

  if (question.kind === "displace") {
    const choice = await DialogV2.wait({
      window: { title: `${name(question.itemId)} — co z tym?` },
      content: `<p>Ręka musi być wolna. Co robisz z <strong>${_esc(name(question.itemId))}</strong>?</p>`,
      buttons: [
        { action: "ground", label: "Upuść [I]", icon: "fas fa-arrow-down", default: true },
        { action: "pack", label: "Do plecaka (Akcja)", icon: "fas fa-boxes-packing" }
      ],
      rejectClose: false
    });
    return choice ? { displace: { [question.itemId]: choice } } : null;
  }

  if (question.kind === "whichHand") {
    const buttons = question.options.map((o, n) => ({
      action: String(n),
      label: `${HAND_LABELS[parseSlot(o.slot).index].split(" ")[0]}: ${name(o.itemId)} → ${_destText(o.dest)}`
    }));
    const choice = await DialogV2.wait({
      window: { title: `${item.name} — która ręka?` },
      content: `<p>Obie ręce zajęte. Która ustępuje miejsca <strong>${_esc(item.name)}</strong>?</p>`,
      buttons,
      rejectClose: false
    });
    if (choice == null) return null;
    const o = question.options[Number(choice)];
    return o ? { hand: { slot: o.slot, dest: o.dest } } : null;
  }
  return null;
}

/* -------------------------------------------- */
/*  Ziemia — rejestr (implementacja: P4)         */
/* -------------------------------------------- */

/**
 * Upuszczenie na ziemię robi `actors/ground-items.mjs` (Kafelki, przekaźnik MG). Rejestr zamiast
 * importu — tamten moduł woła lalkę przy podnoszeniu, więc import w obie strony byłby cykliczny.
 * @type {{canDrop: Function, drop: Function}|null}
 */
let _ground = null;

export function registerGroundHandler(handler) {
  _ground = handler;
}

/* -------------------------------------------- */
/*  Lejek zapisu                                 */
/* -------------------------------------------- */

const _consumeHints = new Map();

/** Uruchamia `fn`, mówiąc lalce, z którego slotu zeszła sztuka (kliknięty kafelek, ręka). */
export async function withConsumeHint(item, slot, fn) {
  _consumeHints.set(item.id, slot);
  try { return await fn(); } finally { _consumeHints.delete(item.id); }
}

/**
 * Kolejka per aktor. Każdy ruch czyta stan, rozstrzyga i zapisuje — dwa ruchy naraz (podwójny
 * klik, partia przekierowanych zapisów) czytałyby ten sam stan i obsadziły tę samą rękę.
 * Kształt z DEV_GUIDE §15.4 (serializacja bez debounce: tu nie ma serii do skolapsowania).
 * @type {Map<string, Promise>}
 */
const _chains = new Map();

function _serial(actor, fn) {
  const key = actor?.uuid ?? "?";
  const prev = _chains.get(key) ?? Promise.resolve();
  const run = prev.catch(() => {}).then(async () => {
    await _waitPending(actor);
    return fn();
  });
  _chains.set(key, run.finally(() => { if (_chains.get(key) === run) _chains.delete(key); }));
  return run;
}

/**
 * Sloty przekierowanych zapisów, które wpisaliśmy w cudzą aktualizację (`preUpdateItem`), a które
 * jeszcze nie wróciły z serwera. Partia `updateEmbeddedDocuments` woła `preUpdateItem` po kolei
 * na tym samym, starym stanie — bez tej nakładki dwa przedmioty z jednej partii dostałyby tę samą
 * rękę. Wpis znika w `updateItem` albo po 3 s.
 * @type {Map<string, {actorId: string, slots: string[], timer: number}>}
 */
const _pending = new Map();

function _setPending(actor, itemId, slots) {
  const old = _pending.get(itemId);
  if (old) clearTimeout(old.timer);
  _pending.set(itemId, { actorId: actor.id, slots, timer: setTimeout(() => _pending.delete(itemId), 3000) });
}

function _clearPending(itemId) {
  const p = _pending.get(itemId);
  if (!p) return;
  clearTimeout(p.timer);
  _pending.delete(itemId);
}

async function _waitPending(actor) {
  for (let i = 0; i < 60 && [..._pending.values()].some(p => p.actorId === actor?.id); i++) {
    await new Promise(r => setTimeout(r, 50));
  }
}

/** Stan z nałożonymi jeszcze niezapisanymi slotami (patrz `_pending`). */
function _stateWithPending(actor) {
  const state = dollState(actor);
  let touched = false;
  for (const d of state.items) {
    const p = _pending.get(d.id);
    if (p && p.actorId === actor.id) { d.slots = [...p.slots]; touched = true; }
  }
  if (touched) state.layout = layoutOf(state.items, { occupants: state.occupants });
  return state;
}

function _slotsUpdate(item, d, slots) {
  const u = { _id: item.id, [`flags.${MODULE_ID}.${SLOTS_FLAG}`]: slots };
  if (item.flags?.[MODULE_ID]?.[LEGACY_BELT_FLAG] !== undefined) u[`flags.${MODULE_ID}.-=${LEGACY_BELT_FLAG}`] = null;
  if (governsEquipped(d.family)) {
    const eq = slots.some(isActiveSlot);
    if (eq !== !!item.system?.equipped) u["system.equipped"] = eq;
  }
  return u;
}

/**
 * Zapisuje ruchy jedną partią. Ruchy na ziemię idą potem przez `ground-items.mjs`.
 * @param {Actor} actor
 * @param {import("./doll-model.mjs").DollMove[]} moves
 * @param {object} [options]
 * @param {boolean} [options.involuntary]  Wytrącenie, „Poddaj się!" — bez kosztu na linii.
 * @param {object} [options.at]            Gdzie upaść (`{x, y}` albo żeton celu) — §9.
 * @param {boolean} [options.quiet]        Bez linii na czacie i bez komunikatów.
 * @param {string} [options.reason]        Dopisek na linii czatu („Wytrącenie").
 */
export function commitMoves(actor, moves, options = {}) {
  return _serial(actor, () => _commit(actor, moves, options));
}

async function _commit(actor, moves, options = {}) {
  if (!moves?.length) return true;
  const state = dollState(actor);
  const grounds = moves.filter(m => m.to === "ground");
  if (grounds.length && !_ground?.canDrop?.(actor, { quiet: options.quiet })) return false;

  // Na ziemię sztuka schodzi z lalki tutaj, a z ekwipunku — w `ground-items.mjs` (MG).
  const slotMoves = moves.map(m => (m.to === "ground" ? { ...m, to: "pack" } : m));
  const next = applyMoves(state.items, slotMoves);
  const updates = [];
  for (const [id, slots] of next) {
    const item = actor.items.get(id);
    const d = state.items.find(x => x.id === id);
    if (item && d) updates.push(_slotsUpdate(item, d, slots));
  }
  const lines = _moveLines(actor, moves, options);
  if (updates.length) await actor.updateEmbeddedDocuments("Item", updates, { neuroDoll: true });

  for (const g of grounds) {
    const item = actor.items.get(g.itemId);
    if (item) await _ground.drop(actor, item, {
      count: 1, at: options.at, involuntary: options.involuntary, from: g.from, reason: options.reason
    });
  }
  if (lines.length && !options.quiet && _inCombat(actor)) await _postLines(actor, lines, options);
  if (options.sound !== false && !options.involuntary && moves.some(m => m.to !== "ground")) playEquipSound(actor);
  return true;
}

const EQUIP_SOUND = `modules/${MODULE_ID}/sounds/misc/equip.ogg`;

/**
 * Klik oporządzenia (CC0, `dev/audio/FREESOUND_MISC_SOURCES.md`): słyszy go ten, kto przekłada, i
 * aktywni gracze-właściciele tej postaci (MG przekłada graczowi — gracz też słyszy). Nikt inny.
 * Kanał „interfejs", więc ścisza go suwak głośności interfejsu.
 */
export function playEquipSound(actor) {
  // Przebieg Quencha (z okna albo `game.neuroshima.tests.run()`) przekłada setki rzeczy — cisza.
  if (globalThis.quench?._currentRunner?.state === "running") return;
  const others = game.users.filter(u => u.active && !u.isGM && u.id !== game.user.id
    && actor?.testUserPermission?.(u, "OWNER")).map(u => u.id);
  try {
    foundry.audio.AudioHelper.play({ src: EQUIP_SOUND, volume: 0.6, loop: false, channel: "interface" },
      others.length ? { recipients: others } : false)?.catch?.(() => {});
  } catch (_e) { /* brak dźwięku nie psuje ruchu */ }
}

function _inCombat(actor) {
  return !!actor?.inCombat;
}

/**
 * Kładzie przedmiot. `to`: slot (`"hand.1"`), grupa (`"melee"`), `"auto"` (Załóż), `"pack"`,
 * `"ground"`. Pytania (która ręka, upuść czy do plecaka, zdjęcie pancerza) zadaje tu.
 * @returns {Promise<boolean>}
 */
export function place(actor, item, to, options = {}) {
  if (!actor || !item) return Promise.resolve(false);
  return _serial(actor, () => _place(actor, item, to, options));
}

async function _place(actor, item, to, options = {}) {
  // BN-y nie mają lalki, ale pas mają (był przed lalką) — on idzie przez model dalej.
  if (!isDollActor(actor) && familyOf(item) !== "belt") return _placeNpc(actor, item, to, options);
  let answers = options.answers ?? {};
  for (let round = 0; round < 6; round++) {
    const state = dollState(actor);
    if (!state.items.some(d => d.id === item.id)) {
      if (!options.quiet) ui.notifications.warn(`${item.name}: tego się nie nosi ani nie trzyma w ręku.`);
      return false;
    }
    const r = resolve(state.items, { itemId: item.id, to, from: options.from },
      { inCombat: _inCombat(actor), answers, occupants: state.occupants });
    if (r.refusal) {
      if (!options.quiet) ui.notifications.warn(`${item.name}: ${r.refusal}`);
      return false;
    }
    if (r.questions.length) {
      const a = await _ask(actor, item, r.questions[0]);
      if (!a) return false;
      answers = foundry.utils.mergeObject(answers, a, { inplace: false });
      continue;
    }
    return _commit(actor, r.moves, options);
  }
  return false;
}

/** BN bez lalki: `place` sprowadza się do natywnego przełącznika (D10). */
async function _placeNpc(actor, item, to, options) {
  if (to === "ground") return _drop(actor, item, options);
  const want = to !== "pack";
  if (!!item.system?.equipped !== want) await item.update({ "system.equipped": want });
  return true;
}

/** „Załóż" — automatyczne rozmieszczenie (§4). */
export function equip(item, options = {}) {
  return place(item.actor, item, "auto", options);
}

/** „Dobądź" — z kabury/pochwy do ręki (§4, zasady 1–3). */
export function draw(item, options = {}) {
  const from = options.from ?? slotsOf(item).find(s => tierOf(s) === "stowed");
  if (!from) return equip(item, options);
  return place(item.actor, item, "hand", { ...options, from });
}

/**
 * Zdejmij. Z ręki — łańcuch wypierania: wolna kabura/pochwa, inaczej (w walce) Upuść albo Do
 * plecaka, poza walką plecak. Z pasa, kabury i noszone — do plecaka.
 */
export function takeOff(actor, item, options = {}) {
  if (!actor || !item) return Promise.resolve(false);
  return _serial(actor, () => _takeOff(actor, item, options));
}

async function _takeOff(actor, item, options = {}) {
  if (!isDollActor(actor)) return _placeNpc(actor, item, "pack", options);
  const d = dollItems(actor).find(x => x.id === item.id);
  if (!d) return false;
  const loc = modelLocationOf(d);
  const from = options.from ?? loc.slots[0];
  if (!from) return false;
  if (groupOf(from) === "hand") {
    const fam = DOLL_FAMILIES[d.family];
    const { layout } = dollState(actor);
    if (fam.holster) {
      const cap = layout.capacity[fam.holster];
      for (let i = 0; i < cap; i++) {
        const s = slotId(fam.holster, i);
        if (!layout.slots.has(s) && !layout.blocked.has(s)) return _place(actor, item, s, { ...options, from });
      }
    }
    if (_inCombat(actor)) {
      const a = await _ask(actor, item, { kind: "displace", itemId: item.id });
      if (!a) return false;
      const dest = a.displace[item.id];
      return dest === "ground" ? _drop(actor, item, { ...options, from }) : _place(actor, item, "pack", { ...options, from });
    }
  }
  return _place(actor, item, "pack", { ...options, from });
}

/**
 * Na ziemię (§9). Postać — przez lalkę, z kosztem na linii czatu. BN (D10) — skrót: przedmiot
 * po prostu ląduje na ziemi, bez slotów i bez pilnowania czegokolwiek.
 */
export function drop(actor, item, options = {}) {
  if (!actor || !item) return Promise.resolve(false);
  return _serial(actor, () => _drop(actor, item, options));
}

async function _drop(actor, item, options = {}) {
  if (!isDollActor(actor)) {
    if (!_ground?.canDrop?.(actor, options)) return false;
    return _ground.drop(actor, item, { count: 1, ...options });
  }
  return _place(actor, item, "ground", options);
}

/* -------------------------------------------- */
/*  Linie czatu (§7) i koszty (§6)               */
/* -------------------------------------------- */

/** Kontekst kosztu ruchu dla tej sztuki u tego aktora (zdolności — tylko nazwane na linii). */
export function costContext(actor, item, move, options = {}) {
  const family = familyOf(item);
  const ctx = {
    family,
    donTime: item.getFlag?.(MODULE_ID, "donTime") ?? 1,
    shield: item.system?.type?.value === "shield",
    involuntary: !!options.involuntary,
    freeDrop: _freeDropEnabled(),
    freeDraw: [],
    mamPodReka: false
  };
  const drawLike = (tierOf(move.from) === "stowed" && groupOf(move.to) === "hand")
    || (groupOf(move.from) === "hand" && tierOf(move.to) === "stowed");
  if (drawLike && item.type === "weapon") {
    const perk = handgunPerkFor(item);
    if (perk) ctx.freeDraw.push(perk === ABILITY_KEYS.PISTOLERO ? "Dobywanie (Pistolero)" : "Dobywanie (Rewolwerowiec)");
    if (isZaslonaWeapon(item) && hasAbility(actor, ABILITY_KEYS.SAMURAJ)) ctx.freeDraw.push("Dobycie (Samuraj)");
  }
  if (move.from === "pack" && ABILITY_KEYS.MAM_POD_REKA && hasAbility(actor, ABILITY_KEYS.MAM_POD_REKA)) ctx.mamPodReka = true;
  return ctx;
}

/** WKK „Darmowe upuszczanie" (D19) — ustawienie świata, liczy się tylko z Kobaltem. */
function _freeDropEnabled() {
  try {
    return isKobaltEnabled() && !!game.settings.get(MODULE_ID, "darmoweUpuszczanie");
  } catch (_e) {
    return false;
  }
}

function _moveLines(actor, moves, options) {
  const lines = [];
  for (const m of moves) {
    const item = actor.items.get(m.itemId);
    if (!item) continue;
    const cost = moveCost(m, costContext(actor, item, m, options));
    const notes = [...cost.notes];
    if (item.name.match(/siekier/i) && tierOf(m.from) === "stowed" && groupOf(m.to) === "hand"
      && ABILITY_KEYS.SIEKIEREZADA && hasAbility(actor, ABILITY_KEYS.SIEKIEREZADA)) {
      notes.push("Podwójne dobycie: druga siekierka w tej samej [I]");
    }
    lines.push({
      item: item.name, img: item.img, from: _placeText(m.from), to: _placeText(m.to),
      cost: cost.label, why: cost.why, notes, displaced: !!m.displaced
    });
  }
  return lines;
}

function _placeText(where) {
  if (where === "pack") return "plecak";
  if (where === "ground") return "ziemia";
  return slotLabel(where).toLowerCase();
}

async function _postLines(actor, lines, options) {
  const rows = lines.map(l => `<li class="neuro-doll-move${l.displaced ? " is-displaced" : ""}">
      <img src="${_esc(l.img)}" alt="" inert>
      <span class="neuro-doll-move-what"><strong>${_esc(l.item)}</strong>: ${_esc(l.from)} → ${_esc(l.to)}</span>
      <span class="neuro-doll-move-cost" data-tooltip="${_esc(l.why)}">${_esc(l.cost)}</span>
      ${l.notes.length ? `<span class="neuro-doll-move-note">${l.notes.map(_esc).join(" · ")}</span>` : ""}
    </li>`).join("");
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-doll-moves">${options.reason ? `<p class="neuro-doll-reason">${_esc(options.reason)}</p>` : ""}<ul>${rows}</ul></div>`,
    flags: { [MODULE_ID]: { dollMoves: lines.map(l => ({ item: l.item, from: l.from, to: l.to, cost: l.cost })) } }
  });
}

/* -------------------------------------------- */
/*  Użycie (D8, §6)                              */
/* -------------------------------------------- */

/**
 * Co zrobić z kliknięciem przedmiotu: `"proceed"` (atak / zwykłe użycie), `"equip"` (w plecaku),
 * `"draw"` (schowany) albo `null`, gdy lalka nie rządzi tym przedmiotem (stara ścieżka).
 * Pas ma własne użycie (`handyUse`) — zawsze `"proceed"`.
 */
export function useGate(item) {
  if (!isGoverned(item)) return null;
  const family = familyOf(item);
  if (family === "belt") return "proceed";
  const loc = locationOf(item);
  if (!loc) return null;
  if (loc.kind === "pack") return "equip";
  if (loc.kind === "holster") return "draw";
  return "proceed";
}

/** Aktywności, które są atakiem: natywny atak i tryby ognia (`weapons/fire-modes.mjs`). */
const ATTACK_ACTIVITY_TYPES = new Set(["attack", "neuroKs", "neuroDs", "neuroMs", "neuroOz", "neuroDublet"]);

/** Wykonuje przekierowanie z `useGate`. */
export function redirectUse(item, gate, options = {}) {
  if (gate === "equip") return equip(item, options);
  if (gate === "draw") return draw(item, options);
  return null;
}

/* -------------------------------------------- */
/*  Przechwyty                                   */
/* -------------------------------------------- */

/**
 * `preUpdateItem` — dwa zadania, oba tylko dla przedmiotów rządzonych przez lalkę:
 *  1. natywny zapis `system.equipped` spoza lejka → przekierowanie: włączenie = Załóż,
 *     wyłączenie = Zdejmij. Gdy wynik dotyczy tylko tego przedmiotu, wpisujemy go w tę samą
 *     aktualizację (zapis jest atomowy i `await item.update()` widzi skutek); gdy rusza inne
 *     przedmioty albo wymaga pytania — wycinamy `equipped` i odpalamy lejek osobno;
 *  2. spadek ilości (rzut, zużycie) → sloty po `slotsAfterSpend`, w tej samej aktualizacji.
 */
function _onPreUpdateItem(item, changes, options, userId) {
  if (options?.neuroDoll) return;
  const actor = item.actor;
  if (!actor) return;
  const doll = isDollActor(actor);
  if (!doll && !foundry.utils.hasProperty(changes, "system.quantity")) return;
  const d = dollItems(actor).find(x => x.id === item.id);
  if (!d || (!doll && d.family !== "belt")) return;
  const local = userId === game.user.id;

  if (doll && foundry.utils.hasProperty(changes, "system.equipped") && governsEquipped(d.family)) {
    const want = !!foundry.utils.getProperty(changes, "system.equipped");
    const have = d.slots.some(isActiveSlot);
    foundry.utils.deleteProperty(changes, "system.equipped");
    if (want !== have && local) _reroute(actor, item, d, want, changes);
  }

  const newQty = foundry.utils.getProperty(changes, "system.quantity");
  if (newQty !== undefined) {
    const oldQty = d.quantity;
    const nextQty = Math.max(0, Math.floor(Number(newQty)) || 0);
    if (nextQty < oldQty) {
      const next = slotsAfterSpend(d.slots, oldQty, nextQty, _consumeHints.get(item.id) ?? null);
      if (next.length !== d.slots.length || d.legacy) {
        foundry.utils.setProperty(changes, `flags.${MODULE_ID}.${SLOTS_FLAG}`, next);
        if (item.flags?.[MODULE_ID]?.[LEGACY_BELT_FLAG] !== undefined) {
          foundry.utils.setProperty(changes, `flags.${MODULE_ID}.-=${LEGACY_BELT_FLAG}`, null);
        }
        if (governsEquipped(d.family)) foundry.utils.setProperty(changes, "system.equipped", next.some(isActiveSlot));
      }
    }
  }
}

function _reroute(actor, item, d, want, changes) {
  const state = _stateWithPending(actor);
  const cur = state.items.find(x => x.id === item.id) ?? d;
  let to = "auto";
  let from;
  if (!want) {
    from = modelLocationOf(cur).slots.find(isActiveSlot);
    to = groupOf(from) === "hand" ? null : "pack";
  }
  if (to) {
    const r = resolve(state.items, { itemId: item.id, to, from }, { inCombat: _inCombat(actor), occupants: state.occupants });
    const solo = !r.refusal && !r.questions.length && r.moves.length
      && r.moves.every(m => m.itemId === item.id && m.to !== "ground");
    if (solo) {
      const slots = applyMoves(state.items, r.moves).get(item.id);
      foundry.utils.setProperty(changes, `flags.${MODULE_ID}.${SLOTS_FLAG}`, slots);
      foundry.utils.setProperty(changes, "system.equipped", slots.some(isActiveSlot));
      _setPending(actor, item.id, slots);
      playEquipSound(actor);
      return;
    }
  }
  // Rusza inne przedmioty albo wymaga pytania — osobno, przez kolejkę lejka (po tej aktualizacji).
  setTimeout(() => (want ? equip(item) : takeOff(actor, item, { from })), 0);
}

/**
 * `preCreateItem` — kopia (dnd5e kopiuje przedmioty między aktorami, „Duplikuj" też) nie przynosi
 * slotów poprzedniego właściciela, a nowa sztuka na postaci ląduje w plecaku.
 */
function _onPreCreateItem(item, data, options) {
  if (options?.neuroDoll) return;
  const f = data?.flags?.[MODULE_ID] ?? {};
  const patch = {};
  if (f[SLOTS_FLAG] !== undefined) patch[`flags.${MODULE_ID}.-=${SLOTS_FLAG}`] = null;
  if (f[LEGACY_BELT_FLAG] !== undefined) patch[`flags.${MODULE_ID}.-=${LEGACY_BELT_FLAG}`] = null;
  const actor = item.parent;
  if (actor && isDollActor(actor) && item.system?.equipped && governsEquipped(familyOf(item))) {
    patch["system.equipped"] = false;
  }
  if (!foundry.utils.isEmpty(patch)) item.updateSource(patch);
}

/**
 * Po zniknięciu przedmiotu, który dokładał sloty (skasowana kamizelka), albo po zmianie, która
 * zostawiła stan błędu — sprzątamy: kolizje i nadmiar do plecaka (D5). Robi to klient, który
 * zmianę wywołał.
 */
async function _normalize(actor) {
  if (!isDollActor(actor) || !actor.isOwner) return;
  const { items, occupants } = dollState(actor);
  if (normalizeMoves(items, { occupants }).length) {
    // Przez kolejkę i na świeżym stanie — w międzyczasie mógł przejść inny ruch.
    await _serial(actor, () => {
      const fresh = dollState(actor);
      return _commit(actor, normalizeMoves(fresh.items, { occupants: fresh.occupants }), { quiet: true, sound: false });
    });
  }
}

function _onDeleteItem(item, _options, userId) {
  if (userId !== game.user.id) return;
  const actor = item.actor;
  if (!actor || !isDollActor(actor)) return;
  if (Object.keys(capacityBonusOf(item)).length) _normalize(actor);
}

function _onUpdateItem(item, changes, options, userId) {
  _clearPending(item.id);
  if (userId !== game.user.id || options?.neuroDoll) return;
  const actor = item.actor;
  if (!actor || !isDollActor(actor)) return;
  const touched = ["handySlots", "meleeSlots", "rangedSlots", SLOTS_FLAG]
    .some(k => foundry.utils.hasProperty(changes, `flags.${MODULE_ID}.${k}`));
  if (touched) _normalize(actor);
}

/* -------------------------------------------- */
/*  Migracja (D9)                                */
/* -------------------------------------------- */

/**
 * Wdrożenie lalki na postaciach świata. D9: stan „założony" przedmiotów rządzonych przez lalkę
 * jest czyszczony — gracze zakładają od nowa (kampania jest w trakcie przenosin z Roll20, a stare
 * `equipped` znaczyło wszystko naraz: noszony, trzymany, w kaburze albo tylko posiadany).
 * Pas przechodzi z `atHand` na `slots` (`belt.N`) bez utraty pozycji. Przedmioty, które mają już
 * sloty (położone przez lejek po wdrożeniu), zostają, gdzie są — migracja czyści tylko stare
 * `equipped` bez slotów, więc można ją puścić ponownie bez szkody.
 *
 * `game.modules.get(MODULE_ID).api.migration.migrateDoll()` — podgląd (domyślnie);
 * `{commit: true}` — zastosuj; `{actors: [...]}` — tylko wybrane.
 */
export async function migrateDoll({ commit = false, actors = null } = {}) {
  const targets = (actors ?? game.actors.contents).filter(isDollActor);
  const report = [];
  for (const actor of targets) {
    const updates = [];
    const rows = [];
    const belt = new Map(dollItems(actor).filter(d => d.family === "belt").map(d => [d.id, d.slots]));
    for (const item of actor.items) {
      const family = familyOf(item);
      if (!family) continue;
      const f = item.flags?.[MODULE_ID] ?? {};
      if (family === "belt") {
        if (f[LEGACY_BELT_FLAG] === undefined) continue;
        const slots = belt.get(item.id) ?? [];
        updates.push({ _id: item.id, [`flags.${MODULE_ID}.${SLOTS_FLAG}`]: slots, [`flags.${MODULE_ID}.-=${LEGACY_BELT_FLAG}`]: null });
        rows.push(`${item.name}: pas ${JSON.stringify(f[LEGACY_BELT_FLAG])} → ${slots.join(", ") || "(plecak)"}`);
        continue;
      }
      // Sloty = stan już z lalki (ktoś coś położył po wdrożeniu) — nie ruszamy; czyścimy tylko
      // stare `equipped` bez slotów. Dzięki temu migracja jest bezpieczna do powtórzenia.
      const hasSlots = Array.isArray(f[SLOTS_FLAG]) && f[SLOTS_FLAG].length;
      if (hasSlots || !item.system?.equipped) continue;
      updates.push({ _id: item.id, "system.equipped": false });
      rows.push(`${item.name} [${DOLL_FAMILIES[family].label}]: założony → plecak`);
    }
    if (!updates.length) continue;
    report.push({ actor: actor.name, changes: rows });
    if (commit) await actor.updateEmbeddedDocuments("Item", updates, { neuroDoll: true });
  }
  console.table?.(report.flatMap(r => r.changes.map(c => ({ postać: r.actor, zmiana: c }))));
  ui.notifications.info(`Oporządzenie: ${report.length} postaci, ${report.reduce((n, r) => n + r.changes.length, 0)} zmian`
    + `${commit ? " — zastosowano." : " — podgląd ({commit: true}, żeby zastosować)."}`);
  return report;
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

export function registerDoll() {
  Hooks.on("preUpdateItem", _onPreUpdateItem);
  Hooks.on("preCreateItem", _onPreCreateItem);
  Hooks.on("deleteItem", _onDeleteItem);
  Hooks.on("updateItem", _onUpdateItem);

  // Backstop dla aktywności omijających `Item#use` (makro aktywności, lista w rozwiniętym wierszu).
  // Tylko ataki i tryby ognia — D8 mówi „atakujesz tylko z ręki"; przeładowanie, baterie, paliwo
  // czy rozruch piły działają gdziekolwiek przedmiot leży.
  Hooks.on("dnd5e.preUseActivity", activity => {
    if (!ATTACK_ACTIVITY_TYPES.has(activity?.type)) return;
    const item = activity?.item;
    const gate = useGate(item);
    if (!gate || gate === "proceed") return;
    redirectUse(item, gate);
    return false;
  });

  Hooks.once("ready", () => {
    const mod = game.modules.get(MODULE_ID);
    if (!mod) return;
    mod.api ??= {};
    mod.api.migration ??= {};
    mod.api.migration.migrateDoll = migrateDoll;
  });
  console.log("Neuroshima 5e | Paper doll registered");
}

/** API: `game.neuroshima.lalka`. */
export const dollApi = {
  place, takeOff, drop, equip, draw, commitMoves, releaseHand,
  locationOf, inHand, heldItems, freeHands, isStowed, handOf, gripFor, slotsOf,
  dollState, dollItems, familyOf, isGoverned, isDollActor, useGate, migrate: migrateDoll,
  SLOT_GROUPS, DOLL_FAMILIES
};
