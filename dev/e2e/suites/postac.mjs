/**
 * Suite 2 — Postać od zera (PLAN_agentic_improvements.md §5 D; PLAN_beta.md B6). A player builds a
 * character the way the table does, every step through the real sheet and dnd5e's AdvancementManager:
 *
 *  - the GM creates an empty character owned by the player (players lack ACTOR_CREATE by default);
 *  - the player drags a class from the `klasy` compendium onto the sheet (dragenter → dragover → drop,
 *    as the mouse does — dnd5e reads the drop behaviour from the dragover) and walks the manager:
 *    Kość Wytrzymałości, skill choices, granted features, the class's own pick, scale values;
 *  - then a Pochodzenie (fixed +1/+1 and one of the region's three abilities);
 *  - then the starting Sztuczka (NOE: one Sztuczka or 50 gambli at creation; no advancement).
 *
 * Checks what each step leaves on the actor. Two bugs this suite found on its first run (2026-10-08):
 * a level-1 character started at 8/16 PW — dnd5e's HitPoints advancement added its hit-die value while
 * the module's PW max is flat (actors/pw.mjs) — and at Szybkość 0, dnd5e taking speed from a species
 * NOE does not have (actors/character-defaults.mjs).
 */

const MODULE_ID = "neuroshima-2026-overrides";
const ACTOR = "Nowy BG";

/* Functions below run in the browser (serialised): no closures over this file. */

/** GM: an empty character owned by `player`, tagged so the next fixture reseed removes it. */
async function emptyCharacter({ name, player }) {
  const MOD = "neuroshima-2026-overrides";
  const user = game.users.getName(player);
  for (const a of game.actors.filter(x => x.name === name)) await a.delete();
  const a = await Actor.implementation.create({
    name, type: "character",
    ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE, [user.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER },
    flags: { [MOD]: { fixture: "skirmish" } }
  });
  return { id: a.id, playerCanCreate: user.can("ACTOR_CREATE"), items: a.items.size };
}

/** Player: drag a compendium entry onto the actor's sheet like the mouse does. */
async function dropOnSheet({ name, pack, entry }) {
  const MOD = "neuroshima-2026-overrides";
  const actor = game.actors.getName(name);
  const sheet = actor.sheet;
  if (!sheet.rendered) await sheet.render(true);
  await __e2e.until(() => sheet.rendered && sheet.element, { message: "the sheet" });
  const index = await game.packs.get(`${MOD}.${pack}`).getIndex();
  const hit = index.find(e => e.name === entry);
  if (!hit) throw new Error(`${entry} not in ${pack}`);
  const dt = new DataTransfer();
  dt.setData("text/plain", JSON.stringify({ type: "Item", uuid: hit.uuid }));
  const target = sheet.element.querySelector(".window-content") ?? sheet.element;
  const r = target.getBoundingClientRect();
  for (const type of ["dragenter", "dragover", "drop"]) {
    target.dispatchEvent(new DragEvent(type, { dataTransfer: dt, bubbles: true, cancelable: true, clientX: r.x + 60, clientY: r.y + 60 }));
  }
  const manager = await __e2e.until(() => [...foundry.applications.instances.values()]
    .find(x => x.rendered && x.constructor.name === "AdvancementManager"), { timeoutMs: 4000 }).catch(() => null);
  return { manager: Boolean(manager), steps: manager?.steps.length ?? 0 };
}

/**
 * Player: walk the open AdvancementManager to the end. `picks[stepTitle]` names what to choose in a
 * Trait (skill labels) or ItemChoice (item names) step; otherwise the first options are taken.
 * Returns every step seen as "Type:title".
 */
async function advance({ picks = {} }) {
  const mgr = await __e2e.until(() => [...foundry.applications.instances.values()]
    .find(x => x.rendered && x.constructor.name === "AdvancementManager"), { message: "the advancement window" });
  const seen = [];
  for (let i = 0; i < 25; i++) {
    // The Next button is there before the step's own form has rendered; a click in that gap makes
    // dnd5e submit an undefined form (FormDataExtended → "reading 'hasAttribute'"). No human is
    // that fast — wait for the form.
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
    } else if (type === "HitPointsAdvancement") {
      // Above a first level dnd5e wants a roll or "Take average"; the module's PW are flat anyway (actors/pw.mjs).
      const avg = el.querySelector('dnd5e-checkbox[name="useAverage"]');
      if (avg && !avg.checked) {
        avg.checked = true;
        avg.dispatchEvent(new Event("change", { bubbles: true }));
        await __e2e.sleep(250);
      }
    } else if (type === "SubclassAdvancement") {
      // The profession by name (`picks.Profesja`), as the player drops it on the step.
      const index = await game.packs.get("neuroshima-2026-overrides.profesje").getIndex({ fields: ["system.classIdentifier"] });
      const cls = flow.item ?? flow.advancement.item;
      const own = index.filter(e => e.system?.classIdentifier === cls.system.identifier);
      const hit = own.find(e => e.name === [want].flat()[0]) ?? own[0];
      await flow.advancement.apply(flow.level, { uuid: hit.uuid });
      await flow.render();
      await __e2e.sleep(250);
    }
    const btn = mgr.element.querySelector('button[data-action="complete"]') ?? mgr.element.querySelector('button[data-action="next"]');
    if (!btn) throw new Error(`no Next/Complete on step ${type}:${title}`);
    btn.click();
    // "Complete" is not always the end: a profession's own steps appear only after its Subclass step is applied.
    await __e2e.until(() => !mgr.rendered || (mgr.step?.flow && mgr.step.flow !== flow),
      { timeoutMs: 15_000, message: `the step after ${title}` });
    if (!mgr.rendered) return seen;
    await __e2e.sleep(200);
  }
  throw new Error(`advancement did not finish: ${seen.join(" → ")}`);
}

/** Anyone: what the actor carries now. */
function snapshot({ name }) {
  const MOD = "neuroshima-2026-overrides";
  const a = game.actors.getName(name);
  return {
    classes: a.items.filter(i => i.type === "class").map(i => `${i.system.identifier} ${i.system.levels}`),
    background: a.items.find(i => i.type === "background")?.system.identifier ?? null,
    feats: a.items.filter(i => i.type === "feat").map(i => i.name),
    sztuczki: a.items.filter(i => i.getFlag(MOD, "sztuczka")).map(i => i.name),
    skills: Object.entries(a.system.skills).filter(([, s]) => s.value > 0).map(([k]) => k),
    saves: Object.entries(a.system.abilities).filter(([, s]) => s.proficient).map(([k]) => k).sort(),
    abilities: Object.fromEntries(Object.entries(a.system.abilities).map(([k, v]) => [k, v.value])),
    hp: { value: a.system.attributes.hp.value, max: a.system.attributes.hp.max },
    speed: `${a.system.attributes.movement.speeds.walk} ${a.system.attributes.movement.units}`,
    level: a.system.details.level, statuses: [...a.statuses]
  };
}

/** Player: open dnd5e's level-up manager for the first class, as the sheet's level control does (`advance` walks it). */
function openLevelUp({ name, delta }) {
  const a = game.actors.getName(name);
  const cls = a.items.find(i => i.type === "class" && i.isOriginalClass);
  const mgr = dnd5e.applications.advancement.AdvancementManager.forLevelChange(a, cls.id, delta);
  mgr.render(true);
  return mgr.steps.length;
}

/** Proficiency state the M6 checks read (PLAN_m6 §5.1): skills, tools, weapons, armour, saves. */
function proficiencies({ name }) {
  const a = game.actors.getName(name);
  return {
    skills: Object.fromEntries(Object.entries(a.system.skills).filter(([, s]) => s.value > 0).map(([k, s]) => [k, s.value])),
    tools: Object.fromEntries(Object.entries(a.system.tools ?? {}).filter(([, t]) => t.value > 0).map(([k, t]) => [k, t.value])),
    weapons: [...a.system.traits.weaponProf.value].sort(),
    armor: [...a.system.traits.armorProf.value].sort(),
    saves: Object.entries(a.system.abilities).filter(([, s]) => s.proficient).map(([k]) => k).sort(),
    subclass: a.items.find(i => i.type === "subclass")?.system.identifier ?? null,
    classes: a.items.filter(i => i.type === "class").map(i => `${i.system.identifier} ${i.system.levels}`)
  };
}


/** Anyone: the D1 warnings this user can see (whispered "nic nie przepada po cichu" cards); null while none. */
function warnings({ includes }) {
  const ws = game.messages.filter(m => m.getFlag("neuroshima-2026-overrides", "naruszenie") && m.visible)
    .map(m => m.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
  return ws.some(x => x.includes(includes)) ? ws : null;
}

/** Player: one skill check from the new character, rolled as the sheet would (dialog pressed). */
async function skillCheck({ name, skill }) {
  const a = game.actors.getName(name);
  const before = game.messages.size;
  __e2e.forceD20([12]);
  try {
    const rolling = a.rollSkill({ skill });
    await __e2e.pressRollDialog("normal");
    const rolls = await rolling;
    await __e2e.quiet();
    return { total: rolls?.[0]?.total ?? null, messages: game.messages.size - before };
  } finally {
    __e2e.restoreDice();
  }
}

export default {
  name: "postac",
  clients: ["gm", "Gracz 3"],

  async run(t) {
    const p = t.client("Gracz 3");
    const twardziel = { saves: null };

    await t.step("GM: an empty character owned by Gracz 3 (players cannot create actors)", async () => {
      const r = await t.gm.eval(emptyCharacter, { name: ACTOR, player: "Gracz 3" });
      t.equal(r.playerCanCreate, false, "a fresh world lets players create actors");
      t.equal(r.items, 0, "items on the empty character");
      await t.waitFor(p, n => Boolean(game.actors.getName(n)?.isOwner), { args: [ACTOR], message: "the player to own the new actor" });
    });

    await t.step("player drops a class: Twardziel through the AdvancementManager", async () => {
      const d = await p.eval(dropOnSheet, { name: ACTOR, pack: "klasy", entry: "Twardziel" });
      t.assert(d.manager, "dropping the class opened no AdvancementManager — the drop went nowhere", d);
      const seen = await p.eval(advance, { picks: { "Biegłości": ["Atletyka", "Percepcja"], "Wyjadacz — wybierz jedną": ["Sokole oko"] } });
      t.log(seen.join(" → "));
      for (const want of ["HitPoints", "Trait", "ItemGrant", "ItemChoice"]) {
        t.assert(seen.some(s => s.startsWith(`${want}:`)), `no ${want} step`, seen);
      }
      const s = await t.waitFor(p, n => {
        const a = game.actors.getName(n);
        return a.items.some(i => i.type === "class") ? true : null;
      }, { args: [ACTOR], message: "the class on the actor" }).then(() => p.eval(snapshot, { name: ACTOR }));
      t.equal(s.classes.join(","), "twardziel 1", "class and level");
      t.equal(s.level, 1, "character level");
      for (const f of ["Wyjadacz", "Kondycha", "Ulubiona broń", "Sokole oko"]) t.assert(s.feats.includes(f), `missing feature ${f}`, s);
      t.equal(s.skills.length, 2, "chosen skills");
      t.equal(s.saves.length, 2, "save proficiencies");
      t.equal(s.hp.max, 16, "PW max (Twardziel: 16 + mod KON 0)");
      t.equal(s.hp.value, 16, "PW at creation (8 = dnd5e's hit die, the bug fixed 2026-10-08)");
      twardziel.saves = s.saves;
    });

    await t.step("player drops a Pochodzenie: Posterunek, +1 INT +1 MDR and one region ability", async () => {
      const before = await p.eval(snapshot, { name: ACTOR });
      const d = await p.eval(dropOnSheet, { name: ACTOR, pack: "pochodzenia", entry: "Posterunek" });
      t.assert(d.manager, "dropping the Pochodzenie opened no AdvancementManager", d);
      const seen = await p.eval(advance, { picks: {} });
      t.log(seen.join(" → "));
      t.assert(seen.some(s => s.startsWith("AbilityScoreImprovement:")) && seen.some(s => s.startsWith("ItemChoice:")), "Pochodzenie steps", seen);
      const s = await t.waitFor(p, n => game.actors.getName(n).items.some(i => i.type === "background") || null,
        { args: [ACTOR], message: "the background on the actor" }).then(() => p.eval(snapshot, { name: ACTOR }));
      t.equal(s.background, "posterunek", "background");
      t.equal(s.abilities.int, before.abilities.int + 1, "INT after Posterunek");
      t.equal(s.abilities.wis, before.abilities.wis + 1, "MDR after Posterunek");
      t.equal(s.feats.length, before.feats.length + 1, "one ability from the Pochodzenie");
      t.equal(s.hp.value, s.hp.max, "PW still full");
    });

    await t.step("player drops the starting Sztuczka: Szybkie palce, flagged, no advancement", async () => {
      const d = await p.eval(dropOnSheet, { name: ACTOR, pack: "sztuczki", entry: "Szybkie palce" });
      t.equal(d.manager, false, "a Sztuczka opened an AdvancementManager");
      const s = await t.waitFor(p, n => {
        const x = game.actors.getName(n);
        return x.items.some(i => i.name === "Szybkie palce") || null;
      }, { args: [ACTOR], message: "the Sztuczka on the actor" }).then(() => p.eval(snapshot, { name: ACTOR }));
      t.equal(s.sztuczki.join(","), "Szybkie palce", "Sztuczki on the actor");
      t.equal(s.classes.join(","), "twardziel 1", "class untouched");
    });

    await t.step("the new character works: a skill check from the player's client, sheet re-renders", async () => {
      const r = await p.eval(skillCheck, { name: ACTOR, skill: "atl" });
      t.assert(r.total !== null && r.messages >= 1, "skill check made no roll card", r);
      await p.eval(async n => {
        const sheet = game.actors.getName(n).sheet;
        await sheet.render(true);
        await __e2e.until(() => sheet.rendered);
      }, ACTOR);
      await t.screenshot("Gracz 3", "nowa-postac");
      await p.eval(async n => { await game.actors.getName(n).sheet.close(); }, ACTOR);
    });

    await t.step("GM sees the same character", async () => {
      const s = await t.waitFor(t.gm, n => {
        const a = game.actors.getName(n);
        return a?.items.some(i => i.name === "Szybkie palce") ? true : null;
      }, { args: [ACTOR], message: "the GM to see the finished character" }).then(() => t.gm.eval(snapshot, { name: ACTOR }));
      t.equal(s.classes.join(","), "twardziel 1", "GM: class");
      t.equal(s.background, "posterunek", "GM: background");
      t.equal(s.hp.value, 16, "GM: PW");
      t.equal(s.saves.join(","), twardziel.saves.join(","), "GM: saves");
      // NOE, Tworzenie postaci: every hero starts at 9 m. dnd5e takes speed from a species, which NOE
      // has none of — a character built from zero walked 0 m until 2026-10-08.
      t.equal(s.speed, "9 m", "GM: Szybkość");
    });

    await t.step("GM: Pojazdy already at Specjalizacja, the mechanic's kit at proficiency (setup for D1, PLAN_m6 §5.1)", async () => {
      await t.gm.eval(async n => {
        await game.actors.getName(n).update({
          "system.skills.poj.value": 2,
          "system.tools.mechanika": { value: 1, ability: "dex" },
          "system.abilities.int.value": 15
        });
      }, ACTOR);
      await t.waitFor(p, n => game.actors.getName(n).system.tools?.mechanika?.value === 1 || null,
        { args: [ACTOR], message: "the player to see the setup" });
    });

    await t.step("player levels Twardziel 1 → 3 and takes Wojownik autostrady: upgrade, and a warning instead of a silent loss", async () => {
      const n = await p.eval(openLevelUp, { name: ACTOR, delta: 2 });
      t.assert(n > 0, "the level-up opened no steps", n);
      const seen = await p.eval(advance, { picks: { "Profesja": "Wojownik Autostrady" } });
      t.log(seen.join(" → "));
      t.assert(seen.some(s => s.startsWith("Subclass:")), "no profession step", seen);
      const s = await t.waitFor(p, n => game.actors.getName(n).items.some(i => i.type === "subclass") || null,
        { args: [ACTOR], message: "the profession on the actor" }).then(() => p.eval(proficiencies, { name: ACTOR }));
      t.equal(s.classes.join(","), "twardziel 3", "class level");
      t.equal(s.subclass, "wojownik-autostrady", "profession");
      t.equal(s.tools.mechanika, 2, "mechanic's kit: proficiency → Specjalizacja (D1)");
      t.equal(s.skills.poj, 2, "Pojazdy stays at Specjalizacja");
      const w = await t.waitFor(p, warnings, { args: [{ includes: "Pojazdy" }], message: "the D1 warning whispered to the player" });
      t.assert(w.some(x => /Pojazdy: masz już Specjalizację/.test(x)), "warning text", w);
      t.assert(!w.some(x => /mechanika/.test(x)), "no warning for the kit that did go up", w);
    });

    await t.step("player adds Spec as a second class: the multiclass kit only — no saves, one skill, one kit (s. 59, Z14)", async () => {
      const before = await p.eval(proficiencies, { name: ACTOR });
      const d = await p.eval(dropOnSheet, { name: ACTOR, pack: "klasy", entry: "Spec" });
      t.assert(d.manager, "dropping the second class opened no AdvancementManager", d);
      const seen = await p.eval(advance, { picks: {} });
      t.log(seen.join(" → "));
      t.assert(seen.some(x => x === "Trait:Biegłości (postać wieloklasowa)"), "the multiclass Trait step", seen);
      t.assert(!seen.some(x => x === "Trait:Biegłości"), "the full starting kit ran for a second class", seen);
      const s = await t.waitFor(p, n => game.actors.getName(n).items.filter(i => i.type === "class").length === 2 || null,
        { args: [ACTOR], message: "the second class" }).then(() => p.eval(proficiencies, { name: ACTOR }));
      t.equal(s.saves.join(","), before.saves.join(","), "saves unchanged");
      t.equal(s.weapons.join(","), before.weapons.join(","), "weapons unchanged");
      t.equal(Object.keys(s.skills).length, Object.keys(before.skills).length + 1, "one skill from the Spec list");
      t.equal(Object.keys(s.tools).length, Object.keys(before.tools).length + 1, "one kit of choice");
    });

    await t.step("Cichy krok: the active GM creates one terrain effect with players connected, for owned and unowned characters", async () => {
      const ids = await t.gm.eval(async name => {
        const MOD = "neuroshima-2026-overrides";
        const docs = await game.packs.get(`${MOD}.zdolnosci-klasowe`).getDocuments();
        const feat = docs.find(i => i.getFlag(MOD, "abilityId") === "cichy-krok");
        const unowned = await Actor.implementation.create({ name: "Agent · Cichy krok", type: "character",
          flags: { [MOD]: { fixture: "skirmish" } } });
        const actors = [game.actors.getName(name), unowned];
        for (const actor of actors) await actor.createEmbeddedDocuments("Item", [game.items.fromCompendium(feat)]);
        return actors.map(a => a.id);
      }, ACTOR);
      await t.waitFor(t.gm, ids => ids.every(id => {
        const a = game.actors.get(id);
        return a.effects.filter(e => e.getFlag("neuroshima-2026-overrides", "cichyKrokTeren")).length === 1
          && a.system.attributes.movement.ignoredDifficultTerrain.has("all");
      }) ? true : null, { args: [ids], message: "one Cichy krok effect on each character" });
      await t.quiet();
    });

    await t.step("ability macros belong to each user: replace a legacy shared macro, then GM cleanup preserves the player's macro", async () => {
      const ids = await t.gm.eval(async name => {
        const MOD = "neuroshima-2026-overrides";
        const docs = await game.packs.get(`${MOD}.zdolnosci-klasowe`).getDocuments();
        const feat = docs.find(i => i.getFlag(MOD, "abilityId") === "berserk");
        const player = game.actors.getName(name);
        const gm = game.actors.getName("Agent · Cichy krok");
        await game.users.getName("Gracz 3").update({ character: player.id });
        for (const actor of [gm, player]) await actor.createEmbeddedDocuments("Item", [game.items.fromCompendium(feat)]);
        return { gm: gm.id, player: player.id };
      }, ACTOR);
      await t.quiet();
      const sync = async id => {
        const MOD = "neuroshima-2026-overrides";
        await game.modules.get(MOD).api.hotbar.sync(game.actors.get(id));
        const macro = game.macros.find(m => m.getFlag(MOD, "abilityId") === "berserk" && m.author === game.user);
        return { macro: macro?.id, author: macro?._source.author, user: game.user.id };
      };
      const [gm, player] = await Promise.all([t.gm.eval(sync, ids.gm), p.eval(sync, ids.player)]);
      t.assert(gm.macro && player.macro && gm.macro !== player.macro, "separate documents for the GM and player", { gm, player });
      t.equal(player.author, player.user, "the player owns their automatic macro");
      const slot = await t.gm.eval(async ({ macro, playerMacro }) => {
        const user = game.users.getName("Gracz 3");
        const slot = Number(Object.entries(user.hotbar).find(([, id]) => id === playerMacro)[0]);
        await user.assignHotbarMacro(game.macros.get(macro), slot);
        return slot;
      }, { macro: gm.macro, playerMacro: player.macro });
      const migrated = await p.eval(sync, ids.player);
      t.equal(migrated.macro, player.macro, "reuse the player's macro instead of modifying the GM's legacy shared macro");
      await t.gm.eval(async ({ actor, macro }) => {
        const a = game.actors.get(actor);
        await a.deleteEmbeddedDocuments("Item", a.items.filter(i => i.getFlag("neuroshima-2026-overrides", "abilityId") === "berserk").map(i => i.id));
        await game.modules.get("neuroshima-2026-overrides").api.hotbar.sync(a);
      }, { actor: ids.gm, macro: gm.macro });
      await t.waitFor(p, ({ macro, slot }) => game.macros.has(macro) && game.user.hotbar[slot] === macro ? true : null,
        { args: [{ macro: player.macro, slot }], message: "player's macro survives GM cleanup" });
      await t.quiet();
    });
  }
};
