/**
 * Suite — Poligon (PLAN_human_testing.md §7, H3): the rot guard of the GM's testing ground. In a
 * throwaway sandbox world (never the Poligon itself — `e2e` refuses that profile) it loads the Poligon's
 * code from `/agent-poligon/`, builds the whole Obsada through dnd5e's real advancement, checks the
 * persona ↔ ledger invariant (every automated Sztuczka, class/profession ability and Pochodzenie
 * ability sits on a persona), builds every station and resets one again to prove a reset leaves
 * nothing behind. A renamed item is a missing pick, a broken builder an error: either turns this red,
 * so a broken station is the agents' red run, not the GM's lost evening (§2 goal 6).
 *
 * Slow on purpose (~10 min): one Runtime.evaluate is capped at 120 s, so the Obsada goes in chunks and
 * every station is its own step.
 */

import { readLog } from "../../agent/lib/logs.mjs";

/* Functions below run in the browser (serialised): no closures over this file. */

async function laduj() {
  if (!game.poligon) {
    const st = await import("/agent-poligon/lib/state.mjs");
    if (!game.settings.settings.has("world.poligonStan")) st.registerStateSettings();
    game.poligon = await (await import("/agent-poligon/api.mjs")).createApi("sandbox");
  }
  // Stations seat five players (H-D10); e2e worlds come with three.
  const missing = ["Gracz 1", "Gracz 2", "Gracz 3", "Gracz 4", "Gracz 5"].filter(n => !game.users.getName(n));
  if (missing.length) await User.implementation.createDocuments(missing.map(name => ({ name, role: CONST.USER_ROLES.PLAYER })));
  const { poligonKind } = await import("/agent-poligon/lib/guard.mjs");
  return { kind: poligonKind(), stations: game.poligon.STATIONS.map(s => s.id), roster: game.poligon.obsada.ROSTER.map(p => p.id) };
}

async function obsada({ only }) {
  if (!game.poligon) {
    const st = await import("/agent-poligon/lib/state.mjs");
    if (!game.settings.settings.has("world.poligonStan")) st.registerStateSettings();
    game.poligon = await (await import("/agent-poligon/api.mjs")).createApi("sandbox");
  }
  return game.poligon.obsada.build({ only });
}

async function pokrycie() {
  return game.poligon.obsada.coverage();
}

async function stacja({ id }) {
  if (!game.poligon) {
    const st = await import("/agent-poligon/lib/state.mjs");
    if (!game.settings.settings.has("world.poligonStan")) st.registerStateSettings();
    game.poligon = await (await import("/agent-poligon/api.mjs")).createApi("sandbox");
  }
  const [r] = await game.poligon.stations.reset(id, { source: "e2e" });
  return { id: r.id, ok: r.ok, ms: r.ms, error: r.error, missing: r.missing };
}

function liczby() {
  const n = (c, f) => c.reduce((a, d) => a + f(d), 0);
  return {
    actors: game.actors.size, scenes: game.scenes.size, items: game.items.size, journal: game.journal.size,
    folders: game.folders.size, combats: game.combats.size, tokens: n(game.scenes, s => s.tokens.size),
    walls: n(game.scenes, s => s.walls.size), drawings: n(game.scenes, s => s.drawings.size), owned: n(game.actors, a => a.items.size)
  };
}

async function panel() {
  await game.poligon.stations.go("hangar");
  for (const a of foundry.applications.instances.values()) if (a.document && a.rendered) await a.close();
  game.poligon.panel.open();
  await new Promise(r => setTimeout(r, 1500));
  return document.querySelectorAll("#poligon-panel .poligon-row").length;
}

export default {
  name: "poligon",
  clients: ["gm"],

  async run(t) {
    let ids = [];
    let roster = [];
    await t.step("the Poligon's code loads from /agent-poligon/ in an agent world", async () => {
      const r = await t.gm.eval(laduj);
      t.equal(r.kind, "sandbox", "an agent world is a sandbox to the Poligon's guard");
      t.assert(r.stations.length >= 16, `stations: ${r.stations.length}`, r);
      ids = r.stations;
      roster = r.roster;
    });

    await t.step("the Obsada builds through dnd5e's AdvancementManager", async () => {
      // A visible window keeps Chrome from throttling its timers (lib/advancement.mjs copes either way).
      await t.gm.front(0);
      const failed = [];
      let built = 0;
      for (let i = 0; i < roster.length; i += 4) {
        const r = await t.gm.eval(obsada, { only: roster.slice(i, i + 4) });
        built += r.built.length;
        failed.push(...r.failed);
      }
      t.log(`${built} personas built`);
      t.assert(!failed.length, `personas failed: ${failed.map(f => `${f.id}: ${f.error}`).join(" | ")}`, { failed });
    });

    await t.step("persona ↔ ledger invariant: every automated ability sits on a persona", async () => {
      const c = await t.gm.eval(pokrycie);
      t.equal(c.personas, roster.length, "personas in Poligon · Obsada");
      const missing = Object.entries(c.missing).filter(([, v]) => v.length).map(([k, v]) => `${k}: ${v.join(", ")}`);
      t.assert(!missing.length, `automated abilities without a persona — ${missing.join(" · ")}`, c);
    });

    for (const id of ids) {
      await t.step(`station ${id} builds with no error and no missing pick`, async () => {
        const r = await t.gm.eval(stacja, { id });
        t.log(`${id}: ${Math.round(r.ms / 1000)} s`);
        t.assert(r.ok, `${id}: ${r.error}`, r);
        t.assert(!r.missing.length, `${id} missing: ${r.missing.join(" | ")}`, r);
      });
    }

    await t.step("a reset leaves nothing behind (Hangar twice, every collection counted)", async () => {
      const before = await t.gm.eval(liczby);
      for (let i = 0; i < 2; i++) {
        const r = await t.gm.eval(stacja, { id: "hangar" });
        t.assert(r.ok, `hangar reset ${i + 1}: ${r.error}`, r);
      }
      const after = await t.gm.eval(liczby);
      for (const k of Object.keys(before)) t.equal(after[k], before[k], `${k} after two resets`);
    });

    await t.step("panel: Stanowiska lists every station", async () => {
      const rows = await t.gm.eval(panel);
      t.assert(rows >= ids.length, `panel rows ${rows} < ${ids.length}`);
      await t.screenshot("gm", "panel");
    });

    await t.step("server log: no errors since the run started", async () => {
      const errors = readLog(t.profile.logs, { since: t.run.startedAt, level: "error" });
      t.assert(!errors.length, `${errors.length} server error(s): ${errors.slice(0, 3).map(e => e.message.slice(0, 160)).join(" | ")}`, { errors });
    });
  }
};
