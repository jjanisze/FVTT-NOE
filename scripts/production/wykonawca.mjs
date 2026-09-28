/**
 * Neuroshima 5e — wykonawca produkcji: kim jest i czym dysponuje (PLAN_produkcja §5.1a, §5.1c).
 *
 * Wszystko, co zależy od postaci, a nie od przepisu: biegłości i zestawy narzędzi pod ręką,
 * profesje Speca, Fabrykator, Przydasie, Ułatwienia z Pochodzeń. Liczone **w chwili pracy**,
 * nie przy starcie Roboty — dlatego Fabrykator zdobyty w trakcie, przejęcie Roboty przez
 * Pirotechnika i dowiezienie zestawu działają od następnej godziny (§5.3).
 *
 * „Pod ręką” = w ekwipunku wykonawcy albo w kontenerze, w którym stoi Robota (pojazd, Miejsce).
 * „W puli” = gdzieś w pojeździe drużyny albo Miejscu — do przeniesienia (🚚), nie do użycia.
 *
 * **Kontekst.** Zakładka ocenia setki przepisów naraz; każdy z nich pytałby o te same 22
 * narzędzia i przeszukiwał pulę od nowa. `kontekstWykonawcy()` liczy to raz i trzyma w pamięci
 * do końca jednego renderu — funkcje poniżej budują go same, gdy nikt go nie podał.
 */

import { hasAbility, ABILITY_KEYS } from "../actors/abilities.mjs";
import { hasToolKit } from "../actors/tool-availability.mjs";
import { pulaAktora } from "./pula.mjs";
import { PROFESJE, profesjeDlaRef } from "../config/recipes-data.mjs";
import { parseToolExpr, evalToolExpr, mandatoryToolKeys, toolExprKeys } from "../config/tool-expr.mjs";
import { isKobaltEnabled } from "../config/settings.mjs";
import { mnoznikCzasu, stWykonawcy, FABRYKATOR_CZAS } from "../config/production-rules.mjs";
import { PROFESJA_KOBALT } from "../wkk/config/production-kobalt.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** Profesje Speca z tabelą schematów, które ma aktor (zdolności z flagą `abilityId`). */
export function profesjeAktora(actor) {
  const out = new Set();
  for (const i of actor?.items ?? []) {
    const id = i.getFlag?.(MODULE_ID, "abilityId");
    if (id && PROFESJE[id]) out.add(id);
  }
  return out;
}

/** Zdolność z flagą `abilityId` (np. „szybka-produkcja”, „pogromca”). */
export function maZdolnosc(actor, abilityId) {
  return (actor?.items ?? []).some(i => i.getFlag?.(MODULE_ID, "abilityId") === abilityId);
}

/** Cechy wykonawcy, które zmieniają produkcję. */
export function cechyWykonawcy(actor) {
  return {
    fabrykator: hasAbility(actor, ABILITY_KEYS.FABRYKATOR),
    przydasie: hasAbility(actor, ABILITY_KEYS.PRZYDASIE),
    nanoTech: hasAbility(actor, ABILITY_KEYS.NANO_TECH),
    jesliMaSilnik: hasAbility(actor, ABILITY_KEYS.JESLI_MA_SILNIK),
    profesje: profesjeAktora(actor)
  };
}

/** Czy aktor jest biegły w danym narzędziu. */
export function bieglyW(actor, key) {
  const t = actor?.system?.tools?.[key];
  return !!(t?.prof?.hasProficiency ?? (Number(t?.value) >= 1));
}

/**
 * Kontekst jednego wykonawcy — cache zestawów, stanów narzędzi i puli.
 * @param {Actor} actor
 * @param {{kontener?: Actor|null}} [o]  gdzie stoi Robota (pojazd, Miejsce)
 */
export function kontekstWykonawcy(actor, { kontener = null } = {}) {
  const kits = new Map();
  const stany = new Map();
  let pula = null;
  const ctx = {
    actor,
    kontener: kontener && kontener !== actor ? kontener : null,
    cechy: cechyWykonawcy(actor),
    get pula() { return (pula ??= pulaAktora(actor)); },
    maZestaw(a, key) {
      const k = `${a.id}:${key}`;
      if (!kits.has(k)) kits.set(k, hasToolKit(a, key));
      return kits.get(k);
    },
    podReka(key) {
      return ctx.maZestaw(actor, key) || (!!ctx.kontener && ctx.maZestaw(ctx.kontener, key));
    },
    /** @returns {{status: "ok"|"pula"|"brak-zestawu"|"brak-bieglosci", bonus: number, gdzie: Actor|null}} */
    stan(key) {
      if (stany.has(key)) return stany.get(key);
      const bonus = Number(actor?.system?.tools?.[key]?.total) || 0;
      let s;
      if (!bieglyW(actor, key)) s = { status: "brak-bieglosci", bonus, gdzie: null };
      else if (ctx.maZestaw(actor, key)) s = { status: "ok", bonus, gdzie: actor };
      else if (ctx.kontener && ctx.maZestaw(ctx.kontener, key)) s = { status: "ok", bonus, gdzie: ctx.kontener };
      else {
        const wPuli = ctx.pula.find(a => a !== ctx.kontener && ctx.maZestaw(a, key));
        s = wPuli ? { status: "pula", bonus, gdzie: wPuli } : { status: "brak-zestawu", bonus, gdzie: null };
      }
      stany.set(key, s);
      return s;
    }
  };
  return ctx;
}

const _ctx = (actor, o = {}) => o.ctx ?? kontekstWykonawcy(actor, { kontener: o.kontener ?? null });

/** Stan jednego narzędzia dla wykonawcy. */
export function stanNarzedzia(actor, key, o = {}) {
  return _ctx(actor, o).stan(key);
}

/** Ocena wymogu narzędzi przepisu (§5.1a) — `evalToolExpr` ze stanem tego wykonawcy. */
export function ocenNarzedzia(actor, przepis, o = {}) {
  const ctx = _ctx(actor, o);
  return evalToolExpr(parseToolExpr(przepis.narzedzia), key => ctx.stan(key));
}

/**
 * Cecha profesji z WKK (D26, D32): przedmiot z listy którejś z profesji wykonawcy.
 * `pelny` — pełny zestaw profesji pod ręką albo zwykły wymóg przedmiotu już go obejmuje
 * („z definicji”, Haker przy laptopie); inaczej `czesc`. Bez WKK i dla przepisów profesji
 * (liczby z tabeli) — null: cecha nie może się dokładać do tabeli, bo byłaby liczona dwa razy.
 * @returns {{profesja: string, poziom: "czesc"|"pelny", brakZestawu: string[]}|null}
 */
export function cechaProfesji(actor, przepis, o = {}) {
  const kobalt = o.kobalt ?? isKobaltEnabled();
  if (!kobalt || przepis.profesja) return null;
  const ctx = _ctx(actor, o);
  const pasuje = profesjeDlaRef(przepis.wynik.ref).filter(p => ctx.cechy.profesje.has(p));
  if (!pasuje.length) return null;
  const obowiazkowe = mandatoryToolKeys(parseToolExpr(przepis.narzedzia));
  let best = null;
  for (const prof of pasuje) {
    const zestaw = [...toolExprKeys(parseToolExpr(PROFESJE[prof].zestaw))];
    const zDefinicji = zestaw.every(k => obowiazkowe.has(k));
    const brakZestawu = zestaw.filter(k => !ctx.podReka(k));
    const pelny = zDefinicji || brakZestawu.length === 0;
    const c = { profesja: prof, poziom: pelny ? "pelny" : "czesc", brakZestawu: pelny ? [] : brakZestawu };
    if (!best || (c.poziom === "pelny" && best.poziom !== "pelny")) best = c;
  }
  return best;
}

/**
 * Mnożnik czasu wykonawcy dla przepisu, z opisem do czatu („4:00 pracy (Fabrykator) → +8:00”).
 * Naprawa nie zna mnożników (D34 — oba źródła mówią o produkowaniu).
 */
export function mnoznikWykonawcy(actor, przepis, o = {}) {
  if (o.naprawa) return { mnoznik: 1, powody: [], cecha: null };
  const kobalt = o.kobalt ?? isKobaltEnabled();
  const ctx = _ctx(actor, o);
  const { fabrykator } = ctx.cechy;
  const cecha = cechaProfesji(actor, przepis, { ...o, ctx, kobalt });
  const mnoznik = mnoznikCzasu({ fabrykator, profesja: cecha?.poziom ?? null, kobalt });
  const powody = [];
  if (fabrykator) powody.push(`Fabrykator ×${String(FABRYKATOR_CZAS).replace(".", ",")}`);
  if (cecha) {
    const m = cecha.poziom === "pelny" ? PROFESJA_KOBALT.pelny : PROFESJA_KOBALT.czesc;
    powody.push(`${PROFESJE[cecha.profesja].label} ×${String(m).replace(".", ",")}`);
  }
  return { mnoznik, powody, cecha };
}

/** ST Testu końcowego: ST ustalone przez MG wygrywa, potem cecha profesji z WKK (bez stopnia 30). */
export function stTestuDla(actor, przepis, o = {}) {
  if (Number.isFinite(o.stMG)) return o.stMG;
  const kobalt = o.kobalt ?? isKobaltEnabled();
  const cecha = cechaProfesji(actor, przepis, { ...o, kobalt });
  return stWykonawcy(przepis.st, { cechaProfesji: !!cecha, kobalt });
}

/** Ułatwienia z Pochodzeń do Testu końcowego (po tagach przepisu). */
export function ulatwieniaZPochodzen(actor, przepis, o = {}) {
  const c = o.ctx?.cechy ?? cechyWykonawcy(actor);
  const out = [];
  if ((przepis.tagi ?? []).includes("elektronika") && c.nanoTech) out.push("Nano-Tech");
  if ((przepis.tagi ?? []).includes("pojazd-mechaniczny") && c.jesliMaSilnik) out.push("Jeśli ma silnik, to ruszy");
  return out;
}
