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
 *  - [Złóż] → the token is gone, the handle is folded again, 25 kg.
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
    });

    // The fixture reseeds only its own flagged documents; the drone and its folder are this suite's.
    await t.gm.eval(async () => {
      for (const a of game.actors.filter(x => x.flags?.["neuroshima-2026-overrides"]?.towarzysz?.rodzaj?.startsWith("dron"))) await a.delete();
      const f = game.folders.find(x => x.type === "Actor" && x.name === "Drony" && !x.contents.length);
      if (f) await f.delete();
    });
  }
};
