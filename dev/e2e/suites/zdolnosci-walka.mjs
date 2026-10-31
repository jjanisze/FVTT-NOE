/**
 * Suite — walka z kontekstem (PLAN_m7 E4, R4 + R5). Gotowe, gdy (plan §6): Ulubiona broń, Mój wróg, Rzeźnik.
 *
 *  - GM: PC Gracz 1 dostaje Ulubioną broń (Twardziel; B 92 już wybrany), Rzeźnika i Mój wróg: Ludzie; B 92 w ręce,
 *    druga pusta. Walka, Gracz 1 na ruchu.
 *  - Gracz 1 strzela do BN-a (Człowiek): Test Ataku z +1 Mojego wroga (plakietka), obrażenia +1k6 i +3 Rzeźnika.
 *  - Pod kartą ataku — „Ulubiona broń [B]”; Shift+klik → drugi atak tą bronią (karta użycia z flagą), znacznik Akcji
 *    Bonusowej; karta dodatkowego ataku nie ma już przycisku.
 *  - GM wkłada nóż do drugiej ręki → obrażenia B 92 bez Rzeźnika.
 *  - Dwóch na jednego (D13): PC Gracz 2 (Ganger) — po ataku wręcz PC Gracz 1 na tego samego BN-a jego atak wręcz ma +2;
 *    na innego BN-a — nie.
 *  - Bolesny atak (E5): BN obok PC Gracz 2, PC Gracz 1 strzela z bliska (zwykły rzut) — pod trafieniem przycisk z kośćmi
 *    i dymkiem sojusznika; klik → karta obrażeń, przycisk Podstępnego ataku gaśnie razem z nim (raz na turę).
 */

/* Functions below run in the browser (serialised): no closures over this file. */

/** GM: zdolności i ręce PC Gracz 1, Ganger PC Gracz 2, noże; walka, Gracz 1 na ruchu. */
async function przygotuj() {
  const MOD = "neuroshima-2026-overrides";
  const cechy = await game.packs.get(`${MOD}.zdolnosci-klasowe`).getDocuments();
  const bronie = await game.packs.get(`${MOD}.bron`).getDocuments();
  const z = id => game.items.fromCompendium(cechy.find(d => d.getFlag(MOD, "abilityId") === id));
  const noz = () => game.items.fromCompendium(bronie.find(d => d.type === "weapon" && d.system.type?.value === "biala"
    && !d.system.properties?.has?.("two")));
  const tw = game.actors.getName("PC Gracz 1");
  const gang = game.actors.getName("PC Gracz 2");
  await tw.createEmbeddedDocuments("Item", [z("ulubiona-bron-twardziel"), z("rzeznik"), z("moj-wrog-ludzie"), noz()]);
  await gang.createEmbeddedDocuments("Item", [z("dwoch-na-jednego"), noz()]);
  const gun = tw.items.find(i => i.getFlag(MOD, "weaponId") === "b92");
  const lalka = game.neuroshima.lalka;
  for (const h of lalka.heldItems(tw)) if (h.item && h.item.id !== gun.id) await lalka.place(tw, h.item, "pack");
  if (!lalka.handOf(gun)) await lalka.place(tw, gun, "hand");
  const ulubiona = tw.items.find(i => i.getFlag(MOD, "abilityId") === "ulubiona-bron-twardziel");
  await ulubiona.setFlag(MOD, "ulubione", [{ model: game.neuroshima.ulubionaBron.model(gun), nazwa: gun.name }]);
  for (const c of game.combats.contents) await c.delete();
  const scene = canvas.scene;
  const combat = await Combat.implementation.create({ scene: scene.id, active: true });
  await combat.createEmbeddedDocuments("Combatant", scene.tokens.map((tk, i) => ({ tokenId: tk.id, sceneId: scene.id, actorId: tk.actorId, initiative: 20 - i })));
  await combat.startCombat();
  await combat.update({ turn: combat.turns.findIndex(c => c.name === "PC Gracz 1") });
  const npc = scene.tokens.filter(tk => !tk.actor?.hasPlayerOwner).map(tk => ({ name: tk.name, typ: tk.actor?.system?.details?.type?.value ?? null }));
  return {
    naRuchu: combat.combatant?.name, wRekach: lalka.heldItems(tw).map(h => h.item?.name ?? null), npc,
    ulubione: game.neuroshima.ulubionaBron.lista(tw)
  };
}

/** Gracz 1: strzał z B 92 do BN-a — atak i obrażenia z tej samej karty użycia. */
async function strzal({ targetName, obrazenia = true }) {
  const MOD = "neuroshima-2026-overrides";
  const actor = game.user.character;
  const gun = actor.items.find(i => i.getFlag(MOD, "weaponId") === "b92");
  const attack = gun.system.activities.find(a => a.type === "attack");
  const target = canvas.tokens.placeables.find(t => t.name === targetName);
  canvas.tokens.placeables.find(t => t.actor?.id === actor.id)?.control({ releaseOthers: true });
  canvas.tokens.setTargets([target.id]);
  let usage = null;
  for (let i = 0; i < 20 && !usage; i++) {
    usage = await attack.use({ subsequentActions: false }, { configure: false }, {});
    if (!usage) await new Promise(r => setTimeout(r, 250));
  }
  if (!usage) throw new Error("attack.use() was cancelled every time");
  const link = { data: { system: { origin: usage.message.id } } };
  const [a] = await attack.rollAttack({}, { configure: false }, link);
  const d = obrazenia ? (await attack.rollDamage({}, { configure: false }, link))?.[0] : null;
  const msg = game.messages.contents.findLast(m => m._source.system?.origin === usage.message.id && m.flags[MOD]?.obrona);
  return {
    messageId: msg?.id ?? null,
    premieAtaku: (a?.options?.neuroPremie ?? []).map(p => `${p.id}:${p.wartosc}`),
    premieObrazen: (d?.options?.neuroPremie ?? []).map(p => `${p.id}:${p.wartosc}`),
    formulaObrazen: d?.formula ?? null
  };
}

/** Gracz 1: przycisk „Ulubiona broń” pod kartą (czeka), Shift+klik; zwraca kartę dodatkowego ataku. */
async function ulubionaKlik({ messageId }) {
  const MOD = "neuroshima-2026-overrides";
  const sel = `[data-message-id="${messageId}"] [data-neuro-m7-dodatkowy="ulubiona"]`;
  let btn = null;
  for (let i = 0; i < 40 && !btn; i++) {
    await new Promise(r => setTimeout(r, 150));
    btn = ui.chat.element?.querySelector(sel);
  }
  if (!btn) return { przycisk: false };
  const etykieta = btn.textContent;
  const przed = game.messages.size;
  btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, shiftKey: true }));
  let atak = null;
  for (let i = 0; i < 60 && !atak; i++) {
    await new Promise(r => setTimeout(r, 150));
    atak = game.messages.contents.slice(przed).find(m => m.flags[MOD]?.obrona && m.getOriginatingMessage?.()?.getFlag(MOD, "dodatkowyAtak"));
  }
  if (!atak) return { przycisk: true, etykieta, atak: null };
  let bezPrzycisku = false;
  for (let i = 0; i < 20 && !bezPrzycisku; i++) {
    await new Promise(r => setTimeout(r, 150));
    const el = ui.chat.element?.querySelector(`[data-message-id="${atak.id}"]`);
    bezPrzycisku = !!el && !el.querySelector("[data-neuro-m7-dodatkowy]");
  }
  return {
    przycisk: true, etykieta, atak: atak.id, rodzaj: atak.getOriginatingMessage().getFlag(MOD, "dodatkowyAtak"),
    bezPrzycisku, staryWylaczony: !!ui.chat.element?.querySelector(sel)?.disabled
  };
}

/** GM: znacznik Akcji Bonusowej aktora. */
function znacznikB({ name }) {
  const z = game.neuroshima.actions.znacznik(game.actors.getName(name), "B");
  return z ? { zrodla: (z.getFlag("neuroshima-2026-overrides", "akcjaZuzyta")?.uzycia ?? []).map(u => u.zrodlo) } : null;
}

/** GM: nóż do drugiej ręki PC Gracz 1. */
async function nozDoReki() {
  const tw = game.actors.getName("PC Gracz 1");
  const noz = tw.items.find(i => i.type === "weapon" && i.system.type?.value === "biala");
  await game.neuroshima.lalka.place(tw, noz, "hand");
  return { wRekach: game.neuroshima.lalka.heldItems(tw).map(h => h.item?.name ?? null) };
}

/** GM: atak wręcz nożem `kto` w BN-a `cel` (GM celuje); zwraca premie ataku. */
async function atakWrecz({ kto, cel }) {
  const actor = game.actors.getName(kto);
  const noz = actor.items.find(i => i.type === "weapon" && i.system.type?.value === "biala");
  const attack = noz.system.activities.find(a => a.type === "attack");
  canvas.tokens.setTargets([canvas.tokens.placeables.find(t => t.name === cel).id]);
  const [roll] = await attack.rollAttack({ attackMode: "oneHanded" }, { configure: false }, { create: true });
  const msg = game.messages.contents.at(-1);
  return {
    melee: msg.flags["neuroshima-2026-overrides"]?.obrona?.melee ?? null,
    chwila: msg.flags["neuroshima-2026-overrides"]?.obrona?.chwila ?? null,
    premie: (roll?.options?.neuroPremie ?? []).map(p => `${p.id}:${p.wartosc}`)
  };
}

/** GM: Bolesny i Podstępny atak dla PC Gracz 1; BN obok PC Gracz 2, 3 pola od PC Gracz 1; Gracz 1 na ruchu. */
async function ustawBolesny({ cel }) {
  const MOD = "neuroshima-2026-overrides";
  const cechy = await game.packs.get(`${MOD}.zdolnosci-klasowe`).getDocuments();
  const tw = game.actors.getName("PC Gracz 1");
  await tw.createEmbeddedDocuments("Item", ["bolesny-atak", "podstepny-atak"]
    .map(id => game.items.fromCompendium(cechy.find(d => d.getFlag(MOD, "abilityId") === id))));
  await tw.update({ "system.abilities.dex.value": 16 });
  // Nóż z kroku Rzeźnika do plecaka — B 92 jedną ręką strzela z Utrudnieniem (chwyt), a Bolesny atak go nie znosi.
  const lalka = game.neuroshima.lalka;
  for (const h of lalka.heldItems(tw)) if (h.item && h.item.getFlag(MOD, "weaponId") !== "b92") await lalka.place(tw, h.item, "pack");
  const g = canvas.scene.grid.size;
  const tok = n => canvas.scene.tokens.find(t => t.name === n);
  const p1 = tok("PC Gracz 1"), p2 = tok("PC Gracz 2");
  await tok(cel).move({ x: p2.x + g, y: p2.y, action: "displace" });
  await p1.move({ x: p2.x, y: p2.y - 3 * g, action: "displace" });
  await game.combat.update({ turn: game.combat.turns.findIndex(c => c.name === "PC Gracz 1") });
  return { naRuchu: game.combat.combatant?.name };
}

/** Gracz 1: strzał z naturalną 20 (trafienie mimo TT); przyciski pod kartą, klik Bolesnego ataku. */
async function bolesnyKlik({ targetName }) {
  const MOD = "neuroshima-2026-overrides";
  const actor = game.user.character;
  const gun = actor.items.find(i => i.getFlag(MOD, "weaponId") === "b92");
  const attack = gun.system.activities.find(a => a.type === "attack");
  const target = canvas.tokens.placeables.find(t => t.name === targetName);
  canvas.tokens.placeables.find(t => t.actor?.id === actor.id)?.control({ releaseOthers: true });
  canvas.tokens.setTargets([target.id]);
  const orig = CONFIG.Dice.randomUniform;
  CONFIG.Dice.randomUniform = () => 0.00001;
  let msg;
  try {
    let usage = null;
    for (let i = 0; i < 20 && !usage; i++) {
      usage = await attack.use({ subsequentActions: false }, { configure: false }, {});
      if (!usage) await new Promise(r => setTimeout(r, 250));
    }
    await attack.rollAttack({}, { configure: false }, { data: { system: { origin: usage.message.id } } });
    msg = game.messages.contents.findLast(m => m._source.system?.origin === usage.message.id && m.flags[MOD]?.obrona);
  } finally {
    CONFIG.Dice.randomUniform = orig;
  }
  const sel = `[data-message-id="${msg.id}"] [data-neuro-m7-traf="bolesny"]`;
  let btn = null;
  for (let i = 0; i < 40 && !btn; i++) {
    await new Promise(r => setTimeout(r, 150));
    btn = ui.chat.element?.querySelector(sel);
  }
  const tryb = msg.rolls[0].options.advantageMode;
  if (!btn) return { przycisk: false, tryb, verdict: msg.flags[MOD].obrona.targets[0]?.verdict };
  const info = { przycisk: true, etykieta: btn.textContent, dymek: btn.dataset.tooltip ?? null, tryb };
  const przed = game.messages.size;
  btn.click();
  let karta = null;
  for (let i = 0; i < 40 && !karta; i++) {
    await new Promise(r => setTimeout(r, 150));
    karta = game.messages.contents.slice(przed).find(m => m.type === "damage" && /Bolesny atak/.test(m.flavor ?? ""));
  }
  const podstepny = ui.chat.element?.querySelector(`[data-message-id="${msg.id}"] [data-neuro-m7-traf="podstepny"]`);
  return { ...info, karta: !!karta, formula: karta?.rolls?.[0]?.formula ?? null, podstepnyWylaczony: !!podstepny?.disabled };
}

async function turaGracza({ name }) {
  await game.combat.update({ turn: game.combat.turns.findIndex(c => c.name === name) });
  return { naRuchu: game.combat.combatant?.name, runda: game.combat.round };
}

export default {
  name: "zdolnosci-walka",
  clients: ["gm", "Gracz 1"],

  async run(t) {
    const p1 = t.client("Gracz 1");
    await t.waitFor(p1, () => Boolean(game.user.character && canvas.tokens?.placeables.some(tk => tk.isOwner)),
      { message: "the player's client to see the fixture" });

    let npc;
    await t.step("GM: PC Gracz 1 — Ulubiona broń (B 92), Rzeźnik, Mój wróg: Ludzie; B 92 alone in hand; combat", async () => {
      const r = await t.gm.eval(przygotuj);
      t.equal(r.naRuchu, "PC Gracz 1", "combatant on turn");
      t.assert(r.wRekach.filter(Boolean).length === 1, "only the B 92 in hand", r);
      t.equal(r.ulubione[0]?.modele?.[0]?.model, "b92", "favourite model stored");
      npc = r.npc.filter(n => /cz[łl]owiek/i.test(n.typ ?? ""));
      t.assert(npc.length >= 2, "two human NPCs in the fixture", r);
    });

    let pierwszy;
    await t.step("Gracz 1 shoots a human NPC: Mój wróg +1 to hit, +1k6 and Rzeźnik +3 to damage", async () => {
      await t.waitFor(p1, () => game.combat?.combatant?.name === "PC Gracz 1", { message: "Gracz 1 to see their turn" });
      pierwszy = await p1.eval(strzal, { targetName: npc[0].name });
      t.assert(pierwszy.messageId, "attack card", pierwszy);
      t.assert(pierwszy.premieAtaku.includes("moj-wrog:1"), "Mój wróg +1 on the attack", pierwszy);
      t.assert(pierwszy.premieObrazen.includes("moj-wrog:1d6"), "Mój wróg 1k6 on damage", pierwszy);
      t.assert(pierwszy.premieObrazen.includes("rzeznik:3"), "Rzeźnik +3 on damage", pierwszy);
      t.assert(/1d6/.test(pierwszy.formulaObrazen ?? ""), "damage formula carries the extra die", pierwszy);
    });

    await t.step("Ulubiona broń [B] under the card: Shift+click → a second B 92 attack, BA marked, no button on it", async () => {
      const r = await p1.eval(ulubionaKlik, { messageId: pierwszy.messageId });
      t.assert(r.przycisk, "the button is there", r);
      t.assert(r.atak, "a bonus attack card appeared", r);
      t.equal(r.rodzaj, "ulubiona-bron", "the usage card carries the bonus-attack flag");
      t.assert(r.bezPrzycisku, "the bonus attack card has no further button", r);
      const b = await t.waitFor(t.gm, znacznikB, { args: [{ name: "PC Gracz 1" }], message: "Bonus Action marker on PC Gracz 1" });
      t.assert(b.zrodla.length === 1, "one BA use", b);
    });

    await t.step("GM puts a knife in the other hand → B 92 damage without Rzeźnik", async () => {
      const r = await t.gm.eval(nozDoReki);
      t.assert(r.wRekach.filter(Boolean).length === 2, "two weapons in hand", r);
      const s = await p1.eval(strzal, { targetName: npc[0].name });
      t.assert(!s.premieObrazen.some(p => p.startsWith("rzeznik")), "no Rzeźnik with a second weapon", s);
      t.assert(s.premieObrazen.includes("moj-wrog:1d6"), "Mój wróg still applies", s);
    });

    await t.step("Dwóch na jednego (D13): PC Gracz 2 gets +2 in melee on the NPC PC Gracz 1 hit in melee — only that one", async () => {
      const a1 = await t.gm.eval(atakWrecz, { kto: "PC Gracz 1", cel: npc[0].name });
      t.equal(a1.melee, true, "PC Gracz 1's knife attack is melee");
      t.assert(a1.chwila?.round >= 1, "the attack card carries its combat moment", a1);
      const tura = await t.gm.eval(turaGracza, { name: "PC Gracz 2" });
      t.equal(tura.naRuchu, "PC Gracz 2", "PC Gracz 2 on turn");
      const a2 = await t.gm.eval(atakWrecz, { kto: "PC Gracz 2", cel: npc[0].name });
      t.assert(a2.premie.includes("dwoch-na-jednego:2"), "+2 on the same target", a2);
      const a3 = await t.gm.eval(atakWrecz, { kto: "PC Gracz 2", cel: npc[1].name });
      t.assert(!a3.premie.some(p => p.startsWith("dwoch-na-jednego")), "nothing on another target", a3);
    });

    await t.step("Bolesny atak (E5): ally next to the target → dice button under the hit; click → damage card, once per turn", async () => {
      const r = await t.gm.eval(ustawBolesny, { cel: npc[1].name });
      t.equal(r.naRuchu, "PC Gracz 1", "PC Gracz 1 on turn");
      await t.waitFor(p1, () => game.combat?.combatant?.name === "PC Gracz 1", { message: "Gracz 1 to see their turn" });
      const b = await p1.eval(bolesnyKlik, { targetName: npc[1].name });
      t.assert(b.przycisk, "the Bolesny atak button is offered", b);
      t.equal(b.tryb, 0, "a normal roll — the ally is the trigger, not advantage");
      t.assert(/PC Gracz 2/.test(b.dymek ?? ""), "the tooltip names the ally", b);
      t.assert(b.karta, "a damage card follows the click", b);
      t.assert(/^2d6/.test(b.formula ?? ""), "natural 20 → crit doubles the 1k6", b);
      t.assert(b.podstepnyWylaczony, "Podstępny atak shares the once-per-turn use", b);
    });
  }
};
