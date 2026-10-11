/**
 * Suite — Handel (PLAN_m5_postoj.md E3–E4, §8 „handel”). GM, Gracz 1 and Gracz 2.
 *
 *  - The party stands in "Bazar" (Miasteczko, Vegas); Kobalt is on (buy-back 50%).
 *  - GM: [Nowy punkt handlowy] on the Postój tab → a weapon shop (Broń + Amunicja, seed "e2e-bazar"):
 *    15 slots, rusznikarz, the same stock the generator gives for that seed; a hand-added item.
 *  - Gracz 2: the Handel button on his sheet → the shop → the exchange table: names and quantities, no
 *    prices of the merchant's goods (D21), only the book sum of what he lays out (D3); lays out his grenade
 *    (real drop), takes an item from the list, agrees.
 *  - GM: the same table with valuation (buy-back 50% under Kobalt, Vegas weapons 150%), Wpływanie request,
 *    [Zatwierdź] — items moved without a clone (U8), visit note on the merchant.
 *  - Gracz 1: a special order for an item not on the list, forced k100 → a public card with the open
 *    numbers (s. 43) and a GM-only whisper; the same item twice today — refused (D2); the 3rd transaction at
 *    PB 2 opens the 2nd gambling hour → an RO request, failed → Wyczerpanie „Gambling” (s. 44).
 *  - Przeróbka (D31): tłumik by the shop's gunsmith on Gracz 1's pistol — mounted on approval.
 *  - [Losuj od nowa] (D30): the hand-added item disappears; the same seed gives the first stock back.
 *  - Player DOM: the wallet is hidden, the ammo panel still sits on its anchor (U43).
 */

/* Functions below run in the browser (serialised): no closures over this file. */

/** GM: party with both PCs, the place, a sellable grenade for Gracz 2. */
async function przygotuj() {
  const MOD = "neuroshima-2026-overrides";
  for (const c of [...game.combats]) await c.delete();
  for (const a of game.actors.filter(a => a.getFlag(MOD, "handlarz"))) await a.delete();
  if (game.messages.size) await ChatMessage.deleteDocuments(game.messages.map(m => m.id));
  const p1 = game.actors.getName("PC Gracz 1");
  const p2 = game.actors.getName("PC Gracz 2");
  // Level 3 — PB 2, so the transaction limit is the rulebook's two per hour.
  const klasy = await game.packs.get(`${MOD}.klasy`).getDocuments();
  for (const pc of [p1, p2]) {
    const cls = game.items.fromCompendium(klasy.find(i => i.type === "class" && i.system.identifier === "cwaniak"));
    cls.system.levels = 3;
    await pc.createEmbeddedDocuments("Item", [cls]);
  }
  const party = await Actor.implementation.create({ name: "Agent · Drużyna", type: "group", flags: { [MOD]: { fixture: "skirmish" } } });
  await party.update({ "system.members": [p1, p2].map(a => ({ actor: a.id })) });
  await game.settings.set("dnd5e", "primaryParty", { actor: party.id });
  await game.neuroshima.postoj.miejsce.set(party, { nazwa: "Bazar", rodzaj: "miasteczko", region: "vegas" });
  await game.settings.set(MOD, "kobaltEnabled", true);
  return {
    kobalt: game.settings.get(MOD, "kobaltEnabled"),
    cha: p1.system.abilities.cha.value, pb: p1.system.attributes.prof,
    granat: p2.items.find(i => i.getFlag(MOD, "grenade"))?.name ?? null,
    bron1: p1.items.find(i => i.type === "weapon")?.name ?? null
  };
}

/** GM: [Nowy punkt handlowy] through the party sheet's Postój tab and its dialog. */
async function nowyPunkt({ nazwa, kategorie, ziarno }) {
  const MOD = "neuroshima-2026-overrides";
  const party = game.actors.party;
  await party.sheet.render(true);
  await window.__e2e.until(() => party.sheet.element?.querySelector('[data-tab="postoj"]'), { message: "Postój tab" });
  party.sheet.changeTab("postoj", "primary");
  const btn = await window.__e2e.until(() => party.sheet.element.querySelector('[data-action="neuroPunktNowy"]'), { message: "[Nowy punkt handlowy]" });
  btn.click();
  const dlg = await window.__e2e.until(() => window.__e2e.findApps({ title: "Nowy punkt handlowy", action: "ok" })[0], { message: "the dialog" });
  const f = dlg.element.querySelector("form") ?? dlg.element;
  f.querySelector('[name="nazwa"]').value = nazwa;
  for (const k of kategorie) f.querySelector(`[name="kat.${k}"]`).checked = true;
  f.querySelector('[name="ziarno"]').value = ziarno;
  dlg.element.querySelector('[data-action="ok"]').click();
  const h = await window.__e2e.until(() => game.actors.find(a => a.name === nazwa && a.getFlag(MOD, "handlarz") && a.items.size), { timeoutMs: 20000, message: "the merchant with stock" });
  await window.__e2e.quiet({ idleMs: 600 });
  // The generator again, in the page, with the same seed and the same catalog.
  const R = await import(`/modules/${MOD}/scripts/config/handel-rules.mjs`);
  const L = await import(`/modules/${MOD}/scripts/config/losowanie.mjs`);
  const { KATALOG } = await import(`/modules/${MOD}/scripts/config/recipes-data.mjs`);
  const d = h.getFlag(MOD, "handlarz");
  const oczek = R.generujTowar({ katalog: KATALOG.values(), rodzaj: "miasteczko", kategorie: d.kategorie, miejsca: d.miejsca, podstawy: false, rng: L.rngZZiarna(ziarno), kobalt: true });
  const refy = [...new Set(h.items.map(i => i.getFlag(MOD, "towar")?.ref))].sort();
  return {
    uuid: h.uuid, fachowiec: d.fachowiec, miejsca: d.miejsca, refy,
    zgodny: JSON.stringify(refy) === JSON.stringify([...new Set(oczek.towar.map(t => t.ref))].sort()),
    pozycji: oczek.towar.length
  };
}

/** GM: a hand-added item on the merchant (RAW „wybrane”). */
async function dodajRecznie({ uuid }) {
  const h = await fromUuid(uuid);
  const [it] = await h.createEmbeddedDocuments("Item", [{ name: "Lina (15 m)", type: "loot", system: { price: { value: 10, denomination: "gb" }, weight: { value: 7 } } }]);
  return it.name;
}

/** Player: the Handel button on his own sheet → the shop → the exchange table. */
async function otworzHandel({ sklep }) {
  const pc = game.user.character;
  await pc.sheet.render(true);
  const btn = await window.__e2e.until(() => pc.sheet.element?.querySelector(".sheet-header-buttons .neuro-handel-btn"), { message: "the Handel button" });
  btn.click();
  const okno = await window.__e2e.until(() => window.__e2e.findApps({ title: "Handel —" })[0], { message: "the Handel window" });
  const punkty = [...okno.element.querySelectorAll(".neuro-handel-punkty li strong")].map(s => s.textContent.trim());
  const b = [...okno.element.querySelectorAll('.neuro-handel-punkty li')].find(li => li.textContent.includes(sklep))?.querySelector('[data-action="otworz"]');
  b?.click();
  const stol = await window.__e2e.until(() => window.__e2e.findApps({ title: "Stół wymiany" })[0], { message: "the exchange table" });
  await window.__e2e.sleep(400);
  const towar = [...stol.element.querySelectorAll(".neuro-wymiana-towar li")];
  return {
    punkty,
    towarPozycji: towar.length,
    cenyTowaru: stol.element.querySelectorAll(".neuro-wymiana-towar .cena").length,
    gbWTowarze: /gb/.test(stol.element.querySelector(".neuro-wymiana-towar")?.textContent ?? ""),
    panelMG: Boolean(stol.element.querySelector(".neuro-wymiana-mg")),
    waleta: getComputedStyle(pc.sheet.element.querySelector("section.currency") ?? document.body).display,
    amunicja: Boolean(pc.sheet.element.querySelector(".neuro-ammo-wrapper"))
  };
}

/** Player: drop own item into the table (real DragEvents), take one merchant item, agree. */
async function wylozIWez({ wyklada, bierze }) {
  const pc = game.user.character;
  const stol = window.__e2e.findApps({ title: "Stół wymiany" })[0];
  const item = pc.items.getName(wyklada);
  const dt = new DataTransfer();
  dt.setData("text/plain", JSON.stringify({ type: "Item", uuid: item.uuid }));
  const target = stol.element.querySelector(".neuro-wymiana-daje");
  for (const type of ["dragenter", "dragover", "drop"]) target.dispatchEvent(new DragEvent(type, { dataTransfer: dt, bubbles: true, cancelable: true }));
  await window.__e2e.until(() => pc.getFlag("neuroshima-2026-overrides", "wymiana")?.daje?.length === 1, { message: "the laid-out item" });
  await window.__e2e.until(() => stol.element.querySelector(".neuro-wymiana-towar [data-action='dodajTowar']"), { message: "the merchant list" });
  const li = [...stol.element.querySelectorAll(".neuro-wymiana-towar li")].find(l => l.textContent.includes(bierze));
  li.querySelector("[data-action='dodajTowar']").click();
  await window.__e2e.until(() => pc.getFlag("neuroshima-2026-overrides", "wymiana")?.dostaje?.length === 1, { message: "the taken item" });
  const podr = stol.element.querySelector(".neuro-wymiana-daje .suma strong")?.textContent.trim();
  await window.__e2e.until(() => stol.element.querySelector('[data-action="zgoda"]'), { message: "[Zgadzam się]" });
  stol.element.querySelector('[data-action="zgoda"]').click();
  await window.__e2e.until(() => pc.getFlag("neuroshima-2026-overrides", "wymiana")?.zgoda === true, { message: "agreement" });
  await window.__e2e.sleep(300);
  return { podr, cenyMG: stol.element.querySelectorAll(".cena.mg").length };
}

/** GM: the open exchange from the Postój tab; valuation, Wpływanie, approval. */
async function zatwierdz({ gracz, bierze, wyklada, wplywanie = false }) {
  const MOD = "neuroshima-2026-overrides";
  const pc = game.actors.getName(gracz);
  const party = game.actors.party;
  await party.sheet.render(true);
  party.sheet.changeTab("postoj", "primary");
  const b = await window.__e2e.until(() => [...party.sheet.element.querySelectorAll('[data-action="neuroWymianaOtworz"]')].find(x => x.textContent.includes(gracz)), { message: "the open exchange button" });
  b.click();
  const stol = await window.__e2e.until(() => window.__e2e.findApps({ title: `Stół wymiany — ${gracz}` })[0], { message: "the GM table" });
  await window.__e2e.until(() => stol.element.querySelector(".neuro-wymiana-mg"), { message: "the GM panel" });
  const skup = stol.element.querySelector('[data-warunek="skup"]')?.value;
  const daje = stol.element.querySelector(".neuro-wymiana-saldo span:nth-of-type(1) strong")?.textContent.trim();
  // Expected buy-back: book price × Vegas weapons 150% × 50% (Kobalt).
  const item = pc.items.getName(wyklada);
  const W = await import(`/modules/${MOD}/scripts/postoj/wymiana.mjs`);
  const wpis = await W.wpisPrzedmiotu(item);
  const oczek = Math.round(wpis.cena * 1.5 * 0.5 * 100) / 100;
  let prosba = null;
  if (wplywanie) {
    const n0 = game.messages.size;
    stol.element.querySelector('[data-action="wplywanie"]').click();
    const m = await window.__e2e.until(() => game.messages.contents.slice(n0).find(x => x.type === "request"), { message: "the Wpływanie request" });
    prosba = { handler: m.system.handler, skill: m.system.data.skill, target: m.system.data.target };
  }
  const h = fromUuidSync(pc.getFlag(MOD, "wymiana").handlarz);
  const przed = { u: pc.items.filter(i => i.name === bierze).length, h: h.items.filter(i => i.name === bierze).reduce((a, i) => a + (i.system.quantity ?? 1), 0) };
  const n0 = game.messages.size;
  stol.element.querySelector('[data-action="zatwierdz"]').click();
  await window.__e2e.until(() => !pc.getFlag(MOD, "wymiana"), { timeoutMs: 15000, message: "the exchange to close" });
  await window.__e2e.quiet({ idleMs: 600 });
  const nowe = game.messages.contents.slice(n0);
  return {
    skup, daje, oczek: `${String(oczek).replace(".", ",")} gb`, prosba,
    przed, po: { u: pc.items.filter(i => i.name === bierze).length, h: h.items.filter(i => i.name === bierze).reduce((a, i) => a + (i.system.quantity ?? 1), 0) },
    oddanyU: pc.items.filter(i => i.name === wyklada).reduce((a, i) => a + (i.system.quantity ?? 1), 0),
    oddanyH: h.items.filter(i => i.name === wyklada).reduce((a, i) => a + (i.system.quantity ?? 1), 0),
    wizyta: h.getFlag(MOD, "handlarz").wizyta !== null,
    karty: nowe.map(m => ({ szept: m.whisper.length > 0, tekst: m.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 140) }))
  };
}

/** Player: Handel → „Szukam czegoś konkretnego” → [Szukaj] with forced k100 (and a d20 for a following RO). */
async function szukaj({ fraza, k100, oczekujeKarty = true }) {
  const pc = game.user.character;
  let okno = window.__e2e.findApps({ title: "Handel —" })[0];
  if (!okno) {
    await pc.sheet.render(true);
    (await window.__e2e.until(() => pc.sheet.element?.querySelector(".neuro-handel-btn"), { message: "Handel" })).click();
    okno = await window.__e2e.until(() => window.__e2e.findApps({ title: "Handel —" })[0], { message: "the Handel window" });
  }
  const input = okno.element.querySelector("input[name=query]");
  input.value = fraza;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  // Results re-render asynchronously — wait for a row of THIS phrase, never click a stale one.
  const wiersz = () => [...okno.element.querySelectorAll(".neuro-handel-wyniki li")]
    .find(li => li.querySelector(".nazwa")?.textContent.trim().toLowerCase().startsWith(fraza.toLowerCase()));
  const li = await window.__e2e.until(wiersz, { message: `results for ${fraza}` }).catch(() => null);
  const btn = li?.querySelector("[data-action='szukaj']") ?? null;
  const juz = Boolean(li?.classList.contains("is-juz"));
  if (!btn) return { juz, karta: null };
  const n0 = game.messages.size;
  window.__e2e.originalUniform ??= CONFIG.Dice.randomUniform;
  const q = [k100];
  CONFIG.Dice.randomUniform = () => (q.length ? window.__e2e.u(q.shift(), 100) : window.__e2e.originalUniform());
  btn.click();
  const m = oczekujeKarty ? await window.__e2e.until(() => game.messages.contents.slice(n0).find(x => x.content.includes("Zamówienie")), { message: "the order card" }) : null;
  await window.__e2e.quiet({ idleMs: 500 });
  window.__e2e.restoreDice();
  // U42: whispers reach every client's collection (UX boundary, not security) — what counts is what the
  // player's chat log shows. Let the GM's whisper arrive first, then read the log.
  await window.__e2e.sleep(1200);
  const widoczne = game.messages.contents.slice(n0).filter(x => x.visible).map(x => x.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  const wLogu = (ui.chat.element ?? document).textContent ?? "";
  return {
    juz, karta: m ? m.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() : null, widoczne, tylkoMGwLogu: /tylko MG/.test(wLogu),
    targ: pc.getFlag("neuroshima-2026-overrides", "targ"),
    prosba: game.messages.contents.slice(n0).find(x => x.type === "request")?.id ?? null
  };
}

/** Player: same item again today — refused, no new card. */
async function szukajDrugiRaz({ fraza }) {
  const okno = window.__e2e.findApps({ title: "Handel —" })[0];
  const input = okno.element.querySelector("input[name=query]");
  input.value = fraza;
  input.dispatchEvent(new Event("input", { bubbles: true }));
  const li = await window.__e2e.until(() => [...okno.element.querySelectorAll(".neuro-handel-wyniki li")]
    .find(x => x.querySelector(".nazwa")?.textContent.trim().toLowerCase().startsWith(fraza.toLowerCase())), { message: "results" });
  return { juz: li.classList.contains("is-juz"), przycisk: Boolean(li.querySelector("[data-action='szukaj']")) };
}

/** Player: the RO request card — click, pick CHA, forced fail. */
async function roGamblingu({ messageId }) {
  const pc = game.user.character;
  window.__e2e.forceD20([1]);
  const ok = await window.__e2e.clickChat(messageId, '[data-action="handleRequest"]');
  await window.__e2e.clickDialog({ title: "Gambling" }, "cha");
  await window.__e2e.until(() => (pc.getFlag("neuroshima-2026-overrides", "exhaustionSources") ?? []).some(s => s.source === "gambling"), { timeoutMs: 8000, message: "Gambling exhaustion" }).catch(() => null);
  window.__e2e.restoreDice();
  return { klik: ok, zrodla: (pc.getFlag("neuroshima-2026-overrides", "exhaustionSources") ?? []).map(s => s.source), poziom: pc.system.attributes.exhaustion };
}

/** GM: a gunsmith's conversion (tłumik) on Gracz 1's pistol through the table's controls; approve. */
async function przerobka({ gracz, handlarz, addon }) {
  const MOD = "neuroshima-2026-overrides";
  const pc = game.actors.getName(gracz);
  const h = await fromUuid(handlarz);
  const W = await import(`/modules/${MOD}/scripts/postoj/wymiana.mjs`);
  const S = await import(`/modules/${MOD}/scripts/postoj/stol-wymiany.mjs`);
  await W.otworzWymiane(pc, h);
  await S.otworzStolWymiany(pc);
  const stol = await window.__e2e.until(() => window.__e2e.findApps({ title: `Stół wymiany — ${gracz}` })[0], { message: "the table" });
  await window.__e2e.until(() => stol.element.querySelector('select[name="przerobka"]'), { message: "conversion controls" });
  const bron = pc.items.find(i => i.type === "weapon");
  stol.element.querySelector('select[name="przerobka"]').value = addon;
  stol.element.querySelector('select[name="bron"]').value = bron.uuid;
  stol.element.querySelector('[data-action="przerobka"]').click();
  await window.__e2e.until(() => pc.getFlag(MOD, "wymiana")?.dostaje?.some(d => d.typ === "przerobka"), { message: "the conversion line" });
  const cena = (await window.__e2e.until(() => stol.element.querySelector(".neuro-wymiana-dostaje .cena.mg"), { message: "the conversion price" }))?.textContent.trim();
  await W.zatwierdzWymiane(pc);
  await window.__e2e.quiet({ idleMs: 600 });
  for (const a of foundry.applications.instances.values()) if (a.rendered && a.title?.startsWith?.("Zmiana kalibru")) await a.close();
  return { cena, addony: (bron.getFlag(MOD, "addons") ?? []).map(a => a.id) };
}

/** GM: [Losuj od nowa] from the tab, confirm; the hand-added item is gone, the seed's stock is back. */
async function losujOdNowa({ uuid, refyPrzed }) {
  const MOD = "neuroshima-2026-overrides";
  const party = game.actors.party;
  await party.sheet.render(true);
  party.sheet.changeTab("postoj", "primary");
  const b = await window.__e2e.until(() => party.sheet.element.querySelector(`[data-action="neuroPunktLosuj"][data-uuid="${uuid}"]`), { message: "[Losuj od nowa]" });
  b.click();
  const dlg = await window.__e2e.until(() => window.__e2e.findApps({ title: "Losuj od nowa", action: "ok" })[0], { message: "the confirmation" });
  const lista = dlg.element.querySelector(".neuro-punkt-znika")?.textContent ?? "";
  dlg.element.querySelector('[data-action="ok"]').click();
  const h = await fromUuid(uuid);
  await window.__e2e.until(() => !h.items.getName("Lina (15 m)"), { timeoutMs: 15000, message: "the old stock gone" });
  await window.__e2e.quiet({ idleMs: 800 });
  const refy = [...new Set(h.items.map(i => i.getFlag(MOD, "towar")?.ref))].sort();
  return { wymienialLine: lista.includes("Lina"), lina: Boolean(h.items.getName("Lina (15 m)")), ten_sam: JSON.stringify(refy) === JSON.stringify(refyPrzed) };
}

export default {
  name: "handel",
  clients: ["gm", "Gracz 1", "Gracz 2"],

  async run(t) {
    const p1 = t.client("Gracz 1");
    const p2 = t.client("Gracz 2");
    for (const p of [p1, p2]) await t.waitFor(p, () => Boolean(game.user.character && ui.chat?.element), { message: "the player's client to see the fixture" });

    let setup;
    await t.step("GM: party in Bazar (Miasteczko, Vegas), Kobalt on", async () => {
      setup = await t.gm.eval(przygotuj);
      t.equal(setup.kobalt, true, "Kobalt");
      t.equal(setup.cha, 12, "PC Gracz 1 CHA");
      t.equal(setup.pb, 2, "PB");
      t.assert(Boolean(setup.granat), "Gracz 2 has a grenade to sell", setup);
    });

    let sklep;
    await t.step("GM [Nowy punkt handlowy] → weapon shop: 15 slots, gunsmith, the seed's stock; a hand-added item", async () => {
      sklep = await t.gm.eval(nowyPunkt, { nazwa: "Sklep z bronią", kategorie: ["bron", "amunicja"], ziarno: "e2e-bazar" });
      t.equal(sklep.fachowiec, "rusznikarz", "fachowiec in a town for a Broń shop (D33)");
      t.equal(sklep.miejsca, 15, "slots for Miasteczko (D29)");
      t.equal(sklep.zgodny, true, "same seed — same stock (D29)");
      t.equal(await t.gm.eval(dodajRecznie, { uuid: sklep.uuid }), "Lina (15 m)", "hand-added");
    });

    let bierze;
    await t.step("Gracz 2: Handel → the shop's table — names and quantities, no prices; wallet hidden, ammo panel on its anchor", async () => {
      await t.waitFor(p2, () => Boolean(game.actors.getName("Sklep z bronią")?.items.size), { message: "the shop on the player's client" });
      const r = await p2.eval(otworzHandel, { sklep: "Sklep z bronią" });
      t.assert(r.punkty.includes("Sklep z bronią"), "shop listed", r);
      t.assert(r.towarPozycji >= 10, "the stock is listed", r);
      t.equal(r.cenyTowaru, 0, "no price elements in the merchant list (D21)");
      t.equal(r.gbWTowarze, false, "no 'gb' anywhere in the merchant list");
      t.equal(r.panelMG, false, "no GM panel for the player (U42)");
      t.equal(r.waleta, "none", "wallet hidden (U43)");
      t.equal(r.amunicja, true, "ammo panel still anchored");
      bierze = await t.gm.eval(({ uuid }) => {
        const h = fromUuidSync(uuid);
        return h.items.find(i => i.type === "weapon")?.name ?? h.items.contents[0].name;
      }, { uuid: sklep.uuid });
      const w = await p2.eval(wylozIWez, { wyklada: setup.granat, bierze });
      t.assert(/gb/.test(w.podr ?? ""), "the player sees the book sum of what he lays out (D3)", w);
      t.equal(w.cenyMG, 0, "no GM prices on the player's table");
      await t.screenshot("Gracz 2", "stół wymiany — gracz");
    });

    await t.step("GM: valuation (buy-back 50% under Kobalt × Vegas 150%), Wpływanie request, [Zatwierdź] — moved without a clone", async () => {
      const r = await t.gm.eval(zatwierdz, { gracz: "PC Gracz 2", bierze, wyklada: setup.granat, wplywanie: true });
      t.equal(r.skup, "50", "buy-back 50% (D3, WKK)");
      t.equal(r.daje, r.oczek, "grenade at book × 1.5 × 0.5");
      t.equal(r.prosba?.handler, "skill", "Wpływanie is a dnd5e skill request");
      t.equal(r.prosba?.target, 15, "ST 15 (s. 44)");
      t.equal(r.przed.u + r.przed.h, r.po.u + r.po.h, "the bought item exists exactly as many times as before (U8)");
      t.equal(r.po.u, r.przed.u + 1, "Gracz 2 got it");
      t.equal(r.oddanyH >= 1, true, "the merchant got the grenade");
      t.equal(r.wizyta, true, "visit note (D30)");
      t.assert(r.karty.some(k => !k.szept && k.tekst.startsWith("Wymiana")), "public card", r.karty);
      t.assert(r.karty.some(k => k.szept && /saldo/.test(k.tekst)), "GM card with values", r.karty);
    });

    let prosbaId = null;
    await t.step("Gracz 1: special order with open numbers; GM-only whisper; the same item twice — refused (D2)", async () => {
      const r = await p1.eval(szukaj, { fraza: "Termowizor", k100: 10 });
      t.assert(/k100 10 − CHA 12 = -2 ≤ 5/.test(r.karta ?? ""), "open numbers on the card (s. 43, U44)", r);
      t.assert(!r.widoczne.some(x => /tylko MG/.test(x)), "the GM whisper is not visible to the player (U42)", r.widoczne);
      t.equal(r.tylkoMGwLogu, false, "nor rendered in his chat log");
      t.equal(r.targ.transakcje, 1, "one transaction");
      const again = await p1.eval(szukajDrugiRaz, { fraza: "Termowizor" });
      t.equal(again.juz, true, "marked as searched today");
      t.equal(again.przycisk, false, "no [Szukaj] for it today");
      const r2 = await p1.eval(szukaj, { fraza: "Laptop wojskowy", k100: 95 });
      t.equal(r2.targ.transakcje, 2, "two transactions — still the 1st hour at PB 2");
      t.equal(r2.prosba, null, "no RO yet");
      const r3 = await p1.eval(szukaj, { fraza: "Radio", k100: 50 });
      t.equal(r3.targ.transakcje, 3, "third transaction");
      t.assert(Boolean(r3.prosba), "2nd gambling hour → RO request (s. 44)", r3);
      prosbaId = r3.prosba;
    });

    await t.step("Gracz 1: the RO request — CHA, a natural 1 → Wyczerpanie „Gambling”", async () => {
      const r = await p1.eval(roGamblingu, { messageId: prosbaId });
      t.equal(r.klik, true, "request button clicked");
      t.assert(r.zrodla.includes("gambling"), "exhaustion source Gambling (U55)", r);
    });

    await t.step("GM: tłumik by the shop's gunsmith on Gracz 1's pistol — mounted on approval (D31)", async () => {
      const r = await t.gm.eval(przerobka, { gracz: "PC Gracz 1", handlarz: sklep.uuid, addon: "tlumik" });
      t.assert(/gb/.test(r.cena ?? ""), "priced as a service", r);
      t.assert(r.addony.includes("tlumik"), "tłumik mounted", r);
    });

    await t.step("GM [Losuj od nowa]: the confirmation lists the hand-added item; it is gone; the same seed gives the first stock", async () => {
      const r = await t.gm.eval(losujOdNowa, { uuid: sklep.uuid, refyPrzed: sklep.refy });
      t.equal(r.wymienialLine, true, "confirmation lists what disappears (D30)");
      t.equal(r.lina, false, "hand-added item gone");
      t.equal(r.ten_sam, true, "same seed — same stock");
      await t.screenshot("gm", "zakładka Postój — punkt handlowy");
    });
  }
};
