/**
 * Neuroshima 5e — drony: model, produkcja, rozłożenie (PLAN_m3_towarzysze.md §7.9, U11, U12; E7a).
 *
 *   - **Model (U11):** dron to aktor BN-maszyna z szablonu paczki `towarzysze` (folder „Drony”, żeton
 *     połączony) z flagą towarzysza `{ rodzaj, klasa, wlasciciel: null, tworca, operator }`; w ekwipunku
 *     leży **uchwyt** — przedmiot z flagą `dron: { aktor, rodzaj, rozlozony }`. Wskaźnik tylko w tę
 *     stronę: id przedmiotu zmienia się przy każdym przeniesieniu. Trzy role: **posiadacz** (czyj
 *     ekwipunek trzyma uchwyt — liczone), **operator** (flaga, na żywo — E7b), **twórca** (stempel, D23).
 *   - **Stempel twórcy (D23):** kierownik Roboty w chwili ukończenia — imię, PB, mod. INT, czas świata.
 *     Z niego TT i PW drona (`@tworca`, U13); karta drona mówi „System ruszył <data>”.
 *   - **Produkcja:** wiersz Hakerstwa z wynikiem `aktor` (`tabela:dron-*`) kończy się dronem i złożonym
 *     uchwytem u posiadacza Roboty (`production/robota.mjs`). Waga i cena złożonego — D21.
 *   - **Rozłóż [A] / Złóż [A] (U12):** aktywności uchwytu. Gracz wskazuje miejsce podglądem żetonu
 *     (`TokenPlacement` dnd5e), prośba idzie flagą na jego aktorze, aktywny MG tworzy albo usuwa żeton —
 *     wzorzec przekaźnika z `wkk/items/flara.mjs`. Ponad 1,5 m od posiadacza — ostrzeżenie, bez blokady.
 *     **Stan uchwytu wynika z żetonów:** rozłożony ⟺ dron ma żeton na jakiejś scenie. Aktywny MG
 *     poprawia uchwyt po każdym utworzeniu i usunięciu żetonu drona, także ręcznym (MG przeciągnął drona
 *     z katalogu, skasował żeton albo scenę). Rozłożony nie waży nic (poza udźwigiem).
 *   - **Bez klonów:** uchwyt jest jeden na drona, jak Robota (`production/przenoszenie.mjs`, D21 produkcji):
 *     przeciągnięcie przenosi (utworzenie u celu z opcją ruchu, potem usunięcie źródła), „Duplikuj” jest
 *     wyłączone, drugi egzemplarz odrzuca `preCreateItem`, ilość zawsze 1, kopia aktora — bez uchwytów.
 *     Własność drona idzie za posiadaczem: gracze-właściciele posiadacza są właścicielami drona.
 *   - **Wrak (U11, E9):** dron zniszczony (status „martwy” po karcie „Śmierć”) — uchwyt to „Wrak drona”: da się go
 *     złożyć i nieść, nie da się rozłożyć ani naprawić; złom i surowce rozstrzyga MG (M5). Stan wynika z drona.
 */

import { RODZAJE } from "../config/towarzysze-data.mjs";
import { FLAG, towarzysz, rodzajTowarzysza } from "./towarzysze.mjs";
import { szablonTowarzysza } from "./towarzysze-tworzenie.mjs";
import { odlegloscAktorow } from "../production/przenoszenie.mjs";
import { formatWorldDate } from "../world-clock.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/** `flags.<mod>.dron` na uchwycie (U11). */
export const FLAG_UCHWYT = "dron";
/** Kolejka próśb gracza do MG na jego aktorze: `{ <nonce>: { akcja, … } }` (U12). */
const FLAG_PROSBY = "dronProsby";
/** Opcja `createEmbeddedDocuments` — jedyna droga drugiego egzemplarza uchwytu (przeniesienie). */
const MOVE_OPT = "neuroDronMove";
const FOLDER = "Drony";
/** Stałe id aktywności uchwytu (16 znaków, jak id dokumentu). */
export const AKT_ROZLOZ = "neuroDronRozloz0";
export const AKT_ZLOZ = "neuroDronZloz000";
export const AKT_AKUMULATOR = "neuroDronAkumul0";
export const AKT_NAPRAW_PW = "neuroDronNaprawa";
export const AKT_NAPRAW_AWARIE = "neuroDronAwaria0";
/** Zatrzask aktywacji [A]/[B] na dronie (U20): `{ combatId, runda, tryb, operator }`. */
export const FLAG_AKTYWACJA = "dronAktywacja";
/** Reakcja drona [R] w rundzie: `{ combatId, runda, operator }`. */
export const FLAG_REAKCJA = "dronReakcja";
/**
 * OWNER nadany operatorowi przez moduł (D12): `{ <userId>: "zdalny" | "reakcja" }`. Tylko te wpisy moduł
 * odbiera — przy wyjściu z trybu zdalnego, przejęciu, złożeniu, rozłączeniu; „reakcja” — przy zmianie tury.
 */
export const FLAG_NADANE = "dronNadane";
/** Sterowanie potwierdzone przez MG (E8): `{ znacznik, user, operator }` — klient czeka na swój znacznik. */
export const FLAG_STEROWANIE = "dronSterowanie";
/** Rozłożenie i złożenie „obok siebie” (U12) — dalej ostrzeżenie. */
const ZASIEG_M = 1.5;

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/* -------------------------------------------- */
/*  Odczyt                                       */
/* -------------------------------------------- */

/** Flaga uchwytu albo `null`. */
export function uchwyt(item) {
  const d = item?.flags?.[MODULE_ID]?.[FLAG_UCHWYT];
  return d?.aktor ? d : null;
}

export function jestUchwytem(item) {
  return !!uchwyt(item);
}

/** Czy aktor jest dronem (towarzysz-maszyna). */
export function jestDronem(actor) {
  return !!rodzajTowarzysza(actor)?.maszyna;
}

/** Dron, na który wskazuje uchwyt, albo `null` (skasowany, z kompendium). */
export function dronUchwytu(item) {
  const uuid = uchwyt(item)?.aktor;
  if (!uuid) return null;
  try {
    const doc = fromUuidSync(uuid);
    return doc instanceof Actor ? doc : null;
  } catch {
    return null;
  }
}

/** Uchwyt drona w ekwipunku któregokolwiek aktora świata albo `null`. */
export function uchwytDrona(dron) {
  if (!dron?.uuid) return null;
  for (const a of game.actors) for (const i of a.items) if (uchwyt(i)?.aktor === dron.uuid) return i;
  return null;
}

/** Posiadacz drona — czyj ekwipunek trzyma uchwyt (U11). */
export function posiadaczDrona(dron) {
  return uchwytDrona(dron)?.parent ?? null;
}

/** Drony w ekwipunku aktora: `[{ uchwyt, dron }]` (bez uchwytów, których dron zniknął). */
export function dronyPosiadacza(actor) {
  return (actor?.items?.contents ?? []).filter(jestUchwytem)
    .map(i => ({ uchwyt: i, dron: dronUchwytu(i) })).filter(x => x.dron);
}

/** Żetony drona na wszystkich scenach (połączone z aktorem). */
export function zetonyDrona(dron) {
  if (!dron) return [];
  const out = [];
  for (const s of game.scenes) for (const t of s.tokens) if (t.actorLink && t.actorId === dron.id) out.push(t);
  return out;
}

/** Czy dron stoi gdzieś na scenie (U12: stan uchwytu wynika z żetonów). */
export function dronRozlozony(dron) {
  return zetonyDrona(dron).length > 0;
}

/** Linia D23: „System ruszył 4 sierpnia 2051 roku.” albo `null`, gdy kalendarza nie ma. */
export function liniaUruchomienia(dron) {
  const kiedy = towarzysz(dron)?.tworca?.zbudowano;
  if (!Number.isFinite(kiedy)) return null;
  const data = formatWorldDate(kiedy);
  return data ? `System ruszył ${data} roku.` : null;
}

/* -------------------------------------------- */
/*  Uchwyt                                       */
/* -------------------------------------------- */

function _nazwaUchwytu(dron, rozlozony) {
  if (jestWrakiem(dron)) return `Wrak drona (${dron.name})`;
  return `${dron.name}${rozlozony ? " (rozłożony)" : ""}`;
}

function _opisUchwytu(dron, wpis) {
  return `<p>Złożony ${esc(wpis.nazwa.toLowerCase())}: @UUID[${dron.uuid}]{${esc(dron.name)}}. Waży ${wpis.zlozony.waga} kg; `
    + "rozłożony stoi na ziemi i nie wlicza się do udźwigu.</p>"
    + "<p><strong>Rozłóż [A]</strong> — postaw żeton drona obok siebie. <strong>Złóż [A]</strong> — dron musi stać obok "
    + "(1,5 m). Uchwyt jest jeden — przeciągnięcie na inną kartę przenosi drona razem z nim.</p>"
    + `<p><strong>Zasilanie:</strong> akumulator 24 V — ${wpis.akumulatorGodzin} h pracy rozłożonego drona (s. 83). `
    + "<strong>Włóż akumulator [A]</strong> — świeży z ekwipunku do gniazda, stary wraca z resztą ładunku.</p>"
    + "<p><strong>Napraw PW (1 h)</strong> — 2k6 + mod. INT naprawiającego, narzędzia hakera i elektronika (s. 83). "
    + "<strong>Napraw awarię</strong> — skutki z Tabeli awarii, które trwają do naprawy.</p>";
}

function _aktywnosc(id, name, img, sort, chatFlavor) {
  return {
    _id: id, type: "utility", name, img, sort,
    activation: { type: "action", value: 1, condition: "", override: false },
    description: { chatFlavor }
  };
}

/** Aktywności naprawy uchwytu (E9) — także dokładane do uchwytów sprzed E9 (`_synchronizuj`). */
export function aktywnosciNaprawy() {
  const a = _aktywnosc(AKT_NAPRAW_PW, "Napraw PW (1 h)", `modules/${MODULE_ID}/icons/abilities/naprawianie.svg`, 400000, "Godzina pracy przy dronie: 2k6 + mod. INT PW.");
  a.activation = { type: "hour", value: 1, condition: "", override: false };
  return {
    [AKT_NAPRAW_PW]: a,
    [AKT_NAPRAW_AWARIE]: _aktywnosc(AKT_NAPRAW_AWARIE, "Napraw awarię", "icons/svg/hazard.svg", 500000, "Naprawa skutku z Tabeli awarii maszyn.")
  };
}

/** Dane uchwytu drona (U11). */
export function daneUchwytu(dron, { rozlozony = false } = {}) {
  const t = towarzysz(dron);
  const wpis = RODZAJE[t.rodzaj];
  return {
    name: _nazwaUchwytu(dron, rozlozony),
    type: "equipment",
    img: dron.img,
    system: {
      type: { value: "trinket", baseItem: "" },
      description: { value: _opisUchwytu(dron, wpis), chat: "" },
      weight: { value: rozlozony ? 0 : wpis.zlozony.waga, units: "kg" },
      price: { value: wpis.zlozony.cena, denomination: "gb" },
      quantity: 1,
      identifier: "dron",
      activities: {
        [AKT_ROZLOZ]: _aktywnosc(AKT_ROZLOZ, "Rozłóż", "icons/svg/upgrade.svg", 100000, "Dron staje na ziemi."),
        [AKT_ZLOZ]: _aktywnosc(AKT_ZLOZ, "Złóż", "icons/svg/downgrade.svg", 200000, "Dron wraca do ekwipunku."),
        [AKT_AKUMULATOR]: _aktywnosc(AKT_AKUMULATOR, "Włóż akumulator", "icons/svg/lightning.svg", 300000, "Świeży akumulator w gnieździe drona."),
        ...aktywnosciNaprawy()
      }
    },
    flags: { [MODULE_ID]: {
      [FLAG_UCHWYT]: { aktor: dron.uuid, rodzaj: t.rodzaj, rozlozony, zasilanie: { procent: 100, od: null } },
      dollSlot: "none"
    } }
  };
}

/* -------------------------------------------- */
/*  Tworzenie (MG)                               */
/* -------------------------------------------- */

/** Stempel twórcy z chwili budowy (D23). */
export function stempelTworcy(actor) {
  return {
    uuid: actor?.uuid ?? null,
    nazwa: actor?.name ?? "",
    prof: Number(actor?.system?.attributes?.prof) || 0,
    int: Number(actor?.system?.abilities?.int?.mod) || 0,
    zbudowano: game.time.worldTime
  };
}

async function _folder() {
  return game.folders.find(f => f.type === "Actor" && f.name === FOLDER)
    ?? Folder.implementation.create({ name: FOLDER, type: "Actor", color: "#3d4a52" });
}

/** Poziomy własności drona za posiadaczem: gracze-właściciele posiadacza — OWNER, reszta graczy — brak. */
function _wlasnoscZa(holder, obecna = {}, nadane = {}) {
  const lv = CONST.DOCUMENT_OWNERSHIP_LEVELS;
  const out = {};
  for (const u of game.users) {
    // Operator z nadaną własnością (D12) trzyma ją do wyjścia z trybu zdalnego, nie do zmiany posiadacza.
    if (u.isGM || nadane[u.id]) continue;
    const chce = holder?.testUserPermission(u, "OWNER") ? lv.OWNER : lv.NONE;
    if ((obecna[u.id] ?? lv.NONE) !== chce) out[u.id] = chce;
  }
  return out;
}

/**
 * Zmiany odbierające OWNER nadany operatorom (D12) — użytkownikom `userIds` albo wszystkim z `FLAG_NADANE`
 * (tylko MG). Użytkownik wraca do tego, co daje mu posiadacz uchwytu. `null` — nie ma czego odbierać.
 * @param {Actor} dron
 * @param {string[]|null} [userIds]
 * @param {{rodzaj?: string}} [o]  tylko nadania tego rodzaju (`"reakcja"`)
 */
export function zmianyOdebrania(dron, userIds = null, { rodzaj = null } = {}) {
  const nadane = dron?.flags?.[MODULE_ID]?.[FLAG_NADANE] ?? {};
  const ids = Object.keys(nadane).filter(id => nadane[id] && (!userIds || userIds.includes(id))
    && (!rodzaj || nadane[id] === rodzaj));
  if (!ids.length) return null;
  const lv = CONST.DOCUMENT_OWNERSHIP_LEVELS;
  const holder = posiadaczDrona(dron);
  const own = foundry.utils.deepClone(dron._source.ownership ?? {});
  const zmiany = {};
  for (const id of ids) {
    const u = game.users.get(id);
    if (u && holder?.testUserPermission(u, "OWNER")) own[id] = lv.OWNER;
    else delete own[id];
    zmiany[`flags.${MODULE_ID}.${FLAG_NADANE}.-=${id}`] = null;
  }
  // Jak arkusz własności rdzenia: całe pole naraz (`_replace`), bo usunięty klucz ma zniknąć, nie zostać.
  zmiany.ownership = _replace(own);
  return zmiany;
}

/**
 * Tworzy drona i jego złożony uchwyt u posiadacza (tylko MG; gracz idzie przez `zbudujDrona`).
 * @param {Actor} holder
 * @param {string} rodzaj  `dron-kroczacy` | `dron-latajacy`
 * @param {{stempel?: object, tworca?: Actor, nazwa?: string}} [o]
 * @returns {Promise<{dron: Actor, uchwyt: Item}|null>}
 */
export async function utworzDrona(holder, rodzaj, { stempel = null, tworca = null, nazwa = null } = {}) {
  if (!game.user.isGM) {
    ui.notifications.warn("Drona tworzy MG.");
    return null;
  }
  const wpis = RODZAJE[rodzaj];
  if (!holder || !wpis?.maszyna) return null;
  const szablon = await szablonTowarzysza(rodzaj);
  if (!szablon) {
    ui.notifications.error(`Brak szablonu „${wpis.nazwa}” w paczce Towarzysze.`);
    return null;
  }
  const folder = await _folder();
  const name = (nazwa ?? "").trim() || wpis.nazwa;
  const data = game.actors.fromCompendium(szablon);
  foundry.utils.mergeObject(data, {
    name, folder: folder.id,
    ownership: { default: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE, ..._wlasnoscZa(holder) },
    flags: { [MODULE_ID]: { [FLAG]: {
      rodzaj, klasa: wpis.klasa, wlasciciel: null, operator: null,
      tworca: stempel ?? stempelTworcy(tworca ?? holder)
    } } }
  });
  data.prototypeToken = { ...(data.prototypeToken ?? {}), name };
  const dron = await Actor.implementation.create(data);
  // Pełne PW na start: maks. liczy moduł ze stempla twórcy, źródło ma tylko bieżące.
  await dron.update({ "system.attributes.hp.value": dron.system.attributes.hp.max });
  const [u] = await holder.createEmbeddedDocuments("Item", [daneUchwytu(dron)]);
  return { dron, uchwyt: u };
}

/** Rodzaj drona z odwołania wyniku produkcji (`tabela:dron-kroczacy`) albo `null`. */
export function rodzajZPrzepisu(ref) {
  const id = String(ref ?? "").replace(/^tabela:/, "");
  return Object.entries(RODZAJE).find(([, w]) => w.maszyna && w.przepis === id)?.[0] ?? null;
}

/**
 * Wynik produkcji drona (U11): dron i uchwyt u posiadacza Roboty. U gracza — prośba do MG.
 * @param {Actor} holder  posiadacz Roboty
 * @param {string} rodzaj
 * @param {{tworca?: Actor}} [o]  kierownik Roboty — stempel D23
 * @returns {Promise<{dron?: Actor, uchwyt?: Item, prosba?: boolean}|null>}
 */
export async function zbudujDrona(holder, rodzaj, { tworca = null } = {}) {
  const stempel = stempelTworcy(tworca ?? holder);
  if (game.user.isGM) return utworzDrona(holder, rodzaj, { stempel });
  await _prosba(holder, { akcja: "utworz", rodzaj, stempel });
  return { prosba: true };
}

/* -------------------------------------------- */
/*  Przekaźnik MG (U12)                          */
/* -------------------------------------------- */

/** Akcje przekaźnika dokładane przez inne pliki (`zarejestrujAkcje`) — bez importu w drugą stronę. */
const _akcje = new Map();

/**
 * Rejestruje akcję przekaźnika MG: `fn(actor, dane)` wykonuje aktywny MG dla prośby `{ akcja: nazwa, … }`.
 * @param {string} nazwa
 * @param {(actor: Actor, dane: object) => Promise<any>} fn
 */
export function zarejestrujAkcje(nazwa, fn) {
  _akcje.set(nazwa, fn);
}

/**
 * Prośba do MG o zapis, którego gracz nie może zrobić sam (U12). MG wykonuje od razu; gracz kładzie ją
 * flagą na aktorze, którego jest właścicielem, a wykonuje aktywny MG.
 * @param {Actor} actor  aktor gracza (właściciel)
 * @param {{akcja: string}} dane
 */
export async function prosbaDoMG(actor, dane) {
  if (game.user.isGM) return _wykonaj(actor, { ...dane, user: game.user.id });
  return _prosba(actor, dane);
}

async function _prosba(actor, dane) {
  const nonce = foundry.utils.randomID(12);
  if (!game.users.activeGM) ui.notifications.warn("Brak MG online — prośba o drona czeka, aż MG wejdzie do gry.");
  await actor.update({ [`flags.${MODULE_ID}.${FLAG_PROSBY}.${nonce}`]: { ...dane, user: game.user.id } });
}

const _wToku = new Set();

async function _obsluzProsby(actor) {
  if (!game.user.isActiveGM) return;
  const prosby = actor.flags?.[MODULE_ID]?.[FLAG_PROSBY] ?? {};
  for (const [nonce, dane] of Object.entries(prosby)) {
    if (!dane || typeof dane !== "object" || _wToku.has(nonce)) continue;
    _wToku.add(nonce);
    try {
      await _wykonaj(actor, dane);
    } catch (err) {
      console.error(`${MODULE_ID} | prośba o drona (${dane.akcja})`, err);
    } finally {
      // Zawsze — prośba jest jednorazowa; błąd nie może jej zostawić do powtórki przy następnej zmianie.
      try { await actor.update({ [`flags.${MODULE_ID}.${FLAG_PROSBY}.-=${nonce}`]: null }); } catch { /* aktor zniknął */ }
      _wToku.delete(nonce);
    }
  }
}

async function _wykonaj(actor, dane) {
  if (_akcje.has(dane.akcja)) return _akcje.get(dane.akcja)(actor, dane);
  switch (dane.akcja) {
    case "utworz":
      return utworzDrona(actor, dane.rodzaj, { stempel: dane.stempel });
    case "rozloz":
      return _postaw(dane);
    case "zloz":
      return _zabierz(dane);
  }
}

async function _postaw({ uchwyt: uuid, sceneId, x, y, elevation = 0, rotation = 0 }) {
  const item = fromUuidSync(uuid);
  const dron = dronUchwytu(item);
  const scene = game.scenes.get(sceneId);
  if (!dron || !scene) return null;
  if (dronRozlozony(dron)) return null;
  const doc = await dron.getTokenDocument({ x, y, elevation, rotation });
  const [t] = await scene.createEmbeddedDocuments("Token", [doc.toObject()]);
  await _karta(item.parent, dron, "rozkłada");
  return t ?? null;
}

async function _zabierz({ uchwyt: uuid }) {
  const item = fromUuidSync(uuid);
  const dron = dronUchwytu(item);
  if (!dron) return;
  const naScenach = new Map();
  for (const t of zetonyDrona(dron)) {
    if (!naScenach.has(t.parent)) naScenach.set(t.parent, []);
    naScenach.get(t.parent).push(t.id);
  }
  if (!naScenach.size) return;
  // Złożony dron nie ma operatora ani aktywacji (E7b) — kolejne wejście zaczyna od zera.
  await dron.update({
    [`flags.${MODULE_ID}.${FLAG}.operator`]: null,
    [`flags.${MODULE_ID}.-=${FLAG_AKTYWACJA}`]: null,
    [`flags.${MODULE_ID}.-=${FLAG_REAKCJA}`]: null,
    [`flags.${MODULE_ID}.-=${FLAG_STEROWANIE}`]: null,
    ...(zmianyOdebrania(dron) ?? {})
  });
  for (const [scene, ids] of naScenach) await scene.deleteEmbeddedDocuments("Token", ids);
  await _karta(item.parent, dron, "składa");
}

async function _karta(holder, dron, co) {
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor: holder }),
    content: `<p><img src="${esc(dron.img)}" alt="" width="24" height="24" style="vertical-align: middle; border: none"> `
      + `<strong>${esc(holder?.name ?? "")}</strong> ${co} drona @UUID[${dron.uuid}]{${esc(dron.name)}}.</p>`
  });
}

/* -------------------------------------------- */
/*  Rozłóż / Złóż — strona gracza                */
/* -------------------------------------------- */

function _zetonPosiadacza(actor) {
  const own = (canvas?.tokens?.controlled ?? []).find(t => t.actor?.id === actor?.id);
  return own ?? actor?.getActiveTokens?.(true)?.[0] ?? null;
}

/** Odstęp krawędź–krawędź między żetonem a prostokątem w metrach (sąsiednie pola = 0). */
function _odstep(token, { x, y, width, height }) {
  const s = canvas.grid.size;
  const A = { x: token.document.x, y: token.document.y, w: token.document.width * s, h: token.document.height * s };
  const B = { x, y, w: width * s, h: height * s };
  const dx = Math.max(0, A.x - (B.x + B.w), B.x - (A.x + A.w));
  const dy = Math.max(0, A.y - (B.y + B.h), B.y - (A.y + A.h));
  return (Math.hypot(dx, dy) / s) * canvas.grid.distance;
}

/**
 * Rozłóż [A] (U12): podgląd żetonu, prośba do MG. `pozycja` pomija podgląd, `scena` — inna niż
 * oglądana (makra, testy).
 * @param {Item} item  uchwyt
 * @param {{pozycja?: {x: number, y: number, elevation?: number}, scena?: Scene}} [o]
 */
export async function rozloz(item, { pozycja = null, scena = null } = {}) {
  const dron = dronUchwytu(item);
  if (!dron) return ui.notifications.warn(`${item?.name ?? "Uchwyt"}: drona nie ma w świecie.`), null;
  if (dronRozlozony(dron)) return ui.notifications.info(`${dron.name} już stoi na scenie.`), null;
  const scene = scena ?? canvas?.scene;
  if (!scene) return ui.notifications.warn("Brak aktywnej sceny — nie ma gdzie postawić drona."), null;
  const holder = item.parent;
  const origin = scene === canvas?.scene ? _zetonPosiadacza(holder) : null;
  let p = pozycja;
  if (!p) {
    const TokenPlacement = globalThis.dnd5e?.canvas?.TokenPlacement;
    if (!TokenPlacement) return ui.notifications.error("Brak podglądu żetonu dnd5e."), null;
    [p] = await TokenPlacement.place({ origin: origin?.document, tokens: [dron.prototypeToken] });
    if (!p) return null;
  }
  if (origin) {
    const d = _odstep(origin, { x: p.x, y: p.y, width: dron.prototypeToken.width, height: dron.prototypeToken.height });
    if (d > ZASIEG_M) ui.notifications.warn(`${dron.name} staje ${d.toFixed(1)} m od ${holder.name} (> ${ZASIEG_M} m) — rozłożenie i tak idzie, MG oceni.`);
  }
  const dane = {
    akcja: "rozloz", uchwyt: item.uuid, sceneId: scene.id,
    x: p.x, y: p.y, elevation: p.elevation ?? origin?.document?.elevation ?? 0, rotation: p.rotation ?? 0
  };
  if (game.user.isGM) return _postaw(dane);
  await _prosba(holder, dane);
  return true;
}

/**
 * Złóż [A] (U12): dron wraca do ekwipunku posiadacza. Dalej niż 1,5 m — ostrzeżenie, bez blokady.
 * @param {Item} item  uchwyt
 */
export async function zloz(item) {
  const dron = dronUchwytu(item);
  if (!dron) return ui.notifications.warn(`${item?.name ?? "Uchwyt"}: drona nie ma w świecie.`), null;
  if (!dronRozlozony(dron)) return ui.notifications.info(`${dron.name} jest już złożony.`), null;
  const holder = item.parent;
  const d = odlegloscAktorow(holder, dron);
  if (d !== null && d > ZASIEG_M) ui.notifications.warn(`${dron.name} jest ${d.toFixed(1)} m od ${holder.name} (> ${ZASIEG_M} m) — złożenie i tak idzie, MG oceni.`);
  const dane = { akcja: "zloz", uchwyt: item.uuid };
  if (game.user.isGM) return _zabierz(dane);
  await _prosba(holder, dane);
  return true;
}

function _onPreUseActivity(activity) {
  if (![AKT_ROZLOZ, AKT_ZLOZ].includes(activity?.id)) return;
  const item = activity.actor?.items.get(activity.item?.id) ?? activity.item;
  if (!jestUchwytem(item)) return;
  if (activity.id === AKT_ROZLOZ && jestWrakiem(dronUchwytu(item))) {
    ui.notifications.warn(`${item.name}: wrak nie działa — złom i surowce rozstrzyga MG.`);
    return false;
  }
  // Aktywność jest tylko przyciskiem: natywna karta i zużycie nie mają tu nic do zrobienia.
  (activity.id === AKT_ROZLOZ ? rozloz(item) : zloz(item))
    .catch(err => console.error(`${MODULE_ID} | ${activity.name} drona`, err));
  return false;
}

/* -------------------------------------------- */
/*  Uchwyt za żetonami i posiadaczem (aktywny MG) */
/* -------------------------------------------- */

/** Czy dron jest wrakiem (U11): zniszczony — status „martwy” po karcie „Śmierć”. */
export function jestWrakiem(dron) {
  return !!dron?.statuses?.has("dead");
}

/** Uchwyt zgodny z dronem: stan z żetonów (U12), nazwa i obrazek drona. Pisze tylko różnice. */
async function _synchronizuj(dron) {
  const u = uchwytDrona(dron);
  if (!u) return;
  const wpis = rodzajTowarzysza(dron);
  if (!wpis) return;
  const rozlozony = dronRozlozony(dron);
  const zmiany = {};
  if (!!uchwyt(u).rozlozony !== rozlozony) zmiany[`flags.${MODULE_ID}.${FLAG_UCHWYT}.rozlozony`] = rozlozony;
  const waga = rozlozony ? 0 : wpis.zlozony.waga;
  if (Number(u.system.weight?.value) !== waga) zmiany["system.weight.value"] = waga;
  const nazwa = _nazwaUchwytu(dron, rozlozony);
  if (u.name !== nazwa) zmiany.name = nazwa;
  if (!!uchwyt(u).wrak !== jestWrakiem(dron)) zmiany[`flags.${MODULE_ID}.${FLAG_UCHWYT}.wrak`] = jestWrakiem(dron);
  for (const [id, dane] of Object.entries(aktywnosciNaprawy())) {
    if (u.system.activities?.get?.(id)) continue;
    // Pełne dane jak `Item5e#createActivity` — częściowe przy aktualizacji nie przechodzą walidacji (przy tworzeniu
    // przedmiotu wartości domyślne dokłada schemat).
    const cls = CONFIG.DND5E.activityTypes[dane.type]?.documentClass;
    if (cls) zmiany[`system.activities.${id}`] = new cls(foundry.utils.deepClone(dane), { parent: u }).toObject();
  }
  if (u.img !== dron.img) zmiany.img = dron.img;
  if (Object.keys(zmiany).length) await u.update(zmiany);
}

/** Własność drona za nowym posiadaczem uchwytu. */
async function _wlasnoscZaUchwytem(item) {
  const dron = dronUchwytu(item);
  if (!dron || !(item.parent instanceof Actor)) return;
  const zmiany = _wlasnoscZa(item.parent, dron.ownership, dron.flags?.[MODULE_ID]?.[FLAG_NADANE]);
  if (Object.keys(zmiany).length) await dron.update({ ownership: zmiany });
}

const _jakoMG = fn => (...args) => {
  if (!game.user.isActiveGM) return;
  Promise.resolve(fn(...args)).catch(err => console.error(`${MODULE_ID} | drony`, err));
};

/* -------------------------------------------- */
/*  Bez klonów (jak Robota)                      */
/* -------------------------------------------- */

/**
 * Przenosi uchwyt (i drona) do innego aktora — jedyna droga zmiany posiadacza.
 * Najpierw tworzy u celu, potem usuwa źródło: przerwany ruch zostawia dwa egzemplarze, nigdy zero.
 * @returns {Promise<Item|null>}
 */
export async function przeniesUchwyt(item, cel) {
  const zrodlo = item?.parent;
  if (!jestUchwytem(item) || !zrodlo || !cel) return null;
  if (zrodlo === cel) return item;
  if (cel.isToken && !cel.token?.actorLink) {
    ui.notifications.warn(`${cel.name}: niepołączony żeton nie może trzymać drona — połącz aktora z żetonem.`);
    return null;
  }
  if (!cel.isOwner || !zrodlo.isOwner) {
    ui.notifications.warn(`Przeniesienie drona do ${cel.name} — bez uprawnień do obu kart robi to MG.`);
    return null;
  }
  const data = item.toObject();
  delete data._id;
  delete data.folder;
  if (data.system) delete data.system.container;
  const [nowy] = await cel.createEmbeddedDocuments("Item", [data], { [MOVE_OPT]: true });
  if (!nowy) return null;
  await zrodlo.deleteEmbeddedDocuments("Item", [item.id], { [MOVE_OPT]: true });
  return nowy;
}

function _innyEgzemplarz(aktorUuid) {
  for (const a of game.actors) for (const i of a.items) if (uchwyt(i)?.aktor === aktorUuid) return i;
  return null;
}

function _preCreateItem(item, data, options) {
  const d = foundry.utils.getProperty(data, `flags.${MODULE_ID}.${FLAG_UCHWYT}`);
  if (!d?.aktor) return;
  const parent = item.parent;
  if (!(parent instanceof Actor)) {
    ui.notifications.warn("Uchwyt drona żyje tylko w ekwipunku aktora — nie w katalogu ani kompendium.");
    return false;
  }
  if (parent.isToken && !parent.token?.actorLink) {
    ui.notifications.warn(`${parent.name}: niepołączony żeton nie może trzymać drona.`);
    return false;
  }
  if (options?.[MOVE_OPT]) return;
  if (_innyEgzemplarz(d.aktor)) {
    ui.notifications.warn("Ten dron ma już uchwyt — przenieś go, zamiast kopiować.");
    return false;
  }
}

function _preUpdateItem(item, changes) {
  if (!jestUchwytem(item)) return;
  // Wycinamy tylko ilość — `return false` skasowałoby całą aktualizację.
  const plaski = "system.quantity" in changes;
  if (!plaski && !foundry.utils.hasProperty(changes, "system.quantity")) return;
  const q = plaski ? changes["system.quantity"] : changes.system.quantity;
  if (q === 1) return;
  if (plaski) delete changes["system.quantity"];
  else delete changes.system.quantity;
  ui.notifications.warn("Dron jest jeden — ilość uchwytu się nie zmienia.");
}

function _preCreateActor(actor, data) {
  const items = actor._source.items ?? [];
  const bez = items.filter(i => !i.flags?.[MODULE_ID]?.[FLAG_UCHWYT]);
  if (bez.length === items.length) return;
  actor.updateSource({ items: bez }, { recursive: false });
  ui.notifications.warn(`${data.name ?? actor.name}: kopia aktora bez dronów (${items.length - bez.length}) — drona się nie klonuje.`);
}

/** `ready`, po owinięciu Robót — łańcuch na tej samej metodzie. */
function _owinUpuszczanie() {
  const Sheet = globalThis.dnd5e?.applications?.actor?.BaseActorSheet;
  if (!Sheet) return console.warn(`${MODULE_ID} | drony: brak BaseActorSheet — przeciąganie uchwytów bez strażnika`);
  const origCreate = Sheet.prototype._onDropCreateItems;
  Sheet.prototype._onDropCreateItems = async function (event, items, behavior) {
    const uchwyty = items.filter(jestUchwytem);
    if (!uchwyty.length) return origCreate.call(this, event, items, behavior);
    const cel = this.inventorySource ?? this.actor;
    for (const u of uchwyty) if (u.parent instanceof Actor && u.parent !== cel) await przeniesUchwyt(u, cel);
    const reszta = items.filter(i => !jestUchwytem(i));
    return reszta.length ? origCreate.call(this, event, reszta, behavior) : [];
  };
  const origContainer = Sheet.prototype._onDropItemContainer;
  Sheet.prototype._onDropItemContainer = async function (event, item, container) {
    const cel = this.inventorySource ?? this.actor;
    if (jestUchwytem(item) && item.parent instanceof Actor && item.parent !== cel) return przeniesUchwyt(item, cel);
    return origContainer.call(this, event, item, container);
  };
}

function _owinDuplikowanie() {
  const proto = CONFIG.Item.documentClass.prototype;
  const desc = Object.getOwnPropertyDescriptor(proto, "canDuplicate")
    ?? Object.getOwnPropertyDescriptor(Object.getPrototypeOf(proto), "canDuplicate");
  if (!desc?.get) return;
  Object.defineProperty(proto, "canDuplicate", {
    configurable: true,
    get() { return !jestUchwytem(this) && desc.get.call(this); }
  });
}

/* -------------------------------------------- */
/*  Rejestracja                                  */
/* -------------------------------------------- */

export function registerDrony() {
  Hooks.on("dnd5e.preUseActivity", _onPreUseActivity);
  Hooks.on("preCreateItem", _preCreateItem);
  Hooks.on("preUpdateItem", _preUpdateItem);
  Hooks.on("preCreateActor", _preCreateActor);

  Hooks.on("updateActor", _jakoMG((actor, changes) => {
    if (changes.flags?.[MODULE_ID]?.[FLAG_PROSBY]) return _obsluzProsby(actor);
    if (("name" in changes || "img" in changes) && jestDronem(actor)) return _synchronizuj(actor);
  }));
  const poZetonie = _jakoMG(token => {
    const a = token.actorLink ? game.actors.get(token.actorId) : null;
    if (a && jestDronem(a)) return _synchronizuj(a);
  });
  Hooks.on("createToken", poZetonie);
  Hooks.on("deleteToken", poZetonie);
  // Wrak (U11): status „martwy” na dronie przychodzi i odchodzi jako efekt.
  const poEfekcie = _jakoMG(effect => {
    if (effect.parent instanceof Actor && jestDronem(effect.parent) && effect.statuses?.has("dead")) return _synchronizuj(effect.parent);
  });
  Hooks.on("createActiveEffect", poEfekcie);
  Hooks.on("deleteActiveEffect", poEfekcie);
  Hooks.on("deleteScene", _jakoMG(async () => {
    for (const a of game.actors) if (jestDronem(a)) await _synchronizuj(a);
  }));
  Hooks.on("createItem", _jakoMG(item => { if (jestUchwytem(item)) return _wlasnoscZaUchwytem(item); }));

  Hooks.once("ready", () => {
    _owinUpuszczanie();
    _owinDuplikowanie();
    // Prośby złożone, gdy MG nie było, i uchwyty rozjechane z żetonami (np. scena skasowana offline).
    _jakoMG(async () => {
      for (const a of game.actors) {
        if (a.flags?.[MODULE_ID]?.[FLAG_PROSBY]) await _obsluzProsby(a);
        if (jestDronem(a)) await _synchronizuj(a);
      }
    })();
  });
}

export const dronyApi = Object.freeze({
  utworzDrona, zbudujDrona, rozloz, zloz, przeniesUchwyt, prosbaDoMG, jestWrakiem,
  uchwyt, uchwytDrona, dronUchwytu, posiadaczDrona, dronyPosiadacza, zetonyDrona, jestDronem, liniaUruchomienia
});
