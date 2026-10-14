/**
 * Suite — Szabrowanie (PLAN_m5_postoj.md E8, §7.16, §8 „szabrowanie”). GM, Gracz 1, Gracz 2.
 *
 *  - The party (two PCs and a GM-run third searcher) stands at "Magazyn przy torach". Gracz 1 carries a metal
 *    detector (advantage on Percepcja, U11).
 *  - GM [Szabrowanie] on the Postój tab: Niewielki magazyn, complication forced to 2 (animals) → a GM-only whisper
 *    with a Bestiariusz link and no rolls; players do not see it. [Kontynuuj] → one request card for three searchers,
 *    resource types split in turn (D12), time 120 ÷ 3 = 40 min.
 *  - Gracz 1 rolls Percepcja with advantage on two forced 20s → doubled resources, a random item, a Fant.
 *    Gracz 2 fails → a card with [Spróbuj: …]; the GM sends the third searcher after Gracz 2's chemicals.
 *  - All done → the GM card advances the clock by 40 min; reopening the window warns about repeats (U10).
 */

/* Functions below run in the browser (serialised): no closures over this file. */

async function przygotuj() {
  const MOD = "neuroshima-2026-overrides";
  for (const c of [...game.combats]) await c.delete();
  if (game.messages.size) await ChatMessage.deleteDocuments(game.messages.map(m => m.id));
  const p1 = game.actors.getName("PC Gracz 1");
  const p2 = game.actors.getName("PC Gracz 2");
  // The GM's client does not take forced dice here, so the GM-run searcher simply cannot fail: Mądrość 30 (+10).
  const trzeci = await Actor.implementation.create({ name: "Agent · Trzeci", type: "character", system: { abilities: { wis: { value: 30 } } }, flags: { [MOD]: { fixture: "skirmish" } } });
  const party = await Actor.implementation.create({ name: "Agent · Drużyna", type: "group", flags: { [MOD]: { fixture: "skirmish" } } });
  await party.update({ "system.members": [p1, p2, trzeci].map(a => ({ actor: a.id })) });
  await game.settings.set("dnd5e", "primaryParty", { actor: party.id });
  await game.neuroshima.postoj.miejsce.set(party, { nazwa: "Tory", rodzaj: "miasteczko", region: "vegas" });
  await p1.createEmbeddedDocuments("Item", [{ name: "Wykrywacz metalu", type: "loot" }]);
  const S = game.neuroshima.produkcja.surowce;
  return {
    trzeci: trzeci.uuid, p1: p1.uuid, p2: p2.uuid,
    p1CZ: S.gbOf(p1, "CZ"), p1MK: S.gbOf(p1, "MK"),
    p1Fanty: p1.items.filter(i => i.getFlag(MOD, "fant")).length, p1Items: p1.items.size
  };
}

/** GM: [Szabrowanie] on the Postój tab → magazyn, complication 2, name → [Szabruj]; the whisper and [Kontynuuj]. */
async function start() {
  const party = game.actors.party;
  await party.sheet.render(true);
  await window.__e2e.until(() => party.sheet.element?.querySelector('[data-tab="postoj"]'), { message: "Postój tab" });
  party.sheet.changeTab("postoj", "primary");
  (await window.__e2e.until(() => party.sheet.element.querySelector('[data-action="neuroPostojSzabrowanie"]'), { message: "[Szabrowanie]" })).click();
  const okno = await window.__e2e.until(() => window.__e2e.findApps({ title: "Szabrowanie" })[0], { message: "the window" });
  const zmien = async (sel, v) => {
    const el = await window.__e2e.until(() => okno.element.querySelector(sel), { message: sel });
    el.value = v;
    el.dispatchEvent(new Event("change", { bubbles: true }));
    await window.__e2e.sleep(250);
  };
  await zmien('select[name="ruina"]', "magazyn");
  await zmien('input[name="nazwa"]', "Magazyn przy torach");
  await zmien('select[name="komplikacja"]', "2");
  const minuty = Number(okno.element.querySelector('input[name="minuty"]').value);
  const osoby = okno.element.querySelectorAll('.neuro-szabrowanie-osoba input[data-rodzaj]:checked').length;
  const n0 = game.messages.size;
  okno.element.querySelector('[data-action="szabruj"]').click();
  const szept = await window.__e2e.until(() => game.messages.contents.slice(n0).find(m => /Komplikacja/.test(m.content)), { message: "the complication whisper" });
  await window.__e2e.sleep(500);
  const li = (ui.chat.element ?? document).querySelector(`[data-message-id="${szept.id}"]`);
  const link = li?.querySelector('a.content-link[data-uuid*="bestiariusz"]');
  const zanim = game.messages.contents.slice(n0).some(m => m.type === "request");
  await window.__e2e.clickChat(szept.id, '[data-neuro-postoj="szabrowanieKontynuuj"]');
  const prosba = await window.__e2e.until(() => game.messages.contents.slice(n0).find(m => m.type === "request" && m.system?.handler === "neuroSzabrowanie"), { message: "the request card" });
  return {
    minuty, osoby, szept: szept.id, szeptGM: szept.whisper.length > 0, szeptRzuty: szept.rolls.length,
    link: link ? { uuid: link.dataset.uuid, tekst: link.textContent.trim() } : null,
    zanim, prosba: prosba.id, cele: prosba.system.targets.length
  };
}

/** Any player: can they see the GM whisper? */
function widzi({ id }) {
  const m = game.messages.get(id);
  return { jest: !!m, widoczna: !!m?.visible, wLogu: !!(ui.chat.element ?? document).querySelector(`[data-message-id="${id}"]`) };
}

/** A searcher clicks [Szukaj] on the request card, picks the skill and the roll mode with forced d20s. */
async function szukaj({ prosba, skill, tryb, d20, wiersz = null }) {
  const n0 = game.messages.size;
  // Roll configuration can evaluate previews before the actual skill roll. Keep its final face
  // deterministic too, and restore the generator only once the roll message exists.
  window.__e2e.forceD20(d20, { fallback: d20.at(-1) });
  try {
    const sel = wiersz ? `li[data-uuid="${wiersz}"] [data-action="handleRequest"]` : '[data-action="handleRequest"]';
    const ok = await window.__e2e.clickChat(prosba, sel, { timeoutMs: 10000 });
    const dlg = await window.__e2e.clickDialog({ title: "Szabrowanie — czego szukasz?" }, skill);
    const rzut = await window.__e2e.pressRollDialog(tryb);
    await window.__e2e.until(() => game.messages.contents.slice(n0).find(m => m.rolls.length
      && m.flags?.dnd5e?.requestResult?.requestId === prosba), { message: "the completed scavenging skill roll" });
    await window.__e2e.quiet({ idleMs: 600 });
    return { ok, dlg: !!dlg, rzut };
  } finally { window.__e2e.restoreDice(); }
}

/** GM: wait for the result card of `nazwa`; read loot and buttons. */
async function wynik({ nazwa, n0 = 0 }) {
  const m = await window.__e2e.until(() => game.messages.contents.slice(n0).find(x => x.content.includes("Szabrowanie: Magazyn przy torach") && x.speaker?.alias === nazwa && /wynik/.test(x.content)), { timeoutMs: 15000, message: `the result card of ${nazwa}` });
  const tekst = m.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return { id: m.id, tekst: tekst.slice(0, 400), rzuty: m.rolls.length, sprobuj: [...m.content.matchAll(/szabrowanieZaKogos[^>]*>(?:<i[^>]*><\/i>)?\s*([^<]+)</g)].map(x => x[1].trim()), n: game.messages.size };
}

/** GM: after Gracz 1's success — loot on the actor. */
function lupy({ p1, przed }) {
  const MOD = "neuroshima-2026-overrides";
  const a = fromUuidSync(p1);
  const S = game.neuroshima.produkcja.surowce;
  const mg = game.messages.contents.filter(m => m.whisper.length && m.content.includes(`Szabrowanie: ${a.name}`) && /tylko MG/.test(m.content));
  return {
    CZ: S.gbOf(a, "CZ") - przed.p1CZ, MK: S.gbOf(a, "MK") - przed.p1MK,
    fanty: a.items.filter(i => i.getFlag(MOD, "fant")).length - przed.p1Fanty,
    noweItemy: a.items.size - przed.p1Items, kartyMG: mg.length
  };
}

/** GM: [Spróbuj: Agent · Trzeci] on Gracz 2's failure card → a new request for the third searcher. */
async function sprobuj({ karta, aktor }) {
  const n0 = game.messages.size;
  const ok = await window.__e2e.clickChat(karta, `[data-neuro-postoj="szabrowanieZaKogos"][data-aktor="${aktor}"]`);
  const m = await window.__e2e.until(() => game.messages.contents.slice(n0).find(x => x.type === "request"), { message: "the second request" });
  return { ok, prosba: m.id, cele: m.system.targets.map(t => t.actor), tekst: m.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ") };
}

/** GM: the closing card advances the clock; reopening the window warns about repeats. */
async function koniec({ czas0 }) {
  const m = await window.__e2e.until(() => game.messages.contents.find(x => /Szabrowanie zakończone/.test(x.content)), { timeoutMs: 15000, message: "the closing GM card" });
  await window.__e2e.clickChat(m.id, '[data-neuro-postoj="szabrowanieCzas"]');
  await window.__e2e.until(() => game.time.worldTime - czas0 >= 40 * 60, { message: "the clock" });
  const party = game.actors.party;
  party.sheet.element.querySelector('[data-action="neuroPostojSzabrowanie"]').click();
  const okno = await window.__e2e.until(() => window.__e2e.findApps({ title: "Szabrowanie" })[0], { message: "the window again" });
  const nazwa = await window.__e2e.until(() => okno.element.querySelector('input[name="nazwa"]'), { message: "name" });
  nazwa.value = "magazyn przy torach";
  nazwa.dispatchEvent(new Event("change", { bubbles: true }));
  const ostrzezenia = await window.__e2e.until(() => {
    const t = [...okno.element.querySelectorAll("p.neuro-zle")].map(p => p.textContent.trim());
    return t.length ? t : null;
  }, { message: "repeat warnings" });
  const pamiec = party.getFlag("neuroshima-2026-overrides", "postoj")?.ruiny ?? [];
  await okno.close();
  return { dt: game.time.worldTime - czas0, szept: m.whisper.length > 0, ostrzezenia, proby: pamiec.at(-1)?.proby?.length ?? 0 };
}

export default {
  name: "szabrowanie",
  clients: ["gm", "Gracz 1", "Gracz 2"],

  async run(t) {
    const p1 = t.client("Gracz 1");
    const p2 = t.client("Gracz 2");
    for (const p of [p1, p2]) await t.waitFor(p, () => Boolean(game.user.character && ui.chat?.element), { message: "the player's client" });

    let przed;
    await t.step("GM: a party of three at Tory; Gracz 1 carries a metal detector", async () => {
      przed = await t.gm.eval(przygotuj);
      t.assert(Boolean(przed.trzeci), "third searcher", przed);
    });

    let s;
    const czas0 = await t.gm.eval(() => game.time.worldTime);
    await t.step("GM [Szabrowanie]: complication 2 → GM-only whisper with a Bestiariusz link; [Kontynuuj] → one request for three", async () => {
      s = await t.gm.eval(start);
      t.equal(s.minuty, 40, "120 min ÷ 3 (D12)");
      t.equal(s.osoby, 4, "four resource types split between three");
      t.equal(s.szeptGM, true, "whisper to the GM");
      t.equal(s.szeptRzuty, 0, "no rolls in the GM whisper");
      t.assert(Boolean(s.link?.uuid), "a rendered Bestiariusz link", s);
      t.equal(s.zanim, false, "no request before [Kontynuuj]");
      t.equal(s.cele, 3, "three searchers on the request");
      for (const p of [p1, p2]) {
        await t.waitFor(p, (id) => Boolean(game.messages.get(id)), { args: [s.prosba], message: "the request on the player" });
        const w = await p.eval(widzi, { id: s.szept });
        t.equal(w.widoczna || w.wLogu, false, "players do not see the complication");
      }
      await t.screenshot("gm", "komplikacja i prosba");
    });

    await t.step("Gracz 1: Percepcja with advantage, two forced 20s → doubled resources, a random item, a Fant", async () => {
      const r = await p1.eval(szukaj, { prosba: s.prosba, skill: "prc", tryb: "advantage", d20: [20, 20] });
      t.equal(r.ok && r.dlg && r.rzut, true, "button, skill choice, roll dialog", r);
      const w = await t.gm.eval(wynik, { nazwa: "PC Gracz 1" });
      t.assert(/podwójnie/.test(w.tekst) && /naturalna 20/.test(w.tekst), "doubled, natural 20", w.tekst);
      t.equal(w.rzuty, 2, "resource dice on the card (CZ, MK)");
      const l = await t.gm.eval(lupy, { p1: przed.p1, przed });
      t.assert(l.CZ >= 8 && l.MK >= 8, "doubled CZ (4d10) and MK (4d20)", l);
      t.equal(l.fanty, 1, "a Fant for the natural 20");
      t.assert(l.noweItemy - l.fanty >= 1 || l.kartyMG >= 1, "a random item (or a GM card for a creature/vehicle)", l);
      await t.screenshot("Gracz 1", "szabrowanie sukces");
    });

    let porazka;
    await t.step("Gracz 2 fails (Śledztwo, forced 2) → [Spróbuj: …] for the others", async () => {
      await p2.eval(szukaj, { prosba: s.prosba, skill: "sle", tryb: "normal", d20: [2] });
      porazka = await t.gm.eval(wynik, { nazwa: "PC Gracz 2" });
      t.assert(/nic/.test(porazka.tekst), "nothing found", porazka.tekst);
      t.assert(porazka.sprobuj.some(x => /Trzeci/.test(x)), "[Spróbuj: Agent · Trzeci]", porazka.sprobuj);
    });

    await t.step("GM rolls for the third searcher, then sends him after Gracz 2's chemicals", async () => {
      await t.gm.eval(szukaj, { prosba: s.prosba, skill: "prc", tryb: "normal", d20: [18], wiersz: przed.trzeci });
      const w = await t.gm.eval(wynik, { nazwa: "Agent · Trzeci" });
      t.assert(/sukces|podwójnie/.test(w.tekst), "third searcher: success", w.tekst);
      const d = await t.gm.eval(sprobuj, { karta: porazka.id, aktor: przed.trzeci.split(".").pop() });
      t.equal(d.cele.join(), przed.trzeci, "a request for the third searcher only");
      t.assert(/chemikalia/.test(d.tekst), "for the chemicals", d.tekst);
      const n0 = await t.gm.eval(() => game.messages.size);
      await t.gm.eval(szukaj, { prosba: d.prosba, skill: "prc", tryb: "normal", d20: [18] });
      const w2 = await t.gm.eval(wynik, { nazwa: "Agent · Trzeci", n0 });
      t.assert(/chemikalia/.test(w2.tekst), "chemicals found", w2.tekst);
    });

    await t.step("GM closing card: [Przesuń czas o 40 min]; the window warns about repeats (U10)", async () => {
      const k = await t.gm.eval(koniec, { czas0 });
      t.equal(k.szept, true, "closing card for the GM");
      t.equal(k.dt, 40 * 60, "clock +40 min");
      t.assert(k.ostrzezenia.some(x => /PC Gracz 2: chemikalia/.test(x)), "Gracz 2 already searched for chemicals here", k.ostrzezenia);
      t.equal(k.proby, 5, "memory: CZ, MK, CH, CE, CH");
    });
  }
};
