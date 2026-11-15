/**
 * Neuroshima 5e — Wyczekanie, Reakcja i Pomaganie M8 (PLAN_m8_ruch_i_ekonomia_akcji §4.3, §6.3–§6.4, E5;
 * §11 T12, T27–T29, T41).
 *
 * Warstwa 1: przygotowanie za A, wykonanie za R raz, pominięcie bez kosztu, wygaśnięcie z nową turą bez zwrotu,
 * deklaracja w otwartej reakcji bez drugiej R, przedmiot poza turą w R, reakcja słowna; ochrona Biegania w Reakcji (D32)
 * w silniku okoliczności.
 * Warstwa 4: prawdziwa walka — reakcje zamykane ze zmianą tury (ochrona nie dożywa cudzej tury), Zryw poza turą z
 * ostrzeżeniem (D23), Pomaganie w teście (sukces/porażka, Ułatwienie i zużycie zgodnym rzutem, termin) i w ataku.
 */

import { SCRATCH_PREFIX, scratchActor, scratchCleanup, stub, walkaTestowa, waitFor } from "./helpers.mjs";
import * as E from "../config/ekonomia-data.mjs";
import { rozstrzygnijOkolicznosci } from "../config/okolicznosci-ataku.mjs";
import { akcja, deklaruj, dodatkowa, wyczekaj, reaguj } from "../actors/actions.mjs";
import { ledger, stan, kombatant, ochronaBieguWReakcji } from "../combat/ekonomia.mjs";
import { pomoz, pomocTestu, pomocAtaku, pomoce, pomocAktualna } from "../combat/pomaganie.mjs";
import { rozstrzygnijRzut } from "../combat/ulatwienia-testow.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const wl = r => ({ runda: r, cykl: r, wlasna: true, reakcja: null });
const po = r => ({ runda: r, cykl: r, wlasna: false, reakcja: null });
const sp = walk => ({ szybkosci: { walk, swim: 0, climb: 0, fly: 0, burrow: 0 } });
let _n = 0;
const id = () => `w${++_n}`;
/** Zapis żądania z identyfikatorem; zwraca wynik. Chwila z aktywną reakcją jak u klienta (`chwila()`). */
const zapisz = (l, ch, z, a = sp(9)) => E.zastosuj(l, { ...ch, reakcja: ch.reakcja ?? E.aktywnaReakcja(l, ch.cykl)?.id ?? null }, { id: id(), ...z }, a).wynik;
const zCh = (l, ch) => ({ ...ch, reakcja: ch.reakcja ?? E.aktywnaReakcja(l, ch.cykl)?.id ?? null });

const U = (stany = [], o = {}) => ({ stany: new Set(stany), szybkosc0: false, nazwa: null, ...o });
const mig = o => ({ atakujacy: U(), cel: U(["bieganie"]), liczbaCelow: 1, wrecz: false, odleglosc: 10,
  zasieg: { normalny: 18, daleki: 39 }, wrogowieObok: [], celPochwytuje: null, turaCelu: false, bron: null, zewnetrzne: [], ...o });

export function registerWyczekanieTests(quench) {
  quench.registerBatch(`${MODULE_ID}.wyczekanie`, context => {
    const { describe, it, expect, after } = context;
    const start = Date.now();

    after(async () => {
      await scratchCleanup();
      const msgs = game.messages.filter(m => m.timestamp >= start).map(m => m.id);
      if (msgs.length) await ChatMessage.implementation.deleteDocuments(msgs);
    });

    describe("Wyczekanie i Reakcja (warstwa 1)", function () {
      it("T28: Wyczekanie za A; pominięta okazja nic nie wydaje; wykonanie za R raz; dwa przygotowania — jedna R", function () {
        const l = E.pustyLedger("w");
        zapisz(l, wl(1), E.zadanieWyczekania(wl(1), { opis: "strzał, gdy wyjdzie" }).zadanie);
        zapisz(l, wl(1), E.zadanieWyczekania(wl(1), { opis: "granat" }).zadanie);
        expect(E.pule(l, wl(1)).A.pozostalo, "dwie A — druga z ostrzeżeniem").to.equal(-1);
        // Cudza tura: okazja pominięta — nic się nie zmienia.
        expect(E.aktywnePrzygotowania(l, po(1)).map(p => p.opis)).to.deep.equal(["strzał, gdy wyjdzie", "granat"]);
        expect(E.pule(l, po(1)).R.wydane).to.equal(0);
        // Wykonanie pierwszego: R 0/1, przygotowanie zużyte, reakcja otwarta.
        const p1 = E.aktywnePrzygotowania(l, po(1))[0];
        const w1 = zapisz(l, po(1), E.zadanieReakcji(l, po(1), { przygotowanie: p1.id }).zadanie);
        expect(w1.ostrz).to.deep.equal([]);
        expect(E.pule(l, po(1)).R.pozostalo).to.equal(0);
        expect(E.aktywnePrzygotowania(l, po(1)).map(p => p.opis), "drugie zostaje do wyboru").to.deep.equal(["granat"]);
        // Drugie w tej samej rundzie — wspólna R: wykonuje się z ostrzeżeniem, nie łączy dwóch akcji w jedną R.
        const p2 = E.aktywnePrzygotowania(l, po(1))[0];
        const w2 = zapisz(l, po(1), E.zadanieReakcji(l, po(1), { przygotowanie: p2.id }).zadanie);
        expect(w2.ostrz.join(" ")).to.match(/Reakcja ponad pulę/);
      });

      it("T28: niewykorzystane przygotowanie wygasa z początkiem własnej tury — bez zwrotu A; Wyczekanie poza turą ostrzega", function () {
        const l = E.pustyLedger("w");
        zapisz(l, wl(1), E.zadanieWyczekania(wl(1), { opis: "czekam" }).zadanie);
        E.zapiszTure(l, 2);
        expect(E.aktywnePrzygotowania(l, wl(2))).to.deep.equal([]);
        expect(E.pule(l, wl(2)).A.pozostalo, "nowa tura — pełna A, stara nie wraca").to.equal(1);
        expect(l.ops.find(o => o.zrodlo === "Wyczekanie").koszt.A, "historia zostaje").to.equal(1);
        expect(E.zadanieWyczekania(po(2)).ostrz[0]).to.match(/własnej turze/);
      });

      it("D30 + §6.4: Reaguj → wykonanie przygotowania, potem Biegnij — jedna R, świeży grant w tej reakcji", function () {
        const l = E.pustyLedger("w");
        zapisz(l, wl(1), E.zadanieWyczekania(wl(1), { opis: "biegnę", akcja: "Bieganie" }).zadanie);
        const p = E.aktywnePrzygotowania(l, po(1))[0];
        zapisz(l, po(1), E.zadanieReakcji(l, po(1), { przygotowanie: p.id }).zadanie);
        const ch = zCh(l, po(1));
        expect(E.reakcjaBezAkcji(l, ch), "reakcja otwarta bez akcji").to.be.ok;
        const d = E.zadanieDeklaracji("bieganie", l, ch, sp(9)).zadanie;
        expect(d.koszt, "bez drugiej R").to.deep.equal({});
        expect(d.reakcjaStart).to.equal(undefined);
        zapisz(l, ch, d);
        expect(E.pule(l, ch).R.wydane).to.equal(1);
        const b = E.budzetRuchu(l, zCh(l, po(1)), sp(9));
        expect([b.pozostalo, b.pojemnosc], "tylko 18 m z tej reakcji").to.deep.equal([18, 18]);
        expect(E.reakcjaBezAkcji(l, zCh(l, po(1))), "reakcja ma już akcję").to.equal(null);
      });

      it("T41: przedmiot [A] poza turą → R (nowa reakcja, zużywa przygotowanie); w otwartej reakcji — bez drugiej R; słowna R", function () {
        const l = E.pustyLedger("w");
        zapisz(l, wl(1), E.zadanieWyczekania(wl(1), { opis: "medpak" }).zadanie);
        const z = E.zadanieWReakcji(l, po(1), { zrodlo: "Medpak (w Reakcji)" });
        expect(z.koszt).to.deep.equal({ R: 1 });
        expect(z.wykonaj, "przygotowanie zużyte").to.equal(E.aktywnePrzygotowania(l, po(1))[0].id);
        zapisz(l, po(1), z);
        expect(E.aktywnePrzygotowania(l, po(1))).to.deep.equal([]);
        // Słowna reakcja: R i od razu zamknięta.
        const l2 = E.pustyLedger("w");
        zapisz(l2, po(1), E.zadanieReakcji(l2, po(1), { slowna: true }).zadanie);
        expect(E.pule(l2, po(1)).R.wydane).to.equal(1);
        expect(E.aktywnaReakcja(l2, 1), "zamknięta").to.equal(null);
        // Otwarta reakcja bez akcji przyjmuje użycie przedmiotu bez kosztu.
        const l3 = E.pustyLedger("w");
        zapisz(l3, po(1), E.zadanieReakcji(l3, po(1), {}).zadanie);
        expect(E.zadanieWReakcji(l3, zCh(l3, po(1)), { zrodlo: "Granat (w Reakcji)" }).koszt).to.deep.equal({});
      });

      it("D32: Bieganie w Reakcji chroni przed ostrzałem tylko w trwającej reakcji; wręcz nie; tura celu jak dotąd", function () {
        const ut = o => rozstrzygnijOkolicznosci(mig(o)).utrudnienia.map(w => w.id);
        expect(ut({ biegWReakcji: true })).to.deep.equal(["celBiegnieReakcja"]);
        expect(ut({ biegWReakcji: false }), "reakcja zamknięta — nic").to.deep.equal([]);
        expect(ut({ biegWReakcji: true, wrecz: true, odleglosc: 1.5 }), "wręcz — nie").to.deep.equal([]);
        expect(ut({ turaCelu: true, biegWReakcji: true }), "jedna przyczyna, nie dwie").to.deep.equal(["celBiegnie"]);
      });

      it("WKK (Kobalt, zasada 47) wyłączony: ochrona w Reakcji tylko jako uwaga „rozstrzygnij ręcznie”; własna tura bez zmian", function () {
        const w = rozstrzygnijOkolicznosci(mig({ biegWReakcji: true, wkkD32: false }));
        expect(w.utrudnienia).to.deep.equal([]);
        expect(w.uwagi.map(x => x.id)).to.include("celBiegnieReakcjaReczne");
        expect(rozstrzygnijOkolicznosci(mig({ turaCelu: true, wkkD32: false })).utrudnienia.map(x => x.id), "druk działa zawsze")
          .to.deep.equal(["celBiegnie"]);
      });
    });

    describe("Prawdziwa walka (warstwa 4)", function () {
      this.timeout(30000);
      const szybki = { system: { attributes: { movement: { speeds: { walk: 9 }, units: "m" } } } };

      it("T12: Bieganie w Reakcji — ochrona trwa w reakcji, zmiana tury zamyka reakcję i ochronę (bez cudzej tury)", async function () {
        const inny = await scratchActor({ name: `${SCRATCH_PREFIX} Na turze M8`, ...szybki });
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Biegnie w R M8`, ...szybki });
        const trzeci = await scratchActor({ name: `${SCRATCH_PREFIX} Trzeci M8`, ...szybki });
        const w = await walkaTestowa([inny, pc, trzeci], { kto: inny, nazwa: "m8-r-bieg" });
        const r = stub(game, "combat", w.combat);
        try {
          const tok = w.zetony.find(t => t.actorId === pc.id);
          const c = kombatant(tok);
          await deklaruj(pc, "bieganie");
          await waitFor(() => ochronaBieguWReakcji(tok), { label: "ochrona w reakcji" });
          expect(stan(tok).pule.R.wydane).to.equal(1);
          await w.combat.nextTurn();
          await waitFor(() => ledger(c).reakcje.every(x => x.koniec), { label: "reakcja zamknięta ze zmianą tury" });
          expect(ochronaBieguWReakcji(tok), "bez ochrony po końcu tury, w której biegł").to.equal(false);
        } finally {
          r();
          await w.sprzatnij();
        }
      });

      it("T41/§6.4: akcja przedmiotu we własnej turze — A, poza nią — R; Wyczekanie + Reaguj → przygotowanie wykonane raz", async function () {
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Przedmiot M8`, ...szybki });
        const inny = await scratchActor({ name: `${SCRATCH_PREFIX} Drugi przedmiot M8`, ...szybki });
        const w = await walkaTestowa([pc, inny], { kto: pc, nazwa: "m8-przedmiot-r" });
        const r = stub(game, "combat", w.combat);
        try {
          const tok = w.zetony.find(t => t.actorId === pc.id);
          await waitFor(() => ledger(kombatant(tok)).tury.length > 0, { label: "tura" });
          const a1 = await akcja(pc, { zrodlo: "Medpak", cel: "uzywanie" });
          expect(a1.wR).to.equal(false);
          await wyczekaj(pc, { opis: "rzucę granat" });
          expect(stan(tok).pule.A.pozostalo, "A: medpak + Wyczekanie").to.equal(-1);
          await w.combat.nextTurn();
          await waitFor(() => !stan(tok).chwila.wlasna, { label: "cudza tura" });
          const p = E.aktywnePrzygotowania(stan(tok).ledger, stan(tok).chwila)[0];
          expect(p?.opis).to.equal("rzucę granat");
          await reaguj(pc, { przygotowanie: p.id });
          const a2 = await akcja(pc, { zrodlo: "Granat" });
          expect(a2.wR, "poza turą w Reakcji").to.equal(true);
          expect(stan(tok).pule.R.wydane, "jedna R na wykonanie").to.equal(1);
          expect(E.aktywnePrzygotowania(stan(tok).ledger, stan(tok).chwila)).to.deep.equal([]);
        } finally {
          r();
          await w.sprzatnij();
        }
      });

      it("T29/D23: Zryw poza własną turą — grant z ostrzeżeniem (warunek drukowany zostaje widoczny)", async function () {
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Zryw poza M8`, ...szybki });
        const inny = await scratchActor({ name: `${SCRATCH_PREFIX} Tura innego M8`, ...szybki });
        const w = await walkaTestowa([inny, pc], { kto: inny, nazwa: "m8-zryw-poza" });
        const r = stub(game, "combat", w.combat);
        try {
          const z = await dodatkowa(pc, "A", { zrodlo: "Zryw" });
          expect(z.ostrz.join(" ")).to.match(/tylko we własnej turze/);
        } finally {
          r();
          await w.sprzatnij();
        }
      });

      it("T27: Pomaganie w teście — sukces: Ułatwienie w zgodnym teście sojusznika, zużyte rzutem; porażka: A bez pomocy; termin", async function () {
        const pomocnik = await scratchActor({ name: `${SCRATCH_PREFIX} Pomocnik M8`, ...szybki });
        const sojusznik = await scratchActor({ name: `${SCRATCH_PREFIX} Sojusznik M8`, ...szybki });
        const w = await walkaTestowa([pomocnik, sojusznik], { kto: pomocnik, nazwa: "m8-pomoc" });
        const r = stub(game, "combat", w.combat);
        try {
          const tok = w.zetony.find(t => t.actorId === pomocnik.id);
          await waitFor(() => ledger(kombatant(tok)).tury.length > 0, { label: "tura" });
          // Porażka (wynik 7): A wydana, bez pomocy.
          const nie = await pomoz(pomocnik, { galaz: "test", sojusznik, klucz: "skill:atl", wynik: 7 });
          expect(nie.sukces).to.equal(false);
          expect(pomoce(sojusznik)).to.deep.equal([]);
          // Sukces (wynik 12): pomoc na sojuszniku.
          const tak = await pomoz(pomocnik, { galaz: "test", sojusznik, klucz: "skill:atl", wynik: 12 });
          expect(tak.sukces).to.equal(true);
          expect(stan(tok).pule.A.wydane, "dwie próby — dwie A").to.equal(2);
          await waitFor(() => pomocTestu(sojusznik, { skill: "atl" }), { label: "pomoc na sojuszniku" });
          expect(pomocTestu(sojusznik, { skill: "akr" }), "inna umiejętność — nie").to.equal(null);
          // Ułatwienie domyślne w oknie testu Atletyki.
          const cfg = { subject: sojusznik, hookNames: ["skill", "abilityCheck", "d20Test"], skill: "atl", ability: "str" };
          expect(rozstrzygnijRzut(cfg).wynik.ulatwienia.map(x => x.id)).to.include("pomaganie");
          // Niepowiązany rzut nie zużywa; zgodny — tak.
          Hooks.callAll("dnd5e.rollSkill", [], { skill: "akr", subject: sojusznik });
          await new Promise(res => setTimeout(res, 200));
          expect(pomocTestu(sojusznik, { skill: "atl" }), "Akrobatyka nie zużywa").to.be.ok;
          Hooks.callAll("dnd5e.rollSkill", [], { skill: "atl", subject: sojusznik });
          await waitFor(() => !pomocTestu(sojusznik, { skill: "atl" }), { label: "zużyta" });
          // Termin: pomoc do początku następnej tury pomagającego.
          await pomoz(pomocnik, { galaz: "test", sojusznik, klucz: "skill:atl", wynik: 15 });
          await waitFor(() => pomocTestu(sojusznik, { skill: "atl" }), { label: "druga pomoc" });
          const wpis = pomocTestu(sojusznik, { skill: "atl" });
          await w.combat.nextTurn();
          await w.combat.nextTurn();
          await waitFor(() => !pomocAktualna(wpis), { label: "wygasła z nową turą pomocnika" });
        } finally {
          r();
          await w.sprzatnij();
        }
      });

      it("T27: Pomaganie w ataku — bez testu pomocnika, Ułatwienie na ten cel; inny cel — nie; bez wymyślonego terminu", async function () {
        const pomocnik = await scratchActor({ name: `${SCRATCH_PREFIX} Asysta M8`, ...szybki });
        const sojusznik = await scratchActor({ name: `${SCRATCH_PREFIX} Atakujący M8`, ...szybki });
        const wrog = await scratchActor({ name: `${SCRATCH_PREFIX} Wróg M8`, ...szybki });
        const w = await walkaTestowa([pomocnik, sojusznik, wrog], { kto: pomocnik, nazwa: "m8-pomoc-atak" });
        const r = stub(game, "combat", w.combat);
        try {
          const tw = w.zetony.find(t => t.actorId === wrog.id);
          const tp = w.zetony.find(t => t.actorId === pomocnik.id);
          const wynik = await pomoz(pomocnik, { galaz: "atak", sojusznik, wrog: tw });
          expect(wynik.ostrz.join(" "), "wróg 3 m dalej — ostrzeżenie, nie blokada").to.match(/1,5 m/);
          await waitFor(() => pomocAtaku(sojusznik, tw.uuid), { label: "pomoc w ataku" });
          expect(pomocAtaku(sojusznik, tp.uuid), "inny cel — nie").to.equal(null);
          await w.combat.nextTurn();
          await w.combat.nextTurn();
          await w.combat.nextTurn();
          expect(pomocAtaku(sojusznik, tw.uuid), "bez wygaśnięcia z turą pomocnika").to.be.ok;
        } finally {
          r();
          await w.sprzatnij();
        }
      });
    });
  });
}
