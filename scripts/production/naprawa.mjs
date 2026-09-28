/**
 * Neuroshima 5e — Naprawa przedmiotów (NOE s. 146, PLAN_produkcja §11, etap E7).
 *
 * Trzy stopnie z tabeli — Drobnostka / Trochę roboty / Skomplikowana harówa: ST 10 / 15 / 20,
 * koszt 10 / 30 / 50% ceny, czas 1k4 min / 1k4 h / 2k4 h. MG decyduje, co i czym się naprawia —
 * tu stopień ma domyślną wartość per przypadek, a MG może go zmienić.
 *
 * - **Dostęp:** naprawa nie wymaga Schematu ani Wprawy — wystarczą narzędzia (s. 146).
 *   Domyślnie zwykły wymóg produkcji celu z katalogu (broń palna — rusznikarz, biała — kowal,
 *   pancerz — krawiec albo kowal wg materiału, pojazd — mechanik).
 * - **Czas** rzucany przy starcie i widoczny od razu. Mnożniki produkcji go nie skracają (D34).
 * - **Drobnostka** nie tworzy Roboty — Test od razu; surowce schodzą tylko przy sukcesie.
 * - **Porażka** (L15): jak przy produkcji — czas przepada, surowce zostają.
 * - Dotychczasowe naprawy (L16) — broń palna (`weapons/jams.mjs`), wyszczerbiona broń biała
 *   (`weapons/melee-degradation.mjs`), zestaw kowala (`items/toolkit-kowal.mjs`) — to był sam
 *   Test bez kosztu i czasu. Teraz wszystkie wołają `oknoNaprawy`, a stare funkcje zostają
 *   **skutkiem** udanej naprawy (`clearDamage`, `repairWeapon`).
 *
 * **Wytrzymałość pancerzy** (opcjonalne, s. 115, D18): ustawienie świata, domyślnie wyłączone.
 * Trafienie krytyczne w postać w pancerzu — TT pancerza −1 (licznik na przedmiocie, zdejmowany
 * w danych pochodnych). Naprawa: MK = 10% ceny × utracona TT, 1 / 5 / 10 h na punkt.
 */

import {
  NAPRAWA, NAPRAWA_KOLEJNOSC, kosztNaprawy, stopienNaprawyBroniBialej, naprawaPancerza, podzielBudzet,
  profilZLinii, parseSurowce, fmtGGMM, alokujSurowce
} from "../config/production-rules.mjs";
import { KATALOG, KATEGORIE } from "../config/recipes-data.mjs";
import { parseToolExpr, formatToolExpr, toolExprString, ToolExprError } from "../config/tool-expr.mjs";
import { refDlaPrzedmiotu } from "./wynik.mjs";
import { start } from "./robota.mjs";
import { ocenNarzedzia, kontekstWykonawcy, ulatwieniaZPochodzen } from "./wykonawca.mjs";
import { kartaProdukcji, fmtSurowce } from "./karty.mjs";
import { allGb, takeManySurowce } from "../actors/surowce-store.mjs";
import { isDamaged, clearDamage } from "../weapons/jams.mjs";
import { isMeleeWeapon, getDegradationState, repairWeapon } from "../weapons/melee-degradation.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const USTAWIENIE = "wytrzymaloscPancerzy";
const FLAG_PANCERZ = "wytrzymalosc"; // na pancerzu: { utracone: n }
const DIE_CHAIN = [12, 10, 8, 6, 4, 1];
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/* -------------------------------------------- */
/*  Co i jak naprawiać                          */
/* -------------------------------------------- */

const _jestPalna = i => i?.type === "weapon" && String(i.system?.type?.value ?? "").startsWith("palna");
const _jestPancerzem = i => i?.type === "equipment" && ["light", "medium", "heavy"].includes(i.system?.type?.value);

/** Utracona TT pancerza (wytrzymałość, s. 115). */
export function utraconaTT(item) {
  return Number(item?.flags?.[MODULE_ID]?.[FLAG_PANCERZ]?.utracone) || 0;
}

export function wytrzymaloscWlaczona() {
  try { return !!game.settings.get(MODULE_ID, USTAWIENIE); } catch { return false; }
}

/**
 * Stan przedmiotu z punktu widzenia naprawy: czy czegoś brakuje i jaki stopień domyślnie.
 * @returns {{potrzebna: boolean, opis: string, stopien: string, pancerz?: number}}
 */
export function stanNaprawy(item) {
  if (_jestPalna(item) && isDamaged(item)) return { potrzebna: true, opis: "Uszkodzona broń palna", stopien: "troche" };
  if (isMeleeWeapon(item)) {
    const s = getDegradationState(item);
    if (s.originalDenomination) {
      const kroki = Math.max(1, DIE_CHAIN.indexOf(s.currentDenomination ?? s.originalDenomination) - DIE_CHAIN.indexOf(s.originalDenomination));
      return { potrzebna: true, opis: `Wyszczerbiona: k${s.currentDenomination} zamiast k${s.originalDenomination} (${kroki} ${kroki === 1 ? "krok" : "kroki"})`, stopien: stopienNaprawyBroniBialej(kroki) };
    }
  }
  if (_jestPancerzem(item) && utraconaTT(item) > 0) {
    return { potrzebna: true, opis: `Uszkodzony pancerz: TT −${utraconaTT(item)}`, stopien: "pancerz", pancerz: utraconaTT(item) };
  }
  return { potrzebna: false, opis: "Nic nie wskazuje na uszkodzenie — MG decyduje", stopien: "troche" };
}

/** Robota naprawy, która już celuje w ten przedmiot (gdziekolwiek stoi), albo null. */
export function robotaNaprawyDla(item) {
  if (!item?.uuid) return null;
  for (const a of game.actors) {
    for (const i of a.items) {
      const r = i.flags?.[MODULE_ID]?.robota;
      if (r?.rodzaj === "naprawa" && r.cel?.itemUuid === item.uuid) return i;
    }
  }
  return null;
}

/** Przedmioty postaci, które same zgłaszają uszkodzenie i nie mają jeszcze Roboty naprawy. */
export function doNaprawy(actor) {
  return (actor?.items?.contents ?? [])
    .map(item => ({ item, stan: stanNaprawy(item) }))
    .filter(x => x.stan.potrzebna && !robotaNaprawyDla(x.item));
}

/** Domyślny wymóg narzędzi naprawy: zwykły wymóg produkcji celu, inaczej po typie. */
export async function narzedziaNaprawy(item) {
  const ref = await refDlaPrzedmiotu(item);
  const k = ref ? KATALOG.get(ref) : null;
  if (k) return k.narzedzia;
  const typ = String(item.system?.type?.value ?? "");
  if (item.type === "weapon") return typ.startsWith("palna") ? "rusznikarza" : typ === "miotana" ? "stolarza | kowala" : "kowala";
  if (_jestPancerzem(item)) return typ === "light" ? "krawca | kowala" : "kowala";
  if (item.type === "tool") return "kowala";
  return "";
}

async function _profil(item) {
  const ref = await refDlaPrzedmiotu(item);
  const k = ref ? KATALOG.get(ref) : null;
  if (k) return k.profil;
  if (_jestPalna(item)) return profilZLinii(parseSurowce("1 CZ/MK"));
  return profilZLinii(parseSurowce(KATEGORIE.sprzet.profil));
}

async function _tagi(item) {
  const ref = await refDlaPrzedmiotu(item);
  return ref ? KATALOG.get(ref)?.tagi ?? [] : [];
}

/** Rzut czasu naprawy w minutach (1k4 min / 1k4 h / 2k4 h). */
export async function rzucCzas(stopien) {
  const t = NAPRAWA[stopien];
  const roll = await new Roll(t.kosci).evaluate();
  return { minuty: roll.total * (t.jednostka === "h" ? 60 : 1), roll };
}

/**
 * Przepis naprawy (snapshot Roboty): ST, koszt i czas z tabeli (albo z reguły pancerza).
 * @param {Item} item
 * @param {string} stopien  klucz `NAPRAWA` albo „pancerz”
 * @param {{minuty: number, narzedzia: string}} o
 */
export async function przepisNaprawy(item, stopien, { minuty, narzedzia }) {
  const cena = Number(item.system?.price?.value) || 0;
  let surowce;
  let st;
  if (stopien === "pancerz") {
    const n = naprawaPancerza(cena, utraconaTT(item), item.system?.type?.value);
    surowce = [{ typy: ["MK"], gb: n.surowce.MK }];
    st = NAPRAWA.troche.st; // „łatanie pancerza” to przykład Trochę roboty (s. 146)
  } else {
    surowce = podzielBudzet(kosztNaprawy(stopien, cena), await _profil(item));
    st = NAPRAWA[stopien].st;
  }
  return {
    id: `naprawa/${item.id}/${stopien}`,
    nazwa: `Naprawa: ${item.name}`,
    wynik: { typ: "naprawa", ref: null, ilosc: 1 },
    jednorazowy: false,
    cena,
    wartosc: cena,
    st,
    minuty,
    surowce,
    narzedzia: toolExprString(parseToolExpr(narzedzia)),
    tagi: await _tagi(item),
    profesja: null,
    zrodlo: { naprawa: stopien }
  };
}

/* -------------------------------------------- */
/*  Skutek naprawy                              */
/* -------------------------------------------- */

/** Co naprawa faktycznie zmienia na przedmiocie. Zwraca opis do czatu. */
export async function napraw(item) {
  if (!item) return "przedmiotu już nie ma";
  if (_jestPalna(item) && isDamaged(item)) { await clearDamage(item, { chat: false }); return "broń palna sprawna"; }
  if (isMeleeWeapon(item) && getDegradationState(item).originalDenomination) {
    const orig = getDegradationState(item).originalDenomination;
    await repairWeapon(item, { chat: false });
    return `kość obrażeń wraca do k${orig}`;
  }
  if (_jestPancerzem(item) && utraconaTT(item) > 0) {
    const n = utraconaTT(item);
    await item.unsetFlag(MODULE_ID, FLAG_PANCERZ);
    return `pancerz odzyskuje ${n} TT`;
  }
  return "naprawione (skutek rozstrzyga MG)";
}

/* -------------------------------------------- */
/*  Start naprawy                               */
/* -------------------------------------------- */

/**
 * Naprawa: Drobnostka od razu (Test teraz), reszta jako Robota `rodzaj: "naprawa"`.
 * @param {Actor} actor   kto naprawia
 * @param {Item} item     co
 * @param {{stopien?: string, narzedzia?: string, mimoBrakow?: boolean, holder?: Actor}} [o]
 */
export async function rozpocznijNaprawe(actor, item, { stopien = null, narzedzia = null, mimoBrakow = false, holder = actor } = {}) {
  const trwa = robotaNaprawyDla(item);
  if (trwa) {
    ui.notifications.warn(`${item.name} jest już w naprawie (${trwa.parent?.name ?? "?"}) — dokończ tamtą Robotę.`);
    return null;
  }
  stopien ??= stanNaprawy(item).stopien;
  narzedzia ??= await narzedziaNaprawy(item);
  if (stopien !== "drobnostka") {
    const { minuty, roll } = await rzucCzas(stopien === "pancerz" ? "troche" : stopien);
    const pancerzMin = stopien === "pancerz" ? naprawaPancerza(0, utraconaTT(item), item.system?.type?.value).minuty : null;
    const p = await przepisNaprawy(item, stopien, { minuty: pancerzMin ?? minuty, narzedzia });
    const robota = await start(actor, p, { holder, mimoBrakow, rodzaj: "naprawa", cel: item.uuid, img: item.img });
    if (robota && pancerzMin == null) {
      await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }), rolls: [roll],
        content: kartaProdukcji({
          ikona: item.img, tytul: p.nazwa, podtytul: "Czas naprawy", rodzaj: "info",
          linie: [`${NAPRAWA[stopien].label}: ${NAPRAWA[stopien].kosci} ${NAPRAWA[stopien].jednostka === "h" ? "godzin" : "minut"} → <strong>${fmtGGMM(minuty)}</strong>`]
        })
      });
    }
    return robota;
  }

  // Drobnostka: od ręki — Test teraz, surowce tylko przy sukcesie (porażka: czas przepada, L15).
  const p = await przepisNaprawy(item, "drobnostka", { minuty: 0, narzedzia });
  const ctx = kontekstWykonawcy(actor);
  const ocena = ocenNarzedzia(actor, p, { ctx });
  if (!ocena.ok && !mimoBrakow) {
    ui.notifications.warn(`${item.name}: brakuje narzędzi (${formatToolExpr(ocena.brakuje)}) — możesz naprawiać mimo braków.`);
    return null;
  }
  const alok = alokujSurowce(p.surowce, allGb(actor));
  if (!alok.ok) { ui.notifications.warn(`Brakuje surowców na naprawę: ${fmtSurowce(alok.brak)}.`); return null; }
  const { minuty, roll: czasRoll } = await rzucCzas("drobnostka");
  const tool = [...(ocena.wybor ?? [])].sort((a, b) => (Number(actor.system.tools?.[b]?.total) || 0) - (Number(actor.system.tools?.[a]?.total) || 0))[0];
  const adv = ulatwieniaZPochodzen(actor, p, { ctx });
  const msg = { data: { flavor: `<strong>Naprawa (Drobnostka):</strong> ${esc(item.name)} (ST ${p.st})` } };
  const cfg = { target: p.st, ...(adv.length ? { advantage: true } : {}) };
  const rolls = tool ? await actor.rollToolCheck({ tool, ...cfg }, {}, msg) : await actor.rollAbilityCheck({ ability: "int", ...cfg }, {}, msg);
  const r = Array.isArray(rolls) ? rolls[0] : rolls;
  if (!r) return null;
  const ok = r.total >= p.st;
  let skutek = "";
  if (ok) {
    await takeManySurowce(actor, alok.przydzial);
    skutek = await napraw(item);
  }
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }), rolls: [czasRoll],
    content: kartaProdukcji({
      ikona: item.img, tytul: p.nazwa, podtytul: ok ? "Drobnostka — naprawione" : "Drobnostka — nieudana", rodzaj: ok ? "sukces" : "porazka",
      linie: [`Czas: <strong>${fmtGGMM(minuty)}</strong> (1k4 min) · ${ok ? `surowce: ${fmtSurowce(alok.przydzial)} · ${esc(skutek)}` : "surowce zostają, czas przepadł"}`],
      ostrzezenia: ocena.ok ? [] : [`Bez kompletu narzędzi: ${formatToolExpr(ocena.brakuje)} — MG decyduje.`],
      przyciski: [{ akcja: "czas", label: `Przesuń czas o ${fmtGGMM(minuty)}`, gm: true, dane: { minuty }, ikona: "fa-solid fa-clock" }]
    })
  });
  return ok;
}

/**
 * Okno naprawy (§11): stan przedmiotu, stopień (domyślny per przypadek), narzędzia, koszt.
 * Wszystkie dotychczasowe przyciski „Napraw” prowadzą tutaj.
 */
export async function oknoNaprawy(actor, item) {
  actor ??= item?.actor;
  if (!actor || !item) return null;
  const stan = stanNaprawy(item);
  const narz0 = await narzedziaNaprawy(item);
  const cena = Number(item.system?.price?.value) || 0;
  const opcje = [...NAPRAWA_KOLEJNOSC, ...(stan.stopien === "pancerz" ? ["pancerz"] : [])].map(k => {
    const t = NAPRAWA[k];
    const label = k === "pancerz"
      ? `Wytrzymałość pancerza — ST 15, MK ${naprawaPancerza(cena, stan.pancerz, item.system?.type?.value).surowce.MK} gb, ${fmtGGMM(naprawaPancerza(cena, stan.pancerz, item.system?.type?.value).minuty)}`
      : `${t.label} — ST ${t.st}, ${kosztNaprawy(k, cena)} gb surowców, ${t.kosci} ${t.jednostka === "h" ? "h" : "min"}`;
    return `<option value="${k}" ${k === stan.stopien ? "selected" : ""}>${esc(label)}</option>`;
  }).join("");
  const gm = game.user.isGM;
  const wynik = await foundry.applications.api.DialogV2.wait({
    window: { title: `Naprawa: ${item.name}`, icon: "fa-solid fa-hammer" },
    position: { width: 480 },
    content: `<p><strong>${esc(stan.opis)}</strong> · cena ${cena} gb</p>
      <label>Stopień <select name="stopien">${opcje}</select></label>
      <label>Narzędzia ${gm ? `<input type="text" name="narzedzia" value="${esc(narz0)}">` : `<strong>${esc(formatToolExpr(parseToolExpr(narz0)))}</strong>`}</label>
      <label><input type="checkbox" name="mimoBrakow"> Naprawiaj mimo braków narzędzi (MG zdecyduje)</label>
      <p class="hint">Naprawa nie wymaga Schematu — wystarczą narzędzia. Fabrykator i profesja nie skracają napraw (D34). Drobnostka rozstrzyga się od razu.</p>`,
    buttons: [{
      action: "ok", label: "Napraw", icon: "fa-solid fa-hammer", default: true,
      callback: (e, b) => ({
        stopien: b.form.elements.stopien.value,
        narzedzia: gm ? b.form.elements.narzedzia.value : narz0,
        mimoBrakow: b.form.elements.mimoBrakow.checked
      })
    }]
  });
  if (!wynik) return null;
  try { parseToolExpr(wynik.narzedzia); } catch (err) {
    return ui.notifications.error(err instanceof ToolExprError ? err.message : String(err));
  }
  return rozpocznijNaprawe(actor, item, wynik);
}

/* -------------------------------------------- */
/*  Wytrzymałość pancerzy (s. 115, D18)         */
/* -------------------------------------------- */

function _zalozonyPancerz(actor) {
  return actor?.items?.find(i => _jestPancerzem(i) && i.system?.equipped) ?? null;
}

async function _onApplyDamage(actor, amount, options) {
  if (!wytrzymaloscWlaczona() || !game.users.activeGM?.isSelf) return;
  if (!(amount > 0)) return;
  const krytyk = options?.isCritical === true
    || options?.origin?.rolls?.some?.(r => r?.isCritical || r?.options?.isCritical)
    || options?.originatingMessage?.flags?.dnd5e?.roll?.critical === true;
  if (!krytyk) return;
  const pancerz = _zalozonyPancerz(actor);
  if (!pancerz) return;
  const baza = Number(pancerz._source.system?.armor?.value) || 0;
  const max = Math.max(0, baza - 10); // pancerz nie spada poniżej „bez pancerza”
  const n = Math.min(max, utraconaTT(pancerz) + 1);
  if (n === utraconaTT(pancerz)) return;
  await pancerz.setFlag(MODULE_ID, FLAG_PANCERZ, { utracone: n });
  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: kartaProdukcji({
      ikona: pancerz.img, tytul: pancerz.name, podtytul: "Uszkodzenie pancerza", rodzaj: "porazka",
      linie: [`Trafienie krytyczne — <strong>TT −1</strong> (łącznie −${n}). Naprawa: MK ${naprawaPancerza(Number(pancerz.system.price?.value) || 0, n, pancerz.system.type?.value).surowce.MK} gb, `
        + `${fmtGGMM(naprawaPancerza(0, n, pancerz.system.type?.value).minuty)} (s. 115).`]
    })
  });
}

function _wrapPancerz() {
  const proto = CONFIG.Item.documentClass.prototype;
  const original = proto.prepareDerivedData;
  proto.prepareDerivedData = function () {
    original.apply(this, arguments);
    const n = Number(this.flags?.[MODULE_ID]?.[FLAG_PANCERZ]?.utracone) || 0;
    if (!n || !this.system?.armor || !wytrzymaloscWlaczona()) return;
    this.system.armor.value = Math.max(10, (Number(this.system.armor.value) || 0) - n);
  };
}

export function registerNaprawa() {
  game.settings.register(MODULE_ID, USTAWIENIE, {
    name: "Wytrzymałość pancerzy (opcjonalne)",
    hint: "NOE s. 115: trafienie krytyczne obniża TT noszonego pancerza o 1; naprawa kosztuje MK (10% ceny za punkt) "
      + "i czas (1 / 5 / 10 h za punkt). Bez tej zasady pancerz się nie zużywa.",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    onChange: () => { for (const a of game.actors) if (a.sheet?.rendered) a.sheet.render(); }
  });
  _wrapPancerz();
  Hooks.on("dnd5e.applyDamage", _onApplyDamage);
  // MG decyduje, co się naprawia (s. 146) — więc „Napraw…” jest na każdym posiadanym przedmiocie,
  // nie tylko na tych, które same zgłaszają uszkodzenie. Hak jak w `schematy.mjs` (bez ItemSheetV2).
  Hooks.on("getHeaderControlsDocumentSheetV2", _onHeaderControls);
}

const NAPRAWIALNE = new Set(["weapon", "equipment", "tool"]);

function _onHeaderControls(app, controls) {
  const item = app.document;
  if (!(item instanceof Item) || !item.actor || !item.isOwner || !NAPRAWIALNE.has(item.type)) return;
  if (item.flags?.[MODULE_ID]?.robota) return;
  controls.push({
    icon: "fa-solid fa-hammer",
    label: "Napraw…",
    action: "neuroNapraw",
    onClick: () => oknoNaprawy(item.actor, item)
  });
}

export const naprawaApi = Object.freeze({
  okno: oknoNaprawy, rozpocznij: rozpocznijNaprawe, stan: stanNaprawy, napraw, narzedzia: narzedziaNaprawy,
  utraconaTT, wytrzymalosc: wytrzymaloscWlaczona, doNaprawy, robotaDla: robotaNaprawyDla
});
