/**
 * Neuroshima 5e — broń improwizowana: bliźniak przedmiotu w ręce (PLAN_m6_drobne_zasady.md §5.2, D6; Łyżeczka §5.2.1).
 *
 * MG (D6): „dowolny przedmiot w ręce to broń improwizowana”, a typ `improv` na przedmiotach „się nie spina”. Zamiast
 * tego postać trzyma na sobie **ukrytą broń — bliźniaka** — liczoną z wagi i rodzaju przedmiotu w ręce:
 *
 *   - **Do ręki** — rodzina lalki `wRece` (każdy przedmiot fizyczny bez innej rodziny, `doReki`) i przedmioty
 *     podręczne; tym samym lejkiem, z tymi samymi kosztami (`actors/doll.mjs`).
 *   - **Bliźniak** powstaje przy pierwszym ataku improwizowanym z danej ręki, jeden na rękę, przepinany w miejscu przy
 *     ataku innym przedmiotem i **nie kasowany** z ręką (po rzucie przycisk „Obrażenia” na karcie dalej go szuka —
 *     korekta E0c). Typ `improwizowana` (biegłość: Gladiator), 1k4, rzut 3/9 m, chwyt i typ obrażeń z
 *     `config/improwizacja-rules.mjs`. Kolbą i rękojeścią — ten sam bliźniak, źródłem jest broń (U6).
 *   - **„Działa jak…”** (s. 253, MG) — flaga na przedmiocie: bliźniak kopiuje kość, właściwości i kategorię broni białej,
 *     tylko wzorców do 1k6 (autor: broń improwizowana nie daje 1k8 i więcej — `dozwolonyOdpowiednik`).
 *   - **Rzut** — źródło ląduje na ziemi u celu ścieżką upuszczania (`ground-items.mjs`), bliźniak zostaje.
 *   - **Łyżeczka** (s. 70) — **osobny zestaw zasad, rozłączny** z regułami broni improwizowanej (autor, 2026-10-27):
 *     posiadacz atakuje techniką łyżeczki (tabela wagi, biegłość, rzut 6 m, maks. SIŁ kg), chyba że MG ustawił
 *     „działa jak…” albo gracz przełączył przedmiot na zwykłą improwizowaną (menu). Naturalna 1 — karta z przyciskiem
 *     „rozpada się na dwie części” (przycisk, nie automat — przerzut Fuksem może jedynkę zmienić).
 *   - **Ukrycie wszędzie** — jeden predykat `jestBlizniakiem`: karta (`BaseActorSheet#_isItemVisible` — dnd5e pomija
 *     go przy budowie każdej listy; nie `Actor5e#hiddenItems`, bo ukryty tak przedmiot nie da się użyć —
 *     `Item5e#canUse`; dodatkowo `dnd5e.filterItem`), lalka (`dollSlot: "none"`), waga 0, handel i audyty pytają go same.
 */

import {
  improwizacjaZ, polowaWagi, jestBlizniakiem, dozwolonyOdpowiednik, FLAGA_BLIZNIAKA, FLAGA_ZRODLA
} from "../config/improwizacja-rules.mjs";
import { getSurowiecType } from "../config/surowce-data.mjs";
import { WEAPONS } from "../config/weapons-data.mjs";
import { isDollActor, handOf, place, drop, registerDoReki, SLOTS_FLAG } from "./doll.mjs";
import { registerPrimaryAction, registerSlotMenu } from "./doll-panel.mjs";
import { sygnalNaruszenia } from "../combat/sygnal-naruszenia.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
/** Stałe id aktywności ataku bliźniaka — przepięcie bliźniaka zachowuje ją. */
export const AKTYWNOSC_ATAKU = "neuroImprowAtak1";

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const TYPY_FIZYCZNE = new Set(["loot", "consumable", "tool", "container", "equipment"]);

/* -------------------------------------------- */
/*  Kto co może                                  */
/* -------------------------------------------- */

/**
 * Rodzina `wRece` lalki: przedmiot fizyczny, którego nie ma w innej rodzinie. Bez surowców (jednostki po 100 g,
 * nie przedmioty), bez zawartości pojemników (najpierw wyjąć) i bez bliźniaków.
 */
export function doReki(item) {
  if (!item || !TYPY_FIZYCZNE.has(item.type)) return false;
  if (jestBlizniakiem(item) || item.system?.container) return false;
  return !getSurowiecType(item);
}

/** Postać ma Łyżeczkę (Gladiator). */
export function maLyzeczke(actor) {
  return !!actor?.items?.some(i => i.flags?.[MODULE_ID]?.abilityId === "lyzeczka");
}

/** Waga jednej sztuki w kg (pojemnik — z zawartością, P2). */
export function wagaPrzedmiotu(item) {
  const total = item?.type === "container" ? Number(item.system?.totalWeight) : NaN;
  if (Number.isFinite(total)) return total;
  return Math.max(0, Number(item?.system?.weight?.value) || 0);
}

const _wybory = zrodlo => zrodlo?.flags?.[MODULE_ID]?.[FLAGA_ZRODLA] ?? {};
/** Wzorzec „działa jak…”, jeśli ustawiony i dozwolony. */
const _wzorzec = zrodlo => {
  const id = _wybory(zrodlo).jak;
  const w = id ? WEAPONS.find(x => x.id === id) : null;
  return w && dozwolonyOdpowiednik(w) ? w : null;
};

/** Atak tym przedmiotem idzie zasadami Łyżeczki (a nie broni improwizowanej). */
export function technikaLyzeczki(actor, zrodlo) {
  return maLyzeczke(actor) && !_wzorzec(zrodlo) && !_wybory(zrodlo).zwykla;
}

/* -------------------------------------------- */
/*  Dane bliźniaka                               */
/* -------------------------------------------- */

function _aktywnoscAtaku() {
  return {
    _id: AKTYWNOSC_ATAKU, type: "attack", name: "Atak improwizowany",
    img: "icons/svg/sword.svg",
    activation: { type: "action", value: 1, condition: "", override: false },
    attack: { ability: "", bonus: "", critical: { threshold: null }, flat: false, type: { value: "melee", classification: "weapon" } },
    damage: { critical: { bonus: "" }, includeBase: true, parts: [] },
    consumption: { targets: [], scaling: { allowed: false } },
    description: {}, effects: [], range: { override: false }, target: { override: false, prompt: true },
    uses: { spent: 0, recovery: [] }
  };
}

/**
 * Dane bliźniaka dla przedmiotu w ręce.
 * @param {Actor} actor
 * @param {Item} zrodlo
 * @param {string} reka  slot ręki (`hand.0`) albo `npc`
 */
export function daneBlizniaka(actor, zrodlo, reka) {
  const f = zrodlo.flags?.[MODULE_ID] ?? {};
  const lyzeczka = technikaLyzeczki(actor, zrodlo);
  const sila = Number(actor?.system?.abilities?.str?.value);
  const liczby = improwizacjaZ(
    { waga: wagaPrzedmiotu(zrodlo), typ: f.obrazeniaImprowizowane },
    { lyzeczka, sila: Number.isFinite(sila) ? sila : null }
  );
  const jak = _wzorzec(zrodlo);

  let typ = "improwizowana";
  let kosc = liczby.kosc;
  let typy = liczby.typy;
  let wlasciwosci = ["thr"];
  let zasieg = liczby.zasieg;
  let nazwa = `${zrodlo.name} (${lyzeczka ? "łyżeczka" : "improwizowana"})`;
  if (jak) {
    // „Działa jak…” (s. 253): zasady tej broni — kość, typy, właściwości i kategoria (biegłość w broni białej).
    typ = "biala";
    kosc = { number: jak.damage?.number ?? 1, faces: jak.damage?.denomination ?? 4 };
    typy = [...(jak.damage?.types ?? ["bludgeoning"])];
    wlasciwosci = [...new Set([...(jak.props ?? []), "thr"])];
    if (jak.range?.value) zasieg = { value: jak.range.value, long: jak.range.long ?? null };
    nazwa = `${zrodlo.name} (jak ${jak.name})`;
  } else if (liczby.chwyt === 2) wlasciwosci.push("two");

  return {
    name: nazwa, type: "weapon", img: zrodlo.img,
    system: {
      type: { value: typ, baseItem: "" },
      damage: {
        base: {
          number: kosc.number, denomination: kosc.faces, bonus: "", types: typy,
          custom: { enabled: false, formula: "" }, scaling: { mode: "", number: null, formula: "" }
        }
      },
      range: { value: zasieg.value, long: zasieg.long, reach: null, units: "m" },
      properties: wlasciwosci,
      weight: { value: 0, units: "kg" }, price: { value: 0, denomination: "gb" },
      quantity: 1, equipped: false, identified: true,
      // Łyżeczka: „stanowi broń, w której masz biegłość” (s. 70) — bez niej natywna biegłość dnd5e (Gladiator).
      proficient: lyzeczka ? 1 : null,
      activities: { [AKTYWNOSC_ATAKU]: _aktywnoscAtaku() }
    },
    flags: {
      [MODULE_ID]: {
        [FLAGA_BLIZNIAKA]: { zrodlo: zrodlo.id, reka, jak: jak?.id ?? null, lyzeczka, ponadSile: liczby.ponadSile },
        dollSlot: "none"
      }
    }
  };
}

/** Bliźniak tej ręki (albo jedyny — BN bez lalki). */
function _blizniakReki(actor, reka) {
  return actor.items.find(i => jestBlizniakiem(i) && i.flags[MODULE_ID][FLAGA_BLIZNIAKA].reka === reka) ?? null;
}

/**
 * Bliźniak dla przedmiotu w tej ręce — przepięty w miejscu albo nowy (jeden zapis).
 * @returns {Promise<Item>}
 */
export async function blizniak(actor, zrodlo, reka) {
  const dane = daneBlizniaka(actor, zrodlo, reka);
  const stary = _blizniakReki(actor, reka);
  if (stary) {
    await stary.update(dane, { neuroDoll: true });
    return stary;
  }
  const [nowy] = await actor.createEmbeddedDocuments("Item", [dane], { neuroDoll: true });
  return nowy;
}

/* -------------------------------------------- */
/*  Atak                                         */
/* -------------------------------------------- */

/**
 * Atak improwizowany przedmiotem (z ręki — postać z lalką; BN — skądkolwiek).
 * @param {Actor} actor
 * @param {Item} zrodlo
 * @param {{event?: Event}} [opts]
 */
export async function atakImprowizowany(actor, zrodlo, { event = null } = {}) {
  if (!actor || !zrodlo) return null;
  let reka = "npc";
  if (isDollActor(actor)) {
    reka = handOf(zrodlo);
    if (!reka) {
      ui.notifications.warn(`${zrodlo.name}: weź najpierw do ręki (Oporządzenie albo menu przedmiotu).`);
      return null;
    }
  }
  const twin = await blizniak(actor, zrodlo, reka);
  if (twin.flags[MODULE_ID][FLAGA_BLIZNIAKA].ponadSile) {
    void sygnalNaruszenia(actor, {
      tytul: "Łyżeczka",
      linie: [`${zrodlo.name}: ${wagaPrzedmiotu(zrodlo)} kg — ponad wartość SIŁ (${actor.system.abilities.str.value}), maks. waga łyżeczki (s. 70). Rozstrzyga MG.`]
    });
  }
  return twin.system.activities.get(AKTYWNOSC_ATAKU)?.use({ event });
}

/* -------------------------------------------- */
/*  Rzut, naturalna 1                            */
/* -------------------------------------------- */

/** Hak `dnd5e.rollAttack`: rzut bliźniakiem — źródło leci na ziemię u celu; łyżeczka z naturalną 1 — karta. */
function _onRollAttack(rolls, { subject, ammoUpdate } = {}) {
  const twin = subject?.item;
  if (!jestBlizniakiem(twin)) return;
  const actor = twin.actor;
  const f = twin.flags[MODULE_ID][FLAGA_BLIZNIAKA];
  const zrodlo = actor?.items.get(f.zrodlo);
  const roll = rolls?.[0];
  if (f.lyzeczka && zrodlo && roll?.isFumble) void _kartaPekniecia(actor, zrodlo);
  if (!String(roll?.options?.attackMode ?? "").startsWith("thrown")) return;
  // Bliźniak nie jest amunicją — leci przedmiot, który reprezentuje.
  if (ammoUpdate?.id === twin.id) {
    ammoUpdate.quantity = twin.system.quantity;
    ammoUpdate.destroy = false;
  }
  if (!zrodlo || !actor.isOwner) return;
  const target = [...game.user.targets][0] ?? null;
  const from = isDollActor(actor) ? (handOf(zrodlo) ?? undefined) : undefined;
  drop(actor, zrodlo, { from, at: target, involuntary: true, quiet: true, reason: "Rzut" }).then(ok => {
    if (!ok) return;
    ChatMessage.implementation.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div><strong>${esc(zrodlo.name)}</strong> leci${target ? ` w stronę ${esc(target.name)}` : ""} i zostaje na ziemi.</div>`
    });
  });
}

async function _kartaPekniecia(actor, zrodlo) {
  await ChatMessage.implementation.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-improw-karta"><p><strong>${esc(zrodlo.name)}</strong>: naturalna 1 łyżeczką — przedmiot rozpada się
      na dwie równe części (s. 70). Po przerzutach:</p>
      <button type="button" data-neuro-improw="pekniecie" data-item="${zrodlo.uuid}"><i class="fa-solid fa-heart-crack"></i> Rozpada się na dwie części</button></div>`
  });
}

/** Naturalna 1 Łyżeczki: przedmiot → dwie połówki (jedna zostaje w ręce, druga do plecaka). */
export async function rozpolow(zrodlo) {
  const actor = zrodlo?.actor;
  if (!actor) return null;
  const waga = polowaWagi(zrodlo.system?.weight?.value);
  const dane = zrodlo.toObject();
  delete dane._id;
  const polowa = { ...dane, name: `½ ${zrodlo.name}`, system: { ...dane.system, quantity: 1, weight: { ...dane.system.weight, value: waga } } };
  if (polowa.flags?.[MODULE_ID]) delete polowa.flags[MODULE_ID][SLOTS_FLAG];
  const ilosc = Number(zrodlo.system?.quantity) || 1;
  if (ilosc > 1) {
    await zrodlo.update({ "system.quantity": ilosc - 1 });
    await actor.createEmbeddedDocuments("Item", [polowa, polowa]);
  } else {
    await zrodlo.update({ name: polowa.name, "system.weight.value": waga }, { neuroDoll: true });
    await actor.createEmbeddedDocuments("Item", [polowa]);
  }
  return true;
}

function _onRenderChatMessageHTML(_message, html) {
  for (const btn of html.querySelectorAll('button[data-neuro-improw="pekniecie"]')) {
    btn.addEventListener("click", async ev => {
      ev.preventDefault();
      const item = await fromUuid(btn.dataset.item);
      if (!item) return ui.notifications.warn("Tego przedmiotu już nie ma.");
      if (!game.user.isGM && !item.isOwner) return;
      btn.disabled = true;
      await rozpolow(item);
    });
  }
}

/* -------------------------------------------- */
/*  „Działa jak…” (MG), tryb łyżeczki            */
/* -------------------------------------------- */

/** MG: przedmiot w ręce działa jak broń biała z katalogu (s. 253, do 1k6) — albo wraca do zwykłej improwizowanej. */
export async function dzialaJak(zrodlo) {
  if (!game.user.isGM || !zrodlo) return null;
  const wybory = _wybory(zrodlo);
  const opcje = [`<option value="">zwykła improwizowana (1k4)</option>`, ...WEAPONS.filter(dozwolonyOdpowiednik)
    .map(w => `<option value="${w.id}"${wybory.jak === w.id ? " selected" : ""}>${esc(w.name)} (${w.damage.number}k${w.damage.denomination})</option>`)].join("");
  const jak = await foundry.applications.api.DialogV2.prompt({
    window: { title: `Działa jak…: ${zrodlo.name}` },
    content: `<p>Jeśli przedmiot szczególnie przypomina broń białą, działa jak ona (s. 253; noga od stołu — bejsbol). Tylko
      broń do 1k6 — broń improwizowana nie daje więcej. U posiadacza Łyżeczki atak idzie wtedy zasadami tej broni, nie łyżeczki.</p>
      <div class="form-group"><label>Broń</label><select name="w">${opcje}</select></div>`,
    ok: { label: "Ustaw", callback: (_e, b) => b.form.elements.w.value }
  }).catch(() => null);
  if (jak === null || jak === undefined) return null;
  await zrodlo.setFlag(MODULE_ID, FLAGA_ZRODLA, { ...wybory, jak: jak || null });
  return jak || null;
}

/** Posiadacz Łyżeczki: ten przedmiot technika łyżeczki albo zwykła broń improwizowana (zasady rozłączne). */
export async function przelaczLyzeczke(zrodlo) {
  const wybory = _wybory(zrodlo);
  await zrodlo.setFlag(MODULE_ID, FLAGA_ZRODLA, { ...wybory, zwykla: !wybory.zwykla });
  return !wybory.zwykla;
}

/* -------------------------------------------- */
/*  Menu i Oporządzenie                          */
/* -------------------------------------------- */

const _wRece = item => !!item?.actor && (!isDollActor(item.actor) || !!handOf(item));
const _etykietaAtaku = item => (item.type === "weapon" ? "Uderz kolbą / rękojeścią (improwizowana)"
  : technikaLyzeczki(item.actor, item) ? "Atak łyżeczką" : "Atak improwizowany");

function _onGetItemContextOptions(item, options) {
  if (!item?.actor || jestBlizniakiem(item)) return;
  const actor = item.actor;
  const fizyczny = item.type === "weapon" || doReki(item) || TYPY_FIZYCZNE.has(item.type);
  if (!fizyczny) return;
  if (isDollActor(actor) && !handOf(item) && (doReki(item) || item.type !== "weapon")) {
    options.push({
      name: "Weź do ręki", icon: '<i class="fas fa-hand"></i>',
      condition: () => actor.isOwner, callback: () => place(actor, item, "hand")
    });
  }
  options.push({
    name: _etykietaAtaku(item), icon: '<i class="fas fa-hand-fist"></i>',
    condition: () => actor.isOwner && _wRece(item), callback: () => atakImprowizowany(actor, item)
  });
  options.push({
    name: "Broń improwizowana: działa jak…", icon: '<i class="fas fa-baseball-bat-ball"></i>',
    condition: () => game.user.isGM && item.type !== "weapon", callback: () => dzialaJak(item)
  });
  if (maLyzeczke(actor) && item.type !== "weapon" && !_wzorzec(item)) {
    options.push({
      name: _wybory(item).zwykla ? "Łyżeczka: atakuj tym łyżeczką" : "Łyżeczka: atakuj tym jak zwykłą bronią improwizowaną",
      icon: '<i class="fas fa-spoon"></i>', condition: () => actor.isOwner, callback: () => przelaczLyzeczke(item)
    });
  }
}

function _menuOporzadzenia({ actor, ctx }) {
  return [{
    name: "Atak improwizowany", icon: '<i class="fas fa-hand-fist"></i>',
    condition: el => {
      const { item, slot } = ctx(el);
      return !!item && String(slot).startsWith("hand.") && actor().isOwner;
    },
    callback: el => {
      const { item } = ctx(el);
      if (item) atakImprowizowany(actor(), item);
    }
  }];
}

/** Klik w kafelek ręki z przedmiotem bez własnego użycia — atak nim (D8: „z ręki — atak”). */
function _primary(actor, item, slot, event) {
  if (!String(slot).startsWith("hand.") || item.type === "weapon") return null;
  return atakImprowizowany(actor, item, { event });
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

/** Karta dnd5e nie buduje wiersza bliźniaka (`_prepareItems` pyta `_isItemVisible` dla każdej listy). */
function _owinUkrycie() {
  const proto = dnd5e?.applications?.actor?.BaseActorSheet?.prototype;
  if (!proto?._isItemVisible || proto._isItemVisible.__neuroBlizniaki) return;
  const oryginal = proto._isItemVisible;
  const owiniety = function (item, ...args) {
    return jestBlizniakiem(item) ? false : oryginal.call(this, item, ...args);
  };
  owiniety.__neuroBlizniaki = true;
  proto._isItemVisible = owiniety;
}

export function registerImprowizacja() {
  registerDoReki(doReki);
  _owinUkrycie();
  Hooks.on("dnd5e.filterItem", (_sheet, item) => (jestBlizniakiem(item) ? false : undefined));
  Hooks.on("dnd5e.rollAttack", _onRollAttack);
  Hooks.on("dnd5e.getItemContextOptions", _onGetItemContextOptions);
  Hooks.on("renderChatMessageHTML", _onRenderChatMessageHTML);
  registerPrimaryAction(_primary);
  registerSlotMenu(_menuOporzadzenia);
}

/** `game.neuroshima.improwizacja` */
export const improwizacjaApi = Object.freeze({
  atakImprowizowany, blizniak, daneBlizniaka, dzialaJak, przelaczLyzeczke, technikaLyzeczki, rozpolow, doReki, maLyzeczke,
  jestBlizniakiem
});
