/**
 * Neuroshima 5e — rozbiórka na surowce (PLAN_m5_postoj.md §7.20, D22, U52).
 *
 * „Rozbierz na surowce” w menu przedmiotu: dla zepsutych (zacięta albo uszkodzona broń, wyszczerbiona broń biała,
 * pancerz z utraconą TT, wrak drona) u właściciela, u MG — dla każdego. Prośba idzie do MG; karta MG z propozycją
 * (T2): połowa surowców przepisu standardowego (w dół; wrak drona — przepis drona), Test narzędzi z przepisu, czas
 * jak „Trochę roboty” (1k4 h). [Zatwierdź] — okno z liczbami do zmiany → surowce do właściciela lejkiem, przedmiot
 * znika; [Odrzuć].
 */

import { KATALOG, PRZEPISY_STANDARDOWE, PRZEPISY_PROFESJI, PRZEPISY_ELABORACJI, PRZEPISY_ZDOLNOSCI, przepis as przepisPoId } from "../config/recipes-data.mjs";
import { RODZAJE } from "../config/towarzysze-data.mjs";
import { NAPRAWA } from "../config/production-rules.mjs";
import { refDlaPrzedmiotu } from "../production/wynik.mjs";
import { stanNaprawy, rzucCzas } from "../production/naprawa.mjs";
import { isJammed } from "../weapons/jams.mjs";
import { towarzysz } from "../actors/towarzysze.mjs";
import { FLAG_UCHWYT, dronUchwytu, jestWrakiem } from "../actors/drony.mjs";
import { giveManySurowce } from "../actors/surowce-store.mjs";
import { kartaPostoju, wyslijKarte, zarejestrujAkcje } from "./karty.mjs";
import { doMG, zarejestrujProsbe } from "./przekaznik.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const ETYKIETY = Object.freeze({ CH: "chemikalia", MK: "metal", CE: "elektronika", CZ: "części", MO: "materiały organiczne" });

/** Wrak drona (uchwyt z martwym dronem). */
function _wrakDrona(item) {
  if (!item?.flags?.[MODULE_ID]?.[FLAG_UCHWYT]) return null;
  const dron = dronUchwytu(item);
  return dron && jestWrakiem(dron) ? dron : null;
}

/** Czy przedmiot jest zepsuty (U52): zacięty, wymaga naprawy, albo wrak drona. */
export function zepsuty(item) {
  try {
    return isJammed(item) || stanNaprawy(item).potrzebna || !!_wrakDrona(item);
  } catch { return false; }
}

/** Przepis, z którego przedmiot by powstał: standardowy po `ref`, inaczej dowolny z tym wynikiem. */
function _przepisDla(ref) {
  if (!ref) return null;
  const std = przepisPoId(`std/${ref}`);
  if (std) return std;
  for (const mapa of [PRZEPISY_STANDARDOWE, PRZEPISY_PROFESJI, PRZEPISY_ELABORACJI, PRZEPISY_ZDOLNOSCI]) {
    for (const p of mapa.values()) if (p.wynik?.ref === ref) return p;
  }
  return null;
}

/**
 * Propozycja rozbiórki (D22): połowa surowców przepisu (w dół), narzędzia i ST z przepisu. Bez przepisu —
 * ¼ ceny katalogu jako części (MG poprawia).
 * @returns {Promise<{ref: string|null, nazwa: string, surowce: Record<string, number>, narzedzia: string, st: number|null, zrodlo: string}>}
 */
export async function propozycjaRozbiorki(item) {
  const dron = _wrakDrona(item);
  const ref = dron ? `tabela:${RODZAJE[towarzysz(dron)?.rodzaj]?.przepis ?? ""}` : await refDlaPrzedmiotu(item);
  const p = _przepisDla(ref);
  const surowce = {};
  if (p) {
    for (const l of p.surowce ?? []) {
      const kod = l.typy?.[0];
      const ile = Math.floor((Number(l.gb) || 0) / 2);
      if (kod && ile > 0) surowce[kod] = (surowce[kod] ?? 0) + ile;
    }
    return { ref, nazwa: item.name, surowce, narzedzia: p.narzedzia ?? "", st: p.st ?? null, zrodlo: `przepis ${p.nazwa}` };
  }
  const cena = Number(KATALOG.get(ref)?.cena ?? item.system?.price?.value) || 0;
  const cz = Math.floor(cena / 4);
  if (cz > 0) surowce.CZ = cz;
  return { ref, nazwa: item.name, surowce, narzedzia: "", st: null, zrodlo: "bez przepisu — ¼ ceny jako części (MG)" };
}

const _surowceTekst = s => Object.entries(s).map(([k, v]) => `${ETYKIETY[k] ?? k} ${v} gb`).join(", ") || "nic";
const _narzedziaTekst = n => String(n ?? "").split("|").map(x => x.trim()).filter(Boolean).map(k => CONFIG.DND5E.tools[k]?.label ?? k).join(" albo ") || "—";

/** Prośba gracza (albo MG) → karta MG z propozycją. */
async function _karta(_nosiciel, d) {
  const item = await fromUuid(d.item);
  if (!item?.actor) return;
  const p = await propozycjaRozbiorki(item);
  await wyslijKarte(kartaPostoju({
    ikona: item.img, tytul: `Rozbiórka: ${item.name}`, podtytul: `${item.actor.name} · tylko MG`,
    linie: [
      `Propozycja (${esc(p.zrodlo)}): <strong>${esc(_surowceTekst(p.surowce))}</strong> — połowa surowców, w dół (D22).`,
      `Test: ${esc(_narzedziaTekst(p.narzedzia))}${p.st ? `, ST ${p.st}` : ""}. Czas: ${NAPRAWA.troche.label} (${NAPRAWA.troche.kosci} h).`
    ],
    przyciski: [
      { akcja: "rozbiorkaZatwierdz", label: "Zatwierdź…", ikona: "fa-solid fa-check", gm: true, dane: { item: item.uuid } },
      { akcja: "rozbiorkaOdrzuc", label: "Odrzuć", ikona: "fa-solid fa-xmark", gm: true, dane: { item: item.uuid } }
    ]
  }), { szept: "gm", flagi: { rozbiorka: { item: item.uuid } } });
}

/**
 * Zatwierdzenie (MG): surowce do właściciela, przedmiot znika, karta dla stołu z czasem. `surowce` — liczby po
 * poprawkach MG (brak — propozycja).
 */
export async function rozbierz(item, { surowce = null } = {}) {
  if (!game.user.isGM || !item?.actor) return null;
  const p = await propozycjaRozbiorki(item);
  const s = Object.fromEntries(Object.entries(surowce ?? p.surowce).map(([k, v]) => [k, Math.max(0, Math.floor(Number(v) || 0))]).filter(([, v]) => v > 0));
  const actor = item.actor;
  const nazwa = item.name;
  if (Object.keys(s).length) await giveManySurowce(actor, s);
  await item.delete();
  const czas = await rzucCzas("troche");
  await wyslijKarte(kartaPostoju({
    ikona: "icons/tools/smithing/anvil.webp", tytul: `Rozbiórka: ${nazwa}`, podtytul: actor.name,
    linie: [`Odzyskane: <strong>${esc(_surowceTekst(s))}</strong>.`, `Czas: ${Math.round(czas.minuty / 60 * 10) / 10} h (${NAPRAWA.troche.kosci} h).`]
  }), { actor });
  return s;
}

async function _okno(item) {
  const p = await propozycjaRozbiorki(item);
  const kody = [...new Set([...Object.keys(p.surowce), "CZ", "MK", "CE", "CH"])];
  const dane = await foundry.applications.api.DialogV2.input({
    window: { title: `Rozbiórka: ${item.name}` },
    content: `<p class="hint">Propozycja: ${esc(_surowceTekst(p.surowce))} (${esc(p.zrodlo)}). Popraw liczby (gb).</p>`
      + kody.map(k => `<div class="form-group"><label>${esc(ETYKIETY[k] ?? k)}</label><input type="number" name="${k}" min="0" step="1" value="${p.surowce[k] ?? 0}"></div>`).join(""),
    ok: { label: "Rozbierz", icon: "fa-solid fa-hammer" },
    rejectClose: false
  });
  return dane ? rozbierz(item, { surowce: dane }) : null;
}

function _onItemContext(item, options) {
  if (!item?.actor || !["weapon", "equipment", "tool", "loot", "consumable"].includes(item.type)) return;
  options.push({
    name: "Rozbierz na surowce",
    icon: '<i class="fa-solid fa-hammer"></i>',
    condition: () => item.isOwner && (game.user.isGM || zepsuty(item)),
    callback: () => doMG("rozbiorka", { item: item.uuid })
  });
}

export function registerRozbiorka() {
  Hooks.on("dnd5e.getItemContextOptions", _onItemContext);
  zarejestrujProsbe("rozbiorka", _karta);
  zarejestrujAkcje("rozbiorkaZatwierdz", async (_ev, btn) => {
    if (!game.user.isGM) return;
    const item = await fromUuid(btn.dataset.item);
    if (!item) return ui.notifications.warn("Przedmiotu już nie ma.");
    if (await _okno(item)) btn.disabled = true;
  });
  zarejestrujAkcje("rozbiorkaOdrzuc", async (_ev, btn) => {
    if (!game.user.isGM) return;
    btn.disabled = true;
    btn.closest(".neuro-robota-przyciski")?.querySelectorAll("button").forEach(b => { b.disabled = true; });
  });
}

export const rozbiorkaApi = Object.freeze({ propozycja: propozycjaRozbiorki, rozbierz, zepsuty });
