/**
 * Neuroshima 5e — Fuksy v2 na aktorze (PLAN_m5_postoj.md §7.9, U24, D15, D24).
 *
 * `flags.<mod>.fuksy` z liczby stało się listą `[{ id, zrodlo, etykieta, wygasa | null, nadano }]` — najwyżej
 * trzy (s. 17). Zasady (termin ze źródła, odmowa przy komplecie, kolejność zużycia, wygasanie) są czyste w
 * `config/fuksy-rules.mjs`; tu zapis, przekaźnik MG, karty i haki:
 *
 *   - **przyznanie** — właściciel albo MG pisze wprost; gracz dający Fuksa cudzej postaci (Gotowanie dla
 *     drużyny, Fant kilkuosobowy, Pieśń otuchy) — prośbą do MG (`postoj/przekaznik.mjs`). Komplet — odmowa (RAW)
 *     i karta MG z [Zamień najkrócej ważny];
 *   - **zużycie** (Przerzut, `combat/rerolls.mjs`) — najpierw ten, który wygasa najwcześniej;
 *   - **wygasanie** — `updateWorldTime` u aktywnego MG, linia na czacie;
 *   - **migracja** (B2) — liczba N z modelu sprzed M5 → N trwałych „sprzed M5”, u aktywnego MG w `ready`;
 *     odczyt i tak rozumie oba kształty (`normalizuj`), więc migracja niczego nie gubi.
 *
 * Towarzysz nie ma Fuksów (D5 M3).
 */

import {
  MAX_FUKSY, ZRODLA_FUKSOW, normalizuj, przyznaj, zamienNajkrocejWazny, zuzyj, wygasle, migruj, opisFuksa, jestTrwaly
} from "../config/fuksy-rules.mjs";
import { formatWorldTime } from "../world-clock.mjs";
import { jestTowarzyszem } from "./towarzysze.mjs";
import { doMG, zarejestrujProsbe } from "../postoj/przekaznik.mjs";
import { kartaPostoju, wyslijKarte, zarejestrujAkcje } from "../postoj/karty.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
export const FLAGA_FUKSOW = "fuksy";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/* -------------------------------------------- */
/*  Odczyt i zapis                               */
/* -------------------------------------------- */

/** Czy aktor może mieć Fuksy: BG, nie towarzysz. */
export function mozeMiecFuksy(actor) {
  return actor?.type === "character" && !jestTowarzyszem(actor);
}

/** Lista Fuksów (oba kształty flagi). */
export function fuksy(actor) {
  return normalizuj(actor?.getFlag(MODULE_ID, FLAGA_FUKSOW), game.time.worldTime);
}

/** Liczba Fuksów — to, co pokazuje przycisk Przerzutu. */
export function liczbaFuksow(actor) {
  return fuksy(actor).length;
}

/** Dymek z pochodzeniem i terminem (D15). */
export function dymekFuksa(f) {
  return opisFuksa(f, formatWorldTime);
}

async function _zapisz(actor, lista) {
  await actor.update({ [`flags.${MODULE_ID}.${FLAGA_FUKSOW}`]: lista });
}

/* -------------------------------------------- */
/*  Przyznanie, zużycie, usunięcie               */
/* -------------------------------------------- */

/**
 * Przyznaje Fuksa ze źródła (`ZRODLA_FUKSOW`).
 * @param {Actor} actor
 * @param {string} zrodlo
 * @param {{etykieta?: string, termin?: number|null, karta?: boolean, nosiciel?: Actor|null}} [o]
 *   `termin` — sekundy (nadpisuje źródło, MG); `nosiciel` — postać gracza dla prośby do MG
 * @returns {Promise<{fuks: object|null, odmowa: string|null, przekazane?: boolean}>}
 */
export async function przyznajFuksa(actor, zrodlo, { etykieta, termin, karta = true, nosiciel = null } = {}) {
  if (!mozeMiecFuksy(actor)) return { fuks: null, odmowa: "nie-bg" };
  if (!actor.isOwner) {
    await doMG("fuks", { aktor: actor.uuid, zrodlo, etykieta: etykieta ?? null, ...(termin !== undefined ? { termin } : {}), karta }, { nosiciel });
    return { fuks: null, odmowa: null, przekazane: true };
  }
  const opcje = { ...(etykieta ? { etykieta } : {}), ...(termin !== undefined ? { termin } : {}) };
  const r = przyznaj(fuksy(actor), zrodlo, game.time.worldTime, opcje);
  if (r.odmowa) {
    await wyslijKarte(kartaPostoju({
      ikona: "icons/svg/clover.svg",
      tytul: `${actor.name}: komplet Fuksów`,
      podtytul: `${ZRODLA_FUKSOW[zrodlo]?.label ?? zrodlo} — odmowa (s. 17)`,
      rodzaj: "braki",
      linie: [`Najwyżej ${MAX_FUKSY} Fuksy naraz. Nowy: <strong>${esc(etykieta ?? ZRODLA_FUKSOW[zrodlo]?.label)}</strong>.`,
        ...fuksy(actor).map(f => esc(dymekFuksa(f)))],
      przyciski: [{ akcja: "fuksZamien", label: "Zamień najkrócej ważny", ikona: "fa-solid fa-right-left", gm: true,
        dane: { aktor: actor.uuid, zrodlo, etykieta: etykieta ?? "", termin: termin ?? "" } }]
    }), { szept: "gm", actor });
    return { fuks: null, odmowa: r.odmowa };
  }
  await _zapisz(actor, r.lista);
  if (karta) await _linia(actor, `🍀 <strong>${esc(actor.name)}</strong> — ${esc(dymekFuksa(r.fuks))}`);
  return { fuks: r.fuks, odmowa: null };
}

/** Zużywa Fuksa, który wygasa najwcześniej. @returns {Promise<object|null>} */
export async function zuzyjFuksa(actor) {
  const r = zuzyj(fuksy(actor), game.time.worldTime);
  if (!r.zuzyty) return null;
  await _zapisz(actor, r.lista);
  return r.zuzyty;
}

/** Usuwa konkretnego Fuksa (MG). */
export async function usunFuksa(actor, id) {
  await _zapisz(actor, fuksy(actor).filter(f => f.id !== id));
}

/**
 * Zgodność ze starym licznikiem (`setFuksy`): ustawia liczbę — nadmiar schodzi w kolejności zużycia,
 * brak dochodzi jako trwałe Fuksy „od MG”.
 */
export async function ustawLiczbeFuksow(actor, n) {
  const cel = Math.max(0, Math.min(MAX_FUKSY, Math.floor(Number(n) || 0)));
  let lista = fuksy(actor);
  while (lista.length > cel) lista = zuzyj(lista, game.time.worldTime).lista;
  while (lista.length < cel) lista = przyznaj(lista, "mg", game.time.worldTime).lista;
  await _zapisz(actor, lista);
  return cel;
}

async function _linia(actor, html) {
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-fuks-linia">${html}</div>`
  });
}

/* -------------------------------------------- */
/*  Wygasanie i migracja                         */
/* -------------------------------------------- */

/**
 * Zdejmuje Fuksy wygasłe na `teraz` (czas świata) z linią na czacie. Zwraca zdjęte.
 * @returns {Promise<object[]>}
 */
export async function zdejmijWygasle(actor, teraz = game.time.worldTime, { karta = true } = {}) {
  const surowa = actor.getFlag(MODULE_ID, FLAGA_FUKSOW);
  if (!Array.isArray(surowa) || !surowa.some(f => f?.wygasa !== null && f?.wygasa !== undefined)) return [];
  const { zostaja, wygasle: wyg } = wygasle(surowa, teraz);
  if (!wyg.length) return [];
  await _zapisz(actor, zostaja);
  if (karta) await _linia(actor, `🍂 <strong>${esc(actor.name)}</strong>: ${wyg.map(f => `Fuks — ${esc(f.etykieta)} — wygasł`).join("; ")}`);
  return wyg;
}

async function _onUpdateWorldTime(worldTime) {
  if (!game.users.activeGM?.isSelf) return;
  for (const actor of game.actors) {
    if (mozeMiecFuksy(actor)) await zdejmijWygasle(actor, worldTime);
  }
}

/** Migracja B2: liczba → lista trwałych „sprzed M5”. Zwraca nazwy przeniesionych postaci. */
export async function migrujFuksy({ cicho = false } = {}) {
  const zmienieni = [];
  for (const actor of game.actors) {
    const surowa = actor.getFlag(MODULE_ID, FLAGA_FUKSOW);
    if (typeof surowa !== "number" && typeof surowa !== "string") continue;
    await _zapisz(actor, migruj(Number(surowa), game.time.worldTime));
    zmienieni.push(`${actor.name} (${surowa})`);
  }
  if (zmienieni.length && !cicho) console.log(`${MODULE_ID} | Fuksy v2: migracja ${zmienieni.join(", ")}`);
  return zmienieni;
}

/* -------------------------------------------- */
/*  Okno MG                                      */
/* -------------------------------------------- */

const H = 3600;

/** Okno MG: lista z [Usuń] i dodawanie ze źródłem i terminem. */
export async function oknoFuksow(actor) {
  if (!game.user.isGM) return;
  const lista = fuksy(actor);
  const zrodla = Object.entries(ZRODLA_FUKSOW).filter(([k]) => k !== "przedM5")
    .map(([k, z]) => `<option value="${k}">${esc(z.label)}${z.termin ? ` (${z.termin / H} h)` : z.doKoncaSesji ? " (sesja)" : " (trwały)"}</option>`).join("");
  const wiersze = lista.length
    ? lista.map(f => `<li data-id="${esc(f.id)}"><span class="neuro-fuks-kropka" style="--fuks-kolor:${ZRODLA_FUKSOW[f.zrodlo]?.kolor ?? "#999"}"></span>
        ${esc(dymekFuksa(f))} <button type="button" class="neuro-fuks-usun" data-id="${esc(f.id)}"><i class="fa-solid fa-trash" inert></i></button></li>`).join("")
    : "<li><em>Brak Fuksów.</em></li>";
  const wynik = await foundry.applications.api.DialogV2.wait({
    window: { title: `Fuksy — ${actor.name}`, icon: "fa-solid fa-clover" },
    position: { width: 440 },
    content: `<ul class="neuro-fuks-lista">${wiersze}</ul>
      <div class="form-group"><label>Źródło</label><select name="zrodlo">${zrodla}</select></div>
      <div class="form-group"><label>Opis</label><input type="text" name="etykieta" placeholder="np. Fuks od wypicia Neuro-Coli"></div>
      <div class="form-group"><label>Termin (h)</label><input type="number" name="godziny" min="0" step="1" placeholder="ze źródła"></div>`,
    render: (_ev, dialog) => {
      dialog.element.querySelectorAll(".neuro-fuks-usun").forEach(b => b.addEventListener("click", async ev => {
        await usunFuksa(actor, ev.currentTarget.dataset.id);
        ev.currentTarget.closest("li")?.remove();
      }));
    },
    buttons: [
      {
        action: "dodaj", label: `Dodaj (${lista.length}/${MAX_FUKSY})`, icon: "fa-solid fa-plus", default: true,
        callback: (_ev, button) => new foundry.applications.ux.FormDataExtended(button.form).object
      },
      { action: "zamknij", label: "Zamknij", icon: "fa-solid fa-xmark" }
    ],
    rejectClose: false
  });
  if (!wynik || typeof wynik !== "object") return;
  const godz = wynik.godziny === null || wynik.godziny === "" ? undefined : Number(wynik.godziny);
  await przyznajFuksa(actor, wynik.zrodlo, {
    etykieta: String(wynik.etykieta ?? "").trim() || undefined,
    termin: godz === undefined ? undefined : (godz > 0 ? godz * H : null)
  });
}

/* -------------------------------------------- */
/*  Pieśń otuchy (Muzyk, s. 105)                 */
/* -------------------------------------------- */

const PIESN = "piesnOtuchy";

/** Aktywność „Pieśń otuchy” na Sztuczce Muzyk — 1×/DO (s. 105); dokładana kopiom bez niej. */
async function _zapewnijPiesn(item) {
  if (item?.getFlag?.(MODULE_ID, "sztuczka") !== "muzyk" || !item.isOwner) return;
  if ((item.system.activities ?? []).some?.(a => a.flags?.[MODULE_ID]?.[PIESN])) return;
  if (typeof item.createActivity !== "function") return;
  await item.createActivity("utility", {
    name: "Pieśń otuchy",
    img: "icons/svg/sound.svg",
    activation: { type: "action", value: 1 },
    uses: { max: "1", spent: 0, recovery: [{ period: "lr", type: "recoverAll" }] },
    consumption: { targets: [{ type: "activityUses", value: "1" }] },
    flags: { [MODULE_ID]: { [PIESN]: true } }
  }, { renderSheet: false });
}

/** Wybór sojuszników i Fuksy na 24 h dla 1 + mod. CHA z nich (s. 105). */
export async function piesnOtuchy(muzyk) {
  const limit = Math.max(1, 1 + (Number(muzyk.system?.abilities?.cha?.mod) || 0));
  const druzyna = game.actors.filter(g => g.type === "group" && g.system.members?.some(m => m.actor === muzyk));
  const kandydaci = [...new Set(druzyna.flatMap(g => g.system.members.map(m => m.actor)))]
    .filter(a => a && a !== muzyk && mozeMiecFuksy(a));
  if (!kandydaci.length) return ui.notifications.warn("Pieśń otuchy: brak sojuszników w drużynie.");
  const wybor = await foundry.applications.api.DialogV2.wait({
    window: { title: "Pieśń otuchy", icon: "fa-solid fa-music" },
    content: `<p>Fuks na 24 h dla najwyżej <strong>${limit}</strong> sojuszników (1 + mod. CHA, s. 105).</p>
      ${kandydaci.map(a => `<label class="checkbox"><input type="checkbox" name="${a.id}"> ${esc(a.name)}</label>`).join("")}`,
    buttons: [{ action: "ok", label: "Zagraj", icon: "fa-solid fa-guitar", default: true,
      callback: (_ev, button) => [...button.form.querySelectorAll("input:checked")].map(i => i.name) }],
    rejectClose: false
  });
  if (!Array.isArray(wybor)) return;
  const sluchacze = wybor.slice(0, limit).map(id => game.actors.get(id)).filter(Boolean);
  if (wybor.length > limit) ui.notifications.warn(`Pieśń otuchy: tylko ${limit} — reszta bez Fuksa.`);
  for (const a of sluchacze) await przyznajFuksa(a, "piesn", { etykieta: `Pieśń otuchy (${muzyk.name})`, nosiciel: muzyk });
}

function _onPostUseActivity(activity) {
  if (!activity?.flags?.[MODULE_ID]?.[PIESN]) return;
  const muzyk = activity.actor ?? activity.item?.actor;
  if (muzyk?.isOwner) piesnOtuchy(muzyk);
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

export function registerFuksy() {
  Hooks.on("updateWorldTime", _onUpdateWorldTime);
  Hooks.on("dnd5e.postUseActivity", _onPostUseActivity);
  Hooks.on("createItem", item => { if (game.user.isGM) _zapewnijPiesn(item); });
  Hooks.once("ready", async () => {
    if (!game.users.activeGM?.isSelf) return;
    await migrujFuksy();
    for (const a of game.actors) for (const i of a.items) await _zapewnijPiesn(i);
  });
  zarejestrujProsbe("fuks", async (nosiciel, d) => {
    const actor = await fromUuid(d.aktor);
    if (actor) await przyznajFuksa(actor, d.zrodlo, { etykieta: d.etykieta ?? undefined, ...("termin" in d ? { termin: d.termin } : {}), karta: d.karta !== false });
  });
  zarejestrujAkcje("fuksZamien", async (_ev, btn) => {
    if (!game.user.isGM) return;
    const actor = await fromUuid(btn.dataset.aktor);
    if (!actor) return;
    const termin = btn.dataset.termin === "" ? undefined : Number(btn.dataset.termin);
    const { lista, fuks, usuniety } = zamienNajkrocejWazny(fuksy(actor), btn.dataset.zrodlo, game.time.worldTime,
      { ...(btn.dataset.etykieta ? { etykieta: btn.dataset.etykieta } : {}), ...(termin !== undefined ? { termin } : {}) });
    await _zapisz(actor, lista);
    await _linia(actor, `🍀 <strong>${esc(actor.name)}</strong> — ${esc(dymekFuksa(fuks))}${usuniety ? ` (zamiast: ${esc(usuniety.etykieta)})` : ""}`);
  });
}

export const fuksyApi = Object.freeze({
  lista: fuksy, liczba: liczbaFuksow, przyznaj: przyznajFuksa, zuzyj: zuzyjFuksa, usun: usunFuksa,
  ustawLiczbe: ustawLiczbeFuksow, migruj: migrujFuksy, zdejmijWygasle, okno: oknoFuksow, piesnOtuchy, dymek: dymekFuksa,
  jestTrwaly, ZRODLA: ZRODLA_FUKSOW
});
