/**
 * Neuroshima 5e — szabrowanie ruin (PLAN_m5_postoj.md §7.16, D12, U10–U13).
 *
 * Narzędzie MG + prośba do graczy:
 *   1. MG: [Szabrowanie] (kontrolki żetonów, zakładka Postój) → okno: ruina (7 z RAW albo własna), nazwa miejsca,
 *      szukający, podział rodzajów surowców (D12, domyślnie po kolei), czas (÷ liczba szukających, do nadpisania);
 *      pamięć ruin ostrzega, gdy ta sama osoba szukała tu już tego rodzaju (RAW: nie można powtarzać).
 *   2. Komplikacja w ukryciu (k100 ≤ szansa ruiny, k10, k4) → **szept MG**: mieszkańcy z odnośnikami do
 *      Bestiariusza, pułapki ([Poproś o RO], [Obrażenia]), opary ([Nałóż Zatrucie]), skażenie ([Oznacz poziom]),
 *      [Kontynuuj szabrowanie] — komplikacja jest przed szabrowaniem. Szepty MG bez rzutów (wynik w treści).
 *   3. Karta prośby dnd5e (`request`, handler `neuroSzabrowanie`) do szukających: Percepcja albo Śledztwo (MDR)
 *      ST 10, Ułatwienie z wykrywacza metalu (tylko Percepcja) i Sztuczki Złomiarz — jej część Śmieciarz (U11).
 *   4. Klient MG rozlicza przez przekaźnik: sukces — kości surowców na rodzaj (rzuty na karcie), ≥ 20 — podwójnie
 *      i losowy przedmiot (U13), naturalna 20 — także Fant; porażka — [Spróbuj za …] dla innych szukających.
 *   5. Zdobycz do szukającego, karta podsumowania; na koniec karta MG z [Przesuń czas].
 *
 * Stan sesji: `flags.<mod>.postoj.szabrowania.<id>` na drużynie; pamięć ruin: `postoj.ruiny[]` (ostatnie 50).
 */

import {
  RUINY, SZABROWANIE, RODZAJE_SZABROWANIA, KOMPLIKACJE, rzucKomplikacje, czasSzabrowania, podzialRodzajow, zdobycz,
  losujPrzedmiot, losowyFant
} from "../config/szabrowanie-data.mjs";
import { KATALOG } from "../config/recipes-data.mjs";
import { idFantu } from "../config/fanty-data.mjs";
import { BESTIARY } from "../config/bestiary-data.mjs";
import { giveSurowce } from "../actors/surowce-store.mjs";
import { setTrackLevel } from "../actors/levelled-conditions.mjs";
import { ABILITY_KEYS, hasAbility } from "../actors/abilities.mjs";
import { utworzWynik, idKompendium } from "../production/wynik.mjs";
import { dajFant } from "../items/fanty.mjs";
import { ilustracja } from "../config/ilustracje.mjs";
import { formatWorldDate } from "../world-clock.mjs";
import { druzynaGlowna } from "./miejsce.mjs";
import { postacieDruzyny } from "./doba.mjs";
import { kartaPostoju, wyslijKarte, zarejestrujAkcje } from "./karty.mjs";
import { doMG, zarejestrujProsbe } from "./przekaznik.mjs";
import { zarejestrujAkcjePostoju } from "./zakladka.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const TPL = `modules/${MODULE_ID}/templates/postoj`;
const PAMIEC_MAX = 50;
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const ETYKIETY_SUROWCOW = Object.freeze({ CZ: "części", CH: "chemikalia", CE: "elektronika", MK: "metal" });

/* -------------------------------------------- */
/*  Ruina, pamięć, sesja                         */
/* -------------------------------------------- */

/** Ruina z tabeli RAW albo własna MG (`{label, minuty, komplikacje, surowce}`). */
export function ruinaZ(klucz, wlasna = null) {
  if (RUINY[klucz]) return { klucz, ...RUINY[klucz] };
  const w = wlasna ?? {};
  return {
    klucz: "wlasna", label: String(w.label || "Własna ruina"), minuty: Math.max(0, Number(w.minuty) || 0),
    komplikacje: Math.max(0, Math.min(100, Number(w.komplikacje) || 0)),
    surowce: Object.fromEntries(RODZAJE_SZABROWANIA.map(r => [r, String(w.surowce?.[r] ?? "").trim() || null])),
    obraz: null
  };
}

/** Pamięć ruin drużyny (U10): `{ nazwa, ruina, dzien, proby: [{ kto, nazwaKto, rodzaj, wynik, sukces }] }[]`. */
export function pamiecRuin(grupa) {
  return grupa?.getFlag?.(MODULE_ID, "postoj")?.ruiny ?? [];
}

/** Ostrzeżenia: ta sama osoba szukała już tu tego rodzaju (RAW: szabrowania nie powtarza się). */
export function powtorki(grupa, nazwa, przydzial) {
  const n = String(nazwa ?? "").trim().toLowerCase();
  if (!n) return [];
  const proby = pamiecRuin(grupa).filter(r => r.nazwa.toLowerCase() === n).flatMap(r => r.proby ?? []);
  const out = [];
  for (const [u, rodzaje] of Object.entries(przydzial ?? {})) {
    const kto = _klucz(u);
    for (const r of rodzaje) {
      const p = proby.find(x => x.kto === kto && x.rodzaj === r);
      if (p) out.push(`${p.nazwaKto}: ${ETYKIETY_SUROWCOW[r] ?? r} — już szukał(a) tu (${p.sukces ? "sukces" : "porażka"}).`);
    }
  }
  return out;
}

/**
 * Klucz szukającego w fladze sesji: id aktora. Uuid („Actor.x”) jako klucz obiektu rozwinąłby się przy zapisie
 * flagi w `{ Actor: { x } }` — API przyjmuje oba, w środku są id.
 */
const _klucz = u => (String(u).includes(".") ? (fromUuidSync(u)?.id ?? String(u).split(".").pop()) : String(u));
const _aktor = k => game.actors.get(k) ?? null;

function _sesja(grupa, id) {
  return grupa?.getFlag?.(MODULE_ID, "postoj")?.szabrowania?.[id] ?? null;
}

async function _zapiszSesje(grupa, s) {
  await grupa.update({ [`flags.${MODULE_ID}.postoj.szabrowania.${s.id}`]: s });
}

/**
 * Ułatwienia (U11): wykrywacz metalu — tylko Percepcja (RAW); Złomiarz (NOE s. 108, część Śmieciarz) — oba testy.
 * Złomiarz przez most zdolności: Sztuczka z paczki albo ręcznie wpisany feat „Złomiarz” / „Śmieciarz”.
 */
export function ulatwieniaSzabrowania(actor) {
  const wykrywacz = actor.items.some(i => i.flags?.[MODULE_ID]?.produktZastepczy === SZABROWANIE.wykrywaczMetalu
    || /wykrywacz metalu/i.test(i.name));
  const zlomiarz = hasAbility(actor, ABILITY_KEYS.ZLOMIARZ);
  return { prc: wykrywacz || zlomiarz, sle: zlomiarz, wykrywacz, zlomiarz };
}

/* -------------------------------------------- */
/*  Start i komplikacja                          */
/* -------------------------------------------- */

/**
 * Zaczyna szabrowanie (MG). Komplikacja — szept MG z [Kontynuuj]; bez niej — od razu prośba do szukających.
 * @param {Actor} grupa
 * @param {{ruina: string, wlasna?: object, nazwa?: string, przydzial: Record<string, string[]>, minuty?: number, wymus?: number|null}} o
 *   `przydzial` — uuid szukającego → rodzaje; `wymus` — k10 komplikacji, którą MG wstawia (s. 271); 0 — bez komplikacji
 * @returns {Promise<object>} sesja
 */
export async function rozpocznijSzabrowanie(grupa, { ruina, wlasna = null, nazwa = "", przydzial, minuty = null, wymus = null }) {
  if (!game.user.isGM) throw new Error("Szabrowanie zaczyna MG.");
  const r = ruinaZ(ruina, wlasna);
  const szukajacy = Object.keys(przydzial ?? {}).filter(k => (przydzial[k] ?? []).length);
  if (!szukajacy.length) throw new Error("Wybierz szukających i rodzaje surowców.");
  const k = wymus === 0 ? { jest: false } : rzucKomplikacje(r, Math.random, { wymus: wymus || null });
  const s = {
    id: foundry.utils.randomID(), ruina: r, nazwa: String(nazwa ?? "").trim() || r.label,
    przydzial: Object.fromEntries(szukajacy.map(u => [_klucz(u), [...przydzial[u]]])),
    minuty: minuty ?? czasSzabrowania(r, szukajacy.length),
    komplikacja: k.jest ? { k100: k.k100, k10: k.k10, id: k.komplikacja?.id, mieszkancy: k.mieszkancy, poziom: k.poziom } : null,
    wyniki: {}, stan: k.jest ? "komplikacja" : "szukanie", dzien: formatWorldDate() ?? ""
  };
  await _zapiszSesje(grupa, s);
  if (k.jest) await _kartaKomplikacji(grupa, s, k);
  else await wyslijProsby(grupa, s.id);
  return s;
}

/** Odnośnik do aktora Bestiariusza (id deterministyczne jak w paczce); bez wpisu — sama nazwa. */
async function _odnosnikIstoty(id) {
  const nazwa = BESTIARY[id]?.name ?? id;
  if (!BESTIARY[id]) return esc(nazwa);
  return `@UUID[Compendium.${MODULE_ID}.bestiariusz.Actor.${await idKompendium("bestiary", id)}]{${esc(nazwa)}}`;
}

async function _kartaKomplikacji(grupa, s, k) {
  const kom = k.komplikacja;
  const dane = { grupa: grupa.uuid, sesja: s.id };
  const linie = [`k100 ${k.k100} ≤ ${s.ruina.komplikacje}% → k10 <strong>${k.k10}</strong>: <strong>${esc(kom.label)}</strong> (s. 270).`];
  const przyciski = [];
  if (k.mieszkancy) linie.push(`k4 ${k.mieszkancy.k4}: <strong>${k.mieszkancy.liczba} ×</strong> ${await _odnosnikIstoty(k.mieszkancy.istota)}`);
  if (kom.zauwazenie) linie.push(`Zauważenie: pasywna Percepcja ${kom.zauwazenie}${kom.rozbrojenie ? ` · rozbrojenie ST ${kom.rozbrojenie}` : ""}.`);
  if (kom.ro) {
    linie.push(`RO ${CONFIG.DND5E.abilities[kom.ro.cecha]?.label ?? kom.ro.cecha} ST ${kom.ro.st}${kom.obszar ? ` · obszar ${kom.obszar.bok} m` : ""}${kom.stany ? ` · porażka: ${kom.stany.map(x => CONFIG.statusEffects.find(e => e.id === x)?.name ?? x).map(n => game.i18n.localize(n)).join(", ")}` : ""}.`);
    przyciski.push({ akcja: "szabrowanieRO", label: `Poproś o RO (ST ${kom.ro.st})`, ikona: "fa-solid fa-shield-halved", gm: true, dane });
  }
  if (kom.obrazenia) {
    linie.push(`Obrażenia: ${kom.obrazenia.map(o => o.wzor).join(" + ")}${kom.polowa ? " (połowa przy udanym RO)" : ""}${kom.upadek ? " — upadek" : ""}.`);
    przyciski.push({ akcja: "szabrowanieObrazenia", label: "Obrażenia", ikona: "fa-solid fa-burst", gm: true, dane });
  }
  if (kom.id === "opary") {
    linie.push(`Trujące opary: Zatrucie dla wchodzących${kom.maskaChroni ? " (maska przeciwgazowa chroni)" : ""}.`);
    przyciski.push({ akcja: "szabrowanieOpary", label: "Nałóż Zatrucie", ikona: "fa-solid fa-skull-crossbones", gm: true, dane });
  }
  if (k.poziom) {
    linie.push(`Skażenie radioaktywne: poziom <strong>${k.poziom}</strong> (k4).`);
    przyciski.push({ akcja: "szabrowanieSkazenie", label: `Oznacz Skażenie ${k.poziom}`, ikona: "fa-solid fa-radiation", gm: true, dane });
  }
  przyciski.push({ akcja: "szabrowanieKontynuuj", label: "Kontynuuj szabrowanie", ikona: "fa-solid fa-magnifying-glass", gm: true, dane });
  await wyslijKarte(kartaPostoju({
    ikona: "icons/svg/hazard.svg", tytul: `Komplikacja: ${s.nazwa}`, podtytul: `${s.ruina.label} · tylko MG`, rodzaj: "braki",
    linie: [...linie, "<em>Komplikacja jest przed szabrowaniem — MG może wstawić coś innego (s. 271).</em>"], przyciski
  }), { szept: "gm", flagi: { szabrowanie: dane } });
}

/* -------------------------------------------- */
/*  Prośba i rzut gracza                         */
/* -------------------------------------------- */

/** Karta prośby do szukających (wszystkich albo `tylko` jednego, z jego rodzajami). */
export async function wyslijProsby(grupa, id, { tylko = null } = {}) {
  const s = _sesja(grupa, id);
  if (!s) return null;
  const kto = tylko ? [_klucz(tylko)] : Object.keys(s.przydzial).filter(k => !s.wyniki[k]);
  const aktorzy = kto.map(_aktor).filter(Boolean);
  if (!aktorzy.length) return null;
  if (s.stan === "komplikacja") await _zapiszSesje(grupa, { ...s, stan: "szukanie" });
  const obraz = await ilustracja("ruiny", s.ruina.obraz);
  return ChatMessage.create({
    type: "request",
    content: `${obraz ? `<img class="neuro-postoj-ilustracja" src="${esc(obraz)}" alt="">` : ""}
      <p><strong>Szabrowanie: ${esc(s.nazwa)}</strong> (${esc(s.ruina.label)}, ${s.minuty} min) — Mądrość (Percepcja albo Śledztwo), ST ${SZABROWANIE.st}.
      ≥ ${SZABROWANIE.podwojnieOd}: podwójnie i losowy przedmiot; naturalna 20 — także Fant (s. 271).</p>
      <ul>${aktorzy.map(a => `<li>${esc(a.name)}: ${(s.przydzial[a.id] ?? []).map(r => ETYKIETY_SUROWCOW[r] ?? r).join(", ")}</li>`).join("")}</ul>`,
    speaker: ChatMessage.getSpeaker({ alias: "Szabrowanie" }),
    flags: { [MODULE_ID]: { szabrowanie: { grupa: grupa.uuid, sesja: id } } },
    system: {
      handler: "neuroSzabrowanie", data: { grupa: grupa.uuid, sesja: id },
      button: { icon: "fa-solid fa-magnifying-glass", label: "Szukaj" },
      targets: aktorzy.map(a => ({ actor: a.uuid }))
    }
  });
}

/** Handler prośby u gracza: wybór umiejętności (U11), rzut, wynik do MG przez przekaźnik. */
async function _handlerSzabrowanie(actor, request, data, { event } = {}) {
  const u = ulatwieniaSzabrowania(actor);
  const sk = CONFIG.DND5E.skills;
  const skill = await foundry.applications.api.DialogV2.wait({
    window: { title: "Szabrowanie — czego szukasz?" },
    content: `<p>Test Mądrości ST ${SZABROWANIE.st}: którą umiejętnością?</p>`
      + (u.wykrywacz ? "<p class=\"hint\">Wykrywacz metalu: Ułatwienie do Percepcji.</p>" : "")
      + (u.zlomiarz ? "<p class=\"hint\">Złomiarz: Ułatwienie do testu.</p>" : ""),
    buttons: [
      { action: "prc", label: `${sk.prc?.label ?? "Percepcja"} (${actor.system.skills.prc?.total ?? 0})${u.prc ? " · Ułatwienie" : ""}`, default: true },
      { action: "sle", label: `${sk.sle?.label ?? "Śledztwo"} (${actor.system.skills.sle?.total ?? 0})${u.sle ? " · Ułatwienie" : ""}` }
    ],
    rejectClose: false
  });
  if (!skill) return null;
  const md = {};
  foundry.utils.setProperty(md, "flags.dnd5e.requestResult", { actorUuid: actor.uuid, requestId: request.id });
  foundry.utils.setProperty(md, `flags.${MODULE_ID}.szabrowanieRzut`, { actorUuid: actor.uuid, ...data });
  const [roll] = (await actor.rollSkill({ skill, ability: SZABROWANIE.cecha, target: SZABROWANIE.st, advantage: !!u[skill], event }, {}, { data: md })) ?? [];
  if (!roll) return null;
  // Naturalna 20 z kości, nie z `isCritical` — ten bywa `false`, gdy rzut nie ma progu krytyka (test cechy).
  await doMG("szabrowanieWynik", { ...data, aktor: actor.uuid, total: roll.total, nat20: roll.d20?.total === 20 });
  return roll.parent ?? null;
}

/* -------------------------------------------- */
/*  Rozliczenie (MG)                             */
/* -------------------------------------------- */

/** Losowe przedmioty do szukającego (U13): katalog → przedmiot; bez katalogu — loot; aktor/pojazd — linia MG. */
async function _dajPrzedmioty(actor, wyniki) {
  const linie = [];
  const dlaMG = [];
  for (const w of wyniki) {
    if (w.aktor) { dlaMG.push(`${w.nazwa}${w.istota ? ` (${await _odnosnikIstoty(w.istota)})` : ""} — ${w.pojazd ? "sprawny pojazd" : "istota żywa"}: karta MG`); continue; }
    if (w.schemat) {
      const doc = await fromUuid(`Compendium.${MODULE_ID}.schematy.Item.${await idKompendium("schemat", w.schemat)}`).catch(() => null);
      if (doc) {
        await actor.createEmbeddedDocuments("Item", [game.items.fromCompendium(doc, { keepId: false, clearFolder: true })]);
        linie.push(`📜 ${esc(doc.name)}`);
      } else dlaMG.push(`${w.nazwa}: Schemat ${w.schemat} — wręcza MG`);
      continue;
    }
    if (w.ref && KATALOG.get(w.ref)) {
      const items = await utworzWynik(actor, { ref: w.ref, ilosc: w.ilosc ?? 1 });
      linie.push(`🎁 ${esc(items[0]?.name ?? w.nazwa)}${(w.ilosc ?? 1) > 1 ? ` ×${w.ilosc}` : ""}`);
      continue;
    }
    if (!w.ref && w.cena !== undefined && w.cena !== null) {
      await actor.createEmbeddedDocuments("Item", [{
        name: w.nazwa, type: "loot", img: "icons/svg/item-bag.svg",
        system: { quantity: w.ilosc ?? 1, price: { value: w.cena, denomination: "gb" }, weight: { value: w.waga ?? 0, units: "kg" },
          description: { value: `<p><em>Znalezione przy szabrowaniu (${esc(w.kategoria)}). Zasady — MG.</em></p>` } }
      }]);
      linie.push(`🎁 ${esc(w.nazwa)}`);
      continue;
    }
    dlaMG.push(`${w.nazwa} (${w.kategoria}) — brak pozycji, wybiera MG`);
  }
  return { linie, dlaMG };
}

async function _rozlicz(_nosiciel, d) {
  const grupa = await fromUuid(d.grupa);
  const s = _sesja(grupa, d.sesja);
  const k = _klucz(d.aktor);
  const actor = _aktor(k);
  if (!s || !actor || s.wyniki[k]) return;
  const rodzaje = s.przydzial[k] ?? [];
  const rolls = [];
  const rzuty = {};
  if (Number(d.total) >= SZABROWANIE.st) {
    for (const r of rodzaje) {
      const wzor = s.ruina.surowce?.[r];
      if (!wzor) continue;
      const roll = await new Roll(wzor).evaluate();
      roll.options.flavor = ETYKIETY_SUROWCOW[r];
      rolls.push(roll);
      rzuty[r] = roll.total;
    }
  }
  const z = zdobycz({ ruina: s.ruina, rodzaje, wynik: Number(d.total), nat20: !!d.nat20, rzuty });
  const linie = [`${esc(actor.name)}: wynik <strong>${d.total}</strong>${d.nat20 ? " (naturalna 20)" : ""} — ${z.sukces ? (z.mnoznik === 2 ? "podwójnie!" : "sukces") : "nic"}.`];
  for (const [r, ile] of Object.entries(z.surowce)) {
    if (ile > 0) await giveSurowce(actor, r, ile);
    linie.push(`${ETYKIETY_SUROWCOW[r] ?? r}: <strong>${ile}</strong> gb (${s.ruina.surowce[r]}${z.mnoznik === 2 ? " ×2" : ""})`);
  }
  let dlaMG = [];
  if (z.przedmiot) {
    const p = await _dajPrzedmioty(actor, losujPrzedmiot({ katalog: KATALOG.values() }));
    linie.push(...p.linie);
    dlaMG = p.dlaMG;
  }
  if (z.fant) {
    for (const f of losowyFant()) {
      await dajFant(actor, idFantu(f));
      linie.push(`🧸 Fant: ${esc(f.nazwa)}`);
    }
  }

  // Sesja i pamięć ruin (U10).
  const nowa = foundry.utils.deepClone(s);
  nowa.wyniki[k] = { total: Number(d.total), sukces: z.sukces, nat20: !!d.nat20 };
  await _zapiszSesje(grupa, nowa);
  await _zapamietaj(grupa, nowa, actor, rodzaje, z.sukces, Number(d.total));

  // Porażka — inni szukający mogą spróbować tego rodzaju (U10).
  const przyciski = [];
  if (!z.sukces && rodzaje.length) {
    const inni = Object.keys(nowa.przydzial).filter(u => u !== k);
    for (const u of inni) {
      const a = _aktor(u);
      const juz = powtorki(grupa, nowa.nazwa, { [u]: rodzaje }).length > 0;
      if (a && !juz) przyciski.push({ akcja: "szabrowanieZaKogos", label: `Spróbuj: ${a.name}`, ikona: "fa-solid fa-hand", gm: true, dane: { grupa: grupa.uuid, sesja: nowa.id, aktor: u, rodzaje: rodzaje.join(",") } });
    }
  }
  await wyslijKarte(kartaPostoju({
    ikona: actor.img, tytul: `Szabrowanie: ${nowa.nazwa}`, podtytul: nowa.ruina.label,
    rodzaj: z.sukces ? "sukces" : "porazka", linie, przyciski
  }), { actor, rolls, flagi: { szabrowanie: { grupa: grupa.uuid, sesja: nowa.id } } });
  if (dlaMG.length) {
    await wyslijKarte(kartaPostoju({ ikona: "icons/svg/chest.svg", tytul: `Szabrowanie: ${actor.name}`, podtytul: "tylko MG", linie: dlaMG.map(esc) }), { szept: "gm" });
  }
  await _moze_koniec(grupa, nowa);
}

async function _zapamietaj(grupa, s, actor, rodzaje, sukces, wynik) {
  const ruiny = foundry.utils.deepClone(pamiecRuin(grupa));
  let r = ruiny.find(x => x.nazwa.toLowerCase() === s.nazwa.toLowerCase());
  if (!r) { r = { nazwa: s.nazwa, ruina: s.ruina.label, dzien: s.dzien, proby: [] }; ruiny.push(r); }
  for (const rodzaj of rodzaje) r.proby.push({ kto: actor.id, nazwaKto: actor.name, rodzaj, wynik, sukces });
  await grupa.update({ [`flags.${MODULE_ID}.postoj.ruiny`]: ruiny.slice(-PAMIEC_MAX) });
}

/** Wszyscy szukający mają wynik — karta MG z [Przesuń czas]. */
async function _moze_koniec(grupa, s) {
  if (Object.keys(s.przydzial).some(u => !s.wyniki[u]) || s.stan === "koniec") return;
  await _zapiszSesje(grupa, { ...s, stan: "koniec" });
  await wyslijKarte(kartaPostoju({
    ikona: "icons/svg/clockwork.svg", tytul: `Szabrowanie zakończone: ${s.nazwa}`, podtytul: "tylko MG",
    linie: [`${s.minuty} min (${s.ruina.minuty} min ÷ ${Object.keys(s.przydzial).length}, D12).`],
    przyciski: [{ akcja: "szabrowanieCzas", label: `Przesuń czas o ${s.minuty} min`, ikona: "fa-solid fa-clock", gm: true, dane: { grupa: grupa.uuid, sesja: s.id } }]
  }), { szept: "gm" });
}

/**
 * [Spróbuj: …] (U10): inny szukający bierze rodzaje, przy których ktoś zawiódł — nowa prośba tylko do niego.
 * Zapis flagi scala obiekty, więc jego poprzedni wynik usuwamy kluczem `-=` (inaczej nowy rzut by się nie liczył).
 */
export async function sprobujZaKogos(grupa, sesjaId, aktor, rodzaje) {
  const s = _sesja(grupa, sesjaId);
  if (!s || !rodzaje?.length) return null;
  const kto = _klucz(aktor);
  const sciezka = `flags.${MODULE_ID}.postoj.szabrowania.${s.id}`;
  await grupa.update({ [`${sciezka}.przydzial.${kto}`]: [...rodzaje], [`${sciezka}.wyniki.-=${kto}`]: null });
  return wyslijProsby(grupa, s.id, { tylko: kto });
}

/* -------------------------------------------- */
/*  Akcje kart MG                                */
/* -------------------------------------------- */

async function _zPrzycisku(btn) {
  if (!game.user.isGM) return {};
  const grupa = await fromUuid(btn.dataset.grupa);
  return { grupa, s: _sesja(grupa, btn.dataset.sesja) };
}

async function _szukajacy(s) {
  return Object.keys(s?.przydzial ?? {}).map(_aktor).filter(Boolean);
}

/** RO pułapki (sieć, podłoga, granat): porażka nakłada stany komplikacji na rzucającego. */
async function _handlerPulapka(actor, request, data, { event } = {}) {
  const md = {};
  foundry.utils.setProperty(md, "flags.dnd5e.requestResult", { actorUuid: actor.uuid, requestId: request.id });
  const [roll] = (await actor.rollSavingThrow({ ability: data.cecha, target: data.st, event }, {}, { data: md })) ?? [];
  if (roll && !roll.isSuccess) for (const st of data.stany ?? []) await actor.toggleStatusEffect(st, { active: true });
  return roll?.parent ?? null;
}

const _komplikacja = s => KOMPLIKACJE.find(k => k.id === s?.komplikacja?.id) ?? null;

function _rejestrujAkcje() {
  zarejestrujAkcje("szabrowanieKontynuuj", async (_ev, btn) => {
    const { grupa, s } = await _zPrzycisku(btn);
    if (s && s.stan === "komplikacja") await wyslijProsby(grupa, s.id);
  });
  zarejestrujAkcje("szabrowanieRO", async (_ev, btn) => {
    const { s } = await _zPrzycisku(btn);
    const kom = _komplikacja(s);
    if (!kom?.ro) return;
    const aktorzy = await _szukajacy(s);
    await ChatMessage.create({
      type: "request",
      content: `<p><strong>${esc(kom.label)}</strong> — Rzut Obronny na ${CONFIG.DND5E.abilities[kom.ro.cecha]?.label ?? kom.ro.cecha}, ST ${kom.ro.st}.</p>`,
      speaker: ChatMessage.getSpeaker({ alias: s.nazwa }),
      system: { handler: "neuroPulapkaRO", data: { cecha: kom.ro.cecha, st: kom.ro.st, stany: kom.stany ?? [] },
        button: { icon: "fa-solid fa-shield-halved", label: "RO" }, targets: aktorzy.map(a => ({ actor: a.uuid })) }
    });
  });
  zarejestrujAkcje("szabrowanieObrazenia", async (_ev, btn) => {
    const { s } = await _zPrzycisku(btn);
    const kom = _komplikacja(s);
    if (!kom?.obrazenia) return;
    const wzor = kom.obrazenia.map(o => `${o.wzor}[${o.typ}]`).join(" + ");
    const roll = await new CONFIG.Dice.DamageRoll(wzor, {}, { type: kom.obrazenia[0].typ }).evaluate();
    await roll.toMessage({ speaker: ChatMessage.getSpeaker({ alias: s.nazwa }), flavor: `${kom.label} — obrażenia${kom.polowa ? " (połowa przy udanym RO)" : ""}`,
      flags: { dnd5e: { roll: { type: "damage" } } } });
  });
  zarejestrujAkcje("szabrowanieOpary", async (_ev, btn) => {
    const { s } = await _zPrzycisku(btn);
    for (const a of await _szukajacy(s)) await a.toggleStatusEffect("poisoned", { active: true });
  });
  zarejestrujAkcje("szabrowanieSkazenie", async (_ev, btn) => {
    const { s } = await _zPrzycisku(btn);
    if (!s?.komplikacja?.poziom) return;
    for (const a of await _szukajacy(s)) await setTrackLevel(a, "skazenie", s.komplikacja.poziom);
  });
  zarejestrujAkcje("szabrowanieZaKogos", async (_ev, btn) => {
    const { grupa, s } = await _zPrzycisku(btn);
    if (s) await sprobujZaKogos(grupa, s.id, btn.dataset.aktor, String(btn.dataset.rodzaje ?? "").split(",").filter(Boolean));
  });
  zarejestrujAkcje("szabrowanieCzas", async (_ev, btn) => {
    const { s } = await _zPrzycisku(btn);
    if (!s) return;
    await game.time.advance(s.minuty * 60);
    btn.disabled = true;
  });
}

/* -------------------------------------------- */
/*  Okno MG                                      */
/* -------------------------------------------- */

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class SzabrowanieOkno extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "neuro-szabrowanie",
    classes: ["neuro-szabrowanie", "neuro-postoj-okno"],
    window: { title: "Szabrowanie", icon: "fa-solid fa-magnifying-glass", resizable: true },
    position: { width: 560, height: "auto" },
    actions: { szabruj: SzabrowanieOkno.#szabruj, podzial: SzabrowanieOkno.#podzial }
  };

  static PARTS = { form: { template: `${TPL}/szabrowanie.hbs` } };

  constructor(grupa, options = {}) {
    super(options);
    this.grupa = grupa;
    this.stan = { ruina: "sklepik", nazwa: "", wlasna: {}, szukajacy: [], przydzial: {}, minuty: null, komplikacja: "" };
  }

  async _prepareContext(options) {
    const ctx = await super._prepareContext(options);
    const postacie = postacieDruzyny(this.grupa);
    const st = this.stan;
    if (!st.szukajacy.length) {
      st.szukajacy = postacie.map(a => a.id);
      st.przydzial = podzialRodzajow(st.szukajacy);
    }
    const r = ruinaZ(st.ruina, st.wlasna);
    const wybrani = st.szukajacy.filter(u => (st.przydzial[u] ?? []).length);
    ctx.ruiny = [...Object.entries(RUINY).map(([k, v]) => ({ k, label: `${v.label} — ${v.minuty} min, ${v.komplikacje}%`, selected: k === st.ruina })),
      { k: "wlasna", label: "Własna ruina…", selected: st.ruina === "wlasna" }];
    ctx.wlasna = st.ruina === "wlasna" ? { ...r, surowceLista: RODZAJE_SZABROWANIA.map(x => ({ k: x, label: ETYKIETY_SUROWCOW[x], v: r.surowce[x] ?? "" })) } : null;
    ctx.ruina = r;
    ctx.surowce = RODZAJE_SZABROWANIA.map(x => `${ETYKIETY_SUROWCOW[x]} ${r.surowce[x] ?? "—"}`).join(" · ");
    ctx.obraz = await ilustracja("ruiny", r.obraz);
    ctx.nazwa = st.nazwa;
    ctx.komplikacje = [{ k: "", label: `losowo — k100 ≤ ${r.komplikacje}%` }, { k: "0", label: "bez komplikacji" },
      ...KOMPLIKACJE.map(x => ({ k: String(x.k10), label: `${x.k10}. ${x.label}` }))].map(o => ({ ...o, selected: o.k === st.komplikacja }));
    ctx.osoby = postacie.map(a => ({
      id: a.id, nazwa: a.name, img: a.img, wybrany: st.szukajacy.includes(a.id),
      rodzaje: RODZAJE_SZABROWANIA.map(x => ({ k: x, label: ETYKIETY_SUROWCOW[x], zaznaczony: (st.przydzial[a.id] ?? []).includes(x) })),
      ulatwienia: (() => { const u = ulatwieniaSzabrowania(a); return [u.wykrywacz && "wykrywacz metalu", u.zlomiarz && "Złomiarz"].filter(Boolean).join(", "); })()
    }));
    ctx.minuty = st.minuty ?? czasSzabrowania(r, wybrani.length || 1);
    ctx.minutyDomyslne = czasSzabrowania(r, wybrani.length || 1);
    ctx.ostrzezenia = powtorki(this.grupa, st.nazwa, Object.fromEntries(wybrani.map(u => [u, st.przydzial[u]])));
    ctx.pamiec = pamiecRuin(this.grupa).slice(-5).reverse().map(x => `${x.nazwa} (${x.ruina}, ${x.dzien})`);
    ctx.mozna = wybrani.length > 0;
    return ctx;
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const form = this.element.querySelector("form");
    if (!form) return;
    form.addEventListener("submit", ev => ev.preventDefault());
    form.addEventListener("change", ev => {
      const t = ev.target;
      const st = this.stan;
      if (t.name === "ruina") { st.ruina = t.value; st.minuty = null; }
      else if (t.name === "nazwa") st.nazwa = t.value;
      else if (t.name === "komplikacja") st.komplikacja = t.value;
      else if (t.name === "minuty") st.minuty = Math.max(0, Number(t.value) || 0);
      else if (t.name?.startsWith("wlasna.")) foundry.utils.setProperty(st, t.name, t.value);
      else if (t.dataset.osoba && t.dataset.rodzaj) {
        const lista = new Set(st.przydzial[t.dataset.osoba] ?? []);
        if (t.checked) lista.add(t.dataset.rodzaj); else lista.delete(t.dataset.rodzaj);
        st.przydzial[t.dataset.osoba] = RODZAJE_SZABROWANIA.filter(x => lista.has(x));
        st.minuty = null;
      } else if (t.dataset.osoba) {
        st.szukajacy = t.checked ? [...new Set([...st.szukajacy, t.dataset.osoba])] : st.szukajacy.filter(u => u !== t.dataset.osoba);
        st.przydzial = podzialRodzajow(st.szukajacy);
        st.minuty = null;
      }
      this.render();
    });
  }

  static #podzial() {
    this.stan.przydzial = podzialRodzajow(this.stan.szukajacy);
    this.stan.minuty = null;
    this.render();
  }

  static async #szabruj(_ev, btn) {
    const st = this.stan;
    const przydzial = Object.fromEntries(st.szukajacy.filter(u => (st.przydzial[u] ?? []).length).map(u => [u, st.przydzial[u]]));
    btn.disabled = true;
    try {
      const r = ruinaZ(st.ruina, st.wlasna);
      await rozpocznijSzabrowanie(this.grupa, {
        ruina: st.ruina, wlasna: st.wlasna, nazwa: st.nazwa, przydzial, minuty: st.minuty ?? czasSzabrowania(r, Object.keys(przydzial).length),
        wymus: st.komplikacja === "" ? null : Number(st.komplikacja)
      });
      await this.close();
    } catch (err) {
      ui.notifications.warn(err.message);
      btn.disabled = false;
    }
  }
}

/** Otwiera okno szabrowania (MG) dla drużyny — domyślnie głównej. */
export function otworzSzabrowanie(grupa = druzynaGlowna()) {
  if (!game.user.isGM) return ui.notifications.warn("Szabrowanie zaczyna MG.");
  if (!grupa) return ui.notifications.warn("Brak drużyny — ustaw drużynę główną (dnd5e).");
  const app = foundry.applications.instances.get("neuro-szabrowanie");
  if (app) { app.grupa = grupa; return app.render({ force: true }); }
  return new SzabrowanieOkno(grupa).render({ force: true });
}

export function registerSzabrowanie() {
  CONFIG.DND5E.requests.neuroSzabrowanie = _handlerSzabrowanie;
  CONFIG.DND5E.requests.neuroPulapkaRO = _handlerPulapka;
  zarejestrujProsbe("szabrowanieWynik", _rozlicz);
  _rejestrujAkcje();
  zarejestrujAkcjePostoju({ neuroPostojSzabrowanie: function () { otworzSzabrowanie(this.actor); } });
  Hooks.on("getSceneControlButtons", controls => {
    const tools = controls.tokens?.tools;
    if (!tools) return;
    tools.neuroshimaSzabrowanie = {
      name: "neuroshimaSzabrowanie", title: "Szabrowanie (MG)", icon: "fa-solid fa-magnifying-glass",
      order: Object.keys(tools).length, button: true, visible: game.user?.isGM ?? false,
      onChange: () => otworzSzabrowanie()
    };
  });
}

export const szabrowanieApi = Object.freeze({
  okno: otworzSzabrowanie, zacznij: rozpocznijSzabrowanie, prosby: wyslijProsby, sprobuj: sprobujZaKogos, pamiec: pamiecRuin, powtorki,
  ulatwienia: ulatwieniaSzabrowania, ruina: ruinaZ
});
