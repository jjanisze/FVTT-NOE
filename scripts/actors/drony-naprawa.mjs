/**
 * Neuroshima 5e — naprawa drona (PLAN_m3_towarzysze.md §7.11, D9, D25, D28; E9).
 *
 *   - **Napraw PW (1 h)** — aktywność uchwytu (RAW s. 83): 2k6 + mod. INT naprawiającego. Narzędzia jak do budowy
 *     drona (hakera i elektronika — z przepisu Hakerstwa); brak — ⚠ i przeklikanie (D23 produkcji). RAW mówi
 *     „swojej maszynie”, RAI — każdy z narzędziami (naprawa M2 nie wymaga Wprawy). PW dochodzą od razu (bezwarunkowe
 *     RAW), godzinę przesuwa MG przyciskiem na karcie. Naprawa ponad 0 PW zdejmuje Wyłączony (`combat/umieranie.mjs`).
 *     W Postoju — zajęcie w budżecie pracy: godzina za drona.
 *   - **Napraw awarię** — aktywność uchwytu dla skutków „do czasu naprawy” (`aktywneAwarie`):
 *     **NOE** — karta MG (T1): [Naprawione] albo naprawa M2 wybranego stopnia (koszt z ceny uchwytu);
 *     **WKK** (D25, D28) — Robota naprawy M2 z konkretnymi częściami wg tabeli §7.11 (`naprawaAwarii`: ułamki
 *     przepisu drona, stopień o jeden wyżej przy PW ≤ ½). Przemijające (5, 10, 12) nie mają czego naprawiać;
 *     autodestrukcja (20) — wrak. Skutek naprawy zdejmuje awarię przez przekaźnik MG (19 to przyczyna Wyłączenia,
 *     którą zdejmuje tylko MG).
 *   - **Wrak** (U11) — bez napraw; złom i surowce rozstrzyga MG (M5).
 */

import { RODZAJE } from "../config/towarzysze-data.mjs";
import { naprawaPW, naprawaAwarii } from "../config/towarzysze-rules.mjs";
import { NAPRAWA } from "../config/production-rules.mjs";
import { przepis as przepisPoId } from "../config/recipes-data.mjs";
import { parseToolExpr, formatToolExpr } from "../config/tool-expr.mjs";
import { isKobaltEnabled } from "../config/settings.mjs";
import { towarzysz } from "./towarzysze.mjs";
import {
  jestUchwytem, dronUchwytu, jestWrakiem, prosbaDoMG, zarejestrujAkcje, AKT_NAPRAW_PW, AKT_NAPRAW_AWARIE
} from "./drony.mjs";
import { aktywneAwarie, naprawAwarie, nazwaAwarii } from "../combat/maszyny.mjs";
import { ocenNarzedzia, kontekstWykonawcy } from "../production/wykonawca.mjs";
import { kartaProdukcji, fmtSurowce } from "../production/karty.mjs";
import { zarejestrujNaprawe, rozpocznijNaprawe } from "../production/naprawa.mjs";
import { registerRestActivity } from "./rest-activities.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const FLAG_KARTA = "dronNaprawaKarta";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const DialogV2 = () => foundry.applications.api.DialogV2;

/* -------------------------------------------- */
/*  Przepis drona: narzędzia i części            */
/* -------------------------------------------- */

/** Przepis budowy drona (Hakerstwo; pod Kobaltem — standardowy z listy profesji). */
export function przepisDrona(dron) {
  const rodzaj = towarzysz(dron)?.rodzaj;
  if (!RODZAJE[rodzaj]) return null;
  return przepisPoId(`hakerstwo/tabela:${rodzaj}`) ?? przepisPoId(`std/tabela:${rodzaj}`);
}

/** Wymóg narzędzi naprawy drona — jak przy budowie (s. 83). */
export function narzedziaNaprawyDrona(dron) {
  return przepisDrona(dron)?.narzedzia ?? "hakera & elektronika";
}

/** Surowce przepisu drona jako `{ CE: 15, … }` (podstawa części WKK, §7.11). */
function _surowcePrzepisu(dron) {
  const out = {};
  for (const l of przepisDrona(dron)?.surowce ?? []) out[l.typy[0]] = (out[l.typy[0]] ?? 0) + (Number(l.gb) || 0);
  return out;
}

function _ocenaNarzedzi(actor, dron) {
  const narzedzia = narzedziaNaprawyDrona(dron);
  const o = ocenNarzedzia(actor, { narzedzia }, { ctx: kontekstWykonawcy(actor) });
  return { narzedzia, ok: !!o.ok, brakuje: o.ok ? null : formatToolExpr(o.brakuje ?? parseToolExpr(narzedzia)) };
}

/* -------------------------------------------- */
/*  Naprawa PW (RAW)                             */
/* -------------------------------------------- */

/** Ile PW brakuje dronowi (0 — pełne). */
function _brakPW(dron) {
  const hp = dron.system.attributes.hp;
  return Math.max(0, (Number(hp.max) || 0) - (Number(hp.value) || 0));
}

/**
 * Rzut 2k6 + mod. INT naprawiającego i PW na dronie (RAW). Zwraca linię opisu albo `null`.
 * @param {Actor} actor  naprawiający
 * @param {Actor} dron
 * @param {{bezNarzedzi?: string|null}} [o]
 */
async function _naprawPW(actor, dron, { bezNarzedzi = null } = {}) {
  const modInt = Number(actor.system.abilities?.int?.mod) || 0;
  const roll = await new Roll(`2d6 + ${modInt}`).evaluate();
  const przyrost = Math.min(_brakPW(dron), naprawaPW(roll.total - modInt, modInt));
  const hp = dron.system.attributes.hp;
  const po = Math.min(Number(hp.max) || 0, (Number(hp.value) || 0) + przyrost);
  await dron.update({ "system.attributes.hp.value": po });
  return { roll, przyrost, po, max: Number(hp.max) || 0, bezNarzedzi };
}

/**
 * Napraw PW (1 h) z uchwytu: narzędzia (⚠ i przeklikanie), rzut, PW, karta z przyciskiem czasu dla MG.
 * @param {Item} item  uchwyt drona
 * @param {{mimoBrakow?: boolean}} [o]
 * @returns {Promise<number|null>} przyrost PW albo `null`, gdy przerwano
 */
export async function naprawPWDrona(item, { mimoBrakow = false } = {}) {
  const actor = item?.parent;
  const dron = dronUchwytu(item);
  if (!actor || !dron) return null;
  if (jestWrakiem(dron)) return ui.notifications.warn(`${item.name}: wraku się nie naprawia — złom i surowce rozstrzyga MG.`), null;
  if (!_brakPW(dron)) return ui.notifications.info(`${dron.name} ma pełne PW.`), null;
  const n = _ocenaNarzedzi(actor, dron);
  if (!n.ok && !mimoBrakow) {
    const ok = await DialogV2().confirm({
      window: { title: "Brakuje narzędzi" },
      content: `<p><i class="fa-solid fa-triangle-exclamation" inert></i> Naprawa drona wymaga narzędzi: <strong>${esc(n.brakuje)}</strong>. `
        + "Naprawiać mimo to? MG zdecyduje.</p>",
      yes: { label: "Naprawiaj", icon: "fa-solid fa-screwdriver-wrench" },
      no: { label: "Anuluj" },
      rejectClose: false
    });
    if (!ok) return null;
  }
  const w = await _naprawPW(actor, dron, { bezNarzedzi: n.ok ? null : n.brakuje });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }), rolls: [w.roll],
    content: kartaProdukcji({
      ikona: dron.img, tytul: `Naprawa: ${dron.name}`, podtytul: "PW drona — godzina pracy (s. 83)", rodzaj: "sukces",
      linie: [`2k6 + mod. INT = <strong>${w.roll.total}</strong> → <strong>+${w.przyrost} PW</strong> (${w.po}/${w.max})`],
      ostrzezenia: w.bezNarzedzi ? [`Bez kompletu narzędzi: ${w.bezNarzedzi} — MG decyduje.`] : [],
      przyciski: [{ akcja: "czas", label: "Przesuń czas o 1:00", gm: true, dane: { minuty: 60 }, ikona: "fa-solid fa-clock" }]
    }),
    flags: { [MODULE_ID]: { dronNaprawaPW: { dron: dron.uuid, przyrost: w.przyrost } } }
  });
  return w.przyrost;
}

/* -------------------------------------------- */
/*  Naprawa awarii                               */
/* -------------------------------------------- */

/** Naprawa każdej trwałej awarii drona w bieżącej warstwie (NOE — decyduje MG; WKK — tabela §7.11). */
export function planNaprawyAwarii(dron, { kobalt = isKobaltEnabled() } = {}) {
  const hp = dron.system.attributes.hp;
  const polowaPW = (Number(hp.value) || 0) <= (Number(hp.max) || 0) / 2;
  const surowce = _surowcePrzepisu(dron);
  return aktywneAwarie(dron).map(a => ({ ...a, naprawa: naprawaAwarii(a.pozycja, { surowce, polowaPW, kobalt }) }));
}

/**
 * Napraw awarię z uchwytu. NOE — karta MG; WKK — okno wyboru awarii i Robota naprawy z częściami.
 * @param {Item} item  uchwyt
 */
export async function naprawAwarieDrona(item) {
  const actor = item?.parent;
  const dron = dronUchwytu(item);
  if (!actor || !dron) return null;
  if (jestWrakiem(dron)) return ui.notifications.warn(`${item.name}: wraku się nie naprawia — złom i surowce rozstrzyga MG.`), null;
  const plan = planNaprawyAwarii(dron);
  if (!plan.length) return ui.notifications.info(`${dron.name} nie ma awarii do naprawy (przemijające schodzą same).`), null;
  if (!isKobaltEnabled()) return _kartaNOE(actor, item, dron, plan);
  return _oknoWKK(actor, item, dron, plan);
}

/** NOE (D9): karta T1 dla MG — [Naprawione] albo stopień naprawy M2. */
async function _kartaNOE(actor, item, dron, plan) {
  const n = _ocenaNarzedzi(actor, dron);
  const wiersze = plan.map(a => `<li><strong>${a.pozycja} — ${esc(a.nazwa)}</strong>
    <div class="neuro-dron-przyciski neuro-gm-only">
      <button type="button" data-action="neuroDronNaprawione" data-pozycja="${a.pozycja}"><i class="fa-solid fa-check" inert></i> Naprawione</button>
      ${Object.entries(NAPRAWA).map(([k, t]) => `<button type="button" data-action="neuroDronNaprawaM2" data-pozycja="${a.pozycja}" data-stopien="${k}">${esc(t.label)}</button>`).join("")}
    </div></li>`).join("");
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-dron-karta">
      <header><img src="${esc(dron.img)}" alt="" width="32" height="32">
        <div><strong>Naprawa awarii</strong> → ${esc(dron.name)}<br><small>naprawia ${esc(actor.name)}</small></div></header>
      <p>Co i czym się naprawia, decyduje MG (s. 146): <em>Naprawione</em> od ręki albo naprawa w wybranym stopniu
        (ST, czas i koszt z tabeli naprawy).</p>
      ${n.ok ? "" : `<p class="neuro-dron-plakietka"><i class="fa-solid fa-triangle-exclamation" inert></i> Bez kompletu narzędzi: ${esc(n.brakuje)}.</p>`}
      <ul class="neuro-dron-awarie">${wiersze}</ul>
    </div>`,
    flags: { [MODULE_ID]: { [FLAG_KARTA]: { uchwyt: item.uuid, naprawia: actor.uuid } } }
  });
  return true;
}

/** WKK (D25, D28): wybór awarii z planem naprawy, potem Robota naprawy z częściami. */
async function _oknoWKK(actor, item, dron, plan) {
  const opis = a => {
    const nw = a.naprawa;
    if (!nw) return "—";
    if (nw.przemijajaca) return "przemija sama";
    if (nw.wrak) return "nienaprawialne — wrak";
    return `${NAPRAWA[nw.stopien].label}: ST ${nw.st}, ${nw.kosci} ${nw.jednostka === "h" ? "h" : "min"} · ${fmtSurowce(nw.surowce)}`
      + (nw.wymiana ? " · wymiana" : "");
  };
  const mozna = plan.filter(a => a.naprawa?.stopien);
  if (!mozna.length) return ui.notifications.info(`${dron.name}: te awarie nie wymagają naprawy (${plan.map(opis).join("; ")}).`), null;
  const n = _ocenaNarzedzi(actor, dron);
  const wynik = await DialogV2().wait({
    window: { title: `Naprawa awarii: ${dron.name}`, icon: "fa-solid fa-screwdriver-wrench" },
    position: { width: 520 },
    content: `<p>Kolor Kobaltu: konkretne części według tego, co się zepsuło (§7.11)${(Number(dron.system.attributes.hp.value) || 0) <= (Number(dron.system.attributes.hp.max) || 0) / 2 ? " — dron na połowie PW albo niżej: stopień wyżej" : ""}.</p>
      ${plan.map(a => `<label class="neuro-dron-awaria"><input type="radio" name="pozycja" value="${a.pozycja}" ${a.naprawa?.stopien ? "" : "disabled"} ${a === mozna[0] ? "checked" : ""}>
        <strong>${a.pozycja} — ${esc(a.nazwa)}</strong>: ${esc(opis(a))}</label>`).join("<br>")}
      ${n.ok ? "" : `<p><label><input type="checkbox" name="mimoBrakow"> Bez kompletu narzędzi (${esc(n.brakuje)}) — naprawiaj mimo to, MG zdecyduje</label></p>`}`,
    buttons: [{
      action: "ok", label: "Napraw", icon: "fa-solid fa-screwdriver-wrench", default: true,
      callback: (e, b) => ({ pozycja: Number(b.form.elements.pozycja.value), mimoBrakow: !!b.form.elements.mimoBrakow?.checked })
    }],
    rejectClose: false
  });
  if (!wynik) return null;
  const a = mozna.find(x => x.pozycja === wynik.pozycja);
  if (!a) return null;
  return rozpocznijNaprawe(actor, item, {
    stopien: a.naprawa.stopien, narzedzia: n.narzedzia, mimoBrakow: n.ok || wynik.mimoBrakow,
    surowce: a.naprawa.surowce, zrodlo: { awaria: a.pozycja, dron: dron.uuid },
    nazwa: `Naprawa: ${dron.name} — ${nazwaAwarii(a.pozycja)}`
  });
}

/** Skutek udanej naprawy uchwytu (`production/naprawa.mjs`): awaria z przepisu znika przez przekaźnik MG. */
async function _skutekNaprawy(item, przepis) {
  const dron = dronUchwytu(item);
  const pozycja = Number(przepis?.zrodlo?.awaria);
  if (!dron) return "drona już nie ma";
  if (!pozycja) return "naprawione (skutek rozstrzyga MG)";
  const kto = item.parent?.isOwner ? item.parent : game.user.character;
  if (!kto) return `awaria ${pozycja} — zdejmie MG`;
  await prosbaDoMG(kto, { akcja: "naprawAwarie", dron: dron.uuid, pozycja });
  return `awaria ${pozycja} (${nazwaAwarii(pozycja)}) naprawiona`;
}

/** Przekaźnik MG: zdejmuje awarię (19 — przyczynę Wyłączenia). */
async function _naprawAwarieMG(_actor, { dron: uuid, pozycja }) {
  const dron = fromUuidSync(uuid);
  if (dron) await naprawAwarie(dron, pozycja);
}

/* -------------------------------------------- */
/*  Karta NOE — przyciski MG                     */
/* -------------------------------------------- */

function _onRenderChatMessage(message, html) {
  const f = message.getFlag(MODULE_ID, FLAG_KARTA);
  if (!f) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!game.user.isGM) {
    root?.querySelectorAll(".neuro-gm-only").forEach(el => el.remove());
    return;
  }
  for (const b of root?.querySelectorAll('button[data-action^="neuroDronNapraw"]') ?? []) {
    b.addEventListener("click", async ev => {
      ev.preventDefault();
      if (!game.user.isGM) return ui.notifications.warn("Naprawę awarii rozstrzyga MG.");
      const item = await fromUuid(f.uchwyt);
      const naprawia = await fromUuid(f.naprawia);
      const dron = dronUchwytu(item);
      if (!item || !dron) return ui.notifications.warn("Tego drona już nie ma.");
      const pozycja = Number(b.dataset.pozycja);
      b.disabled = true;
      if (b.dataset.action === "neuroDronNaprawione") {
        await naprawAwarie(dron, pozycja);
        b.innerHTML = `<i class="fa-solid fa-check" inert></i> Naprawiono`;
        return;
      }
      await rozpocznijNaprawe(naprawia ?? item.parent, item, {
        stopien: b.dataset.stopien, narzedzia: narzedziaNaprawyDrona(dron), mimoBrakow: true,
        zrodlo: { awaria: pozycja, dron: dron.uuid }, nazwa: `Naprawa: ${dron.name} — ${nazwaAwarii(pozycja)}`
      });
    });
  }
}

/* -------------------------------------------- */
/*  Postój: godzina pracy przy dronie            */
/* -------------------------------------------- */

function _dronyDoNaprawy(actor) {
  return (actor?.items?.contents ?? []).filter(jestUchwytem)
    .map(u => ({ u, dron: dronUchwytu(u) }))
    .filter(x => x.dron && !jestWrakiem(x.dron) && _brakPW(x.dron) > 0);
}

registerRestActivity({
  id: "naprawa-dronow",
  label: "Naprawa dronów (1 h za drona)",
  budzet: "praca",
  render(actor) {
    const lista = _dronyDoNaprawy(actor);
    if (!lista.length) return null;
    return lista.map(({ u, dron }) => {
      const hp = dron.system.attributes.hp;
      return `<label class="neuro-zajecie-check"><input type="checkbox" name="neuroZajecia.naprawa-dronow.${u.id}">
        ${esc(dron.name)} — PW ${hp.value}/${hp.max} (2k6 + mod. INT)</label>`;
    }).join("");
  },
  minuty(form) {
    return [...form.querySelectorAll('[name^="neuroZajecia.naprawa-dronow."]')].filter(el => el.checked).length * 60;
  },
  async apply(actor, wartosci) {
    const linie = [];
    let minuty = 0;
    for (const [id, v] of Object.entries(wartosci ?? {})) {
      if (!v) continue;
      const u = actor.items.get(id);
      const dron = dronUchwytu(u);
      if (!dron || jestWrakiem(dron) || !_brakPW(dron)) continue;
      const n = _ocenaNarzedzi(actor, dron);
      const w = await _naprawPW(actor, dron, { bezNarzedzi: n.ok ? null : n.brakuje });
      minuty += 60;
      linie.push(`<strong>${esc(dron.name)}</strong>: 2k6 + INT = ${w.roll.total} → +${w.przyrost} PW (${w.po}/${w.max})`
        + (w.bezNarzedzi ? ` — bez narzędzi (${esc(w.bezNarzedzi)}), MG decyduje` : ""));
    }
    return { linie, minuty };
  }
});

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

function _onPreUseActivity(activity) {
  if (![AKT_NAPRAW_PW, AKT_NAPRAW_AWARIE].includes(activity?.id)) return;
  const item = activity.actor?.items.get(activity.item?.id) ?? activity.item;
  if (!jestUchwytem(item)) return;
  (activity.id === AKT_NAPRAW_PW ? naprawPWDrona(item) : naprawAwarieDrona(item))
    .catch(err => console.error(`${MODULE_ID} | ${activity.name}`, err));
  return false;
}

export function registerDronyNaprawa() {
  zarejestrujAkcje("naprawAwarie", _naprawAwarieMG);
  zarejestrujNaprawe({ test: jestUchwytem, okno: (_actor, item) => naprawAwarieDrona(item), skutek: _skutekNaprawy });
  Hooks.on("dnd5e.preUseActivity", _onPreUseActivity);
  Hooks.on("renderChatMessageHTML", _onRenderChatMessage);
}

export const dronyNaprawaApi = Object.freeze({ naprawPWDrona, naprawAwarieDrona, planNaprawyAwarii, przepisDrona, narzedziaNaprawyDrona });
