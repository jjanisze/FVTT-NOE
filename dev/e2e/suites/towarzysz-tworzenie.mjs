/**
 * Suite — Tworzenie towarzysza (PLAN_m3_towarzysze.md E4, §7.8). GM and Gracz 2.
 *
 *  - PC Gracz 2 is a Cwaniak 3 with Moja prawa ręka; PC Gracz 1 a Zwiadowca 3 with Oswajanie zwierząt; both
 *    in the primary party.
 *  - GM: [Nowy towarzysz] on Gracz 2's companion bar → "Lucky", a human Prawa ręka: owned by Gracz 2, folder
 *    Towarzysze, party member, PB +2 effect, full PW.
 *  - GM: [Nowy towarzysz] on Gracz 1's bar → a mutated mammal "Kieł" from the `towarzysze` template: TT and
 *    PW from the owner, Współpraca with its automation, party member.
 *  - Gracz 2 in his own login walks Lucky's creator: Cechy (24 points), Pochodzenie and the Towarzysz class
 *    through dnd5e's AdvancementManager; the class follows the owner to level 3.
 *  - U23: Gracz 2 drops the Towarzysz class on his own PC — confirmation, "No" leaves no class.
 *  - U5: the GM raises the owner's Cwaniak to 4 → Lucky's class 4, PW 20/20.
 *  - D31: the GM's [Odłącz] on Kieł removes the companion flag.
 */

/* Functions below run in the browser (serialised): no closures over this file. */

/** GM: owners with classes and abilities, a primary party. */
async function przygotuj() {
  const MOD = "neuroshima-2026-overrides";
  for (const c of [...game.combats]) await c.delete();
  const klasy = await game.packs.get(`${MOD}.klasy`).getDocuments();
  const zdolnosci = await game.packs.get(`${MOD}.zdolnosci-klasowe`).getDocuments();
  const daj = async (pcName, klasa, zdolnosc, poziom = 3) => {
    const pc = game.actors.getName(pcName);
    const cls = game.items.fromCompendium(klasy.find(i => i.type === "class" && i.system.identifier === klasa));
    cls.system.levels = poziom;
    await pc.createEmbeddedDocuments("Item", [cls, game.items.fromCompendium(zdolnosci.find(i => i.getFlag(MOD, "abilityId") === zdolnosc))]);
    await pc.update({ "system.attributes.hp.value": pc.system.attributes.hp.max });
    return pc;
  };
  const p1 = await daj("PC Gracz 1", "zwiadowca", "oswajanie-zwierzat");
  const p2 = await daj("PC Gracz 2", "cwaniak", "moja-prawa-reka");
  const party = await Actor.implementation.create({ name: "Agent · Drużyna", type: "group", flags: { [MOD]: { fixture: "skirmish" } } });
  await party.update({ "system.members": [p1, p2].map(a => ({ actor: a.id })) });
  await game.settings.set("dnd5e", "primaryParty", { actor: party.id });
  return { klasaTowarzysz: klasy.some(i => i.system.identifier === "towarzysz"), szablony: game.packs.get(`${MOD}.towarzysze`)?.index.size ?? 0 };
}

/** GM: [Nowy towarzysz] on an owner's bar; fill the window (`rodzaj` option value, name) and create. */
async function nowy({ owner, rodzaj, nazwa }) {
  const MOD = "neuroshima-2026-overrides";
  const pc = game.actors.getName(owner);
  await pc.sheet.render(true);
  const btn = await window.__e2e.until(() => pc.sheet.element?.querySelector(".neuro-towarzysz-nowy"), { message: "[Nowy towarzysz]" });
  btn.click();
  const app = await window.__e2e.until(() => [...foundry.applications.instances.values()]
    .find(x => x.rendered && x.options?.window?.title?.startsWith("Nowy towarzysz")), { message: "the window" });
  const form = app.element.querySelector("form") ?? app.element;
  if (rodzaj) form.querySelector('[name="rodzaj"]').value = rodzaj;
  form.querySelector('[name="nazwa"]').value = nazwa;
  app.element.querySelector('button[data-action="ok"]').click();
  const actor = await window.__e2e.until(() => game.actors.getName(nazwa), { message: `${nazwa} created` });
  await window.__e2e.quiet({ idleMs: 600 });
  await pc.sheet.close();
  for (const a of foundry.applications.instances.values()) if (a.document === actor) await a.close();
  const t = actor.getFlag(MOD, "towarzysz");
  const gracz = game.users.getName(owner.replace("PC ", ""));
  return {
    rodzaj: t?.rodzaj, klasa: t?.klasa, wlasciciel: t?.wlasciciel === pc.uuid, typ: actor.type,
    folder: actor.folder?.name ?? null, owner: actor.testUserPermission(gracz, "OWNER"),
    party: game.actors.party.system.members.some(m => m.actor === actor),
    pbEfekt: Boolean(actor.effects.get("neuroTowarzyszPB")), prof: actor.system.attributes.prof,
    hp: [actor.system.attributes.hp.value, actor.system.attributes.hp.max],
    tt: actor.system.attributes.ac.value, kw: [actor.system.attributes.hd?.max, actor.system.attributes.hd?.denomination],
    wspolpraca: actor.items.some(i => i.getFlag(MOD, "bestiary")?.automation?.kind === "packTactics"),
    linked: actor.prototypeToken.actorLink
  };
}

/** Player: Lucky's creator — the three steps in order. */
async function kreator({ nazwa }) {
  const actor = game.actors.getName(nazwa);
  await actor.sheet.render(true);
  const krok = async id => {
    const b = await window.__e2e.until(() => actor.sheet.element?.querySelector(`.neuro-kreator-krok[data-krok="${id}"]:not([disabled])`),
      { message: `creator step ${id}` });
    b.click();
  };
  const okno = async prefix => window.__e2e.until(() => [...foundry.applications.instances.values()]
    .find(x => x.rendered && x.options?.window?.title?.startsWith(prefix)), { message: `window ${prefix}` });
  const przedTem = [...(actor.sheet.element?.querySelectorAll(".neuro-kreator-krok") ?? [])].map(b => b.dataset.krok + (b.disabled ? "!" : ""));

  // 1. Cechy — 24 points (Evie's spread).
  await krok("cechy");
  const cechy = await okno("Cechy");
  const vals = { str: 8, dex: 15, con: 12, int: 8, wis: 15, cha: 10 };
  for (const [k, v] of Object.entries(vals)) {
    const input = cechy.element.querySelector(`[name="${k}"]`);
    input.value = v;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }
  const koszt = cechy.element.querySelector(".neuro-kreator-koszt")?.textContent.trim();
  cechy.element.querySelector('button[data-action="ok"]').click();
  await window.__e2e.until(() => actor.getFlag("neuroshima-2026-overrides", "kreator")?.cechy, { message: "attributes saved" });

  // 2. Pochodzenie — the first one in the list, then dnd5e's manager.
  await krok("pochodzenie");
  const poch = await okno("Pochodzenie");
  const pochodzenie = poch.element.querySelector('[name="id"] option')?.textContent.trim();
  poch.element.querySelector('button[data-action="ok"]').click();
  return { przedTem, koszt, pochodzenie };
}

/**
 * Player: walk the open AdvancementManager to the end (the `postac` suite's walker). `picks[stepTitle]` —
 * labels or item names to choose; otherwise the first options.
 */
async function advance({ picks = {} }) {
  const mgr = await __e2e.until(() => [...foundry.applications.instances.values()]
    .find(x => x.rendered && x.constructor.name === "AdvancementManager"), { message: "the advancement window" });
  const seen = [];
  for (let i = 0; i < 25; i++) {
    await __e2e.until(() => mgr.step?.flow?.form?.isConnected, { timeoutMs: 8000, message: "the step's form" });
    await __e2e.sleep(150);
    const flow = mgr.step?.flow;
    const type = flow?.advancement?.constructor?.name ?? "?";
    const title = flow?.title ?? "?";
    seen.push(`${type.replace("Advancement", "")}:${title}`);
    const want = picks[title] ?? [];
    const el = mgr.element;
    if (type === "TraitAdvancement") {
      for (let k = 0; k < 10; k++) {
        const sel = mgr.element.querySelector('select[name="added"]');
        const options = sel ? [...sel.options].filter(o => o.value && !o.disabled) : [];
        if (!options.length) break;
        const opt = options.find(o => want.includes(o.textContent.trim())) ?? options[0];
        sel.value = opt.value;
        sel.dispatchEvent(new Event("change", { bubbles: true }));
        await __e2e.sleep(300);
      }
    } else if (type === "ItemChoiceAdvancement") {
      const count = flow.advancement.configuration.choices?.[flow.level]?.count ?? 1;
      const rows = [...el.querySelectorAll("[data-uuid]")].filter(r => r.querySelector("dnd5e-checkbox"));
      const ordered = [...rows.filter(r => want.some(w => r.innerText.includes(w))), ...rows];
      const chosen = new Set();
      for (const row of ordered) {
        if (chosen.size >= count) break;
        if (chosen.has(row)) continue;
        const box = row.querySelector("dnd5e-checkbox");
        box.checked = true;
        box.dispatchEvent(new Event("change", { bubbles: true }));
        chosen.add(row);
        await __e2e.sleep(250);
      }
    }
    const btn = mgr.element.querySelector('button[data-action="complete"]') ?? mgr.element.querySelector('button[data-action="next"]');
    if (!btn) throw new Error(`no Next/Complete on step ${type}:${title}`);
    const done = btn.dataset.action === "complete";
    btn.click();
    if (done) {
      await __e2e.until(() => !mgr.rendered, { timeoutMs: 15_000, message: "the manager to close" });
      return seen;
    }
    await __e2e.until(() => mgr.step?.flow && mgr.step.flow !== flow, { timeoutMs: 8000, message: `the step after ${title}` });
    await __e2e.sleep(200);
  }
  throw new Error(`advancement did not finish: ${seen.join(" → ")}`);
}

/** Player: step 3 of the creator — the Towarzysz class (opens the manager). */
async function krokKlasy({ nazwa }) {
  const actor = game.actors.getName(nazwa);
  const b = await window.__e2e.until(() => actor.sheet.element?.querySelector('.neuro-kreator-krok[data-krok="klasa"]:not([disabled])'),
    { message: "creator step klasa" });
  b.click();
  return true;
}

/** Anyone: what the companion carries now. */
async function stan({ nazwa }) {
  const MOD = "neuroshima-2026-overrides";
  const actor = game.actors.getName(nazwa);
  await window.__e2e.quiet({ idleMs: 600 });
  const cls = actor.items.find(i => i.type === "class" && i.system.identifier === "towarzysz");
  return {
    kreator: [...(actor.sheet?.element?.querySelectorAll(".neuro-kreator-krok") ?? [])].length,
    poziom: cls?.system.levels ?? null,
    hp: [actor.system.attributes.hp.value, actor.system.attributes.hp.max],
    // Character: HitDice instance (classes); NPC: plain max + denomination.
    kw: `${actor.system.attributes.hd?.max}d${actor.system.attributes.hd?.denomination ?? actor.system.attributes.hd?.largestFace}`,
    prof: actor.system.attributes.prof,
    tlo: actor.itemTypes.background.map(b => b.name),
    ro: Object.entries(actor.system.abilities).filter(([, a]) => a.proficient).map(([k]) => k),
    umiejetnosci: Object.entries(actor.system.skills).filter(([, s]) => s.value >= 1).map(([k]) => k),
    narzedzia: Object.keys(actor.system.tools ?? {}).filter(k => actor.system.tools[k].value >= 1),
    sztuczki: actor.items.filter(i => i.getFlag(MOD, "sztuczka") || i.getFlag(MOD, "sztuczkaKey")).map(i => i.name),
    cechy: Object.fromEntries(Object.entries(actor.system.abilities).map(([k, a]) => [k, a.value]))
  };
}

/** Player: drop the Towarzysz class on their own PC; answer the confirmation with `odpowiedz`. */
async function upuscKlase({ odpowiedz }) {
  const MOD = "neuroshima-2026-overrides";
  const pc = game.user.character;
  await pc.sheet.render(true);
  await __e2e.until(() => pc.sheet.rendered && pc.sheet.element, { message: "the sheet" });
  const index = await game.packs.get(`${MOD}.klasy`).getIndex({ fields: ["system.identifier"] });
  const hit = index.find(e => e.system?.identifier === "towarzysz");
  const dt = new DataTransfer();
  dt.setData("text/plain", JSON.stringify({ type: "Item", uuid: hit.uuid }));
  const target = pc.sheet.element.querySelector(".window-content") ?? pc.sheet.element;
  const r = target.getBoundingClientRect();
  for (const type of ["dragenter", "dragover", "drop"]) {
    target.dispatchEvent(new DragEvent(type, { dataTransfer: dt, bubbles: true, cancelable: true, clientX: r.x + 60, clientY: r.y + 60 }));
  }
  const dlg = await __e2e.until(() => [...foundry.applications.instances.values()]
    .find(x => x.rendered && x.options?.window?.title === "Klasa towarzysza"), { message: "the U23 confirmation" });
  dlg.element.querySelector(`button[data-action="${odpowiedz}"]`).click();
  await __e2e.sleep(800);
  const manager = [...foundry.applications.instances.values()].find(x => x.rendered && x.constructor.name === "AdvancementManager");
  if (manager) await manager.close();
  await pc.sheet.close();
  return { klasa: pc.items.some(i => i.type === "class" && i.system.identifier === "towarzysz"), manager: Boolean(manager) };
}

/** GM: the owner's class one level up. */
async function awans({ owner, klasa, poziom }) {
  const pc = game.actors.getName(owner);
  const cls = pc.items.find(i => i.type === "class" && i.system.identifier === klasa);
  await cls.update({ "system.levels": poziom });
  await window.__e2e.quiet({ idleMs: 800 });
  return pc.classes[klasa]?.system.levels;
}

/** GM: [Odłącz] on a companion's badge, confirmed. */
async function odlacz({ nazwa }) {
  const MOD = "neuroshima-2026-overrides";
  const actor = game.actors.getName(nazwa);
  await actor.sheet.render(true);
  const b = await window.__e2e.until(() => actor.sheet.element?.querySelector(".neuro-towarzysz-odlacz"), { message: "[Odłącz]" });
  b.click();
  const dlg = await window.__e2e.until(() => [...foundry.applications.instances.values()]
    .find(x => x.rendered && x.options?.window?.title?.startsWith("Odłącz")), { message: "the confirmation" });
  dlg.element.querySelector('button[data-action="yes"]').click();
  await window.__e2e.until(() => !actor.getFlag(MOD, "towarzysz"), { message: "flag removed" });
  await actor.sheet.close();
  return { flag: actor.getFlag(MOD, "towarzysz") ?? null };
}

export default {
  name: "towarzysz-tworzenie",
  clients: ["gm", "Gracz 2"],

  async run(t) {
    const p2 = t.client("Gracz 2");
    await t.waitFor(p2, () => Boolean(game.user.character && ui.chat?.element), { message: "the player's client to see the fixture" });

    await t.step("GM: Cwaniak 3 with Moja prawa ręka, Zwiadowca 3 with Oswajanie zwierząt, primary party", async () => {
      const r = await t.gm.eval(przygotuj);
      t.equal(r.klasaTowarzysz, true, "Towarzysz class in the klasy pack");
      t.equal(r.szablony, 6, "templates in the towarzysze pack (four animals, two drones)");
    });

    await t.step("GM [Nowy towarzysz] → Lucky, Prawa ręka: Gracz 2's, Towarzysze folder, party, PB +2, full PW", async () => {
      const r = await t.gm.eval(nowy, { owner: "PC Gracz 2", nazwa: "Agent · Lucky — tworzenie" });
      t.equal(r.rodzaj, "prawa-reka", "kind");
      t.equal(r.klasa, "cwaniak", "owner's class for the level");
      t.equal(r.typ, "character", "actor type");
      t.equal(r.folder, "Towarzysze", "folder");
      t.equal(r.owner, true, "owned by Gracz 2");
      t.equal(r.party, true, "party member (D19)");
      t.equal(r.pbEfekt, true, "PB effect");
      t.equal(r.prof, 2, "PB");
      t.equal(r.hp.join("/"), "15/15", "PW");
      t.equal(r.linked, true, "linked token");
    });

    await t.step("GM [Nowy towarzysz] → Kieł, mutated mammal from the template: TT and PW from the owner, Współpraca", async () => {
      const r = await t.gm.eval(nowy, { owner: "PC Gracz 1", rodzaj: "zmutowany-ssak", nazwa: "Agent · Kieł — tworzenie" });
      t.equal(r.rodzaj, "zmutowany-ssak", "kind");
      t.equal(r.typ, "npc", "actor type");
      t.equal(r.tt, 13, "TT = 11 + owner's PB 2");
      t.equal(r.hp.join("/"), "19/19", "PW = 9 + 10 × owner's WIS mod 1");
      t.equal(r.kw.join("d"), "1d10", "KW = k10 × ½ Zwiadowca level, down, min 1");
      t.equal(r.wspolpraca, true, "Współpraca with its automation");
      t.equal(r.party, true, "party member");
    });

    await t.step("Gracz 2 walks Lucky's creator: Cechy (24 pkt), Pochodzenie, the Towarzysz class — levels follow the owner", async () => {
      await t.waitFor(p2, () => Boolean(game.actors.getName("Agent · Lucky — tworzenie")?.isOwner), { message: "Gracz 2 to own Lucky" });
      const k = await p2.eval(kreator, { nazwa: "Agent · Lucky — tworzenie" });
      t.equal(k.przedTem.join(","), "cechy,pochodzenie!,klasa!", "steps unlock in order");
      t.assert(/24\/24/.test(k.koszt ?? ""), "point counter", k);
      const pochodzenieKroki = await p2.eval(advance, {});
      t.assert(pochodzenieKroki.length >= 1, "Pochodzenie went through the manager", pochodzenieKroki);
      await p2.eval(krokKlasy, { nazwa: "Agent · Lucky — tworzenie" });
      const kroki = await p2.eval(advance, {});
      t.equal(kroki.join(" → "),
        "Trait:Rzuty obronne → Trait:Umiejętności lub zestawy narzędzi → ItemChoice:Sztuczka (której wymagania spełnia)", "class steps");
      const s = await p2.eval(stan, { nazwa: "Agent · Lucky — tworzenie" });
      t.equal(s.kreator, 0, "creator pills gone");
      t.equal(s.poziom, 3, "Towarzysz level = owner's Cwaniak level");
      t.equal(s.kw, "3d6", "KW 3k6");
      t.equal(s.prof, 2, "PB stays +2");
      t.equal(s.hp.join("/"), "15/15", "PW");
      t.equal(s.ro.length, 2, "two save proficiencies");
      t.equal(s.umiejetnosci.length + s.narzedzia.length, 2, "two skills or tool sets");
      t.equal(s.tlo.length, 1, "a Pochodzenie");
      t.equal(s.cechy.dex >= 15 && s.cechy.wis >= 15, true, "attributes from the point buy (+ origin)");
      await t.screenshot("Gracz 2", "kreator — gotowa Prawa ręka");
    });

    await t.step("U23: the Towarzysz class dropped on Gracz 2's own PC asks first; 'No' adds nothing", async () => {
      const r = await p2.eval(upuscKlase, { odpowiedz: "no" });
      t.equal(r.klasa, false, "class on the PC after 'No'");
      t.equal(r.manager, false, "advancement window after 'No'");
    });

    await t.step("U5: the owner's Cwaniak 3 → 4 → Lucky's class 4, PW 20/20", async () => {
      t.equal(await t.gm.eval(awans, { owner: "PC Gracz 2", klasa: "cwaniak", poziom: 4 }), 4, "owner's level");
      const s = await t.gm.eval(stan, { nazwa: "Agent · Lucky — tworzenie" });
      t.equal(s.poziom, 4, "Towarzysz level");
      t.equal(s.hp.join("/"), "20/20", "PW grew by the max's delta");
      t.equal(s.kw, "4d6", "KW");
    });

    await t.step("D31: the GM's [Odłącz] on Kieł removes the companion flag", async () => {
      const r = await t.gm.eval(odlacz, { nazwa: "Agent · Kieł — tworzenie" });
      t.equal(r.flag, null, "companion flag");
    });
  }
};
