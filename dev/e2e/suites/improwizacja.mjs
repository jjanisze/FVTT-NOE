/**
 * Suite — broń improwizowana (PLAN_m6_drobne_zasady.md §5.2, §5.2.1, E3). Players in their own clients:
 *
 *  - PC Gracz 1 takes a crowbar (loot, 3 kg) in hand and attacks with it the way the item menu does
 *    (`atakImprowizowany`): the attack dialog, a hidden twin weapon (not on the sheet), the card's damage button;
 *  - throws it: the crowbar lands on the ground at the target, the twin stays and the card still rolls damage;
 *  - a medpak from the belt goes to the same hand and the same twin is re-pointed to it;
 *  - PC Gracz 2 (Gladiator: proficiency in improvised weapons + Łyżeczka) gets PB and the weight table (8 kg → 2k6);
 *    with Kobalt on — reroll of 1s and the property chosen for the item; „Zawsze coś pod ręką” puts an item from the
 *    surroundings in a free hand and the GM vetoes it from the whispered card.
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
  return { kobalt: game.settings.get(MOD, "kobaltEnabled"), medpak: !!medpak };
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
      debug: { usage: !!usage, clicked, dmgDialog, types: game.messages.contents.slice(since).map(m => m.type) }
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

/** Player (Kobalt): grab something from the surroundings through the dialog. */
async function zlap() {
  const actor = game.user.character;
  const known = new Set(actor.items.map(i => i.id));
  const run = game.neuroshima.improwizacja.zlapZOtoczenia(actor);
  const app = await __e2e.until(() => __e2e.findApps({ title: "Zawsze coś pod ręką", action: "ok" })[0], { message: "the grab dialog" });
  app.element.querySelector('input[name="n"]').value = "Kij od szczotki";
  app.element.querySelector('input[name="w"]').value = "1.5";
  await __e2e.clickDialog({ title: "Zawsze coś pod ręką" }, "ok");
  await run;
  const fresh = actor.items.find(i => !known.has(i.id));
  return { name: fresh?.name ?? null, hand: fresh ? game.neuroshima.lalka.handOf(fresh) : null, uuid: fresh?.uuid ?? null };
}

/** GM: veto the grab from the whispered card. */
async function weto({ uuid }) {
  const msg = game.messages.contents.findLast(m => m.content.includes(`data-item="${uuid}"`) && m.content.includes("wetoPodReka"));
  const clicked = msg ? await __e2e.clickChat(msg.id, 'button[data-neuro-improw="wetoPodReka"]') : false;
  await __e2e.until(() => !fromUuidSync(uuid), { timeoutMs: 6000, message: "the vetoed item gone" }).catch(() => {});
  return { clicked, gone: !fromUuidSync(uuid) };
}

export default {
  name: "improwizacja",
  clients: ["gm", "Gracz 1", "Gracz 2"],

  async run(t) {
    const p1 = t.client("Gracz 1");
    const p2 = t.client("Gracz 2");
    await t.waitFor(p1, () => Boolean(game.user.character && ui.chat?.element), { message: "Gracz 1 to see the fixture" });
    let kobalt = false;

    await t.step("GM: a crowbar and a medpak for PC Gracz 1, the Gladiator kit for PC Gracz 2", async () => {
      const r = await t.gm.eval(przygotuj);
      t.equal(r.medpak, true, "Medpak in the lekarstwa pack");
      kobalt = r.kobalt;
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
      t.log(JSON.stringify(r.debug));
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

    await t.step("Gracz 2 (Gladiator, Łyżeczka): PB and the weight table — 8 kg → 2k6; Kobalt: r1 and the item's property", async () => {
      await t.waitFor(p2, () => game.user.character.items.getName("Felga") ? true : null, { message: "the rim on Gracz 2" });
      await p2.eval(doReki, { name: "Felga" });
      // The Kobalt property is chosen in a dialog at the first attack — answered up front, as the player would.
      await p2.eval(async () => {
        const felga = game.user.character.items.getName("Felga");
        await felga.setFlag("neuroshima-2026-overrides", "improwizacjaZrodlo", { wlasciwosc: "obalajaca" });
      });
      const r = await p2.eval(uderz, { name: "Felga", targetName: "CYWIL" });
      t.equal(r.twin?.dice, "2d6", "Łyżeczka weight table");
      t.equal(r.twin.prof, 1, "proficient (Łyżeczka / Gladiator)");
      if (kobalt) {
        t.equal(r.twin.formula, "2d6r1", "Kobalt: reroll 1s once");
        t.assert(r.twin.props.includes("obalajaca"), "Kobalt: the chosen property on the twin", r.twin);
      }
      await t.quiet();
    });

    if (kobalt) {
      await t.step("Gracz 2 (Kobalt): „Zawsze coś pod ręką” — an item from the surroundings in the free hand; the GM vetoes it", async () => {
        const g = await p2.eval(zlap);
        t.equal(g.name, "Kij od szczotki", "grabbed item");
        t.assert(String(g.hand).startsWith("hand."), "in a free hand", g);
        const v = await t.gm.eval(weto, { uuid: g.uuid });
        t.equal(v.clicked, true, "veto button on the GM's whispered card");
        t.equal(v.gone, true, "vetoed item removed");
      });
    }
  }
};
