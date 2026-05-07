const MODULE_ID = "neuroshima-2026-overrides";
const LAST_ATTACK_COVER_FLAG = "lastAttackCover";
const ATTACK_PATCH_FLAG = Symbol("neuro-cover-attack-patched");
const DAMAGE_PATCH_FLAG = Symbol("neuro-cover-damage-patched");
const DAMAGE_CONFIG_PATCH_FLAG = Symbol("neuro-cover-damage-config-patched");

export const COVER_EXPOSURES = Object.freeze({
  none: {
    key: "none",
    label: "Brak osłony",
    acBonus: 0,
    dexSaveBonus: 0,
    blocksAround: false
  },
  half: {
    key: "half",
    label: "Pół osłony",
    acBonus: 2,
    dexSaveBonus: 2,
    blocksAround: false
  },
  threeQuarters: {
    key: "threeQuarters",
    label: "3/4 osłony",
    acBonus: 5,
    dexSaveBonus: 5,
    blocksAround: false
  },
  full: {
    key: "full",
    label: "Pełna osłona",
    acBonus: 999,
    dexSaveBonus: 999,
    blocksAround: true
  }
});

export const COVER_PENETRATION_LEVELS = Object.freeze({
  0: { level: 0, label: "Brak / nie dotyczy", reduction: 0 },
  1: { level: 1, label: "Poziom 1", reduction: 5 },
  2: { level: 2, label: "Poziom 2", reduction: 10 },
  3: { level: 3, label: "Poziom 3", reduction: 15 },
  4: { level: 4, label: "Poziom 4", reduction: 20 },
  5: { level: 5, label: "Poziom 5", reduction: 40 }
});

export const COVER_SHOT_MODES = Object.freeze({
  around: { key: "around", label: "Wokół osłony" },
  through: { key: "through", label: "Przez osłonę" }
});

const COVER_SELECTIONS = Object.freeze({
  none: { key: "none", label: "Brak osłony", exposure: "none", shotMode: "around" },
  half: { key: "half", label: "Pół osłony", exposure: "half", shotMode: "around" },
  threeQuarters: { key: "threeQuarters", label: "3/4 osłony", exposure: "threeQuarters", shotMode: "around" },
  full: { key: "full", label: "Pełna osłona", exposure: "full", shotMode: "around" },
  through: { key: "through", label: "Przebijanie osłony", exposure: "none", shotMode: "through" }
});

export function registerCoverSystem() {
  registerAttackCoverIntegration();

  const mod = game.modules.get(MODULE_ID);
  if (mod) {
    mod.api ??= {};
    mod.api.cover = {
      COVER_EXPOSURES,
      COVER_PENETRATION_LEVELS,
      COVER_SHOT_MODES,
      describeCoverDecision,
      getLastAttackCoverDecision,
      promptCoverDecision
    };
  }

  console.log("Neuroshima 5e | Dynamic cover system registered");
}

export function describeCoverDecision(decision, { includeReduction = true } = {}) {
  if (!decision) return "";

  const parts = [];
  if (decision.shotMode === COVER_SHOT_MODES.through.key) {
    parts.push(COVER_SELECTIONS.through.label);
    if (decision.penetrationLevel?.level > 0) {
      let reductionLabel = decision.penetrationLevel.label;
      if (includeReduction && decision.damageReduction > 0) {
        reductionLabel += `, redukcja ${decision.damageReduction}`;
      }
      parts.push(reductionLabel);
    }
  }

  if ((decision.shotMode !== COVER_SHOT_MODES.through.key) && (decision.exposure?.key !== COVER_EXPOSURES.none.key)) {
    parts.push(decision.exposure.label);
  }

  return parts.join("; ");
}

export function getLastAttackCoverDecision(item, activityId) {
  if (!item || !activityId) return null;
  const allSelections = item.getFlag(MODULE_ID, LAST_ATTACK_COVER_FLAG) ?? {};
  return allSelections[activityId] ?? null;
}

export async function promptCoverDecision({
  activity = null,
  attacker = null,
  attackerName = "Atakujący",
  target = null,
  targetName = "Cel",
  attackLabel = "atakiem dystansowym",
  allowThrough = false,
  title = "Osłona celu"
} = {}) {
  const resolvedAttacker = attacker?.name ?? attackerName;
  const resolvedTarget = target?.name ?? targetName;
  const content = _buildDialogContent({
    attackerName: resolvedAttacker,
    targetName: resolvedTarget,
    attackLabel,
    allowThrough
  });
  const formData = await _showCoverDialog({ title, content });
  if (!formData) return null;

  const selection = _resolveCoverSelection(formData.coverSelection, allowThrough);
  const exposure = COVER_EXPOSURES[selection.exposure] ?? COVER_EXPOSURES.none;
  const shotMode = selection.shotMode;
  const penetrationKey = String(formData.penetrationLevel ?? 0);
  const penetrationLevel = COVER_PENETRATION_LEVELS[penetrationKey] ?? COVER_PENETRATION_LEVELS[0];
  const usesThroughCover = shotMode === COVER_SHOT_MODES.through.key;
  const damageReduction = (usesThroughCover && (exposure.key !== COVER_EXPOSURES.none.key))
    ? penetrationLevel.reduction
    : 0;

  const decision = {
    attackerName: resolvedAttacker,
    targetName: resolvedTarget,
    attackLabel,
    exposure,
    shotMode,
    penetrationLevel,
    damageReduction,
    adjustedAcBonus: usesThroughCover ? 0 : exposure.acBonus,
    adjustedDexSaveBonus: usesThroughCover ? 0 : exposure.dexSaveBonus,
    blocksAttack: !usesThroughCover && exposure.blocksAround,
    applyDamageReduction: damageReduction > 0,
    allowThrough,
    summary: ""
  };

  decision.summary = describeCoverDecision(decision);

  if (activity?.item && activity?.id) {
    await _setLastAttackCoverDecision(activity.item, activity.id, decision);
  }

  return decision;
}

function registerAttackCoverIntegration() {
  const BaseAttackActivity = CONFIG.DND5E.activityTypes.attack?.documentClass;
  if (!BaseAttackActivity) return;

  if (!BaseAttackActivity.prototype.rollAttack?.[ATTACK_PATCH_FLAG]) {
    const originalRollAttack = BaseAttackActivity.prototype.rollAttack;
    BaseAttackActivity.prototype.rollAttack = async function(config = {}, dialog = {}, message = {}) {
      const targetContext = _getSingleAttackTargetContext(this);
      if (!targetContext) {
        await _clearLastAttackCoverDecision(this.item, this.id);
        return originalRollAttack.call(this, config, dialog, message);
      }

      const decision = await promptCoverDecision({
        activity: this,
        attacker: this.actor,
        target: targetContext.token,
        attackLabel: _getAttackLabel(this),
        allowThrough: _isFirearmItem(this.item)
      });
      if (!decision) return null;
      if (decision.blocksAttack) {
        ui.notifications.warn(`${targetContext.token.name}: pełna osłona blokuje strzał prowadzony wokół osłony.`);
        return null;
      }

      const nextConfig = foundry.utils.deepClone(config);
      if (Number.isFinite(targetContext.baseAc) && decision.adjustedAcBonus > 0) {
        nextConfig.target = targetContext.baseAc + decision.adjustedAcBonus;
      }

      const nextMessage = decision.summary
        ? foundry.utils.mergeObject(foundry.utils.deepClone(message), {
          data: {
            flavor: _mergeFlavor(message?.data?.flavor, decision.summary)
          }
        }, { inplace: false })
        : message;
      return originalRollAttack.call(this, nextConfig, dialog, nextMessage);
    };
    BaseAttackActivity.prototype.rollAttack[ATTACK_PATCH_FLAG] = true;
  }

  if (!BaseAttackActivity.prototype.getDamageConfig?.[DAMAGE_CONFIG_PATCH_FLAG]) {
    const originalGetDamageConfig = BaseAttackActivity.prototype.getDamageConfig;
    BaseAttackActivity.prototype.getDamageConfig = function(config = {}) {
      const rollConfig = originalGetDamageConfig.call(this, config);
      const decision = getLastAttackCoverDecision(this.item, this.id);
      if (!decision?.applyDamageReduction) return rollConfig;

      const primaryRoll = rollConfig.rolls?.[0];
      if (!primaryRoll?.parts?.length) return rollConfig;

      primaryRoll.parts = [`max(0, (${primaryRoll.parts.join(" + ")}) - ${decision.damageReduction})`];
      primaryRoll.options ??= {};
      primaryRoll.options.neuroCoverReduction = decision.damageReduction;
      primaryRoll.options.neuroCoverSummary = decision.summary;
      return rollConfig;
    };
    BaseAttackActivity.prototype.getDamageConfig[DAMAGE_CONFIG_PATCH_FLAG] = true;
  }

  if (!BaseAttackActivity.prototype.rollDamage?.[DAMAGE_PATCH_FLAG]) {
    const originalRollDamage = BaseAttackActivity.prototype.rollDamage;
    BaseAttackActivity.prototype.rollDamage = async function(config = {}, dialog = {}, message = {}) {
      const decision = getLastAttackCoverDecision(this.item, this.id);
      const nextMessage = decision?.summary
        ? foundry.utils.mergeObject(foundry.utils.deepClone(message), {
          data: {
            flavor: _mergeFlavor(message?.data?.flavor, decision.summary)
          }
        }, { inplace: false })
        : message;
      return originalRollDamage.call(this, config, dialog, nextMessage);
    };
    BaseAttackActivity.prototype.rollDamage[DAMAGE_PATCH_FLAG] = true;
  }
}

async function _setLastAttackCoverDecision(item, activityId, decision) {
  if (!item || !activityId) return;
  const selections = foundry.utils.deepClone(item.getFlag(MODULE_ID, LAST_ATTACK_COVER_FLAG) ?? {});
  selections[activityId] = decision;
  await item.setFlag(MODULE_ID, LAST_ATTACK_COVER_FLAG, selections);
}

async function _clearLastAttackCoverDecision(item, activityId) {
  if (!item || !activityId) return;
  const selections = foundry.utils.deepClone(item.getFlag(MODULE_ID, LAST_ATTACK_COVER_FLAG) ?? {});
  if (!(activityId in selections)) return;
  delete selections[activityId];
  if (foundry.utils.isEmpty(selections)) await item.unsetFlag(MODULE_ID, LAST_ATTACK_COVER_FLAG);
  else await item.setFlag(MODULE_ID, LAST_ATTACK_COVER_FLAG, selections);
}

function _getSingleAttackTargetContext(activity) {
  if (!_isRangedAttackActivity(activity)) return null;
  const targets = Array.from(game.user.targets ?? []);
  if (targets.length !== 1) return null;

  const token = targets[0];
  const actor = token.actor;
  const currentAc = actor?.system?.attributes?.ac?.value;
  const nativeCover = actor?.coverBonus ?? 0;
  const baseAc = Number.isFinite(currentAc) ? currentAc - nativeCover : null;

  return { token, baseAc };
}

function _isRangedAttackActivity(activity) {
  const item = activity?.item;
  if (!item || item.type !== "weapon") return false;
  if (_isFirearmItem(item)) return true;

  const range = activity.range ?? item.system.range ?? {};
  return Number.isFinite(Number(range?.value)) || Number.isFinite(Number(range?.long));
}

function _isFirearmItem(item) {
  return item?.system?.type?.value?.startsWith?.("palna") ?? false;
}

function _getAttackLabel(activity) {
  if (activity?.type === "neuroKs") return "strzałem z krótkiej serii";
  const activityName = activity?.name?.trim();
  if (activityName) {
    const normalizedName = activityName.charAt(0).toLowerCase() + activityName.slice(1);
    return `strzałem z ${normalizedName}`;
  }
  return "atakiem dystansowym";
}

function _buildDialogContent({ attackerName, targetName, attackLabel, allowThrough }) {
  const options = Object.values(COVER_SELECTIONS)
    .filter(option => allowThrough || (option.key !== COVER_SELECTIONS.through.key))
    .map(option => `<option value="${option.key}">${option.label}</option>`)
    .join("");

  return `
    <form class="neuro-cover-dialog">
      <p><strong>${_escapeHtml(attackerName)}</strong> atakuje <strong>${_escapeHtml(targetName)}</strong> ${_escapeHtml(attackLabel)}.</p>
      <p>Ile osłony ma ${_escapeHtml(targetName)} względem tego konkretnego ataku?</p>
      <div class="form-group">
        <label for="neuro-cover-selection">Osłona względem ataku</label>
        <select id="neuro-cover-selection" name="coverSelection" onchange="const row=this.form.querySelector('[data-penetration-row]'); if (row) row.style.display = this.value === 'through' ? '' : 'none';">
          ${options}
        </select>
      </div>
      ${allowThrough ? `
        <div class="form-group" data-penetration-row style="display:none;">
          <label for="neuro-cover-penetration">Poziom osłony dla strzału przez</label>
          <select id="neuro-cover-penetration" name="penetrationLevel">
            ${Object.values(COVER_PENETRATION_LEVELS).map(option => `<option value="${option.level}">${option.label} (${option.reduction})</option>`).join("")}
          </select>
        </div>
      ` : ""}
    </form>
  `;
}

async function _showCoverDialog({ title, content }) {
  return new Promise(resolve => {
    let settled = false;
    const finish = value => {
      if (settled) return;
      settled = true;
      resolve(value);
    };

    new Dialog({
      title,
      content,
      buttons: {
        confirm: {
          label: "Zatwierdź",
          callback: html => finish(_readDialogSelection(html?.[0] ?? html))
        },
        cancel: {
          label: "Anuluj",
          callback: () => finish(null)
        }
      },
      default: "confirm",
      close: () => finish(null)
    }).render(true);
  });
}

function _readDialogSelection(root) {
  if (!(root instanceof HTMLElement)) return null;

  return {
    coverSelection: root.querySelector('[name="coverSelection"]')?.value ?? COVER_SELECTIONS.none.key,
    penetrationLevel: Number(root.querySelector('[name="penetrationLevel"]')?.value ?? 0)
  };
}

function _resolveCoverSelection(selectionKey, allowThrough) {
  if (allowThrough && (selectionKey === COVER_SELECTIONS.through.key)) return COVER_SELECTIONS.through;
  return COVER_SELECTIONS[selectionKey] ?? COVER_SELECTIONS.none;
}

function _mergeFlavor(currentFlavor, summary) {
  if (!summary) return currentFlavor;
  const baseFlavor = currentFlavor ?? "";
  return baseFlavor ? `${baseFlavor} (${summary})` : summary;
}

function _escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}