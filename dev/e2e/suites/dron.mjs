/**
 * Suite — Dron (PLAN_m3_towarzysze.md E7, §7.9). GM and Gracz 1.
 *
 *  - PC Gracz 1 is a Spec 3 with Hakerstwo (INT 12 → +1, PB 2) and the parts for a walking drone.
 *  - Gracz 1, in his own login, starts and finishes the Hakerstwo Robota: the drone is born on the active
 *    GM's client (relay, U12) — a machine actor with the creator's stamp (TT 13, PW 10), owned by Gracz 1,
 *    folder Drony, and a folded handle (25 kg) in his inventory; the production card says so.
 *  - Gracz 1's companion bar shows the drone; the header badge names the creator and "System ruszył …".
 *  - [Rozłóż] on the bar → dnd5e's token preview → a real click on the canvas next to his PC: the GM creates
 *    the token, the handle turns "rozłożony", 0 kg.
 *  - E7b, drone deployed: the GM hands Gracz 1 a factory controller (in the backpack), mounts a dagger on the
 *    drone and starts a combat. Komenda [B] from the controller asks to take it in hand first (D22) — "Weź do
 *    ręki" puts it there through the doll; the card lists the [B] actions; the active GM makes Gracz 1 the
 *    operator and owner; the player controls the drone's token.
 *  - An attack with the drone's dagger under [B] carries "atak wymaga Steruj [A]" (D36); its to-hit is
 *    2 + creator's PB 2 + operator's DEX 1 (U13). Steruj [A] in the same round is "druga aktywacja" (D35); the
 *    next attack has no badge. Reaguj [R] — a card with the drone's attack button.
 *  - E7c: a critical hit on the drone → the GM's failure card → k20 (forced 13) → [Zastosuj] → TT −2 until repair
 *    (D10). The world clock moves 30 min → the walking drone's battery is at 50% (U15). 0 PW → Wyłączony, not
 *    dead (§7.4) — the player sees the status.
 *  - [Złóż] → the token is gone, the handle is folded again, 25 kg, no operator.
 */

/* Functions below run in the browser (serialised): no closures over this file. */

/** GM: Spec 3 with Hakerstwo and the parts for a walking drone on PC Gracz 1. */
async function przygotuj() {
  const MOD = "neuroshima-2026-overrides";
  for (const c of [...game.combats]) await c.delete();
  const pc = game.actors.getName("PC Gracz 1");
  const klasy = await game.packs.get(`${MOD}.klasy`).getDocuments();
  const zdolnosci = await game.packs.get(`${MOD}.zdolnosci-klasowe`).getDocuments();
  const cls = game.items.fromCompendium(klasy.find(i => i.type === "class" && i.system.identifier === "spec"));
  cls.system.levels = 3;
  const hak = game.items.fromCompendium(zdolnosci.find(i => i.getFlag(MOD, "abilityId") === "hakerstwo"));
  const { buildSurowiecItemData } = await import(`/modules/${MOD}/scripts/actors/surowce-store.mjs`);
  const surowce = Object.entries({ CE: 15, CH: 1, CZ: 10, MK: 9 }).map(([k, v]) => buildSurowiecItemData(k, v));
  await pc.createEmbeddedDocuments("Item", [cls, hak, ...surowce]);
  await pc.update({ "system.attributes.hp.value": pc.system.attributes.hp.max });
  return {
    prof: pc.system.attributes.prof, int: pc.system.abilities.int.mod,
    szablon: Boolean((await game.packs.get(`${MOD}.towarzysze`).getIndex({ fields: [`flags.${MOD}.towarzyszSzablon`] }))
      .find(e => e.flags?.[MOD]?.towarzyszSzablon === "dron-kroczacy"))
  };
}

/**
 * Player: start the drone Robota and finish it (no test — the suite is about what comes out). Which recipe
 * depends on Kobalt: the Hakerstwo table in NOE, the standard recipe its list unlocks under WKK (D37).
 */
async function produkuj() {
  const pc = game.user.character;
  const P = game.neuroshima.produkcja;
  const dostep = P.przepisy(pc).find(x => x.przepis.wynik?.ref === "tabela:dron-kroczacy" && x.zrodla.length);
  if (!dostep) return { robota: false, przepis: null };
  const robota = await P.start(pc, dostep.przepis, { mimoBrakow: true });
  if (!robota) return { robota: false, przepis: dostep.przepis.id };
  await P.zakoncz(robota, { zrodlo: "bez-testu" });
  const karta = game.messages.contents.at(-1);
  return { robota: true, karta: karta?.content?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() ?? null };
}

/** Any client: the drone and its handle as this client sees them. */
function stan() {
  const MOD = "neuroshima-2026-overrides";
  const pc = game.actors.getName("PC Gracz 1");
  const u = pc?.items.find(i => i.flags?.[MOD]?.dron?.aktor);
  const dron = u ? fromUuidSync(u.flags[MOD].dron.aktor) : null;
  if (!dron) return null;
  const t = dron.flags[MOD].towarzysz;
  const tokens = game.scenes.contents.flatMap(s => s.tokens.filter(x => x.actorId === dron.id));
  return {
    nazwa: dron.name, rodzaj: t.rodzaj, tworca: t.tworca?.nazwa, folder: dron.folder?.name ?? null,
    owner: dron.testUserPermission(game.users.getName("Gracz 1"), "OWNER"),
    tt: dron.system.attributes.ac.value, hp: [dron.system.attributes.hp.value, dron.system.attributes.hp.max],
    uchwyt: { nazwa: u.name, waga: u.system.weight.value, rozlozony: u.flags[MOD].dron.rozlozony, ilosc: u.system.quantity },
    operator: t.operator ?? null,
    zetony: tokens.map(x => ({ x: x.x, y: x.y }))
  };
}

/** Player: the companion bar's drone row and the drone's header badge. */
async function pasek() {
  const pc = game.user.character;
  await pc.sheet.render(true);
  const row = await window.__e2e.until(() => pc.sheet.element?.querySelector(".neuro-towarzysze-panel .neuro-towarzysz-row"),
    { message: "drone row on the bar" });
  const out = {
    rodzaj: row.querySelector(".neuro-towarzysz-rodzaj")?.textContent.trim(),
    pw: row.querySelector(".neuro-towarzysz-pw span")?.textContent.trim(),
    akcje: [...row.querySelectorAll("button[data-akcja]")].map(b => b.dataset.akcja + (b.disabled ? "!" : ""))
  };
  row.querySelector('button[data-akcja="karta"]').click();
  const MOD = "neuroshima-2026-overrides";
  const u = pc.items.find(i => i.flags?.[MOD]?.dron?.aktor);
  const dron = fromUuidSync(u.flags[MOD].dron.aktor);
  const badge = await window.__e2e.until(() => dron.sheet?.rendered && dron.sheet.element?.querySelector(".neuro-towarzysz-badge"),
    { message: "drone badge" });
  out.plakietka = badge.textContent.trim();
  out.dymek = badge.dataset.tooltip ?? "";
  // Side by side for the screenshot: the holder's bar and the drone's badge.
  pc.sheet.setPosition({ left: 20, top: 20 });
  dron.sheet.setPosition({ left: 760, top: 20 });
  return out;
}

async function zamknijKarty() {
  for (const app of [...foundry.applications.instances.values()]) if (app.document && app.rendered) await app.close();
  return true;
}

/** Player: a bar button (`rozloz` | `zloz`) — the bar's own path, not the API. */
async function przycisk({ akcja }) {
  const pc = game.user.character;
  await pc.sheet.render(true);
  const b = await window.__e2e.until(() => pc.sheet.element?.querySelector(`.neuro-towarzysze-panel button[data-akcja="${akcja}"]:not([disabled])`),
    { message: `[${akcja}] on the bar` });
  b.click();
  // The placement preview listens on the canvas; the sheet must not cover the click.
  await new Promise(r => setTimeout(r, 300));
  await pc.sheet.close();
  return true;
}

/** GM: a factory controller for Gracz 1 (backpack), a dagger on the drone, a started combat. */
async function przygotujSterowanie() {
  const MOD = "neuroshima-2026-overrides";
  const pc = game.actors.getName("PC Gracz 1");
  const sprzet = await game.packs.get(`${MOD}.sprzet`).getDocuments();
  const k = sprzet.find(i => i.flags?.[MOD]?.kontroler === "fabryczny");
  const [kontroler] = await pc.createEmbeddedDocuments("Item", [game.items.fromCompendium(k)]);
  const u = pc.items.find(i => i.flags?.[MOD]?.dron?.aktor);
  const dron = fromUuidSync(u.flags[MOD].dron.aktor);
  const bron = await game.packs.get(`${MOD}.bron`).getDocuments();
  const [sztylet] = await dron.createEmbeddedDocuments("Item", [game.items.fromCompendium(bron.find(i => i.name === "Sztylet"))]);
  await window.__e2e.until(() => dron.items.get(sztylet.id)?.system.activities.find(a => a.type === "attack"), { message: "the dagger's attack" });
  for (const c of [...game.combats]) await c.delete();
  const scene = canvas.scene;
  const combat = await Combat.implementation.create({ scene: scene.id, active: true });
  const toks = scene.tokens.filter(t => t.actorId !== dron.id);
  await combat.createEmbeddedDocuments("Combatant", toks.map((t, i) => ({ tokenId: t.id, sceneId: scene.id, actorId: t.actorId, initiative: 20 - i })));
  await combat.startCombat();
  return {
    kontroler: kontroler.name, rodzina: game.neuroshima.lalka.familyOf(kontroler), wRece: game.neuroshima.lalka.inHand(kontroler),
    combatants: combat.combatants.size, dronWWalce: combat.combatants.some(c => c.actorId === dron.id)
  };
}

/** Player: a controller activity (`komenda` | `steruj` | `reaguj`) the way the sheet runs it — `activity.use()`. */
async function aktywnosc({ id, wRece = null }) {
  const MOD = "neuroshima-2026-overrides";
  const pc = game.user.character;
  const kontroler = pc.items.find(i => i.flags?.[MOD]?.kontroler);
  const before = game.messages.size;
  const act = kontroler.system.activities.get(id);
  act.use();
  if (wRece) await window.__e2e.clickDialog({ title: "Kontroler nie jest w ręce" }, wRece);
  const karta = await window.__e2e.until(() => game.messages.contents.slice(before).find(m => m.flags?.[MOD]?.dronAktywacjaKarta),
    { message: "the activation card" });
  const f = karta.flags[MOD].dronAktywacjaKarta;
  return {
    tryb: f.tryb, druga: f.druga, wRece: game.neuroshima.lalka.inHand(pc.items.get(kontroler.id)),
    tekst: karta.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
    przyciski: [...new DOMParser().parseFromString(karta.content, "text/html").querySelectorAll('[data-action="neuroDronAtak"]')].length
  };
}

/** Player: the drone as it reaches this client — operator, ownership, token control. */
async function sterowanie() {
  const MOD = "neuroshima-2026-overrides";
  const pc = game.user.character;
  const u = pc.items.find(i => i.flags?.[MOD]?.dron?.aktor);
  const dron = fromUuidSync(u.flags[MOD].dron.aktor);
  await window.__e2e.until(() => dron.flags[MOD].towarzysz.operator === pc.uuid && dron.isOwner, { message: "operator and ownership" });
  await window.__e2e.until(() => canvas.tokens.controlled.some(t => t.actor?.id === dron.id), { message: "drone token controlled" });
  return { operator: dron.flags[MOD].towarzysz.operator === pc.uuid, owner: dron.isOwner, aktywacja: dron.flags[MOD].dronAktywacja?.tryb };
}

/** Player: an attack with the drone's dagger, d20 forced to 10; the usage card's badges and the to-hit total. */
async function atakDrona() {
  const MOD = "neuroshima-2026-overrides";
  const pc = game.user.character;
  const u = pc.items.find(i => i.flags?.[MOD]?.dron?.aktor);
  const dron = fromUuidSync(u.flags[MOD].dron.aktor);
  const sztylet = dron.items.find(i => i.type === "weapon");
  const attack = sztylet.system.activities.find(a => a.type === "attack");
  canvas.tokens.setTargets([]);
  window.__e2e.forceD20([10], { fallback: 3 });
  try {
    const usage = await attack.use({ subsequentActions: false }, { configure: false }, {});
    const link = { data: { flags: { dnd5e: { originatingMessage: usage.message.id } } } };
    const [roll] = await attack.rollAttack({}, { configure: false }, link);
    return { plakietki: usage.message.flags?.[MOD]?.dronPlakietki ?? [], total: roll?.total ?? null, natural: roll?.d20?.total ?? null };
  } finally {
    window.__e2e.restoreDice();
  }
}

/** GM: a critical hit on the drone; roll the failure table with d20 forced to `k20`; [Zastosuj]. */
async function awaria({ k20 }) {
  const MOD = "neuroshima-2026-overrides";
  const pc = game.actors.getName("PC Gracz 1");
  const u = pc.items.find(i => i.flags?.[MOD]?.dron?.aktor);
  const dron = fromUuidSync(u.flags[MOD].dron.aktor);
  const tt = dron.system.attributes.ac.value;
  const before = game.messages.size;
  await dron.applyDamage(1, { isCritical: true });
  const karta = await window.__e2e.until(() => game.messages.contents.slice(before).find(m => m.flags?.[MOD]?.machineFailure),
    { message: "the failure card" });
  window.__e2e.forceD20([k20], { fallback: 3 });
  try {
    await window.__e2e.clickChat(karta.id, ".neuro-failure-btn");
    const rzut = await window.__e2e.until(() => game.messages.contents.slice(before).find(m => m.flags?.[MOD]?.awariaRzut),
      { message: "the failure roll" });
    await window.__e2e.clickChat(rzut.id, ".neuro-failure-apply");
    const efekt = await window.__e2e.until(() => dron.effects.find(e => e.flags?.[MOD]?.awaria === rzut.flags[MOD].awariaRzut.pozycja),
      { message: "the failure effect" });
    return { pozycja: rzut.flags[MOD].awariaRzut.pozycja, efekt: efekt.name, ttPrzed: tt, ttPo: dron.system.attributes.ac.value };
  } finally {
    window.__e2e.restoreDice();
  }
}

/** Any client: the drone's live power and status. */
function zasilanie() {
  const MOD = "neuroshima-2026-overrides";
  const pc = game.actors.getName("PC Gracz 1");
  const u = pc.items.find(i => i.flags?.[MOD]?.dron?.aktor);
  const dron = fromUuidSync(u.flags[MOD].dron.aktor);
  const s = game.neuroshima.drony.stanZasilania(dron);
  return { procent: Math.round(s.procent), pracuje: s.pracuje, wylaczony: dron.statuses.has("wylaczony"), martwy: dron.statuses.has("dead") };
}

export default {
  name: "dron",
  clients: ["gm", "Gracz 1"],

  async run(t) {
    const p1 = t.client("Gracz 1");
    await t.waitFor(p1, () => Boolean(game.user.character && ui.chat?.element), { message: "the player's client to see the fixture" });

    await t.step("GM: Spec 3 with Hakerstwo and the parts for a walking drone", async () => {
      const r = await t.gm.eval(przygotuj);
      t.equal(r.szablon, true, "walking drone template in the towarzysze pack");
      t.equal(r.prof, 2, "PB");
      t.equal(r.int, 1, "INT mod");
    });

    await t.step("Gracz 1 finishes the Hakerstwo Robota → the GM's client builds the drone (relay)", async () => {
      const r = await p1.eval(produkuj);
      t.equal(r.robota, true, `Robota started (${r.przepis})`);
      t.assert(/Dron kroczący \(złożony\) → PC Gracz 1/.test(r.karta ?? ""), "production card names the drone and the holder", r);
      const s = await t.waitFor(p1, stan, { message: "the drone and its handle on the player's client" });
      t.equal(s.rodzaj, "dron-kroczacy", "kind");
      t.equal(s.tworca, "PC Gracz 1", "creator stamp (D23)");
      t.equal(s.folder, "Drony", "folder");
      t.equal(s.owner, true, "owned by Gracz 1 (follows the holder)");
      t.equal(s.tt, 13, "TT = 10 + INT 1 + PB 2 of the creator");
      t.equal(s.hp.join("/"), "10/10", "PW = 10 × INT 1, full");
      t.equal(s.uchwyt.waga, 25, "folded handle weighs 25 kg (D21)");
      t.equal(s.uchwyt.rozlozony, false, "folded");
      t.equal(s.zetony.length, 0, "no token yet");
    });

    await t.step("Bar row and badge: kind and state, creator, \"System ruszył …\"", async () => {
      const r = await p1.eval(pasek);
      t.equal(r.rodzaj, "Dron kroczący · złożony", "row kind and state");
      t.equal(r.pw, "10 / 10", "PW on the bar");
      t.equal(r.akcje.join(","), "karta,rozloz", "buttons while folded");
      t.assert(/Dron kroczący · twórca PC Gracz 1/.test(r.plakietka), "badge names the creator", r);
      t.assert(/System ruszył .+ roku\./.test(r.dymek), "launch line in the tooltip (D23)", r);
      t.assert(/TT 13 = /.test(r.dymek), "TT breakdown in the tooltip", r);
      await t.screenshot("Gracz 1", "pasek i plakietka drona");
      await p1.eval(zamknijKarty);
    });

    await t.step("[Rozłóż] → token preview → a real click next to the PC: the GM places the token, the handle turns 0 kg", async () => {
      await p1.eval(przycisk, { akcja: "rozloz" });
      await p1.clickCanvas({ x: 550, y: 650 });
      const s = await t.waitFor(p1, () => {
        const MOD = "neuroshima-2026-overrides";
        const u = game.user.character.items.find(i => i.flags?.[MOD]?.dron?.aktor);
        return u?.flags[MOD].dron.rozlozony ? { waga: u.system.weight.value, nazwa: u.name } : null;
      }, { message: "the handle to turn deployed" });
      const st = await t.gm.eval(stan);
      t.equal(st.zetony.length, 1, "one drone token");
      t.equal(`${st.zetony[0].x},${st.zetony[0].y}`, "500,600", "token on the clicked square, next to the PC");
      t.equal(s.waga, 0, "deployed handle weighs nothing");
      t.assert(/\(rozłożony\)$/.test(s.nazwa), "handle name says deployed", s);
      await t.screenshot("Gracz 1", "dron rozłożony obok postaci");
    });

    await t.step("GM: factory controller for Gracz 1 (backpack), a dagger on the drone, combat started (drone not a combatant)", async () => {
      const r = await t.gm.eval(przygotujSterowanie);
      t.equal(r.rodzina, "handOnly", "controller is a hand-only doll item");
      t.equal(r.wRece, false, "controller starts in the backpack");
      t.equal(r.dronWWalce, false, "drone has no combatant (D35)");
    });

    await t.step("Komenda [B] with the controller in the backpack → [Weź do ręki] → card; Gracz 1 operates and controls the drone", async () => {
      const r = await p1.eval(aktywnosc, { id: "neuroDronKomenda", wRece: "yes" });
      t.equal(r.tryb, "B", "activation mode");
      t.equal(r.druga, false, "first activation this round");
      t.equal(r.wRece, true, "controller in hand after the dialog (D22)");
      t.assert(/Wolno: Ruch, Unikanie, Odstąpienie, Przyspieszenie, Bieganie, Zostań\./.test(r.tekst), "[B] actions for a walking drone (D36)", r);
      t.assert(/Atak wymaga Steruj \[A\]/.test(r.tekst), "[B] reminds that attacking needs [A]", r);
      const s = await p1.eval(sterowanie);
      t.equal(s.operator, true, "Gracz 1's PC is the operator");
      t.equal(s.owner, true, "Gracz 1 owns the drone while operating (D12)");
      t.equal(s.aktywacja, "B", "latch");
      await t.screenshot("Gracz 1", "komenda drona — karta i kontrola żetonu");
    });

    await t.step("Attack under [B] → badge \"atak wymaga Steruj [A]\"; to-hit 2 + creator's PB 2 + operator's DEX 1 (U13)", async () => {
      const r = await p1.eval(atakDrona);
      t.equal(r.natural, 10, "forced d20");
      t.equal(r.total, 15, "10 + 2 + 2 + 1");
      t.assert(r.plakietki.some(p => /Komendzie \[B\].*Steruj \[A\]/.test(p)), "badge on the attack card (D36)", r);
    });

    await t.step("Steruj [A] in the same round → \"druga aktywacja\" (D35); the next attack has no badge", async () => {
      const r = await p1.eval(aktywnosc, { id: "neuroDronSteruj0" });
      t.equal(r.tryb, "A", "activation mode");
      t.equal(r.druga, true, "second activation this round");
      t.assert(/Druga aktywacja drona w tej rundzie/.test(r.tekst), "badge text", r);
      await t.waitFor(p1, () => {
        const MOD = "neuroshima-2026-overrides";
        const u = game.user.character.items.find(i => i.flags?.[MOD]?.dron?.aktor);
        return fromUuidSync(u.flags[MOD].dron.aktor).flags[MOD].dronAktywacja?.tryb === "A";
      }, { message: "latch [A]" });
      const a = await p1.eval(atakDrona);
      t.equal(a.plakietki.length, 0, "no badge after Steruj [A]");
    });

    await t.step("Reaguj [R] → a card with the drone's attack button, not a second activation", async () => {
      const r = await p1.eval(aktywnosc, { id: "neuroDronReaguj0" });
      t.equal(r.tryb, "R", "activation mode");
      t.equal(r.druga, false, "a reaction is not a second activation");
      t.equal(r.przyciski, 1, "one attack button (the dagger)");
      await t.screenshot("Gracz 1", "reakcja drona — karta z atakiem");
      await t.gm.eval(async () => { for (const c of [...game.combats]) await c.delete(); return true; });
    });

    await t.step("Critical hit → failure card → k20 13 → [Zastosuj]: TT −2 until repair (D10)", async () => {
      const r = await t.gm.eval(awaria, { k20: 13 });
      t.equal(r.pozycja, 13, "failure entry");
      t.equal(r.ttPo, r.ttPrzed - 2, "TT −2");
      t.assert(/Awaria: pancerz/.test(r.efekt), "effect named after the failure", r);
    });

    await t.step("World clock +30 min → the walking drone's battery is at 50% (U15)", async () => {
      const przed = await p1.eval(zasilanie);
      t.equal(przed.pracuje, true, "deployed drone draws power");
      await t.gm.eval(async () => { await game.time.advance(1800); return true; });
      const po = await t.waitFor(p1, (procent) => {
        const MOD = "neuroshima-2026-overrides";
        const u = game.user.character.items.find(i => i.flags?.[MOD]?.dron?.aktor);
        const s = game.neuroshima.drony.stanZasilania(fromUuidSync(u.flags[MOD].dron.aktor));
        return Math.round(s.procent) <= procent - 49 ? Math.round(s.procent) : null;
      }, { args: [przed.procent], message: "the battery to drop" });
      t.equal(po, przed.procent - 50, "30 min of a 1 h battery");
    });

    await t.step("0 PW → Wyłączony, not dead; the player sees it (§7.4)", async () => {
      await t.gm.eval(async () => {
        const MOD = "neuroshima-2026-overrides";
        const u = game.actors.getName("PC Gracz 1").items.find(i => i.flags?.[MOD]?.dron?.aktor);
        await fromUuidSync(u.flags[MOD].dron.aktor).update({ "system.attributes.hp.value": 0 });
        return true;
      });
      const s = await t.waitFor(p1, () => {
        const MOD = "neuroshima-2026-overrides";
        const u = game.user.character.items.find(i => i.flags?.[MOD]?.dron?.aktor);
        const d = fromUuidSync(u.flags[MOD].dron.aktor);
        return d.statuses.has("wylaczony") ? { martwy: d.statuses.has("dead") } : null;
      }, { message: "Wyłączony on the player's client" });
      t.equal(s.martwy, false, "a machine at 0 PW is switched off, not dead");
      const z = await p1.eval(zasilanie);
      t.equal(z.pracuje, false, "a switched-off drone draws no power");
      await t.screenshot("Gracz 1", "dron wyłączony");
    });

    await t.step("[Złóż] → the token is gone, the handle is folded again (25 kg)", async () => {
      await p1.eval(przycisk, { akcja: "zloz" });
      const s = await t.waitFor(p1, () => {
        const MOD = "neuroshima-2026-overrides";
        const u = game.user.character.items.find(i => i.flags?.[MOD]?.dron?.aktor);
        return u && !u.flags[MOD].dron.rozlozony ? { waga: u.system.weight.value } : null;
      }, { message: "the handle to fold" });
      t.equal(s.waga, 25, "folded handle weight");
      const st = await t.gm.eval(stan);
      t.equal(st.zetony.length, 0, "no drone token");
      t.equal(st.operator, null, "folding drops the operator");
    });

    // The fixture reseeds only its own flagged documents; the drone and its folder are this suite's.
    await t.gm.eval(async () => {
      for (const a of game.actors.filter(x => x.flags?.["neuroshima-2026-overrides"]?.towarzysz?.rodzaj?.startsWith("dron"))) await a.delete();
      const f = game.folders.find(x => x.type === "Actor" && x.name === "Drony" && !x.contents.length);
      if (f) await f.delete();
    });
  }
};
