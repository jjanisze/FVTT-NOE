/**
 * Neuroshima 5e — przeskok narracyjny (PLAN_m5_postoj.md §7.15, D19, U58).
 *
 * Postój dłuższy niż ~2 tygodnie bez doby po dobie: MG wybiera liczbę dób i plan dnia typowego na postać (z ostatniej
 * zatwierdzonej doby albo prosty wybór), widzi podgląd wartości oczekiwanych i zatwierdza **jednym** zapisem na
 * postać. Rzutów dzień po dniu nie ma (D19) — tam, gdzie dzień po dniu by rzucano, podgląd podaje wynik „zwykle” z
 * kalendarzyka (Zranienie) albo zostawia linię dla MG (choroby, braki zapasów).
 *
 * Kolejność (U58 = U27 zagregowana): rachunki → jedzenie i woda (utrzymanie albo N racji z zapasów) → odpoczynek
 * (jeden DO dnd5e: PW, Kości Wytrzymałości, zdolności; Wyczerpanie N razy wg `kolejnoscDO`, pod WKK odsypianie;
 * Stopień Zranienia z kalendarzyka; Trening, Budowa, Roboty) → Zachód słońca raz → konto → zegar +N dób raz →
 * Fuks Bogatego (WKK, D38) → historia → karty. Zegarowe obserwatory (Fuksy ulotne, akumulatory dronów) widzą jeden skok.
 */

import { LOKALIZACJE } from "../config/handel-data.mjs";
import { fmtGb } from "../config/handel-rules.mjs";
import { UTRZYMANIE, SEN_DO_H, SEN_DOMYSLNY_H, PRACA_H, TRENING, pokrycieUtrzymania, przeskok as przeskokZasady } from "../config/postoj-rules.mjs";
import { BOGATY_KOBALT } from "../wkk/config/utrzymanie-kobalt.mjs";
import { isKobaltEnabled, isKobaltSen } from "../config/settings.mjs";
import { zrodlaWyczerpania, opcjeZdejmowania, removeExhaustion, etykietaZrodla } from "../config/exhaustion.mjs";
import { kolejnoscDO } from "../config/rekonwalescencja-rules.mjs";
import { daneKalendarzyka, stanRekonwalescencji } from "../actors/rekonwalescencja.mjs";
import { getZranienieLvl, setZranienie, ZRANIENIE_LEVELS } from "../combat/zranienie.mjs";
import { getChoroby, sunsetCheck } from "../actors/health-panel.mjs";
import { getDisease, jestPrzewlekla } from "../config/diseases-data.mjs";
import { fuksy, przyznajFuksa } from "../actors/fuksy.mjs";
import { zapasyNaDni, zuzyjZapasyNaDni, consumeDailyNeeds } from "../actors/party-supplies.mjs";
import { robotyKierownika, daneRoboty, pracuj, zaproponujTest, rozstrzygnij, kierownikRoboty } from "../production/robota.mjs";
import { mnoznikWykonawcy, stTestuDla } from "../production/wykonawca.mjs";
import { czasWykonawcy, parseCzasPracy, fmtGGMM } from "../config/production-rules.mjs";
import { formatWorldDate } from "../world-clock.mjs";
import { getMiejsce, opisMiejsca } from "./miejsce.mjs";
import { doba, postacieDruzyny, konto, obrazDoby, towarzyszeDoUtrzymania, dolaPrawejReki, FLAGA_KONTA } from "./doba.mjs";
import {
  pasywnaDla, treningi, projektyBazy, dodajGodzinyTreningu, dodajGodzinyBudowy, etykietaCelu, celeTreningu,
  opcjeUmiejetnosci, opcjeNarzedzi
} from "./zajecia.mjs";
import { kartaPostoju, wyslijKarte } from "./karty.mjs";
import { zarejestrujAkcjePostoju } from "./zakladka.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const TPL = `modules/${MODULE_ID}/templates/postoj`;
const DZIEN_S = 86400;
const HISTORIA_MAX = 30;
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const _n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/* -------------------------------------------- */
/*  Plan dnia typowego                           */
/* -------------------------------------------- */

/** Roboty postaci w toku albo czekające na Test: `{ item, r, doKonca }` (minuty realnej pracy do 100%). */
function _roboty(actor) {
  return robotyKierownika(actor).map(item => {
    const r = daneRoboty(item);
    if (!r || !["praca", "test"].includes(r.stan)) return null;
    const m = mnoznikWykonawcy(actor, r.przepis, { kontener: item.parent, naprawa: r.rodzaj === "naprawa" });
    return { item, r, doKonca: r.stan === "test" ? 0 : czasWykonawcy(r.wymagane - r.postep, m.mnoznik) };
  }).filter(Boolean);
}

/** Plan z ostatniej zatwierdzonej doby (U58) albo prosty: sen 8 h, utrzymanie Normalny w miejscowości, bez zajęć. */
export function planDomyslny(actor, grupa) {
  const m = getMiejsce(grupa);
  const o = konto(actor).ostatni ?? {};
  const z = o.zajecia ?? {};
  const roboty = {};
  for (const [id, v] of Object.entries(z.produkcja ?? {})) {
    const min = parseCzasPracy(v);
    if (min) roboty[id] = Math.round(min / 6) / 10;
  }
  const wMiejscowosci = !!LOKALIZACJE[m.rodzaj]?.utrzymanie;
  return normalizujPlan({
    sen: Math.max(SEN_DO_H, _n(o.sen) || SEN_DOMYSLNY_H),
    utrzymanie: wMiejscowosci ? (UTRZYMANIE[o.utrzymanie] ? o.utrzymanie : "normalny") : null,
    praca: { klucz: z.praca?.klucz ?? "", godziny: _n(z.praca?.godziny), pasywna: null },
    trening: { cel: z.trening?.cel ?? "", godziny: _n(z.trening?.godziny), trener: z.trening?.trener ?? "" },
    budowa: { projekt: z.budowa?.projekt ?? "", godziny: _n(z.budowa?.godziny) },
    roboty,
    testy: {},
    droga: stanRekonwalescencji(actor).droga === "medyk" ? "medyk" : "cialo",
    stopien: null
  });
}

/** Plan z formularza albo API: liczby, puste cele, sen ≥ 6 h (przeskok liczy DO każdej doby). */
export function normalizujPlan(p = {}) {
  const pas = p.praca?.pasywna;
  return {
    sen: Math.min(24, Math.max(SEN_DO_H, _n(p.sen) || SEN_DOMYSLNY_H)),
    utrzymanie: UTRZYMANIE[p.utrzymanie] ? p.utrzymanie : null,
    praca: { klucz: p.praca?.klucz || "", godziny: Math.max(0, Math.min(PRACA_H, _n(p.praca?.godziny))), pasywna: pas === "" || pas === null || pas === undefined ? null : _n(pas) },
    trening: { cel: p.trening?.cel || "", godziny: Math.max(0, Math.min(TRENING.maksDziennie, _n(p.trening?.godziny))), trener: p.trening?.trener ?? "" },
    budowa: { projekt: String(p.budowa?.projekt ?? "").trim(), godziny: Math.max(0, Math.min(PRACA_H, _n(p.budowa?.godziny))) },
    roboty: Object.fromEntries(Object.entries(p.roboty ?? {}).map(([k, v]) => [k, Math.max(0, Math.min(PRACA_H, _n(v)))])),
    testy: Object.fromEntries(Object.entries(p.testy ?? {}).map(([k, v]) => [k, !!v])),
    droga: p.droga === "medyk" ? "medyk" : "cialo",
    stopien: p.stopien === "" || p.stopien === null || p.stopien === undefined ? null : Math.max(0, Math.trunc(_n(p.stopien)))
  };
}

/* -------------------------------------------- */
/*  Podgląd (bez zapisu)                         */
/* -------------------------------------------- */

/** Co zejdzie z Wyczerpania przez N DO (U14), pod WKK „Sen” także odsypianie Bezsenności (D35). */
export function zejscieWyczerpania(zrodla, opts, N, { odsypianie = false } = {}) {
  let reszta = [...zrodla];
  const zdjete = [];
  for (let i = 0; i < N; i++) {
    const [schodzi] = kolejnoscDO(reszta, opts);
    if (!schodzi) break;
    zdjete.push(schodzi);
    reszta = reszta.filter(x => x !== schodzi);
  }
  if (odsypianie) {
    const bez = reszta.filter(x => x.source === "bezsennosc").slice(0, N);
    zdjete.push(...bez);
    reszta = reszta.filter(x => !bez.includes(x));
  }
  return { zdjete, zostaje: reszta };
}

/** Stopień Zranienia po N DO z kalendarzyka (§7.8): najszybciej / zwykle (≥ 50%) / prawie pewnie (≥ 90%). */
function _zdrowie(actor, N, droga) {
  const stopien = getZranienieLvl(actor);
  if (stopien <= 0) return null;
  const k = daneKalendarzyka(actor);
  const prog = k[droga === "medyk" ? "medyk" : "cialo"];
  const d = prog.dni[Math.min(N, prog.dni.length - 1)];
  const prog_ = granica => {
    for (let s = 0; s <= stopien; s++) if (d.stopien[s] >= granica - 1e-9) return s;
    return stopien;
  };
  return { stopien, najszybciej: prog_(1e-6), zwykle: prog_(0.5), prawiePewnie: prog_(0.9), smierc: d.smierc, zalezyOd: prog.zalezyOd };
}

const _nazwaStopnia = s => `${ZRANIENIE_LEVELS[s]?.label ?? "?"} (${s})`;

/**
 * Podgląd przeskoku jednej postaci — wartości oczekiwane, nic nie zapisuje.
 * @param {Actor} actor
 * @param {Actor} grupa
 * @param {object} plan  `normalizujPlan`
 * @param {number} dni
 */
export function podgladPostaci(actor, grupa, plan, dni) {
  const N = Math.max(0, Math.floor(_n(dni)));
  const m = getMiejsce(grupa);
  const kobalt = isKobaltEnabled();
  const odsypianie = kobalt && isKobaltSen();
  const k = konto(actor);
  const pasywna = plan.praca.klucz ? (plan.praca.pasywna ?? pasywnaDla(actor, plan.praca.klucz)) : 0;
  const dotTreningu = plan.trening.cel ? (treningi(actor)[plan.trening.cel]?.godziny ?? 0) : 0;
  const projekt = plan.budowa.projekt ? projektyBazy(grupa).find(p => p.nazwa.toLowerCase() === plan.budowa.projekt.toLowerCase()) : null;
  // Jedzenie przed odpoczynkiem (U27): najedzony z utrzymania albo zapasów — Niedożywienie i Odwodnienie mogą zejść.
  const zapasy = plan.utrzymanie ? null : zapasyNaDni(grupa, [actor]);
  const najedzony = !zapasy || (zapasy.jedzenie >= N && zapasy.woda >= N);
  const opts = opcjeZdejmowania(actor);
  if (najedzony) opts.spelnione = [...new Set([...opts.spelnione, "jedzenie", "woda"])];
  const zrodla = zrodlaWyczerpania(actor);
  const wycz = zejscieWyczerpania(zrodla, opts, N, { odsypianie });
  const roboty = _roboty(actor);
  const hRobot = roboty.reduce((s, x) => s + (plan.roboty[x.r.id] ?? 0), 0);

  const z = przeskokZasady({
    dni: N, kobalt,
    plan: {
      utrzymanie: plan.utrzymanie,
      praca: { godziny: plan.praca.klucz ? plan.praca.godziny : 0, pasywna },
      trening: { godziny: plan.trening.cel ? plan.trening.godziny : 0 },
      budowa: { godziny: plan.budowa.projekt ? plan.budowa.godziny : 0 },
      robota: { godziny: hRobot }
    },
    stan: {
      trening: { godziny: dotTreningu },
      budowa: { godziny: projekt?.godziny ?? 0, wymagane: projekt?.wymagane ?? 0 },
      wyczerpanie: { zwykle: 0, bezsennosc: 0 },
      fuksy: fuksy(actor), teraz: game.time.worldTime, bogatyN: k.bogatyN, region: m.region
    }
  });

  const pracaDnia = (plan.praca.klucz ? plan.praca.godziny : 0) + (plan.trening.cel ? plan.trening.godziny : 0)
    + (plan.budowa.projekt ? plan.budowa.godziny : 0) + hRobot;
  const ostrzezenia = [];
  if (pracaDnia > PRACA_H) ostrzezenia.push(`${pracaDnia} h pracy na dobę — ponad 10 h (s. 145).`);
  if (plan.sen + pracaDnia > 24) ostrzezenia.push(`Sen i praca: ${plan.sen + pracaDnia} h na dobę — ponad 24 h.`);
  if (plan.trening.cel && plan.trening.godziny && !String(plan.trening.trener).trim()) ostrzezenia.push("Trening bez trenera — RAW wymaga trenera.");
  if (_n(actor.system?.attributes?.hp?.value) <= 0) ostrzezenia.push("0 PW — Długi odpoczynek niemożliwy (s. 45): przeskok nie odnowi PW ani Kości.");

  const saldo = Math.round((z.rachunek.saldo + k.nadwyzka) * 100) / 100;
  const leki = !!(plan.utrzymanie && pokrycieUtrzymania(plan.utrzymanie).leki);
  const choroby = getChoroby(actor).map(c => {
    const nazwa = getDisease(c.key)?.label ?? c.label ?? c.key;
    return jestPrzewlekla(c) && leki ? `${nazwa}: dawka z utrzymania — bez postępu.` : `${nazwa}: przebieg za ${N} dób — rozstrzyga MG (jeden Zachód słońca).`;
  });

  const robotyWidok = roboty.map(x => {
    const h = plan.roboty[x.r.id] ?? 0;
    const min = Math.min(x.doKonca, Math.round(h * 60 * N));
    const gotowa = x.r.stan === "test" || (h > 0 && min >= x.doKonca);
    return {
      id: x.r.id, uuid: x.item.uuid, nazwa: x.r.przepis.nazwa, godziny: h, test: !!plan.testy[x.r.id],
      opis: x.r.stan === "test" ? "czeka na Test" : `${fmtGGMM(min)} z ${fmtGGMM(x.doKonca)}${gotowa ? " — praca skończona" : ""}`,
      gotowa, minuty: min
    };
  });

  const zdrowie = _zdrowie(actor, N, plan.droga);
  if (zdrowie) zdrowie.cel = Math.min(zdrowie.stopien, plan.stopien ?? zdrowie.zwykle);

  return {
    N, kobalt, pasywna, saldo, nadwyzkaPrzed: k.nadwyzka,
    rachunek: z.rachunek,
    utrzymanie: plan.utrzymanie,
    trening: plan.trening.cel && plan.trening.godziny ? { cel: plan.trening.cel, etykieta: etykietaCelu(plan.trening.cel), ...z.trening, przed: dotTreningu } : null,
    budowa: plan.budowa.projekt && plan.budowa.godziny ? { projekt: projekt?.nazwa ?? plan.budowa.projekt, ...z.budowa, wymagane: projekt?.wymagane ?? null, przed: projekt?.godziny ?? 0 } : null,
    roboty: robotyWidok,
    wyczerpanie: { przed: zrodla.length, zdjete: wycz.zdjete, zostaje: wycz.zostaje },
    zdrowie, choroby,
    fuksyWygasna: z.fuksyWygasna,
    bogaty: z.bogaty,
    ostrzezenia
  };
}

/* -------------------------------------------- */
/*  Zatwierdzenie                                */
/* -------------------------------------------- */

/**
 * Przeskok drużyny o `dni` dób (MG). Jeden zapis na postać, zegar raz, karta podsumowania na postać i karta MG.
 * @param {Actor} grupa
 * @param {{dni: number, plany?: Record<string, object>}} o  plany po `actor.id` (brak — `planDomyslny`)
 * @returns {Promise<object[]>} wyniki per postać
 */
export async function wykonajPrzeskok(grupa, { dni, plany = {} } = {}) {
  if (!game.user.isGM) throw new Error("Przeskok zatwierdza MG.");
  if (doba(grupa)) throw new Error("Drużyna ma otwartą dobę — zatwierdź ją albo zamknij przed przeskokiem.");
  const N = Math.max(1, Math.floor(_n(dni)));
  const m = getMiejsce(grupa);
  const kobalt = isKobaltEnabled();
  const odsypianie = kobalt && isKobaltSen();
  const postacie = postacieDruzyny(grupa);
  const dzienOd = formatWorldDate();

  // 0. Podgląd (plan i wartości oczekiwane) — przed jakąkolwiek zmianą stanu.
  const wyniki = postacie.map(actor => {
    const plan = normalizujPlan(plany[actor.id] ?? planDomyslny(actor, grupa));
    return { actor, plan, p: podgladPostaci(actor, grupa, plan, N), linie: [] };
  });

  // 1. Jedzenie i woda: utrzymanie pokrywa (zapasy nietknięte), reszta — N racji z zapasów naraz (D19).
  const pokryci = wyniki.filter(w => w.plan.utrzymanie);
  if (pokryci.length) {
    const pokrycie = Object.fromEntries(pokryci.map(w => {
      const u = pokrycieUtrzymania(w.plan.utrzymanie);
      return [w.actor.id, { jedzenie: true, woda: u.woda, etykieta: UTRZYMANIE[w.plan.utrzymanie].label }];
    }));
    await consumeDailyNeeds(grupa, { aktorzy: pokryci.map(w => w.actor), pokrycie, karta: false });
    for (const w of pokryci) w.linie.push(`Utrzymanie ${UTRZYMANIE[w.plan.utrzymanie].label} × ${N}: jedzenie i woda w cenie.`);
  }
  const zZapasow = wyniki.filter(w => !w.plan.utrzymanie);
  if (zZapasow.length) {
    const jedza = zZapasow.flatMap(w => [w.actor, ...towarzyszeDoUtrzymania(w.actor).filter(t => !t.czlowiek).map(t => t.actor)]);
    const z = await zuzyjZapasyNaDni(grupa, { aktorzy: jedza, dni: N });
    for (const w of zZapasow) {
      w.linie.push(z.jedzenie >= N && z.woda >= N
        ? `Zapasy: ${N} racji jedzenia i wody.`
        : `<span class="neuro-zle">Zapasy starczyły: jedzenie ${z.jedzenie}, woda ${z.woda} z ${N} dób — Niedożywienie i Odwodnienie rozstrzyga MG.</span>`);
      w.zapasy = z;
    }
  }

  // 2. Odpoczynek: jeden DO dnd5e (Wyczerpanie i Zranienie liczy przeskok), Kości do pełna przy N > 1.
  for (const w of wyniki) {
    const a = w.actor;
    if (_n(a.system?.attributes?.hp?.value) > 0) {
      await a.longRest({ dialog: false, chat: false, advanceTime: false, newDay: true, exhaustionDelta: 0, neuroPrzeskok: true });
      if (N > 1) {
        const klasy = a.items.filter(i => i.type === "class" && _n(i.system?.hd?.spent) > 0);
        if (klasy.length) await a.updateEmbeddedDocuments("Item", klasy.map(i => ({ _id: i.id, "system.hd.spent": 0 })));
      }
      w.linie.push(`${N} × Długi odpoczynek: PW i Kości Wytrzymałości odnowione.`);
    } else {
      w.linie.push(`<span class="neuro-zle">0 PW — bez Długiego odpoczynku (s. 45); MG rozstrzyga.</span>`);
    }
    for (const t of towarzyszeDoUtrzymania(a)) {
      if (_n(t.actor.system?.attributes?.hp?.value) > 0) await t.actor.longRest({ dialog: false, chat: false, advanceTime: false, newDay: true });
    }

    // Wyczerpanie: N × kolejnoscDO, pod WKK odsypianie Bezsenności (wpisy z podglądu, po źródle).
    const zdjete = zejscieWyczerpania(zrodlaWyczerpania(a), opcjeZdejmowania(a), N, { odsypianie }).zdjete;
    for (const wpis of zdjete) await removeExhaustion(a, wpis.source, { chat: false });
    if (zdjete.length) w.linie.push(`Wyczerpanie: −${zdjete.length} (${zdjete.map(x => etykietaZrodla(x)).join(", ")}).`);

    // Zranienie: Stopień z kalendarzyka (zwykle) albo wybrany przez MG; licznik Regeneracji od zera.
    const zd = w.p.zdrowie;
    if (zd && zd.cel < zd.stopien) {
      await setZranienie(a, zd.cel);
      if (zd.cel === 0) await a.unsetFlag(MODULE_ID, "rekonwalescencja");
      else await a.setFlag(MODULE_ID, "rekonwalescencja", { ...(a.getFlag(MODULE_ID, "rekonwalescencja") ?? {}), licznik: 0 });
      w.linie.push(`Zranienie: ${_nazwaStopnia(zd.stopien)} → ${_nazwaStopnia(zd.cel)} (kalendarzyk, ${w.plan.droga === "medyk" ? "z pomocą medyczną" : "Gojenie"}).`);
    } else if (zd) {
      w.linie.push(`Zranienie: zostaje ${_nazwaStopnia(zd.stopien)}.`);
    }

    // Zajęcia: Trening, Budowa, Roboty (Praca — tylko rachunek).
    const pl = w.plan;
    if (pl.praca.klucz && pl.praca.godziny) w.linie.push(`Praca: ${esc(etykietaCelu(pl.praca.klucz))} ${pl.praca.godziny} h × ${N} (pasywna ${w.p.pasywna}).`);
    if (pl.trening.cel && pl.trening.godziny) {
      const h = Math.max(0, (w.p.trening?.godziny ?? 0) - (w.p.trening?.przed ?? 0));
      if (h) w.linie.push(...await dodajGodzinyTreningu(a, pl.trening.cel, h, pl.trening.trener));
    }
    if (pl.budowa.projekt && pl.budowa.godziny) {
      const h = Math.max(0, (w.p.budowa?.godziny ?? 0) - (w.p.budowa?.przed ?? 0));
      if (h) w.linie.push(...await dodajGodzinyBudowy(a, pl.budowa.projekt, h));
    }
    for (const rw of w.p.roboty) {
      const item = fromUuidSync(rw.uuid);
      if (!item) continue;
      if (rw.minuty > 0) await pracuj(item, rw.minuty, { odpoczynek: true, odlozTest: true, cicho: true });
      const r = daneRoboty(item);
      if (r?.stan !== "test") {
        if (rw.minuty > 0) w.linie.push(`Robota: ${esc(rw.nazwa)} — ${fmtGGMM(r.postep)} / ${fmtGGMM(r.wymagane)}.`);
        continue;
      }
      if (rw.test) {
        const kier = kierownikRoboty(item);
        const st = stTestuDla(kier, r.przepis, { stMG: r.stMG, kontener: item.parent });
        await rozstrzygnij(item, { total: st, st, zrodlo: "przeskok" });
        w.linie.push(`Robota: ${esc(rw.nazwa)} — gotowa (Test końcowy przyjęty jako sukces).`);
      } else {
        await zaproponujTest(item);
        w.linie.push(`Robota: ${esc(rw.nazwa)} — praca skończona, Test końcowy czeka na gracza.`);
      }
    }
  }

  // 3. Zachód słońca raz (zaznacza dzień): dawka z utrzymania dla przewlekłych.
  const dawka = new Set(wyniki.filter(w => w.plan.utrzymanie && pokrycieUtrzymania(w.plan.utrzymanie).leki).map(w => w.actor.id));
  await sunsetCheck({ actors: postacie, dawkaZUtrzymania: dawka });

  // 4. Konto: nadwyżka na jutro, niedobór — linia dla MG (ujemnego się nie przenosi, D18).
  for (const w of wyniki) {
    const k = konto(w.actor);
    await w.actor.update({ [`flags.${MODULE_ID}.${FLAGA_KONTA}`]: {
      ...k, nadwyzka: Math.max(0, w.p.saldo), dni: k.dni + N, bogatyN: w.p.bogaty?.nPo ?? 0,
      ostatni: { ...(k.ostatni ?? {}), sen: w.plan.sen, utrzymanie: w.plan.utrzymanie }
    } });
  }

  // 5. Zegar +N dób raz.
  await game.time.advance(N * DZIEN_S);

  // 6. WKK Bogaty (D38): pewny Fuks co 10 dób; zostaje ten z ostatnich 7 dób, z resztą terminu.
  for (const w of wyniki) {
    const b = w.p.bogaty;
    if (!b?.fuksow) continue;
    if (b.zostaje) {
      const termin = (b.dzienOstatniego + BOGATY_KOBALT.terminDni - N) * DZIEN_S;
      const f = await przyznajFuksa(w.actor, "bogaty", { etykieta: "Bogate życie", termin, karta: false });
      w.linie.push(f.odmowa ? "Bogate życie (WKK): Fuks — ale komplet trzech." : `🍀 Bogate życie (WKK): Fuks z dnia ${b.dzienOstatniego} — jeszcze ${b.dzienOstatniego + BOGATY_KOBALT.terminDni - N} dni.`);
    } else {
      w.linie.push(`Bogate życie (WKK): ${b.fuksow} ${b.fuksow === 1 ? "Fuks wygasł" : "Fuksy wygasły"} w trakcie.`);
    }
  }

  // 7. Historia i karty.
  const dzien = formatWorldDate();
  const historia = [...(grupa.getFlag(MODULE_ID, "postoj")?.historia ?? []), {
    id: foundry.utils.randomID(), dzien, przeskok: N, od: dzienOd, miejsce: opisMiejsca(m), czas: game.time.worldTime,
    postacie: wyniki.map(w => ({ uuid: w.actor.uuid, nazwa: w.actor.name, sen: w.plan.sen, utrzymanie: w.plan.utrzymanie, saldo: w.p.saldo }))
  }].slice(-HISTORIA_MAX);
  await grupa.update({ [`flags.${MODULE_ID}.postoj.historia`]: historia });

  for (const w of wyniki) {
    const r = w.p.rachunek;
    await wyslijKarte(kartaPostoju({
      ikona: w.actor.img,
      tytul: `${N} ${N === 1 ? "doba" : "dób"} później: ${w.actor.name}`,
      podtytul: `${dzienOd ?? ""} → ${dzien ?? ""}`,
      rodzaj: w.plan.utrzymanie === "bogaty" ? "bogaty" : w.p.saldo < 0 ? "braki" : "info",
      obraz: await obrazDoby(grupa, w.plan.utrzymanie),
      linie: [
        ...w.linie,
        `Rachunek: −${fmtGb(r.koszty)} koszty · +${fmtGb(r.zarobki)} zarobki${w.p.nadwyzkaPrzed ? ` · +${fmtGb(w.p.nadwyzkaPrzed)} nadwyżka` : ""}`,
        `Saldo: <strong>${fmtGb(w.p.saldo)}</strong>${w.p.saldo > 0 ? " — nadwyżka na jutro" : w.p.saldo < 0 ? " — niedobór, rozlicza MG" : ""}`,
        ...[dolaPrawejReki(w.actor, r.zarobki)].filter(Boolean)
      ],
      ostrzezenia: w.p.ostrzezenia,
      klasa: "neuro-przeskok-karta"
    }), { actor: w.actor });
  }
  await wyslijKarte(kartaPostoju({
    ikona: "icons/svg/clockwork.svg",
    tytul: `Przeskok: ${N} ${N === 1 ? "doba" : "dób"}`,
    podtytul: `${grupa.name} · ${opisMiejsca(m)} · tylko MG`,
    linie: wyniki.map(w => `<strong>${esc(w.actor.name)}</strong>: saldo ${fmtGb(w.p.saldo)}`
      + (w.p.choroby.length ? ` · choroby: ${w.p.choroby.map(esc).join(" ")}` : "")
      + (w.zapasy && (w.zapasy.jedzenie < N || w.zapasy.woda < N) ? ` · <span class="neuro-zle">zapasy na ${Math.min(w.zapasy.jedzenie, w.zapasy.woda)} z ${N} dób</span>` : "")
      + (w.p.saldo < 0 ? ` · <span class="neuro-zle">niedobór ${fmtGb(-w.p.saldo)}</span>` : ""))
  }), { szept: "gm" });

  Hooks.callAll("neuroshima.przeskok", grupa, { dni: N, wyniki });
  return wyniki;
}

/* -------------------------------------------- */
/*  Okno MG                                      */
/* -------------------------------------------- */

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class PrzeskokOkno extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    classes: ["neuro-przeskok", "neuro-postoj-okno"],
    window: { title: "Przeskok", icon: "fa-solid fa-forward-fast", resizable: true },
    position: { width: 760, height: 820 },
    actions: { zatwierdz: PrzeskokOkno.#zatwierdz, odNowa: PrzeskokOkno.#odNowa }
  };

  static PARTS = {
    form: { template: `${TPL}/przeskok-form.hbs`, scrollable: [""] },
    podglad: { template: `${TPL}/przeskok-podglad.hbs`, scrollable: [""] }
  };

  constructor(grupa, options = {}) {
    super({ id: `neuro-przeskok-${grupa.id}`, ...options });
    this.grupa = grupa;
    this.dni = 14;
    this.plany = Object.fromEntries(postacieDruzyny(grupa).map(a => [a.id, planDomyslny(a, grupa)]));
  }

  get title() { return `Przeskok — ${this.grupa.name}`; }

  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    const postacie = postacieDruzyny(this.grupa);
    const m = getMiejsce(this.grupa);
    context.dni = this.dni;
    context.miejsce = opisMiejsca(m);
    context.otwartaDoba = !!doba(this.grupa);
    if (partId === "form") {
      const wMiejscowosci = !!LOKALIZACJE[m.rodzaj]?.utrzymanie;
      const projekty = projektyBazy(this.grupa);
      context.obraz = await obrazDoby(this.grupa, null);
      context.postacie = postacie.map(a => {
        const plan = this.plany[a.id] ?? planDomyslny(a, this.grupa);
        const opcje = (lista, wybrany) => lista.map(o => ({ value: o.k, label: o.label, selected: o.k === wybrany }));
        return {
          id: a.id, nazwa: a.name, img: a.img, plan,
          utrzymanie: wMiejscowosci ? [{ k: "", label: "— bez utrzymania (zapasy)" }, ...Object.entries(UTRZYMANIE).map(([k, u]) => ({ k, label: `${u.label} — ${u.koszt} gb` }))]
            .map(o => ({ ...o, selected: (plan.utrzymanie ?? "") === o.k })) : null,
          praca: [{ grupa: "Umiejętności", opcje: opcje(opcjeUmiejetnosci(), plan.praca.klucz) }, { grupa: "Narzędzia", opcje: opcje(opcjeNarzedzi(), plan.praca.klucz) }],
          pasywnaKarty: plan.praca.klucz ? pasywnaDla(a, plan.praca.klucz) : null,
          cele: celeTreningu().map(g => ({ grupa: g.grupa, opcje: opcje(g.opcje, plan.trening.cel) })),
          projekty: projekty.map(p => p.nazwa),
          roboty: _roboty(a).map(x => ({ id: x.r.id, nazwa: x.r.przepis.nazwa, godziny: plan.roboty[x.r.id] ?? 0, test: !!plan.testy[x.r.id], czeka: x.r.stan === "test" })),
          rany: getZranienieLvl(a) > 0,
          drogaMedyk: plan.droga === "medyk"
        };
      });
    }
    if (partId === "podglad") {
      context.podglady = postacie.map(a => {
        const plan = this.plany[a.id] ?? planDomyslny(a, this.grupa);
        const p = podgladPostaci(a, this.grupa, plan, this.dni);
        return {
          id: a.id, nazwa: a.name, img: a.img, p,
          koszty: fmtGb(p.rachunek.koszty), zarobki: fmtGb(p.rachunek.zarobki), saldo: fmtGb(p.saldo), ujemne: p.saldo < 0,
          nadwyzkaPrzed: p.nadwyzkaPrzed ? fmtGb(p.nadwyzkaPrzed) : null,
          wyczerpanie: p.wyczerpanie.zdjete.length || p.wyczerpanie.zostaje.length
            ? `${p.wyczerpanie.przed} → ${p.wyczerpanie.zostaje.length}${p.wyczerpanie.zdjete.length ? ` (schodzi: ${p.wyczerpanie.zdjete.map(x => etykietaZrodla(x)).join(", ")})` : ""}`
              + (p.wyczerpanie.zostaje.length ? `; zostaje: ${p.wyczerpanie.zostaje.map(x => etykietaZrodla(x)).join(", ")}` : "")
            : null,
          zdrowie: p.zdrowie ? {
            ...p.zdrowie,
            opcje: Array.from({ length: p.zdrowie.stopien + 1 }, (_, s) => ({ s, label: _nazwaStopnia(s), selected: s === p.zdrowie.cel })),
            opis: `zwykle ${_nazwaStopnia(p.zdrowie.zwykle)}, najszybciej ${_nazwaStopnia(p.zdrowie.najszybciej)}, prawie pewnie ${_nazwaStopnia(p.zdrowie.prawiePewnie)}`
              + (p.zdrowie.smierc > 0.005 ? ` · ryzyko śmierci ${Math.round(p.zdrowie.smierc * 100)}%` : "")
          } : null,
          trening: p.trening ? `${p.trening.etykieta}: ${p.trening.przed} → ${p.trening.godziny}/${TRENING.godziny} h${p.trening.ukonczony ? " — ukończony" : ""}` : null,
          budowa: p.budowa ? `${p.budowa.projekt}: ${p.budowa.godziny}${p.budowa.wymagane ? `/${p.budowa.wymagane}` : ""} h${p.budowa.ukonczona ? " — ukończona" : ""}` : null,
          bogaty: p.bogaty ? `${p.bogaty.fuksow} × Fuks (co 10 dób)${p.bogaty.zostaje ? `, ostatni zostaje (dzień ${p.bogaty.dzienOstatniego})` : p.bogaty.fuksow ? ", wszystkie wygasną" : ""}` : null
        };
      });
      const niepokryci = postacie.filter(a => !(this.plany[a.id] ?? {}).utrzymanie);
      if (niepokryci.length) {
        const jedza = niepokryci.flatMap(a => [a, ...towarzyszeDoUtrzymania(a).filter(t => !t.czlowiek).map(t => t.actor)]);
        const z = zapasyNaDni(this.grupa, jedza);
        context.zapasy = { jedzenie: z.jedzenie, woda: z.woda, brak: z.jedzenie < this.dni || z.woda < this.dni, kto: niepokryci.map(a => a.name).join(", ") };
      }
    }
    return context;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const form = this.element.querySelector("form.neuro-przeskok-form");
    if (form && !form.dataset.zwiazany) {
      form.dataset.zwiazany = "1";
      form.addEventListener("submit", ev => ev.preventDefault());
      const zmiana = () => { this.#czytaj(form); this.render({ parts: ["podglad"] }); };
      form.addEventListener("change", zmiana);
      form.addEventListener("input", foundry.utils.debounce(zmiana, 300));
    }
    for (const sel of this.element.querySelectorAll("select[data-stopien]")) {
      sel.addEventListener("change", ev => {
        const id = ev.target.dataset.stopien;
        this.plany[id] = { ...this.plany[id], stopien: Number(ev.target.value) };
        this.render({ parts: ["podglad"] });
      });
    }
  }

  #czytaj(form) {
    const f = foundry.utils.expandObject(new foundry.applications.ux.FormDataExtended(form).object);
    this.dni = Math.max(1, Math.min(365, Math.floor(_n(f.dni)) || 1));
    for (const [id, p] of Object.entries(f.p ?? {})) {
      this.plany[id] = normalizujPlan({ ...p, stopien: this.plany[id]?.stopien ?? null });
    }
  }

  static async #odNowa() {
    this.plany = Object.fromEntries(postacieDruzyny(this.grupa).map(a => [a.id, planDomyslny(a, this.grupa)]));
    await this.render({ force: true });
  }

  static async #zatwierdz(_ev, btn) {
    const form = this.element.querySelector("form.neuro-przeskok-form");
    if (form) this.#czytaj(form);
    if (doba(this.grupa)) return ui.notifications.warn("Drużyna ma otwartą dobę — zatwierdź ją albo zamknij przed przeskokiem.");
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: `Przeskok o ${this.dni} ${this.dni === 1 ? "dobę" : "dób"}?` },
      content: `<p>Jeden zapis na postać, zegar +${this.dni} dób raz, Zachód słońca raz. Rzutów dzień po dniu nie ma (D19).</p>`
    });
    if (!ok) return;
    btn.disabled = true;
    try {
      await wykonajPrzeskok(this.grupa, { dni: this.dni, plany: this.plany });
      ui.notifications.info(`Przeskok: ${this.dni} dób — karty podsumowania na czacie.`);
      await this.close();
    } catch (err) {
      ui.notifications.error(err.message);
      console.error(`${MODULE_ID} | przeskok`, err);
      btn.disabled = false;
    }
  }
}

/** Otwiera okno Przeskoku dla drużyny (MG). */
export function otworzPrzeskok(grupa) {
  if (!game.user.isGM) return ui.notifications.warn("Przeskok układa MG.");
  if (!grupa) return ui.notifications.warn("Brak drużyny.");
  const app = foundry.applications.instances.get(`neuro-przeskok-${grupa.id}`) ?? new PrzeskokOkno(grupa);
  return app.render({ force: true });
}

export function registerPrzeskok() {
  zarejestrujAkcjePostoju({
    neuroPostojPrzeskok: function () { otworzPrzeskok(this.actor); }
  });
}

export const przeskokApi = Object.freeze({ okno: otworzPrzeskok, wykonaj: wykonajPrzeskok, podglad: podgladPostaci, planDomyslny, normalizujPlan });
