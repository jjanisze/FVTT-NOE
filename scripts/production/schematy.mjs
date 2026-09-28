/**
 * Neuroshima 5e — Schematy w grze (PLAN_produkcja §7, etap E3) i wagi pochodne produkcji.
 *
 * - **Wagi pochodne.** Schemat (D15) i Robota (D4 / D25) ważą według *bieżącego* ustawienia
 *   WKK. Liczymy to w `prepareDerivedData` przedmiotu, nie w danych: przełącznik zmienia wagę
 *   od razu, a paczka `schematy` może być jedna dla obu wersji zasad. Udźwig dnd5e liczy się
 *   po przygotowaniu przedmiotów, więc widzi już właściwą wartość.
 * - **„Utwórz schemat” (MG)** — w menu nagłówka karty dowolnego przedmiotu z ceną. Schemat
 *   ląduje u aktora zaznaczonego żetonu, a bez zaznaczenia — w katalogu przedmiotów świata.
 * - **Podpowiedź w Ekwipunku** — przy Schemacie: „umiesz” albo czego brakuje.
 */

import { schematItemData, SCHEMAT_FLAG } from "../config/schematy-data.mjs";
import { PRZEPISY_STANDARDOWE, przepisAdHoc, KATALOG } from "../config/recipes-data.mjs";
import { wagaSchematuKg, wagaRoboty, fmtGGMM } from "../config/production-rules.mjs";
import { formatToolExpr, parseToolExpr, ToolExprError } from "../config/tool-expr.mjs";
import { refDlaPrzedmiotu } from "./wynik.mjs";
import { ocenNarzedzia } from "./wykonawca.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/* -------------------------------------------- */
/*  Wagi pochodne                               */
/* -------------------------------------------- */

function _wrapPrepareDerivedData() {
  const proto = CONFIG.Item.documentClass.prototype;
  const original = proto.prepareDerivedData;
  proto.prepareDerivedData = function () {
    original.apply(this, arguments);
    const f = this.flags?.[MODULE_ID];
    if (!f || !this.system?.weight) return;
    try {
      if (f[SCHEMAT_FLAG]) this.system.weight.value = wagaSchematuKg(f[SCHEMAT_FLAG].minuty ?? 0);
      else if (f.robota) {
        const r = f.robota;
        this.system.weight.value = wagaRoboty({ wejscie: r.wagaWejscia, wynik: r.wagaWyniku, postep: r.postep, wymagane: r.wymagane });
      }
    } catch (err) {
      console.warn(`${MODULE_ID} | waga produkcji`, err);
    }
  };
}

/* -------------------------------------------- */
/*  „Utwórz schemat” (MG)                       */
/* -------------------------------------------- */

/**
 * Schemat dla przedmiotu: przepis standardowy, gdy przedmiot jest w katalogu; inaczej ad hoc
 * (cena z przedmiotu, narzędzia od MG) — wtedy snapshot przepisu jedzie w Schemacie.
 * @param {Item} item
 * @param {{cel?: Actor|null, narzedzia?: string}} [o]
 */
export async function utworzSchemat(item, { cel = null, narzedzia = null } = {}) {
  if (!game.user.isGM) return ui.notifications.warn("Schematy tworzy MG.");
  const ref = await refDlaPrzedmiotu(item);
  const std = ref ? PRZEPISY_STANDARDOWE.get(`std/${ref}`) : null;
  let data;
  if (std) {
    data = schematItemData(std);
  } else {
    const cena = Number(item.system?.price?.value) || 0;
    if (cena <= 0) return ui.notifications.warn(`${item.name}: bez ceny — nie ma z czego policzyć przepisu.`);
    if (narzedzia == null) {
      narzedzia = await foundry.applications.api.DialogV2.prompt({
        window: { title: `Schemat: ${item.name}`, icon: "fa-solid fa-scroll" },
        content: `<p>Przedmiotu nie ma w katalogu — przepis ad hoc z ceny <strong>${cena} gb</strong>.</p>`
          + `<label>Narzędzia (np. „kowala | stolarza”, puste = bez narzędzi) <input type="text" name="n" autofocus></label>`,
        ok: { label: "Utwórz", callback: (event, button) => button.form.elements.n.value }
      }).catch(() => null);
      if (narzedzia == null) return null;
    }
    try { parseToolExpr(narzedzia); } catch (err) {
      return ui.notifications.error(err instanceof ToolExprError ? err.message : String(err));
    }
    const dane = item.toObject();
    const p = przepisAdHoc({
      id: `adhoc/${foundry.utils.randomID(12)}`, nazwa: item.name, cena,
      jednorazowy: item.type === "consumable", narzedzia, dane
    });
    data = schematItemData(p, { snapshot: true });
  }
  const created = cel
    ? (await cel.createEmbeddedDocuments("Item", [data]))[0]
    : await Item.implementation.create(data);
  ui.notifications.info(`${created.name} → ${cel ? cel.name : "katalog przedmiotów"}.`);
  return created;
}

function _onHeaderControls(app, controls) {
  const item = app.document;
  if (!game.user.isGM || !(item instanceof Item)) return;
  if (item.flags?.[MODULE_ID]?.[SCHEMAT_FLAG] || item.flags?.[MODULE_ID]?.robota) return;
  if (!(Number(item.system?.price?.value) > 0)) return;
  controls.push({
    icon: "fa-solid fa-scroll",
    label: "Utwórz schemat",
    action: "neuroUtworzSchemat",
    onClick: () => {
      const cel = canvas?.tokens?.controlled?.[0]?.actor ?? null;
      return utworzSchemat(item, { cel });
    }
  });
}

/* -------------------------------------------- */
/*  Podpowiedź w Ekwipunku                      */
/* -------------------------------------------- */

function _przepisSchematu(item) {
  const s = item.flags?.[MODULE_ID]?.[SCHEMAT_FLAG];
  return s?.snapshot ?? PRZEPISY_STANDARDOWE.get(s?.przepisId) ?? null;
}

function _onRenderSheet(app, html) {
  const actor = app.document ?? app.actor;
  if (actor?.type !== "character") return;
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;
  for (const item of actor.items) {
    if (!item.flags?.[MODULE_ID]?.[SCHEMAT_FLAG]) continue;
    // Sekcja zakładki ma klasę „tab”, a nazwę tylko w `data-tab` — nie `.tab.inventory`.
    const li = root.querySelector(`[data-tab="inventory"] li[data-item-id="${item.id}"]`);
    const row = li?.querySelector(".item-name .name") ?? li?.querySelector(".item-name");
    if (!row || row.querySelector(".neuro-schemat-badge")) continue;
    const p = _przepisSchematu(item);
    if (!p) continue;
    const ocena = ocenNarzedzia(actor, p);
    const badge = document.createElement("span");
    badge.className = `neuro-schemat-badge ${ocena.ok ? "is-ok" : "is-brak"}`;
    badge.textContent = ocena.ok ? "umiesz" : "brak narzędzi";
    badge.dataset.tooltipHtml = `<strong>${esc(p.nazwa)}</strong><br>ST ${p.st} · ${fmtGGMM(p.minuty)} · `
      + `${esc(formatToolExpr(parseToolExpr(p.narzedzia)))}`
      + (ocena.ok ? "" : `<br>Brakuje: ${esc(formatToolExpr(ocena.brakuje))}`);
    row.appendChild(badge);
  }
}

export function registerSchematy() {
  _wrapPrepareDerivedData();
  // dnd5e: ItemSheet5e → … → DocumentSheet5e → DocumentSheetV2 — bez ItemSheetV2 w łańcuchu,
  // więc hak na ItemSheetV2 nigdy nie pada. `_onHeaderControls` sam odsiewa nie-przedmioty.
  Hooks.on("getHeaderControlsDocumentSheetV2", _onHeaderControls);
  Hooks.on("renderCharacterActorSheet", _onRenderSheet);
}

export const schematyApi = Object.freeze({ utworz: utworzSchemat, dane: schematItemData, KATALOG });
