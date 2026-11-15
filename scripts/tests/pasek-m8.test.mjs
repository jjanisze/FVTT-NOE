/**
 * Neuroshima 5e — pasek M8 (PLAN_m8_ruch_i_ekonomia_akcji §8.3, E7; §11 T43).
 *
 * Warstwa 4 (prawdziwy pasek użytkownika w świecie testowym): makro zdolności zdjęte z paska ręcznie trafia na listę
 * usuniętych i synchronizacja go nie odtwarza; przeniesienie na inne pole to nie usunięcie; `restoreHotbar` przywraca
 * jawnie i czyści listę. Skrót przycisku panelu z paska wykonuje tę samą operację.
 * Szablony paska (§8.3): planer (makra użytkownika nietknięte — konflikt za dziesiątką; makra modułu przesuwane),
 * decyzje klasowe z posiadanych zdolności, prawdziwe ułożenie (jeden zapis, wersja na użytkowniku, drugi raz bez
 * zmian), palety Ruch/Więcej (poza walką bez budżetu, Szybkie nogi — warianty B).
 */

import { SCRATCH_PREFIX, scratchActor, scratchCleanup, waitFor, walkaTestowa, stub } from "./helpers.mjs";
import { queueHotbarSync, restoreHotbar, FLAG_REMOVED } from "../actors/ability-hotbar.mjs";
import { planPaska, decyzjeKlasowe } from "../config/pasek-data.mjs";
import { ulozPasek, tozsamoscMakra, FLAGA_SZABLONU } from "../actors/pasek-szablony.mjs";
import { opcjePalety } from "../actors/ekonomia-karta.mjs";
import { stan, kombatant, ledger } from "../combat/ekonomia.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const ZDOLNOSC = "skuteczny-cios";
const W = (klucz, id) => ({ klucz, id, label: id });

export function registerPasekM8Tests(quench) {
  quench.registerBatch(`${MODULE_ID}.pasek-m8`, context => {
    const { describe, it, expect, after } = context;

    after(async () => { await scratchCleanup(); });

    describe("Szablony paska — model (warstwa 1)", function () {
      it("decyzje klasowe: kolejność szablonu klasy z posiadanych; Ulubiona broń i Szybkie nogi nie są decyzją w slocie", function () {
        expect(decyzjeKlasowe("brutal", [{ id: "wsciekly-cios", level: 2 }, { id: "z-bara", action: "B", level: 2 }, { id: "berserk", action: "B", level: 1 }]))
          .to.deep.equal(["berserk", "z-bara"]);
        expect(decyzjeKlasowe("twardziel", [{ id: "ulubiona-bron-twardziel", action: "B", level: 1 }, { id: "kondycha", action: "B", level: 1 }]),
          "Twardziel 1 — bez Zrywu, którego nie ma").to.deep.equal(["kondycha"]);
        expect(decyzjeKlasowe("zlodziej", [{ id: "szybkie-nogi", action: "B", level: 1 }, { id: "kocie-kosci", level: 2 }]),
          "Szybkie nogi — w palecie Ruch").to.deep.equal(["kocie-kosci"]);
        expect(decyzjeKlasowe(null, [{ id: "x", level: 3 }, { id: "y", action: "A", level: 5 }]), "bez szablonu — najpierw z akcją").to.deep.equal(["y", "x"]);
      });

      it("planer: pusty pasek — dodaje, pusta pozycja zostaje pusta; makro użytkownika — konflikt za dziesiątką, nietknięte", function () {
        const wpisy = [W("bron", "item:a:1"), null, null, null, null, null, W("unik", "skrot:dodging"), W("odstap", "skrot:odstapienie"), W("ruch", "skrot:ruch"), W("wiecej", "skrot:wiecej")];
        const p = planPaska(wpisy, {});
        expect(p.kroki.map(k => k.akcja)).to.deep.equal(["dodaj", "brak", "brak", "brak", "brak", "brak", "dodaj", "dodaj", "dodaj", "dodaj"]);
        const k = planPaska(wpisy, { 7: { id: null, nasze: false, nazwa: "Moje" } });
        expect(k.kroki[6]).to.include({ akcja: "konflikt", zajety: "Moje", do: 11 });
        expect(k.odsuniecia, "makra użytkownika się nie odsuwa").to.deep.equal([]);
      });

      it("planer: makra modułu się przesuwają (zdolność ze slotu 1 do 4, skrót spoza szablonu za dziesiątkę); obecne — „jest”", function () {
        const wpisy = [W("bron", "item:a:1"), null, null, W("klasa1", "zdolnosc:berserk"), null, null, W("unik", "skrot:dodging"), null, null, null];
        const pasek = {
          1: { id: "zdolnosc:berserk", nasze: true, nazwa: "Berserk" },
          2: { id: "skrot:skok", nasze: true, nazwa: "Skok" },
          7: { id: "skrot:dodging", nasze: true, nazwa: "Unik" },
          15: { id: "item:a:1", nasze: true, nazwa: "B 92" }
        };
        const p = planPaska(wpisy, pasek);
        expect(p.kroki[0]).to.include({ akcja: "przenies", z: 15 });
        expect(p.kroki[3]).to.include({ akcja: "przenies", z: 1 });
        expect(p.kroki[6].akcja).to.equal("jest");
        expect(p.odsuniecia).to.deep.equal([{ z: 2, do: 11, nazwa: "Skok" }]);
      });
    });

    describe("Szablony paska — prawdziwy pasek (warstwa 4)", function () {
      this.timeout(30000);

      it("Ułóż pasek: broń 1, przeładowanie 3, Unik/Odstąp/Ruch/Więcej 7–0; makro użytkownika zostaje; wersja; drugi raz bez zmian", async function () {
        const user = game.user;
        const przed = { ...(user.hotbar ?? {}) };
        const flaga = user.getFlag(MODULE_ID, FLAGA_SZABLONU) ?? null;
        const usuniete = user.getFlag(MODULE_ID, FLAG_REMOVED) ?? null;
        const makraPrzed = new Set(game.macros.map(m => m.id));
        const bronie = await game.packs.get(`${MODULE_ID}.bron`).getDocuments();
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Szablon paska` });
        const [gun] = await pc.createEmbeddedDocuments("Item", [game.items.fromCompendium(bronie.find(i => i.getFlag(MODULE_ID, "weaponId") === "b92"))]);
        await game.neuroshima.lalka.place(pc, gun, "hand.0", { quiet: true });
        const moje = await Macro.create({ name: `${SCRATCH_PREFIX} moje makro`, type: "script", command: "" });
        const id = slot => tozsamoscMakra(game.macros.get(user.hotbar?.[slot]));
        try {
          await user.update({ hotbar: { 7: moje.id } }, { diff: false, recursive: false });
          const r = await ulozPasek(pc, { podglad: false });
          expect(r.zapisane).to.equal(true);
          expect(id(1)?.startsWith(`item:${gun.uuid}:`), "broń w ręce w slocie 1").to.equal(true);
          const przeladuj = pc.items.get(gun.id).system.activities.find(a => a.type === "neuroMagSwap");
          expect(przeladuj, "B 92 — wymiana magazynka").to.exist;
          expect(id(3), "obsługa broni w slocie 3").to.equal(`item:${gun.uuid}:${przeladuj.id}`);
          expect(user.hotbar[7], "makro użytkownika nietknięte").to.equal(moje.id);
          expect(id(11), "Unik za dziesiątką (konflikt)").to.equal("skrot:dodging");
          expect([id(8), id(9), id(10)]).to.deep.equal(["skrot:odstapienie", "skrot:ruch", "skrot:wiecej"]);
          expect(user.getFlag(MODULE_ID, FLAGA_SZABLONU)?.[pc.id]?.wersja).to.equal(1);
          const liczba = game.macros.size;
          const r2 = await ulozPasek(pc, { podglad: false });
          expect(r2.plan.kroki.filter(k => !["jest", "brak", "konflikt"].includes(k.akcja)), "drugi raz — bez zmian").to.deep.equal([]);
          expect(r2.plan.kroki[6].do, "konflikt zostaje tam, gdzie był").to.equal(11);
          expect(game.macros.size, "bez nowych makr").to.equal(liczba);
        } finally {
          await user.update({ hotbar: przed }, { diff: false, recursive: false });
          for (const m of game.macros.filter(x => !makraPrzed.has(x.id))) await m.delete();
          if (flaga) await user.setFlag(MODULE_ID, FLAGA_SZABLONU, flaga);
          else if (user.getFlag(MODULE_ID, FLAGA_SZABLONU)) await user.unsetFlag(MODULE_ID, FLAGA_SZABLONU);
          // Podmiana całego paska w teście to dla synchronizatora „usunięcie” makr zdolności MG — lista wraca (zapis w tle).
          await new Promise(res => setTimeout(res, 300));
          if (usuniete) await user.setFlag(MODULE_ID, FLAG_REMOVED, usuniete);
          else if (user.getFlag(MODULE_ID, FLAG_REMOVED)) await user.unsetFlag(MODULE_ID, FLAG_REMOVED);
        }
      });

      it("palety: poza walką bez budżetu (Ruch — sam Skok); w walce Złodziej z Szybkimi nogami — Przyspiesz [B] daje grant za B", async function () {
        const cechy = await game.packs.get(`${MODULE_ID}.zdolnosci-klasowe`).getDocuments();
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Palety` });
        const inny = await scratchActor({ name: `${SCRATCH_PREFIX} Obok palet` });
        expect(opcjePalety(pc, "ruch").map(o => o.id)).to.deep.equal(["skok"]);
        expect(opcjePalety(pc, "wiecej").map(o => o.id)).to.deep.equal(["pomoz", "manewr", "skok"]);
        await pc.createEmbeddedDocuments("Item", [game.items.fromCompendium(cechy.find(i => i.getFlag(MODULE_ID, "abilityId") === "szybkie-nogi"))]);
        const w = await walkaTestowa([pc, inny], { kto: pc, nazwa: "m8-palety" });
        const rc = stub(game, "combat", w.combat);
        try {
          const tok = w.zetony.find(t => t.actorId === pc.id);
          await waitFor(() => ledger(kombatant(tok)).tury.length > 0, { label: "tura" });
          const ruch = opcjePalety(pc, "ruch");
          expect(ruch.map(o => o.id)).to.include.members(["przyspieszenie", "bieganie", "skok", "padnij", "nogi-przyspieszenie", "nogi-odstapienie", "nogi-ukrycie"]);
          expect(opcjePalety(pc, "wiecej").map(o => o.id)).to.include.members(["wyczekaj", "reaguj"]);
          const przed = stan(tok).ruch.pojemnosc;
          await ruch.find(o => o.id === "nogi-przyspieszenie").run();
          await waitFor(() => stan(tok).pule.B.wydane === 1, { label: "Szybkie nogi za B" });
          expect(stan(tok).pule.A.wydane, "bez A").to.equal(0);
          expect(stan(tok).ruch.pojemnosc, "grant Przyspieszenia").to.be.above(przed);
        } finally {
          rc();
          await w.sprzatnij();
        }
      });
    });

    describe("Usunięcia z paska zostają (warstwa 4)", function () {
      this.timeout(20000);

      it("T43: zdjęte makro zdolności nie wraca samo; przeniesienie nie jest usunięciem; przywrócenie jawne", async function () {
        const user = game.user;
        const przed = { ...(user.hotbar ?? {}) };
        const lista = user.getFlag(MODULE_ID, FLAG_REMOVED) ?? null;
        const cechy = await game.packs.get(`${MODULE_ID}.zdolnosci-klasowe`).getDocuments();
        const pc = await scratchActor({ name: `${SCRATCH_PREFIX} Pasek M8` });
        await pc.createEmbeddedDocuments("Item", [game.items.fromCompendium(cechy.find(i => i.getFlag(MODULE_ID, "abilityId") === ZDOLNOSC))]);
        const pole = () => Number(Object.entries(user.hotbar ?? {}).find(([, id]) => game.macros.get(id)?.getFlag(MODULE_ID, "abilityId") === ZDOLNOSC)?.[0] ?? NaN);
        try {
          if (lista) await user.unsetFlag(MODULE_ID, FLAG_REMOVED);
          await queueHotbarSync(pc, { user });
          const s1 = pole();
          expect(Number.isFinite(s1), "makro na pasku po synchronizacji").to.equal(true);
          // Przeniesienie na wolne pole — nie usunięcie.
          const wolne = [...Array(50).keys()].map(i => i + 1).find(i => !user.hotbar?.[i]);
          await user.assignHotbarMacro(game.macros.get(user.hotbar[s1]), wolne, { fromSlot: s1 });
          expect(user.getFlag(MODULE_ID, FLAG_REMOVED) ?? [], "przeniesienie").to.not.include(ZDOLNOSC);
          // Zdjęcie z paska — na listę; synchronizacja go nie odtwarza.
          await user.assignHotbarMacro(null, pole());
          await waitFor(() => (user.getFlag(MODULE_ID, FLAG_REMOVED) ?? []).includes(ZDOLNOSC), { label: "zdolność na liście usuniętych" });
          await queueHotbarSync(pc, { user });
          expect(Number.isFinite(pole()), "nie wraca samo").to.equal(false);
          // Przywrócenie jawne: wraca, lista pusta.
          const w = await restoreHotbar(pc, user);
          expect(Number.isFinite(pole()), "przywrócone").to.equal(true);
          expect(w.added.length).to.be.at.least(1);
          expect(user.getFlag(MODULE_ID, FLAG_REMOVED) ?? []).to.not.include(ZDOLNOSC);
        } finally {
          const p = pole();
          const macroId = Number.isFinite(p) ? user.hotbar[p] : null;
          for (const [slot, id] of Object.entries(user.hotbar ?? {})) {
            if (id && !(slot in przed)) await user.update({ [`hotbar.${slot}`]: _del });
          }
          const m = macroId ? game.macros.get(macroId) : null;
          if (m) await m.delete();
          // Sprzątanie też jest „usunięciem” — zapis listy idzie w tle; przywróć ją dopiero po nim.
          await new Promise(res => setTimeout(res, 300));
          if (lista) await user.setFlag(MODULE_ID, FLAG_REMOVED, lista);
          else if (user.getFlag(MODULE_ID, FLAG_REMOVED)) await user.unsetFlag(MODULE_ID, FLAG_REMOVED);
        }
      });
    });
  });
}
