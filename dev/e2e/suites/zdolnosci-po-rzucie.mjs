/**
 * Suite — zdolności „po rzucie” (PLAN_m7 E1, R3). Gotowe, gdy (plan §6): Cwaniak daje Motywację sojusznikowi z
 * **drugiego klienta** i werdykt zmienia się z chybienia na trafienie; Spieprzysz to! na rzucie BN.
 *
 *  - GM: PC Gracz 1 dostaje Motywację i Spieprzysz to! z paczki (CHA 12 → po 1 użyciu), walka z Graczem 2 na ruchu.
 *  - Gracz 2 strzela do BN tak, że chybia o 1 (pierwszy strzał mierzy modyfikator, drugi trafia dokładnie TT − 1).
 *  - Gracz 1 (inny klient, nie właściciel rzutu) widzi „Motywacja” pod kartą Gracza 2, klika — nowa karta ataku z
 *    trafieniem, stara „zastąpiona” u obu graczy, użycie zużyte, znacznik Reakcji na PC Gracz 1. Gracz 2 przycisku
 *    Motywacji nie ma (nie gra Cwaniakiem).
 *  - GM rzuca jawny RO BN, który się udaje; Gracz 1 klika „Spieprzysz to!” — przerzut, zostaje gorszy, wynik
 *    poniżej ST. To druga Reakcja w rundzie: szept naruszenia do MG (D5), działanie poszło.
 */

/* Functions below run in the browser (serialised): no closures over this file. */

/** GM: Motywacja i Spieprzysz to! dla PC Gracz 1; walka, Gracz 2 na ruchu. */
async function przygotuj() {
  const MOD = "neuroshima-2026-overrides";
  const pack = game.packs.get(`${MOD}.zdolnosci-klasowe`);
  const docs = await pack.getDocuments();
  const cwaniak = game.actors.getName("PC Gracz 1");
  const ids = ["motywacja", "spieprzysz-to"];
  await cwaniak.createEmbeddedDocuments("Item", ids.map(id => game.items.fromCompendium(docs.find(d => d.getFlag(MOD, "abilityId") === id))));
  for (const c of game.combats.contents) await c.delete();
  const scene = canvas.scene;
  // BN w zasięgu 18 m Cwaniaka (Spieprzysz to!), z dala od budynku z fixture'a (osłona). `displace` — bez ścieżki.
  const g = canvas.grid.size;
  const gangus = scene.tokens.find(tk => tk.name === "GANGUS ŻOŁNIERZ");
  await gangus.move({ x: 10 * g, y: 5 * g, action: "displace" });
  const combat = await Combat.implementation.create({ scene: scene.id, active: true });
  await combat.createEmbeddedDocuments("Combatant", scene.tokens.map((tk, i) => ({ tokenId: tk.id, sceneId: scene.id, actorId: tk.actorId, initiative: 20 - i })));
  await combat.startCombat();
  await combat.update({ turn: combat.turns.findIndex(c => c.name === "PC Gracz 2") });
  const tc = scene.tokens.find(tk => tk.actor?.id === cwaniak.id);
  return {
    items: ids.map(id => !!cwaniak.items.find(i => i.getFlag(MOD, "abilityId") === id)),
    uzycia: ids.map(id => cwaniak.items.find(i => i.getFlag(MOD, "abilityId") === id)?.system.uses.value ?? null),
    naRuchu: combat.combatant?.name,
    dystans: game.neuroshima.okolicznosci?.migawka ? canvas.grid.measurePath([tc.object.center, gangus.object.center]).distance : null
  };
}

/** Gracz 2: strzał do BN chybiający o 1 — pierwszy mierzy modyfikator, drugi trafia dokładnie TT + osłona − 1. */
async function strzalTuzPod({ targetName }) {
  const MOD = "neuroshima-2026-overrides";
  const actor = game.user.character;
  const gun = actor.items.find(i => i.type === "weapon");
  const attack = gun.system.activities.find(a => a.type === "attack");
  const target = canvas.tokens.placeables.find(t => t.name === targetName);
  canvas.tokens.placeables.find(t => t.actor?.id === actor.id)?.control({ releaseOthers: true });
  canvas.tokens.setTargets([target.id]);
  const strzal = async d20 => {
    const orig = CONFIG.Dice.randomUniform;
    CONFIG.Dice.randomUniform = () => (20.5 - d20) / 20;
    try {
      let usage = null;
      for (let i = 0; i < 20 && !usage; i++) {
        usage = await attack.use({ subsequentActions: false }, { configure: false }, {});
        if (!usage) await new Promise(r => setTimeout(r, 250));
      }
      if (!usage) throw new Error("attack.use() was cancelled every time");
      await attack.rollAttack({}, { configure: false }, { data: { system: { origin: usage.message.id } } });
      const m = game.messages.contents.findLast(x => x._source.system?.origin === usage.message.id && x.flags[MOD]?.obrona);
      const o = m.flags[MOD].obrona;
      const e = o.targets[0];
      return { messageId: m.id, total: o.total, natural: o.natural, prog: (e.tt ?? 0) + (e.cover ?? 0), verdict: e.verdict };
    } finally {
      CONFIG.Dice.randomUniform = orig;
    }
  };
  const proba = await strzal(10);
  const mod = proba.total - proba.natural;
  const d20 = proba.prog - 1 - mod;
  if (d20 < 2 || d20 > 19) return { ...proba, d20, niemozliwe: true };
  return { ...(await strzal(d20)), d20, mod };
}

/**
 * Dowolny klient: przyciski pod kartą i czy karta zastąpiona. `t.waitFor` czeka na wynik prawdziwy — więc `null`, dopóki
 * karty nie ma w czacie, a z `czekaNa` — dopóki nie ma tego przycisku (albo „zastapiona”).
 */
function pasek({ messageId, czekaNa = null }) {
  const el = ui.chat.element?.querySelector(`[data-message-id="${messageId}"]`);
  const m = game.messages.get(messageId);
  if (!el || !m) return null;
  const r = {
    przyciski: [...el.querySelectorAll("[data-neuro-po-rzucie]")].map(b => ({ id: b.dataset.neuroPoRzucie, disabled: b.disabled, text: b.textContent })),
    zastapiona: !!game.neuroshima.poRzucie.zastapionaPrzez(m)
  };
  if (czekaNa === "zastapiona") return r.zastapiona ? r : null;
  if (czekaNa) return r.przyciski.some(b => b.id === czekaNa) ? r : null;
  return r;
}

/** Gracz 1: klik w przycisk źródła pod kartą, kości wymuszone; zwraca nową kartę łańcucha. */
async function kliknij({ messageId, zrodlo, uniform }) {
  const MOD = "neuroshima-2026-overrides";
  let btn = null;
  for (let i = 0; i < 40 && !btn; i++) {
    await new Promise(r => setTimeout(r, 150));
    btn = ui.chat.element?.querySelector(`[data-message-id="${messageId}"] [data-neuro-po-rzucie="${zrodlo}"]`);
  }
  if (!btn) return { przycisk: false };
  const orig = CONFIG.Dice.randomUniform;
  CONFIG.Dice.randomUniform = () => uniform;
  try {
    btn.click();
    let nowa = null;
    for (let i = 0; i < 40 && !nowa; i++) {
      await new Promise(r => setTimeout(r, 150));
      nowa = game.messages.contents.find(m => m.flags?.[MOD]?.poRzucie?.poprzednieId === messageId);
    }
    return { przycisk: true, nowa: nowa?.id ?? null, total: nowa?.rolls?.[0]?.total ?? null, verdict: nowa?.flags?.[MOD]?.obrona?.targets?.[0]?.verdict ?? null };
  } finally {
    CONFIG.Dice.randomUniform = orig;
  }
}

/** GM: stan Cwaniaka — użycia i znacznik Reakcji; szepty naruszenia od `od`. `null`, dopóki Reakcji nie ma `reakcje`. */
function stanCwaniaka({ od = 0, reakcje = 0, naruszenia = 0 } = {}) {
  const MOD = "neuroshima-2026-overrides";
  const a = game.actors.getName("PC Gracz 1");
  const u = id => a.items.find(i => i.getFlag(MOD, "abilityId") === id)?.system.uses.value ?? null;
  const zn = game.neuroshima.actions.znacznik(a, "R");
  const r = {
    motywacja: u("motywacja"), spieprzysz: u("spieprzysz-to"),
    reakcja: zn ? (zn.getFlag(MOD, "akcjaZuzyta")?.uzycia ?? []).map(x => x.zrodlo) : [],
    naruszenia: game.messages.contents.filter(m => m.timestamp >= od && m.flags?.[MOD]?.naruszenie).length
  };
  return r.reakcja.length >= reakcje && r.naruszenia >= naruszenia ? r : null;
}

/** GM: jawny RO BN (ST 10) z wymuszoną kością. */
async function roBn({ name, d20 }) {
  const tok = canvas.scene.tokens.find(t => t.name === name);
  const orig = CONFIG.Dice.randomUniform;
  CONFIG.Dice.randomUniform = () => (20.5 - d20) / 20;
  try {
    await tok.actor.rollSavingThrow({ ability: "con", target: 10 }, { configure: false }, { create: true });
  } finally {
    CONFIG.Dice.randomUniform = orig;
  }
  const m = game.messages.contents.at(-1);
  return { messageId: m.id, total: m.rolls[0].total, t: Date.now() };
}

export default {
  name: "zdolnosci-po-rzucie",
  clients: ["gm", "Gracz 1", "Gracz 2"],

  async run(t) {
    const p1 = t.client("Gracz 1");
    const p2 = t.client("Gracz 2");
    for (const p of [p1, p2]) {
      await t.waitFor(p, () => Boolean(game.user.character && canvas.tokens?.placeables.some(tk => tk.isOwner)),
        { message: "the player's client to see the fixture" });
    }

    await t.step("GM: PC Gracz 1 gets Motywacja and Spieprzysz to!; combat, Gracz 2 on turn", async () => {
      const r = await t.gm.eval(przygotuj);
      t.assert(r.items.every(Boolean), "both features on the Cwaniak", r);
      t.assert(r.uzycia.every(u => u >= 1), "at least one use each (CHA mod)", r);
      t.equal(r.naRuchu, "PC Gracz 2", "combatant on turn");
      t.assert(r.dystans !== null && r.dystans <= 18, "the NPC within 18 m of the Cwaniak", r);
    });

    const atak = await t.step("Gracz 2 shoots the NPC and misses by exactly 1", async () => {
      await t.waitFor(p2, () => game.combat?.combatant?.name === "PC Gracz 2", { message: "Gracz 2 to see their turn" });
      const s = await p2.eval(strzalTuzPod, { targetName: "GANGUS ŻOŁNIERZ" });
      t.assert(!s.niemozliwe, "a d20 that misses by one exists for this weapon and target", s);
      t.equal(s.verdict, "pudło", "verdict before Motywacja");
      t.equal(s.total, s.prog - 1, "missed by one");
      return s;
    });

    await t.step("Gracz 2 has no Motywacja button; Gracz 1 (another client) does", async () => {
      const b2 = await t.waitFor(p2, pasek, { args: [{ messageId: atak.messageId }], message: "Gracz 2's card" });
      t.assert(!b2.przyciski.some(b => b.id === "motywacja"), "no Motywacja for the roller", b2);
      const b1 = await t.waitFor(p1, pasek, { args: [{ messageId: atak.messageId, czekaNa: "motywacja" }], message: "Motywacja under Gracz 2's card in Gracz 1's chat" });
      t.assert(!b1.przyciski.find(b => b.id === "motywacja").disabled, "button active", b1);
    });

    await t.step("Gracz 1 clicks Motywacja → new attack card hits; old card superseded; use spent; Reaction marked", async () => {
      const r = await p1.eval(kliknij, { messageId: atak.messageId, zrodlo: "motywacja", uniform: 0.00001 });
      t.assert(r.przycisk && r.nowa, "the click made a new card", r);
      t.equal(r.total, atak.total + 6, "+1d6 (forced 6)");
      const nowaGm = await t.waitFor(t.gm, ({ id }) => game.messages.get(id)?.flags?.["neuroshima-2026-overrides"]?.obrona?.targets?.[0]?.verdict ?? null,
        { args: [{ id: r.nowa }], message: "the GM sees the new card's verdict" });
      t.equal(nowaGm, "trafienie", "verdict after Motywacja");
      for (const p of [p1, p2]) {
        await t.waitFor(p, pasek, { args: [{ messageId: atak.messageId, czekaNa: "zastapiona" }], message: "old card superseded" });
      }
      const s = await t.waitFor(t.gm, stanCwaniaka, { args: [{ reakcje: 1 }], message: "Reaction marked" });
      t.equal(s.motywacja, 0, "Motywacja use spent");
      t.equal(s.reakcja.join(), "Motywacja", "Reaction marker source");
    });

    await t.step("GM: public NPC save succeeds; Gracz 1 → Spieprzysz to! → reroll, the worse stays; second Reaction → GM whisper", async () => {
      const ro = await t.gm.eval(roBn, { name: "GANGUS ŻOŁNIERZ", d20: 18 });
      t.assert(ro.total >= 10, "the NPC passed", ro);
      await t.waitFor(p1, pasek, { args: [{ messageId: ro.messageId, czekaNa: "spieprzysz-to" }], message: "Spieprzysz to! under the NPC save in Gracz 1's chat" });
      const r = await p1.eval(kliknij, { messageId: ro.messageId, zrodlo: "spieprzysz-to", uniform: 0.9 });
      t.assert(r.przycisk && r.nowa, "the click made a new card", r);
      t.assert(r.total < 10, "the worse result fails the save", r);
      const s = await t.waitFor(t.gm, stanCwaniaka, { args: [{ od: ro.t - 1000, reakcje: 2, naruszenia: 1 }], message: "second Reaction on the marker and a violation whisper (D5)" });
      t.equal(s.spieprzysz, 0, "Spieprzysz to! use spent");
      t.equal(s.reakcja.join(), "Motywacja,Spieprzysz to!", "both on one marker");
    });
  }
};
