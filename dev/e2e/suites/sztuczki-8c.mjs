/**
 * Suite — dogrywka Sztuczek 8c (PLAN_beta krok 8, PLAN_m7 §8 „8c”). GM i jeden gracz; każdy krok tak, jak przy stole.
 *
 *  - GM: PC Gracz 1 dostaje z kompendium Pewną rękę, Rozróbę i Ławnika; katanę i nóż do rzucania, beczkę (30 kg);
 *    trzech BN-ów tuż obok (SIŁ 1). Walka, Gracz 1 na ruchu.
 *  - Gracz 1: Pewny strzał [B] → efekt (Szybkość 0); rzut nożem do rzucania w BN-a → w okolicznościach rzutu
 *    „Pewny strzał”, po rzucie Ułatwienie zużyte.
 *  - Gracz 1: Młynek [B] z kataną w ręce → trzy ataki, po jednym w każdego BN-a obok.
 *  - Gracz 1: beczka w obu rękach, atak improwizowany → 3k4 obuch. i „Rozbijanie czaszek”; Przygniecenie → RO BN-a na
 *    Siłę rzuca MG → Powalenie.
 */

/* Functions below run in the browser (serialised): no closures over this file. */

/** GM: Sztuczki, broń i beczka PC Gracz 1, trzech BN-ów obok, walka z Graczem 1 na ruchu. */
async function przygotuj() {
  const MOD = "neuroshima-2026-overrides";
  if (game.messages.size) await ChatMessage.deleteDocuments(game.messages.map(m => m.id));
  for (const c of game.combats.contents) await c.delete();
  const sz = await game.packs.get(`${MOD}.sztuczki`).getDocuments();
  const bron = await game.packs.get(`${MOD}.bron`).getDocuments();
  const p1 = game.actors.getName("PC Gracz 1");
  await p1.update({ "system.abilities.str.value": 20, "system.abilities.dex.value": 17 });
  await p1.createEmbeddedDocuments("Item", ["pewnaReka", "rozroba", "lawnik"]
    .map(k => game.items.fromCompendium(sz.find(d => d.getFlag(MOD, "sztuczka") === k))));
  await p1.createEmbeddedDocuments("Item", [
    ...["katana", "noz-do-rzucania"].map(id => game.items.fromCompendium(bron.find(d => d.getFlag(MOD, "weaponId") === id))),
    { name: "Beczka", type: "loot", system: { weight: { value: 30, units: "kg" }, quantity: 1 } }
  ]);
  const lalka = game.neuroshima.lalka;
  for (const h of lalka.heldItems(p1)) if (h.item) await lalka.place(p1, h.item, "pack");
  const scene = canvas.scene;
  const t1 = scene.tokens.find(t => t.actor?.id === p1.id);
  const npc = scene.tokens.find(t => !t.actor?.hasPlayerOwner && t.actor?.type === "npc");
  await npc.actor.update({ "system.abilities.str.value": 1 });
  const g = scene.grid.size;
  await npc.update({ disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE });
  await npc.move({ x: t1.x + g, y: t1.y, action: "displace" });
  const kopie = await scene.createEmbeddedDocuments("Token", [[0, g], [-g, 0]].map(([dx, dy], i) => ({
    ...npc.toObject(), _id: undefined, name: `${npc.name} ${i + 2}`, x: t1.x + dx, y: t1.y + dy, disposition: CONST.TOKEN_DISPOSITIONS.HOSTILE
  })));
  const combat = await Combat.implementation.create({ scene: scene.id, active: true });
  await combat.createEmbeddedDocuments("Combatant", [t1, npc].map((tk, i) => ({ tokenId: tk.id, sceneId: scene.id, actorId: tk.actorId, initiative: 20 - i })));
  await combat.startCombat();
  await combat.update({ turn: combat.turns.findIndex(c => c.actorId === p1.id) });
  return { npc: npc.name, wrogowie: [npc.name, ...kopie.map(k => k.name)], naRuchu: combat.combatant?.name };
}

/** Gracz 1: aktywność Sztuczki po nazwie (Pewny strzał, Młynek). */
async function aktywnosc({ sztuczka, nazwa }) {
  const actor = game.user.character;
  const it = actor.items.find(i => i.getFlag("neuroshima-2026-overrides", "sztuczka") === sztuczka);
  await it.system.activities.find(a => a.name === nazwa).use({}, { configure: false }, {});
  return true;
}

/** GM: stan Pewnego strzału na PC Gracz 1. */
function pewny() {
  const MOD = "neuroshima-2026-overrides";
  const a = game.actors.getName("PC Gracz 1");
  const e = a.effects.find(x => x.getFlag(MOD, "pewnyStrzal"));
  return { jest: !!e, uzyty: e?.getFlag(MOD, "pewnyStrzal")?.uzyty ?? null, szybkosc: Number(a.system.attributes.movement.speeds?.walk ?? 0) };
}

/** Gracz 1: rzut nożem do rzucania w BN-a (ustalona 19); okoliczności z rzutu. */
async function rzutNozem({ npc }) {
  const MOD = "neuroshima-2026-overrides";
  const actor = game.user.character;
  const noz = actor.items.find(i => i.getFlag(MOD, "weaponId") === "noz-do-rzucania");
  await game.neuroshima.lalka.place(actor, noz, "hand");
  const activity = noz.system.activities.find(a => a.type === "attack");
  canvas.tokens.placeables.find(t => t.actor?.id === actor.id)?.control({ releaseOthers: true });
  canvas.tokens.setTargets([canvas.tokens.placeables.find(t => t.name === npc).id]);
  const usage = await activity.use({ subsequentActions: false }, { configure: false }, {});
  __e2e.forceD20([19]);
  try {
    await activity.rollAttack({ attackMode: "thrown" }, { configure: false }, { data: { system: { origin: usage.message.id } } });
  } finally {
    __e2e.restoreDice();
  }
  const msg = game.messages.contents.findLast(m => m._source.system?.origin === usage.message.id && m.rolls?.length);
  return { ulatwienia: (msg?.rolls?.[0]?.options?.neuroOkolicznosci?.ulatwienia ?? []).map(w => w.id) };
}

/** Gracz 1: Młynek z kataną w ręce — trzy okna rzutu ataku, po jednym na wroga. */
async function mlynek() {
  const MOD = "neuroshima-2026-overrides";
  const actor = game.user.character;
  const lalka = game.neuroshima.lalka;
  for (const h of lalka.heldItems(actor)) if (h.item) await lalka.place(actor, h.item, "pack");
  const katana = actor.items.find(i => i.getFlag(MOD, "weaponId") === "katana");
  await lalka.place(actor, katana, "hand");
  const przed = game.messages.size;
  const it = actor.items.find(i => i.getFlag(MOD, "sztuczka") === "rozroba");
  __e2e.forceD20([], { fallback: 15 });
  try {
    await it.system.activities.find(a => a.name === "Młynek").use({}, { configure: false }, {});
    for (let i = 0; i < 3; i++) await __e2e.pressRollDialog("normal");
    await __e2e.until(() => game.messages.contents.slice(przed).filter(m => m.flags[MOD]?.obrona).length >= 3, { message: "three attack cards" });
  } finally {
    __e2e.restoreDice();
  }
  const ataki = game.messages.contents.slice(przed).filter(m => m.flags[MOD]?.obrona);
  return { cele: ataki.map(m => fromUuidSync(m.flags[MOD].obrona.targets?.[0]?.tokenUuid ?? "")?.name ?? null) };
}

/** Gracz 1: beczka do rąk, atak improwizowany w BN-a (ustalona 19). */
async function beczka({ npc }) {
  const MOD = "neuroshima-2026-overrides";
  const actor = game.user.character;
  const lalka = game.neuroshima.lalka;
  for (const h of lalka.heldItems(actor)) if (h.item) await lalka.place(actor, h.item, "pack");
  const item = actor.items.getName("Beczka");
  await lalka.place(actor, item, "hand");
  await __e2e.until(() => lalka.handOf(item), { message: "the barrel in hand" });
  canvas.tokens.placeables.find(t => t.actor?.id === actor.id)?.control({ releaseOthers: true });
  canvas.tokens.setTargets([canvas.tokens.placeables.find(t => t.name === npc).id]);
  const przed = game.messages.size;
  __e2e.forceD20([19]);
  try {
    const run = game.neuroshima.improwizacja.atakImprowizowany(actor, item);
    await __e2e.pressRollDialog("normal");
    await run;
    await __e2e.quiet();
  } finally {
    __e2e.restoreDice();
  }
  const msg = game.messages.contents.slice(przed).findLast(m => m.flags[MOD]?.obrona);
  const twin = actor.items.find(i => i.flags?.[MOD]?.improwizacja?.zrodlo === item.id);
  const b = twin?.system.damage.base;
  return {
    messageId: msg?.id ?? null, verdict: msg?.flags[MOD]?.obrona?.targets?.[0]?.verdict ?? null,
    ulatwienia: (msg?.rolls?.[0]?.options?.neuroOkolicznosci?.ulatwienia ?? []).map(w => w.id),
    kosc: b ? `${b.number}d${b.denomination}` : null
  };
}

/** GM: kości MG na najniższe (RO BN-a przy Przygnieceniu) albo z powrotem. */
function koscMG({ przywroc = false }) {
  if (przywroc) __e2e.restoreDice();
  else __e2e.forceD20([], { fallback: 1 });
  return true;
}

export default {
  name: "sztuczki-8c",
  clients: ["gm", "Gracz 1"],

  async run(t) {
    const p1 = t.client("Gracz 1");
    await t.waitFor(p1, () => Boolean(game.user.character && ui.chat?.element), { message: "the player's client to see the fixture" });

    let fx;
    await t.step("GM: PC Gracz 1 takes Pewna ręka, Rozróba and Ławnik, a katana, a throwing knife and a barrel; three NPCs adjacent", async () => {
      fx = await t.gm.eval(przygotuj);
      t.equal(fx.naRuchu, "PC Gracz 1", "PC Gracz 1 on turn");
      t.equal(fx.wrogowie.length, 3, "three enemies");
    });

    await t.step("Pewny strzał [B] → speed 0; a thrown knife gets the advantage, which is then spent", async () => {
      await p1.eval(aktywnosc, { sztuczka: "pewnaReka", nazwa: "Pewny strzał" });
      const s = await t.waitFor(t.gm, () => {
        const MOD = "neuroshima-2026-overrides";
        const a = game.actors.getName("PC Gracz 1");
        return a.effects.some(x => x.getFlag(MOD, "pewnyStrzal")) ? true : null;
      }, { message: "the Pewny strzał effect" });
      t.assert(s, "effect on the PC");
      const p = await t.gm.eval(pewny);
      t.equal(p.szybkosc, 0, "speed 0");
      const r = await p1.eval(rzutNozem, { npc: fx.npc });
      t.assert(r.ulatwienia.includes("pewny-strzal"), "advantage from Pewny strzał", r);
      const po = await t.waitFor(t.gm, () => {
        const MOD = "neuroshima-2026-overrides";
        const e = game.actors.getName("PC Gracz 1").effects.find(x => x.getFlag(MOD, "pewnyStrzal"));
        return e?.getFlag(MOD, "pewnyStrzal")?.uzyty ? true : null;
      }, { message: "the advantage spent" });
      t.assert(po, "spent after one attack");
    });

    await t.step("Młynek [B] with a katana → one attack at each of the three adjacent enemies", async () => {
      const m = await p1.eval(mlynek);
      t.equal([...new Set(m.cele)].length, 3, "three different targets");
      t.assert(fx.wrogowie.every(n => m.cele.includes(n)), "every enemy attacked", m);
    });

    await t.step("A 30 kg barrel: 3k4, Rozbijanie czaszek; Przygniecenie → the GM rolls the NPC's STR save → Prone", async () => {
      const b = await p1.eval(beczka, { npc: fx.npc });
      t.equal(b.kosc, "3d4", "Ławnik: 3k4");
      t.assert(b.ulatwienia.includes("rozbijanie-czaszek"), "advantage from Rozbijanie czaszek", b);
      t.assert(["trafienie", "krytyk"].includes(b.verdict), "the barrel hits", b);
      await t.gm.eval(koscMG, { przywroc: false });
      try {
        const klik = await p1.eval(({ messageId }) => __e2e.clickChat(messageId, '[data-neuro-sztuczka8c="przygniecenie"]'), { messageId: b.messageId });
        t.assert(klik, "the Przygniecenie button");
        const lezy = await t.waitFor(t.gm, ({ npc }) => (canvas.tokens.placeables.find(x => x.name === npc)?.actor?.statuses?.has("prone") ? true : null),
          { args: [{ npc: fx.npc }], message: "the NPC knocked prone" });
        t.assert(lezy, "NPC prone");
      } finally {
        await t.gm.eval(koscMG, { przywroc: true });
      }
    });
  }
};
