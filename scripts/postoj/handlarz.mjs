/**
 * Neuroshima 5e — punkty handlowe (PLAN_m5_postoj.md §7.7, D28–D30, D33, U47).
 *
 * Punkt handlowy (s. 44) to aktor BN z flagą `handlarz`; towar to jego przedmioty. Trzy sposoby towaru:
 * ręcznie (RAW „wybrane”), generator (RAW „wylosowane” — D29, odczyt MG w drzewie NOE) i generator z ręcznymi
 * dodatkami. Lista jest domyślną drogą handlu (D28); bez limitu transakcji i bez targowania (RAW s. 44).
 * Generator dostaje ziarno — to samo ziarno, ten sam towar. [Losuj od nowa] zastępuje **cały** towar, także
 * ręczne dodatki i to, co handlarz odkupił (D30). Bez samoczynnego odświeżania.
 *
 * Karta handlarza jest tylko MG (U53); gracze widzą jego towar w stole wymiany — nazwy i ilości, bez cen (D21).
 */

import { KATALOG } from "../config/recipes-data.mjs";
import { LOKALIZACJE, GRUPY_TOWARU, FACHOWCY, UDZIAL_GLOWNYCH } from "../config/handel-data.mjs";
import { generujTowar, obrazHandlarza, fachowiecDomyslny, skupDomyslny } from "../config/handel-rules.mjs";
import { rngZZiarna } from "../config/losowanie.mjs";
import { isKobaltEnabled } from "../config/settings.mjs";
import { ilustracja } from "../config/ilustracje.mjs";
import { daneWyniku } from "../production/wynik.mjs";
import { formatWorldTime } from "../world-clock.mjs";
import { getMiejsce, maMiejsce, opisMiejsca, normalizujMiejsce } from "./miejsce.mjs";
import { doMG, zarejestrujProsbe } from "./przekaznik.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
export const FLAGA_HANDLARZA = "handlarz";
/** Znacznik pozycji towaru z generatora / katalogu: `flags.<mod>.towar = { ref }`. */
export const FLAGA_TOWARU = "towar";
const FOLDER = "Punkty handlowe";
const DOMYSLNY_PORTRET = "icons/svg/mystery-man.svg";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const _norm = s => String(s ?? "").trim().toLowerCase();

/* -------------------------------------------- */
/*  Model                                        */
/* -------------------------------------------- */

export function jestHandlarzem(actor) {
  return !!actor?.getFlag?.(MODULE_ID, FLAGA_HANDLARZA);
}

/** Dane punktu z wartościami domyślnymi. */
export function daneHandlarza(actor) {
  const f = actor?.getFlag?.(MODULE_ID, FLAGA_HANDLARZA) ?? {};
  const miejsce = normalizujMiejsce(f.miejsce);
  return {
    miejsce,
    skup: Number.isFinite(f.skup) ? f.skup : Math.round(skupDomyslny({ kobalt: isKobaltEnabled() }) * 100),
    kategorie: Array.isArray(f.kategorie) ? f.kategorie : [],
    miejsca: Number(f.miejsca) || LOKALIZACJE[miejsce.rodzaj]?.miejsca || 15,
    udzialGlownych: Number.isFinite(f.udzialGlownych) ? f.udzialGlownych : UDZIAL_GLOWNYCH,
    podstawy: !!f.podstawy,
    fachowiec: f.fachowiec ?? null,
    ziarno: f.ziarno ?? actor?.name ?? "",
    wygenerowano: f.wygenerowano ?? null,
    wizyta: f.wizyta ?? null,
    rodzajObrazu: f.rodzajObrazu ?? obrazHandlarza({ rodzaj: miejsce.rodzaj, kategorie: f.kategorie ?? [] })
  };
}

/** Czy punkt należy do miejsca: ta sama nazwa; bez nazw — ten sam rodzaj i region. */
export function pasujeMiejsce(a, b) {
  if (!a || !b) return false;
  if (a.nazwa || b.nazwa) return _norm(a.nazwa) === _norm(b.nazwa) && !!a.nazwa;
  return a.rodzaj === b.rodzaj && a.region === b.region;
}

/** Punkty handlowe miejsca. */
export function handlarzeMiejsca(miejsce) {
  if (!maMiejsce(miejsce)) return [];
  return game.actors.filter(a => jestHandlarzem(a) && pasujeMiejsce(daneHandlarza(a).miejsce, miejsce))
    .sort((x, y) => x.name.localeCompare(y.name, "pl"));
}

/** Portret handlarza (§7.23): `img` aktora, gdy MG go podał, inaczej ilustracja z rodzaju. */
export async function portretHandlarza(actor) {
  const img = actor?.img && actor.img !== DOMYSLNY_PORTRET && !actor.img.startsWith("systems/dnd5e/") ? actor.img : null;
  return ilustracja("handlarze", daneHandlarza(actor).rodzajObrazu, { nadpisanie: img });
}

/** Etykiety kategorii głównych i fachowca dla list. */
export function opisHandlarza(actor) {
  const d = daneHandlarza(actor);
  return {
    kategorie: d.kategorie.map(k => GRUPY_TOWARU[k]?.label ?? k).join(", ") || "wielobranżowy",
    fachowiec: d.fachowiec ? FACHOWCY[d.fachowiec]?.label ?? d.fachowiec : null,
    podstawy: d.podstawy
  };
}

/* -------------------------------------------- */
/*  Towar                                        */
/* -------------------------------------------- */

/** Pozycja towaru jako dane przedmiotu (`daneWyniku`), z ilością i znacznikiem `ref`. */
async function _daneTowaru(ref, ilosc) {
  const w = await daneWyniku(ref);
  if (!w) return [];
  const znacz = d => { foundry.utils.setProperty(d, `flags.${MODULE_ID}.${FLAGA_TOWARU}`, { ref }); return d; };
  if (w.stos) {
    const data = foundry.utils.deepClone(w.data);
    data.system.quantity = ilosc;
    return [znacz(data)];
  }
  return Array.from({ length: ilosc }, () => {
    const data = foundry.utils.deepClone(w.data);
    if (data.system) data.system.quantity = 1;
    return znacz(data);
  });
}

/**
 * Generuje towar z parametrów punktu i ziarna (D29) — zastępuje wszystko, co handlarz ma (D30).
 * @param {Actor} actor
 * @param {{ziarno?: string}} [o]  nowe ziarno (zapisane w punkcie)
 * @returns {Promise<{towar: object[], pula: number}>}
 */
export async function wygenerujTowar(actor, { ziarno } = {}) {
  if (!game.user.isGM) throw new Error("Towar punktu handlowego generuje MG.");
  const d = daneHandlarza(actor);
  const z = ziarno ?? d.ziarno;
  const kobalt = isKobaltEnabled();
  const wynik = generujTowar({
    katalog: KATALOG.values(), rodzaj: d.miejsce.rodzaj, kategorie: d.kategorie, miejsca: d.miejsca,
    udzialGlownych: d.udzialGlownych, podstawy: d.podstawy, rng: rngZZiarna(z), kobalt
  });
  const stare = actor.items.map(i => i.id);
  if (stare.length) await actor.deleteEmbeddedDocuments("Item", stare);
  const dane = [];
  for (const t of wynik.towar) dane.push(...await _daneTowaru(t.ref, t.ilosc));
  if (dane.length) await actor.createEmbeddedDocuments("Item", dane);
  await actor.update({
    [`flags.${MODULE_ID}.${FLAGA_HANDLARZA}.ziarno`]: z,
    [`flags.${MODULE_ID}.${FLAGA_HANDLARZA}.wygenerowano`]: game.time.worldTime
  });
  return wynik;
}

async function _folder() {
  let f = game.folders.find(x => x.type === "Actor" && x.name === FOLDER);
  if (!f) f = await Folder.create({ name: FOLDER, type: "Actor", color: "#6b4f2a" });
  return f;
}

/**
 * Nowy punkt handlowy (MG): aktor BN z flagą i — gdy są kategorie albo Podstawy — towar z generatora.
 * Pusta lista = sam ręczny towar (RAW „wybrane”).
 * @param {object} o  `{ nazwa, miejsce, kategorie, miejsca, podstawy, fachowiec, ziarno, skup, rodzajObrazu, img, generuj }`
 */
export async function nowyPunkt(o) {
  if (!game.user.isGM) throw new Error("Punkt handlowy tworzy MG.");
  const miejsce = normalizujMiejsce(o.miejsce);
  const kategorie = (o.kategorie ?? []).filter(k => GRUPY_TOWARU[k]);
  const flaga = {
    miejsce: { nazwa: miejsce.nazwa, rodzaj: miejsce.rodzaj, region: miejsce.region },
    kategorie,
    miejsca: Number(o.miejsca) || LOKALIZACJE[miejsce.rodzaj]?.miejsca || 15,
    udzialGlownych: UDZIAL_GLOWNYCH,
    podstawy: !!o.podstawy,
    fachowiec: o.fachowiec === undefined ? fachowiecDomyslny({ rodzaj: miejsce.rodzaj, kategorie }) : (o.fachowiec || null),
    ziarno: o.ziarno || o.nazwa,
    skup: Number.isFinite(o.skup) ? o.skup : Math.round(skupDomyslny({ kobalt: isKobaltEnabled() }) * 100),
    rodzajObrazu: o.rodzajObrazu || obrazHandlarza({ rodzaj: miejsce.rodzaj, kategorie }),
    wygenerowano: null,
    wizyta: null
  };
  const folder = await _folder();
  const actor = await Actor.implementation.create({
    name: o.nazwa || "Punkt handlowy",
    type: "npc",
    img: o.img || DOMYSLNY_PORTRET,
    folder: folder.id,
    ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE },
    prototypeToken: { actorLink: true, name: o.nazwa || "Punkt handlowy", texture: { src: o.img || DOMYSLNY_PORTRET } },
    flags: { [MODULE_ID]: { [FLAGA_HANDLARZA]: flaga } }
  });
  if (o.generuj !== false && (kategorie.length || flaga.podstawy)) await wygenerujTowar(actor);
  return actor;
}

/** Notka „Gracze odwiedzili: <data świata>” (D30) — u MG wprost, u gracza przez przekaźnik. */
export async function notujWizyte(handlarz) {
  if (!handlarz) return;
  if (game.user.isGM) {
    await handlarz.setFlag(MODULE_ID, `${FLAGA_HANDLARZA}.wizyta`, game.time.worldTime);
    return;
  }
  await doMG("wizytaHandlarza", { handlarz: handlarz.uuid });
}

/* -------------------------------------------- */
/*  Okna MG                                      */
/* -------------------------------------------- */

function _formularzPunktu(m, { nazwa = "", kategorie = [], miejsca = null, podstawy = false, fachowiec = undefined, ziarno = "", skup = null } = {}) {
  const lok = LOKALIZACJE[m.rodzaj];
  const kat = Object.entries(GRUPY_TOWARU).map(([k, g]) =>
    `<label class="checkbox"><input type="checkbox" name="kat.${k}" ${kategorie.includes(k) ? "checked" : ""}> ${esc(g.label)}</label>`).join("");
  const fach = [`<option value="">— brak</option>`, ...Object.entries(FACHOWCY).map(([k, f]) =>
    `<option value="${k}" ${fachowiec === k ? "selected" : ""}>${esc(f.label)}</option>`)].join("");
  return `<div class="neuro-punkt-form">
    <p class="hint">Miejsce: <strong>${esc(opisMiejsca(m))}</strong> — dostępność ${lok ? `${lok.modyfikator > 0 ? "+" : ""}${lok.modyfikator}` : "bez modyfikatora"}.</p>
    <div class="form-group"><label>Nazwa</label><input type="text" name="nazwa" value="${esc(nazwa)}" placeholder="np. Sklep Kowalskiego" required></div>
    <fieldset><legend>Kategorie główne (2–3; ok. 80% miejsc)</legend><div class="neuro-punkt-kategorie">${kat}</div>
      <label class="checkbox"><input type="checkbox" name="podstawy" ${podstawy ? "checked" : ""}> Podstawy (woda, jedzenie, leki, .22 LR i 9 mm)</label>
      <label class="checkbox"><input type="checkbox" name="losowe"> Losuj 2–3 kategorie</label>
      <p class="hint">Bez kategorii i bez Podstaw — pusty punkt, towar dokładasz ręcznie (RAW „wybrane”).</p></fieldset>
    <div class="form-group"><label>Miejsc na liście</label><input type="number" name="miejsca" min="1" max="200" value="${miejsca ?? lok?.miejsca ?? 15}"></div>
    <div class="form-group"><label>Fachowiec</label><select name="fachowiec">${fach}</select>
      <p class="hint">Przeróbki broni (s. 128): rusznikarz — dystansowa, kowal — biała, elektronik — Szoker. Puste — z kategorii.</p></div>
    <div class="form-group"><label>Skup (%)</label><input type="number" name="skup" min="0" max="200" step="5" value="${skup ?? Math.round(skupDomyslny({ kobalt: isKobaltEnabled() }) * 100)}"></div>
    <div class="form-group"><label>Ziarno</label><input type="text" name="ziarno" value="${esc(ziarno)}" placeholder="domyślnie nazwa — ten sam tekst, ten sam towar"></div>
  </div>`;
}

/** [Nowy punkt handlowy] na zakładce Postój. */
export async function oknoNowegoPunktu(grupa) {
  if (!game.user.isGM) return null;
  const m = getMiejsce(grupa);
  if (!maMiejsce(m)) {
    ui.notifications.warn("Najpierw ustaw miejsce postoju drużyny.");
    return null;
  }
  const f = await foundry.applications.api.DialogV2.wait({
    window: { title: "Nowy punkt handlowy", icon: "fa-solid fa-store" },
    position: { width: 520 },
    content: _formularzPunktu(m),
    buttons: [
      { action: "ok", label: "Utwórz", icon: "fa-solid fa-store", default: true,
        callback: (_ev, button) => new foundry.applications.ux.FormDataExtended(button.form).object },
      { action: "anuluj", label: "Anuluj", icon: "fa-solid fa-xmark" }
    ],
    rejectClose: false
  });
  if (!f || typeof f !== "object") return null;
  let kategorie = Object.keys(GRUPY_TOWARU).filter(k => f[`kat.${k}`]);
  if (f.losowe) {
    const rng = rngZZiarna(f.ziarno || f.nazwa);
    const wszystkie = Object.keys(GRUPY_TOWARU);
    const ile = 2 + Math.floor(rng() * 2);
    kategorie = [];
    while (kategorie.length < ile) {
      const k = wszystkie[Math.floor(rng() * wszystkie.length)];
      if (!kategorie.includes(k)) kategorie.push(k);
    }
  }
  const actor = await nowyPunkt({
    nazwa: String(f.nazwa ?? "").trim() || "Punkt handlowy", miejsce: m, kategorie,
    miejsca: Number(f.miejsca), podstawy: !!f.podstawy,
    fachowiec: f.fachowiec === "" ? undefined : f.fachowiec,
    skup: Number(f.skup), ziarno: String(f.ziarno ?? "").trim() || undefined
  });
  ui.notifications.info(`${actor.name}: ${actor.items.size} pozycji towaru.`);
  return actor;
}

/** [Losuj od nowa] — potwierdzenie wylicza, co zniknie (D30). */
export async function oknoLosujOdNowa(actor) {
  if (!game.user.isGM) return;
  const d = daneHandlarza(actor);
  const lista = actor.items.map(i => `${esc(i.name)}${(i.system.quantity ?? 1) > 1 ? ` ×${i.system.quantity}` : ""}`);
  const wynik = await foundry.applications.api.DialogV2.wait({
    window: { title: `Losuj od nowa — ${actor.name}`, icon: "fa-solid fa-dice" },
    content: `<p>Cały towar zostanie zastąpiony — także ręczne dodatki i to, co handlarz odkupił od graczy:</p>
      <p class="neuro-punkt-znika">${lista.join(", ") || "<em>(pusto)</em>"}</p>
      <div class="form-group"><label>Ziarno</label><input type="text" name="ziarno" value="${esc(d.ziarno)}">
      <p class="hint">To samo ziarno — ten sam towar co przy tworzeniu.</p></div>`,
    buttons: [
      { action: "ok", label: "Losuj", icon: "fa-solid fa-dice", default: true,
        callback: (_ev, button) => ({ ziarno: String(button.form.elements.ziarno.value ?? "").trim() || d.ziarno }) },
      { action: "anuluj", label: "Anuluj", icon: "fa-solid fa-xmark" }
    ],
    rejectClose: false
  });
  if (!wynik || typeof wynik !== "object") return;
  await wygenerujTowar(actor, { ziarno: wynik.ziarno });
}

/** [Usuń punkt]. */
export async function usunPunkt(actor) {
  if (!game.user.isGM) return;
  const ok = await foundry.applications.api.DialogV2.confirm({
    window: { title: `Usuń punkt handlowy — ${actor.name}` },
    content: `<p>Usunąć <strong>${esc(actor.name)}</strong> razem z towarem (${actor.items.size} pozycji)?</p>`
  });
  if (ok) await actor.delete();
}

/** Linia notki dla MG. */
export function notkaWizyty(actor) {
  const d = daneHandlarza(actor);
  return {
    wizyta: d.wizyta !== null ? formatWorldTime(d.wizyta) : null,
    wygenerowano: d.wygenerowano !== null ? formatWorldTime(d.wygenerowano) : null
  };
}

export function registerHandlarz() {
  zarejestrujProsbe("wizytaHandlarza", async (_n, d) => {
    const h = await fromUuid(d.handlarz);
    if (h) await h.setFlag(MODULE_ID, `${FLAGA_HANDLARZA}.wizyta`, game.time.worldTime);
  });
}

export const handlarzApi = Object.freeze({
  nowy: nowyPunkt, okno: oknoNowegoPunktu, wygeneruj: wygenerujTowar, losujOdNowa: oknoLosujOdNowa, usun: usunPunkt,
  miejsca: handlarzeMiejsca, dane: daneHandlarza, jest: jestHandlarzem, portret: portretHandlarza
});
