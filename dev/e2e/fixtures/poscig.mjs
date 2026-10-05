/** Isolated chase board: six lane-centred vehicles and two negative controls. */
export default async function poscig({ moduleId }) {
  const flag = { [moduleId]: { fixture: "poscig" } };
  for (const collection of [game.scenes, game.actors]) {
    const ids = collection.filter(d => d.getFlag(moduleId, "fixture") === "poscig").map(d => d.id);
    if (ids.length) await collection.documentClass.deleteDocuments(ids);
  }
  const p = await import(`/modules/${moduleId}/scripts/scenes/poscig.mjs`);
  const players = game.users.filter(u => !u.isGM);
  const actors = await Actor.implementation.create(Array.from({ length: 8 }, (_, i) => ({
    name: i < 6 ? `Pojazd ${i + 1}` : i === 6 ? "Między torami" : "Strefa swobodna",
    type: "vehicle",
    ownership: { default: 0, ...Object.fromEntries(players.map(u => [u.id, 3])) },
    img: `modules/${moduleId}/ui/poscig/vehicles/${i === 1 ? "scout" : i === 2 ? "van" : "truck"}.webp`,
    prototypeToken: { actorLink: true, texture: { src: `modules/${moduleId}/ui/poscig/vehicles/${i === 1 ? "scout" : i === 2 ? "van" : "truck"}.webp` }, rotation: 37 },
    flags: { [moduleId]: { fixture: "poscig", poscigFacingOffset: i === 1 ? 90 : i === 2 ? 180 : 0 } }
  })));
  const data = p.daneSceny({ nazwa: "Agent · Pościg", tory: 12, srodowisko: "otwarte" });
  data.flags[moduleId].fixture = "poscig";
  const scene = await Scene.implementation.create(data);
  const tokens = [];
  for (const actor of actors) {
    const i = Number(actor.name.match(/\d+/)?.[0] ?? 0);
    const between = actor.name === "Między torami";
    const free = actor.name === "Strefa swobodna";
    tokens.push((await actor.getTokenDocument({
      width: 1, height: 1, level: scene.levels.contents[0].id,
      x: p.torX(i ? 2 + i : 9) - p.LANE_W / 2,
      y: free ? 1550 : between ? 960 : 520 + (i % 2) * 260,
      flags: { [moduleId]: { fixture: "poscig", poscigRola: i > 3 ? "scigany" : "scigajacy" } },
      sight: { enabled: false }
    })).toObject());
  }
  await scene.createEmbeddedDocuments("Token", tokens);
  const between = scene.tokens.getName("Między torami");
  await between.update({ x: between.x + 55 }, { animate: false });
  for (const user of players) await user.update({ character: actors.find(a => a.name === "Pojazd 1").id });
  if (game.paused) game.togglePause(false, { broadcast: true });
  await scene.activate();
  return { scene: { id: scene.id, name: scene.name, tokens: scene.tokens.size } };
}
