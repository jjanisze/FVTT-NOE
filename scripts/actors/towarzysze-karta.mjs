/**
 * Neuroshima 5e — towarzysze na kartach (PLAN_m3_towarzysze.md §7.6, E3).
 *
 *   - **Pasek towarzyszy (D16)** — na karcie właściciela, pod panelem Stan (`sheet-shell.mjs` woła
 *     `pasekTowarzyszy`, bo musi zostać ostatnim słuchaczem renderu karty): portret, PW, Stopień
 *     Zranienia, stany; [Karta], [Komenda] (Partner i zwierzę — U8), [Pokaż żeton]. Właściciel ze
 *     zdolnością, a bez towarzysza: MG widzi [Nowy towarzysz] (narzędzie E4), gracz — podpowiedź szukania
 *     (D30: zajęcie Postoju to M5).
 *     Drony w ekwipunku (E7a) — ten sam wiersz z [Rozłóż]/[Złóż] zamiast Komendy; [Pokaż żeton] drona tylko
 *     przesuwa widok i pulsuje w jego miejscu — nie odbiera kontroli postaci.
 *   - **Plakietka „Towarzysz: <właściciel>”** w nagłówku karty towarzysza, z dymkiem rozkładu wartości
 *     pochodnych („TT 14 = 12 + PB właściciela 2”); bez właściciela — ostrzeżenie „wartości z szablonu”.
 *     Dron: „<rodzaj> · twórca X”, w dymku stempel (D23), posiadacz i „System ruszył <data>”.
 *   - Karta właściciela odświeża się, gdy zmienia się towarzysz (PW, stany) — pasek pokazuje jego stan.
 */

import { RODZAJE, ZRODLA, TURY } from "../config/towarzysze-data.mjs";
import { rozpiszWzor } from "../config/towarzysze-rules.mjs";
import {
  towarzysz, towarzyszeWlasciciela, wlascicielTowarzysza, kontekstyTowarzysza, daneTowarzysza, rodzajTowarzysza
} from "./towarzysze.mjs";
import { getZranienieLvl } from "../combat/zranienie.mjs";
import { wydajKomende } from "../combat/towarzysze-walka.mjs";
import { pigulkiKreatora, przyciskOdlacz } from "./towarzysze-tworzenie.mjs";
import { dronyPosiadacza, posiadaczDrona, uchwytDrona, dronRozlozony, liniaUruchomienia, rozloz, zloz } from "./drony.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/* -------------------------------------------- */
/*  Pasek na karcie właściciela                  */
/* -------------------------------------------- */

/** Zdolności źródłowe właściciela bez towarzysza (z szukaniem — drony się buduje, nie szuka). */
function _zrodlaBezTowarzysza(owner, comps) {
  const ma = new Set(comps.map(c => towarzysz(c).rodzaj));
  const out = [];
  for (const item of owner.items) {
    const id = item.getFlag(MODULE_ID, "abilityId");
    const z = ZRODLA[id];
    if (!z?.szukanie || out.some(o => o.id === id)) continue;
    if (z.rodzaje.some(r => ma.has(r))) continue;
    out.push({ id, ...z });
  }
  return out;
}

function _przycisk(akcja, ikona, tip, { disabled = false } = {}) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "neuro-towarzysz-btn";
  b.dataset.akcja = akcja;
  b.innerHTML = `<i class="fa-solid ${ikona}" inert></i>`;
  b.setAttribute("data-tooltip", tip);
  b.setAttribute("aria-label", tip);
  b.disabled = disabled;
  return b;
}

/** Ikony aktywnych stanów (te same obrazki co na żetonie). */
function _ikonyStanow(actor) {
  const out = [];
  for (const id of actor.statuses ?? []) {
    const s = CONFIG.statusEffects.find(e => e.id === id);
    if (!s?.img) continue;
    out.push(`<img class="neuro-towarzysz-stan-ikona" src="${esc(s.img)}" alt="" data-tooltip="${esc(game.i18n.localize(s.name ?? s.label ?? id))}">`);
  }
  return out.join("");
}

function _wierszTowarzysza(owner, comp, uchwyt = null) {
  const wpis = rodzajTowarzysza(comp);
  const rozlozony = wpis.maszyna && dronRozlozony(comp);
  const widzi = comp.testUserPermission(game.user, "OBSERVER");
  const hp = comp.system.attributes?.hp ?? {};
  const stopien = getZranienieLvl(comp);
  const pct = Number(hp.pct) || 0;
  const poziomPW = pct > 50 ? "ok" : pct > 25 ? "nisko" : "krytycznie";
  const row = document.createElement("div");
  row.className = "neuro-towarzysz-row";
  row.dataset.uuid = comp.uuid;
  row.innerHTML = `
    <img class="neuro-towarzysz-portret" src="${esc(comp.img)}" alt="">
    <div class="neuro-towarzysz-info">
      <div class="neuro-towarzysz-nazwa">${esc(comp.name)}</div>
      <div class="neuro-towarzysz-rodzaj">${esc(wpis.nazwa)}${wpis.maszyna ? ` · ${rozlozony ? "rozłożony" : "złożony"}` : ""}</div>
      ${widzi ? `<div class="neuro-towarzysz-pw" data-tooltip="Punkty Wytrzymałości">
        <div class="neuro-towarzysz-pw-pasek is-${poziomPW}" style="--pct: ${pct}%"></div>
        <span>${Number(hp.value) || 0} / ${Number(hp.effectiveMax ?? hp.max) || 0}</span></div>` : ""}
      <div class="neuro-towarzysz-stan">
        ${wpis.stopnieZranienia ? `<span class="neuro-towarzysz-pipki" data-tooltip="Stopień Zranienia: ${stopien}/4">${
          [1, 2, 3, 4].map(n => `<span class="neuro-towarzysz-pipka${n <= stopien ? " filled" : ""}"></span>`).join("")}</span>` : ""}
        ${widzi ? _ikonyStanow(comp) : ""}
      </div>
    </div>`;
  const przyciski = document.createElement("div");
  przyciski.className = "neuro-towarzysz-przyciski";
  przyciski.append(_przycisk("karta", "fa-id-card", wpis.maszyna ? "Karta drona" : "Karta towarzysza",
    { disabled: !comp.testUserPermission(game.user, "LIMITED") }));
  if (uchwyt) {
    przyciski.append(rozlozony
      ? _przycisk("zloz", "fa-box", "Złóż [A] — dron wraca do ekwipunku (musi stać obok, 1,5 m)", { disabled: !owner.isOwner })
      : _przycisk("rozloz", "fa-box-open", "Rozłóż [A] — postaw drona obok siebie", { disabled: !owner.isOwner }));
  }
  if (wpis.tura === TURY.komenda) {
    przyciski.append(_przycisk("komenda", "fa-bullhorn",
      "Komenda [B] — w twojej turze daje towarzyszowi jego turę; bez komendy unika walki (s. 99–100)",
      { disabled: !owner.isOwner }));
  }
  if (!wpis.maszyna || rozlozony) przyciski.append(_przycisk("zeton", "fa-location-crosshairs", "Pokaż żeton"));
  // Wąska kolumna paska: przyciski na końcu linii stanów, żeby imię miało całą szerokość.
  row.querySelector(".neuro-towarzysz-stan").append(przyciski);
  przyciski.addEventListener("click", ev => _onPrzycisk(ev, owner, comp, uchwyt));
  return row;
}

async function _onPrzycisk(ev, owner, comp, uchwyt) {
  const btn = ev.target.closest("button[data-akcja]");
  if (!btn || btn.disabled) return;
  ev.preventDefault();
  ev.stopPropagation();
  switch (btn.dataset.akcja) {
    case "karta":
      return comp.sheet?.render(true);
    case "komenda":
      btn.disabled = true;
      try {
        await wydajKomende(owner, { zrodlo: rodzajTowarzysza(comp).zrodlo });
      } finally {
        btn.disabled = false;
      }
      return;
    case "rozloz":
    case "zloz":
      btn.disabled = true;
      try {
        await (btn.dataset.akcja === "rozloz" ? rozloz(uchwyt) : zloz(uchwyt));
      } finally {
        btn.disabled = false;
      }
      return;
    case "zeton": {
      const token = comp.getActiveTokens?.(true)?.[0] ?? null;
      if (!token) return ui.notifications.info(`${comp.name} nie ma żetonu na tej scenie.`);
      // Dron: tylko miejsce (puls widzi sam klikający) — sterowanie i jego widok idą przez kontroler (§7.10).
      if (rodzajTowarzysza(comp).maszyna) canvas.controls.drawPing(token.center, { style: "pulse", user: game.user });
      else if (token.isOwner) token.control({ releaseOthers: true });
      return canvas.animatePan({ x: token.center.x, y: token.center.y, duration: 250 });
    }
  }
}

/**
 * Pasek towarzyszy na karcie właściciela albo `null`, gdy nie ma czego pokazać.
 * @param {Actor} owner
 * @returns {HTMLElement|null}
 */
export function pasekTowarzyszy(owner) {
  if (owner?.type !== "character" || towarzysz(owner)) return null;
  const comps = towarzyszeWlasciciela(owner);
  const braki = _zrodlaBezTowarzysza(owner, comps);
  const drony = dronyPosiadacza(owner);
  if (!comps.length && !braki.length && !drony.length) return null;

  const panel = document.createElement("div");
  panel.className = "neuro-towarzysze-panel";
  panel.innerHTML = `<h3 class="icon"><i class="fa-solid fa-paw" inert></i><span class="roboto-upper">Towarzysze</span></h3>`;
  const body = document.createElement("div");
  body.className = "neuro-towarzysze-body";
  for (const c of comps) body.append(_wierszTowarzysza(owner, c));
  for (const d of drony) body.append(_wierszTowarzysza(owner, d.dron, d.uchwyt));

  const nowy = game.neuroshima?.towarzysze?.nowy;
  for (const z of braki) {
    const p = document.createElement("div");
    p.className = "neuro-towarzysz-brak";
    if (game.user.isGM && typeof nowy === "function") {
      p.innerHTML = `<button type="button" class="neuro-towarzysz-nowy"><i class="fa-solid fa-user-plus" inert></i> Nowy towarzysz: ${esc(z.nazwa)}</button>`;
      p.querySelector("button").addEventListener("click", ev => {
        ev.preventDefault();
        nowy(owner, z.id);
      });
    } else {
      p.innerHTML = `<i class="fa-solid fa-magnifying-glass" inert></i> <span><strong>${esc(z.nazwa)}:</strong> szukanie — `
        + `${z.szukanie.godziny} h (${esc(z.szukanie.strona)}). Zapytaj MG, czy w tym miejscu da się szukać.</span>`;
    }
    body.append(p);
  }
  panel.append(body);
  return panel;
}

/* -------------------------------------------- */
/*  Plakietka na karcie towarzysza               */
/* -------------------------------------------- */

/** Wiersze dymka: „TT 14 = 12 + PB właściciela 2”. */
export function rozkladTowarzysza(actor) {
  const t = towarzysz(actor);
  if (!t) return [];
  const wpis = RODZAJE[t.rodzaj];
  const dane = kontekstyTowarzysza(actor);
  const w = daneTowarzysza(actor)?.wartosci ?? {};
  const linie = [];
  const wzory = wpis.wzory ?? {};
  if (wzory.pwMaks && w.pwMaks !== null && w.pwMaks !== undefined) linie.push(`PW ${w.pwMaks} = ${rozpiszWzor(wzory.pwMaks, dane)} (min. 1)`);
  if (wzory.tt && w.tt !== null && w.tt !== undefined) linie.push(`TT ${w.tt} = ${rozpiszWzor(wzory.tt, dane)}`);
  if (w.kw) {
    const ile = wpis.kw.mnoznik === 1 ? "poziom klasy właściciela" : "½ poziomu klasy właściciela, w dół, min. 1";
    linie.push(`KW ${w.kw.ile}k${w.kw.kosc} — ${ile}`);
  }
  if (wzory.atak && w.atak !== null && w.atak !== undefined) linie.push(`Atak ${w.atak >= 0 ? "+" : ""}${w.atak} = ${rozpiszWzor(wzory.atak, dane)}`);
  if (wpis.pb !== null && wpis.pb !== undefined) linie.push(`PB +${wpis.pb} — nie rośnie (${wpis.strona})`);
  if (wpis.typAktora === "character" && !wpis.maszyna) linie.push("Biegłości w broni i pancerzu — także te właściciela");
  return linie;
}

/** Plakietka drona: twórca ze stempla (D23), posiadacz uchwytu, data uruchomienia. */
function _plakietkaDrona(actor, t, wpis) {
  const holder = posiadaczDrona(actor);
  const badge = document.createElement("div");
  badge.className = "neuro-towarzysz-badge";
  badge.innerHTML = `<i class="fa-solid fa-microchip" inert></i> <span>${esc(`${wpis.nazwa} · twórca ${t.tworca?.nazwa || "nieznany"}`)}</span>`;
  const linie = rozkladTowarzysza(actor);
  if ((daneTowarzysza(actor)?.brak ?? []).includes("operator")) {
    linie.push("Atak i ST obszarowe liczą się ze Zręczności operatora — teraz drona nikt nie steruje.");
  }
  linie.push(holder
    ? `Uchwyt: ${holder.name} (${uchwytDrona(actor)?.flags?.[MODULE_ID]?.dron?.rozlozony ? "rozłożony" : "złożony"})`
    : "Bez uchwytu — dron nie jest w niczyim ekwipunku.");
  const start = liniaUruchomienia(actor);
  if (start) linie.push(start);
  badge.setAttribute("data-tooltip", linie.map(esc).join("<br>"));
  if (holder?.testUserPermission(game.user, "LIMITED")) {
    badge.classList.add("is-link");
    badge.addEventListener("click", ev => {
      ev.preventDefault();
      holder.sheet?.render(true);
    });
  }
  return badge;
}

function _plakietka(root, actor) {
  root.querySelectorAll(".neuro-towarzysz-badge, .neuro-kreator").forEach(n => n.remove());
  const t = towarzysz(actor);
  if (!t) return;
  if (RODZAJE[t.rodzaj].maszyna) {
    const badge = _plakietkaDrona(actor, t, RODZAJE[t.rodzaj]);
    const anchor = root.querySelector(".sheet-header .document-name");
    if (anchor) anchor.after(badge);
    else root.querySelector(".sheet-header")?.prepend(badge);
    return;
  }
  const wl = wlascicielTowarzysza(actor);
  const brak = daneTowarzysza(actor)?.brak ?? [];
  const badge = document.createElement("div");
  badge.className = `neuro-towarzysz-badge${wl ? "" : " is-brak"}`;
  const wpis = RODZAJE[t.rodzaj];
  const tekst = wl ? `${wpis.nazwa} · ${wl.name}` : `${wpis.nazwa} · brak właściciela`;
  badge.innerHTML = `<i class="fa-solid ${wl ? "fa-link" : "fa-link-slash"}" inert></i> <span>${esc(tekst)}</span>`;
  const linie = wl ? rozkladTowarzysza(actor)
    : ["Właściciela nie ma w świecie — wartości z szablonu. MG: narzędzie towarzysza albo [Odłącz]."];
  if (wl && brak.length) linie.push(`Brakuje: ${brak.join(", ")} — te wartości z szablonu.`);
  badge.setAttribute("data-tooltip", linie.map(esc).join("<br>"));
  if (wl?.testUserPermission(game.user, "LIMITED")) {
    badge.classList.add("is-link");
    badge.addEventListener("click", ev => {
      ev.preventDefault();
      wl.sheet?.render(true);
    });
  }
  const odlacz = przyciskOdlacz(actor);
  if (odlacz) badge.append(odlacz);
  const anchor = root.querySelector(".sheet-header .document-name");
  if (anchor) anchor.after(badge);
  else root.querySelector(".sheet-header")?.prepend(badge);
  const kreator = pigulkiKreatora(actor);
  if (kreator) badge.after(kreator);
}

function _onRenderSheet(app, html) {
  const actor = app.document ?? app.actor;
  if (!actor || !["character", "npc"].includes(actor.type)) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;
  try {
    _plakietka(root, actor);
  } catch (err) {
    console.error(`${MODULE_ID} | plakietka towarzysza`, err);
  }
}

/* -------------------------------------------- */
/*  Odświeżanie karty właściciela                */
/* -------------------------------------------- */

const _doOdswiezenia = new Set();
let _zaplanowane = false;

function _odswiezWlasciciela(actor) {
  const wl = wlascicielTowarzysza(actor) ?? posiadaczDrona(actor);
  if (!wl?.sheet?.rendered) return;
  _doOdswiezenia.add(wl);
  if (_zaplanowane) return;
  _zaplanowane = true;
  queueMicrotask(() => {
    _zaplanowane = false;
    for (const a of _doOdswiezenia) a.sheet?.render(false);
    _doOdswiezenia.clear();
  });
}

export function registerTowarzyszeKarta() {
  for (const hook of ["renderCharacterActorSheet", "renderNPCActorSheet"]) Hooks.on(hook, _onRenderSheet);
  Hooks.on("updateActor", actor => { if (towarzysz(actor)) _odswiezWlasciciela(actor); });
  for (const hook of ["createActiveEffect", "updateActiveEffect", "deleteActiveEffect"]) {
    Hooks.on(hook, effect => { if (effect.parent instanceof Actor && towarzysz(effect.parent)) _odswiezWlasciciela(effect.parent); });
  }
  Hooks.on("createActor", actor => { if (towarzysz(actor)) _odswiezWlasciciela(actor); });
  Hooks.on("deleteActor", actor => { if (towarzysz(actor)) _odswiezWlasciciela(actor); });
}
