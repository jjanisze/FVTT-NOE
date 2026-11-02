/**
 * Neuroshima 5e — warunkowe Ułatwienia i premie w Testach Cechy i RO: warstwa Foundry (PLAN_m7 §3.0.3).
 *
 * Zasady — `config/ulatwienia-testow.mjs`. Tutaj:
 *
 *   - **Rejestr** `zarejestrujUlatwienieTestu({ id, label, rzut, rodzaj, wartosc?, gdy, ma })` — `ma(actor)`: czy
 *     aktor ma zdolność; `gdy(ctx)` — warunek spoza danych rzutu.
 *   - **Jeden hak** `dnd5e.preRollD20Test` (wspólny dla testów i RO; ataki to silnik okoliczności,
 *     `combat/okolicznosci.mjs`): domyślne Ułatwienie/Utrudnienie i premie w części rzutu — przed oknem, więc gracz i
 *     MG je zmieniają; odpala też przy `configure: false`.
 *   - **Kontekst RO**: karta żądająca rzutu dopisuje źródło w konfiguracji (`config.neuroKontekst = ["trucizna"]`) —
 *     dnd5e przenosi nieznane klucze konfiguracji do haka (`Actor5e#rollSavingThrow`, `mergeObject`).
 *   - **Rozkład** na rzucie (`roll.options.neuroTesty`) → plakietki na karcie z powodem w dymku; propozycje „stół”
 *     jako osobna plakietka „do rozważenia”.
 */

import { rozstrzygnijTest, ktoSieUkrywa } from "../config/ulatwienia-testow.mjs";
import { kombatantWlasciciela } from "./czas-efektu.mjs";
import { cardPillList } from "../config/chat-card-dom.mjs";
import { jestMaszyna } from "../actors/towarzysze.mjs";
import { ULATWIENIA } from "../config/zdolnosci-efekty.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
export const TESTY_OPT = "neuroTesty";

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/** @type {Map<string, object>} */
const _wiersze = new Map();

/**
 * Warunkowe Ułatwienie, Utrudnienie albo premia w testach i RO.
 * @param {{id: string, label: string, rzut: string[], rodzaj: "ulatwienie"|"utrudnienie"|"premia", wartosc?: string|number,
 *   gdy?: (ctx: object) => boolean|"stol", ma: (actor: Actor) => boolean}} row
 */
export function zarejestrujUlatwienieTestu(row) {
  _wiersze.set(row.id, row);
}

/** Usuń wiersz (testy). */
export function wyrejestrujUlatwienieTestu(id) {
  _wiersze.delete(id);
}

/** Rodzaj rzutu z nazw haków dnd5e (`dice/basic-roll.mjs`: `[typ, "abilityCheck", "d20Test"]`). */
function _typ(config) {
  const h = config?.hookNames ?? [];
  if (h.includes("attack")) return null;
  if (h.includes("SavingThrow")) return "save";
  if (h.includes("skill")) return "skill";
  if (h.includes("tool")) return "tool";
  if (h.includes("AbilityCheck") || h.includes("abilityCheck")) return "check";
  return null;
}

/** Stany i typy obrażeń aktywności → źródło RO (`config/ulatwienia-testow.mjs` `KONTEKSTY_RO`). */
const KONTEKST_STANU = Object.freeze({ frightened: "przerazenie", poisoned: "trucizna" });
const KONTEKST_OBRAZEN = Object.freeze({ acid: "kwas", poison: "trucizna", radiant: "skazenie" });

/**
 * Źródło RO z karty aktywności, która żąda rzutu (natywne RO dnd5e — Bestiariusz): `SaveActivity#rollSave` daje
 * rzutowi zdarzenie kliknięcia i `system.origin` karty, więc da się dojść do aktywności — nakładane stany, typy
 * obrażeń, szablon (obszar) i to, czy rzuca na nas maszyna.
 */
function _kontekstZKarty(config, message) {
  const id = foundry.utils.getProperty(message ?? {}, "data.system.origin")
    ?? config?.event?.target?.closest?.("[data-message-id]")?.dataset?.messageId;
  let activity = null;
  try { activity = id ? game.messages.get(id)?.getAssociatedActivity?.() : null; } catch (_e) { activity = null; }
  if (!activity) return [];
  const out = new Set();
  for (const e of activity.effects ?? []) for (const s of e.effect?.statuses ?? []) if (KONTEKST_STANU[s]) out.add(KONTEKST_STANU[s]);
  for (const p of activity.damage?.parts ?? []) for (const t of p.types ?? []) if (KONTEKST_OBRAZEN[t]) out.add(KONTEKST_OBRAZEN[t]);
  if (activity.target?.template?.type) out.add("obszar");
  if (activity.actor && jestMaszyna(activity.actor)) out.add("maszyna");
  return [...out];
}

/**
 * Kontekst rzutu dla wierszy.
 * @param {object} config   konfiguracja rzutu dnd5e
 * @param {object} [message] konfiguracja wiadomości (trzeci argument haka)
 * @returns {object|null}
 */
export function kontekstTestu(config, message = null) {
  const actor = config?.subject;
  const typ = _typ(config);
  if (!(actor instanceof Actor) || !typ) return null;
  const skill = config.skill ?? null;
  const ability = config.ability ?? (skill ? actor.system.skills?.[skill]?.ability : null) ?? null;
  return {
    actor, typ, ability, skill, tool: config.tool ?? null,
    walka: !!kombatantWlasciciela(actor),
    stany: new Set(actor.statuses ?? []),
    kontekst: [...new Set([...[].concat(config.neuroKontekst ?? []), ...(typ === "save" ? _kontekstZKarty(config, message) : [])])]
  };
}

/** Rozstrzygnięcie dla rzutu z wierszy posiadanych przez aktora. */
export function rozstrzygnijRzut(config, message = null) {
  const ctx = kontekstTestu(config, message);
  if (!ctx) return null;
  const rows = [..._wiersze.values()].filter(r => {
    try { return r.ma(ctx.actor); } catch (_e) { return false; }
  });
  return rows.length ? { ctx, wynik: rozstrzygnijTest(rows, ctx) } : null;
}

function _onPreRollD20Test(config, _dialog, message) {
  let r;
  try { r = rozstrzygnijRzut(config, message); } catch (err) {
    console.error(`${MODULE_ID} | Ułatwienia testów`, err);
    return;
  }
  if (!r) return;
  const { ulatwienia, utrudnienia, premie, propozycje } = r.wynik;
  if (ulatwienia.length) config.advantage = true;
  if (utrudnienia.length) config.disadvantage = true;
  const roll0 = config.rolls?.[0];
  if (roll0 && premie.length) roll0.parts = [...(roll0.parts ?? []), ...premie.map(p => String(p.wartosc))];
  if (!ulatwienia.length && !utrudnienia.length && !premie.length && !propozycje.length) return;
  const zapis = { ulatwienia, utrudnienia, premie, propozycje };
  for (const roll of config.rolls ?? []) {
    roll.options ??= {};
    roll.options[TESTY_OPT] = zapis;
  }
}

/* -------------------------------------------- */
/*  Plakietki na karcie                          */
/* -------------------------------------------- */

function _pill(icon, label, tooltip, extra = "") {
  const li = document.createElement("li");
  li.className = `pill neuro-testy${extra}`;
  if (tooltip) li.dataset.tooltip = tooltip;
  li.innerHTML = `<i class="fa-solid ${icon}" inert></i> <span class="label">${esc(label)}</span>`;
  return li;
}

function _onRenderMessage(message, html) {
  const z = message.rolls?.[0]?.options?.[TESTY_OPT];
  if (!z || html.querySelector(".neuro-testy")) return;
  const pills = cardPillList(html);
  if (!pills) return;
  const nazwy = l => l.map(w => w.label).join(" · ");
  if (z.ulatwienia.length) pills.appendChild(_pill("fa-scale-balanced", `Ułatwienie: ${nazwy(z.ulatwienia)}`,
    "Domyślne w oknie rzutu — gracz i MG mogą je zmienić."));
  if (z.utrudnienia.length) pills.appendChild(_pill("fa-scale-balanced", `Utrudnienie: ${nazwy(z.utrudnienia)}`,
    "Domyślne w oknie rzutu — gracz i MG mogą je zmienić.", " maroon"));
  for (const p of z.premie) pills.appendChild(_pill("fa-plus", `${p.label} ${String(p.wartosc).startsWith("-") ? "" : "+"}${p.wartosc}`));
  if (z.propozycje.length) pills.appendChild(_pill("fa-circle-question", `Do rozważenia: ${nazwy(z.propozycje)}`,
    "Warunek fabularny — moduł go nie ocenia. Gdy pasuje, MG zmienia tryb rzutu w oknie albo przerzuca.", " neuro-testy-stol"));
}

/** Czy aktor ma zdolność (klasową, profesji, opcję, Pochodzenia) albo Sztuczkę o tym identyfikatorze. */
function _maZdolnosc(actor, id) {
  return actor?.items?.some(i => i.getFlag(MODULE_ID, "abilityId") === id || i.getFlag(MODULE_ID, "originAbilityId") === id
    || i.getFlag(MODULE_ID, "sztuczka") === id) ?? false;
}

/** Żetony sceny, na której stoi aktor (albo oglądanej), w kształcie `ktoSieUkrywa`. */
function _zetonySceny(actor) {
  const scene = actor?.token?.parent ?? actor?.getActiveTokens?.()[0]?.document?.parent ?? canvas?.scene ?? null;
  return (scene?.tokens ?? []).filter(t => t.actor).map(t => ({
    actorId: t.actor.id, nazwa: t.name, ciszejNizCien: _maZdolnosc(t.actor, "ciszejNizCien"), stany: t.actor.statuses ?? []
  }));
}

export function registerUlatwieniaTestow() {
  // Wiersze ze zdolności jako dane (PLAN_m7 E3, `config/zdolnosci-efekty.mjs`); `klucz` — gdy zdolność ma ich kilka.
  for (const row of ULATWIENIA) {
    zarejestrujUlatwienieTestu({ ...row, id: row.klucz ?? row.id, ma: actor => _maZdolnosc(actor, row.id) });
  }
  // Sztuczka Ciszej niż cień należy do ukrywającego się, a Utrudnienie dostaje szukający przeciwnik (BN): podpowiedź MG
  // w jego Percepcji, gdy na scenie ukrywa się ktoś z tą Sztuczką — czy test szuka akurat tej postaci, rozstrzyga MG.
  zarejestrujUlatwienieTestu({
    id: "ciszejNizCien", label: "Ciszej niż cień — ktoś ukrywa się na scenie", rzut: ["skill:prc"], rodzaj: "utrudnienie",
    gdy: () => "stol", ma: actor => !actor?.hasPlayerOwner && !!ktoSieUkrywa(_zetonySceny(actor), actor?.id)
  });
  Hooks.on("dnd5e.preRollD20Test", _onPreRollD20Test);
  Hooks.on("dnd5e.renderChatMessage", _onRenderMessage);
  console.log(`${MODULE_ID} | Ułatwienia w testach i RO (rejestr §3.0.3) registered`);
}

/** `game.neuroshima.ulatwieniaTestow` — podgląd i rejestracja. */
export const ulatwieniaTestowApi = Object.freeze({
  zarejestruj: zarejestrujUlatwienieTestu, wiersze: () => [..._wiersze.keys()], rozstrzygnij: rozstrzygnijRzut
});
