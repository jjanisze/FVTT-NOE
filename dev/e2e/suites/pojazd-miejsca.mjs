/** Seat-window regression: live GM token selection, PC/NPC boarding, ambiguity and player ownership. */

async function prepare() {
  const P = game.neuroshima.pojazdy;
  const actor = await P.utworzZKatalogu("osobowka", { nazwa: "Miejsca e2e" });
  await actor.update({ "prototypeToken.actorLink": true });
  const td = await actor.getTokenDocument({ x: 500, y: 1100 });
  const [vehicle] = await canvas.scene.createEmbeddedDocuments("Token", [td.toObject()]);
  const pc = canvas.scene.tokens.find(t => t.name === "PC Gracz 1");
  const other = canvas.scene.tokens.find(t => t.name === "PC Gracz 2");
  const npc = canvas.scene.tokens.find(t => /CYWIL/i.test(t.name));
  canvas.tokens.releaseAll();
  return { vehicle: vehicle.id, pc: pc.id, other: other.id, npc: npc.id,
    driver: P.miejscaPojazdu(actor).find(m => m.kierowca).id,
    passenger: P.miejscaPojazdu(actor).find(m => !m.kierowca).id };
}

async function open({ vehicle }) {
  const app = await game.neuroshima.pojazdy.otworzMiejsca(canvas.scene.tokens.get(vehicle));
  app.setPosition({ left: 60, top: 90 });
  return app.jadacy?.id ?? null;
}

function state() {
  const app = [...foundry.applications.instances.values()].find(a => a.rendered && a.id?.startsWith("neuro-miejsca-"));
  return { rider: app?.jadacy?.id ?? null, text: app?.element.innerText ?? "" };
}

async function select(id) {
  canvas.tokens.get(id).control();
  await window.__e2e.until(() => document.querySelector(".neuro-okno-miejsc")?.innerText.includes(canvas.scene.tokens.get(id).name));
}

async function clickSeat(id) {
  document.querySelector(`.neuro-okno-miejsc [data-miejsce="${id}"]`).click();
  await window.__e2e.quiet();
}

async function close() {
  for (const app of [...foundry.applications.instances.values()]) {
    if (app.id?.startsWith("neuro-miejsca-")) await app.close();
  }
}

export default {
  name: "pojazd-miejsca",
  clients: ["gm", "Gracz 1", "Gracz 2"],
  async run(t) {
    const ids = await t.gm.eval(prepare);
    const p1 = t.client("Gracz 1");
    await t.step("Opening without a character then selecting one updates the existing window", async () => {
      t.equal(await t.gm.eval(open, ids), null, "GM without a character starts with no rider");
      const point = await t.gm.eval(id => {
        const c = canvas.scene.tokens.get(id).getCenterPoint();
        return { x: c.x, y: c.y };
      }, ids.pc);
      await t.gm.clickCanvas(point);
      await t.waitFor(t.gm, id => {
        const app = [...foundry.applications.instances.values()].find(a => a.rendered && a.id?.startsWith("neuro-miejsca-"));
        return app?.jadacy?.id === id;
      }, { args: [ids.pc], message: "already-open window follows selected character" });
      const s = await t.gm.eval(state);
      t.assert(s.text.includes("PC Gracz 1"), "window identifies the selected boarding character");
      await t.gm.eval(id => canvas.tokens.get(id).setTarget(true, { releaseOthers: true }), ids.npc);
      await t.screenshot("gm", "GM character selected after opening seats");
      await t.gm.eval(clickSeat, ids.driver);
      await t.waitFor(t.gm, ({ pc, vehicle, driver }) => {
        const doc = canvas.scene.tokens.get(pc);
        return game.neuroshima.pojazdy.pojazdJadacego(doc)?.id === vehicle
          && doc.getFlag("neuroshima-2026-overrides", "jazda")?.miejsce === driver;
      }, { args: [ids], message: "GM seats selected PC as driver" });
      t.equal(await t.gm.eval(id => game.neuroshima.pojazdy.pojazdJadacego(canvas.scene.tokens.get(id))?.id ?? null, ids.npc),
        null, "targeted NPC stays outside while selected PC boards");
    });
    await t.step("Vehicle HUD can open first; GM selects, seats, moves and disembarks an NPC", async () => {
      await t.gm.eval(async ({ vehicle }) => {
        canvas.tokens.get(vehicle).control();
        await canvas.hud.token.bind(canvas.tokens.get(vehicle));
        const button = [...canvas.hud.token.element.querySelectorAll(".neuro-pojazd-hud")]
          .find(b => b.dataset.tooltip.startsWith("Miejsca"));
        button.click();
        await window.__e2e.until(() => document.querySelector(".neuro-okno-miejsc"));
      }, ids);
      const s = await t.gm.eval(state);
      t.equal(s.rider, null, "vehicle is never chosen as its own rider");
      await t.gm.eval(select, ids.npc);
      await t.screenshot("gm", "GM selects NPC with vehicle seat window open");
      await t.gm.eval(clickSeat, ids.passenger);
      await t.waitFor(t.gm, ({ npc, vehicle }) => game.neuroshima.pojazdy.pojazdJadacego(canvas.scene.tokens.get(npc))?.id === vehicle,
        { args: [ids], message: "NPC seated through GM selection" });
      await t.gm.eval(open, ids);
      t.equal((await t.gm.eval(state)).rider, ids.npc, "selection before opening is respected");
      const next = await t.gm.eval(({ vehicle, driver, passenger }) => game.neuroshima.pojazdy.miejscaPojazdu(canvas.scene.tokens.get(vehicle).actor)
        .find(m => m.id !== driver && m.id !== passenger).id, ids);
      await t.gm.eval(clickSeat, next);
      await t.waitFor(t.gm, ({ npc, next }) => canvas.scene.tokens.get(npc).getFlag("neuroshima-2026-overrides", "jazda")?.miejsce === next,
        { args: [{ ...ids, next }], message: "GM changes NPC seat" });
      await t.gm.eval(open, ids);
      await t.gm.eval(() => document.querySelector(".neuro-miejsca-wysiadz").click());
      await t.waitFor(t.gm, id => !game.neuroshima.pojazdy.pojazdJadacego(canvas.scene.tokens.get(id)),
        { args: [ids.npc], message: "GM disembarks NPC" });
    });
    await t.step("Changing and clearing selection updates the window; multiple characters require one choice", async () => {
      await t.gm.eval(open, ids);
      await t.gm.eval(select, ids.other);
      t.equal((await t.gm.eval(state)).rider, ids.other, "existing window switches to another character");
      await t.gm.eval(({ pc, npc }) => {
        canvas.tokens.get(pc).control();
        canvas.tokens.get(npc).control({ releaseOthers: false });
      }, ids);
      t.equal((await t.gm.eval(state)).rider, null, "existing window does not pick first of multiple characters");
      t.assert((await t.gm.eval(state)).text.includes("dokładnie jeden"), "ambiguity instruction is visible");
      await t.gm.eval(close);
      t.equal(await t.gm.eval(open, ids), null, "multiple characters require a choice");
      await t.gm.eval(close);
      await t.gm.eval(({ npc }) => {
        canvas.tokens.releaseAll();
        canvas.tokens.get(npc).setTarget(true, { releaseOthers: true });
      }, ids);
      t.equal(await t.gm.eval(open, ids), null, "combat target is not a boarding character");
      t.assert((await t.gm.eval(state)).text.includes("Celowanie"), "UI explains targeting");
      await t.gm.eval(select, ids.npc);
      await t.gm.eval(() => canvas.tokens.releaseAll());
      t.equal((await t.gm.eval(state)).rider, null, "clearing selection clears the existing window's rider");
      await t.gm.eval(close);
    });
    await t.step("Player character fallback and boarding through the GM relay still work", async () => {
      await t.gm.eval(async ({ pc }) => { await game.neuroshima.pojazdy.wysadz(canvas.scene.tokens.get(pc)); }, ids);
      await p1.eval(() => canvas.tokens.releaseAll());
      t.equal(await p1.eval(open, ids), ids.pc, "assigned character remains the player's default");
      const foreign = await p1.eval(id => canvas.tokens.get(id).control(), ids.other);
      t.equal(foreign, false, "player cannot select another player's character");
      t.equal((await p1.eval(state)).rider, ids.pc, "failed selection does not change boarding character");
      await p1.eval(clickSeat, ids.driver);
      await t.waitFor(p1, ({ pc, vehicle }) => {
        const P = game.neuroshima.pojazdy;
        return P.pojazdJadacego(canvas.scene.tokens.get(pc))?.id === vehicle && canvas.scene.tokens.get(vehicle).actor.isOwner;
      }, { args: [ids], message: "player seated and presence ownership granted" });
      await p1.eval(open, ids);
      await p1.eval(() => document.querySelector(".neuro-miejsca-wysiadz").click());
      await t.waitFor(p1, ({ pc, vehicle }) => !game.neuroshima.pojazdy.pojazdJadacego(canvas.scene.tokens.get(pc))
        && !canvas.scene.tokens.get(vehicle).actor.isOwner, { args: [ids], message: "player exit restores ownership" });
    });
    await t.step("Deleting the selected token clears the rider, and deleting the vehicle closes its window", async () => {
      await t.gm.eval(open, ids);
      await t.gm.eval(select, ids.npc);
      await t.gm.eval(async id => { await canvas.scene.tokens.get(id).delete(); }, ids.npc);
      await t.waitFor(t.gm, () => [...foundry.applications.instances.values()].some(a => a.rendered && a.id?.startsWith("neuro-miejsca-") && !a.jadacy),
        { message: "deleted rider cleared" });
      await t.gm.eval(async id => { await canvas.scene.tokens.get(id).delete(); }, ids.vehicle);
      await t.waitFor(t.gm, () => !document.querySelector(".neuro-okno-miejsc"), { message: "deleted vehicle window closed" });
    });
  }
};
