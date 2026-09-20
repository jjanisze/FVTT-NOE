/**
 * Neuroshima 5e — silnik układu szaf kalibracyjnych.
 *
 * Obie szafy (potwory z kompendium, postacie ze świata) mają identyczny układ:
 * pasma, w pasmie rzędy po rozmiarze, na początku każdego rzędu wzorzec dnd5e
 * tego rozmiaru, a po lewej kolumna podpisów. Różnią się **wyłącznie** tym, skąd
 * biorą listę i co robią z wynikiem — więc układanie mieszka tutaj, raz.
 *
 * Wydzielone przy dodawaniu Szafy z postaciami. Przed tym cała pętla siedziała
 * w `monster-closet.mjs`; przepisanie jej drugi raz znaczyłoby, że poprawka
 * odstępów albo zawijania rzędów trafia w jedną szafę, a w drugą nie.
 *
 * ## Umowa
 *
 * `layoutBands()` dostaje pasma z gotowymi pozycjami i oddaje kafle wzorców,
 * podpisy, wymiary kanwy oraz **`placements`** — gdzie (w polach siatki) ma
 * wylądować każda pozycja. Tworzenie samych żetonów zostaje po stronie szafy,
 * bo tylko ona wie, czy stawia kopię jednorazową, czy prawdziwego aktora.
 */

import { SIZES, SIZE_ORDER, knownSize, cellOf, pct } from "./token-sizes.mjs";

const MODULE_ID = "neuroshima-2026-overrides";

/* -------------------------------------------- */
/*  Parametry układu (w polach siatki)           */
/* -------------------------------------------- */

export const L = Object.freeze({
  gridSize: 100,
  background: "#22252a",
  margin: 1,
  labelCol: 4,      // kolumna podpisu rozmiaru po lewej
  maxContent: 30,   // twardy limit szerokości rzędu; dłuższe rzędy się zawijają
  // Dwa pola przerwy, nie jedno. Żetony mają tu włączone nazwy na stałe (bez
  // nich nie wiadomo, którą pozycję się właśnie poprawia), a przy podziałce
  // 100 px plakietki „KONWOJENT (STRAŻNIK)" i „GANGUS ŻOŁNIERZ" wchodzą jedna
  // na drugą i przestają być czytelne. Rzędy i tak nie wykorzystywały szerokości.
  gap: 2,           // między sąsiednimi komórkami w rzędzie
  refGap: 3,        // przerwa oddzielająca wzorzec od pozycji (większa niż `gap`)
  rowGap: 1,        // między rzędami jednego rozmiaru
  bandLabel: 2,     // pas na podpis pasma
  bandGap: 2,       // między pasmami
  // Legenda niesie skróty QuickScale'a i komendy konsoli — piętnaście wierszy
  // po 21 px. Foundry centruje tekst w prostokącie rysunku i nie przycina go,
  // więc za ciasny pas wychodziłby na pierwsze pasmo.
  header: 5         // legenda na górze sceny
});

/** Szerokość pełnego wiersza podpisu — od marginesu do końca obszaru treści. */
const fullWidth = L.labelCol + L.gap + L.maxContent;

/* -------------------------------------------- */
/*  Dokumenty pomocnicze                        */
/* -------------------------------------------- */

/** Tekstowy rysunek — Foundry łamie wiersze na `\n`, więc podpisy są wielowierszowe. */
export function label({ x, y, w, h, text, size = 28, color = "#ffffff", role }) {
  return {
    x: x * L.gridSize, y: y * L.gridSize,
    shape: { type: "r", width: w * L.gridSize, height: h * L.gridSize },
    strokeWidth: 0, strokeAlpha: 0, fillType: 0, fillAlpha: 0,
    text, fontSize: size, textColor: color, textAlpha: 1,
    // Podpisy to opis sceny, nie jej zawartość — nie mają brać udziału
    // w zaznaczaniu ani zasłaniać żetonu, którego dotyczą.
    locked: true, interface: true,
    flags: { [MODULE_ID]: { testScene: { role } } }
  };
}

/**
 * Kafel z grafiką, wpisany w komórkę siatki.
 *
 * **`x`/`y` kafla to jego środek**, nie lewy górny róg (`TileDocument` ma anchor
 * 0,5/0,5) — dlatego pozycja liczy się z komórki przez dodanie połowy rozmiaru
 * komórki, inaczej grafika ląduje pół kafla wyżej i lewiej. Żeton ma odwrotną
 * umowę (`x` to lewy górny róg), więc te dwie ścieżki nie mogą używać
 * wspólnej arytmetyki.
 *
 * Kafel, a nie żeton, wszędzie, gdzie grafika jest **odnośnikiem**: nie
 * potrzebuje aktora (zero śmieci w świecie na odtworzenie), a QuickScale rusza
 * wyłącznie żetony — więc wzorca nie da się przypadkiem przeskalować w połowie
 * godziny klikania. Render jest identyczny: `TileDocument` też ma `texture.fit`,
 * a `contain` robi to samo, co robi żeton.
 */
export function artTile({ src, sizePx, cell, cellX, cellY, role, meta = {}, scale = 1 }) {
  const px = Math.max(1, Math.round(sizePx * scale));
  return {
    texture: {
      src, fit: "contain", anchorX: 0.5, anchorY: 0.5,
      scaleX: 1, scaleY: 1, tint: "#ffffff", alphaThreshold: 0.75
    },
    width: px, height: px,
    x: Math.round((cellX + cell / 2) * L.gridSize),
    y: Math.round((cellY + cell / 2) * L.gridSize),
    elevation: 0, sort: 0, alpha: 1,
    locked: true,
    flags: { [MODULE_ID]: { testScene: { role, ...meta } } }
  };
}

/** Kafel wzorca dnd5e dla danego rozmiaru, przy skali 1,0. */
export function referenceTile(size, cellX, cellY) {
  const key = knownSize(size);
  return artTile({
    src: SIZES[key].ref.src,
    sizePx: SIZES[key].footprint * L.gridSize,
    cell: cellOf(key), cellX, cellY,
    role: "reference", meta: { size: key }
  });
}

/* -------------------------------------------- */
/*  Układanie                                    */
/* -------------------------------------------- */

/**
 * Ile pozycji danego rozmiaru wejdzie w jeden rząd obok wzorca:
 * n komórek i n−1 przerw, plus wzorzec i przerwa oddzielająca.
 */
const perRow = cell => Math.max(1, Math.floor((L.maxContent - cell - L.refGap + L.gap) / (cell + L.gap)));

/**
 * @typedef {object} ClosetBand
 * @property {string} title       podpis pasma (bez licznika — dokłada go ta warstwa)
 * @property {string} [color]
 * @property {object[]} items     pozycje; każda musi mieć `size`
 * @property {string} [note]      druga linia podpisu, np. „do wymiany"
 * @property {(item: object) => {src: string, scale?: number}|null} [tile]
 *   Gdy podane, pasmo jest rysowane **kaflami**, nie żetonami: pozycje nie trafiają
 *   do `placements`, tylko od razu do `tiles`. Tak wygląda pasmo odnośnikowe —
 *   grafika, na którą się patrzy, ale której się nie kalibruje. Kafel nie
 *   potrzebuje aktora i nie da się go ruszyć QuickScale'em, więc odnośnik
 *   zostaje odnośnikiem przez całą sesję klikania.
 */

/**
 * Układa pasma i zwraca wszystko, czego potrzebuje `regenerateTestScene`,
 * poza samymi żetonami.
 *
 * @param {object} spec
 * @param {string} spec.legend        tekst legendy na górze sceny
 * @param {ClosetBand[]} spec.bands   pasma w kolejności wyświetlania; puste są pomijane
 * @returns {{width: number, height: number, gridSize: number, backgroundColor: string,
 *            tiles: object[], drawings: object[],
 *            placements: {item: object, band: ClosetBand, cellX: number, cellY: number, cell: number}[]}}
 */
export function layoutBands({ legend, bands }) {
  const tiles = [];
  const drawings = [];
  const placements = [];

  const contentX = L.margin + L.labelCol + L.gap;
  let y = L.margin;
  // Kanwa dociągana do najdłuższego rzędu, jaki faktycznie powstał. Stała
  // szerokość zostawiała pół sceny pustej, bo tylko jeden rząd na kilka pasm
  // zbliża się do limitu.
  let maxX = contentX;

  drawings.push(label({
    x: L.margin, y, w: fullWidth, h: L.header, size: 21, role: "legend", text: legend
  }));
  y += L.header + L.bandGap;

  for (const band of bands) {
    if (!band.items?.length) continue;

    // Tytuł i dopisek osobnymi rysunkami, bo jeden `Drawing` ma jeden rozmiar
    // czcionki. Sklejone w jeden napis przy 52 px dopisek („odnośnik — aktualna
    // skala postaci graczy; kalibracja w Szafie z postaciami") wychodził poza
    // prawą krawędź kanwy — Foundry nie zawija tekstu rysunku.
    drawings.push(label({
      x: L.margin, y, w: fullWidth, h: band.note ? L.bandLabel - 0.6 : L.bandLabel,
      size: 40, color: band.color ?? "#ffffff", role: "band",
      text: `${band.title} (${band.items.length})`
    }));
    if (band.note) {
      drawings.push(label({
        x: L.margin, y: y + L.bandLabel - 0.7, w: fullWidth, h: 0.6,
        size: 20, color: band.color ?? "#ffffff", role: "band-note",
        text: band.note
      }));
    }
    y += L.bandLabel;

    for (const size of SIZE_ORDER) {
      const group = band.items.filter(i => knownSize(i.size) === size);
      if (!group.length) continue;

      const cell = cellOf(size);
      const { pl, footprint, target, ref } = SIZES[size];
      const step = perRow(cell);

      for (let i = 0; i < group.length; i += step) {
        const chunk = group.slice(i, i + step);

        drawings.push(label({
          x: L.margin, y, w: L.labelCol, h: cell, size: 22, role: "size",
          text: `${pl.toUpperCase()} (${size})\n`
            + `${footprint}×${footprint} pola · cel ${pct(target)}\n`
            + `wzorzec: ${ref.name} ${pct(ref.fill)}`
        }));

        tiles.push(referenceTile(size, contentX, y));

        let x = contentX + cell + L.refGap;
        for (const item of chunk) {
          const asTile = band.tile?.(item);
          if (asTile?.src) {
            tiles.push(artTile({
              src: asTile.src,
              sizePx: footprint * L.gridSize,
              scale: asTile.scale ?? 1,
              cell, cellX: x, cellY: y,
              role: "sample", meta: { band: band.id ?? null, name: asTile.name ?? null }
            }));
            // Kafel nie ma plakietki tak jak żeton, a bez nazwy pasmo
            // odnośnikowe to sześć anonimowych sylwetek. Podpis idzie
            // w przerwę między rzędami, więc nie zjada wysokości.
            if (asTile.name) {
              drawings.push(label({
                x, y: y + cell - 0.1, w: cell, h: L.rowGap, size: 20, role: "sample-name",
                text: asTile.scale && asTile.scale !== 1
                  ? `${asTile.name}  ×${asTile.scale}`
                  : asTile.name
              }));
            }
          } else if (!band.tile) {
            placements.push({ item, band, cellX: x, cellY: y, cell });
          }
          // `band.tile` zwracające null = pozycja bez grafiki; zostawiamy puste
          // miejsce zamiast kafla, żeby rząd nie zmieniał rytmu.
          x += cell + L.gap;
        }
        // Ostatnia komórka kończy się `gap` przed `x` — plakietka z nazwą
        // wychodzi jednak poza komórkę, więc zapas do marginesu się przydaje.
        maxX = Math.max(maxX, x);
        y += cell + L.rowGap;
      }
    }
    y += L.bandGap - L.rowGap;
  }

  return {
    width: (maxX + L.margin) * L.gridSize,
    height: (y + L.margin) * L.gridSize,
    gridSize: L.gridSize,
    backgroundColor: L.background,
    tiles, drawings, placements
  };
}

/**
 * Dane żetonu wyśrodkowanego w swojej komórce.
 *
 * `TokenDocument#x/y` to **lewy górny róg** (środek = `x + width/2`), czyli
 * odwrotna umowa niż w kaflu wyżej. Wyśrodkowanie w komórce to więc przesunięcie
 * o połowę różnicy footprintu i komórki — istotne tylko dla Malutkiego
 * (footprint 0,5 w komórce 1×1), ale liczone zawsze, żeby nie było wyjątku.
 */
export function cellPosition({ cellX, cellY, cell, footprint }) {
  const offset = (cell - footprint) / 2;
  return {
    x: Math.round((cellX + offset) * L.gridSize),
    y: Math.round((cellY + offset) * L.gridSize)
  };
}
