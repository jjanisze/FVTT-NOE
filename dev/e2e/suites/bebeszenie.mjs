/**
 * Suite — Bebeszenie i rozbiórka (PLAN_m5_postoj.md E10, §7.19–7.20). GM and Gracz 1.
 *
 *  - Two corpses on the viewed scene: a Pies mutek (beast) and a Cywil (human). Gracz 1 carries a butcher's kit
 *    and a jammed Bat.
 *  - Gracz 1 targets the dog and picks "Bebeszenie celu" in the kit's context menu → the window (kit test) →
 *    forced 18 → the GM settles: organic material and meat on the PC, the corpse emptied, a summary card he sees.
 *  - GM: token HUD on the human → the window, executor Gracz 1's PC → a public message before the roll (D10),
 *    then a summary card.
 *  - Gracz 1: "Rozbierz na surowce" on the jammed Bat → the GM's proposal card → [Zatwierdź…] → the Bat is gone,
 *    3 MO on the PC.
 */

/* Functions below run in the browser (serialised): no closures over this file. */

async function przygotuj() {
  const MOD = "neuroshima-2026-overrides";
  for (const c of [...game.combats]) await c.delete();
  if (game.messages.size) await ChatMessage.deleteDocuments(game.messages.map(m => m.id));
  const scene = game.scenes.active ?? game.scenes.contents[0];
  await scene.view();
  await window.__e2e.until(() => canvas.ready && canvas.scene?.id === scene.id, { message: "the scene" });
  const p1 = game.actors.getName("PC Gracz 1");
  const pc = scene.tokens.find(t => t.actor?.name === "PC Gracz 1");
  const pack = game.packs.get(`${MOD}.bestiariusz`);
  const idx = await pack.getIndex({ fields: ["flags"] });
  const trupy = {};
  for (const [i, id] of ["pies-mutek", "cywil"].entries()) {
    const e = idx.find(x => x.flags?.[MOD]?.bestiary?.id === id);
    const actor = await game.actors.importFromCompendium(pack, e._id, { flags: { [MOD]: { fixture: "skirmish" } } });
    const td = await actor.getTokenDocument({ x: pc.x + (2 + i * 2) * scene.grid.size, y: pc.y + scene.grid.size, actorLink: false });
    const [tok] = await scene.createEmbeddedDocuments("Token", [td.toObject()]);
    await tok.actor.update({ "system.attributes.hp.value": 0 });
    // 0 PW → „BN pada” (`combat/umieranie.mjs`) sam nakłada `dead`.
    await window.__e2e.until(() => tok.actor.statuses.has("dead"), { message: `${id} dead` });
    trupy[id] = { token: tok.id, uuid: tok.uuid, nazwa: tok.name };
  }
  const P = game.neuroshima.produkcja;
  await P.utworzWynik(p1, { ref: "toolkit:rzeznika", ilosc: 1 });
  const [bat] = await P.utworzWynik(p1, { ref: "weapon:bat", ilosc: 1 });
  await bat.setFlag(MOD, "jam", { jammed: true });
  return { trupy, bat: bat.id, MO: P.surowce.gbOf(p1, "MO") };
}

/** Player: target the dog, "Bebeszenie celu" from the kit's context menu, kit test, forced d20. */
async function bebeszGracz({ token, d20 }) {
  const pc = game.user.character;
  const t = await window.__e2e.until(() => canvas.tokens.get(token), { message: "the corpse token" });
  t.setTarget(true, { releaseOthers: true });
  const kit = pc.items.find(i => i.type === "tool" && i.system.type?.baseItem === "rzeznika");
  const opcje = [];
  Hooks.call("dnd5e.getItemContextOptions", kit, opcje);
  const o = opcje.find(x => x.name === "Bebeszenie celu");
  if (!o || (o.condition && !o.condition())) return { menu: false };
  o.callback();
  const okno = await window.__e2e.until(() => window.__e2e.findApps({ title: "Bebeszenie —" })[0], { message: "the window" });
  await window.__e2e.until(() => okno.element?.querySelector('[data-action="bebesz"]'), { message: "the form" });
  const test = okno.element.querySelector('select[name="test"]').value;
  const blokada = okno.element.querySelector("p.neuro-zle")?.textContent.trim() ?? null;
  window.__e2e.forceD20(d20);
  okno.element.querySelector('[data-action="bebesz"]').click();
  const rzut = await window.__e2e.pressRollDialog("normal");
  await window.__e2e.quiet({ idleMs: 600 });
  window.__e2e.restoreDice();
  return { menu: true, test, blokada, rzut };
}

/** Any client: the summary card of a corpse (by token name), as this client sees it. */
async function karta({ nazwa }) {
  const m = await window.__e2e.until(() => game.messages.contents.find(x => x.content.includes(`Bebeszenie: ${nazwa}`) && /Zdobycz/.test(x.content)), { timeoutMs: 15000, message: `the card for ${nazwa}` });
  return { id: m.id, tekst: m.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 400), czas: /bebeszenieCzas/.test(m.content) };
}

/** GM: loot on the PC and the corpse state. */
function stan({ uuid }) {
  const MOD = "neuroshima-2026-overrides";
  const p1 = game.actors.getName("PC Gracz 1");
  const t = fromUuidSync(uuid);
  return {
    MO: game.neuroshima.produkcja.surowce.gbOf(p1, "MO"),
    mieso: p1.items.find(i => i.flags?.[MOD]?.prowiantId === "mieso")?.system.quantity ?? 0,
    pula: t.actor.getFlag(MOD, "bebeszenie")?.pula ?? null
  };
}

/** GM: token HUD on the human corpse → the window → executor Gracz 1's PC → roll. */
async function bebeszMG({ token }) {
  const t = canvas.tokens.get(token);
  t.control({ releaseOthers: true });
  canvas.hud.token.bind(t);
  const btn = await window.__e2e.until(() => canvas.hud.token.element?.querySelector(".neuro-bebeszenie-hud"), { message: "the HUD button" });
  const n0 = game.messages.size;
  btn.click();
  const okno = await window.__e2e.until(() => window.__e2e.findApps({ title: "Bebeszenie —" })[0], { message: "the window" });
  const wyk = await window.__e2e.until(() => okno.element.querySelector('select[name="wykonawca"]'), { message: "executor" });
  const p1 = game.actors.getName("PC Gracz 1");
  if (wyk.value !== p1.id) {
    wyk.value = p1.id;
    wyk.dispatchEvent(new Event("change", { bubbles: true }));
    await window.__e2e.sleep(300);
  }
  okno.element.querySelector('[data-action="bebesz"]').click();
  await window.__e2e.pressRollDialog("normal");
  await window.__e2e.quiet({ idleMs: 600 });
  const nowe = game.messages.contents.slice(n0);
  const jawne = nowe.find(m => m.flags?.[MOD_ID()]?.bebeszenieJawne);
  canvas.hud.token.close();
  return { jawne: jawne ? { id: jawne.id, publiczne: !jawne.whisper.length, przedRzutem: nowe.indexOf(jawne) < nowe.findIndex(m => m.rolls.length) } : null };
  function MOD_ID() { return "neuroshima-2026-overrides"; }
}

/** Player: "Rozbierz na surowce" on the jammed Bat. */
async function rozbierzGracz({ bat }) {
  const item = game.user.character.items.get(bat);
  const opcje = [];
  Hooks.call("dnd5e.getItemContextOptions", item, opcje);
  const o = opcje.find(x => x.name === "Rozbierz na surowce");
  const widoczna = !!o && (!o.condition || o.condition());
  if (widoczna) await o.callback();
  return { widoczna };
}

/** GM: the proposal card → [Zatwierdź…] → OK. */
async function zatwierdzRozbiorke() {
  const m = await window.__e2e.until(() => game.messages.contents.find(x => /Rozbiórka: Bat/.test(x.content) && /rozbiorkaZatwierdz/.test(x.content)), { timeoutMs: 15000, message: "the proposal card" });
  const propozycja = m.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  await window.__e2e.clickChat(m.id, '[data-neuro-postoj="rozbiorkaZatwierdz"]');
  const ok = await window.__e2e.clickDialog({ title: "Rozbiórka: Bat" }, "ok");
  await window.__e2e.until(() => !game.actors.getName("PC Gracz 1").items.getName("Bat"), { message: "the Bat gone" });
  await window.__e2e.quiet({ idleMs: 500 });
  return { propozycja: propozycja.slice(0, 300), szept: m.whisper.length > 0, ok: !!ok, MO: game.neuroshima.produkcja.surowce.gbOf(game.actors.getName("PC Gracz 1"), "MO") };
}

export default {
  name: "bebeszenie",
  clients: ["gm", "Gracz 1"],

  async run(t) {
    const p1 = t.client("Gracz 1");
    await t.waitFor(p1, () => Boolean(game.user.character && ui.chat?.element && canvas.ready), { message: "the player's client" });

    let s;
    await t.step("GM: a dead dog and a dead civilian on the scene; Gracz 1 has a butcher's kit and a jammed Bat", async () => {
      s = await t.gm.eval(przygotuj);
      t.assert(Boolean(s.trupy["pies-mutek"] && s.trupy.cywil), "two corpses", s);
    });

    await t.step("Gracz 1: target the dog → kit menu → window (kit test) → forced 18 → loot and a card he sees", async () => {
      await t.waitFor(p1, (id) => Boolean(canvas.tokens.get(id)), { args: [s.trupy["pies-mutek"].token], message: "the dog on Gracz 1's canvas" });
      const r = await p1.eval(bebeszGracz, { token: s.trupy["pies-mutek"].token, d20: [18] });
      t.equal(r.menu, true, "kit context menu entry");
      t.equal(r.test, "tool:rzeznika", "the butcher's kit test by default");
      t.equal(r.blokada, null, "nothing blocks");
      t.equal(r.rzut, true, "roll dialog");
      const k = await p1.eval(karta, { nazwa: s.trupy["pies-mutek"].nazwa });
      t.assert(/sukces/.test(k.tekst), "success card on Gracz 1", k.tekst);
      const st = await t.gm.eval(stan, { uuid: s.trupy["pies-mutek"].uuid });
      t.assert(st.MO > s.MO, "organic material on the PC", st);
      t.assert(st.mieso > 0, "meat on the PC", st);
      t.assert(Object.values(st.pula).every(v => v === 0), "the corpse emptied", st.pula);
      await t.screenshot("Gracz 1", "bebeszenie sukces");
    });

    await t.step("GM: token HUD on the civilian → executor Gracz 1's PC → public message before the roll (D10)", async () => {
      const r = await t.gm.eval(bebeszMG, { token: s.trupy.cywil.token });
      t.assert(Boolean(r.jawne), "the D10 message", r);
      t.equal(r.jawne.publiczne, true, "public");
      t.equal(r.jawne.przedRzutem, true, "before the roll");
      await t.waitFor(p1, (id) => Boolean(game.messages.get(id)), { args: [r.jawne.id], message: "Gracz 1 sees it" });
      const k = await t.gm.eval(karta, { nazwa: s.trupy.cywil.nazwa });
      t.equal(k.czas, true, "the card offers the GM to advance time");
    });

    await t.step("Gracz 1: Rozbierz na surowce (jammed Bat) → GM proposal → [Zatwierdź…] → Bat gone, +3 MO", async () => {
      const r = await p1.eval(rozbierzGracz, { bat: s.bat });
      t.equal(r.widoczna, true, "menu entry on a broken item");
      const z = await t.gm.eval(zatwierdzRozbiorke);
      t.equal(z.szept, true, "proposal only for the GM");
      t.assert(/metal|materiały organiczne 3 gb/.test(z.propozycja), "half the recipe (6 MO → 3)", z.propozycja);
      const st = await t.gm.eval(stan, { uuid: s.trupy["pies-mutek"].uuid });
      t.equal(z.MO, st.MO, "consistent");
    });
  }
};
