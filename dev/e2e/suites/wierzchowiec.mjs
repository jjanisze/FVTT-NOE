/**
 * Suite — wierzchowiec (PLAN_m4_pojazdy §6.3, W1–W4; D39, D42, D43). GM + Gracz 1 in real combat:
 *
 *  - GM: a horse from the Bestiariusz (flag `wierzchowiec`, trained) next to Gracz 1's PC; combat, the horse rolled higher.
 *  - Gracz 1 mounts during combat: saddle seat, the rider drawn as large as before (S1), the horse sorts right behind the
 *    rider with the rider's Initiative (turn anchor, D39); presence access lets the player move the horse.
 *  - The horse's own turn is skipped with a card; in the rider's turn Bieganie raises the horse's budget to 3× Speed.
 *  - GM: the horse knocked prone → "stay in the saddle?" card with the rider's DEX save button (W4).
 *  - Gracz 1 dismounts: the anchor goes, the horse keeps the rider's Initiative and takes its own turn.
 *  - W5: Gracz 1's PC has Jeździec — the horse's TT + the rider's Proficiency Bonus while in the saddle, gone after
 *    dismounting; with Rodeo the PC tames an untrained horse (MDR (Tresura) ST 10 + STR mod, the GM records the rider).
 */

/* Functions below run in the browser (serialised): no closures over this file. */

async function przygotuj() {
  const MOD = "neuroshima-2026-overrides";
  for (const c of [...game.combats]) await c.delete();
  for (const a of game.actors.filter(a => a.getFlag(MOD, "e2eKon"))) await a.delete();
  const scene = canvas.scene, g = canvas.grid.size;
  const pc = scene.tokens.find(t => t.name === "PC Gracz 1");
  // W5: Jeździec (Wyjadacz Zwiadowcy) i Rodeo na postaci Gracza 1 — z paczek, oznaczone do sprzątnięcia.
  const stare = pc.actor.items.filter(i => i.getFlag(MOD, "e2eW5")).map(i => i.id);
  if (stare.length) await pc.actor.deleteEmbeddedDocuments("Item", stare);
  const zdolnosc = (await game.packs.get(MOD + ".zdolnosci-klasowe").getDocuments()).find(i => i.getFlag(MOD, "abilityId") === "jezdziec");
  const rodeo = (await game.packs.get(MOD + ".sztuczki").getDocuments()).find(i => i.getFlag(MOD, "sztuczka") === "rodeo");
  await pc.actor.createEmbeddedDocuments("Item", [zdolnosc, rodeo].map(src => {
    const d = game.items.fromCompendium(src);
    return { ...d, flags: { ...d.flags, [MOD]: { ...d.flags[MOD], e2eW5: true } } };
  }));
  const pack = game.packs.get(MOD + ".bestiariusz");
  const src = (await pack.getDocuments()).find(d => d.getFlag(MOD, "bestiary")?.id === "kon-zdrowy");
  const kon = await Actor.implementation.create({ ...game.actors.fromCompendium(src), name: "Koń e2e",
    flags: { ...src.flags, [MOD]: { ...src.flags[MOD], e2eKon: true } } });
  const zPaczki = !!kon.getFlag(MOD, "wierzchowiec");
  if (!zPaczki) await kon.setFlag(MOD, "wierzchowiec", { wyszkolony: true }); // starsza paczka piaskownicy
  await kon.update({ "prototypeToken.actorLink": true });
  await scene.moveTokens({ [pc.id]: { destination: { x: 3 * g, y: 15 * g, action: "displace" } } }, { animate: false });
  const [h] = await scene.createEmbeddedDocuments("Token", [(await kon.getTokenDocument({ x: 4 * g, y: 14.5 * g })).toObject()]);
  const enemy = scene.tokens.find(t => /ŻOŁNIERZ|CYWIL/i.test(t.name));
  const combat = await Combat.implementation.create({ scene: scene.id, active: true });
  await combat.createEmbeddedDocuments("Combatant", [[h, 20], [pc, 15], [enemy, 10]].map(([t, ini]) => ({ tokenId: t.id, sceneId: scene.id, actorId: t.actorId, initiative: ini })));
  await combat.startCombat();
  return { kon: h.uuid, pc: pc.uuid, wrog: enemy.name, zPaczki, size: kon.system.traits.size, w: h.width, meshPrzed: Math.round(pc.object.mesh.width),
    ttPrzed: kon.system.attributes.ac.value, prof: pc.actor.system.attributes.prof };
}

async function dosiadz({ kon, pc }) {
  const P = game.neuroshima.pojazdy;
  const h = await fromUuid(kon), me = await fromUuid(pc);
  await P.wsiadz(h, me, "siodlo-0-0");
  await window.__e2e.until(() => me.getFlag("neuroshima-2026-overrides", "jazda")?.miejsce === "siodlo-0-0", { message: "in the saddle" });
  await window.__e2e.until(() => h.actor.isOwner, { message: "presence access to the horse" });
  for (let i = 0; i < 40 && Math.round(me.object.mesh.width) < 50; i++) await new Promise(r => requestAnimationFrame(r));
  return { w: me.width, mesh: Math.round(me.object.mesh.width), owner: h.actor.isOwner };
}

/** GM: the horse's TT and the rider effect (W5). */
async function ttKonia({ kon, jest }) {
  const h = await fromUuid(kon);
  const ef = () => h.actor.effects.filter(e => e.getFlag("neuroshima-2026-overrides", "ttJezdzca"));
  await window.__e2e.until(() => (ef().length > 0) === jest, { message: jest ? "rider TT effect" : "rider TT effect removed" });
  return { tt: h.actor.system.attributes.ac.value, efekty: ef().length, nazwa: ef()[0]?.name ?? null };
}

/** GM: an untrained horse beside the PC (Rodeo). */
async function dzikiKon() {
  const MOD = "neuroshima-2026-overrides";
  const pack = game.packs.get(MOD + ".bestiariusz");
  const src = (await pack.getDocuments()).find(d => d.getFlag(MOD, "bestiary")?.id === "kon-zdrowy");
  const kon = await Actor.implementation.create({ ...game.actors.fromCompendium(src), name: "Dziki koń e2e",
    flags: { ...src.flags, [MOD]: { ...src.flags[MOD], e2eKon: true, wierzchowiec: { wyszkolony: false } } } });
  await kon.update({ "prototypeToken.actorLink": true, "ownership.default": CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER });
  const g = canvas.grid.size;
  const [h] = await canvas.scene.createEmbeddedDocuments("Token", [(await kon.getTokenDocument({ x: 8 * g, y: 17 * g })).toObject()]);
  return { kon: h.uuid, st: 10 + kon.system.abilities.str.mod };
}

/** Gracz 1 (Rodeo): taming with the roll; the GM records the rider on success. */
async function ujezdzaj({ kon, pc }) {
  const MOD = "neuroshima-2026-overrides";
  const P = game.neuroshima.pojazdy;
  const h = await fromUuid(kon), me = await fromUuid(pc);
  const n0 = game.messages.size;
  await P.ujezdzaj(h, me, { configure: false });
  await window.__e2e.until(() => game.messages.contents.slice(n0).some(m => /Rodeo: /.test(m.content)), { message: "Rodeo card" });
  const karta = game.messages.contents.slice(n0).find(m => /Rodeo: /.test(m.content)).content.replace(/<[^>]+>/g, " ");
  const ok = /zwierzę ujeżdżone/.test(karta);
  if (ok) await window.__e2e.until(() => (h.actor.getFlag(MOD, "wierzchowiec")?.ujezdzony ?? []).includes(me.actor.uuid), { message: "tamed by the GM" });
  else await window.__e2e.quiet({ idleMs: 800 });
  return { ok, karta, ujezdzony: h.actor.getFlag(MOD, "wierzchowiec")?.ujezdzony ?? [], rider: me.actor.uuid };
}

async function kolejnosc({ kon, pc }) {
  const h = await fromUuid(kon), me = await fromUuid(pc);
  await window.__e2e.until(() => {
    const t = game.combat.turns.map(c => c.tokenId);
    return t.indexOf(h.id) === t.indexOf(me.id) + 1;
  }, { message: "horse right after the rider" });
  const ch = game.combat.combatants.find(c => c.tokenId === h.id), cp = game.combat.combatants.find(c => c.tokenId === me.id);
  await window.__e2e.until(() => ch.initiative === cp.initiative, { message: "rider's Initiative" });
  return { kon: ch.initiative, jezdziec: cp.initiative };
}

/** GM: advance until `name` acts; returns skip cards seen on the way. */
async function doTury(name) {
  const n0 = game.messages.size;
  for (let i = 0; i < 8 && game.combat.combatant?.name !== name; i++) {
    await game.combat.nextTurn();
    await window.__e2e.quiet({ idleMs: 500 });
  }
  return { kto: game.combat.combatant?.name, runda: game.combat.round,
    pominiety: game.messages.contents.slice(n0).some(m => /jedzie z .* — rusza się w turze jeźdźca/.test(m.content.replace(/<[^>]+>/g, ""))) };
}

async function bieganie({ kon }) {
  const P = game.neuroshima.pojazdy;
  const h = await fromUuid(kon);
  await P.paleta.uzyj(h, "bieganie");
  await window.__e2e.until(() => P.paleta.stan(h.actor).bieganie, { message: "Bieganie effect" });
  const b = P.budzetJazdy(h);
  const g = h.parent.grid.size;
  await h.move([{ x: h.x + 6 * g, y: h.y }], { method: "dragging" });
  await h.object?.movementAnimationPromise;
  await window.__e2e.quiet({ idleMs: 600 });
  return { v: b.v, limit: b.limit, droga: h.actor.getFlag("neuroshima-2026-overrides", "tura")?.droga ?? 0 };
}

async function powalKonia({ kon }) {
  const h = await fromUuid(kon);
  const n0 = game.messages.size;
  await h.actor.toggleStatusEffect("prone", { active: true });
  await window.__e2e.until(() => game.messages.contents.slice(n0).some(m => /Utrzymać się na/.test(m.content)), { message: "stay-in-saddle card" });
  const m = game.messages.contents.slice(n0).find(x => /Utrzymać się na/.test(x.content));
  await h.actor.toggleStatusEffect("prone", { active: false });
  return /RO ZRC ST 10/.test(m.content) && /data-neuro-postoj="pojazd\.utrzymanie"/.test(m.content);
}

async function zsiadz({ kon, pc }) {
  const P = game.neuroshima.pojazdy;
  const h = await fromUuid(kon), me = await fromUuid(pc);
  await P.wysiadz(me);
  await window.__e2e.until(() => !me.getFlag("neuroshima-2026-overrides", "jazda") && me.width === 1, { message: "dismounted" });
  return true;
}

export default {
  name: "wierzchowiec",
  clients: ["gm", "Gracz 1"],

  async run(t) {
    const p1 = t.client("Gracz 1");
    await t.waitFor(p1, () => Boolean(game.user.character && canvas.ready), { message: "Gracz 1's client" });
    let s;
    await t.step("GM: a trained horse from the Bestiariusz beside Gracz 1's PC; combat", async () => {
      s = await t.gm.eval(przygotuj);
      t.equal(s.size, "lg", "horse is Large");
      t.equal(s.w, 2, "2 × 2 square footprint (D43)");
    });

    await t.step("Gracz 1 mounts in combat: saddle, rider drawn as large as before, presence access", async () => {
      const r = await p1.eval(dosiadz, { kon: s.kon, pc: s.pc });
      t.equal(r.w, 0.5, "rider document: half a 1.5 m square");
      t.assert(Math.abs(r.mesh - s.meshPrzed) <= 1, "rider image as large as before mounting (S1)", r);
      t.equal(r.owner, true, "the player may move the trained horse (D11, W-U4)");
      await t.screenshot("Gracz 1", "jezdziec na koniu");
    });

    await t.step("Jeździec in the saddle: the horse's TT + the rider's Proficiency Bonus (W5)", async () => {
      const r = await t.gm.eval(ttKonia, { kon: s.kon, jest: true });
      t.equal(r.efekty, 1, "one rider effect");
      t.equal(r.tt, s.ttPrzed + s.prof, "TT + PB");
      t.assert(/^Jeździec/.test(r.nazwa), "named after the ability", r);
    });

    await t.step("Turn anchor: the horse sorts right after the rider with the rider's Initiative (D39)", async () => {
      const r = await t.gm.eval(kolejnosc, { kon: s.kon, pc: s.pc });
      t.equal(r.kon, r.jezdziec, "aligned Initiative");
    });

    await t.step("The horse's own turn is skipped with a card; Bieganie in the rider's turn — 3× Speed", async () => {
      const a = await t.gm.eval(doTury, "PC Gracz 1");
      t.equal(a.kto, "PC Gracz 1", "rider's turn");
      const r = await p1.eval(bieganie, { kon: s.kon });
      t.equal(r.limit, r.v * 3, "Speed + 2× (Bieganie)");
      t.equal(r.droga, 9, "six squares = 9 m on the horse's budget");
      const b = await t.gm.eval(doTury, s.wrog);
      t.assert(b.pominiety, "horse's turn skipped with the 'rides with' card");
    });

    await t.step("GM: the horse knocked prone → stay-in-the-saddle card with the rider's DEX save (W4)", async () => {
      t.assert(await t.gm.eval(powalKonia, { kon: s.kon }), "card with RO ZRC ST 10");
    });

    await t.step("Gracz 1 dismounts: the horse keeps the Initiative and takes its own turn", async () => {
      await p1.eval(zsiadz, { kon: s.kon, pc: s.pc });
      const r = await t.gm.eval(async ({ kon }) => {
        const h = fromUuidSync(kon);
        const c = game.combat.combatants.find(x => x.tokenId === h.id);
        for (let i = 0; i < 8 && game.combat.combatant?.id !== c.id; i++) { await game.combat.nextTurn(); await window.__e2e.quiet({ idleMs: 500 }); }
        await window.__e2e.quiet({ idleMs: 800 });
        return { aktywny: game.combat.combatant?.id === c.id, ini: c.initiative };
      }, { kon: s.kon });
      t.assert(r.aktywny, "the horse acts in its own turn after dismounting");
      t.equal(r.ini, 15, "kept the rider's Initiative");
      const tt = await t.gm.eval(ttKonia, { kon: s.kon, jest: false });
      t.equal(tt.tt, s.ttPrzed, "TT back after dismounting (W5)");
    });

    await t.step("Rodeo: Gracz 1 tames an untrained horse — MDR (Tresura) ST 10 + STR mod; the GM records the rider (W5)", async () => {
      const d = await t.gm.eval(dzikiKon);
      const r = await p1.eval(ujezdzaj, { kon: d.kon, pc: s.pc });
      t.assert(r.karta.includes(`ST ${d.st}`), "card names ST 10 + STR mod", r);
      t.equal(r.ujezdzony.includes(r.rider), r.ok, "recorded exactly on success");
    });
  }
};
