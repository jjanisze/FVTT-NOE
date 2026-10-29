/**
 * Suite — pościg od startu do mety (PLAN_m4_pojazdy §6.2.5, P5a–P5e, D34–D41). GM + two players on a folded-road board:
 *
 *  - GM: the players' Osobówka (Gracz 1 drives, Gracz 2 rides) ahead of a raider Hammer and a driverless Buggy; combat,
 *    Gracz 1's turn opens with the Test Pościgu card.
 *  - Gracz 1 fails the Test (forced d20) → [Losuj komplikację]; GM rolls Przeszkoda (8) → [−1 znacznik] moves the car back.
 *  - Gracz 1: Gazu! from the palette, two lanes on — 72 m, inside the 2-marker limit (D34).
 *  - GM: the Hammer brakes (Hample) — the card names the Buggy behind for a collision test.
 *  - GM: damage to the driver → Test (Pojazdy) ST 10 card (D36).
 *  - Gracz 2 falls out: lands a marker behind the car and drifts −3 markers a round (D38).
 *  - GM: a blast on the car → Slalom button → the car's DEX save with Advantage, consumed (D36).
 *  - GM: finish line on the car's marker → next round the end card → [Zakończ pościg] silences the turn cards (D40).
 */

/* Functions below run in the browser (serialised): no closures over this file. */

async function przygotuj() {
  const MOD = "neuroshima-2026-overrides", P = game.neuroshima.pojazdy, C = game.neuroshima.poscig;
  for (const c of [...game.combats]) await c.delete();
  for (const s of game.scenes.filter(s => s.name.startsWith("Pościg P5"))) await s.delete();
  for (const a of game.actors.filter(a => a.getFlag(MOD, "e2eP5"))) await a.delete();
  const mk = async (id, nazwa) => { const a = await P.utworzZKatalogu(id, { nazwa }); await a.update({ "prototypeToken.actorLink": true, [`flags.${MOD}.e2eP5`]: true }); return a; };
  const os = await mk("osobowka", "Osobówka graczy"), hm = await mk("hammer", "Hammer bandytów"), bg = await mk("buggy", "Buggy bandytów");
  const scene = await C.start({ nazwa: "Pościg P5", srodowisko: "ulice", aktywuj: false, scigani: [os.id] });
  await C.dodajPojazd(scene, hm.id, { tor: 3, rola: "scigajacy" });
  await C.dodajPojazd(scene, bg.id, { tor: 1, rola: "scigajacy" });
  const pc1 = game.actors.getName("PC Gracz 1"), pc2 = game.actors.getName("PC Gracz 2");
  const bandyta = game.actors.find(a => /ŻOŁNIERZ/i.test(a.name));
  // Postacie w skali planszy (1,5 m = ¼ toru), jak po wklejeniu albo z karty „Posadzić?”.
  const y = 1500, bok = P.skalaPojazdu(scene);
  const dane = await Promise.all([pc1, pc2, bandyta].map((a, i) => a.getTokenDocument({ x: 300 + i * 200, y, width: bok, height: bok })));
  const [t1, t2, tb] = await scene.createEmbeddedDocuments("Token", dane.map(d => d.toObject()));
  const tok = a => scene.tokens.find(t => t.actorId === a.id && P.jestPojazdem(t.actor));
  const vOs = tok(os), vHm = tok(hm);
  const kier = a => P.miejscaPojazdu(a).find(m => m.kierowca).id;
  await P.posadz(vOs, t1, kier(os));
  await P.posadz(vOs, t2, P.miejscaPojazdu(os).find(m => !m.kierowca).id);
  await P.posadz(vHm, tb, kier(hm));
  await scene.activate();
  await window.__e2e.until(() => canvas.ready && canvas.scene?.id === scene.id, { message: "board on GM" });
  const combat = await Combat.implementation.create({ scene: scene.id, active: true });
  await combat.createEmbeddedDocuments("Combatant", [[t1, 20], [tb, 15], [t2, 10]].map(([t, ini]) => ({ tokenId: t.id, sceneId: scene.id, actorId: t.actorId, initiative: ini })));
  const n0 = game.messages.size;
  await combat.startCombat();
  await window.__e2e.until(() => game.messages.contents.slice(n0).some(m => /Test Pościgu — Osobówka/.test(m.content)), { message: "Test Pościgu card" });
  const karta = game.messages.contents.slice(n0).find(m => /Test Pościgu — Osobówka/.test(m.content));
  const tor = d => C.xNaTor(d._source.x + d._source.width * scene.grid.size / 2);
  return { scena: scene.id, os: vOs.uuid, hm: vHm.uuid, bg: tok(bg).uuid, kier: t1.uuid, pas: t2.uuid, karta: karta.id,
    torOs: tor(vOs), stOs: os.system.attributes.movement.speeds.walk };
}

function torZetonu(uuid) {
  const d = fromUuidSync(uuid), C = game.neuroshima.poscig;
  return C.xNaTor(d._source.x + d._source.width * d.parent.grid.size / 2);
}

/** Message id of the newest card whose text matches `re`, after message `n0` (count). */
function karta(re, n0 = 0) {
  const m = game.messages.contents.slice(n0).reverse().find(x => new RegExp(re).test(x.content));
  return m?.id ?? null;
}

async function testPoscigu({ karta: id }) {
  const n0 = game.messages.size;
  window.__e2e.forceD20([3]);
  await window.__e2e.clickChat(id, '[data-neuro-postoj="poscig.testPoscigu"]');
  await window.__e2e.pressRollDialog("normal");
  await window.__e2e.until(() => game.messages.contents.slice(n0).some(m => /Losuj komplikację/.test(m.content)), { message: "complication button" });
  window.__e2e.restoreDice();
  return game.messages.contents.slice(n0).reverse().find(m => /Losuj komplikację/.test(m.content)).id;
}

async function komplikacja({ wynik, os }) {
  const n0 = game.messages.size;
  window.__e2e.forceD20([8]);
  await window.__e2e.clickChat(wynik, '[data-neuro-postoj="poscig.kroki"]');
  await window.__e2e.until(() => game.messages.contents.slice(n0).some(m => /Komplikacja pościgu 8/.test(m.content)), { message: "complication 8" });
  window.__e2e.restoreDice();
  const id = game.messages.contents.slice(n0).find(m => /Komplikacja pościgu 8/.test(m.content)).id;
  const d = fromUuidSync(os), g = d.parent.grid.size;
  const x0 = d._source.x;
  await window.__e2e.clickChat(id, '[data-neuro-postoj="poscig.kroki"]');
  await window.__e2e.until(() => d._source.x !== x0, { message: "car moved back" });
  await window.__e2e.quiet({ idleMs: 600 });
  return game.neuroshima.poscig.xNaTor(d._source.x + d._source.width * g / 2);
}

async function gazu({ os }) {
  const P = game.neuroshima.pojazdy, C = game.neuroshima.poscig;
  const v = await fromUuid(os);
  await P.paleta.uzyj(v, "gazu");
  await window.__e2e.until(() => P.paleta.stan(v.actor).ruch === 1, { message: "Gazu! effect" });
  const n0 = game.messages.size;
  await v.move([{ x: v.x + 2 * C.LANE_W, y: v.y }], { method: "dragging" });
  await v.object?.movementAnimationPromise;
  await window.__e2e.quiet({ idleMs: 800 });
  return { droga: v.actor.getFlag("neuroshima-2026-overrides", "tura")?.droga ?? 0,
    ponadLimit: game.messages.contents.slice(n0).some(m => /Ponad limit|Przekroczony limit/.test(m.content)) };
}

async function hample({ hm }) {
  const P = game.neuroshima.pojazdy;
  const v = await fromUuid(hm);
  const n0 = game.messages.size;
  await P.paleta.uzyj(v, "hample");
  await window.__e2e.until(() => game.messages.contents.slice(n0).some(m => /Hample — Hammer/.test(m.content)), { message: "Hample card" });
  const m = game.messages.contents.slice(n0).find(x => /Hample — Hammer/.test(x.content));
  const tekst = m.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  return { buggy: /Buggy bandytów na znaczniku/.test(tekst), cofnij: /−2 znaczniki/.test(tekst), test: /Hample: Pojazdy ST 10/.test(tekst) };
}

async function atakNaKierowce({ kier }) {
  const d = await fromUuid(kier);
  const n0 = game.messages.size;
  await d.actor.applyDamage(4);
  await window.__e2e.until(() => game.messages.contents.slice(n0).some(m => /Trafiony kierowca/.test(m.content)), { message: "driver-hit card" });
  const m = game.messages.contents.slice(n0).find(x => /Trafiony kierowca/.test(x.content));
  return /ST <strong>10<\/strong>/.test(m.content);
}

async function wypadniecie({ pas }) {
  const P = game.neuroshima.pojazdy;
  const d = await fromUuid(pas);
  await P.wypadnij(d);
  await window.__e2e.until(() => !d.getFlag("neuroshima-2026-overrides", "jazda") && d.getFlag("neuroshima-2026-overrides", "dryf"), { message: "fallen and drifting" });
  await window.__e2e.quiet({ idleMs: 600 });
  return true;
}

async function doNastepnejRundy() {
  const c = game.combat, r0 = c.round, n0 = game.messages.size;
  while (game.combat.round === r0) {
    await game.combat.nextTurn();
    await window.__e2e.quiet({ idleMs: 500 });
  }
  await window.__e2e.quiet({ idleMs: 800 });
  return { runda: game.combat.round, n0, dryf: game.messages.contents.slice(n0).some(m => /Dryf drogi/.test(m.content)),
    koniec: game.messages.contents.slice(n0).find(m => /Koniec pościgu\?/.test(m.content))?.id ?? null };
}

async function slalom({ os }) {
  const C = game.neuroshima.poscig, P = game.neuroshima.pojazdy;
  const v = await fromUuid(os), c = v.getCenterPoint(v._source);
  const n0 = game.messages.size;
  await C.serie.zglosWybuch(v.parent, { x: c.x, y: c.y, area: { radius: 3 }, itemName: "Granat e2e" });
  await window.__e2e.until(() => game.messages.contents.slice(n0).some(m => /Slalom: Osobówka/.test(m.content)), { message: "Slalom button" });
  const id = game.messages.contents.slice(n0).find(m => /Slalom: Osobówka/.test(m.content)).id;
  await window.__e2e.clickChat(id, '[data-neuro-postoj="poscig.paleta"]');
  await window.__e2e.until(() => P.paleta.stan(v.actor).slalom, { message: "Slalom effect" });
  const rolls = await v.actor.rollSavingThrow({ ability: "dex", target: 15 }, { configure: false }, { create: false });
  const r = Array.isArray(rolls) ? rolls[0] : rolls;
  await window.__e2e.until(() => !P.paleta.stan(v.actor).slalom, { message: "Slalom consumed" });
  return { tryb: r?.options?.advantageMode ?? null };
}

async function meta({ os }) {
  const C = game.neuroshima.poscig;
  const v = await fromUuid(os), scene = v.parent;
  const tor = C.xNaTor(v._source.x + v._source.width * scene.grid.size / 2);
  await C.tura.ustawMete(scene, C.tura.torLogiczny(scene, tor));
  return C.stan(scene).meta;
}

async function zakoncz({ koniec, scena }) {
  await window.__e2e.clickChat(koniec, '[data-neuro-postoj="poscig.zakoncz"]');
  const scene = game.scenes.get(scena);
  await window.__e2e.until(() => scene.getFlag("neuroshima-2026-overrides", "poscig")?.zakonczony, { message: "chase ended" });
  const n0 = game.messages.size;
  await game.combat.nextTurn();
  await window.__e2e.quiet({ idleMs: 600 });
  while (game.combat.combatant?.name !== "PC Gracz 1") { await game.combat.nextTurn(); await window.__e2e.quiet({ idleMs: 400 }); }
  await window.__e2e.quiet({ idleMs: 800 });
  return { testPoKoncu: game.messages.contents.slice(n0).some(m => /Test Pościgu —/.test(m.content)) };
}

export default {
  name: "poscig-p5",
  clients: ["gm", "Gracz 1", "Gracz 2"],

  async run(t) {
    const p1 = t.client("Gracz 1"), p2 = t.client("Gracz 2");
    let s;
    await t.step("GM: board, crews, combat — the driver's turn opens with the Test Pościgu card", async () => {
      s = await t.gm.eval(przygotuj);
      t.assert(s.karta, "Test Pościgu card");
      for (const c of [p1, p2]) await t.waitFor(c, id => canvas.ready && canvas.scene?.id === id, { args: [s.scena], message: "players on the board" });
    });

    let wynik;
    await t.step("Gracz 1 fails the Test → complication; GM rolls Przeszkoda (8) → [−1 znacznik] moves the car back", async () => {
      await t.waitFor(p1, id => Boolean(game.messages.get(id)), { args: [s.karta], message: "card on Gracz 1" });
      wynik = await p1.eval(testPoscigu, { karta: s.karta });
      t.assert(wynik, "Losuj komplikację button");
      const tor = await t.gm.eval(komplikacja, { wynik, os: s.os });
      t.equal(tor, s.torOs - 1, "one marker back");
      await t.screenshot("gm", "komplikacja przeszkoda");
    });

    await t.step("Gracz 1: Gazu! and two lanes on — 72 m, inside the 2-marker limit (D34)", async () => {
      const r = await p1.eval(gazu, { os: s.os });
      t.equal(r.droga, 72, "two lanes = 72 m of road");
      t.equal(r.ponadLimit, false, "no over-limit card");
    });

    await t.step("GM: the Hammer brakes — Hample card names the Buggy behind for a collision test", async () => {
      const r = await t.gm.eval(hample, { hm: s.hm });
      t.assert(r.buggy && r.cofnij && r.test, "Buggy, −2 markers and the ST 10 test on the card", r);
    });

    await t.step("GM: damage to the driver → Test (Pojazdy) ST 10 card (D36)", async () => {
      t.assert(await t.gm.eval(atakNaKierowce, { kier: s.kier }), "ST max(10, ½)");
    });

    await t.step("Gracz 2 falls out: a marker behind the car, then −3 markers a round (D38)", async () => {
      await t.gm.eval(wypadniecie, { pas: s.pas });
      const torAuta = await t.gm.eval(torZetonu, s.os), torPas = await t.gm.eval(torZetonu, s.pas);
      t.equal(torPas, torAuta - 1, "lands one marker behind");
      const r = await t.gm.eval(doNastepnejRundy);
      t.equal(r.runda, 2, "round 2");
      t.assert(r.dryf, "drift card");
      t.equal(await t.gm.eval(torZetonu, s.pas), (await t.gm.eval(torZetonu, s.os)) - 4, "three markers further back, relative to the car");
      await t.screenshot("gm", "dryf drogi");
    });

    await t.step("GM: a blast on the car → Slalom → the car's DEX save with Advantage, consumed (D36)", async () => {
      const r = await t.gm.eval(slalom, { os: s.os });
      t.equal(r.tryb, 1, "Advantage");
    });

    await t.step("GM: finish line on the car's marker → end card next round → [Zakończ pościg] silences the turn cards", async () => {
      t.assert(await t.gm.eval(meta, { os: s.os }), "finish line set");
      const r = await t.gm.eval(doNastepnejRundy);
      t.assert(r.koniec, "end-of-chase card");
      const k = await t.gm.eval(zakoncz, { koniec: r.koniec, scena: s.scena });
      t.equal(k.testPoKoncu, false, "no Test Pościgu after the end");
      await t.screenshot("gm", "koniec poscigu");
    });
  }
};
