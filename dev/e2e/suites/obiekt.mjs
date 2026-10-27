/**
 * Suite — obiekty: fizyczność na żądanie (PLAN_m6_drobne_zasady.md §5.4, E4; D5, P8, U9–U12). On the skirmish
 * shed's door, flagged as an exported wall:
 *
 *  - the GM selects the door on the walls layer and presses „Ufizycznij” — the dialog defaults to the door template
 *    (U10: Średni, drewno, wytrzymały → TT 15, 18 PW) and a frame token appears on the door;
 *  - the object's saving throw fails automatically (s. 254);
 *  - PC Gracz 1 shoots it with the B 92 and the GM applies the card like the damage tray; `burząca` doubles (s. 117);
 *  - at 0 PW the GM gets a whispered card: [Otwórz drzwi] [Usuń przegrodę] [Zostaw] and the Tiled note; „Usuń
 *    przegrodę” removes the wall and the token, draws an X the player sees too (U12) and remembers the wall, so a map
 *    update skips it (U11) until the GM restores it from „Zniszczenia”;
 *  - a drawing marked „Kruchy — zniszcz od razu” goes straight to the card, without a token.
 */

const MODULE_ID = "neuroshima-2026-overrides";

/* Functions below run in the browser (serialised): no closures over this file. */

/** GM: the shed door as an exported wall; Gracz 1 south of it, facing the door. */
async function przygotuj() {
  const MOD = "neuroshima-2026-overrides";
  const scene = canvas.scene;
  const door = scene.walls.find(w => w.door > 0);
  await door.update({ [`flags.${MOD}.source`]: "door", ds: CONST.WALL_DOOR_STATES.CLOSED });
  const pc = scene.tokens.find(t => t.name === "PC Gracz 1");
  const [x1, y1, x2] = door.c;
  await pc.move({ x: Math.min(x1, x2), y: y1 + 1.5 * scene.grid.size, action: "displace" });
  await scene.update({ flags: { [MOD]: { mapId: "E2E-OBIEKT" } } });
  return { doorId: door.id, mid: { x: (door.c[0] + door.c[2]) / 2, y: (door.c[1] + door.c[3]) / 2 } };
}

/** GM: select `ids` on `layer` and press „Ufizycznij”; `button` — ok / kruchy. */
async function ufizycznij({ layer, ids, button = "ok" }) {
  const MOD = "neuroshima-2026-overrides";
  const L = canvas[layer];
  L.activate();
  L.releaseAll();
  for (const id of ids) L.get(id)?.control({ releaseOthers: false });
  const before = new Set(canvas.scene.tokens.map(t => t.id));
  const since = game.messages.size;
  const run = game.neuroshima.obiekty.ufizycznij();
  const app = await __e2e.until(() => __e2e.findApps({ title: "Ufizycznij", action: "ok" })[0], { message: "the Ufizycznij dialog" });
  const form = app.element;
  const pola = Object.fromEntries(["szablon", "nazwa", "material", "rozmiar", "kruchosc"].map(k => [k, form.querySelector(`[name="${k}"]`)?.value ?? null]));
  await __e2e.clickDialog({ title: "Ufizycznij" }, button);
  await run;
  await __e2e.quiet();
  canvas.tokens.activate();
  const tok = canvas.scene.tokens.find(t => !before.has(t.id)) ?? null;
  const a = tok?.actor;
  const card = game.messages.contents.slice(since).findLast(m => m.flags?.[MOD]?.kartaZniszczenia) ?? null;
  return {
    pola,
    token: tok ? { id: tok.id, uuid: a.uuid, name: tok.name, x: tok.x, y: tok.y, w: tok.width, obiekt: game.neuroshima.obiekty.jestObiektem(a),
      ac: a.system.attributes.ac.value, hp: a.system.attributes.hp.value, size: a.system.traits.size,
      di: [...a.system.traits.di.value].sort(), linked: tok.actorLink } : null,
    card: card ? { id: card.id, buttons: [...card.content.matchAll(/data-neuro-obiekt="(\w+)"/g)].map(m => m[1]),
      tiled: card.content.includes("Tiled"), whisper: card.whisper.length > 0 } : null
  };
}

/** GM: the object's DEX save, as a chat card. */
async function rzutObronny({ uuid }) {
  const actor = fromUuidSync(uuid);
  const since = game.messages.size;
  const rolls = await actor.rollSavingThrow({ ability: "dex" }, { configure: false }, {});
  const msg = game.messages.contents.slice(since).findLast(m => m.rolls?.length);
  return { total: rolls?.[0]?.total ?? null, flavor: msg?.flavor ?? "" };
}

/** Player: one B 92 shot at `targetName` with a forced natural 20, plus linked damage. */
async function strzal({ targetName }) {
  const MOD = "neuroshima-2026-overrides";
  const actor = game.user.character;
  const gun = actor.items.find(i => i.type === "weapon");
  const attack = gun.system.activities.find(a => a.type === "attack");
  const target = canvas.tokens.placeables.find(t => t.name === targetName);
  if (!target) return { visible: false };
  canvas.tokens.placeables.find(t => t.actor?.id === actor.id)?.control({ releaseOthers: true });
  canvas.tokens.setTargets([target.id]);
  __e2e.forceD20([20], { fallback: 2 });
  try {
    let usage = null;
    for (let i = 0; i < 20 && !usage; i++) {
      usage = await attack.use({ subsequentActions: false }, { configure: false }, {});
      if (!usage) await new Promise(r => setTimeout(r, 250));
    }
    if (!usage) throw new Error("attack.use() was cancelled every time");
    const link = { data: { system: { origin: usage.message.id } } };
    const attackRolls = await attack.rollAttack({}, { configure: false }, link);
    await attack.rollDamage({ isCritical: attackRolls?.[0]?.isCritical ?? false }, { configure: false }, link);
    const attackMsg = game.messages.contents.findLast(m => m._source.system?.origin === usage.message.id && m.flags[MOD]?.obrona);
    const damageMsg = game.messages.contents.findLast(m => m._source.system?.origin === usage.message.id && m.type === "damage");
    return { visible: target.visible, verdict: attackMsg?.flags[MOD].obrona.targets?.[0]?.verdict ?? null, damageMessage: damageMsg?.id ?? null };
  } finally {
    __e2e.restoreDice();
    canvas.tokens.setTargets([]);
  }
}

/** GM: a damage card applied like dnd5e's tray, or explicit `damages`; HP before/after. */
async function obrazenia({ uuid, messageId = null, damages = null }) {
  const target = fromUuidSync(uuid);
  const before = target.system.attributes.hp.value;
  const message = messageId ? game.messages.get(messageId) : null;
  const list = message
    ? dnd5e.dice.aggregateDamageRolls(message.rolls, { respectProperties: true }).map(r => ({
      value: Math.max(0, r.total), type: r.options.type, properties: new Set(r.options.properties ?? [])
    }))
    : damages.map(d => ({ ...d, properties: new Set(d.properties ?? []) }));
  await target.applyDamage(list, { isDelta: true, ...(message ? { origin: message } : {}) });
  await __e2e.until(() => target.system.attributes.hp.value !== before, { timeoutMs: 4000 }).catch(() => {});
  return { before, after: target.system.attributes.hp.value, rolled: list.reduce((s, d) => s + d.value, 0) };
}

/** GM: wait for the destruction card of `tokenId`. */
async function kartaDla({ tokenId }) {
  const MOD = "neuroshima-2026-overrides";
  const msg = await __e2e.until(() => game.messages.contents.findLast(m => m.flags?.[MOD]?.kartaZniszczenia?.tokenId === tokenId),
    { timeoutMs: 6000, message: "the destruction card" }).catch(() => null);
  return msg ? { id: msg.id, buttons: [...msg.content.matchAll(/data-neuro-obiekt="(\w+)"/g)].map(m => m[1]),
    tiled: msg.content.includes("Tiled"), whisperedToGm: msg.whisper.length > 0 && msg.whisper.every(id => game.users.get(id)?.isGM) } : null;
}

/** GM: press a button on the destruction card; the scene's state after it. */
async function zniszcz({ messageId, akcja, doorId, tokenId }) {
  const MOD = "neuroshima-2026-overrides";
  const scene = canvas.scene;
  const clicked = await __e2e.clickChat(messageId, `button[data-neuro-obiekt="${akcja}"]`);
  await __e2e.until(() => game.messages.get(messageId)?.flags?.[MOD]?.kartaZniszczenia?.zrobione, { timeoutMs: 6000 }).catch(() => {});
  await __e2e.quiet();
  const pamiec = scene.getFlag(MOD, "zniszczenia") ?? [];
  const z = game.neuroshima.obiekty.zniszczoneIds(scene);
  const disabled = [...(ui.chat.element.querySelectorAll(`[data-message-id="${messageId}"] button[data-neuro-obiekt]`) ?? [])].every(b => b.disabled);
  return {
    clicked, wall: scene.walls.has(doorId), token: scene.tokens.has(tokenId),
    iksy: scene.drawings.filter(d => d.flags?.[MOD]?.obiektX).length,
    pamiec: pamiec.map(p => ({ id: p.id, typ: p.typ, akcja: p.akcja, ids: p.ids })), skip: z.sciany.has(doorId), disabled
  };
}

/** Player: both X lines visible on their canvas (U12). */
function iksyGracza() {
  const MOD = "neuroshima-2026-overrides";
  return canvas.drawings.placeables.filter(d => d.document.flags?.[MOD]?.obiektX && d.visible).length === 2 ? true : null;
}

/** GM: a map update preview with the door in the export — the remembered wall is skipped (U11). */
async function aktualizacjaMapy({ doorId }) {
  const MOD = "neuroshima-2026-overrides";
  const wall = (id, c, door = 0) => ({ _id: id, c, door, flags: { [MOD]: { source: door ? "door" : "wall" } } });
  const raport = await game.neuroshima.maps.update("E2E-OBIEKT", {
    podglad: true, dane: { walls: [wall(doorId, [1350, 1100, 1450, 1100], 1), wall("e2eObiektMur01", [0, 0, 100, 0])] }
  });
  return { pominiete: raport?.zniszczonePominiete ?? null, wstawiane: raport?.scianyWstawiane ?? null };
}

/** GM: „Zniszczenia” → Przywróć on the only row, then close. */
async function przywroc({ doorId }) {
  const MOD = "neuroshima-2026-overrides";
  const scene = canvas.scene;
  const run = game.neuroshima.obiekty.oknoZniszczen(scene);
  const app = await __e2e.until(() => __e2e.findApps({ title: "Zniszczenia", action: "zamknij" })[0], { message: "the Zniszczenia window" });
  const rows = app.element.querySelectorAll(".neuro-zniszczenia li[data-id]").length;
  app.element.querySelector('.neuro-zniszczenia button[data-a="przywroc"]').click();
  await __e2e.until(() => scene.walls.has(doorId), { timeoutMs: 6000 }).catch(() => {});
  await __e2e.quiet();
  await __e2e.clickDialog({ title: "Zniszczenia" }, "zamknij");
  await run;
  const w = scene.walls.get(doorId);
  return { rows, wall: !!w, source: w?.flags?.[MOD]?.source ?? null, iksy: scene.drawings.filter(d => d.flags?.[MOD]?.obiektX).length,
    pamiec: (scene.getFlag(MOD, "zniszczenia") ?? []).length };
}

/** GM: a rectangle drawing to anchor a fragile object on. */
async function rysunek() {
  const [d] = await canvas.scene.createEmbeddedDocuments("Drawing", [{
    x: 500, y: 1500, author: game.user.id, text: "Wazon",
    shape: { type: "r", width: 100, height: 100 }, strokeColor: "#ffffff", strokeWidth: 2
  }]);
  return d.id;
}

export default {
  name: "obiekt",
  clients: ["gm", "Gracz 1"],

  async run(t) {
    const p1 = t.client("Gracz 1");
    await t.waitFor(p1, () => Boolean(game.user.character && canvas.tokens?.placeables.some(tk => tk.isOwner)),
      { message: "the player's client to see the fixture" });

    let door = null;
    await t.step("GM: the shed door as an exported wall, Gracz 1 south of it", async () => {
      door = await t.gm.eval(przygotuj);
      t.assert(door.doorId, "the skirmish shed has a door", door);
    });

    let obj = null;
    await t.step("GM: door selected → „Ufizycznij” defaults to the door template (U10); a frame token on the door", async () => {
      const r = await t.gm.eval(ufizycznij, { layer: "walls", ids: [door.doorId] });
      t.equal(r.pola.szablon, "drzwi", "template from the exporter's wall class");
      t.equal(r.pola.material, "drewno", "material");
      t.equal(r.pola.rozmiar, "sredni", "size");
      t.assert(r.token, "no object token", r);
      t.equal(r.token.obiekt, true, "token actor is an object");
      t.equal(r.token.linked, false, "unlinked token — a delta per object");
      t.equal(r.token.ac, 15, "TT from the material (drewno, s. 253)");
      t.equal(r.token.hp, 18, "PW: Średni × wytrzymały (s. 253)");
      t.equal(r.token.size, "med", "dnd5e size");
      t.equal(JSON.stringify(r.token.di), JSON.stringify(["poison", "psychic"]), "immune to poison and psychic");
      t.equal(r.token.x + 50, door.mid.x, "centred on the door (x)");
      t.equal(r.token.y + 50, door.mid.y, "centred on the door (y)");
      obj = r.token;
    });

    await t.step("the object's saving throw fails automatically (s. 254)", async () => {
      const r = await t.gm.eval(rzutObronny, { uuid: obj.uuid });
      t.assert(r.total !== null && r.total < 0, "the save was not an automatic failure", r);
      t.assert(/automatyczna porażka/.test(r.flavor), "flavor names the rule", r);
    });

    await t.step("Gracz 1 shoots the door; the GM applies the card like the tray — PW go down", async () => {
      await t.gm.eval(async ({ uuid }) => {
        const a = fromUuidSync(uuid);
        await a.update({ "system.attributes.hp.max": 60, "system.attributes.hp.value": 60 });
      }, { uuid: obj.uuid });
      await t.waitFor(p1, ({ name }) => canvas.tokens.placeables.some(tk => tk.name === name && tk.visible) ? true : null,
        { args: [{ name: obj.name }], message: "the player to see the object" });
      const s = await p1.eval(strzal, { targetName: obj.name });
      t.equal(s.visible, true, "the object is visible to the player");
      t.assert(["krytyk", "trafienie"].includes(s.verdict), "the shot did not hit TT 15", s);
      t.assert(s.damageMessage, "no damage card", s);
      const r = await t.gm.eval(obrazenia, { uuid: obj.uuid, messageId: s.damageMessage });
      t.assert(r.after < r.before, "no damage applied to the object", r);
      await t.quiet();
    });

    await t.step("`burząca` doubles damage to an object (s. 117)", async () => {
      const r = await t.gm.eval(obrazenia, { uuid: obj.uuid, damages: [{ value: 6, type: "bludgeoning", properties: ["burzaca"] }] });
      t.equal(r.before - r.after, 12, "6 burzącej → 12");
    });

    let card = null;
    await t.step("0 PW → a whispered GM card: Otwórz drzwi / Usuń przegrodę / Zostaw, with the Tiled note", async () => {
      await t.gm.eval(obrazenia, { uuid: obj.uuid, damages: [{ value: 200, type: "bludgeoning" }] });
      card = await t.gm.eval(kartaDla, { tokenId: obj.id });
      t.assert(card, "no destruction card");
      t.equal(JSON.stringify(card.buttons), JSON.stringify(["otworz", "usunPrzegrode", "zostaw"]), "buttons for a door");
      t.equal(card.tiled, true, "exported wall → the Tiled note");
      t.equal(card.whisperedToGm, true, "whispered to the GM only");
    });

    await t.step("„Usuń przegrodę”: wall and token gone, an X, the wall remembered (U11); buttons spent", async () => {
      const r = await t.gm.eval(zniszcz, { messageId: card.id, akcja: "usunPrzegrode", doorId: door.doorId, tokenId: obj.id });
      t.equal(r.clicked, true, "button clicked");
      t.equal(r.wall, false, "door wall removed");
      t.equal(r.token, false, "object token removed");
      t.equal(r.iksy, 2, "X = two line drawings");
      t.equal(r.pamiec.length, 1, "one remembered destruction");
      t.equal(r.skip, true, "zniszczoneIds lists the door");
      t.equal(r.disabled, true, "card buttons disabled after use");
      await t.waitFor(p1, iksyGracza, { message: "the player to see the X (U12)" });
    });

    await t.step("map update preview skips the destroyed wall (U11)", async () => {
      const r = await t.gm.eval(aktualizacjaMapy, { doorId: door.doorId });
      t.equal(r.pominiete, 1, "one exported wall skipped");
      t.equal(r.wstawiane, 1, "the other wall still comes in");
    });

    await t.step("„Zniszczenia” → Przywróć: the door is back with its exporter flag, X gone, memory empty", async () => {
      const r = await t.gm.eval(przywroc, { doorId: door.doorId });
      t.equal(r.rows, 1, "one row in the window");
      t.equal(r.wall, true, "door wall restored (same id)");
      t.equal(r.source, "door", "exporter flag kept");
      t.equal(r.iksy, 0, "X removed");
      t.equal(r.pamiec, 0, "memory empty");
    });

    await t.step("a drawing marked „Kruchy — zniszcz od razu”: no token, card → Usuń rysunek", async () => {
      const drawingId = await t.gm.eval(rysunek);
      const r = await t.gm.eval(ufizycznij, { layer: "drawings", ids: [drawingId], button: "kruchy" });
      t.equal(r.token, null, "no token for a fragile object");
      t.assert(r.card, "no destruction card", r);
      t.equal(JSON.stringify(r.card.buttons), JSON.stringify(["usunRysunek", "zostaw"]), "buttons for a drawing");
      const z = await t.gm.eval(async ({ messageId, drawingId }) => {
        await __e2e.clickChat(messageId, 'button[data-neuro-obiekt="usunRysunek"]');
        await __e2e.until(() => !canvas.scene.drawings.has(drawingId), { timeoutMs: 6000 }).catch(() => {});
        await __e2e.quiet();
        return { gone: !canvas.scene.drawings.has(drawingId), pamiec: (canvas.scene.getFlag("neuroshima-2026-overrides", "zniszczenia") ?? []).length };
      }, { messageId: r.card.id, drawingId });
      t.equal(z.gone, true, "drawing removed");
      t.equal(z.pamiec, 0, "not an export — nothing remembered");
    });
  }
};
