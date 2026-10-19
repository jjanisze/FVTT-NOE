/**
 * The stations (PLAN_human_testing.md §5), in panel order: the benchmark first, then P1, P2, P3.
 * A station: `{ id, name, prio, icon, opis, gracze, build(kit) → summary, proby[], narzedzia?[],
 * klucz?[], clear?() }` — `build` gets a fresh `Kit` after the station's previous documents are gone.
 * Probes are in Polish (H-D8); `warstwa` marks NOE / RAI / WKK / VETO.
 */

import hangar from "./hangar.mjs";
import magazyn from "./magazyn.mjs";
import plac from "./plac.mjs";
import strzelnica from "./strzelnica.mjs";
import garderoba from "./garderoba.mjs";
import ciemnia from "./ciemnia.mjs";
import lazaret from "./lazaret.mjs";
import bazar from "./bazar.mjs";
import zlomowisko from "./zlomowisko.mjs";
import arena from "./arena.mjs";
import bestiariusz from "./bestiariusz.mjs";
import kuznia from "./kuznia.mjs";
import kreator from "./kreator.mjs";
import droga from "./droga.mjs";
import garaz from "./garaz.mjs";
import poscig from "./poscig.mjs";
import galeria from "./galeria.mjs";

export const STATIONS = Object.freeze([
  hangar, magazyn, plac, strzelnica, garderoba, ciemnia, lazaret, bazar, zlomowisko,
  arena, bestiariusz, kuznia, kreator, droga, garaz, poscig, galeria
]);

export const station = id => STATIONS.find(s => s.id === id) ?? null;
