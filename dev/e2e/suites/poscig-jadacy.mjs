/**
 * Suite — jadący na planszy pościgu (PLAN_m4_pojazdy §6.2, P3; D22, D24–D27). GM + two players:
 *
 *  - Gracz 1 boards a linked Osobówka as the driver on the skirmish map (part 1, through the GM relay).
 *  - GM: a new folded-road board, a raider Hammer three lanes ahead; Ctrl+X the crewed car on the map, Ctrl+V on the
 *    board (E11) — the car arrives at true scale (210 × 105 px) facing right, the driver seated at the board's seat
 *    size; the role card gives the pasted car a chase role.
 *  - Players on the board: Gracz 1 (inside) may X-ray its car, Gracz 2 sees one dot and no rider.
 *  - Gracz 1 changes seats in the same row: on the board the car always moves — the card says so (§6.2.5).
 *  - GM: the driver's range to the Hammer is road metres (lanes × 36 m), not drawn pixels (D27).
 *  - Gracz 1 drives one lane on: the driver rides along, no driving card, no turning (D25 board rules).
 *  - GM: an aimed Miażdżąca seria from the driver hits the riders of two raider cars ahead and both cars; a grenade
 *    on one car hits only it; suppressive fire laid on the Hammer is pinned to it and rides along (D28, D29, D31).
 */

/* Functions below run in the browser (serialised): no closures over this file. */

async function przygotuj() {
  const MOD = "neuroshima-2026-overrides";
  const P = game.neuroshima.pojazdy;
  for (const c of [...game.combats]) await c.delete();
  for (const a of game.actors.filter(a => a.getFlag(MOD, "e2ePoscigJadacy"))) await a.delete();
  const a = await P.utworzZKatalogu("osobowka", { nazwa: "Osobówka pościgu" });
  await a.update({ "prototypeToken.actorLink": true, [`flags.${MOD}.e2ePoscigJadacy`]: true });
  const scene = canvas.scene;
  const td = await a.getTokenDocument({ x: 300, y: 1150, rotation: 270 });
  const [v] = await scene.createEmbeddedDocuments("Token", [td.toObject()]);
  await P.utworzKluczyki(v);
  const pc = scene.tokens.find(t => t.name === "PC Gracz 1");
  await scene.moveTokens({ [pc.id]: { destination: { x: 300, y: 1300, action: "displace" } } }, { animate: false });
  return { mapa: scene.id, pojazd: v.uuid, jadacy: pc.uuid, aktor: a.id, pcAktor: pc.actorId };
}

async function wsiadz({ pojazd, jadacy }) {
  const P = game.neuroshima.pojazdy;
  const v = await fromUuid(pojazd), me = await fromUuid(jadacy);
  await P.wsiadz(v, me, "kabina-0-0");
  await window.__e2e.until(() => me.flags?.["neuroshima-2026-overrides"]?.jazda?.miejsce === "kabina-0-0", { message: "seated" });
  await window.__e2e.until(() => v.actor.isOwner, { message: "presence ownership" });
  return { miejsce: me.flags["neuroshima-2026-overrides"].jazda.miejsce };
}

async function naPlansze({ mapa, aktor, pcAktor }) {
  const MOD = "neuroshima-2026-overrides";
  const C = game.neuroshima.poscig, P = game.neuroshima.pojazdy;
  for (const s of game.scenes.filter(s => s.name.startsWith("Pościg e2e"))) await s.delete();
  const hammer = await P.utworzZKatalogu("hammer", { nazwa: "Hammer bandytów" });
  await hammer.setFlag(MOD, "e2ePoscigJadacy", true);
  const plansza = await C.start({ nazwa: "Pościg e2e", aktywuj: false });
  await C.dodajPojazd(plansza, hammer.id, { tor: 6, rola: "scigajacy" });
  // Ctrl+X na mapie (jadący dołączają do schowka) → Ctrl+V na planszy.
  await game.scenes.get(mapa).view();
  await window.__e2e.until(() => canvas.ready && canvas.scene.id === mapa, { message: "map viewed" });
  const v = canvas.scene.tokens.find(t => t.actorId === aktor);
  canvas.tokens.releaseAll();
  v.object.control({ releaseOthers: true });
  const schowek = canvas.tokens.copyObjects({ cut: true }).map(o => o.document.name);
  await plansza.view();
  await window.__e2e.until(() => canvas.ready && canvas.scene.id === plansza.id, { message: "board viewed" });
  const n0 = game.messages.size;
  await canvas.tokens.pasteObjects({ x: C.torX(3), y: 650 });
  const auto = () => plansza.tokens.find(t => t.actorId === aktor);
  const pc = () => plansza.tokens.find(t => t.actorId === pcAktor);
  await window.__e2e.until(() => auto() && pc() && P.pojazdJadacego(pc())?.id === auto().id, { message: "crew re-linked on the board" });
  await window.__e2e.until(() => game.messages.contents.slice(n0).some(m => /Rola w pościgu/.test(m.content)), { message: "role card" });
  await C.ustawRole(auto(), "scigany");
  await plansza.activate();
  await window.__e2e.quiet({ idleMs: 600 });
  const g = plansza.grid.size, a = auto(), r = pc();
  return {
    plansza: plansza.id, pojazd: a.uuid, jadacy: r.uuid, hammer: plansza.tokens.find(t => t.actorId === hammer.id).uuid, schowek,
    px: [Math.round(a.width * g), Math.round(a.height * g)], rot: a.rotation, tor: C.xNaTor(a.x + a.width * g / 2),
    jadacyPx: Math.round(r.width * g), naMapie: game.scenes.get(mapa).tokens.filter(t => t.actorId === aktor || t.actorId === pcAktor).length,
    tryb: P.trybSceny(plansza)
  };
}

function widok({ pojazd, jadacy, plansza }) {
  const P = game.neuroshima.pojazdy;
  const v = fromUuidSync(pojazd), me = fromUuidSync(jadacy);
  return { scena: canvas.scene?.id === plansza, kropki: v.object?.neuroKropki?.children?.length ?? 0,
    jadacyWidoczny: !!me.object?.visible, przeswietlenie: P.mozePrzeswietlic(v) };
}

async function przesiadka({ jadacy }) {
  const P = game.neuroshima.pojazdy;
  const me = await fromUuid(jadacy);
  const n0 = game.messages.size;
  await P.przesiadz(me, "kabina-0-1", { tryb: "ostroznie" });
  await window.__e2e.until(() => me.flags?.["neuroshima-2026-overrides"]?.jazda?.miejsce === "kabina-0-1", { message: "moved seats" });
  await window.__e2e.until(() => game.messages.contents.slice(n0).some(m => /Przesiadka/.test(m.content)), { message: "seat-change card" });
  const karta = game.messages.contents.slice(n0).find(m => /Przesiadka/.test(m.content));
  return { tekst: karta.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ") };
}

async function zasieg({ jadacy, hammer }) {
  const MOD = "neuroshima-2026-overrides";
  const C = game.neuroshima.poscig;
  const me = fromUuidSync(jadacy), h = fromUuidSync(hammer);
  const ok = await import(`/modules/${MOD}/scripts/combat/okolicznosci.mjs`);
  const g = canvas.grid.size;
  const tor = d => C.xNaTor(d.x + d.width * g / 2);
  const a = me.object.center, b = h.object.center;
  const auto = me.parent.tokens.get(me.flags[MOD].jazda.pojazd);
  return { roznicaTorow: tor(h) - tor(auto),
    linijka: canvas.grid.measurePath([a, b]).distance, krawedz: ok.odlegloscKrawedzi(me, h),
    piksele: Math.hypot(b.x - a.x, b.y - a.y) / (g / canvas.grid.distance) };
}

async function zmianaToru({ pojazd, jadacy }) {
  const P = game.neuroshima.pojazdy, C = game.neuroshima.poscig;
  const v = await fromUuid(pojazd), me = await fromUuid(jadacy);
  const n0 = game.messages.size, rot0 = v.rotation, g = v.parent.grid.size;
  const tor0 = C.xNaTor(v.x + v.width * g / 2);
  await v.move([{ x: v._source.x + C.LANE_W, y: v._source.y }], { method: "dragging" });
  await v.object?.movementAnimationPromise;
  await window.__e2e.until(() => C.xNaTor(v._source.x + v.width * g / 2) === tor0 + 1, { message: "one lane on" });
  await window.__e2e.quiet({ idleMs: 800 });
  const c = me.getCenterPoint(me._source);
  const wSrodku = P.geometria.punktWPojezdzie(c, v.getCenterPoint(v._source), P.danePojazdu(v.actor).obrys, v._source.rotation,
    P.kratkaPojazdu(v.parent), 0.01);
  return { tor0, tor: C.xNaTor(v._source.x + v.width * g / 2), rot0, rot: v.rotation, wSrodku,
    jazda: game.messages.contents.slice(n0).some(m => /Jazda:/.test(m.content)) };
}

async function seriaIObszary({ plansza, hammer, pcAktor }) {
  const MOD = "neuroshima-2026-overrides";
  const P = game.neuroshima.pojazdy, C = game.neuroshima.poscig;
  const scena = game.scenes.get(plansza), g = scena.grid.size, lvl = scena.levels.contents[0].id;
  if (canvas.scene?.id !== plansza) { await scena.view(); await window.__e2e.until(() => canvas.ready && canvas.scene?.id === plansza, { message: "board viewed" }); }
  const h = fromUuidSync(hammer);
  const pc = scena.tokens.find(t => t.actorId === pcAktor);
  const nasz = P.pojazdJadacego(pc);
  // Drugi wóz bandytów tor za Hammerem, w tym samym rzędzie co nasz — konwój przed lufą.
  const drugi = await P.utworzZKatalogu("osobowka", { nazwa: "Osobówka bandytów" });
  await drugi.setFlag(MOD, "e2ePoscigJadacy", true);
  await C.dodajPojazd(scena, drugi.id, { tor: C.xNaTor(h.x + h.width * g / 2) + 1, rola: "scigany" });
  const d = scena.tokens.find(t => t.actorId === drugi.id);
  for (const t of [h, d]) await t.update({ y: nasz.y + (nasz.height - t.height) * g / 2 }, { animate: false });
  const bandyci = [];
  for (const [n, auto] of [["Bandyta z Hammera", h], ["Bandyta z Osobówki", d]]) {
    const a = await Actor.implementation.create({ name: n, type: "npc", flags: { [MOD]: { e2ePoscigJadacy: true } }, prototypeToken: { actorLink: true } });
    const [t] = await scena.createEmbeddedDocuments("Token", [(await a.getTokenDocument({ x: auto.x, y: auto.y, level: lvl })).toObject()]);
    await P.posadz(auto, t);
    bandyci.push(t);
  }
  await window.__e2e.quiet({ idleMs: 600 });
  const tekst = m => m.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  // Miażdżąca seria kierowcy (aktywność jak z karty broni: typ, nazwa, aktor, szablon 150 × 3 m).
  const n0 = game.messages.size;
  const odwolany = Hooks.call("dnd5e.preCreateMeasuredTemplate",
    { type: "neuroMs", name: "Miażdżąca seria", actor: pc.actor, target: { template: { size: "150", width: "3" } } }, {}) === false;
  await window.__e2e.quiet({ idleMs: 300 });
  const cel = canvas.clientCoordinatesFromCanvas(d.getCenterPoint(d._source));
  canvas.app.view.dispatchEvent(new PointerEvent("pointerdown", { clientX: cel.x, clientY: cel.y, button: 0, bubbles: true }));
  await window.__e2e.until(() => game.messages.contents.slice(n0).some(m => /trafieni na drodze/.test(m.content)), { message: "burst hit card" });
  const seria = tekst(game.messages.contents.slice(n0).find(m => /trafieni na drodze/.test(m.content)));
  // Granat 3 m na Hammerze.
  const n1 = game.messages.size;
  const ch = h.getCenterPoint(h._source);
  await C.serie.zglosWybuch(scena, { x: ch.x, y: ch.y, area: { kind: "circle", radius: 3, label: "Koło 6 m" }, itemName: "Granat" });
  const wybuch = tekst(game.messages.contents.slice(n1).find(m => /w obszarze na drodze/.test(m.content)));
  // Ogień zaporowy położony na Hammerze — przypięty, jedzie z nim (D29).
  const dane = [{ name: "OZ e2e", shapes: [{ type: "circle", x: Math.round(ch.x), y: Math.round(ch.y), radius: 140, gridBased: false }] }];
  // Ten sam krok co hak `dnd5e.createMeasuredTemplate` przy prawdziwej aktywności OZ (bez reszty haków ognia zaporowego).
  C.serie.przypnijStrefe({ type: "neuroOz" }, dane);
  const [reg] = await scena.createEmbeddedDocuments("Region", dane);
  const x0 = reg.shapes[0].x;
  await h.update({ x: h.x - C.LANE_W }, { animate: false });
  await window.__e2e.until(() => reg.shapes[0].x === x0 - C.LANE_W, { message: "zone rode with the Hammer" });
  // Jadących przestawia MG po ruchu pojazdu (zapis po ruchu) — dopiero potem pytamy strefę.
  await window.__e2e.until(() => P.geometria.punktWPojezdzie(bandyci[0].getCenterPoint(bandyci[0]._source), h.getCenterPoint(h._source),
    P.danePojazdu(h.actor).obrys, h._source.rotation, P.kratkaPojazdu(scena), 0.01), { message: "the Hammer's rider re-seated" });
  const przypiety = reg.attachment?.token;   // pole dokumentu: rozwiązany TokenDocument, nie id
  return { odwolany, seria, wybuch, przypieta: (przypiety?.id ?? przypiety) === h.id,
    wStrefie: C.serie.regionZawieraNaDrodze(reg, bandyci[0]), pozaStrefa: C.serie.regionZawieraNaDrodze(reg, bandyci[1]) };
}

export default {
  name: "poscig-jadacy",
  clients: ["gm", "Gracz 1", "Gracz 2"],

  async run(t) {
    const p1 = t.client("Gracz 1");
    const p2 = t.client("Gracz 2");
    await t.waitFor(p1, () => Boolean(game.user.character && canvas.ready), { message: "Gracz 1's client" });
    await t.waitFor(p2, () => Boolean(canvas.ready), { message: "Gracz 2's client" });

    let s;
    await t.step("Gracz 1 boards a linked Osobówka as the driver on the map", async () => {
      s = await t.gm.eval(przygotuj);
      const r = await p1.eval(wsiadz, { pojazd: s.pojazd, jadacy: s.jadacy });
      t.equal(r.miejsce, "kabina-0-0", "driver's seat");
    });

    let b;
    await t.step("GM: Ctrl+X on the map, Ctrl+V on a new board — true scale, crew seated (E11, D24)", async () => {
      b = await t.gm.eval(naPlansze, { mapa: s.mapa, aktor: s.aktor, pcAktor: s.pcAktor });
      t.equal(b.tryb, "plansza", "board mode");
      t.equal(b.schowek.length, 2, "the rider joined the clipboard");
      t.equal(b.naMapie, 0, "car and rider left the map");
      t.equal(`${b.px[0]}x${b.px[1]}`, "231x116", "Osobówka 3 × 1,5 squares ×1,1 (D45) facing right, 70 px per 1,5 m");
      t.equal(b.rot, 270, "facing right");
      t.equal(b.tor, 3, "on lane 3");
      t.equal(b.jadacyPx, 35, "rider at the seat size");
    });

    await t.step("players on the board: Gracz 1 may X-ray its car, Gracz 2 sees a dot and no rider (D3, D26)", async () => {
      for (const c of [p1, p2]) await t.waitFor(c, id => canvas.ready && canvas.scene?.id === id, { args: [b.plansza], message: "board active" });
      await t.waitFor(p2, u => Boolean(fromUuidSync(u)?.object?.neuroKropki?.children?.length), { args: [b.pojazd], message: "dots on Gracz 2" });
      const r1 = await p1.eval(widok, b);
      const r2 = await p2.eval(widok, b);
      t.equal(r1.przeswietlenie, true, "inside: X-ray");
      t.equal(r2.kropki, 1, "outside: one dot");
      t.equal(r2.jadacyWidoczny, false, "outside: rider hidden");
      t.equal(r2.przeswietlenie, false, "outside: no X-ray");
      await t.screenshot("Gracz 2", "plansza kropki");
    });

    await t.step("Gracz 1 changes seats in the same row: on the board the car always moves (§6.2.5)", async () => {
      const r = await p1.eval(przesiadka, b);
      t.assert(/Pojazd jedzie/.test(r.tekst), "seat-change card treats the car as moving", r.tekst);
    });

    await t.step("GM: the rider's range to the Hammer is road metres, not drawn pixels (D27)", async () => {
      const r = await t.gm.eval(zasieg, b);
      t.equal(r.roznicaTorow, 3, "three lanes apart");
      t.assert(Math.abs(r.linijka - 108) < 12, "ruler ≈ 3 × 36 m", r);
      t.assert(Math.abs(r.krawedz - 108) < 15, "edge distance ≈ 3 × 36 m", r);
      t.assert(r.piksele < 30, "drawn pixels would have said under 30 m", r);
    });

    await t.step("Gracz 1 drives one lane on: the driver rides along, no driving card, no turning", async () => {
      const r = await p1.eval(zmianaToru, b);
      t.equal(r.tor, r.tor0 + 1, "one lane on");
      t.equal(r.rot, r.rot0, "no turning on the board");
      t.equal(r.wSrodku, true, "driver still inside");
      const jazda = await t.gm.eval(() => game.messages.contents.slice(-5).some(m => /Jazda:/.test(m.content)));
      t.equal(jazda, false, "no driving card on the board");
    });

    await t.step("GM: aimed Miażdżąca seria rakes two cars ahead; a grenade hits one car; suppressive fire rides along (D28, D29)", async () => {
      const r = await t.gm.eval(seriaIObszary, { plansza: b.plansza, hammer: b.hammer, pcAktor: s.pcAktor });
      t.equal(r.odwolany, true, "dnd5e line placement replaced by aiming on the board");
      t.assert(/Bandyta z Hammera/.test(r.seria) && /Bandyta z Osobówki/.test(r.seria), "burst hits riders of both cars", r.seria);
      t.assert(/Pojazdy na linii: .*Hammer bandytów.*Osobówka bandytów|Pojazdy na linii: .*Osobówka bandytów.*Hammer bandytów/.test(r.seria), "both cars on the line", r.seria);
      const listy = (r.seria.match(/Trafieni:[^.]*\.|Pojazdy na linii:[^—]*/g) ?? []).join(" ");
      t.assert(!/PC Gracz 1|Osobówka pościgu/.test(listy), "the shooter's own car is left out", r.seria);
      t.assert(/Bandyta z Hammera/.test(r.wybuch) && !/Bandyta z Osobówki/.test(r.wybuch), "grenade: the Hammer only", r.wybuch);
      t.equal(r.przypieta, true, "zone pinned to the Hammer");
      t.equal(r.wStrefie, true, "the Hammer's rider is in the zone after the lane change");
      t.equal(r.pozaStrefa, false, "the other car's rider is not");
    });
  }
};
