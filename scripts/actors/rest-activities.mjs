/**
 * Neuroshima 5e — zajęcia na odpoczynku (PLAN_produkcja §9, etap E5).
 *
 * Postój to nie tylko sen: w KO wolno produkować, naprawiać i czyścić broń, ale **łącznie nie
 * dłużej niż godzinę** — dłużej przerywa odpoczynek (NOE s. 45); w DO pracy jest doba, czyli
 * limit 10 h (s. 145). Rejestr zbiera takie zajęcia od różnych modułów, a oba okna odpoczynku
 * (`restTypes.short/long.dialogClass`) dostają jedną sekcję „Zajęcia” z budżetem na żywo.
 *
 * Klient rejestru deklaruje:
 *   id        — klucz; pola formularza idą jako `neuroZajecia.<id>.*` i scalają się do konfiguracji
 *               odpoczynku dnd5e (tym samym `mergeObject`, co pola systemu),
 *   label, restTypes: ["short", "long"],
 *   budzet    — "praca" (liczy się do KO 1 h / DO 10 h) albo null; może być funkcją rodzaju
 *               odpoczynku (czyszczenie broni dzieli budżet KO, ale nie jest „pracą” DO),
 *   render(actor, restType) → HTML albo null (null = sekcji nie ma),
 *   minuty(form, restType) → ile minut wpisano teraz (do paska budżetu),
 *   apply(actor, wartosc, { restType, result, config }) → { linie: string[], minuty?, poOdpoczynku? }
 *   blokuje(actor, restType, { form, wartosci }) → powód albo null — zajęcie, które zajmuje **cały**
 *               odpoczynek (Pomoc medyczna w WKK, PLAN_m1_walka D7): pozostałe sekcje gasną w oknie
 *               na żywo (`form` — formularz okna) i nie stosują się po odpoczynku (`wartosci` —
 *               `config.neuroZajecia`). Bez okna (`form` i `wartosci` puste) decyduje stan zapisany.
 *
 * **Zastosowanie w `dnd5e.restCompleted`, nie w `pre…`** — anulowany odpoczynek nie zjada godzin.
 * Jedna zbiorcza wiadomość na czacie; przekroczenie budżetu to ostrzeżenie, nie blokada (L9).
 */

import { BUDZET_KO_MIN, BUDZET_DO_MIN, fmtGGMM } from "../config/production-rules.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const KLUCZ = "neuroZajecia";

/** @type {object[]} */
const REJESTR = [];

/** Rejestruje zajęcie odpoczynku. Kolejność rejestracji = kolejność w oknie. */
export function registerRestActivity(def) {
  if (REJESTR.some(d => d.id === def.id)) return;
  REJESTR.push({ restTypes: ["short", "long"], budzet: null, ...def });
}

const _budzetDef = (def, typ) => (typeof def.budzet === "function" ? def.budzet(typ) : def.budzet);

/** Budżet pracy dla rodzaju odpoczynku, w minutach. */
export function budzetPracy(restType) {
  return restType === "long" ? BUDZET_DO_MIN : BUDZET_KO_MIN;
}

function _restType(app) {
  return app.config?.type ?? (app.constructor.name.toLowerCase().includes("long") ? "long" : "short");
}

/* -------------------------------------------- */
/*  Okno odpoczynku                             */
/* -------------------------------------------- */

function _odswiezBudzet(app, root) {
  const typ = _restType(app);
  const form = app.element.querySelector("form") ?? app.element;
  let praca = 0;
  for (const def of REJESTR) {
    if (!def.restTypes.includes(typ) || _budzetDef(def, typ) !== "praca") continue;
    try { praca += Number(def.minuty?.(form, typ)) || 0; } catch { /* pomiń */ }
  }
  const limit = budzetPracy(typ);
  const el = root.querySelector(".neuro-zajecia-budzet");
  if (!el) return;
  const ponad = praca > limit;
  el.classList.toggle("is-ponad", ponad);
  el.innerHTML = `Praca: <strong>${fmtGGMM(praca)}</strong> / ${fmtGGMM(limit)}`
    + (ponad ? (typ === "short"
      ? ` — <strong>ponad godzinę: Krótki odpoczynek przerwany, bez korzyści</strong> (s. 45)`
      : ` — <strong>ponad 10 h pracy tej doby</strong> (s. 145)`) : "");
}

/** Pierwsze zajęcie, które zajmuje cały odpoczynek: `{ def, powod }` albo null. */
function _blokada(actor, typ, ctx) {
  for (const def of REJESTR) {
    if (!def.restTypes.includes(typ) || typeof def.blokuje !== "function") continue;
    let powod = null;
    try { powod = def.blokuje(actor, typ, ctx); } catch (err) { console.warn(`${MODULE_ID} | blokada ${def.id}`, err); }
    if (powod) return { def, powod };
  }
  return null;
}

function _odswiezBlokade(app, root) {
  const actor = app.actor ?? app.document;
  const form = app.element.querySelector("form") ?? app.element;
  const b = _blokada(actor, _restType(app), { form });
  for (const fs of root.querySelectorAll(".neuro-zajecie")) {
    const zablokowana = Boolean(b) && fs.dataset.zajecie !== b.def.id;
    fs.disabled = zablokowana;
    fs.classList.toggle("is-zablokowane", zablokowana);
  }
  const el = root.querySelector(".neuro-zajecia-blokada");
  if (el) {
    el.hidden = !b;
    el.innerHTML = b ? `<i class="fa-solid fa-lock" inert></i> ${b.powod}` : "";
  }
}

function _wstrzyknij(app) {
  const actor = app.actor ?? app.document;
  if (!actor || actor.type !== "character") return;
  if (app.isPartyGroup) return;
  const typ = _restType(app);
  const form = app.element.querySelector("form") ?? app.element.querySelector(".window-content");
  if (!form || form.querySelector(".neuro-zajecia")) return;

  const sekcje = [];
  for (const def of REJESTR) {
    if (!def.restTypes.includes(typ)) continue;
    let html = null;
    try { html = def.render(actor, typ); } catch (err) { console.warn(`${MODULE_ID} | zajęcie ${def.id}`, err); }
    if (html) sekcje.push(`<fieldset class="neuro-zajecie" data-zajecie="${def.id}"><legend>${def.label}</legend>${html}</fieldset>`);
  }
  if (!sekcje.length) return;

  const root = document.createElement("section");
  root.className = "neuro-zajecia";
  root.innerHTML = `<h3 class="neuro-zajecia-tytul"><i class="fa-solid fa-screwdriver-wrench" inert></i> Zajęcia</h3>
    <p class="hint">${typ === "short"
      ? "Produkcja, naprawa i czyszczenie broni — razem najwyżej godzina, dłużej przerywa odpoczynek."
      : "Produkcja i naprawa — do 10 h pracy tej doby."}</p>
    <p class="neuro-zajecia-blokada" hidden></p>
    ${sekcje.join("")}
    <div class="neuro-zajecia-budzet"></div>`;
  const footer = form.querySelector(".form-footer");
  if (footer) footer.before(root);
  else form.append(root);
  const odswiez = () => { _odswiezBlokade(app, root); _odswiezBudzet(app, root); };
  root.addEventListener("input", odswiez);
  root.addEventListener("change", odswiez);
  odswiez();
  app.setPosition?.({ height: "auto" });
}

/** Mixin na klasę okna odpoczynku dnd5e — dokłada sekcję po każdym renderze. */
function _zZajeciami(Base) {
  return class NeuroshimaRestDialogZajecia extends Base {
    /** @inheritDoc */
    async _onRender(context, options) {
      await super._onRender(context, options);
      _wstrzyknij(this);
    }
  };
}

/* -------------------------------------------- */
/*  Zastosowanie                                */
/* -------------------------------------------- */

async function _onRestCompleted(actor, result, config) {
  const wartosci = config?.[KLUCZ];
  if (!wartosci || !actor?.isOwner) return;
  const typ = config.type ?? (result?.longRest ? "long" : "short");
  const linie = [];
  const poOdpoczynku = [];
  let praca = 0;
  const blokada = _blokada(actor, typ, { wartosci });
  if (blokada) linie.push(`<i class="fa-solid fa-lock" inert></i> ${blokada.powod}`);
  for (const def of REJESTR) {
    const v = wartosci[def.id];
    if (v == null || !def.restTypes.includes(typ)) continue;
    if (blokada && def !== blokada.def) continue;
    try {
      const r = await def.apply(actor, v, { restType: typ, result, config });
      if (!r) continue;
      linie.push(...(r.linie ?? []));
      if (_budzetDef(def, typ) === "praca") praca += Number(r.minuty) || 0;
      if (r.poOdpoczynku) poOdpoczynku.push(r.poOdpoczynku);
    } catch (err) {
      console.error(`${MODULE_ID} | zajęcie ${def.id}`, err);
      linie.push(`<span class="bad">${def.label}: błąd — szczegóły w konsoli.</span>`);
    }
  }
  if (!linie.length) return;
  const limit = budzetPracy(typ);
  const ostrzezenie = praca > limit
    ? (typ === "short"
      ? `Ponad godzinę zajęć (${fmtGGMM(praca)}) — Krótki odpoczynek przerwany, bez korzyści (s. 45). MG rozstrzyga.`
      : `${fmtGGMM(praca)} pracy — ponad 10 h tej doby (s. 145).`)
    : null;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-robota-card is-${ostrzezenie ? "braki" : "info"}">
      <header class="neuro-robota-head"><div class="neuro-robota-tytul">
        <strong>${typ === "short" ? "Krótki" : "Długi"} odpoczynek — zajęcia</strong><span>${foundry.utils.escapeHTML(actor.name)}</span>
      </div></header>
      ${linie.map(l => `<p class="neuro-robota-linia">${l}</p>`).join("")}
      ${ostrzezenie ? `<div class="neuro-robota-ostrzezenie"><i class="fa-solid fa-triangle-exclamation" inert></i> ${ostrzezenie}</div>` : ""}
    </div>`
  });
  for (const fn of poOdpoczynku) {
    try { await fn(); } catch (err) { console.error(`${MODULE_ID} | po odpoczynku`, err); }
  }
}

export function registerRestActivities() {
  const rt = CONFIG.DND5E.restTypes;
  for (const typ of ["short", "long"]) {
    if (rt?.[typ]?.dialogClass) rt[typ].dialogClass = _zZajeciami(rt[typ].dialogClass);
  }
  Hooks.on("dnd5e.restCompleted", _onRestCompleted);
}

export const restActivitiesApi = Object.freeze({
  register: registerRestActivity, budzet: budzetPracy, lista: () => [...REJESTR], blokada: _blokada
});
