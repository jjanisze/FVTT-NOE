/** Run as a function with Chrome evaluate_script sourcePath. No stored documents are created. */
async function checkProficiencyIcons({ render = true } = {}) {
  const { applyProficiencyIcons } = await import("/modules/neuroshima-2026-overrides/scripts/config/proficiency-icons.mjs");
  const assert = (condition, message) => { if (!condition) throw new Error(message); };
  assert(game.world.id.startsWith("agent-"), "Use an agent sandbox for the icon UI check");
  const cfg = CONFIG.DND5E, Trait = dnd5e.documents.Trait;
  const sources = { armor: "armorProficiencies", weapon: "weaponProficiencies", tool: "toolProficiencies" };
  const mapsBefore = JSON.stringify(Object.values(sources).map(key => cfg[key]));
  const options = {};
  for (const [trait, source] of Object.entries(sources)) {
    const displayKey = cfg.traits[trait].configKey;
    let before;
    try {
      cfg.traits[trait].configKey = source;
      before = (await Trait.choices(trait, { prefixed: true, any: true })).asOptions();
    } finally {
      cfg.traits[trait].configKey = displayKey;
    }
    const after = (await Trait.choices(trait, { prefixed: true, any: true })).asOptions();
    assert(JSON.stringify(before) === JSON.stringify(after), `Native choices changed: ${trait}`);
    options[trait] = after.length;
  }
  const metadata = cfg.advancementTypes.Trait.documentClass.metadata;
  applyProficiencyIcons();
  applyProficiencyIcons();
  assert(JSON.stringify(Object.values(sources).map(key => cfg[key])) === mapsBefore, "Original label maps changed");
  assert(cfg.advancementTypes.Trait.documentClass.metadata.icon === metadata.icon, "Repeated registration changed metadata");
  assert(cfg.advancementTypes.Trait.documentClass.metadata.apps.flow === metadata.apps.flow, "Native flow class changed");

  const groups = {
    armor: Object.keys(cfg.armorProficiencies), weapon: Object.keys(cfg.weaponProficiencies),
    tool: Object.keys(cfg.tools), skills: Object.keys(cfg.skills), saves: Object.keys(cfg.abilities)
  };
  const rows = Object.entries(groups).flatMap(([group, keys]) => keys.map(key => ({
    group, key, label: Trait.keyLabel(`${group}:${key}`), icon: Trait.keyIcon(`${group}:${key}`)
  })));
  for (const row of rows) {
    assert(row.label && row.label !== `${row.group}:${row.key}`, `Missing label: ${row.key}`);
    assert(row.icon?.endsWith(".svg"), `Colored fallback: ${row.group}:${row.key}`);
  }
  assert(rows.length === 57, "Expected 51 proficiency/skill rows and six ability saves");
  const categories = Object.fromEntries(Object.keys(groups).map(key => [key, cfg.traits[key].icon]));
  const images = [...new Set([...rows.map(row => row.icon), ...Object.values(categories), metadata.icon])];
  for (const url of images) {
    const response = await fetch(url);
    assert(response.ok, `Asset fetch failed: ${url}`);
    assert((await response.text()).includes("<svg"), `Expected SVG: ${url}`);
  }

  // Real dnd5e DataModels and TraitFlow slots, using only a transient actor and embedded class.
  const keys = rows.map(row => `${row.group}:${row.key}`);
  const id = foundry.utils.randomID();
  const singleId = foundry.utils.randomID();
  const fixture = (advId, grants) => ({ _id: advId, type: "Trait", level: 1,
    hint: "Native proficiency glyph preview — transient sandbox document.",
    configuration: { grants, choices: [] }, value: { chosen: grants } });
  const actor = new Actor.implementation({ name: "Proficiency icon preview", type: "character", items: [{
    _id: foundry.utils.randomID(), name: "Proficiency icon preview", type: "class",
    system: { identifier: "proficiency-icon-preview", advancement: {
      [id]: fixture(id, keys), [singleId]: fixture(singleId, ["armor:lgt"])
    } }
  }] });
  const item = actor.items.contents[0], advancement = item.system.advancement.get(id);
  assert(advancement.img === metadata.icon, "Mixed Trait image did not resolve");
  assert(item.system.advancement.get(singleId).img === categories.armor, "Single-category image did not resolve");
  const flow = new metadata.apps.flow({ document: advancement, level: 1,
    window: { frame: true, positioned: true, title: "Proficiency icons — native TraitFlow" },
    position: { width: 540, height: 700, left: 100, top: 60 }
  });
  const context = await flow._prepareContentContext({}, {});
  assert(context.slots.length === rows.length, "TraitFlow dropped rows");
  for (const [index, slot] of context.slots.entries()) {
    assert(slot.icon === rows[index].icon && slot.label === rows[index].label, `TraitFlow mismatch: ${slot.key}`);
  }
  if (render) await flow.render({ force: true });
  globalThis.__proficiencyCheck = { flow, actor };
  return { date: "2026-10-18", system: game.system.version, rows, categories,
    mixedTraitAdvancement: { icon: metadata.icon }, nativeChoiceCounts: options,
    checks: { nativeChoicesUnchanged: true, stringLabelMapsUnchanged: true, repeatedRegistrationStable: true,
      allAssetsFetch: true, nativeTraitFlowSlots: context.slots.length, mixedAndSingleHeaders: true,
      storedDocumentsCreated: 0 } };
}
