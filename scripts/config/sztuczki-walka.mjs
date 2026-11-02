/**
 * Neuroshima 5e — dogrywka Sztuczek 8c (PLAN_beta §0, PLAN_m7 §8 „8c”, 2026-11-02): czyste zasady.
 *
 * | Sztuczka | s. | Co liczy moduł |
 * |---|---|---|
 * | Immunitet | 103 | nowa choroba z zarażenia (woda WKK) nie wchodzi — karta dla gracza; choroba popromienna i ręczne dodanie — ostrzeżenie |
 * | Szturmowiec | 107 | KS bez Utrudnienia tylko w normalnym zasięgu broni |
 * | Grenadier | 103 | zasięg rzutu granatem ×2 |
 * | Pewna ręka | 105 | Pewny strzał [B] — Szybkość 0 do początku tury, Ułatwienie w jednym ataku dystansowym (nie seria); Stabilizacja |
 * | Wrestler | 108 | Ułatwienie wobec istoty, którą trzymasz; Duszenie; Rzut na matę — RO z Utrudnieniem |
 * | Ławnik | 104 | przedmiot 10 kg+ — 3k4 obuch., Ułatwienie, naturalna 1 niszczy; Przygniecenie — RO SIŁ albo Powalenie |
 * | Rozróba | 107 | Młynek [B] — co najmniej 3 wrogów w 1,5 m: atak wręcz w każdego |
 * | Patriota | 105 | wybór tylko z listy zdolności własnego Pochodzenia |
 * | Mistrz broni białej | 104 | Fechmistrz — model broni białej wybrany przy wzięciu; +1 kość obrażeń; zmiana w Długim odpoczynku z treningiem |
 */

import { FECHMISTRZ_KOBALT_H } from "../wkk/config/fechmistrz-kobalt.mjs";

const _f = Object.freeze;

/** Kolejność rozmiarów dnd5e (od najmniejszego). */
const ROZMIARY = ["tiny", "sm", "med", "lg", "huge", "grg"];
const _rozmiar = r => {
  const i = ROZMIARY.indexOf(r ?? "med");
  return i < 0 ? 2 : i;
};

/** Ławnik, Przygniecenie i Wrestler, Rzut na matę: istota dużego rozmiaru albo mniejsza. */
export const najwyzejDuzy = rozmiar => _rozmiar(rozmiar) <= ROZMIARY.indexOf("lg");

/** ST z SIŁ atakującego (Przygniecenie, Rzut na matę): 8 + PB + mod. SIŁ. */
export const stZSily = ({ pb, sila }) => 8 + (Number(pb) || 0) + (Number(sila) || 0);

/* -------------------------------------------- */
/*  Immunitet                                    */
/* -------------------------------------------- */

/**
 * Skąd przychodzi nowa choroba i czy Immunitet („nigdy nie złapiesz nowej choroby”) ją zatrzymuje sam:
 *   - `zarazenie` — złapana z otoczenia (woda brudna, WKK) — jednoznacznie: nie wchodzi;
 *   - `skazenie` — choroba popromienna po trzecim oblanym RO (s. 258): to nie zarażenie — wchodzi, MG dostaje ostrzeżenie;
 *   - `reczne` — MG albo gracz dodaje ją na zakładce: ostrzeżenie, wolno mimo to (MG, 2026-11-02).
 */
export const IMMUNITET_BLOKUJE = _f({ zarazenie: true, skazenie: false, reczne: false });

/** Tekst dla gracza, gdy Immunitet zatrzymał chorobę (MG, 2026-11-02). */
export const IMMUNITET_TEKST = "Przez chwilę czujesz, jakby łapało cię jakieś choróbsko. Ale tylko przez chwilę.";

/* -------------------------------------------- */
/*  Szturmowiec, Grenadier                       */
/* -------------------------------------------- */

/**
 * Szturmowiec (s. 107): KS bez Utrudnienia „w normalnym zasięgu broni”. Nieznana odległość (brak celu, żetonu) —
 * Sztuczka działa (wątpliwość na korzyść gracza; daleki zasięg i tak daje swoje Utrudnienie w silniku okoliczności).
 */
export function szturmDziala({ odleglosc = null, normalny = null } = {}) {
  if (odleglosc === null || odleglosc === undefined || normalny === null || normalny === undefined) return true;
  return Number(odleglosc) <= Number(normalny);
}

/** Grenadier, Prawidłowy rzut (s. 103): zasięg rzutu granatem ×2. */
export const GRENADIER_MNOZNIK = 2;

/* -------------------------------------------- */
/*  Ławnik                                       */
/* -------------------------------------------- */

/** Ławnik (s. 104): „ciężkie (10 kg+) przedmioty”. */
export const LAWNIK_PROG_KG = 10;
export const LAWNIK_KOSC = _f({ number: 3, faces: 4 });
export const jestCiezki = kg => (Number(kg) || 0) >= LAWNIK_PROG_KG;

/* -------------------------------------------- */
/*  Rozróba                                      */
/* -------------------------------------------- */

/** Rozróba, Młynek (s. 107): „co najmniej trzech przeciwników” w zasięgu 1,5 m. */
export const MLYNEK_MIN = 3;

/* -------------------------------------------- */
/*  Mistrz broni białej — Fechmistrz             */
/* -------------------------------------------- */

/**
 * Zmiana broni Fechmistrza (s. 104): RAW — Długi odpoczynek, w czasie którego trenujesz z nową bronią. WKK — 30 h
 * treningu w godzinach pracy postoju (`wkk/config/fechmistrz-kobalt.mjs`, zasada 44 w `docs/Kobalt.md`).
 */
export const FECHMISTRZ_WKK_H = FECHMISTRZ_KOBALT_H;

const MODULE_ID = "neuroshima-2026-overrides";

/** Flaga na przedmiocie Sztuczki: `{model, nazwa}` — wybrany model broni białej; `trening: {model, nazwa, godziny}` (WKK). */
export const FLAGA_FECHMISTRZ = "fechmistrz";

/** Przedmiot Sztuczki Mistrz broni białej na postaci albo `null`. */
export const sztuczkaFechmistrza = actor =>
  actor?.items?.find?.(i => i.flags?.[MODULE_ID]?.sztuczka === "mistrzBroniBialej") ?? null;

/** Wybrany model broni Fechmistrza (`modelBroni`) albo `null`. */
export const fechmistrzModel = actor => sztuczkaFechmistrza(actor)?.flags?.[MODULE_ID]?.[FLAGA_FECHMISTRZ]?.model ?? null;

/** Ile godzin treningu brakuje do zmiany: RAW — zero (wystarczy ten odpoczynek), WKK — do 30 h razem. */
export function fechmistrzPostep({ dotychczas = 0, godziny = 0, kobalt = false } = {}) {
  if (!kobalt) return { gotowe: true, godziny: 0 };
  const razem = Math.max(0, Number(dotychczas) || 0) + Math.max(0, Number(godziny) || 0);
  return { gotowe: razem >= FECHMISTRZ_WKK_H, godziny: Math.min(razem, FECHMISTRZ_WKK_H) };
}

export const __testing = _f({ szturmDziala, najwyzejDuzy, stZSily, jestCiezki, fechmistrzPostep });
