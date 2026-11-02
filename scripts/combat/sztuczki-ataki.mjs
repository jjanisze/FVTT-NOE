/**
 * Neuroshima 5e — Sztuczki z własnymi atakami i przyciskami (PLAN_beta §0 krok 8b): warstwa Foundry.
 *
 * Zasady i stałe — `config/sztuczki-ataki.mjs`. Ataki naturalne (Karateka, Barbarka) to aktywności na samej Sztuczce,
 * jak ataki istot Bestiariusza — bez potoku broni (zacięcia, magazynki, zużycie). Tutaj:
 *
 *   - **Karateka:** dnd5e daje atakowi z featu tylko SIŁ; `flags.<mod>.cechyAtaku` na aktywności poszerza listę cech
 *     (`availableAbilities`) — dnd5e bierze wyższą, a okno ataku pozwala wybrać.
 *   - **Zapowiedziany atak** (`flags.<mod>.zapowiedzianyAtak` na atakującym): Nożownik i Celowanie — wpis na cel
 *     i broń, który najbliższy pasujący atak czyta (Ułatwienie albo automatyczne TK) i zdejmuje po rzucie. Nożownik
 *     ważny do końca tury, Celowanie — do użycia albo końca walki.
 *   - **Barbarka:** Z baśki — automatyczne TK z flagi aktywności; Wyjaśnić ci? — przycisk pod trafieniem głową, RO na
 *     Siłę celu i Powalenie wykonuje MG (przekaźnik).
 *   - **Jest zajebiście:** po aktywności test Oszustwa i karta z przyciskiem Intuicji dla każdego z drużyny; oblany
 *     dostaje efekt „Zajebista gadka” — Ułatwienie w najbliższym Teście Cechy, Ataku albo RO, zdejmowany po rzucie.
 *   - **Benzyna zamiast krwi:** Grigorij — TT pojazdu + mod. MDR kierowcy w werdykcie; Slalom — Unikanie kierowcy
 *     chroni pojazd w silniku okoliczności.
 *
 * Nożownik ma przycisk obok Ulubionej broni (`combat/zdolnosci-akcje.mjs`), Stalowe palce — w modelu magazynków
 * (`weapons/magazine.mjs`), Plug & Play — wiersz rejestru ułatwień (`config/zdolnosci-efekty.mjs`).
 */

import { LUKI_I_KUSZE, mozeObalic, stWyjasnicCi, oblalGadke, zapowiedzPasuje, grigorij } from "../config/sztuczki-ataki.mjs";
import { zarejestrujZrodloOkolicznosci, zarejestrujAutoKrytyk, zarejestrujStanyCelu } from "./okolicznosci.mjs";
import { obronaOf, verdictOfEntry, zarejestrujPremieTTCelu } from "./trafienie.mjs";
import { zarejestrujUlatwienieTestu } from "./ulatwienia-testow.mjs";
import { isHitVerdict } from "../config/defense-rules.mjs";
import { weaponIdOf } from "../weapons/magazine-model.mjs";
import { kierowcaPojazdu } from "../pojazdy/jadacy.mjs";
import { jestZetonemPojazdu } from "../pojazdy/stan.mjs";
import { doMG, zarejestrujProsbe } from "../postoj/przekaznik.mjs";
import { rollTypeOf } from "../config/chat-message-data.mjs";
import { gra, esc, stylPrzycisku, STYL_SZARY } from "./zdolnosci-wspolne.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
export const FLAGA_ZAPOWIEDZ = "zapowiedzianyAtak";
const FLAGA_GADKA = "zajebistaGadka";
/** Przekaźnik MG: RO na Siłę celu i Powalenie — Wyjaśnić ci? (Barbarka), Przygniecenie (Ławnik, 8c). */
export const PROSBA_POWALENIE = "sztuczki.powalenie";
const KOLOR = "#7d3c98";
const PATCH = Symbol("neuro-cechy-ataku");
/** Przyciski użyte na tym kliencie: `${messageId}:${rodzaj}`. */
const _uzyte = new Set();

const _flagi = activity => activity?.flags?.[MODULE_ID] ?? {};
export const maSztuczke = (actor, key) => !!actor?.items?.some(i => i.getFlag(MODULE_ID, "sztuczka") === key);
const _chwila = () => {
  const c = game.combat;
  return c?.started ? { combatId: c.id, round: c.round, turn: c.turn } : null;
};
const _aktualna = w => !w.chwila
  || (game.combat?.id === w.chwila.combatId && game.combat.round === w.chwila.round && game.combat.turn === w.chwila.turn);

/* -------------------------------------------- */
/*  Karateka — SIŁ albo ZRC                      */
/* -------------------------------------------- */

function _patchCechyAtaku() {
  const proto = dnd5e.dataModels?.activity?.AttackActivityData?.prototype;
  const d = proto && Object.getOwnPropertyDescriptor(proto, "availableAbilities");
  if (!d?.get || proto[PATCH]) return;
  Object.defineProperty(proto, "availableAbilities", {
    configurable: true,
    get() {
      const own = this.flags?.[MODULE_ID]?.cechyAtaku;
      return Array.isArray(own) && own.length ? new Set(own) : d.get.call(this);
    }
  });
  proto[PATCH] = true;
}

/* -------------------------------------------- */
/*  Zapowiedziany atak — Nożownik, Celowanie     */
/* -------------------------------------------- */

/**
 * Zapowiedz atak: `{ cel: tokenUuid, bronie?: string[], ulatwienie?: string, autoKrytyk?: string, zrodlo, tura?: true }`.
 * Ten sam `zrodlo` zastępuje poprzedni wpis; `tura` — ważny tylko w bieżącej turze walki.
 */
export async function zapowiedz(actor, { tura = false, ...wpis }) {
  const lista = (actor.getFlag(MODULE_ID, FLAGA_ZAPOWIEDZ) ?? []).filter(w => w.zrodlo !== wpis.zrodlo && _aktualna(w));
  lista.push({ ...wpis, id: foundry.utils.randomID(), chwila: tura ? _chwila() : null });
  await actor.setFlag(MODULE_ID, FLAGA_ZAPOWIEDZ, lista);
}

/** Wpisy, które czyta ten atak (ta broń, ten cel, ważne). */
export function zapowiedziDla(actor, item, celUuid) {
  const bronId = item?.type === "weapon" ? weaponIdOf(item) : null;
  return (actor?.getFlag(MODULE_ID, FLAGA_ZAPOWIEDZ) ?? []).filter(w => _aktualna(w) && zapowiedzPasuje(w, { celUuid, bronId }));
}

async function _zdejmijZapowiedzi(actor, item, celUuid) {
  const wszystkie = actor?.getFlag(MODULE_ID, FLAGA_ZAPOWIEDZ);
  if (!wszystkie?.length || !actor.isOwner) return;
  const zuzyte = new Set(zapowiedziDla(actor, item, celUuid).map(w => w.id));
  const zostaja = wszystkie.filter(w => !zuzyte.has(w.id) && _aktualna(w));
  if (zostaja.length !== wszystkie.length) await actor.setFlag(MODULE_ID, FLAGA_ZAPOWIEDZ, zostaja);
}

/* -------------------------------------------- */
/*  Barbarka — Wyjaśnić ci?                      */
/* -------------------------------------------- */

/** Karta trafienia głową z jednym celem: kontekst przycisku albo `null`. */
function _trafienieGlowa(message) {
  if (rollTypeOf(message) !== "attack") return null;
  const activity = message.getAssociatedActivity?.();
  if (!_flagi(activity).atakGlowa) return null;
  const obrona = obronaOf(message);
  if (obrona?.targets?.length !== 1) return null;
  const wpis = obrona.targets[0];
  if (!isHitVerdict(verdictOfEntry(obrona, wpis).verdict)) return null;
  const actor = activity.actor;
  const celActor = wpis.actorUuid ? fromUuidSync(wpis.actorUuid) : null;
  if (!actor || !celActor || !gra(actor)) return null;
  const st = stWyjasnicCi({ pb: actor.system.attributes?.prof, sila: actor.system.abilities?.str?.mod });
  const powod = mozeObalic(actor.system.traits?.size, celActor.system?.traits?.size) ? null : "cel większy od ciebie";
  return { actor, celActor, st, powod };
}

async function _powalenie(_nosiciel, { celUuid, st, kto, zdolnosc = "Wyjaśnić ci?" }) {
  const cel = await fromUuid(celUuid);
  if (!cel) return null;
  const rolls = await cel.rollSavingThrow({ ability: "str", target: st }, { configure: false },
    { create: true, data: { flags: { [MODULE_ID]: { obalajacaRO: { st } } } } });
  const roll = Array.isArray(rolls) ? rolls[0] : rolls;
  if (!roll) return null;
  const powalony = roll.total < st;
  if (powalony) await cel.toggleStatusEffect("prone", { active: true });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: cel }),
    content: `<div class="neuro-maneuver-result"><strong>${esc(zdolnosc)}</strong> — ${esc(cel.name)} `
      + `${powalony ? `oblał RO na Siłę (${roll.total} vs ST ${st}) i zostaje <b>Powalony</b>` : `zdał RO na Siłę (${roll.total} vs ST ${st})`}`
      + ` (${esc(kto)}).</div>`
  });
  return powalony;
}

/* -------------------------------------------- */
/*  Jest zajebiście — Zajebista gadka            */
/* -------------------------------------------- */

const _efektGadki = actor => actor?.effects?.find(e => e.getFlag(MODULE_ID, FLAGA_GADKA)) ?? null;

/** Drużyna główna bez gadającego; bez drużyny — postacie graczy na scenie. */
function _druzyna(actor) {
  const grupa = game.settings.get("dnd5e", "primaryParty")?.actor ?? null;
  const czlonkowie = (grupa?.system?.members ?? []).map(m => m.actor).filter(a => a && a.id !== actor.id);
  if (czlonkowie.length) return czlonkowie;
  return [...new Set((canvas?.scene?.tokens ?? []).map(t => t.actor)
    .filter(a => a?.type === "character" && a.hasPlayerOwner && a.id !== actor.id))];
}

async function _gadka(actor) {
  const rolls = await actor.rollSkill({ skill: "osz" });
  const roll = Array.isArray(rolls) ? rolls[0] : rolls;
  if (!roll) return;
  const druzyna = _druzyna(actor);
  const przyciski = druzyna.map(a => `<button type="button" data-neuro-gadka="${esc(a.uuid)}" data-oszustwo="${roll.total}">`
    + `<i class="fa-solid fa-eye"></i> Intuicja: ${esc(a.name)}</button>`).join("");
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-gadka"><strong>Zajebista gadka</strong> — Oszustwo <strong>${roll.total}</strong>.`
      + ` Każdy z drużyny rzuca na Intuicję; niższy wynik — Ułatwienie w najbliższym Teście Cechy, Ataku albo RO.`
      + ` Nie można zadeklarować niezdania.<div class="neuro-gadka-przyciski" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px">`
      + `${przyciski || "<em>Nikogo z drużyny w pobliżu.</em>"}</div></div>`,
    flags: { [MODULE_ID]: { gadka: { aktor: actor.uuid, oszustwo: roll.total } } }
  });
}

async function _intuicja(member, oszustwo, messageId, { configure = true } = {}) {
  if (member.getFlag(MODULE_ID, "gadkaZ") === messageId) {
    return ui.notifications.info(`${member.name}: Intuicja do tej gadki już rzucona.`);
  }
  const rolls = await member.rollSkill({ skill: "int" }, { configure });
  const roll = Array.isArray(rolls) ? rolls[0] : rolls;
  if (!roll) return;
  await member.setFlag(MODULE_ID, "gadkaZ", messageId);
  if (!oblalGadke(roll.total, oszustwo)) return;
  if (!_efektGadki(member)) {
    await member.createEmbeddedDocuments("ActiveEffect", [{
      name: "Zajebista gadka", img: "icons/svg/aura.svg",
      description: "<p>Ułatwienie w najbliższym Teście Cechy, Ataku albo Rzucie Obronnym (Jest zajebiście, s. 103).</p>",
      flags: { [MODULE_ID]: { [FLAGA_GADKA]: true } }
    }]);
  }
}

async function _zdejmijGadke(actor) {
  const e = _efektGadki(actor);
  if (e && actor.isOwner) await e.delete();
}

/* -------------------------------------------- */
/*  Benzyna zamiast krwi                         */
/* -------------------------------------------- */

/** Kierowca pojazdu z żetonu, gdy ma Benzynę zamiast krwi. */
function _kierowcaZBenzyna(tokenDoc) {
  if (!tokenDoc || !jestZetonemPojazdu(tokenDoc)) return null;
  const kier = kierowcaPojazdu(tokenDoc)?.actor ?? null;
  return kier && maSztuczke(kier, "benzynaZamiastKrwi") ? kier : null;
}

/* -------------------------------------------- */
/*  Karta i kliknięcia                           */
/* -------------------------------------------- */

function _onRenderChatMessage(message, html) {
  if (html.querySelector(".neuro-sztuczki-przyciski")) return;
  const glowa = _trafienieGlowa(message);
  if (!glowa) return;
  const uzyte = _uzyte.has(`${message.id}:powalenie`);
  const b = document.createElement("button");
  b.type = "button";
  b.dataset.neuroSztuczka = "powalenie";
  b.dataset.messageId = message.id;
  b.textContent = `🤜 Wyjaśnić ci? — Powalenie (RO SIŁ ST ${glowa.st})`;
  if (glowa.powod) b.dataset.tooltip = glowa.powod;
  b.disabled = !!glowa.powod || uzyte;
  Object.assign(b.style, glowa.powod || uzyte ? STYL_SZARY : stylPrzycisku(KOLOR), { flex: "1 1 auto", fontSize: "12px" });
  const div = document.createElement("div");
  div.className = "neuro-sztuczki-przyciski";
  div.style.cssText = "display: flex; gap: 4px; margin-top: 4px;";
  div.appendChild(b);
  (html.querySelector(".message-content") ?? html).appendChild(div);
}

async function _onClick(event) {
  const gadka = event.target.closest?.("[data-neuro-gadka]");
  if (gadka) {
    event.preventDefault();
    const member = await fromUuid(gadka.dataset.neuroGadka);
    if (!member?.isOwner) return ui.notifications.warn("Intuicję rzuca gracz tej postaci albo MG.");
    const messageId = gadka.closest("[data-message-id]")?.dataset.messageId ?? null;
    return _intuicja(member, Number(gadka.dataset.oszustwo), messageId);
  }
  const btn = event.target.closest?.("[data-neuro-sztuczka]");
  if (!btn) return;
  event.preventDefault();
  event.stopPropagation();
  const message = game.messages.get(btn.dataset.messageId);
  const glowa = message ? _trafienieGlowa(message) : null;
  const klucz = `${message?.id}:powalenie`;
  if (!glowa || glowa.powod || _uzyte.has(klucz)) return;
  _uzyte.add(klucz);
  btn.disabled = true;
  await doMG(PROSBA_POWALENIE, { celUuid: glowa.celActor.uuid, st: glowa.st, kto: glowa.actor.name }, { nosiciel: glowa.actor });
}

function _onPostUseActivity(activity) {
  const akcja = _flagi(activity).sztuczkaAkcja;
  const actor = activity?.actor;
  if (!actor || !akcja) return;
  if (akcja === "gadka") return void _gadka(actor);
  if (akcja !== "celowanie") return;
  const cele = [...(game.user.targets ?? [])];
  if (cele.length !== 1) return ui.notifications.warn("Celowanie: wyceluj w jeden cel, potem użyj Celowania.");
  void zapowiedz(actor, { cel: cele[0].document.uuid, bronie: [...LUKI_I_KUSZE], ulatwienie: "Celowanie (Robin Hood)", zrodlo: "celowanie" })
    .then(() => ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="neuro-celowanie"><strong>Celowanie</strong> — ${esc(cele[0].name)}: najbliższy atak z łuku albo kuszy w ten cel z Ułatwieniem.</div>`
    }));
}

/* -------------------------------------------- */

export function registerSztuczkiAtaki() {
  _patchCechyAtaku();

  // Ułatwienie z zapowiedzi (Celowanie) i z Zajebistej gadki — silnik okoliczności ataku.
  zarejestrujZrodloOkolicznosci("zapowiedziany-atak", ctx => {
    const cel = ctx.targets?.length === 1 ? ctx.targets[0].document?.uuid : null;
    const out = zapowiedziDla(ctx.actor, ctx.item, cel).filter(w => w.ulatwienie)
      .map(w => ({ rodzaj: "ulatwienie", label: w.ulatwienie, strona: "s. 106" }));
    if (_efektGadki(ctx.actor)) out.push({ rodzaj: "ulatwienie", label: "Zajebista gadka", strona: "s. 103" });
    return out.length ? out : null;
  });
  // Automatyczne TK: Z baśki (flaga aktywności) i zapowiedziany Nożownik.
  zarejestrujAutoKrytyk((ctx, token) => _flagi(ctx.activity).autoKrytyk
    ?? zapowiedziDla(ctx.actor, ctx.item, token.document?.uuid).find(w => w.autoKrytyk)?.autoKrytyk ?? null);
  // Slalom: Unikanie kierowcy z Benzyną zamiast krwi — pojazd też „unika”.
  zarejestrujStanyCelu(token => (_kierowcaZBenzyna(token.document ?? token)?.statuses?.has("dodging") ? ["dodging"] : []));
  // Grigorij: TT pojazdu + mod. MDR kierowcy.
  zarejestrujPremieTTCelu(tokenDoc => {
    const kier = _kierowcaZBenzyna(tokenDoc);
    return kier ? grigorij(kier.system.abilities?.wis?.mod) : 0;
  });
  // Zajebista gadka w testach i RO.
  zarejestrujUlatwienieTestu({
    id: "zajebista-gadka", label: "Zajebista gadka", rzut: ["check:*", "save:*"], rodzaj: "ulatwienie",
    gdy: () => true, ma: actor => !!_efektGadki(actor)
  });

  zarejestrujProsbe(PROSBA_POWALENIE, _powalenie);
  Hooks.on("dnd5e.postUseActivity", _onPostUseActivity);
  Hooks.on("dnd5e.renderChatMessage", _onRenderChatMessage);
  Hooks.on("renderChatLog", (_app, html) => {
    const el = html instanceof HTMLElement ? html : html?.[0];
    el?.addEventListener("click", ev => { void _onClick(ev); });
  });
  // Po rzucie: zapowiedź zużyta (ten cel, ta broń), efekt gadki zdjęty.
  Hooks.on("dnd5e.rollAttack", (_rolls, { subject }) => {
    const actor = subject?.actor;
    const cele = [...(game.user.targets ?? [])];
    if (cele.length === 1) void _zdejmijZapowiedzi(actor, subject?.item, cele[0].document.uuid);
    void _zdejmijGadke(actor);
  });
  for (const h of ["dnd5e.rollAbilityCheck", "dnd5e.rollSavingThrow", "dnd5e.rollSkill", "dnd5e.rollToolCheck"]) {
    Hooks.on(h, (_rolls, data) => { void _zdejmijGadke(data?.subject); });
  }
  // Koniec walki — zapowiedzi tej walki znikają.
  Hooks.on("deleteCombat", combat => {
    if (!game.users.activeGM?.isSelf) return;
    for (const c of combat.combatants) {
      const a = c.actor;
      const lista = a?.getFlag(MODULE_ID, FLAGA_ZAPOWIEDZ);
      if (lista?.length) void a.unsetFlag(MODULE_ID, FLAGA_ZAPOWIEDZ);
    }
  });
}

export const __testing = Object.freeze({ trafienieGlowa: _trafienieGlowa, powalenie: _powalenie, intuicja: _intuicja, druzyna: _druzyna });
