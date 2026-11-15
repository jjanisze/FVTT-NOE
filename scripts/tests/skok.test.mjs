/**
 * Neuroshima 5e — skok M8 (PLAN_m8_ruch_i_ekonomia_akcji §4.5, E3; §11 T15–T18).
 *
 * Warstwa 1: kalkulator NOE (s. 256, 70, 94) — zasięg w dal/wzwyż z rozbiegu i z miejsca, Skoczek, Gladiator (D33),
 * skoki w trasie i rozbieg z dystansu, szczelina Regionu bez dawnych ST 10/15.
 * Warstwa 4: prawdziwy ruch „Skok” w walce — ostrzeżenie zasięgu trwale w ledgerze, karta lądowania na trudnym
 * terenie (test → Powalenie), karta Skoku Gladiatora na zajęte pole, koszt skoku z Regionu do zapisu ruchu.
 */

import { SCRATCH_PREFIX, scratchActor, scratchCleanup, stub, walkaTestowa, waitFor } from "./helpers.mjs";
import * as S from "../config/skok-data.mjs";
import { ledger, kombatant, stan } from "../combat/ekonomia.mjs";
import { zasiegi, zaplacSkok, __testing as T } from "../combat/skok.mjs";
import { __testing as TR } from "../scenes/transitions.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Odcinek trasy: akcja, poziomo, pionowo; `stary` — z wcześniejszego ruchu (tylko rozbieg). */
const o = (akcja, poziomo, pionowo = 0, stary = false) => ({ akcja, poziomo, pionowo, nowy: !stary });

export function registerSkokTests(quench) {
  quench.registerBatch(`${MODULE_ID}.skok`, context => {
    const { describe, it, expect, after } = context;
    const start = Date.now();

    after(async () => {
      await scratchCleanup();
      const msgs = game.messages.filter(m => m.timestamp >= start).map(m => m.id);
      if (msgs.length) await ChatMessage.implementation.deleteDocuments(msgs);
    });

    describe("Kalkulator NOE (warstwa 1)", function () {
      it("T15: SIŁ 14 — w dal 4,2/2,1, wzwyż 1,2/0,6, sięgnięcie osobno; 4,2 nie staje się 4,5", function () {
        const r = S.zasiegSkoku({ sila: 14, modSily: 2, rozbieg: true, wzrost: 1.8 });
        const m = S.zasiegSkoku({ sila: 14, modSily: 2, rozbieg: false, wzrost: 1.8 });
        expect([r.dal, m.dal]).to.deep.equal([4.2, 2.1]);
        expect([r.wzwyz, m.wzwyz]).to.deep.equal([1.2, 0.6]);
        expect([r.siegniecie, m.siegniecie], "wysokość skoku + 1,5 × wzrost").to.deep.equal([3.9, 3.3]);
        expect(S.zasiegSkoku({ sila: 14, modSily: 2 }).siegniecie, "bez wzrostu — bez zgadywania").to.equal(null);
        expect(S.skokPrzezSzczeline(4.5, r.dal, 1.5), "brak ceil do 4,5").to.deep.equal({ doskakuje: false, dlugosc: 4.2, polaWglab: 3 });
        expect(S.skokPrzezSzczeline(4.5, 4.5, 1.5).doskakuje).to.equal(true);
        expect(S.zasiegSkoku({ sila: 3, modSily: -4 }).wzwyz, "ujemny wzrost skoku = 0").to.equal(0);
      });

      it("T16: Skoczek — w dal z ZRC, wysokość bez zmian; Gladiator ×2 obie; istota bez ludzkiego wzoru", async function () {
        const sk = S.zasiegSkoku({ sila: 8, zrc: 16, modSily: -1, skoczek: true });
        expect(sk.dal).to.equal(4.8);
        expect(sk.wzwyz, "wzwyż nadal z SIŁ (§2.2)").to.equal(0.3);
        expect(sk.wzorDal).to.match(/^ZRC 16/);
        const gl = S.zasiegSkoku({ sila: 14, modSily: 2, gladiator: true });
        expect([gl.dal, gl.wzwyz]).to.deep.equal([8.4, 2.4]);
        expect(S.zasiegSkoku({ sila: 14, modSily: 2, gladiator: true, rozbieg: false }).dal).to.equal(4.2);
        const istota = await scratchActor({ name: `${SCRATCH_PREFIX} Skoczek-istota`, type: "npc" });
        await istota.createEmbeddedDocuments("Item", [{ name: "Skok", type: "feat",
          system: { description: { value: "<p>Zamiast przemieścić się o 6 m, może wykonać skok długości 6 m lub wysokości do 3 m.</p>" } } }]);
        const z = zasiegi(istota);
        expect(z.reczny, "opis cechy, nie wzór SIŁ").to.match(/Skok.*6 m/);
      });

      it("T17: Gladiator D33 — 2,9 → 0k6, 3 → 1k6, 6 → 2k6, 4,5 + 3 → 1k6; ST 8 + SIŁ + PB; rozmiar celu", function () {
        expect([2.9, 3, 6].map(p => S.kosciGladiatora({ poziomo: p }))).to.deep.equal([0, 1, 2]);
        expect(S.kosciGladiatora({ poziomo: 4.5, wzwyz: 3 }), "max, nie suma").to.equal(1);
        expect(S.stGladiatora({ modSily: 3, pb: 2 })).to.equal(13);
        expect(S.gladiatorDosiega("med", "lg"), "o jeden większy").to.equal(true);
        expect(S.gladiatorDosiega("med", "huge"), "o dwa większy").to.equal(false);
      });

      it("skoki w trasie: rozbieg z dystansu (kilka dragów), skok z miejsca i wzwyż; przekroczenie ostrzega", function () {
        const z = { zRozbiegu: S.zasiegSkoku({ sila: 14, modSily: 2 }), zMiejsca: S.zasiegSkoku({ sila: 14, modSily: 2, rozbieg: false }) };
        // Dwa dragi po 1,5 m (starszy tylko jako rozbieg), potem skok 4,5 m.
        const [a] = S.skokiWTrasie([o("walk", 1.5, 0, true), o("walk", 1.5), o("jump", 4.5)]);
        expect(a).to.include({ poziomo: 4.5, rozbieg: 3 });
        expect(S.ocenSkok(a, z)[0]).to.match(/Skok 4,5 m — ponad zasięg 4,2 m \(z rozbiegu/);
        // Rozbieg 1,5 m: z miejsca, 2,1 m mieści się, 2,4 nie.
        const [b] = S.skokiWTrasie([o("walk", 1.5), o("jump", 2.1)]);
        expect(S.ocenSkok(b, z)).to.deep.equal([]);
        const [c] = S.skokiWTrasie([o("walk", 1.5), o("jump", 2.4)]);
        expect(S.ocenSkok(c, z)[0]).to.match(/z miejsca — rozbieg 1,5 m < 3 m/);
        // Czołganie nie jest rozbiegiem; wzwyż 1,5 > 1,2.
        const [d] = S.skokiWTrasie([o("crawl", 6), o("walk", 3), o("jump", 0, 1.5)]);
        expect(d).to.include({ rozbieg: 3, wzwyz: 1.5 });
        expect(S.ocenSkok(d, z)[0]).to.match(/Skok wzwyż 1,5 m — ponad 1,2 m/);
        // Skok z wcześniejszej części ruchu nie jest oceniany drugi raz.
        expect(S.skokiWTrasie([o("jump", 9, 0, true), o("walk", 1.5)])).to.deep.equal([]);
        expect(S.ocenSkok(a, { reczny: "skok wg opisu istoty" })[0]).to.match(/wg opisu istoty/);
      });

      it("Region: szczelina 4,5 m bez ST — SIŁ 15 doskakuje, 13 ląduje w 3. polu, 10 z miejsca w 2.; pole liczone od krawędzi", function () {
        const szczelina = (sila, rozbieg = true) => S.skokPrzezSzczeline(4.5, S.zasiegSkoku({ sila, rozbieg }).dal, 1.5);
        expect(szczelina(15).doskakuje).to.equal(true);
        expect(szczelina(13)).to.deep.equal({ doskakuje: false, dlugosc: 3.9, polaWglab: 3 });
        expect(szczelina(10, false)).to.deep.equal({ doskakuje: false, dlugosc: 1.5, polaWglab: 2 });
        // Poligon „poziomy”: szlam w rzędach 6–8, Region skoku na południe w rzędzie 6, na północ w 8.
        const zeton = { parent: { grid: { size: 100 } }, width: 1, height: 1, x: 800, y: 450, elevation: -6 };
        const wej = { x: 800, y: 550, elevation: -6 };
        expect(TR.poleWSzczelinie(zeton, { bounds: { top: 600, bottom: 700, left: 800, right: 1000 } }, "S", 3, wej))
          .to.deep.equal({ x: 800, y: 800, elevation: -6 });
        expect(TR.poleWSzczelinie(zeton, { bounds: { top: 800, bottom: 900, left: 800, right: 1000 } }, "N", 3, { x: 800, y: 850, elevation: -6 }))
          .to.deep.equal({ x: 800, y: 600, elevation: -6 });
        expect(TR.poleWSzczelinie(zeton, { bounds: { top: 800, bottom: 900, left: 800, right: 1000 } }, "N", 1, { x: 830, y: 850, elevation: -6 }).x,
          "wejście po skosie — dociągnięte do siatki").to.equal(800);
      });

      it("wzrost z karty: „180 cm”, „1,8 m”, „180”; pusty — brak", function () {
        expect(["180 cm", "1,8 m", "180", "", null].map(T._wzrost)).to.deep.equal([1.8, 1.8, 1.8, null, null]);
      });
    });

    describe("Prawdziwy ruch „Skok” (warstwa 4)", function () {
      this.timeout(20000);
      const szybki = (str = 14) => ({ system: { abilities: { str: { value: str } }, attributes: { movement: { speeds: { walk: 9 }, units: "m" } } } });

      it("T18: skok 4,5 m po 3 m rozbiegu przy SIŁ 14 — koszt 1:1 i trwałe ostrzeżenie w ledgerze, ruch nieblokowany", async function () {
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Skoczek M8`, ...szybki(14) });
        const inny = await scratchActor({ name: `${SCRATCH_PREFIX} Widz M8`, ...szybki() });
        const w = await walkaTestowa([pc, inny], { kto: pc, nazwa: "m8-skok" });
        const r = stub(game, "combat", w.combat);
        try {
          const tok = w.zetony.find(t => t.actorId === pc.id);
          // Drugi token z drogi: skok w dół mapy.
          const c = kombatant(tok);
          await waitFor(() => ledger(c).tury.length > 0, { label: "instancja tury" });
          const x0 = tok.x, y0 = tok.y;
          await tok.move([{ x: x0, y: y0 + 200, action: "walk" }, { x: x0, y: y0 + 500, action: "jump" }], { animate: false });
          await waitFor(() => ledger(c).ruchy.length === 1 && ledger(c).ruchy[0].ostrz.length, { label: "zapis ruchu ze skokiem" });
          const wpis = ledger(c).ruchy[0];
          expect(wpis.koszt, "3 m chodu + 4,5 m skoku 1:1").to.equal(7.5);
          expect(wpis.ostrz.join(" ")).to.match(/Skok 4,5 m — ponad zasięg 4,2 m \(z rozbiegu/);
          expect(tok.y, "pozycja zostaje — ostrzeżenie, nie blokada").to.equal(y0 + 500);
          expect(stan(tok).ostrzezenia.join(" ")).to.match(/ponad zasięg/);
        } finally {
          r();
          await w.sprzatnij();
        }
      });

      it("lądowanie na trudnym terenie po skoku w dal → karta Akrobatyki ST 10; porażka — Powalenie", async function () {
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Lądujący M8`, ...szybki(16) });
        const w = await walkaTestowa([pc], { kto: pc, nazwa: "m8-ladowanie" });
        const r = stub(game, "combat", w.combat);
        try {
          const tok = w.zetony.find(t => t.actorId === pc.id);
          await w.scena.createEmbeddedDocuments("Region", [{ name: "Gruz", levels: [tok.level],
            shapes: [{ type: "rectangle", x: tok.x, y: tok.y + 300, width: 100, height: 100, rotation: 0, hole: false }],
            elevation: { bottom: null, top: null }, behaviors: [{ type: "dnd5e.difficultTerrain", name: "Trudny teren", system: { types: ["rubble"] } }] }]);
          const przed = game.messages.size;
          await tok.move([{ x: tok.x, y: tok.y + 300, action: "jump" }], { animate: false });
          const karta = await waitFor(() => game.messages.contents.slice(przed).find(m => m.getFlag(MODULE_ID, "skok")?.rodzaj === "ladowanie"), { label: "karta lądowania" });
          expect(karta.getFlag(MODULE_ID, "skok").st).to.equal(10);
          // Przycisk: test oblany (wymuszony wynik) → Powalenie.
          const rs = stub(pc, "rollSkill", async () => [{ total: 6 }]);
          try {
            const btn = { closest: sel => (sel === "[data-neuro-skok]" ? btn : { dataset: { messageId: karta.id } }), disabled: false };
            await T.klik({ target: btn, preventDefault() {}, stopPropagation() {} });
          } finally { rs(); }
          expect(pc.statuses.has("prone"), "Powalenie po oblanym teście").to.equal(true);
          expect(game.messages.get(karta.id).getFlag(MODULE_ID, "skok").wynik).to.equal("powalony");
        } finally {
          r();
          await w.sprzatnij();
        }
      });

      it("Skok Gladiatora (Zew areny w Berserku) na pole istoty → karta RO SIŁ ST 8 + SIŁ + PB, 1k6 za 3 m; bez kosztu akcji", async function () {
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Gladiator M8`, ...szybki(16) });
        const cel = await scratchActor({ name: `${SCRATCH_PREFIX} Ofiara M8`, ...szybki() });
        await pc.createEmbeddedDocuments("Item", [{ name: "Zew areny", type: "feat", flags: { [MODULE_ID]: { abilityId: "zew-areny" } } }]);
        await pc.createEmbeddedDocuments("ActiveEffect", [{ name: "Berserk (test)", statuses: ["berserk"] }]);
        const w = await walkaTestowa([pc, cel], { kto: pc, nazwa: "m8-gladiator" });
        const r = stub(game, "combat", w.combat);
        try {
          const tok = w.zetony.find(t => t.actorId === pc.id);
          const tc = w.zetony.find(t => t.actorId === cel.id);
          const c = kombatant(tok);
          await waitFor(() => ledger(c).tury.length > 0, { label: "instancja tury" });
          const przed = game.messages.size;
          await tok.move([{ x: tc.x, y: tc.y, action: "jump" }], { animate: false });
          const karta = await waitFor(() => game.messages.contents.slice(przed).find(m => m.getFlag(MODULE_ID, "skok")?.rodzaj === "gladiator"), { label: "karta Gladiatora" });
          const d = karta.getFlag(MODULE_ID, "skok");
          expect(d.st, "8 + mod. SIŁ 3 + PB").to.equal(11 + pc.system.attributes.prof);
          expect(d.kosci, "skok 3 m → 1k6").to.equal(1);
          expect(d.celUuid).to.equal(cel.uuid);
          expect(ledger(c).ops.filter(op => op.cykl === stan(tok).chwila.cykl).length, "sam skok nie wydaje A/B/R").to.equal(0);
        } finally {
          r();
          await w.sprzatnij();
        }
      });

      it("WKK (Kobalt, zasada 46) wyłączony: karta Gladiatora prowadzi RO i Powalenie, kości „rozstrzygnij ręcznie”", async function () {
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Gladiator bez Kobaltu`, ...szybki(16) });
        const cel = await scratchActor({ name: `${SCRATCH_PREFIX} Ofiara bez Kobaltu`, ...szybki() });
        await pc.createEmbeddedDocuments("Item", [{ name: "Zew areny", type: "feat", flags: { [MODULE_ID]: { abilityId: "zew-areny" } } }]);
        await pc.createEmbeddedDocuments("ActiveEffect", [{ name: "Berserk (test)", statuses: ["berserk"] }]);
        const kobalt = game.settings.get(MODULE_ID, "kobaltEnabled");
        await game.settings.set(MODULE_ID, "kobaltEnabled", false);
        const w = await walkaTestowa([pc, cel], { kto: pc, nazwa: "m8-gladiator-bez" });
        const r = stub(game, "combat", w.combat);
        try {
          const tok = w.zetony.find(t => t.actorId === pc.id);
          const tc = w.zetony.find(t => t.actorId === cel.id);
          await waitFor(() => ledger(kombatant(tok)).tury.length > 0, { label: "instancja tury" });
          const przed = game.messages.size;
          await tok.move([{ x: tc.x, y: tc.y, action: "jump" }], { animate: false });
          const karta = await waitFor(() => game.messages.contents.slice(przed).find(m => m.getFlag(MODULE_ID, "skok")?.rodzaj === "gladiator"), { label: "karta Gladiatora" });
          const d = karta.getFlag(MODULE_ID, "skok");
          expect(d.kosci, "bez podstawionej liczby kości").to.equal(null);
          expect(d.st, "RO drukowane — zostaje").to.equal(11 + pc.system.attributes.prof);
          expect(karta.content).to.match(/rozstrzygnij ręcznie/);
        } finally {
          r();
          await game.settings.set(MODULE_ID, "kobaltEnabled", kobalt);
          await w.sprzatnij();
        }
      });

      it("koszt skoku z Regionu: do zapisu tego samego ruchu, 1:1, raz (ponowienie nic nie dolicza)", async function () {
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Region-skok M8`, ...szybki(15) });
        const w = await walkaTestowa([pc], { kto: pc, nazwa: "m8-region-skok" });
        const r = stub(game, "combat", w.combat);
        try {
          const tok = w.zetony.find(t => t.actorId === pc.id);
          const c = kombatant(tok);
          await waitFor(() => ledger(c).tury.length > 0, { label: "instancja tury" });
          await tok.move({ x: tok.x, y: tok.y + 200 }, { animate: false });
          await waitFor(() => ledger(c).ruchy.length === 1, { label: "rozbieg" });
          const ruchId = ledger(c).ruchy[0].id;
          await zaplacSkok(tok, ruchId, 4.5);
          await zaplacSkok(tok, ruchId, 4.5);
          const wpis = ledger(c).ruchy[0];
          expect(wpis.koszt, "3 m rozbiegu + 4,5 m skoku").to.equal(7.5);
          expect(ledger(c).ruchy.length, "ten sam wpis — Undo ruchu zwraca też skok").to.equal(1);
        } finally {
          r();
          await w.sprzatnij();
        }
      });
    });
  });
}
