/**
 * Neuroshima 5e — Mały medyk (medic toolkit) "Przywracanie PW".
 *
 * The medyk tool item carries a "Przywracanie PW" utility activity flagged with
 * `flags.neuroshima-2026-overrides.medykHeal`. When that activity is used we:
 *   1. resolve the patient from FoundryVTT token selection (targets → controlled),
 *   2. gate on proficiency (without it: only auto-stabilisation),
 *   3. consume one of the medicine supplies (native `system.uses`),
 *   4. roll an Int (narzędzia małego medyka) tool check and read the tier:
 *        5+ → 1k4 | 10+ → 1k4+INT | 15+ → 2k4+INT | 20+ → 3k4+INT | 25+ → 4k4+INT
 *   5. apply the healing (dnd5e applyDamage with a "healing" type),
 *   6. show it graphically via Sequencer (green VFX + floating "+X" text) and play a sound.
 *
 * Sztuczki (feats) modifiers, detected by feat name on the medic:
 *   • Pan Plaster        → the kit rolls one extra healing die (+1k4).
 *   • Aspiryna i Miętusy → may heal with an EMPTY kit, but such tool checks are rolled
 *                          with Utrudnienie (Disadvantage) and consume no supplies.
 *
 * Restocking is intentionally NOT a chat action: the supply lives on the item's native
 * "charges" (`system.uses`), editable on the inventory row / item sheet (≈5 gb at a trader).
 *
 * The redundant native activity usage card is suppressed (see `dnd5e.preUseActivity`) so a
 * single heal produces just TWO chat messages: the tool-check roll + the heal summary.
 *
 * Docs: dnd5e applyDamage (healing type), Sequencer effect/scrolling-text/sound.
 *
 * ## Uzupełnienie Narzędzi Małego Medyka (2026-09-06, batch 40) — a real refill item
 *
 * RAW anchor (podręcznik, "MAŁY MEDYK" + "UZUPEŁNIENIE NARZĘDZI MAŁEGO MEDYKA"): "Narzędzia
 * małego medyka posiadają zapas medykamentów na pięciokrotne leczenie. Jedno uzupełnienie
 * kosztuje zazwyczaj 5 gambli" + a named refill kit ("zestaw bandaży, plastrów, igieł i
 * strzykawek, ampułki ze środkami przeciwbólowymi, adrenaliną i witaminami"). The doc comment
 * above already documented restocking as "intentionally NOT a chat action... editable on the
 * item sheet" — still true as a FALLBACK, but there was never an actual purchasable/trackable
 * item standing in for "one of these refill kits", despite the book naming one and three
 * different toolkits (aptekarza/krawca/medyka) listing "bandaże" as a producible output with
 * nothing behind it. `createMedykRefillItem`/`createMedykRefillStock` below build it as a real
 * `consumable` with a "Uzupełnij zapas" utility activity — one unit tops the paired Mały medyk
 * kit back to full (RAW frames refilling as restoring "a supply for five heals", not adding
 * charges one at a time, so this refills to MAX, it doesn't add +1) and is consumed doing so.
 * Same GM-relay-FREE shape as Flara/Kolczatki otherwise (`isX`/`buildXItemData`/`createXItem`/
 * `createXStock`/`ensureXActivities` with a single-flight guard) — no privileged Scene write is
 * needed here at all, this only ever touches items on the SAME actor.
 */

import { MEDYK_HEAL_FLAG, MEDYK_MAX_CHARGES } from "../config/toolkits-data.mjs";
import { seqScrollText } from "../weapons/sequencer.mjs";

const MODULE_ID  = "neuroshima-2026-overrides";
const TOOL_KEY   = "medyka";
const REFILL_COST = 5;            // gb (informational — restock happens on the item, not chat)
const HEAL_SOUND = `modules/${MODULE_ID}/sounds/misc/medyk_heal.ogg`;
const HEAL_COLOR = "#39ff14";     // bright green

/* -------------------------------------------- */
/*  Uzupełnienie Narzędzi Małego Medyka (refill item)                                          */
/* -------------------------------------------- */

const REFILL_MARKER = "medykRefill";          // bool — identifies a refill-kit item
const REFILL_USE_ID = "medyk-refill-uzyj";
const REFILL_NAME = "Uzupełnienie Narzędzi Małego Medyka";
// TODO(icons): no dedicated art commissioned yet — core Foundry heal icon as an honest interim
// placeholder (same "not a finished-art claim" role `hazard.svg` plays for gear-data.mjs's own
// TODO stubs), rather than borrowing Medpak's specific icon and risking two different items
// reading as the same thing in an inventory list that could plausibly hold both at once.
const REFILL_IMG = "icons/svg/heal.svg";
const REFILL_PRICE = REFILL_COST; // 5 gb — RAW, same number the doc comment above already quoted.
const REFILL_WEIGHT = 0.5;        // kg — GM estimate, not in RAW (book gives no weight for this kit).
const REFILL_AVAIL = 50;          // % — GM estimate, not in RAW.
const REFILL_DESCRIPTION =
  `<p><strong>Cena:</strong> ${REFILL_PRICE} gb &nbsp;|&nbsp; <strong>Waga:</strong> ${REFILL_WEIGHT} kg `
  + `&nbsp;|&nbsp; <strong>Dostępność:</strong> ${REFILL_AVAIL}%</p>`
  + `<p>Zestaw bandaży, plastrów, igieł i strzykawek oraz ampułek ze środkami przeciwbólowymi, `
  + `adrenaliną i witaminami — pozwala szybko opatrzyć rany i uzupełnić `
  + `<strong>Narzędzia małego medyka</strong> do pełnego zapasu (${MEDYK_MAX_CHARGES}/${MEDYK_MAX_CHARGES}).</p>`
  + `<p><em>Waga i dostępność to szacunek MG — podręcznik opisuje ten zestaw tylko fabularnie, `
  + `bez osobnej tabeli wagi/dostępności (cena ${REFILL_PRICE} gb jest za to wprost RAW).</em></p>`;

function _isMedykKit(item) {
  return item?.type === "tool" && item?.system?.type?.baseItem === TOOL_KEY;
}

export function isMedykRefill(item) {
  return item?.type === "consumable" && !!item?.getFlag?.(MODULE_ID, REFILL_MARKER);
}

function _getRefillActivity(item) {
  return item.system.activities?.find(a => a.visibility?.identifier === REFILL_USE_ID) ?? null;
}

/**
 * Runs the full "Uzupełnij zapas" flow: tops the actor's Mały medyk kit back to full and
 * consumes one unit of this refill item. Exported directly (not via `__testing`) — same
 * "significant flow, callable from a macro or a test" precedent as `healWithMedyk` above,
 * not a bare private predicate.
 * @param {Item5e} item  The refill-kit item.
 */
export async function useMedykRefill(item) {
  item = item?.actor?.items?.get(item.id) ?? item;
  const actor = item?.actor;
  if (!actor) { ui.notifications.warn("Uzupełnienie wymaga, żeby leżało w ekwipunku postaci."); return; }

  const qty = Number(item.system.quantity ?? 0);
  if (qty <= 0) { ui.notifications.warn(`${item.name}: brak sztuk.`); return; }

  const kit = actor.items.find(_isMedykKit);
  if (!kit) {
    ui.notifications.warn(`${actor.name} nie ma Narzędzi małego medyka do uzupełnienia.`);
    return;
  }

  const max = Number(kit.system.uses?.max) || MEDYK_MAX_CHARGES;
  const spent = Number(kit.system.uses?.spent ?? 0);
  if (spent <= 0) {
    ui.notifications.info(`${kit.name}: zapas już pełny (${max}/${max}) — uzupełnienie nie zużyte.`);
    return;
  }

  await kit.update({ "system.uses.spent": 0 });

  const newQty = qty - 1;
  if (newQty <= 0) await item.delete();
  else await item.update({ "system.quantity": newQty });

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-flara-card"><div class="neuro-flara-head">${REFILL_NAME}</div>`
      + `<p>Uzupełnia <strong>${kit.name}</strong> do pełna: <strong>${max}/${max}</strong>.</p>`
      + `<p><em>Zostało uzupełnień: ${newQty} szt.</em></p></div>`
  });
}

const _ensuringRefillActivities = new Map();

/** Same single-flight guard as `flara.mjs`'s `ensureFlaraActivities` — see its comment. */
export function ensureMedykRefillActivities(item) {
  if (!isMedykRefill(item)) return Promise.resolve();
  const key = item.uuid ?? item.id;

  const inFlight = _ensuringRefillActivities.get(key);
  if (inFlight) return inFlight;

  const promise = _ensureMedykRefillActivitiesUnguarded(item).finally(() => {
    _ensuringRefillActivities.delete(key);
  });
  _ensuringRefillActivities.set(key, promise);
  return promise;
}

async function _ensureMedykRefillActivitiesUnguarded(item) {
  if (!_getRefillActivity(item)) {
    await item.createActivity("utility", {
      name: "Uzupełnij zapas",
      img: `modules/${MODULE_ID}/icons/tools/medyka.svg`,
      activation: { type: "action" },
      visibility: { identifier: REFILL_USE_ID },
      description: { chatFlavor: "Uzupełnia zapas medykamentów Narzędzi małego medyka do pełna." }
    }, { renderSheet: false });
  }
}

export function buildMedykRefillItemData() {
  return {
    name: REFILL_NAME,
    type: "consumable",
    img: REFILL_IMG,
    system: {
      type: { value: "trinket", subtype: "" },
      description: { value: REFILL_DESCRIPTION, chat: "" },
      weight: { value: REFILL_WEIGHT, units: "kg" },
      price: { value: REFILL_PRICE, denomination: "gp" },
      quantity: 1,
      uses: { max: "", spent: 0, recovery: [] },
      identifier: "medyk-refill",
      activities: {}
    },
    flags: { [MODULE_ID]: { [REFILL_MARKER]: true } }
  };
}

/** Creates a brand new refill-kit item (world item, or embedded on `actor`). */
export async function createMedykRefillItem({ actor, quantity = 1 } = {}) {
  const data = buildMedykRefillItemData();
  data.system.quantity = quantity;

  const created = actor
    ? (await actor.createEmbeddedDocuments("Item", [data]))[0]
    : await Item.create(data);
  if (!created) throw new Error("Medyk refill: createEmbeddedDocuments/Item.create returned nothing");

  await ensureMedykRefillActivities(created);
  return created;
}

/** Seeds/refreshes the Zbrojownia's own display copy — same shape as `flara.mjs`'s `createFlaraStock`. */
export async function createMedykRefillStock(actor) {
  actor ??= game.actors.find(a => a.getFlag(MODULE_ID, "isZbrojownia"));
  if (!actor) { ui.notifications.error("Brak aktora Zbrojownia (flaga isZbrojownia)."); return null; }

  const existing = actor.items.find(i => isMedykRefill(i));
  const data = buildMedykRefillItemData();

  if (existing) await existing.update(data);
  else await actor.createEmbeddedDocuments("Item", [data]);

  for (const item of actor.items.filter(i => isMedykRefill(i))) await ensureMedykRefillActivities(item);

  ui.notifications.info(`Zbrojownia: ${REFILL_NAME} ${existing ? "zaktualizowane" : "dodane"}.`);
  return { created: existing ? 0 : 1, updated: existing ? 1 : 0 };
}

/** Backfill: any refill-kit item already in the world that's missing its activity gets it. */
async function ensureAllMedykRefillActivities() {
  const items = [...game.items, ...game.actors.map(a => [...a.items]).flat()];
  for (const item of items) {
    if (isMedykRefill(item) && !_getRefillActivity(item)) await ensureMedykRefillActivities(item);
  }
}

/** Public API, exposed on `game.neuroshima.medykRefill` from main.mjs. */
export const medykRefillApi = {
  create: createMedykRefillItem,
  stock: createMedykRefillStock,
};

/** Heal tiers: highest threshold first. `mod` = add INT modifier. */
const HEAL_TIERS = [
  { min: 25, dice: 4, mod: true },
  { min: 20, dice: 3, mod: true },
  { min: 15, dice: 2, mod: true },
  { min: 10, dice: 1, mod: true },
  { min: 5,  dice: 1, mod: false }
];

/**
 * Transient context for the current medyk heal roll, read by the roll-dialog render hook to
 * inject the "Aspiryna i Miętusy" choice. Set right before `rollToolCheck`, cleared after.
 * @type {{aspirynaAvailable: boolean, empty: boolean, aspirynaChosen: boolean}|null}
 */
let _rollCtx = null;

/* ============================================================
 * Sztuczka (feat) detection
 * ============================================================ */

const _norm = s => (s || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

/** True if the actor carries a feat whose name/identifier matches any keyword. */
function _hasFeat(actor, keywords) {
  return actor.items.some(i => i.type === "feat"
    && keywords.some(k => _norm(i.name).includes(k) || _norm(i.system?.identifier).includes(k)));
}

/* ============================================================
 * Registration
 * ============================================================ */

export function registerMedyk() {
  Hooks.on("dnd5e.preUseActivity", _onPreUseActivity);
  Hooks.on("dnd5e.postUseActivity", _onPostUseActivity);
  Hooks.on("renderChatLog", _registerChatLogListener);
  Hooks.on("renderSkillToolRollConfigurationDialog", _onRenderRollDialog);

  // Uzupełnienie Narzędzi Małego Medyka — same createItem-backfill idiom as flara.mjs/kolczatka.mjs.
  Hooks.on("createItem", (item) => { if (game.user.isGM) ensureMedykRefillActivities(item); });
  // Unlike flara.mjs/kolczatka.mjs, registerMedyk() is called from main.mjs's `init` block, not
  // its `ready` block — `game.user` is unconditionally null during `init` (confirmed in Foundry's
  // own client/game.mjs: `initialize()` fires the `init` hook before `setupGame()` ever runs
  // `initializeDocuments()`, which is what populates `game.user`). Reading `.isGM` eagerly here
  // threw on every load, aborting the rest of main.mjs's shared init callback silently — everything
  // registered after registerMedyk() (party sheet, sheet-shell, map-watch, …) never ran. Defer the
  // one-time backfill to `ready`, same as the createItem listener above already defers per-item. (2026-09-07)
  Hooks.once("ready", () => { if (game.user.isGM) ensureAllMedykRefillActivities(); });

  console.log("Neuroshima 5e | Medyk (Przywracanie PW + uzupełnienie) registered");
}

/* ============================================================
 * Aspiryna i Miętusy — roll-dialog choice injection
 * ============================================================ */

/**
 * Inject the "Aspiryna i Miętusy" checkbox into the medyk heal roll dialog. Selecting it means
 * "heal without supplies" (no charge consumed); when the kit is empty it is pre-checked. The
 * disadvantage default is set on the roll config, so the player can still override adv/dis via
 * the dialog buttons (e.g. the placebo case).
 */
function _onRenderRollDialog(app, element) {
  if ( !_rollCtx?.aspirynaAvailable ) return;
  const el = element instanceof HTMLElement ? element : element?.[0];
  if ( !el ) return;
  const form = el.querySelector("form") ?? el;

  // ApplicationV2 dialogs re-render the whole form on change, wiping injected DOM. Treat
  // `_rollCtx.aspirynaChosen` as the source of truth: recreate the field if missing and sync
  // the checkbox FROM the persisted state each render.
  let group = form.querySelector(".neuro-aspiryna-field");
  if ( !group ) {
    group = document.createElement("div");
    group.className = "form-group neuro-aspiryna-field";
    group.innerHTML = `
      <label>Sztuczka: Aspiryna i Miętusy</label>
      <div class="form-fields">
        <input type="checkbox" name="neuroAspiryna">
      </div>
      <p class="hint">Leczysz bez zapasów (domyślnie Utrudnienie) — nie zużywasz medykamentów.</p>`;
    const anchor = form.querySelector(".form-group") ?? form.firstElementChild;
    if ( anchor?.parentElement ) anchor.parentElement.insertBefore(group, anchor);
    else form.prepend(group);
    group.querySelector("input").addEventListener("change", (e) => {
      if ( _rollCtx ) _rollCtx.aspirynaChosen = e.target.checked;
    });
  }
  group.querySelector("input").checked = !!_rollCtx.aspirynaChosen;
}

/* ============================================================
 * Activity trigger
 * ============================================================ */

/** Suppress the redundant native usage card for the heal activity (3 → 2 messages). */
function _onPreUseActivity(activity, _usageConfig, _dialogConfig, messageConfig) {
  if ( activity?.flags?.[MODULE_ID]?.[MEDYK_HEAL_FLAG] ) messageConfig.create = false;
  if ( activity?.visibility?.identifier === REFILL_USE_ID ) messageConfig.create = false;
}

async function _onPostUseActivity(activity, _usageConfig, _results) {
  if ( activity?.visibility?.identifier === REFILL_USE_ID ) {
    const item = activity.item;
    if ( item ) await useMedykRefill(item);
    return;
  }
  if ( !activity?.flags?.[MODULE_ID]?.[MEDYK_HEAL_FLAG] ) return;
  const item  = activity.item;
  const medic = activity.actor;
  if ( !item || !medic ) return;
  await healWithMedyk(medic, item);
}

/* ============================================================
 * Token selection (FoundryVTT)
 * ============================================================ */

/**
 * Resolve the patient token: prefer the user's target, then a controlled token
 * (excluding the medic's own token).
 * @param {Actor} medic
 * @returns {Token|null}
 */
function _resolvePatientToken(medic) {
  const targets = Array.from(game.user.targets ?? []);
  if ( targets.length ) return targets[0];
  const controlled = (canvas.tokens?.controlled ?? []).filter(t => t.actor && t.actor !== medic);
  if ( controlled.length ) return controlled[0];
  return null;
}

/* ============================================================
 * Core heal flow
 * ============================================================ */

/**
 * Run the full "Przywracanie PW" flow for a medic and their medyk kit.
 * @param {Actor} medic
 * @param {Item5e} item   The medyk tool item.
 */
export async function healWithMedyk(medic, item) {
  const patientToken = _resolvePatientToken(medic);
  if ( !patientToken?.actor ) {
    ui.notifications.warn("Wskaż pacjenta — oznacz (target) lub zaznacz token przed użyciem.");
    return;
  }
  const patient = patientToken.actor;

  const isProficient = (medic.system.tools?.[TOOL_KEY]?.value ?? 0) > 0;

  // Without proficiency: only automatic stabilisation of an ally.
  if ( !isProficient ) {
    await _stabilise(medic, patient);
    return;
  }

  // Sztuczki (feats)
  const hasPanPlaster = _hasFeat(medic, ["plaster"]);
  const hasAspiryna   = _hasFeat(medic, ["aspiryna", "mietus"]);

  // Medicine supply lives on the item's native charges (system.uses).
  const uses = item.system.uses ?? {};
  const max = Number(uses.max) || MEDYK_MAX_CHARGES;
  const remaining = Number(uses.value ?? (max - (uses.spent ?? 0)));
  const empty = remaining <= 0;

  // Empty kit: blocked, unless "Aspiryna i Miętusy" lets you improvise (at Disadvantage).
  if ( empty && !hasAspiryna ) {
    ui.notifications.warn(
      `Brak medykamentów w zestawie (0/${max}). Uzupełnij ładunki na karcie przedmiotu (≈${REFILL_COST} gb u handlarza).`
    );
    return;
  }

  // Int (narzędzia małego medyka) tool check. The dialog shows adv/dis; when the medic has
  // Aspiryna i Miętusy it also carries the "bez zapasów" choice (see _onRenderRollDialog).
  // Empty kit → the roll defaults to Disadvantage (overridable via the dialog buttons).
  _rollCtx = { aspirynaAvailable: hasAspiryna, empty, aspirynaChosen: empty && hasAspiryna };
  const rolls = await medic.rollToolCheck(
    { tool: TOOL_KEY, ability: "int", disadvantage: (empty && hasAspiryna) },
    {},
    { data: { flavor: "Przywracanie PW — narzędzia małego medyka" } }
  );
  const aspirynaChosen = _rollCtx?.aspirynaChosen ?? false;
  _rollCtx = null;
  if ( !rolls?.length ) return; // cancelled
  const total = rolls[0].total;

  // "Improvising" = healing without supplies (Aspiryna): no charge consumed.
  const improvising = hasAspiryna && (empty || aspirynaChosen);

  const tier = HEAL_TIERS.find(t => total >= t.min);
  if ( !tier ) {
    await ChatMessage.create({
      speaker: ChatMessage.getSpeaker({ actor: medic }),
      content: _card(item, `<p>Test ${total} (&lt; 5) — leczenie nieudane${improvising ? "" : ", medykamenty nienaruszone"}.</p>`)
    });
    return;
  }

  // Heal roll — Pan Plaster adds one extra die.
  const dice = tier.dice + (hasPanPlaster ? 1 : 0);
  const intMod = medic.system.abilities.int?.mod ?? 0;
  const formula = tier.mod ? `${dice}d4 + ${intMod}` : `${dice}d4`;
  const healRoll = await new Roll(formula).evaluate();
  const heal = Math.max(0, healRoll.total);

  // Consume one supply unit (native uses), unless improvising (Aspiryna / empty kit).
  let newRemaining = remaining;
  if ( !improvising ) {
    newRemaining = Math.max(0, remaining - 1);
    await item.update({ "system.uses.spent": max - newRemaining });
  }

  // Apply healing (auto for GM/owner, otherwise a GM can use the button)
  let applied = false;
  if ( game.user.isGM || patient.isOwner ) {
    try { await patient.applyDamage([{ value: heal, type: "healing" }]); applied = true; }
    catch (e) { console.warn("Neuroshima 5e | medyk applyDamage failed:", e); }
  }

  // Graphical feedback
  _playHealVfx(patientToken, heal);

  // Chat card
  const mods = [];
  if ( hasPanPlaster ) mods.push("Pan Plaster: +1 kostka PW");
  if ( improvising )   mods.push("Aspiryna i Miętusy: bez zapasów (Utrudnienie)");

  const body = `
    <p><strong>${medic.name}</strong> leczy <strong>${patient.name}</strong>.</p>
    <p>Test ${total} → próg ${tier.min}+ &nbsp;•&nbsp; <strong>+${heal} PW</strong> (${formula})</p>
    ${mods.length ? `<p style="opacity:.85;font-size:12px">${mods.join(" · ")}</p>` : ""}
    <p style="opacity:.8">Medykamenty: <strong>${newRemaining}/${max}</strong></p>
  `;
  const buttons = applied
    ? ""
    : `<button type="button" class="neuro-medyk-apply" data-patient-uuid="${patient.uuid}" data-heal="${heal}">Zastosuj +${heal} PW</button>`;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: medic }),
    content: _card(item, body, buttons),
    rolls: [healRoll]
  });
}

/* ============================================================
 * Stabilise (no proficiency)
 * ============================================================ */

async function _stabilise(medic, patient) {
  const hp = patient.system.attributes?.hp;
  if ( (hp?.value ?? 1) <= 0 && (game.user.isGM || patient.isOwner) ) {
    try {
      await patient.update({ "system.attributes.death.success": 3, "system.attributes.death.failure": 0 });
    } catch (e) { console.warn("Neuroshima 5e | medyk stabilise failed:", e); }
  }
  const token = patient.getActiveTokens?.()[0] ?? null;
  if ( token ) seqScrollText("Stabilizacja", token, { color: "#7fd1ff", fontSize: 28 });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: medic }),
    content: _card(null,
      `<p><strong>${medic.name}</strong> stabilizuje <strong>${patient.name}</strong> (bez biegłości — tylko stabilizacja).</p>`)
  });
}

/* ============================================================
 * Sequencer feedback
 * ============================================================ */

/**
 * Return the first Sequencer/JB2A effect path that exists in the database, or null.
 * @param {string[]} candidates
 * @returns {string|null}
 */
function _firstExistingEffect(candidates) {
  const db = window.Sequencer?.Database;
  if ( !db?.entryExists ) return null;
  for ( const path of candidates ) {
    try { if ( db.entryExists(path) ) return path; } catch (_e) { /* ignore */ }
  }
  return null;
}

function _playHealVfx(token, heal) {
  const Seq = game.modules.get("sequencer")?.active ? window.Sequence : null;
  if ( !Seq ) {
    // No Sequencer — at least try the native floating text helper.
    seqScrollText(`+${heal}`, token, { color: HEAL_COLOR, fontSize: 36, duration: 2000 });
    return;
  }

  const s = new Seq();

  // Optional JB2A healing effect if available. Try several paths (free vs Patreon tiers
  // ship different assets) and use the first that exists; otherwise fall back to a tint.
  const healFile = _firstExistingEffect([
    "jb2a.healing_generic.200px.green",
    "jb2a.healing_generic.burst.green",
    "jb2a.healing_generic.loop.green",
    "jb2a.healing_generic.200px.blue",
    "jb2a.cure_wounds.400px.blue",
    "jb2a.cure_wounds.200px.blue"
  ]);
  if ( healFile ) {
    s.effect().file(healFile).atLocation(token).scaleToObject(2.2).belowTokens(false).fadeOut(400);
  } else {
    // Fallback: a brief green tint pulse on the token sprite (reverts automatically).
    s.animation().on(token).tint(HEAL_COLOR).duration(700);
  }

  s.scrollingText()
    .atLocation(token)
    .text(`+${heal}`, {
      fill: HEAL_COLOR, fontSize: 40, fontFamily: "Arial Black, Arial, sans-serif",
      strokeThickness: 5, stroke: "#0a3d0a"
    })
    .duration(2000)
    .direction("TOP");

  try { s.sound().file(HEAL_SOUND).volume(0.6); } catch (_e) { /* missing sound is non-fatal */ }

  s.play();
}

/* ============================================================
 * Chat card helpers
 * ============================================================ */

function _card(item, body, footer = "") {
  const header = item ? `
    <header class="card-header">
      <img class="neuro-kit-icon" src="${item.img}" style="width:38px;height:38px;border:none;margin-right:6px">
      <h3 style="flex:1">${item.name} — Przywracanie PW</h3>
    </header>` : "";
  return `
    <div class="dnd5e2 chat-card">
      ${header}
      <div class="card-content" style="padding:6px 8px">${body}</div>
      ${footer ? `<div class="card-buttons" style="padding:4px 8px;display:flex;gap:6px;flex-wrap:wrap">${footer}</div>` : ""}
    </div>`;
}

/* ============================================================
 * Chat-log button delegation (apply healing)
 * ============================================================ */

function _registerChatLogListener(_app, html) {
  const el = html instanceof HTMLElement ? html : html?.[0];
  if ( !el ) return;

  el.addEventListener("click", async (event) => {
    const applyBtn  = event.target.closest(".neuro-medyk-apply");

    if ( applyBtn ) {
      if ( !game.user.isGM ) return ui.notifications.warn("Tylko MG może zastosować leczenie.");
      const patient = await fromUuid(applyBtn.dataset.patientUuid);
      const heal = parseInt(applyBtn.dataset.heal ?? "0", 10);
      const actor = patient?.actor ?? patient;
      if ( actor?.applyDamage ) {
        await actor.applyDamage([{ value: heal, type: "healing" }]);
        applyBtn.disabled = true;
        applyBtn.textContent = `Zastosowano +${heal} PW`;
      }
    }
  });
}
