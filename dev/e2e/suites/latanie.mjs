/**
 * Suite — latanie (PLAN_m6_drobne_zasady.md §5.5, E5, U13): NOE flying on dnd5e 6's own falling flow. A flier
 * (fly 18, no walk) takes off to 9 on the skirmish scene, then:
 *
 *  - Obezwładnienie alone keeps it aloft (stock dnd5e would mark it falling);
 *  - Powalenie marks it falling and the GM's plummet lowers it to the floor with no damage card;
 *  - Pochwycenie (Szybkość 0) and Nieprzytomność drop it with dnd5e's fall damage card, the faller on the tray.
 *
 * GM-only: the falling status is updated by the designated owner, and only the GM clicks the status to plummet.
 */

/* Functions below run in the browser (serialised): no closures over this file. */

/** GM: a flier on the scene, flown up to `elevation` (a real move — dnd5e tracks falling for the last moved token). */
async function wzlot({ name, elevation }) {
  const scene = canvas.scene;
  const [actor] = await Actor.implementation.create([{
    name, type: "npc",
    system: { attributes: { movement: { speeds: { walk: 0, fly: 18 } }, hp: { value: 40, max: 40 } } },
    prototypeToken: { actorLink: true }
  }]);
  const g = scene.grid.size;
  const slot = scene.tokens.size;
  const td = await actor.getTokenDocument({ x: (4 + 2 * slot) * g, y: 15 * g });
  const [tok] = await scene.createEmbeddedDocuments("Token", [td.toObject()]);
  await tok.move({ x: tok.x + g, y: tok.y, elevation, action: "fly" });
  await __e2e.until(() => tok.elevation === elevation && actor.getFlag("dnd5e", "lastMovedToken") === tok.uuid,
    { timeoutMs: 8000, message: "the flier aloft and tracked" });
  await __e2e.quiet();
  return { uuid: tok.uuid, actorId: actor.id, elevation: tok.elevation, falling: actor.statuses.has("falling") };
}

/** GM: statuses on; settle; whether dnd5e marked it falling. */
async function stany({ uuid, on }) {
  const tok = fromUuidSync(uuid);
  for (const s of on) await tok.actor.toggleStatusEffect(s, { active: true });
  await __e2e.quiet();
  await new Promise(r => setTimeout(r, 300));
  return { falling: tok.actor.statuses.has("falling"), stan: game.neuroshima.latanie.stanLotnika(tok.actor) };
}

/** GM: click-equivalent of the falling status icon (dnd5e `Token5e#_drawEffect` → `plummet`). */
async function plummet({ uuid }) {
  const tok = fromUuidSync(uuid);
  const since = game.messages.size;
  const hp = tok.actor.system.attributes.hp.value;
  await tok.plummet();
  await __e2e.until(() => tok.elevation === 0, { timeoutMs: 6000, message: "the token on the floor" }).catch(() => {});
  await __e2e.quiet();
  const card = game.messages.contents.slice(since).find(m => m.getFlag("dnd5e", "context")?.fall);
  return {
    elevation: tok.elevation, card: !!card, onTray: !!card?.system?.targets?.some?.(t => t.token === tok.uuid),
    hpChanged: tok.actor.system.attributes.hp.value !== hp, falling: tok.actor.statuses.has("falling")
  };
}

export default {
  name: "latanie",
  clients: ["gm"],

  async run(t) {
    await t.step("Obezwładnienie alone keeps a flier aloft (NOE s. 253; stock would drop it)", async () => {
      const f = await t.gm.eval(wzlot, { name: "Lotnik Obezwładniony", elevation: 9 });
      t.equal(f.elevation, 9, "aloft");
      t.equal(f.falling, false, "not falling when flying");
      const r = await t.gm.eval(stany, { uuid: f.uuid, on: ["incapacitated"] });
      t.equal(r.stan.powod, null, "no reason to fall");
      t.equal(r.falling, false, "still aloft");
    });

    await t.step("Powalenie: falling, the GM's plummet lowers it with no damage card (U13)", async () => {
      const f = await t.gm.eval(wzlot, { name: "Lotnik Powalony", elevation: 9 });
      const r = await t.gm.eval(stany, { uuid: f.uuid, on: ["prone"] });
      t.equal(r.stan.powod, "powalony", "reason");
      t.equal(r.falling, true, "marked falling");
      const p = await t.gm.eval(plummet, { uuid: f.uuid });
      t.equal(p.elevation, 0, "on the floor");
      t.equal(p.card, false, "no fall damage card");
      t.equal(p.hpChanged, false, "no damage");
      t.equal(p.falling, false, "falling cleared on landing");
    });

    for (const [label, status, powod] of [["Pochwycenie (Szybkość 0)", "grappled", "szybkosc0"], ["Nieprzytomność", "unconscious", "nieprzytomny"]]) {
      await t.step(`${label}: falling, plummet posts dnd5e's fall damage card with the faller on the tray`, async () => {
        const f = await t.gm.eval(wzlot, { name: `Lotnik ${status}`, elevation: 9 });
        const r = await t.gm.eval(stany, { uuid: f.uuid, on: [status] });
        t.equal(r.stan.powod, powod, "reason");
        t.equal(r.falling, true, "marked falling");
        const p = await t.gm.eval(plummet, { uuid: f.uuid });
        t.equal(p.elevation, 0, "on the floor");
        t.equal(p.card, true, "fall damage card");
        t.equal(p.onTray, true, "the faller on the tray");
      });
    }
  }
};
