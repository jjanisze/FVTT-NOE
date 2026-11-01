/**
 * Suite — karty MG i śmierć (PLAN_m7 E7, R9 + R10). GM i jeden gracz; każdy krok tak, jak przy stole.
 *
 *  - GM: PC Gracz 1 dostaje z kompendiów Coś mi tu śmierdzi, Zawzięty sukinkot i Łapiducha; mutant z Bestiariusza stoi
 *    15 m dalej. Walka: PC Gracz 1 nie jest pierwszy.
 *  - GM przesuwa mutanta na 4,5 m → Gracz 1 dostaje szept „wyczuwasz mutanta” bez nazwy (D9), MG — z nazwą; Gracz 1
 *    Shift+klikiem [Percepcja ST 15] (naturalna 20) wskazuje istotę.
 *  - PC Gracz 1 pada (0 PW) → na karcie „Umiera” Gracz 1 klika [Zawzięty sukinkot — wstanę] → zapowiedź; początek jego
 *    tury → 1 PW, przytomny, tor od zera.
 *  - PC Gracz 3 umiera (trzy porażki → karta „Śmierć” → MG potwierdza) → karta Łapiducha; Gracz 1 Shift+klikiem
 *    [Reanimacja] (naturalna 20, ST 15) → przez MG PC Gracz 3 znów umiera, bez statusu `dead`.
 */

/* Functions below run in the browser (serialised): no closures over this file. */

/** GM: zdolności z kompendiów na PC Gracz 1, mutant 10 pól dalej, walka (PC Gracz 1 drugi). */
async function przygotuj() {
  const MOD = "neuroshima-2026-overrides";
  if (game.messages.size) await ChatMessage.deleteDocuments(game.messages.map(m => m.id));
  for (const c of game.combats.contents) await c.delete();
  const scene = canvas.scene;
  const p1 = game.actors.getName("PC Gracz 1");
  const p3 = game.actors.getName("PC Gracz 3");
  for (const a of [p1, p3]) await a.update({ "system.attributes.hp.max": 12, "system.attributes.hp.value": 12 });

  const z = async (pack, flag, id) => {
    const p = game.packs.get(`${MOD}.${pack}`);
    const idx = await p.getIndex({ fields: [`flags.${MOD}.${flag}`] });
    const e = idx.find(x => x.flags?.[MOD]?.[flag] === id);
    return (await p.getDocument(e._id)).toObject();
  };
  await p1.createEmbeddedDocuments("Item", [
    await z("zdolnosci-pochodzenia", "originAbilityId", "cos-mi-tu-smierdzi"),
    await z("zdolnosci-pochodzenia", "originAbilityId", "zawziety-sukinkot"),
    await z("zdolnosci-klasowe", "abilityId", "lapiduch")
  ]);

  const best = game.packs.get(`${MOD}.bestiariusz`);
  const idx = await best.getIndex({ fields: ["system.details.type.value"] });
  const e = idx.find(x => /mutant/i.test(x.system?.details?.type?.value ?? ""));
  const mutant = await game.actors.importFromCompendium(best, e._id, { flags: { [MOD]: { fixture: "skirmish" } } }, { keepId: false });
  const t1 = scene.tokens.find(t => t.actor?.id === p1.id);
  const g = scene.grid.size;
  const td = await mutant.getTokenDocument({ x: t1.x + 10 * g, y: t1.y, actorLink: false });
  const [mt] = await scene.createEmbeddedDocuments("Token", [td.toObject()]);
  await new Promise(r => setTimeout(r, 600));
  await game.neuroshima.zdolnosciKarty.sprawdzSmrod({ cicho: true });

  const combat = await Combat.implementation.create({ scene: scene.id, active: true });
  const tokeny = scene.tokens.filter(t => t.actor?.type === "character");
  const kolejnosc = [...tokeny.filter(t => t.actor.id !== p1.id), tokeny.find(t => t.actor.id === p1.id)];
  await combat.createEmbeddedDocuments("Combatant", kolejnosc.map((t, i) => ({ tokenId: t.id, sceneId: scene.id, actorId: t.actorId, initiative: 30 - i })));
  await combat.startCombat();
  return { mutant: mt.uuid, nazwa: mt.name, naRuchu: combat.combatant?.name };
}

/** GM: mutant na 3 pola (4,5 m) od PC Gracz 1; szept MG z nazwą. */
async function mutantBlizej({ mutant }) {
  const MOD = "neuroshima-2026-overrides";
  const mt = await fromUuid(mutant);
  const t1 = canvas.scene.tokens.find(t => t.actor?.name === "PC Gracz 1");
  const n0 = game.messages.size;
  await mt.move({ x: t1.x + 3 * canvas.scene.grid.size, y: t1.y, action: "displace" });
  const gm = await window.__e2e.until(() => game.messages.contents.slice(n0)
    .find(m => m.speaker?.alias === "Coś mi tu śmierdzi"), { message: "the GM copy of Coś mi tu śmierdzi" });
  const gracz = game.messages.contents.slice(n0).find(m => m.getFlag(MOD, "kartaR9")?.typ === "smrod");
  return { gmTresc: gm.content.replace(/<[^>]+>/g, " "), gmSzept: gm.whisper.length > 0, graczKarta: gracz?.id ?? null };
}

/** Gracz 1: karta „Coś mi tu śmierdzi” — bez nazwy; Shift+klik [Percepcja], naturalna 20. */
async function percepcja({ messageId, nazwa }) {
  const el = await window.__e2e.until(() => ui.chat.element?.querySelector(`[data-message-id="${messageId}"]`),
    { message: "the smell card in the player's chat" });
  const bezNazwy = !el.textContent.includes(nazwa);
  const btn = el.querySelector("[data-neuro-m7-smrod]");
  const n0 = game.messages.size;
  const orig = CONFIG.Dice.randomUniform;
  CONFIG.Dice.randomUniform = () => 0.00001;
  try {
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, shiftKey: true }));
    const w = await window.__e2e.until(() => game.messages.contents.slice(n0).find(m => /wskazuje/.test(m.content)),
      { message: "the pointing whisper" });
    return { bezNazwy, wskazanie: w.content.replace(/<[^>]+>/g, " ") };
  } finally {
    CONFIG.Dice.randomUniform = orig;
  }
}

/** GM: PC `name` do 0 PW — karta „Umiera”. */
async function padnij({ name }) {
  const MOD = "neuroshima-2026-overrides";
  const a = game.actors.getName(name);
  await a.update({ "system.attributes.hp.value": 0 });
  const id = await window.__e2e.until(() => a.getFlag(MOD, "umieranie")?.karta ?? null, { message: "the Umiera card" });
  return { karta: id, stan: game.neuroshima.umieranie.stan(a) };
}

/** Gracz 1: klik [Zawzięty sukinkot — wstanę] na swojej karcie „Umiera”. */
async function wstane({ messageId }) {
  const btn = await window.__e2e.until(() => ui.chat.element?.querySelector(`[data-message-id="${messageId}"] [data-umieranie="sukinkot"]`),
    { message: "the Zawzięty sukinkot button for the owner" });
  btn.click();
  return true;
}

/** GM: stan PC `name`. */
function stanPC({ name }) {
  const MOD = "neuroshima-2026-overrides";
  const a = game.actors.getName(name);
  return {
    hp: a.system.attributes.hp.value, stan: game.neuroshima.umieranie.stan(a), porazki: a.system.attributes.death.failure,
    zapowiedz: !!a.getFlag(MOD, "umieranie")?.sukinkot, martwy: a.statuses.has("dead"),
    uzycia: a.items.find(i => i.getFlag(MOD, "originAbilityId") === "zawziety-sukinkot")?.system.uses.value ?? null
  };
}

/** GM: tura PC Gracz 1. */
async function turaGracza1() {
  const p1 = game.actors.getName("PC Gracz 1");
  await game.combat.update({ turn: game.combat.turns.findIndex(c => c.actor?.id === p1.id) });
  await window.__e2e.until(() => p1.system.attributes.hp.value > 0, { message: "PC Gracz 1 back up at their turn" });
  return game.combat.combatant?.name;
}

/** GM: PC Gracz 3 — trzy porażki → karta „Śmierć” → [Potwierdź]; karta Łapiducha. */
async function smierc() {
  const MOD = "neuroshima-2026-overrides";
  const U = game.neuroshima.umieranie;
  const p3 = game.actors.getName("PC Gracz 3");
  await U.dodajPorazki(p3, 3, "e2e");
  const karta = await window.__e2e.until(() => game.messages.contents.findLast(m => m.getFlag(MOD, "umieranieSmierc")?.actorUuid === p3.uuid),
    { message: "the Śmierć card" });
  const btn = await window.__e2e.until(() => ui.chat.element?.querySelector(`[data-message-id="${karta.id}"] [data-umieranie="potwierdz"]`),
    { message: "the confirm button" });
  btn.click();
  const lap = await window.__e2e.until(() => game.messages.contents.findLast(m => m.getFlag(MOD, "kartaR9")?.typ === "lapiduch"),
    { message: "the Łapiduch card" });
  return { martwy: p3.statuses.has("dead"), chwila: karta.getFlag(MOD, "umieranieSmierc")?.chwila ?? null, lapiduch: lap.id };
}

/** Gracz 1: Shift+klik [Reanimacja], naturalna 20. */
async function reanimacja({ messageId }) {
  const btn = await window.__e2e.until(() => ui.chat.element?.querySelector(`[data-message-id="${messageId}"] [data-neuro-m7-reanimacja]`),
    { message: "the reanimation button for the player" });
  const orig = CONFIG.Dice.randomUniform;
  CONFIG.Dice.randomUniform = () => 0.00001;
  try {
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, shiftKey: true }));
    await new Promise(r => setTimeout(r, 1500));
  } finally {
    CONFIG.Dice.randomUniform = orig;
  }
  return true;
}

export default {
  name: "zdolnosci-karty",
  clients: ["gm", "Gracz 1"],

  async run(t) {
    const p1 = t.client("Gracz 1");
    await t.waitFor(p1, () => Boolean(game.user.character && ui.chat?.element), { message: "the player's client to see the fixture" });

    let fx;
    await t.step("GM: PC Gracz 1 takes Coś mi tu śmierdzi, Zawzięty sukinkot and Łapiduch; a mutant 15 m away; combat", async () => {
      fx = await t.gm.eval(przygotuj);
      t.assert(fx.mutant && fx.nazwa, "a mutant from the Bestiary", fx);
      t.assert(fx.naRuchu && fx.naRuchu !== "PC Gracz 1", "PC Gracz 1 is not first", fx);
    });

    await t.step("Mutant comes within 9 m → player senses a presence (no name), GM sees the name; Percepcja ST 15 points it out", async () => {
      const r = await t.gm.eval(mutantBlizej, { mutant: fx.mutant });
      t.assert(r.gmSzept && r.gmTresc.includes(fx.nazwa), "the GM whisper names the mutant", r);
      t.assert(r.graczKarta, "a card whispered to the player", r);
      const p = await p1.eval(percepcja, { messageId: r.graczKarta, nazwa: fx.nazwa });
      t.assert(p.bezNazwy, "the player's card carries no name (D9)", p);
      t.assert(p.wskazanie.includes(fx.nazwa), "a successful Perception points at the mutant", p);
    });

    await t.step("PC Gracz 1 drops to 0 → owner clicks Zawzięty sukinkot → stands up at the start of their turn", async () => {
      const pad = await t.gm.eval(padnij, { name: "PC Gracz 1" });
      t.equal(pad.stan, "umierajacy", "dying");
      await p1.eval(wstane, { messageId: pad.karta });
      const z = await t.waitFor(t.gm, ({ name }) => {
        const MOD = "neuroshima-2026-overrides";
        return game.actors.getName(name).getFlag(MOD, "umieranie")?.sukinkot ? true : null;
      }, { args: [{ name: "PC Gracz 1" }], message: "the GM records the announcement" });
      t.assert(z, "announced");
      const przed = await t.gm.eval(stanPC, { name: "PC Gracz 1" });
      t.equal(przed.uzycia, 0, "the use is spent at once");
      t.equal(przed.hp, 0, "still at 0 until the turn");
      t.equal(await t.gm.eval(turaGracza1), "PC Gracz 1", "PC Gracz 1 on turn");
      const po = await t.gm.eval(stanPC, { name: "PC Gracz 1" });
      t.equal(po.hp, 1, "1 PW");
      t.equal(po.stan, "przytomny", "conscious, dying over");
      t.equal(po.porazki, 0, "death saves reset (U23)");
      t.equal(po.zapowiedz, false, "announcement cleared");
    });

    await t.step("PC Gracz 3 dies (three failures, GM confirms) → Łapiduch card; Gracz 1 reanimates (ST 15) → dying again", async () => {
      await t.gm.eval(padnij, { name: "PC Gracz 3" });
      const s = await t.gm.eval(smierc);
      t.assert(s.martwy, "dead after the confirmation", s);
      t.assert(Number.isFinite(s.chwila), "the Śmierć card records the moment (U24)", s);
      await p1.eval(reanimacja, { messageId: s.lapiduch });
      const po = await t.waitFor(t.gm, ({ name }) => {
        const a = game.actors.getName(name);
        return !a.statuses.has("dead") && game.neuroshima.umieranie.stan(a) === "umierajacy" ? true : null;
      }, { args: [{ name: "PC Gracz 3" }], message: "PC Gracz 3 reanimated through the GM" });
      t.assert(po, "reanimated");
      const st = await t.gm.eval(stanPC, { name: "PC Gracz 3" });
      t.equal(st.hp, 0, "at 0 PW, not stable");
    });
  }
};
