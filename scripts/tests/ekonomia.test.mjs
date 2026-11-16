/**
 * Neuroshima 5e — ekonomia tury M8 (PLAN_m8_ruch_i_ekonomia_akcji §4–§6, §11).
 *
 * Warstwa 1: czysty ledger — wektory macierzy odbioru T01, T02, T07–T11, T13, T21–T24 na liczbach z planu.
 * Warstwa 4: prawdziwa walka i prawdziwy ruch tokenu — koszt z natywnej historii, Undo, czyszczenie historii przez
 * rdzeń, deklaracje z kartą, znaczniki R/B jako projekcja (korekta z HUD-u), deduplikacja po id żądania.
 */

import { SCRATCH_PREFIX, scratchActor, scratchCleanup, stub, walkaTestowa, waitFor } from "./helpers.mjs";
import * as E from "../config/ekonomia-data.mjs";
import { zadeklaruj, dodatkowa, deklaruj, koryguj, znacznik, FLAG_ZNACZNIK } from "../actors/actions.mjs";
import { ledger, stan, zatwierdz, kombatant, chwila, __testing as T } from "../combat/ekonomia.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Chwila własnej tury w rundzie `r`. */
const wl = r => ({ runda: r, cykl: r, wlasna: true, reakcja: null });
/** Chwila po własnej turze rundy `r` (cudza tura). */
const po = r => ({ runda: r, cykl: r, wlasna: false, reakcja: null });
const sp = (walk, inne = {}) => ({ szybkosci: { walk, swim: 0, climb: 0, fly: 0, burrow: 0, ...inne } });
let _n = 0;
const id = () => `t${++_n}`;
/** Ruch o koszcie `k` w chwili `ch`. */
const rusz = (l, ch, k, a = sp(9), tryb = "walk", ruchId = id()) =>
  E.zapiszRuch(l, ch, { ruchId, czesc: "0+1", koszt: k, dyst: k, tryb, zt: "z" }, a).wynik;

export function registerEkonomiaTests(quench) {
  quench.registerBatch(`${MODULE_ID}.ekonomia`, context => {
    const { describe, it, expect, after } = context;
    const start = Date.now();

    after(async () => {
      await scratchCleanup();
      const msgs = game.messages.filter(m => m.timestamp >= start).map(m => m.id);
      if (msgs.length) await ChatMessage.implementation.deleteDocuments(msgs);
    });

    describe("Chwila i instancja tury (warstwa 1)", function () {
      it("cykl: własna tura, zapisana tura, kolejność bez zapisu; przed pierwszą turą 0", function () {
        const l = E.pustyLedger("w");
        expect(E.chwilaKombatanta(l, { runda: 1, biezacyId: "a", id: "a" })).to.include({ cykl: 1, wlasna: true });
        expect(E.chwilaKombatanta(l, { runda: 1, biezacyId: "a", id: "b", kolejnosc: ["a", "b"], indeks: 0 }).cykl).to.equal(0);
        expect(E.chwilaKombatanta(l, { runda: 2, biezacyId: "b", id: "a", kolejnosc: ["a", "b"], indeks: 1 }).cykl).to.equal(2);
        E.zapiszTure(l, 2);
        // Zmiana kolejności po turze: zapisana instancja wygrywa z indeksem (bez darmowej nowej tury, §5.3).
        expect(E.chwilaKombatanta(l, { runda: 2, biezacyId: "c", id: "a", kolejnosc: ["c", "b", "a"], indeks: 0 }).cykl).to.equal(2);
        expect(E.zapiszTure(l, 2), "powtórne wejście w tę samą rundę").to.equal(false);
      });

      it("ledger innej walki albo innej wersji — pusty (stary zapis nie przechodzi)", function () {
        const l = E.pustyLedger("w1");
        E.zastosuj(l, wl(1), { id: "x", koszt: { A: 1 } });
        expect(E.ledgerZ(l, "w1").ops).to.have.length(1);
        expect(E.ledgerZ(l, "w2").ops).to.have.length(0);
        expect(E.ledgerZ({ ...l, v: 99 }, "w1").ops).to.have.length(0);
      });
    });

    describe("Pule A/B/R/I (warstwa 1)", function () {
      it("1/1 → 0/1 → −1/1 z ostrzeżeniem; duplikat id nic nie wydaje (§5.1, D6)", function () {
        const l = E.pustyLedger("w");
        expect(E.licznik(E.pule(l, wl(1)).A)).to.equal("1/1");
        expect(E.zastosuj(l, wl(1), { id: "a1", koszt: { A: 1 }, zrodlo: "Atak" }).wynik.ostrz).to.deep.equal([]);
        expect(E.licznik(E.pule(l, wl(1)).A)).to.equal("0/1");
        const dup = E.zastosuj(l, wl(1), { id: "a1", koszt: { A: 1 } }).wynik;
        expect(dup.duplikat).to.equal(true);
        const w = E.zastosuj(l, wl(1), { id: "a2", koszt: { A: 1 }, zrodlo: "Pomaganie" }).wynik;
        expect(w.ostrz[0]).to.include("ponad pulę").and.include("Atak").and.include("Pomaganie");
        expect(E.licznik(E.pule(l, wl(1)).A)).to.equal("−1/1");
      });

      it("T22: A 0/1 → Zryw A → A daje 0/1 → 1/2 → 0/2; sam grant niczego nie wydaje", function () {
        const l = E.pustyLedger("w");
        E.zastosuj(l, wl(1), { id: id(), koszt: { A: 1 } });
        E.zastosuj(l, wl(1), { id: id(), rodzaj: "grant", zrodlo: "Zryw", grant: { typ: "A", ile: 1 } });
        expect(E.licznik(E.pule(l, wl(1)).A)).to.equal("1/2");
        expect(E.zastosuj(l, wl(1), { id: id(), koszt: { A: 1 } }).wynik.ostrz).to.deep.equal([]);
        expect(E.licznik(E.pule(l, wl(1)).A)).to.equal("0/2");
        expect(E.licznik(E.pule(l, wl(2)).A), "grant nie przechodzi do następnej tury").to.equal("1/1");
      });

      it("T23: ograniczona A (Szybkie ręce) idzie na Używanie; trzecia A innego celu ostrzega mimo ograniczonej", function () {
        const l = E.pustyLedger("w");
        E.zastosuj(l, wl(1), { id: id(), rodzaj: "grant", grant: { typ: "A", ile: 1 } });
        E.zastosuj(l, wl(1), { id: id(), rodzaj: "grant", grant: { typ: "A", ile: 1, ogr: "uzywanie" } });
        E.zastosuj(l, wl(1), { id: id(), koszt: { A: 1 }, zrodlo: "Atak 1" });
        E.zastosuj(l, wl(1), { id: id(), koszt: { A: 1 }, zrodlo: "Atak 2" });
        const trzeci = E.zastosuj(l, wl(1), { id: id(), koszt: { A: 1 }, zrodlo: "Atak 3" }).wynik;
        expect(trzeci.ostrz[0]).to.include("ponad pulę");
        const p = E.pule(l, wl(1)).A;
        expect(p.ogr.uzywanie).to.deep.equal({ pojemnosc: 1, wydane: 0 });
        const uzycie = E.zastosuj(l, wl(1), { id: id(), koszt: { A: 1 }, cel: "uzywanie", zrodlo: "Medpak" });
        expect(uzycie.wynik.ostrz).to.deep.equal([]);
        expect(uzycie.wynik.op.ogr).to.equal("uzywanie");
      });

      it("R: odnawia się z nowym cyklem, nie z cudzą turą; poza turą bez ostrzeżenia o turze", function () {
        const l = E.pustyLedger("w");
        expect(E.zastosuj(l, po(1), { id: id(), koszt: { R: 1 } }).wynik.ostrz).to.deep.equal([]);
        expect(E.licznik(E.pule(l, po(1)).R)).to.equal("0/1");
        expect(E.licznik(E.pule(l, wl(2)).R)).to.equal("1/1");
        const a = E.zastosuj(l, po(1), { id: id(), koszt: { A: 1 }, zrodlo: "x" }).wynik;
        expect(a.ostrz.join(" ")).to.include("poza własną turą");
      });

      it("T24: zakaz z rany nie jest wydatkiem; leczenie niczego nie zwraca ani nie dopisuje naruszenia", function () {
        const l = E.pustyLedger("w");
        E.zastosuj(l, wl(1), { id: id(), koszt: { B: 1 } }, { zranienie: 0 });
        const ranny = E.pule(l, wl(1), { zranienie: 3 });
        expect(ranny.B.zakaz).to.include("Poważny");
        expect(ranny.B.wydane, "historia zachowana").to.equal(1);
        expect(l.ops[0].ostrz, "brak wstecznego naruszenia").to.deep.equal([]);
        expect(E.pule(l, wl(1), { zranienie: 0 }).B.zakaz).to.equal(null);
        const proba = E.zastosuj(l, wl(1), { id: id(), koszt: { R: 1 } }, { zranienie: 2 }).wynik;
        expect(proba.ostrz.join(" ")).to.include("Znaczny");
      });

      it("D24: zmęczenie po Berserku do końca następnej własnej tury, mimo odświeżenia pul", function () {
        const l = E.pustyLedger("w");
        E.zastosuj(l, wl(3), { id: id(), rodzaj: "zakaz", koszt: {}, zakaz: { rodzaj: "zmeczenie", konczy: 4 } });
        expect(E.pule(l, po(3)).A.zakaz).to.include("Zmęczenie");
        expect(E.pule(l, wl(4)).R.zakaz).to.include("Zmęczenie");
        expect(E.pule(l, wl(4)).A.pojemnosc, "pule odświeżone, zakaz osobno").to.equal(1);
        expect(E.pule(l, po(4)).A.zakaz).to.equal(null);
      });
    });

    describe("Budżet ruchu (warstwa 1)", function () {
      it("T01/T02: 9 m, dwa ruchy po 3, przekroczenie zostaje z ostrzeżeniem; Undo zwraca koszt", function () {
        const l = E.pustyLedger("w");
        rusz(l, wl(1), 3, sp(9), "walk", "m1");
        rusz(l, wl(1), 3, sp(9), "walk", "m2");
        expect(E.budzetRuchu(l, wl(1), sp(9)).pozostalo).to.equal(3);
        expect(E.cofnijRuchy(l, ["m1"], "z")).to.deep.equal(["m2"]);
        expect(E.budzetRuchu(l, wl(1), sp(9)).pozostalo).to.equal(6);
        const w = rusz(l, wl(1), 9, sp(9), "walk", "m3");
        expect(w.po.pozostalo).to.equal(-3);
        expect(w.ostrz[0]).to.include("ponad pulę");
        expect(E.pule(l, wl(1)).A.wydane, "brak automatycznej A").to.equal(0);
      });

      it("kontynuacja tego samego ruchu dokłada koszt; ta sama część — nie (§5.3)", function () {
        const l = E.pustyLedger("w");
        E.zapiszRuch(l, wl(1), { ruchId: "m", czesc: "0+2", koszt: 3, dyst: 3, tryb: "walk", zt: "z" }, sp(9));
        E.zapiszRuch(l, wl(1), { ruchId: "m", czesc: "0+2", koszt: 3, dyst: 3, tryb: "walk", zt: "z" }, sp(9));
        E.zapiszRuch(l, wl(1), { ruchId: "m", czesc: "2+1", koszt: 1.5, dyst: 1.5, tryb: "walk", zt: "z" }, sp(9));
        expect(E.budzetRuchu(l, wl(1), sp(9)).wydane).to.equal(4.5);
      });

      it("T07 (D14): 3/9, Przyspieszenie, rana −4,5 → 10,5/13,5; odwrotnie 6/9; następna tura 4,5/4,5", function () {
        const a = E.pustyLedger("w");
        rusz(a, wl(1), 3);
        const g = E.zadanieDeklaracji("przyspieszenie", a, wl(1), sp(9)).zadanie;
        E.zastosuj(a, wl(1), { id: id(), ...g });
        expect(E.budzetRuchu(a, wl(1), sp(9))).to.include({ pozostalo: 15, pojemnosc: 18 });
        expect(E.budzetRuchu(a, wl(1), sp(4.5))).to.include({ pozostalo: 10.5, pojemnosc: 13.5 });
        expect(E.budzetRuchu(a, wl(2), sp(4.5))).to.include({ pozostalo: 4.5, pojemnosc: 4.5 });

        const b = E.pustyLedger("w");
        rusz(b, wl(1), 3);
        const g2 = E.zadanieDeklaracji("przyspieszenie", b, wl(1), sp(4.5)).zadanie;
        expect(g2.grant.ile).to.equal(4.5);
        E.zastosuj(b, wl(1), { id: id(), ...g2 });
        expect(E.budzetRuchu(b, wl(1), sp(4.5))).to.include({ pozostalo: 6, pojemnosc: 9 });
        // Wyleczenie przywraca bazę, nie tworzy kolejnego grantu.
        expect(E.budzetRuchu(b, wl(1), sp(9))).to.include({ pozostalo: 10.5, pojemnosc: 13.5 });
      });

      it("T08 (D17): chód 9 / pływanie 18 — chód 6 → pływanie 12 → 6; chód bez ruchu; wybór trybu nic nie wydaje", function () {
        const a = sp(9, { swim: 18 });
        const l = E.pustyLedger("w");
        rusz(l, wl(1), 6, a, "walk");
        expect(E.budzetRuchu(l, wl(1), { ...a, tryb: "swim" }).pozostalo).to.equal(12);
        rusz(l, wl(1), 6, a, "swim");
        expect(E.budzetRuchu(l, wl(1), { ...a, tryb: "swim" }).pozostalo).to.equal(6);
        expect(E.budzetRuchu(l, wl(1), { ...a, tryb: "walk" }).pozostalo).to.be.below(0);
        expect(l.ruchy.flatMap(r => r.ostrz), "sam wybór wolniejszego trybu nie jest naruszeniem").to.deep.equal([]);
      });

      it("T09 (D31): Przyspieszenie chodu +9, chód 6, pływanie 18 → 12 m pływania, nie 21/30", function () {
        const a = sp(9, { swim: 18 });
        const l = E.pustyLedger("w");
        E.zastosuj(l, wl(1), { id: id(), ...E.zadanieDeklaracji("przyspieszenie", l, wl(1), a, { tryb: "walk" }).zadanie });
        rusz(l, wl(1), 6, a, "walk");
        expect(E.budzetRuchu(l, wl(1), { ...a, tryb: "swim" }).pozostalo).to.equal(12);
        expect(E.budzetRuchu(l, wl(1), { ...a, tryb: "walk" }).pozostalo).to.equal(12);
      });

      it("czołganie i skok z bazy chodu; pływanie bez Szybkości pływania — z chodu; latanie bez Szybkości — brak", function () {
        expect(E.trybBazowy("crawl", { walk: 9 })).to.equal("walk");
        expect(E.trybBazowy("jump", { walk: 9 })).to.equal("walk");
        expect(E.trybBazowy("swim", { walk: 9, swim: 0 })).to.equal("walk");
        expect(E.trybBazowy("swim", { walk: 9, swim: 6 })).to.equal("swim");
        expect(E.trybBazowy("fly", { walk: 9, fly: 0 })).to.equal(null);
        expect(E.grantDeklaracji("bieganie", { walk: 9, swim: 18 }, "swim"), "Bieganie tylko na nogach").to.deep.equal({ ile: 18, tryb: "walk" });
      });

      it("D18: poza własną turą bez reakcji — brak dobrowolnego ruchu (bez banku zwykłej reszty)", function () {
        const l = E.pustyLedger("w");
        rusz(l, wl(1), 4.5);
        const b = E.budzetRuchu(l, po(1), sp(9));
        expect(b.dostepny).to.equal(false);
        expect(b.pozostalo).to.equal(0);
      });

      it("T10/T11 (D30): wyczekane Bieganie w R — świeże 18 m (rana: 9), R raz, bez starej 4,5 i bazy 9", function () {
        const l = E.pustyLedger("w");
        rusz(l, wl(1), 4.5);
        E.zastosuj(l, wl(1), { id: id(), ...E.zadanieDeklaracji("przyspieszenie", l, wl(1), sp(9)).zadanie });
        const z = E.zadanieDeklaracji("bieganie", l, po(1), sp(9)).zadanie;
        expect(z.koszt).to.deep.equal({ R: 1 });
        E.zastosuj(l, po(1), { id: id(), ...z });
        const r = E.aktywnaReakcja(l, 1);
        expect(r).to.be.ok;
        const ch = { ...po(1), reakcja: r.id };
        expect(E.budzetRuchu(l, ch, sp(9))).to.include({ pojemnosc: 18, pozostalo: 18 });
        expect(E.licznik(E.pule(l, ch).R)).to.equal("0/1");
        expect(E.pule(l, ch).A.wydane, "bez kolejnej A").to.equal(1);
        rusz(l, ch, 18);
        expect(E.budzetRuchu(l, ch, sp(9)).pozostalo).to.equal(0);
        expect(E.budzetRuchu(l, wl(1), sp(9)).wydane, "ruch reakcji nie zjada własnej tury").to.equal(4.5);
        const ranny = E.zadanieDeklaracji("bieganie", l, po(1), sp(4.5)).zadanie;
        expect(ranny.grant.ile).to.equal(9);
      });

      it("T13: Padnij po 3/9 kosztuje 6; Powstań — połowa Szybkości, z Sztuczką 0", function () {
        const l = E.pustyLedger("w");
        rusz(l, wl(1), 3);
        const z = E.zadanieDeklaracji("padnij", l, wl(1), sp(9)).zadanie;
        expect(z.ruch).to.equal(6);
        expect(z.koszt).to.deep.equal({});
        E.zastosuj(l, wl(1), { id: id(), ...z });
        expect(E.budzetRuchu(l, wl(1), sp(9)).pozostalo).to.equal(0);
        expect(E.zadanieDeklaracji("powstan", l, wl(1), sp(9)).zadanie.ruch).to.equal(4.5);
        expect(E.zadanieDeklaracji("powstan", l, wl(1), sp(9), { bezPadnijPowstan: true }).zadanie.ruch).to.equal(0);
        const powalony = E.zadanieDeklaracji("bieganie", l, wl(1), { ...sp(9), stany: ["prone"] });
        expect(powalony.ostrz[0]).to.include("Powaleniu");
      });

      it("Szybkość 0 blokuje dobrowolny ruch mimo grantu (§4.2)", function () {
        const l = E.pustyLedger("w");
        E.zastosuj(l, wl(1), { id: id(), ...E.zadanieDeklaracji("przyspieszenie", l, wl(1), sp(9)).zadanie });
        const b = E.budzetRuchu(l, wl(1), sp(0));
        expect(b.dostepny).to.equal(false);
        expect(b.powod).to.include("Szybkość 0");
      });

      it("WKK (Kobalt, zasada 45): z konwencjami brak `reczne`; bez — opis do rozstrzygnięcia zamiast cichej interpretacji", async function () {
        const { konwencjeRuchu, RUCH_KOBALT } = await import("../wkk/config/ruch-kobalt.mjs");
        const bez = konwencjeRuchu(false);
        const a = sp(9, { swim: 18 });
        // D17 + D31: chód 6 z grantem chodu, pytanie o pływanie.
        const l = E.pustyLedger("w");
        E.zastosuj(l, wl(1), { id: id(), ...E.zadanieDeklaracji("przyspieszenie", l, wl(1), a, { tryb: "walk" }).zadanie });
        rusz(l, wl(1), 6, a, "walk");
        expect(E.budzetRuchu(l, wl(1), { ...a, tryb: "swim" }).reczne, "z Kobaltem").to.deep.equal([]);
        const r = E.budzetRuchu(l, wl(1), { ...a, tryb: "swim", wkk: bez }).reczne;
        expect(r).to.include(RUCH_KOBALT.d17).and.include(RUCH_KOBALT.d31);
        // D14: grant przy Szybkości 9, teraz 4,5.
        expect(E.budzetRuchu(l, wl(1), { ...sp(4.5), tryb: "walk", wkk: bez }).reczne).to.include(RUCH_KOBALT.d14);
        expect(E.budzetRuchu(l, wl(1), { ...sp(9), tryb: "walk", wkk: bez }).reczne, "bez zmiany Szybkości — nic").to.deep.equal([]);
        // D30: reakcja przy starszym grancie tego cyklu.
        E.zastosuj(l, po(1), { id: id(), ...E.zadanieDeklaracji("bieganie", l, po(1), sp(9)).zadanie });
        const ch = { ...po(1), reakcja: E.aktywnaReakcja(l, 1).id };
        expect(E.budzetRuchu(l, ch, { ...sp(9), wkk: bez }).reczne).to.include(RUCH_KOBALT.d30);
        expect(E.budzetRuchu(l, ch, { ...sp(9) }).reczne).to.deep.equal([]);
        // Ruch zapisany bez Kobaltu w takiej sytuacji niesie trwałe „do rozstrzygnięcia”, nie zielone potwierdzenie.
        const w = rusz(l, wl(1), 1.5, { ...a, wkk: bez }, "swim");
        expect(w.ostrz.join(" ")).to.include("rozstrzygnięcia przy stole");
      });

      it("przycinanie archiwum: stare cykle znikają, bieżące zostają (§5.1)", function () {
        const l = E.pustyLedger("w");
        for (let r = 1; r <= 6; r++) { E.zapiszTure(l, r); E.zastosuj(l, wl(r), { id: id(), koszt: { A: 1 } }); }
        E.przytnij(l, 6);
        expect(l.ops.map(o => o.cykl)).to.deep.equal([4, 5, 6]);
      });
    });

    describe("Prawdziwa walka (warstwa 4)", function () {
      this.timeout(20000);
      const szybki = { system: { attributes: { movement: { speeds: { walk: 9 }, units: "m" } } } };

      it("zapis ledgera nie zmienia tury walki — ani lokalnie, ani w bazie (świeży odczyt z serwera); ledger we flagach walki", async function () {
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Tura w bazie M8`, ...szybki });
        const inny = await scratchActor({ name: `${SCRATCH_PREFIX} Drugi w bazie M8`, ...szybki });
        const w = await walkaTestowa([inny, pc], { kto: pc, nazwa: "m8-tura-baza" });
        const r = stub(game, "combat", w.combat);
        try {
          const tok = w.zetony.find(t => t.actorId === pc.id);
          const c = kombatant(tok);
          const turn = w.combat.turn;
          expect(Number.isInteger(turn), "tura ustawiona").to.equal(true);
          await zadeklaruj(pc, "R", { zrodlo: "test tury w bazie", id: "m8-tura-baza-1" });
          expect(w.combat.getFlag(MODULE_ID, "m8")?.[c.id]?.rev, "ledger MG we flagach walki").to.be.above(0);
          expect(w.combat.turn, "lokalnie").to.equal(turn);
          const [zBazy] = await CONFIG.DatabaseBackend.get(Combat.implementation, { query: { _id: w.combat.id } });
          expect(zBazy?.turn ?? zBazy?._source?.turn, "w bazie — klient, który przeładuje stronę, widzi tę samą turę").to.equal(turn);
        } finally {
          r();
          await w.sprzatnij();
        }
      });

      it("ruch tokenu w swojej turze: koszt z natywnego ruchu, Undo cofa, czyszczenie historii nic nie zwraca", async function () {
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Biegacz M8`, ...szybki });
        const inny = await scratchActor({ name: `${SCRATCH_PREFIX} Drugi M8`, ...szybki });
        const w = await walkaTestowa([pc, inny], { kto: pc, nazwa: "m8-ruch" });
        const r = stub(game, "combat", w.combat);
        try {
          const tok = w.zetony.find(t => t.actorId === pc.id); // kolejność wyniku tworzenia jest niestabilna
          const c = kombatant(tok);
          expect(c, "kombatant tokenu").to.be.ok;
          await waitFor(() => ledger(c).tury.length > 0, { label: "instancja tury" });
          await tok.move({ x: tok.x + 200, y: tok.y }, { animate: false });
          await waitFor(() => ledger(c).ruchy.length === 1, { label: `zapis ruchu (${JSON.stringify(chwila(c))}, tura ${w.combat.combatant?.name})` });
          expect(stan(tok).ruch.wydane).to.equal(3);
          await tok.move({ x: tok.x, y: tok.y + 200 }, { animate: false });
          await waitFor(() => ledger(c).ruchy.length === 2, { label: "drugi ruch" });
          expect(stan(tok).ruch.pozostalo).to.equal(3);
          // Jak Ctrl+Z: cofa ostatni ruch (bez id `revertRecordedMovement` cofa do pierwszego ruchu historii).
          await tok.revertRecordedMovement(ledger(c).ruchy.at(-1).id);
          await waitFor(() => ledger(c).ruchy.filter(x => x.cofniety).length === 1, { label: "Undo" });
          expect(stan(tok).ruch.pozostalo).to.equal(6);
          // Rdzeń czyści historie wszystkich na początku tury — koszt w ledgerze zostaje, bez nowego budżetu.
          await w.combat.clearMovementHistories();
          expect(stan(tok).ruch.pozostalo).to.equal(6);
          // Przestawienie (displace) się nie liczy.
          await tok.move({ x: tok.x + 100, y: tok.y, action: "displace" }, { animate: false });
          await new Promise(res => setTimeout(res, 300));
          expect(stan(tok).ruch.wydane).to.equal(3);
        } finally {
          r();
          await w.sprzatnij();
        }
      });

      it("deklaracja Bieganie: A + grant 2× Szybkość + stan raz; następna tura — grant wygasa, R wraca", async function () {
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Sprinter M8`, ...szybki });
        const inny = await scratchActor({ name: `${SCRATCH_PREFIX} Obok M8`, ...szybki });
        const w = await walkaTestowa([pc, inny], { kto: pc, nazwa: "m8-bieganie" });
        const r = stub(game, "combat", w.combat);
        try {
          const tok = w.zetony.find(t => t.actorId === pc.id); // kolejność wyniku tworzenia jest niestabilna
          const wynik = await deklaruj(pc, "bieganie");
          const s = stan(tok);
          expect(s.pule.A.wydane, `A po Bieganiu: ${JSON.stringify(wynik)} / ${JSON.stringify(s.chwila)}`).to.equal(1);
          expect(s.ruch).to.include({ pojemnosc: 27, pozostalo: 27 });
          expect(pc.statuses.has("bieganie")).to.equal(true);
          await zadeklaruj(pc, "R", { zrodlo: "test" });
          expect(stan(tok).pule.R.pozostalo).to.equal(0);
          await w.combat.nextTurn();
          await w.combat.nextTurn();
          await waitFor(() => stan(tok).chwila.cykl === 2, { label: "nowa tura" });
          const s2 = stan(tok);
          expect(s2.ruch).to.include({ pojemnosc: 9 });
          expect(s2.pule.R.pozostalo, `R w nowej turze: ${JSON.stringify(s2.chwila)} ${JSON.stringify(s2.ledger.ops.map(o => [o.cykl, o.koszt]))}`).to.equal(1);
          await waitFor(() => !znacznik(pc, "R"), { label: "znacznik R zdjęty" });
        } finally {
          r();
          await w.sprzatnij();
        }
      });

      it("znaczniki R/B to projekcja: zużycie zakłada, HUD zdejmuje jako korektę, ponowione id nie wydaje drugi raz", async function () {
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Reagujący M8` });
        const inny = await scratchActor({ name: `${SCRATCH_PREFIX} Atakujący M8` });
        const w = await walkaTestowa([inny, pc], { kto: inny, nazwa: "m8-znaczniki" });
        const r = stub(game, "combat", w.combat);
        try {
          const a = await zadeklaruj(pc, "R", { zrodlo: "Inteligentna obrona", id: "staly-id-1" });
          expect(a.naruszenie).to.equal(false);
          const e = znacznik(pc, "R");
          expect(e, "znacznik").to.be.ok;
          expect(e.getFlag(MODULE_ID, FLAG_ZNACZNIK).m8).to.equal(true);
          const wlasny = w.combat.turns.find(x => x.actorId === pc.id);
          expect(e._source.start.combatant, "wygasa na początku tury reagującego").to.equal(wlasny.id);
          const dup = await zadeklaruj(pc, "R", { zrodlo: "Inteligentna obrona", id: "staly-id-1" });
          expect(dup.duplikat).to.equal(true);
          expect(stan(pc).pule.R.wydane).to.equal(1);
          const b = await zadeklaruj(pc, "R", { zrodlo: "Motywacja" });
          expect(b.naruszenie).to.equal(true);
          expect(pc.effects.filter(x => x.statuses.has("reakcja"))).to.have.length(1);
          await e.delete();
          await waitFor(() => stan(pc).pule.R.wydane === 0, { label: "korekta z HUD-u" });
          const ops = ledger(kombatant(pc)).ops;
          expect(ops.at(-1)).to.include({ rodzaj: "korekta" });
          expect(ops.filter(o => o.rodzaj === "akcja"), "dowody wydatków zostają").to.have.length(2);
        } finally {
          r();
          await w.sprzatnij();
        }
      });

      it("Zryw B: grant podnosi pulę, druga B bez naruszenia; poza walką nic", async function () {
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Zryw M8` });
        const w = await walkaTestowa([pc], { kto: pc, nazwa: "m8-zryw" });
        const r = stub(game, "combat", w.combat);
        try {
          await zadeklaruj(pc, "B", { zrodlo: "Kondycha" });
          await dodatkowa(pc, "B");
          expect(E.licznik(stan(pc).pule.B)).to.equal("1/2");
          expect((await zadeklaruj(pc, "B", { zrodlo: "Ulubiona broń" })).naruszenie).to.equal(false);
          expect(znacznik(pc, "B").getFlag(MODULE_ID, FLAG_ZNACZNIK).uzycia.map(u => u.zrodlo)).to.deep.equal(["Kondycha", "Ulubiona broń"]);
          await koryguj(pc, { koszt: { B: -1 }, powod: "test" });
          expect(stan(pc).pule.B.wydane).to.equal(1);
        } finally {
          r();
          await w.sprzatnij();
        }
        const r2 = stub(game, "combat", null);
        try { expect(await zadeklaruj(pc, "R")).to.deep.equal({ poza: true }); } finally { r2(); }
      });

      it("T22: skompilowany Zryw — zamknięcie okna nic nie zużywa; wybór B: jedno użycie, jeden grant", async function () {
        const doc = (await game.packs.get(`${MODULE_ID}.zdolnosci-klasowe`)?.getDocuments() ?? [])
          .find(d => d.getFlag(MODULE_ID, "abilityId") === "zryw");
        expect(doc, "Zryw w paczce").to.be.ok;
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Twardziel M8` });
        const [zryw] = await pc.createEmbeddedDocuments("Item", [game.items.fromCompendium(doc)]);
        const w = await walkaTestowa([pc], { kto: pc, nazwa: "m8-zryw-akt" });
        const r = stub(game, "combat", w.combat);
        const DialogV2 = foundry.applications.api.DialogV2;
        let odpowiedz = null;
        const rw = stub(DialogV2, "wait", async () => odpowiedz);
        const msgs = [];
        const h = Hooks.on("dnd5e.postUseActivity", (_a, _u, res) => { if (res?.message) msgs.push(res.message.id); });
        try {
          const akt = zryw.system.activities.contents[0];
          const { __testing: K } = await import("../combat/zdolnosci-karty.mjs");
          expect(await K._wybierzZryw(akt), "zamknięte okno").to.equal(null);
          expect(pc.items.get(zryw.id).system.uses.spent, "bez zużycia").to.equal(0);
          expect(stan(pc).pule.B.pojemnosc).to.equal(1);
          odpowiedz = "B";
          await K._wybierzZryw(akt);
          await waitFor(() => stan(pc).pule.B.pojemnosc === 2, { label: "grant B" });
          expect(pc.items.get(zryw.id).system.uses.spent).to.equal(1);
          expect(stan(pc).pule.A.pojemnosc, "Zryw B nie daje A").to.equal(1);
          expect(msgs, "karta użycia").to.have.length(1);
          await dodatkowa(pc, "B", { zrodlo: "Zryw", id: `zryw-${msgs[0]}` });
          expect(stan(pc).pule.B.pojemnosc, "ponowienie id nie daje drugiego grantu").to.equal(2);
        } finally {
          Hooks.off("dnd5e.postUseActivity", h);
          rw();
          r();
          await w.sprzatnij();
        }
      });

      it("D24: Berserk kończy się po 10. własnej turze; zmęczenie zakazuje A/B/I/R do końca następnej tury, ruch zostaje", async function () {
        const doc = (await game.packs.get(`${MODULE_ID}.zdolnosci-klasowe`)?.getDocuments() ?? [])
          .find(d => d.getFlag(MODULE_ID, "abilityId") === "berserk");
        expect(doc, "Berserk w paczce").to.be.ok;
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Brutal M8`, ...szybki });
        const inny = await scratchActor({ name: `${SCRATCH_PREFIX} Wróg M8` });
        await pc.createEmbeddedDocuments("Item", [game.items.fromCompendium(doc)]);
        const w = await walkaTestowa([pc, inny], { kto: pc, nazwa: "m8-berserk" });
        const r = stub(game, "combat", w.combat);
        try {
          const { toggleClassState } = await import("../actors/class-state.mjs");
          expect(await toggleClassState(pc, "berserk")).to.equal(true);
          const ef = () => pc.effects.find(e => e.getFlag(MODULE_ID, "classState"));
          expect(ef().getFlag(MODULE_ID, "startCykl")).to.equal(1);
          await w.combat.update({ round: 10, turn: w.combat.turns.findIndex(x => x.actorId === pc.id) });
          expect(ef(), "w 10. własnej turze Berserk trwa").to.be.ok;
          await w.combat.nextTurn();
          await waitFor(() => !ef(), { label: "koniec Berserku po 10. turze" });
          await waitFor(() => stan(pc).pule.A.zakaz, { label: "zakaz zmęczenia" });
          expect(stan(pc).pule.R.zakaz).to.include("Zmęczenie");
          await w.combat.nextTurn();
          await waitFor(() => stan(pc).chwila.wlasna, { label: "następna własna tura" });
          const s = stan(pc);
          expect(s.pule.A.zakaz, "zakaz mimo odświeżenia pul").to.include("Zmęczenie");
          expect(s.pule.A.pojemnosc).to.equal(1);
          expect(s.ruch.dostepny, "ruchu nie odbiera").to.equal(true);
          await w.combat.nextTurn();
          await waitFor(() => !stan(pc).chwila.wlasna, { label: "koniec następnej tury" });
          expect(stan(pc).pule.A.zakaz).to.equal(null);
        } finally {
          r();
          await w.sprzatnij();
        }
      });

      it("D24: przerwanie Berserku Nieprzytomnością też daje zmęczenie; ręczne wyłączenie — nie", async function () {
        const doc = (await game.packs.get(`${MODULE_ID}.zdolnosci-klasowe`)?.getDocuments() ?? [])
          .find(d => d.getFlag(MODULE_ID, "abilityId") === "berserk");
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Brutal2 M8` });
        await pc.createEmbeddedDocuments("Item", [game.items.fromCompendium(doc)]);
        const w = await walkaTestowa([pc], { kto: pc, nazwa: "m8-berserk2" });
        const r = stub(game, "combat", w.combat);
        try {
          const { toggleClassState } = await import("../actors/class-state.mjs");
          await toggleClassState(pc, "berserk");
          await toggleClassState(pc, "berserk");
          await new Promise(res => setTimeout(res, 300));
          expect(stan(pc).pule.A.zakaz, "ręczne wyłączenie bez kary").to.equal(null);
          await toggleClassState(pc, "berserk");
          await pc.toggleStatusEffect("unconscious", { active: true });
          await waitFor(() => !pc.effects.some(e => e.getFlag(MODULE_ID, "classState")), { label: "przerwanie" });
          await waitFor(() => ledger(kombatant(pc)).zakazy.length === 1, { label: "zakaz po przerwaniu" });
          expect(ledger(kombatant(pc)).zakazy[0]).to.include({ rodzaj: "zmeczenie", konczy: 2 });
        } finally {
          r();
          await w.sprzatnij();
        }
      });

      it("T23: skompilowane Szybkie ręce — ograniczona A tylko do Używania; przedmiot ją bierze, Atakowanie nie", async function () {
        const doc = (await game.packs.get(`${MODULE_ID}.zdolnosci-klasowe`)?.getDocuments() ?? [])
          .find(d => d.getFlag(MODULE_ID, "abilityId") === "szybkie-rece");
        expect(doc, "Szybkie ręce w paczce").to.be.ok;
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Spec M8`, system: { abilities: { dex: { value: 16 } } } });
        const [sr] = await pc.createEmbeddedDocuments("Item", [game.items.fromCompendium(doc)]);
        const w = await walkaTestowa([pc], { kto: pc, nazwa: "m8-szybkie-rece" });
        const r = stub(game, "combat", w.combat);
        try {
          await sr.system.activities.contents[0].use({}, { configure: false });
          await waitFor(() => stan(pc).pule.A.ogr.uzywanie, { label: "grant Szybkich rąk" });
          const p = stan(pc).pule.A;
          expect(p.pojemnosc, "zwykła pula bez zmian").to.equal(1);
          expect(p.ogr.uzywanie).to.deep.equal({ pojemnosc: 1, wydane: 0 });
          await zadeklaruj(pc, "A", { zrodlo: "Atak", sygnal: false });
          const atak2 = await zadeklaruj(pc, "A", { zrodlo: "Atak 2", sygnal: false });
          expect(atak2.naruszenie, "druga A do ataku — ostrzega mimo grantu").to.equal(true);
          const medpak = await zadeklaruj(pc, "A", { zrodlo: "Medpak", cel: "uzywanie", sygnal: false });
          expect(medpak.naruszenie, "Używanie bierze ograniczony grant").to.equal(false);
          expect(stan(pc).pule.A.ogr.uzywanie.wydane).to.equal(1);
        } finally {
          r();
          await w.sprzatnij();
        }
      });

      it("pierwotny kontekst: zapis z chwilą sprzed zmiany tury trafia do tamtej tury (§5.2)", async function () {
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Opóźniony M8` });
        const inny = await scratchActor({ name: `${SCRATCH_PREFIX} Następny M8` });
        const w = await walkaTestowa([pc, inny], { kto: pc, nazwa: "m8-kontekst" });
        const r = stub(game, "combat", w.combat);
        try {
          const c = kombatant(pc);
          const ch = chwila(c);
          await w.combat.nextTurn();
          await zatwierdz(c, { koszt: { A: 1 }, zrodlo: "spóźnione", chwila: ch });
          expect(ledger(c).ops.at(-1)).to.include({ wlasna: true, cykl: 1 });
          expect(ledger(c).ops.at(-1).ostrz).to.deep.equal([]);
        } finally {
          r();
          await w.sprzatnij();
        }
      });
    });

    describe("Uprawnienia wykonawcy (warstwa 4)", function () {
      it("MG i właściciel — wszystko; inny gracz — tylko dodatni wydatek akcji (jak dawny przekaźnik M7)", async function () {
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Uprawnienia M8` });
        const gracz = game.users.find(u => !u.isGM);
        if (!gracz) this.skip();
        const c = { actor: pc };
        expect(T.moze(game.user, c, { koszt: { A: 1 }, grant: { typ: "A", ile: 1 } }), "MG").to.equal(true);
        expect(T.moze(gracz, c, { koszt: { R: 1 } }), "cudza Reakcja — tak").to.equal(true);
        expect(T.moze(gracz, c, { rodzaj: "korekta", koszt: { R: -1 } }), "korekta — nie").to.equal(false);
        expect(T.moze(gracz, c, { rodzaj: "grant", koszt: {}, grant: { typ: "A", ile: 1 } }), "grant — nie").to.equal(false);
        expect(T.moze(gracz, c, { typ: "ruch" }), "ruch — nie").to.equal(false);
        expect(T.moze(gracz, c, { koszt: { R: 1 }, reakcjaStart: "r-x" }), "start reakcji — nie").to.equal(false);
        expect(T.moze(null, c, { koszt: { R: 1 } }), "bez nadawcy — nie").to.equal(false);
      });
    });

    describe("Macierz §11 — wektory bez osobnej etykiety (warstwa 4)", function () {
      it("T03: metryka — 4,5/4,5 poziomo to 4,5 m, z wysokością 6 to 6 m (natywny pomiar siatki, przekątne równe)", async function () {
        const scena = await Scene.implementation.create({ name: `${SCRATCH_PREFIX} T03`, width: 1500, height: 1500, padding: 0,
          grid: { type: CONST.GRID_TYPES.SQUARE, size: 100, distance: 1.5, units: "m", diagonals: CONST.GRID_DIAGONALS.EQUIDISTANT } });
        try {
          const g = scena.grid;
          const poziomo = g.measurePath([{ x: 50, y: 50 }, { x: 350, y: 350 }]).distance;
          expect(poziomo, "3 pola po skosie = 4,5 m, nie √2").to.equal(4.5);
          const wGore = g.measurePath([{ x: 50, y: 50, elevation: 0 }, { x: 350, y: 350, elevation: 6 }]).distance;
          expect(wGore, "max(poziomo, pionowo)").to.equal(6);
          const objazd = g.measurePath([{ x: 50, y: 50 }, { x: 350, y: 50 }, { x: 350, y: 350 }]).distance;
          expect(objazd, "trasa z obejściem sumuje odcinki").to.equal(9);
        } finally {
          await scena.delete();
        }
      });

      it("T05: dwa natywne trudne tereny naraz — ×2, nie ×4 (rozstrzyganie terenu dnd5e); T42: akcja słowna i koniec tury bez kary", async function () {
        const szybki = { system: { attributes: { movement: { speeds: { walk: 9 }, units: "m" } } } };
        const TD = CONFIG.Token.movement.TerrainData;
        const dwa = TD.resolveTerrainEffects([{ name: "difficultTerrain" }, { name: "difficultTerrain" }]);
        expect(dwa?.difficulty, "dwa Regiony trudnego terenu").to.equal(2);
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} T42`, ...szybki });
        const inny = await scratchActor({ name: `${SCRATCH_PREFIX} T42 drugi`, ...szybki });
        const w = await walkaTestowa([pc, inny], { kto: pc, nazwa: "m8-t42" });
        const r = stub(game, "combat", w.combat);
        try {
          const tok = w.zetony.find(t => t.actorId === pc.id);
          await waitFor(() => ledger(kombatant(tok)).tury.length > 0, { label: "tura" });
          expect(stan(tok).pule.A.pozostalo, "akcja zagrana słownie — licznik 1/1").to.equal(1);
          await w.combat.nextTurn();
          await waitFor(() => !stan(tok).chwila.wlasna, { label: "koniec tury" });
          const l = ledger(kombatant(tok));
          expect(l.zakazy, "bez kary za niewydaną akcję").to.deep.equal([]);
          expect(l.ops.filter(o => o.rodzaj !== "zdarzenie"), "bez pytań i zapisów").to.deep.equal([]);
        } finally {
          r();
          await w.sprzatnij();
        }
      });
    });

    describe("Pomocnicze (warstwa 4)", function () {
      it("koszt przebytej części pomija displace i bierze natywny koszt odcinków", function () {
        const m = { passed: { cost: 9, distance: 4.5, waypoints: [{ action: "walk", cost: 3 }, { action: "displace", cost: 3 }, { action: "crawl", cost: 3 }] } };
        expect(T.kosztPrzebyty(m)).to.deep.equal({ koszt: 6, dyst: 4.5, tryb: "crawl", niepelny: false });
        // Token niewyrenderowany u ruszającego: rdzeń daje koszt 0 — liczy się dystans, z etykietą „niepełny”.
        const zero = { passed: { cost: 0, distance: 3, waypoints: [{ action: "walk", cost: 0 }, { action: "walk", cost: 0 }] } };
        expect(T.kosztPrzebyty(zero)).to.deep.equal({ koszt: 3, dyst: 3, tryb: "walk", niepelny: true });
      });
    });
  });
}
