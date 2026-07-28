const MODULE_ID = "neuroshima-2026-overrides";
const JAM_FLAG = "jam";
const MAINTENANCE_FLAG = "maintenance";
const CLEAR_JAM_DC = 10;
const REPAIR_WEAPON_DC = 15;
const GUNSMITH_TOOL_KEY = "rusznikarza";
import { ABILITY_KEYS, buildAbilityRuleChangeNotice, getAbilityLabel, hasAbility } from "../actors/abilities.mjs";
import { playWeaponSound, WeaponSound } from "./sounds.mjs";
import { seqScrollText } from "./sequencer.mjs";
import { hasAddon } from "../config/addons-data.mjs";

export function registerWeaponJams() {
  Hooks.on("dnd5e.postRollAttack", onPostRollAttack);
  Hooks.on("dnd5e.preUseActivity", onPreUseActivity);
  Hooks.on("dnd5e.postUseActivity", onPostUseActivity);
  Hooks.on("renderItemSheet5e", onRenderItemSheet);

  const mod = game.modules.get(MODULE_ID);
  if (mod) {
    mod.api ??= {};
    mod.api.jams = {
      isJammed,
      isDamaged,
      isCleaned,
      isPamperedWeapon,
      setJammed,
      setDamaged,
      clearJam,
      rollJamCheck,
      attemptClearJam,
      attemptRepair,
      clearDamage,
      cleanWeapon,
      setPamperedWeapon,
      getWeaponFaultState,
      getWeaponMaintenanceState
    };
  }

  console.log("Neuroshima 5e | Firearm jam core registered");
}

export function isJammed(item) {
  return getWeaponFaultState(item).jammed === true;
}

export function isJamImmune(item) {
  return !!_getJamImmunityAbilityKey(item);
}

export function isDamaged(item) {
  return getWeaponFaultState(item).damaged === true;
}

export function getWeaponFaultState(item) {
  return item?.getFlag(MODULE_ID, JAM_FLAG) ?? {};
}

export function getWeaponMaintenanceState(item) {
  return item?.getFlag(MODULE_ID, MAINTENANCE_FLAG) ?? {};
}

export function isCleaned(item) {
  return getWeaponMaintenanceState(item).cleaned === true;
}

export function isPamperedWeapon(item) {
  if (!hasAbility(item?.actor, ABILITY_KEYS.WYCHUCHANA_SPLUWA, { tokenDocument: _getItemToken(item) })) return false;
  return getWeaponMaintenanceState(item).pampered === true;
}

export async function setJammed(item, { reason = "", chat = true } = {}) {
  const liveItem = _getLiveItem(item);
  if (!liveItem || isJammed(liveItem) || isDamaged(liveItem)) return false;
  if (_getJamImmunitySource(liveItem)) return false;

  await _setWeaponFaultState(liveItem, {
    jammed: true,
    damaged: false,
    reason,
    jammedAt: Date.now()
  });

  if (chat) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: liveItem.actor }),
      content: `<div><strong>${liveItem.name}</strong> zacina się.${reason ? ` (${reason})` : ""}</div>`
    });
  }

  playWeaponSound(WeaponSound.JAM);
  seqScrollText("ZACIĘCIE!", liveItem.actor, { color: "#e74c3c", fontSize: 32, duration: 2000 });
  liveItem.sheet?.render?.(true);
  return true;
}

export async function clearJam(item, { chat = true } = {}) {
  const liveItem = _getLiveItem(item);
  if (!liveItem || !isJammed(liveItem)) return false;

  await _setWeaponFaultState(liveItem, {});

  if (chat) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: liveItem.actor }),
      content: `<div><strong>${liveItem.name}</strong> jest znowu gotowa do strzału.</div>`
    });
  }

  playWeaponSound(WeaponSound.UNJAM);
  liveItem.sheet?.render?.(true);
  return true;
}

export async function setDamaged(item, { reason = "", chat = true } = {}) {
  const liveItem = _getLiveItem(item);
  if (!liveItem || isDamaged(liveItem)) return false;

  const previous = getWeaponFaultState(liveItem);
  await _setWeaponFaultState(liveItem, {
    ...previous,
    jammed: false,
    damaged: true,
    reason,
    damagedAt: Date.now()
  });

  if (chat) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: liveItem.actor }),
      content: `<div><strong>${liveItem.name}</strong> ulega uszkodzeniu i wymaga naprawy.${reason ? ` (${reason})` : ""}</div>`
    });
  }

  playWeaponSound(WeaponSound.WEAPON_BREAK);
  liveItem.sheet?.render?.(true);
  return true;
}

export async function clearDamage(item, { chat = true } = {}) {
  const liveItem = _getLiveItem(item);
  if (!liveItem || !isDamaged(liveItem)) return false;

  await _setWeaponFaultState(liveItem, {});

  if (chat) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: liveItem.actor }),
      content: `<div><strong>${liveItem.name}</strong> została naprawiona i jest znowu gotowa do strzału.</div>`
    });
  }

  liveItem.sheet?.render?.(true);
  return true;
}

export async function rollJamCheck(item, { label = "Seria", chat = true } = {}) {
  const liveItem = _getLiveItem(item);
  if (!liveItem) return { jammed: false, roll: null };
  const immunityAbilityKey = _getJamImmunityAbilityKey(liveItem);
  if (immunityAbilityKey) {
    if (chat) {
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor: liveItem.actor }),
        content: buildAbilityRuleChangeNotice(immunityAbilityKey, `test zacięcia dla czynności „${label}” został pominięty. <em>${liveItem.name}</em> nie może się tu zaciąć.`, { standalone: true })
      });
    }
    return { jammed: false, roll: null };
  }

  const roll = await new Roll("1d20").evaluate();
  if (chat) {
    await roll.toMessage({
      speaker: ChatMessage.getSpeaker({ actor: liveItem.actor }),
      flavor: `${liveItem.name} - ${label} - test zacięcia`
    });
  }

  const jammed = roll.total === 1;
  if (jammed) await setJammed(liveItem, { reason: label, chat: true });
  return { jammed, roll };
}

export async function attemptClearJam(item) {
  const liveItem = _getLiveItem(item);
  if (!liveItem?.actor || !isJammed(liveItem) || isDamaged(liveItem)) return false;

  if (_hasJakDbaszTakMasz(liveItem.actor)) {
    await clearJam(liveItem, { chat: false });
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: liveItem.actor }),
      content: buildAbilityRuleChangeNotice(ABILITY_KEYS.JAK_DBASZ_TAK_MASZ, `<strong>${liveItem.actor.name}</strong> odblokowuje <strong>${liveItem.name}</strong>. Odblokowanie zużywa tylko Akcję bonusową i nie wymaga rzutu.`, { standalone: true })
    });
    return true;
  }

  const rolls = await liveItem.actor.rollSkill({
    skill: "zwi",
    target: CLEAR_JAM_DC
  }, {}, {
    data: {
      flavor: `${liveItem.name} - Odblokowanie zacięcia (ST ${CLEAR_JAM_DC})`
    }
  });

  const roll = rolls?.[0];
  if (!roll) return false;

  if ((roll.total ?? 0) >= CLEAR_JAM_DC) {
    await clearJam(liveItem, { chat: true });
    return true;
  }

  await setDamaged(liveItem, { reason: "Nieudane odblokowanie zacięcia", chat: true });
  return false;
}

export async function attemptRepair(item) {
  const liveItem = _getLiveItem(item);
  if (!liveItem?.actor || !isDamaged(liveItem)) return false;

  if (_hasGunsmithTools(liveItem.actor)) {
    // Actor has tools — roll the actual check
    const repairCheck = _getRepairCheckConfig(liveItem.actor);
    const rolls = await repairCheck.roll({
      target: REPAIR_WEAPON_DC
    }, {}, {
      data: {
        flavor: `${liveItem.name} - Naprawa broni (${repairCheck.label}, ST ${REPAIR_WEAPON_DC})`
      }
    });

    const roll = rolls?.[0];
    if (!roll) return false;

    if ((roll.total ?? 0) >= REPAIR_WEAPON_DC) {
      await clearDamage(liveItem, { chat: true });
      return true;
    }

    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: liveItem.actor }),
      content: `<div><strong>${liveItem.name}</strong> pozostaje uszkodzona. Naprawa się nie udała.</div>`
    });
    return false;
  }

  // No tools on the sheet — GM narrates repair (e.g. paid gunsmith).
  // Ask the player/GM whether the repair check succeeded.
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: `Naprawa broni: ${liveItem.name}` },
    content: `<p>Czy udał się test<br><strong>Mały Rusznikarz — Zręczność lub Inteligencja ST ${REPAIR_WEAPON_DC}</strong>?</p>`,
    yes: { label: "Tak — broń naprawiona", icon: "fas fa-check" },
    no: { label: "Nie — naprawa nieudana", icon: "fas fa-times" },
    rejectClose: false
  });

  if (!confirmed) return false;

  await clearDamage(liveItem, { chat: true });
  return true;
}

export async function cleanWeapon(item, { chat = true } = {}) {
  const liveItem = _getLiveItem(item);
  if (!liveItem?.actor || !_isFirearmItem(liveItem)) return false;
  if (game.combat?.started) {
    ui.notifications.warn(`${liveItem.name}: czyszczenie broni to aktywność odpoczynku i nie może być wykonane w walce.`);
    return false;
  }

  const current = getWeaponMaintenanceState(liveItem);
  await _setWeaponMaintenanceState(liveItem, {
    ...current,
    cleaned: true,
    cleanedAt: Date.now()
  });

  playWeaponSound(WeaponSound.CLEAN_WEAPON);

  if (chat) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: liveItem.actor }),
      content: `
        <div class="dnd5e2 chat-card">
          <div style="border-left:3px solid #888;padding-left:8px">
            <strong>${liveItem.actor.name}</strong> przez godzinę czyści <strong>${liveItem.name}</strong>.
          </div>
          <ul class="card-footer pills unlist">
            <li class="pill transparent"><span class="label">Wyposażenie</span></li>
            <li class="pill transparent"><span class="label">1 H</span></li>
            <li class="pill transparent"><span class="label">Odpoczynek</span></li>
          </ul>
        </div>
      `
    });
  }

  liveItem.sheet?.render?.(true);
  return true;
}

export async function setPamperedWeapon(item, active = true, { chat = true } = {}) {
  const liveItem = _getLiveItem(item);
  if (!liveItem || !_isFirearmItem(liveItem)) return false;
  if (active && !hasAbility(liveItem.actor, ABILITY_KEYS.WYCHUCHANA_SPLUWA, { tokenDocument: _getItemToken(liveItem) })) {
    ui.notifications.warn(`${liveItem.name}: ta postać nie ma zdolności Wychuchana spluwa.`);
    return false;
  }
  if (game.combat?.started) {
    ui.notifications.warn(`${liveItem.name}: zmiana wychuchanej spluwy nie jest możliwa podczas walki.`);
    return false;
  }

  const actor = liveItem.actor;
  if (!actor) return false;
  const alreadyPampered = isPamperedWeapon(liveItem);
  if (alreadyPampered === active) return false;

  const previousPampered = actor.items.filter(candidate => {
    if (candidate.id === liveItem.id) return false;
    if (!_isFirearmItem(candidate)) return false;
    return isPamperedWeapon(candidate);
  });

  if (active) {
    for (const other of previousPampered) {
      const otherState = getWeaponMaintenanceState(other);
      await _setWeaponMaintenanceState(other, {
        ...otherState,
        pampered: false
      });
      if (chat) {
        await ChatMessage.create({
          speaker: ChatMessage.getSpeaker({ actor }),
          content: `<div><strong>${actor.name}</strong> przestaje traktować <strong>${other.name}</strong> jako swoją wychuchaną spluwę.</div>`
        });
      }
    }
  }

  const current = getWeaponMaintenanceState(liveItem);
  await _setWeaponMaintenanceState(liveItem, {
    ...current,
    pampered: active
  });

  if (chat) {
    const content = active
      ? `<div><strong>${actor.name}</strong> zaczyna traktować <strong>${liveItem.name}</strong> jako swoją wychuchaną spluwę.</div>`
      : `<div><strong>${actor.name}</strong> przestaje traktować <strong>${liveItem.name}</strong> jako swoją wychuchaną spluwę.</div>`;
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content
    });
  }

  liveItem.sheet?.render?.(true);
  return true;
}

async function onPostRollAttack(rolls, { subject } = {}) {
  const liveItem = _getLiveItem(subject?.item);
  if (!_isFirearmItem(liveItem)) return;
  if (!rolls?.some(roll => roll?.isFumble)) return;
  // Zestaw sprężyn: broń nigdy się nie zacina
  if (hasAddon(liveItem, "zestaw-sprezyn")) return;
  const immunityAbilityKey = _getJamImmunityAbilityKey(liveItem);
  if (immunityAbilityKey) {
    await _announcePreventedFumbleJam(liveItem, immunityAbilityKey);
    return;
  }
  await setJammed(liveItem, { reason: "Pechowa jedynka", chat: true });
}

function onPreUseActivity(activity) {
  const liveItem = _getLiveItem(activity?.item);
  if (!_isFirearmItem(liveItem)) return;
  if (isDamaged(liveItem)) {
    ui.notifications.warn(`${liveItem.name}: broń jest uszkodzona i wymaga naprawy.`);
    return false;
  }
  if (!isJammed(liveItem)) return;
  ui.notifications.warn(`${liveItem.name}: broń jest zacięta.`);
  return false;
}

async function onPostUseActivity(activity) {
  const liveItem = _getLiveItem(activity?.item);
  if (!_isFirearmItem(liveItem) || !isCleaned(liveItem)) return;

  const current = getWeaponMaintenanceState(liveItem);
  await _setWeaponMaintenanceState(liveItem, {
    ...current,
    cleaned: false
  });
}

function onRenderItemSheet(app, html) {
  const item = app.document ?? app.item;
  if (!_isFirearmItem(item)) return;

  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || root.querySelector(".neuro-weapon-maintenance-panel")) return;
  const anchor = root.querySelector("section[data-tab='details'], .details.tab") ?? root.querySelector("form") ?? root;
  if (!anchor) return;

  const banner = document.createElement("div");
  banner.className = "neuro-weapon-maintenance-panel";
  banner.innerHTML = _buildMaintenancePanelHtml(item);
  banner.querySelector(".neuro-clear-jam-btn")?.addEventListener("click", async event => {
    event.preventDefault();
    await attemptClearJam(item);
  });
  banner.querySelector(".neuro-repair-weapon-btn")?.addEventListener("click", async event => {
    event.preventDefault();
    await attemptRepair(item);
  });
  banner.querySelector(".neuro-clean-weapon-btn")?.addEventListener("click", async event => {
    event.preventDefault();
    await cleanWeapon(item);
  });
  banner.querySelector(".neuro-toggle-pampered-btn")?.addEventListener("click", async event => {
    event.preventDefault();
    await setPamperedWeapon(item, !isPamperedWeapon(item));
  });
  anchor.prepend(banner);
}

function _buildMaintenancePanelHtml(item) {
  const canUsePamperedWeapon = hasAbility(item.actor, ABILITY_KEYS.WYCHUCHANA_SPLUWA, { tokenDocument: _getItemToken(item) });
  const statuses = [];
  if (isCleaned(item)) statuses.push(_buildStatusChip("Wyczyszczona", "#1b5e20", "rgba(27,94,32,0.12)"));
  if (isPamperedWeapon(item)) statuses.push(_buildStatusChip("Wychuchana spluwa", "#7a5a00", "rgba(122,90,0,0.13)"));
  if (_hasJakDbaszTakMasz(item.actor)) statuses.push(_buildStatusChip("Jak Dbasz, Tak Masz", "#1f4a6a", "rgba(31,74,106,0.12)"));

  const statusRow = statuses.length
    ? `<div style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 8px;">${statuses.join("")}</div>`
    : "<div style=\"margin:6px 0 8px;font-size:12px;opacity:0.8;\">Stan specjalny: brak.</div>";

  const faultBlock = isDamaged(item)
    ? _buildDamageBlock(item)
    : (isJammed(item) ? _buildJamBlock(item) : "<div style=\"margin-top:8px;font-size:12px;opacity:0.8;\">Broń jest sprawna.</div>");

  const pamperedControl = canUsePamperedWeapon ? `
    <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px;">
      <button type="button" class="neuro-toggle-pampered-btn" ${game.combat?.started ? "disabled" : ""}>
        ${isPamperedWeapon(item) ? "Przestań traktować jako wychuchaną spluwę" : "Ustaw jako wychuchaną spluwę"}
      </button>
      <span style="font-size:12px;opacity:0.8;">${game.combat?.started ? "Zmiana wychuchanej spluwy jest zablokowana podczas walki." : "Możesz mieć tylko jedną wychuchaną spluwę naraz."}</span>
    </div>
  ` : "";

  return `
    <fieldset>
      <legend>Konserwacja broni</legend>
      <div style="margin-bottom: 8px;">
        <span style="font-size:11px;padding:2px 6px;border-radius:999px;border:1px solid #5d6d7e;background:rgba(93,109,126,0.15);">Aktywność odpoczynku</span>
      </div>
      ${statusRow}
      <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
        <button type="button" class="neuro-clean-weapon-btn" style="flex:0 0 auto; padding: 2px 8px; line-height: normal;">Wyczyść broń (1h)</button>
        <span style="font-size:12px;opacity:0.8;flex:1 1 auto; line-height: 1.2;">Postać spędza godzinę na czyszczeniu. To nie jest akcja 6-sekundowa.</span>
      </div>
      ${pamperedControl}
      ${faultBlock}
    </fieldset>
  `;
}

function _getRepairCheckConfig(actor) {
  return {
    label: CONFIG.DND5E.tools?.[GUNSMITH_TOOL_KEY]?.label ?? "Narzędzia małego rusznikarza",
    roll: config => actor.rollToolCheck({ ...config, tool: GUNSMITH_TOOL_KEY })
  };
}

async function _setWeaponFaultState(item, state) {
  const hasState = Object.keys(state ?? {}).length > 0;
  if (hasState) return item.setFlag(MODULE_ID, JAM_FLAG, state);
  return item.unsetFlag(MODULE_ID, JAM_FLAG);
}

async function _setWeaponMaintenanceState(item, state) {
  const normalized = Object.fromEntries(Object.entries(state ?? {}).filter(([, value]) => value !== false && value != null && value !== ""));
  const hasState = Object.keys(normalized).length > 0;
  await item.unsetFlag(MODULE_ID, MAINTENANCE_FLAG);
  if (hasState) return item.setFlag(MODULE_ID, MAINTENANCE_FLAG, normalized);
  return null;
}

function _buildStatusChip(label, border, background) {
  return `<span style="font-size:11px;padding:2px 8px;border-radius:999px;border:1px solid ${border};background:${background};">${label}</span>`;
}

function _buildJamBlock(item) {
  const hasFeat = _hasJakDbaszTakMasz(item.actor);
  const actionLabel = hasFeat ? "Akcja bonusowa" : "Akcja";
  const testText = hasFeat
    ? "Atut Jak Dbasz, Tak Masz pozwala odblokować zacięcie bez rzutu."
    : `Test: Zwinne dłonie ST ${CLEAR_JAM_DC}. Porażka uszkadza broń.`;
  return `
    <div style="margin-top:10px;padding:8px 10px;border:1px solid #8f3a2b;background:rgba(85,20,12,0.15);border-radius:6px;">
      <strong>Zacięcie</strong> — ta broń nie może teraz strzelać.
      <button type="button" class="neuro-clear-jam-btn" style="margin-left:8px;">Odblokuj zacięcie (${actionLabel})</button>
      <div style="margin-top:6px;font-size:12px;opacity:0.85;">${testText}</div>
    </div>
  `;
}

function _buildDamageBlock(item) {
  const repairCheck = _getRepairCheckConfig(item.actor);
  const hasTools = _hasGunsmithTools(item.actor);
  const requirement = hasTools
    ? `Test: ${repairCheck.label} ST ${REPAIR_WEAPON_DC}.`
    : `Brak narzędzi — potwierdź przez dialog czy zewnętrzny rusznikarz naprawił broń (ST ${REPAIR_WEAPON_DC}).`;
  return `
    <div style="margin-top:10px;padding:8px 10px;border:1px solid #7a2c1d;background:rgba(90,18,10,0.18);border-radius:6px;">
      <strong>Uszkodzenie</strong> — ta broń nie może teraz strzelać i wymaga naprawy.
      <button type="button" class="neuro-repair-weapon-btn" style="margin-left:8px;">Napraw broń (Akcja)</button>
      <div style="margin-top:6px;font-size:12px;opacity:0.85;">${requirement}</div>
    </div>
  `;
}

async function _announcePreventedFumbleJam(item, abilityKey) {
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: item.actor }),
    content: buildAbilityRuleChangeNotice(abilityKey, `pechowa jedynka nie powoduje zacięcia <em>${item.name}</em>. Strzał nadal jest nieudany, ale broń pozostaje sprawna.`, { standalone: true })
  });
}

function _getJamImmunitySource(item) {
  const abilityKey = _getJamImmunityAbilityKey(item);
  return abilityKey ? getAbilityLabel(abilityKey) : null;
}

function _getJamImmunityAbilityKey(item) {
  if (_hasJakDbaszTakMasz(item?.actor)) return ABILITY_KEYS.JAK_DBASZ_TAK_MASZ;
  if (isPamperedWeapon(item)) return ABILITY_KEYS.WYCHUCHANA_SPLUWA;
  return null;
}

function _hasJakDbaszTakMasz(actor) {
  return hasAbility(actor, ABILITY_KEYS.JAK_DBASZ_TAK_MASZ, { tokenDocument: _getActorToken(actor) });
}

function _hasGunsmithTools(actor) {
  return !!actor?.system?.tools?.[GUNSMITH_TOOL_KEY];
}

function _isFirearmItem(item) {
  return !!item && (item.type === "weapon") && (item.system.type?.value?.startsWith?.("palna") ?? false);
}

function _getLiveItem(item) {
  return item?.actor?.items?.get(item.id) ?? item;
}

function _getActorToken(actor) {
  return actor?.token?.document ?? actor?.token ?? actor?.getActiveTokens?.()?.[0]?.document ?? null;
}

function _getItemToken(item) {
  return _getActorToken(item?.actor);
}