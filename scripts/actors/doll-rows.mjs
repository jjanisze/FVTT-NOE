/**
 * Neuroshima 5e — Lalka: wskaźnik lokalizacji w wierszu Ekwipunku (PLAN_paper_doll §7, D16).
 *
 * Dwustanowy przełącznik „założony" dnd5e w wierszu przedmiotu rządzonego przez lalkę staje się
 * wskaźnikiem miejsca — jeden stan na lokalizację. Przedmioty z furtki (bez rodziny lalki)
 * zachowują natywny przełącznik.
 *
 * | Gdzie | Wskaźnik | Klik |
 * |---|---|---|
 * | plecak | brak (blady obrys po najechaniu) | Załóż (automatycznie) |
 * | pas | sakwa | zdejmij → plecak |
 * | pochwa / kabura | sztylet / pistolet | zdejmij → plecak |
 * | ręka | dłoń + P / L | zdejmij → łańcuch wypierania |
 * | noszone | koszula / kamizelka | zdejmij → plecak |
 *
 * Stos rozłożony po kilku miejscach pokazuje najbardziej aktywne i licznik. PPM — jawne cele.
 * Pozycja „Załóż/Zdejmij" z menu kontekstowego dnd5e idzie przez to samo (zdarzenie `inventory`,
 * które dnd5e wysyła przed własną obsługą i pozwala anulować).
 */

import { isDollActor, familyOf, locationOf, equip, takeOff, place, drop } from "./doll.mjs";
import { DOLL_FAMILIES, HAND_SHORT, parseSlot, groupOf, accepts } from "./doll-model.mjs";

const LOC = {
  pack: { icon: "fa-regular fa-hand", tip: "W plecaku. Klik: załóż (wolna ręka, kabura albo właściwe miejsce na ciele)." },
  belt: { icon: "fa-solid fa-sack", tip: "Przy pasie. Klik: odłóż do plecaka." },
  holster: { icon: "fa-solid fa-dagger", tip: "W pochwie. Klik: odłóż do plecaka. Użycie przedmiotu: dobądź." },
  hand: { icon: "fa-solid fa-hand", tip: "W ręce. Klik: zdejmij (do wolnej pochwy/kabury, w walce — upuść albo do plecaka)." },
  worn: { icon: "fa-solid fa-shirt", tip: "Noszone. Klik: zdejmij do plecaka." }
};

function _esc(s) {
  return String(s ?? "").replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

/** HTML wskaźnika dla przedmiotu rządzonego przez lalkę. */
function _indicatorHtml(item, family) {
  const loc = locationOf(item);
  const kind = loc?.kind ?? "pack";
  const def = LOC[kind];
  let icon = def.icon;
  let tip = def.tip;
  let mark = "";
  if (kind === "holster" && groupOf(loc.slots[0]) === "ranged") {
    icon = "fa-solid fa-gun";
    tip = "W kaburze. Klik: odłóż do plecaka. Użycie przedmiotu: dobądź.";
  }
  if (kind === "hand") mark = loc.slots.map(s => HAND_SHORT[parseSlot(s).index]).join("");
  if (kind === "worn" && family === "bodyArmor") icon = "fa-solid fa-vest";
  const count = loc?.count > 1 ? loc.count : 0;
  return `<button type="button" class="unbutton config-button item-control neuro-doll-loc is-${kind}"
      data-tooltip="${_esc(`${tip} PPM: wybierz miejsce.`)}" aria-label="${_esc(tip)}">
      <i class="${icon}" inert></i>${mark ? `<span class="neuro-doll-loc-mark">${mark}</span>` : ""}${count ? `<span class="neuro-doll-loc-count">${count}</span>` : ""}
    </button>`;
}

function _menu(actor, item) {
  const family = familyOf(item);
  const fam = DOLL_FAMILIES[family] ?? { groups: [] };
  const go = (to, label, icon) => ({ name: label, icon: `<i class="fas ${icon}"></i>`, callback: () => place(actor, item, to) });
  const items = [];
  if (accepts(family, "hand")) items.push(go("hand.0", "Prawa ręka", "fa-hand"), go("hand.1", "Lewa ręka", "fa-hand"));
  if (fam.holster === "melee") items.push(go("melee", "Pochwa", "fa-dagger"));
  if (fam.holster === "ranged") items.push(go("ranged", "Kabura", "fa-gun"));
  if (family === "belt") items.push(go("belt", "Pas", "fa-sack"));
  for (const g of fam.groups.filter(g => !["hand", "melee", "ranged", "belt"].includes(g))) {
    const label = { shoulder: "Ramię", headGear: "Głowa", faceGear: "Twarz", outfit: "Strój", body: "Pancerz",
      head: "Hełm", arms: "Ochraniacze rąk", legs: "Ochraniacze nóg" }[g] ?? g;
    items.push(go(g, label, "fa-person"));
  }
  if (family !== "belt") items.push({ name: "Upuść", icon: '<i class="fas fa-arrow-down-to-line"></i>', callback: () => drop(actor, item) });
  items.push(go("pack", "Do plecaka", "fa-boxes-packing"));
  return items;
}

async function _onClick(actor, item) {
  const loc = locationOf(item);
  if (!loc || loc.kind === "pack") return equip(item);
  return takeOff(actor, item, { from: loc.slots[0] });
}

function _decorate(app, root) {
  const actor = app.document;
  if (!isDollActor(actor) || !actor.isOwner) return;
  for (const btn of root.querySelectorAll('[data-item-id] button[data-action="equip"]')) {
    const row = btn.closest("[data-item-id]");
    const item = actor.items.get(row?.dataset.itemId);
    const family = item ? familyOf(item) : null;
    if (!family) continue;
    const tpl = document.createElement("template");
    tpl.innerHTML = _indicatorHtml(item, family).trim();
    const ind = tpl.content.firstElementChild;
    ind.addEventListener("click", ev => {
      ev.preventDefault();
      ev.stopPropagation();
      _onClick(actor, actor.items.get(item.id) ?? item);
    });
    const ContextMenu = foundry.applications.ux.ContextMenu.implementation ?? foundry.applications.ux.ContextMenu;
    new ContextMenu(ind, ".neuro-doll-loc", _menu(actor, item), { jQuery: false, fixed: true });
    btn.replaceWith(ind);
  }
}

/** „Załóż / Zdejmij" z menu kontekstowego dnd5e — przez lejek lalki, nie przez przekierowanie. */
function _bindInventoryEvent(app) {
  const el = app.element;
  if (!el || el.dataset.neuroDollInventory) return;
  el.dataset.neuroDollInventory = "1";
  el.addEventListener("inventory", ev => {
    if (ev.detail !== "equip") return;
    const actor = app.document;
    const item = actor?.items.get(ev.target.closest?.("[data-item-id]")?.dataset.itemId);
    if (!item || !isDollActor(actor) || !familyOf(item)) return;
    ev.preventDefault();
    _onClick(actor, item);
  });
}

function _rootOf(html) {
  return html instanceof HTMLElement ? html
    : html?.[0] instanceof HTMLElement ? html[0]
    : html?.element instanceof HTMLElement ? html.element
    : null;
}

export function registerDollRows() {
  Hooks.on("renderCharacterActorSheet", (app, html) => {
    const root = _rootOf(html) ?? app.element;
    if (!root) return;
    _bindInventoryEvent(app);
    _decorate(app, root);
  });
}
