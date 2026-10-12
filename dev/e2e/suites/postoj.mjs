/**
 * Suite — Postój: doba (PLAN_m5_postoj.md E2, E5–E6, §8 „postoj”). GM, Gracz 1 and Gracz 2.
 *
 *  - The party stands in "Bazar" (Miasteczko, Vegas). PC Gracz 1 has a chronic disease (osteoporoza) and a
 *    Gotowanie Fuks (24 h); PC Gracz 2 is malnourished (marker + Niedożywienie level).
 *  - E2: Gracz 1 uses a shared Fant (Gra planszowa) with Gracz 2 — both get a permanent Fuks.
 *  - GM [Otwórz dobę] on the Postój tab → a chat card [Ułóż dobę].
 *  - Gracz 1 from the card: Normalny upkeep, 8 h sleep, reports. Gracz 2 from the sheet header: Bogaty, reports.
 *  - GM sees both reported and approves: food before rest (Gracz 2's Niedożywienie marker goes, so the long rest
 *    removes its level), upkeep dose at Zachód słońca for the chronic disease, clock +24 h exactly once, summary
 *    cards (Bogaty with its frame), drafts cleared, history kept; the Gotowanie Fuks expired with a chat line.
 *  - E6, day two: Gracz 1 plans Rozrywka (50 gb) and rolls a Hazard game in the day window (the result lands in
 *    the draft and the bill); Gracz 2 sleeps 5 h and works a Technika shift. Approval: Gracz 1 gets the Rozrywka
 *    Fuks, Gracz 2 only a short rest and a Kobalt sleep save (ST 10) as a request card; the surplus carries over.
 *    Gracz 2 fails the save from his own client -> a Bezsenność level that an ordinary long rest will not lift.
 *  - E7, a 30-day skip through the GM window: Gracz 1 works 10 h a day on a real Robota (final test accepted),
 *    Gracz 2 trains Atletyka from 100 h. One write, clock +30 days once, Training done ("Wyszkolenie" feat), the
 *    Robota finished, Bezsenność slept off (WKK), the 7-day Rozrywka Fuks expired, cards per PC and one for the GM.
 */

/* Functions below run in the browser (serialised): no closures over this file. */

async function przygotuj() {
  const MOD = "neuroshima-2026-overrides";
  for (const c of [...game.combats]) await c.delete();
  if (game.messages.size) await ChatMessage.deleteDocuments(game.messages.map(m => m.id));
  const p1 = game.actors.getName("PC Gracz 1");
  const p2 = game.actors.getName("PC Gracz 2");
  const klasy = await game.packs.get(`${MOD}.klasy`).getDocuments();
  for (const pc of [p1, p2]) {
    const cls = game.items.fromCompendium(klasy.find(i => i.type === "class" && i.system.identifier === "cwaniak"));
    cls.system.levels = 3;
    await pc.createEmbeddedDocuments("Item", [cls]);
    await pc.update({ "system.attributes.hp.value": pc.system.attributes.hp.max });
  }
  const party = await Actor.implementation.create({ name: "Agent · Drużyna", type: "group", flags: { [MOD]: { fixture: "skirmish" } } });
  await party.update({ "system.members": [p1, p2].map(a => ({ actor: a.id })) });
  await game.settings.set("dnd5e", "primaryParty", { actor: party.id });
  await game.neuroshima.postoj.miejsce.set(party, { nazwa: "Bazar", rodzaj: "miasteczko", region: "vegas" });
  await game.settings.set(MOD, "kobaltEnabled", true);
  // Chronic disease (needs a daily dose at Zachód słońca), a 24 h Fuks, a malnourished PC.
  await game.neuroshima.health.addDisease(p1, "osteoporoza");
  await game.neuroshima.fuksy.przyznaj(p1, "gotowanie", { karta: false });
  const { addExhaustion } = await import(`/modules/${MOD}/scripts/config/exhaustion.mjs`);
  await addExhaustion(p2, "niedozywienie", { chat: false });
  await p2.toggleStatusEffect("malnutrition", { active: true });
  // A shared Fant for Gracz 1.
  await game.neuroshima.fanty.daj(p1, "gra-planszowa");
  return {
    gotowanie: game.neuroshima.fuksy.lista(p1).map(f => f.zrodlo),
    choroby: game.neuroshima.health.getChoroby(p1).map(c => c.key),
    p2wycz: p2.system.attributes.exhaustion,
    fant: Boolean(p1.items.getName("Gra planszowa"))
  };
}

/** Player 1: use the shared Fant through its real activity; pick both PCs in the participants dialog. */
async function uzyjFantu() {
  const pc = game.user.character;
  const item = pc.items.getName("Gra planszowa");
  const act = item.system.activities.contents[0];
  const used = act.use({ configure: false }, { configure: false }, {});
  const dlg = await window.__e2e.until(() => window.__e2e.findApps({ title: "Gra planszowa", action: "ok" })[0], { message: "the participants dialog" });
  for (const box of dlg.element.querySelectorAll('input[type="checkbox"]')) box.checked = true;
  dlg.element.querySelector('[data-action="ok"]').click();
  await used;
  await window.__e2e.until(() => game.actors.getName("PC Gracz 2") && game.neuroshima.fuksy.lista(game.actors.getName("PC Gracz 2")).some(f => f.zrodlo === "fant"), { timeoutMs: 10000, message: "Gracz 2's Fuks via the GM relay" });
  return {
    p1: game.neuroshima.fuksy.lista(pc).map(f => f.zrodlo).sort(),
    p2: game.neuroshima.fuksy.lista(game.actors.getName("PC Gracz 2")).map(f => f.zrodlo),
    uzyli: item.getFlag("neuroshima-2026-overrides", "fant").uzyli.length
  };
}

/** GM: [Otwórz dobę] on the party sheet's Postój tab. */
async function otworzDobe() {
  const party = game.actors.party;
  await party.sheet.render(true);
  await window.__e2e.until(() => party.sheet.element?.querySelector('[data-tab="postoj"]'), { message: "Postój tab" });
  party.sheet.changeTab("postoj", "primary");
  const n0 = game.messages.size;
  (await window.__e2e.until(() => party.sheet.element.querySelector('[data-action="neuroDobaOtworz"]'), { message: "[Otwórz dobę]" })).click();
  const m = await window.__e2e.until(() => game.messages.contents.slice(n0).find(x => x.content.includes("ulozDobe")), { message: "the day card" });
  return { karta: m.id, otwarta: Boolean(party.getFlag("neuroshima-2026-overrides", "postoj")?.doba?.otwarta), czas: game.time.worldTime };
}

/** Player: open the day window (chat card or sheet button), set fields, report. */
async function ulozDobe({ zKarty = null, utrzymanie, sen }) {
  const pc = game.user.character;
  if (zKarty) {
    await window.__e2e.until(() => (ui.chat.element ?? document).querySelector(`[data-message-id="${zKarty}"] [data-neuro-postoj="ulozDobe"]`), { message: "the card button" });
    (ui.chat.element ?? document).querySelector(`[data-message-id="${zKarty}"] [data-neuro-postoj="ulozDobe"]`).click();
  } else {
    await pc.sheet.render(true);
    (await window.__e2e.until(() => pc.sheet.element?.querySelector(".sheet-header-buttons .neuro-doba-btn"), { message: "the Doba button" })).click();
  }
  const okno = await window.__e2e.until(() => window.__e2e.findApps({ title: "Doba —" })[0], { message: "the day window" });
  const form = await window.__e2e.until(() => okno.element.querySelector("form.neuro-doba-form [name=sen]") ? okno.element.querySelector("form.neuro-doba-form") : null, { message: "the form" });
  const set = (name, v) => { const el = form.querySelector(`[name="${name}"]`); el.value = v; el.dispatchEvent(new Event("change", { bubbles: true })); };
  set("sen", sen);
  set("utrzymanie", utrzymanie);
  await window.__e2e.until(() => pc.getFlag("neuroshima-2026-overrides", "szkicDoby")?.utrzymanie === utrzymanie, { message: "draft saved" });
  await window.__e2e.sleep(300);
  const obraz = okno.element.querySelector(".neuro-doba-naglowek img")?.getAttribute("src") ?? null;
  const saldo = okno.element.querySelector(".neuro-doba-saldo strong")?.textContent.trim();
  okno.element.querySelector('[data-action="zglos"]').click();
  await window.__e2e.until(() => pc.getFlag("neuroshima-2026-overrides", "szkicDoby")?.stan === "zgloszony", { message: "reported" });
  return { saldo, obraz };
}

/** GM: the table shows both reported; [Zatwierdź dobę]. */
async function zatwierdz({ czas0 }) {
  const MOD = "neuroshima-2026-overrides";
  const party = game.actors.party;
  await party.sheet.render(true);
  party.sheet.changeTab("postoj", "primary");
  const p1 = game.actors.getName("PC Gracz 1");
  const p2 = game.actors.getName("PC Gracz 2");
  await window.__e2e.until(() => party.sheet.element.querySelectorAll(".neuro-doba-tabela tr.is-zgloszony").length === 2, { timeoutMs: 15000, message: "both reported in the GM table" });
  const n0 = game.messages.size;
  let czasy = 0;
  const hook = Hooks.on("updateWorldTime", () => { czasy++; });
  party.sheet.element.querySelector('[data-action="neuroDobaZatwierdz"]').click();
  await window.__e2e.until(() => !party.getFlag(MOD, "postoj")?.doba?.otwarta, { timeoutMs: 30000, message: "the day approved" });
  await window.__e2e.quiet({ idleMs: 1000 });
  Hooks.off("updateWorldTime", hook);
  const nowe = game.messages.contents.slice(n0).map(m => ({ szept: m.whisper.length > 0, tekst: m.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(), klasa: m.content.match(/is-(bogaty|info|braki)/)?.[1] ?? null }));
  return {
    dt: game.time.worldTime - czas0, czasy,
    szkice: [p1, p2].map(a => a.getFlag(MOD, "szkicDoby") ?? null),
    p2: { wycz: p2.system.attributes.exhaustion, marker: p2.statuses.has("malnutrition") },
    p1fuksy: game.neuroshima.fuksy.lista(p1).map(f => f.zrodlo).sort(),
    historia: party.getFlag(MOD, "postoj")?.historia?.length ?? 0,
    konto: p2.getFlag(MOD, "postojKonto")?.ostatni?.utrzymanie ?? null,
    zachod: nowe.find(m => /ZACHÓD SŁOŃCA/.test(m.tekst))?.tekst ?? null,
    podsumowania: nowe.filter(m => m.tekst.startsWith("Doba:")).map(m => ({ tekst: m.tekst.slice(0, 120), klasa: m.klasa })),
    mg: nowe.find(m => m.szept && /Doba zatwierdzona/.test(m.tekst))?.tekst ?? null,
    wygasl: nowe.some(m => /wygasł/.test(m.tekst))
  };
}

/** Player 1, day two: Rozrywka + a rolled Hazard game in the day window; returns the bill. */
async function dobaE6Gracz1({ d20 }) {
  const MOD = "neuroshima-2026-overrides";
  const pc = game.user.character;
  await pc.sheet.render(true);
  (await window.__e2e.until(() => pc.sheet.element?.querySelector(".sheet-header-buttons .neuro-doba-btn"), { message: "the Doba button" })).click();
  const okno = await window.__e2e.until(() => window.__e2e.findApps({ title: "Doba —" })[0], { message: "the day window" });
  const dzisiaj = game.actors.party.getFlag(MOD, "postoj")?.doba?.id;
  // The window may still be open from day one: wait for the form drawn for today's draft.
  const form = await window.__e2e.until(() => okno._dobaFormy === dzisiaj && okno.element.querySelector('form.neuro-doba-form [name="neuroZajecia.hazard.wlacz"]') ? okno.element.querySelector("form.neuro-doba-form") : null, { message: "the Hazard section" });
  const set = (name, v) => {
    const el = form.querySelector(`[name="${name}"]`);
    if (el.type === "checkbox") el.checked = v; else el.value = v;
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };
  set("sen", 8);
  set("utrzymanie", "normalny");
  set("neuroZajecia.rozrywka.wlacz", true);
  set("neuroZajecia.rozrywka.kwota", 50);
  set("neuroZajecia.hazard.wlacz", true);
  set("neuroZajecia.hazard.gra", "karty");
  set("neuroZajecia.hazard.stawka", 10);
  await window.__e2e.until(() => pc.getFlag(MOD, "szkicDoby")?.zajecia?.hazard?.stawka == 10, { message: "draft saved" });
  window.__e2e.forceD20([d20]);
  form.querySelector('[data-zajecie-rzut="hazard"]').click();
  await window.__e2e.pressRollDialog("normal");
  await window.__e2e.until(() => String(pc.getFlag(MOD, "szkicDoby")?.zajecia?.hazard?.wynik ?? "") !== "", { message: "the roll in the draft" });
  window.__e2e.restoreDice();
  await window.__e2e.sleep(400);
  const wynik = Number(pc.getFlag(MOD, "szkicDoby").zajecia.hazard.wynik);
  const pokaz = okno.element.querySelector('.neuro-zajecie[data-zajecie="hazard"] .neuro-zajecie-wynik')?.textContent.trim();
  const saldo = okno.element.querySelector(".neuro-doba-saldo strong")?.textContent.trim();
  okno.element.querySelector('[data-action="zglos"]').click();
  await window.__e2e.until(() => pc.getFlag(MOD, "szkicDoby")?.stan === "zgloszony", { message: "reported" });
  return { wynik, pokaz, saldo };
}

/** Player 2, day two: 5 h of sleep, Nędzny upkeep, a 10 h Technika shift; returns the bill and his passive. */
async function dobaE6Gracz2() {
  const MOD = "neuroshima-2026-overrides";
  const pc = game.user.character;
  await pc.sheet.render(true);
  (await window.__e2e.until(() => pc.sheet.element?.querySelector(".sheet-header-buttons .neuro-doba-btn"), { message: "the Doba button" })).click();
  const okno = await window.__e2e.until(() => window.__e2e.findApps({ title: "Doba —" })[0], { message: "the day window" });
  const dzisiaj = game.actors.party.getFlag(MOD, "postoj")?.doba?.id;
  // The window may still be open from day one: wait for the form drawn for today's draft.
  const form = await window.__e2e.until(() => okno._dobaFormy === dzisiaj && okno.element.querySelector('form.neuro-doba-form [name="neuroZajecia.praca.klucz"]') ? okno.element.querySelector("form.neuro-doba-form") : null, { message: "the Praca section" });
  const set = (name, v) => { const el = form.querySelector(`[name="${name}"]`); el.value = v; el.dispatchEvent(new Event("change", { bubbles: true })); };
  set("sen", 5);
  set("utrzymanie", "nedzny");
  set("neuroZajecia.praca.klucz", "skill:tch");
  set("neuroZajecia.praca.godziny", 10);
  await window.__e2e.until(() => pc.getFlag(MOD, "szkicDoby")?.zajecia?.praca?.godziny == 10 && pc.getFlag(MOD, "szkicDoby")?.sen === 5, { message: "draft saved" });
  await window.__e2e.sleep(400);
  const saldo = okno.element.querySelector(".neuro-doba-saldo strong")?.textContent.trim();
  const skutki = okno.element.textContent.includes("tylko korzyści Krótkiego odpoczynku");
  okno.element.querySelector('[data-action="zglos"]').click();
  await window.__e2e.until(() => pc.getFlag(MOD, "szkicDoby")?.stan === "zgloszony", { message: "reported" });
  return { saldo, skutki, pasywna: pc.system.skills.tch.passive };
}

/** GM, day two: approve; the Rozrywka Fuks, the sleep-save request, carry-over. */
async function zatwierdzE6() {
  const MOD = "neuroshima-2026-overrides";
  const party = game.actors.party;
  await party.sheet.render(true);
  party.sheet.changeTab("postoj", "primary");
  const p1 = game.actors.getName("PC Gracz 1");
  const p2 = game.actors.getName("PC Gracz 2");
  await window.__e2e.until(() => party.sheet.element.querySelectorAll(".neuro-doba-tabela tr.is-zgloszony").length === 2, { timeoutMs: 15000, message: "both reported" });
  const n0 = game.messages.size;
  party.sheet.element.querySelector('[data-action="neuroDobaZatwierdz"]').click();
  await window.__e2e.until(() => !party.getFlag(MOD, "postoj")?.doba?.otwarta, { timeoutMs: 30000, message: "the day approved" });
  await window.__e2e.quiet({ idleMs: 1000 });
  const nowe = game.messages.contents.slice(n0);
  const ro = nowe.find(m => m.type === "request" && m.system?.handler === "neuroSenRO");
  const tekst = m => m.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return {
    p1fuksy: game.neuroshima.fuksy.lista(p1).map(f => f.zrodlo).sort(),
    ro: ro ? { id: ro.id, st: ro.system.data?.st, cel: ro.system.targets?.[0]?.actor } : null,
    p2uuid: p2.uuid,
    p2podsumowanie: nowe.map(tekst).find(t => t.startsWith("Doba:") && t.includes("PC Gracz 2")) ?? null,
    p1podsumowanie: nowe.map(tekst).find(t => t.startsWith("Doba:") && t.includes("PC Gracz 1")) ?? null,
    nadwyzka: p2.getFlag(MOD, "postojKonto")?.nadwyzka ?? null
  };
}

/** Player 2: the sleep save from the request card, failed on a forced 2 -> Bezsenność. */
async function rzutSnu({ id }) {
  const MOD = "neuroshima-2026-overrides";
  const pc = game.user.character;
  const przed = pc.system.attributes.exhaustion;
  window.__e2e.forceD20([2]);
  const ok = await window.__e2e.clickChat(id, '[data-action="handleRequest"]', { timeoutMs: 10000 });
  await window.__e2e.until(() => pc.system.attributes.exhaustion > przed, { timeoutMs: 10000, message: "the Bezsenność level" });
  window.__e2e.restoreDice();
  const { zrodlaWyczerpania } = await import(`/modules/${MOD}/scripts/config/exhaustion.mjs`);
  const { regulaZdejmowania } = await import(`/modules/${MOD}/scripts/config/rekonwalescencja-rules.mjs`);
  return {
    ok, przed, po: pc.system.attributes.exhaustion,
    zrodla: zrodlaWyczerpania(pc).map(z => z.source),
    uporczywa: !regulaZdejmowania("bezsennosc", { kobalt: true }).zwyklyDO
  };
}

/** GM: a Robota for Gracz 1, 100 h of Atletyka training for Gracz 2. */
async function przeskokPrzygotuj() {
  const MOD = "neuroshima-2026-overrides";
  const p1 = game.actors.getName("PC Gracz 1");
  const p2 = game.actors.getName("PC Gracz 2");
  const P = game.neuroshima.produkcja;
  // An ad hoc GM Robota (access granted by the GM), with the raw materials it lacks handed over first.
  const przepis = [...P.dane.PRZEPISY_STANDARDOWE.values()].find(x => x.wynik?.ref?.startsWith("grenade:"));
  const ocena = P.ocena(p1, przepis, { adHocMG: true });
  if (!ocena.alokacja.ok) await P.surowce.giveMany(p1, ocena.alokacja.brak);
  const robota = await P.start(p1, przepis, { mimoBrakow: true, adHocMG: true });
  await p2.update({ [`flags.${MOD}.trening.skill:atl`]: { godziny: 100, trener: "Stary Joe" } });
  const { zrodlaWyczerpania } = await import(`/modules/${MOD}/scripts/config/exhaustion.mjs`);
  return {
    robota: robota ? { uuid: robota.uuid, id: P.daneRoboty(robota)?.id } : null,
    p2bez: zrodlaWyczerpania(p2).filter(z => z.source === "bezsennosc").length,
    p1fuksy: game.neuroshima.fuksy.lista(p1).map(f => f.zrodlo).sort(),
    czas: game.time.worldTime
  };
}

/** GM: [Przeskok] on the Postój tab → 30 days, plans, preview, [Przeskocz] → confirm. */
async function przeskok({ robotaId, czas0 }) {
  const MOD = "neuroshima-2026-overrides";
  const party = game.actors.party;
  const p1 = game.actors.getName("PC Gracz 1");
  const p2 = game.actors.getName("PC Gracz 2");
  await party.sheet.render(true);
  party.sheet.changeTab("postoj", "primary");
  (await window.__e2e.until(() => party.sheet.element.querySelector('[data-action="neuroPostojPrzeskok"]'), { message: "[Przeskok]" })).click();
  const okno = await window.__e2e.until(() => window.__e2e.findApps({ title: "Przeskok —" })[0], { message: "the skip window" });
  const form = await window.__e2e.until(() => okno.element.querySelector("form.neuro-przeskok-form"), { message: "the form" });
  const set = (name, v) => {
    const el = form.querySelector(`[name="${name}"]`);
    if (!el) throw new Error(`no field ${name}`);
    if (el.type === "checkbox") el.checked = v; else el.value = v;
    el.dispatchEvent(new Event("change", { bubbles: true }));
  };
  set("dni", 30);
  set(`p.${p1.id}.roboty.${robotaId}`, 10);
  set(`p.${p1.id}.testy.${robotaId}`, true);
  set(`p.${p2.id}.trening.cel`, "skill:atl");
  set(`p.${p2.id}.trening.godziny`, 10);
  set(`p.${p2.id}.trening.trener`, "Stary Joe");
  const podglad = await window.__e2e.until(() => {
    const t = okno.element.querySelector(".neuro-przeskok-podglad")?.textContent.replace(/\s+/g, " ") ?? "";
    return /Za 30 dób/.test(t) && /300\/300 h — ukończony/.test(t) ? t : null;
  }, { message: "the preview for 30 days" });
  const n0 = game.messages.size;
  let czasy = 0;
  const hook = Hooks.on("updateWorldTime", () => { czasy++; });
  okno.element.querySelector('[data-action="zatwierdz"]').click();
  const potw = await window.__e2e.clickDialog({ title: "Przeskok o 30" }, "yes");
  await window.__e2e.until(() => game.time.worldTime - czas0 >= 30 * 86400, { timeoutMs: 30000, message: "the clock" });
  await window.__e2e.until(() => !okno.rendered, { timeoutMs: 15000, message: "the window closed" });
  await window.__e2e.quiet({ idleMs: 1000 });
  Hooks.off("updateWorldTime", hook);
  const { zrodlaWyczerpania } = await import(`/modules/${MOD}/scripts/config/exhaustion.mjs`);
  const nowe = game.messages.contents.slice(n0).map(m => ({ szept: m.whisper.length > 0, tekst: m.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim() }));
  return {
    potw,
    podglad: podglad.slice(0, 600),
    dt: game.time.worldTime - czas0, czasy,
    wyszkolenie: Boolean(p2.items.find(i => i.name === "Wyszkolenie: Atletyka")),
    atletyka: p2.system.skills.atl.value,
    robotyP1: game.neuroshima.produkcja.roboty(p1).length,
    p2bez: zrodlaWyczerpania(p2).filter(z => z.source === "bezsennosc").length,
    p1fuksy: game.neuroshima.fuksy.lista(p1).map(f => f.zrodlo).sort(),
    karty: nowe.filter(m => /30 dób później/.test(m.tekst)).map(m => m.tekst.slice(0, 300)),
    mg: nowe.find(m => m.szept && /Przeskok: 30 dób/.test(m.tekst))?.tekst ?? null,
    historia: party.getFlag(MOD, "postoj")?.historia?.at(-1)?.przeskok ?? null,
    kontoDni: p2.getFlag(MOD, "postojKonto")?.dni ?? null
  };
}

export default {
  name: "postoj",
  clients: ["gm", "Gracz 1", "Gracz 2"],

  async run(t) {
    const p1 = t.client("Gracz 1");
    const p2 = t.client("Gracz 2");
    for (const p of [p1, p2]) await t.waitFor(p, () => Boolean(game.user.character && ui.chat?.element), { message: "the player's client to see the fixture" });

    await t.step("GM: party in Bazar; chronic disease and a Gotowanie Fuks for Gracz 1; Gracz 2 malnourished", async () => {
      const r = await t.gm.eval(przygotuj);
      t.equal(r.gotowanie.join(","), "gotowanie", "Gotowanie Fuks");
      t.assert(r.choroby.includes("osteoporoza"), "chronic disease", r);
      t.equal(r.p2wycz, 1, "Niedożywienie level");
      t.equal(r.fant, true, "the Fant given");
    });

    await t.step("E2: a shared Fant — both PCs get a permanent Fuks; the copy remembers both", async () => {
      await t.waitFor(p1, () => Boolean(game.user.character.items.getName("Gra planszowa")), { message: "the Fant on Gracz 1" });
      const r = await p1.eval(uzyjFantu);
      t.equal(r.p1.join(","), "fant,gotowanie", "Gracz 1: Fant + Gotowanie");
      t.equal(r.p2.join(","), "fant", "Gracz 2 via the GM relay");
      t.equal(r.uzyli, 2, "uzyli on the copy");
    });

    let dzien;
    let p2pasywna = 0;
    await t.step("GM [Otwórz dobę] → a card with [Ułóż dobę]", async () => {
      dzien = await t.gm.eval(otworzDobe);
      t.equal(dzien.otwarta, true, "day open on the party");
    });

    await t.step("Gracz 1 from the card: Normalny, 8 h, reports; Gracz 2 from his sheet: Bogaty, reports", async () => {
      await t.waitFor(p1, (id) => Boolean(game.messages.get(id)), { args: [dzien.karta], message: "the card on Gracz 1" });
      const a = await p1.eval(ulozDobe, { zKarty: dzien.karta, utrzymanie: "normalny", sen: 8 });
      t.equal(a.saldo, "-10 gb", "Normalny costs 10 gb (s. 47)");
      const b = await p2.eval(ulozDobe, { utrzymanie: "bogaty", sen: 8 });
      t.equal(b.saldo, "-20 gb", "Bogaty costs 20 gb");
      await t.screenshot("Gracz 2", "okno doby — Bogaty");
    });

    await t.step("GM [Zatwierdź dobę]: food before rest, upkeep dose, clock +24 h once, cards, drafts cleared", async () => {
      const r = await t.gm.eval(zatwierdz, { czas0: dzien.czas });
      t.equal(r.dt, 86400, "clock +24 h");
      t.equal(r.czasy, 1, "one world-time update");
      t.equal(r.p2.marker, false, "Niedożywienie marker gone (upkeep fed him)");
      t.equal(r.p2.wycz, 0, "…so the long rest removed its level (U27 order)");
      t.assert(/osteoporoza|Osteoporoza/i.test(r.zachod ?? "") && /dawka z utrzymania/.test(r.zachod ?? ""), "Zachód słońca: dose from upkeep", r.zachod);
      t.equal(r.szkice.every(s => s === null), true, "drafts cleared");
      t.equal(r.historia, 1, "history");
      t.equal(r.konto, "bogaty", "'jak wczoraj' remembers Bogaty");
      t.equal(r.podsumowania.length, 2, "a summary card per PC");
      t.assert(r.podsumowania.some(p => p.klasa === "bogaty"), "Bogaty card style", r.podsumowania);
      t.assert(Boolean(r.mg), "one GM card");
      t.equal(r.p1fuksy.join(","), "fant", "the Gotowanie Fuks expired after 24 h");
      t.equal(r.wygasl, true, "with a chat line");
      await t.screenshot("gm", "doba zatwierdzona");
    });

    await t.step("E6 day two: GM opens it; Gracz 1 plans Rozrywka and rolls a Hazard game in the window", async () => {
      dzien = await t.gm.eval(otworzDobe);
      t.equal(dzien.otwarta, true, "day two open");
      await t.waitFor(p1, () => Boolean(game.actors.party?.getFlag("neuroshima-2026-overrides", "postoj")?.doba?.otwarta), { message: "day two on Gracz 1" });
      const a = await p1.eval(dobaE6Gracz1, { d20: 20 });
      t.assert(Number.isFinite(a.wynik) && a.wynik >= 15, "the Hazard roll stored in the draft", a);
      t.assert(a.pokaz?.includes(String(a.wynik)), "and shown next to the button", a.pokaz);
      // Normalny 10 + Rozrywka 50 + stake 10; a win (>= 20) pays two stakes back (U36).
      t.equal(a.saldo, a.wynik >= 20 ? "-50 gb" : "-70 gb", "bill: upkeep, Rozrywka, stake and the Hazard outcome");
      await t.screenshot("Gracz 1", "doba E6 - rozrywka i hazard");
    });

    await t.step("E6 day two: Gracz 2 sleeps 5 h and works 10 h of Technika", async () => {
      await t.waitFor(p2, () => Boolean(game.actors.party?.getFlag("neuroshima-2026-overrides", "postoj")?.doba?.otwarta), { message: "day two on Gracz 2" });
      const b = await p2.eval(dobaE6Gracz2);
      t.equal(b.skutki, true, "5 h of sleep: only short-rest benefits (s. 46)");
      t.equal(b.saldo, `${b.pasywna - 5} gb`, "Praca pays the passive Technika for 10 h, minus Nędzny 5 gb", b);
      p2pasywna = b.pasywna;
    });

    let e6;
    await t.step("E6 approval: Rozrywka Fuks for Gracz 1; Gracz 2 short rest, Kobalt sleep save ST 10, surplus carried", async () => {
      e6 = await t.gm.eval(zatwierdzE6);
      t.assert(e6.p1fuksy.includes("rozrywka"), "Rozrywka Fuks (s. 47)", e6.p1fuksy);
      t.assert(Boolean(e6.ro), "a sleep-save request card", e6);
      t.equal(e6.ro.st, 10, "4-5 h of sleep: ST 10 (WKK)");
      t.equal(e6.ro.cel, e6.p2uuid, "addressed to Gracz 2");
      t.assert(/Krótki odpoczynek/.test(e6.p2podsumowanie ?? ""), "summary says short rest", e6.p2podsumowanie);
      t.assert(/Hazard/.test(e6.p1podsumowanie ?? "") && /Rozrywka/.test(e6.p1podsumowanie ?? ""), "Gracz 1's summary lists the activities", e6.p1podsumowanie);
      t.equal(e6.nadwyzka, Math.max(0, p2pasywna - 5), "the surplus carries over to tomorrow");
    });

    await t.step("E6: Gracz 2 fails the sleep save from his own client -> Bezsenność a plain long rest won't lift", async () => {
      await t.waitFor(p2, (id) => Boolean(game.messages.get(id)), { args: [e6.ro.id], message: "the request on Gracz 2" });
      const r = await p2.eval(rzutSnu, { id: e6.ro.id });
      t.equal(r.ok, true, "the request button");
      t.equal(r.po, r.przed + 1, "one exhaustion level");
      t.assert(r.zrodla.includes("bezsennosc"), "source: Bezsenność", r.zrodla);
      t.equal(r.uporczywa, true, "persistent under WKK Sen (D35)");
      await t.screenshot("Gracz 2", "RO snu - porazka");
    });

    await t.step("E7: a 30-day skip — Robota 10 h/day (test accepted), Atletyka training from 100 h", async () => {
      const prz = await t.gm.eval(przeskokPrzygotuj);
      t.assert(Boolean(prz.robota?.id), "a Robota started for Gracz 1", prz);
      t.equal(prz.p2bez, 1, "Gracz 2 carries the Bezsenność level from the failed save");
      const r = await t.gm.eval(przeskok, { robotaId: prz.robota.id, czas0: prz.czas });
      t.assert(Boolean(r.potw), "the confirm dialog");
      t.equal(r.dt, 30 * 86400, "clock +30 days");
      t.equal(r.czasy, 1, "one world-time update");
      t.equal(r.wyszkolenie, true, "Training done: Wyszkolenie: Atletyka");
      t.assert(r.atletyka >= 1, "…and its effect gives proficiency", r.atletyka);
      t.equal(r.robotyP1, 0, "the Robota finished (final test accepted)");
      t.equal(r.p2bez, 0, "Bezsenność slept off (WKK, D35)");
      t.assert(!r.p1fuksy.includes("rozrywka"), "the 7-day Rozrywka Fuks expired", r.p1fuksy);
      t.equal(r.karty.length, 2, "a summary card per PC", r.karty);
      t.assert(Boolean(r.mg), "one GM card");
      t.equal(r.historia, 30, "history records the skip");
      t.assert(r.kontoDni >= 30, "the account counts the days", r.kontoDni);
      await t.screenshot("gm", "przeskok 30 dob");
    });
  }
};
