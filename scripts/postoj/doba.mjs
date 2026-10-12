/**
 * Neuroshima 5e — doba postoju: szkic gracza i zatwierdzenie MG (PLAN_m5_postoj.md §7.11, §7.13, D7, D18,
 * D20, U26–U29, U33, U50).
 *
 * **Gracz proponuje, MG zatwierdza.** MG otwiera dobę na karcie drużyny (`postoj.doba`), każdy gracz układa szkic
 * na **swojej** postaci (`flags.<mod>.szkicDoby`: sen, zajęcia z rejestru, utrzymanie i towarzysze, towar na
 * rachunek, rzuty), MG widzi wszystkich naraz i zatwierdza jednym ruchem. Jedyną blokadą jest to zatwierdzenie.
 *
 * **Zatwierdzenie** (U27, u MG, w tej kolejności — jedzenie przed DO, bo znacznik Niedożywienia blokuje
 * zdjęcie Wyczerpania w tej samej dobie):
 *   1. jedzenie i woda — utrzymanie albo zapasy (`consumeDailyNeeds` z pokryciem);
 *   2. odpoczynek wg snu (D20): ≥ 6 h DO z zajęciami, 4–5 h KO, mniej — bez korzyści (zajęcia i tak się
 *      odbyły); towarzysze odpoczywają z właścicielem (U50); RO za krótki sen — karta prośby;
 *   3. Zachód słońca z dawką z utrzymania dla chorób przewlekłych;
 *   4. rachunek: towar dołożony na rachunek znika, nadwyżka przechodzi na jutro (ujemna — nie, D18);
 *   5. zegar +24 h raz; karta podsumowania na postać i jedna karta MG; archiwum w `postoj.historia`.
 */

import { LOKALIZACJE } from "../config/handel-data.mjs";
import { cenaTutaj, skupDomyslny, fmtGb } from "../config/handel-rules.mjs";
import {
  UTRZYMANIE, SEN_DOMYSLNY_H, kosztUtrzymania, pokrycieUtrzymania, skutkiSnu, saldoRachunku, budzetDoby, skutkiWody, dzienBogaty
} from "../config/postoj-rules.mjs";
import { isKobaltEnabled, isKobaltSen, isKobaltWoda } from "../config/settings.mjs";
import { removeExhaustion } from "../config/exhaustion.mjs";
import { getChoroby } from "../actors/health-panel.mjs";
import { przyznajFuksa } from "../actors/fuksy.mjs";
import { ilustracja, OBOZ_Z_BIOMU } from "../config/ilustracje.mjs";
import { W_CIEPLE, zrodlaWyczerpania } from "../config/exhaustion.mjs";
import { formatWorldDate, dzienSwiata } from "../world-clock.mjs";
import { zajeciaWidoku, zastosujZajecia, budzetZajecia } from "../actors/rest-activities.mjs";
import { consumeDailyNeeds } from "../actors/party-supplies.mjs";
import { sunsetCheck } from "../actors/health-panel.mjs";
import { getPodroz } from "../actors/party-travel.mjs";
import { towarzysz, towarzyszeWlasciciela, rodzajTowarzysza } from "../actors/towarzysze.mjs";
import { getMiejsce, maMiejsce, opisMiejsca, druzynaGlowna } from "./miejsce.mjs";
import { wpisPrzedmiotu, zdejmij } from "./wymiana.mjs";
import { kartaPostoju, wyslijKarte, zarejestrujAkcje } from "./karty.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
export const FLAGA_SZKICU = "szkicDoby";
export const FLAGA_KONTA = "postojKonto";
const HISTORIA_MAX = 30;
const DOBA_S = 86400;
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/* -------------------------------------------- */
/*  Doba drużyny                                 */
/* -------------------------------------------- */

/** Otwarta doba drużyny albo `null`. */
export function doba(grupa) {
  const d = grupa?.getFlag?.(MODULE_ID, "postoj")?.doba;
  return d?.otwarta ? d : null;
}

/** Drużyna postaci z otwartą dobą (najpierw główna). */
export function dobaPostaci(actor) {
  const grupy = game.actors.filter(g => g.type === "group" && g.system.members?.some(m => m.actor === actor));
  const glowna = druzynaGlowna();
  const g = grupy.find(x => x === glowna && doba(x)) ?? grupy.find(x => doba(x)) ?? null;
  return g ? { grupa: g, doba: doba(g) } : null;
}

/** Postacie graczy drużyny (bez towarzyszy — odpoczywają z właścicielem, U50). */
export function postacieDruzyny(grupa) {
  return (grupa?.system.members ?? []).map(m => m.actor).filter(a => a?.type === "character" && !towarzysz(a));
}

/** [Otwórz dobę] (MG): stan na drużynie i karta z [Ułóż dobę]. */
export async function otworzDobe(grupa) {
  if (!game.user.isGM) return null;
  const m = getMiejsce(grupa);
  const d = { id: foundry.utils.randomID(), dzien: dzienSwiata(), otwarta: true, otwartaO: game.time.worldTime, miejsce: m };
  await grupa.update({ [`flags.${MODULE_ID}.postoj.doba`]: d });
  await wyslijKarte(kartaPostoju({
    ikona: "icons/svg/sun.svg",
    tytul: `Doba postoju: ${formatWorldDate() ?? ""}`,
    podtytul: maMiejsce(m) ? opisMiejsca(m) : "dzicz",
    linie: ["Ułóż swoją dobę: sen, zajęcia, utrzymanie i rachunek. MG zatwierdza całą drużynę naraz."],
    przyciski: [{ akcja: "ulozDobe", label: "Ułóż dobę", ikona: "fa-solid fa-sun" }]
  }), { actor: grupa });
  return d;
}

export async function zamknijDobe(grupa) {
  if (!game.user.isGM) return;
  await grupa.update({ [`flags.${MODULE_ID}.postoj.doba.otwarta`]: false });
}

/* -------------------------------------------- */
/*  Szkic postaci                                */
/* -------------------------------------------- */

/** Konto postoju postaci: nadwyżka, licznik Bogatego (WKK), ostatni szkic („jak wczoraj”). */
export function konto(actor) {
  const k = actor?.getFlag?.(MODULE_ID, FLAGA_KONTA) ?? {};
  return { nadwyzka: Math.max(0, Number(k.nadwyzka) || 0), bogatyN: Number(k.bogatyN) || 0, ostatni: k.ostatni ?? null, dni: Number(k.dni) || 0 };
}

/** Domyślny poziom utrzymania: w miejscowości Normalny, w dziczy brak (U33). */
function _utrzymanieDomyslne(miejsce) {
  return LOKALIZACJE[miejsce?.rodzaj]?.utrzymanie ? "normalny" : null;
}

/** Szkic postaci (wartości domyślne dla brakujących pól). */
export function szkic(actor) {
  const s = actor?.getFlag?.(MODULE_ID, FLAGA_SZKICU);
  if (!s) return null;
  return {
    dobaId: s.dobaId ?? null,
    sen: Number.isFinite(Number(s.sen)) ? Number(s.sen) : SEN_DOMYSLNY_H,
    zajecia: s.zajecia ?? {},
    utrzymanie: s.utrzymanie ?? null,
    towarzysze: s.towarzysze ?? {},
    doloz: Array.isArray(s.doloz) ? s.doloz : [],
    wCieple: !!s.wCieple,
    stan: s.stan === "zgloszony" ? "zgloszony" : "szkic",
    mg: { korekta: Number(s.mg?.korekta) || 0, stSnu: s.mg?.stSnu ?? null, pasywna: s.mg?.pasywna ?? null, uwagi: s.mg?.uwagi ?? "", domyslny: !!s.mg?.domyslny }
  };
}

/** Nowy szkic dla otwartej doby: z „jak wczoraj” albo domyślny (U28). */
export function szkicDomyslny(actor, d, { jakWczoraj = true } = {}) {
  const k = konto(actor);
  const baza = jakWczoraj && k.ostatni ? foundry.utils.deepClone(k.ostatni) : {};
  const miejsce = d?.miejsce;
  return {
    dobaId: d?.id ?? null,
    sen: baza.sen ?? SEN_DOMYSLNY_H,
    zajecia: baza.zajecia ?? {},
    utrzymanie: LOKALIZACJE[miejsce?.rodzaj]?.utrzymanie ? (baza.utrzymanie ?? _utrzymanieDomyslne(miejsce)) : null,
    towarzysze: baza.towarzysze ?? {},
    doloz: [],
    wCieple: false,
    stan: "szkic",
    mg: { korekta: 0, stSnu: null, pasywna: null, uwagi: "", domyslny: false }
  };
}

/** Szkic tej doby — tworzy domyślny, gdy go nie ma albo jest z innej doby. */
export async function zapewnijSzkic(actor) {
  const d = dobaPostaci(actor)?.doba;
  if (!d) return null;
  const s = szkic(actor);
  if (s && s.dobaId === d.id) return s;
  const nowy = szkicDomyslny(actor, d);
  await actor.update({ [`flags.${MODULE_ID}.${FLAGA_SZKICU}`]: nowy });
  return szkic(actor);
}

/** Zapis zmian szkicu (gracz — własnej postaci; MG — dowolnej). Zgłoszony wraca do szkicu, chyba że `zostaw`. */
export async function zapiszSzkic(actor, patch, { zostawStan = false } = {}) {
  const s = szkic(actor) ?? szkicDomyslny(actor, dobaPostaci(actor)?.doba);
  const nowy = foundry.utils.mergeObject(s, patch, { inplace: false, insertKeys: true, insertValues: true, overwrite: true });
  // Obiekty z formularza (zajęcia, towarzysze) zastępujemy w całości — inaczej odznaczone pole zostaje.
  if (patch.zajecia) nowy.zajecia = patch.zajecia;
  if (patch.towarzysze) nowy.towarzysze = patch.towarzysze;
  if (patch.doloz) nowy.doloz = patch.doloz;
  if (!zostawStan && !("stan" in patch)) nowy.stan = "szkic";
  await actor.update({ [`flags.${MODULE_ID}.-=${FLAGA_SZKICU}`]: null });
  await actor.update({ [`flags.${MODULE_ID}.${FLAGA_SZKICU}`]: nowy });
  return szkic(actor);
}

export async function zglos(actor) {
  return zapiszSzkic(actor, { stan: "zgloszony" });
}

export async function wycofaj(actor) {
  return zapiszSzkic(actor, { stan: "szkic" });
}

/** [Jak wczoraj] — ostatni zatwierdzony szkic (bez rzutów i towaru na rachunek). */
export async function jakWczoraj(actor) {
  const d = dobaPostaci(actor)?.doba;
  return zapiszSzkic(actor, szkicDomyslny(actor, d, { jakWczoraj: true }));
}

/* -------------------------------------------- */
/*  Kontekst doby: towarzysze, sen, godziny       */
/* -------------------------------------------- */

/** Towarzysze z utrzymaniem w szkicu właściciela (U33, U50): ludzie — poziom albo „robota”; zwierzęta — zapasy. */
export function towarzyszeDoUtrzymania(actor) {
  return towarzyszeWlasciciela(actor)
    .map(a => ({ actor: a, rodzaj: rodzajTowarzysza(a) }))
    .filter(x => x.rodzaj && !x.rodzaj.maszyna)
    .map(x => ({ actor: x.actor, czlowiek: x.rodzaj.typAktora === "character", nazwa: x.rodzaj.nazwa }));
}

/**
 * U39 — dola Prawej ręki (1/10 zarobków właściciela, s. 75): linia T0 w podsumowaniu, bez podziału automatycznego
 * (barter). `zarobki` — tylko z pracy (bez nadwyżki, towaru i korekty MG). Null bez Prawej ręki albo bez zarobków.
 */
export function dolaPrawejReki(actor, zarobki) {
  const z = Number(zarobki) || 0;
  if (z <= 0) return null;
  const reka = towarzyszeWlasciciela(actor).find(a => towarzysz(a)?.rodzaj === "prawa-reka");
  if (!reka) return null;
  return `Dola Prawej ręki (${esc(reka.name)}): 1/10 zarobków — ${fmtGb(Math.floor(z * 10) / 100)}; rozliczcie się barterem (s. 75).`;
}

/** Zarobki doby z pracy — bez nadwyżki z wczoraj, towaru na rachunek i korekty MG. */
export const zarobkiZPracy = linie => (linie ?? []).filter(l => l.rodzaj === "zarobek" && !l.nadwyzka && !l.towar && !l.mg)
  .reduce((s, l) => s + (Number(l.kwota) || 0), 0);

/** Czy postać ma poziomy Przemarznięcia — pole „W cieple” (s. 258). */
export function maPrzemarzniecie(actor) {
  return zrodlaWyczerpania(actor).some(s => s.source === "przemarznie");
}

/** Ilustracja okna doby (D43): w miejscowości — utrzymanie, w dziczy — obóz wg biomu z podróży. */
export async function obrazDoby(grupa, poziom) {
  const m = getMiejsce(grupa);
  if (LOKALIZACJE[m.rodzaj]?.utrzymanie && UTRZYMANIE[poziom]) return ilustracja("postoj", UTRZYMANIE[poziom].obraz);
  const biom = getPodroz(grupa)?.biom;
  return biom ? ilustracja("oboz", OBOZ_Z_BIOMU[biom] ?? null) : null;
}

/* -------------------------------------------- */
/*  Rachunek (D18, U29)                          */
/* -------------------------------------------- */

/**
 * Linie rachunku i saldo. Koszty: utrzymanie (i ludzkich towarzyszy), zajęcia z rejestru (`rachunek`). Zarobki:
 * zajęcia, nadwyżka z wczoraj, towar dołożony na rachunek — wyceniony jak sprzedaż (U9: region × stan × skup).
 * @returns {Promise<{linie: object[], saldo: number, koszty: number, zarobki: number, ujemne: boolean}>}
 */
export async function rachunekDoby(actor, s, { grupa = null } = {}) {
  const g = grupa ?? dobaPostaci(actor)?.grupa;
  const m = g ? getMiejsce(g) : { rodzaj: null, region: null };
  const kobalt = isKobaltEnabled();
  const linie = [];
  if (s.utrzymanie && UTRZYMANIE[s.utrzymanie]) {
    linie.push({ rodzaj: "koszt", kwota: kosztUtrzymania(s.utrzymanie), opis: `Utrzymanie: ${UTRZYMANIE[s.utrzymanie].label}` });
  }
  for (const t of towarzyszeDoUtrzymania(actor)) {
    const v = s.towarzysze?.[t.actor.uuid] ?? (t.czlowiek ? "robota" : null);
    if (t.czlowiek && UTRZYMANIE[v]) linie.push({ rodzaj: "koszt", kwota: kosztUtrzymania(v), opis: `Utrzymanie: ${t.actor.name} (${UTRZYMANIE[v].label})` });
  }
  const ctx = { actor, miejsce: m, szkic: s, kobalt };
  for (const def of zajeciaWidoku("doba")) {
    const v = s.zajecia?.[def.id];
    if (v == null || typeof def.rachunek !== "function") continue;
    try { linie.push(...(def.rachunek(v, ctx) ?? [])); } catch (err) { console.warn(`${MODULE_ID} | rachunek ${def.id}`, err); }
  }
  const k = konto(actor);
  if (k.nadwyzka > 0) linie.push({ rodzaj: "zarobek", kwota: k.nadwyzka, opis: "Nadwyżka z poprzedniej doby", nadwyzka: true });
  const skup = skupDomyslny({ kobalt });
  for (const d of s.doloz) {
    const item = fromUuidSync(d.uuid);
    if (!item) continue;
    const wpis = await wpisPrzedmiotu(item);
    const cena = cenaTutaj(wpis, { region: m.region, skup, kobalt }).cena;
    linie.push({ rodzaj: "zarobek", kwota: Math.round(cena * d.ilosc * 100) / 100, opis: `Towar: ${item.name}${d.ilosc > 1 ? ` ×${d.ilosc}` : ""}`, towar: true });
  }
  if (s.mg.korekta) linie.push({ rodzaj: s.mg.korekta > 0 ? "zarobek" : "koszt", kwota: Math.abs(s.mg.korekta), opis: "Korekta MG", mg: true });
  return { linie, ...saldoRachunku(linie) };
}

/** Godziny zajęć z wartości szkicu (bez formularza): `godziny(v)` definicji; reszta — 0. */
export function godzinyZajec(s) {
  const out = [];
  for (const def of zajeciaWidoku("doba")) {
    const v = s.zajecia?.[def.id];
    if (v == null) continue;
    const h = typeof def.godziny === "function" ? Number(def.godziny(v)) || 0 : 0;
    if (h > 0) out.push({ id: def.id, label: def.label, godziny: h, budzet: budzetZajecia(def, "long") });
  }
  return out;
}

/** Budżet doby ze szkicu (D7, U48). */
export function budzetSzkicu(s) {
  return budzetDoby({ sen: s.sen, zajecia: godzinyZajec(s) });
}

/* -------------------------------------------- */
/*  Zatwierdzenie (U27)                          */
/* -------------------------------------------- */

/** Odpoczynek wg snu (D20): DO z zajęciami, KO, albo nic — zajęcia i tak się odbyły. */
async function _odpoczynek(actor, s, sen, miejsce = null) {
  const config = { dialog: false, chat: false, advanceTime: false, neuroZajecia: s.zajecia ?? {}, neuroMiejsce: miejsce };
  if (s.wCieple) config[W_CIEPLE] = true;
  if (sen.korzysci === "DO") {
    await actor.longRest(config);
    return "Długi odpoczynek";
  }
  if (sen.korzysci === "KO") await actor.shortRest({ dialog: false, chat: false, advanceTime: false });
  await zastosujZajecia(actor, s.zajecia ?? {}, { typ: "long", widok: "doba", config: { neuroMiejsce: miejsce } });
  return sen.korzysci === "KO" ? "Krótki odpoczynek (4–5 h snu, s. 46)" : "bez korzyści odpoczynku";
}

/** RO za wodę (WKK D37): karta prośby; porażka — choroba zakaźna albo Wyczerpanie (handler M5). */
async function _prosbaWody(actor, jakosc, skutek) {
  return ChatMessage.create({
    type: "request",
    content: `<p><strong>${esc(actor.name)}</strong> pił wodę ${esc(skutek.label)} — Rzut Obronny na Kondycję, ST ${skutek.st} (WKK).</p>`,
    speaker: ChatMessage.getSpeaker({ actor }),
    system: { handler: "neuroWodaRO", data: { jakosc }, button: { icon: "fa-solid fa-droplet", label: "RO KON" }, targets: [{ actor: actor.uuid }] }
  });
}

/** RO za sen (D20): karta prośby dnd5e `save` do gracza; porażka — Bezsenność (handler M5). */
export async function _prosbaSnu(actor, st, h) {
  return ChatMessage.create({
    type: "request",
    content: `<p><strong>${esc(actor.name)}</strong>: ${h} h snu — Rzut Obronny na Kondycję, ST ${st}. Porażka — Wyczerpanie (Bezsenność).</p>`,
    speaker: ChatMessage.getSpeaker({ actor }),
    system: { handler: "neuroSenRO", data: { st }, button: { icon: "fa-solid fa-bed", label: "RO KON" }, targets: [{ actor: actor.uuid }] }
  });
}

/**
 * Zatwierdza dobę drużyny (MG). Postacie bez zgłoszonego szkicu dostają szkic domyślny (U28) z ostrzeżeniem.
 * @returns {Promise<object[]>} wyniki per postać
 */
export async function zatwierdzDobe(grupa) {
  if (!game.user.isGM) throw new Error("Dobę zatwierdza MG.");
  const d = doba(grupa);
  if (!d) throw new Error("Ta drużyna nie ma otwartej doby.");
  const kobalt = isKobaltEnabled();
  const m = getMiejsce(grupa);
  const postacie = postacieDruzyny(grupa);
  const wyniki = [];

  // Szkice (domyślne dla tych, którzy nie zgłosili) i rachunki — przed jakąkolwiek zmianą stanu.
  for (const actor of postacie) {
    let s = szkic(actor);
    const domyslny = !s || s.dobaId !== d.id;
    if (domyslny) s = { ...szkicDomyslny(actor, d), mg: { korekta: 0, stSnu: null, pasywna: null, uwagi: "", domyslny: true } };
    const r = await rachunekDoby(actor, s, { grupa });
    wyniki.push({ actor, s, r, domyslny, niezgloszony: !domyslny && s.stan !== "zgloszony", linie: [] });
  }

  // 1. Jedzenie i woda: utrzymanie (postać i ludzcy towarzysze) albo zapasy.
  const pokrycie = {};
  const aktorzy = [];
  for (const w of wyniki) {
    aktorzy.push(w.actor);
    if (w.s.utrzymanie) pokrycie[w.actor.id] = { ...pokrycieUtrzymania(w.s.utrzymanie), etykieta: UTRZYMANIE[w.s.utrzymanie].label };
    for (const t of towarzyszeDoUtrzymania(w.actor)) {
      aktorzy.push(t.actor);
      const v = w.s.towarzysze?.[t.actor.uuid] ?? (t.czlowiek ? "robota" : null);
      if (t.czlowiek && UTRZYMANIE[v]) pokrycie[t.actor.id] = { ...pokrycieUtrzymania(v), etykieta: UTRZYMANIE[v].label };
      else if (t.czlowiek && v === "robota") pokrycie[t.actor.id] = { jedzenie: true, woda: "pitna", leki: false, etykieta: "znalazł robotę" };
      // Zwierzę właściciela na Nędznym poziomie: brudna woda za darmo, jedzenie z zapasów (s. 47, D13, D23).
      else if (!t.czlowiek && w.s.utrzymanie === "nedzny") pokrycie[t.actor.id] = { tylkoWoda: true, woda: "brudna" };
    }
  }
  const jedzenie = await consumeDailyNeeds(grupa, { aktorzy, pokrycie, karta: false });
  const kobaltWoda = isKobaltWoda();
  for (const j of jedzenie) {
    const w = wyniki.find(x => x.actor === j.actor) ?? wyniki.find(x => towarzyszeDoUtrzymania(x.actor).some(t => t.actor === j.actor));
    if (w) w.linie.push(j.actor === w.actor ? j.notatki.join(" ") : `${j.actor.name}: ${j.notatki.join(" ")}`);
    // WKK D37: gorsza woda — RO KON raz na dobę picia (prośba do właściciela postaci).
    const juzChoruje = getChoroby(j.actor).some(c => c.key === "zakazna");
    const skutek = skutkiWody(j.woda, { kobalt: kobaltWoda, juzChoruje });
    if (skutek && w) {
      await _prosbaWody(j.actor, j.woda, skutek);
      w.linie.push(`${j.actor.name}: woda ${skutek.label} — RO KON ST ${skutek.st} (WKK) — karta prośby.`);
    }
  }

  // 2. Odpoczynek wg snu; towarzysze z właścicielem (U50).
  const kobaltSen = isKobaltSen();
  for (const w of wyniki) {
    const sen = skutkiSnu(w.s.sen, { kobalt: kobaltSen });
    w.sen = sen;
    w.linie.push(`Sen ${w.s.sen} h — ${await _odpoczynek(w.actor, w.s, sen, m)}.`);
    // WKK D35: odsypianie — Bezsenność uporczywa schodzi snem ponad normę (12 h — 1, 18 h — 2).
    if (sen.odsypianie) {
      let zdjete = 0;
      for (let i = 0; i < sen.odsypianie; i++) {
        if (!zrodlaWyczerpania(w.actor).some(x => x.source === "bezsennosc")) break;
        await removeExhaustion(w.actor, "bezsennosc", { chat: false });
        zdjete++;
      }
      if (zdjete) w.linie.push(`Odsypianie (WKK): −${zdjete} Bezsenność.`);
    }
    if (sen.korzysci !== "brak" || sen.ro) {
      for (const t of towarzyszeDoUtrzymania(w.actor)) {
        if (sen.korzysci === "DO") await t.actor.longRest({ dialog: false, chat: false, advanceTime: false });
        else if (sen.korzysci === "KO") await t.actor.shortRest({ dialog: false, chat: false, advanceTime: false });
      }
    }
    const st = w.s.mg.stSnu ?? sen.ro;
    if (st) {
      await _prosbaSnu(w.actor, st, w.s.sen);
      w.linie.push(`RO KON ST ${st} za sen (${sen.warstwa === "WKK" ? "WKK" : "s. 45"}) — karta prośby.`);
    }
    Hooks.callAll("neuroshima.dobaOdpoczynek", w.actor, { szkic: w.s, sen, miejsce: m, kobalt, linie: w.linie });
  }

  // 3. Zachód słońca: dawka z utrzymania dla chorób przewlekłych (Normalny, Bogaty).
  const dawka = new Set(wyniki.filter(w => w.s.utrzymanie && pokrycieUtrzymania(w.s.utrzymanie).leki).map(w => w.actor.id));
  await sunsetCheck({ actors: postacie, dawkaZUtrzymania: dawka });

  // 3b. WKK D38: Bogate życie — szansa na Fuksa 1/(11 − n), pewny dnia 10; sukces zeruje licznik.
  for (const w of wyniki) {
    if (w.s.utrzymanie !== "bogaty" || !kobalt) { w.bogatyN = 0; continue; }
    const r = dzienBogaty({ n: konto(w.actor).bogatyN, u: Math.random() }, { kobalt });
    w.bogatyN = r.n;
    if (r.fuks) {
      const f = await przyznajFuksa(w.actor, "bogaty", { etykieta: "Bogate życie", karta: false });
      w.linie.push(f.odmowa ? "Bogate życie (WKK): Fuks — ale komplet trzech." : "🍀 Bogate życie (WKK): Fuks na 7 dni.");
    }
  }

  // 4. Rachunek: towar na rachunek znika, nadwyżka na jutro (ujemnej się nie przenosi — D18).
  for (const w of wyniki) {
    for (const p of w.s.doloz) {
      const item = await fromUuid(p.uuid);
      if (item) await zdejmij(item, p.ilosc);
    }
    const k = konto(w.actor);
    const { doloz, stan, mg, dobaId, ...ostatni } = w.s;
    await w.actor.update({ [`flags.${MODULE_ID}.${FLAGA_KONTA}`]: { ...k, nadwyzka: Math.max(0, w.r.saldo), ostatni, dni: k.dni + 1, bogatyN: w.bogatyN ?? 0 } });
    Hooks.callAll("neuroshima.dobaRachunek", w.actor, { szkic: w.s, rachunek: w.r, miejsce: m, kobalt, linie: w.linie });
  }

  // 5. Zegar +24 h raz; szkice zamknięte; archiwum; karty.
  const dzien = formatWorldDate();
  await game.time.advance(DOBA_S);
  for (const w of wyniki) await w.actor.update({ [`flags.${MODULE_ID}.-=${FLAGA_SZKICU}`]: null });
  const historia = [...(grupa.getFlag(MODULE_ID, "postoj")?.historia ?? []), {
    id: d.id, dzien, miejsce: opisMiejsca(m), czas: game.time.worldTime,
    postacie: wyniki.map(w => ({ uuid: w.actor.uuid, nazwa: w.actor.name, sen: w.s.sen, utrzymanie: w.s.utrzymanie, saldo: w.r.saldo, godziny: godzinyZajec(w.s) }))
  }].slice(-HISTORIA_MAX);
  await grupa.update({ [`flags.${MODULE_ID}.postoj.doba.otwarta`]: false, [`flags.${MODULE_ID}.postoj.historia`]: historia });

  for (const w of wyniki) {
    const bogaty = w.s.utrzymanie === "bogaty";
    await wyslijKarte(kartaPostoju({
      ikona: w.actor.img,
      tytul: `Doba: ${w.actor.name}`,
      podtytul: dzien ?? "",
      rodzaj: bogaty ? "bogaty" : w.r.ujemne ? "braki" : "info",
      obraz: await obrazDoby(grupa, w.s.utrzymanie),
      linie: [
        ...(w.s.utrzymanie ? [`Utrzymanie: <strong>${UTRZYMANIE[w.s.utrzymanie].label}</strong>`] : []),
        ...w.linie,
        `Rachunek: ${w.r.linie.map(l => `${l.rodzaj === "koszt" ? "−" : "+"}${fmtGb(l.kwota)} ${esc(l.opis)}`).join(" · ") || "—"}`,
        `Saldo: <strong>${fmtGb(w.r.saldo)}</strong>${w.r.saldo > 0 ? " — nadwyżka na jutro" : ""}`,
        ...[dolaPrawejReki(w.actor, zarobkiZPracy(w.r.linie))].filter(Boolean)
      ]
    }), { actor: w.actor });
  }
  await wyslijKarte(kartaPostoju({
    ikona: "icons/svg/sun.svg",
    tytul: `Doba zatwierdzona: ${dzien ?? ""}`,
    podtytul: `${grupa.name} · tylko MG`,
    linie: wyniki.map(w => `<strong>${esc(w.actor.name)}</strong>: sen ${w.s.sen} h, saldo ${fmtGb(w.r.saldo)}`
      + (w.domyslny ? " — <em>szkic domyślny</em>" : w.niezgloszony ? " — <em>niezgłoszony</em>" : "")
      + (w.r.ujemne ? " — <span class=\"neuro-zle\">saldo ujemne</span>" : "")
      + (budzetSzkicu(w.s).przekroczenia.length ? ` — przekroczenia: ${budzetSzkicu(w.s).przekroczenia.map(p => `${p.rodzaj} +${p.ile} h`).join(", ")}` : ""))
  }), { szept: "gm" });
  Hooks.callAll("neuroshima.dobaZatwierdzona", grupa, wyniki);
  return wyniki;
}

/* -------------------------------------------- */
/*  RO za sen — handler prośby                   */
/* -------------------------------------------- */

async function _handlerSenRO(actor, request, data, { event } = {}) {
  const md = {};
  foundry.utils.setProperty(md, "flags.dnd5e.requestResult", { actorUuid: actor.uuid, requestId: request.id });
  foundry.utils.setProperty(md, `flags.${MODULE_ID}.senRO`, { actorUuid: actor.uuid, st: data.st });
  const [roll] = (await actor.rollSavingThrow({ ability: "con", target: data.st, event }, { configure: false }, { data: md })) ?? [];
  if (roll && !roll.isSuccess) {
    const { addExhaustion } = await import("../config/exhaustion.mjs");
    await addExhaustion(actor, "bezsennosc");
  }
  return roll?.parent ?? null;
}

async function _onRerolled({ message, roll, actor }) {
  const f = message?.flags?.[MODULE_ID]?.senRO;
  if (!f || !actor?.isOwner) return;
  if ((message.rolls?.[0]?.total ?? 0) < f.st && (roll?.total ?? 0) >= f.st) {
    const { removeExhaustion } = await import("../config/exhaustion.mjs");
    await removeExhaustion(actor, "bezsennosc");
  }
}

async function _handlerWodaRO(actor, request, data, { event } = {}) {
  const skutek = skutkiWody(data.jakosc, { kobalt: true });
  if (!skutek) return null;
  const md = {};
  foundry.utils.setProperty(md, "flags.dnd5e.requestResult", { actorUuid: actor.uuid, requestId: request.id });
  const [roll] = (await actor.rollSavingThrow({ ability: "con", target: skutek.st, event }, { configure: false }, { data: md })) ?? [];
  if (roll && !roll.isSuccess) {
    if (skutek.choroba) {
      const { addDisease } = await import("../actors/health-panel.mjs");
      await addDisease(actor, skutek.choroba, { notes: skutek.opisChoroby ?? "" });
    }
    if (skutek.obrazenia) {
      const r = await new Roll(skutek.obrazenia).evaluate();
      await actor.applyDamage([{ value: r.total, type: skutek.typObrazen }]);
    }
    if (skutek.wyczerpanie) {
      const { addExhaustion, EXHAUSTION_SOURCES } = await import("../config/exhaustion.mjs");
      await addExhaustion(actor, EXHAUSTION_SOURCES[skutek.wyczerpanie] ? skutek.wyczerpanie : "ogolne");
    }
  }
  return roll?.parent ?? null;
}

export function registerDoba() {
  CONFIG.DND5E.requests.neuroSenRO = _handlerSenRO;
  CONFIG.DND5E.requests.neuroWodaRO = _handlerWodaRO;
  Hooks.on("neuroshima.rerolled", _onRerolled);
  zarejestrujAkcje("ulozDobe", async () => {
    const actor = game.user.character ?? game.actors.find(a => a.isOwner && a.type === "character" && dobaPostaci(a));
    if (!actor) return ui.notifications.warn("Nie masz postaci w drużynie z otwartą dobą.");
    const { otworzDobeOkno } = await import("./doba-okno.mjs");
    otworzDobeOkno(actor);
  });
}

export const dobaApi = Object.freeze({
  doba, dobaPostaci, otworz: otworzDobe, zamknij: zamknijDobe, szkic, zapewnijSzkic, zapisz: zapiszSzkic, zglos, wycofaj,
  jakWczoraj, rachunek: rachunekDoby, budzet: budzetSzkicu, zatwierdz: zatwierdzDobe, konto, postacie: postacieDruzyny
});
