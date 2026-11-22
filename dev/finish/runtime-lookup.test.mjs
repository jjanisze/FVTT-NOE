import test from "node:test";
import assert from "node:assert/strict";
import { runtimeIndexes } from "./runtime-lookup.mjs";
import { finishedIcon, finishedItemUpdates } from "../../scripts/config/finished-icons.mjs";
import { inventoryIcon } from "../../scripts/ui/noe.mjs";

const prefix = "modules/neuroshima-2026-overrides/";
const icon = (source, family, consumer) => finishedIcon(prefix + source, { family, consumer });

test("resource rows render WEBP as an image and retain the SVG component for vectors", () => {
  const raster = inventoryIcon(prefix + "icons/finished/chemicals/neodrugs.webp", 'A "name"');
  assert.match(raster, /<img[^>]+\.webp/);
  assert.match(raster, /class="noe-glyph"/);
  assert.doesNotMatch(raster, /dnd5e-icon/);
  assert.match(raster, /&quot;name&quot;/);
  const vector = inventoryIcon("icons/test.svg", "Test", { fill: "var(--noe-text)" });
  assert.match(vector, /<dnd5e-icon/);
  assert.match(vector, /--icon-fill:var\(--noe-text\)/);
});

test("C4, repair and medyk distinguish the physical item from its activity", () => {
  assert.equal(icon("icons/weapons/c4_explosive.svg"), prefix + "icons/finished/explosives/c4_explosive.webp");
  assert.equal(icon("icons/weapons/c4_explosive.svg", undefined, "scripts/items/detonator.mjs"), prefix + "icons/finished/utility/c4_explosive.webp");
  assert.equal(icon("icons/abilities/naprawianie.svg", "creature"), prefix + "icons/finished/creature/naprawianie.webp");
  assert.equal(icon("icons/abilities/naprawianie.svg", "utility"), prefix + "icons/finished/utility/naprawianie.webp");
  assert.equal(icon("icons/tools/medyka.svg"), prefix + "icons/finished/tools/medyka.webp");
  assert.equal(icon("icons/tools/medyka.svg", "utility"), prefix + "icons/finished/utility/medyka.webp");
});

test("unavailable explicit families, finished paths and custom artwork stay intact", () => {
  for (const path of ["icons/svg/sword.svg", "worlds/custom.webp", prefix + "icons/finished/chemicals/neodrugs.webp", "modules/another/icons/items/drugs/neodrugs.svg"]) assert.equal(finishedIcon(path), path);
  assert.equal(icon("icons/items/drugs/neodrugs.svg", "creature"), prefix + "icons/items/drugs/neodrugs.svg");
  assert.equal(finishedIcon(undefined), undefined);
});

test("new drug items get chemical glyphs and neutral activities, without other updates", () => {
  const data = { img: prefix + "icons/items/drugs/neodrugs.svg", system: { quantity: 2, activities: { use: { img: prefix + "icons/items/drugs/neodrugs.svg" } } } };
  const before = JSON.stringify(data);
  assert.deepEqual(finishedItemUpdates(data), { img: prefix + "icons/finished/chemicals/neodrugs.webp", "system.activities.use.img": prefix + "icons/finished/utility/neodrugs.webp" });
  assert.equal(JSON.stringify(data), before);
});

test("item-source family is preserved for shared and creature features", () => {
  const data = { img: prefix + "icons/finished/creature/naprawianie.webp", system: { activities: { use: { img: prefix + "icons/abilities/naprawianie.svg" } } } };
  assert.deepEqual(finishedItemUpdates(data), { "system.activities.use.img": prefix + "icons/finished/creature/naprawianie.webp" });
});

test("ambiguous masters need an explicit family; script consumers remain scoped", () => {
  const row = (family, consumers) => ({ wrapper: "icons/test.svg", family, outputs: [{ path: `icons/finished/${family}/test.webp` }], consumers });
  const indexes = runtimeIndexes([
    row("one", [{ type: "pack", via: "item.img" }, { type: "script", file: "one.mjs" }]),
    row("two", [{ type: "pack", via: "item.img" }, { type: "script", file: "two.mjs" }])
  ]);
  assert.equal(indexes.defaults["icons/test.svg"], undefined);
  assert.equal(indexes.consumers["one.mjs"]["icons/test.svg"], "icons/finished/one/test.webp");
  assert.equal(indexes.families.two["icons/test.svg"], "icons/finished/two/test.webp");
});
