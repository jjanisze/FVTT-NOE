/**
 * Neuroshima 5e — Weapon addons inventory UI.
 *
 * Provides:
 * 1. Context menu on loot items with `flags.neuroshima-2026-overrides.ulepszenie`
 *    → "Zainstaluj na broni…" dialog
 * 2. `renderItemSheet5e` injection → addon panel on weapon sheets
 * 3. `renderChatMessage` injection → addon tags on attack chat cards
 */

import {
  ADDON_DEFS, SIGHT_ADDON_IDS,
  hasAddon, getAddons, countSMSlots,
} from "../config/addons-data.mjs";
import {
  installAddon, removeAddon, isAddonCompatible,
  getCompatibleAddonsForWeapon, toggleSetup, getSetup,
} from "../weapons/addons.mjs";
import { hasDose, refillDose, applyDose } from "../weapons/dozownik.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/* ============================================================
 * Registration
 * ============================================================ */

export function registerAddonInventoryUI() {
  // Context menu on actor-sheet item rows
  Hooks.on("dnd5e.getItemContextOptions", _onGetItemContextOptions);

  // Addon panel in weapon item sheet
  Hooks.on("renderItemSheet5e", _onRenderItemSheet);

  // Addon tags in attack chat cards
  Hooks.on("renderChatMessageHTML", _onRenderChatMessage);

  // Highlight weapons with installed addons in actor sheet
  for (const hookName of ["renderActorSheet", "renderCharacterActorSheet", "renderNPCActorSheet"]) {
    Hooks.on(hookName, _onRenderActorSheetHighlightAddons);
  }

  console.log("Neuroshima 5e | Addon inventory UI registered");
}

/* ============================================================
 * 1. Context menu — "Zainstaluj na broni…"
 * ============================================================ */

function _onGetItemContextOptions(item, options) {
  const addonId = item.getFlag(MODULE_ID, "ulepszenie");
  if (!addonId) return;
  if (!ADDON_DEFS[addonId]) return;

  options.push({
    name: "Zainstaluj na broni…",
    icon: '<i class="fas fa-wrench"></i>',
    condition: () => !!item.actor,
    callback: () => _openInstallDialog(item),
  });
}

async function _openInstallDialog(addonItem) {
  const actor = addonItem.actor;
  if (!actor) return;

  const addonId = addonItem.getFlag(MODULE_ID, "ulepszenie");
  const def = ADDON_DEFS[addonId];
  if (!def) return;

  // Gather compatible weapons from actor inventory
  const weapons = actor.items.filter(i => i.type === "weapon");
  const compatible = weapons.filter(w => isAddonCompatible(w, def) === null);
  const incompatible = weapons.filter(w => isAddonCompatible(w, def) !== null);

  if (weapons.length === 0) {
    ui.notifications.warn("Aktor nie ma żadnych broni w ekwipunku.");
    return;
  }

  // Build dialog content
  const optionRows = [
    ...compatible.map(w => `
      <option value="${w.id}">${w.name}</option>
    `),
  ].join("");

  const incompatibleRows = incompatible.map(w => {
    const reason = isAddonCompatible(w, def);
    return `<li style="opacity:0.55;font-size:11px">${w.name} — <em>${reason}</em></li>`;
  }).join("");

  if (!compatible.length) {
    const content = `
      <p>Brak kompatybilnych broni dla <strong>${def.label}</strong>.</p>
      ${incompatibleRows ? `<ul>${incompatibleRows}</ul>` : ""}
    `;
    await foundry.applications.api.DialogV2.prompt({
      window: { title: `Instalacja: ${def.label}` },
      content,
      ok: { label: "OK", icon: "fas fa-check", callback: () => null },
      rejectClose: false,
    });
    return;
  }

  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: `Zainstaluj: ${def.label}` },
    content: `
      <p>Wybierz broń do instalacji <strong>${def.label}</strong>:</p>
      <select name="weaponId" style="width:100%;margin-bottom:8px">
        ${optionRows}
      </select>
      ${incompatibleRows ? `<details style="margin-top:6px;font-size:11px"><summary>Niekompatybilne bronie</summary><ul>${incompatibleRows}</ul></details>` : ""}
      <p style="font-size:12px;opacity:0.8;margin-top:6px">${_buildEffectSummary(def)}</p>
    `,
    ok: {
      label: "Zainstaluj",
      icon: "fas fa-wrench",
      callback: (event, button, dialog) => {
        const root = dialog?.element ?? dialog;
        const select = root?.querySelector?.("select[name=weaponId]");
        return select?.value ?? null;
      },
    },
    rejectClose: false,
  });

  if (!result) return;

  const targetWeapon = actor.items.get(result);
  if (!targetWeapon) return;

  await installAddon(targetWeapon, addonItem);
}

/* ============================================================
 * 2. Weapon sheet — addon panel
 * ============================================================ */

function _onRenderItemSheet(app, html) {
  const item = app.document ?? app.item;
  if (item?.type !== "weapon") return;

  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;

  // Avoid duplicate injection
  if (root.querySelector(".neuro-addons-panel")) return;

  const addons = getAddons(item);
  const setup  = getSetup(item);
  const smCount = countSMSlots(item);
  const hasSM  = item.system?.properties?.has?.("sm") ?? false;

  // Build panel HTML
  const panel = document.createElement("div");
  panel.className = "neuro-addons-panel";
  panel.innerHTML = _buildAddonPanelHtml(item, addons, setup, smCount, hasSM);

  // Wire up remove buttons
  panel.querySelectorAll(".neuro-addon-remove").forEach(btn => {
    btn.addEventListener("click", async event => {
      event.preventDefault();
      const addonId = btn.dataset.addonId;
      if (!addonId) return;
      const confirmed = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Odinstaluj ulepszenie" },
        content: `<p>Odinstalować <strong>${ADDON_DEFS[addonId]?.label ?? addonId}</strong>? Trafi z powrotem do ekwipunku.</p>`,
        yes: { label: "Odinstaluj", icon: "fas fa-trash" },
        no:  { label: "Anuluj" },
        rejectClose: false,
      });
      if (confirmed) await removeAddon(item, addonId);
    });
  });

  // Wire up Dozownik dose button
  panel.querySelectorAll(".neuro-dozownik-refill").forEach(btn => {
    btn.addEventListener("click", async event => {
      event.preventDefault();
      await refillDose(item);
    });
  });

  // Wire up Dozownik apply button (manual poison application)
  panel.querySelectorAll(".neuro-dozownik-apply").forEach(btn => {
    btn.addEventListener("click", async event => {
      event.preventDefault();
      const target = game.user.targets?.first() ?? null;
      if (!target) {
        ui.notifications.warn("Zaznacz (target) cel przed aplikacją trucizny.");
        return;
      }
      await applyDose(item, target);
    });
  });

  // Wire up Kolba składana toggle
  panel.querySelectorAll(".neuro-kolba-toggle").forEach(btn => {
    btn.addEventListener("click", async event => {
      event.preventDefault();
      await toggleSetup(item, "kolbaSkladana");
    });
  });

  // Wire up Dwójnóg / Trójnóg setup toggle
  panel.querySelectorAll(".neuro-setup-toggle").forEach(btn => {
    btn.addEventListener("click", async event => {
      event.preventDefault();
      await toggleSetup(item, btn.dataset.setupKey);
    });
  });

  // Inject into details tab or prepend to form
  const anchor = root.querySelector("section[data-tab='details']")
    ?? root.querySelector(".details.tab")
    ?? root.querySelector("form")
    ?? root;
  anchor.prepend(panel);
}

function _buildAddonPanelHtml(weapon, addons, setup, smCount, hasSM) {
  if (!addons.length) {
    const smInfo = hasSM
      ? `<span style="font-size:11px;opacity:0.7">SM: 0/3 slotów</span>`
      : "";
    return `
      <fieldset class="neuro-addons-fieldset">
        <legend>Ulepszenia</legend>
        <div style="font-size:12px;opacity:0.7">Brak zainstalowanych ulepszeń.</div>
        ${smInfo}
      </fieldset>
    `;
  }

  const rows = addons.map(a => {
    const def = ADDON_DEFS[a.id];
    if (!def) return "";

    const effectText = _buildEffectSummary(def);
    const toggleBtn = _buildSetupToggleButton(a, setup);

    // Dozownik: dose state control
    const doseControl = a.id === "dozownik" ? (() => {
      const filled = hasDose(weapon);
      return filled
        ? `<button type="button" class="neuro-dozownik-apply" title="Aplikuj truciznę na zaznaczony cel"
            style="flex:0 0 auto;padding:2px 6px;line-height:normal;background:rgba(120,0,180,0.18);border:1px solid #7800b4;color:#7800b4;font-weight:bold">
            <i class="fa-solid fa-flask"></i> Aplikuj
          </button>`
        : `<button type="button" class="neuro-dozownik-refill" title="Uzupełnij dozę (Medycyna ST 12)"
            style="flex:0 0 auto;padding:2px 6px;line-height:normal;background:rgba(120,0,180,0.12);border:1px solid #7800b4;color:#7800b4">
            <i class="fa-regular fa-flask"></i> Uzupełnij
          </button>`;
    })() : "";

    return `
      <li class="neuro-addon-row" style="display:flex;align-items:center;gap:6px;padding:3px 0;border-bottom:1px solid rgba(128,128,128,0.15)">
        <span style="flex:1;font-size:13px">
          <strong>${def.label}</strong>
          ${effectText ? `<span style="font-size:11px;opacity:0.75;margin-left:4px">${effectText}</span>` : ""}
        </span>
        ${toggleBtn}
        ${doseControl}
        <button type="button" class="neuro-addon-remove"
          data-addon-id="${a.id}"
          title="Odinstaluj"
          style="flex:0 0 auto;padding:2px 6px;line-height:normal;background:rgba(120,30,30,0.12);">
          <i class="fas fa-times"></i>
        </button>
      </li>
    `;
  }).join("");

  const smSlots = hasSM
    ? `<div style="font-size:11px;opacity:0.7;margin-top:4px">SM: ${smCount}/3 slotów</div>`
    : "";

  return `
    <fieldset class="neuro-addons-fieldset">
      <legend>Ulepszenia</legend>
      <ul class="neuro-addon-list" style="list-style:none;padding:0;margin:0">${rows}</ul>
      ${smSlots}
    </fieldset>
  `;
}

function _buildSetupToggleButton(installed, setup) {
  const { id } = installed;

  if (id === "kolba-skladana") {
    const folded = setup.kolbaSkladana ?? false;
    return `
      <button type="button" class="neuro-kolba-toggle"
        title="${folded ? "Rozłóż kolbę" : "Złóż kolbę"}"
        style="flex:0 0 auto;padding:2px 6px;line-height:normal">
        ${folded ? "Rozłóż" : "Złóż"}
      </button>
    `;
  }

  if (id === "dwojnog" || id === "trojnog") {
    const key = id === "dwojnog" ? "dwojnog" : "trojnog";
    const deployed = setup[key] ?? false;
    const label = id === "dwojnog" ? "Dwójnóg" : "Trójnóg";
    return `
      <button type="button" class="neuro-setup-toggle"
        data-setup-key="${key}"
        title="${deployed ? `Złóż ${label}` : `Rozłóż ${label}`}"
        style="flex:0 0 auto;padding:2px 6px;line-height:normal;${deployed ? "background:rgba(40,100,40,0.2)" : ""}">
        ${deployed ? "✓ Rozłożony" : "Rozłóż"}
      </button>
    `;
  }

  if (id === "laserowy-wskaznik") {
    const active = setup.laserActive ?? false;
    return `
      <button type="button" class="neuro-setup-toggle"
        data-setup-key="laserActive"
        title="${active ? "Wyłącz laser (przestaje ujawniać pozycję)" : "Włącz laser (+1 TA, ujawnia pozycję)"}"
        style="flex:0 0 auto;padding:2px 6px;line-height:normal;${active ? "background:rgba(180,40,40,0.25)" : ""}">
        ${active ? "✓ Laser wł." : "Laser wył."}
      </button>
    `;
  }

  return "";
}

/* ============================================================
 * 4. Actor sheet — highlight weapons with addons
 * ============================================================ */

function _onRenderActorSheetHighlightAddons(app, html) {
  const actor = app.document ?? app.actor;
  if (!actor) return;

  const root = html instanceof HTMLElement ? html
    : html?.[0] instanceof HTMLElement ? html[0]
    : html?.element instanceof HTMLElement ? html.element
    : null;
  if (!root) return;

  root.querySelectorAll(".item[data-item-id]").forEach(row => {
    const item = actor.items.get(row.dataset.itemId);
    if (!item || item.type !== "weapon") return;
    const addons = item.getFlag(MODULE_ID, "addons");
    if (Array.isArray(addons) && addons.length > 0) {
      row.classList.add("neuro-has-addons");
    }
  });
}

/* ============================================================
 * 3. Chat card — addon tags
 * ============================================================ */

function _onRenderChatMessage(message, html) {
  // Only attack rolls; skip activity cards — addons.mjs handles those
  const rollType = message.getFlag("dnd5e", "roll.type");
  if (rollType !== "attack") return;
  if (message.flags?.dnd5e?.activity) return;  // addons.mjs covers this

  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;

  // Get the item that was used
  const item = message.getAssociatedItem?.();
  if (!item || item.type !== "weapon") return;

  const addons = getAddons(item);
  if (!addons.length) return;

  const setup = getSetup(item);

  const tags = addons
    .map(a => {
      const def = ADDON_DEFS[a.id];
      if (!def) return null;

      // Only surface addons that have visible effects
      const effectTag = _buildChatTag(def, item, addons, setup);
      return effectTag;
    })
    .filter(Boolean);

  if (!tags.length) return;

  // Inject into existing pills list (usage card) or append a new one after it (attack card)
  const existingPills = root.querySelector("ul.card-footer.pills");
  if (existingPills) {
    existingPills.insertAdjacentHTML("beforeend", tags.join(""));
  } else {
    const tagsHtml = `<ul class="card-footer pills unlist neuro-addon-tags" style="margin-top:4px">${tags.join("")}</ul>`;
    root.querySelector(".message-content")?.insertAdjacentHTML("beforeend", tagsHtml);
  }
}

function _buildChatTag(def, item, allInstalled, setup) {
  // Direct bonus addons
  if (def.attackBonus > 0) {
    return `<li class="pill transparent"><span class="label">${def.label}: +${def.attackBonus} TA</span></li>`;
  }

  // Property-granting addons — already shown as chips in properties section,
  // but echo notable ones here
  if (def.grantProperties?.includes("cicha")) {
    return `<li class="pill transparent"><span class="label">${def.label}: cicha</span></li>`;
  }
  if (def.grantProperties?.includes("porazajaca")) {
    return `<li class="pill transparent"><span class="label">${def.label}</span></li>`;
  }

  // Conditional bonus addons
  if (def.conditionalBonus) {
    const cb = def.conditionalBonus;
    let bonusText = "";

    if (cb.type === "range-zone") {
      bonusText = `+${cb.normalBonus || cb.longBonus} TA`;
    } else if (cb.type === "toggle") {
      const active = setup[cb.setupKey] ?? false;
      if (!active) return null; // not active = don't show
      bonusText = `+${cb.setupBonus} TA`;
    } else if (cb.type === "no-sight") {
      const hasSight = allInstalled.some(a => a.id !== def.id && SIGHT_ADDON_IDS.has(a.id));
      if (hasSight) return null;
      bonusText = `+${cb.normalBonus} TA`;
    }

    if (bonusText) {
      return `<li class="pill transparent"><span class="label">${def.label}: ${bonusText}</span></li>`;
    }
  }

  // flag-only addons — show label if notable
  const NOTABLE_FLAG_ONLY = new Set([
    "zestaw-sprezyn", "utwardzenie", "noktowizor", "termowizor",
    "latarka", "dwojnog", "trojnog", "chwyt-przedni", "okladziny", "dozownik",
    "dociazone",
  ]);
  if (NOTABLE_FLAG_ONLY.has(def.id)) {
    return `<li class="pill transparent" style="opacity:0.75"><span class="label">${def.label}</span></li>`;
  }

  return null;
}

/* ============================================================
 * Shared helpers
 * ============================================================ */

function _buildEffectSummary(def) {
  const parts = [];
  if (def.attackBonus > 0) parts.push(`+${def.attackBonus} TA`);
  if (def.damageBonus > 0) parts.push(`+${def.damageBonus} obl.`);
  if (def.rangeNormalBonus > 0) parts.push(`+${def.rangeNormalBonus}m`);
  if (def.rangeLongBonus > 0)   parts.push(`+${def.rangeLongBonus}m daleki`);
  if (def.grantProperties?.length) {
    const names = def.grantProperties.map(p =>
      CONFIG.DND5E?.itemProperties?.[p]?.label ?? p
    );
    parts.push(names.join(", "));
  }
  if (def.applyMode?.includes("conditional") && def.conditionalBonus) {
    const cb = def.conditionalBonus;
    if (cb.type === "range-zone" && cb.normalBonus) parts.push(`+${cb.normalBonus} TA (normalny)`);
    if (cb.type === "range-zone" && cb.longBonus)   parts.push(`+${cb.longBonus} TA (daleki)`);
    if (cb.type === "toggle")   parts.push(`+${cb.setupBonus} TA (po włączeniu)`);
    if (cb.type === "no-sight") parts.push(`+${cb.normalBonus} TA (brak przyrządu)`);
  }
  if (def.applyMode?.includes("range-x2")) parts.push("zasięgi ×2");
  if (def.applyMode?.includes("activity"))  parts.push("nowa czynność");
  if (def.id === "zestaw-sprezyn") parts.push("brak zacięć");
  if (def.id === "utwardzenie")    parts.push("brak degradacji");
  if (def.id === "noktowizor")     parts.push("widzenie nocne");
  if (def.id === "termowizor")     parts.push("termowizja");
  if (def.id === "dozownik")       parts.push("aplikator trucizny");
  return parts.join(" · ");
}
