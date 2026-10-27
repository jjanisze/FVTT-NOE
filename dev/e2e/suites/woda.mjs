/**
 * Suite — woda i wspinaczka (PLAN_m6_drobne_zasady.md §5.6, E6; NOE s. 255–256). On the skirmish scene, in combat:
 *
 *  - PC Gracz 1 walks into a deep, fast-flowing Region `woda`: the GM gets the "entering in gear" card and asks for
 *    the test; the player's Atletyka ST 10 fails → Tonie (Szybkość 0) and Pod wodą, breath held (Uduszenie phase);
 *  - the start of Gracz 1's turn (active GM only, E0f) posts the ST 15 card; a success → Tonie and Pod wodą off,
 *    breathing again;
 *  - diving on purpose, the player shoots the B 92 from under water: Utrudnienie badge, and the GM's tray applies half;
 *  - a target standing in shallow water gets Osłona ½ by default in the attack window;
 *  - walking out of the water clears Pod wodą;
 *  - a climb move on the player's own turn posts one climbing card per turn (Atletyka ST 10, the two-hands rule).
 */

/* Functions below run in the browser (serialised): no closures over this file. */

/** GM: a deep, fast Region `woda` east of Gracz 1; combat with Gracz 1 last in order, someone else on turn. */
async function przygotuj() {
  const MOD = "neuroshima-2026-overrides";
  const scene = canvas.scene;
  const g = scene.grid.size;
  for (const c of game.combats.contents) await c.delete();
  const level = scene.levels.contents[0]?.id;
  const [staw] = await scene.createEmbeddedDocuments("Region", [{
    name: "Staw", ...(level ? { levels: [level] } : {}),
    shapes: [{ type: "rectangle", x: 6 * g, y: 4 * g, width: 4 * g, height: 5 * g, rotation: 0, hole: false }],
    elevation: { bottom: null, top: null },
    behaviors: [{ type: `${MOD}.woda`, name: "Woda", system: { glebokosc: "gleboka", nurt: "rwaca" } }]
  }]);
  for (const tok of scene.tokens.filter(t => !t.actor?.hasPlayerOwner)) {
    await tok.actor.update({ "system.attributes.hp.max": 60, "system.attributes.hp.value": 60 });
  }
  const combat = await Combat.implementation.create({ scene: scene.id, active: true });
  const order = scene.tokens.contents.sort((a, b) => (a.name === "PC Gracz 1") - (b.name === "PC Gracz 1"));
  await combat.createEmbeddedDocuments("Combatant", order.map((tk, i) => ({ tokenId: tk.id, sceneId: scene.id, actorId: tk.actorId, initiative: 20 - i })));
  await combat.startCombat();
  const pc = scene.tokens.find(t => t.name === "PC Gracz 1");
  return { region: staw.id, typ: staw.behaviors.contents[0]?.type, current: combat.combatant?.name,
    pcCell: { x: pc.x / g, y: pc.y / g }, registered: !!CONFIG.RegionBehavior.dataModels[`${MOD}.woda`] };
}

/** Player: walk the PC to a cell. */
async function idz({ cx, cy, action = "walk" }) {
  const actor = game.user.character;
  const tok = canvas.scene.tokens.find(t => t.actor?.id === actor.id);
  const g = canvas.scene.grid.size;
  await tok.move({ x: cx * g, y: cy * g, action }, { constrainOptions: { ignoreWalls: true, ignoreCost: true } });
  await __e2e.until(() => tok.x === cx * g && tok.y === cy * g, { timeoutMs: 8000, message: "the token at the cell" }).catch(() => {});
  await __e2e.quiet();
  return { x: tok.x / g, y: tok.y / g, woda: !!game.neuroshima.woda.wodaZetonu(tok) };
}

/** Any client: the newest card with flag `flag` (and `rodzaj`) for the PC. */
function karta({ flag, rodzaj = null, since = 0 }) {
  const MOD = "neuroshima-2026-overrides";
  const m = game.messages.contents.slice(since).findLast(x => x.flags?.[MOD]?.[flag] && (!rodzaj || x.flags[MOD][flag].rodzaj === rodzaj));
  return m ? { id: m.id, st: m.flags[MOD][flag].st ?? null, text: m.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    whisper: m.whisper.length, buttons: [...m.content.matchAll(/data-neuro-(?:woda|wspinaczka)="([^"]+)"/g)].map(x => x[1]) } : null;
}

/** GM: click a button on a card. */
async function klik({ id, selector }) {
  const clicked = await __e2e.clickChat(id, selector);
  await __e2e.quiet();
  return clicked;
}

/** Player: roll from the test card with a forced d20; the PC's water state after. */
async function rzut({ id, face }) {
  const actor = game.user.character;
  const since = game.messages.size;
  __e2e.forceD20([face], { fallback: face });
  try {
    const clicked = await __e2e.clickChat(id, 'button[data-neuro-woda="rzut"]');
    const pressed = await __e2e.pressRollDialog("normal");
    await __e2e.until(() => game.messages.contents.slice(since).some(m => m.flags?.["neuroshima-2026-overrides"]?.wodaRzut),
      { timeoutMs: 6000, message: "the swim roll" }).catch(() => {});
    await __e2e.quiet();
    await new Promise(r => setTimeout(r, 400));
    const roll = game.messages.contents.slice(since).findLast(m => m.flags?.["neuroshima-2026-overrides"]?.wodaRzut)?.rolls?.[0];
    return { clicked, pressed, total: roll?.total ?? null, ...stan() };
  } finally { __e2e.restoreDice(); }

  function stan() {
    return { tonie: actor.statuses.has("tonie"), podWoda: actor.statuses.has("podWoda"),
      oddech: !!actor.effects.find(e => e.statuses?.has("suffocation")), walk: Number(actor.system.attributes.movement.speeds.walk) };
  }
}

/** Any client: the PC's water state. */
function stanPC() {
  const actor = game.actors.getName("PC Gracz 1");
  return { tonie: actor.statuses.has("tonie"), podWoda: actor.statuses.has("podWoda"),
    oddech: !!actor.effects.find(e => e.statuses?.has("suffocation")), walk: Number(actor.system.attributes.movement.speeds.walk) };
}

/** GM: Gracz 1's turn (forward), so TOKEN_TURN_START fires for him. */
async function turaGracza() {
  const combat = game.combat;
  const since = game.messages.size;
  const idx = combat.turns.findIndex(c => c.name === "PC Gracz 1");
  await combat.update({ turn: idx });
  await __e2e.quiet();
  return { current: combat.combatant?.name, since };
}

/** Player: dive (Pod wodą on purpose) and shoot `targetName` with the B 92, natural 20s. */
async function strzalSpodWody({ targetName }) {
  const MOD = "neuroshima-2026-overrides";
  const actor = game.user.character;
  await actor.toggleStatusEffect("podWoda", { active: true });
  const gun = actor.items.find(i => i.type === "weapon");
  const attack = gun.system.activities.find(a => a.type === "attack");
  const target = canvas.tokens.placeables.find(t => t.name === targetName);
  canvas.tokens.placeables.find(t => t.actor?.id === actor.id)?.control({ releaseOthers: true });
  canvas.tokens.setTargets([target.id]);
  __e2e.forceD20([20, 20], { fallback: 3 });
  try {
    let usage = null;
    for (let i = 0; i < 20 && !usage; i++) {
      usage = await attack.use({ subsequentActions: false }, { configure: false }, {});
      if (!usage) await new Promise(r => setTimeout(r, 250));
    }
    const link = { data: { system: { origin: usage.message.id } } };
    const rolls = await attack.rollAttack({}, { configure: false }, link);
    await attack.rollDamage({ isCritical: rolls?.[0]?.isCritical ?? false }, { configure: false }, link);
    const attackMsg = game.messages.contents.findLast(m => m._source.system?.origin === usage.message.id && m.type === "attack");
    const damageMsg = game.messages.contents.findLast(m => m._source.system?.origin === usage.message.id && m.type === "damage");
    const z = attackMsg?.rolls?.[0]?.options?.neuroOkolicznosci;
    return { utrudnienia: z?.utrudnienia?.map(w => w.id) ?? [], uwagi: z?.uwagi?.map(w => w.id) ?? [],
      damageMessage: damageMsg?.id ?? null, targetUuid: target.actor.uuid, jammed: !!gun.getFlag(MOD, "jam")?.jammed };
  } finally {
    __e2e.restoreDice();
    canvas.tokens.setTargets([]);
  }
}

/** GM: a shallow Region `woda` under `name`; the attack window's default cover for it, standing and prone. */
async function brod({ name }) {
  const MOD = "neuroshima-2026-overrides";
  const { domyslnaOslona } = await import(`/modules/${MOD}/scripts/combat/cover.mjs`);
  const scene = canvas.scene;
  const tok = scene.tokens.find(t => t.name === name);
  const g = scene.grid.size;
  const level = scene.levels.contents[0]?.id;
  await scene.createEmbeddedDocuments("Region", [{
    name: "Bród", ...(level ? { levels: [level] } : {}),
    shapes: [{ type: "rectangle", x: tok.x - g, y: tok.y - g, width: 3 * g, height: 3 * g, rotation: 0, hole: false }],
    elevation: { bottom: null, top: null },
    behaviors: [{ type: `${MOD}.woda`, name: "Woda", system: { glebokosc: "plytka", nurt: "spokojna" } }]
  }]);
  const stoi = domyslnaOslona(tok.object);
  await tok.actor.toggleStatusEffect("prone", { active: true });
  const lezy = domyslnaOslona(tok.object);
  await tok.actor.toggleStatusEffect("prone", { active: false });
  return { stoi, lezy };
}

/** GM: apply a damage card like dnd5e's tray. */
async function tacka({ messageId, targetUuid }) {
  const message = game.messages.get(messageId);
  const target = fromUuidSync(targetUuid);
  const before = target.system.attributes.hp.value;
  const damages = dnd5e.dice.aggregateDamageRolls(message.rolls, { respectProperties: true }).map(r => ({
    value: Math.max(0, r.total), type: r.options.type, properties: new Set(r.options.properties ?? [])
  }));
  await target.applyDamage(damages, { isDelta: true, origin: message });
  await __e2e.until(() => target.system.attributes.hp.value !== before, { timeoutMs: 4000 }).catch(() => {});
  return { before, after: target.system.attributes.hp.value, rolled: damages.reduce((s, d) => s + d.value, 0) };
}

export default {
  name: "woda",
  clients: ["gm", "Gracz 1"],

  async run(t) {
    const p1 = t.client("Gracz 1");
    await t.waitFor(p1, () => Boolean(game.user.character && canvas.tokens?.placeables.some(tk => tk.isOwner)),
      { message: "the player's client to see the fixture" });

    let s = null;
    await t.step("GM: a deep, fast Region `woda` and a combat with someone else on turn", async () => {
      s = await t.gm.eval(przygotuj);
      t.equal(s.registered, true, "behavior type registered");
      t.equal(s.typ, "neuroshima-2026-overrides.woda", "Region behavior");
      t.assert(s.current && s.current !== "PC Gracz 1", "someone else on turn", s);
    });

    let wejscie = null;
    await t.step("Gracz 1 walks into deep water → the GM's whispered „entering in gear” card", async () => {
      const since = await t.gm.eval(() => game.messages.size);
      const r = await p1.eval(idz, { cx: 7, cy: s.pcCell.y });
      t.equal(r.woda, true, "the token is in the water");
      wejscie = await t.waitFor(t.gm, karta, { args: [{ flag: "wodaKarta", rodzaj: "wejscie", since }], message: "the entry card" });
      t.equal(wejscie.st, 10, "ST 10 (s. 255)");
      t.equal(JSON.stringify(wejscie.buttons), JSON.stringify(["zadaj"]), "GM button only");
    });

    let test = null;
    await t.step("GM asks for the test; the player fails ST 10 → Tonie (Szybkość 0) and Pod wodą with breath held", async () => {
      const since = await t.gm.eval(() => game.messages.size);
      t.equal(await t.gm.eval(klik, { id: wejscie.id, selector: 'button[data-neuro-woda="zadaj"]' }), true, "GM clicked");
      test = await t.waitFor(p1, karta, { args: [{ flag: "wodaKarta", rodzaj: "test", since }], message: "the test card on the player" });
      t.equal(test.st, 10, "ST 10");
      const r = await p1.eval(rzut, { id: test.id, face: 2 });
      t.equal(r.clicked, true, "player clicked the roll button");
      t.assert(r.total !== null && r.total < 10, "the forced roll did not fail", r);
      t.equal(r.tonie, true, "Tonie");
      t.equal(r.podWoda, true, "Pod wodą");
      t.equal(r.walk, 0, "Szybkość 0");
      await t.waitFor(t.gm, () => game.actors.getName("PC Gracz 1").effects.some(e => e.statuses?.has("suffocation")) ? true : null,
        { message: "breath held (Uduszenie phase)" });
    });

    await t.step("start of Gracz 1's turn (active GM) → the ST 15 card; success → Tonie and Pod wodą off, breathing", async () => {
      const r = await t.gm.eval(turaGracza);
      t.equal(r.current, "PC Gracz 1", "on turn");
      const k = await t.waitFor(p1, karta, { args: [{ flag: "wodaKarta", rodzaj: "test", since: r.since }], message: "the turn-start card" });
      t.equal(k.st, 15, "ST 15 — rwąca rzeka");
      const w = await p1.eval(rzut, { id: k.id, face: 20 });
      t.assert(w.total >= 15, "the forced roll did not succeed", w);
      t.equal(w.tonie, false, "Tonie off");
      t.equal(w.podWoda, false, "surfaced");
      await t.waitFor(t.gm, () => !game.actors.getName("PC Gracz 1").effects.some(e => e.statuses?.has("suffocation")) ? true : null,
        { message: "breathing again" });
      await t.quiet();
    });

    await t.step("diving on purpose, a B 92 shot from under water: Utrudnienie badge; the tray applies half", async () => {
      const r = await p1.eval(strzalSpodWody, { targetName: "CYWIL" });
      t.assert(r.utrudnienia.includes("podWodaPalna"), "no underwater Utrudnienie", r);
      t.assert(r.uwagi.includes("podWodaPalnaZasieg"), "no 30 cm note", r);
      t.assert(r.damageMessage, "no damage card", r);
      const d = await t.gm.eval(tacka, { messageId: r.damageMessage, targetUuid: r.targetUuid });
      t.equal(d.before - d.after, Math.trunc(d.rolled / 2), "half damage, rounded down (s. 255)");
      await t.quiet();
    });

    await t.step("a target standing in shallow water gets Osłona ½ by default in the attack window (s. 256)", async () => {
      const r = await t.gm.eval(brod, { name: "CYWIL" });
      t.equal(r.stoi, "half", "standing in shallow water");
      t.equal(r.lezy, null, "prone — no water cover default");
    });

    await t.step("walking out of the water clears Pod wodą and the held breath", async () => {
      const r = await p1.eval(idz, { cx: 4, cy: s.pcCell.y });
      t.equal(r.woda, false, "out of the water");
      await t.waitFor(p1, () => {
        const a = game.user.character;
        return !a.statuses.has("podWoda") && !a.effects.some(e => e.statuses?.has("suffocation")) ? true : null;
      }, { message: "Pod wodą and Uduszenie cleared" });
    });

    await t.step("a climb move on the player's turn: one climbing card per turn (ST 10 / 15)", async () => {
      const since = await t.gm.eval(() => game.messages.size);
      await p1.eval(idz, { cx: 4, cy: s.pcCell.y - 1, action: "climb" });
      const k = await t.waitFor(t.gm, karta, { args: [{ flag: "wspinaczkaKarta", since }], message: "the climbing card" });
      t.equal(JSON.stringify(k.buttons), JSON.stringify(["10", "15"]), "ST buttons");
      await p1.eval(idz, { cx: 4, cy: s.pcCell.y - 2, action: "climb" });
      const ile = await t.gm.eval(({ since }) => game.messages.contents.slice(since)
        .filter(m => m.flags?.["neuroshima-2026-overrides"]?.wspinaczkaKarta).length, { since });
      t.equal(ile, 1, "one card per turn");
    });
  }
};
