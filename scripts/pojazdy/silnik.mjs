/**
 * Neuroshima 5e — silnik, światła, kluczyki, odpalanie na krótko (PLAN_m4_pojazdy §4.5, D7, D12, D18, E4).
 *
 * Stan żyje we fladze `silnik` aktora pojazdu (żeton niepowiązany — w jego delcie): `{wl, swiatla, naKrotko}`.
 * Efekty (dym, drgania, dźwięk) każdy klient liczy sam z tej flagi — `efekty-silnika.mjs`; w scenie nic się
 * nie zapisuje poza światłem żetonu.
 *
 * ## Co blokuje, a co tylko oznacza (D7)
 *
 * Skutki zastosowane przez MG są pewne, więc blokują: awaria 15 (silnik zgasł), awaria 17 (zapłon zawodzi),
 * pusty bak. Rzeczy, których moduł nie wie na pewno — dwie wolne ręce z lalki, kluczyki u kierowcy albo w
 * stacyjce — tylko oznacza na karcie. MG mówi „nie, to się nie stało”, gracz robi **Zgaś** (bez kosztu) i
 * wracamy do punktu wyjścia. Uruchomienie nie zużywa paliwa.
 *
 * ## Kluczyki (D12, WKK)
 *
 * Kluczyki to przedmiot z identyfikatorem pojazdu (`pojazd.id`, nadawany przy utworzeniu aktora; żeton
 * niepowiązany dostaje własny w delcie, a skopiowany żeton tego samego pojazdu zachowuje stary). Pasują do
 * jednego pojazdu. „Odpalony na krótko” (sukces Na krótko albo przełącznik MG) — trwale bez kluczyków.
 */

import { kartaPostoju, wyslijKarte } from "../postoj/karty.mjs";
import { doMG, zarejestrujProsbe } from "../postoj/przekaznik.mjs";
import { freeHands } from "../actors/doll.mjs";
import { hasToolKit } from "../actors/tool-availability.mjs";
import { getPaliwo } from "../actors/party-travel.mjs";
import { ST_NA_KROTKO } from "../config/vehicles-data.mjs";
import { MODULE_ID, FLAGA_POJAZD, danePojazdu, jestPojazdem } from "./stan.mjs";
import { kierowcaPojazdu } from "./jadacy.mjs";

export const FLAGA_SILNIK = "silnik";
export const FLAGA_KLUCZYKI = "kluczyki";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/** Rejestr sprawdzeń awarii (E6 podpina `aktywneAwarie`): `(actor) => number[]` — numery k20 aktywnych awarii. */
let _awarieAktywne = () => [];
export function ustawZrodloAwarii(fn) {
  _awarieAktywne = fn;
}

/* -------------------------------------------- */
/*  Stan                                         */
/* -------------------------------------------- */

/** `{wl, swiatla, naKrotko}` silnika pojazdu. */
export function stanSilnika(actor) {
  const s = actor?.flags?.[MODULE_ID]?.[FLAGA_SILNIK] ?? {};
  return { wl: !!s.wl, swiatla: !!s.swiatla, naKrotko: !!s.naKrotko };
}

/** Czy pojazd ma silnik (zestaw efektów z katalogu). */
export function maSilnik(actor) {
  return !!danePojazdu(actor)?.katalog.silnik;
}

/** Identyfikator kluczyków pojazdu. */
export function idKluczykow(actor) {
  return actor?.flags?.[MODULE_ID]?.[FLAGA_POJAZD]?.id ?? null;
}

/** Czy przedmiot to kluczyki do tego pojazdu. */
export function pasujaKluczyki(item, actor) {
  const id = idKluczykow(actor);
  return !!id && item?.flags?.[MODULE_ID]?.[FLAGA_KLUCZYKI]?.pojazd === id;
}

/** Kluczyki pod ręką: u kierowcy albo w stacyjce (ładownia pojazdu). */
export function kluczykiPodReka(pojazdActor, kierowcaActor) {
  const w = a => a?.items?.find(i => pasujaKluczyki(i, pojazdActor)) ?? null;
  return w(kierowcaActor) ?? w(pojazdActor);
}

/**
 * Oznaczenia i blokady uruchomienia.
 * @returns {{blokady: string[], oznaczenia: string[]}}
 */
export function warunkiUruchomienia(pojazdDoc, { zKierowca = null } = {}) {
  const actor = pojazdDoc.actor;
  const blokady = [], oznaczenia = [];
  const awarie = _awarieAktywne(actor);
  if (awarie.includes(15)) blokady.push("Awaria 15 — silnik zgasł; najpierw naprawa.");
  if (awarie.includes(17)) blokady.push("Awaria 17 — zapłon zawodzi (układ elektryczny).");
  const bak = actor.flags?.[MODULE_ID]?.paliwo ? getPaliwo(actor) : null;
  if (bak && bak.value <= 0) blokady.push("Pusty bak.");
  const kier = zKierowca ?? kierowcaPojazdu(pojazdDoc);
  if (!kier) oznaczenia.push("Nikt nie siedzi za kierownicą.");
  else {
    const reka = freeHands(kier.actor);
    if (reka < 2) oznaczenia.push(`Kierowca ma ${reka} wolną rękę${reka === 0 ? " — żadnej" : ""} (kierownica: dwie, s. 260).`);
  }
  const s = stanSilnika(actor);
  if (!s.naKrotko && !kluczykiPodReka(actor, kier?.actor)) oznaczenia.push("Brak kluczyków u kierowcy i w stacyjce.");
  return { blokady, oznaczenia };
}

/* -------------------------------------------- */
/*  Uruchom / Zgaś / Światła                      */
/* -------------------------------------------- */

async function _ustaw(actor, patch) {
  await actor.update({ [`flags.${MODULE_ID}.${FLAGA_SILNIK}`]: { ...stanSilnika(actor), ...patch } });
}

/** Czas uruchomienia dla kierowcy (Pancerna fura — akcja bonusowa) — podpina `wojownik.mjs`. */
let _czasUruchomienia = () => "akcja";
export function ustawCzasUruchomienia(fn) {
  _czasUruchomienia = fn;
}

/** Uruchom (akcja; Pancerna fura — akcja bonusowa, E7). */
export async function uruchom(pojazdDoc, { czas = null } = {}) {
  czas ??= _czasUruchomienia(pojazdDoc);
  const actor = pojazdDoc.actor;
  if (!maSilnik(actor)) return ui.notifications.info(`${pojazdDoc.name} nie ma silnika — jedzie siłą mięśni.`);
  if (!actor.isOwner) return ui.notifications.warn("Uruchamia kierowca (albo MG).");
  const s = stanSilnika(actor);
  if (s.wl) return ui.notifications.info(`${pojazdDoc.name}: silnik już pracuje.`);
  const { blokady, oznaczenia } = warunkiUruchomienia(pojazdDoc);
  const kier = kierowcaPojazdu(pojazdDoc);
  if (blokady.length) {
    await wyslijKarte(kartaPostoju({
      ikona: pojazdDoc.texture.src, tytul: "Silnik nie zapala", rodzaj: "porazka",
      linie: [`<strong>${esc(pojazdDoc.name)}</strong> — ${blokady.map(esc).join(" ")}`]
    }), { actor: kier?.actor ?? actor, flagi: { pojazdDzwiek: { pojazd: pojazdDoc.uuid, rodzaj: "nieudane" } } });
    return false;
  }
  await _ustaw(actor, { wl: true });
  await wyslijKarte(kartaPostoju({
    ikona: pojazdDoc.texture.src, tytul: "Uruchomienie silnika", rodzaj: oznaczenia.length ? "test" : "sukces",
    linie: [`<strong>${esc(pojazdDoc.name)}</strong>: silnik pracuje (${czas === "bonus" ? "akcja bonusowa" : "akcja"} kierowcy). Pojazd może jechać z pełną Szybkością.`],
    ostrzezenia: oznaczenia.length ? [...oznaczenia, "Jeśli to się nie wydarzyło — Zgaś (bez kosztu)."] : []
  }), { actor: kier?.actor ?? actor });
  return true;
}

/** Zgaś — bez kosztu (D7; RAW: zatrzymanie jest częścią jazdy, Pancerna fura daje je w akcji bonusowej). */
export async function zgas(pojazdDoc) {
  const actor = pojazdDoc.actor;
  if (!actor.isOwner) return ui.notifications.warn("Gasi kierowca (albo MG).");
  if (!stanSilnika(actor).wl) return;
  await _ustaw(actor, { wl: false });
}

/** Światła (D18): kierowca i MG; działają bez silnika (akumulator); awaria 17 je gasi. */
export async function przelaczSwiatla(pojazdDoc, wl = null) {
  const actor = pojazdDoc.actor;
  if (!actor.isOwner) return ui.notifications.warn("Światła włącza kierowca (albo MG).");
  const s = stanSilnika(actor);
  const nowy = wl ?? !s.swiatla;
  if (nowy && _awarieAktywne(actor).includes(17)) return ui.notifications.warn("Awaria 17 — światła nie działają.");
  await _ustaw(actor, { swiatla: nowy });
  await ustawSwiatloZetonow(actor, nowy);
}

/** Światło żetonów pojazdu na scenach: stożek ok. 60° do przodu, jasne 18 m, przyćmione 36 m. */
export async function ustawSwiatloZetonow(actor, wl) {
  const swiatlo = wl
    ? { angle: 60, bright: 18, dim: 36, color: "#ffe9b0", alpha: 0.45, luminosity: 0.5, attenuation: 0.6 }
    : { angle: 360, bright: 0, dim: 0 };
  const zetony = actor.isToken ? [actor.token] : game.scenes.contents.flatMap(s => s.tokens.filter(t => t.actorLink && t.actorId === actor.id));
  for (const t of zetony) if (t.isOwner) await t.update({ light: swiatlo });
}

/* -------------------------------------------- */
/*  Kluczyki                                     */
/* -------------------------------------------- */

/** MG: kluczyki do pojazdu — w stacyjce (ładowni) albo u wskazanego aktora. */
export async function utworzKluczyki(pojazdDoc, { dla = null } = {}) {
  if (!game.user.isGM) return;
  const actor = pojazdDoc.actor;
  let id = idKluczykow(actor);
  if (!id) {
    id = foundry.utils.randomID();
    await actor.update({ [`flags.${MODULE_ID}.${FLAGA_POJAZD}.id`]: id });
  }
  const cel = dla ?? actor;
  const [item] = await cel.createEmbeddedDocuments("Item", [{
    name: `Kluczyki — ${pojazdDoc.name}`, type: "loot", img: "icons/sundries/misc/key-modern.webp",
    system: { quantity: 1, weight: { value: 0.05, units: "kg" }, price: { value: 0, denomination: "gb" },
      description: { value: `<p>Kluczyki do jednego pojazdu: <strong>${esc(pojazdDoc.name)}</strong>. Do innego tego samego typu nie pasują.</p>` } },
    flags: { [MODULE_ID]: { [FLAGA_KLUCZYKI]: { pojazd: id, nazwa: pojazdDoc.name } } }
  }]);
  return item;
}

/** MG: przełącznik „na kluczyk” / „odpalony na krótko”. */
export async function ustawNaKrotko(pojazdDoc, wl) {
  if (!game.user.isGM) return;
  await _ustaw(pojazdDoc.actor, { naKrotko: !!wl });
}

/**
 * Na krótko (D12, WKK): akcja kierowcy z narzędziami małego mechanika albo elektronika, ST wg klasy pojazdu.
 * Sukces — trwale odpalony na krótko; porażka — alarm; porażka o 5+ — awaria 17 (pojazd bez awarii: obrażenia).
 */
export async function naKrotko(pojazdDoc, kierowcaDoc = null) {
  const kier = kierowcaDoc ?? kierowcaPojazdu(pojazdDoc);
  if (!kier?.actor?.isOwner) return ui.notifications.warn("Na krótko odpala kierowca — usiądź za kierownicą.");
  const zestaw = ["mechanika", "elektronika"].find(t => hasToolKit(kier.actor, t));
  if (!zestaw) return ui.notifications.warn("Potrzebne narzędzia małego mechanika albo elektronika.");
  const dane = danePojazdu(pojazdDoc.actor);
  const st = ST_NA_KROTKO[dane.katalog.klasa] ?? 15;
  const rolls = await kier.actor.rollToolCheck({ tool: zestaw, target: st }, {},
    { data: { flavor: `Odpalanie na krótko — ${pojazdDoc.name} (ST ${st})` } });
  const roll = Array.isArray(rolls) ? rolls[0] : rolls;
  if (!Number.isFinite(roll?.total)) return null;
  return doMG("pojazd.naKrotko", { pojazd: pojazdDoc.uuid, wynik: roll.total, st }, { nosiciel: kier.actor });
}

/** Rejestr awarii do zastosowania z zewnątrz (E6 podpina `zastosujAwarie`). */
let _zastosujAwarie = null;
export function ustawStosowanieAwarii(fn) {
  _zastosujAwarie = fn;
}

async function _naKrotkoMG(_n, { pojazd, wynik, st }) {
  const p = await fromUuid(pojazd);
  if (!p) return;
  const linie = [`Odpalanie na krótko <strong>${esc(p.name)}</strong>: ${wynik} przy ST ${st}.`];
  let rodzaj = "sukces";
  const flagi = {};
  if (wynik >= st) {
    await _ustaw(p.actor, { naKrotko: true });
    linie.push("Sukces — pojazd <strong>odpalony na krótko</strong>: odtąd Uruchom bez kluczyków.");
  } else {
    rodzaj = "porazka";
    flagi.pojazdDzwiek = { pojazd, rodzaj: "alarm" };
    linie.push("Porażka — <strong>alarm</strong> (klakson, syrena).");
    if (st - wynik >= 5) {
      if (maSilnik(p.actor) && _zastosujAwarie) {
        await _zastosujAwarie(p, 17, { zrodlo: "na krótko" });
        linie.push("Porażka o 5+ — <strong>awaria 17</strong>: zapłon zawodzi, światła gasną.");
      } else {
        const r = await new Roll("2d6").evaluate();
        await p.actor.applyDamage?.([{ value: r.total, type: "lightning", properties: new Set() }]);
        linie.push(`Porażka o 5+ — zwarcie: <strong>${r.total}</strong> obrażeń pojazdu.`);
      }
    }
  }
  await wyslijKarte(kartaPostoju({ ikona: p.texture.src, tytul: "Na krótko", rodzaj, linie }), { actor: p.actor, flagi });
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

export function registerSilnik() {
  zarejestrujProsbe("pojazd.naKrotko", _naKrotkoMG);

  // Identyfikator kluczyków: nowy dla każdego nowego aktora pojazdu (duplikat też), a żeton niepowiązany
  // dostaje własny w delcie — chyba że to wklejona kopia tego samego pojazdu (D12).
  Hooks.on("preCreateActor", (actor, data, options) => {
    if (!jestPojazdem(actor)) return;
    actor.updateSource({ [`flags.${MODULE_ID}.${FLAGA_POJAZD}.id`]: foundry.utils.randomID(),
      [`flags.${MODULE_ID}.${FLAGA_SILNIK}`]: { wl: false, swiatla: false, naKrotko: false } });
  });
  Hooks.on("preCreateToken", (doc, data, options) => {
    if (doc.actorLink || options.isPaste || !jestPojazdem(doc.actor)) return;
    if (foundry.utils.getProperty(data, `delta.flags.${MODULE_ID}.${FLAGA_POJAZD}.id`)) return;
    doc.updateSource({ [`delta.flags.${MODULE_ID}.${FLAGA_POJAZD}.id`]: foundry.utils.randomID() });
  });
}
