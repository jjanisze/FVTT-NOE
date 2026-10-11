/**
 * Neuroshima 5e — sekcja „Punkty handlowe” na zakładce Postój (PLAN_m5_postoj.md §7.3, §7.7).
 *
 * Punkty handlowe miejsca drużyny; MG: [Nowy punkt handlowy], [Losuj od nowa], [Usuń], notka wizyty i lista
 * otwartych wymian członków drużyny (wejście MG do stołu wymiany).
 */

import { getMiejsce } from "./miejsce.mjs";
import {
  handlarzeMiejsca, portretHandlarza, opisHandlarza, notkaWizyty, oknoNowegoPunktu, oknoLosujOdNowa, usunPunkt
} from "./handlarz.mjs";
import { wymiana } from "./wymiana.mjs";
import { otworzStolWymiany } from "./stol-wymiany.mjs";
import { zarejestrujSekcjePostoju, zarejestrujAkcjePostoju } from "./zakladka.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const SZABLON = `modules/${MODULE_ID}/templates/postoj/sekcja-handel.hbs`;

async function _kontekst(grupa) {
  const isGM = game.user.isGM;
  const punkty = await Promise.all(handlarzeMiejsca(getMiejsce(grupa)).map(async h => ({
    uuid: h.uuid, nazwa: h.name, portret: await portretHandlarza(h), pozycji: h.items.size,
    ...opisHandlarza(h), ...(isGM ? notkaWizyty(h) : {})
  })));
  const wymiany = isGM ? (grupa.system.members ?? []).map(m => m.actor).filter(a => a && wymiana(a))
    .map(a => ({ uuid: a.uuid, nazwa: a.name, zgoda: wymiana(a).zgoda })) : [];
  return { punkty, wymiany };
}

export function registerZakladkaHandel() {
  zarejestrujSekcjePostoju({ id: "handel", kolejnosc: 20, kontekst: _kontekst, szablon: SZABLON });
  zarejestrujAkcjePostoju({
    neuroPunktNowy: async function () { await oknoNowegoPunktu(this.actor); this.render(); },
    neuroPunktLosuj: async function (_ev, btn) { const h = fromUuidSync(btn.dataset.uuid); if (h) await oknoLosujOdNowa(h); this.render(); },
    neuroPunktUsun: async function (_ev, btn) { const h = fromUuidSync(btn.dataset.uuid); if (h) await usunPunkt(h); this.render(); },
    neuroPunktKarta: function (_ev, btn) { fromUuidSync(btn.dataset.uuid)?.sheet?.render({ force: true }); },
    neuroWymianaOtworz: function (_ev, btn) { otworzStolWymiany(fromUuidSync(btn.dataset.uuid)); }
  });
}
