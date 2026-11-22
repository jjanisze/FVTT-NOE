/**
 * The approved style profile — the only source of the finish engine's colours and geometry.
 * A visual change is a new profile version, never an edit here or in a recipe (PLAN_m9_style.md §7.1).
 */
import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";

export const MODULE_ID = "neuroshima-2026-overrides";
export const MODULE_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
export const PROFILE_PATH = path.join(MODULE_ROOT, "dev/icons/finish/style-profile.json");
export const MANIFEST_PATH = path.join(MODULE_ROOT, "dev/finish/manifest.json");

export const rel = p => path.relative(MODULE_ROOT, p).replaceAll("\\", "/");
export const abs = p => path.join(MODULE_ROOT, p);
export const sha256 = data => createHash("sha256").update(data).digest("hex");
export const sha256File = file => sha256(fs.readFileSync(file));
/** Generators write LF; a Windows checkout may hold CRLF — compare text, never bytes. */
export const sameText = (a, b) => a.replaceAll("\r\n", "\n") === b.replaceAll("\r\n", "\n");

export function loadProfile() {
  const profile = JSON.parse(fs.readFileSync(PROFILE_PATH, "utf8"));
  if (profile.schema !== "noe-icon-style/v1") throw new Error(`Nieznany schemat profilu: ${profile.schema}`);
  if (profile.status !== "design-approved") throw new Error(`Profil ${profile.id} nie jest zatwierdzony (status: ${profile.status})`);
  return profile;
}

export function loadManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return { schema: "noe-finish-manifest/v1", profile: null, entries: [] };
  const manifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, "utf8"));
  if (manifest.schema !== "noe-finish-manifest/v1") throw new Error(`Nieznany schemat manifestu: ${manifest.schema}`);
  return manifest;
}

export function saveManifest(manifest) {
  fs.writeFileSync(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);
}

/** The recipe a family resolves to: colours for the raster stage, straight from the profile. */
export function recipeFor(profile, family) {
  const def = profile.contentFamilies[family];
  if (!def) return null;
  if (def.role === "character") {
    const src = profile.sources[def.source];
    return { role: "character", name: "character", source: def.source, ground: src.ground, glyph: src.foreground, accent: src.accent };
  }
  if (def.role === "equipment") return { role: "equipment", name: "equipment", glyph: def.accent };
  return { role: "operation", name: "operation", glyph: profile.theme.foreground };
}
