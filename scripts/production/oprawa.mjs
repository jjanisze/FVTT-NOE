/**
 * Neuroshima 5e — oprawa produkcji: dźwięk i efekty nad żetonem (PLAN_produkcja §12, etap E8).
 *
 * - **Dźwięk** per rodzina narzędzi przy pracy, a osobno ukończenie, porażka, porzucenie
 *   i Szybka produkcja. Rozgłaszany do wszystkich — produkcja jest jawna (§1.4). Głośność:
 *   ustawienie klienta „Głośność produkcji”.
 * - **Sequencer** (opcjonalnie): „+8:00” nad żetonem kierownika, „Gotowe!” przy ukończeniu.
 *   Bez Sequencera — sam dźwięk (`weapons/sequencer.mjs`, `seqScrollText` sam sprawdza).
 *
 * Pliki: tylko te, które już są w repo (z wpisami w `CREDITS.md`) — tam, gdzie żaden nie pasuje,
 * slot jest pusty i nic nie gra, zamiast grać coś niepasującego. Docelowe nagrania: kolejka
 * `dev/icons/MISSING.md`, sekcja C.
 */

import { seqScrollText } from "../weapons/sequencer.mjs";
import { toolExprKeys, parseToolExpr } from "../config/tool-expr.mjs";

const MODULE_ID = "neuroshima-2026-overrides";
const S = `modules/${MODULE_ID}/sounds`;

/** Rodzina narzędzi → dźwięk pracy. `null` = na razie cisza (MISSING.md C). */
const PRACA = Object.freeze({
  kucie: `${S}/melee/degrade_chip.ogg`,        // kowal
  bron: `${S}/firearms/clean_weapon.ogg`,      // rusznikarz
  chemia: `${S}/gadzety/dezynfekcja.ogg`,      // chemik, aptekarz, gorzelnik
  warsztat: null,                              // mechanik
  lutowanie: null,                             // elektronik, haker
  szycie: null,                                // krawiec
  drewno: null,                                // stolarz
  ogolny: null
});

const RODZINA = Object.freeze({
  kowala: "kucie", rusznikarza: "bron", mechanika: "warsztat", elektronika: "lutowanie", hakera: "lutowanie",
  chemika: "chemia", aptekarza: "chemia", gorzelnika: "chemia", krawca: "szycie", stolarza: "drewno"
});

/** Zdarzenia bez pracy. `null` = cisza do czasu nagrań. */
const ZDARZENIA = Object.freeze({
  ukonczenie: null,
  porazka: null,
  porzucenie: null,
  szybka: `${S}/explosives/detonator_switch.ogg`
});

function _glosnosc() {
  try { return Number(game.settings.get(MODULE_ID, "produkcjaGlosnosc")); } catch { return 0.5; }
}

function _graj(src) {
  const volume = _glosnosc();
  if (!src || !(volume > 0)) return;
  foundry.audio.AudioHelper.play({ src, volume, loop: false }, true)?.catch?.(() => {});
}

/** Rodzina narzędzi przepisu — pierwsze narzędzie z wymogu, które ma swój dźwięk. */
export function rodzinaPrzepisu(przepis) {
  for (const k of toolExprKeys(parseToolExpr(przepis?.narzedzia ?? ""))) if (RODZINA[k]) return RODZINA[k];
  return "ogolny";
}

/** Dźwięk pracy nad przepisem. */
export function dzwiekPracy(przepis) {
  _graj(PRACA[rodzinaPrzepisu(przepis)]);
}

/** Dźwięk zdarzenia: „ukonczenie” | „porazka” | „porzucenie” | „szybka”. */
export function dzwiek(rodzaj) {
  _graj(ZDARZENIA[rodzaj]);
}

/** Tekst nad żetonem (Sequencer; bez niego — nic). */
export function nadZetonem(actor, text, color = "#f4d03f") {
  try { seqScrollText(text, actor, { color, fontSize: 26, duration: 1800 }); } catch { /* opcjonalne */ }
}

export function registerOprawa() {
  game.settings.register(MODULE_ID, "produkcjaGlosnosc", {
    name: "Głośność produkcji",
    hint: "Dźwięki pracy nad Robotami, ukończenia i Szybkiej produkcji (0 — cisza).",
    scope: "client",
    config: true,
    type: Number,
    range: { min: 0, max: 1, step: 0.05 },
    default: 0.5
  });
}
