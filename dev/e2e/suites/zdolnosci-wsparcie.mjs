/**
 * Suite — wsparcie sojusznika (PLAN_m7 E2, R7). Gotowe, gdy (plan §6): Dobra rada na cudzym aktorze, wygasa na
 * początku tury dającego.
 *
 *  - GM: PC Gracz 1 (INT 16) dostaje Dobrą radę z paczki; walka, Gracz 1 na ruchu.
 *  - Gracz 1 celuje w żeton PC Gracz 2 i używa Dobrej rady [B] — efekt ląduje na **cudzym** aktorze (przekaźnik MG),
 *    znacznik Akcji Bonusowej na PC Gracz 1.
 *  - Gracz 2 rzuca RO i widzi „Dobra rada +3” pod swoją kartą (D11); klik → +3, efekt znika (jeden rzut).
 *  - Drugi raz (MG odnawia użycie): bez użycia efekt trwa przez cudze tury i znika na początku następnej tury PC
 *    Gracz 1 (pseudo-wygasanie `sourceStart`).
 */

/* Functions below run in the browser (serialised): no closures over this file. */

/** GM: Dobra rada dla PC Gracz 1 (INT 16); walka, Gracz 1 na ruchu. */
async function przygotuj() {
  const MOD = "neuroshima-2026-overrides";
  const docs = await game.packs.get(`${MOD}.zdolnosci-klasowe`).getDocuments();
  const spec = game.actors.getName("PC Gracz 1");
  await spec.update({ "system.abilities.int.value": 16 });
  await spec.createEmbeddedDocuments("Item", [game.items.fromCompendium(docs.find(d => d.getFlag(MOD, "abilityId") === "dobra-rada"))]);
  for (const c of game.combats.contents) await c.delete();
  const scene = canvas.scene;
  const combat = await Combat.implementation.create({ scene: scene.id, active: true });
  await combat.createEmbeddedDocuments("Combatant", scene.tokens.map((tk, i) => ({ tokenId: tk.id, sceneId: scene.id, actorId: tk.actorId, initiative: 20 - i })));
  await combat.startCombat();
  await combat.update({ turn: combat.turns.findIndex(c => c.name === "PC Gracz 1") });
  const item = spec.items.find(i => i.getFlag(MOD, "abilityId") === "dobra-rada");
  return { item: !!item, uzycia: item?.system.uses.value ?? null, naRuchu: combat.combatant?.name };
}

/** Gracz 1: wyceluj PC Gracz 2 i użyj Dobrej rady. */
async function dajRade() {
  const MOD = "neuroshima-2026-overrides";
  const actor = game.user.character;
  const item = actor.items.find(i => i.getFlag(MOD, "abilityId") === "dobra-rada");
  const act = item.system.activities.contents?.[0] ?? [...item.system.activities][0];
  const cel = canvas.tokens.placeables.find(t => t.actor?.name === "PC Gracz 2");
  canvas.tokens.setTargets([cel.id]);
  const res = await act.use({}, { configure: false }, {});
  return { uzyte: !!res };
}

/** Dowolny klient: efekt Dobrej rady na PC Gracz 2 (null, dopóki go nie ma — chyba że `brak`). */
function efekt({ brak = false } = {}) {
  const MOD = "neuroshima-2026-overrides";
  const e = game.actors.getName("PC Gracz 2").effects.find(x => x.getFlag(MOD, "dobraRada"));
  if (brak) return e ? null : { brak: true };
  return e ? { bonus: e.getFlag(MOD, "dobraRada").bonus, expiry: e._source.duration.expiry, zrodlo: e.getSourceActor()?.name ?? null } : null;
}

/** GM: znacznik Akcji Bonusowej na PC Gracz 1. */
function znacznikB() {
  const z = game.neuroshima.actions.znacznik(game.actors.getName("PC Gracz 1"), "B");
  return z ? { zrodla: (z.getFlag("neuroshima-2026-overrides", "akcjaZuzyta")?.uzycia ?? []).map(u => u.zrodlo) } : null;
}

/** Gracz 2: RO na MDR, czeka na przycisk Dobrej rady pod kartą, klika. */
async function roIRada() {
  const MOD = "neuroshima-2026-overrides";
  const a = game.user.character;
  await a.rollSavingThrow({ ability: "wis" }, { configure: false }, { create: true });
  const src = game.messages.contents.findLast(m => m.speaker.actor === a.id && m.type === "save");
  let btn = null;
  for (let i = 0; i < 40 && !btn; i++) {
    await new Promise(r => setTimeout(r, 150));
    btn = ui.chat.element?.querySelector(`[data-message-id="${src.id}"] [data-neuro-po-rzucie="dobra-rada"]`);
  }
  if (!btn) return { przycisk: false };
  const etykieta = btn.textContent;
  btn.click();
  let nowa = null;
  for (let i = 0; i < 40 && !nowa; i++) {
    await new Promise(r => setTimeout(r, 150));
    nowa = game.messages.contents.find(m => m.flags?.[MOD]?.poRzucie?.poprzednieId === src.id);
  }
  return { przycisk: true, etykieta, przed: src.rolls[0].total, po: nowa?.rolls?.[0]?.total ?? null };
}

/** GM: odnów użycie Dobrej rady. */
async function odnow() {
  const item = game.actors.getName("PC Gracz 1").items.find(i => i.getFlag("neuroshima-2026-overrides", "abilityId") === "dobra-rada");
  await item.update({ "system.uses.spent": 0 });
  return true;
}

/** GM: następna tura; zwraca, kto na ruchu. */
async function nastepnaTura() {
  await game.combat.nextTurn();
  return { naRuchu: game.combat.combatant?.name, runda: game.combat.round, uczestnikow: game.combat.turns.length };
}

export default {
  name: "zdolnosci-wsparcie",
  clients: ["gm", "Gracz 1", "Gracz 2"],

  async run(t) {
    const p1 = t.client("Gracz 1");
    const p2 = t.client("Gracz 2");
    for (const p of [p1, p2]) {
      await t.waitFor(p, () => Boolean(game.user.character && canvas.tokens?.placeables.some(tk => tk.isOwner)),
        { message: "the player's client to see the fixture" });
    }

    await t.step("GM: PC Gracz 1 gets Dobra rada (INT 16); combat, Gracz 1 on turn", async () => {
      const r = await t.gm.eval(przygotuj);
      t.assert(r.item && r.uzycia >= 1, "the feature with a use", r);
      t.equal(r.naRuchu, "PC Gracz 1", "combatant on turn");
    });

    await t.step("Gracz 1 gives Dobra rada to PC Gracz 2 (not theirs) → effect via the GM relay; BA marked", async () => {
      await t.waitFor(p1, () => game.combat?.combatant?.name === "PC Gracz 1", { message: "Gracz 1 to see their turn" });
      const r = await p1.eval(dajRade);
      t.assert(r.uzyte, "activity used", r);
      const e = await t.waitFor(t.gm, efekt, { message: "the effect on PC Gracz 2" });
      t.equal(e.bonus, 3, "+INT mod of the giver");
      t.equal(e.expiry, "sourceStart", "until the start of the giver's next turn");
      t.equal(e.zrodlo, "PC Gracz 1", "source actor");
      const b = await t.waitFor(t.gm, znacznikB, { message: "Bonus Action marker on PC Gracz 1" });
      t.assert(b.zrodla.length === 1, "one BA use", b);
    });

    await t.step("Gracz 2 rolls a save → „Dobra rada +3” under it → +3, the effect is spent", async () => {
      await t.waitFor(p2, efekt, { message: "Gracz 2 to see the effect" });
      const r = await p2.eval(roIRada);
      t.assert(r.przycisk, "button under Gracz 2's own save", r);
      t.assert(/\+3/.test(r.etykieta) && /PC Gracz 1/.test(r.etykieta), "label names the bonus and the giver", r);
      t.equal(r.po, r.przed + 3, "+3 on the new card");
      await t.waitFor(t.gm, efekt, { args: [{ brak: true }], message: "the effect gone after one roll" });
    });

    await t.step("unused advice outlives other turns and expires at the start of Gracz 1's next turn", async () => {
      await t.gm.eval(odnow);
      await p1.eval(dajRade);
      await t.waitFor(t.gm, efekt, { message: "second advice on PC Gracz 2" });
      let tura = await t.gm.eval(nastepnaTura);
      for (let i = 1; i < tura.uczestnikow; i++) {
        t.assert(tura.naRuchu !== "PC Gracz 1", "still someone else's turn", tura);
        t.assert(await t.gm.eval(efekt), `effect still there on ${tura.naRuchu}'s turn`);
        tura = await t.gm.eval(nastepnaTura);
      }
      t.equal(tura.naRuchu, "PC Gracz 1", "the giver's next turn");
      await t.waitFor(t.gm, efekt, { args: [{ brak: true }], message: "expired at the giver's turn start" });
    });
  }
};
