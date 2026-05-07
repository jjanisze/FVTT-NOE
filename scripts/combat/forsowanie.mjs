/**
 * Neuroshima 5e — Forsowanie (Pushing a Test).
 * 
 * After a failed skill check or tool check, the player can declare Forsowanie:
 * - Reroll using k20 + full raw ability score (not modifier, not proficiency)
 * - Auto-gain 1 level of Wyczerpanie regardless of success
 * - NOT available on attack rolls or saving throws
 * - Optional rule — controlled by world setting
 * 
 * Implementation: Hook into dnd5e.renderChatMessage to add "Forsuj" button.
 */

import { addExhaustion } from "../config/exhaustion.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/**
 * Register Forsowanie hooks and world setting — call during init.
 */
export function registerForsowanie() {
  // Register world setting for enabling/disabling
  game.settings.register(MODULE_ID, "forsowanieEnabled", {
    name: "Forsowanie (Opcjonalne)",
    hint: "Pozwala graczom forsować nieudane testy cech/umiejętności. Reroll używa pełnej wartości cechy zamiast modyfikatora. Automatycznie nakłada 1 Wyczerpanie.",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  // Hook into dnd5e chat message rendering to add Forsuj button
  // Using dnd5e.renderChatMessage (HTMLElement) instead of deprecated renderChatMessage (jQuery)
  Hooks.on("dnd5e.renderChatMessage", onRenderChatMessage);

  console.log("Neuroshima 5e | Forsowanie system registered");
}

/**
 * Add "Forsuj" button to failed skill/tool/ability check chat cards.
 */
function onRenderChatMessage(message, html) {
  // Check if forsowanie is enabled
  if (!game.settings.get(MODULE_ID, "forsowanieEnabled")) return;

  // Check dnd5e flags for roll type
  const rollData = message.flags?.dnd5e?.roll;
  if (!rollData) return;

  const rollType = rollData.type;
  // Only skill checks, tool checks, and ability checks — not attacks, not saves
  if (rollType !== "skill" && rollType !== "ability" && rollType !== "tool") return;

  // Don't add button if this IS already a forsowanie reroll
  if (message.flags?.[MODULE_ID]?.forsowanie) return;

  // Get the actor
  const actorId = message.speaker?.actor;
  if (!actorId) return;
  const actor = game.actors.get(actorId);
  if (!actor) return;

  // Only show to the actor's owner or the GM
  if (!actor.isOwner) return;

  // Get the ability used — stored differently per roll type
  let abilityKey;
  if (rollType === "ability") {
    abilityKey = rollData.ability;
  } else if (rollType === "skill") {
    const skillId = rollData.skillId;
    abilityKey = actor.system.skills?.[skillId]?.ability;
  } else if (rollType === "tool") {
    // For tool checks, the ability is stored directly
    abilityKey = rollData.ability;
  }
  if (!abilityKey) return;

  const abilityLabel = CONFIG.DND5E.abilities[abilityKey]?.label ?? abilityKey;
  const abilityScore = actor.system.abilities[abilityKey]?.value;
  if (abilityScore === undefined) return;

  // Add "Forsuj" button
  const btnContainer = document.createElement("div");
  btnContainer.classList.add("neuroshima-forsowanie");
  btnContainer.style.marginTop = "4px";
  btnContainer.innerHTML = `
    <button class="forsuj-btn" data-actor-id="${actorId}" data-ability="${abilityKey}" 
            data-ability-score="${abilityScore}" data-ability-label="${abilityLabel}"
            style="background: #8B0000; color: #fff; border: 1px solid #600; font-weight: bold;">
      ⚡ Forsuj (k20 + ${abilityLabel} ${abilityScore})
    </button>
  `;

  const content = html.querySelector(".message-content") ?? html;
  content.appendChild(btnContainer);

  // Bind click handler
  btnContainer.querySelector(".forsuj-btn").addEventListener("click", handleForsowanie);
}

/**
 * Handle clicking the Forsuj button.
 */
async function handleForsowanie(event) {
  event.preventDefault();
  const btn = event.currentTarget;
  const actorId = btn.dataset.actorId;
  const abilityKey = btn.dataset.ability;
  const abilityScore = Number(btn.dataset.abilityScore);
  const abilityLabel = btn.dataset.abilityLabel;

  const actor = game.actors.get(actorId);
  if (!actor) return;

  // Disable the button to prevent double-click
  btn.disabled = true;
  btn.textContent = "Forsowanie...";

  // Roll k20 + full ability score
  const roll = new Roll("1d20 + @score", { score: abilityScore });
  await roll.evaluate();

  // Send result to chat
  await roll.toMessage({
    speaker: ChatMessage.getSpeaker({ actor }),
    flavor: `<strong>FORSOWANIE!</strong> Test ${abilityLabel} (k20 + ${abilityScore})`,
    flags: {
      [MODULE_ID]: { forsowanie: true }
    }
  });

  // Apply 1 level of Wyczerpanie (source: forsowanie)
  await addExhaustion(actor, "forsowanie");

  // Remove the button
  btn.closest(".neuroshima-forsowanie")?.remove();
}
