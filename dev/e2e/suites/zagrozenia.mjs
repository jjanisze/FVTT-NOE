/**
 * Suite — Zagrożenia środowiska (PLAN_m1_walka.md E7, §7.7). The GM's run, done by the agent: the GM
 * selects tokens and uses the "Zagrożenia" tool in the token controls; players react in their own
 * clients (Fuks on the GM's roll, the "w cieple" box in their own DO window, the card RO, "Złap oddech").
 *
 *  - Przemarznięcie, −10 °C for 2 h: PC Gracz 2 warmly dressed (no roll), PC Gracz 1 fails hour 1
 *    (d20 2 vs ST 15) and passes hour 2 → one level `przemarznie`.
 *  - Gracz 1 spends a Fuks on the GM's failed roll: the level is undone (rerolls.mjs no longer needs to
 *    edit the GM's message — the mark goes on the player's actor) and the bar does not come back.
 *  - Długi odpoczynek "w cieple": all Przemarznięcie levels at once, then the usual −1 (Kac).
 *  - Doba bez snu: RO ST 20, 18 + 1 fails → `bezsennosc` (the fixture PC has +1 on CON saves).
 *  - Uduszenie in a real combat: holding breath; damage → card → Gracz 1's RO ST 10 fails → suffocating;
 *    the end of PC Gracz 1's turn → +1 `uduszenie`; Gracz 1's "Złap oddech" in the Stan panel removes
 *    every suffocation level and leaves Bezsenność.
 */

/* Functions below run in the browser (serialised): no closures over this file. */

function stan({ name }) {
  const MOD = "neuroshima-2026-overrides";
  const a = game.actors.getName(name);
  return {
    wyczerpanie: (a.getFlag(MOD, "exhaustionSources") ?? []).map(e => e.source),
    poziom: a._source.system.attributes.exhaustion,
    oddech: game.neuroshima.zagrozenia.stanOddechu(a),
    fuksy: a.getFlag(MOD, "fuksy") ?? 0,
    modKon: a.system.abilities.con.mod,
    przerzucone: a.getFlag(MOD, "przerzucone") ?? []
  };
}

/** GM: clean start for both PCs; Gracz 1 gets one Fuks. */
async function przygotuj() {
  const MOD = "neuroshima-2026-overrides";
  for (const name of ["PC Gracz 1", "PC Gracz 2"]) {
    const a = game.actors.getName(name);
    for (const e of a.effects.filter(e => e.statuses.has("suffocation"))) await e.delete();
    await a.update({
      "system.attributes.hp.max": 12, "system.attributes.hp.value": 12, "system.attributes.exhaustion": 0,
      [`flags.${MOD}.-=exhaustionSources`]: null, [`flags.${MOD}.-=przerzucone`]: null,
      [`flags.${MOD}.fuksy`]: name === "PC Gracz 1" ? 1 : 0
    });
  }
  return true;
}

/**
 * GM: select the named tokens, press the "Zagrożenia" tool in the token controls, pick `akcja`, and —
 * for the cold — fill the window. `d20` — faces the GM's dice will show, in order.
 */
async function narzedzie({ tokeny, akcja, d20 = [], mroz = null, oddech = null }) {
  const twarze = [...d20];
  const orig = CONFIG.Dice.randomUniform;
  CONFIG.Dice.randomUniform = () => (twarze.length ? (20.5 - twarze.shift()) / 20 : 0.5);
  const czekaj = async (fn, n = 60) => {
    for (let i = 0; i < n; i++) {
      const v = fn();
      if (v) return v;
      await new Promise(r => setTimeout(r, 100));
    }
    return null;
  };
  const okno = sel => [...foundry.applications.instances.values()].find(a => a.rendered && a.element?.querySelector(sel));
  // Ślad kroków na `window` — gdyby eval znów zawisł, czyta się go z zachowanej strony MG.
  window.__e2eZagrozenia = [];
  const L = x => window.__e2eZagrozenia.push([Date.now(), x]);
  try {
    canvas.tokens.releaseAll();
    for (const name of tokeny) canvas.scene.tokens.find(t => t.name === name)?.object?.control({ releaseOthers: false });
    L("controlled");
    // Ograniczone w czasie: przełączenie kontrolki przerysowuje pasek i aktywuje warstwę.
    await Promise.race([ui.controls.activate({ control: "tokens" }), new Promise(r => setTimeout(r, 2000))]);
    L("controls");
    const tool = await czekaj(() => document.querySelector('#scene-controls [data-tool="neuroshimaZagrozenia"]'));
    L(`tool ${Boolean(tool)}`);
    if (!tool) return { tool: false };
    tool.click();
    const wybor = await czekaj(() => okno(`[data-action="${akcja}"]`));
    L(`wybor ${Boolean(wybor)}`);
    if (!wybor) return { tool: true, okno: false };
    wybor.element.querySelector(`[data-action="${akcja}"]`).click();
    if (mroz) {
      const w = await czekaj(() => okno('[name="temp"]'));
      const f = w.element.querySelector("form") ?? w.element;
      f.querySelector('[name="temp"]').value = String(mroz.tempC);
      f.querySelector('[name="godziny"]').value = String(mroz.godziny);
      // Wiersze idą w kolejności `canvas.tokens.controlled`, nie zaznaczania — po nazwie.
      for (const tr of f.querySelectorAll("tbody tr")) {
        if (mroz.cieplo?.includes(tr.firstElementChild.textContent.trim())) tr.querySelector('[name^="cieplo-"]').checked = true;
      }
      w.element.querySelector('[data-action="ok"]').click();
    }
    if (oddech) {
      // Pierwsze okno też ma przycisk „oddech” i jeszcze się zamyka — drugie poznać po „wdech”.
      const w = await czekaj(() => okno('[data-action="wdech"]'));
      w.element.querySelector(`[data-action="${oddech}"]`).click();
    }
    L("wypelnione");
    await new Promise(r => setTimeout(r, 2500));
    L("koniec");
    return { tool: true, okno: true };
  } finally {
    CONFIG.Dice.randomUniform = orig;
    canvas.tokens.releaseAll();
  }
}

/** GM: the hazard roll messages of an actor, oldest first: `{ id, total, st }`. */
function rzutyZagrozen({ name }) {
  const MOD = "neuroshima-2026-overrides";
  const uuid = game.actors.getName(name).uuid;
  return game.messages.contents
    .filter(m => m.getFlag(MOD, "zagrozenieRzut")?.actorUuid === uuid)
    .map(m => ({ id: m.id, total: m.rolls?.[0]?.total ?? null, st: m.getFlag(MOD, "zagrozenieRzut").st }));
}

/** Player: Fuks on a message in their own chat — confirm, the d20 fixed. */
async function fuks({ messageId, d20 }) {
  const orig = CONFIG.Dice.randomUniform;
  CONFIG.Dice.randomUniform = () => (20.5 - d20) / 20;
  try {
    let btn = null;
    for (let i = 0; i < 40 && !btn; i++) {
      await new Promise(r => setTimeout(r, 150));
      btn = ui.chat.element?.querySelector(`[data-message-id="${messageId}"] .fuks-btn`);
    }
    if (!btn) return { przycisk: false };
    btn.click();
    let tak = null;
    for (let i = 0; i < 40 && !tak; i++) {
      await new Promise(r => setTimeout(r, 150));
      tak = document.querySelector('.dialog .dialog-button.yes, .dialog button[data-button="yes"]');
    }
    if (!tak) return { przycisk: true, potwierdzenie: false };
    tak.click();
    await new Promise(r => setTimeout(r, 2000));
    const pasek = Boolean(ui.chat.element?.querySelector(`[data-message-id="${messageId}"] .neuroshima-reroll-bar`));
    return { przycisk: true, potwierdzenie: true, pasek };
  } finally {
    CONFIG.Dice.randomUniform = orig;
  }
}

/** Player: Długi odpoczynek with the "w cieple" box ticked (if it is there). */
async function odpocznijWCieple({ name }) {
  const a = game.actors.getName(name);
  const odpoczynek = a.longRest();
  let app = null;
  for (let i = 0; i < 80 && !app; i++) {
    await new Promise(r => setTimeout(r, 100));
    app = [...foundry.applications.instances.values()]
      .find(x => x.rendered && (x.actor ?? x.document) === a && x.element?.querySelector('button[name="rest"]'));
  }
  if (!app) return { okno: false };
  const box = app.element.querySelector('[name="neuroWCieple"]');
  if (box) box.checked = true;
  app.element.querySelector('button[name="rest"]').click();
  await odpoczynek;
  await new Promise(r => setTimeout(r, 1500));
  return { okno: true, pole: Boolean(box) };
}

/** GM: a combat with both PCs, initiative rolled, started. */
async function walka() {
  for (const c of [...game.combats]) await c.delete();
  const tokens = ["PC Gracz 1", "PC Gracz 2"].map(n => canvas.scene.tokens.find(t => t.name === n));
  const combat = await Combat.implementation.create({ scene: canvas.scene.id, active: true });
  await combat.createEmbeddedDocuments("Combatant", tokens.map(t => ({ tokenId: t.id, sceneId: canvas.scene.id, actorId: t.actorId })));
  await combat.rollAll();
  await combat.startCombat();
  return combat.id;
}

/** GM: end PC Gracz 1's turn (put the combat on it, then advance). */
async function koniecTury({ name }) {
  const combat = game.combat;
  const idx = combat.turns.findIndex(c => c.actor?.name === name);
  await combat.update({ turn: idx });
  await new Promise(r => setTimeout(r, 300));
  await combat.nextTurn();
  await new Promise(r => setTimeout(r, 1500));
  return combat.turn;
}

/** Player: the hazard card's RO in their own chat; the d20 fixed; the roll dialog's "normal". */
async function kartaOddechu({ d20 }) {
  const orig = CONFIG.Dice.randomUniform;
  CONFIG.Dice.randomUniform = () => (20.5 - d20) / 20;
  try {
    let btn = null;
    for (let i = 0; i < 40 && !btn; i++) {
      await new Promise(r => setTimeout(r, 150));
      btn = [...(ui.chat.element?.querySelectorAll("[data-oddech]") ?? [])].at(-1);
    }
    if (!btn) return false;
    btn.click();
    await new Promise(r => setTimeout(r, 2000));
    return true;
  } finally {
    CONFIG.Dice.randomUniform = orig;
  }
}

/** Player: "Złap oddech" in the Stan panel of their own sheet. */
async function zlapOddech({ name }) {
  const a = game.actors.getName(name);
  await a.sheet.render(true);
  let row = null;
  for (let i = 0; i < 40 && !row; i++) {
    await new Promise(r => setTimeout(r, 100));
    row = a.sheet.element?.querySelector(".neuro-stan-oddech");
  }
  const opis = row?.textContent.replace(/\s+/g, " ").trim() ?? null;
  row?.querySelector(".neuro-oddech-btn")?.click();
  await new Promise(r => setTimeout(r, 1500));
  await a.sheet.close();
  return { wiersz: opis };
}

export default {
  name: "zagrozenia",
  clients: ["gm", "Gracz 1"],

  async run(t) {
    const p1 = t.client("Gracz 1");
    await t.waitFor(p1, () => Boolean(game.user.character && ui.chat?.element), { message: "the player's client to see the fixture" });
    await t.step("GM: clean PCs; Gracz 1 has one Fuks", async () => {
      t.equal(await t.gm.eval(przygotuj), true, "prepared");
    });

    await t.step("Przemarznięcie −10 °C, 2 h from the token tool: PC Gracz 2 warmly dressed; PC Gracz 1 fails hour 1", async () => {
      const r = await t.gm.eval(narzedzie, {
        tokeny: ["PC Gracz 1", "PC Gracz 2"], akcja: "mroz", d20: [2, 19],
        mroz: { tempC: -10, godziny: 2, cieplo: ["PC Gracz 2"] }
      });
      t.assert(r.tool && r.okno, "tool button and window", r);
      const s1 = await t.gm.eval(stan, { name: "PC Gracz 1" });
      const s2 = await t.gm.eval(stan, { name: "PC Gracz 2" });
      t.equal(s1.wyczerpanie.join(), "przemarznie", "PC Gracz 1: one level");
      t.equal(s2.wyczerpanie.length, 0, "PC Gracz 2: warm, no roll");
      const rzuty = await t.gm.eval(rzutyZagrozen, { name: "PC Gracz 1" });
      t.equal(rzuty.map(x => x.st).join(), "15,15", "ST 5 + 10");
      t.equal(await t.gm.eval(rzutyZagrozen, { name: "PC Gracz 2" }).then(x => x.length), 0, "no roll for the warm one");
    });

    await t.step("Gracz 1 spends a Fuks on the GM's failed roll → the level is undone, the bar does not come back", async () => {
      const [pierwszy] = await t.gm.eval(rzutyZagrozen, { name: "PC Gracz 1" });
      const r = await p1.eval(fuks, { messageId: pierwszy.id, d20: 19 });
      t.assert(r.przycisk && r.potwierdzenie, "Fuks button and confirmation", r);
      const s = await t.waitFor(t.gm, stan, { args: [{ name: "PC Gracz 1" }], until: x => x.wyczerpanie.length === 0, message: "level undone" });
      t.equal(s.fuksy, 0, "Fuks spent");
      t.assert(s.przerzucone.includes(pierwszy.id), "reroll mark on the player's actor (the GM's message is not theirs to edit)", s);
      t.equal(r.pasek, false, "no reroll bar after the reroll");
    });

    await t.step("Długi odpoczynek w cieple: all Przemarznięcie at once, then −1 (Kac)", async () => {
      await t.gm.eval(async () => {
        const { addExhaustion } = await import("/modules/neuroshima-2026-overrides/scripts/config/exhaustion.mjs");
        const a = game.actors.getName("PC Gracz 1");
        for (const k of ["przemarznie", "przemarznie", "kac"]) await addExhaustion(a, k, { chat: false });
      });
      await t.waitFor(p1, stan, { args: [{ name: "PC Gracz 1" }], until: x => x.poziom === 3, message: "three levels" });
      const r = await p1.eval(odpocznijWCieple, { name: "PC Gracz 1" });
      t.assert(r.okno && r.pole, "the 'w cieple' box in the DO window", r);
      const s = await t.waitFor(t.gm, stan, { args: [{ name: "PC Gracz 1" }], until: x => x.poziom === 0, message: "all gone" });
      t.equal(s.wyczerpanie.length, 0, "no sources left");
    });

    await t.step("Doba bez snu: RO ST 20, an 18 (+1) fails → Bezsenność", async () => {
      const r = await t.gm.eval(narzedzie, { tokeny: ["PC Gracz 1"], akcja: "sen", d20: [18] });
      t.assert(r.tool && r.okno, "tool", r);
      const s = await t.gm.eval(stan, { name: "PC Gracz 1" });
      t.equal(s.wyczerpanie.join(), "bezsennosc", "Bezsenność");
    });

    await t.step("Uduszenie in combat: holding breath; damage → card → failed RO ST 10 → suffocating", async () => {
      await t.gm.eval(walka);
      const r = await t.gm.eval(narzedzie, { tokeny: ["PC Gracz 1"], akcja: "oddech", oddech: "oddech" });
      t.assert(r.tool && r.okno, "tool", r);
      let s = await t.gm.eval(stan, { name: "PC Gracz 1" });
      t.equal(s.oddech?.faza, "oddech", "holding breath");
      t.equal(s.oddech?.tury, (1 + s.modKon) * 10, `1 + mod. KON (${s.modKon}) minutes, 6 s turns`);
      await t.gm.eval(async () => {
        await game.actors.getName("PC Gracz 1").applyDamage([{ value: 2, type: "bludgeoning" }]);
        await new Promise(r => setTimeout(r, 1000));
      });
      t.equal(await p1.eval(kartaOddechu, { d20: 6 }), true, "card RO clicked by the owner");
      s = await t.waitFor(t.gm, stan, { args: [{ name: "PC Gracz 1" }], until: x => x.oddech?.faza === "dusi", message: "suffocating" });
      t.equal(s.wyczerpanie.join(), "bezsennosc", "no level yet");
    });

    await t.step("end of PC Gracz 1's turn → +1 Uduszenie; Gracz 1's 'Złap oddech' clears every suffocation level", async () => {
      await t.gm.eval(koniecTury, { name: "PC Gracz 1" });
      let s = await t.waitFor(t.gm, stan, { args: [{ name: "PC Gracz 1" }], until: x => x.wyczerpanie.includes("uduszenie"), message: "a level at the end of the turn" });
      t.equal(s.wyczerpanie.join(), "bezsennosc,uduszenie", "sources");
      const r = await p1.eval(zlapOddech, { name: "PC Gracz 1" });
      t.assert(/Dusi się/.test(r.wiersz ?? ""), "Stan panel row", r);
      s = await t.waitFor(t.gm, stan, { args: [{ name: "PC Gracz 1" }], until: x => !x.oddech && x.poziom === 1, message: "breathing again" });
      t.equal(s.wyczerpanie.join(), "bezsennosc", "Bezsenność stays");
      await t.gm.eval(async () => { for (const c of [...game.combats]) await c.delete(); await new Promise(r => setTimeout(r, 1500)); });
    });
  }
};
