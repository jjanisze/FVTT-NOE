/**
 * Neuroshima 5e — placeholder art for classes, professions and class abilities.
 *
 *   node dev/icons/gen_class_placeholders.mjs
 *
 * Generates flat SVG badges colour-keyed per class, so the hotbar and compendium
 * read at a glance before real art lands. Replace any file by name and nothing in
 * the code needs to change — filenames are the contract:
 *
 *   icons/klasy/<classId>.svg
 *   icons/profesje/<professionId>.svg
 *   icons/abilities/<abilityId>.svg
 *   icons/abilities/<abilityId>_active.svg    (togglable abilities only)
 *
 * Existing files are never overwritten unless --force is passed, so hand-made art
 * survives a regeneration.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { CLASSES, PROFESSIONS } from "../../scripts/config/classes-data.mjs";
import { CLASS_FEATURES } from "../../scripts/config/class-features-data.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../..");
const FORCE = process.argv.includes("--force");

/** Class palette — also used by the ability icons, so a Brutal power reads as Brutal. */
const PALETTE = {
  brutal:    { bg: "#6b2020", fg: "#f2c9c0", accent: "#c0392b" },
  cwaniak:   { bg: "#6b5320", fg: "#f4e3b0", accent: "#d4a017" },
  spec:      { bg: "#1f4a5c", fg: "#c5e6f2", accent: "#2f8fb0" },
  twardziel: { bg: "#3f4a2a", fg: "#dce8c0", accent: "#7a9440" },
  zlodziej:  { bg: "#33244a", fg: "#d9c9f2", accent: "#7a52b3" },
  zwiadowca: { bg: "#234a33", fg: "#c2ecd3", accent: "#3f9c68" },
  neutral:   { bg: "#3a3a3e", fg: "#dcdcdc", accent: "#8a8a8a" }
};

/** Up to 3 initials from a Polish label, diacritics preserved. */
function initials(label) {
  const words = String(label)
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(w => w.length > 1 || /\p{Lu}/u.test(w));
  if (!words.length) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return words.slice(0, 3).map(w => w[0]).join("").toUpperCase();
}

function svg({ text, bg, fg, accent, active = false }) {
  const size = 64;
  const fontSize = text.length >= 3 ? 20 : text.length === 2 ? 26 : 32;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${bg}" stop-opacity="1"/>
      <stop offset="100%" stop-color="#101012" stop-opacity="1"/>
    </linearGradient>
  </defs>
  <rect x="1" y="1" width="${size - 2}" height="${size - 2}" rx="8" fill="url(#g)"
        stroke="${active ? accent : "#0a0a0c"}" stroke-width="${active ? 3 : 2}"/>
  <rect x="5" y="5" width="${size - 10}" height="${size - 10}" rx="5" fill="none"
        stroke="${accent}" stroke-width="1" opacity="${active ? 0.95 : 0.45}"/>
  ${active ? `<rect x="1" y="1" width="${size - 2}" height="${size - 2}" rx="8" fill="${accent}" opacity="0.16"/>` : ""}
  <text x="50%" y="53%" dominant-baseline="middle" text-anchor="middle"
        font-family="Segoe UI, Arial, sans-serif" font-weight="700"
        font-size="${fontSize}" fill="${fg}"
        style="paint-order:stroke" stroke="#000" stroke-width="0.8">${text}</text>
</svg>`;
}

let written = 0, skipped = 0;
function write(dir, name, content) {
  const abs = path.join(ROOT, "icons", dir);
  fs.mkdirSync(abs, { recursive: true });
  const file = path.join(abs, `${name}.svg`);
  if (fs.existsSync(file) && !FORCE) { skipped++; return; }
  fs.writeFileSync(file, content, "utf8");
  written++;
}

// Classes
for (const [cid, c] of Object.entries(CLASSES)) {
  const p = PALETTE[cid] ?? PALETTE.neutral;
  write("klasy", cid, svg({ text: initials(c.label), ...p }));
}

// Professions — coloured by parent class
for (const [pid, prof] of Object.entries(PROFESSIONS)) {
  const p = PALETTE[prof.klasa] ?? PALETTE.neutral;
  write("profesje", pid, svg({ text: initials(prof.label), ...p }));
}

// Abilities — coloured by owning class (professions inherit their class colour)
for (const f of Object.values(CLASS_FEATURES)) {
  const classId = f.source === "klasa"
    ? f.owner
    : (PROFESSIONS[f.owner]?.klasa ?? null);
  const p = PALETTE[classId] ?? PALETTE.neutral;
  write("abilities", f.id, svg({ text: initials(f.label), ...p }));
  if (f.toggle) {
    write("abilities", `${f.id}_active`, svg({ text: initials(f.label), ...p, active: true }));
  }
}

console.log(`placeholder icons: ${written} written, ${skipped} skipped (already exist)`);
if (skipped && !FORCE) console.log("pass --force to overwrite existing art");
