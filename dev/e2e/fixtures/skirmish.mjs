/**
 * Fixture "skirmish" — the first sandbox world seed (PLAN_agentic_improvements.md §5 C).
 *
 * Runs in a GM page of an agent sandbox world (`fvtt world:create <slug> --fixture=skirmish`,
 * or `fvtt world:seed --fixture=skirmish`). Never in the campaign: fvtt refuses that.
 *
 * Builds: one active scene (grid, a shed of walls with a door), one PC per player (owned by
 * them, set as their character) carrying a 9 mm pistol, matching ammo and a grenade from the
 * module's compendia, and two Bestiariusz NPCs — all with tokens on the scene. Everything it
 * creates carries `flags.<module>.fixture = "skirmish"`, and a rerun deletes exactly that first,
 * so the world always starts identical. Picks come from the compendia by flag, not by name, and
 * the summary says what was picked, so a renamed item shows up as a changed pick, not a crash.
 */

const NAME = "skirmish";

export default async function skirmish({ moduleId }) {
  const flag = { [moduleId]: { fixture: NAME } };
  const mine = doc => doc.getFlag(moduleId, "fixture") === NAME;

  for (const collection of [game.scenes, game.actors]) {
    const ids = collection.filter(mine).map(d => d.id);
    if (ids.length) await collection.documentClass.deleteDocuments(ids);
  }

  // The module's own magazine model, so the gun is loaded exactly as the load window does it.
  const mags = await import(`/modules/${moduleId}/scripts/weapons/magazine-model.mjs`);

  const packDocs = async name => (await game.packs.get(`${moduleId}.${name}`)?.getDocuments()) ?? [];
  const [weapons, ammo, grenades, bestiary, magazines] = await Promise.all(
    ["bron", "amunicja", "granaty", "bestiariusz", "magazynki"].map(packDocs));
  const weapon = weapons.find(i => i.getFlag(moduleId, "weaponId") === "b92") ?? weapons.find(i => i.type === "weapon");
  const rounds = ammo.find(i => i.getFlag(moduleId, "caliber") === "9mm");
  const grenade = grenades[0];
  const magwell = weapon ? mags.weaponMagwell(weapon) : null;
  const magazine = magazines.find(m => magwell && mags.magazineDefOf(m)?.magwell === magwell);
  const npcSources = [/ŻOŁNIERZ/i, /CYWIL/i].map(re => bestiary.find(a => re.test(a.name))).filter(Boolean);

  const levelId = foundry.documents.BaseScene.metadata.defaultLevelId; // tokens point here (v14)
  const grid = 100;
  const scene = await Scene.implementation.create({
    name: "Agent · Potyczka", width: 30 * grid, height: 20 * grid, padding: 0,
    grid: { type: CONST.GRID_TYPES.SQUARE, size: grid },
    tokenVision: true,
    environment: { darknessLevel: 0, globalLight: { enabled: true, bright: true } },
    initialLevel: levelId,
    levels: [{ _id: levelId, name: "Teren", elevation: { bottom: 0, top: null }, background: { src: null, color: "#4a4636" } }],
    flags: flag
  });
  await scene.activate();

  // A 4 × 3 shed at (12, 8) with a door in its south wall.
  const c = n => n * grid;
  const wall = (x1, y1, x2, y2, door = 0) => ({ c: [c(x1), c(y1), c(x2), c(y2)], door });
  await scene.createEmbeddedDocuments("Wall", [
    wall(12, 8, 16, 8), wall(16, 8, 16, 11), wall(16, 11, 14.5, 11), wall(14.5, 11, 13.5, 11, CONST.WALL_DOOR_TYPES.DOOR),
    wall(13.5, 11, 12, 11), wall(12, 11, 12, 8)
  ]);

  const players = game.users.filter(u => !u.isGM);
  const kit = [weapon, rounds, grenade, magazine].filter(Boolean).map(d => game.items.fromCompendium(d));
  const pcs = [];
  const loaded = [];
  for (const user of players) {
    const actor = await Actor.implementation.create({
      name: `PC ${user.name}`, type: "character",
      ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE, [user.id]: CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER },
      system: { abilities: Object.fromEntries(["str", "dex", "con", "int", "wis", "cha"].map(k => [k, { value: 12 }])) },
      prototypeToken: { actorLink: true, sight: { enabled: true } },
      flags: flag
    });
    if (kit.length) await actor.createEmbeddedDocuments("Item", kit);
    const gun = actor.items.find(i => i.type === "weapon");
    const mag = actor.items.find(i => mags.isMagazineItem(i));
    if (gun && mag) {
      const n = await mags.loadRounds(mag, "9mm", mags.freeSpace(mag));
      await mags.swapMagazineItem(gun, mag);
      loaded.push(`${actor.name}: ${n} + chamber=${mags.readState(gun).chamber ?? "empty"}`);
    }
    await user.update({ character: actor.id });
    pcs.push(actor);
  }

  const npcs = npcSources.length ? await Actor.implementation.create(npcSources.map(src => {
    const data = game.actors.fromCompendium(src);
    data.flags = foundry.utils.mergeObject(data.flags ?? {}, flag);
    return data;
  })) : [];

  const place = async (actor, x, y) => (await actor.getTokenDocument({ x: c(x), y: c(y) })).toObject();
  const tokens = [
    ...await Promise.all(pcs.map((a, i) => place(a, 4, 6 + i * 2))),
    ...await Promise.all(npcs.map((a, i) => place(a, 22, 7 + i * 3)))
  ];
  const created = await scene.createEmbeddedDocuments("Token", tokens);
  // A fresh world starts paused; players could not move or act.
  if (game.paused) game.togglePause(false, { broadcast: true });

  return {
    scene: { id: scene.id, name: scene.name, walls: scene.walls.size, tokens: created.length },
    pcs: pcs.map(a => ({ id: a.id, name: a.name, owner: players.find(u => u.character?.id === a.id)?.name ?? null, items: a.items.size })),
    npcs: npcs.map(a => ({ id: a.id, name: a.name })),
    picks: { weapon: weapon?.name ?? null, ammo: rounds?.name ?? null, grenade: grenade?.name ?? null, magazine: magazine?.name ?? null },
    loaded,
    missing: [!weapon && "weapon", !rounds && "9mm ammo", !grenade && "grenade", !magazine && "magazine", npcs.length < 2 && "npcs"].filter(Boolean)
  };
}
