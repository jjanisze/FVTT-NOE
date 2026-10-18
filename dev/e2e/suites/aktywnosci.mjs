/**
 * Suite — every Neuroshima activity type, used the way the sheet uses it (PLAN_migracja_dnd5e6.md E4: "każdy z 9
 * typów aktywności użyty w teście"). Krótka seria is driven in `combat`; this suite takes the other eight. GM and
 * Gracz 1; Gracz 1 fires, the GM rolls for the NPCs and runs the combat.
 *
 *  - Out of combat: Miażdżąca seria (Minimi, 50 rounds, a template Region with our flag), Dublet (dwururka, one
 *    attack, 2 rounds), Doładuj 1 nabój (dwururka from a box of 12 Ga), Przeładowanie (R700), Wymiana magazynka (AK,
 *    the spare from the dialog), test zestawem (Narzędzia małego kowala: the card's check button → a check, ST 20).
 *  - In combat: the MS template is gone at the first combat update (it belongs to no combat). Długa seria (AK, 10
 *    rounds): the card carries its targets and dnd5e 6 button descriptors (ST in `label.value`); the GM rolls
 *    CYWIL's save from it through the cover window; the template expires at the end of the shooter's turn. Ogień
 *    zaporowy (next round): the zone outlives the shooter's turn; CYWIL walking into it rolls WIS on the GM's client
 *    and is pinned; the zone and the pin end when the shooter's next turn starts.
 *
 * dnd5e 6.0 places templates interactively (`TemplatePlacement`, a click on the canvas); the suite replaces only
 * that last step (`_place`) with a fixed shape, so the hooks, the Region data and the creation are dnd5e's own.
 */

/* Functions below run in the browser (serialised): no closures over this file. */

/** GM: the weapons, ammunition, magazines and kit on PC Gracz 1; no combat, no messages. */
async function przygotuj() {
  const MOD = "neuroshima-2026-overrides";
  for (const c of [...game.combats]) await c.delete();
  if (game.messages.size) await ChatMessage.deleteDocuments(game.messages.map(m => m.id));
  const scene = game.scenes.active ?? game.scenes.contents[0];
  await scene.view();
  await window.__e2e.until(() => canvas.ready && canvas.scene?.id === scene.id, { message: "the scene" });
  const pc = game.actors.getName("PC Gracz 1");
  const P = game.neuroshima.produkcja;
  const mags = await import(`/modules/${MOD}/scripts/weapons/magazine-model.mjs`);
  const stare = canvas.scene.regions.filter(r => r.getFlag(MOD, "burstTemplate") || r.getFlag(MOD, "suppressiveZone"));
  if (stare.length) await canvas.scene.deleteEmbeddedDocuments("Region", stare.map(r => r.id));
  const resztki = pc.items.filter(i => i.getFlag(MOD, "e2eAktywnosci")).map(i => i.id);
  if (resztki.length) await pc.deleteEmbeddedDocuments("Item", resztki);
  const nowy = async ref => {
    const [item] = await P.utworzWynik(pc, { ref, ilosc: 1 });
    await item.setFlag(MOD, "e2eAktywnosci", true);
    return item;
  };
  const ak = await nowy("weapon:ak-kalach");
  await ak.update({ "system.properties": [...ak.system.properties, "tryb_oz"] });
  const minimi = await nowy("weapon:minimi");
  const dwururka = await nowy("weapon:dwururka");
  const r700 = await nowy("weapon:r700");
  // The kit with `nativeCheck` (NeuroToolCheckActivity) as `createToolkits` builds it — the pack builder still writes
  // stock `check` activities for every kit (PLAN_migracja_dnd5e6.md, E8).
  const { createToolkits } = await import(`/modules/${MOD}/scripts/config/toolkits-data.mjs`);
  await createToolkits(pc, { only: ["kowala"] });
  const kit = pc.items.find(i => i.type === "tool" && i.system.type?.baseItem === "kowala");
  await kit.setFlag(MOD, "e2eAktywnosci", true);
  const [naboje] = await P.utworzWynik(pc, { ref: "ammo:12ga_s", ilosc: 4 });
  await naboje.setFlag(MOD, "e2eAktywnosci", true);

  // Magazines from the pack by magwell, loaded full: two for the AK (one in, one spare), a belt for the Minimi.
  const magazynki = await game.packs.get(`${MOD}.magazynki`).getDocuments();
  const magazyn = async (bron, kaliber) => {
    const wzor = magazynki.find(m => mags.magazineDefOf(m)?.magwell === mags.weaponMagwell(bron));
    const [m] = await pc.createEmbeddedDocuments("Item", [game.items.fromCompendium(wzor)]);
    await m.setFlag(MOD, "e2eAktywnosci", true);
    await mags.loadRounds(m, kaliber, mags.freeSpace(m));
    return m;
  };
  const akMag = await magazyn(ak, "76239ak");
  const akZapas = await magazyn(ak, "76239ak");
  await mags.swapMagazineItem(ak, akMag);
  await mags.swapMagazineItem(minimi, await magazyn(minimi, "556"));
  for (let i = 0; i < 2; i++) await mags.loadSingleRound(dwururka, "12ga_s");
  for (let i = 0; i < 3; i++) await mags.loadSingleRound(r700, "762");

  const typy = { [ak.id]: ["neuroDs", "neuroOz", "neuroMagSwap"], [minimi.id]: ["neuroMs"],
    [dwururka.id]: ["neuroDublet", "neuroLoadOne"], [r700.id]: ["neuroReload"], [kit.id]: ["neuroToolCheck"] };
  await window.__e2e.until(() => Object.entries(typy).every(([id, t]) => t.every(typ => pc.items.get(id)?.system.activities
    ?.some(a => a.type === typ))), { timeoutMs: 15000, message: "the activities on every item" });
  return { ak: ak.id, akZapas: akZapas.id, minimi: minimi.id, dwururka: dwururka.id, r700: r700.id, kit: kit.id, naboje: naboje.id };
}

/** Player: dnd5e 6's template placement ends with a fixed shape at `window.__e2eSzablon` instead of a canvas click. */
function zaslepkaSzablonow() {
  const P = dnd5e.canvas.TemplatePlacement.prototype;
  P.__e2eOryginal ??= P._place;
  P._place = async function () {
    const at = window.__e2eSzablon ?? { x: 0, y: 0, rotation: 0 };
    const k = canvas.scene.grid.size / canvas.scene.grid.distance;
    return this.config.shapes.map(s => {
      const base = { x: at.x, y: at.y, rotation: at.rotation ?? 0 };
      const size = Number(s.size ?? 1) * k;
      if (s.type === "circle") return { ...base, type: "circle", radius: size };
      if (s.type === "cone") return { ...base, type: "cone", angle: 53.13, radius: size };
      if ((s.type === "ray") || (s.type === "line")) return { ...base, type: "line", length: size, width: Number(s.width ?? 1) * k };
      return { ...base, type: "rectangle", width: size, height: size, anchorX: 0, anchorY: 0 };
    });
  };
  return true;
}

/** Player: put `itemId` in hand (others to the pack — out of combat that asks nothing). */
async function doReki({ itemId }) {
  const L = game.neuroshima.lalka;
  const pc = game.user.character;
  const item = pc.items.get(itemId);
  for (const { item: held } of L.heldItems(pc)) if (held && held.id !== itemId) await L.takeOff(pc, held);
  const gate = L.useGate(item);
  if (gate === "equip") await L.equip(item);
  else if (gate === "draw") await L.draw(item);
  await window.__e2e.until(() => [null, "proceed"].includes(L.useGate(item)), { message: `${item.name} in hand` });
  return !!L.inHand(item);
}

/** Player: a fire mode with a selection window (DS/MS/OZ), the template at `punkt`, CYWIL targeted. */
async function seria({ itemId, typ, tytul, akcja, cel = null, punkt }) {
  const MOD = "neuroshima-2026-overrides";
  const item = game.user.character.items.get(itemId);
  const act = item.system.activities.find(a => a.type === typ);
  const t = cel ? canvas.tokens.placeables.find(x => x.name === cel) : null;
  canvas.tokens.setTargets(t ? [t.id] : []);
  window.__e2eSzablon = punkt;
  const naboje = () => game.neuroshima.magazynki.getMag(item)?.current ?? null;
  const przed = naboje();
  const regiony0 = new Set(canvas.scene.regions.map(r => r.id));
  const n0 = game.messages.size;
  window.__e2e.forceD20([], { fallback: 10 }); // the jam check jams on a 1
  let okno = null;
  try {
    const uzycie = act.use({}, { configure: false }, {});
    okno = await window.__e2e.clickDialog({ title: tytul }, akcja);
    await uzycie;
    await window.__e2e.quiet({ idleMs: 600 });
  } finally {
    window.__e2e.restoreDice();
    canvas.tokens.setTargets([]);
  }
  const karta = game.messages.contents.slice(n0).find(m => m.type === "usage");
  return {
    okno, zuzyte: przed - naboje(),
    regiony: canvas.scene.regions.filter(r => !regiony0.has(r.id)).map(r => ({
      id: r.id, ksztalt: r.shapes[0]?.type ?? null, seria: !!r.getFlag(MOD, "burstTemplate"),
      strefa: r.getFlag(MOD, "suppressiveZone") ?? null
    })),
    karta: karta ? {
      id: karta.id, cele: (karta.system.targets ?? []).map(x => x.name),
      przyciski: (karta.system.buttons ?? []).map(b => ({ action: b.action, value: b.label?.value ?? null, hidden: b.label?.hidden ?? null, dc: b.dataset?.dc ?? null }))
    } : null
  };
}

/** Player: Dublet with the dwururka at `cel` — the attack dialog answered, rounds and the attack card. */
async function dublet({ itemId, cel }) {
  const item = game.user.character.items.get(itemId);
  const act = item.system.activities.find(a => a.type === "neuroDublet");
  canvas.tokens.setTargets([canvas.tokens.placeables.find(x => x.name === cel).id]);
  const naboje = () => game.neuroshima.magazynki.getMag(item)?.current ?? null;
  const przed = naboje();
  const n0 = game.messages.size;
  window.__e2e.forceD20([15], { fallback: 10 });
  try {
    await act.use({}, { configure: false }, {});
    const okno = await window.__e2e.pressRollDialog("normal");
    await window.__e2e.until(() => naboje() < przed, { timeoutMs: 8000, message: "the dublet's rounds" }).catch(() => {});
    await window.__e2e.quiet({ idleMs: 500 });
    const atak = game.messages.contents.slice(n0).find(m => m.type === "attack");
    return { okno, zuzyte: przed - naboje(), atak: atak?.flavor ?? null };
  } finally {
    window.__e2e.restoreDice();
    canvas.tokens.setTargets([]);
  }
}

/** Player: a magazine activity (`neuroLoadOne` / `neuroReload`) — state before and after, and the card. */
async function magazynowa({ itemId, typ, amunicjaId = null }) {
  const item = game.user.character.items.get(itemId);
  const act = item.system.activities.find(a => a.type === typ);
  const stan = () => {
    const m = game.neuroshima.magazynki.getMag(item);
    return { current: m?.current ?? null, chamber: m?.chamber ?? m?.chambered ?? null };
  };
  const ammo = () => (amunicjaId ? game.user.character.items.get(amunicjaId)?.system.quantity ?? 0 : null);
  const przed = { ...stan(), ammo: ammo() };
  const n0 = game.messages.size;
  const wynik = await act.use({}, { configure: false }, {});
  await window.__e2e.quiet({ idleMs: 500 });
  return { przed, po: { ...stan(), ammo: ammo() }, wynik: !!wynik, karty: game.messages.size - n0 };
}

/** Player: Wymiana magazynka on the AK — the dialog's button for the spare magazine. */
async function wymiana({ itemId, zapasId }) {
  const MOD = "neuroshima-2026-overrides";
  const mags = await import(`/modules/${MOD}/scripts/weapons/magazine-model.mjs`);
  const item = game.user.character.items.get(itemId);
  const act = item.system.activities.find(a => a.type === "neuroMagSwap");
  const przed = mags.loadedMagazine(item)?.id ?? null;
  const uzycie = act.use({}, { configure: false }, {});
  const okno = await window.__e2e.clickDialog({ title: "Wymiana magazynka" }, zapasId);
  await uzycie;
  await window.__e2e.quiet({ idleMs: 500 });
  return { okno, przed, po: mags.loadedMagazine(item)?.id ?? null };
}

/** Player: Narzędzia małego kowala — the usage card, then its check button, the roll dialog answered. */
async function testZestawem({ itemId }) {
  const MOD = "neuroshima-2026-overrides";
  const item = game.user.character.items.get(itemId);
  // The action without a check gate (Wyważenie drzwi lub otwarcie skrzyni, ST 20).
  const act = item.system.activities.find(a => a.type === "neuroToolCheck" && !a.flags?.[MOD]?.checkGate && a.name.startsWith("Wyważenie"));
  const n0 = game.messages.size;
  await act.use({}, { configure: false }, {});
  const karta = await window.__e2e.until(() => game.messages.contents.slice(n0).find(m => m.type === "usage"), { message: "the usage card" });
  const n1 = game.messages.size;
  window.__e2e.forceD20([12], { fallback: 10 });
  try {
    const klik = await window.__e2e.clickChat(karta.id, '[data-action="rollCheck"]');
    const okno = await window.__e2e.pressRollDialog("normal");
    const test = await window.__e2e.until(() => game.messages.contents.slice(n1).find(m => m.type === "check"), { message: "the check" }).catch(() => null);
    return {
      przyciski: (karta.system.buttons ?? []).map(b => b.action), klik, okno,
      test: test ? { st: test.rolls[0]?.options?.target ?? null, d20: test.rolls[0]?.d20?.total ?? null } : null
    };
  } finally {
    window.__e2e.restoreDice();
  }
}

/** GM: combat — PC Gracz 1 first, then CYWIL and GANGUS ŻOŁNIERZ. */
async function walka() {
  for (const c of [...game.combats]) await c.delete();
  const scene = canvas.scene;
  const kolejnosc = ["PC Gracz 1", "CYWIL", "GANGUS ŻOŁNIERZ"].map(n => scene.tokens.find(t => t.name === n));
  const combat = await Combat.implementation.create({ scene: scene.id, active: true });
  await combat.createEmbeddedDocuments("Combatant", kolejnosc.map((t, i) => ({ tokenId: t.id, sceneId: scene.id, actorId: t.actorId, initiative: 30 - i * 10 })));
  await combat.startCombat();
  await window.__e2e.quiet({ idleMs: 800 });
  return { tura: combat.combatant?.name ?? null, runda: combat.round };
}

/** GM: next turn or next round, then the templates of ours left on the scene. */
async function dalej({ krok }) {
  if (krok === "tura") await game.combat.nextTurn();
  else if (krok === "runda") await game.combat.nextRound();
  await window.__e2e.quiet({ idleMs: 1200 });
  return { tura: game.combat?.combatant?.name ?? null, runda: game.combat?.round ?? null };
}

/** GM: our template Regions on the viewed scene. */
function regiony() {
  const MOD = "neuroshima-2026-overrides";
  return canvas.scene.regions.filter(r => r.getFlag(MOD, "burstTemplate") || r.getFlag(MOD, "suppressiveZone")).map(r => ({
    id: r.id, seria: !!r.getFlag(MOD, "burstTemplate"), strefa: !!r.getFlag(MOD, "suppressiveZone"),
    trafione: r.getFlag(MOD, "suppressiveZone")?.triggeredTokenIds ?? []
  }));
}

/** GM: a token's position and centre, by name. */
function zeton({ nazwa }) {
  const t = canvas.scene.tokens.find(x => x.name === nazwa);
  const c = t.object.center;
  return { id: t.id, x: t.x, y: t.y, srodek: { x: c.x, y: c.y }, siatka: canvas.scene.grid.size };
}

/** GM: CYWIL's save from the DS usage card — the cover window confirmed, the roll dialog answered. */
async function rzutZKarty({ messageId, cel, k20 }) {
  const t = canvas.tokens.placeables.find(x => x.name === cel);
  t.control({ releaseOthers: true });
  const n0 = game.messages.size;
  window.__e2e.forceD20([k20], { fallback: 10 });
  try {
    const klik = await window.__e2e.clickChat(messageId, '[data-action="rollSave"]');
    const oslona = await window.__e2e.clickDialog({ title: "Osłona" }, "confirm");
    const okno = await window.__e2e.pressRollDialog("normal");
    const save = await window.__e2e.until(() => game.messages.contents.slice(n0).find(m => m.type === "save"), { message: "the save" }).catch(() => null);
    return { klik, oslona, okno, save: save ? { cecha: save.system.ability ?? null, st: save.rolls[0]?.options?.target ?? null, kto: save.speaker?.alias ?? null } : null };
  } finally {
    window.__e2e.restoreDice();
    canvas.tokens.releaseAll();
  }
}

/** GM: CYWIL walks into the zone; the zone's WIS save comes up on this client (the active GM's). */
async function wejscieWStrefe({ nazwa, x, y, k20 }) {
  const MOD = "neuroshima-2026-overrides";
  const td = canvas.scene.tokens.find(t => t.name === nazwa);
  const n0 = game.messages.size;
  window.__e2e.forceD20([k20], { fallback: 10 });
  try {
    const ruch = td.move({ x, y, action: "displace" }, { constrainOptions: { ignoreWalls: true, ignoreCost: true } });
    const okno = await window.__e2e.pressRollDialog("normal");
    await ruch;
    await window.__e2e.quiet({ idleMs: 800 });
    const save = game.messages.contents.slice(n0).find(m => m.type === "save");
    return { okno, save: save ? { cecha: save.system.ability ?? null, st: save.rolls[0]?.options?.target ?? null } : null,
      przygwozdzony: !!td.actor.getFlag(MOD, "suppressiveFire") };
  } finally {
    window.__e2e.restoreDice();
  }
}

/** GM: is `nazwa` still pinned by Ogień zaporowy? */
function przygwozdzony({ nazwa }) {
  return !!canvas.scene.tokens.find(t => t.name === nazwa)?.actor?.getFlag("neuroshima-2026-overrides", "suppressiveFire");
}

/** GM: the items, magazines and regions this suite made; no combat. */
async function sprzataj() {
  const MOD = "neuroshima-2026-overrides";
  for (const c of [...game.combats]) await c.delete();
  const pc = game.actors.getName("PC Gracz 1");
  const ids = pc.items.filter(i => i.getFlag(MOD, "e2eAktywnosci")).map(i => i.id);
  if (ids.length) await pc.deleteEmbeddedDocuments("Item", ids);
  const r = canvas.scene.regions.filter(x => x.getFlag(MOD, "burstTemplate") || x.getFlag(MOD, "suppressiveZone"));
  if (r.length) await canvas.scene.deleteEmbeddedDocuments("Region", r.map(x => x.id));
  const cywil = canvas.scene.tokens.find(t => t.name === "CYWIL")?.actor;
  if (cywil?.getFlag(MOD, "suppressiveFire")) await cywil.unsetFlag(MOD, "suppressiveFire");
  await window.__e2e.quiet({ idleMs: 800 });
  return true;
}

export default {
  name: "aktywnosci",
  clients: ["gm", "Gracz 1"],

  async run(t) {
    const p1 = t.client("Gracz 1");
    let ids;

    await t.step("GM: AK (+OZ), Minimi, dwururka, R700, Narzędzia małego kowala and 12 Ga on PC Gracz 1; magazines loaded", async () => {
      ids = await t.gm.eval(przygotuj);
      await t.waitFor(p1, (o) => (Object.values(o).every(id => game.user.character.items.get(id)) ? true : null),
        { args: [ids], message: "the items on the player's client" });
      t.equal(await p1.eval(zaslepkaSzablonow), true, "template placement stubbed on the player's client");
    });

    await t.step("Miażdżąca seria (Minimi): 50 rounds, a line template Region flagged as the burst's", async () => {
      t.equal(await p1.eval(doReki, { itemId: ids.minimi }), true, "Minimi in hand");
      const pc = await t.gm.eval(zeton, { nazwa: "PC Gracz 1" });
      const r = await p1.eval(seria, { itemId: ids.minimi, typ: "neuroMs", tytul: "Miażdżąca seria", akcja: "burst-50",
        cel: "CYWIL", punkt: { x: pc.srodek.x, y: pc.srodek.y, rotation: 0 } });
      t.assert(r.okno, "the selection window (DialogV2)", r);
      t.equal(r.zuzyte, 50, "rounds spent");
      t.equal(r.regiony.length, 1, "one template Region");
      t.equal(r.regiony[0]?.seria, true, "flagged as a burst template (dnd5e.createMeasuredTemplate)");
      t.assert(r.karta?.przyciski.some(b => b.action === "rollSave" && /^ST \d+ - /.test(b.value ?? "")), "save buttons as dnd5e 6 descriptors with our DC label", r.karta);
    });

    await t.step("Dublet (dwururka): one attack, both barrels", async () => {
      t.equal(await p1.eval(doReki, { itemId: ids.dwururka }), true, "dwururka in hand");
      const r = await p1.eval(dublet, { itemId: ids.dwururka, cel: "CYWIL" });
      t.assert(r.okno, "the attack dialog", r);
      t.equal(r.zuzyte, 2, "rounds spent");
      t.assert(/Dublet/i.test(r.atak ?? ""), "the attack card is the dublet's", r);
    });

    await t.step("Doładuj 1 nabój (dwururka): one 12 Ga from the box into the barrel", async () => {
      const r = await p1.eval(magazynowa, { itemId: ids.dwururka, typ: "neuroLoadOne", amunicjaId: ids.naboje });
      t.equal(r.po.current - r.przed.current, 1, "one round more in the weapon");
      t.equal(r.przed.ammo - r.po.ammo, 1, "one round less in the box");
    });

    await t.step("Przeładowanie (R700): the bolt cycles, a card in chat", async () => {
      t.equal(await p1.eval(doReki, { itemId: ids.r700 }), true, "R700 in hand");
      const r = await p1.eval(magazynowa, { itemId: ids.r700, typ: "neuroReload" });
      t.equal(r.wynik, true, "the reload ran");
      t.assert(r.karty >= 1, "a chat card", r);
    });

    await t.step("Wymiana magazynka (AK): the spare from the window goes in", async () => {
      t.equal(await p1.eval(doReki, { itemId: ids.ak }), true, "AK in hand");
      const r = await p1.eval(wymiana, { itemId: ids.ak, zapasId: ids.akZapas });
      t.assert(r.okno, "the swap window", r);
      t.equal(r.po, ids.akZapas, "the spare magazine is in");
    });

    await t.step("Test zestawem (Narzędzia małego kowala): the card's check button → a check, ST 20", async () => {
      const r = await p1.eval(testZestawem, { itemId: ids.kit });
      t.assert(r.przyciski.includes("rollCheck"), "the check button on the usage card", r);
      t.equal(r.klik, true, "button clicked");
      t.equal(r.test?.st, 20, "the action's DC");
      t.equal(r.test?.d20, 12, "forced d20");
    });

    await t.step("GM: combat (PC Gracz 1 first) — the Minimi's template, made outside it, is gone at the first update", async () => {
      const w = await t.gm.eval(walka);
      t.equal(w.tura, "PC Gracz 1", "the PC's turn");
      const r = await t.waitFor(t.gm, () => (canvas.scene.regions.some(x => x.getFlag("neuroshima-2026-overrides", "burstTemplate")) ? null : true),
        { message: "the out-of-combat burst template to expire" });
      t.equal(r, true, "no burst template left");
    });

    let ds;
    await t.step("Długa seria (AK) at CYWIL: 10 rounds, a template, the card with CYWIL and a DEX save button", async () => {
      const pc = await t.gm.eval(zeton, { nazwa: "PC Gracz 1" });
      const cel = await t.gm.eval(zeton, { nazwa: "CYWIL" });
      ds = await p1.eval(seria, { itemId: ids.ak, typ: "neuroDs", tytul: "Długa seria", akcja: "burst-10", cel: "CYWIL",
        punkt: { x: pc.srodek.x, y: pc.srodek.y, rotation: (Math.atan2(cel.srodek.y - pc.srodek.y, cel.srodek.x - pc.srodek.x) * 180) / Math.PI } });
      t.equal(ds.zuzyte, 10, "rounds spent");
      t.equal(ds.regiony.length, 1, "one template Region");
      t.equal(ds.regiony[0]?.ksztalt, "line", "a line (1,5 m × 36 m)");
      t.equal(ds.regiony[0]?.seria, true, "flagged as a burst template");
      t.equal(JSON.stringify(ds.karta?.cele), JSON.stringify(["CYWIL"]), "the card's targets (dnd5e 6 descriptors)");
      const przycisk = ds.karta?.przyciski.find(b => b.action === "rollSave");
      t.assert(/^ST \d+ - Zręczność$/.test(przycisk?.value ?? ""), "our DC label", przycisk);
      t.equal(przycisk?.hidden, "Rzut obronny - Zręczność", "label while the DC is hidden");
      await t.screenshot("Gracz 1", "długa seria — karta i szablon");
    });

    await t.step("GM rolls CYWIL's save from the DS card: cover window, roll dialog, a DEX save against the card's DC", async () => {
      const przycisk = ds.karta.przyciski.find(b => b.action === "rollSave");
      const r = await t.gm.eval(rzutZKarty, { messageId: ds.karta.id, cel: "CYWIL", k20: 5 });
      t.equal(r.klik, true, "button clicked");
      t.assert(r.oslona, "the cover window (DialogV2)", r);
      t.equal(r.save?.cecha, "dex", "a DEX save");
      t.equal(r.save?.st, Number(przycisk.dc), "against the button's DC");
    });

    await t.step("GM: next turn — the DS template ends with the shooter's turn", async () => {
      await t.gm.eval(dalej, { krok: "tura" });
      t.equal((await t.gm.eval(regiony)).filter(r => r.seria).length, 0, "no burst template left");
    });

    let strefa;
    await t.step("Next round, PC's turn — Ogień zaporowy (AK): 6 rounds, a 3 × 3 m zone flagged with its DC", async () => {
      const w = await t.gm.eval(dalej, { krok: "runda" });
      t.equal(w.tura, "PC Gracz 1", "the PC's turn again");
      const cel = await t.gm.eval(zeton, { nazwa: "CYWIL" });
      const punkt = { x: cel.x + 3 * cel.siatka, y: cel.y, rotation: 0 };
      const r = await p1.eval(seria, { itemId: ids.ak, typ: "neuroOz", tytul: "Ogień zaporowy", akcja: "shape-square", punkt });
      t.equal(r.zuzyte, 6, "rounds spent");
      t.equal(r.regiony.length, 1, "one zone Region");
      t.assert(Number.isFinite(r.regiony[0]?.strefa?.saveDc), "the zone carries its save DC", r.regiony[0]);
      strefa = { ...punkt, dc: r.regiony[0].strefa.saveDc };
    });

    await t.step("GM: next turn — the zone stays; CYWIL walks in, fails WIS on the GM's client and is pinned", async () => {
      await t.gm.eval(dalej, { krok: "tura" });
      t.equal((await t.gm.eval(regiony)).filter(r => r.strefa).length, 1, "the zone outlives the shooter's turn");
      const r = await t.gm.eval(wejscieWStrefe, { nazwa: "CYWIL", x: strefa.x, y: strefa.y, k20: 2 });
      t.assert(r.okno, "the save's roll dialog on the GM's client", r);
      t.equal(r.save?.cecha, "wis", "a WIS save");
      t.equal(r.save?.st, strefa.dc, "against the zone's DC");
      t.equal(r.przygwozdzony, true, "CYWIL pinned");
      const z = (await t.gm.eval(regiony)).find(x => x.strefa);
      const cywil = await t.gm.eval(zeton, { nazwa: "CYWIL" });
      t.assert(z?.trafione.includes(cywil.id), "the zone remembers CYWIL", z);
      const p1Save = await p1.eval(() => game.messages.contents.filter(m => m.type === "save" && m.flavor === "Ogień zaporowy").length);
      t.equal(p1Save, 1, "one zone save in chat — rolled once, not on every client");
    });

    await t.step("GM: the shooter's next turn — the zone and the pin end", async () => {
      const w = await t.gm.eval(dalej, { krok: "runda" });
      t.equal(w.tura, "PC Gracz 1", "the PC's turn");
      t.equal((await t.gm.eval(regiony)).length, 0, "no zone left");
      t.equal(await t.gm.eval(przygwozdzony, { nazwa: "CYWIL" }), false, "CYWIL free");
      await t.gm.eval(sprzataj);
    });
  }
};
