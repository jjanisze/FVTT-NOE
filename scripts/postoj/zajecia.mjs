/**
 * Neuroshima 5e — zajęcia postoju (PLAN_m5_postoj.md §7.12, D16, D25, D40, U30–U39).
 *
 * Nowi klienci wspólnego rejestru zajęć (`actors/rest-activities.mjs`, D26): widoki „doba” i „przeskok”, bez okien
 * dnd5e. Każde zajęcie podaje godziny (budżet `praca` — razem z produkcją do 10 h — albo `czas`), linie rachunku
 * i skutek po odpoczynku (`apply`, wołane z DO zatwierdzonej doby albo wprost, gdy sen nie dał DO).
 *
 *   Praca (s. 47)            praca   umiejętność / narzędzia, godziny → 1 gb × pasywna za 10 h
 *   Trening/Nauka (s. 47)    praca   cel, trener, godziny → 1 gb/h × Usługi speców, 300 h → „Wyszkolenie: X”
 *   Budowa bazy (s. 47)      praca   projekt drużyny, godziny → 1 gb/h, korzyść z MG
 *   Za garść gambli (s. 74)  praca   4 h, miejsce koncertu, rzut → wynik × mnożnik, +1 Wyczerpanie „Koncert”
 *   Rozrywka (s. 47)         czas    10 h, ≥ 50 gb, miasteczko i miasto → Fuks na 7 dni
 *   Plotkowanie (s. 47)      czas    ≥ 1 h, ≥ 5 gb, knajpa, CHA (Śledztwo) ST 10 → informacje dla MG
 *   Hazard (s. 47)           czas    1 h (D40), gra, stawka, test ST 20 → wygrana = stawka, porażka — stawka
 *   Szukanie towarzysza      czas    24 h (Partner, Oswajanie, Prawa ręka) → karta MG z [Nowy towarzysz]
 *
 * Wartości formularza: `neuroZajecia.<id>.*`. Rzuty (plotki, hazard, koncert) gracz wykonuje w oknie doby —
 * wynik trafia do szkicu (`wynik`), zatwierdzenie go tylko rozlicza.
 */

import { LOKALIZACJE } from "../config/handel-data.mjs";
import {
  PRACA, TRENING, BUDOWA, ROZRYWKA, PLOTKI, HAZARD, KONCERT, MIEJSCA_KONCERTU, SZUKANIE,
  zarobekPracy, postepTreningu, postepBudowy, postepSzukania, liczbaInformacji, wynikHazardu, zarobekKoncertu,
  rozrywkaDajeFuksa, mnoznikUslug
} from "../config/postoj-rules.mjs";
import { fmtGb } from "../config/handel-rules.mjs";
import { registerRestActivity } from "../actors/rest-activities.mjs";
import { maZdolnosc } from "../production/wykonawca.mjs";
import { ZRODLA } from "../config/towarzysze-data.mjs";
import { addExhaustion } from "../config/exhaustion.mjs";
import { przyznajFuksa } from "../actors/fuksy.mjs";
import { kartaPostoju, wyslijKarte, zarejestrujAkcje } from "./karty.mjs";
import { miejsceAktora } from "./miejsce.mjs";
import { zarejestrujSekcjePostoju, zarejestrujAkcjePostoju } from "./zakladka.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));
const _n = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
const _sel = (a, b) => (String(a) === String(b) ? "selected" : "");
const _chk = v => (v ? "checked" : "");
const pole = (id, f) => `neuroZajecia.${id}.${f}`;
/** „1 informacja, 3 informacje, 5 informacji” (12–14 — „informacji”). */
const _informacje = n => `${n} ${n === 1 ? "informacja" : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? "informacje" : "informacji"}`;

/* -------------------------------------------- */
/*  Wspólne                                      */
/* -------------------------------------------- */

function _skille() {
  return Object.entries(CONFIG.DND5E.skills).map(([k, s]) => ({ k: `skill:${k}`, label: s.label }));
}

function _narzedzia() {
  return Object.entries(CONFIG.DND5E.tools).map(([k, t]) => ({ k: `tool:${k}`, label: t.label ?? k }));
}

/** Wartość pasywna umiejętności albo narzędzi (U30, jak dnd5e): 10 + mod. + PB × biegłość. */
export function pasywnaDla(actor, klucz) {
  const [typ, k] = String(klucz ?? "").split(":");
  if (typ === "skill") return _n(actor?.system?.skills?.[k]?.passive) || 10;
  if (typ === "tool") {
    const t = actor?.system?.tools?.[k];
    const ab = t?.ability ?? CONFIG.DND5E.tools[k]?.ability ?? "int";
    return 10 + _n(actor?.system?.abilities?.[ab]?.mod) + _n(actor?.system?.attributes?.prof) * _n(t?.value);
  }
  return 10;
}

function _etykieta(klucz) {
  const [typ, k] = String(klucz ?? "").split(":");
  if (typ === "skill") return CONFIG.DND5E.skills[k]?.label ?? k;
  if (typ === "tool") return CONFIG.DND5E.tools[k]?.label ?? k;
  if (typ === "weapon") return CONFIG.DND5E.weaponProficiencies?.[k] ?? k;
  if (typ === "armor") return CONFIG.DND5E.armorProficiencies?.[k] ?? k;
  return klucz;
}

function _godzinyInput(id, v, { max = 24, min = 0, step = 1 } = {}) {
  return `<label>Godzin <input type="number" name="${pole(id, "godziny")}" min="${min}" max="${max}" step="${step}" value="${_n(v?.godziny)}"></label>`;
}

function _rzutBtn(id, label, wynik) {
  return `<button type="button" class="neuro-cennik-btn" data-zajecie-rzut="${id}"><i class="fa-solid fa-dice-d20" inert></i> ${esc(label)}</button>
    <input type="hidden" name="${pole(id, "wynik")}" value="${wynik ?? ""}">
    <span class="neuro-zajecie-wynik">${wynik !== undefined && wynik !== null && wynik !== "" ? `wynik: <strong>${wynik}</strong>` : "bez rzutu"}</span>`;
}

const _wMiejscowosci = ctx => !!LOKALIZACJE[ctx?.miejsce?.rodzaj]?.utrzymanie;

/** Rzut w oknie doby: test umiejętności albo narzędzi (okno dnd5e — Ułatwienie, premie), wynik całkowity. */
async function _rzutTestu(actor, { skill = null, ability = null, tool = null, flavor = "" }) {
  const message = flavor ? { data: { flavor } } : {};
  const r = tool
    ? await actor.rollToolCheck({ tool, ...(ability ? { ability } : {}) }, {}, message)
    : await actor.rollSkill({ skill, ability }, {}, message);
  return (Array.isArray(r) ? r[0] : r)?.total ?? null;
}

/** Miejsce postoju z konfiguracji odpoczynku (doba przekazuje `neuroMiejsce`). */
const _miejsceZ = config => config?.neuroMiejsce ?? null;

/* -------------------------------------------- */
/*  Praca (s. 47, U30)                           */
/* -------------------------------------------- */

const PRACA_DEF = {
  id: "praca",
  label: "Praca (s. 47)",
  restTypes: ["long"],
  widoki: ["doba", "przeskok"],
  budzet: "praca",
  dostepne: (actor, ctx) => (_wMiejscowosci(ctx) ? true : "praca tylko w miejscowości"),
  render(actor, _typ, ctx) {
    const v = ctx?.szkic?.zajecia?.praca ?? {};
    const klucz = v.klucz ?? "skill:tch";
    const opcje = [`<optgroup label="Umiejętności">${_skille().map(o => `<option value="${o.k}" ${_sel(o.k, klucz)}>${esc(o.label)} (${pasywnaDla(actor, o.k)})</option>`).join("")}</optgroup>`,
      `<optgroup label="Narzędzia">${_narzedzia().map(o => `<option value="${o.k}" ${_sel(o.k, klucz)}>${esc(o.label)} (${pasywnaDla(actor, o.k)})</option>`).join("")}</optgroup>`].join("");
    return `<div class="neuro-zajecie-rzad"><select name="${pole("praca", "klucz")}">${opcje}</select>
      ${_godzinyInput("praca", v, { max: PRACA.godziny })}</div>
      <p class="hint">1 gb × wartość pasywna za 10 h, proporcjonalnie za mniej (ustalona z MG — może ją zmienić).</p>`;
  },
  godziny: v => Math.min(PRACA.godziny, _n(v?.godziny)),
  rachunek(v, ctx) {
    const h = Math.min(PRACA.godziny, _n(v?.godziny));
    if (!h) return [];
    const pas = ctx.szkic?.mg?.pasywna ?? pasywnaDla(ctx.actor, v.klucz);
    return [{ rodzaj: "zarobek", kwota: zarobekPracy({ pasywna: pas, godziny: h }), opis: `Praca: ${_etykieta(v.klucz)} ${h} h (pasywna ${pas})` }];
  },
  async apply(actor, v) {
    const h = Math.min(PRACA.godziny, _n(v?.godziny));
    if (!h) return null;
    return { linie: [`Praca: ${esc(_etykieta(v.klucz))}, ${h} h — zarobek na rachunku.`], minuty: h * 60 };
  }
};

/* -------------------------------------------- */
/*  Trening / Nauka (s. 47, U31)                 */
/* -------------------------------------------- */

const FLAGA_TRENINGU = "trening";

function _celeTreningu() {
  return [
    { grupa: "Umiejętności", opcje: _skille() },
    { grupa: "Narzędzia", opcje: _narzedzia() },
    { grupa: "Broń", opcje: Object.entries(CONFIG.DND5E.weaponProficiencies ?? {}).map(([k, l]) => ({ k: `weapon:${k}`, label: l })) },
    { grupa: "Pancerze", opcje: Object.entries(CONFIG.DND5E.armorProficiencies ?? {}).map(([k, l]) => ({ k: `armor:${k}`, label: l })) }
  ];
}

/** Postęp treningów postaci: `{ [cel]: { godziny, trener } }`. */
export function treningi(actor) {
  return actor?.getFlag?.(MODULE_ID, FLAGA_TRENINGU) ?? {};
}

/** Dane przedmiotu-cechy „Wyszkolenie: X” z efektem (U31) — widoczny, do usunięcia. */
export function wyszkolenieItemData(cel) {
  const [typ, k] = cel.split(":");
  const changes = typ === "skill" ? [{ key: `system.skills.${k}.value`, mode: 4, value: "1" }]
    : typ === "tool" ? [{ key: `system.tools.${k}.value`, mode: 4, value: "1" }]
      : typ === "weapon" ? [{ key: "system.traits.weaponProf.value", mode: 2, value: k }]
        : [{ key: "system.traits.armorProf.value", mode: 2, value: k }];
  const nazwa = `Wyszkolenie: ${_etykieta(cel)}`;
  return {
    name: nazwa, type: "feat", img: "icons/svg/upgrade.svg",
    system: { description: { value: `<p>Trening/Nauka ukończona (300 h, s. 47) — ${typ === "armor" ? "wyszkolenie w pancerzu" : "biegłość"}: <strong>${esc(_etykieta(cel))}</strong>.</p>`, chat: "" } },
    effects: [{ name: nazwa, img: "icons/svg/upgrade.svg", changes, transfer: true, disabled: false }],
    flags: { [MODULE_ID]: { wyszkolenie: cel } }
  };
}

const TRENING_DEF = {
  id: "trening",
  label: "Trening / Nauka (s. 47)",
  restTypes: ["long"],
  widoki: ["doba", "przeskok"],
  budzet: "praca",
  dostepne: (actor, ctx) => (_wMiejscowosci(ctx) ? true : "trening wymaga trenera w miejscowości"),
  render(actor, _typ, ctx) {
    const v = ctx?.szkic?.zajecia?.trening ?? {};
    const t = treningi(actor);
    const opcje = `<option value="">—</option>` + _celeTreningu().map(g => `<optgroup label="${g.grupa}">${g.opcje.map(o =>
      `<option value="${o.k}" ${_sel(o.k, v.cel)}>${esc(o.label)}${t[o.k] ? ` (${t[o.k].godziny}/${TRENING.godziny} h)` : ""}</option>`).join("")}</optgroup>`).join("");
    const trwa = Object.entries(t).filter(([, x]) => x.godziny < TRENING.godziny).map(([k, x]) => `${esc(_etykieta(k))} ${x.godziny}/${TRENING.godziny} h`);
    const usl = mnoznikUslug(ctx?.miejsce?.region);
    return `<div class="neuro-zajecie-rzad"><select name="${pole("trening", "cel")}">${opcje}</select>${_godzinyInput("trening", v, { max: TRENING.maksDziennie })}</div>
      <div class="neuro-zajecie-rzad"><input type="text" name="${pole("trening", "trener")}" value="${esc(v.trener ?? "")}" placeholder="trener (konieczny)"></div>
      <p class="hint">30 × 10 h; 1 gb/h × Usługi speców (${Math.round(usl * 100)}%).${trwa.length ? ` W toku: ${trwa.join(", ")}.` : ""}</p>`;
  },
  godziny: v => (v?.cel ? Math.min(TRENING.maksDziennie, _n(v?.godziny)) : 0),
  rachunek(v, ctx) {
    const h = v?.cel ? Math.min(TRENING.maksDziennie, _n(v.godziny)) : 0;
    if (!h) return [];
    return [{ rodzaj: "koszt", kwota: postepTreningu({ godziny: h, region: ctx.miejsce?.region }).koszt, opis: `Trening: ${_etykieta(v.cel)} ${h} h` }];
  },
  async apply(actor, v) {
    const h = v?.cel ? Math.min(TRENING.maksDziennie, _n(v.godziny)) : 0;
    if (!h) return null;
    const t = treningi(actor);
    const przed = t[v.cel]?.godziny ?? 0;
    const p = postepTreningu({ dotychczas: przed, godziny: h });
    await actor.update({ [`flags.${MODULE_ID}.${FLAGA_TRENINGU}.${v.cel}`]: { godziny: p.godziny, trener: v.trener ?? "" } });
    const linie = [`Trening: ${esc(_etykieta(v.cel))} — ${p.godziny}/${TRENING.godziny} h.`];
    if (!String(v.trener ?? "").trim()) linie.push(`<span class="neuro-zle">Bez trenera — RAW wymaga trenera (MG).</span>`);
    if (p.ukonczony && przed < TRENING.godziny) {
      const [typ, k] = v.cel.split(":");
      if (typ === "tool" && !actor.system.tools?.[k]) {
        await actor.update({ [`system.tools.${k}`]: { value: 0, ability: CONFIG.DND5E.tools[k]?.ability ?? "int" } });
      }
      await actor.createEmbeddedDocuments("Item", [wyszkolenieItemData(v.cel)]);
      linie.push(`<strong>Ukończony:</strong> Wyszkolenie: ${esc(_etykieta(v.cel))}.`);
    }
    return { linie, minuty: h * 60 };
  }
};

/* -------------------------------------------- */
/*  Budowa bazy (s. 47, U32)                     */
/* -------------------------------------------- */

/** Projekty bazy drużyny: `postoj.baza.projekty[]` `{ nazwa, godziny, wymagane, efekt }`. */
export function projektyBazy(grupa) {
  return grupa?.getFlag?.(MODULE_ID, "postoj")?.baza?.projekty ?? [];
}

const _grupaPostaci = actor => miejsceAktora(actor).druzyna;

/** MG: dodaje albo zmienia projekt bazy (U32) — wymagane godziny i efekt (tekst MG). Godziny zostają. */
export async function ustawProjektBazy(grupa, { nazwa, wymagane = null, efekt = "" }) {
  const n = String(nazwa ?? "").trim();
  if (!grupa || !n) return null;
  const pr = foundry.utils.deepClone(projektyBazy(grupa));
  let p = pr.find(x => x.nazwa.toLowerCase() === n.toLowerCase());
  if (!p) { p = { nazwa: n, godziny: 0 }; pr.push(p); }
  Object.assign(p, { wymagane: _n(wymagane) || null, efekt: String(efekt ?? "") });
  await grupa.update({ [`flags.${MODULE_ID}.postoj.baza.projekty`]: pr });
  return p;
}

export async function usunProjektBazy(grupa, nazwa) {
  const pr = projektyBazy(grupa).filter(x => x.nazwa.toLowerCase() !== String(nazwa).toLowerCase());
  await grupa.update({ [`flags.${MODULE_ID}.postoj.baza.projekty`]: pr });
}

async function _oknoProjektu(grupa, p = {}) {
  const dane = await foundry.applications.api.DialogV2.input({
    window: { title: p.nazwa ? `Projekt bazy: ${p.nazwa}` : "Nowy projekt bazy" },
    content: `<div class="form-group"><label>Nazwa</label><input type="text" name="nazwa" value="${esc(p.nazwa ?? "")}" ${p.nazwa ? "readonly" : ""} placeholder="np. ogrodzenie z blachy"></div>
      <div class="form-group"><label>Wymagane godziny</label><input type="number" name="wymagane" min="0" step="1" value="${p.wymagane ?? ""}" placeholder="ustala MG"></div>
      <div class="form-group"><label>Efekt</label><input type="text" name="efekt" value="${esc(p.efekt ?? "")}" placeholder="co daje ukończony projekt"></div>
      <p class="hint">1 gb za godzinę pracy (s. 47); godziny wpisują gracze w dobie postoju.</p>`,
    ok: { label: "Zapisz", icon: "fa-solid fa-floppy-disk" },
    rejectClose: false
  });
  if (dane?.nazwa) await ustawProjektBazy(grupa, dane);
}

function _kontekstBazy(grupa) {
  const pr = projektyBazy(grupa);
  if (!pr.length && !game.user.isGM) return null;
  return {
    projekty: pr.map(p => ({ ...p, procent: p.wymagane ? Math.min(100, Math.round(p.godziny / p.wymagane * 100)) : null, gotowy: p.wymagane && p.godziny >= p.wymagane }))
  };
}

const BUDOWA_DEF = {
  id: "budowa",
  label: "Budowa bazy (s. 47)",
  restTypes: ["long"],
  widoki: ["doba", "przeskok"],
  budzet: "praca",
  render(actor, _typ, ctx) {
    const v = ctx?.szkic?.zajecia?.budowa ?? {};
    const pr = projektyBazy(_grupaPostaci(actor));
    const lista = pr.map(p => `${esc(p.nazwa)} ${p.godziny}${p.wymagane ? `/${p.wymagane}` : ""} h`).join(", ");
    return `<div class="neuro-zajecie-rzad"><input type="text" name="${pole("budowa", "projekt")}" value="${esc(v.projekt ?? "")}" placeholder="projekt (np. ogrodzenie)" list="neuro-projekty-${actor.id}">
      <datalist id="neuro-projekty-${actor.id}">${pr.map(p => `<option value="${esc(p.nazwa)}">`).join("")}</datalist>
      ${_godzinyInput("budowa", v, { max: BUDOWA.maksDziennie })}</div>
      <p class="hint">1 gb/h, korzyść ustala MG.${lista ? ` Projekty: ${lista}.` : ""}</p>`;
  },
  godziny: v => (String(v?.projekt ?? "").trim() ? Math.min(BUDOWA.maksDziennie, _n(v?.godziny)) : 0),
  rachunek(v) {
    const h = String(v?.projekt ?? "").trim() ? Math.min(BUDOWA.maksDziennie, _n(v.godziny)) : 0;
    return h ? [{ rodzaj: "koszt", kwota: h * BUDOWA.gbNaGodzine, opis: `Budowa: ${v.projekt} ${h} h` }] : [];
  },
  async apply(actor, v) {
    const nazwa = String(v?.projekt ?? "").trim();
    const h = nazwa ? Math.min(BUDOWA.maksDziennie, _n(v.godziny)) : 0;
    if (!h) return null;
    const g = _grupaPostaci(actor);
    if (!g || !game.user.isGM) return { linie: [`Budowa: ${esc(nazwa)} ${h} h (zapis u MG).`], minuty: h * 60 };
    const pr = foundry.utils.deepClone(projektyBazy(g));
    let p = pr.find(x => x.nazwa.toLowerCase() === nazwa.toLowerCase());
    if (!p) { p = { nazwa, godziny: 0, wymagane: null, efekt: "" }; pr.push(p); }
    const przed = p.godziny;
    const wynik = postepBudowy({ dotychczas: p.godziny, godziny: h, wymagane: p.wymagane ?? 0 });
    p.godziny = wynik.godziny;
    await g.update({ [`flags.${MODULE_ID}.postoj.baza.projekty`]: pr });
    const linie = [`Budowa: ${esc(nazwa)} — ${p.godziny}${p.wymagane ? `/${p.wymagane}` : ""} h.`];
    if (wynik.ukonczona && przed < p.wymagane) {
      await wyslijKarte(kartaPostoju({ ikona: "icons/svg/house.svg", tytul: `Baza: ${nazwa} ukończona`, podtytul: g.name,
        linie: [p.efekt ? esc(p.efekt) : "Korzyść ustala MG (s. 47)."] }), { szept: "gm" });
      linie.push(`<strong>Ukończona.</strong>`);
    }
    return { linie, minuty: h * 60 };
  }
};

/* -------------------------------------------- */
/*  Za garść gambli (s. 74, U37)                 */
/* -------------------------------------------- */

const KONCERT_DEF = {
  id: "koncert",
  label: "Za garść gambli — koncert (s. 74)",
  restTypes: ["long"],
  widoki: ["doba"],
  budzet: "praca",
  dostepne: (actor, ctx) => (maZdolnosc(actor, "za-garsc-gambli") && _wMiejscowosci(ctx) ? true : "brak zdolności"),
  render(actor, _typ, ctx) {
    const v = ctx?.szkic?.zajecia?.koncert ?? {};
    const miejsca = Object.entries(MIEJSCA_KONCERTU).map(([k, m]) => `<option value="${k}" ${_sel(k, v.miejsce ?? "tania-knajpa")}>${m.label} (×${String(m.mnoznik).replace(".", ",")} gb)</option>`).join("");
    return `<div class="neuro-zajecie-rzad"><label class="checkbox"><input type="checkbox" name="${pole("koncert", "wlacz")}" ${_chk(v.wlacz)}> Koncert (4 h, raz na dobę)</label>
      <select name="${pole("koncert", "miejsce")}">${miejsca}</select></div>
      <div class="neuro-zajecie-rzad">${_rzutBtn("koncert", "Występy (CHA)", v.wynik)}</div>
      <p class="hint">Zarobek: wynik × mnożnik miejsca; po koncercie +1 Wyczerpanie.</p>`;
  },
  godziny: v => (v?.wlacz ? KONCERT.godziny : 0),
  rachunek(v) {
    if (!v?.wlacz || !_n(v.wynik)) return [];
    return [{ rodzaj: "zarobek", kwota: zarobekKoncertu({ wynik: v.wynik, miejsce: v.miejsce }), opis: `Koncert: ${MIEJSCA_KONCERTU[v.miejsce]?.label} (${v.wynik})` }];
  },
  rzut: actor => _rzutTestu(actor, { skill: "wys", ability: "cha", flavor: "Za garść gambli — koncert" }),
  async apply(actor, v) {
    if (!v?.wlacz) return null;
    await addExhaustion(actor, "koncert", { chat: false });
    return { linie: [`Koncert (${esc(MIEJSCA_KONCERTU[v.miejsce]?.label ?? "")}): wynik ${_n(v.wynik) || "—"}, +1 Wyczerpanie (Koncert).`], minuty: KONCERT.godziny * 60 };
  }
};

/* -------------------------------------------- */
/*  Rozrywka (s. 47, U34)                        */
/* -------------------------------------------- */

const ROZRYWKA_DEF = {
  id: "rozrywka",
  label: "Rozrywka (s. 47)",
  restTypes: ["long"],
  widoki: ["doba"],
  budzet: "czas",
  render(actor, _typ, ctx) {
    if (!LOKALIZACJE[ctx?.miejsce?.rodzaj]?.rozrywka) {
      return `<p class="hint">Rozrywka tylko w miasteczku i mieście. W dziczy i zapadłej dziurze — Fanty, zwłaszcza kilkuosobowe (gry, nagrania, przedwojenny alkohol).</p>`;
    }
    const v = ctx?.szkic?.zajecia?.rozrywka ?? {};
    return `<div class="neuro-zajecie-rzad"><label class="checkbox"><input type="checkbox" name="${pole("rozrywka", "wlacz")}" ${_chk(v.wlacz)}> 10 h rozrywki</label>
      <label>Wydaję <input type="number" name="${pole("rozrywka", "kwota")}" min="0" step="5" value="${_n(v.kwota) || ROZRYWKA.minGb}"> gb</label></div>
      <p class="hint">Co najmniej 50 gb na rozkosze ciała i ducha → Fuks na 7 dni.</p>`;
  },
  godziny: v => (v?.wlacz ? ROZRYWKA.godziny : 0),
  rachunek: v => (v?.wlacz ? [{ rodzaj: "koszt", kwota: Math.max(0, _n(v.kwota)), opis: "Rozrywka" }] : []),
  async apply(actor, v, { config } = {}) {
    if (!v?.wlacz) return null;
    const ok = rozrywkaDajeFuksa({ rodzaj: _miejsceZ(config)?.rodzaj, godziny: ROZRYWKA.godziny, gb: _n(v.kwota) });
    if (!ok) return { linie: ["Rozrywka: za mało gambli albo nie to miejsce — bez Fuksa."] };
    const f = await przyznajFuksa(actor, "rozrywka", { karta: false });
    return { linie: [f.odmowa ? "Rozrywka: Fuks — ale komplet trzech." : "🍀 Rozrywka: Fuks na 7 dni."] };
  }
};

/* -------------------------------------------- */
/*  Plotkowanie (s. 47, U35)                     */
/* -------------------------------------------- */

const PLOTKI_DEF = {
  id: "plotki",
  label: "Plotkowanie (s. 47)",
  restTypes: ["long"],
  widoki: ["doba"],
  budzet: "czas",
  dostepne: (actor, ctx) => (ctx?.miejsce?.knajpa ? true : "brak knajpy"),
  render(actor, _typ, ctx) {
    const v = ctx?.szkic?.zajecia?.plotki ?? {};
    return `<div class="neuro-zajecie-rzad"><label class="checkbox"><input type="checkbox" name="${pole("plotki", "wlacz")}" ${_chk(v.wlacz)}> Plotki w knajpie</label>
      ${_godzinyInput("plotki", { godziny: v.godziny ?? 1 }, { min: 1, max: 12 })}
      <label>Drinki <input type="number" name="${pole("plotki", "kwota")}" min="5" step="1" value="${_n(v.kwota) || PLOTKI.minGb}"> gb</label></div>
      <div class="neuro-zajecie-rzad">${_rzutBtn("plotki", "CHA (Śledztwo)", v.wynik)}</div>
      <p class="hint">ST 10 — jedna informacja, kolejna za każde 5 ponad ST. Informacje podaje MG.</p>`;
  },
  godziny: v => (v?.wlacz ? Math.max(PLOTKI.minGodzin, _n(v.godziny)) : 0),
  rachunek: v => (v?.wlacz ? [{ rodzaj: "koszt", kwota: Math.max(PLOTKI.minGb, _n(v.kwota)), opis: "Plotki: drinki" }] : []),
  rzut: actor => _rzutTestu(actor, { skill: PLOTKI.umiejetnosc, ability: PLOTKI.cecha, flavor: `Plotkowanie — CHA (Śledztwo) ST ${PLOTKI.st}` }),
  async apply(actor, v) {
    if (!v?.wlacz) return null;
    const n = liczbaInformacji(_n(v.wynik));
    await wyslijKarte(kartaPostoju({ ikona: "icons/svg/sound.svg", tytul: `Plotki: ${actor.name}`, podtytul: "tylko MG",
      linie: [`Wynik ${_n(v.wynik) || "—"} → <strong>${_informacje(n)}</strong> (s. 47).`] }), { szept: "gm", actor });
    return { linie: [`Plotki: ${_informacje(n)} — opowie MG.`] };
  }
};

/* -------------------------------------------- */
/*  Hazard (s. 47, U36, D40)                     */
/* -------------------------------------------- */

/** Test gry (s. 47): pierwszy z tabeli `HAZARD.gry`; narzędzia — test narzędzi. */
function _testHazardu(gra) {
  const t = (HAZARD.gry[gra] ?? HAZARD.gry.karty).testy[0];
  return t.narzedzia ? { tool: t.narzedzia } : { skill: t.umiejetnosc, ability: t.cecha };
}

const HAZARD_DEF = {
  id: "hazard",
  label: "Hazard (s. 47)",
  restTypes: ["long"],
  widoki: ["doba"],
  budzet: "czas",
  dostepne: (actor, ctx) => (_wMiejscowosci(ctx) ? true : "hazard w miejscowości"),
  render(actor, _typ, ctx) {
    const v = ctx?.szkic?.zajecia?.hazard ?? {};
    const gry = Object.entries(HAZARD.gry).map(([k, g]) => `<option value="${k}" ${_sel(k, v.gra ?? "karty")}>${g.label}</option>`).join("");
    const maks = ctx?.miejsce?.maksStawka;
    return `<div class="neuro-zajecie-rzad"><label class="checkbox"><input type="checkbox" name="${pole("hazard", "wlacz")}" ${_chk(v.wlacz)}> Gra (1 h)</label>
      <select name="${pole("hazard", "gra")}">${gry}</select>
      <label>Stawka <input type="number" name="${pole("hazard", "stawka")}" min="0" step="1" value="${_n(v.stawka)}"${maks ? ` max="${maks}"` : ""}> gb</label></div>
      <div class="neuro-zajecie-rzad">${_rzutBtn("hazard", "Test ST 20", v.wynik)}</div>
      <p class="hint">Sukces podwaja postawione gamble, porażka je zabiera${maks ? `; stawka tutaj do ${maks} gb` : ""}.</p>`;
  },
  godziny: v => (v?.wlacz ? HAZARD.godziny : 0),
  rachunek(v) {
    if (!v?.wlacz || !_n(v.stawka)) return [];
    const linie = [{ rodzaj: "koszt", kwota: _n(v.stawka), opis: `Hazard: stawka (${HAZARD.gry[v.gra]?.label})` }];
    if (v.wynik !== "" && v.wynik !== undefined && v.wynik !== null) {
      const w = wynikHazardu({ wynik: _n(v.wynik), stawka: _n(v.stawka) });
      if (w.wygrana) linie.push({ rodzaj: "zarobek", kwota: _n(v.stawka) * 2, opis: "Hazard: wygrana" });
    }
    return linie;
  },
  rzut: (actor, v) => _rzutTestu(actor, { ..._testHazardu(v?.gra), flavor: `Hazard — ${HAZARD.gry[v?.gra]?.label ?? HAZARD.gry.karty.label} ST ${HAZARD.st}` }),
  async apply(actor, v) {
    if (!v?.wlacz) return null;
    const w = wynikHazardu({ wynik: _n(v.wynik), stawka: _n(v.stawka) });
    return { linie: [w.wygrana ? `Hazard: wygrana — +${fmtGb(w.zarobek)}. Zbyt duża wygrana albo przyłapanie może ściągnąć kłopoty (MG).` : `Hazard: przegrana — ${fmtGb(w.strata)} przepada.`] };
  }
};

/* -------------------------------------------- */
/*  Szukanie towarzysza (M3 D30, U38)            */
/* -------------------------------------------- */

const FLAGA_SZUKANIA = "szukanieTowarzysza";

function _zrodlaSzukania(actor) {
  return Object.entries(ZRODLA).filter(([k, z]) => z.szukanie && maZdolnosc(actor, k)).map(([k, z]) => ({ k, nazwa: z.nazwa }));
}

const SZUKANIE_DEF = {
  id: "szukanie",
  label: "Szukanie towarzysza",
  restTypes: ["long"],
  widoki: ["doba"],
  budzet: "czas",
  dostepne: actor => (_zrodlaSzukania(actor).length ? true : "brak zdolności"),
  render(actor, _typ, ctx) {
    const v = ctx?.szkic?.zajecia?.szukanie ?? {};
    const st = actor.getFlag(MODULE_ID, FLAGA_SZUKANIA) ?? {};
    const opcje = _zrodlaSzukania(actor).map(z => `<option value="${z.k}" ${_sel(z.k, v.zrodlo)}>${esc(z.nazwa)}${st[z.k] ? ` (${st[z.k]}/${SZUKANIE.godziny} h)` : ""}</option>`).join("");
    return `<div class="neuro-zajecie-rzad"><select name="${pole("szukanie", "zrodlo")}"><option value="">—</option>${opcje}</select>${_godzinyInput("szukanie", v, { max: 24 })}</div>
      <p class="hint">24 h szukania, dzielone na doby. Prawa ręka — tylko w miejscowości.</p>`;
  },
  godziny: v => (v?.zrodlo ? _n(v.godziny) : 0),
  async apply(actor, v, { config } = {}) {
    if (!v?.zrodlo || !_n(v.godziny)) return null;
    if (v.zrodlo === "moja-prawa-reka" && !LOKALIZACJE[_miejsceZ(config)?.rodzaj]?.utrzymanie) {
      return { linie: ["Prawa ręka: szuka się w miejscowości — ta doba się nie liczy."] };
    }
    const st = actor.getFlag(MODULE_ID, FLAGA_SZUKANIA) ?? {};
    const p = postepSzukania({ dotychczas: st[v.zrodlo] ?? 0, godziny: _n(v.godziny) });
    await actor.update({ [`flags.${MODULE_ID}.${FLAGA_SZUKANIA}.${v.zrodlo}`]: p.ukonczone ? 0 : p.godziny });
    if (!p.ukonczone) return { linie: [`Szukanie (${esc(ZRODLA[v.zrodlo].nazwa)}): ${p.godziny}/${SZUKANIE.godziny} h.`] };
    const z = ZRODLA[v.zrodlo];
    await wyslijKarte(kartaPostoju({
      ikona: "icons/svg/pawprint.svg", tytul: `${actor.name}: ${z.nazwa} — znaleziony`, podtytul: "tylko MG",
      linie: [z.szukanie?.dniOswajania ? `Po 24 h szukania: k6 na rodzaj, potem ${z.szukanie.dniOswajania} doby oswajania (${z.szukanie.strona}).` : `Po 24 h szukania (${z.szukanie.strona}).`],
      przyciski: [{ akcja: "nowyTowarzyszZSzukania", label: "Nowy towarzysz", ikona: "fa-solid fa-user-plus", gm: true, dane: { aktor: actor.uuid, zrodlo: v.zrodlo } }]
    }), { szept: "gm", actor });
    return { linie: [`Szukanie (${esc(z.nazwa)}): ukończone — MG tworzy towarzysza.`] };
  }
};

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

export const ZAJECIA_POSTOJU = Object.freeze([PRACA_DEF, TRENING_DEF, BUDOWA_DEF, KONCERT_DEF, ROZRYWKA_DEF, PLOTKI_DEF, HAZARD_DEF, SZUKANIE_DEF]);

export function registerZajeciaPostoju() {
  for (const def of ZAJECIA_POSTOJU) registerRestActivity(def);
  zarejestrujSekcjePostoju({ id: "baza", kolejnosc: 30, kontekst: _kontekstBazy, szablon: `modules/${MODULE_ID}/templates/postoj/sekcja-baza.hbs` });
  zarejestrujAkcjePostoju({
    neuroBazaProjekt: async function (_ev, btn) {
      if (!game.user.isGM) return;
      await _oknoProjektu(this.actor, projektyBazy(this.actor).find(p => p.nazwa === btn.dataset.nazwa) ?? {});
      this.render();
    },
    neuroBazaUsun: async function (_ev, btn) {
      if (!game.user.isGM) return;
      const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: `Usunąć projekt „${btn.dataset.nazwa}”?` }, content: "<p>Przepracowane godziny przepadną.</p>" });
      if (ok) await usunProjektBazy(this.actor, btn.dataset.nazwa);
      this.render();
    }
  });
  zarejestrujAkcje("nowyTowarzyszZSzukania", async (_ev, btn) => {
    if (!game.user.isGM) return;
    const owner = await fromUuid(btn.dataset.aktor);
    const { nowyTowarzysz } = await import("../actors/towarzysze-tworzenie.mjs");
    if (owner) await nowyTowarzysz(owner, btn.dataset.zrodlo);
  });
}

export const __testing = Object.freeze({ pasywnaDla, wyszkolenieItemData, testHazardu: _testHazardu });
