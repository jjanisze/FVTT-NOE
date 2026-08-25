/**
 * Neuroshima 5e — paleta stanów stopniowanych.
 *
 * Jeden kolor na stan, wspólny dla wszystkich powierzchni, na których ten stan się
 * pokazuje: pipek w panelu Stan i na karcie drużyny, cyfry rzymskiej na ikonie żetonu,
 * badge'a w Token HUD i akcentów ramek.
 *
 * ## Dlaczego tabela jest w JS, a nie w CSS
 *
 * Bo dwóch konsumentów CSS nie obsłuży. Ikona żetonu idzie do PIXI jako tekstura, więc
 * `var(--icon-fill)` w pliku SVG nigdy się nie rozwinie — kolor musi być **wpalony w plik**
 * przez `dev/icons/gen_status_numerals.mjs`, który importuje tę samą stałą w Node. Drugi
 * to `EXHAUSTION_SOURCES`, gdzie kolor jedzie inline stylem na pipkę. Gdyby prawda
 * siedziała w arkuszu, generator musiałby ją parsować, a build zależałby od CSS-u.
 *
 * Runtime publikuje tabelę jako zmienne `--neuro-color-<id>` na `:root`, więc arkusz
 * pozostaje jedynym miejscem, gdzie te kolory się *stosuje*, i nie powtarza żadnego hexa.
 */

/**
 * @type {Readonly<Record<string, string>>}
 */
export const STATE_COLORS = Object.freeze({
  zranienie:   "#c0392b",
  wyczerpanie: "#3498db",
  upojenie:    "#9b59b6",
  skazenie:    "#7fff3f"
});

/**
 * Publish the palette as CSS custom properties on the document root.
 *
 * Wołane z `init`, czyli zanim cokolwiek się wyrenderuje — arkusz może więc używać
 * `var(--neuro-color-zranienie)` bez wartości zapasowej i bez mignięcia.
 */
export function registerStateColors() {
  const root = document.documentElement;
  for (const [id, color] of Object.entries(STATE_COLORS)) root.style.setProperty(`--neuro-color-${id}`, color);
}
