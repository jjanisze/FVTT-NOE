/**
 * Neuroshima 5e — dogrywka Sztuczek 8c (PLAN_beta §0, PLAN_m7 §8 „8c”, 2026-11-02): warstwa Foundry.
 *
 * Zasady i stałe — `config/sztuczki-walka.mjs`. Tutaj:
 *
 *   - **Wrestler:** Chwyt zapaśnika — Ułatwienie w silniku okoliczności wobec istoty, którą trzymasz (lokator ręki
 *     `grapple`); Duszenie — aktywność obrażeń na Sztuczce, ostrzeżenie, gdy nikogo nie trzymasz; Rzut na matę —
 *     `combat/melee-maneuvers.mjs`.
 *   - **Ławnik:** 3k4 i naturalna 1 — bliźniak (`actors/improwizacja.mjs`); Rozbijanie czaszek — Ułatwienie;
 *     Przygniecenie — przycisk pod trafieniem, RO na Siłę i Powalenie wykonuje MG (przekaźnik Barbarki).
 *   - **Rozróba:** Młynek [B] — aktywność: co najmniej 3 wrogów w 1,5 m, po jednym ataku trzymaną bronią białą w każdego.
 *   - **Pewna ręka:** Pewny strzał [B] — efekt do początku tury (Szybkość 0) i Ułatwienie w pierwszym ataku bronią
 *     dystansową (nie serią); Stabilizacja — `pojazdy/jazda.mjs`.
 *   - **Mistrz broni białej:** Fechmistrz — wybór modelu zaraz po wzięciu Sztuczki (karta z przyciskiem), kość obrażeń
 *     (`combat/zdolnosci-walka.mjs`), zmiana — zajęcie Długiego odpoczynku (RAW: ten odpoczynek; WKK: 30 h treningu).
 *   - **Patriota:** krok awansu pokazuje do wyboru tylko zdolności własnego Pochodzenia.
 *
 * Immunitet — `actors/health-panel.mjs`; Szturmowiec — `weapons/fire-modes.mjs`; Grenadier — `actors/grenade-inventory.mjs`.
 */

import {
  najwyzejDuzy, stZSily, MLYNEK_MIN, FECHMISTRZ_WKK_H, fechmistrzPostep, FLAGA_FECHMISTRZ, sztuczkaFechmistrza
} from "../config/sztuczki-walka.mjs";
import { zarejestrujZrodloOkolicznosci, wrogowie, odlegloscKrawedzi } from "./okolicznosci.mjs";
import { OBOK } from "../config/okolicznosci-ataku.mjs";
import { obronaOf, verdictOfEntry } from "./trafienie.mjs";
import { isHitVerdict } from "../config/defense-rules.mjs";
import { maSztuczke, PROSBA_POWALENIE } from "./sztuczki-ataki.mjs";
import { doMG } from "../postoj/przekaznik.mjs";
import { rollTypeOf } from "../config/chat-message-data.mjs";
import { gra, esc, zeton, stylPrzycisku, STYL_SZARY, flavorKarty } from "./zdolnosci-wspolne.mjs";
import { FLAG_DODATKOWY } from "./zdolnosci-akcje.mjs";
import { kombatantWlasciciela, zarejestrujEfektTuryWlasciciela } from "./czas-efektu.mjs";
import { sygnalNaruszenia } from "./sygnal-naruszenia.mjs";
import { trzymaPochwyconego } from "./melee-maneuvers.mjs";
import { heldItems } from "../actors/doll.mjs";
import { change, CHANGE_TYPE } from "../config/effect-changes.mjs";
import { modelBroni } from "../weapons/magazine-model.mjs";
import { WEAPONS } from "../config/weapons-data.mjs";
import { registerRestActivity } from "../actors/rest-activities.mjs";
import { isKobaltEnabled } from "../config/settings.mjs";
import { FLAGA_BLIZNIAKA } from "../config/improwizacja-rules.mjs";
import { ORIGIN_ABILITIES } from "../config/pochodzenia-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const KOLOR = "#7d3c98";
const FLAGA_PEWNY = "pewnyStrzal";
/** Tryby seryjne (`weapons/fire-modes.mjs`): KS, DS, Ogień zaporowy, Miażdżąca seria — Pewny strzał przy nich nie działa. */
const SERIE = new Set(["neuroKs", "neuroDs", "neuroOz", "neuroMs"]);
const SZYBKOSCI = ["walk", "climb", "swim", "fly", "burrow"];
/** Przyciski użyte na tym kliencie: `${messageId}:${rodzaj}`. */
const _uzyte = new Set();

const _flagi = activity => activity?.flags?.[MODULE_ID] ?? {};
const _odbiorcy = actor => game.users.filter(u => u.isGM || actor.testUserPermission(u, "OWNER")).map(u => u.id);

/* -------------------------------------------- */
/*  Wrestler — Duszenie                          */
/* -------------------------------------------- */

/** Duszenie (s. 108): obrażenia tylko istocie, którą trzymasz — bez niej sygnał dla MG, rzut idzie dalej. */
function _onPreUseActivity(activity) {
  if (_flagi(activity).sztuczkaAkcja !== "duszenie") return;
  const actor = activity.actor;
  const cele = [...(game.user.targets ?? [])];
  const trzyma = cele.length === 1 && trzymaPochwyconego(actor, cele[0].actor);
  if (trzyma) return;
  void sygnalNaruszenia(actor, {
    tytul: `${actor.name} — Duszenie`,
    linie: [cele.length === 1 ? `${cele[0].name} nie jest przez ciebie Pochwycony — Duszenie działa tylko na istotę, którą trzymasz (s. 108).`
      : "Wyceluj w istotę, którą trzymasz — Duszenie działa tylko na nią (s. 108)."]
  });
}

/* -------------------------------------------- */
/*  Ławnik — Przygniecenie                       */
/* -------------------------------------------- */

/** Karta trafienia ciężkim przedmiotem Ławnika z jednym celem: kontekst przycisku albo `null`. */
function _przygniecenie(message) {
  if (rollTypeOf(message) !== "attack") return null;
  const item = message.getAssociatedItem?.();
  if (!item?.flags?.[MODULE_ID]?.[FLAGA_BLIZNIAKA]?.lawnik) return null;
  const obrona = obronaOf(message);
  if (obrona?.targets?.length !== 1) return null;
  const wpis = obrona.targets[0];
  if (!isHitVerdict(verdictOfEntry(obrona, wpis).verdict)) return null;
  const actor = item.actor;
  const celActor = wpis.actorUuid ? fromUuidSync(wpis.actorUuid) : null;
  if (!actor || !celActor || !gra(actor)) return null;
  const st = stZSily({ pb: actor.system.attributes?.prof, sila: actor.system.abilities?.str?.mod });
  const powod = najwyzejDuzy(celActor.system?.traits?.size) ? null : "cel większy niż duży";
  return { actor, celActor, st, powod };
}

/* -------------------------------------------- */
/*  Rozróba — Młynek                             */
/* -------------------------------------------- */

/** Wrogowie w 1,5 m od żetonu postaci (przeciwna dyspozycja, nie martwi, widoczni). */
function _wrogowieObok(actor) {
  const tok = zeton(actor);
  if (!tok) return null;
  return (canvas?.tokens?.placeables ?? []).filter(t => t !== tok && t.actor && !t.document.hidden && wrogowie(tok, t)
    && !t.actor.statuses?.has("dead") && (odlegloscKrawedzi(tok, t) ?? Infinity) <= OBOK);
}

/** Młynek [B] (s. 107): Akcję Bonusową zadeklarowała aktywność; po jednym ataku w każdego wroga obok. */
async function _mlynek(actor) {
  const obok = _wrogowieObok(actor);
  if (!obok) return ui.notifications.warn("Młynek: postaw żeton postaci na scenie.");
  if (obok.length < MLYNEK_MIN) {
    await sygnalNaruszenia(actor, {
      tytul: `${actor.name} — Młynek`,
      linie: [`W zasięgu 1,5 m ${obok.length === 1 ? "jest 1 przeciwnik" : `jest ${obok.length} przeciwników`} — Młynek wymaga co najmniej ${MLYNEK_MIN} (s. 107). `
        + "Przeciwnik to żeton o przeciwnej dyspozycji."]
    });
    return;
  }
  const bron = heldItems(actor).map(h => h.item).find(i => i?.type === "weapon" && i.system?.type?.value === "biala");
  const akt = bron?.system.activities?.find(a => a.type === "attack");
  if (!akt) return ui.notifications.warn("Młynek: weź do ręki broń białą.");
  // Cel po celu, a rzut ataku czekany do końca: `use()` oddaje sterowanie po karcie użycia, zanim padnie Test Ataku —
  // przestawiony wcześniej cel dostałby wszystkie ataki (e2e `sztuczki-8c`). Karty jak dodatkowy atak (bez przycisków [B]).
  for (const t of obok) {
    t.setTarget(true, { releaseOthers: true, groupSelection: false });
    const usage = await akt.use({ subsequentActions: false }, { configure: false },
      { data: { flags: { [MODULE_ID]: { [FLAG_DODATKOWY]: "mlynek" } } } });
    if (!usage) return;
    await akt.rollAttack({}, {}, { data: { system: { origin: usage.message?.id } } });
  }
}

/* -------------------------------------------- */
/*  Pewna ręka — Pewny strzał                    */
/* -------------------------------------------- */

const _efektPewnego = actor => actor?.effects?.find(e => e.getFlag(MODULE_ID, FLAGA_PEWNY) && !e.disabled) ?? null;

/** Pewny strzał [B] (s. 105): efekt do początku twojej następnej tury — Szybkość 0 i jedno Ułatwienie. */
async function _pewnyStrzal(actor, item) {
  const tok = zeton(actor);
  if (kombatantWlasciciela(actor) && (tok?.document?.movementHistory?.length ?? 0) > 0) {
    await sygnalNaruszenia(actor, { tytul: `${actor.name} — Pewny strzał`, linie: ["Ruch w tej turze — Pewny strzał bierze się przed ruchem i atakiem (s. 105)."] });
  }
  const stare = actor.effects.filter(e => e.getFlag(MODULE_ID, FLAGA_PEWNY)).map(e => e.id);
  if (stare.length) await actor.deleteEmbeddedDocuments("ActiveEffect", stare);
  await actor.createEmbeddedDocuments("ActiveEffect", [{
    name: "Pewny strzał", img: item?.img ?? "icons/svg/target.svg", type: "base", origin: item?.uuid ?? null,
    description: "<p>Szybkość 0 do początku twojej następnej tury; Ułatwienie w jednym ataku bronią dystansową, nie serią (Pewna ręka, s. 105).</p>",
    duration: { value: 1, units: "turns", expiry: "turnStart" },
    system: { changes: SZYBKOSCI.map(s => change(`system.attributes.movement.speeds.${s}`, CHANGE_TYPE.override, 0)) },
    flags: { [MODULE_ID]: { [FLAGA_PEWNY]: { uzyty: false } } }
  }]);
}

/** Ułatwienie zużyte po pierwszym ataku, który je dostał — Szybkość 0 zostaje do początku tury. */
async function _zuzyjPewny(rolls, data) {
  const actor = data?.subject?.actor;
  const z = rolls?.[0]?.options?.neuroOkolicznosci;
  if (!actor?.isOwner || !z?.ulatwienia?.some(w => w.id === "pewny-strzal")) return;
  const e = _efektPewnego(actor);
  if (e) await e.setFlag(MODULE_ID, FLAGA_PEWNY, { uzyty: true });
}

/* -------------------------------------------- */
/*  Mistrz broni białej — Fechmistrz             */
/* -------------------------------------------- */

/** Modele do wyboru: broń biała postaci (także spoza katalogu), potem reszta broni białej z katalogu. */
function _modeleBialej(actor) {
  const out = new Map();
  for (const w of actor.items.filter(i => i.type === "weapon" && i.system?.type?.value === "biala")) {
    const model = modelBroni(w);
    if (model && !out.has(model)) out.set(model, { model, nazwa: w.name, swoja: true });
  }
  for (const w of WEAPONS.filter(x => x.type === "biala")) if (!out.has(w.id)) out.set(w.id, { model: w.id, nazwa: w.name, swoja: false });
  return [...out.values()];
}

const _opcje = (modele, wybrany = null, bez = null) => {
  const grupa = (label, lista) => (lista.length ? `<optgroup label="${label}">${lista.map(m =>
    `<option value="${esc(m.model)}" ${m.model === wybrany ? "selected" : ""}>${esc(m.nazwa)}</option>`).join("")}</optgroup>` : "");
  const lista = modele.filter(m => m.model !== bez);
  return grupa("Twoja broń", lista.filter(m => m.swoja)) + grupa("Katalog", lista.filter(m => !m.swoja));
};

/** Pierwszy wybór (s. 104: „wybierz jeden rodzaj broni białej”) — tylko gdy jeszcze go nie ma; zmiana idzie przez odpoczynek. */
export async function wybierzFechmistrza(actor) {
  const item = sztuczkaFechmistrza(actor);
  if (!item) return null;
  const teraz = item.getFlag(MODULE_ID, FLAGA_FECHMISTRZ);
  if (teraz?.model) {
    ui.notifications.info(`Fechmistrz: ${teraz.nazwa}. Zmiana — w Długim odpoczynku, zajęcie „Fechmistrz — trening z nową bronią”.`);
    return teraz;
  }
  const modele = _modeleBialej(actor);
  const model = await foundry.applications.api.DialogV2.prompt({
    window: { title: `${actor.name} — Fechmistrz` },
    content: `<p>Wybierz rodzaj broni białej (np. katana). Wybraną bronią zadajesz jedną kostkę obrażeń więcej (s. 104).</p>
      <div class="form-group"><label>Broń</label><select name="model">${_opcje(modele)}</select></div>`,
    ok: { label: "Wybierz", callback: (_e, b) => b.form.elements.model.value }
  }).catch(() => null);
  if (!model) return null;
  const wpis = modele.find(m => m.model === model);
  await item.setFlag(MODULE_ID, FLAGA_FECHMISTRZ, { model, nazwa: wpis?.nazwa ?? model });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }), whisper: _odbiorcy(actor),
    content: flavorKarty(KOLOR, "⚔ Fechmistrz", `${esc(actor.name)}: <strong>${esc(wpis?.nazwa ?? model)}</strong> — kostka obrażeń więcej.`)
  });
  return { model };
}

/** Zaraz po wzięciu Sztuczki (MG, 2026-11-02): karta z przyciskiem wyboru dla gracza i MG. */
function _onCreateItem(item, _options, userId) {
  if (userId !== game.user.id || item.getFlag(MODULE_ID, "sztuczka") !== "mistrzBroniBialej" || !item.actor) return;
  if (item.getFlag(MODULE_ID, FLAGA_FECHMISTRZ)?.model) return;
  const actor = item.actor;
  void ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }), whisper: _odbiorcy(actor),
    content: flavorKarty(KOLOR, "⚔ Mistrz broni białej", `${esc(actor.name)} wybiera broń Fechmistrza.`)
      + `<button type="button" data-neuro-sztuczka8c="fechmistrz" data-actor="${esc(actor.uuid)}">Wybierz broń Fechmistrza</button>`
  });
}

/**
 * Zajęcie Długiego odpoczynku (s. 104: „po odbyciu Długiego odpoczynku, w czasie którego trenujesz z nową bronią”).
 * RAW — zmiana po tym odpoczynku. WKK — godziny pracy postoju, razem 30 h (`FECHMISTRZ_WKK_H`), przez kolejne odpoczynki.
 */
const FECHMISTRZ_ZAJECIE = {
  id: "fechmistrz",
  label: "Fechmistrz — trening z nową bronią",
  restTypes: ["long"],
  budzet: () => (isKobaltEnabled() ? "praca" : null),
  render(actor, _typ, ctx) {
    const item = sztuczkaFechmistrza(actor);
    if (!item) return null;
    const f = item.getFlag(MODULE_ID, FLAGA_FECHMISTRZ) ?? {};
    const v = ctx?.szkic?.zajecia?.fechmistrz ?? {};
    const kobalt = isKobaltEnabled();
    const trening = f.trening?.model ? ` W toku: ${esc(f.trening.nazwa)} ${f.trening.godziny}/${FECHMISTRZ_WKK_H} h.` : "";
    return `<div class="neuro-zajecie-rzad"><select name="neuroZajecia.fechmistrz.model"><option value="">— bez treningu —</option>
        ${_opcje(_modeleBialej(actor), v.model ?? f.trening?.model ?? null, f.model ?? null)}</select>
      ${kobalt ? `<label>Godzin <input type="number" name="neuroZajecia.fechmistrz.godziny" min="0" max="10" step="1" value="${Number(v.godziny) || 0}"></label>` : ""}</div>
      <p class="hint">Teraz: ${esc(f.nazwa ?? "— nie wybrano —")}. ${kobalt
        ? `WKK: ${FECHMISTRZ_WKK_H} h treningu z nową bronią, w godzinach pracy.${trening}`
        : "Zmiana po tym Długim odpoczynku (s. 104)."}</p>`;
  },
  minuty(form) {
    if (!isKobaltEnabled()) return 0;
    const model = form?.querySelector?.('[name="neuroZajecia.fechmistrz.model"]')?.value;
    return model ? (Number(form.querySelector('[name="neuroZajecia.fechmistrz.godziny"]')?.value) || 0) * 60 : 0;
  },
  godziny: v => (isKobaltEnabled() && v?.model ? Math.min(10, Number(v.godziny) || 0) : 0),
  async apply(actor, v) {
    const item = sztuczkaFechmistrza(actor);
    if (!item || !v?.model) return null;
    const kobalt = isKobaltEnabled();
    const f = item.getFlag(MODULE_ID, FLAGA_FECHMISTRZ) ?? {};
    const nazwa = _modeleBialej(actor).find(m => m.model === v.model)?.nazwa ?? v.model;
    const h = kobalt ? Math.min(10, Number(v.godziny) || 0) : 0;
    const dotychczas = f.trening?.model === v.model ? f.trening.godziny : 0;
    const p = fechmistrzPostep({ dotychczas, godziny: h, kobalt });
    if (p.gotowe) {
      await item.setFlag(MODULE_ID, FLAGA_FECHMISTRZ, { model: v.model, nazwa });
      return { linie: [`Fechmistrz: teraz <strong>${esc(nazwa)}</strong>${f.nazwa ? ` (było: ${esc(f.nazwa)})` : ""}.`], minuty: h * 60 };
    }
    await item.setFlag(MODULE_ID, FLAGA_FECHMISTRZ, { ...f, trening: { model: v.model, nazwa, godziny: p.godziny } });
    return { linie: [`Fechmistrz: trening z bronią ${esc(nazwa)} — ${p.godziny}/${FECHMISTRZ_WKK_H} h (WKK).`], minuty: h * 60 };
  }
};

/* -------------------------------------------- */
/*  Patriota — pula z własnego Pochodzenia       */
/* -------------------------------------------- */

/**
 * Patriota (s. 105): „kolejną zdolność z listy zdolności swojego pochodzenia”. dnd5e nie zawęża puli do Pochodzenia na
 * karcie, więc krok awansu wyszarza resztę — i te, które postać już ma.
 */
function _onRenderItemChoiceFlow(app, element) {
  const item = app.advancement?.item;
  if (item?.getFlag?.(MODULE_ID, "sztuczka") !== "patriota") return;
  const actor = app.advancement.actor ?? item.actor;
  const origin = actor?.items?.find(i => i.type === "background")?.system?.identifier ?? null;
  const juz = new Set(actor?.items?.map(i => i.getFlag(MODULE_ID, "originAbilityId")).filter(Boolean) ?? []);
  for (const row of element.querySelectorAll("[data-uuid]")) {
    const box = row.querySelector("dnd5e-checkbox");
    if (!box || box.checked) continue;
    const id = fromUuidSync(row.dataset.uuid)?.flags?.[MODULE_ID]?.originAbilityId ?? null;
    const def = id ? ORIGIN_ABILITIES[id] : null;
    const powod = !origin ? "postać nie ma Pochodzenia" : !def || def.origin !== origin ? "spoza twojego Pochodzenia"
      : juz.has(id) ? "już ją masz" : null;
    if (!powod) continue;
    box.disabled = true;
    row.style.opacity = "0.45";
    row.dataset.tooltip = `Patriota: ${powod} (s. 105)`;
  }
}

/* -------------------------------------------- */
/*  Karty i aktywności                           */
/* -------------------------------------------- */

function _onRenderChatMessage(message, html) {
  if (html.querySelector(".neuro-sztuczki8c-przyciski")) return;
  const p = _przygniecenie(message);
  if (!p) return;
  const uzyte = _uzyte.has(`${message.id}:przygniecenie`);
  const b = document.createElement("button");
  b.type = "button";
  b.dataset.neuroSztuczka8c = "przygniecenie";
  b.dataset.messageId = message.id;
  b.textContent = `🪑 Przygniecenie — Powalenie (RO SIŁ ST ${p.st})`;
  if (p.powod) b.dataset.tooltip = p.powod;
  b.disabled = !!p.powod || uzyte;
  Object.assign(b.style, p.powod || uzyte ? STYL_SZARY : stylPrzycisku(KOLOR), { flex: "1 1 auto", fontSize: "12px" });
  const div = document.createElement("div");
  div.className = "neuro-sztuczki8c-przyciski";
  div.style.cssText = "display: flex; gap: 4px; margin-top: 4px;";
  div.appendChild(b);
  (html.querySelector(".message-content") ?? html).appendChild(div);
}

async function _onClick(event) {
  const btn = event.target.closest?.("[data-neuro-sztuczka8c]");
  if (!btn) return;
  event.preventDefault();
  event.stopPropagation();
  if (btn.dataset.neuroSztuczka8c === "fechmistrz") {
    const actor = await fromUuid(btn.dataset.actor);
    if (!actor?.isOwner) return ui.notifications.warn("Broń Fechmistrza wybiera gracz tej postaci albo MG.");
    return wybierzFechmistrza(actor);
  }
  const message = game.messages.get(btn.dataset.messageId);
  const p = message ? _przygniecenie(message) : null;
  const klucz = `${message?.id}:przygniecenie`;
  if (!p || p.powod || _uzyte.has(klucz)) return;
  _uzyte.add(klucz);
  btn.disabled = true;
  await doMG(PROSBA_POWALENIE, { celUuid: p.celActor.uuid, st: p.st, kto: p.actor.name, zdolnosc: "Przygniecenie" }, { nosiciel: p.actor });
}

function _onPostUseActivity(activity) {
  const akcja = _flagi(activity).sztuczkaAkcja;
  const actor = activity?.actor;
  if (!actor || !akcja) return;
  if (akcja === "mlynek") void _mlynek(actor);
  else if (akcja === "pewny-strzal") void _pewnyStrzal(actor, activity.item);
  else if (akcja === "fechmistrz") void wybierzFechmistrza(actor);
}

/* -------------------------------------------- */

export function registerSztuczkiWalka() {
  // Wrestler, Chwyt zapaśnika (s. 108): Ułatwienie wobec istoty, którą trzymasz.
  zarejestrujZrodloOkolicznosci("chwyt-zapasnika", ctx => (ctx.targets?.length === 1 && maSztuczke(ctx.actor, "wrestler")
    && trzymaPochwyconego(ctx.actor, ctx.targets[0].actor)
    ? [{ rodzaj: "ulatwienie", label: "Chwyt zapaśnika (Wrestler)", strona: "s. 108" }] : null));
  // Ławnik, Rozbijanie czaszek (s. 104): atak ciężkim przedmiotem.
  zarejestrujZrodloOkolicznosci("rozbijanie-czaszek", ctx => (ctx.item?.flags?.[MODULE_ID]?.[FLAGA_BLIZNIAKA]?.lawnik
    ? [{ rodzaj: "ulatwienie", label: "Rozbijanie czaszek (Ławnik)", strona: "s. 104" }] : null));
  // Pewna ręka, Pewny strzał (s. 105): jeden atak bronią dystansową, nie serią.
  zarejestrujZrodloOkolicznosci("pewny-strzal", ctx => {
    if (ctx.wrecz || ctx.item?.type !== "weapon" || ctx.item.system?.type?.value === "biala" || SERIE.has(ctx.activity?.type)) return null;
    const e = _efektPewnego(ctx.actor);
    return e && !e.getFlag(MODULE_ID, FLAGA_PEWNY)?.uzyty
      ? [{ rodzaj: "ulatwienie", label: "Pewny strzał (Pewna ręka)", strona: "s. 105" }] : null;
  });
  zarejestrujEfektTuryWlasciciela(e => !!e.getFlag?.(MODULE_ID, FLAGA_PEWNY) || !!e.flags?.[MODULE_ID]?.[FLAGA_PEWNY]);
  registerRestActivity(FECHMISTRZ_ZAJECIE);

  Hooks.on("dnd5e.preUseActivity", _onPreUseActivity);
  Hooks.on("dnd5e.postUseActivity", _onPostUseActivity);
  Hooks.on("dnd5e.rollAttack", (rolls, data) => { void _zuzyjPewny(rolls, data); });
  Hooks.on("dnd5e.renderChatMessage", _onRenderChatMessage);
  Hooks.on("renderChatLog", (_app, html) => {
    const el = html instanceof HTMLElement ? html : html?.[0];
    el?.addEventListener("click", ev => { void _onClick(ev); });
  });
  Hooks.on("createItem", _onCreateItem);
  Hooks.on("renderItemChoiceFlow", _onRenderItemChoiceFlow);
}

export const __testing = Object.freeze({ przygniecenie: _przygniecenie, wrogowieObok: _wrogowieObok, pewnyStrzal: _pewnyStrzal, mlynek: _mlynek, FECHMISTRZ_ZAJECIE });
