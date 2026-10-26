/**
 * Neuroshima 5e — sceny z poziomami: synchronizacja stosu map i przejścia (scenes/map-sync.mjs,
 * scenes/transitions.mjs).
 *
 * Warstwa 3 (dokumenty) na scenie testowej, której nikt nie ogląda ani nie aktywuje: stos poziomów
 * tworzony i aktualizowany w miejscu (poziomy po `_id`, poziom z tokenem nie znika, rzeczy dodane
 * ręcznie zostają), rejestr i API trudnego przejścia, obejście błędu rdzenia z drzewem regionu,
 * „Opuść bezpiecznie”, strefa skażenia i skok (zasięg NOE, rozbieg, kładka, stan sesji i światła
 * przez re-eksport). Okna (rzut gracza, decyzja MG, progi wagi, okno skoku) — e2e i stacja Poligonu.
 */

import { MODULE_ID, SCRATCH_PREFIX, scratchActor, scratchCleanup } from "./helpers.mjs";
import { mapSyncApi } from "../scenes/map-sync.mjs";
import { transitionsApi, opuscBezpiecznie, __testing as skok } from "../scenes/transitions.mjs";
import { __testing as fxTest } from "../scenes/fx-markers.mjs";

const TYP = `${MODULE_ID}.trudnePrzejscie`;
const TYP_STREFA = `${MODULE_ID}.strefaSkazenia`;
const TYP_SKOK = `${MODULE_ID}.skok`;
const MAPA = "QUENCH_STOS";
const G = 100;
const A = "quenchPoziomA000", B = "quenchPoziomB000", C = "quenchPoziomC000", D = "quenchPoziomD000";

const prostokat = (x, y, w, h, hole = false) => ({ type: "rectangle", x: x * G, y: y * G, width: w * G, height: h * G,
  rotation: 0, hole });
const podloga = (id, level, levels, base, shapes) => ({
  _id: id, name: `podłoga ${level}`, shapes, levels, elevation: { bottom: base, top: base }, visibility: 0,
  behaviors: [{ _id: `${id.slice(0, 12)}beh0`, type: "defineSurface", name: "Podłoga",
    system: { placement: "bottom", light: true, move: true, sight: true, sound: true, occlusion: true } }],
  flags: { [MODULE_ID]: { source: "floor" } }
});

/** Plik sceny stosu w wersji 1: trzy poziomy, ściana na B, podłogi z otworem na A. */
function stosV1() {
  return {
    name: `${SCRATCH_PREFIX} stos`, width: 10 * G, height: 10 * G, padding: 0, navigation: false,
    grid: { type: 1, size: G, distance: 1.5, units: "m" },
    initialLevel: A,
    levels: [
      { _id: A, name: "A", elevation: { bottom: 0, top: null }, background: { src: null, color: "#000000" }, sort: 0 },
      { _id: B, name: "B", elevation: { bottom: -3, top: 0 }, background: { src: null, color: "#000000" }, sort: 1 },
      { _id: C, name: "C", elevation: { bottom: -6, top: -3 }, background: { src: null, color: "#000000" }, sort: 2 }
    ],
    walls: [{ _id: "quenchSciana0001", c: [200, 200, 400, 200], levels: [B], flags: { [MODULE_ID]: { source: "wall" } } }],
    tiles: [],
    regions: [
      podloga("quenchPodlogaA01", "A", [A], 0, [prostokat(0, 0, 10, 10), prostokat(4, 4, 2, 2, true)]),
      podloga("quenchPodlogaC01", "C", [C, B, A], -6, [prostokat(0, 0, 10, 10)])
    ],
    flags: { [MODULE_ID]: { mapId: MAPA, stack: true } }
  };
}

/** Wersja 2: A przemianowany, B przycięty, C wypada, D dochodzi; dwie ściany. */
function stosV2() {
  const v = stosV1();
  v.levels = [
    { ...v.levels[0], name: "A2" },
    { ...v.levels[1], textures: { fit: "fill", scaleX: 0.2, scaleY: 0.3, anchorX: 0.5, anchorY: 0.5, offsetX: -100, offsetY: 50 } },
    { _id: D, name: "D", elevation: { bottom: -9, top: -6 }, background: { src: null, color: "#000000" }, sort: 3 }
  ];
  v.walls.push({ _id: "quenchSciana0002", c: [200, 600, 400, 600], levels: [D], flags: { [MODULE_ID]: { source: "wall" } } });
  v.regions = [v.regions[0], podloga("quenchPodlogaD01", "D", [D, B, A], -9, [prostokat(0, 0, 10, 10)])];
  return v;
}

export function registerPoziomyTests(quench) {
  quench.registerBatch(`${MODULE_ID}.poziomy`, context => {
    const { describe, it, expect, after } = context;
    const sceny = [];

    after(async () => {
      for (const s of sceny) {
        // Folder spotkań: kopie z Bestiariusza zaimportowane przez map-sync.
        const folder = game.folders.find(f => f.getFlag(MODULE_ID, "encounterFolder") === s.id);
        if (folder) {
          await Actor.implementation.deleteDocuments(folder.contents.map(a => a.id));
          await folder.delete();
        }
        if (game.scenes.get(s.id)) await s.delete();
      }
      await scratchCleanup();
    });

    describe("map-sync: stos poziomów", function () {
      it("tworzy scenę z poziomami, ścianami i regionami po swoich poziomach", async function () {
        const scena = await mapSyncApi.utworz(MAPA, `${SCRATCH_PREFIX} stos`, { dane: stosV1() });
        sceny.push(scena);
        expect(scena.levels.map(l => l.id).sort()).to.deep.equal([A, B, C].sort());
        expect([...scena.walls.get("quenchSciana0001").levels]).to.deep.equal([B]);
        expect([...scena.regions.get("quenchPodlogaC01").levels].sort()).to.deep.equal([A, B, C].sort());
      });

      it("aktualizuje poziomy w miejscu; poziom z tokenem zostaje, ręczne rzeczy też", async function () {
        const scena = sceny[0];
        const aktor = await scratchActor({ name: `${SCRATCH_PREFIX} schodzący` });
        const [zeton] = await scena.createEmbeddedDocuments("Token",
          [(await aktor.getTokenDocument({ x: G, y: G, level: C, elevation: -6 })).toObject()]);
        const [reczny] = await scena.createEmbeddedDocuments("Region", [{ name: "ręczny", levels: [A],
          shapes: [prostokat(1, 1, 1, 1)], elevation: { bottom: null, top: null } }]);

        const r = await mapSyncApi.update(MAPA, { dane: stosV2() });
        expect(r.poziomy).to.deep.include({ zaktualizowane: 2, dodane: 1, usuniete: 0 });
        expect(r.poziomy.zostawione).to.deep.equal(["C"]);
        expect(scena.levels.get(A).name).to.equal("A2");
        expect(scena.levels.get(B).textures.scaleX).to.be.closeTo(0.2, 1e-9);
        expect(scena.levels.has(C), "C z tokenem zostaje").to.be.true;
        expect(scena.levels.has(D)).to.be.true;
        expect(scena.walls.size).to.equal(2);
        expect(scena.regions.has(reczny.id), "region dorysowany ręcznie").to.be.true;
        expect(scena.tokens.get(zeton.id)._source.level).to.equal(C);

        await zeton.delete();
        const r2 = await mapSyncApi.update(MAPA, { dane: stosV2() });
        expect(r2.poziomy.usuniete).to.equal(1);
        expect(scena.levels.has(C), "C bez tokenów znika").to.be.false;
      });
    });

    describe("trudne przejście", function () {
      it("typ zachowania zarejestrowany, API listuje i przełącza", async function () {
        expect(CONFIG.RegionBehavior.dataModels[TYP], "dataModels").to.exist;
        expect(game.documentTypes.RegionBehavior).to.include(TYP);
        const scena = sceny[0];
        const [region] = await scena.createEmbeddedDocuments("Region", [{
          name: "zerwany bieg", levels: [A], shapes: [prostokat(7, 7, 1, 1)], elevation: { bottom: null, top: null },
          behaviors: [{ type: TYP, name: "Trudne przejście",
            system: { mode: "auto", skill: "atl", dc: 12, fallFormula: "2d6", prompt: "Zejść?" } }]
        }]);
        const wpis = transitionsApi.przejscia(scena).find(p => p.region === region.id);
        expect(wpis).to.deep.include({ rodzaj: "trudnePrzejscie", tryb: "auto", st: 12, lina: false, wylaczone: false });
        expect(await transitionsApi.przelacz(region.id, false, scena)).to.equal(false);
        expect(region.behaviors.contents[0].disabled).to.be.true;
        expect(await transitionsApi.lina(region.id, true, scena)).to.equal(true);
        expect(region.behaviors.contents[0].system.roped).to.be.true;
      });

      it("ruch ze zmianą wysokości przez świeży region nie wywraca rdzenia (14.369)", async function () {
        const scena = sceny[0];
        const [region] = await scena.createEmbeddedDocuments("Region", [{ name: "świeży", levels: [A],
          shapes: [prostokat(2, 2, 2, 2)], elevation: { bottom: -10, top: 10 } }]);
        const droga = [{ x: 250, y: 250, elevation: 0 }, { x: 250, y: 250, elevation: -3 }];
        const oryginal = foundry.documents.RegionDocument.prototype.segmentizeMovementPath.__oryginal;
        // Kanarek: niezałatana metoda na świeżym regionie dalej się wywraca. Gdy rdzeń to naprawi,
        // ten test padnie i obejście w transitions.mjs można usunąć.
        expect(() => oryginal.call(region, droga, [{ x: 0, y: 0 }]), "błąd rdzenia nadal jest").to.throw(TypeError);
        expect(region.segmentizeMovementPath(droga, [{ x: 0, y: 0 }])).to.be.an("array");
      });
    });

    describe("strefa skażenia i skok", function () {
      const aktor = (sil, cechy = []) => ({ system: { abilities: { str: { value: sil }, dex: { value: 14 } } },
        items: cechy.map(id => ({ getFlag: (s, k) => (s === MODULE_ID && k === "abilityId" ? id : undefined) })) });

      it("zasięg NOE przy szczelinie 4,5 m: SIŁ 15 bez rzutu, 13 ST 10, 11 ST 15, 10 nie doskoczy", function () {
        expect(skok.liczSkok(aktor(15), 4.5, true)).to.include({ potrzeba: 15, st: 0, umiejetnosc: "atl" });
        expect(skok.liczSkok(aktor(13), 4.5, true).st).to.equal(10);
        expect(skok.liczSkok(aktor(11), 4.5, true).st).to.equal(15);
        expect(skok.liczSkok(aktor(10), 4.5, true).st).to.be.null;
        expect(skok.liczSkok(aktor(20), 4.5, false), "z miejsca nikt").to.include({ potrzeba: 30, st: null });
        expect(skok.liczSkok(aktor(10), 3, true).st, "3 m = SIŁ 10").to.equal(0);
      });

      it("Zwinność szczura: ZRC i Akrobatyka zamiast SIŁ i Atletyki", function () {
        expect(skok.liczSkok(aktor(8, ["zwinnosc-szczura"]), 4.5, true))
          .to.include({ cecha: "dex", umiejetnosc: "akr", wynik: 14, st: 10 });
      });

      it("rozbieg: 3 pola prosto przed pierwszym rzędem, z obu stron; skos i postój go zrywają", function () {
        const zeton = { parent: { grid: { size: G } } };
        const pt = (c, r) => ({ x: c * G, y: r * G });
        // Ruch staje na krawędzi regionu: pół pola przed polem strefy (stąd .5 przy wejściu).
        const ruch = (start, ...wp) => ({ origin: start, passed: { waypoints: wp } });
        expect(skok.wykryjRozbieg(zeton, ruch(pt(5, 1), pt(5, 4.5)), "S"), "z 1 do 5 na południe").to.be.true;
        expect(skok.wykryjRozbieg(zeton, ruch(pt(5, 8), pt(5, 5.5)), "N"), "z 8 do 5 na północ").to.be.true;
        expect(skok.wykryjRozbieg(zeton, ruch(pt(5, 3), pt(5, 4.5)), "S"), "z półki, jedno pole").to.be.false;
        expect(skok.wykryjRozbieg(zeton, ruch(pt(2, 1), pt(5, 1), pt(5, 4.5)), "S"), "zakręt, 3 pola po nim").to.be.true;
        expect(skok.wykryjRozbieg(zeton, ruch(pt(2, 3), pt(5.5, 4.5)), "S"), "skosem").to.be.false;
        expect(skok.zgodnyKierunek(ruch(pt(5, 6), pt(5, 5.5)), "S"), "brodzi na północ przez rząd skoku na południe").to.be.false;
      });

      it("typy zarejestrowane; kładka przełącza strefę, a map-sync zachowuje stan sesji i podmienia światła", async function () {
        for (const t of [TYP_STREFA, TYP_SKOK]) {
          expect(CONFIG.RegionBehavior.dataModels[t], t).to.exist;
          expect(game.documentTypes.RegionBehavior).to.include(t);
        }
        const scena = sceny[0];
        const v = stosV2();
        v.regions.push({
          _id: "quenchStrefa0001", name: "szlam", levels: [A], shapes: [prostokat(7, 1, 2, 3)],
          elevation: { bottom: null, top: null }, flags: { [MODULE_ID]: { source: "hazard", role: "hazard" } },
          behaviors: [{ _id: "quenchStrefaBeh1", type: TYP_STREFA, name: "Strefa", system: { dc: 15, dcFall: 20, label: "szlam" } }]
        }, {
          _id: "quenchSkok000001", name: "skok", levels: [A], shapes: [prostokat(7, 1, 2, 1)],
          elevation: { bottom: null, top: null }, flags: { [MODULE_ID]: { source: "link", role: "jump" } },
          behaviors: [{ _id: "quenchSkokBeh001", type: TYP_SKOK, name: "Skok",
            system: { gap: 3, dir: "S", hazard: "..quenchStrefa0001" } }]
        });
        v.lights = [{ _id: "quenchSwiatlo001", x: 800, y: 250, levels: [A], config: { dim: 3, color: "#5cff4a" },
          flags: { [MODULE_ID]: { source: "hazard", role: "light" } }}];
        await mapSyncApi.update(MAPA, { dane: v });
        const [reczne] = await scena.createEmbeddedDocuments("AmbientLight", [{ x: 100, y: 100, config: { dim: 2 } }]);

        const beh = () => scena.regions.get("quenchStrefa0001").behaviors.get("quenchStrefaBeh1");
        expect(scena.regions.get("quenchSkok000001").behaviors.contents[0].system.strefa?.label).to.equal("szlam");
        expect(transitionsApi.przejscia(scena).some(p => p.region === "quenchSkok000001" && p.rodzaj === TYP_SKOK)).to.be.true;
        expect(await transitionsApi.kladka("quenchStrefa0001", undefined, scena)).to.equal(true);
        expect(beh().system.bridged).to.be.true;

        const r = await mapSyncApi.update(MAPA, { dane: v });
        expect(r.przejsciaZeStanem).to.be.greaterThan(0);
        expect(beh().system.bridged, "kładka przeżywa re-eksport").to.be.true;
        expect(scena.lights.has("quenchSwiatlo001")).to.be.true;
        expect(scena.lights.has(reczne.id), "światło ręczne zostaje").to.be.true;
        expect(r.swiatlaUsuwane).to.equal(1);

        await mapSyncApi.update(MAPA, { dane: v, resetDrzwi: true });
        expect(beh().system.bridged, "resetDrzwi: stan z pliku").to.be.false;
      });
    });

    describe("spotkania", function () {
      it("tokeny z pliku: Bestiariusz i świat (dopisek w nawiasie), raz postawione, reset od nowa", async function () {
        if (!game.packs.get(`${MODULE_ID}.bestiariusz`)) this.skip();
        const scena = sceny[0];
        const obsada = await scratchActor({ name: `${SCRATCH_PREFIX} obsada (Recovered)`, type: "npc" });
        const spotkanie = (id, actor, x, hidden = true) => ({ _id: id, name: id, x: x * G, y: 8 * G, elevation: 0,
          level: A, hidden, flags: { [MODULE_ID]: { source: "encounter", actor, room: "test" } } });
        const v = stosV2();
        v.tokens = [spotkanie("quenchSpotkan001", "kurczak", 1), spotkanie("quenchSpotkan002", `world:${SCRATCH_PREFIX} obsada`, 2, false),
          spotkanie("quenchSpotkan003", "world:nie ma takiego aktora", 3)];

        const r = await mapSyncApi.update(MAPA, { dane: v });
        expect(r.spotkania).to.deep.include({ postawione: 2, wczesniej: 0 });
        expect(r.spotkania.nierozwiazane).to.have.length(1);
        const kurczak = scena.tokens.get("quenchSpotkan001");
        expect(kurczak?.hidden, "ukryty").to.be.true;
        expect(kurczak._source.level).to.equal(A);
        expect(kurczak.actorLink, "kopia z Bestiariusza: własne PW").to.be.false;
        expect(kurczak.actor?.getFlag(MODULE_ID, "bestiary.id")).to.equal("kurczak");
        expect(scena.tokens.get("quenchSpotkan002")?.actorId, "world: bez dopisku w nawiasie").to.equal(obsada.id);

        await kurczak.delete();                                       // zabity
        const r2 = await mapSyncApi.update(MAPA, { dane: v });
        expect(r2.spotkania.postawione, "zabity nie wraca").to.equal(0);
        expect(scena.tokens.has("quenchSpotkan001")).to.be.false;

        const r3 = await mapSyncApi.update(MAPA, { dane: v, resetDrzwi: true });
        expect(r3.spotkania.postawione, "nowa drużyna").to.equal(2);
        expect(scena.tokens.has("quenchSpotkan001")).to.be.true;
        const folder = game.folders.find(f => f.getFlag(MODULE_ID, "encounterFolder") === scena.id);
        expect(folder?.contents.filter(a => a.getFlag(MODULE_ID, "bestiary.id") === "kurczak"), "import raz").to.have.length(1);
      });
    });

    describe("znaczniki FX", function () {
      it("wzbogacacz @NeuroFx zamienia zapis w link", async function () {
        expect(CONFIG.TextEditor.enrichers.some(e => e.id === `${MODULE_ID}.fx`)).to.be.true;
        const html = await foundry.applications.ux.TextEditor.implementation.enrichHTML("<p>@NeuroFx[test-fx]{Detonuj}</p>");
        const div = document.createElement("div");
        div.innerHTML = html;
        const a = div.querySelector("a.neuro-fx");
        expect(a?.dataset.fxId).to.equal("test-fx");
        expect(a?.textContent.trim()).to.equal("Detonuj");
      });

      it("detonate: obszar na poziomie, pauza dla wszystkich, karta z zasięgiem, maszyna → wrak; wznowienie sprząta obszar", async function () {
        const scena = sceny[0];
        const aktor = await scratchActor({ name: `${SCRATCH_PREFIX} przy maszynie` });
        await scena.createEmbeddedDocuments("Token", [
          (await aktor.getTokenDocument({ name: "blisko", x: 6 * G, y: 6 * G, level: A, elevation: 0 }, { parent: scena })).toObject(),
          (await aktor.getTokenDocument({ name: "daleko", x: 9 * G, y: 0, level: A, elevation: 0 }, { parent: scena })).toObject()]);
        const kafel = (flagi, hidden) => ({ texture: { src: "icons/svg/cowled.svg" }, x: 6.5 * G, y: 6.5 * G, width: G, height: G,
          levels: [A], hidden, flags: { [MODULE_ID]: flagi } });
        await scena.createEmbeddedDocuments("Tile", [kafel({ fxGroup: "Maszyna", role: "cover" }, false),
          kafel({ fxWreck: "test-fx" }, true), kafel({ fxGroup: "Inna", role: "cover" }, false)]);
        const z = { kind: "detonate", title: "test", x: 6.5 * G, y: 6.5 * G, level: A, elevation: 0, sfx: null,
          radius: 3, lead: 0, tail: 0, hear: 10, text: "4k6", group: "Maszyna" };
        expect(fxTest.wZasiegu(scena, z).map(t => t.name)).to.deep.equal(["blisko"]);
        const bylaPauza = game.paused;
        const przed = new Set(game.messages.map(m => m.id));
        try {
          const r = await fxTest.detonuj("test-fx", scena, z);
          expect(game.paused, "pauza").to.be.true;
          const obszar = scena.regions.get(r.obszar);
          expect(obszar?.shapes[0].radius).to.be.closeTo(2 * G, 1e-6);   // 3 m przy 1,5 m na pole
          expect([...obszar.levels]).to.deep.equal([A]);
          expect(scena.getFlag(MODULE_ID, "fxStan")?.["test-fx"]).to.exist;
          expect(r.kafle, "maszyna znika, wrak się pojawia").to.equal(2);
          expect(scena.tiles.find(t => t.getFlag(MODULE_ID, "fxGroup") === "Maszyna").hidden).to.be.true;
          expect(scena.tiles.find(t => t.getFlag(MODULE_ID, "fxWreck") === "test-fx").hidden).to.be.false;
          expect(scena.tiles.find(t => t.getFlag(MODULE_ID, "fxGroup") === "Inna").hidden, "inna grupa zostaje").to.be.false;
          const zar = scena.lights.find(l => l.getFlag(MODULE_ID, "fx") === "test-fx" && l.getFlag(MODULE_ID, "role") === "glow");
          expect([...(zar?.levels ?? [])], "żar na poziomie znacznika").to.deep.equal([A]);
          const karta = game.messages.find(m => !przed.has(m.id));
          expect(karta?.content).to.include("blisko").and.not.include("daleko");
          await karta?.delete();
          game.togglePause(false, { broadcast: true });
          for (let i = 0; i < 40 && scena.regions.has(r.obszar); i++) await new Promise(res => setTimeout(res, 50));
          expect(scena.regions.has(r.obszar), "wznowienie sprząta obszar").to.be.false;
        } finally {
          if (game.paused !== bylaPauza) game.togglePause(bylaPauza, { broadcast: true });
        }
      });

      it("reveal: tylko tokeny grupy wychodzą z ukrycia, kafle cover/revealed się zamieniają", async function () {
        const scena = sceny[0];
        const aktor = await scratchActor({ name: `${SCRATCH_PREFIX} w aucie` });
        const tok = async (name, room) => ({ ...(await aktor.getTokenDocument({ name, x: G, y: G, level: A, hidden: true,
          flags: { [MODULE_ID]: { source: "encounter", room } } }, { parent: scena })).toObject() });
        await scena.createEmbeddedDocuments("Token", [await tok("w aucie", "Auto"), await tok("gdzie indziej", "Inne")]);
        const kafel = (rola, hidden) => ({ texture: { src: "icons/svg/cowled.svg" }, x: 2 * G, y: 2 * G, width: G, height: G,
          levels: [A], hidden, flags: { [MODULE_ID]: { fxGroup: "Auto", role: rola } } });
        await scena.createEmbeddedDocuments("Tile", [kafel("cover", false), kafel("revealed", true)]);
        const r = await fxTest.odslon("auto", scena, { kind: "reveal", group: "Auto" });
        expect(r).to.deep.equal({ tokeny: 1, kafle: 2 });
        expect(scena.tokens.find(t => t.name === "w aucie").hidden).to.be.false;
        expect(scena.tokens.find(t => t.name === "gdzie indziej").hidden).to.be.true;
        const rola = r => scena.tiles.find(t => t.getFlag(MODULE_ID, "fxGroup") === "Auto" && t.getFlag(MODULE_ID, "role") === r);
        expect(rola("cover").hidden).to.be.true;
        expect(rola("revealed").hidden).to.be.false;
      });
    });

    describe("Opuść bezpiecznie", function () {
      it("token nad otworem schodzi na podłogę niżej, na jej poziom", async function () {
        const scena = sceny[0];
        const aktor = await scratchActor({ name: `${SCRATCH_PREFIX} nad otworem` });
        const [zeton] = await scena.createEmbeddedDocuments("Token",
          [(await aktor.getTokenDocument({ x: 4 * G, y: 4 * G, level: A, elevation: 0 })).toObject()]);
        // Pod otworem w A (4..5 x 4..5) jedyną podłogą jest D na -9 (stos v2).
        const pod = zeton._findSupportingSurface();
        expect(pod?.elevation).to.equal(-9);
        expect(await opuscBezpiecznie(zeton)).to.be.true;
        expect(zeton._source.elevation).to.equal(-9);
        expect(zeton._source.level).to.equal(D);
        expect(await opuscBezpiecznie(zeton), "na podłodze nie ma już niżej").to.be.false;
      });
    });
  });
}
