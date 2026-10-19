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
import { kartaPostoju, wyslijKarte } from "../postoj/karty.mjs";
import { zarejestrujLadownieUpuszczenia } from "../actors/ground-items.mjs";
import {
  MODULE_ID, FLAGA_JAZDA, danePojazdu, jadacyPojazdu, jazdaZetonu, jestZetonemPojazdu, miejscaPojazdu,
  miejsceOId, pojazdJadacego
} from "./stan.mjs";
import {
  ROZMIAR_MIEJSCA, naroznikDlaSrodka, normalizujKat, obroc, srodekMiejsca
} from "./geometria.mjs";

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
  const kier = miejscaPojazdu(pojazdDoc.actor).find(m => m.kierowca);
  return kier ? zajeteMiejsca(pojazdDoc).get(kier.id) ?? null : null;
}

/** Miejsce jadącego (obiekt miejsca) albo `null`. */
export function miejsceJadacego(jadacyDoc) {
  const p = pojazdJadacego(jadacyDoc);
  return p ? miejsceOId(p.actor, jazdaZetonu(jadacyDoc).miejsce) : null;
}

/**
 * Czy pojazd „jedzie” (D15, §4.10): ruszył się w tej albo poprzedniej turze kierowcy. Ślad ruchu zapisuje
 * MG po każdym ruchu pojazdu w walce (`zapiszRuch`); poza walką pojazd nie ma tur — stoi.
 */
export function jedzie(pojazdDoc) {
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
  const dane = danePojazdu(pojazdDoc.actor);
  const kratka = pojazdDoc.parent.grid.size;
  const sc = pojazdDoc.getCenterPoint(pojazdDoc._source);
  const jc = jadacyDoc.getCenterPoint(jadacyDoc._source);
  const lok = obroc({ x: jc.x - sc.x, y: jc.y - sc.y }, -pojazdDoc._source.rotation);
  const dx = Math.max(0, Math.abs(lok.x) - dane.obrys.w * kratka / 2);
  const dy = Math.max(0, Math.abs(lok.y) - dane.obrys.h * kratka / 2);
  const pol = Math.min(jadacyDoc._source.width, jadacyDoc._source.height) * kratka / 2;
  const px = Math.max(0, Math.hypot(dx, dy) - pol);
  return px / kratka * pojazdDoc.parent.grid.distance;
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
  const dane = danePojazdu(pojazdDoc.actor);
  const { w, h } = jazdaZetonu(jadacyDoc)?.rozmiar ?? { w: 1, h: 1 };
  const sc = pojazdDoc.getCenterPoint(pojazdDoc._source);
  const rot = pojazdDoc._source.rotation;
  const bok = (miejsce?.x ?? 1) >= 0 ? 1 : -1;
  const y0 = miejsce?.y ?? 0;
  const odstep = dane.obrys.w / 2 + Math.max(w, h) / 2 + 0.05;
  const kandydaci = [];
  for (const s of [bok, -bok]) for (const dy of [0, 0.75, -0.75, 1.5, -1.5]) kandydaci.push({ x: s * odstep, y: y0 + dy });
  kandydaci.push({ x: 0, y: -(dane.obrys.h / 2 + Math.max(w, h) / 2 + 0.05) }, { x: 0, y: dane.obrys.h / 2 + Math.max(w, h) / 2 + 0.05 });
  const inne = scena.tokens.filter(t => t.id !== jadacyDoc.id && t.id !== pojazdDoc.id && !jazdaZetonu(t));
  const zajete = (x, y) => inne.some(t => {
    const s = t._source;
    return x < s.x + s.width * kratka && x + w * kratka > s.x && y < s.y + s.height * kratka && y + h * kratka > s.y;
  });
  for (const k of kandydaci) {
    const c = srodekMiejsca(sc, rot, k, kratka);
    let { x, y } = naroznikDlaSrodka(c, w, h, kratka);
    const snap = scena.grid.getSnappedPoint({ x, y }, { mode: CONST.GRID_SNAPPING_MODES.TOP_LEFT_VERTEX });
    if (Number.isFinite(snap?.x)) ({ x, y } = snap);
    const srodek = { x: x + w * kratka / 2, y: y + h * kratka / 2 };
    const sciana = CONFIG.Canvas.polygonBackends.move.testCollision(sc, srodek, { type: "move", mode: "any" });
    if (!sciana && !zajete(x, y)) return { x, y };
  }
  const c = srodekMiejsca(sc, rot, kandydaci[0], kratka);
  return naroznikDlaSrodka(c, w, h, kratka);
}

/**
 * Lista `crew`/`passengers` pojazdu (nośnik dnd5e, z którego korzysta pościg) i dostęp z obecności.
 * Kierowca i stanowiska → załoga, reszta → pasażerowie.
 */
export async function synchronizujZaloge(pojazdDoc) {
  const actor = pojazdDoc.actor;
  if (!actor) return;
  const crew = [], passengers = [];
  const uzytkownicy = new Set();
  for (const t of jadacyPojazdu(pojazdDoc)) {
    const m = miejsceOId(actor, jazdaZetonu(t).miejsce);
    const uuid = t.actor?.uuid;
    if (uuid) (m?.kierowca || m?.stanowisko ? crew : passengers).push(uuid);
    for (const u of game.users) if (!u.isGM && t.actor?.testUserPermission(u, "OWNER")) uzytkownicy.add(u.id);
  }
  const zmiany = {};
  const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  if (!same(actor.system.crew?.value ?? [], crew)) zmiany["system.crew.value"] = crew;
  if (!same(actor.system.passengers?.value ?? [], passengers)) zmiany["system.passengers.value"] = passengers;

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
  // Obsada się zmieniła: broń montowana idzie za strzelcem (`bron.mjs`).
  Hooks.callAll("neuroshima.pojazdZaloga", pojazdDoc);
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
  const kratka = pojazdDoc.parent.grid.size;
  const s = srodekMiejsca(pojazdDoc.getCenterPoint(pojazdDoc._source), pojazdDoc._source.rotation, miejsce, kratka);
  const { x, y } = naroznikDlaSrodka(s, ROZMIAR_MIEJSCA, ROZMIAR_MIEJSCA, kratka);
  const obrot = poprzednia?.pojazd === pojazdDoc.id ? (poprzednia.obrot ?? 0) : 0;
  await jadacyDoc.update({
    [`flags.${MODULE_ID}.${FLAGA_JAZDA}`]: { pojazd: pojazdDoc.id, miejsce: miejsce.id, obrot, rozmiar, sort },
    sort: Math.max(sort, (pojazdDoc._source.sort ?? 0) + 1)
  });
  await pojazdDoc.parent.moveTokens({
    [jadacyDoc.id]: { destination: { x, y, width: ROZMIAR_MIEJSCA, height: ROZMIAR_MIEJSCA,
      rotation: normalizujKat(pojazdDoc._source.rotation + obrot), elevation: pojazdDoc._source.elevation, action: "displace" } }
  }, { animate: false, showRuler: false, method: "api" });
}

/** MG: zdjęcie z pojazdu — rozmiar i kolejność wracają (D2), żeton na wolnym polu obok. */
export async function wysadzGM(jadacyDoc, { cel = null } = {}) {
  const j = jazdaZetonu(jadacyDoc);
  if (!j) return null;
  const pojazd = pojazdJadacego(jadacyDoc);
  const miejsce = pojazd ? miejsceOId(pojazd.actor, j.miejsce) : null;
  const { w, h } = j.rozmiar ?? { w: 1, h: 1 };
  const pole = cel ?? (pojazd ? poleWysiadki(pojazd, jadacyDoc, miejsce) : { x: jadacyDoc._source.x, y: jadacyDoc._source.y });
  await jadacyDoc.update({ [`flags.${MODULE_ID}.${FLAGA_JAZDA}`]: _del, sort: j.sort ?? jadacyDoc._source.sort });
  await jadacyDoc.parent.moveTokens({
    [jadacyDoc.id]: { destination: { x: pole.x, y: pole.y, width: w, height: h, action: "displace" } }
  }, { animate: false, showRuler: false, method: "api" });
  if (pojazd) await synchronizujZaloge(pojazd);
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
  if (!pojazd || !jadacy || !jestZetonemPojazdu(pojazd) || !_moze(user, jadacy)) return;
  if (jadacy.parent !== pojazd.parent) return ui.notifications.warn("Pojazd i postać są na różnych scenach.");
  const juz = pojazdJadacego(jadacy);
  if (juz && juz.id !== pojazd.id) return ui.notifications.warn(`${jadacy.name} siedzi w innym pojeździe — najpierw Wysiądź.`);
  if (juz) return _przesiadz(_n, { ...dane, tryb: "ostroznie" }, user);
  const miejsca = miejscaPojazdu(pojazd.actor);
  const zajete = zajeteMiejsca(pojazd);
  const miejsce = miejsca.find(m => m.id === dane.miejsce) ?? miejsca.find(m => !zajete.has(m.id));
  if (!miejsce) return ui.notifications.warn(`${pojazd.name}: brak wolnego miejsca.`);
  if (zajete.has(miejsce.id)) return ui.notifications.warn(`${pojazd.name}: to miejsce jest zajęte.`);

  const odl = odlegloscOdPojazdu(jadacy, pojazd);
  await posadzGM(pojazd, jadacy, miejsce);
  await synchronizujZaloge(pojazd);

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
  const pojazd = pojazdJadacego(jadacy);
  if (!pojazd) return;
  const miejsce = miejsceOId(pojazd.actor, jazdaZetonu(jadacy).miejsce);
  const wRuchu = jedzie(pojazd);
  await wysadzGM(jadacy);
  const pol = polowa(jadacy.actor);
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
  const pojazd = pojazdJadacego(jadacy);
  if (!pojazd) return;
  const z = miejsceOId(pojazd.actor, jazdaZetonu(jadacy).miejsce);
  const na = miejsceOId(pojazd.actor, dane.miejsce);
  if (!na || na.id === z?.id) return;
  if (zajeteMiejsca(pojazd).has(na.id)) return ui.notifications.warn(`${pojazd.name}: to miejsce jest zajęte.`);
  const wRuchu = jedzie(pojazd);
  const k = kosztPrzesiadki(z, na, { jedzie: wRuchu, metryNaKratke: pojazd.parent.grid.distance });
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
  const pojazd = pojazdJadacego(jadacyDoc);
  if (!pojazd) return;
  await wysadzGM(jadacyDoc);
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

/** MG: wszyscy jadący wysiadają obok (przycisk na karcie pojazdu, sprzątanie po awarii klienta). */
export async function wysadzWszystkich(pojazdDoc) {
  if (!game.user.isGM) return;
  for (const t of jadacyPojazdu(pojazdDoc)) await wysadzGM(t);
  await synchronizujZaloge(pojazdDoc);
}

/** Opis miejsca do kart i okna: „Kabina, rząd 2 — kierowca”. */
export function opisMiejsca(pojazdActor, miejsce) {
  if (!miejsce) return "—";
  const strefa = danePojazdu(pojazdActor)?.strefy.find(s => s.id === miejsce.strefa);
  const czesci = [strefa?.nazwa ?? miejsce.strefa];
  const wStrefie = miejscaPojazdu(pojazdActor).filter(m => m.strefa === miejsce.strefa);
  const rzedy = [...new Set(wStrefie.map(m => m.rzad))];
  if (rzedy.length > 1) czesci.push(`rząd ${rzedy.indexOf(miejsce.rzad) + 1}`);
  if (miejsce.kierowca) czesci.push("kierowca");
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
  const pojazd = pojazdJadacego(jadacyDoc);
  if (!pojazd) return;
  const z = miejsceOId(pojazd.actor, jazdaZetonu(jadacyDoc).miejsce);
  const na = miejsceOId(pojazd.actor, miejsceId);
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

  // Usunięcie pojazdu: jadący wracają do swojego rozmiaru obok (§9 ryzyka).
  Hooks.on("preDeleteToken", (doc, options) => {
    if (!game.user.isActiveGM || !jestZetonemPojazdu(doc)) return;
    const jadacy = jadacyPojazdu(doc);
    if (!jadacy.length) return;
    const pozycje = jadacy.map(t => [t, poleWysiadki(doc, t, miejsceOId(doc.actor, jazdaZetonu(t).miejsce))]);
    setTimeout(async () => {
      for (const [t, pole] of pozycje) if (t.parent?.tokens.has(t.id)) await wysadzGM(t, { cel: pole });
    }, 0);
  });

  // Start świata: jadący bez pojazdu na scenie wracają do rozmiaru (awaria klienta, skopiowana scena).
  Hooks.once("ready", async () => {
    if (!game.user.isActiveGM) return;
    for (const scena of game.scenes) {
      for (const t of scena.tokens) {
        const j = jazdaZetonu(t);
        if (j && !pojazdJadacego(t)) await wysadzGM(t, { cel: { x: t._source.x, y: t._source.y } });
      }
    }
  });
}
