/**
 * Suite 3 — Combat (PLAN_agentic_improvements.md §5 D). Every check here is a bug that reached
 * the GM before a test did:
 *
 *  - Crit → Stopień Zranienia: never fired from 0.1 until 2026-10-03 (the handler listened to a
 *    dnd5e hook signature that never existed). Driven exactly as at the table: the PLAYER shoots
 *    (forced natural 20), rolls the linked crit damage, the GM applies it the way dnd5e's damage
 *    tray does. Target HP is raised first so the wound can only come from the crit, not from PW 0.
 *    A normal hit applied the same way is the negative control.
 *  - Grenade at end of turn: on 2026-09-23 a thrown grenade detonated immediately. A PLAYER throws
 *    through the real sheet button and a real canvas click; the charge must lie pending until the
 *    GM ends the turn, then detonate.
 *  - Ammunition: one semi-auto shot spends exactly one round.
 */

const MODULE_ID = "neuroshima-2026-overrides";

/* Functions below run in the browser (serialised): no closures over this file. */

/** Player: one attack with the B 92 at `targetName`, dice forced by `uniform`, plus linked damage. */
async function shoot({ targetName, uniform }) {
  const MOD = "neuroshima-2026-overrides";
  const actor = game.user.character;
  const gun = actor.items.find(i => i.type === "weapon");
  const attack = gun.system.activities.find(a => a.type === "attack");
  const target = canvas.tokens.placeables.find(t => t.name === targetName);
  canvas.tokens.placeables.find(t => t.actor?.id === actor.id)?.control({ releaseOthers: true });
  canvas.tokens.setTargets([target.id]);
  const roundsBefore = game.neuroshima.magazynki.getMag(gun).current;
  const orig = CONFIG.Dice.randomUniform;
  CONFIG.Dice.randomUniform = () => uniform;
  try {
    // A weapon handed out a moment ago may still be settling (slots, activities): retry briefly.
    let usage = null;
    for (let i = 0; i < 20 && !usage; i++) {
      usage = await attack.use({}, { configure: false }, {});
      if (!usage) await new Promise(r => setTimeout(r, 250));
    }
    if (!usage) throw new Error("attack.use() was cancelled every time");
    const link = { data: { flags: { dnd5e: { originatingMessage: usage.message.id } } } };
    const attackRolls = await attack.rollAttack({}, { configure: false }, link);
    // As dnd5e's damage button does: crit from the last attack roll, same originating card.
    const isCritical = attackRolls?.[0]?.isCritical ?? false;
    await attack.rollDamage({ isCritical }, { configure: false }, link);
    const attackMsg = game.messages.contents.findLast(m => m.getFlag("dnd5e", "originatingMessage") === usage.message.id && m.flags[MOD]?.obrona);
    const damageMsg = game.messages.contents.findLast(m => m.getFlag("dnd5e", "originatingMessage") === usage.message.id && m.getFlag("dnd5e", "roll.type") === "damage");
    return {
      natural: attackMsg?.flags[MOD].obrona.natural ?? null,
      verdict: attackMsg?.flags[MOD].obrona.targets?.[0]?.verdict ?? null,
      damageMessage: damageMsg?.id ?? null, damageCrit: Boolean(damageMsg?.rolls?.[0]?.isCritical),
      targetUuid: target.actor.uuid,
      roundsSpent: roundsBefore - game.neuroshima.magazynki.getMag(gun).current
    };
  } finally {
    CONFIG.Dice.randomUniform = orig;
  }
}

/** GM: apply a damage card to a target exactly like dnd5e's tray (chat-message.mjs / damage-application.mjs). */
async function applyLikeTray({ messageId, targetUuid }) {
  const z = await import("/modules/neuroshima-2026-overrides/scripts/combat/zranienie.mjs");
  const message = game.messages.get(messageId);
  const target = fromUuidSync(targetUuid);
  const before = { hp: target.system.attributes.hp.value, wound: z.getZranienieLvl(target) };
  const damages = dnd5e.dice.aggregateDamageRolls(message.rolls, { respectProperties: true }).map(r => ({
    value: Math.max(0, r.total), type: r.options.type, properties: new Set(r.options.properties ?? [])
  }));
  await target.applyDamage(damages, { isDelta: true, origin: message });
  await new Promise(r => setTimeout(r, 400));
  return { before, after: { hp: target.system.attributes.hp.value, wound: z.getZranienieLvl(target) } };
}

export default {
  name: "combat",
  clients: ["gm", "Gracz 1"],

  async run(t) {
    const p1 = t.client("Gracz 1");
    await t.waitFor(p1, () => Boolean(game.user.character && canvas.tokens?.placeables.some(tk => tk.isOwner)),
      { message: "the player's client to see the fixture" });

    await t.step("GM: combat with every token, Gracz 1 on turn; NPCs at 60 HP", async () => {
      const r = await t.gm.eval(async () => {
        for (const c of game.combats.contents) await c.delete();
        const scene = canvas.scene;
        for (const tok of scene.tokens.filter(tk => !tk.actor?.hasPlayerOwner)) {
          await tok.actor.update({ "system.attributes.hp.max": 60, "system.attributes.hp.value": 60 });
        }
        const combat = await Combat.implementation.create({ scene: scene.id, active: true });
        await combat.createEmbeddedDocuments("Combatant", scene.tokens.map((tk, i) => ({ tokenId: tk.id, sceneId: scene.id, actorId: tk.actorId, initiative: 20 - i })));
        await combat.startCombat();
        await combat.update({ turn: combat.turns.findIndex(c => c.name === "PC Gracz 1") });
        return { current: combat.combatant?.name, round: combat.round };
      });
      t.equal(r.current, "PC Gracz 1", "combatant on turn");
    });

    const crit = await t.step("player: semi-auto shot, natural 20 → crit verdict, one round spent", async () => {
      await t.waitFor(p1, () => game.combat?.combatant?.name === "PC Gracz 1", { message: "the player to see their turn" });
      const s = await p1.eval(shoot, { targetName: "GANGUS ŻOŁNIERZ", uniform: 0.00001 });
      t.equal(s.natural, 20, "natural roll");
      t.equal(s.verdict, "krytyk", "verdict on the attack card");
      t.assert(s.damageMessage && s.damageCrit, "no critical damage card linked to the attack", s);
      t.equal(s.roundsSpent, 1, "rounds spent by one semi-auto shot");
      return s;
    });

    await t.step("GM applies the crit like the damage tray → Stopień Zranienia 1, target still standing", async () => {
      const r = await t.gm.eval(applyLikeTray, { messageId: crit.damageMessage, targetUuid: crit.targetUuid });
      t.assert(r.after.hp > 0, "target dropped to 0 — the wound would not prove the crit path", r);
      t.assert(r.after.hp < r.before.hp, "no damage applied", r);
      t.equal(r.after.wound, r.before.wound + 1, "Stopień Zranienia after a critical hit");
    });

    await t.step("negative control: a normal hit applied the same way does not wound", async () => {
      const s = await p1.eval(shoot, { targetName: "CYWIL", uniform: 0.4 });
      t.assert(s.verdict !== "krytyk" && !s.damageCrit, "control shot was a crit", s);
      if (!s.damageMessage) { t.log("control shot produced no damage card", JSON.stringify(s)); return; }
      const r = await t.gm.eval(applyLikeTray, { messageId: s.damageMessage, targetUuid: s.targetUuid });
      t.assert(r.after.hp > 0, "control target dropped to 0", r);
      t.equal(r.after.wound, r.before.wound, "Stopień Zranienia after a normal hit");
    });

    const thrown = await t.step("player throws a grenade (sheet button + canvas click): charge lies pending", async () => {
      const before = await t.gm.eval(() => game.messages.size);
      const aim = await p1.eval(async () => {
        const actor = game.user.character;
        await actor.sheet.render(true);
        for (let i = 0; i < 40 && !actor.sheet.element?.querySelector(".neuro-grenade-list .item-throw"); i++) await new Promise(r => setTimeout(r, 100));
        const btn = actor.sheet.element?.querySelector(".neuro-grenade-list .item-throw");
        if (!btn) throw new Error("no grenade throw button on the sheet");
        const qty = actor.items.find(i => i.system.type?.subtype?.startsWith?.("grenade"))?.system.quantity ?? null;
        btn.click();
        await new Promise(r => setTimeout(r, 400));
        await actor.sheet.close(); // the picker is up; the sheet must not cover the canvas
        const target = canvas.tokens.placeables.find(tk => tk.name === "CYWIL");
        return { qty, point: { x: target.center.x - canvas.grid.size, y: target.center.y } };
      });
      await new Promise(r => setTimeout(r, 400));
      await p1.clickCanvas(aim.point);
      const state = await t.waitFor(t.gm, (id, since) => {
        const pending = canvas.scene.tiles.filter(tl => tl.flags[id]?.pendingCharge).length;
        const exploded = game.messages.contents.slice(since).some(m => /Wybuch:/.test(`${m.flavor ?? ""} ${m.content ?? ""}`));
        return pending ? { pending, exploded } : null;
      }, { args: [MODULE_ID, before], message: "a pending charge Tile on the scene" });
      t.equal(state.exploded, false, "explosion card before the turn ended");
      const qty = await p1.eval(() => game.user.character.items.find(i => i.system.type?.subtype?.startsWith?.("grenade"))?.system.quantity ?? 0);
      t.equal(qty, aim.qty - 1, "grenades left");
      await t.screenshot("Gracz 1", "grenade-pending");
      return { before };
    });

    await t.step("GM ends the turn → the charge detonates", async () => {
      // Turn order follows scene.tokens, whose order createEmbeddedDocuments does not guarantee —
      // so the expected next combatant is read, never assumed (a hard-coded "PC Gracz 2" flaked).
      const expectedNext = await t.gm.eval(() => {
        const c = game.combat;
        return c.turns[(c.turn + 1) % c.turns.length]?.name ?? null;
      });
      await t.gm.eval(() => game.combat.nextTurn());
      const r = await t.waitFor(t.gm, (id, since) => {
        const pending = canvas.scene.tiles.filter(tl => tl.flags[id]?.pendingCharge).length;
        const exploded = game.messages.contents.slice(since).some(m => /Wybuch:/.test(`${m.flavor ?? ""} ${m.content ?? ""}`));
        return !pending && exploded ? { pending, exploded, current: game.combat.combatant?.name } : null;
      }, { args: [MODULE_ID, thrown.before], timeoutMs: 15_000, message: "the charge to detonate after the turn" });
      t.equal(r.current, expectedNext, "next combatant");
      await t.screenshot("gm", "after-detonation");
    });
  }
};
