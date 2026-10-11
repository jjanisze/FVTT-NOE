/**
 * Neuroshima 5e — miejsce postoju (PLAN_m5_postoj.md §7.3, U1).
 *
 * Gdzie drużyna stoi: rodzaj (Dzicz / Wioska / Miasteczko / Miasto — modyfikator dostępności, s. 43) i region
 * z tabeli cen (s. 44). Stan w `flags.<mod>.postoj.miejsce` aktora drużyny (pisze MG); scena może mieć
 * miejsce domyślne (`flags.<mod>.miejsce` sceny) — przy aktywacji takiej sceny MG dostaje szept z
 * [Ustaw miejsce] (T3). Gracze widzą nazwę, rodzaj i region; mnożników nie (U42).
 *
 * Czyje miejsce: postać → jej drużyna (`druzynyAktora`) → miejsce; bez drużyny — miejsce domyślne aktywnej
 * sceny; bez tego — brak (okno pyta MG).
 */

import { LOKALIZACJE, REGIONY } from "../config/handel-data.mjs";
import { druzynyAktora } from "../production/pula.mjs";
import { kartaPostoju, wyslijKarte, zarejestrujAkcje } from "./karty.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
export const FLAGA_POSTOJ = "postoj";
export const FLAGA_SCENY = "miejsce";

/** Puste miejsce — „—”: bez rodzaju i regionu (handel bez modyfikatorów, okna pytają). */
export const MIEJSCE_PUSTE = Object.freeze({ nazwa: "", rodzaj: null, region: null, knajpa: null, maksStawka: null, obraz: null });

/** Uzupełnia miejsce o wartości domyślne z rodzaju (knajpa od wioski w górę — U35). */
export function normalizujMiejsce(m) {
  const out = { ...MIEJSCE_PUSTE, ...(m ?? {}) };
  if (!LOKALIZACJE[out.rodzaj]) out.rodzaj = null;
  if (!REGIONY[out.region]) out.region = null;
  if (out.knajpa === null || out.knajpa === undefined) out.knajpa = out.rodzaj ? LOKALIZACJE[out.rodzaj].knajpa : false;
  return out;
}

/** Czy miejsce jest ustawione (ma rodzaj). */
export function maMiejsce(m) {
  return !!(m && LOKALIZACJE[m.rodzaj]);
}

/** Etykieta dla graczy: „Vegas, Miasteczko · Vegas” albo „—”. */
export function opisMiejsca(m) {
  const n = normalizujMiejsce(m);
  if (!maMiejsce(n)) return "—";
  const czesci = [LOKALIZACJE[n.rodzaj].label, n.region ? REGIONY[n.region].label : null].filter(Boolean);
  return n.nazwa ? `${n.nazwa} (${czesci.join(" · ")})` : czesci.join(" · ");
}

/** Miejsce drużyny. */
export function getMiejsce(grupa) {
  return normalizujMiejsce(grupa?.getFlag(MODULE_ID, FLAGA_POSTOJ)?.miejsce);
}

/** Zapis miejsca drużyny (MG). */
export async function setMiejsce(grupa, patch) {
  if (!grupa || !game.user.isGM) return null;
  const teraz = normalizujMiejsce({ ...grupa.getFlag(MODULE_ID, FLAGA_POSTOJ)?.miejsce, ...patch });
  return grupa.setFlag(MODULE_ID, FLAGA_POSTOJ, { miejsce: teraz });
}

/** Miejsce domyślne sceny albo `null`. */
export function miejsceSceny(scene) {
  const m = scene?.getFlag(MODULE_ID, FLAGA_SCENY);
  return m && LOKALIZACJE[m.rodzaj] ? normalizujMiejsce(m) : null;
}

/** Drużyna główna dnd5e (ustawienie „Primary Party”), inaczej jedyna grupa z członkami. */
export function druzynaGlowna() {
  const p = game.actors.party ?? null;
  if (p) return p;
  const grupy = game.actors.filter(a => a.type === "group" && (a.system.members?.length ?? 0) > 0);
  return grupy.length === 1 ? grupy[0] : null;
}

/**
 * Miejsce, w którym stoi aktor.
 * @returns {{miejsce: object, druzyna: Actor|null, zrodlo: "druzyna"|"scena"|null}}
 */
export function miejsceAktora(actor) {
  const druzyny = actor?.type === "group" ? [actor] : druzynyAktora(actor);
  const glowna = druzynaGlowna();
  const druzyna = druzyny.find(d => d === glowna) ?? druzyny[0] ?? null;
  if (druzyna) {
    const m = getMiejsce(druzyna);
    if (maMiejsce(m)) return { miejsce: m, druzyna, zrodlo: "druzyna" };
  }
  const zSceny = miejsceSceny(game.scenes?.active ?? canvas?.scene);
  if (zSceny) return { miejsce: zSceny, druzyna, zrodlo: "scena" };
  return { miejsce: normalizujMiejsce(null), druzyna, zrodlo: null };
}

/* -------------------------------------------- */
/*  Okno MG                                      */
/* -------------------------------------------- */

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

function _formularz(m) {
  const rodzaje = [`<option value="">—</option>`, ...Object.entries(LOKALIZACJE).map(([k, v]) =>
    `<option value="${k}" ${m.rodzaj === k ? "selected" : ""}>${v.label} (${v.modyfikator > 0 ? "+" : ""}${v.modyfikator})</option>`)].join("");
  const regiony = [`<option value="">— bez cen regionalnych</option>`, ...Object.entries(REGIONY).map(([k, v]) =>
    `<option value="${k}" ${m.region === k ? "selected" : ""}>${v.label}</option>`)].join("");
  return `<div class="neuro-miejsce-form">
    <div class="form-group"><label>Nazwa</label><input type="text" name="nazwa" value="${esc(m.nazwa)}" placeholder="np. Las Vegas"></div>
    <div class="form-group"><label>Rodzaj</label><select name="rodzaj">${rodzaje}</select></div>
    <div class="form-group"><label>Region (ceny)</label><select name="region">${regiony}</select></div>
    <div class="form-group"><label>Knajpa</label><input type="checkbox" name="knajpa" ${m.knajpa ? "checked" : ""}>
      <p class="hint">Plotkowanie wymaga knajpy i chętnych miejscowych (s. 47).</p></div>
    <div class="form-group"><label>Maks. stawka hazardu</label><input type="number" name="maksStawka" min="0" step="1" value="${m.maksStawka ?? ""}" placeholder="bez limitu"></div>
    <div class="form-group"><label>Obraz miejsca</label><div class="form-fields">
      <input type="text" name="obraz" value="${esc(m.obraz ?? "")}" placeholder="ścieżka (opcjonalnie)">
      <button type="button" class="neuro-miejsce-pliki" data-tooltip="Wybierz plik"><i class="fa-solid fa-file-image" inert></i></button></div>
      <p class="hint">Obraz dla graczy na zakładce Postój i w oknie Handlu (tylko z wyboru MG).</p></div>
  </div>`;
}

/**
 * Okno „Miejsce postoju” (MG). Zwraca nowe miejsce albo `null` przy anulowaniu.
 * @param {{miejsce?: object, tytul?: string}} [o]
 */
export async function oknoMiejsca({ miejsce = null, tytul = "Miejsce postoju" } = {}) {
  const m = normalizujMiejsce(miejsce);
  const wynik = await foundry.applications.api.DialogV2.wait({
    window: { title: tytul, icon: "fa-solid fa-campground" },
    position: { width: 420 },
    content: _formularz(m),
    render: (_ev, dialog) => {
      const el = dialog.element;
      el.querySelector(".neuro-miejsce-pliki")?.addEventListener("click", () => {
        const input = el.querySelector("input[name=obraz]");
        new foundry.applications.apps.FilePicker.implementation({ type: "image", current: input.value, callback: p => { input.value = p; } }).browse();
      });
      el.querySelector("select[name=rodzaj]")?.addEventListener("change", ev => {
        const k = LOKALIZACJE[ev.target.value];
        const box = el.querySelector("input[name=knajpa]");
        if (k && box) box.checked = k.knajpa;
      });
    },
    buttons: [
      {
        action: "ok", label: "Zapisz", icon: "fa-solid fa-check", default: true,
        callback: (_ev, button) => {
          const f = new foundry.applications.ux.FormDataExtended(button.form).object;
          return normalizujMiejsce({
            nazwa: String(f.nazwa ?? "").trim(),
            rodzaj: f.rodzaj || null,
            region: f.region || null,
            knajpa: !!f.knajpa,
            maksStawka: Number.isFinite(Number(f.maksStawka)) && f.maksStawka !== "" && f.maksStawka !== null ? Number(f.maksStawka) : null,
            obraz: String(f.obraz ?? "").trim() || null
          });
        }
      },
      { action: "anuluj", label: "Anuluj", icon: "fa-solid fa-xmark" }
    ],
    rejectClose: false
  });
  return wynik && typeof wynik === "object" ? wynik : null;
}

/** [Ustaw miejsce] na zakładce Postój. */
export async function ustawMiejsceDruzyny(grupa) {
  if (!game.user.isGM) return;
  const nowe = await oknoMiejsca({ miejsce: getMiejsce(grupa), tytul: `Miejsce postoju — ${grupa.name}` });
  if (nowe) await setMiejsce(grupa, nowe);
}

/** Zapis miejsca drużyny jako domyślnego dla sceny (aktywnej albo oglądanej). */
export async function przypiszDoSceny(grupa, scene = game.scenes?.active ?? canvas?.scene) {
  if (!game.user.isGM || !scene) return;
  const m = getMiejsce(grupa);
  if (!maMiejsce(m)) return ui.notifications.warn("Najpierw ustaw miejsce drużyny.");
  await scene.setFlag(MODULE_ID, FLAGA_SCENY, m);
  ui.notifications.info(`Scena „${scene.name}”: miejsce domyślne — ${opisMiejsca(m)}.`);
}

/* -------------------------------------------- */
/*  Zmiana sceny → propozycja (T3)               */
/* -------------------------------------------- */

function _takieSame(a, b) {
  return a?.rodzaj === b?.rodzaj && a?.region === b?.region && (a?.nazwa ?? "") === (b?.nazwa ?? "");
}

async function _onUpdateScene(scene, changes) {
  if (!changes.active || !game.users.activeGM?.isSelf) return;
  const zSceny = miejsceSceny(scene);
  const druzyna = druzynaGlowna();
  if (!zSceny || !druzyna || _takieSame(getMiejsce(druzyna), zSceny)) return;
  await wyslijKarte(kartaPostoju({
    ikona: "icons/svg/village.svg",
    tytul: "Nowe miejsce postoju?",
    podtytul: scene.name,
    linie: [`Scena ma miejsce domyślne: <strong>${esc(opisMiejsca(zSceny))}</strong>.`,
      `Drużyna ${esc(druzyna.name)}: ${esc(opisMiejsca(getMiejsce(druzyna)))}.`],
    przyciski: [{ akcja: "miejsceZeSceny", label: "Ustaw miejsce", ikona: "fa-solid fa-campground", gm: true, dane: { scena: scene.id, druzyna: druzyna.id } }]
  }), { szept: "gm" });
}

export function registerMiejsce() {
  Hooks.on("updateScene", _onUpdateScene);
  zarejestrujAkcje("miejsceZeSceny", async (_ev, btn) => {
    const scena = game.scenes.get(btn.dataset.scena);
    const druzyna = game.actors.get(btn.dataset.druzyna);
    const m = miejsceSceny(scena);
    if (!druzyna || !m) return;
    await setMiejsce(druzyna, m);
    ui.notifications.info(`${druzyna.name}: ${opisMiejsca(m)}.`);
  });
}

export const miejsceApi = Object.freeze({
  get: getMiejsce, set: setMiejsce, aktora: miejsceAktora, sceny: miejsceSceny, okno: oknoMiejsca,
  ustaw: ustawMiejsceDruzyny, przypiszDoSceny, opis: opisMiejsca, druzynaGlowna
});
