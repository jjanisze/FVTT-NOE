/**
 * Suite — Towarzysz w walce (PLAN_m3_towarzysze.md E2, §7.5). GM and Gracz 1.
 *
 *  - PC Gracz 1 is a Zwiadowca 3 with the Partner ability (zdolnosci-klasowe pack, Komenda [B]); his human
 *    partner "Evie" is a character with the companion flag and a token on the scene.
 *  - The GM puts only the PC and GANGUS in combat: Evie joins by herself, in one CombatantGroup with her
 *    owner, owned by Gracz 1 (without that the player's roll never reaches the group — spike E0).
 *  - Gracz 1 rolls the PC's initiative: the group and Evie take it. GANGUS tied on the same number: the
 *    order is GANGUS, PC, Evie — dnd5e alone sorted ties alphabetically and put "Evie" first (F9).
 *  - Gracz 1 uses Komenda in his turn → Evie gets her own turn. Next round, no Komenda → her turn is
 *    skipped with Unikanie and a card; the GM's [Cofnij — była komenda] takes it back.
 *  - Burning GANGUS: the start of his turn deals 1k4 once; the GM stepping back and forward again does not
 *    deal it a second time (F17).
 *  - E3, sheets: Gracz 1's sheet has the companion bar under Stan (PW, [Karta], [Komenda], [Pokaż żeton]);
 *    [Karta] opens Evie's sheet with the "Ludzki partner · PC Gracz 1" badge and its breakdown, no Fuksy, no PD.
 *  - E3, party: Evie listed right under her owner; the day's needs count her; she is a medic option in the
 *    owner's Long Rest window (F6), and her own Long Rest with a Stopień moves her Regeneracja counter.
 */

/* Functions below run in the browser (serialised): no closures over this file. */

/** GM: Zwiadowca 3 + Partner on PC Gracz 1, Evie with a token next to him, GANGUS at 60 PW. */
async function przygotuj() {
  const MOD = "neuroshima-2026-overrides";
  for (const c of [...game.combats]) await c.delete();
  const scene = canvas.scene;
  const gracz = game.users.getName("Gracz 1");
  const pc = game.actors.getName("PC Gracz 1");
  const klasy = await game.packs.get(`${MOD}.klasy`).getDocuments();
  const zw = klasy.find(i => i.type === "class" && i.system.identifier === "zwiadowca");
  const zdolnosci = await game.packs.get(`${MOD}.zdolnosci-klasowe`).getDocuments();
  const partner = zdolnosci.find(i => i.getFlag(MOD, "abilityId") === "partner");
  const items = [];
  if (!pc.classes.zwiadowca) { const d = game.items.fromCompendium(zw); d.system.levels = 3; items.push(d); }
  if (!pc.items.some(i => i.getFlag(MOD, "abilityId") === "partner")) items.push(game.items.fromCompendium(partner));
  if (items.length) await pc.createEmbeddedDocuments("Item", items);
  await pc.update({ "system.attributes.hp.value": pc.system.attributes.hp.max }); // the class came without its advancement

  const evie = await Actor.implementation.create({
    name: "Evie", type: "character",
    ownership: { default: 0, [gracz.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER },
    prototypeToken: { actorLink: true, sight: { enabled: true } },
    system: { abilities: Object.fromEntries(["str", "dex", "con", "int", "wis", "cha"].map(k => [k, { value: 12 }])),
      attributes: { hp: { value: 15 } } },
    flags: { [MOD]: { fixture: "skirmish", towarzysz: { wlasciciel: pc.uuid, rodzaj: "ludzki-partner", klasa: "zwiadowca" } } }
  });
  const pcTok = scene.tokens.find(t => t.actorId === pc.id);
  const td = (await evie.getTokenDocument({ x: pcTok.x + canvas.grid.size, y: pcTok.y, level: pcTok.level })).toObject();
  await scene.createEmbeddedDocuments("Token", [td]);
  const gangus = scene.tokens.find(t => t.name === "GANGUS ŻOŁNIERZ").actor;
  await gangus.update({ "system.attributes.hp.max": 60, "system.attributes.hp.value": 60 });
  return {
    evieMaxPW: evie.system.attributes.hp.max,
    komenda: partner?.system.activities?.contents?.map(a => `${a.name}/${a.activation?.type}`) ?? []
  };
}

/** GM: combat with the PC and GANGUS only; waits for Evie to be added and grouped. */
async function walka() {
  const scene = canvas.scene;
  const toks = ["PC Gracz 1", "GANGUS ŻOŁNIERZ"].map(n => scene.tokens.find(t => t.name === n));
  const combat = await Combat.implementation.create({ scene: scene.id, active: true });
  await combat.createEmbeddedDocuments("Combatant", toks.map(t => ({ tokenId: t.id, sceneId: scene.id, actorId: t.actorId })));
  await window.__e2e.until(() => combat.combatants.some(c => c.name === "Evie" && c.group), { message: "Evie grouped" });
  await window.__e2e.quiet({ idleMs: 600 });
  const group = combat.combatants.find(c => c.name === "Evie").group;
  const gracz = game.users.getName("Gracz 1");
  return {
    combatants: combat.combatants.map(c => c.name).sort(),
    members: [...group.members].map(c => c.name).sort(),
    groups: combat.groups.size,
    graczOwns: group.ownership[gracz.id] === CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER,
    active: group.activeCombatant?.name
  };
}

/** Player: roll the PC's initiative the way the tracker does it. */
async function rzutGracza() {
  const combat = game.combat;
  const pc = combat.combatants.find(c => c.name === "PC Gracz 1");
  await combat.rollInitiative([pc.id]);
  await window.__e2e.until(() => Number.isFinite(combat.combatants.get(pc.id).group?.initiative), { message: "group initiative" });
  return combat.combatants.map(c => [c.name, c.initiative]);
}

/** GM: tie GANGUS to the group's initiative, start, PC on turn; the order. */
async function remisIStart() {
  const combat = game.combat;
  const pc = combat.combatants.find(c => c.name === "PC Gracz 1");
  const g = combat.combatants.find(c => c.name === "GANGUS ŻOŁNIERZ");
  await combat.updateEmbeddedDocuments("Combatant", [{ _id: g.id, initiative: pc.initiative }]);
  await combat.startCombat();
  await combat.update({ turn: combat.turns.findIndex(c => c.id === pc.id) });
  return { order: combat.turns.map(c => c.name), current: combat.combatant?.name, round: combat.round };
}

/** Player: use the Partner ability's Komenda activity. */
async function komenda() {
  const MOD = "neuroshima-2026-overrides";
  const item = game.user.character.items.find(i => i.getFlag(MOD, "abilityId") === "partner");
  const activity = item.system.activities.contents.find(a => a.name === "Komenda");
  await activity.use({}, { configure: false }, {});
  const evie = game.actors.getName("Evie");
  await window.__e2e.until(() => evie.getFlag(MOD, "komenda"), { message: "Komenda latch on Evie" });
  return { latch: evie.getFlag(MOD, "komenda"), round: game.combat.round };
}

/** GM: `n` × nextTurn, then the state. */
async function dalej({ n = 1 }) {
  const MOD = "neuroshima-2026-overrides";
  const combat = game.combat;
  for (let i = 0; i < n; i++) {
    await combat.nextTurn();
    await window.__e2e.quiet();
  }
  await window.__e2e.quiet({ idleMs: 600 });
  const evie = game.actors.getName("Evie");
  const karty = game.messages.contents.filter(m => m.getFlag(MOD, "bezKomendy"));
  return {
    current: combat.combatant?.name, round: combat.round,
    evieDodging: evie.statuses.has("dodging"),
    karty: karty.map(m => ({ id: m.id, runda: m.getFlag(MOD, "bezKomendy").runda, cofniete: !!m.getFlag(MOD, "bezKomendy").cofniete }))
  };
}

/** GM: click [Cofnij — była komenda] on a card. */
async function cofnij({ id }) {
  const MOD = "neuroshima-2026-overrides";
  await window.__e2e.clickChat(id, ".neuro-komenda-cofnij");
  const combat = game.combat;
  await window.__e2e.until(() => game.messages.get(id)?.getFlag(MOD, "bezKomendy")?.cofniete, { message: "card marked undone" });
  await window.__e2e.quiet({ idleMs: 600 });
  const evie = game.actors.getName("Evie");
  return { current: combat.combatant?.name, round: combat.round, evieDodging: evie.statuses.has("dodging"), latch: evie.getFlag(MOD, "komenda") };
}

/** GM: set GANGUS on fire. */
async function podpal() {
  const g = canvas.scene.tokens.find(t => t.name === "GANGUS ŻOŁNIERZ").actor;
  await game.neuroshima.podpalenie.igniteFor(g, 10);
  await window.__e2e.quiet();
  return { burning: game.neuroshima.podpalenie.isBurning(g), hp: g.system.attributes.hp.value };
}

/** Player: the companion bar on the PC's sheet; [Karta] → Evie's sheet and its badge. */
async function pasek() {
  const pc = game.user.character;
  const evie = game.actors.getName("Evie");
  await pc.sheet.render(true);
  const panel = await window.__e2e.until(() => pc.sheet.element?.querySelector(".neuro-towarzysze-panel"), { message: "companion bar" });
  pc.sheet.setPosition({ left: 80, top: 40 });
  const row = panel.querySelector(".neuro-towarzysz-row");
  const info = {
    evie: row?.dataset.uuid === evie.uuid,
    pw: row?.querySelector(".neuro-towarzysz-pw span")?.textContent.trim(),
    rodzaj: row?.querySelector(".neuro-towarzysz-rodzaj")?.textContent.trim(),
    akcje: [...(row?.querySelectorAll("button[data-akcja]") ?? [])].map(b => b.dataset.akcja + (b.disabled ? "!" : "")),
    podStanem: panel.previousElementSibling?.classList.contains("neuro-stan-panel") ?? false
  };
  row.querySelector('button[data-akcja="karta"]').click();
  const badge = await window.__e2e.until(() => evie.sheet?.rendered && evie.sheet.element?.querySelector(".neuro-towarzysz-badge"),
    { message: "Evie's sheet with the badge" });
  // Side by side, so the screenshot shows the owner's bar and the companion's badge at once.
  evie.sheet.setPosition({ left: pc.sheet.position.left + pc.sheet.position.width + 12, top: pc.sheet.position.top });
  await new Promise(r => setTimeout(r, 300));
  info.badge = badge.textContent.trim();
  info.tip = badge.dataset.tooltip ?? "";
  info.fuksy = Boolean(evie.sheet.element.querySelector(".neuro-fuks-pips"));
  info.pd = Boolean(evie.sheet.element.querySelector(".neuro-pd-panel"));
  return info;
}

/** GM: a primary party of PC Gracz 1, Evie, PC Gracz 2; the members tab order; supplies; one day's needs. */
async function druzyna() {
  const MOD = "neuroshima-2026-overrides";
  for (const c of [...game.combats]) await c.delete();
  const party = await Actor.implementation.create({ name: "Agent · Drużyna", type: "group", flags: { [MOD]: { fixture: "skirmish" } } });
  await party.update({ "system.members": ["PC Gracz 2", "Evie", "PC Gracz 1"].map(n => ({ actor: game.actors.getName(n).id })) });
  // Full rations for everyone: a short day would roll a CON save, which waits for a dialog click.
  await party.createEmbeddedDocuments("Item", [
    { name: "Racje", type: "loot", system: { quantity: 10 }, flags: { [MOD]: { zasob: { kind: "jedzenie", amount: 1 } } } },
    { name: "Woda pitna", type: "loot", system: { quantity: 10 }, flags: { [MOD]: { zasob: { kind: "woda", amount: 2 } } } }
  ]);
  await game.settings.set("dnd5e", "primaryParty", { actor: party.id });
  await party.sheet.render(true);
  await window.__e2e.until(() => party.sheet.element?.querySelector(".member"), { message: "party members" });
  const lista = [...party.sheet.element.querySelectorAll(".member .name a")].map(a => a.textContent.trim());
  const dopisek = party.sheet.element.querySelector(".neuro-towarzysz-dopisek")?.textContent.trim() ?? null;
  const supplies = await import(`/modules/${MOD}/scripts/actors/party-supplies.mjs`);
  const osoby = supplies.buildSuppliesContext(party).osoby.map(o => o.name);
  const przed = game.messages.size;
  await supplies.consumeDailyNeeds(party);
  await window.__e2e.until(() => game.messages.size > przed, { message: "daily needs card" });
  const karta = game.messages.contents.at(-1).content;
  await party.sheet.close();
  return { lista, dopisek, osoby, eviewKarcie: karta.includes("Evie"), primary: game.actors.party?.id === party.id };
}

/** GM: Stopień 1 for PC Gracz 1 and Evie (the Long Rest windows show the recovery section). */
async function rany() {
  const z = await import("/modules/neuroshima-2026-overrides/scripts/combat/zranienie.mjs");
  for (const n of ["PC Gracz 1", "Evie"]) {
    const a = game.actors.getName(n);
    await a.update({ "system.attributes.hp.value": a.system.attributes.hp.max, "system.attributes.exhaustion": 0 });
    await z.setZranienie(a, 1);
  }
  return ["PC Gracz 1", "Evie"].map(n => z.getZranienieLvl(game.actors.getName(n)));
}

/** Player: the medic options in PC Gracz 1's Long Rest window (looked at, then closed). */
async function medycy() {
  const a = game.user.character;
  const odpoczynek = a.longRest();
  let app = null;
  for (let i = 0; i < 80 && !app; i++) {
    await new Promise(r => setTimeout(r, 100));
    app = [...foundry.applications.instances.values()]
      .find(x => x.rendered && (x.actor ?? x.document) === a && x.element?.querySelector('button[name="rest"]'));
  }
  if (!app) return null;
  const opcje = [...app.element.querySelectorAll('[name="neuroZajecia.rekonwalescencja.medyk"] option')].map(o => o.textContent.trim());
  await app.close();
  await odpoczynek;
  return opcje;
}

/** Player: Evie's own Long Rest — Gojenie moves her Regeneracja counter. */
async function odpoczynekEvie() {
  const evie = game.actors.getName("Evie");
  await evie.longRest({ dialog: false });
  await window.__e2e.until(() => game.neuroshima.rekonwalescencja.stan(evie).licznik > 0, { message: "Evie's counter" });
  return game.neuroshima.rekonwalescencja.stan(evie);
}

/** GM: step (+1 next, −1 previous), then GANGUS's HP. */
async function krok({ kierunek }) {
  const combat = game.combat;
  if (kierunek > 0) await combat.nextTurn();
  else await combat.previousTurn();
  await window.__e2e.quiet({ idleMs: 800 });
  const g = canvas.scene.tokens.find(t => t.name === "GANGUS ŻOŁNIERZ").actor;
  return { current: combat.combatant?.name, round: combat.round, hp: g.system.attributes.hp.value };
}

export default {
  name: "towarzysz",
  clients: ["gm", "Gracz 1"],

  async run(t) {
    const p1 = t.client("Gracz 1");
    await t.waitFor(p1, () => Boolean(game.user.character && ui.chat?.element), { message: "the player's client to see the fixture" });

    await t.step("GM: Zwiadowca 3 with Partner (Komenda [B]); Evie, his human partner, on the scene", async () => {
      const r = await t.gm.eval(przygotuj);
      t.equal(r.evieMaxPW, 15, "Evie's PW = 5 × the owner's Zwiadowca level");
      t.assert(r.komenda.includes("Komenda/bonus"), "Partner has no Komenda [B] activity", r);
    });

    await t.step("GM puts the PC and GANGUS in combat → Evie joins, grouped with her owner, group owned by Gracz 1", async () => {
      const r = await t.gm.eval(walka);
      t.equal(r.combatants.join(", "), "Evie, GANGUS ŻOŁNIERZ, PC Gracz 1", "combatants");
      t.equal(r.members.join(", "), "Evie, PC Gracz 1", "group members");
      t.equal(r.groups, 1, "groups in the combat");
      t.equal(r.graczOwns, true, "the player owns the group");
      t.equal(r.active, "PC Gracz 1", "the group rolls with the owner");
    });

    await t.step("Gracz 1 rolls the PC's initiative → the group and Evie take it", async () => {
      await t.waitFor(p1, () => Boolean(game.combat?.combatants.size === 3), { message: "the player to see the combat" });
      const r = await p1.eval(rzutGracza);
      const init = Object.fromEntries(r);
      t.assert(Number.isFinite(init["PC Gracz 1"]), "PC has no initiative", r);
      t.equal(init.Evie, init["PC Gracz 1"], "Evie's initiative");
    });

    await t.step("tie with GANGUS: GANGUS, PC, Evie — the partner right after her owner (F9)", async () => {
      const r = await t.gm.eval(remisIStart);
      t.equal(r.order.join(", "), "GANGUS ŻOŁNIERZ, PC Gracz 1, Evie", "turn order");
      t.equal(r.current, "PC Gracz 1", "combatant on turn");
      await t.gm.eval(async () => {
        game.tours?.activeTour?.exit?.();
        ui.sidebar.expand();
        ui.sidebar.changeTab("combat", "primary");
        await ui.combat.render({ force: true });
        await new Promise(r => setTimeout(r, 400));
      });
      await t.screenshot("gm", "tracker — grupa właściciela");
      await t.gm.eval(() => ui.sidebar.changeTab("chat", "primary"));
    });

    await t.step("Gracz 1 uses Komenda in his turn → Evie takes her own turn", async () => {
      const k = await p1.eval(komenda);
      t.equal(k.latch.runda, k.round, "latch round");
      const r = await t.gm.eval(dalej, { n: 1 });
      t.equal(r.current, "Evie", "Evie on turn");
      t.equal(r.karty.length, 0, "no 'bez komendy' card");
      t.equal(r.evieDodging, false, "Evie not dodging");
    });

    const pominieta = await t.step("next round, no Komenda → Evie's turn skipped with Unikanie and a card", async () => {
      const r = await t.gm.eval(dalej, { n: 3 }); // Evie → GANGUS (r2) → PC → Evie (skipped) → GANGUS (r3)
      t.equal(r.round, 3, "round after the skip");
      t.equal(r.current, "GANGUS ŻOŁNIERZ", "combatant after the skip");
      t.equal(r.evieDodging, true, "Evie dodging");
      t.equal(r.karty.length, 1, "one 'bez komendy' card");
      t.equal(r.karty[0].runda, 2, "card's round");
      await t.screenshot("gm", "karta bez komendy");
      return r.karty[0];
    });

    await t.step("GM [Cofnij — była komenda] → back to Evie's turn in round 2, no Unikanie", async () => {
      const r = await t.gm.eval(cofnij, { id: pominieta.id });
      t.equal(r.round, 2, "round");
      t.equal(r.current, "Evie", "Evie on turn again");
      t.equal(r.evieDodging, false, "Unikanie removed");
      t.equal(r.latch?.runda, 2, "latched for round 2");
    });

    await t.step("burning GANGUS: 1k4 at the start of his turn — once, also after the GM steps back and forward (F17)", async () => {
      const s = await t.gm.eval(podpal);
      t.equal(s.burning, true, "GANGUS burning");
      const a = await t.gm.eval(krok, { kierunek: 1 }); // Evie (r2) → GANGUS (r3): the tick
      t.equal(a.current, "GANGUS ŻOŁNIERZ", "GANGUS on turn");
      t.assert(a.hp < s.hp, "no fire damage at the start of GANGUS's turn", { s, a });
      const b = await t.gm.eval(krok, { kierunek: -1 }); // back to Evie
      t.equal(b.hp, a.hp, "stepping back dealt damage");
      const c = await t.gm.eval(krok, { kierunek: 1 }); // forward to GANGUS again
      t.equal(c.current, "GANGUS ŻOŁNIERZ", "GANGUS on turn again");
      t.equal(c.hp, a.hp, "the same turn ticked twice");
      // Nothing timed may outlive the scene: core's ActiveEffectRegistry keeps a deleted scene's token
      // effects until GC and later "expires" them against a scene that is gone (a console error in the
      // next suite that advances the clock).
      const zgaszony = await t.gm.eval(async () => {
        const g = canvas.scene.tokens.find(tk => tk.name === "GANGUS ŻOŁNIERZ").actor;
        await game.neuroshima.podpalenie.douse(g);
        await window.__e2e.quiet();
        return game.neuroshima.podpalenie.isBurning(g);
      });
      t.equal(zgaszony, false, "GANGUS still burning after douse");
    });

    await t.step("E3: companion bar under Stan on Gracz 1's sheet; [Karta] → Evie's sheet with her badge, no Fuksy or PD", async () => {
      const r = await p1.eval(pasek);
      t.equal(r.evie, true, "the bar's row is Evie");
      t.equal(r.podStanem, true, "the bar sits right under the Stan panel");
      t.equal(r.rodzaj, "Ludzki partner", "kind label");
      t.equal(r.pw, "15 / 15", "Evie's PW in the bar");
      t.equal(r.akcje.join(","), "karta,komenda,zeton", "bar buttons");
      t.equal(r.badge, "Ludzki partner · PC Gracz 1", "badge on Evie's sheet");
      t.assert(r.tip.includes("PW 15 = 5 × poziom klasy właściciela 3"), "breakdown tooltip", r.tip);
      t.equal(r.fuksy, false, "Fuks pips on a companion");
      t.equal(r.pd, false, "PD panel on a companion");
      await t.screenshot("Gracz 1", "karta właściciela i towarzysza");
      await p1.eval(async () => { for (const a of [game.user.character, game.actors.getName("Evie")]) await a.sheet.close(); });
    });

    await t.step("E3: party — Evie under her owner, her daily needs counted", async () => {
      const r = await t.gm.eval(druzyna);
      t.equal(r.primary, true, "primary party");
      t.equal(r.lista.join(", "), "PC Gracz 1, Evie, PC Gracz 2", "members order");
      t.equal(r.dopisek, "Ludzki partner · PC Gracz 1", "kind note under Evie's name");
      t.assert(r.osoby.includes("Evie"), "Evie missing from the daily needs", r.osoby);
      t.equal(r.eviewKarcie, true, "Evie on the daily needs card");
    });

    await t.step("E3: Long Rest — Evie is a medic option for her owner (F6); her own rest moves her Regeneracja counter", async () => {
      t.equal((await t.gm.eval(rany)).join(","), "1,1", "Stopień 1 for both");
      await t.waitFor(p1, () => (game.actors.getName("Evie").getFlag("neuroshima-2026-overrides", "zranienie")?.level ?? 0) === 1,
        { message: "the player to see the Stopień" });
      const opcje = await p1.eval(medycy);
      t.assert(opcje && opcje.some(o => o.startsWith("Evie")), "Evie missing from the medic options", opcje);
      const s = await p1.eval(odpoczynekEvie);
      t.equal(s.licznik, 1, "Evie's Regeneracja counter after one Long Rest");
    });
  }
};
