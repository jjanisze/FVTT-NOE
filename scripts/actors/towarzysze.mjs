/**
 * Neuroshima 5e — towarzysze i drony: rdzeń w Foundry (PLAN_m3_towarzysze.md §7.3–7.4, E1).
 *
 * Zasady liczy `config/towarzysze-rules.mjs`; tu jest to, co dotyka dokumentów:
 *
 *   - **Powiązanie (U1)** — jedna flaga na towarzyszu: `flags.<mod>.towarzysz = { wlasciciel, rodzaj,
 *     klasa }`, dla drona dodatkowo `tworca` (stempel z chwili budowy, D23) i `operator`. Odwrotny indeks
 *     (kto zależy od kogo) liczony w pamięci, nigdy nie zapisywany.
 *   - **Roll data (U2)** — owinięcie `Actor5e#getRollData`: aktor z flagą dostaje `@wlasciciel`, `@tworca`,
 *     `@operator` jako zwarte migawki. Natywne pola dnd5e liczą resztę — TT `custom`, premia ataku `flat`.
 *   - **Dane pochodne (§7.3)** — owinięcia jak `actors/pw.mjs` (DEV_GUIDE §10c.3). W danych bazowych: KW
 *     zwierzęcia (`attributes.hd`) i biegłości ludzkiego towarzysza w broni i pancerzu = właściciela
 *     plus własne (U4), zanim przedmioty policzą biegłość. W pochodnych, po `pw.mjs`: maks. PW z wzoru
 *     (ludzki 5 × poziom klasy właściciela, U5). Zero zapisów: przy zmianie właściciela każdy klient robi
 *     `reset()` jego towarzyszy (spike E0: ~2 ms, bez pułapki „darkvision”), a przy `ready` przegląd
 *     naprawia kolejność przygotowania aktorów (R3).
 *   - **PB +2 (U3)** — stały efekt `OVERRIDE` na karcie, nie ukryty w kodzie; tworzy go narzędzie MG (E4)
 *     i migracja (E5) przez `zapewnijEfektPB`.
 *   - **Stopnie Zranienia (U10)** — `maStopnieZranienia(actor)`: jedno pytanie dla maszyny umierania i
 *     dla krytyka (s. 205, 214).
 *   - **Bramki BG** — `jestTowarzyszem(actor)`: bez Fuksów i PD (D5, U22).
 */

import { RODZAJE } from "../config/towarzysze-data.mjs";
import { migawka, wartosciPochodne, stopnieZranienia } from "../config/towarzysze-rules.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** `flags.<mod>.towarzysz` (U1). */
export const FLAG = "towarzysz";

/** Stały id efektu „PB +2 (nie rośnie)” — wzorzec `dnd5eMatchProficiency` (U3). */
export const EFEKT_PB_ID = "neuroTowarzyszPB";

const _num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);

/* -------------------------------------------- */
/*  Powiązanie i odczyt                          */
/* -------------------------------------------- */

/** Flaga towarzysza albo `null` (także przy nieznanym rodzaju). */
export function towarzysz(actor) {
  const t = actor?.flags?.[MODULE_ID]?.[FLAG];
  return t && RODZAJE[t.rodzaj] ? t : null;
}

/** Czy aktor jest towarzyszem albo dronem (U1). Bramki BG: Fuksy, PD (D5, U22). */
export function jestTowarzyszem(actor) {
  return !!towarzysz(actor);
}

/** Wpis danych rodzaju towarzysza albo `null`. */
export function rodzajTowarzysza(actor) {
  const t = towarzysz(actor);
  return t ? RODZAJE[t.rodzaj] : null;
}

const _aktor = uuid => {
  if (!uuid) return null;
  try {
    const doc = fromUuidSync(uuid);
    return doc instanceof Actor ? doc : null;
  } catch {
    return null;
  }
};

/** Właściciel towarzysza (aktor świata) albo `null` — brak, skasowany, z kompendium. */
export function wlascicielTowarzysza(actor) {
  return _aktor(towarzysz(actor)?.wlasciciel);
}

/** Operator drona na żywo albo `null`. */
export function operatorDrona(actor) {
  return _aktor(towarzysz(actor)?.operator);
}

/* -------------------------------------------- */
/*  Odwrotny indeks — w pamięci                  */
/* -------------------------------------------- */

/** uuid aktora → id aktorów, których wartości od niego zależą (właściciel albo operator). */
let _indeks = null;

function _zbudujIndeks() {
  _indeks = new Map();
  for (const a of game.actors ?? []) {
    const t = towarzysz(a);
    if (!t) continue;
    for (const uuid of [t.wlasciciel, t.operator]) {
      if (!uuid) continue;
      if (!_indeks.has(uuid)) _indeks.set(uuid, new Set());
      _indeks.get(uuid).add(a.id);
    }
  }
  return _indeks;
}

/** Aktorzy zależni od `actor` (jego towarzysze i drony, którymi steruje). */
export function zalezni(actor) {
  if (!actor?.uuid) return [];
  const ids = (_indeks ?? _zbudujIndeks()).get(actor.uuid);
  return ids ? [...ids].map(id => game.actors.get(id)).filter(Boolean) : [];
}

/** Towarzysze właściciela (bez dronów, którymi tylko steruje). */
export function towarzyszeWlasciciela(actor) {
  return zalezni(actor).filter(a => towarzysz(a)?.wlasciciel === actor.uuid);
}

/* -------------------------------------------- */
/*  Migawki i konteksty                          */
/* -------------------------------------------- */

/**
 * Zwarta migawka aktora do roll data towarzysza (U2) — liczby z przygotowanego aktora, bez jego
 * `getRollData` (bez cykli i kosztu).
 * @param {Actor} actor
 * @param {string|null} klasa  klasa, od której liczy się `poziomKlasy`
 */
export function migawkaAktora(actor, klasa = null) {
  const sys = actor?.system ?? {};
  const mody = {};
  for (const [id, a] of Object.entries(sys.abilities ?? {})) mody[id] = a?.mod;
  const poziomy = {};
  for (const [id, c] of Object.entries(actor?.classes ?? {})) poziomy[id] = c?.system?.levels;
  return migawka({ prof: sys.attributes?.prof, mody, poziomy, klasa, nazwa: actor?.name ?? "" });
}

/** Migawka twórcy ze stempla drona (D23): `{ nazwa, prof, int }`. */
function _migawkaTworcy(stempel) {
  if (!stempel) return null;
  return migawka({ prof: stempel.prof, mody: { int: stempel.int }, nazwa: stempel.nazwa ?? "" });
}

/** Konteksty wzorów towarzysza: `{ wlasciciel, tworca, operator }` — migawki albo `null`. */
export function kontekstyTowarzysza(actor) {
  const t = towarzysz(actor);
  if (!t) return { wlasciciel: null, tworca: null, operator: null };
  const w = wlascicielTowarzysza(actor);
  const o = operatorDrona(actor);
  return {
    wlasciciel: w ? migawkaAktora(w, t.klasa ?? RODZAJE[t.rodzaj].klasa) : null,
    tworca: _migawkaTworcy(t.tworca),
    operator: o ? migawkaAktora(o) : null
  };
}

/** Statystyki pochodne towarzysza z bieżących kontekstów (do kart i plakietek) albo `null`. */
export function wartosciTowarzysza(actor) {
  const t = towarzysz(actor);
  return t ? wartosciPochodne(t.rodzaj, kontekstyTowarzysza(actor)) : null;
}

/* -------------------------------------------- */
/*  Maszyny i Stopnie Zranienia (U10)            */
/* -------------------------------------------- */

/**
 * Czy aktor jest maszyną (s. 214): dron z flagi albo typ istoty „Maszyna…”. Typ trzymany jest jako
 * etykieta („Maszyna”, „Maszyna (Molocha)”), nie jako klucz — stąd dopasowanie, jak w `config/fov.mjs`.
 */
export function jestMaszyna(actor) {
  const r = rodzajTowarzysza(actor);
  if (r) return !!r.maszyna;
  const typ = actor?.system?.details?.type;
  return /maszyn/i.test(`${typ?.value ?? ""} ${typ?.custom ?? ""}`);
}

/**
 * Czy istota ma Stopnie Zranienia — „traktowana jak BG” (s. 205): wchodzi w maszynę umierania M1 i
 * dostaje Stopień za krytyk. BG, towarzysz-istota, Bestiariusz ze STOPNIEM ZRANIENIA, BN wprowadzony
 * kartą „BN pada” (D2 M1); maszyny nigdy.
 */
export function maStopnieZranienia(actor) {
  if (!actor || !["character", "npc"].includes(actor.type)) return false;
  const f = actor.flags?.[MODULE_ID] ?? {};
  return stopnieZranienia({
    typ: actor.type,
    towarzysz: towarzysz(actor)?.rodzaj ?? null,
    maszyna: jestMaszyna(actor),
    usesZranienie: f.bestiary?.usesZranienie === true,
    bn: f.umieranie?.bn === true
  });
}

/* -------------------------------------------- */
/*  Dane pochodne                                */
/* -------------------------------------------- */

/** Ostatnie wartości pochodne na instancji — dla kart i plakietek (E3); nie w bazie. */
const DANE = Symbol("towarzysz");

/** Wartości pochodne z ostatniego przygotowania: `{ wartosci, brak }` albo `null`. */
export function daneTowarzysza(actor) {
  return actor?.[DANE] ?? null;
}

function _bazowe(actor) {
  const t = towarzysz(actor);
  if (!t) return;
  const wpis = RODZAJE[t.rodzaj];
  const w = wartosciPochodne(wpis, kontekstyTowarzysza(actor));
  actor[DANE] = { wartosci: w, brak: w.brak };
  const sys = actor.system;

  // KW zwierzęcia (U6) — dnd5e bierze maks. i kość z `hp.formula`; `hd.value` liczy w pochodnych.
  if (actor.type === "npc" && w.kw && sys.attributes?.hd) {
    sys.attributes.hd.max = w.kw.ile;
    sys.attributes.hd.denomination = w.kw.kosc;
  }

  // Biegłości ludzkiego towarzysza = właściciela + własne (U4), na żywo.
  if (actor.type === "character" && !wpis.maszyna) {
    const wl = wlascicielTowarzysza(actor);
    for (const klucz of ["weaponProf", "armorProf"]) {
      const cel = sys.traits?.[klucz]?.value;
      const zrodlo = wl?.system?.traits?.[klucz]?.value;
      if (!(cel instanceof Set) || !zrodlo) continue;
      for (const p of zrodlo) cel.add(p);
    }
  }
}

function _pochodne(actor) {
  const dane = actor[DANE];
  if (!dane) return;
  if (actor.getFlag(MODULE_ID, "pwOverride") === false) return;
  const hp = actor.system.attributes?.hp;
  const pw = dane.wartosci?.pwMaks;
  if (!hp || pw === null || pw === undefined) return; // brak kontekstu — wartość z szablonu
  // Postać: ręcznie wpisane maks. w oknie PW wygrywa, jak w `pw.mjs`. BN trzyma maks. w źródle zawsze.
  if (actor.type === "character" && actor._source.system?.attributes?.hp?.max != null) return;

  hp.max = pw;
  hp.effectiveMax = Math.max(hp.max + _num(hp.tempmax), 0);
  const zrodlo = actor._source.system?.attributes?.hp?.value;
  hp.value = Number.isNumeric(zrodlo) ? Math.min(Number(zrodlo), hp.effectiveMax) : Math.min(_num(hp.value), hp.effectiveMax);
  hp.damage = hp.effectiveMax - hp.value;
  hp.pct = Math.clamp(hp.effectiveMax ? (hp.value / hp.effectiveMax) * 100 : 0, 0, 100);
}

function _owin() {
  const proto = CONFIG.Actor.documentClass.prototype;

  const getRollData = proto.getRollData;
  proto.getRollData = function (...args) {
    const data = getRollData.apply(this, args);
    if (towarzysz(this)) {
      try {
        Object.assign(data, kontekstyTowarzysza(this));
      } catch (err) {
        console.error(`${MODULE_ID} | roll data towarzysza ${this.name}`, err);
      }
    }
    return data;
  };

  const prepareBaseData = proto.prepareBaseData;
  proto.prepareBaseData = function (...args) {
    prepareBaseData.apply(this, args);
    this[DANE] = null;
    try {
      _bazowe(this);
    } catch (err) {
      console.error(`${MODULE_ID} | dane bazowe towarzysza ${this.name}`, err);
    }
  };

  const prepareDerivedData = proto.prepareDerivedData;
  proto.prepareDerivedData = function (...args) {
    prepareDerivedData.apply(this, args);
    try {
      _pochodne(this);
    } catch (err) {
      console.error(`${MODULE_ID} | dane pochodne towarzysza ${this.name}`, err);
    }
  };
}

/* -------------------------------------------- */
/*  Przeliczanie — bez zapisu                    */
/* -------------------------------------------- */

const _doPrzeliczenia = new Set();
let _zaplanowane = false;

/** Przelicza towarzyszy po zmianie aktorów, od których zależą (każdy klient, bez zapisu). */
export function przelicz(actors) {
  for (const a of actors ?? []) if (a) _doPrzeliczenia.add(a);
  if (_zaplanowane) return;
  _zaplanowane = true;
  queueMicrotask(() => {
    _zaplanowane = false;
    const lista = [..._doPrzeliczenia];
    _doPrzeliczenia.clear();
    for (const a of lista) _przeliczJednego(a);
  });
}

function _przeliczJednego(actor) {
  try {
    actor.reset();
  } catch (err) {
    console.error(`${MODULE_ID} | przeliczenie towarzysza ${actor.name}`, err);
    return;
  }
  if (actor.sheet?.rendered) actor.sheet.render(false);
  for (const token of actor.getActiveTokens?.() ?? []) token.renderFlags?.set({ refreshBars: true, refreshEffects: true });
}

/** Zmiana na aktorze, od którego ktoś zależy → przelicz zależnych. */
function _poZmianie(actor) {
  if (!(actor instanceof Actor) || actor.isToken) return;
  const z = zalezni(actor);
  if (z.length) przelicz(z);
}

function _zmianaFlagi(changes) {
  const f = changes?.flags?.[MODULE_ID];
  return !!f && (FLAG in f || `-=${FLAG}` in f);
}

function _rejestrujHaki() {
  Hooks.on("updateActor", (actor, changes) => {
    if (_zmianaFlagi(changes)) {
      _indeks = null;
      if (towarzysz(actor)) przelicz([actor]);
    }
    _poZmianie(actor);
  });
  Hooks.on("createActor", actor => { if (towarzysz(actor)) _indeks = null; });
  Hooks.on("deleteActor", actor => {
    const z = zalezni(actor);
    _indeks = null;
    if (z.length) przelicz(z);
  });
  for (const hook of ["createItem", "updateItem", "deleteItem"]) {
    Hooks.on(hook, item => _poZmianie(item.parent));
  }
  for (const hook of ["createActiveEffect", "updateActiveEffect", "deleteActiveEffect"]) {
    Hooks.on(hook, effect => _poZmianie(effect.parent));
  }
  // Kolejność przygotowania aktorów przy starcie nie jest gwarantowana (R3): towarzysz przygotowany
  // przed właścicielem widział jego surowe dane. Jeden przegląd, gdy wszyscy już są.
  Hooks.once("ready", () => {
    _indeks = null;
    const wszyscy = game.actors.filter(a => towarzysz(a));
    if (wszyscy.length) przelicz(wszyscy);
  });
}

/* -------------------------------------------- */
/*  PB +2 (U3)                                   */
/* -------------------------------------------- */

/** Dane efektu „PB +2 (nie rośnie)” — stały id, widoczny na karcie. */
export function efektPB(pb = 2) {
  return {
    _id: EFEKT_PB_ID,
    name: "Premia Biegłości towarzysza",
    img: "icons/skills/trades/academics-study-reading-book.webp",
    description: `<p>Premia Biegłości towarzysza: +${pb}, nie rośnie z poziomem (NOE s. 76, 101).</p>`,
    changes: [{ key: "system.attributes.prof", mode: CONST.ACTIVE_EFFECT_MODES.OVERRIDE, value: String(pb), priority: 50 }],
    flags: { [MODULE_ID]: { [FLAG]: "pb" } }
  };
}

/** Tworzy albo poprawia efekt U3 na ludzkim towarzyszu. Zwraca `true`, gdy coś zapisał. */
export async function zapewnijEfektPB(actor) {
  const pb = rodzajTowarzysza(actor)?.pb;
  if (pb === null || pb === undefined || actor.type !== "character") return false;
  const dane = efektPB(pb);
  const jest = actor.effects.get(EFEKT_PB_ID);
  if (!jest) {
    await actor.createEmbeddedDocuments("ActiveEffect", [dane], { keepId: true });
    return true;
  }
  const zgodny = jest.changes.length === 1 && jest.changes[0].key === dane.changes[0].key
    && Number(jest.changes[0].value) === pb && jest.changes[0].mode === dane.changes[0].mode && !jest.disabled;
  if (zgodny) return false;
  await jest.update({ changes: dane.changes, disabled: false });
  return true;
}

/* -------------------------------------------- */
/*  Nagrody drużyny (U22)                        */
/* -------------------------------------------- */

/**
 * Okno nagrody dnd5e dzieli gamble i PD między członków drużyny (`group.system.transferDestinations`).
 * Towarzysz jest członkiem dla jedzenia i wody (D19), ale udziału nie bierze — członkostwo nie zabiera
 * graczom części łupu (U22). 1/10 doli Prawej ręki to M5.
 */
function _owinNagrody() {
  const Award = globalThis.dnd5e?.applications?.Award;
  const desc = Award && Object.getOwnPropertyDescriptor(Award.prototype, "transferDestinations");
  if (!desc?.get) {
    console.warn(`${MODULE_ID} | Award.transferDestinations nie znaleziony — towarzysze dostaną udział w nagrodach`);
    return;
  }
  Object.defineProperty(Award.prototype, "transferDestinations", {
    ...desc,
    get() {
      return desc.get.call(this).filter(d => !jestTowarzyszem(d));
    }
  });
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

/**
 * `init`, po `registerPW` i `registerSP`: owinięcia danych pochodnych są wtedy zewnętrzne — maks. PW
 * towarzysza ustawia się po `pw.mjs`, który postaci bez klasy NOE nie rusza.
 */
export function registerTowarzysze() {
  _owin();
  _owinNagrody();
  _rejestrujHaki();
  console.log(`${MODULE_ID} | Towarzysze registered (roll data, PW/KW, biegłości)`);
}

export const towarzyszeApi = Object.freeze({
  towarzysz, jestTowarzyszem, rodzajTowarzysza, wlasciciel: wlascicielTowarzysza, operator: operatorDrona,
  zalezni, towarzyszeWlasciciela, wartosci: wartosciTowarzysza, dane: daneTowarzysza,
  maStopnieZranienia, jestMaszyna, przelicz, zapewnijEfektPB
});
