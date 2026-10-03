/**
 * Neuroshima 5e — Dozownik (poison dispenser) addon system.
 *
 * Broń z zainstalowanym Dozownikiem zyskuje zasób "Doza" (0/1).
 * Uzupełnienie: test Medycyny ST 12 (bez zasobu).
 * Na trafienie: -1 doza, +1k4 truciznowych obrażeń, RO na Kondycję ST 10
 *   (porażka = stan Zatrucie na 1 minutę).
 *
 * „Na trafienie” = przy rzucie obrażeń, dla celu z werdyktem trafienia na karcie ataku
 * (`combat/trafienie.mjs`) — dopiero wtedy wiadomo, że cios trafił, także po reakcjach celu
 * (PLAN_tt Z6). Trucizna to zwykły rzut obrażeń z typem `poison`: MG nakłada ją natywną tacką
 * dnd5e na karcie, jak każde inne obrażenia (D8) — nic nie leci z klienta gracza wprost do PW.
 */

import { hasAddon } from "../config/addons-data.mjs";
import { hitTargetsForDamage } from "../combat/trafienie.mjs";

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
  // Doza na trafienie — przy rzucie obrażeń, dla trafionego celu z karty ataku.
  Hooks.on("dnd5e.rollDamage", _onRollDamage);

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

async function _onRollDamage(rolls, { subject } = {}) {
  const item = subject?.item ? (subject.item.actor?.items.get(subject.item.id) ?? subject.item) : null;
  if (!item || item.type !== "weapon" || !item.isOwner) return;
  if (!hasDose(item)) return;
  // Jedna doza = jedno trafienie: pierwszy trafiony cel.
  const [target] = hitTargetsForDamage(rolls).tokens;
  if (!target) return;
  await applyDose(item, target);
}

/**
 * Consume the dose on a weapon and send the poison card — a damage roll, so the GM applies it
 * from the native dnd5e tray. Called on a hit's damage roll, or manually from the item sheet.
 * @param {Item5e} weapon
 * @param {Token5e|TokenDocument|null} target  — hit token, or null for no specific target
 */
export async function applyDose(weapon, target = null) {
  // Consume dose
  await weapon.setFlag(MODULE_ID, DOSE_FLAG, 0);
  weapon.sheet?.render?.(false);

  // Roll poison damage
  const dmgRoll = new CONFIG.Dice.DamageRoll(POISON_DMG, {}, { type: "poison" });
  await dmgRoll.evaluate();
  const dmgTotal = dmgRoll.total;

  const tokenDoc = target?.document ?? target;
  const targetActor = tokenDoc?.actor ?? null;
  const targetName = tokenDoc?.name ?? targetActor?.name ?? "cel";
  const targetActorUuid = targetActor?.uuid;
  // Tacka dnd5e w trybie „Wycelowane” czyta `flags.dnd5e.targets` (UUID aktora).
  const trayTargets = targetActor ? [{
    name: targetName, img: tokenDoc?.texture?.src ?? targetActor.img, uuid: targetActor.uuid,
    ac: targetActor.system?.attributes?.ac?.value ?? null
  }] : [];

  const content = `
    <div class="dnd5e2 chat-card">
      <header class="card-header">
        <img src="${weapon.img}" style="width:36px;height:36px;border:none;margin-right:6px">
        <h3 style="flex:1">${weapon.name} — Trucizna (Dozownik)</h3>
      </header>
      <div class="card-content" style="padding:6px 8px">
        <p><strong>${targetName}</strong>: <strong>${dmgTotal} obrażeń od trucizny</strong> — MG nakłada tacką poniżej.</p>
        <p>Cel musi zdać <strong>RO na Kondycję ST ${POISON_DC}</strong> lub zostać Zatruty na 1 minutę.</p>
      </div>
      <ul class="card-footer pills unlist" style="padding:4px 8px">
        <li class="pill transparent"><span class="label">Trucizna ${dmgTotal} obl.</span></li>
        <li class="pill transparent"><span class="label">RO Kondycja ST ${POISON_DC}</span></li>
        ${targetActorUuid ? `<li class="pill neuro-poison-save" style="cursor:pointer;background:rgba(180,0,180,0.15);border:1px solid #b000b0"
            data-actor-uuid="${targetActorUuid}" data-dc="${POISON_DC}">
            <span class="label">↯ Rzuć RO</span>
          </li>` : ""}
      </ul>
    </div>
  `;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: weapon.actor }),
    content,
    rolls: [dmgRoll],
    flags: { dnd5e: { roll: { type: "damage" }, targets: trayTargets } },
  });
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

    // UUID aktora, nie id — niepowiązany żeton ma aktora syntetycznego (DEV_GUIDE §10e.3).
    // `data-actor-id` zostaje dla kart sprzed 2026-10.
    const dc = parseInt(pill.dataset.dc ?? "10", 10);
    const actor = pill.dataset.actorUuid ? fromUuidSync(pill.dataset.actorUuid) : game.actors.get(pill.dataset.actorId);
    if (!actor) return;

    const rolls = await actor.rollSavingThrow(
      { ability: "con", target: dc },
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
