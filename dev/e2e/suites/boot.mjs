/**
 * Suite 1 — Boot (PLAN_agentic_improvements.md §5 D): the module loads in a clean world with
 * zero console errors on every client, and every compendium opens with exactly the records
 * that were built. Also the cheapest smoke test of the whole e2e harness.
 */

import fs from "node:fs";
import path from "node:path";
import { countAllPacks } from "../../agent/lib/packs.mjs";
import { readLog } from "../../agent/lib/logs.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

export default {
  name: "boot",
  clients: ["gm", "Gracz 1"],

  async run(t) {
    const manifest = JSON.parse(fs.readFileSync(path.join(t.moduleRoot, "module.json"), "utf8"));

    await t.step("module active, API present, versions as declared", async () => {
      const v = await t.gm.eval(id => ({
        active: game.modules.get(id)?.active ?? false, version: game.modules.get(id)?.version ?? null,
        api: Boolean(game.neuroshima?.tests), system: game.system.id, systemVersion: game.system.version
      }), MODULE_ID);
      t.equal(v.active, true, "module active");
      t.equal(v.version, manifest.version, "module version");
      t.assert(v.api, "game.neuroshima API missing");
      t.equal(v.system, "dnd5e", "system");
      const verified = manifest.relationships?.systems?.find(s => s.id === "dnd5e")?.compatibility?.verified;
      t.equal(v.systemVersion, verified, "dnd5e version = module.json verified");
    });

    await t.step("every pack opens with the on-disk record count", async () => {
      const packsRoot = path.join(t.profile.data, "modules", MODULE_ID, "packs");
      const disk = await countAllPacks(manifest, packsRoot, t.ctx.install.app);
      const live = await t.gm.eval(async (id, names) => {
        const out = {};
        for (const name of names) {
          const pack = game.packs.get(`${id}.${name}`);
          out[name] = pack ? (await pack.getIndex()).size : null;
        }
        return out;
      }, MODULE_ID, Object.keys(disk));
      const bad = Object.keys(disk).filter(n => !disk[n] || live[n] !== disk[n]);
      t.assert(!bad.length, `packs differ: ${bad.map(n => `${n} disk=${disk[n]} live=${live[n]}`).join(", ")}`, { disk, live });
      t.log(`${Object.keys(disk).length} packs, ${Object.values(disk).reduce((a, b) => a + b, 0)} records`);
    });

    await t.step("player sees the active scene and owns exactly their PC's token", async () => {
      // The fixture was seeded from the GM's client; the player sees it a socket round-trip later.
      const p = await t.waitFor(t.client("Gracz 1"), () => {
        const s = {
          user: game.user.name, isGM: game.user.isGM, character: game.user.character?.name ?? null,
          scene: canvas.scene?.name ?? null, owned: (canvas.tokens?.placeables ?? []).filter(tk => tk.isOwner).map(tk => tk.name)
        };
        return s.character && s.scene && s.owned.length ? s : null;
      }, { message: "the player's client to see its character, scene and token" });
      t.equal(p.isGM, false, "Gracz 1 is a player");
      t.equal(p.character, "PC Gracz 1", "assigned character");
      t.assert(p.scene, "no active scene for the player");
      t.equal(p.owned.join(","), "PC Gracz 1", "owned tokens");
    });

    await t.step("server log: no errors since the run started", async () => {
      const errors = readLog(t.profile.logs, { since: t.run.startedAt, level: "error" });
      t.assert(!errors.length, `${errors.length} server error(s): ${errors.slice(0, 3).map(e => e.message.slice(0, 160)).join(" | ")}`, { errors });
    });

    await t.screenshot("gm", "scene");
    await t.screenshot("Gracz 1", "scene");
  }
};
