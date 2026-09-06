/**
 * Neuroshima 5e — Ekwipunek: segmented carry-weight bar + legend.
 *
 * Player-facing ask (2026-08-29): "I want players to see what they're carrying."
 * Two additions to the native `.encumbrance .meter.progress` bar, both display-only:
 *
 *   1. A taller bar, sub-divided by category, overlaid on top of the native
 *      single-colour fill — the native element is kept untouched underneath for
 *      its aria/value semantics, this only adds DOM on top of it.
 *   2. A small legend under the bar, listing only the categories the actor is
 *      actually carrying right now.
 *
 * ## Readability pass (2026-09-06)
 *
 * The original cut lumped every Zasoby sub-panel (Amunicja/Magazynki/Pirotechnika/
 * Leki/Prowiant/Surowce) into ONE green "Zasoby" bar segment, while the legend
 * separately listed all 5 Surowce accent colours as if they had their own segment
 * — they didn't, so the legend promised colours the bar never actually showed.
 * That's also why "Zasoby" was so often the dominant chunk of a character's carry
 * weight: it was hiding everything but weapons/armor/misc loot behind one blob.
 * Fixed by breaking every Zasoby sub-panel out into its own bar segment + legend
 * entry (`_categoryOf`/`CATEGORY_ORDER` below) — the legend's colours now always
 * match something real in the bar, and only categories the actor actually carries
 * ever appear (empty categories are dropped, not greyed out).
 *
 * That also meant revisiting the whole colour set: cramming ~13 possible
 * categories into one bar meant two existing colours turned out to collide
 * (`Materiały konstrukcyjne`'s plain grey vs. `Reszta`'s grey; `Materiały
 * organiczne`'s red vs. `Broń`'s red — see `surowce-data.mjs`'s updated accents).
 * The new set was picked with hue-spacing math and then verified by actually
 * rendering swatches side by side, not just trusted from the numbers.
 *
 * "1/3 bar, 2/3 legend" on a narrow sheet turned out to be a layout bug, not a
 * design choice: the legend was inserted as `.encumbrance`'s next DOM sibling,
 * which put it inside the SAME native flex row (`.top`) as the encumbrance card
 * — squeezing the (otherwise fixed-width) native card down to make room. Fixed
 * by anchoring the legend after `.top` itself (a full-width block below the row)
 * and letting `.encumbrance` grow to fill what it no longer has to share.
 *
 * ## Pancerz / Narzędzia / Sprzęt split-out (2026-09-06, 2nd pass)
 *
 * A live scan of the whole party's actual inventories (not just Raynald's) found
 * that "Reszta" was still doing most of the work: nearly every hand-added item —
 * backpacks, kits, canteens, batteries, and (importantly) several actual body-armor
 * items — is typed plain `loot`, the generic dnd5e catch-all, not `equipment`/`tool`.
 * Concretely: Raynald's own "Kamizelka Kuloodporna" (bulletproof vest, 6 kg) and
 * Victor's "Kurtka ćwiekowana" (a real `armor-data.mjs` catalog name) are both typed
 * `loot`, so they were invisible to the existing `item.type === "equipment"` check —
 * same drift pattern as `project_ammo_wrong_item_type`, just for armor instead of
 * ammo. This is a display-only fix, not a rules fix: these items still grant no
 * actual AC bonus in combat because of their wrong `type` — only the bar now shows
 * them as armor-colored weight. Fixing that for real (retyping them to `equipment`)
 * is a separate, bigger change and was NOT done here — flagged, not actioned.
 *
 * Since there's no catalog to match these ad hoc items against (unlike Surowce/
 * Prowiant), this follows `prowiant-data.mjs`'s own precedent: loose keyword regex
 * over the item name instead of an enumerated list (see `PANCERZ_NAME_HINT`,
 * `NARZEDZIA_NAME_HINT` below). `type: "tool"` (real toolkits) and the RAW "Mały X"
 * toolkit-name convention (confirmed against the live party: "Mały Medyk", "Mały
 * Kłusownik", "Narzędzia małego ślusarza", …) both count as Narzędzia. Every
 * remaining `type: "loot"` item — the actual majority of "Reszta" before this pass
 * — now falls into a new "Sprzęt" bucket instead, leaving "Reszta" as a true
 * last-resort that should rarely show anything on a real sheet.
 */

import { getSurowiecType, SUROWCE_TYPES } from "../config/surowce-data.mjs";
import { getProwiantCategory } from "../config/prowiant-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const BAR_HEIGHT_PX = 22;

/**
 * Every non-Surowiec category, in Polish-label + bar/legend colour. Colours were
 * chosen so that categories likely to appear together (a combat-focused PC easily
 * carries Broń + Amunicja + Pirotechnika + Materiały zamienne at once, say) stay
 * visually distinct even at a glance — verified by rendering actual swatches, not
 * just checking hue distance on paper.
 */
const FIXED_CATEGORIES = {
  bron:         { label: "Broń",         color: "#b06a6a" },
  pancerz:      { label: "Pancerz",      color: "#6a8ab0" },
  narzedzia:    { label: "Narzędzia",    color: "#7a5230" },
  amunicja:     { label: "Amunicja",     color: "#cec17e" },
  magazynki:    { label: "Magazynki",    color: "#6656b3" },
  pirotechnika: { label: "Pirotechnika", color: "#d66329" },
  leki:         { label: "Leki",         color: "#bf69a2" },
  prowiant:     { label: "Prowiant",     color: "#5db691" },
  sprzet:       { label: "Sprzęt",       color: "#4a5f73" },
  reszta:       { label: "Reszta",       color: "#8f8f8f" },
};

/**
 * Name-based hints for ad hoc `loot`-typed items that are really armor or tools but
 * were never retyped (see this file's 2026-09-06 2nd-pass doc comment above) — same
 * "loose regex, live-scanned against the party" approach as `prowiant-data.mjs`.
 * Checked ONLY after the real `item.type` checks in `_categoryOf`, so a properly
 * typed `equipment`/`tool` item never needs to match these.
 */
const PANCERZ_NAME_HINT = /kamizelk|kurtka\s*ćwiekowan|zbroj|pancerz|hełm|kask/i;
const NARZEDZIA_NAME_HINT = /^ma[łl]y\s|narz[eę]dzi/i;

/** Category ids in canonical bar/legend order — the 5 Surowce slot in after Narzędzia. */
const CATEGORY_ORDER = [
  "bron", "pancerz", "narzedzia",
  ...SUROWCE_TYPES.slice().sort((a, b) => a.order - b.order).map(t => `surowiec:${t.code}`),
  "amunicja", "magazynki", "pirotechnika", "leki", "prowiant", "sprzet",
  "reszta",
];

/** @returns {{label:string, color:string}|null} */
function _categoryDef(id) {
  if (id.startsWith("surowiec:")) {
    const code = id.slice("surowiec:".length);
    const type = SUROWCE_TYPES.find(t => t.code === code);
    return type ? { label: `${type.label} (${type.code})`, color: type.accent } : null;
  }
  return FIXED_CATEGORIES[id] ?? null;
}

export function registerEncumbranceBreakdown() {
  for (const hookName of ["renderActorSheet", "renderCharacterActorSheet", "renderNPCActorSheet"]) {
    Hooks.on(hookName, _onRenderInjectBreakdown);
  }
  console.log("Neuroshima 5e | Encumbrance breakdown + legend UI registered");
}

/* -------------------------------------------- */
/*  Categorisation                               */
/* -------------------------------------------- */

/** Which bucket an item's weight counts toward — see `CATEGORY_ORDER`/`FIXED_CATEGORIES`. */
function _categoryOf(item) {
  const surowiec = getSurowiecType(item);
  if (surowiec) return `surowiec:${surowiec.code}`;
  if (getProwiantCategory(item)) return "prowiant";
  if (item.getFlag(MODULE_ID, "chemiaKey")) return "leki";
  if (item.type === "consumable" && item.system.type?.value === "ammo") {
    const subtype = item.system.type?.subtype ?? "";
    if (subtype.startsWith("grenade-")) return "pirotechnika";
    if (subtype.startsWith("magazine-")) return "magazynki";
    return "amunicja";
  }
  if (item.type === "weapon") return "bron";
  if (item.type === "equipment") return "pancerz";
  if (item.type === "tool" || NARZEDZIA_NAME_HINT.test(item.name ?? "")) return "narzedzia";
  if (PANCERZ_NAME_HINT.test(item.name ?? "")) return "pancerz";
  if (item.type === "loot") return "sprzet";
  return "reszta";
}

function _itemWeightKg(item) {
  const w = item.system.weight;
  const value = w?.value ?? (typeof w === "number" ? w : 0);
  const qty = Number(item.system.quantity ?? 1);
  return (Number.isFinite(value) ? value : 0) * (Number.isFinite(qty) ? qty : 1);
}

/** @returns {Map<string, number>} category id → total kg, zero/negative entries never added. */
function _computeBreakdown(actor) {
  const totals = new Map();
  for (const item of actor.items ?? []) {
    const kg = _itemWeightKg(item);
    if (!kg) continue;
    const cat = _categoryOf(item);
    totals.set(cat, (totals.get(cat) ?? 0) + kg);
  }
  return totals;
}

function _fmtKg(kg) {
  return kg < 1 ? `${Math.round(kg * 1000)} g` : `${kg.toFixed(1)} kg`;
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

  for (const id of CATEGORY_ORDER) {
    const kg = totals.get(id) ?? 0;
    if (kg <= 0) continue;
    const def = _categoryDef(id);
    if (!def) continue;
    const pct = Math.max(0, Math.min(100, (kg / max) * 100));
    const seg = document.createElement("div");
    seg.className = "neuro-encumbrance-seg";
    seg.title = `${def.label}: ${_fmtKg(kg)}`;
    seg.style.cssText = `flex:0 0 ${pct}%; background:${def.color}; opacity:0.85; pointer-events:auto;`;
    overlay.appendChild(seg);
  }

  meter.appendChild(overlay);

  // The native encumbrance card sits in a flex row (`.top`) alongside other
  // native widgets (ability-derived carry stats, a containers list). Growing it
  // in place — instead of leaving its native fixed width — is what "100% bar"
  // means once the legend (below) is no longer sharing that same row with it.
  const card = meter.closest(".encumbrance");
  if (card) card.style.cssText += "flex:1 1 auto; width:auto;";

  // Legend: a full-width block AFTER the whole `.top` row, not a sibling INSIDE
  // it — that was the actual cause of the old "1/3 bar, 2/3 legend" squeeze, see
  // this file's top doc comment.
  const rowAnchor = card?.closest(".top") ?? card;
  if (rowAnchor && !rowAnchor.parentElement?.querySelector(".neuro-ekwipunek-legend")) {
    rowAnchor.after(_buildLegend(totals));
  }
}

function _buildLegend(totals) {
  const legend = document.createElement("div");
  legend.className = "neuro-ekwipunek-legend";

  const row = document.createElement("div");
  row.className = "neuro-legend-row";
  row.innerHTML = CATEGORY_ORDER
    .filter(id => (totals.get(id) ?? 0) > 0)
    .map(id => {
      const def = _categoryDef(id);
      return `<span class="neuro-legend-chip"><i style="background:${def.color};"></i>${def.label}</span>`;
    })
    .join("");

  legend.appendChild(row);
  return legend;
}
