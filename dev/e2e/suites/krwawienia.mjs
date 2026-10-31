/**
 * Suite — krwawienia jako osobne efekty (docs/Krwawienia.md; ustalenia MG 2026-10-31 i 2026-11-01). GM i jeden gracz.
 *
 *  - GM: PC Gracz 3 krwawi naraz z Podstępnego ataku i z tętnicy — dwa efekty, dwa stany na żetonie. PC Gracz 1 ma
 *    narzędzia małego medyka z trzema ładunkami; Juggernaut z kompendium Bestiariusza stoi obok.
 *  - Gracz 1 (nie jest właścicielem PC Gracz 3) Shift+klikiem „Opatrz” na karcie tętnicy: Test narzędzi ST 10 z ustaloną
 *    kością — znika tylko tętnica (efekt zdejmuje MG przez przekaźnik), Podstępny zostaje, ładunek −1.
 *  - GM: piła tarczowa Juggernauta trafia PC Gracz 3 — pod kartą przycisk „Krwawienie (Piły Juggernauta) → …”, klik →
 *    trzeci efekt.
 *  - Tura PC Gracz 3: na jej początku tykają oba krwawienia — dwie karty, dwa ubytki PW.
 *  - Koniec walki, zegar +11 minut → szept do MG „Krwawienia poza walką” z PC Gracz 3.
 */

/* Functions below run in the browser (serialised): no closures over this file. */

/** GM: dwa krwawienia na PC Gracz 3, narzędzia dla PC Gracz 1, Juggernaut obok, walka (PC Gracz 3 ostatni). */
async function przygotuj() {
  const MOD = "neuroshima-2026-overrides";
  const B = game.neuroshima.health.bleeding;
  if (game.messages.size) await ChatMessage.deleteDocuments(game.messages.map(m => m.id));
  const scene = canvas.scene;
  const tok = n => scene.tokens.find(t => t.actor?.name === n);
  const p1 = game.actors.getName("PC Gracz 1");
  const p3 = game.actors.getName("PC Gracz 3");
  const { createToolkits } = await import(`/modules/${MOD}/scripts/config/toolkits-data.mjs`);
  await createToolkits(p1, { only: ["medyka"] });
  const kit = p1.items.find(i => i.type === "tool" && i.system.type?.baseItem === "medyka");
  await kit.update({ "system.uses.max": "5", "system.uses.spent": 2 });
  await p3.update({ "system.attributes.hp.max": 80, "system.attributes.hp.value": 80 });
  await B.startBleeding(p3, { rodzaj: "podstepny", reason: "e2e" });
  await B.startBleeding(p3, { rodzaj: "tetnica", reason: "e2e" });

  const pack = game.packs.get(`${MOD}.bestiariusz`);
  const idx = await pack.getIndex({ fields: ["flags"] });
  const e = idx.find(x => x.flags?.[MOD]?.bestiary?.id === "juggernaut");
  const jugg = await game.actors.importFromCompendium(pack, e._id, { flags: { [MOD]: { fixture: "skirmish" } } }, { keepId: false });
  const t3 = tok("PC Gracz 3");
  const td = await jugg.getTokenDocument({ x: t3.x + scene.grid.size, y: t3.y, actorLink: false });
  const [jt] = await scene.createEmbeddedDocuments("Token", [td.toObject()]);

  for (const c of game.combats.contents) await c.delete();
  const combat = await Combat.implementation.create({ scene: scene.id, active: true });
  const inne = scene.tokens.filter(t => t.id !== t3.id);
  await combat.createEmbeddedDocuments("Combatant", [...inne, t3].map((t, i) => ({ tokenId: t.id, sceneId: scene.id, actorId: t.actorId, initiative: 30 - i })));
  await combat.startCombat();
  return {
    stany: [...p3.statuses].filter(s => /^krwawienie/.test(s)).sort(),
    karty: game.messages.filter(m => m.getFlag(MOD, "bleed")).length,
    ladunki: kit.system.uses.max - kit.system.uses.spent,
    juggernaut: jt.uuid, naRuchu: combat.combatant?.name
  };
}

/** Gracz 1: Shift+klik „Opatrz” na najnowszej karcie krwawienia `rodzaj`, z ustaloną kością (naturalna 20). */
async function opatrzKlik({ rodzaj }) {
  const actor = game.user.character;
  canvas.tokens.placeables.find(t => t.actor?.id === actor.id)?.control({ releaseOthers: true });
  let btn = null;
  for (let i = 0; i < 40 && !btn; i++) {
    btn = [...(ui.chat.element?.querySelectorAll(`.neuro-bleed-btn[data-action="test"][data-rodzaj="${rodzaj}"]`) ?? [])].at(-1) ?? null;
    if (!btn) await new Promise(r => setTimeout(r, 150));
  }
  if (!btn) return { przycisk: false };
  const etykieta = btn.textContent.trim();
  const orig = CONFIG.Dice.randomUniform;
  CONFIG.Dice.randomUniform = () => 0.00001;
  try {
    btn.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, shiftKey: true }));
    await new Promise(r => setTimeout(r, 1500));
  } finally {
    CONFIG.Dice.randomUniform = orig;
  }
  const kit = actor.items.find(i => i.type === "tool" && i.system.type?.baseItem === "medyka");
  return { przycisk: true, etykieta, ladunki: kit.system.uses.max - kit.system.uses.spent };
}

/** GM: stany krwawień aktora `name`. */
function stany({ name }) {
  return [...game.actors.getName(name).statuses].filter(s => /^krwawienie/.test(s)).sort();
}

/** GM: piła tarczowa Juggernauta w PC Gracz 3 (naturalna 19), przycisk krwawienia pod kartą, klik. */
async function pila({ juggernaut }) {
  const MOD = "neuroshima-2026-overrides";
  const jt = await fromUuid(juggernaut);
  const saw = jt.actor.items.find(i => i.getFlag(MOD, "bestiary")?.entryId === "pila-tarczowa" && i.system.activities?.some(a => a.type === "attack"));
  const attack = saw.system.activities.find(a => a.type === "attack");
  const t3 = canvas.tokens.placeables.find(t => t.actor?.name === "PC Gracz 3");
  jt.object?.control({ releaseOthers: true });
  canvas.tokens.setTargets([t3.id]);
  const orig = CONFIG.Dice.randomUniform;
  CONFIG.Dice.randomUniform = () => 0.07;
  try {
    await attack.rollAttack({}, { configure: false }, { create: true });
  } finally {
    CONFIG.Dice.randomUniform = orig;
  }
  const msg = game.messages.contents.findLast(m => m.flags[MOD]?.obrona);
  const flaga = saw.getFlag(MOD, "bestiary")?.onHit ?? null;
  let btn = null;
  for (let i = 0; i < 40 && !btn; i++) {
    btn = ui.chat.element?.querySelector(`[data-message-id="${msg.id}"] [data-neuro-bleed-onhit]`);
    if (!btn) await new Promise(r => setTimeout(r, 150));
  }
  const out = { onHit: flaga, verdict: msg.flags[MOD].obrona.targets[0]?.verdict, przycisk: btn?.textContent.trim() ?? null };
  if (btn) {
    btn.click();
    await new Promise(r => setTimeout(r, 800));
  }
  return out;
}

/** GM: tura PC Gracz 3 — jej początek tyka krwawieniami. */
async function turaGracza3() {
  const MOD = "neuroshima-2026-overrides";
  const p3 = game.actors.getName("PC Gracz 3");
  const hp = p3.system.attributes.hp.value;
  const n0 = game.messages.size;
  await game.combat.update({ turn: game.combat.turns.findIndex(c => c.actor?.id === p3.id) });
  await window.__e2e.until(() => game.messages.contents.slice(n0).filter(m => m.getFlag(MOD, "bleed")).length >= 2,
    { message: "two start-of-turn bleed cards" });
  const karty = game.messages.contents.slice(n0).filter(m => m.getFlag(MOD, "bleed")).map(m => m.content.match(/Krwawienie \([^)]+\)/)?.[0]);
  return { naRuchu: game.combat.combatant?.name, hpPrzed: hp, hpPo: p3.system.attributes.hp.value, karty };
}

/** GM: koniec walki, zegar +11 minut → szept „Krwawienia poza walką”. */
async function pozaWalka() {
  for (const c of game.combats.contents) await c.delete();
  const n0 = game.messages.size;
  await game.time.advance(660);
  const szept = await window.__e2e.until(() => game.messages.contents.slice(n0).find(m => /Krwawienia poza walką/.test(m.content)),
    { message: "the out-of-combat bleed reminder" });
  return { gm: szept.whisper.length > 0, tresc: szept.content.replace(/<[^>]+>/g, " ") };
}

export default {
  name: "krwawienia",
  clients: ["gm", "Gracz 1"],

  async run(t) {
    const p1 = t.client("Gracz 1");
    await t.waitFor(p1, () => Boolean(game.user.character && canvas.tokens?.placeables.some(tk => tk.isOwner)),
      { message: "the player's client to see the fixture" });

    let juggernaut;
    await t.step("GM: PC Gracz 3 bleeds from Podstępny atak and an artery — two effects; medic kit for PC Gracz 1; Juggernaut", async () => {
      const r = await t.gm.eval(przygotuj);
      t.equal(r.stany.join(","), "krwawieniePodstepny,krwawienieTetnica", "two separate bleed states");
      t.equal(r.karty, 2, "one card per bleed");
      t.equal(r.ladunki, 3, "three kit charges");
      juggernaut = r.juggernaut;
    });

    await t.step("Gracz 1 dresses only the artery: kit test ST 10, the GM relay removes it, Podstępny stays, one charge spent", async () => {
      const r = await p1.eval(opatrzKlik, { rodzaj: "tetnica" });
      t.assert(r.przycisk, "the artery card has a dressing button", r);
      t.assert(/ST 10/.test(r.etykieta ?? ""), "kit test ST 10", r);
      await t.waitFor(t.gm, ({ name }) => {
        const s = [...game.actors.getName(name).statuses];
        return !s.includes("krwawienieTetnica") || null;
      }, { args: [{ name: "PC Gracz 3" }], message: "the artery bleed removed through the GM" });
      t.equal((await t.gm.eval(stany, { name: "PC Gracz 3" })).join(","), "krwawieniePodstepny", "one action, one bleed");
      t.equal(r.ladunki, 2, "the attempt spent a charge");
    });

    await t.step("GM: Juggernaut's saw hits → button under the card → Krwawienie (Piły Juggernauta)", async () => {
      const r = await t.gm.eval(pila, { juggernaut });
      t.equal(r.onHit?.krwawienie, "pila", "the pack item carries the on-hit bleed");
      t.assert(r.verdict === "trafienie" || r.verdict === "krytyk", "the saw hits", r);
      t.assert(/Piły Juggernauta/.test(r.przycisk ?? ""), "the bleed button is offered", r);
      t.equal((await t.gm.eval(stany, { name: "PC Gracz 3" })).join(","), "krwawieniePila,krwawieniePodstepny", "a second, different bleed stacks");
    });

    await t.step("PC Gracz 3's turn: each bleed ticks on its own — two cards, two losses", async () => {
      const r = await t.gm.eval(turaGracza3);
      t.equal(r.naRuchu, "PC Gracz 3", "PC Gracz 3 on turn");
      t.assert(r.karty.includes("Krwawienie (Podstępny atak)") && r.karty.includes("Krwawienie (Piły Juggernauta)"), "a tick card per bleed", r);
      t.assert(r.hpPo <= r.hpPrzed - 2, "two separate losses (1k8 + 1k4)", r);
    });

    await t.step("Out of combat: clock +11 minutes → a GM whisper names the bleeding PC", async () => {
      const r = await t.gm.eval(pozaWalka);
      t.assert(r.gm, "whispered to the GM", r);
      t.assert(/PC Gracz 3/.test(r.tresc) && /Podstępny atak/.test(r.tresc), "names the actor and the bleed", r);
    });
  }
};
