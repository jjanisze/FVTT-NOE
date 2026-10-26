/**
 * Neuroshima 5e — stół wymiany: stan, wycena, zatwierdzenie (PLAN_m5_postoj.md §7.6, D1–D4, D21, D27, U8, U9,
 * U40, U46).
 *
 * **Zawsze barter.** Gracz wykłada towar („Daję”) i wybiera z listy handlarza („Dostaję”); MG wycenia, dokłada
 * pozycje z katalogu, usługi i przeróbki, koryguje i zatwierdza. Stan w `flags.<mod>.wymiana` **aktora gracza**
 * (U46) — obie strony renderują to samo okno z tej flagi; jedna otwarta wymiana na postać.
 *
 * Gracz widzi tylko to, co sam wyłożył, po cenach podręcznikowych (D3). Wycena (region × kolumna × stan, skup),
 * saldo i korekty — tylko u MG (U42).
 *
 * **Zatwierdzenie bez klonów** (U8): najpierw utwórz u celu, potem usuń u źródła — przerwane w połowie zostawia
 * dwa egzemplarze do audytu, nigdy zero. Kolejność: przychodzące do gracza → oddawane do handlarza (albo w
 * nicość, gdy handlarza nie ma) → montaż przeróbek → karta publiczna (co za co, bez liczb) i szept MG (wartości).
 */

import { KATALOG } from "../config/recipes-data.mjs";
import { ADDON_DEFS } from "../config/addons-data.mjs";
import { REGIONY } from "../config/handel-data.mjs";
import { cenaTutaj, fmtGb, mnoznikRegionu } from "../config/handel-rules.mjs";
import { isKobaltEnabled } from "../config/settings.mjs";
import { getSurowiecType } from "../config/surowce-data.mjs";
import { refDlaPrzedmiotu, daneWyniku } from "../production/wynik.mjs";
import { installAddonById, isAddonCompatible } from "../weapons/addons.mjs";
import { kartaPostoju, wyslijKarte } from "./karty.mjs";
import { miejsceAktora } from "./miejsce.mjs";
import { walutaLokalna } from "./portfel.mjs";
import { daneHandlarza, notujWizyte, FLAGA_TOWARU } from "./handlarz.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
export const FLAGA_WYMIANY = "wymiana";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/** Hook dla licznika transakcji (E4) i innych słuchaczy: `neuroshima.wymianaZatwierdzona`. */
const HOOK_ZATWIERDZONA = "neuroshima.wymianaZatwierdzona";

/* -------------------------------------------- */
/*  Wpis katalogu dla przedmiotu                 */
/* -------------------------------------------- */

const _refy = new Map();

function _kategoriaZTypu(item) {
  if (item.type === "weapon") return item.system?.type?.value === "biala" ? "bron-biala" : "bron-palna";
  if (item.type === "equipment" && ["light", "medium", "heavy", "shield"].includes(item.system?.type?.value)) return "pancerz";
  if (item.type === "tool") return item.system?.type?.value === "music" ? "instrumenty" : "zestawy";
  if (item.type === "consumable") {
    const t = item.system?.type?.value;
    if (t === "ammo") return "amunicja";
    if (t === "food") return "prowiant";
    if (t === "lekarstwo") return "leki";
  }
  return "sprzet";
}

/**
 * Wpis do wyceny dla przedmiotu: katalog (znacznik towaru, kompendium, flagi), surowiec (1 gb / jednostkę,
 * s. 144) albo sam przedmiot (cena z karty, kategoria z typu). Waluta lokalna — w polu `walutaLokalna`.
 */
export async function wpisPrzedmiotu(item) {
  const sur = getSurowiecType(item);
  if (sur) return { ref: null, nazwa: item.name, cena: 1, surowiec: sur.code, kategoria: null, jednorazowy: true, walutaLokalna: null };
  let ref = item.getFlag?.(MODULE_ID, FLAGA_TOWARU)?.ref ?? null;
  if (!ref) {
    if (!_refy.has(item.uuid)) _refy.set(item.uuid, await refDlaPrzedmiotu(item).catch(() => null));
    ref = _refy.get(item.uuid);
  }
  const k = ref ? KATALOG.get(ref) : null;
  const cenaKarty = Number(item.system?.price?.value);
  const waluta = walutaLokalna(item);
  if (k) return { ...k, nazwa: item.name, cena: Number.isFinite(cenaKarty) && cenaKarty > 0 && waluta ? cenaKarty : k.cena, walutaLokalna: waluta };
  return {
    ref: null, nazwa: item.name, cena: Number.isFinite(cenaKarty) ? cenaKarty : 0, kategoria: _kategoriaZTypu(item),
    jednorazowy: ["consumable", "loot"].includes(item.type), wynik: "item", walutaLokalna: waluta
  };
}

/* -------------------------------------------- */
/*  Stan                                         */
/* -------------------------------------------- */

/** Stan wymiany postaci albo `null`. */
export function wymiana(actor) {
  const w = actor?.getFlag?.(MODULE_ID, FLAGA_WYMIANY);
  if (!w || typeof w !== "object") return null;
  return {
    id: w.id, handlarz: w.handlarz ?? null, otwarta: w.otwarta ?? null,
    daje: Array.isArray(w.daje) ? w.daje : [], dostaje: Array.isArray(w.dostaje) ? w.dostaje : [],
    skup: Number.isFinite(w.skup) ? w.skup : null, korekta: Number(w.korekta) || 0, notatka: w.notatka ?? "",
    zgoda: !!w.zgoda, zamowienie: !!w.zamowienie
  };
}

async function _zapisz(actor, w) {
  await actor.update({ [`flags.${MODULE_ID}.${FLAGA_WYMIANY}`]: w });
}

async function _zmien(actor, fn, { resetZgody = true } = {}) {
  const w = wymiana(actor);
  if (!w) throw new Error(`${actor.name}: brak otwartej wymiany.`);
  fn(w);
  if (resetZgody) w.zgoda = false;
  await _zapisz(actor, w);
  return w;
}

/**
 * Otwiera wymianę postaci z handlarzem (albo bez — zamówienie u „kogoś”, D28). Jedna na postać: wymiana z
 * innym handlarzem zastępuje poprzednią (z potwierdzeniem w oknie).
 */
export async function otworzWymiane(actor, handlarz = null, { zamowienie = false } = {}) {
  const teraz = wymiana(actor);
  const uuid = handlarz?.uuid ?? null;
  if (teraz && teraz.handlarz === uuid) return teraz;
  const w = {
    id: foundry.utils.randomID(), handlarz: uuid, otwarta: game.time.worldTime,
    daje: [], dostaje: [], skup: null, korekta: 0, notatka: "", zgoda: false, zamowienie
  };
  await _zapisz(actor, w);
  if (handlarz) await notujWizyte(handlarz);
  return w;
}

export async function zamknijWymiane(actor) {
  await actor.update({ [`flags.${MODULE_ID}.${FLAGA_WYMIANY}`]: _del });
}

/** „Daję”: przedmiot gracza z ilością (scala z tym samym przedmiotem). */
export async function dodajDaje(actor, item, ilosc = null) {
  if (item.parent !== actor) throw new Error("Wykładać można tylko własne przedmioty.");
  const max = Number(item.system?.quantity ?? 1) || 1;
  return _zmien(actor, w => {
    const jest = w.daje.find(d => d.uuid === item.uuid);
    if (jest) jest.ilosc = Math.min(max, (jest.ilosc ?? 1) + (ilosc ?? 1));
    else w.daje.push({ uuid: item.uuid, ilosc: Math.min(max, ilosc ?? max), stan: "sprawny" });
  });
}

/** „Dostaję”: pozycja z towaru handlarza (propozycja gracza) albo od MG. */
export async function dodajDostaje(actor, wpis) {
  return _zmien(actor, w => {
    if (wpis.typ === "towar") {
      const jest = w.dostaje.find(d => d.typ === "towar" && d.uuid === wpis.uuid);
      if (jest) { jest.ilosc = Math.min(wpis.max ?? Infinity, (jest.ilosc ?? 1) + (wpis.ilosc ?? 1)); return; }
    }
    w.dostaje.push({ klucz: foundry.utils.randomID(8), ilosc: 1, ...wpis });
  });
}

export async function ustawIlosc(actor, strona, klucz, ilosc) {
  return _zmien(actor, w => {
    const lista = strona === "daje" ? w.daje : w.dostaje;
    const p = lista.find(d => (d.klucz ?? d.uuid) === klucz);
    if (p) p.ilosc = Math.max(1, Math.floor(Number(ilosc) || 1));
  });
}

export async function usunPozycje(actor, strona, klucz) {
  return _zmien(actor, w => {
    if (strona === "daje") w.daje = w.daje.filter(d => d.uuid !== klucz);
    else w.dostaje = w.dostaje.filter(d => d.klucz !== klucz);
  });
}

export async function przelaczStan(actor, uuid) {
  return _zmien(actor, w => {
    const d = w.daje.find(x => x.uuid === uuid);
    if (d) d.stan = d.stan === "zepsuty" ? "sprawny" : "zepsuty";
  });
}

export async function ustawZgode(actor, zgoda) {
  return _zmien(actor, w => { w.zgoda = !!zgoda; }, { resetZgody: false });
}

/** MG: skup (%), korekta (gb, + na korzyść gracza), notatka. */
export async function ustawWarunki(actor, { skup, korekta, notatka } = {}) {
  return _zmien(actor, w => {
    if (skup !== undefined) w.skup = skup === null ? null : Math.max(0, Number(skup) || 0);
    if (korekta !== undefined) w.korekta = Number(korekta) || 0;
    if (notatka !== undefined) w.notatka = String(notatka ?? "");
  });
}

/* -------------------------------------------- */
/*  Wycena (MG)                                  */
/* -------------------------------------------- */

/** Region i rodzaj wymiany: handlarza, inaczej miejsca postaci. */
export function kontekstWymiany(actor, handlarz) {
  const m = handlarz ? daneHandlarza(handlarz).miejsce : miejsceAktora(actor).miejsce;
  return { region: m.region, rodzaj: m.rodzaj, miejsce: m };
}

/** Cena przeróbki (D31): cena z tabeli ulepszeń × Usługi speców regionu. */
export function cenaPrzerobki(addonId, region) {
  const def = ADDON_DEFS[addonId];
  if (!def) return 0;
  return Math.round(def.price * mnoznikRegionu(region, "uslugi") * 100) / 100;
}

/**
 * Wycena wymiany. Oferta (Daję) po skupie, żądanie (Dostaję) po cenie tutaj; usługi i przeróbki × Usługi speców.
 * Saldo ≥ 0 — gracz daje co najmniej tyle, ile dostaje (D27); `korekta` (gb) przesuwa na korzyść gracza.
 * @returns {Promise<object>}
 */
export async function wycenWymiane(actor, { kobalt = isKobaltEnabled() } = {}) {
  const w = wymiana(actor);
  if (!w) return null;
  const handlarz = w.handlarz ? fromUuidSync(w.handlarz) : null;
  const { region } = kontekstWymiany(actor, handlarz);
  const skupPct = w.skup ?? (handlarz ? daneHandlarza(handlarz).skup : Math.round((kobalt ? 0.5 : 1) * 100));
  const daje = [];
  for (const d of w.daje) {
    const item = fromUuidSync(d.uuid);
    if (!item) { daje.push({ ...d, brak: true, nazwa: "(przedmiotu już nie ma)", podr: 0, lokalna: 0, rozklad: [] }); continue; }
    const wpis = await wpisPrzedmiotu(item);
    const poza = wpis.walutaLokalna?.region && wpis.walutaLokalna.region !== region;
    const tu = poza
      ? { cena: 0, rozklad: [{ opis: `waluta ${REGIONY[wpis.walutaLokalna.region]?.label} poza regionem — wg MG`, wartosc: 0 }] }
      : cenaTutaj(wpis, { region, stan: d.stan, skup: skupPct / 100, kobalt });
    daje.push({ ...d, nazwa: item.name, img: item.img, podr: wpis.cena * d.ilosc, lokalna: tu.cena * d.ilosc, rozklad: tu.rozklad, poza });
  }
  const dostaje = [];
  for (const p of w.dostaje) {
    let wpis = null, cena = 0, rozklad = [];
    if (p.typ === "towar" || p.typ === "przedmiot") {
      const item = p.uuid ? fromUuidSync(p.uuid) : null;
      if (item) wpis = await wpisPrzedmiotu(item);
      else if (p.ref) wpis = KATALOG.get(p.ref);
    } else if (p.typ === "katalog") wpis = KATALOG.get(p.ref);
    if (wpis) {
      const tu = cenaTutaj(wpis, { region, kobalt });
      cena = tu.cena; rozklad = tu.rozklad;
    } else if (p.typ === "przerobka") {
      cena = cenaPrzerobki(p.addon, region);
      rozklad = [{ opis: `${ADDON_DEFS[p.addon]?.label}: ${fmtGb(ADDON_DEFS[p.addon]?.price ?? 0)} × Usługi speców`, wartosc: cena }];
    } else if (p.typ === "usluga") {
      cena = Math.round((Number(p.cena) || 0) * mnoznikRegionu(region, "uslugi") * 100) / 100;
      rozklad = [{ opis: `usługa ${fmtGb(p.cena)} × Usługi speców`, wartosc: cena }];
    }
    dostaje.push({ ...p, podr: (wpis?.cena ?? Number(p.cena) ?? 0) * (p.ilosc ?? 1), lokalna: cena * (p.ilosc ?? 1), rozklad });
  }
  const sumaDaje = daje.reduce((a, d) => a + d.lokalna, 0);
  const sumaDostaje = dostaje.reduce((a, d) => a + d.lokalna, 0);
  const r2 = v => Math.round(v * 100) / 100;
  return {
    w, handlarz, region, skupPct, daje, dostaje,
    podrDaje: r2(daje.reduce((a, d) => a + d.podr, 0)),
    sumaDaje: r2(sumaDaje), sumaDostaje: r2(sumaDostaje),
    saldo: r2(sumaDaje - sumaDostaje + w.korekta)
  };
}

/* -------------------------------------------- */
/*  Przenoszenie bez klonów (U8)                 */
/* -------------------------------------------- */

function _stosowalny(data) {
  return ["consumable", "loot"].includes(data.type) && data.flags?.[MODULE_ID]?.magazine === undefined;
}

function _stosU(actor, data) {
  if (!_stosowalny(data)) return null;
  const src = data._stats?.compendiumSource ?? null;
  return actor.items.find(i => i.type === data.type && i.name === data.name
    && (i._stats?.compendiumSource ?? null) === src
    && JSON.stringify(i.flags?.[MODULE_ID]?.fant ?? null) === JSON.stringify(data.flags?.[MODULE_ID]?.fant ?? null)) ?? null;
}

/** Tworzy `ilosc` sztuk z danych u aktora (stos albo osobne egzemplarze). */
export async function dodajDoEkwipunku(actor, data, ilosc) {
  const d = foundry.utils.deepClone(data);
  delete d._id; delete d.folder; delete d.sort; delete d.ownership;
  if (d.system?.container) d.system.container = null;
  if (d.system?.equipped !== undefined) d.system.equipped = false;
  if (_stosowalny(d)) {
    const stos = _stosU(actor, d);
    if (stos) {
      await stos.update({ "system.quantity": (Number(stos.system.quantity) || 0) + ilosc });
      return [stos];
    }
    d.system.quantity = ilosc;
    return actor.createEmbeddedDocuments("Item", [d]);
  }
  // Broń, pancerz, magazynek — osobne egzemplarze (stan, ulepszenia i naboje należą do sztuki).
  return actor.createEmbeddedDocuments("Item", Array.from({ length: ilosc }, () => {
    const s = foundry.utils.deepClone(d);
    if (s.system) s.system.quantity = 1;
    return s;
  }));
}

/** Zdejmuje `ilosc` z przedmiotu (usuwa przy zerze). */
export async function zdejmij(item, ilosc) {
  const q = Number(item.system?.quantity ?? 1) || 1;
  if (ilosc >= q) return item.delete();
  return item.update({ "system.quantity": q - ilosc });
}

/* -------------------------------------------- */
/*  Zatwierdzenie (MG)                           */
/* -------------------------------------------- */

/**
 * Wykonuje wymianę (MG). Zwraca podsumowanie albo rzuca, gdy czegoś brak.
 * @param {Actor} actor  postać gracza
 */
export async function zatwierdzWymiane(actor) {
  if (!game.user.isGM) throw new Error("Wymianę zatwierdza MG.");
  const wyc = await wycenWymiane(actor);
  if (!wyc) throw new Error(`${actor.name}: brak otwartej wymiany.`);
  const { w, handlarz } = wyc;
  const brak = wyc.daje.filter(d => d.brak);
  if (brak.length) throw new Error("Część wykładanego towaru już nie istnieje — popraw wymianę.");

  const otrzymal = [], oddal = [], uwagi = [];

  // 1. Przychodzące do gracza — najpierw utwórz.
  const doZdjecia = [];
  for (const p of w.dostaje) {
    const ilosc = Math.max(1, Math.floor(p.ilosc ?? 1));
    if (p.typ === "towar" || p.typ === "przedmiot") {
      const src = p.uuid ? await fromUuid(p.uuid) : null;
      if (!src) { uwagi.push(`${p.nazwa}: przedmiotu już nie ma u handlarza — pominięty.`); continue; }
      const dost = Number(src.system?.quantity ?? 1) || 1;
      const ile = p.typ === "towar" ? Math.min(ilosc, dost) : ilosc;
      await dodajDoEkwipunku(actor, src.toObject(), ile);
      if (p.typ === "towar") doZdjecia.push({ item: src, ilosc: ile });
      otrzymal.push(`${src.name}${ile > 1 ? ` ×${ile}` : ""}`);
    } else if (p.typ === "katalog") {
      const dane = await daneWyniku(p.ref);
      if (!dane) { uwagi.push(`${p.nazwa}: brak w katalogu.`); continue; }
      await dodajDoEkwipunku(actor, dane.data, ilosc);
      otrzymal.push(`${p.nazwa}${ilosc > 1 ? ` ×${ilosc}` : ""}`);
    } else if (p.typ === "usluga") {
      otrzymal.push(`usługa: ${p.opis || p.nazwa}`);
      uwagi.push(`Usługa „${p.opis || p.nazwa}” — wykonanie ręczne (MG).`);
    }
  }

  // 2. Oddawane — u handlarza powstaje kopia, potem znika u gracza.
  for (const d of w.daje) {
    const item = await fromUuid(d.uuid);
    if (!item) continue;
    const ile = Math.min(d.ilosc ?? 1, Number(item.system?.quantity ?? 1) || 1);
    if (handlarz) await dodajDoEkwipunku(handlarz, item.toObject(), ile);
    oddal.push(`${item.name}${ile > 1 ? ` ×${ile}` : ""}`);
    await zdejmij(item, ile);
  }

  // 3. Towar handlarza schodzi dopiero teraz (gracz już go ma).
  for (const z of doZdjecia) if (z.item?.parent) await zdejmij(z.item, z.ilosc);

  // 4. Przeróbki fachowca (D31): montaż na broni gracza; niezgodne — ulepszenie do ekwipunku i uwaga.
  for (const p of w.dostaje.filter(x => x.typ === "przerobka")) {
    const bron = p.cel ? await fromUuid(p.cel) : null;
    const def = ADDON_DEFS[p.addon];
    if (!def) continue;
    const blad = bron ? isAddonCompatible(bron, def) : "brak broni-celu";
    if (bron && !blad && await installAddonById(bron, p.addon)) {
      otrzymal.push(`przeróbka: ${def.label} → ${bron.name}`);
    } else {
      const dane = await daneWyniku(`addon:${p.addon}`);
      if (dane) await dodajDoEkwipunku(actor, dane.data, 1);
      otrzymal.push(`${def.label} (do montażu)`);
      uwagi.push(`${def.label}: nie zamontowano (${blad ?? "montaż odrzucony"}) — ulepszenie w ekwipunku.`);
    }
  }

  // 5. Karty: publiczna bez liczb, szept MG z wartościami.
  const z = handlarz ? handlarz.name : "ktoś w osadzie";
  await wyslijKarte(kartaPostoju({
    ikona: "icons/svg/coins.svg",
    tytul: `Wymiana: ${actor.name} ↔ ${z}`,
    rodzaj: "sukces",
    linie: [
      `<strong>Oddaje:</strong> ${esc(oddal.join(", ") || "—")}`,
      `<strong>Dostaje:</strong> ${esc(otrzymal.join(", ") || "—")}`
    ]
  }), { actor });
  await wyslijKarte(kartaPostoju({
    ikona: "icons/svg/coins.svg",
    tytul: `Wymiana: wartości (MG)`,
    podtytul: `${actor.name} ↔ ${z}`,
    linie: [
      `Oddane (skup ${wyc.skupPct}%): <strong>${fmtGb(wyc.sumaDaje)}</strong> · dostane: <strong>${fmtGb(wyc.sumaDostaje)}</strong>`,
      `Korekta: ${fmtGb(w.korekta)} · saldo: <strong>${fmtGb(wyc.saldo)}</strong>${w.notatka ? ` — ${esc(w.notatka)}` : ""}`,
      ...uwagi.map(esc)
    ]
  }), { szept: "gm", actor });

  if (handlarz) await notujWizyte(handlarz);
  await zamknijWymiane(actor);
  const wynik = { otrzymal, oddal, uwagi, handlarz, sprzedaz: w.daje.length > 0, zakup: w.dostaje.length > 0, zamowienie: w.zamowienie, wycena: wyc };
  Hooks.callAll(HOOK_ZATWIERDZONA, actor, wynik);
  return wynik;
}

/** Odrzucenie (MG): zamknięcie bez przenoszenia, karta dla gracza. */
export async function odrzucWymiane(actor, { powod = "" } = {}) {
  const w = wymiana(actor);
  if (!w) return;
  const h = w.handlarz ? fromUuidSync(w.handlarz) : null;
  await zamknijWymiane(actor);
  await wyslijKarte(kartaPostoju({
    ikona: "icons/svg/cancel.svg", tytul: `Wymiana odrzucona: ${actor.name}`, podtytul: h?.name ?? "",
    rodzaj: "porazka", linie: [powod ? esc(powod) : "Nie dogadali się."]
  }), { actor });
}

/** Przeróbka do „Dostaję” (MG): ulepszenie z tabeli i broń-cel gracza; niezgodność — ostrzeżenie, nie blokada. */
export async function dodajPrzerobke(actor, addonId, bronUuid) {
  const def = ADDON_DEFS[addonId];
  const bron = bronUuid ? fromUuidSync(bronUuid) : null;
  const blad = bron && def ? isAddonCompatible(bron, def) : null;
  if (blad) ui.notifications.warn(`Przeróbka: ${blad} (MG może zatwierdzić mimo to — ulepszenie trafi do ekwipunku).`);
  return dodajDostaje(actor, { typ: "przerobka", addon: addonId, cel: bronUuid ?? null, nazwa: `${def?.label ?? addonId}${bron ? ` → ${bron.name}` : ""}`, ilosc: 1 });
}

export const __testing = Object.freeze({ _kategoriaZTypu, _stosowalny });
