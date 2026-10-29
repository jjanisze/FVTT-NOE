/**
 * Suite — paleta kierowcy (PLAN_m4_pojazdy D41, K1). GM + Gracz 1 (driver) in real combat:
 *
 *  - Gracz 1 drives an Osobówka from the compendium; the palette (HUD) lists Gaz do dechy, Slalom and the reverse gear.
 *  - Gaz do dechy: the driving card counts the budget 36 + 72 m; a Pojazdy test of the driver gets ST +5.
 *  - Reverse: the car backs up without turning, the metres count double, no "turn" card.
 *  - Next driver turn: the reverse switches itself off, Gaz do dechy keeps only ST +5; at the end of that turn it is gone.
 *  - A bus in reverse: metres ×4 and Disadvantage on Pojazdy tests (Cofanie, s. 262).
 */

/* Functions below run in the browser (serialised): no closures over this file. */

async function przygotuj() {
  const MOD = "neuroshima-2026-overrides", P = game.neuroshima.pojazdy;
  for (const c of [...game.combats]) await c.delete();
  const scene = canvas.scene, g = canvas.grid.size;
  const a = await P.utworzZKatalogu("osobowka", { nazwa: "Osobówka paleta e2e" });
  await a.update({ "prototypeToken.actorLink": true });
  const [v] = await scene.createEmbeddedDocuments("Token", [(await a.getTokenDocument({ x: 1 * g, y: 15 * g, rotation: 270 })).toObject()]);
  await P.utworzKluczyki(v);
  const b = await P.utworzZKatalogu("autobus", { nazwa: "Autobus paleta e2e" });
  await b.update({ "prototypeToken.actorLink": true });
  const [bus] = await scene.createEmbeddedDocuments("Token", [(await b.getTokenDocument({ x: 20 * g, y: 2 * g, rotation: 0 })).toObject()]);
  const pc = scene.tokens.find(t => t.name === "PC Gracz 1");
  await P.posadz(v, pc, "kabina-0-0");
  const enemy = scene.tokens.find(t => /ŻOŁNIERZ|CYWIL/i.test(t.name));
  const combat = await Combat.create({ scene: scene.id, active: true });
  await combat.createEmbeddedDocuments("Combatant", [pc, enemy].map((t, i) => ({ tokenId: t.id, sceneId: scene.id, actorId: t.actorId, initiative: 20 - i * 10 })));
  await combat.startCombat();
  await window.__e2e.until(() => game.combat?.combatant?.tokenId === pc.id, { message: "driver's turn" });
  return { pojazd: v.uuid, bus: bus.uuid, kierowca: pc.uuid, g, v: a.system.attributes.movement.speeds.walk };
}

async function paleta(pojazd) {
  const P = game.neuroshima.pojazdy;
  const v = await fromUuid(pojazd);
  await P.uruchom(v);
  await window.__e2e.until(() => P.stanSilnika(v.actor).wl, { message: "engine on" });
  const app = await P.paleta.otworz(v);
  await window.__e2e.until(() => app.element?.querySelector("[data-pozycja]"), { message: "palette rendered" });
  const przyciski = [...app.element.querySelectorAll("[data-pozycja]")].map(b => b.dataset.pozycja);
  return { przyciski, wylaczone: [...app.element.querySelectorAll("[data-pozycja]:disabled")].length };
}

/** Last driving card text after `n0`. */
function kartaJazdy(n0) {
  const nowe = game.messages.contents.slice(n0).map(m => m.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " "));
  return nowe.reverse().find(t => /Jazda:/.test(t)) ?? null;
}

async function gazIJazda({ pojazd, g }) {
  const P = game.neuroshima.pojazdy;
  const v = await fromUuid(pojazd);
  await P.paleta.uzyj(v, "gazDoDechy");
  await window.__e2e.until(() => P.paleta.stan(v.actor).ruch === 2, { message: "Gaz do dechy effect" });
  // 25 squares east (37.5 m, above the base 36 m), then 20 back west — the U-turn card carries the budget line.
  await v.move([{ x: v.x + 25 * g, y: v.y }], { method: "dragging" });
  await v.object?.movementAnimationPromise;
  await window.__e2e.quiet({ idleMs: 400 });
  await v.move([{ x: v.x - 20 * g, y: v.y }], { method: "dragging" });
  await v.object?.movementAnimationPromise;
  return { budzet: P.budzetJazdy(v), droga: v.actor.getFlag("neuroshima-2026-overrides", "tura")?.droga };
}

async function testKierowcy({ kierowca }) {
  const k = await fromUuid(kierowca);
  const rolls = await k.actor.rollSkill({ skill: "poj", target: 10 }, { configure: false }, { create: false });
  const r = Array.isArray(rolls) ? rolls[0] : rolls;
  return { target: r?.options?.target ?? null, tryb: r?.options?.advantageMode ?? null };
}

async function wsteczny({ pojazd, g }) {
  const P = game.neuroshima.pojazdy;
  const v = await fromUuid(pojazd);
  const przed = v.rotation;
  const droga0 = v.actor.getFlag("neuroshima-2026-overrides", "tura")?.droga ?? 0;
  await P.paleta.uzyj(v, "wsteczny");
  await window.__e2e.until(() => P.paleta.stan(v.actor).wsteczny, { message: "reverse on" });
  // Facing west after the U-turn: 4 squares east = 6 m backwards.
  await v.move([{ x: v.x + 4 * g, y: v.y }], { method: "dragging" });
  await v.object?.movementAnimationPromise;
  await window.__e2e.until(() => (v.actor.getFlag("neuroshima-2026-overrides", "tura")?.droga ?? 0) > droga0, { message: "distance counted" });
  return { przed, po: v.rotation, droga0, droga: v.actor.getFlag("neuroshima-2026-overrides", "tura").droga };
}

async function nastepnaTura({ pojazd, ile = 1 }) {
  const P = game.neuroshima.pojazdy;
  const v = await fromUuid(pojazd);
  for (let i = 0; i < ile; i++) {
    await game.combat.nextTurn();
    await window.__e2e.quiet({ idleMs: 500 });
  }
  const efekty = v.actor.effects.filter(e => e.flags?.["neuroshima-2026-overrides"]?.paleta).map(e => ({
    id: e.flags["neuroshima-2026-overrides"].paleta.id, faza: e.flags["neuroshima-2026-overrides"].paleta.faza }));
  return { runda: game.combat.round, kto: game.combat.combatant?.name, efekty, stan: P.paleta.stan(v.actor) };
}

async function autobus({ bus, kierowca }) {
  const P = game.neuroshima.pojazdy;
  const b = await fromUuid(bus), k = await fromUuid(kierowca);
  await P.wysadz(k);
  await P.posadz(b, k, P.miejscaPojazdu(b.actor).find(m => m.kierowca).id);
  await P.paleta.uzyj(b, "wsteczny");
  await window.__e2e.until(() => P.paleta.stan(b.actor).wsteczny, { message: "bus reverse on" });
  const rolls = await k.actor.rollSkill({ skill: "poj", target: 10 }, { configure: false }, { create: false });
  const r = Array.isArray(rolls) ? rolls[0] : rolls;
  return { mnoznik: P.budzetJazdy(b).mnoznikDrogi, tryb: r?.options?.advantageMode ?? null };
}

export default {
  name: "pojazd-paleta",
  clients: ["gm", "Gracz 1"],

  async run(t) {
    const p1 = t.client("Gracz 1");
    await t.waitFor(p1, () => Boolean(game.user.character && canvas.ready), { message: "Gracz 1's client" });
    let s;
    await t.step("GM: an Osobówka with Gracz 1 at the wheel, combat on the driver's turn", async () => {
      s = await t.gm.eval(przygotuj);
      t.equal(s.v, 36, "speed 36 m");
    });

    await t.step("Gracz 1: palette lists the car's traits and the reverse gear", async () => {
      const r = await p1.eval(paleta, s.pojazd);
      for (const id of ["gazDoDechy", "slalom", "wsteczny", "skok"]) t.assert(r.przyciski.includes(id), `palette: ${id}`, r.przyciski);
      t.assert(!r.przyciski.includes("szostyBieg"), "no motorcycle trait on a car");
      t.equal(r.wylaczone, 0, "driver can use it");
      await t.screenshot("Gracz 1", "paleta kierowcy osobowki");
    });

    let n0;
    await t.step("Gaz do dechy: budget 36 + 72 m on the driving card, ST +5 on the driver's Pojazdy tests", async () => {
      n0 = await t.gm.eval(() => game.messages.size);
      const r = await p1.eval(gazIJazda, { pojazd: s.pojazd, g: s.g });
      t.equal(r.budzet.limit, 108, "limit 3 × 36");
      t.equal(r.droga, 67.5, "37.5 + 30 m in this turn");
      await t.gm.eval(() => window.__e2e.quiet({ idleMs: 800 }));
      const karta = await t.gm.eval(kartaJazdy, n0);
      t.assert(/z 108 m/.test(karta ?? "") && /Gaz do dechy: \+72 m/.test(karta ?? ""), "driving card counts the palette", karta);
      const test = await p1.eval(testKierowcy, { kierowca: s.kierowca });
      t.equal(test.target, 15, "ST 10 + 5");
    });

    await t.step("Reverse: backs up without turning; 6 m count as 12; no turn card", async () => {
      n0 = await t.gm.eval(() => game.messages.size);
      const r = await p1.eval(wsteczny, { pojazd: s.pojazd, g: s.g });
      t.equal(Math.round(r.po), Math.round(r.przed), "rotation unchanged");
      t.equal(Math.round((r.droga - r.droga0) * 10) / 10, 12, "6 m backwards count double");
      await t.gm.eval(() => window.__e2e.quiet({ idleMs: 800 }));
      const karta = await t.gm.eval(kartaJazdy, n0);
      t.assert(!/Obrót|Skręt/.test(karta ?? ""), "no turn test for reversing", karta);
    });

    await t.step("Next driver turn: reverse off, Gaz do dechy keeps only ST +5; gone at the end of that turn", async () => {
      const r = await t.gm.eval(nastepnaTura, { pojazd: s.pojazd, ile: 2 });
      t.equal(r.runda, 2, "round 2");
      t.assert(!r.efekty.some(e => e.id === "wsteczny"), "reverse switched off", r.efekty);
      t.assert(r.efekty.some(e => e.id === "gazDoDechy" && e.faza === 1), "Gaz do dechy in phase 1", r.efekty);
      t.equal(r.stan.ruch, 0, "no extra movement any more");
      t.equal(r.stan.st, 5, "ST +5 until the end of this turn");
      const k = await t.gm.eval(nastepnaTura, { pojazd: s.pojazd, ile: 1 });
      t.equal(k.efekty.length, 0, "everything gone after the driver's next turn");
    });

    await t.step("Bus in reverse: metres ×4, Disadvantage on Pojazdy tests (Cofanie)", async () => {
      const r = await t.gm.eval(autobus, { bus: s.bus, kierowca: s.kierowca });
      t.equal(r.mnoznik, 4, "¼ speed");
      t.equal(r.tryb, -1, "Disadvantage");
    });
  }
};
