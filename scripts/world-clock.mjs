/**
 * Neuroshima 5e — GM world-clock advance.
 *
 * A single "spend N minutes" action for GM-paced downtime beats — searching a room,
 * patching a wound, waiting out a patrol — the kind of thing that costs time but isn't
 * worth a full turn tracker. Foundry's world clock (`game.time.worldTime`, the calendar
 * widget at the top of the UI) only moves when something tells it to: combat rounds
 * (6 s each — too slow to matter here), a Rest, or a human nudging it. This is that
 * "something," deliberately dumb: no confirmation dialog, no undo. Advancing time by
 * a fixed, small amount is exactly the sort of frequent, low-stakes GM action a dialog
 * would only slow down — if a GM fat-fingers it, `game.time.advance(-600)` undoes it.
 *
 * This is the mechanism `weapons/pochodnia.mjs`'s fuel burn-down (and, eventually,
 * `latarka`/battery drain) rides on — see DEV_GUIDE.md §10e and the project's own notes
 * on `ActiveEffectRegistry` for why "world time doesn't advance on its own" is a
 * deliberate design point here, not a gap to route around: game-paused means no fuel
 * burns, and that's the intent, not a bug.
 */

const MODULE_ID = "neuroshima-2026-overrides";

/** Drop a file here to give the clock a real sound; silently does nothing until then. */
const TICK_SOUND = `modules/${MODULE_ID}/sounds/gm/tick-tock.ogg`;

const MACRO_NAME = "⏱ Czas: +10 minut";
const MACRO_FLAG = "gmClockMacro";

/**
 * Advance the world clock by `minutes` (GM only). Plays a tick sound (if one's been
 * dropped at `TICK_SOUND`) and posts a chat line with the new in-fiction date/time.
 * @param {number} minutes
 * @returns {Promise<{before: number, after: number}|null>} `null` if not GM.
 */
export async function advanceWorldTime(minutes = 10) {
  if (!game.user.isGM) {
    ui.notifications.warn("Tylko MG może przesuwać czas świata.");
    return null;
  }

  const before = game.time.worldTime;
  await game.time.advance(minutes * 60);

  _playTick();

  const label = _formatWorldTime();
  await ChatMessage.create({
    speaker: { alias: "Zegar świata" },
    content: `<div style="border-left:3px solid #888;padding-left:8px;">
      <strong>Mija czas: +${minutes} min.</strong>${label ? ` Teraz: <em>${label}</em>.` : ""}
    </div>`
  });

  return { before, after: game.time.worldTime };
}

function _playTick() {
  foundry.audio.AudioHelper.play({ src: TICK_SOUND, volume: 0.5, loop: false }).catch(() => {});
}

/** "20 września 2070, 21:40" — same month-name source (this module's own genitive Polish
 *  overrides in lang/pl.json) the core calendar widget itself uses, so the two never disagree. */
function _formatWorldTime() {
  const c = game.time.components;
  const monthDef = CONFIG.time?.worldCalendarConfig?.months?.values?.[c.month];
  const monthName = monthDef ? game.i18n.localize(monthDef.name) : null;
  if (!monthName) return null;
  const hh = String(c.hour).padStart(2, "0");
  const mm = String(c.minute).padStart(2, "0");
  return `${c.dayOfMonth + 1} ${monthName} ${c.year}, ${hh}:${mm}`;
}

/** Idempotent — creates the hotbar macro once per world, never duplicates it. */
async function ensureClockMacro() {
  if (!game.user.isGM) return;
  const existing = game.macros.find(m => m.getFlag(MODULE_ID, MACRO_FLAG));
  if (existing) return;

  await Macro.create({
    name: MACRO_NAME,
    type: "script",
    img: "icons/svg/clockwork.svg",
    command: "await game.neuroshima.time.advance(10);",
    flags: { [MODULE_ID]: { [MACRO_FLAG]: true } }
  });
  ui.notifications.info(`Utworzono makro „${MACRO_NAME}" w katalogu Makr — przeciągnij je na hotbar.`);
}

// Called from main.mjs's own ready-time registration block — "ready" has already
// fired by the time this runs (same reason `registerPochodnia()` calls
// `ensureAllPochodniaActivities()` directly instead of re-registering `Hooks.once("ready")`,
// which would never fire again this session).
export function registerWorldClock() {
  if (game.user.isGM) ensureClockMacro();
  console.log("Neuroshima 5e | GM world clock registered");
}

/** Public API, exposed on `game.neuroshima.time` from main.mjs. */
export const worldClockApi = { advance: advanceWorldTime };
