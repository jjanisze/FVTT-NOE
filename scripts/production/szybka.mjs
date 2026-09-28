/**
 * Neuroshima 5e — Szybka produkcja Speca (NOE s. 79, PLAN_produkcja §10, etap E6).
 *
 * „Poza zwykłymi zasadami produkcji” — więc **żadnej Roboty**, osobny mechanizm z osobną oprawą
 * („iskra”, ⚡). Raz na Krótki lub Długi odpoczynek (natywne `uses` zdolności, 1/sr), przedmioty
 * o łącznej **wartości** do 25 gb (50 gb od 11. poziomu Speca), czas 1 minuta × 1 gb.
 *
 * - **Kiedy:** zawsze, gdy jest ładunek — także w eksploracji, poza odpoczynkiem (D10).
 * - **Z czego:** ZP postaci (Schemat, Wprawa, Proste — Szybka produkcja nie daje dostępu),
 *   narzędzia i surowce **przy sobie** — to praca w polu; z puli najpierw trzeba przenieść.
 * - **Koszt:** zwykłe surowce przepisu (Przydasie −50%); czas Σ gb × 1 min, Fabrykator ×0,5,
 *   cecha profesji z WKK nie działa (D33).
 * - **Bez Testu.** Zużywa ładunek, tworzy przedmioty od razu. Braki narzędzi — jak D23: da się
 *   przeklikać, karta nosi ⚠.
 */

import { przepisyDostepne } from "./zp.mjs";
import { kontekstWykonawcy, ocenNarzedzia, maZdolnosc } from "./wykonawca.mjs";
import { utworzWynik } from "./wynik.mjs";
import { kartaProdukcji, fmtSurowce } from "./karty.mjs";
import { dzwiek, nadZetonem } from "./oprawa.mjs";
import {
  budzetSzybkiejProdukcji, czasSzybkiejProdukcji, surowceWykonawcy, alokujSurowce, fmtGGMM
} from "../config/production-rules.mjs";
import { allGb, takeManySurowce } from "../actors/surowce-store.mjs";
import { formatToolExpr } from "../config/tool-expr.mjs";
import { isKobaltEnabled } from "../config/settings.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const IKONA = "icons/svg/lightning.svg";
const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/** Koszyk per aktor — tylko w pamięci (to lista zakupów, nie stan gry). */
const _koszyki = new Map();

/** Zdolność Szybkiej produkcji aktora albo null. */
export function zdolnoscSzybkiej(actor) {
  return (actor?.items ?? []).find(i => i.getFlag?.(MODULE_ID, "abilityId") === "szybka-produkcja") ?? null;
}

/** Stan Szybkiej produkcji: ładunki, budżet (25 / 50 gb), koszyk i jego wartość. */
export function stanSzybkiej(actor) {
  const item = zdolnoscSzybkiej(actor);
  if (!item) return null;
  const poziom2 = maZdolnosc(actor, "szybka-produkcja-2") || (Number(actor.classes?.spec?.system?.levels) || 0) >= 11;
  const max = Number(item.system.uses?.max) || 0;
  const zostalo = Number(item.system.uses?.value ?? (max - (Number(item.system.uses?.spent) || 0))) || 0;
  const koszyk = _koszyki.get(actor.id) ?? [];
  const wartosc = koszyk.reduce((s, k) => s + k.przepis.wartosc * k.ilosc, 0);
  return { item, poziom2, ladunki: zostalo, max, budzet: budzetSzybkiejProdukcji({ poziom2 }), koszyk, wartosc };
}

/** Dokłada przepis do koszyka (sprawdza budżet wartości). */
export function dodajDoKoszyka(actor, przepis, ile = 1) {
  const s = stanSzybkiej(actor);
  if (!s) return ui.notifications.warn(`${actor.name} nie ma Szybkiej produkcji.`);
  if (s.wartosc + przepis.wartosc * ile > s.budzet + 1e-9) {
    return ui.notifications.warn(`Szybka produkcja: ponad budżet ${s.budzet} gb (w koszyku ${s.wartosc} gb).`);
  }
  const koszyk = [...s.koszyk];
  const jest = koszyk.find(k => k.przepis.id === przepis.id);
  if (jest) jest.ilosc += ile;
  else koszyk.push({ przepis, ilosc: ile });
  _koszyki.set(actor.id, koszyk);
  return koszyk;
}

export function usunZKoszyka(actor, przepisId) {
  _koszyki.set(actor.id, (_koszyki.get(actor.id) ?? []).filter(k => k.przepis.id !== przepisId));
}

export function wyczyscKoszyk(actor) {
  _koszyki.delete(actor.id);
}

/**
 * Ocena koszyka: surowce przy sobie, narzędzia pod ręką, czas.
 * @returns {{ok: boolean, surowce: object, brak: object, braki: object[], minuty: number, wartosc: number}}
 */
export function ocenaKoszyka(actor, koszyk = null) {
  const s = stanSzybkiej(actor);
  koszyk ??= s?.koszyk ?? [];
  const ctx = kontekstWykonawcy(actor);
  const linie = [];
  const braki = [];
  let wartosc = 0;
  for (const { przepis, ilosc } of koszyk) {
    for (const l of surowceWykonawcy(przepis.surowce, { przydasie: ctx.cechy.przydasie })) {
      linie.push({ typy: l.typy, gb: l.gb * ilosc });
    }
    const o = ocenNarzedzia(actor, przepis, { ctx });
    // Praca w polu: zestaw w puli się nie liczy — musi być przy sobie.
    if (!o.ok) braki.push({ przepis, brakuje: o.brakuje, braki: o.braki });
    wartosc += przepis.wartosc * ilosc;
  }
  const alok = alokujSurowce(linie, allGb(actor));
  return {
    ok: alok.ok, surowce: alok.przydzial, brak: alok.brak, braki, wartosc,
    minuty: czasSzybkiejProdukcji(wartosc, { fabrykator: ctx.cechy.fabrykator }),
    fabrykator: ctx.cechy.fabrykator
  };
}

/**
 * Wykonaj Szybką produkcję: zużyj ładunek i surowce, stwórz przedmioty, karta „iskra”.
 * @param {Actor} actor
 * @param {{mimoBrakow?: boolean}} [o]
 */
export async function wykonajSzybka(actor, { mimoBrakow = false } = {}) {
  const s = stanSzybkiej(actor);
  if (!s) return ui.notifications.warn(`${actor.name} nie ma Szybkiej produkcji.`);
  if (!actor.isOwner) return ui.notifications.warn("Brak uprawnień.");
  if (!s.koszyk.length) return ui.notifications.info("Koszyk Szybkiej produkcji jest pusty.");
  if (s.ladunki < 1) return ui.notifications.warn("Szybka produkcja zużyta — wraca po Krótkim lub Długim odpoczynku.");
  if (s.wartosc > s.budzet + 1e-9) return ui.notifications.warn(`Ponad budżet ${s.budzet} gb.`);
  const kobalt = isKobaltEnabled();
  const dostepne = new Set(przepisyDostepne(actor, { kobalt }).map(x => x.przepis.id));
  const bezDostepu = s.koszyk.filter(k => !dostepne.has(k.przepis.id));
  if (bezDostepu.length) return ui.notifications.warn(`Brak dostępu (Schemat / Wprawa): ${bezDostepu.map(k => k.przepis.nazwa).join(", ")}.`);
  const o = ocenaKoszyka(actor, s.koszyk);
  if (!o.ok) return ui.notifications.warn(`Brakuje surowców przy sobie: ${fmtSurowce(o.brak)} — przenieś je z puli.`);
  if (o.braki.length && !mimoBrakow) {
    return ui.notifications.warn(`Brak narzędzi przy sobie: ${o.braki.map(b => `${b.przepis.nazwa} (${formatToolExpr(b.brakuje)})`).join(", ")}.`);
  }

  const r = await takeManySurowce(actor, o.surowce);
  if (!r.ok) return ui.notifications.warn(`Brakuje surowców: ${fmtSurowce(r.brak)}.`);
  await s.item.update({ "system.uses.spent": (Number(s.item.system.uses?.spent) || 0) + 1 });

  const zrobione = [];
  for (const { przepis, ilosc } of s.koszyk) {
    const w = przepis.wynik;
    if (w.typ === "item") {
      await utworzWynik(actor, { ...w, ilosc: (w.ilosc ?? 1) * ilosc }, {
        znacznik: { kierownikId: actor.id, przepisId: przepis.id, kiedy: game.time.worldTime, szybka: true }
      });
    }
    zrobione.push(`${ilosc * (w.ilosc ?? 1) > 1 ? `${ilosc * (w.ilosc ?? 1)} × ` : ""}<strong>${esc(przepis.nazwa)}</strong>`);
  }
  wyczyscKoszyk(actor);
  dzwiek("szybka");
  nadZetonem(actor, "⚡", "#f4d03f");

  await ChatMessage.create({
    speaker: ChatMessage.getSpeaker({ actor }),
    content: kartaProdukcji({
      ikona: IKONA, tytul: "Szybka produkcja", podtytul: `${o.wartosc} / ${s.budzet} gb`, rodzaj: "szybka",
      linie: [zrobione.join(", "),
        `Surowce: ${fmtSurowce(o.surowce)} · czas: <strong>${fmtGGMM(o.minuty)}</strong>${o.fabrykator ? " (Fabrykator ×0,5)" : ""}`],
      ostrzezenia: o.braki.length ? [`Bez kompletu narzędzi: ${o.braki.map(b => `${b.przepis.nazwa} — ${formatToolExpr(b.brakuje)}`).join("; ")} — MG decyduje.`] : [],
      przyciski: [{ akcja: "czas", label: `Przesuń czas o ${fmtGGMM(o.minuty)}`, gm: true, dane: { minuty: o.minuty }, ikona: "fa-solid fa-clock" }]
    })
  });
  return zrobione;
}

export const szybkaApi = Object.freeze({
  stan: stanSzybkiej, dodaj: dodajDoKoszyka, usun: usunZKoszyka, wyczysc: wyczyscKoszyk, ocena: ocenaKoszyka, wykonaj: wykonajSzybka
});
