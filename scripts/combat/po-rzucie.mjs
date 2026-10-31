/**
 * Neuroshima 5e — rejestr „po rzucie”: przyciski pod rzutem k20 (PLAN_m7 §3.0.2, D4).
 *
 * Uogólnienie paska Forsowania i Fuksa (`combat/rerolls.mjs`). Zasady łańcucha — `config/po-rzucie-rules.mjs`.
 *
 *   - **Źródło** (`zarejestrujZrodloPoRzucie`): `{ id, label, klasa, styl, typy, przerzut, wynik, kolejnosc,
 *     ocen(ctx), wykonaj(ctx) }`. `ocen` mówi, czy ten widz widzi przycisk i czy aktywny (kto, zasoby, zasięg);
 *     `wykonaj` pyta, płaci i zwraca `{ roll, flavor, flags?, poWiadomosci? }` albo `null` (anulowane).
 *   - **Łańcuch**: każda modyfikacja to nowa wiadomość z `flags.<mod>.poRzucie = { rootId, poprzednieId, uzyte,
 *     przerzut, zrodlo, info, przed }`; Test Ataku zostaje Testem Ataku (typ `attack`, powiązania karty i
 *     `rerollOf` — rozstrzygacz trafienia przenosi werdykt, `combat/trafienie.mjs`). Starą kartę „zastępuje” nowa:
 *     indeks następców liczony z czatu, bez zapisu na cudzej wiadomości (gracz z Motywacją nie może jej edytować);
 *     dawna flaga `rerolled` zostaje tam, gdzie wolno ją zapisać (zgodność).
 *   - **Hak** `neuroshima.rollModified({ message, poprzednia, nowa, roll, przed, kind, actor })` — `message` to rzut
 *     pierwotny (tam konsumenci trzymają swoje flagi), `przed` — wynik tuż przed tą modyfikacją. `neuroshima.rerolled`
 *     to alias z tym samym ładunkiem (inwentarz konsumentów: PLAN_m7 §8, E0). Odpala go klient, który posiada aktora
 *     rzutu; gdy klika ktoś inny (Motywacja na rzucie sojusznika) — aktywny MG przy utworzeniu nowej karty.
 */

import { TESTY_K20, LANCUCH_ZERO, poUzyciu, stanPrzycisku, wynikTestu } from "../config/po-rzucie-rules.mjs";
import { rollInfo, rollTypeOf } from "../config/chat-message-data.mjs";
import { obronaOf, verdictOfEntry } from "./trafienie.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
export const FLAG_PO_RZUCIE = "poRzucie";

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/* -------------------------------------------- */
/*  Rejestr źródeł                               */
/* -------------------------------------------- */

/** @type {Map<string, object>} */
const _zrodla = new Map();

/**
 * Źródło przycisku pod rzutem k20.
 * @param {{id: string, label: string, klasa?: string, styl?: object, typy: string[], przerzut?: boolean,
 *   wynik?: string, kolejnosc?: number, ocen: (ctx: object) => ({stan: string, powod?: string, etykieta?: string}|null),
 *   wykonaj: (ctx: object) => Promise<object|null>}} row
 */
export function zarejestrujZrodloPoRzucie(row) {
  _zrodla.set(row.id, row);
}

/** Usuń źródło (testy). */
export function wyrejestrujZrodloPoRzucie(id) {
  _zrodla.delete(id);
}

function _wKolejnosci() {
  return [..._zrodla.values()].sort((a, b) => (a.kolejnosc ?? 100) - (b.kolejnosc ?? 100));
}

/* -------------------------------------------- */
/*  Łańcuch i następcy                           */
/* -------------------------------------------- */

/** poprzednieId → { id, zrodlo } — kto zastąpił daną kartę. */
const _nastepcy = new Map();

function _zapamietaj(message) {
  const f = message?.flags?.[MODULE_ID]?.[FLAG_PO_RZUCIE];
  if (f?.poprzednieId) _nastepcy.set(f.poprzednieId, { id: message.id, zrodlo: f.zrodlo });
}

/**
 * Następca karty w łańcuchu albo `null`.
 * @param {ChatMessage} message
 * @returns {{id: string, zrodlo: string}|null}
 */
export function zastapionaPrzez(message) {
  if (!message) return null;
  const n = _nastepcy.get(message.id);
  if (n && game.messages.has(n.id)) return n;
  if (message.flags?.[MODULE_ID]?.rerolled) return { id: null, zrodlo: "przerzut" };
  // Sprzed rejestru: gracz bez prawa do cudzej karty zapisywał przerzut na swoim aktorze.
  if ((_aktorRzutu(message)?.getFlag(MODULE_ID, "przerzucone") ?? []).includes(message.id)) return { id: null, zrodlo: "przerzut" };
  return null;
}

/** Zapis łańcucha na karcie (rzut pierwotny — pusty; karta Fuksa/Forsowania sprzed rejestru — przerzut). */
export function lancuchOf(message) {
  const m = message?.flags?.[MODULE_ID] ?? {};
  const f = m[FLAG_PO_RZUCIE];
  if (f) return { uzyte: f.uzyte ?? [], przerzut: !!f.przerzut };
  if (m.fuks) return { uzyte: ["fuks"], przerzut: true };
  if (m.forsowanie) return { uzyte: ["forsowanie"], przerzut: true };
  return LANCUCH_ZERO;
}

/** Rzut pierwotny łańcucha. */
export function rootOf(message) {
  const id = message?.flags?.[MODULE_ID]?.[FLAG_PO_RZUCIE]?.rootId;
  return (id && game.messages.get(id)) || message;
}

/** Rodzaj rzutu karty: dnd5e (`rollInfo`) albo zapisany w łańcuchu (przerzut sprawdzenia to zwykły rzut). */
export function infoOf(message) {
  return rollInfo(message) ?? message?.flags?.[MODULE_ID]?.[FLAG_PO_RZUCIE]?.info ?? null;
}

/** Aktor rzutu z mówcy karty (niepowiązany żeton — jego aktor syntetyczny). */
function _aktorRzutu(message) {
  const sp = message?.speaker ?? {};
  if (sp.scene && sp.token) {
    const tok = game.scenes.get(sp.scene)?.tokens?.get(sp.token);
    if (tok?.actor) return tok.actor;
  }
  return sp.actor ? game.actors.get(sp.actor) ?? null : null;
}

/** Wynik wobec progu: ST z opcji rzutu; Test Ataku — werdykt jedynego celu (więcej celów — nieznany, U4). */
function _wynik(message, roll, typ) {
  if (typ === "attack") {
    const obrona = obronaOf(message);
    if (obrona?.targets?.length !== 1) return null;
    const v = verdictOfEntry(obrona, obrona.targets[0]).verdict;
    return v === "pudło" ? "porazka" : v ? "sukces" : null;
  }
  return wynikTestu(roll?.total, roll?.options?.target);
}

function _naturalna(roll) {
  const d = roll?.dice?.[0];
  const r = d?.results?.find(x => x.active !== false && !x.discarded) ?? d?.results?.[0];
  return Number.isFinite(Number(r?.result)) ? Number(r.result) : null;
}

/**
 * Kontekst źródła dla karty (render i kliknięcie liczą to samo).
 * @param {ChatMessage} message
 * @returns {object|null}
 */
export function kontekstRzutu(message) {
  const info = infoOf(message);
  if (!info || !TESTY_K20.includes(info.type)) return null;
  const roll = message.rolls?.[0];
  if (!roll) return null;
  return {
    message, info, typ: info.type, roll, root: rootOf(message), actor: _aktorRzutu(message),
    lancuch: lancuchOf(message), wynik: _wynik(message, roll, info.type), naturalna: _naturalna(roll),
    user: game.user
  };
}

/* -------------------------------------------- */
/*  Rzut z dodatkiem                             */
/* -------------------------------------------- */

/**
 * Ten sam rzut (klasa, opcje, wynik k20) z dodanym składnikiem — „+ kość Motywacji”, „+5”. Kości rzutu
 * pierwotnego oznaczone `hidden` (Dice So Nice ich nie toczy drugi raz; rdzeń pola nie czyta).
 * @param {Roll} roll       oceniony rzut
 * @param {string} formula  np. "1d4", "5"
 * @returns {Promise<Roll>}
 */
export async function rzutZDodatkiem(roll, formula) {
  const dodatek = await new Roll(String(formula)).evaluate();
  const data = roll.toJSON();
  for (const t of data.terms) for (const r of t.results ?? []) r.hidden = true;
  data.terms = [...data.terms, { class: "OperatorTerm", operator: "+", evaluated: true }, ...dodatek.toJSON().terms];
  data.total = Number(roll.total) + Number(dodatek.total);
  const nowy = roll.constructor.fromData(data);
  nowy._formula = Roll.getFormula(nowy.terms);
  return nowy;
}

/* -------------------------------------------- */
/*  Wykonanie                                    */
/* -------------------------------------------- */

const _wToku = new Set();

/** Powiązania karty ataku dla nowej karty łańcucha (`rerollOf` — PLAN_tt §4.8.7). */
function _danePowiazan(message) {
  if (rollTypeOf(message) !== "attack") return {};
  const src = message._source?.system ?? {};
  const system = foundry.utils.deepClone({
    origin: src.origin, activity: src.activity, item: src.item, targets: src.targets,
    ability: src.ability, mode: src.mode, ammunition: src.ammunition
  });
  return { type: "attack", system, rerollOf: message.id };
}

/** Dawny znacznik `rerolled` — tam, gdzie wolno pisać (autor, MG). Indeks następców i tak zastępuje kartę. */
async function _oznaczDawnymZnacznikiem(message) {
  try {
    if (message?.canUserModify(game.user, "update")) await message.update({ [`flags.${MODULE_ID}.rerolled`]: true });
  } catch (_e) { /* cudza karta — wystarczy indeks */ }
}

function _odpalHaki(payload) {
  Hooks.callAll("neuroshima.rollModified", payload);
  Hooks.callAll("neuroshima.rerolled", payload);
}

/**
 * Użyj źródła na karcie.
 * @param {string} zrodloId
 * @param {ChatMessage} message
 * @returns {Promise<ChatMessage|null>} nowa karta łańcucha
 */
export async function uzyjZrodla(zrodloId, message) {
  const row = _zrodla.get(zrodloId);
  if (!row || !message || _wToku.has(message.id)) return null;
  if (zastapionaPrzez(message)) {
    ui.notifications.warn("Ten rzut został już zastąpiony — użyj przycisku na nowszej karcie.");
    return null;
  }
  const ctx = kontekstRzutu(message);
  if (!ctx) return null;
  const st = stanPrzycisku(row, ctx, row.ocen(ctx));
  if (st.stan !== "aktywny") {
    if (st.powod) ui.notifications.warn(`${row.label}: ${st.powod}.`);
    return null;
  }

  _wToku.add(message.id);
  try {
    const res = await row.wykonaj(ctx);
    if (!res?.roll) return null;
    const lancuch = poUzyciu(ctx.lancuch, row.id, { przerzut: !!row.przerzut });
    const { rerollOf, ...typ } = _danePowiazan(message);
    const wlasciciel = !!ctx.actor?.isOwner;
    const flags = {
      [MODULE_ID]: {
        ...(res.flags ?? {}),
        ...(rerollOf ? { rerollOf } : {}),
        [FLAG_PO_RZUCIE]: {
          rootId: ctx.root.id, poprzednieId: message.id, uzyte: lancuch.uzyte, przerzut: lancuch.przerzut,
          zrodlo: row.id, info: ctx.info, przed: Number(ctx.roll.total), hak: wlasciciel ? game.user.id : "mg"
        }
      }
    };
    const nowa = await res.roll.toMessage({
      speaker: message.speaker ?? ChatMessage.getSpeaker({ actor: ctx.actor }),
      flavor: res.flavor ?? "",
      flags, ...typ
    });
    await res.poWiadomosci?.(nowa);
    await _oznaczDawnymZnacznikiem(message);
    if (wlasciciel) {
      _odpalHaki({ message: ctx.root, poprzednia: message, nowa, roll: res.roll, przed: Number(ctx.roll.total), kind: row.id, actor: ctx.actor });
    }
    return nowa;
  } finally {
    _wToku.delete(message.id);
  }
}

/* -------------------------------------------- */
/*  Haki czatu                                   */
/* -------------------------------------------- */

function _onCreateMessage(message) {
  const f = message.flags?.[MODULE_ID]?.[FLAG_PO_RZUCIE];
  if (!f?.poprzednieId) return;
  _zapamietaj(message);
  const poprzednia = game.messages.get(f.poprzednieId);
  if (poprzednia) ui.chat?.updateMessage?.(poprzednia);
  // Klikający nie posiadał aktora rzutu (Motywacja na rzucie sojusznika) — konsumentów budzi aktywny MG.
  if (f.hak === "mg" && game.users.activeGM?.isSelf) {
    const root = game.messages.get(f.rootId) ?? poprzednia;
    _odpalHaki({
      message: root, poprzednia, nowa: message, roll: message.rolls?.[0], przed: Number(f.przed),
      kind: f.zrodlo, actor: _aktorRzutu(message)
    });
  }
}

function _onDeleteMessage(message) {
  const f = message.flags?.[MODULE_ID]?.[FLAG_PO_RZUCIE];
  if (f?.poprzednieId && _nastepcy.get(f.poprzednieId)?.id === message.id) {
    _nastepcy.delete(f.poprzednieId);
    const poprzednia = game.messages.get(f.poprzednieId);
    if (poprzednia) ui.chat?.updateMessage?.(poprzednia);
  }
}

const STYL_PASKA = { display: "flex", gap: "6px", marginTop: "6px", justifyContent: "center", alignItems: "center", flexWrap: "wrap" };
const STYL_PRZYCISKU = { fontSize: "11px", padding: "2px 8px", borderRadius: "3px", fontWeight: "normal", lineHeight: "1.4" };

function _onRenderMessage(message, html) {
  if (html.querySelector(".neuroshima-reroll-bar")) return;
  const ctx = kontekstRzutu(message);
  if (!ctx) return;
  const content = html.querySelector(".message-content") ?? html;

  const nastepca = zastapionaPrzez(message);
  if (nastepca) {
    // Karta ataku pisze to sama w „Reakcjach celu” (`combat/obrona.mjs`).
    if (ctx.typ !== "attack") {
      const note = document.createElement("div");
      note.className = "neuro-po-rzucie-zastapiona";
      Object.assign(note.style, { fontSize: "11px", opacity: "0.7", marginTop: "4px", textAlign: "center" });
      note.textContent = `Zastąpione — ${_zrodla.get(nastepca.zrodlo)?.label ?? nastepca.zrodlo} na nowszej karcie.`;
      content.appendChild(note);
    }
    return;
  }

  const bar = document.createElement("div");
  bar.classList.add("neuroshima-reroll-bar");
  Object.assign(bar.style, STYL_PASKA);
  for (const row of _wKolejnosci()) {
    let ocena;
    try { ocena = row.ocen(ctx); } catch (err) {
      console.error(`${MODULE_ID} | po rzucie: „${row.id}” — ocena rzuciła wyjątek`, err);
      continue;
    }
    const st = stanPrzycisku(row, ctx, ocena);
    if (st.stan === "ukryty") continue;
    const btn = document.createElement("button");
    btn.type = "button";
    if (row.klasa) btn.classList.add(row.klasa);
    btn.dataset.neuroPoRzucie = row.id;
    btn.dataset.messageId = message.id;
    Object.assign(btn.style, STYL_PRZYCISKU, st.stan === "szary" ? (row.stylSzary ?? {}) : (row.styl ?? {}));
    btn.textContent = ocena?.etykieta ?? row.label;
    if (st.stan === "szary") btn.disabled = true;
    if (st.powod) btn.dataset.tooltip = st.powod;
    bar.appendChild(btn);
  }
  if (bar.childElementCount) content.appendChild(bar);
}

async function _onClick(event) {
  const btn = event.target?.closest?.("[data-neuro-po-rzucie]");
  if (!btn) return;
  event.preventDefault();
  event.stopPropagation();
  const message = game.messages.get(btn.dataset.messageId);
  if (!message || btn.disabled) return;
  const bar = btn.closest(".neuroshima-reroll-bar");
  const res = await uzyjZrodla(btn.dataset.neuroPoRzucie, message);
  if (res) bar?.remove();
}

export function registerPoRzucie() {
  Hooks.on("dnd5e.renderChatMessage", _onRenderMessage);
  Hooks.on("createChatMessage", _onCreateMessage);
  Hooks.on("deleteChatMessage", _onDeleteMessage);
  Hooks.once("ready", () => { for (const m of game.messages) _zapamietaj(m); });
  // Faza capture na `document` — dnd5e łapie kliknięcia w kartach po swojemu (DEV_GUIDE).
  document.addEventListener("click", _onClick, { capture: true });
  console.log(`${MODULE_ID} | Rejestr „po rzucie” registered`);
}

/** `game.neuroshima.poRzucie` — źródła, łańcuch, użycie z makra. */
export const poRzucieApi = Object.freeze({
  zrodla: () => _wKolejnosci().map(r => r.id),
  kontekst: kontekstRzutu, uzyj: uzyjZrodla, zastapionaPrzez, rzutZDodatkiem
});

/** Powierzchnia dla testów Quench. */
export const __testing = Object.freeze({ rzutZDodatkiem, kontekstRzutu, zastapionaPrzez, infoOf });
