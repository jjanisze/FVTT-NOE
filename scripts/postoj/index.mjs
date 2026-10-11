/**
 * Neuroshima 5e — M5: handel, postój, szabrowanie i bebeszenie (PLAN_m5_postoj.md).
 *
 * Jedno wejście dla `main.mjs`: rejestracja w `init` i API w `ready`
 * (`game.neuroshima.handel`, `.postoj`). Czyste zasady — `config/{handel,postoj,fuksy}-rules.mjs` i dane obok.
 */

import { registerIlustracjeSetting, ilustracja, wyczyscPamiecIlustracji } from "../config/ilustracje.mjs";
import * as handelRules from "../config/handel-rules.mjs";
import * as postojRules from "../config/postoj-rules.mjs";
import { registerKartyPostoju } from "./karty.mjs";
import { registerMiejsce, miejsceApi } from "./miejsce.mjs";
import { registerPortfel, audytPortfela, walutaLokalna, gbWPortfelu } from "./portfel.mjs";
import { registerCennik, otworzCennik } from "./cennik.mjs";
import { rzucZamowienie, gamblingWeKrwi } from "./zamowienie.mjs";

/** Wołane z `init`. */
export function registerPostoj() {
  registerIlustracjeSetting();
  registerKartyPostoju();
  registerMiejsce();
  registerPortfel();
  registerCennik();
  console.log("Neuroshima 5e | M5 Postój i handel registered");
}

/** `game.neuroshima.handel` */
export const handelApi = Object.freeze({
  cennik: otworzCennik,
  audytPortfela,
  gbWPortfelu,
  walutaLokalna,
  zamowienie: rzucZamowienie,
  gamblingWeKrwi,
  zasady: handelRules
});

/** `game.neuroshima.postoj` */
export const postojApi = Object.freeze({
  miejsce: miejsceApi,
  ilustracja,
  wyczyscPamiecIlustracji,
  zasady: postojRules
});
