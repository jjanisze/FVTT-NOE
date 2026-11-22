/**
 * Finish engine · integration (PLAN_m9_style.md §7.5) — point builders at finished exports.
 *
 * The manifest knows, per subject, which pack documents wear it. The pack builder asks here for
 * each document; a subject that is not exported yet (no file, or still "planned") keeps its white
 * master — never an empty image. Document ids and UUIDs are untouched: only `img` changes.
 */
import fs from "node:fs";
import { MODULE_ID, abs, loadManifest } from "./profile.mjs";

const EXPORTED = new Set(["pilot", "approved"]);

export function finisher({ manifest = loadManifest(), exists = out => fs.existsSync(abs(out)) } = {}) {
  const byDoc = new Map();
  for (const entry of manifest.entries) {
    if (entry.kind !== "icon" || !EXPORTED.has(entry.review?.status)) continue;
    const out = entry.outputs[0].path;
    if (!exists(out)) continue;
    for (const c of entry.consumers) if (c.type === "pack") for (const id of c.ids ?? []) {
      const key = `${c.pack}:${c.via}:${id}`, image = `modules/${MODULE_ID}/${out}`;
      if (byDoc.has(key) && byDoc.get(key) !== image) throw new Error(`Ambiguous finished icon consumer: ${key}`);
      byDoc.set(key, image);
    }
  }
  let applied = 0;
  return {
    /** Mutates `doc.img` and its activities' `img`. */
    apply(pack, doc, { parentId } = {}) {
      const ref = parentId ? `${parentId}.${doc._id}` : doc._id;
      const via = parentId ? "actor.items[]" : "item";
      const img = byDoc.get(`${pack}:${via}.img:${ref}`);
      if (img) { doc.img = img; applied++; }
      for (const [activityId, activity] of Object.entries(doc.system?.activities ?? {})) {
        const actImg = byDoc.get(`${pack}:${via}.system.activities[].img:${ref}.${activityId}`);
        if (actImg) { activity.img = actImg; applied++; }
      }
      return doc;
    },
    get applied() { return applied; }
  };
}
