/**
 * Wykończone ikony NOE wskazywane w kodzie (PLAN_m9_style.md §7.5).
 *
 * Dokumenty kompendiów dostają wykończoną ikonę przy budowie paczek. Ikony, które nazywa kod —
 * tryby ognia, przeładowanie, czynności podstawowe — przechodzą przez tę funkcję. Brak eksportu
 * oznacza dotychczasowy biały master: nigdy pusty obrazek.
 */
import { FINISHED_ICONS, FINISHED_ICONS_BY_FAMILY, FINISHED_ICONS_BY_CONSUMER } from "./finished-icons-data.mjs";

const MODULE_PREFIX = "modules/neuroshima-2026-overrides/";

/**
 * @param {string} path  Ścieżka białego mastera — z prefiksem `modules/<id>/` albo bez.
 * @param {{family?: string, consumer?: string}} [options] Jawna rodzina lub plik konsumenta.
 * @returns {string}     Ścieżka wykończonej ikony w tej samej postaci, albo `path` bez zmian.
 */
export function finishedIcon(path, { family, consumer } = {}) {
  if (typeof path !== "string") return path;
  const prefixed = path.startsWith(MODULE_PREFIX);
  const relative = prefixed ? path.slice(MODULE_PREFIX.length) : path;
  const finished = family ? FINISHED_ICONS_BY_FAMILY[family]?.[relative]
    : FINISHED_ICONS_BY_CONSUMER[consumer]?.[relative] ?? FINISHED_ICONS[relative];
  if (!finished) return path;
  return prefixed ? `${MODULE_PREFIX}${finished}` : finished;
}

const EQUIPMENT = new Set(["weapon", "ammo", "armor", "tools", "medical", "chemicals", "explosives", "survival", "salvage", "devices", "documents"]);
const familyIn = img => typeof img === "string" ? img.match(/^(?:modules\/neuroshima-2026-overrides\/)?icons\/finished\/([^/]+)\//)?.[1] : undefined;

/** Cosmetic updates for a newly created item; existing world documents are never traversed. */
export function finishedItemUpdates(data) {
  const flags = data.flags?.["neuroshima-2026-overrides"] ?? {};
  const explicit = flags.fant ? (["jedzenie", "napoj"].includes(flags.fant.rodzaj) ? "survival" : "salvage") : undefined;
  const img = finishedIcon(data.img, { family: explicit });
  const family = familyIn(img);
  const updates = {};
  if (img !== data.img) updates.img = img;
  const activityFamily = EQUIPMENT.has(family) ? "utility" : family;
  for (const [id, activity] of Object.entries(data.system?.activities ?? {})) {
    const image = finishedIcon(activity.img, { family: activityFamily });
    if (image !== activity.img) updates[`system.activities.${id}.img`] = image;
  }
  return updates;
}

/** Register after init-time canonical icon assignment, on the creating client only. */
export function registerFinishedItemIcons() {
  Hooks.once("ready", () => Hooks.on("preCreateItem", item => {
    const updates = finishedItemUpdates(item.toObject());
    if (Object.keys(updates).length) item.updateSource(updates);
  }));
}
