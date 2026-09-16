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
 *
 * ## Udźwig — RAW zones, not dnd5e's SRD tiers (2026-09-16)
 *
 * Investigation (Alan showing "32.7 / 75") found the bar had never actually implemented
 * Neuroshima's Udźwig rule: `CONFIG.DND5E.encumbrance` still had dnd5e's own SRD numbers
 * (`maximum.metric = 7.5`), and 7.5 is exactly the arithmetic mean of RAW's Użytkowy (×5)
 * and Maksymalny (×10) multipliers — so the single number the sheet showed looked
 * plausible but was neither RAW value. `../config/encumbrance-config.mjs` now overrides
 * those constants so `encumbrance.thresholds.{heavilyEncumbered,maximum}` ARE the RAW
 * Użytkowy/Maksymalny in kg (already Bez-dna-multiplied, already size-scaled — see that
 * file). `udzwigStatus()`/`udzwigScale()` below read those two numbers to classify the
 * current load into three zones (Normalna / Przeciążenie / Unieruchomienie) instead of
 * dnd5e's own three (encumbered / heavily encumbered / maximum — the first of which has
 * no RAW meaning and is ignored).
 *
 * RAW never stops you from carrying past Udźwig maksymalny — it just zeroes Szybkość —
 * so the bar must keep room to show "how far past the line", not clip at 100%. `udzwigScale()`
 * picks a display scale with headroom (max sits at 80% of the bar at rest; the scale grows
 * to keep the fill under ~91% once you're actually over-max) instead of reusing dnd5e's own
 * `aria-valuemax`.
 *
 * First cut tinted the existing composition bar's own background by zone. Rejected on
 * live review: the composition segments (Broń/Pancerz/…) already own that same visual
 * channel and paint fully opaque over most of the bar, so the zone tint only ever showed
 * in whatever sliver was left unfilled — invisible exactly where it mattered most (the
 * boundary nearest your current load). Fix: a second, dedicated lane
 * (`.neuro-udzwig-ruler`, `_buildUdzwigRuler()`), stacked directly above the unchanged
 * composition bar, that never shares pixels with category colours — a static,
 * always-fully-visible 3-colour track (the "ruler" — this must stay legible regardless of
 * current load, it's the primary instrument, not a status summary).
 *
 * Second cut added an opaque "mercury" fill on top of that track, rising from 0 to the
 * current value, on the theory that its leading edge would double as a current-position
 * marker. Also rejected on review: the composition bar directly below the ruler already
 * ends at exactly that same x position (same `scale` on both), so the fill was a second,
 * redundant encoding of information the trailing edge of the bar underneath already
 * carries — and read as a fourth zone rather than a pointer, undermining the very
 * three-zone ruler it was supposed to sit on top of. Dropped entirely: the ruler is now
 * pure static track, nothing else. Current position is read by lining it up against the
 * composition bar's own edge directly beneath it — the two lanes share the same `scale`
 * specifically so that alignment is always exact.
 *
 * Third pass: the ruler alone was judged too easy to overlook, so the composition bar
 * grew back two of the cues from the first cut — but not as they were before. A zone
 * *hatch* (`neuro-encumbrance-zone-bg--*`, diagonal stripes, not solid) sits behind the
 * composition overlay, on the same `_buildZoneBands()` geometry as the ruler; since the
 * overlay's segments are now fully opaque (were 0.85 — the 15% gap would have let the
 * hatch bleed through and blur exactly the distinction it exists to make), the hatch is
 * only ever visible in genuinely empty space, and being *striped* rather than tinted
 * means it can never be mistaken for a same-hued solid segment (Prowiant/green sits
 * right next to Normalna/green in this palette; Broń/red next to Unieruchomienie/red).
 * Native breakpoint carets — hidden when the ruler shipped — are also back, repointed
 * at the same two boundaries, "only slightly bigger" than stock (4px vs 3px) since
 * they're now a third corroborating cue, not the whole feature. Ruler + hatch + carets:
 * three cues in agreement, none of them load-bearing alone.
 *
 * Fourth pass: the headline "X / Y kg" text was still reading against Udźwig maksymalny
 * (dnd5e's own `encumbrance.max`) — RAW's further, rarely-relevant "everything stops"
 * extreme, not the number players are actually meant to watch. Swapped to Udźwig
 * użytkowy for that one label only (see the `.label .max` swap in the render function);
 * `scale`, the ruler, and the hatch all keep reading the real Maksymalny underneath, so
 * Unieruchomienie is still fully tracked and shown, just no longer what's printed as
 * "max". `actors/udzwig-slowdown.mjs` (new, same day) hangs an automatic Speed-reducing
 * Active Effect off the same `udzwigStatus()` this file already computes — RAW's own
 * ×½ Szybkość at Przeciążenie, 0 at Unieruchomienie — kept in a separate file since it's
 * a mechanical consequence, not a display concern; see that file's header for why an
 * automatic Active Effect doesn't violate this module's usual "detect, don't auto-apply"
 * posture for combat consequences.
 *
 * The `.info .size`/`.multiplier` tiles next to the bar (native dnd5e — "Rozmiar: Md",
 * "Multiplier: ×1") are dead weight for every PC in this campaign: everyone is Medium, so
 * both are permanently constant. Repurposed (character sheets only — NPCs can genuinely
 * be non-Medium, where Rozmiar/Multiplier are still real information) into the current
 * zone name and the kg remaining to the next threshold, which is the number RAW actually
 * asks a player to track and nothing on the sheet showed before.
 */

import { getSurowiecType, SUROWCE_TYPES } from "../config/surowce-data.mjs";
import { getProwiantCategory } from "../config/prowiant-data.mjs";
import { ABILITY_KEYS, hasAbility } from "./abilities.mjs";

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

/**
 * Udźwig zones, in bar order. RAW names only the two boundaries (Użytkowy/Maksymalny);
 * "Normalna" is this module's label for "under either", to give the repurposed tile
 * (see `_applyUdzwigStatusTiles`) something to say when nothing is wrong.
 */
const UDZWIG_ZONES = {
  normalna: { label: "Normalna", hintLabel: "Do Przeciążenia" },
  przeciazenie: { label: "Przeciążenie", hintLabel: "Do Unieruchomienia" },
  nieruchomienie: { label: "Unieruchomienie", hintLabel: "Ponad limit" },
};

/**
 * Which Udźwig zone `value` kg of gear falls into, given the actor's own (already
 * size- and Bez-dna-scaled) RAW thresholds, plus the label/kg for the repurposed tile.
 * @returns {{zone: keyof UDZWIG_ZONES, label: string, hintLabel: string, hintKg: number}|null}
 */
export function udzwigStatus(value, usable, max) {
  if (!Number.isFinite(usable) || !Number.isFinite(max) || max <= 0) return null;
  const zone = value <= usable ? "normalna" : value <= max ? "przeciazenie" : "nieruchomienie";
  const hintKg = zone === "normalna" ? usable - value : zone === "przeciazenie" ? max - value : value - max;
  return { zone, ...UDZWIG_ZONES[zone], hintKg };
}

/**
 * Visual scale (kg represented by the bar's full width) with headroom past `max` — RAW
 * never blocks carrying more once Unieruchomienie is reached, it only zeroes Szybkość, so
 * the bar must have room to show overshoot instead of clipping at 100%. At rest, `max`
 * sits at 80% of the bar; once actually exceeded, the scale grows to keep `value` under
 * ~91%, so it never touches the edge no matter how overloaded the character gets.
 */
export function udzwigScale(value, max) {
  if (!Number.isFinite(max) || max <= 0) return Math.max(value, 1);
  return Math.max(max * 1.25, value * 1.1);
}

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

  const card = meter.closest(".encumbrance");

  const enc = actor.system.attributes?.encumbrance ?? {};
  const value = Number(enc.value) || 0;
  const usable = enc.thresholds?.heavilyEncumbered;
  const max = enc.thresholds?.maximum;
  const status = udzwigStatus(value, usable, max);
  // Fall back to dnd5e's own (already-correct-post-fix) aria-valuemax if thresholds are
  // somehow missing — keeps the category bar working even if that ever happens.
  const scale = status ? udzwigScale(value, max) : (Number(meter.getAttribute("aria-valuemax")) || 1);
  const totals = _computeBreakdown(actor);
  const pctOf = kg => Math.max(0, Math.min(100, (kg / scale) * 100));

  meter.style.setProperty("--bar-percentage", `${pctOf(value)}%`);

  if (status) {
    // Requested live (2026-09-16): the headline "X / Y kg" should read against Udźwig
    // użytkowy (the ceiling players are actually meant to stay under day to day), not
    // dnd5e's own `encumbrance.max` (Udźwig maksymalny — RAW's further, rarely-reached
    // "Unieruchomienie" extreme). Purely a text/aria swap: `scale`, the ruler, the hatch,
    // and the zone tiles below all keep reading the real Maksymalny — only this one
    // native label is being asked a different question than dnd5e itself computed for it.
    const maxLabel = meter.querySelector(".label .max");
    if (maxLabel) maxLabel.textContent = Number.isInteger(usable) ? String(usable) : usable.toFixed(1);
    meter.setAttribute("aria-valuemax", String(usable));
  }

  if (status && card && !card.querySelector(":scope > .neuro-udzwig-ruler")) {
    card.insertBefore(_buildUdzwigRuler(usable, max, pctOf), meter);
  }

  if (status) {
    // Hatched, not solid — a category segment can share a zone's hue (Prowiant/green
    // next to Normalna/green, Broń/red next to Unieruchomienie/red), so "textured" is
    // the only cue that survives a same-hue coincidence. Sits behind the (now opaque)
    // composition overlay, so it's only ever actually visible in genuinely empty space.
    meter.appendChild(_buildZoneBands(usable, max, pctOf, "neuro-encumbrance-zone-bg"));
    // Native breakpoint carets, repointed at the same boundaries as the ruler/hatch
    // above (retired to `display:none` when the ruler first shipped — brought back as
    // a third, corroborating cue now that the other two carry most of the weight).
    meter.style.setProperty("--breakpoint-low", `${pctOf(usable)}%`);
    meter.style.setProperty("--breakpoint-high", `${pctOf(max)}%`);
  }

  const overlay = document.createElement("div");
  overlay.className = "neuro-encumbrance-overlay";
  overlay.style.cssText = `position:absolute; inset:0; display:flex; pointer-events:none; overflow:hidden; border-radius:inherit;`;

  for (const id of CATEGORY_ORDER) {
    const kg = totals.get(id) ?? 0;
    if (kg <= 0) continue;
    const def = _categoryDef(id);
    if (!def) continue;
    const seg = document.createElement("div");
    seg.className = "neuro-encumbrance-seg";
    seg.title = `${def.label}: ${_fmtKg(kg)}`;
    // Fully opaque — not the old 0.85 — so a segment can never let the zone hatch
    // underneath bleed through and blur the solid/hatched distinction that's the
    // whole point of putting the hatch there.
    seg.style.cssText = `flex:0 0 ${pctOf(kg)}%; background:${def.color}; opacity:1; pointer-events:auto;`;
    overlay.appendChild(seg);
  }

  meter.appendChild(overlay);

  // The native encumbrance card sits in a flex row (`.top`) alongside other
  // native widgets (ability-derived carry stats, a containers list). Growing it
  // in place — instead of leaving its native fixed width — is what "100% bar"
  // means once the legend (below) is no longer sharing that same row with it.
  if (card) card.style.cssText += "flex:1 1 auto; width:auto;";

  _applyUdzwigStatusTiles(actor, card, status);

  // Legend: a full-width block AFTER the whole `.top` row, not a sibling INSIDE
  // it — that was the actual cause of the old "1/3 bar, 2/3 legend" squeeze, see
  // this file's top doc comment.
  const rowAnchor = card?.closest(".top") ?? card;
  if (rowAnchor && !rowAnchor.parentElement?.querySelector(".neuro-ekwipunek-legend")) {
    rowAnchor.after(_buildLegend(totals, actor));
  }
}

/**
 * The three Udźwig zone bands (Normalna/Przeciążenie/Unieruchomienie), as flex children
 * of a `position:absolute; inset:0` container sized against the shared `scale`. Shared
 * by the ruler (`_buildUdzwigRuler` — solid colour, `neuro-udzwig-zone` prefix) and the
 * composition bar's empty-space hatch (inline in `_onRenderInjectBreakdown` —
 * `neuro-encumbrance-zone-bg` prefix) so the two lanes can never disagree about exactly
 * where a boundary falls. `bandClass` controls only the per-band CSS class, not the
 * container's own positioning, which is identical in both places.
 */
function _buildZoneBands(usable, max, pctOf, bandClass) {
  const track = document.createElement("div");
  track.className = "neuro-udzwig-track";
  const usablePct = pctOf(usable);
  const maxPct = pctOf(max);
  const bands = [
    ["normalna", usablePct],
    ["przeciazenie", maxPct - usablePct],
    ["nieruchomienie", 100 - maxPct],
  ];
  for (const [zone, width] of bands) {
    if (width <= 0) continue;
    const seg = document.createElement("div");
    seg.className = `${bandClass} ${bandClass}--${zone}`;
    seg.style.cssText = `flex:0 0 ${width}%;`;
    track.appendChild(seg);
  }
  return track;
}

/**
 * The Udźwig ruler: a thin, dedicated lane stacked directly above the (unchanged)
 * composition bar — never shares a pixel with category colours, so it stays legible
 * regardless of what's in the pack. Purely a static 3-colour track (Normalna/
 * Przeciążenie/Unieruchomienie, always shown in full at fixed positions); it carries
 * no fill of its own. Current position needs no separate marker here — the composition
 * bar directly below it already ends at exactly `value` on the same `scale`, so its
 * trailing edge, read straight down against this ruler, IS the current-position
 * indicator. A second one on the ruler itself would only duplicate that same x
 * position in a color that isn't one of the three zones — which reads as a fourth
 * zone, not a pointer (live design review, 2026-09-16).
 */
function _buildUdzwigRuler(usable, max, pctOf) {
  const ruler = document.createElement("div");
  ruler.className = "neuro-udzwig-ruler";
  ruler.title = `Udźwig — Normalna: 0–${_fmtKg(usable)} · Przeciążenie: ${_fmtKg(usable)}–${_fmtKg(max)} `
    + `· Unieruchomienie: powyżej ${_fmtKg(max)}`;
  ruler.appendChild(_buildZoneBands(usable, max, pctOf, "neuro-udzwig-zone"));
  return ruler;
}

/**
 * Repurposes the native `.info .size`/`.multiplier` tiles (dnd5e: "Rozmiar: Md",
 * "Multiplier: ×1") into the current Udźwig zone and kg-to-next-threshold. Character
 * sheets only — every PC here is permanently Medium/×1 (dead weight), but an NPC's
 * Rozmiar/Multiplier can genuinely vary and stays informative as-is.
 */
function _applyUdzwigStatusTiles(actor, card, status) {
  if (actor.type !== "character" || !card || !status) return;
  const sizeTile = card.querySelector(".info .size");
  const multTile = card.querySelector(".info .multiplier");
  if (!sizeTile || !multTile) return;

  card.dataset.neuroUdzwigZone = status.zone;

  const sizeLabel = sizeTile.querySelector(".label");
  const sizeValue = sizeTile.querySelector(".value");
  if (sizeLabel) sizeLabel.textContent = "Waga";
  if (sizeValue) { sizeValue.textContent = status.label; sizeValue.removeAttribute("aria-label"); }

  const multLabel = multTile.querySelector(".label");
  const multValue = multTile.querySelector(".value");
  if (multLabel) multLabel.textContent = status.hintLabel;
  if (multValue) multValue.textContent = _fmtKg(status.hintKg);
}

/**
 * "Bez dna" badge — requested live (2026-09-06): a visible sign in the Ekwipunek view for WHY a
 * carrying-capacity number looks doubled, not just a silent multiplier. `hasAbility` (not a
 * bespoke check) — same shared bridge `actors/bez-dna.mjs` uses to decide whether the actual
 * Active Effect exists; this only ever READS that state, never writes anything.
 */
function _buildBezDnaBadge(actor) {
  if (!hasAbility(actor, ABILITY_KEYS.BEZ_DNA)) return "";
  // `fa-box` (not a guessed/unverified icon name) — already confirmed rendering correctly in
  // this exact install elsewhere in this codebase (`ammo-inventory.mjs`), see project memory
  // on FA version mismatches silently tofu'ing unverified icon names.
  return `<span class="neuro-legend-chip neuro-bez-dna-badge" title="Sztuczka „Pakowanie” — Udźwig użytkowy i maksymalny ×2">`
    + `<i class="fas fa-box" aria-hidden="true"></i> Bez dna ×2</span>`;
}

function _buildLegend(totals, actor) {
  const legend = document.createElement("div");
  legend.className = "neuro-ekwipunek-legend";

  const row = document.createElement("div");
  row.className = "neuro-legend-row";
  row.innerHTML = _buildBezDnaBadge(actor) + CATEGORY_ORDER
    .filter(id => (totals.get(id) ?? 0) > 0)
    .map(id => {
      const def = _categoryDef(id);
      return `<span class="neuro-legend-chip"><i style="background:${def.color};"></i>${def.label}</span>`;
    })
    .join("");

  legend.appendChild(row);
  return legend;
}
