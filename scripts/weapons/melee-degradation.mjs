import { playWeaponSound, WeaponSound } from "./sounds.mjs";
import { hasAddon } from "../config/addons-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const DEGRADATION_FLAG = "degradation";

export function registerMeleeDegradation() {
  Hooks.on("dnd5e.postRollAttack", onPostRollAttack);
  Hooks.on("renderItemSheet5e", onRenderItemSheet);

  // Character-sheet inventory row highlight for a chipped/notched blade — same three
  // hook names as addons-inventory.mjs's own row highlight, for the same reason
  // (covers whichever concrete sheet class actually renders).
  for ( const hookName of ["renderActorSheet", "renderCharacterActorSheet", "renderNPCActorSheet"] ) {
    Hooks.on(hookName, _onRenderActorSheetHighlightDegraded);
  }

  const mod = game.modules.get(MODULE_ID);
  if (mod) {
    mod.api ??= {};
    mod.api.meleeDegradation = {
      isMeleeWeapon,
      degradeWeapon,
      repairWeapon,
      attemptRepairMelee
    };
  }

  console.log("Neuroshima 5e | Melee weapon degradation core registered");
}

export function isMeleeWeapon(item) {
  return item?.type === "weapon" && item?.system?.type?.value === "biala";
}

/**
 * Zwraca informacje o degradacji: originalDenomination, currentDenomination.
 */
export function getDegradationState(item) {
  return item?.getFlag(MODULE_ID, DEGRADATION_FLAG) ?? {};
}

const DIE_CHAIN = [12, 10, 8, 6, 4, 1];

function getNextSmallerDie(current) {
  if (current == null) return null;
  const index = DIE_CHAIN.indexOf(current);
  if (index === -1) {
    // Jeżeli nie ma w liście, a jest np. k20 (choć nie ma broni melee k20 normalnie)
    const closest = DIE_CHAIN.find(d => d < current);
    return closest ?? 1;
  }
  if (index < DIE_CHAIN.length - 1) {
    return DIE_CHAIN[index + 1];
  }
  return 1; // Jeśli k4 to spada do 1 (lub innej wartości)
}

export async function degradeWeapon(item, { chat = true } = {}) {
  if (!isMeleeWeapon(item)) return false;
  // Utwardzenie: broń nie ulega uszkodzeniu podczas walki
  if (hasAddon(item, "utwardzenie")) return false;

  const currentDamage = item.system.damage?.base;
  if (!currentDamage) return false;

  const state = getDegradationState(item);
  const currentToken = state.currentDenomination ?? currentDamage.denomination;
  const originalToken = state.originalDenomination ?? currentDamage.denomination;

  // Możliwe, że to broń, która używa innej kości lub number (np. 1 obrażenie z samej siły)
  if (!currentToken || currentToken === 1) return false; // Już jest minimum

  const nextToken = getNextSmallerDie(currentToken);
  if (!nextToken || nextToken === currentToken) return false;

  // Aktualizuj flagi
  await item.setFlag(MODULE_ID, DEGRADATION_FLAG, {
    originalDenomination: originalToken,
    currentDenomination: nextToken
  });

  // Aktualizuj sam przedmiot by używał nowej kości (jeśli to nie jest 1, k1 zmieniamy na np. denomination = "" / number = 1 w dnd5e)
  // W dnd5e v3 system.damage.base.denomination to liczba (np. 12, 8). 
  // Jeżeli osiągamy 1, zazwyczaj usuwamy denomination i zmieniamy number na 1.
  if (nextToken === 1) {
    await item.update({
      "system.damage.base.number": 1,
      "system.damage.base.denomination": null // k1 to zazwyczaj samo 1 w dnd5e
    });
  } else {
    await item.update({
      "system.damage.base.denomination": nextToken
    });
  }

  // Naostrzenie is LOST when the weapon is damaged (RAW: "+1 ... do czasu
  // uszkodzenia broni"). The sharpening is physically ruined together with the
  // edge — remove it entirely, without refunding the loot item, and do not
  // restore it on repair (the player must buy/install it again).
  const hadNaostrzenie = hasAddon(item, "naostrzenie");
  if (hadNaostrzenie) {
    const { removeAddon } = await import("./addons.mjs");
    await removeAddon(item, "naostrzenie", { refund: false });
  }

  if (chat) {
    const naostrzenieNote = hadNaostrzenie
      ? " Osełka została zniszczona wraz z ostrzem." : "";
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: item.actor }),
      content: `<div><strong>Pechowa jedynka!</strong> Broń <strong>${item.name}</strong> stępia się lub wyszczerbia! Jej kość obrażeń spada do k${nextToken === 1 ? '1 / 1 obl.' : nextToken} i wymaga naprawy.${naostrzenieNote}</div>`
    });
    // Play katana chipping / degradation sound
    playWeaponSound(WeaponSound.MELEE_DEGRADE);
  }

  return true;
}

export async function repairWeapon(item, { chat = true } = {}) {
  if (!isMeleeWeapon(item)) return false;

  const state = getDegradationState(item);
  if (!state.originalDenomination) {
    ui.notifications?.info("Ta broń nie wymaga naprawy krawędzi.");
    return false;
  }

  // Przywróć wartości
  await item.setFlag(MODULE_ID, DEGRADATION_FLAG, { currentDenomination: state.originalDenomination }); // Możemy też usunąć flagę current

  await item.update({
    "system.damage.base.denomination": state.originalDenomination,
    "system.damage.base.number": 1 // domyślnie rzuty w dnd to zazwyczaj 1d8
  });

  // Oczyść flagę po naprawie
  await item.unsetFlag(MODULE_ID, DEGRADATION_FLAG);

  // Naostrzenie is NOT restored on repair — it was destroyed when the weapon
  // was damaged (RAW). The player must install a new one.

  if (chat) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: item.actor }),
      content: `<div>Broń <strong>${item.name}</strong> została naostrzona / naprawiona. Jej kość obrażeń wraca do k${state.originalDenomination}.</div>`
    });
  }

  return true;
}

/**
 * Naprawa wyszczerbionej broni białej — przez tabelę naprawy (PLAN_produkcja §11, D17): stopień
 * wg liczby kroków kości od oryginału (1 — Drobnostka, 2 — Trochę roboty, 3+ — Skomplikowana
 * harówa), z kosztem i czasem z tego samego wiersza. Dawniej stałe ST 15 i „Akcja” — RAW daje co
 * najmniej 1k4 minut. Udana naprawa kończy się `repairWeapon()` (przywraca oryginał w całości).
 * Import dynamiczny: `production/naprawa.mjs` sam importuje ten plik.
 */
export async function attemptRepairMelee(item) {
  if (!isMeleeWeapon(item) || !item.actor) return false;
  if (!getDegradationState(item).originalDenomination) return false;
  const { oknoNaprawy } = await import("../production/naprawa.mjs");
  return oknoNaprawy(item.actor, item);
}

async function onPostRollAttack(rolls, { subject } = {}) {
  const item = subject?.item;
  if (!isMeleeWeapon(item)) return;

  // Szukamy jedynki w jakichkolwiek rzutach z ataku
  if (!rolls?.some(roll => roll?.isFumble)) return;

  await degradeWeapon(item, { chat: true });
}

function onRenderItemSheet(app, html) {
  const item = app.document ?? app.item;
  if (!isMeleeWeapon(item)) return;

  const state = getDegradationState(item);
  if (!state.originalDenomination) return; // Broń jest OK, bez panelu degradacji (lub opcjonalnie "Stan krawędzi: Dobry")

  // Wyszukaj nagłówek / panel (szczegóły)
  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;

  const descSection = root.querySelector("section[data-tab='details'], .details.tab") ?? root.querySelector("form") ?? root;

  const isDegraded = state.currentDenomination < state.originalDenomination;

  if (isDegraded) {
    const requirement = `Naprawa wg tabeli (s. 146): im więcej kroków kości w dół, tym wyższy stopień — `
      + `ST, koszt i czas w oknie naprawy.`;

    const div = document.createElement("div");
    div.classList.add("form-group", "stacked", "neuro-weapon-maintenance-panel");
    div.style.border = "1px dashed #aa0000";
    div.style.padding = "5px";
    div.style.marginTop = "5px";

    div.innerHTML = `
      <h3 style="color:#aa0000; display:flex; justify-content:space-between; align-items:center;">
        <span>Stępiona / Wyszczerbiona Broń!</span>
        <button type="button" class="neuro-repair-melee-btn" style="width:auto; font-size:12px; padding:0 8px;">
          <i class="fas fa-hammer"></i> Napraw broń…
        </button>
      </h3>
      <p style="font-size: 12px; color: #666; margin-top:2px;">Bieżąca kość obrażeń spadła do <strong>k${state.currentDenomination ?? 1}</strong>. ${requirement}</p>
    `;

    // Podepnij obsługę — patrz attemptRepairMelee(): okno naprawy z tabeli (D17).
    div.querySelector(".neuro-repair-melee-btn").addEventListener("click", async (e) => {
      e.preventDefault();
      await attemptRepairMelee(item);
    });

    const header = descSection.querySelector("h3");
    if (header) {
      header.parentNode.insertBefore(div, header.nextSibling);
    } else {
      descSection.prepend(div);
    }
  }
}

/**
 * Highlight chipped/notched melee weapons in the actor's inventory list — the "damaged"
 * counterpart to addons-inventory.mjs's golden `.neuro-has-addons` glow, deliberately in
 * shades of red instead so the two states never read as "the same golden thing". Two
 * severity tiers, matching the firearm side's jammed/damaged split in `jams.mjs`:
 * 1 step down `DIE_CHAIN` = "bad" (`neuro-degraded-1`), 2+ steps = "worse"
 * (`neuro-degraded-2`, shares styling with a firearm's `.neuro-weapon-damaged` in
 * `neuroshima.css` — "needs real repair" reads the same regardless of weapon family).
 */
function _onRenderActorSheetHighlightDegraded(app, html) {
  const actor = app.document ?? app.actor;
  if (!actor) return;

  const root = html instanceof HTMLElement ? html
    : html?.[0] instanceof HTMLElement ? html[0]
    : html?.element instanceof HTMLElement ? html.element
    : null;
  if (!root) return;

  root.querySelectorAll(".item[data-item-id]").forEach(row => {
    const item = actor.items.get(row.dataset.itemId);
    if (!isMeleeWeapon(item)) return;
    const state = getDegradationState(item);
    if (!state.originalDenomination) return;
    const steps = _degradationSteps(state.originalDenomination, state.currentDenomination);
    if (steps <= 0) return;
    row.classList.add("neuro-degraded", `neuro-degraded-${Math.min(steps, 2)}`);
  });
}

/** How many `DIE_CHAIN` slots the weapon has fallen from its original denomination. */
function _degradationSteps(original, current) {
  const oi = DIE_CHAIN.indexOf(original);
  const ci = DIE_CHAIN.indexOf(current ?? original);
  if (oi === -1 || ci === -1) return 0;
  return Math.max(0, ci - oi);
}
