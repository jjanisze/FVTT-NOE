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

/**
 * S1 (D42): on every chassis the rider's mesh equals the same figure's mesh beside the vehicle — after boarding, a
 * move with a turn and a seat change — and the creature multiplier scales both alike. Texture scale is never written.
 */
async function riderScale() {
  const M = "neuroshima-2026-overrides", P = game.neuroshima.pojazdy;
  const { KATALOG_POJAZDOW } = await import("/modules/" + M + "/scripts/config/vehicles-data.mjs");
  const src = "systems/dnd5e/tokens/humanoid/Guard.webp";
  const person = await Actor.implementation.create({ name: "Skala jadącego S1", type: "character", img: src,
    system: { attributes: { hp: { value: 10, max: 10 } } },
    prototypeToken: { width: 1, height: 1, texture: { src, scaleX: 0.8, scaleY: 0.8 },
      ring: { enabled: false }, sight: { enabled: false }, displayName: 0 } });
  const r = canvas.dimensions.sceneRect, g = canvas.grid.size;
  const at = { x: Math.round(r.x + r.width / 2 - 2 * g), y: Math.round(r.y + r.height / 2) };
  const mesh = doc => ({ w: Math.round(doc.object?.mesh?.width ?? -1), h: Math.round(doc.object?.mesh?.height ?? -1) });
  const settle = async (rider, ref) => {
    for (let i = 0; i < 40; i++) {
      await new Promise(res => requestAnimationFrame(res));
      const a = mesh(rider), b = mesh(ref);
      if (a.w === b.w && a.h === b.h) break;
    }
    return { rider: mesh(rider), ref: mesh(ref), scale: rider.texture.scaleX };
  };
  const out = [];
  const [ref] = await canvas.scene.createEmbeddedDocuments("Token",
    [(await person.getTokenDocument({ x: at.x - 3 * g, y: at.y })).toObject()]);
  for (const id of Object.keys(KATALOG_POJAZDOW)) {
    const a = await P.utworzZKatalogu(id, { nazwa: "S1 " + id });
    const [v] = await canvas.scene.createEmbeddedDocuments("Token",
      [(await a.getTokenDocument({ x: at.x, y: at.y - g, rotation: 0 })).toObject()]);
    const [rider] = await canvas.scene.createEmbeddedDocuments("Token",
      [(await person.getTokenDocument({ x: at.x - 4.5 * g, y: at.y })).toObject()]);
    const seats = P.miejscaPojazdu(a);
    await P.posadz(v, rider, seats[0].id);
    const seated = await settle(rider, ref);
    await canvas.scene.moveTokens({ [v.id]: { destination: { x: at.x + g, y: at.y, rotation: 90, action: "displace" } } },
      { animate: false, showRuler: false, method: "api" });
    const turn = P.geometria.normalizujKat(90 + (rider.getFlag(M, "jazda")?.obrot ?? 0));
    await window.__e2e.until(() => Math.abs(rider._source.rotation - turn) < 1, { message: id + ": rider turned with the vehicle" });
    const turned = await settle(rider, ref);
    let changed = null;
    if (seats.length > 1) {
      await P.posadz(v, rider, seats.at(-1).id);
      changed = await settle(rider, ref);
    }
    out.push({ id, doc: rider.width, seated, turned, changed });
    // Vehicle and its rider deleted in one operation: nobody unseats the already-deleted rider.
    await canvas.scene.deleteEmbeddedDocuments("Token", [rider.id, v.id]);
    await a.delete();
  }
  // f = 0.7: both figures shrink alike; documents untouched.
  const moto = await P.utworzZKatalogu("motocykl", { nazwa: "S1 f" });
  const [v] = await canvas.scene.createEmbeddedDocuments("Token",
    [(await moto.getTokenDocument({ x: at.x, y: at.y })).toObject()]);
  const [rider] = await canvas.scene.createEmbeddedDocuments("Token",
    [(await person.getTokenDocument({ x: at.x - 4.5 * g, y: at.y })).toObject()]);
  await P.posadz(v, rider, P.miejscaPojazdu(v.actor)[0].id);
  const base = await settle(rider, ref);
  const f0 = game.settings.get(M, "skalaGrafikiIstot"), f1 = 0.6;
  await game.settings.set(M, "skalaGrafikiIstot", f1);
  for (let i = 0; i < 40 && mesh(ref).w === base.ref.w; i++) await new Promise(res => requestAnimationFrame(res));
  const small = await settle(rider, ref);
  await game.settings.set(M, "skalaGrafikiIstot", f0);
  const f = { base, small, f0, f1, domyslne: game.settings.settings.get(M + ".skalaGrafikiIstot").default, refDoc: ref.width, vehicle: Math.round(v.object.mesh.width), riderDoc: rider.width };
  const vehicleSame = await (async () => {
    for (let i = 0; i < 40 && mesh(ref).w !== base.ref.w; i++) await new Promise(res => requestAnimationFrame(res));
    return Math.round(v.object.mesh.width) === f.vehicle;
  })();
  await canvas.scene.deleteEmbeddedDocuments("Token", [rider.id, v.id, ref.id]);
  await moto.delete();
  await person.delete();
  return { out, f, vehicleSame };
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
        return v.width === 3.3 && v.height === 1.65 && Math.hypot(expected.x - actual.x, expected.y - actual.y) < 2
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
    await t.step("K2: the hatch gunner holds the mounted Browning with both hands; it goes back to the Hammer on a seat change", async () => {
      const r = await t.gm.eval(async s => {
        const M = "neuroshima-2026-overrides", P = game.neuroshima.pojazdy;
        const { freeHands, heldItems } = await import("/modules/" + M + "/scripts/actors/doll.mjs");
        const v = canvas.scene.tokens.get(s.vehicle), g = canvas.scene.tokens.get(s.gunner);
        const pack = game.packs.get(M + ".bron");
        const src = (await pack.getDocuments()).find(i => /browning/i.test(i.name));
        const [b] = await v.actor.createEmbeddedDocuments("Item", [game.items.fromCompendium(src)]);
        await P.posadz(v, g, s.hatch);
        await P.zamontujOdReki(v, b, s.hatch);
        await window.__e2e.until(() => g.actor.items.some(i => i.getFlag(M, "zamontowana")), { message: "weapon with the gunner" });
        const mg = g.actor.items.find(i => i.getFlag(M, "zamontowana"));
        const naStanowisku = { equipped: mg.system.equipped, free: freeHands(g.actor),
          held: heldItems(g.actor).map(h => h.item?.name ?? h.occupant?.kind ?? null) };
        await P.posadz(v, g, s.cabinSeat);
        await window.__e2e.until(() => !g.actor.items.some(i => i.getFlag(M, "zamontowana")), { message: "weapon back on the vehicle" });
        const wKabinie = { free: freeHands(g.actor), naPojezdzie: v.actor.items.some(i => /browning/i.test(i.name)) };
        await P.wysadz(g);
        return { naStanowisku, wKabinie };
      }, s);
      t.assert(r.naStanowisku.equipped, "mounted weapon stays equipped on the gunner", r.naStanowisku);
      t.equal(r.naStanowisku.free, 0, "both hands on the gun");
      t.assert(r.naStanowisku.held.includes("zamontowana"), "second hand shows the two-handed grip", r.naStanowisku.held);
      t.equal(r.wKabinie.free, 2, "hands free again in the cabin");
      t.assert(r.wKabinie.naPojezdzie, "Browning back in the Hammer");
    });
    await t.step("K3: mishap 5 blinds covered seats only; seat change, exit and repair reconcile; smoke region rides along", async () => {
      const r = await t.gm.eval(async s => {
        const M = "neuroshima-2026-overrides", P = game.neuroshima.pojazdy;
        const v = canvas.scene.tokens.get(s.vehicle), g = canvas.scene.tokens.get(s.gunner), d = canvas.scene.tokens.get(s.driver);
        const blind = doc => doc.actor.effects.some(e => e.flags?.[M]?.dymPojazdu === v.uuid && e.statuses.has("blinded"));
        const region = () => canvas.scene.regions.find(x => x.flags?.[M]?.dymAwarii === v.id);
        const wait = (fn, message) => window.__e2e.until(fn, { message });
        await P.posadz(v, g, s.hatch);
        await P.zastosujAwarie(v, 5);
        await wait(() => blind(d) && region(), "driver blinded, region");
        const start = { driver: blind(d), gunner: blind(g), attached: (region()?.attachment?.token?.id ?? region()?.attachment?.token) === v.id };
        await P.posadz(v, g, s.cabinSeat);
        await wait(() => blind(g), "gunner blinded in the cabin");
        await P.wysadz(g);
        await wait(() => !blind(g), "gunner out of the smoke");
        const e = v.actor.effects.find(x => x.flags?.[M]?.awariaPojazdu?.k20 === 5);
        await e.delete();
        await wait(() => !blind(d) && !region(), "repair clears it");
        return { start, cleared: true };
      }, s);
      t.assert(r.start.driver && !r.start.gunner, "cabin driver blinded, hatch gunner not", r.start);
      t.assert(r.start.attached, "smoke region attached to the vehicle token");
      t.assert(r.cleared, "seat change, exit and repair reconciled");
    });
    await t.step("S1: on all 14 chassis the rider is drawn as large as beside the vehicle; f scales both alike", async () => {
      const r = await t.gm.eval(riderScale);
      t.equal(r.out.length, 14, "fourteen chassis");
      for (const c of r.out) {
        const same = m => m && m.rider.w === m.ref.w && m.rider.h === m.ref.h && m.scale === 0.8;
        t.assert(same(c.seated), `${c.id}: seated rider = figure outside, texture scale 0.8 kept`, c.seated);
        t.assert(same(c.turned), `${c.id}: after a move with a 90° turn`, c.turned);
        if (c.changed) t.assert(same(c.changed), `${c.id}: after a seat change`, c.changed);
        t.equal(c.doc, 0.5, `${c.id}: the document stays half a vehicle square (click area, seat spacing)`);
      }
      const f = r.f;
      t.assert(f.small.rider.w === f.small.ref.w && Math.abs(f.small.ref.w - f.base.ref.w * f.f1 / f.f0) <= 1,
        "f 0.8 → 0.6: rider and outside figure shrink alike", f);
      t.equal(f.domyslne, 0.8, "registered default f = 0.8 (D42, D45)");
      t.equal(f.refDoc, 1, "outside figure document unchanged by f");
      t.assert(r.vehicleSame, "vehicles keep their true scale under f");
    });
  }
};
