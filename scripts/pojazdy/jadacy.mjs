/**
 * Neuroshima 5e — wsiadanie, wysiadanie, przesiadka, wypadanie (PLAN_m4_pojazdy §4.1, §4.4, §4.10, E3).
 *
 * Każda zmiana składu jadących idzie przez aktywnego MG (`doMG` z przekaźnika M5): MG zmienia cudze
 * żetony (rozmiar, pozycję), listy `crew`/`passengers` pojazdu i jego własność. Gracz prosi.
 *
 * ## Koszty — oznaczane, nie pobierane (zasady planu)
 *
 * RAW s. 260–261, 266: kierowca wsiada za połowę Szybkości (w dół) i resztę ruchu traci; pasażer bez
 * dodatkowego kosztu, chyba że drzwi, fotel, okno — połowa Szybkości. Przesiadka w jadącym pojeździe:
 * odległość ×2 bez testu albo ×1 z ZRC (Akrobatyka) ST 10, porażka o 5+ — Powalenie (D15); WKK: zmiana
 * rzędu zawsze z testem. Moduł pisze koszt na karcie; MG cofa, co się nie wydarzyło (D7).
 *
 * ## Dostęp z obecności (D11, §4.4)
 *
 * Gracz, którego postać siedzi w środku, dostaje na czas jazdy prawa właściciela pojazdu (ruch żetonu,
 * karta, ładownia, uruchamianie). Poprzedni poziom zapisuje flaga `dostep` pojazdu, wysiadka go przywraca.
 * Własność stała (nadana przez MG) zostaje nietknięta.
 */

import { doMG, zarejestrujProsbe } from "../postoj/przekaznik.mjs";
import { kartaPostoju, wyslijKarte, zarejestrujAkcje } from "../postoj/karty.mjs";
import { zarejestrujLadownieUpuszczenia } from "../actors/ground-items.mjs";
import {
  MODULE_ID, FLAGA_JAZDA, FLAGA_OBSADA, daneNosnika, danePojazdu, jadacyPojazdu, jazdaZetonu, jestZetonemNosnika, kratkaPojazdu,
  miejscaNosnika, miejsceNosnika, nosnikJadacego, obrysDziala, obsadaPojazdu, pojazdJadacego, profilNosnika, rozmiarMiejsca,
  skalaPojazdu, trybSceny, wierzchowiecAktora
} from "./stan.mjs";
import { freeHands } from "../actors/doll.mjs";
import {
  naroznikDlaSrodka, normalizujKat, obroc, srodekMiejsca
} from "./geometria.mjs";
import { torX, xNaTor } from "../scenes/poscig.mjs";

const FLAGA_DOSTEP = "dostep";
const FLAGA_RUCH = "ruch";
const OWNER = 3;

/** Zasięg wsiadania (RAW s. 260): pojazd do 1,5 m od postaci. */
export const ZASIEG_WSIADANIA_M = 1.5;
/** Test przesiadki „normalnym ruchem” (s. 266 pkt 3, D15). */
export const ST_PRZESIADKI = 10;

/* -------------------------------------------- */
/*  Pytania                                      */
/* -------------------------------------------- */

/** Mapa id miejsca → żeton jadącego. */
export function zajeteMiejsca(pojazdDoc) {
  return new Map(jadacyPojazdu(pojazdDoc).map(t => [jazdaZetonu(t).miejsce, t]));
}

/** Żeton kierowcy pojazdu albo `null`. */
export function kierowcaPojazdu(pojazdDoc) {
  const kier = miejscaNosnika(pojazdDoc.actor, pojazdDoc).find(m => m.kierowca);
  return kier ? zajeteMiejsca(pojazdDoc).get(kier.id) ?? null : null;
}

/** Miejsce jadącego (obiekt miejsca) albo `null`. */
export function miejsceJadacego(jadacyDoc) {
  const p = nosnikJadacego(jadacyDoc);
  return p ? miejsceNosnika(p, jazdaZetonu(jadacyDoc).miejsce) : null;
}

/**
 * Czy pojazd „jedzie” (D15, §4.10): ruszył się w tej albo poprzedniej turze kierowcy. Ślad ruchu zapisuje
 * MG po każdym ruchu pojazdu w walce (`zapiszRuch`); poza walką pojazd nie ma tur — stoi.
 */
export function jedzie(pojazdDoc) {
  // Na planszy pościgu pojazd jedzie zawsze (PLAN §6.2.5).
  if (trybSceny(pojazdDoc?.parent) === "plansza") return true;
  const r = pojazdDoc?.actor?.flags?.[MODULE_ID]?.[FLAGA_RUCH];
  const walka = game.combat;
  if (!r || !walka?.started || r.walka !== walka.id) return false;
  return walka.round - r.runda <= 1;
}

/** MG: ślad ruchu pojazdu w walce (dla `jedzie`). */
export async function zapiszRuch(pojazdDoc) {
  const walka = game.combat;
  if (!walka?.started) return;
  const r = pojazdDoc.actor.flags?.[MODULE_ID]?.[FLAGA_RUCH];
  if (r?.walka === walka.id && r.runda === walka.round) return;
  await pojazdDoc.actor.update({ [`flags.${MODULE_ID}.${FLAGA_RUCH}`]: { walka: walka.id, runda: walka.round } });
}

/** Odległość (m) między krawędzią żetonu a obrysem pojazdu. */
export function odlegloscOdPojazdu(jadacyDoc, pojazdDoc) {
  const dane = daneNosnika(pojazdDoc.actor, pojazdDoc);
  const scena = pojazdDoc.parent;
  const kp = kratkaPojazdu(scena);
  if (!kp) return Infinity;
  const sc = pojazdDoc.getCenterPoint(pojazdDoc._source);
  const jc = jadacyDoc.getCenterPoint(jadacyDoc._source);
  const lok = obroc({ x: jc.x - sc.x, y: jc.y - sc.y }, -pojazdDoc._source.rotation);
  const dx = Math.max(0, Math.abs(lok.x) - dane.obrys.w * kp / 2);
  const dy = Math.max(0, Math.abs(lok.y) - dane.obrys.h * kp / 2);
  const pol = Math.min(jadacyDoc._source.width, jadacyDoc._source.height) * scena.grid.size / 2;
  const px = Math.max(0, Math.hypot(dx, dy) - pol);
  return px / kp * 1.5;
}

const ZACIETE_DRZWI = "Zacięte drzwi (awaria 6): otwarcie albo zamknięcie — Test SIŁ (Atletyka) albo ZRC (Zwinne dłonie) ST 10.";

/** Awaria 6 aktywna — czytane wprost z efektu (awarie.mjs importuje ten plik, więc nie odwrotnie). */
function zacieteDrzwi(pojazdDoc) {
  return !!pojazdDoc?.actor?.effects?.some(e => !e.disabled && e.flags?.[MODULE_ID]?.awariaPojazdu?.k20 === 6);
}

/** Szybkość chodu postaci w metrach. */
function szybkoscPostaci(actor) {
  return Math.max(0, Number(actor?.system?.attributes?.movement?.speeds?.walk) || 0);
}

/** Połowa Szybkości w dół do pełnych metrów (RAW: zaokrąglonej w dół). */
const polowa = actor => Math.floor(szybkoscPostaci(actor) / 2);

/**
 * Koszt przesiadki (D15). Odległość między miejscami w metrach, co najmniej jedna kratka.
 * @returns {{metry: number, ostroznie: number, szybko: number, wymagaTestu: boolean, zmianaRzedu: boolean}}
 */
export function kosztPrzesiadki(z, na, { jedzie: wRuchu = false, metryNaKratke = 1.5 } = {}) {
  const kratki = Math.max(1, Math.round(Math.hypot(z.x - na.x, z.y - na.y) / 1 * 2) / 2);
  const metry = Math.round(kratki * metryNaKratke * 10) / 10;
  const zmianaRzedu = z.rzad !== na.rzad || z.strefa !== na.strefa;
  return {
    metry, ostroznie: metry * 2, szybko: metry, zmianaRzedu,
    // Stojący pojazd: zawsze ×2 bez testu. Jadący: ×2 bez testu albo ×1 z testem; zmiana rzędu — test zawsze (WKK).
    wymagaTestu: wRuchu && zmianaRzedu
  };
}

/* -------------------------------------------- */
/*  Operacje MG                                  */
/* -------------------------------------------- */

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/** Wolne pole tuż przy pojeździe, po stronie miejsca; ściany i żetony omijane. */
function poleWysiadki(pojazdDoc, jadacyDoc, miejsce) {
  const scena = pojazdDoc.parent;
  const kratka = scena.grid.size;
  const kp = kratkaPojazdu(scena);
  const dane = daneNosnika(pojazdDoc.actor, pojazdDoc);
  const { w, h } = jazdaZetonu(jadacyDoc)?.rozmiar ?? { w: 1, h: 1 };
  // Kandydaci w kratkach pojazdu; rozmiar postaci jest w kratkach sceny.
  const bokPostaci = Math.max(w, h) / (skalaPojazdu(scena) || 1);
  const sc = pojazdDoc.getCenterPoint(pojazdDoc._source);
  const rot = pojazdDoc._source.rotation;
  const bok = (miejsce?.x ?? 1) >= 0 ? 1 : -1;
  const y0 = miejsce?.y ?? 0;
  const odstep = dane.obrys.w / 2 + bokPostaci / 2 + 0.05;
  const kandydaci = [];
  for (const s of [bok, -bok]) for (const dy of [0, 0.75, -0.75, 1.5, -1.5]) kandydaci.push({ x: s * odstep, y: y0 + dy });
  kandydaci.push({ x: 0, y: -(dane.obrys.h / 2 + bokPostaci / 2 + 0.05) }, { x: 0, y: dane.obrys.h / 2 + bokPostaci / 2 + 0.05 });
  const inne = scena.tokens.filter(t => t.id !== jadacyDoc.id && t.id !== pojazdDoc.id && !jazdaZetonu(t));
  const zajete = (x, y) => inne.some(t => {
    const s = t._source;
    return x < s.x + s.width * kratka && x + w * kratka > s.x && y < s.y + s.height * kratka && y + h * kratka > s.y;
  });
  for (const k of kandydaci) {
    const c = srodekMiejsca(sc, rot, k, kp);
    let { x, y } = naroznikDlaSrodka(c, w, h, kratka);
    const snap = scena.grid.getSnappedPoint({ x, y }, { mode: CONST.GRID_SNAPPING_MODES.TOP_LEFT_VERTEX });
    if (Number.isFinite(snap?.x)) ({ x, y } = snap);
    const srodek = { x: x + w * kratka / 2, y: y + h * kratka / 2 };
    const sciana = CONFIG.Canvas.polygonBackends.move.testCollision(sc, srodek, { type: "move", mode: "any" });
    if (!sciana && !zajete(x, y)) return { x, y };
  }
  const c = srodekMiejsca(sc, rot, kandydaci[0], kp);
  return naroznikDlaSrodka(c, w, h, kratka);
}

/**
 * Pamięć obsady (§4.15) pogodzona z tym, kto siedzi w tym żetonie: obecni nadpisują swój wpis i miejsce, które
 * zajmują; `zapomnij` — świadoma wysiadka; wpisy aktorów, których już nie ma, wypadają.
 * @returns {[string, string][]}
 */
export function pamiecPoUzgodnieniu(pojazdDoc, { zapomnij = [] } = {}) {
  const actor = pojazdDoc.actor;
  const obecni = jadacyPojazdu(pojazdDoc).map(t => [t.actor?.uuid, jazdaZetonu(t).miejsce]).filter(p => p[0]);
  const precz = new Set(zapomnij);
  const uuidy = new Set(obecni.map(p => p[0]));
  const miejsca = new Set(obecni.map(p => p[1]));
  const pamiec = [
    ...obsadaPojazdu(actor).filter(([u, m]) => !precz.has(u) && !uuidy.has(u) && !miejsca.has(m) && fromUuidSync(u)),
    ...obecni.filter(([u]) => !precz.has(u))
  ];
  const kolej = new Map(miejscaNosnika(actor, pojazdDoc).map((m, i) => [m.id, i]));
  return pamiec.sort((a, b) => (kolej.get(a[1]) ?? 999) - (kolej.get(b[1]) ?? 999));
}

const takieSame = (a, b) => a.length === b.length && a.every((x, i) => (Array.isArray(x) ? takieSame(x, b[i]) : x === b[i]));

/**
 * Załoga i dostęp z obecności liczone z pamięci obsady (D23 — ponad scenami: gracz, którego postać jedzie, ma
 * dostęp także wtedy, gdy jej żetonu nie ma na tej scenie). Kierowca i stanowiska → `crew`, reszta → `passengers`.
 */
async function zapiszZaloge(actor, pamiec, zmiany = {}) {
  const crew = [], passengers = [];
  const uzytkownicy = new Set();
  const pojazd = profilNosnika(actor) === "pojazd";
  const miejsca = miejscaNosnika(actor);
  for (const [uuid, mid] of pamiec) {
    const m = miejsca.find(x => x.id === mid);
    (m?.kierowca || m?.stanowisko ? crew : passengers).push(uuid);
    const a = fromUuidSync(uuid);
    // Wierzchowiec (W-U4): dostęp z obecności ma tylko jeździec, i tylko na wyszkolonym (albo ujeżdżonym przez siebie).
    if (!pojazd && !(m?.kierowca && wyszkolonyDla(actor, uuid))) continue;
    if (a) for (const u of game.users) if (!u.isGM && a.testUserPermission(u, "OWNER")) uzytkownicy.add(u.id);
  }
  const same = takieSame;
  // `crew`/`passengers` dnd5e ma tylko pojazd; wierzchowiec trzyma obsadę w pamięci (`obsada`).
  if (pojazd && !same(actor.system.crew?.value ?? [], crew)) zmiany["system.crew.value"] = crew;
  if (pojazd && !same(actor.system.passengers?.value ?? [], passengers)) zmiany["system.passengers.value"] = passengers;

  // Zapis jako lista par, nie obiekt: obiekt flagi scala się przy update, a w delcie żetonu
  // niepowiązanego `_del` nie usuwa klucza — lista podmienia się w całości.
  const dostep = new Map(dostepZObecnosci(actor));
  let zmianaDostepu = false;
  for (const uid of uzytkownicy) {
    if (dostep.has(uid)) continue;
    const poziom = actor.ownership[uid] ?? null;
    dostep.set(uid, poziom);
    zmianaDostepu = true;
    if ((poziom ?? actor.ownership.default ?? 0) < OWNER) zmiany[`ownership.${uid}`] = OWNER;
  }
  for (const [uid, poprzedni] of [...dostep]) {
    if (uzytkownicy.has(uid)) continue;
    dostep.delete(uid);
    zmianaDostepu = true;
    zmiany[`ownership.${uid}`] = poziomPrzywracany(actor, uid, poprzedni);
  }
  if (zmianaDostepu) zmiany[`flags.${MODULE_ID}.${FLAGA_DOSTEP}`] = [...dostep];
  if (Object.keys(zmiany).length) await actor.update(zmiany);
}

/**
 * MG: po każdej zmianie składu — pamięć obsady, `crew`/`passengers`, dostęp z obecności. Postać, która usiadła
 * tu pierwszy raz, znika z pamięci innych pojazdów (siedzi się w jednym).
 * @param {TokenDocument} pojazdDoc
 * @param {{zapomnij?: string[]}} [opcje]  uuid aktorów, którzy świadomie wysiedli
 */
export async function synchronizujZaloge(pojazdDoc, { zapomnij = [] } = {}) {
  const actor = pojazdDoc.actor;
  if (!actor) return;
  const stara = obsadaPojazdu(actor);
  const pamiec = pamiecPoUzgodnieniu(pojazdDoc, { zapomnij });
  const zmiany = takieSame(stara, pamiec) ? {} : { [`flags.${MODULE_ID}.${FLAGA_OBSADA}`]: pamiec };
  await zapiszZaloge(actor, pamiec, zmiany);
  const nowi = pamiec.map(p => p[0]).filter(u => !stara.some(p => p[0] === u));
  if (nowi.length) await zapomnijWInnych(actor, nowi);
  // Obsada się zmieniła: broń montowana idzie za strzelcem (`bron.mjs`).
  Hooks.callAll("neuroshima.pojazdZaloga", pojazdDoc);
}

/** Wszystkie aktory pojazdów: świata i niepowiązanych żetonów na scenach. */
function wszystkiePojazdy() {
  const out = new Set(game.actors.filter(a => profilNosnika(a)));
  for (const s of game.scenes) for (const t of s.tokens) if (!t.actorLink && jestZetonemNosnika(t)) out.add(t.actor);
  return [...out];
}

async function zapomnijWInnych(actor, uuidy) {
  for (const p of wszystkiePojazdy()) {
    if (p === actor) continue;
    const o = obsadaPojazdu(p);
    const n = o.filter(([u]) => !uuidy.includes(u));
    if (n.length !== o.length) await zapiszZaloge(p, n, { [`flags.${MODULE_ID}.${FLAGA_OBSADA}`]: n });
  }
}

/** Dostęp z obecności: lista `[userId, poprzedni poziom|null]`. */
export function dostepZObecnosci(actor) {
  const d = actor?.flags?.[MODULE_ID]?.[FLAGA_DOSTEP];
  return Array.isArray(d) ? d : [];
}

/**
 * Poziom, który wraca po wysiadce. Aktor świata: brak wpisu → `INHERIT` (-1, „domyślny”) — `_del` w mapie
 * `ownership` nie przechodzi walidacji („is not a mapping of user IDs…”). Aktor żetonu niepowiązanego (delta):
 * `_del` w delcie nie działa, a `INHERIT` zapętla `getUserLevel` rdzenia 14 (sprawdzone 2026-10-19) — więc
 * wpisujemy wprost poziom aktora bazowego.
 */
function poziomPrzywracany(actor, uid, poprzedni) {
  if (!actor.isToken) return poprzedni === null ? CONST.DOCUMENT_OWNERSHIP_LEVELS.INHERIT : poprzedni;
  if (poprzedni !== null && poprzedni >= 0) return poprzedni;
  const baza = game.actors.get(actor.token?.actorId ?? actor.id);
  return baza?.ownership?.[uid] ?? baza?.ownership?.default ?? 0;
}

/** MG: posadzenie na miejscu (rozmiar miejsca, kolejność rysowania nad pojazdem, flaga jazdy). */
export async function posadzGM(pojazdDoc, jadacyDoc, miejsce) {
  const poprzednia = jazdaZetonu(jadacyDoc);
  const rozmiar = poprzednia?.rozmiar ?? { w: jadacyDoc._source.width, h: jadacyDoc._source.height };
  const sort = poprzednia?.sort ?? jadacyDoc._source.sort;
  const scena = pojazdDoc.parent;
  const bok = rozmiarMiejsca(scena);
  const s = srodekMiejsca(pojazdDoc.getCenterPoint(pojazdDoc._source), pojazdDoc._source.rotation, miejsce, kratkaPojazdu(scena));
  const { x, y } = naroznikDlaSrodka(s, bok, bok, scena.grid.size);
  const obrot = miejsce.obrot ?? (poprzednia?.pojazd === pojazdDoc.id ? (poprzednia.obrot ?? 0) : 0);
  await jadacyDoc.update({
    [`flags.${MODULE_ID}.${FLAGA_JAZDA}`]: { pojazd: pojazdDoc.id, miejsce: miejsce.id, obrot, rozmiar, sort },
    sort: Math.max(sort, (pojazdDoc._source.sort ?? 0) + 1)
  });
  await pojazdDoc.parent.moveTokens({
    [jadacyDoc.id]: { destination: { x, y, width: bok, height: bok,
      rotation: normalizujKat(pojazdDoc._source.rotation + obrot), elevation: pojazdDoc._source.elevation, action: "displace" } }
  }, { animate: false, showRuler: false, method: "api" });
}

/**
 * MG: zdjęcie z pojazdu — rozmiar i kolejność wracają (D2), żeton na wolnym polu obok. `zapomnij: false` —
 * zdjęcie techniczne (usunięty pojazd, sprzątanie, schowek): pamięć obsady zostaje (§4.15).
 */
export async function wysadzGM(jadacyDoc, { cel = null, zapomnij = true } = {}) {
  const j = jazdaZetonu(jadacyDoc);
  if (!j) return null;
  const pojazd = nosnikJadacego(jadacyDoc);
  const miejsce = pojazd ? miejsceNosnika(pojazd, j.miejsce) : null;
  const { w, h } = j.rozmiar ?? { w: 1, h: 1 };
  const pole = cel ?? (pojazd ? poleWysiadki(pojazd, jadacyDoc, miejsce) : { x: jadacyDoc._source.x, y: jadacyDoc._source.y });
  await jadacyDoc.update({ [`flags.${MODULE_ID}.${FLAGA_JAZDA}`]: _del, sort: j.sort ?? jadacyDoc._source.sort });
  await jadacyDoc.parent.moveTokens({
    [jadacyDoc.id]: { destination: { x: pole.x, y: pole.y, width: w, height: h, action: "displace" } }
  }, { animate: false, showRuler: false, method: "api" });
  const uuid = jadacyDoc.actor?.uuid;
  if (pojazd) await synchronizujZaloge(pojazd, { zapomnij: zapomnij && uuid ? [uuid] : [] });
  return pole;
}

/* -------------------------------------------- */
/*  Prośby (MG)                                  */
/* -------------------------------------------- */

async function _docs(dane) {
  const pojazd = dane.pojazd ? await fromUuid(dane.pojazd) : null;
  const jadacy = dane.jadacy ? await fromUuid(dane.jadacy) : null;
  return { pojazd, jadacy };
}

function _moze(user, jadacy) {
  return !user || user.isGM || jadacy?.actor?.testUserPermission(user, "OWNER");
}

async function _karta(jadacy, tytul, linie, ostrzezenia = [], rodzaj = "info") {
  const html = kartaPostoju({ ikona: jadacy.texture?.src ?? jadacy.actor?.img, tytul, rodzaj, linie, ostrzezenia });
  return wyslijKarte(html, { actor: jadacy.actor });
}

async function _wsiadz(_n, dane, user) {
  const { pojazd, jadacy } = await _docs(dane);
  if (!pojazd || !jadacy || !jestZetonemNosnika(pojazd) || !_moze(user, jadacy)) return;
  if (jadacy.parent !== pojazd.parent) return ui.notifications.warn("Pojazd i postać są na różnych scenach.");
  if (!obrysDziala(pojazd.parent)) return ui.notifications.warn(`${pojazd.name}: na tej mapie pojazd jest znacznikiem — wsiada się na mapie taktycznej.`);
  const juz = nosnikJadacego(jadacy);
  if (juz && juz.id !== pojazd.id) return ui.notifications.warn(`${jadacy.name} siedzi w innym pojeździe — najpierw Wysiądź.`);
  if (juz) return _przesiadz(_n, { ...dane, tryb: "ostroznie" }, user);
  const miejsca = miejscaNosnika(pojazd.actor, pojazd);
  const zajete = zajeteMiejsca(pojazd);
  const miejsce = miejsca.find(m => m.id === dane.miejsce) ?? miejsca.find(m => !zajete.has(m.id));
  if (!miejsce) return ui.notifications.warn(`${pojazd.name}: brak wolnego miejsca.`);
  if (zajete.has(miejsce.id)) return ui.notifications.warn(`${pojazd.name}: to miejsce jest zajęte.`);

  const odl = odlegloscOdPojazdu(jadacy, pojazd);
  await posadzGM(pojazd, jadacy, miejsce);
  await synchronizujZaloge(pojazd);
  if (profilNosnika(pojazd.actor) === "wierzchowiec") return _kartaDosiadania(pojazd, jadacy, miejsce, odl);

  const ostrz = [];
  if (odl > ZASIEG_WSIADANIA_M + 0.2) ostrz.push(`Postać stała ${odl.toFixed(1)} m od pojazdu (RAW: do 1,5 m) — MG cofa, jeśli to się nie wydarzyło.`);
  if (jedzie(pojazd)) ostrz.push("Pojazd jedzie — wskakiwanie do jadącego pojazdu rozstrzyga MG.");
  if (zacieteDrzwi(pojazd)) ostrz.push(ZACIETE_DRZWI);
  const pol = polowa(jadacy.actor);
  const linie = [`Wsiada do <strong>${esc(pojazd.name)}</strong> — ${miejsce.kierowca ? "<strong>za kierownicę</strong>" : `miejsce: ${esc(opisMiejsca(pojazd.actor, miejsce))}`}.`];
  if (miejsce.kierowca) {
    const v = Number(pojazd.actor.system.attributes.movement?.speeds?.walk) || 0;
    linie.push(`Koszt (s. 260): połowa Szybkości — <strong>${pol} m</strong>; reszta ruchu w tej turze przepada. Odtąd jedziesz Szybkością pojazdu${v ? ` (${v} m)` : ""}.`);
    if (danePojazdu(pojazd.actor).katalog.silnik) linie.push("Silnik: uruchomienie to <strong>akcja</strong> (Uruchom na karcie pojazdu). Kierownica wymaga dwóch wolnych rąk.");
    else linie.push("Pojazd mięśniowy: jedzie ruchem kierowcy (Przyspieszenie daje więcej).");
  } else {
    linie.push(`Koszt (s. 261): bez dodatkowego ruchu; drzwi, fotel albo okno — połowa Szybkości (<strong>${pol} m</strong>).`);
  }
  await _karta(jadacy, "Wsiadanie", linie, ostrz);
}

async function _wysiadz(_n, dane, user) {
  const { jadacy } = await _docs(dane);
  if (!jadacy || !_moze(user, jadacy)) return;
  const pojazd = nosnikJadacego(jadacy);
  if (!pojazd) return;
  const miejsce = miejsceNosnika(pojazd, jazdaZetonu(jadacy).miejsce);
  const wRuchu = jedzie(pojazd);
  await wysadzGM(jadacy);
  const pol = polowa(jadacy.actor);
  if (profilNosnika(pojazd.actor) === "wierzchowiec") {
    return _karta(jadacy, "Zsiadanie", [`Zsiada z <strong>${esc(pojazd.name)}</strong>.`,
      maJezdzca(jadacy.actor) ? "Koszt (Jeździec, s. 97): <strong>1,5 m</strong> ruchu." : `Koszt (s. 257): połowa Szybkości — <strong>${pol} m</strong>.`]);
  }
  const linie = [`Wysiada z <strong>${esc(pojazd.name)}</strong>.`,
    miejsce?.kierowca
      ? `Koszt (s. 260): połowa Szybkości — <strong>${pol} m</strong>.`
      : `Koszt (s. 261): bez dodatkowego ruchu; zamknięte drzwi — połowa Szybkości (<strong>${pol} m</strong>).`];
  const ostrz = wRuchu ? ["Pojazd jedzie — wyskoczenie z jadącego pojazdu to Wypadanie (3k6, Powalenie). MG: przycisk Wypadnięcie na karcie pojazdu."] : [];
  if (zacieteDrzwi(pojazd)) ostrz.push(ZACIETE_DRZWI);
  await _karta(jadacy, "Wysiadanie", linie, ostrz);
}

async function _przesiadz(_n, dane, user) {
  const { jadacy } = await _docs(dane);
  if (!jadacy || !_moze(user, jadacy)) return;
  const pojazd = nosnikJadacego(jadacy);
  if (!pojazd) return;
  const z = miejsceNosnika(pojazd, jazdaZetonu(jadacy).miejsce);
  const na = miejsceNosnika(pojazd, dane.miejsce);
  if (!na || na.id === z?.id) return;
  if (zajeteMiejsca(pojazd).has(na.id)) return ui.notifications.warn(`${pojazd.name}: to miejsce jest zajęte.`);
  const wRuchu = jedzie(pojazd);
  const k = kosztPrzesiadki(z, na, { jedzie: wRuchu });
  await posadzGM(pojazd, jadacy, na);
  await synchronizujZaloge(pojazd);
  const test = Number.isFinite(dane.test) ? dane.test : null;
  const linie = [`Przesiada się w <strong>${esc(pojazd.name)}</strong>: ${esc(opisMiejsca(pojazd.actor, z))} → ${esc(opisMiejsca(pojazd.actor, na))}.`];
  const ostrz = [];
  let rodzaj = "info";
  if (!wRuchu) linie.push(`Pojazd stoi — koszt <strong>${k.ostroznie} m</strong> (odległość ×2), bez testu.`);
  else if (dane.tryb === "szybko" || k.wymagaTestu) {
    const koszt = dane.tryb === "szybko" ? k.szybko : k.ostroznie;
    linie.push(`Pojazd jedzie — koszt <strong>${koszt} m</strong>${k.zmianaRzedu ? ", zmiana rzędu (WKK: test zawsze)" : ""}; ZRC (Akrobatyka) ST ${ST_PRZESIADKI}: ${test ?? "—"}.`);
    if (test !== null && test < ST_PRZESIADKI) {
      rodzaj = "porazka";
      if (ST_PRZESIADKI - test >= 5) {
        await jadacy.actor?.toggleStatusEffect?.("prone", { active: true });
        linie.push("Porażka o 5 lub więcej — <strong>Powalenie</strong> na nowym miejscu.");
      } else linie.push("Porażka — przesiadka i tak się udała (porażka o mniej niż 5 bez skutku).");
    } else if (test !== null) rodzaj = "sukces";
    if (test === null) ostrz.push("Brak wyniku testu — MG rozstrzyga.");
  } else linie.push(`Pojazd jedzie — ostrożnie: koszt <strong>${k.ostroznie} m</strong> (odległość ×2), bez testu.`);
  await _karta(jadacy, "Przesiadka", linie, ostrz, rodzaj);
}

/** MG: wypadnięcie z pojazdu — 3k6 obuchowych i Powalenie (s. 261), bez RO: stosowane od razu. */
export async function wypadnij(jadacyDoc, { powod = "" } = {}) {
  if (!game.user.isGM) return doMG("pojazd.wypadnij", { jadacy: jadacyDoc.uuid, powod });
  const pojazd = nosnikJadacego(jadacyDoc);
  if (!pojazd) return;
  if (profilNosnika(pojazd.actor) === "wierzchowiec") return spadnijZWierzchowca(jadacyDoc, { powod });
  // Plansza pościgu (D38, s. 266): ląduje znacznik za pojazdem i odtąd dryfuje z drogą (`poscig-tura.mjs`).
  const plansza = trybSceny(pojazd.parent) === "plansza";
  let cel = null;
  if (plansza) {
    const g = pojazd.parent.grid.size, src = pojazd._source;
    const { w, h } = jazdaZetonu(jadacyDoc)?.rozmiar ?? { w: 1, h: 1 };
    const tor = xNaTor(src.x + src.width * g / 2);
    cel = { x: Math.round(torX(tor - 1) - w * g / 2), y: Math.round(src.y + src.height * g / 2 - h * g / 2) };
  }
  await wysadzGM(jadacyDoc, { cel });
  if (plansza) await jadacyDoc.setFlag(MODULE_ID, "dryf", true);
  const roll = await new Roll("3d6").evaluate();
  const actor = jadacyDoc.actor;
  await actor?.applyDamage?.([{ value: roll.total, type: "bludgeoning", properties: new Set() }]);
  await actor?.toggleStatusEffect?.("prone", { active: true });
  const html = kartaPostoju({
    ikona: jadacyDoc.texture?.src, tytul: "Wypadnięcie z pojazdu", rodzaj: "porazka",
    linie: [`${esc(jadacyDoc.name)} wypada z <strong>${esc(pojazd.name)}</strong>${powod ? ` (${esc(powod)})` : ""}.`,
      `<strong>${roll.total}</strong> obrażeń obuchowych (3k6) i <strong>Powalenie</strong> — zastosowane (s. 261).`]
  });
  await wyslijKarte(html, { actor, rolls: [roll] });
}

/* -------------------------------------------- */
/*  Wierzchowce (§6.3, W2, W4)                   */
/* -------------------------------------------- */

const ROZMIARY = ["tiny", "sm", "med", "lg", "huge", "grg"];

/** Jeździec (Wyjadacz Zwiadowcy, s. 97): kieruje bez rąk, dosiada za 1,5 m. */
export function maJezdzca(actor) {
  return !!actor?.items?.some(i => i.flags?.[MODULE_ID]?.abilityId === "jezdziec");
}

/** Wyszkolony dla tego jeźdźca (W-U3): flaga `wyszkolony` albo ujeżdżony przez niego (Rodeo, lista `ujezdzony`). */
export function wyszkolonyDla(actor, jezdziecUuid) {
  const w = wierzchowiecAktora(actor);
  return !!w && (!!w.wyszkolony || (Array.isArray(w.ujezdzony) && w.ujezdzony.includes(jezdziecUuid)));
}

/** Oznaczenia dosiadania (W-U2, W-U3, D43) — nic nie blokują. Czysta względem dokumentów (bierze aktorów). */
export function oznaczeniaDosiadania(wierzchowiec, jezdziec, { kierujacy = true, wolneRece = 2, jezdziecZdolnosc = false } = {}) {
  const out = [];
  const rw = ROZMIARY.indexOf(wierzchowiec?.system?.traits?.size), rj = ROZMIARY.indexOf(jezdziec?.system?.traits?.size ?? "med");
  if (rw >= 0 && rj >= 0 && rw - rj < 1) out.push("Wierzchowiec musi być co najmniej o rozmiar większy od jeźdźca (s. 257).");
  if (kierujacy && !wyszkolonyDla(wierzchowiec, jezdziec?.uuid)) out.push("Niewyszkolony wierzchowiec — jeździec jedzie, ale ruchem i turą wierzchowca steruje MG (s. 257, W-U4).");
  if (kierujacy && !jezdziecZdolnosc && wolneRece < 1) out.push("Wodze wymagają jednej wolnej ręki (D43) — Jeździec kieruje bez rąk.");
  return out;
}

async function _kartaDosiadania(nosnik, jadacy, miejsce, odl) {
  const jezdziec = maJezdzca(jadacy.actor);
  const zasieg = jezdziec ? 1.5 : ZASIEG_WSIADANIA_M;
  const ostrz = oznaczeniaDosiadania(nosnik.actor, jadacy.actor,
    { kierujacy: !!miejsce.kierowca, wolneRece: freeHands(jadacy.actor), jezdziecZdolnosc: jezdziec });
  if (odl > zasieg + 0.2) ostrz.push(`Postać stała ${odl.toFixed(1)} m od wierzchowca (RAW: w zasięgu 1,5 m) — MG cofa, jeśli to się nie wydarzyło.`);
  const linie = [`Dosiada <strong>${esc(nosnik.name)}</strong> — ${miejsce.kierowca ? "<strong>jako jeździec</strong>" : "jako pasażer"}.`,
    jezdziec ? "Koszt (Jeździec, s. 97): <strong>1,5 m</strong> ruchu." : `Koszt (s. 257): połowa Szybkości — <strong>${polowa(jadacy.actor)} m</strong>.`];
  if (miejsce.kierowca && wyszkolonyDla(nosnik.actor, jadacy.actor?.uuid)) {
    linie.push("Wyszkolony wierzchowiec: Inicjatywa jeźdźca, rusza się w jego turze i ma tylko Bieganie, Przyspieszenie, Odstąpienie albo Unikanie (s. 29–30, 257) — paleta na HUD-zie. Może działać już w turze dosiadania.");
  }
  return _karta(jadacy, "Dosiadanie", linie, ostrz);
}

/**
 * MG: spadnięcie z wierzchowca (W4, s. 257) — ścieżka wypadania części 1 bez 3k6: 1,5 m obok, Powalenie, „możliwe
 * obrażenia” przyciskiem MG.
 */
export async function spadnijZWierzchowca(jadacyDoc, { powod = "" } = {}) {
  if (!game.user.isGM) return doMG("pojazd.wypadnij", { jadacy: jadacyDoc.uuid, powod });
  const nosnik = nosnikJadacego(jadacyDoc);
  if (!nosnik) return;
  await wysadzGM(jadacyDoc);
  const actor = jadacyDoc.actor;
  await actor?.toggleStatusEffect?.("prone", { active: true });
  await wyslijKarte(kartaPostoju({ ikona: jadacyDoc.texture?.src, tytul: "Spadnięcie z wierzchowca", rodzaj: "porazka",
    linie: [`${esc(jadacyDoc.name)} spada z <strong>${esc(nosnik.name)}</strong>${powod ? ` (${esc(powod)})` : ""}: 1,5 m obok, <strong>Powalenie</strong> — zastosowane (s. 257).`,
      "Możliwe obrażenia — wg MG."],
    przyciski: [{ akcja: "pojazd.obrazeniaUpadku", label: "Obrażenia: 1k6", ikona: "fa-solid fa-person-falling-burst", gm: true,
      dane: { aktor: actor?.uuid, wzor: "1d6" } }] }), { actor });
}

/**
 * Karta utrzymania się w siodle (W4, s. 257): przemieszczenie wierzchowca wbrew jego woli albo Powalenie jeźdźca lub
 * wierzchowca → RO ZRC ST 10 każdego jadącego; porażka — spadnięcie (przycisk karty). Aktywny MG wystawia; nic nie
 * dzieje się samo.
 */
export async function kartaUtrzymania(nosnikDoc, { powod = "", tylko = null } = {}) {
  const jadacy = jadacyPojazdu(nosnikDoc).filter(t => !tylko || t.id === tylko.id);
  if (!jadacy.length) return null;
  return wyslijKarte(kartaPostoju({ ikona: nosnikDoc.texture?.src, tytul: `Utrzymać się na ${nosnikDoc.name}?`, rodzaj: "test",
    linie: [`${esc(powod || "Wierzchowiec szarpnięty")} — RO ZRC ST 10, porażka: spadnięcie 1,5 m obok i Powalenie (s. 257).`],
    przyciski: jadacy.map(t => ({ akcja: "pojazd.utrzymanie", label: `${t.name}: RO ZRC ST 10`, ikona: "fa-solid fa-horse",
      dane: { jadacy: t.uuid, powod } })) }), { actor: nosnikDoc.actor });
}

/** Jadący: RO ZRC ST 10 z karty utrzymania; porażka — spadnięcie przez MG. */
async function _utrzymanie(_ev, btn) {
  const t = await fromUuid(btn.dataset.jadacy);
  if (!t?.actor?.isOwner) return ui.notifications.warn("Rzut wykonuje właściciel jeźdźca.");
  const rolls = await t.actor.rollSavingThrow({ ability: "dex", target: 10 }, {}, { data: { flavor: `${t.name}: utrzymać się w siodle — RO ZRC ST 10 (s. 257)` } });
  const r = Array.isArray(rolls) ? rolls[0] : rolls;
  if (!r) return;
  btn.disabled = true;
  if (r.total < 10) await wypadnij(t, { powod: btn.dataset.powod || "nie utrzymał się w siodle" });
}

/** Aktywny MG: Powalenie jeźdźca albo wierzchowca, wierzchowiec przy 0 PW → karta utrzymania. */
function _poPowaleniu(actor, powod) {
  if (!game.user.isActiveGM || !actor) return;
  for (const s of game.scenes) for (const t of s.tokens) {
    if (t.actor !== actor && !(t.actorLink && t.actorId === actor.id)) continue;
    if (profilNosnika(t.actor) === "wierzchowiec" && jadacyPojazdu(t).length) kartaUtrzymania(t, { powod: `${t.name}: ${powod}` });
    const n = nosnikJadacego(t);
    if (n && profilNosnika(n.actor) === "wierzchowiec") kartaUtrzymania(n, { powod: `${t.name}: ${powod}`, tylko: t });
  }
}

/** MG: wszyscy jadący wysiadają obok (przycisk na karcie pojazdu, sprzątanie po awarii klienta). */
export async function wysadzWszystkich(pojazdDoc) {
  if (!game.user.isGM) return;
  for (const t of jadacyPojazdu(pojazdDoc)) await wysadzGM(t);
  await synchronizujZaloge(pojazdDoc);
}

/** Opis miejsca do kart i okna: „Kabina, rząd 2 — kierowca”. */
export function opisMiejsca(pojazdActor, miejsce) {
  if (!miejsce) return "—";
  const strefa = daneNosnika(pojazdActor)?.strefy.find(s => s.id === miejsce.strefa);
  const czesci = [strefa?.nazwa ?? miejsce.strefa];
  const wStrefie = miejscaNosnika(pojazdActor).filter(m => m.strefa === miejsce.strefa);
  const rzedy = [...new Set(wStrefie.map(m => m.rzad))];
  if (rzedy.length > 1) czesci.push(`rząd ${rzedy.indexOf(miejsce.rzad) + 1}`);
  if (miejsce.kierowca) czesci.push(profilNosnika(pojazdActor) === "wierzchowiec" ? "jeździec" : "kierowca");
  if (miejsce.stanowisko) czesci.push("stanowisko");
  return czesci.join(", ");
}

/* -------------------------------------------- */
/*  API klienta                                  */
/* -------------------------------------------- */

/** Wsiądź na miejsce (albo pierwsze wolne). */
export function wsiadz(pojazdDoc, jadacyDoc, miejsceId = null) {
  return doMG("pojazd.wsiadz", { pojazd: pojazdDoc.uuid, jadacy: jadacyDoc.uuid, miejsce: miejsceId }, { nosiciel: jadacyDoc.actor });
}

/** Wysiądź obok pojazdu. */
export function wysiadz(jadacyDoc) {
  return doMG("pojazd.wysiadz", { jadacy: jadacyDoc.uuid }, { nosiciel: jadacyDoc.actor });
}

/**
 * Przesiądź się. `tryb`: „ostroznie” (×2) albo „szybko” (×1 z testem). Test rzuca gracz u siebie.
 */
export async function przesiadz(jadacyDoc, miejsceId, { tryb = "ostroznie" } = {}) {
  const pojazd = nosnikJadacego(jadacyDoc);
  if (!pojazd) return;
  const z = miejsceNosnika(pojazd, jazdaZetonu(jadacyDoc).miejsce);
  const na = miejsceNosnika(pojazd, miejsceId);
  if (!z || !na) return;
  const k = kosztPrzesiadki(z, na, { jedzie: jedzie(pojazd) });
  let test = null;
  if (jedzie(pojazd) && (tryb === "szybko" || k.wymagaTestu)) {
    const rolls = await jadacyDoc.actor?.rollSkill?.({ skill: "akr", target: ST_PRZESIADKI },
      {}, { data: { flavor: `Przesiadka w jadącym pojeździe — ZRC (Akrobatyka) ST ${ST_PRZESIADKI}` } });
    const roll = Array.isArray(rolls) ? rolls[0] : rolls;
    if (!roll) return;
    test = roll.total;
  }
  return doMG("pojazd.przesiadz", { jadacy: jadacyDoc.uuid, miejsce: miejsceId, tryb, test }, { nosiciel: jadacyDoc.actor });
}

export function registerJadacy() {
  zarejestrujProsbe("pojazd.wsiadz", _wsiadz);
  zarejestrujProsbe("pojazd.wysiadz", _wysiadz);
  zarejestrujProsbe("pojazd.przesiadz", _przesiadz);
  // W4: utrzymanie się w siodle po Powaleniu jeźdźca albo wierzchowca i przy 0 PW wierzchowca.
  zarejestrujAkcje("pojazd.utrzymanie", _utrzymanie);
  Hooks.on("createActiveEffect", e => {
    if (e.parent instanceof Actor && e.statuses?.has?.("prone")) _poPowaleniu(e.parent, "Powalenie");
  });
  Hooks.on("updateActor", (actor, ch) => {
    if (foundry.utils.getProperty(ch, "system.attributes.hp.value") === 0 && profilNosnika(actor) === "wierzchowiec") _poPowaleniu(actor, "wierzchowiec pada (0 PW)");
  });
  // Spadnięcie z wierzchowca: „możliwe obrażenia” — przycisk MG (W4).
  zarejestrujAkcje("pojazd.obrazeniaUpadku", async (_ev, btn) => {
    if (!game.user.isGM) return;
    const a = await fromUuid(btn.dataset.aktor);
    if (!a) return;
    const r = await new Roll(btn.dataset.wzor || "1d6").evaluate();
    await a.applyDamage([{ value: r.total, type: "bludgeoning", properties: new Set() }]);
    btn.disabled = true;
    await wyslijKarte(kartaPostoju({ ikona: a.img, tytul: "Obrażenia od upadku", rodzaj: "porazka", linie: [`${esc(a.name)}: <strong>${r.total}</strong> obuchowych — zastosowane.`] }),
      { actor: a, rolls: [r] });
  });
  zarejestrujProsbe("pojazd.wypadnij", async (_n, dane) => {
    const { jadacy } = await _docs(dane);
    if (jadacy) await wypadnij(jadacy, { powod: dane.powod });
  });

  // WKK: upuszczone w pojeździe ląduje w ładowni, którą jadący i tak widzi (§4.4).
  zarejestrujLadownieUpuszczenia((actor, scena) => {
    const zeton = actor.isToken ? actor.token : scena.tokens.find(t => t.actorLink && t.actorId === actor.id && jazdaZetonu(t));
    if (!zeton || zeton.parent !== scena) return null;
    return pojazdJadacego(zeton)?.actor ?? null;
  });

  // Usunięcie pojazdu: jadący wracają do swojego rozmiaru obok (§9 ryzyka). Pola liczy `preDeleteToken` (pojazd jeszcze
  // stoi), wysadza `deleteToken`: rdzeń zdejmuje z kolekcji całą paczkę przed pierwszym hakiem, więc jadący usunięci
  // razem z pojazdem (zaznaczony pojazd z załogą + Delete) już nie istnieją i nie dostają zapisu w próżnię.
  const doWysadzenia = new Map();
  Hooks.on("preDeleteToken", (doc, options) => {
    if (!game.user.isActiveGM || !jestZetonemNosnika(doc)) return;
    // Wycięcie i wklejenie na inną scenę: jadący jadą w schowku albo zajmuje się nimi `schowek.mjs`.
    if (options.replacements?.[doc.id]) return;
    const jadacy = jadacyPojazdu(doc);
    if (jadacy.length) doWysadzenia.set(doc.uuid, jadacy.map(t => [t, poleWysiadki(doc, t, miejsceNosnika(doc, jazdaZetonu(t).miejsce))]));
  });
  Hooks.on("deleteToken", async doc => {
    const pozycje = doWysadzenia.get(doc.uuid);
    if (!pozycje) return;
    doWysadzenia.delete(doc.uuid);
    for (const [t, pole] of pozycje) if (t.parent?.tokens.has(t.id)) await wysadzGM(t, { cel: pole, zapomnij: false });
  });

  // Start świata: jadący bez pojazdu na scenie wracają do rozmiaru (awaria klienta, skopiowana scena),
  // a na scenie, na której pojazd jest znacznikiem (np. zmieniona siatka), wysiadają obok niego.
  Hooks.once("ready", async () => {
    if (!game.user.isActiveGM) return;
    for (const scena of game.scenes) {
      const dziala = obrysDziala(scena);
      for (const t of scena.tokens) {
        const j = jazdaZetonu(t);
        if (!j) continue;
        if (!nosnikJadacego(t)) await wysadzGM(t, { cel: { x: t._source.x, y: t._source.y }, zapomnij: false });
        else if (!dziala) await wysadzGM(t, { zapomnij: false });
      }
    }
  });
}
