/**
 * Neuroshima 5e — właściwości broni wymuszające Rzut Obronny i stan przy trafieniu.
 *
 * Generalizacja wzorca z `obalajaca.mjs` dla trzech właściwości:
 *  - Porażająca     → RO Kondycja ST 10 albo Powalenie (każdy rozmiar)
 *  - Powalająca     → RO Siła ST 8+SIŁ+PB albo Powalenie (cel ≤ Duży, obrażenia obuchowe)
 *  - Unieruchamiająca → RO Zręczność ST 8+SIŁ+PB albo Unieruchomienie (cel Śr/Duży, zamiast obrażeń)
 *
 * Odporności na stany (`system.traits.ci.value`) są respektowane — cel odporny na dany
 * stan nie wykonuje RO i otrzymuje informację o odporności (zgodnie z RAW i mechaniką dnd5e,
 * która i tak usuwa stan z `actor.statuses` w `prepareResistImmune`).
 *
 * Źródło zasad: Tabele/Bronie/BronBiala.md.
 */

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
};

/** Czytelne nazwy rozmiarów do komunikatów. */
const SIZE_LABELS = {
  tiny: "Drobny", sm: "Mały", med: "Średni", lg: "Duży", huge: "Wielki", grg: "Ogromny",
};

export function registerWeaponSaveProperties() {
  Hooks.on("renderChatMessageHTML", (message, html) => {
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

  // 2. Odporność na stan — RAW: brak efektu, bez RO.
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

  // 3. Rzut obronny.
  const rolls = await actor.rollSavingThrow(
    { ability: config.ability, target: saveDC },
    { configure: false },
    { create: true },
  );
  const roll = Array.isArray(rolls) ? rolls[0] : rolls;
  if (!roll) return;

  const total = roll.total ?? 0;
  if (total < saveDC) {
    await actor.toggleStatusEffect(config.status, { active: true });
    ui.notifications.info(`${config.label}: ${name} oblał RO i otrzymuje ${config.statusLabel}!`);
  } else {
    ui.notifications.info(`${config.label}: ${name} zdał RO i uniknął efektu (${config.statusLabel}).`);
  }
}

