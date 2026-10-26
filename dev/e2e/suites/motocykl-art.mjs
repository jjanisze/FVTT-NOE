/** Open motorcycle seats: both figures visible, no dots or hover fading. */
async function prepare() {
  const M = "neuroshima-2026-overrides", P = game.neuroshima.pojazdy;
  const { KATALOG_POJAZDOW } = await import("/modules/" + M + "/scripts/config/vehicles-data.mjs");
  const a = await P.utworzZKatalogu("motocykl", { nazwa: "Motocykl grafika e2e" });
  await a.update({ "prototypeToken.actorLink": true,
    "prototypeToken.texture.src": "modules/" + M + "/tokens/pojazdy/motocykl.webp",
    ["flags." + M + ".pojazd.strefy"]: KATALOG_POJAZDOW.motocykl.strefyGrafiki });
  const [vehicle] = await canvas.scene.createEmbeddedDocuments("Token", [(await a.getTokenDocument({ x: 500, y: 1000 })).toObject()]);
  const seats = P.miejscaPojazdu(a), riders = [];
  const driver = canvas.scene.tokens.find(t => t.name === "PC Gracz 1");
  riders.push(driver);
  const actor = await Actor.implementation.create({ name: "Pasażer motocykla", type: "character",
    prototypeToken: { actorLink: true, width: 1, height: 1, displayName: 0, ring: { enabled: false },
      sight: { enabled: false }, texture: { src: "systems/dnd5e/tokens/humanoid/Guard.webp" } } });
  const [passenger] = await canvas.scene.createEmbeddedDocuments("Token", [(await actor.getTokenDocument({ x: 800, y: 1400 })).toObject()]);
  riders.push(passenger);
  for (const [i, d] of riders.entries()) await P.posadz(vehicle, d, seats[i].id);
  canvas.tokens.releaseAll();
  return { vehicle: vehicle.id, riders: riders.map(t => t.id) };
}

function visible(s) {
  const v = canvas.tokens.get(s.vehicle), P = game.neuroshima.pojazdy;
  return !!v && !v.neuroKropki?.visible && !v.neuroKropki?.children.length
    && !P.przeswietlany(v.document) && v.mesh.alpha === 1
    && s.riders.every(id => { const t = canvas.tokens.get(id);
      return t?.visible && t.mesh.sort > v.mesh.sort; });
}

async function pointer(client, id, over) {
  await client.front(0);
  const point = await client.eval(async id => {
    const p = canvas.scene.tokens.get(id).getCenterPoint();
    canvas.pan({ ...p, scale: 2.5 });
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const at = canvas.stage.toGlobal(new PIXI.Point(p.x, p.y));
    return { x: at.x, y: at.y };
  }, id);
  await client.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
  if (over) await client.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...point });
}

export default {
  name: "motocykl-art", clients: ["gm", "Gracz 1", "Gracz 2"],
  async run(t) {
    const s = await t.gm.eval(prepare), observer = t.client("Gracz 2");
    await t.step("Both motorcycle riders are visible to outsiders and hovering never fades the bike", async () => {
      for (const client of [observer, t.gm, t.client("Gracz 1")]) {
        await pointer(client, s.vehicle, true);
        await t.waitFor(client, visible, { args: [s], message: "two exposed riders and opaque motorcycle" });
        await pointer(client, s.vehicle, false);
        t.assert(await client.eval(visible, s), "pointer leave preserves figures and full opacity");
      }
      await t.screenshot("Gracz 2", "motorcycle and two visible riders");
    });
    await t.step("Both figures follow a rotated, moved motorcycle at the painted saddle positions", async () => {
      await t.gm.eval(async s => {
        const v = canvas.scene.tokens.get(s.vehicle);
        await canvas.scene.moveTokens({ [v.id]: { destination: { x: 1000, y: 1100, rotation: 90, action: "displace" } } },
          { animate: false, showRuler: false, method: "api" });
      }, s);
      await t.waitFor(observer, s => {
        const v = canvas.scene.tokens.get(s.vehicle), P = game.neuroshima.pojazdy;
        return v.width === 1.5 && v.height === 0.5 && s.riders.every(id => {
          const d = canvas.scene.tokens.get(id), m = P.miejsceOId(v.actor, d.flags["neuroshima-2026-overrides"].jazda.miejsce);
          const p = P.geometria.srodekMiejsca(v.getCenterPoint(), v.rotation, m, v.parent.grid.size), a = d.getCenterPoint();
          return Math.hypot(p.x - a.x, p.y - a.y) < 2 && d.object.visible;
        });
      }, { args: [s], message: "both saddle anchors rotate with motorcycle" });
      await pointer(observer, s.vehicle, false);
      t.assert(await observer.eval(visible, s), "no hidden figures or dots after rotation");
      await t.screenshot("Gracz 2", "rotated motorcycle and saddle anchors");
    });
    await t.step("Leaving an open motorcycle seat restores the full token footprint", async () => {
      await t.gm.eval(async s => { await game.neuroshima.pojazdy.wysadz(canvas.scene.tokens.get(s.riders[1])); }, s);
      await t.waitFor(observer, s => {
        const p = canvas.scene.tokens.get(s.riders[1]), P = game.neuroshima.pojazdy;
        return p.width === 1 && p.height === 1 && p.object.visible && !P.pojazdJadacego(p)
          && P.jadacyPojazdu(canvas.scene.tokens.get(s.vehicle)).length === 1;
      }, { args: [s], message: "passenger disembarked; driver remains visible" });
    });
  }
};
