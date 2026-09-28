/**
 * Neuroshima 5e — produkcja na odpoczynku (PLAN_produkcja §9, etap E5): klienci rejestru
 * `actors/rest-activities.mjs`.
 *
 *   produkcja   — praca nad Robotami kierownika (KO: wspólna godzina, DO: 10 h pracy),
 *   czyszczenie — czyszczenie broni palnej, 1 h za sztukę (s. 45; dzieli budżet KO, D-L9),
 *   truciciel   — DO: porcja olejku trującego z narzędziami chemika (s. 94, D36),
 *   pogromca    — DO: naboje do Pogromcy, do PB sztuk po 10 gb surowców, bez Testu (s. 99, D35).
 *
 * Godziny liczą się w `dnd5e.restCompleted`, po odpoczynku — Testy Robót, które przekroczyły
 * 100%, otwierają się po zbiorczej wiadomości, nie w jej środku.
 */

import { registerRestActivity } from "../actors/rest-activities.mjs";
import { robotyKierownika, daneRoboty, pracuj, zaproponujTest } from "./robota.mjs";
import { mnoznikWykonawcy, maZdolnosc } from "./wykonawca.mjs";
import { utworzWynik } from "./wynik.mjs";
import { stOlejku, dodajOlejek } from "./olejek.mjs";
import { fmtSurowce } from "./karty.mjs";
import { cleanWeapon, isCleaned } from "../weapons/jams.mjs";
import { hasToolKit } from "../actors/tool-availability.mjs";
import { takeManySurowce } from "../actors/surowce-store.mjs";
import { parseCzasPracy, czasWykonawcy, fmtGGMM } from "../config/production-rules.mjs";

const esc = s => foundry.utils.escapeHTML(String(s ?? ""));

/** Pola formularza zajęcia `id` → wartości (po `name="neuroZajecia.<id>.<klucz>"`). */
function _pola(form, id) {
  const out = {};
  for (const el of form.querySelectorAll(`[name^="neuroZajecia.${id}."]`)) {
    const k = el.name.slice(`neuroZajecia.${id}.`.length);
    out[k] = el.type === "checkbox" ? el.checked : el.value;
  }
  return out;
}

/* -------------------------------------------- */
/*  Produkcja: praca nad Robotami               */
/* -------------------------------------------- */

registerRestActivity({
  id: "produkcja",
  label: "Produkcja i naprawa",
  budzet: "praca",
  render(actor) {
    const roboty = robotyKierownika(actor).filter(i => daneRoboty(i).stan === "praca");
    if (!roboty.length) return null;
    return roboty.map(item => {
      const r = daneRoboty(item);
      const m = mnoznikWykonawcy(actor, r.przepis, { kontener: item.parent, naprawa: r.rodzaj === "naprawa" });
      const doKonca = czasWykonawcy(r.wymagane - r.postep, m.mnoznik);
      return `<div class="form-group neuro-zajecie-robota">
        <label>${esc(r.przepis.nazwa)} <span class="hint">${fmtGGMM(r.postep)} / ${fmtGGMM(r.wymagane)} · zostało ${fmtGGMM(doKonca)}${item.parent !== actor ? ` · ${esc(item.parent.name)}` : ""}</span></label>
        <div class="form-fields"><input type="text" name="neuroZajecia.produkcja.${r.id}" placeholder="0:00" data-do-konca="${doKonca}"></div>
      </div>`;
    }).join("");
  },
  minuty(form) {
    return Object.values(_pola(form, "produkcja")).reduce((s, v) => s + (parseCzasPracy(v) ?? 0), 0);
  },
  async apply(actor, wartosci) {
    const linie = [];
    const doTestu = [];
    let minuty = 0;
    const roboty = robotyKierownika(actor);
    for (const [id, v] of Object.entries(wartosci ?? {})) {
      const min = parseCzasPracy(v);
      if (!min) continue;
      const item = roboty.find(i => daneRoboty(i).id === id);
      if (!item) continue;
      const przed = daneRoboty(item);
      const w = await pracuj(item, min, { odpoczynek: true, odlozTest: true, cicho: true });
      if (!w) continue;
      minuty += min;
      const po = item.parent?.items?.get(item.id) ? daneRoboty(item) : null; // bez Testu → już gotowa
      linie.push(`<strong>${esc(przed.przepis.nazwa)}</strong>: ${fmtGGMM(min)} pracy → +${fmtGGMM(w.delta)}`
        + (po ? ` (${fmtGGMM(po.postep)} / ${fmtGGMM(po.wymagane)})` : " — gotowe!"));
      if (w.doTestu && po?.stan === "test") doTestu.push(item);
    }
    return {
      linie, minuty,
      poOdpoczynku: doTestu.length ? async () => { for (const it of doTestu) await zaproponujTest(it); } : null
    };
  }
});

/* -------------------------------------------- */
/*  Czyszczenie broni palnej                     */
/* -------------------------------------------- */

registerRestActivity({
  id: "czyszczenie",
  label: "Czyszczenie broni (1 h za sztukę)",
  // W KO dzieli godzinę z produkcją (s. 45); w DO to osobna, nieforsująca czynność.
  budzet: typ => (typ === "short" ? "praca" : null),
  render(actor) {
    const bronie = actor.items.filter(i => i.type === "weapon" && String(i.system?.type?.value ?? "").startsWith("palna"));
    if (!bronie.length) return null;
    return bronie.map(b => isCleaned(b)
      ? `<label class="neuro-zajecie-check is-done"><i class="fa-solid fa-check" inert></i> ${esc(b.name)} — już wyczyszczona</label>`
      : `<label class="neuro-zajecie-check"><input type="checkbox" name="neuroZajecia.czyszczenie.${b.id}"> ${esc(b.name)}</label>`).join("");
  },
  minuty(form) {
    return Object.values(_pola(form, "czyszczenie")).filter(Boolean).length * 60;
  },
  async apply(actor, wartosci) {
    const linie = [];
    let minuty = 0;
    for (const [id, v] of Object.entries(wartosci ?? {})) {
      if (!v) continue;
      const item = actor.items.get(id);
      if (item && await cleanWeapon(item, { chat: false })) {
        minuty += 60;
        linie.push(`Wyczyszczona: <strong>${esc(item.name)}</strong> (1:00) — jedno przerzucenie zacięcia w następnej walce.`);
      }
    }
    return { linie, minuty };
  }
});

/* -------------------------------------------- */
/*  Truciciel — olejek trujący                   */
/* -------------------------------------------- */

registerRestActivity({
  id: "truciciel",
  label: "Truciciel — porcja olejku",
  restTypes: ["long"],
  render(actor) {
    if (!maZdolnosc(actor, "truciciel")) return null;
    const st = stOlejku(actor);
    const zestaw = hasToolKit(actor, "chemika");
    return `<label class="neuro-zajecie-check${zestaw ? "" : " is-disabled"}">
      <input type="checkbox" name="neuroZajecia.truciciel.porcja" ${zestaw ? "checked" : "disabled"}>
      Olejek trujący (ST ${st}) — 1 porcja${zestaw ? "" : " — <em>potrzebne narzędzia małego chemika</em>"}</label>`;
  },
  async apply(actor, wartosci) {
    if (!wartosci?.porcja) return null;
    if (!hasToolKit(actor, "chemika")) return { linie: [`Olejek: brak narzędzi małego chemika.`] };
    const st = stOlejku(actor);
    await dodajOlejek(actor, st, 1);
    return { linie: [`Truciciel: <strong>Olejek trujący (ST ${st})</strong> — 1 porcja.`] };
  }
});

/* -------------------------------------------- */
/*  Pogromca — naboje                            */
/* -------------------------------------------- */

const NABOJE = Object.freeze({
  trucizna: "Trucizna",
  kwas: "Kwas",
  ogien: "Wybuchowe"
});
/** NOE s. 99: koszt produkcji pocisku 1 MK, 1 CZ, 8 CH (10 gb). */
const KOSZT_NABOJU = Object.freeze({ MK: 1, CZ: 1, CH: 8 });

registerRestActivity({
  id: "pogromca",
  label: "Pogromca — naboje",
  restTypes: ["long"],
  render(actor) {
    if (!maZdolnosc(actor, "pogromca")) return null;
    const pb = Number(actor.system?.attributes?.prof) || 2;
    return `<div class="form-group">
      <label>Naboje (do ${pb} szt., po ${fmtSurowce(KOSZT_NABOJU)})</label>
      <div class="form-fields">
        <input type="number" name="neuroZajecia.pogromca.ile" min="0" max="${pb}" step="1" value="0">
        <select name="neuroZajecia.pogromca.rodzaj">${Object.entries(NABOJE).map(([k, l]) => `<option value="${k}">${l}</option>`).join("")}</select>
      </div></div>`;
  },
  async apply(actor, wartosci) {
    const pb = Number(actor.system?.attributes?.prof) || 2;
    const ile = Math.min(pb, Math.max(0, Math.floor(Number(wartosci?.ile) || 0)));
    if (!ile) return null;
    const rodzaj = NABOJE[wartosci?.rodzaj] ? wartosci.rodzaj : "trucizna";
    const koszt = Object.fromEntries(Object.entries(KOSZT_NABOJU).map(([k, v]) => [k, v * ile]));
    const r = await takeManySurowce(actor, koszt);
    if (!r.ok) return { linie: [`Pogromca: brak surowców na ${ile} naboi — brakuje ${fmtSurowce(r.brak)}.`] };
    await utworzWynik(actor, { ref: `ammo:pogromca-${rodzaj}`, ilosc: ile }, { znacznik: { kierownikId: actor.id, przepisId: "zdolnosc/pogromca-naboje" } });
    return { linie: [`Pogromca: <strong>${ile} × nabój (${NABOJE[rodzaj].toLowerCase()})</strong> — surowce ${fmtSurowce(koszt)}.`] };
  }
});

export function registerOdpoczynek() {
  // Rejestracja zajęć dzieje się przy imporcie pliku (wyżej) — tu tylko znak życia.
  console.log("Neuroshima 5e | Produkcja: zajęcia odpoczynku registered");
}
