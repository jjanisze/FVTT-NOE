/**
 * Neuroshima 5e — panel ekonomii tury na karcie (PLAN_m8_ruch_i_ekonomia_akcji §8.1, E7 — dostęp bez makr).
 *
 * W panelu Stan, w walce: pozostały ruch w bieżącym trybie i pule A/B/R/I (pozostałe/pojemność, D6), przyciski
 * deklaracji (Przyspieszenie, Bieganie, Unikanie, Odstąpienie, Padnij/Powstań), kalkulator Skoku, Pomóż, Wyczekaj,
 * Reaguj (wykonanie przygotowania, uzbrojenie, reakcja słowna), trwałe ostrzeżenia ruchu, przygotowania i pomoc
 * od sojuszników, trwająca reakcja z [Zakończ reakcję] i [Skoryguj]. Pusta makrolista niczego nie odbiera.
 *
 * Przyciski niczego nie blokują (§1 zasada 3): niespełniony warunek (Powalenie, poza turą) to ostrzeżenie po wykonaniu.
 * Aktywny stan Unikania/Biegania: klik zdejmuje sam stan (korekta stanu, bez zwrotu akcji).
 *
 * Panel odświeża się w miejscu przy zmianie ledgera i tury (bez ponownego renderu całej karty).
 */

import * as E from "../config/ekonomia-data.mjs";
import { stan, FLAGA_LEDGER } from "../combat/ekonomia.mjs";
import { deklaruj, koryguj, zakonczReakcje, wyczekaj, reaguj, uzbroj, uzbrojona, zadeklaruj } from "./actions.mjs";
import { oknoPomocy, pomoce } from "../combat/pomaganie.mjs";
import { oknoSkoku } from "../combat/skok.mjs";
import { openManeuverDialog } from "../combat/melee-maneuvers.mjs";
import { SKROTY, WARIANTY_SZYBKICH_NOG, SZABLONY } from "../config/pasek-data.mjs";
import { makroSkrotu, ulozPasek, klasaSzablonu } from "./pasek-szablony.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const KLASA = "neuro-m8-panel";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

const PRZYCISKI = Object.freeze([
  { id: "przyspieszenie", label: "Przyspiesz", icon: "fa-person-walking-arrow-right",
    tip: "Przyspieszenie [A]: dodatkowy ruch równy Szybkości wybranego trybu, z chwili wykonania (s. 21, 29). Nie przy Powaleniu." },
  { id: "bieganie", label: "Biegnij", icon: "fa-person-running", status: "bieganie",
    tip: "Bieganie [A]: +2× Szybkość, Utrudnienie do twoich ataków do początku następnej tury; ataki dystansowe przeciw tobie z Utrudnieniem do końca tej tury (s. 30). Tylko na nogach, nie przy Powaleniu." },
  { id: "unikanie", label: "Unik", icon: "fa-person-falling-burst", status: "dodging",
    tip: "Unikanie [A]: do początku następnej tury ataki przeciw tobie z Utrudnieniem, jeśli widzisz napastnika; Ułatwienie do RO na Zręczność (s. 30)." },
  { id: "odstapienie", label: "Odstąp", icon: "fa-person-walking-arrow-loop-left",
    tip: "Odstąpienie [A]: twój ruch nie prowokuje ataków okazyjnych do końca tej tury (s. 30)." }
]);

/** Linia licznika A/B/R/I z dymkiem: źródła wydatków i zakaz. */
function _licznik(kind, p, ops) {
  const el = document.createElement("span");
  const n = p.pozostalo;
  el.className = `neuro-m8-licznik${n < 0 ? " ponad" : ""}${p.zakaz ? " zakaz" : ""}`;
  el.dataset.kind = kind;
  el.textContent = `${kind} ${E.licznik(p)}`;
  const zrodla = ops.filter(o => (o.koszt?.[kind] ?? 0) !== 0).map(o => `${esc(o.zrodlo)}${o.rodzaj === "korekta" ? " (korekta)" : ""}`);
  const ogr = Object.entries(p.ogr ?? {}).map(([k, v]) => `+${v.pojemnosc - v.wydane} tylko do: ${k === "uzywanie" ? "Używania" : esc(k)}`);
  el.dataset.tooltip = `<strong>${E.NAZWY[kind]}</strong>: ${E.licznik(p)}`
    + (zrodla.length ? `<br>${zrodla.join(", ")}` : "")
    + (ogr.length ? `<br>${ogr.join("<br>")}` : "")
    + (p.zakaz ? `<br><strong>${esc(p.zakaz)}</strong>` : "");
  return el;
}

/** Operacje panelu, które dają się przeciągnąć na pasek jako działający skrót (§8.3). */
const TYP_SKROTU = "neuroM8Skrot";

function _przycisk({ label, icon, tip, aktywny = false, editable = true, akcja = null, onClick }) {
  const btn = document.createElement("button");
  btn.type = "button";
  if (akcja) btn.dataset.akcja = akcja;
  if (akcja && SKROTY[akcja]) {
    // Przeciągnij na pasek makr — działający skrót tej samej operacji (bez pisania makra).
    btn.draggable = true;
    btn.addEventListener("dragstart", ev => {
      ev.dataTransfer?.setData("text/plain", JSON.stringify({ type: TYP_SKROTU, akcja }));
    });
  }
  btn.className = `neuro-akcja-btn${aktywny ? " active" : ""}`;
  btn.innerHTML = `<i class="fa-solid ${icon}" inert></i>`;
  const span = document.createElement("span");
  span.textContent = label;
  btn.appendChild(span);
  btn.dataset.tooltip = tip;
  btn.setAttribute("aria-pressed", aktywny ? "true" : "false");
  btn.disabled = !editable;
  if (editable) btn.addEventListener("click", async ev => {
    ev.preventDefault();
    ev.stopPropagation();
    btn.disabled = true;
    try { await onClick(); } finally { btn.disabled = false; }
  });
  return btn;
}

/** Okno korekty: delty akcji i ruchu z powodem — normalna funkcja, nie edycja flag (§8.1). */
async function _oknoKorekty(actor) {
  const DialogV2 = foundry.applications.api.DialogV2;
  const pola = E.RODZAJE.map(k => `<label>${k} <input type="number" name="${k}" value="0" step="1" style="width:4em"></label>`).join(" ");
  const dane = await DialogV2.input({
    window: { title: `Skoryguj — ${actor.name}` },
    content: `<p>Dopisz (+) albo zwolnij (−) wydatek w tej turze. Dowody innych operacji zostają.</p>`
      + `<div style="display:flex;gap:6px;flex-wrap:wrap">${pola}</div>`
      + `<label>Ruch (m) <input type="number" name="ruch" value="0" step="0.5" style="width:5em"></label>`
      + `<p class="hint">Ruch +: dodatkowa pojemność (np. narracyjnie przyznany ruch); −: odjęta.</p>`
      + `<label>Powód <input type="text" name="powod" placeholder="np. akcja słowna"></label>`,
    ok: { label: "Zapisz korektę" },
    rejectClose: false
  });
  if (!dane) return;
  const koszt = {};
  for (const k of E.RODZAJE) if (Number(dane[k])) koszt[k] = Number(dane[k]);
  const powod = String(dane.powod || "korekta ręczna");
  if (Object.keys(koszt).length) await koryguj(actor, { koszt, powod });
  if (Number(dane.ruch)) await koryguj(actor, { ruch: Number(dane.ruch), powod });
}

/** Okno Wyczekania: opcjonalna notatka i preferowana czynność — bez edytora warunku i bez akceptacji MG (D21). */
async function _oknoWyczekania(actor) {
  const czynnosci = ["", "Atak", "Bieganie", "Przyspieszenie", "Unikanie", "Pomaganie", "Przedmiot", "inna"];
  const dane = await foundry.applications.api.DialogV2.input({
    window: { title: `Wyczekanie — ${actor.name}`, icon: "fa-solid fa-hourglass-half" },
    position: { width: 420 },
    content: `<p class="hint">Akcja teraz; wykonanie później za Reakcję. Pominięta okazja niczego nie wydaje; początek `
      + `twojej następnej tury kończy przygotowanie (s. 30). Oba pola można zostawić puste — wystarczy słowo przy stole.</p>`
      + `<div class="form-group"><label>Czynność</label><select name="akcja">`
      + czynnosci.map(c => `<option value="${esc(c)}">${c ? esc(c) : "—"}</option>`).join("") + `</select></div>`
      + `<div class="form-group"><label>Notatka</label><input type="text" name="opis" placeholder="np. strzelam, gdy wyjdzie zza rogu"></div>`,
    ok: { label: "Wyczekaj", icon: "fa-solid fa-hourglass-half" },
    rejectClose: false
  });
  if (!dane) return null;
  return wyczekaj(actor, { opis: String(dane.opis || dane.akcja || ""), akcja: dane.akcja || null });
}

/** Okno Reakcji: wykonanie przygotowania, uzbrojenie następnej akcji albo reakcja zagrana słownie. */
async function _oknoReakcji(actor, przygotowania) {
  const buttons = [
    ...przygotowania.map((p, i) => ({ action: `p${i}`, label: `Wykonaj: ${p.opis || "przygotowana akcja"}`, icon: "fa-solid fa-bolt" })),
    { action: "uzbroj", label: "Uzbrój — następna akcja w Reakcji", icon: "fa-solid fa-crosshairs" },
    { action: "slowna", label: "Reakcja zagrana słownie", icon: "fa-solid fa-comment" }
  ];
  const wybor = await foundry.applications.api.DialogV2.wait({
    window: { title: `Reakcja — ${actor.name}`, icon: "fa-solid fa-bolt" },
    position: { width: 440 },
    content: `<p class="hint">R raz na rundę (s. 37). Wykonanie przygotowania otwiera reakcję — Biegnij/Przyspiesz, przedmiot `
      + `albo Pomóż należą wtedy do niej bez drugiej R. Uzbrojenie niczego nie wydaje: następna akcja (przedmiot, deklaracja) `
      + `pójdzie w Reakcji także w twojej turze. Atak poza turą idzie w R sam.</p>`,
    buttons, rejectClose: false
  });
  if (!wybor) return null;
  if (wybor === "uzbroj") { uzbroj(actor); odswiezPanele([actor]); return { uzbrojona: true }; }
  if (wybor === "slowna") return reaguj(actor, { slowna: true });
  const p = przygotowania[Number(String(wybor).slice(1))];
  return p ? reaguj(actor, { przygotowanie: p.id }) : null;
}

/**
 * Panel ekonomii tury albo null (poza walką, aktor nie walczy).
 * @param {Actor} actor
 * @param {boolean} editable
 * @returns {HTMLElement|null}
 */
export function panelEkonomii(actor, editable) {
  const s = stan(actor);
  if (!s) return _rzadPaska(actor, editable);
  const { pule, ruch, chwila, ledger: l } = s;
  const panel = document.createElement("div");
  panel.className = `neuro-stan-row ${KLASA}`;
  panel.dataset.actorUuid = actor.uuid;

  const liczniki = document.createElement("div");
  liczniki.className = "neuro-m8-liczniki";
  const r = document.createElement("span");
  const ponad = ruch.dostepny && ruch.pozostalo < 0;
  r.className = `neuro-m8-licznik ruch${ponad ? " ponad" : ""}${ruch.dostepny ? "" : " niedostepny"}`;
  r.innerHTML = `<i class="fa-solid fa-shoe-prints" inert></i> `;
  r.append(ruch.dostepny ? `${E.metry(ruch.pozostalo)}/${E.metry(ruch.pojemnosc)} m` : "—");
  const granty = ruch.granty.map(g => `${esc(g.zrodlo)} +${E.metry(g.ile)} m`);
  r.dataset.tooltip = `<strong>Ruch</strong> (${esc(ruch.tryb)}): `
    + (ruch.dostepny ? `pozostało ${E.metry(ruch.pozostalo)} z ${E.metry(ruch.pojemnosc)} m, wydano ${E.metry(ruch.wydane)} m`
      + `${s.reakcja ? " — w reakcji: tylko jej świeży grant (D30)" : ` (Szybkość ${E.metry(ruch.szybkosc)} m)`}` : esc(ruch.powod ?? ""))
    + (granty.length ? `<br>${granty.join("<br>")}` : "")
    + (ruch.reczne?.length ? `<br><strong>Rozstrzygnij ręcznie</strong> (Kolor Kobaltu wyłączony): ${ruch.reczne.map(esc).join("; ")}` : "");
  if (ruch.reczne?.length) r.append(" (ręcznie)");
  liczniki.appendChild(r);
  const opsCyklu = l.ops.filter(o => o.cykl === chwila.cykl);
  for (const k of E.RODZAJE) liczniki.appendChild(_licznik(k, pule[k], opsCyklu));
  panel.appendChild(liczniki);

  const rzad = document.createElement("div");
  rzad.className = "neuro-stan-akcje";
  for (const p of PRZYCISKI) {
    const aktywny = !!p.status && actor.statuses?.has(p.status);
    rzad.appendChild(_przycisk({
      label: p.label, icon: p.icon, editable, aktywny, akcja: p.status ?? p.id,
      tip: aktywny ? `${p.tip}<br><strong>Klik zdejmuje stan</strong> (bez zwrotu akcji).` : `${p.tip}${chwila.wlasna ? "" : "<br>Poza twoją turą — wykonanie w Reakcji."}`,
      onClick: () => (aktywny ? actor.toggleStatusEffect(p.status, { active: false }) : deklaruj(actor, p.id))
    }));
  }
  const lezy = actor.statuses?.has("prone");
  rzad.appendChild(_przycisk({
    label: lezy ? "Powstań" : "Padnij", icon: lezy ? "fa-person-arrow-up-from-line" : "fa-person-arrow-down-to-line", editable,
    akcja: lezy ? "powstan" : "padnij",
    tip: lezy ? "Powstań: kosztuje połowę Szybkości (s. 37)." : "Padnij: Powalenie, zużywa resztę ruchu; nie przy Szybkości 0 (s. 26).",
    onClick: () => deklaruj(actor, lezy ? "powstan" : "padnij")
  }));
  rzad.appendChild(_przycisk({
    label: "Pomóż", icon: "fa-handshake-angle", editable, akcja: "pomoz",
    tip: "Pomaganie [A] (s. 30): w teście — twój test ST 10, sukces daje sojusznikowi Ułatwienie w następnym zgodnym teście; "
      + "w ataku — wróg do 1,5 m od ciebie, Ułatwienie w jego następnym ataku na ten cel; albo słownie."
      + (chwila.wlasna ? "" : "<br>Poza twoją turą — wykonanie w Reakcji."),
    onClick: () => oknoPomocy(actor)
  }));
  rzad.appendChild(_przycisk({
    label: "Wyczekaj", icon: "fa-hourglass-half", editable, akcja: "wyczekaj",
    tip: "Wyczekanie [A] (s. 30): przygotuj akcję na później; wykonanie za Reakcję. Notatka opcjonalna.",
    onClick: () => _oknoWyczekania(actor)
  }));
  const przyg = E.aktywnePrzygotowania(l, chwila);
  rzad.appendChild(_przycisk({
    label: uzbrojona(actor) ? "Reaguj ●" : "Reaguj", icon: "fa-bolt", editable, akcja: "reaguj", aktywny: uzbrojona(actor),
    tip: "Reakcja: wykonaj przygotowanie, uzbrój następną akcję albo zapisz reakcję zagraną słownie."
      + (przyg.length ? `<br>Przygotowane: ${przyg.map(p => esc(p.opis || "akcja")).join(", ")}` : ""),
    onClick: () => (uzbrojona(actor) && !przyg.length ? (uzbroj(actor, false), odswiezPanele([actor])) : _oknoReakcji(actor, przyg))
  }));
  rzad.appendChild(_przycisk({
    label: "Skok", icon: "fa-person-running-fast", editable: true, akcja: "skok",
    tip: "Skok: zasięg w dal i wzwyż z rozbiegu i z miejsca (NOE s. 256). Koszt 1:1 z ruchu; wybór trybu Skok niczego nie wydaje.",
    onClick: () => oknoSkoku(actor)
  }));
  panel.appendChild(rzad);

  const dol = document.createElement("div");
  dol.className = "neuro-m8-dol";
  for (const o of [...new Set(s.ostrzezenia)]) {
    const w = document.createElement("span");
    w.className = "neuro-m8-ostrz";
    w.innerHTML = `<i class="fa-solid fa-triangle-exclamation" inert></i> `;
    w.append(o);
    dol.appendChild(w);
  }
  for (const p of E.aktywnePrzygotowania(l, chwila)) {
    const w = document.createElement("span");
    w.className = "neuro-m8-info";
    w.innerHTML = `<i class="fa-solid fa-hourglass-half" inert></i> `;
    w.append(`Wyczekuje: ${p.opis || "przygotowana akcja"}`);
    dol.appendChild(w);
  }
  for (const p of pomoce(actor)) {
    const w = document.createElement("span");
    w.className = "neuro-m8-info";
    w.innerHTML = `<i class="fa-solid fa-handshake-angle" inert></i> `;
    w.append(p.rodzaj === "atak" ? `Pomoc ${p.od?.nazwa ?? "?"}: Ułatwienie w ataku na ${p.celNazwa ?? "cel"}`
      : `Pomoc ${p.od?.nazwa ?? "?"}: Ułatwienie w teście (${p.klucz})`);
    dol.appendChild(w);
  }
  if (s.reakcja) {
    dol.appendChild(_przycisk({ label: `Zakończ reakcję (${s.reakcja.zrodlo})`, icon: "fa-flag-checkered", editable,
      tip: "Kończy wykonanie reakcji (ruch przerwany albo rozstrzygnięty narracyjnie, §4.3) — bez kolejnej R.",
      onClick: () => zakonczReakcje(actor) }));
  }
  dol.appendChild(_przycisk({ label: "Skoryguj", icon: "fa-pen-to-square", editable,
    tip: "Dopisz albo zwolnij wydatek (akcja słowna, pomyłka klasyfikacji) albo popraw ruch.", onClick: () => _oknoKorekty(actor) }));
  if (actor.type === "character") dol.appendChild(_przyciskPaska(actor, editable));
  panel.appendChild(dol);
  return panel;
}

/* -------------------------------------------- */
/*  Odświeżanie w miejscu                        */
/* -------------------------------------------- */

let _zaplanowane = null;
const _doOdswiezenia = new Set();

/** Odśwież panele aktorów (albo wszystkie) w otwartych kartach — raz na klatkę. */
export function odswiezPanele(actors = null) {
  if (actors) for (const a of actors) if (a) _doOdswiezenia.add(a.uuid);
  else _doOdswiezenia.add("*");
  if (_zaplanowane) return;
  _zaplanowane = requestAnimationFrame(() => {
    _zaplanowane = null;
    const wszystkie = _doOdswiezenia.has("*");
    const uuids = new Set(_doOdswiezenia);
    _doOdswiezenia.clear();
    for (const el of document.querySelectorAll(`.${KLASA}`)) {
      const uuid = el.dataset.actorUuid;
      if (!wszystkie && !uuids.has(uuid)) continue;
      const actor = fromUuidSync(uuid);
      const nowy = actor ? panelEkonomii(actor, actor.isOwner) : null;
      if (nowy) el.replaceWith(nowy);
      else el.remove();
    }
  });
}

/**
 * Skrót z paska: ta sama operacja co przycisk panelu, dla przypisanej postaci (albo kontrolowanego żetonu).
 * @param {string} akcja  klucz `SKROTY` (Padnij/Powstań — wg stanu)
 */
export async function uzyjSkrotu(akcja) {
  const actor = game.user.character ?? canvas.tokens?.controlled?.[0]?.actor ?? null;
  if (!actor) return ui.notifications.warn("Brak wybranej postaci.");
  const c = stan(actor);
  switch (akcja) {
    case "skok": return oknoSkoku(actor);
    case "pomoz": return oknoPomocy(actor);
    case "wyczekaj": return _oknoWyczekania(actor);
    case "reaguj": return c ? _oknoReakcji(actor, E.aktywnePrzygotowania(c.ledger, c.chwila)) : ui.notifications.info("Reakcja — tylko w walce.");
    case "padnij": case "powstan": return deklaruj(actor, actor.statuses?.has("prone") ? "powstan" : "padnij");
    case "dodging": return deklaruj(actor, "unikanie");
    case "ruch": case "wiecej": return paleta(actor, akcja);
    default: return E.DEKLARACJE[akcja] ? deklaruj(actor, akcja) : null;
  }
}

/** Upuszczenie przycisku panelu na pasek: makro wołające `uzyjSkrotu` (jedno na akcję i użytkownika). */
function _onHotbarDrop(_bar, data, slot) {
  if (data?.type !== TYP_SKROTU || !SKROTY[data.akcja]) return;
  void (async () => {
    const macro = await makroSkrotu(data.akcja);
    if (macro) await game.user.assignHotbarMacro(macro, slot);
  })();
  return false;
}

/* -------------------------------------------- */
/*  Palety Ruch i Więcej, szablon paska (§8.3)   */
/* -------------------------------------------- */

const _ma = (actor, id) => actor.items?.some(i => i.getFlag(MODULE_ID, "abilityId") === id);

/**
 * Opcje palety. Ruch: Przyspiesz, Biegnij, Skok, Padnij/Powstań; Złodziej z Szybkimi nogami — ich warianty B
 * (Przyspieszenie, Odstąpienie, Ukrywanie się, s. 89) zamiast klasowego „B Bieganie”. Więcej: Pomóż, Wyczekaj, Reaguj,
 * Manewr, kalkulator Skoku, Zakończ reakcję; poza walką — tylko to, co ma sens bez budżetu (eksploracja).
 * @returns {{id: string, label: string, icon: string, run: () => any}[]}
 */
export function opcjePalety(actor, rodzaj) {
  const s = stan(actor);
  const prone = actor.statuses?.has("prone");
  if (rodzaj === "ruch") {
    const out = [
      { id: "przyspieszenie", label: "Przyspiesz [A]", icon: "fa-solid fa-person-walking-arrow-right", run: () => deklaruj(actor, "przyspieszenie") },
      { id: "bieganie", label: "Biegnij [A]", icon: "fa-solid fa-person-running", run: () => deklaruj(actor, "bieganie") },
      { id: "skok", label: "Skok", icon: "fa-solid fa-person-falling", run: () => oknoSkoku(actor) },
      { id: "padnij", label: prone ? "Powstań" : "Padnij", icon: "fa-solid fa-person-praying", run: () => deklaruj(actor, prone ? "powstan" : "padnij") }
    ];
    if (_ma(actor, SZABLONY.zlodziej.ruchB)) {
      for (const w of WARIANTY_SZYBKICH_NOG) {
        out.push({ id: `nogi-${w.id}`, label: `${w.label} — Szybkie nogi`, icon: "fa-solid fa-shoe-prints",
          run: async () => {
            if (w.deklaracja) return deklaruj(actor, w.deklaracja, { koszt: { B: 1 }, zrodlo: `Szybkie nogi — ${w.label.replace(/ \[B\]$/, "")}` });
            await zadeklaruj(actor, "B", { zrodlo: "Szybkie nogi — Ukrywanie się" });
            return actor.rollSkill?.({ skill: w.umiejetnosc });
          } });
      }
    }
    return s ? out : out.filter(o => o.id === "skok");
  }
  const out = [
    { id: "pomoz", label: "Pomóż", icon: "fa-solid fa-handshake-angle", run: () => oknoPomocy(actor) },
    { id: "manewr", label: "Manewr", icon: "fa-solid fa-hand-fist", run: () => openManeuverDialog({ actor }) },
    { id: "skok", label: "Kalkulator skoku", icon: "fa-solid fa-person-falling", run: () => oknoSkoku(actor) }
  ];
  if (s) {
    out.push({ id: "wyczekaj", label: "Wyczekaj [A]", icon: "fa-solid fa-hourglass-half", run: () => _oknoWyczekania(actor) });
    out.push({ id: "reaguj", label: "Reaguj", icon: "fa-solid fa-bolt", run: () => _oknoReakcji(actor, E.aktywnePrzygotowania(s.ledger, s.chwila)) });
    if (s.reakcja) out.push({ id: "koniec", label: "Zakończ reakcję", icon: "fa-solid fa-flag-checkered", run: () => zakonczReakcje(actor) });
  }
  return out;
}

/** Paleta z paska (`skrot:ruch`, `skrot:wiecej`): wybór niczego nie wydaje, koszt ma dopiero wybrana operacja. */
export async function paleta(actor, rodzaj) {
  const opcje = opcjePalety(actor, rodzaj);
  const wybor = await foundry.applications.api.DialogV2.wait({
    window: { title: `${rodzaj === "ruch" ? "Ruch" : "Więcej"} — ${actor.name}` },
    classes: ["neuro-paleta"],
    position: { width: 380 },
    content: `<p class="hint">${stan(actor) ? "Otwarcie palety nic nie kosztuje — koszt ma wybrana czynność." : "Poza walką — bez budżetu tury."}</p>`,
    buttons: opcje.map(o => ({ action: o.id, label: o.label, icon: o.icon })),
    rejectClose: false
  });
  return opcje.find(o => o.id === wybor)?.run();
}

function _przyciskPaska(actor, editable) {
  const klasa = SZABLONY[klasaSzablonu(actor)]?.label;
  return _przycisk({ label: "Ułóż pasek", icon: "fa-table-cells", editable,
    tip: `Szablon paska${klasa ? ` (${klasa})` : ""}: broń, przeładowanie, decyzje klasowe, ekwipunek, Unik, Odstąp, Ruch, Więcej — sloty 1–0. `
      + "Najpierw podgląd; twoich makr nie rusza.",
    onClick: () => ulozPasek(actor) });
}

/** Poza walką: sam przycisk szablonu paska (panel tury pojawia się w walce). */
function _rzadPaska(actor, editable) {
  if (actor?.type !== "character" || !editable) return null;
  const row = document.createElement("div");
  row.className = "neuro-stan-row neuro-m8-pasek-row";
  const label = document.createElement("span");
  label.className = "neuro-m8-info";
  label.textContent = "Pasek walki";
  row.append(label, _przyciskPaska(actor, editable));
  return row;
}

export function registerEkonomiaKarta() {
  Hooks.on("hotbarDrop", _onHotbarDrop);
  Hooks.on("updateCombatant", (c, changes) => {
    if (foundry.utils.hasProperty(changes, `flags.${MODULE_ID}.${FLAGA_LEDGER}`)) odswiezPanele([c.actor]);
  });
  // Panel istnieje tylko w walce: na początku walki (pierwsza zmiana tury) i po jej końcu karta przerysowuje się raz.
  const przerysuj = (combat, maMiec) => {
    for (const c of combat.combatants) {
      const app = c.actor?.sheet;
      if (app?.rendered && !!app.element?.querySelector?.(`.${KLASA}`) !== maMiec) app.render();
    }
  };
  Hooks.on("combatTurnChange", combat => { odswiezPanele(); przerysuj(combat, true); });
  Hooks.on("deleteCombat", combat => przerysuj(combat, false));
  Hooks.on("updateActor", a => odswiezPanele([a]));
  for (const h of ["createActiveEffect", "deleteActiveEffect"]) Hooks.on(h, e => { if (e.parent instanceof Actor) odswiezPanele([e.parent]); });
  Hooks.on("updateToken", (doc, changes) => { if ("movementAction" in changes) odswiezPanele([doc.actor]); });
}
