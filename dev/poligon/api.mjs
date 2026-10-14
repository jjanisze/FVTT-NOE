/**
 * `game.poligon` — the Poligon's API (PLAN_human_testing.md §3, §6): what the panel calls and what
 * `fvtt poligon:*` drives from outside. Usable without the panel: the `poligon` e2e suite imports this
 * file in an agent sandbox world and builds every station through it.
 *
 *   stations.list() / reset(ids | "all") / go(id) / view(id, sceneKey)
 *   obsada.build({rebuild, only}) / coverage() / built() / take(personaId)
 *   uwagi.form() / create() / list() / export() / oznacz(id, status)
 *   kosci, liczniki, swiezosc, wariant, czas — the panel's tools
 *   werdykty.get() / set(station, probe, verdict)
 */

import { MODULE_ID, assertPoligon } from "./lib/guard.mjs";
import { STATIONS, station } from "./stations/index.mjs";
import { Kit, clearStation, stationDocuments } from "./lib/kit.mjs";
import * as obsada from "./lib/obsada.mjs";
import { ROSTER, personaDef } from "./roster.mjs";
import * as uwagi from "./lib/uwagi.mjs";
import { czas, installCounters, installDice, kosci, liczniki, swiezosc, wariant } from "./lib/narzedzia.mjs";
import { registerStateSettings, stamp, stan, ustawWerdykt, werdykty, zapiszStan } from "./lib/state.mjs";
import { openPanel, refreshPanel } from "./lib/panel.mjs";

export function registerSettings() {
  registerStateSettings();
}

export function registerKeybindings() {
  game.keybindings.register("world", "poligonPanel", {
    name: "Poligon: panel", restricted: true,
    editable: [{ key: "KeyP", modifiers: ["Control", "Shift"] }],
    onDown: () => { openPanel(); return true; }
  });
  game.keybindings.register("world", "poligonUwaga", {
    name: "Poligon: uwaga (znalezisko)",
    editable: [{ key: "KeyU", modifiers: ["Control", "Shift"] }],
    onDown: () => { uwagi.form(); return true; }
  });
}

/** The scene-controls button (GM only, Poligon only). */
export function sceneControl(controls) {
  const tools = controls.tokens?.tools;
  if (!tools) return;
  tools.poligon = {
    name: "poligon", title: "Poligon — panel stanowisk (Ctrl+Shift+P)", icon: "fa-solid fa-flask-vial",
    order: Object.keys(tools).length, button: true, visible: game.user.isGM, onChange: () => openPanel()
  };
  tools.poligonUwaga = {
    name: "poligonUwaga", title: "Poligon — uwaga (Ctrl+Shift+U)", icon: "fa-solid fa-flag",
    order: Object.keys(tools).length, button: true, visible: true, onChange: () => uwagi.form()
  };
}

/* -------------------------------------------- */
/*  Stations                                     */
/* -------------------------------------------- */

function stateOf(s, st = stan(), commit = null) {
  const rec = st.stations?.[s.id];
  const docs = stationDocuments(s.id);
  const present = docs.scenes.length + docs.actors.length + docs.journal.length > 0 || (s.id === "bestiariusz" && Boolean(game.scenes.get(rec?.main)));
  if (!rec?.builtAt || !present) return { state: "never", rec: rec ?? null };
  const stale = commit && rec.commit && rec.commit !== commit;
  return { state: stale ? "stale" : "built", rec };
}

async function list() {
  const st = stan();
  const commit = (await stamp())?.commit ?? null;
  return STATIONS.map(s => {
    const { state, rec } = stateOf(s, st, commit);
    return {
      id: s.id, name: s.name, prio: s.prio, state, active: st.active === s.id, gracze: s.gracze ?? 0,
      builtAt: rec?.builtAt ?? null, commit: rec?.commit ?? null, missing: rec?.missing?.length ?? 0, error: rec?.error ?? null
    };
  });
}

/** Build one station from scratch (its old documents first). Never touches another station. */
async function resetOne(s, { fast = false } = {}) {
  const t0 = Date.now();
  let wiped = null;
  let summary = null;
  let error = null;
  const kit = new Kit(s, { fast });
  try {
    if (s.clear) await s.clear();
    wiped = await clearStation(s.id);
    summary = await s.build(kit);
    // A loadout that immobilises its carrier is a station bug, unless the persona is the scale case.
    for (const a of Object.values(kit.actors)) {
      const e = a?.system?.attributes?.encumbrance;
      if (a?.type === "character" && e?.max && e.value > e.max && a.flags?.[MODULE_ID]?.testScene?.persona !== "chomik") {
        kit.miss(`przeciążony: ${a.name} ${Number(e.value).toFixed(1)}/${e.max} kg`);
      }
    }
  } catch (err) {
    console.error(`Poligon | ${s.id}`, err);
    error = err.message;
  }
  const commit = (await stamp())?.commit ?? null;
  const rec = {
    builtAt: new Date().toISOString(), commit, ms: Date.now() - t0, error, summary,
    main: kit.main?.id ?? null, seats: kit.seats, party: kit.actors.druzyna?.id ?? null,
    keys: Object.fromEntries(Object.entries(kit.actors).filter(([, a]) => a).map(([k, a]) => [k, a.id])),
    missing: kit.missing, log: kit.log.slice(-60)
  };
  await zapiszStan(st => { st.stations[s.id] = rec; });
  refreshPanel();
  return { id: s.id, ok: !error, ms: rec.ms, error, missing: kit.missing, summary, wiped };
}

async function reset(ids, { fast = false, source = "panel" } = {}) {
  assertPoligon("Poligon reset");
  if (!game.user.isGM) throw new Error("Stanowiska buduje MG.");
  const list = ids === "all" ? STATIONS : [ids].flat().map(id => {
    const s = station(id);
    if (!s) throw new Error(`Nie ma stanowiska "${id}" (są: ${STATIONS.map(x => x.id).join(", ")})`);
    return s;
  });
  const out = [];
  for (const s of list) {
    if (source === "panel") ui.notifications.info(`Poligon: buduję ${s.name}…`);
    out.push(await resetOne(s, { fast }));
  }
  return out;
}

/**
 * [Idź]: the station's main scene active for everyone, its seats back on Gracz 1–5 (stations share
 * them), its party primary again, its key sheets open; the probe card follows the active station.
 */
async function go(id) {
  const s = station(id);
  if (!s) throw new Error(`Nie ma stanowiska "${id}"`);
  let rec = stan().stations?.[id];
  if (!rec?.builtAt || stateOf(s).state === "never") {
    await reset(id);
    rec = stan().stations[id];
  }
  const scene = game.scenes.get(rec.main);
  if (scene) await scene.activate();
  for (const [userName, actorId] of Object.entries(rec.seats ?? {})) {
    const u = game.users.getName(userName);
    if (u && game.actors.get(actorId)) await u.update({ character: actorId });
  }
  if (rec.party && game.actors.get(rec.party)) await game.settings.set("dnd5e", "primaryParty", { actor: rec.party });
  await zapiszStan(st => { st.active = id; });
  for (const key of s.klucz ?? []) game.actors.get(rec.keys?.[key])?.sheet.render(true);
  if (!scene) {
    for (const j of stationDocuments(id).journal) j.sheet.render(true);
    // The storage actors live in their folder; opening Wszystko (~570 items) on every [Idź] would be slow.
    if (id === "magazyn") ui.sidebar?.changeTab?.("actors", "primary");
  }
  refreshPanel();
  return { id, scene: scene?.name ?? null };
}

async function view(id, key) {
  const rec = stan().stations?.[id];
  const scene = game.scenes.find(sc => sc.flags?.[MODULE_ID]?.testScene?.id === `poligon.${id}` && sc.flags[MODULE_ID].testScene.key === key)
    ?? game.scenes.get(rec?.main);
  if (scene) await scene.activate();
  return scene?.name ?? null;
}

/** Obsada → Weź: a persona copy onto Plac (built first if needed), in the Plac's folder. */
async function take(personaId, { owner = null } = {}) {
  const plac = station("plac");
  const kit = new Kit(plac);
  let scene = stationDocuments("plac").scenes[0];
  if (!scene) {
    await reset("plac");
    scene = stationDocuments("plac").scenes[0];
  }
  const actor = await kit.persona(`wziety-${personaId}-${Date.now().toString(36)}`, personaId, { owner });
  if (actor && scene) {
    const n = scene.tokens.size;
    await kit.tokens(scene, [[actor, 3 + (n % 10) * 2, 4 + Math.floor(n / 10) * 2]]);
  }
  return actor;
}

/* -------------------------------------------- */

export async function createApi(kind) {
  installDice();
  installCounters();
  wariant.badge();
  if (game.user.isGM && game.users.activeGM?.isSelf) await uwagi.journal();
  Hooks.on("updateSetting", s => { if (s.key === `${MODULE_ID}.kobaltEnabled`) { wariant.badge(); refreshPanel(); } });
  return {
    ready: true, kind, version: 1,
    STATIONS,
    stations: { list, reset, go, view, get: station, documents: stationDocuments },
    obsada: {
      ROSTER, personaDef, build: obsada.buildAll, buildPersona: obsada.buildPersona, coverage: obsada.coverage,
      built: obsada.builtPersonas, importPersona: obsada.importPersona, take
    },
    uwagi: { form: uwagi.form, create: uwagi.create, list: uwagi.list, export: uwagi.exportFindings, oznacz: uwagi.oznacz, context: uwagi.context },
    kosci, liczniki, swiezosc, wariant, czas,
    werdykty: { get: werdykty, set: ustawWerdykt },
    stan,
    panel: { open: openPanel, refresh: refreshPanel }
  };
}
