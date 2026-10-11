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
import { rzucZamowienie, gamblingWeKrwi, registerZamowienie } from "./zamowienie.mjs";
import { registerPrzekaznik } from "./przekaznik.mjs";
import { registerFuksy, fuksyApi } from "../actors/fuksy.mjs";
import { registerFanty, fantyApi } from "../items/fanty.mjs";
import { registerHandlarz, handlarzApi } from "./handlarz.mjs";
import { registerHandel, handelOknoApi, otworzHandel } from "./handel.mjs";
import { registerStolWymiany, otworzStolWymiany } from "./stol-wymiany.mjs";
import { registerZakladkaHandel } from "./zakladka-handel.mjs";
import * as wymianaApi from "./wymiana.mjs";

/** Wołane z `init`. */
export function registerPostoj() {
  registerIlustracjeSetting();
  registerKartyPostoju();
  registerPrzekaznik();
  registerFuksy();
  registerFanty();
  registerMiejsce();
  registerPortfel();
  registerCennik();
  registerZamowienie();
  registerHandlarz();
  registerHandel();
  registerStolWymiany();
  registerZakladkaHandel();
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
  handel: otworzHandel,
  stol: otworzStolWymiany,
  targ: handelOknoApi,
  punkty: handlarzApi,
  wymiana: wymianaApi,
  zasady: handelRules
});

/** `game.neuroshima.fuksy`, `.fanty` */
export { fuksyApi, fantyApi };

/** `game.neuroshima.postoj` */
export const postojApi = Object.freeze({
  miejsce: miejsceApi,
  ilustracja,
  wyczyscPamiecIlustracji,
  zasady: postojRules
});
