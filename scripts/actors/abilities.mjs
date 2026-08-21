import { CLASS_FEATURES } from "../config/class-features-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const ABILITIES_FLAG = "abilities";

export const ABILITY_KEYS = {
  JAK_DBASZ_TAK_MASZ: "jakDbaszTakMasz",
  WYCHUCHANA_SPLUWA: "wychuchanaSpluwa",
  SZYBKA_WYMIANA: "szybkaWymiana",
  SZYBKIE_PRZELADOWANIE: "szybkiePrzeladowanie",
  GRAD_OLOWIU: "gradOlowiu",
  RUCHOME_GNIAZDO_CKM: "ruchomeGniazdoCkm",
  SZTURMOWIEC: "szturmowiec"
};

export const ABILITY_DEFINITIONS = {
  [ABILITY_KEYS.JAK_DBASZ_TAK_MASZ]: {
    label: "Jak Dbasz, Tak Masz",
    aliases: ["jak dbasz, tak masz"],
    description: "Premie do obsługi zacięć i konserwacji broni.",
    noticeColor: "#35566b",
    prototype: true
  },
  [ABILITY_KEYS.WYCHUCHANA_SPLUWA]: {
    label: "Wychuchana spluwa",
    aliases: ["wychuchana spluwa"],
    description: "Pozwala wskazać jedną broń palną jako wychuchaną spluwę.",
    noticeColor: "#7a5a00",
    prototype: true
  },
  [ABILITY_KEYS.SZYBKA_WYMIANA]: {
    label: "Szybka wymiana",
    aliases: ["szybka wymiana"],
    description: "Docelowo: bonusowa wymiana magazynka / szybkoładowacza.",
    noticeColor: "#556b2f",
    prototype: true
  },
  [ABILITY_KEYS.SZYBKIE_PRZELADOWANIE]: {
    label: "Szybkie przeładowanie",
    aliases: ["szybkie przeładowanie"],
    description: "Docelowo: bonusowe ładowanie 1 naboju i ignorowanie przeładowania.",
    noticeColor: "#556b2f",
    prototype: true
  },
  [ABILITY_KEYS.GRAD_OLOWIU]: {
    label: "Grad ołowiu",
    aliases: ["grad ołowiu"],
    description: "Krótka seria przestaje być ograniczona do jednej na rundę. Limit ataków w turze nadal śledzi gracz lub MG.",
    noticeColor: "#8b3d2f",
    prototype: true
  },
  [ABILITY_KEYS.RUCHOME_GNIAZDO_CKM]: {
    label: "Ruchome gniazdo CKM",
    aliases: ["ruchome gniazdo ckm"],
    description: "Chmura ołowiu: długa seria zużywa dwa razy więcej amunicji i podwaja liczbę kości obrażeń.",
    noticeColor: "#6b3f1f",
    prototype: true
  },
  [ABILITY_KEYS.SZTURMOWIEC]: {
    label: "Szturmowiec",
    aliases: ["szturmowiec"],
    description: "Krótka seria domyślnie nie ustawia utrudnienia; MG może nadal ręcznie zmienić tryb rzutu.",
    noticeColor: "#7a4b2f",
    prototype: true
  }
};

export function registerActorAbilities() {
  for (const hookName of [
    "renderActorSheet",
    "renderCharacterActorSheet",
    "renderNPCActorSheet",
    "renderBaseActorSheet"
  ]) {
    Hooks.on(hookName, onRenderActorSheet);
  }

  const mod = game.modules.get(MODULE_ID);
  if (mod) {
    mod.api ??= {};
    mod.api.abilities = {
      ABILITY_KEYS,
      ABILITY_DEFINITIONS,
      getAbilityDefinitions,
      getAbilityLabel,
      getActorAbilityFlags,
      getTokenAbilityFlags,
      getResolvedAbility,
      hasAbility,
      buildAbilityRuleChangeNotice,
      setActorAbility,
      setTokenAbilityOverride,
      clearTokenAbilityOverride
    };
  }

  console.log("Neuroshima 5e | Prototype abilities resolver registered");
}

export function getAbilityDefinitions() {
  return ABILITY_DEFINITIONS;
}

export function getAbilityLabel(abilityKey) {
  return ABILITY_DEFINITIONS[abilityKey]?.label ?? String(abilityKey ?? "Zdolność");
}

export function buildAbilityRuleChangeNotice(abilityKey, text, { standalone = false } = {}) {
  const label = getAbilityLabel(abilityKey);
  const color = ABILITY_DEFINITIONS[abilityKey]?.noticeColor ?? "#35566b";
  const prefix = `Wyjątek reguły - ${label}:`;
  if (standalone) {
    return `<div style="border-left:3px solid ${color};padding-left:8px"><strong>${prefix}</strong> ${text}</div>`;
  }
  return `<div style="margin-top:6px;font-size:12px;color:${color};"><strong>${prefix}</strong> ${text}</div>`;
}

export function getActorAbilityFlags(actor) {
  return actor?.getFlag(MODULE_ID, ABILITIES_FLAG) ?? {};
}

export function getTokenAbilityFlags(tokenDocument) {
  return tokenDocument?.getFlag?.(MODULE_ID, ABILITIES_FLAG) ?? {};
}

/**
 * Legacy key -> real class/profession feature id.
 *
 * Built from `class-features-data.mjs`, where the authoritative features carry a
 * `legacyAbilityKey`. A real compendium feature on the actor is the strongest
 * possible evidence, so it outranks every flag below.
 *
 * Keys with no counterpart yet (the Sztuczki — Grad ołowiu, Szturmowiec, …) simply
 * never appear here, so the existing flag layer keeps serving them unchanged until
 * the sztuczki pack is populated.
 */
let _legacyIndex = null;
function _getLegacyIndex() {
  if (_legacyIndex) return _legacyIndex;
  _legacyIndex = new Map();
  try {
    for (const f of Object.values(CLASS_FEATURES)) {
      if (f.legacyAbilityKey) _legacyIndex.set(f.legacyAbilityKey, f.id);
    }
  } catch (err) {
    console.warn(`${MODULE_ID} | legacy ability index unavailable`, err);
  }
  return _legacyIndex;
}

/** Does the actor own the real class/profession feat backing this legacy key? */
function _actorHasClassFeature(actor, abilityKey) {
  const featureId = _getLegacyIndex().get(abilityKey);
  if (!featureId) return false;
  return Array.from(actor?.items ?? [])
    .some(item => item.getFlag(MODULE_ID, "abilityId") === featureId);
}

export function getResolvedAbility(actor, abilityKey, { tokenDocument } = {}) {
  const definition = ABILITY_DEFINITIONS[abilityKey];
  if (!definition) return { enabled: false, source: "unknown" };

  const resolvedToken = _resolveTokenDocument(actor, tokenDocument);

  // A real class/profession feature outranks every manual flag — but an explicit
  // token or actor override still wins, so the GM can switch it off situationally.
  const hasFeature = _actorHasClassFeature(actor, abilityKey);

  const tokenValue = getTokenAbilityFlags(resolvedToken)[abilityKey];
  if ((tokenValue === true) || (tokenValue === false)) {
    return { enabled: tokenValue, source: "token", tokenDocument: resolvedToken };
  }

  const actorValue = getActorAbilityFlags(actor)[abilityKey];
  if ((actorValue === true) || (actorValue === false)) {
    return { enabled: actorValue, source: "actor", tokenDocument: resolvedToken };
  }

  if (hasFeature) {
    return { enabled: true, source: "feature", tokenDocument: resolvedToken };
  }

  const itemFallback = _actorHasNamedAbilityItem(actor, definition.aliases ?? []);
  return { enabled: itemFallback, source: itemFallback ? "item" : "none", tokenDocument: resolvedToken };
}

export function hasAbility(actor, abilityKey, { tokenDocument } = {}) {
  return getResolvedAbility(actor, abilityKey, { tokenDocument }).enabled === true;
}

export async function setActorAbility(actor, abilityKey, value) {
  if (!actor || !ABILITY_DEFINITIONS[abilityKey]) return false;

  const current = { ...getActorAbilityFlags(actor) };
  if (value == null) delete current[abilityKey];
  else current[abilityKey] = value === true;

  return _setAbilityFlags(actor, current);
}

export async function setTokenAbilityOverride(tokenDocument, abilityKey, value) {
  if (!tokenDocument?.setFlag || !ABILITY_DEFINITIONS[abilityKey]) return false;

  const current = { ...getTokenAbilityFlags(tokenDocument) };
  if (value == null) delete current[abilityKey];
  else current[abilityKey] = value === true;

  return _setAbilityFlags(tokenDocument, current);
}

export async function clearTokenAbilityOverride(tokenDocument, abilityKey) {
  return setTokenAbilityOverride(tokenDocument, abilityKey, null);
}

function onRenderActorSheet(app, html) {
  const actor = app.document ?? app.actor;
  if (!_supportsAbilityPrototype(actor)) return;

  const root = html instanceof HTMLElement ? html
    : html?.[0] instanceof HTMLElement ? html[0]
    : html?.element instanceof HTMLElement ? html.element
    : null;
  if (!root || root.querySelector(".neuro-abilities-prototype-panel")) return;

  const tokenDocument = _resolveTokenDocument(actor);
  const anchor = root.querySelector("section[data-tab='details'], .tab[data-tab='details']")
    ?? root.querySelector("form")
    ?? root;
  if (!anchor) return;

  const panel = document.createElement("div");
  panel.className = "neuro-abilities-prototype-panel";
  panel.innerHTML = _buildAbilityPanelHtml(actor, tokenDocument);

  panel.querySelectorAll(".neuro-actor-ability-select").forEach(select => {
    select.addEventListener("change", async event => {
      const abilityKey = event.currentTarget.dataset.abilityKey;
      const value = _parseAbilitySelectValue(event.currentTarget.value);
      await setActorAbility(actor, abilityKey, value);
      app.render(true);
    });
  });

  panel.querySelectorAll(".neuro-token-ability-select").forEach(select => {
    select.addEventListener("change", async event => {
      const abilityKey = event.currentTarget.dataset.abilityKey;
      const value = _parseAbilitySelectValue(event.currentTarget.value);
      await setTokenAbilityOverride(tokenDocument, abilityKey, value);
      app.render(true);
    });
  });

  anchor.prepend(panel);
}

function _buildAbilityPanelHtml(actor, tokenDocument) {
  const actorFlags = getActorAbilityFlags(actor);
  const tokenFlags = getTokenAbilityFlags(tokenDocument);
  const rows = Object.entries(ABILITY_DEFINITIONS).map(([abilityKey, definition]) => {
    const resolved = getResolvedAbility(actor, abilityKey, { tokenDocument });
    const stateLabel = resolved.enabled ? "Aktywna" : "Nieaktywna";
    const sourceLabel = _formatAbilitySource(resolved.source);
    const actorValue = _formatAbilitySelectValue(actorFlags[abilityKey]);
    const tokenValue = _formatAbilitySelectValue(tokenFlags[abilityKey]);
    return `
      <div data-ability-key="${abilityKey}" style="padding:8px 0;border-top:1px solid rgba(85,98,112,0.25);">
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;">
          <div>
            <strong>${definition.label}</strong>
            <div style="font-size:12px;opacity:0.82;">${definition.description}</div>
          </div>
          <span style="font-size:11px;padding:2px 8px;border-radius:999px;border:1px solid ${resolved.enabled ? "#1f4a6a" : "#6b7280"};background:${resolved.enabled ? "rgba(31,74,106,0.12)" : "rgba(107,114,128,0.10)"};">${stateLabel} (${sourceLabel})</span>
        </div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;align-items:center;">
          <label style="display:flex;gap:6px;align-items:center;font-size:12px;">
            <span>Aktor</span>
            <select class="neuro-actor-ability-select" data-ability-key="${abilityKey}">
              ${_buildSelectOptions(actorValue, false)}
            </select>
          </label>
          ${tokenDocument ? `
            <label style="display:flex;gap:6px;align-items:center;font-size:12px;">
              <span>Pionek</span>
              <select class="neuro-token-ability-select" data-ability-key="${abilityKey}">
                ${_buildSelectOptions(tokenValue, true)}
              </select>
            </label>
          ` : `<span style="font-size:12px;opacity:0.76;">Nadpisanie pionka pojawi się na karcie pionka otwartej ze sceny.</span>`}
        </div>
      </div>
    `;
  }).join("");

  return `
    <div style="margin:8px 0;padding:10px;border:1px solid #556270;background:rgba(45,55,72,0.06);border-radius:6px;">
      <details>
        <summary style="cursor:pointer;display:flex;align-items:center;gap:8px;">
          <strong>Prototyp: zdolności aktora / pionka</strong>
          <span style="font-size:11px;padding:2px 6px;border-radius:999px;border:1px solid #7a5a00;background:rgba(122,90,0,0.13);">prototyp</span>
        </summary>
        <div style="margin-top:8px;font-size:12px;opacity:0.82;">Warstwa prototypowa do sterowania zdolnościami wpływającymi na broń. W pierwszej kolejności zasila zdolność Wychuchana spluwa.</div>
        ${rows}
      </details>
    </div>
  `;
}

function _buildSelectOptions(selectedValue, includeTokenInherit) {
  const inheritLabel = includeTokenInherit ? "Dziedzicz po aktorze" : "Auto / z itemów";
  return [
    `<option value="inherit" ${selectedValue === "inherit" ? "selected" : ""}>${inheritLabel}</option>`,
    `<option value="enabled" ${selectedValue === "enabled" ? "selected" : ""}>Włącz</option>`,
    `<option value="disabled" ${selectedValue === "disabled" ? "selected" : ""}>Wyłącz</option>`
  ].join("");
}

function _formatAbilitySource(source) {
  switch (source) {
    case "token": return "pionek";
    case "actor": return "aktor";
    case "feature": return "zdolność klasowa";
    case "item": return "item";
    default: return "brak";
  }
}

function _formatAbilitySelectValue(value) {
  if (value === true) return "enabled";
  if (value === false) return "disabled";
  return "inherit";
}

function _parseAbilitySelectValue(value) {
  if (value === "enabled") return true;
  if (value === "disabled") return false;
  return null;
}

function _resolveTokenDocument(actor, tokenDocument) {
  return tokenDocument?.document
    ?? tokenDocument
    ?? actor?.token?.document
    ?? actor?.token
    ?? actor?.getActiveTokens?.()?.[0]?.document
    ?? null;
}

function _actorHasNamedAbilityItem(actor, aliases) {
  return Array.from(actor?.items ?? []).some(item => {
    const normalized = _normalizeName(item.name);
    return aliases.some(alias => normalized.includes(alias));
  });
}

function _normalizeName(value) {
  return String(value ?? "").trim().toLowerCase();
}

async function _setAbilityFlags(document, abilities) {
  const normalized = Object.fromEntries(Object.entries(abilities ?? {}).filter(([, value]) => (value === true) || (value === false)));
  if (Object.keys(normalized).length > 0) return document.setFlag(MODULE_ID, ABILITIES_FLAG, normalized);
  return document.unsetFlag(MODULE_ID, ABILITIES_FLAG);
}

function _supportsAbilityPrototype(actor) {
  return !!actor?.items;
}
