/**
 * Custom Character Sheet Shell (§1.15).
 *
 * Tier decision (PLAN_sheet_shell.md §2): **hybrid**. A thin subclass of the stock dnd5e
 * sheets owns only the tab map — `PARTS`/`TABS` — so dead fantasy tabs stop rendering at all
 * instead of being hidden by CSS. Everything that fills a tab stays on the established
 * hook + DOM injection path, so none of the 15 existing injectors had to learn about this file.
 *
 * The three things this module owns:
 *  1. Tab map: `spells` and `bastion` dropped, Neuroshima labels, Ekwipunek-first order,
 *     plus a new `zasoby` tab.
 *  2. The `Stan` panel — Wyczerpanie, Zranienie, Upojenie, the Skażenie save and the active
 *     ailment strip in one place on both sheet types.
 *  3. Relocating the ammo/magazine/explosive/raw-material panels into the `zasoby` tab.
 */

import { getLevelledRegistry, getRadiationFailures, promptRadiationSave } from "./levelled-conditions.mjs";
import { buildHealthStrip } from "./health-panel.mjs";
import { EXHAUSTION_SOURCES, getExhaustionSources } from "../config/exhaustion.mjs";
import { SKAZENIE_DISEASE_THRESHOLD } from "../config/levelled-conditions-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const ZASOBY_TEMPLATE = `modules/${MODULE_ID}/templates/tab-zasoby.hbs`;

/** Wrappers relocated into the Zasoby tab, in display order. */
const ZASOBY_PANELS = [
  "neuro-ammo-wrapper",
  "neuro-magazine-wrapper",
  "neuro-grenade-wrapper",
  "neuro-surowce-wrapper"
];

const CHARACTER_TABS = [
  { tab: "inventory", label: "Ekwipunek", svg: "systems/dnd5e/icons/svg/backpack.svg" },
  { tab: "zasoby", label: "Zasoby", icon: "fas fa-boxes-stacked" },
  { tab: "details", label: "Postać", icon: "fas fa-cog" },
  { tab: "features", label: "Zdolności", icon: "fas fa-list" },
  { tab: "effects", label: "Stany", icon: "fas fa-bolt" },
  { tab: "biography", label: "Biografia", icon: "fas fa-feather" },
  { tab: "specialTraits", label: "Cechy szczególne", icon: "fas fa-star" }
];

const NPC_TABS = [
  { tab: "features", label: "Akcje i cechy", icon: "fas fa-list" },
  { tab: "inventory", label: "Ekwipunek", svg: "systems/dnd5e/icons/svg/backpack.svg" },
  { tab: "zasoby", label: "Zasoby", icon: "fas fa-boxes-stacked" },
  { tab: "effects", label: "Stany", icon: "fas fa-bolt" },
  { tab: "biography", label: "Opis", icon: "fas fa-feather" },
  { tab: "specialTraits", label: "Cechy szczególne", icon: "fas fa-star" }
];

/* -------------------------------------------- */
/*  Sheet classes                                */
/* -------------------------------------------- */

/**
 * The dnd5e sheet class currently registered as default for an actor type.
 * Read from the live registry rather than the `dnd5e` global so this keeps working
 * if the system reorganises its exports.
 * @param {string} type
 * @returns {typeof foundry.applications.api.ApplicationV2|null}
 */
function _stockSheetClass(type) {
  const registered = CONFIG.Actor.sheetClasses?.[type] ?? {};
  const entry = Object.entries(registered).find(([id]) => id.startsWith("dnd5e."));
  return entry?.[1]?.cls ?? null;
}

/**
 * Rebuild a PARTS map: drop dead parts and splice `zasoby` in after `inventory`.
 * Copied key-by-key rather than retyped, so a part added by a future dnd5e update
 * survives (ARCHITECTURE.md — mutate, don't replace).
 * @param {object} baseParts
 * @param {string[]} drop
 * @returns {object}
 */
function _rebuildParts(baseParts, drop) {
  const zasoby = {
    container: { classes: ["tab-body"], id: "tabs" },
    template: ZASOBY_TEMPLATE,
    scrollable: [""]
  };
  const out = {};
  for (const [key, value] of Object.entries(baseParts)) {
    if (drop.includes(key)) continue;
    out[key] = value;
    if (key === "inventory") out.zasoby = zasoby;
  }
  if (!out.zasoby) out.zasoby = zasoby;
  return out;
}

/**
 * Build a Neuroshima sheet subclass over a stock dnd5e sheet class.
 * @param {Function} Base
 * @param {object} config
 * @param {string} config.name        Class name — becomes the sheet's registration id.
 * @param {string[]} config.drop      Part/tab ids to remove entirely.
 * @param {object[]} config.tabs      Replacement TABS array.
 * @param {string} config.defaultTab
 * @returns {Function}
 */
function _buildSheetClass(Base, { name, drop, tabs, defaultTab }) {
  const cls = class NeuroshimaActorSheet extends Base {
    static PARTS = _rebuildParts(Base.PARTS, drop);

    static TABS = tabs;

    tabGroups = { primary: defaultTab };
  };
  Object.defineProperty(cls, "name", { value: name, configurable: true });
  return cls;
}

/* -------------------------------------------- */
/*  Zasoby tab                                   */
/* -------------------------------------------- */

/**
 * Move the custom inventory sub-panels out of Ekwipunek and into Zasoby.
 * The four injectors keep writing into the inventory tab; this runs after them and
 * relocates the finished nodes, so none of them needed to change.
 * @param {HTMLElement} root
 */
function _relocateZasoby(root) {
  const dest = root.querySelector(".neuro-zasoby-root");
  if (!dest) return;

  for (const cls of ZASOBY_PANELS) {
    const panel = root.querySelector(`.${cls}`);
    if (panel && panel.parentElement !== dest) dest.appendChild(panel);
  }

  const empty = dest.querySelector(".neuro-zasoby-empty");
  if (empty) empty.hidden = ZASOBY_PANELS.some(cls => dest.querySelector(`.${cls}`));
}

/* -------------------------------------------- */
/*  Stan panel                                   */
/* -------------------------------------------- */

/**
 * The levelled tracks shown in the Stan panel, worst-consequence first.
 *
 * Zranienie and Upojenie come from the levelled-condition registry, so this panel never
 * learns how either works — same inverted dependency the token HUD uses. Wyczerpanie is
 * native dnd5e and is addressed directly; writing the attribute goes through
 * `exhaustion.mjs`'s `preUpdateActor` guard, which raises the source dialog exactly as a
 * native pip click would.
 *
 * Skażenie is deliberately absent: its levels are contamination bands (the ST of the
 * hourly save), not an accumulating track, so it gets its own row further down.
 * @param {Actor} actor
 * @returns {Array<object>}
 */
function _statusTracks(actor) {
  const registry = getLevelledRegistry();
  const tracks = [{
    id: "exhaustion",
    label: CONFIG.DND5E.conditionTypes?.exhaustion?.name ?? "Wyczerpanie",
    name: "Wyczerpanie",
    max: CONFIG.DND5E.conditionTypes?.exhaustion?.levels ?? 6,
    value: actor.system?.attributes?.exhaustion ?? 0,
    sources: getExhaustionSources(actor),
    summary: _exhaustionSummary,
    set: level => actor.update({ "system.attributes.exhaustion": level })
  }];

  const wound = registry.get("zranienie");
  if (wound) tracks.push({
    id: "zranienie",
    label: wound.label,
    name: "Zranienie",
    max: wound.max,
    value: wound.get(actor),
    summary: wound.summary,
    set: level => wound.set(actor, level)
  });

  const drink = registry.get("upojenie");
  if (drink) tracks.push({
    id: "upojenie",
    label: drink.label,
    name: "Upojenie",
    max: drink.max,
    value: drink.get(actor),
    summary: drink.summary,
    set: level => drink.set(actor, level)
  });

  return tracks;
}

/**
 * Wyczerpanie is native dnd5e, so its cost is arithmetic off `reduction` rather than a
 * table — 2 per level off every d20 test, 1.5 m off Szybkość (both set in `config/exhaustion.mjs`).
 * @param {number} level
 * @returns {{lines: string[]}}
 */
function _exhaustionSummary(level) {
  const cfg = CONFIG.DND5E.conditionTypes?.exhaustion ?? {};
  const max = cfg.levels ?? 6;
  if (level <= 0) return { lines: [] };

  const rolls = (cfg.reduction?.rolls ?? 2) * level;
  const speed = (cfg.reduction?.speed ?? 1.5) * level;
  const lines = [
    `−${rolls} do każdego testu k20 (Testy Cech, Ataku i Rzuty Obronne)`,
    `Szybkość −${String(Number(speed.toFixed(1))).replace(".", ",")} m`
  ];
  if (level >= max) lines.push("Śmierć");
  return { lines };
}

/**
 * Tooltip for a pip: what the character would suffer standing at that level, cumulative,
 * because filling a track left-to-right is the only way to reach it.
 * @param {object} track
 * @param {number} n
 * @param {object|null} origin  Exhaustion source for this level, when known.
 * @returns {string}
 */
function _pipTooltip(track, n, origin) {
  const { title, lines = [] } = track.summary?.(n) ?? {};
  const head = [`${track.name} ${n}/${track.max}`, title, origin?.label].filter(Boolean).join(" — ");
  return `<strong>${head}</strong>`
    + (lines.length ? `<ul>${lines.map(l => `<li>${l}</li>`).join("")}</ul>` : "");
}

/**
 * One labelled pip row. Wyczerpanie pips are tinted by the source that caused that
 * level, so the track reads as a list of causes rather than a bare number.
 * @param {object} track
 * @param {boolean} editable
 * @returns {HTMLElement}
 */
function _buildTrackRow(track, editable) {
  const row = document.createElement("div");
  row.className = `neuro-stan-row neuro-stan-${track.id}`;

  const label = document.createElement("span");
  label.className = "neuro-stan-label";
  label.textContent = track.name ?? track.label;
  label.setAttribute("data-tooltip", track.label);
  row.appendChild(label);

  const pips = document.createElement("div");
  pips.className = "neuro-stan-pips";
  for (let n = 1; n <= track.max; n++) {
    const filled = n <= track.value;
    const origin = filled ? track.sources?.[n - 1] : null;
    const def = origin ? EXHAUSTION_SOURCES[origin.source] : null;

    const pip = document.createElement("button");
    pip.type = "button";
    pip.className = "neuro-stan-pip";
    pip.classList.toggle("filled", filled);
    if (n === track.max) pip.classList.add("terminal");
    if (def?.color) pip.style.setProperty("--neuro-pip-color", def.color);
    pip.dataset.n = String(n);
    pip.dataset.tooltipHtml = _pipTooltip(track, n, origin);
    pip.dataset.tooltipClass = "neuro-stan-tip";
    pip.disabled = !editable;
    if (editable) pip.addEventListener("click", async ev => {
      ev.preventDefault();
      ev.stopPropagation();
      const clicked = Number(ev.currentTarget.dataset.n);
      await track.set(clicked <= track.value ? clicked - 1 : clicked);
    });
    pips.appendChild(pip);
  }
  row.appendChild(pips);

  return row;
}

/**
 * Skażenie row. Not a track: the three marks count failed RO na Kondycję toward choroba
 * popromienna, and are display-only because the only legitimate way to move them is to
 * roll. The label is the roll button — the ST comes from the GM, per roll.
 * @param {Actor} actor
 * @param {boolean} editable
 * @returns {HTMLElement}
 */
function _buildRadRow(actor, editable) {
  const failures = getRadiationFailures(actor);

  const row = document.createElement("div");
  row.className = "neuro-stan-row neuro-stan-rad";
  row.classList.toggle("is-hot", failures > 0);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "neuro-rad-btn";
  btn.innerHTML = '<i class="fas fa-radiation" inert></i>';
  const btnLabel = document.createElement("span");
  btnLabel.textContent = "Skażenie";
  btn.appendChild(btnLabel);
  btn.setAttribute("data-tooltip", "RO na Kondycję przeciw skażeniu — ST poda MG");
  btn.disabled = !editable;
  if (editable) btn.addEventListener("click", async ev => {
    ev.preventDefault();
    ev.stopPropagation();
    await promptRadiationSave(actor);
  });
  row.appendChild(btn);

  const marks = document.createElement("div");
  marks.className = "neuro-rad-marks";
  marks.setAttribute("data-tooltip",
    `Oblane RO: ${failures}/${SKAZENIE_DISEASE_THRESHOLD} — trzecie to choroba popromienna`);
  for (let n = 1; n <= SKAZENIE_DISEASE_THRESHOLD; n++) {
    const mark = document.createElement("div");
    mark.className = "neuro-rad-mark";
    mark.classList.toggle("filled", n <= failures);
    if (n === SKAZENIE_DISEASE_THRESHOLD) mark.classList.add("terminal");
    marks.appendChild(mark);
  }
  row.appendChild(marks);

  return row;
}

/**
 * The full Stan card. The heading's dead space carries the Wyczerpanie total, which frees
 * every row of its own readout.
 * @param {Actor} actor
 * @param {Array<object>} tracks
 * @returns {HTMLElement}
 */
function _buildStanPanel(actor, tracks) {
  const panel = document.createElement("div");
  panel.className = "neuro-stan-panel";

  const heading = document.createElement("h3");
  heading.className = "icon";
  heading.innerHTML = '<i class="fas fa-heart-crack" inert></i>';
  const title = document.createElement("span");
  title.className = "roboto-upper";
  title.textContent = "Stan";
  heading.appendChild(title);
  panel.appendChild(heading);

  const body = document.createElement("div");
  body.className = "neuro-stan-body";
  for (const track of tracks) body.appendChild(_buildTrackRow(track, actor.isOwner));
  body.appendChild(_buildRadRow(actor, actor.isOwner));

  // Read-only — every control for these lives on the Biografia tab.
  const ailments = buildHealthStrip(actor);
  if (ailments) body.appendChild(ailments);

  panel.appendChild(body);

  return panel;
}

/* -------------------------------------------- */
/*  Injection                                    */
/* -------------------------------------------- */

/**
 * Place the Stan panel on a character sheet.
 * @param {HTMLElement} root
 * @param {Actor} actor
 * @param {Array<object>} tracks
 */
function _injectCharacter(root, actor, tracks) {
  const sidebar = root.querySelector(".sidebar");
  if (!sidebar) return;
  const panel = _buildStanPanel(actor, tracks);
  const favorites = sidebar.querySelector(".favorites");
  if (favorites) favorites.before(panel);
  else sidebar.appendChild(panel);
}

/**
 * Place the Stan panel on an NPC sheet.
 * dnd5e renders no exhaustion pips for NPCs at all, so on this sheet the panel is the
 * only exhaustion control that exists.
 * @param {HTMLElement} root
 * @param {Actor} actor
 * @param {Array<object>} tracks
 */
function _injectNPC(root, actor, tracks) {
  const sidebar = root.querySelector(".sidebar");
  if (!sidebar) return;
  sidebar.prepend(_buildStanPanel(actor, tracks));
}

/**
 * Hook: runs after every other sheet injector, so it can relocate their output.
 * @param {Application} app
 * @param {HTMLElement|jQuery} html
 */
function _onRenderSheet(app, html) {
  const actor = app.document ?? app.actor;
  if (!actor || !["character", "npc"].includes(actor.type)) return;

  const root = html instanceof HTMLElement ? html
    : html?.[0] instanceof HTMLElement ? html[0]
    : html?.element instanceof HTMLElement ? html.element
    : null;
  if (!root) return;

  _relocateZasoby(root);

  // Re-render safe: drop anything a previous pass left behind.
  root.querySelectorAll(".neuro-stan-panel").forEach(n => n.remove());

  const tracks = _statusTracks(actor);
  if (actor.type === "character") _injectCharacter(root, actor, tracks);
  else _injectNPC(root, actor, tracks);
}

/* -------------------------------------------- */
/*  Registration                                 */
/* -------------------------------------------- */

/**
 * Register the sheet shell. Call from `init`.
 *
 * The subclasses are built in `ready`, not `init`/`setup`: `DocumentSheetConfig.registerSheet`
 * queues everything registered before `game.ready` and only flushes it into
 * `CONFIG.Actor.sheetClasses` at ready. dnd5e registers its own sheets in `init`, so the
 * registry we read the base class out of is still empty at `setup`.
 */
export function registerSheetShell() {
  for (const hookName of ["renderCharacterActorSheet", "renderNPCActorSheet"]) {
    Hooks.on(hookName, _onRenderSheet);
  }

  Hooks.once("ready", () => {
    const DocumentSheetConfig = foundry.applications.apps.DocumentSheetConfig;
    const targets = [
      {
        type: "character",
        name: "NeuroshimaCharacterSheet",
        label: "Neuroshima — Karta Postaci",
        drop: ["spells", "bastion"],
        tabs: CHARACTER_TABS,
        defaultTab: "inventory"
      },
      {
        type: "npc",
        name: "NeuroshimaNPCSheet",
        label: "Neuroshima — Karta BN",
        drop: ["spells"],
        tabs: NPC_TABS,
        defaultTab: "features"
      }
    ];

    for (const { type, name, label, drop, tabs, defaultTab } of targets) {
      const Base = _stockSheetClass(type);
      if (!Base) {
        console.warn(`Neuroshima 5e | No stock dnd5e sheet found for "${type}" — shell not registered`);
        continue;
      }
      DocumentSheetConfig.registerSheet(Actor, MODULE_ID, _buildSheetClass(Base, { name, drop, tabs, defaultTab }), {
        types: [type],
        // Writing the world default is a GM-only settings update.
        makeDefault: game.user.isGM,
        label
      });
    }

    foundry.applications.handlebars.loadTemplates([ZASOBY_TEMPLATE]);
    console.log("Neuroshima 5e | Sheet shell registered (character + npc)");
  });
}
