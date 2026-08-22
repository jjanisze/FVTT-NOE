/**
 * Neuroshima 5e — Choroby i Fobie (health panel).
 *
 * Renders two collapsible blocks at the top of the Biografia tab and a compact
 * read-only strip in the sidebar under Zranienie. Both blocks handle 0, 1 or
 * many entries without changing layout weight: an empty block is a single
 * "+ Dodaj" line, each entry is one row, and all per-entry controls live in that
 * row (no repeated headers, no per-entry toolbars).
 *
 * ## Mechanics implemented (RAW, rozdział "Choroby i Fobie", str. 108–112)
 * - Choroba: 3-stage ladder, preloaded stage text, editable name/medicine/notes.
 * - Lekarstwo: a dose is spent through the *native* consumable pipeline
 *   (`activity.use`) so uses/quantity/autoDestroy behave exactly like any Używka;
 *   the panel then posts a narrative chat card and marks the day as dosed.
 * - Zachód słońca (GM): every character who did not dose rolls RO na Kondycję
 *   ST 10. Nat 20 → back to przewlekły, nat 1 → two stages worse, fail → one
 *   stage worse. Diseases with only a "stan ogólny" are skipped (RAW str. 109).
 * - Fobia: RO na Mądrość ST 15. Success = Przełamanie (+streak), three in a row
 *   cures the phobia permanently. Failure clears the streak and flags the entry
 *   as active so the table can see the Utrudnienie applies.
 *
 * Stage/phobia changes are announced in chat but apply no Active Effects — the
 * penalties are prose ("50% szans, że wpadasz w szał") and stay with the GM.
 *
 * ## Day tracking
 * Deliberately NOT `game.time.worldTime`: this table does not advance world time,
 * so a "day" is a world setting counter bumped by the Zachód słońca routine.
 */

import {
  DISEASE_STAGES, CHRONIC_DISEASES, SUNSET_SAVE, NO_REST_FLAG,
  getDisease, diseaseStages, hasStageLadder, diseaseOptions,
  dailySaveFor, chronicKeys
} from "../config/diseases-data.mjs";
import {
  PHOBIAS, PHOBIA_SAVE, PHOBIA_CURE_STREAK, getPhobia, phobiaOptions
} from "../config/phobias-data.mjs";
import {
  MEDICINES, MEDICINE_FLAVOR, MEDICINE_FLAVOR_DEFAULT,
  getMedicine, medicineKeyByName, medicinesForDisease, medicineItemData
} from "../config/medicine-data.mjs";
import { effectsFor } from "../config/disease-effects.mjs";
import { addExhaustion } from "../config/exhaustion.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const PANEL_CLASS = "neuro-health-panel";
const STRIP_CLASS = "neuro-health-strip";
const MEDICINE_PACK = `${MODULE_ID}.lekarstwa`;

/* -------------------------------------------- */
/*  Registration                                 */
/* -------------------------------------------- */

export function registerHealthPanel() {
  game.settings.register(MODULE_ID, "dayCounter", {
    name: "Licznik dni (Choroby)",
    hint: "Zwiększany przez rutynę „Zachód słońca”. Służy do sprawdzania, kto wziął dziś lek.",
    scope: "world",
    config: false,
    type: Number,
    default: 0
  });

  Hooks.on("renderCharacterActorSheet", _onRenderCharacterSheet);
  _registerSunsetControl();

  console.log("Neuroshima 5e | Choroby i Fobie panel registered");
}

/** GM-only scene-control button that runs the daily disease progression. */
function _registerSunsetControl() {
  Hooks.on("getSceneControlButtons", controls => {
    const tokenTools = controls.tokens?.tools;
    if (!tokenTools) return;
    tokenTools.neuroshimaSunset = {
      name: "neuroshimaSunset",
      title: "Zachód słońca — RO na Kondycję dla chorych (MG)",
      icon: "fa-solid fa-sun",
      order: Object.keys(tokenTools).length,
      button: true,
      visible: game.user?.isGM ?? false,
      onChange: async () => {
        const ok = await foundry.applications.api.DialogV2.confirm({
          window: { title: "Zachód słońca" },
          content: `<p>Wykonać RO na Kondycję ST ${SUNSET_SAVE.dc} dla każdej postaci gracza, `
            + `która nie wzięła dziś lekarstwa, i przejść do dnia `
            + `<strong>${game.settings.get(MODULE_ID, "dayCounter") + 1}</strong>?</p>`
        });
        if (ok) await sunsetCheck();
      }
    };
  });
}

/** Public API, exposed on `game.neuroshima.health` from main.mjs. */
export const healthApi = {
  getChoroby, getFobie, addDisease, addPhobia, takeDose, sunsetCheck, rollPhobiaSave
};

/* -------------------------------------------- */
/*  Flag access                                  */
/* -------------------------------------------- */

/** @returns {object[]} disease entries (always a fresh array, safe to mutate). */
export function getChoroby(actor) {
  return foundry.utils.deepClone(actor.getFlag(MODULE_ID, "choroby") ?? []);
}

/** @returns {object[]} phobia entries (always a fresh array, safe to mutate). */
export function getFobie(actor) {
  return foundry.utils.deepClone(actor.getFlag(MODULE_ID, "fobie") ?? []);
}

async function _setChoroby(actor, entries) {
  return actor.setFlag(MODULE_ID, "choroby", entries);
}

async function _setFobie(actor, entries) {
  return actor.setFlag(MODULE_ID, "fobie", entries);
}

function _newId() {
  return foundry.utils.randomID(12);
}

/** Current world day index. */
function _today() {
  return game.settings.get(MODULE_ID, "dayCounter");
}

/** True when this disease already got its dose for the current day. */
function dosedToday(entry) {
  return Number.isInteger(entry?.lastDoseDay) && entry.lastDoseDay === _today();
}

/* -------------------------------------------- */
/*  Entry construction                           */
/* -------------------------------------------- */

/**
 * Add a disease to an actor.
 * @param {Actor} actor
 * @param {string|null} key   CHRONIC_DISEASES / COMMON_DISEASES key, null for custom.
 * @param {object} [overrides]
 */
export async function addDisease(actor, key = null, overrides = {}) {
  const def = getDisease(key);
  const entry = {
    id: _newId(),
    key: def ? key : null,
    name: def?.label ?? "Nowa choroba",
    stage: 0,
    stages: def ? null : ["Opisz objawy…"],
    medicine: def?.medicine ?? "",
    itemId: null,
    lastDoseDay: null,
    notes: "",
    ...overrides
  };
  const entries = getChoroby(actor);
  entries.push(entry);
  await _setChoroby(actor, entries);
  return entry;
}

/**
 * Add a phobia to an actor.
 * @param {Actor} actor
 * @param {string|null} key   PHOBIAS key, null for custom.
 * @param {object} [overrides]
 */
export async function addPhobia(actor, key = null, overrides = {}) {
  const def = getPhobia(key);
  const entry = {
    id: _newId(),
    key: def ? key : null,
    name: def?.label ?? "Nowa fobia",
    effect: def?.effect ?? "Opisz wyzwalacz i karę…",
    breakthrough: def?.breakthrough ?? "Opisz korzyść z Przełamania…",
    streak: 0,
    broken: false,
    active: false,
    notes: "",
    ...overrides
  };
  const entries = getFobie(actor);
  entries.push(entry);
  await _setFobie(actor, entries);
  return entry;
}

/** Replace one disease entry by id. `patch` is shallow-merged. */
async function _patchDisease(actor, id, patch) {
  const entries = getChoroby(actor);
  const idx = entries.findIndex(e => e.id === id);
  if (idx < 0) return null;
  entries[idx] = { ...entries[idx], ...patch };
  await _setChoroby(actor, entries);
  return entries[idx];
}

/** Replace one phobia entry by id. `patch` is shallow-merged. */
async function _patchPhobia(actor, id, patch) {
  const entries = getFobie(actor);
  const idx = entries.findIndex(e => e.id === id);
  if (idx < 0) return null;
  entries[idx] = { ...entries[idx], ...patch };
  await _setFobie(actor, entries);
  return entries[idx];
}

/* -------------------------------------------- */
/*  Medicine resolution                          */
/* -------------------------------------------- */

/**
 * Find the actor's supply item for a disease entry.
 * Resolution order: explicit link → medicine key match → loose name match.
 * The last step is what makes legacy "Wapniak (20)" loot keep working.
 * @returns {Item|null}
 */
export function resolveMedicineItem(actor, entry) {
  if (entry.itemId) {
    const linked = actor.items.get(entry.itemId);
    if (linked) return linked;
  }
  const key = medicineKeyByName(entry.medicine);
  if (key) {
    const byKey = actor.items.find(i => i.getFlag(MODULE_ID, "medicineKey") === key);
    if (byKey) return byKey;
  }
  const wanted = String(entry.medicine ?? "").toLowerCase().trim();
  if (!wanted) return null;
  // Compare against the bare name so "Wapniak" matches "Wapniak (20)" and
  // "Actinix" matches "Actinix/Rephidal".
  return actor.items.find(i => {
    const n = i.name.toLowerCase();
    return n.includes(wanted) || wanted.includes(n.replace(/\s*\(.*\)$/, ""));
  }) ?? null;
}

/** How many doses the item still holds. */
export function dosesRemaining(item) {
  if (!item) return 0;
  const qty = Number(item.system?.quantity ?? 0);
  const max = Number(item.system?.uses?.max ?? 0);
  if (!max) return qty;
  const left = max - Number(item.system.uses.spent ?? 0);
  return Math.max(0, (qty - 1) * max + left);
}

/**
 * Import (or build) a medicine consumable onto the actor.
 * Prefers the `lekarstwa` compendium so the item stays a single source of truth;
 * falls back to `medicine-data.mjs` when the pack has not been built yet.
 */
async function _grantMedicine(actor, key, quantity = 1) {
  const pack = game.packs.get(MEDICINE_PACK);
  let data = null;
  if (pack) {
    const index = pack.index.find(e => e.name === MEDICINES[key]?.label);
    if (index) {
      const doc = await pack.getDocument(index._id);
      data = doc.toObject();
      delete data._id;
    }
  }
  data ??= medicineItemData(key);
  data.system.quantity = quantity;
  const [created] = await actor.createEmbeddedDocuments("Item", [data]);
  return created;
}

/* -------------------------------------------- */
/*  Weź dawkę                                    */
/* -------------------------------------------- */

/**
 * Spend one dose for a disease entry.
 *
 * Consumption goes through the item's own activity when it has one, so a
 * medicine behaves identically whether taken from this panel or from the
 * Używki list (uses → quantity → autoDestroy). Items that predate the medicine
 * compendium (plain loot) fall back to a manual quantity decrement.
 *
 * @param {Actor} actor
 * @param {string} entryId
 */
export async function takeDose(actor, entryId) {
  const entry = getChoroby(actor).find(e => e.id === entryId);
  if (!entry) return;

  let item = resolveMedicineItem(actor, entry);

  if (!item) {
    const key = medicineKeyByName(entry.medicine) ?? medicinesForDisease(entry.key)[0];
    const known = getMedicine(key);
    const proceed = known && await foundry.applications.api.DialogV2.confirm({
      window: { title: "Brak lekarstwa" },
      content: `<p><strong>${actor.name}</strong> nie ma przy sobie <strong>${known.label}</strong>.</p>`
        + `<p>Dodać jedno opakowanie do ekwipunku (${known.price} gb${known.doses > 1 ? `, ${known.doses} dawek` : ""})?</p>`
    });
    if (!proceed) {
      ui.notifications.warn(`Brak lekarstwa „${entry.medicine || "—"}” w ekwipunku.`);
      return;
    }
    item = await _grantMedicine(actor, key);
    await _patchDisease(actor, entryId, { itemId: item.id });
  }

  if (dosesRemaining(item) <= 0) {
    ui.notifications.warn(`${item.name}: brak dawek. O zachodzie słońca czeka RO na Kondycję ST ${SUNSET_SAVE.dc}.`);
    return;
  }

  const consumed = await _consumeOneDose(item);
  if (!consumed) return;

  await _patchDisease(actor, entryId, { itemId: item.id, lastDoseDay: _today() });

  const left = dosesRemaining(actor.items.get(item.id));
  await _postDoseMessage(actor, entry, item, left);
}

/**
 * Burn a single dose. Returns false if nothing could be consumed.
 * @param {Item} item
 * @returns {Promise<boolean>}
 */
async function _consumeOneDose(item) {
  // `system.activities` is an ActivityCollection, not a plain object — Object.values
  // on it silently returns [] and every medicine would take the legacy path.
  const activity = Array.from(item.system.activities ?? [])
    .find(a => a.consumption?.targets?.some(t => t.type === "itemUses"));

  if (activity) {
    // Native pipeline: no dialog, no chat card — we post our own below.
    const result = await activity.use({}, { configure: false }, { create: false });
    if (result === undefined || result === null) return false;
    return true;
  }

  // Legacy loot with no activity: one quantity = one dose.
  const qty = Number(item.system.quantity ?? 0);
  if (qty <= 0) return false;
  if (qty === 1) await item.delete();
  else await item.update({ "system.quantity": qty - 1 });
  return true;
}

async function _postDoseMessage(actor, entry, item, left) {
  const key = item.getFlag(MODULE_ID, "medicineKey") ?? medicineKeyByName(entry.medicine);
  const pool = MEDICINE_FLAVOR[key] ?? MEDICINE_FLAVOR_DEFAULT;
  const line = pool[Math.floor(Math.random() * pool.length)]
    .replace("{a}", actor.name)
    .replace("{m}", entry.medicine || item.name);

  const lowSupply = left <= 1
    ? `<div class="neuro-dose-warn">Zostało ${left === 0 ? "0 dawek" : "1 dawka"} — jutro o zachodzie słońca czeka RO na Kondycję ST ${SUNSET_SAVE.dc}.</div>`
    : `<div class="neuro-dose-left">Zapas: ${left} ${_dosesWord(left)}</div>`;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-dose-card">
      <div class="neuro-dose-head"><i class="fa-solid fa-syringe"></i> ${entry.medicine || item.name}</div>
      <div class="neuro-dose-flavor">${line}</div>
      ${lowSupply}
    </div>`,
    flags: { [MODULE_ID]: { dose: { entryId: entry.id, itemId: item.id } } }
  });
}

function _dosesWord(n) {
  if (n === 1) return "dawka";
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return "dawki";
  return "dawek";
}

/* -------------------------------------------- */
/*  Zachód słońca — daily disease progression    */
/* -------------------------------------------- */

/**
 * Resolve one acquired disease's end-of-day RO na Kondycję.
 *
 * Mutates `entry` in place — the caller writes the whole list back once. A cure marks
 * `_cured` for the caller to filter out; popromienna instead becomes a rolled choroba
 * przewlekła, keeping the same entry id so its row on the sheet does not jump around.
 *
 * @param {Actor} actor
 * @param {object} entry     The disease entry, mutated.
 * @param {{dc: number, success: string}} daily
 * @param {number} tomorrow  Day counter value the rest block should cover.
 * @returns {Promise<string>}  HTML verdict for the sunset card.
 */
async function _rollDailySave(actor, entry, daily, tomorrow) {
  const roll = await new Roll("1d20").evaluate();
  const total = roll.total + (actor.system.abilities?.[SUNSET_SAVE.ability]?.save?.value ?? 0);

  if (total < daily.dc) {
    await addExhaustion(actor, "choroba", { chat: false });
    await actor.setFlag(MODULE_ID, NO_REST_FLAG, tomorrow);
    return `<span class="bad">oblany (${total} vs ST ${daily.dc}) — poziom Wyczerpania, `
      + `jutro bez korzyści z odpoczynku</span>`;
  }

  if (daily.success === "cured") {
    entry._cured = true;
    return `<span class="good">zdany (${total}) — wyleczenie</span>`;
  }

  // "chronic": the k8 table decides which one takes its place.
  const keys = chronicKeys();
  const pick = await new Roll(`1d${keys.length}`).evaluate();
  const key = keys[pick.total - 1];
  const def = getDisease(key);
  Object.assign(entry, {
    key, name: def.label, stage: 0, stages: null,
    medicine: def.medicine ?? "", itemId: null, lastDoseDay: null
  });
  return `<span class="good">zdany (${total})</span> — przechodzi w <em>${def.label}</em>`;
}

/**
 * Run the daily sunset check for every character with a staged disease that was
 * not dosed today, then advance the day counter.
 *
 * RAW (str. 109): RO na Kondycję ST 10 per undosed disease. Failure worsens the
 * disease by one stage; a natural 20 resets it to przewlekły; a natural 1 worsens
 * it by two. Diseases with only a "stan ogólny" never roll.
 *
 * Acquired diseases carrying a `dailySave` (str. 110–111) roll their own ST instead:
 * success cures them or turns them chronic, failure costs a poziom Wyczerpania and
 * tomorrow's rest — see the rest block in `actors/disease-effects.mjs`.
 *
 * @param {object} [options]
 * @param {Actor[]} [options.actors]  Defaults to every player-owned character.
 */
export async function sunsetCheck({ actors } = {}) {
  if (!game.user.isGM) return ui.notifications.warn("Zachód słońca może uruchomić tylko MG.");

  const pool = actors ?? game.actors.filter(a => a.type === "character" && a.hasPlayerOwner);
  const lines = [];
  const tomorrow = _today() + 1;

  for (const actor of pool) {
    let entries = getChoroby(actor);
    let changed = false;

    for (const entry of entries) {
      const daily = dailySaveFor(entry);
      if (daily) {
        if (dosedToday(entry)) {
          lines.push(`<li><strong>${actor.name}</strong> — ${entry.name}: dawka wzięta.</li>`);
          continue;
        }
        const verdict = await _rollDailySave(actor, entry, daily, tomorrow);
        lines.push(`<li><strong>${actor.name}</strong> — ${entry.name}: ${verdict}</li>`);
        changed = true;
        continue;
      }
      if (!hasStageLadder(entry)) continue;
      if (dosedToday(entry)) {
        lines.push(`<li><strong>${actor.name}</strong> — ${entry.name}: dawka wzięta.</li>`);
        continue;
      }

      const roll = await new Roll("1d20").evaluate();
      const die = roll.dice[0]?.results?.[0]?.result ?? roll.total;
      const total = roll.total + (actor.system.abilities?.[SUNSET_SAVE.ability]?.save?.value ?? 0);
      const stages = diseaseStages(entry);
      const before = entry.stage;

      let verdict;
      if (die === 20) {
        entry.stage = 0;
        verdict = `<span class="good">naturalna 20 — powrót do stanu przewlekłego</span>`;
      } else if (die === 1) {
        entry.stage = Math.min(stages.length - 1, entry.stage + 2);
        verdict = `<span class="bad">naturalna 1 — pogorszenie o dwa stany</span>`;
      } else if (total >= SUNSET_SAVE.dc) {
        verdict = `<span class="good">zdany (${total}) — bez zmian</span>`;
      } else {
        entry.stage = Math.min(stages.length - 1, entry.stage + 1);
        verdict = `<span class="bad">oblany (${total}) — pogorszenie o jeden stan</span>`;
      }

      if (entry.stage !== before) changed = true;
      const stageLabel = DISEASE_STAGES[entry.stage]?.label ?? "—";
      lines.push(`<li><strong>${actor.name}</strong> — ${entry.name}: ${verdict} → <em>${stageLabel}</em></li>`);
    }

    // A new day clears yesterday's Przełamanie.
    const fobie = getFobie(actor);
    if (fobie.some(f => f.broken || f.active)) {
      await _setFobie(actor, fobie.map(f => ({ ...f, broken: false, active: false })));
    }

    // `_rollDailySave` may have cured an entry outright — drop those before saving.
    entries = entries.filter(e => !e._cured);
    if (changed || entries.length) await _setChoroby(actor, entries);
  }

  await game.settings.set(MODULE_ID, "dayCounter", _today() + 1);

  await ChatMessage.create({
    content: `<div class="neuro-sunset-card">
      <div class="neuro-sunset-head"><i class="fa-solid fa-sun"></i> ZACHÓD SŁOŃCA — dzień ${_today()}</div>
      ${lines.length ? `<ul class="neuro-sunset-list">${lines.join("")}</ul>`
        : `<div class="neuro-sunset-empty">Nikt nie choruje przewlekle.</div>`}
    </div>`,
    whisper: ChatMessage.getWhisperRecipients("GM").map(u => u.id)
  });
}

/* -------------------------------------------- */
/*  Fobia — Przełamanie                          */
/* -------------------------------------------- */

/**
 * Roll the RO na Mądrość ST 15 for a phobia.
 * Success = Przełamanie and +1 streak (three in a row cures it). Failure resets
 * the streak and marks the entry active, so the sheet shows the Utrudnienie.
 */
export async function rollPhobiaSave(actor, entryId) {
  const entry = getFobie(actor).find(e => e.id === entryId);
  if (!entry) return;

  const roll = await actor.rollSavingThrow(
    { ability: PHOBIA_SAVE.ability, target: PHOBIA_SAVE.dc },
    { configure: false }
  );
  const result = Array.isArray(roll) ? roll[0] : roll;
  if (!result) return;

  const success = result.total >= PHOBIA_SAVE.dc;
  const streak = success ? (entry.streak ?? 0) + 1 : 0;
  const cured = success && streak >= PHOBIA_CURE_STREAK;

  if (cured) {
    await _setFobie(actor, getFobie(actor).filter(e => e.id !== entryId));
  } else {
    await _patchPhobia(actor, entryId, { streak, broken: success, active: !success });
  }

  const body = cured
    ? `<div class="neuro-fobia-cured">Trzeci zdany RO z rzędu — <strong>${entry.name}</strong> zostaje wyleczona na stałe.</div>`
    : success
      ? `<div class="neuro-fobia-broken"><strong>PRZEŁAMANIE.</strong> ${entry.breakthrough}</div>
         <div class="neuro-fobia-streak">Seria: ${streak}/${PHOBIA_CURE_STREAK}</div>`
      : `<div class="neuro-fobia-failed">Lęk bierze górę — Utrudnienie w Testach Cech i Testach Ataku.</div>
         <div class="neuro-fobia-streak">Seria przerwana.</div>`;

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: `<div class="neuro-fobia-card ${success ? "is-success" : "is-failure"}">
      <div class="neuro-fobia-head"><i class="fa-solid fa-brain"></i> ${entry.name}</div>
      ${body}
    </div>`
  });
}

/* -------------------------------------------- */
/*  DOM — shared builders                        */
/* -------------------------------------------- */

function _el(tag, cls, text) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text !== undefined) e.textContent = text;
  return e;
}

function _iconButton(icon, tooltip, cls = "") {
  const b = _el("button", `neuro-health-btn ${cls}`.trim());
  b.type = "button";
  b.innerHTML = `<i class="${icon}"></i>`;
  b.dataset.tooltip = tooltip;
  b.setAttribute("aria-label", tooltip);
  return b;
}

/** A `<select>` built from `[{key,label}]` or `[{group,options}]`. */
function _select(groups, selected, { blank } = {}) {
  const sel = _el("select", "neuro-health-select");
  if (blank !== undefined) {
    const o = _el("option", null, blank);
    o.value = "";
    sel.appendChild(o);
  }
  const addOption = (parent, { key, label }) => {
    const o = _el("option", null, label);
    o.value = key;
    if (key === selected) o.selected = true;
    parent.appendChild(o);
  };
  for (const g of groups) {
    if (g.group) {
      const og = document.createElement("optgroup");
      og.label = g.group;
      g.options.forEach(o => addOption(og, o));
      sel.appendChild(og);
    } else {
      addOption(sel, g);
    }
  }
  return sel;
}

/* -------------------------------------------- */
/*  DOM — Choroby                                */
/* -------------------------------------------- */

function _buildDiseaseRow(actor, entry, editable) {
  const stages = diseaseStages(entry);
  const staged = stages.length > 1;
  const li = _el("li", "neuro-health-row neuro-choroba-row");
  li.dataset.entryId = entry.id;
  if (staged) li.dataset.stage = DISEASE_STAGES[entry.stage]?.key ?? "przewlekly";

  /* --- summary line --- */
  const head = _el("div", "neuro-health-head");

  const name = _el("input", "neuro-health-name");
  name.type = "text";
  name.value = entry.name;
  name.disabled = !editable;
  name.addEventListener("change", ev => _patchDisease(actor, entry.id, { name: ev.target.value }));
  head.appendChild(name);

  // Stage pips — clicking pip N sets that stage; clicking the active one steps back.
  if (staged) {
    const pips = _el("div", "neuro-health-pips");
    pips.dataset.tooltip = "Stan choroby";
    stages.forEach((_, i) => {
      const pip = _el("span", "neuro-health-pip");
      pip.dataset.n = String(i);
      pip.style.setProperty("--pip-color", DISEASE_STAGES[i]?.color ?? "#888");
      if (i <= entry.stage) pip.classList.add("is-filled");
      if (editable) {
        pip.addEventListener("click", () => {
          const n = Number(pip.dataset.n);
          _patchDisease(actor, entry.id, { stage: n === entry.stage && n > 0 ? n - 1 : n });
        });
      }
      pips.appendChild(pip);
    });
    head.appendChild(pips);
    head.appendChild(_el("span", "neuro-health-stage-label",
      DISEASE_STAGES[entry.stage]?.label ?? ""));
  } else {
    head.appendChild(_el("span", "neuro-health-stage-label", "Stan ogólny"));
  }

  /* --- medicine + dose --- */
  const item = resolveMedicineItem(actor, entry);
  const left = dosesRemaining(item);

  const med = _el("div", "neuro-health-med");
  const medName = _el("input", "neuro-health-medname");
  medName.type = "text";
  medName.value = entry.medicine ?? "";
  medName.placeholder = "lekarstwo";
  medName.disabled = !editable;
  medName.addEventListener("change", ev =>
    _patchDisease(actor, entry.id, { medicine: ev.target.value, itemId: null }));
  med.appendChild(medName);

  const supply = _el("span", `neuro-health-supply ${left === 0 ? "is-empty" : left <= 1 ? "is-low" : ""}`.trim(),
    `×${left}`);
  supply.dataset.tooltip = item
    ? `${item.name} — ${left} ${_dosesWord(left)}`
    : "Brak lekarstwa w ekwipunku";
  med.appendChild(supply);

  const dose = _iconButton("fa-solid fa-syringe", dosedToday(entry)
    ? "Dawka już wzięta dzisiaj — kliknij, aby wziąć kolejną"
    : "Weź dawkę", "neuro-dose-btn");
  dose.disabled = !editable;
  if (dosedToday(entry)) dose.classList.add("is-dosed");
  dose.addEventListener("click", () => takeDose(actor, entry.id));
  med.appendChild(dose);

  head.appendChild(med);

  /* --- situational toggle (daylight, riding as a passenger…) --- */
  const spec0 = effectsFor(entry);
  if (spec0?.conditional) {
    const chip = _el("button", `neuro-health-chip ${entry.conditionalOn ? "is-on" : ""}`.trim());
    chip.type = "button";
    chip.textContent = spec0.conditional.label;
    chip.dataset.tooltip = entry.conditionalOn
      ? "Efekt sytuacyjny aktywny — kliknij, aby wyłączyć"
      : "Włącz, gdy sytuacja z opisu zachodzi";
    chip.disabled = !editable;
    chip.addEventListener("click", () =>
      _patchDisease(actor, entry.id, { conditionalOn: !entry.conditionalOn }));
    head.appendChild(chip);

    // Exposure damage (Draculi: 1k4/1k6 per minute) rides the same toggle.
    if (spec0.conditional.tick && entry.conditionalOn) {
      const tick = spec0.conditional.tick;
      const tickBtn = _iconButton("fa-solid fa-hourglass-half",
        `${tick.formula} obrażeń za ${tick.period} ekspozycji`, "neuro-health-tick");
      tickBtn.disabled = !editable;
      tickBtn.addEventListener("click", () => _rollExposure(actor, entry, tick));
      head.appendChild(tickBtn);
    }
  }

  /* --- row actions --- */
  const actions = _el("div", "neuro-health-actions");
  const expand = _iconButton("fa-solid fa-chevron-down", "Szczegóły", "neuro-health-expand");
  expand.addEventListener("click", () => li.classList.toggle("is-open"));
  actions.appendChild(expand);

  if (editable) {
    const del = _iconButton("fa-solid fa-xmark", "Usuń chorobę", "neuro-health-delete");
    del.addEventListener("click", async () => {
      const ok = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Usuń chorobę" },
        content: `<p>Usunąć <strong>${entry.name}</strong> z karty ${actor.name}?</p>`
      });
      if (ok) await _setChoroby(actor, getChoroby(actor).filter(e => e.id !== entry.id));
    });
    actions.appendChild(del);
  }
  head.appendChild(actions);
  li.appendChild(head);

  /* --- details --- */
  const body = _el("div", "neuro-health-body");

  const def = getDisease(entry.key);
  if (def?.flavor) body.appendChild(_el("div", "neuro-health-flavor", `„${def.flavor}”`));

  const stageList = _el("ul", "neuro-health-stages");
  stages.forEach((text, i) => {
    const s = _el("li", `neuro-health-stagetext ${i === entry.stage ? "is-current" : ""}`.trim());
    const label = staged ? (DISEASE_STAGES[i]?.label ?? `Stan ${i + 1}`) : "Stan ogólny";
    s.innerHTML = `<strong>${label}.</strong> `;
    if (entry.key) {
      s.append(text);
    } else {
      // Custom diseases keep their stage text editable.
      const ta = _el("textarea", "neuro-health-stageedit");
      ta.value = text;
      ta.rows = 2;
      ta.disabled = !editable;
      ta.addEventListener("change", ev => {
        const next = [...(entry.stages ?? [])];
        next[i] = ev.target.value;
        _patchDisease(actor, entry.id, { stages: next });
      });
      s.appendChild(ta);
    }
    stageList.appendChild(s);
  });
  body.appendChild(stageList);

  if (!entry.key && editable) {
    const addStage = _el("button", "neuro-health-linkbtn", "+ dodaj stan");
    addStage.type = "button";
    addStage.addEventListener("click", () =>
      _patchDisease(actor, entry.id, { stages: [...(entry.stages ?? []), "…"] }));
    body.appendChild(addStage);
  }

  if (!staged) {
    body.appendChild(_el("div", "neuro-health-note",
      "Choroba ma tylko stan ogólny — nie wymaga RO na Kondycję o zachodzie słońca."));
  }

  // Anything the system deliberately leaves to the GM, said out loud so it is
  // obvious which half of the stage is automated and which is not.
  const spec = effectsFor(entry);
  if (spec?.manual) {
    body.appendChild(_el("div", "neuro-health-manual", `Poza automatyką: ${spec.manual}`));
  }

  // Explicit supply link, so "Wapniak" can point at a specific stack.
  if (editable) {
    const consumables = actor.items.filter(i => ["consumable", "loot"].includes(i.type));
    if (consumables.length) {
      const link = _el("label", "neuro-health-link");
      link.append("Zapas: ");
      const sel = _select(
        consumables.map(i => ({ key: i.id, label: `${i.name} (${dosesRemaining(i)})` })),
        entry.itemId ?? "",
        { blank: "— dopasuj po nazwie —" }
      );
      sel.addEventListener("change", ev =>
        _patchDisease(actor, entry.id, { itemId: ev.target.value || null }));
      link.appendChild(sel);
      body.appendChild(link);
    }
  }

  const notes = _el("textarea", "neuro-health-notes");
  notes.value = entry.notes ?? "";
  notes.rows = 2;
  notes.placeholder = "Notatki (przebieg, kto leczy, skąd lek…)";
  notes.disabled = !editable;
  notes.addEventListener("change", ev => _patchDisease(actor, entry.id, { notes: ev.target.value }));
  body.appendChild(notes);

  li.appendChild(body);
  return li;
}

/**
 * Roll one interval of exposure damage for a situational disease stage
 * (Syndrom Draculi: 1k4/min on sunlight, 1k6/min from any light source).
 * Applied directly — the amount is unmodifiable by resistances in RAW, and
 * routing it through Apply Damage would invite a cover/resistance dialog that
 * does not belong here.
 */
async function _rollExposure(actor, entry, tick) {
  const roll = await new Roll(tick.formula).evaluate();
  await actor.applyDamage([{ value: roll.total, type: tick.type }], { ignore: true });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    rolls: [roll],
    content: `<div class="neuro-dose-card">
      <div class="neuro-dose-head"><i class="fa-solid fa-sun"></i> ${entry.name} — ekspozycja</div>
      <div class="neuro-dose-flavor">${actor.name} traci <strong>${roll.total}</strong> PW
        za ${tick.period} ekspozycji.</div>
    </div>`
  });
}

/* -------------------------------------------- */
/*  DOM — Fobie                                  */
/* -------------------------------------------- */

function _buildPhobiaRow(actor, entry, editable) {
  const li = _el("li", "neuro-health-row neuro-fobia-row");
  li.dataset.entryId = entry.id;
  if (entry.active) li.classList.add("is-active");
  if (entry.broken) li.classList.add("is-broken");

  const head = _el("div", "neuro-health-head");

  const name = _el("input", "neuro-health-name");
  name.type = "text";
  name.value = entry.name;
  name.disabled = !editable;
  name.addEventListener("change", ev => _patchPhobia(actor, entry.id, { name: ev.target.value }));
  head.appendChild(name);

  const state = _el("span", "neuro-health-stage-label",
    entry.broken ? "Przełamana" : entry.active ? "Lęk!" : "Spokój");
  head.appendChild(state);

  // Streak toward the permanent cure.
  const streak = _el("div", "neuro-health-pips neuro-fobia-streak-pips");
  streak.dataset.tooltip = `Zdane RO z rzędu: ${entry.streak ?? 0}/${PHOBIA_CURE_STREAK} (trzy leczą fobię)`;
  for (let i = 0; i < PHOBIA_CURE_STREAK; i++) {
    const pip = _el("span", "neuro-health-pip");
    pip.style.setProperty("--pip-color", "#27ae60");
    if (i < (entry.streak ?? 0)) pip.classList.add("is-filled");
    streak.appendChild(pip);
  }
  head.appendChild(streak);

  const actions = _el("div", "neuro-health-actions");

  const save = _iconButton("fa-solid fa-dice-d20", `Przełamanie — RO na Mądrość ST ${PHOBIA_SAVE.dc}`,
    "neuro-fobia-save");
  save.disabled = !editable;
  save.addEventListener("click", () => rollPhobiaSave(actor, entry.id));
  actions.appendChild(save);

  const trigger = _iconButton("fa-solid fa-triangle-exclamation",
    entry.active ? "Wyłącz lęk" : "Włącz lęk (wyzwalacz w zasięgu)", "neuro-fobia-trigger");
  trigger.disabled = !editable;
  if (entry.active) trigger.classList.add("is-on");
  trigger.addEventListener("click", () =>
    _patchPhobia(actor, entry.id, { active: !entry.active, broken: false }));
  actions.appendChild(trigger);

  const expand = _iconButton("fa-solid fa-chevron-down", "Szczegóły", "neuro-health-expand");
  expand.addEventListener("click", () => li.classList.toggle("is-open"));
  actions.appendChild(expand);

  if (editable) {
    const del = _iconButton("fa-solid fa-xmark", "Usuń fobię", "neuro-health-delete");
    del.addEventListener("click", async () => {
      const ok = await foundry.applications.api.DialogV2.confirm({
        window: { title: "Usuń fobię" },
        content: `<p>Usunąć <strong>${entry.name}</strong> z karty ${actor.name}?</p>`
      });
      if (ok) await _setFobie(actor, getFobie(actor).filter(e => e.id !== entry.id));
    });
    actions.appendChild(del);
  }
  head.appendChild(actions);
  li.appendChild(head);

  const body = _el("div", "neuro-health-body");
  for (const [label, field] of [["Efekt", "effect"], ["Przełamanie", "breakthrough"]]) {
    const wrap = _el("div", "neuro-health-field");
    wrap.appendChild(_el("span", "neuro-health-fieldlabel", label));
    const ta = _el("textarea", "neuro-health-fieldtext");
    ta.value = entry[field] ?? "";
    ta.rows = 3;
    ta.disabled = !editable;
    ta.addEventListener("change", ev => _patchPhobia(actor, entry.id, { [field]: ev.target.value }));
    wrap.appendChild(ta);
    body.appendChild(wrap);
  }

  const notes = _el("textarea", "neuro-health-notes");
  notes.value = entry.notes ?? "";
  notes.rows = 2;
  notes.placeholder = "Notatki (skąd się wzięła, co ją wyzwala u tej postaci…)";
  notes.disabled = !editable;
  notes.addEventListener("change", ev => _patchPhobia(actor, entry.id, { notes: ev.target.value }));
  body.appendChild(notes);

  li.appendChild(body);
  return li;
}

/* -------------------------------------------- */
/*  DOM — block + add control                    */
/* -------------------------------------------- */

/**
 * One block ("Choroby" or "Fobie"). The add control is a select + button on the
 * header line, so an empty block costs exactly one row of height.
 */
function _buildBlock({ title, icon, entries, rowBuilder, options, onAdd, editable, emptyText }) {
  const section = _el("section", "neuro-health-block");

  const h = _el("h3", "neuro-health-title");
  h.innerHTML = `<i class="${icon}"></i><span class="roboto-upper">${title}</span>`;
  const count = _el("span", "neuro-health-count", entries.length ? String(entries.length) : "");
  h.appendChild(count);

  if (editable) {
    const adder = _el("div", "neuro-health-adder");
    const sel = _select(options, "", { blank: "własna…" });
    adder.appendChild(sel);
    const add = _iconButton("fa-solid fa-plus", `Dodaj: ${title.toLowerCase()}`, "neuro-health-add");
    add.addEventListener("click", () => onAdd(sel.value || null));
    adder.appendChild(add);
    h.appendChild(adder);
  }
  section.appendChild(h);

  if (!entries.length) {
    section.appendChild(_el("div", "neuro-health-empty", emptyText));
  } else {
    const ul = _el("ul", "neuro-health-list");
    for (const entry of entries) ul.appendChild(rowBuilder(entry));
    section.appendChild(ul);
  }
  return section;
}

/* -------------------------------------------- */
/*  DOM — sidebar strip                          */
/* -------------------------------------------- */

/** Rulebook stage text is one paragraph; the tooltip wants one penalty per line. */
function _sentences(text) {
  return String(text ?? "").trim()
    .split(/(?<=\.)\s+(?=[A-ZĄĆĘŁŃÓŚŹŻ])/)
    .map(s => s.trim())
    .filter(Boolean);
}

/** Same shape as the Stan pips: bold heading, then everything that applies right now. */
function _tipHtml(head, lines) {
  const esc = s => foundry.utils.escapeHTML(String(s));
  return `<strong>${esc(head)}</strong>`
    + (lines.length ? `<ul>${lines.map(l => `<li>${esc(l)}</li>`).join("")}</ul>` : "");
}

/**
 * Compact status line for the Stan panel. Read-only by design — every control already
 * exists on the Biografia tab, so the strip only reports.
 * Returns null when the actor has nothing to report (no wasted space).
 * @param {Actor} actor
 * @returns {HTMLElement|null}
 */
export function buildHealthStrip(actor) {
  const choroby = getChoroby(actor);
  const fobie = getFobie(actor);
  if (!choroby.length && !fobie.length) return null;

  const strip = _el("div", STRIP_CLASS);

  for (const entry of choroby) {
    const row = _el("div", "neuro-health-striprow");
    const stage = hasStageLadder(entry) ? DISEASE_STAGES[entry.stage] : null;
    const dot = _el("span", "neuro-health-stripdot");
    dot.style.background = stage?.color ?? "#7f8c8d";
    row.appendChild(dot);
    row.appendChild(_el("span", "neuro-health-stripname", entry.name));

    const item = resolveMedicineItem(actor, entry);
    const left = dosesRemaining(item);
    const supply = _el("span",
      `neuro-health-stripsupply ${left === 0 ? "is-empty" : left <= 1 ? "is-low" : ""}`.trim(),
      `×${left}`);
    supply.dataset.tooltip = `${entry.medicine || "brak leku"} — ${left} ${_dosesWord(left)}`
      + (dosedToday(entry) ? " · dawka wzięta dzisiaj" : " · dawka NIE wzięta");
    if (dosedToday(entry)) supply.classList.add("is-dosed");
    row.appendChild(supply);

    const all = diseaseStages(entry);
    const head = stage
      ? `${entry.name} ${entry.stage + 1}/${all.length} — ${stage.label}`
      : `${entry.name} — stan ogólny`;
    row.dataset.tooltipHtml = _tipHtml(head, _sentences(all[entry.stage ?? 0]));
    row.dataset.tooltipClass = "neuro-stan-tip";
    strip.appendChild(row);
  }

  for (const entry of fobie) {
    const row = _el("div", "neuro-health-striprow");
    const dot = _el("span", "neuro-health-stripdot");
    dot.style.background = entry.active ? "#8e44ad" : entry.broken ? "#27ae60" : "#7f8c8d";
    row.appendChild(dot);
    row.appendChild(_el("span", "neuro-health-stripname", entry.name));
    const state = _el("span", "neuro-health-stripstate",
      entry.active ? "lęk" : entry.broken ? "przeł." : `${entry.streak ?? 0}/${PHOBIA_CURE_STREAK}`);
    row.appendChild(state);

    const lines = _sentences(entry.effect);
    if (!entry.broken) {
      lines.push(`Zdane RO z rzędu: ${entry.streak ?? 0}/${PHOBIA_CURE_STREAK} — trzy łamią fobię`);
    }
    row.dataset.tooltipHtml = _tipHtml(
      `${entry.name} — ${entry.active ? "lęk aktywny" : entry.broken ? "przełamana" : "uśpiona"}`,
      lines);
    row.dataset.tooltipClass = "neuro-stan-tip";
    strip.appendChild(row);
  }

  return strip;
}

/* -------------------------------------------- */
/*  Injection                                    */
/* -------------------------------------------- */

function _onRenderCharacterSheet(app, html) {
  const actor = app.document ?? app.actor;
  if (actor?.type !== "character") return;

  const root = html instanceof HTMLElement ? html
    : html?.[0] instanceof HTMLElement ? html[0]
    : html?.element instanceof HTMLElement ? html.element
    : null;
  if (!root) return;

  const editable = actor.isOwner && app.isEditable !== false;

  _injectPanel(root, actor, editable);
}

function _injectPanel(root, actor, editable) {
  const bio = root.querySelector('.tab[data-tab="biography"]')
    ?? root.querySelector('section[data-tab="biography"]');
  if (!bio) return;
  if (bio.querySelector(`.${PANEL_CLASS}`)) return;

  const panel = _el("div", PANEL_CLASS);

  panel.appendChild(_buildBlock({
    title: "Choroby",
    icon: "fa-solid fa-virus",
    entries: getChoroby(actor),
    rowBuilder: entry => _buildDiseaseRow(actor, entry, editable),
    options: diseaseOptions(),
    onAdd: key => addDisease(actor, key),
    editable,
    emptyText: "Brak chorób. Wybierz z listy albo dodaj własną."
  }));

  panel.appendChild(_buildBlock({
    title: "Fobie",
    icon: "fa-solid fa-brain",
    entries: getFobie(actor),
    rowBuilder: entry => _buildPhobiaRow(actor, entry, editable),
    options: phobiaOptions(),
    onAdd: key => addPhobia(actor, key),
    editable,
    emptyText: "Brak fobii. Wybierz z listy albo dodaj własną."
  }));

  // Above the free-text biography, below the ideals/bonds/flaws block.
  const bottom = bio.querySelector(".bottom");
  if (bottom) bottom.before(panel);
  else bio.appendChild(panel);
}
