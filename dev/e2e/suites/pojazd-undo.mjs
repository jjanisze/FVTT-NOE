/** Vehicle undo uses the native token history; derived seat/footprint writes are invisible to it. */
async function prepare() {
  const P = game.neuroshima.pojazdy;
  const actor = await P.utworzZKatalogu("osobowka", { nazwa: "Undo vehicle" });
  await actor.update({ "prototypeToken.actorLink": true });
  const td = await actor.getTokenDocument({ x: 400, y: 1100, rotation: 270 });
  const [v] = await canvas.scene.createEmbeddedDocuments("Token", [td.toObject()]);
  const pc = canvas.scene.tokens.find(t => t.name === "PC Gracz 1");
  await P.posadz(v, pc, "kabina-0-0");
  await window.__e2e.quiet({ idleMs: 600 });
  return { vehicle: v.id, rider: pc.id };
}

async function snapshot(ids) {
  await window.__e2e.quiet({ idleMs: 600 });
  const keys = ["x", "y", "elevation", "rotation", "width", "height"];
  const pose = id => Object.fromEntries(keys.map(k => [k, canvas.scene.tokens.get(id)._source[k]]));
  return { vehicle: pose(ids.vehicle), rider: pose(ids.rider), history: canvas.tokens.history.length };
}

async function move({ id, x, y, animate = true }) {
  const v = canvas.scene.tokens.get(id);
  await v.move([{ x, y }], { method: "dragging", animate });
  await window.__e2e.quiet({ idleMs: 600 });
}

async function undo() {
  await canvas.tokens.undoHistory();
  await window.__e2e.quiet({ idleMs: 600 });
}

async function ctrlZ(t, client) {
  const length = await client.eval(() => {
    document.activeElement?.blur?.();
    canvas.tokens.activate();
    return canvas.tokens.history.length;
  });
  await client.front();
  await client.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "Control", code: "ControlLeft", windowsVirtualKeyCode: 17, modifiers: 2 });
  await client.send("Input.dispatchKeyEvent", { type: "rawKeyDown", key: "z", code: "KeyZ", windowsVirtualKeyCode: 90, modifiers: 2 });
  await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: "z", code: "KeyZ", windowsVirtualKeyCode: 90, modifiers: 2 });
  await client.send("Input.dispatchKeyEvent", { type: "keyUp", key: "Control", code: "ControlLeft", windowsVirtualKeyCode: 17, modifiers: 0 });
  await t.waitFor(client, n => canvas.tokens.history.length === n - 1, { args: [length], message: "Ctrl+Z consumes one history entry" });
  await t.quiet();
}

export default {
  name: "pojazd-undo",
  clients: ["gm", "Gracz 1", "Gracz 2"],
  async run(t) {
    const same = (actual, expected, message) => t.equal(JSON.stringify(actual), JSON.stringify(expected), message);
    const ids = await t.gm.eval(prepare);
    const p1 = t.client("Gracz 1"), p2 = t.client("Gracz 2");
    await t.waitFor(p1, id => canvas.scene.tokens.get(id)?.actor?.isOwner, { args: [ids.vehicle], message: "driver owns vehicle" });
    await t.step("GM move and turn: one undo restores vehicle, footprint and rider", async () => {
      const before = await t.gm.eval(snapshot, ids);
      await t.gm.eval(move, { id: ids.vehicle, x: 700, y: 1400 });
      const after = await t.gm.eval(snapshot, ids);
      t.equal(after.history, before.history + 1, "one user action occupies one history entry");
      const messages = await t.gm.eval(() => game.messages.size);
      await ctrlZ(t, t.gm);
      const restored = await t.gm.eval(snapshot, ids);
      same(restored.vehicle, before.vehicle, "vehicle restored exactly");
      same(restored.rider, before.rider, "rider restored exactly");
      t.equal(restored.history, before.history, "undo produces no new history entry");
      t.equal(await t.gm.eval(() => game.messages.size), messages, "undo does not replay driving or trampling cards");
      const remote = await p2.eval(snapshot, ids);
      same(remote.vehicle, before.vehicle, "observer vehicle agrees");
      same(remote.rider, before.rider, "observer rider agrees");
      await t.screenshot("gm", "vehicle restored by undo");
    });
    await t.step("GM rotation: one undo restores the center and rectangular footprint", async () => {
      const before = await t.gm.eval(snapshot, ids);
      await t.gm.eval(async id => {
        await canvas.scene.tokens.get(id).update({ rotation: 180 });
        await window.__e2e.quiet({ idleMs: 600 });
      }, ids.vehicle);
      const after = await t.gm.eval(snapshot, ids);
      t.equal(after.history, before.history + 1, "rotation has one history entry");
      await t.gm.eval(undo);
      const restored = await t.gm.eval(snapshot, ids);
      same(restored.vehicle, before.vehicle, "rotation restores the complete vehicle pose");
      same(restored.rider, before.rider, "rotation restores the rider");
    });
    await t.step("Player move: GM passenger synchronization leaves GM history alone", async () => {
      const before = await p1.eval(snapshot, ids);
      const gmHistory = (await t.gm.eval(snapshot, ids)).history;
      await p1.eval(move, { id: ids.vehicle, x: 1000, y: 1400, animate: false });
      await t.gm.helper("quiet", { idleMs: 600 });
      t.equal((await t.gm.eval(snapshot, ids)).history, gmHistory, "GM gets no passenger history for player action");
      await p1.eval(undo);
      await t.gm.helper("quiet", { idleMs: 600 });
      const restored = await p2.eval(snapshot, ids);
      same(restored.vehicle, before.vehicle, "player undo restores vehicle on observer");
      same(restored.rider, before.rider, "player undo restores rider on observer");
    });
    await t.step("Two successive moves undo in reverse order; ordinary token undo still works", async () => {
      const before = await t.gm.eval(snapshot, ids);
      await t.gm.eval(move, { id: ids.vehicle, x: 1000, y: 1400, animate: false });
      const middle = await t.gm.eval(snapshot, ids);
      await t.gm.eval(move, { id: ids.vehicle, x: 1200, y: 1200, animate: false });
      await t.gm.eval(undo);
      const once = await t.gm.eval(snapshot, ids);
      same(once.vehicle, middle.vehicle, "first undo restores intermediate vehicle");
      same(once.rider, middle.rider, "first undo restores intermediate rider");
      await t.gm.eval(undo);
      const twice = await t.gm.eval(snapshot, ids);
      same(twice.vehicle, before.vehicle, "second undo restores original vehicle");
      same(twice.rider, before.rider, "second undo restores original rider");
      const normal = await t.gm.eval(async () => {
        const doc = canvas.scene.tokens.find(t => t.name === "PC Gracz 2");
        const before = { x: doc._source.x, y: doc._source.y, rotation: doc._source.rotation };
        await doc.update({ rotation: (before.rotation + 45) % 360 });
        await canvas.tokens.undoHistory();
        const rotation = doc._source.rotation;
        await doc.move([{ x: before.x + 100, y: before.y }], { animate: false });
        await canvas.tokens.undoHistory();
        return { before, after: { x: doc._source.x, y: doc._source.y, rotation } };
      });
      same(normal.after, normal.before, "ordinary movement and rotation undo unchanged");
    });
    await t.step("Undo while the forward animation is running cannot leave stale seats or a footprint", async () => {
      const before = await t.gm.eval(snapshot, ids);
      await t.gm.eval(async id => {
        const v = canvas.scene.tokens.get(id);
        const history = canvas.tokens.history.length;
        const moving = v.move([{ x: 1700, y: 1400 }], { method: "dragging", animation: { duration: 2000 } });
        await window.__e2e.until(() => canvas.tokens.history.length > history && v.object.animationContexts.size > 0,
          { message: "forward animation started" });
        await canvas.tokens.undoHistory();
        await moving;
        await window.__e2e.quiet({ idleMs: 600 });
      }, ids.vehicle);
      const restored = await t.gm.eval(snapshot, ids);
      same(restored.vehicle, before.vehicle, "interrupted animation restores vehicle");
      same(restored.rider, before.rider, "pending GM synchronization uses the restored pose");
      t.equal(restored.history, before.history, "interrupted animation adds no automatic history");
    });
  }
};
