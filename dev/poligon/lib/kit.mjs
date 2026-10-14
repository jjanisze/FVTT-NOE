/**
 * The station kit (PLAN_human_testing.md §3.3): what a station builder uses to put a scene, actors,
 * items and tokens on the table — and the one reset that takes them away again.
 *
 * ## Ownership contract — `scripts/dev/test-scenes.mjs`, extended to whole scenes
 *
 * Everything a station creates carries the closets' flag `flags.<module>.testScene = { id:
 * "poligon.<station>", … }` (via `testSceneFlags`) and `flags.<module>.poligon.station`; actors also
 * `disposable: true`, the only way an actor is ever deleted by a reset. A station's scenes belong to
 * it **whole**: a reset deletes them with whatever was played onto them (ground items, placed charges,
 * blood, templates, the GM's own drawings) and builds them again — "reset in seconds, nothing to tidy
 * afterwards" (§2 goal 2). That is the one difference from the closets, which keep hand-made things.
 * Reset is per station: another station's scenes and actors are never touched.
 *
 * ## Funnels, not raw writes
 *
 * Items come from the module's compendia the way a drag does (`fromCompendium`), go onto the doll
 * through `game.neuroshima.lalka.place`, guns are loaded through the magazine model; states are set
 * by the builders through the module's own APIs (conditions, umieranie, choroby …). A station thus
 * exercises those funnels on every reset (§3.3).
 */

import { MODULE_ID } from "./guard.mjs";
import { testSceneFlags } from "../../modules/neuroshima-2026-overrides/scripts/dev/test-scenes.mjs";
import * as mags from "../../modules/neuroshima-2026-overrides/scripts/weapons/magazine-model.mjs";
import { bestiary, find, packDocs, parseRef } from "./packs.mjs";
import { importPersona } from "./obsada.mjs";
import { personaDef } from "../roster.mjs";
import { sleep } from "./advancement.mjs";

export const GRID = 100;
const NONE = () => CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE;
const OWNER = () => CONST.DOCUMENT_OWNERSHIP_LEVELS.OWNER;

export const stationTag = id => `poligon.${id}`;

/** 1.5 m squares as the table plays (dnd5e metric lengths on), else the system's own 5 ft. */
export function gridUnits() {
  return game.settings.get("dnd5e", "metricLengthUnits") ? { distance: 1.5, units: "m" } : { distance: game.system.grid.distance, units: game.system.grid.units };
}
const tagOf = doc => doc?.flags?.[MODULE_ID]?.testScene?.id ?? null;

/** Documents of one station, per collection (scenes, actors, folders, items, journal, tables, macros). */
export function stationDocuments(stationId) {
  const tag = stationTag(stationId);
  const mine = d => tagOf(d) === tag;
  return {
    scenes: game.scenes.filter(mine), actors: game.actors.filter(mine), folders: game.folders.filter(mine),
    items: game.items.filter(mine), journal: game.journal.filter(mine), tables: game.tables.filter(mine),
    macros: game.macros.filter(mine)
  };
}

/**
 * Delete everything of one station. Combats on its scenes first (ending a combat touches its tokens;
 * deleting the scene first left core updating tokens of a scene that was gone — the skirmish fixture's
 * lesson), then the scenes, tokens of its actors left on other scenes, the actors (only `disposable`),
 * folders, world items, journal entries, tables.
 */
export async function clearStation(stationId) {
  const docs = stationDocuments(stationId);
  const report = { combats: 0, scenes: 0, strayTokens: 0, actors: 0, spared: 0, folders: 0, other: 0 };
  const sceneIds = new Set(docs.scenes.map(s => s.id));
  for (const c of game.combats.filter(c => sceneIds.has(c.scene?.id) || c.combatants.some(cb => tagOf(cb.actor) === stationTag(stationId)))) {
    await c.delete();
    report.combats++;
  }
  if (sceneIds.size) {
    if (canvas.scene && sceneIds.has(canvas.scene.id)) {
      // Never leave a client on a scene that is about to vanish.
      const other = game.scenes.find(s => !sceneIds.has(s.id) && s.active) ?? game.scenes.find(s => !sceneIds.has(s.id));
      if (other) await other.view();
    }
    await Scene.implementation.deleteDocuments([...sceneIds]);
    report.scenes = sceneIds.size;
  }
  const disposable = docs.actors.filter(a => a.flags[MODULE_ID]?.testScene?.disposable === true);
  report.spared = docs.actors.length - disposable.length;
  const actorIds = new Set(disposable.map(a => a.id));
  // A drone token gone with its scene queues a power sync (drony-stan.mjs, `deleteToken`); deleting the
  // drone and its holder before that queue drains made the sync write to a deleted actor (a server error
  // in every e2e reset, 2026-10-12). Let the queue settle first — through the module's own API.
  const D = game.neuroshima?.drony;
  await sleep(300); // the hooks of the scene deletion queue their syncs first
  if (D?.synchronizujZasilanie) await Promise.all(disposable.filter(a => D.jestDronem?.(a)).map(a => D.synchronizujZasilanie(a)));
  for (const scene of game.scenes) {
    const stray = scene.tokens.filter(t => actorIds.has(t.actorId)).map(t => t.id);
    if (stray.length) {
      await scene.deleteEmbeddedDocuments("Token", stray);
      report.strayTokens += stray.length;
    }
  }
  if (actorIds.size) await Actor.implementation.deleteDocuments([...actorIds]);
  report.actors = actorIds.size;
  // (The ability hotbar's per-actor macros go with their actor — the module deletes them itself; a second
  // delete from here raced it into "Macro … does not exist" server errors.)
  for (const [cls, list] of [[Item, docs.items], [JournalEntry, docs.journal], [RollTable, docs.tables], [Macro, docs.macros]]) {
    if (list.length) await cls.implementation.deleteDocuments(list.map(d => d.id));
    report.other += list.length;
  }
  const folders = stationDocuments(stationId).folders;
  // Contents move up, never deleted: an actor the GM dragged into a station folder is not the station's.
  if (folders.length) await Folder.implementation.deleteDocuments(folders.map(f => f.id), { deleteSubfolders: true, deleteContents: false });
  report.folders = folders.length;
  return report;
}

/** A shared, unflagged-by-station folder for all station scenes, so the Scenes tab stays readable. */
async function sharedSceneFolder() {
  const existing = game.folders.find(f => f.type === "Scene" && f.flags?.[MODULE_ID]?.poligon?.shared === "scenes");
  if (existing) return existing;
  return Folder.implementation.create({ name: "Poligon · Stanowiska", type: "Scene", color: "#f2c200", flags: { [MODULE_ID]: { poligon: { shared: "scenes" } } } });
}

export class Kit {
  /** @param {{id: string, name: string}} station */
  constructor(station, { fast = false } = {}) {
    this.station = station;
    this.tag = stationTag(station.id);
    this.fast = fast;
    this.log = [];
    this.missing = [];
    this.scenes = {};
    this.actors = {};
    this.seats = {};
    this.main = null;
  }

  /** The station's flags (+ extra fields inside `testScene`). */
  flags(extra = {}) {
    return foundry.utils.mergeObject(testSceneFlags(this.tag, extra), { [MODULE_ID]: { poligon: { station: this.station.id } } });
  }

  note(...parts) {
    this.log.push(parts.join(" "));
  }

  miss(what) {
    this.missing.push(what);
    this.note(`BRAK: ${what}`);
  }

  async actorFolder() {
    this._folder ??= game.folders.find(f => f.type === "Actor" && tagOf(f) === this.tag)
      ?? await Folder.implementation.create({ name: `Poligon · ${this.station.name}`, type: "Actor", color: "#f2c200", flags: this.flags() });
    return this._folder;
  }

  user(name) {
    const u = game.users.getName(name);
    if (!u) this.miss(`użytkownik ${name}`);
    return u ?? null;
  }

  ownership(owner) {
    const own = { default: NONE() };
    for (const name of [owner].flat().filter(Boolean)) {
      const u = this.user(name);
      if (u) own[u.id] = OWNER();
    }
    return own;
  }

  /* -------------------------------------------- */
  /*  Scenes                                       */
  /* -------------------------------------------- */

  /**
   * A station scene, `w × h` squares of 100 px at the system's grid distance. `main` makes it the
   * one [Idź] opens. `darkness`, `globalLight`, `vision`, `fog`, `color`, `flags` as named.
   */
  async scene(key, { name, w = 30, h = 20, color = "#3d3b33", darkness = 0, globalLight = true, vision = true, fog = false, main = false, flags = {}, grid = {} } = {}) {
    const levelId = foundry.documents.BaseScene.metadata.defaultLevelId;
    const folder = await sharedSceneFolder();
    const scene = await Scene.implementation.create({
      name: name ?? `${this.station.name} · ${key}`, folder: folder.id, navigation: false,
      width: w * GRID, height: h * GRID, padding: 0,
      grid: {
        type: CONST.GRID_TYPES.SQUARE, size: GRID, ...gridUnits(),
        style: "solidLines", color: "#000000", alpha: 0.25, thickness: 1, ...grid
      },
      tokenVision: vision,
      fog: { exploration: Boolean(fog), mode: fog ? CONST.FOG_EXPLORATION_MODES.PERMANENT : CONST.FOG_EXPLORATION_MODES.DISABLED },
      environment: { darknessLevel: darkness, globalLight: { enabled: globalLight, bright: globalLight } },
      initialLevel: levelId,
      // v14: the level must be `defaultLevel0000` or every token points at a level that does not exist.
      levels: [{ _id: levelId, name: "Teren", elevation: { bottom: 0, top: null }, background: { src: null, color } }],
      flags: foundry.utils.mergeObject(this.flags({ key }), flags)
    });
    this.scenes[key] = scene;
    if (main || !this.main) this.main = scene;
    this.note(`scena ${scene.name} ${w}×${h}`);
    return scene;
  }

  /** Metres → squares on this scene. */
  sq(scene, metres) {
    return metres / (scene.grid.distance || 1.5);
  }

  /**
   * Walls in squares: `[x1, y1, x2, y2, kind]`, kind `"door"`, `"window"` (see-through, blocks
   * movement), `"low"` (blocks movement only) or nothing (solid).
   */
  async walls(scene, segments) {
    const S = CONST.WALL_SENSE_TYPES;
    const M = CONST.WALL_MOVEMENT_TYPES;
    const data = segments.map(([x1, y1, x2, y2, kind]) => ({
      c: [x1, y1, x2, y2].map(v => Math.round(v * GRID)),
      ...(kind === "door" ? { door: CONST.WALL_DOOR_TYPES.DOOR } : {}),
      ...(kind === "window" ? { sight: S.NONE, light: S.NONE, sound: S.NONE } : {}),
      ...(kind === "low" ? { sight: S.NONE, light: S.NONE, sound: S.NONE, move: M.NORMAL } : {}),
      flags: this.flags({ role: "wall" })
    }));
    if (data.length) await scene.createEmbeddedDocuments("Wall", data);
    return data.length;
  }

  /** A closed rectangle of walls (squares), optional door on one side: `{side: "s", at: 2}`. */
  room(x, y, w, h, { door = null, windows = [] } = {}) {
    const seg = [];
    const side = (s, from, to, fixed, horizontal) => {
      const doorAt = door?.side === s ? door.at : null;
      const winAt = windows.filter(wn => wn.side === s).map(wn => wn.at);
      let cur = from;
      const marks = [...(doorAt !== null ? [[doorAt, "door"]] : []), ...winAt.map(a => [a, "window"])].sort((a, b) => a[0] - b[0]);
      for (const [at, kind] of marks) {
        const a = from + at;
        if (a > cur) seg.push(horizontal ? [cur, fixed, a, fixed] : [fixed, cur, fixed, a]);
        seg.push(horizontal ? [a, fixed, a + 1, fixed, kind] : [fixed, a, fixed, a + 1, kind]);
        cur = a + 1;
      }
      if (cur < to) seg.push(horizontal ? [cur, fixed, to, fixed] : [fixed, cur, fixed, to]);
    };
    side("n", x, x + w, y, true);
    side("s", x, x + w, y + h, true);
    side("w", y, y + h, x, false);
    side("e", y, y + h, x + w, false);
    return seg;
  }

  /** Text labels in squares (Drawings): `[x, y, text, {size, color, w}]`. */
  async labels(scene, list) {
    const data = list.map(([x, y, text, o = {}]) => {
      const size = o.size ?? 28;
      const w = (o.w ?? Math.max(2, String(text).length * size * 0.6 / GRID)) * GRID;
      return {
        x: Math.round(x * GRID), y: Math.round(y * GRID),
        shape: { type: "r", width: w, height: size * 1.6 },
        text: String(text), fontSize: size, fontFamily: "Signika", textColor: o.color ?? "#ffffff", textAlpha: 1,
        fillType: o.fill ? CONST.DRAWING_FILL_TYPES.SOLID : CONST.DRAWING_FILL_TYPES.NONE, fillColor: o.fill ?? "#000000", fillAlpha: 0.55,
        strokeWidth: 0, locked: true, flags: this.flags({ role: "label" })
      };
    });
    if (data.length) await scene.createEmbeddedDocuments("Drawing", data);
    return data.length;
  }

  /** Painted rectangles in squares (range lines, pits, beds): `[x, y, w, h, color, alpha]` — no collision. */
  async stripes(scene, list) {
    const data = list.map(([x, y, w, h, color = "#f2c200", alpha = 0.6]) => ({
      x: Math.round(x * GRID), y: Math.round(y * GRID), shape: { type: "r", width: Math.max(4, w * GRID), height: Math.max(4, h * GRID) },
      fillType: CONST.DRAWING_FILL_TYPES.SOLID, fillColor: color, fillAlpha: alpha, strokeWidth: 0, locked: true,
      flags: this.flags({ role: "stripe" })
    }));
    if (data.length) await scene.createEmbeddedDocuments("Drawing", data);
    return data.length;
  }

  /** Ambient lights in squares: `{x, y, bright, dim (m), color, animation}`. */
  async lights(scene, list) {
    const data = list.map(l => ({
      x: Math.round(l.x * GRID), y: Math.round(l.y * GRID),
      config: { bright: l.bright ?? 3, dim: l.dim ?? 9, color: l.color ?? "#ffcf8a", alpha: l.alpha ?? 0.4, ...(l.animation ? { animation: l.animation } : {}) },
      flags: this.flags({ role: "light" })
    }));
    if (data.length) await scene.createEmbeddedDocuments("AmbientLight", data);
    return data.length;
  }

  /* -------------------------------------------- */
  /*  Actors                                       */
  /* -------------------------------------------- */

  /** Create a disposable actor from plain data. */
  async actor(key, data, { owner = null } = {}) {
    const folder = await this.actorFolder();
    const doc = await Actor.implementation.create(foundry.utils.mergeObject({
      folder: folder.id, ownership: this.ownership(owner), flags: this.flags({ disposable: true, key })
    }, data, { inplace: false }));
    this.actors[key] = doc;
    return doc;
  }

  /** A disposable copy of a compendium actor (bestiary, companion templates…). */
  async fromPack(key, pack, ref, { name = null, owner = null, data = {} } = {}) {
    const src = pack === "bestiariusz" ? await bestiary(ref) : await find(pack, ref);
    if (!src) {
      this.miss(`${pack}: ${typeof ref === "string" ? ref : JSON.stringify(ref)}`);
      return null;
    }
    const folder = await this.actorFolder();
    const base = game.actors.fromCompendium(src);
    const doc = await Actor.implementation.create(foundry.utils.mergeObject(base, {
      ...(name ? { name } : {}), folder: folder.id, ownership: this.ownership(owner),
      flags: this.flags({ disposable: true, key }), ...data
    }, { inplace: false }));
    this.actors[key] = doc;
    return doc;
  }

  /**
   * A persona from the Obsada (built through advancement on first use), copied for this station, with
   * its roster loadout given through the funnels (`loadout: false` skips it, an array replaces it).
   */
  async persona(key, personaId, { name = null, owner = null, loadout = true } = {}) {
    const folder = await this.actorFolder();
    let doc;
    try {
      doc = await importPersona(personaId, {
        name, folder: folder.id, ownership: this.ownership(owner), flags: this.flags({ disposable: true, key, persona: personaId }),
        fast: this.fast
      });
    } catch (err) {
      console.error(`Poligon | persona ${personaId}`, err);
      this.miss(`persona ${personaId}: ${err.message}`);
      return null;
    }
    if (!doc) {
      this.miss(`persona ${personaId}`);
      return null;
    }
    this.actors[key] = doc;
    const kit = Array.isArray(loadout) ? loadout : loadout ? (personaDef(personaId)?.ekwipunek ?? []) : [];
    if (kit.length) await this.give(doc, kit);
    this.note(`persona ${personaId} → ${doc.name}${owner ? ` (${[owner].flat().join(", ")})` : ""}`);
    return doc;
  }

  /**
   * Take ownership of an actor a module funnel created (a drone, a companion): the station's flags,
   * `disposable`, so the next reset removes it with the rest. Its folder stays the module's.
   */
  async adopt(key, actor) {
    if (!actor) {
      this.miss(`aktor ${key}`);
      return null;
    }
    await actor.update({ flags: this.flags({ disposable: true, key }) });
    this.actors[key] = actor;
    return actor;
  }

  /** `user.character` for a seat — [Idź] reapplies it, since several stations share Gracz 1–5. */
  async seat(userName, actor) {
    const u = this.user(userName);
    if (!u || !actor) return;
    this.seats[userName] = actor.id;
    await u.update({ character: actor.id });
  }

  /* -------------------------------------------- */
  /*  Items                                        */
  /* -------------------------------------------- */

  /**
   * Give compendium items: `"bron:B 92"`, `"granaty:{grenade-frag}"`, or `{ref, qty, place, load,
   * name, data}`. `place` → the doll (`"hand.0"`, `"ranged"`, `"auto"` = Załóż, `"pack"`); `load`
   * loads a gun through the magazine model (magazine from the pack when the actor has none).
   */
  async give(actor, specs) {
    if (!actor) return [];
    const made = [];
    for (const raw of specs) {
      const spec = typeof raw === "string" ? { ref: raw } : raw;
      const [pack, ref] = parseRef(spec.ref);
      const src = await find(pack, ref);
      if (!src) {
        this.miss(`${spec.ref} (dla ${actor.name})`);
        continue;
      }
      const data = foundry.utils.mergeObject(game.items.fromCompendium(src), spec.data ?? {}, { inplace: false });
      if (spec.qty) foundry.utils.setProperty(data, "system.quantity", spec.qty);
      if (spec.name) data.name = spec.name;
      const [item] = await actor.createEmbeddedDocuments("Item", [data]);
      if (!item) continue;
      made.push(item);
      if (spec.load) await this.load(actor, item, spec.load === true ? {} : spec.load);
      if (spec.place) await this.place(actor, item, spec.place);
    }
    return made;
  }

  /** Doll placement through the module, never a raw flag; a question it would ask → logged, not hung. */
  async place(actor, item, to) {
    const lalka = game.neuroshima?.lalka;
    if (!lalka) return false;
    // A plain timer: only a backstop, and the throttle-proof wait would keep spinning after place() won.
    const done = await Promise.race([lalka.place(actor, item, to, { quiet: true }), new Promise(r => setTimeout(() => r("timeout"), 4000))]);
    if (done === "timeout") {
      this.miss(`lalka: ${item.name} → ${to} czekało na pytanie`);
      for (const app of foundry.applications.instances.values()) if (app.rendered && /DialogV2/.test(app.constructor.name)) await app.close();
      return false;
    }
    if (!done) this.note(`lalka: ${item.name} → ${to} odmówione`);
    return Boolean(done);
  }

  /** Load a gun: its magazine (from the actor, else the pack) full, swapped in; internal feeds round by round. */
  async load(actor, weapon, { caliber = null, spareMags = 0 } = {}) {
    const entry = mags.weaponEntry(weapon);
    if (!entry?.mag) return null;
    const cal = caliber ?? entry.caliber;
    const magwell = mags.weaponMagwell(weapon);
    if (magwell) {
      let mag = actor.items.find(i => mags.isMagazineItem(i) && mags.magazineDefOf(i)?.magwell === magwell && !mags.magazineHost(i));
      if (!mag) {
        const src = (await packDocs("magazynki")).find(m => mags.magazineDefOf(m)?.magwell === magwell);
        if (!src) {
          this.miss(`magazynek do ${weapon.name}`);
          return null;
        }
        [mag] = await actor.createEmbeddedDocuments("Item", [game.items.fromCompendium(src)]);
        for (let i = 0; i < spareMags; i++) {
          const [spare] = await actor.createEmbeddedDocuments("Item", [game.items.fromCompendium(src)]);
          await mags.loadRounds(spare, cal, mags.freeSpace(spare));
        }
      }
      await mags.loadRounds(mag, cal, mags.freeSpace(mag));
      await mags.swapMagazineItem(weapon, mag);
    } else {
      for (let i = 0; i < 60; i++) if (!(await mags.loadSingleRound(weapon, cal))) break;
    }
    const s = mags.readState(weapon);
    return `${s.rounds.length}${s.chamber ? "+1" : ""}`;
  }

  /** Ammunition of a caliber as a stack (`"9mm"`, 30). */
  async ammo(actor, caliber, qty) {
    return this.give(actor, [{ ref: `amunicja:{${caliber}}`, qty }]);
  }

  /** Surowce through the module's store (`{CZ: 10, MK: 5}`). */
  async surowce(actor, map) {
    const S = game.neuroshima?.produkcja?.surowce;
    if (!S) return this.miss("API surowców");
    for (const [code, gb] of Object.entries(map)) await S.give(actor, code, gb);
  }

  /* -------------------------------------------- */
  /*  Tokens, party, combat                        */
  /* -------------------------------------------- */

  /** Tokens in squares: `[actor, x, y, {hidden, elevation, …}]`. */
  async tokens(scene, list) {
    const data = [];
    for (const [actor, x, y, extra = {}] of list) {
      if (!actor) continue;
      const td = await actor.getTokenDocument({ x: Math.round(x * GRID), y: Math.round(y * GRID), ...extra });
      const obj = td.toObject();
      obj.flags = foundry.utils.mergeObject(obj.flags ?? {}, this.flags({ role: "token" }));
      data.push(obj);
    }
    return data.length ? scene.createEmbeddedDocuments("Token", data) : [];
  }

  /** Drużyna Poligonu: a group actor of `members`, set as the primary party (never the campaign's). */
  async party(members, { name = "Drużyna Poligonu", primary = true } = {}) {
    const g = await this.actor("druzyna", { name, type: "group" });
    await g.update({ "system.members": members.filter(Boolean).map(a => ({ actor: a.id })) });
    if (primary) await game.settings.set("dnd5e", "primaryParty", { actor: g.id });
    return g;
  }

  /** A combat on `scene` with these tokens (by actor), optionally started. */
  async combat(scene, actors, { start = false } = {}) {
    const ids = new Set(actors.filter(Boolean).map(a => a.id));
    const toks = scene.tokens.filter(t => ids.has(t.actorId));
    const combat = await Combat.implementation.create({ scene: scene.id, active: true });
    await combat.createEmbeddedDocuments("Combatant", toks.map(t => ({ tokenId: t.id, sceneId: scene.id, actorId: t.actorId })));
    if (start) await combat.startCombat();
    return combat;
  }

  /** A world-scope module setting for this station (Kobalt, scene-independent switches). */
  async setting(key, value, namespace = MODULE_ID) {
    if (game.settings.get(namespace, key) !== value) await game.settings.set(namespace, key, value);
  }
}
