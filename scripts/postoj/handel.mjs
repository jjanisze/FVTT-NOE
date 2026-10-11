/**
 * Neuroshima 5e — wejście gracza „Handel” i limit gamblingu (PLAN_m5_postoj.md §7.5, D2, D28, U6, U44, U45).
 *
 * Gracz w miejscu postoju otwiera okno Handel: punkty handlowe tego miejsca (lista towaru — domyślna droga,
 * D28) i „Szukam czegoś konkretnego” — zamówienie specjalne ściśle wg RAW (k100 − CHA, s. 43), z jawnymi
 * liczbami. Pamięć targu per postać i doba: `flags.<mod>.targ = { dzien, miejsce, transakcje, szukane[],
 * roRzucone }` (U45). Transakcję zużywa każde zamówienie i każda sprzedaż poza punktem handlowym (D2); w
 * punkcie handlowym licznika nie ma (RAW s. 44). Tego samego przedmiotu nie szuka się drugi raz tej doby w tym
 * miejscu (D2) — MG może zezwolić z Cennika. Każda godzina gamblingu po pierwszej (⌈transakcje ÷ PB⌉) —
 * prośba o RO na MDR albo CHA ST 10, porażka — Wyczerpanie „Gambling” (s. 44, U6). Gambling we krwi — bez RO.
 */

import { KATALOG } from "../config/recipes-data.mjs";
import { GAMBLING_RO, LOKALIZACJE } from "../config/handel-data.mjs";
import { godzinyGamblingu, potrzebaRO, towarHandlu, grupaTowaru } from "../config/handel-rules.mjs";
import { isKobaltEnabled } from "../config/settings.mjs";
import { ilustracja } from "../config/ilustracje.mjs";
import { addExhaustion, removeExhaustion } from "../config/exhaustion.mjs";
import { dzienSwiata } from "../world-clock.mjs";
import { miejsceAktora, maMiejsce, opisMiejsca } from "./miejsce.mjs";
import { handlarzeMiejsca, portretHandlarza, opisHandlarza } from "./handlarz.mjs";
import { rzucZamowienie, gamblingWeKrwi } from "./zamowienie.mjs";
import { wymiana, otworzWymiane, dodajDostaje } from "./wymiana.mjs";
import { zarejestrujAkcje } from "./karty.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
export const FLAGA_TARGU = "targ";
const TPL = `modules/${MODULE_ID}/templates/postoj`;
const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const _bezOgonkow = s => String(s ?? "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/ł/g, "l");

/* -------------------------------------------- */
/*  Pamięć targu (U45)                           */
/* -------------------------------------------- */

const _kluczMiejsca = m => `${m?.nazwa ?? ""}|${m?.rodzaj ?? ""}|${m?.region ?? ""}`;

/** Targ tej doby w tym miejscu (nowy, gdy zapisany jest z innej doby albo miejsca). */
export function targ(actor) {
  const m = miejsceAktora(actor).miejsce;
  const f = actor?.getFlag?.(MODULE_ID, FLAGA_TARGU) ?? {};
  const dzien = dzienSwiata();
  if (f.dzien !== dzien || f.miejsce !== _kluczMiejsca(m)) {
    return { dzien, miejsce: _kluczMiejsca(m), transakcje: 0, szukane: [], roRzucone: 0 };
  }
  return { dzien, miejsce: f.miejsce, transakcje: Number(f.transakcje) || 0, szukane: Array.isArray(f.szukane) ? f.szukane : [], roRzucone: Number(f.roRzucone) || 0 };
}

async function _zapiszTarg(actor, t) {
  await actor.update({ [`flags.${MODULE_ID}.${FLAGA_TARGU}`]: t });
}

/** PB postaci (limit transakcji na godzinę, s. 44). */
export function pbPostaci(actor) {
  return Math.max(1, Number(actor?.system?.attributes?.prof) || 2);
}

/** Podsumowanie licznika dla okien: „transakcje 3 · godzina 2 (PB 2)”. */
export function stanTargu(actor) {
  const t = targ(actor);
  const pb = pbPostaci(actor);
  return { ...t, pb, godziny: godzinyGamblingu({ transakcje: t.transakcje, pb }), krew: gamblingWeKrwi(actor) };
}

/** Dolicza transakcje i prosi o RO za kolejne godziny (U6). */
export async function liczTransakcje(actor, ile = 1, { szukane = null } = {}) {
  const t = targ(actor);
  t.transakcje += ile;
  if (szukane) t.szukane = [...new Set([...t.szukane, szukane])];
  const brak = potrzebaRO({ transakcje: t.transakcje, pb: pbPostaci(actor), juzRzucone: t.roRzucone, gamblingWeKrwi: gamblingWeKrwi(actor) });
  t.roRzucone += brak;
  await _zapiszTarg(actor, t);
  for (let i = 0; i < brak; i++) await prosbaRO(actor, godzinyGamblingu({ transakcje: t.transakcje, pb: pbPostaci(actor) }) - brak + i + 1);
  return t;
}

/**
 * Zamówienie specjalne gracza (D28, U44): „już szukałeś dziś” (D2), transakcja, rzut, RO.
 * @param {{k100?: number|null, zezwol?: boolean}} [o]  `zezwol` — MG pozwala szukać drugi raz
 */
export async function szukaj(actor, wpis, { k100 = null, zezwol = false } = {}) {
  const { miejsce } = miejsceAktora(actor);
  if (!maMiejsce(miejsce)) return ui.notifications.warn("Drużyna nie stoi w żadnym miejscu — MG ustawia je na karcie drużyny.");
  const t = targ(actor);
  if (!zezwol && t.szukane.includes(wpis.ref)) {
    ui.notifications.warn(`${wpis.nazwa}: już szukałeś dziś tutaj (s. 43 — MG może pozwolić z Cennika).`);
    return null;
  }
  await liczTransakcje(actor, 1, { szukane: wpis.ref });
  return rzucZamowienie(actor, wpis, { miejsce, k100 });
}

/* -------------------------------------------- */
/*  RO za kolejną godzinę gamblingu (s. 44)      */
/* -------------------------------------------- */

/** Karta prośby dnd5e z własnym handlerem `neuroGamblingRO` — wynik dopina się do karty. */
export async function prosbaRO(actor, godzina) {
  return ChatMessage.create({
    type: "request",
    content: `<p><strong>${esc(actor.name)}</strong>: ${godzina}. godzina gamblingu tej doby — Rzut Obronny na Mądrość albo Charyzmę, ST ${GAMBLING_RO.st}. Porażka — Wyczerpanie (s. 44).</p>`,
    speaker: ChatMessage.getSpeaker({ actor }),
    system: {
      handler: "neuroGamblingRO",
      data: { godzina },
      button: { icon: "fa-solid fa-shield-halved", label: "RO MDR / CHA" },
      targets: [{ actor: actor.uuid }]
    }
  });
}

async function _handlerRO(actor, request, data, { event } = {}) {
  const cecha = await foundry.applications.api.DialogV2.wait({
    window: { title: "Gambling — kolejna godzina" },
    content: `<p>RO ST ${GAMBLING_RO.st}: którą Cechą?</p>`,
    buttons: [
      { action: "wis", label: `Mądrość (${actor.system.abilities.wis.save?.value ?? actor.system.abilities.wis.mod})`, default: true },
      { action: "cha", label: `Charyzma (${actor.system.abilities.cha.save?.value ?? actor.system.abilities.cha.mod})` }
    ],
    rejectClose: false
  });
  if (!cecha) return null;
  const md = {};
  foundry.utils.setProperty(md, "flags.dnd5e.requestResult", { actorUuid: actor.uuid, requestId: request.id });
  foundry.utils.setProperty(md, `flags.${MODULE_ID}.gamblingRO`, { actorUuid: actor.uuid });
  const [roll] = (await actor.rollSavingThrow({ ability: cecha, target: GAMBLING_RO.st, event }, { configure: false }, { data: md })) ?? [];
  if (roll && !roll.isSuccess) await addExhaustion(actor, "gambling");
  return roll?.parent ?? null;
}

/** Fuks zamienił porażkę RO w sukces — cofnij Wyczerpanie „Gambling” (raz). */
async function _onRerolled({ message, roll, actor }) {
  if (!message?.flags?.[MODULE_ID]?.gamblingRO || !actor?.isOwner) return;
  const st = GAMBLING_RO.st;
  const byla = (message.rolls?.[0]?.total ?? 0) >= st;
  if (!byla && (roll?.total ?? 0) >= st) await removeExhaustion(actor, "gambling");
}

/** Sprzedaż poza punktem handlowym, bez zamówienia — +1 transakcja (D2, §7.6). */
async function _onWymianaZatwierdzona(actor, wynik) {
  if (wynik.handlarz || wynik.zamowienie || !wynik.sprzedaz) return;
  if (actor.isOwner) await liczTransakcje(actor, 1);
}

/* -------------------------------------------- */
/*  Okno „Handel” (gracz)                        */
/* -------------------------------------------- */

const MAKS = 40;

export class HandelOkno extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["neuro-handel", "neuro-postoj-okno"],
    window: { title: "Handel", icon: "fa-solid fa-scale-balanced", resizable: true },
    position: { width: 640, height: 720 },
    actions: {
      otworz: HandelOkno.#otworz,
      szukaj: HandelOkno.#szukaj
    }
  };

  static PARTS = {
    gora: { template: `${TPL}/handel-okno.hbs` },
    wyniki: { template: `${TPL}/handel-wyniki.hbs`, scrollable: [".neuro-handel-wyniki"] }
  };

  constructor(actor, options = {}) {
    super({ id: `neuro-handel-${actor.id}`, ...options });
    this.actor = actor;
    this.query = "";
    this._hook = Hooks.on("updateActor", a => { if (a === this.actor || a.getFlag?.(MODULE_ID, "handlarz")) this.render(); });
  }

  get title() { return `Handel — ${this.actor.name}`; }

  async close(o) {
    Hooks.off("updateActor", this._hook);
    return super.close(o);
  }

  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    const { miejsce } = miejsceAktora(this.actor);
    if (partId === "gora") {
      const handlarze = handlarzeMiejsca(miejsce);
      context.miejsce = { opis: opisMiejsca(miejsce), ustawione: maMiejsce(miejsce) };
      context.obraz = await ilustracja("miejsce", null, { nadpisanie: miejsce.obraz });
      context.handlarze = await Promise.all(handlarze.map(async h => ({
        uuid: h.uuid, nazwa: h.name, portret: await portretHandlarza(h), ...opisHandlarza(h), pozycji: h.items.size
      })));
      const w = wymiana(this.actor);
      context.wymiana = w ? { handlarz: w.handlarz ? fromUuidSync(w.handlarz)?.name ?? "?" : "ktoś w osadzie", pozycji: w.daje.length + w.dostaje.length } : null;
      context.targ = stanTargu(this.actor);
      context.targ.szukaneNazwy = context.targ.szukane.map(r => KATALOG.get(r)?.nazwa ?? r);
      context.query = this.query;
      context.ro = !context.targ.krew;
    }
    if (partId === "wyniki") {
      const q = _bezOgonkow(this.query).trim();
      const t = targ(this.actor);
      const kobalt = isKobaltEnabled();
      context.wyniki = q.length < 2 ? [] : [...KATALOG.values()]
        .filter(w => towarHandlu(w, { kobalt }) && _bezOgonkow(w.nazwa).includes(q))
        .slice(0, MAKS)
        .map(w => ({ ref: w.ref, nazwa: w.nazwa, grupa: grupaTowaru(w), juz: t.szukane.includes(w.ref) }));
      context.krotkie = q.length > 0 && q.length < 2;
      context.ustawione = maMiejsce(miejsce);
    }
    return context;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const input = this.element.querySelector("input[name=query]");
    if (input && !input.dataset.zwiazane) {
      input.dataset.zwiazane = "1";
      input.addEventListener("input", ev => { this.query = ev.target.value; this.render({ parts: ["wyniki"] }); });
    }
  }

  static async #otworz(_ev, btn) {
    const h = btn.dataset.uuid ? fromUuidSync(btn.dataset.uuid) : null;
    const w = wymiana(this.actor);
    if (w && w.handlarz && h && w.handlarz !== h.uuid && (w.daje.length || w.dostaje.length)) {
      const ok = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Inna wymiana" },
        content: `<p>Masz otwartą wymianę z ${esc(fromUuidSync(w.handlarz)?.name ?? "kimś")}. Porzucić ją?</p>`
      });
      if (!ok) return;
    }
    if (h) await otworzWymiane(this.actor, h);
    const { otworzStolWymiany } = await import("./stol-wymiany.mjs");
    otworzStolWymiany(this.actor);
  }

  static async #szukaj(_ev, btn) {
    const wpis = KATALOG.get(btn.dataset.ref);
    if (wpis) await szukaj(this.actor, wpis);
    this.render();
  }
}

/** Otwiera okno Handel dla postaci. */
export function otworzHandel(actor) {
  if (!actor) return null;
  const app = foundry.applications.instances.get(`neuro-handel-${actor.id}`) ?? new HandelOkno(actor);
  return app.render({ force: true });
}

/* -------------------------------------------- */
/*  Przycisk na karcie postaci                   */
/* -------------------------------------------- */

function _onRenderCharacterSheet(app, html) {
  const actor = app.document ?? app.actor;
  if (actor?.type !== "character" || !actor.isOwner) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  const bar = root?.querySelector(".sheet-header .sheet-header-buttons");
  if (!bar || bar.querySelector(".neuro-handel-btn")) return;
  if (!maMiejsce(miejsceAktora(actor).miejsce)) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "neuro-handel-btn gold-button";
  btn.dataset.tooltip = "Handel — punkty handlowe i zamówienie specjalne";
  btn.setAttribute("aria-label", "Handel");
  btn.innerHTML = `<i class="fa-solid fa-scale-balanced" inert></i>`;
  btn.addEventListener("click", ev => { ev.preventDefault(); ev.stopPropagation(); otworzHandel(actor); });
  bar.append(btn);
}

export function registerHandel() {
  CONFIG.DND5E.requests.neuroGamblingRO = _handlerRO;
  Hooks.on("renderCharacterActorSheet", _onRenderCharacterSheet);
  Hooks.on("neuroshima.rerolled", _onRerolled);
  Hooks.on("neuroshima.wymianaZatwierdzona", _onWymianaZatwierdzona);
  Hooks.once("ready", () => foundry.applications.handlebars.loadTemplates([`${TPL}/handel-okno.hbs`, `${TPL}/handel-wyniki.hbs`]));
  // „Dodaj do wymiany” z szeptu MG po udanym zamówieniu: pozycja katalogu u „kogoś” w osadzie (D28).
  zarejestrujAkcje("zamowienieDoWymiany", async (_ev, btn) => {
    if (!game.user.isGM) return;
    const actor = await fromUuid(btn.dataset.aktor);
    const wpis = KATALOG.get(btn.dataset.ref);
    if (!actor || !wpis) return;
    if (!wymiana(actor)) await otworzWymiane(actor, null, { zamowienie: true });
    await dodajDostaje(actor, { typ: "katalog", ref: wpis.ref, nazwa: wpis.nazwa, ilosc: Number(btn.dataset.ilosc) || 1 });
    const { otworzStolWymiany } = await import("./stol-wymiany.mjs");
    otworzStolWymiany(actor);
  });
}

export const handelOknoApi = Object.freeze({ otworz: otworzHandel, szukaj, targ, stanTargu, liczTransakcje, prosbaRO });
