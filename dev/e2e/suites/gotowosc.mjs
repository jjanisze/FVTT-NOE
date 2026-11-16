/**
 * e2e: gotowość do tury M8 (PLAN_m8_ruch_i_ekonomia_akcji §8.4, E8; T44, T45) — dwa klienty graczy i MG.
 *
 * Kolejność: BN (na turze) → PC Gracz 1 → ukryty BN → PC Gracz 2. Gracz 2 widzi „Twoja tura za 2” (ukryty BN się nie
 * liczy i nie jest zdradzany), Gracz 1 — „Gotuj się, jesteś następny”; MG bez przypisanej postaci — bez paska. Po
 * zmianie tury Gracz 1 ma „Twoja tura” z zegarem `m:ss.cc`, a Gracz 2 — „następny” (ukryta tura po drodze nie jest
 * obietnicą). Przeładowanie strony Gracza 1 w środku tury wraca z tym samym startem zegara (pamięć sesji karty), bez
 * nowego startu. Zrzuty paska u obu graczy.
 */

/* Functions below run in the browser (serialised): no closures over this file. */

/** GM: walka BN → Gracz 1 → ukryty BN → Gracz 2, start na BN. */
async function przygotuj() {
  for (const c of [...game.combats]) await c.delete();
  if (game.messages.size) await ChatMessage.deleteDocuments(game.messages.map(m => m.id));
  const scene = canvas.scene;
  const t1 = scene.tokens.find(t => t.actor?.name === "PC Gracz 1");
  const t2 = scene.tokens.find(t => t.actor?.name === "PC Gracz 2");
  const npc = scene.tokens.find(t => t.actor?.type === "npc");
  const g = scene.grid.size;
  const [ukryty] = await scene.createEmbeddedDocuments("Token", [{
    ...(await npc.actor.getTokenDocument({ x: npc.x + 2 * g, y: npc.y, hidden: true })).toObject(), name: "Ukryty BN (e2e)"
  }]);
  const combat = await Combat.implementation.create({ scene: scene.id, active: true });
  await combat.createEmbeddedDocuments("Combatant", [
    { tokenId: npc.id, sceneId: scene.id, actorId: npc.actorId, initiative: 20 },
    { tokenId: t1.id, sceneId: scene.id, actorId: t1.actorId, initiative: 15 },
    { tokenId: ukryty.id, sceneId: scene.id, actorId: ukryty.actorId, initiative: 12, hidden: true },
    { tokenId: t2.id, sceneId: scene.id, actorId: t2.actorId, initiative: 10 }
  ]);
  await combat.startCombat();
  await window.__e2e.until(() => combat.combatant?.tokenId === npc.id, { message: "the NPC on turn" });
  return { kolejnosc: combat.turns.map(c => c.name), naTurze: combat.combatant?.name };
}

/** Tekst i stan paska gotowości (każdy klient). */
function pasek() {
  const el = document.getElementById("neuro-gotowosc");
  const s = game.neuroshima.gotowosc.stan();
  return el ? { tekst: el.querySelector(".tekst")?.textContent ?? null, zegar: el.querySelector(".zegar")?.textContent ?? "", stan: s.stan, za: s.za,
    start: s.zegar?.start ?? null, czesciowy: s.zegar?.czesciowy ?? null } : { tekst: null, stan: s.stan };
}

/** GM: następna tura. */
async function nastepna() {
  await game.combat.nextTurn();
  return game.combat.combatant?.name;
}

/** GM: posprzątaj walkę i ukryty żeton. */
async function sprzatnij() {
  for (const c of [...game.combats]) await c.delete();
  const ids = canvas.scene.tokens.filter(t => t.name === "Ukryty BN (e2e)").map(t => t.id);
  if (ids.length) await canvas.scene.deleteEmbeddedDocuments("Token", ids);
  return true;
}

export default {
  name: "gotowosc",
  clients: ["gm", "Gracz 1", "Gracz 2"],

  async run(t) {
    const p1 = t.client("Gracz 1");
    const p2 = t.client("Gracz 2");
    for (const p of [p1, p2]) await t.waitFor(p, () => Boolean(game.user.character && canvas.ready), { message: "the player's client on the scene" });

    try {
      await t.step("GM: combat NPC → PC Gracz 1 → hidden NPC → PC Gracz 2, the NPC on turn", async () => {
        const fx = await t.gm.eval(przygotuj);
        t.equal(fx.kolejnosc.length, 4, "four turns", fx);
        t.assert(/GANGUS|BN|NPC|[A-ZĄĆĘŁŃÓŚŹŻ]/.test(fx.naTurze ?? ""), "an NPC on turn", fx);
      });

      await t.step("Gracz 1: „Gotuj się, jesteś następny”; Gracz 2: „Twoja tura za 2” (the hidden NPC not counted); GM: no bar", async () => {
        const a = await t.waitFor(p1, () => { const el = document.getElementById("neuro-gotowosc"); return el?.querySelector(".tekst")?.textContent || null; },
          { message: "the bar on Gracz 1" });
        t.equal(a, "Gotuj się, jesteś następny", "Gracz 1 next");
        const b = await t.waitFor(p2, () => { const el = document.getElementById("neuro-gotowosc"); return el?.querySelector(".tekst")?.textContent || null; },
          { message: "the bar on Gracz 2" });
        t.equal(b, "Twoja tura za 2", "Gracz 2 in two turns — the hidden NPC is not revealed");
        t.equal((await t.gm.eval(pasek)).tekst, null, "the GM without an assigned character gets no bar");
        await t.screenshot("Gracz 1", "gotowość — następny");
        await t.screenshot("Gracz 2", "gotowość — za 2");
      });

      await t.step("GM: next turn → Gracz 1 „Twoja tura” with a running m:ss.cc clock; Gracz 2 „Gotuj się” (a hidden turn in between is no promise)", async () => {
        await t.gm.eval(nastepna);
        const a = await t.waitFor(p1, () => {
          const el = document.getElementById("neuro-gotowosc");
          return el?.querySelector(".tekst")?.textContent === "Twoja tura" && /^\d+:\d\d\.\d\d$/.test(el.querySelector(".zegar")?.textContent ?? "") ? true : null;
        }, { message: "Gracz 1's own turn with the clock" });
        t.assert(a, "own turn with a clock");
        const s1 = await p1.eval(pasek);
        t.equal(s1.czesciowy, false, "a full clock — the start was observed");
        const b = await t.waitFor(p2, () => (document.getElementById("neuro-gotowosc")?.querySelector(".tekst")?.textContent === "Gotuj się, jesteś następny" ? true : null),
          { message: "Gracz 2 next" });
        t.assert(b, "Gracz 2 next");
        await t.screenshot("Gracz 1", "gotowość — twoja tura z zegarem");
      });

      await t.step("Gracz 1 reloads the page mid-turn → the bar returns with the same clock start (session memory), no fresh start", async () => {
        const przed = await p1.eval(pasek);
        await new Promise(r => setTimeout(r, 1200));
        await p1.reload();
        await t.waitFor(p1, () => Boolean(game.user.character && canvas.ready), { message: "Gracz 1 back on the scene" });
        const po = await t.waitFor(p1, () => {
          const s = game.neuroshima.gotowosc.stan();
          return s.stan === "tura" && s.zegar ? { start: s.zegar.start, czesciowy: s.zegar.czesciowy, ms: game.neuroshima.gotowosc.stan().zegar.ms } : null;
        }, { message: "the own-turn state after the reload" });
        t.equal(po.start, przed.start, "the same clock start after the reload");
        t.equal(po.czesciowy, false, "still the full clock");
        t.assert(po.ms >= 1000, "the elapsed time carried over", po);
        await t.screenshot("Gracz 1", "gotowość — po przeładowaniu");
      });
    } finally {
      await t.gm.eval(sprzatnij);
    }
  }
};
