/**
 * Suite — Pojazdy (PLAN_m4_pojazdy §7, E8). GM + two players in their own clients:
 *
 *  - GM: an Osobówka from the `pojazdy` compendium on the skirmish scene, facing east, keys in the ignition.
 *  - Gracz 1 boards as the driver through the GM relay: seat flag, half-square rider, presence ownership,
 *    crew list; Gracz 2 (outside) sees one dot and no rider, and cannot X-ray.
 *  - Gracz 1 starts the engine (keys in the ignition: no marks) and drives east, then south (a 90° turn) over
 *    the Cywil: the GM gets the driving card (turn test) and the trampling card; on Gracz 2's client the hidden
 *    rider sits on the driver's seat of the turned car, and the footprint is swapped (3 × 1,5 → 1,5 × 3).
 *  - GM: 25 damage (≥ Próg awarii 20) → mishap card; [Zastosuj] 2 → speed 36 − 18.
 *  - Gracz 1 gets out: original size, flag gone, ownership back.
 */

/* Functions below run in the browser (serialised): no closures over this file. */

async function przygotuj() {
  const MOD = "neuroshima-2026-overrides";
  const P = game.neuroshima.pojazdy;
  for (const c of [...game.combats]) await c.delete();
  for (const a of game.actors.filter(a => a.getFlag(MOD, "e2ePojazd"))) await a.delete();
  const a = await P.utworzZKatalogu("osobowka", { nazwa: "Osobówka e2e" });
  await a.setFlag(MOD, "e2ePojazd", true);
  await a.update({ "prototypeToken.actorLink": true });
  const scene = canvas.scene;
  const td = await a.getTokenDocument({ x: 300, y: 1150, rotation: 270, width: 3, height: 1.5 });
  const [v] = await scene.createEmbeddedDocuments("Token", [td.toObject()]);
  await P.utworzKluczyki(v);
  const pc = scene.tokens.find(t => t.name === "PC Gracz 1");
  await scene.moveTokens({ [pc.id]: { destination: { x: 300, y: 1300, action: "displace" } } }, { animate: false });
  const cywil = scene.tokens.find(t => /CYWIL/i.test(t.name));
  if (cywil) await scene.moveTokens({ [cywil.id]: { destination: { x: 950, y: 1500, action: "displace" } } }, { animate: false });
  return { pojazd: v.uuid, id: v.id, jadacy: pc.uuid, cywil: !!cywil, mt: a.system.attributes.hp.mt, v: a.system.attributes.movement.speeds.walk };
}

async function wsiadz({ pojazd, jadacy }) {
  const P = game.neuroshima.pojazdy;
  const v = await fromUuid(pojazd), me = await fromUuid(jadacy);
  await P.wsiadz(v, me, "kabina-0-0");
  await window.__e2e.until(() => me.flags?.["neuroshima-2026-overrides"]?.jazda?.miejsce === "kabina-0-0" && me.width === 0.5, { message: "seated" });
  await window.__e2e.until(() => v.actor.isOwner, { message: "presence ownership" });
  return { miejsce: me.flags["neuroshima-2026-overrides"].jazda.miejsce, w: me.width, owner: v.actor.isOwner, crew: v.actor.system.crew.value.length };
}

function widokZZewnatrz({ pojazd, jadacy }) {
  const P = game.neuroshima.pojazdy;
  const v = fromUuidSync(pojazd), me = fromUuidSync(jadacy);
  return { kropki: v.object?.neuroKropki?.children?.length ?? 0, kropkiWidoczne: !!v.object?.neuroKropki?.visible,
    jadacyWidoczny: !!me.object?.visible, prześwietlenie: P.mozePrzeswietlic(v), user: game.user.name };
}

function stanGrafiki(pojazd) {
  const v = fromUuidSync(pojazd), art = v.actor.getFlag("neuroshima-2026-overrides", "pojazd").grafika;
  return {
    wnetrze: v.object.mesh.texture.baseTexture === foundry.canvas.getTexture(art.wnetrze)?.baseTexture,
    nadwozie: v.object.mesh.texture === v.object.texture,
    src: v.texture.src, oryginal: art.nadwozie, alpha: v.object.mesh.alpha,
    przeswietlany: game.neuroshima.pojazdy.przeswietlany(v)
  };
}

async function najedz(t, client, pojazd, wnetrze) {
  await client.front(0);
  const at = await client.eval(async uuid => {
    const v = fromUuidSync(uuid);
    canvas.pan({ ...v.getCenterPoint(), scale: 2 });
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    const center = v.getCenterPoint();
    const p = canvas.stage.toGlobal(new PIXI.Point(center.x, center.y));
    return { x: p.x, y: p.y };
  }, pojazd);
  await client.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
  await client.send("Input.dispatchMouseEvent", { type: "mouseMoved", ...at });
  await t.waitFor(client, (uuid, expected) => {
    const v = fromUuidSync(uuid), art = v.actor.getFlag("neuroshima-2026-overrides", "pojazd").grafika;
    return (v.object.mesh.texture.baseTexture === foundry.canvas.getTexture(art.wnetrze)?.baseTexture) === expected;
  }, { args: [pojazd, wnetrze], message: "matched interior respects local X-ray access" });
  return client.eval(stanGrafiki, pojazd);
}

async function uruchomIJedz({ pojazd }) {
  const P = game.neuroshima.pojazdy;
  const v = await fromUuid(pojazd);
  const w = P.warunkiUruchomienia(v);
  await P.uruchom(v);
  await window.__e2e.until(() => P.stanSilnika(v.actor).wl, { message: "engine on" });
  const ok = await v.move([{ x: 750, y: 1150 }, { x: 900, y: 1700 }], { autoRotate: true, method: "dragging" });
  await v.object?.movementAnimationPromise;
  return { warunki: w, ruch: ok };
}

async function poJezdzie({ pojazd, n0 }) {
  await window.__e2e.until(() => {
    const v = fromUuidSync(pojazd);
    return v.width === 1.5 && v.height === 3;
  }, { timeoutMs: 10000, message: "footprint swapped after the turn" });
  await window.__e2e.quiet({ idleMs: 800 });
  const nowe = game.messages.contents.slice(n0).map(m => m.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
  const v = fromUuidSync(pojazd);
  return {
    jazda: nowe.find(t => /Jazda:/.test(t)) ?? null, potracenie: nowe.find(t => /Potrącenie/.test(t)) ?? null,
    w: v.width, h: v.height, rot: Math.round(v.rotation)
  };
}

function miejsceJadacego({ pojazd, jadacy }) {
  const P = game.neuroshima.pojazdy;
  const v = fromUuidSync(pojazd), me = fromUuidSync(jadacy);
  const m = P.miejscaPojazdu(v.actor).find(x => x.id === "kabina-0-0");
  const s = P.geometria.srodekMiejsca(v.getCenterPoint(v._source), v._source.rotation, m, v.parent.grid.size);
  const c = me.getCenterPoint(me._source);
  return { odchylenie: Math.round(Math.hypot(c.x - s.x, c.y - s.y)), widoczny: !!me.object?.visible };
}

async function awaria({ pojazd, n0 }) {
  const P = game.neuroshima.pojazdy;
  const v = await fromUuid(pojazd);
  await v.actor.applyDamage([{ value: 25, type: "bludgeoning", properties: new Set() }]);
  await window.__e2e.until(() => game.messages.contents.slice(n0).some(m => /Awaria pojazdu\?/.test(m.content)), { message: "mishap card" });
  await P.zastosujAwarie(v, 2);
  return { v: v.actor.system.attributes.movement.speeds.walk, aktywne: P.aktywneAwariePojazdu(v.actor) };
}

async function wysiadz({ pojazd, jadacy }) {
  const P = game.neuroshima.pojazdy;
  const v = await fromUuid(pojazd), me = await fromUuid(jadacy);
  await P.wysiadz(me);
  await window.__e2e.until(() => !me.flags?.["neuroshima-2026-overrides"]?.jazda && me.width === 1, { message: "out" });
  await window.__e2e.until(() => !v.actor.isOwner, { message: "presence ownership gone" });
  return { w: me.width, owner: v.actor.isOwner, odl: P.odlegloscOdPojazdu(me, v) };
}

export default {
  name: "pojazd",
  clients: ["gm", "Gracz 1", "Gracz 2"],

  async run(t) {
    const p1 = t.client("Gracz 1");
    const p2 = t.client("Gracz 2");
    await t.waitFor(p1, () => Boolean(game.user.character && canvas.ready), { message: "Gracz 1's client" });
    await t.waitFor(p2, () => Boolean(canvas.ready), { message: "Gracz 2's client" });

    let s;
    await t.step("GM: an Osobówka from the compendium, keys in the ignition", async () => {
      s = await t.gm.eval(przygotuj);
      t.equal(s.mt, 20, "Próg awarii 20 (s. 262)");
      t.equal(s.v, 36, "speed 36 m");
    });

    await t.step("Gracz 1 boards as the driver through the GM relay", async () => {
      const r = await p1.eval(wsiadz, { pojazd: s.pojazd, jadacy: s.jadacy });
      t.equal(r.miejsce, "kabina-0-0", "driver's seat");
      t.equal(r.w, 0.5, "rider shrunk to the seat");
      t.equal(r.owner, true, "presence ownership (D11)");
      t.equal(r.crew, 1, "dnd5e crew list");
    });

    await t.step("Gracz 2 (outside) sees a dot, not the rider, and cannot X-ray (D3)", async () => {
      await t.waitFor(p2, (u) => Boolean(fromUuidSync(u)?.object?.neuroKropki?.children?.length), { args: [s.pojazd], message: "dots on Gracz 2" });
      const r = await p2.eval(widokZZewnatrz, { pojazd: s.pojazd, jadacy: s.jadacy });
      t.equal(r.kropki, 1, "one dot");
      t.equal(r.jadacyWidoczny, false, "rider hidden");
      t.equal(r.prześwietlenie, false, "no X-ray from outside");
      await t.screenshot("Gracz 2", "pojazd kropki z zewnątrz");
    });

    await t.step("Matched roof/interior: GM and driver see the cabin, outsider keeps the roof; no document writes", async () => {
      const gm = await najedz(t, t.gm, s.pojazd, true);
      t.assert(gm.wnetrze && gm.alpha > 0.9, "opaque cabin replaces faded roof", gm);
      t.equal(gm.src, gm.oryginal, "document still stores the closed body");
      await t.screenshot("gm", "osobowka wnetrze");
      const driver = await najedz(t, p1, s.pojazd, true);
      t.assert(driver.wnetrze, "driver sees the matching interior");
      const outside = await najedz(t, p2, s.pojazd, false);
      t.assert(outside.nadwozie && !outside.przeswietlany, "outsider sees the roof even under the cursor");
      const gmStillOpen = await t.gm.eval(stanGrafiki, s.pojazd);
      t.assert(gmStillOpen.wnetrze, "another client's cursor does not close the GM's roof view");
      await t.gm.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: 0, y: 0 });
      await t.waitFor(t.gm, uuid => {
        const v = fromUuidSync(uuid);
        return !game.neuroshima.pojazdy.przeswietlany(v) && v.object.mesh.texture === v.object.texture;
      }, {
        args: [s.pojazd], message: "roof returns on pointer leave"
      });
      const closed = await t.gm.eval(stanGrafiki, s.pojazd);
      t.assert(closed.nadwozie, "original roof texture restored");
      await t.screenshot("gm", "osobowka dach");
    });

    let n0;
    await t.step("Gracz 1 starts and drives east, then south over the Cywil", async () => {
      n0 = await t.gm.eval(() => game.messages.size);
      const r = await p1.eval(uruchomIJedz, { pojazd: s.pojazd });
      t.equal(r.warunki.blokady.length, 0, "no blocks");
      t.equal(r.warunki.oznaczenia.length, 0, "keys in the ignition, two free hands — no marks");
    });

    await t.step("GM: driving card with the turn test, trampling card; footprint swapped", async () => {
      const r = await t.gm.eval(poJezdzie, { pojazd: s.pojazd, n0 });
      t.assert(/Skręt o \d+°/.test(r.jazda ?? ""), "turn test on the driving card", r.jazda);
      if (s.cywil) t.assert(/CYWIL/i.test(r.potracenie ?? ""), "the Cywil on the trampling card", r.potracenie);
      t.equal(`${r.w}x${r.h}`, "1.5x3", "facing south: natural footprint");
      const m = await p2.eval(miejsceJadacego, { pojazd: s.pojazd, jadacy: s.jadacy });
      t.assert(m.odchylenie <= 2, "rider on the driver's seat after the turn (Gracz 2's client)", m.odchylenie);
      t.equal(m.widoczny, false, "still hidden for Gracz 2");
      await t.screenshot("gm", "pojazd po jeździe");
    });

    await t.step("GM: 25 damage → mishap card; [Zastosuj] 2 → speed −18", async () => {
      const r = await t.gm.eval(awaria, { pojazd: s.pojazd, n0 });
      t.equal(r.v, 18, "36 − 18");
      t.assert(r.aktywne.includes(2), "mishap 2 active");
    });

    await t.step("Gracz 1 gets out: size, flag and ownership restored", async () => {
      const r = await p1.eval(wysiadz, { pojazd: s.pojazd, jadacy: s.jadacy });
      t.equal(r.w, 1, "original size");
      t.equal(r.owner, false, "presence ownership gone");
      t.assert(r.odl <= 1.5, "next to the car", r.odl);
    });

    await t.step("GM: five normal-size passenger graphics and the interior seat selector", async () => {
      const r = await t.gm.eval(async uuid => {
        const MOD = "neuroshima-2026-overrides", P = game.neuroshima.pojazdy;
        const v = fromUuidSync(uuid);
        await P.zgas(v);
        const pc = canvas.scene.tokens.find(t => t.name === "PC Gracz 1");
        const seats = P.miejscaPojazdu(v.actor);
        const art = ["gangus-kapo", "lowca", "kanibal", "gangus-kapo", "lowca"];
        const riders = [];
        for (const [i, seat] of seats.entries()) {
          const data = pc.toObject();
          delete data._id;
          data.name = `Podgląd pasażera ${i + 1}`;
          data.actorLink = false;
          data.texture.src = `modules/${MOD}/tokens/${art[i]}.webp`;
          const [doc] = await canvas.scene.createEmbeddedDocuments("Token", [data]);
          await P.posadz(v, doc, seat.id);
          riders.push(doc);
        }
        canvas.tokens.releaseAll();
        return { count: riders.length, sizes: riders.map(d => d.width) };
      }, s.pojazd);
      t.equal(r.count, 5, "five readable passenger figures");
      t.assert(r.sizes.every(w => w === 0.5), "normal half-square passenger footprint retained");
      await najedz(t, t.gm, s.pojazd, true);
      await t.screenshot("gm", "osobowka pieciu pasazerow");
      const src = await t.gm.eval(async uuid => {
        const app = await game.neuroshima.pojazdy.otworzMiejsca(fromUuidSync(uuid));
        app.setPosition({ left: 80, top: 120 });
        return document.querySelector(".neuro-miejsca-tlo")?.getAttribute("src");
      }, s.pojazd);
      t.assert(src?.endsWith("/wnetrza/osobowka.webp"), "seat selector shows the matching interior");
      await t.screenshot("gm", "osobowka miejsca");
      await t.gm.eval(async () => {
        for (const app of foundry.applications.instances.values()) {
          if (app.id?.startsWith("neuro-miejsca-")) await app.close();
        }
      });
    });
  }
};
