/**
 * Neuroshima 5e — Trudność Trafienia i reakcje obronne: czyste zasady (PLAN_tt.md E0).
 *
 * Warstwa 1 (tabele): unikalne `id`, każda pozycja ze stroną podręcznika, każdy klucz zdolności
 * rozwiązuje się w moście (`actors/abilities.mjs`) i ma deklarację w danych.
 * Warstwa 4 (predykaty): `computeTT` dla każdej pozycji §1.1–1.3 i rozstrzygnięć D1–D5,
 * `resolveHit` (naturalna 1/20, osłona, premie), `reactionState` — każdy powód wyszarzenia.
 *
 * Bez dokumentów — paczka nie dotyka świata.
 */

import { TT_METHODS, TT_CAPS, TT_BONUSES, TT_ABILITY_KEYS, computeTT, permanentlyLosingMethods, armorDexPart }
  from "../config/tt-rules.mjs";
import { DEFENSE_REACTIONS, resolveHit, creatureKindOf, bonusMax, reactionState, hasPendingReaction, npcReactionRow }
  from "../config/defense-rules.mjs";
import { ABILITY_DEFINITIONS, hasAbility } from "../actors/abilities.mjs";
import { CLASS_FEATURES } from "../config/class-features-data.mjs";
import { SZTUCZKI } from "../config/sztuczki-data.mjs";
import { MODULE_ID } from "./helpers.mjs";

/** Migawka TT: przeciętna postać bez niczego; nadpisania płytko na każdym poziomie. */
function snap(o = {}) {
  return {
    mods: { str: 0, dex: 2, con: 3, int: 0, wis: 0, cha: 1, ...(o.mods ?? {}) },
    prof: o.prof ?? 2,
    armor: o.armor ?? null,
    helmet: !!o.helmet,
    shieldInHand: !!o.shieldInHand,
    guards: !!o.guards,
    owned: new Set(o.owned ?? []),
    states: { berserk: false, dodging: false, incapacitated: false, speed0: false, ...(o.states ?? {}) },
    held: { zaslona: false, twoHatchets: false, ...(o.held ?? {}) }
  };
}

const LIGHT = { name: "Kurtka ćwiekowana", type: "light", value: 11, dexCap: null };
const MEDIUM = { name: "Plate carrier typ III", type: "medium", value: 14, dexCap: 2 };
const POOR = { name: "Kiepska zbroja śmieciowa", type: "medium", value: 14, dexCap: 1 };
const HEAVY = { name: "Ciężka zbroja śmieciowa", type: "heavy", value: 16, dexCap: null };

const ids = list => list.map(r => r.id);
const rejectedIds = tt => tt.rejected.map(r => r.id);

/** Snapshot celu dla reakcji. */
function target(o = {}) {
  return {
    owned: new Set(o.owned ?? []),
    mods: { int: 4, ...(o.mods ?? {}) },
    prof: o.prof ?? 3,
    charges: o.charges ?? {},
    dice: o.dice ?? {},
    helmet: !!o.helmet,
    shield: o.shield ?? null
  };
}

/** Kontekst ataku z `resolveHit`, jak go buduje `combat/obrona.mjs`. */
function attack({ total = 17, natural = 12, tt = 15, melee = false, kind = null, used = [], gm = true,
  critDowngraded = false, decided = false } = {}) {
  const hit = resolveHit({ total, critical: natural === 20, fumble: natural === 1, tt, critDowngraded });
  return { total, natural, ...hit, melee, attackerKind: kind, used, critDowngraded, gmActive: gm, decided };
}

const row = id => DEFENSE_REACTIONS.find(r => r.id === id);

export function registerTTTests(quench) {
  quench.registerBatch(`${MODULE_ID}.tt-zasady`, context => {
    const { describe, it, expect } = context;

    /* ---------------- Warstwa 1 ---------------- */

    describe("Tabele", function () {
      it("id są unikalne w obrębie silnika TT i katalogu reakcji", function () {
        const tt = ids([...TT_METHODS, ...TT_CAPS, ...TT_BONUSES]);
        expect(new Set(tt).size, tt.join(", ")).to.equal(tt.length);
        const re = ids(DEFENSE_REACTIONS);
        expect(new Set(re).size, re.join(", ")).to.equal(re.length);
      });

      it("każda pozycja ma stronę podręcznika", function () {
        for (const r of [...TT_METHODS, ...TT_CAPS, ...TT_BONUSES, ...DEFENSE_REACTIONS]) {
          expect(r.page, r.id).to.match(/^s\. \d/);
        }
      });

      it("każdy klucz zdolności rozwiązuje się w moście i ma deklarację w danych", function () {
        const keys = new Set([...TT_ABILITY_KEYS, ...DEFENSE_REACTIONS.map(r => r.ability).filter(Boolean)]);
        const declared = new Set([
          ...Object.values(CLASS_FEATURES).map(f => f.legacyAbilityKey).filter(Boolean),
          ...Object.values(SZTUCZKI).flatMap(s => s.legacyAbilityKeys ?? [])
        ]);
        for (const key of keys) {
          expect(ABILITY_DEFINITIONS[key], `${key} w ABILITY_DEFINITIONS`).to.exist;
          expect(declared.has(key), `${key}: legacyAbilityKey(s) w danych`).to.equal(true);
        }
      });

      it("dopasowanie po nazwie nie łapie przedmiotów z żywego świata o podobnych nazwach", function () {
        const named = (...names) => ({ items: names.map(name => ({ name, getFlag: () => undefined })) });
        expect(hasAbility(named("Neodrugs"), "neo"), "Neodrugs ≠ Neo").to.equal(false);
        expect(hasAbility(named("Neo"), "neo")).to.equal(true);
        expect(hasAbility(named("Kamizelka Kuloodporna ☩"), "kuloodpornosc"), "kamizelka ≠ Sztuczka").to.equal(false);
        expect(hasAbility(named("Kuloodporność"), "kuloodpornosc")).to.equal(true);
      });
    });

    /* ---------------- Warstwa 4: metody ---------------- */

    describe("Metody — konkurują, wygrywa najwyższa", function () {
      it("bez pancerza: 10 + ZRC", function () {
        const tt = computeTT(snap());
        expect(tt.method.id).to.equal("bezPancerza");
        expect(tt.total).to.equal(12);
      });

      it("pancerz lekki — ZRC w całości; średni — do limitu; ciężki — wcale", function () {
        const dex = { mods: { dex: 3 } };
        expect(computeTT(snap({ ...dex, armor: LIGHT })).total).to.equal(14);
        expect(computeTT(snap({ ...dex, armor: MEDIUM })).total).to.equal(16);
        expect(computeTT(snap({ ...dex, armor: HEAVY })).total).to.equal(16);
      });

      it("pancerz uszkodzony: wartość już zbita, w dymku powód", function () {
        const tt = computeTT(snap({ armor: { ...LIGHT, value: 10, lost: 1 } }));
        expect(tt.method.parts[0].value).to.equal(10);
        expect(tt.method.parts[0].note).to.equal("−1 uszkodzenie");
      });

      it("Goła klata: 10 + ZRC + KON bez pancerza, hełmu i tarczy", function () {
        const tt = computeTT(snap({ owned: ["golaKlata"] }));
        expect(tt.method.id).to.equal("golaKlata");
        expect(tt.total).to.equal(15);
      });

      it("hełm gasi Gołą klatę, nie Tarczę wiary (D4)", function () {
        const tt = computeTT(snap({ owned: ["golaKlata", "tarczaWiary"], helmet: true }));
        expect(tt.method.id).to.equal("tarczaWiary");
        expect(tt.total).to.equal(13);
        const gola = tt.rejected.find(r => r.id === "golaKlata");
        expect(gola?.reason).to.equal("nosisz hełm");
        expect(gola?.value).to.equal(15);
      });

      it("tarcza w ręce gasi Gołą klatę; pancerz gasi obie", function () {
        expect(computeTT(snap({ owned: ["golaKlata"], shieldInHand: true })).method.id).to.equal("bezPancerza");
        const tt = computeTT(snap({ owned: ["golaKlata", "tarczaWiary"], armor: LIGHT }));
        expect(tt.method.id).to.equal("pancerz");
        expect(tt.rejected.map(r => r.reason)).to.deep.equal(["nosisz pancerz", "nosisz pancerz"]);
      });

      it("Goła klata vs Tarcza wiary: wygrywa wyższa, przegrana z powodem s. 59", function () {
        const tt = computeTT(snap({ owned: ["golaKlata", "tarczaWiary"] }));
        expect(tt.method.id).to.equal("golaKlata");
        expect(tt.rejected.find(r => r.id === "tarczaWiary")?.reason).to.equal("słabsza od Gołej klaty (s. 59)");
      });

      it("remis zostaje przy wcześniejszym wierszu tabeli", function () {
        const tt = computeTT(snap({ owned: ["golaKlata"], mods: { con: 0 } }));
        expect(tt.method.id).to.equal("bezPancerza");
        expect(tt.rejected.find(r => r.id === "golaKlata")?.reason).to.equal("nie mocniejsza od podstawowej TT (s. 59)");
      });

      it("nieposiadanych źródeł nie listujemy", function () {
        const tt = computeTT(snap({ armor: LIGHT }));
        expect(tt.rejected).to.deep.equal([]);
      });

      it("wyszarzenie na karcie tylko dla metody przegrywającej niezależnie od ekwipunku (P10)", function () {
        expect(permanentlyLosingMethods(snap({ owned: ["golaKlata", "tarczaWiary"], mods: { con: 1, cha: 3 } })))
          .to.deep.equal(["golaKlata"]);
        expect(permanentlyLosingMethods(snap({ owned: ["golaKlata", "tarczaWiary"], mods: { con: 3, cha: 1 } })))
          .to.deep.equal([]);
        expect(permanentlyLosingMethods(snap({ owned: ["golaKlata"], mods: { con: 1, cha: 3 } }))).to.deep.equal([]);
      });
    });

    /* ---------------- Warstwa 4: limit ---------------- */

    describe("Trening w zbroi (D5)", function () {
      const tr = (armor, dex) => computeTT(snap({ owned: ["treningWZbroi"], armor, mods: { dex } }));

      it("średni 2 → 3, kiepska zbroja 1 → 2, ciężki 0 → 1", function () {
        expect(tr(MEDIUM, 4).total).to.equal(17);
        expect(tr(POOR, 4).total).to.equal(16);
        expect(tr(HEAVY, 4).total).to.equal(17);
        expect(tr(HEAVY, 4).caps.map(c => [c.id, c.value])).to.deep.equal([["treningWZbroi", 1]]);
      });

      it("ciężki z ZRC −1 = 0 — Trening nie dokłada kary", function () {
        expect(tr(HEAVY, -1).total).to.equal(16);
        expect(armorDexPart(HEAVY, -1, 1).value).to.equal(0);
      });

      it("bez wpływu — w dymku z powodem; bez pancerza — „nie nosisz pancerza”", function () {
        expect(tr(LIGHT, 4).rejected[0]?.reason).to.equal("ten pancerz nie ogranicza ZRC");
        expect(tr(MEDIUM, 1).rejected[0]?.reason).to.match(/mieści się w limicie 2/);
        expect(tr(null, 4).rejected[0]?.reason).to.equal("nie nosisz pancerza");
        const guards = computeTT(snap({ owned: ["treningWZbroi"], guards: true, mods: { dex: 4 } }));
        expect(guards.rejected[0]?.reason).to.equal("ochraniacze nie ograniczają ZRC");
      });
    });

    /* ---------------- Warstwa 4: premie ---------------- */

    describe("Premie — sumują się z wygraną metodą (D1)", function () {
      it("Tarcza wiary + Obłęd + Kuloodporność", function () {
        const tt = computeTT(snap({
          owned: ["tarczaWiary", "berserk", "kuloodpornosc"], mods: { str: 3 }, states: { berserk: true }
        }));
        expect(tt.method.id).to.equal("tarczaWiary");
        expect(ids(tt.bonuses)).to.deep.equal(["obled", "kuloodpornosc"]);
        expect(tt.total).to.equal(13 + 3 + 2);
      });

      it("Obłęd kumuluje się z Gołą klatą (D2); poza Berserkiem i w hełmie nie działa", function () {
        const base = { owned: ["golaKlata", "berserk"], mods: { str: 2 } };
        expect(computeTT(snap({ ...base, states: { berserk: true } })).total).to.equal(17);
        expect(computeTT(snap(base)).rejected.find(r => r.id === "obled")?.reason).to.equal("nie jesteś w Berserku");
        const helm = computeTT(snap({ ...base, helmet: true, states: { berserk: true } }));
        expect(helm.rejected.find(r => r.id === "obled")?.reason).to.equal("nosisz hełm");
      });

      it("Obłęd przy ujemnej SIŁ daje 0, nie karę", function () {
        const tt = computeTT(snap({ owned: ["berserk"], mods: { str: -1 }, states: { berserk: true } }));
        expect(tt.bonuses.find(b => b.id === "obled")?.value).to.equal(0);
      });

      it("Obsługa pancerza: +2 tylko w pancerzu, raz (P5)", function () {
        const on = computeTT(snap({ owned: ["obslugaPancerza"], armor: LIGHT }));
        expect(on.bonuses.filter(b => b.id === "obslugaPancerza").map(b => b.value)).to.deep.equal([2]);
        const off = computeTT(snap({ owned: ["obslugaPancerza"] }));
        expect(off.rejected.find(r => r.id === "obslugaPancerza")?.reason).to.equal("nie nosisz pancerza");
      });

      it("Kuloodporność: + PB; hełm ją gasi", function () {
        expect(computeTT(snap({ owned: ["kuloodpornosc"], prof: 3 })).total).to.equal(15);
        const helm = computeTT(snap({ owned: ["kuloodpornosc"], helmet: true }));
        expect(helm.rejected.find(r => r.id === "kuloodpornosc")?.reason).to.equal("nosisz hełm");
      });

      it("Zasłona i Tańczący z siekierkami: +1, gdy broń w ręku", function () {
        expect(computeTT(snap({ owned: ["samuraj"], held: { zaslona: true } })).total).to.equal(13);
        expect(computeTT(snap({ owned: ["samuraj"] })).rejected[0]?.id).to.equal("zaslona");
        expect(computeTT(snap({ owned: ["siekierezada"], held: { twoHatchets: true } })).total).to.equal(13);
      });

      it("Roszada: +3 przy Unikaniu; gaśnie przy Obezwładnieniu i Szybkości 0 (P4)", function () {
        const sz = states => computeTT(snap({ owned: ["szachista"], states }));
        expect(sz({ dodging: true }).total).to.equal(15);
        expect(sz({}).rejected[0]?.reason).to.equal("nie Unikasz");
        expect(sz({ dodging: true, incapacitated: true }).rejected[0]?.reason).to.equal("jesteś Obezwładniony");
        expect(sz({ dodging: true, speed0: true }).rejected[0]?.reason).to.match(/Szybkość/);
      });

      it("ochraniacze to pancerz w warunkach zdolności (D4, autor systemu)", function () {
        const all = ["golaKlata", "tarczaWiary", "berserk", "kuloodpornosc", "obslugaPancerza"];
        const tt = computeTT(snap({ owned: all, guards: true, mods: { str: 2 }, states: { berserk: true } }));
        const reason = id => tt.rejected.find(r => r.id === id)?.reason;
        for (const id of ["golaKlata", "tarczaWiary", "obled", "kuloodpornosc"]) {
          expect(reason(id), id).to.equal("nosisz ochraniacze (to też pancerz)");
        }
        // Metoda podstawowa zostaje — ochraniacze dokłada dnd5e z Efektu Aktywnego (P3).
        expect(tt.method.id).to.equal("bezPancerza");
        expect(tt.bonuses.map(b => [b.id, b.value])).to.deep.equal([["obslugaPancerza", 2]]);
      });

      it("hełm gasi tylko to, co go wymienia — Tarcza wiary w hełmie działa", function () {
        const tt = computeTT(snap({ owned: ["tarczaWiary", "obslugaPancerza"], helmet: true }));
        expect(tt.method.id).to.equal("tarczaWiary");
        expect(tt.rejected.find(r => r.id === "obslugaPancerza")?.reason, "hełm to nie pancerz").to.equal("nie nosisz pancerza");
      });

      it("ochraniacze nie należą do silnika — liczy je dnd5e z Efektu Aktywnego (P3)", function () {
        expect(ids(TT_BONUSES)).to.not.include.members(["ochraniacze", "ochraniaczeRak", "ochraniaczeNog"]);
      });
    });

    /* ---------------- Warstwa 4: rozstrzygacz ---------------- */

    describe("resolveHit", function () {
      it("naturalna 20 trafia zawsze, naturalna 1 nigdy", function () {
        expect(resolveHit({ total: 3, critical: true, tt: 30 })).to.include({ verdict: "krytyk", autoHit: true });
        expect(resolveHit({ total: 40, fumble: true, tt: 10 }).verdict).to.equal("pudło");
      });

      it("Test Ataku ≥ TT trafia; `need` = o ile musi wzrosnąć TT", function () {
        expect(resolveHit({ total: 15, tt: 15 })).to.include({ verdict: "trafienie", need: 1 });
        expect(resolveHit({ total: 17, tt: 15 })).to.include({ verdict: "trafienie", need: 3 });
        expect(resolveHit({ total: 14, tt: 15 })).to.include({ verdict: "pudło", need: 0 });
      });

      it("osłona i premie z reakcji podnoszą próg; pełna osłona wyklucza atak", function () {
        expect(resolveHit({ total: 16, tt: 15, cover: 2 }).verdict).to.equal("pudło");
        expect(resolveHit({ total: 17, tt: 15, bonuses: 4 }).verdict).to.equal("pudło");
        expect(resolveHit({ total: 30, critical: true, tt: 15, cover: 999 })).to.include({ verdict: "pudło", blocked: true });
      });

      it("Krytyczna ochrona: krytyk → zwykłe trafienie, ale nadal nie do odwrócenia", function () {
        expect(resolveHit({ total: 22, critical: true, tt: 15, critDowngraded: true }))
          .to.include({ verdict: "trafienie", autoHit: true });
      });

      it("nieznana TT nie blokuje (dawne zachowanie modułu)", function () {
        expect(resolveHit({ total: 5, tt: null }).verdict).to.equal("trafienie");
      });
    });

    describe("Typ atakującego i kości", function () {
      it("etykiety i wolny tekst świata → kategoria Bestiariusza (P7)", function () {
        const cases = { "Potwór": "potwor", "Maszyna (Molocha)": "maszyna", "maszyna Molocha": "maszyna",
          "(człowiek)": "czlowiek", "humanoid": "czlowiek", "beast": "zwierze", "Mutant": "mutant",
          "Rój Szczurów": "rojZwierzat", "": null };
        for (const [raw, kind] of Object.entries(cases)) expect(creatureKindOf(raw), raw).to.equal(kind);
        expect(creatureKindOf(null)).to.equal(null);
      });

      it("najwyższy wynik premii", function () {
        expect(bonusMax(5)).to.equal(5);
        expect(bonusMax("1d4")).to.equal(4);
        expect(bonusMax("2k6+1")).to.equal(13);
        expect(bonusMax("@scale.zlodziej.kocieKosci")).to.equal(Infinity);
      });
    });

    /* ---------------- Warstwa 4: stany przycisków ---------------- */

    describe("reactionState — stany i powody (D11)", function () {
      it("reakcji nieposiadanej nie pokazujemy", function () {
        expect(reactionState(row("bulletTime"), target(), attack()).state).to.equal("hidden");
      });

      it("na ten atak: aktywna, gdy maks. premia odwraca trafienie", function () {
        const st = reactionState(row("bulletTime"), target({ owned: ["neo"] }), attack({ total: 19, tt: 15 }));
        expect(st).to.include({ state: "active", maxBonus: 5, canChange: true });
      });

      it("na ten atak: „za wysoki rzut”, „naturalna 20”, „atak już chybił”", function () {
        const neo = target({ owned: ["neo"] });
        expect(reactionState(row("bulletTime"), neo, attack({ total: 21, tt: 15 })).reason)
          .to.equal("za wysoki rzut (21 vs maks. TT 20)");
        expect(reactionState(row("bulletTime"), neo, attack({ total: 25, natural: 20 })).reason)
          .to.equal("naturalna 20 — trafia zawsze");
        expect(reactionState(row("bulletTime"), neo, attack({ total: 10 })).reason).to.equal("atak już chybił");
      });

      it("Parowanie i Parowanie tarczą tylko przeciw atakom wręcz; tarcza: ręka, biegłość, SIŁA (P6)", function () {
        expect(reactionState(row("parowanie"), target({ owned: ["mistrzWalkiWrecz"] }), attack()).reason)
          .to.equal("atak nie wręcz");
        const shield = o => target({ shield: { inHand: true, proficient: true, strOk: true, strReq: 13, ...o } });
        const melee = attack({ melee: true });
        expect(reactionState(row("parowanieTarcza"), shield({}), melee).state).to.equal("active");
        expect(reactionState(row("parowanieTarcza"), shield({ inHand: false }), melee).reason).to.equal("tarcza nie w ręce");
        expect(reactionState(row("parowanieTarcza"), shield({ proficient: false }), melee).reason)
          .to.equal("brak biegłości w tarczach");
        expect(reactionState(row("parowanieTarcza"), shield({ strOk: false }), melee).reason)
          .to.equal("za mała SIŁA (wymagana 13)");
      });

      it("Unik łowcy: mutant i potwór — tak, człowiek — nie, nieznany — aktywny z dopiskiem (P7)", function () {
        const alan = target({ owned: ["mutantNaSniadanie"] });
        expect(reactionState(row("unikLowcy"), alan, attack({ kind: "mutant" })).state).to.equal("active");
        expect(reactionState(row("unikLowcy"), alan, attack({ kind: "czlowiek" })).reason).to.match(/człowiek/);
        expect(reactionState(row("unikLowcy"), alan, attack()).note).to.equal("typ atakującego nieznany");
        expect(reactionState(row("empiryk"), target({ owned: ["empiryk"] }), attack({ kind: "maszyna" })).state)
          .to.equal("active");
      });

      it("trwała: aktywna zawsze, gdy są ładunki — także przy naturalnej 20; bez ładunków — „brak użyć”", function () {
        const io = c => target({ owned: ["inteligentnaObrona"], charges: { inteligentnaObrona: c } });
        const crit = reactionState(row("inteligentnaObrona"), io(2), attack({ total: 25, natural: 20 }));
        expect(crit).to.include({ state: "active", canChange: false });
        expect(reactionState(row("inteligentnaObrona"), io(0), attack()).reason).to.equal("brak użyć");
      });

      it("bez aktywnego MG — „potrzebny MG”", function () {
        expect(reactionState(row("bulletTime"), target({ owned: ["neo"] }), attack({ total: 16, gm: false })).reason)
          .to.equal("potrzebny MG");
      });

      it("Krytyczna ochrona: tylko przy krytyku i hełmie na głowie", function () {
        const helm = target({ helmet: true });
        expect(reactionState(row("krytycznaOchrona"), helm, attack()).state).to.equal("hidden");
        expect(reactionState(row("krytycznaOchrona"), helm, attack({ total: 25, natural: 20 })).state).to.equal("active");
        expect(reactionState(row("krytycznaOchrona"), helm, attack({ total: 25, natural: 20, critDowngraded: true })).state)
          .to.equal("hidden");
      });

      it("użyta reakcja ma stan „used”", function () {
        const st = reactionState(row("bulletTime"), target({ owned: ["neo"] }),
          attack({ used: [{ id: "bulletTime", bonus: 5 }] }));
        expect(st.state).to.equal("used");
      });

      it("reakcja BN z Bestiariusza (Gladiator: Parowanie +3, wręcz)", function () {
        const parry = npcReactionRow({ id: "npc-parowanie", label: "Parowanie", bonus: 3, melee: true });
        expect(reactionState(parry, target(), attack({ melee: true, total: 17, tt: 15 })).state).to.equal("active");
        expect(reactionState(parry, target(), attack({ melee: false })).reason).to.equal("atak nie wręcz");
      });
    });

    describe("Plakietka ⏳ (D10)", function () {
      it("Raynald 17 vs 15 z Inteligentną obroną +4 — czeka; 25 vs 15 — nie; zdecydowane — nie", function () {
        const raynald = target({ owned: ["inteligentnaObrona"], charges: { inteligentnaObrona: 2 } });
        expect(hasPendingReaction(DEFENSE_REACTIONS, raynald, attack({ total: 17, tt: 15 }))).to.equal(true);
        expect(hasPendingReaction(DEFENSE_REACTIONS, raynald, attack({ total: 25, tt: 15 }))).to.equal(false);
        expect(hasPendingReaction(DEFENSE_REACTIONS, raynald, attack({ total: 17, tt: 15, decided: true }))).to.equal(false);
      });

      it("krytyk na celu w hełmie — czeka na Krytyczną ochronę", function () {
        expect(hasPendingReaction(DEFENSE_REACTIONS, target({ helmet: true }), attack({ total: 25, natural: 20 })))
          .to.equal(true);
      });
    });
  }, { displayName: "Neuroshima: TT i reakcje — czyste zasady" });
}
