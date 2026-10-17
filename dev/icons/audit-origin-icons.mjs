/** Source-only coverage: mirrors the pack builder's existing iconFor convention. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { POCHODZENIA, ORIGIN_ABILITIES, pochodzenieItemData } from "../../scripts/config/pochodzenia-data.mjs";
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const date = new Date().toISOString().slice(0, 10);
const output = process.argv.find(arg => arg.startsWith("--output="))?.slice(9) ?? `origin-icons-${date}.json`;
if (path.basename(output) !== output || !output.endsWith(".json")) throw new Error("Expected a JSON report filename under dev/icons");
function asset(source) {
  const absolute = path.join(root, source);
  const exists = fs.existsSync(absolute);
  return { source, exists, sha256: exists ? crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex") : null };
}
const origins = Object.entries(POCHODZENIA).map(([id, def]) => ({
  id, label: def.label, flavour: def.flavour, ...asset(`icons/pochodzenia/${id}.svg`),
  fallback: pochodzenieItemData(id).img
}));
const abilities = Object.entries(ORIGIN_ABILITIES).map(([id, def]) => ({
  id, label: def.label, origin: def.origin, ...asset(`icons/abilities/${id}.svg`)
}));
const stats = { date, scope: "Canonical origin definitions and local assets; no pack or campaign inspection",
  originBackgrounds: origins.length, backgroundIconsPresent: origins.filter(i => i.exists).length,
  backgroundArtGaps: origins.filter(i => !i.exists).length,
  originAbilities: abilities.length, abilityIconsPresent: abilities.filter(i => i.exists).length,
  abilityArtGaps: abilities.filter(i => !i.exists).length,
  wiring: "Existing buildPochodzenie/buildOriginAbility use exact filenames at the next GM pack rebuild. No code repoint needed." };
fs.writeFileSync(path.join(here, output), JSON.stringify({ stats, origins, abilities }, null, 2) + "\n");
console.log(JSON.stringify(stats, null, 2));
