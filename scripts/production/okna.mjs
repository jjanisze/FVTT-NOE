/**
 * Neuroshima 5e — okna produkcji (PLAN_produkcja §6): start Roboty, praca, korekta, menu Roboty,
 * narzędzia MG (Wprawa, Robota ad hoc). Wszystkie kończą się wywołaniem lejka z `robota.mjs`
 * albo `zp.mjs` — okna niczego nie zapisują same.
 */

import {
  start, pracuj, koryguj, test, porzuc, zatwierdz, zmienST, cofnijStart, ocenaStartu, daneRoboty, kierownikRoboty
} from "./robota.mjs";
import { nadajWprawe } from "./zp.mjs";
import { mnoznikWykonawcy } from "./wykonawca.mjs";
import { pulaAktora } from "./pula.mjs";
import { refDlaPrzedmiotu } from "./wynik.mjs";
import { przenies, przeniesBrakujace, przeniesZestaw } from "./przenoszenie.mjs";
import { druzynyAktora } from "./pula.mjs";
import { fmtSurowce } from "./karty.mjs";
import { KATALOG, PRZEPISY_STANDARDOWE, wszystkiePrzepisy, przepisAdHoc } from "../config/recipes-data.mjs";
import {
  fmtGGMM, parseCzasPracy, czasWykonawcy, sumaGb, alokujSurowce, porzucenieDostepne
} from "../config/production-rules.mjs";
import { formatToolExpr, parseToolExpr, ToolExprError, TOOL_KEYS } from "../config/tool-expr.mjs";
import { SUROWCE_CODES, allGb as allGbSafe } from "../actors/surowce-store.mjs";
import { isKobaltEnabled } from "../config/settings.mjs";

const DialogV2 = () => foundry.applications.api.DialogV2;
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/* -------------------------------------------- */
/*  Start Roboty                                */
/* -------------------------------------------- */

function _opisBrakow(braki) {
  return braki.map(b => {
    const n = TOOL_KEYS[b.key] ?? b.key;
    if (b.status === "brak-bieglosci") return `biegłość ${n}`;
    if (b.status === "pula") return `zestaw ${n} (w puli)`;
    return `zestaw ${n}`;
  }).join(", ");
}

function _podsumowanie(actor, o) {
  const p = o.przepis;
  const zrodlo = p.zrodlo?.wzor ? "wzór (s. 144–146)" : p.zrodlo?.tabela ? `tabela ${p.zrodlo.tabela} (s. ${p.zrodlo.s})` : "ad hoc (MG)";
  const czas = o.mnoznik !== 1
    ? `${fmtGGMM(p.minuty)} → <strong>${fmtGGMM(o.czas)}</strong> (${esc(o.powody.join(", "))})`
    : `<strong>${fmtGGMM(p.minuty)}</strong>`;
  const narz = o.narzedzia.ok
    ? `<span class="ok">✔ ${esc(formatToolExpr(parseToolExpr(p.narzedzia)))}</span>`
    : `<span class="bad">✘ ${esc(formatToolExpr(parseToolExpr(p.narzedzia)))} — brakuje: ${esc(_opisBrakow(o.narzedzia.braki))}</span>`;
  const sur = o.alokacja.ok
    ? `<span class="ok">✔ ${fmtSurowce(o.alokacja.przydzial)}</span>`
    : `<span class="bad">✘ ${fmtSurowce(o.alokacja.przydzial)} — brak ${fmtSurowce(o.alokacja.brak)}</span>`;
  return `
    <p><strong>ST ${o.st}</strong> · czas ${czas} · przepis: ${esc(zrodlo)}</p>
    <p>Dostęp: ${o.zrodla.length ? esc(o.zrodla.map(z => z.label).join(", ")) : '<span class="bad">brak — potrzebny Schemat albo Wprawa</span>'}</p>
    <p>Narzędzia: ${narz}</p>
    <p>Surowce: ${sur}${o.przydasie ? " <em>(Przydasie −50%)</em>" : ""}${o.podzialZmieniony ? " <em>(zmieniony podział)</em>" : ""}</p>
    ${o.ulatwienia.length ? `<p>Test z Ułatwieniem: ${esc(o.ulatwienia.join(", "))}</p>` : ""}
    <p class="hint">Waga Roboty: ${o.wagaWejscia} kg → wynik ${o.wagaWyniku} kg</p>`;
}

/**
 * Okno startu (§6): przepis (gdy kilka dla jednego przedmiotu), miejsce, podział, zgoda na braki.
 * @param {Actor} actor
 * @param {object[]} przepisy  kandydaci dla jednego wyniku — pierwszy jest domyślny
 * @returns {Promise<Item|null>}
 */
export async function oknoStartu(actor, przepisy, { adHocMG = false } = {}) {
  if (!przepisy?.length) return null;
  const kobalt = isKobaltEnabled();
  const miejsca = [actor, ...pulaAktora(actor).filter(a => a.isOwner)];
  let stan = { przepis: przepisy[0], holder: actor, podzial: null };

  const radio = przepisy.length > 1 ? `<fieldset><legend>Przepis</legend>${przepisy.map((p, i) => `
      <label class="neuro-start-radio"><input type="radio" name="przepis" value="${i}" ${i === 0 ? "checked" : ""}>
        ${esc(p.zrodlo?.wzor ? "Standardowy (wzór)" : p.zrodlo?.tabela ? `Tabela: ${p.zrodlo.tabela}` : "Ad hoc")}
        — ST ${p.st}, ${fmtGGMM(p.minuty)}, ${esc(p.surowce.map(l => `${l.gb} ${l.typy.join("/")}`).join(", "))}</label>`).join("")}
    </fieldset>` : "";
  const holderSel = `<label>Miejsce Roboty <select name="holder">${miejsca.map(a =>
    `<option value="${a.uuid}">${a === actor ? "przy sobie" : esc(a.name)}</option>`).join("")}</select></label>`;
  const podzialInputs = SUROWCE_CODES.map(c =>
    `<label class="neuro-start-sur">${c} <input type="number" min="0" step="1" name="p.${c}" value="0"></label>`).join("");

  const content = `<div class="neuro-start">
    ${radio}
    ${holderSel}
    <fieldset><legend>Podział surowców <span class="neuro-start-suma"></span></legend>
      <div class="neuro-start-podzial">${podzialInputs}</div>
      <p class="hint">Domyślny podział jest logiczny i uproszczony — możesz go zmienić, suma zostaje; czat to oznaczy, MG może cofnąć start.</p>
    </fieldset>
    <label class="neuro-start-braki"><input type="checkbox" name="mimoBrakow"> Zacznij mimo braków narzędzi (MG zdecyduje)</label>
    <div class="neuro-start-pula"></div>
    <div class="neuro-start-podsumowanie"></div>
  </div>`;

  const ocen = () => ocenaStartu(actor, stan.przepis, { holder: stan.holder, podzial: stan.podzial, kobalt, adHocMG });

  const odswiez = (form, { resetPodzial = false } = {}) => {
    const o = ocen();
    const auto = alokujSurowce(o.auto, o.zapas).przydzial;
    if (resetPodzial || !stan.podzial) {
      for (const c of SUROWCE_CODES) form.elements[`p.${c}`].value = auto[c] ?? 0;
    }
    form.querySelector(".neuro-start-suma").textContent = `(razem ${sumaGb(o.auto)} gb)`;
    form.querySelector(".neuro-start-braki").hidden = o.narzedzia.ok;
    form.querySelector(".neuro-start-podsumowanie").innerHTML = _podsumowanie(actor, o);
    // 🚚 — braki do pokrycia z puli (§8): surowce wg niedoboru, zestawy w całości.
    const zPuli = [];
    if (!o.alokacja.ok || !alokujSurowce(o.linie, o.zapasAktora).ok) {
      const pula = pulaAktora(actor).filter(a => a.isOwner);
      const razem = { ...o.zapasAktora };
      for (const a of pula) for (const [k, v] of Object.entries(allGbSafe(a))) razem[k] = (razem[k] ?? 0) + v;
      if (alokujSurowce(o.linie, razem).ok && stan.holder === actor) {
        zPuli.push(`<button type="button" data-pula="surowce"><i class="fa-solid fa-truck-ramp-box" inert></i> Przenieś brakujące surowce z puli</button>`);
      }
    }
    for (const b of o.narzedzia.braki ?? []) {
      if (b.status === "pula") zPuli.push(`<button type="button" data-pula="zestaw" data-klucz="${b.key}"><i class="fa-solid fa-toolbox" inert></i> Przenieś zestaw ${esc(TOOL_KEYS[b.key])}</button>`);
    }
    form.querySelector(".neuro-start-pula").innerHTML = zPuli.join("");
  };

  const wynik = await DialogV2().wait({
    window: { title: `Zacznij: ${stan.przepis.nazwa}`, icon: "fa-solid fa-hammer" },
    position: { width: 520 },
    content,
    buttons: [
      {
        action: "start", label: "Zacznij", icon: "fa-solid fa-hammer", default: true,
        callback: (event, button) => {
          const f = button.form;
          return { mimoBrakow: f.elements.mimoBrakow.checked };
        }
      },
      { action: "anuluj", label: "Anuluj" }
    ],
    render: (event, dialog) => {
      const form = dialog.element.querySelector("form") ?? dialog.element;
      form.addEventListener("click", async ev => {
        const b = ev.target.closest("[data-pula]");
        if (!b) return;
        ev.preventDefault();
        b.disabled = true;
        if (b.dataset.pula === "surowce") await przeniesBrakujace(actor, ocen().linie);
        if (b.dataset.pula === "zestaw") await przeniesZestaw(actor, b.dataset.klucz);
        odswiez(form);
      });
      form.addEventListener("change", ev => {
        const el = ev.target;
        if (el.name === "przepis") { stan.przepis = przepisy[Number(el.value)]; stan.podzial = null; odswiez(form, { resetPodzial: true }); return; }
        if (el.name === "holder") { stan.holder = miejsca.find(a => a.uuid === el.value) ?? actor; odswiez(form); return; }
        if (el.name?.startsWith("p.")) {
          const podzial = Object.fromEntries(SUROWCE_CODES.map(c => [c, Math.max(0, Math.floor(Number(form.elements[`p.${c}`].value) || 0))]));
          const auto = alokujSurowce(ocen().auto, ocen().zapas).przydzial;
          const zmieniony = SUROWCE_CODES.some(c => (podzial[c] ?? 0) !== (auto[c] ?? 0));
          stan.podzial = zmieniony ? podzial : null;
          odswiez(form);
        }
      });
      odswiez(form, { resetPodzial: true });
    }
  });
  if (!wynik || wynik === "anuluj") return null;
  return start(actor, stan.przepis, { holder: stan.holder, mimoBrakow: wynik.mimoBrakow, podzial: stan.podzial, adHocMG });
}

/* -------------------------------------------- */
/*  Praca, korekta, menu                         */
/* -------------------------------------------- */

/** [Pracuj…] — 1:00 / 2:00 / 4:00 / 10:00 / do końca albo wpisany czas. */
export async function oknoPracy(item) {
  const r = daneRoboty(item);
  const kier = kierownikRoboty(item);
  if (!r || !kier) return null;
  const m = mnoznikWykonawcy(kier, r.przepis, { kontener: item.parent, naprawa: r.rodzaj === "naprawa" });
  const doKonca = czasWykonawcy(r.wymagane - r.postep, m.mnoznik);
  const presety = [60, 120, 240, 600].filter(x => x < doKonca);
  const wybor = await DialogV2().wait({
    window: { title: `Pracuj: ${r.przepis.nazwa}`, icon: "fa-solid fa-hammer" },
    content: `<p>Zostało <strong>${fmtGGMM(doKonca)}</strong> pracy dla ${esc(kier.name)}`
      + `${m.powody.length ? ` (${esc(m.powody.join(", "))})` : ""}.</p>`
      + `<label>Własny czas (GG:MM albo godziny) <input type="text" name="czas" placeholder="np. 3:30"></label>`,
    buttons: [
      ...presety.map(x => ({ action: String(x), label: fmtGGMM(x) })),
      { action: String(doKonca), label: `Do końca (${fmtGGMM(doKonca)})`, icon: "fa-solid fa-flag-checkered" },
      {
        action: "wlasny", label: "Pracuj", default: true,
        callback: (event, button) => parseCzasPracy(button.form.elements.czas.value) ?? "zly"
      }
    ]
  });
  if (wybor == null) return null;
  if (wybor === "zly") return ui.notifications.warn("Nie rozumiem czasu (np. 4, 2:30, 90m).");
  const minuty = Number(wybor);
  if (!Number.isFinite(minuty) || minuty <= 0) return null;
  return pracuj(item, minuty);
}

/** [±] — korekta postępu (D9: tu MG wpisuje wynik pomocnika). */
export async function oknoKorekty(item) {
  const r = daneRoboty(item);
  if (!r) return null;
  const dane = await DialogV2().wait({
    window: { title: `Korekta: ${r.przepis.nazwa}`, icon: "fa-solid fa-plus-minus" },
    content: `<p>Postęp ${fmtGGMM(r.postep)} / ${fmtGGMM(r.wymagane)}.</p>
      <label>Korekta <input type="text" name="k" placeholder="+5, -3, +10%, =50%" autofocus></label>
      <label>Notatka <input type="text" name="nota" placeholder="np. a za Jima dodaj sobie 10%"></label>
      <p class="hint">Liczby to godziny; „%” liczy od całości; „=” ustawia.</p>`,
    buttons: [{
      action: "ok", label: "Zapisz", default: true,
      callback: (event, button) => ({ k: button.form.elements.k.value, nota: button.form.elements.nota.value })
    }]
  });
  if (!dane?.k) return null;
  return koryguj(item, dane.k, { nota: dane.nota });
}

/** [⋯] — Test, Porzuć (WKK), decyzje MG. Przeniesienie — E4. */
export async function menuRoboty(item) {
  const r = daneRoboty(item);
  if (!r) return null;
  const gm = game.user.isGM;
  const buttons = [];
  if (r.stan === "test") buttons.push({ action: "test", label: "Test końcowy", icon: "fa-solid fa-dice-d20" });
  buttons.push({ action: "przenies", label: "Przenieś do…", icon: "fa-solid fa-right-left" });
  if (porzucenieDostepne()) buttons.push({ action: "porzuc", label: "Porzuć", icon: "fa-solid fa-trash" });
  if (gm && r.braki?.length && !r.zatwierdzone) buttons.push({ action: "zatwierdz", label: "Zatwierdź braki", icon: "fa-solid fa-check" });
  if (gm) buttons.push({ action: "st", label: "Zmień ST", icon: "fa-solid fa-dice-d20" });
  if (gm) buttons.push({ action: "cofnij", label: "Cofnij start", icon: "fa-solid fa-rotate-left" });
  if (!buttons.length) return ui.notifications.info("Nic tu teraz nie da się zrobić — pracuj albo przenieś Robotę.");
  const a = await DialogV2().wait({
    window: { title: r.przepis.nazwa, icon: "fa-solid fa-ellipsis" },
    content: `<p>${fmtGGMM(r.postep)} / ${fmtGGMM(r.wymagane)} · surowce w środku: ${fmtSurowce(r.surowce)}</p>`
      + (porzucenieDostepne() ? "" : `<p class="hint">Bez Koloru Kobaltu Roboty się nie porzuca — tylko kończy (RAW).</p>`),
    buttons
  });
  if (a === "test") return test(item);
  if (a === "przenies") return oknoPrzeniesienia(item);
  if (a === "porzuc") return porzuc(item);
  if (a === "zatwierdz") return zatwierdz(item);
  if (a === "st") return zmienST(item);
  if (a === "cofnij") return cofnijStart(item);
  return null;
}

/**
 * „Przenieś do…” — kierownik, pojazdy i Miejsca z puli, inne postacie drużyny.
 * Na inną postać: przejęcie (nowy kierownik, D19); bez uprawnień do źródła — prośba do MG.
 */
export async function oknoPrzeniesienia(item) {
  const r = daneRoboty(item);
  const kier = kierownikRoboty(item);
  const baza = kier ?? item.parent;
  const cele = [
    kier,
    ...pulaAktora(baza),
    ...druzynyAktora(baza).flatMap(g => (g.system.members ?? []).map(m => m.actor).filter(a => a?.type === "character"))
  ].filter((a, i, arr) => a && a !== item.parent && arr.indexOf(a) === i);
  if (!cele.length) return ui.notifications.info("Nie ma dokąd przenieść — brak pojazdów, Miejsc i drużyny.");
  const uuid = await DialogV2().wait({
    window: { title: `Przenieś: ${r.przepis.nazwa}`, icon: "fa-solid fa-right-left" },
    content: `<p>Teraz: <strong>${esc(item.parent.name)}</strong>${kier ? ` · kierownik: ${esc(kier.name)}` : ""}.</p>
      <label>Dokąd <select name="cel">${cele.map(a => `<option value="${a.uuid}">${esc(a.name)}${a.type === "character" && a !== kier ? " (przejmie Robotę)" : ""}</option>`).join("")}</select></label>`,
    buttons: [{ action: "ok", label: "Przenieś", default: true, callback: (event, button) => button.form.elements.cel.value }]
  });
  if (!uuid) return null;
  const cel = await fromUuid(uuid);
  return cel ? przenies(item, cel) : null;
}

/* -------------------------------------------- */
/*  Narzędzia MG                                */
/* -------------------------------------------- */

/** Etykieta przepisu do listy wyboru. */
function _etykieta(p) {
  const zr = p.zrodlo?.wzor ? "wzór" : p.zrodlo?.tabela ?? "ad hoc";
  return `${p.nazwa} — ${zr}, ${p.cena} gb`;
}

/** Wspólna część okien MG: wybór przepisu z listy albo przeciągnięty przedmiot. */
function _wyborPrzepisuHtml(nazwaPola = "przepis") {
  const opcje = [...PRZEPISY_STANDARDOWE.values()]
    .sort((a, b) => a.nazwa.localeCompare(b.nazwa, "pl"))
    .map(p => `<option value="${esc(_etykieta(p))}"></option>`).join("");
  return `<label>Przepis <input type="text" name="${nazwaPola}" list="neuro-przepisy-lista" placeholder="zacznij pisać nazwę…"></label>
    <datalist id="neuro-przepisy-lista">${opcje}</datalist>
    <div class="neuro-drop-zone">…albo upuść tu przedmiot (z karty, katalogu albo kompendium)</div>
    <div class="neuro-drop-info hint"></div>`;
}

/** Przedmiot z danych upuszczenia (Item uuid). */
async function _itemZUpuszczenia(event) {
  const data = foundry.applications.ux.TextEditor.implementation.getDragEventData(event);
  if (data?.type !== "Item" || !data.uuid) return null;
  return fromUuid(data.uuid);
}

/**
 * Z przeciągniętego przedmiotu: przepis standardowy, gdy jest w katalogu; inaczej ad hoc
 * (cena z przedmiotu, reszta ze wzoru; narzędzia MG dopisuje w oknie).
 */
async function _przepisZPrzedmiotu(item, { narzedzia = "", cena = null } = {}) {
  const ref = await refDlaPrzedmiotu(item);
  if (ref && PRZEPISY_STANDARDOWE.has(`std/${ref}`) && cena == null) return PRZEPISY_STANDARDOWE.get(`std/${ref}`);
  const dane = item.toObject();
  return przepisAdHoc({
    id: `adhoc/${foundry.utils.randomID(12)}`,
    nazwa: item.name,
    cena: cena ?? (Number(item.system?.price?.value) || 0),
    jednorazowy: item.type === "consumable",
    narzedzia: narzedzia || (ref ? KATALOG.get(ref)?.narzedzia ?? "" : ""),
    ref: ref && KATALOG.get(ref)?.wynik === "item" ? ref : null,
    dane: ref ? null : dane
  });
}

function _przepisZEtykiety(tekst) {
  const t = String(tekst ?? "").trim();
  if (!t) return null;
  return [...PRZEPISY_STANDARDOWE.values()].find(p => _etykieta(p) === t)
    ?? wszystkiePrzepisy({ kobalt: isKobaltEnabled() }).find(p => p.nazwa.toLowerCase() === t.toLowerCase())
    ?? null;
}

/**
 * MG: Nadaj Wprawę (D13) — przepis z listy albo przeciągnięty przedmiot, z notatką
 * („noc przy wódce z akwizytorem kotłów → termostat”).
 */
export async function oknoWprawy(actor) {
  if (!game.user.isGM) return ui.notifications.warn("Wprawę nadaje MG.");
  let upuszczony = null;
  const dane = await DialogV2().wait({
    window: { title: `Nadaj Wprawę: ${actor.name}`, icon: "fa-solid fa-graduation-cap" },
    position: { width: 480 },
    content: `<div class="neuro-mg-okno">${_wyborPrzepisuHtml()}
      <label>Cena (gb, dla przedmiotu spoza katalogu) <input type="number" name="cena" min="0" step="1"></label>
      <label>Narzędzia (np. „kowala | stolarza”) <input type="text" name="narzedzia"></label>
      <label>Notatka <input type="text" name="nota" placeholder="skąd ta Wprawa?"></label></div>`,
    buttons: [{
      action: "ok", label: "Nadaj", default: true,
      callback: (event, button) => ({
        tekst: button.form.elements.przepis.value, cena: button.form.elements.cena.value,
        narzedzia: button.form.elements.narzedzia.value, nota: button.form.elements.nota.value
      })
    }],
    render: (event, dialog) => _podepnijUpuszczanie(dialog, item => { upuszczony = item; })
  });
  if (!dane) return null;
  let p;
  try {
    if (dane.narzedzia) parseToolExpr(dane.narzedzia);
    p = upuszczony
      ? await _przepisZPrzedmiotu(upuszczony, { narzedzia: dane.narzedzia, cena: dane.cena === "" ? null : Number(dane.cena) })
      : _przepisZEtykiety(dane.tekst);
  } catch (err) {
    return ui.notifications.error(err instanceof ToolExprError ? err.message : String(err));
  }
  if (!p) return ui.notifications.warn("Wybierz przepis z listy albo upuść przedmiot.");
  await nadajWprawe(actor, p, { nota: dane.nota });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-robota-card is-info"><header class="neuro-robota-head"><div class="neuro-robota-tytul">`
      + `<strong>Wprawa: ${esc(p.nazwa)}</strong><span>od MG</span></div></header>`
      + `${dane.nota ? `<p class="neuro-robota-linia"><em>${esc(dane.nota)}</em></p>` : ""}</div>`
  });
  return p;
}

/**
 * MG: Robota ad hoc — dowolny przedmiot, cena i narzędzia od MG, bez sprawdzania dostępu
 * (MG właśnie go nadaje). Surowce schodzą normalnie.
 */
export async function oknoAdHoc(actor) {
  if (!game.user.isGM) return ui.notifications.warn("Robotę ad hoc zakłada MG.");
  let upuszczony = null;
  const dane = await DialogV2().wait({
    window: { title: `Robota ad hoc: ${actor.name}`, icon: "fa-solid fa-screwdriver-wrench" },
    position: { width: 480 },
    content: `<div class="neuro-mg-okno">${_wyborPrzepisuHtml()}
      <label>Cena (gb) <input type="number" name="cena" min="0" step="1"></label>
      <label>Narzędzia (np. „kowala | stolarza”) <input type="text" name="narzedzia"></label>
      <label><input type="checkbox" name="jednorazowy"> Przedmiot jednorazowy (czas ×0,5)</label></div>`,
    buttons: [{
      action: "ok", label: "Dalej", default: true,
      callback: (event, button) => ({
        tekst: button.form.elements.przepis.value, cena: button.form.elements.cena.value,
        narzedzia: button.form.elements.narzedzia.value, jednorazowy: button.form.elements.jednorazowy.checked
      })
    }],
    render: (event, dialog) => _podepnijUpuszczanie(dialog, item => {
      upuszczony = item;
      const f = dialog.element.querySelector("form");
      if (f && !f.elements.cena.value) f.elements.cena.value = Number(item.system?.price?.value) || 0;
      if (f) f.elements.jednorazowy.checked = item.type === "consumable";
    })
  });
  if (!dane) return null;
  let p;
  try {
    if (dane.narzedzia) parseToolExpr(dane.narzedzia);
    const cena = dane.cena === "" ? null : Number(dane.cena);
    if (upuszczony) {
      p = await _przepisZPrzedmiotu(upuszczony, { narzedzia: dane.narzedzia, cena: cena ?? (Number(upuszczony.system?.price?.value) || 0) });
      p = { ...p, jednorazowy: dane.jednorazowy };
    } else {
      const baza = _przepisZEtykiety(dane.tekst);
      if (!baza) return ui.notifications.warn("Wybierz przepis z listy albo upuść przedmiot.");
      p = przepisAdHoc({
        id: `adhoc/${foundry.utils.randomID(12)}`, nazwa: baza.nazwa, cena: cena ?? baza.cena,
        jednorazowy: dane.jednorazowy || baza.jednorazowy, narzedzia: dane.narzedzia || baza.narzedzia,
        ref: baza.wynik.ref, ilosc: baza.wynik.ilosc
      });
    }
  } catch (err) {
    return ui.notifications.error(err instanceof ToolExprError ? err.message : String(err));
  }
  return oknoStartu(actor, [p], { adHocMG: true });
}

function _podepnijUpuszczanie(dialog, onItem) {
  const zone = dialog.element.querySelector(".neuro-drop-zone");
  const info = dialog.element.querySelector(".neuro-drop-info");
  if (!zone) return;
  zone.addEventListener("dragover", ev => { ev.preventDefault(); zone.classList.add("is-over"); });
  zone.addEventListener("dragleave", () => zone.classList.remove("is-over"));
  zone.addEventListener("drop", async ev => {
    ev.preventDefault();
    zone.classList.remove("is-over");
    const item = await _itemZUpuszczenia(ev);
    if (!item) return;
    onItem(item);
    const ref = await refDlaPrzedmiotu(item);
    zone.textContent = item.name;
    if (info) info.textContent = ref ? `W katalogu: ${KATALOG.get(ref)?.nazwa} (${ref})` : "Spoza katalogu — przepis ad hoc z ceną z przedmiotu.";
  });
}
