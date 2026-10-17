/** Read-only canonical item audit. Writes development reports; never builds packs or reads campaign data. */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { KATALOG } from "../../scripts/config/recipes-data.mjs";
import { CHEMIA } from "../../scripts/config/chemia-data.mjs";
import { WEAPONS } from "../../scripts/config/weapons-data.mjs";
import { AMMO_CALIBERS, GRENADE_TYPES } from "../../scripts/config/ammo-data.mjs";
import { ARMORS } from "../../scripts/config/armor-data.mjs";
import { TOOLKITS } from "../../scripts/config/toolkits-data.mjs";
import { REAL_GEAR, GEAR_PLACEHOLDERS } from "../../scripts/config/gear-data.mjs";
import { PROWIANT_CATALOG, buildProwiantItemData } from "../../scripts/config/prowiant-data.mjs";
import { ADDON_DEFS } from "../../scripts/config/addons-data.mjs";
import { buildAddonLootItemData } from "../../scripts/weapons/addons.mjs";
import { MAGAZINES, magIconPath } from "../../scripts/config/magazines-data.mjs";
import { PRODUCTION_GEAR, productionGearRef } from "../../scripts/items/production-gear.mjs";
import { LATARKA_FORMS, buildLatarkaItemData } from "../../scripts/items/latarka.mjs";
import { GOGLE_VARIANTS, buildGogleItemData } from "../../scripts/items/gogle.mjs";
import { buildBaterieItemData } from "../../scripts/items/baterie.mjs";
import { buildDetonatorItemData, buildElectricFuzeItemData } from "../../scripts/items/detonator.mjs";
import { buildKwasItemData } from "../../scripts/items/kwas.mjs";
import { buildKolczatkaItemData } from "../../scripts/items/kolczatka.mjs";
import { buildMedykRefillItemData } from "../../scripts/items/toolkit-medyk.mjs";
import { KONTROLER_REF, buildKontrolerItemData } from "../../scripts/items/kontroler.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const auditDate = process.argv.find(arg => arg.startsWith("--date="))?.slice(7) ?? new Date().toISOString().slice(0, 10);
if (!/^\d{4}-\d{2}-\d{2}$/.test(auditDate)) throw new Error("Expected --date=YYYY-MM-DD");
const output = process.argv.find(arg => arg.startsWith("--output="))?.slice(9) ?? `catalog-icons-${auditDate}.json`;
if (path.basename(output) !== output || !output.endsWith(".json")) throw new Error("Expected a JSON report filename under dev/icons");
const modulePrefix = "modules/neuroshima-2026-overrides/";
const custom = relative => modulePrefix + relative;
const source = fs.readFileSync(path.join(root, "scripts/production/wynik.mjs"), "utf8");
function stringMap(name) {
  const literal = source.match(new RegExp(`const ${name} = Object\\.freeze\\((\\{[\\s\\S]*?\\})\\);`))?.[1];
  if (!literal) throw new Error(`Missing source map ${name}`);
  return Object.fromEntries([...literal.matchAll(/(?:"([^"]+)"|([\w-]+))\s*:\s*"([^"]+)"/g)].map(match => [match[1] ?? match[2], match[3]]));
}
const rawIcons = stringMap("RAW_IKONY"), categoryIcons = stringMap("IKONA_KATEGORII");
const byId = items => new Map(items.map(item => [item.id, item]));
const weapon = byId(WEAPONS), ammo = byId(AMMO_CALIBERS), grenade = byId(GRENADE_TYPES);
const armour = byId(ARMORS), toolkit = byId(TOOLKITS), gear = byId([...REAL_GEAR, ...GEAR_PLACEHOLDERS]);
const magazine = byId(MAGAZINES);
const production = new Map(Object.entries(PRODUCTION_GEAR).map(([id, item]) => [productionGearRef(id), item]));
const special = {
  "item:baterie": () => buildBaterieItemData().img,
  "item:detonator": () => buildDetonatorItemData().img,
  "item:zapalnik-elektryczny": () => buildElectricFuzeItemData().img,
  "item:kwas": () => buildKwasItemData().img,
  "item:kolczatka": () => buildKolczatkaItemData().img,
  "item:medyk-refill": () => buildMedykRefillItemData().img
};
for (const key of Object.keys(LATARKA_FORMS)) special[`item:latarka-${key}`] = () => buildLatarkaItemData(key).img;
for (const key of Object.keys(GOGLE_VARIANTS)) special[`item:gogle-${key}`] = () => buildGogleItemData(key).img;
for (const [kind, ref] of Object.entries(KONTROLER_REF)) special[ref] = () => buildKontrolerItemData(kind).img;
function imageFor(item) {
  const [kind, id] = item.ref.split(":");
  if (kind === "chemia") return {img: CHEMIA[id]?.img, basis:"catalog img"};
  if (kind === "weapon") return {img: custom(`icons/weapons/${weapon.get(id)?.icon}`), basis:"weapon builder"};
  if (kind === "ammo") return {img: custom(`icons/ammo/${ammo.get(id)?.icon}`), basis:"ammo builder"};
  if (kind === "grenade") return {img: custom(`icons/weapons/${grenade.get(id)?.icon}`), basis:"grenade builder"};
  if (kind === "armor") return {img: custom(`icons/armor/${armour.get(id)?.id}.svg`), basis:"armour builder"};
  if (kind === "toolkit") return {img: toolkit.get(id)?.iconReady ? custom(`icons/tools/${id}.svg`) : "icons/svg/item-bag.svg", basis:"toolkit readiness flag"};
  if (kind === "magazine") return {img: magIconPath(magazine.get(id)?.cls), basis:"magazine family builder"};
  if (kind === "prowiant") return {img: buildProwiantItemData(id).img, basis:"provisions builder"};
  if (kind === "addon") return {img: buildAddonLootItemData(ADDON_DEFS[id]).img, basis:"attachment builder"};
  if (kind === "gear") return {img: gear.get(id)?.icon ? custom(`icons/items/loot/${gear.get(id).icon}`) : "icons/svg/hazard.svg", basis:"gear icon field"};
  if (production.has(item.ref)) return {img: custom(`icons/items/loot/${production.get(item.ref).icon}`), basis:"production prototype"};
  if (special[item.ref]) return {img:special[item.ref](), basis:"special item builder"};
  return {img: rawIcons[id] ? custom(`icons/items/loot/${rawIcons[id]}`) : categoryIcons[item.kategoria] ?? "icons/svg/item-bag.svg", basis:"raw catalog fallback"};
}
const audit = [];
for (const item of KATALOG.values()) {
  if (item.wynik !== "item") continue;
  let result;
  try { result = imageFor(item); } catch (error) { result = {img:null, basis:"unresolved", error:String(error.message)}; }
  const relative = result.img?.startsWith(modulePrefix) ? result.img.slice(modulePrefix.length) : null;
  const exists = relative ? fs.existsSync(path.join(root, relative)) : null;
  const hash = relative && exists ? crypto.createHash("sha256").update(fs.readFileSync(path.join(root, relative))).digest("hex") : null;
  const stem = item.ref.split(":").slice(1).join(":");
  const aliases = item.ref === "item:medyk-refill" ? ["icons/items/loot/uzupelnienie_medyka.svg"] : [];
  const candidates = [...aliases, ...[stem, stem.replaceAll("-", "_")].map(key => `icons/items/loot/${key}.svg`)].filter(file => fs.existsSync(path.join(root, file)));
  audit.push({ref:item.ref, label:item.nazwa, category:item.kategoria, placeholder:!!item.zaslepka,
    ...result, relative, exists, iconSha256:hash, existingAlternative:candidates,
    status:result.error ? "unresolved" : relative ? (exists ? "module art" : "missing referenced file") : "core/fallback art",
    artGap:!result.error && !relative && candidates.length === 0,
    wiringGap:!result.error && !relative && candidates.length > 0});
}
const stats = {date:auditDate, scope:"Canonical item results in KATALOG; no live campaign or pack inspection",
  items:audit.length, byStatus:Object.fromEntries([...new Set(audit.map(item=>item.status))].map(status=>[status,audit.filter(item=>item.status===status).length])),
  chemistryEntries:audit.filter(item=>item.ref.startsWith("chemia:")).length,
  medicineEntries:audit.filter(item=>item.ref.startsWith("chemia:")&&item.category==="leki").length,
  uniqueMedicineIcons:new Set(audit.filter(item=>item.ref.startsWith("chemia:")&&item.category==="leki").map(item=>item.relative)).size,
  medicineIconHashes:new Set(audit.filter(item=>item.ref.startsWith("chemia:")&&item.category==="leki").map(item=>item.iconSha256)).size,
  artGaps:audit.filter(item=>item.artGap).length, wiringGaps:audit.filter(item=>item.wiringGap).length,
  sharingNote:"Shared image paths across magazine families and unit sizes do not by themselves indicate missing art."};
fs.writeFileSync(path.join(here,output),JSON.stringify({stats,items:audit},null,2)+"\n");
console.log(JSON.stringify({stats, problems:audit.filter(item=>item.status!=="module art")},null,2));
