/**
 * Suite — Autodestrukcja (PLAN_m5_postoj.md E9, §7.18). GM and Gracz 1.
 *
 *  - The GM brings a Gladiator (80%) from the Bestiariusz compendium onto the viewed scene, unlinked, and starts a
 *    combat with Gracz 1's PC.
 *  - Damage to 0 HP → "BN pada" and a GM-only whisper „Autodestrukcja (80%)” with [Rzuć k100]; Gracz 1 sees neither.
 *  - [Rzuć k100] with the GM's dice pinned to 1s → k100 = 1, k4 = 1 → a table line "1 runda do wybuchu" (Gracz 1
 *    sees it), no rolls in the whisper.
 *  - Next round → the blast: the explosive card (public), a marker on the scene, the token renamed "(wrak)", the
 *    machine dead with CE/CH/CZ destroyed; [Przywróć grafikę] restores the token.
 */

/* Functions below run in the browser (serialised): no closures over this file. */

async function przygotuj() {
  const MOD = "neuroshima-2026-overrides";
  for (const c of [...game.combats]) await c.delete();
  if (game.messages.size) await ChatMessage.deleteDocuments(game.messages.map(m => m.id));
  const scene = game.scenes.active ?? game.scenes.contents[0];
  await scene.view();
  await window.__e2e.until(() => canvas.ready && canvas.scene?.id === scene.id, { message: "the scene" });
  const pc = scene.tokens.find(t => t.actor?.name === "PC Gracz 1");
  const pack = game.packs.get(`${MOD}.bestiariusz`);
  const idx = await pack.getIndex({ fields: ["flags"] });
  const e = idx.find(x => x.flags?.[MOD]?.bestiary?.id === "gladiator");
  const actor = await game.actors.importFromCompendium(pack, e._id, { flags: { [MOD]: { fixture: "skirmish" } } });
  const td = await actor.getTokenDocument({ x: pc.x + 3 * scene.grid.size, y: pc.y, actorLink: false });
  const [token] = await scene.createEmbeddedDocuments("Token", [td.toObject()]);
  const combat = await Combat.implementation.create({ scene: scene.id, active: true });
  await combat.createEmbeddedDocuments("Combatant", [pc, token].map((t, i) => ({ tokenId: t.id, sceneId: scene.id, actorId: t.actorId, initiative: 20 - i })));
  await combat.startCombat();
  return { token: token.uuid, scena: scene.id, src: token.texture.src, dane: game.neuroshima.postoj.autodestrukcja.dane(token.actor) };
}

/** GM: the Gladiator to 0 HP → the whisper with [Rzuć k100]. */
async function doZera({ token }) {
  const t = await fromUuid(token);
  const n0 = game.messages.size;
  await t.actor.applyDamage(999);
  const szept = await window.__e2e.until(() => game.messages.contents.slice(n0).find(m => /Autodestrukcja \(80%\)/.test(m.content)), { message: "the self-destruct whisper" });
  return { szept: szept.id, gm: szept.whisper.length > 0, pada: game.messages.contents.slice(n0).some(m => /pada/.test(m.content)), hp: t.actor.system.attributes.hp.value };
}

/** Any client: what this client sees of a message. */
function widzi({ id }) {
  const m = game.messages.get(id);
  return { widoczna: !!m?.visible, wLogu: !!(ui.chat.element ?? document).querySelector(`[data-message-id="${id}"]`) };
}

/** GM: [Rzuć k100] with every die pinned to 1 (k100 = 1, k4 = 1). */
async function k100({ szept }) {
  const n0 = game.messages.size;
  const orig = CONFIG.Dice.randomUniform;
  CONFIG.Dice.randomUniform = () => 0.9999;
  try {
    await window.__e2e.clickChat(szept, '[data-neuro-postoj="autodestrukcjaK100"]');
    await window.__e2e.until(() => game.messages.contents.slice(n0).some(m => /do wybuchu/.test(m.content)), { message: "the countdown line" });
  } finally {
    CONFIG.Dice.randomUniform = orig;
  }
  const nowe = game.messages.contents.slice(n0);
  const linia = nowe.find(m => /do wybuchu/.test(m.content));
  const karta = nowe.find(m => m.whisper.length && /autodestrukcja!/.test(m.content));
  return { linia: linia.id, publiczna: !linia.whisper.length, tekst: linia.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(), karta: karta?.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(), rzutyWSzepcie: nowe.filter(m => m.whisper.length).reduce((n, m) => n + m.rolls.length, 0) };
}

/** GM: next round → the blast, the marker, the wreck; then [Przywróć grafikę]. */
async function runda({ token, scena }) {
  const MOD = "neuroshima-2026-overrides";
  const t = await fromUuid(token);
  const scene = game.scenes.get(scena);
  const n0 = game.messages.size;
  const rysunki0 = scene.drawings.filter(d => d.flags?.[MOD]?.explosive).length;
  const szablony0 = scene.regions.size; // v14: templates are Regions
  await game.combat.nextRound();
  await window.__e2e.until(() => t.actor.getFlag(MOD, "autodestrukcja")?.stan === "wybuch", { timeoutMs: 15000, message: "the blast" });
  await window.__e2e.until(() => /\(wrak\)$/.test(t.name), { message: "the wreck" });
  await window.__e2e.until(() => scene.drawings.filter(d => d.flags?.[MOD]?.explosive).length > rysunki0, { timeoutMs: 10000, message: "the blast marker" });
  await window.__e2e.quiet({ idleMs: 800 });
  const nowe = game.messages.contents.slice(n0);
  const kartaWybuchu = nowe.find(m => m.content.includes("neuro-explosive-card"));
  const mg = nowe.find(m => m.whisper.length && /Wybuch:/.test(m.content));
  const stan = t.actor.getFlag(MOD, "autodestrukcja");
  const wynik = {
    karta: kartaWybuchu?.id ?? null, kartaPubliczna: kartaWybuchu ? !kartaWybuchu.whisper.length : null,
    nazwa: t.name, wrakSrc:t.texture.src, martwy: t.actor.statuses.has("dead"), zniszczone: stan.zniszczone, wrakFlaga: !!t.getFlag(MOD, "wrak"),
    slady: scene.drawings.filter(d => d.flags?.[MOD]?.explosive).length - rysunki0, szablony: scene.regions.size - szablony0
  };
  await window.__e2e.clickChat(mg.id, '[data-neuro-postoj="autodestrukcjaPrzywroc"]');
  await window.__e2e.until(() => !/wrak/.test(t.name) && t.texture.src === t.actor.prototypeToken.texture.src
    && !t.getFlag(MOD, "wrak"), { message: "name texture and flag restored" });
  return { ...wynik, poPrzywroceniu: { nazwa: t.name, src: t.texture.src } };
}

export default {
  name: "autodestrukcja",
  clients: ["gm", "Gracz 1"],

  async run(t) {
    const p1 = t.client("Gracz 1");
    await t.waitFor(p1, () => Boolean(game.user.character && ui.chat?.element), { message: "the player's client" });

    let s;
    await t.step("GM: a Gladiator from the Bestiariusz on the scene, in combat with Gracz 1", async () => {
      s = await t.gm.eval(przygotuj);
      t.equal(s.dane?.szansa, 80, "Gladiator: 80% (generated automation)");
      t.equal(s.dane?.promien, 3, "radius 3 m");
    });

    let z;
    await t.step("0 HP → GM-only whisper with [Rzuć k100]; the player sees nothing of it", async () => {
      z = await t.gm.eval(doZera, { token: s.token });
      t.equal(z.hp, 0, "0 HP");
      t.equal(z.gm, true, "whisper to the GM");
      const w = await p1.eval(widzi, { id: z.szept });
      t.equal(w.widoczna || w.wLogu, false, "Gracz 1 does not see the d100 card");
    });

    let k;
    await t.step("[Rzuć k100] (1 ≤ 80) → k4 = 1: a countdown line for the table; no rolls in GM whispers", async () => {
      k = await t.gm.eval(k100, { szept: z.szept });
      t.equal(k.publiczna, true, "the line is public");
      t.assert(/1 runda do wybuchu/.test(k.tekst), "1 round to the blast", k.tekst);
      t.equal(k.rzutyWSzepcie, 0, "no rolls in the whispers");
      await t.waitFor(p1, (id) => Boolean(game.messages.get(id)), { args: [k.linia], message: "the line on Gracz 1" });
    });

    await t.step("Next round → blast card, marker, wreck, dead, CE/CH/CZ destroyed; [Przywróć grafikę] restores", async () => {
      const r = await t.gm.eval(runda, { token: s.token, scena: s.scena });
      t.equal(r.kartaPubliczna, true, "explosive card for the table");
      t.assert(/\(wrak\)$/.test(r.nazwa), "token renamed (wrak)", r.nazwa);
      t.equal(r.wrakFlaga, true, "original kept on the token");
      t.assert(r.wrakSrc.endsWith('/tokens/wraki/sredni.webp'),'actual self-destruction uses delivered Medium wreck art',r.wrakSrc);
      t.equal(r.martwy, true, "machine dead");
      t.equal(r.slady, 1, "one blast marker");
      t.equal(r.szablony, 0, "no stray template (flag cleared on a synthetic actor is not a second blast)");
      t.equal(r.zniszczone.join(), "CE,CH,CZ", "electronics, chemicals, parts destroyed (s. 204)");
      t.equal(r.poPrzywroceniu.src, s.src, "texture restored");
      await t.waitFor(p1, (id) => Boolean(game.messages.get(id)), { args: [r.karta], message: "the explosive card on Gracz 1" });
      await t.screenshot("gm", "autodestrukcja wybuch");
    });
  }
};
