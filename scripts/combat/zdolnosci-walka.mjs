/**
 * Neuroshima 5e — premie sytuacyjne do ataku i obrażeń (PLAN_m7 E4, rodzina R4).
 *
 * Ułatwienia — źródła silnika okoliczności (`combat/okolicznosci.mjs`, powód w dymku na karcie, domyślne i
 * nadpisywalne w oknie rzutu); premie liczbowe — części rzutu w `dnd5e.preRollAttack` / `preRollDamage` (wzorzec
 * Samuraja), bo zależą od celu, lalki albo dziennika ataków, których reguły dnd5e nie widzą.
 *
 * | Zdolność | Działanie | Gdzie |
 * |---|---|---|
 * | Mój wróg (Zwiadowca 1, s. 96) | + kolumna tabeli do ataku i obrażeń przeciw kategorii celu | atak, obrażenia |
 * | Rzeźnik (Wyjadacz, s. 86/98) | +3 do obrażeń, gdy druga ręka nie trzyma innej broni (U9) | obrażenia |
 * | Zabójcza spluwa (Clint, s. 88) | rewolwer: + jedna kość obrażeń | obrażenia |
 * | Dwóch na jednego (Ganger, s. 69) | +2 do ataku wręcz w cel zaatakowany wręcz przez sojusznika od końca twojej poprzedniej tury (D13) | atak |
 * | Zawołajcie kolegów (Gladiator, s. 70) | ≥ 2 przeciwników ≤ 1,5 m → Ułatwienie wręcz | okoliczność |
 * | Ja i mój gang! (Ganger, s. 69) | sojusznik ≤ 3 m od Brutala w Berserku → Ułatwienie przeciw wrogom, których Brutal widzi | okoliczność |
 * | Zasadzka (Wyjadacz Zwiadowcy, s. 98) | cel Zaskoczony albo 1. runda i działasz przed nim | okoliczność |
 * | Jeden strzał (Zabójca, s. 94) | Pierwszy atak: 1. runda, przed turą celu, pierwszy Test Ataku na niego; Celowanie [B] — `combat/zdolnosci-akcje.mjs` | okoliczność |
 * | Mutant na śniadanie (Łowca mutantów, s. 98) | Zabójca mutantów — raz w rundzie; Refleks łowcy — +PB do Inicjatywy (U19) | okoliczność, Inicjatywa |
 * | Słaby punkt (Zabójca maszyn, s. 101) | po udanym teście — raz w rundzie Ułatwienie przeciw tej maszynie (U18) | okoliczność |
 * | Maszyna do zabijania — Zwód (Najemnik, s. 70) | w Berserku raz w rundzie Ułatwienie w ataku wręcz z SIŁ | okoliczność |
 * | Strzelec (Zabójca, s. 94) | status „Stanowisko snajperskie” (U20) → zasięg ×3, bez Utrudnienia za daleki dystans | silnik, ruch zdejmuje |
 *
 * **Raz w rundzie** (Zabójca mutantów, Słaby punkt, Zwód) i **Celowanie** (jeden atak) — limit zużywa się dopiero po
 * rzucie, który naprawdę poszedł z Ułatwieniem, i tylko gdy Ułatwienie dały wyłącznie takie źródła (zużywa się
 * pierwsze z nich): stałe Ułatwienie (Powalony cel, Zawołajcie kolegów…) oszczędza limit, a Ułatwienie zniesione
 * Utrudnieniem go nie zużywa.
 */

import { zarejestrujZrodloOkolicznosci, odlegloscKrawedzi, OKOLICZNOSCI_OPT, STANOWISKO_SNAJPERSKIE } from "./okolicznosci.mjs";
import { isMeleeAttack, obronaOf } from "./trafienie.mjs";
import { isFirearm } from "./grip.mjs";
import { bramkaZajetaNa, zajmijBramke, kombatantWlasciciela } from "./czas-efektu.mjs";
import { przedmiotZdolnosci, kategoria, zeton, sojusznicy, esc } from "./zdolnosci-wspolne.mjs";
import { heldItems } from "../actors/doll.mjs";
import { isRevolver } from "../actors/rewolwerowiec.mjs";
import { rollTypeOf } from "../config/chat-message-data.mjs";
import { cardPillList } from "../config/chat-card-dom.mjs";
import {
  MOJ_WROG_KATEGORIE, MOJ_WROG_DOMYSLNIE, premiaMojegoWroga, ZAWOLAJCIE_ILU, ZASIEG_GANGU, DWOCH_NA_JEDNEGO, RZEZNIK,
  MIOTACZ, wOknieOdPoprzedniejTury, przedCelemWPierwszejRundzie, rzeznikDziala, koscZabojczejSpluwy
} from "../config/zdolnosci-walka.mjs";
import { jestRzucana } from "../config/okolicznosci-ataku.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
/** Premie liczbowe na `roll.options` — plakietka na karcie ataku. */
export const PREMIE_OPT = "neuroPremie";
/** Efekt Celowania (Jeden strzał [B]) — zakłada `combat/zdolnosci-akcje.mjs`, zdejmuje pierwszy atak z Ułatwieniem. */
export const FLAG_CELOWANIE = "celowanie";
/** Efekt Słabego punktu na maszynie: uuid aktora, który go znalazł. */
export const FLAG_SLABY_PUNKT = "slabyPunkt";
/** Ile ostatnich kart przegląda dziennik ataków. */
const DZIENNIK = 200;

const _ma = (actor, abilityId) => !!przedmiotZdolnosci(actor, { abilityId });

/* -------------------------------------------- */
/*  Wspólne                                      */
/* -------------------------------------------- */

/** Przeciwnicy: obie dyspozycje niezerowe i różne (jak w silniku okoliczności). */
function _przeciwnicy(a, b) {
  const da = (a?.document ?? a)?.disposition, db = (b?.document ?? b)?.disposition;
  const D = CONST.TOKEN_DISPOSITIONS;
  return [D.FRIENDLY, D.HOSTILE].includes(da) && [D.FRIENDLY, D.HOSTILE].includes(db) && da !== db;
}

const _zyje = t => !t.actor?.statuses?.has("dead") && (Number(t.actor?.system?.attributes?.hp?.value) || 0) > 0;

/** Jedyny cel ataku albo `null`. */
const _cel = ctx => (ctx.targets?.length === 1 ? ctx.targets[0] : null);

/** Brutal widzi cel: bez Oślepienia, cel nie Niewidoczny, bez ściany blokującej wzrok. */
function _widzi(a, b) {
  if (a.actor?.statuses?.has("blinded") || b.actor?.statuses?.has("invisible")) return false;
  try {
    const level = a.document?.parent?.levels?.get?.(a.document._source?.level) ?? canvas.level;
    return !CONFIG.Canvas.polygonBackends.sight.testCollision(a.center, b.center, { type: "sight", mode: "any", level });
  } catch {
    return true;
  }
}

/** Indeks tury kombatanta aktora / żetonu w dzisiejszej kolejności; −1 — poza walką. */
function _indeks(combat, { actor = null, token = null }) {
  if (!combat?.started) return -1;
  if (actor) {
    const c = kombatantWlasciciela(actor, combat);
    return c ? combat.turns.indexOf(c) : -1;
  }
  return combat.turns.findIndex(c => c.tokenId === token?.id && c.sceneId === (token?.document?.parent?.id ?? c.sceneId));
}

const _teraz = combat => (combat?.started ? { round: combat.round, turn: combat.turn } : null);

/**
 * Dziennik ataków tej walki — karty z `obrona.chwila` (`combat/trafienie.mjs`), od najnowszej.
 * @param {Combat} combat
 * @returns {Generator<{obrona: object, message: ChatMessage}>}
 */
function* _atakiWalki(combat) {
  const lista = game.messages.contents;
  for (let i = lista.length - 1, n = 0; i >= 0 && n < DZIENNIK; i--, n++) {
    const obrona = obronaOf(lista[i]);
    if (obrona?.chwila?.combatId === combat.id) yield { obrona, message: lista[i] };
  }
}

/** Indeks tury z chwili ataku przeliczony na dzisiejszą kolejność. */
function _chwilaDzis(combat, chwila) {
  const i = chwila.combatantId ? combat.turns.findIndex(c => c.id === chwila.combatantId) : -1;
  return { round: chwila.round, turn: i >= 0 ? i : chwila.turn };
}

/* -------------------------------------------- */
/*  Ułatwienia — źródła silnika okoliczności     */
/* -------------------------------------------- */

function _zawolajcieKolegow(ctx) {
  if (!ctx.wrecz || !ctx.attackerToken || !_ma(ctx.actor, "zawolajcie-kolegow")) return null;
  const n = (canvas?.tokens?.placeables ?? []).filter(t => t !== ctx.attackerToken && t.actor && !t.document.hidden
    && _zyje(t) && _przeciwnicy(ctx.attackerToken, t) && (odlegloscKrawedzi(ctx.attackerToken, t) ?? Infinity) <= 1.5).length;
  return n >= ZAWOLAJCIE_ILU ? [{ rodzaj: "ulatwienie", label: `Zawołajcie kolegów (${n} przeciwników obok)` }] : null;
}

function _jaIMojGang(ctx) {
  const cel = _cel(ctx);
  if (!cel || !ctx.attackerToken) return null;
  for (const g of canvas?.tokens?.placeables ?? []) {
    if (g === ctx.attackerToken || !g.actor?.statuses?.has("berserk") || !_ma(g.actor, "ja-i-moj-gang")) continue;
    if (!sojusznicy(g, ctx.attackerToken) || (odlegloscKrawedzi(g, ctx.attackerToken) ?? Infinity) > ZASIEG_GANGU) continue;
    if (!_przeciwnicy(g, cel) || !_widzi(g, cel)) continue;
    return [{ rodzaj: "ulatwienie", label: `Ja i mój gang! (${g.name} w Berserku)` }];
  }
  return null;
}

/** 1. runda, atakujący przed celem w kolejności. */
function _przedCelem(actor, cel) {
  const combat = game.combat;
  return przedCelemWPierwszejRundzie(_teraz(combat), _indeks(combat, { actor }), _indeks(combat, { token: cel }));
}

function _zasadzka(ctx) {
  const cel = _cel(ctx);
  if (!cel || !_ma(ctx.actor, "zasadzka")) return null;
  if (cel.actor?.statuses?.has("surprised")) return [{ rodzaj: "ulatwienie", label: "Zasadzka — cel Zaskoczony" }];
  // „do końca swojej tury” — w twojej turze.
  const c = game.combat;
  if (c?.combatant && c.combatant !== kombatantWlasciciela(ctx.actor, c)) return null;
  return _przedCelem(ctx.actor, cel) ? [{ rodzaj: "ulatwienie", label: "Zasadzka — 1. runda, działasz przed celem" }] : null;
}

/** Jeden strzał: broń finezyjna albo ogień pojedynczy (aktywność bez trybu serii, `weapons/fire-modes.mjs`). */
export function bronJednegoStrzalu(activity) {
  const item = activity?.item;
  if (item?.type !== "weapon") return false;
  if (item.system?.properties?.has?.("fin")) return true;
  return isFirearm(item) && !activity.flags?.[MODULE_ID]?.fireMode;
}

function _pierwszyAtak(ctx) {
  const cel = _cel(ctx);
  if (!cel || !_ma(ctx.actor, "jeden-strzal") || !bronJednegoStrzalu(ctx.activity) || !_przedCelem(ctx.actor, cel)) return null;
  const uuid = cel.document.uuid;
  for (const { obrona } of _atakiWalki(game.combat)) {
    if (obrona.attackerUuid === ctx.actor.uuid && obrona.targets?.some(t => t.tokenUuid === uuid)) return null;
  }
  return [{ rodzaj: "ulatwienie", label: "Jeden strzał — pierwszy atak przed turą celu" }];
}

function _celowanie(ctx) {
  if (!_ma(ctx.actor, "jeden-strzal") || !bronJednegoStrzalu(ctx.activity)) return null;
  if (!ctx.actor.effects.some(e => e.getFlag(MODULE_ID, FLAG_CELOWANIE) && !e.disabled)) return null;
  return [{ rodzaj: "ulatwienie", label: "Celowanie (Jeden strzał)" }];
}

function _zabojcaMutantow(ctx) {
  const cel = _cel(ctx);
  const item = przedmiotZdolnosci(ctx.actor, { abilityId: "mutant-na-sniadanie" });
  if (!cel || !item || !["mutant", "potwor"].includes(kategoria(cel.actor))) return null;
  if (bramkaZajetaNa(item, "zabojca-mutantow", "runda")) return null;
  return [{ rodzaj: "ulatwienie", label: "Zabójca mutantów — raz w rundzie" }];
}

function _slabyPunkt(ctx) {
  const cel = _cel(ctx);
  const item = przedmiotZdolnosci(ctx.actor, { abilityId: "slaby-punkt" });
  if (!cel?.actor || !item) return null;
  if (!cel.actor.effects.some(e => e.getFlag(MODULE_ID, FLAG_SLABY_PUNKT) === ctx.actor.uuid)) return null;
  if (bramkaZajetaNa(item, "slaby-punkt", "runda")) return null;
  return [{ rodzaj: "ulatwienie", label: "Słaby punkt — raz w rundzie" }];
}

function _zwod(ctx) {
  const item = przedmiotZdolnosci(ctx.actor, { abilityId: "maszyna-do-zabijania" });
  if (!item || !ctx.wrecz || ctx.ability !== "str" || !ctx.actor.statuses?.has("berserk")) return null;
  if (bramkaZajetaNa(item, "zwod", "runda")) return null;
  return [{ rodzaj: "ulatwienie", label: "Zwód (Maszyna do zabijania) — raz w rundzie" }];
}

/** Źródła z limitem: id źródła → przedmiot zdolności i bramka albo efekt do zdjęcia. */
const JEDNORAZOWE = Object.freeze({
  "celowanie": { efekt: FLAG_CELOWANIE },
  "zabojca-mutantow": { abilityId: "mutant-na-sniadanie", bramka: "zabojca-mutantow" },
  "slaby-punkt": { abilityId: "slaby-punkt", bramka: "slaby-punkt" },
  "zwod": { abilityId: "maszyna-do-zabijania", bramka: "zwod" }
});

/**
 * Po rzucie ataku: zajmij limit źródła, które dało jedyne Ułatwienie (i zdejmij Celowanie). Hak `dnd5e.rollAttack`
 * odpala u rzucającego — on jest właścicielem przedmiotu zdolności.
 */
async function _onRollAttack(rolls, data) {
  const roll = rolls?.[0];
  const actor = data?.subject?.actor;
  const z = roll?.options?.[OKOLICZNOSCI_OPT];
  if (!actor || !z || roll.options.advantageMode !== CONFIG.Dice.D20Roll.ADV_MODE.ADVANTAGE) return;
  const ul = z.ulatwienia ?? [];
  if (!ul.length || ul.some(w => !JEDNORAZOWE[w.id])) return;
  const def = JEDNORAZOWE[ul[0].id];
  if (def.efekt) {
    const ids = actor.effects.filter(e => e.getFlag(MODULE_ID, def.efekt)).map(e => e.id);
    if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
    return;
  }
  await zajmijBramke(przedmiotZdolnosci(actor, { abilityId: def.abilityId }), def.bramka);
}

/* -------------------------------------------- */
/*  Premie liczbowe                              */
/* -------------------------------------------- */

/** Premia Mojego wroga przeciw temu aktorowi albo `null`. */
export function mojWrogPrzeciw(actor, cel) {
  if (!actor || !cel) return null;
  const k = kategoria(cel);
  const opcja = Object.entries(MOJ_WROG_KATEGORIE).find(([id, kat]) => kat.includes(k) && _ma(actor, id));
  if (!opcja) return null;
  const s = foundry.utils.getProperty(actor.getRollData?.() ?? {}, "scale.zwiadowca.mojWrog");
  const p = premiaMojegoWroga(String(s?.value ?? s ?? "")) ?? premiaMojegoWroga(MOJ_WROG_DOMYSLNIE);
  return { ...p, label: przedmiotZdolnosci(actor, { abilityId: opcja[0] })?.name ?? "Mój wróg" };
}

/** Sojusznik, który od końca twojej poprzedniej tury zaatakował ten cel wręcz (D13), albo `null`. */
export function sojusznikZaatakowalWrecz(actor, celToken, combat = game.combat) {
  const teraz = _teraz(combat);
  const moj = _indeks(combat, { actor });
  if (!teraz || moj < 0 || !celToken) return null;
  const uuid = celToken.document?.uuid ?? celToken.uuid;
  for (const { obrona } of _atakiWalki(combat)) {
    if (!obrona.melee || obrona.attackerUuid === actor.uuid) continue;
    if (!obrona.targets?.some(t => t.tokenUuid === uuid)) continue;
    if (!wOknieOdPoprzedniejTury(_chwilaDzis(combat, obrona.chwila), teraz, moj)) continue;
    const kto = fromUuidSync(obrona.attackerUuid);
    if (kto && sojusznicy(kto, actor)) return kto;
  }
  return null;
}

function _premieAtaku(activity, attackMode) {
  const actor = activity.actor;
  const out = [];
  // Miotacz (Celny rzut) — bez względu na cel.
  const item = activity.item;
  if (item?.type === "weapon" && actor.items.some(i => i.getFlag(MODULE_ID, "sztuczka") === "miotacz")
    && jestRzucana({ rzut: String(attackMode ?? "").startsWith("thrown"), typ: item.system.type?.value, wlasciwosci: item.system.properties })) {
    out.push({ id: "miotacz", label: "Miotacz — Celny rzut", wartosc: MIOTACZ });
  }
  const targets = [...(game.user.targets ?? [])];
  const cel = targets.length === 1 ? targets[0] : null;
  if (!cel?.actor) return out;
  const wrog = mojWrogPrzeciw(actor, cel.actor);
  if (wrog) out.push({ id: "moj-wrog", label: wrog.label, wartosc: wrog.atak });
  if (isMeleeAttack(activity, attackMode) && _ma(actor, "dwoch-na-jednego")) {
    const kto = sojusznikZaatakowalWrecz(actor, cel);
    if (kto) out.push({ id: "dwoch-na-jednego", label: `Dwóch na jednego (z: ${kto.name})`, wartosc: DWOCH_NA_JEDNEGO });
  }
  return out;
}

function _onPreRollAttack(config) {
  const activity = config?.subject;
  if (!activity?.actor) return;
  let premie;
  try {
    premie = _premieAtaku(activity, config.attackMode);
  } catch (err) {
    console.error(`${MODULE_ID} | premie zdolności do ataku`, err);
    return;
  }
  if (!premie.length) return;
  for (const roll of config.rolls ?? []) {
    roll.parts ??= [];
    for (const p of premie) roll.parts.push(String(p.wartosc));
    roll.options ??= {};
    roll.options[PREMIE_OPT] = premie;
  }
}

/** Premie do obrażeń broni: Mój wróg, Rzeźnik, Zabójcza spluwa. */
export function premieObrazen(activity, { cel = null, formula = "" } = {}) {
  const actor = activity?.actor;
  const item = activity?.item;
  if (!actor || item?.type !== "weapon") return [];
  const out = [];
  const wrog = cel ? mojWrogPrzeciw(actor, cel) : null;
  if (wrog) out.push({ id: "moj-wrog", label: wrog.label, czesc: wrog.obrazenia });
  if (_ma(actor, "rzeznik")) {
    const trzymane = heldItems(actor).map(h => ({ id: h.item?.id ?? null, bron: h.item?.type === "weapon" }));
    if (rzeznikDziala(trzymane, item.id)) out.push({ id: "rzeznik", label: "Rzeźnik", czesc: String(RZEZNIK) });
  }
  if (isRevolver(item) && _ma(actor, "clint")) {
    const kosc = koscZabojczejSpluwy(formula);
    if (kosc) out.push({ id: "zabojcza-spluwa", label: "Zabójcza spluwa", czesc: kosc });
  }
  return out;
}

function _onPreRollDamage(config) {
  const activity = config?.subject;
  const first = config?.rolls?.[0];
  if (!activity?.actor || !first || activity.type !== "attack") return;
  const targets = [...(game.user.targets ?? [])];
  let premie;
  try {
    premie = premieObrazen(activity, { cel: targets.length === 1 ? targets[0].actor : null, formula: (first.parts ?? []).join(" + ") });
  } catch (err) {
    console.error(`${MODULE_ID} | premie zdolności do obrażeń`, err);
    return;
  }
  if (!premie.length) return;
  first.parts ??= [];
  for (const p of premie) first.parts.push(p.czesc);
  first.options ??= {};
  first.options[PREMIE_OPT] = premie.map(p => ({ id: p.id, label: p.label, wartosc: p.czesc }));
}

/* -------------------------------------------- */
/*  Refleks łowcy, Strzelec                      */
/* -------------------------------------------- */

/** Refleks łowcy (U19): +PB do Inicjatywy, gdy w walce jest wrogi mutant albo potwór. */
function _onPreConfigureInitiative(actor, rollConfig) {
  if (!_ma(actor, "mutant-na-sniadanie")) return;
  const combat = game.combats?.find(c => c.combatants.some(cb => cb.actor === actor)) ?? game.combat;
  const moj = zeton(actor);
  const wrog = combat?.combatants.find(cb => cb.actor && cb.actor !== actor && ["mutant", "potwor"].includes(kategoria(cb.actor))
    && (moj && cb.token ? _przeciwnicy(moj, cb.token) : !sojusznicy(actor, cb.actor)));
  if (!wrog) return;
  rollConfig.parts.push(String(actor.system.attributes?.prof ?? 0));
  rollConfig.options ??= {};
  rollConfig.options.flavor = `${rollConfig.options.flavor ?? ""} (Refleks łowcy: ${wrog.name})`.trim();
}

/** Strzelec (U20): ruch zdejmuje stanowisko snajperskie — u klienta, który przesunął żeton. */
function _onMoveToken(doc, _movement, _operation, user) {
  if (user?.id !== game.user.id || !doc.actor?.statuses?.has(STANOWISKO_SNAJPERSKIE)) return;
  void doc.actor.toggleStatusEffect(STANOWISKO_SNAJPERSKIE, { active: false });
}

/* -------------------------------------------- */
/*  Plakietka premii                             */
/* -------------------------------------------- */

function _onRenderChatMessage(message, html) {
  if (rollTypeOf(message) !== "attack" || html.querySelector(".neuro-premie-zdolnosci")) return;
  const premie = message.rolls?.[0]?.options?.[PREMIE_OPT];
  const pills = premie?.length ? cardPillList(html) : null;
  if (!pills) return;
  const pill = document.createElement("li");
  pill.className = "pill neuro-premie-zdolnosci";
  pill.dataset.tooltip = premie.map(p => `${esc(p.label)}: +${esc(p.wartosc)}`).join("<br>");
  pill.innerHTML = `<i class="fa-solid fa-plus" inert></i> <span class="label">${premie.map(p => `${esc(p.label)} +${esc(p.wartosc)}`).join(" · ")}</span>`;
  pills.appendChild(pill);
}

/* -------------------------------------------- */

export function registerZdolnosciWalka() {
  for (const [id, fn] of [
    ["zawolajcie-kolegow", _zawolajcieKolegow], ["ja-i-moj-gang", _jaIMojGang], ["zasadzka", _zasadzka],
    ["jeden-strzal", _pierwszyAtak], ["celowanie", _celowanie], ["zabojca-mutantow", _zabojcaMutantow],
    ["slaby-punkt", _slabyPunkt], ["zwod", _zwod]
  ]) zarejestrujZrodloOkolicznosci(id, fn);
  Hooks.on("dnd5e.preRollAttack", _onPreRollAttack);
  Hooks.on("dnd5e.preRollDamage", _onPreRollDamage);
  Hooks.on("dnd5e.rollAttack", (rolls, data) => { void _onRollAttack(rolls, data); });
  Hooks.on("dnd5e.preConfigureInitiative", _onPreConfigureInitiative);
  Hooks.on("moveToken", _onMoveToken);
  Hooks.on("dnd5e.renderChatMessage", _onRenderChatMessage);
  console.log(`${MODULE_ID} | Zdolności walki (M7 E4) registered`);
}

/** Powierzchnia dla testów Quench. */
export const __testing = Object.freeze({
  _zawolajcieKolegow, _jaIMojGang, _zasadzka, _pierwszyAtak, _celowanie, _zabojcaMutantow, _slabyPunkt, _zwod, _onRollAttack,
  _premieAtaku, _onPreConfigureInitiative, JEDNORAZOWE
});
