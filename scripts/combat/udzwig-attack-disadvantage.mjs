/**
 * Neuroshima 5e — Udźwig: domyślne Utrudnienie do Testów Ataku (Przeciążenie/Unieruchomienie).
 *
 * RAW anchor: "Jeśli sumaryczna waga tego, co nosisz, przekroczy wartość udźwigu
 * użytkowego […] wszystkie ataki wykonujesz z Utrudnieniem." Only the Speed half of
 * this clause is automated in `actors/udzwig-slowdown.mjs` — see that file's header
 * for why the disadvantage half was deliberately left out THERE: it's a visibly
 * enforced roll consequence, not a silent stat change, so it belongs with this
 * module's other "detect, surface for a human" combat automations (cover, crit
 * riders) instead of being injected silently. This file IS that surfacing.
 * Requested/evaluated live 2026-09-16.
 *
 * ## Mechanism: a default, not an enforcement — copied from `actors/armor-rules.mjs`
 *
 * Same shape as that file's own "Brak wyszkolenia" attack penalty:
 * `Hooks.on("dnd5e.preRollAttack", ...)` sets `config.disadvantage = true` BEFORE the
 * roll dialog opens (or before the roll resolves at all, if the dialog is skipped —
 * `dnd5e.postBuildAttackRollConfig` was rejected for the same reason armor-rules.mjs
 * already rejected it there: it only fires through the dialog, so a fast-forwarded
 * attack — shift-click, `configure: false` — would skip it entirely). The GM or
 * player can still uncheck Disadvantage, or add Advantage to cancel it to Normal (per
 * standard 5e roll resolution — nothing to build for that part), whenever the dialog
 * IS shown. When it isn't, the chat badge below is the safety net: the roll already
 * happened, but the card still says why.
 *
 * ## Chat badge: same data-on-the-Roll pattern as `combat/cover.mjs`
 *
 * Cover's own badge is keyed off `roll.options.neuroCover`, stashed onto the roll
 * config before the Roll object is even built, then read back from
 * `message.rolls[0].options` in a `dnd5e.renderChatMessage` hook — decoupled from
 * whatever hook made the original decision, so it doesn't matter whether the dialog
 * ran or was skipped. Copied here verbatim as `roll.options.neuroUdzwigAttack`. Shown
 * REGARDLESS of what roll mode was actually used (Advantage may have cancelled the
 * Disadvantage to Normal) — the badge is an audit trail ("this character WAS
 * overloaded when this attack happened"), not a report of the roll's final mode.
 *
 * ## Scope: attack rolls only, and only the other half of the Speed clause
 *
 * Gated on `["przeciazenie", "nieruchomienie"].includes(zone)` — RAW's Utrudnienie
 * doesn't switch off just because the character is also immobilized; it's the same
 * clause `udzwig-slowdown.mjs` reads for the Speed half. Ability checks and saves are
 * untouched — RAW's Udźwig text only names attacks. Reads the same `udzwigStatus()`
 * `actors/encumbrance-breakdown.mjs` already exports, so this and the Speed penalty
 * can never disagree about which zone the actor is actually in.
 */
import { udzwigStatus } from "../actors/encumbrance-breakdown.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

const ZONE_BADGE = {
  przeciazenie: "Atak z Przeciążenia (Udźwig)",
  nieruchomienie: "Atak z Unieruchomienia (Udźwig)"
};

function _udzwigZone(actor) {
  const enc = actor?.system?.attributes?.encumbrance;
  const status = udzwigStatus(enc?.value, enc?.thresholds?.heavilyEncumbered, enc?.thresholds?.maximum);
  return status?.zone ?? "normalna";
}

/**
 * Hook: `dnd5e.preRollAttack`. Same shape as `actors/armor-rules.mjs`'s own
 * `onPreRollAttack` — defaults `config.disadvantage`, doesn't force it past whatever
 * choice the GM/player makes when the dialog is actually shown.
 */
function onPreRollAttack(config, _dialog, _message) {
  const activity = config.subject;
  const actor = activity?.actor;
  if (!actor) return;

  const zone = _udzwigZone(actor);
  if (!ZONE_BADGE[zone]) return;

  config.disadvantage = true;
  for (const roll of config.rolls ?? []) {
    roll.options ??= {};
    roll.options.neuroUdzwigAttack = { zone };
  }
}

/**
 * Hook: `dnd5e.renderChatMessage`. Paints a small badge on the attack roll's own chat
 * card so the Przeciążenie/Unieruchomienie default isn't only visible in the moment —
 * exact anchor point TBD against the live DOM, see inline notes.
 */
function onRenderChatMessage(message, html) {
  if (message.getFlag("dnd5e", "roll")?.type !== "attack") return;
  const zone = message.rolls?.[0]?.options?.neuroUdzwigAttack?.zone;
  const label = ZONE_BADGE[zone];
  if (!label) return;
  // `html` is already a raw HTMLElement in this Foundry version — same assumption
  // `combat/cover.mjs`'s own `renderChatMessage` hook makes, not re-derived here.
  if (html.querySelector(".neuro-udzwig-attack-badge")) return; // one render pass

  // Prefer dnd5e's own native `.pills` footer (already used for weapon properties on
  // this exact card type) so the badge looks like it belongs, not bolted on.
  let pillList = html.querySelector("ul.card-footer.pills");
  if (!pillList) {
    pillList = document.createElement("ul");
    pillList.className = "card-footer pills unlist";
    const card = html.querySelector(".chat-card") ?? html;
    card.appendChild(pillList);
  }

  // `maroon` is dnd5e's own native warning-pill modifier (already used elsewhere in
  // core for e.g. concentration) — reused as-is instead of introducing bespoke colour
  // CSS, so this reads as "the system's own warning pill", not a bolted-on badge.
  const pill = document.createElement("li");
  pill.className = "pill maroon neuro-udzwig-attack-badge";
  pill.innerHTML = `<span class="label">${label}</span>`;
  pillList.appendChild(pill);
}

export function registerUdzwigAttackDisadvantage() {
  Hooks.on("dnd5e.preRollAttack", onPreRollAttack);
  Hooks.on("dnd5e.renderChatMessage", onRenderChatMessage);
  console.log(`${MODULE_ID} | Udźwig attack disadvantage registered`);
}

export const __testing = Object.freeze({
  udzwigZone: _udzwigZone,
  onPreRollAttack,
  onRenderChatMessage
});
