/**
 * Neuroshima 5e — Ekwipunek: segmented carry-weight bar + legend.
 *
 * Player-facing ask (2026-08-29): "I want players to see what they're carrying."
 * Two additions to the native `.encumbrance .meter.progress` bar, both display-only:
 *
 *   1. A taller bar, sub-divided by category (Broń / Pancerz / Zasoby / Reszta),
 *      overlaid on top of the native single-colour fill — the native element is
 *      kept untouched underneath for its aria/value semantics, this only adds
 *      DOM on top of it.
 *   2. A small legend under the bar: the four carry-weight categories, plus the
 *      five Surowce accent colours (`surowce-data.mjs`) and a one-line gloss for
 *      every Zasoby sub-panel, since a player who has never opened that tab has
 *      no way to know what "Zasoby" even groups together.
 *
 * "Zasoby" here is a strict superset of the four wrapper panels relocated by
 * `sheet-shell.mjs` (Amunicja/Magazynki/Pirotechnika/Leki/Prowiant/Surowce) —
 * whatever `getSurowiecType`/`getProwiantCategory`/the ammo-or-grenade-or-lekarstwo
 * checks recognise, recognised the same way here, so the bar can never disagree
 * with the tab it's summarising.
 */

import { getSurowiecType, SUROWCE_TYPES } from "../config/surowce-data.mjs";
import { getProwiantCategory } from "../config/prowiant-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const BAR_HEIGHT_PX = 22;

const BUCKETS = [
  { id: "bron", label: "Broń", color: "#b06a6a" },
  { id: "pancerz", label: "Pancerz", color: "#6a8ab0" },
  { id: "zasoby", label: "Zasoby", color: "#7fae6a" },
  { id: "reszta", label: "Reszta", color: "#8f8f8f" }
];

export function registerEncumbranceBreakdown() {
  for (const hookName of ["renderActorSheet", "renderCharacterActorSheet", "renderNPCActorSheet"]) {
    Hooks.on(hookName, _onRenderInjectBreakdown);
  }
  console.log("Neuroshima 5e | Encumbrance breakdown + legend UI registered");
}

/* -------------------------------------------- */
/*  Categorisation                               */
/* -------------------------------------------- */

function _isZasobyItem(item) {
  if (getSurowiecType(item)) return true;
  if (getProwiantCategory(item)) return true;
  if (item.getFlag(MODULE_ID, "chemiaKey")) return true;
  if (item.type === "consumable" && item.system.type?.value === "ammo") return true; // ammo/magazines/grenades
  return false;
}

function _itemWeightKg(item) {
  const w = item.system.weight;
  const value = w?.value ?? (typeof w === "number" ? w : 0);
  const qty = Number(item.system.quantity ?? 1);
  return (Number.isFinite(value) ? value : 0) * (Number.isFinite(qty) ? qty : 1);
}

/** @returns {{bron:number, pancerz:number, zasoby:number, reszta:number, total:number}} */
function _computeBreakdown(actor) {
  const totals = { bron: 0, pancerz: 0, zasoby: 0, reszta: 0 };
  for (const item of actor.items ?? []) {
    const kg = _itemWeightKg(item);
    if (!kg) continue;
    if (_isZasobyItem(item)) totals.zasoby += kg;
    else if (item.type === "weapon") totals.bron += kg;
    else if (item.type === "equipment") totals.pancerz += kg;
    else totals.reszta += kg;
  }
  totals.total = totals.bron + totals.pancerz + totals.zasoby + totals.reszta;
  return totals;
}

/* -------------------------------------------- */
/*  Rendering                                    */
/* -------------------------------------------- */

function _onRenderInjectBreakdown(app, html) {
  const actor = app.document ?? app.actor;
  if (!actor || !["character", "npc"].includes(actor.type)) return;

  const root = html instanceof HTMLElement ? html
    : html?.[0] instanceof HTMLElement ? html[0]
    : html?.element instanceof HTMLElement ? html.element
    : null;
  if (!root) return;

  const meter = root.querySelector(".encumbrance .meter.progress");
  if (!meter) return;
  if (meter.dataset.neuroBreakdown === "1") return; // one render pass
  meter.dataset.neuroBreakdown = "1";

  meter.style.height = `${BAR_HEIGHT_PX}px`;
  meter.style.position = meter.style.position || "relative";

  const max = Number(meter.getAttribute("aria-valuemax")) || 1;
  const totals = _computeBreakdown(actor);

  const overlay = document.createElement("div");
  overlay.className = "neuro-encumbrance-overlay";
  overlay.style.cssText = `position:absolute; inset:0; display:flex; pointer-events:none; overflow:hidden; border-radius:inherit;`;

  for (const bucket of BUCKETS) {
    const kg = totals[bucket.id] ?? 0;
    if (kg <= 0) continue;
    const pct = Math.max(0, Math.min(100, (kg / max) * 100));
    const seg = document.createElement("div");
    seg.className = `neuro-encumbrance-seg neuro-encumbrance-seg--${bucket.id}`;
    seg.title = `${bucket.label}: ${kg < 1 ? Math.round(kg * 1000) + " g" : kg.toFixed(1) + " kg"}`;
    seg.style.cssText = `flex:0 0 ${pct}%; background:${bucket.color}; opacity:0.85; pointer-events:auto;`;
    overlay.appendChild(seg);
  }

  meter.appendChild(overlay);

  const inventoryTab = root.querySelector(".tab.inventory")
    ?? root.querySelector('section[data-tab="inventory"]')
    ?? root.querySelector('div[data-tab="inventory"]');
  if (inventoryTab && !inventoryTab.querySelector(".neuro-ekwipunek-legend")) {
    inventoryTab.querySelector(".encumbrance")?.after(_buildLegend());
  }
}

function _buildLegend() {
  const legend = document.createElement("div");
  legend.className = "neuro-ekwipunek-legend";

  const bucketRow = document.createElement("div");
  bucketRow.className = "neuro-legend-row";
  bucketRow.innerHTML = BUCKETS.map(b =>
    `<span class="neuro-legend-chip"><i style="background:${b.color};"></i>${b.label}</span>`
  ).join("");

  const surowceRow = document.createElement("div");
  surowceRow.className = "neuro-legend-row";
  surowceRow.innerHTML = SUROWCE_TYPES.map(t =>
    `<span class="neuro-legend-chip"><i style="background:${t.accent};"></i>${t.label} (${t.code})</span>`
  ).join("");

  const sections = [
    ["Amunicja", "luźna amunicja do przeładowania"],
    ["Magazynki", "przygotowane zapasowe magazynki"],
    ["Pirotechnika", "granaty, miny, ładunki wybuchowe"],
    ["Leki", "chemia — narkotyki, lekarstwa, używki"],
    ["Prowiant", "jedzenie i woda, informacyjnie"],
    ["Surowce", "materiały do craftingu — 5 typów wyżej"]
  ];
  const sectionRow = document.createElement("div");
  sectionRow.className = "neuro-legend-sections";
  sectionRow.innerHTML = sections.map(([n, d]) => `<div><strong>${n}</strong> — ${d}</div>`).join("");

  legend.appendChild(bucketRow);
  legend.appendChild(surowceRow);
  legend.appendChild(sectionRow);
  return legend;
}
