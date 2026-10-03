/**
 * Neuroshima 5e — Lalka: punkty zaczepienia linii na manekinie (PLAN_paper_doll §7a).
 *
 * Współrzędne znormalizowane (0–1) w obrazie manekina: `x` od lewej, `y` od góry. Linia biegnie
 * od kafelka w bocznej kolumnie do tego punktu — obraz nie niesie żadnych linii ani napisów,
 * więc nowa grafika = przemierzyć te punkty, nic więcej.
 *
 * Widok od przodu (D32): prawa ręka postaci jest po lewej stronie patrzącego.
 *
 * Każda kolumna dostaje części ciała ze swojej połowy, w kolejności z góry na dół, a panel stawia
 * kafelek możliwie na wysokości punktu (`spreadCells`) — linie są wtedy prawie poziome i się nie
 * krzyżują. Punkty leżą na sylwetce (sprawdzone na masce, wiersz po wierszu).
 *
 * Wartości poniżej są zmierzone na grafice MG (`icons/doll/mannequin.webp`, źródło
 * `dev/icons/dolls/mannequin.fw.png`, 800×1600) z maski przezroczystości, nie na oko: czubek głowy
 * y≈46, barki y≈330, talia y≈565, rozwidlenie nóg y≈790, kolana y≈1030, dłonie y≈745, stopy y≈1530.
 * Zastępcza sylwetka (`mannequin-placeholder.svg`) zostaje w repo jako awaryjna. Nowa grafika =
 * przemierzyć te punkty, nic więcej.
 */

/** Plik maski manekina (kształt; kolor daje motyw karty). */
export const MANNEQUIN_SRC = "modules/neuroshima-2026-overrides/icons/doll/mannequin.webp";

/** Proporcje obrazu (szerokość / wysokość). */
export const MANNEQUIN_ASPECT = 0.5;

export const DOLL_ANCHORS = Object.freeze({
  // Lewa kolumna (prawa strona postaci), z góry na dół — patrz `LEFT` w `actors/doll-panel.mjs`.
  head: { x: 0.46, y: 0.04 },       // Hełm — czubek głowy
  faceGear: { x: 0.46, y: 0.105 },  // Twarz — usta
  arms: { x: 0.22, y: 0.33 },       // Ochraniacze rąk — przedramię (lewa strona obrazu)
  "hand.0": { x: 0.065, y: 0.49 },  // Prawa ręka — dłoń (lewa strona obrazu)
  outfit: { x: 0.39, y: 0.55 },     // Strój — biodro / udo
  // Prawa kolumna (lewa strona postaci) — `RIGHT`.
  headGear: { x: 0.56, y: 0.07 },   // Głowa — oczy (gogle, noktowizor)
  shoulder: { x: 0.68, y: 0.205 },  // Ramię — lewy bark postaci
  body: { x: 0.58, y: 0.27 },       // Pancerz — klatka piersiowa
  "hand.1": { x: 0.935, y: 0.49 },  // Lewa ręka — dłoń
  legs: { x: 0.62, y: 0.66 },       // Ochraniacze nóg — kolano
  // Rzędy pod figurą — bez linii (podpisane wprost).
  belt: { x: 0.5, y: 0.43 },        // Pas — talia
  melee: { x: 0.4, y: 0.475 },      // Pochwy — biodro
  ranged: { x: 0.6, y: 0.475 },     // Kabury — biodro
  feet: { x: 0.5, y: 0.955 }        // Stopy — zarezerwowane (D21), bez slotu
});
