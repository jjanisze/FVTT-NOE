/**
 * Neuroshima 5e — Nokautowanie & Ostatnia Akcja
 *
 * NOKAUTOWANIE:
 *   When a melee attack dealing ONLY bludgeoning damage reduces a target
 *   to 0 PW, the attacker can choose to knock the target out instead:
 *   - Target set to 1 PW + Unconscious condition
 *   - Wakes after a Krótki odpoczynek, or when healed, or when someone
 *     passes an INT (Medycyna) check ST 10
 *
 *   Trigger: bludgeoning-only melee damage → target HP to 0
 *   Dialog: shown to the attacker (actor owner)
 *
 * OSTATNIA AKCJA:
 *   When a character accumulates 3 death save failures, they get one
 *   final narrative action before dying. This is announced in chat
 *   with a prominent styled message.
 *
 *   Trigger: 3rd death save failure recorded on actor
 */

const MODULE_ID = "neuroshima-2026-overrides";

/* -------------------------------------------- */
/*  Registration                                 */
/* -------------------------------------------- */

export function registerKnockoutAndLastAction() {
  // Nokautowanie: two-phase detection
  // Phase 1: preCalculateDamage — capture damage types and melee/ranged from activity
  Hooks.on("dnd5e.preCalculateDamage", onPreCalculateDamage);
  // Phase 2: preApplyDamage — check if HP would drop to 0, show dialog
  Hooks.on("dnd5e.preApplyDamage", onPreApplyDamage);

  // Ostatnia Akcja: detect 3rd death save failure
  Hooks.on("updateActor", onUpdateActorDeathSaves);

  console.log("Neuroshima 5e | Nokautowanie & Ostatnia Akcja registered");
}

/* -------------------------------------------- */
/*  Nokautowanie                                 */
/* -------------------------------------------- */

/**
 * Track pending knockout prompts to avoid duplicate dialogs.
 */
const _pendingKnockout = new Set();

/**
 * Temporary storage for damage context gathered in preCalculateDamage,
 * consumed by preApplyDamage. Keyed by actor ID.
 * @type {Map<string, {allBludgeoning: boolean, isMelee: boolean, attackerName: string, attackerActorId: string}>}
 */
const _damageContext = new Map();

/**
 * Phase 1: dnd5e.preCalculateDamage
 *
 * Fires BEFORE resistance/vulnerability processing. The `damages` array
 * has full DamageDescription objects with `.type` for each damage component.
 * The `options.originatingMessage` points to the DAMAGE roll message,
 * which has `flags.dnd5e.activity.uuid` for looking up the activity.
 *
 * We capture: are ALL damage types bludgeoning? Is the attack melee?
 * Store the result for preApplyDamage to read.
 */
function onPreCalculateDamage(actor, damages, options) {
  // Clear any stale context for this actor
  _damageContext.delete(actor.id);

  // Check damage types — every component must be bludgeoning
  const damageEntries = damages.filter(d => d.type && d.type !== "healing" && d.type !== "temphp");
  if (!damageEntries.length) return;
  const allBludgeoning = damageEntries.every(d => d.type === "bludgeoning");
  if (!allBludgeoning) return;

  // Determine if the attack was melee
  const msg = options?.originatingMessage;
  if (!msg) return;

  let isMelee = false;
  let attackerName = msg.speaker?.alias ?? "Atakujący";
  let attackerActorId = msg.speaker?.actor ?? null;

  // Method 1: Check the DAMAGE message's linked activity for attack.type
  const activityUuid = msg.flags?.dnd5e?.activity?.uuid;
  if (activityUuid) {
    try {
      const activity = fromUuidSync(activityUuid);
      if (activity?.attack?.type?.value === "melee") {
        isMelee = true;
      }
    } catch { /* activity not resolvable */ }
  }

  // Method 2: Check if the damage message itself has attackMode
  const rollFlags = msg.flags?.dnd5e?.roll;
  if (rollFlags?.attackMode) {
    isMelee = ["oneHanded", "twoHanded", "offhand"].includes(rollFlags.attackMode);
  }

  // Method 3: Scan recent chat for the attack roll that preceded this damage
  if (!isMelee && attackerActorId) {
    const recentMessages = game.messages.contents.slice(-10);
    for (let i = recentMessages.length - 1; i >= 0; i--) {
      const m = recentMessages[i];
      const mRoll = m.flags?.dnd5e?.roll;
      if (mRoll?.type === "attack" && m.speaker?.actor === attackerActorId) {
        if (["oneHanded", "twoHanded", "offhand"].includes(mRoll.attackMode)) {
          isMelee = true;
        }
        break; // Found the most recent attack roll from this actor
      }
    }
  }

  if (!isMelee) return;

  // Resolve attacker name
  if (attackerActorId) {
    const attackerActor = game.actors.get(attackerActorId);
    if (attackerActor) attackerName = attackerActor.name;
  }

  _damageContext.set(actor.id, { allBludgeoning, isMelee, attackerName, attackerActorId });
}

/**
 * Phase 2: dnd5e.preApplyDamage
 *
 * Fires after calculateDamage, right before HP is changed.
 * We know the final HP from `updates` — check if it would hit 0.
 * If yes and we have a matching context from Phase 1, show knockout dialog.
 */
function onPreApplyDamage(actor, amount, updates, options) {
  // Only trigger when damage would bring HP to 0
  const currentHP = actor.system.attributes?.hp?.value;
  if (currentHP === undefined || currentHP <= 0) return true;

  const newHP = updates["system.attributes.hp.value"];
  if (newHP === undefined || newHP > 0) return true;

  // Check if we captured bludgeoning melee context for this actor
  const ctx = _damageContext.get(actor.id);
  _damageContext.delete(actor.id); // consume it regardless
  if (!ctx?.allBludgeoning || !ctx?.isMelee) return true;

  // Prevent duplicate dialogs
  if (_pendingKnockout.has(actor.id)) return true;

  // Only show to the attacker's owner or GM
  const attackerActor = ctx.attackerActorId ? game.actors.get(ctx.attackerActorId) : null;
  const isAttackerOwner = attackerActor?.isOwner ?? game.user.isGM;
  if (!isAttackerOwner) return true;

  // Block damage and show dialog
  _pendingKnockout.add(actor.id);
  _showKnockoutDialog(actor, amount, updates, options, ctx.attackerName);
  return false; // Cancel normal damage application
}

/**
 * Show the knockout choice dialog to the attacker.
 */
async function _showKnockoutDialog(actor, amount, updates, options, attackerName) {
  try {
    const confirmed = await new Promise(resolve => {
      new Dialog({
        title: "Nokautowanie",
        content: `
          <div style="padding: 4px 0;">
            <p><strong>${attackerName}</strong> właśnie zredukował PW
              <strong>${actor.name}</strong> do 0 atakiem obuchowym.</p>
            <hr>
            <p>Możesz <strong>znokautować</strong> cel zamiast go zabić:</p>
            <ul style="margin: 4px 0; padding-left: 20px; font-size: 12px;">
              <li>PW celu ustawione na <strong>1</strong></li>
              <li>Cel otrzymuje stan <strong>Nieprzytomność</strong></li>
              <li>Budzi się po Krótkim odpoczynku lub leczeniu</li>
            </ul>
          </div>
        `,
        buttons: {
          knockout: {
            icon: '<i class="fas fa-fist-raised"></i>',
            label: "Nokautuj",
            callback: () => resolve(true)
          },
          kill: {
            icon: '<i class="fas fa-skull"></i>',
            label: "Normalne obrażenia",
            callback: () => resolve(false)
          }
        },
        default: "knockout",
        close: () => resolve(false)
      }).render(true);
    });

    if (confirmed) {
      await _applyKnockout(actor);
    } else {
      // Apply original damage normally
      await _applyOriginalDamage(actor, amount);
    }
  } finally {
    _pendingKnockout.delete(actor.id);
  }
}

/**
 * Apply knockout: set HP to 1, apply Unconscious condition.
 */
async function _applyKnockout(actor) {
  // Set HP to 1
  await actor.update({ "system.attributes.hp.value": 1 });

  // Apply Unconscious condition via Active Effect
  // dnd5e uses statusId-based conditions from CONFIG.statusEffects
  const unconsciousEffect = CONFIG.statusEffects?.find(
    e => e.id === "unconscious" || e.statuses?.has?.("unconscious")
  );

  // Check if already has Unconscious
  const hasUnconscious = actor.effects.some(e =>
    e.statuses?.has("unconscious") || e.name === "Nieprzytomność"
  );

  if (!hasUnconscious) {
    // Use the toggleStatusEffect API if available (cleaner)
    if (typeof actor.toggleStatusEffect === "function") {
      await actor.toggleStatusEffect("unconscious", { active: true });
    } else if (unconsciousEffect) {
      // Fallback: create the effect directly
      const effectData = foundry.utils.deepClone(unconsciousEffect);
      effectData.name = "Nieprzytomność";
      effectData.statuses = ["unconscious"];
      await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
    }
  }

  // Chat announcement
  await ChatMessage.create({
    content: `
      <div style="border-left: 4px solid #8e44ad; background: rgba(142, 68, 173, 0.08); padding: 6px 8px; border-radius: 0 4px 4px 0;">
        <div style="font-weight: bold; color: #8e44ad; font-size: 13px; margin-bottom: 2px;">💫 NOKAUTOWANIE</div>
        <div style="font-size: 12px;">
          <strong>${actor.name}</strong> został znokautowany!<br>
          <span style="color: #aaa; font-size: 11px;">PW: 1 | Stan: Nieprzytomność | Budzi się po KO lub leczeniu</span>
        </div>
      </div>
    `,
    speaker: ChatMessage.getSpeaker({ actor })
  });
}

/**
 * Apply the original damage that was blocked by the knockout dialog.
 * This re-calls applyDamage with the raw amount.
 */
async function _applyOriginalDamage(actor, amount) {
  // Apply the damage amount directly to HP
  const currentHP = actor.system.attributes.hp.value;
  const newHP = Math.max(0, currentHP - amount);
  await actor.update({ "system.attributes.hp.value": newHP });
}

/* -------------------------------------------- */
/*  Ostatnia Akcja (Last Action)                 */
/* -------------------------------------------- */

/**
 * Hook: updateActor
 * Detect when the 3rd death save failure is recorded.
 * In dnd5e, death saves are tracked at system.attributes.death.failure (0-3).
 */
function onUpdateActorDeathSaves(actor, changes, options, userId) {
  // Only process if this user initiated the change
  if (game.userId !== userId) return;

  // Check if death save failures changed
  const newFailures = foundry.utils.getProperty(changes, "system.attributes.death.failure");
  if (newFailures !== 3) return;

  // Check that it actually changed (not just a re-render)
  // The actor's data is already updated at this point, so we check
  // if the previous value was less than 3
  const wasAlreadyDead = (options?._previousDeathFailures ?? 0) >= 3;
  if (wasAlreadyDead) return;

  // Announce Ostatnia Akcja in chat
  _announceOstatniaAkcja(actor);
}

/**
 * Also hook preUpdateActor to capture the previous death failure count.
 * This is needed because updateActor receives the already-updated actor.
 */
export function onPreUpdateActorDeathSaves(actor, changes, options) {
  const newFailures = foundry.utils.getProperty(changes, "system.attributes.death.failure");
  if (newFailures !== undefined) {
    options._previousDeathFailures = actor.system.attributes?.death?.failure ?? 0;
  }
}

/**
 * Post a prominent chat message announcing the Last Action right.
 */
async function _announceOstatniaAkcja(actor) {
  await ChatMessage.create({
    content: `
      <div style="
        border: 2px solid #c0392b;
        background: linear-gradient(135deg, rgba(192, 57, 43, 0.15), rgba(0, 0, 0, 0.3));
        padding: 10px 12px;
        border-radius: 4px;
        text-align: center;
      ">
        <div style="font-weight: bold; color: #e74c3c; font-size: 20px; margin-bottom: 4px;">
          ${actor.name} umiera.
        </div>
        <div style="font-size: 12px; color: #c0392b; text-transform: uppercase; letter-spacing: 2px; font-weight: bold; margin-bottom: 6px;">
          💀 OSTATNIA AKCJA 💀
        </div>
        <div style="font-size: 11px; color: #222; font-style: italic; line-height: 1.4;">
          Na chwilę otwierasz oczy, mówisz kilka słów<br>
          i wykonujesz coś godnego zapamiętania.<br>
          Tą akcją żegnasz się z życiem swojej postaci.
        </div>
      </div>
    `,
    speaker: ChatMessage.getSpeaker({ actor })
  });

  // Optional notification to the player
  if (actor.isOwner) {
    ui.notifications.info(`${actor.name} — masz prawo do Ostatniej Akcji!`, { permanent: true });
  }
}
