/**
 * Neuroshima 5e — właściwości broni wymuszające Rzut Obronny i stan przy trafieniu.
 *
 * Generalizacja wzorca z `obalajaca.mjs` dla czterech właściwości:
 *  - Porażająca     → RO Kondycja ST 10 albo Powalenie (każdy rozmiar)
 *  - Powalająca     → RO Siła ST 8+SIŁ+PB albo Powalenie (cel ≤ Duży, obrażenia obuchowe)
 *  - Unieruchamiająca → RO Zręczność ST 8+SIŁ+PB albo Unieruchomienie (cel Śr/Duży, zamiast obrażeń)
 *  - Rozrywająca    → RO Kondycja ST 14 albo Krwawienie (amunicja dum-dum, homebrew Kobalt)
 *
 * Odporności na stany (`system.traits.ci.value`) są respektowane — cel odporny na dany
 * stan nie wykonuje RO i otrzymuje informację o odporności (zgodnie z RAW i mechaniką dnd5e,
 * która i tak usuwa stan z `actor.statuses` w `prepareResistImmune`).
 *
 * Trzy pierwsze nakładają stan przez `toggleStatusEffect` i tak zostaje. Rozrywająca nie da się
 * do tego sprowadzić — Krwawienie to nie sam znacznik, tylko cykliczny tick z własnym profilem
 * (`combat/bleeding.mjs`), więc definicja może zamiast `status` podać `onFail`. Dwa dodatkowe
 * pola bramkujące (`exemptDamageType`, `exemptCreatureTypes`) też powstały dla niej, ale są
 * ogólne: pierwsze pomija cele z redukcją/odpornością/niewrażliwością na dany typ obrażeń,
 * drugie — istoty, których dana cecha z definicji nie dotyczy (maszyna nie krwawi).
 *
 * Źródło zasad: Tabele/Bronie/BronBiala.md; dum-dum — homebrew "W Kolorze Kobaltu".
 */

import { startBleeding } from "./bleeding.mjs";
import { NEUROSHIMA_CREATURE_TYPES } from "../config/creature-types.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/**
 * Definicje właściwości. `dc.mode`:
 *  - "fixed"    → stałe ST (`dc.value`)
 *  - "attacker" → `dc.base` + modyfikator Siły atakującego + Premia Biegłości
 *
 * `sizes` = lista dozwolonych rozmiarów celu (null = każdy). Poza listą → dialog potwierdzenia (MG może wymusić).
 */
const SAVE_PROPERTIES = {
  porazajaca: {
    label: "Porażająca",
    ability: "con",
    status: "prone",
    statusLabel: "Powalenie",
    dc: { mode: "fixed", value: 10 },
    sizes: null,
    alternativeToDamage: false,
    icon: "fa-bolt",
    color: "#b8860b",
  },
  powalajaca: {
    label: "Powalająca",
    ability: "str",
    status: "prone",
    statusLabel: "Powalenie",
    dc: { mode: "attacker", base: 8 },
    sizes: ["tiny", "sm", "med", "lg"],
    alternativeToDamage: false,
    icon: "fa-hammer",
    color: "#8b4513",
  },
  unieruchamiajaca: {
    label: "Unieruchamiająca",
    ability: "dex",
    status: "restrained",
    statusLabel: "Unieruchomienie",
    dc: { mode: "attacker", base: 8 },
    sizes: ["med", "lg"],
    alternativeToDamage: true,
    icon: "fa-link",
    color: "#2f6f4f",
  },
  rozrywajaca: {
    label: "Rozrywająca",
    ability: "con",
    status: "bleeding",
    statusLabel: "Krwawienie",
    dc: { mode: "fixed", value: 14 },
    sizes: null,
    alternativeToDamage: false,
    icon: "fa-droplet",
    color: "#c0392b",
    // "Każda istota żywa trafiona pociskiem dum-dum, która nie posiada redukcji, odporności
    // lub niewrażliwości na obrażenia kłute…" — obie klauzule wprost z tekstu naboju.
    exemptDamageType: "piercing",
    exemptCreatureTypes: ["maszyna"],
    // Krwawienie ma własny cykl i profil; samo przełączenie statusu zostawiłoby ikonę na
    // tokenie i nie zadałoby ani jednego punktu obrażeń.
    onFail: actor => startBleeding(actor, { profile: "dumdum", reason: "pocisk dum-dum" }),
  },
};

/** Czytelne nazwy rozmiarów do komunikatów. */
const SIZE_LABELS = {
  tiny: "Drobny", sm: "Mały", med: "Średni", lg: "Duży", huge: "Wielki", grg: "Ogromny",
};

export function registerWeaponSaveProperties() {
  // `dnd5e.renderChatMessage`, nie `renderChatMessageHTML`: to drugie leci przed
  // `ChatMessageDataModel#getHTML`, które nadpisuje całe `.message-content`.
  Hooks.on("dnd5e.renderChatMessage", (message, html) => {
    const item = _getItemFromMessage(message);
    if (!item) return;

    const el = html instanceof HTMLElement ? html : html[0];
    if (!el) return;

    for (const [propId, config] of Object.entries(SAVE_PROPERTIES)) {
      if (!_hasProperty(item, propId)) continue;

      const dc = _computeDC(item, config);
      _injectButton(el, propId, config, dc);
    }
  });

  Hooks.on("renderChatLog", (app, html) => {
    const el = html instanceof HTMLElement ? html : html[0];
    el.addEventListener("click", _onClickSaveButton);
  });
}

/* -------------------------------------------- */
/*  Detekcja                                      */
/* -------------------------------------------- */

/** Wyciąga przedmiot (broń) z wiadomości czatu. */
function _getItemFromMessage(message) {
  const itemUuid = message.getFlag("dnd5e", "item")?.uuid
    || message.getFlag("dnd5e", "roll")?.itemUuid
    || message.getFlag("dnd5e", "use")?.itemUuid;
  if (!itemUuid) return null;

  let item;
  try { item = fromUuidSync(itemUuid); } catch { /* ignore */ }
  if (!item || item.type !== "weapon") return null;
  return item;
}

/** Sprawdza, czy broń LUB jej amunicja ma daną właściwość. */
function _hasProperty(item, propId) {
  const props = item.system?.properties ?? new Set();
  let has = props.has?.(propId) ?? false;

  if (!has) {
    const ammoId = item.system?.consume?.target;
    const ammo = ammoId ? item.actor?.items.get(ammoId) : null;
    const ammoProps = ammo?.system?.properties ?? new Set();
    has = ammoProps.has?.(propId) ?? false;
  }
  return has;
}

/** ST = stałe albo 8 + mod. Siły + Premia Biegłości atakującego. */
function _computeDC(item, config) {
  if (config.dc.mode === "fixed") return config.dc.value;

  const actor = item.actor;
  const prof = actor?.system?.attributes?.prof ?? 0;
  const strMod = actor?.system?.abilities?.str?.mod ?? 0;
  return config.dc.base + prof + strMod;
}

/** Czy cel jest odporny na dany stan (`system.traits.ci.value`). */
function _isImmuneToCondition(actor, statusId) {
  const ci = actor?.system?.traits?.ci?.value;
  if (ci instanceof Set) return ci.has(statusId);
  if (Array.isArray(ci)) return ci.includes(statusId);
  return false;
}

/* -------------------------------------------- */
/*  UI — przycisk na karcie czatu                 */
/* -------------------------------------------- */

function _injectButton(el, propId, config, dc) {
  // Nie dubluj przycisku, jeśli już jest.
  if (el.querySelector(`.neuro-save-prop-btn[data-prop="${propId}"]`)) return;

  const abilityLabel = CONFIG.DND5E.abilities?.[config.ability]?.abbreviation?.toUpperCase()
    ?? config.ability.toUpperCase();

  const buttonHtml = `
    <button class="neuro-save-prop-btn" data-prop="${propId}" data-save-dc="${dc}"
      style="margin-top:5px;color:${config.color};border:1px solid ${config.color};background:${_rgba(config.color, 0.1)};">
      <i class="fas ${config.icon}"></i> Cecha: ${config.label} [RO ${abilityLabel} ST ${dc}]
    </button>`;

  const container = el.querySelector(".card-buttons") ?? el.querySelector(".message-content");
  if (container) container.insertAdjacentHTML("beforeend", buttonHtml);
}

/** Hex → rgba string. */
function _rgba(hex, alpha) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* -------------------------------------------- */
/*  Obsługa kliknięcia                            */
/* -------------------------------------------- */

async function _onClickSaveButton(event) {
  const btn = event.target.closest(".neuro-save-prop-btn");
  if (!btn) return;
  event.preventDefault();

  const propId = btn.dataset.prop;
  const config = SAVE_PROPERTIES[propId];
  if (!config) return;

  const saveDC = parseInt(btn.dataset.saveDc ?? "10", 10);

  const targets = Array.from(game.user.targets);
  if (targets.length === 0) {
    ui.notifications.warn(`Zaznacz (target) cel, który ma otrzymać efekt: ${config.label}.`);
    return;
  }

  for (const target of targets) {
    await _resolveTarget(target, config, saveDC);
  }
}

async function _resolveTarget(target, config, saveDC) {
  const actor = target.actor;
  if (!actor) return;

  const name = target.name;
  const size = actor.system?.traits?.size;

  // 1. Ograniczenie rozmiaru — poza dozwolonym zakresem pytamy MG.
  if (config.sizes && size && !config.sizes.includes(size)) {
    const sizeLabel = SIZE_LABELS[size] ?? size;
    const allowed = config.sizes.map(s => SIZE_LABELS[s] ?? s).join(" / ");
    const proceed = await foundry.applications.api.DialogV2.confirm({
      window: { title: `${config.label} — nietypowy rozmiar` },
      content: `<p>Cel <b>${name}</b> ma rozmiar <b>${sizeLabel}</b>.</p>`
        + `<p>Cecha <b>${config.label}</b> normalnie dotyczy celów: ${allowed}. Wymusić mimo to?</p>`,
      yes: { label: "Tak, wymuś RO" },
      no: { label: "Anuluj" },
      rejectClose: false,
    });
    if (!proceed) return;
  }

  // 2. Cecha z definicji nie dotyczy tej istoty (maszyna nie krwawi).
  if (config.exemptCreatureTypes?.length && _isExemptCreatureType(actor, config.exemptCreatureTypes)) {
    await _announceNoEffect(actor, config, `${name} nie jest istotą żywą — ${config.label} nie działa.`);
    return;
  }

  // 3. Redukcja/odporność/niewrażliwość na dany typ obrażeń zatrzymuje cechę przed RO.
  if (config.exemptDamageType && _resistsDamageType(actor, config.exemptDamageType)) {
    const dmgLabel = CONFIG.DND5E.damageTypes?.[config.exemptDamageType]?.label
      ?? config.exemptDamageType;
    await _announceNoEffect(actor, config,
      `${name} ma redukcję lub odporność na obrażenia ${dmgLabel.toLowerCase()} — ${config.label} nie działa.`);
    return;
  }

  // 4. Odporność na stan — RAW: brak efektu, bez RO.
  if (_isImmuneToCondition(actor, config.status)) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor }),
      content: `<div class="neuro-save-prop-result">`
        + `<i class="fas ${config.icon}" style="color:${config.color}"></i> `
        + `<b>${name}</b> jest <b>odporny</b> na ${config.statusLabel} — ${config.label} nie działa.</div>`,
    });
    ui.notifications.info(`${config.label}: ${name} jest odporny na ${config.statusLabel}.`);
    return;
  }

  // 5. Rzut obronny.
  const rolls = await actor.rollSavingThrow(
    { ability: config.ability, target: saveDC },
    { configure: false },
    { create: true },
  );
  const roll = Array.isArray(rolls) ? rolls[0] : rolls;
  if (!roll) return;

  const total = roll.total ?? 0;
  if (total < saveDC) {
    // `onFail` zastępuje samo przełączenie statusu tam, gdzie efekt jest czymś więcej niż
    // znacznikiem (Krwawienie ma własny cykl i profil obrażeń).
    if (config.onFail) await config.onFail(actor);
    else await actor.toggleStatusEffect(config.status, { active: true });
    ui.notifications.info(`${config.label}: ${name} oblał RO i otrzymuje ${config.statusLabel}!`);
  } else {
    ui.notifications.info(`${config.label}: ${name} zdał RO i uniknął efektu (${config.statusLabel}).`);
  }
}

/** Wspólna karta "cecha nie zadziałała" — dla obu bramek powyżej. */
async function _announceNoEffect(actor, config, sentence) {
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-save-prop-result">`
      + `<i class="fas ${config.icon}" style="color:${config.color}"></i> ${sentence}</div>`,
  });
  ui.notifications.info(sentence);
}

/**
 * Czy cel ma redukcję, odporność albo niewrażliwość na dany typ obrażeń.
 *
 * `dr` to w tym module również "Odporność kinetyczna" pancerza (patrz `actors/armor-rules.mjs`),
 * więc jedno sprawdzenie pokrywa wszystkie trzy przypadki z tekstu naboju.
 */
function _resistsDamageType(actor, damageType) {
  for (const key of ["dr", "di"]) {
    const value = actor?.system?.traits?.[key]?.value;
    if (value instanceof Set ? value.has(damageType) : Array.isArray(value) && value.includes(damageType)) {
      return true;
    }
  }
  return false;
}

/**
 * Typ istoty spoza zakresu cechy (np. maszyna dla Rozrywającej).
 *
 * `system.details.type.value` w tym świecie trzyma **etykietę**, nie klucz — NPC-e mają tam
 * "Potwór"/"Zwierzę", a nie "potwor"/"zwierze" (sprawdzone na żywym bestiariuszu, 2026-09-08).
 * Porównanie samego klucza, które tu było najpierw, nie trafiłoby ani razu i cecha po cichu
 * działałaby też na maszyny. Postacie graczy siedzą jeszcze na dnd5e-owym "humanoid", więc
 * dopasowanie musi znieść wszystkie trzy zapisy naraz.
 */
function _isExemptCreatureType(actor, exempt) {
  const raw = String(actor?.system?.details?.type?.value ?? "").trim().toLowerCase();
  if (!raw) return false;
  return exempt.some(key => {
    if (raw === String(key).toLowerCase()) return true;
    const label = NEUROSHIMA_CREATURE_TYPES[key]?.label;
    return !!label && raw === label.toLowerCase();
  });
}

/** Wewnętrzne bramki cech — testowane wprost, bo `_resolveTarget` robi RO i karty czatu. */
export const __testing = Object.freeze({
  SAVE_PROPERTIES,
  resistsDamageType: _resistsDamageType,
  isExemptCreatureType: _isExemptCreatureType,
  computeDC: _computeDC,
  hasProperty: _hasProperty
});
