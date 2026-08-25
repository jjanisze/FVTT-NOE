/**
 * Neuroshima 5e — enforcement for Upojenie and Skażenie radioaktywne.
 *
 * These are the two Neuroshima stany with a level track that dnd5e has no
 * equivalent for. dnd5e *does* have levelled-condition machinery, but it is keyed
 * to the literal id `exhaustion` and to `system.attributes.exhaustion`
 * (`active-effect.mjs` → `_prepareExhaustionLevel`, `_manageExhaustion`), so none of
 * it is reusable. This file supplies the missing parts:
 *
 *  1. **Level storage** — `flags.<module>.upojenie` / `.skazenie`, a plain integer
 *     0–4. Everything else derives from it, so there is exactly one place a level
 *     can change and one hook needed to react.
 *  2. **Active Effects** — one per condition, rebuilt from the level. Same contract
 *     as `disease-effects.mjs`: real, visible, module-owned effects (flagged
 *     `levelledCondition`), never touching anything added by hand.
 *  3. **Token HUD cycling** — left-click raises, right-click lowers, mirroring how
 *     Wyczerpanie behaves. Registered the same way dnd5e registers its own
 *     (capture-phase document listeners keyed off `data-status-id`).
 *  4. **The saves the tables exist for** — `drink()` and `radiationSave()`.
 *  5. **One entry point for every track** — `trackLevel` / `setTrackLevel` dispatch
 *     through the HUD registry, so Zranienie (owned by `combat/zranienie.mjs`) answers
 *     to the same API as the two conditions stored here.
 *
 * ## Deliberately not automated
 * The *triggers* are left to the table: nothing here watches the clock for the
 * four-hour Kac step or the hourly radiation tick, and nothing tags a scene as
 * contaminated. Those are time-and-place rulings the GM makes; this layer supplies
 * the buttons and does the arithmetic once a ruling is made.
 */

import { LEVELLED_CONDITIONS, UPOJENIE_LEVELS, SKAZENIE_LEVELS,
  UPOJENIE_DRINK_DC, UPOJENIE_SOBER_DC, SKAZENIE_DISEASE_THRESHOLD } from "../config/levelled-conditions-data.mjs";
import { addExhaustion } from "../config/exhaustion.mjs";
import { seqScrollText } from "../weapons/sequencer.mjs";
import { addDisease, getChoroby } from "./health-panel.mjs";
import { STATE_COLORS } from "../config/state-colors.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const EFFECT_FLAG = "levelledCondition";
/** Failed radiation saves so far, toward choroba popromienna. */
const RAD_FAILURES_FLAG = "skazenieFailures";

/* -------------------------------------------- */
/*  Registration                                 */
/* -------------------------------------------- */

export function registerLevelledConditions() {
  // The two conditions this file owns outright. Zranienie adds itself from
  // `combat/zranienie.mjs`; registration order does not matter, because the HUD
  // hooks read the map at render time, not at registration time.
  for (const [id, def] of Object.entries(LEVELLED_CONDITIONS)) {
    registerHudLevelled(id, {
      label: def.label,
      max: def.max,
      get: actor => getLevel(actor, id),
      set: (actor, level) => setLevel(actor, id, level),
      summary: level => _levelSummary(def, level)
    });
  }

  // One hook covers every path that can move a level: HUD click, API, macro.
  // Clearing a level deletes the flag rather than writing 0, and Foundry spells a
  // deletion `-=key` — matching only the bare key would leave the effect behind
  // on exactly the transition that is supposed to remove it.
  Hooks.on("updateActor", (actor, changed) => {
    const flags = foundry.utils.getProperty(changed, `flags.${MODULE_ID}`) ?? {};
    const touched = Object.keys(LEVELLED_CONDITIONS)
      .some(id => (flags[id] !== undefined) || (flags[`-=${id}`] !== undefined));
    if (!touched) return;
    if (!actor.isOwner) return;
    syncLevelledConditions(actor);
  });

  // Backfill, for the same reasons as diseases: sheets that predate this layer,
  // and edits to the level tables that need to reach actors nobody will open.
  // The sync is a no-op when nothing differs.
  Hooks.once("ready", () => {
    if (!game.user.isGM) return;
    for (const actor of game.actors) {
      if (!Object.keys(LEVELLED_CONDITIONS).some(id => getLevel(actor, id) > 0)) continue;
      syncLevelledConditions(actor);
    }
  });

  // Attack-roll disadvantage — dnd5e has no `attack.roll.mode` field, so it has to
  // ride the roll config, same as diseases and weapon addons.
  Hooks.on("dnd5e.postBuildAttackRollConfig", _onPostBuildAttackRollConfig);

  // Level cycling in the token HUD. dnd5e does this with capture-phase document
  // listeners rather than a render hook, because the HUD re-renders on every
  // toggle; matching that means one registration instead of a rebind per render.
  document.addEventListener("click", _onClickTokenHUD, { capture: true });
  document.addEventListener("contextmenu", _onClickTokenHUD, { capture: true });

  // Show the current level on the HUD. Stany z własnym kompletem ikon podmieniają tło
  // kontrolki tak jak dnd5e dla Wyczerpania; Upojenie i Skażenie — rysowane ręcznie,
  // bez cyfr w plikach — dostają badge w barwie swojego toru.
  Hooks.on("renderTokenHUD", _onRenderTokenHUD);

  console.log(`${MODULE_ID} | Stany stopniowane zarejestrowane (Upojenie, Skażenie)`);
}

/* -------------------------------------------- */
/*  HUD registry                                 */
/* -------------------------------------------- */

/**
 * @typedef {object} LevelledTrack
 * @property {string} label
 * @property {number} max
 * @property {(actor: Actor) => number} get
 * @property {(actor: Actor, level: number) => Promise<any>} set
 * @property {((level: number) => {title?: string, lines: string[]})} [summary]
 * @property {((level: number) => string)} [img]  Ikona z wrysowaną cyfrą poziomu, jeśli stan takową ma.
 */

/**
 * Conditions that cycle by level in the token HUD.
 *
 * Upojenie and Skażenie register themselves from `LEVELLED_CONDITIONS` below.
 * **Stopień Zranienia registers from `combat/zranienie.mjs`** — it owns its own
 * store, penalties and pips, and long predates this file. Inverting the dependency
 * this way keeps that ownership intact: this layer supplies the HUD gesture and the
 * badge, and never learns how wounds work.
 *
 * `get`/`set` are the owner's accessors, so a HUD click and a pip click are the same
 * write against the same store — which is the whole point. Nothing here caches a
 * level; every read goes back to the owner.
 *
 * @type {Map<string, LevelledTrack>}
 */
const HUD_CYCLE = new Map();

/**
 * Register a levelled condition for token-HUD cycling, level badging and the Stan panel.
 * @param {string} id  Status id, as registered in `CONFIG.DND5E.conditionTypes`.
 * @param {LevelledTrack} spec
 *   `summary` reports everything the character suffers *at* that level, already accumulated.
 *   Conditions whose levels carry no penalty of their own (Skażenie) simply omit it.
 *   `img` podają stany, które mają komplet ikon z cyfrą — wtedy HUD pokazuje poziom tak
 *   samo jak dnd5e robi to dla Wyczerpania, zamiast doklejać badge.
 */
export function registerHudLevelled(id, { label, max, get, set, summary, img }) {
  HUD_CYCLE.set(id, { label, max, get, set, summary, img });
}

/**
 * Cumulative penalty text for a table-driven condition. Skażenie's rows carry no `text`,
 * because its levels are contamination bands rather than penalties, so it yields nothing.
 * @param {object} def  A `LEVELLED_CONDITIONS` entry.
 * @param {number} level
 * @returns {{lines: string[]}}
 */
function _levelSummary(def, level) {
  if (level <= 0) return { lines: [] };
  const rows = def.cumulative
    ? def.levels.filter(r => r.level <= level)
    : def.levels.filter(r => r.level === level);
  return { lines: rows.filter(r => r.text).map(r => r.text) };
}

/**
 * Read-only view of the levelled-condition registry, for surfaces that render every
 * track at once (the sheet shell's Stan panel).
 * @returns {Map<string, LevelledTrack>}
 */
export function getLevelledRegistry() {
  return HUD_CYCLE;
}

/* -------------------------------------------- */
/*  Public track API                             */
/* -------------------------------------------- */

/**
 * Every registered track, by id — including the ones this file does not own.
 * `getLevel`/`setLevel` below reach only the flag store, so they cannot see Zranienie;
 * routing the public API through the registry is what makes one entry point cover all
 * three tracks. An unknown id throws rather than returning 0, because a silent no-op
 * here reads exactly like a condition that was already clear.
 * @param {string} id
 * @returns {LevelledTrack}
 */
function _track(id) {
  const track = HUD_CYCLE.get(id);
  if (!track) {
    throw new Error(`${MODULE_ID} | Nieznany stan stopniowany "${id}". Dostępne: ${[...HUD_CYCLE.keys()].join(", ")}`);
  }
  return track;
}

/**
 * Current level of any registered track.
 * @param {Actor} actor
 * @param {string} id
 * @returns {number}
 */
export function trackLevel(actor, id) {
  return _track(id).get(actor) ?? 0;
}

/**
 * Set any registered track, through its owner's writer — so this and a pip click and a
 * HUD click are all the same write.
 * @param {Actor} actor
 * @param {string} id
 * @param {number} level
 * @returns {Promise<number>} The level actually stored.
 */
export async function setTrackLevel(actor, id, level) {
  const track = _track(id);
  await track.set(actor, Math.clamp(Math.round(level), 0, track.max));
  return track.get(actor);
}

/**
 * Move any registered track by a delta.
 * @returns {Promise<number>} The new level.
 */
export async function adjustTrackLevel(actor, id, delta) {
  return setTrackLevel(actor, id, trackLevel(actor, id) + delta);
}

/* -------------------------------------------- */
/*  Level accessors — flag store                 */
/* -------------------------------------------- */

/**
 * Current level of a condition stored in this file's flags.
 * Only Upojenie and Skażenie live here — for a track-agnostic read use `trackLevel`.
 * @param {Actor} actor
 * @param {string} id  Key in LEVELLED_CONDITIONS.
 * @returns {number} 0 when absent.
 */
function getLevel(actor, id) {
  const raw = actor?.getFlag(MODULE_ID, id);
  return Number.isFinite(raw) ? Math.clamp(raw, 0, LEVELLED_CONDITIONS[id]?.max ?? 4) : 0;
}

/**
 * Set a flag-stored condition outright. Clamped to the condition's max; writing 0
 * deletes the flag so actors do not accumulate zeroed keys.
 * @param {Actor} actor
 * @param {string} id
 * @param {number} level
 * @param {object} [options]
 * @param {boolean} [options.chat=true]  Post a chat message describing the change.
 * @returns {Promise<number>} The level actually stored.
 */
async function setLevel(actor, id, level, { chat = true } = {}) {
  const def = LEVELLED_CONDITIONS[id];
  if (!actor || !def) return 0;

  const previous = getLevel(actor, id);
  const next = Math.clamp(Math.round(level), 0, def.max);
  if (next === previous) return previous;

  await actor.update(next > 0
    ? { [`flags.${MODULE_ID}.${id}`]: next }
    : { [`flags.${MODULE_ID}.-=${id}`]: null });

  if (chat) {
    const verb = next > previous ? "otrzymuje" : "traci";
    const detail = next > 0 ? ` — stopień ${next}/${def.max}` : " — stan ustępuje";
    await ChatMessage.create({
      content: `<strong>${actor.name}</strong> ${verb} <em>${def.label}</em>${detail}.`,
      speaker: ChatMessage.getSpeaker({ actor })
    });
  }

  if (next > previous) {
    seqScrollText(def.label.toUpperCase(), actor, {
      color: id === "upojenie" ? "#c88a2e" : "#7ac943", fontSize: 26, duration: 1800
    });
  }
  return next;
}

/**
 * Move a flag-stored condition by a delta. The common case for the Kac / exposure
 * rules, both of which step by one.
 * @returns {Promise<number>} The new level.
 */
async function adjustLevel(actor, id, delta, options = {}) {
  return setLevel(actor, id, getLevel(actor, id) + delta, options);
}

/* -------------------------------------------- */
/*  Active Effect sync                           */
/* -------------------------------------------- */

/**
 * Active Effect data for a condition at its current level. Skażenie nie niesie
 * żadnych `changes` — jego konsekwencje przychodzą jako Wyczerpanie — ale i tak
 * dostaje efekt, bo znacznik na żetonie jest całym sensem tego stanu.
 */
function _buildEffect(id, level) {
  const def = LEVELLED_CONDITIONS[id];
  if (!def || level <= 0) return null;

  // Upojenie is cumulative — stopień 3 also carries 1 and 2. Skażenie is not.
  const rows = def.cumulative
    ? def.levels.filter(r => r.level <= level)
    : def.levels.filter(r => r.level === level);

  const changes = rows.flatMap(r => (r.changes ?? []).map(c => ({ ...c })));
  // Własne id stanu na efekcie: to ono zapala ikonę żetonu i łączy efekt z przyciskiem
  // HUD w jedną rzecz zamiast dwóch, które tylko wyglądają podobnie.
  const statuses = [id, ...rows.flatMap(r => r.statuses ?? [])];

  const text = rows.map(r => `<p><strong>Stopień ${r.level}.</strong> ${r.text}</p>`).join("");
  const manual = rows.filter(r => r.manual).map(r => r.manual);

  return {
    name: `${def.label} ${level}`,
    img: `modules/${MODULE_ID}/icons/statuses/${id}.svg`,
    changes,
    statuses: [...new Set(statuses)],
    // FVTT v14: `isTemporary` liczy tylko czas trwania, a domyślne `CONDITIONAL`
    // znaczy „rysuj tylko, jeśli tymczasowy" — bez tego ikona nie wchodzi na żeton.
    showIcon: CONST.ACTIVE_EFFECT_SHOW_ICON.ALWAYS,
    disabled: false,
    transfer: false,
    description: text + (manual.length
      ? `<hr><p><em>Poza automatyką:</em> ${manual.join(" ")}</p>`
      : ""),
    flags: { [MODULE_ID]: { [EFFECT_FLAG]: { id, level } } }
  };
}

/**
 * Reconcile an actor's module-owned levelled-condition effects with their current
 * levels: create what is missing, update what drifted, delete what no longer holds.
 * @param {Actor} actor
 */
export async function syncLevelledConditions(actor) {
  if (!actor) return;

  const wanted = new Map();
  for (const id of Object.keys(LEVELLED_CONDITIONS)) {
    const data = _buildEffect(id, getLevel(actor, id));
    if (data) wanted.set(id, data);
  }

  const toDelete = [];
  const toUpdate = [];
  for (const effect of actor.effects.filter(e => e.getFlag(MODULE_ID, EFFECT_FLAG))) {
    const { id } = effect.getFlag(MODULE_ID, EFFECT_FLAG);
    const target = wanted.get(id);
    if (!target) { toDelete.push(effect.id); continue; }
    wanted.delete(id);

    // Only write on a real difference — this runs on every level change, and a
    // pointless update re-renders every open sheet.
    const current = effect.toObject();
    const differs = current.name !== target.name
      || current.showIcon !== target.showIcon
      || JSON.stringify(current.changes) !== JSON.stringify(target.changes)
      || JSON.stringify([...(current.statuses ?? [])].sort()) !== JSON.stringify([...target.statuses].sort());
    if (differs) toUpdate.push({ _id: effect.id, ...target });
  }

  if (toDelete.length) await actor.deleteEmbeddedDocuments("ActiveEffect", toDelete);
  if (toUpdate.length) await actor.updateEmbeddedDocuments("ActiveEffect", toUpdate);
  if (wanted.size) await actor.createEmbeddedDocuments("ActiveEffect", [...wanted.values()]);
}

/* -------------------------------------------- */
/*  Attack rolls                                 */
/* -------------------------------------------- */

/**
 * Hook: `dnd5e.postBuildAttackRollConfig`.
 *
 * Only Upojenie stopień 3 reaches attacks ("Utrudnienie do wszystkich testów").
 * Writes `advantageMode` directly rather than `options.disadvantage`, because
 * `applyKeybindings` has already resolved that boolean by the time this hook runs —
 * see the header of `actors/disease-effects.mjs`.
 */
function _onPostBuildAttackRollConfig(process, config) {
  const activity = process?.subject;
  const actor = activity?.actor ?? activity?.item?.actor;
  if (!actor) return;

  const reasons = [];
  for (const [id, def] of Object.entries(LEVELLED_CONDITIONS)) {
    const level = getLevel(actor, id);
    if (!level) continue;
    const rows = def.cumulative ? def.levels.filter(r => r.level <= level) : def.levels.filter(r => r.level === level);
    if (rows.some(r => r.attack === "all")) reasons.push(`${def.label} ${level}`);
  }
  if (!reasons.length) return;

  const ADV = CONFIG.Dice.D20Roll.ADV_MODE;
  config.options ??= {};
  config.options.advantageMode = config.options.advantageMode === ADV.ADVANTAGE
    ? ADV.NORMAL        // advantage and disadvantage cancel, as 5e stacks them
    : ADV.DISADVANTAGE;
  config.options.neuroLevelledPenalty = reasons;
}

/* -------------------------------------------- */
/*  Token HUD level cycling                      */
/* -------------------------------------------- */

/**
 * Left-click raises a levelled condition, right-click lowers it — the same gesture
 * Wyczerpanie already uses, so the two behave alike in the HUD.
 * @param {PointerEvent} event
 */
function _onClickTokenHUD(event) {
  const target = event.target;
  if (!target?.classList?.contains("effect-control")) return;

  const id = target.dataset?.statusId;
  const spec = HUD_CYCLE.get(id);
  if (!spec) return;

  const actor = canvas.hud.token?.object?.actor;
  if (!actor) return;

  // Stop the default toggle: left-clicking a status normally flips it on or off,
  // which for a levelled condition would jump straight between 0 and 1 and skip
  // whatever the owner does on the way (chat, riders, auto-Wyczerpanie).
  event.preventDefault();
  event.stopPropagation();

  const level = spec.get(actor);
  spec.set(actor, Math.clamp(level + (event.button === 0 ? 1 : -1), 0, spec.max));
}

/**
 * Stamp the current level onto the HUD icon, and spell it out in the tooltip so the
 * number is not the only cue.
 *
 * Stany, które mają własny komplet ikon z cyfrą (`spec.img`), pokazują poziom przez
 * podmianę tła kontrolki — dokładnie tak, jak dnd5e robi to dla Wyczerpania w
 * `ActiveEffect5e.onTokenHUDRender`. Powielenie tamtej sztuczki zamiast wymyślania
 * własnej jest tu celowe: HUD ma mówić jednym językiem niezależnie od tego, kto
 * rysuje którą ikonę. Badge zostaje dla stanów bez takiego kompletu.
 *
 * The badge cannot be a child of the icon: Foundry builds each status control as a
 * bare `<img class="effect-control">`, and `<img>` is a void element — appending to
 * it is accepted by the DOM and then never rendered. So the badge goes into the
 * palette instead (which is `position: absolute`, and therefore both the containing
 * block and the icons' `offsetParent`) and is positioned over its icon.
 *
 * Position has to be measured, and at render time the palette is still collapsed,
 * so every offset would read 0. A ResizeObserver re-runs the placement when the
 * palette is actually laid out, which is also what keeps the badge correct if the
 * HUD is rescaled.
 *
 * @param {Application} hud
 * @param {HTMLElement|jQuery} html
 */
function _onRenderTokenHUD(hud, html) {
  const actor = hud.object?.actor;
  if (!actor) return;

  const root = html instanceof HTMLElement ? html : html?.[0];
  if (!root) return;

  const needBadge = [];
  for (const [id, spec] of HUD_CYCLE) {
    const control = root.querySelector(`[data-status-id="${id}"]`);
    if (!control) continue;

    const level = spec.get(actor);
    control.setAttribute("data-tooltip", level ? `${spec.label} ${level}/${spec.max}` : spec.label);
    if (!level) continue;
    if (spec.img) {
      control.style.objectPosition = "-100px";
      control.style.background = `url('${spec.img(level)}') no-repeat center / contain`;
      continue;
    }
    needBadge.push({ control, level, id });
  }

  const palette = needBadge[0]?.control?.parentElement;
  // Stale badges from the previous render of this same element.
  root.querySelectorAll(".neuro-condition-level").forEach(b => b.remove());
  if (!palette) return;

  const badges = needBadge.map(({ control, level, id }) => {
    const badge = document.createElement("span");
    badge.className = "neuro-condition-level";
    if (STATE_COLORS[id]) badge.style.setProperty("--neuro-badge-color", STATE_COLORS[id]);
    badge.textContent = String(level);
    palette.append(badge);
    return { badge, control };
  });

  const place = () => {
    for (const { badge, control } of badges) {
      if (!control.offsetWidth) continue;   // palette still collapsed
      badge.style.left = `${control.offsetLeft + control.offsetWidth - 10}px`;
      badge.style.top = `${control.offsetTop + control.offsetHeight - 10}px`;
      badge.style.visibility = "visible";
    }
  };
  place();
  new ResizeObserver(place).observe(palette);
}

/* -------------------------------------------- */
/*  Upojenie — the drink and the hangover        */
/* -------------------------------------------- */

/**
 * Wypij porcję — 100 ml mocnego lub 500 ml słabego alkoholu. RO na Kondycję o ST 15;
 * porażka to jeden stopień Upojenia.
 * @param {Actor} actor
 * @returns {Promise<{roll: Roll, success: boolean, level: number}|null>}
 */
async function drink(actor) {
  if (!actor) return null;

  const roll = await actor.rollSavingThrow(
    { ability: "con", target: UPOJENIE_DRINK_DC },
    { configure: false }
  );
  const result = Array.isArray(roll) ? roll[0] : roll;
  if (!result) return null;

  const success = result.total >= UPOJENIE_DRINK_DC;
  const level = success ? getLevel(actor, "upojenie") : await adjustLevel(actor, "upojenie", 1);

  await ChatMessage.create({
    content: success
      ? `<strong>${actor.name}</strong> wypija porcję i trzyma się na nogach.`
      : `<strong>${actor.name}</strong> wypija porcję — <em>Upojenie ${level}</em>.`,
    speaker: ChatMessage.getSpeaker({ actor })
  });
  return { roll: result, success, level };
}

/**
 * Kac — cztery godziny bez alkoholu obniżają stopień o 1. Przy każdym obniżeniu
 * RO na Kondycję o ST 10; porażka oznacza poziom Wyczerpania.
 *
 * Called once per four-hour block by the GM; nothing here watches the clock.
 * @param {Actor} actor
 * @returns {Promise<{success: boolean, level: number}|null>}
 */
async function soberUp(actor) {
  const current = getLevel(actor, "upojenie");
  if (!actor || current <= 0) return null;

  const roll = await actor.rollSavingThrow(
    { ability: "con", target: UPOJENIE_SOBER_DC },
    { configure: false }
  );
  const result = Array.isArray(roll) ? roll[0] : roll;
  const success = (result?.total ?? 0) >= UPOJENIE_SOBER_DC;

  const level = await adjustLevel(actor, "upojenie", -1, { chat: false });
  if (!success) await addExhaustion(actor, LEVELLED_CONDITIONS.upojenie.exhaustionSource);

  await ChatMessage.create({
    content: `<strong>${actor.name}</strong> trzeźwieje — <em>Upojenie ${level}</em>.`
      + (success ? "" : " Kac zbiera żniwo: <strong>+1 Wyczerpanie</strong>."),
    speaker: ChatMessage.getSpeaker({ actor })
  });
  return { success, level };
}

/* -------------------------------------------- */
/*  Skażenie — the hourly save                   */
/* -------------------------------------------- */

/**
 * RO na Kondycję against a contamination band. Failure is a level of Wyczerpanie;
 * the third failure is choroba popromienna and resets the count.
 *
 * The ST is passed in per roll rather than read from the stored level: in play the GM
 * calls a number for the room the character just walked into, and the stored level is
 * only a token marker.
 *
 * Per RAW the test repeats every hour until RadOff is taken — the repetition is the
 * GM's to call, so this rolls exactly once.
 * @param {Actor} actor
 * @param {number} dc
 * @returns {Promise<{success: boolean, failures: number, disease: boolean}|null>}
 */
async function radiationSave(actor, dc) {
  if (!actor || !Number.isFinite(dc)) return null;

  const band = SKAZENIE_LEVELS.find(l => l.dc === dc);
  const bandName = band ? band.name.toLowerCase() : `ST ${dc}`;

  const roll = await actor.rollSavingThrow({ ability: "con", target: dc }, { configure: false });
  const result = Array.isArray(roll) ? roll[0] : roll;
  const success = (result?.total ?? 0) >= dc;

  let failures = actor.getFlag(MODULE_ID, RAD_FAILURES_FLAG) ?? 0;
  let disease = false;
  let note = "";

  if (success) {
    seqScrollText("ODPORNY", actor, { color: "#7fff3f", fontSize: 24 });
  } else {
    failures += 1;
    await addExhaustion(actor, LEVELLED_CONDITIONS.skazenie.exhaustionSource);
    seqScrollText("+1 WYCZERPANIE", actor, { color: "#7fff3f", fontSize: 24 });

    if (failures >= SKAZENIE_DISEASE_THRESHOLD) {
      failures = 0;
      const already = getChoroby(actor).some(e => e.key === "popromienna");
      if (already) {
        note = "<br><strong>Trzecia porażka</strong> — choroba popromienna już się rozwija, licznik wraca do zera.";
      } else {
        await addDisease(actor, "popromienna");
        disease = true;
        note = "<br><strong>Trzecia porażka — choroba popromienna.</strong> Dodana na zakładce Stan zdrowia.";
      }
    } else {
      note = `<br>Oblane RO: ${failures}/${SKAZENIE_DISEASE_THRESHOLD}.`;
    }
  }

  await actor.setFlag(MODULE_ID, RAD_FAILURES_FLAG, failures);

  await ChatMessage.create({
    content: `<strong>${actor.name}</strong> — skażenie ${bandName} (ST ${dc}): `
      + (success ? "wytrzymuje." : "<em>+1 Wyczerpanie</em>.") + note,
    speaker: ChatMessage.getSpeaker({ actor })
  });
  return { success, failures, disease };
}

/**
 * Ask which band the character is standing in, then roll against it.
 * @param {Actor} actor
 */
async function promptRadiationSave(actor) {
  if (!actor) return null;

  const buttons = SKAZENIE_LEVELS.map(l => ({
    action: String(l.dc),
    label: `${l.name} — ST ${l.dc}`,
    callback: () => l.dc
  }));

  const dc = await foundry.applications.api.DialogV2.wait({
    window: { title: "Skażenie radioaktywne — RO na Kondycję" },
    classes: ["neuro-rad-dialog"],
    content: `<p>Jak gorąco jest tam, gdzie stoi <strong>${actor.name}</strong>?</p>`,
    buttons,
    rejectClose: false
  }).catch(() => null);

  if (!dc) return null;
  return radiationSave(actor, Number(dc));
}

/** Failed radiation saves so far, toward choroba popromienna. */
function getRadiationFailures(actor) {
  return actor?.getFlag(MODULE_ID, RAD_FAILURES_FLAG) ?? 0;
}

/**
 * RadOff clears the exposure and the failure count. Levels of Wyczerpanie already
 * taken stay — they are their own state, cleared through the normal rest rules.
 */
async function clearRadiation(actor) {
  if (!actor) return;
  await setLevel(actor, "skazenie", 0, { chat: false });
  await actor.update({ [`flags.${MODULE_ID}.-=${RAD_FAILURES_FLAG}`]: null });
  await ChatMessage.create({
    content: `<strong>${actor.name}</strong> przyjmuje RadOff — skażenie ustępuje.`,
    speaker: ChatMessage.getSpeaker({ actor })
  });
}

/* -------------------------------------------- */
/*  API                                          */
/* -------------------------------------------- */

/** Exposed as `game.neuroshima.conditions`. */
export const levelledConditionsApi = {
  get: trackLevel,
  set: setTrackLevel,
  adjust: adjustTrackLevel,
  tracks: getLevelledRegistry,
  sync: syncLevelledConditions,
  drink,
  soberUp,
  radiationSave,
  promptRadiationSave,
  getRadiationFailures,
  clearRadiation,
  UPOJENIE_LEVELS,
  SKAZENIE_LEVELS
};

export { promptRadiationSave, getRadiationFailures, clearRadiation };
