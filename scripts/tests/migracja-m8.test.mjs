/**
 * Neuroshima 5e — migracja świata po M8 (`migration/migrate-m8.mjs`, PLAN_m8 §13.4 E9).
 *
 * Warstwa 4, w zakresie testu (nie cały świat): stary znacznik R/B poza walką, `lastBurstUse` na broni, Region `skok`
 * z dawnym `dcFall`, makro skrótu bez `userId`. Na sucho raport bez zmian; z `commit` — zapis; drugi przebieg pusty.
 */

import { SCRATCH_PREFIX, scratchActor, scratchCleanup } from "./helpers.mjs";
import { migrateM8 } from "../migration/migrate-m8.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

export function registerMigracjaM8Tests(quench) {
  quench.registerBatch(`${MODULE_ID}.migracja-m8`, context => {
    const { describe, it, expect, after } = context;
    const doSprzatania = [];

    after(async () => {
      for (const d of doSprzatania.reverse()) { try { await d.delete(); } catch (_e) { /* już nie ma */ } }
      await scratchCleanup();
    });

    describe("Migracja M8 (warstwa 4, zakres testu)", function () {
      this.timeout(30000);

      it("na sucho — raport bez zmian; zapis — znacznik, lastBurstUse, dcFall, userId; drugi przebieg pusty", async function () {
        const a = await scratchActor({ name: `${SCRATCH_PREFIX} Migracja M8` });
        await a.createEmbeddedDocuments("ActiveEffect", [{ name: "Reakcja zużyta (stara)", statuses: ["reakcja"],
          flags: { [MODULE_ID]: { akcjaZuzyta: { kind: "R", uzycia: [{ zrodlo: "M7" }], limit: 1 } } } }]);
        const [bron] = await a.createEmbeddedDocuments("Item", [{ name: "Pistolet (migracja)", type: "weapon",
          flags: { [MODULE_ID]: { lastBurstUse: { combatId: "x", round: 1, tryby: ["ks"] } } } }]);
        const scena = await Scene.implementation.create({ name: `${SCRATCH_PREFIX} migracja-skok`, width: 600, height: 600, padding: 0,
          grid: { type: CONST.GRID_TYPES.SQUARE, size: 100, distance: 1.5, units: "m" } });
        doSprzatania.push(scena);
        const [region] = await scena.createEmbeddedDocuments("Region", [{ name: "Wyrwa (migracja)",
          shapes: [{ type: "rectangle", x: 0, y: 0, width: 100, height: 100, rotation: 0, hole: false }], elevation: { bottom: null, top: null },
          behaviors: [{ type: `${MODULE_ID}.skok`, name: "Skok", system: { gap: 3, dir: "S" } }] }]);
        const beh = region.behaviors.contents[0];
        // Dawne pole z importu Tiled — schemat już go nie zna, więc wpisujemy surowo w źródło dokumentu.
        await beh.update({ "system.dcFall": 15 }, { diff: false, recursive: true });
        const maDcFall = () => "dcFall" in (region.behaviors.contents[0]._source.system ?? {});
        const makro = await Macro.implementation.create({ name: `${SCRATCH_PREFIX} Biegnij (migracja)`, type: "script",
          command: 'game.neuroshima.skroty.uzyj("bieganie");', flags: { [MODULE_ID]: { skrotM8: "bieganie" } } });
        doSprzatania.push(makro);
        const zakres = { aktorzy: [a.id], sceny: [scena.id], makra: [makro.id] };

        const sucho = await migrateM8(zakres);
        expect(sucho.znaczniki.map(z => z.ile)).to.deep.equal([1]);
        expect(sucho.serie.map(z => z.przedmiot)).to.deep.equal(["Pistolet (migracja)"]);
        expect(sucho.makra.map(z => z.makro)).to.deep.equal([makro.name]);
        if (maDcFall()) expect(sucho.regiony.length).to.equal(1);
        expect(a.effects.size, "na sucho nic nie znika").to.equal(1);

        await migrateM8({ ...zakres, commit: true });
        expect(a.effects.filter(e => e.getFlag(MODULE_ID, "akcjaZuzyta")).length, "znacznik zdjęty").to.equal(0);
        expect(a.items.get(bron.id).getFlag(MODULE_ID, "lastBurstUse") ?? null).to.equal(null);
        expect(game.macros.get(makro.id).getFlag(MODULE_ID, "userId")).to.equal(game.user.id);
        expect(maDcFall(), "dcFall usunięte").to.equal(false);

        const drugi = await migrateM8(zakres);
        expect([drugi.znaczniki.length, drugi.serie.length, drugi.regiony.length, drugi.makra.length], "drugi przebieg pusty").to.deep.equal([0, 0, 0, 0]);
      });
    });
  });
}
