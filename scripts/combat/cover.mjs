const MODULE_ID = "neuroshima-2026-overrides";
const LAST_ATTACK_COVER_FLAG = "lastAttackCover";
const ATTACK_PATCH_FLAG = Symbol("neuro-cover-attack-patched");
const TRIGGER_PATCH_FLAG = Symbol("neuro-cover-trigger-patched");
const DAMAGE_PATCH_FLAG = Symbol("neuro-cover-damage-patched");
const DAMAGE_CONFIG_PATCH_FLAG = Symbol("neuro-cover-damage-config-patched");
const DIALOG_PATCH_FLAG = Symbol("neuro-cover-dialog-patched");
const DAMAGE_DIALOG_PATCH_FLAG = Symbol("neuro-cover-damage-dialog-patched");

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
  _registerTargetsTrayEnrichment();

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

/**
 * Hook into dnd5e.renderChatMessage to enrich the Targets tray of attack rolls:
 * - Appends a cover badge showing the selected cover option.
 * - Corrects the displayed AC and hit/miss indicator when a cover AC bonus applies.
 */
function _registerTargetsTrayEnrichment() {
  Hooks.on("dnd5e.renderChatMessage", (message, html) => {
    if (message.getFlag("dnd5e", "roll")?.type !== "attack") return;

    const attackRoll = message.rolls?.[0];
    const neuroCover = attackRoll?.options?.neuroCover;
    if (!neuroCover || neuroCover.selection === "none") return;

    const targetRows = html.querySelectorAll(".targets-tray li.target");
    if (!targetRows.length) return;

    // Build display label for the cover selection
    const cvSelection = COVER_SELECTIONS[neuroCover.selection];
    const isThroughShot = cvSelection?.shotMode === COVER_SHOT_MODES.through.key;
    const coverMainLabel = cvSelection?.label ?? neuroCover.selection;
    let coverSubLabel = "";
    if (isThroughShot && neuroCover.penetrationLevel > 0) {
      const pen = COVER_PENETRATION_LEVELS[neuroCover.penetrationLevel];
      if (pen) coverSubLabel = `Redukcja ${pen.reduction}`;
    }

    // Adjusted AC stored in roll options — set by our _buildConfig patch
    const adjustedAc = attackRoll.options.target;
    const visibility = game.settings.get("dnd5e", "attackRollVisibility");
    const canSeeAc = game.user.isGM || visibility === "all";

    for (const row of targetRows) {
      // Fix AC value and hit/miss indicator when an AC bonus was applied
      if (canSeeAc && Number.isFinite(adjustedAc)) {
        const acSpan = row.querySelector(".ac span");
        if (acSpan) {
          const rawAc = parseInt(acSpan.textContent.trim());
          if (Number.isFinite(rawAc) && adjustedAc !== rawAc) {
            acSpan.textContent = adjustedAc;
            // Recalculate hit/miss using the cover-adjusted AC
            const isMiss = !attackRoll.isCritical
              && ((attackRoll.total < adjustedAc) || attackRoll.isFumble);
            row.classList.toggle("hit", !isMiss);
            row.classList.toggle("miss", isMiss);
            row.dataset.miss = String(isMiss);
            const icon = row.querySelector("i.fas");
            if (icon) {
              icon.classList.toggle("fa-check", !isMiss);
              icon.classList.toggle("fa-times", isMiss);
            }
          }
        }
      }

      // Append cover badge
      const badge = document.createElement("div");
      badge.classList.add("neuro-cover-badge");
      badge.innerHTML = `
        <i class="fas fa-shield-halved" inert></i>
        <div class="neuro-cover-badge-text">
          <span>${_escapeHtml(coverMainLabel)}</span>
          ${coverSubLabel ? `<span>${_escapeHtml(coverSubLabel)}</span>` : ""}
        </div>
      `;
      row.appendChild(badge);
    }
  });
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
  const damageReduction = usesThroughCover && penetrationLevel.level > 0
    ? penetrationLevel.reduction : 0;

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

  // --- Patch AttackRollConfigurationDialog — inject cover fields into the attack config dialog ---
  _patchAttackConfigDialog();

  // --- Patch DamageRollConfigurationDialog — inject editable cover reduction field ---
  _patchDamageConfigDialog();

  // --- Patch _triggerSubsequentActions() — await rollAttack and delete card on cancel ---
  if (!BaseAttackActivity.prototype._triggerSubsequentActions?.[TRIGGER_PATCH_FLAG]) {
    BaseAttackActivity.prototype._triggerSubsequentActions = async function(config, results) {
      const messageId = results.message?.id;
      const rolls = await this.rollAttack(
        { event: config.event },
        {},
        { data: { "flags.dnd5e.originatingMessage": messageId } }
      );
      const cancelled = !rolls || (Array.isArray(rolls) && rolls.length === 0);
      if (cancelled && messageId) {
        const msg = game.messages?.get(messageId);
        if (msg?.isOwner) await msg.delete();
      }
    };
    BaseAttackActivity.prototype._triggerSubsequentActions[TRIGGER_PATCH_FLAG] = true;
  }

  // --- Patch rollAttack() — inject cover context into dialog options, build decision from result ---
  if (!BaseAttackActivity.prototype.rollAttack?.[ATTACK_PATCH_FLAG]) {
    const originalRollAttack = BaseAttackActivity.prototype.rollAttack;
    BaseAttackActivity.prototype.rollAttack = async function(config = {}, dialog = {}, message = {}) {
      const targetContext = _getSingleAttackTargetContext(this);
      if (!targetContext) {
        await _clearLastAttackCoverDecision(this.item, this.id);
        return originalRollAttack.call(this, config, dialog, message);
      }

      // Pass cover context into the dialog options so fields appear inside the attack config dialog
      const coverContext = {
        baseAc: targetContext.baseAc,
        targetName: targetContext.token?.name ?? "cel",
        allowThrough: _isFirearmItem(this.item)
      };
      const nextDialog = foundry.utils.mergeObject(
        foundry.utils.deepClone(dialog),
        { options: { neuroCoverContext: coverContext } },
        { inplace: false }
      );

      const rolls = await originalRollAttack.call(this, config, nextDialog, message);

      if (!rolls || (Array.isArray(rolls) && rolls.length === 0)) {
        // Cancelled or blocked by full cover (handled in _finalizeRolls)
        return rolls;
      }

      // Build full decision from roll options written by _buildConfig in the dialog
      const neuroCoverRaw = rolls[0]?.options?.neuroCover;
      if (!neuroCoverRaw) return rolls;

      const cvSelection = _resolveCoverSelection(neuroCoverRaw.selection, coverContext.allowThrough);
      const exposure = COVER_EXPOSURES[cvSelection.exposure] ?? COVER_EXPOSURES.none;
      const shotMode = cvSelection.shotMode;
      const penetrationKey = String(neuroCoverRaw.penetrationLevel ?? 0);
      const penetrationLevel = COVER_PENETRATION_LEVELS[penetrationKey] ?? COVER_PENETRATION_LEVELS[0];
      const usesThroughCover = shotMode === COVER_SHOT_MODES.through.key;
      const damageReduction = usesThroughCover && penetrationLevel.level > 0
        ? penetrationLevel.reduction : 0;

      const decision = {
        attackerName: this.actor?.name ?? "Atakujący",
        targetName: coverContext.targetName,
        attackLabel: _getAttackLabel(this),
        exposure,
        shotMode,
        penetrationLevel,
        damageReduction,
        adjustedAcBonus: usesThroughCover ? 0 : exposure.acBonus,
        adjustedDexSaveBonus: usesThroughCover ? 0 : exposure.dexSaveBonus,
        blocksAttack: false,
        applyDamageReduction: damageReduction > 0,
        allowThrough: coverContext.allowThrough,
        summary: ""
      };
      decision.summary = describeCoverDecision(decision);

      // Add cover summary to the attack roll chat message flavor retroactively
      // (rolls[0].parent is set to the ChatMessage by buildPost)
      const effectiveAC = rolls[0]?.options?.target;
      const summaryWithAC = _buildCoverSummaryWithAC(decision, effectiveAC);
      if (summaryWithAC) {
        const attackMsg = rolls[0]?.parent;
        if (attackMsg?.isOwner) {
          const newFlavor = _mergeFlavor(attackMsg.flavor, summaryWithAC);
          await attackMsg.update({ flavor: newFlavor });
        }
      }

      // Write to the real embedded item, not the clone that use() operates on.
      const realItem = this.actor?.items.get(this.item.id) ?? this.item;
      if (realItem && this.id) {
        await _setLastAttackCoverDecision(realItem, this.id, decision);
      }

      return rolls;
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

      primaryRoll.options ??= {};
      primaryRoll.options.neuroCoverOriginalParts = [...primaryRoll.parts];
      primaryRoll.options.neuroCoverReduction = decision.damageReduction;
      primaryRoll.options.neuroCoverSummary = decision.summary;
      if (decision.damageReduction > 0) {
        primaryRoll.parts = [`max(0, (${primaryRoll.parts.join(" + ")}) - ${decision.damageReduction})`];
      }
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
      // Pass damage reduction to dialog so MG can correct it before rolling
      const nextDialog = (decision?.damageReduction != null)
        ? foundry.utils.mergeObject(
            foundry.utils.deepClone(dialog),
            { options: { neuroCoverDamageReduction: decision.damageReduction } },
            { inplace: false }
          )
        : dialog;
      return originalRollDamage.call(this, config, nextDialog, nextMessage);
    };
    BaseAttackActivity.prototype.rollDamage[DAMAGE_PATCH_FLAG] = true;
  }
}

/**
 * Patch AttackRollConfigurationDialog to inject cover selection fields directly
 * into the main attack configuration dialog (instead of a separate popup).
 * Called once during registerAttackCoverIntegration().
 */
function _patchAttackConfigDialog() {
  const AttackDialog = dnd5e?.applications?.dice?.AttackRollConfigurationDialog;
  const D20Dialog = dnd5e?.applications?.dice?.D20RollConfigurationDialog;
  if (!AttackDialog || !D20Dialog) {
    console.warn("Neuroshima 5e | Could not find AttackRollConfigurationDialog — cover integration skipped");
    return;
  }
  if (AttackDialog.prototype[DIALOG_PATCH_FLAG]) return;
  AttackDialog.prototype[DIALOG_PATCH_FLAG] = true;

  // 1. Add cover selection (and optional penetration level) fields to the dialog
  const origPrepareCfg = AttackDialog.prototype._prepareConfigurationContext;
  AttackDialog.prototype._prepareConfigurationContext = async function(context, options) {
    context = await origPrepareCfg.call(this, context, options);
    const coverCtx = this.options.neuroCoverContext;
    if (!coverCtx) return context;

    // Pełna osłona nie jest dostępna jako wybór — cel jest niewidoczny, gracz anuluje rzut lub wybiera przebicie.
    const coverOptions = Object.values(COVER_SELECTIONS)
      .filter(o => o.key !== "full")
      .filter(o => coverCtx.allowThrough || o.key !== "through")
      .map(o => ({ value: o.key, label: o.label }));

    const coverField = {
      field: new foundry.data.fields.StringField({ label: "Osłona celu", blank: false, required: true }),
      name: "neuroCoverSelection",
      options: coverOptions,
      value: "none"
    };

    context.fields = [coverField, ...context.fields];

    if (coverCtx.allowThrough) {
      const penOptions = Object.values(COVER_PENETRATION_LEVELS)
        .map(o => ({ value: String(o.level), label: `${o.label} (${o.reduction})` }));
      const penField = {
        field: new foundry.data.fields.StringField({
          label: "Poziom osłony (przez osłonę)", blank: false, required: true
        }),
        name: "neuroPenetrationLevel",
        options: penOptions,
        value: "0"
      };
      context.fields.splice(1, 0, penField);
    }

    return context;
  };

  // 2. Read cover from formData, apply AC bonus, flag blocked attacks on the roll config
  const origBuildCfg = AttackDialog.prototype._buildConfig;
  AttackDialog.prototype._buildConfig = function(config, formData, index) {
    config = origBuildCfg.call(this, config, formData, index);
    const coverCtx = this.options.neuroCoverContext;
    if (!coverCtx || !formData || index !== 0) return config;

    const selKey = formData.get("neuroCoverSelection") ?? "none";
    const penLevel = Number(formData.get("neuroPenetrationLevel") ?? 0);

    config.options ??= {};
    config.options.neuroCover = { selection: selKey, penetrationLevel: penLevel };

    const cvSelection = _resolveCoverSelection(selKey, coverCtx.allowThrough);
    const exposure = COVER_EXPOSURES[cvSelection.exposure] ?? COVER_EXPOSURES.none;
    const isThroughShot = cvSelection.shotMode === COVER_SHOT_MODES.through.key;
    const acBonus = isThroughShot ? 0 : exposure.acBonus;

    if (Number.isFinite(coverCtx.baseAc) && acBonus > 0) {
      config.options.target = coverCtx.baseAc + acBonus;
    }

    return config;
  };

  // 3. Show/hide penetration level row depending on cover selection value
  const origOnRender = AttackDialog.prototype._onRender;
  AttackDialog.prototype._onRender = async function(context, options) {
    if (origOnRender) await origOnRender.call(this, context, options);
    if (!this.options.neuroCoverContext?.allowThrough) return;

    const form = this.element?.querySelector("form");
    if (!form || form.dataset.neuroCoverInit) return;

    const coverSelect = form.querySelector("[name='neuroCoverSelection']");
    const penSelect = form.querySelector("[name='neuroPenetrationLevel']");
    if (!coverSelect || !penSelect) return;

    const penGroup = penSelect.closest(".form-group");
    if (!penGroup) return;

    const updateVisibility = () => {
      penGroup.style.display = coverSelect.value === "through" ? "" : "none";
    };
    updateVisibility();
    coverSelect.addEventListener("change", updateVisibility);
    form.dataset.neuroCoverInit = "1";
  };
}

/**
 * Patch DamageRollConfigurationDialog to inject an editable "Redukcja osłony" number field.
 * Default value comes from the cover decision's damageReduction (passed via dialog.options).
 * MG can override it before rolling.
 */
function _patchDamageConfigDialog() {
  const DamageDialog = dnd5e?.applications?.dice?.DamageRollConfigurationDialog;
  if (!DamageDialog) {
    console.warn("Neuroshima 5e | Could not find DamageRollConfigurationDialog — damage reduction field skipped");
    return;
  }
  if (DamageDialog.prototype[DAMAGE_DIALOG_PATCH_FLAG]) return;
  DamageDialog.prototype[DAMAGE_DIALOG_PATCH_FLAG] = true;

  // 1. Inject "Redukcja osłony" field into configuration section
  const origPrepareCfg = DamageDialog.prototype._prepareConfigurationContext;
  DamageDialog.prototype._prepareConfigurationContext = async function(context, options) {
    context = await origPrepareCfg.call(this, context, options);
    const defaultReduction = this.options.neuroCoverDamageReduction;
    if (defaultReduction == null) return context;

    context.fields = [
      ...context.fields,
      {
        field: new foundry.data.fields.NumberField({
          label: "Redukcja osłony",
          min: 0,
          step: 1,
          nullable: false,
          initial: 0,
          integer: true
        }),
        name: "neuroCoverReduction",
        value: defaultReduction
      }
    ];
    return context;
  };

  // 2. Apply the reduction from the field to the roll formula
  const origBuildCfg = DamageDialog.prototype._buildConfig;
  DamageDialog.prototype._buildConfig = function(config, formData, index) {
    config = origBuildCfg.call(this, config, formData, index);
    if (index !== 0) return config;

    const originalParts = config.options?.neuroCoverOriginalParts;
    if (!originalParts) return config;

    const reduction = Number(formData?.get("neuroCoverReduction") ?? config.options?.neuroCoverReduction ?? 0);
    if (reduction > 0) {
      config.parts = [`max(0, (${originalParts.join(" + ")}) - ${reduction})`];
    } else {
      config.parts = [...originalParts];
    }
    return config;
  };
}

function _buildCoverSummaryWithAC(decision, effectiveAC) {
  if (!decision.summary && effectiveAC == null) return "";
  const parts = [];
  if (decision.summary) parts.push(decision.summary);
  if (effectiveAC != null) parts.push(`KP ${effectiveAC}`);
  return parts.join(", ");
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