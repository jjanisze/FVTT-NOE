/**
 * Neuroshima 5e — sekcja „Doba postoju” na zakładce Postój: widok MG (PLAN_m5_postoj.md §7.11, U27, U28).
 *
 * MG: [Otwórz dobę], wiersz na postać (stan szkicu, sen, zajęcia, praca, saldo, przekroczenia), [Szkic] (okno
 * Doba tej postaci), [Domyślny] (U28 — wczorajszy albo: sen, bez zajęć, utrzymanie jak wczoraj), [Zatwierdź dobę]
 * — aktywny zawsze, z potwierdzeniem, gdy nie wszyscy zgłosili. Gracze: stan doby i [Ułóż dobę] dla swojej postaci.
 */

import { fmtGb } from "../config/handel-rules.mjs";
import { UTRZYMANIE } from "../config/postoj-rules.mjs";
import { formatWorldDate } from "../world-clock.mjs";
import { zarejestrujSekcjePostoju, zarejestrujAkcjePostoju } from "./zakladka.mjs";
import {
  doba, postacieDruzyny, szkic, szkicDomyslny, zapiszSzkic, rachunekDoby, budzetSzkicu, otworzDobe, zamknijDobe, zatwierdzDobe
} from "./doba.mjs";
import { otworzDobeOkno } from "./doba-okno.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const SZABLON = `modules/${MODULE_ID}/templates/postoj/sekcja-doba.hbs`;

async function _kontekst(grupa) {
  const d = doba(grupa);
  const isGM = game.user.isGM;
  const wiersze = [];
  if (d) {
    for (const a of postacieDruzyny(grupa)) {
      const s = szkic(a);
      const tej = s && s.dobaId === d.id;
      const moj = a.isOwner;
      const w = { uuid: a.uuid, nazwa: a.name, img: a.img, moj, stan: !tej ? "brak" : s.stan, stanLabel: !tej ? "brak szkicu" : s.stan === "zgloszony" ? "zgłoszona" : "szkic" };
      if (tej && (isGM || moj)) {
        const b = budzetSzkicu(s);
        const r = await rachunekDoby(a, s, { grupa });
        Object.assign(w, {
          sen: s.sen, zajecia: Math.round((b.suma - b.sen) * 10) / 10, praca: Math.round(b.praca * 10) / 10,
          utrzymanie: s.utrzymanie ? UTRZYMANIE[s.utrzymanie].label : "—",
          saldo: fmtGb(r.saldo), ujemne: r.ujemne,
          przekroczenia: b.przekroczenia.map(p => `${p.rodzaj === "doba" ? "doba" : "praca"} +${p.ile} h`).join(", "),
          domyslny: s.mg.domyslny
        });
      }
      wiersze.push(w);
    }
  }
  return {
    otwarta: !!d,
    data: d ? formatWorldDate() : null,
    wiersze,
    wszyscy: wiersze.length > 0 && wiersze.every(w => w.stan === "zgloszony"),
    historia: (grupa.getFlag(MODULE_ID, "postoj")?.historia ?? []).slice(-3).reverse().map(h => ({ dzien: h.dzien, miejsce: h.miejsce, ile: h.postacie?.length ?? 0 }))
  };
}

/** Szkic gracza zmienił się — odśwież otwarte karty drużyn tej postaci (widok MG). */
function _onUpdateActor(actor, changes) {
  if (!foundry.utils.hasProperty(changes, `flags.${MODULE_ID}.szkicDoby`) && !foundry.utils.hasProperty(changes, `flags.${MODULE_ID}.-=szkicDoby`)) return;
  for (const g of game.actors.filter(x => x.type === "group" && x.system.members?.some(m => m.actor === actor))) {
    if (g.sheet?.rendered) g.sheet.render();
  }
}

export function registerZakladkaDoba() {
  Hooks.on("updateActor", _onUpdateActor);
  zarejestrujSekcjePostoju({ id: "doba", kolejnosc: 10, kontekst: _kontekst, szablon: SZABLON });
  zarejestrujAkcjePostoju({
    neuroDobaOtworz: async function () { await otworzDobe(this.actor); this.render(); },
    neuroDobaZamknij: async function () {
      const ok = await foundry.applications.api.DialogV2.confirm({ window: { title: "Zamknąć dobę bez zatwierdzenia?" }, content: "<p>Szkice zostaną na postaciach, zegar nie ruszy.</p>" });
      if (ok) await zamknijDobe(this.actor);
      this.render();
    },
    neuroDobaSzkic: function (_ev, btn) { otworzDobeOkno(fromUuidSync(btn.dataset.uuid)); },
    neuroDobaDomyslny: async function (_ev, btn) {
      const a = fromUuidSync(btn.dataset.uuid);
      const d = doba(this.actor);
      if (!a || !d) return;
      await zapiszSzkic(a, { ...szkicDomyslny(a, d), stan: "zgloszony", mg: { korekta: 0, stSnu: null, uwagi: "", domyslny: true } });
      this.render();
    },
    neuroDobaZatwierdz: async function () {
      const ctx = await _kontekst(this.actor);
      if (!ctx.wszyscy) {
        const brak = ctx.wiersze.filter(w => w.stan !== "zgloszony").map(w => w.nazwa).join(", ");
        const ok = await foundry.applications.api.DialogV2.confirm({
          window: { title: "Zatwierdzić dobę?" },
          content: `<p>Nie zgłosili: <strong>${foundry.utils.escapeHTML(brak)}</strong>. Ich szkic albo szkic domyślny (U28) — zatwierdzić mimo to?</p>`
        });
        if (!ok) return;
      }
      await zatwierdzDobe(this.actor);
      this.render();
    }
  });
}
