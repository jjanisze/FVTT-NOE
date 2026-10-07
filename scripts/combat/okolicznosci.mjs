/**
 * Neuroshima 5e — okoliczności Testu Ataku: warstwa Foundry (PLAN_m1_walka.md §7.5, E3–E4).
 *
 * Silnik (czysty): `config/okolicznosci-ataku.mjs`. Tutaj:
 *
 *   - **Migawka** ataku z żywych danych: stany atakującego i celu, odległość od krawędzi żetonów,
 *     zasięgi broni, przeciwnicy ≤ 1,5 m (dyspozycja przeciwna, żeton nieukryty — U7), kto kogo
 *     trzyma (lalka), czyja tura.
 *   - **Jeden hak** `dnd5e.preRollAttack`: domyślne Ułatwienie / Utrudnienie przed oknem rzutu (T3 —
 *     gracz i MG zmieniają je przyciskiem okna; oba naraz → zwykły rzut, reguła 5e). Ten hak odpala też
 *     przy `configure: false`, w przeciwieństwie do `postBuildAttackRollConfig` (`actors/armor-rules.mjs`).
 *   - **Rozkład na rzucie** (`roll.options.neuroOkolicznosci`) — z niego jedna grupa plakietek na
 *     karcie ataku z dymkiem i automatyczne TK per cel dla rozstrzygacza (`combat/trafienie.mjs`).
 *   - **Rejestr źródeł** spoza tabeli RAW: `zarejestrujZrodloOkolicznosci(id, fn)` — każdy moduł z
 *     własnym powodem Ułatwienia/Utrudnienia (pancerz bez wyszkolenia, Udźwig, choroby, Współpraca…)
 *     oddaje go tutaj, zamiast wstrzykiwać tryb rzutu po swojemu (F6).
 */

import { rozstrzygnijOkolicznosci, autoKrytyk, OBOK } from "../config/okolicznosci-ataku.mjs";
import { isMeleeAttack } from "./trafienie.mjs";
import { HAND_OCCUPANTS_FLAG } from "../actors/doll.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
/** Klucz rozkładu na `roll.options`. */
export const OKOLICZNOSCI_OPT = "neuroOkolicznosci";

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
/** Liczba albo null — `null`, `undefined` i "" to „nieznane”, nie 0 (`Number(null) === 0`). */
const _num = v => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

/* -------------------------------------------- */
/*  Rejestr źródeł spoza tabeli                  */
/* -------------------------------------------- */

/** @type {Map<string, (ctx: object) => ({rodzaj: string, label: string, strona?: string}[]|null|undefined)>} */
const _zrodla = new Map();

/**
 * Źródło Ułatwienia/Utrudnienia spoza tabeli RAW silnika. `fn(ctx)` dostaje
 * `{ activity, item, actor, attackerToken, targets, wrecz, ability, attackMode }` i zwraca listę
 * `{ rodzaj: "ulatwienie"|"utrudnienie"|"uwaga", label, strona? }` (pustą albo `null`, gdy nic).
 * @param {string} id
 * @param {Function} fn
 */
export function zarejestrujZrodloOkolicznosci(id, fn) {
  _zrodla.set(id, fn);
}

function _zewnetrzne(ctx) {
  const out = [];
  for (const [id, fn] of _zrodla) {
    try {
      for (const w of fn(ctx) ?? []) if (w?.label) out.push({ id, rodzaj: w.rodzaj, label: w.label, strona: w.strona ?? "" });
    } catch (err) {
      console.error(`${MODULE_ID} | źródło okoliczności „${id}” rzuciło wyjątek`, err);
    }
  }
  return out;
}

/* -------------------------------------------- */
/*  Migawka                                      */
/* -------------------------------------------- */

const BEZ_RUCHU = new Set(["grappled", "paralyzed", "restrained", "unconscious"]);

/** Uczestnik ataku dla silnika. */
export function uczestnik(actor, nazwa = null) {
  const stany = new Set(actor?.statuses ?? []);
  const ruch = actor?.system?.attributes?.movement ?? {};
  const predkosci = ["walk", "fly", "swim", "climb", "burrow"].map(k => _num(ruch[k]) ?? 0);
  const szybkosc0 = [...BEZ_RUCHU].some(id => stany.has(id)) || predkosci.every(v => v <= 0);
  return { stany, szybkosc0, nazwa: nazwa ?? actor?.name ?? null };
}

/**
 * Odległość w metrach od krawędzi żetonów — najbliższe pola, które zajmują (jak w podręczniku:
 * „w odległości do 1,5 m” to sąsiednie pole). Bez siatki — od środków minus promienie.
 */
export function odlegloscKrawedzi(a, b) {
  const A = a?.document ?? a;
  const B = b?.document ?? b;
  const grid = canvas?.grid;
  if (!A || !B || !grid) return null;
  if (!grid.isGridless && typeof A.getOccupiedGridSpaceOffsets === "function") {
    const pa = A.getOccupiedGridSpaceOffsets().map(o => grid.getCenterPoint(o));
    const pb = B.getOccupiedGridSpaceOffsets().map(o => grid.getCenterPoint(o));
    let best = Infinity;
    for (const p of pa) for (const q of pb) best = Math.min(best, grid.measurePath([p, q]).distance);
    return Number.isFinite(best) ? best : null;
  }
  const ta = a.object ?? a;
  const tb = b.object ?? b;
  if (!ta?.center || !tb?.center) return null;
  const d = grid.measurePath([ta.center, tb.center]).distance;
  const r = t => (Math.max(t.document?.width ?? 1, t.document?.height ?? 1) * grid.distance) / 2;
  return Math.max(0, d - r(ta) - r(tb) + grid.distance);
}

/** Przeciwnicy: obie dyspozycje niezerowe i różne (wrogie wobec przyjaznych). */
function _wrogowie(a, b) {
  const da = a?.document?.disposition ?? a?.disposition;
  const db = b?.document?.disposition ?? b?.disposition;
  const D = CONST.TOKEN_DISPOSITIONS;
  return [D.FRIENDLY, D.HOSTILE].includes(da) && [D.FRIENDLY, D.HOSTILE].includes(db) && da !== db;
}

/** Żeton atakującego: zaznaczony należący do aktora, inaczej pierwszy aktywny. */
function _zetonAtakujacego(actor) {
  if (!actor) return null;
  const controlled = (canvas?.tokens?.controlled ?? []).find(t => t.actor === actor);
  return controlled ?? actor.token?.object ?? actor.getActiveTokens?.()[0] ?? null;
}

/** Czy `cel` trzyma `atakujacego` (lalka: zajęta ręka `kind: "grapple"`). `null` — nie wiadomo. */
function _celPochwytuje(atakujacy, cel, zetony) {
  const trzyma = actor => (actor?.getFlag?.(MODULE_ID, HAND_OCCUPANTS_FLAG) ?? [])
    .some(o => o?.kind === "grapple" && o.actorUuid === atakujacy?.uuid);
  if (trzyma(cel)) return true;
  if (zetony.some(t => t.actor && t.actor !== cel && trzyma(t.actor))) return false;
  return null;
}

/** Zasięg normalny i daleki aktywności w metrach. */
function _zasieg(activity) {
  const item = activity?.item;
  const r = activity?.range?.override ? activity.range : (item?.system?.range ?? activity?.range ?? {});
  const skala = r?.units === "ft" ? 0.3 : 1;
  const v = _num(r?.value);
  const l = _num(r?.long);
  return { normalny: v !== null && v > 0 ? v * skala : null, daleki: l !== null && l > 0 ? l * skala : null };
}

/**
 * Migawka ataku z żywych danych.
 * @param {Activity} activity
 * @param {{attackMode?: string}} [opts]
 * @returns {{migawka: object, ctx: object}}
 */
export function migawkaAtaku(activity, { attackMode } = {}) {
  const actor = activity?.actor ?? null;
  const item = activity?.item ?? null;
  const attackerToken = _zetonAtakujacego(actor);
  const targets = [...(game.user.targets ?? [])];
  const wrecz = isMeleeAttack(activity, attackMode);
  const zetony = canvas?.tokens?.placeables ?? [];
  const jeden = targets.length === 1 ? targets[0] : null;

  const wrogowieObok = attackerToken ? zetony
    .filter(t => t !== attackerToken && t.actor && !t.document.hidden && _wrogowie(attackerToken, t))
    .filter(t => (odlegloscKrawedzi(attackerToken, t) ?? Infinity) <= OBOK)
    .map(t => uczestnik(t.actor, t.name)) : [];

  const migawka = {
    atakujacy: uczestnik(actor),
    cel: jeden?.actor ? uczestnik(jeden.actor, jeden.name) : null,
    liczbaCelow: targets.length,
    wrecz,
    odleglosc: jeden && attackerToken ? odlegloscKrawedzi(attackerToken, jeden) : null,
    zasieg: _zasieg(activity),
    wrogowieObok,
    celPochwytuje: jeden?.actor && actor?.statuses?.has("grappled") ? _celPochwytuje(actor, jeden.actor, zetony) : null,
    turaCelu: !!(jeden && game.combat?.started && game.combat.combatant?.tokenId === jeden.id)
  };
  const ctx = {
    activity, item, actor, attackerToken, targets, wrecz, attackMode,
    ability: activity?.ability ?? item?.system?.ability ?? null
  };
  migawka.zewnetrzne = _zewnetrzne(ctx);
  return { migawka, ctx };
}

/* -------------------------------------------- */
/*  Hak rzutu                                    */
/* -------------------------------------------- */

function _onPreRollAttack(config) {
  const activity = config?.subject;
  if (!activity?.actor) return;
  let wynik;
  let ctx;
  try {
    const m = migawkaAtaku(activity, { attackMode: config.attackMode });
    ctx = m.ctx;
    wynik = rozstrzygnijOkolicznosci(m.migawka);
  } catch (err) {
    console.error(`${MODULE_ID} | okoliczności ataku`, err);
    return;
  }
  if (wynik.ulatwienia.length) config.advantage = true;
  if (wynik.utrudnienia.length) config.disadvantage = true;

  // Automatyczne TK per cel — rozstrzygacz czyta to przy stemplu karty (pozycje z chwili rzutu).
  const cele = ctx.targets.map(t => ({
    tokenUuid: t.document.uuid,
    autoKrytyk: ctx.attackerToken && t.actor
      ? (autoKrytyk(uczestnik(t.actor), odlegloscKrawedzi(ctx.attackerToken, t))?.label ?? null) : null
  }));
  const zapis = {
    ulatwienia: wynik.ulatwienia.map(_plain), utrudnienia: wynik.utrudnienia.map(_plain),
    uwagi: wynik.uwagi.map(_plain), tryb: wynik.tryb, cele
  };
  if (!zapis.ulatwienia.length && !zapis.utrudnienia.length && !zapis.uwagi.length && !cele.some(c => c.autoKrytyk)) return;
  for (const roll of config.rolls ?? []) {
    roll.options ??= {};
    roll.options[OKOLICZNOSCI_OPT] = zapis;
  }
}

const _plain = w => ({ id: w.id, label: w.label, strona: w.strona ?? "" });

/**
 * Automatyczne TK wobec celu z rozkładu na rzucie — `combat/trafienie.mjs` stempluje je we wpisie celu.
 * @param {Roll} roll
 * @param {string} tokenUuid
 * @returns {string|null} powód albo null
 */
export function autoKrytykZRzutu(roll, tokenUuid) {
  return roll?.options?.[OKOLICZNOSCI_OPT]?.cele?.find(c => c.tokenUuid === tokenUuid)?.autoKrytyk ?? null;
}

/* -------------------------------------------- */
/*  Plakietki na karcie ataku                    */
/* -------------------------------------------- */

const TRYB_LABEL = { 1: "Ułatwienie", 0: "Ułatwienie i Utrudnienie — znoszą się", [-1]: "Utrudnienie" };

function _onRenderChatMessage(message, html) {
  if (message.getFlag("dnd5e", "roll")?.type !== "attack") return;
  const z = message.rolls?.[0]?.options?.[OKOLICZNOSCI_OPT];
  if (!z || html.querySelector(".neuro-okolicznosci")) return;
  let pills = html.querySelector("ul.card-footer.pills");
  if (!pills) {
    pills = document.createElement("ul");
    pills.className = "card-footer pills unlist";
    (html.querySelector(".chat-card") ?? html).appendChild(pills);
  }
  const linia = w => `${esc(w.label)}${w.strona ? ` <span class="neuro-okolicznosci-strona">(${esc(w.strona)})</span>` : ""}`;
  if (z.ulatwienia.length || z.utrudnienia.length) {
    const dymek = [
      z.ulatwienia.length ? `<strong>Ułatwienie:</strong> ${z.ulatwienia.map(linia).join(" · ")}` : "",
      z.utrudnienia.length ? `<strong>Utrudnienie:</strong> ${z.utrudnienia.map(linia).join(" · ")}` : "",
      z.ulatwienia.length && z.utrudnienia.length ? "<em>Znoszą się — zwykły rzut (reguła 5e).</em>" : "",
      "<em>Domyślne w oknie rzutu — gracz i MG mogą je zmienić.</em>"
    ].filter(Boolean).join("<br>");
    const pill = document.createElement("li");
    pill.className = `pill neuro-okolicznosci${z.tryb < 0 ? " maroon" : ""}`;
    pill.dataset.tooltip = dymek;
    pill.dataset.tryb = String(z.tryb);
    const ile = z.ulatwienia.length + z.utrudnienia.length;
    pill.innerHTML = `<i class="fa-solid fa-scale-balanced" inert></i> <span class="label">${esc(TRYB_LABEL[z.tryb] ?? "")}`
      + `${ile > 1 ? ` (${ile})` : `: ${esc((z.ulatwienia[0] ?? z.utrudnienia[0])?.label ?? "")}`}</span>`;
    pills.appendChild(pill);
  }
  for (const u of z.uwagi) {
    const pill = document.createElement("li");
    pill.className = "pill maroon neuro-okolicznosci neuro-okolicznosci-uwaga";
    pill.dataset.okolicznosc = u.id;
    pill.innerHTML = `<i class="fa-solid fa-triangle-exclamation" inert></i> <span class="label">${linia(u)}</span>`;
    pills.appendChild(pill);
  }
  for (const c of z.cele.filter(x => x.autoKrytyk)) {
    const pill = document.createElement("li");
    pill.className = "pill neuro-okolicznosci neuro-okolicznosci-autokrytyk";
    pill.innerHTML = `<i class="fa-solid fa-crosshairs" inert></i> <span class="label">${esc(c.autoKrytyk)}</span>`;
    pills.appendChild(pill);
  }
}

export function registerOkolicznosci() {
  Hooks.on("dnd5e.preRollAttack", _onPreRollAttack);
  Hooks.on("dnd5e.renderChatMessage", _onRenderChatMessage);
  console.log(`${MODULE_ID} | Okoliczności ataku registered`);
}

/** `game.neuroshima.okolicznosci` — podgląd: `migawka(activity)`, `rozstrzygnij(activity)`. */
export const okolicznosciApi = Object.freeze({
  migawka: activity => migawkaAtaku(activity).migawka,
  rozstrzygnij: activity => rozstrzygnijOkolicznosci(migawkaAtaku(activity).migawka),
  zarejestruj: zarejestrujZrodloOkolicznosci
});
