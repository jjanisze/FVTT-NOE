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
 *   - **„Działa jak…”** (s. 253, MG) — flaga na przedmiocie: bliźniak kopiuje kość, właściwości i kategorię broni białej.
 *   - **Rzut** — źródło ląduje na ziemi u celu ścieżką upuszczania (`ground-items.mjs`), bliźniak zostaje.
 *   - **Łyżeczka** (s. 70) — tabela wagi, biegłość, rzut 6 m, naturalna 1: karta z przyciskiem „pęka na dwie części”
 *     (przycisk, nie automat — przerzut Fuksem może jedynkę zmienić). Kobalt: rzut 6/18 m, przerzut jedynek,
 *     właściwość z rodzaju (wybór przy pierwszym ataku, MG może zawetować), „Zawsze coś pod ręką” — pozycja na
 *     liście „Na ziemi obok” w Oporządzeniu.
 *   - **Ukrycie wszędzie** — jeden predykat `jestBlizniakiem`: karta (`BaseActorSheet#_isItemVisible` — dnd5e pomija
 *     go przy budowie każdej listy; nie `Actor5e#hiddenItems`, bo ukryty tak przedmiot nie da się użyć —
 *     `Item5e#canUse`; dodatkowo `dnd5e.filterItem`), lalka (`dollSlot: "none"`), waga 0, handel i audyty pytają go same.
 */

import {
  improwizacjaZ, polowaWagi, jestBlizniakiem, FLAGA_BLIZNIAKA, FLAGA_ZRODLA, LYZECZKA_ZASIEG, wierszLyzeczki
} from "../config/improwizacja-rules.mjs";
import {
  LYZECZKA_ZASIEG_KOBALT, WLASCIWOSCI_LYZECZKI, koscLyzeczkiKobalt, wlasciwoscDozwolona
} from "../wkk/config/lyzeczka-kobalt.mjs";
import { isKobaltEnabled } from "../config/settings.mjs";
import { getSurowiecType } from "../config/surowce-data.mjs";
import { WEAPONS } from "../config/weapons-data.mjs";
import { isDollActor, handOf, place, drop, freeHands, dollState, registerDoReki, SLOTS_FLAG } from "./doll.mjs";
import { registerGroundExtra, registerPrimaryAction, registerSlotMenu, refreshDoll } from "./doll-panel.mjs";
import { sygnalNaruszenia, adresaciNaruszenia } from "../combat/sygnal-naruszenia.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
/** Stałe id aktywności ataku bliźniaka — przepięcie bliźniaka zachowuje ją. */
export const AKTYWNOSC_ATAKU = "neuroImprowAtak1";
/** Flaga aktora: tura, w której Łyżeczka Kobaltu złapała coś z otoczenia. */
const FLAGA_POD_REKA = "zawszePodReka";
/** Flaga przedmiotu złapanego z otoczenia (Kobalt). */
const FLAGA_Z_OTOCZENIA = "zOtoczenia";

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const TYPY_FIZYCZNE = new Set(["loot", "consumable", "tool", "container", "equipment"]);
const NAZWY_WLASCIWOSCI = Object.freeze({
  lgt: "Lekka", obalajaca: "Obalająca", powalajaca: "Powalająca", unieruchamiajaca: "Unieruchamiająca", burzaca: "Burząca"
});

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

const _kobaltLyzeczka = actor => isKobaltEnabled() && maLyzeczke(actor);

/** Waga jednej sztuki w kg (pojemnik — z zawartością, P2). */
export function wagaPrzedmiotu(item) {
  const total = item?.type === "container" ? Number(item.system?.totalWeight) : NaN;
  if (Number.isFinite(total)) return total;
  return Math.max(0, Number(item?.system?.weight?.value) || 0);
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

const _katalogBiala = () => WEAPONS.filter(w => w.type === "biala");

/**
 * Dane bliźniaka dla przedmiotu w ręce.
 * @param {Actor} actor
 * @param {Item} zrodlo
 * @param {string} reka  slot ręki (`hand.0`) albo `npc`
 */
export function daneBlizniaka(actor, zrodlo, reka) {
  const f = zrodlo.flags?.[MODULE_ID] ?? {};
  const wybory = f[FLAGA_ZRODLA] ?? {};
  const kobalt = _kobaltLyzeczka(actor);
  const lyzeczka = maLyzeczke(actor);
  const sila = Number(actor?.system?.abilities?.str?.value);
  const liczby = improwizacjaZ(
    { waga: wagaPrzedmiotu(zrodlo), typ: f.obrazeniaImprowizowane },
    { lyzeczka, sila: Number.isFinite(sila) ? sila : null, zasiegLyzeczki: kobalt ? LYZECZKA_ZASIEG_KOBALT : LYZECZKA_ZASIEG }
  );
  const jak = wybory.jak ? WEAPONS.find(w => w.id === wybory.jak && w.type === "biala") : null;

  let typ = "improwizowana";
  let kosc = liczby.kosc;
  let typy = liczby.typy;
  let wlasciwosci = ["thr"];
  let zasieg = liczby.zasieg;
  let nazwa = `${zrodlo.name} (improwizowana)`;
  let wzor = "";
  if (jak) {
    // „Działa jak…” (s. 253): zasady tej broni — kość, typy, właściwości i kategoria (biegłość w broni białej).
    typ = "biala";
    kosc = { number: jak.damage?.number ?? 1, faces: jak.damage?.denomination ?? 4 };
    typy = [...(jak.damage?.types ?? ["bludgeoning"])];
    wlasciwosci = [...new Set([...(jak.props ?? []), "thr"])];
    if (jak.range?.value) zasieg = { value: jak.range.value, long: jak.range.long ?? null };
    nazwa = `${zrodlo.name} (jak ${jak.name})`;
  } else {
    if (liczby.chwyt === 2) wlasciwosci.push("two");
    if (kobalt && liczby.wiersz !== null) {
      wzor = koscLyzeczkiKobalt(kosc);
      if (wybory.wlasciwosc && wlasciwoscDozwolona(liczby.wiersz, wybory.wlasciwosc)) wlasciwosci.push(wybory.wlasciwosc);
    }
  }

  return {
    name: nazwa, type: "weapon", img: zrodlo.img,
    system: {
      type: { value: typ, baseItem: "" },
      damage: {
        base: {
          number: kosc.number, denomination: kosc.faces, bonus: "", types: typy,
          custom: { enabled: !!wzor, formula: wzor }, scaling: { mode: "", number: null, formula: "" }
        }
      },
      range: { value: zasieg.value, long: zasieg.long, reach: null, units: "m" },
      properties: wlasciwosci,
      weight: { value: 0, units: "kg" }, price: { value: 0, denomination: "gb" },
      quantity: 1, equipped: false, identified: true,
      // Łyżeczka: „stanowi broń, w której masz biegłość” (s. 70) — bez niej natywna biegłość dnd5e (Gladiator).
      proficient: lyzeczka && !jak ? 1 : null,
      activities: { [AKTYWNOSC_ATAKU]: _aktywnoscAtaku() }
    },
    flags: {
      [MODULE_ID]: {
        [FLAGA_BLIZNIAKA]: { zrodlo: zrodlo.id, reka, jak: jak?.id ?? null, ponadSile: liczby.ponadSile, wiersz: liczby.wiersz },
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
  if (_kobaltLyzeczka(actor)) await _wybierzWlasciwosc(actor, zrodlo);
  const twin = await blizniak(actor, zrodlo, reka);
  const f = twin.flags[MODULE_ID][FLAGA_BLIZNIAKA];
  if (f.ponadSile) {
    void sygnalNaruszenia(actor, {
      tytul: "Broń improwizowana",
      linie: [`${zrodlo.name}: ${wagaPrzedmiotu(zrodlo)} kg — ponad SIŁ (${actor.system.abilities.str.value}). Rozstrzyga MG (U3).`]
    });
  }
  return twin.system.activities.get(AKTYWNOSC_ATAKU)?.use({ event });
}

/* -------------------------------------------- */
/*  Łyżeczka Kobaltu: właściwość z rodzaju       */
/* -------------------------------------------- */

/** Przy pierwszym ataku przedmiotem: wybór jednej właściwości z listy wagi (raz, potem przez menu przedmiotu). */
async function _wybierzWlasciwosc(actor, zrodlo, { zmien = false } = {}) {
  const wybory = zrodlo.flags?.[MODULE_ID]?.[FLAGA_ZRODLA] ?? {};
  if (wybory.jak) return;
  if (!zmien && "wlasciwosc" in wybory) return;
  const wiersz = wierszLyzeczki(wagaPrzedmiotu(zrodlo));
  const lista = WLASCIWOSCI_LYZECZKI[wiersz] ?? [];
  if (!lista.length) return;
  const opcje = [`<option value="">bez właściwości</option>`,
    ...lista.map(k => `<option value="${k}"${wybory.wlasciwosc === k ? " selected" : ""}>${esc(NAZWY_WLASCIWOSCI[k] ?? k)}</option>`)].join("");
  const wybor = await foundry.applications.api.DialogV2.prompt({
    window: { title: `Łyżeczka: ${zrodlo.name}` },
    content: `<p>Jaką właściwość ma ten przedmiot z racji swojego rodzaju? (${wagaPrzedmiotu(zrodlo)} kg — Kobalt, MG może
      zawetować.)</p><div class="form-group"><label>Właściwość</label><select name="w">${opcje}</select></div>`,
    ok: { label: "Wybierz", callback: (_e, b) => b.form.elements.w.value }
  }).catch(() => null);
  if (wybor === null || wybor === undefined) return;
  await zrodlo.setFlag(MODULE_ID, FLAGA_ZRODLA, { ...wybory, wlasciwosc: wybor });
  if (wybor) await _kartaMG(actor, zrodlo, `wybiera dla <strong>${esc(zrodlo.name)}</strong> właściwość <strong>${esc(NAZWY_WLASCIWOSCI[wybor])}</strong> (Łyżeczka, Kobalt).`,
    { akcja: "wetoWlasciwosci", label: "Zawetuj", dane: { item: zrodlo.uuid } });
}

/* -------------------------------------------- */
/*  Łyżeczka Kobaltu: Zawsze coś pod ręką        */
/* -------------------------------------------- */

const _turaTeraz = () => (game.combat?.started ? `${game.combat.id}:${game.combat.round}:${game.combat.turn}` : null);

function _podRekaDostepne(actor) {
  if (!actor?.isOwner || !isDollActor(actor) || !_kobaltLyzeczka(actor)) return false;
  if (freeHands(actor) < 1) return false;
  const tura = _turaTeraz();
  return !tura || actor.getFlag(MODULE_ID, FLAGA_POD_REKA) !== tura;
}

/** Pozycja „Na ziemi obok”: przedmiot z otoczenia (raz na turę, Darmowa Interakcja). */
function _pozycjaPodReka(actor) {
  if (!_podRekaDostepne(actor)) return [];
  return [{
    id: "zawszePodReka", name: "Coś z otoczenia (Łyżeczka)", img: "icons/svg/item-bag.svg", distance: "[I]",
    tooltip: "Zawsze coś pod ręką (Kobalt): raz na turę, Darmowa Interakcja — łapiesz przedmiot z otoczenia do SIŁ kg. MG może zawetować.",
    label: "Złap [I]", pick: () => zlapZOtoczenia(actor)
  }];
}

/** Kobalt: łapie przedmiot z otoczenia do wolnej ręki — prawdziwy przedmiot (`loot`), który MG może zawetować. */
export async function zlapZOtoczenia(actor) {
  if (!_podRekaDostepne(actor)) {
    ui.notifications.warn("Zawsze coś pod ręką: raz na turę i z wolną ręką.");
    return null;
  }
  const sila = Math.max(1, Number(actor.system.abilities.str.value) || 10);
  const dane = await foundry.applications.api.DialogV2.prompt({
    window: { title: "Zawsze coś pod ręką" },
    content: `<div class="form-group"><label>Co to jest</label><input type="text" name="n" value="Coś pod ręką" autofocus></div>
      <div class="form-group"><label>Waga (kg, do ${sila})</label><input type="number" name="w" min="0.1" max="${sila}" step="0.1" value="2"></div>`,
    ok: { label: "Złap", callback: (_e, b) => ({ n: b.form.elements.n.value, w: Number(b.form.elements.w.value) }) }
  }).catch(() => null);
  if (!dane) return null;
  const waga = Math.min(sila, Math.max(0.1, Number(dane.w) || 1));
  const reka = ["hand.0", "hand.1"].find(h => !dollState(actor).layout.slots.has(h) && !dollState(actor).occupants[h]);
  if (!reka) return null;
  const [item] = await actor.createEmbeddedDocuments("Item", [{
    name: String(dane.n || "Coś pod ręką").slice(0, 60), type: "loot", img: "icons/svg/item-bag.svg",
    system: { weight: { value: waga, units: "kg" }, quantity: 1, price: { value: 0, denomination: "gb" } },
    flags: { [MODULE_ID]: { [FLAGA_Z_OTOCZENIA]: true, [SLOTS_FLAG]: [reka] } }
  }], { neuroDoll: true });
  const tura = _turaTeraz();
  if (tura) await actor.setFlag(MODULE_ID, FLAGA_POD_REKA, tura);
  await _kartaMG(actor, item, `łapie z otoczenia: <strong>${esc(item.name)}</strong> (${waga} kg) — Zawsze coś pod ręką (Łyżeczka, Kobalt).`,
    { akcja: "wetoPodReka", label: "Zawetuj (nic tu nie ma)", dane: { item: item.uuid } });
  refreshDoll(actor);
  return item;
}

/* -------------------------------------------- */
/*  Rzut, naturalna 1                            */
/* -------------------------------------------- */

/** Hak `dnd5e.rollAttack`: rzut bliźniakiem — źródło leci na ziemię u celu; Łyżeczka z naturalną 1 — karta. */
function _onRollAttack(rolls, { subject, ammoUpdate } = {}) {
  const twin = subject?.item;
  if (!jestBlizniakiem(twin)) return;
  const actor = twin.actor;
  const zrodlo = actor?.items.get(twin.flags[MODULE_ID][FLAGA_BLIZNIAKA].zrodlo);
  const roll = rolls?.[0];
  if (maLyzeczke(actor) && zrodlo && roll?.isFumble) void _kartaPekniecia(actor, zrodlo);
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

/* -------------------------------------------- */
/*  Karty MG i przyciski                         */
/* -------------------------------------------- */

async function _kartaMG(actor, item, tekst, { akcja, label, dane }) {
  const attrs = Object.entries(dane).map(([k, v]) => `data-${k}="${esc(v)}"`).join(" ");
  await ChatMessage.implementation.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: adresaciNaruszenia(actor),
    content: `<div class="neuro-improw-karta"><p><strong>${esc(actor.name)}</strong> ${tekst}</p>
      <button type="button" data-neuro-improw="${akcja}" ${attrs} data-gm-only="1"><i class="fa-solid fa-ban"></i> ${esc(label)}</button></div>`
  });
}

function _onRenderChatMessageHTML(message, html) {
  for (const btn of html.querySelectorAll("button[data-neuro-improw]")) {
    if (btn.dataset.gmOnly && !game.user.isGM) { btn.hidden = true; continue; }
    btn.addEventListener("click", async ev => {
      ev.preventDefault();
      const item = await fromUuid(btn.dataset.item);
      if (!item) return ui.notifications.warn("Tego przedmiotu już nie ma.");
      if (!game.user.isGM && !item.isOwner) return;
      btn.disabled = true;
      const akcja = btn.dataset.neuroImprow;
      if (akcja === "pekniecie") await rozpolow(item);
      else if (akcja === "wetoPodReka") await item.delete();
      else if (akcja === "wetoWlasciwosci") await item.setFlag(MODULE_ID, FLAGA_ZRODLA, { ...(item.flags[MODULE_ID]?.[FLAGA_ZRODLA] ?? {}), wlasciwosc: "" });
    });
  }
}

/* -------------------------------------------- */
/*  „Działa jak…” (MG)                           */
/* -------------------------------------------- */

/** MG: przedmiot w ręce działa jak broń biała z katalogu (s. 253) — albo wraca do zwykłej improwizowanej. */
export async function dzialaJak(zrodlo) {
  if (!game.user.isGM || !zrodlo) return null;
  const wybory = zrodlo.flags?.[MODULE_ID]?.[FLAGA_ZRODLA] ?? {};
  const opcje = [`<option value="">zwykła improwizowana (1k4)</option>`, ..._katalogBiala()
    .map(w => `<option value="${w.id}"${wybory.jak === w.id ? " selected" : ""}>${esc(w.name)}</option>`)].join("");
  const jak = await foundry.applications.api.DialogV2.prompt({
    window: { title: `Działa jak…: ${zrodlo.name}` },
    content: `<p>Jeśli przedmiot szczególnie przypomina broń białą, działa jak ona (s. 253; noga od stołu — bejsbol).</p>
      <div class="form-group"><label>Broń</label><select name="w">${opcje}</select></div>`,
    ok: { label: "Ustaw", callback: (_e, b) => b.form.elements.w.value }
  }).catch(() => null);
  if (jak === null || jak === undefined) return null;
  await zrodlo.setFlag(MODULE_ID, FLAGA_ZRODLA, { ...wybory, jak: jak || null });
  return jak || null;
}

/* -------------------------------------------- */
/*  Menu i Oporządzenie                          */
/* -------------------------------------------- */

const _wRece = item => !!item?.actor && (!isDollActor(item.actor) || !!handOf(item));
const _etykietaAtaku = item => (item.type === "weapon" ? "Uderz kolbą / rękojeścią (improwizowana)" : "Atak improwizowany");

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
  if (_kobaltLyzeczka(actor) && item.type !== "weapon") {
    options.push({
      name: "Łyżeczka: zmień właściwość", icon: '<i class="fas fa-spoon"></i>',
      condition: () => actor.isOwner, callback: () => _wybierzWlasciwosc(actor, item, { zmien: true })
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
  registerGroundExtra(_pozycjaPodReka);
  registerPrimaryAction(_primary);
  registerSlotMenu(_menuOporzadzenia);
}

/** `game.neuroshima.improwizacja` */
export const improwizacjaApi = Object.freeze({
  atakImprowizowany, blizniak, daneBlizniaka, dzialaJak, zlapZOtoczenia, rozpolow, doReki, maLyzeczke, jestBlizniakiem
});
