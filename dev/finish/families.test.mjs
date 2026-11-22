import test from "node:test";
import assert from "node:assert/strict";
import { familyOf, activityFamily, scriptSubjects, configExclusion, MODULE_ID } from "./families.mjs";
import { finisher } from "./lib/apply.mjs";

function family(pack, flags = {}, options = {}) {
  return familyOf({ pack, doc: { type: "loot", flags: { [MODULE_ID]: flags } }, professions: new Map(), classOf: () => [], ...options });
}
test("creatures and shared class features use neutral identity families", () => {
  assert.equal(family("bestiariusz", {}, { embedded: true }).family, "creature");
  assert.equal(family("towarzysze", {}, { embedded: true }).family, "creature");
  assert.equal(family("zdolnosci-klasowe", { owner: "brutal" }, { classOf: () => ["brutal", "twardziel"] }).family, "shared");
  assert.equal(family("zdolnosci-klasowe", { owner: "brutal" }, { classOf: () => ["brutal"] }).family, "brutal");
});
test("gear exceptions come from semantic flags and prototype IDs", () => {
  for (const flags of [{ staza: true }, { productionGearId: "defibrylator" }, { productionGearId: "srodki-dezynfekujace" }]) assert.equal(family("sprzet", flags).family, "medical");
  for (const flags of [{ kwas: true }, { productionGearId: "trucizna" }, { productionGearId: "srodek-usypiajacy" }]) assert.equal(family("sprzet", flags).family, "chemicals");
  for (const flags of [{ detonator: true }, { electricFuze: true }, { radioFuze: true }]) assert.equal(family("sprzet", flags).family, "explosives");
  assert.equal(family("sprzet", { bateria: true }).family, "devices");
  assert.equal(family("schematy").family, "documents");
});
test("one master can represent equipment, an operation and a separate identity", () => {
  const wrapper = "icons/weapons/c4_explosive.svg";
  assert.equal(activityFamily({ pack: "sprzet", wrapper, verdict: { family: "explosives" } }).family, "utility");
  assert.equal(activityFamily({ pack: "bestiariusz", wrapper, verdict: { family: "creature" } }).family, "creature");
  assert.equal(scriptSubjects({ wrapper, file: "scripts/items/detonator.mjs", known: [] })[0].family, "utility");
  assert.equal(scriptSubjects({ wrapper: "icons/abilities/naprawianie.svg", file: "scripts/actors/drony.mjs", known: [] })[0].family, "utility");
});
test("fallback trinket graphics use the table's role, not the ordinary device's role", () => {
  const result = scriptSubjects({ wrapper: "icons/items/loot/komputer_gamingowy.svg", file: "scripts/config/fanty-data.mjs", known: [] });
  assert.equal(result.length, 1); assert.equal(result[0].family, "salvage");
  assert.ok(configExclusion({ wrapper: "icons/obiekty/ramka.svg", file: "scripts/scenes/obiekty.mjs" }));
  assert.equal(configExclusion({ wrapper: "icons/obiekty/ramka.svg", file: "unrelated" }), undefined);
});

const entry = (id, pack, via, ids) => ({ id, kind: "icon", review: { status: "approved" }, outputs: [{ path: `icons/finished/${id}.webp` }], consumers: [{ type: "pack", pack, via, ids }] });
test("embedded actor items and their activities resolve by parent and consumer path", () => {
  const manifest = { entries: [
    entry("creature/a", "bestiariusz", "actor.items[].img", ["actorA.sharedItem"]),
    entry("creature/b", "bestiariusz", "actor.items[].img", ["actorB.sharedItem"]),
    entry("utility/op", "bestiariusz", "actor.items[].system.activities[].img", ["actorA.sharedItem.op"]),
    entry("weapon/top", "bestiariusz", "item.img", ["sharedItem"])
  ] };
  const f = finisher({ manifest, exists: () => true });
  const a = { _id: "sharedItem", img: "old", system: { activities: { op: { img: "old-op" } } } };
  f.apply("bestiariusz", a, { parentId: "actorA" });
  assert.ok(a.img.endsWith("creature/a.webp")); assert.ok(a.system.activities.op.img.endsWith("utility/op.webp"));
  const b = { _id: "sharedItem" }; f.apply("bestiariusz", b, { parentId: "actorB" }); assert.ok(b.img.endsWith("creature/b.webp"));
  const top = { _id: "sharedItem" }; f.apply("bestiariusz", top); assert.ok(top.img.endsWith("weapon/top.webp"));
});
test("planned/missing exports retain their originals and ambiguous consumers fail", () => {
  const one = entry("tools/a", "narzedzia", "item.img", ["one"]);
  one.review.status = "planned";
  const item = { _id: "one", img: "original" };
  finisher({ manifest: { entries: [one] }, exists: () => true }).apply("narzedzia", item); assert.equal(item.img, "original");
  one.review.status = "approved";
  finisher({ manifest: { entries: [one] }, exists: () => false }).apply("narzedzia", item); assert.equal(item.img, "original");
  const two = entry("tools/b", "narzedzia", "item.img", ["one"]);
  assert.throws(() => finisher({ manifest: { entries: [one, two] }, exists: () => true }), /Ambiguous/);
});
