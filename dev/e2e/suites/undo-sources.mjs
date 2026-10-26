/** Native canvas undo must not undo a projection independently of its sheet/item source. */
async function prepare() {
  const M = "neuroshima-2026-overrides", P = game.neuroshima.pojazdy;
  const actor = await P.utworzZKatalogu("osobowka", { nazwa: "Undo source vehicle" });
  await actor.update({ "prototypeToken.actorLink": true, [`flags.${M}.fixture`]: "skirmish" });
  const td = await actor.getTokenDocument({ x: 400, y: 1100, rotation: 270 });
  const [vehicle] = await canvas.scene.createEmbeddedDocuments("Token", [td.toObject()]);
  const user = game.users.getName("Gracz 1");
  const carrier = await Actor.create({ name: "Undo device carrier", type: "npc",
    ownership: { [user.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER },
    flags: { [M]: { fixture: "skirmish" } }, prototypeToken: { actorLink: true } });
  const [token] = await canvas.scene.createEmbeddedDocuments("Token", [(await carrier.getTokenDocument({ x: 400, y: 1300 })).toObject()]);
  const { buildLatarkaItemData } = await import(`/modules/${M}/scripts/items/latarka.mjs`);
  const { buildGogleItemData } = await import(`/modules/${M}/scripts/items/gogle.mjs`);
  const data = [buildLatarkaItemData("dynamowa"), buildGogleItemData("noktowizor"), buildGogleItemData("termowizor")];
  for (const d of data) {
    d.system.equipped = true;
    if (d.flags[M].gogleWariant) Object.assign(d.flags[M], { gogleHasBaterie: true, gogleCharge: 100, gogleChargeMaxMin: 60 });
  }
  const [lamp, nvg, thermal] = await carrier.createEmbeddedDocuments("Item", data);
  await window.__e2e.quiet({ idleMs: 700 });
  return { vehicle: vehicle.id, token: token.id, actor: carrier.id, lamp: lamp.id, nvg: nvg.id, thermal: thermal.id };
}

async function state(ids) {
  await window.__e2e.quiet({ idleMs: 700 });
  const M = "neuroshima-2026-overrides", token = canvas.scene.tokens.get(ids.token);
  const companion = canvas.scene.lights.get(token.getFlag(M, "companionLightId"));
  return { history: canvas.tokens.history.length, lights: canvas.lighting.history.length,
    x: token._source.x, mode: token.sight.visionMode, range: token.sight.range,
    companion: companion ? { id: companion.id, x: companion._source.x, y: companion._source.y, rotation: companion.rotation } : null,
    center: token.getCenterPoint(token._source), light: token.light.dim };
}

export default {
  name: "undo-sources", clients: ["gm", "Gracz 1", "Gracz 2"],
  async run(t) {
    const ids = await t.gm.eval(prepare);
    await t.step("Vehicle copy/paste: one undo removes the copied vehicle and its linked crew", async () => {
      const r = await t.gm.eval(async ({ vehicle }) => {
        const P = game.neuroshima.pojazdy, scene = canvas.scene, v = scene.tokens.get(vehicle);
        const pc = scene.tokens.find(d => d.name === "PC Gracz 1");
        await P.posadz(v, pc, "kabina-0-0");
        await window.__e2e.quiet({ idleMs: 700 });
        v.object.control({ releaseOthers: true });
        const copied = canvas.tokens.copyObjects({ cut: false }).length;
        const previous = new Set(scene.tokens.map(d => d.id)), history = canvas.tokens.history.length;
        await canvas.tokens.pasteObjects({ x: 1000, y: 1100 });
        await window.__e2e.quiet({ idleMs: 700 });
        const added = scene.tokens.filter(d => !previous.has(d.id));
        const car = added.find(d => P.jestPojazdem(d.actor)), rider = added.find(d => P.pojazdJadacego(d));
        const entries = canvas.tokens.history.length - history;
        const linked = P.pojazdJadacego(rider)?.id === car?.id;
        await canvas.tokens.undoHistory();
        await window.__e2e.quiet({ idleMs: 700 });
        return { copied, linked, entries, remaining: added.filter(d => scene.tokens.has(d.id)).length,
          original: scene.tokens.has(v.id) && P.pojazdJadacego(pc)?.id === v.id };
      }, ids);
      t.equal(r.copied, 2, "crew joins clipboard");
      t.assert(r.linked, "copy has its own crew link");
      t.equal(r.entries, 1, "only paste is recorded");
      t.equal(r.remaining, 0, "one undo removes both copies");
      t.assert(r.original, "source vehicle and rider survive");
    });
    await t.step("Headlight switch cannot be half-undone through token history", async () => {
      const r = await t.gm.eval(async ({ vehicle }) => {
        const v = canvas.scene.tokens.get(vehicle), P = game.neuroshima.pojazdy;
        const alpha = v.alpha;
        await v.update({ alpha: alpha === 1 ? 0.9 : 1 });
        const history = canvas.tokens.history.length;
        await P.przelaczSwiatla(v, true);
        await window.__e2e.quiet({ idleMs: 700 });
        const entries = canvas.tokens.history.length - history;
        await canvas.tokens.undoHistory();
        await window.__e2e.quiet({ idleMs: 700 });
        return { entries, on: P.stanSilnika(v.actor).swiatla, bright: v.light.bright, restored: v.alpha === alpha };
      }, ids);
      t.equal(r.entries, 0, "headlight projection has no independent undo entry");
      t.assert(r.on && r.bright === 18 && r.restored, "undo restores the preceding token edit and keeps headlights on", r);
      const moved = await t.gm.eval(async ({ vehicle }) => {
        const doc = canvas.scene.tokens.get(vehicle), x = doc._source.x;
        await doc.move([{ x: x + 100, y: doc._source.y }], { animate: false });
        await window.__e2e.quiet({ idleMs: 700 });
        const forward = doc.light.bright;
        await canvas.tokens.undoHistory();
        await window.__e2e.quiet({ idleMs: 700 });
        return { forward, afterUndo: doc.light.bright, x: doc._source.x, expectedX: x };
      }, ids);
      t.equal(moved.forward, 18, "moving does not let the item-light resolver extinguish headlights");
      t.equal(moved.afterUndo, 18, "headlights survive movement undo");
      t.equal(moved.x, moved.expectedX, "headlit vehicle movement undone");
    });
    await t.step("Flashlight cones follow movement undo without adding token or light history", async () => {
      const before = await t.gm.eval(state, ids);
      await t.gm.eval(async s => {
        await game.neuroshima.latarka.turnOn(game.actors.get(s.actor).items.get(s.lamp));
        await window.__e2e.quiet({ idleMs: 700 });
      }, ids);
      const lit = await t.gm.eval(state, ids);
      t.assert(lit.companion && lit.light > 0, "both flashlight cones exist", lit);
      t.equal(lit.history, before.history, "token light and companion link stay out of undo");
      t.equal(lit.lights, before.lights, "companion creation stays out of light-layer undo");
      await t.gm.eval(async s => {
        const doc = canvas.scene.tokens.get(s.token);
        await doc.move([{ x: doc._source.x + 100, y: doc._source.y }], { animate: false });
        await window.__e2e.quiet({ idleMs: 700 });
      }, ids);
      const moved = await t.gm.eval(state, ids);
      t.equal(moved.history, before.history + 1, "only the move is recorded");
      t.equal(moved.lights, before.lights, "companion movement does not pollute lighting history");
      await t.gm.eval(async () => { await canvas.tokens.undoHistory(); await window.__e2e.quiet({ idleMs: 700 }); });
      const restored = await t.gm.eval(state, ids);
      t.equal(restored.x, before.x, "carrier restored");
      t.equal(restored.companion.x, restored.center.x, "companion x agrees");
      t.equal(restored.companion.y, restored.center.y, "companion y agrees");
      t.equal(restored.history, before.history, "undo leaves no follow-up token history");
      await t.screenshot("gm", "flashlight after movement undo");
    });
    await t.step("NVG and thermal mode/range/metadata remain tied to the item switches", async () => {
      const before = await t.gm.eval(state, ids);
      for (const key of ["nvg", "thermal"]) {
        const r = await t.gm.eval(async (s, key) => {
          const actor = game.actors.get(s.actor), g = actor.items.get(s[key]);
          await game.neuroshima.gogle.turnOn(g);
          await window.__e2e.quiet({ idleMs: 700 });
          const doc = canvas.scene.tokens.get(s.token);
          return { on: g.getFlag("neuroshima-2026-overrides", "gogleOn"), mode: doc.sight.visionMode,
            history: canvas.tokens.history.length, range: doc.sight.range };
        }, ids, key);
        t.assert(r.on && r.mode !== "basic" && r.range > 0, `${key} actually enables vision`, r);
        t.equal(r.history, before.history, `${key} vision and metadata do not add undo entries`);
      }
      await t.gm.eval(async s => {
        await game.neuroshima.gogle.turnOff(game.actors.get(s.actor).items.get(s.thermal));
        await game.neuroshima.latarka.turnOff(game.actors.get(s.actor).items.get(s.lamp));
        await window.__e2e.quiet({ idleMs: 700 });
      }, ids);
      const off = await t.gm.eval(state, ids);
      t.equal(off.mode, before.mode, "original vision restored by switch");
      t.equal(off.range, before.range, "original range restored by switch");
      t.equal(off.companion, null, "extinguishing removes the companion");
      t.equal(off.history, before.history, "switching off also has no partial token undo");
      t.equal(off.lights, before.lights, "companion deletion has no independent undo");
    });
    await t.step("Undo a lit token placement: both token and generated companion disappear", async () => {
      const r = await t.gm.eval(async s => {
        const actor = game.actors.get(s.actor), M = "neuroshima-2026-overrides";
        await game.neuroshima.latarka.turnOn(actor.items.get(s.lamp));
        await window.__e2e.quiet({ idleMs: 700 });
        const h = canvas.tokens.history.length, lh = canvas.lighting.history.length;
        const [doc] = await canvas.scene.createEmbeddedDocuments("Token", [(await actor.getTokenDocument({ x: 700, y: 1300 })).toObject()]);
        await window.__e2e.quiet({ idleMs: 700 });
        const light = doc.getFlag(M, "companionLightId"), entries = canvas.tokens.history.length - h;
        await canvas.tokens.undoHistory();
        await window.__e2e.quiet({ idleMs: 700 });
        return { entries, hadLight: !!light, token: canvas.scene.tokens.has(doc.id), light: canvas.scene.lights.has(light),
          lightEntries: canvas.lighting.history.length - lh };
      }, ids);
      t.equal(r.entries, 1, "only token creation is recorded");
      t.assert(r.hadLight && !r.token && !r.light, "undo removes placed token and its generated light", r);
      t.equal(r.lightEntries, 0, "cleanup cannot be undone independently");
    });
    await t.step("Ordinary manually placed lights keep their native create undo", async () => {
      const r = await t.gm.eval(async () => {
        const h = canvas.lighting.history.length;
        const [light] = await canvas.scene.createEmbeddedDocuments("AmbientLight", [{ x: 1000, y: 500, config: { dim: 5 } }]);
        const entries = canvas.lighting.history.length - h;
        await canvas.lighting.undoHistory();
        return { entries, remains: canvas.scene.lights.has(light.id) };
      });
      t.equal(r.entries, 1, "manual lights retain undo");
      t.equal(r.remains, false, "manual light removed by undo");
    });
    await t.step("Chase lane correction is derived; one undo restores the previous lane", async () => {
      const r = await t.gm.eval(async s => {
        const C = game.neuroshima.poscig, M = "neuroshima-2026-overrides";
        const board = await C.start({ nazwa: "Undo lane audit", aktywuj: false });
        await board.setFlag(M, "fixture", "skirmish");
        const car = await C.dodajPojazd(board, canvas.scene.tokens.get(s.vehicle).actor.id, { tor: 4, rola: "scigany" });
        await board.activate();
        await window.__e2e.until(() => canvas.ready && canvas.scene.id === board.id);
        await window.__e2e.quiet({ idleMs: 700 });
        const doc = board.tokens.get(car.id), x = doc._source.x, h = canvas.tokens.history.length;
        await doc.update({ x: x + 35 }, { animate: false });
        await window.__e2e.quiet({ idleMs: 700 });
        const entries = canvas.tokens.history.length - h, corrected = doc._source.x;
        await canvas.tokens.undoHistory();
        await window.__e2e.quiet({ idleMs: 700 });
        return { entries, x, corrected, restored: doc._source.x, history: canvas.tokens.history.length - h };
      }, ids);
      t.equal(r.entries, 1, "only root move is recorded");
      t.equal(r.corrected, r.x, "off-center API move was corrected");
      t.equal(r.restored, r.x, "undo restores original lane");
      t.equal(r.history, 0, "undo cannot loop on the lane correction");
    });
  }
};
