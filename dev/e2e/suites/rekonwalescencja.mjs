/**
 * Suite — Rekonwalescencja (PLAN_m1_walka.md E5–E6, §8 „Testy”). GM and two players; the whole loop
 * twice, without and with Kobalt (NOE, then WKK), driven the way the table drives it: players open
 * their own Długi odpoczynek window, pick the way to heal in its "Rekonwalescencja" section and press
 * the native "Odpocznij"; the RO card is clicked in the owner's own chat log.
 *
 *  - Wyczerpanie pips (§7.9): Krytyczny's level is framed (persistent) only under WKK; the rightmost
 *    pip is the one the next DO removes; the Zranienie row carries the kalendarzyk button.
 *  - Pomoc medyczna from the other player's PC (D4): −1 Stopień without a roll; leaving Krytyczny
 *    removes the Zranienie exhaustion (RAI); WKK only — one charge from the medic's kit (written by
 *    the GM relay: the patient's player cannot write the medic's item) and the whole DO taken (D7):
 *    the patient's other activities lock live in the window, and the medic's own window shows the
 *    care and locks too.
 *  - Body path (D3): counter 1 → 2 → 3, RO card for the owner only; failure keeps the counter and the
 *    button goes; the next DO deals a new card; success: −1 Stopień, counter from zero.
 *  - Kalendarzyk (§7.8, D9) opened from the Stan panel: both rows, medic row = Stopień in DO, body row
 *    from the live counter.
 *  - WKK only — samoleczenie (D8): the medic heals himself, the charge goes before the test, a failed
 *    test adds a Stopień. NOE has no such option.
 */

/* Functions below run in the browser (serialised): no closures over this file. */

const MOD = "neuroshima-2026-overrides";

/** GM: one layer's starting state — PC Gracz 1 at Krytyczny with its exhaustion, PC Gracz 2 a medic. */
async function przygotuj({ kobalt }) {
  const MOD = "neuroshima-2026-overrides";
  const base = `/modules/${MOD}/scripts`;
  const { setZranienie } = await import(`${base}/combat/zranienie.mjs`);
  const { addExhaustion } = await import(`${base}/config/exhaustion.mjs`);
  const { createToolkits } = await import(`${base}/config/toolkits-data.mjs`);
  await game.settings.set(MOD, "kobaltEnabled", kobalt);

  for (const name of ["PC Gracz 1", "PC Gracz 2"]) {
    const a = game.actors.getName(name);
    await a.update({
      "system.attributes.hp.max": 12, "system.attributes.hp.value": 12, "system.attributes.exhaustion": 0,
      [`flags.${MOD}.-=exhaustionSources`]: null, [`flags.${MOD}.-=rekonwalescencja`]: null,
      [`flags.${MOD}.-=rekonwalescencjaProsba`]: null
    });
    for (const s of ["dehydration", "malnutrition"]) await a.toggleStatusEffect(s, { active: false });
    await setZranienie(a, 0);
  }
  const pacjent = game.actors.getName("PC Gracz 1");
  await setZranienie(pacjent, 4);
  await addExhaustion(pacjent, "zranienie", { chat: false });
  await addExhaustion(pacjent, "kac", { chat: false });

  const medyk = game.actors.getName("PC Gracz 2");
  await medyk.update({ "system.skills.med.value": 1 });
  let kit = medyk.items.find(i => i.type === "tool" && i.system.type?.baseItem === "medyka");
  if (!kit) {
    await createToolkits(medyk, { only: ["medyka"] });
    kit = medyk.items.find(i => i.type === "tool" && i.system.type?.baseItem === "medyka");
  }
  await kit.update({ "system.uses.max": "5", "system.uses.spent": 0 });
  await new Promise(r => setTimeout(r, 600));
  return { kobalt: game.settings.get(MOD, "kobaltEnabled") };
}

/** Recovery state of a PC, as any client reads it. */
function stan({ name }) {
  const MOD = "neuroshima-2026-overrides";
  const a = game.actors.getName(name);
  const s = game.neuroshima.rekonwalescencja.stan(a);
  const kit = a.items.find(i => i.type === "tool" && i.system.type?.baseItem === "medyka");
  return {
    stopien: a.getFlag(MOD, "zranienie")?.level ?? 0,
    licznik: s.licznik, droga: s.droga, karta: s.karta, wynik: s.wynik,
    wyczerpanie: (a.getFlag(MOD, "exhaustionSources") ?? []).map(e => e.source),
    poziom: a._source.system.attributes.exhaustion,
    ladunki: kit ? Number(kit.system.uses.max) - Number(kit.system.uses.spent) : null
  };
}

/**
 * This player's Długi odpoczynek through the native window: read the section, pick the way to heal,
 * then press "Odpocznij" — or, with `anuluj`, just look and close.
 */
async function odpocznij({ name, droga = null, medyk = null, anuluj = false, okno = true }) {
  const a = game.actors.getName(name);
  if (!okno) {
    await a.longRest({ dialog: false });
    await new Promise(r => setTimeout(r, 1500));
    return { okno: false };
  }
  const odpoczynek = a.longRest();
  let app = null;
  for (let i = 0; i < 80 && !app; i++) {
    await new Promise(r => setTimeout(r, 100));
    app = [...foundry.applications.instances.values()]
      .find(x => x.rendered && (x.actor ?? x.document) === a && x.element?.querySelector('button[name="rest"]'));
  }
  if (!app) return { okno: null };
  const el = app.element;
  const N = "neuroZajecia.rekonwalescencja";
  if (droga) {
    const r = el.querySelector(`[name="${N}.droga"][value="${droga}"]`);
    if (r) { r.checked = true; r.dispatchEvent(new Event("change", { bubbles: true })); }
  }
  if (medyk) {
    const sel = el.querySelector(`[name="${N}.medyk"]`);
    if (sel) { sel.value = game.actors.getName(medyk).uuid; sel.dispatchEvent(new Event("change", { bubbles: true })); }
  }
  await new Promise(r => setTimeout(r, 150));
  const blokada = el.querySelector(".neuro-zajecia-blokada");
  const info = {
    okno: true,
    sekcja: Boolean(el.querySelector('[data-zajecie="rekonwalescencja"]')),
    drogi: [...el.querySelectorAll(`[name="${N}.droga"]`)].map(r => r.value + (r.disabled ? "!" : "")),
    opieka: Boolean(el.querySelector(".neuro-rekon-opieka")),
    choroba: Boolean(el.querySelector(".neuro-rest-choroba")),
    blokada: blokada && !blokada.hidden ? blokada.textContent.trim() : null,
    zablokowane: [...el.querySelectorAll(".neuro-zajecie.is-zablokowane")].map(f => f.dataset.zajecie)
  };
  if (anuluj) {
    await app.close();
    await odpoczynek;
    return info;
  }
  el.querySelector('button[name="rest"]').click();
  await odpoczynek;
  await new Promise(r => setTimeout(r, 1500));
  return info;
}

/** Wyczerpanie pips and the Zranienie row's kalendarzyk button on this client's sheet. */
async function pipki({ name }) {
  const a = game.actors.getName(name);
  await a.sheet.render(true);
  let pips = [];
  for (let i = 0; i < 40 && !pips.length; i++) {
    await new Promise(r => setTimeout(r, 100));
    pips = [...(a.sheet.element?.querySelectorAll(".neuro-stan-exhaustion .neuro-stan-pip.filled") ?? [])];
  }
  const out = {
    pipki: pips.map(p => ({
      uporczywe: p.classList.contains("uporczywe"),
      ramka: getComputedStyle(p, "::before").borderTopStyle,
      tip: p.dataset.tooltipHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
    })),
    kalendarzyk: Boolean(a.sheet.element?.querySelector(".neuro-stan-zranienie .neuro-kalendarzyk-btn")),
    // Skażenie: wyciszone poza skażeniem, każda kreska z dymkiem (jak pipki Zranienia).
    rad: {
      goracy: Boolean(a.sheet.element?.querySelector(".neuro-stan-rad.is-hot")),
      dymki: [...(a.sheet.element?.querySelectorAll(".neuro-rad-mark") ?? [])].map(m => Boolean(m.dataset.tooltipHtml)),
      tlo: getComputedStyle(a.sheet.element?.querySelector(".neuro-stan-rad") ?? document.body).backgroundImage
    }
  };
  return out;
}

async function zamknijKarte({ name }) {
  await game.actors.getName(name).sheet.close();
}

/** Recovery-card buttons this client sees on a message. */
function przyciski({ messageId }) {
  const el = ui.chat.element?.querySelector(`[data-message-id="${messageId}"]`);
  return el ? [...el.querySelectorAll("[data-rekon]")].map(b => b.dataset.rekon) : null;
}

/** Click a recovery-card button in this client's own chat; the d20 is fixed (face = ceil((1 − u) × 20)), the roll dialog's "normal". */
async function klik({ messageId, uniform }) {
  const orig = CONFIG.Dice.randomUniform;
  CONFIG.Dice.randomUniform = () => uniform;
  try {
    for (let i = 0; i < 20; i++) {
      const btn = ui.chat.element?.querySelector(`[data-message-id="${messageId}"] [data-rekon]`);
      if (btn && !btn.disabled) {
        btn.click();
        for (let j = 0; j < 40; j++) {
          await new Promise(r => setTimeout(r, 150));
          const app = [...foundry.applications.instances.values()]
            .find(x => x.rendered && /RollConfigurationDialog/.test(x.constructor.name));
          const press = app?.element.querySelector('[data-action="normal"]');
          if (press) { press.click(); break; }
        }
        await new Promise(r => setTimeout(r, 1500));
        return true;
      }
      await new Promise(r => setTimeout(r, 250));
    }
    return false;
  } finally {
    CONFIG.Dice.randomUniform = orig;
  }
}

/** Open the kalendarzyk from the sheet's Stan panel; read it; close it. */
async function kalendarzyk({ name }) {
  const a = game.actors.getName(name);
  await a.sheet.render(true);
  let btn = null;
  for (let i = 0; i < 40 && !btn; i++) {
    await new Promise(r => setTimeout(r, 100));
    btn = a.sheet.element?.querySelector(".neuro-stan-zranienie .neuro-kalendarzyk-btn");
  }
  if (!btn) return null;
  btn.click();
  let app = null;
  for (let i = 0; i < 40 && !app; i++) {
    await new Promise(r => setTimeout(r, 100));
    app = [...foundry.applications.instances.values()].find(x => x.rendered && x.id?.startsWith("neuro-kalendarzyk-"));
  }
  if (!app) return null;
  const rows = [...app.element.querySelectorAll(".neuro-kal-tabela tbody tr")].map(tr =>
    [...tr.children].map(c => c.textContent.replace(/\s+/g, " ").trim()));
  const dni = app.element.querySelectorAll(".neuro-kal-pasek.is-cialo .neuro-kal-dzien").length;
  const dane = game.neuroshima.rekonwalescencja.dane(a);
  return {
    choroba: app.element.querySelector(".neuro-kal-choroba")?.textContent.replace(/\s+/g, " ").trim() ?? null,
    smierc: app.element.querySelector(".neuro-kal-smierc")?.textContent.replace(/\s+/g, " ").trim() ?? null,
    rows, dni, licznik: dane.stan.licznik,
    medykZwykle: dane.medyk.progi.zwykle, cialoNajszybciej: dane.cialo.progi.najszybciej
  };
}

async function zamknijKalendarzyk() {
  for (const app of [...foundry.applications.instances.values()]) {
    if (app.id?.startsWith("neuro-kalendarzyk-")) await app.close();
  }
}

export default {
  name: "rekonwalescencja",
  clients: ["gm", "Gracz 1", "Gracz 2"],

  async run(t) {
    const p1 = t.client("Gracz 1");
    const p2 = t.client("Gracz 2");
    for (const p of [p1, p2]) {
      await t.waitFor(p, () => Boolean(game.user.character && ui.chat?.element), { message: "a player's client to see the fixture" });
    }

    for (const kobalt of [false, true]) {
      const W = kobalt ? "WKK" : "NOE";

      await t.step(`${W}: GM — PC Gracz 1 Krytyczny with Wyczerpanie (Zranienie, Kac); PC Gracz 2 a medic with 5 charges`, async () => {
        const r = await t.gm.eval(przygotuj, { kobalt });
        t.equal(r.kobalt, kobalt, "Kobalt setting");
        const s = await t.waitFor(p1, stan, { args: [{ name: "PC Gracz 1" }], until: x => x.stopien === 4 && x.poziom === 2, message: "the player to see the wound" });
        t.equal(s.wyczerpanie.join(","), "zranienie,kac", "sources");
      });

      await t.step(`${W}: pips — rightmost goes next DO; Krytyczny's level framed only under WKK; kalendarzyk button`, async () => {
        const v = await p1.eval(pipki, { name: "PC Gracz 1" });
        await t.screenshot("Gracz 1", `pipki-${W}`);
        await p1.eval(zamknijKarte, { name: "PC Gracz 1" });
        t.equal(v.pipki.length, 2, "two filled pips");
        t.assert(/Kac/.test(v.pipki[1].tip) && /następnym Długim odpoczynku/.test(v.pipki[1].tip), "rightmost pip: Kac, next DO", v.pipki);
        t.equal(v.pipki[0].uporczywe, kobalt, "Zranienie pip persistent");
        t.equal(v.pipki[0].ramka, kobalt ? "solid" : "none", "frame drawn by ::before");
        t.assert(kobalt ? /Uporczywe \(WKK\)/.test(v.pipki[0].tip) : /drugim Długim odpoczynku/.test(v.pipki[0].tip), "Zranienie pip's way out", v.pipki[0]);
        t.equal(v.kalendarzyk, true, "kalendarzyk button on the Zranienie row");
        t.assert(v.pipki.every(p => /Od: \d+ \S+ \d+, \d\d:\d\d/.test(p.tip)), "each pip says when it was applied, in world time", v.pipki);
        t.equal(v.rad.goracy, false, "Skażenie row quiet without contamination");
        t.equal(v.rad.tlo, "none", "no stripes when quiet");
        t.equal(v.rad.dymki.join(), "true,true,true", "every Skażenie mark has a tooltip");
      });

      await t.step(`${W}: Gracz 1 rests with Pomoc medyczna from PC Gracz 2 → Poważny; Krytyczny's exhaustion gone (RAI)${kobalt ? "; one charge via GM; whole DO locked" : ""}`, async () => {
        const info = await p1.eval(odpocznij, { name: "PC Gracz 1", droga: "medyk", medyk: "PC Gracz 2" });
        t.equal(info.sekcja, true, "Rekonwalescencja section in the DO window");
        t.equal(info.drogi.includes("sam") || info.drogi.includes("sam!"), kobalt, "samoleczenie offered only under WKK");
        if (kobalt) {
          t.assert(/Pomoc medyczna zajmuje cały/.test(info.blokada ?? ""), "lock note", info);
          t.assert(info.zablokowane.includes("czyszczenie"), "other activities locked", info);
        } else {
          t.equal(info.blokada, null, "NOE: no lock");
        }
        const s = await t.waitFor(t.gm, stan, {
          args: [{ name: "PC Gracz 1" }], until: x => x.stopien === 3, message: "Stopień after the medic"
        });
        t.equal(s.wyczerpanie.length, 0, "DO took Kac, leaving Krytyczny took Zranienie");
        t.equal(s.licznik, 1, "counter +1 on a medic day");
        t.equal(s.droga, "medyk", "plan remembered");
        const m = await t.waitFor(t.gm, stan, {
          args: [{ name: "PC Gracz 2" }], until: x => x.ladunki === (kobalt ? 4 : 5), message: "medic's charges"
        });
        t.equal(m.ladunki, kobalt ? 4 : 5, "charges");
      });

      await t.step(`${W}: the medic's own DO window shows the care${kobalt ? " and is locked" : ""}`, async () => {
        const info = await p2.eval(odpocznij, { name: "PC Gracz 2", anuluj: true });
        t.equal(info.opieka, true, "Opieka medyczna line");
        t.equal(Boolean(info.blokada), kobalt, "lock");
        if (kobalt) t.assert(info.zablokowane.includes("czyszczenie"), "cleaning locked", info);
      });

      const ro = await t.step(`${W}: body path — counter 2, then 3 with an RO card only the owner (and GM) can roll`, async () => {
        await p1.eval(odpocznij, { name: "PC Gracz 1", droga: "cialo" });
        let s = await t.waitFor(t.gm, stan, { args: [{ name: "PC Gracz 1" }], until: x => x.licznik === 2, message: "counter 2" });
        t.equal(s.karta, null, "no card yet");
        await p1.eval(odpocznij, { name: "PC Gracz 1", droga: "cialo" });
        s = await t.waitFor(t.gm, stan, { args: [{ name: "PC Gracz 1" }], until: x => x.licznik === 3 && x.karta, message: "RO card" });
        const own = await t.waitFor(p1, przyciski, { args: [{ messageId: s.karta }], until: x => x?.length, message: "the card in Gracz 1's chat" });
        const other = await t.waitFor(p2, przyciski, { args: [{ messageId: s.karta }], until: x => Array.isArray(x), message: "the card in Gracz 2's chat" });
        t.equal(own.join(), "ro", "owner's button");
        t.equal(other.length, 0, "no button for the other player");
        await t.screenshot("Gracz 1", `karta-ro-${W}`);
        return s;
      });

      await t.step(`${W}: failed RO (d20 = 6) — counter stays, button gone; next DO deals a new card`, async () => {
        t.equal(await p1.eval(klik, { messageId: ro.karta, uniform: 0.72 }), true, "clicked");
        const s = await t.waitFor(t.gm, stan, { args: [{ name: "PC Gracz 1" }], until: x => x.wynik === "porazka", message: "failure recorded" });
        t.equal(s.stopien, 3, "Stopień unchanged");
        t.equal(s.licznik, 3, "counter stays");
        await t.waitFor(p1, przyciski, { args: [{ messageId: ro.karta }], until: x => Array.isArray(x) && !x.length, message: "button gone after the roll" });
        await p1.eval(odpocznij, { name: "PC Gracz 1", okno: false });
        const s2 = await t.waitFor(t.gm, stan, { args: [{ name: "PC Gracz 1" }], until: x => x.karta && x.karta !== ro.karta, message: "new RO card" });
        t.equal(s2.licznik, 4, "counter 4 (still due)");
        t.equal(await p1.eval(klik, { messageId: s2.karta, uniform: 0.07 }), true, "clicked the new card");
        const s3 = await t.waitFor(t.gm, stan, { args: [{ name: "PC Gracz 1" }], until: x => x.stopien === 2, message: "success heals" });
        t.equal(s3.licznik, 0, "counter from zero");
      });

      await t.step(`${W}: kalendarzyk from the Stan panel agrees with the live counter`, async () => {
        const k = await p1.eval(kalendarzyk, { name: "PC Gracz 1" });
        t.assert(k, "kalendarzyk did not open");
        await t.screenshot("Gracz 1", `kalendarzyk-${W}`);
        await p1.eval(zamknijKalendarzyk);
        await p1.eval(zamknijKarte, { name: "PC Gracz 1" });
        t.equal(k.rows.length, 2, "two rows");
        t.assert(/^Gojenie/.test(k.rows[0][0]) && /^Z pomocą medyczną/.test(k.rows[1][0]), "row labels", k.rows);
        t.equal(k.licznik, 0, "counter");
        t.equal(k.medykZwykle, 2, "medic every DO: 2 DO from Znaczny");
        t.equal(k.cialoNajszybciej, 6, "body: 2 Stopnie × 3 DO");
        t.assert(/^2 DO/.test(k.rows[1][2]), "medic row 'zwykle' cell", k.rows[1]);
        t.assert(k.dni >= 14, "day strip", k);
      });

      if (kobalt) {
        await t.step("WKK: samoleczenie — the charge goes first, a failed test (d20 = 2) adds a Stopień", async () => {
          await t.gm.eval(async () => {
            const { setZranienie } = await import("/modules/neuroshima-2026-overrides/scripts/combat/zranienie.mjs");
            await setZranienie(game.actors.getName("PC Gracz 2"), 1);
          });
          await t.waitFor(p2, stan, { args: [{ name: "PC Gracz 2" }], until: x => x.stopien === 1, message: "medic wounded" });
          const info = await p2.eval(odpocznij, { name: "PC Gracz 2", droga: "sam" });
          t.assert(info.drogi.includes("sam"), "samoleczenie available", info);
          const s = await t.waitFor(t.gm, stan, { args: [{ name: "PC Gracz 2" }], until: x => x.karta, message: "samoleczenie card" });
          t.equal(s.ladunki, 3, "charge spent at the DO");
          t.equal(await p2.eval(klik, { messageId: s.karta, uniform: 0.92 }), true, "clicked");
          const s2 = await t.waitFor(t.gm, stan, { args: [{ name: "PC Gracz 2" }], until: x => x.wynik === "porazka", message: "test failed" });
          t.equal(s2.stopien, 2, "failure adds a Stopień");
        });
      }
    }

    await t.step("disease with a daily RO: warning in the player's DO window, disease and death risk in the kalendarzyk", async () => {
      await t.gm.eval(async () => {
        const a = game.actors.getName("PC Gracz 1");
        await game.neuroshima.health.addDisease(a, "popromienna");
        await a.setFlag("neuroshima-2026-overrides", "bezKorzysciDo", game.time.worldTime + 86400);
      });
      await t.waitFor(p1, () => Boolean(game.actors.getName("PC Gracz 1").getFlag("neuroshima-2026-overrides", "bezKorzysciDo")), { message: "flag on the player's client" });
      const okno = await p1.eval(odpocznij, { name: "PC Gracz 1", anuluj: true });
      t.equal(okno.choroba, true, "sick-day note in the DO window");
      const k = await p1.eval(kalendarzyk, { name: "PC Gracz 1" });
      await t.screenshot("Gracz 1", "kalendarzyk-choroba");
      await p1.eval(zamknijKalendarzyk);
      await p1.eval(zamknijKarte, { name: "PC Gracz 1" });
      t.assert(/Choroba popromienna/.test(k.choroba ?? "") && /ST 20/.test(k.choroba) && /już bez korzyści/.test(k.choroba), "disease line", k);
      t.assert(/Ryzyko śmierci/.test(k.smierc ?? ""), "death-risk line", k);
    });

    await t.step("GM: Kobalt back on (world default)", async () => {
      await t.gm.eval(() => game.settings.set("neuroshima-2026-overrides", "kobaltEnabled", true));
      await new Promise(r => setTimeout(r, 1000));
    });
  }
};
