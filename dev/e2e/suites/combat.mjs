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
 *  - Ammunition: one semi-auto shot spends exactly one round; one KS (B 93R) spends three, rolls with
 *    Utrudnienie by default and cannot be repeated in the same round (PLAN_beta B6: "walka P/KS").
 *  - Attack circumstances (PLAN_m1_walka E3–E4): far range and a ranged attack with an enemy next to
 *    the shooter default to Utrudnienie with ONE badge group on the card; Unikanie on the target and
 *    Bieganie on the shooter join the same group.
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
      usage = await attack.use({ subsequentActions: false }, { configure: false }, {});
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

/** Player: one shot like `shoot`, then what the circumstance engine put on the roll and the card. */
async function shootCircumstances({ targetName, uniform }) {
  const actor = game.user.character;
  const gun = actor.items.find(i => i.type === "weapon");
  const attack = gun.system.activities.find(a => a.type === "attack");
  const target = canvas.tokens.placeables.find(t => t.name === targetName);
  canvas.tokens.placeables.find(t => t.actor?.id === actor.id)?.control({ releaseOthers: true });
  canvas.tokens.setTargets([target.id]);
  const orig = CONFIG.Dice.randomUniform;
  CONFIG.Dice.randomUniform = () => uniform;
  try {
    const usage = await attack.use({ subsequentActions: false }, { configure: false }, {});
    const link = { data: { flags: { dnd5e: { originatingMessage: usage.message.id } } } };
    const rolls = await attack.rollAttack({}, { configure: false }, link);
    await new Promise(r => setTimeout(r, 600));
    const msg = game.messages.contents.findLast(m => m.getFlag("dnd5e", "originatingMessage") === usage.message.id && m.getFlag("dnd5e", "roll.type") === "attack");
    const z = rolls?.[0]?.options?.neuroOkolicznosci ?? null;
    const el = ui.chat.element?.querySelector(`[data-message-id="${msg?.id}"]`);
    const groups = el ? [...el.querySelectorAll(".neuro-okolicznosci:not(.neuro-okolicznosci-uwaga):not(.neuro-okolicznosci-autokrytyk)")] : [];
    return {
      advantageMode: rolls?.[0]?.options?.advantageMode ?? null,
      utrudnienia: (z?.utrudnienia ?? []).map(w => w.id), ulatwienia: (z?.ulatwienia ?? []).map(w => w.id),
      groups: groups.length, tryb: groups[0]?.dataset.tryb ?? null, messageId: msg?.id ?? null
    };
  } finally {
    CONFIG.Dice.randomUniform = orig;
    canvas.tokens.setTargets([]);
  }
}

/** GM: a B 93R with a loaded 20-round magazine for `actorName`, the way the fixture loads the B 92. */
async function armBurst({ actorName }) {
  const MOD = "neuroshima-2026-overrides";
  const mags = await import(`/modules/${MOD}/scripts/weapons/magazine-model.mjs`);
  const actor = game.actors.getName(actorName);
  const weapon = (await game.packs.get(`${MOD}.bron`).getDocuments()).find(i => i.getFlag(MOD, "weaponId") === "b93r");
  const magwell = mags.weaponMagwell(weapon);
  const magazine = (await game.packs.get(`${MOD}.magazynki`).getDocuments()).find(m => mags.magazineDefOf(m)?.magwell === magwell);
  const known = new Set(actor.items.map(i => i.id));
  await actor.createEmbeddedDocuments("Item", [game.items.fromCompendium(weapon), game.items.fromCompendium(magazine)]);
  // Found by what is new, never by position (createEmbeddedDocuments does not keep the order) and
  // never by magwell alone (the fixture's B 92 magazine may fit too).
  const fresh = actor.items.filter(i => !known.has(i.id));
  const gun = fresh.find(i => i.getFlag(MOD, "weaponId") === "b93r");
  const mag = fresh.find(i => mags.isMagazineItem(i));
  const n = await mags.loadRounds(mag, "9mm", mags.freeSpace(mag));
  await mags.swapMagazineItem(gun, mag);
  await __e2e.until(() => gun.system.activities.some(a => a.type === "neuroKs"), { message: "the KS activity on the B 93R" });
  return { loaded: n, current: game.neuroshima.magazynki.getMag(gun).current };
}

/**
 * Player: one KS (krótka seria) with the B 93R at `targetName`, as the sheet fires it: the attack
 * dialog opens with Utrudnienie preselected and the player confirms it. Then a second KS in the same
 * round, which must be refused without a dialog.
 */
async function burst({ targetName }) {
  const MOD = "neuroshima-2026-overrides";
  const actor = game.user.character;
  const gun = actor.items.find(i => i.getFlag(MOD, "weaponId") === "b93r");
  const ks = gun.system.activities.find(a => a.type === "neuroKs");
  const target = canvas.tokens.placeables.find(t => t.name === targetName);
  canvas.tokens.placeables.find(t => t.actor?.id === actor.id)?.control({ releaseOthers: true });
  canvas.tokens.setTargets([target.id]);
  // Oporządzenie (D8): attacks only from the hand. A gun handed over a moment ago sits in the pack,
  // and its first use would only equip it — so the player takes it in hand first, as at the table.
  const lalka = game.neuroshima.lalka;
  const gate = lalka.useGate(gun);
  if (gate === "equip") await lalka.equip(gun);
  else if (gate === "draw") await lalka.draw(gun);
  await __e2e.until(() => [null, "proceed"].includes(lalka.useGate(gun)), { message: "the B 93R in hand" });
  const mag = () => game.neuroshima.magazynki.getMag(gun).current;
  const before = mag();
  const since = game.messages.size;
  __e2e.forceD20([14, 9], { fallback: 3 });
  try {
    // dnd5e does not await the subsequent actions (activity mixin), so use() returns before the
    // attack dialog is even answered; the rounds are spent after the roll.
    await ks.use({}, { configure: false }, {});
    const pressed = await __e2e.pressRollDialog("disadvantage");
    await __e2e.until(() => mag() < before, { timeoutMs: 8000, message: "the burst's rounds to be spent" }).catch(() => {});
    await __e2e.quiet();
    const attack = game.messages.contents.slice(since).findLast(m => m.getFlag("dnd5e", "roll.type") === "attack");
    const afterFirst = mag();
    // Same round again: refused before any dialog (use() returns nothing). Were it accepted, its
    // dialog is answered so nothing hangs, and the spent rounds show it.
    const again = await ks.use({}, { configure: false }, {});
    if (again) await __e2e.pressRollDialog("normal", { timeoutMs: 3000 });
    await __e2e.quiet();
    return {
      gate, pressed, spent: before - afterFirst, spentAgain: afterFirst - mag(), secondRefused: !again,
      advantageMode: attack?.rolls?.[0]?.options?.advantageMode ?? null, flavor: attack?.flavor ?? null,
      used: gun.getFlag(MOD, "lastBurstUse")?.mode ?? null
    };
  } finally {
    __e2e.restoreDice();
    canvas.tokens.setTargets([]);
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

    await t.step("circumstances: far range → default Utrudnienie, one badge group", async () => {
      const r = await p1.eval(shootCircumstances, { targetName: "CYWIL", uniform: 0.4 });
      t.assert(r.utrudnienia.includes("zasiegDaleki"), "no far-range Utrudnienie (CYWIL is ~27 m, B 92 18/39 m)", r);
      t.equal(r.advantageMode, -1, "roll mode (ADV_MODE.DISADVANTAGE)");
      t.equal(r.groups, 1, "badge groups on the attack card");
      t.equal(r.tryb, "-1", "badge group mode");
    });

    await t.step("circumstances: enemy next to the shooter (ranged in melee), target dodging, shooter running and overloaded", async () => {
      await t.gm.eval(async () => {
        const pc = canvas.scene.tokens.find(tk => tk.name === "PC Gracz 1");
        const npc = canvas.scene.tokens.find(tk => tk.name === "GANGUS ŻOŁNIERZ");
        // Placed (displace), not walked: an x/y update is a wall-constrained move in v14 and, from one of
        // the fixture's two NPC slots, the line crosses the shed (see umieranie).
        await npc.move({ x: pc.x + canvas.grid.size, y: pc.y, action: "displace" }, { animate: false });
        const cywil = canvas.scene.tokens.find(tk => tk.name === "CYWIL").actor;
        await cywil.toggleStatusEffect("dodging", { active: true });
        // A migrated source (D6): Przeciążenie from Udźwig reaches the roll through the engine's registry.
        await game.actors.getName("PC Gracz 1").createEmbeddedDocuments("Item", [{
          name: "e2e: worek kamieni", type: "loot", system: { weight: { value: 70, units: "kg" }, quantity: 1 }
        }]);
        await new Promise(r => setTimeout(r, 500));
      });
      // Bieganie the way a player does it: the action toggle in the sheet's Stan panel (U8).
      const sheet = await p1.eval(async () => {
        const actor = game.user.character;
        await actor.sheet.render(true);
        let btn = null;
        for (let i = 0; i < 40 && !btn; i++) {
          await new Promise(r => setTimeout(r, 100));
          btn = actor.sheet.element?.querySelector('.neuro-akcja-btn[data-akcja="bieganie"]');
        }
        if (!btn) return { button: false };
        btn.click();
        await new Promise(r => setTimeout(r, 800));
        const pressed = actor.sheet.element?.querySelector('.neuro-akcja-btn[data-akcja="bieganie"]')?.getAttribute("aria-pressed");
        await actor.sheet.close();
        return { button: true, running: actor.statuses.has("bieganie"), pressed };
      });
      t.equal(sheet.button, true, "Bieganie toggle in the Stan panel during combat");
      t.equal(sheet.running, true, "Bieganie after the sheet toggle");
      t.equal(sheet.pressed, "true", "toggle shown as pressed after re-render");
      const r = await p1.eval(shootCircumstances, { targetName: "CYWIL", uniform: 0.4 });
      for (const id of ["dystansowyWZwarciu", "zasiegDaleki", "celUnika", "bieganie", "udzwig"]) {
        t.assert(r.utrudnienia.includes(id), `missing Utrudnienie ${id}`, r);
      }
      t.equal(r.groups, 1, "still one badge group");
      await t.screenshot("Gracz 1", "okolicznosci");
      await t.gm.eval(async () => {
        await canvas.scene.tokens.find(tk => tk.name === "CYWIL").actor.toggleStatusEffect("dodging", { active: false });
        const pc = game.actors.getName("PC Gracz 1");
        await pc.toggleStatusEffect("bieganie", { active: false });
        await pc.deleteEmbeddedDocuments("Item", pc.items.filter(i => i.name === "e2e: worek kamieni").map(i => i.id));
        // Let the status scrolling text and hook follow-ups finish: the next suite's fixture deletes
        // this scene, and a write or animation still in flight then errors on the dead canvas.
        await new Promise(r => setTimeout(r, 2500));
      });
    });

    await t.step("player: KS with the B 93R — Utrudnienie by default, 3 rounds, once per round", async () => {
      const armed = await t.gm.eval(armBurst, { actorName: "PC Gracz 1" });
      t.equal(armed.current, 20, "rounds in the B 93R's magazine");
      await t.waitFor(p1, () => game.user.character.items.some(i => i.system.activities?.some?.(a => a.type === "neuroKs")),
        { message: "the player to see the KS activity" });
      const r = await p1.eval(burst, { targetName: "CYWIL" });
      t.equal(r.pressed, true, "attack dialog for the burst");
      t.equal(r.advantageMode, -1, "KS attack roll mode (ADV_MODE.DISADVANTAGE)");
      t.equal(r.spent, 3, "rounds spent by one KS");
      t.equal(r.used, "ks", "burst marked as used this round");
      t.equal(r.secondRefused, true, "a second KS in the same round was allowed");
      t.equal(r.spentAgain, 0, "rounds spent by the refused second KS");
      await t.quiet();
    });
  }
};
