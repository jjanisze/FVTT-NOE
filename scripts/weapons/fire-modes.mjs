import { getMag, spendRounds } from "./magazine.mjs";
import { isDamaged, isJammed, rollJamCheck } from "./jams.mjs";
import { playWeaponSound, WeaponSound } from "./sounds.mjs";
import { describeCoverDecision, promptCoverDecision } from "../combat/cover.mjs";
import { ABILITY_KEYS, buildAbilityRuleChangeNotice, hasAbility } from "../actors/abilities.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const KS_ACTIVITY_TYPE = "neuroKs";
const DS_ACTIVITY_TYPE = "neuroDs";
const MS_ACTIVITY_TYPE = "neuroMs";
const OZ_ACTIVITY_TYPE = "neuroOz";
const KS_FIRE_MODE = "ks";
const DS_FIRE_MODE = "ds";
const MS_FIRE_MODE = "ms";
const OZ_FIRE_MODE = "oz";
const BURST_STATE_FLAG = "lastBurstUse";
const BURST_TEMPLATE_FLAG = "burstTemplate";
const SUPPRESSIVE_FIRE_FLAG = "suppressiveFire";
const SUPPRESSIVE_FIRE_USE_FLAG = "lastSuppressiveFireUse";
const SUPPRESSIVE_ZONE_FLAG = "suppressiveZone";
const KS_BULLET_COST = 3;
const OZ_BULLET_COST = 6;
const DS_THRESHOLDS = Object.freeze([
  { bullets: 10, multiplier: 2 },
  { bullets: 15, multiplier: 3 },
  { bullets: 20, multiplier: 4 },
  { bullets: 25, multiplier: 5 },
  { bullets: 30, multiplier: 6 }
]);
const MS_THRESHOLDS = Object.freeze([
  { bullets: 50, multiplier: 5 },
  { bullets: 100, multiplier: 10 },
  { bullets: 150, multiplier: 15 },
  { bullets: 200, multiplier: 20 }
]);
const OZ_SHAPES = Object.freeze([
  { key: "square", label: "Strefa 3 m x 3 m", size: "3", width: "3" },
  { key: "line", label: "Linia 6 m x 1,5 m", size: "6", width: "1.5" }
]);
const syncingItems = new Set();
let suppressiveHooksRegistered = false;

export function registerFireModes() {
  registerShortBurstActivityType();
  registerLongBurstActivityType();
  registerCrushingBurstActivityType();
  registerSuppressiveFireActivityType();
  registerSuppressiveFireHooks();

  Hooks.on("createItem", item => {
    void syncWeaponFireModes(item);
  });

  Hooks.on("updateItem", item => {
    void syncWeaponFireModes(item);
  });

  Hooks.once("ready", () => {
    void syncAllWeaponFireModes();
  });

  console.log("Neuroshima 5e | Fire mode sync registered");
}

function registerShortBurstActivityType() {
  if (CONFIG.DND5E.activityTypes[KS_ACTIVITY_TYPE]) return;

  const BaseAttackActivity = CONFIG.DND5E.activityTypes.attack?.documentClass;
  if (!BaseAttackActivity) {
    console.warn("Neuroshima 5e | Could not register KS activity: missing base attack activity");
    return;
  }

  class NeuroShortBurstActivity extends BaseAttackActivity {
    static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
      type: KS_ACTIVITY_TYPE,
      title: "Krótka seria",
      hint: "Neuroshima: 3 naboje, atak z utrudnieniem, raz na rundę. Grad ołowiu pozwala wykonać kolejną KS w tej samej rundzie; limit ataków pilnuje gracz lub MG."
    }, { inplace: false }));

    async use(usage = {}, dialog = {}, message = {}) {
      const liveItem = _getLiveItem(this.item);
      if (!_canUseBurstMode(liveItem, KS_FIRE_MODE, KS_BULLET_COST)) return;
      const nextMessage = foundry.utils.mergeObject({
        data: {
          flavor: _getShortBurstLabel(this.item)
        }
      }, foundry.utils.deepClone(message), { inplace: false });
      return super.use(usage, dialog, nextMessage);
    }

    async rollAttack(config = {}, dialog = {}, message = {}) {
      const defaultAdvantageMode = _hasAssaulter(this.item)
        ? CONFIG.Dice.D20Roll.ADV_MODE.NORMAL
        : CONFIG.Dice.D20Roll.ADV_MODE.DISADVANTAGE;
      const defaultButton = _hasAssaulter(this.item) ? "normal" : "disadvantage";
      const firstRoll = foundry.utils.deepClone(config.rolls?.[0] ?? {});
      const forcedFirstRoll = foundry.utils.mergeObject(firstRoll, {
        options: {
          advantageMode: defaultAdvantageMode
        }
      }, { inplace: false });

      const nextConfig = foundry.utils.mergeObject(
        foundry.utils.deepClone(config),
        _hasAssaulter(this.item)
          ? { rolls: [forcedFirstRoll, ...(config.rolls?.slice(1) ?? [])] }
          : { disadvantage: true, rolls: [forcedFirstRoll, ...(config.rolls?.slice(1) ?? [])] },
        { inplace: false }
      );

      const nextDialog = foundry.utils.mergeObject({
        options: {
          defaultButton
        }
      }, foundry.utils.deepClone(dialog), { inplace: false });

      const nextMessage = foundry.utils.mergeObject({
        data: {
          flavor: `${_getShortBurstLabel(this.item)} - ${game.i18n.localize("DND5E.AttackRoll")}`
        }
      }, foundry.utils.deepClone(message), { inplace: false });

      return super.rollAttack(nextConfig, nextDialog, nextMessage);
    }

    async rollDamage(config = {}, dialog = {}, message = {}) {
      const nextMessage = foundry.utils.mergeObject({
        data: {
          flavor: `${_getShortBurstLabel(this.item)} - ${game.i18n.localize("DND5E.DamageRoll")}`
        }
      }, foundry.utils.deepClone(message), { inplace: false });

      return super.rollDamage(config, dialog, nextMessage);
    }

    async _triggerSubsequentActions(config, results) {
      const liveItem = _getLiveItem(this.item);
      const spent = await spendRounds(liveItem, KS_BULLET_COST);
      if (!spent) return;

      await _markBurstModeUsed(liveItem, KS_FIRE_MODE, KS_BULLET_COST);
      playWeaponSound(WeaponSound.BURST_SHORT);
      await _announceLeadHailUse(liveItem, results);
      await super._triggerSubsequentActions(config, results);
    }

    _processDamagePart(damage, rollConfig, rollData, index = 0) {
      return _buildNoModifierDamageRoll(this.item, this.id, damage, rollConfig, rollData, index);
    }
  }

  CONFIG.DND5E.activityTypes[KS_ACTIVITY_TYPE] = {
    documentClass: NeuroShortBurstActivity
  };
}

function registerLongBurstActivityType() {
  if (CONFIG.DND5E.activityTypes[DS_ACTIVITY_TYPE]) return;

  const BaseSaveActivity = CONFIG.DND5E.activityTypes.save?.documentClass;
  if (!BaseSaveActivity) {
    console.warn("Neuroshima 5e | Could not register DS activity: missing base save activity");
    return;
  }

  class NeuroLongBurstActivity extends BaseSaveActivity {
    static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
      type: DS_ACTIVITY_TYPE,
      title: "Długa seria",
      hint: "Neuroshima: 10-30 naboi, linia 1,5 m x 36 m, RO Zręczność, raz na rundę.",
      usage: {
        actions: {
          rollSave(event, target, message) {
            return NeuroLongBurstActivity.rollSaveWithCover.call(this, event, target, message);
          }
        }
      }
    }, { inplace: false }));

    static async rollSaveWithCover(event, target, message) {
      let targets = canvas.tokens?.controlled.filter(token => token.actor) ?? [];
      if (!targets.length && game.user.character) targets = game.user.character.getActiveTokens();
      if (!targets.length) {
        ui.notifications.warn("DND5E.ActionWarningNoToken", { localize: true });
        return;
      }

      const dc = parseInt(target.dataset.dc);
      const ability = target.dataset.ability ?? this.save.ability.first();
      for (const token of targets) {
        const actor = token instanceof Actor ? token : token.actor;
        const speaker = ChatMessage.getSpeaker({ actor, scene: canvas.scene, token: token.document });
        const coverDecision = await promptCoverDecision({
          attacker: this.actor,
          target: token,
          attackLabel: "strzałem z długiej serii",
          allowThrough: _isFirearmWeapon(this.item)
        });
        if (!coverDecision) return;

        if (coverDecision.blocksAttack) {
          await ChatMessage.create({
            speaker,
            content: `<div><strong>${token.name}</strong> unika obrażeń dzięki pełnej osłonie przy strzale prowadzonym wokół osłony.</div>`
          });
          continue;
        }

        const adjustedDc = Number.isFinite(dc)
          ? Math.max(0, dc - coverDecision.adjustedDexSaveBonus)
          : _resolveActivitySaveDc(this);
        const coverSummary = describeCoverDecision(coverDecision);

        await actor.rollSavingThrow({
          event,
          ability,
          target: adjustedDc
        }, {}, {
          data: {
            flavor: coverSummary ? `Długa seria (${coverSummary})` : "Długa seria",
            speaker
          }
        });

        if (coverDecision.applyDamageReduction) {
          await ChatMessage.create({
            speaker,
            content: `<div><strong>${token.name}</strong>: strzał przez osłonę. Zastosuj ręcznie redukcję obrażeń ${coverDecision.damageReduction}.</div>`
          });
        }
      }
    }

    _usageChatButtons(message) {
      return _localizeSaveButtons(this, super._usageChatButtons(message));
    }

    async use(usage = {}, dialog = {}, message = {}) {
      const liveItem = _getLiveItem(this.item);
      if (!_canUseBurstMode(liveItem, DS_FIRE_MODE, _getLongBurstMinimumBullets(liveItem))) return;

      const selection = await _promptLongBurstSelection(liveItem);
      if (!selection) return;
      if (!(await spendRounds(liveItem, selection.bullets))) return;
      await _markBurstModeUsed(liveItem, DS_FIRE_MODE, selection.bullets);

      if (!this.item.isEmbedded || this.item.pack) return;
      if (!this.item.isOwner) {
        ui.notifications.error("DND5E.DocumentUseWarn", { localize: true });
        return;
      }
      if (!this.canUse) {
        ui.notifications.error("DND5E.ACTIVITY.Warning.UsageNotAllowed", { localize: true });
        return;
      }

      let item = this.item.clone({}, { keepId: true });
      let activity = item.system.activities.get(this.id);
      _configureLongBurstActivity(activity, selection);

      const usageConfig = activity._prepareUsageConfig(foundry.utils.deepClone(usage));
      const dialogConfig = foundry.utils.mergeObject({
        configure: true,
        applicationClass: activity.metadata.usage.dialog
      }, dialog);
      const messageConfig = foundry.utils.mergeObject({
        create: true,
        data: {
          flavor: _getLongBurstLabel(this.item, selection),
          flags: {
            dnd5e: activity.messageFlags
          },
          system: {
            effects: activity.applicableEffects?.map(effect => `.ActiveEffect.${effect.id}`)
          }
        },
        hasConsumption: usageConfig.hasConsumption
      }, foundry.utils.deepClone(message), { inplace: false });

      if (Hooks.call("dnd5e.preUseActivity", activity, usageConfig, dialogConfig, messageConfig) === false) return;

      if (dialogConfig.configure && activity._requiresConfigurationDialog(usageConfig)) {
        try {
          await dialogConfig.applicationClass.create(activity, usageConfig, dialogConfig.options);
        } catch (_error) {
          return;
        }
      }

      await activity._prepareUsageScaling(usageConfig, messageConfig, item);
      activity = item.system.activities.get(this.id);
      activity.save.dc.value = _resolveActivitySaveDc(activity);

      const updates = await activity.consume(usageConfig, messageConfig);
      if (updates === false) return;
      const results = { effects: [], templates: [], updates };

      if (usageConfig.concentration?.begin) {
        const effect = await item.actor.beginConcentrating(activity, { "flags.dnd5e.scaling": usageConfig.scaling });
        if (effect) {
          results.effects ??= [];
          results.effects.push(effect);
          foundry.utils.setProperty(messageConfig.data, "system.concentration", effect.id);
        }
        if (usageConfig.concentration?.end) {
          const deleted = await item.actor.endConcentration(usageConfig.concentration.end);
          results.effects.push(...deleted);
        }
      }

      activity._finalizeMessageConfig(usageConfig, messageConfig, results);
      results.message = await activity._createUsageMessage(messageConfig);
      await activity._finalizeUsage(usageConfig, results);
      await rollJamCheck(liveItem, { label: _getLongBurstLabel(liveItem, selection), chat: true });
      playWeaponSound(WeaponSound.BURST_LONG);
      await _announceMobileHmgNestUse(liveItem, selection, results);

      if (Hooks.call("dnd5e.postUseActivity", activity, usageConfig, results) === false) return results;
      if (usageConfig.subsequentActions !== false) {
        const deltas = results.message?.system?.deltas ?? results.message?.data?.system?.deltas;
        const consumed = this.createConsumedFlag(this.actor, deltas);
        if (consumed) item.updateSource({ "flags.dnd5e.consumed": consumed });
        activity._triggerSubsequentActions(usageConfig, results);
      }

      return results;
    }

    async rollDamage(config = {}, dialog = {}, message = {}) {
      const selection = _getLongBurstSelection(this);
      const nextMessage = foundry.utils.mergeObject({
        data: {
          flavor: `${_getLongBurstLabel(this.item, selection)} - ${game.i18n.localize("DND5E.DamageRoll")}`
        }
      }, foundry.utils.deepClone(message), { inplace: false });

      return super.rollDamage(config, dialog, nextMessage);
    }

    _processDamagePart(damage, rollConfig, rollData, index = 0) {
      return _buildNoModifierDamageRoll(this.item, this.id, damage, rollConfig, rollData, index);
    }
  }

  CONFIG.DND5E.activityTypes[DS_ACTIVITY_TYPE] = {
    documentClass: NeuroLongBurstActivity
  };
}

function registerSuppressiveFireActivityType() {
  if (CONFIG.DND5E.activityTypes[OZ_ACTIVITY_TYPE]) return;

  const BaseSaveActivity = CONFIG.DND5E.activityTypes.save?.documentClass;
  if (!BaseSaveActivity) {
    console.warn("Neuroshima 5e | Could not register OZ activity: missing base save activity");
    return;
  }

  class NeuroSuppressiveFireActivity extends BaseSaveActivity {
    static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
      type: OZ_ACTIVITY_TYPE,
      title: "Ogień zaporowy",
      hint: "Neuroshima: 6 naboi, linia lub strefa, RO Mądrość, blokada Akcji i BA.",
      usage: {
        actions: {
          rollSave(event, target, message) {
            return NeuroSuppressiveFireActivity.rollSaveWithCover.call(this, event, target, message);
          }
        }
      }
    }, { inplace: false }));

    static async rollSaveWithCover(event, target, message) {
      let targets = canvas.tokens?.controlled.filter(token => token.actor) ?? [];
      if (!targets.length && game.user.character) targets = game.user.character.getActiveTokens();
      if (!targets.length) {
        ui.notifications.warn("DND5E.ActionWarningNoToken", { localize: true });
        return;
      }

      const dc = parseInt(target.dataset.dc);
      const zoneData = _buildSuppressiveZoneData(this.item, { dc: Number.isFinite(dc) ? dc : _resolveActivitySaveDc(this) });
      for (const token of targets) {
        await _resolveSuppressiveFireSave(token, zoneData, { event, fromChat: true });
      }
    }

    _usageChatButtons(message) {
      return _localizeSaveButtons(this, super._usageChatButtons(message));
    }

    async use(usage = {}, dialog = {}, message = {}) {
      const liveItem = _getLiveItem(this.item);
      if (!_canUseSuppressiveFire(liveItem)) return;

      const selection = await _promptSuppressiveFireSelection(liveItem);
      if (!selection) return;
      if (!(await spendRounds(liveItem, OZ_BULLET_COST))) return;
      await _markSuppressiveFireUsed(liveItem);

      const jamResult = await rollJamCheck(liveItem, { label: _getSuppressiveFireLabel(liveItem, selection), chat: true });
      if (jamResult?.jammed) return;
      playWeaponSound(WeaponSound.SUPPRESSIVE);

      if (!this.item.isEmbedded || this.item.pack) return;
      if (!this.item.isOwner) {
        ui.notifications.error("DND5E.DocumentUseWarn", { localize: true });
        return;
      }
      if (!this.canUse) {
        ui.notifications.error("DND5E.ACTIVITY.Warning.UsageNotAllowed", { localize: true });
        return;
      }

      let item = this.item.clone({}, { keepId: true });
      let activity = item.system.activities.get(this.id);
      _configureSuppressiveFireActivity(activity, selection);

      const usageConfig = activity._prepareUsageConfig(foundry.utils.deepClone(usage));
      const dialogConfig = foundry.utils.mergeObject({
        configure: true,
        applicationClass: activity.metadata.usage.dialog
      }, dialog);
      const messageConfig = foundry.utils.mergeObject({
        create: true,
        data: {
          flavor: _getSuppressiveFireLabel(this.item, selection),
          flags: {
            dnd5e: activity.messageFlags
          },
          system: {
            effects: activity.applicableEffects?.map(effect => `.ActiveEffect.${effect.id}`)
          }
        },
        hasConsumption: usageConfig.hasConsumption
      }, foundry.utils.deepClone(message), { inplace: false });

      if (Hooks.call("dnd5e.preUseActivity", activity, usageConfig, dialogConfig, messageConfig) === false) return;

      if (dialogConfig.configure && activity._requiresConfigurationDialog(usageConfig)) {
        try {
          await dialogConfig.applicationClass.create(activity, usageConfig, dialogConfig.options);
        } catch (_error) {
          return;
        }
      }

      await activity._prepareUsageScaling(usageConfig, messageConfig, item);
      activity = item.system.activities.get(this.id);
      activity.save.dc.value = _resolveActivitySaveDc(activity);

      const updates = await activity.consume(usageConfig, messageConfig);
      if (updates === false) return;
      const results = { effects: [], templates: [], updates };

      activity._finalizeMessageConfig(usageConfig, messageConfig, results);
      results.message = await activity._createUsageMessage(messageConfig);
      await activity._finalizeUsage(usageConfig, results);
      await _flagSuppressiveFireTemplates(results.templates, _buildSuppressiveZoneData(liveItem, {
        dc: _getSuppressiveFireDc(liveItem),
        selection
      }));

      if (Hooks.call("dnd5e.postUseActivity", activity, usageConfig, results) === false) return results;
      return results;
    }
  }

  CONFIG.DND5E.activityTypes[OZ_ACTIVITY_TYPE] = {
    documentClass: NeuroSuppressiveFireActivity
  };
}

function registerCrushingBurstActivityType() {
  if (CONFIG.DND5E.activityTypes[MS_ACTIVITY_TYPE]) return;

  const BaseSaveActivity = CONFIG.DND5E.activityTypes.save?.documentClass;
  if (!BaseSaveActivity) {
    console.warn("Neuroshima 5e | Could not register MS activity: missing base save activity");
    return;
  }

  class NeuroCrushingBurstActivity extends BaseSaveActivity {
    static metadata = Object.freeze(foundry.utils.mergeObject(super.metadata, {
      type: MS_ACTIVITY_TYPE,
      title: "Miażdżąca seria",
      hint: "Neuroshima: 50-200 naboi, linia 3 m x 150 m, RO Zręczność i Siła ST 15, raz na rundę.",
      usage: {
        actions: {
          rollSave(event, target, message) {
            return NeuroCrushingBurstActivity.rollSaveWithCover.call(this, event, target, message);
          }
        }
      }
    }, { inplace: false }));

    static async rollSaveWithCover(event, target, message) {
      let targets = canvas.tokens?.controlled.filter(token => token.actor) ?? [];
      if (!targets.length && game.user.character) targets = game.user.character.getActiveTokens();
      if (!targets.length) {
        ui.notifications.warn("DND5E.ActionWarningNoToken", { localize: true });
        return;
      }

      const dc = parseInt(target.dataset.dc);
      const baseDc = Number.isFinite(dc) ? dc : _resolveActivitySaveDc(this);
      for (const token of targets) {
        const actor = token instanceof Actor ? token : token.actor;
        const tokenDocument = token.document ?? token;
        const speaker = ChatMessage.getSpeaker({ actor, scene: canvas.scene, token: tokenDocument });
        const coverDecision = await promptCoverDecision({
          attacker: this.actor,
          target: token,
          attackLabel: "strzałem z miażdżącej serii",
          allowThrough: _isFirearmWeapon(this.item)
        });
        if (!coverDecision) return;

        if (coverDecision.blocksAttack) {
          await ChatMessage.create({
            speaker,
            content: `<div><strong>${token.name}</strong> unika obrażeń dzięki pełnej osłonie przy strzale prowadzonym wokół osłony.</div>`
          });
          continue;
        }

        const adjustedDexDc = Math.max(0, baseDc - coverDecision.adjustedDexSaveBonus);
        const coverSummary = describeCoverDecision(coverDecision);

        await actor.rollSavingThrow({
          event,
          ability: "dex",
          target: adjustedDexDc
        }, {}, {
          data: {
            flavor: coverSummary ? `Miażdżąca seria - obrażenia (${coverSummary})` : "Miażdżąca seria - obrażenia",
            speaker
          }
        });

        const strengthRolls = await actor.rollSavingThrow({
          event,
          ability: "str",
          target: baseDc
        }, {}, {
          data: {
            flavor: "Miażdżąca seria - uniknięcie obalenia",
            speaker
          }
        });
        const strengthRoll = strengthRolls?.[0];
        const avoidsKnockdown = (strengthRoll?.total ?? 0) >= baseDc;

        if (!avoidsKnockdown) {
          await _applyProneFromCrushingBurst(actor, tokenDocument);
          await ChatMessage.create({
            speaker,
            content: `<div><strong>${token.name}</strong> zostaje obalony przez miażdżącą serię.</div>`
          });
        }

        if (coverDecision.applyDamageReduction) {
          await ChatMessage.create({
            speaker,
            content: `<div><strong>${token.name}</strong>: strzał przez osłonę. Zastosuj ręcznie redukcję obrażeń ${coverDecision.damageReduction}.</div>`
          });
        }
      }
    }

    _usageChatButtons(message) {
      return _localizeMultiSaveButtons(this, super._usageChatButtons(message), {
        visibleLabel: dc => `ST ${dc} - Zręczność / Siła`,
        hiddenLabel: "Rzuty obronne - Zręczność / Siła"
      });
    }

    async use(usage = {}, dialog = {}, message = {}) {
      const liveItem = _getLiveItem(this.item);
      if (!_canUseBurstMode(liveItem, MS_FIRE_MODE, MS_THRESHOLDS[0].bullets)) return;

      const selection = await _promptCrushingBurstSelection(liveItem);
      if (!selection) return;
      if (!(await spendRounds(liveItem, selection.bullets))) return;
      await _markBurstModeUsed(liveItem, MS_FIRE_MODE, selection.bullets);

      if (!this.item.isEmbedded || this.item.pack) return;
      if (!this.item.isOwner) {
        ui.notifications.error("DND5E.DocumentUseWarn", { localize: true });
        return;
      }
      if (!this.canUse) {
        ui.notifications.error("DND5E.ACTIVITY.Warning.UsageNotAllowed", { localize: true });
        return;
      }

      let item = this.item.clone({}, { keepId: true });
      let activity = item.system.activities.get(this.id);
      _configureCrushingBurstActivity(activity, selection);

      const usageConfig = activity._prepareUsageConfig(foundry.utils.deepClone(usage));
      const dialogConfig = foundry.utils.mergeObject({
        configure: true,
        applicationClass: activity.metadata.usage.dialog
      }, dialog);
      const messageConfig = foundry.utils.mergeObject({
        create: true,
        data: {
          flavor: _getCrushingBurstLabel(this.item, selection),
          flags: {
            dnd5e: activity.messageFlags
          },
          system: {
            effects: activity.applicableEffects?.map(effect => `.ActiveEffect.${effect.id}`)
          }
        },
        hasConsumption: usageConfig.hasConsumption
      }, foundry.utils.deepClone(message), { inplace: false });

      if (Hooks.call("dnd5e.preUseActivity", activity, usageConfig, dialogConfig, messageConfig) === false) return;

      if (dialogConfig.configure && activity._requiresConfigurationDialog(usageConfig)) {
        try {
          await dialogConfig.applicationClass.create(activity, usageConfig, dialogConfig.options);
        } catch (_error) {
          return;
        }
      }

      await activity._prepareUsageScaling(usageConfig, messageConfig, item);
      activity = item.system.activities.get(this.id);
      activity.save.dc.value = _resolveActivitySaveDc(activity);

      const updates = await activity.consume(usageConfig, messageConfig);
      if (updates === false) return;
      const results = { effects: [], templates: [], updates };

      if (usageConfig.concentration?.begin) {
        const effect = await item.actor.beginConcentrating(activity, { "flags.dnd5e.scaling": usageConfig.scaling });
        if (effect) {
          results.effects ??= [];
          results.effects.push(effect);
          foundry.utils.setProperty(messageConfig.data, "system.concentration", effect.id);
        }
        if (usageConfig.concentration?.end) {
          const deleted = await item.actor.endConcentration(usageConfig.concentration.end);
          results.effects.push(...deleted);
        }
      }

      activity._finalizeMessageConfig(usageConfig, messageConfig, results);
      results.message = await activity._createUsageMessage(messageConfig);
      await activity._finalizeUsage(usageConfig, results);
      await rollJamCheck(liveItem, { label: _getCrushingBurstLabel(liveItem, selection), chat: true });
      playWeaponSound(WeaponSound.BURST_CRUSHING);

      if (Hooks.call("dnd5e.postUseActivity", activity, usageConfig, results) === false) return results;
      if (usageConfig.subsequentActions !== false) {
        const deltas = results.message?.system?.deltas ?? results.message?.data?.system?.deltas;
        const consumed = this.createConsumedFlag(this.actor, deltas);
        if (consumed) item.updateSource({ "flags.dnd5e.consumed": consumed });
        activity._triggerSubsequentActions(usageConfig, results);
      }

      return results;
    }

    async rollDamage(config = {}, dialog = {}, message = {}) {
      const selection = _getCrushingBurstSelection(this);
      const nextMessage = foundry.utils.mergeObject({
        data: {
          flavor: `${_getCrushingBurstLabel(this.item, selection)} - ${game.i18n.localize("DND5E.DamageRoll")}`
        }
      }, foundry.utils.deepClone(message), { inplace: false });

      return super.rollDamage(config, dialog, nextMessage);
    }

    _processDamagePart(damage, rollConfig, rollData, index = 0) {
      return _buildNoModifierDamageRoll(this.item, this.id, damage, rollConfig, rollData, index);
    }
  }

  CONFIG.DND5E.activityTypes[MS_ACTIVITY_TYPE] = {
    documentClass: NeuroCrushingBurstActivity
  };
}

function registerSuppressiveFireHooks() {
  if (suppressiveHooksRegistered) return;
  suppressiveHooksRegistered = true;

  Hooks.on("dnd5e.preCreateActivityTemplate", onPreCreateBurstTemplate);
  Hooks.on("dnd5e.preCreateActivityTemplate", onPreCreateSuppressiveFireTemplate);
  Hooks.on("dnd5e.preUseActivity", onPreUseSuppressiveFireEffect);
  Hooks.on("updateCombat", combat => {
    void onUpdateCombatSuppressiveFire(combat);
  });
  Hooks.on("deleteCombat", combat => {
    void onDeleteCombatSuppressiveFire(combat);
  });
  Hooks.on("updateToken", (tokenDocument, changed) => {
    void onUpdateTokenSuppressiveFire(tokenDocument, changed);
  });
}

async function syncAllWeaponFireModes() {
  const items = [
    ...Array.from(game.items ?? []),
    ...Array.from(game.actors ?? []).flatMap(actor => Array.from(actor.items ?? []))
  ];

  for (const item of items) {
    await syncWeaponFireModes(item);
  }
}

async function syncWeaponFireModes(item) {
  if (!_shouldManageItem(item)) return;
  if (syncingItems.has(item.uuid)) return;

  syncingItems.add(item.uuid);
  try {
    await syncBaseAttackActivityName(item);
    await syncShortBurstActivity(item);
    await syncLongBurstActivity(item);
    await syncCrushingBurstActivity(item);
    await syncSuppressiveFireActivity(item);
  } finally {
    syncingItems.delete(item.uuid);
  }
}

async function syncBaseAttackActivityName(item) {
  const LABEL = "Ogień pojedynczy";
  for (const activity of item.system.activities ?? []) {
    if (activity.type !== "attack") continue;
    if (_getActivityModuleFlag(activity, "managedActivity")) continue;
    if (activity.name === LABEL) continue;
    await item.updateActivity(activity.id, { name: LABEL });
  }
}

async function syncShortBurstActivity(item) {
  const managed = _findManagedActivity(item, KS_FIRE_MODE);
  const hasMode = _hasProperty(item, "tryb_ks");

  if (!hasMode) {
    if (managed) await item.deleteActivity(managed.id);
    return;
  }

  const data = _buildShortBurstActivityData(item);
  if (!data) return;

  if (!managed) {
    await item.createActivity(KS_ACTIVITY_TYPE, data, { renderSheet: false });
    return;
  }

  await item.updateActivity(managed.id, {
    name: data.name,
    activation: data.activation,
    attack: data.attack,
    damage: data.damage,
    description: data.description,
    range: data.range,
    target: data.target,
    flags: data.flags
  });
}

async function syncLongBurstActivity(item) {
  const managed = _findManagedActivity(item, DS_FIRE_MODE);
  const hasMode = _hasProperty(item, "tryb_ds");

  if (!hasMode) {
    if (managed) await item.deleteActivity(managed.id);
    return;
  }

  const data = _buildLongBurstActivityData(item);
  if (!data) return;

  if (!managed) {
    await item.createActivity(DS_ACTIVITY_TYPE, data, { renderSheet: false });
    return;
  }

  await item.updateActivity(managed.id, {
    name: data.name,
    activation: data.activation,
    damage: data.damage,
    description: data.description,
    range: data.range,
    save: data.save,
    target: data.target,
    flags: data.flags
  });
}

async function syncSuppressiveFireActivity(item) {
  const managed = _findManagedActivity(item, OZ_FIRE_MODE);
  const hasMode = _hasProperty(item, "tryb_oz");

  if (!hasMode) {
    if (managed) await item.deleteActivity(managed.id);
    return;
  }

  const data = _buildSuppressiveFireActivityData(item);
  if (!data) return;

  if (!managed) {
    await item.createActivity(OZ_ACTIVITY_TYPE, data, { renderSheet: false });
    return;
  }

  await item.updateActivity(managed.id, {
    name: data.name,
    activation: data.activation,
    description: data.description,
    range: data.range,
    save: data.save,
    target: data.target,
    flags: data.flags
  });
}

async function syncCrushingBurstActivity(item) {
  const managed = _findManagedActivity(item, MS_FIRE_MODE);
  const hasMode = _hasProperty(item, "tryb_ms");

  if (!hasMode) {
    if (managed) await item.deleteActivity(managed.id);
    return;
  }

  const data = _buildCrushingBurstActivityData(item);
  if (!data) return;

  if (!managed) {
    await item.createActivity(MS_ACTIVITY_TYPE, data, { renderSheet: false });
    return;
  }

  await item.updateActivity(managed.id, {
    name: data.name,
    activation: data.activation,
    damage: data.damage,
    description: data.description,
    range: data.range,
    save: data.save,
    target: data.target,
    flags: data.flags
  });
}

function _buildShortBurstActivityData(item) {
  const baseAttack = _findReferenceAttackActivity(item);
  if (!baseAttack) return null;

  const source = foundry.utils.deepClone(baseAttack.toObject());
  delete source._id;
  delete source._stats;

  source.type = KS_ACTIVITY_TYPE;
  source.name = "Krótka seria";
  source.description ??= {};
  source.description.chatFlavor = _getShortBurstSummary();
  source.damage ??= {};
  source.damage.includeBase = false;
  source.damage.parts = [_buildBurstDamagePart(item, KS_BULLET_COST)];
  source.flags ??= {};
  source.flags[MODULE_ID] = {
    ...(source.flags[MODULE_ID] ?? {}),
    managedActivity: true,
    fireMode: KS_FIRE_MODE
  };

  return source;
}

function _buildLongBurstActivityData(item) {
  const baseAttack = _findReferenceAttackActivity(item);
  if (!baseAttack) return null;

  const source = foundry.utils.deepClone(baseAttack.toObject());
  delete source._id;
  delete source._stats;
  delete source.attack;

  source.type = DS_ACTIVITY_TYPE;
  source.name = "Długa seria";
  source.description ??= {};
  source.description.chatFlavor = _getLongBurstSummary(DS_THRESHOLDS[0]);
  source.damage = {
    onSave: "half",
    parts: [_buildBurstDamagePart(item, DS_THRESHOLDS[0].multiplier)]
  };
  source.save = {
    ability: ["dex"],
    dc: {
      calculation: "",
      formula: "8 + @prof + @abilities.dex.mod"
    }
  };
  source.target = _getLongBurstTemplateData();
  source.flags ??= {};
  source.flags[MODULE_ID] = {
    ...(source.flags[MODULE_ID] ?? {}),
    managedActivity: true,
    fireMode: DS_FIRE_MODE,
    burstBullets: DS_THRESHOLDS[0].bullets,
    burstMultiplier: DS_THRESHOLDS[0].multiplier
  };

  return source;
}

function _buildSuppressiveFireActivityData(item) {
  const baseAttack = _findReferenceAttackActivity(item);
  if (!baseAttack) return null;

  const source = foundry.utils.deepClone(baseAttack.toObject());
  delete source._id;
  delete source._stats;
  delete source.attack;
  delete source.damage;

  source.type = OZ_ACTIVITY_TYPE;
  source.name = "Ogień zaporowy";
  source.description ??= {};
  source.description.chatFlavor = _getSuppressiveFireSummary(item, OZ_SHAPES[0]);
  source.save = {
    ability: ["wis"],
    dc: {
      calculation: "",
      formula: String(_getSuppressiveFireDc(item))
    }
  };
  source.target = _getSuppressiveFireTemplateData(OZ_SHAPES[0]);
  source.flags ??= {};
  source.flags[MODULE_ID] = {
    ...(source.flags[MODULE_ID] ?? {}),
    managedActivity: true,
    fireMode: OZ_FIRE_MODE,
    suppressiveShape: OZ_SHAPES[0].key
  };

  return source;
}

function _buildCrushingBurstActivityData(item) {
  const baseAttack = _findReferenceAttackActivity(item);
  if (!baseAttack) return null;

  const source = foundry.utils.deepClone(baseAttack.toObject());
  delete source._id;
  delete source._stats;
  delete source.attack;

  source.type = MS_ACTIVITY_TYPE;
  source.name = "Miażdżąca seria";
  source.description ??= {};
  source.description.chatFlavor = _getCrushingBurstSummary(MS_THRESHOLDS[0]);
  source.damage = {
    onSave: "half",
    parts: [_buildBurstDamagePart(item, MS_THRESHOLDS[0].multiplier)]
  };
  source.save = {
    ability: ["dex"],
    dc: {
      calculation: "",
      formula: "15"
    }
  };
  source.target = _getCrushingBurstTemplateData();
  source.flags ??= {};
  source.flags[MODULE_ID] = {
    ...(source.flags[MODULE_ID] ?? {}),
    managedActivity: true,
    fireMode: MS_FIRE_MODE,
    burstBullets: MS_THRESHOLDS[0].bullets,
    burstMultiplier: MS_THRESHOLDS[0].multiplier
  };

  return source;
}

function _buildBurstDamagePart(item, multiplier) {
  const baseDamage = item.system.damage?.base;
  const types = Array.from(baseDamage?.types ?? []);
  const part = {
    number: null,
    denomination: null,
    bonus: "",
    types,
    custom: {
      enabled: false,
      formula: ""
    },
    scaling: {
      mode: "",
      number: null,
      formula: ""
    }
  };

  if (Number.isFinite(baseDamage?.number) && Number.isFinite(baseDamage?.denomination)) {
    part.number = baseDamage.number * multiplier;
    part.denomination = baseDamage.denomination;
    return part;
  }

  if (baseDamage?.formula) {
    part.custom.enabled = true;
    part.custom.formula = Array.from({ length: multiplier }, () => baseDamage.formula).join(" + ");
  }

  return part;
}

function _buildNoModifierDamageRoll(item, activityId, damage, rollConfig, rollData, index = 0) {
  const scaledFormula = damage.scaledFormula(rollConfig.scaling ?? rollData.scaling);
  const parts = scaledFormula ? [scaledFormula] : [];
  const data = { ...rollData };
  const lastType = item.getFlag("dnd5e", `last.${activityId}.damageType.${index}`);

  return {
    data,
    parts,
    options: {
      type: (damage.types.has(lastType) ? lastType : null) ?? damage.types.first(),
      types: Array.from(damage.types),
      properties: Array.from(item.system.properties ?? [])
        .filter(property => CONFIG.DND5E.itemProperties[property]?.isPhysical)
    }
  };
}

function _findReferenceAttackActivity(item) {
  return Array.from(item.system.activities ?? []).find(activity => {
    if (activity.type !== "attack") return false;
    if (_getActivityModuleFlag(activity, "managedActivity")) return false;
    return true;
  }) ?? Array.from(item.system.activities ?? []).find(activity => activity.type === "attack") ?? null;
}

function _findManagedActivity(item, fireMode) {
  for (const activity of item.system.activities ?? []) {
    if (_getActivityModuleFlag(activity, "managedActivity") !== true) continue;
    if (_getActivityModuleFlag(activity, "fireMode") === fireMode) return activity;
  }
  return null;
}

function _shouldManageItem(item) {
  if (!item || item.type !== "weapon" || item.pack) return false;
  const isFirearm = item.system.type?.value?.startsWith?.("palna") ?? false;
  return isFirearm
    || !!_findManagedActivity(item, KS_FIRE_MODE)
    || !!_findManagedActivity(item, DS_FIRE_MODE)
    || !!_findManagedActivity(item, MS_FIRE_MODE)
    || !!_findManagedActivity(item, OZ_FIRE_MODE);
}

function _hasProperty(item, property) {
  const properties = item.system.properties;
  if (!properties) return false;
  if (typeof properties.has === "function") return properties.has(property);
  if (Array.isArray(properties)) return properties.includes(property);
  return false;
}

function _canUseBurstMode(item, mode, minBullets) {
  if (!item) return false;
  if (isDamaged(item)) {
    ui.notifications.warn(`${item.name}: broń jest uszkodzona i wymaga naprawy.`);
    return false;
  }
  if (isJammed(item)) {
    ui.notifications.warn(`${item.name}: broń jest zacięta.`);
    return false;
  }

  const mag = getMag(item);
  if (mag && mag.current < minBullets) {
    ui.notifications.warn(`${item.name}: potrzeba co najmniej ${minBullets} naboi.`);
    return false;
  }

  const combat = game.combat;
  if (!combat?.started) return true;

  const lastUse = item.getFlag(MODULE_ID, BURST_STATE_FLAG) ?? {};
  const sameCombat = lastUse.combatId === combat.id;
  const sameRound = lastUse.round === combat.round;
  if (sameCombat && sameRound && mode === KS_FIRE_MODE && lastUse.mode === KS_FIRE_MODE) {
    if (_hasLeadHail(item)) return true;
    ui.notifications.warn(`${item.name}: w tej rundzie wykorzystano już krótką serię.`);
    return false;
  }

  if (sameCombat && sameRound && [KS_FIRE_MODE, DS_FIRE_MODE, MS_FIRE_MODE].includes(lastUse.mode)) {
    ui.notifications.warn(`${item.name}: w tej rundzie wykorzystano już serię (${String(lastUse.mode).toUpperCase()}).`);
    return false;
  }

  return true;
}

async function _markBurstModeUsed(item, mode, bullets) {
  const current = item.getFlag(MODULE_ID, BURST_STATE_FLAG) ?? {};
  const stamp = _getCurrentRoundStamp();
  const sameRound = current.combatId === stamp.combatId && current.round === stamp.round && current.mode === mode;
  await item.setFlag(MODULE_ID, BURST_STATE_FLAG, {
    ...stamp,
    mode,
    bullets,
    uses: sameRound ? Math.max(Number(current.uses ?? 1), 1) + 1 : 1
  });
}

function _getCurrentRoundStamp() {
  const combat = game.combat;
  return {
    combatId: combat?.id ?? null,
    round: combat?.round ?? null
  };
}

function _getShortBurstLabel(item) {
  return `${item?.name ?? "Broń"} - Krótka seria (3 naboje)`;
}

function _getShortBurstSummary() {
  return "Atak krótką serią. Koszt: 3 naboje. Domyślnie: utrudnienie. Grad ołowiu znosi ograniczenie KS -> kolejna KS w tej samej rundzie; limit ataków pilnuje gracz lub MG.";
}

function _hasLeadHail(item) {
  return hasAbility(item?.actor, ABILITY_KEYS.GRAD_OLOWIU, { tokenDocument: _getItemToken(item) });
}

function _hasMobileHmgNest(item) {
  return hasAbility(item?.actor, ABILITY_KEYS.RUCHOME_GNIAZDO_CKM, { tokenDocument: _getItemToken(item) });
}

function _hasAssaulter(item) {
  return hasAbility(item?.actor, ABILITY_KEYS.SZTURMOWIEC, { tokenDocument: _getItemToken(item) });
}

async function _announceLeadHailUse(item, results) {
  if (!_hasLeadHail(item) || !results?.message) return;
  const usage = item.getFlag(MODULE_ID, BURST_STATE_FLAG) ?? {};
  const used = Math.max(Number(usage.uses ?? 1), 1);
  if (used < 2) return;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: item.actor }),
    content: buildAbilityRuleChangeNotice(ABILITY_KEYS.GRAD_OLOWIU, `Tratata! Kolejna krótka seria w tej samej rundzie jest dozwolona. Limit ataków w turze nadal pilnuje gracz lub MG.`, { standalone: true })
  });
}

async function _announceMobileHmgNestUse(item, selection, results) {
  if (!_hasMobileHmgNest(item) || !results?.message) return;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: item.actor }),
    content: buildAbilityRuleChangeNotice(ABILITY_KEYS.RUCHOME_GNIAZDO_CKM, `Chmura ołowiu: ta długa seria zużywa ${selection.bullets} naboi i zadaje ${selection.multiplier}x kości broni.`, { standalone: true })
  });
}

function _getItemToken(item) {
  return item?.actor?.token?.document ?? item?.actor?.token ?? item?.actor?.getActiveTokens?.()?.[0]?.document ?? null;
}

function _getLongBurstLabel(item, selection = DS_THRESHOLDS[0]) {
  return `${item?.name ?? "Broń"} - Długa seria (${selection.bullets} naboi)`;
}

function _getLongBurstSummary(selection) {
  return `Długa seria. Koszt: ${selection.bullets} naboi. Linia 1,5 m x 36 m. RO Zręczność ST 8 + PB + mod. Zręczności. Obrażenia: ${selection.multiplier}x kości broni.`;
}

function _getLongBurstMinimumBullets(item) {
  return _getLongBurstSelectionOption(item, DS_THRESHOLDS[0]).bullets;
}

function _getCrushingBurstLabel(item, selection = MS_THRESHOLDS[0]) {
  return `${item?.name ?? "Broń"} - Miażdżąca seria (${selection.bullets} naboi)`;
}

function _getCrushingBurstSummary(selection) {
  return `Miażdżąca seria. Koszt: ${selection.bullets} naboi. Linia 3 m x 150 m. RO Zręczność ST 15 = połowa obrażeń. RO Siła ST 15 = uniknięcie obalenia. Obrażenia: ${selection.multiplier}x kości broni.`;
}

function _isFirearmWeapon(item) {
  return item?.system?.type?.value?.startsWith?.("palna") ?? false;
}

function _resolveActivitySaveDc(activity) {
  const existing = Number(activity?.save?.dc?.value);
  if (Number.isFinite(existing)) return existing;

  const formula = activity?.save?.dc?.formula;
  if (formula) {
    try {
      const roll = Roll.create(String(formula), activity.getRollData({ deterministic: true }));
      const total = Number(roll.evaluateSync().total);
      if (Number.isFinite(total)) return total;
    } catch (_error) {
      // Fall back to the baseline below.
    }
  }

  const actor = activity?.actor;
  return 8 + Number(actor?.system?.attributes?.prof ?? 0);
}

function _localizeSaveButtons(activity, buttons) {
  const dc = _resolveActivitySaveDc(activity);
  return buttons.map(button => {
    if (button.dataset?.action !== "rollSave") return button;
    const abilityId = button.dataset?.ability ?? activity.save.ability.first();
    return {
      ...button,
      label: _getSaveButtonLabel(dc, abilityId),
      dataset: {
        ...button.dataset,
        dc
      }
    };
  });
}

function _localizeMultiSaveButtons(activity, buttons, { visibleLabel, hiddenLabel }) {
  const dc = _resolveActivitySaveDc(activity);
  return buttons.map(button => {
    if (button.dataset?.action !== "rollSave") return button;
    return {
      ...button,
      label: `
        <span class="visible-dc">${visibleLabel(dc)}</span>
        <span class="hidden-dc">${hiddenLabel}</span>
      `,
      dataset: {
        ...button.dataset,
        dc
      }
    };
  });
}

function _getSaveButtonLabel(dc, abilityId) {
  const abilityLabel = CONFIG.DND5E.abilities[abilityId]?.label ?? abilityId ?? "";
  return `
    <span class="visible-dc">ST ${dc} - ${abilityLabel}</span>
    <span class="hidden-dc">Rzut obronny - ${abilityLabel}</span>
  `;
}

function _getLongBurstSelection(activity) {
  return {
    bullets: _getActivityModuleFlag(activity, "burstBullets") ?? DS_THRESHOLDS[0].bullets,
    multiplier: _getActivityModuleFlag(activity, "burstMultiplier") ?? DS_THRESHOLDS[0].multiplier
  };
}

function _getCrushingBurstSelection(activity) {
  return {
    bullets: _getActivityModuleFlag(activity, "burstBullets") ?? MS_THRESHOLDS[0].bullets,
    multiplier: _getActivityModuleFlag(activity, "burstMultiplier") ?? MS_THRESHOLDS[0].multiplier
  };
}

function _getSuppressiveFireSelection(activity) {
  return {
    key: _getActivityModuleFlag(activity, "suppressiveShape") ?? OZ_SHAPES[0].key,
    ...(OZ_SHAPES.find(shape => shape.key === (_getActivityModuleFlag(activity, "suppressiveShape") ?? OZ_SHAPES[0].key))
      ?? OZ_SHAPES[0])
  };
}

function _getLongBurstTemplateData() {
  return {
    prompt: true,
    affects: {
      count: "",
      type: "creature",
      choice: false,
      special: ""
    },
    template: {
      count: "",
      contiguous: false,
      type: "line",
      size: "36",
      width: "1.5",
      height: "",
      units: "m"
    }
  };
}

function _getCrushingBurstTemplateData() {
  return {
    prompt: true,
    affects: {
      count: "",
      type: "creature",
      choice: false,
      special: "obrażenia + test Siły na obalenie"
    },
    template: {
      count: "",
      contiguous: false,
      type: "line",
      size: "150",
      width: "3",
      height: "",
      units: "m"
    }
  };
}

function _getSuppressiveFireTemplateData(selection) {
  return {
    prompt: true,
    affects: {
      count: "",
      type: "creature",
      choice: false,
      special: "obszar ostrzału"
    },
    template: {
      count: "",
      contiguous: false,
      type: selection.key,
      size: selection.size,
      width: selection.width,
      height: selection.key === "square" ? selection.size : "",
      units: "m"
    }
  };
}

async function _promptLongBurstSelection(item) {
  return new Promise(resolve => {
    const buttons = Object.fromEntries(DS_THRESHOLDS.map(option => [
      `burst-${option.bullets}`,
      {
        label: _getLongBurstOptionLabel(item, option),
        callback: () => resolve(_getLongBurstSelectionOption(item, option))
      }
    ]));

    buttons.cancel = {
      label: "Anuluj",
      callback: () => resolve(null)
    };

    new Dialog({
      title: `${item.name} - Długa seria`,
      content: `<p>Wybierz liczbę pocisków do długiej serii.</p>${_hasMobileHmgNest(item) ? "<p><strong>Ruchome gniazdo CKM:</strong> Chmura ołowiu podwaja zużycie amunicji i kości obrażeń DS.</p>" : ""}`,
      buttons,
      close: () => resolve(null)
    }).render(true);
  });
}

function _getLongBurstOptionLabel(item, option) {
  const selection = _getLongBurstSelectionOption(item, option);
  if (!_hasMobileHmgNest(item)) return `${selection.bullets} naboi (${selection.multiplier}x)`;
  return `${selection.bullets} naboi (${selection.multiplier}x, Chmura ołowiu)`;
}

function _getLongBurstSelectionOption(item, option) {
  const selection = {
    bullets: Number(option?.bullets ?? DS_THRESHOLDS[0].bullets),
    multiplier: Number(option?.multiplier ?? DS_THRESHOLDS[0].multiplier)
  };

  if (!_hasMobileHmgNest(item)) return selection;
  return {
    ...selection,
    bullets: selection.bullets * 2,
    multiplier: selection.multiplier * 2,
    abilityKey: ABILITY_KEYS.RUCHOME_GNIAZDO_CKM
  };
}

async function _promptCrushingBurstSelection(item) {
  return new Promise(resolve => {
    const buttons = Object.fromEntries(MS_THRESHOLDS.map(option => [
      `burst-${option.bullets}`,
      {
        label: `${option.bullets} naboi (${option.multiplier}x)`,
        callback: () => resolve(option)
      }
    ]));

    buttons.cancel = {
      label: "Anuluj",
      callback: () => resolve(null)
    };

    new Dialog({
      title: `${item.name} - Miażdżąca seria`,
      content: "<p>Wybierz liczbę pocisków do miażdżącej serii.</p>",
      buttons,
      close: () => resolve(null)
    }).render(true);
  });
}

async function _promptSuppressiveFireSelection(item) {
  return new Promise(resolve => {
    const buttons = Object.fromEntries(OZ_SHAPES.map(selection => [
      `shape-${selection.key}`,
      {
        label: selection.label,
        callback: () => resolve(selection)
      }
    ]));

    buttons.cancel = {
      label: "Anuluj",
      callback: () => resolve(null)
    };

    new Dialog({
      title: `${item.name} - Ogień zaporowy`,
      content: "<p>Wybierz kształt obszaru ognia zaporowego.</p>",
      buttons,
      close: () => resolve(null)
    }).render(true);
  });
}

function _configureLongBurstActivity(activity, selection) {
  activity.updateSource({
    description: {
      chatFlavor: _getLongBurstSummary(selection)
    },
    damage: {
      onSave: "half",
      parts: [_buildBurstDamagePart(activity.item, selection.multiplier)]
    },
    save: {
      ability: ["dex"],
      dc: {
        calculation: "",
        formula: "8 + @prof + @abilities.dex.mod"
      }
    },
    target: _getLongBurstTemplateData(),
    flags: {
      [MODULE_ID]: {
        ..._getActivityModuleFlags(activity),
        managedActivity: true,
        fireMode: DS_FIRE_MODE,
        burstBullets: selection.bullets,
        burstMultiplier: selection.multiplier
      }
    }
  });
}

function _configureCrushingBurstActivity(activity, selection) {
  activity.updateSource({
    description: {
      chatFlavor: _getCrushingBurstSummary(selection)
    },
    damage: {
      onSave: "half",
      parts: [_buildBurstDamagePart(activity.item, selection.multiplier)]
    },
    save: {
      ability: ["dex"],
      dc: {
        calculation: "",
        formula: "15"
      }
    },
    target: _getCrushingBurstTemplateData(),
    flags: {
      [MODULE_ID]: {
        ..._getActivityModuleFlags(activity),
        managedActivity: true,
        fireMode: MS_FIRE_MODE,
        burstBullets: selection.bullets,
        burstMultiplier: selection.multiplier
      }
    }
  });
}

function _configureSuppressiveFireActivity(activity, selection) {
  activity.updateSource({
    description: {
      chatFlavor: _getSuppressiveFireSummary(activity.item, selection)
    },
    save: {
      ability: ["wis"],
      dc: {
        calculation: "",
        formula: String(_getSuppressiveFireDc(activity.item))
      }
    },
    target: _getSuppressiveFireTemplateData(selection),
    flags: {
      [MODULE_ID]: {
        ..._getActivityModuleFlags(activity),
        managedActivity: true,
        fireMode: OZ_FIRE_MODE,
        suppressiveShape: selection.key
      }
    }
  });
}

function _getLiveItem(item) {
  return item?.actor?.items?.get(item.id) ?? item;
}

function _getActivityModuleFlags(activity) {
  if (!activity) return {};
  return foundry.utils.getProperty(activity, `flags.${MODULE_ID}`)
    ?? foundry.utils.getProperty(activity, `_source.flags.${MODULE_ID}`)
    ?? {};
}

function _getActivityModuleFlag(activity, key) {
  return _getActivityModuleFlags(activity)?.[key];
}

function _getSuppressiveFireDc(item) {
  const damage = item.system.damage?.base;
  const number = Number(damage?.number ?? 0);
  const denomination = Number(damage?.denomination ?? 0);

  if ((number === 1) && [4, 6].includes(denomination)) return 10;
  if ((number === 1) && [8, 10].includes(denomination)) return 13;
  if (((number === 2) && [6, 8].includes(denomination)) || ((number === 3) && [4, 6].includes(denomination))) return 15;
  if (denomination === 20) return 20;
  return 13;
}

function _getSuppressiveFireLabel(item, selection = OZ_SHAPES[0]) {
  return `${item?.name ?? "Broń"} - Ogień zaporowy (${selection.label}, ${OZ_BULLET_COST} naboi)`;
}

function _getSuppressiveFireSummary(item, selection = OZ_SHAPES[0]) {
  return `Ogień zaporowy. Koszt: ${OZ_BULLET_COST} naboi. Obszar: ${selection.label}. RO Mądrość ST ${_getSuppressiveFireDc(item)}. Porażka: brak Akcji i Akcji dodatkowej do początku następnej tury strzelca.`;
}

function _canUseSuppressiveFire(item) {
  if (!item) return false;
  if (isDamaged(item)) {
    ui.notifications.warn(`${item.name}: broń jest uszkodzona i wymaga naprawy.`);
    return false;
  }
  if (isJammed(item)) {
    ui.notifications.warn(`${item.name}: broń jest zacięta.`);
    return false;
  }
  if (_hasProperty(item, "ladowanie") || _hasProperty(item, "przeladowanie")) {
    ui.notifications.warn(`${item.name}: ogień zaporowy wymaga broni bez właściwości Ładowanie i Przeładowanie.`);
    return false;
  }

  const mag = getMag(item);
  if (mag && mag.current < OZ_BULLET_COST) {
    ui.notifications.warn(`${item.name}: potrzeba co najmniej ${OZ_BULLET_COST} naboi.`);
    return false;
  }

  const combat = game.combat;
  if (!combat?.started) return true;

  const lastUse = item.getFlag(MODULE_ID, SUPPRESSIVE_FIRE_USE_FLAG) ?? {};
  if ((lastUse.combatId === combat.id) && (lastUse.round === combat.round) && (lastUse.turn === combat.turn)) {
    ui.notifications.warn(`${item.name}: z ognia zaporowego można skorzystać tylko raz na turę.`);
    return false;
  }

  return true;
}

async function _markSuppressiveFireUsed(item) {
  const combat = game.combat;
  await item.setFlag(MODULE_ID, SUPPRESSIVE_FIRE_USE_FLAG, {
    combatId: combat?.id ?? null,
    round: combat?.round ?? null,
    turn: combat?.turn ?? null
  });
}

function _buildSuppressiveZoneData(item, { dc = _getSuppressiveFireDc(item), selection = null } = {}) {
  const combat = game.combat;
  const combatant = item.actor?.combatant ?? combat?.combatants?.find(entry => entry.actorId === item.actor?.id) ?? null;
  return {
    sourceActorId: item.actor?.id ?? null,
    sourceCombatantId: combatant?.id ?? null,
    combatId: combat?.id ?? null,
    originRound: combat?.round ?? null,
    originTurn: combat?.turn ?? null,
    saveDc: dc,
    selection: selection ? { key: selection.key, label: selection.label, size: selection.size, width: selection.width } : null,
    triggeredTokenIds: []
  };
}

function _buildBurstTemplateData(activity) {
  const item = activity?.item;
  const combat = game.combat;
  const combatant = item?.actor?.combatant ?? combat?.combatants?.find(entry => entry.actorId === item?.actor?.id) ?? null;
  return {
    sourceActorId: item?.actor?.id ?? null,
    sourceCombatantId: combatant?.id ?? null,
    combatId: combat?.id ?? null,
    originRound: combat?.round ?? null,
    originTurn: combat?.turn ?? null,
    fireMode: _getActivityModuleFlag(activity, "fireMode") ?? null
  };
}

function onPreCreateBurstTemplate(activity, templateData) {
  const fireMode = _getActivityModuleFlag(activity, "fireMode");
  if (![DS_FIRE_MODE, MS_FIRE_MODE].includes(fireMode)) return;

  templateData.flags ??= {};
  templateData.flags[MODULE_ID] ??= {};
  templateData.flags[MODULE_ID][BURST_TEMPLATE_FLAG] = _buildBurstTemplateData(activity);
}

async function _flagSuppressiveFireTemplates(templates, zoneData) {
  for (const template of templates ?? []) {
    await template.update({
      [`flags.${MODULE_ID}.${SUPPRESSIVE_ZONE_FLAG}`]: zoneData
    });
  }
}

function onPreCreateSuppressiveFireTemplate(activity, templateData) {
  if (activity?.type !== OZ_ACTIVITY_TYPE) return;
  templateData.flags ??= {};
  templateData.flags[MODULE_ID] ??= {};
  templateData.flags[MODULE_ID][SUPPRESSIVE_ZONE_FLAG] = _buildSuppressiveZoneData(activity.item, {
    dc: _getSuppressiveFireDc(activity.item),
    selection: _getSuppressiveFireSelection(activity)
  });
}

async function _resolveSuppressiveFireSave(token, zoneData, { event = null, fromChat = false } = {}) {
  const tokenDoc = token?.document ?? token;
  const actor = tokenDoc?.actor ?? token?.actor;
  if (!tokenDoc || !actor) return false;

  const speaker = ChatMessage.getSpeaker({ actor, scene: canvas.scene, token: tokenDoc });

  const rolls = await actor.rollSavingThrow({
    event,
    ability: "wis",
    target: zoneData.saveDc
  }, {}, {
    data: {
      flavor: "Ogień zaporowy",
      speaker
    }
  });
  const roll = rolls?.[0];
  const success = (roll?.total ?? 0) >= zoneData.saveDc;

  if (!success) await _applySuppressiveFireEffect(actor, tokenDoc, zoneData);
  return !success;
}

async function _applyProneFromCrushingBurst(actor, tokenDocument) {
  if (typeof actor?.toggleStatusEffect === "function") {
    await actor.toggleStatusEffect("prone", { active: true });
    return;
  }

  const speaker = ChatMessage.getSpeaker({ actor, scene: canvas.scene, token: tokenDocument });
  await ChatMessage.create({
    speaker,
    content: `<div><strong>${tokenDocument.name}</strong>: zastosuj ręcznie stan Powalenie.</div>`
  });
}

async function _applySuppressiveFireEffect(actor, tokenDoc, zoneData) {
  const speaker = ChatMessage.getSpeaker({ actor, scene: canvas.scene, token: tokenDoc });
  if (!game.combat?.started || !zoneData.sourceCombatantId || !zoneData.combatId) {
    await ChatMessage.create({
      speaker,
      content: `<div><strong>${tokenDoc.name}</strong> zostaje przygwożdżony ogniem zaporowym. Poza walką efekt nie jest automatycznie śledzony.</div>`
    });
    return;
  }

  await actor.setFlag(MODULE_ID, SUPPRESSIVE_FIRE_FLAG, {
    sourceActorId: zoneData.sourceActorId,
    sourceCombatantId: zoneData.sourceCombatantId,
    combatId: zoneData.combatId,
    originRound: zoneData.originRound,
    originTurn: zoneData.originTurn
  });

  await ChatMessage.create({
    speaker,
    content: `<div><strong>${tokenDoc.name}</strong> zostaje przygwożdżony ogniem zaporowym. Do początku następnej tury strzelca nie może wykonać Akcji ani Akcji dodatkowej.</div>`
  });
}

function onPreUseSuppressiveFireEffect(activity) {
  const actor = activity?.actor;
  const effect = actor?.getFlag(MODULE_ID, SUPPRESSIVE_FIRE_FLAG) ?? null;
  if (!actor || !effect) return;

  if (!_isSuppressiveFireEffectActive(effect, game.combat)) {
    void actor.unsetFlag(MODULE_ID, SUPPRESSIVE_FIRE_FLAG);
    return;
  }

  if (!["action", "bonus"].includes(activity.activation?.type)) return;
  ui.notifications.warn(`${actor.name}: ogień zaporowy blokuje Akcję i Akcję dodatkową do początku następnej tury strzelca.`);
  return false;
}

async function onUpdateCombatSuppressiveFire(combat) {
  if (!combat) return;
  const actors = Array.from(game.actors ?? []).filter(actor => actor.getFlag(MODULE_ID, SUPPRESSIVE_FIRE_FLAG));
  for (const actor of actors) {
    const effect = actor.getFlag(MODULE_ID, SUPPRESSIVE_FIRE_FLAG);
    if (!_isSuppressiveFireEffectActive(effect, combat)) await actor.unsetFlag(MODULE_ID, SUPPRESSIVE_FIRE_FLAG);
  }

  const expiredTemplates = _getSuppressiveFireTemplates(canvas.scene).filter(template => {
    const zone = template.getFlag(MODULE_ID, SUPPRESSIVE_ZONE_FLAG);
    return !_isSuppressiveFireEffectActive(zone, combat);
  });
  if (expiredTemplates.length) {
    await canvas.scene.deleteEmbeddedDocuments("MeasuredTemplate", expiredTemplates.map(template => template.id));
  }

  const expiredBurstTemplates = _getBurstTemplates(canvas.scene).filter(template => {
    const burst = template.getFlag(MODULE_ID, BURST_TEMPLATE_FLAG);
    return !_isBurstTemplateActive(burst, combat);
  });
  if (expiredBurstTemplates.length) {
    await canvas.scene.deleteEmbeddedDocuments("MeasuredTemplate", expiredBurstTemplates.map(template => template.id));
  }
}

async function onDeleteCombatSuppressiveFire(combat) {
  const actors = Array.from(game.actors ?? []).filter(actor => actor.getFlag(MODULE_ID, SUPPRESSIVE_FIRE_FLAG)?.combatId === combat?.id);
  for (const actor of actors) await actor.unsetFlag(MODULE_ID, SUPPRESSIVE_FIRE_FLAG);

  if (!canvas.scene) return;
  const templates = _getSuppressiveFireTemplates(canvas.scene).filter(template => template.getFlag(MODULE_ID, SUPPRESSIVE_ZONE_FLAG)?.combatId === combat?.id);
  if (templates.length) {
    await canvas.scene.deleteEmbeddedDocuments("MeasuredTemplate", templates.map(template => template.id));
  }

  const burstTemplates = _getBurstTemplates(canvas.scene).filter(template => template.getFlag(MODULE_ID, BURST_TEMPLATE_FLAG)?.combatId === combat?.id);
  if (burstTemplates.length) {
    await canvas.scene.deleteEmbeddedDocuments("MeasuredTemplate", burstTemplates.map(template => template.id));
  }
}

async function onUpdateTokenSuppressiveFire(tokenDocument, changed) {
  if (!canvas.scene || (!("x" in changed) && !("y" in changed))) return;
  if (!tokenDocument.actor) return;

  for (const template of _getSuppressiveFireTemplates(canvas.scene)) {
    const zone = template.getFlag(MODULE_ID, SUPPRESSIVE_ZONE_FLAG) ?? null;
    if (!zone || !_isSuppressiveFireEffectActive(zone, game.combat)) continue;
    if (zone.triggeredTokenIds?.includes(tokenDocument.id)) continue;
    if (!_templateContainsToken(template, tokenDocument)) continue;

    const triggered = await _resolveSuppressiveFireSave(tokenDocument, zone, {});
    if (triggered) {
      await template.update({
        [`flags.${MODULE_ID}.${SUPPRESSIVE_ZONE_FLAG}.triggeredTokenIds`]: [...(zone.triggeredTokenIds ?? []), tokenDocument.id]
      });
    }
  }
}

function _isSuppressiveFireEffectActive(effect, combat) {
  if (!effect) return false;
  if (!effect.combatId || !effect.sourceCombatantId) return false;
  if (!combat || (combat.id !== effect.combatId)) return false;
  const sameCombatant = combat.combatant?.id === effect.sourceCombatantId;
  const sameMoment = (combat.round === effect.originRound) && (combat.turn === effect.originTurn);
  return !(sameCombatant && !sameMoment);
}

function _isBurstTemplateActive(effect, combat) {
  if (!effect) return false;
  if (!effect.combatId || !effect.sourceCombatantId) return false;
  if (!combat || (combat.id !== effect.combatId)) return false;
  return (combat.round === effect.originRound) && (combat.turn === effect.originTurn)
    && (combat.combatant?.id === effect.sourceCombatantId);
}

function _getSuppressiveFireTemplates(scene) {
  return Array.from(scene?.templates ?? []).filter(template => !!template.getFlag(MODULE_ID, SUPPRESSIVE_ZONE_FLAG));
}

function _getBurstTemplates(scene) {
  return Array.from(scene?.templates ?? []).filter(template => !!template.getFlag(MODULE_ID, BURST_TEMPLATE_FLAG));
}

function _templateContainsToken(templateDocument, tokenDocument) {
  const template = canvas.templates.get(templateDocument.id);
  const token = tokenDocument.object ?? canvas.tokens.get(tokenDocument.id);
  const center = token?.center;
  if (!template?.shape || !center) return false;

  const localPoint = template.worldTransform.applyInverse(new PIXI.Point(center.x, center.y));
  return template.shape.contains(localPoint.x, localPoint.y);
}
