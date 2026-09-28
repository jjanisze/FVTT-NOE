/**
 * Neuroshima 5e — Robota: jeden lejek zapisu produkcji (PLAN_produkcja §1.6, §5.3, etap E1).
 *
 * **Robota** to trwający wątek produkcji — fizyczny przedmiot (`loot`) u tego, kto go trzyma
 * (postać, pojazd, Miejsce), z zamrożonymi w środku surowcami. Każda jego zmiana idzie przez
 * funkcje poniżej (`start / pracuj / koryguj / test / porzuc / zakoncz`) — zakładka, okno
 * odpoczynku i API wołają te same. Każda zmiana to wiadomość na czacie (jawność, §1.4).
 *
 * Kto co liczy:
 * - **przepis** — snapshot w Robocie; zmiana danych nie przepisuje trwającej pracy,
 * - **mnożnik czasu** — z kierownika **w chwili pracy** (Fabrykator, cecha profesji z WKK,
 *   zestawy pod ręką), więc postęp trzymamy w minutach **bazowych** (D29),
 * - **ST** — z kierownika w chwili Testu (albo `stMG`),
 * - **waga** — z bieżącego ustawienia WKK (D4 / D25).
 *
 * Porażka Testu (D2): od nowa, surowce zostają; Forsowanie i Fuks rozstrzygają oczekujący Test
 * przez hak `neuroshima.rerolled` (`combat/rerolls.mjs`).
 */

import { przepis as przepisPoId, KATALOG } from "../config/recipes-data.mjs";
import {
  alokujSurowce, surowceWykonawcy, czasWykonawcy, postepZPracy, wagaRoboty, wagaSurowcowKg,
  zwrotPorzucenia, porzucenieDostepne, parseKorekta, zastosujKorekte, fmtGGMM, DOBA_LIMIT_MIN, sumaGb
} from "../config/production-rules.mjs";
import { formatToolExpr, parseToolExpr, TOOL_KEYS } from "../config/tool-expr.mjs";
import { isKobaltEnabled } from "../config/settings.mjs";
import { allGb, takeManySurowce, giveManySurowce, SUROWCE_CODES } from "../actors/surowce-store.mjs";
import { kontekstWykonawcy, ocenNarzedzia, mnoznikWykonawcy, stTestuDla, ulatwieniaZPochodzen } from "./wykonawca.mjs";
import { zrodlaDostepu } from "./zp.mjs";
import { utworzWynik, ikonaWyniku } from "./wynik.mjs";
import { kartaProdukcji, fmtSurowce, ukryjPrzyciskiMG } from "./karty.mjs";
import { advanceWorldTime } from "../world-clock.mjs";
import { dzwiekPracy, dzwiek, nadZetonem } from "./oprawa.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
export const ROBOTA_FLAG = "robota";
const DOBA_FLAG = "produkcjaDoba";
const WERSJA = 1;

/* -------------------------------------------- */
/*  Odczyt                                      */
/* -------------------------------------------- */

export function isRobota(item) {
  return !!item?.flags?.[MODULE_ID]?.[ROBOTA_FLAG];
}

/** Dane Roboty (kopia — do zapisu idzie przez `_zapisz`). */
export function daneRoboty(item) {
  const r = item?.flags?.[MODULE_ID]?.[ROBOTA_FLAG];
  return r ? foundry.utils.deepClone(r) : null;
}

/** Roboty, które trzyma aktor. */
export function robotyU(actor) {
  return (actor?.items?.contents ?? []).filter(isRobota);
}

/** Roboty, których aktor jest kierownikiem — gdziekolwiek stoją (postać, pojazd, Miejsce). */
export function robotyKierownika(actor) {
  if (!actor) return [];
  const out = [];
  for (const a of game.actors) {
    for (const i of a.items) {
      if (isRobota(i) && i.flags[MODULE_ID][ROBOTA_FLAG].kierownikId === actor.id) out.push(i);
    }
  }
  return out;
}

export function kierownikRoboty(item) {
  return game.actors.get(daneRoboty(item)?.kierownikId) ?? null;
}

/* -------------------------------------------- */
/*  Pomocnicze                                  */
/* -------------------------------------------- */

const _num = v => Math.round((Number(v) || 0) * 100) / 100;

/** Dzień do limitu 10 h (L8) — z zegara świata, który sam przesuwa się przy odpoczynkach. */
function _dzien() {
  return Math.floor((game.time?.worldTime ?? 0) / 86400);
}

function _wagaWyniku(przepis) {
  const dane = przepis.wynik?.dane;
  if (dane) return _num((Number(dane.system?.weight?.value) || 0) * (przepis.wynik.ilosc ?? 1));
  const k = KATALOG.get(przepis.wynik?.ref);
  return k?.wynik === "item" ? _num(k.waga * (przepis.wynik.ilosc ?? 1)) : 0;
}

function _opisBrakow(braki) {
  if (!braki?.length) return "";
  const txt = braki.map(b => {
    const n = TOOL_KEYS[b.key] ?? b.key;
    if (b.status === "brak-bieglosci") return `biegłość (${n})`;
    if (b.status === "pula") return `zestaw ${n} (w puli)`;
    return `zestaw ${n}`;
  });
  return `Brakuje: ${txt.join(", ")}`;
}

async function _karta(item, opts, { speakerActor = null } = {}) {
  const r = daneRoboty(item);
  const actor = speakerActor ?? kierownikRoboty(item) ?? item.parent;
  return ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: kartaProdukcji({ ikona: item.img, tytul: r?.przepis?.nazwa ?? item.name, ...opts }),
    flags: { [MODULE_ID]: { robotaKarta: { uuid: item.uuid, id: r?.id } } }
  });
}

/** Zapis zmian Roboty + waga (jedyne miejsce, które pisze flagę). */
async function _zapisz(item, zmiany) {
  const r = { ...daneRoboty(item), ...zmiany };
  const waga = wagaRoboty({ wejscie: r.wagaWejscia, wynik: r.wagaWyniku, postep: r.postep, wymagane: r.wymagane });
  await item.update({
    [`flags.${MODULE_ID}.${ROBOTA_FLAG}`]: r,
    "system.weight.value": waga
  });
  return r;
}

/* -------------------------------------------- */
/*  Podgląd startu                              */
/* -------------------------------------------- */

/**
 * Wszystko, co pokazuje okno startu i co sprawdza `start()`.
 * @param {Actor} actor       kierownik
 * @param {object} przepis
 * @param {object} [o]
 * @param {Actor} [o.holder]  gdzie stanie Robota (domyślnie kierownik)
 * @param {Record<number, Record<string, number>>} [o.reczna]  ręczna alokacja alternatyw
 */
export function ocenaStartu(actor, przepis, { holder = actor, reczna = {}, podzial = null, kobalt = isKobaltEnabled(), ctx = null, adHocMG = false } = {}) {
  ctx ??= kontekstWykonawcy(actor, { kontener: holder });
  // Robota ad hoc zakładana przez MG: dostęp właśnie nadaje MG, więc go nie sprawdzamy.
  // Naprawa nie wymaga Schematu ani Wprawy — wystarczą narzędzia (s. 146).
  const zrodla = przepis.zrodlo?.naprawa
    ? [{ typ: "naprawa", label: "Naprawa — wystarczą narzędzia (s. 146)" }]
    : adHocMG && game.user?.isGM
      ? [{ typ: "mg", label: "Ad hoc (MG)" }]
      : zrodlaDostepu(actor, przepis, { kobalt });
  const narzedzia = ocenNarzedzia(actor, przepis, { ctx });
  const { przydasie } = ctx.cechy;
  const auto = surowceWykonawcy(przepis.surowce, { przydasie });
  // L11: podział „logiczny i uproszczony”, ostatecznie MG — gracz może go zmienić przy starcie,
  // ale suma zostaje (inaczej zmiana podziału byłaby furtką do tańszej produkcji).
  const podzialOk = podzial ? Math.abs(Object.values(podzial).reduce((a, b) => a + (Number(b) || 0), 0) - sumaGb(auto)) < 1e-6 : true;
  const linie = podzial && podzialOk
    ? Object.entries(podzial).filter(([, gb]) => Number(gb) > 0).map(([typ, gb]) => ({ typy: [typ], gb: Number(gb) }))
    : auto;
  const zapasAktora = allGb(actor);
  const zapasHoldera = holder && holder !== actor ? allGb(holder) : {};
  const zapas = Object.fromEntries(SUROWCE_CODES.map(c => [c, (zapasAktora[c] ?? 0) + (zapasHoldera[c] ?? 0)]));
  const alokacja = alokujSurowce(linie, zapas, reczna);
  const m = mnoznikWykonawcy(actor, przepis, { ctx, kobalt });
  const st = stTestuDla(actor, przepis, { ctx, kobalt });
  return {
    przepis, zrodla, narzedzia, linie, auto, podzialZmieniony: !!podzial && podzialOk, podzialOk, przydasie,
    zapas, zapasAktora, zapasHoldera, alokacja,
    mnoznik: m.mnoznik, powody: m.powody, cecha: m.cecha,
    czas: czasWykonawcy(przepis.minuty, m.mnoznik),
    st,
    wagaWejscia: _num(wagaSurowcowKg(alokacja.przydzial)),
    wagaWyniku: _wagaWyniku(przepis),
    ulatwienia: ulatwieniaZPochodzen(actor, przepis, { ctx }),
    mozna: zrodla.length > 0 && alokacja.ok && podzialOk
  };
}

/* -------------------------------------------- */
/*  Start                                       */
/* -------------------------------------------- */

/**
 * Zaczyna Robotę: surowce schodzą (z kierownika, potem z kontenera), powstaje przedmiot-Robota.
 * Brak dostępu i brak surowców to twarda blokada (D23); braki narzędzi — tylko z `mimoBrakow`.
 * @returns {Promise<Item|null>}
 */
export async function start(actor, przepisLubId, { holder = actor, mimoBrakow = false, reczna = {}, podzial = null, adHocMG = false, rodzaj = "produkcja", cel = null, img = null } = {}) {
  const p = typeof przepisLubId === "string" ? przepisPoId(przepisLubId) : przepisLubId;
  if (!p) { ui.notifications.error(`Nieznany przepis: ${przepisLubId}`); return null; }
  if (!actor?.isOwner || !holder?.isOwner) {
    ui.notifications.warn("Robotę zaczyna właściciel postaci i miejsca, w którym stanie.");
    return null;
  }
  const o = ocenaStartu(actor, p, { holder, reczna, podzial, adHocMG });
  if (!o.podzialOk) {
    ui.notifications.warn(`Zmieniony podział musi dać razem ${sumaGb(o.auto)} gb surowców.`);
    return null;
  }
  if (!o.zrodla.length) {
    ui.notifications.warn(`${actor.name}: brak dostępu do „${p.nazwa}” — potrzebny Schemat albo Wprawa (nadaje MG).`);
    return null;
  }
  if (!o.narzedzia.ok && !mimoBrakow) {
    ui.notifications.warn(`${p.nazwa}: ${_opisBrakow(o.narzedzia.braki)}. Możesz zacząć mimo braków.`);
    return null;
  }
  if (!o.alokacja.ok) {
    ui.notifications.warn(`${p.nazwa}: brakuje surowców — ${fmtSurowce(o.alokacja.brak)}.`);
    return null;
  }

  // Najpierw z kierownika, reszta z kontenera Roboty (§1.3).
  const zAktora = {};
  const zHoldera = {};
  for (const [typ, gb] of Object.entries(o.alokacja.przydzial)) {
    const own = Math.min(gb, Math.floor((o.zapasAktora[typ] ?? 0) + 1e-6));
    if (own > 0) zAktora[typ] = own;
    if (gb - own > 0) zHoldera[typ] = gb - own;
  }
  const r1 = await takeManySurowce(actor, zAktora);
  if (!r1.ok) { ui.notifications.warn(`Brakuje surowców: ${fmtSurowce(r1.brak)}.`); return null; }
  if (Object.keys(zHoldera).length) {
    const r2 = await takeManySurowce(holder, zHoldera);
    if (!r2.ok) {
      await giveManySurowce(actor, zAktora);
      ui.notifications.warn(`Brakuje surowców w ${holder.name}: ${fmtSurowce(r2.brak)}.`);
      return null;
    }
  }

  const snapshot = foundry.utils.deepClone(p);
  const braki = o.narzedzia.ok ? [] : o.narzedzia.braki;
  const robota = {
    v: WERSJA,
    id: foundry.utils.randomID(16),
    rodzaj,
    przepisId: p.id,
    przepis: snapshot,
    cel: cel ? { itemUuid: cel } : null,
    kierownikId: actor.id,
    postep: 0,
    wymagane: p.minuty,
    surowce: o.alokacja.przydzial,
    wagaWejscia: o.wagaWejscia,
    wagaWyniku: o.wagaWyniku,
    stan: "praca",
    braki,
    zatwierdzone: false,
    stMG: null,
    testMessageId: null,
    podejscia: 0,
    przydasie: o.przydasie,
    podzialZmieniony: o.podzialZmieniony,
    start: game.time.worldTime
  };
  img ??= await ikonaWyniku(p.wynik.ref, p.wynik.dane);
  const [item] = await holder.createEmbeddedDocuments("Item", [{
    name: `Robota: ${p.nazwa}`,
    type: "loot",
    img,
    system: {
      quantity: 1,
      weight: { value: wagaRoboty({ wejscie: o.wagaWejscia, wynik: o.wagaWyniku, postep: 0, wymagane: p.minuty }), units: "kg" },
      price: { value: 0, denomination: "gb" },
      description: {
        value: `<p>Trwająca praca: <strong>${foundry.utils.escapeHTML(p.nazwa)}</strong>. W środku surowce `
          + `(${fmtSurowce(o.alokacja.przydzial)}) — zakładka <em>Produkcja</em> kierownika pokazuje postęp.</p>`
      }
    },
    flags: { [MODULE_ID]: { [ROBOTA_FLAG]: robota } }
  }]);

  const miejsce = holder === actor ? "przy sobie" : holder.name;
  const linie = [
    `Kierownik: <strong>${foundry.utils.escapeHTML(actor.name)}</strong> · ${foundry.utils.escapeHTML(miejsce)}`,
    `Surowce: ${fmtSurowce(o.alokacja.przydzial)}${o.przydasie ? " (Przydasie −50%)" : ""}`,
    `Czas: ${fmtGGMM(p.minuty)}${o.mnoznik !== 1 ? ` — dla ${foundry.utils.escapeHTML(actor.name)} ${fmtGGMM(o.czas)} (${o.powody.join(", ")})` : ""} · ST ${o.st}`,
    `Narzędzia: ${foundry.utils.escapeHTML(formatToolExpr(parseToolExpr(p.narzedzia)))} · ${o.zrodla.map(z => foundry.utils.escapeHTML(z.label)).join(", ")}`
  ];
  const doDecyzji = braki.length > 0 || o.podzialZmieniony;
  const przyciski = [
    ...(braki.length ? [
      { akcja: "zatwierdz", label: "Zatwierdź", uuid: item.uuid, gm: true, ikona: "fa-solid fa-check" },
      { akcja: "zmien-st", label: "Zmień ST", uuid: item.uuid, gm: true, ikona: "fa-solid fa-dice-d20" }
    ] : []),
    ...(doDecyzji ? [{ akcja: "cofnij", label: "Cofnij start", uuid: item.uuid, gm: true, ikona: "fa-solid fa-rotate-left" }] : [])
  ];
  const ostrzezenia = [];
  if (braki.length) ostrzezenia.push(`${_opisBrakow(braki)} — zaczęta mimo braków, MG decyduje.`);
  if (o.podzialZmieniony) ostrzezenia.push(`Zmieniony podział surowców (domyślnie: ${fmtSurowce(alokujSurowce(o.auto, o.zapas).przydzial)}).`);
  await _karta(item, {
    podtytul: "Rozpoczęta Robota",
    rodzaj: doDecyzji ? "braki" : "praca",
    pasek: { postep: 0, wymagane: p.minuty },
    linie,
    ostrzezenia,
    przyciski
  });
  return item;
}

/* -------------------------------------------- */
/*  Praca                                       */
/* -------------------------------------------- */

/**
 * Praca nad Robotą: `minuty` realnej pracy kierownika → postęp w minutach bazowych.
 * @param {Item} item
 * @param {number} minuty
 * @param {object} [o]
 * @param {boolean} [o.odpoczynek]  praca w oknie odpoczynku — bez przycisku „Przesuń czas”
 * @param {boolean} [o.odlozTest]   nie otwieraj Testu po przekroczeniu 100% (odpoczynek zbiera Testy)
 * @returns {Promise<{delta: number, doTestu: boolean}|null>}
 */
export async function pracuj(item, minuty, { odpoczynek = false, odlozTest = false, cicho = false } = {}) {
  const r = daneRoboty(item);
  if (!r) return null;
  minuty = Math.max(0, Math.round(Number(minuty) || 0));
  if (!minuty) return null;
  if (r.stan === "test") {
    ui.notifications.info(`${r.przepis.nazwa}: praca skończona — czeka na Test.`);
    return null;
  }
  const kier = kierownikRoboty(item);
  if (!kier) { ui.notifications.error("Robota bez kierownika — przejmij ją przeniesieniem."); return null; }
  if (!item.isOwner) { ui.notifications.warn("Nad Robotą pracuje właściciel miejsca, w którym stoi."); return null; }

  const m = mnoznikWykonawcy(kier, r.przepis, { kontener: item.parent, naprawa: r.rodzaj === "naprawa" });
  const pozostalo = r.wymagane - r.postep;
  const delta = postepZPracy(minuty, m.mnoznik, pozostalo);
  const postep = Math.min(r.wymagane, r.postep + delta);
  const doTestu = postep >= r.wymagane;
  await _zapisz(item, { postep, stan: doTestu ? "test" : "praca" });

  // Licznik doby (L8) — liczy realną pracę, nie postęp (D29).
  const doba = kier.getFlag(MODULE_ID, DOBA_FLAG) ?? {};
  const dzisiaj = _dzien();
  const naDobe = (doba.dzien === dzisiaj ? Number(doba.minuty) || 0 : 0) + minuty;
  if (kier.isOwner) await kier.setFlag(MODULE_ID, DOBA_FLAG, { dzien: dzisiaj, minuty: naDobe });

  if (!cicho) {
    dzwiekPracy(r.przepis);
    nadZetonem(kier, `+${fmtGGMM(delta)}`);
    const powody = m.powody.length ? ` (${m.powody.join(", ")})` : "";
    await _karta(item, {
      podtytul: odpoczynek ? "Praca na odpoczynku" : "Praca",
      pasek: { postep, wymagane: r.wymagane },
      linie: [`${fmtGGMM(minuty)} pracy${powody} → <strong>+${fmtGGMM(delta)}</strong>`
        + (doTestu ? " · <strong>gotowe do Testu</strong>" : "")],
      ostrzezenia: naDobe > DOBA_LIMIT_MIN ? [`${kier.name}: ${fmtGGMM(naDobe)} pracy tej doby — ponad 10 h (s. 145).`] : [],
      przyciski: odpoczynek ? [] : [{ akcja: "czas", label: `Przesuń czas o ${fmtGGMM(minuty)}`, gm: true, dane: { minuty }, ikona: "fa-solid fa-clock" }]
    });
  }
  if (doTestu) await _poUkonczeniuPracy(item, { odlozTest });
  return { delta, doTestu };
}

/** Praca skończona: przepis bez Testu (zdolność, D35) kończy się od razu, reszta idzie do Testu. */
async function _poUkonczeniuPracy(item, { odlozTest = false } = {}) {
  const r = daneRoboty(item);
  if (r?.przepis?.bezTestu) return zakoncz(item, { zrodlo: "bez-testu" });
  if (!odlozTest) return zaproponujTest(item);
}

/**
 * Korekta postępu w obie strony (D9 — tu MG wpisuje wynik pomocnika): „+5”, „-3”, „+10%”, „=50%”.
 */
export async function koryguj(item, wejscie, { nota = "" } = {}) {
  const r = daneRoboty(item);
  if (!r) return null;
  const k = parseKorekta(wejscie);
  if (!k) { ui.notifications.warn(`Nie rozumiem korekty „${wejscie}” (np. +5, -3, +10%, =50%).`); return null; }
  if (!item.isOwner) { ui.notifications.warn("Brak uprawnień do tej Roboty."); return null; }
  const postep = zastosujKorekte(r.postep, r.wymagane, k);
  const doTestu = postep >= r.wymagane;
  await _zapisz(item, { postep, stan: doTestu ? "test" : "praca" });
  const roznica = postep - r.postep;
  await _karta(item, {
    podtytul: "Korekta postępu",
    rodzaj: "info",
    pasek: { postep, wymagane: r.wymagane },
    linie: [`${roznica >= 0 ? "+" : "−"}${fmtGGMM(Math.abs(roznica))} (${foundry.utils.escapeHTML(wejscie)})`
      + `${nota ? ` — <em>${foundry.utils.escapeHTML(nota)}</em>` : ""} · ${foundry.utils.escapeHTML(game.user.name)}`]
  });
  if (doTestu) await _poUkonczeniuPracy(item);
  return postep;
}

/* -------------------------------------------- */
/*  Test końcowy                                */
/* -------------------------------------------- */

/** Aktywny gracz-właściciel kierownika (on rzuca Test). */
function _graczKierownika(kier) {
  return game.users.find(u => !u.isGM && u.active && kier.testUserPermission(u, "OWNER")) ?? null;
}

/**
 * Po przekroczeniu 100%: Test otwiera się u właściciela kierownika. Gdy godziny dopisał
 * ktoś inny (MG, inny gracz) — karta „Test gotowy” z przyciskiem.
 */
export async function zaproponujTest(item) {
  const kier = kierownikRoboty(item);
  if (!kier) return;
  const gracz = _graczKierownika(kier);
  const mojTest = gracz ? gracz === game.user : game.user.isGM;
  if (mojTest) return test(item);
  await _karta(item, {
    podtytul: "Test gotowy",
    rodzaj: "test",
    linie: [`Praca skończona — ${foundry.utils.escapeHTML(kier.name)} wykonuje Test używanych narzędzi.`],
    przyciski: [{ akcja: "test", label: "Wykonaj Test", uuid: item.uuid, ikona: "fa-solid fa-dice-d20" }]
  });
}

/** Narzędzie do Testu: spośród użytych do spełnienia wymogu — z najwyższą premią (L5). */
function _narzedzieTestu(kier, ocena) {
  const keys = ocena.wybor ?? [];
  if (!keys.length) return null;
  return [...keys].sort((a, b) => (Number(kier.system.tools?.[b]?.total) || 0) - (Number(kier.system.tools?.[a]?.total) || 0))[0];
}

/**
 * Test końcowy: `rollToolCheck` kierownika z ST; Ułatwienia z Pochodzeń domyślnie zaznaczone.
 * @param {Item} item
 * @param {{configure?: boolean}} [o]  `configure: false` — bez okna rzutu (makra, konsola)
 * @returns {Promise<"sukces"|"porazka"|null>}  null = anulowany
 */
export async function test(item, { configure = true } = {}) {
  const r = daneRoboty(item);
  if (!r) return null;
  if (r.stan !== "test") { ui.notifications.info(`${r.przepis.nazwa}: praca jeszcze trwa.`); return null; }
  const kier = kierownikRoboty(item);
  if (!kier?.isOwner) { ui.notifications.warn("Test rzuca właściciel kierownika Roboty."); return null; }

  const holder = item.parent;
  const ocena = ocenNarzedzia(kier, r.przepis, { kontener: holder });
  const tool = _narzedzieTestu(kier, ocena);
  const st = stTestuDla(kier, r.przepis, { stMG: r.stMG, kontener: holder });
  const ulatwienia = ulatwieniaZPochodzen(kier, r.przepis);
  const nonce = foundry.utils.randomID();
  const braki = ocena.ok ? [] : ocena.braki;
  const flavor = `<strong>Test końcowy:</strong> ${foundry.utils.escapeHTML(r.przepis.nazwa)} (ST ${st})`
    + (ulatwienia.length ? ` · Ułatwienie: ${ulatwienia.join(", ")}` : "")
    + (braki.length && !r.zatwierdzone ? ` · <span class="neuro-robota-warn">⚠ ${foundry.utils.escapeHTML(_opisBrakow(braki))}</span>` : "");
  const message = { data: { flavor, flags: { [MODULE_ID]: { robotaTest: { uuid: item.uuid, id: r.id, st, nonce } } } } };
  const config = { target: st, ...(ulatwienia.length ? { advantage: true } : {}) };

  const dialog = configure ? {} : { configure: false };
  const rolls = tool
    ? await kier.rollToolCheck({ tool, ...config }, dialog, message)
    : await kier.rollAbilityCheck({ ability: "int", ...config }, dialog, message);
  const roll = Array.isArray(rolls) ? rolls[0] : rolls;
  if (!roll) return null;
  const msg = game.messages.contents.findLast(m => m.flags?.[MODULE_ID]?.robotaTest?.nonce === nonce);
  return rozstrzygnij(item, { total: roll.total, st, messageId: msg?.id ?? null, zrodlo: "test" });
}

/**
 * Wynik Testu (także po Forsowaniu / Fuksie). Sukces tworzy przedmiot; porażka — od nowa,
 * surowce zostają (D2). Przerzut, który dalej nie wystarcza, niczego już nie zeruje.
 */
export async function rozstrzygnij(item, { total, st, messageId = null, zrodlo = "test" }) {
  const r = daneRoboty(item);
  if (!r) return null;
  if (total >= st) {
    await zakoncz(item, { total, st, zrodlo });
    return "sukces";
  }
  if (zrodlo === "test") {
    dzwiek("porazka");
    await _zapisz(item, { postep: 0, stan: "praca", podejscia: (r.podejscia ?? 0) + 1, testMessageId: messageId });
    await _karta(item, {
      podtytul: "Test nieudany",
      rodzaj: "porazka",
      pasek: { postep: 0, wymagane: r.wymagane },
      linie: [`Wynik ${total} przy ST ${st} — praca od nowa, surowce zostają w Robocie (s. 145).`,
        "Forsowanie albo Fuks na rzucie Testu wciąż mogą to odwrócić."]
    });
  } else {
    await _karta(item, {
      podtytul: "Przerzut nie wystarczył", rodzaj: "porazka",
      linie: [`${zrodlo === "fuks" ? "Fuks" : "Forsowanie"}: ${total} przy ST ${st}.`]
    });
  }
  return "porazka";
}

/* -------------------------------------------- */
/*  Koniec i porzucenie                         */
/* -------------------------------------------- */

/** Sukces: wynik u posiadacza Roboty, Robota znika. Najpierw tworzymy, potem kasujemy. */
export async function zakoncz(item, { total = null, st = null, zrodlo = "test" } = {}) {
  const r = daneRoboty(item);
  if (!r) return null;
  const holder = item.parent;
  const kier = kierownikRoboty(item);
  const w = r.przepis.wynik;
  let utworzone = [];
  let skutekNaprawy = null;
  if (r.rodzaj === "naprawa") {
    // Dynamiczny import: naprawa.mjs sama importuje ten plik (start Robót naprawy).
    const { napraw } = await import("./naprawa.mjs");
    const cel = r.cel?.itemUuid ? await fromUuid(r.cel.itemUuid).catch(() => null) : null;
    skutekNaprawy = cel ? `${cel.name}: ${await napraw(cel)}` : "przedmiotu już nie ma — surowce poszły na marne";
  } else if (w.typ === "item") {
    utworzone = await utworzWynik(holder, w, {
      znacznik: { kierownikId: r.kierownikId, przepisId: r.przepisId, kiedy: game.time.worldTime }
    });
  }
  const img = item.img;
  const uuid = item.uuid;
  await holder.deleteEmbeddedDocuments("Item", [item.id]);
  dzwiek("ukonczenie");
  nadZetonem(kier ?? holder, "Gotowe!", "#2ecc71");

  const co = skutekNaprawy
    ? `<strong>Naprawione</strong> — ${foundry.utils.escapeHTML(skutekNaprawy)}`
    : w.typ === "item"
    ? `${w.ilosc > 1 ? `${w.ilosc} × ` : ""}<strong>${foundry.utils.escapeHTML(r.przepis.nazwa)}</strong> → ${foundry.utils.escapeHTML(holder.name)}`
    : w.typ === "aktor"
      ? `<strong>${foundry.utils.escapeHTML(r.przepis.nazwa)}</strong> gotowe — MG tworzy aktora (pojazdy: M4, drony: M3).`
      : `<strong>${foundry.utils.escapeHTML(r.przepis.nazwa)}</strong> wykonane — skutek rozstrzyga MG.`;
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: kier ?? holder }),
    content: kartaProdukcji({
      ikona: img, tytul: r.przepis.nazwa, podtytul: "Gotowe!", rodzaj: "sukces",
      linie: [co, total != null ? `Test: ${total} przy ST ${st}${zrodlo !== "test" ? ` (${zrodlo === "fuks" ? "Fuks" : "Forsowanie"})` : ""}` : ""].filter(Boolean)
    }),
    flags: { [MODULE_ID]: { robotaKarta: { uuid, id: r.id, koniec: true } } }
  });
  return utworzone;
}

/**
 * Porzucenie (D14, **tylko WKK**): postęp ≤ 10% → zwrot wszystkich surowców, dalej połowa.
 * Bez WKK RAW nie zna porzucenia — funkcja odmawia.
 */
export async function porzuc(item, { potwierdz = true } = {}) {
  const r = daneRoboty(item);
  if (!r) return null;
  if (!porzucenieDostepne()) {
    ui.notifications.warn("Bez Koloru Kobaltu Roboty nie da się porzucić — podręcznik zna tylko jej ukończenie.");
    return null;
  }
  if (!item.isOwner) { ui.notifications.warn("Brak uprawnień do tej Roboty."); return null; }
  const zwrot = zwrotPorzucenia(r.surowce, r.postep, r.wymagane) ?? {};
  if (potwierdz) {
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: `Porzucić: ${r.przepis.nazwa}?` },
      content: `<p>Postęp ${fmtGGMM(r.postep)} / ${fmtGGMM(r.wymagane)}. Wraca: <strong>${fmtSurowce(zwrot)}</strong>`
        + ` z ${fmtSurowce(r.surowce)}.</p>`
    });
    if (!ok) return null;
  }
  const holder = item.parent;
  await giveManySurowce(holder, zwrot);
  dzwiek("porzucenie");
  const img = item.img;
  await holder.deleteEmbeddedDocuments("Item", [item.id]);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: kierownikRoboty(item) ?? holder }),
    content: kartaProdukcji({
      ikona: img, tytul: r.przepis.nazwa, podtytul: "Porzucona", rodzaj: "porzucenie",
      linie: [`Zwrot: ${fmtSurowce(zwrot)} → ${foundry.utils.escapeHTML(holder.name)} (z ${fmtSurowce(r.surowce)}).`]
    })
  });
  return zwrot;
}

/* -------------------------------------------- */
/*  Decyzje MG (D23)                            */
/* -------------------------------------------- */

/** MG akceptuje zaczęcie mimo braków narzędzi — znika plakietka ⚠. */
export async function zatwierdz(item) {
  if (!game.user.isGM) return ui.notifications.warn("Zatwierdza MG.");
  const r = await _zapisz(item, { zatwierdzone: true });
  await _karta(item, { podtytul: "Braki zatwierdzone przez MG", rodzaj: "info", linie: [`${_opisBrakow(r.braki)} — MG się zgadza.`] });
}

/** MG ustala ST Testu tej Roboty (wygrywa z wyliczonym). `null` wraca do wyliczonego. */
export async function zmienST(item, st) {
  if (!game.user.isGM) return ui.notifications.warn("ST zmienia MG.");
  if (st === undefined) {
    const val = await foundry.applications.api.DialogV2.prompt({
      window: { title: "ST Testu końcowego" },
      content: `<label>ST <input type="number" name="st" min="0" max="40" value="${daneRoboty(item)?.stMG ?? ""}" autofocus></label>`
        + `<p class="hint">Puste — ST wyliczone z przepisu.</p>`,
      ok: { callback: (event, button) => button.form.elements.st.value }
    }).catch(() => undefined);
    if (val === undefined) return;
    st = val === "" ? null : Number(val);
  }
  await _zapisz(item, { stMG: Number.isFinite(st) ? st : null });
  await _karta(item, { podtytul: "ST ustalone przez MG", rodzaj: "info", linie: [Number.isFinite(st) ? `Test końcowy: ST ${st}.` : "ST wraca do wyliczonego z przepisu."] });
}

/**
 * Weto MG (L11, D23): Robota znika, **wszystkie** surowce wracają — to korekta startu,
 * nie porzucenie, więc nie zależy od WKK ani od postępu.
 */
export async function cofnijStart(item, { potwierdz = true } = {}) {
  if (!game.user.isGM) return ui.notifications.warn("Start cofa MG.");
  const r = daneRoboty(item);
  if (!r) return null;
  if (potwierdz) {
    const ok = await foundry.applications.api.DialogV2.confirm({
      window: { title: `Cofnąć start: ${r.przepis.nazwa}?` },
      content: `<p>Robota znika, wraca komplet surowców: <strong>${fmtSurowce(r.surowce)}</strong>.</p>`
    });
    if (!ok) return null;
  }
  const holder = item.parent;
  await giveManySurowce(holder, r.surowce);
  const img = item.img;
  await holder.deleteEmbeddedDocuments("Item", [item.id]);
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: kierownikRoboty(item) ?? holder }),
    content: kartaProdukcji({
      ikona: img, tytul: r.przepis.nazwa, podtytul: "Start cofnięty przez MG", rodzaj: "porzucenie",
      linie: [`Zwrot w całości: ${fmtSurowce(r.surowce)} → ${foundry.utils.escapeHTML(holder.name)}.`]
    })
  });
  return r.surowce;
}

/* -------------------------------------------- */
/*  Rejestracja: kliknięcia, przerzuty          */
/* -------------------------------------------- */

/** Akcje kart obsługiwane tutaj; resztę (np. „przekaz”) łapią inne pliki produkcji. */
const _AKCJE = new Set(["czas", "test", "zatwierdz", "zmien-st", "cofnij"]);

async function _onClick(event) {
  const btn = event.target.closest?.("[data-neuro-robota]");
  if (!btn || !btn.closest(".neuro-robota-card") || !_AKCJE.has(btn.dataset.neuroRobota)) return;
  event.preventDefault();
  event.stopPropagation();
  const akcja = btn.dataset.neuroRobota;
  if (akcja === "czas") {
    const min = Number(btn.dataset.minuty) || 0;
    if (min > 0 && await advanceWorldTime(min)) btn.disabled = true;
    return;
  }
  const item = btn.dataset.uuid ? await fromUuid(btn.dataset.uuid) : null;
  if (!item || !isRobota(item)) return ui.notifications.warn("Tej Roboty już nie ma.");
  if (akcja === "test") return test(item);
  if (akcja === "zatwierdz") return zatwierdz(item);
  if (akcja === "zmien-st") return zmienST(item);
  if (akcja === "cofnij") return cofnijStart(item);
}

async function _onRerolled({ message, roll, kind }) {
  const t = message?.flags?.[MODULE_ID]?.robotaTest;
  if (!t || !roll) return;
  const item = await fromUuid(t.uuid);
  if (!item || !isRobota(item) || daneRoboty(item).id !== t.id || !item.isOwner) return;
  await rozstrzygnij(item, { total: roll.total, st: t.st, messageId: message.id, zrodlo: kind });
}

export function registerRobota() {
  document.addEventListener("click", _onClick, { capture: true });
  Hooks.on("renderChatMessageHTML", ukryjPrzyciskiMG);
  Hooks.on("neuroshima.rerolled", _onRerolled);
  console.log("Neuroshima 5e | Produkcja: Robota registered");
}

export const robotaApi = Object.freeze({
  start, pracuj, koryguj, test, rozstrzygnij, porzuc, zakoncz, zatwierdz, zmienST, cofnijStart,
  ocenaStartu, robotyU, robotyKierownika, daneRoboty, isRobota
});

export const __testing = Object.freeze({ dzien: _dzien });
