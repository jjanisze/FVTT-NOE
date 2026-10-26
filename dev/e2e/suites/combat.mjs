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
 *  - Emiter EMP (PLAN_m3_towarzysze.md §7.12, E10): proficient only through the Zabójca Maszyn ability; "Naładuj
 *    (230 V)" → the GM's button fills the battery to 6; a shot at an Obrońca (TT 20, "stalowy pancerz") is judged
 *    against 10 + DEX (D27); the damage tray defaults a living target to ×0 with a badge and keeps the machine at ×1;
 *    Porażenie: the living target is skipped, the machine fails CON 15 → Obezwładnienie until the end of the
 *    shooter's next turn.
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
    const link = { data: { system: { origin: usage.message.id } } };
    const attackRolls = await attack.rollAttack({}, { configure: false }, link);
    // As dnd5e's damage button does: crit from the last attack roll, same originating card.
    const isCritical = attackRolls?.[0]?.isCritical ?? false;
    await attack.rollDamage({ isCritical }, { configure: false }, link);
    const attackMsg = game.messages.contents.findLast(m => m._source.system?.origin === usage.message.id && m.flags[MOD]?.obrona);
    const damageMsg = game.messages.contents.findLast(m => m._source.system?.origin === usage.message.id && m.type === "damage");
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
    const link = { data: { system: { origin: usage.message.id } } };
    const rolls = await attack.rollAttack({}, { configure: false }, link);
    await new Promise(r => setTimeout(r, 600));
    const msg = game.messages.contents.findLast(m => m._source.system?.origin === usage.message.id && m.type === "attack");
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
    const attack = game.messages.contents.slice(since).findLast(m => m.type === "attack");
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

/** GM: catalog weapons for `actorName` from the `bron` pack, by catalog id (M6 E2: LAW, The Pig). */
async function armCatalog({ actorName, ids }) {
  const MOD = "neuroshima-2026-overrides";
  const actor = game.actors.getName(actorName);
  const docs = (await game.packs.get(`${MOD}.bron`).getDocuments()).filter(i => ids.includes(i.getFlag(MOD, "weaponId")));
  await actor.createEmbeddedDocuments("Item", docs.map(d => game.items.fromCompendium(d)));
  return actor.items.filter(i => ids.includes(i.getFlag(MOD, "weaponId"))).map(i => i.getFlag(MOD, "weaponId"));
}

/**
 * Player: one LAW shot at `targetName` (jednorazowa, PLAN_m6 D8): in hand first, attack and the card's damage. After the
 * roll the launcher is gone, a „Zużyta wyrzutnia” sits in the same hand, and the card still finds the weapon.
 */
async function fireLaw({ targetName }) {
  const MOD = "neuroshima-2026-overrides";
  const actor = game.user.character;
  const law = actor.items.find(i => i.getFlag(MOD, "weaponId") === "law");
  const lalka = game.neuroshima.lalka;
  // Both hands are full (B 92, B 93R): the B 93R goes to a holster first, as at the table — otherwise the doll
  // asks which hand gives way.
  const b93r = actor.items.find(i => i.getFlag(MOD, "weaponId") === "b93r");
  if (b93r && lalka.handOf(b93r)) await lalka.place(actor, b93r, "ranged");
  for (let i = 0; i < 3 && !lalka.handOf(law); i++) {
    const gate = lalka.useGate(law);
    if (gate === "equip") await lalka.equip(law);
    else if (gate === "draw") await lalka.draw(law);
    await __e2e.until(() => lalka.useGate(law) !== gate || lalka.handOf(law), { message: `the LAW past ${gate}` }).catch(() => {});
  }
  await __e2e.until(() => lalka.handOf(law), { message: "the LAW in hand" });
  const hand = lalka.handOf(law);
  const target = canvas.tokens.placeables.find(t => t.name === targetName);
  canvas.tokens.placeables.find(t => t.actor?.id === actor.id)?.control({ releaseOthers: true });
  canvas.tokens.setTargets([target.id]);
  const attack = law.system.activities.find(a => a.type === "attack");
  __e2e.forceD20([15], { fallback: 3 });
  try {
    const usage = await attack.use({ subsequentActions: false }, { configure: false }, {});
    const link = { data: { system: { origin: usage.message.id } } };
    await attack.rollAttack({}, { configure: false }, link);
    const scrap = await __e2e.until(() => actor.items.find(i => i.getFlag(MOD, "zuzytaWyrzutnia")), { message: "the spent launcher" });
    const msg = game.messages.contents.findLast(m => m._source.system?.origin === usage.message.id && m.type === "attack");
    const activity = msg?.getAssociatedActivity();
    const before = game.messages.size;
    await activity?.rollDamage({}, { configure: false }, link);
    await __e2e.quiet();
    return {
      hand, lawLeft: actor.items.some(i => i.getFlag(MOD, "weaponId") === "law"),
      scrap: { name: scrap.name, type: scrap.type, weight: scrap.system.weight.value, slots: scrap.getFlag(MOD, "slots") ?? [] },
      snapshot: (msg?.system?.deltas?.deleted ?? []).map(d => d.name),
      cardFindsWeapon: Boolean(activity), damageCards: game.messages.size - before
    };
  } finally {
    __e2e.restoreDice();
    canvas.tokens.setTargets([]);
  }
}

/** Player: what the engine says about The Pig (ciężka, długa) at `targetName`, without firing — then after a toggle. */
async function heavyPreview({ targetName }) {
  const MOD = "neuroshima-2026-overrides";
  const actor = game.user.character;
  const pig = actor.items.find(i => i.getFlag(MOD, "weaponId") === "the-pig");
  // Fire modes are built live (`weapons/fire-modes.mjs`) — a gun handed out a moment ago may not have them yet.
  const attack = await __e2e.until(() => pig.system.activities.find(a => a.type === "attack"), { message: "The Pig's attack" });
  const target = canvas.tokens.placeables.find(t => t.name === targetName);
  canvas.tokens.placeables.find(t => t.actor?.id === actor.id)?.control({ releaseOthers: true });
  canvas.tokens.setTargets([target.id]);
  const r = game.neuroshima.okolicznosci.rozstrzygnij(attack);
  canvas.tokens.setTargets([]);
  return { utrudnienia: r.utrudnienia.map(w => w.id), oparta: Boolean(pig.getFlag(MOD, "setup")?.oparcie) };
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

/** GM: Emiter EMP and the Zabójca Maszyn ability for PC Gracz 1, an Obrońca next to him, his turn. */
async function przygotujEmp() {
  const MOD = "neuroshima-2026-overrides";
  const pc = game.actors.getName("PC Gracz 1");
  const bron = await game.packs.get(`${MOD}.bron`).getDocuments();
  const zdolnosci = await game.packs.get(`${MOD}.zdolnosci-klasowe`).getDocuments();
  const zd = zdolnosci.find(i => i.getFlag(MOD, "abilityId") === "emiter-emp");
  const [emp] = await pc.createEmbeddedDocuments("Item", [game.items.fromCompendium(bron.find(i => i.name === "Emiter EMP"))]);
  await pc.createEmbeddedDocuments("Item", [game.items.fromCompendium(zd)]);
  await window.__e2e.until(() => {
    const w = pc.items.get(emp.id);
    return w?.system.activities.find(a => a.type === "attack") && w.system.activities.find(a => a.visibility?.identifier === "emp-naladuj");
  }, { message: "the emitter's attack and charge activities" });
  await pc.items.get(emp.id).setFlag(MOD, "rounds", ["emp", "emp"]);
  // Both hands hold the B 92 and the B 93R by now: the B 93R goes to the pack, the emitter into the free hand.
  const lalka = game.neuroshima.lalka;
  const b93r = pc.items.find(i => i.getFlag(MOD, "weaponId") === "b93r");
  if (b93r && lalka.inHand(b93r)) await lalka.place(pc, b93r, "pack");
  await lalka.equip(pc.items.get(emp.id));
  const best = await game.packs.get(`${MOD}.bestiariusz`).getDocuments();
  const src = best.find(a => a.getFlag(MOD, "bestiary.id") === "obronca");
  const [actor] = await Actor.implementation.create([{ ...game.actors.fromCompendium(src), name: "e2e Obrońca" }]);
  const pcTok = canvas.scene.tokens.find(t => t.actorId === pc.id);
  const doc = await actor.getTokenDocument({ x: pcTok.x + 200, y: pcTok.y, name: "e2e Obrońca" });
  await canvas.scene.createEmbeddedDocuments("Token", [doc.toObject()]);
  await actor.update({ "system.attributes.hp.max": 200, "system.attributes.hp.value": 200 });
  const combat = game.combat;
  await combat.update({ turn: combat.turns.findIndex(c => c.name === "PC Gracz 1") });
  return { empId: emp.id, ac: actor.system.attributes.ac.value, dex: actor.system.abilities.dex.mod, turns: combat.turns.length };
}

/** Player: proficiency and charges of the emitter. */
function stanEmp({ empId }) {
  const w = game.user.character.items.get(empId);
  return { prof: w.system.proficiencyMultiplier, ladunki: (w.flags["neuroshima-2026-overrides"].rounds ?? []).length };
}

/** Player: an emitter shot at the Obrońca (d20 forced via `uniform`), damage targeting the Obrońca and CYWIL. */
async function strzalEmp({ empId, uniform }) {
  const MOD = "neuroshima-2026-overrides";
  const actor = game.user.character;
  const w = actor.items.get(empId);
  const attack = w.system.activities.find(a => a.type === "attack");
  const ob = canvas.tokens.placeables.find(t => t.name === "e2e Obrońca");
  const cyw = canvas.tokens.placeables.find(t => t.name === "CYWIL");
  canvas.tokens.placeables.find(t => t.actor?.id === actor.id)?.control({ releaseOthers: true });
  canvas.tokens.setTargets([ob.id]);
  const orig = CONFIG.Dice.randomUniform;
  CONFIG.Dice.randomUniform = () => uniform;
  try {
    let usage = null;
    for (let i = 0; i < 20 && !usage; i++) {
      usage = await attack.use({ subsequentActions: false }, { configure: false }, {});
      if (!usage) await new Promise(r => setTimeout(r, 250));
    }
    const link = { data: { system: { origin: usage.message.id } } };
    await attack.rollAttack({}, { configure: false }, link);
    canvas.tokens.setTargets([ob.id, cyw.id]);
    await attack.rollDamage({}, { configure: false }, link);
    const attackMsg = game.messages.contents.findLast(m => m._source.system?.origin === usage.message.id && m.flags[MOD]?.obrona);
    const damageMsg = game.messages.contents.findLast(m => m._source.system?.origin === usage.message.id && m.type === "damage");
    return { usage: usage.message.id, damage: damageMsg?.id ?? null, tt: attackMsg?.flags[MOD].obrona.targets?.[0]?.tt ?? null };
  } finally {
    CONFIG.Dice.randomUniform = orig;
  }
}

/**
 * GM: the damage tray of a message — per target: its multiplier and the EMP badge. dnd5e 6.0 groups targets with
 * the same result into one pill (an `li` with a `datalist` of token uuids) and builds them only while the tray is
 * open and on screen; a background e2e window is neither, so the probe opens it and marks it visible.
 */
async function tackaEmp({ messageId }) {
  const el = await window.__e2e.until(() => {
    const t = document.querySelector(`#chat [data-message-id="${messageId}"] damage-application, .chat-log [data-message-id="${messageId}"] damage-application`);
    if (!t?.targetList) return null;
    t.open = true;
    t.targetList.visible = true;
    return t.targetList.querySelectorAll("datalist > option").length >= 2 ? t : null;
  }, { message: "the damage tray with two targets" });
  return [...el.targetList.querySelectorAll("datalist > option")].map(o => ({
    name: o.textContent.trim(),
    mnoznik: String(el.getMergedOptions(o.value).multiplier),
    plakietka: !!o.closest("li")?.querySelector(".neuro-emp-plakietka")
  }));
}

/** GM: Porażenie from the usage card at `targetName`, the save forced to fail. */
async function porazenie({ messageId, targetName }) {
  const tok = canvas.tokens.placeables.find(t => t.name === targetName);
  canvas.tokens.setTargets([tok.id]);
  const before = game.messages.size;
  window.__e2e.forceD20([2], { fallback: 2 });
  try {
    await window.__e2e.clickChat(messageId, '.neuro-save-prop-btn[data-prop="emp"]');
    await new Promise(r => setTimeout(r, 800));
  } finally {
    window.__e2e.restoreDice();
  }
  const e = tok.actor.effects.find(x => x.flags?.["neuroshima-2026-overrides"]?.doKoncaTuryAtakujacego);
  const texts = game.messages.contents.slice(before).map(m => m.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  return { obezwladniony: tok.actor.statuses.has("incapacitated"), czas: e ? { ...e.duration } : null, start: e?.start?.combatant ?? null, texts };
}

export default {
  name: "combat",
  clients: ["gm", "Gracz 1"],

  async run(t) {
    const p1 = t.client("Gracz 1");
    await t.waitFor(p1, () => Boolean(game.user.character && canvas.tokens?.placeables.some(tk => tk.isOwner)),
      { message: "the player's client to see the fixture" });

    // Kary za krytyk dostaje tylko istota ze Stopniem Zranienia (s. 205, PLAN_m3 F2). GANGUS ŻOŁNIERZ ma
    // go w statblocku nie ma — tu gra istotę, która ma (jak Gangus Boss); CYWIL zostaje bez.
    await t.step("GM: combat with every token, Gracz 1 on turn; NPCs at 60 HP; GANGUS has Stopnie (s. 205)", async () => {
      const r = await t.gm.eval(async () => {
        for (const c of game.combats.contents) await c.delete();
        const scene = canvas.scene;
        for (const tok of scene.tokens.filter(tk => !tk.actor?.hasPlayerOwner)) {
          await tok.actor.update({ "system.attributes.hp.max": 60, "system.attributes.hp.value": 60 });
        }
        const gangus = scene.tokens.find(tk => tk.name === "GANGUS ŻOŁNIERZ").actor;
        await gangus.update({ "flags.neuroshima-2026-overrides.bestiary.usesZranienie": true });
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

    await t.step("a crit on a creature without Stopnie (CYWIL, s. 205) does not wound", async () => {
      const s = await p1.eval(shoot, { targetName: "CYWIL", uniform: 0.00001 });
      t.equal(s.verdict, "krytyk", "verdict on the attack card");
      t.assert(s.damageMessage && s.damageCrit, "no critical damage card linked to the attack", s);
      const r = await t.gm.eval(applyLikeTray, { messageId: s.damageMessage, targetUuid: s.targetUuid });
      t.assert(r.after.hp < r.before.hp, "no damage applied", r);
      t.equal(r.after.wound, r.before.wound, "Stopień Zranienia after a crit on a creature without Stopnie");
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
    await t.step("player: LAW (jednorazowa) — one shot, a spent launcher in the same hand, the card's damage still rolls (M6 D8)", async () => {
      const armed = await t.gm.eval(armCatalog, { actorName: "PC Gracz 1", ids: ["law", "the-pig"] });
      t.equal(armed.sort().join(","), "law,the-pig", "catalog weapons handed out");
      await t.waitFor(p1, () => game.user.character.items.some(i => i.getFlag("neuroshima-2026-overrides", "weaponId") === "law") || null,
        { message: "the player to see the LAW" });
      const r = await p1.eval(fireLaw, { targetName: "CYWIL" });
      t.equal(r.lawLeft, false, "the launcher is gone after the shot");
      t.equal(r.scrap.type, "loot", "the spent launcher is junk");
      t.equal(r.scrap.weight, 2.5, "half the LAW's weight (U7)");
      t.equal(r.scrap.slots.join(","), r.hand, "the spent launcher stays in the hand that fired");
      t.assert(r.snapshot.includes("LAW"), "no snapshot of the LAW on the attack card", r);
      t.equal(r.cardFindsWeapon, true, "the attack card still resolves its activity");
      t.assert(r.damageCards >= 1, "the damage roll from the card made no card", r);
      await t.quiet();
    });

    await t.step("ciężka (The Pig): Utrudnienie without support; „Oprzyj broń” removes it, a move puts it back (U8)", async () => {
      const a = await p1.eval(heavyPreview, { targetName: "CYWIL" });
      t.assert(a.utrudnienia.includes("ciezka"), "no ciężka Utrudnienie for a STR-10 shooter without support", a);
      await p1.eval(async () => {
        const pig = game.user.character.items.find(i => i.getFlag("neuroshima-2026-overrides", "weaponId") === "the-pig");
        await game.neuroshima.wlasciwosci.ustawOparcie(pig, true);
      });
      const b = await p1.eval(heavyPreview, { targetName: "CYWIL" });
      t.equal(b.oparta, true, "the support switch");
      t.assert(!b.utrudnienia.includes("ciezka"), "ciężka Utrudnienie with the weapon supported", b);
      await p1.eval(async () => {
        const tok = canvas.scene.tokens.find(tk => tk.actor?.id === game.user.character.id);
        await tok.move({ x: tok.x, y: tok.y + canvas.grid.size, action: "displace" }, { animate: false });
      });
      const c = await t.waitFor(p1, n => {
        const pig = game.user.character.items.find(i => i.getFlag("neuroshima-2026-overrides", "weaponId") === "the-pig");
        return pig.getFlag("neuroshima-2026-overrides", "setup")?.oparcie === false ? true : null;
      }, { args: [null], message: "the support to drop after the move" }).then(() => p1.eval(heavyPreview, { targetName: "CYWIL" }));
      t.assert(c.utrudnienia.includes("ciezka"), "ciężka Utrudnienie back after moving", c);
      await t.quiet();
    });

    await t.step("Emiter EMP: ability proficiency, Naładuj (230 V), TT 10 + DEX vs armour (D27), tray ×0 for the living, Porażenie on the machine", async () => {
      const prep = await t.gm.eval(przygotujEmp);
      t.equal(prep.ac, 20, "Obrońca's statblock TT");
      const st0 = await t.waitFor(p1, (o) => {
        const w = game.user.character.items.get(o.empId);
        return w?.system.activities.find(a => a.type === "attack") ? true : null;
      }, { args: [{ empId: prep.empId }], message: "the player to see the emitter" });
      const s = await p1.eval(stanEmp, { empId: prep.empId });
      t.equal(s.prof, 1, "proficient through the Zabójca Maszyn ability");
      t.equal(s.ladunki, 2, "two charges left");
      // Naładuj (230 V): the player's card, the GM's button.
      await p1.eval(async (id) => {
        game.user.character.items.get(id).system.activities.find(a => a.visibility?.identifier === "emp-naladuj").use();
        return true;
      }, prep.empId);
      const karta = await t.waitFor(t.gm, () => game.messages.contents.findLast(m => m.flags?.["neuroshima-2026-overrides"]?.empLadowanie)?.id ?? null,
        { message: "the charge card" });
      await t.gm.eval(async (id) => { await window.__e2e.clickChat(id, '[data-action="neuroEmpNaladuj"]'); return true; }, karta);
      const po = await t.waitFor(p1, (o) => {
        const n = (game.user.character.items.get(o.empId).flags["neuroshima-2026-overrides"].rounds ?? []).length;
        return n === 6 ? n : null;
      }, { args: [{ empId: prep.empId }], message: "six charges" });
      t.equal(po, 6, "battery full");
      const strzal = await p1.eval(strzalEmp, { empId: prep.empId, uniform: 0.5 });
      t.equal(strzal.tt, 10 + prep.dex, "the hit is judged against 10 + DEX — the steel plate does not count (D27)");
      const tacka = await t.gm.eval(tackaEmp, { messageId: strzal.damage });
      const ob = tacka.find(x => x.name === "e2e Obrońca");
      const cyw = tacka.find(x => x.name === "CYWIL");
      t.equal(ob?.mnoznik, "1", "machine: ×1");
      t.equal(ob?.plakietka, false, "machine: no badge");
      t.equal(cyw?.mnoznik, "0", "living target: ×0 by default (T3)");
      t.equal(cyw?.plakietka, true, "living target: \"EMP nie działa na istoty żywe\"");
      await t.screenshot("gm", "emiter EMP — tacka obrażeń");
      const zywy = await t.gm.eval(porazenie, { messageId: strzal.usage, targetName: "CYWIL" });
      t.equal(zywy.obezwladniony, false, "the living target is not stunned");
      t.assert(zywy.texts.some(x => /nie jest maszyną/.test(x)), "\"nie jest maszyną\" on the card", zywy);
      const masz = await t.gm.eval(porazenie, { messageId: strzal.usage, targetName: "e2e Obrońca" });
      t.equal(masz.obezwladniony, true, "the machine fails CON 15 → Obezwładnienie");
      t.equal(masz.czas?.value, prep.turns, "lasts one round of turns from the shooter's turn");
      t.equal(masz.czas?.expiry, "turnEnd", "ends at the end of a turn");
      const kombatant = await t.gm.eval(() => game.combat.turns.find(c => c.name === "PC Gracz 1")?.id);
      t.equal(masz.start, kombatant, "anchored to the shooter's turn");
      await t.gm.eval(async () => {
        const a = game.actors.getName("e2e Obrońca");
        for (const tk of canvas.scene.tokens.filter(x => x.actorId === a?.id)) await tk.delete();
        if (a) await a.delete();
        await new Promise(r => setTimeout(r, 1500));
        return true;
      });
    });
  }
};
