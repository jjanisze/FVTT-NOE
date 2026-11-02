/**
 * Suite — Sztuczki z atakami i przyciskami (PLAN_beta krok 8b). GM i jeden gracz; każdy krok tak, jak przy stole.
 *
 *  - GM: PC Gracz 1 dostaje z kompendium Nożownika, Barbarkę i Robin Hooda, sztylet w ręce, SIŁ 20; BN tuż obok
 *    (SIŁ 1). Walka, Gracz 1 na ruchu.
 *  - Gracz 1 trafia BN-a sztyletem → pod kartą „Nożownik [B]”; Shift+klik → drugi atak sztyletem w ten cel, werdykt
 *    „krytyk” z Nożownika, znacznik Akcji Bonusowej.
 *  - Gracz 1 uderza „Z baśki” (Akcja Bonusowa Barbarki) → werdykt „krytyk”; przycisk „Wyjaśnić ci?” → RO BN-a na Siłę
 *    rzuca MG → Powalenie.
 *  - Gracz 1 używa Celowania (Robin Hood) z BN-em na celowniku → zapowiedź na atakującym: Ułatwienie z łuku albo kuszy.
 */

/* Functions below run in the browser (serialised): no closures over this file. */

/** GM: Sztuczki i sztylet PC Gracz 1, BN obok, walka z Graczem 1 na ruchu. */
async function przygotuj() {
  const MOD = "neuroshima-2026-overrides";
  if (game.messages.size) await ChatMessage.deleteDocuments(game.messages.map(m => m.id));
  for (const c of game.combats.contents) await c.delete();
  const sz = await game.packs.get(`${MOD}.sztuczki`).getDocuments();
  const bron = await game.packs.get(`${MOD}.bron`).getDocuments();
  const p1 = game.actors.getName("PC Gracz 1");
  await p1.update({ "system.abilities.str.value": 20 });
  await p1.createEmbeddedDocuments("Item", ["nozownik", "barbarka", "robinHood"]
    .map(k => game.items.fromCompendium(sz.find(d => d.getFlag(MOD, "sztuczka") === k))));
  const [sztylet] = await p1.createEmbeddedDocuments("Item", [game.items.fromCompendium(bron.find(d => d.getFlag(MOD, "weaponId") === "sztylet"))]);
  const lalka = game.neuroshima.lalka;
  for (const h of lalka.heldItems(p1)) if (h.item) await lalka.place(p1, h.item, "pack");
  await lalka.place(p1, sztylet, "hand");
  const scene = canvas.scene;
  const t1 = scene.tokens.find(t => t.actor?.id === p1.id);
  const npc = scene.tokens.find(t => !t.actor?.hasPlayerOwner && t.actor?.type === "npc");
  await npc.actor.update({ "system.abilities.str.value": 1 });
  await npc.move({ x: t1.x + scene.grid.size, y: t1.y, action: "displace" });
  const combat = await Combat.implementation.create({ scene: scene.id, active: true });
  await combat.createEmbeddedDocuments("Combatant", [t1, npc].map((tk, i) => ({ tokenId: tk.id, sceneId: scene.id, actorId: tk.actorId, initiative: 20 - i })));
  await combat.startCombat();
  await combat.update({ turn: combat.turns.findIndex(c => c.actorId === p1.id) });
  return { npc: npc.name, naRuchu: combat.combatant?.name, wRekach: lalka.heldItems(p1).map(h => h.item?.name ?? null) };
}

/** Gracz 1: atak aktywnością (sztylet albo Sztuczka) w BN-a, ustalona naturalna 19; karta ataku. */
async function atak({ npc, item, akcja = null }) {
  const MOD = "neuroshima-2026-overrides";
  const actor = game.user.character;
  const it = actor.items.find(i => i.name === item);
  const activity = akcja ? it.system.activities.find(a => a.name === akcja) : it.system.activities.find(a => a.type === "attack");
  canvas.tokens.placeables.find(t => t.actor?.id === actor.id)?.control({ releaseOthers: true });
  canvas.tokens.setTargets([canvas.tokens.placeables.find(t => t.name === npc).id]);
  const usage = await activity.use({ subsequentActions: false }, { configure: false }, {});
  const link = { data: { system: { origin: usage.message.id } } };
  const orig = CONFIG.Dice.randomUniform;
  CONFIG.Dice.randomUniform = () => 0.07;
  try {
    await activity.rollAttack({ attackMode: "oneHanded" }, { configure: false }, link);
  } finally {
    CONFIG.Dice.randomUniform = orig;
  }
  const msg = game.messages.contents.findLast(m => m._source.system?.origin === usage.message.id && m.flags[MOD]?.obrona);
  const cel = msg?.flags[MOD]?.obrona?.targets?.[0];
  return { messageId: msg?.id ?? null, verdict: cel?.verdict ?? null, autoKrytyk: cel?.autoKrytyk ?? null };
}

/** Gracz 1: Shift+klik „Nożownik [B]” pod kartą; karta drugiego ataku (ustalona 19). */
async function nozownikKlik({ messageId }) {
  const MOD = "neuroshima-2026-overrides";
  const btn = await window.__e2e.until(() => ui.chat.element?.querySelector(`[data-message-id="${messageId}"] [data-neuro-m7-dodatkowy="nozownik"]`),
    { message: "the Nożownik button" });
  const przed = game.messages.size;
  const orig = CONFIG.Dice.randomUniform;
  CONFIG.Dice.randomUniform = () => 0.07;
  let atak = null;
  try {
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, shiftKey: true }));
    atak = await window.__e2e.until(() => game.messages.contents.slice(przed)
      .find(m => m.flags[MOD]?.obrona && m.getOriginatingMessage?.()?.getFlag(MOD, "dodatkowyAtak") === "nozownik"), { message: "the second knife attack" });
  } finally {
    CONFIG.Dice.randomUniform = orig;
  }
  const cel = atak.flags[MOD].obrona.targets[0];
  return { verdict: cel.verdict, autoKrytyk: cel.autoKrytyk };
}

/** GM: znacznik Akcji Bonusowej PC Gracz 1 i jego zapowiedzi. */
function stanGracza1() {
  const MOD = "neuroshima-2026-overrides";
  const a = game.actors.getName("PC Gracz 1");
  const z = game.neuroshima.actions.znacznik(a, "B");
  return {
    b: z ? (z.getFlag(MOD, "akcjaZuzyta")?.uzycia ?? []).map(u => u.zrodlo) : null,
    zapowiedzi: (a.getFlag(MOD, "zapowiedzianyAtak") ?? []).map(w => w.ulatwienie ?? w.autoKrytyk)
  };
}

/** GM: kości MG na najniższe (RO BN-a przy Wyjaśnić ci?) — zwraca nic; `przywroc` oddaje losowość. */
function koscMG({ przywroc = false }) {
  if (przywroc) CONFIG.Dice.randomUniform = window.__e2eOrigUniform ?? CONFIG.Dice.randomUniform;
  else {
    window.__e2eOrigUniform = CONFIG.Dice.randomUniform;
    CONFIG.Dice.randomUniform = () => 0.99;
  }
  return true;
}

/** Gracz 1: klik „Wyjaśnić ci?” pod kartą Z baśki. */
async function wyjasnicKlik({ messageId }) {
  const btn = await window.__e2e.until(() => ui.chat.element?.querySelector(`[data-message-id="${messageId}"] [data-neuro-sztuczka="powalenie"]`),
    { message: "the Wyjaśnić ci? button" });
  const etykieta = btn.textContent;
  btn.click();
  return { etykieta };
}

/** Gracz 1: Celowanie (Robin Hood) z BN-em na celowniku. */
async function celowanie({ npc }) {
  const actor = game.user.character;
  const rh = actor.items.find(i => i.getFlag("neuroshima-2026-overrides", "sztuczka") === "robinHood");
  canvas.tokens.setTargets([canvas.tokens.placeables.find(t => t.name === npc).id]);
  await rh.system.activities.find(a => a.name === "Celowanie").use({}, { configure: false }, {});
  return true;
}

export default {
  name: "sztuczki-ataki",
  clients: ["gm", "Gracz 1"],

  async run(t) {
    const p1 = t.client("Gracz 1");
    await t.waitFor(p1, () => Boolean(game.user.character && ui.chat?.element), { message: "the player's client to see the fixture" });

    let fx;
    await t.step("GM: PC Gracz 1 takes Nożownik, Barbarka and Robin Hood, a dagger in hand; an NPC next to them; combat", async () => {
      fx = await t.gm.eval(przygotuj);
      t.equal(fx.naRuchu, "PC Gracz 1", "PC Gracz 1 on turn");
      t.assert(fx.wRekach.some(n => /sztylet/i.test(n ?? "")), "dagger in hand", fx);
    });

    await t.step("Dagger hit → Nożownik [B] → second dagger attack at the same target is a critical, Bonus Action marked", async () => {
      const a = await p1.eval(atak, { npc: fx.npc, item: "Sztylet" });
      t.assert(["trafienie", "krytyk"].includes(a.verdict), "first attack hits", a);
      const n = await p1.eval(nozownikKlik, { messageId: a.messageId });
      t.equal(n.verdict, "krytyk", "critical from Nożownik");
      t.assert(/Nożownik/.test(n.autoKrytyk ?? ""), "the reason is Nożownik", n);
      const s = await t.waitFor(t.gm, () => {
        const z = game.neuroshima.actions.znacznik(game.actors.getName("PC Gracz 1"), "B");
        return z ? true : null;
      }, { message: "the Bonus Action marker" });
      t.assert(s, "Bonus Action marked");
    });

    await t.step("Z baśki (Barbarka, Bonus Action) → critical; Wyjaśnić ci? → the GM rolls the NPC's STR save → Prone", async () => {
      const a = await p1.eval(atak, { npc: fx.npc, item: "Barbarka", akcja: "Z baśki" });
      t.equal(a.verdict, "krytyk", "Z baśki is a critical on a hit");
      await t.gm.eval(koscMG, { przywroc: false });
      try {
        const w = await p1.eval(wyjasnicKlik, { messageId: a.messageId });
        t.assert(/ST \d+/.test(w.etykieta), "the button names the DC", w);
        const lezy = await t.waitFor(t.gm, ({ npc }) => (canvas.tokens.placeables.find(x => x.name === npc)?.actor?.statuses?.has("prone") ? true : null),
          { args: [{ npc: fx.npc }], message: "the NPC knocked prone" });
        t.assert(lezy, "NPC prone");
      } finally {
        await t.gm.eval(koscMG, { przywroc: true });
      }
    });

    await t.step("Celowanie (Robin Hood) with the NPC targeted → a pending advantage on the next bow or crossbow attack", async () => {
      await p1.eval(celowanie, { npc: fx.npc });
      const s = await t.waitFor(t.gm, () => {
        const MOD = "neuroshima-2026-overrides";
        const z = game.actors.getName("PC Gracz 1").getFlag(MOD, "zapowiedzianyAtak") ?? [];
        return z.some(w => w.ulatwienie) ? z.map(w => w.ulatwienie ?? w.autoKrytyk) : null;
      }, { message: "the Celowanie note" });
      t.assert(s.some(x => /Celowanie/.test(x ?? "")), "Celowanie pending", s);
    });
  }
};
