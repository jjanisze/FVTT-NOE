/**
 * Suite — Umieranie (PLAN_m1_walka.md E1–E2, §8 „Testy”). GM and two players, everything driven the
 * way the table drives it: the GM applies damage like dnd5e's tray, an NPC hits a downed PC with a
 * real melee attack card, players roll their own death saves and click the "Umiera" card in their own
 * chat log. Every step that changes another player's actor goes through the GM relay (R7).
 *
 *  - PC to 0 PW: Nieprzytomność with its origin marker (U4), Stopień Zranienia, one "Umiera" card whose
 *    buttons differ per viewer (owner: death save; others: stabilise; GM: +1 failure).
 *  - Melee hit at 0 PW = two failures (s. 34) — read from the attack card's own melee stamp — and,
 *    the NPC standing next to the PC, an automatic crit (s. 35, E3): verdict "krytyk" on a d20 of 19,
 *    critical damage, one more Stopień.
 *  - Death save = a pure d20 (U12): +5 save bonus and +3 death bonus on the actor, formula "1d20".
 *  - Gracz 2 stabilises Gracz 1 with the card's Medycyna button (their own roll, GM writes).
 *  - Clock +8 h → stable PC regains 1 PW, Nieprzytomność ends, Powalenie stays (U5).
 *  - Player's own third success → stable through dnd5e's `details.updates` (F4).
 *  - Damage on a stable PC resumes dying; healing ends it and zeroes the track.
 *  - Staza from the compendium: Gracz 2 uses it on a dying PC → stable (U11).
 *  - Long rest at 0 PW is refused (U6).
 *  - Massive damage → GM-only "Śmierć" card → [Cofnij] (D1).
 *  - NPC to 0 → dead without a Stopień, GM-only card → [Rzuty przeciw śmierci] (D2).
 */

/* Functions below run in the browser (serialised): no closures over this file. */

/** Snapshot of the dying machine for a named actor (world actor or the token's synthetic one). */
function snap({ name }) {
  const MOD = "neuroshima-2026-overrides";
  const tok = canvas.scene.tokens.find(t => t.name === name);
  const a = tok?.actor ?? game.actors.getName(name);
  const U = game.neuroshima.umieranie;
  const d = a.system.attributes.death;
  const flaga = a.getFlag(MOD, "umieranie") ?? {};
  return {
    hp: a.system.attributes.hp.value, stan: U.stan(a), sukcesy: d.success, porazki: d.failure,
    stopien: a.getFlag(MOD, "zranienie")?.level ?? 0,
    nieprzytomnosc: a.effects.filter(e => e.statuses.has("unconscious")).map(e => e.getFlag(MOD, "zrodlo") ?? null),
    powalony: a.statuses.has("prone"), stabilny: a.statuses.has("stable"), martwy: a.statuses.has("dead"),
    karta: flaga.karta ?? null, termin: flaga.stabilnyDo ?? null, wMaszynie: U.wMaszynie(a)
  };
}

/** GM: damage like the tray (optionally from a damage card), then let the hooks settle. */
async function damage({ name, value, type = "piercing", messageId = null, heal = false }) {
  const tok = canvas.scene.tokens.find(t => t.name === name);
  const a = tok?.actor ?? game.actors.getName(name);
  const message = messageId ? game.messages.get(messageId) : null;
  const damages = message
    ? dnd5e.dice.aggregateDamageRolls(message.rolls, { respectProperties: true }).map(r => ({
      value: Math.max(0, r.total), type: r.options.type, properties: new Set(r.options.properties ?? [])
    }))
    : [{ value, type: heal ? "healing" : type }];
  await a.applyDamage(damages, message ? { isDelta: true, origin: message } : {});
  await new Promise(r => setTimeout(r, 900));
}

/** Viewer-side: which "Umiera"/"Śmierć"/"BN" buttons does this client see on a message? */
function buttonsOn({ messageId }) {
  const el = ui.chat.element?.querySelector(`[data-message-id="${messageId}"]`)
    ?? document.querySelector(`[data-message-id="${messageId}"]`);
  if (!el) return null;
  return [...el.querySelectorAll("[data-umieranie]")].map(b => b.dataset.umieranie);
}

/**
 * Click a card button in this client's own chat log (real DOM click). `dialog`: the roll dialog's
 * button to press afterwards, as the player would (dnd5e's roll configuration window).
 */
async function clickCard({ messageId, akcja, uniform = null, dialog = null }) {
  const orig = CONFIG.Dice.randomUniform;
  if (uniform !== null) CONFIG.Dice.randomUniform = () => uniform;
  try {
    for (let i = 0; i < 20; i++) {
      const btn = (ui.chat.element ?? document).querySelector(`[data-message-id="${messageId}"] [data-umieranie="${akcja}"]`);
      if (btn && !btn.disabled) {
        btn.click();
        for (let j = 0; dialog && j < 40; j++) {
          await new Promise(r => setTimeout(r, 150));
          const app = [...foundry.applications.instances.values()]
            .find(a => a.rendered && /RollConfigurationDialog/.test(a.constructor.name));
          const press = app?.element.querySelector(`[data-action="${dialog}"]`);
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

export default {
  name: "umieranie",
  clients: ["gm", "Gracz 1", "Gracz 2"],

  async run(t) {
    const p1 = t.client("Gracz 1");
    const p2 = t.client("Gracz 2");
    for (const p of [p1, p2]) {
      await t.waitFor(p, () => Boolean(game.user.character && ui.chat?.element), { message: "a player's client to see the fixture" });
    }

    await t.step("GM: PCs 12 max PW; PC Gracz 1 at 5", async () => {
      await t.gm.eval(async () => {
        for (const n of ["PC Gracz 1", "PC Gracz 2", "PC Gracz 3"]) {
          const a = game.actors.getName(n);
          await a.update({ "system.attributes.hp.max": 12, "system.attributes.hp.value": n === "PC Gracz 1" ? 5 : 12 });
        }
      });
    });

    const pad = await t.step("GM applies 8 → PC Gracz 1 at 0: Nieprzytomność (pw0), Stopień 1, one card", async () => {
      await t.gm.eval(damage, { name: "PC Gracz 1", value: 8 });
      const s = await t.gm.eval(snap, { name: "PC Gracz 1" });
      t.equal(s.hp, 0, "PW");
      t.equal(s.stan, "umierajacy", "stan");
      t.assert(s.nieprzytomnosc.length === 1 && s.nieprzytomnosc[0] === "pw0", "Nieprzytomność without the pw0 marker", s);
      t.equal(s.powalony, true, "Powalenie (rider)");
      t.equal(s.stopien, 1, "Stopień Zranienia");
      t.assert(s.karta, "no Umiera card", s);
      return s;
    });

    await t.step("per-viewer buttons on the Umiera card", async () => {
      const own = await t.waitFor(p1, (id) => {
        const el = ui.chat.element?.querySelector(`[data-message-id="${id}"]`);
        return el ? [...el.querySelectorAll("[data-umieranie]")].map(b => b.dataset.umieranie) : null;
      }, { args: [pad.karta], message: "the card in Gracz 1's chat" });
      const other = await t.waitFor(p2, buttonsOn, { args: [{ messageId: pad.karta }], message: "the card in Gracz 2's chat" });
      const gm = await t.gm.eval(buttonsOn, { messageId: pad.karta });
      t.assert(own.includes("rzut") && !own.includes("wrecz"), "owner sees the death save, not the GM button", own);
      t.assert(!other.includes("rzut") && other.includes("medycyna") && other.includes("staza"), "helper's buttons", other);
      t.assert(gm.includes("wrecz"), "GM sees +1 porażka (wręcz)", gm);
      await t.screenshot("Gracz 1", "umiera-card-owner");
    });

    await t.step("NPC melee hit on the downed PC → two failures (s. 34) and automatic crit ≤ 1,5 m (s. 35) → Stopień", async () => {
      const r = await t.gm.eval(async () => {
        const MOD = "neuroshima-2026-overrides";
        const npcTok = canvas.scene.tokens.find(tk => tk.name === "GANGUS ŻOŁNIERZ");
        const pcTok = canvas.scene.tokens.find(tk => tk.name === "PC Gracz 1");
        await npcTok.update({ x: pcTok.x + canvas.grid.size, y: pcTok.y }, { animate: false });
        await new Promise(res => setTimeout(res, 300));
        const npc = npcTok.actor;
        const target = canvas.tokens.placeables.find(tk => tk.name === "PC Gracz 1");
        const activity = npc.items.contents.flatMap(i => i.system.activities?.contents ?? [])
          .find(a => a.type === "attack" && a.actionType === "mwak");
        if (!activity) throw new Error("no melee attack on the NPC");
        npcTok.object.control({ releaseOthers: true });
        canvas.tokens.setTargets([target.id]);
        const orig = CONFIG.Dice.randomUniform;
        CONFIG.Dice.randomUniform = () => 0.06; // d20 = 19: a hit, not a crit
        try {
          // Bez `subsequentActions`: łatka osłony (`combat/cover.mjs`) otworzyłaby okno ataku, którego test nie użyje.
          const usage = await activity.use({ subsequentActions: false }, { configure: false }, {});
          const link = { data: { flags: { dnd5e: { originatingMessage: usage.message.id } } } };
          await activity.rollAttack({}, { configure: false }, link);
          await activity.rollDamage({ isCritical: false }, { configure: false }, link);
          const dmg = game.messages.contents.findLast(m => m.getFlag("dnd5e", "originatingMessage") === usage.message.id && m.getFlag("dnd5e", "roll.type") === "damage");
          const atk = game.messages.contents.findLast(m => m.getFlag("dnd5e", "originatingMessage") === usage.message.id && m.flags[MOD]?.obrona);
          const entry = atk?.flags[MOD].obrona.targets?.[0] ?? null;
          return {
            damageMessage: dmg?.id ?? null, melee: atk?.flags[MOD].obrona.melee ?? null,
            natural: atk?.flags[MOD].obrona.natural ?? null, autoKrytyk: entry?.autoKrytyk ?? null,
            verdict: entry?.verdict ?? null, damageCrit: Boolean(dmg?.rolls?.[0]?.isCritical),
            advantageMode: atk?.rolls?.[0]?.options?.advantageMode ?? null
          };
        } finally {
          CONFIG.Dice.randomUniform = orig;
          canvas.tokens.releaseAll();
        }
      });
      t.equal(r.melee, true, "attack card stamped melee");
      t.equal(r.advantageMode, 1, "Ułatwienie against an unconscious, prone target ≤ 1,5 m");
      t.assert(r.natural !== 20 && r.autoKrytyk, "no automatic crit stamped for the target", r);
      t.equal(r.verdict, "krytyk", "verdict of a non-20 hit on an unconscious target ≤ 1,5 m");
      t.equal(r.damageCrit, true, "damage roll critical from the verdict");
      t.assert(r.damageMessage, "no damage card", r);
      await t.gm.eval(damage, { name: "PC Gracz 1", messageId: r.damageMessage });
      const s = await t.gm.eval(snap, { name: "PC Gracz 1" });
      t.equal(s.porazki, 2, "failures after a melee hit at 0 PW");
      t.equal(s.stopien, 2, "Stopień after the automatic crit");
    });

    await t.step("Gracz 1 rolls a death save: pure d20 despite +5/+3, no Fuks bar", async () => {
      await t.gm.eval(async () => {
        const a = game.actors.getName("PC Gracz 1");
        await a.update({ "system.bonuses.abilities.save": "+5", "system.attributes.death.bonuses.save": "+3" });
      });
      const r = await p1.eval(async () => {
        const orig = CONFIG.Dice.randomUniform;
        CONFIG.Dice.randomUniform = () => 0.42; // d20 = 12
        try {
          const rolls = await game.user.character.rollDeathSave();
          await new Promise(res => setTimeout(res, 900));
          const msg = game.messages.contents.findLast(m => m.getFlag("dnd5e", "roll.type") === "death");
          const el = ui.chat.element?.querySelector(`[data-message-id="${msg?.id}"]`);
          return { formula: rolls?.[0]?.formula, total: rolls?.[0]?.total, fuks: Boolean(el?.querySelector(".neuroshima-reroll-bar")) };
        } finally {
          CONFIG.Dice.randomUniform = orig;
        }
      });
      t.equal(r.formula, "1d20", "death save formula");
      t.equal(r.total, 12, "death save total");
      t.equal(r.fuks, false, "Fuks/Forsuj bar under a death save");
      const s = await t.gm.eval(snap, { name: "PC Gracz 1" });
      t.equal(s.sukcesy, 1, "successes");
    });

    await t.step("Gracz 2 stabilises Gracz 1 from the card (Medycyna ST 10) — GM writes", async () => {
      const clicked = await p2.eval(clickCard, { messageId: pad.karta, akcja: "medycyna", uniform: 0.00001, dialog: "normal" });
      t.assert(clicked, "Gracz 2 found no Medycyna button");
      await t.waitFor(t.gm, () => game.actors.getName("PC Gracz 1").statuses.has("stable") || null, { message: "PC Gracz 1 stable" });
      const now = await t.gm.eval(snap, { name: "PC Gracz 1" });
      t.equal(now.stan, "stabilny", "stan after Gracz 2's help");
      t.equal(now.sukcesy + now.porazki, 0, "track reset on stabilisation");
      t.assert(Number.isFinite(now.termin), "no 1k8 h deadline", now);
      const left = await p2.eval(() => game.user.character.getFlag("neuroshima-2026-overrides", "umieranieProsba") ?? null);
      t.equal(left, null, "relay request left on Gracz 2's actor");
    });

    await t.step("stable PC cannot roll; clock +8 h → 1 PW, awake, still prone", async () => {
      const blocked = await p1.eval(async () => (await game.user.character.rollDeathSave()) ?? null);
      t.equal(blocked, null, "a stable PC's death save");
      await t.gm.eval(async () => { await game.time.advance(8 * 3600); await new Promise(r => setTimeout(r, 1500)); });
      const s = await t.gm.eval(snap, { name: "PC Gracz 1" });
      t.equal(s.hp, 1, "PW after 8 h");
      t.equal(s.stan, "przytomny", "stan");
      t.equal(s.nieprzytomnosc.length, 0, "Nieprzytomność left");
      t.equal(s.powalony, true, "Powalenie stays");
      t.equal(s.karta, null, "episode card still open");
    });

    await t.step("Gracz 1's own third success → stable (relay through dnd5e's update)", async () => {
      await t.gm.eval(damage, { name: "PC Gracz 1", value: 3 });
      await p1.eval(async () => {
        const orig = CONFIG.Dice.randomUniform;
        CONFIG.Dice.randomUniform = () => 0.42;
        try {
          for (let i = 0; i < 3; i++) {
            await game.user.character.rollDeathSave();
            await new Promise(res => setTimeout(res, 700));
          }
        } finally {
          CONFIG.Dice.randomUniform = orig;
        }
      });
      await t.waitFor(t.gm, () => game.actors.getName("PC Gracz 1").statuses.has("stable") || null, { message: "stable after three successes" });
      const left = await t.waitFor(p1, () => (game.user.character.getFlag("neuroshima-2026-overrides", "umieranieProsba") ? null : "clean"),
        { message: "the relay request to be cleared" });
      t.equal(left, "clean", "relay request on the actor");
    });

    await t.step("damage on a stable PC resumes dying; healing ends it and zeroes the track", async () => {
      await t.gm.eval(damage, { name: "PC Gracz 1", value: 2 });
      let s = await t.gm.eval(snap, { name: "PC Gracz 1" });
      t.equal(s.stan, "umierajacy", "stan after a hit while stable");
      t.equal(s.porazki, 1, "failure from the hit");
      await t.gm.eval(damage, { name: "PC Gracz 1", value: 4, heal: true });
      s = await t.gm.eval(snap, { name: "PC Gracz 1" });
      t.equal(s.stan, "przytomny", "stan after healing");
      t.equal(s.sukcesy + s.porazki, 0, "track after healing");
      t.equal(s.nieprzytomnosc.length, 0, "Nieprzytomność after healing");
    });

    await t.step("Staza (compendium) — Gracz 2 uses it on the dying PC → stable", async () => {
      await t.gm.eval(async () => {
        const pack = game.packs.get("neuroshima-2026-overrides.sprzet");
        const doc = (await pack.getDocuments()).find(i => i.getFlag("neuroshima-2026-overrides", "staza"));
        if (!doc) throw new Error("no Staza in the sprzet pack");
        const b = game.actors.getName("PC Gracz 2");
        await b.createEmbeddedDocuments("Item", [game.items.fromCompendium(doc)]);
      });
      await t.gm.eval(damage, { name: "PC Gracz 1", value: 9 });
      const used = await p2.eval(async () => {
        const me = game.user.character;
        const staza = me.items.find(i => i.getFlag("neuroshima-2026-overrides", "staza"));
        const target = canvas.tokens.placeables.find(tk => tk.name === "PC Gracz 1");
        canvas.tokens.setTargets([target.id]);
        const activity = staza.system.activities.contents[0];
        const usage = await activity.use({}, { configure: false }, {});
        await new Promise(res => setTimeout(res, 1500));
        canvas.tokens.setTargets([]);
        return { used: Boolean(usage), qty: staza.system.quantity };
      });
      t.equal(used.qty, 1, "Staza quantity after use (reusable)");
      const s = await t.waitFor(t.gm, () => game.actors.getName("PC Gracz 1").statuses.has("stable") || null, { message: "stable after Staza" });
      t.assert(s, "not stable after Staza");
    });

    await t.step("long rest at 0 PW is refused (s. 45)", async () => {
      const r = await t.gm.eval(async () => {
        const a = game.actors.getName("PC Gracz 1");
        const res = await a.longRest({ dialog: false, chat: false });
        return { refused: res === undefined, hp: a.system.attributes.hp.value };
      });
      t.equal(r.refused, true, "long rest at 0 PW");
      t.equal(r.hp, 0, "PW after the refused rest");
    });

    await t.step("massive damage → GM-only Śmierć card → [Cofnij]", async () => {
      await t.gm.eval(damage, { name: "PC Gracz 2", value: 24, type: "fire" });
      const card = await t.gm.eval(() => {
        const m = game.messages.contents.findLast(x => x.getFlag("neuroshima-2026-overrides", "umieranieSmierc")?.przyczyna === "olbrzymie");
        return m ? { id: m.id, whisper: m.whisper.length } : null;
      });
      t.assert(card && card.whisper > 0, "no whispered Śmierć card", card);
      const seenByPlayer = await p2.eval(id => Boolean(game.messages.get(id)?.visible), card.id);
      t.equal(seenByPlayer, false, "the Śmierć card is visible to the player");
      t.assert(await t.gm.eval(clickCard, { messageId: card.id, akcja: "cofnij" }), "GM found no Cofnij");
      const r = await t.gm.eval((id) => ({
        stan: game.messages.get(id).getFlag("neuroshima-2026-overrides", "umieranieSmierc").stan,
        dead: game.actors.getName("PC Gracz 2").statuses.has("dead")
      }), card.id);
      t.equal(r.stan, "cofnieta", "card state");
      t.equal(r.dead, false, "PC dead after Cofnij");
      await t.screenshot("gm", "smierc-cofnieta");
    });

    await t.step("NPC to 0 → dead, no Stopień; [Rzuty przeciw śmierci] → dying with Stopień", async () => {
      await t.gm.eval(damage, { name: "CYWIL", value: 999 });
      let s = await t.gm.eval(snap, { name: "CYWIL" });
      t.equal(s.martwy, true, "NPC dead at 0");
      t.equal(s.stopien, 0, "NPC Stopień at 0 PW");
      const id = await t.gm.eval(() => game.messages.contents.findLast(m => m.getFlag("neuroshima-2026-overrides", "umieranieBN"))?.id ?? null);
      t.assert(id, "no BN pada card");
      t.assert(await t.gm.eval(clickCard, { messageId: id, akcja: "bn" }), "GM found no Rzuty przeciw śmierci button");
      s = await t.gm.eval(snap, { name: "CYWIL" });
      t.equal(s.martwy, false, "NPC dead after the button");
      t.equal(s.stan, "umierajacy", "NPC stan");
      t.equal(s.stopien, 1, "NPC Stopień");
      t.equal(s.wMaszynie, true, "NPC in the dying machine");
      await t.screenshot("gm", "bn-umiera");
    });

    await t.step("the same move from the NPC's Stan panel (GM, later — „przesłuchanie”)", async () => {
      await t.gm.eval(damage, { name: "GANGUS ŻOŁNIERZ", value: 999 });
      const r = await t.gm.eval(async () => {
        const a = canvas.scene.tokens.find(tk => tk.name === "GANGUS ŻOŁNIERZ").actor;
        await a.sheet.render(true);
        let btn = null;
        for (let i = 0; i < 40 && !btn; i++) {
          await new Promise(res => setTimeout(res, 100));
          btn = a.sheet.element?.querySelector(".neuro-umieranie-stan-btn");
        }
        if (!btn) return { button: false };
        btn.click();
        await new Promise(res => setTimeout(res, 1500));
        const gone = !a.sheet.element?.querySelector(".neuro-umieranie-stan-btn");
        await a.sheet.close();
        return { button: true, gone };
      });
      t.equal(r.button, true, "panel button on a dead NPC's sheet");
      t.equal(r.gone, true, "button gone once the NPC is in the machine");
      const s = await t.gm.eval(snap, { name: "GANGUS ŻOŁNIERZ" });
      t.equal(s.stan, "umierajacy", "NPC stan after the panel button");
      t.equal(s.stopien, 1, "NPC Stopień after the panel button");
    });
  }
};

