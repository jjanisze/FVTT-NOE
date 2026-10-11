/**
 * Neuroshima 5e — portfel ukryty i waluty lokalne (PLAN_m5_postoj.md §7.8, D1, D17, D39, U41, U43).
 *
 * **Zawsze barter.** Gambel to miara wartości, nie waluta (s. 43) — portfel `system.currency` znika z kart
 * postaci, drużyny, pojazdów, pojemników i z okna nagrody. Ukrycie CSS-em, **nie usunięciem**: sekcja
 * `.currency` zostaje w DOM, bo pod nią wstrzykują się panele ekwipunku (amunicja, granaty, magazynki,
 * prowiant, surowce — wszystkie robią `.after()` na niej). Nagroda w gb (`[[/award]]`) nie jest blokowana —
 * MG dostaje ostrzeżenie, a audyt pokazuje, kto ma gb do zamiany na przedmioty.
 *
 * **Waluty lokalne** (U41) to przedmioty z flagą `walutaLokalna: { region }`: w swoim regionie pełna wartość,
 * poza nim — „wartość wg MG” (domyślnie 0, D39). Żeton Luxor jest walutą Vegas także bez flagi.
 */

import { REGIONY } from "../config/handel-data.mjs";
import { isZetonLuxor } from "../wkk/items/zeton-luxor.mjs";
import { kartaPostoju, wyslijKarte } from "./karty.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
export const FLAGA_WALUTY = "walutaLokalna";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/* -------------------------------------------- */
/*  Waluty lokalne                               */
/* -------------------------------------------- */

/** Waluta lokalna przedmiotu `{ region }` albo `null`. Żeton Luxor — Vegas (F16). */
export function walutaLokalna(item) {
  const f = item?.getFlag?.(MODULE_ID, FLAGA_WALUTY) ?? item?.flags?.[MODULE_ID]?.[FLAGA_WALUTY];
  if (f?.region && REGIONY[f.region]) return { region: f.region };
  if (isZetonLuxor(item)) return { region: "vegas" };
  return null;
}

/** Pole MG w karcie przedmiotu (loot, consumable): „Waluta lokalna: region”. */
function _onRenderItemSheet(app, html) {
  if (!game.user.isGM) return;
  const item = app.document ?? app.item;
  if (!item || !["loot", "consumable"].includes(item.type)) return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  const tab = root?.querySelector('.tab[data-tab="details"]');
  if (!tab || tab.querySelector(".neuro-waluta-lokalna")) return;
  const teraz = walutaLokalna(item)?.region ?? "";
  const opcje = [`<option value="">— nie jest walutą</option>`, ...Object.entries(REGIONY).map(([k, v]) =>
    `<option value="${k}" ${teraz === k ? "selected" : ""}>${esc(v.label)}</option>`)].join("");
  const fs = document.createElement("fieldset");
  fs.className = "neuro-waluta-lokalna";
  fs.innerHTML = `<legend>Waluta lokalna (MG)</legend>
    <div class="form-group"><label>Region</label><div class="form-fields"><select>${opcje}</select></div>
    <p class="hint">W swoim regionie pełna wartość; poza nim — wartość wg MG (domyślnie 0, s. 43).</p></div>`;
  fs.querySelector("select").addEventListener("change", async ev => {
    const region = ev.target.value;
    if (region) await item.setFlag(MODULE_ID, FLAGA_WALUTY, { region });
    else await item.unsetFlag(MODULE_ID, FLAGA_WALUTY);
  });
  tab.append(fs);
}

/* -------------------------------------------- */
/*  Portfel                                      */
/* -------------------------------------------- */

/** Suma gambli w portfelu aktora (wszystkie nominały przeliczone przez `conversion`, gb = 1). */
export function gbWPortfelu(actor) {
  const cur = actor?.system?.currency ?? {};
  let suma = 0;
  for (const [k, v] of Object.entries(cur)) {
    const n = Number(v) || 0;
    if (!n) continue;
    const conv = Number(CONFIG.DND5E.currencies?.[k]?.conversion) || 1;
    suma += n / conv;
  }
  return Math.round(suma * 100) / 100;
}

/**
 * Audyt jednorazowy (D17, U43): aktorzy z gb w portfelu → karta MG. Zamiana na przedmioty ręcznie.
 * @returns {Promise<{aktor: Actor, gb: number}[]>}
 */
export async function audytPortfela({ karta = true } = {}) {
  const lista = game.actors.map(a => ({ aktor: a, gb: gbWPortfelu(a) })).filter(x => x.gb > 0)
    .sort((a, b) => b.gb - a.gb);
  if (karta && game.user.isGM) {
    await wyslijKarte(kartaPostoju({
      ikona: "icons/svg/coins.svg",
      tytul: "Audyt portfela",
      podtytul: lista.length ? `${lista.length} aktorów z gamblami w portfelu` : "Portfele puste",
      rodzaj: lista.length ? "braki" : "sukces",
      linie: lista.length
        ? [`Gamble nie są walutą (s. 43) — portfel jest ukryty. Zamień na przedmioty (np. .22 LR, prowiant, surowce) i wyzeruj:`,
          ...lista.map(x => `<a class="content-link" data-uuid="${x.aktor.uuid}" data-link><i class="fa-solid fa-user" inert></i>${esc(x.aktor.name)}</a> — <strong>${x.gb} gb</strong>`)]
        : ["Nikt nie ma gambli w portfelu."]
    }), { szept: "gm" });
  }
  return lista;
}

/** Nagroda w gb nie jest blokowana — ostrzeżenie dla MG (U43). */
function _owinNagrode() {
  const Award = globalThis.dnd5e?.applications?.Award;
  if (!Award || Award.awardCurrency?.neuroPortfel) return;
  const original = Award.awardCurrency;
  const wrapped = async function (amounts, destinations, opts) {
    const ile = Object.values(amounts ?? {}).reduce((a, b) => a + (Number(b) || 0), 0);
    if (ile > 0 && game.user.isGM) {
      console.warn(`${MODULE_ID} | Nagroda w gb (${JSON.stringify(amounts)}) trafia do ukrytego portfela — barter (s. 43).`);
      ui.notifications.warn("Nagroda w gamblach trafia do ukrytego portfela — w Neuroshimie płaci się przedmiotami. Audyt: game.neuroshima.handel.audytPortfela().");
    }
    return original.call(this, amounts, destinations, opts);
  };
  wrapped.neuroPortfel = true;
  Award.awardCurrency = wrapped;
}

export function registerPortfel() {
  Hooks.on("renderItemSheet5e", _onRenderItemSheet);
  Hooks.once("ready", _owinNagrode);
}
