/** Broader source-only glyph audit. Never imports the pack builder or touches Foundry documents. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { CLASSES, PROFESSIONS } from "../../scripts/config/classes-data.mjs";
import { CLASS_FEATURES } from "../../scripts/config/class-features-data.mjs";
import { SZTUCZKI } from "../../scripts/config/sztuczki-data.mjs";
import { POCHODZENIA, ORIGIN_ABILITIES } from "../../scripts/config/pochodzenia-data.mjs";
import { GRUPY_FANTOW, FANTY, ikonaFantu } from "../../scripts/config/fanty-data.mjs";
import { BESTIARY } from "../../scripts/config/bestiary-data.mjs";
import { STATBLOKI } from "../../scripts/config/towarzysze-data.mjs";
import { WEAPONS } from "../../scripts/config/weapons-data.mjs";
import { NEUROSHIMA_STANY, NEUROSHIMA_ZAGROZENIA, NEUROSHIMA_MARKERS } from "../../scripts/config/conditions.mjs";
import { isGeneratedPlaceholder } from "./review/placeholders.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const prefix = "modules/neuroshima-2026-overrides/";
const core = path.join(process.env.ProgramFiles, "Foundry Virtual Tabletop/resources/app/public");
const data = path.resolve(root, "../..");
const build = fs.readFileSync(path.join(root, "dev/packs/build-packs.mjs"), "utf8");
const buildHash = crypto.createHash("sha256").update(build).digest("hex");
const normalize = text => String(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replaceAll("ł", "l").toLowerCase().replace(/[^a-z0-9]/g, "");
const hash = relative => crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relative))).digest("hex");
const exists = relative => fs.existsSync(path.join(root, relative));
const native = fs.globSync("**/*.svg", { cwd: path.join(root, "icons") }).map(file => "icons/" + file.replaceAll("\\", "/"));
const byStem = new Map();
for (const relative of native) {
  const key = normalize(path.basename(relative, ".svg"));
  byStem.set(key, [...(byStem.get(key) ?? []), relative]);
}
const weaponById = new Map(WEAPONS.map(item => [normalize(item.id), item]));
const weaponByName = new Map(WEAPONS.map(item => [normalize(item.name), item]));
const review = JSON.parse(fs.readFileSync(path.join(here, "review/manifest.json"), "utf8"));
function candidates(id, label) {
  const direct = [...(byStem.get(normalize(id)) ?? []), ...(byStem.get(normalize(label)) ?? [])];
  const weapon = weaponById.get(normalize(id)) ?? weaponByName.get(normalize(label));
  if (weapon) direct.push(`icons/weapons/${weapon.icon}`);
  for (const card of review.items) if ([card.name, path.basename(card.target ?? "", ".svg")].some(value => normalize(value) === normalize(label) || normalize(value) === normalize(id))) {
    direct.push(card.target);
  }
  return [...new Set(direct)].filter(relative => relative && exists(relative));
}
const expected = [];
const add = (kind, id, label, source, variant = "default") => expected.push({ kind, id, label, source, variant,
  exists: exists(source), generatedPlaceholder: exists(source) && isGeneratedPlaceholder(fs.readFileSync(path.join(root, source), "utf8")) });
for (const [id, def] of Object.entries(CLASSES)) add("class", id, def.label, `icons/klasy/${id}.svg`);
for (const [id, def] of Object.entries(PROFESSIONS)) add("profession", id, def.label, `icons/profesje/${id}.svg`);
for (const def of Object.values(CLASS_FEATURES)) {
  add("class feature", def.id, def.label, `icons/abilities/${def.id}.svg`);
  if (def.toggle) add("class feature", def.id, def.label, `icons/abilities/${def.id}_active.svg`, "active");
}
for (const [id, def] of Object.entries(POCHODZENIA)) add("origin", id, def.label, `icons/pochodzenia/${id}.svg`);
for (const [id, def] of Object.entries(ORIGIN_ABILITIES)) add("origin ability", id, def.label, `icons/abilities/${id}.svg`);
for (const id of Object.keys(GRUPY_FANTOW)) add("Fant group", id, id, `icons/fanty/${id}.svg`);
for (const weapon of WEAPONS) add("weapon", weapon.id, weapon.name, `icons/weapons/${weapon.icon}`);
const sztuczki = Object.entries(SZTUCZKI).map(([id, def]) => ({ id, label: def.label,
  configured: "icons/svg/upgrade.svg", existingArt: candidates(id, def.label) }));

function iconMap(name) {
  const block = build.match(new RegExp(`const ${name} = Object\\.freeze\\(\\{([\\s\\S]*?)\\n\\}\\);`))?.[1];
  if (!block) throw new Error(`Cannot read ${name}`);
  return new Map([...block.matchAll(/"([^"]+)":\s*`modules\/\$\{MODULE_ID\}\/([^`]+)`/g)].map(match => [match[1], match[2]]));
}
const exact = iconMap("BESTIARY_ITEM_ICONS"), shared = iconMap("BESTIARY_SHARED_ITEM_ICONS");
// Explicit semantic reuse, checked against local files; no runtime mappings are changed.
const aliases = {
  "ogon": "icons/weapons/atak_ogonem.svg", "kopyta": "icons/weapons/atak_kopytem.svg",
  "pila-tarczowa": "icons/weapons/pily.svg", "atak-bez-broni": "icons/weapons/atak_bez_broni.svg",
  "noz-taktyczny": "icons/weapons/combat_knife.svg", "oszczep": "icons/weapons/spear.svg",
  "oszczep-dystans": "icons/weapons/spear.svg", "oszczep-wrecz": "icons/weapons/spear.svg",
  "piesc": "icons/weapons/atak_bez_broni.svg", "rogi": "icons/weapons/atak_glowa.svg",
  "ugryzienie-jesli-cel-jest-pochwycony": "icons/weapons/ugryzienie.svg", "ugryzienie-pw-50": "icons/weapons/ugryzienie.svg",
  "uklucie": "icons/weapons/zadlo.svg", "utwardzony-crash": "icons/weapons/crash_halberd.svg",
  "widly-tylko-farmer": "icons/weapons/pitchfork.svg", "odnoze": "icons/weapons/odnoze_gigantyczny_pajak.svg",
  "ostre-odnoze": "icons/weapons/atak_odnogiem_spawacz.svg",
  "trzydziestka-osemka": "icons/weapons/revolver.svg", "bejsbol": "icons/weapons/baseball_bat.svg",
  "rura-stalowa": "icons/weapons/iron_pipe_club.svg", "paralizator": "icons/weapons/paralyzer.svg",
  "luk": "icons/weapons/bow.svg", "karabin-ppanc": "icons/weapons/heavy_sniper_rifle.svg",
  "karabin-ppanc-dluga-seria-3-walke": "icons/weapons/heavy_sniper_rifle.svg",
  "karabin-dluga-seria-4-walke": "icons/weapons/heavy_machine_gun.svg",
  "karabin-krotka-seria-6-walke": "icons/weapons/heavy_machine_gun.svg",
  "karabin-krotka-seria-10-walke": "icons/weapons/mag_assault_rifle.svg",
  "ukaszenie": "icons/weapons/ugryzienie.svg", "atak-konczyna": "icons/weapons/lapa_neoniedzwiedzia.svg"
};
const specificReuse = { "biodroid.karabin-dluga-seria-4-walke": "icons/weapons/karabin_laserowy.svg" };
const bestiary = [];
for (const [scope, creatures] of [["bestiary", BESTIARY], ["companion", STATBLOKI]]) for (const [creatureId, creature] of Object.entries(creatures)) {
  for (const entry of [...(creature.features ?? []), ...(creature.attacks ?? [])]) {
    const configured = exact.get(`${creatureId}.${entry.id}`) ?? shared.get(entry.id) ?? null;
    const base = entry.id.replace(/-(?:dluga|krotka)-seria.*$/, "");
    const existing = [...candidates(entry.id, entry.name), ...candidates(base, entry.name)];
    if (aliases[entry.id]) existing.push(aliases[entry.id]);
    if (specificReuse[`${creatureId}.${entry.id}`]) existing.unshift(specificReuse[`${creatureId}.${entry.id}`]);
    if (entry.dropsAs?.id) existing.push(...candidates(entry.dropsAs.id, entry.dropsAs.id));
    bestiary.push({ scope, creatureId, id: entry.id, label: entry.name, kind: entry.kind ? "attack" : "feature",
      configured: configured ? prefix + configured : "icons/svg/upgrade.svg",
      configuredExists: configured ? exists(configured) : true,
      existingArt: [...new Set(existing)].filter(exists), needsWiring: !configured,
      unresolvedArt: !configured && !existing.some(exists) });
  }
}
const coreStatuses = Object.entries({ ...NEUROSHIMA_STANY, ...NEUROSHIMA_ZAGROZENIA, ...NEUROSHIMA_MARKERS }).map(([id, def]) => ({ id, label: def.name, source: def.img,
  exists: def.img.startsWith(prefix) ? exists(def.img.slice(prefix.length)) : fs.existsSync(path.join(def.img.startsWith("systems/") ? data : core, def.img)) }));
const literalMissing = [];
for (const relative of fs.globSync("**/*.mjs", { cwd: path.join(root, "scripts") }).filter(file => !file.replaceAll("\\", "/").startsWith("tests/"))) {
  const file = "scripts/" + relative.replaceAll("\\", "/");
  const text = fs.readFileSync(path.join(root, file), "utf8");
  for (const match of text.matchAll(/["'`](icons\/[^\s"'`$<>]+\.(?:svg|webp|png))["'`]/g)) {
    if (exists(match[1]) || fs.existsSync(path.join(core, match[1]))) continue;
    literalMissing.push({ file, line: text.slice(0, match.index).split("\n").length, source: match[1] });
  }
  for (const match of text.matchAll(/["'`]modules\/(?:neuroshima-2026-overrides|\$\{[^}]+\})\/(icons\/[^\s"'`$<>]+\.(?:svg|webp|png))["'`]/g)) {
    if (exists(match[1])) continue;
    literalMissing.push({ file, line: text.slice(0, match.index).split("\n").length, source: prefix + match[1] });
  }
}
const groups = [...new Set(expected.map(item => item.kind))].map(kind => ({ kind, files: expected.filter(item => item.kind === kind).length,
  missing: expected.filter(item => item.kind === kind && !item.exists).length,
  placeholders: expected.filter(item => item.kind === kind && item.generatedPlaceholder).length }));
const summary = { date: new Date().toISOString().slice(0, 10), scope: "Working-tree source and filesystem audit; no pack, world or Foundry writes",
  groups, sztuczki: sztuczki.length, sztuczkiWithExistingArt: sztuczki.filter(item => item.existingArt.length).length,
  sztuczkiBuilderUsesCoreFallback: true,
  bestiaryEntries: bestiary.filter(item => item.scope === "bestiary").length,
  bestiaryFallbackEntries: bestiary.filter(item => item.scope === "bestiary" && item.needsWiring).length,
  companionEntries: bestiary.filter(item => item.scope === "companion").length,
  companionFallbackEntries: bestiary.filter(item => item.scope === "companion" && item.needsWiring).length,
  unresolvedBestiaryArtEntries: bestiary.filter(item => item.unresolvedArt).length,
  newCompanionArtSubjects: [...new Set(bestiary.filter(item => item.scope === "companion" && item.unresolvedArt).map(item => item.id))].length,
  brokenConfiguredBestiaryPaths: bestiary.filter(item => !item.configuredExists).length,
  checkedConditionAndMarkerImages: coreStatuses.length,
  missingCanonicalStatusImages: coreStatuses.filter(item => !item.exists).length,
  unresolvedLiteralReferences: literalMissing.length,
  generatedInitialsAcrossLibrary: native.filter(file => isGeneratedPlaceholder(fs.readFileSync(path.join(root, file), "utf8"))).length,
  fantEntries: FANTY.length,
  fantEntriesWithDedicatedGroupArt: FANTY.filter(f => exists(ikonaFantu(f, { istnieje: exists }).replace(prefix, ""))).length };
const report = { summary, expected, sztuczki, bestiary, coreStatuses, literalMissing,
  sourceHashes: Object.fromEntries(["dev/packs/build-packs.mjs", "scripts/config/classes-data.mjs", "scripts/config/class-features-data.mjs",
    "scripts/config/sztuczki-data.mjs", "scripts/config/bestiary-data.mjs", "scripts/config/towarzysze-data.mjs", "scripts/config/conditions.mjs"].map(file => [file, hash(file)])) };
if (report.sourceHashes["dev/packs/build-packs.mjs"] !== buildHash) throw new Error("Pack source changed during audit; rerun for a consistent snapshot");
fs.writeFileSync(path.join(here, "module-coverage-2026-10-17.json"), JSON.stringify(report, null, 2) + "\n");
console.log(JSON.stringify({ summary, missing: expected.filter(item => !item.exists), missingSztuczkaArt: sztuczki.filter(item => !item.existingArt.length),
  unresolvedBestiary: bestiary.filter(item => item.unresolvedArt), literalMissing }, null, 2));
