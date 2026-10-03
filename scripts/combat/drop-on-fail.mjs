/**
 * Neuroshima 5e — „oblany RO = upuszczasz broń" (PLAN_paper_doll §5, zdarzenia opróżniające ręce).
 *
 * Dziś jeden przypadek: Szeryf, **„Poddaj się!"** (Bestiariusz, Akcja bonusowa): ludzie w zasięgu
 * 18 m zdają RO na Mądrość ST 13, inaczej upuszczają broń i są Przerażeni do końca następnej
 * tury szeryfa. RAW nie zostawia wyboru, więc upuszczenie jest automatyczne (§5) — dla postaci
 * z lalką: każda broń trzymana w ręce ląduje na ziemi u jej stóp, bez kosztu (to nie jej akcja).
 * Przerażenie zostaje natywnym efektem aktywności — przycisk na karcie, MG w pętli.
 *
 * Generator Bestiariusza oznacza taką cechę `automation.dropOnFail` (`dev/bestiary/gen_bestiary.py`).
 *
 * Dlaczego przejmujemy przycisk: rzut obronny dnd5e z karty aktywności nie niesie żadnego
 * powiązania z aktywnością, która go wywołała (`SaveActivity#rollSave` woła goły
 * `actor.rollSavingThrow`). Jedyne miejsce, gdzie wiadomo i *kto* rzuca, i *przeciw czemu* — to
 * kliknięcie w przycisk tej karty. Kopie BN-ów zaimportowane przed przebudową paczki nie mają
 * jeszcze aktywności — wtedy przycisk dokładamy sami, z ST i cechą z tabeli Bestiariusza.
 */

import { isDollActor, heldItems, drop } from "../actors/doll.mjs";
import { BESTIARY } from "../config/bestiary-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Automatyka cechy Bestiariusza: z flag przedmiotu albo z wygenerowanej tabeli. */
function _automationOf(item) {
  const b = item?.flags?.[MODULE_ID]?.bestiary;
  if (!b) return null;
  if (b.automation) return b.automation;
  return BESTIARY[b.creature]?.features?.find(f => f.id === b.entryId)?.automation ?? null;
}

function _itemOf(message) {
  try {
    const item = message.getAssociatedItem?.();
    if (item) return item;
  } catch (_e) { /* brak powiązania */ }
  const uuid = message.getFlag("dnd5e", "item")?.uuid ?? message.getFlag("dnd5e", "use")?.itemUuid;
  try { return uuid ? fromUuidSync(uuid) : null; } catch (_e) { return null; }
}

/** Rzucający: zaznaczone żetony, inaczej postać gracza (jak dnd5e). */
function _rollers() {
  const tokens = canvas.tokens?.controlled?.filter(t => t.actor) ?? [];
  if (tokens.length) return tokens.map(t => ({ actor: t.actor, token: t }));
  const actor = game.user.character;
  return actor ? [{ actor, token: actor.getActiveTokens?.()[0] ?? null }] : [];
}

async function _rollAndDrop(item, { ability, dc }, event) {
  const rollers = _rollers();
  if (!rollers.length) {
    ui.notifications.warn("DND5E.ActionWarningNoToken", { localize: true });
    return;
  }
  for (const { actor, token } of rollers) {
    const speaker = ChatMessage.getSpeaker({ actor, scene: canvas.scene, token: token?.document });
    const rolls = await actor.rollSavingThrow({ event, ability, target: dc }, {}, { data: { speaker } });
    const roll = Array.isArray(rolls) ? rolls[0] : rolls;
    if (!roll || roll.total >= dc || !isDollActor(actor)) continue;
    const weapons = heldItems(actor).filter(h => h.item?.type === "weapon");
    for (const h of weapons) {
      await drop(actor, h.item, { from: h.slot, involuntary: true, reason: item.name });
    }
    if (weapons.length) {
      await ChatMessage.create({
        speaker,
        content: `<p><strong>${actor.name}</strong> oblewa RO (${roll.total} vs ST ${dc}) — broń leci na ziemię: `
          + `${weapons.map(h => h.item.name).join(", ")}.</p>`
      });
    }
  }
}

function _onRenderChatMessage(message, html) {
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root || root.dataset.neuroDropOnFail) return;
  const item = _itemOf(message);
  const auto = _automationOf(item);
  if (!auto?.dropOnFail) return;
  root.dataset.neuroDropOnFail = "1";

  let buttons = [...root.querySelectorAll('button[data-action="rollSave"]')];
  if (!buttons.length) {
    const label = CONFIG.DND5E.abilities?.[auto.ability]?.label ?? auto.ability;
    const host = root.querySelector(".card-buttons") ?? root.querySelector(".message-content");
    host?.insertAdjacentHTML("beforeend", `<button type="button" data-action="rollSave"
      data-ability="${auto.ability}" data-dc="${auto.dc}">
      <i class="fas fa-shield-heart" inert></i> RO: ${label} ST ${auto.dc}</button>`);
    buttons = [...root.querySelectorAll('button[data-action="rollSave"]')];
  }
  for (const btn of buttons) {
    btn.addEventListener("click", ev => {
      ev.preventDefault();
      ev.stopImmediatePropagation();
      const dc = Number(btn.dataset.dc) || auto.dc;
      _rollAndDrop(item, { ability: btn.dataset.ability ?? auto.ability, dc }, ev);
    }, { capture: true });
  }
}

export function registerDropOnFail() {
  Hooks.on("dnd5e.renderChatMessage", _onRenderChatMessage);
}
