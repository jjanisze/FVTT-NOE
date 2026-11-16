/**
 * Neuroshima 5e — teren i ruch bez drogi M8 (PLAN_m8_ruch_i_ekonomia_akcji §3.1, §3.2, §4.4, §8.2, §9; §11 T20).
 *
 * Warstwa 1: przyczyny terenu NOE, lustro reguły odporności dnd5e, jednostki sceny, dopłata ciągnięcia (D34), koszt
 * ruchu bez drogi (wsiadanie kierowcy „reszta”), budżet na scenie w ft.
 * Warstwa 4: prawdziwe zdolności z paczek (Człowiek-pająk, Włóczykij) przeciw prawdziwym zachowaniom Regionu,
 * warunek Alpinisty z lalki (wolne ręce, broń, zestaw wspinaczkowy), natywny tryb „Ciągnięcie”, preset Regionu MG,
 * koszt wsiadania/dosiadania w ledgerze, Zabezpieczenie w rejestrze Ułatwień.
 */

import { SCRATCH_PREFIX, scratchActor, scratchCleanup, stub, walkaTestowa, waitFor } from "./helpers.mjs";
import * as E from "../config/ekonomia-data.mjs";
import * as TD from "../config/teren-data.mjs";
import { ledger, kombatant, stan, zaplacRuch } from "../combat/ekonomia.mjs";
import { danePresetu, uzbroj, rozbroj, preset, zastosuj, doplataDlaTokenu, TRYB_CIAGNIECIA } from "../scenes/teren-preset.mjs";
import { stanRak } from "../actors/rece-dane.mjs";
import { kosztDosiadania } from "../pojazdy/jadacy.mjs";
import { rozstrzygnijRzut } from "../combat/ulatwienia-testow.mjs";
import { change, CHANGE_TYPE } from "../config/effect-changes.mjs";
import { REAL_GEAR, buildRealGearItemData } from "../config/gear-data.mjs";
import { WEAPON_MAP, buildWeaponItemData } from "../config/weapons-data.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

const wl = r => ({ runda: r, cykl: r, wlasna: true, reakcja: null });
const sp = walk => ({ szybkosci: { walk, swim: 0, climb: 0, fly: 0, burrow: 0 } });

async function packDoc(pack, pred) {
  return (await game.packs.get(`${MODULE_ID}.${pack}`)?.getDocuments() ?? []).find(pred) ?? null;
}

/** Region z natywnym trudnym terenem o tych przyczynach na scenie testowej. */
async function region(scena, typy, nazwa = "Teren") {
  const [r] = await scena.createEmbeddedDocuments("Region", [{ name: nazwa, levels: [scena.levels.contents[0]?.id].filter(Boolean),
    shapes: [{ type: "rectangle", x: 0, y: 0, width: 100, height: 100, rotation: 0, hole: false }],
    elevation: { bottom: null, top: null }, behaviors: [{ type: "dnd5e.difficultTerrain", name: "Trudny teren", system: { types: typy } }] }]);
  return r;
}

/** Czy zachowanie Regionu spowalnia ten token (reguła dnd5e, bez kanwy). */
const spowalnia = (r, tok) => r.behaviors.contents[0].system._getTerrainEffects(tok, null).length > 0;

export function registerTerenM8Tests(quench) {
  quench.registerBatch(`${MODULE_ID}.teren-m8`, context => {
    const { describe, it, expect, after } = context;
    const start = Date.now();

    after(async () => {
      rozbroj();
      await scratchCleanup();
      const msgs = game.messages.filter(m => m.timestamp >= start).map(m => m.id);
      if (msgs.length) await ChatMessage.implementation.deleteDocuments(msgs);
    });

    describe("Teren i jednostki (warstwa 1)", function () {
      it("przyczyny NOE w dnd5e: schody, zagracenie, niski strop dopisane; etykiety po polsku; nazwa presetu", function () {
        const typy = CONFIG.DND5E.difficultTerrainTypes;
        for (const p of TD.PRZYCZYNY_TERENU) expect(typy[p.id]?.label, p.id).to.equal(p.label);
        expect(TD.nazwaTerenu(["rocks", "stairs", "nieznana"]), "kolejność listy, bez nieznanych").to.equal("Trudny teren — Schody, Gruz / kamienie");
        expect(TD.nazwaTerenu([])).to.equal("Trudny teren");
        expect(TD.zachowanieTerenu(["mud"])).to.deep.equal({ type: "dnd5e.difficultTerrain", name: "Trudny teren — Mokradło / bagno", system: { magical: false, types: ["mud"] } });
      });

      it("odporności (§8.2): schody bez gruzu — tak, z gruzem — nie; „inne” tylko dla Cichego kroku; Włóczykij bez wody", function () {
        const pajak = TD.ODPORNOSCI_TERENU.czlowiekPajak, wl = TD.ODPORNOSCI_TERENU.wloczykij;
        expect(TD.terenIgnorowany(["stairs"], pajak)).to.equal(true);
        expect(TD.terenIgnorowany(["stairs", "rocks"], pajak), "gruz na schodach dalej spowalnia").to.equal(false);
        expect(TD.terenIgnorowany([], pajak), "nieznana przyczyna — deklaracja, nie niewrażliwość").to.equal(false);
        expect(TD.terenIgnorowany([], ["all"]), "Cichy krok — każdy trudny teren").to.equal(true);
        expect([TD.terenIgnorowany(["mud"], wl), TD.terenIgnorowany(["sand"], wl), TD.terenIgnorowany(["liquid"], wl)]).to.deep.equal([true, true, false]);
      });

      it("jednostki sceny: metry (także pusta jednostka) — tak; ft, km — ręcznie", function () {
        expect(TD.jednostkiSceny("m").metry).to.equal(true);
        expect(TD.jednostkiSceny(" Metry ").metry).to.equal(true);
        expect(TD.jednostkiSceny("").metry).to.equal(true);
        expect(TD.jednostkiSceny("ft")).to.deep.equal({ metry: false, jednostka: "ft" });
        expect(TD.jednostkiSceny("km").metry).to.equal(false);
      });

      it("D34 ciągnięcie: +dystans; chwytający 2 rozmiary większy — bez; leżąc — także czołganie (6 m na 1,5 m z terenem)", function () {
        expect(TD.doplataCiagniecia(1.5, { chwytajacy: "med", cel: "med" })).to.equal(1.5);
        expect(TD.doplataCiagniecia(1.5, { chwytajacy: "huge", cel: "med" }), "dwa rozmiary większy").to.equal(0);
        expect(TD.doplataCiagniecia(1.5, { chwytajacy: "lg", cel: "med" }), "jeden rozmiar — dopłata").to.equal(1.5);
        expect(TD.doplataCiagniecia(1.5, { chwytajacy: "med", cel: null }), "nieznany cel — dopłata").to.equal(1.5);
        // Natywny koszt odcinka na trudnym terenie = 3; + ciągnięcie 1,5 + czołganie 1,5 = 6 (tabela §3.2).
        expect(3 + TD.doplataCiagniecia(1.5, { chwytajacy: "med", cel: "med", powalony: true })).to.equal(6);
      });

      it("ruch bez drogi (§4.4): kierowca „reszta” — co najmniej połowa, a gdy zostało więcej — wszystko; ponad pulę — ostrzeżenie", function () {
        const l = E.pustyLedger("w");
        E.zapiszRuch(l, wl(1), { ruchId: "a", czesc: "0+1", koszt: 3, dyst: 3, tryb: "walk", zt: "z" }, sp(9));
        const z1 = E.zadanieKosztuRuchu(l, wl(1), sp(9), { ile: 4, reszta: true, zrodlo: "Wsiadanie" }).zadanie;
        expect(z1.ruch, "zostało 6 — kierowca traci resztę").to.equal(6);
        expect(z1.ostrz).to.deep.equal([]);
        const z2 = E.zadanieKosztuRuchu(l, wl(1), sp(9), { ile: 7, zrodlo: "Wsiadanie" });
        expect(z2.zadanie.ruch).to.equal(7);
        expect(z2.ostrz.join(" ")).to.match(/Wsiadanie: 7 m przy 6 m/);
        expect(kosztDosiadania(9), "wierzchowiec: 4,5 bez zaokrąglania pojazdów").to.equal(4.5);
        expect(kosztDosiadania(9, { jezdziec: true })).to.equal(1.5);
      });

      it("scena w ft (§3.1): ruch zapisany z jednostką, poza metrami budżetu, „rozlicz ręcznie”", function () {
        const l = E.pustyLedger("w");
        E.zapiszRuch(l, wl(1), { ruchId: "f", czesc: "0+1", koszt: 30, dyst: 30, tryb: "walk", zt: "z", jednostki: "ft" }, sp(9));
        const b = E.budzetRuchu(l, wl(1), sp(9));
        expect(l.ruchy[0].jednostki).to.equal("ft");
        expect(b.wydane, "30 ft nie zjada 9 m").to.equal(0);
        expect(b.reczne.join(" ")).to.match(/scena w ft — .*rozlicz ręcznie/);
      });
    });

    describe("Zdolności i Regiony (warstwa 4)", function () {
      it("Człowiek-pająk i Włóczykij z paczek przeciw zachowaniom Regionu; „inne” spowalnia; Cichy krok — wszystko", async function () {
        const cp = await packDoc("sztuczki", d => d.getFlag(MODULE_ID, "sztuczka") === "czlowiekPajak");
        const wk = await packDoc("zdolnosci-pochodzenia", d => d.getFlag(MODULE_ID, "originAbilityId") === "wloczykij");
        if (!cp?.effects?.some(e => e.name.includes("Po dwa naraz")) || !wk?.effects?.size) this.skip(); // paczki sprzed przebudowy
        const pajak = await scratchActor({ name: `${SCRATCH_PREFIX} Pająk M8` });
        const wlocz = await scratchActor({ name: `${SCRATCH_PREFIX} Włóczykij M8` });
        const zwykly = await scratchActor({ name: `${SCRATCH_PREFIX} Zwykły M8` });
        const cichy = await scratchActor({ name: `${SCRATCH_PREFIX} Cichy M8` });
        await pajak.createEmbeddedDocuments("Item", [game.items.fromCompendium(cp)]);
        await wlocz.createEmbeddedDocuments("Item", [game.items.fromCompendium(wk)]);
        await cichy.createEmbeddedDocuments("ActiveEffect", [{ name: "Cichy krok (test)",
          system: { changes: [change("system.attributes.movement.ignoredDifficultTerrain", CHANGE_TYPE.add, "all")] } }]);
        expect([...pajak.system.attributes.movement.ignoredDifficultTerrain].sort()).to.deep.equal(["slope", "stairs"]);
        expect([...wlocz.system.attributes.movement.ignoredDifficultTerrain].sort()).to.deep.equal(["mud", "sand"]);
        const w = await walkaTestowa([pajak, wlocz, zwykly, cichy], { kto: pajak, nazwa: "m8-teren" });
        try {
          const tok = a => w.zetony.find(t => t.actorId === a.id);
          const schody = await region(w.scena, ["stairs"], "Schody");
          const gruzNaSchodach = await region(w.scena, ["stairs", "rocks"], "Schody z gruzem");
          const inne = await region(w.scena, [], "Inne");
          const bagno = await region(w.scena, ["mud"], "Bagno");
          const woda = await region(w.scena, ["liquid"], "Woda");
          expect([spowalnia(schody, tok(pajak)), spowalnia(gruzNaSchodach, tok(pajak)), spowalnia(inne, tok(pajak))]).to.deep.equal([false, true, true]);
          expect([spowalnia(bagno, tok(wlocz)), spowalnia(woda, tok(wlocz))]).to.deep.equal([false, true]);
          expect([spowalnia(schody, tok(zwykly)), spowalnia(bagno, tok(zwykly))]).to.deep.equal([true, true]);
          expect([spowalnia(inne, tok(cichy)), spowalnia(gruzNaSchodach, tok(cichy))]).to.deep.equal([false, false]);
        } finally {
          await w.sprzatnij();
        }
      });

      it("T20: Alpinista — wolne ręce tak; broń w ręce nie; zestaw wspinaczkowy w ręce tak; zestaw w plecaku nie", async function () {
        const cp = await packDoc("sztuczki", d => d.getFlag(MODULE_ID, "sztuczka") === "czlowiekPajak");
        // Sprzęt do wspinaczki to sprzęt z katalogu Zbrojowni (`REAL_GEAR`), nie z paczki.
        const zestaw = REAL_GEAR.find(g => g.id === "sprzet_wspinaczkowy");
        if (!cp?.effects?.some(e => e.name.includes("Alpinista") && e._source.system?.conditions?.includes?.("neuro.rece")) || !zestaw) this.skip();
        const a = await scratchActor({ name: `${SCRATCH_PREFIX} Alpinista M8`, system: { attributes: { movement: { speeds: { walk: 9 }, units: "m" } } } });
        await a.createEmbeddedDocuments("Item", [game.items.fromCompendium(cp)]);
        const climb = () => a.system.attributes.movement.speeds.climb;
        expect(stanRak(a)).to.deep.equal({ wolne: 2, wspinaczka: true });
        expect(climb(), "obie ręce wolne").to.equal(9);
        const [noz] = await a.createEmbeddedDocuments("Item", [buildWeaponItemData(WEAPON_MAP.b92)]);
        expect(await game.neuroshima.lalka.place(a, a.items.get(noz.id), "hand", { quiet: true }), "broń do ręki").to.equal(true);
        await waitFor(() => stanRak(a).wolne === 1, { label: "nóż w ręce" });
        expect(climb(), "broń w ręce — bez Alpinisty").to.not.equal(9);
        const [z] = await a.createEmbeddedDocuments("Item", [buildRealGearItemData(zestaw)]);
        expect(stanRak(a).wspinaczka, "zestaw w plecaku nie wystarcza").to.equal(false);
        expect(await game.neuroshima.lalka.place(a, a.items.get(noz.id), "pack", { quiet: true }), "broń do plecaka").to.equal(true);
        expect(await game.neuroshima.lalka.place(a, a.items.get(z.id), "hand", { quiet: true }), "zestaw do ręki").to.equal(true);
        await waitFor(() => stanRak(a).wspinaczka, { label: "zestaw w ręce" });
        expect(climb(), "zestaw wspinaczkowy w ręce").to.equal(9);
      });

      it("Zabezpieczenie: RO ze źródłem „upadek” — Ułatwienie dla Człowieka-pająka, bez źródła — nie", async function () {
        const cp = await packDoc("sztuczki", d => d.getFlag(MODULE_ID, "sztuczka") === "czlowiekPajak");
        if (!cp) this.skip();
        const a = await scratchActor({ name: `${SCRATCH_PREFIX} Zabezpieczony M8` });
        await a.createEmbeddedDocuments("Item", [game.items.fromCompendium(cp)]);
        const cfg = k => ({ subject: a, hookNames: ["SavingThrow", "d20Test"], ability: "dex", neuroKontekst: k });
        expect(rozstrzygnijRzut(cfg(["upadek"]))?.wynik.ulatwienia.map(x => x.id)).to.include("czlowiekPajak");
        expect(rozstrzygnijRzut(cfg([]))?.wynik.ulatwienia.map(x => x.id) ?? []).to.not.include("czlowiekPajak");
      });

      it("tryb „Ciągnięcie”: natywna akcja ruchu; dopłata z pochwyconego (rozmiar), Powalenie dokłada czołganie", async function () {
        const akcja = CONFIG.Token.movement.actions[TRYB_CIAGNIECIA];
        expect(akcja?.label).to.equal("Ciągnięcie");
        expect(E.trybBazowy(TRYB_CIAGNIECIA, { walk: 9 }), "Szybkość z chodu").to.equal("walk");
        const chwyt = await scratchActor({ name: `${SCRATCH_PREFIX} Chwytający M8`, system: { attributes: { movement: { speeds: { walk: 9 }, units: "m" } } } });
        const ofiara = await scratchActor({ name: `${SCRATCH_PREFIX} Pochwycony M8`, type: "npc", system: { traits: { size: "med" } } });
        const maly = await scratchActor({ name: `${SCRATCH_PREFIX} Mały M8`, type: "npc", system: { traits: { size: "tiny" } } });
        const w = await walkaTestowa([chwyt, ofiara], { kto: chwyt, nazwa: "m8-ciagniecie" });
        try {
          const tok = w.zetony.find(t => t.actorId === chwyt.id);
          const trzyma = uuid => chwyt.setFlag(MODULE_ID, "handOccupants", [{ slot: "hand.0", label: "trzyma", actorUuid: uuid, kind: "grapple" }]);
          await trzyma(ofiara.uuid);
          const koszt = akcja.getCostFunction(tok, {});
          expect(koszt(3, null, null, 1.5), "trudny teren 3 + ciągnięcie 1,5").to.equal(4.5);
          expect(doplataDlaTokenu(tok, 1.5)).to.equal(1.5);
          await trzyma(maly.uuid);
          expect(akcja.getCostFunction(tok, {})(1.5, null, null, 1.5), "średni chwytający, maleńki cel — bez dopłaty").to.equal(1.5);
          await trzyma(ofiara.uuid);
          await chwyt.toggleStatusEffect("prone", { active: true });
          expect(akcja.getCostFunction(tok, {})(3, null, null, 1.5), "czołganie + teren + ciągnięcie = 6").to.equal(6);
        } finally {
          await w.sprzatnij();
        }
      });

      it("preset Regionu MG: uzbrojony — nowy Region z przyczynami, nazwą, widocznością MG; zastosuj łączy przyczyny; rozbrojony — nic", async function () {
        const w = await walkaTestowa([await scratchActor({ name: `${SCRATCH_PREFIX} Preset M8` })], { nazwa: "m8-preset" });
        try {
          const ksztalt = { type: "rectangle", x: 200, y: 200, width: 100, height: 100, rotation: 0, hole: false };
          const nowy = async () => (await w.scena.createEmbeddedDocuments("Region", [{ name: "R", shapes: [ksztalt], elevation: { bottom: null, top: null } }]))[0];
          expect(uzbroj(["stairs", "x"])).to.deep.equal(["stairs"]);
          const r1 = await nowy();
          const b = r1.behaviors.contents[0];
          expect([r1.name, b?.type, [...(b?.system?.types ?? [])]]).to.deep.equal(["Trudny teren — Schody", "dnd5e.difficultTerrain", ["stairs"]]);
          expect(r1.visibility).to.equal(CONST.REGION_VISIBILITY.GAMEMASTER);
          expect(r1.getFlag(MODULE_ID, "source"), "podświetlenie przy planowaniu ruchu").to.equal("preset");
          expect(game.neuroshima.trudnyTeren.trudnyTeren({ document: r1 })).to.equal(true);
          await zastosuj([r1], ["rocks"]);
          expect(r1.behaviors.size, "jedno zachowanie — dwa nie robią ×4").to.equal(1);
          expect([...r1.behaviors.contents[0].system.types].sort()).to.deep.equal(["rocks", "stairs"]);
          rozbroj();
          expect(preset()).to.equal(null);
          expect((await nowy()).behaviors.size, "bez presetu — zwykły Region").to.equal(0);
          expect(danePresetu([]).name).to.equal("Trudny teren");
        } finally {
          rozbroj();
          await w.sprzatnij();
        }
      });

      it("E9: wierzchowiec prowadzony działa w turze jeźdźca — Bieganie z palety w ledgerze konia (A, 2× Szybkości), jeździec nie płaci; druga akcja konia ostrzega", async function () {
        const kon = await packDoc("bestiariusz", d => d.getFlag(MODULE_ID, "bestiary")?.id === "kon-zdrowy");
        if (!kon || !game.neuroshima.pojazdy?.posadz) this.skip();
        const jezdziec = await scratchActor({ name: `${SCRATCH_PREFIX} Jeździec E9`, system: { attributes: { movement: { speeds: { walk: 9 }, units: "m" } } } });
        const kd = game.actors.fromCompendium(kon);
        const konA = await scratchActor({ ...kd, name: `${SCRATCH_PREFIX} Koń E9`,
          flags: { ...(kd.flags ?? {}), [MODULE_ID]: { ...(kd.flags?.[MODULE_ID] ?? {}), wierzchowiec: { wyszkolony: true } } } });
        const inny = await scratchActor({ name: `${SCRATCH_PREFIX} Obok E9` });
        const w = await walkaTestowa([jezdziec, konA, inny], { kto: jezdziec, nazwa: "m8-kon" });
        const r = stub(game, "combat", w.combat);
        try {
          const tKon = w.zetony.find(t => t.actorId === konA.id);
          const tJ = w.zetony.find(t => t.actorId === jezdziec.id);
          await game.neuroshima.pojazdy.posadz(tKon, tJ, "siodlo-0-0");
          const { kotwicaWpisu } = await import("../combat/kotwica-tury.mjs");
          const cKon = w.combat.combatants.find(c => c.tokenId === tKon.id);
          if (kotwicaWpisu(cKon)?.id !== "wierzchowiec") this.skip(); // M4 nie zakotwiczył konia na tej scenie
          // Tura jeźdźca: chwila konia jest jego własną (kotwica z pominiętą turą).
          await waitFor(() => stan(tJ)?.chwila.wlasna, { label: "tura jeźdźca" });
          expect(stan(tKon).chwila.wlasna, "koń działa w turze jeźdźca").to.equal(true);
          const vKon = Number(konA.system.attributes.movement.speeds.walk) || 0;
          const { uzyjPalety } = await import("../pojazdy/paleta.mjs");
          await uzyjPalety(tKon, "bieganie");
          const s = await waitFor(() => (stan(tKon).pule.A.wydane === 1 ? stan(tKon) : null), { label: "A konia" });
          expect(s.ruch.pojemnosc, "Szybkość konia + Bieganie 2×").to.equal(vKon * 3);
          expect(stan(tJ).pule.A.wydane, "jeździec nie płaci za Bieganie konia").to.equal(0);
          await uzyjPalety(tKon, "unikanie");
          await waitFor(() => stan(tKon).pule.A.wydane === 2, { label: "druga akcja konia" });
          expect(stan(tKon).pule.A.pozostalo, "jedna akcja wierzchowca — druga ponad pulę").to.equal(-1);
        } finally {
          r();
          await w.sprzatnij();
        }
      });

      it("M4 → ledger: wsiadanie we własnej turze pobiera ruch (raz po id), poza turą — nic; budżet maleje", async function () {
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Wsiadający M8`, system: { attributes: { movement: { speeds: { walk: 9 }, units: "m" } } } });
        const inny = await scratchActor({ name: `${SCRATCH_PREFIX} Czekający M8`, system: { attributes: { movement: { speeds: { walk: 9 }, units: "m" } } } });
        const w = await walkaTestowa([pc, inny], { kto: pc, nazwa: "m8-wsiadanie" });
        const r = stub(game, "combat", w.combat);
        try {
          const tok = w.zetony.find(t => t.actorId === pc.id);
          const tokInny = w.zetony.find(t => t.actorId === inny.id);
          const c = kombatant(tok);
          await waitFor(() => ledger(c).tury.length > 0, { label: "instancja tury" });
          const r1 = await zaplacRuch(tok, { ile: 4.5, zrodlo: "Dosiadanie (test)", id: "m4-test-1" });
          expect(r1.ok).to.equal(true);
          expect(stan(tok).ruch.wydane).to.equal(4.5);
          const r2 = await zaplacRuch(tok, { ile: 4.5, zrodlo: "Dosiadanie (test)", id: "m4-test-1" });
          expect(r2.duplikat, "ten sam id — raz").to.equal(true);
          expect(stan(tok).ruch.wydane).to.equal(4.5);
          expect((await zaplacRuch(tokInny, { ile: 4.5, zrodlo: "Dosiadanie (test)" })).pominiety, "cudza tura").to.equal(true);
          expect((await zaplacRuch(tok, { ile: 0, zrodlo: "Pasażer" })).pominiety, "0 m — bez zapisu").to.equal(true);
          const op = ledger(c).ops.find(o => o.id === "m4-test-1");
          expect([op.rodzaj, op.ruch, op.zrodlo]).to.deep.equal(["ruch", 4.5, "Dosiadanie (test)"]);
        } finally {
          r();
          await w.sprzatnij();
        }
      });
    });
  });
}
