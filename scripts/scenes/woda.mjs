/**
 * Neuroshima 5e — woda (NOE s. 255–256; PLAN_m6_drobne_zasady.md §5.6, E6, U14, U15).
 *
 * Koszt ruchu w wodzie liczy dnd5e (RAW = stock). Ten plik dokłada resztę, zasady — `config/woda-rules.mjs`:
 *
 *   - **Region `neuroshima-2026-overrides.woda`** (głębokość, nurt, grząska) — stawia go eksporter map (klasa `water`)
 *     albo MG. **Tylko w walce** (U15, MG: „poza walką nie liczymy wody — mistrz musi sam kazać”):
 *       - wejście w głęboką wodę — szept do MG „wejście w sprzęcie” z [Wymagaj testu] (RAW: „MG może wymagać”);
 *       - początek tury w głębokiej wodzie bez Szybkości pływania — karta testu SIŁ (Atletyka) ze ST nurtu dla
 *         właściciela; zdarzenie przychodzi tylko u aktywnego MG (E0f), raz na turę (`combat/tiki.mjs`);
 *       - wyjście z wody — schodzą Tonie i Pod wodą.
 *   - **Karta testu** — rzut właściciela (albo MG): porażka — Tonie (Szybkość 0, `noMovement`) i Pod wodą; sukces —
 *     Tonie schodzi, a Pod wodą, jeśli wciągnęło go tonięcie. Pancerz z Utrudnieniem do Skradania się/Pływania
 *     (`stealthDisadvantage`) — Utrudnienie (s. 53). Fuks zamieniający porażkę w sukces cofa skutek.
 *   - **Pod wodą** — wstrzymanie oddechu z `actors/zagrozenia.mjs` (1 + mod. KON minut, obrażenia — RO KON ST 10),
 *     wynurzenie — oddech wraca (tylko Uduszenie zaczęte przez wodę). Maszyny nie oddychają.
 *   - **HUD MG** żetonu w wodzie — „Test pływania” (karta ze ST nurtu): poza walką i poza kolejką.
 *   - **Walka**: połowa obrażeń (pocisk spod wody, miotana i rzucana w zanurzony cel — `dnd5e.preCalculateDamage`),
 *     Osłona ½ domyślnie dla celu w płytkiej wodzie (`combat/cover.mjs`); Utrudnienia — silnik okoliczności,
 *     zacięcie ≤ 5 — `weapons/jams.mjs`.
 */

import {
  POD_WODA, TONIE, NURTY, GLEBOKOSCI, ST_WEJSCIA, stNurtu, testNaPoczatkuTury, poTescie, polowaObrazen
} from "../config/woda-rules.mjs";
import { jestPalna, jestMiotana } from "../config/okolicznosci-ataku.mjs";
import { activityRefOf } from "../config/chat-message-data.mjs";
import { zarejestrujDomyslnaOslone } from "../combat/cover.mjs";
import { tikRaz } from "../combat/tiki.mjs";
import { wstrzymajOddech, zlapOddech, efektUduszenia } from "../actors/zagrozenia.mjs";
import { jestMaszyna } from "../actors/towarzysze.mjs";
import { szybkoscPrzedStanami } from "../actors/latanie.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
export const TYP_WODA = `${MODULE_ID}.woda`;
/** Karta wody: `{rodzaj: "wejscie"|"test", tokenUuid, st}`. */
const KARTA = "wodaKarta";
/** Rzut testu pływania (Fuks): `{actorUuid, st}`. */
const RZUT = "wodaRzut";
/** Flaga efektu: Pod wodą z tonięcia / Uduszenie zaczęte przez wodę. */
const Z_WODY = "zWody";

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const _mg = () => game.users.filter(u => u.isGM).map(u => u.id);
const _wlasciciele = actor => game.users.filter(u => !u.isGM && actor?.testUserPermission?.(u, "OWNER")).map(u => u.id);

/** Jeden zapisujący dla skutków statusów: aktywny MG, bez niego — właściciel. */
function _jedynyZapisujacy(actor) {
  const gm = game.users.activeGM;
  return gm ? gm.isSelf : Boolean(actor?.isOwner);
}

/* -------------------------------------------- */
/*  Gdzie jest woda                              */
/* -------------------------------------------- */

/**
 * Woda pod żetonem: zachowanie `woda` Regionu, który zawiera jego środek (głęboka wygrywa z płytką), albo null.
 * @param {TokenDocument} token
 * @param {object} [pozycja]  x, y, elevation (domyślnie bieżące)
 */
export function wodaZetonu(token, pozycja = token?._source) {
  const scene = token?.parent;
  if (!scene || !pozycja) return null;
  const p = { ...token.getCenterPoint(pozycja), elevation: pozycja.elevation ?? token.elevation };
  let woda = null;
  for (const r of scene.regions) {
    for (const b of r.behaviors) {
      if (b.type !== TYP_WODA || b.disabled || !r.testPoint(p)) continue;
      if (!woda || b.system.glebokosc === "gleboka") woda = b.system;
    }
  }
  return woda;
}

const _wWalce = token => !!game.combat?.started && game.combat.combatants.some(c => c.tokenId === token?.id);
const _plywa = actor => szybkoscPrzedStanami(actor, "swim") > 0;

/** Pancerz z Utrudnieniem w kolumnie „Skradanie się/Pływanie” — Utrudnienie do Atletyki przy pływaniu (s. 53). */
function _pancerzUtrudnia(actor) {
  return !!actor?.items?.some(i => i.type === "equipment" && i.system?.equipped && i.system.properties?.has?.("stealthDisadvantage"));
}

/* -------------------------------------------- */
/*  Region                                       */
/* -------------------------------------------- */

function utworzKlase() {
  const { RegionBehaviorType } = foundry.data.regionBehaviors;
  const f = foundry.data.fields;

  return class Woda extends RegionBehaviorType {
    static defineSchema() {
      return {
        glebokosc: new f.StringField({ required: true, initial: "gleboka", label: "Głębokość",
          choices: Object.fromEntries(Object.entries(GLEBOKOSCI).map(([k, v]) => [k, v.label])),
          hint: "Płytka: brodzenie, Osłona ½ dla stojących. Głęboka: pływanie i testy w walce (s. 255)." }),
        nurt: new f.StringField({ required: true, initial: "spokojna", label: "Nurt",
          choices: Object.fromEntries(Object.entries(NURTY).map(([k, v]) => [k, `${v.label} (ST ${v.st})`])) }),
        grzaska: new f.BooleanField({ label: "Grząska (błoto)",
          hint: "Pływanie w czymś grząskim kosztuje 3 m za 1,5 m (s. 255) — dodaj na tym Regionie trudny teren dnd5e." })
      };
    }

    static events = {
      [CONST.REGION_EVENTS.TOKEN_MOVE_IN]: this.#onMoveIn,
      [CONST.REGION_EVENTS.TOKEN_MOVE_OUT]: this.#onMoveOut,
      [CONST.REGION_EVENTS.TOKEN_TURN_START]: this.#onTurnStart
    };

    static async #onMoveIn(event) {
      const { token } = event.data;
      if (!event.user.isSelf || this.glebokosc !== "gleboka" || !_wWalce(token)) return;
      await kartaWejscia(token);
    }

    static async #onMoveOut(event) {
      const { token, movement } = event.data;
      if (!event.user.isSelf || !token.actor) return;
      if (wodaZetonu(token, movement?.destination ?? token._source)) return;   // dalej w innej wodzie
      await wynurz(token.actor);
    }

    static async #onTurnStart(event) {
      const { token } = event.data;
      const actor = token?.actor;
      const combat = game.combat;
      if (!game.users.activeGM?.isSelf || !actor || !combat) return;
      if (!testNaPoczatkuTury({ glebokosc: this.glebokosc, walka: _wWalce(token), plywa: _plywa(actor) })) return;
      if (!await tikRaz(actor, "woda", combat, { round: combat.round, combatantId: combat.combatant?.id, krawedz: "start" })) return;
      await kartaTestu(token, { st: stNurtu(this.nurt), nurt: this.nurt, powod: "tura" });
    }
  };
}

/* -------------------------------------------- */
/*  Karty i rzut                                 */
/* -------------------------------------------- */

/** MG: wejście w głęboką wodę w sprzęcie — test tylko na żądanie (s. 255). */
export async function kartaWejscia(token) {
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ token }),
    whisper: _mg(),
    content: `<div class="neuro-woda-karta"><p><i class="fa-solid fa-water" inert></i> <strong>${esc(token.name)}</strong>
      wchodzi do głębokiej wody w ubraniu i ze sprzętem.</p>
      <p class="hint">MG może wymagać Testu Siły (Atletyka) ST ${ST_WEJSCIA}; porażka — Szybkość 0, opada (s. 255).</p>
      <div class="card-buttons"><button type="button" data-neuro-woda="zadaj"><i class="fa-solid fa-person-swimming" inert></i>
        Wymagaj testu (ST ${ST_WEJSCIA})</button></div></div>`,
    flags: { [MODULE_ID]: { [KARTA]: { rodzaj: "wejscie", tokenUuid: token.uuid, st: ST_WEJSCIA } } }
  });
}

const POWODY = Object.freeze({
  tura: "początek tury w głębokiej wodzie bez Szybkości pływania",
  wejscie: "wejście do wody w ubraniu i ze sprzętem",
  mg: "test pływania"
});

/**
 * Karta testu pływania dla właściciela (i MG).
 * @param {TokenDocument} token
 * @param {{st: number, nurt?: string|null, powod?: "tura"|"wejscie"|"mg"}} opts
 */
export async function kartaTestu(token, { st, nurt = null, powod = "mg" }) {
  const actor = token?.actor;
  if (!actor) return null;
  const nurtLabel = nurt ? NURTY[nurt]?.label : null;
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ token }),
    whisper: [...new Set([..._mg(), ..._wlasciciele(actor)])],
    content: `<div class="neuro-woda-karta"><p><i class="fa-solid fa-person-swimming" inert></i> <strong>${esc(token.name)}</strong>
      — ${POWODY[powod] ?? POWODY.mg}${nurtLabel ? ` (${esc(nurtLabel)})` : ""}.</p>
      <p>Test Siły (Atletyka) ST ${st}. Porażka: Szybkość 0, opada na dno i wstrzymuje oddech; sukces — utrzymuje się
        na powierzchni albo wypływa (s. 255).</p>
      ${_pancerzUtrudnia(actor) ? `<p class="hint">Pancerz: Utrudnienie do pływania (s. 53).</p>` : ""}
      <div class="card-buttons"><button type="button" data-neuro-woda="rzut"><i class="fa-solid fa-dice-d20" inert></i>
        SIŁ (Atletyka) ST ${st}</button></div></div>`,
    flags: { [MODULE_ID]: { [KARTA]: { rodzaj: "test", tokenUuid: token.uuid, st } } }
  });
}

/**
 * Test pływania (s. 255) i jego skutek na statusach.
 * @param {Actor} actor
 * @param {number} st
 * @returns {Promise<{sukces: boolean, total: number}|null>}
 */
export async function rzutPlywania(actor, st) {
  const rolls = await actor.rollSkill(
    { skill: "atl", target: st, disadvantage: _pancerzUtrudnia(actor) }, {},
    { data: { flavor: `Pływanie — Test Siły (Atletyka) ST ${st}`, flags: { [MODULE_ID]: { [RZUT]: { actorUuid: actor.uuid, st } } } } }
  );
  const roll = Array.isArray(rolls) ? rolls[0] : rolls;
  if (!roll) return null;
  const sukces = roll.total >= st;
  await zastosujTest(actor, sukces);
  return { sukces, total: roll.total };
}

/** Skutek testu pływania na statusach (`poTescie`). */
export async function zastosujTest(actor, sukces) {
  const po = poTescie(sukces);
  await actor.toggleStatusEffect(TONIE, { active: po.tonie });
  if (po.zanurza && !actor.statuses.has(POD_WODA)) {
    await actor.toggleStatusEffect(POD_WODA, { active: true });
    await _efekt(actor, POD_WODA)?.setFlag(MODULE_ID, Z_WODY, true);
  } else if (po.wynurza && _efekt(actor, POD_WODA)?.getFlag(MODULE_ID, Z_WODY)) {
    await actor.toggleStatusEffect(POD_WODA, { active: false });
  }
}

/** Poza wodą: schodzą Tonie i Pod wodą. */
export async function wynurz(actor) {
  if (actor?.statuses.has(TONIE)) await actor.toggleStatusEffect(TONIE, { active: false });
  if (actor?.statuses.has(POD_WODA)) await actor.toggleStatusEffect(POD_WODA, { active: false });
}

const _efekt = (actor, status) => actor?.effects?.find(e => e.statuses?.has(status)) ?? null;

function _onRenderKarty(message, html) {
  const k = message.getFlag(MODULE_ID, KARTA);
  if (!k) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  const token = fromUuidSync(k.tokenUuid);
  for (const btn of root?.querySelectorAll("[data-neuro-woda]") ?? []) {
    const gm = btn.dataset.neuroWoda === "zadaj";
    if (!token?.actor || (gm ? !game.user.isGM : !token.actor.isOwner)) { btn.disabled = true; continue; }
    btn.addEventListener("click", async ev => {
      ev.preventDefault();
      btn.disabled = true;
      try {
        if (gm) await kartaTestu(token, { st: k.st, powod: "wejscie" });
        else await rzutPlywania(token.actor, k.st);
      } finally { if (btn.isConnected) btn.disabled = false; }
    });
  }
}

/** Fuks zamienił porażkę testu pływania w sukces: cofnij skutek. */
async function _onRerolled({ message, roll } = {}) {
  const r = message?.getFlag?.(MODULE_ID, RZUT);
  if (!r || !roll) return;
  const actor = fromUuidSync(r.actorUuid);
  if (!actor?.isOwner) return;
  const przed = message.rolls?.[0]?.total ?? 0;
  if (przed >= r.st || !(roll.total >= r.st)) return;
  await zastosujTest(actor, true);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<strong>${esc(actor.name)}</strong> — przerzut zmienia wynik: utrzymuje się na wodzie.`
  });
}

/* -------------------------------------------- */
/*  Pod wodą → oddech                            */
/* -------------------------------------------- */

async function _onCreateEffect(effect) {
  const actor = effect.parent;
  if (!effect.statuses?.has(POD_WODA) || !(actor instanceof Actor) || !_jedynyZapisujacy(actor)) return;
  if (jestMaszyna(actor) || efektUduszenia(actor)) return;
  await wstrzymajOddech(actor);
  await efektUduszenia(actor)?.setFlag(MODULE_ID, Z_WODY, true);
}

async function _onDeleteEffect(effect) {
  const actor = effect.parent;
  if (!effect.statuses?.has(POD_WODA) || !(actor instanceof Actor) || !_jedynyZapisujacy(actor)) return;
  if (efektUduszenia(actor)?.getFlag(MODULE_ID, Z_WODY)) await zlapOddech(actor);
}

/* -------------------------------------------- */
/*  Walka                                        */
/* -------------------------------------------- */

/** Połowa obrażeń (s. 255–256): pocisk spod wody; miotana i rzucana w zanurzony cel. */
function _onPreCalculateDamage(actor, damages, options) {
  const ref = activityRefOf(options?.origin ?? options?.originatingMessage);
  if (!ref?.uuid) return;
  let activity = null;
  try { activity = fromUuidSync(ref.uuid); } catch { return; }
  const item = activity?.item;
  if (item?.type !== "weapon") return;
  const bron = {
    typ: item.system.type?.value ?? null,
    rzut: String(item.getFlag("dnd5e", `last.${activity.id}.attackMode`) ?? "").startsWith("thrown")
  };
  const polowa = polowaObrazen({
    palna: jestPalna(bron), miotana: jestMiotana(bron) && !jestPalna(bron),
    atakujacyPodWoda: !!activity.actor?.statuses?.has(POD_WODA), celPodWoda: !!actor?.statuses?.has(POD_WODA)
  });
  if (polowa) options.multiplier = (options.multiplier ?? 1) * 0.5;
}

/** Cel stoi w płytkiej wodzie — domyślnie Osłona ½ (s. 255–256). Zanurzonemu i Powalonemu — nie (inne wiersze). */
function _oslonaWPlytkiej(target) {
  const doc = target?.document ?? target;
  const actor = doc?.actor;
  if (!actor || actor.statuses.has(POD_WODA) || actor.statuses.has("prone")) return null;
  return wodaZetonu(doc)?.glebokosc === "plytka" ? "half" : null;
}

/* -------------------------------------------- */
/*  HUD                                          */
/* -------------------------------------------- */

function _onRenderTokenHUD(hud, html) {
  if (!game.user.isGM) return;
  const doc = hud.document ?? hud.object?.document;
  const woda = doc ? wodaZetonu(doc) : null;
  if (!woda) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  const kol = root?.querySelector(".col.left");
  if (!kol || kol.querySelector(".neuro-woda-hud")) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "control-icon neuro-woda-hud";
  btn.dataset.tooltip = `Test pływania — SIŁ (Atletyka) ST ${stNurtu(woda.nurt)} (${NURTY[woda.nurt]?.label ?? ""})`;
  btn.innerHTML = `<i class="fa-solid fa-person-swimming" inert></i>`;
  btn.addEventListener("click", async ev => {
    ev.preventDefault(); ev.stopPropagation();
    const docs = canvas.tokens.controlled.map(t => t.document).filter(d => wodaZetonu(d));
    for (const d of docs.length ? docs : [doc]) {
      const w = wodaZetonu(d);
      await kartaTestu(d, { st: stNurtu(w?.nurt), nurt: w?.nurt, powod: "mg" });
    }
  });
  kol.append(btn);
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

export function registerWoda() {
  CONFIG.RegionBehavior.dataModels[TYP_WODA] = utworzKlase();
  CONFIG.RegionBehavior.typeIcons[TYP_WODA] = "fa-solid fa-water";
  zarejestrujDomyslnaOslone(_oslonaWPlytkiej);
  Hooks.on("renderChatMessageHTML", _onRenderKarty);
  Hooks.on("neuroshima.rerolled", _onRerolled);
  Hooks.on("createActiveEffect", _onCreateEffect);
  Hooks.on("deleteActiveEffect", _onDeleteEffect);
  Hooks.on("dnd5e.preCalculateDamage", _onPreCalculateDamage);
  Hooks.on("renderTokenHUD", _onRenderTokenHUD);
}

/** `game.neuroshima.woda` */
export const wodaApi = Object.freeze({ wodaZetonu, kartaTestu, kartaWejscia, rzutPlywania, zastosujTest, wynurz });
