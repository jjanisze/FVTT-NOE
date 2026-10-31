/**
 * Neuroshima 5e — akcje bonusowe, dodatkowe ataki i akcje zdolności (PLAN_m7 E4, rodzina R5 i aktywne części R4).
 *
 * | Zdolność | Działanie | Nośnik |
 * |---|---|---|
 * | Ulubiona broń (Twardziel 1, Złodziej 2, Zwiadowca 1; s. 86, 91, 97) | po ataku ulubioną bronią w twojej turze — jeszcze jeden atak nią [B]; dystansowa musi mieć amunicję | przycisk na karcie ataku, aktywność zdolności |
 * | Maszyna do zabijania — Promocja (Najemnik, s. 70) | w Berserku dodatkowy atak wręcz [B] | przycisk na karcie ataku wręcz, aktywność „Promocja” |
 * | Jeden strzał — Celowanie (Zabójca, s. 94) | bez ruchu w tej turze → [B] → jeden atak z Ułatwieniem | aktywność „Celowanie”, efekt na aktorze |
 * | Słaby punkt [A] (Zabójca maszyn, s. 101) | Test INT (Technika) o ST z rozmiaru → efekt na maszynie, karta MG (3 współczynniki) | aktywność, efekt na celu |
 * | Szybka gadka [B] (Cwaniak 3, s. 73), Szybkie badanie [B] (Spec 2, s. 78) | Wpływanie / Badanie (s. 41) w Akcji Bonusowej | aktywność → wybór umiejętności |
 * | Strzelec (Zabójca, s. 94; U20) | gracz deklaruje stanowisko; w walce moduł liczy 5 rund mierzenia bez ruchu, poza walką — od razu; status nakłada MG przyciskiem | aktywność „Stanowisko snajperskie”, karta MG |
 *
 * Akcję Bonusową deklaruje warstwa akcji (`actors/actions.mjs`): aktywność [B] — sama przy użyciu; przycisk na karcie —
 * `zadeklaruj` przed atakiem. Druga Akcja Bonusowa w turze → sygnał MG (D5), atak idzie dalej.
 *
 * **Ulubiona broń — zapamiętany wybór (§3.0.5, U11):** model z katalogu (`weaponIdOf`, inaczej nazwa) w fladze
 * przedmiotu zdolności. Pierwszy wybór — przy pierwszym użyciu (pytanie na przycisku karty albo okno aktywności);
 * zamiana jednej — po Długim odpoczynku (karta z przyciskiem, RAW: godzina treningu). Dodatkowy atak to zwykły atak tą
 * bronią — cały potok (tryb ognia, amunicja, okoliczności); jego karta nie dostaje kolejnego przycisku.
 */

import { obronaOf } from "./trafienie.mjs";
import { zastapionaPrzez, rootOf } from "./po-rzucie.mjs";
import { kombatantWlasciciela, zarejestrujEfektTuryWlasciciela } from "./czas-efektu.mjs";
import { sygnalNaruszenia } from "./sygnal-naruszenia.mjs";
import { FLAG_CELOWANIE, FLAG_SLABY_PUNKT } from "./zdolnosci-walka.mjs";
import { STANOWISKO_SNAJPERSKIE } from "./okolicznosci.mjs";
import {
  esc, przedmiotZdolnosci, gra, zeton, kategoria, nalozEfekt, usunEfekty, flavorKarty, stylPrzycisku, STYL_SZARY
} from "./zdolnosci-wspolne.mjs";
import { zadeklaruj } from "../actors/actions.mjs";
import { heldItems } from "../actors/doll.mjs";
import { weaponIdOf } from "../weapons/magazine-model.mjs";
import { magazineReadiness } from "../weapons/magazine.mjs";
import { rollTypeOf } from "../config/chat-message-data.mjs";
import { hasAddon } from "../config/addons-data.mjs";
import {
  ULUBIONA_BRON, limitUlubionych, stSlabegoPunktu, UMIEJETNOSCI_AKCJI
} from "../config/zdolnosci-walka.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
/** Lista Ulubionych broni na przedmiocie zdolności: `[{ model, nazwa }]`. */
export const FLAG_ULUBIONE = "ulubione";
/** Po Długim odpoczynku wolno zamienić jedną Ulubioną broń. */
export const FLAG_ZMIANA = "zmianaUlubionej";
/** Karta użycia dodatkowego ataku: `"ulubiona-bron"` | `"promocja"`. */
export const FLAG_DODATKOWY = "dodatkowyAtak";
/** Rzut Testu Słabego punktu: `{ targetUuid, st }` — efekt i przy późniejszej modyfikacji rzutu. */
const FLAG_TEST_SLABY = "slabyPunktTest";
/** Słaby punkt znaleziony w walce: id walki (sprzątanie po walce; poza walką — Długi odpoczynek, U18). */
const FLAG_SLABY_WALKA = "slabyPunktWalka";
/** Strzelec mierzy w walce: `{ combatId, round, zgloszone }` na efekcie „Mierzenie”. */
const FLAG_MIERZENIE = "mierzenie";
/** Strzelec (s. 94): tyle rund precyzyjnego mierzenia. */
const RUNDY_MIERZENIA = 5;
const KOLOR = "#b9770e";
const DLUGI_KOLOR = "#5d6d7e";

const _ma = (actor, abilityId) => przedmiotZdolnosci(actor, { abilityId });
/** Karty, na których już kliknięto dodatkowy atak (ten klient). */
const _klikniete = new Set();

/* -------------------------------------------- */
/*  Ulubiona broń — wybór                        */
/* -------------------------------------------- */

/** Model broni (U11): wpis katalogu, inaczej nazwa — dowolny egzemplarz tego samego modelu. */
export function modelBroni(item) {
  if (item?.type !== "weapon") return null;
  return weaponIdOf(item) ?? `nazwa:${String(item.name ?? "").trim().toLowerCase()}`;
}

const _lista = item => item?.getFlag(MODULE_ID, FLAG_ULUBIONE) ?? [];

function _limit(item) {
  const actor = item.actor;
  const id = item.getFlag(MODULE_ID, "abilityId");
  const s = foundry.utils.getProperty(actor?.getRollData?.() ?? {}, "scale.twardziel.ulubionaBron");
  const poziom = Number(actor?.classes?.zwiadowca?.system?.levels) || 1;
  return limitUlubionych(id, { skala: Number(s?.value ?? s) || null, poziom });
}

const _zdolnosciUlubionej = actor => ULUBIONA_BRON.map(id => _ma(actor, id)).filter(Boolean);

/** Przedmiot zdolności, na którego liście jest model tej broni, albo `null`. */
export function ulubionaDla(actor, weapon) {
  const model = modelBroni(weapon);
  return model ? _zdolnosciUlubionej(actor).find(i => _lista(i).some(u => u.model === model)) ?? null : null;
}

/** Przedmiot zdolności z wolnym miejscem albo `null`. */
const _wolneMiejsce = actor => _zdolnosciUlubionej(actor).find(i => _lista(i).length < _limit(i)) ?? null;

/** Złodziej: model, w którym masz biegłość (s. 91). */
function _bieglaWBroni(weapon) {
  const m = weapon.system?.prof?.multiplier;
  return Number.isFinite(m) ? m >= 1 : !!weapon.system?.proficient;
}

async function _zapiszListe(item, lista, { zmiana = false } = {}) {
  await item.update({ [`flags.${MODULE_ID}.${FLAG_ULUBIONE}`]: lista, ...(zmiana ? { [`flags.${MODULE_ID}.${FLAG_ZMIANA}`]: false } : {}) });
}

/** Pierwszy wybór z przycisku karty: pytanie i zapis. `null` — gracz odmówił albo nie wolno. */
async function _ustawUlubiona(actor, weapon) {
  const item = _wolneMiejsce(actor);
  if (!item) return null;
  if (item.getFlag(MODULE_ID, "abilityId") === "ulubiona-bron-zlodziej" && !_bieglaWBroni(weapon)) {
    ui.notifications.warn(`Ulubiona broń Złodzieja: model, w którym masz biegłość (s. 91) — ${weapon.name} odpada.`);
    return null;
  }
  const lista = _lista(item);
  const ok = await foundry.applications.api.DialogV2.confirm({
    window: { title: "Ulubiona broń" },
    content: `<p>Ustawić <strong>${esc(weapon.name)}</strong> jako Ulubioną broń (${lista.length + 1}/${_limit(item)})?</p>`
      + "<p style=\"font-size: 0.9em; opacity: 0.8;\">Zmiana na inny model — w czasie Długiego odpoczynku, godzina treningu.</p>",
    yes: { icon: "fas fa-star", label: "Ustaw" }, no: { icon: "fas fa-times", label: "Anuluj", default: true },
    rejectClose: false
  });
  if (!ok) return null;
  await _zapiszListe(item, [...lista, { model: modelBroni(weapon), nazwa: weapon.name }]);
  return item;
}

/** Bronie aktora pogrupowane po modelu: `[{ model, nazwa }]`. */
function _modeleAktora(actor) {
  const out = new Map();
  for (const w of actor.items.filter(i => i.type === "weapon")) {
    const model = modelBroni(w);
    if (model && !out.has(model)) out.set(model, { model, nazwa: w.name, bron: w });
  }
  return [...out.values()];
}

/**
 * Okno wyboru: dodanie modelu (wolne miejsce) albo zamiana jednego (po Długim odpoczynku; MG zawsze).
 * @param {Actor} actor
 * @param {Item} item   przedmiot zdolności Ulubiona broń
 */
export async function wybierzUlubiona(actor, item) {
  const lista = _lista(item);
  const limit = _limit(item);
  const zlodziej = item.getFlag(MODULE_ID, "abilityId") === "ulubiona-bron-zlodziej";
  const modele = _modeleAktora(actor).filter(m => !lista.some(u => u.model === m.model) && (!zlodziej || _bieglaWBroni(m.bron)));
  const wolne = lista.length < limit;
  const zamiana = !wolne && (item.getFlag(MODULE_ID, FLAG_ZMIANA) || game.user.isGM);
  const obecne = lista.length ? lista.map(u => esc(u.nazwa)).join(", ") : "—";
  if ((!wolne && !zamiana) || !modele.length) {
    ui.notifications.info(`${item.name}: ${obecne} (${lista.length}/${limit}). `
      + (modele.length ? "Zmiana — w czasie Długiego odpoczynku." : "Brak innych broni do wyboru."));
    return null;
  }
  const opcje = modele.map(m => `<option value="${esc(m.model)}">${esc(m.nazwa)}</option>`).join("");
  const stare = zamiana ? `<div class="form-group"><label>Zamiast</label><select name="stara">${
    lista.map(u => `<option value="${esc(u.model)}">${esc(u.nazwa)}</option>`).join("")}</select></div>` : "";
  const wynik = await foundry.applications.api.DialogV2.prompt({
    window: { title: `${item.name} — ${actor.name}` },
    content: `<p>Obecnie: ${obecne} (${lista.length}/${limit}).</p>${stare}`
      + `<div class="form-group"><label>${zamiana ? "Nowa" : "Dodaj"}</label><select name="nowa">${opcje}</select></div>`
      + (zlodziej ? "<p style=\"font-size: 0.9em; opacity: 0.8;\">Złodziej: tylko modele, w których masz biegłość.</p>" : ""),
    ok: { label: zamiana ? "Zamień" : "Dodaj", callback: (_e, button) => new foundry.applications.ux.FormDataExtended(button.form).object },
    rejectClose: false
  });
  if (!wynik?.nowa) return null;
  const nowa = modele.find(m => m.model === wynik.nowa);
  const nastepna = zamiana ? lista.filter(u => u.model !== wynik.stara) : [...lista];
  nastepna.push({ model: nowa.model, nazwa: nowa.nazwa });
  await _zapiszListe(item, nastepna, { zmiana: zamiana });
  return item;
}

/* -------------------------------------------- */
/*  Dodatkowy atak                               */
/* -------------------------------------------- */

/** Czy ta karta ataku pochodzi z dodatkowego ataku (Ulubiona broń, Promocja) — też po przerzucie. */
function _jestDodatkowy(message) {
  for (const m of [message, rootOf(message)]) {
    if (!m) continue;
    if (m.getFlag(MODULE_ID, FLAG_DODATKOWY)) return true;
    // dnd5e 6: karta ataku wskazuje kartę użycia przez `system.origin` (dawniej flaga `originatingMessage`).
    const orig = m.getOriginatingMessage?.();
    if (orig && orig !== m && orig.getFlag?.(MODULE_ID, FLAG_DODATKOWY)) return true;
  }
  return false;
}

/** Atak z tej karty padł w bieżącej turze aktora (poza walką — zawsze). */
function _wTejTurze(actor, message) {
  const combat = game.combat;
  if (!combat?.started) return true;
  if (combat.combatant !== kombatantWlasciciela(actor, combat)) return false;
  const ch = obronaOf(message)?.chwila;
  return !ch || (ch.combatId === combat.id && ch.round === combat.round && ch.turn === combat.turn);
}

/** Ostatnia karta ataku aktora w tej turze (zwykły atak, nie dodatkowy), spełniająca `warunek(bron, message)`. */
function _ostatniAtak(actor, warunek) {
  const lista = game.messages.contents;
  for (let i = lista.length - 1, n = 0; i >= 0 && n < 100; i--, n++) {
    const m = lista[i];
    if (rollTypeOf(m) !== "attack" || m.getAssociatedActor?.() !== actor) continue;
    if (!_wTejTurze(actor, m) || _jestDodatkowy(m)) continue;
    const bron = m.getAssociatedItem?.();
    if (bron?.type === "weapon" && warunek(bron, m)) return { bron, message: m };
  }
  return null;
}

/** Brak amunicji: `"missing"` | `"empty"` | `null` (jest albo broń bez magazynka). */
function _brakAmunicji(bron) {
  const stan = magazineReadiness(bron);
  return stan === "missing" || stan === "empty" ? stan : null;
}

/** Broń dystansowa bez amunicji (s. 86: „musi mieć załadowaną amunicję”) — sygnał MG, bez ataku. */
async function _bezAmunicji(actor, bron, zrodlo) {
  const stan = _brakAmunicji(bron);
  if (!stan) return false;
  await sygnalNaruszenia(actor, {
    tytul: `${actor.name} — ${zrodlo}`,
    linie: [`${bron.name}: ${stan === "missing" ? "brak magazynka" : "pusto"} — dodatkowy atak wymaga załadowanej amunicji.`]
  });
  return true;
}

/**
 * Same klawisze zdarzenia, bez celu. dnd5e bierze `system.origin` rzutu z karty, w której kliknięto
 * (`BasicRoll.buildPost`), więc atak z przycisku pod kartą ataku wskazywałby tamtą kartę zamiast nowej karty użycia —
 * i zgubił flagę dodatkowego ataku.
 */
function _klawisze(event) {
  if (!event) return null;
  const { shiftKey, altKey, ctrlKey, metaKey } = event;
  return new MouseEvent("click", { shiftKey, altKey, ctrlKey, metaKey });
}

/**
 * Dodatkowy atak tą bronią: zwykła aktywność ataku (ta sama co na karcie, gdy jest), karta użycia z flagą.
 * @param {Actor} actor
 * @param {Item} bron
 * @param {{activity?: Activity|null, zrodlo: string, rodzaj: string, deklaruj?: boolean, event?: Event|null}} o
 *   `event` z Shiftem — bez okien użycia i rzutu (konwencja dnd5e „szybki rzut”).
 */
async function _dodatkowyAtak(actor, bron, { activity = null, zrodlo, rodzaj, deklaruj = true, event = null }) {
  if (await _bezAmunicji(actor, bron, zrodlo)) return null;
  if (deklaruj) await zadeklaruj(actor, "B", { zrodlo });
  const akt = activity?.item?.id === bron.id ? activity : bron.system.activities?.find(a => a.type === "attack");
  if (!akt) return null;
  const ev = _klawisze(event);
  return akt.use({ event: ev }, { configure: !ev?.shiftKey }, { data: { flags: { [MODULE_ID]: { [FLAG_DODATKOWY]: rodzaj } } } });
}

/** Ulubiona broń z przycisku karty (pierwszy wybór — z pytaniem). */
export async function atakUlubiona(actor, bron, { activity = null, event = null } = {}) {
  const item = ulubionaDla(actor, bron) ?? await _ustawUlubiona(actor, bron);
  if (!item) return null;
  return _dodatkowyAtak(actor, bron, { activity, zrodlo: item.name, rodzaj: "ulubiona-bron", event });
}

/** Promocja z przycisku karty ataku wręcz. */
export async function atakPromocja(actor, bron, { activity = null, event = null } = {}) {
  return _dodatkowyAtak(actor, bron, { activity, zrodlo: "Promocja (Maszyna do zabijania)", rodzaj: "promocja", event });
}

const _promocjaDostepna = actor => !!_ma(actor, "maszyna-do-zabijania") && !!actor.statuses?.has("berserk");

function _onRenderChatMessage(message, html) {
  if (rollTypeOf(message) !== "attack" || html.querySelector(".neuro-dodatkowy-atak")) return;
  const actor = message.getAssociatedActor?.();
  const bron = message.getAssociatedItem?.();
  if (!actor || bron?.type !== "weapon" || !gra(actor)) return;
  if (zastapionaPrzez(message) || _jestDodatkowy(message) || !_wTejTurze(actor, message)) return;
  const przyciski = [];
  const ulubiona = ulubionaDla(actor, bron);
  if (ulubiona || _wolneMiejsce(actor)) {
    przyciski.push({ rodzaj: "ulubiona", label: ulubiona ? "⭐ Ulubiona broń [B]" : "⭐ Ulubiona broń [B] — ten model?" });
  }
  if (obronaOf(message)?.melee && _promocjaDostepna(actor)) przyciski.push({ rodzaj: "promocja", label: "⚔ Promocja [B]" });
  if (!przyciski.length) return;
  const uzyte = _klikniete.has(message.id);
  const div = document.createElement("div");
  div.className = "neuro-dodatkowy-atak";
  div.style.cssText = "display: flex; gap: 4px; margin-top: 4px;";
  for (const p of przyciski) {
    const b = document.createElement("button");
    b.type = "button";
    b.dataset.neuroM7Dodatkowy = p.rodzaj;
    b.dataset.messageId = message.id;
    b.textContent = p.label;
    b.disabled = uzyte;
    Object.assign(b.style, uzyte ? STYL_SZARY : stylPrzycisku(KOLOR), { flex: "1", fontSize: "12px" });
    div.appendChild(b);
  }
  (html.querySelector(".message-content") ?? html).appendChild(div);
}

/* -------------------------------------------- */
/*  Słaby punkt                                  */
/* -------------------------------------------- */

const _jedenCel = () => {
  const t = [...(game.user.targets ?? [])];
  return t.length === 1 ? t[0] : null;
};

function _slabyPunktCel() {
  const cel = _jedenCel();
  if (!cel?.actor) return { powod: "Słaby punkt: wskaż jedną maszynę (cel)." };
  if (kategoria(cel.actor) !== "maszyna") return { powod: `Słaby punkt: ${cel.name} nie jest maszyną.` };
  return { cel };
}

async function _nalozSlabyPunkt(actor, item, celActor) {
  if (celActor.effects.some(e => e.getFlag(MODULE_ID, FLAG_SLABY_PUNKT) === actor.uuid)) return;
  const combat = game.combat?.started ? game.combat : null;
  await nalozEfekt(celActor, {
    name: `Słaby punkt (${actor.name})`, img: item?.img ?? "icons/svg/target.svg", type: "base", origin: item?.uuid ?? null,
    description: `<p>${esc(actor.name)} zna słaby punkt tej maszyny: raz w rundzie atakuje ją z Ułatwieniem (s. 101). `
      + `${combat ? "Do końca walki." : "Do Długiego odpoczynku."}</p>`,
    flags: { [MODULE_ID]: { [FLAG_SLABY_PUNKT]: actor.uuid, [FLAG_SLABY_WALKA]: combat?.id ?? null } }
  }, { przez: actor });
  await ChatMessage.create({
    whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
    speaker: ChatMessage.getSpeaker({ actor }),
    content: flavorKarty(KOLOR, `🔧 Słaby punkt — ${esc(celActor.name)}`,
      `${esc(actor.name)} zdał Test INT (Technika). Możesz zdradzić 3 wybrane współczynniki tej maszyny (s. 101).`)
  });
}

async function _slabyPunkt(actor, item) {
  const { cel, powod } = _slabyPunktCel();
  if (!cel) return void ui.notifications.warn(powod);
  const st = stSlabegoPunktu(cel.actor.system?.traits?.size) ?? 10;
  const rolls = await actor.rollSkill({ skill: "tch", target: st }, {}, {
    data: { flags: { [MODULE_ID]: { [FLAG_TEST_SLABY]: { targetUuid: cel.actor.uuid, st } } } }
  });
  const roll = rolls?.[0];
  if (roll && roll.total >= st) await _nalozSlabyPunkt(actor, item, cel.actor);
}

/** Modyfikacja po rzucie (Łeb jak sklep, Motywacja…) zmienia porażkę w sukces — efekt i tak. */
async function _onRollModified({ message, roll, actor }) {
  const t = message?.getFlag?.(MODULE_ID, FLAG_TEST_SLABY);
  if (!t || !roll || roll.total < t.st || !actor) return;
  const cel = await fromUuid(t.targetUuid);
  if (cel) await _nalozSlabyPunkt(actor, _ma(actor, "slaby-punkt"), cel);
}

/** Słaby punkt w walce i mierzenie Strzelca kończą się z walką (U18, U20). */
async function _onDeleteCombat(combat) {
  if (!game.users.activeGM?.isSelf) return;
  for (const c of combat.combatants) {
    const ids = c.actor?.effects.filter(e => e.getFlag(MODULE_ID, FLAG_SLABY_WALKA) === combat.id
      || e.getFlag(MODULE_ID, FLAG_MIERZENIE)?.combatId === combat.id).map(e => e.id) ?? [];
    if (ids.length) await c.actor.deleteEmbeddedDocuments("ActiveEffect", ids);
  }
}

/* -------------------------------------------- */
/*  Strzelec — stanowisko snajperskie            */
/* -------------------------------------------- */

/** Broń z celownikiem optycznym w ręce (s. 94) albo `null`. */
function _bronSnajperska(actor) {
  return heldItems(actor).map(h => h.item).find(i => i?.type === "weapon" && hasAddon(i, "celownik-optyczny")) ?? null;
}

const _mierzenieEfekty = actor => actor.effects.filter(e => e.getFlag(MODULE_ID, FLAG_MIERZENIE));

/** Karta MG z przyciskiem zatwierdzenia stanowiska. */
async function _kartaStanowiska(actor, linia) {
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id),
    content: flavorKarty(KOLOR, `🎯 Stanowisko snajperskie — ${esc(actor.name)}`, linia)
      + `<button type="button" data-neuro-m7-stanowisko="${esc(actor.uuid)}">Zatwierdź stanowisko</button>`
  });
}

/**
 * Deklaracja gracza (U20). W walce: efekt „Mierzenie” z rundą startu — po 5 rundach bez ruchu MG dostaje przycisk.
 * Poza walką: przycisk od razu („pół minuty minęło”). Status zawsze nakłada MG.
 */
async function _mierzenie(actor) {
  if (actor.statuses?.has(STANOWISKO_SNAJPERSKIE)) {
    ui.notifications.info(`${actor.name} już jest na stanowisku snajperskim.`);
    return;
  }
  const bron = _bronSnajperska(actor);
  const stare = _mierzenieEfekty(actor).map(e => e.id);
  if (stare.length) await actor.deleteEmbeddedDocuments("ActiveEffect", stare);
  const combat = game.combat?.started && kombatantWlasciciela(actor) ? game.combat : null;
  if (!combat) {
    await _kartaStanowiska(actor, `${esc(actor.name)} przygotowuje stanowisko z bronią ${esc(bron?.name ?? "?")} i mierzy `
      + "(5 rund, s. 94). Poza walką — zatwierdź, gdy czas minął.");
    ui.notifications.info("Stanowisko snajperskie: czeka na zatwierdzenie MG.");
    return;
  }
  await actor.createEmbeddedDocuments("ActiveEffect", [{
    name: "Mierzenie (Strzelec)", img: "icons/svg/target.svg", type: "base",
    description: `<p>Precyzyjne mierzenie od rundy ${combat.round} — po ${RUNDY_MIERZENIA} rundach bez ruchu MG zatwierdza `
      + "stanowisko snajperskie (s. 94). Ruch przerywa.</p>",
    flags: { [MODULE_ID]: { [FLAG_MIERZENIE]: { combatId: combat.id, round: combat.round, zgloszone: false } } }
  }]);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: game.users.filter(u => u.isGM || actor.testUserPermission(u, "OWNER")).map(u => u.id),
    content: flavorKarty(KOLOR, `🎯 Mierzenie — ${esc(actor.name)}`,
      `Od rundy ${combat.round} (${esc(bron?.name ?? "?")}). W rundzie ${combat.round + RUNDY_MIERZENIA}, jeśli się nie ruszysz, `
      + "MG dostaje przycisk stanowiska.")
  });
}

/** Aktywny MG, na początku tury aktora: 5 rund mierzenia minęło — karta z przyciskiem (raz). */
export async function sprawdzMierzenie(combat) {
  if (!game.users.activeGM?.isSelf || !combat?.started) return;
  const actor = combat.combatant?.actor;
  const e = actor ? _mierzenieEfekty(actor).find(x => x.getFlag(MODULE_ID, FLAG_MIERZENIE).combatId === combat.id) : null;
  const m = e?.getFlag(MODULE_ID, FLAG_MIERZENIE);
  if (!m || m.zgloszone || combat.round < m.round + RUNDY_MIERZENIA) return;
  await e.setFlag(MODULE_ID, FLAG_MIERZENIE, { ...m, zgloszone: true });
  await _kartaStanowiska(actor, `${RUNDY_MIERZENIA} rund mierzenia bez ruchu (od rundy ${m.round}).`);
}

/** MG: status „Stanowisko snajperskie”, mierzenie zdjęte. */
export async function zatwierdzStanowisko(actor) {
  if (!game.user.isGM || !actor) return;
  const ids = _mierzenieEfekty(actor).map(e => e.id);
  if (ids.length) await actor.deleteEmbeddedDocuments("ActiveEffect", ids);
  await actor.toggleStatusEffect(STANOWISKO_SNAJPERSKIE, { active: true });
}

/** Ruch przerywa mierzenie (status zdejmuje `combat/zdolnosci-walka.mjs`) — u klienta, który przesunął żeton. */
function _onMoveToken(doc, _movement, _operation, user) {
  const actor = doc.actor;
  if (user?.id !== game.user.id || !actor?.isOwner) return;
  const ids = _mierzenieEfekty(actor).map(e => e.id);
  if (ids.length) void actor.deleteEmbeddedDocuments("ActiveEffect", ids);
}

/* -------------------------------------------- */
/*  Celowanie, Szybka gadka, Szybkie badanie     */
/* -------------------------------------------- */

async function _celowanie(actor, item) {
  const tok = zeton(actor);
  if (kombatantWlasciciela(actor) && (tok?.document?.movementHistory?.length ?? 0) > 0) {
    await sygnalNaruszenia(actor, { tytul: `${actor.name} — Celowanie`, linie: ["Ruch w tej turze — Celowanie wymaga bezruchu (s. 94)."] });
  }
  const stare = actor.effects.filter(e => e.getFlag(MODULE_ID, FLAG_CELOWANIE)).map(e => e.id);
  if (stare.length) await actor.deleteEmbeddedDocuments("ActiveEffect", stare);
  await actor.createEmbeddedDocuments("ActiveEffect", [{
    name: "Celowanie", img: item?.img ?? "icons/svg/target.svg", type: "base", origin: item?.uuid ?? null,
    description: "<p>Jeden atak bronią finezyjną albo ogniem pojedynczym z Ułatwieniem (Jeden strzał, s. 94).</p>",
    duration: { value: 1, units: "turns", expiry: "turnStart" },
    flags: { [MODULE_ID]: { [FLAG_CELOWANIE]: true } }
  }]);
}

async function _szybkaAkcja(actor, item) {
  const def = UMIEJETNOSCI_AKCJI[item.getFlag(MODULE_ID, "abilityId")];
  if (!def) return;
  const skill = await foundry.applications.api.DialogV2.wait({
    window: { title: `${item.name} — ${def.akcja}` },
    content: `<p>${esc(def.akcja)} w Akcji Bonusowej — wybierz umiejętność.</p>`,
    buttons: def.skille.map(s => ({ action: s, label: CONFIG.DND5E.skills[s]?.label ?? s })),
    rejectClose: false
  });
  if (skill && def.skille.includes(skill)) await actor.rollSkill({ skill, ...(def.cecha ? { ability: def.cecha } : {}) });
}

/* -------------------------------------------- */
/*  Aktywności zdolności                         */
/* -------------------------------------------- */

/** Broń dla dodatkowego ataku z aktywności (hotbar): ostatni atak w tej turze, który spełnia warunek. */
function _bronUlubiona(actor) {
  return _ostatniAtak(actor, bron => !!ulubionaDla(actor, bron));
}

function _bronPromocji(actor) {
  const z = _ostatniAtak(actor, (_b, m) => !!obronaOf(m)?.melee);
  if (z) return z;
  const bron = heldItems(actor).map(h => h.item).find(i => i?.type === "weapon"
    && i.system.activities?.some(a => a.type === "attack" && a.actionType === "mwak"));
  return bron ? { bron, message: null } : null;
}

const WALIDACJA = {
  "slaby-punkt": () => _slabyPunktCel(),
  "strzelec": actor => (_bronSnajperska(actor) ? {} : { powod: "Stanowisko snajperskie: weź do ręki broń z celownikiem optycznym (s. 94)." }),
  "maszyna-do-zabijania": actor => (actor.statuses?.has("berserk") ? {} : { powod: "Promocja — tylko w Berserku." })
};

/** Synchronicznie — `false` z obietnicy nie zatrzymałby użycia (`Hooks.call`). */
function _onPreUseActivity(activity, usageConfig) {
  const actor = activity?.actor;
  const id = activity?.item?.getFlag(MODULE_ID, "abilityId");
  if (!actor || !id) return;
  if (ULUBIONA_BRON.includes(id)) {
    if (!_lista(activity.item).length) {
      void wybierzUlubiona(actor, activity.item);
      return false;
    }
    const z = _bronUlubiona(actor);
    if (!z) {
      ui.notifications.warn(`${activity.item.name}: najpierw akcja Atakowanie ulubioną bronią w tej turze.`);
      return false;
    }
    if (_brakAmunicji(z.bron)) {
      void _bezAmunicji(actor, z.bron, activity.item.name);
      return false;
    }
    usageConfig.neuroDodatkowy = { bronId: z.bron.id, messageId: z.message?.id ?? null };
    return;
  }
  const w = WALIDACJA[id]?.(actor);
  if (w?.powod) {
    ui.notifications.warn(w.powod);
    return false;
  }
  if (id === "maszyna-do-zabijania") {
    const z = _bronPromocji(actor);
    if (!z) {
      ui.notifications.warn("Promocja: brak broni białej w ręce.");
      return false;
    }
    usageConfig.neuroDodatkowy = { bronId: z.bron.id, messageId: z.message?.id ?? null };
  }
}

function _onPostUseActivity(activity, usageConfig) {
  const actor = activity?.actor;
  const item = activity?.item;
  const id = item?.getFlag(MODULE_ID, "abilityId");
  if (!actor || !id) return;
  const d = usageConfig?.neuroDodatkowy;
  if (d) {
    const bron = actor.items.get(d.bronId);
    const akt = game.messages.get(d.messageId)?.getAssociatedActivity?.() ?? null;
    // Akcję Bonusową aktywności [B] zadeklarowała już warstwa akcji.
    if (bron) {
      void _dodatkowyAtak(actor, bron, {
        activity: akt, zrodlo: item.name, rodzaj: ULUBIONA_BRON.includes(id) ? "ulubiona-bron" : "promocja", deklaruj: false,
        event: usageConfig.event ?? null
      });
    }
    return;
  }
  if (id === "jeden-strzal") void _celowanie(actor, item);
  else if (id === "slaby-punkt") void _slabyPunkt(actor, item);
  else if (id === "strzelec") void _mierzenie(actor);
  else if (UMIEJETNOSCI_AKCJI[id]) void _szybkaAkcja(actor, item);
}

/* -------------------------------------------- */
/*  Długi odpoczynek                             */
/* -------------------------------------------- */

async function _onRestCompleted(actor, result, config) {
  if (!(result?.longRest || config?.type === "long")) return;
  // Słaby punkt poza walką trwa do Długiego odpoczynku (U18); aktorzy świata i niepowiązane żetony oglądanej sceny.
  const kandydaci = [...game.actors, ...(canvas?.tokens?.placeables ?? []).map(t => t.actor).filter(a => a?.isToken)];
  const pozaWalka = e => e.getFlag(MODULE_ID, FLAG_SLABY_PUNKT) === actor.uuid && !e.getFlag(MODULE_ID, FLAG_SLABY_WALKA);
  await usunEfekty(kandydaci.filter(a => a.effects?.some(pozaWalka)), FLAG_SLABY_PUNKT, actor.uuid, { przez: actor });
  // Ulubiona broń: zamiana jednej po treningu (RAW).
  const doZmiany = _zdolnosciUlubionej(actor).filter(i => _lista(i).length);
  for (const item of doZmiany) await item.setFlag(MODULE_ID, FLAG_ZMIANA, true);
  if (!doZmiany.length) return;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    whisper: game.users.filter(u => u.isGM || actor.testUserPermission(u, "OWNER")).map(u => u.id),
    content: flavorKarty(DLUGI_KOLOR, "⭐ Ulubiona broń", `${esc(actor.name)} może po godzinie treningu zamienić jedną Ulubioną broń.`)
      + `<button type="button" data-neuro-m7-ulubiona-zmien="${esc(actor.uuid)}">Zmień Ulubioną broń</button>`
  });
}

/* -------------------------------------------- */
/*  Kliknięcia                                   */
/* -------------------------------------------- */

async function _onClick(event) {
  const stanowisko = event.target.closest?.("[data-neuro-m7-stanowisko]");
  if (stanowisko) {
    event.preventDefault();
    event.stopPropagation();
    if (!game.user.isGM) return;
    stanowisko.disabled = true;
    await zatwierdzStanowisko(await fromUuid(stanowisko.dataset.neuroM7Stanowisko));
    return;
  }
  const zmien = event.target.closest?.("[data-neuro-m7-ulubiona-zmien]");
  if (zmien) {
    event.preventDefault();
    event.stopPropagation();
    const actor = await fromUuid(zmien.dataset.neuroM7UlubionaZmien);
    if (!actor?.isOwner) return;
    for (const item of _zdolnosciUlubionej(actor)) await wybierzUlubiona(actor, item);
    return;
  }
  const btn = event.target.closest?.("[data-neuro-m7-dodatkowy]");
  if (!btn) return;
  event.preventDefault();
  event.stopPropagation();
  const message = game.messages.get(btn.dataset.messageId);
  const actor = message?.getAssociatedActor?.();
  const bron = message?.getAssociatedItem?.();
  if (!actor || !bron || _klikniete.has(message.id)) return;
  btn.disabled = true;
  _klikniete.add(message.id);
  const activity = message.getAssociatedActivity?.() ?? null;
  const wynik = btn.dataset.neuroM7Dodatkowy === "promocja"
    ? await atakPromocja(actor, bron, { activity, event })
    : await atakUlubiona(actor, bron, { activity, event });
  if (!wynik) {
    _klikniete.delete(message.id);
    btn.disabled = false;
  }
}

export function registerZdolnosciAkcje() {
  zarejestrujEfektTuryWlasciciela(e => !!e.getFlag?.(MODULE_ID, FLAG_CELOWANIE) || !!e.flags?.[MODULE_ID]?.[FLAG_CELOWANIE]);
  Hooks.on("dnd5e.preUseActivity", _onPreUseActivity);
  Hooks.on("dnd5e.postUseActivity", _onPostUseActivity);
  Hooks.on("dnd5e.renderChatMessage", _onRenderChatMessage);
  Hooks.on("dnd5e.restCompleted", (actor, result, config) => { void _onRestCompleted(actor, result, config); });
  Hooks.on("neuroshima.rollModified", payload => { void _onRollModified(payload); });
  Hooks.on("deleteCombat", combat => { void _onDeleteCombat(combat); });
  Hooks.on("updateCombat", (combat, changes) => {
    if ("turn" in changes || "round" in changes) void sprawdzMierzenie(combat);
  });
  Hooks.on("moveToken", _onMoveToken);
  document.addEventListener("click", _onClick, { capture: true });
  console.log(`${MODULE_ID} | Akcje zdolności (M7 E4) registered`);
}

/** `game.neuroshima.ulubionaBron` — wybór i podgląd. */
export const ulubionaBronApi = Object.freeze({
  model: modelBroni, dla: ulubionaDla, wybierz: wybierzUlubiona,
  lista: actor => _zdolnosciUlubionej(actor).map(i => ({ zdolnosc: i.name, limit: _limit(i), modele: _lista(i) }))
});

/** Powierzchnia dla testów Quench. */
export const __testing = Object.freeze({
  modelBroni, ulubionaDla, _wolneMiejsce, _limit, _jestDodatkowy, _wTejTurze, _ostatniAtak, _bezAmunicji,
  _dodatkowyAtak, _celowanie, _slabyPunkt, _nalozSlabyPunkt, _onRestCompleted, _mierzenie, _bronSnajperska, FLAG_MIERZENIE
});
