import { playWeaponSound, WeaponSound } from "./sounds.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const DEGRADATION_FLAG = "degradation";

export function registerMeleeDegradation() {
  Hooks.on("dnd5e.postRollAttack", onPostRollAttack);
  Hooks.on("renderItemSheet5e", onRenderItemSheet);

  const mod = game.modules.get(MODULE_ID);
  if (mod) {
    mod.api ??= {};
    mod.api.meleeDegradation = {
      isMeleeWeapon,
      degradeWeapon,
      repairWeapon
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

  if (chat) {
    const actorName = item.actor?.name ?? "Ktoś";
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: item.actor }),
      content: `<div><strong>Pechowa jedynka!</strong> Broń <strong>${item.name}</strong> stępia się lub wyszczerbia! Jej kość obrażeń spada do k${nextToken === 1 ? '1 / 1 obl.' : nextToken} i wymaga naprawy.</div>`
    });    
    // Play katana chipping / degradation sound
    playWeaponSound(WeaponSound.MELEE_DEGRADE);  }

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

  if (chat) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: item.actor }),
      content: `<div>Broń <strong>${item.name}</strong> została naostrzona / naprawiona. Jej kość obrażeń wraca do k${state.originalDenomination}.</div>`
    });
  }

  return true;
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
    const div = document.createElement("div");
    div.classList.add("form-group", "stacked", "neuro-weapon-maintenance-panel");
    div.style.border = "1px dashed #aa0000";
    div.style.padding = "5px";
    div.style.marginTop = "5px";

    div.innerHTML = `
      <h3 style="color:#aa0000; display:flex; justify-content:space-between; align-items:center;">
        <span>Stępiona / Wyszczerbiona Broń!</span>
        <button type="button" class="neuro-repair-melee-btn" style="width:auto; font-size:12px; padding:0 8px;">
          <i class="fas fa-hammer"></i> Napraw (k${state.originalDenomination})
        </button>
      </h3>
      <p style="font-size: 12px; color: #666; margin-top:2px;">Bieżąca kość obrażeń spadła do <strong>k${state.currentDenomination ?? 1}</strong>. Należy zapłacić rzemieślnikowi lub użyć narzędzi.</p>
    `;

    // Podepnij obsługę
    div.querySelector(".neuro-repair-melee-btn").addEventListener("click", async (e) => {
      e.preventDefault();
      await repairWeapon(item, { chat: true });
    });

    const header = descSection.querySelector("h3");
    if (header) {
      header.parentNode.insertBefore(div, header.nextSibling);
    } else {
      descSection.prepend(div);
    }
  }
}
