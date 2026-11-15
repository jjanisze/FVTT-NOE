/**
 * Neuroshima 5e — ekonomia tury M8: zapis, wykonawca i haki (PLAN_m8_ruch_i_ekonomia_akcji §5, E1–E2).
 *
 * Czyste zasady — `config/ekonomia-data.mjs`. Fasada API — `game.neuroshima.actions` (`actors/actions.mjs`). Tutaj:
 *
 *   - **Zapis** — ledger walczącego na fladze jego kombatanta (`flags.<mod>.m8`): jeden kombatant to jeden token i jeden
 *     aktor (także syntetyczny, także kilka tokenów jednego aktora), a dokument znika z walką. Właściciel aktora może
 *     zapisać flagi swojego kombatanta (rdzeń: `BaseCombatant#canUpdate`), więc bez MG też jest kto pisze.
 *   - **Jeden wykonawca** (§5.1): aktywny MG; bez niego — deterministycznie pierwszy (po id) aktywny właściciel. Prośba
 *     idzie `User#query` (rdzeń podaje prawdziwego nadawcę i ma limit czasu); wykonawca sprawdza uprawnienia, pisze
 *     po kolei i deduplikuje po stabilnym id żądania. Brak odpowiedzi to „oczekuje”, nie porażka: to samo id ponawia
 *     się w pierwotnym kontekście (chwila zapisana w żądaniu), nie obciąża tury, która trwa później.
 *   - **Projekcje** — znaczniki „Reakcja zużyta” / „Akcja bonusowa zużyta” (M7) i status Biegania są widokiem ledgera.
 *     Ręczna zmiana znacznika z HUD-u to korekta, nie nowa akcja (§1 zasada 6).
 *   - **Ruch** (§5.3) — `moveToken` dokłada koszt przebytej części ruchu (ten sam id w kontynuacji), natywne Undo
 *     (`isUndo`) cofa ruchy w ich pierwotnym kontekście. Czyszczenie historii przez rdzeń na początku każdej tury nie
 *     zmienia ledgera (archiwum kosztów), więc nikt nie dostaje nowego budżetu.
 *
 * Poza walką nic: ekonomia akcji to rundy (eksploracja — tylko podgląd możliwości).
 */

import * as E from "../config/ekonomia-data.mjs";
import { getZranienieLvl } from "./zranienie.mjs";
import { isKobaltEnabled } from "../config/settings.mjs";
import { konwencjeRuchu } from "../wkk/config/ruch-kobalt.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
export const FLAGA_LEDGER = "m8";
export const ZAPYTANIE = `${MODULE_ID}.ekonomia`;
/** Opcja zapisów tej warstwy — haki projekcji je pomijają. */
export const OPCJA = "neuroM8";
/**
 * Opcje zapisu ledgera na kombatancie. Pułapka rdzenia v14: `Combatant._preUpdateOperation` dopisuje do każdej
 * aktualizacji kombatanta `combatTurn` = indeks bieżącego kombatanta **u zlecającego**, a każdy klient robi potem
 * `combat.updateSource({turn: combatTurn})`. Zapis zlecony tuż przed zmianą tury, a zastosowany po niej, cofa więc
 * lokalnie turę u wszystkich (baza ma już następną). `combatTurn: null` omija tę gałąź; zapis flag nie zmienia kolejności.
 */
const OPCJE_ZAPISU = Object.freeze({ [OPCJA]: true, combatTurn: null, turnEvents: false });
/** Ile czekamy na wykonawcę (§5.2 „ograniczone oczekiwanie”). */
const LIMIT_MS = 6000;

/* -------------------------------------------- */
/*  Kontekst                                     */
/* -------------------------------------------- */

/**
 * Kombatant w bieżącej rozpoczętej walce dla aktora, tokenu albo kombatanta. Kilka tokenów jednego aktora: kontrolowany
 * token, potem kombatant na ruchu, potem pierwszy — płatnik wynika z operacji, nie z celu (§5.1).
 * @param {Actor|TokenDocument|Token|Combatant|null} cel
 * @param {Combat} [combat]
 * @returns {Combatant|null}
 */
export function kombatant(cel, combat = game.combat) {
  if (!combat?.started || !cel) return null;
  if (cel instanceof Combatant) return cel.parent === combat ? cel : null;
  const token = cel instanceof TokenDocument ? cel : (cel.document instanceof TokenDocument ? cel.document : (cel.isToken ? cel.token : null));
  if (token) return combat.combatants.find(c => c.tokenId === token.id && c.sceneId === token.parent?.id) ?? null;
  const lista = combat.getCombatantsByActor?.(cel) ?? [];
  if (lista.length <= 1) return lista[0] ?? null;
  const kontrolowane = new Set((canvas?.tokens?.controlled ?? []).map(t => t.document?.id));
  return lista.find(c => kontrolowane.has(c.tokenId)) ?? lista.find(c => c === combat.combatant) ?? lista[0];
}

/** Ledger kombatanta (kopia, do odczytu albo zmiany u wykonawcy). */
export function ledger(c) {
  return E.ledgerZ(c?.getFlag?.(MODULE_ID, FLAGA_LEDGER), c?.parent?.id);
}

/**
 * Chwila walki dla kombatanta (cykl, własna tura, trwająca reakcja).
 * @param {Combatant} c
 * @param {object} [l]
 * @returns {import("../config/ekonomia-data.mjs").Chwila & {walka: string}}
 */
export function chwila(c, l = ledger(c)) {
  const combat = c.parent;
  const ch = E.chwilaKombatanta(l, {
    runda: combat.round, biezacyId: combat.combatant?.id ?? null, id: c.id,
    kolejnosc: combat.turns.map(t => t.id), indeks: combat.turn ?? 0
  });
  return { ...ch, reakcja: E.aktywnaReakcja(l, ch.cykl)?.id ?? null, walka: combat.id };
}

/** Szybkości i stan aktora dla czystych zasad. Szybkość pochodna (rany, udźwig, stany) — z danych dnd5e. */
export function daneAktora(actor) {
  const ruch = actor?.system?.attributes?.movement ?? {};
  const speeds = ruch.speeds ?? ruch;
  const szybkosci = {};
  for (const k of Object.keys(CONFIG.DND5E?.movementTypes ?? { walk: true })) szybkosci[k] = Number(speeds?.[k]) || 0;
  return { stany: actor?.statuses ?? new Set(), zranienie: getZranienieLvl(actor) || 0, szybkosci, wkk: konwencjeRuchu(_kobalt()) };
}

/** Kolor Kobaltu włączony (konwencje ruchu WKK, `wkk/config/ruch-kobalt.mjs`); bez ustawień (testy, start) — tak. */
function _kobalt() {
  try { return isKobaltEnabled(); } catch (_e) { return true; }
}

/** Klucz zmiany tury walki — który Undo dotyczy których ruchów (§5.3). */
export function kluczTury(combat = game.combat) {
  return combat ? `${combat.round}.${combat.turn ?? 0}.${combat.combatant?.id ?? ""}` : "";
}

/* -------------------------------------------- */
/*  Wykonawca                                    */
/* -------------------------------------------- */

/**
 * Wykonawca ledgera kombatanta: aktywny MG, bez niego deterministyczny aktywny właściciel (najmniejsze id).
 * @param {Combatant} c
 * @returns {User|null}
 */
export function wykonawca(c) {
  const gm = game.users.activeGM;
  if (gm) return gm;
  const wl = game.users.filter(u => u.active && !u.isGM && c?.actor?.testUserPermission?.(u, "OWNER"));
  wl.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return wl[0] ?? null;
}

/**
 * Czy nadawca może zapisać to żądanie (§5.1 — weryfikacja u wykonawcy, nadawca z rdzenia, nie z ładunku). MG i
 * właściciel aktora — wszystko. Inny gracz — tylko dodatni wydatek akcji: przepływy M7 deklarują Reakcję cudzego aktora
 * (przycisk pod cudzym rzutem, Reakcje celu), co dawny przekaźnik MG przepuszczał. Granty, korekty, zakazy, ruch,
 * cofnięcia i reakcje — nie.
 */
function _moze(user, c, z = {}) {
  if (!user) return false;
  if (user.isGM || c?.actor?.testUserPermission?.(user, "OWNER")) return true;
  const typ = z.typ ?? "op";
  if (typ !== "op" || (z.rodzaj ?? "akcja") !== "akcja") return false;
  if (z.grant || z.zakaz || z.reakcjaStart || z.reakcjaKoniec || Number(z.ruch) > 0) return false;
  const koszt = Object.values(z.koszt ?? {}).map(Number);
  return koszt.length > 0 && koszt.every(n => n > 0);
}

/* Zapisy jednego ledgera po kolei — także gdy prośby przychodzą z kilku klientów naraz. */
const _kolejki = new Map();
function _poKolei(klucz, fn) {
  const prev = _kolejki.get(klucz) ?? Promise.resolve();
  const next = prev.catch(() => {}).then(fn);
  _kolejki.set(klucz, next);
  next.finally(() => { if (_kolejki.get(klucz) === next) _kolejki.delete(klucz); }).catch(() => {});
  return next;
}

/** @type {Set<(c: Combatant, l: object, user: User|null) => Promise<void>|void>} */
const _poZapisie = new Set();
/** Projekcja po każdym zapisie ledgera (znaczniki, statusy) — wołana u wykonawcy. */
export function zarejestrujProjekcje(fn) {
  _poZapisie.add(fn);
}

/** @type {Map<string, (l: object, ch: object, z: object, aktor: object, c: Combatant) => object>} */
const _typy = new Map([
  ["op", (l, ch, z, aktor) => E.zastosuj(l, ch, z, aktor).wynik],
  ["ruch", (l, ch, z, aktor) => E.zapiszRuch(l, ch, z.ruch, aktor).wynik],
  ["cofnij", (l, _ch, z) => ({ cofniete: E.cofnijRuchy(l, z.wHistorii ?? [], z.zt), ostrz: [] })],
  ["tura", (l, ch) => ({ zmiana: E.zapiszTure(l, ch.runda), ostrz: [] })]
]);

/**
 * Wykonanie u wykonawcy: uprawnienia, kolejka, deduplikacja, zapis, projekcje.
 * @param {Combatant} c
 * @param {object} z  żądanie `{id, typ, chwila, ...}`
 * @param {User} user  prawdziwy nadawca
 */
async function _wykonaj(c, z, user) {
  if (!_moze(user, c, z)) return { ok: false, odmowa: true, id: z.id, powod: `${user?.name ?? "?"} nie może zapisać tego dla ${c?.name ?? "?"}.`, ostrz: [] };
  return _poKolei(c.uuid, async () => {
    const l = ledger(c);
    const ch = z.chwila?.walka === c.parent.id ? z.chwila : chwila(c, l);
    const fn = _typy.get(z.typ ?? "op");
    if (!fn) throw new Error(`Nieznany typ zapisu ekonomii „${z.typ}”.`);
    const rev = l.rev;
    const wynik = fn(l, ch, z, daneAktora(c.actor), c);
    const zmiana = l.rev !== rev || wynik?.zmiana;
    if (zmiana) {
      E.przytnij(l, ch.cykl);
      // Kopia: rdzeń dopisuje do obiektu operacji własne pola (zamrożony obiekt wywala zapis).
      await c.update({ [`flags.${MODULE_ID}.${FLAGA_LEDGER}`]: l }, { ...OPCJE_ZAPISU });
    }
    // Projekcje także przy duplikacie: nieudana projekcja poprzedniej próby nadrabia się przy ponowieniu.
    for (const p of _poZapisie) {
      try { await p(c, l, user); } catch (err) { console.warn(`${MODULE_ID} | M8: projekcja`, err); }
    }
    return { ok: true, id: z.id, rev: l.rev, ...JSON.parse(JSON.stringify(wynik ?? {})) };
  });
}

/* Oczekujące żądania tego klienta (brak wykonawcy albo odpowiedzi) — ponawiane tym samym id. */
const _oczekujace = new Map();

function _oczekuje(c, z, powod) {
  _oczekujace.set(z.id, { uuid: c.uuid, z, powod, t: Date.now() });
  ui.notifications?.warn(`Koszt akcji „${z.zrodlo ?? "?"}” czeka na zapis (${powod}) — rozlicz ręcznie, jeśli nie wróci.`);
  return { ok: false, oczekuje: true, id: z.id, powod, ostrz: [] };
}

/** Ponów oczekujące żądania (nowy MG online, kolejny zapis). Te same id — wykonawca nie nalicza drugi raz. */
export async function ponowOczekujace() {
  for (const [id, p] of [..._oczekujace]) {
    const c = fromUuidSync(p.uuid);
    if (!c) { _oczekujace.delete(id); continue; }
    const w = wykonawca(c);
    if (!w) continue;
    try {
      const r = w.isSelf ? await _wykonaj(c, p.z, game.user) : await w.query(ZAPYTANIE, { uuid: p.uuid, z: p.z }, { timeout: LIMIT_MS });
      if (r?.ok || r?.odmowa) _oczekujace.delete(id);
    } catch (_e) { /* dalej czeka */ }
  }
}

/** Oczekujące żądania (podgląd dla UI). */
export function oczekujace() {
  return [..._oczekujace.values()].map(p => ({ id: p.z.id, zrodlo: p.z.zrodlo ?? "?", powod: p.powod, t: p.t }));
}

/**
 * Zatwierdź zapis w ledgerze kombatanta. Chwilę liczy wywołujący (pierwotny kontekst); id stabilne — ponowienie
 * tego samego id niczego nie nalicza drugi raz.
 * @param {Combatant} c
 * @param {object} z  `{typ?: "op"|"ruch"|"cofnij"|"tura", id?, zrodlo?, koszt?, grant?, ...}`
 * @returns {Promise<object>}
 */
export async function zatwierdz(c, z) {
  if (!c) return { ok: false, poza: true, ostrz: [] };
  const zad = { typ: "op", id: foundry.utils.randomID(16), t: Date.now(), kto: game.user.id, ...z };
  zad.chwila ??= chwila(c);
  const w = wykonawca(c);
  if (!w) return _oczekuje(c, zad, "nikt uprawniony nie jest online");
  let r;
  if (w.isSelf) r = await _wykonaj(c, zad, game.user);
  else {
    try { r = await w.query(ZAPYTANIE, { uuid: c.uuid, z: zad }, { timeout: LIMIT_MS }); }
    catch (err) { return _oczekuje(c, zad, err?.message ?? "brak odpowiedzi"); }
  }
  // Odmowa uprawnień to odpowiedź, nie brak odpowiedzi — nie trafia do ponowień.
  if (r?.odmowa) ui.notifications?.warn(r.powod);
  if (_oczekujace.size) void ponowOczekujace();
  return r;
}

/** Obsługa zapytania u wykonawcy — nadawcę podaje rdzeń (`context.user`), nie ładunek. */
async function _onZapytanie(dane, { user } = {}) {
  const c = await fromUuid(dane?.uuid);
  if (!(c instanceof Combatant)) throw new Error("Nie ma takiego walczącego.");
  const w = wykonawca(c);
  // Zapytanie dotarło do kogoś, kto już nie jest wykonawcą (MG wszedł w międzyczasie) — przekaż dalej, ale uprawnienia
  // sprawdź tutaj: następny wykonawca zobaczy jako nadawcę pośrednika, nie pierwotnego gracza.
  if (w && !w.isSelf) {
    if (!_moze(user, c, dane.z ?? {})) return { ok: false, odmowa: true, id: dane.z?.id, powod: `${user?.name ?? "?"} nie może zapisać tego dla ${c.name}.`, ostrz: [] };
    return w.query(ZAPYTANIE, dane, { timeout: LIMIT_MS });
  }
  return _wykonaj(c, dane.z ?? {}, user);
}

/* -------------------------------------------- */
/*  Odczyt (każdy klient, bez zapisu)            */
/* -------------------------------------------- */

/**
 * Stan ekonomii walczącego: pule A/B/R/I, budżet ruchu w trybie, zakazy. Podgląd bez zapisu (§5.1).
 * @param {Actor|TokenDocument|Token|Combatant} cel
 * @param {{tryb?: string}} [o]
 * @returns {object|null}  null — poza walką
 */
export function stan(cel, { tryb = null } = {}) {
  const c = kombatant(cel);
  if (!c) return null;
  const l = ledger(c);
  const ch = chwila(c, l);
  const aktor = daneAktora(c.actor);
  const t = tryb ?? c.token?.movementAction ?? "walk";
  return {
    kombatant: c, ledger: l, chwila: ch, aktor,
    pule: E.pule(l, ch, aktor),
    ruch: E.budzetRuchu(l, ch, { szybkosci: aktor.szybkosci, tryb: t, wkk: aktor.wkk }),
    reakcja: E.aktywnaReakcja(l, ch.cykl),
    ostrzezenia: _ostrzezeniaRuchu(l, ch)
  };
}

/** Trwałe ostrzeżenia ruchu tej tury (przekroczenia) — zostają po wykonaniu (§8.1). */
function _ostrzezeniaRuchu(l, ch) {
  const tej = l.ruchy.filter(r => !r.cofniety && r.cykl === ch.cykl);
  const out = tej.filter(r => r.ostrz?.length).flatMap(r => r.ostrz);
  if (tej.some(r => r.niepelny)) out.push("Część ruchu policzona bez terenu (koszt niepełny) — skoryguj, jeśli był trudny teren.");
  return out;
}

/* -------------------------------------------- */
/*  Haki                                         */
/* -------------------------------------------- */

/**
 * D32: cel wykonuje Bieganie w trwającej, niezakończonej Reakcji — ochrona przed ostrzałem trwa do końca tej reakcji
 * (osobny dowód dla silnika okoliczności, bez udawania „tury celu”). Reakcja kończy się przyciskiem albo najpóźniej
 * ze zmianą tury (`_onCombatTurnChange`), więc ochrona nie dożywa końca cudzej tury bez oznaczenia.
 * @param {Actor|TokenDocument|Token|Combatant} cel
 */
export function ochronaBieguWReakcji(cel) {
  const c = kombatant(cel);
  if (!c) return false;
  const l = ledger(c);
  const ch = chwila(c, l);
  const r = ch.reakcja ? l.reakcje.find(x => x.id === ch.reakcja && !x.koniec) : null;
  return !!r && l.ops.some(o => o.reakcja === r.id && o.deklaracja === "bieganie");
}

/**
 * Zmiana tury: najpierw zamknij reakcje, które zostały otwarte (wyzwalająca je tura się skończyła — §4.3, D32), potem
 * zapisz instancję własnej tury nowego kombatanta (cofnięcie w tej samej rundzie wraca do niej).
 */
async function _onCombatTurnChange(combat, _prior, current) {
  if (!combat.started) return;
  for (const c2 of combat.combatants) {
    if (!wykonawca(c2)?.isSelf) continue;
    const l2 = ledger(c2);
    for (const r of l2.reakcje.filter(x => !x.koniec)) {
      await zatwierdz(c2, { typ: "op", rodzaj: "zdarzenie", id: `koniec-${r.id}`, zrodlo: "Koniec tury — reakcja zamknięta",
        koszt: {}, reakcjaKoniec: r.id, chwila: { ...chwila(c2, l2), reakcja: r.id } });
    }
  }
  const c = combat.combatants.get(current?.combatantId);
  if (!c || !wykonawca(c)?.isSelf) return;
  await zatwierdz(c, { typ: "tura", id: `tura-${combat.id}-${c.id}-${combat.round}`, chwila: { ...chwila(c), walka: combat.id } });
}

/**
 * Czy budżet ruchu M8 dotyczy tego tokenu: postać albo BN (nie pojazd ani grupa), nie plansza pościgu (budżet jazdy
 * M4, §8.1 „nie rozlewaj na pojazdy”) i nie wykluczenie zarejestrowane przez inny moduł.
 * @param {TokenDocument} doc
 */
export function budzetDotyczy(doc) {
  const actor = doc?.actor;
  if (!actor || !["character", "npc"].includes(actor.type)) return false;
  if (doc.parent?.getFlag?.(MODULE_ID, "poscig")) return false;
  return !_wykluczenia.some(fn => { try { return fn(doc); } catch (_e) { return false; } });
}

/** Ruch postaci w walce — tylko jej własna tura albo trwająca reakcja; `displace` (przestawienie) się nie liczy. */
export function ruchSieLiczy(doc, movement) {
  if (!movement?.passed?.waypoints?.length) return false;
  if (movement.passed.waypoints.every(w => w.action === "displace" || CONFIG.Token.movement.actions[w.action]?.teleport)) return false;
  return budzetDotyczy(doc);
}

/** @type {((doc: TokenDocument) => boolean)[]} — tokeny, których ruch ma innego właściciela budżetu (M4 pojazdy). */
const _wykluczenia = [];
export function zarejestrujWykluczenieRuchu(fn) {
  _wykluczenia.push(fn);
}

/**
 * Koszt przebytej części ruchu: natywny koszt (teren, czołganie, dopłaty dnd5e) bez kroków `displace`.
 *
 * Pułapka rdzenia v14: koszt ruchu mierzy się tylko, gdy token jest **wyrenderowany** u ruszającego
 * (`TokenDocument#_preUpdateMovement`, gałąź `this.rendered`); ruch z API na scenie, której ruszający nie ogląda, ma
 * koszt 0 przy niezerowym dystansie. Wtedy — i przy `movementAutomation = none` — liczymy sam dystans i oznaczamy
 * koszt jako niepełny (bez terenu), zamiast pozornie zweryfikowanego zera (§3.2).
 */
export function kosztPrzebyty(movement) {
  const wp = movement.passed.waypoints;
  let koszt = 0, ok = true;
  for (const w of wp) {
    if (w.action === "displace") continue;
    if (!Number.isFinite(w.cost)) { ok = false; break; }
    koszt += Number(w.cost) || 0;
  }
  if (!ok) koszt = Number(movement.passed.cost) || 0;
  const dyst = Number(movement.passed.distance) || 0;
  const tryb = [...wp].reverse().find(w => w.action !== "displace")?.action ?? "walk";
  let niepelny = false;
  const bezAutomatyki = game.settings?.get?.("dnd5e", "movementAutomation") === "none";
  if ((koszt <= 0 && dyst > 0) || bezAutomatyki) {
    niepelny = true;
    koszt = Math.max(koszt, dyst);
  }
  return { koszt: Math.round(koszt * 100) / 100, dyst: Math.round(dyst * 100) / 100, tryb, niepelny };
}

/** @type {((doc: TokenDocument, movement: object) => string[])[]} — dodatkowe ostrzeżenia przebytej części (skok). */
const _uwagiRuchu = [];
/** Ostrzeżenia dopisywane do zapisu ruchu (np. zasięg skoku, `combat/skok.mjs`) — liczone u wykonawcy ledgera. */
export function zarejestrujUwagiRuchu(fn) {
  _uwagiRuchu.push(fn);
}

async function _onMoveToken(doc, movement) {
  const combat = game.combat;
  if (!combat?.started) return;
  const c = kombatant(doc, combat);
  if (!c || !wykonawca(c)?.isSelf || !ruchSieLiczy(doc, movement)) return;
  const l = ledger(c);
  const ch = chwila(c, l);
  if (!ch.wlasna && !ch.reakcja) return;
  const { koszt, dyst, tryb, niepelny } = kosztPrzebyty(movement);
  const uwagi = _uwagiRuchu.flatMap(fn => { try { return fn(doc, movement) ?? []; } catch (err) { console.warn(`${MODULE_ID} | M8: uwagi ruchu`, err); return []; } });
  // Część ruchu: ile punktów historii przebyto do tej chwili — kontynuacja po pauzie to nowa część, ponowienie nie.
  const czesc = `${movement.history?.recorded?.waypoints?.length ?? 0}+${movement.passed.waypoints.length}`;
  await zatwierdz(c, { typ: "ruch", id: `ruch-${movement.id}-${czesc}`, chwila: ch,
    ruch: { ruchId: movement.id, czesc, koszt, dyst, tryb, niepelny, zt: kluczTury(combat), ...(uwagi.length ? { uwagi } : {}) } });
}

/** Natywne Undo ruchu (Ctrl+Z, `revertRecordedMovement`) — koszt wraca w pierwotnym kontekście. */
async function _onUpdateToken(doc, changed, options) {
  if (!options?.isUndo || !("_movementHistory" in changed)) return;
  const combat = game.combat;
  const c = kombatant(doc, combat);
  if (!c || !wykonawca(c)?.isSelf) return;
  const wHistorii = [...new Set((doc._source._movementHistory ?? []).map(w => w.movementId).filter(Boolean))];
  await zatwierdz(c, { typ: "cofnij", id: `cofnij-${foundry.utils.randomID(8)}`, wHistorii, zt: kluczTury(combat) });
}

export function registerEkonomia() {
  CONFIG.queries[ZAPYTANIE] = _onZapytanie;
  // Schody — przyczyna trudnego terenu z NOE (s. 26), której dnd5e nie ma; potrzebna do wyjątków „schody i stoki”
  // (Człowiek-pająk, s. 102) i do rozróżnienia schodów od gruzu na tym samym polu (§8.2).
  if (CONFIG.DND5E?.difficultTerrainTypes && !CONFIG.DND5E.difficultTerrainTypes.stairs) {
    CONFIG.DND5E.difficultTerrainTypes.stairs = { label: "Schody" };
  }
  Hooks.on("combatTurnChange", (combat, prior, current) => { void _onCombatTurnChange(combat, prior, current); });
  Hooks.on("moveToken", (doc, movement) => { void _onMoveToken(doc, movement); });
  Hooks.on("updateToken", (doc, changed, options) => { void _onUpdateToken(doc, changed, options); });
  Hooks.on("userConnected", (user, connected) => { if (connected && _oczekujace.size) void ponowOczekujace(); });
}

export const __testing = Object.freeze({ kosztPrzebyty, ruchSieLiczy, moze: _moze });
