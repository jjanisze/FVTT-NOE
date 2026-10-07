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
 * **2026-10-07 (PLAN_m1_walka D6):** the hook and the badge below are gone — this file is now one source
 * of the attack-circumstance engine (`combat/okolicznosci.mjs`), which sets the same default once for
 * every source and draws one badge group. The history below explains why it is a default at all.
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
import { zarejestrujZrodloOkolicznosci } from "./okolicznosci.mjs";

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
 * Źródło silnika okoliczności ataku (`combat/okolicznosci.mjs`, PLAN_m1_walka D6): Przeciążenie albo
 * Unieruchomienie z Udźwigu → Utrudnienie. Dawniej własny hak `preRollAttack` i własna plakietka —
 * teraz tryb rzutu ustawia jeden silnik, a powód trafia do jednej grupy plakietek na karcie ataku.
 * @param {{actor: Actor}} ctx
 * @returns {{rodzaj: string, label: string}[]}
 */
function zrodloUdzwig(ctx) {
  if (!ctx?.actor) return [];
  const zone = _udzwigZone(ctx?.actor);
  return ZONE_BADGE[zone] ? [{ rodzaj: "utrudnienie", label: ZONE_BADGE[zone] }] : [];
}

export function registerUdzwigAttackDisadvantage() {
  zarejestrujZrodloOkolicznosci("udzwig", zrodloUdzwig);
  console.log(`${MODULE_ID} | Udźwig attack disadvantage registered (źródło okoliczności ataku)`);
}

export const __testing = Object.freeze({
  udzwigZone: _udzwigZone,
  zrodloUdzwig
});
