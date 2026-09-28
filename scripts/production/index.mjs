/**
 * Neuroshima 5e — Produkcja: rejestracja i API (PLAN_produkcja).
 *
 * `game.neuroshima.produkcja` — to samo, czego używają zakładka i okna, dostępne z konsoli:
 *
 *   const P = game.neuroshima.produkcja;
 *   P.przepisy(actor)                                  // [{przepis, zrodla}] — ZP postaci
 *   P.ocena(actor, P.przepis("std/grenade:grenade-frag"))
 *   const r = await P.start(actor, "std/grenade:grenade-frag", { mimoBrakow: true });
 *   await P.pracuj(r, 240);                            // 4 h pracy
 *   await P.koryguj(r, "+10%", { nota: "pomoc Jima" });
 *   await P.test(r);  await P.porzuc(r);               // porzucenie tylko z WKK
 *   P.surowce.gbOf(actor, "CH")
 */

import { registerRobota, robotaApi } from "./robota.mjs";
import { registerZakladka, daneZakladki } from "./zakladka.mjs";
import { registerSchematy, schematyApi } from "./schematy.mjs";
import { registerPrzenoszenie, przenoszenieApi } from "./przenoszenie.mjs";
import { registerOdpoczynek } from "./odpoczynek.mjs";
import { registerOlejek, olejekApi } from "./olejek.mjs";
import { szybkaApi } from "./szybka.mjs";
import { registerNaprawa, naprawaApi } from "./naprawa.mjs";
import { registerOprawa } from "./oprawa.mjs";
import { oknoStartu, oknoPracy, oknoKorekty, menuRoboty, oknoWprawy, oknoAdHoc } from "./okna.mjs";
import { przepisyDostepne, zrodlaDostepu, nadajWprawe, odbierzWprawe, schematyAktora, wprawaMG } from "./zp.mjs";
import { cechyWykonawcy, ocenNarzedzia, mnoznikWykonawcy, profesjeAktora } from "./wykonawca.mjs";
import { pulaAktora, isMiejsce } from "./pula.mjs";
import { utworzWynik, uuidWKompendium } from "./wynik.mjs";
import { surowceApi } from "../actors/surowce-store.mjs";
import {
  przepis, wszystkiePrzepisy, KATALOG, PROFESJE, LISTA_PROFESJI, PRZEPISY_STANDARDOWE, PRZEPISY_PROFESJI, PRZEPISY_ELABORACJI
} from "../config/recipes-data.mjs";
import * as reguly from "../config/production-rules.mjs";

export function registerProdukcja() {
  registerRobota();
  registerZakladka();
  registerSchematy();
  registerPrzenoszenie();
  registerOlejek();
  registerOdpoczynek();
  registerNaprawa();
  registerOprawa();
}

export const produkcjaApi = Object.freeze({
  ...robotaApi,
  ocena: robotaApi.ocenaStartu,
  roboty: robotaApi.robotyKierownika,
  przepisy: przepisyDostepne,
  dostep: zrodlaDostepu,
  przepis,
  wszystkiePrzepisy,
  nadajWprawe,
  odbierzWprawe,
  schematy: schematyAktora,
  wprawa: wprawaMG,
  wykonawca: Object.freeze({ cechy: cechyWykonawcy, narzedzia: ocenNarzedzia, mnoznik: mnoznikWykonawcy, profesje: profesjeAktora }),
  pula: pulaAktora,
  isMiejsce,
  utworzWynik,
  uuidWKompendium,
  surowce: surowceApi,
  zakladka: daneZakladki,
  schemat: schematyApi,
  ...przenoszenieApi,
  olejek: olejekApi,
  szybka: szybkaApi,
  naprawa: naprawaApi,
  okna: Object.freeze({ start: oknoStartu, praca: oknoPracy, korekta: oknoKorekty, menu: menuRoboty, wprawa: oknoWprawy, adHoc: oknoAdHoc }),
  reguly,
  dane: Object.freeze({ KATALOG, PROFESJE, LISTA_PROFESJI, PRZEPISY_STANDARDOWE, PRZEPISY_PROFESJI, PRZEPISY_ELABORACJI })
});
