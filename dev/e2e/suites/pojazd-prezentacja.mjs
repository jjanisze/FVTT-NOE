/** Mixed vehicle: an exposed hatch occupant above the roof and four concealed cabin occupants. */

async function prepare() {
  const M = "neuroshima-2026-overrides", P = game.neuroshima.pojazdy;
  const { KATALOG_POJAZDOW } = await import("/modules/" + M + "/scripts/config/vehicles-data.mjs");
  const actor = await P.utworzZKatalogu("hammer", { nazwa: "Hammer prezentacja e2e" });
  await actor.update({
    "prototypeToken.actorLink": true,
    "prototypeToken.texture.src": "modules/" + M + "/tokens/pojazdy/hammer.webp",
    ["ownership." + game.users.getName("Gracz 2").id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER,
    ["flags." + M + ".pojazd.strefy"]: KATALOG_POJAZDOW.hammer.strefyGrafiki,
    ["flags." + M + ".pojazd.grafika"]: {
      nadwozie: "modules/" + M + "/tokens/pojazdy/hammer.webp",
      wnetrze: "modules/" + M + "/tokens/pojazdy/wnetrza/hammer.webp"
    }
  });
  const td = await actor.getTokenDocument({ x: 500, y: 1000, rotation: 0 });
  const [vehicle] = await canvas.scene.createEmbeddedDocuments("Token", [td.toObject()]);
  const seats = P.miejscaPojazdu(actor), driver = canvas.scene.tokens.find(t => t.name === "PC Gracz 1");
  await P.posadz(vehicle, driver, seats[0].id);
  const crew = [driver.id];
  for (let i = 1; i < seats.length; i++) {
    const name = i === 4 ? "Jawny strzelec włazu" : "Zakryty pasażer " + i;
    const src = i === 4 ? "modules/" + M + "/tokens/gangus-kapo.webp" : "systems/dnd5e/tokens/humanoid/Guard.webp";
    const person = await Actor.implementation.create({ name, type: "character", img: src,
      system: { attributes: { hp: { value: 10, max: 10 } } },
      prototypeToken: { name, actorLink: true, width: 1, height: 1, texture: { src },
        sight: { enabled: false }, ring: { enabled: false }, displayName: 0 } });
    const data = (await person.getTokenDocument({ x: 800 + i * 100, y: 1500 })).toObject();
    const [doc] = await canvas.scene.createEmbeddedDocuments("Token", [data]);
    await P.posadz(vehicle, doc, seats[i].id);
    crew.push(doc.id);
  }
  canvas.tokens.releaseAll();
  return { vehicle: vehicle.id, crew, driver: driver.id, gunner: crew[4], cabinRider: crew[1],
    cabinSeat: seats[1].id, hatch: seats[4].id,
    originalGunnerSort: canvas.scene.tokens.get(crew[4]).getFlag(M, "jazda").sort };
}

function state(s) {
  const v = canvas.scene.tokens.get(s.vehicle), t = v.object, P = game.neuroshima.pojazdy;
  const art = v.actor.flags["neuroshima-2026-overrides"].pojazd.grafika;
  return { xray: P.przeswietlany(v), roof: t.mesh.texture === t.texture,
    interior: t.mesh.texture.baseTexture === foundry.canvas.getTexture(art.wnetrze)?.baseTexture,
    dots: t.neuroKropki?.children.length ?? 0, dotsVisible: !!t.neuroKropki?.visible,
    owner: v.actor.isOwner, alpha: t.mesh.alpha,
    crew: s.crew.map(id => { const d = canvas.scene.tokens.get(id), o = d.object;
      return { id, visible: o.visible, nativeVisible: o.isVisible, hidden: d.hidden,
        sort: d.sort, renderSort: o.mesh.sort, above: o.mesh.sort > t.mesh.sort, width: d.width }; }) };
}

async function pointer(client, s, over, id = s.vehicle) {
  await client.front(0);
  const p = await client.eval(async id => {
    const doc = canvas.scene.tokens.get(id), c = doc.getCenterPoint();
    canvas.pan({ x: c.x, y: c.y, scale: 2.2 });
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const at = canvas.stage.toGlobal(new PIXI.Point(c.x, c.y));
    return { x: at.x, y: at.y };
  }, id);
  await client.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
  if (over) await client.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...p });
  return p;
}

async function closeWindows() {
  for (const app of [...foundry.applications.instances.values()]) {
    if (app.id?.startsWith("neuro-miejsca-") || app.document?.type === "vehicle") await app.close();
  }
}

async function seatWindow(s) {
  await game.neuroshima.pojazdy.otworzMiejsca(canvas.scene.tokens.get(s.vehicle));
  const root = document.querySelector(".neuro-okno-miejsc");
  return { images: root.querySelectorAll(".neuro-miejsce img").length,
    hatch: root.querySelector(`[data-miejsce="${s.hatch}"]`)?.dataset.tooltip ?? "",
    cabin: root.querySelector(`[data-miejsce="${s.cabinSeat}"]`)?.dataset.tooltip ?? "" };
}

export default {
  name: "pojazd-prezentacja",
  clients: ["gm", "Gracz 1", "Gracz 2"],
  async run(t) {
    const s = await t.gm.eval(prepare), p1 = t.client("Gracz 1"), observer = t.client("Gracz 2");
    await t.step("Observer sees the hatch figure above the closed roof, four dots and no cabin figures", async () => {
      await pointer(observer, s, false);
      await t.waitFor(observer, s => {
        const P = game.neuroshima.pojazdy, v = canvas.scene.tokens.get(s.vehicle);
        return !P.przeswietlany(v) && canvas.tokens.get(s.gunner)?.visible
          && s.crew.slice(0, 4).every(id => !canvas.tokens.get(id)?.visible)
          && v.object.neuroKropki?.children.length === 4;
      }, { args: [s], message: "one exposed figure and four concealed seats" });
      const a = await observer.eval(state, s);
      t.assert(a.roof && !a.owner && a.crew[4].above, "observer keeps roof; gunner is above without ownership");
      const ui = await observer.eval(seatWindow, s);
      t.equal(ui.images, 1, "only exposed seat has a portrait");
      t.assert(ui.hatch.includes("Jawny strzelec"), "exposed identity is available");
      t.assert(!ui.cabin.includes("Zakryty pasażer"), "cabin identity remains concealed");
      await observer.eval(closeWindows);
      const list = await observer.eval(async s => {
        const app = canvas.scene.tokens.get(s.vehicle).actor.sheet;
        await app.render({ force: true });
        return [...app.element.querySelectorAll(".neuro-pojazd-kto")].map(e => e.innerText).join(" | ");
      }, s);
      t.assert(list.includes("Jawny strzelec") && !list.includes("Zakryty pasażer"), "crew list uses the same per-seat identity rule");
      await observer.eval(closeWindows);
      await t.screenshot("Gracz 2", "hatch figure over closed roof");
    });
    await t.step("The exposed figure accepts ordinary targeting; Alt-click selects the vehicle", async () => {
      await pointer(observer, s, true, s.gunner);
      await t.waitFor(observer, id => canvas.tokens.get(id)?.hover, { args: [s.gunner], message: "hover exposed gunner" });
      await observer.pressKey("KeyT");
      await t.waitFor(observer, id => game.user.targets.has(canvas.tokens.get(id)), { args: [s.gunner], message: "normal T targeting" });
      const at = await pointer(t.gm, s, true, s.gunner);
      await t.gm.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...at, modifiers: 1 });
      await t.gm.send("Input.dispatchMouseEvent", { type: "mousePressed", ...at, button: "left", buttons: 1, clickCount: 1, modifiers: 1 });
      await t.gm.send("Input.dispatchMouseEvent", { type: "mouseReleased", ...at, button: "left", buttons: 0, clickCount: 1, modifiers: 1 });
      await t.waitFor(t.gm, id => canvas.tokens.get(id).controlled, { args: [s.vehicle], message: "Alt selects carrier" });
      await t.gm.eval(() => canvas.tokens.releaseAll());
    });
    await t.step("GM and driver can reveal all five; observer still sees only the exposed gunner", async () => {
      for (const client of [t.gm, p1]) {
        await pointer(client, s, true);
        await t.waitFor(client, s => {
          const v = canvas.scene.tokens.get(s.vehicle), P = game.neuroshima.pojazdy;
          return P.przeswietlany(v) && !v.object.neuroKropki.visible && s.crew.every(id => canvas.tokens.get(id).visible);
        }, { args: [s], message: "authorised interior and all occupants" });
        const a = await client.eval(state, s);
        t.assert(a.interior && a.alpha === 1, "matched interior stays opaque");
      }
      await t.screenshot("gm", "all occupants in open interior");
      const a = await observer.eval(state, s);
      t.assert(a.roof && a.crew[4].visible && a.crew.slice(0, 4).every(c => !c.visible), "other clients keep their own view");
      await pointer(t.gm, s, false); await pointer(p1, s, false);
    });
    await t.step("Carrier sorting, movement and rotation keep the exposed figure above the roof and on its seat", async () => {
      const before = (await observer.eval(state, s)).crew[4].sort;
      await t.gm.eval(async s => {
        const v = canvas.scene.tokens.get(s.vehicle);
        await v.update({ sort: 100 });
        await canvas.scene.moveTokens({ [v.id]: { destination: { x: 900, y: 1100, rotation: 90, action: "displace" } } },
          { animate: false, showRuler: false, method: "api" });
      }, s);
      await t.waitFor(observer, s => {
        const P = game.neuroshima.pojazdy, v = canvas.scene.tokens.get(s.vehicle), g = canvas.scene.tokens.get(s.gunner);
        const m = P.miejsceOId(v.actor, s.hatch), expected = P.geometria.srodekMiejsca(v.getCenterPoint(), v.rotation, m, v.parent.grid.size);
        const actual = g.getCenterPoint();
        return v.width === 3 && v.height === 1.5 && Math.hypot(expected.x - actual.x, expected.y - actual.y) < 2
          && g.object.mesh.sort > v.object.mesh.sort && g.object.visible;
      }, { args: [s], message: "turned vehicle and relative rendering order" });
      t.equal((await observer.eval(state, s)).crew[4].sort, before, "relative display order does not rewrite rider sort");
      await pointer(observer, s, true, s.gunner);
      t.assert((await observer.eval(state, s)).crew[4].above, "hover refresh preserves relative order");
      await t.screenshot("Gracz 2", "exposed figure follows turned vehicle");
    });
    await t.step("Native hidden still hides the exposed figure and its seat portrait from outsiders", async () => {
      await t.gm.eval(async id => { await canvas.scene.tokens.get(id).update({ hidden: true }); }, s.gunner);
      await t.waitFor(observer, id => !canvas.tokens.get(id).isVisible && !canvas.tokens.get(id).visible,
        { args: [s.gunner], message: "native hidden respected" });
      t.equal((await observer.eval(seatWindow, s)).images, 0, "hidden exposed figure does not leak its portrait");
      await observer.eval(closeWindows);
      await t.gm.eval(async id => { await canvas.scene.tokens.get(id).update({ hidden: false }); }, s.gunner);
      await t.waitFor(observer, id => canvas.tokens.get(id).visible, { args: [s.gunner], message: "exposed figure restored" });
    });
    await t.step("Changing between hatch and cabin updates the figure and dot; exiting restores normal size and order", async () => {
      await t.gm.eval(async s => {
        const P = game.neuroshima.pojazdy, v = canvas.scene.tokens.get(s.vehicle);
        await P.wysadz(canvas.scene.tokens.get(s.cabinRider));
        await P.posadz(v, canvas.scene.tokens.get(s.gunner), s.cabinSeat);
      }, s);
      await t.waitFor(observer, s => !canvas.tokens.get(s.gunner).visible
        && canvas.tokens.get(s.vehicle).neuroKropki.children.length === 4,
        { args: [s], message: "hatch occupant becomes concealed in cabin" });
      await t.gm.eval(async s => { await game.neuroshima.pojazdy.posadz(canvas.scene.tokens.get(s.vehicle), canvas.scene.tokens.get(s.gunner), s.hatch); }, s);
      await t.waitFor(observer, s => canvas.tokens.get(s.gunner).visible
        && canvas.tokens.get(s.vehicle).neuroKropki.children.length === 3,
        { args: [s], message: "return to exposed hatch removes its dot" });
      await t.gm.eval(async id => { await game.neuroshima.pojazdy.wysadz(canvas.scene.tokens.get(id)); }, s.gunner);
      await t.waitFor(observer, s => { const d = canvas.scene.tokens.get(s.gunner);
        return d.width === 1 && !game.neuroshima.pojazdy.pojazdJadacego(d) && d.object.visible; },
        { args: [s], message: "disembarked normal token" });
      t.equal(await observer.eval(id => canvas.scene.tokens.get(id).sort, s.gunner), s.originalGunnerSort, "exit restores original sort");
    });
  }
};
