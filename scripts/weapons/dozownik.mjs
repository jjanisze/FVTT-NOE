/**
 * Neuroshima 5e — Dozownik (poison dispenser) addon system.
 *
 * Broń z zainstalowanym Dozownikiem zyskuje zasób "Doza" (0/1).
 * Uzupełnienie: test Medycyny ST 12 (bez zasobu).
 * Na trafienie: -1 doza, +1k4 truciznowych obrażeń, RO na Kondycję ST 10
 *   (porażka = stan Zatrucie na 1 minutę).
 */

import { hasAddon } from "../config/addons-data.mjs";

const MODULE_ID  = "neuroshima-2026-overrides";
const DOSE_FLAG  = "dozownik-dose";   // 0 = pusta, 1 = załadowana
const SKILL_MED  = "med";             // klucz umiejętności Medycyna
const REFILL_DC  = 12;
const POISON_DC  = 10;
const POISON_DMG = "1d4";

/* ============================================================
 * Public API
 * ============================================================ */

export function registerDozownik() {
  // Doza na trafienie — hook postRollAttack (hit detection) + rollDamage fallback
  Hooks.on("dnd5e.postRollAttack", _onPostRollAttack);

  // Button "Uzupełnij dozę" w karcie czatu broni z dozownikiem
  Hooks.on("renderChatMessageHTML", _onRenderDozownikCard);

  // Deleguj kliknięcia w chat log
  Hooks.on("renderChatLog", _registerChatLogListener);

  console.log("Neuroshima 5e | Dozownik registered");
}

/** Wywołaj po installAddon("dozownik") — inicjuje zasób dozy. */
export async function initDose(weapon) {
  await weapon.setFlag(MODULE_ID, DOSE_FLAG, 0);
}

/** Wywołaj po removeAddon("dozownik") — czyści zasób. */
export async function clearDose(weapon) {
  await weapon.unsetFlag(MODULE_ID, DOSE_FLAG);
}

/** Zwraca true jeśli broń ma dozownik z naładowaną dozą. */
export function hasDose(weapon) {
  if (!hasAddon(weapon, "dozownik")) return false;
  return (weapon.getFlag(MODULE_ID, DOSE_FLAG) ?? 0) >= 1;
}

/* ============================================================
 * Refill flow
 * ============================================================ */

/**
 * Gracz klika "Uzupełnij dozę" — rzuca Medycyną ST 12.
 * Sukces → doza = 1.
 */
export async function refillDose(weapon) {
  const actor = weapon?.actor;
  if (!actor) return;

  const skill = actor.system?.skills?.[SKILL_MED];
  if (!skill) {
    ui.notifications.warn("Brak umiejętności Medycyna na tym aktorze.");
    return;
  }

  // Rzut Medycyną — dnd5e 5.x API: rollSkill({ skill }, dialog, message)
  const rolls = await actor.rollSkill(
    { skill: SKILL_MED },
    {},
    { data: { flavor: `Uzupełnianie dozy trucizny w Dozowniku (ST ${REFILL_DC})` } },
  );
  if (!rolls?.length) return;

  const total = rolls[0].total;
  const success = total >= REFILL_DC;

  const resultText = success
    ? `<strong>Sukces (${total} ≥ ${REFILL_DC})</strong> — Dozownik załadowany!`
    : `<em>Porażka (${total} < ${REFILL_DC})</em> — Trucizna marnuje się.`;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `
      <div class="dnd5e2 chat-card">
        <header class="card-header">
          <img src="${weapon.img}" style="width:36px;height:36px;border:none;margin-right:6px">
          <h3 style="flex:1">${weapon.name} — Dozownik</h3>
        </header>
        <div class="card-content" style="padding:6px 8px">
          ${resultText}
        </div>
      </div>
    `,
  });

  if (success) {
    await weapon.setFlag(MODULE_ID, DOSE_FLAG, 1);
    weapon.sheet?.render?.(false);
  }
}

/* ============================================================
 * Hit → consume dose + poison
 * ============================================================ */

async function _onPostRollAttack(rolls, { subject } = {}) {
  const item = subject?.item;
  if (!item || item.type !== "weapon") return;
  if (!hasDose(item)) return;

  // Sprawdź czy był hit — musimy mieć cel
  if (!game.user.targets?.size) return;

  const roll = rolls?.[0];
  if (!roll) return;

  const target = game.user.targets.first();
  const targetAc = target?.actor?.system?.attributes?.ac?.value;

  // Jedynka = automatyczne chybienie
  if (roll.isFumble) return;

  // Jeśli mamy AC celu, sprawdź trafienie
  if (targetAc !== undefined && roll.total < targetAc) return;

  await applyDose(item, target);
}

/**
 * Consume the dose on a weapon and send the poison chat card.
 * Called automatically on hit, or manually from the item sheet.
 * @param {Item5e} weapon
 * @param {Token5e|null} target  — targeted token, or null for no specific target
 */
export async function applyDose(weapon, target = null) {
  // Consume dose
  await weapon.setFlag(MODULE_ID, DOSE_FLAG, 0);
  weapon.sheet?.render?.(false);

  // Roll poison damage
  const dmgRoll = await new Roll(POISON_DMG).evaluate();
  const dmgTotal = dmgRoll.total;

  const targetName = target?.name ?? "cel";
  const targetActorId = target?.actor?.id;

  const content = `
    <div class="dnd5e2 chat-card">
      <header class="card-header">
        <img src="${weapon.img}" style="width:36px;height:36px;border:none;margin-right:6px">
        <h3 style="flex:1">${weapon.name} — Trucizna (Dozownik)</h3>
      </header>
      <div class="card-content" style="padding:6px 8px">
        <p><strong>${targetName}</strong> otrzymuje <strong>${dmgTotal} obrażeń od trucizny</strong>.</p>
        <p>Cel musi zdać <strong>RO na Kondycję ST ${POISON_DC}</strong> lub zostać Zatruty na 1 minutę.</p>
      </div>
      <ul class="card-footer pills unlist" style="padding:4px 8px">
        <li class="pill transparent"><span class="label">Trucizna ${dmgTotal} obl.</span></li>
        <li class="pill transparent"><span class="label">RO Kondycja ST ${POISON_DC}</span></li>
        ${targetActorId ? `<li class="pill neuro-poison-save" style="cursor:pointer;background:rgba(180,0,180,0.15);border:1px solid #b000b0"
            data-actor-id="${targetActorId}" data-dc="${POISON_DC}">
            <span class="label">↯ Rzuć RO</span>
          </li>` : ""}
      </ul>
    </div>
  `;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: weapon.actor }),
    content,
    rolls: [dmgRoll],
  });

  // Apply damage (GM only)
  if (game.user.isGM && target?.actor) {
    await target.actor.applyDamage([{ value: dmgTotal, type: "poison" }]);
  }
}

/* ============================================================
 * RO save button — klik w "Rzuć RO"
 * ============================================================ */

function _registerChatLogListener(app, html) {
  const el = html instanceof HTMLElement ? html : html?.[0];
  if (!el) return;

  el.addEventListener("click", async (event) => {
    const pill = event.target.closest(".neuro-poison-save");
    if (!pill) return;

    const actorId = pill.dataset.actorId;
    const dc = parseInt(pill.dataset.dc ?? "10", 10);
    const actor = game.actors.get(actorId);
    if (!actor) return;

    const rolls = await actor.rollSavingThrow(
      { ability: "con", targetValue: dc },
      {},
      { data: { flavor: `Rzut Obronny na Kondycję — Trucizna (ST ${dc})` } },
    );
    if (!rolls?.length) return;

    const total = rolls[0].total;
    if (total < dc) {
      // Nakładamy status Zatrucie
      await _applyPoisoned(actor);
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<p><strong>${actor.name}</strong> oblał RO (${total} < ${dc}) i zostaje <em>Zatruty</em> na 1 minutę.</p>`,
      });
    } else {
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `<p><strong>${actor.name}</strong> zdał RO (${total} ≥ ${dc}) — brak Zatrucia.</p>`,
      });
    }
  });
}

async function _applyPoisoned(actor) {
  const poisonedKey = "poisoned";
  const statusEffect = CONFIG.statusEffects?.find(e => e.id === poisonedKey);
  if (!statusEffect) return;

  // Nakładamy jako ActiveEffect z czasem 1 minuta (10 rund)
  await actor.createEmbeddedDocuments("ActiveEffect", [{
    ...statusEffect,
    name: statusEffect.name ?? "Zatrucie",
    icon: statusEffect.icon,
    duration: { rounds: 10 },
    statuses: [poisonedKey],
  }]);
}

/* ============================================================
 * Chat card — "Uzupełnij dozę" button on usage cards
 * ============================================================ */

function _onRenderDozownikCard(message, html) {
  if (!message.flags?.dnd5e?.activity) return;

  const itemUuid = message.flags?.dnd5e?.item?.uuid
    ?? message.flags?.dnd5e?.activity?.uuid?.split(".Activity.")[0];
  if (!itemUuid) return;

  const item = fromUuidSync(itemUuid);
  if (!item || item.type !== "weapon") return;
  if (!hasAddon(item, "dozownik")) return;
  if (!game.user.isGM && !item.isOwner) return;

  const dose = item.getFlag(MODULE_ID, DOSE_FLAG) ?? 0;
  const el = html instanceof HTMLElement ? html : html?.[0];
  if (!el) return;

  setTimeout(() => {
    const pillsList = el.querySelector("ul.card-footer.pills");
    if (!pillsList) return;
    // Nie wstrzykuj drugi raz
    if (pillsList.querySelector(".neuro-dozownik-pill")) return;

    const li = document.createElement("li");
    li.className = "pill neuro-dozownik-pill";
    li.style.cssText = dose
      ? "background:rgba(120,0,180,0.18);border:1px solid #7800b4;cursor:pointer"
      : "background:rgba(100,100,100,0.15);border:1px solid #888;cursor:pointer";
    li.title = dose ? "Doza załadowana — kliknij aby opróżnić podgląd" : "Brak dozy — kliknij aby uzupełnić (Medycyna ST 12)";
    li.dataset.itemUuid = item.uuid;
    li.innerHTML = dose
      ? `<i class="fa-solid fa-flask"></i> <span class="label">Doza ✓</span>`
      : `<i class="fa-regular fa-flask"></i> <span class="label">Doza ✗ — uzupełnij</span>`;

    li.addEventListener("click", async (ev) => {
      ev.stopPropagation();
      ev.preventDefault();
      if (dose) return; // już załadowana — nic nie rób
      const liveItem = fromUuidSync(item.uuid);
      if (liveItem) await refillDose(liveItem);
    });

    pillsList.appendChild(li);
  }, 0);
}
