/**
 * Bestiariusz (§5.5, P2): the package closet (Szafa z potworami — pack-only since 2026-10-11) plus a
 * statblock walk. The closet keeps its own reset contract (`monsterCloset.regenerate()` / `remove()`,
 * flag `testScene.id = "monster-closet"`), so this station delegates to it instead of the kit's clear.
 * Hosts PLAN_monster_closet §11 step 2 (the calibration pass).
 */

import { p } from "./_wspolne.mjs";

export default {
  id: "bestiariusz", name: "Bestiariusz", prio: "P2", icon: "fa-solid fa-dragon",
  opis: "Szafa z potworami: jeden żeton na każdą istotę Bestiariusza obok wzorców dnd5e, rzędami po rozmiarze. Kalibracja skali grafiki (QuickScale) i przegląd statblocków, reakcji, dropsAs.",
  gracze: 0,
  async clear() {
    return game.neuroshima.monsterCloset.remove?.();
  },
  async build(k) {
    const C = game.neuroshima.monsterCloset;
    const res = await C.regenerate();
    // regenerate() answers with the scene's name and uuid, not the document.
    const scene = res?.uuid ? fromUuidSync(res.uuid) : null;
    if (scene) k.main = scene;
    else k.miss("scena Szafy z potworami");
    return { scena: scene?.name ?? null, zetony: scene?.tokens?.size ?? 0, wynik: res ? Object.fromEntries(Object.entries(res).filter(([k]) => !["scene", "uuid"].includes(k))) : null };
  },
  proby: [
    p("skala", "Grafika", "Kalibracja skali żetonów (PLAN_monster_closet §11 krok 2): QuickScale na żetonach, potem harvest()", "Nie zapisuj do prototypu — wynik czyta się z żetonu; game.neuroshima.monsterCloset.harvest()."),
    p("statblok", "Statbloki", "Przegląd statblocków: karta BN, reakcje, dropsAs", "Otwórz kilka kart różnych rozmiarów i typów."),
    p("portrety", "Grafika", "Portrety a żetony: brakujące, placeholdery, spójność", "Porównaj z dev/icons/MISSING.md.")
  ]
};
