/**
 * Suite — broń improwizowana (PLAN_m6_drobne_zasady.md §5.2, §5.2.1, E3). Players in their own clients:
 *
 *  - PC Gracz 1 takes a crowbar (loot, 3 kg) in hand and attacks with it the way the item menu does
 *    (`atakImprowizowany`): the attack dialog, a hidden twin weapon (not on the sheet), the card's damage button;
 *  - throws it: the crowbar lands on the ground at the target, the twin stays and the card still rolls damage;
 *  - a medpak from the belt goes to the same hand and the same twin is re-pointed to it;
 *  - PC Gracz 2 (Gladiator: proficiency in improvised weapons + Łyżeczka) gets PB and the weight table (8 kg → 2k6);
 *    the two rule sets are exclusive (the author, 2026-10-27): toggled to an ordinary improvised weapon the rim is
 *    1k4 again, and the GM's „działa jak…” offers melee patterns up to 1k6 only.
 */

const MODULE_ID = "neuroshima-2026-overrides";

/* Functions below run in the browser (serialised): no closures over this file. */

/** GM: a crowbar and a medpak for PC Gracz 1; Gladiator kit for PC Gracz 2. */
async function przygotuj() {
  const MOD = "neuroshima-2026-overrides";
  const g1 = game.actors.getName("PC Gracz 1");
  const g2 = game.actors.getName("PC Gracz 2");
  const leki = await game.packs.get(`${MOD}.lekarstwa`).getDocuments();
  const medpak = leki.find(i => i.name === "Medpak");
  await g1.createEmbeddedDocuments("Item", [
    { name: "Łom", type: "loot", img: "icons/tools/hand/pickaxe-steel-grey.webp", system: { weight: { value: 3, units: "kg" }, quantity: 1 } },
    game.items.fromCompendium(medpak)
  ]);
  const zdolnosci = await game.packs.get(`${MOD}.zdolnosci-klasowe`).getDocuments();
  const lyzeczka = zdolnosci.find(i => i.getFlag(MOD, "abilityId") === "lyzeczka");
  await g2.createEmbeddedDocuments("Item", [
    game.items.fromCompendium(lyzeczka),
    { name: "Felga", type: "loot", system: { weight: { value: 8, units: "kg" }, quantity: 1 } }
  ]);
  const prof = new Set(g2.system.traits.weaponProf.value);
  prof.add("improwizowana");
  await g2.update({ "system.abilities.str.value": 16, "system.traits.weaponProf.value": [...prof] });
  return { medpak: !!medpak };
}

/** Player: the item by name into a hand, through the doll's funnel (what „Weź do ręki” does). */
async function doReki({ name }) {
  const actor = game.user.character;
  const item = actor.items.getName(name);
  const lalka = game.neuroshima.lalka;
  if (!lalka.handOf(item)) await lalka.place(actor, item, "hand");
  await __e2e.until(() => lalka.handOf(item), { message: `${name} in hand` });
  return lalka.handOf(item);
}

/** Player: an improvised attack at `targetName` from the item menu path, then the card's damage button. */
async function uderz({ name, targetName }) {
  const MOD = "neuroshima-2026-overrides";
  const actor = game.user.character;
  const item = actor.items.getName(name);
  const target = canvas.tokens.placeables.find(t => t.name === targetName);
  canvas.tokens.placeables.find(t => t.actor?.id === actor.id)?.control({ releaseOthers: true });
  canvas.tokens.setTargets([target.id]);
  const since = game.messages.size;
  __e2e.forceD20([15], { fallback: 3 });
  try {
    const run = game.neuroshima.improwizacja.atakImprowizowany(actor, item);
    const pressed = await __e2e.pressRollDialog("normal");
    await run;
    await __e2e.quiet();
    const attack = game.messages.contents.slice(since).findLast(m => m.type === "attack");
    const usage = game.messages.contents.slice(since).findLast(m => m.type === "usage");
    const twin = actor.items.find(i => i.flags?.[MOD]?.improwizacja?.zrodlo === item.id);
    // dnd5e 6: the Damage button sits on the usage card (the attack roll card has Fuks and the verdict).
    const clicked = usage ? await __e2e.clickChat(usage.id, 'button[data-action="rollDamage"]') : false;
    const dmgDialog = clicked ? await __e2e.pressRollDialog("normal") : false;
    await __e2e.until(() => game.messages.contents.slice(since).some(m => m.type === "damage"), { timeoutMs: 6000 }).catch(() => {});
    await __e2e.quiet();
    const damage = game.messages.contents.slice(since).findLast(m => m.type === "damage");
    await actor.sheet.render(true);
    await __e2e.until(() => actor.sheet.rendered && actor.sheet.element);
    const onSheet = !!actor.sheet.element.querySelector(`[data-item-id="${twin?.id}"]`);
    await actor.sheet.close();
    return {
      pressed, attack: !!attack, twin: twin ? { id: twin.id, name: twin.name, type: twin.system.type.value,
        dice: `${twin.system.damage.base.number}d${twin.system.damage.base.denomination}`,
        formula: twin.system.damage.base.custom?.formula ?? "", props: [...twin.system.properties].sort(),
        prof: twin.system.proficiencyMultiplier, hand: twin.flags[MOD].improwizacja.reka } : null,
      damage: !!damage, damageTypes: damage?.rolls?.[0]?.options?.types ?? null, onSheet,
      clicked, dmgDialog
    };
  } finally {
    __e2e.restoreDice();
    canvas.tokens.setTargets([]);
  }
}

/** Player: throw the item at `targetName` with its twin (thrown mode), then roll damage from the attack card. */
async function rzuc({ name, targetName }) {
  const MOD = "neuroshima-2026-overrides";
  const actor = game.user.character;
  const item = actor.items.getName(name);
  const lalka = game.neuroshima.lalka;
  const twin = await game.neuroshima.improwizacja.blizniak(actor, item, lalka.handOf(item));
  const attack = twin.system.activities.get("neuroImprowAtak1");
  const target = canvas.tokens.placeables.find(t => t.name === targetName);
  canvas.tokens.placeables.find(t => t.actor?.id === actor.id)?.control({ releaseOthers: true });
  canvas.tokens.setTargets([target.id]);
  __e2e.forceD20([15], { fallback: 3 });
  try {
    const usage = await attack.use({ subsequentActions: false }, { configure: false }, {});
    const link = { data: { system: { origin: usage.message.id } } };
    await attack.rollAttack({ attackMode: "thrown" }, { configure: false }, link);
    await __e2e.until(() => !actor.items.get(item.id), { timeoutMs: 8000, message: `${name} off the character` }).catch(() => {});
    const msg = game.messages.contents.findLast(m => m._source.system?.origin === usage.message.id && m.type === "attack");
    const before = game.messages.size;
    await msg?.getAssociatedActivity()?.rollDamage({}, { configure: false }, link);
    await __e2e.quiet();
    return {
      gone: !actor.items.get(item.id), twinStays: !!actor.items.get(twin.id), twinId: twin.id,
      mode: msg?.rolls?.[0]?.options?.attackMode ?? null, damageCards: game.messages.size - before
    };
  } finally {
    __e2e.restoreDice();
    canvas.tokens.setTargets([]);
  }
}

/** Player: the twin for the item now in this hand (re-pointed in place). */
async function przepnij({ name }) {
  const MOD = "neuroshima-2026-overrides";
  const actor = game.user.character;
  const item = actor.items.getName(name);
  const twin = await game.neuroshima.improwizacja.blizniak(actor, item, game.neuroshima.lalka.handOf(item));
  return { id: twin.id, name: twin.name, source: twin.flags[MOD].improwizacja.zrodlo === item.id,
    twins: actor.items.filter(i => i.flags?.[MOD]?.improwizacja).length };
}

/** Player (Łyżeczka holder): this item as an ordinary improvised weapon — the item menu's toggle. */
async function zwykla({ name }) {
  const item = game.user.character.items.getName(name);
  return game.neuroshima.improwizacja.przelaczLyzeczke(item);
}

/** GM: „Działa jak…” on a player's item through the dialog; reports the offered patterns. */
async function dzialaJak({ actorName, name, jak }) {
  const item = game.actors.getName(actorName).items.getName(name);
  const title = `Działa jak…: ${name}`;
  const run = game.neuroshima.improwizacja.dzialaJak(item);
  const app = await __e2e.until(() => __e2e.findApps({ title, action: "ok" })[0], { message: "the „działa jak…” dialog" });
  const select = app.element.querySelector('select[name="w"]');
  const offered = [...select.options].map(o => o.value).filter(Boolean);
  select.value = jak;
  await __e2e.clickDialog({ title }, "ok");
  return { set: await run, offered };
}

export default {
  name: "improwizacja",
  clients: ["gm", "Gracz 1", "Gracz 2"],

  async run(t) {
    const p1 = t.client("Gracz 1");
    const p2 = t.client("Gracz 2");
    await t.waitFor(p1, () => Boolean(game.user.character && ui.chat?.element), { message: "Gracz 1 to see the fixture" });

    await t.step("GM: a crowbar and a medpak for PC Gracz 1, the Gladiator kit for PC Gracz 2", async () => {
      const r = await t.gm.eval(przygotuj);
      t.equal(r.medpak, true, "Medpak in the lekarstwa pack");
      await t.waitFor(p1, () => game.user.character.items.getName("Łom") ? true : null, { message: "the crowbar on Gracz 1" });
    });

    let twinId = null;
    await t.step("Gracz 1: crowbar in hand, improvised attack — dialog, hidden twin 1k4 (two-handed from 2 kg), card damage", async () => {
      const hand = await p1.eval(doReki, { name: "Łom" });
      t.assert(String(hand).startsWith("hand."), "the crowbar did not reach a hand", hand);
      const r = await p1.eval(uderz, { name: "Łom", targetName: "CYWIL" });
      t.equal(r.pressed, true, "attack dialog");
      t.equal(r.attack, true, "attack card");
      t.equal(r.twin?.type, "improwizowana", "twin weapon type");
      t.equal(r.twin?.dice, "1d4", "RAW damage");
      t.assert(r.twin.props.includes("two") && r.twin.props.includes("thr"), "3 kg → two-handed and throwable (U3)", r.twin);
      t.equal(r.twin.prof, 0, "no PB without improvised-weapon proficiency (s. 253)");
      t.equal(r.onSheet, false, "the twin is not on the sheet");
      t.equal(r.damage, true, "damage card from the usage card's button");
      twinId = r.twin.id;
      await t.quiet();
    });

    await t.step("Gracz 1: throws the crowbar — it lands on the ground, the twin stays, the card rolls damage", async () => {
      const r = await p1.eval(rzuc, { name: "Łom", targetName: "CYWIL" });
      t.equal(r.mode, "thrown", "thrown attack mode");
      t.equal(r.gone, true, "the crowbar left the character (ground)");
      t.equal(r.twinStays, true, "the twin is kept for the card");
      t.assert(r.damageCards >= 1, "no damage card after the throw", r);
      await t.quiet();
    });

    await t.step("Gracz 1: a medpak from the belt to the hand — the same twin, re-pointed", async () => {
      await p1.eval(doReki, { name: "Medpak" });
      const r = await p1.eval(przepnij, { name: "Medpak" });
      t.equal(r.source, true, "twin points at the medpak");
      t.equal(r.twins, 1, "one twin for one hand");
      t.equal(r.id, twinId, "re-pointed in place, not a new item");
      t.assert(/^Medpak/.test(r.name), "twin name", r);
    });

    await t.step("Gracz 2 (Gladiator, Łyżeczka): PB and the weight table — 8 kg → 2k6, no house buffs", async () => {
      await t.waitFor(p2, () => game.user.character.items.getName("Felga") ? true : null, { message: "the rim on Gracz 2" });
      await p2.eval(doReki, { name: "Felga" });
      const r = await p2.eval(uderz, { name: "Felga", targetName: "CYWIL" });
      t.equal(r.twin?.dice, "2d6", "Łyżeczka weight table");
      t.equal(r.twin.formula, "", "plain dice — no reroll, no custom formula");
      t.equal(r.twin.prof, 1, "proficient (Łyżeczka)");
      t.assert(/\(łyżeczka\)$/.test(r.twin.name), "twin named for the technique", r.twin);
      await t.quiet();
    });

    await t.step("Gracz 2: the same rim as an ordinary improvised weapon — 1k4, two-handed; the Gladiator's PB stays", async () => {
      t.equal(await p2.eval(zwykla, { name: "Felga" }), true, "toggled to ordinary");
      const r = await p2.eval(uderz, { name: "Felga", targetName: "CYWIL" });
      t.equal(r.twin?.dice, "1d4", "RAW improvised damage — not the Łyżeczka table");
      t.assert(r.twin.props.includes("two"), "8 kg → two-handed (U3)", r.twin);
      t.equal(r.twin.prof, 1, "proficient through the improvised-weapon proficiency (Gladiator)");
      t.assert(/\(improwizowana\)$/.test(r.twin.name), "twin name", r.twin);
      await t.quiet();
    });

    await t.step("GM: „działa jak…” offers melee patterns up to 1k6 only; the rim as a baseball bat", async () => {
      const g = await t.gm.eval(dzialaJak, { actorName: "PC Gracz 2", name: "Felga", jak: "bejsbol-rurka" });
      t.equal(g.set, "bejsbol-rurka", "pattern set");
      t.assert(g.offered.includes("palka-policyjna") && g.offered.includes("lancuch"), "low-tier patterns offered", g);
      for (const nie of ["kafar", "crash", "pilomiecz", "katana", "maczeta"]) t.assert(!g.offered.includes(nie), `${nie} not offered`, g);
      const r = await p2.eval(uderz, { name: "Felga", targetName: "CYWIL" });
      t.equal(r.twin?.type, "biala", "the pattern's category");
      t.equal(r.twin.dice, "1d6", "the pattern's die");
      t.assert(/\(jak /.test(r.twin.name), "twin name", r.twin);
      await t.quiet();
    });
  }
};
