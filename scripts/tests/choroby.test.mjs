/**
 * Neuroshima 5e — choroby: drabina stopni i jej niezmienniki.
 *
 * `disease-effects.mjs` deklaruje w nagłówku regułę, na której cały ten podsystem stoi:
 * **stopień nigdy nie jest łagodniejszy od niższego**. Bierze się to stąd, że naraz żyje
 * tylko jeden Active Effect na chorobę, więc każdy stopień musi podawać sumę, a nie
 * przyrost. Tekst z podręcznika tak nie działa — opisuje nowy objaw i milczy o starych.
 *
 * Ta reguła była już siedem razy złamana i za każdym razem wyszło to dopiero przy ręcznym
 * audycie: stopień „gorszy" leczył ból pleców, bo nikt nie przepisał zmiany z niższego.
 * Awaria jest cicha — postać po prostu dostaje za mało kar. To jest dokładnie ten rodzaj
 * błędu, dla którego pisze się testy.
 *
 * Ważne, czego tu NIE sprawdzamy: `conditional`. Sytuacyjne kary bywają wymieniane między
 * stopniami (Syndrom Draculi zamienia karę do Percepcji na obrażenia od światła) i nie da
 * się ich porównywać co do siły. Pilnujemy tylko, żeby nie zniknęły bez śladu.
 */

import { DISEASE_EFFECTS } from "../config/disease-effects.mjs";
import { ALL_DISEASES, CHRONIC_DISEASES, DISEASE_STAGES, diseaseStages, hasStageLadder } from "../config/diseases-data.mjs";
import { CHEMIA, chemiaForDisease } from "../config/chemia-data.mjs";
import { MODULE_ID } from "./helpers.mjs";

const ADD = 2;
const MULTIPLY = 1;
const OVERRIDE = 5;
const SPEED_KEY = "system.attributes.movement.walk";

/** Ranga kary do Szybkości: brak < połowa < zero. */
function speedRank(changes = []) {
  const speed = changes.filter(change => change.key === SPEED_KEY);
  if (speed.some(change => change.mode === OVERRIDE && Number(change.value) === 0)) return 2;
  if (speed.some(change => change.mode === MULTIPLY && Number(change.value) < 1)) return 1;
  return 0;
}

/** Ranga kary do Testów Ataku: brak < jedna Cecha < wszystkie. */
function attackRank(spec) {
  if (!spec?.attack) return 0;
  return spec.attack === "all" ? 2 : 1;
}

/** Ujemne modyfikatory trybu rzutu, jako mapa klucz → wartość (najniższa wygrywa). */
function penalties(changes = []) {
  const out = new Map();
  for (const change of changes) {
    if (change.mode !== ADD || !change.key.endsWith(".roll.mode")) continue;
    const value = Number(change.value);
    if (value >= 0) continue;
    out.set(change.key, Math.min(out.get(change.key) ?? 0, value));
  }
  return out;
}

/** Cechy, których wartość stopień nadpisuje w dół — zastępuje to karę do rzutów tej Cechy. */
function overriddenAbilities(changes = []) {
  const out = new Set();
  for (const change of changes) {
    const match = /^system\.abilities\.(\w+)\.value$/.exec(change.key);
    if (match && change.mode === OVERRIDE) out.add(match[1]);
  }
  return out;
}

/**
 * Czy `next` nadal wymusza karę `key` z niższego stopnia.
 *
 * Kara do umiejętności jest pokryta także przez karę do jej Cechy — dnd5e składa
 * `abilities.X.check.roll.mode` z `skills.Y.roll.mode` przy każdym rzucie umiejętnością.
 * Nadpisanie wartości Cechy w dół (Syndrom Thurmana: INT → 6) też się liczy: to jest
 * zamiana Utrudnienia na trwałą stratę modyfikatora, nie zdjęcie kary.
 */
function isCovered(key, value, nextPenalties, nextOverrides) {
  if ((nextPenalties.get(key) ?? 0) <= value) return true;

  const ability = /^system\.abilities\.(\w+)\./.exec(key)?.[1];
  if (ability && nextOverrides.has(ability)) return true;

  const skill = /^system\.skills\.(\w+)\.roll\.mode$/.exec(key)?.[1];
  if (skill) {
    const owner = CONFIG.DND5E.skills[skill]?.ability;
    if (owner && (nextPenalties.get(`system.abilities.${owner}.check.roll.mode`) ?? 0) <= value) return true;
    if (owner && nextOverrides.has(owner)) return true;
  }
  return false;
}

export function registerDiseaseTests(quench) {
  quench.registerBatch(`${MODULE_ID}.choroby`, context => {
    const { describe, it, expect } = context;

    const ladders = Object.entries(DISEASE_EFFECTS)
      .map(([key, stages]) => [key, Object.keys(stages).map(Number).sort((a, b) => a - b)])
      .filter(([, stages]) => stages.length > 1);

    /* ---------------------------------------------------------------- */

    describe("Niezmiennik drabiny — stopień nie bywa łagodniejszy", function () {
      it("kary do rzutów przechodzą na wyższy stopień", function () {
        const broken = [];
        for (const [disease, stages] of ladders) {
          for (let i = 1; i < stages.length; i++) {
            const lower = DISEASE_EFFECTS[disease][stages[i - 1]];
            const higher = DISEASE_EFFECTS[disease][stages[i]];
            const nextPenalties = penalties(higher.changes);
            const nextOverrides = overriddenAbilities(higher.changes);
            for (const [key, value] of penalties(lower.changes)) {
              if (!isCovered(key, value, nextPenalties, nextOverrides)) {
                broken.push(`${disease} ${stages[i - 1]}→${stages[i]}: gubi ${key} (${value})`);
              }
            }
          }
        }
        expect(broken, broken.join("; ")).to.be.empty;
      });

      it("kara do Szybkości nie maleje", function () {
        for (const [disease, stages] of ladders) {
          for (let i = 1; i < stages.length; i++) {
            const lower = speedRank(DISEASE_EFFECTS[disease][stages[i - 1]].changes);
            const higher = speedRank(DISEASE_EFFECTS[disease][stages[i]].changes);
            expect(higher, `${disease} ${stages[i - 1]}→${stages[i]}`).to.be.at.least(lower);
          }
        }
      });

      it("kara do Testów Ataku nie maleje ani nie zmienia Cechy", function () {
        for (const [disease, stages] of ladders) {
          for (let i = 1; i < stages.length; i++) {
            const lower = DISEASE_EFFECTS[disease][stages[i - 1]];
            const higher = DISEASE_EFFECTS[disease][stages[i]];
            const label = `${disease} ${stages[i - 1]}→${stages[i]}`;
            expect(attackRank(higher), label).to.be.at.least(attackRank(lower));
            if (lower.attack && lower.attack !== "all" && higher.attack !== "all") {
              expect(higher.attack, `${label}: kara przeniosła się na inną Cechę`).to.equal(lower.attack);
            }
          }
        }
      });

      it("nadane stany utrzymują się na wyższych stopniach", function () {
        for (const [disease, stages] of ladders) {
          for (let i = 1; i < stages.length; i++) {
            const lower = DISEASE_EFFECTS[disease][stages[i - 1]].statuses ?? [];
            const higher = DISEASE_EFFECTS[disease][stages[i]].statuses ?? [];
            for (const status of lower) {
              expect(higher, `${disease} ${stages[i - 1]}→${stages[i]}: gubi stan "${status}"`).to.include(status);
            }
          }
        }
      });

      it("mnożnik obrażeń od upadku i szansa na szał nie maleją", function () {
        for (const [disease, stages] of ladders) {
          for (let i = 1; i < stages.length; i++) {
            const lower = DISEASE_EFFECTS[disease][stages[i - 1]];
            const higher = DISEASE_EFFECTS[disease][stages[i]];
            const label = `${disease} ${stages[i - 1]}→${stages[i]}`;
            expect(higher.fallMultiplier ?? lower.fallMultiplier ?? 0, `${label}: upadek`)
              .to.be.at.least(lower.fallMultiplier ?? 0);
            if (lower.rage) {
              expect(higher.rage?.chance ?? 0, `${label}: szał`).to.be.at.least(lower.rage.chance);
            }
          }
        }
      });

      it("sytuacyjna kara nie znika — albo zostaje, albo staje się bezwarunkowa", function () {
        for (const [disease, stages] of ladders) {
          for (let i = 1; i < stages.length; i++) {
            const lower = DISEASE_EFFECTS[disease][stages[i - 1]];
            const higher = DISEASE_EFFECTS[disease][stages[i]];
            if (!lower.conditional || higher.conditional) continue;
            const label = `${disease} ${stages[i - 1]}→${stages[i]}`;
            const nextPenalties = penalties(higher.changes);
            const nextOverrides = overriddenAbilities(higher.changes);
            for (const [key, value] of penalties(lower.conditional.changes)) {
              expect(isCovered(key, value, nextPenalties, nextOverrides),
                `${label}: zdjęto warunek, a kara ${key} nie stała się bezwarunkowa`).to.be.true;
            }
            if (lower.conditional.attack) {
              expect(attackRank(higher), `${label}: kara do ataku zniknęła razem z warunkiem`)
                .to.be.at.least(lower.conditional.attack === "all" ? 2 : 1);
            }
          }
        }
      });
    });

    /* ---------------------------------------------------------------- */

    describe("Efekty a dane chorób", function () {
      it("każda choroba z efektami istnieje w tabeli chorób", function () {
        for (const key of Object.keys(DISEASE_EFFECTS)) {
          expect(ALL_DISEASES, key).to.have.property(key);
        }
      });

      it("żaden efekt nie opisuje stopnia, którego choroba nie ma", function () {
        for (const [key, stages] of Object.entries(DISEASE_EFFECTS)) {
          const count = diseaseStages(ALL_DISEASES[key]).length;
          for (const stage of Object.keys(stages).map(Number)) {
            expect(stage, `${key}: stopień ${stage} przy ${count} opisanych`).to.be.below(count);
          }
        }
      });

      it("choroby przewlekłe mają albo pełną drabinę, albo jeden stan ogólny", function () {
        for (const [key, entry] of Object.entries(CHRONIC_DISEASES)) {
          const count = entry.stages.length;
          expect([1, DISEASE_STAGES.length], `${key}: ${count} stopni`).to.include(count);
          expect(hasStageLadder(entry), `${key}: hasStageLadder`).to.equal(count > 1);
        }
      });

      it("numery na tabeli k8 są unikalne i mieszczą się w zakresie", function () {
        const rolls = Object.values(CHRONIC_DISEASES).map(entry => entry.roll);
        expect(new Set(rolls).size, "powtórzone wyniki k8").to.equal(rolls.length);
        for (const roll of rolls) expect(roll).to.be.within(1, 8);
      });

      it("statusy nadawane przez choroby są zarejestrowanymi stanami", function () {
        for (const [key, stages] of Object.entries(DISEASE_EFFECTS)) {
          for (const spec of Object.values(stages)) {
            for (const status of spec.statuses ?? []) {
              expect(CONFIG.DND5E.conditionTypes, `${key} → ${status}`).to.have.property(status);
            }
          }
        }
      });

      it("obrażenia okresowe mają poprawną formułę i znany typ", function () {
        for (const [key, stages] of Object.entries(DISEASE_EFFECTS)) {
          for (const spec of Object.values(stages)) {
            const tick = spec.tick ?? spec.conditional?.tick;
            if (!tick) continue;
            expect(Roll.validate(tick.formula), `${key}: "${tick.formula}"`).to.be.true;
            expect(CONFIG.DND5E.damageTypes, `${key} → ${tick.type}`).to.have.property(tick.type);
          }
        }
      });

      it("klucze umiejętności i Cech w zmianach istnieją w CONFIG", function () {
        for (const [key, stages] of Object.entries(DISEASE_EFFECTS)) {
          const all = Object.values(stages).flatMap(spec => [
            ...(spec.changes ?? []), ...(spec.conditional?.changes ?? [])
          ]);
          for (const change of all) {
            const skill = /^system\.skills\.(\w+)\./.exec(change.key)?.[1];
            if (skill) expect(CONFIG.DND5E.skills, `${key} → skills.${skill}`).to.have.property(skill);
            const ability = /^system\.abilities\.(\w+)\./.exec(change.key)?.[1];
            if (ability) expect(CONFIG.DND5E.abilities, `${key} → abilities.${ability}`).to.have.property(ability);
          }
        }
      });
    });

    /* ---------------------------------------------------------------- */

    describe("Lekarstwa", function () {
      it("każda choroba przewlekła ma lek, który ją leczy", function () {
        for (const key of Object.keys(CHRONIC_DISEASES)) {
          expect(chemiaForDisease(key), `brak leku na ${key}`).to.not.be.empty;
        }
      });

      it("`treats` nie wskazuje na nieistniejącą chorobę", function () {
        for (const [key, def] of Object.entries(CHEMIA)) {
          for (const disease of def.treats ?? []) {
            expect(ALL_DISEASES, `${key} leczy nieistniejące "${disease}"`).to.have.property(disease);
          }
        }
      });

      it("nazwa leku z karty choroby zgadza się z nazwą w tabeli chemii", function () {
        const names = new Set(Object.values(CHEMIA).map(def => def.label ?? def.name));
        for (const [key, entry] of Object.entries(CHRONIC_DISEASES)) {
          expect(names.has(entry.medicine), `${key}: "${entry.medicine}" nie występuje w CHEMIA`).to.be.true;
        }
      });
    });
  }, { displayName: "Neuroshima: Choroby — drabina stopni" });
}
